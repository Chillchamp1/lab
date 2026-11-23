"""Liest die Notenfolge einer Melodie aus einer Aufnahme (tonale Spitzen über dem Rauschen) und
schreibt sie als Liste [Beginn s, Ende s, Frequenz Hz] – Grundlage für die binaurale Schwebung,
die die Melodie sauber neu spielt (die Aufnahme selbst lässt sich nicht verlustfrei vom Meer trennen).
Aufruf: python3 melodie.py <quelle-id> [mindestdauer_s]"""
import json, sys
import numpy as np
from pathlib import Path
from scipy.signal import stft
from scipy.ndimage import median_filter
import material as mat

WURZEL = Path(__file__).resolve().parent.parent


def noten(x, fs, fmin=150, fmax=1200, schwelle_db=12, mindauer=0.15):
    f, t, Z = stft(x, fs, nperseg=8192, noverlap=8192 - 1024)
    A = 20 * np.log10(np.abs(Z) + 1e-9)
    ton = (A - median_filter(A, size=(41, 1))) > schwelle_db
    sel = (f > fmin) & (f < fmax)
    fi = f[sel]
    folge = []
    for j in range(A.shape[1]):
        m = ton[sel, j]
        if not m.any():
            folge.append(0.0)
            continue
        k = int(np.argmax(np.where(m, A[sel, j], -999)))
        # auf den nächsten Halbton runden (die Musik ist gestimmt, die Bins sind 5,4 Hz breit)
        folge.append(440 * 2 ** (round(12 * np.log2(fi[k] / 440)) / 12))
    aus, cur = [], None
    for tt, fr in zip(t, folge):
        if fr and cur and fr == cur[2]:
            cur[1] = tt
        else:
            if cur and cur[1] - cur[0] >= mindauer:
                aus.append(cur)
            cur = [tt, tt, fr] if fr else None
    if cur and cur[1] - cur[0] >= mindauer:
        aus.append(cur)
    return [[round(a, 2), round(b, 2), round(fr, 2)] for a, b, fr in aus], float(len(x) / fs)


if __name__ == '__main__':
    q = {e['id']: e for e in json.loads((WURZEL / 'quellen.json').read_text())}[sys.argv[1]]
    x = mat.lade(WURZEL / 'material' / 'roh' / q['lokal'], 'mitte')
    n, dauer = noten(x, mat.FS, mindauer=float(sys.argv[2]) if len(sys.argv) > 2 else 0.15)
    print(json.dumps(dict(quelle=sys.argv[1], dauer=round(dauer, 2), noten=n)))
