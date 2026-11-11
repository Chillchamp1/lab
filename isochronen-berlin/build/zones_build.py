"""Build inner-city / Berlin / Umland outlines -> data/zones.json (+ diagnostics).
Usage: python -I -u zones_build.py [threshold] [radius_m] [variant=bld|lu]
"""
import json, os, pickle, re, sys, unicodedata
import numpy as np
import shapely
from shapely.geometry import Point, Polygon, MultiPolygon, box
from shapely.ops import transform as stransform
from scipy import ndimage
from pyproj import Transformer
import contourpy

H = os.path.dirname(os.path.abspath(__file__))
W = os.path.join(H, "zones_work")
THR = float(sys.argv[1]) if len(sys.argv) > 1 else 0.30
RAD = float(sys.argv[2]) if len(sys.argv) > 2 else 350.0
VAR = sys.argv[3] if len(sys.argv) > 3 else "bld"
CELL = 100.0
HOLE_MAX = 5e6
OPEN_R = float(os.environ.get("ZB_OPEN", 200))
CLOSE2_R = float(os.environ.get("ZB_CLOSE2", 500))
SEEDS = [("Tempelhofer Feld", 13.4010, 52.4732), ("Großer Tiergarten", 13.3600, 52.5130)]

fwd = Transformer.from_crs(4326, 25833, always_xy=True)
inv = Transformer.from_crs(25833, 4326, always_xy=True)
to_m = lambda g: shapely.transform(g, lambda c: np.column_stack(fwd.transform(c[:, 0], c[:, 1])))
to_ll = lambda g: shapely.transform(g, lambda c: np.column_stack(inv.transform(c[:, 0], c[:, 1])))

# ---------------- grid
x0, y0 = fwd.transform(12.85, 52.25); x1, y1 = fwd.transform(13.95, 52.75)
X0 = np.floor(min(x0, x1) / CELL) * CELL; Y0 = np.floor(min(y0, y1) / CELL) * CELL
NX = int((max(x0, x1) - X0) / CELL) + 1; NY = int((max(y0, y1) - Y0) / CELL) + 1


def disk(r_cells):
    r = int(np.ceil(r_cells)); yy, xx = np.mgrid[-r:r + 1, -r:r + 1]
    k = (xx * xx + yy * yy <= r_cells * r_cells).astype(float)
    return k


def load_buildings():
    L = []
    for f in ("berlin", "brandenburg"):
        z = np.load(os.path.join(W, f + ".bld.npz"))
        L.append(np.column_stack([z["lon"], z["lat"], z["area"]]))
    A = np.vstack(L)
    key = np.round(A[:, 0] * 2e5).astype(np.int64) * 10**9 + np.round(A[:, 1] * 2e5).astype(np.int64) * 1000 + np.round(A[:, 2]).astype(np.int64) % 1000
    _, idx = np.unique(key, return_index=True)
    A = A[np.sort(idx)]
    print(f"buildings after dedupe: {len(A)} (raw {sum(len(l) for l in L)})")
    return A


def coverage_grid():
    A = load_buildings()
    x, y = fwd.transform(A[:, 0], A[:, 1])
    i = ((np.asarray(y) - Y0) / CELL).astype(int); j = ((np.asarray(x) - X0) / CELL).astype(int)
    ok = (i >= 0) & (i < NY) & (j >= 0) & (j < NX)
    small = ok & (A[:, 2] <= 5000)
    G = np.zeros((NY, NX)); np.add.at(G, (i[small], j[small]), A[small, 2])
    # big buildings (> 5000 m2): spread footprint uniformly over a disk of equal area around the centroid
    x = np.asarray(x); y = np.asarray(y)
    for k in np.nonzero(ok & (A[:, 2] > 5000))[0]:
        r = np.sqrt(A[k, 2] / np.pi) / CELL
        rr = int(np.ceil(r)) + 1
        ii, jj = np.mgrid[i[k] - rr:i[k] + rr + 1, j[k] - rr:j[k] + rr + 1]
        cy_ = (y[k] - Y0) / CELL - 0.5; cx_ = (x[k] - X0) / CELL - 0.5
        m = ((ii - cy_) ** 2 + (jj - cx_) ** 2 <= max(r, 0.5) ** 2) & (ii >= 0) & (ii < NY) & (jj >= 0) & (jj < NX)
        if m.sum() == 0:
            G[i[k], j[k]] += A[k, 2]; continue
        G[ii[m], jj[m]] += A[k, 2] / m.sum()
    return G / (CELL * CELL)


def landuse_grid():
    """share of cell covered by landuse residential/commercial/retail (rasterised at 25 m sub-samples)."""
    from shapely import contains_xy
    S = np.zeros((NY, NX))
    sub = 4; off = (np.arange(sub) + 0.5) * CELL / sub
    for f in ("berlin", "brandenburg"):
        for kind, wkb in pickle.load(open(os.path.join(W, f + ".lu.pkl"), "rb")):
            if kind not in ("lu:residential", "lu:commercial", "lu:retail"):
                continue
            g = to_m(shapely.from_wkb(wkb))
            bx = g.bounds
            j0 = max(int((bx[0] - X0) / CELL), 0); j1 = min(int((bx[2] - X0) / CELL) + 1, NX)
            i0 = max(int((bx[1] - Y0) / CELL), 0); i1 = min(int((bx[3] - Y0) / CELL) + 1, NY)
            if j1 <= j0 or i1 <= i0: continue
            xs = (X0 + np.arange(j0, j1)[:, None] * CELL + off[None, :]).ravel()
            ys = (Y0 + np.arange(i0, i1)[:, None] * CELL + off[None, :]).ravel()
            XX, YY = np.meshgrid(xs, ys)
            inside = contains_xy(g, XX, YY).reshape(i1 - i0, sub, j1 - j0, sub).mean(axis=(1, 3))
            S[i0:i1, j0:j1] = np.maximum(S[i0:i1, j0:j1], inside)  # overlapping polygons: max (approx.)
    return S


def mask_to_polys(M, smooth=1.0):
    """smooth binary mask and contour at 0.5 -> shapely (multi)polygon in EPSG:25833."""
    F = ndimage.gaussian_filter(M.astype(float), smooth)
    xs = X0 + (np.arange(NX) + 0.5) * CELL; ys = Y0 + (np.arange(NY) + 0.5) * CELL
    cg = contourpy.contour_generator(xs, ys, F, fill_type=contourpy.FillType.OuterOffset)
    pts, offs = cg.filled(0.5, 10.0)
    polys = []
    for p, o in zip(pts, offs):
        rings = [p[o[k]:o[k + 1]] for k in range(len(o) - 1)]
        polys.append(Polygon(rings[0], rings[1:]))
    return shapely.make_valid(MultiPolygon(polys)) if len(polys) > 1 else polys[0]


def inner_city():
    if VAR == "lu":
        G = landuse_grid()
    else:
        G = coverage_grid()
    np.save(os.path.join(W, f"grid_{VAR}.npy"), G)
    K = disk(RAD / CELL); K /= K.sum()
    S = ndimage.convolve(G, K, mode="constant")
    np.save(os.path.join(W, f"smooth_{VAR}.npy"), S)
    M = S >= THR
    # closing to bridge narrow gaps (rivers, rail lines), opening to cut fringes
    M = ndimage.binary_closing(M, structure=disk(2), iterations=1)
    M = ndimage.binary_opening(M, structure=disk(OPEN_R / CELL), iterations=1)
    # component containing Alexanderplatz (else largest)
    lab, n = ndimage.label(M)
    ax, ay = fwd.transform(13.4132, 52.5219)
    li = lab[int((ay - Y0) / CELL), int((ax - X0) / CELL)]
    if li == 0:
        sizes = ndimage.sum(M, lab, range(1, n + 1)); li = int(np.argmax(sizes)) + 1
        print("WARNING: Alexanderplatz not in mask, using largest component")
    M = lab == li
    # explicit fill of the big inner-city open spaces (Tempelhofer Feld, Tiergarten): add the OSM leisure=park
    # polygon containing each seed point (rasterised at cell centres), then close/fill so it merges with the mask
    from shapely import contains_xy
    parks = [shapely.from_wkb(w) for k, w in pickle.load(open(os.path.join(W, "berlin.lu.pkl"), "rb")) if k in ("le:park", "lu:recreation_ground")]
    xs = X0 + (np.arange(NX) + 0.5) * CELL; ys = Y0 + (np.arange(NY) + 0.5) * CELL
    XX, YY = np.meshgrid(xs, ys)
    for nm, lo, la in SEEDS:
        pt = Point(lo, la)
        c = [g for g in parks if g.contains(pt)]
        if not c:
            print(f"seed '{nm}': no park polygon found"); continue
        g = to_m(max(c, key=lambda q: q.area)).buffer(100)
        add = contains_xy(g, XX, YY) & ~M
        M |= add
        print(f"seed '{nm}': park {g.area/1e6:.2f} km2 (incl. 100 m buffer), added {add.sum()*CELL*CELL/1e6:.2f} km2")
    # second closing at component level: fills narrow bays (rail yards, Gleisdreieck, small parks at the edge)
    M = ndimage.binary_closing(np.pad(M, 20), structure=disk(CLOSE2_R / CELL))[20:-20, 20:-20]
    # fill holes < HOLE_MAX
    hl, hn = ndimage.label(~M)
    hs = ndimage.sum(np.ones_like(M), hl, range(1, hn + 1)) * CELL * CELL
    border = set(np.unique(np.concatenate([hl[0], hl[-1], hl[:, 0], hl[:, -1]])))
    filled = []
    for k, s in enumerate(hs, 1):
        if k not in border and s < HOLE_MAX:
            M[hl == k] = True; filled.append(s)
    print(f"filled {len(filled)} holes, total {sum(filled)/1e6:.2f} km2, largest {max(filled, default=0)/1e6:.2f} km2")
    P = mask_to_polys(M, 1.0)
    if isinstance(P, MultiPolygon):
        P = max(P.geoms, key=lambda g: g.area)
    P = P.simplify(30)
    return P, M


def norm(s):
    s = unicodedata.normalize("NFC", s).lower()
    s = re.sub(r"\(.*?\)", "", s).replace(" bei berlin", "").replace("stadt ", "").replace("gemeinde ", "")
    return re.sub(r"[^a-zäöüß]", "", s)


UMLAND = {  # LEP HR 2019, Z 1.1 (GVBl. II 2019 Nr. 35, Anlage S. 16f.)
    "12054": ["Potsdam"],
    "12060": ["Ahrensfelde", "Bernau bei Berlin", "Panketal", "Wandlitz", "Werneuchen"],
    "12061": ["Eichwalde", "Königs Wusterhausen", "Mittenwalde", "Schönefeld", "Schulzendorf", "Wildau", "Zeuthen"],
    "12063": ["Brieselang", "Dallgow-Döberitz", "Falkensee", "Schönwalde-Glien", "Wustermark"],
    "12064": ["Altlandsberg", "Fredersdorf-Vogelsdorf", "Hoppegarten", "Neuenhagen bei Berlin", "Petershagen/Eggersdorf",
              "Rüdersdorf bei Berlin", "Strausberg"],
    "12065": ["Birkenwerder", "Glienicke/Nordbahn", "Hennigsdorf", "Hohen Neuendorf", "Leegebruch", "Mühlenbecker Land",
              "Oberkrämer", "Oranienburg", "Velten"],
    "12067": ["Erkner", "Gosen-Neu Zittau", "Grünheide (Mark)", "Schöneiche bei Berlin", "Woltersdorf"],
    "12069": ["Kleinmachnow", "Michendorf", "Nuthetal", "Schwielowsee", "Seddiner See", "Stahnsdorf", "Teltow", "Werder (Havel)"],
    "12072": ["Blankenfelde-Mahlow", "Großbeeren", "Ludwigsfelde", "Rangsdorf"],
}


def admin():
    be = [x for x in pickle.load(open(os.path.join(W, "berlin.adm.pkl"), "rb"))]
    bb = [x for x in pickle.load(open(os.path.join(W, "brandenburg.adm.pkl"), "rb"))]
    berlin = to_m(shapely.from_wkb(next(x for x in be if x["level"] == "4" and x["name"] == "Berlin")["wkb"]))
    ortsteile = {}
    for x in be:
        if x["level"] == "10" and x["name"] not in ortsteile:
            g = to_m(shapely.from_wkb(x["wkb"]))
            if g.representative_point().within(berlin):
                ortsteile[x["name"]] = g
    gem = [x for x in bb if x["level"] in ("6", "8") and x["ags"] and x["ags"].startswith("12")]
    matched, missing = [], []
    for kr, names in UMLAND.items():
        for nm in names:
            c = [x for x in gem if x["ags"].startswith(kr) and norm(x["name"] or "") == norm(nm)]
            c = {x["ags"]: x for x in c}
            if len(c) == 1:
                x = list(c.values())[0]; matched.append((nm, x["name"], x["ags"], x["level"], to_m(shapely.from_wkb(x["wkb"]))))
            else:
                missing.append((nm, kr, [x["name"] for x in c.values()]))
    return berlin, ortsteile, matched, missing


def rings_out(g, nd=5):
    g = to_ll(g)
    geoms = g.geoms if hasattr(g, "geoms") else [g]
    out = []
    for p in geoms:
        if p.geom_type != "Polygon" or p.is_empty: continue
        rr = [p.exterior] + list(p.interiors)
        out.append([[[round(x, nd), round(y, nd)] for x, y in r.coords] for r in rr])
    return out


LANDMARKS = [
    ("Alexanderplatz", 13.4132, 52.5219), ("Brandenburger Tor", 13.3777, 52.5163), ("Siegessäule/Tiergarten", 13.3502, 52.5145),
    ("Tempelhofer Feld", 13.4010, 52.4732), ("Leopoldplatz (Wedding)", 13.3594, 52.5466), ("Bf Gesundbrunnen", 13.3885, 52.5486),
    ("Kollwitzplatz", 13.4176, 52.5365), ("Alt-Pankow Kirche", 13.4040, 52.5693), ("Antonplatz (Weißensee)", 13.4550, 52.5520),
    ("Boxhagener Platz", 13.4600, 52.5108), ("Rathaus Lichtenberg", 13.4975, 52.5145), ("Kottbusser Tor", 13.4180, 52.4990),
    ("Hermannplatz", 13.4245, 52.4867), ("S Neukölln", 13.4428, 52.4693), ("Treptower Park", 13.4693, 52.4888),
    ("Nollendorfplatz", 13.3536, 52.4996), ("Rathaus Schöneberg", 13.3443, 52.4851), ("Breslauer Platz (Friedenau)", 13.3290, 52.4710),
    ("Rathaus Steglitz/Schloßstr.", 13.3209, 52.4565), ("Alt-Tempelhof", 13.3858, 52.4658), ("Bahnhof Zoo", 13.3326, 52.5070),
    ("Adenauerplatz", 13.3070, 52.5000), ("Fehrbelliner Platz", 13.3143, 52.4900), ("Schloss Charlottenburg", 13.2958, 52.5208),
    ("Messe/ICC", 13.2790, 52.5040), ("Turmstraße (Moabit)", 13.3418, 52.5258), ("Spandau Altstadt", 13.2003, 52.5370),
    ("Schöneweide", 13.5100, 52.4550),
    ("Köpenick Altstadt", 13.5770, 52.4440), ("Marzahn (Helene-Weigel-Pl.)", 13.5450, 52.5450),
]


def main():
    P, M = inner_city()
    berlin, ortsteile, matched, missing = admin()
    um = shapely.union_all([m[4] for m in matched] + [berlin]).buffer(5).buffer(-5)
    if isinstance(um, MultiPolygon):
        print("umland union parts:", [round(g.area / 1e6, 2) for g in um.geoms])
        um = max(um.geoms, key=lambda g: g.area)
    um = Polygon(um.exterior).simplify(50)
    bsimp = berlin.simplify(30)
    if isinstance(bsimp, MultiPolygon):
        print("berlin parts (km2):", [round(g.area / 1e6, 3) for g in bsimp.geoms], "-> dropping slivers < 0.05 km2")
        parts = [g for g in bsimp.geoms if g.area >= 5e4]
        bsimp = parts[0] if len(parts) == 1 else MultiPolygon(parts)
    if bsimp.geom_type == "Polygon":  # drop sliver holes (OSM boundary artefacts) < 0.05 km2
        print("berlin holes (m2):", [round(Polygon(r).area) for r in bsimp.interiors])
        bsimp = Polygon(bsimp.exterior, [r for r in bsimp.interiors if Polygon(r).area >= 5e4])
    print(f"\nVARIANT {VAR} threshold {THR} radius {RAD} m")
    print(f"inner area {P.area/1e6:.1f} km2 (holes {len(P.interiors)}), berlin {berlin.area/1e6:.1f} km2, "
          f"berlin+umland {um.area/1e6:.1f} km2 (umland only {(um.area-berlin.area)/1e6:.1f})")
    print(f"umland: matched {len(matched)}/51; missing: {missing}")
    for m in matched:
        print(f"   {m[0]:28s} -> {m[1]} ags {m[2]} lvl {m[3]} {m[4].area/1e6:.1f} km2")
    print("\nlandmarks:")
    for nm, lo, la in LANDMARKS:
        print(f"  {'IN ' if P.contains(Point(*fwd.transform(lo, la))) else 'out'}  {nm}")
    print("\nOrtsteile share inside inner (>=5%):")
    rows = sorted(((P.intersection(g).area / g.area, n) for n, g in ortsteile.items()), reverse=True)
    for s, n in rows:
        if s >= 0.05: print(f"  {s*100:5.1f}%  {n}")
    out = {"inner": rings_out(P), "berlin": rings_out(bsimp), "umland": rings_out(um)}
    tag = "" if VAR == "bld" else "_" + VAR
    fn = os.path.join(H, "data", f"zones{tag}.json") if len(sys.argv) <= 4 else os.path.join(W, sys.argv[4])
    json.dump(out, open(fn, "w"), separators=(",", ":"))
    print(f"\nwrote {fn} {os.path.getsize(fn)/1e3:.0f} KB; points inner {sum(len(r) for p in out['inner'] for r in p)}, "
          f"berlin {sum(len(r) for p in out['berlin'] for r in p)}, umland {sum(len(r) for p in out['umland'] for r in p)}")
    pickle.dump(dict(inner=P, berlin=berlin, umland=um, ortsteile=ortsteile), open(os.path.join(W, f"geoms{tag}.pkl"), "wb"))


if __name__ == "__main__":
    main()
