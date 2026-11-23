"""Der Wald als akustische Umgebung (Gegenstück zu boot.py, gleiche Schnittstelle).

Bezug: x = Blickrichtung des Hörers in der Waagerechten, y = links, z = oben, Ursprung am
Boden unter dem Hörer. Der Hörer sitzt am Boden, halb liegend an einen Stamm gelehnt, und
schaut schräg nach oben ins Blätterdach (Blick 55° über der Waagerechten wie beim Liegen).
Er bewegt sich nicht: Welt- und Hörerbezug sind gleich.

Schallwege zum Kopf:
  direkt   – mit Zusatzdämpfung des Waldes (Streuung an Stämmen und Laub) und, für Quellen
             über dem Blätterdach, der Dämpfung durch das Laub
  boden    – Spiegelung am nassen Laubboden (weich: schluckt die Höhen)
  stamm    – der Stamm im Rücken: frühe, nahe Reflexion von hinten
"""
import numpy as np
from scipy.ndimage import uniform_filter1d
from kern import FREQ, FS, NFFT, VORHALT, LUFT_DB_M, _PHASE_VORHALT, streukern
from hrtf import hoerer_basis, C_SCHALL


def _sig(x):
    return 1 / (1 + np.exp(-np.clip(x, -30, 30)))


class Wald:
    def __init__(self, cfg, dauer, saat=3):
        self.periode = dauer
        self.kopf = np.array(cfg.get('kopf', [0.0, 0.0, 0.85]), float)
        self.basis = hoerer_basis(cfg.get('blick', 55.0))
        self.ohr = cfg.get('ohrabstand', 0.085)
        self.stamm_x = cfg.get('stamm_abstand', -0.28)          # Stammoberfläche hinter dem Kopf
        self.stamm_breite = cfg.get('stamm_breite', 0.5)
        self.stamm_r = cfg.get('stamm_reflexion', 0.5)
        self.dach = cfg.get('blaetterdach_hoehe', 9.0)
        self.dach_db = cfg.get('blaetterdach_db', 7.0)          # Dämpfung bei 4 kHz durch das Laub
        self.wald_db_m = cfg.get('wald_db_m', 0.10)             # Zusatzdämpfung je Meter bei 3 kHz
        self.wald_max_m = cfg.get('wald_max_m', 80.0)           # weiter weg läuft der Schall über die Kronen
        f = np.clip(FREQ / 3000, 0, 1.6)
        self._wald_gang = (0.15 + 0.85 * f ** 0.8).astype(np.float32)        # Form über der Frequenz
        self._dach_gang = np.clip(FREQ / 4000, 0, 1.5).astype(np.float32)
        r_boden = cfg.get('boden_reflexion', 0.55)
        self._boden = (r_boden / (1 + (FREQ / 900) ** 1.2)).astype(np.float32)   # nasses Laub: Höhen weg
        self._holz = (self.stamm_r - 0.2 * np.clip(FREQ / 8000, 0, 1)).astype(np.float32)
        self.streu = {n: streukern(saat * 10 + i) for i, n in enumerate(['boden', 'stamm'])}
        # Stämme ringsum als Streuer (nur wenn die Szene sie angibt): x, y, Radius
        st = cfg.get('staemme')
        self._staemme = None
        if st:
            srng = np.random.default_rng(saat * 97 + 5)
            n = st.get('anzahl', 36)
            r0, r1 = st.get('abstand_m', [2.5, 30.0])
            rr = np.sqrt(srng.uniform(r0 ** 2, r1 ** 2, n))
            az = srng.uniform(0, 2 * np.pi, n)
            self._staemme = np.column_stack([self.kopf[0] + rr * np.cos(az), self.kopf[1] + rr * np.sin(az),
                                             srng.uniform(*st.get('radius_m', [0.12, 0.4]), n)])
            self.stamm_hoehe = st.get('hoehe_m', 14.0)
            self.stamm_streu = st.get('reflexion', 0.6) * 10 ** (st.get('pegel_db', 0.0) / 20)

    # Schnittstelle wie Boot: der Hörer sitzt still
    def welt_zu_boot(self, p, t):
        return np.array(p, float)

    def rollumkehr(self, t0, t1):
        return []

    def _kopfbezug(self, v):
        return v @ self.basis.T

    def _direkt_gang(self, p, entf):
        weg = np.clip(entf - 3.0, 0, self.wald_max_m)                      # nur die letzten Meter durch den Wald
        db = self.wald_db_m * weg[:, None] * self._wald_gang[None, :]
        ueber = _sig((p[:, 2] - self.dach) / 1.5)                          # Quelle über dem Blätterdach
        db = db + ueber[:, None] * self.dach_db * self._dach_gang[None, :]
        return (10 ** (-np.clip(db, 0, 40) / 20)).astype(np.float32)

    def streu_ir(self, hrtf, p):
        """Impulsantwort (2, L) der Streuung an den Stämmen für eine Quelle am Ort p, und ihr
        Versatz in Abtastwerten. Jeder Stamm wirft einen kleinen Teil des Schalls zurück: später
        als der Direktschall (Umweg), aus seiner Richtung, ohne Tiefen (dünner als die Wellenlänge),
        schwächer je weiter er streut (gewölbte Fläche). Zusammen ergibt das das dichte, frühe
        Flattern, an dem man einen Wald erkennt."""
        S = self._staemme
        if S is None or p[2] > self.dach:
            return None, 0
        k = self.kopf
        d1h = np.linalg.norm(S[:, :2] - p[:2], axis=1)
        d2h = np.linalg.norm(S[:, :2] - k[:2], axis=1)
        z = p[2] + (k[2] - p[2]) * d1h / np.maximum(d1h + d2h, 1e-6)       # Höhe des Spiegelpunkts am Stamm
        s = np.column_stack([S[:, :2], z])
        d1 = np.linalg.norm(s - p, axis=1)
        d2 = np.linalg.norm(s - k, axis=1)
        cos_b = (((s - p) / np.maximum(d1, 1e-6)[:, None]) * ((k - s) / np.maximum(d2, 1e-6)[:, None])).sum(1)
        seitlich = np.sqrt(np.clip((1 - cos_b) / 2, 0, 1))                 # 0 im Schatten hinter dem Stamm, 1 beim Rückwurf
        a = S[:, 2]
        amp = self.stamm_streu * seitlich * np.sqrt(a / (2 * d1 * d2 / (d1 + d2) + a)) / (d1 + d2)
        amp = amp * (z < self.stamm_hoehe) * (d1h > 0.5)
        if amp.max() <= 0:
            return None, 0
        idx = np.flatnonzero(amp > 0.05 * amp.max())
        tau = (d1 + d2) / C_SCHALL
        n0 = int(np.floor(tau[idx].min() * FS))
        ir = np.zeros((2, int(np.ceil(tau[idx].max() * FS)) - n0 + NFFT + 8), np.float32)
        ka = 2 * np.pi * FREQ[None, :] * a[idx, None] / C_SCHALL
        gang = ka ** 2 / (1 + ka ** 2) * 10 ** (-LUFT_DB_M[None, :] * (d1 + d2)[idx, None] / 20)
        gang = gang * self._direkt_gang(p[None, :], np.array([np.linalg.norm(p - k)]))      # der Wald dämpft wie beim Direktschall
        C = hrtf.filter(self._kopfbezug(s[idx] - k)) * (gang * amp[idx, None])[:, None, :] * _PHASE_VORHALT
        h = np.fft.irfft(C, NFFT, axis=-1).astype(np.float32)
        for j, i in enumerate(idx):
            n = int(round(tau[i] * FS)) - n0
            ir[:, n:n + NFFT] += h[j]
        return ir, n0 - VORHALT

    def pfade(self, p, aussen=True, p_wasserbild=None, mit_spiegelungen=True):
        n = len(p)
        k = np.broadcast_to(self.kopf, (n, 3))
        v = p - k
        entf = np.linalg.norm(v, axis=1)
        ohr = None
        if entf.min() < 2.0:
            links = np.array([0, self.ohr, 0])
            dl = np.linalg.norm(p - (k + links), axis=1)
            dr = np.linalg.norm(p - (k - links), axis=1)
            ohr = np.clip(np.stack([entf / dl, entf / dr], 1), 0.6, 1.8)
        wege = [dict(name='direkt', entf=entf, richt=self._kopfbezug(v), gang=self._direkt_gang(p, entf), ohr=ohr, hall=True)]
        if not mit_spiegelungen:
            return wege
        # Waldboden
        bild = p.copy()
        bild[:, 2] = -p[:, 2]
        vb = bild - k
        eb = np.linalg.norm(vb, axis=1)
        w = _sig(p[:, 2] / 0.05)
        wege.append(dict(name='boden', streu=self.streu['boden'], entf=eb, richt=self._kopfbezug(vb),
                         gang=(self._direkt_gang(bild, eb) * self._boden[None, :] * w[:, None]).astype(np.float32), ohr=None, hall=False))
        # Stamm im Rücken (Ebene x = stamm_x, begrenzt in Breite und Höhe)
        xs = self.kopf[0] + self.stamm_x
        bild = p.copy()
        bild[:, 0] = 2 * xs - p[:, 0]
        vb = bild - k
        t = (xs - k[:, 0]) / np.where(np.abs(vb[:, 0]) < 1e-6, -1e-6, vb[:, 0])
        q = k + t[:, None] * vb
        w = (_sig((p[:, 0] - xs) / 0.1) * _sig((self.stamm_breite / 2 - np.abs(q[:, 1])) / 0.06)
             * _sig((3.0 - q[:, 2]) / 0.3) * _sig(q[:, 2] / 0.05) * (t > 0) * (t < 1))
        if w.max() > 0.02:
            es = np.linalg.norm(vb, axis=1)
            wege.append(dict(name='stamm', streu=self.streu['stamm'], entf=es, richt=self._kopfbezug(vb),
                             gang=(self._direkt_gang(bild, es) * self._holz[None, :] * w[:, None]).astype(np.float32), ohr=None, hall=False))
        for weg in wege[1:]:
            if len(weg['gang']) > 5:
                weg['gang'] = uniform_filter1d(weg['gang'], 5, axis=0, mode='nearest')
        return wege
