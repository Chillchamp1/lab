"""Hören wie ein Meerestier: frei im Wasser, ohne Kuppel (gleiche Schnittstelle wie boot.py).

Bezug: x = Blickrichtung in der Waagerechten, y = links, z = oben, Ursprung am Meeresgrund unter
dem Hörer. Der Hörer schwebt in mittlerer Tiefe in einem flachen Meer (Grund bei z = 0,
Oberfläche bei z = tiefe), auf dem Rücken, den Blick schräg nach oben zum Licht.

Physik, die hier die Weite macht:
  * Schall läuft mit ~1500 m/s. Der Renderkern rechnet mit Luftschall; jeder Weg wird für die
    Laufzeit gestaucht (343/1500) und der Pegel auf den wahren Weg zurückgerechnet.
  * Kaum Dämpfung: Absorption nach Thorp (bei 1 kHz 0,07 dB/km, bei 10 kHz ~1 dB/km) statt
    Luft (bei 10 kHz ~100 dB/km). Ferne Rufe bleiben klar.
  * Wellenleiter: Oberfläche und Grund spiegeln. Jede Quelle kommt als Bündel von
    Spiegelquellen an – direkt, einmal über die Oberfläche, über den Grund, über beide, …
    Die Oberfläche kehrt das Vorzeichen um (weich: Luft dahinter), der Sandgrund spiegelt
    nur teilweise. Bei fernen Quellen liegen die Wege dicht beieinander und ergeben ein
    langes, rollendes Nachklingen; nahe der Oberfläche löschen sich tiefe Töne aus
    (Lloyd-Spiegel) – das kommt von selbst aus den Vorzeichen.
  * Weiter als einige Wassertiefen entfernt breitet sich Schall zylindrisch aus (Pegel fällt
    mit 10·log r statt 20·log r): die nicht ausgerechneten höheren Spiegelordnungen werden
    durch diesen Ausgleich ersetzt.
Was nicht geht: Delfine hören bis über 100 kHz; Aufnahmen und Kopfhörer enden bei 20 kHz.
Die Richtungsfilter sind menschliche Ohren (CIPIC 040) – ein Tier hört über den Unterkiefer,
das lässt sich nicht nachbilden; die Szene ist „so könnte es klingen“, nicht das Tierohr.
"""
import numpy as np
from scipy.ndimage import uniform_filter1d
from kern import FREQ, LUFT_DB_M
from hrtf import hoerer_basis, C_SCHALL

C_WASSER = 1500.0


def thorp_db_m(f_hz):
    f = np.maximum(f_hz, 1) / 1000.0
    a_km = 0.11 * f ** 2 / (1 + f ** 2) + 44 * f ** 2 / (4100 + f ** 2) + 2.75e-4 * f ** 2 + 0.003
    return a_km / 1000.0


class Ozean:
    def __init__(self, cfg, dauer, saat=3):
        self.periode = dauer
        self.tiefe = cfg.get('tiefe', 40.0)
        self.kopf = np.array(cfg.get('kopf', [0.0, 0.0, 18.0]), float)
        self.basis = hoerer_basis(cfg.get('blick', 55.0))
        self.ohr = cfg.get('ohrabstand', 0.085)
        self.ordnung = cfg.get('ordnung', 3)
        self.stauch = C_SCHALL / C_WASSER
        self.r_grund = cfg.get('grund_reflexion', 0.55)
        self.r_oben = cfg.get('oberflaeche_reflexion', 0.9)      # rau durch Wellen: etwas unter 1
        self.zyl_ab = cfg.get('zylindrisch_ab_m', 2 * self.tiefe)
        self._thorp = thorp_db_m(FREQ)
        # Sandgrund: hohe Frequenzen streuen mehr (raue Oberfläche) – leichter Höhenabfall je Spiegelung
        self._grund_gang = (1 / (1 + (FREQ / 6000) ** 1.5)) ** 0.5
        self._oben_gang = (1 / (1 + (FREQ / 9000) ** 2)) ** 0.5

    def welt_zu_boot(self, p, t):
        return np.array(p, float)

    def rollumkehr(self, t0, t1):
        return []

    def _kopfbezug(self, v):
        return v @ self.basis.T

    def _bilder(self):
        """(Vorzeichen z, Verschiebung, Oberflächen-, Grundspiegelungen) je Spiegelquelle bis zur Ordnung."""
        D, out = self.tiefe, []
        for n in range(-self.ordnung, self.ordnung + 1):
            # z' = z + 2nD: |n| Oberflächen und |n| Grund-Spiegelungen
            out.append((1, 2 * n * D, abs(n), abs(n)))
            # z' = -z + 2nD: n > 0 → n oben, n-1 unten; n <= 0 → |n| oben, |n|+1 unten
            if n > 0:
                out.append((-1, 2 * n * D, n, n - 1))
            else:
                out.append((-1, 2 * n * D, -n, -n + 1))
        return out

    def pfade(self, p, aussen=True, p_wasserbild=None, mit_spiegelungen=True):
        n = len(p)
        k = np.broadcast_to(self.kopf, (n, 3))
        wege = []
        for vz, versch, n_oben, n_grund in self._bilder():
            if not mit_spiegelungen and (n_oben or n_grund):
                continue
            b = p.copy()
            b[:, 2] = vz * p[:, 2] + versch
            v = b - k
            r = np.maximum(np.linalg.norm(v, axis=1), 0.3)
            e_k = r * self.stauch
            # Pegel: Kern rechnet 1/e_k und Luftdämpfung über e_k – zurück auf 1/r, Wasserdämpfung über r,
            # zylindrischer Ausgleich jenseits zyl_ab
            zurueck = 10 ** (-self._thorp[None, :] * r[:, None] / 20)        # Kern ohne Luftdämpfung (luft=False)
            amp = e_k / r * np.sqrt(np.maximum(r / self.zyl_ab, 1.0))
            refl = (-self.r_oben) ** n_oben * self.r_grund ** n_grund
            form = self._oben_gang ** n_oben * self._grund_gang ** n_grund
            gang = (zurueck * (amp * refl)[:, None] * form[None, :]).astype(np.float32)
            if np.abs(gang).max() < 1e-4:
                continue
            ohr = None
            if not (n_oben or n_grund) and r.min() < 2.0:
                links = np.array([0, self.ohr, 0])
                dl = np.linalg.norm(p - (k + links), axis=1)
                dr = np.linalg.norm(p - (k - links), axis=1)
                ohr = np.clip(np.stack([r / dl, r / dr], 1), 0.6, 1.8)
            weg = dict(name=f'bild_{vz}_{versch:.0f}', luft=False, entf=e_k, entf_wahr=r, richt=self._kopfbezug(v), gang=gang, ohr=ohr,
                       hall=not (n_oben or n_grund))
            if len(gang) > 5 and (n_oben or n_grund):
                weg['gang'] = uniform_filter1d(gang, 5, axis=0, mode='nearest')
            wege.append(weg)
        # direkter Weg zuerst (für Weite/Flimmern in rendere_quelle)
        wege.sort(key=lambda w: 0 if w['hall'] else 1)
        return wege
