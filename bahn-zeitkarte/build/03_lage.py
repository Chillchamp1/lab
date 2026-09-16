#!/usr/bin/env python3
"""Kern waehlen, Geografie projizieren, das Federmodell rechnen lassen.

Nicht jeder Bahnhof hat eine Lage in der Zeit. Wer in der Spitzenstunde
nichts erreicht, kann auch nicht eingehaengt werden: der Quelldatensatz
laesst den S-Bahn-Verkehr aus, und damit haengen ein paar Nebenbahnen, deren
einziger Anschluss eine S-Bahn-Station ist, voellig frei in der Luft — die
Strohgaeubahn, die Graefenbergbahn, die Muegltztalbahn. Sie kommen heraus,
und es steht im Text, welche.

Projiziert wird kegelkonform nach Lambert mit den Normalparallelen 48,67 und
53,67 Grad — die Projektion, die fuer Deutschland gemacht ist. Sie haelt
Winkel und damit Formen; ein Laengenmaßstab in Kilometern gilt in der Mitte
des Landes genau und an den Raendern auf ein halbes Prozent.
"""
import json, math, os, struct, subprocess, sys
import numpy as np

HIER = os.path.dirname(os.path.abspath(__file__))
Z = os.path.join(HIER, "zwischen")
ANTEIL_MAX = 0.20      # mehr unerreichbare Ziele als das: kein Platz in der Karte
ERDE = 6371.0088


def lambert(lon, lat, p1=48.6666667, p2=53.6666667, p0=51.0, l0=10.5):
    r = math.radians
    n = (math.log(math.cos(r(p1)) / math.cos(r(p2)))
         / math.log(math.tan(math.pi / 4 + r(p2) / 2)
                    / math.tan(math.pi / 4 + r(p1) / 2)))
    F = math.cos(r(p1)) * math.tan(math.pi / 4 + r(p1) / 2) ** n / n
    rho = ERDE * F / np.tan(math.pi / 4 + np.radians(lat) / 2) ** n
    rho0 = ERDE * F / math.tan(math.pi / 4 + r(p0) / 2) ** n
    th = n * np.radians(lon - l0)
    return rho * np.sin(th), rho0 - rho * np.cos(th)


def main():
    for n in ("stationen.json", "zeiten.bin"):
        if not os.path.exists(os.path.join(Z, n)):
            sys.exit("zwischen/%s fehlt — erst 01_netz.py und 02_zeiten.py "
                     "laufen lassen" % n)
    S = json.load(open(os.path.join(Z, "stationen.json")))["stationen"]
    de = [i for i, b in enumerate(S) if b["de"]]
    raw = open(os.path.join(Z, "zeiten.bin"), "rb").read()
    n, t0 = struct.unpack("<II", raw[4:12])
    M = np.frombuffer(raw, dtype=np.uint16, offset=12).reshape(n, n)
    assert n == len(de)

    unerr = (M == 65535)
    anteil = np.maximum(unerr.sum(axis=1), unerr.sum(axis=0)) / (n - 1)
    kern = np.where(anteil <= ANTEIL_MAX)[0]
    raus = np.where(anteil > ANTEIL_MAX)[0]
    print("Kern: %d von %d Bahnhoefen (Schwelle %.0f%% unerreichbare Ziele)"
          % (len(kern), n, 100 * ANTEIL_MAX))
    print("draussen: %d Bahnhoefe" % len(raus))
    for z in raus[np.argsort([-S[de[i]]["halte"] for i in raus])][:14]:
        print("   %5.1f%% unerreichbar  %s" % (100 * anteil[z], S[de[z]]["name"]))
    sub = M[np.ix_(kern, kern)]
    beid = (sub == 65535) & (sub.T == 65535)
    print("im Kern bleiben %.3f%% der Paare ohne Verbindung — sie bekommen keine Feder"
          % (100 * beid.sum() / (len(kern) ** 2 - len(kern))))

    lon = np.array([S[de[z]]["lon"] for z in kern])
    lat = np.array([S[de[z]]["lat"] for z in kern])
    px, py = lambert(lon, lat)
    with open(os.path.join(Z, "kern.bin"), "wb") as f:
        f.write(struct.pack("<I", len(kern)))
        f.write(kern.astype("<u4").tobytes())
    with open(os.path.join(Z, "geo.bin"), "wb") as f:
        f.write(px.astype("<f4").tobytes())
        f.write(py.astype("<f4").tobytes())
    json.dump(dict(kern=[int(v) for v in kern],
                   kern_de=[int(de[z]) for z in kern],
                   raus=[int(de[z]) for z in raus],
                   raus_namen=[S[de[z]]["name"] for z in raus],
                   t0=int(t0), ohne_feder=float(beid.sum() /
                                                (len(kern) ** 2 - len(kern)))),
              open(os.path.join(Z, "kern.json"), "w"), ensure_ascii=False)
    print("Ausdehnung: %.0f x %.0f km" % (np.ptp(px), np.ptp(py)))

    exe = os.path.join(Z, "feder")
    quell = os.path.join(HIER, "03_feder.c")
    if not os.path.exists(exe) or os.path.getmtime(quell) > os.path.getmtime(exe):
        print("uebersetze 03_feder.c")
        subprocess.check_call(["cc", "-O3", "-std=c99", "-o", exe, quell,
                               "-lpthread", "-lm"])
    subprocess.check_call([exe, os.path.join(Z, "zeiten.bin"),
                           os.path.join(Z, "kern.bin"),
                           os.path.join(Z, "geo.bin"),
                           os.path.join(Z, "lage.bin"), "0", "200"])


if __name__ == "__main__":
    main()
