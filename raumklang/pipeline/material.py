"""Aufnahmen laden, säubern und in Einzelereignisse zerlegen."""
import subprocess
import numpy as np
from scipy.signal import butter, sosfiltfilt, stft, istft
from scipy.ndimage import uniform_filter1d, maximum_filter1d, median_filter

FS = 44100


def lade(pfad, kanal='mitte', fs=FS):
    """Datei über ffmpeg dekodieren. kanal: 'mitte', 'links', 'rechts' oder 'alle'."""
    roh = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(pfad), '-f', 'f32le', '-ac', '2', '-ar', str(fs), '-'],
                         capture_output=True, check=True).stdout
    x = np.frombuffer(roh, np.float32).reshape(-1, 2).T.astype(np.float64)
    if kanal == 'alle':
        return x
    if kanal == 'links':
        return x[0]
    if kanal == 'rechts':
        return x[1]
    return x.mean(0)


def filt(x, f, art='highpass', ordnung=4):
    return sosfiltfilt(butter(ordnung, f, art, fs=FS, output='sos'), x)


def huelle_db(x, fenster_ms=10):
    n = max(1, int(fenster_ms * FS / 1000))
    return 10 * np.log10(uniform_filter1d(x ** 2, n) + 1e-14)


def entrausche(x, staerke_db=14.0, boden_perzentil=20, nfft=1024, restpegel_db=-18.0):
    """Spektrales Tor: je Frequenz wird der Grundpegel (Perzentil über die Zeit) geschätzt;
    Zeit-Frequenz-Punkte nahe am Grundpegel werden abgesenkt. Das trennt Rufe vom
    Rauschteppich der Aufnahme (Wind, ferne Brandung), ohne die Rufe anzufassen."""
    f, t, X = stft(x, FS, nperseg=nfft, noverlap=nfft * 3 // 4)
    P = np.abs(X) ** 2
    boden = np.percentile(P, boden_perzentil, axis=1, keepdims=True) + 1e-16
    snr = 10 * np.log10(P / boden + 1e-12)
    maske = 1 / (1 + np.exp(-(snr - staerke_db) / 2.0))
    maske = median_filter(maske, size=(3, 3))
    maske = np.maximum(maske, 10 ** (restpegel_db / 20))
    _, y = istft(X * maske, FS, nperseg=nfft, noverlap=nfft * 3 // 4)
    return y[:len(x)]


def zerlege(x, schwelle_db=12.0, min_dauer=0.08, max_dauer=6.0, luecke=0.12, vorlauf=0.03, nachlauf=0.12,
            boden_perzentil=30, fenster_ms=15):
    """Einzelereignisse finden: Stellen, an denen die Hüllkurve um schwelle_db über dem
    Grundpegel liegt. Rückgabe: Liste (start, ende) in Abtastwerten."""
    h = huelle_db(x, fenster_ms)
    boden = np.percentile(h, boden_perzentil)
    aktiv = h > boden + schwelle_db
    aktiv = maximum_filter1d(aktiv.astype(np.uint8), int(luecke * FS)) > 0  # kurze Lücken schließen
    kanten = np.flatnonzero(np.diff(np.concatenate([[0], aktiv.astype(np.int8), [0]])))
    aus = []
    for a, b in zip(kanten[::2], kanten[1::2]):
        a = max(0, a + int(luecke * FS / 2) - int(vorlauf * FS))
        b = min(len(x), b - int(luecke * FS / 2) + int(nachlauf * FS))
        d = (b - a) / FS
        if min_dauer <= d <= max_dauer:
            aus.append((a, b))
    return aus


def schneide(x, a, b, ein_ms=8, aus_ms=60):
    y = x[a:b].copy()
    ne, na = int(ein_ms * FS / 1000), int(aus_ms * FS / 1000)
    ne, na = min(ne, len(y) // 4), min(na, len(y) // 3)
    if ne > 0:
        y[:ne] *= np.sin(np.linspace(0, np.pi / 2, ne)) ** 2
    if na > 0:
        y[-na:] *= np.cos(np.linspace(0, np.pi / 2, na)) ** 2
    return y


def kennwerte(y):
    """Dauer, Effektivpegel, Schwerpunktfrequenz – zum Sortieren der Ereignisse."""
    S = np.abs(np.fft.rfft(y * np.hanning(len(y)))) ** 2
    f = np.fft.rfftfreq(len(y), 1 / FS)
    return dict(dauer=len(y) / FS, rms_db=10 * np.log10((y ** 2).mean() + 1e-14),
                spitze_db=20 * np.log10(np.abs(y).max() + 1e-9), schwerpunkt=float((f * S).sum() / (S.sum() + 1e-20)))


def schleife(x, n, ueberblend=2.0, start=0):
    """Aus einer Aufnahme ein Stück der Länge n holen; reicht sie nicht, wird mit
    langer Überblendung wiederholt."""
    ub = int(ueberblend * FS)
    if len(x) < 3 * ub:
        ub = len(x) // 4
    kern = x[ub:].copy()
    kern[-ub:] = kern[-ub:] * np.cos(np.linspace(0, np.pi / 2, ub)) ** 2 + x[:ub] * np.sin(np.linspace(0, np.pi / 2, ub)) ** 2
    start %= len(kern)
    wdh = int(np.ceil((n + start) / len(kern)))
    return np.tile(kern, wdh)[start:start + n]
