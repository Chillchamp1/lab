"""Szene aus einer JSON-Beschreibung rendern.

Aufruf:  python3 pipeline/szene.py szenen/boot.json --hrtf material/hrtf/subject_040.sofa
         [--dauer 180] [--nur moewen,rumpf] [--proben] [--aus audio]

Die Beschreibung nennt Klanggruppen. Jede Gruppe hat einen Typ (siehe GENERATOREN),
eine Sammlung von Aufnahmen und einen Zielpegel. Jede Gruppe wird einzeln gerendert,
auf ihren Zielpegel gebracht und erst dann gemischt.
"""
import argparse, collections, json, os, subprocess, sys, time
from datetime import datetime
from zoneinfo import ZoneInfo
from pathlib import Path
import numpy as np
from scipy.signal import fftconvolve
import pyloudnorm

sys.path.insert(0, str(Path(__file__).resolve().parent))
from hrtf import HRTF
from kern import FREQ as FREQ_K
from kern import FS, Spur, rendere_pfad, n_bloecke, blockzeiten, diffuser_nachhall, begrenzer, begrenzer_kreis, kreisfaltung
from boot import Boot
import material as mat
import raumwirkung as rwk

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
        if spez.get('tempo_faktor'):
            # langsamer und tiefer abspielen (Faktor < 1): das Tier klingt größer – Formanten wandern mit
            from fractions import Fraction
            from scipy.signal import resample_poly
            fr = Fraction(1 / spez['tempo_faktor']).limit_denominator(50)
            x = resample_poly(x, fr.numerator, fr.denominator)
        if spez.get('roehre'):
            x = mat.roehre(x, **spez['roehre'])
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
            x = self.aufnahme({k: v for k, v in spez.items() if k not in ('zerlegen', 'stuecke', 'blende', 'abklingen', 'max_flach', 'resonanz', 'wucht', 'max_schwerpunkt', 'min_schwerpunkt', 'einschlag')})
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
                if spez.get('resonanz'):          # nach dem Schneiden: der Nachklang darf über das Ereignis hinaus
                    t60 = max(m[1] for m in spez['resonanz'])
                    y = mat.resonanz(np.r_[y, np.zeros(int(1.2 * t60 * FS))], spez['resonanz'])
                tief = None
                if spez.get('wucht'):             # tiefe Schicht für kraftvolle Ereignisse, getrennt gehalten
                    wz = spez['wucht']
                    nach = max([m[1] for m in wz.get('moden', [])] + [0.3])
                    y = np.r_[y, np.zeros(int(1.0 * nach * FS))]
                    tief = mat.wucht(y, wz.get('moden', []), wz.get('grollen'), wz.get('obertoene', 0.0), saat=len(aus))
                k = mat.kennwerte(y)
                # zu helle (quietschende) oder zu dumpfe Ausschnitte weglassen
                if k['schwerpunkt'] > spez.get('max_schwerpunkt', 1e9) or k['schwerpunkt'] < spez.get('min_schwerpunkt', 0):
                    continue
                # nur Ausschnitte, die einschlagen statt anzuschwellen (Brecher: Aufprall statt Rauschen).
                # Maß: steilster Anstieg der 10-ms-Hüllkurve über 40 ms; kurz danach muss die Spitze kommen.
                # Langes Anschwellen davor wird abgeschnitten (bis auf `vorlauf_s`).
                if spez.get('einschlag'):
                    ek = spez['einschlag']
                    hh = mat.huelle_db(y, 10)
                    n40 = int(0.04 * FS)
                    dh = hh[n40:] - hh[:-n40]
                    i_s = int(np.argmax(dh))
                    nach = hh[i_s + n40:i_s + n40 + int(ek.get('bis_spitze_s', 0.3) * FS)]
                    if dh[i_s] < ek.get('min_sprung_db', 9) or not len(nach) or nach.max() < hh.max() - ek.get('max_unter_spitze_db', 4):
                        continue
                    a0 = max(0, i_s - int(ek.get('vorlauf_s', 0.25) * FS))
                    if a0 > 0:
                        y = y[a0:].copy()
                        ne = int(0.02 * FS)
                        y[:ne] *= np.sin(np.linspace(0, np.pi / 2, ne)) ** 2
                        if tief is not None:
                            tief = tief[a0:]
                        k = mat.kennwerte(y)
                    k['sprung_db'] = float(dh[i_s])
                # Pegel am lautesten 50-ms-Fenster ausrichten
                h = mat.huelle_db(y, 50).max()
                fak = 10 ** ((-20 - h) / 20)
                e = dict(sig=(y * fak).astype(np.float32), quelle=spez['quelle'], schnitt=f"{spez['quelle']}@{int(a)}", **k)
                if tief is not None:
                    e['tief'] = (tief * fak).astype(np.float32)
                aus.append(e)
        return aus


# ---------------------------------------------------------------- Hilfen
class Kontext:
    def __init__(self, hrtf, boot, bib, dauer, rng, boe=None):
        self.hrtf, self.boot, self.bib, self.dauer, self.rng = hrtf, boot, bib, dauer, rng
        self._boe = boe
        self.weite = None        # dict(ab_m, voll_m, ...): ferne Quellen speisen einen langen, dumpfen Weitenhall
        self.bus_weite = None
        self.flimmern = None     # dict(ab_m, voll_m, db, hz): Luftflimmern ferner Quellen
        self.kurven = {}         # Drehbuch: name -> (tk, werte 0..1), periodisch über die Szenendauer
        self.g, self.gruppe, self.ohne = {}, '', set()
        self.melden = None       # Liste, in die Generatoren Ereignisse melden (Vorlauf)
        self.gemeldet = []       # Meldungen aller Gruppen aus dem Vorlauf: darauf darf reagiert werden

    def melde(self, art, t, ort, staerke=1.0):
        """Ereigniskette: ein Generator meldet ein Ereignis (Art, Zeit, Ort im Weltbezug, Stärke)."""
        if self.melden is not None and art:
            self.melden.append(dict(art=art, t=float(t) % self.dauer, ort=[float(x) for x in ort], staerke=float(staerke), g=self.gruppe))

    def meldungen(self, *arten):
        return [m for m in self.gemeldet if m['art'] in arten]

    def kurve(self, name, t):
        """Wert einer Drehbuch-Kurve (0..1) zur Zeit t; ohne Drehbuch 0,5."""
        if name not in self.kurven:
            return np.full(np.shape(t), 0.5) if np.ndim(t) else 0.5
        tk, v = self.kurven[name]
        return np.interp(t, tk, v, period=self.dauer)

    def folge(self, g, t):
        """Wie stark eine Gruppe dem Drehbuch folgt: (Ratenfaktor, Pegelfaktor) zur Zeit t.
        g['folgt'] = {kurve, rate: [bei 0, bei 1], db: [bei 0, bei 1], invers}"""
        f = g.get('folgt')
        if not f:
            return (np.ones(np.shape(t)), np.ones(np.shape(t))) if np.ndim(t) else (1.0, 1.0)
        v = self.kurve(f['kurve'], t)
        if f.get('invers'):
            v = 1 - v
        v = v ** f.get('exponent', 1.0)        # > 1: erst kurz vor dem Ende der Kurve deutlich
        r0, r1 = f.get('rate', [1, 1])
        d0, d1 = f.get('db', [0, 0])
        return r0 + (r1 - r0) * v, 10 ** ((d0 + (d1 - d0) * v) / 20)

    def boe(self, t):
        """Gemeinsame Böenkurve der Szene (Mittel 0, Streuung 1, periodisch): Wind und Segel
        hören dieselben Böen."""
        tk, b = self._boe
        return np.interp(t, tk, b, period=self.dauer)


def baue_kurven(sz, dauer):
    """Drehbuch-Kurven aus Stützstellen [[t, wert], ...] (Wert 0..1): weich und periodisch, damit
    der Bogen in der Schleife aufgeht."""
    from scipy.ndimage import uniform_filter1d
    rate = 10.0
    tk = np.arange(int(round(dauer * rate))) / rate
    aus = {}
    for name, punkte in (sz.get('drehbuch', {}).get('kurven') or {}).items():
        pt = np.array(punkte, float)
        v = np.interp(tk, pt[:, 0], pt[:, 1], period=dauer)
        v = uniform_filter1d(v, int(sz['drehbuch'].get('glatt_s', 12) * rate), mode='wrap')
        aus[name] = (tk, np.clip(v, 0, 1))
    return aus


def boeenkurve(rng, dauer, cfg, wind=None):
    """Langsames Grundwehen plus einzelne Böen von einigen Sekunden; periodisch über die Dauer.
    Mit Drehbuch-Kurve `wind` (tk, 0..1): Böen werden bei viel Wind häufiger und stärker, und das
    Grundwehen folgt der Kurve."""
    rate = 10.0
    n = int(round(dauer * rate))
    grund = _rauschkurve(rng, n, rate, cfg.get('grund_hz', 0.03))
    boeen = np.zeros(n)
    t = np.arange(n) / rate
    w_t = (lambda x: float(np.interp(x, wind[0], wind[1], period=dauer))) if wind else (lambda x: 0.5)
    tb = rng.uniform(0, cfg.get('abstand_s', 22))
    while tb < dauer:
        d = rng.uniform(*cfg.get('dauer_s', [3, 8]))
        st = rng.uniform(0.6, 1.4) * (0.3 + 1.4 * w_t(tb))
        for k in (-1, 0, 1):                        # kreisförmig: Böen über die Naht
            u = (t - tb - k * dauer) / d
            boeen += st * np.where((u > 0) & (u < 1), np.clip(np.sin(np.pi * u), 0, None) ** 1.5 * (1 + 0.25 * np.sin(2 * np.pi * 3 * u)), 0)
        tb += rng.exponential(cfg.get('abstand_s', 22)) * (1.5 - w_t(tb)) + d
    b = 0.6 * grund + 2.2 * boeen
    if wind:
        b = b + cfg.get('wind_gewicht', 2.5) * (np.interp(t, wind[0], wind[1], period=dauer) - 0.5)
    b = (b - b.mean()) / b.std()
    return t, b


def rendere_quelle(kx, spur, bus, sig, t0, ort_fn, aussen=True, pegel=1.0, hall=1.0, spiegelungen=True, pegel_fn=None, breite=None):
    """Eine Quelle (Signal ab Zeit t0, Ort als Funktion der Zeit) über alle Schallwege rendern.
    ort_fn(t) liefert Weltkoordinaten (aussen=True) bzw. Bootskoordinaten."""
    nb = n_bloecke(len(sig))
    t = blockzeiten(t0, nb)
    p = ort_fn(t)
    if getattr(kx, 'karte', None) is not None:
        # Ereignisprotokoll für die Szenenkarte: Ort im Hörerbezug (Boot bzw. Umgebung), 2 Hz,
        # bei durchlaufenden Quellen 0,5 Hz
        dauer = len(sig) / FS
        schritt = 2.0 if dauer > 60 else 0.5
        ts = t0 + np.arange(0, dauer + 1e-6, schritt)
        pk = ort_fn(ts)
        if aussen:
            pk = kx.boot.welt_zu_boot(pk, ts)
        kx.karte.append(dict(g=getattr(kx, 'gruppe', ''), art=getattr(kx, 'etikett', None) or 'quelle', t0=round(float(t0), 2), dt=schritt,
                             p=np.round(pk, 1).tolist(), pegel=round(float(20 * np.log10(max(pegel, 1e-9))), 1)))
        if getattr(kx, 'nur_karte', False):
            return
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
    wege = kx.boot.pfade(pb, aussen, bild, spiegelungen and not kx.hrtf.stereo)
    if kx.hrtf.stereo:
        # Vergleichsfassung: nur der direkte Weg aus der Richtung der Quelle, ohne Beugung über die
        # Kante und ohne Nahfeld-Pegelunterschied; Entfernung, Luftdämpfung und Nachhall bleiben
        w0 = wege[0]
        k = np.broadcast_to(kx.boot.kopf, pb.shape)
        wege = [dict(w0, richt=kx.boot._kopfbezug(pb - k), entf=np.linalg.norm(pb - k, axis=1), gang=None, ohr=None, streu=None)]
    # Entfernung des direkten Wegs: daraus Weitenhall-Anteil und Luftflimmern (nur draußen)
    r = wege[0].get('entf_wahr', wege[0]['entf'])        # Unterwasser: Laufzeitweg ist gestaucht
    bus2, gew2 = None, None
    gname = getattr(kx, 'gruppe', None)
    def gilt(cfg):          # Wirkung auf bestimmte Gruppen beschränkbar (sonst wird Brandung zu Rauschen)
        return bool(cfg) and aussen and (not cfg.get('gruppen') or gname in cfg['gruppen'])
    wt = getattr(kx, 'windtragen', None)
    if gilt(wt):
        # Böen tragen den Schall: Quellen in Luv (woher der Wind kommt) werden in der Böe lauter und
        # heller, Quellen in Lee leiser und dumpfer. Gleiche Böenkurve wie Wind und Segel.
        anteil = np.clip((r - wt['ab_m']) / (wt['voll_m'] - wt['ab_m']), 0, 1)
        if anteil.max() > 0:
            az = np.arctan2(p[:, 1], p[:, 0])
            luv = np.cos(az - np.radians(wt.get('wind_von_grad', 20.0)))
            boe = np.clip(kx.boe(t), -1.0, 2.5)
            db = wt.get('db', 5.0) * boe * luv * anteil
            form = 0.35 + 0.65 * np.clip(FREQ_K / 4000.0, 0, 1)        # Höhen reagieren stärker
            zus = 10 ** (db[:, None] * form[None, :] / 20)
            w0 = wege[0]
            wege[0] = dict(w0, gang=zus.astype(np.float32) if w0['gang'] is None else (w0['gang'] * zus).astype(np.float32))
    if gilt(kx.weite) and kx.bus_weite is not None:
        w = kx.weite
        # der Hallanteil bleibt mit der Entfernung gleich, der Direktschall fällt – aber nur bis zu einer
        # Obergrenze, sonst bestehen sehr ferne Quellen fast nur noch aus Hall (klang wie vor einer Klippe)
        gew2 = (np.clip((r - w['ab_m']) / (w['voll_m'] - w['ab_m']), 0, 1) ** w.get('exponent', 0.7)
                * np.minimum(r / w.get('bezug_m', 30.0), w.get('max_faktor', 1e9)))
        if gew2.max() > 0:
            bus2 = kx.bus_weite
    if gilt(kx.flimmern):
        f = kx.flimmern
        anteil = np.clip((r - f['ab_m']) / (f['voll_m'] - f['ab_m']), 0, 1)
        if anteil.max() > 0:
            # eigene, feste Zufallsquelle je Ereignis: die Ereignisfolge der Szene bleibt unverändert
            frng = np.random.default_rng((int(t0 * 1000) * 7919 + len(sig)) % (2 ** 32))
            rate = FS / 512
            def kurve():
                # Streuung über eine lange Folge bestimmen: bei kurzen Ereignissen (< 1 s) ist das
                # langsame Rauschen fast konstant, seine eigene Streuung fast null – geteilt durch sie
                # wurde der Faktor riesig (Fehler bis 19.11.: Möwengruppe mit 59 dB über Vollaussteuerung)
                L = nb + int(20 * rate)
                X = np.fft.rfft(frng.normal(size=L))
                X *= np.exp(-0.5 * (np.fft.rfftfreq(L, 1 / rate) / f.get('hz', 0.7)) ** 2)
                z = np.fft.irfft(X, L)
                return np.clip(z[:nb] / (z.std() + 1e-12), -3, 3)
            gemeinsam, l_, r_ = kurve(), kurve(), kurve()
            k = f.get('korrelation', 0.6)
            fl = np.stack([np.sqrt(k) * gemeinsam + np.sqrt(1 - k) * l_, np.sqrt(k) * gemeinsam + np.sqrt(1 - k) * r_], 1)
            faktor = 10 ** (f['db'] * anteil[:, None] * fl / 20)
            w0 = wege[0]
            wege[0] = dict(w0, ohr=faktor if w0['ohr'] is None else w0['ohr'] * faktor)
    g = getattr(kx, 'g', None) or {}
    ohne = getattr(kx, 'ohne', ())
    if not kx.hrtf.stereo:
        w0 = wege[0]
        kopf = np.broadcast_to(kx.boot.kopf, pb.shape)
        # Nahfeld: unter einem Meter frequenzabhängiger Unterschied zwischen den Ohren (Kugelkopf)
        if 'nahfeld' not in ohne and w0.get('luft', True) and r.min() < 1.0:
            wege[0] = w0 = dict(w0, ohr=rwk.nahfeld_ohren(r, w0['richt']))
        # Richtwirkung: Rufe sind in Rufrichtung heller. Rufrichtung = Bewegungsrichtung (oder
        # zufällig bei ruhenden Tieren) mit zufälliger Kopfwendung
        rw = g.get('richtwirkung')
        if rw and aussen and 'richtwirkung' not in ohne:
            zrng = _ereignis_rng(t0, len(sig), 2)
            weg_h = pb[-1, :2] - pb[0, :2]
            if np.linalg.norm(weg_h) / max(len(sig) / FS, 0.1) > 0.5:
                kurs = np.arctan2(weg_h[1], weg_h[0])
            else:
                kurs = zrng.uniform(0, 2 * np.pi)
            kurs += zrng.normal(0, np.radians(rw.get('streuung_grad', 50.0)))
            zu = kopf - pb
            cos = (zu[:, 0] * np.cos(kurs) + zu[:, 1] * np.sin(kurs)) / np.maximum(np.linalg.norm(zu, axis=1), 1e-6)
            zus = rwk.richtwirkung(cos, rw.get('db', 8.0))
            wege[0] = w0 = dict(w0, gang=zus if w0['gang'] is None else (w0['gang'] * zus).astype(np.float32))
        # Breite: ausgedehnte Quelle – die Bänder des Spektrums kommen von verschiedenen Stellen
        br = breite if breite is not None else g.get('breite_m')
        if br and 'breite' not in ohne:
            brng = _ereignis_rng(t0, len(sig), 3)
            if isinstance(br, (list, tuple)):
                br = brng.uniform(*br)
            v_q = pb - kopf
            winkel = 2 * np.arctan(br / (2 * np.maximum(r, 0.3)))
            n_teile = int(np.clip(round(np.degrees(winkel.max()) / g.get('breite_raster_grad', 12.0)) + 1, 1, 5))
            if n_teile >= 2:
                dh = np.linalg.norm(v_q[:, :2], axis=1, keepdims=True)
                tang = np.where(dh > 0.2, np.concatenate([-v_q[:, 1:2], v_q[:, 0:1], np.zeros_like(dh)], 1) / np.maximum(dh, 1e-6),
                                np.array([[1.0, 0.0, 0.0]]))
                richt_mehr = [kx.boot.pfade(pb + o * tang, aussen, None, False)[0]['richt'] for o in np.linspace(-0.5, 0.5, n_teile) * br]
                wege[0] = dict(wege[0], richt_mehr=richt_mehr, masken=rwk.breitenmasken(n_teile, brng))
    start = int(round(t0 * FS))
    for weg in wege:
        ist_direkt = weg is wege[0]
        st, v = rendere_pfad(kx.hrtf, sig, weg['entf'], weg['richt'], weg['gang'], pg, weg['ohr'],
                             bus if weg['hall'] else None, hall, weg.get('streu'), start,
                             bus2 if ist_direkt else None, gew2, weg.get('luft', True), weg.get('richt_mehr'), weg.get('masken'))
        spur.addiere(st, start + v)
    # Streuung an der Umgebung (Baumstämme): viele kleine, frühe Echos aus allen Richtungen. Für
    # kurze Ereignisse; die Quelle gilt für die Dauer des Ereignisses als ruhend.
    if (aussen and not kx.hrtf.stereo and 'streuung' not in ohne and hasattr(kx.boot, 'streu_ir') and g.get('streuung', True)
            and len(sig) < 20 * FS and np.linalg.norm(pb[-1] - pb[0]) / max(len(sig) / FS, 0.1) < 3.0):
        m = nb // 2
        ir, vz = kx.boot.streu_ir(kx.hrtf, pb[m])
        if ir is not None:
            y = np.stack([fftconvolve(sig, ir[e]) for e in range(2)]).astype(np.float32) * float(pg[m])
            spur.addiere(y, start + vz)


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
        punkt = np.array(g['punkte'][i % len(g['punkte'])], float) if g.get('punkte') else None
        drift = rng.uniform(-1, 1) * np.radians(g.get('drift_grad', 25))
        z = g.get('hoehe', 0.3)
        z = rng.uniform(*z) if isinstance(z, list) else z
        nk = int(round(kx.dauer * 4))
        atem = _rauschkurve(rng, nk, 4.0, g.get('atem_hz', 0.08))   # periodisch über die Szenendauer
        tk = np.arange(nk) / 4.0
        tiefe = g.get('atem_db', 3.0)

        def ort(t, az0=az0, r0=r0, drift=drift, z=z, punkt=punkt):
            if punkt is not None:                       # feste Stelle (z. B. Abschnitt eines Rinnsals)
                return np.tile(punkt, (len(t), 1))
            az = az0 + drift * np.sin(2 * np.pi * t / kx.dauer + az0)
            return np.stack([r0 * np.cos(az), r0 * np.sin(az), np.full(len(t), z)], 1)

        def pg(t, atem=atem):
            p = 10 ** (tiefe * np.interp(t, tk, atem, period=kx.dauer) / 20)
            if g.get('boe_db'):
                p = p * 10 ** (g['boe_db'] * kx.boe(t) / 20)
            return p * kx.folge(g, t)[1]

        bezug = r0 if punkt is None else g.get('bezug_m', 3.0)
        rendere_kreis(kx, spur, bus, sig.astype(np.float32), ort, True, bezug, g.get('hall', 0.0), pg)


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
        e = _wahl(rng, ev)
        r = np.sqrt(rng.uniform(rmin ** 2, rmax ** 2))
        az = rng.uniform(0, 2 * np.pi)
        hz = g.get('hoehe', 0.15)
        p0 = np.array([r * np.cos(az), r * np.sin(az), rng.uniform(*hz) if isinstance(hz, list) else hz])
        if g.get('punkt'):            # feste Stelle in der Welt (z. B. ein Felsen), Brecher streuen entlang
            p0 = np.array(g['punkt'], float) + np.r_[rng.normal(0, g.get('punkt_streuung_m', 3.0), 2), 0]
        ziel = np.array([np.cos(wind), np.sin(wind), 0]) * v
        staerke = 10 ** (rng.normal(0, g.get('streuung_db', 3.0)) / 20) * kx.folge(g, t)[1]
        if rng.random() < g.get('ausreisser_wahrsch', 0.0):     # ab und zu eine deutlich stärkere
            staerke *= 10 ** (rng.uniform(*g.get('ausreisser_db', [4, 8])) / 20)
        if g.get('meldet') and staerke >= g.get('melde_ab', 1.5):
            kx.melde(g['meldet'], t, p0, staerke)

        def ort(tt, p0=p0, t0=t, ziel=ziel):
            return p0[None, :] + (tt - t0)[:, None] * ziel[None, :]

        # Bezugsentfernung: ein Kamm in 12 m hat den Nennpegel
        rendere_quelle(kx, spur, bus, kraft(e, staerke, g), t, ort, True, g.get('bezug_m', 12.0) * staerke, g.get('hall', 0.0))
        t += rng.exponential(g.get('abstand_s', 2.5)) / max(kx.folge(g, t)[0], 0.02)


class Vogel:
    """Flugbahn: Kreisen um einen wandernden Mittelpunkt, Höhe und Radius schwanken."""

    def __init__(self, rng, dauer, g):
        self.rm = rng.uniform(*g.get('radius', [10, 35]))
        self.m0 = g.get('mitte', [0.0, 0.0])          # Mittelpunkt der Bahnen (z. B. das Wasserloch statt des Hörers)
        self.h = rng.uniform(*g.get('hoehe', [6, 25]))
        self.v = rng.uniform(*g.get('tempo', [7, 12])) * rng.choice([-1, 1])
        if g.get('drehsinn'):                          # alle kreisen gleich herum (Vorzugsrichtung im Wind)
            self.v = abs(self.v) * g['drehsinn']
        self.ph = rng.uniform(0, 2 * np.pi)
        # alle Verläufe periodisch über die Szenendauer, damit die Schleife keine Naht hat
        self.P = float(dauer)
        nk = int(round(dauer))
        self.tk = np.arange(nk) * (self.P / nk)
        self.dr = _rauschkurve(rng, nk, 1.0, 0.03) * g.get('radius_streuung', 0.3) * self.rm
        self.dh = _rauschkurve(rng, nk, 1.0, 0.04) * 0.25 * self.h
        self.mx = _rauschkurve(rng, nk, 1.0, 0.012) * g.get('mitte_streuung', 10)
        self.my = _rauschkurve(rng, nk, 1.0, 0.012) * g.get('mitte_streuung', 10)
        # Winkel aus dem Tempo integrieren; auf eine ganze Zahl von Runden je Durchlauf runden
        r = np.maximum(self.rm + self.dr, 4)
        schritt = np.abs(self.v) / r * (self.P / nk)
        runden = max(1, round(schritt.sum() / (2 * np.pi)))
        schritt *= runden * 2 * np.pi / schritt.sum()
        win = np.concatenate([[0.0], np.cumsum(schritt)]) * np.sign(self.v) + self.ph
        if g.get('pendeln_grad'):
            # langsame Tiere: kein Kreisen um den Mittelpunkt, sondern hin und her an einem Ufer/Hang
            # (periodisch, Tempo aus Amplitude und Szenendauer)
            amp = np.radians(g['pendeln_grad'])
            tw = np.append(self.tk, self.P)
            win = self.ph + amp * np.sin(2 * np.pi * tw / self.P * rng.integers(1, 3) + rng.uniform(0, 6.3))
            runden = 0
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
        return np.stack([self.m0[0] + self._p(t, self.mx) + r * np.cos(w),
                         self.m0[1] + self._p(t, self.my) + r * np.sin(w), h], 1)


def gen_schwarm(kx, g, spur, bus):
    """Möwen: jede hat eine Flugbahn und eine Stimme (eine Aufnahme). Rufe kommen in
    Schüben; oft antwortet kurz darauf eine andere."""
    rng = kx.rng
    ev = kx.bib.ereignisse(g['sammlung'])
    quellen = sorted({e['quelle'] for e in ev})
    voegel = [Vogel(rng, kx.dauer, g) for _ in range(g.get('anzahl', 7))]
    # Jedes Tier hat eine Stimme. Aufnahmen mit wenigen Ausschnitten werden zu einer Stimme
    # zusammengelegt – sonst wiederholt ein Tier in zehn Minuten dreißigmal dieselben zwei Rufe.
    je_quelle = {q: [e for e in ev if e['quelle'] == q] for q in quellen}
    mindest = g.get('stimme_min_ausschnitte', 8)
    becken, offen = [], []
    for q in sorted(quellen, key=lambda q: -len(je_quelle[q])):
        offen += je_quelle[q]
        if len(offen) >= mindest:
            becken.append(offen)
            offen = []
    if offen:
        if becken:
            becken[-1] = becken[-1] + offen
        else:
            becken.append(offen)
    stimmen = [int(i % len(becken)) for i in rng.permutation(len(voegel))]
    nach_stimme = dict(enumerate(becken))
    t = rng.uniform(0.5, 3)
    n_rufe = 0
    sn = g.get('stille_nach')         # Ereigniskette: nach einem Gebrüll o. Ä. verstummen die Tiere kurz
    still = [(m['t'], m['t'] + sn.get('dauer_s', 6.0)) for m in kx.meldungen(*sn['auf'])] if sn else []
    while t < kx.dauer:
        ende = next((b_ for a_, b_ in still if a_ <= t < b_), None)
        if ende is not None:
            t = ende + rng.uniform(0.5, 3.0)
            continue
        i = int(rng.integers(len(voegel)))
        kette = [i]
        if rng.random() < g.get('antwort_wahrsch', 0.45):
            kette.append(int(rng.integers(len(voegel))))
            if rng.random() < 0.35:
                kette.append(int(rng.integers(len(voegel))))
        tt = t
        for j in kette:
            wahl = nach_stimme[stimmen[j]]
            e = _wahl(rng, wahl)
            staerke = 10 ** (rng.normal(0, 2.5) / 20) * kx.folge(g, tt)[1]
            # leichte Tonhöhenvariation je Ruf, damit sich nichts hörbar wiederholt
            fak = 2 ** (rng.normal(0, g.get('tonhoehe_streuung_ht', 0.35)) / 12)
            sig = np.interp(np.arange(0, len(e['sig']) - 1, fak), np.arange(len(e['sig'])), e['sig']).astype(np.float32)
            rendere_quelle(kx, spur, bus, sig, tt, voegel[j].ort, True, g.get('bezug_m', 15.0) * staerke, g.get('hall', 0.0))
            n_rufe += 1
            tt += e['dauer'] * rng.uniform(0.5, 1.1) + rng.uniform(0.1, 0.9)
        t += rng.exponential(g.get('abstand_s', 4.0)) / max(kx.folge(g, t)[0], 0.02)
    n_auf = 0
    a = g.get('aufschrecken')
    if a:
        # Böe über der Schwelle: Vögel schrecken auf – ein Schwall aufgeregter Rufe, einige fliegen
        # flatternd los. Nur steigende Durchgänge, mit Mindestabstand.
        flattern = kx.bib.ereignisse(g['flattern']) if g.get('flattern') else []
        tk = np.arange(int(kx.dauer * 10)) / 10.0
        b = kx.boe(tk)
        ueber = b > a.get('schwelle', 1.2)
        letzt = -1e9

        def schreck(tc, r_):
            tt = tc + r_.uniform(0.2, 1.0)
            for _ in range(int(r_.integers(*a.get('rufe', [3, 7])))):
                j = int(r_.integers(len(voegel)))
                e = _wahl(r_, nach_stimme[stimmen[j]])
                fak = 2 ** (r_.normal(0.5, 0.4) / 12)          # aufgeregt: etwas höher
                sig = np.interp(np.arange(0, len(e['sig']) - 1, fak), np.arange(len(e['sig'])), e['sig']).astype(np.float32)
                rendere_quelle(kx, spur, bus, sig, tt, voegel[j].ort, True, g.get('bezug_m', 15.0) * a.get('pegel', 1.4), g.get('hall', 0.0))
                if flattern and r_.random() < a.get('flatter_wahrsch', 0.6):
                    f = _wahl(r_, flattern)
                    rendere_quelle(kx, spur, bus, _variante(r_, f['sig'], 1.0), tt - r_.uniform(0, 0.4), voegel[j].ort, True,
                                   g.get('bezug_m', 15.0) * a.get('flatter_pegel', 0.5), g.get('hall', 0.0))
                tt += r_.uniform(0.15, 0.7)

        for i in np.flatnonzero(ueber & ~np.roll(ueber, 1)):
            tc = tk[i]
            if tc - letzt < a.get('abstand_s', 25) or rng.random() > a.get('wahrsch', 0.8):
                continue
            letzt = tc
            n_auf += 1
            schreck(tc, rng)
        # Ereigniskette: auch gemeldete Ereignisse (Astbruch, Brecher am Felsen) schrecken auf
        arng = np.random.default_rng(int(kx.dauer) * 19 + len(voegel))
        for m in kx.meldungen(*a.get('auf', [])):
            if arng.random() < a.get('auf_wahrsch', 0.9):
                schreck(m['t'] + arng.uniform(0.2, 0.7), arng)
                n_auf += 1
    return dict(rufe=n_rufe, aufgeschreckt=n_auf)


def gen_ueberflug(kx, g, spur, bus):
    """Einzelne Möwe schießt dicht über das Boot: gerade Bahn, 2–5 m hoch. Der Doppler
    entsteht aus der Bahn (gleitende Laufzeit), nicht aus einer Tonhöhenkurve."""
    rng = kx.rng
    ev = [e for e in kx.bib.ereignisse(g['sammlung']) if e['dauer'] >= g.get('min_dauer', 0.5)]
    fluegel = kx.bib.ereignisse(g['fluegel']) if g.get('fluegel') else None
    echt = kx.bib.ereignisse(g['fluegel_echt']) if g.get('fluegel_echt') else None
    t = rng.uniform(*g.get('erster_s', [8, 14]))
    liste = []
    erster = t
    while not liste or t < kx.dauer + erster - g.get('abstand_s', [18, 32])[0]:   # Abstand gilt auch über die Naht; mindestens einer
        kurs = rng.uniform(0, 2 * np.pi)
        if g.get('kurs_grad'):         # Vorzugsrichtung [Mittel, Streuung] – z. B. mit dem Wind –, manchmal dagegen
            kurs = np.radians(g['kurs_grad'][0] + rng.normal(0, g['kurs_grad'][1])) + (np.pi if rng.random() < g.get('gegen_wahrsch', 0.0) else 0.0)
        v = rng.uniform(*g.get('tempo', [10, 15]))
        h = rng.uniform(*g.get('hoehe', [2.0, 4.5]))
        seit = rng.uniform(-1.5, 1.5)
        steig = rng.uniform(-0.06, 0.06)
        ri = np.array([np.cos(kurs), np.sin(kurs), steig])
        quer = np.array([-np.sin(kurs), np.cos(kurs), 0])
        boot_k = np.array([kx.boot.kopf[0], kx.boot.kopf[1], 0.0])

        def ort(tt, t=t, ri=ri, quer=quer, v=v, h=h, seit=seit):
            s = (tt - t) * v
            p = boot_k[None, :] + s[:, None] * ri[None, :] + seit * quer[None, :]
            p[:, 2] = np.maximum(h + s * ri[2], 1.5)
            return p

        # Hauptruf liegt über dem nächsten Punkt: er beginnt im Anflug (etwas höher) und endet im
        # Wegflug (etwas tiefer) – so kippt die Tonhöhe hörbar innerhalb eines Rufs.
        lang = [e for e in ev if e['dauer'] >= g.get('haupt_min_s', 0.8)]
        haupt = _wahl(rng, lang)
        gleiche = [e for e in ev if e['quelle'] == haupt['quelle'] and e is not haupt] or [haupt]
        t_haupt = t - rng.uniform(0.4, 0.55) * haupt['dauer']
        rufe = [(t_haupt, haupt)]
        if rng.random() < g.get('vorruf_wahrsch', 0.7):            # Ruf im Anflug, endet vor dem Hauptruf
            e = _wahl(rng, gleiche)
            rufe.append((t_haupt - e['dauer'] - rng.uniform(0.15, 0.6), e))
        if rng.random() < g.get('nachruf_wahrsch', 0.4):           # Ruf im Wegflug
            e = _wahl(rng, gleiche)
            rufe.append((t_haupt + haupt['dauer'] + rng.uniform(0.2, 0.7), e))
        for ts, e in rufe:
            rendere_quelle(kx, spur, bus, kraft(e, 1.0, g), ts, ort, True, g.get('bezug_m', 5.0), g.get('hall', 0.0))
        if echt:
            # echte Flügelschläge: eine Schlagfolge im Anflug, endet kurz vor dem nächsten Punkt (dort gleitet sie)
            e = _wahl(rng, echt)
            sig = _variante(rng, e['sig'], 1.0) * 10 ** (g.get('fluegel_db', -12) / 20)
            rendere_quelle(kx, spur, bus, sig, t - e['dauer'] - rng.uniform(0.1, 0.5), ort, True, g.get('bezug_m', 5.0), g.get('hall', 0.0))
            if fluegel:          # Fahrtwind ohne eigene Schläge darunter
                gen_fluegel(kx, dict(g, fluegel_schlaege=[0, 1]), spur, bus, fluegel, ort, t, v, rng)
        elif fluegel:
            gen_fluegel(kx, g, spur, bus, fluegel, ort, t, v, rng)
        liste.append(round(float(t), 1))
        t += rng.uniform(*g.get('abstand_s', [18, 32]))
    return dict(zeiten=liste)


def gen_fluegel(kx, g, spur, bus, stuecke, ort, t_nah, v, rng):
    """Fahrtwind und Flügelschläge einer vorbeifliegenden Möwe. Rohstoff ist echtes Windrauschen;
    nur die Hüllkurve (einige Schläge im Möwentakt, dann Gleiten) ist vorgegeben. Die Quelle fliegt
    auf der Bahn der Möwe mit – Anschwellen, Doppler und Richtung kommen aus dem Renderer."""
    e = _wahl(rng, stuecke)
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
    f_schlag = rng.uniform(*g.get('fluegel_takt', [2.7, 3.6]))
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


def _rumpfpunkt(boot, rng, seite, aussen=True, x=None):
    x = rng.uniform(-0.8 * boot.a, 0.7 * boot.a) if x is None else x
    y = seite * boot.b * np.sqrt(max(1 - (x / boot.a) ** 2, 0.05))
    return np.array([x, y + seite * (0.04 if aussen else -0.05), 0.02 if aussen else max(boot.boden + 0.12, 0.12)])


def _planke(sig, g, rng):
    """Körperschall: der Schlag regt die Planken an, sie schwingen kurz und hohl nach und strahlen
    nach innen ab („Klock“). Massegesetz: die Höhen kommen kaum durch das Holz. Die Eigenfrequenzen
    streuen je Schlag etwas (andere Planke, anderer Spant)."""
    kern = mat.filt(sig.astype(np.float64), g.get('planke_tiefpass', 450), 'lowpass', 2)
    moden = g.get('planke_moden')
    if not moden:
        return kern.astype(np.float32)
    t60max = max(m[1] for m in moden)
    kern = np.r_[kern, np.zeros(int(1.5 * t60max * FS))]
    verstimmt = [[f * 2 ** (rng.normal(0, 1.2) / 12), t60, anteil] for f, t60, anteil in moden]
    return mat.resonanz(kern, verstimmt).astype(np.float32)


def _spritzer(kx, g, spur, bus, ev_tropfen, t, pa, staerke, rng):
    """Bei einem harten Schlag fliegt Wasser über die Bordkante: einige Tropfen prasseln kurz danach
    innen aufs Holz, nah am Kopf, wenn der Schlag nah war."""
    dauer = rng.uniform(0.5, 1.1)
    n = int((dauer + 0.6) * FS)
    sig = np.zeros(n, np.float32)
    for _ in range(int(rng.integers(*g.get('spritzer_tropfen', [7, 16])))):
        e = ev_tropfen[int(rng.integers(len(ev_tropfen)))]['sig']
        # Tropfen fallen zuerst dicht, dann vereinzelt nach
        a = int(min(rng.exponential(dauer / 3), dauer) * FS)
        m = min(len(e), n - a)
        sig[a:a + m] += e[:m] * 10 ** (rng.normal(-3, 4) / 20)
    p = pa.copy()
    p[1] -= np.sign(pa[1]) * rng.uniform(0.25, 0.55)       # innen, auf Bank und Bodenbrettern
    p[2] = max(kx.boot.boden + 0.05, 0.05) + rng.uniform(0, 0.35)
    rendere_quelle(kx, spur, bus, sig, t + rng.uniform(0.25, 0.45), lambda tt, p=p: np.tile(p, (len(tt), 1)), False,
                   g.get('spritzer_pegel', 0.5) * staerke, g.get('hall', 0.0), breite=g.get('spritzer_breite_m', 0.6))


def gen_rumpf(kx, g, spur, bus):
    """Wasser am Holz. Schläge fallen auf die Umkehrpunkte des Rollens (die eintauchende
    Seite), dazwischen einzelne kleinere Schwapps. Jeder Schlag kommt auf zwei Wegen:
    als Luftschall über die Bordkante und durch die Planke (Körperschall, hohl nachschwingend).
    Harte Schläge werfen manchmal Spritzer über die Bordkante."""
    rng = kx.rng
    ev = kx.bib.ereignisse(g['sammlung'])
    ev_tropfen = kx.bib.ereignisse(g['spritzer']) if g.get('spritzer') else []
    srng = np.random.default_rng(int(kx.dauer) * 29 + 7)
    n_spritzer = 0
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
    for t, seite, staerke, _ in zeiten:
        if staerke >= g.get('melde_ab', 0.9):
            kx.melde('rumpfschlag', t, [0.0, seite * kx.boot.b, 0.0], staerke)
    # Ereigniskette: eine große Welle in der Nähe erreicht kurz darauf den Rumpf – auf ihrer Seite
    krng = np.random.default_rng(int(kx.dauer) * 13 + 5)
    n_kette = 0
    for m in kx.meldungen('welle'):
        pw = kx.boot.welt_zu_boot(np.array([m['ort']]), np.array([m['t']]))[0]
        d = float(np.linalg.norm(pw[:2]))
        if d < g.get('welle_bis_m', 18.0):
            zeiten.append((m['t'] + d / g.get('wellentempo_m_s', 3.5) + krng.normal(0, 0.15), 1 if pw[1] > 0 else -1,
                           min(1.0, 0.7 + 0.15 * m['staerke']), gross))
            n_kette += 1
    for t, seite, staerke, wahl in zeiten:
        e = _wahl(rng, wahl)
        staerke = staerke * kx.folge(g, t)[1]
        staerke_roh = staerke
        sig = kraft(e, staerke / g.get('wucht_bezug', 0.75), g)
        pa = _rumpfpunkt(kx.boot, rng, seite, True)
        pi = pa.copy()
        pi[1] -= seite * 0.09
        pi[2] = 0.12
        staerke *= np.sqrt(np.linalg.norm(pi - kx.boot.kopf))  # Nähe zählt, aber nur halb so stark wie 1/r
        rendere_quelle(kx, spur, bus, sig, t, lambda tt, pa=pa: np.tile(pa, (len(tt), 1)), False,
                       staerke, g.get('hall', 0.0))
        dumpf = _planke(sig, g, rng)
        rendere_quelle(kx, spur, bus, dumpf, t, lambda tt, pi=pi: np.tile(pi, (len(tt), 1)), False,
                       staerke * g.get('planke_pegel', 0.8), g.get('hall', 0.0), breite=g.get('planke_breite_m'))
        if ev_tropfen and staerke_roh >= g.get('spritzer_ab', 0.85) and srng.random() < g.get('spritzer_wahrsch', 0.3):
            _spritzer(kx, g, spur, bus, ev_tropfen, t, pa, staerke_roh, srng)
            n_spritzer += 1
    return dict(ereignisse=len(zeiten), nach_welle=n_kette, spritzer=n_spritzer)


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
        if rng.random() > g.get('wahrsch', 0.55) * (0.3 + 0.7 * staerke) * kx.folge(g, t)[0]:
            continue
        for _ in range(int(rng.integers(1, 3))):
            k = int(rng.integers(len(stellen)))
            if k == letzte:
                k = (k + 3) % len(stellen)
            letzte = k
            e = _wahl(rng, ev)
            fak = 2 ** (rng.normal(0, 1.0) / 12)
            sig = np.interp(np.arange(0, len(e['sig']) - 1, fak), np.arange(len(e['sig'])), e['sig']).astype(np.float32)
            p = stellen[k] + rng.normal(0, 0.03, 3)
            rendere_quelle(kx, spur, bus, sig, t + rng.uniform(-0.5, 0.4), lambda tt, p=p: np.tile(p, (len(tt), 1)),
                           False, (0.4 + 0.6 * staerke) * 10 ** (rng.normal(0, 2) / 20), g.get('hall', 0.0))
            n += 1
    # Ereigniskette: nach einem harten Schlag gegen den Rumpf arbeitet das Holz auf dieser Seite nach
    krng = np.random.default_rng(int(kx.dauer) * 17 + 3)
    n_kette = 0
    for m in kx.meldungen('rumpfschlag'):
        if krng.random() < g.get('nach_schlag_wahrsch', 0.7):
            seite = 1 if m['ort'][1] > 0 else -1
            kand = [s_ for s_ in stellen if s_[1] * seite > 0] or stellen
            p = kand[int(krng.integers(len(kand)))] + krng.normal(0, 0.03, 3)
            e = ev[int(krng.integers(len(ev)))]
            rendere_quelle(kx, spur, bus, e['sig'], m['t'] + krng.uniform(0.15, 0.6), lambda tt, p=p: np.tile(p, (len(tt), 1)),
                           False, m['staerke'] * 10 ** (krng.normal(0, 2) / 20), g.get('hall', 0.0))
            n_kette += 1
    return dict(ereignisse=n, nach_schlag=n_kette)


def gen_segel(kx, g, spur, bus):
    """Schlaffes Segel am Mast vor den Knien. Ohne Wind hängt es und raschelt kaum; eine Böe
    fängt sich (ein weicher Schlag, wenn das Tuch sich füllt), dann knattert das Achterliek
    unregelmäßig, bis die Böe nachlässt und das Tuch wieder einfällt.

    Mit `stoff` (echte Aufnahmen flatternden Stoffs) trägt die Aufnahme den Klang, die Nachbildung
    aus Windrauschen (`sammlung`: Füllen, Knattern, Einfallen) liegt leise darunter. Alles hängt
    an der gemeinsamen Böenkurve der Szene."""
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
    if g.get('stoff'):
        # echte Aufnahmen von flatterndem Stoff: in der Flaute fast still (das Tuch hängt), mit der
        # Böe lauter; das nachgebildete Knattern tritt dann zurück
        stoff = kx.bib.flickwerk(g['stoff'], n, rng, ueberblend=0.8)
        stoff = mat.filt(stoff, g.get('stoff_hochpass', 120), 'highpass', 2)
        stoff /= np.sqrt((stoff ** 2).mean()) + 1e-12
        an = g.get('stoff_ruhe', 0.04) + np.clip(wind / 1.5, 0, 1.5) ** 1.5
        sig = sig * g.get('nachbildung_pegel', 0.4) + 0.01 * g.get('stoff_pegel', 1.0) * stoff * huelle_glatt(an, 200)
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


def kraft(e, staerke=1.0, g=None):
    """Ereignis samt tiefer Schicht: die Schicht wächst überproportional mit der Stärke
    (Exponent wucht_exponent, Standard 2) – leichte Schwapps bleiben schlank, harte Schläge wummern."""
    g = g or {}
    if 'tief' not in e:
        return e['sig']
    w = g.get('wucht_pegel', 1.0) * max(staerke, 0.0) ** g.get('wucht_exponent', 2.0)
    return (e['sig'] + min(w, g.get('wucht_max', 4.0)) * e['tief']).astype(np.float32)


def _sammlung(kx, g, schluessel):
    return kx.bib.ereignisse(g[schluessel]) if g.get(schluessel) else []


ZAEHLER = {}            # Gruppe -> Counter(Ausschnitt): wie oft welcher Ausschnitt benutzt wurde
_AKT_GRUPPE = ['']


def _wahl(rng, liste):
    """Ein Ereignis wählen: von drei zufälligen Kandidaten das bisher am seltensten benutzte.
    So verteilt sich die Auswahl gleichmäßig, und nichts wiederholt sich unnötig oft."""
    z = ZAEHLER.setdefault(_AKT_GRUPPE[0], collections.Counter())
    kand = [liste[int(k)] for k in rng.integers(len(liste), size=3)]
    e = min(kand, key=lambda e: z[e.get('schnitt', id(e))])
    z[e.get('schnitt', id(e))] += 1
    return e


def _ereignis_rng(t0, n, salz):
    """Eigene, feste Zufallsquelle je Ereignis – verbraucht nichts aus der Zufallsfolge der Gruppe,
    die Ereignisfolge bleibt also gleich, wenn eine Wirkung ab- oder zugeschaltet wird."""
    return np.random.default_rng((int(round(t0 * 1000)) * 7919 + n * 31 + salz * 104729) % (2 ** 32))


def _variante(rng, sig, ht=0.6):
    """Leichte Tonhöhen-/Tempovariation, damit sich ein Ereignis nicht hörbar wiederholt."""
    fak = 2 ** (rng.normal(0, ht) / 12)
    return np.interp(np.arange(0, len(sig) - 1, fak), np.arange(len(sig)), sig).astype(np.float32)


def _fest(p):
    return lambda tt, p=np.array(p, float): np.tile(p, (len(tt), 1))


def _gang(kx, g, spur, bus, rng, bahn, t_a, t_b, sets, staerke=1.0, nah=False):
    """Ein Saurier geht eine Bahn ab (bahn(t) -> Fußpunkt am Boden). Je Schritt ein schwerer Tritt,
    dazu nach Wahrscheinlichkeit Matschen, knackende Äste; Laubrascheln auf Körperhöhe."""
    schritt = g.get('schritt_s', [0.75, 1.0])
    t = t_a + rng.uniform(0, 0.5)
    seite = 1
    n = 0
    b = g.get('bezug_m', 20.0) * staerke
    while t < t_b:
        p = bahn(np.array([t]))[0]
        richtung = bahn(np.array([t + 0.5]))[0] - p
        quer = np.array([-richtung[1], richtung[0], 0])
        quer /= np.linalg.norm(quer) + 1e-9
        fuss = p + seite * g.get('spur_m', 0.7) * quer
        fuss[2] = 0.05
        seite = -seite
        st = 10 ** (rng.normal(0, 2) / 20)
        if sets['tritte']:
            e = _wahl(rng, sets['tritte'])
            rendere_quelle(kx, spur, bus, _variante(rng, e['sig'], 0.8), t, _fest(fuss), True, b * st, g.get('hall', 0.0))
        if sets['stampfen']:                              # der schwere, tiefe Teil des Tritts
            e = _wahl(rng, sets['stampfen'])
            rendere_quelle(kx, spur, bus, _variante(rng, kraft(e, st, g), 1.5), t, _fest(fuss), True, b * st * g.get('stampf_pegel', 1.5), g.get('hall', 0.0))
        if sets['ast'] and rng.random() < g.get('ast_wahrsch', 0.0):
            _ast_bruch(kx, g, spur, bus, rng, t + rng.uniform(0.1, 0.4), p, sets, b)
        if sets['matsch'] and rng.random() < g.get('matsch_wahrsch', 0.45):
            e = _wahl(rng, sets['matsch'])
            rendere_quelle(kx, spur, bus, _variante(rng, e['sig']), t + rng.uniform(0.03, 0.15), _fest(fuss), True,
                           b * g.get('matsch_pegel', 0.6), g.get('hall', 0.0))
        if sets['knacken'] and rng.random() < g.get('knack_wahrsch', 0.12):
            e = _wahl(rng, sets['knacken'])
            rendere_quelle(kx, spur, bus, _variante(rng, e['sig'], 1.5), t + rng.uniform(0.0, 0.2), _fest(fuss + [0, 0, 0.2]), True,
                           b * g.get('knack_pegel', 0.7), g.get('hall', 0.0))
        if sets['rascheln'] and rng.random() < g.get('rascheln_wahrsch', 0.5):
            e = _wahl(rng, sets['rascheln'])
            koerper = p + np.array([0, 0, rng.uniform(*g.get('koerper_hoehe', [1.5, 4.0]))])
            rendere_quelle(kx, spur, bus, _variante(rng, e['sig']), t + rng.uniform(0, 0.4), _fest(koerper), True,
                           b * g.get('rascheln_pegel', 0.7), g.get('hall', 0.0))
        t += rng.uniform(*schritt) * (1.3 if nah else 1.0)
        n += 1
    return n


def _saurier_sets(kx, g):
    return {k: _sammlung(kx, g, k) for k in ('tritte', 'stampfen', 'matsch', 'knacken', 'rascheln', 'schnauben', 'atem', 'zupfen', 'kauen',
                                              'ast', 'knarren', 'laub_fall')}


def _ast_bruch(kx, g, spur, bus, rng, t, ort_koerper, sets, b):
    """Ein großer Ast bricht: Holz knarrt unter Last, bricht mit einem Krachen, Laub rauscht mit
    herab, der Ast schlägt dumpf auf dem Boden auf."""
    hoch = ort_koerper + np.array([rng.normal(0, 1.0), rng.normal(0, 1.0), rng.uniform(2.5, 5.0)])
    boden = hoch.copy()
    boden[2] = 0.1
    tt = t
    if sets['knarren']:
        e = _wahl(rng, sets['knarren'])
        rendere_quelle(kx, spur, bus, _variante(rng, e['sig'], 1.0), tt, _fest(hoch), True, b * g.get('knarr_pegel', 0.5), g.get('hall', 0.0))
        tt += min(e['dauer'], 0.8) * rng.uniform(0.6, 0.9)
    kx.melde('astbruch', tt, hoch, 1.0)
    for _ in range(int(rng.integers(1, 3))):                      # Bruch, manchmal zweistufig
        e = _wahl(rng, sets['ast'])
        rendere_quelle(kx, spur, bus, _variante(rng, e['sig'], 1.2), tt, _fest(hoch), True, b * g.get('ast_pegel', 1.2), g.get('hall', 0.0))
        tt += rng.uniform(0.08, 0.35)
    fall = rng.uniform(0.5, 0.9)
    if sets['laub_fall']:
        e = _wahl(rng, sets['laub_fall'])

        def herab(x, t0=tt, hoch=hoch, boden=boden, fall=fall):
            u = np.clip((x - t0) / fall, 0, 1)[:, None]
            return hoch[None, :] + u * u * (boden - hoch)[None, :]
        rendere_quelle(kx, spur, bus, _variante(rng, e['sig']), tt, herab, True, b * g.get('laub_fall_pegel', 0.4), g.get('hall', 0.0))
    if sets['stampfen']:
        e = _wahl(rng, sets['stampfen'])
        rendere_quelle(kx, spur, bus, _variante(rng, kraft(e, 1.0, g), 2.0), tt + fall, _fest(boden), True, b * g.get('aufschlag_pegel', 0.8), g.get('hall', 0.0))


def gen_vorbeigang(kx, g, spur, bus):
    """Ab und zu läuft in mittlerer Entfernung ein Saurier vorbei: gerade Bahn, die in 15–35 m am
    Hörer vorbeiführt, mit Tritten, Matschen, Knacken, Rascheln und selten einem ruhigen Schnauben."""
    rng = kx.rng
    sets = _saurier_sets(kx, g)
    k = kx.boot.kopf
    t = rng.uniform(*g.get('erster_s', [5, 20]))
    erster = t
    liste = []
    while not liste or t < kx.dauer + erster - g.get('abstand_s', [50, 80])[0]:   # mindestens einer
        d = rng.uniform(*g.get('entfernung', [15, 35]))
        v = rng.uniform(*g.get('tempo', [0.8, 1.3]))
        L = g.get('weglaenge_m', 60)
        kurs = rng.uniform(0, 2 * np.pi)
        ri = np.array([np.cos(kurs), np.sin(kurs), 0])
        quer = np.array([-ri[1], ri[0], 0])
        t_mitte = t + L / 2 / v

        def bahn(tt, ri=ri, quer=quer, d=d, v=v, t_mitte=t_mitte):
            s_ = (tt - t_mitte) * v
            return np.array([k[0], k[1], 0])[None, :] + d * quer[None, :] + s_[:, None] * ri[None, :]

        _gang(kx, g, spur, bus, rng, bahn, t, t + L / v, sets)
        if sets['schnauben'] and rng.random() < g.get('schnauben_wahrsch', 0.5):
            ts = t_mitte + rng.uniform(-10, 10)
            kopfpunkt = bahn(np.array([ts]))[0] + [0, 0, rng.uniform(*g.get('kopf_hoehe', [3, 5]))]
            e = _wahl(rng, sets['schnauben'])
            rendere_quelle(kx, spur, bus, _variante(rng, e['sig']), ts, _fest(kopfpunkt), True,
                           g.get('bezug_m', 20.0) * g.get('schnauben_pegel', 0.8), g.get('hall', 0.0))
        liste.append(round(float(t_mitte) % kx.dauer, 1))
        t += L / v + rng.uniform(*g.get('pause_s', [5, 25]))
    return dict(vorbeigaenge=liste)


def gen_besuch(kx, g, spur, bus):
    """Ein Saurier kommt näher: läuft heran, äst an einem Baum (Blätter abzupfen, kauen, schmatzen),
    senkt dann den Kopf bis auf einen halben bis einen Meter an den Hörer heran, schnuppert ruhig
    und geht wieder. Nichts daran soll bedrohlich klingen: leise Schritte, kein Knurren."""
    rng = kx.rng
    sets = _saurier_sets(kx, g)
    k = kx.boot.kopf
    starts = g.get('starts_s', [40])
    info = []
    for t0 in starts:
        az = np.radians(rng.uniform(*g.get('richtung_grad', [-60, 60])))      # aus dem Blickfeld
        ri = np.array([np.cos(az), np.sin(az), 0])
        quer = np.array([-ri[1], ri[0], 0])
        fern = np.array([k[0], k[1], 0]) + 28 * ri + 6 * quer
        fern[2] = 0.0
        baum = np.array([k[0], k[1], 0]) + rng.uniform(3.0, 4.0) * ri + rng.uniform(-1.5, 1.5) * quer
        T = g.get('phasen_s', dict(heran=24, aesen=28, naeher=5, schnuppern=14, weg=24))
        t_heran, t_aesen = t0, t0 + T['heran']
        t_naeher = t_aesen + T['aesen']
        t_schn = t_naeher + T['naeher']
        t_weg = t_schn + T['schnuppern']
        t_ende = t_weg + T['weg']

        # Rumpf (Fußpunkt) über Stützstellen: aus der Ferne zum Baum, beim Schnuppern einen Schritt
        # näher (Hals reicht den Rest), dann denselben Weg zurück
        boden_k = np.array([k[0], k[1], 0.0])
        nah = baum + 0.4 * (boden_k - baum)
        stuetz_t = [t_heran, t_aesen - 2, t_naeher, t_schn, t_weg, t_ende - 2]
        stuetz_p = np.array([fern, baum, baum, nah, nah, fern])

        def bahn(tt, stuetz_t=stuetz_t, stuetz_p=stuetz_p):
            return np.stack([np.interp(tt, stuetz_t, stuetz_p[:, j]) for j in range(3)], 1)

        # Kopf: beim Äsen oben im Laub, beim Schnuppern tief und nah am Hörer (0,5–1 m)
        naehe = rng.uniform(*g.get('naehe_m', [0.6, 0.9]))
        zum_baum = (baum - boden_k)[:2] / np.linalg.norm((baum - boden_k)[:2])
        seitlich = np.array([-zum_baum[1], zum_baum[0], 0.0])
        laub = baum + np.array([0, 0, rng.uniform(2.8, 3.6)]) + 0.6 * seitlich
        schnauze = np.array([k[0] + zum_baum[0] * naehe, k[1] + zum_baum[1] * naehe, k[2] + rng.uniform(0.05, 0.25)])

        def kopf(tt):
            p_aes = laub
            out = np.empty((len(tt), 3))
            for i, x in enumerate(tt):
                if x < t_naeher:
                    out[i] = p_aes + 0.25 * np.array([np.sin(0.7 * x), np.cos(0.5 * x), 0.3 * np.sin(0.9 * x)])
                elif x < t_schn:
                    u = (x - t_naeher) / (t_schn - t_naeher)
                    u = u * u * (3 - 2 * u)
                    out[i] = p_aes + u * (schnauze - p_aes)
                elif x < t_weg:
                    # neugieriges Hin und Her vor dem Gesicht
                    w = 0.18 * np.array([np.sin(1.3 * x), np.sin(0.9 * x + 1), 0.4 * np.sin(1.7 * x)])
                    out[i] = schnauze + w
                else:
                    u = np.clip((x - t_weg) / 3.0, 0, 1)
                    u = u * u * (3 - 2 * u)
                    out[i] = schnauze + u * (p_aes - schnauze)
            return out

        b = g.get('bezug_m', 4.0)
        n_schritte = _gang(kx, g, spur, bus, rng, bahn, t_heran, t_aesen - 1, sets, g.get('schritt_pegel', 0.7), nah=True)
        n_schritte += _gang(kx, g, spur, bus, rng, bahn, t_weg + 1, t_ende, sets, g.get('schritt_pegel', 0.7), nah=True)
        # Äsen: abzupfen, dazwischen kauen und schmatzen
        t = t_aesen + rng.uniform(0.5, 2)
        while t < t_naeher - 1:
            if sets['zupfen']:
                e = _wahl(rng, sets['zupfen'])
                pz = laub + rng.normal(0, 0.3, 3)
                rendere_quelle(kx, spur, bus, _variante(rng, e['sig']), t, _fest(pz), True, b * g.get('zupf_pegel', 1.0), g.get('hall', 0.0))
                t += e['dauer'] + rng.uniform(0.2, 0.6)
            if sets['kauen']:
                for _ in range(int(rng.integers(1, 3))):
                    e = _wahl(rng, sets['kauen'])
                    rendere_quelle(kx, spur, bus, _variante(rng, e['sig'], 0.3), t, kopf, True, b * g.get('kau_pegel', 0.8), g.get('hall', 0.0))
                    t += e['dauer'] + rng.uniform(0.1, 0.5)
            t += rng.uniform(0.5, 2.0)
        # Schnuppern nah am Hörer: kurze Schnauber und ruhiger Atem
        t = t_schn - 1.5
        while t < t_weg - 0.5:
            pool = sets['schnauben'] if (sets['schnauben'] and rng.random() < 0.6) else sets['atem']
            if not pool:
                break
            e = _wahl(rng, pool)
            rendere_quelle(kx, spur, bus, _variante(rng, e['sig'], 0.4), t, kopf, True,
                           b * g.get('schnupper_pegel', 0.35), g.get('hall', 0.0))
            t += e['dauer'] + rng.uniform(0.3, 1.2)
        info.append(dict(start=round(t0, 1), ende=round(t_ende, 1), naehe_m=round(float(naehe), 2), schritte=n_schritte))
    return dict(besuche=info)


def gen_musik(kx, g, spur, bus):
    """Ganz leise Musik: langsame Akkordfläche aus wenigen Sinus-Teiltönen, weich überblendet,
    weit im Stereobild, mit langem Hall. Periodisch über die Szenendauer. Nicht räumlich gerendert –
    sie gehört nicht in die Szene, sie liegt darüber."""
    rng = kx.rng
    n = int(round(kx.dauer * FS))
    akkorde = g.get('akkorde', [[50, 57, 62, 66, 69], [47, 54, 59, 62, 66], [43, 50, 55, 59, 66], [40, 52, 55, 59, 62],
                                [50, 57, 61, 64, 69], [42, 54, 57, 61, 66], [43, 55, 59, 62, 69], [45, 52, 57, 59, 64]])
    T = n / len(akkorde)
    ueber = g.get('ueberblend_s', 9.0) * FS
    L = int(T + 2 * ueber)
    t = np.arange(L) / FS
    huelle = np.ones(L)
    ue = int(ueber)
    huelle[:2 * ue] = np.sin(np.linspace(0, np.pi / 2, 2 * ue)) ** 2
    huelle[-2 * ue:] = np.cos(np.linspace(0, np.pi / 2, 2 * ue)) ** 2
    y = np.zeros((2, n))
    for i, ak in enumerate(akkorde):
        seg = np.zeros((2, L))
        for j, note in enumerate(ak):
            f0 = 440 * 2 ** ((note - 69) / 12)
            pan = (j / max(len(ak) - 1, 1) - 0.5) * 1.2 + rng.normal(0, 0.1)
            gl, gr = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
            trem = 1 + 0.25 * np.sin(2 * np.pi * rng.uniform(0.05, 0.12) * t + rng.uniform(0, 6.3))
            for e, (teil, amp) in enumerate([(1, 1.0), (2, 0.25), (3, 0.08)]):
                for kan, gk, verst in ((0, gl, 0.999), (1, gr, 1.001)):     # leichte Verstimmung L/R
                    seg[kan] += gk * amp * trem * np.sin(2 * np.pi * f0 * teil * verst * t + rng.uniform(0, 6.3)) / (1 + 0.15 * j)
        seg *= huelle
        a = int(i * T - ueber)
        idx = (a + np.arange(L)) % n
        for kan in range(2):
            y[kan] += np.bincount(idx, weights=seg[kan], minlength=n)
    # weich: Tiefpass und langer, kreisförmiger Hall
    y = np.stack([mat.filt(y[k], g.get('tiefpass', 1800), 'lowpass', 2) for k in range(2)])
    hl = int(g.get('hall_s', 5.0) * FS)
    ir_t = np.arange(hl) / FS
    for kan in range(2):
        ir = np.random.default_rng(kan + 5).normal(size=hl) * 10 ** (-3 * ir_t / g.get('hall_t60', 4.0))
        ir = mat.filt(ir, 2500, 'lowpass', 2)
        ir /= np.sqrt((ir ** 2).sum())
        y[kan] = 0.5 * y[kan] + 0.8 * kreisfaltung(y[kan], ir)
    spur.addiere(y.astype(np.float32), 0)
    return dict(akkorde=len(akkorde))


def gen_gebruell(kx, g, spur, bus):
    """Ab und zu gröhlt weit weg ein riesiges Tier; der Ruf schallt über das Tal. Die Echos sind
    Spiegelquellen an den Talhängen: dasselbe Signal von weiter weg und aus anderen Richtungen –
    Verzögerung, Dämpfung und Richtung ergeben sich aus der Lage."""
    rng = kx.rng
    ev = kx.bib.ereignisse(g['sammlung'])
    schichten = {sch['schluessel']: kx.bib.ereignisse(g[sch['schluessel']]) for sch in g.get('schichten', [])}
    k = kx.boot.kopf
    t = rng.uniform(*g.get('erster_s', [20, 40]))
    erster = t
    liste = []
    war_antwort = False
    while not liste or t < kx.dauer + erster - g.get('abstand_s', [35, 70])[0]:   # mindestens einer
        e = _wahl(rng, ev)
        d = rng.uniform(*g.get('entfernung', [350, 700]))
        az = rng.uniform(0, 2 * np.pi)
        if g.get('punkt'):                  # fester Ort (z. B. die Herde am Wasserloch)
            pp = np.array(g['punkt'][:2], float) + rng.normal(0, g.get('punkt_streuung_m', 3.0), 2) - k[:2]
            d, az = float(np.linalg.norm(pp)), float(np.arctan2(pp[1], pp[0]))
        if g.get('naehe_folgt'):            # Drehbuch: die Rufer kommen näher und ziehen wieder weg
            v = kx.kurve(g['naehe_folgt'], t % kx.dauer)
            e0, e1 = g.get('entfernung', [350, 700])
            d = e1 + (e0 - e1) * v * rng.uniform(0.8, 1.0)
        p = np.array([k[0] + d * np.cos(az), k[1] + d * np.sin(az), g.get('hoehe', 8.0)])
        kx.melde(g.get('meldet'), t, p, 1.0)
        sig = _variante(rng, kraft(e, 1.0, g), 1.0)
        for schicht in g.get('schichten', []):            # weitere Stimmen übereinander: tiefer, rauer
            es = _wahl(rng, schichten[schicht['schluessel']])['sig']
            vers = int(rng.uniform(0, schicht.get('versatz_s', 0.15)) * FS)
            lang = max(len(sig), vers + len(es))
            neu_sig = np.zeros(lang, np.float32)
            neu_sig[:len(sig)] += sig
            neu_sig[vers:vers + len(es)] += schicht.get('pegel', 0.5) * es
            sig = neu_sig
        if g.get('folge'):                      # mehrere Stöße hintereinander (Wummern wie beim Emu)
            n = int(rng.integers(g['folge'][0], g['folge'][1] + 1))
            teile, pos = [], 0
            for j in range(n):
                ej = kraft(_wahl(rng, ev), 1.0, g)
                st = 0.6 + 0.4 * np.sin(np.pi * (j + 0.5) / n)          # schwillt an und ab
                teile.append((pos, _variante(rng, ej, 0.5) * st))
                pos += int(len(ej) * rng.uniform(0.55, 0.8))
            sig = np.zeros(pos + max(len(t_) for _, t_ in teile), np.float32)
            for a0, t_ in teile:
                sig[a0:a0 + len(t_)] += t_
        rendere_quelle(kx, spur, bus, sig, t, _fest(p), True, g.get('bezug_m', 400.0), g.get('hall', 1.0))
        kx.etikett = 'echo'
        for j in range(g.get('echos', 6)):
            umweg = rng.uniform(*g.get('echo_umweg_m', [150, 900]))
            a2 = az + rng.uniform(0.6, np.pi * 1.4) * rng.choice([-1, 1])     # Hang auf einer anderen Seite
            d2 = d + umweg
            p2 = np.array([k[0] + d2 * np.cos(a2), k[1] + d2 * np.sin(a2), g.get('hoehe', 8.0)])
            # gleicher Rufbeginn; die Verspätung des Echos ergibt sich aus dem längeren Weg
            rendere_quelle(kx, spur, bus, sig, t, _fest(p2), True,
                           g.get('bezug_m', 400.0) * g.get('echo_reflexion', 0.55) * rng.uniform(0.6, 1.0), g.get('hall', 1.0))
        kx.etikett = None
        liste.append(round(float(t) % kx.dauer, 1))
        aw = g.get('antwort')            # manchmal antwortet kurz darauf ein anderes Tier von woanders
        if aw and not war_antwort and rng.random() < aw.get('wahrsch', 0.35):
            t += len(sig) / FS + rng.uniform(*aw.get('nach_s', [2.0, 6.0]))
            war_antwort = True
            continue
        war_antwort = False
        t += rng.uniform(*g.get('abstand_s', [35, 70])) / max(kx.folge(g, t % kx.dauer)[0], 0.05)
    return dict(rufe=liste)


def gen_zug(kx, g, spur, bus):
    """Ein Schwarm zieht vorbei: mehrere Vögel auf gleichem Kurs, locker gestaffelt, jeder ruft ein
    paar Mal. Anders als die kreisenden Vögel hat der Zug eine klare Richtung (mit dem Wind).
    Mit `teppich` (Aufnahmen eines ganzen rufenden Schwarms) kommt dazu das Stimmengewirr als
    breite Quelle, die mit der Mitte des Schwarms zieht – so hört man den Zug durchgehend
    kommen und gehen, nicht nur einzelne Rufe."""
    rng = kx.rng
    ev = kx.bib.ereignisse(g['sammlung'])
    k = kx.boot.kopf
    liste = []
    for z in g.get('zuege', [{'t': 120, 'kurs_grad': 200}]):
        if g.get('teppich'):
            kurs_t = np.radians(z.get('kurs_grad', 200))
            ri_t = np.array([np.cos(kurs_t), np.sin(kurs_t), 0.0])
            quer_t = np.array([-ri_t[1], ri_t[0], 0.0])
            v_t = float(np.mean(g.get('tempo', [11, 14])))
            d_t = float(np.mean(g.get('abstand_m', [40, 80]))) * z.get('seite', 1)
            h_t = float(np.mean(g.get('hoehe', [20, 40])))
            L_t = g.get('weglaenge_m', 400.0)
            dauer_t = L_t / v_t
            n_t = int(dauer_t * FS)
            sig = kx.bib.flickwerk(g['teppich'], n_t, rng).astype(np.float32)
            rand = int(0.2 * n_t)                     # Anfang und Ende des Wegs weich: dort ist der Schwarm schon weit weg
            sig[:rand] *= np.sin(np.linspace(0, np.pi / 2, rand)) ** 2
            sig[-rand:] *= np.cos(np.linspace(0, np.pi / 2, rand)) ** 2

            def ort_t(tt, ri=ri_t, quer=quer_t, d=d_t, v=v_t, h=h_t, tm=z['t']):
                p = np.array([k[0], k[1], 0.0])[None, :] + d * quer[None, :] + ((tt - tm) * v)[:, None] * ri[None, :]
                p[:, 2] = h
                return p

            rendere_quelle(kx, spur, bus, sig, z['t'] - dauer_t / 2, ort_t, True,
                           g.get('teppich_bezug_m', 60.0), g.get('hall', 0.0), breite=g.get('teppich_breite_m', 25.0))
        kurs = np.radians(z.get('kurs_grad', 200) + rng.normal(0, g.get('kurs_streuung_grad', 8)))
        ri = np.array([np.cos(kurs), np.sin(kurs), 0.0])
        quer = np.array([-ri[1], ri[0], 0.0])
        v = rng.uniform(*g.get('tempo', [11, 14]))
        d = rng.uniform(*g.get('abstand_m', [40, 80])) * z.get('seite', 1)
        h = rng.uniform(*g.get('hoehe', [20, 40]))
        L = g.get('weglaenge_m', 400.0)
        for _ in range(int(rng.integers(*g.get('anzahl', [5, 9])))):
            vs = np.array([rng.uniform(-30, 30), rng.uniform(-12, 12), rng.uniform(-4, 4)])     # längs, quer, Höhe

            def ort(tt, vs=vs, ri=ri, quer=quer, d=d, v=v, h=h, tm=z['t']):
                s_ = (tt - tm) * v + vs[0]
                p = np.array([k[0], k[1], 0.0])[None, :] + (d + vs[1]) * quer[None, :] + s_[:, None] * ri[None, :]
                p[:, 2] = h + vs[2]
                return p

            for _ in range(int(rng.integers(*g.get('rufe', [2, 5])))):
                e = _wahl(rng, ev)
                rendere_quelle(kx, spur, bus, _variante(rng, e['sig'], 0.5), z['t'] + rng.uniform(-0.5, 0.5) * L / v, ort, True,
                               g.get('bezug_m', 30.0) * 10 ** (rng.normal(0, 2) / 20), g.get('hall', 0.0))
        liste.append(z['t'])
    return dict(zuege=liste)


GENERATOREN = dict(bett=gen_bett, ereignisse=gen_ereignisse, schwarm=gen_schwarm, ueberflug=gen_ueberflug,
                   rumpf=gen_rumpf, knarzen=gen_knarzen, segel=gen_segel,
                   vorbeigang=gen_vorbeigang, besuch=gen_besuch, musik=gen_musik, gebruell=gen_gebruell, zug=gen_zug)


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


def probe_fenster(x, dauer_s, raster_s=0.5):
    """Start (s) des Hörproben-Fensters: dort, wo die Gruppe am meisten zu hören ist – die meisten
    Abschnitte, die höchstens 20 dB unter ihren lautesten liegen; bei Gleichstand der lautere.
    Eine fest eingestellte Stelle trifft bei langen Szenen mit seltenen Ereignissen oft nichts."""
    r = int(raster_s * FS)
    n = x.shape[1] // r
    e = 10 * np.log10((x[:, :n * r].astype(np.float64) ** 2).mean(0).reshape(n, r).mean(1) + 1e-14)
    aktiv = (e > np.percentile(e, 99.5) - 20).astype(float)
    L = max(1, int(round(dauer_s / raster_s)))
    k = np.ones(L)
    # kreisförmig, die Szene ist eine Schleife; Punkte für Aktivität, Zehntel für den Pegel
    def kreis(v):
        return np.real(np.fft.ifft(np.fft.fft(v) * np.conj(np.fft.fft(np.r_[k, np.zeros(n - L)]))))
    a_w = kreis(aktiv)
    beste = np.flatnonzero(a_w > a_w.max() - 0.5)
    # unter den gleich guten Fenstern das mit dem meisten Pegel; liegen mehrere gleichauf, das mittlere
    # (die Ereignisse sitzen dann nicht am Rand der Probe)
    p_w = kreis(np.maximum(e + 80, 0))[beste]
    beste = beste[p_w >= p_w.max() - 0.5 * L]
    i = int(beste[len(beste) // 2])
    return float(i * raster_s), float(a_w[i] / L)


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
    ap.add_argument('--stereo', action='store_true', help='Vergleichsfassung in konventionellem Stereo (ohne HRTF und Spiegelungen)')
    ap.add_argument('--name', help='Name der Ausgabe (Vorgabe: Name der Szene)')
    ap.add_argument('--export', action='store_true', help='zusätzlich <name>_export.wav (16 Bit, mit Ein- und Ausblendung) zum Veröffentlichen, z. B. auf Spotify')
    ap.add_argument('--lufs', type=float, help='Ziel-Lautheit der Mischung (überschreibt die Szene)')
    ap.add_argument('--ohne', default='', help='Wirkungen abschalten (für Vergleiche, gleiche Ereignisfolge): breite,richtwirkung,nahfeld,streuung,kette')
    ap.add_argument('--karte', action='store_true', help='nur das Ereignisprotokoll (Szenenkarte) schreiben, ohne Audio – gleiche Ereignisse wie beim Rendern')
    ap.add_argument('--drehung', type=float, help='Startpunkt der Schleife in Abtastwerten vorgeben (start_abtastwerte aus dem Bericht der Bezugsfassung; gerundete Sekunden verschieben um Millisekunden)')
    a = ap.parse_args()

    sz = json.loads(Path(a.szene).read_text())
    if a.lufs is not None:
        sz['ziel_lufs'] = a.lufs
    dauer = a.dauer or sz.get('dauer', 180)
    if a.blick is not None:
        sz[next(k for k in ('wald', 'ruine', 'ozean', 'kuppel', 'boot') if k in sz)]['blick'] = a.blick
    t_start = time.time()
    hrtf = HRTF(a.hrtf, FS)
    hrtf.stereo = a.stereo
    if 'wald' in sz:
        from wald import Wald
        umg_cfg = sz['wald']
        boot = Wald(umg_cfg, dauer, sz.get('saat', 1))
    elif 'ruine' in sz:
        from ruine import Ruine
        umg_cfg = sz['ruine']
        boot = Ruine(umg_cfg, dauer, sz.get('saat', 1))
    elif 'ozean' in sz:
        from ozean import Ozean
        umg_cfg = sz['ozean']
        boot = Ozean(umg_cfg, dauer, sz.get('saat', 1))
    elif 'kuppel' in sz:
        from kuppel import Kuppel
        umg_cfg = sz['kuppel']
        boot = Kuppel(umg_cfg, dauer, sz.get('saat', 1))
    else:
        umg_cfg = sz['boot']
        boot = Boot(umg_cfg, dauer, sz.get('saat', 1))
    bib = Bibliothek(json.loads((WURZEL / 'quellen.json').read_text()))
    nur = set(filter(None, a.nur.split(',')))
    hall_ir = diffuser_nachhall(hrtf, **sz.get('nachhall', {}))
    weite_ir = diffuser_nachhall(hrtf, **sz['weite']['nachhall']) if sz.get('weite') else None
    kurven = baue_kurven(sz, dauer)
    boe = boeenkurve(np.random.default_rng(sz.get('saat', 1) * 7 + 3), dauer, sz.get('boeen', {}), kurven.get('wind'))
    name = a.name or sz['name']
    bericht = dict(szene=name, stand=datetime.now(ZoneInfo('Europe/Berlin')).strftime('%d.%m.%Y %H:%M'), dauer=dauer, schleife=True, abtastwerte=int(round(dauer * FS)),
                   hrtf=Path(a.hrtf).name, blick=umg_cfg.get('blick', 55), titel=sz.get('titel', name), text=sz.get('text', ''), gruppen=[],
                   drehbuch=sz.get('drehbuch', {}).get('text', []))
    summe = np.zeros((2, int(round(dauer * FS))), np.float32)
    karte = []
    ohne = set(filter(None, a.ohne.split(',')))

    def kontext(i, g):
        kx = Kontext(hrtf, boot, bib, dauer, np.random.default_rng(sz.get('saat', 1) * 1000 + i), boe)
        kx.kurven, kx.g, kx.gruppe, kx.ohne = kurven, g, g['name'], ohne
        kx.weite, kx.flimmern, kx.windtragen = sz.get('weite'), sz.get('flimmern'), sz.get('windtragen')
        _AKT_GRUPPE[0] = g['name']
        return kx

    # Vorlauf ohne Ton: alle Generatoren laufen einmal durch und melden ihre Ereignisse (große Welle,
    # Schlag gegen den Rumpf, Astbruch, Gebrüll). Im eigentlichen Lauf können andere Gruppen darauf
    # reagieren – unabhängig von der Reihenfolge der Gruppen.
    vorab = []
    if 'kette' not in ohne:
        for i, g in enumerate(sz['gruppen']):
            if g['typ'] == 'musik':
                continue
            kx = kontext(i, g)
            kx.karte, kx.nur_karte, kx.melden = [], True, vorab
            GENERATOREN[g['typ']](kx, g, None, None)
        ZAEHLER.clear()
        print('Vorlauf:', len(vorab), 'Meldungen', dict(collections.Counter(m['art'] for m in vorab)), flush=True)
    for i, g in enumerate(sz['gruppen']):
        if nur and g['name'] not in nur:
            continue
        t0 = time.time()
        kx = kontext(i, g)
        kx.gemeldet = vorab
        spur, bus = Spur(dauer), Spur(dauer, 1)
        kx.bus_weite = Spur(dauer, 1) if kx.weite else None
        kx.karte = karte
        kx.nur_karte = a.karte
        info = GENERATOREN[g['typ']](kx, g, spur, bus) or {}
        if a.karte:
            print(g['name'], 'Quellen im Protokoll:', sum(1 for q in karte if q['g'] == g['name']), flush=True)
            continue
        x = spur.x
        if np.abs(bus.x).max() > 0:
            for e in range(2):
                x[e] += kreisfaltung(bus.x[0], hall_ir[e]).astype(np.float32) * 10 ** (sz.get('nachhall_pegel_db', -16) / 20)
        if kx.bus_weite is not None and np.abs(kx.bus_weite.x).max() > 0:
            e_direkt = float((x.astype(np.float64) ** 2).sum())
            e_weite = 0.0
            for e in range(2):
                wz = kreisfaltung(kx.bus_weite.x[0], weite_ir[e]).astype(np.float32) * 10 ** (kx.weite.get('pegel_db', -14) / 20)
                e_weite += float((wz.astype(np.float64) ** 2).sum())
                x[e] += wz
            info['weitenhall_db'] = round(float(10 * np.log10(e_weite / max(e_direkt, 1e-20) + 1e-20)), 1)     # Hallenergie relativ zum Rest der Gruppe
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
            ab, anteil = probe_fenster(x, g.get('probe_dauer', 30)) if 'probe_ab' not in g else (g['probe_ab'], None)
            probe = schleifenstueck(x, ab, g.get('probe_dauer', 30))
            eintrag['probe_ab_s'] = ab                # Szenenzeit; nach dem Verschieben der Schleife in Dateizeit umgerechnet
            if anteil is not None:
                eintrag['probe_aktiv'] = round(anteil, 2)
            probe, _ = begrenzer_kreis(probe * 10 ** (g.get('probe_plus_db', 6) / 20))
            schreibe(Path(a.aus) / f"{name}_{g['name']}.mp3", probe, '160k')
            eintrag['probe_abtastwerte'] = int(probe.shape[1])
    def wiederholung():
        """Je Gruppe: wie viele Ereignisse, wie viele verschiedene Ausschnitte, wie oft der häufigste."""
        return {n: dict(ereignisse=int(sum(z.values())), verschiedene=len(z), haeufigster=int(max(z.values())))
                for n, z in ZAEHLER.items() if z}

    def schreibe_karte(start_s):
        """Szenenkarte: alle Quellen mit Ort über die Zeit im Hörerbezug (maschinenlesbar, für die
        Plausibilitätsprüfung `pruefe_karte.py` und die Ansicht `karte/`)."""
        k = dict(szene=name, titel=sz.get('titel', name), dauer=dauer, start_s=round(start_s, 3), kopf=np.round(boot.kopf, 2).tolist(),
                 blick=umg_cfg.get('blick', 55), umgebung=next((x for x in ('wald', 'ruine', 'ozean', 'kuppel', 'boot') if x in sz), 'boot'),
                 orte=sz.get('orte', {}), drehbuch=sz.get('drehbuch', {}).get('text', []),
                 gruppen=[dict(name=g['name'], titel=g.get('titel', g['name']), typ=g['typ'], ziel_lufs=g.get('ziel_lufs'),
                               pegel_art=g.get('pegel_art', 'integriert')) for g in sz['gruppen']],
                 wiederholung=wiederholung(), meldungen=vorab, quellen=karte)
        (Path(a.aus) / f'{name}_karte.json').write_text(json.dumps(k, ensure_ascii=False, separators=(',', ':')))
        print('Karte:', len(karte), 'Quellen', flush=True)

    if a.karte:
        alt = Path(a.aus) / f'{name}.json'
        start = json.loads(alt.read_text()).get('start_abtastwerte', 0) / FS if alt.exists() else 0.0
        schreibe_karte(start)
        return
    if not nur:
        ist = lautheit(summe)
        summe *= 10 ** ((sz.get('ziel_lufs', -21) - ist) / 20)
        summe, weg = begrenzer_kreis(summe, -1.0)
        # Die Schleife hat keinen Anfang – also dort beginnen, wo es am ruhigsten ist: Mitte des
        # leisesten 4-s-Fensters. So startet die Datei nicht mit einem Ereignis, und die Naht
        # liegt in einem ruhigen Moment.
        e = (summe.astype(np.float64) ** 2).mean(0)
        k = np.ones(4 * FS) / (4 * FS)
        glatt = np.real(np.fft.ifft(np.fft.fft(e) * np.fft.fft(np.r_[k, np.zeros(len(e) - len(k))])))   # kreisförmig
        ruhig = (int(np.argmin(glatt)) - 2 * FS) % len(e)        # glatt[i] mittelt e[i-4s+1 .. i]
        # innerhalb von ±1,5 s die Stelle, an der sich der Pegel am wenigsten ändert (kein Einsatz an der Naht)
        w = int(0.1 * FS)
        kum = np.concatenate([[0], np.cumsum(np.r_[e[-w:], e, e[:w]])])
        def pegel(i, a, b):
            return 10 * np.log10((kum[i + w + b] - kum[i + w + a]) / (b - a) + 1e-14)
        kand = (ruhig + np.arange(-int(1.5 * FS), int(1.5 * FS), int(0.01 * FS))) % len(e)
        ruhig = int(min(kand, key=lambda i: abs(pegel(i, -w, 0) - pegel(i, 0, w)) + 0.2 * (pegel(i, -w, w) - 10 * np.log10(glatt.min() + 1e-14))))
        if a.drehung is not None:
            ruhig = int(round(a.drehung)) % len(e)
        summe = np.roll(summe, -ruhig, axis=1)
        bericht['start_verschoben_s'] = round(ruhig / FS, 2)
        bericht['start_abtastwerte'] = int(ruhig)          # genau – für Vergleichsfassungen (--drehung) diesen Wert nehmen
        # Drehbuch-Zeiten auf die Datei beziehen (die Schleife beginnt bei `ruhig`)
        bericht['drehbuch'] = sorted([[round((tt - ruhig / FS) % dauer, 1), x] for tt, x in bericht['drehbuch']])
        for ge in bericht['gruppen']:
            if 'probe_ab_s' in ge:
                ge['probe_ab_s'] = round((ge['probe_ab_s'] - ruhig / FS) % dauer, 1)
        bericht['begrenzer_max_db'] = round(weg, 1)
        bericht['lufs'] = round(lautheit(summe), 1)
        bericht['naht'] = nahtpruefung(summe)
        bericht['wiederholung'] = wiederholung()
        bericht['ohne'] = sorted(ohne)
        schreibe_karte(ruhig / FS)
        schreibe(Path(a.aus) / f'{name}.mp3', summe, '224k')
        if a.export:
            schreibe(Path(a.aus) / f'{name}_export.wav', blende(summe, 4.0, 8.0))
        bericht['quellen'] = sorted(bib.benutzt)
        (Path(a.aus) / f'{name}.json').write_text(json.dumps(bericht, ensure_ascii=False, indent=1))
    print('fertig in', round(time.time() - t_start), 's', flush=True)


if __name__ == '__main__':
    main()
