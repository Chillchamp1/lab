#!/usr/bin/env python3
"""Die Reisezeitmatrix: uebersetzt und startet den C-Teil.

Gerechnet wird in C, weil es 4.815 mal 12 Fahrplanauskuenfte sind und jede
einmal linear ueber 279.680 Fahrplanabschnitte laeuft — zusammen rund
16 Milliarden Schritte. In Python waere das ein Nachmittag, in C sind es
dreizehn Sekunden auf vier Kernen.

Hier wird nur ausgewaehlt, wer Quelle sein soll: die Bahnhoefe in
Deutschland. Gerechnet wird ueber das ganze Netz samt Auslandsbahnhoefen —
eine Fahrt von Freilassing nach Berchtesgaden geht ueber Salzburg, und das
soll sie duerfen.
"""
import json, os, struct, subprocess, sys

HIER = os.path.dirname(os.path.abspath(__file__))
Z = os.path.join(HIER, "zwischen")


def main():
    quelle = os.path.join(Z, "stationen.json")
    if not os.path.exists(quelle):
        sys.exit("zwischen/stationen.json fehlt — erst 01_netz.py laufen lassen")
    S = json.load(open(quelle))["stationen"]
    de = [i for i, b in enumerate(S) if b["de"]]
    with open(os.path.join(Z, "deutsch.bin"), "wb") as f:
        f.write(struct.pack("<I", len(de)))
        f.write(struct.pack("<%dI" % len(de), *de))
    print("%d deutsche Bahnhoefe von %d — Matrix %.1f MB"
          % (len(de), len(S), len(de) ** 2 * 2 / 2 ** 20))

    exe = os.path.join(Z, "zeiten")
    quell = os.path.join(HIER, "02_zeiten.c")
    if not os.path.exists(exe) or os.path.getmtime(quell) > os.path.getmtime(exe):
        print("uebersetze 02_zeiten.c")
        subprocess.check_call(["cc", "-O2", "-std=c99", "-o", exe, quell,
                               "-lpthread", "-lm"])
    subprocess.check_call([exe, os.path.join(Z, "netz.bin"),
                           os.path.join(Z, "deutsch.bin"),
                           os.path.join(Z, "zeiten.bin")])


if __name__ == "__main__":
    main()
