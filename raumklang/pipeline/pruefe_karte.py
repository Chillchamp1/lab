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
    # liegt der Hörer quer (liegt_grad), Orte in seinen Bezug drehen: x = wohin die Füße zeigen, y = links
    a = np.radians(k.get('liegt_grad', 0.0))
    if a:
        c, s_ = np.cos(a), np.sin(a)
        for q in k['quellen']:
            P = np.array(q['p'], float) - kopf
            P[:, 0], P[:, 1] = P[:, 0] * c + P[:, 1] * s_, -P[:, 0] * s_ + P[:, 1] * c
            q['p'] = (P + kopf).tolist()
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
    # ---- Komposition: wohin zieht die Szene die Aufmerksamkeit? Nur Einzelereignisse (keine Flächen,
    # keine Echos). Pegel je Ereignis geschätzt aus Bezugspegel und Entfernung, je Gruppe so verschoben,
    # dass ihre lauten Ereignisse beim Zielpegel der Gruppe liegen.
    F = 10.0
    nf = int(np.ceil(D / F))
    links, rechts, zonen = np.zeros(nf), np.zeros(nf), np.zeros((nf, 3))
    for gr in k['gruppen']:
        qs = [q for q in k['quellen'] if q['g'] == gr['name'] and q.get('art') != 'echo' and q['dt'] < 1]
        if not qs or gr['typ'] == 'bett' or gr.get('ziel_lufs') is None:
            continue
        roh = []
        for q in qs:
            p = np.array(q['p'], float)
            d = np.maximum(np.linalg.norm(p - kopf, axis=1), 0.3)
            i = int(np.argmin(d))
            roh.append((q, p[i], d[i], q.get('pegel', 0.0) - 20 * np.log10(d[i])))
        bezug = np.percentile([r[3] for r in roh], 95)
        for q, p, d, x in roh:
            e = 10 ** ((gr['ziel_lufs'] + x - bezug) / 10) * max(len(q['p']) * q['dt'], 0.3)
            f = int(((q['t0'] - k['start_s']) % D) // F) % nf
            seite = (p[1] - kopf[1]) / d                      # +1 ganz links, −1 ganz rechts
            links[f] += e * (0.5 + 0.5 * seite)
            rechts[f] += e * (0.5 - 0.5 * seite)
            zonen[f, 0 if d < 4 else 1 if d < 30 else 2] += e
    ges = links + rechts
    komposition = None
    if ges.sum() > 0:
        anteil_l = float(links.sum() / ges.sum())
        dom = np.where(ges > 0, (links - rechts) / np.maximum(ges, 1e-30), 0)
        lauf, laengste = 0, 0
        for v in np.r_[dom, dom]:                              # über die Schleifennaht hinweg
            lauf = lauf + 1 if abs(v) > 0.6 and np.sign(v) == np.sign(dom[np.argmax(np.abs(dom))]) else 0
            laengste = max(laengste, lauf)
        zone = np.argmax(zonen, 1)
        zanteil = [float((zone[ges > 0] == j).mean()) for j in range(3)]
        seite_f = np.sign(np.where(np.abs(dom) > 0.2, dom, 0))
        wechsel = int((np.diff(zone) != 0).sum() + (np.diff(seite_f) != 0).sum())
        komposition = dict(links_prozent=round(100 * anteil_l), laengste_einseitig_s=int(min(laengste, nf) * F),
                           fenster_nah_mittel_fern=[round(100 * z) for z in zanteil], fokuswechsel_je_minute=round(wechsel / (D / 60), 1))
        if not 0.35 <= anteil_l <= 0.65:
            warnungen.append(f"Schieflage: {100 * anteil_l:.0f} % der Ereignisenergie kommt von links")
        if komposition['laengste_einseitig_s'] > 90:
            warnungen.append(f"{komposition['laengste_einseitig_s']} s am Stück fast nur eine Seite")
        if max(zanteil) > 0.85:
            warnungen.append(f"eine Entfernungszone beherrscht {100 * max(zanteil):.0f} % der Zeit – wenig Wechsel zwischen nah und fern")
    # ---- Wiederholung: zu wenig Material für die Zahl der Ereignisse?
    for n, w in (k.get('wiederholung') or {}).items():
        if w['haeufigster'] > max(8, D / 45) and not next((g_ for g_ in sz.get('gruppen', []) if g_['name'] == n), {}).get('wiederholung_egal'):
            warnungen.append(f"{n}: {w['ereignisse']} Ereignisse aus nur {w['verschiedene']} Ausschnitten, einer davon {w['haeufigster']}-mal")
    if '--json' in sys.argv:
        print(json.dumps(dict(gruppen=aus, selten=selten, komposition=komposition, warnungen=warnungen), ensure_ascii=False, indent=1))
        return
    print(f"{k['titel']} – {D:.0f} s, {len(k['quellen'])} Quellen")
    for z in aus:
        print(f"  {z['gruppe']:16s} {z['quellen']:4d} Quellen  Entfernung {z['entf_min']:7.1f} / {z['entf_median']:7.1f} / {z['entf_max']:8.1f} m"
              f"  Tempo bis {z['tempo_max']:5.1f} m/s  Höhe {z['hoehe'][0]}–{z['hoehe'][1]} m")
    if komposition:
        z = komposition['fenster_nah_mittel_fern']
        print(f"Komposition (Einzelereignisse, 10-s-Fenster): links {komposition['links_prozent']} % / rechts {100 - komposition['links_prozent']} %; "
              f"längste einseitige Strecke {komposition['laengste_einseitig_s']} s; vorn liegt nah {z[0]} % / mittel {z[1]} % / fern {z[2]} % der Zeit; "
              f"{komposition['fokuswechsel_je_minute']} Fokuswechsel je Minute")
    w = k.get('wiederholung') or {}
    if w:
        print('Wiederholung (Ereignisse / verschiedene Ausschnitte / häufigster):', '; '.join(f"{n} {v['ereignisse']}/{v['verschiedene']}/{v['haeufigster']}" for n, v in w.items()))
    print('Seltene Ereignisse (Dateizeit, nächster Punkt):')
    for t, g, d, r in selten:
        print(f"  {int(t // 60)}:{int(t % 60):02d}  {g:14s} {d:7.1f} m  {r}")
    print('Warnungen:' if warnungen else 'Keine Warnungen.')
    for w in warnungen:
        print('  !', w)


if __name__ == '__main__':
    main()
