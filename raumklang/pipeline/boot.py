"""Das Ruderboot als akustische Umgebung.

Bootsbezug: x = Bug (dorthin zeigen die Füße), y = Backbord (links), z = oben,
Ursprung mittschiffs auf der Wasserlinie. Weltbezug: Wasserfläche z = 0.

Der Kopf liegt fest im Boot. Bootsfeste Quellen (Knarzen, Schläge am Rumpf)
stehen deshalb im Kopfbezug still, alles draußen (Möwen, Wellen, Wind) wandert
mit dem Schaukeln um den Kopf.

Schallwege zum Kopf:
  direkt        – liegt die Quelle unter der Bordkante, dann gebeugt über die Kante
  bordwand      – Spiegelung an der Innenseite der Backbord- bzw. Steuerbordwand
  boden         – Spiegelung an den Bodenbrettern
  wasser        – Spiegelbild an der Wasserfläche, kommt nur über die Bordkante herein
"""
import numpy as np
from kern import FREQ, beugung_db, streukern
from scipy.ndimage import uniform_filter1d
from hrtf import hoerer_basis


def _schmalband(rng, n, rate, f0, breite, spitze):
    """Schmalbandiges Rauschen um f0: unregelmäßiges Schaukeln statt Sinus."""
    X = np.fft.rfft(rng.normal(size=n))
    f = np.fft.rfftfreq(n, 1 / rate)
    X *= np.exp(-0.5 * ((f - f0) / breite) ** 2)
    x = np.fft.irfft(X, n)
    return x / np.abs(x).max() * spitze


def _sig(x):
    return 1 / (1 + np.exp(-np.clip(x, -30, 30)))


class Boot:
    RATE = 50.0  # Stützstellen der Bewegung je Sekunde

    def __init__(self, cfg, dauer, saat=3):
        self.a = cfg.get('halbe_laenge', 2.1)
        self.b = cfg.get('halbe_breite', 0.62)
        self.rand = cfg.get('bordkante', 0.42)
        self.boden = cfg.get('boden', -0.05)
        self.kopf = np.array(cfg.get('kopf', [-0.9, 0.08, 0.17]), float)
        self.basis = hoerer_basis(cfg.get('blick', 55.0))
        self.ohr = cfg.get('ohrabstand', 0.085)
        self.wand_r = cfg.get('wand_reflexion', 0.45)
        self.streu = {n: streukern(saat * 10 + i) for i, n in enumerate(['wand1.0', 'wand-1.0', 'boden', 'wasser'])}
        self.boden_r = cfg.get('boden_reflexion', 0.5)  # relativ zur Wand: Kissen und Körper decken den Boden ab
        rng = np.random.default_rng(saat)
        n = int((dauer + 20) * self.RATE)
        bw = cfg.get('bewegung', {})
        g = np.radians
        self.t = np.arange(n) / self.RATE
        self.roll = _schmalband(rng, n, self.RATE, 1 / bw.get('roll_periode', 4.2), 0.035, g(bw.get('roll_grad', 5.0)))
        self.stampf = _schmalband(rng, n, self.RATE, 1 / bw.get('stampf_periode', 3.3), 0.04, g(bw.get('stampf_grad', 2.2)))
        self.hub = _schmalband(rng, n, self.RATE, 1 / bw.get('hub_periode', 5.5), 0.03, bw.get('hub_m', 0.22))
        self.gier = _schmalband(rng, n, self.RATE, 0.0, 0.006, g(bw.get('gier_grad', 20.0)))

    # --- Bewegung ---------------------------------------------------------
    def winkel(self, t):
        return (np.interp(t, self.t, self.roll), np.interp(t, self.t, self.stampf),
                np.interp(t, self.t, self.gier), np.interp(t, self.t, self.hub))

    def welt_zu_boot(self, p, t):
        """Punkte p (n, 3) im Weltbezug zu Zeiten t (n,) in den Bootsbezug."""
        r, s, y, h = self.winkel(t)
        p = np.array(p, float)
        p[:, 2] -= h
        # R = Rz(y) Ry(s) Rx(r); gesucht R^T p
        cy, sy = np.cos(y), np.sin(y)
        x1 = cy * p[:, 0] + sy * p[:, 1]
        y1 = -sy * p[:, 0] + cy * p[:, 1]
        z1 = p[:, 2]
        cs, ss = np.cos(s), np.sin(s)
        x2 = cs * x1 - ss * z1
        z2 = ss * x1 + cs * z1
        cr, sr = np.cos(r), np.sin(r)
        y3 = cr * y1 + sr * z2
        z3 = -sr * y1 + cr * z2
        return np.stack([x2, y3, z3], 1)

    def rollumkehr(self, t0, t1):
        """Zeitpunkte, an denen das Rollen umkehrt: (t, Seite, Stärke 0..1).
        Seite +1 = Backbord taucht ein, -1 = Steuerbord."""
        i0, i1 = int(t0 * self.RATE), int(t1 * self.RATE)
        r = self.roll[i0:i1]
        d = np.diff(r)
        k = np.flatnonzero(np.sign(d[1:]) != np.sign(d[:-1])) + 1
        aus = []
        gr = np.abs(self.roll).max()
        for i in k:
            aus.append(((i0 + i) / self.RATE, -1 if r[i] > 0 else 1, abs(r[i]) / gr))
        return aus

    # --- Geometrie --------------------------------------------------------
    def _kante(self, p, e):
        """Sichtlinie von Empfänger e (n, 3) zur Quelle p (n, 3) gegen die Bordkante prüfen.
        Rückgabe: innen (Quelle im Boot), frei, Umweg, Kantenpunkt."""
        v = p - e
        sh = np.maximum(np.hypot(v[:, 0], v[:, 1]), 1e-6)
        ux, uy = v[:, 0] / sh, v[:, 1] / sh
        A = (ux / self.a) ** 2 + (uy / self.b) ** 2
        B = 2 * (e[:, 0] * ux / self.a ** 2 + e[:, 1] * uy / self.b ** 2)
        C = (e[:, 0] / self.a) ** 2 + (e[:, 1] / self.b) ** 2 - 1
        D = np.maximum(B ** 2 - 4 * A * C, 0)
        se = np.maximum((-B + np.sqrt(D)) / (2 * A), 1e-3)
        innen = sh <= se
        r = np.stack([e[:, 0] + se * ux, e[:, 1] + se * uy, np.full(len(se), self.rand)], 1)
        frei = v[:, 2] / sh >= (self.rand - e[:, 2]) / se
        umweg = np.linalg.norm(r - e, axis=1) + np.linalg.norm(p - r, axis=1) - np.linalg.norm(v, axis=1)
        return innen, frei, np.maximum(umweg, 0), r

    def _kopfbezug(self, v):
        return v @ self.basis.T

    def _gang_kante(self, p, e):
        innen, frei, umweg, r = self._kante(p, e)
        db = beugung_db(umweg, frei)
        db[innen] = 0
        return 10 ** (-db / 20), innen, frei, umweg, r

    def pfade(self, p, aussen=True, p_wasserbild=None, mit_spiegelungen=True):
        """Alle Schallwege von den Quellorten p (n_b, 3, Bootsbezug) zum Kopf."""
        n = len(p)
        k = np.broadcast_to(self.kopf, (n, 3))
        wege = []
        # direkt bzw. über die Kante gebeugt
        g, innen, frei, umweg, r = self._gang_kante(p, k)
        v = p - k
        entf = np.linalg.norm(v, axis=1)
        verdeckt = (~innen) & (~frei)
        richt = np.where(verdeckt[:, None], r - k, v)
        ohr = None
        if entf.min() < 2.0:
            links = np.array([0, self.ohr, 0])
            dl = np.linalg.norm(p - (k + links), axis=1)
            dr = np.linalg.norm(p - (k - links), axis=1)
            ohr = np.clip(np.stack([entf / dl, entf / dr], 1), 0.6, 1.8)
        wege.append(dict(name='direkt', entf=entf + np.where(verdeckt, umweg, 0), richt=self._kopfbezug(richt),
                         gang=g.astype(np.float32), ohr=ohr, hall=True))
        if not mit_spiegelungen:
            return wege
        # Holz mit Spanten und einem Körper im Boot spiegelt nur zum Teil gerichtet
        holz = (self.wand_r - 0.2 * np.clip(FREQ / 8000, 0, 1)).astype(np.float32)
        # Bordwände
        for sgn in (1.0, -1.0):
            yw = sgn * self.b
            bild = p.copy()
            bild[:, 1] = 2 * yw - p[:, 1]
            vb = bild - k
            t = (yw - k[:, 1]) / np.where(np.abs(vb[:, 1]) < 1e-6, 1e-6, vb[:, 1])
            q = k + t[:, None] * vb
            w = (_sig((self.rand - q[:, 2]) / 0.06) * _sig((q[:, 2] - self.boden) / 0.06)
                 * _sig((1.7 - np.abs(q[:, 0])) / 0.15) * _sig((yw * sgn - p[:, 1] * sgn) / 0.08) * (t > 0) * (t < 1))
            if w.max() < 0.02:
                continue
            # Kante zwischen Quelle und Wandpunkt: den Wandpunkt auf die Rumpfkontur legen, damit er
            # sicher innen liegt (die Wand als Ebene y = ±b und der Rumpf als Ellipse passen sonst nicht zusammen)
            qi = q.copy()
            qi[:, 1] = sgn * 0.97 * self.b * np.sqrt(np.clip(1 - (q[:, 0] / self.a) ** 2, 0.05, 1))
            gq = self._gang_kante(p, qi)[0]
            wege.append(dict(name='bordwand', streu=self.streu[f'wand{sgn}'], entf=np.linalg.norm(vb, axis=1), richt=self._kopfbezug(vb),
                             gang=(gq * holz[None, :] * w[:, None]).astype(np.float32), ohr=None, hall=False))
        # Bodenbretter
        bild = p.copy()
        bild[:, 2] = 2 * self.boden - p[:, 2]
        vb = bild - k
        t = (self.boden - k[:, 2]) / np.where(np.abs(vb[:, 2]) < 1e-6, -1e-6, vb[:, 2])
        q = k + t[:, None] * vb
        w = _sig((0.8 - (q[:, 0] / self.a) ** 2 - (q[:, 1] / self.b) ** 2) / 0.08) * (p[:, 2] > self.boden) * (t > 0) * (t < 1)
        if w.max() > 0.02:
            gq = self._gang_kante(p, q * np.array([0.97, 0.97, 1.0]))[0]
            wege.append(dict(name='boden', streu=self.streu['boden'], entf=np.linalg.norm(vb, axis=1), richt=self._kopfbezug(vb),
                             gang=(gq * (self.boden_r * holz[None, :]) * w[:, None]).astype(np.float32), ohr=None, hall=False))
        # Spiegelbild an der Wasserfläche
        if aussen and p_wasserbild is not None:
            g, innen, frei, umweg, r = self._gang_kante(p_wasserbild, k)
            vw = p_wasserbild - k
            # Spiegelpunkt auf dem Wasser: liegt er unter dem Rumpf, verdeckt das Boot den Weg ganz
            t = -k[:, 2] / np.where(vw[:, 2] < -1e-6, vw[:, 2], -1e-6)
            q = k + np.clip(t, 0, 1)[:, None] * vw
            rho = np.sqrt((q[:, 0] / self.a) ** 2 + (q[:, 1] / self.b) ** 2)
            w = _sig((rho - 1.15) / 0.06)
            richt = np.where((~frei)[:, None], r - k, vw)
            if w.max() > 0.02:
                wege.append(dict(name='wasser', streu=self.streu['wasser'], entf=np.linalg.norm(vw, axis=1) + umweg, richt=self._kopfbezug(richt),
                                 gang=(0.9 * g * w[:, None]).astype(np.float32), ohr=None, hall=False))
        # Spiegelungen: Gültigkeitsgrenzen über ~60 ms verschleifen, damit kein Weg hart ein- oder aussetzt
        for weg in wege[1:]:
            if len(weg['gang']) > 5:
                weg['gang'] = uniform_filter1d(weg['gang'], 5, axis=0, mode='nearest')
        return wege
