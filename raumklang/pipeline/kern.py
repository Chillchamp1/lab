"""Renderkern: bewegte Quellen über zeitveränderliche Pfade binaural rendern.

Ein Pfad ist ein Schallweg von der Quelle zum Kopf (direkt, über die Bordkante
gebeugt, an einer Bordwand gespiegelt, ...). Je Pfad und Block (11,6 ms) gibt es
eine Entfernung, eine Einfallsrichtung im Kopfbezug und einen Frequenzgang.
Die Laufzeit wird als gleitende Verzögerung gelesen (daraus entsteht der
Doppler-Effekt von selbst), der Rest wird blockweise im Frequenzbereich
gefiltert und überlappend addiert.
"""
import numpy as np
from scipy.ndimage import map_coordinates
from hrtf import C_SCHALL

FS = 44100
HOP = 512
BLOCK = 1024
NFFT = 2048
VORHALT = 256  # Abtastwerte Spielraum für die nullphasigen Frequenzgänge
FENSTER = np.hanning(BLOCK + 1)[:BLOCK].astype(np.float32)
FREQ = np.fft.rfftfreq(NFFT, 1 / FS)
_PHASE_VORHALT = np.exp(-2j * np.pi * FREQ * VORHALT / FS).astype(np.complex64)

# Luftdämpfung in dB je Meter (Näherung an ISO 9613-1 bei 20 °C, 70 % r. F.)
LUFT_DB_M = 0.003 * (FREQ / 1000) + 0.0013 * (FREQ / 1000) ** 2


def blockzeiten(t0, n):
    """Mittelpunkte der Blöcke einer Quelle, die bei t0 beginnt."""
    return t0 + (np.arange(n) * HOP + BLOCK / 2) / FS


def n_bloecke(n_abtast):
    return int(np.ceil(max(n_abtast - BLOCK, 0) / HOP)) + 1


def verzoegert(sig, verz_s, n_aus):
    """y[n] = sig(n - verz[n]·fs); verz_s je Block, wird linear auf Abtastwerte gezogen."""
    n_b = len(verz_s)
    tb = np.arange(n_b) * HOP + BLOCK / 2
    n = np.arange(n_aus)
    d = np.interp(n, tb, verz_s) * FS
    if np.ptp(d) < 1e-3:  # ruhende Quelle: ganze Abtastwerte genügen
        k = int(round(float(d[0])))
        aus = np.zeros(n_aus, np.float32)
        m = min(len(sig), n_aus - k)
        if m > 0:
            aus[k:k + m] = sig[:m]
        return aus
    return map_coordinates(sig.astype(np.float32), [n - d], order=3, mode='constant', cval=0.0, prefilter=True).astype(np.float32)


def _ola(rahmen):
    """rahmen (n, 2, NFFT) mit Sprungweite HOP überlappend addieren."""
    n, C, L = rahmen.shape
    m = L // HOP
    aus = np.zeros((C, (n + m - 1) * HOP), np.float32)
    for r in range(m):
        teil = rahmen[:, :, r * HOP:(r + 1) * HOP]
        aus[:, r * HOP:(r + n) * HOP] += teil.transpose(1, 0, 2).reshape(C, -1)
    return aus


def rendere_pfad(hrtf, sig, entf, richt, gang=None, pegel=None, ohr=None, bus=None, hall_pegel=0.0, streu=None):
    """Rendert einen Pfad.

    sig    Mono-Signal der Quelle
    entf   (n_b,) Weglänge in m je Block (bestimmt Laufzeit und 1/r-Abnahme)
    richt  (n_b, 3) Einfallsrichtung im Kopfbezug
    gang   (n_b, nf) zusätzlicher Betragsgang (linear) oder None
    pegel  (n_b,) zusätzlicher Faktor oder None
    ohr    (n_b, 2) Faktor je Ohr (Nahfeld) oder None
    streu  (nf,) Spektrum eines kurzen Streukerns (raue Fläche statt Spiegel) oder None
    Rückgabe: (2, n) Stereo und Versatz in Abtastwerten (kann negativ sein: -VORHALT)
    """
    n_b = len(entf)
    verz = entf / C_SCHALL
    n_aus = (n_b - 1) * HOP + BLOCK
    y = verzoegert(sig, verz - verz.min(), n_aus)
    amp = 1.0 / np.maximum(entf, 0.3)
    if pegel is not None:
        amp = amp * pegel
    aus_teile = []
    schritt = 1536
    idx = np.arange(BLOCK)[None, :] + (np.arange(n_b) * HOP)[:, None]
    for a in range(0, n_b, schritt):
        b = min(a + schritt, n_b)
        X = np.fft.rfft(y[idx[a:b]] * FENSTER, NFFT, axis=-1).astype(np.complex64)
        G = (10 ** (-LUFT_DB_M[None, :] * entf[a:b, None] / 20)).astype(np.float32)
        if gang is not None:
            G = G * gang[a:b]
        G = G * amp[a:b, None].astype(np.float32)
        X = X * G * _PHASE_VORHALT
        if streu is not None:
            X = X * streu
        H = hrtf.filter(richt[a:b])
        if ohr is not None:
            H = H * ohr[a:b, :, None].astype(np.float32)
        Y = np.fft.irfft(H * X[:, None, :], NFFT, axis=-1).astype(np.float32)
        aus_teile.append(Y)
    stereo = _ola(np.concatenate(aus_teile))
    versatz = int(round(verz.min() * FS)) - VORHALT
    if bus is not None and hall_pegel > 0:
        # Hall-Anteil: verzögertes Signal mit Entfernungsabnahme, ohne Richtung
        g = np.interp(np.arange(n_aus), np.arange(n_b) * HOP + BLOCK / 2, amp)
        bus.addiere(y * g * hall_pegel, int(round(verz.min() * FS)))
    return stereo, versatz


class Spur:
    """Stereo-Summenspur mit Zeitachse der Szene."""

    def __init__(self, dauer_s, kanaele=2):
        self.n = int(dauer_s * FS)
        self.x = np.zeros((kanaele, self.n), np.float32)

    def addiere(self, sig, start):
        sig = np.atleast_2d(sig)
        a, b = start, start + sig.shape[1]
        qa = max(0, -a)
        a = max(a, 0)
        b = min(b, self.n)
        if b > a:
            self.x[:, a:b] += sig[:, qa:qa + b - a]


def streukern(saat, dauer_ms=3.0):
    """Spektrum einer kurzen, abklingenden Zufallsfolge mit Energie 1: eine raue, gegliederte
    Fläche wirft den Schall nicht als ein Spiegelbild zurück, sondern als dichte Folge kleiner
    Rückwürfe. Das vermeidet den Kammfilter einer ideal glatten Wand."""
    rng = np.random.default_rng(saat)
    n = int(dauer_ms * FS / 1000)
    k = rng.normal(size=n) * np.exp(-np.arange(n) / (n / 3.0))
    k /= np.sqrt((k ** 2).sum())
    return np.fft.rfft(k, NFFT).astype(np.complex64)


def beugung_db(delta, frei):
    """Zusatzdämpfung an einer Kante (Maekawa, auf den freien Bereich fortgesetzt).

    delta (n_b,) Umweg in m (>= 0), frei (n_b,) True wenn die Sichtlinie die Kante nicht schneidet.
    Rückgabe (n_b, nf) in dB (>= 0).
    """
    N = 2 * delta[:, None] * FREQ[None, :] / C_SCHALL
    x = np.sqrt(2 * np.pi * np.maximum(N, 1e-9))
    verdeckt = 5 + 20 * np.log10(x / np.tanh(x))
    xf = np.minimum(x, 1.5)
    offen = 5 + 20 * np.log10(np.maximum(xf / np.tan(xf), 1e-3))
    db = np.where(frei[:, None], np.maximum(offen, 0), verdeckt)
    return np.clip(db, 0, 26)


def diffuser_nachhall(hrtf, t60_tief=0.35, t60_hoch=0.18, dauer=0.6, n_richt=40, verzug=0.012, saat=7):
    """Binaurale Impulsantwort eines schwachen diffusen Nachhalls (ohne Direktschall)."""
    rng = np.random.default_rng(saat)
    n = int(dauer * FS)
    v = rng.normal(size=(n_richt, 3))
    v /= np.linalg.norm(v, axis=1, keepdims=True)
    H = hrtf.filter(v)
    t = np.arange(n) / FS
    ir = np.zeros((2, n + NFFT))
    # zwei Bänder mit eigener Abklingzeit
    f = np.fft.rfftfreq(n, 1 / FS)
    wt = 1 / (1 + (f / 1500) ** 2)
    for k in range(n_richt):
        r = rng.normal(size=n)
        R = np.fft.rfft(r)
        tief = np.fft.irfft(R * wt, n) * 10 ** (-3 * t / t60_tief)
        hoch = np.fft.irfft(R * (1 - wt), n) * 10 ** (-3 * t / t60_hoch)
        s = (tief + hoch) * np.minimum(t / 0.004, 1)
        for e in range(2):
            h = np.fft.irfft(H[k, e], NFFT)
            ir[e, :n + 400 - 1] += np.convolve(s, h[:400])
    ir /= np.sqrt((ir ** 2).sum(1).mean())
    vz = int(verzug * FS)
    return np.concatenate([np.zeros((2, vz)), ir], 1).astype(np.float32)


def begrenzer(x, decke_db=-1.0, vorschau_ms=5.0, rueck_ms=120.0):
    """Look-ahead-Begrenzer für seltene Spitzen (beide Kanäle gemeinsam)."""
    from scipy.ndimage import minimum_filter1d, uniform_filter1d
    decke = 10 ** (decke_db / 20)
    spitze = np.abs(x).max(0)
    g = np.minimum(1.0, decke / np.maximum(spitze, 1e-9))
    L = int(vorschau_ms * FS / 1000)
    g = minimum_filter1d(g, 2 * L + 1)
    # Rücklauf: Verstärkung erholt sich exponentiell
    a = np.exp(-1 / (rueck_ms * FS / 1000))
    aus = np.empty_like(g)
    wert = 1.0
    stellen = np.flatnonzero(g < 0.9999)
    if len(stellen) == 0:
        return x, 0.0
    # nur um die betroffenen Stellen herum rechnen
    aus[:] = 1.0
    ende = 0
    for s in stellen:
        if s < ende:
            continue
        e = s
        wert = g[s]
        while e < len(g) and (wert < 0.9999 or g[e] < 0.9999):
            wert = min(g[e], 1 - a * (1 - wert))
            aus[e] = wert
            e += 1
        ende = e
    aus = uniform_filter1d(aus, L)  # weicher Einsatz; die Mindestwert-Stufe ist breiter als das Glättfenster
    return x * aus, float(-20 * np.log10(aus.min()))
