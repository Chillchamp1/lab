"""Fahrplan wie gtfs_prep.py (VBB + gtfs.de fv_free + rv_free), dazu polnische (GTFS "polish_trains" von mkuran.pl,
Daten PKP PLK u. a.) und tschechische (CZPTT der Správa železnic, GTFS von Oběhy) Bahnfahrpläne.
Dienstag 10.11.2026, Zeitfenster 06:55-14:30 -> data/gtfs_prep_plcz.pkl (gleiche Struktur wie gtfs_prep.pkl).
Aufruf: python -I -u -W ignore gtfs_prep_plcz.py gtfs/vbb gtfs/fv gtfs/rv gtfs/pl gtfs/cz      (ca. 35 s)
peak_mb() im Log nutzt die Windows-API.

PL/CZ (siehe unten "PL/CZ"): DE-Verbindungen (VBB-Bahn, fv, rv), deren beide Enden polnische/tschechische Stationen der
neuen Feeds sind (<= 300 m), fallen weg (Grenzabschnitte bleiben). Danach werden PL- und CZ-Fahrten mit derselben
Halte-Ereignis-Regel wie rv (300 m, 60 s, >= 2 Treffer) gegen die verbliebenen Verbindungen dedupliziert (CZ zusätzlich
gegen PL); weiterführende Abschnitte bekommen die Fahrt-ID der Referenzfahrt (sitzen bleiben).

Doppelte Fahrten (rv-Fahrt, die es schon im VBB-Feed bzw. im Fernverkehrs-Feed gibt) werden über Halte-Ereignisse
erkannt: ein rv-Halt "passt" zu einem Referenz-Halt (VBB-Regio/S-Bahn oder Fernverkehr), wenn die Haltepunkte
<= 300 m auseinanderliegen und Abfahrt (bzw. Ankunft) um <= 60 s abweichen. Passen >= 2 Halte einer rv-Fahrt zu
derselben Referenzfahrt, ist der Abschnitt zwischen erstem und letztem passenden Halt doppelt und wird verworfen;
die übrigen rv-Abschnitte (z. B. Weiterfahrt über die VBB-Grenze hinaus) bleiben und bekommen die Fahrt-ID der
Referenzfahrt, damit man im Zug sitzen bleiben kann."""
import os, sys, pickle, math
import numpy as np, pandas as pd
from scipy.spatial import cKDTree
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import dijkstra
from pyproj import Transformer

H = os.path.dirname(os.path.abspath(__file__))
sys.stdout.reconfigure(encoding="utf-8")
G = sys.argv[1]                                   # Ordner mit den entpackten GTFS-Dateien
DATE, DOW = 20261110, "tuesday"
T0, T1 = 6 * 3600 + 55 * 60, 14 * 3600 + 30 * 60
fwd = Transformer.from_crs(4326, 25833, always_xy=True)
import time, ctypes, ctypes.wintypes as wt
_T0 = time.time()


def peak_mb():
    class PMC(ctypes.Structure):
        _fields_ = [("cb", wt.DWORD), ("PageFaultCount", wt.DWORD), ("PeakWorkingSetSize", ctypes.c_size_t),
                    ("WorkingSetSize", ctypes.c_size_t), ("QuotaPeakPagedPoolUsage", ctypes.c_size_t),
                    ("QuotaPagedPoolUsage", ctypes.c_size_t), ("QuotaPeakNonPagedPoolUsage", ctypes.c_size_t),
                    ("QuotaNonPagedPoolUsage", ctypes.c_size_t), ("PagefileUsage", ctypes.c_size_t),
                    ("PeakPagefileUsage", ctypes.c_size_t)]
    c = PMC(); c.cb = ctypes.sizeof(PMC)
    k = ctypes.windll.kernel32; k.GetCurrentProcess.restype = wt.HANDLE
    ps = ctypes.windll.psapi; ps.GetProcessMemoryInfo.argtypes = [wt.HANDLE, ctypes.c_void_p, wt.DWORD]
    ps.GetProcessMemoryInfo(k.GetCurrentProcess(), ctypes.byref(c), c.cb)
    return c.PeakWorkingSetSize / 2**20


def log(*a):
    print(f"[{time.time() - _T0:5.0f}s {peak_mb():5.0f}MB]", *a, flush=True)

# ---- aktive Fahrten ----
cal = pd.read_csv(G + "/calendar.txt")
act = set(cal[(cal[DOW] == 1) & (cal.start_date <= DATE) & (cal.end_date >= DATE)].service_id)
cd = pd.read_csv(G + "/calendar_dates.txt")
cd = cd[cd.date == DATE]
act |= set(cd[cd.exception_type == 1].service_id); act -= set(cd[cd.exception_type == 2].service_id)
routes = pd.read_csv(G + "/routes.txt", dtype={"route_short_name": str})
trips = pd.read_csv(G + "/trips.txt", usecols=["route_id", "service_id", "trip_id", "shape_id", "bikes_allowed"])
trips = trips[trips.service_id.isin(act)].merge(routes[["route_id", "route_type", "route_short_name"]], on="route_id")


def mode_of(rt, name):
    name = str(name or "")
    if rt in (400,): return "U"
    if rt in (900,): return "T"
    if rt in (700, 3): return "B"
    if rt in (1000,): return "F"
    if rt == 109 and name.startswith("S"): return "S"
    return "R"                                        # RE/RB/sonstige Eisenbahn


trips["mode"] = [mode_of(rt, n) for rt, n in zip(trips.route_type, trips.route_short_name)]
ba = trips.bikes_allowed.fillna(0).astype(int)
trips["bike"] = (ba == 1) | ((ba != 2) & trips["mode"].isin(["U", "S", "R", "T", "F"]))   # GTFS-Angabe, sonst Bahn/Tram/Fähre ja, Bus nein
log("aktive Fahrten", len(trips), trips["mode"].value_counts().to_dict(), "mit Rad", int(trips.bike.sum()))

# ---- Halte im Zeitfenster ----
def secs(s):
    h, m, x = s.str.split(":", expand=True).astype(int).T.values
    return h * 3600 + m * 60 + x

parts = []
tid = set(trips.trip_id)
for ch in pd.read_csv(G + "/stop_times.txt", chunksize=2_000_000,
                      usecols=["trip_id", "stop_id", "stop_sequence", "arrival_time", "departure_time", "pickup_type", "drop_off_type"],
                      dtype={"stop_id": str, "arrival_time": str, "departure_time": str}):
    ch = ch[ch.trip_id.isin(tid)]
    ch = ch.assign(arr=secs(ch.arrival_time), dep=secs(ch.departure_time))
    parts.append(ch[(ch.dep >= T0 - 3600) & (ch.arr <= T1)][["trip_id", "stop_id", "stop_sequence", "arr", "dep", "pickup_type", "drop_off_type"]])
stt = pd.concat(parts).sort_values(["trip_id", "stop_sequence"])
log("Halte im Fenster", len(stt))

# ---- Verbindungen ----
nxt = stt.groupby("trip_id").shift(-1)
ok = nxt.stop_id.notna()
con = pd.DataFrame({"trip": stt.trip_id[ok].values, "a": stt.stop_id[ok].values, "b": nxt.stop_id[ok].values,
                    "td": stt.dep[ok].values, "ta": nxt.arr[ok].astype(int).values,
                    "pick": stt.pickup_type[ok].fillna(0).values, "drop": nxt.drop_off_type[ok].fillna(0).values})
con = con.merge(trips[["trip_id", "mode", "route_short_name", "shape_id", "bike"]], left_on="trip", right_on="trip_id")
con["trip"] = con.trip.astype(str)

# ---- Fernverkehr (gtfs.de / DELFI): ICE, IC, EC ... ----
FV = sys.argv[2] if len(sys.argv) > 2 else None
fstops = None
if FV:
    fcal = pd.read_csv(FV + "/calendar.txt")
    fact = set(fcal[(fcal[DOW] == 1) & (fcal.start_date <= DATE) & (fcal.end_date >= DATE)].service_id)
    fcd = pd.read_csv(FV + "/calendar_dates.txt"); fcd = fcd[fcd.date == DATE]
    fact |= set(fcd[fcd.exception_type == 1].service_id); fact -= set(fcd[fcd.exception_type == 2].service_id)
    ftr = pd.read_csv(FV + "/trips.txt")
    ftr = ftr[ftr.service_id.isin(fact)].merge(pd.read_csv(FV + "/routes.txt", dtype={"route_short_name": str})[["route_id", "route_short_name"]], on="route_id")
    fst = pd.read_csv(FV + "/stop_times.txt", dtype={"stop_id": str, "arrival_time": str, "departure_time": str})
    fst = fst[fst.trip_id.isin(set(ftr.trip_id))]
    fst = fst.assign(arr=secs(fst.arrival_time), dep=secs(fst.departure_time)).sort_values(["trip_id", "stop_sequence"])
    n2 = fst.groupby("trip_id").shift(-1); ok2 = n2.stop_id.notna()
    cf = pd.DataFrame({"trip": "fv:" + fst.trip_id[ok2].astype(str).values, "a": "fv:" + fst.stop_id[ok2].values,
                       "b": "fv:" + n2.stop_id[ok2].values, "td": fst.dep[ok2].values, "ta": n2.arr[ok2].astype(int).values,
                       "pick": fst.pickup_type[ok2].fillna(0).values, "drop": n2.drop_off_type[ok2].fillna(0).values})
    cf = cf[(cf.td >= T0 - 3600) & (cf.td <= T1)].copy()
    names = dict(zip("fv:" + ftr.trip_id.astype(str), ftr.route_short_name))
    cf["mode"] = "L"; cf["route_short_name"] = cf.trip.map(names); cf["shape_id"] = np.nan; cf["bike"] = True; cf["trip_id"] = cf.trip
    log("Fernverkehr-Verbindungen", len(cf), cf.route_short_name.value_counts().head(6).to_dict())
    con = pd.concat([con, cf], ignore_index=True)
    fstops = pd.read_csv(FV + "/stops.txt", dtype={"stop_id": str, "parent_station": str})
    fstops["stop_id"] = "fv:" + fstops.stop_id
    fstops["parent_station"] = ("fv:" + fstops.parent_station).where(fstops.parent_station.notna())
    fstops["level_id"] = np.nan

# ---- Regionalverkehr Deutschland (gtfs.de rv_free): RE/RB/S-Bahn außerhalb des VBB ----
RV = sys.argv[3] if len(sys.argv) > 3 else None
rstops = None
if RV:
    import re
    rcal = pd.read_csv(RV + "/calendar.txt")
    ract = set(rcal[(rcal[DOW] == 1) & (rcal.start_date <= DATE) & (rcal.end_date >= DATE)].service_id)
    rcd = pd.read_csv(RV + "/calendar_dates.txt"); rcd = rcd[rcd.date == DATE]
    ract |= set(rcd[rcd.exception_type == 1].service_id); ract -= set(rcd[rcd.exception_type == 2].service_id)
    rro = pd.read_csv(RV + "/routes.txt", dtype={"route_short_name": str, "route_id": str})
    rtr = pd.read_csv(RV + "/trips.txt", dtype={"trip_id": str, "route_id": str})
    rtr = rtr[rtr.service_id.isin(ract)].merge(rro[["route_id", "route_short_name"]], on="route_id")
    rtr["route_short_name"] = rtr.route_short_name.fillna("")
    rtr["mode"] = ["S" if re.match(r"^(S\d|S$|RS\d)", n) else "R" for n in rtr.route_short_name]
    rtr["bike"] = ~rtr.route_short_name.str.startswith("SEV")          # Feed ohne bikes_allowed: Bahn ja, Ersatzverkehr nein
    if "bikes_allowed" in rtr:
        rtr["bike"] &= rtr.bikes_allowed.fillna(0).astype(int) != 2
    log("rv: aktive Fahrten", len(rtr), rtr["mode"].value_counts().to_dict())
    rst = pd.read_csv(RV + "/stop_times.txt", dtype={"trip_id": str, "stop_id": str, "arrival_time": str, "departure_time": str},
                      usecols=["trip_id", "stop_id", "stop_sequence", "arrival_time", "departure_time", "pickup_type", "drop_off_type"])
    rst = rst[rst.trip_id.isin(set(rtr.trip_id))]
    rst = rst.assign(arr=secs(rst.arrival_time), dep=secs(rst.departure_time))
    rst = rst[(rst.dep >= T0 - 3600) & (rst.arr <= T1)].sort_values(["trip_id", "stop_sequence"]).reset_index(drop=True)
    rst["trip"] = "rv:" + rst.trip_id; rst["stop"] = "rv:" + rst.stop_id
    rst["pos"] = rst.groupby("trip").cumcount()
    rstops = pd.read_csv(RV + "/stops.txt", dtype={"stop_id": str, "parent_station": str})
    rstops["stop_id"] = "rv:" + rstops.stop_id
    rstops["parent_station"] = ("rv:" + rstops.parent_station).where(rstops.parent_station.notna())
    rstops["level_id"] = np.nan

    # Referenz-Halte: VBB-Regio/S-Bahn und Fernverkehr
    stv = pd.read_csv(G + "/stops.txt", dtype={"stop_id": str})
    xy = {}
    for t in [stv] + ([fstops] if fstops is not None else []) + [rstops]:
        ax, ay = fwd.transform(t.stop_lon.values, t.stop_lat.values)
        xy.update(zip(t.stop_id, zip(ax, ay)))
    rail_trips = set(trips.trip_id[trips["mode"].isin(["R", "S"])])
    ref = [pd.DataFrame({"rtrip": stt.trip_id[stt.trip_id.isin(rail_trips)].astype(str).values,
                         "rstop": stt.stop_id[stt.trip_id.isin(rail_trips)].values,
                         "rdep": stt.dep[stt.trip_id.isin(rail_trips)].values})]
    if FV:
        ref.append(pd.DataFrame({"rtrip": "fv:" + fst.trip_id.astype(str).values, "rstop": "fv:" + fst.stop_id.values, "rdep": fst.dep.values}))
    ref = pd.concat(ref, ignore_index=True)
    ref["rdep"] = ref.rdep.astype("int64")
    ref_st = pd.unique(ref.rstop)
    rtree_ = cKDTree(np.array([xy[s] for s in ref_st]))
    rv_st = pd.unique(rst.stop)
    nb = rtree_.query_ball_point(np.array([xy[s] for s in rv_st]), 300)
    near = pd.DataFrame([(a, ref_st[j]) for a, js in zip(rv_st, nb) for j in js], columns=["stop", "rstop"])
    cand = rst[["trip", "pos", "stop", "dep", "arr"]].merge(near, on="stop")
    cand["dep"] = cand.dep.astype("int64"); cand["arr"] = cand.arr.astype("int64")
    m = []
    for col in ("dep", "arr"):                                   # Abfahrt oder Ankunft (Endhalt) innerhalb 60 s
        c = pd.merge_asof(cand.sort_values(col), ref.sort_values("rdep"), left_on=col, right_on="rdep",
                          by="rstop", tolerance=60, direction="nearest")
        m.append(c[c.rtrip.notna()][["trip", "pos", "rtrip"]])
    m = pd.concat(m).drop_duplicates()
    g = m.groupby(["trip", "rtrip"]).pos.agg(["min", "max", "count"]).reset_index()
    g = g[g["count"] >= 2]
    iv = {}
    for t, rt, lo, hi in zip(g.trip, g.rtrip, g["min"], g["max"]):
        iv.setdefault(t, []).append((lo, hi, rt))
    # rv-Verbindungen
    n2 = rst.groupby("trip").shift(-1); ok2 = n2.stop.notna()
    cr = pd.DataFrame({"trip": rst.trip[ok2].values, "a": rst.stop[ok2].values, "b": n2.stop[ok2].values,
                       "td": rst.dep[ok2].values, "ta": n2.arr[ok2].astype(int).values, "p": rst.pos[ok2].values,
                       "pick": rst.pickup_type[ok2].fillna(0).values, "drop": n2.drop_off_type[ok2].fillna(0).values})
    keep = np.ones(len(cr), bool); lab = cr.trip.values.copy()
    for k, (t, p) in enumerate(zip(cr.trip.values, cr.p.values)):
        L = iv.get(t)
        if not L: continue
        if any(lo <= p and p + 1 <= hi for lo, hi, _ in L):
            keep[k] = False; continue
        before = [(hi, rt) for lo, hi, rt in L if hi <= p]
        after = [(lo, rt) for lo, hi, rt in L if lo >= p + 1]
        lab[k] = max(before)[1] if before else min(after)[1]
    cr["trip"] = lab
    ntr = rst.trip.nunique(); dup_tr = len(iv)
    cr0 = len(cr); cr = cr[keep].copy()
    tinfo = rtr.assign(trip="rv:" + rtr.trip_id).set_index("trip")
    own = rst.trip[ok2].values[keep]
    cr["mode"] = tinfo["mode"].reindex(own).values
    cr["route_short_name"] = tinfo["route_short_name"].reindex(own).values
    cr["bike"] = tinfo["bike"].reindex(own).values.astype(bool)
    cr["shape_id"] = np.nan; cr["trip_id"] = cr.trip
    relab = int((cr.trip.values != own).sum())
    log("rv: Fahrten im Fenster", ntr, "davon mit VBB/FV-Doppel", dup_tr, "| Verbindungen", cr0, "-> behalten", len(cr), "(vor Zeitfilter)",
        "davon an Referenzfahrt angehängt", relab, "| Referenzfahrten", g.rtrip.str.startswith("fv:").value_counts().to_dict())
    log("rv-Verbindungen", len(cr), cr["mode"].value_counts().to_dict(), cr.route_short_name.value_counts().head(8).to_dict())
    con = pd.concat([con, cr.drop(columns="p")], ignore_index=True)

# ---- an Grenzpunkten "(Gr)" geteilte DE-Fahrten (v. a. rv: Fahrt A endet mit drop=1, Fahrt B beginnt mit pick=1 am
#      selben Punkt, 0..10 min später) wieder zu einer Fahrt verbinden, damit man über die Grenze sitzen bleiben kann ----
if rstops is not None or fstops is not None:
    gst = pd.concat([t for t in (rstops, fstops) if t is not None])
    gr = set(gst.stop_id[gst.stop_name.str.contains("(Gr)", regex=False)])
    railc = con[con["mode"].isin(["R", "S", "L"])]
    lastc = railc.loc[railc.groupby("trip").td.idxmax()]; firstc = railc.loc[railc.groupby("trip").td.idxmin()]
    A = lastc[lastc.b.isin(gr) & (lastc["drop"] == 1)][["trip", "b", "ta"]]
    B = firstc[firstc.a.isin(gr) & (firstc.pick == 1)][["trip", "a", "td"]]
    j = A.merge(B, left_on="b", right_on="a", suffixes=("_a", "_b"))
    j = j[(j.td >= j.ta) & (j.td - j.ta <= 600) & (j.trip_a != j.trip_b)]
    j = j.assign(w=j.td - j.ta).sort_values("w").drop_duplicates("trip_b").drop_duplicates("trip_a")
    nxt_ = dict(zip(j.trip_b, j.trip_a))

    def root(t):
        seen = set()
        while t in nxt_ and t not in seen: seen.add(t); t = nxt_[t]
        return t
    mp = {t: root(t) for t in nxt_}
    con["trip"] = con.trip.map(lambda t: mp.get(t, t)); con["trip_id"] = con.trip
    log("an (Gr)-Punkten verbundene DE-Fahrten:", len(mp), "| Punkte:", pd.Series(j.b.map(dict(zip(gst.stop_id, gst.stop_name)))).value_counts().head(20).to_dict())

# ================= PL/CZ: polnische (mkuran.pl / PLK) und tschechische (CZPTT / Oběhy) Bahn =================
PLD = sys.argv[4] if len(sys.argv) > 4 else None
CZD = sys.argv[5] if len(sys.argv) > 5 else None
COLS = ["stop_id", "stop_name", "stop_lat", "stop_lon", "location_type", "parent_station", "level_id"]
LAT0, LAT1, LON1 = 49.0, 54.9, 19.5                 # Ausschnitt für PL/CZ-Verbindungen (beide Enden)
FOREIGN = {"PL", "CZ"}
new_stops = []
UNITE = []


def active_services(D):
    act = set()
    if os.path.exists(D + "/calendar.txt"):
        cal = pd.read_csv(D + "/calendar.txt", dtype={"service_id": str})
        act = set(cal[(cal[DOW] == 1) & (cal.start_date <= DATE) & (cal.end_date >= DATE)].service_id)
    cd = pd.read_csv(D + "/calendar_dates.txt", dtype={"service_id": str})
    cd = cd[cd.date == DATE]
    act |= set(cd[cd.exception_type == 1].service_id); act -= set(cd[cd.exception_type == 2].service_id)
    return act


def load_feed(D, pre):
    """-> Halte-Ereignisse (zusammengehörige Teilfahrten verbunden), Fahrtinfos je Teilfahrt, Haltepunkte"""
    act = active_services(D)
    ro = pd.read_csv(D + "/routes.txt", dtype=str)
    tr = pd.read_csv(D + "/trips.txt", dtype=str)
    tr = tr[tr.service_id.isin(act)].merge(ro[["route_id", "route_type", "route_short_name"]], on="route_id")
    tr["route_type"] = tr.route_type.astype(int)
    if pre == "pl":
        rs = tr.route_short_name.fillna("")
        LCAT = {"EC", "EIC", "EIP", "IC", "TLK", "ICN", "MP", "RJ", "LEO"}
        tr["mode"] = np.where(tr.route_type == 3, "B", np.where(rs.isin(LCAT), "L", "R"))     # 3 = ZKA (Ersatzbus)
        tr["bike"] = (tr["mode"] != "B") & (rs != "EIP")
        num = tr.plk_train_number.fillna(tr.trip_short_name).fillna("")
        tr["name"] = np.where(tr["mode"] == "L", (rs + " " + num).str.strip(), rs)
    else:
        tr["mode"] = np.where(tr.route_type == 714, "B",                                      # 714 = NAD (Ersatzbus)
                              np.where(tr.route_type.isin([100, 101, 102, 105]), "L", "R"))   # EC/IC/rj/RJ/SC/Ex/LE/EN/NJ
        tr["bike"] = (tr["mode"] != "B") & (tr.bikes_allowed.fillna("") != "2")
        tr["name"] = np.where(tr["mode"] == "L", tr.trip_short_name.fillna(tr.route_short_name),
                              tr.route_short_name.fillna(tr.trip_short_name))
    log(f"{pre}: aktive Fahrten", len(tr), tr["mode"].value_counts().to_dict(), "mit Rad", int(tr.bike.sum()),
        "| L:", tr[tr["mode"] == "L"].name.str.split(" ").str[0].value_counts().to_dict())
    sto = pd.read_csv(D + "/stops.txt", dtype=str)
    sto["stop_lat"] = sto.stop_lat.astype(float); sto["stop_lon"] = sto.stop_lon.astype(float)
    sto["country"] = sto["country"] if pre == "pl" else sto.stop_id.str.split(":").str[2]
    sto["location_type"] = sto.location_type.fillna("0").astype(int)
    sto["station"] = pre + ":" + sto.parent_station.fillna(sto.stop_id)
    sto["parent_station"] = (pre + ":" + sto.parent_station).where(sto.parent_station.notna())
    sto["stop_id"] = pre + ":" + sto.stop_id
    sto["level_id"] = np.nan
    ev = pd.read_csv(D + "/stop_times.txt", dtype=str,
                     usecols=["trip_id", "stop_id", "stop_sequence", "arrival_time", "departure_time", "pickup_type", "drop_off_type"])
    ev = ev[ev.trip_id.isin(set(tr.trip_id))]
    ev = ev.assign(arr=secs(ev.arrival_time), dep=secs(ev.departure_time), seq=ev.stop_sequence.astype(int),
                   pick=ev.pickup_type.fillna("0").astype(int).replace({2: 0, 3: 0}),     # 2/3 = Bedarfshalt: zählt als Halt
                   drop=ev.drop_off_type.fillna("0").astype(int).replace({2: 0, 3: 0}))
    ev = ev[(ev.dep >= T0 - 3600) & (ev.arr <= T1)][["trip_id", "stop_id", "seq", "arr", "dep", "pick", "drop"]]
    ev["stop_id"] = pre + ":" + ev.stop_id
    # zusammengehörige Teilfahrten (PL: _LEG0/_LEG1 mit transfers type 1, CZ: transfers type 4) = sitzen bleiben
    tf = pd.read_csv(D + "/transfers.txt", dtype=str)
    tf = tf[tf.transfer_type.isin(["1", "4"]) & tf.from_trip_id.notna() & tf.to_trip_id.notna()]
    mo = dict(zip(tr.trip_id, tr["mode"]))
    par = {}

    def find(a):
        r = a
        while par.get(r, r) != r: r = par[r]
        while par.get(a, a) != r: par[a], a = r, par[a]
        return r
    nl = nb = 0
    for a, b in zip(tf.from_trip_id, tf.to_trip_id):
        if a in mo and b in mo:
            if mo[a] == "B" or mo[b] == "B": nb += 1; continue
            ra, rb = find(a), find(b)
            if ra != rb: par[rb] = ra; nl += 1
    ev["grp"] = [find(t) for t in ev.trip_id]
    first = ev.groupby("trip_id").dep.min()
    ev["fd"] = ev.trip_id.map(first)
    ev = ev.sort_values(["grp", "fd", "trip_id", "seq"]).reset_index(drop=True)
    stn = dict(zip(sto.stop_id, sto.station))
    s_ = ev.stop_id.map(stn).values; g_ = ev.grp.values; t_ = ev.trip_id.values
    bnd = np.r_[(g_[1:] == g_[:-1]) & (t_[1:] != t_[:-1]), False]                 # letzte Zeile einer Teilfahrt
    mrg = bnd & np.r_[s_[1:] == s_[:-1], False]                                   # ... an derselben Station wie der Anschluss
    k = np.where(mrg)[0]
    ev.loc[k + 1, "arr"] = ev.arr.values[k]; ev.loc[k + 1, "drop"] = ev["drop"].values[k]
    ev = ev.drop(index=k).reset_index(drop=True)
    log(f"{pre}: Teilfahrten verbunden", nl, "(Bus-Verknüpfungen ignoriert", nb, ") | Übergänge an gleicher Station", len(k),
        "| an anderer Station", int(bnd.sum() - len(k)), "| Halte im Fenster", len(ev))
    ev["trip"] = pre + ":" + ev.grp
    ev["pos"] = ev.groupby("trip").cumcount()
    return ev, tr.set_index("trip_id"), sto


def ref_events(c):
    c = c[c["mode"].isin(["R", "S", "L"])]
    r = pd.concat([pd.DataFrame({"rtrip": c.trip.values, "rstop": c.a.values, "rdep": c.td.values}),
                   pd.DataFrame({"rtrip": c.trip.values, "rstop": c.b.values, "rdep": c.ta.values})], ignore_index=True)
    r["rdep"] = r.rdep.astype("int64")
    return r.drop_duplicates()


def cut_points(c, dropped, kept):
    """Schnittstellen von Fahrten, deren Auslandsabschnitt entfernt wurde: 'out' = Fahrt endet jetzt an Halt X
    (Ankunft ta), 'in' = Fahrt beginnt jetzt an Halt X (Abfahrt td). Nur Bahn."""
    d = c[dropped]; k = c[kept & c["mode"].isin(["R", "S", "L"]).values]
    da = set(zip(d.trip, d.a)); db = set(zip(d.trip, d.b))
    o = k[[(t, b) in da for t, b in zip(k.trip, k.b)]]
    i = k[[(t, a) in db for t, a in zip(k.trip, k.a)]]
    return pd.concat([pd.DataFrame({"rtrip": o.trip.values, "rstop": o.b.values, "t": o.ta.values, "kind": "out"}),
                      pd.DataFrame({"rtrip": i.trip.values, "rstop": i.a.values, "t": i.td.values, "kind": "in"})],
                     ignore_index=True).drop_duplicates()


def chain_trips(rail, cuts, skip, maxwait=900):
    """Fahrten des neuen Feeds ohne Doppel-Abschnitt, die an einer Schnittstelle (<= 300 m) direkt anschließen
    (Abfahrt 0..15 min nach Ankunft der Referenzfahrt bzw. umgekehrt) -> Fahrt-ID der Referenzfahrt (sitzen bleiben)."""
    if not len(cuts): return {}
    ctree = cKDTree(np.array([xy[s] for s in cuts.rstop]))
    ck, ct, cr_ = cuts.kind.values, cuts.t.values.astype(np.int64), cuts.rtrip.values
    out = {}
    g = rail.groupby("trip").pos
    for kind, rows in (("out", rail.loc[g.idxmin()]), ("in", rail.loc[g.idxmax()])):
        for t, s, dep, arr in zip(rows.trip, rows.stop_id, rows.dep, rows.arr):
            if t in skip or t in out: continue
            cand = []
            for j in ctree.query_ball_point(xy[s], 300):
                if ck[j] != kind: continue
                w = (dep - ct[j]) if kind == "out" else (ct[j] - arr)
                if 0 <= w <= maxwait: cand.append((w, cr_[j]))
            if cand:
                cand.sort(); out[t] = cand[0][1]
                for w, r in cand[1:]:                  # gleichzeitig an derselben Stelle endende Fahrten = Doppel im DE-Feed
                    if w <= cand[0][0] + 60 and r != cand[0][1]: UNITE.append((cand[0][1], r))
    return out


def dedupe_feed(ev, tinfo, ref, pre, drop_ctry, cuts):
    """Halte-Ereignis-Regel wie bei rv: <= 300 m, <= 60 s, >= 2 Treffer je Referenzfahrt -> Abschnitt doppelt.
    Zusätzlich: Fahrten, die an einer Schnittstelle (siehe cut_points) direkt weiterfahren, bekommen die Referenz-ID."""
    rail = ev[ev.trip_id.map(tinfo["mode"]).values != "B"]
    ref_st = pd.unique(ref.rstop)
    tree = cKDTree(np.array([xy[s] for s in ref_st]))
    ev_st = pd.unique(rail.stop_id)
    nbs = tree.query_ball_point(np.array([xy[s] for s in ev_st]), 300)
    near = pd.DataFrame([(a, ref_st[j]) for a, js in zip(ev_st, nbs) for j in js], columns=["stop_id", "rstop"])
    cand = rail[["trip", "pos", "stop_id", "dep", "arr"]].merge(near, on="stop_id")
    cand["dep"] = cand.dep.astype("int64"); cand["arr"] = cand.arr.astype("int64")
    m = []
    for col in ("dep", "arr"):
        c = pd.merge_asof(cand.sort_values(col), ref.sort_values("rdep"), left_on=col, right_on="rdep",
                          by="rstop", tolerance=60, direction="nearest")
        m.append(c[c.rtrip.notna()][["trip", "pos", "rtrip"]])
    m = pd.concat(m).drop_duplicates()
    g = m.groupby(["trip", "rtrip"]).pos.agg(["min", "max", "count"]).reset_index()
    g = g[g["count"] >= 2]
    iv = {}
    for t, rt, lo, hi in zip(g.trip, g.rtrip, g["min"], g["max"]):
        iv.setdefault(t, []).append((lo, hi, rt))
    chn = chain_trips(rail, cuts, set(iv))
    # mehrere Referenzfahrten mit >= 2 Treffern bei derselben neuen Fahrt = derselbe Zug doppelt im DE-Feed
    # (z. B. rv "CD 083" und "U28" Bad Schandau-Děčín) -> später zu einer Fahrt-ID vereinigen
    for t, rts in g.groupby("trip").rtrip:
        rts = list(rts)
        for r2 in rts[1:]: UNITE.append((rts[0], r2))
    n2 = ev.groupby("trip").shift(-1); ok2 = n2.stop_id.notna().values
    E = ev[ok2]
    cr = pd.DataFrame({"trip": E.trip.values, "a": E.stop_id.values, "b": n2.stop_id[ok2].values,
                       "td": E.dep.values.astype(np.int64), "ta": n2.arr[ok2].astype(np.int64).values, "p": E.pos.values,
                       "pick": E.pick.values.astype(float), "drop": n2["drop"][ok2].values.astype(float)})
    own = E.trip_id.values
    keep = np.ones(len(cr), bool); lab = cr.trip.values.copy()
    for k, (t, p) in enumerate(zip(cr.trip.values, cr.p.values)):
        L = iv.get(t)
        if not L:
            if t in chn: lab[k] = chn[t]
            continue
        if any(lo <= p and p + 1 <= hi for lo, hi, _ in L):
            keep[k] = False; continue
        before = [(hi, rt) for lo, hi, rt in L if hi <= p]
        after = [(lo, rt) for lo, hi, rt in L if lo >= p + 1]
        lab[k] = max(before)[1] if before else min(after)[1]
    attached = lab != cr.trip.values
    ca = cr.a.map(ctry).values; cb = cr.b.map(ctry).values
    other = (ca == drop_ctry) & (cb == drop_ctry)                    # beide Enden im Nachbarland mit eigenem Feed
    la_, lo_ = cr.a.map(LAT).values, cr.a.map(LON).values; lb_, lob = cr.b.map(LAT).values, cr.b.map(LON).values
    inbox = (la_ >= LAT0) & (la_ <= LAT1) & (lo_ < LON1) & (lb_ >= LAT0) & (lb_ <= LAT1) & (lob < LON1)
    cr["trip"] = lab
    cr["mode"] = tinfo["mode"].reindex(own).values
    cr["route_short_name"] = tinfo["name"].reindex(own).values
    cr["bike"] = tinfo["bike"].reindex(own).values.astype(bool)
    cr["shape_id"] = np.nan
    sel = keep & ~other & inbox
    cin = (cr.td.values >= T0) & (cr.td.values <= T1)
    src_ = pd.Series([r.split(":")[0] if r.split(":")[0] in ("fv", "rv", "pl") else "vbb" for r in g.rtrip])
    log(f"{pre}: Verbindungen (Fenster -1 h)", len(cr), "| doppelt", int((~keep).sum()),
        f"| beide Enden {drop_ctry}", int((keep & other).sum()), "| außerhalb Ausschnitt", int((keep & ~other & ~inbox).sum()),
        "| behalten", int(sel.sum()), "davon an Referenzfahrt angehängt", int((sel & attached).sum()),
        "|| im Fenster: behalten", int((sel & cin).sum()), "doppelt", int((~keep & cin).sum()),
        "| Fahrten mit Doppel", len(iv), "| Referenzfahrten nach Quelle", src_.value_counts().to_dict(),
        "| an Schnittstelle angeschlossene Fahrten", len(chn), "von", len(cuts), "Schnittstellen")
    att = cr[sel & attached & cin]
    if len(att):
        ex = att.groupby("trip").agg(n=("a", "size"), name=("route_short_name", "first"), first=("a", "first"),
                                     last=("b", "last"), t=("td", "min"))
        ex["first"] = ex["first"].map(NAME); ex["last"] = ex["last"].map(NAME)
        ex["t"] = ["%02d:%02d" % divmod(int(v) // 60, 60) for v in ex.t]
        log(f"{pre}: angehängte Abschnitte (an DE{'/PL' if pre == 'cz' else ''}-Fahrt), {len(ex)} Fahrten, z. B.:\n" +
            ex.sort_values("t").head(40).to_string())
    newcuts = cut_points(cr, keep & other, sel)
    return cr[sel].drop(columns="p").assign(trip_id=lambda d: d.trip), newcuts


if PLD or CZD:
    stv_ = pd.read_csv(G + "/stops.txt", dtype={"stop_id": str})
    feeds = {}
    for D, pre in ((PLD, "pl"), (CZD, "cz")):
        if D: feeds[pre] = load_feed(D, pre)
    allst_ = pd.concat([stv_[["stop_id", "stop_name", "stop_lat", "stop_lon"]]] +
                       [t[["stop_id", "stop_name", "stop_lat", "stop_lon"]] for t in (fstops, rstops) if t is not None] +
                       [f[2][["stop_id", "stop_name", "stop_lat", "stop_lon"]] for f in feeds.values()], ignore_index=True)
    allst_ = allst_.drop_duplicates("stop_id")
    ax, ay = fwd.transform(allst_.stop_lon.values, allst_.stop_lat.values)
    xy = dict(zip(allst_.stop_id, zip(ax, ay)))
    LAT = dict(zip(allst_.stop_id, allst_.stop_lat)); LON = dict(zip(allst_.stop_id, allst_.stop_lon))
    NAME = dict(zip(allst_.stop_id, allst_.stop_name))
    ctry = {}
    for f in feeds.values():
        ctry.update(zip(f[2].stop_id, f[2].country))
    # Länderzuordnung der DE-Feed-Halte: <= 300 m zu einem PL-/CZ-Halt der neuen Feeds
    fst_ = pd.concat([f[2] for f in feeds.values()]); fst_ = fst_[fst_.country.isin(FOREIGN)]
    ftree = cKDTree(np.array([xy[s] for s in fst_.stop_id])); fc = fst_.country.values
    de_st = pd.unique(np.r_[con.a.values, con.b.values])
    dd_, jj_ = ftree.query(np.array([xy[s] for s in de_st]), distance_upper_bound=300)
    hit = np.isfinite(dd_)
    ctry.update(zip(de_st[hit], fc[jj_[hit]]))
    log("DE-Feed-Halte in PL/CZ (<= 300 m zu PL/CZ-Feed):", pd.Series(fc[jj_[hit]]).value_counts().to_dict())
    src = np.where(con.a.str.startswith("fv:"), "fv", np.where(con.a.str.startswith("rv:"), "rv", "vbb"))
    both = con.a.map(ctry).isin(FOREIGN).values & con.b.map(ctry).isin(FOREIGN).values
    dropde = both & ((src != "vbb") | con["mode"].isin(["R", "S", "L"]).values)
    cin = (con.td.values >= T0) & (con.td.values <= T1)
    log("DE-Verbindungen mit beiden Enden in PL/CZ entfernt (im Fenster):",
        pd.Series(src[dropde & cin]).value_counts().to_dict(), "| Linien:",
        con[dropde & cin].route_short_name.value_counts().head(15).to_dict())
    cuts = cut_points(con, dropde, ~dropde)
    log("Schnittstellen der DE-Fahrten an PL/CZ-Halten:", len(cuts), cuts.kind.value_counts().to_dict())
    con = con[~dropde].reset_index(drop=True)
    ref = ref_events(con)
    out_parts = [con]
    for pre in ("pl", "cz"):
        if pre not in feeds: continue
        ev, tinfo, sto = feeds[pre]
        c, nc = dedupe_feed(ev, tinfo, ref, pre, "CZ" if pre == "pl" else "PL", cuts)
        cuts = pd.concat([cuts, nc], ignore_index=True)
        out_parts.append(c)
        ref = pd.concat([ref, ref_events(c)], ignore_index=True).drop_duplicates()
        new_stops.append(sto[COLS])
        cc = c[(c.td >= T0) & (c.td <= T1)]
        log(f"{pre}-Verbindungen im Fenster", len(cc), cc["mode"].value_counts().to_dict(), "mit Rad", int(cc.bike.sum()))
    con = pd.concat(out_parts, ignore_index=True)
    del feeds, ref
    upar = {}

    def ufind(a):
        while upar.get(a, a) != a: a = upar[a]
        return a
    for a_, b_ in UNITE:
        ra, rb = ufind(a_), ufind(b_)
        if ra != rb: upar[rb] = ra
    umap = {t: ufind(t) for t in upar}
    con["trip"] = con.trip.map(lambda t: umap.get(t, t)); con["trip_id"] = con.trip
    log("doppelte Referenzfahrten (derselbe Zug) vereinigt:", len(umap))
con = con[(con.td >= T0) & (con.td <= T1)]
con = con.sort_values(["td", "ta"]).reset_index(drop=True)
log("Verbindungen", len(con), con["mode"].value_counts().to_dict())

# ---- Haltepunkte ----
st = pd.read_csv(G + "/stops.txt", dtype={"stop_id": str, "parent_station": str, "level_id": str})
if fstops is not None:
    st = pd.concat([st, fstops[["stop_id", "stop_name", "stop_lat", "stop_lon", "location_type", "parent_station", "level_id"]]], ignore_index=True)
if rstops is not None:
    st = pd.concat([st, rstops[["stop_id", "stop_name", "stop_lat", "stop_lon", "location_type", "parent_station", "level_id"]]], ignore_index=True)
for t in new_stops:
    st = pd.concat([st, t], ignore_index=True)
lv = pd.read_csv(G + "/levels.txt", dtype={"level_id": str}).set_index("level_id").level_index
used = pd.unique(np.r_[con.a.values, con.b.values])
S = st.set_index("stop_id").loc[used].reset_index()
sidx = {s: i for i, s in enumerate(S.stop_id)}
order = {"U": 0, "S": 1, "L": 2, "R": 3, "T": 4, "F": 5, "B": 6}
smode = {}
for m, a, b in zip(con["mode"], con.a, con.b):
    for s in (a, b):
        if s not in smode or order[m] < order[smode[s]]:
            smode[s] = m
S["mode"] = [smode[s] for s in S.stop_id]
S["level"] = [lv.get(l, np.nan) for l in S.level_id]

# ---- Stationswege (pathways): Bahnsteig <-> Eingang, zu Fuß und mit Rad ----
pw = pd.read_csv(G + "/pathways.txt", dtype={"from_stop_id": str, "to_stop_id": str})
allst = st.set_index("stop_id")
nodes = pd.unique(np.r_[pw.from_stop_id, pw.to_stop_id])
nid = {s: i for i, s in enumerate(nodes)}
tt = pw.traversal_time.fillna(pw.length / 1.3).values.astype(float)
ln = pw.length.values.astype(float)
md = pw.pathway_mode.values
w_walk = tt.copy()
w_bike = np.where(md == 1, np.where(np.isfinite(ln), ln / 1.0, tt * 1.3),          # Rad schieben
         np.where(md == 5, tt + 60,                                                   # Aufzug inkl. Warten
         tt * 2.5))                                                                   # Treppe/Rolltreppe: tragen
fi = np.array([nid[s] for s in pw.from_stop_id]); ti = np.array([nid[s] for s in pw.to_stop_id])
ent = [nid[s] for s in nodes if s in allst.index and allst.loc[s, "location_type"] == 2]
N = len(nodes)


def station_times(w):
    M = coo_matrix((w, (fi, ti)), shape=(N, N)).tocsr()
    eg = dijkstra(M.T.tocsr(), indices=ent, min_only=True)      # Bahnsteig -> Eingang (rückwärts)
    ac = dijkstra(M, indices=ent, min_only=True)                # Eingang -> Bahnsteig
    return eg, ac

egw, acw = station_times(w_walk); egb, acb = station_times(w_bike)
for col, arr in (("eg_w", egw), ("ac_w", acw), ("eg_b", egb), ("ac_b", acb)):
    S[col] = [arr[nid[s]] if s in nid and np.isfinite(arr[nid[s]]) else np.nan for s in S.stop_id]
has = S.eg_b.notna()
log("Bahnsteige mit Stationswegen", int(has.sum()), "von", len(S))
log(S[has].groupby("mode")[["eg_w", "ac_w", "eg_b", "ac_b"]].median().round(0).to_string())

# Rückfall ohne Stationswege: Median je Verkehrsmittel und Ebenenzahl, sonst Standardwerte
S["floors"] = S.level.abs()
DEF = {"U": (60, 140), "S": (45, 100), "R": (60, 120), "L": (64, 92), "T": (10, 20), "F": (30, 60), "B": (5, 0)}
for c in ("eg_w", "ac_w", "eg_b", "ac_b"):
    med = S[has].groupby(["mode", "floors"])[c].median()
    medm = S[has].groupby("mode")[c].median()
    fill = []
    for m, f, v in zip(S["mode"], S.floors, S[c]):
        if np.isfinite(v): fill.append(v); continue
        if (m, f) in med.index: fill.append(med[(m, f)]); continue
        if m in medm.index and m not in ("T", "B"): fill.append(medm[m]); continue
        fill.append(DEF[m][0 if c.endswith("_w") else 1])
    S[c] = np.minimum(fill, 600)
S.loc[S["mode"] == "B", ["ac_b", "eg_b"]] = 0      # Bus: ohnehin kein Rad
S.loc[S["mode"].isin(["T", "B"]), ["eg_w", "ac_w"]] = S.loc[S["mode"].isin(["T", "B"]), ["eg_w", "ac_w"]].clip(upper=30)
log(S.groupby("mode")[["eg_w", "eg_b"]].describe(percentiles=[.5]).round(0).to_string())

# ---- Umstiege: Haltepunkte < 400 m (Weg über Straße bzw. Station) ----
x, y = fwd.transform(S.stop_lon.values, S.stop_lat.values)
S["x"], S["y"] = x, y
# Fernverkehrs-Halte: Stationszeiten vom nächstgelegenen VBB-Bahnsteig (Regio/S-Bahn) derselben Station übernehmen
# (ebenso rv-Halte an VBB-Bahnhöfen; alle übrigen rv-/fv-Halte behalten den Rückfallwert je Verkehrsmittel)
rail = np.where(S["mode"].isin(["R", "S"]) & ~S.stop_id.str.startswith(("fv:", "rv:", "pl:", "cz:")))[0]
rtree = cKDTree(np.c_[x[rail], y[rail]])
for i in np.where((S["mode"] == "L") | (S.stop_id.str.startswith("rv:") & S["mode"].isin(["R", "S"])))[0]:
    nb = rtree.query_ball_point([x[i], y[i]], 250)
    if nb:
        for c in ("eg_w", "ac_w", "eg_b", "ac_b"):
            S.loc[i, c] = float(np.median(S[c].values[rail[nb]]))
ktree = cKDTree(np.c_[x, y])
pairs = ktree.query_pairs(400, output_type="ndarray")
# Grenzbahnhöfe mit weiter auseinanderliegenden Halten der verschiedenen Feeds: Zasieki bis 600 m
EXTRA = {"Zasieki": 600}
ex = []
for nm, r in EXTRA.items():
    for i in np.where(S.stop_name.str.contains(nm, regex=False).values)[0]:
        for j in ktree.query_ball_point([x[i], y[i]], r):
            if j != i and np.hypot(x[i] - x[j], y[i] - y[j]) > 400: ex.append((min(i, j), max(i, j)))
ex = np.array(sorted(set(ex)), dtype=pairs.dtype).reshape(-1, 2)
log("zusätzliche Grenz-Umstiegspaare (400-600 m)", len(ex), [(S.stop_id[a], S.stop_id[b]) for a, b in ex[:6]])
pairs = np.r_[pairs, ex]
pairs = np.r_[pairs, pairs[:, ::-1]]
d = np.hypot(x[pairs[:, 0]] - x[pairs[:, 1]], y[pairs[:, 0]] - y[pairs[:, 1]])
fp = pd.DataFrame({"i": pairs[:, 0], "j": pairs[:, 1], "d": d})
log("Umstiegspaare", len(fp))

# Umstiegszeiten: (1) VBB transfers.txt, (2) Stationswege Bahnsteig->Bahnsteig, (3) über die Straße
egw_, acw_, egb_, acb_ = (S[c].values for c in ("eg_w", "ac_w", "eg_b", "ac_b"))
street_w = egw_[fp.i] + fp.d.values * 1.3 / 1.25 + acw_[fp.j]
street_b = egb_[fp.i] + fp.d.values * 1.3 / 1.0 + acb_[fp.j]
# (2) Stationswege
pidx = np.array([nid.get(s, -1) for s in S.stop_id])
has_p = np.where(pidx >= 0)[0]
pw_w = {}; pw_b = {}
for w, store in ((w_walk, pw_w), (w_bike, pw_b)):
    M = coo_matrix((w, (fi, ti)), shape=(N, N)).tocsr()
    for k in range(0, len(has_p), 300):
        src = has_p[k:k + 300]
        Dm = dijkstra(M, indices=pidx[src], limit=900)[:, pidx[has_p]]
        for a, row in zip(src, Dm):
            for b in has_p[np.isfinite(row)]:
                if a != b:
                    store[(a, b)] = row[np.searchsorted(has_p, b)]
log("Stationswege Bahnsteig->Bahnsteig: zu Fuß", len(pw_w), "mit Rad", len(pw_b))
# (1) VBB-Mindestumstiegszeiten (nur allgemeine, ohne Linien-/Fahrtbezug), Haltepunkt oder Station
tf = pd.read_csv(G + "/transfers.txt", dtype=str)
tf = tf[(tf.transfer_type == "2") & tf.from_route_id.isna() & tf.from_trip_id.isna()]
mtt = {(a, b): float(t) for a, b, t in zip(tf.from_stop_id, tf.to_stop_id, tf.min_transfer_time)}
par = S.parent_station.fillna("").values; sids = S.stop_id.values
def vbb(a, b):
    for k in ((sids[a], sids[b]), (par[a], par[b]), (sids[a], par[b]), (par[a], sids[b])):
        if k in mtt: return mtt[k]
    return np.nan
tv = np.array([vbb(a, b) for a, b in zip(fp.i.values, fp.j.values)])
pw_wa = np.array([pw_w.get((a, b), np.nan) for a, b in zip(fp.i.values, fp.j.values)])
pw_ba = np.array([pw_b.get((a, b), np.nan) for a, b in zip(fp.i.values, fp.j.values)])
fp["tw"] = np.where(np.isfinite(tv), tv, np.where(np.isfinite(pw_wa), np.minimum(pw_wa, street_w), street_w))
fp["tb"] = np.where(np.isfinite(pw_ba), np.minimum(pw_ba, street_b), np.where(np.isfinite(tv), np.minimum(tv * 1.6, street_b), street_b))
log("Umstieg zu Fuß: VBB", int(np.isfinite(tv).sum()), "Stationsweg", int((~np.isfinite(tv) & np.isfinite(pw_wa)).sum()),
    "Straße", int((~np.isfinite(tv) & ~np.isfinite(pw_wa)).sum()))
log("Umstiegszeiten [s] Median zu Fuß / Rad:", float(np.median(fp.tw)), float(np.median(fp.tb)))

out = {"con": con[["a", "b", "td", "ta", "trip", "mode", "route_short_name", "pick", "drop", "shape_id", "bike"]],
       "stops": S[["stop_id", "stop_name", "stop_lat", "stop_lon", "x", "y", "parent_station", "mode", "level",
                   "eg_w", "ac_w", "eg_b", "ac_b"]],
       "fp": fp}
os.makedirs(os.path.join(H, "data"), exist_ok=True)
pickle.dump(out, open(os.path.join(H, "data", "gtfs_prep_plcz.pkl"), "wb"))
log("ok", len(out["con"]), "Verbindungen,", len(out["stops"]), "Haltepunkte,", len(out["fp"]), "Umstiegspaare")
