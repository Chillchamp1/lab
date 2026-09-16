#!/usr/bin/env python3
"""Ein Bevoelkerungsgewicht je Bahnhof.

Die Erreichbarkeit, die das Relief traegt, war bisher nach *Bahnhoefen*
gemittelt: die mittlere Reisezeit von hier zu allen anderen Bahnhoefen. Das
misst aber nicht, wonach sich Angebundenheit anfuehlt. Ein Haltepunkt mit
dreissig Einwohnern zaehlt darin wie Koeln, und weil die Haltepunkte in der
Flaeche liegen, zieht das die Karte nach aussen: wer viele kleine Halte um
sich hat, sieht gut angebunden aus, auch wenn dort niemand wohnt.

Also wird nach Menschen gewichtet. Gebraucht wird dafuer eine Zahl je
Bahnhof: wie viele Menschen ueber ihn an das Netz kommen.

Die Kette dazu:

1. **Kreisbevoelkerung** aus dem Nachbarprojekt `bevoelkerung-kreise`, Stand
   31. Dezember 2024 — 400 Kreise, zusammen 83,6 Millionen.
2. **Kreisgeometrie** aus demselben Projekt. Sie liegt dort in der Seite, in
   einem Zickzack-Varint ueber einem 64-Zeichen-Alphabet, und wird hier
   entpackt. Das Gitter ist eine Lambert-azimutal-flaechentreue Projektion
   (ETRS89-LAEA, EPSG:3035-Parameter), und weil die flaechentreu ist, laesst
   sich der Maßstab des Gitters gegen die **amtlichen Kreisflaechen**
   pruefen — was dieses Skript auch tut, Kreis fuer Kreis.
3. **Einzugsgebiete.** Jeder Kreis wird mit RASTER_KM gerastert, jede
   Rasterzelle traegt ihren Anteil an der Kreisbevoelkerung, und dieser
   Anteil geht an den **naechstgelegenen Bahnhof** — ueber Kreisgrenzen
   hinweg, denn Menschen fahren zum naechsten Bahnhof und nicht zum
   naechsten im eigenen Kreis.

Was das nicht kann: innerhalb eines Kreises nimmt es die Bevoelkerung als
gleichmaeßig verteilt an. In einem Landkreis mit einer Stadt und viel Wald
sitzt damit zu viel Bevoelkerung im Wald. Feiner geht es nur mit
Gemeinde- oder Rasterdaten, und die liegen hier nicht (siehe DATEN.md).

Ausgabe: `zwischen/menschen.json`.
"""
import csv, json, math, os, re, sys
import numpy as np

HIER = os.path.dirname(os.path.abspath(__file__))
Z = os.path.join(HIER, "zwischen")
ROH = os.path.join(HIER, "roh")
SEITE = os.environ.get("KREISSEITE", os.path.join(ROH, "bevoelkerung-kreise.html"))
CSV = os.environ.get("KREISCSV", os.path.join(ROH, "bevoelkerung_kreise_long.csv"))
JAHR = "2024"
RASTER_KM = 2.0
ERDR = 6378137.0
ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@_"


def entpacke(s):
    """Zickzack-Varint, fuenf Bit je Zeichen, Bit 32 ist die Fortsetzung.
    Gegenstueck zu `packe` in bevoelkerung-kreise/build/code.mjs."""
    A = {c: i for i, c in enumerate(ALPHABET)}
    out, z, p = [], 0, 1
    for c in s:
        v = A[c]
        z += (v & 31) * p
        if v & 32:
            p *= 32
        else:
            out.append(-(z + 1) // 2 if z & 1 else z // 2)
            z, p = 0, 1
    return out


def laea(lon, lat, lon0=10.0, lat0=52.0):
    """Lambert azimutal flaechentreu, dieselben Parameter wie im Nachbarprojekt."""
    lon = np.asarray(lon, dtype=float)
    lat = np.asarray(lat, dtype=float)
    p = np.radians(lat)
    l = np.radians(lon - lon0)
    p0 = math.radians(lat0)
    k = np.sqrt(2.0 / (1.0 + math.sin(p0) * np.sin(p)
                       + math.cos(p0) * np.cos(p) * np.cos(l)))
    return (ERDR * k * np.cos(p) * np.sin(l),
            ERDR * k * (math.cos(p0) * np.sin(p) - math.sin(p0) * np.cos(p) * np.cos(l)))


def kreise_laden(pfad):
    s = open(pfad, encoding="utf-8").read()
    m = re.search(r"\nconst D = (\{.*?\});?\n", s, re.S)
    if not m:
        sys.exit("In %s steht kein Nutzlast-Objekt `const D = {...}`" % pfad)
    D = json.loads(m.group(1))
    qx = np.cumsum(entpacke(D["gx"]))
    qy = np.cumsum(entpacke(D["gy"]))
    ringzahl = entpacke(D["ringzahl"])
    ringlen = entpacke(D["ringe"])
    idxd = entpacke(D["idx"])
    kreise, ri, ii = [], 0, 0
    for nring in ringzahl:
        ringe = []
        for _ in range(nring):
            n = ringlen[ri]; ri += 1
            r, v = [], 0
            for _ in range(n):
                v += idxd[ii]; ii += 1
                r.append(v)
            ringe.append(np.array(r, dtype=np.int64))
        kreise.append(ringe)
    assert ri == len(ringlen) and ii == len(idxd), "Ringe und Indizes gehen nicht auf"
    stamm = D["k"]          # [ags, name, art, land, flaeche_km2]
    return qx, qy, kreise, stamm, D["vb"]


def ringflaeche(ring, qx, qy):
    x, y = qx[ring], qy[ring]
    return 0.5 * float(np.sum(np.roll(x, 1) * y - x * np.roll(y, 1)))


def main():
    for p in (SEITE, CSV):
        if not os.path.exists(p):
            sys.exit("Rohdaten fehlen: %s — siehe build/DATEN.md" % p)
    if not os.path.exists(os.path.join(Z, "kern.json")):
        sys.exit("zwischen/kern.json fehlt — erst 03_lage.py laufen lassen")

    qx, qy, kreise, stamm, vb = kreise_laden(SEITE)
    print("entpackt: %d Kreise, %d Knoten, Gitter %d x %d"
          % (len(kreise), len(qx), vb[0], vb[1]))

    # ---- Maßstab des Gitters aus den amtlichen Flaechen
    amt = np.array([k[4] for k in stamm], dtype=float)          # km^2
    git = np.array([abs(sum(ringflaeche(r, qx, qy) for r in ringe))
                    for ringe in kreise], dtype=float)          # Gittereinheiten^2
    skala = math.sqrt(git.sum() / (amt.sum() * 1e6))            # Gittereinheiten je Meter
    print("Maßstab aus den Flaechen: 1 Gittereinheit = %.1f m"
          % (1.0 / skala))
    eigen = git / (skala * skala) / 1e6
    fehl = np.abs(eigen / amt - 1)
    print("amtliche Flaeche gegen gerasterte: Median %.2f %%, 90%% unter %.2f %%, "
          "Maximum %.1f %% (%s)"
          % (100 * np.median(fehl), 100 * np.percentile(fehl, 90),
             100 * fehl.max(), stamm[int(np.argmax(fehl))][1]))
    print("Gesamtflaeche: amtlich %.0f km2, gerastert %.0f km2"
          % (amt.sum(), eigen.sum()))

    # ---- Lage des Gitters: der Umriss Deutschlands in derselben Projektion,
    #      Rahmen gegen Rahmen. Beide Datensaetze beschreiben dasselbe Land,
    #      also fallen Maßstab und Nullpunkt aus ihren Rahmen — je Achse
    #      einzeln, damit ein Unterschied in der Vereinfachung sich selbst
    #      herausrechnet statt schief zu stehen.
    #
    #      Die y-Achse des Gitters laeuft nach **Sueden**: Flensburg liegt bei
    #      qy 472, Muenchen bei 9052. Die Nutzlast steht also schon in
    #      Bildschirmrichtung, nicht in Projektionsrichtung.
    geo = json.load(open(os.path.join(ROH, "germany.json")))
    lo = [p[0] for r in geo["outline"] for p in r]
    la = [p[1] for r in geo["outline"] for p in r]
    ux, uy = laea(lo, la)
    sx = (qx.max() - qx.min()) / (ux.max() - ux.min())
    sy = (qy.max() - qy.min()) / (uy.max() - uy.min())
    print("Maßstab aus dem Rahmen: x %.2f m, y %.2f m je Gittereinheit "
          "(aus den Flaechen %.2f) — %.2f %% Unterschied"
          % (1 / sx, 1 / sy, 1 / skala, 100 * abs(sx / sy - 1)))
    ax = ux.min() - qx.min() / sx          # x_laea = ax + qx/sx
    ay = uy.max() + qy.min() / sy          # y_laea = ay - qy/sy

    def nach_gitter(lon, lat):
        x, y = laea(lon, lat)
        return (x - ax) * sx, (ay - y) * sy

    skala = (sx + sy) / 2                  # fuer Laengen in Metern

    # Probe aufs Ganze: neun Staedte, deren Lage bekannt ist, muessen im
    # Ring ihres eigenen Kreises landen. Das prueft Entpackung, Projektion,
    # Maßstab und Richtung in einem.
    proben = [("11000", "Berlin", 13.405, 52.52), ("02000", "Hamburg", 10.00, 53.55),
              ("09162", "Muenchen", 11.575, 48.137), ("05315", "Koeln", 6.96, 50.938),
              ("06412", "Frankfurt", 8.68, 50.11), ("08111", "Stuttgart", 9.18, 48.776),
              ("14713", "Leipzig", 12.374, 51.34), ("01001", "Flensburg", 9.44, 54.78),
              ("09262", "Passau", 13.44, 48.575)]
    gut = 0
    for ags, name, plon, plat in proben:
        bi = [i for i, k in enumerate(stamm) if k[0] == ags]
        if not bi:
            print("   Probe %s: kein Kreis %s" % (name, ags))
            continue
        bi = bi[0]
        px, py = nach_gitter([plon], [plat])
        drin = False
        for r in kreise[bi]:
            rx, ry = qx[r].astype(float), qy[r].astype(float)
            c = False
            j = len(rx) - 1
            for i in range(len(rx)):
                if ((ry[i] > py[0]) != (ry[j] > py[0])) and (
                        px[0] < (rx[j] - rx[i]) * (py[0] - ry[i]) / (ry[j] - ry[i] + 1e-30) + rx[i]):
                    c = not c
                j = i
            drin ^= c
        gut += drin
        if not drin:
            xs = np.concatenate([qx[r] for r in kreise[bi]])
            ys = np.concatenate([qy[r] for r in kreise[bi]])
            print("   Probe %s liegt NICHT im Kreis %s: Stadt (%.0f, %.0f), "
                  "Kreis-Mittel (%.0f, %.0f), %.1f km daneben"
                  % (name, stamm[bi][1], px[0], py[0], xs.mean(), ys.mean(),
                     math.hypot(xs.mean() - px[0], ys.mean() - py[0]) / skala / 1000))
    print("Probe: %d von %d Staedten liegen im Ring ihres Kreises"
          % (gut, len(proben)))
    if gut < len(proben) - 1:
        sys.exit("Die Zuordnung Gitter <-> Geografie stimmt nicht")

    # ---- Bevoelkerung 2024
    bev = {}
    for r in csv.DictReader(open(CSV, encoding="utf-8")):
        if r["jahr"] == JAHR:
            bev[r["kreis_ags"]] = float(r["bevoelkerung"])
    fehlen = [k[0] for k in stamm if k[0] not in bev]
    print("Bevoelkerung %s: %d Kreise, %.1f Millionen%s"
          % (JAHR, len(bev), sum(bev.values()) / 1e6,
             "" if not fehlen else ", ohne %d: %s" % (len(fehlen), fehlen[:5])))

    # ---- Bahnhoefe des Kerns ins Gitter
    S = json.load(open(os.path.join(Z, "stationen.json")))["stationen"]
    kern = json.load(open(os.path.join(Z, "kern.json")))["kern_de"]
    slon = np.array([S[i]["lon"] for i in kern])
    slat = np.array([S[i]["lat"] for i in kern])
    sgx, sgy = nach_gitter(slon, slat)

    # Gitterindex fuer die Naechster-Bahnhof-Suche
    ZELL = RASTER_KM * 1000 * skala * 4
    gk = {}
    for i in range(len(kern)):
        gk.setdefault((int(sgx[i] // ZELL), int(sgy[i] // ZELL)), []).append(i)

    def naechster(px, py):
        cx, cy = int(px // ZELL), int(py // ZELL)
        for r in range(1, 40):
            kand = [i for dx in range(-r, r + 1) for dy in range(-r, r + 1)
                    for i in gk.get((cx + dx, cy + dy), ())]
            if kand:
                d = (sgx[kand] - px) ** 2 + (sgy[kand] - py) ** 2
                # eine Ringbreite mehr, damit die Ecke nicht die Kante schlaegt
                kand2 = [i for dx in range(-r - 1, r + 2) for dy in range(-r - 1, r + 2)
                         for i in gk.get((cx + dx, cy + dy), ())]
                d2 = (sgx[kand2] - px) ** 2 + (sgy[kand2] - py) ** 2
                return kand2[int(np.argmin(d2))]
        return -1

    # ---- Rastern und verteilen
    schritt = RASTER_KM * 1000 * skala
    gewicht = np.zeros(len(kern))
    ohne, zellen = 0.0, 0
    for gi, ringe in enumerate(kreise):
        ags = stamm[gi][0]
        if ags not in bev:
            continue
        # Punkt-in-Polygon ueber alle Ringe des Kreises, Loecher per Vorzeichen
        xs = np.concatenate([qx[r] for r in ringe])
        ys = np.concatenate([qy[r] for r in ringe])
        x0, x1 = xs.min(), xs.max()
        y0, y1 = ys.min(), ys.max()
        gx_ = np.arange(x0 + schritt / 2, x1 + schritt / 2, schritt)
        gy_ = np.arange(y0 + schritt / 2, y1 + schritt / 2, schritt)
        if len(gx_) == 0:
            gx_ = np.array([(x0 + x1) / 2])
        if len(gy_) == 0:
            gy_ = np.array([(y0 + y1) / 2])
        PX, PY = np.meshgrid(gx_, gy_)
        PX = PX.ravel(); PY = PY.ravel()
        drin = np.zeros(len(PX), dtype=bool)
        for r in ringe:
            rx, ry = qx[r].astype(float), qy[r].astype(float)
            c = np.zeros(len(PX), dtype=bool)
            j = len(rx) - 1
            for i in range(len(rx)):
                schnitt = ((ry[i] > PY) != (ry[j] > PY)) & (
                    PX < (rx[j] - rx[i]) * (PY - ry[i]) / (ry[j] - ry[i] + 1e-30) + rx[i])
                c ^= schnitt
                j = i
            drin ^= c
        treffer = np.where(drin)[0]
        if len(treffer) == 0:                      # winziger Kreis: Mittelpunkt
            treffer = np.array([len(PX) // 2])
        anteil = bev[ags] / len(treffer)
        zellen += len(treffer)
        for t in treffer:
            b = naechster(PX[t], PY[t])
            if b < 0:
                ohne += anteil
            else:
                gewicht[b] += anteil
    print("gerastert: %d Zellen a %.1f km, %.1f Millionen Menschen verteilt, "
          "%.0f ohne Bahnhof" % (zellen, RASTER_KM, gewicht.sum() / 1e6, ohne))

    ordn = np.argsort(-gewicht)
    nam = [S[i]["name"] for i in kern]
    print("\n--- die 15 Bahnhoefe mit dem groessten Einzugsgebiet ---")
    for i in ordn[:15]:
        print("  %7.0f  %s" % (gewicht[i], nam[i]))
    print("--- die 5 kleinsten ---")
    for i in ordn[-5:]:
        print("  %7.0f  %s" % (gewicht[i], nam[i]))
    print("\nVerteilung: Median %.0f, Mittel %.0f, 0 bei %d Bahnhoefen"
          % (np.median(gewicht), gewicht.mean(), int((gewicht == 0).sum())))

    json.dump(dict(jahr=JAHR, raster_km=RASTER_KM,
                   summe=float(gewicht.sum()), ohne=float(ohne),
                   gitter_meter=float(1 / skala),
                   flaeche_median_fehler=float(np.median(fehl)),
                   gewicht=[float(v) for v in gewicht]),
              open(os.path.join(Z, "menschen.json"), "w"))
    print("geschrieben: zwischen/menschen.json")


if __name__ == "__main__":
    main()
