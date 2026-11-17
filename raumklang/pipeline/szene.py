"""Szene aus einer JSON-Beschreibung rendern.

Aufruf:  python3 pipeline/szene.py szenen/boot.json --hrtf material/hrtf/subject_040.sofa
         [--dauer 180] [--nur moewen,rumpf] [--proben] [--aus audio]

Die Beschreibung nennt Klanggruppen. Jede Gruppe hat einen Typ (siehe GENERATOREN),
eine Sammlung von Aufnahmen und einen Zielpegel. Jede Gruppe wird einzeln gerendert,
auf ihren Zielpegel gebracht und erst dann gemischt.
"""
import argparse, json, os, subprocess, sys, time
from pathlib import Path
import numpy as np
from scipy.signal import fftconvolve
import pyloudnorm

sys.path.insert(0, str(Path(__file__).resolve().parent))
from hrtf import HRTF
from kern import FS, Spur, rendere_pfad, n_bloecke, blockzeiten, diffuser_nachhall, begrenzer, begrenzer_kreis, kreisfaltung
from boot import Boot
import material as mat

WURZEL = Path(__file__).resolve().parent.parent


# ---------------------------------------------------------------- Material
class Bibliothek:
    """Hält die gesäuberten Aufnahmen und die daraus geschnittenen Ereignisse."""

    def __init__(self, quellen):
        self.quellen = {q['id']: q for q in quellen}
        self._roh = {}
        self.benutzt = set()

    def aufnahme(self, spez):
        """spez: {quelle, kanal?, hochpass?, tiefpass?, entrauschen?, von?, bis?}"""
        schluessel = json.dumps(spez, sort_keys=True)
        if schluessel in self._roh:
            return self._roh[schluessel]
        q = self.quellen[spez['quelle']]
        self.benutzt.add(q['id'])
        x = mat.lade(WURZEL / 'material' / 'roh' / q['lokal'], spez.get('kanal', 'mitte'))
        a, b = int(spez.get('von', 0) * FS), int(spez.get('bis', 1e9) * FS)
        x = x[a:b]
        if spez.get('hochpass'):
            x = mat.filt(x, spez['hochpass'], 'highpass')
        if spez.get('tiefpass'):
            x = mat.filt(x, spez['tiefpass'], 'lowpass')
        if spez.get('entrauschen'):
            x = mat.entrausche(x, spez['entrauschen'], restpegel_db=spez.get('rest_db', -18.0))
        x = x / (np.sqrt((x ** 2).mean()) + 1e-12) * 0.05
        self._roh[schluessel] = x
        return x

    def flickwerk(self, sammlung, n, rng, ueberblend=1.6):
        """Langen Flächenklang aus vielen kurzen Clips nähen: zufällige Folge, gleichstarke
        Überblendung. Kein Clip zweimal hintereinander."""
        clips = []
        for spez in sammlung:
            x = self.aufnahme(spez)
            leise = np.flatnonzero(mat.huelle_db(x, 50) > -70)
            if len(leise):
                x = x[leise[0]:leise[-1]]
            if len(x) > 3 * ueberblend * FS:
                clips.append(x)
        ub = int(ueberblend * FS)
        ein, aus = np.sin(np.linspace(0, np.pi / 2, ub)), np.cos(np.linspace(0, np.pi / 2, ub))
        if len(clips) == 1:
            y = mat.schleife(clips[0], n + 2 * ub, start=int(rng.uniform(0, len(clips[0]))))
            return self._ringschluss(y[ub:], n, ein, aus)
        y = np.zeros(n + 14 * FS)
        pos, letzter = 0, -1
        while pos < n + 2 * ub:
            k = int(rng.integers(len(clips)))
            if k == letzter:
                k = (k + 1) % len(clips)
            letzter = k
            c = clips[k].copy()
            if len(c) > 9 * FS:  # lange Aufnahme: zufälliges Stück von 6–12 s
                a = int(rng.uniform(0, len(c) - 9 * FS))
                c = c[a:a + int(rng.uniform(6, 9) * FS)].copy()
            c[:ub] *= ein
            c[-ub:] *= aus
            y[pos:pos + len(c)] += c
            pos += len(c) - ub
        return self._ringschluss(y[ub:], n, ein, aus)   # erste Einblendung überspringen

    @staticmethod
    def _ringschluss(y, n, ein, aus):
        """Aus y (länger als n) ein periodisches Stück der Länge n machen: was über n
        hinausläuft, wird gleichstark in den Anfang überblendet."""
        ub = len(ein)
        z = y[:n].copy()
        z[:ub] = y[:ub] * ein + y[n:n + ub] * aus
        return z

    def ereignisse(self, sammlung):
        """Liste von dicts {sig, quelle, dauer, ...}; jedes Ereignis auf gleichen Spitzen-Kurzzeitpegel gebracht."""
        aus = []
        for spez in sammlung:
            x = self.aufnahme({k: v for k, v in spez.items() if k not in ('zerlegen', 'stuecke', 'blende', 'abklingen', 'max_flach')})
            if 'stuecke' in spez:  # ganze Aufnahme in gleich lange Stücke teilen
                L = int(spez['stuecke'] * FS)
                stuecke = [(a, min(a + L, len(x))) for a in range(0, len(x) - L // 2, L)]
            elif spez.get('zerlegen', {}).get('methode') == 'taeler':
                z = {k: v for k, v in spez['zerlegen'].items() if k != 'methode'}
                stuecke = mat.zerlege_taeler(x, **z)
            else:
                stuecke = mat.zerlege(x, **dict(spez.get('zerlegen', {})))
            for a, b in stuecke:
                if spez.get('abklingen'):
                    y = mat.schneide_abklingend(x, a, b, **spez['abklingen'])
                    if y is None:
                        continue
                else:
                    y = mat.schneide(x, a, b, *spez.get('blende', [8, 60]))
                if spez.get('max_flach'):
                    hh = mat.huelle_db(y, 20)
                    if (hh > hh.max() - 6).mean() > spez['max_flach']:
                        continue          # flaches Rauschen statt Schlag mit Abklingen
                k = mat.kennwerte(y)
                # Pegel am lautesten 50-ms-Fenster ausrichten
                h = mat.huelle_db(y, 50).max()
                y = y * 10 ** ((-20 - h) / 20)
                aus.append(dict(sig=y.astype(np.float32), quelle=spez['quelle'], **k))
        return aus


# ---------------------------------------------------------------- Hilfen
class Kontext:
    def __init__(self, hrtf, boot, bib, dauer, rng, boe=None):
        self.hrtf, self.boot, self.bib, self.dauer, self.rng = hrtf, boot, bib, dauer, rng
        self._boe = boe

    def boe(self, t):
        """Gemeinsame Böenkurve der Szene (Mittel 0, Streuung 1, periodisch): Wind und Segel
        hören dieselben Böen."""
        tk, b = self._boe
        return np.interp(t, tk, b, period=self.dauer)


def boeenkurve(rng, dauer, cfg):
    """Langsames Grundwehen plus einzelne Böen von einigen Sekunden; periodisch über die Dauer."""
    rate = 10.0
    n = int(round(dauer * rate))
    grund = _rauschkurve(rng, n, rate, cfg.get('grund_hz', 0.03))
    boeen = np.zeros(n)
    t = np.arange(n) / rate
    tb = rng.uniform(0, cfg.get('abstand_s', 22))
    while tb < dauer:
        d = rng.uniform(*cfg.get('dauer_s', [3, 8]))
        st = rng.uniform(0.6, 1.4)
        for k in (-1, 0, 1):                        # kreisförmig: Böen über die Naht
            u = (t - tb - k * dauer) / d
            boeen += st * np.where((u > 0) & (u < 1), np.clip(np.sin(np.pi * u), 0, None) ** 1.5 * (1 + 0.25 * np.sin(2 * np.pi * 3 * u)), 0)
        tb += rng.exponential(cfg.get('abstand_s', 22)) + d
    b = 0.6 * grund + 2.2 * boeen
    b = (b - b.mean()) / b.std()
    return t, b


def rendere_quelle(kx, spur, bus, sig, t0, ort_fn, aussen=True, pegel=1.0, hall=1.0, spiegelungen=True, pegel_fn=None):
    """Eine Quelle (Signal ab Zeit t0, Ort als Funktion der Zeit) über alle Schallwege rendern.
    ort_fn(t) liefert Weltkoordinaten (aussen=True) bzw. Bootskoordinaten."""
    nb = n_bloecke(len(sig))
    t = blockzeiten(t0, nb)
    p = ort_fn(t)
    bild = None
    if aussen:
        pb = kx.boot.welt_zu_boot(p, t)
        if p[:, 2].max() > 2.0:
            w = p.copy()
            w[:, 2] *= -1
            bild = kx.boot.welt_zu_boot(w, t)
    else:
        pb = p
    pg = np.full(nb, pegel) if pegel_fn is None else pegel * pegel_fn(t)
    for weg in kx.boot.pfade(pb, aussen, bild, spiegelungen):
        st, v = rendere_pfad(kx.hrtf, sig, weg['entf'], weg['richt'], weg['gang'], pg, weg['ohr'],
                             bus if weg['hall'] else None, hall, weg.get('streu'))
        spur.addiere(st, int(t0 * FS) + v)


def rendere_kreis(kx, spur, bus, sig, ort_fn, aussen=True, pegel=1.0, hall=1.0, pegel_fn=None, vorlauf_s=0.5):
    """Ein durchlaufendes, periodisches Signal (Länge = Szenendauer) nahtlos rendern: es wird
    vorn und hinten um ein Stück aus sich selbst verlängert und mit gleichstarken Rampen
    gewichtet. Was über die Naht hinausreicht, summiert sich dort genau zu 1 – die Blendränder
    der Blockverarbeitung liegen im ausgeblendeten Teil."""
    n = len(sig)
    P = int(vorlauf_s * FS)
    ext = np.concatenate([sig[-P:], sig, sig[:P]]).astype(np.float32)
    w = np.ones(len(ext), np.float32)
    phi = np.linspace(0, np.pi / 2, 2 * P, endpoint=False)
    w[:2 * P] = np.sin(phi) ** 2
    w[-2 * P:] = np.cos(phi) ** 2
    rendere_quelle(kx, spur, bus, ext * w, -P / FS, ort_fn, aussen, pegel, hall, True, pegel_fn)


def _rauschkurve(rng, n, rate, grenz_hz):
    X = np.fft.rfft(rng.normal(size=n))
    f = np.fft.rfftfreq(n, 1 / rate)
    X *= np.exp(-0.5 * (f / grenz_hz) ** 2)
    x = np.fft.irfft(X, n)
    return x / (x.std() + 1e-12)


# ---------------------------------------------------------------- Generatoren
def gen_bett(kx, g, spur, bus):
    """Flächenklang aus langen Aufnahmen: mehrere Ausschnitte, weit weg rund um den
    Horizont verteilt, jeder wandert langsam und atmet im Pegel."""
    rng = kx.rng
    n = int(kx.dauer * FS)
    anz = g.get('anzahl', 8)
    for i in range(anz):
        sig = kx.bib.flickwerk(g['sammlung'], n, rng)
        az0 = 2 * np.pi * (i + rng.uniform(-0.3, 0.3)) / anz
        r0 = rng.uniform(*g.get('entfernung', [50, 90]))
        drift = rng.uniform(-1, 1) * np.radians(g.get('drift_grad', 25))
        z = g.get('hoehe', 0.3)
        nk = int(round(kx.dauer * 4))
        atem = _rauschkurve(rng, nk, 4.0, g.get('atem_hz', 0.08))   # periodisch über die Szenendauer
        tk = np.arange(nk) / 4.0
        tiefe = g.get('atem_db', 3.0)

        def ort(t, az0=az0, r0=r0, drift=drift):
            az = az0 + drift * np.sin(2 * np.pi * t / kx.dauer + az0)
            return np.stack([r0 * np.cos(az), r0 * np.sin(az), np.full(len(t), z)], 1)

        def pg(t, atem=atem):
            p = 10 ** (tiefe * np.interp(t, tk, atem, period=kx.dauer) / 20)
            if g.get('boe_db'):
                p = p * 10 ** (g['boe_db'] * kx.boe(t) / 20)
            return p

        rendere_kreis(kx, spur, bus, sig.astype(np.float32), ort, True, r0, g.get('hall', 0.0), pg)


def gen_ereignisse(kx, g, spur, bus):
    """Einzelne Ereignisse draußen (Wellenkämme): zufällig im Ring verteilt, treiben mit dem Wind."""
    rng = kx.rng
    ev = kx.bib.ereignisse(g['sammlung'])
    if not ev:
        raise RuntimeError('keine Ereignisse für ' + g['name'])
    t = rng.uniform(0, 2)
    wind = np.radians(g.get('wind_richtung_grad', 200))
    v = g.get('treibt_m_s', 1.5)
    rmin, rmax = g.get('entfernung', [7, 35])
    letzte = -1
    while t < kx.dauer:
        k = int(rng.integers(len(ev)))
        if k == letzte:
            k = (k + 1) % len(ev)
        letzte = k
        e = ev[k]
        r = np.sqrt(rng.uniform(rmin ** 2, rmax ** 2))
        az = rng.uniform(0, 2 * np.pi)
        p0 = np.array([r * np.cos(az), r * np.sin(az), 0.15])
        ziel = np.array([np.cos(wind), np.sin(wind), 0]) * v
        staerke = 10 ** (rng.normal(0, g.get('streuung_db', 3.0)) / 20)

        def ort(tt, p0=p0, t0=t, ziel=ziel):
            return p0[None, :] + (tt - t0)[:, None] * ziel[None, :]

        # Bezugsentfernung: ein Kamm in 12 m hat den Nennpegel
        rendere_quelle(kx, spur, bus, e['sig'], t, ort, True, 12.0 * staerke, g.get('hall', 0.0))
        t += rng.exponential(g.get('abstand_s', 2.5))


class Vogel:
    """Flugbahn: Kreisen um einen wandernden Mittelpunkt, Höhe und Radius schwanken."""

    def __init__(self, rng, dauer, g):
        self.rm = rng.uniform(*g.get('radius', [10, 35]))
        self.h = rng.uniform(*g.get('hoehe', [6, 25]))
        self.v = rng.uniform(*g.get('tempo', [7, 12])) * rng.choice([-1, 1])
        self.ph = rng.uniform(0, 2 * np.pi)
        # alle Verläufe periodisch über die Szenendauer, damit die Schleife keine Naht hat
        self.P = float(dauer)
        nk = int(round(dauer))
        self.tk = np.arange(nk) * (self.P / nk)
        self.dr = _rauschkurve(rng, nk, 1.0, 0.03) * 0.3 * self.rm
        self.dh = _rauschkurve(rng, nk, 1.0, 0.04) * 0.25 * self.h
        self.mx = _rauschkurve(rng, nk, 1.0, 0.012) * g.get('mitte_streuung', 10)
        self.my = _rauschkurve(rng, nk, 1.0, 0.012) * g.get('mitte_streuung', 10)
        # Winkel aus dem Tempo integrieren; auf eine ganze Zahl von Runden je Durchlauf runden
        r = np.maximum(self.rm + self.dr, 4)
        schritt = np.abs(self.v) / r * (self.P / nk)
        runden = max(1, round(schritt.sum() / (2 * np.pi)))
        schritt *= runden * 2 * np.pi / schritt.sum()
        win = np.concatenate([[0.0], np.cumsum(schritt)]) * np.sign(self.v) + self.ph
        self.tk_w = np.append(self.tk, self.P)
        self.win = win
        self.runden = runden * np.sign(self.v)

    def _p(self, t, kurve):
        return np.interp(t, self.tk, kurve, period=self.P)

    def ort(self, t):
        t = np.asarray(t, float)
        r = np.maximum(self.rm + self._p(t, self.dr), 4)
        tm = np.mod(t, self.P)
        w = np.interp(tm, self.tk_w, self.win) + np.floor(t / self.P) * self.runden * 2 * np.pi
        h = np.maximum(self.h + self._p(t, self.dh), 3)
        return np.stack([self._p(t, self.mx) + r * np.cos(w),
                         self._p(t, self.my) + r * np.sin(w), h], 1)


def gen_schwarm(kx, g, spur, bus):
    """Möwen: jede hat eine Flugbahn und eine Stimme (eine Aufnahme). Rufe kommen in
    Schüben; oft antwortet kurz darauf eine andere."""
    rng = kx.rng
    ev = kx.bib.ereignisse(g['sammlung'])
    quellen = sorted({e['quelle'] for e in ev})
    voegel = [Vogel(rng, kx.dauer, g) for _ in range(g.get('anzahl', 7))]
    stimmen = [quellen[i % len(quellen)] for i in rng.permutation(len(voegel))]
    nach_stimme = {q: [e for e in ev if e['quelle'] == q] for q in quellen}
    t = rng.uniform(0.5, 3)
    n_rufe = 0
    while t < kx.dauer:
        i = int(rng.integers(len(voegel)))
        kette = [i]
        if rng.random() < g.get('antwort_wahrsch', 0.45):
            kette.append(int(rng.integers(len(voegel))))
            if rng.random() < 0.35:
                kette.append(int(rng.integers(len(voegel))))
        tt = t
        for j in kette:
            wahl = nach_stimme[stimmen[j]]
            e = wahl[int(rng.integers(len(wahl)))]
            staerke = 10 ** (rng.normal(0, 2.5) / 20)
            # leichte Tonhöhenvariation je Ruf, damit sich nichts hörbar wiederholt
            fak = 2 ** (rng.normal(0, 0.35) / 12)
            sig = np.interp(np.arange(0, len(e['sig']) - 1, fak), np.arange(len(e['sig'])), e['sig']).astype(np.float32)
            rendere_quelle(kx, spur, bus, sig, tt, voegel[j].ort, True, 15.0 * staerke, g.get('hall', 0.0))
            n_rufe += 1
            tt += e['dauer'] * rng.uniform(0.5, 1.1) + rng.uniform(0.1, 0.9)
        t += rng.exponential(g.get('abstand_s', 4.0))
    return dict(rufe=n_rufe)


def gen_ueberflug(kx, g, spur, bus):
    """Einzelne Möwe schießt dicht über das Boot: gerade Bahn, 2–5 m hoch. Der Doppler
    entsteht aus der Bahn (gleitende Laufzeit), nicht aus einer Tonhöhenkurve."""
    rng = kx.rng
    ev = [e for e in kx.bib.ereignisse(g['sammlung']) if e['dauer'] >= g.get('min_dauer', 0.5)]
    fluegel = kx.bib.ereignisse(g['fluegel']) if g.get('fluegel') else None
    t = rng.uniform(*g.get('erster_s', [8, 14]))
    liste = []
    erster = t
    while t < kx.dauer + erster - g.get('abstand_s', [18, 32])[0]:   # Abstand gilt auch über die Naht
        kurs = rng.uniform(0, 2 * np.pi)
        v = rng.uniform(*g.get('tempo', [10, 15]))
        h = rng.uniform(*g.get('hoehe', [2.0, 4.5]))
        seit = rng.uniform(-1.5, 1.5)
        steig = rng.uniform(-0.06, 0.06)
        ri = np.array([np.cos(kurs), np.sin(kurs), steig])
        quer = np.array([-np.sin(kurs), np.cos(kurs), 0])
        boot_k = np.array([-0.9, 0.0, 0.0])

        def ort(tt, t=t, ri=ri, quer=quer, v=v, h=h, seit=seit):
            s = (tt - t) * v
            p = boot_k[None, :] + s[:, None] * ri[None, :] + seit * quer[None, :]
            p[:, 2] = np.maximum(h + s * ri[2], 1.5)
            return p

        # Hauptruf liegt über dem nächsten Punkt: er beginnt im Anflug (etwas höher) und endet im
        # Wegflug (etwas tiefer) – so kippt die Tonhöhe hörbar innerhalb eines Rufs.
        lang = [e for e in ev if e['dauer'] >= g.get('haupt_min_s', 0.8)]
        haupt = lang[int(rng.integers(len(lang)))]
        gleiche = [e for e in ev if e['quelle'] == haupt['quelle'] and e is not haupt] or [haupt]
        t_haupt = t - rng.uniform(0.4, 0.55) * haupt['dauer']
        rufe = [(t_haupt, haupt)]
        if rng.random() < g.get('vorruf_wahrsch', 0.7):            # Ruf im Anflug, endet vor dem Hauptruf
            e = gleiche[int(rng.integers(len(gleiche)))]
            rufe.append((t_haupt - e['dauer'] - rng.uniform(0.15, 0.6), e))
        if rng.random() < g.get('nachruf_wahrsch', 0.4):           # Ruf im Wegflug
            e = gleiche[int(rng.integers(len(gleiche)))]
            rufe.append((t_haupt + haupt['dauer'] + rng.uniform(0.2, 0.7), e))
        for ts, e in rufe:
            rendere_quelle(kx, spur, bus, e['sig'], ts, ort, True, g.get('bezug_m', 5.0), g.get('hall', 0.0))
        if fluegel:
            gen_fluegel(kx, g, spur, bus, fluegel, ort, t, v, rng)
        liste.append(round(float(t), 1))
        t += rng.uniform(*g.get('abstand_s', [18, 32]))
    return dict(zeiten=liste)


def gen_fluegel(kx, g, spur, bus, stuecke, ort, t_nah, v, rng):
    """Fahrtwind und Flügelschläge einer vorbeifliegenden Möwe. Rohstoff ist echtes Windrauschen;
    nur die Hüllkurve (einige Schläge im Möwentakt, dann Gleiten) ist vorgegeben. Die Quelle fliegt
    auf der Bahn der Möwe mit – Anschwellen, Doppler und Richtung kommen aus dem Renderer."""
    e = stuecke[int(rng.integers(len(stuecke)))]
    dauer = g.get('fluegel_dauer_s', 3.2)
    n = int(dauer * FS)
    x = e['sig'].astype(np.float64)
    if len(x) < n:
        x = np.tile(x, int(np.ceil(n / len(x))))
    a = int(rng.uniform(0, len(x) - n + 1))
    x = mat.filt(x[a:a + n], g.get('fluegel_band', [350, 6000]), 'bandpass', 2)
    x /= np.sqrt((x ** 2).mean()) + 1e-12
    tt = np.arange(n) / FS
    # Schläge: im Anflug einige Schläge mit ~3 Hz, über dem Boot gleitet sie
    f_schlag = rng.uniform(2.7, 3.6)
    n_schlaege = int(rng.integers(*g.get('fluegel_schlaege', [3, 7])))
    t0 = rng.uniform(0.2, 0.6)
    huelle = np.full(n, g.get('fluegel_gleiten', 0.35))
    for k in range(n_schlaege):
        tk = t0 + k / f_schlag
        huelle += 0.9 * np.exp(-0.5 * ((tt - tk) / 0.045) ** 2)   # Abschlag: kurzer Luftstoß
    huelle *= np.minimum(1, tt / 0.3) * np.minimum(1, (dauer - tt) / 0.6)
    sig = (x * huelle * 10 ** ((-20 + g.get('fluegel_db', -12)) / 20) * np.sqrt(2)).astype(np.float32)
    start = t_nah - g.get('fluegel_vorlauf_s', 1.9)
    rendere_quelle(kx, spur, bus, sig, start, ort, True, g.get('bezug_m', 5.0), g.get('hall', 0.0))


def _rumpfpunkt(boot, rng, seite, aussen=True):
    x = rng.uniform(-1.6, 1.4)
    y = seite * boot.b * np.sqrt(max(1 - (x / boot.a) ** 2, 0.05))
    return np.array([x, y + seite * (0.04 if aussen else -0.05), 0.02 if aussen else 0.12])


def gen_rumpf(kx, g, spur, bus):
    """Wasser am Holz. Schläge fallen auf die Umkehrpunkte des Rollens (die eintauchende
    Seite), dazwischen einzelne kleinere Schwapps. Jeder Schlag kommt auf zwei Wegen:
    als Luftschall über die Bordkante und dumpf durch die Planke (Körperschall)."""
    rng = kx.rng
    ev = kx.bib.ereignisse(g['sammlung'])
    ev = sorted(ev, key=lambda e: e['rms_db'] + 10 * np.log10(e['dauer']))
    n3 = max(1, len(ev) // 3)
    klein, gross = ev[:len(ev) - n3], ev[len(ev) - n3:]
    zeiten = []
    for t, seite, staerke in kx.boot.rollumkehr(0.0, kx.dauer):
        if rng.random() < g.get('schlag_wahrsch', 0.75) * (0.4 + 0.6 * staerke):
            zeiten.append((t + rng.normal(0, 0.12), seite, 0.5 + 0.5 * staerke, gross if staerke > 0.5 else klein))
    t = rng.uniform(0, 2)
    while t < kx.dauer:
        zeiten.append((t, rng.choice([-1, 1]), rng.uniform(0.2, 0.45), klein))
        t += rng.exponential(g.get('schwapp_abstand_s', 1.8))
    for t, seite, staerke, wahl in zeiten:
        e = wahl[int(rng.integers(len(wahl)))]
        pa = _rumpfpunkt(kx.boot, rng, seite, True)
        pi = pa.copy()
        pi[1] -= seite * 0.09
        pi[2] = 0.12
        staerke *= np.sqrt(np.linalg.norm(pi - kx.boot.kopf))  # Nähe zählt, aber nur halb so stark wie 1/r
        rendere_quelle(kx, spur, bus, e['sig'], t, lambda tt, pa=pa: np.tile(pa, (len(tt), 1)), False,
                       staerke, g.get('hall', 0.0))
        dumpf = mat.filt(e['sig'].astype(np.float64), g.get('planke_tiefpass', 450), 'lowpass', 2).astype(np.float32)
        rendere_quelle(kx, spur, bus, dumpf, t, lambda tt, pi=pi: np.tile(pi, (len(tt), 1)), False,
                       staerke * g.get('planke_pegel', 0.8), g.get('hall', 0.0))
    return dict(ereignisse=len(zeiten))


def gen_knarzen(kx, g, spur, bus):
    """Holz arbeitet: an festen Stellen im Boot (Dollen, Duchten, Spanten), bevorzugt wenn
    das Rollen umkehrt, aber nicht jedes Mal und nie an derselben Stelle zweimal hintereinander."""
    rng = kx.rng
    ev = kx.bib.ereignisse(g['sammlung'])
    b = kx.boot
    stellen = [np.array(s, float) for s in g.get('stellen', [
        [0.35, 0.55, 0.40], [0.35, -0.55, 0.40],      # Dollen
        [0.9, 0.3, 0.22], [0.9, -0.3, 0.22],          # Ducht vor den Knien
        [-1.6, 0.25, 0.25], [-1.7, -0.2, 0.3],        # Heck hinter dem Kopf
        [-0.3, 0.52, 0.1], [-0.5, -0.52, 0.1],        # Spanten neben den Schultern
        [1.7, 0.0, 0.3]])]                            # Bug
    letzte = -1
    n = 0
    for t, seite, staerke in b.rollumkehr(0.0, kx.dauer):
        if rng.random() > g.get('wahrsch', 0.55) * (0.3 + 0.7 * staerke):
            continue
        for _ in range(int(rng.integers(1, 3))):
            k = int(rng.integers(len(stellen)))
            if k == letzte:
                k = (k + 3) % len(stellen)
            letzte = k
            e = ev[int(rng.integers(len(ev)))]
            fak = 2 ** (rng.normal(0, 1.0) / 12)
            sig = np.interp(np.arange(0, len(e['sig']) - 1, fak), np.arange(len(e['sig'])), e['sig']).astype(np.float32)
            p = stellen[k] + rng.normal(0, 0.03, 3)
            rendere_quelle(kx, spur, bus, sig, t + rng.uniform(-0.5, 0.4), lambda tt, p=p: np.tile(p, (len(tt), 1)),
                           False, (0.4 + 0.6 * staerke) * 10 ** (rng.normal(0, 2) / 20), g.get('hall', 0.0))
            n += 1
    return dict(ereignisse=n)


def gen_segel(kx, g, spur, bus):
    """Schlaffes Segel am Mast vor den Knien. Ohne Wind hängt es und raschelt kaum; eine Böe
    fängt sich (ein weicher Schlag, wenn das Tuch sich füllt), dann knattert das Achterliek
    unregelmäßig, bis die Böe nachlässt und das Tuch wieder einfällt.

    Notlösung, solange keine echte Segelaufnahme da ist: das Stoffrauschen ist echtes
    Windrauschen aus `sammlung`, die Struktur (Füllen, Knattern, Einfallen) ist nachgebildet.
    Alles hängt an der gemeinsamen Böenkurve der Szene."""
    rng = kx.rng
    D = kx.dauer
    n = int(round(D * FS))
    t = np.arange(n) / FS
    b = kx.boe(t)
    schwelle = g.get('fang_schwelle', 0.7)
    roh = kx.bib.flickwerk(g['sammlung'], n, rng)
    roh = mat.filt(roh, [g.get('band', [300, 7000])[0], g.get('band', [300, 7000])[1]], 'bandpass', 2)
    roh /= np.sqrt((roh ** 2).mean()) + 1e-12

    def huelle_glatt(x, ms):
        from scipy.ndimage import uniform_filter1d
        return uniform_filter1d(x, int(ms * FS / 1000), mode='wrap')

    # Stärke des Winds im Segel: 0 bei Flaute, wächst über der Schwelle
    wind = np.clip(b - g.get('ruhe', -0.3), 0, None)
    wind = huelle_glatt(wind, 300)

    # 1) leises Rascheln des hängenden Tuchs: Rauschen mit knisternder Feinstruktur
    knister = np.zeros(n)
    rate = 6 + 40 * wind                                   # Knistern je Sekunde
    k = rng.random(n) < rate / FS
    knister[k] = rng.lognormal(0, 0.6, k.sum())
    knister = huelle_glatt(knister, 6)
    rascheln = roh * (0.08 + 0.22 * wind) * (0.4 + knister / (knister.mean() + 1e-9) * 0.6)

    # 2) Knattern des Achterlieks in der Böe: kurze Schläge mit 4–9 Hz, unregelmäßig
    knattern = np.zeros(n)
    tt = 0.0
    while tt < D:
        w = wind[int(tt * FS) % n]
        if w > g.get('knatter_ab', 1.0):
            f = 4 + 2.5 * min(w, 2) + rng.normal(0, 0.8)
            i = int(tt * FS)
            L = int(rng.uniform(0.012, 0.03) * FS)
            amp = (w - g.get('knatter_ab', 1.0)) ** 0.7 * rng.lognormal(0, 0.35)
            idx = (i + np.arange(L)) % n
            knattern[idx] += amp * roh[idx] * np.exp(-np.arange(L) / (L / 3)) * 5.0
            tt += 1 / max(f, 2.5)
        else:
            tt += 0.05
    knattern = mat.filt(knattern, [250, 5000], 'bandpass', 2)

    # 3) Füllen: wenn die Böe die Schwelle steigend überschreitet, ein weicher, tiefer Schlag
    fuellen = np.zeros(n)
    ueber = b > schwelle
    starts = np.flatnonzero(ueber & ~np.roll(ueber, 1))
    tief = mat.filt(roh, [60, 400], 'bandpass', 2)
    for i in starts:
        L = int(0.25 * FS)
        idx = (i + int(rng.uniform(0.1, 0.6) * FS) + np.arange(L)) % n
        hk = np.exp(-np.arange(L) / (0.045 * FS)) * (1 - np.exp(-np.arange(L) / (0.004 * FS)))
        st = min(b[i:i + int(2 * FS)].max() if i + int(2 * FS) < n else b[i], 3) * rng.uniform(0.7, 1.2)
        fuellen[idx] += st * (2.5 * tief[idx] + 0.8 * roh[idx]) * hk

    sig = (rascheln + g.get('knatter_pegel', 1.0) * knattern + g.get('fang_pegel', 1.0) * fuellen) * 0.01
    # über drei Stellen des Tuchs verteilen (Vorliek oben, Mitte, Achterliek), leicht verschieden
    stellen = [np.array(p, float) for p in g.get('stellen', [[1.0, 0.0, 2.2], [1.35, 0.05, 1.3], [1.7, 0.1, 0.9]])]
    anteile = g.get('anteile', [0.6, 1.0, 0.8])
    luv = g.get('auslenkung_m', 0.35)
    for p0, an in zip(stellen, anteile):
        verz = int(rng.uniform(0, 0.03) * FS)
        s_i = np.roll(sig, verz) * an

        def ort(tt, p0=p0):
            p = np.tile(p0, (len(tt), 1))
            p[:, 1] += luv * np.tanh(np.clip(kx.boe(tt), 0, None))   # Tuch weht in der Böe zur Seite
            return p

        rendere_kreis(kx, spur, bus, s_i.astype(np.float32), ort, False, 1.0, g.get('hall', 0.0))
    return dict(faenge=int(len(starts)))


GENERATOREN = dict(bett=gen_bett, ereignisse=gen_ereignisse, schwarm=gen_schwarm, ueberflug=gen_ueberflug,
                   rumpf=gen_rumpf, knarzen=gen_knarzen, segel=gen_segel)


# ---------------------------------------------------------------- Pegel und Ausgabe
def lautheit(x, art='integriert'):
    """LUFS nach ITU-R BS.1770. art='spitzen': 95. Perzentil der 3-s-Kurzzeitlautheit
    (für seltene Ereignisse, die sonst zu laut gezogen würden)."""
    m = pyloudnorm.Meter(FS)
    if art == 'integriert':
        return m.integrated_loudness(x.T.astype(np.float64))
    n = 3 * FS
    werte = []
    for a in range(0, x.shape[1] - n, FS):
        e = x[:, a:a + n]
        if (e ** 2).mean() > 1e-12:
            werte.append(m.integrated_loudness(e.T.astype(np.float64)))
    werte = [w for w in werte if np.isfinite(w)]
    return float(np.percentile(werte, 95)) if werte else -120.0


def schreibe(pfad, x, bitrate='192k'):
    pfad = Path(pfad)
    pfad.parent.mkdir(parents=True, exist_ok=True)
    daten = (np.clip(x.T, -1, 1) * 32767).astype('<i2').tobytes()
    if pfad.suffix == '.wav':
        args = ['-c:a', 'pcm_s16le']
    else:
        args = ['-c:a', 'libmp3lame', '-b:a', bitrate]
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', str(FS), '-ac', '2', '-i', '-', *args, str(pfad)],
                   input=daten, check=True)


def schleifenstueck(x, ab_s, dauer_s, ueberblend_s=3.0):
    """Ausschnitt aus der Kreisspur, der selbst nahtlos schleift: das Stück nach dem Ende wird
    gleichstark in den Anfang überblendet."""
    n = x.shape[1]
    a, L, ub = int(ab_s * FS), int(dauer_s * FS), int(ueberblend_s * FS)
    idx = (a + np.arange(L + ub)) % n
    y = x[:, idx]
    z = y[:, :L].copy()
    ein = np.sin(np.linspace(0, np.pi / 2, ub))
    z[:, :ub] = y[:, :ub] * ein + y[:, L:L + ub] * np.cos(np.linspace(0, np.pi / 2, ub))
    return z


def nahtpruefung(x):
    """Vergleicht den Übergang Ende→Anfang mit gewöhnlichen Stellen im Stück: Sprung von
    Abtastwert zu Abtastwert und Pegelsprung über 50 ms."""
    d_naht = float(np.abs(x[:, 0] - x[:, -1]).max())
    d_typ = float(np.percentile(np.abs(np.diff(x, axis=1)).max(0), 99.9))
    w = int(0.05 * FS)
    rms = lambda y: float(10 * np.log10((y.astype(np.float64) ** 2).mean() + 1e-12))
    vor, nach = rms(x[:, -w:]), rms(x[:, :w])
    stellen = np.random.default_rng(0).integers(w, x.shape[1] - w, 400)
    typ = np.percentile([abs(rms(x[:, k - w:k]) - rms(x[:, k:k + w])) for k in stellen], 95)
    return dict(sprung_naht=round(d_naht, 4), sprung_typisch_999=round(d_typ, 4),
                pegelsprung_naht_db=round(abs(vor - nach), 2), pegelsprung_typisch_95_db=round(float(typ), 2))


def blende(x, ein=1.5, aus=3.0):
    x = x.copy()
    ne, na = int(ein * FS), int(aus * FS)
    x[:, :ne] *= np.linspace(0, 1, ne) ** 2
    x[:, -na:] *= np.linspace(1, 0, na) ** 2
    return x


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('szene')
    ap.add_argument('--hrtf', default=str(WURZEL / 'material' / 'hrtf' / 'subject_040.sofa'))
    ap.add_argument('--dauer', type=float)
    ap.add_argument('--nur', default='')
    ap.add_argument('--aus', default=str(WURZEL / 'audio'))
    ap.add_argument('--proben', action='store_true', help='je Gruppe eine kurze Hörprobe schreiben')
    ap.add_argument('--blick', type=float, help='Blickwinkel über der Waagerechten (überschreibt die Szene)')
    a = ap.parse_args()

    sz = json.loads(Path(a.szene).read_text())
    dauer = a.dauer or sz.get('dauer', 180)
    if a.blick is not None:
        sz['boot']['blick'] = a.blick
    t_start = time.time()
    hrtf = HRTF(a.hrtf, FS)
    boot = Boot(sz['boot'], dauer, sz.get('saat', 1))
    bib = Bibliothek(json.loads((WURZEL / 'quellen.json').read_text()))
    nur = set(filter(None, a.nur.split(',')))
    hall_ir = diffuser_nachhall(hrtf, **sz.get('nachhall', {}))
    boe = boeenkurve(np.random.default_rng(sz.get('saat', 1) * 7 + 3), dauer, sz.get('boeen', {}))
    name = sz['name']
    bericht = dict(szene=name, stand=time.strftime('%d.%m.%Y %H:%M'), dauer=dauer, schleife=True, abtastwerte=int(round(dauer * FS)),
                   hrtf=Path(a.hrtf).name, blick=sz['boot'].get('blick', 55), gruppen=[])
    summe = np.zeros((2, int(round(dauer * FS))), np.float32)
    for i, g in enumerate(sz['gruppen']):
        if nur and g['name'] not in nur:
            continue
        t0 = time.time()
        kx = Kontext(hrtf, boot, bib, dauer, np.random.default_rng(sz.get('saat', 1) * 1000 + i), boe)
        spur, bus = Spur(dauer), Spur(dauer, 1)
        info = GENERATOREN[g['typ']](kx, g, spur, bus) or {}
        x = spur.x
        if np.abs(bus.x).max() > 0:
            for e in range(2):
                x[e] += kreisfaltung(bus.x[0], hall_ir[e]).astype(np.float32) * 10 ** (sz.get('nachhall_pegel_db', -16) / 20)
        art = g.get('pegel_art', 'integriert')
        ist = lautheit(x, art)
        x *= 10 ** ((g['ziel_lufs'] - ist) / 20)
        # einzelne Ausreißer schon in der Gruppe abfangen, damit sie in der Mischung nichts mitreißen
        x, weg_g = begrenzer_kreis(x, g.get('decke_db', -9.0))
        summe += x
        if os.environ.get('RAUMKLANG_NAHT'):
            np.save(Path(os.environ['RAUMKLANG_NAHT']) / f"naht_{g['name']}.npy", np.concatenate([x[:, -3 * FS:], x[:, :3 * FS]], 1))
        eintrag = dict(name=g['name'], titel=g.get('titel', g['name']), text=g.get('text', ''), typ=g['typ'], ziel_lufs=g['ziel_lufs'], pegel_art=art,
                       spitze_db=round(float(20 * np.log10(np.abs(x).max() + 1e-9)), 1), begrenzt_db=round(weg_g, 1), sekunden=round(time.time() - t0, 1), **info)
        bericht['gruppen'].append(eintrag)
        print(eintrag, flush=True)
        if a.proben:
            probe = schleifenstueck(x, g.get('probe_ab', 20), g.get('probe_dauer', 30))
            probe, _ = begrenzer_kreis(probe * 10 ** (g.get('probe_plus_db', 6) / 20))
            schreibe(Path(a.aus) / f"{name}_{g['name']}.mp3", probe, '160k')
            eintrag['probe_abtastwerte'] = int(probe.shape[1])
    if not nur:
        ist = lautheit(summe)
        summe *= 10 ** ((sz.get('ziel_lufs', -21) - ist) / 20)
        summe, weg = begrenzer_kreis(summe, -1.0)
        bericht['begrenzer_max_db'] = round(weg, 1)
        bericht['lufs'] = round(lautheit(summe), 1)
        bericht['naht'] = nahtpruefung(summe)
        schreibe(Path(a.aus) / f'{name}.mp3', summe, '224k')
        bericht['quellen'] = sorted(bib.benutzt)
        (Path(a.aus) / f'{name}.json').write_text(json.dumps(bericht, ensure_ascii=False, indent=1))
    print('fertig in', round(time.time() - t_start), 's', flush=True)


if __name__ == '__main__':
    main()
