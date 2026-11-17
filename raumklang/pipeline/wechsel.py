"""Zwei Fassungen derselben Szene im Wechsel zusammenschneiden (z. B. Stereo gegen Raumklang).
Aufruf: python3 pipeline/wechsel.py <a.mp3> <b.mp3> <ziel-name> --abschnitte 14 [--ueberblend 0.6]
Beide Fassungen müssen gleich lang sein und dieselben Ereignisse enthalten. Die Abschnittslänge
ergibt sich aus Dauer / Abschnitte (gerade Zahl, damit der Wechsel auch in der Schleife aufgeht)."""
import argparse, json, sys
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parent))
from material import lade, FS
from szene import schreibe, lautheit, nahtpruefung


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('a'); ap.add_argument('b'); ap.add_argument('ziel')
    ap.add_argument('--abschnitte', type=int, default=14)
    ap.add_argument('--ueberblend', type=float, default=0.6)
    a = ap.parse_args()
    x, y = lade(a.a, 'alle'), lade(a.b, 'alle')
    n = min(x.shape[1], y.shape[1])
    x, y = x[:, :n], y[:, :n]
    print('Lautheit A/B:', round(lautheit(x), 2), round(lautheit(y), 2), 'LUFS')
    seg = n / a.abschnitte
    t = np.arange(n)
    # Gewicht von B: 0 in geraden, 1 in ungeraden Abschnitten; gleichstarke Überblendung an den Grenzen (kreisförmig)
    u = (t / seg) % 2                         # 0..2: [0,1) Fassung A, [1,2) Fassung B
    d = np.minimum(np.minimum(u, np.abs(1 - u)), 2 - u)    # Abstand zur nächsten Grenze (in Abschnitten)
    s = np.where(u >= 1, d, -d)               # > 0 in B, < 0 in A
    wb = np.clip(s / (a.ueberblend * FS / seg) + 0.5, 0, 1)
    gb, ga = np.sin(wb * np.pi / 2), np.cos(wb * np.pi / 2)
    z = (x * ga + y * gb).astype(np.float32)
    ziel = Path(a.ziel)
    schreibe(ziel.with_suffix('.mp3'), z, '224k')
    print('Abschnitt', round(seg / FS, 2), 's; Lautheit', round(lautheit(z), 1), 'LUFS; Naht', nahtpruefung(z))
    return round(seg / FS, 3)


if __name__ == '__main__':
    main()
