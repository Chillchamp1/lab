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
from kern import FREQ, streukern
from hrtf import hoerer_basis


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
        f = np.clip(FREQ / 3000, 0, 1.6)
        self._wald_gang = (0.15 + 0.85 * f ** 0.8).astype(np.float32)        # Form über der Frequenz
        self._dach_gang = np.clip(FREQ / 4000, 0, 1.5).astype(np.float32)
        r_boden = cfg.get('boden_reflexion', 0.55)
        self._boden = (r_boden / (1 + (FREQ / 900) ** 1.2)).astype(np.float32)   # nasses Laub: Höhen weg
        self._holz = (self.stamm_r - 0.2 * np.clip(FREQ / 8000, 0, 1)).astype(np.float32)
        self.streu = {n: streukern(saat * 10 + i) for i, n in enumerate(['boden', 'stamm'])}

    # Schnittstelle wie Boot: der Hörer sitzt still
    def welt_zu_boot(self, p, t):
        return np.array(p, float)

    def rollumkehr(self, t0, t1):
        return []

    def _kopfbezug(self, v):
        return v @ self.basis.T

    def _direkt_gang(self, p, entf):
        weg = np.maximum(entf - 3.0, 0)                                    # erst ab einigen Metern
        db = self.wald_db_m * weg[:, None] * self._wald_gang[None, :]
        ueber = _sig((p[:, 2] - self.dach) / 1.5)                          # Quelle über dem Blätterdach
        db = db + ueber[:, None] * self.dach_db * self._dach_gang[None, :]
        return (10 ** (-np.clip(db, 0, 40) / 20)).astype(np.float32)

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
