#!/usr/bin/env python3
"""Liest die drei Rohdatensaetze und schreibt die Zwischendateien fuer build.mjs.

    pip install numpy netCDF4 pyshp
    python3 quellen.py

Was hier geschieht, ist Schritt 3 und 4 der Aufgabe, und zwar genau in der
Reihenfolge, in der es dort steht:

  1. Das moderne DEM (15 Bogensekunden) wird auf das Zielgitter der Seite
     heruntergerechnet — flaechentreu projiziert, nicht in Laenge und Breite.
  2. ICE-6G_C liefert nur das **Differenzfeld** Topo_Diff und die
     Eismaechtigkeit stgit, beide auf ihrem groben 10'-Gitter. Sie werden
     **nicht** hier hochgerechnet: das tut die Seite, bikubisch, weil sie
     zwischen den Zeitscheiben ohnehin interpolieren muss.
  3. **Topo_Diff enthaelt das Eis.** Das steht so in keiner Beschreibung der
     Dateien und ist am ersten Lauf mit echten Daten gemessen worden (Probe 1b
     weiter unten): ICE-6G_Cs `Topo` ist die Hoehe der *Oberflaeche* — Fels,
     wo keiner liegt, Eisoberflaeche, wo Eis aufliegt. Ueber dem Bottnischen
     Meerbusen steht bei 21 ka Topo_Diff = +1845 m bei 2374 m Eis; das ist
     nicht die Kruste, die sich hebt, sondern das Eis, das obendrauf liegt.

     Daraus folgt die Rechnung, und sie ist eine andere als die naheliegende:

         Oberflaeche(t) = DEM + Topo_Diff(t)          <- inklusive Eis
         Fels(t)        = Oberflaeche(t) - stgit(t)

     Die Aufgabe schreibt „Paläotopographie(t) = DEM + Topo_Diff(t)" und meint
     damit den Fels. Das Ziel ist uebernommen, die Formel korrigiert: waere sie
     woertlich genommen, stuende das Skandinavische Gebirge bei 21 ka als 2000 m
     hoher **Fels** in der Karte und das Eis noch einmal 2400 m darueber.

Die Kuestenlinie faellt aus der Nulllinie dieser Rechnung, nicht aus sftlf —
siehe ../QUELLEN.md, Abschnitt 3.

Geschrieben wird nach zwischen/:

    meta.json        Gitter, Zeitscheiben, Meeresspiegel, Kennzahlen
    dem.i16          Zielgitter, Meter, int16
    topodiff.i16     48 x (10'-Fensterausschnitt), Meter, int16
    stgit.u16        dito, Eismaechtigkeit in Metern
    dated.json       die drei Linien je Zeitscheibe, in Gitterkoordinaten
"""

import json
import math
import re
import os
import sys
from pathlib import Path

import numpy as np

HIER = Path(__file__).resolve().parent
# ROH laesst sich umbiegen — das braucht das Pruefgeruest, das dieselben
# Dateiformate mit erfundenem Inhalt erzeugt, um die Kette zu pruefen. Es
# schreibt nach build/pruefgeruest-roh/ und niemals nach data/raw/, damit sich
# erfundenes Gelaende und echtes nie im selben Ordner treffen koennen.
ROH = Path(os.environ.get("ROH") or (HIER / ".." / "data" / "raw"))
ZWISCHEN = Path(os.environ.get("ZWISCHEN") or (HIER / "zwischen"))

# --------------------------------------------------------------- Ausschnitt
# Die Vorgabe der Aufgabe, unveraendert.
LON0, LON1 = -12.0, 45.0
LAT0, LAT1 = 34.0, 72.0
# Mitte der Projektion. 53 N / 15 O liegt im Schwerpunkt des Ausschnitts und
# damit dort, wo die Verzerrung am kleinsten ist — mitten im skandinavischen
# Eisschild, um den es geht.
MLON, MLAT = 15.0, 53.0
ERDR = 6371.0088  # km, Radius der flaechengleichen Kugel

# 760 Zellen Breite, und die Zahl ist gemessen, nicht gegriffen: die Buehne ist
# auf 900 Bildpunkte gedeckelt, das Reliefgitter liegt bei 55 Prozent davon,
# also bei rund 460. 760 ist damit gut anderthalbfach ueberabgetastet — mehr
# waere Nutzlast ohne Bild, denn der Zoom ist ein Vergroesserungsglas und kein
# neues Rechnen. Die Messreihe steht in ../METHODIK.md, Abschnitt 9.
BREITE = int(os.environ.get("BREITE", "760"))

log = lambda s: print(s, file=sys.stderr)


# ============================================================ Projektion
# Lambert azimutal flaechentreu — dieselbe Familie wie in der Vorlage
# (build/geometrie.mjs dort), nur auf diesen Ausschnitt gesetzt. Gerechnet auf
# der Kugel: der Unterschied zum Ellipsoid liegt bei wenigen hundert Metern und
# damit weit unter einer Gitterzelle.
def vor(lon, lat):
    """lon/lat in Grad -> x/y in km. Vektorisiert."""
    l = np.radians(lon - MLON)
    p = np.radians(lat)
    p0 = math.radians(MLAT)
    nenner = 1.0 + math.sin(p0) * np.sin(p) + math.cos(p0) * np.cos(p) * np.cos(l)
    nenner = np.maximum(nenner, 1e-12)
    k = np.sqrt(2.0 / nenner)
    x = ERDR * k * np.cos(p) * np.sin(l)
    y = ERDR * k * (math.cos(p0) * np.sin(p) - math.sin(p0) * np.cos(p) * np.cos(l))
    return x, y


def zurueck(x, y):
    """x/y in km -> lon/lat in Grad. Vektorisiert."""
    p0 = math.radians(MLAT)
    rho = np.sqrt(x * x + y * y) / ERDR
    rho = np.maximum(rho, 1e-12)
    c = 2.0 * np.arcsin(np.clip(rho / 2.0, -1.0, 1.0))
    sc, cc = np.sin(c), np.cos(c)
    lat = np.degrees(np.arcsin(np.clip(cc * math.sin(p0) + (y / ERDR) * sc * math.cos(p0) / rho, -1, 1)))
    lon = MLON + np.degrees(np.arctan2(
        (x / ERDR) * sc,
        rho * math.cos(p0) * cc - (y / ERDR) * math.sin(p0) * sc))
    return lon, lat


def gitter():
    """Der Rahmen des Ausschnitts im projizierten Mass, und daraus das Gitter.

    Der Rand wird dicht abgetastet statt nur an den vier Ecken: in einer
    azimutalen Projektion ist die Bildkante eines Laengen-Breiten-Rechtecks
    gekruemmt, und die Ecken sind nicht die Extrempunkte.

    Dass dabei rund ein Drittel des Rechtecks ausserhalb des Fensters liegt, ist
    nicht die Schuld dieser Projektion, sondern die Form des Fensters: 38 Grad
    Breite auf 57 Grad Laenge lassen sich flaechentreu nicht in ein Rechteck
    legen. Nachgemessen, Anteil des Rechtecks innerhalb des Fensters:

        Lambert azimutal 53 N 15 O        68,8 %
        Lambert azimutal 52 N 10 O        67,9 %   (EPSG:3035)
        Albers 43/65                      67,5 %
        Albers 45/62                      67,8 %

    Also bleibt es bei der azimutalen — derselben Familie wie in der Vorlage —
    und der Rest wird **maskiert** statt gefuellt. Das ist die Machart des
    Vorlagenprojekts: draussen ist die Leinwand durchsichtig, und die Karte
    steht als Form auf schwarzem Grund. Ein Atlasblatt mit gebogenen Breiten-
    kreisen sieht ohnehin richtiger aus als ein beschnittenes Rechteck.

    Bezahlt wird dafuer nichts: das DEM wird zeilenweise nur ueber seinen
    gueltigen Abschnitt kodiert (siehe nutzlast.mjs).
    """
    rl = np.linspace(LON0, LON1, 400)
    rb = np.linspace(LAT0, LAT1, 400)
    lons = np.concatenate([rl, rl, np.full(400, LON0), np.full(400, LON1)])
    lats = np.concatenate([np.full(400, LAT0), np.full(400, LAT1), rb, rb])
    x, y = vor(lons, lats)
    x0, x1, y0, y1 = float(x.min()), float(x.max()), float(y.min()), float(y.max())
    schritt = (x1 - x0) / BREITE
    hoehe = int(round((y1 - y0) / schritt))
    # y1 ist die **Oberkante**, und die Zeilen laufen von dort nach unten:
    # die Leinwand zaehlt y nach unten, die Projektion nach Norden. Beim ersten
    # Bau stand Skandinavien deshalb am unteren Bildrand und das Mittelmeer oben.
    # Der Dreh gehoert hierher und nicht in die Seite — dann stimmen Gitter,
    # DATED-Linien und Kennzahlen von selbst miteinander ueberein.
    return dict(x0=x0, y0=y0, y1=y1, schritt=schritt, w=BREITE, h=hoehe)


# ====================================================== Bikubisch, Catmull-Rom
# Von Hand statt per scipy: es sind zwanzig Zeilen, und die Regel des Repos
# ist, keine Abhaengigkeit zu ziehen, die sich in zwanzig Zeilen schreiben
# laesst. Catmull-Rom geht durch jeden Stuetzpunkt — das ist hier wichtig,
# denn auf den Gitterpunkten von ICE-6G_C soll genau der Wert stehen, der dort
# steht, und nicht ein geglaetteter.
def _cr(t):
    t2, t3 = t * t, t * t * t
    return (
        -0.5 * t3 + t2 - 0.5 * t,
        1.5 * t3 - 2.5 * t2 + 1.0,
        -1.5 * t3 + 2.0 * t2 + 0.5 * t,
        0.5 * t3 - 0.5 * t2,
    )


def bikubisch(feld, fx, fy):
    """feld[y,x], gebrochene Indizes fx/fy (gleiche Form) -> Werte."""
    h, w = feld.shape
    ix = np.floor(fx).astype(np.int64)
    iy = np.floor(fy).astype(np.int64)
    tx, ty = fx - ix, fy - iy
    wx, wy = _cr(tx), _cr(ty)
    out = np.zeros(fx.shape, dtype=np.float64)
    for m in range(4):
        yy = np.clip(iy - 1 + m, 0, h - 1)
        reihe = np.zeros(fx.shape, dtype=np.float64)
        for n in range(4):
            xx = np.clip(ix - 1 + n, 0, w - 1)
            reihe += wx[n] * feld[yy, xx]
        out += wy[m] * reihe
    return out


def bilinear(feld, fx, fy):
    h, w = feld.shape
    ix = np.clip(np.floor(fx).astype(np.int64), 0, w - 2)
    iy = np.clip(np.floor(fy).astype(np.int64), 0, h - 2)
    tx = np.clip(fx - ix, 0, 1)
    ty = np.clip(fy - iy, 0, 1)
    return ((feld[iy, ix] * (1 - tx) + feld[iy, ix + 1] * tx) * (1 - ty)
            + (feld[iy + 1, ix] * (1 - tx) + feld[iy + 1, ix + 1] * tx) * ty)


# ================================================================ NetCDF
def oeffne(pfad):
    from netCDF4 import Dataset
    return Dataset(str(pfad), "r")


def erste(ds, *namen):
    """Die erste Variable, die es gibt. ICE-6G_C und die DEMs sind sich in der
    Benennung nicht einig, und ein Bau, der an einem Grossbuchstaben scheitert,
    hilft niemandem."""
    for n in namen:
        for k in ds.variables:
            if k.lower() == n.lower():
                return ds.variables[k]
    raise KeyError("keine von " + ", ".join(namen) + " in " + str(list(ds.variables)))


def achsen(ds):
    lon = erste(ds, "lon", "longitude", "x")[:]
    lat = erste(ds, "lat", "latitude", "y")[:]
    return np.asarray(lon, dtype=np.float64), np.asarray(lat, dtype=np.float64)


# ============================================================= (c) Das DEM
def dem_datei():
    kandidaten = sorted(list((ROH / "dem").glob("*.nc")))
    if not kandidaten:
        raise SystemExit(
            "Kein DEM unter data/raw/dem/. Erst build/holen.sh laufen lassen —\n"
            "und falls das an der Netzpolitik scheitert, siehe ../QUELLEN.md.")
    return kandidaten


def huelle(g):
    """Die gezeichnete Flaeche, und zwar **vor** dem DEM.

    Erst das Fenster, dann zeilenweise aufgefuellt. Die Reihenfolge ist keine
    Geschmackssache: das DEM muss ueber der Huelle gelesen werden, nicht ueber
    dem Fenster, und die Huelle greift oben bis 73,7 N — anderthalb Grad ueber
    den Fensterrand. Zuerst stand es andersherum, und dann fehlte dem DEM
    genau dieser Saum: 4 196 Zellen, in denen Meereshoehe gestanden haette,
    wo nichts gemessen ist.
    """
    x = g["x0"] + (np.arange(g["w"]) + 0.5) * g["schritt"]
    y = g["y1"] - (np.arange(g["h"]) + 0.5) * g["schritt"]
    X, Y = np.meshgrid(x, y)
    ZLON, ZLAT = zurueck(X, Y)
    im_fenster = (ZLON >= LON0) & (ZLON <= LON1) & (ZLAT >= LAT0) & (ZLAT <= LAT1)
    maske = np.zeros_like(im_fenster)
    for j in range(im_fenster.shape[0]):
        r = np.nonzero(im_fenster[j])[0]
        if r.size:
            maske[j, r[0]:r[-1] + 1] = True
    saum = int(maske.sum() - im_fenster.sum())
    log(f"  Maske {int(maske.sum())} von {maske.size} Zellen ({100*maske.mean():.1f} % "
        f"des Rechtecks), davon {saum} Saum ausserhalb des Fensters "
        f"({100*saum/max(1,int(maske.sum())):.1f} %)")
    if saum:
        log(f"  Saum reicht bis lat {ZLAT[maske & ~im_fenster].max():.2f}, "
            f"lon {ZLON[maske & ~im_fenster].min():.2f} … "
            f"{ZLON[maske & ~im_fenster].max():.2f}")
    return ZLON, ZLAT, maske, im_fenster


def lies_dem(g, ZLON, ZLAT, maske):
    """Das 15"-DEM auf das Zielgitter.

    Zwei Schritte, und der erste ist der, ohne den es rauscht: erst wird das
    Quellgitter **blockweise gemittelt**, bis seine Zelle ungefaehr so gross ist
    wie eine Zielzelle, dann erst wird abgetastet. Punktweise abgetastet ergaebe
    bei 15" auf 6,8 km ein Zweihundertfuenfundzwanzigstel der Werte und der Rest
    waere Rauschen — und genau die Alpen, um die es geht, bestehen aus dem, was
    dabei wegfiele.

    **Gemittelt wird ueber alle Kacheln gemeinsam**, auf einem Gitter, das am
    globalen Quellraster ausgerichtet ist. Das ist der Unterschied, der zaehlt:
    beim ersten Lauf wurde jede Kachel fuer sich gemittelt und danach abgetastet,
    und weil der Block einer Kachel nicht an ihrer Kante aufgeht, blieb an jeder
    Naht eine Zeile ohne Wert stehen — 2 872 Zellen, 0,84 Prozent, als feine
    Linien quer durch die Karte. Eine Naht, die niemand gezeichnet hat, ist
    genau das, was diese Karte nicht haben darf.

    Gelesen wird in Streifen: der Fensterausschnitt bei 15" ist ueber 120
    Millionen Werte und passt nicht als Ganzes in den Speicher.
    """
    dateien = dem_datei()
    blo0, blo1 = float(ZLON[maske].min()), float(ZLON[maske].max())
    bla0, bla1 = float(ZLAT[maske].min()), float(ZLAT[maske].max())
    log(f"  gebraucht wird lon {blo0:.2f} … {blo1:.2f}, lat {bla0:.2f} … {bla1:.2f}")

    # Aufloesung und Blockfaktor aus der ersten Datei; alle Kacheln eines
    # Datensatzes teilen dasselbe Raster.
    ds = oeffne(dateien[0])
    lon0, lat0 = achsen(ds)
    dlon = abs(float(lon0[1] - lon0[0]))
    dlat = abs(float(lat0[1] - lat0[0]))
    ds.close()
    zielgrad = g["schritt"] / (ERDR * math.pi / 180.0)
    fx = max(1, int(zielgrad / dlon))
    fy = max(1, int(zielgrad / dlat))

    # Ein globales Grobgitter, an -180/-90 ausgerichtet. Nur der gebrauchte
    # Ausschnitt davon wird angelegt.
    rand = 2
    cx0 = int(math.floor((blo0 + 180.0) / (dlon * fx))) - rand
    cx1 = int(math.ceil((blo1 + 180.0) / (dlon * fx))) + rand
    cy0 = int(math.floor((bla0 + 90.0) / (dlat * fy))) - rand
    cy1 = int(math.ceil((bla1 + 90.0) / (dlat * fy))) + rand
    NC, NR = cx1 - cx0, cy1 - cy0
    log(f"  Quellraster {dlon*3600:.0f}\", Block {fx}x{fy} -> Grobgitter {NC} x {NR}")

    summe = np.zeros(NR * NC, dtype=np.float64)
    zahl = np.zeros(NR * NC, dtype=np.float64)

    for pfad in dateien:
        ds = oeffne(pfad)
        try:
            lon, lat = achsen(ds)
            var = erste(ds, "elevation", "z", "Band1", "bed", "topo", "elev")
            ilon = np.where((lon >= blo0 - 0.3) & (lon <= blo1 + 0.3))[0]
            ilat = np.where((lat >= bla0 - 0.3) & (lat <= bla1 + 0.3))[0]
            if ilon.size == 0 or ilat.size == 0:
                ds.close(); continue
            xa, xb = int(ilon[0]), int(ilon[-1]) + 1
            ya, yb = int(ilat[0]), int(ilat[-1]) + 1

            # Grobspalte je Quellspalte, einmal gerechnet.
            gx = np.floor((lon[xa:xb] + 180.0) / (dlon * fx)).astype(np.int64) - cx0
            gueltigx = (gx >= 0) & (gx < NC)
            gx = gx[gueltigx]

            streifen = max(1, 3_000_000 // max(1, xb - xa))
            for j0 in range(ya, yb, streifen):
                j1 = min(yb, j0 + streifen)
                gy = np.floor((lat[j0:j1] + 90.0) / (dlat * fy)).astype(np.int64) - cy0
                gueltigy = (gy >= 0) & (gy < NR)
                if not gueltigy.any():
                    continue
                roh = np.asarray(var[j0:j1, xa:xb], dtype=np.float64)
                roh = np.ma.filled(roh, np.nan)[np.ix_(gueltigy, gueltigx)]
                flach = (gy[gueltigy][:, None] * NC + gx[None, :]).ravel()
                w = roh.ravel()
                da = np.isfinite(w)
                summe += np.bincount(flach[da], weights=w[da], minlength=NR * NC)
                zahl += np.bincount(flach[da], minlength=NR * NC)
            log(f"  {pfad.name}: {xb-xa} x {yb-ya} Quellwerte eingerechnet")
        finally:
            ds.close()

    hat = zahl > 0
    grob = np.full(NR * NC, np.nan)
    grob[hat] = summe[hat] / zahl[hat]
    grob = grob.reshape(NR, NC)
    log(f"  Grobgitter belegt zu {100*hat.mean():.1f} %")

    # Und daraus bilinear auf das Zielgitter. Bilinear und nicht bikubisch, weil
    # **herunter**gerechnet wird: eine kubische Kurve ueberschwingt an der Kueste,
    # und ein Ueberschwinger an der Nulllinie ist auf dieser Karte eine erfundene
    # Insel.
    glon0 = -180.0 + (cx0 + 0.5) * dlon * fx
    glat0 = -90.0 + (cy0 + 0.5) * dlat * fy
    fxi = (ZLON - glon0) / (dlon * fx)
    fyi = (ZLAT - glat0) / (dlat * fy)
    dem = np.full(ZLON.shape, np.nan)
    drin = (fxi >= 0) & (fxi <= NC - 1) & (fyi >= 0) & (fyi <= NR - 1)
    if drin.any():
        dem[drin] = bilinear(np.nan_to_num(grob, nan=0.0), fxi[drin], fyi[drin])

    ohne = int((maske & ~np.isfinite(dem)).sum())
    if ohne:
        log(f"  ACHTUNG: {ohne} Zellen der Maske ohne DEM-Wert "
            f"({100*ohne/int(maske.sum()):.2f} %). Dort stuende Meereshoehe, wo nichts")
        log("           gemessen ist. Ein DEM nehmen, das den Ausschnitt ganz deckt.")
    return np.nan_to_num(dem, nan=0.0)


# ========================================================= (a) ICE-6G_C
def ice6g_scheiben():
    """26 bis 21 ka in 1-ka-Schritten, danach 0,5 ka. Das ist die Datenlage und
    wird nicht geglaettet — die Seite macht sie unter der Zeitleiste sichtbar."""
    t = [float(v) for v in (26, 25, 24, 23, 22, 21)]
    v = 20.5
    while v >= -1e-9:
        t.append(round(v, 1))
        v -= 0.5
    return t


def ice6g_pfad(t):
    """Die Datei zur Zeitscheibe t, gleich welcher Aufloesung.

    ICE-6G_C gibt es in 10 Bogenminuten und in 1 Grad. Die Aufgabe nennt die
    10'-Fassung; erreichbar war zum Bauzeitpunkt nur die 1-Grad-Fassung (siehe
    ../QUELLEN.md). Der Bauvorgang nimmt, was daliegt, und richtet das
    Grobgitter danach — er unterstellt nirgends eine Aufloesung.
    """
    name = f"{t:g}"
    for muster in (f"I6_C.VM5a_10min.{name}.nc", f"I6_C.VM5a_1deg.{name}.nc"):
        p = ROH / "ice6g" / muster
        if p.exists():
            return p
    treffer = sorted((ROH / "ice6g").glob(f"I6_C.VM5a_*.{name}.nc"))
    if treffer:
        return treffer[0]
    raise SystemExit(
        f"Zeitscheibe {name} ka fehlt unter {ROH / 'ice6g'}.\n"
        "Erst build/holen.sh laufen lassen.")


def lies_ice6g():
    """Die 48 Scheiben, auf den Fensterausschnitt des 10'-Gitters beschnitten.

    Hochgerechnet wird hier **nicht**. Das grobe Feld geht so, wie es ist, in
    die Seite; sie rechnet es bikubisch hoch, weil sie zwischen zwei Scheiben
    ohnehin interpolieren muss und ein einmal hochgerechnetes Feld dabei nichts
    spart, aber das Fuenfzigfache wiegt.
    """
    zeiten = ice6g_scheiben()
    fenster = None
    td, st = [], []
    globalsl = []
    proben = []

    for i, t in enumerate(zeiten):
        ds = oeffne(ice6g_pfad(t))
        try:
            lon, lat = achsen(ds)
            # Laenge kann 0..360 oder -180..180 laufen.
            lonw = np.where(lon > 180.0, lon - 360.0, lon)
            ordnung = np.argsort(lonw)
            lonw = lonw[ordnung]

            vdiff = erste(ds, "Topo_Diff", "topo_diff", "TopoDiff")
            veis = erste(ds, "stgit", "sftgit", "thk", "ice_thickness")

            A = np.asarray(np.ma.filled(vdiff[:], 0.0), dtype=np.float64)[:, ordnung]
            B = np.asarray(np.ma.filled(veis[:], 0.0), dtype=np.float64)[:, ordnung]

            if fenster is None:
                rand = 3   # Rand fuer die bikubische Abtastung in der Seite
                ix = np.where((lonw >= LON0 - 1.0) & (lonw <= LON1 + 1.0))[0]
                iy = np.where((lat >= LAT0 - 1.0) & (lat <= LAT1 + 1.0))[0]
                x_a = max(0, int(ix[0]) - rand); x_b = min(len(lonw), int(ix[-1]) + 1 + rand)
                y_a = max(0, int(iy[0]) - rand); y_b = min(len(lat), int(iy[-1]) + 1 + rand)
                fenster = (x_a, x_b, y_a, y_b)
                meta_lon0 = float(lonw[x_a])
                meta_lat0 = float(lat[y_a])
                meta_dlon = float(lonw[1] - lonw[0])
                meta_dlat = float(lat[1] - lat[0])
                log(f"  10'-Fenster {x_b-x_a} x {y_b-y_a}, "
                    f"lon0={meta_lon0:.4f} dlon={meta_dlon:.4f} "
                    f"lat0={meta_lat0:.4f} dlat={meta_dlat:.4f}")

            x_a, x_b, y_a, y_b = fenster
            td.append(A[y_a:y_b, x_a:x_b])
            st.append(B[y_a:y_b, x_a:x_b])

            # ---- Meeresspiegel, aus dem Fernfeld ----------------------------
            # Topo ist die Hoehe ueber dem **damaligen** Meeresspiegel. Ueber
            # tiefem Ozean ohne nennenswerte Krustenbewegung gilt deshalb
            #     Topo_Diff = Topo(t) - Topo(0) = -Meeresspiegelaenderung.
            # Genommen wird der Median ueber den aequatorialen Pazifik, weit weg
            # von allen Eisschilden und ihren Vorwoelbungen. Das ist die einzige
            # Stelle, an der diese Karte etwas ausserhalb ihres Ausschnitts
            # liest — die Zahl steht sonst nirgends in den Dateien.
            fl = np.where((lat >= -20) & (lat <= 20))[0]
            fp = np.where((lonw >= -170) & (lonw <= -120))[0]
            vtopo = erste(ds, "Topo", "topo", "orog")
            T0 = np.asarray(np.ma.filled(vtopo[:], 0.0), dtype=np.float64)[:, ordnung]
            tief = T0[np.ix_(fl, fp)] < -3000.0
            fern = A[np.ix_(fl, fp)][tief]
            globalsl.append(float(-np.median(fern)) if fern.size else float("nan"))

            # sftlf und sftgif nur fuer Probe 1: sie sagen, an welchen Zellen
            # das Differenzfeld innerhalb der Zelle eine Stufe hat.
            def anteil(*namen):
                try:
                    v = erste(ds, *namen)
                except KeyError:
                    return np.full_like(T0, np.nan)
                return np.asarray(np.ma.filled(v[:], 0.0), dtype=np.float64)[:, ordnung]

            proben.append(dict(
                ka=t,
                topo=np.asarray(T0[y_a:y_b, x_a:x_b]),
                lf=anteil("sftlf", "land_area_fraction")[y_a:y_b, x_a:x_b],
                gif=anteil("sftgif", "stgif", "ice_area_fraction")[y_a:y_b, x_a:x_b],
            ))
        finally:
            ds.close()

    return zeiten, np.stack(td), np.stack(st), globalsl, fenster, proben, \
        dict(lon0=meta_lon0, lat0=meta_lat0, dlon=meta_dlon, dlat=meta_dlat)


# ============================================================ (b) DATED-1
# Drei Dinge sind an den echten Dateien anders, als man vermutet — alle drei
# sind beim ersten Lauf mit echten Daten aufgefallen und stehen in ../STAND.md
# als die Punkte, die zu pruefen waren:
#
#   1. Die Dateien heissen TS20_mc, nicht "20ka_most-credible". Die Zeit steht
#      ausserdem als Attribut AV_Time im DBF — das ist die verlaessliche
#      Quelle, der Dateiname nur der Rueckfall.
#   2. Es sind **Polygone**, keine Linien: die Eisflaeche, nicht ihr Rand. Fuer
#      die Karte ist das die bessere Form — der Umriss ist der Rand, und zwei
#      geschachtelte Umrisse lassen sich als Band fuellen.
#   3. Die Koordinaten sind **Meter** in einer polaren Lambert-Azimutal-
#      Projektion auf WGS84, nicht Grad. Ohne Ruecktransformation laege der
#      ganze Eisschild bei 0,00 Grad Nord.

_A = 6378137.0
_F = 1.0 / 298.257223563
_E2 = _F * (2 - _F)
_E = math.sqrt(_E2)


def _q(phi):
    s = np.sin(phi)
    return (1 - _E2) * (s / (1 - _E2 * s * s)
                        - (1 / (2 * _E)) * np.log((1 - _E * s) / (1 + _E * s)))


_QP = _q(np.pi / 2)


def polar_laea_zurueck(x, y, lon0=0.0):
    """Polare Lambert-Azimutal-Projektion (Ellipsoid) -> lon/lat in Grad.

    Snyder, Map Projections — A Working Manual, polare Form, invers ueber die
    authalische Breite. Die Reihe ist auf weit unter einen Meter genau; das
    Ellipsoid statt der Kugel zu nehmen ist hier kein Luxus, sondern macht am
    Eisrand rund zwanzig Kilometer aus.
    """
    rho = np.hypot(x, y)
    q = _QP - (rho * rho) / (_A * _A)
    beta = np.arcsin(np.clip(q / _QP, -1.0, 1.0))
    phi = (beta
           + (_E2 / 3 + 31 * _E2 ** 2 / 180 + 517 * _E2 ** 3 / 5040) * np.sin(2 * beta)
           + (23 * _E2 ** 2 / 360 + 251 * _E2 ** 3 / 3780) * np.sin(4 * beta)
           + (761 * _E2 ** 3 / 45360) * np.sin(6 * beta))
    lam = np.arctan2(x, -y)
    return lon0 + np.degrees(lam), np.degrees(phi)


def beschneide(gx, gy, w, h):
    """Den Ring auf das Gitterrechteck beschneiden (Sutherland-Hodgman).

    DATED-1 rekonstruiert die **eurasischen** Eisschilde — bis Taimyr und bis
    ueber 80 Grad Nord. Der Ausschnitt dieser Karte endet bei 45 Grad Ost und
    72 Grad Nord. Ungekuerzt laufen die Raender weit ueber die Karte hinaus;
    flach beschneidet die Silhouette sie weg, gekippt hingen sie im Schwarzen
    ueber der Barentssee, weil ein Punkt noerdlich des Fensters beim Anheben
    auf die oberste Gitterzeile geklemmt wird und deren Hoehe bekommt.

    Beschnitten wird deshalb hier, wo es hingehoert: in den Daten, vor dem
    Vereinfachen, und gegen ein Rechteck — das ist konvex, also bleibt der Ring
    geschlossen und das Unsicherheitsband fuellbar.
    """
    punkte = list(zip(np.asarray(gx, float), np.asarray(gy, float)))
    kanten = (
        (lambda q: q[0] >= 0.0, 0, 0.0),
        (lambda q: q[0] <= w, 0, w),
        (lambda q: q[1] >= 0.0, 1, 0.0),
        (lambda q: q[1] <= h, 1, h),
    )
    for drin, achse, grenze in kanten:
        if not punkte:
            break
        aus = []
        for i, b in enumerate(punkte):
            a = punkte[i - 1]
            b_drin, a_drin = drin(b), drin(a)
            if b_drin != a_drin:
                d = b[achse] - a[achse]
                u = 0.0 if d == 0 else (grenze - a[achse]) / d
                s_ = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]
                s_[achse] = grenze
                aus.append((s_[0], s_[1]))
            if b_drin:
                aus.append(b)
        punkte = aus
    if len(punkte) < 3:
        return np.empty(0), np.empty(0)
    a = np.asarray(punkte, dtype=np.float64)
    return a[:, 0], a[:, 1]


def lies_dated(g):
    """Die drei Umrisse je Zeitscheibe, projiziert und in Gitterkoordinaten."""
    import shapefile

    wurzel = ROH / "dated1"
    if not wurzel.exists():
        log("  DATED-1 fehlt — Unsicherheitsband bleibt leer")
        return {}

    def sorte(text):
        t = text.lower()
        if t.endswith("_max") or "maximum" in t:
            return "max"
        if t.endswith("_min") or "minimum" in t:
            return "min"
        if t.endswith("_mc") or "cred" in t:
            return "mc"
        return None

    heraus = {}
    zugeordnet = 0
    uebergangen = []
    for shp in sorted(wurzel.rglob("*.shp")):
        name = shp.stem
        s = sorte(name)
        if not s:
            uebergangen.append(name)
            continue
        try:
            sf = shapefile.Reader(str(shp))
        except Exception as ex:
            log(f"  {shp.name}: {ex}")
            continue

        # Die Zeit aus dem Attribut, der Dateiname nur als Rueckfall.
        felder = [x[0] for x in sf.fields[1:]]
        ka = None
        if "AV_Time" in felder:
            i = felder.index("AV_Time")
            werte = [r[i] for r in sf.records() if r[i] not in (None, "")]
            if werte:
                ka = int(round(float(werte[0])))
        if ka is None:
            m = re.search(r"TS_?(\d{1,2})(?!\d)", name)
            ka = int(m.group(1)) if m else None
        if ka is None or not (10 <= ka <= 25):
            uebergangen.append(name)
            continue

        # Grad oder projizierte Meter? Die .prj sagt es; ohne sie entscheidet
        # die Groessenordnung der Zahlen.
        prj = shp.with_suffix(".prj")
        text = prj.read_text(errors="replace") if prj.exists() else ""
        metrisch = "PROJCS" in text or 'UNIT["Meter' in text

        linien = []
        for form in sf.shapes():
            pts = np.asarray(form.points, dtype=np.float64)
            if pts.shape[0] < 2:
                continue
            if metrisch:
                lon, lat = polar_laea_zurueck(pts[:, 0], pts[:, 1])
            else:
                lon, lat = pts[:, 0], pts[:, 1]
            x, y = vor(lon, lat)
            gx = (x - g["x0"]) / g["schritt"]
            gy = (g["y1"] - y) / g["schritt"]
            teile = list(form.parts) + [len(pts)]
            for a, b in zip(teile, teile[1:]):
                if b - a < 3:
                    continue
                cx, cy = beschneide(gx[a:b], gy[a:b], g["w"], g["h"])
                if len(cx) < 3:
                    continue
                linien.append(vereinfache(cx, cy, 0.5))
        if linien:
            heraus.setdefault(ka, {})[s] = linien
            zugeordnet += 1

    voll = sum(1 for k in heraus if len(heraus[k]) == 3)
    log(f"  DATED-1: {zugeordnet} Shapefiles zugeordnet, {len(uebergangen)} uebergangen, "
        f"{len(heraus)} Zeitscheiben ({voll} mit allen drei Linien)")
    if uebergangen:
        log(f"  uebergangen: {', '.join(sorted(uebergangen))}")
    return heraus


def vereinfache(gx, gy, eps):
    """Douglas-Peucker, iterativ. Die Raender sind fein digitalisiert; auf dem
    Zielgitter ist jeder zweite Punkt derselbe Bildpunkt."""
    n = len(gx)
    if n < 3:
        return [[float(a), float(b)] for a, b in zip(gx, gy)]
    behalten = np.zeros(n, dtype=bool)
    behalten[0] = behalten[-1] = True
    stapel = [(0, n - 1)]
    while stapel:
        a, b = stapel.pop()
        if b <= a + 1:
            continue
        px, py = gx[a], gy[a]
        qx, qy = gx[b], gy[b]
        dx, dy = qx - px, qy - py
        laenge = math.hypot(dx, dy)
        idx = np.arange(a + 1, b)
        if laenge < 1e-12:
            d = np.hypot(gx[idx] - px, gy[idx] - py)
        else:
            d = np.abs(dy * (gx[idx] - px) - dx * (gy[idx] - py)) / laenge
        if d.size == 0:
            continue
        k = int(np.argmax(d))
        if d[k] > eps:
            m = idx[k]
            behalten[m] = True
            stapel.append((a, m))
            stapel.append((m, b))
    return [[float(gx[i]), float(gy[i])] for i in np.nonzero(behalten)[0]]


# ================================================================== Takt
def takt(zeiten, st, flaeche_km2):
    """Spielzeit je Abschnitt: geometrisches Mittel aus dem Anteil an den
    Jahren und dem Anteil an der Umschichtung, mit Untergrenze — genau das
    Verfahren der Vorlage (METHODIK 4e), nur mit Eisvolumen statt Menschen.

    Ohne das liefe der Zusammenbruch des Eisschildes zwischen 16 und 11 ka in
    einem Fuenftel der Zeit ab, waehrend die ruhigen fuenftausend Jahre vor dem
    Hochstand ein Viertel bekaemen.
    """
    n = len(zeiten)
    dauer = np.array([abs(zeiten[i] - zeiten[i + 1]) for i in range(n - 1)], dtype=np.float64)
    um = np.array([float(np.abs(st[i + 1] - st[i]).sum()) * flaeche_km2 for i in range(n - 1)])
    if um.sum() <= 0:
        um = dauer.copy()
    ad = dauer / dauer.sum()
    au = um / um.sum()
    roh = np.sqrt(ad * au)
    roh /= roh.sum()

    UNTEN = 1.0 / (n - 1) * 0.55   # keiner unter gut der Haelfte des Gleichanteils
    fest = roh < UNTEN
    for _ in range(50):
        rest = 1.0 - UNTEN * fest.sum()
        frei = ~fest
        if rest <= 0 or not frei.any():
            break
        skal = roh.copy()
        skal[frei] = roh[frei] / roh[frei].sum() * rest
        skal[fest] = UNTEN
        neu = skal < UNTEN - 1e-12
        if not neu.any():
            roh = skal
            break
        fest = fest | neu
    return (roh / roh.sum()).tolist()


# ================================================================== Lauf
def main():
    ZWISCHEN.mkdir(exist_ok=True)
    g = gitter()
    log(f"Zielgitter {g['w']} x {g['h']}, Zelle {g['schritt']:.3f} km, "
        f"Lambert azimutal flaechentreu um {MLAT} N {MLON} O")

    ZLON, ZLAT, maske, im_fenster = huelle(g)

    log("(c) DEM")
    dem = lies_dem(g, ZLON, ZLAT, maske)

    # Traegt eine der Quellen die Marke des Pruefgeruests?
    geruest = False
    for pf in list((ROH / "ice6g").glob("*.nc"))[:1] + list((ROH / "dem").glob("*.nc"))[:1]:
        try:
            d = oeffne(pf)
            if hasattr(d, "pruefgeruest"):
                geruest = True
            d.close()
        except Exception:
            pass
    if geruest:
        log("  ! Diese Rohdaten sind das PRUEFGERUEST — erfundener Inhalt.")

    log("(a) ICE-6G_C")
    zeiten, td, st, sl, fenster, proben, gmeta = lies_ice6g()
    log(f"  {len(zeiten)} Zeitscheiben, Topo_Diff {td.shape}, stgit {st.shape}")

    # ---- Gegenprobe: DEM grob + Topo_Diff muss Topo treffen -----------------
    # Sie faengt die beiden Fehler, die man an dieser Stelle wirklich macht:
    # ein vertauschtes Vorzeichen von Topo_Diff und einen falschen Bezugs-
    # zeitpunkt. Beides sieht man dem Bild sonst nicht an — es sieht nur falsch
    # aus, und zwar plausibel falsch.
    kennzahlen = {}

    # Probe 1 — die scharfe, und sie ist beim ersten Lauf mit echten Daten
    # **umgeschrieben** worden. Gedacht war sie als Identitaet: Topo_Diff ist
    # definiert als Topo(t) − Topo(0), also muss die Differenz null sein. Das
    # ist sie auch — aber nicht ueberall.
    #
    # `Topo` traegt im Kopf der Datei den Zusatz „(Point-value altitude)",
    # `Topo_Diff` traegt ihn nicht. Wo das Differenzfeld innerhalb einer Zelle
    # eine Stufe hat — am Eisrand, an einer wandernden Kueste, in der Antarktis
    # an der Aufsetzlinie —, sind ein Stichwert im Zellmittelpunkt und ein
    # Zellmittel zwei verschiedene Zahlen. Gemessen: im Fenster liegt die
    # Abweichung an allen Zellen, deren Land- und Eisanteil sich gegenueber
    # heute nicht geaendert hat, unter 3 m — quer durch alle 48 Scheiben und
    # ausdruecklich auch ueber den Alpen, wo das Gelaende schroff ist, das
    # Differenzfeld aber glatt. An den uebrigen Zellen wird sie dreistellig.
    #
    # Die Probe prueft deshalb die **stufenfreien** Zellen scharf und meldet
    # die uebrigen daneben, statt sie zu verschweigen. Ein vertauschtes
    # Vorzeichen und ein falscher Bezugszeitpunkt — die beiden Fehler, gegen
    # die sie steht — schlagen global durch und faenden hier kein Versteck.
    topo0 = proben[zeiten.index(0.0)]["topo"] if 0.0 in zeiten else None
    if topo0 is not None:
        lf0 = proben[zeiten.index(0.0)]["lf"]
        gif0 = proben[zeiten.index(0.0)]["gif"]
        schlimm = 0.0; schlimm_stufe = 0.0; n_stufe = 0; n_ges = 0
        for p in proben:
            i = zeiten.index(p["ka"])
            d = np.abs(p["topo"] - topo0 - td[i])
            # Fehlen sftlf/sftgif, gilt jede Zelle als stufenfrei — dann ist
            # die Probe wieder die scharfe von vorher, und das ist richtig so:
            # lieber zu streng als stillschweigend nachsichtig.
            bekannt = (np.isfinite(p["lf"]) & np.isfinite(lf0)
                       & np.isfinite(p["gif"]) & np.isfinite(gif0))
            stufe = ((p["lf"] != lf0) | (p["gif"] != gif0)) & bekannt
            glatt = ~stufe
            if glatt.any():
                schlimm = max(schlimm, float(d[glatt].max()))
            if stufe.any():
                schlimm_stufe = max(schlimm_stufe, float(d[stufe].max()))
            n_stufe += int(stufe.sum()); n_ges += d.size
        kennzahlen["topodiff_identitaet_max_m"] = schlimm
        kennzahlen["topodiff_identitaet_stufenzellen"] = dict(
            max_m=schlimm_stufe, anteil=n_stufe / max(n_ges, 1))
        log(f"  Probe 1  max |Topo(t) − Topo(0) − Topo_Diff(t)|")
        log(f"             an stufenfreien Zellen  {schlimm:8.3f} m")
        log(f"             an Stufenzellen         {schlimm_stufe:8.3f} m "
            f"({100*n_stufe/max(n_ges,1):.1f} % der Zellen, Eisrand und Kueste)")
        if schlimm > 5.0:
            log("  ACHTUNG: Topo_Diff ist nicht Topo(t) − Topo(0). Vorzeichen oder")
            log("           Bezugszeitpunkt pruefen, bevor irgendetwas gezeichnet wird.")

    # Probe 1b — die Frage, an der die ganze Rechnung haengt: **steckt das Eis
    # in Topo_Diff?** Sie ist an den Zellen mit viel Eis zu beantworten. Steht
    # dort ein grosser positiver Wert, ist es die Eisoberflaeche; stuende dort
    # ein negativer, waere es die eingedrueckte Kruste.
    #
    # Ohne diese Probe faellt der Fehler nicht auf: die Karte saehe aus wie ein
    # Gebirge und waere eines — nur keines, das je existiert hat.
    i21 = min(range(len(zeiten)), key=lambda k: abs(zeiten[k] - 21.0))
    dick = st[i21] > 1500.0
    if dick.any():
        mit = float(np.median(td[i21][dick]))
        kennzahlen["topodiff_traegt_eis"] = dict(
            ka=zeiten[i21], zellen=int(dick.sum()), median_topodiff_m=mit,
            median_stgit_m=float(np.median(st[i21][dick])))
        log(f"  Probe 1b wo bei {zeiten[i21]:g} ka ueber 1500 m Eis liegt "
            f"({int(dick.sum())} Zellen):")
        log(f"             Median Topo_Diff {mit:+8.1f} m, "
            f"Median stgit {np.median(st[i21][dick]):8.1f} m")
        if mit > 0:
            log("             -> positiv: Topo_Diff ist die OBERFLAECHE, Eis inbegriffen.")
            log("                Fels = DEM + Topo_Diff − stgit. So rechnet die Seite.")
        else:
            log("  ACHTUNG: Topo_Diff scheint die eisfreie Kruste zu sein. Dann darf")
            log("           die Seite stgit nicht abziehen — seite.mjs, paleo().")

    # Probe 2 — die weiche. Wie weit liegen das feine DEM und ICE-6G_Cs eigene
    # heutige Topographie auseinander, wenn man das DEM auf 10' mittelt? Das
    # ist **kein Fehler**, sondern der Unterschied zweier Datensaetze und der
    # Preis der Aufloesung. Die Zahl gehoert trotzdem gemessen: laeuft sie aus
    # dem Ruder, stimmt der Ausschnitt oder die Achsenrichtung nicht.
    if topo0 is not None:
        gh, gw = topo0.shape
        jy = np.clip(((ZLAT - gmeta["lat0"]) / gmeta["dlat"]).round().astype(np.int64), 0, gh - 1)
        jx = np.clip(((ZLON - gmeta["lon0"]) / gmeta["dlon"]).round().astype(np.int64), 0, gw - 1)
        summe = np.zeros((gh, gw)); zahl = np.zeros((gh, gw))
        np.add.at(summe, (jy[im_fenster], jx[im_fenster]), dem[im_fenster])
        np.add.at(zahl, (jy[im_fenster], jx[im_fenster]), 1.0)
        hat = zahl > 0
        d = np.abs(summe[hat] / zahl[hat] - topo0[hat])
        kennzahlen["dem_gegen_ice6g_topo"] = dict(
            median_m=float(np.median(d)), p95_m=float(np.percentile(d, 95)),
            zellen=int(hat.sum()))
        log(f"  Probe 2  |DEM auf 10' gemittelt − ICE-6G_C Topo(0)|: "
            f"Median {np.median(d):6.1f} m, 95 % {np.percentile(d, 95):7.1f} m "
            f"ueber {int(hat.sum())} Zellen")

    log("(b) DATED-1")
    dated = lies_dated(g)

    zellkm2 = g["schritt"] ** 2
    tk = takt(zeiten, st, zellkm2)

    # ---- Land, Eis und Meeresspiegel je Scheibe, fuer die Notizen -----------
    # Gerechnet wird hier mit denselben Schritten wie in der Seite — bikubisch
    # hochrechnen, addieren, Nulllinie nehmen —, damit die Zahlen in den Notizen
    # dieselben sind, die jemand am Bildschirm abliest. Die Kuestenlinie kommt
    # aus paleo > 0, nicht aus sftlf (siehe ../QUELLEN.md, Abschnitt 3).
    log("Kennzahlen je Zeitscheibe")
    steigungen = []
    fx = np.clip((ZLON - gmeta["lon0"]) / gmeta["dlon"], 0, td.shape[2] - 1)
    fy = np.clip((ZLAT - gmeta["lat0"]) / gmeta["dlat"], 0, td.shape[1] - 1)
    nm = int(im_fenster.sum())
    je = []
    for i, t in enumerate(zeiten):
        # flaeche = DEM + Topo_Diff ist die **Oberflaeche**, Eis inbegriffen
        # (Probe 1b). Der Fels liegt um die Eismaechtigkeit tiefer.
        flaeche = dem + bikubisch(td[i], fx, fy)
        eis = np.maximum(0.0, bikubisch(st[i], fx, fy))
        # Dieselbe Schranke wie in der Seite: aufliegendes Eis hat seine
        # Oberflaeche immer ueber dem Meeresspiegel (Begruendung in seite.mjs,
        # paleo()). Sonst zaehlten die Notizen Eis, das die Karte nicht zeigt.
        eis = np.where(flaeche > 0, eis, 0.0)
        fels = flaeche - eis
        # „Land" heisst hier, was ICE-6G_C selbst Land nennt: nicht Meer. Der
        # Eisschild zaehlt dazu — deshalb stimmt die Zahl mit sftlf und mit
        # Probe 3 ueberein, und deshalb steht daneben, wie viel davon Eis ist.
        land = (flaeche > 0) & im_fenster
        unter_eis = (eis > 1.0) & im_fenster
        # ---- Steigung, fuer die Ueberhoehung der Schraegsicht ----------
        # Gemessen wird auf genau dem Feld, das die Seite zeichnet: Betrag der
        # Nachbardifferenz in Metern je Gitterzelle. Daraus kommt spaeter das
        # 90-Prozent-Quantil, und daraus die Hoehe des Scheibenstapels. Der
        # Grund steht in seite.mjs bei LAMBDA; kurz: eine feste Ueberhoehung
        # macht aus einem Tiefland einen Teller und aus den Alpen einen
        # Nadelwald, eine gemessene nicht.
        f = np.where(im_fenster, flaeche, np.nan)
        for d in (np.abs(np.diff(f, axis=1)), np.abs(np.diff(f, axis=0))):
            steigungen.append(d[np.isfinite(d)].astype(np.float32))

        je.append(dict(
            ka=t,
            land_anteil=float(land.sum() / nm),
            eis_anteil=float(unter_eis.sum() / nm),
            eis_volumen_km3=float((eis * im_fenster).sum() * zellkm2 / 1000.0),
            hoechster_m=float(np.nanmax(np.where(im_fenster, flaeche, np.nan))),
            hoechster_fels_m=float(np.nanmax(np.where(im_fenster, fels, np.nan))),
            tiefster_fels_m=float(np.nanmin(np.where(im_fenster, fels, np.nan))),
            meeresspiegel_m=sl[i],
        ))

    # ---- Die Steigungsstatistik, eine Zahl fuer die ganze Karte ------------
    alle = np.concatenate(steigungen)
    g90 = float(np.percentile(alle, 90))
    kennzahlen["steigung_m_je_zelle"] = {
        f"p{q}": float(np.percentile(alle, q)) for q in (50, 75, 90, 99, 100)}
    log(f"  Steigung des Feldes, Meter je {g['schritt']:.2f}-km-Zelle: "
        + "  ".join(f"p{q}={np.percentile(alle, q):7.1f}" for q in (50, 90, 99, 100)))
    log(f"           -> g90 = {g90:.1f} m je Zelle "
        f"({100*g90/(g['schritt']*1000):.2f} % Neigung); daraus rechnet die "
        f"Seite die Hoehe des Scheibenstapels.")
    del steigungen, alle

    # Probe 3 — die Kuestenlinie. Die eigene Nulllinie gegen die, die ICE-6G_C
    # selbst zoege (Topo > 0). Gleich sein muessen sie nicht: die eine hat
    # 5,8 km Aufloesung, die andere 18 km, und genau dieser Unterschied ist der
    # Zweck der ganzen Uebung. Aber sie muessen **nah beieinander** liegen —
    # laufen sie auseinander, stimmt das Vorzeichen oder der Bezug nicht.
    kp = []
    for p in proben[:: max(1, len(proben) // 6)]:
        i = zeiten.index(p["ka"])
        eigen = (dem + bikubisch(td[i], fx, fy)) > 0
        ihr = bikubisch(p["topo"], fx, fy) > 0
        gleich = float((eigen[im_fenster] == ihr[im_fenster]).mean())
        kp.append(dict(ka=p["ka"], uebereinstimmung=gleich))
        log(f"  Probe 3  {p['ka']:>5} ka  Land/Wasser stimmt mit ICE-6G_C Topo "
            f"auf {100*gleich:.1f} % der Zellen ueberein")
    kennzahlen["kueste_gegen_ice6g"] = kp
    for e in je[:: max(1, len(je) // 8)]:
        log(f"  {e['ka']:>5} ka  Land {100*e['land_anteil']:5.1f} %  "
            f"Eis {100*e['eis_anteil']:5.1f} %  "
            f"MSp {e['meeresspiegel_m']:7.1f} m")

    # ------------------------------------------- die groben Felder, projiziert
    # Beide werden hier auf ein **projiziertes** Grobgitter gelegt, nicht als
    # Laengen-Breiten-Feld durchgereicht. Das nimmt der Seite die Umkehrung der
    # Projektion je Feldpunkt ab: Grobgitter und Karte liegen dann achsenparallel
    # uebereinander, und das bikubische Hochrechnen ist eine reine Streckung.
    #
    # Die Teiler sind gemessen, nicht geraten (siehe METHODIK.md):
    #
    #   Topo_Diff ist die Krustenbewegung plus der Meeresspiegel. Ihre kuerzeste
    #   wirkliche Wellenlaenge setzt die Biegesteifigkeit der Lithosphaere, und
    #   die liegt bei ueber hundert Kilometern. Teiler 8 heisst hier rund 55 km
    #   Abtastung — immer noch feiner als das Feld selbst ist.
    #
    #   stgit hat am Eisrand eine Stufe und darf deshalb nicht so weit
    #   heruntergehen. Teiler 4, rund 27 km — feiner als die 18 km, die
    #   ICE-6G_C selbst hat, waere gelogen; 27 km ist knapp darunter.
    # Das Grobgitter darf **nie feiner sein als die Quelle**. Sonst suggeriert
    # die Karte eine Aufloesung, die in den Daten nicht steht — und genau das
    # ist der Fehler, gegen den die ganze Konstruktion gebaut ist.
    #
    # Gerechnet aus der wirklichen Zellgroesse der Quelle am Mittelbreitengrad,
    # in der **feineren** der beiden Achsen; darunter die physikalischen Boeden
    # von vorher (Topo_Diff darf groeber, stgit nicht).
    km_je_grad = ERDR * math.pi / 180.0
    quelle_km = min(abs(gmeta["dlon"]) * km_je_grad * math.cos(math.radians(MLAT)),
                    abs(gmeta["dlat"]) * km_je_grad)
    nie_feiner = max(1, int(round(quelle_km / g["schritt"])))
    tdt = int(os.environ.get("TD_GROB", str(max(8, nie_feiner))))
    est = int(os.environ.get("EIS_GROB", str(max(4, nie_feiner))))
    log(f"  Quellzelle {quelle_km:.0f} km = {nie_feiner} Zielzellen; "
        f"Teiler Topo_Diff {tdt}, stgit {est}")

    def grobgitter(teiler):
        w = max(4, g["w"] // teiler)
        h = max(4, g["h"] // teiler)
        gx = g["x0"] + (np.arange(w) + 0.5) * (g["schritt"] * g["w"] / w)
        gy = g["y1"] - (np.arange(h) + 0.5) * (g["schritt"] * g["h"] / h)
        GX, GY = np.meshgrid(gx, gy)
        LO, LA = zurueck(GX, GY)
        return w, h, (np.clip((LO - gmeta["lon0"]) / gmeta["dlon"], 0, td.shape[2] - 1),
                      np.clip((LA - gmeta["lat0"]) / gmeta["dlat"], 0, td.shape[1] - 1))

    tw, th, (tfx, tfy) = grobgitter(tdt)
    ew, eh, (efx, efy) = grobgitter(est)
    log(f"  Topo_Diff auf {tw} x {th} projiziert (Teiler {tdt}, "
        f"{g['schritt']*tdt:.0f} km), stgit auf {ew} x {eh} (Teiler {est}, "
        f"{g['schritt']*est:.0f} km)")
    tdp = np.stack([bikubisch(td[i], tfx, tfy) for i in range(len(zeiten))])
    esp = np.stack([np.maximum(0.0, bikubisch(st[i], efx, efy)) for i in range(len(zeiten))])

    # ---------------------------------------------------------------- schreiben
    np.round(dem).astype(np.int16).tofile(ZWISCHEN / "dem.i16")
    maske.astype(np.uint8).tofile(ZWISCHEN / "maske.u8")
    np.round(tdp).astype(np.int16).tofile(ZWISCHEN / "topodiff.i16")
    np.round(np.clip(esp, 0, 65535)).astype(np.uint16).tofile(ZWISCHEN / "stgit.u16")
    (ZWISCHEN / "dated.json").write_text(json.dumps(
        {str(k): v for k, v in sorted(dated.items())}), encoding="utf8")
    (ZWISCHEN / "meta.json").write_text(json.dumps(dict(
        gitter=g, mitte=[MLON, MLAT], erdradius=ERDR,
        ausschnitt=[LON0, LON1, LAT0, LAT1],
        zeiten=zeiten, takt=tk, meeresspiegel=sl,
        topodiff=dict(w=tw, h=th, teiler=tdt),
        stgit=dict(w=ew, h=eh, teiler=est),
        g90_m_je_zelle=g90,
        quelle_grob=dict(w=int(td.shape[2]), h=int(td.shape[1]), **gmeta),
        je_scheibe=je, kennzahlen=kennzahlen,
        # Woher die Daten stammen. build.mjs weigert sich, aus Geruestdaten
        # eine Seite ohne Wasserzeichen zu schreiben.
        pruefgeruest=geruest,
    ), indent=1), encoding="utf8")
    log(f"\ngeschrieben nach {ZWISCHEN}")
    log("weiter mit:  node build.mjs > ../index.html")


if __name__ == "__main__":
    main()
