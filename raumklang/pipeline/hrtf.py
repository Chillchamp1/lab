"""HRTF aus einer SOFA-Datei: laden, diffusfeld-entzerren, zwischen Richtungen interpolieren.

Kopfbezug: x = Blickrichtung, y = links, z = Scheitel. Azimut zählt wie in SOFA
gegen den Uhrzeigersinn (links = +90°), Elevation nach oben.

Die HRTF ist austauschbar: jede SOFA-Datei mit Data.IR (M, 2, N) und
SourcePosition in Kugelkoordinaten funktioniert (CIPIC, eigene Messung, ...).
"""
import numpy as np
import h5py
from scipy.signal import resample_poly
from scipy.spatial import cKDTree, ConvexHull
from fractions import Fraction

C_SCHALL = 343.0


def richtung(az_grad, el_grad):
    az, el = np.radians(az_grad), np.radians(el_grad)
    return np.stack([np.cos(el) * np.cos(az), np.cos(el) * np.sin(az), np.sin(el)], -1)


def _terzglaettung(freq, wert_db, bruchteil=3):
    """Glättet eine dB-Kurve über ein gleitendes Fenster von 1/bruchteil Oktave."""
    aus = np.empty_like(wert_db)
    k = 2 ** (0.5 / bruchteil)
    lin = 10 ** (wert_db / 10)
    kum = np.concatenate([[0], np.cumsum(lin)])
    lo = np.searchsorted(freq, freq / k, 'left')
    hi = np.searchsorted(freq, freq * k, 'right')
    hi = np.maximum(hi, lo + 1)
    aus = 10 * np.log10((kum[hi] - kum[lo]) / (hi - lo))
    return aus


def _minimalphase(betrag, nfft):
    """Minimalphasiges Spektrum (rfft-Raster) zu einem Betragsgang."""
    voll = np.concatenate([betrag, betrag[-2:0:-1]])
    cep = np.fft.ifft(np.log(np.maximum(voll, 1e-8))).real
    falt = np.zeros(nfft)
    falt[0] = 1
    falt[1:nfft // 2] = 2
    falt[nfft // 2] = 1
    return np.exp(np.fft.fft(cep * falt))[:nfft // 2 + 1]


class HRTF:
    def __init__(self, sofa_pfad, fs=44100, nfft=2048, diffusfeld=True, max_db=12.0, nachbarn=3):
        with h5py.File(sofa_pfad, 'r') as f:
            ir = f['Data.IR'][:].astype(np.float64)
            fs_sofa = float(f['Data.SamplingRate'][0])
            pos = f['SourcePosition'][:]
            typ = f['SourcePosition'].attrs.get('Type', b'spherical')
        typ = typ.decode() if isinstance(typ, bytes) else str(typ)
        if typ.startswith('cart'):
            v = pos / np.linalg.norm(pos, axis=1, keepdims=True)
        else:
            v = richtung(pos[:, 0], pos[:, 1])
        if fs_sofa != fs:
            br = Fraction(int(fs), int(fs_sofa))
            ir = resample_poly(ir, br.numerator, br.denominator, axis=-1)
        self.fs, self.nfft, self.k = fs, nfft, nachbarn
        self.vek = v
        self.baum = cKDTree(v)
        # Dreiecksnetz auf der Kugel: zwischen drei Messrichtungen wird baryzentrisch gemischt.
        # Das ist stetig – anders als „die k nächsten nach Abstand“, deren Auswahl beim Wechsel springt.
        self.dreiecke = ConvexHull(v).simplices
        ecken = v[self.dreiecke]                       # (T, 3 Ecken, 3 Koordinaten)
        self.dreieck_inv = np.linalg.inv(np.transpose(ecken, (0, 2, 1)))
        anz = np.bincount(self.dreiecke.ravel(), minlength=len(v))
        self.an_ecke = np.full((len(v), anz.max()), -1)
        fuell = np.zeros(len(v), int)
        for t, tri in enumerate(self.dreiecke):
            for e in tri:
                self.an_ecke[e, fuell[e]] = t
                fuell[e] += 1
        self.freq = np.fft.rfftfreq(nfft, 1 / fs)
        M = ir.shape[0]

        # Einsatzzeit je Ohr (für die Interpolation getrennt von der Klangfarbe geführt)
        auf = 8
        hoch = resample_poly(ir, auf, 1, axis=-1)
        spitze = np.abs(hoch).max(-1, keepdims=True)
        tau = np.argmax(np.abs(hoch) > 0.15 * spitze, axis=-1) / auf  # Abtastwerte
        self.vorlauf = 24.0
        H = np.fft.rfft(ir, nfft, axis=-1)
        schieb = (tau - self.vorlauf)[..., None]
        H = H * np.exp(2j * np.pi * self.freq / fs * schieb)  # alle auf denselben Einsatz
        self.tau = (tau - tau.min()) / fs  # Sekunden, relativ

        # Raumwinkel-Gewichte: wie viel Kugelfläche gehört zu jeder Messrichtung
        rng = np.random.default_rng(1)
        p = rng.normal(size=(200000, 3))
        p /= np.linalg.norm(p, axis=1, keepdims=True)
        d, i = self.baum.query(p)
        gew = np.bincount(i[d < 0.2], minlength=M).astype(float)
        gew /= gew.sum()
        self.gewicht = gew

        self.eq_db = np.zeros_like(self.freq)
        if diffusfeld:
            P = np.einsum('m,mef->f', gew, np.abs(H) ** 2) / 2
            P_db = 10 * np.log10(P + 1e-20)
            P_db = _terzglaettung(self.freq, P_db)
            band = (self.freq > 200) & (self.freq < 8000)
            P_db -= P_db[band].mean()
            eq = np.clip(-P_db, -max_db, max_db)
            # außerhalb des verlässlichen Bereichs den Randwert halten
            lo, hi = np.searchsorted(self.freq, [80, 17000])
            eq[:lo] = eq[lo]
            eq[hi:] = eq[hi]
            self.eq_db = eq
            H = H * _minimalphase(10 ** (eq / 20), nfft)
        # gemeinsamer Pegel: Diffusfeld-Mittel = 0 dB im Band 200 Hz–8 kHz
        P = np.einsum('m,mef->f', gew, np.abs(H) ** 2) / 2
        band = (self.freq > 200) & (self.freq < 8000)
        H /= np.sqrt(P[band].mean())
        self.H = H.astype(np.complex64)
        self.min_el = float(np.degrees(np.arcsin(v[:, 2].min())))

    def gewichte(self, vek):
        """Drei Messrichtungen und ihre baryzentrischen Gewichte je Richtung."""
        n = len(vek)
        _, nah = self.baum.query(vek, k=3)
        kand = self.an_ecke[nah].reshape(n, -1)                       # Dreiecke an den 3 nächsten Ecken
        gueltig = kand >= 0
        kk = np.where(gueltig, kand, 0)
        lam = np.einsum('ncij,nj->nci', self.dreieck_inv[kk], vek)    # (n, C, 3)
        innen = gueltig & (lam.min(-1) >= -1e-9) & (lam.sum(-1) > 0)
        wahl = np.argmax(innen, 1)
        treffer = innen[np.arange(n), wahl]
        t = kk[np.arange(n), wahl]
        w = lam[np.arange(n), wahl]
        w = np.clip(w, 0, None)
        w /= np.maximum(w.sum(1, keepdims=True), 1e-12)
        i = self.dreiecke[t]
        if not treffer.all():  # große Dreiecke (z. B. in der Messlücke unten): alle Dreiecke prüfen
            f = np.flatnonzero(~treffer)
            lam = np.einsum('tij,nj->nti', self.dreieck_inv, vek[f])
            innen = (lam.min(-1) >= -1e-9) & (lam.sum(-1) > 0)
            t = np.argmax(innen, 1)
            wf = np.clip(lam[np.arange(len(f)), t], 0, None)
            i[f] = self.dreiecke[t]
            w[f] = wf / np.maximum(wf.sum(1, keepdims=True), 1e-12)
        return i, w

    def filter(self, vek, ohrabstand_extra=None):
        """Filterpaare für Richtungen vek (n, 3) im Kopfbezug -> (n, 2, nfft/2+1) komplex."""
        vek = np.asarray(vek, float)
        vek = vek / np.maximum(np.linalg.norm(vek, axis=-1, keepdims=True), 1e-9)
        i, w = self.gewichte(vek)
        H = np.einsum('nk,nkef->nef', w.astype(np.float32), self.H[i])
        tau = np.einsum('nk,nke->ne', w, self.tau[i])
        H = H * np.exp(-2j * np.pi * self.freq[None, None, :] * tau[:, :, None]).astype(np.complex64)
        return H


def hoerer_basis(blick_grad):
    """Kopfachsen (Blick, links, Scheitel) im Bezug der Unterlage (x = Füße, y = links, z = oben)
    für einen Liegenden, dessen Blick blick_grad über der Waagerechten steht (90 = flach, 0 = aufrecht)."""
    b = np.radians(blick_grad)
    f = np.array([np.cos(b), 0.0, np.sin(b)])
    l = np.array([0.0, 1.0, 0.0])
    u = np.cross(f, l)
    return np.stack([f, l, u])  # Zeilen: Projektion auf Blick, links, Scheitel
