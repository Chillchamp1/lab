"""Aufnahmen einer Szene auf ihre Tauglichkeit prüfen.

Aufruf: python3 pipeline/pruefe_material.py szenen/boot.json [gruppe ...]

Je Aufnahme (so, wie die Szene sie aufbereitet: Filter, Tempo, Entrauschen):
  Band      Frequenzen, zwischen denen 90 % der Energie liegen – schmale Bänder klingen nach Telefon
  Dynamik   Abstand der lauten Stellen (95. Perzentil) zum Grundpegel (20. Perzentil): wenig Abstand
            heißt verrauscht oder dauerhaft belegt
  Nachklang wie schnell der Pegel nach den lautesten Einsätzen fällt (ms für 20 dB): lange Werte
            heißen, dass die Aufnahme ihren eigenen Raum mitbringt (Hall, Echo), der nicht zur Szene passt
Markiert werden Aufnahmen, die in einer Ereignisgruppe aus dem Rahmen fallen.
"""
import json, sys
from pathlib import Path
import numpy as np
from scipy.signal import welch, find_peaks

sys.path.insert(0, str(Path(__file__).resolve().parent))
import material as mat
from szene import Bibliothek, WURZEL
FS = mat.FS


def kennzahlen(x):
    f, P = welch(x, FS, nperseg=4096)
    c = np.cumsum(P) / P.sum()
    lo, hi = f[np.searchsorted(c, 0.05)], f[np.searchsorted(c, 0.95)]
    h = mat.huelle_db(x, 20)
    h = h[h > -120]
    dyn = np.percentile(h, 95) - np.percentile(h, 20)
    # Nachklang: nach den 12 lautesten Einsätzen die Zeit, bis die 20-ms-Hüllkurve 20 dB gefallen ist
    hk = mat.huelle_db(x, 20)
    sp, _ = find_peaks(hk, height=np.percentile(hk, 97), distance=int(0.4 * FS))
    zeiten = []
    for i in sorted(sp, key=lambda i: -hk[i])[:12]:
        rest = hk[i:i + int(1.5 * FS)]
        unter = np.flatnonzero(rest < hk[i] - 20)
        zeiten.append(unter[0] / FS * 1000 if len(unter) else 1500.0)
    return lo, hi, dyn, float(np.median(zeiten)) if zeiten else float('nan')


def main():
    sz = json.loads(Path(sys.argv[1]).read_text())
    nur = set(sys.argv[2:])
    bib = Bibliothek(json.loads((WURZEL / 'quellen.json').read_text()))
    schon = {}
    for g in sz['gruppen']:
        if nur and g['name'] not in nur:
            continue
        listen = [(k, v) for k, v in g.items() if isinstance(v, list) and v and isinstance(v[0], dict) and 'quelle' in v[0]]
        for schluessel, sammlung in listen:
            zeilen = []
            for spez in sammlung:
                roh = {k: v for k, v in spez.items() if k not in ('zerlegen', 'stuecke', 'blende', 'abklingen', 'max_flach', 'resonanz', 'wucht')}
                key = json.dumps(roh, sort_keys=True)
                if key not in schon:
                    schon[key] = kennzahlen(bib.aufnahme(roh).astype(np.float64))
                n_ev = len(bib.ereignisse([spez])) if ('zerlegen' in spez or 'stuecke' in spez) else None
                zeilen.append((spez['quelle'], n_ev, *schon[key]))
            okt = np.array([np.log2(z[3] / max(z[2], 1)) for z in zeilen])
            print(f"\n{g['name']} / {schluessel}")
            for z, o in zip(zeilen, okt):
                marken = []
                if o < 1.5:
                    marken.append('schmales Band')
                flaechig = g['typ'] == 'bett' or any(sp.get('zerlegen', {}).get('methode') == 'taeler' for sp in sammlung)
                if z[4] < 12 and not flaechig:          # Brandung und Flächen rauschen von Natur aus durch
                    marken.append('wenig Dynamik')
                if z[5] > 600 and not flaechig:
                    marken.append('langer Nachklang')
                if z[1] == 0:
                    marken.append('keine Ereignisse')
                ev = '' if z[1] is None else f"{z[1]:3d} Ereign."
                print(f"  {z[0]:28s} {ev:11s} Band {z[2]:6.0f}–{z[3]:6.0f} Hz ({o:.1f} Okt.)  Dynamik {z[4]:4.1f} dB  Nachklang {z[5]:5.0f} ms  {'  ! ' + ', '.join(marken) if marken else ''}")


if __name__ == '__main__':
    main()
