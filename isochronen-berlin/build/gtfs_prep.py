"""Fahrplan aufbereiten: VBB + Fernverkehr (gtfs.de fv_free) + Regionalverkehr Deutschland (gtfs.de rv_free),
Dienstag 10.11.2026, Zeitfenster 07:55-13:20 -> data/gtfs_prep.pkl (Verbindungen, Haltepunkte mit Stationszeiten,
Umstiege).
Aufruf: python -I -u -W ignore gtfs_prep.py gtfs/vbb gtfs/fv gtfs/rv

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
G = sys.argv[1]                                   # Ordner mit den entpackten GTFS-Dateien
DATE, DOW = 20261110, "tuesday"
T0, T1 = 7 * 3600 + 55 * 60, 13 * 3600 + 20 * 60
fwd = Transformer.from_crs(4326, 25833, always_xy=True)
log = lambda *a: print(*a, flush=True)

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
con = con[(con.td >= T0) & (con.td <= T1)]
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
    cf = cf[(cf.td >= T0) & (cf.td <= T1)].copy()
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
    cr0 = len(cr); cr = cr[keep & (cr.td >= T0) & (cr.td <= T1)].copy()
    tinfo = rtr.assign(trip="rv:" + rtr.trip_id).set_index("trip")
    own = rst.trip[ok2].values[keep & (rst.dep[ok2].values >= T0) & (rst.dep[ok2].values <= T1)]
    cr["mode"] = tinfo["mode"].reindex(own).values
    cr["route_short_name"] = tinfo["route_short_name"].reindex(own).values
    cr["bike"] = tinfo["bike"].reindex(own).values.astype(bool)
    cr["shape_id"] = np.nan; cr["trip_id"] = cr.trip
    relab = int((cr.trip.values != own).sum())
    log("rv: Fahrten im Fenster", ntr, "davon mit VBB/FV-Doppel", dup_tr, "| Verbindungen", cr0, "-> behalten", len(cr),
        "davon an Referenzfahrt angehängt", relab, "| Referenzfahrten", g.rtrip.str.startswith("fv:").value_counts().to_dict())
    log("rv-Verbindungen", len(cr), cr["mode"].value_counts().to_dict(), cr.route_short_name.value_counts().head(8).to_dict())
    con = pd.concat([con, cr.drop(columns="p")], ignore_index=True)
con = con.sort_values(["td", "ta"]).reset_index(drop=True)
log("Verbindungen", len(con), con["mode"].value_counts().to_dict())

# ---- Haltepunkte ----
st = pd.read_csv(G + "/stops.txt", dtype={"stop_id": str, "parent_station": str, "level_id": str})
if fstops is not None:
    st = pd.concat([st, fstops[["stop_id", "stop_name", "stop_lat", "stop_lon", "location_type", "parent_station", "level_id"]]], ignore_index=True)
if rstops is not None:
    st = pd.concat([st, rstops[["stop_id", "stop_name", "stop_lat", "stop_lon", "location_type", "parent_station", "level_id"]]], ignore_index=True)
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
rail = np.where(S["mode"].isin(["R", "S"]) & ~S.stop_id.str.startswith(("fv:", "rv:")))[0]
rtree = cKDTree(np.c_[x[rail], y[rail]])
for i in np.where((S["mode"] == "L") | (S.stop_id.str.startswith("rv:") & S["mode"].isin(["R", "S"])))[0]:
    nb = rtree.query_ball_point([x[i], y[i]], 250)
    if nb:
        for c in ("eg_w", "ac_w", "eg_b", "ac_b"):
            S.loc[i, c] = float(np.median(S[c].values[rail[nb]]))
pairs = cKDTree(np.c_[x, y]).query_pairs(400, output_type="ndarray")
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
pickle.dump(out, open(os.path.join(H, "data", "gtfs_prep.pkl"), "wb"))
log("ok")
