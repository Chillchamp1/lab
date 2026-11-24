"""Build data/borders.json (Brandenburg+Berlin outline, German land border lines, neighbour-country labels)
and renders/borders_preview.png.

Inputs: zones_work/brandenburg.adm.pkl (admin polygons from the Geofabrik brandenburg extract, see zones_extract.py),
        borders_parts/*.json (from borders_extract.py).
Usage: python -I -u borders_build.py
"""
import glob, json, os, pickle
from collections import defaultdict

import shapely
from shapely import wkb
from shapely.geometry import LineString, MultiLineString, Point, Polygon, box, mapping
from shapely.ops import linemerge, unary_union
from pyproj import Geod, Transformer

H = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(H, "data", "borders.json")
PNG = os.path.join(H, "renders", "borders_preview.png")
DE_BOX = box(5.5, 47.0, 18.0, 55.5)
MAP_BOX = (5.5, 47.0, 19.0, 55.5)
GEOD = Geod(ellps="WGS84")
NEIGH = {"PL": ("Polen", "Poland"), "CZ": ("Tschechien", "Czechia"), "DK": ("Dänemark", "Denmark"),
         "NL": ("Niederlande", "Netherlands"), "BE": ("Belgien", "Belgium"), "LU": ("Luxemburg", "Luxembourg"),
         "FR": ("Frankreich", "France"), "CH": ("Schweiz", "Switzerland"), "AT": ("Österreich", "Austria")}
# hand-picked label anchors (lon, lat), ~15-25 km inside the neighbour country, on land, inside MAP_BOX
LABELS = [("PL", 14.95, 52.40), ("CZ", 13.45, 50.43),
          ("DK", 9.10, 54.99), ("FR", 7.64, 48.72), ("AT", 14.08, 48.56),
          ("NL", 6.55, 52.35), ("BE", 5.80, 50.45), ("LU", 6.10, 49.72), ("CH", 8.25, 47.38)]
# Hinweis: borders_parts/ deckt nicht alle Grenzregionen ab (u. a. NL/BE/LU). Die ausgelieferte Grenzlinie stammt deshalb
# aus einer Overpass-Abfrage aller Landgrenz-Wege der Relation 51477, die auch Wege eines Nachbarlands sind
#   rel(51477);way(r)->.de;rel(id:47796,52411,2171347,16239,51701,2202162,50046,49715,51684);way(r)->.nb;way.de.nb;out geom;
# (maritime Wege verworfen, linemerge, auf 150 m vereinfacht), ergänzt um die Wege von 51477 im Kondominium mit Luxemburg.


def proj(epsg):
    f = Transformer.from_crs(4326, epsg, always_xy=True)
    b = Transformer.from_crs(epsg, 4326, always_xy=True)
    return (lambda g: shapely.transform(g, lambda xy: _tr(f, xy))), (lambda g: shapely.transform(g, lambda xy: _tr(b, xy)))


def _tr(t, xy):
    import numpy as np
    x, y = t.transform(xy[:, 0], xy[:, 1])
    return np.column_stack([x, y])


def rnd(coords):
    out = []
    for x, y in coords:
        p = [round(x, 5), round(y, 5)]
        if not out or out[-1] != p: out.append(p)
    return out


def brandenburg():
    a = pickle.load(open(os.path.join(H, "zones_work", "brandenburg.adm.pkl"), "rb"))
    st = {x["name"]: wkb.loads(x["wkb"]) for x in a if x["level"] == "4"}
    u = unary_union([st["Brandenburg"], st["Berlin"]])
    parts = list(getattr(u, "geoms", [u]))
    fwd, back = proj(25833)
    polys = []
    for p in parts:
        q = fwd(Polygon(p.exterior))            # outer boundary only: fills the Berlin hole + tiny enclaves
        if q.area < 1e6: continue               # drop sub-km2 exclave slivers
        q = q.simplify(100, preserve_topology=True)
        polys.append([rnd(back(q).exterior.coords)])
    print(f"brandenburg: {len(parts)} union parts -> {len(polys)} polygon(s), {sum(len(r) for p in polys for r in p)} pts")
    return polys


def germany():
    rels, ways = {}, {}
    for fn in sorted(glob.glob(os.path.join(H, "borders_parts", "*.json"))):
        d = json.load(open(fn))
        for k, v in d["rels"].items(): rels[int(k)] = v
        for k, v in d["ways"].items(): ways[int(k)] = v
    way_cc = defaultdict(set)
    for rid, r in rels.items():
        if r["iso"] in NEIGH:
            for w in r["ways"]: way_cc[w].add(r["iso"])
    de_members = set(rels[51477]["ways"])
    stats = defaultdict(int)
    by_cc = defaultdict(list)
    for wid, w in ways.items():
        t = w["tags"]
        cc = way_cc.get(wid, set())
        if t.get("maritime") == "yes" or t.get("natural") == "coastline":
            stats["maritime"] += 1; continue
        if not cc:
            stats["no_neighbour"] += 1; continue
        if len(cc) > 1: stats["multi_cc"] += 1
        by_cc[sorted(cc)[0]].append(LineString(w["c"]))
    print(f"germany: {len(ways)} DE member ways found of {len(de_members)}; skipped {dict(stats)}")
    fwd, back = proj(3035)
    lines, lengths = [], {}
    for cc, ls in sorted(by_cc.items()):
        g = linemerge(MultiLineString(ls)).intersection(DE_BOX)
        if g.is_empty: continue
        gl = [g] if g.geom_type == "LineString" else [x for x in getattr(g, "geoms", []) if x.geom_type == "LineString"]
        km = sum(GEOD.geometry_length(x) for x in gl) / 1000
        lengths[cc] = round(km, 1)
        for x in gl:
            s = back(fwd(x).simplify(150, preserve_topology=False))
            c = rnd(s.coords)
            if len(c) >= 2: lines.append((cc, c))
        print(f"  {cc}: {len(gl)} merged line(s), {km:.1f} km inside box")
    # merge across countries too (tripoints) for fewer, continuous lines
    merged = linemerge(MultiLineString([LineString(c) for _, c in lines]))
    ml = [merged] if merged.geom_type == "LineString" else list(merged.geoms)
    out = [rnd(x.coords) for x in ml]
    print(f"  total {len(out)} lines, {sum(len(c) for c in out)} pts")
    return out, lines, lengths


def labels():
    out = []
    for cc, lon, lat in LABELS:
        assert MAP_BOX[0] <= lon <= MAP_BOX[2] and MAP_BOX[1] <= lat <= MAP_BOX[3]
        out.append(dict(name_de=NEIGH[cc][0], name_en=NEIGH[cc][1], lon=lon, lat=lat))
    return out


def label_check(lbls, lines):
    fwd, _ = proj(3035)
    allg = fwd(MultiLineString([LineString(c) for _, c in lines]))
    for l, (cc, _, _) in zip(lbls, LABELS):
        p = fwd(Point(l["lon"], l["lat"]))
        own = fwd(MultiLineString([LineString(c) for k, c in lines if k == cc]))
        print(f"  label {l['name_en']:<8} ({l['lat']:.2f},{l['lon']:.2f}): {p.distance(own)/1000:.1f} km from DE-{cc} border,"
              f" {p.distance(allg)/1000:.1f} km from any")


def preview(bb, de_lines, lbls):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import math
    cols = {"PL": "#d62728", "CZ": "#1f77b4", "DK": "#2ca02c", "NL": "#ff7f0e", "FR": "#9467bd", "AT": "#8c564b",
            "BE": "#e377c2", "LU": "#7f7f7f", "CH": "#17becf"}
    fig, axes = plt.subplots(1, 2, figsize=(18, 11), gridspec_kw=dict(width_ratios=[1.25, 1]))
    for ax, ext in ((axes[0], (6.8, 18.2, 47.9, 55.6)), (axes[1], (13.4, 15.4, 51.0, 53.7))):
        for poly in bb:
            for r in poly:
                xs, ys = zip(*r); ax.fill(xs, ys, color="#ffe9a8", ec="#b8860b", lw=1.2)
        for cc, c in de_lines:
            xs, ys = zip(*c); ax.plot(xs, ys, color=cols.get(cc, "k"), lw=1.6)
        for l in lbls:
            ax.plot(l["lon"], l["lat"], "k+", ms=8)
            ax.text(l["lon"], l["lat"] + 0.04, f"{l['name_de']}/{l['name_en']}", ha="center", fontsize=8)
        ref = {"Frankfurt(O)": (14.55, 52.34), "Görlitz": (14.99, 51.155), "Guben": (14.72, 51.95), "Küstrin": (14.63, 52.57),
               "Schwedt": (14.28, 53.06), "Szczecin": (14.55, 53.43), "Forst": (14.64, 51.735), "Berlin": (13.40, 52.52),
               "Passau": (13.46, 48.57), "Flensburg": (9.44, 54.79), "Strasbourg": (7.75, 48.58), "Cottbus": (14.33, 51.76),
               "Hof": (11.92, 50.32), "Zittau": (14.81, 50.90), "Usedom": (14.0, 53.95), "Gronau": (7.03, 52.21)}
        for n, (x, y) in ref.items():
            ax.plot(x, y, "o", ms=3, color="#333"); ax.text(x + 0.03, y - 0.06, n, fontsize=7, color="#333")
        ax.add_patch(plt.Rectangle((MAP_BOX[0], MAP_BOX[1]), MAP_BOX[2] - MAP_BOX[0], MAP_BOX[3] - MAP_BOX[1],
                                   fill=False, ls="--", ec="#999"))
        ax.set_xlim(ext[0], ext[1]); ax.set_ylim(ext[2], ext[3])
        ax.set_aspect(1 / math.cos(math.radians((ext[2] + ext[3]) / 2))); ax.grid(alpha=0.3)
    axes[0].set_title("borders.json: Brandenburg+Berlin outline, DE land border by neighbour, labels (dashed = map area)")
    axes[1].set_title("Zoom: Oder/Neiße")
    fig.tight_layout(); fig.savefig(PNG, dpi=90)
    print(f"preview -> {PNG}")


def main():
    bb = brandenburg()
    de, de_cc, lengths = germany()
    lb = labels()
    label_check(lb, de_cc)
    json.dump(dict(brandenburg=bb, germany=de, labels=lb), open(OUT, "w", encoding="utf-8"),
              ensure_ascii=False, separators=(",", ":"))
    print(f"wrote {OUT}: {os.path.getsize(OUT)/1024:.1f} KB; border km in box per neighbour: {lengths}")
    preview(bb, de_cc, lb)


if __name__ == "__main__":
    main()
