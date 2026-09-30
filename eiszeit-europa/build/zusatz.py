"""Zusaetze zur Karte, nach quellen.py:

    python3 zusatz.py            # -> zwischen/zusatz.json, polder.u8, berg_ela.i16, berg_zc.i16

Drei Dinge, die die Karte vorher nicht hatte, und alle drei aus dem Film, der aus
dieser Seite entstanden ist (Reddit-Hinweis und eigene Durchsicht, 30.09.2026):

  1. BRITICE-CHRONO (Clark u. a. 2022) fuer das britisch-irische Eis.
     DATED-1 (2016) ist dort ueberholt: BRITICE-CHRONO setzt das Maximum bei
     26-25 ka, einen Eislappen in die suedliche Irische See und die Celtic Sea,
     Cornwall und Devon eisfrei. Die Raender (optimum, max, min) gehen als
     zweiter Satz neben DATED-1 in die Seite; in einem festen Gebiet um die
     Britischen Inseln (REGION) zeichnet die Seite BRITICE, sonst DATED-1.
  2. Polder und Marschen. Das moderne DEM hat eingedeichtes Land unter null;
     die Karte zeichnete die Niederlande "heute" deshalb teils als Meer. Maske
     aus Natural Earth 1:10m (Land ohne Seen) mal DEM < 0.
  3. Gebirgsgletscher ausserhalb der Eisschilde. ICE-6G_C hat ueber Pyrenaeen,
     Alpen, Karpaten, Balkan, Apennin und Kaukasus kein Eis. Eine Schaetzung
     ueber die Schneegrenze (ELA): LGM-Werte je Gebirge aus der Literatur,
     raeumlich weich verteilt; die Seite verschiebt sie mit der Temperatur.
     Ausdruecklich eine Schaetzung und auf der Seite als solche benannt.

Rohdaten (siehe DATEN.md): data/raw/britice/, data/raw/ne/.
Pakete: numpy, scipy, pyshp, pyproj, pillow.
"""
import json
import math
import re
import sys
from pathlib import Path

import numpy as np
import shapefile
from PIL import Image, ImageDraw
from pyproj import CRS, Transformer
from scipy.ndimage import gaussian_filter, maximum_filter

import quellen as Q

HIER = Path(__file__).resolve().parent
ROH = Q.ROH
ZW = Q.ZWISCHEN
log = lambda s: print(s, file=sys.stderr)

meta = json.loads((ZW / "meta.json").read_text(encoding="utf8"))
g = meta["gitter"]
GW, GH = g["w"], g["h"]


def ins_gitter(lon, lat):
    x, y = Q.vor(np.asarray(lon, float), np.asarray(lat, float))
    return (x - g["x0"]) / g["schritt"], (g["y1"] - y) / g["schritt"]


def zellmitten_lonlat():
    gx = g["x0"] + (np.arange(GW) + 0.5) * g["schritt"]
    gy = g["y1"] - (np.arange(GH) + 0.5) * g["schritt"]
    X, Y = np.meshgrid(gx, gy)
    return Q.zurueck(X, Y)


def douglas_peucker(p, eps):
    """p: (n,2). Iterativ, damit lange Ringe nicht an der Rekursionstiefe scheitern."""
    n = len(p)
    if n < 3:
        return p
    behalten = np.zeros(n, bool)
    behalten[0] = behalten[-1] = True
    stapel = [(0, n - 1)]
    while stapel:
        a, b = stapel.pop()
        if b <= a + 1:
            continue
        seg = p[b] - p[a]
        L = math.hypot(*seg)
        d = p[a + 1:b] - p[a]
        dist = np.abs(d[:, 0] * seg[1] - d[:, 1] * seg[0]) / L if L > 0 else np.hypot(d[:, 0], d[:, 1])
        i = int(np.argmax(dist))
        if dist[i] > eps:
            m = a + 1 + i
            behalten[m] = True
            stapel += [(a, m), (m, b)]
    return p[behalten]


def rechteck_clip(ring, x0, y0, x1, y1):
    """Sutherland-Hodgman gegen ein achsenparalleles Rechteck (Ring geschlossen gedacht)."""
    def schnitt(p, q, achse, wert):
        t = (wert - p[achse]) / (q[achse] - p[achse])
        return (p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1]))
    pts = [tuple(v) for v in ring]
    for achse, wert, innen in ((0, x0, lambda v: v[0] >= x0), (0, x1, lambda v: v[0] <= x1),
                               (1, y0, lambda v: v[1] >= y0), (1, y1, lambda v: v[1] <= y1)):
        if not pts:
            break
        neu = []
        for i, cur in enumerate(pts):
            prev = pts[i - 1]
            if innen(cur):
                if not innen(prev):
                    neu.append(schnitt(prev, cur, achse, wert))
                neu.append(cur)
            elif innen(prev):
                neu.append(schnitt(prev, cur, achse, wert))
        pts = neu
    return pts


# =============================================================== 1. BRITICE
# Das Gebiet, in dem BRITICE-CHRONO statt DATED-1 gezeichnet wird: Britische
# Inseln, Irische See, Celtic Sea und die westliche Nordsee bis 3,5 Grad Ost.
# Eine feste Linie und keine Ueberblendung: zwei Rekonstruktionen, die man
# mischt, ergeben eine dritte, die niemand aufgestellt hat. Die Naht liegt in
# der Nordsee, wo britisches und skandinavisches Eis zusammenstiessen und beide
# Quellen am unsichersten sind (Clark u. a. 2022, Abschnitt 6).
REGION_LONLAT = [(-13.0, 48.3), (-1.5, 48.3), (1.8, 50.6), (3.5, 51.8), (3.5, 61.6), (-13.0, 61.6)]


def region_gitter():
    pts = []
    for (a, b), (c, d) in zip(REGION_LONLAT, REGION_LONLAT[1:] + REGION_LONLAT[:1]):
        for t in np.linspace(0, 1, 40, endpoint=False):
            pts.append((a + t * (c - a), b + t * (d - b)))
    lo, la = np.array(pts).T
    gx, gy = ins_gitter(lo, la)
    return np.stack([gx, gy], 1)


def lies_britice(region):
    basis = next((ROH / "britice").glob("*empirical*"), None)
    if basis is None:
        log("  BRITICE-CHRONO fehlt unter data/raw/britice/ -> ohne")
        return {}
    ordner = {"mc": "Optimum", "max": "max", "min": "min"}
    x0, y0 = region[:, 0].min() - 6, region[:, 1].min() - 6
    x1, y1 = region[:, 0].max() + 6, region[:, 1].max() + 6
    aus = {}
    for sorte, name in ordner.items():
        for shp in sorted((basis / name).glob("*.shp")):
            m = re.match(r"(\d+)_?ka", shp.name)
            if not m:
                continue
            ka = int(m.group(1))
            if ka > 26:
                continue                      # die Karte beginnt bei 26 ka
            tr = Transformer.from_crs(CRS.from_wkt(shp.with_suffix(".prj").read_text()), "EPSG:4326", always_xy=True)
            linien = []
            for s in shapefile.Reader(str(shp)).shapes():
                punkte = np.array(s.points)
                teile = list(s.parts) + [len(punkte)]
                for a, b in zip(teile[:-1], teile[1:]):
                    if b - a < 3:
                        continue
                    lo, la = tr.transform(punkte[a:b, 0], punkte[a:b, 1])
                    gx, gy = ins_gitter(lo, la)
                    ring = rechteck_clip(np.stack([gx, gy], 1), x0, y0, x1, y1)
                    if len(ring) < 3:
                        continue
                    ring = douglas_peucker(np.array(ring + [ring[0]]), 0.3)
                    if len(ring) >= 4:
                        linien.append([[round(float(x), 2), round(float(y), 2)] for x, y in ring])
            aus.setdefault(str(ka), {})[sorte] = linien
    for ka in sorted(aus, key=int):
        log(f"  BRITICE {ka:>2} ka  " + "  ".join(f"{s} {sum(len(l) for l in aus[ka].get(s, []))} Pkt"
                                                  for s in ("mc", "max", "min")))
    return aus


# ================================================================ 2. Polder
def raster_ringe(pfad):
    acc = np.zeros((GH, GW), bool)
    for s in shapefile.Reader(str(pfad)).shapes():
        x0, y0, x1, y1 = s.bbox
        if x1 < -30 or x0 > 60 or y1 < 30 or y0 > 75:
            continue
        pts = np.array(s.points)
        teile = list(s.parts) + [len(pts)]
        for a, b in zip(teile[:-1], teile[1:]):
            if b - a < 3:
                continue
            gx, gy = ins_gitter(pts[a:b, 0], pts[a:b, 1])
            img = Image.new("1", (GW, GH), 0)
            ImageDraw.Draw(img).polygon(list(zip(gx.tolist(), gy.tolist())), fill=1)
            acc ^= np.array(img, dtype=bool)          # gerade-ungerade: Innenringe sparen aus
    return acc


def polder(dem):
    land_p = next((ROH / "ne").rglob("ne_10m_land.shp"), None)
    seen_p = next((ROH / "ne").rglob("ne_10m_lakes.shp"), None)
    if land_p is None or seen_p is None:
        log("  Natural Earth fehlt unter data/raw/ne/ -> keine Polder")
        return np.zeros((GH, GW), np.uint8)
    land, seen = raster_ringe(land_p), raster_ringe(seen_p)
    q = np.round(dem / 10.0)                          # so, wie die Seite das DEM bekommt (10 m je Stufe)
    m = land & ~seen & (q < 0) & (dem > -15)
    log(f"  Polder: {int(m.sum())} Zellen unter null, die laut Natural Earth Land sind")
    return m.astype(np.uint8)


# ======================================================= 3. Gebirgsgletscher
# LGM-Gleichgewichtslinien (m) je Gebirge, gerundet. Quellen u. a.: Hughes &
# Woodward 2017 (Mittelmeergebirge), Oliva u. a. 2019 (Iberien), Ehlers u. a.
# 2011 (Uebersicht), Ivy-Ochs 2015 (Alpen). Dinariden, Griechenland und
# Anatolien bewusst hoch: dort waren die grossen Vergletscherungen aelter
# (MIS 12/6), im LGM (MIS 2) nur Kar- und Talgletscher.
STUETZ = [
    ("Kantabrisches Geb. W", -6.3, 43.0, 1500), ("Picos de Europa", -4.8, 43.2, 1550),
    ("Sanabria", -6.7, 42.1, 1700), ("Sistema Iberico", -3.0, 42.1, 1850),
    ("Gredos", -5.2, 40.25, 1850), ("Guadarrama", -3.95, 40.8, 1950), ("Sierra Nevada", -3.3, 37.05, 2500),
    ("Pyrenaeen W", -0.6, 42.85, 1700), ("Pyrenaeen Mitte", 0.6, 42.65, 1800), ("Pyrenaeen O", 2.0, 42.5, 2000),
    ("Zentralmassiv", 2.8, 45.2, 1150), ("Vogesen", 7.0, 47.9, 900), ("Schwarzwald", 8.05, 47.9, 1000),
    ("Bayerischer Wald", 13.4, 49.0, 1100), ("Riesengebirge", 15.6, 50.75, 1200),
    ("Alpen W", 6.6, 45.4, 1500), ("Alpen N", 8.3, 46.7, 1200), ("Alpen S", 9.8, 46.2, 1500),
    ("Alpen O", 12.5, 47.2, 1300), ("Julische Alpen", 13.8, 46.35, 1350),
    ("Korsika", 9.0, 42.2, 1600), ("Apennin N", 10.3, 44.2, 1500), ("Apennin Mitte", 13.6, 42.45, 1800),
    ("Apennin S", 16.2, 39.9, 1950),
    ("Tatra", 20.0, 49.2, 1550), ("Karpaten O", 24.7, 47.55, 1700),
    ("Fagaras", 24.7, 45.6, 1850), ("Retezat", 22.85, 45.35, 1800),
    ("Velebit", 15.2, 44.5, 1500), ("Orjen", 18.55, 42.55, 1650), ("Durmitor", 19.0, 43.15, 1900),
    ("Prokletije", 19.8, 42.5, 1850), ("Sar/Korab", 20.8, 42.0, 2000),
    ("Rila", 23.5, 42.15, 2300), ("Pirin", 23.4, 41.75, 2350),
    ("Pindos", 20.9, 40.1, 2150), ("Olymp", 22.35, 40.1, 2350),
    ("Uludag", 29.2, 40.07, 2100), ("Kackar", 41.2, 40.8, 3000),
    ("Kaukasus W", 41.5, 43.4, 2700), ("Kaukasus Mitte", 43.0, 43.0, 3000),
]
BERG = dict(delta=1200.0, k=0.45, hmax=450.0, zunge=500.0, rampe=400.0, kaeltenorm=7.4)


def gebirge(dem):
    lon, lat = zellmitten_lonlat()
    x, y = Q.vor(lon, lat)
    num = np.zeros((GH, GW)); den = np.zeros((GH, GW)); naechst = np.full((GH, GW), 1e9)
    for _, lo, la, ela in STUETZ:
        sx, sy = Q.vor(np.array(lo), np.array(la))
        d = np.hypot(x - sx, y - sy)
        w = np.exp(-0.5 * (d / 120.0) ** 2) + 1e-12
        num += w * ela; den += w
        naechst = np.minimum(naechst, d)
    ela = num / den
    # Einzugshoehe: hoechster Punkt im Umkreis von ~18 km, geglaettet. Ein
    # Talgletscher wird von den Hoehen um ihn herum gespeist, nicht von der
    # Hoehe seiner Zunge.
    zc = gaussian_filter(maximum_filter(dem.astype(np.float32), size=3), 0.75)
    moeglich = (naechst <= 250) & (zc > ela) & (dem > 0)
    ela_i = np.where(moeglich, np.round(ela), 0).astype(np.int16)
    zc_i = np.where(moeglich, np.round(zc), 0).astype(np.int16)
    log(f"  Gebirgsgletscher: {int(moeglich.sum())} Zellen koennen im LGM vergletschern "
        f"({len(STUETZ)} Stuetzpunkte)")
    return ela_i, zc_i


def main():
    dem = np.fromfile(ZW / "dem.i16", np.int16).reshape(GH, GW).astype(np.float32)
    log("BRITICE-CHRONO")
    region = region_gitter()
    brit = lies_britice(region)
    log("Polder")
    pm = polder(dem)
    log("Gebirgsgletscher")
    ela, zc = gebirge(dem)
    pm.tofile(ZW / "polder.u8")
    ela.tofile(ZW / "berg_ela.i16")
    zc.tofile(ZW / "berg_zc.i16")
    (ZW / "zusatz.json").write_text(json.dumps(dict(
        region=[[round(float(a), 2), round(float(b), 2)] for a, b in region],
        region_lonlat=REGION_LONLAT,
        britice=brit,
        berg=BERG,
        berg_stuetz=STUETZ,
    )), encoding="utf8")
    log(f"geschrieben nach {ZW}")


if __name__ == "__main__":
    main()
