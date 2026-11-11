"""Reichweite (Rad + Bahn, 5 h) ab Berlin Hauptbahnhof aus data/gtfs_prep_plcz.pkl wie reach_areas.py, aber beste
Reisezeit über die Abfahrten 07:00, 07:30, 08:00, 08:30, 09:00 (min. Ankunft-Abfahrt). Vergleich mit data/gtfs_prep.pkl
(nur Deutschland, nur 08:00) an Kontrollbahnhöfen.
-> data/reach_plcz_stops.csv, data/far_missing6.json (neue Gebiete: [lat, lon, r_km, Name, Reisezeit_min, 0]).
Zugang = Rad direkt (Luftlinie x 1,3, 17 km/h) zu Halten <= 6 km, dann Connection Scan (nur Fahrten mit Rad).
Neue Gebiete: Halte > 60 km von Berlin-Mitte mit Reisezeit <= 300 min, r = min(8, Restzeit x 17/60) km; eine Kreisscheibe
gilt als abgedeckt, wenn alle Prüfpunkte (Mitte + 3 Ringe x 16 Richtungen) in der Vereinigung der alten Kreise
(far_missing.json, far_missing5.json; min(r, 8) + 0,3 km, da der Build nur Wege <= 8 km um Bahnhöfe nutzt) bzw. schon gewählter neuer Kreise liegen.
Aufruf: python -I -u reach_areas_plcz.py      (ca. 10 s)"""
import os, sys, json, pickle, math, time
import numpy as np, pandas as pd
from scipy.spatial import cKDTree
from pyproj import Transformer
sys.stdout.reconfigure(encoding="utf-8")
H = os.path.dirname(os.path.abspath(__file__))
fwd = Transformer.from_crs(4326, 25833, always_xy=True)
LIM, V = 5 * 3600, 17 / 3.6
HBF = (52.5251, 13.3694)
DEPS = [7 * 3600, 7 * 3600 + 1800, 8 * 3600, 8 * 3600 + 1800, 9 * 3600]
INF = 10 ** 9


class Net:
    def __init__(self, fn):
        t0 = time.time()
        P = pickle.load(open(fn, "rb")); con, S, fp = P["con"], P["stops"], P["fp"]
        self.S = S
        sid = {s: i for i, s in enumerate(S.stop_id)}
        self.CA = np.array([sid[s] for s in con.a]).tolist(); self.CB = np.array([sid[s] for s in con.b]).tolist()
        self.CTD_np = con.td.values.astype(np.int64)
        self.CTD = self.CTD_np.tolist(); self.CTA = con.ta.values.astype(np.int64).tolist()
        self.CT = np.unique(con.trip.values, return_inverse=True)[1].tolist()
        self.PK = con["pick"].values.astype(int).tolist(); self.DR = con["drop"].values.astype(int).tolist()
        self.BK = con["bike"].values.astype(bool).tolist()
        self.FP = [[] for _ in range(len(S))]
        for i, jj, t in zip(fp.i.values, fp.j.values, fp.tb.values): self.FP[i].append((int(jj), int(t)))
        self.AC = S.ac_b.values; self.EG = S.eg_b.values; self.X = S.x.values; self.Y = S.y.values
        self.ncon = len(con)
        print(f"{fn}: {len(con)} Verbindungen, {len(S)} Halte, geladen in {time.time() - t0:.1f}s", flush=True)

    def csa(self, lat, lon, dep):
        """-> Minuten ab Abfahrt bis Straße am Zielbahnhof (Bahnsteig-Ankunft + Ausgang Rad)"""
        ox, oy = fwd.transform(lon, lat)
        d = np.hypot(self.X - ox, self.Y - oy)
        tau = np.where(d <= 6000, dep + d * 1.3 / V + self.AC, INF).astype(np.int64).tolist()
        plat = [INF] * len(self.S); board = set()
        CA, CB, CTD, CTA, CT, PK, DR, BK, FP = self.CA, self.CB, self.CTD, self.CTA, self.CT, self.PK, self.DR, self.BK, self.FP
        end = dep + LIM
        for ci in range(int(np.searchsorted(self.CTD_np, dep)), self.ncon):
            td = CTD[ci]
            if td > end: break
            if not BK[ci]: continue
            t = CT[ci]
            if t not in board:
                if tau[CA[ci]] <= td and PK[ci] != 1: board.add(t)
                else: continue
            b = CB[ci]; ta = CTA[ci]
            if ta < plat[b] and DR[ci] != 1:
                plat[b] = ta
                if ta + 60 < tau[b]: tau[b] = ta + 60
                for jj, tt in FP[b]:
                    if ta + tt < tau[jj]: tau[jj] = ta + tt
        pl = np.array(plat, float); pl[pl >= INF] = np.nan
        return (pl + self.EG - dep) / 60


def hm(sec):
    if not np.isfinite(sec): return "-"
    m = int(round(sec / 60)); return "%02d:%02d" % divmod(m, 60)


new = Net(os.path.join(H, "data/gtfs_prep_plcz.pkl"))
res = {}
for dep in DEPS:
    t0 = time.time()
    res[dep] = new.csa(*HBF, dep)
    print(f"CSA Abfahrt {hm(dep)}: {time.time() - t0:.1f}s, erreichbar (<= 300 min) {int((res[dep] <= 300).sum())} Halte", flush=True)
TT = np.vstack([res[d] for d in DEPS])
best = np.nanmin(np.where(np.isfinite(TT), TT, np.inf), axis=0); best[~np.isfinite(best)] = np.nan
bdep = np.array(DEPS)[np.argmin(np.where(np.isfinite(TT), TT, np.inf), axis=0)]

old = Net(os.path.join(H, "data/gtfs_prep.pkl"))
t0 = time.time(); r_old = old.csa(*HBF, 8 * 3600); print(f"CSA alt 08:00: {time.time() - t0:.1f}s", flush=True)

# ---- Kontrollbahnhöfe (Koordinaten aus den PL/CZ-Feeds, alle Halte <= 500 m) ----
CHK = [("Szczecin Główny", "pl:273"), ("Poznań Główny", None), ("Zielona Góra Główna", None), ("Wrocław Główny", None),
       ("Gorzów Wielkopolski", None), ("Jelenia Góra", None), ("Liberec", "cz"), ("Děčín hlavní nádraží", "cz"),
       ("Ústí nad Labem hlavní nádraží", "cz"), ("Praha hlavní nádraží", "cz")]
Sn = new.S
rows = []
for name, hint in CHK:
    pre = "cz:" if hint == "cz" else "pl:"
    cand = Sn[(Sn.stop_name == name) & Sn.stop_id.str.startswith(pre)]
    if not len(cand): rows.append((name, "-", "-", "-", "-")); continue
    la, lo = cand.stop_lat.median(), cand.stop_lon.median()
    cx, cy = fwd.transform(lo, la)
    def mn(net, arr):
        m = np.hypot(net.X - cx, net.Y - cy) <= 500
        v = arr[m]; return np.nanmin(v) if np.isfinite(v).any() else np.nan
    o8 = mn(old, r_old); n8 = mn(new, res[8 * 3600]); nb = mn(new, best)
    m = np.hypot(new.X - cx, new.Y - cy) <= 500
    k = np.where(m)[0][np.nanargmin(np.where(np.isfinite(best[m]), best[m], np.inf))] if np.isfinite(best[m]).any() else None
    rows.append((name, hm(8 * 3600 + o8 * 60) if np.isfinite(o8) else "-", hm(8 * 3600 + n8 * 60) if np.isfinite(n8) else "-",
                 f"{nb:.0f} min (ab {hm(bdep[k])})" if k is not None else "-",
                 f"{(o8 - n8):+.0f}" if np.isfinite(o8) and np.isfinite(n8) else ""))
T = pd.DataFrame(rows, columns=["Bahnhof", "alt 08:00 an", "neu 08:00 an", "neu beste Reisezeit", "Gewinn 08:00 [min]"])
print(T.to_string(index=False))

# ---- Halte-Liste ----
X, Y = new.X, new.Y
dist = np.hypot(X - 392000, Y - 5820000) / 1000
ok = best <= 300
R = pd.DataFrame({"stop_id": Sn.stop_id, "stop_name": Sn.stop_name, "lat": Sn.stop_lat, "lon": Sn.stop_lon, "mode": Sn["mode"],
                  "min_best": np.round(best, 1), "dep_best": [hm(d) for d in bdep], "min_0800": np.round(res[8 * 3600], 1),
                  "km_berlin": np.round(dist, 1)})[ok]
R.sort_values("km_berlin").to_csv(os.path.join(H, "data/reach_plcz_stops.csv"), index=False, encoding="utf-8")
print("erreichbar (beste Abfahrt, <= 300 min):", int(ok.sum()), "Halte, davon > 60 km:", int((ok & (dist > 60)).sum()),
      "| PL/CZ-Halte:", int((ok & Sn.stop_id.str.startswith(("pl:", "cz:"))).sum()),
      "| bbox lat %.2f-%.2f lon %.2f-%.2f" % (Sn.stop_lat[ok].min(), Sn.stop_lat[ok].max(), Sn.stop_lon[ok].min(), Sn.stop_lon[ok].max()))
o8 = r_old <= 300
print("alt (08:00):", int(o8.sum()), "Halte erreichbar")

# ---- neue Gebiete ----
oldc = json.load(open(os.path.join(H, "data/far_missing.json"), encoding="utf-8")) + \
       json.load(open(os.path.join(H, "data/far_missing5.json"), encoding="utf-8"))
ox_, oy_ = fwd.transform(np.array([p[1] for p in oldc]), np.array([p[0] for p in oldc]))
orr = np.array([min(p[2], 8.0) + 0.3 for p in oldc]) * 1000           # Build nutzt nur Wege <= 8 km um Bahnhöfe
ANG = np.linspace(0, 2 * np.pi, 16, endpoint=False)


def samples(x0, y0, r):
    pts = [(x0, y0)]
    for f in (1 / 3, 2 / 3, 1.0):
        pts += list(zip(x0 + f * r * np.cos(ANG), y0 + f * r * np.sin(ANG)))
    return np.array(pts)


def covered(P, cx, cy, cr, tree):
    if tree is None: return np.zeros(len(P), bool)
    out = np.zeros(len(P), bool)
    for k, js in enumerate(tree.query_ball_point(P, cr.max() if len(cr) else 0)):
        for j in js:
            if math.hypot(P[k, 0] - cx[j], P[k, 1] - cy[j]) <= cr[j]: out[k] = True; break
    return out


otree = cKDTree(np.c_[ox_, oy_])
cands = []
for i in np.where(ok & (dist > 60))[0]:
    rem = 300 - best[i]
    if rem < 5: continue
    r = min(8.0, rem * 17 / 60) * 1000
    P = samples(X[i], Y[i], r)
    if covered(P, ox_, oy_, orr, otree).all(): continue
    cands.append((r, i, P))
print("Halte > 60 km mit Kreis nicht in alten Gebieten:", len(cands))
cands.sort(key=lambda t: -t[0])
sel = []; sx, sy, sr = [], [], []
for r, i, P in cands:
    oc = covered(P, ox_, oy_, orr, otree)
    if sx:
        nt = cKDTree(np.c_[sx, sy]); oc |= covered(P, np.array(sx), np.array(sy), np.array(sr), nt)
    if oc.all(): continue
    sel.append(i); sx.append(X[i]); sy.append(Y[i]); sr.append(r)
pts = [[float(Sn.stop_lat.values[i]), float(Sn.stop_lon.values[i]), round(float(min(8.0, (300 - best[i]) * 17 / 60)), 3),
        Sn.stop_name.values[i], float(best[i]), 0] for i in sel]
pts.sort(key=lambda p: p[4])
json.dump(pts, open(os.path.join(H, "data/far_missing6.json"), "w", encoding="utf-8"), ensure_ascii=False)
if pts:
    la = np.array([p[0] for p in pts]); lo = np.array([p[1] for p in pts])
    sid_ = [Sn.stop_id.values[i] for i in sel]
    pre = pd.Series([s[:3] if s[:3] in ("pl:", "cz:") else "de" for s in sid_]).value_counts().to_dict()
    print("neue Gebiete:", len(pts), "Summe r²:", round(sum(p[2] ** 2 for p in pts)), "| nach Feed des Halts:", pre,
          "| bbox lat %.2f-%.2f lon %.2f-%.2f" % (la.min(), la.max(), lo.min(), lo.max()))
    print("davon lon > 14.8 oder lat < 50.9 (eher PL/CZ):", int(((lo > 14.8) | (la < 50.9)).sum()))
