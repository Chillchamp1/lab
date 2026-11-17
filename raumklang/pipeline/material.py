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
    return 10 * np.log10(np.maximum(uniform_filter1d(x ** 2, n), 0) + 1e-14)


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
    echt = h[h > -120]                         # digitale Stille zählt nicht zum Grundpegel
    boden = np.percentile(echt if len(echt) else h, boden_perzentil)
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


def zerlege_taeler(x, glatt_ms=150, prominenz_db=6.0, min_dauer=0.5, max_dauer=8.0):
    """Ereignisse von Tal zu Tal der Hüllkurve: jede Welle (jeder Schwapp) beginnt im Tal vor
    ihrer Spitze und endet im Tal danach. Anders als ein Schwellwert schneidet das eine
    Welle nicht mitten im Auslaufen ab, nur weil das Grundrauschen der Aufnahme laut ist."""
    from scipy.signal import find_peaks
    h = huelle_db(x, glatt_ms)
    spitzen, eig = find_peaks(h, prominence=prominenz_db, distance=int(0.25 * FS))
    aus = []
    for i, p in enumerate(spitzen):
        a = eig['left_bases'][i]
        b = eig['right_bases'][i]
        # Basis kann weit weg liegen (über andere Spitzen hinweg): auf das tiefste Tal bis zur
        # nächsten Spitze begrenzen
        if i > 0:
            a = max(a, spitzen[i - 1] + int(np.argmin(h[spitzen[i - 1]:p])))
        if i + 1 < len(spitzen):
            b = min(b, p + int(np.argmin(h[p:spitzen[i + 1]])))
        d = (b - a) / FS
        if min_dauer <= d <= max_dauer:
            aus.append((int(a), int(b)))
    return aus


def schneide_abklingend(x, a, b, ein_ms=250, ziel_db=-40.0, min_ausklang_s=0.6, max_endpegel_db=-6.0, glatt_ms=60):
    """Ereignis ausschneiden und natürlich ausklingen lassen: ab der Spitze fällt eine in dB
    gerade Abklingkurve bis zum Schnittende auf ziel_db. So endet eine Welle wie eine Welle,
    statt nach kurzer Blende abzureißen. Ereignisse, die nach der Spitze zu wenig Auslauf haben
    oder am Ende noch fast so laut sind wie in der Spitze, werden verworfen (None)."""
    y = x[a:b].copy()
    h = huelle_db(y, glatt_ms)
    p = int(np.argmax(h))
    ausklang = (len(y) - p) / FS
    if ausklang < min_ausklang_s:
        return None
    if h[-int(0.05 * FS):].mean() - h[p] > max_endpegel_db and b >= len(x) - int(0.02 * FS):
        return None  # am Ende der Aufnahme abgeschnitten, und dort noch laut
    # Abklingkurve: zusätzliche Absenkung, die von 0 dB (Spitze + 15 % des Auslaufs) bis ziel_db
    # am Ende geht – der eigene Auslauf der Aufnahme bleibt darunter erhalten
    s = p + int(0.15 * (len(y) - p))
    k = np.zeros(len(y))
    k[s:] = np.linspace(0, 1, len(y) - s)
    eigen = np.clip(h - h[p], ziel_db, 0)           # wie weit die Aufnahme selbst schon gefallen ist
    noetig = np.minimum(0, ziel_db * k - eigen)     # nur so viel nachhelfen, wie noch fehlt
    y *= 10 ** (np.clip(noetig, ziel_db, 0) * (k > 0) / 20)
    ne = min(int(ein_ms * FS / 1000), p)
    if ne > 0:
        y[:ne] *= np.sin(np.linspace(0, np.pi / 2, ne)) ** 2
    return y


def roehre(x, f0=45.0, n=12, q=14.0, nass=0.85, abfall=0.5):
    """Resonanz einer langen Röhre (wie der hohle Kamm eines Entenschnabelsauriers): eine Reihe
    schmaler Resonanzen bei Vielfachen des Grundtons f0. Ein geräuschhafter oder rauer Tierruf
    bekommt dadurch einen hohlen, hornartigen Ton. nass = Anteil des Röhrenklangs."""
    from scipy.signal import iirpeak, lfilter
    y = np.zeros_like(x)
    for k in range(1, n + 1):
        f = k * f0
        if f > 0.45 * FS:
            break
        b, a = iirpeak(f, q, fs=FS)
        y += lfilter(b, a, x) / k ** abfall
    rx, ry = np.sqrt((x ** 2).mean()) + 1e-12, np.sqrt((y ** 2).mean()) + 1e-12
    return (1 - nass) * x / rx + nass * y / ry


def resonanz(x, moden):
    """Tiefe Eigenschwingungen dazurechnen (z. B. Boden unter einem schweren Tritt): je Mode ein
    Resonator mit Frequenz f, Nachklingzeit t60 und Anteil. Der Anteil bezieht sich auf die Spitze
    des Aufpralls (50-ms-Hüllkurve): 0,7 heißt, die Mode setzt 3 dB unter dem Aufprall ein und
    klingt dann über t60 ab. Der Aufprall selbst bleibt die Aufnahme."""
    from scipy.signal import lfilter
    y = x.copy()
    spitze = np.sqrt(10 ** (huelle_db(x, 50).max() / 10))
    for f, t60, anteil in moden:
        r = 10 ** (-3 / (t60 * FS))
        w = 2 * np.pi * f / FS
        z = lfilter([1 - r], [1, -2 * r * np.cos(w), r * r], x)
        zs = np.sqrt(10 ** (huelle_db(z, 50).max() / 10)) + 1e-12
        y += anteil * spitze * z / zs
    return y
