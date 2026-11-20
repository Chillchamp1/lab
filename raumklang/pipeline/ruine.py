"""Klosterruine bei Nacht als akustische Umgebung (gleiche Schnittstelle wie boot.py, wald.py).

Bezug: x = Blickrichtung in der Waagerechten (zum Chor hin), y = links, z = oben, Ursprung am
Boden unter dem Hörer. Der Hörer liegt im Mittelschiff einer Kirchenruine auf dem Steinboden,
den Kopf auf einer Decke, und schaut schräg nach oben: das Gewölbe ist eingestürzt, über ihm
liegt der Nachthimmel zwischen hohen Mauern.

Schallwege zum Kopf:
  direkt  – frei, wenn die Quelle im Schiff ist oder über die Mauerkrone hinweg kommt; liegt die
            Mauer dazwischen, Dämpfung mit Höhenverlust (Beugung um Fensteröffnungen und Kanten)
  boden   – Steinplatten: hart, reflektiert fast alles
  wände   – die beiden Längsmauern (links/rechts) und die Chorwand vorn: harte, leicht streuende
            Spiegelungen, nur so hoch wie die Mauer noch steht
Der lange Nachhall des Steinraums kommt über die Szene (nachhall); weil das Dach fehlt, ist er
kürzer und heller abgeschnitten als in einer intakten Kirche.
"""
import numpy as np
from scipy.ndimage import uniform_filter1d
from kern import FREQ, streukern
from hrtf import hoerer_basis


def _sig(x):
    return 1 / (1 + np.exp(-np.clip(x, -30, 30)))


class Ruine:
    def __init__(self, cfg, dauer, saat=3):
        self.periode = dauer
        self.kopf = np.array(cfg.get('kopf', [0.0, 0.0, 0.25]), float)
        self.basis = hoerer_basis(cfg.get('blick', 55.0))
        self.ohr = cfg.get('ohrabstand', 0.085)
        self.breite = cfg.get('halbe_breite', 5.5)            # Längsmauern bei y = ±halbe_breite
        self.vorn = cfg.get('chor_abstand', 12.0)              # Chorwand bei x = vorn
        self.hinten = cfg.get('hinten_abstand', -18.0)         # Westwand (meist eingestürzt)
        self.hoehe = cfg.get('mauerhoehe', 9.0)
        self.mauer_db = cfg.get('mauer_db', 18.0)              # Dämpfung durch die Mauer bei 2 kHz
        r_stein = cfg.get('stein_reflexion', 0.8)
        f = FREQ
        self._stein = (r_stein - 0.25 * np.clip(f / 10000, 0, 1)).astype(np.float32)
        self._boden = (cfg.get('boden_reflexion', 0.75) - 0.2 * np.clip(f / 8000, 0, 1)).astype(np.float32)
        form = np.clip(np.log2(np.maximum(f, 20) / 125) / 4, 0, 1.3)      # Mauer: Tiefen kommen eher durch
        self._mauer = (10 ** (-self.mauer_db * (0.3 + 0.7 * form) / 20)).astype(np.float32)
        self.streu = {n: streukern(saat * 10 + i) for i, n in enumerate(['boden', 'links', 'rechts', 'vorn'])}

    def welt_zu_boot(self, p, t):
        return np.array(p, float)

    def rollumkehr(self, t0, t1):
        return []

    def _kopfbezug(self, v):
        return v @ self.basis.T

    def _verdeckt(self, p, k):
        """Anteil (0..1), zu dem eine Mauer zwischen Quelle und Kopf liegt. Über die Mauerkrone
        hinweg ist der Weg frei (weicher Übergang, Beugung an der Kante)."""
        w = np.zeros(len(p))
        for achse, ebene in ((1, self.breite), (1, -self.breite), (0, self.vorn)):
            d = p[:, achse] - k[:, achse]
            t = (ebene - k[:, achse]) / np.where(np.abs(d) < 1e-9, 1e-9, d)
            kreuzt = (t > 0) & (t < 1)
            z = k[:, 2] + t * (p[:, 2] - k[:, 2])
            unter = _sig((self.hoehe - z) / 0.6)
            w = np.maximum(w, kreuzt * unter)
        return w

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
        verdeckt = self._verdeckt(p, k)
        gang = None
        if verdeckt.max() > 0.01:
            gang = (1 - verdeckt[:, None] + verdeckt[:, None] * self._mauer[None, :]).astype(np.float32)
        wege = [dict(name='direkt', entf=entf, richt=self._kopfbezug(v), gang=gang, ohr=ohr, hall=True)]
        if not mit_spiegelungen:
            return wege
        innen = (np.abs(p[:, 1]) < self.breite) & (p[:, 0] < self.vorn)
        # Steinboden
        bild = p.copy()
        bild[:, 2] = -p[:, 2]
        vb = bild - k
        g = self._boden[None, :] * (1 - verdeckt[:, None] + verdeckt[:, None] * self._mauer[None, :])
        wege.append(dict(name='boden', streu=self.streu['boden'], entf=np.linalg.norm(vb, axis=1), richt=self._kopfbezug(vb),
                         gang=(g * _sig(p[:, 2] / 0.05)[:, None]).astype(np.float32), ohr=None, hall=False))
        # Mauern – nur für Quellen im Schiff, nur wo die Mauer noch steht (Spiegelpunkt unter der Krone)
        for name, achse, ebene in (('links', 1, self.breite), ('rechts', 1, -self.breite), ('vorn', 0, self.vorn)):
            bild = p.copy()
            bild[:, achse] = 2 * ebene - p[:, achse]
            vb = bild - k
            t = (ebene - k[:, achse]) / np.where(np.abs(vb[:, achse]) < 1e-9, 1e-9, vb[:, achse])
            q = k + t[:, None] * vb
            gueltig = innen * (t > 0) * (t < 1) * _sig((self.hoehe - q[:, 2]) / 0.5)
            if achse == 1:
                gueltig = gueltig * _sig((self.vorn - q[:, 0]) / 0.5) * _sig((q[:, 0] - self.hinten) / 0.5)
            else:
                gueltig = gueltig * _sig((self.breite - np.abs(q[:, 1])) / 0.5)
            if gueltig.max() < 0.02:
                continue
            wege.append(dict(name=name, streu=self.streu[name], entf=np.linalg.norm(vb, axis=1), richt=self._kopfbezug(vb),
                             gang=(self._stein[None, :] * gueltig[:, None]).astype(np.float32), ohr=None, hall=False))
        for weg in wege[1:]:
            if len(weg['gang']) > 5:
                weg['gang'] = uniform_filter1d(weg['gang'], 5, axis=0, mode='nearest')
        return wege
