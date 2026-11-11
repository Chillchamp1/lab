"""Gemeinsame Bausteine: Valhalla-Expansionen laden, Straßengraph mit Mehrquellen-Dijkstra, Fortsetzung der
Valhalla-Zeiten über 60 min hinaus (eigene Dijkstra-Fortsetzung auf dem OSM-Netz, gestartet mit den Valhalla-Zeiten,
Geschwindigkeit an den Valhalla-Zeiten kalibriert), Flächenreihe, Morton-Sortierung.
LAT/LON sind nur Vorgabewerte; build_isochronen.py setzt den Startpunkt per Aufruf."""
import json, os, math, base64, sys
import numpy as np
from scipy.spatial import cKDTree
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import dijkstra
from shapely.geometry import LineString, MultiLineString
from shapely.ops import linemerge
from pyproj import Transformer

H = os.path.dirname(os.path.abspath(__file__))
D = os.path.join(H, "data")
LAT, LON = 52.5251, 13.3694                   # Berlin Hauptbahnhof
TMAX = 5400
STEP = 10                                   # Sekunden je Animationsschritt
NB = TMAX // STEP
fwd = Transformer.from_crs(4326, 25833, always_xy=True)
inv = Transformer.from_crs(25833, 4326, always_xy=True)
WALK_MPS = 75 * 0.8 / 60                    # ÖPNV-Restweg: 4,5 km/h, Umwegfaktor 0,8
TOL = {"walk": 2.0, "bike": 3.0, "transit": 4.0, "car": 7.0}
log = lambda *a: print(*a, flush=True)


def load(name, tmax=3600):
    out = {}
    for f in json.load(open(os.path.join(D, f"exp_{name}.json")))["features"]:
        t = f["properties"]["duration"]
        if t > tmax:
            continue
        (x1, y1), (x2, y2) = f["geometry"]["coordinates"][0], f["geometry"]["coordinates"][-1]
        k = (round(x1, 5), round(y1, 5), round(x2, 5), round(y2, 5))
        if k[:2] == k[2:]:
            continue
        kr = k[2:] + k[:2]
        if kr in out:
            k = kr
        out[k] = min(out.get(k, 1e9), t)
    return out


def node_times(edges):
    """Valhalla: Dauer gilt am Kantenende."""
    nt = {}
    for (x1, y1, x2, y2), t in edges.items():
        nt[(x2, y2)] = min(nt.get((x2, y2), 1e9), t)
    for (x1, y1, x2, y2), t in edges.items():          # Startknoten ohne eigenen Eintrag
        nt.setdefault((x1, y1), t)
    return nt


class Graph:
    def __init__(self, segs, speed=None):
        """segs: Liste (x1,y1,x2,y2[,mps]) in Grad; Kosten = Länge/Geschwindigkeit."""
        # speichersparend: Arrays direkt annehmen, Knoten über ganzzahlige Schlüssel (1e-5 Grad) bilden
        if isinstance(segs, np.ndarray):
            a = np.asarray(segs[:, :4], dtype=float); mps_in = segs[:, 4] if (speed is None and segs.shape[1] > 4) else None
        else:
            a = np.asarray([s[:4] for s in segs], dtype=float); mps_in = None
        q = np.round(np.vstack([a[:, :2], a[:, 2:4]]) * 1e5).astype(np.int64)
        key = (q[:, 0] + 20000000) * 40000000 + (q[:, 1] + 20000000); del q
        uk, idx = np.unique(key, return_inverse=True); del key
        self.nodes = np.c_[(uk // 40000000 - 20000000) / 1e5, (uk % 40000000 - 20000000) / 1e5]; del uk
        idx = idx.ravel()
        n = len(a)
        self.u, self.v = idx[:n], idx[n:]
        ux, uy = fwd.transform(a[:, 0], a[:, 1]); vx, vy = fwd.transform(a[:, 2], a[:, 3])
        self.len = np.hypot(ux - vx, uy - vy) + 0.01
        if speed is not None:
            self.mps = np.full(n, speed)
        else:
            self.mps = np.asarray(mps_in, dtype=float) if mps_in is not None else np.asarray([s[4] for s in segs])
        self.xy = np.c_[fwd.transform(self.nodes[:, 0], self.nodes[:, 1])]

    def run(self, seeds, factor=1.0):
        """Mehrquellen-Dijkstra; seeds: {knoten_idx: startzeit_s}."""
        N = len(self.nodes); S = N
        w = self.len / self.mps * factor
        si = np.fromiter(seeds.keys(), int); st = np.fromiter(seeds.values(), float) + 1e-3
        r = np.r_[self.u, self.v, np.full(len(si), S)]
        c = np.r_[self.v, self.u, si]
        d = np.r_[w, w, st]
        # Mehrfachkanten: nur die günstigste behalten (coo->csr würde sie sonst addieren)
        key = r.astype(np.int64) * (N + 1) + c
        o = np.lexsort((d, key)); key, r, c, d = key[o], r[o], c[o], d[o]
        first = np.r_[True, key[1:] != key[:-1]]
        r, c, d = r[first], c[first], d[first]
        m = coo_matrix((d, (r, c)), shape=(N + 1, N + 1)).tocsr()
        return dijkstra(m, indices=S, limit=TMAX + 1)[:N]


def extend(name, val_edges, net_segs, speed, extra_segs=()):
    """Valhalla-Zeiten (<=60) + Fortsetzung bis 90 min auf eigenem Netz."""
    nt = node_times(val_edges)
    if isinstance(net_segs, np.ndarray):
        G = Graph(net_segs if not len(extra_segs) else np.vstack([np.c_[net_segs[:, :4], np.full(len(net_segs), np.nan)], np.asarray(extra_segs, float)]), speed)
    else:
        G = Graph(list(net_segs) + list(extra_segs), None if speed is None else speed)
    # Valhalla-Knoten auf Netzknoten abbilden (gleiche Koordinate oder < 15 m)
    vk = np.array(list(nt.keys())); vt = np.array(list(nt.values()))
    vxy = np.c_[fwd.transform(vk[:, 0], vk[:, 1])]
    dist, j = cKDTree(vxy).query(G.xy, distance_upper_bound=15)
    hit = np.isfinite(dist)
    seeds_all = {int(i): float(vt[j[i]]) for i in np.where(hit)[0]}
    # Kalibrierung: Start mit Knoten <= 30 min, Vergleich auf 45-60 min
    early = {i: t for i, t in seeds_all.items() if t <= 1800}
    test = np.array([i for i, t in seeds_all.items() if 2700 <= t <= 3600])
    ref = np.array([seeds_all[i] for i in test])
    lo, hi = 0.3, 3.0
    for _ in range(18):
        f = math.sqrt(lo * hi)
        T = G.run(early, f)
        ratio = np.nanmedian(np.where(np.isfinite(T[test]), T[test], np.nan) / ref)
        lo, hi = (f, hi) if ratio < 1 else (lo, f)
    log(name, "Kalibrierfaktor", round(f, 3), "Median-Verhältnis", round(float(ratio), 3), "Testknoten", len(test))
    T = G.run(seeds_all, f)
    T[~hit] = np.maximum(T[~hit], 3600)                   # nicht von Valhalla erreicht -> frühestens 60 min
    # Kantenzeiten: nur Kanten außerhalb der Valhalla-Abdeckung ergänzen
    vmid = np.array([((k[0] + k[2]) / 2, (k[1] + k[3]) / 2) for k in val_edges])
    vtree = cKDTree(np.c_[fwd.transform(vmid[:, 0], vmid[:, 1])])
    mid = (G.xy[G.u] + G.xy[G.v]) / 2
    dd, _ = vtree.query(mid, distance_upper_bound=25)
    out = dict(val_edges)
    tu, tv = T[G.u], T[G.v]
    te = np.minimum(np.maximum(tu, tv), np.minimum(tu, tv) + G.len / G.mps * f)
    te = np.maximum(te, 3600)
    sel = np.where(~np.isfinite(dd) & np.isfinite(te) & (te <= TMAX))[0]
    for i in sel:
        a, b = G.nodes[G.u[i]], G.nodes[G.v[i]]
        out[(a[0], a[1], b[0], b[1])] = float(te[i])
    log(name, "Valhalla", len(val_edges), "+ Fortsetzung", len(sel))
    return out, G, T, f



# ---------- Fläche (250-m-Raster) je 10 s ----------
def area_series(e, cs=250):
    a = np.array(list(e.keys())); t = np.array(list(e.values()))
    x, y = fwd.transform((a[:, 0] + a[:, 2]) / 2, (a[:, 1] + a[:, 3]) / 2)
    cell = (np.floor(x / cs).astype(np.int64) << 20) + np.floor(y / cs).astype(np.int64)
    order = np.lexsort((t, cell)); cell, t = cell[order], t[order]
    first = np.r_[True, cell[1:] != cell[:-1]]
    tc = t[first]
    hist = np.histogram(np.clip(np.ceil(tc / STEP), 1, NB), bins=np.arange(0.5, NB + 1.5))[0]
    return [round(v * cs * cs / 1e6, 1) for v in np.cumsum(hist)]


# ---------- Kodierung: 540 Zeitschritte, Varint-Deltas ----------
def morton(q):
    x = (q[:, 0] + (1 << 20)).astype(np.uint64); y = (q[:, 1] + (1 << 20)).astype(np.uint64)
    def spread(v):
        v = v & np.uint64(0x1FFFFF)
        for s, m in ((32, 0x1F00000000FFFF), (16, 0x1F0000FF0000FF), (8, 0x100F00F00F00F00F),
                     (4, 0x10C30C30C30C30C3), (2, 0x1249249249249249)):
            v = (v | (v << np.uint64(s))) & np.uint64(m)
        return v
    return spread(x) | (spread(y) << np.uint64(1))


