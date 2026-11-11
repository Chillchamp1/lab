"""ÖPNV + Rad bis 5 h mit eigenem Fahrplan-Routing (Connection Scan auf VBB + gtfs.de fv/rv),
Stationszeiten aus GTFS-pathways, Weiterweg mit dem Rad auf dem Straßennetz, Verkehrsmittel je Straße + gefahrene Linien.

Aufruf: python -I -u build_isochronen.py hbf 52.5251 13.3694 gtfs/vbb
  (Name, Breite, Länge, Ordner des VBB-GTFS für shapes.txt) -> data/hbf/streets_raw.json
Eingaben in data/: gtfs_prep.pkl, hbf/exp_*.json (fetch_valhalla.py), overpass_major5.json und far5_segs.npz
(prep_streets.py), overpass_far.json, overpass_far3.json, overpass_minor_main.json (siehe README).
Laufzeit ca. 40 min, Spitzenbedarf ca. 16 GB RAM."""
import sys, os, json, pickle, math, base64
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from isolib import *          # noqa
import isolib
import numpy as np
NAME, LAT, LON = sys.argv[1], float(sys.argv[2]), float(sys.argv[3])
DD = D                                   # gemeinsame Daten (Overpass, GTFS)
OD = isolib.D = os.path.join(DD, NAME)    # Valhalla-Expansionen und Ergebnis dieses Startpunkts
from scipy.spatial import cKDTree
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import dijkstra

DEPS = [8 * 3600 + k * 300 for k in range(4)]          # 08:00, 08:05, 08:10, 08:15
MCODE = {"S": 1, "U": 2, "T": 3, "R": 4, "B": 5, "F": 6, "L": 7}
TOL["biketransit"] = 4.0

# ---------- direkte Wege (wie bisher) ----------
E = {m: load(m) for m in ("car", "bike", "walk")}
net = load("net", tmax=1e9)
walk90 = Gw = Tw = fw = None
bike90, Gb, Tb, fb = extend("bike", E["bike"], list(net) + list(E["bike"]), 17 / 3.6)

SPD = {"motorway": 120, "trunk": 95, "primary": 80, "secondary": 70, "tertiary": 60}
car_segs, fast_pts, slow_segs, major_segs = [], [], [], []
for w in json.load(open(os.path.join(DD, "overpass_major5.json"), encoding="utf-8"))["elements"]:
    hw = w["tags"].get("highway", ""); base = hw.replace("_link", "")
    v = SPD.get(base, 50) if not hw.endswith("_link") else 45
    ms = w["tags"].get("maxspeed", "")
    if ms.isdigit():
        v = min(v, int(ms)) if base != "motorway" else min(130, int(ms))
    g = w.get("geometry", [])
    for p, q in zip(g, g[1:]):
        s = (round(p["lon"], 5), round(p["lat"], 5), round(q["lon"], 5), round(q["lat"], 5))
        if s[:2] == s[2:]:
            continue
        car_segs.append(s + (v / 3.6,))
        if base in ("motorway", "trunk", "primary", "secondary"):
            major_segs.append(s)
        if base in ("motorway", "trunk"):
            fast_pts.append(((s[0] + s[2]) / 2, (s[1] + s[3]) / 2))
        else:
            slow_segs.append(s)
car90 = {}

# Straßen für Fuß/Rad weit draußen: Auto-60-Kanten ohne Autobahn/Kraftfahrstraße + Overpass-Nebenstraßen
fx, fy = fwd.transform(*np.array(fast_pts).T)
ftree = cKDTree(np.c_[fx, fy])
ck = np.array(list(E["car"].keys()))
cx, cy = fwd.transform((ck[:, 0] + ck[:, 2]) / 2, (ck[:, 1] + ck[:, 3]) / 2)
dd, _ = ftree.query(np.c_[cx, cy], distance_upper_bound=25)
car_slow = [tuple(k) for k, d in zip(map(tuple, ck), dd) if not np.isfinite(d)]
log("Auto-60-Kanten ohne Schnellstraßen", len(car_slow), "von", len(ck))
base_net = set(net) | set(E["bike"]) | set(car_slow) | set(slow_segs)
NW = None
TB = 5 * 3600                                       # ÖPNV + Rad: 5 Stunden
far_segs = set()
for w in (json.load(open(os.path.join(DD, "overpass_far.json"), encoding="utf-8"))["elements"] +
          json.load(open(os.path.join(DD, "overpass_far3.json"), encoding="utf-8"))["elements"]):
    g = w.get("geometry", [])
    for p, q in zip(g, g[1:]):
        s_ = (round(p["lon"], 5), round(p["lat"], 5), round(q["lon"], 5), round(q["lat"], 5))
        if s_[:2] != s_[2:]:
            far_segs.add(s_)
_F5 = np.load(os.path.join(DD, "far5_segs.npz"))
# 5-h-Ring: Wohnstraßen, Verbindungsstraßen, Radwege, befestigte Feld-/Waldwege im 8-km-Umkreis der Bahnhöfe
_k5 = np.isin(_F5["cls"], [1, 2, 3, 4]) & (_F5["dkm"] <= 8.0)
_f5 = np.round(np.c_[_F5["lon1"], _F5["lat1"], _F5["lon2"], _F5["lat2"]][_k5].astype(np.float64) / 1e5, 5)
F5CLS = _F5["cls"][_k5]; del _F5, _k5
log("Straßen an entfernten Bahnhöfen", len(far_segs), "+ 5-h-Ring", len(_f5))
BNET = np.vstack([np.array(list(base_net | far_segs), dtype=float), _f5])
NBk = Graph(BNET, 17 / 3.6)
isolib.TMAX = TB                                    # direkte Radzeiten bis 3 h (für ÖPNV + Rad)
bike180, Gb2, Tb2, fb2 = extend("bike", E["bike"], BNET, 17 / 3.6)
isolib.TMAX = TMAX
log("Netz Rad", len(NBk.nodes), "Knoten")

# ---------- Fahrplan ----------
P = pickle.load(open(os.path.join(DD, "gtfs_prep.pkl"), "rb"))
con, S, fp = P["con"], P["stops"], P["fp"]
sid = {s: i for i, s in enumerate(S.stop_id)}
CA = np.array([sid[s] for s in con.a]); CB = np.array([sid[s] for s in con.b])
CTD = con.td.values.astype(int); CTA = con.ta.values.astype(int)
CM = np.array([MCODE[m] for m in con["mode"]])
trip_codes, CT = np.unique(con.trip.values, return_inverse=True)
PICK = con["pick"].values.astype(int); DROP = con["drop"].values.astype(int); BIKEOK = con["bike"].values.astype(bool)
SHAPE = con["shape_id"].values
nS = len(S)
FP = [[] for _ in range(nS)]
for i, j, tw, tb in zip(fp.i.values, fp.j.values, fp.tw.values, fp.tb.values):
    FP[i].append((j, int(tw), int(tb)))
trip_conns = {}
for ci, t in enumerate(CT):
    trip_conns.setdefault(t, []).append(ci)


def snap(G, T, speed, maxd=250):
    """Haltepunkt -> nächster Netzknoten; liefert Knotenindex, Abstand, direkte Zeit dorthin."""
    d, j = cKDTree(G.xy).query(np.c_[S.x.values, S.y.values], distance_upper_bound=maxd)
    ok = np.isfinite(d)
    jj = np.where(ok, j, 0)
    t = np.where(ok, T[jj] + d / speed, np.inf) if T is not None else None
    return np.where(ok, j, -1), np.where(ok, d, np.inf), t


# direkte Radzeit Start -> Haltepunkt (Valhalla + Fortsetzung)
acc_walk = None
_, _, acc_bike = snap(Gb2, Tb2, 4.0)
log("Halte direkt erreichbar: Rad", int(np.isfinite(acc_bike).sum()))


def csa(profile, dep):
    bike = profile == "bike"
    acc = acc_bike if bike else acc_walk
    AC = (S.ac_b if bike else S.ac_w).values; EG = (S.eg_b if bike else S.eg_w).values
    same = 60 if bike else 30                          # Umstieg am selben Bahnsteig
    INF = 10 ** 9
    tau = np.where(np.isfinite(acc), dep + acc + AC, INF).astype(np.int64).tolist()
    tau_ptr = [None] * nS                                  # None=Start, ('p',b) gleicher Bahnsteig, ('f',b) Fußweg
    plat = [INF] * nS; plat_ptr = [None] * nS
    street = [INF] * nS
    board = {}
    lim = dep + (TB if bike else TMAX)
    ca, cb, ctd, cta, cm, ct, pk, dr, bk = CA.tolist(), CB.tolist(), CTD.tolist(), CTA.tolist(), CM.tolist(), CT.tolist(), PICK.tolist(), DROP.tolist(), BIKEOK.tolist()
    start = int(np.searchsorted(CTD, dep))
    EGl, ACl = EG.tolist(), AC.tolist()
    for ci in range(start, len(ca)):
        td = ctd[ci]
        if td > lim:
            break
        if bike and not bk[ci]:
            continue
        t = ct[ci]
        if t not in board:
            if tau[ca[ci]] <= td and pk[ci] != 1:
                board[t] = ci
            else:
                continue
        b, ta = cb[ci], cta[ci]
        if ta < plat[b] and dr[ci] != 1:
            plat[b] = ta; plat_ptr[b] = (board[t], ci)
            if ta + same < tau[b]:
                tau[b] = ta + same; tau_ptr[b] = ("p", b)
            e = ta + EGl[b]
            if e < street[b]:
                street[b] = e
            for j, tw, tb in FP[b]:
                tj = ta + (tb if bike else tw)
                if tj < tau[j]:
                    tau[j] = tj; tau_ptr[j] = ("f", b)
    return np.array(street, dtype=float), plat_ptr, tau_ptr, np.array(plat, dtype=float)


def legs_to(b, plat_ptr, tau_ptr):
    """Fahrtabschnitte (Verbindungsindizes) auf dem Weg zur Ankunft am Bahnsteig b."""
    out, seen = [], set()
    while b is not None and plat_ptr[b] is not None and b not in seen:
        seen.add(b)
        c0, c1 = plat_ptr[b]
        out.append((c0, c1))
        a = CA[c0]; p = tau_ptr[a]
        b = None if p is None else p[1]
    return out


RANK = np.array([0, 4, 3, 2, 5, 0, 1, 6])   # Code 0 direkt,1 S,2 U,3 Tram,4 R,5 Bus,6 Fähre,7 Fernzug
JM = [None]                                   # Reise-Verkehrsmittel je Bahnsteig (aktuelle Abfahrt)


def journey_mode(b, plat_ptr, tau_ptr):
    best, br = 0, -1
    for c0, _ in legs_to(b, plat_ptr, tau_ptr):
        m = int(CM[c0])
        if RANK[m] > br:
            br, best = RANK[m], m
    return best


def egress(G, f, snapinfo, street, plat_ptr, dep, tmax):
    """Weiterweg ab Ausstieg auf dem Netz; liefert Knotenzeit und Verkehrsmittel (letzte Fahrt)."""
    node, gap, speed = snapinfo
    ok = (node >= 0) & np.isfinite(street) & (street - dep <= tmax)
    seeds = {}
    for s in np.where(ok)[0]:
        t = street[s] - dep + gap[s] / speed
        n = int(node[s])
        if t < seeds.get(n, (1e18,))[0]:
            seeds[n] = (t, JM[0][s], s)
    N = len(G.nodes); SRC = N
    w = G.len / G.mps * f
    si = np.fromiter(seeds.keys(), int); st = np.array([v[0] for v in seeds.values()]) + 1e-3
    r = np.r_[G.u, G.v, np.full(len(si), SRC)]; c = np.r_[G.v, G.u, si]; dd = np.r_[w, w, st]
    key = r.astype(np.int64) * (N + 1) + c
    o = np.lexsort((dd, key)); key, r, c, dd = key[o], r[o], c[o], dd[o]
    first = np.r_[True, key[1:] != key[:-1]]
    M = coo_matrix((dd[first], (r[first], c[first])), shape=(N + 1, N + 1)).tocsr()
    dist, pred = dijkstra(M, indices=SRC, limit=tmax + 1, return_predecessors=True)
    dist, pred = dist[:N], pred[:N]
    mode = np.zeros(N, dtype=np.int8)
    smode = {n: v[1] for n, v in seeds.items()}
    ssrc = {n: v[2] for n, v in seeds.items()}
    src = np.full(N, -1, dtype=np.int64)
    for n in np.argsort(dist):
        if not np.isfinite(dist[n]):
            break
        p = pred[n]
        if p == SRC:
            mode[n] = smode.get(n, 0); src[n] = ssrc.get(n, -1)
        else:
            mode[n] = mode[p]; src[n] = src[p]
    return dist, mode, src


def _nkey(xy):
    q = np.round(np.asarray(xy, float) * 1e5).astype(np.int64)
    return (q[:, 0] + 20000000) * 40000000 + (q[:, 1] + 20000000)


def direct_times(G, direct):
    """Direkte Radzeit je Netzkante (vektorisiert über Knotenschlüssel; Richtung egal)."""
    nk = _nkey(G.nodes); N = len(nk)
    dk = np.array(list(direct.keys()), float); dt = np.fromiter(direct.values(), float, len(direct))
    ka, kb = _nkey(dk[:, :2]), _nkey(dk[:, 2:4])
    a = np.minimum(np.searchsorted(nk, ka), N - 1); b = np.minimum(np.searchsorted(nk, kb), N - 1)
    ok = (nk[a] == ka) & (nk[b] == kb)
    ek = np.minimum(a, b)[ok].astype(np.int64) * N + np.maximum(a, b)[ok]
    o = np.lexsort((dt[ok], ek)); eks, dts = ek[o], dt[ok][o]
    ge = np.minimum(G.u, G.v).astype(np.int64) * N + np.maximum(G.u, G.v)
    pos = np.minimum(np.searchsorted(eks, ge), max(len(eks) - 1, 0))
    out = np.full(len(ge), np.inf)
    if len(eks):
        hit = eks[pos] == ge; out[hit] = dts[pos[hit]]
    return out


def run_profile(profile, G, f, direct, speed, tmax):
    snapinfo = (*snap(G, None, speed, 300)[:2], speed)
    KE = np.c_[G.nodes[G.u], G.nodes[G.v]]               # Kanten als Array (statt Millionen Tupel)
    dirt = direct_times(G, direct)
    times, modes, hops, stl = [], [], [], []
    for dep in DEPS:
        street, plat_ptr, tau_ptr, plat = csa(profile, dep)
        jm = np.zeros(len(street), np.int64)
        for b_ in np.where(np.isfinite(street) & (street - dep <= tmax))[0]:
            jm[b_] = journey_mode(b_, plat_ptr, tau_ptr)
        JM[0] = jm
        dist, mode, src = egress(G, f, snapinfo, street, plat_ptr, dep, tmax)
        tu, tv = dist[G.u], dist[G.v]
        te = np.minimum(np.maximum(tu, tv), np.minimum(tu, tv) + G.len / G.mps * f)
        me = np.where(tu <= tv, mode[G.u], mode[G.v])
        t = np.minimum(dirt, te); m = np.where(dirt <= te + np.where(np.isfinite(dirt), np.maximum(60.0, 0.1 * dirt), 0.0), 0, me)
        times.append(t); modes.append(m)
        # Bahnhöfe, ab denen das Rad tatsächlich Straßen gewinnt
        se = np.where(tu <= tv, src[G.u], src[G.v])
        win = (dirt > te) & (te <= tmax) & (se >= 0)
        cnt = np.bincount(se[win], minlength=len(street))
        stl.append({int(s_): (float(street[s_] - dep), int(cnt[s_]), int(jm[s_])) for s_ in np.where(cnt >= 3)[0]})
        # gefahrene Abschnitte
        used = {}
        for b in np.where(np.isfinite(street) & (street - dep <= tmax))[0]:
            for c0, c1 in legs_to(b, plat_ptr, tau_ptr):
                for ci in trip_conns[CT[c0]]:
                    if c0 <= ci <= c1 and ci not in used:
                        used[ci] = (CTD[ci] - dep, CTA[ci] - dep)
        hops.append(used)
        log(profile, "Abfahrt", dep // 3600, ":", dep % 3600 // 60, "Halte", int(np.isfinite(street).sum()),
            "Fahrtabschnitte", len(used), "Kanten<=max", int((t <= tmax).sum()))
    T4 = np.vstack(times); M4 = np.vstack(modes)
    o = np.argsort(T4, axis=0)
    lo = np.take_along_axis(T4, o[1:2], 0)[0]; hi = np.take_along_axis(T4, o[2:3], 0)[0]
    tmed = (lo + hi) / 2
    mmed = np.take_along_axis(M4, o[1:2], 0)[0]
    sel = np.where(tmed <= tmax)[0]
    edges = (KE[sel], tmed[sel].astype(np.float64))
    emode = mmed[sel].astype(np.int8)
    del KE, T4, M4, o, lo, hi, times, modes
    # Linien: je Halt-Paar die zweitfrüheste Ankunft über die 4 Abfahrten
    hp = {}
    for used in hops:
        best = {}
        for ci, (t0, t1) in used.items():
            k = (CA[ci], CB[ci], CM[ci])
            if k not in best or t1 < best[k][1]:
                best[k] = (t0, t1, SHAPE[ci])
        for k, v in best.items():
            hp.setdefault(k, []).append(v)
    hopl = []
    for (a, b, m), vs in hp.items():
        if len(vs) < 2:
            continue
        vs.sort(key=lambda v: v[1]); t0, t1, shp_ = vs[1]
        hopl.append((int(a), int(b), int(t0), int(t1), int(m), shp_))
    agg = {}
    for sts in stl:
        for s_, v in sts.items():
            agg.setdefault(s_, []).append(v)
    cand = []
    for s_, v in agg.items():
        if len(v) < 2:
            continue
        v.sort(); cand.append((v[1][0], s_, int(np.median([c for _, c, _ in v])), v[1][2]))
    cand.sort()
    keep_st = []                                  # Bahnsteige derselben Station (250 m) zusammenfassen
    for t_, s_, c_, m_ in cand:
        x_, y_ = S.x.values[s_], S.y.values[s_]
        for k_ in keep_st:
            if (k_[4] - x_) ** 2 + (k_[5] - y_) ** 2 < 250 ** 2:
                k_[2] += c_; break
        else:
            keep_st.append([s_, t_, c_, m_, x_, y_])
    STATIONS[profile] = keep_st
    log(profile, "Ausstiegs-Bahnhöfe", len(keep_st))
    log(profile, "Kanten", len(emode), "Linienabschnitte", len(hopl),
        "Anteil je Verkehrsmittel", np.bincount(emode.astype(np.int64), minlength=8).tolist())
    return edges, emode, hopl, (street, plat)


STATIONS = {}
tr_edges, tr_mode, tr_hops, tr_dbg = {}, {}, [], (None, None)
bt_edges, bt_mode, bt_hops, bt_dbg = run_profile("bike", NBk, fb2, bike180, 4.0, TB)
import gc
del NBk, Gb2, Tb2, bike180, BNET, base_net, far_segs   # Netz wird nicht mehr gebraucht
gc.collect()
pickle.dump({"S": S[["stop_id", "stop_name", "stop_lat", "stop_lon", "mode", "eg_b", "eg_w"]], "tr_street": tr_dbg[0], "bt_street": bt_dbg[0]},
            open(os.path.join(OD, "debug.pkl"), "wb"))

# ---------- Hauptnetz-Klassifikation (nur für die Darstellung) ----------
def densify_tree(segs, step=8.0):
    a = np.asarray(segs, dtype=float)[:, :4]
    box = (a[:, 1] > LAT - 4.5) & (a[:, 1] < LAT + 3.0) & (a[:, 0] > LON - 6.5) & (a[:, 0] < LON + 4.5)
    a = a[box]
    x1, y1 = fwd.transform(a[:, 0], a[:, 1]); x2, y2 = fwd.transform(a[:, 2], a[:, 3])
    n = np.maximum(1, np.ceil(np.hypot(x2 - x1, y2 - y1) / step)).astype(int)
    idx = np.repeat(np.arange(len(a)), n + 1)
    f = np.concatenate([np.linspace(0, 1, k + 1) for k in n])
    return cKDTree(np.c_[x1[idx] + (x2 - x1)[idx] * f, y1[idx] + (y2 - y1)[idx] * f])


extra = json.load(open(os.path.join(DD, "overpass_minor_main.json"), encoding="utf-8"))["elements"] + \
        json.load(open(os.path.join(DD, "overpass_far.json"), encoding="utf-8"))["elements"] + \
        json.load(open(os.path.join(DD, "overpass_far3.json"), encoding="utf-8"))["elements"]


def osm_segs(ways):
    out_ = []
    for w in ways:
        g = w.get("geometry", [])
        out_ += [(p["lon"], p["lat"], q["lon"], q["lat"]) for p, q in zip(g, g[1:])]
    return out_


road_tree = densify_tree([c[:4] for c in car_segs] + osm_segs([w for w in extra if w["tags"].get("highway") == "unclassified"]) +
                         _f5[F5CLS == 1].tolist())
path_tree = densify_tree(osm_segs([w for w in extra if w["tags"].get("highway") == "cycleway" or
                                     (w["tags"].get("highway") == "track" and w["tags"].get("tracktype", "grade1") in ("grade1", "grade2"))]) +
                         _f5[(F5CLS == 2) | (F5CLS == 3)].tolist())
major_tree = densify_tree(major_segs)
log("Hauptnetz-Punkte: Straßen", road_tree.n, "Rad-/Waldwege", path_tree.n, "Fernstraßen", major_tree.n)


def main_flags(keys, bikeish, trees=None):
    k = np.array(keys, dtype=float)
    x1, y1 = fwd.transform(k[:, 0], k[:, 1]); x2, y2 = fwd.transform(k[:, 2], k[:, 3])
    res = np.zeros(len(k), bool)
    for tree in (trees or ([road_tree, path_tree] if bikeish else [road_tree])):
        dm, _ = tree.query(np.c_[(x1 + x2) / 2, (y1 + y2) / 2], distance_upper_bound=9)
        d1, _ = tree.query(np.c_[x1, y1], distance_upper_bound=15)
        d2, _ = tree.query(np.c_[x2, y2], distance_upper_bound=15)
        res |= np.isfinite(dm) & np.isfinite(d1) & np.isfinite(d2)
    return res


# ---------- gefahrene Abschnitte entlang der Gleisgeometrie (GTFS shapes) ----------
import pandas as pd
from shapely.geometry import LineString
GTFS = sys.argv[4]
need = set()
for hops_ in (tr_hops, bt_hops):
    for h in hops_:
        try:
            if np.isfinite(float(h[5])): need.add(int(float(h[5])))
        except (TypeError, ValueError):
            pass
shp = {}
for ch in pd.read_csv(GTFS + "/shapes.txt", chunksize=3_000_000):
    ch = ch[ch.shape_id.isin(need)]
    for sid_, g in ch.groupby("shape_id"):
        shp.setdefault(int(sid_), []).append(g[["shape_pt_sequence", "shape_pt_lon", "shape_pt_lat"]].values)
for k_ in list(shp):
    a_ = np.vstack(shp[k_]); a_ = a_[np.argsort(a_[:, 0])]
    shp[k_] = np.c_[fwd.transform(a_[:, 1], a_[:, 2])]
log("Gleisgeometrien geladen", len(shp), "von", len(need))
SX, SY = S.x.values, S.y.values
_cut = {}


def hop_line(a, b, sh):
    A = np.array([SX[a], SY[a]]); B = np.array([SX[b], SY[b]])
    try:
        sh = int(float(sh))
    except (TypeError, ValueError):
        sh = None
    key = (a, b, sh)
    if key in _cut:
        return _cut[key]
    res = np.array([A, B])
    P_ = shp.get(sh)
    if P_ is not None and len(P_) > 2:
        da = np.hypot(*(P_ - A).T); ia = int(np.argmin(da))
        db = np.hypot(*(P_[ia:] - B).T); ib = ia + int(np.argmin(db))
        if da[ia] < 200 and db.min() < 200 and ib > ia + 1:
            seg = P_[ia:ib + 1]
            L_ = np.hypot(*np.diff(seg, axis=0).T).sum()
            if L_ < 2.5 * np.hypot(*(A - B)) + 300:
                res = np.vstack([A, seg[1:-1], B])
                res = np.asarray(LineString(res).simplify(6).coords)
    _cut[key] = res
    return res


def encode_hops(hops):
    buf = bytearray(); prev = np.zeros(2, dtype=np.int64)
    def vints(vals):
        for v in vals:
            v = int(v)
            while v >= 0x80:
                buf.append((v & 0x7F) | 0x80); v >>= 7
            buf.append(v)
    zz = lambda v: (v << 1) ^ (v >> 63)
    shaped = 0
    for a, b, t0, t1, m, sh in sorted(hops, key=lambda h: h[2]):
        c = hop_line(a, b, sh); shaped += len(c) > 2
        lo, la = inv.transform(c[:, 0], c[:, 1])
        q = np.c_[np.round((lo - LON) * 1e5), np.round((la - LAT) * 1e5)].astype(np.int64)
        vints([len(q), max(0, t0), max(0, t1), m])
        vints(zz(np.diff(np.vstack([prev, q]), axis=0).ravel()).tolist()); prev = q[-1]
    log("Linienabschnitte", len(hops), "davon entlang Gleisgeometrie", shaped)
    return base64.b64encode(bytes(buf)).decode()



# ---------- Kodierung: je 10 s, Linien mit Verkehrsmittel-Code ----------
def encode(m, e, emode=None, tmax=TMAX):
    NB = tmax // STEP
    keys, ts = e
    md = np.asarray(emode, dtype=np.int64) if emode is not None else np.zeros(len(ts), int)
    mainf = main_flags(keys, m in ("bike", "biketransit"))
    log(m, "Hauptnetz-Anteil", round(float(mainf.mean()), 3))
    keep = (ts <= 3 * 3600) | mainf             # bis 3 h alle Straßen, danach nur Hauptnetz (Dateigröße)
    keys, ts, md, mainf = keys[keep], ts[keep], md[keep], mainf[keep]
    lev = mainf.astype(int) + (mainf & main_flags(keys, False, [major_tree])).astype(int)
    log(m, "Rangstufen 0/1/2", np.bincount(lev, minlength=3).tolist())
    md = md + 8 * lev                          # Code: Verkehrsmittel | Rangstufe<<3
    b = np.clip(np.ceil(ts / STEP), 1, NB).astype(int)
    buf = bytearray(); prev = np.zeros(2, dtype=np.int64)
    def vints(vals):
        for v in vals:
            v = int(v)
            while v >= 0x80:
                buf.append((v & 0x7F) | 0x80); v >>= 7
            buf.append(v)
    zz = lambda v: (v << 1) ^ (v >> 63)
    order = np.lexsort((md, b)); bs = b[order]
    bounds = np.searchsorted(bs, np.arange(1, NB + 2))
    nl = 0
    for bi in range(NB):
        idx = order[bounds[bi]:bounds[bi + 1]]
        lines = []
        for mm in np.unique(md[idx]) if len(idx) else []:
            sub = idx[md[idx] == mm]
            a = keys[sub]
            ux, uy = fwd.transform(a[:, [0, 2]].ravel(), a[:, [1, 3]].ravel())
            mg = linemerge(MultiLineString([LineString(s) for s in np.c_[ux, uy].reshape(-1, 2, 2)]))
            for ln in (mg.geoms if mg.geom_type == "MultiLineString" else [mg]):
                c = np.asarray(ln.simplify(TOL[m]).coords)
                lo, la = inv.transform(c[:, 0], c[:, 1])
                lines.append((int(mm), np.c_[np.round((lo - LON) * 1e5), np.round((la - LAT) * 1e5)].astype(np.int64)))
        if lines:
            mk = morton(np.array([q[0] for _, q in lines]))
            lines = [lines[i] for i in np.argsort(mk)]
        vints([zz(len(lines))])
        for mm, q in lines:
            vints([zz(len(q)), mm])
            vints(zz(np.diff(np.vstack([prev, q]), axis=0).ravel()).tolist())
            prev = q[-1]; nl += 1
    log(m, "Linien", nl, "KB", len(buf) * 4 // 3 // 1024)
    return base64.b64encode(bytes(buf)).decode()


from shapely.geometry import LineString, MultiLineString
from shapely.ops import linemerge


def area_series_arr(a, t, cs=250):
    x, y = fwd.transform((a[:, 0] + a[:, 2]) / 2, (a[:, 1] + a[:, 3]) / 2)
    cell = (np.floor(x / cs).astype(np.int64) << 20) + np.floor(y / cs).astype(np.int64)
    order = np.lexsort((t, cell)); cell, t = cell[order], t[order]
    first = np.r_[True, cell[1:] != cell[:-1]]
    hist = np.histogram(np.clip(np.ceil(t[first] / STEP), 1, isolib.NB), bins=np.arange(0.5, isolib.NB + 1.5))[0]
    return [round(v * cs * cs / 1e6, 1) for v in np.cumsum(hist)]


out = {"origin": [LAT, LON], "name": NAME, "step": STEP, "tmax": TMAX, "modes": {}}
SETS = {"biketransit": (bt_edges, bt_mode, bt_hops)}
for m, (e, em, hops) in SETS.items():
    a = e[0]
    tm = TB if m == "biketransit" else TMAX
    isolib.NB = tm // STEP
    out["modes"][m] = {"tmax": tm, "data": encode(m, e, em, tm), "area": area_series_arr(e[0], e[1], 1000 if m == "car" else 250),
                       "bounds": [[float(a[:, [1, 3]].min()), float(a[:, [0, 2]].min())],
                                  [float(a[:, [1, 3]].max()), float(a[:, [0, 2]].max())]]}
    isolib.NB = TMAX // STEP
    if hops is not None:
        out["modes"][m]["hops"] = encode_hops(hops)
    log(m, "Fläche 30/60/90", out["modes"][m]["area"][179], out["modes"][m]["area"][359], out["modes"][m]["area"][-1],
        out["modes"][m]["bounds"])
lo_, la_ = S.stop_lon.values, S.stop_lat.values
out["modes"]["biketransit"]["stations"] = [[int(round((lo_[s_] - LON) * 1e5)), int(round((la_[s_] - LAT) * 1e5)), int(t_), int(c_), int(m_)]
                                           for s_, t_, c_, m_, *_ in STATIONS["bike"]]
json.dump(out, open(os.path.join(OD, "streets_raw.json"), "w"), separators=(",", ":"))
log("total MB", round(os.path.getsize(os.path.join(OD, "streets_raw.json")) / 1e6, 2))
