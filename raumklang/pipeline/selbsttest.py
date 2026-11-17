"""Schnelle Selbsttests der Pipeline (Laufzeit wenige Sekunden). Vor jedem vollen Rendern laufen lassen:
    python3 pipeline/selbsttest.py [--hrtf pfad.sofa]
Jeder Test prüft einen Fehler, den es schon einmal gab (siehe Raumklang-Leitfaden im Fokus)."""
import sys, argparse
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parent))
from kern import FS, Spur, kreisfaltung
from hrtf import HRTF, richtung
import szene
from boot import Boot

WURZEL = Path(__file__).resolve().parent.parent


def schwerpunkt(x):
    e = (np.atleast_2d(x) ** 2).sum(0)
    return float((e * np.arange(len(e))).sum() / e.sum() / FS)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--hrtf', default=str(WURZEL / 'material' / 'hrtf' / 'subject_040.sofa'))
    a = ap.parse_args()
    fehler = []
    D = 100.0
    hrtf = HRTF(a.hrtf)
    boot = Boot({}, D)
    kx = szene.Kontext(hrtf, boot, None, D, np.random.default_rng(0))

    # 1) Ereignis und sein Hallanteil liegen an der richtigen Zeit (Fehler bis 17.11.: Hall immer bei 0 s)
    sig = (np.random.default_rng(1).normal(size=FS // 2) * 0.1).astype(np.float32)
    spur, bus = Spur(D), Spur(D, 1)
    szene.rendere_quelle(kx, spur, bus, sig, 50.0, lambda t: np.tile([10.0, 5.0, 3.0], (len(t), 1)), True, 1.0, 1.0)
    for name, x in (('Direktschall', spur.x), ('Hallanteil', bus.x)):
        s = schwerpunkt(x)
        if not 50.0 <= s <= 50.6:
            fehler.append(f'{name} liegt bei {s:.2f} s statt bei 50,0–50,6 s')

    # 2) Kreisspur: was über das Ende hinausragt, erscheint am Anfang
    spur = Spur(D)
    spur.addiere(np.ones((2, FS)), int((D - 0.5) * FS))
    if abs(spur.x[:, :FS // 2].sum() - FS) > 1 or abs(spur.x[:, -FS // 2:].sum() - FS) > 1:
        fehler.append('Kreisspur faltet das Ende nicht korrekt in den Anfang')
    y = kreisfaltung(np.r_[np.zeros(int(D * FS) - 10), np.ones(10)], np.ones(100))
    if abs(y.sum() - 1000) > 1e-6:
        fehler.append('Kreisfaltung verliert Energie an der Naht')

    # 3) HRTF-Interpolation ist stetig (Fehler bis 17.11.: Sprünge bis 65 µs bei Nachbarwechsel)
    az = np.arange(0, 360, 0.1)
    H = hrtf.filter(richtung(az, np.full_like(az, 20.0)))
    b = (hrtf.freq > 300) & (hrtf.freq < 1500)
    ph = np.unwrap(np.angle(H[:, 0, b] * np.conj(H[:, 1, b])), axis=1)
    itd = -np.polyfit(2 * np.pi * hrtf.freq[b], ph.T, 1)[0] * 1e6
    if np.abs(np.diff(itd)).max() > 10:
        fehler.append(f'ITD springt um {np.abs(np.diff(itd)).max():.0f} µs je 0,1°')

    # 4) Bewegung ist periodisch über die Szenendauer
    w0, w1 = boot.winkel(np.array([0.0])), boot.winkel(np.array([D]))
    if max(abs(float(u[0] - v[0])) for u, v in zip(w0, w1)) > 1e-9:
        fehler.append('Bootsbewegung ist nicht periodisch')
    vg = szene.Vogel(np.random.default_rng(2), D, {})
    if np.abs(vg.ort(np.array([0.0])) - vg.ort(np.array([D]))).max() > 1e-6:
        fehler.append('Möwenbahn ist nicht periodisch')

    print('Selbsttest:', 'bestanden' if not fehler else 'FEHLER')
    for f in fehler:
        print('  -', f)
    sys.exit(1 if fehler else 0)


if __name__ == '__main__':
    main()
