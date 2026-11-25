"""Binaurale Schwebung aus einem Naturgeräusch (Regen, Wellen) statt aus Tönen.

Beide Ohren bekommen dasselbe Geräusch; im rechten Ohr ist es als Ganzes um Δ Hz nach oben
verschoben (Einseitenband-Verschiebung über das analytische Signal: jede Teilfrequenz f wird zu
f + Δ, nicht zu f · Faktor). Zwischen den Ohren dreht sich damit die Phase aller Anteile Δ-mal je
Sekunde – das Gehirn hört ein sanftes Pulsieren bzw. Wandern des Geräuschs im Kopf. Wirksam sind
dafür die Anteile unter ~1 kHz (darüber folgt das Gehör der Feinstruktur nicht mehr); Regen liegt
vor allem darüber, deshalb lässt sich der Bereich 150–900 Hz anheben (`--anheben_db`).

Das Geräusch muss dafür in beiden Ohren gleich sein – es liegt also im Kopf und ist nicht räumlich
gerendert. Nur mit Kopfhörern. Die Schleife geht auf: Verschiebung und Filter rechnen kreisförmig,
Δ · Dauer ist eine ganze Zahl.

Aufruf: python3 natur_schwebung.py regen|wellen aus.mp3 [--dauer 30] [--hz 8] [--anheben_db 6]
"""
import argparse, json, subprocess, sys
import numpy as np
from pathlib import Path

sys.argv_alt, sys.argv = sys.argv, sys.argv[:1]          # szene.py liest sonst unsere Argumente
import szene
import material as mat
sys.argv = sys.argv_alt
FS = szene.FS
WURZEL = szene.WURZEL


def mono_schleife(art, n, rng):
    """Kreisförmige Mono-Schleife aus dem Material der Szenen."""
    bib = szene.Bibliothek(json.loads((WURZEL / 'quellen.json').read_text()))
    if art == 'regen':
        g = {x['name']: x for x in json.loads((WURZEL / 'szenen' / 'wald.json').read_text())['gruppen']}
        y = bib.flickwerk(g['regen']['sammlung'], n, rng)
        y = y / np.sqrt((y ** 2).mean())
        y2 = bib.flickwerk(g['regen_blaetter']['sammlung'], n, rng)       # Trommeln auf großen Blättern: mehr Tiefen
        return y + 0.8 * y2 / np.sqrt((y2 ** 2).mean()), bib
    g = {x['name']: x for x in json.loads((WURZEL / 'szenen' / 'boot.json').read_text())['gruppen']}
    y = bib.flickwerk(g['see_fern']['sammlung'], n, rng)
    y = 0.5 * y / np.sqrt((y ** 2).mean())
    ev = bib.ereignisse(g['wellen']['sammlung'])
    t = rng.uniform(0, 2)
    while t < n / FS:                                          # einzelne Wellen darüber, kreisförmig eingesetzt
        e = ev[int(rng.integers(len(ev)))]['sig']
        idx = (int(t * FS) + np.arange(len(e))) % n
        np.add.at(y, idx, e / (np.sqrt((e ** 2).mean()) + 1e-12) * 0.6 * 10 ** (rng.normal(0, 3) / 20))
        t += rng.exponential(2.2)
    return y, bib


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('art', choices=['regen', 'wellen'])
    ap.add_argument('aus')
    ap.add_argument('--dauer', type=float, default=30.0)
    ap.add_argument('--hz', type=float, default=8.0)
    ap.add_argument('--anheben_db', type=float, default=6.0, help='Anhebung des Bereichs 150–900 Hz, der die Schwebung trägt')
    ap.add_argument('--lufs', type=float, default=-23.0)
    ap.add_argument('--band', type=float, nargs=2, help='nur dieses Band verschieben (Hz), der Rest bleibt in beiden Ohren gleich')
    ap.add_argument('--tiefe', type=float, default=1.0, help='Anteil des verschobenen Signals im rechten Ohr (1 = volle Drehung; '
                    '0,2 = sanftes Schimmern: die Phase pendelt nur um ±15° statt sich ganz zu drehen)')
    a = ap.parse_args()
    n = int(round(a.dauer * FS))
    x, bib = mono_schleife(a.art, n, np.random.default_rng(5))
    # kreisförmig im Frequenzbereich: Anhebung des tragenden Bereichs, dann analytisches Signal
    X = np.fft.fft(x)
    f = np.abs(np.fft.fftfreq(n, 1 / FS))
    glocke = np.exp(-0.5 * (np.log2(np.maximum(f, 1) / 370) / 0.85) ** 2)       # um 370 Hz, etwa 150–900 Hz
    X *= 10 ** (a.anheben_db * glocke / 20)
    X[f < 40] = 0
    h = np.zeros(n)
    h[0] = 1
    h[1:(n + 1) // 2] = 2
    if n % 2 == 0:
        h[n // 2] = 1
    d = round(a.hz * a.dauer) / a.dauer                     # ganze Zahl von Umläufen je Schleife
    t = np.arange(n) / FS
    # Die volle Verschiebung des ganzen Geräuschs lässt sein Klangbild Δ-mal je Sekunde durch den Kopf kreisen
    # (Benjamin: „wie ein Lasso über dem Kopf“, nicht entspannend). Sanfter: nur ein tiefes Band und nur
    # anteilig verschieben – dann pendelt die Phase zwischen den Ohren, statt sich zu drehen.
    if a.band:
        fenster = 1 / (1 + (a.band[0] / np.maximum(f, 1)) ** 6) / (1 + (f / a.band[1]) ** 6)
    else:
        fenster = np.ones(n)
    tief = np.fft.ifft(X * fenster * h)
    rest = np.fft.ifft(X * (1 - fenster)).real
    links = rest + tief.real
    rechts = rest + ((1 - a.tiefe) * tief + a.tiefe * tief * np.exp(2j * np.pi * d * t)).real
    y = np.stack([links, rechts]).astype(np.float32)
    y *= 10 ** ((a.lufs - szene.lautheit(y)) / 20)
    y, weg = szene.begrenzer_kreis(y, -1.0)
    szene.schreibe(Path(a.aus), y, '224k')
    # Kontrolle: das rechte Ohr um Δ zurückverschoben muss wieder dem linken gleichen (Korrelation ≈ 1);
    # um einen anderen Betrag zurückverschoben nicht. (Die Phase direkt abzulesen geht bei Rauschen nicht:
    # wo die Hüllkurve einbricht, springt sie.)
    def zurueck(hz):
        r_ = (np.fft.ifft(np.fft.fft(y[1]) * h) * np.exp(-2j * np.pi * hz * t)).real
        return round(float(np.corrcoef(r_, y[0])[0, 1]), 3)
    aus = dict(art=a.art, dauer=a.dauer, schwebung_hz=d, tiefe=a.tiefe, band=a.band,
               links_rechts=round(float(np.corrcoef(y[0], y[1])[0, 1]), 3), begrenzt_db=round(float(weg), 1), quellen=len(bib.benutzt))
    if a.tiefe == 1.0 and not a.band:
        aus.update(gleich_nach_rueckverschiebung=zurueck(d), gegenprobe_andere_verschiebung=zurueck(d + 3))
    print(json.dumps(aus))


if __name__ == '__main__':
    main()
