"""Routbarer Gleisgraph aus OSM-Gleisen: data/osm_rail_de.json (Overpass-artiges elements-Format, bevorzugt,
wird als npz in data/rail_tiles/ gecacht) oder 1°x1°-Kacheln in data/rail_tiles (Format siehe load_tiles).

    from railgraph import RailGraph
    g = RailGraph(source=None, bbox=(lat0, lat1, lon0, lon1))   # source: Datei oder Kachelverzeichnis
    xy = g.route(lonA, latA, lonB, latB, mode)       # Nx2 lon/lat (inkl. A und B) oder None
    g.last_reason                                    # Grund bei None: no_track_A/B, no_path, too_long, degenerate

Knoten = Koordinaten auf 1e-6° gerundet, Kanten = Länge in m. Lange Segmente werden für das Einrasten
auf <=100 m verdichtet. Gewichte: Abstell-/Werksgleise (service=siding/yard/spur/crossover) x1.5;
für mode 2 (U-Bahn) Vollbahn x3, sonst subway x3 (light_rail jeweils x1).
Kurzester Weg: scipy-Dijkstra von einem virtuellen Startknoten, der mit allen Gleisknoten im
400-m-Umkreis von A verbunden ist (Kosten 2x Einrastabstand); Ziel = bester Knoten im Umkreis von B.
"""
import glob, json, math, os, time
import numpy as np
from scipy.sparse import csr_matrix
from scipy.sparse.csgraph import dijkstra
from scipy.spatial import cKDTree
from pyproj import Transformer
from shapely.geometry import LineString

H = os.path.dirname(os.path.abspath(__file__))
TILES = os.path.join(H, "data", "rail_tiles")
DEFAULT_FILE = os.path.join(H, "data", "osm_rail_de.json")
RT = {"rail": 0, "light_rail": 1, "subway": 2, "narrow_gauge": 3}
SERVICE_SLOW = {"siding", "yard", "spur", "crossover"}
SNAP_R = 400.0          # m
K = 256                 # max. Einrastkandidaten je Ende
DENS = 100.0            # m, max. Segmentlänge nach Verdichtung
SNAP_W = 2.0            # Gewicht des Einrastabstands
SIMPL = 6.0             # m
FWD = Transformer.from_crs("EPSG:4326", "EPSG:25833", always_xy=True)
INV = Transformer.from_crs("EPSG:25833", "EPSG:4326", always_xy=True)


def hav(lon1, lat1, lon2, lat2):
    p1, p2 = np.radians(lat1), np.radians(lat2)
    a = np.sin((p2 - p1) / 2) ** 2 + np.cos(p1) * np.cos(p2) * np.sin(np.radians(lon2 - lon1) / 2) ** 2
    return 2 * 6371008.8 * np.arcsin(np.sqrt(a))


def _cls(t):
    return (RT.get(t.get("railway"), 0), t.get("service") in SERVICE_SLOW)


def load_tiles(tiles_dir, bbox):
    """-> ids, P (Mx2 lon/lat), wlen, wcls aus den 1°-Kacheln {bbox, ways:[{id, t, g:[lon,lat,...]}]}"""
    fns = sorted(glob.glob(os.path.join(tiles_dir, "*_*.json")))
    if bbox is not None:
        lat0, lat1, lon0, lon1 = bbox
        want = {(la, lo) for la in range(math.floor(lat0), math.ceil(lat1))
                for lo in range(math.floor(lon0), math.ceil(lon1))}
        have = {tuple(map(int, os.path.basename(f)[:-5].split("_"))): f for f in fns}
        miss = sorted(want - set(have))
        if miss:
            print("WARNUNG: Gleiskacheln fehlen (data/osm_rail_de.json aus osm_extract.py verwenden):", miss)
        fns = [have[t] for t in sorted(want & set(have))]
    seen = set(); ids = []; coords = []; wcls = []; wlen = []
    for fn in fns:
        for w in json.load(open(fn))["ways"]:
            # Kacheln können von verschiedenen Servern/Ständen stammen: abweichende Versionen desselben
            # Wegs beide behalten (hält die Verbindungen an Kachelgrenzen), identische nur einmal
            kk = (w["id"], len(w["g"]), tuple(w["g"][:2]), tuple(w["g"][-2:]))
            if kk in seen:
                continue
            seen.add(kk); ids.append(w["id"])
            coords.append(w["g"]); wlen.append(len(w["g"]) // 2); wcls.append(_cls(w["t"]))
    P = np.fromiter((c for g in coords for c in g), dtype=np.float64).reshape(-1, 2)
    return np.array(ids, dtype=np.int64), P, np.array(wlen, dtype=np.int64), np.array(wcls, dtype=np.int64).reshape(-1, 2)


def load_elements(path):
    """Overpass-artige Datei {"elements":[{"id","tags","geometry":[{"lat","lon"},..]}]} -> wie load_tiles.
    Ergebnis wird als kompaktes npz in data/rail_tiles/ zwischengespeichert (neu, wenn die Quelle neuer ist)."""
    os.makedirs(TILES, exist_ok=True)
    cache = os.path.join(TILES, "_cache_" + os.path.basename(path) + ".npz")
    if os.path.exists(cache) and os.path.getmtime(cache) >= os.path.getmtime(path):
        with np.load(cache) as z:
            return z["ids"], z["P"], z["wlen"], z["wcls"]
    seen = set(); ids = []; wcls = []; wlen = []; flat = []
    for e in json.load(open(path, encoding="utf-8"))["elements"]:
        if e.get("type", "way") != "way" or e["id"] in seen:
            continue
        g = [p for p in (e.get("geometry") or []) if p]
        if len(g) < 2:
            continue
        seen.add(e["id"]); ids.append(e["id"]); wlen.append(len(g)); wcls.append(_cls(e.get("tags") or {}))
        for p in g:
            flat.append(p["lon"]); flat.append(p["lat"])
    r = (np.array(ids, dtype=np.int64), np.array(flat, dtype=np.float64).reshape(-1, 2),
         np.array(wlen, dtype=np.int64), np.array(wcls, dtype=np.int64).reshape(-1, 2))
    tmp = cache + ".tmp.npz"
    np.savez(tmp, ids=r[0], P=r[1], wlen=r[2], wcls=r[3]); os.replace(tmp, cache)
    return r


def clip_ways(P, wlen, wcls, bbox):
    """Nur Wege behalten, die mindestens einen Punkt in bbox (lat0, lat1, lon0, lon1) haben."""
    lat0, lat1, lon0, lon1 = bbox
    ins = (P[:, 1] >= lat0) & (P[:, 1] <= lat1) & (P[:, 0] >= lon0) & (P[:, 0] <= lon1)
    start = np.r_[0, np.cumsum(wlen)[:-1]]
    keep = np.add.reduceat(ins.astype(np.int64), start) > 0
    pk = np.repeat(keep, wlen)
    return P[pk], wlen[keep], wcls[keep]


class RailGraph:
    def __init__(self, source=None, bbox=None, verbose=True):
        """source: Kachelverzeichnis (Standard data/rail_tiles) oder Overpass-artige JSON-Datei
        (Standard: data/osm_rail_de.json, falls vorhanden). bbox = (lat0, lat1, lon0, lon1) oder None."""
        t0 = time.time()
        self.verbose = verbose
        if source is None:
            source = DEFAULT_FILE if os.path.exists(DEFAULT_FILE) else TILES
        if os.path.isdir(source):
            ids, P, wlen, wcls = load_tiles(source, bbox)
        else:
            ids, P, wlen, wcls = load_elements(source)
            if bbox is not None:
                P, wlen, wcls = clip_ways(P, wlen, wcls, bbox)
        self.source = source
        if not len(wlen):
            raise RuntimeError("keine Gleisdaten in " + source)
        wid = np.repeat(np.arange(len(wlen)), wlen)
        a = np.nonzero(wid[:-1] == wid[1:])[0]                       # Segment a -> a+1
        sw = wid[a]
        L = hav(P[a, 0], P[a, 1], P[a + 1, 0], P[a + 1, 1])
        n = np.maximum(1, np.ceil(L / DENS)).astype(np.int64)
        # verdichtete Punkte je Segment: k = 0..n
        rep = np.repeat(np.arange(len(a)), n + 1)
        off = np.repeat(np.cumsum(n + 1) - (n + 1), n + 1)
        k = np.arange(len(rep)) - off
        tt = (k / n[rep])[:, None]
        A_, B_ = P[a[rep]], P[a[rep] + 1]
        pts = np.where((k == n[rep])[:, None], B_, A_ + (B_ - A_) * tt)
        qi = np.round(pts * 1e6).astype(np.int64)
        key = (qi[:, 0] + 200_000_000) * 400_000_000 + (qi[:, 1] + 100_000_000)
        ukey, inv = np.unique(key, return_inverse=True)
        inv = inv.ravel()
        self.N = N = len(ukey)
        self.lon = (ukey // 400_000_000 - 200_000_000) / 1e6
        self.lat = (ukey % 400_000_000 - 100_000_000) / 1e6
        e = np.nonzero(k < n[rep])[0]
        u, v = inv[e], inv[e + 1]
        seg = rep[e]
        el = (L / n)[seg]
        rt = wcls[sw[seg], 0]; slow = wcls[sw[seg], 1].astype(bool)
        keep = u != v
        u, v, el, rt, slow = u[keep], v[keep], el[keep], rt[keep], slow[keep]
        # ungerichtet, Duplikate -> Minimum
        lo_, hi_ = np.minimum(u, v), np.maximum(u, v)
        f_heavy = np.where(rt == 2, 3.0, 1.0) * np.where(slow, 1.5, 1.0)
        f_metro = np.where((rt == 0) | (rt == 3), 3.0, 1.0) * np.where(slow, 1.5, 1.0)
        order = np.lexsort((el * f_heavy, hi_, lo_))
        lo_, hi_ = lo_[order], hi_[order]
        first = np.r_[True, (lo_[1:] != lo_[:-1]) | (hi_[1:] != hi_[:-1])]
        idx = order[first]
        self.eu, self.ev = lo_[first], hi_[first]
        self.elen = el[idx]
        self.G = {"heavy": self._csr(self.eu, self.ev, el[idx] * f_heavy[idx]),
                  "metro": self._csr(self.eu, self.ev, el[idx] * f_metro[idx])}
        self.x, self.y = FWD.transform(self.lon, self.lat)
        self.tree = cKDTree(np.c_[self.x, self.y])
        self.cache = {}
        self.last_reason = None
        if verbose:
            print(f"Gleisgraph ({os.path.basename(source)}): {len(wlen)} Wege, {N} Knoten, {len(self.eu)} Kanten, "
                  f"{time.time() - t0:.1f}s", flush=True)

    def _csr(self, u, v, w):
        N = self.N; S = N                                   # virtueller Start N, Platzhalter N+1..N+K
        rows = np.r_[u, v, np.full(K, S)]
        cols = np.r_[v, u, np.arange(N + 1, N + 1 + K)]
        data = np.r_[w, w, np.ones(K)]
        G = csr_matrix((data, (rows, cols)), shape=(N + 1 + K, N + 1 + K))
        G.sort_indices()
        return G

    def _cands(self, x, y):
        d, i = self.tree.query([x, y], k=K, distance_upper_bound=SNAP_R)
        ok = np.isfinite(d)
        return i[ok], d[ok]

    def route(self, lonA, latA, lonB, latB, mode):
        cls = "metro" if mode == 2 else "heavy"
        ck = (round(lonA, 6), round(latA, 6), round(lonB, 6), round(latB, 6), cls)
        if ck not in self.cache:
            self.last_len = self.last_straight = None
            res = self._route(lonA, latA, lonB, latB, cls)
            self.cache[ck] = (res, self.last_reason, self.last_len, self.last_straight)
        res, self.last_reason, self.last_len, self.last_straight = self.cache[ck]
        return res

    def _route(self, lonA, latA, lonB, latB, cls):
        (xa, xb), (ya, yb) = FWD.transform([lonA, lonB], [latA, latB])
        straight = math.hypot(xb - xa, yb - ya); self.last_straight = straight
        maxlen = 1.8 * straight + 3000.0
        ia, da = self._cands(xa, ya)
        ib, db = self._cands(xb, yb)
        if not len(ia):
            self.last_reason = "no_track_A"; return None
        if not len(ib):
            self.last_reason = "no_track_B"; return None
        G = self.G[cls]; S = self.N
        s0, s1 = G.indptr[S], G.indptr[S + 1]
        cols = np.arange(self.N + 1, self.N + 1 + K); w = np.ones(K)
        cols[:len(ia)] = ia; w[:len(ia)] = np.maximum(SNAP_W * da, 0.01)
        G.indices[s0:s1] = cols; G.data[s0:s1] = w
        dist, pred = dijkstra(G, directed=True, indices=S, return_predecessors=True,
                              limit=1.5 * maxlen + SNAP_W * SNAP_R)
        cost = dist[ib] + SNAP_W * db
        j = int(np.argmin(cost))
        if not np.isfinite(cost[j]):
            self.last_reason = "no_path"; return None
        path = []; c = int(ib[j])
        while c != S and c >= 0:
            path.append(c); c = int(pred[c])
        path.reverse()
        if len(path) < 2:
            self.last_reason = "degenerate"; return None
        px = np.r_[xa, self.x[path], xb]; py = np.r_[ya, self.y[path], yb]
        geo = float(np.hypot(np.diff(px), np.diff(py)).sum())
        self.last_len = geo
        if geo > maxlen:
            self.last_reason = "too_long"; return None
        sx, sy = np.asarray(LineString(np.c_[px, py]).simplify(SIMPL).coords).T
        lo, la = INV.transform(sx, sy)
        out = np.c_[lo, la]; out[0] = (lonA, latA); out[-1] = (lonB, latB)
        self.last_reason = "ok"
        return out
