"""Glaskuppel am Meeresgrund als akustische Umgebung (gleiche Schnittstelle wie boot.py, wald.py).

Bezug: x = Blickrichtung in der Waagerechten, y = links, z = oben, Ursprung am Meeresgrund
in der Mitte der Kuppel. Der Hörer liegt in einer luftgefüllten Halbkugel aus dickem Acrylglas
(Radius ~2,5 m) auf dem Sandboden, etwa 12 m unter der Oberfläche, und schaut schräg nach
oben ins Wasser. Er bewegt sich nicht.

Was anders ist als an Land:
  * Die Quellen sind im Wasser. Schall läuft dort mit ~1500 m/s statt 343 m/s: Laufzeiten und
    Doppler sind entsprechend kleiner. Der Renderkern rechnet mit Luftschall; deshalb wird
    der Weg für die Laufzeit gestaucht (343/1500) und die Pegelabnahme auf die wahre
    Entfernung zurückgerechnet.
  * Wasser schluckt Höhen kaum (bei 10 kHz um 1 dB/km statt ~100 dB/km in Luft): ferne Wale
    bleiben klar. Die Luftdämpfung des Kerns wird herausgerechnet.
  * Der Schall kommt durch die Kuppel: dickes Acryl lässt Tiefen gut durch, dämpft die Höhen
    (Massegesetz, hier als sanfter Abfall). Die Richtung bleibt erhalten – die Kuppelwand
    strahlt dort ab, wo der Schall auftrifft.
  * Innen ist die Kuppel ein kleiner, harter Raum: frühe Spiegelung am Boden der Kuppel und an
    der gegenüberliegenden Wand, dazu kurzer, heller Nachhall (über die Szene).
  * Unter Wasser kommt Schall auch über die Oberfläche (Spiegelung, Phasenumkehr) und den
    Meeresgrund – bei fernen Quellen verschmiert das zu einem langen Nachhall (Weitenhall).
"""
import numpy as np
from scipy.ndimage import uniform_filter1d
from kern import FREQ, streukern, LUFT_DB_M
from hrtf import hoerer_basis, C_SCHALL

C_WASSER = 1500.0


def _sig(x):
    return 1 / (1 + np.exp(-np.clip(x, -30, 30)))


class Kuppel:
    def __init__(self, cfg, dauer, saat=3):
        self.periode = dauer
        self.kopf = np.array(cfg.get('kopf', [0.0, 0.0, 0.45]), float)
        self.basis = hoerer_basis(cfg.get('blick', 55.0))
        self.ohr = cfg.get('ohrabstand', 0.085)
        self.radius = cfg.get('radius', 2.5)
        self.tiefe = cfg.get('tiefe', 12.0)                       # Wasseroberfläche bei z = tiefe
        self.stauch = C_SCHALL / C_WASSER
        f = FREQ
        # Durchgang durch das Acryl: Tiefen frei, ab ~1,5 kHz sanft fallend, oben bis −14 dB
        db = -cfg.get('glas_db', 14.0) * np.clip(np.log2(np.maximum(f, 1) / cfg.get('glas_ab_hz', 1500)) / 3.5, 0, 1)
        self._glas = (10 ** (db / 20)).astype(np.float32)
        self._boden = (cfg.get('boden_reflexion', 0.5) / (1 + (f / 2500) ** 1.2)).astype(np.float32)   # Teppich/Holz
        self._wand = (cfg.get('wand_reflexion', 0.8) * np.ones_like(f)).astype(np.float32)             # Acryl innen, hart
        self.streu = {n: streukern(saat * 10 + i) for i, n in enumerate(['boden', 'wand'])}

    def welt_zu_boot(self, p, t):
        return np.array(p, float)

    def rollumkehr(self, t0, t1):
        return []

    def _kopfbezug(self, v):
        return v @ self.basis.T

    def _wasserweg(self, entf):
        """Frequenzgang für einen Weg durch das Wasser: Luftdämpfung des Kerns herausrechnen
        (er sieht nur den gestauchten Weg) und die Pegelabnahme auf die wahre Entfernung
        zurückbringen; dazu das Acryl."""
        e_k = entf * self.stauch
        zurueck = 10 ** (LUFT_DB_M[None, :] * e_k[:, None] / 20)
        amp = (np.maximum(e_k, 0.3) / np.maximum(entf, 0.3))[:, None]
        return (zurueck * amp * self._glas[None, :]).astype(np.float32), e_k

    def pfade(self, p, aussen=True, p_wasserbild=None, mit_spiegelungen=True):
        n = len(p)
        k = np.broadcast_to(self.kopf, (n, 3))
        v = p - k
        entf = np.linalg.norm(v, axis=1)
        innen = np.linalg.norm(p, axis=1) < self.radius        # Quelle in der Kuppel (Luftschall)
        if innen.all():
            gang, e_k = None, entf
        else:
            gang, e_k = self._wasserweg(entf)
        ohr = None
        if entf.min() < 2.0:
            links = np.array([0, self.ohr, 0])
            dl = np.linalg.norm(p - (k + links), axis=1)
            dr = np.linalg.norm(p - (k - links), axis=1)
            ohr = np.clip(np.stack([entf / dl, entf / dr], 1), 0.6, 1.8)
        wege = [dict(name='direkt', entf=e_k, entf_wahr=entf, richt=self._kopfbezug(v), gang=gang, ohr=ohr, hall=True)]
        if not mit_spiegelungen:
            return wege
        # Oberfläche: Spiegelquelle über der Wasseroberfläche (Phasenumkehr – im Betrag nicht sichtbar,
        # aber für tiefe Frequenzen löscht sie sich nahe der Oberfläche aus: Abfall unter ~200 Hz)
        bild = p.copy()
        bild[:, 2] = 2 * self.tiefe - p[:, 2]
        vb = bild - k
        eb = np.linalg.norm(vb, axis=1)
        g_o, e_o = self._wasserweg(eb)
        tief_weg = (1 - 1 / (1 + (FREQ / 200) ** 2))[None, :]
        wege.append(dict(name='oberflaeche', entf=e_o, richt=self._kopfbezug(vb), gang=(g_o * 0.7 * tief_weg).astype(np.float32),
                         ohr=None, hall=False))
        # Kuppelboden unter dem Hörer
        bild = p.copy()
        bild[:, 2] = -p[:, 2]
        vb = bild - k
        eb = np.linalg.norm(vb, axis=1)
        g_b, e_b = self._wasserweg(eb)
        wege.append(dict(name='boden', streu=self.streu['boden'], entf=e_b + 0.0, richt=self._kopfbezug(vb),
                         gang=(g_b * self._boden[None, :]).astype(np.float32), ohr=None, hall=False))
        # gegenüberliegende Kuppelwand: der Schall läuft am Kopf vorbei und kommt von der anderen Seite zurück
        u = v / np.maximum(entf, 1e-6)[:, None]
        q = -u * self.radius                                   # Wandpunkt gegenüber (vereinfacht: Mittelpunkt der Kuppel)
        q[:, 2] = np.abs(q[:, 2])
        vq = q - k
        zus = np.linalg.norm(vq, axis=1) + np.linalg.norm(q - k, axis=1)
        g_w, _ = self._wasserweg(entf)
        e_w = e_k + zus
        wege.append(dict(name='wand', streu=self.streu['wand'], entf=e_w, richt=self._kopfbezug(vq),
                         gang=(g_w * self._wand[None, :] * 0.6).astype(np.float32),
                         ohr=None, hall=False))
        for weg in wege[1:]:
            if len(weg['gang']) > 5:
                weg['gang'] = uniform_filter1d(weg['gang'], 5, axis=0, mode='nearest')
        return wege
