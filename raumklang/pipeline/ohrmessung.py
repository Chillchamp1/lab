"""Auswertung der Ohrmessung (Seite messung/): Kopfhörer-Entzerrung und eigene HRTF.

    python3 pipeline/ohrmessung.py ohrmessung_<datum>.json [--aus material/eigen]

Eingabe ist die Datei, die messung/index.html speichert (Format raumklang-ohrmessung-1):
Impulsantworten am Eingang beider Gehörgänge (Soundman OKM), 48 kHz,
  - kopfhoerer:   5 Sitze des Kopfhörers, je linkes und rechtes Ohr,
  - lautsprecher: bis zu 20 Richtungen (12 waagerecht, 4 auf +30°, 4 auf −30°) und eine Referenz
                  (ein Mikrofon frei an der Stelle der Kopfmitte: Lautsprecher + Raum ohne Kopf).

Ergebnis in --aus:
  eigen_hrtf.sofa          CIPIC-Kopf (--basis) mit deinen Ohren: Klangfarbe an den gemessenen Richtungen
                           auf deine Messung gezogen (über ~500 Hz, dazwischen weich interpoliert),
                           Laufzeit zwischen den Ohren auf deine Kopfgröße skaliert. Für --hrtf.
  kh_eq_qudelix.txt        parametrischer EQ zum Eintippen (3 Bänder und volle Fassung)
  kh_eq_apo.txt            Equalizer APO, je Ohr getrennt
  kh_eq_fir_48k.wav        Equalizer APO „Convolution“, exakt (minimalphasig, je Ohr)
  bericht.json, bericht.txt, uebersicht.png

Ziel der Kopfhörer-Entzerrung ist dein eigenes Diffusfeld am Messpunkt (aus der eigenen HRTF):
Die Szenen rendern mit diffusfeld-entzerrter HRTF (hrtf.py). Ist der Kopfhörer am Ohr auf das
Diffusfeld desselben Ohrs entzerrt, kommt am Gehörgang genau das an, was eine echte Quelle dort
erzeugen würde – für die eigene HRTF exakt, für CIPIC so gut wie üblich. Ohne Richtungsmessung
dient das Diffusfeld des Basis-Kopfes als Ersatz (dann ungenauer über ~2 kHz).

Grenzen (stehen auch im Bericht): Der Raum zwingt zu einem Zeitfenster von ~3 ms, darunter
(< ~500 Hz) bleibt die Basis-HRTF; zwischen den 20 Richtungen wird interpoliert, fern von ihnen
(steil oben/unten) bleibt die Basis.
"""
import sys, json, base64, argparse, shutil, urllib.request
from pathlib import Path
import numpy as np
from scipy.signal import resample_poly
from scipy.optimize import least_squares
from scipy.io import wavfile

sys.path.insert(0, str(Path(__file__).resolve().parent))
from hrtf import HRTF, richtung, _terzglaettung, _minimalphase

WURZEL = Path(__file__).resolve().parent.parent
CIPIC = ['003', '008', '009', '010', '011', '012', '015', '017', '018', '019', '020', '021', '027', '028',
         '033', '040', '044', '048', '050', '051', '058', '059', '060', '061', '065', '119', '124', '126',
         '127', '131', '133', '134', '135', '137', '147', '148', '152', '153', '154', '155', '156', '158',
         '162', '163', '165']
FG = np.geomspace(20, 20000, 241)          # Auswerteraster, 1/24 Oktave


# ---------------------------------------------------------------- Hilfen
def lade(pfad):
    d = json.loads(Path(pfad).read_text(encoding='utf-8'))
    if d.get('format') != 'raumklang-ohrmessung-1':
        raise SystemExit(f'Unbekanntes Format: {d.get("format")}')
    ir = lambda s: np.frombuffer(base64.b64decode(s), '<f4').astype(np.float64)
    for m in d['kopfhoerer'] + d['lautsprecher']:
        m['links'], m['rechts'] = ir(m['links']), ir(m['rechts'])
    return d


def spektrum_db(x, fs, bruchteil=6, nfft=16384):
    """Betrag in dB auf FG, über 1/bruchteil Oktave (Leistung) geglättet."""
    X = np.fft.rfft(x, nfft)
    f = np.fft.rfftfreq(nfft, 1 / fs)
    db = 10 * np.log10(np.abs(X) ** 2 + 1e-24)
    db = _terzglaettung(f[1:], db[1:], bruchteil)
    return np.interp(FG, f[1:], db)


def glaette_log(db, bruchteil):
    """Glättung einer Kurve auf FG (dB, Leistung)."""
    return _terzglaettung(FG, db, bruchteil)


def band(lo, hi):
    return (FG >= lo) & (FG <= hi)


def einsatz(x, schwelle=0.15, auf=8):
    """Einsatzzeit in Abtastwerten (erste Überschreitung von schwelle·Spitze, 8-fach überabgetastet) –
    dieselbe Methode wie in hrtf.py, damit die Laufzeit, die wir setzen, auch die ist, die gerendert wird."""
    h = resample_poly(x, auf, 1)
    return float(np.argmax(np.abs(h) > schwelle * np.abs(h).max()) / auf)


def fenster(n, start, laenge, ein, aus):
    """1 von start bis start+laenge−aus, halbe Hann-Flanken (alles in Abtastwerten)."""
    t = np.arange(n, dtype=float)
    w = np.ones(n)
    a = start - ein
    w[t < a] = 0
    m = (t >= a) & (t < start)
    w[m] = np.sin(np.pi / 2 * (t[m] - a) / ein) ** 2
    e0, e1 = start + laenge - aus, start + laenge
    m = (t >= e0) & (t < e1)
    w[m] = np.cos(np.pi / 2 * (t[m] - e0) / aus) ** 2
    w[t >= e1] = 0
    return w


def erste_reflexion(x, fs, t0, ab_ms=1.2, bis_ms=12.0, schwelle_db=-20):
    """Zeit (ms nach t0) der ersten Spitze, die nicht mehr zum Direktschall gehört."""
    h = np.abs(x)
    i0 = int(t0)
    direkt = h[max(0, i0 - 5):i0 + int(0.6e-3 * fs)].max()
    a, b = i0 + int(ab_ms * 1e-3 * fs), min(len(h), i0 + int(bis_ms * 1e-3 * fs))
    if b <= a:
        return None
    k = np.flatnonzero(h[a:b] > direkt * 10 ** (schwelle_db / 20))
    return None if len(k) == 0 else (a + k[0] - t0) / fs * 1e3


def ueberblende(lo, hi):
    """0 unter lo, 1 über hi, Kosinus auf der log-Frequenzachse."""
    u = np.clip(np.log(FG / lo) / np.log(hi / lo), 0, 1)
    return np.sin(np.pi / 2 * u) ** 2


# ---------------------------------------------------------------- Kopfhörer
def kopfhoerer(d, fs):
    sitze = d['kopfhoerer']
    if not sitze:
        return None
    kurven = {'links': [], 'rechts': []}
    for m in sitze:
        for ohr in kurven:
            x = m[ohr].copy()
            n = len(x)
            x *= fenster(n, 0, n, 1, n // 10)
            kurven[ohr].append(spektrum_db(x, fs, 6))
    erg = {'sitze': len(sitze), 'uebersteuert': [m['id'] for m in sitze if m.get('uebersteuert')],
           'uebersprechen_db': [round(float(m.get('uebersprechen_db', np.nan)), 1) for m in sitze]}
    for ohr, k in kurven.items():
        k = np.array(k)
        mittel = 10 * np.log10((10 ** (k / 10)).mean(0))
        erg[ohr] = {'mittel_db': mittel, 'streuung_db': k.std(0), 'sitze_db': k}
    return erg


# ---------------------------------------------------------------- Richtungen
def richtungsmessung(d, fs, fenster_ms, ref_kanal):
    ls = d['lautsprecher']
    ref = [m for m in ls if m.get('referenz')]
    mess = [m for m in ls if not m.get('referenz')]
    if not ref or not mess:
        return None
    ref = ref[-1]
    if ref_kanal == 'auto':   # das freie Mikrofon hat den kräftigeren, ungestörten Direktschall
        ref_kanal = 'links' if np.abs(ref['links']).max() >= np.abs(ref['rechts']).max() else 'rechts'
    else:
        ref_kanal = {'L': 'links', 'R': 'rechts'}[ref_kanal]
    r = ref[ref_kanal]
    n = len(r)
    ein, aus = 0.5e-3 * fs, 0.8e-3 * fs

    # Fenster: höchstens bis kurz vor die früheste Reflexion. Gesucht an der Referenz: das freie
    # Mikrofon hat keine Ohrmuschel, die nachklingt, und kein abgewandtes Ohr, dessen Direktschall
    # später ankommt (beides hielte eine Suche an den Ohrsignalen für eine Reflexion).
    t_ref = einsatz(r)
    frueh = erste_reflexion(r, fs, t_ref, ab_ms=0.8)
    T = fenster_ms
    if frueh is not None and fenster_ms is None:
        T = float(np.clip(frueh - 0.3, 2.0, 4.5))
    elif T is None:
        T = 3.3
    L = T * 1e-3 * fs
    R_db = spektrum_db(r * fenster(n, t_ref, L, ein, aus), fs, 6)

    aus_ = []
    for m in mess:
        tl, tr = einsatz(m['links']), einsatz(m['rechts'])
        t0 = min(tl, tr)
        w = fenster(n, t0, L, ein, aus)
        M = {ohr: spektrum_db(m[ohr] * w, fs, 6) - R_db for ohr in ('links', 'rechts')}
        aus_.append({'id': m['id'], 'az': float(m['winkel']), 'el': float(m['hoehe']),
                     'itd_ms': (tr - tl) / fs * 1e3,          # > 0: links früher = Quelle links
                     'links_db': M['links'], 'rechts_db': M['rechts'], 'uebersteuert': bool(m.get('uebersteuert'))})
    f_lo = 1.5 / (T * 1e-3)
    return {'richtungen': aus_, 'fenster_ms': T, 'erste_reflexion_ms': frueh, 'ref_kanal': ref_kanal,
            'f_unten': f_lo, 'ref_db': R_db}


# ---------------------------------------------------------------- Basis-HRTF an den Messrichtungen
class Basis:
    def __init__(self, pfad):
        self.pfad = Path(pfad)
        self.h = HRTF(str(pfad), fs=44100, nfft=2048, diffusfeld=False)

    def an(self, az, el):
        """Betrag dB auf FG je Ohr und Laufzeitdifferenz (ms, > 0: links früher)."""
        v = richtung(np.atleast_1d(az), np.atleast_1d(el))
        H = self.h.filter(v)                                  # (n, 2, F), Pegel willkürlich
        i, w = self.h.gewichte(v)
        tau = np.einsum('nk,nke->ne', w, self.h.tau[i])       # s je Ohr
        f = self.h.freq
        db = 10 * np.log10(np.abs(H) ** 2 + 1e-24)
        aus = np.empty((len(v), 2, len(FG)))
        for n in range(len(v)):
            for e in range(2):
                g = _terzglaettung(f[1:], db[n, e, 1:], 6)
                aus[n, e] = np.interp(FG, f[1:], g)
        return aus, (tau[:, 1] - tau[:, 0]) * 1e3


def vergleiche(rm, basis):
    """Korrektur (dB je Richtung und Ohr), Gesamtpegel und Kopfgrößen-Faktor gegenüber einer Basis."""
    az = np.array([r['az'] for r in rm['richtungen']])
    el = np.array([r['el'] for r in rm['richtungen']])
    C, itd_c = basis.an(az, el)
    M = np.stack([np.stack([r['links_db'], r['rechts_db']]) for r in rm['richtungen']])
    b = band(500, 4000)
    g = float(np.median((M - C)[..., b].mean(-1)))
    K = M - C - g
    hoch = band(4000, 16000)
    abstand = float(np.sqrt((K[..., hoch] ** 2).mean()))
    itd_m = np.array([r['itd_ms'] for r in rm['richtungen']])
    gross = np.abs(itd_c) > 0.2
    s = float((itd_m[gross] * itd_c[gross]).sum() / (itd_c[gross] ** 2).sum()) if gross.any() else 1.0
    return {'K': K, 'g_db': g, 'abstand_4_16k_db': abstand, 'itd_faktor': s,
            'itd_basis_ms': itd_c, 'itd_mess_ms': itd_m, 'C': C, 'M': M}


# ---------------------------------------------------------------- eigene HRTF bauen
N_NEU = 384


def ersetze_ir(f, ir):
    """Data.IR (M, R, N) durch ir ersetzen, auch bei anderer Länge N (netCDF-Dimension N neu anlegen)."""
    if f['Data.IR'].shape == ir.shape:
        f['Data.IR'][...] = ir
        return
    attrs = {k: v for k, v in f['Data.IR'].attrs.items() if k not in ('DIMENSION_LIST', '_Netcdf4Coordinates', '_Netcdf4Dimid')}
    del f['Data.IR']
    alt_n = {k: v for k, v in f['N'].attrs.items() if k not in ('REFERENCE_LIST', 'CLASS', 'NAME', 'DIMENSION_LIST')}
    del f['N']
    n = f.create_dataset('N', data=np.arange(ir.shape[-1], dtype='>f4'))
    for k, v in alt_n.items():
        n.attrs[k] = v
    n.make_scale('N')
    ds = f.create_dataset('Data.IR', data=ir)
    for k, v in attrs.items():
        ds.attrs[k] = v
    for i, dim in enumerate(('M', 'R', 'N')):
        ds.dims[i].attach_scale(f[dim])


def baue_hrtf(rm, basis, vg, ziel, sigma=18.0, fern=35.0, max_db=15.0):
    """Kopiert die Basis-SOFA und ersetzt Data.IR: Laufzeit skaliert, Klangfarbe korrigiert."""
    import h5py
    shutil.copyfile(basis.pfad, ziel)
    with h5py.File(ziel, 'r+') as f:
        ir = f['Data.IR'][:].astype(np.float64)
        fs = float(f['Data.SamplingRate'][0])
        pos = f['SourcePosition'][:]
        M, _, N = ir.shape
        v = richtung(pos[:, 0], pos[:, 1])
        vm = richtung(np.array([r['az'] for r in rm['richtungen']]), np.array([r['el'] for r in rm['richtungen']]))

        # Korrektur über ~f_unten einblenden, oben (> 16 kHz) den Randwert halten, begrenzen.
        # Nicht weiter glätten als die Spektren selbst (1/6 Oktave): sonst verschwimmen genau die
        # Ohrmuschel-Kerben, die die eigene HRTF ausmachen (Prüfstand: 1/4 Oktave kostet 1,4 dB).
        K = vg['K'].copy()
        K *= ueberblende(rm['f_unten'], 2 * rm['f_unten'])
        k16 = np.searchsorted(FG, 16000)
        K[..., k16:] = K[..., k16 - 1:k16]
        K = np.clip(K, -max_db, max_db)

        # auf die Kugel: Gauß-Gewichte nach Winkelabstand, fern der Messung → keine Korrektur
        wink = np.degrees(np.arccos(np.clip(v @ vm.T, -1, 1)))            # (M, R)
        w = np.exp(-(wink / sigma) ** 2)
        w0 = np.exp(-(fern / sigma) ** 2)
        Kv = np.einsum('mr,ref->mef', w, K) / (w.sum(1)[:, None, None] + w0)
        anteil = w.sum(1) / (w.sum(1) + w0)

        nfft = 8192          # Cepstrum-Methode: zu kurzes Raster faltet scharfe Kerben zeitlich zurück
        fl = np.fft.rfftfreq(nfft, 1 / fs)
        Bb = np.abs(np.fft.rfft(ir, nfft, axis=-1))                       # Betrag der Basis

        def glatt(betrag):   # wie die Messung: Leistung über 1/6 Oktave, auf FG
            db = 10 * np.log10(betrag[1:] ** 2 + 1e-24)
            return np.interp(FG, fl[1:], _terzglaettung(fl[1:], db, 6))

        # Klangfarbe. Die Korrektur ist eine Differenz geglätteter Spektren, wirkt aber auf das
        # ungeglättete Basis-Spektrum mit seinen tiefen Kerben – geglättet ergibt das Produkt nicht
        # die Summe. Deshalb je Gitterpunkt nachmessen und die Korrektur nachführen.
        betrag = np.empty_like(Bb)
        aktiv = (FG >= rm['f_unten']) & (FG < 16000)
        for m in range(M):
            for e in range(2):
                soll = glatt(Bb[m, e]) + Kv[m, e]
                k = Kv[m, e].copy()
                for _ in range(4):
                    k = np.clip(k + np.where(aktiv, soll - glatt(Bb[m, e] * 10 ** (np.interp(fl, FG, k, left=0) / 20)), 0),
                                -max_db - 6, max_db + 6)
                betrag[m, e] = Bb[m, e] * 10 ** (np.interp(fl, FG, k, left=0) / 20)

        # Laufzeit: Differenz zwischen den Ohren um s skalieren; was deine Kopfform darüber hinaus
        # anders macht (Rest an den Messrichtungen), wird wie die Klangfarbe über die Kugel verteilt.
        s = float(np.clip(vg['itd_faktor'], 0.85, 1.15))
        rest = np.clip(vg['itd_mess_ms'] - s * vg['itd_basis_ms'], -0.1, 0.1) * 1e-3 * fs   # Abtastwerte der Basis
        rest_v = (w @ rest) / (w.sum(1) + w0)
        tl = np.array([einsatz(ir[m, 0]) for m in range(M)])
        tr = np.array([einsatz(ir[m, 1]) for m in range(M)])
        mitte, itd_ziel = (tl + tr) / 2, s * (tr - tl) + rest_v
        ziel = np.stack([mitte - itd_ziel / 2, mitte + itd_ziel / 2], 1)

        # Modell „minimalphasig + reine Verzögerung“ (Kulkarni u. a. 1999). Die Korrektur direkt auf die
        # gemessene Basis-Antwort zu falten, verformte die erste Welle: hrtf.py richtet jede Antwort an
        # der ersten Überschreitung von 15 % der Spitze aus, die dann je Gitterpunkt anders lag –
        # Nachbarn waren bis 3 Abtastwerte versetzt und löschten sich beim Mischen aus (Prüfstand:
        # Kerbe −10 dB bei 6–8 kHz), und an abgewandten Ohren kippte die Laufzeit (140 µs).
        # Minimalphasige Antworten haben alle dieselbe Anfangsform, der Einsatz liegt verlässlich.
        H = np.stack([[_minimalphase(betrag[m, e], nfft) for e in range(2)] for m in range(M)])
        for _ in range(2):   # auf den Ziel-Einsatz schieben, nachmessen, Rest nachschieben
            neu = np.fft.irfft(H, nfft, axis=-1)
            ist = np.array([[einsatz(neu[m, e, :1024]) for e in range(2)] for m in range(M)])
            H = H * np.exp(-2j * np.pi * fl / fs * (ziel - ist)[..., None])
        neu = np.fft.irfft(H, nfft, axis=-1)
        # Der Korrekturfilter klingt länger als die 200 Abtastwerte von CIPIC (Kürzen kostete im
        # Prüfstand 1,3 dB an den Kerben) → längere Impulsantworten, Dimension N mitführen.
        N = N_NEU
        verlust = 1 - (neu[..., :N] ** 2).sum(-1) / (neu ** 2).sum(-1)
        rampe = np.ones(N)
        rampe[-32:] = np.cos(np.pi / 2 * np.arange(32) / 32) ** 2
        neu = neu[..., :N] * rampe * 10 ** (vg['g_db'] / 20)
        ersetze_ir(f, neu)
        for k in ('Title', 'DatabaseName'):
            if k in f.attrs:
                f.attrs[k] = np.bytes_(f'Eigene HRTF (Ohrmessung) auf Basis {basis.pfad.stem}')
    return {'itd_faktor_angewandt': s, 'kuerzung_max': float(verlust.max()),
            'abdeckung': {'voll (>90 %)': float((anteil > 0.9).mean()), 'keine (<10 %)': float((anteil < 0.1).mean())}}


def diffusfeld_db(sofa):
    """Diffusfeld (raumwinkelgewichtetes Leistungsmittel) je Ohr auf FG, in dB (absoluter Pegel der Datei)."""
    import h5py
    with h5py.File(sofa, 'r') as f:
        ir = f['Data.IR'][:].astype(np.float64)
        fs = float(f['Data.SamplingRate'][0])
    gew = HRTF(str(sofa), fs=int(fs), diffusfeld=False).gewicht     # Raumwinkel je Messrichtung
    fr = np.fft.rfftfreq(4096, 1 / fs)
    P = np.einsum('m,mef->ef', gew, np.abs(np.fft.rfft(ir, 4096, axis=-1)) ** 2)
    return np.stack([np.interp(FG, fr[1:], _terzglaettung(fr[1:], 10 * np.log10(P[e, 1:] + 1e-24), 6)) for e in range(2)])


# ---------------------------------------------------------------- Entzerrung und Filteranpassung
def eq_kurve(kh, df_db, f_halten=500.0):
    """Entzerrung je Ohr (dB auf FG): Diffusfeld-Ziel minus Kopfhörer am Ohr, geglättet und begrenzt.

    Unter f_halten ist das Ziel nicht gemessen (Zeitfenster) und das CIPIC-Diffusfeld fällt dort
    messtechnisch ab; das echte Diffusfeld ist im Bass flach → Zielwert bei f_halten halten.
    Anhebungen begrenzt: unter 50 Hz strahlt ein offener Kopfhörer kaum ab (+3 dB kosten nur
    Aussteuerung), über 6 kHz wandern Kerben mit dem Sitz (Auffüllen wäre bei anderem Sitz eine Spitze)."""
    eq = {}
    df_db = df_db.copy()
    ih = np.searchsorted(FG, f_halten)
    df_db[:, :ih] = df_db[:, ih:ih + 1]
    oben = np.where(FG < 50, 3.0, np.where(FG > 6000, 4.0, 6.0))
    for e, ohr in enumerate(('links', 'rechts')):
        roh = df_db[e] - kh[ohr]['mittel_db']
        fein, grob = glaette_log(roh, 6), glaette_log(roh, 2)
        u = ueberblende(6000, 10000)
        k = fein * (1 - u) + grob * u                   # oben grob: dort hängt alles am Sitz
        k -= k[band(200, 2000)].mean()
        i30 = np.searchsorted(FG, 30)
        k[:i30] = k[i30]
        i16 = np.searchsorted(FG, 16000)
        k[i16:] = k[i16 - 1]
        hoch = FG > 10000
        k[hoch] = np.clip(k[hoch], -6, 6)
        eq[ohr] = np.clip(k, -12, oben)
    eq['beide'] = (eq['links'] + eq['rechts']) / 2
    return eq


def peak_db(fc, gain, q, fs=48000):
    """Betrag (dB) eines Spitzenfilters (RBJ) auf FG."""
    A = 10 ** (gain / 40)
    w0 = 2 * np.pi * fc / fs
    al = np.sin(w0) / (2 * q)
    b = np.array([1 + al * A, -2 * np.cos(w0), 1 - al * A])
    a = np.array([1 + al / A, -2 * np.cos(w0), 1 - al / A])
    z = np.exp(-1j * 2 * np.pi * FG / fs)
    H = (b[0] + b[1] * z + b[2] * z ** 2) / (a[0] + a[1] * z + a[2] * z ** 2)
    return 20 * np.log10(np.abs(H))


def passe_filter(ziel, n, q_max=4.0, g_max=12.0):
    """n Spitzenfilter, die die Zielkurve nachbilden (gierig gesetzt, dann gemeinsam optimiert)."""
    gew = np.where(FG < 10000, 1.0, np.where(FG < 16000, 0.3, 0.0)) * (FG >= 25)
    par = []
    rest = ziel.copy()
    for _ in range(n):
        glatt = glaette_log(rest, 3)
        i = int(np.argmax(np.abs(glatt) * gew))
        par += [np.log(FG[i]), float(np.clip(glatt[i], -g_max, g_max)), np.log(1.0)]
        rest = ziel - sum(peak_db(np.exp(par[k]), par[k + 1], np.exp(par[k + 2])) for k in range(0, len(par), 3))
    lo = [np.log(25), -g_max, np.log(0.3)] * n
    hi = [np.log(16000), g_max, np.log(q_max)] * n
    par = np.clip(par, lo, hi)

    def fehler(p):
        return (sum(peak_db(np.exp(p[k]), p[k + 1], np.exp(p[k + 2])) for k in range(0, len(p), 3)) - ziel) * gew

    p = least_squares(fehler, par, bounds=(lo, hi)).x
    filt = sorted([(float(np.exp(p[k])), float(p[k + 1]), float(np.exp(p[k + 2]))) for k in range(0, len(p), 3)])
    kurve = sum(peak_db(*f) for f in filt)
    r = (kurve - ziel)[gew > 0.5]
    return filt, kurve, float(np.sqrt((r ** 2).mean()))


def vorverstaerkung(kurve):
    return -float(np.ceil(max(0.0, kurve[FG < 16000].max()) * 2 + 1) / 2)


def zahl(x, nachkomma=1):
    return f'{x:+.{nachkomma}f}'.replace('-', '−').replace('.', ',')


def schreibe_eq(eq, aus, fs=48000):
    erg = {}
    # Bänder, die gegeneinander arbeiten (−9/+9 dB nebeneinander), machen den EQ empfindlich auf
    # den Sitz (Lehre vom 17.11.) → Verstärkung je Band begrenzen.
    for name, n, q, g in (('kurz', 3, 2.0, 6.0), ('voll', 6, 4.0, 8.0)):
        filt, kurve, rms = passe_filter(eq['beide'], n, q_max=q, g_max=g)
        erg[name] = {'filter': filt, 'vorverstaerkung_db': vorverstaerkung(kurve), 'restfehler_db': rms, 'kurve': kurve}
    zeilen = ['Kopfhörer-Entzerrung für die Klangszenen (Qudelix 5K, parametrischer EQ, beide Ohren gleich)',
              'Ziel: dein eigenes Diffusfeld am Ohr. Crossfeed und Spatial aus. Als eigenes Preset neben dem Musik-Preset.', '']
    for name, titel in (('kurz', 'Kurzfassung (3 Bänder)'), ('voll', 'Volle Fassung (6 Bänder)')):
        e = erg[name]
        zeilen += [f'{titel}: Pre-Gain {zahl(e["vorverstaerkung_db"])} dB, Restfehler {e["restfehler_db"]:.1f} dB'.replace('.', ',')]
        for i, (fc, g, qq) in enumerate(e['filter'], 1):
            zeilen.append(f'  {i}: PK {fc:7.0f} Hz  {zahl(g)} dB  Q {qq:.2f}'.replace('.', ','))
        zeilen.append('')
    (aus / 'kh_eq_qudelix.txt').write_text('\n'.join(zeilen), encoding='utf-8')

    # Equalizer APO: je Ohr eigene volle Fassung
    apo = ['# Kopfhörer-Entzerrung Klangszenen (Ohrmessung), je Ohr', '']
    vor = []
    for ohr, kanal in (('links', 'L'), ('rechts', 'R')):
        filt, kurve, rms = passe_filter(eq[ohr], 6)
        erg['apo_' + ohr] = {'filter': filt, 'restfehler_db': rms}
        vor.append(vorverstaerkung(kurve))
        apo += [f'Channel: {kanal}'] + [f'Filter {i}: ON PK Fc {fc:.0f} Hz Gain {g:.1f} dB Q {qq:.2f}' for i, (fc, g, qq) in enumerate(filt, 1)] + ['']
    apo.insert(1, f'Preamp: {min(vor):.1f} dB')
    apo += ['Channel: all']
    (aus / 'kh_eq_apo.txt').write_text('\n'.join(apo), encoding='utf-8')

    # FIR (minimalphasig) je Ohr, für Equalizer APO „Convolution“
    nfft = 4096
    fl = np.fft.rfftfreq(nfft, 1 / fs)
    vg = min(-max(eq['links'].max(), eq['rechts'].max()) - 0.5, 0)
    fir = []
    for ohr in ('links', 'rechts'):
        db = np.interp(fl, FG, eq[ohr]) + vg
        h = np.fft.irfft(_minimalphase(10 ** (db / 20), nfft), nfft)
        h[-256:] *= np.cos(np.pi / 2 * np.arange(256) / 256) ** 2
        fir.append(h)
    wavfile.write(aus / 'kh_eq_fir_48k.wav', fs, np.stack(fir, 1).astype(np.float32))
    erg['fir_vorverstaerkung_db'] = float(vg)
    return erg


# ---------------------------------------------------------------- Bild
def bild(aus, kh, eq, eqf, rm, vg, df):
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    fig, ax = plt.subplots(2, 2, figsize=(14, 9))
    farbe = {'links': '#1f7f86', 'rechts': '#b07a00'}
    a = ax[0, 0]
    if kh:
        for ohr in ('links', 'rechts'):
            for k in kh[ohr]['sitze_db']:
                a.semilogx(FG, k - kh[ohr]['mittel_db'][band(200, 2000)].mean(), color=farbe[ohr], alpha=.25, lw=.8)
            a.semilogx(FG, kh[ohr]['mittel_db'] - kh[ohr]['mittel_db'][band(200, 2000)].mean(), color=farbe[ohr], lw=2, label=f'Kopfhörer {ohr}')
        for e, ohr in enumerate(('links', 'rechts')):
            a.semilogx(FG, df[e] - df[e][band(200, 2000)].mean(), '--', color=farbe[ohr], lw=1.2, label=f'Ziel (Diffusfeld) {ohr}')
    a.set_title('Kopfhörer am Ohr (5 Sitze) und Ziel'); a.legend(fontsize=8); a.set_ylim(-30, 20)
    a = ax[0, 1]
    if eq:
        a.semilogx(FG, eq['beide'], 'k', lw=2, label='Entzerrung (Mittel beider Ohren)')
        for name, st in (('kurz', ':'), ('voll', '--')):
            a.semilogx(FG, eqf[name]['kurve'], st, lw=1.5, label=f'PEQ {name} (Rest {eqf[name]["restfehler_db"]:.1f} dB)')
    a.set_title('Entzerrung'); a.legend(fontsize=8); a.set_ylim(-16, 10)
    a = ax[1, 0]
    if rm:
        for i, r in enumerate(rm['richtungen']):
            if r['el'] == 0 and r['az'] in (0, 90, 180, 270):
                o = -12 * [0, 90, 180, 270].index(r['az'])
                a.semilogx(FG, vg['M'][i, 0] - vg['g_db'] + o, color=farbe['links'], lw=1.5)
                a.semilogx(FG, vg['C'][i, 0] + o, color='gray', lw=1)
                a.text(22, o + 2, f'{r["az"]:.0f}°', fontsize=8)
        a.set_title('Linkes Ohr: gemessen (farbig) gegen Basis (grau), 0/90/180/270°, versetzt')
        a.axvline(rm['f_unten'], color='k', ls=':', lw=.8)
    a = ax[1, 1]
    if rm:
        o = np.argsort([r['az'] for r in rm['richtungen'] if r['el'] == 0])
        hz = [i for i, r in enumerate(rm['richtungen']) if r['el'] == 0]
        az = np.array([rm['richtungen'][i]['az'] for i in hz])
        a.plot(az, vg['itd_mess_ms'][hz], 'o-', color=farbe['links'], label='gemessen')
        a.plot(az, vg['itd_basis_ms'][hz], 's--', color='gray', label='Basis')
        a.plot(az, vg['itd_basis_ms'][hz] * vg['itd_faktor'], ':', color='k', label=f'Basis × {vg["itd_faktor"]:.3f}')
        a.set_title('Laufzeitunterschied (ms, > 0 = links früher), waagerecht'); a.set_xlabel('Azimut (°, links = 90)'); a.legend(fontsize=8)
    for a in ax.flat:
        a.grid(alpha=.3, which='both')
    fig.tight_layout()
    fig.savefig(aus / 'uebersicht.png', dpi=110)


# ---------------------------------------------------------------- Hauptablauf
def lade_cipic(ordner):
    ordner.mkdir(parents=True, exist_ok=True)
    for s in CIPIC:
        p = ordner / f'subject_{s}.sofa'
        if not p.exists():
            urllib.request.urlretrieve(f'https://sofacoustics.org/data/database/cipic/subject_{s}.sofa', p)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('messdatei')
    ap.add_argument('--aus', default=str(WURZEL / 'material' / 'eigen'))
    ap.add_argument('--basis', default=str(WURZEL / 'material' / 'hrtf' / 'subject_040.sofa'))
    ap.add_argument('--kandidaten', default=None, help='Ordner mit CIPIC-SOFA-Dateien: Rangliste nach Ähnlichkeit')
    ap.add_argument('--lade-cipic', action='store_true', help='alle 45 CIPIC-Köpfe nach --kandidaten laden')
    ap.add_argument('--fenster-ms', type=float, default=None, help='Zeitfenster der Richtungsmessung (Standard: vor der ersten Reflexion)')
    ap.add_argument('--ref-kanal', default='auto', choices=['auto', 'L', 'R'])
    a = ap.parse_args()
    aus = Path(a.aus)
    aus.mkdir(parents=True, exist_ok=True)
    d = lade(a.messdatei)
    fs = d['fs']
    bericht = {'messdatei': Path(a.messdatei).name, 'erstellt': d.get('erstellt'), 'eingang': d.get('eingang'), 'ausgang': d.get('ausgang')}
    text = []

    kh = kopfhoerer(d, fs)
    rm = richtungsmessung(d, fs, a.fenster_ms, a.ref_kanal)
    basis = Basis(a.basis)
    vg = None
    if rm:
        vg = vergleiche(rm, basis)
        bericht['richtungen'] = {'anzahl': len(rm['richtungen']), 'fenster_ms': rm['fenster_ms'], 'erste_reflexion_ms': rm['erste_reflexion_ms'],
                                 'gueltig_ab_hz': rm['f_unten'], 'ref_kanal': rm['ref_kanal'], 'itd_faktor': vg['itd_faktor'],
                                 'abstand_zur_basis_4_16k_db': vg['abstand_4_16k_db'],
                                 'je_richtung': [{'id': r['id'], 'az': r['az'], 'el': r['el'], 'itd_ms': round(r['itd_ms'], 3),
                                                  'itd_basis_ms': round(float(vg['itd_basis_ms'][i]), 3),
                                                  'ild_1_4k_db': round(float((r['links_db'] - r['rechts_db'])[band(1000, 4000)].mean()), 1),
                                                  'uebersteuert': r['uebersteuert']} for i, r in enumerate(rm['richtungen'])]}
        text += [f'Richtungen: {len(rm["richtungen"])} gemessen, Zeitfenster {rm["fenster_ms"]:.1f} ms '
                 f'(erste Reflexion nach {rm["erste_reflexion_ms"] or float("nan"):.1f} ms), gültig ab ~{rm["f_unten"]:.0f} Hz, Referenz = {rm["ref_kanal"]}es Mikrofon.',
                 f'Kopfgröße: Laufzeitunterschiede {vg["itd_faktor"]:.3f} × Basis {basis.pfad.stem}.',
                 f'Klangfarbe 4–16 kHz weicht im Mittel {vg["abstand_4_16k_db"]:.1f} dB (rms) von der Basis ab.']
        falsch = [r for r in bericht['richtungen']['je_richtung'] if r['az'] % 180 and (r['itd_ms'] > 0) != (r['az'] < 180)]
        if falsch:
            text.append('WARNUNG: Laufzeit passt nicht zur Seite bei ' + ', '.join(r['id'] for r in falsch))
        if a.kandidaten:
            ordner = Path(a.kandidaten)
            if a.lade_cipic:
                lade_cipic(ordner)
            rang = []
            for p in sorted(ordner.glob('*.sofa')):
                v = vergleiche(rm, Basis(p))
                rang.append({'kopf': p.stem, 'abstand_4_16k_db': round(v['abstand_4_16k_db'], 2), 'itd_faktor': round(v['itd_faktor'], 3)})
            rang.sort(key=lambda r: r['abstand_4_16k_db'])
            bericht['rangliste'] = rang
            text.append('Ähnlichste Köpfe (Klangfarbe 4–16 kHz): ' + ', '.join(f'{r["kopf"]} {r["abstand_4_16k_db"]:.1f} dB' for r in rang[:5]))
        info = baue_hrtf(rm, basis, vg, aus / 'eigen_hrtf.sofa')
        bericht['eigen_hrtf'] = info
        text.append(f'eigen_hrtf.sofa: Basis {basis.pfad.stem}, Laufzeitfaktor {info["itd_faktor_angewandt"]:.3f}, '
                    f'{info["abdeckung"]["voll (>90 %)"] * 100:.0f} % der Richtungen voll korrigiert, {info["abdeckung"]["keine (<10 %)"] * 100:.0f} % unverändert; '
                    f'Kürzung auf die Basislänge verliert höchstens {info["kuerzung_max"] * 100:.1f} % Energie.')
        df = diffusfeld_db(aus / 'eigen_hrtf.sofa')
        df_quelle = 'eigenes Diffusfeld (eigen_hrtf.sofa)'
    else:
        df = diffusfeld_db(basis.pfad)
        df_quelle = f'Ersatz: Diffusfeld von {basis.pfad.stem} (keine Richtungsmessung)'
        text.append('Keine Richtungsmessung mit Referenz in der Datei – keine eigene HRTF.')

    eq = eqf = None
    if kh:
        eq = eq_kurve(kh, df, max(rm['f_unten'], 400.0) if rm else 500.0)
        df = df.copy()
        ih = np.searchsorted(FG, max(rm['f_unten'], 400.0) if rm else 500.0)
        df[:, :ih] = df[:, ih:ih + 1]          # fürs Bild: das Ziel, wie es verwendet wird
        eqf = schreibe_eq(eq, aus)
        lr = float(np.abs(eq['links'] - eq['rechts'])[band(100, 10000)].max())
        st = {ohr: float(kh[ohr]['streuung_db'][band(100, 5000)].mean()) for ohr in ('links', 'rechts')}
        st_hoch = {ohr: float(kh[ohr]['streuung_db'][band(5000, 12000)].mean()) for ohr in ('links', 'rechts')}
        bericht['kopfhoerer'] = {'sitze': kh['sitze'], 'uebersteuert': kh['uebersteuert'], 'uebersprechen_db': kh['uebersprechen_db'],
                                 'streuung_100_5k_db': st, 'streuung_5_12k_db': st_hoch, 'ziel': df_quelle,
                                 'unterschied_links_rechts_max_db': lr,
                                 'qudelix_kurz': eqf['kurz']['filter'], 'qudelix_kurz_vorverstaerkung': eqf['kurz']['vorverstaerkung_db'],
                                 'qudelix_kurz_rest_db': eqf['kurz']['restfehler_db'],
                                 'qudelix_voll': eqf['voll']['filter'], 'qudelix_voll_vorverstaerkung': eqf['voll']['vorverstaerkung_db'],
                                 'qudelix_voll_rest_db': eqf['voll']['restfehler_db'],
                                 'eq_db_bei': {f'{f} Hz': round(float(np.interp(f, FG, eq['beide'])), 1) for f in (30, 50, 100, 200, 500, 1000, 2000, 3000, 5000, 8000, 12000)}}
        text += [f'Kopfhörer: {kh["sitze"]} Sitze, Streuung zwischen den Sitzen {st["links"]:.1f}/{st["rechts"]:.1f} dB (100 Hz–5 kHz), '
                 f'{st_hoch["links"]:.1f}/{st_hoch["rechts"]:.1f} dB (5–12 kHz). Ziel: {df_quelle}.',
                 f'Links und rechts unterscheiden sich in der Entzerrung um bis zu {lr:.1f} dB (100 Hz–10 kHz).']
        if kh['uebersteuert']:
            text.append('WARNUNG: übersteuert bei ' + ', '.join(kh['uebersteuert']))
        text.append((aus / 'kh_eq_qudelix.txt').read_text(encoding='utf-8'))
    bild(aus, kh, eq, eqf, rm, vg, df)
    (aus / 'bericht.txt').write_text('\n'.join(text), encoding='utf-8')
    (aus / 'bericht.json').write_text(json.dumps(bericht, indent=1, ensure_ascii=False, default=float), encoding='utf-8')
    print('\n'.join(text))


if __name__ == '__main__':
    main()
