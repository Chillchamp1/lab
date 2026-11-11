"""Welche Geofabrik-Regionen schneiden die Kreise aus data/far_missing6.json (r + 1 km)? -> Liste + Kreise/Fläche je Region.
Hilfsschritt zur Auswahl der Regionen in osm_extract_plcz.py. Braucht die Umrisse der Geofabrik-Regionen als .poly-Dateien
in plcz_poly/ (je Region <name>.poly, z. B. https://download.geofabrik.de/europe/poland/lubuskie.poly).
Aufruf: python -I regions_plcz.py [data/far_missing6.json]"""
import sys, os, json, glob
import numpy as np
from shapely.geometry import Polygon, Point, MultiPolygon
from shapely.ops import transform
from pyproj import Transformer
sys.stdout.reconfigure(encoding="utf-8")
H = os.path.dirname(os.path.abspath(__file__))
fwd = Transformer.from_crs(4326, 25833, always_xy=True).transform


def read_poly(fn):
    rings, cur, out = [], None, []
    for line in open(fn):
        t = line.split()
        if not t: continue
        if len(t) == 2:
            try: cur.append((float(t[0]), float(t[1]))); continue
            except (ValueError, AttributeError): pass
        if t[0] == "END":
            if cur is not None: rings.append((neg, cur)); cur = None
            continue
        neg = t[0].startswith("!"); cur = []
    polys = [Polygon(r) for n, r in rings if not n]
    holes = [Polygon(r) for n, r in rings if n]
    g = MultiPolygon(polys) if len(polys) > 1 else polys[0]
    for h in holes: g = g.difference(h)
    return transform(fwd, g)


regs = {os.path.basename(f)[:-5]: read_poly(f) for f in glob.glob(os.path.join(H, "plcz_poly", "*.poly"))}
pts = json.load(open(os.path.join(H, sys.argv[1] if len(sys.argv) > 1 else "data/far_missing6.json"), encoding="utf-8"))
res = {}
for la, lo, r, name, tmin, _ in pts:
    x, y = fwd(lo, la); c = Point(x, y).buffer((r + 1.0) * 1000)
    for k, g in regs.items():
        if g.intersects(c):
            a = g.intersection(c).area / 1e6
            n, s = res.get(k, (0, 0)); res[k] = (n + 1, s + a)
for k, (n, s) in sorted(res.items(), key=lambda t: -t[1][1]):
    print(f"{k:25s} {n:5d} Kreise  {s:8.0f} km²")
