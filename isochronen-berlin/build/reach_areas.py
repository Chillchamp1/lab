"""Grobe Vorab-Reichweite (Rad + Bahn ab Berlin Hauptbahnhof, Abfahrt 08:00) aus data/gtfs_prep.pkl.

Zweck: festlegen, um welche entfernten Bahnhöfe herum Straßen aus OSM gebraucht werden. Zugang = Rad direkt
(Luftlinie x 1,3, 17 km/h) zu Halten <= 6 km, dann Connection Scan (nur Fahrten mit Radmitnahme).

Ausgaben (je Eintrag [lat, lon, radius_km, name, minuten]):
  data/far_missing.json   Halte > 55 km von Berlin-Mitte, in 3 h erreicht; Radius = Restzeit bis 3 h x 15 km/h, max. 12 km
  data/far_missing5.json  Halte > 60 km, in 5 h erreicht und nicht schon durch far_missing.json abgedeckt;
                          Radius = Restzeit bis 5 h x 17 km/h, max. 12 km; Reihenfolge = früheste Ankunft zuerst
  data/reach_stops.csv    alle Halte mit Ankunft bis 13:00
Gebiete werden auf ein Raster von ca. 4,4 x 4,1 km zusammengefasst (größter Radius je Zelle gewinnt).

Aufruf: python -I -u reach_areas.py
"""
import os, json, pickle, math, time
import numpy as np, pandas as pd
from scipy.spatial import cKDTree
from pyproj import Transformer

H = os.path.dirname(os.path.abspath(__file__))
fwd = Transformer.from_crs(4326, 25833, always_xy=True)
t0 = time.time()
P = pickle.load(open(os.path.join(H, "data/gtfs_prep.pkl"), "rb")); con, S, fp = P["con"], P["stops"], P["fp"]
sid = {s: i for i, s in enumerate(S.stop_id)}
CA = np.array([sid[s] for s in con.a]); CB = np.array([sid[s] for s in con.b])
CTD = con.td.values.astype(np.int64); CTA = con.ta.values.astype(np.int64)
_, CT = np.unique(con.trip.values, return_inverse=True); PK = con["pick"].values.astype(int); DR = con["drop"].values.astype(int)
BK = con["bike"].values.astype(bool)
FP = [[] for _ in range(len(S))]
for i, jj, t in zip(fp.i.values, fp.j.values, fp.tb.values): FP[i].append((jj, int(t)))
AC = S.ac_b.values; EG = S.eg_b.values; X = S.x.values; Y = S.y.values
DEP, LIM, V = 8 * 3600, 5 * 3600, 17 / 3.6
LAT, LON = 52.5251, 13.3694                                  # Berlin Hauptbahnhof

ox, oy = fwd.transform(LON, LAT)
d = np.hypot(X - ox, Y - oy)
INF = 10 ** 9
tau = np.where(d <= 6000, DEP + d * 1.3 / V + AC, INF).astype(np.int64).tolist(); plat = [INF] * len(S); board = set()
for ci in range(int(np.searchsorted(CTD, DEP)), len(CA)):
    td = CTD[ci]
    if td > DEP + LIM: break
    if not BK[ci]: continue
    t = CT[ci]
    if t not in board:
        if tau[CA[ci]] <= td and PK[ci] != 1: board.add(t)
        else: continue
    b = CB[ci]; ta = CTA[ci]
    if ta < plat[b] and DR[ci] != 1:
        plat[b] = ta; tau[b] = min(tau[b], ta + 60)
        for jj, tt in FP[b]:
            if ta + tt < tau[jj]: tau[jj] = ta + tt
pl = np.array(plat, float); pl[pl >= INF] = np.nan
best = (pl + EG - DEP) / 60                                  # Minuten ab 08:00 bis Straße am Zielbahnhof
dist = np.hypot(X - 392000, Y - 5820000) / 1000              # km von Berlin-Mitte (UTM 33)
ok = best <= 300
R = pd.DataFrame({"stop_id": S.stop_id, "stop_name": S.stop_name, "lat": S.stop_lat, "lon": S.stop_lon, "mode": S["mode"],
                  "minutes": np.round(best, 1), "km_berlin": np.round(dist, 1)})[ok]
R["arrival"] = [("%02d:%02d" % divmod(8 * 60 + int(m), 60)) if np.isfinite(m) else "" for m in R.minutes]
R.sort_values(["km_berlin"]).to_csv(os.path.join(H, "data/reach_stops.csv"), index=False, encoding="utf-8")
print("erreichbar bis 13:00:", int(ok.sum()), "Haltepunkte, davon > 60 km:", int((ok & (dist > 60)).sum()), flush=True)


def cells(sel, rem_of, r_of, skip=None):
    pts = {}
    for i in sel:
        rem = rem_of(i)
        if rem < 5: continue
        r = r_of(rem)
        if skip is not None and skip(i, r): continue
        key = (round(S.stop_lat.values[i] / 0.04) * 0.04, round(S.stop_lon.values[i] / 0.06) * 0.06)
        if key not in pts or r > pts[key][2]:
            pts[key] = [float(S.stop_lat.values[i]), float(S.stop_lon.values[i]), r, S.stop_name.values[i], float(best[i])]
    return sorted(pts.values(), key=lambda p: p[4])


# ---- 3-h-Gebiete
far3 = cells(np.where((best <= 175) & (dist > 55))[0], lambda i: 180 - best[i], lambda rem: min(12.0, rem * 0.25))
json.dump(far3, open(os.path.join(H, "data/far_missing.json"), "w"))
print("3-h-Gebiete:", len(far3), "Summe r²:", round(sum(p[2] ** 2 for p in far3)), flush=True)

# ---- 5-h-Gebiete ohne die schon abgedeckten
ox_, oy_ = fwd.transform(np.array([p[1] for p in far3]), np.array([p[0] for p in far3])); orr = np.array([p[2] for p in far3])
otree = cKDTree(np.c_[ox_, oy_]) if len(far3) else None


def covered(i, r):
    if otree is None: return False
    for j in otree.query_ball_point([X[i], Y[i]], 12500):
        dd = math.hypot(X[i] - ox_[j], Y[i] - oy_[j]) / 1000
        if dd + r <= orr[j] + 1.0 and dd + min(r, 4) <= min(orr[j], 4) + 1.0:
            return True
    return False


far5 = cells(np.where(ok & (dist > 60))[0], lambda i: 300 - best[i], lambda rem: min(12.0, rem * 17 / 60), covered)
far5 = [p + [0] for p in far5]
json.dump(far5, open(os.path.join(H, "data/far_missing5.json"), "w"))
print("5-h-Gebiete:", len(far5), "Summe r²:", round(sum(p[2] ** 2 for p in far5)), f"| fertig {time.time() - t0:.0f}s", flush=True)
