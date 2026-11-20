"""Plausibilität einer Szene aus ihrer Szenenkarte (audio/<szene>_karte.json) prüfen.

Aufruf: python3 pipeline/pruefe_karte.py audio/wald_karte.json [--json]

Je Gruppe: Zahl der Quellen, Entfernung zum Kopf (min/median/max), höchste Geschwindigkeit,
Höhe. Grenzen je Gruppe aus `pruefung` in der Szene (szenen/<szene>.json, je Gruppe
{tempo_max, entfernung: [min, max], hoehe: [min, max]}) oder grobe Vorgaben. Dazu eine Zeitleiste
der seltenen Ereignisse (Gruppen mit wenigen Quellen) in Dateizeit, mit Richtung und Entfernung,
und eine Warnung, wenn zwei Höhepunkte näher als 8 s beieinanderliegen.
"""
import json, sys
from pathlib import Path
import numpy as np

WURZEL = Path(__file__).resolve().parent.parent


def richtung(v):
    """Grobe Richtung im Hörerbezug (x vorn, y links) als Wort."""
    w = np.degrees(np.arctan2(v[1], v[0])) % 360
    namen = ['vorn', 'vorn links', 'links', 'hinten links', 'hinten', 'hinten rechts', 'rechts', 'vorn rechts']
    return namen[int(((w + 22.5) % 360) // 45)]


def main():
    pfad = Path(sys.argv[1])
    k = json.loads(pfad.read_text())
    sz_pfad = WURZEL / 'szenen' / f"{k['szene']}.json"
    sz = json.loads(sz_pfad.read_text()) if sz_pfad.exists() else {}
    grenzen = {g['name']: g.get('pruefung', {}) for g in sz.get('gruppen', [])}
    kopf = np.array(k['kopf'])
    D = k['dauer']
    aus, warnungen, selten = [], [], []
    for gr in k['gruppen']:
        qs = [q for q in k['quellen'] if q['g'] == gr['name'] and q.get('art') != 'echo']
        if not qs and gr['typ'] == 'musik':
            continue
        if not qs:
            warnungen.append(f"{gr['name']}: keine Quelle – Gruppe ist stumm")
            continue
        d_all, v_max, h_all = [], 0.0, []
        for q in qs:
            p = np.array(q['p'], float)
            d = np.linalg.norm(p - kopf, axis=1)
            d_all += d.tolist()
            h_all += p[:, 2].tolist()
            if len(p) > 1:
                v = np.linalg.norm(np.diff(p[:, :2], axis=0), axis=1) / q['dt']
                v_max = max(v_max, float(v.max()))
        d_all = np.array(d_all)
        z = dict(gruppe=gr['name'], quellen=len(qs), entf_min=round(float(d_all.min()), 1), entf_median=round(float(np.median(d_all)), 1),
                 entf_max=round(float(d_all.max()), 1), tempo_max=round(v_max, 1), hoehe=[round(min(h_all), 1), round(max(h_all), 1)])
        gz = grenzen.get(gr['name'], {})
        if gr['typ'] != 'bett' and v_max > gz.get('tempo_max', 40.0):
            warnungen.append(f"{gr['name']}: Tempo bis {v_max:.1f} m/s (Grenze {gz.get('tempo_max', 40.0)})")
        if 'entfernung' in gz and (d_all.min() < gz['entfernung'][0] - 0.5 or d_all.max() > gz['entfernung'][1] + 0.5):
            warnungen.append(f"{gr['name']}: Entfernung {d_all.min():.1f}–{d_all.max():.1f} m außerhalb {gz['entfernung']}")
        if d_all.min() < 0.3:
            warnungen.append(f"{gr['name']}: Quelle bis auf {d_all.min():.2f} m am Kopf")
        aus.append(z)
        if len(qs) <= 8 and gr['typ'] != 'bett':
            for q in qs:
                p = np.array(q['p'], float)
                i = int(np.argmin(np.linalg.norm(p - kopf, axis=1)))
                t = (q['t0'] + i * q['dt'] - k['start_s']) % D
                selten.append((t, gr['name'], round(float(np.linalg.norm(p[i] - kopf)), 1), richtung(p[i] - kopf)))
    selten.sort()
    nah = [x for x in selten if x[2] < 60]          # Höhepunkt = selten und nah genug, um aufzufallen
    for (t1, g1, *_), (t2, g2, *_) in zip(nah, nah[1:]):
        if t2 - t1 < 8 and g1 != g2:
            warnungen.append(f"zwei Höhepunkte dicht beieinander: {g1} {t1:.0f} s und {g2} {t2:.0f} s")
    if '--json' in sys.argv:
        print(json.dumps(dict(gruppen=aus, selten=selten, warnungen=warnungen), ensure_ascii=False, indent=1))
        return
    print(f"{k['titel']} – {D:.0f} s, {len(k['quellen'])} Quellen")
    for z in aus:
        print(f"  {z['gruppe']:16s} {z['quellen']:4d} Quellen  Entfernung {z['entf_min']:7.1f} / {z['entf_median']:7.1f} / {z['entf_max']:8.1f} m"
              f"  Tempo bis {z['tempo_max']:5.1f} m/s  Höhe {z['hoehe'][0]}–{z['hoehe'][1]} m")
    print('Seltene Ereignisse (Dateizeit, nächster Punkt):')
    for t, g, d, r in selten:
        print(f"  {int(t // 60)}:{int(t % 60):02d}  {g:14s} {d:7.1f} m  {r}")
    print('Warnungen:' if warnungen else 'Keine Warnungen.')
    for w in warnungen:
        print('  !', w)


if __name__ == '__main__':
    main()
