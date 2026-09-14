#!/usr/bin/env python3
"""PRUEFGERUEST — erfundene Rohdaten in den echten Dateiformaten.

    python3 pruefgeruest.py

Erzeugt unter build/pruefgeruest-roh/ einen vollstaendigen Satz Eingangsdateien:
ein DEM als NetCDF, 48 ICE-6G_C-Scheiben als NetCDF und DATED-1-Linien als
Shapefiles. **Der Inhalt ist erfunden.** Das Geruest prueft die Kette — Leser,
Projektion, Herunterrechnen, bikubisches Hochrechnen, Kodierung, Seite — und
nicht die Erde.

Warum es das gibt: aus dieser Arbeitsumgebung ist keine der drei Quellen
erreichbar (siehe ../QUELLEN.md). Ohne Geruest waere die ganze Kette
ungetesteter Code. Mit ihm ist alles geprueft ausser den Zahlen selbst.

Zwei Sicherungen dagegen, dass daraus je eine veroeffentlichte Karte wird:

  * Es schreibt nach build/pruefgeruest-roh/, nie nach data/raw/.
  * Jede erzeugte Datei traegt das globale Attribut
    `pruefgeruest = "erfundene Daten, nicht zur Veroeffentlichung"`, und
    quellen.py bricht ab, wenn es das in echten Daten findet — nein, umgekehrt:
    build.mjs setzt daraufhin ein Wasserzeichen in die Seite und weigert sich,
    sie ohne --geruest zu schreiben.
"""

import math
import os
import sys
from pathlib import Path

import numpy as np
from netCDF4 import Dataset

HIER = Path(__file__).resolve().parent
ZIEL = Path(os.environ.get("GERUEST_ROH") or (HIER / "pruefgeruest-roh"))
MARKE = "erfundene Daten, nicht zur Veroeffentlichung"

log = lambda s: print(s, file=sys.stderr)


def berge(LON, LAT, kerne):
    """Ein paar Gausskuppen — genug, damit Schattierung, Hoehenlinien und der
    Scheibenstapel etwas zu tun bekommen."""
    z = np.zeros(LON.shape)
    for lon, lat, hoehe, breit in kerne:
        d2 = ((LON - lon) * math.cos(math.radians(lat))) ** 2 + (LAT - lat) ** 2
        z += hoehe * np.exp(-d2 / (2 * breit * breit))
    return z


# Grob dort, wo in Europa wirklich etwas steht — damit ein Blick auf die
# Testseite sofort sagt, ob Projektion und Ausschnitt stimmen. Die Hoehen sind
# Hausnummern, keine Daten.
GEBIRGE = [
    (10.0, 46.5, 3200, 2.2),    # Alpen
    (13.0, 62.0, 1800, 4.0),    # Skandinavisches Gebirge
    (24.0, 47.5, 1900, 2.6),    # Karpaten
    (-4.0, 42.5, 2100, 3.0),    # Kantabrisches Gebirge / Pyrenaeen
    (10.5, 50.5,  900, 1.8),    # Mittelgebirge
    (16.0, 49.0,  800, 1.6),
    (-5.0, 56.5, 1100, 1.8),    # Schottisches Hochland
    (42.0, 43.0, 3000, 2.4),    # Kaukasusrand
    (20.0, 40.0, 1800, 2.0),    # Balkan
]
SENKEN = [
    (3.0, 56.0, -260, 3.4),     # Nordsee
    (20.0, 58.0, -200, 3.6),    # Ostsee
    (-20.0, 50.0, -4200, 9.0),  # Nordatlantik
    (17.0, 37.5, -3200, 4.0),   # Mittelmeer
    (38.0, 44.0, -1800, 3.0),   # Schwarzes Meer
]


def dem_schreiben():
    """15 Bogensekunden waeren 124 Millionen Werte fuer das Fenster. Fuer die
    Kettenprobe reichen 30 Bogensekunden — der Blockmittelungsschritt in
    quellen.py wird dabei genauso durchlaufen, nur mit halbem Faktor."""
    ZIEL.joinpath("dem").mkdir(parents=True, exist_ok=True)
    schritt = 30.0 / 3600.0
    # Bis 76 N und -16/49 O: die zeilenweise Huelle der Maske greift an den
    # oberen Ecken knapp ueber das Fenster hinaus (bis rund 74,1 N). Ein
    # globales DEM hat das Problem nicht, das Geruest muss es nachbilden.
    lon = np.arange(-16.0, 49.0, schritt)
    lat = np.arange(30.0, 76.0, schritt)
    log(f"  DEM {len(lon)} x {len(lat)} bei 30\"")
    pfad = ZIEL / "dem" / "GERUEST_dem_30s.nc"
    ds = Dataset(pfad, "w", format="NETCDF4")
    ds.createDimension("lon", len(lon))
    ds.createDimension("lat", len(lat))
    vlon = ds.createVariable("lon", "f8", ("lon",)); vlon[:] = lon
    vlat = ds.createVariable("lat", "f8", ("lat",)); vlat[:] = lat
    vz = ds.createVariable("elevation", "i2", ("lat", "lon"), zlib=True, complevel=4)
    vz.units = "m"
    for j0 in range(0, len(lat), 256):
        j1 = min(len(lat), j0 + 256)
        LON, LAT = np.meshgrid(lon, lat[j0:j1])
        z = berge(LON, LAT, GEBIRGE) + berge(LON, LAT, SENKEN)
        # Ein wenig Kleinrelief, damit die Hoehenlinien nicht perfekt rund
        # sind — aber **oberhalb der Zielaufloesung**. Der erste Wurf hatte
        # elf Schwingungen je Grad; auf 760 Zellen fuer 57 Grad ist das gut
        # eine Schwingung je Zelle, also reines Aliasing, und die Karte trug
        # ein Gitternetz aus Hoehenlinien, das wie ein Fehler des Zeichners
        # aussah und keiner war.
        z += 120 * np.sin(LON * 0.9) * np.cos(LAT * 0.8)
        z += 45 * np.sin(LON * 2.3 + 1.0) * np.cos(LAT * 1.9)
        vz[j0:j1, :] = np.round(z).astype(np.int16)
    ds.pruefgeruest = MARKE
    ds.close()
    return pfad


def ice6g_schreiben():
    """Ein Eisschild, der ueber Skandinavien aufwaechst und wieder verschwindet,
    dazu die isostatische Senke darunter und der Meeresspiegel.

    Global, weil quellen.py den Meeresspiegel aus dem aequatorialen Pazifik
    holt — und genau diesen Weg soll die Probe mitgehen.
    """
    ZIEL.joinpath("ice6g").mkdir(parents=True, exist_ok=True)
    d = 10.0 / 60.0
    lon = np.arange(-180.0 + d / 2, 180.0, d)
    lat = np.arange(-90.0 + d / 2, 90.0, d)
    LON, LAT = np.meshgrid(lon, lat)

    # heutige Topographie, grob — nur als Bezug fuer Topo = Topo0 + Topo_Diff
    topo0 = berge(LON, LAT, GEBIRGE) + berge(LON, LAT, SENKEN)
    topo0 = np.where((LON > -12) & (LON < 46) & (LAT > 33) & (LAT < 73), topo0, -4000.0)

    zeiten = [26.0, 25.0, 24.0, 23.0, 22.0, 21.0]
    v = 20.5
    while v >= -1e-9:
        zeiten.append(round(v, 1)); v -= 0.5

    def eisform(ka):
        """Aufbau bis 22 ka, Hochstand 22–19, Zusammenbruch bis 10, danach nichts.
        Die Zahlen sind gewaehlt, damit die Zeitachse etwas zu zeigen hat."""
        if ka >= 22: f = max(0.0, (26.0 - ka) / 4.0) * 0.9
        elif ka >= 19: f = 1.0
        elif ka >= 10: f = (ka - 10.0) / 9.0
        else: f = 0.0
        return f

    for ka in zeiten:
        f = eisform(ka)
        # Kuppel ueber Skandinavien, mit der Zeit nach Suedwesten wandernd
        mitte_lon = 17.0 - 3.0 * (1 - f)
        mitte_lat = 63.0 + 1.5 * (1 - f)
        r = np.hypot((LON - mitte_lon) * np.cos(np.radians(LAT)) / 1.6, (LAT - mitte_lat))
        eis = np.maximum(0.0, 3000.0 * f * (1.0 - (r / (18.0 * max(f, 0.05))) ** 2))
        eis = np.where(np.isfinite(eis), eis, 0.0)
        eis[topo0 < -600] *= 0.15     # ueber tiefem Wasser kaum Eis

        senke = -0.28 * eis            # Isostasie, stark vereinfacht
        # Vorwoelbung ringsum
        senke += 40.0 * f * np.exp(-((r - 22.0) ** 2) / 50.0)
        msp = -130.0 * f               # Meeresspiegel
        topo_diff = senke - msp
        topo = topo0 + topo_diff

        pfad = ZIEL / "ice6g" / f"I6_C.VM5a_10min.{ka:g}.nc"
        ds = Dataset(pfad, "w", format="NETCDF3_CLASSIC")
        ds.createDimension("lon", len(lon))
        ds.createDimension("lat", len(lat))
        ds.createVariable("lon", "f8", ("lon",))[:] = lon
        ds.createVariable("lat", "f8", ("lat",))[:] = lat
        ds.createVariable("Topo", "f4", ("lat", "lon"))[:] = topo
        ds.createVariable("Topo_Diff", "f4", ("lat", "lon"))[:] = topo_diff
        ds.createVariable("stgit", "f4", ("lat", "lon"))[:] = eis
        ds.createVariable("sftlf", "f4", ("lat", "lon"))[:] = (topo > 0).astype("f4")
        ds.createVariable("stgif", "f4", ("lat", "lon"))[:] = (eis > 1).astype("f4")
        ds.pruefgeruest = MARKE
        ds.close()
    log(f"  {len(zeiten)} ICE-6G_C-Scheiben")
    return zeiten


def dated_schreiben():
    """Drei Linien je Zeitscheibe 25–10 ka, als Shapefiles wie bei PANGAEA.

    Das Band zwischen maximum und minimum ist absichtlich **ungleich breit**:
    eng am Hochstand, weit beim Zusammenbruch. Genau das soll die Seite zeigen,
    und genau daran laesst sich pruefen, ob sie es tut.
    """
    import shapefile
    wurzel = ZIEL / "dated1" / "entpackt"
    wurzel.mkdir(parents=True, exist_ok=True)
    for ka in range(10, 26):
        f = 1.0 if ka >= 19 else (ka - 10.0) / 9.0
        f = max(f, 0.02)
        mitte_lon = 17.0 - 3.0 * (1 - f)
        mitte_lat = 63.0 + 1.5 * (1 - f)
        # weit, wo die Datierung duenn ist: vor dem Hochstand und ganz am Ende
        weite = 0.05 + 0.22 * abs(ka - 19) / 9.0
        for sorte, skal in (("most-credible", 1.0), ("maximum", 1 + weite), ("minimum", 1 - weite)):
            w = shapefile.Writer(str(wurzel / f"DATED-1_{ka}ka_{sorte}"), shapeType=shapefile.POLYLINE)
            w.field("ka", "N", 4, 0)
            w.field("credib", "C", 20)
            th = np.linspace(0, 2 * math.pi, 240)
            rr = 18.0 * f * skal * (1.0 + 0.12 * np.sin(3 * th) + 0.06 * np.cos(7 * th))
            lon = mitte_lon + rr * 1.6 * np.cos(th) / np.cos(math.radians(mitte_lat))
            lat = mitte_lat + rr * np.sin(th)
            w.line([[[float(a), float(b)] for a, b in zip(lon, lat)]])
            w.record(ka, sorte)
            w.close()
            (wurzel / f"DATED-1_{ka}ka_{sorte}.prj").write_text(
                'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563]],'
                'PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]]')
    log("  DATED-1: 16 Zeitscheiben x 3 Linien")


def main():
    log("PRUEFGERUEST — erfundene Rohdaten, nur zum Pruefen der Kette")
    log(f"nach {ZIEL}")
    dem_schreiben()
    ice6g_schreiben()
    dated_schreiben()
    (ZIEL / "PRUEFGERUEST").write_text(
        MARKE + "\n\nDieser Ordner enthaelt keine echten Daten. Er dient dazu,\n"
        "die Verarbeitungskette zu pruefen, solange die Quellen nicht\n"
        "erreichbar sind. Siehe ../../QUELLEN.md.\n", encoding="utf8")
    log("\nfertig. Kette pruefen mit:")
    log("  ROH=pruefgeruest-roh ZWISCHEN=zwischen-geruest python3 quellen.py")


if __name__ == "__main__":
    main()
