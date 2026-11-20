"""Prüfstand für ohrmessung.py: erzeugt eine künstliche Messdatei mit bekannter Wahrheit und prüft,
ob die Auswertung sie zurückgewinnt.

    python3 pipeline/ohrmessung_probe.py [--wahr material/hrtf/subject_003.sofa]

Wahrheit: ein anderer CIPIC-Kopf als „deine Ohren“, ein bekannter Kopfhörer-Frequenzgang mit
Streuung zwischen den Sitzen, Lautsprecher mit Färbung, Bodenreflexion nach 3,9 ms und Nachhall,
leicht verschiedene Mikrofone links/rechts. Die Datei hat genau das Format, das messung/index.html
speichert (Schnitt 240 Abtastwerte vor der gemeinsamen Spitze, 4096 lang, Float32 base64).
"""
import sys, json, base64, argparse, subprocess, tempfile
from pathlib import Path
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from hrtf import HRTF, richtung, _minimalphase
import ohrmessung as om

WURZEL = Path(__file__).resolve().parent.parent
FS, IR_LEN, VOR = 48000, 4096, 240
NF = 8192
FL = np.fft.rfftfreq(NF, 1 / FS)


def kurve_ir(db):
    """Minimalphasige Impulsantwort zu einem Betragsgang (dB über FL)."""
    return np.fft.irfft(_minimalphase(10 ** (db / 20), NF), NF)


def glocke(fc, g, q):
    x = np.log2(np.maximum(FL, 1) / fc) * q * 2
    return g * np.exp(-x ** 2)


def hochpass(fc, ordnung=2):
    return 10 * np.log10(1 / (1 + (fc / np.maximum(FL, 1)) ** (2 * ordnung)))


def tiefpass(fc, ordnung=2):
    return 10 * np.log10(1 / (1 + (np.maximum(FL, 1) / fc) ** (2 * ordnung)))


def schneide(l, r):
    ip = int(np.argmax(np.maximum(np.abs(l), np.abs(r))))
    a = max(0, ip - VOR)
    return l[a:a + IR_LEN], r[a:a + IR_LEN]


def falte(a, b):
    n = len(a) + len(b)
    return np.fft.irfft(np.fft.rfft(a, n) * np.fft.rfft(b, n), n)


def packe(x):
    return base64.b64encode(np.asarray(x, '<f4').tobytes()).decode()


def erzeuge(wahr_sofa, pfad, rng):
    wahr = HRTF(str(wahr_sofa), fs=FS, nfft=2048, diffusfeld=False)
    lsp = kurve_ir(hochpass(90) + tiefpass(16000) + glocke(3000, 4, 1) + glocke(700, -3, 1.5))
    mik = {'links': kurve_ir(glocke(10000, 1.0, 0.7)), 'rechts': kurve_ir(glocke(10000, -0.5, 0.7) + glocke(4000, 0.5, 1))}
    lauf = int(0.12 * FS)

    def raum(h, rauschen=1e-5):
        """Direktschall h, Bodenreflexion nach 3,9 ms, Wand nach 9 ms, Nachhall ab 10 ms."""
        n = lauf + 2 * IR_LEN
        y = np.zeros(n)
        for t, g in ((0, 1.0), (3.9e-3, 0.5), (9e-3, 0.3)):
            k = lauf + int(t * FS)
            y[k:k + len(h)] += g * h[:n - k]
        t = np.arange(n - lauf - int(0.01 * FS)) / FS
        y[lauf + int(0.01 * FS):] += rng.normal(size=len(t)) * 0.02 * np.abs(h).max() * 10 ** (-3 * t / 0.3)
        return y + rng.normal(size=n) * rauschen * np.abs(h).max()

    ls = []
    rich = [(w, 0) for w in range(0, 360, 30)] + [(w, 30) for w in (0, 90, 180, 270)] + [(w, -30) for w in (0, 90, 180, 270)]
    for w, e in rich:
        H = wahr.filter(richtung(np.array([w]), np.array([e])))[0]
        hrir = np.fft.irfft(H, 2048, axis=-1)
        sig = {o: raum(falte(falte(hrir[i], lsp), mik[o])) for i, o in enumerate(('links', 'rechts'))}
        l, r = schneide(sig['links'], sig['rechts'])
        ident = ('w' if e == 0 else 'h' if e > 0 else 't') + str(w)
        ls.append({'id': ident, 'winkel': w, 'hoehe': e, 'referenz': False, 'links': packe(l), 'rechts': packe(r)})
    # Referenz: linkes Mikrofon frei an der Kopfmitte, rechtes steckt noch im Ohr (abgeschattet, leise)
    d = np.zeros(64); d[0] = 1
    l = raum(falte(falte(d, lsp), mik['links']))
    r = 0.1 * raum(falte(falte(d, lsp), mik['rechts']))
    l, r = schneide(l, r)
    ls.append({'id': 'ref', 'winkel': None, 'hoehe': None, 'referenz': True, 'links': packe(l), 'rechts': packe(r)})

    # Kopfhörer: Grado-artig (wenig Tiefbass, Spitze um 2,5 kHz, Kerbe 9 kHz), je Ohr leicht anders, 5 Sitze
    kh_wahr = {'links': hochpass(45, 2) + glocke(2500, 6, 0.8) + glocke(9000, -8, 2) + glocke(5000, 3, 1.5),
               'rechts': hochpass(45, 2) + glocke(2600, 5, 0.8) + glocke(8500, -7, 2) + glocke(5200, 4, 1.5)}
    kh = []
    for s in range(5):
        res = {}
        for o in ('links', 'rechts'):
            streu = sum(glocke(fc, rng.normal(0, 0.6 if fc < 5000 else 2.5), 1.5) for fc in (150, 1000, 4000, 7000, 11000))
            y = np.zeros(lauf + 2 * IR_LEN)
            h = falte(kurve_ir(kh_wahr[o] + streu), mik[o])
            y[lauf:lauf + len(h)] += h[:len(y) - lauf]
            res[o] = y + rng.normal(size=len(y)) * 1e-6
        # gemessen wie auf der Seite: links aus dem linken Sweep, rechts aus dem rechten
        l, _ = schneide(res['links'], res['links'] * 0.003)
        r, _ = schneide(res['rechts'], res['rechts'] * 0.003)
        kh.append({'id': f'kh{s + 1}', 'links': packe(l), 'rechts': packe(r), 'uebersprechen_db': -50.0, 'uebersteuert': False})
    datei = {'format': 'raumklang-ohrmessung-1', 'fs': FS, 'ir_laenge': IR_LEN, 'vorlauf': VOR, 'sweep_s': 8, 'f': [20, 20000],
             'erstellt': 'Prüfstand', 'eingang': 'künstlich', 'ausgang': 'künstlich', 'kopfhoerer': kh, 'lautsprecher': ls}
    Path(pfad).write_text(json.dumps(datei), encoding='utf-8')
    return kh_wahr, mik


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--wahr', default=str(WURZEL / 'material' / 'hrtf' / 'subject_003.sofa'))
    ap.add_argument('--basis', default=str(WURZEL / 'material' / 'hrtf' / 'subject_040.sofa'))
    ap.add_argument('--ordner', default=str(WURZEL / 'material' / 'probe'))
    a = ap.parse_args()
    tmp = Path(a.ordner)
    tmp.mkdir(parents=True, exist_ok=True)
    kh_wahr, mik = erzeuge(a.wahr, tmp / 'probe.json', np.random.default_rng(7))
    subprocess.run([sys.executable, str(Path(__file__).parent / 'ohrmessung.py'), str(tmp / 'probe.json'), '--aus', str(tmp / 'aus'),
                    '--basis', a.basis], check=True)
    b = json.loads((tmp / 'aus' / 'bericht.json').read_text(encoding='utf-8'))
    fehler = []

    # 1) Zeitfenster vor der Bodenreflexion (3,9 ms)
    T = b['richtungen']['fenster_ms']
    if not 3.0 <= T <= 3.9:
        fehler.append(f'Zeitfenster {T:.2f} ms, erwartet 3,0–3,9 ms (Reflexion bei 3,9 ms)')

    # 2) Kopfgröße: Laufzeitfaktor wie zwischen Wahrheit und Basis
    rich = b['richtungen']['je_richtung']
    az = np.array([r['az'] for r in rich]); el = np.array([r['el'] for r in rich])
    Cw, itd_w = om.Basis(a.wahr).an(az, el)
    Cb, itd_b = om.Basis(a.basis).an(az, el)
    g = np.abs(itd_b) > 0.2
    s_wahr = float((itd_w[g] * itd_b[g]).sum() / (itd_b[g] ** 2).sum())
    s = b['richtungen']['itd_faktor']
    if abs(s - s_wahr) > 0.02:
        fehler.append(f'Laufzeitfaktor {s:.3f}, wahr {s_wahr:.3f}')

    # 3) Klangfarbe der eigenen HRTF an den Messrichtungen näher an der Wahrheit als die Basis
    Ce, itd_e = om.Basis(tmp / 'aus' / 'eigen_hrtf.sofa').an(az, el)
    bnd = om.band(1000, 14000)
    def abw(X):
        D = X - Cw
        D -= D[..., om.band(500, 4000)].mean(-1, keepdims=True).mean()
        return float(np.sqrt((D[..., bnd] ** 2).mean()))
    e_basis, e_eigen = abw(Cb), abw(Ce)
    if not e_eigen < 0.35 * e_basis:
        fehler.append(f'eigene HRTF weicht {e_eigen:.2f} dB ab, Basis {e_basis:.2f} dB – zu wenig Gewinn')
    itd_fehler = float(np.abs(itd_e - itd_w)[g].max() * 1e3)
    if itd_fehler > 40:
        fehler.append(f'Laufzeitunterschied der eigenen HRTF weicht bis {itd_fehler:.0f} µs ab')

    # 4) Kopfhörer: gemessener Mittelwert trifft die Wahrheit (relativ, 50 Hz–12 kHz)
    d = om.lade(tmp / 'probe.json')
    kh = om.kopfhoerer(d, FS)
    kh_rest = {}
    for o in ('links', 'rechts'):
        wahr_db = np.interp(om.FG, FL[1:], kh_wahr[o][1:]) + 20 * np.log10(np.abs(np.interp(om.FG, FL, np.abs(np.fft.rfft(mik[o], NF)))))
        D = kh[o]['mittel_db'] - wahr_db
        D -= D[om.band(200, 2000)].mean()
        kh_rest[o] = float(np.abs(D[om.band(50, 12000)]).max())
        if kh_rest[o] > 2.5:      # Streuung zwischen Sitzen ±2,5 dB oben ist Absicht; das Mittel darf nicht weiter weg
            fehler.append(f'Kopfhörer {o}: Mittel weicht bis {kh_rest[o]:.1f} dB von der Wahrheit ab')

    # 5) keine Seitenwarnung, Dateien vorhanden
    for n in ('eigen_hrtf.sofa', 'kh_eq_qudelix.txt', 'kh_eq_apo.txt', 'kh_eq_fir_48k.wav', 'uebersicht.png'):
        if not (tmp / 'aus' / n).exists():
            fehler.append(f'{n} fehlt')
    if 'WARNUNG' in (tmp / 'aus' / 'bericht.txt').read_text(encoding='utf-8'):
        fehler.append('Bericht enthält eine Warnung')

    # 6) die Pipeline lädt die eigene HRTF und interpoliert stetig
    h = HRTF(str(tmp / 'aus' / 'eigen_hrtf.sofa'))
    w = np.arange(0, 360, 0.1)
    H = h.filter(richtung(w, np.full_like(w, 20.0)))
    bb = (h.freq > 300) & (h.freq < 1500)
    ph = np.unwrap(np.angle(H[:, 0, bb] * np.conj(H[:, 1, bb])), axis=1)
    itd = -np.polyfit(2 * np.pi * h.freq[bb], ph.T, 1)[0] * 1e6
    if np.abs(np.diff(itd)).max() > 10:
        fehler.append(f'eigene HRTF: ITD springt um {np.abs(np.diff(itd)).max():.0f} µs je 0,1°')

    print(f'\nPrüfstand ({tmp}):')
    print(f'  Zeitfenster {T:.2f} ms · Laufzeitfaktor {s:.3f} (wahr {s_wahr:.3f}) · Klangfarbe 1–14 kHz: Basis {e_basis:.2f} dB, eigen {e_eigen:.2f} dB')
    print(f'  Laufzeit eigene HRTF bis {itd_fehler:.0f} µs daneben · Kopfhörer-Mittel bis {kh_rest["links"]:.1f}/{kh_rest["rechts"]:.1f} dB daneben')
    print('Prüfstand:', 'bestanden' if not fehler else 'FEHLER')
    for f in fehler:
        print('  -', f)
    sys.exit(1 if fehler else 0)


if __name__ == '__main__':
    main()
