"""Bausteine, die Quellen körperlicher machen: Breite, Nahfeld, Richtwirkung.

breitenmasken   Eine ausgedehnte Quelle (Wellenkamm, Regenfläche, Baumkrone) kommt nicht aus
                einem Punkt. Ihr Spektrum wird in Bänder geteilt, die abwechselnd aus mehreren
                Richtungen über die Breite der Quelle kommen. Die Masken ergänzen sich zu 1 –
                fallen die Richtungen zusammen, bleibt genau die Punktquelle übrig.
Nahfeld         Unter einem Meter ändert sich nicht nur der Pegel je Ohr: an der zugewandten
                Seite steigen auch die Tiefen stark, die abgewandte Seite liegt tiefer im
                Schatten. Kugelkopf nach Duda & Martens (1998), als Verhältnis zur Messentfernung
                der HRTF (1 m).
richtwirkung    Rufe sind in Rufrichtung heller und lauter als von hinten.
"""
import numpy as np
from scipy.special import spherical_jn, spherical_yn, eval_legendre
from kern import FREQ
from hrtf import C_SCHALL

# Bandmitten für die Breite: unten 300 Hz breit (schmalere Bänder klingen in der Blockverarbeitung
# nach), darüber Terzen. Das erste „Band“ (bis 100 Hz) gehört allen Teilquellen gemeinsam.
_MITTEN = np.array([100, 400, 700, 1000, 1300, 1640, 2070, 2600, 3280, 4130, 5200, 6560, 8260, 10400, 13100, 16500], float)


def breitenmasken(n_teile, rng):
    """(n_teile, nf) Masken, Summe = 1 bei jeder Frequenz. Benachbarte Bänder gehen an
    verschiedene Teilquellen; die Zuordnung ist je Ereignis zufällig."""
    nb = len(_MITTEN)
    # Gewicht jedes Bands je Frequenz: cos²-Überblendung zwischen den Bandmitten
    w = np.zeros((nb, len(FREQ)))
    j = np.clip(np.searchsorted(_MITTEN, FREQ) - 1, 0, nb - 2)
    u = np.clip((FREQ - _MITTEN[j]) / (_MITTEN[j + 1] - _MITTEN[j]), 0, 1)
    np.add.at(w, (j, np.arange(len(FREQ))), np.cos(np.pi / 2 * u) ** 2)
    np.add.at(w, (j + 1, np.arange(len(FREQ))), np.sin(np.pi / 2 * u) ** 2)
    zu = []
    while len(zu) < nb - 1:
        perm = list(rng.permutation(n_teile))
        if zu and perm[0] == zu[-1]:
            perm = perm[1:] + perm[:1]
        zu += perm
    m = np.tile(w[0] / n_teile, (n_teile, 1))            # Tiefen: alle gemeinsam
    for band, teil in enumerate(zu[:nb - 1], start=1):
        m[teil] += w[band]
    return m.astype(np.float32)


class Nahfeld:
    """Betragsverhältnis Kugelkopf(r, Winkel zum Ohr, f) / Kugelkopf(1 m, …) als Tabelle."""
    A = 0.0875            # Kopfradius
    R_REF = 1.0           # Messentfernung der HRTF

    def __init__(self):
        self.r = np.array([0.12, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.65, 0.8, 1.0])
        self.theta = np.radians(np.arange(0, 181, 10))
        f = np.geomspace(60, 8000, 40)
        mu = 2 * np.pi * f * self.A / C_SCHALL
        tab = np.stack([self._kugel(mu, r / self.A, np.cos(self.theta)) for r in self.r])     # (nr, nθ, nf)
        tab = tab / tab[-1][None]
        # auf das Frequenzraster des Renderers; außerhalb 60 Hz…8 kHz den Randwert halten
        lf = np.log(np.clip(FREQ, f[0], f[-1]))
        self.tab = np.stack([[np.interp(lf, np.log(f), tab[i, j]) for j in range(len(self.theta))]
                             for i in range(len(self.r))]).astype(np.float32)
        self.tab = np.clip(self.tab, 10 ** (-15 / 20), 10 ** (20 / 20))

    @staticmethod
    def _kugel(mu, rho, cos_t):
        """|Druck an der Kugeloberfläche / Freifelddruck im Kugelmittelpunkt| für eine Punktquelle
        im Abstand rho (in Kopfradien), Reihenentwicklung nach Kugelfunktionen."""
        aus = np.zeros((len(cos_t), len(mu)))
        for i, m_ in enumerate(mu):
            M = int(min(max(40, 1.1 * m_ * rho + 25), 240))
            m = np.arange(M + 1)
            with np.errstate(all='ignore'):
                hr = spherical_jn(m, m_ * rho) - 1j * spherical_yn(m, m_ * rho)
                hd = spherical_jn(m, m_, derivative=True) - 1j * spherical_yn(m, m_, derivative=True)
                glied = np.nan_to_num((2 * m + 1) * hr / hd, nan=0.0, posinf=0.0, neginf=0.0)
            P = eval_legendre(m[None, :], cos_t[:, None])
            aus[:, i] = np.abs(rho / m_ * (P * glied[None, :]).sum(1))
        return aus

    def faktor(self, r, cos_ohr):
        """(n, nf) Zusatzfaktor für ein Ohr. r: Entfernung zur Kopfmitte, cos_ohr: Kosinus des
        Winkels zwischen Quellrichtung und Ohrachse (1 = Quelle genau auf der Ohrseite)."""
        lr = np.log(np.clip(r, self.r[0], self.r[-1]))
        gr = np.log(self.r)
        i = np.clip(np.searchsorted(gr, lr) - 1, 0, len(gr) - 2)
        u = ((lr - gr[i]) / (gr[i + 1] - gr[i]))[:, None]
        th = np.arccos(np.clip(cos_ohr, -1, 1)) / np.radians(10)
        j = np.clip(th.astype(int), 0, len(self.theta) - 2)
        v = (th - j)[:, None]
        T = self.tab
        return ((1 - u) * ((1 - v) * T[i, j] + v * T[i, j + 1]) + u * ((1 - v) * T[i + 1, j] + v * T[i + 1, j + 1])).astype(np.float32)


_nahfeld = None


def nahfeld_ohren(r, richt):
    """(n, 2, nf) Nahfeldfaktoren für beide Ohren. richt: (n, 3) Quellrichtung im Kopfbezug
    (Blick, links, Scheitel)."""
    global _nahfeld
    if _nahfeld is None:
        _nahfeld = Nahfeld()
    n = richt / np.maximum(np.linalg.norm(richt, axis=1, keepdims=True), 1e-9)
    return np.stack([_nahfeld.faktor(r, n[:, 1]), _nahfeld.faktor(r, -n[:, 1])], 1)


_RICHT_FORM = (0.15 + 0.85 * np.clip(np.log2(np.maximum(FREQ, 1) / 500) / 4, 0, 1.2)).astype(np.float32)


def richtwirkung(cos_zum_hoerer, db):
    """(n, nf) Frequenzgang einer gerichteten Stimme: 0 dB, wenn sie zum Hörer ruft; abgewandt
    fehlen bei 8 kHz `db`, unter 500 Hz nur 15 % davon."""
    d = db * (1 - np.clip(cos_zum_hoerer, -1, 1)) / 2
    return (10 ** (-d[:, None] * _RICHT_FORM[None, :] / 20)).astype(np.float32)
