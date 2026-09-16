#!/usr/bin/env python3
"""Aus einem Fahrplantag ein Netz: Bahnhoefe, Verbindungen, Spitzenstunde.

Quelle ist `trains.json` aus Chillchamp1/github.io — ein Tag des offenen
DELFI-Fahrplans, Mittwoch 13. Mai 2026, dort schon auf Schienenverkehr
gefiltert und in eine kompakte Form gebracht (siehe build/DATEN.md).

Fuenf Schritte, jeder einzeln nachgezaehlt und ausgegeben:

1. **Busse raus.** Der Quelldatensatz filtert nach GTFS-`route_type`, und
   ein paar Zulieferer melden ihre Regionalbusse als Schiene. Sie sind an
   den Liniennamen zu erkennen, siehe BUS.
2. **Strassenhalte raus.** Uebrig bleiben die Zweisystemwagen des
   Chemnitzer Modells: Eisenbahn ausserhalb, Strassenbahn innerhalb der
   Stadt. Ein Halt, den nur eine Linie mit einem mittleren Haltabstand
   unter ENG_KM bedient und dessen Name kein Bahnhofswort traegt, ist ein
   Strassenhalt. Der Zug haelt dort weiter — nur ist der Halt kein
   Bahnhof, und die Karte zeichnet Bahnhoefe.
3. **Bahnsteige zusammenlegen.** Denselben Bahnhof melden mehrere
   Zulieferer getrennt; ungetrennt kostet ein Umstieg innerhalb von
   Frankfurt Hbf einen Fussweg, den es nicht gibt.
4. **Deutschland abgrenzen.** Gerechnet wird auf dem ganzen Netz samt
   Auslandsbahnhoefen, gezeichnet werden nur die deutschen.
5. **Die Spitzenstunde messen**, nicht setzen.

Ausgabe: `zwischen/stationen.json` und `zwischen/netz.bin`.
"""
import collections, json, math, os, re, statistics, struct, sys

HIER = os.path.dirname(os.path.abspath(__file__))
ZWISCHEN = os.path.join(HIER, "zwischen")
ROH = os.environ.get("ROHDATEN", os.path.join(HIER, "roh", "trains.json"))
GEO = os.environ.get("GEODATEN", os.path.join(HIER, "roh", "germany.json"))

# Linien, die die Quelle als Schiene fuehrt, die aber Bus sind. Vier Muster
# fangen alle 61: die Regionalbusnetze im Oberhavel/Havelland und um
# Crailsheim-Schwaebisch Hall, die Rufbusse um Dillingen und Memmingen, die
# Ulmer Stadtlinien und die Coburger Linie 1408. Alles mit einem
# Produktkuerzel davor bleibt drin: A1-A3 ist die AKN, RS* die Regio-S-Bahn
# und die Regionalstadtbahnen, DRB die Fichtelbergbahn, MBB der Molli, SAB
# die Schwaebische Alb-Bahn, FLX Flixtrain, FEX der Flughafenexpress, THA
# Thalys, ECM ein EuroCity, Os/L7/NRE/NRB/P grenzueberschreitende Zuege.
BUS = re.compile(r"""^(?:
      R\d            # R8, R10 ... R90 — Raumbus Hohenlohe und Limes
    | \d{3,4}$       # 338, 604, 801 ... 1408 — Nummernlinien im Nahbereich
    | \d{2,4}\s?R$   # 97 R, 101 R, 819R, 966R — Rufbusse
    | MS\d           # MS9, MS14 — Ulmer Stadtlinien
    )""", re.X)

# Ein Bahnhofswort im Namen. Mit ihm bleibt ein Halt ein Bahnhof, auch wenn
# ihn nur eine engstehende Linie bedient.
BAHNWORT = re.compile(r"(bahnhof|bahnhf|bhf|hbf|\bbf\b|\bhp\b|haltepunkt"
                      r"|\bstation\b|gare|stazione)", re.I)

ENG_KM = 1.3        # mittlerer Haltabstand, unter dem eine Linie Strassenbahn ist
MERGE_M = 200.0     # Bahnsteige desselben Bahnhofs
MERGE_NAME_M = 900.0  # gleicher Name, weiter auseinander gemeldet
# Saum um die vereinfachte Landesgrenze. Er ist noetig, weil die Grenze aus
# 2.100 Punkten besteht und deshalb um ein paar hundert Meter neben der
# wirklichen liegt; ohne ihn fallen Kehl, Gronau, Warnemuende und der
# Friedrichshafener Stadtbahnhof aus Deutschland heraus. Er ist aber
# **klein**, und das ist eine Abwaegung mit einer nachgezaehlten Antwort: bei
# 2,5 km holt er 82 Bahnhoefe herein, von denen 37 im Ausland liegen — Gubin,
# Zgorzelec, Schaerding, Kreuzlingen, Kufstein, Salzburg Taxham. Die stehen
# dann als schlecht erreichbare Gipfel auf einer Karte von Deutschland, und
# schlecht erreichbar sind sie nur, weil dieser Datensatz ihre eigenen
# Landesfahrplaene nicht kennt. Bei 0,6 km sind es 32, davon 8 im Ausland,
# und der Preis sind ein paar deutsche Bahnhoefe knapp jenseits der
# vereinfachten Linie: Lindau-Insel, Herten und Rheinfelden (Baden).
SAUM_KM = 0.6


def meter(a, b):
    la = math.radians((a[1] + b[1]) / 2)
    return math.hypot((b[0] - a[0]) * math.cos(la) * 111319.49,
                      (b[1] - a[1]) * 110574.0)


def normname(s):
    s = s.lower()
    s = re.sub(r"\((oben|unten|tief|hoch)\)", " ", s)
    s = re.sub(r"^(s\+u|s|u)\s+", " ", s)
    s = re.sub(r"(hauptbahnhof|hbf|bahnhof|bhf|\bbf\b|\bhp\b|haltepunkt)", " bf ", s)
    s = re.sub(r"[^a-z0-9äöüß]+", " ", s)
    return " ".join(s.split())


# --------------------------------------------------------- Punkt im Land
def ringe_laden(pfad):
    """Die sechzehn Laender, nicht der Aussenumriss: derselbe Datensatz
    fuehrt beide, und die Laendergrenzen sind mit 2100 Punkten fuenfmal so
    fein aufgeloest wie der Umriss mit 428. Zusammen kacheln sie das Land,
    ein Punkt liegt also in genau einem Ring — oder in keinem."""
    g = json.load(open(pfad))
    return g, [[tuple(p) for p in r] for r in g["states"]]


def drin(ringe, x, y):
    for ring in ringe:
        c, n, j = False, len(ring), len(ring) - 1
        for i in range(n):
            xi, yi = ring[i]
            xj, yj = ring[j]
            if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
                c = not c
            j = i
        if c:
            return True
    return False


def grenzabstand(ringe, x, y):
    """Kilometer zum naechsten Punkt der Landesgrenze."""
    cl, best = math.cos(math.radians(y)) * 111.32, 1e9
    for ring in ringe:
        n = len(ring)
        for i in range(n):
            x1, y1 = ring[i]
            x2, y2 = ring[(i + 1) % n]
            ax, ay = (x1 - x) * cl, (y1 - y) * 111.32
            bx, by = (x2 - x) * cl, (y2 - y) * 111.32
            dx, dy = bx - ax, by - ay
            L = dx * dx + dy * dy
            t = 0.0 if L == 0 else max(0.0, min(1.0, -(ax * dx + ay * dy) / L))
            d = math.hypot(ax + t * dx, ay + t * dy)
            if d < best:
                best = d
    return best


def main():
    if not os.path.exists(ROH):
        sys.exit("Rohdaten fehlen: %s — siehe build/DATEN.md" % ROH)
    os.makedirs(ZWISCHEN, exist_ok=True)
    d = json.load(open(ROH))
    st, tr, cls = d["stations"], d["trips"], d["classes"]
    print("Quelle %s, %s %s: %d Meldepunkte, %d Fahrten"
          % (d["source"], d["weekday"], d["date"], len(st), len(tr)))

    # ------------------------------------------------------------- 1. Busse
    bahn, buslinien, busfahrten = [], collections.Counter(), 0
    for t in tr:
        if BUS.match(t["n"]):
            busfahrten += 1
            buslinien[t["n"]] += 1
        else:
            bahn.append(t)
    print("1. verworfen: %d Fahrten auf %d Buslinien — %d Bahnfahrten bleiben"
          % (busfahrten, len(buslinien), len(bahn)))

    # ------------------------------------------------------ 2. Strassenhalte
    absts = collections.defaultdict(list)
    for t in bahn:
        s = t["s"]
        if len(s) < 2:
            continue
        absts[t["n"]].append(statistics.median(
            meter(st[s[i][0]], st[s[i + 1][0]]) / 1000 for i in range(len(s) - 1)))
    abstand = {n: statistics.median(v) for n, v in absts.items()}
    eng = {n for n, a in abstand.items() if a < ENG_KM}
    nur_eng = {}
    for t in bahn:
        e = t["n"] in eng
        for si, a, dp in t["s"]:
            nur_eng[si] = nur_eng.get(si, True) and e
    strasse = {si for si, e in nur_eng.items()
               if e and not BAHNWORT.search(st[si][2])}
    print("2. engstehende Linien (< %.1f km Haltabstand): %s"
          % (ENG_KM, ", ".join("%s (%.2f km)" % (n, abstand[n])
                               for n in sorted(eng, key=lambda n: abstand[n]))))
    print("   verworfen: %d Strassenhalte; die Zuege halten dort weiter"
          % len(strasse))
    gekuerzt = []
    for t in bahn:
        s = [e for e in t["s"] if e[0] not in strasse]
        if len(s) >= 2:
            t = dict(t)
            t["s"] = s
            gekuerzt.append(t)
    bahn = gekuerzt
    print("   %d Fahrten mit mindestens zwei Bahnhalten bleiben" % len(bahn))

    # ------------------------------------------------------- 3. Bahnsteige
    halte = collections.Counter()
    for t in bahn:
        for si, a, dp in t["s"]:
            halte[si] += 1
    benutzt = sorted(halte)
    print("3. bediente Meldepunkte: %d" % len(benutzt))

    eltern = list(range(len(st)))

    def find(i):
        while eltern[i] != i:
            eltern[i] = eltern[eltern[i]]
            i = eltern[i]
        return i

    def union(i, j):
        i, j = find(i), find(j)
        if i != j:
            eltern[max(i, j)] = min(i, j)

    zelle = 0.004
    gitter = collections.defaultdict(list)
    for i in benutzt:
        gitter[(int(st[i][0] / zelle), int(st[i][1] / zelle))].append(i)
    for (cx, cy), gruppe in list(gitter.items()):
        umfeld = [k for dx in (-1, 0, 1) for dy in (-1, 0, 1)
                  for k in gitter.get((cx + dx, cy + dy), ())]
        for i in gruppe:
            for j in umfeld:
                if j > i and meter(st[i], st[j]) <= MERGE_M:
                    union(i, j)
    nach_name = collections.defaultdict(list)
    for i in benutzt:
        nach_name[normname(st[i][2])].append(i)
    for name, gruppe in nach_name.items():
        if not name or len(gruppe) < 2:
            continue
        for a in range(len(gruppe)):
            for b in range(a + 1, len(gruppe)):
                if meter(st[gruppe[a]], st[gruppe[b]]) <= MERGE_NAME_M:
                    union(gruppe[a], gruppe[b])

    gruppen = collections.defaultdict(list)
    for i in benutzt:
        gruppen[find(i)].append(i)
    bahnhof, karte, weit = [], {}, 0.0
    for wurzel in sorted(gruppen):
        gruppe = gruppen[wurzel]
        lon = sum(st[i][0] for i in gruppe) / len(gruppe)
        lat = sum(st[i][1] for i in gruppe) / len(gruppe)
        weit = max([weit] + [meter(st[i], (lon, lat)) for i in gruppe])
        name = max(gruppe, key=lambda i: (halte[i], -i))
        k = len(bahnhof)
        bahnhof.append(dict(lon=round(lon, 5), lat=round(lat, 5),
                            name=st[name][2],
                            halte=sum(halte[i] for i in gruppe),
                            teile=len(gruppe)))
        for i in gruppe:
            karte[i] = k
    print("   zusammengelegt auf %d Bahnhoefe; weiteste Meldung %.0f m von ihrem"
          % (len(bahnhof), weit))

    # ----------------------------------------------------- 4. Deutschland
    g, ringe = ringe_laden(GEO)
    innen = randnah = 0
    for b in bahnhof:
        i = drin(ringe, b["lon"], b["lat"])
        b["de"] = 1 if i else 0
        if i:
            innen += 1
        elif grenzabstand(ringe, b["lon"], b["lat"]) <= SAUM_KM:
            b["de"] = 1
            randnah += 1
    print("4. in Deutschland: %d, plus %d im %.1f-km-Saum um die vereinfachte "
          "Grenze (ohne ihn fehlen Kehl, Gronau, Warnemuende), Ausland: %d"
          % (innen, randnah, SAUM_KM, sum(1 - b["de"] for b in bahnhof)))

    # ------------------------------------------- 5. Verbindungen, Spitzenstunde
    verb, kl, maxmin, verloren = [], [], 0, 0
    for fi, t in enumerate(bahn):
        s = t["s"]
        kl.append(t["c"])
        for i in range(len(s) - 1):
            a, b = karte[s[i][0]], karte[s[i + 1][0]]
            ab, an = s[i][2], s[i + 1][1]
            if a == b or an < ab:
                verloren += 1
                continue
            verb.append((ab, an, a, b, fi))
            maxmin = max(maxmin, an)
    verb.sort()
    print("5. Verbindungen: %d (%d Abschnitte ohne Ortswechsel verworfen), "
          "letzte Ankunft Minute %d" % (len(verb), verloren, maxmin))

    abfahrt = [0] * (maxmin + 2)
    unterwegs = [0] * (maxmin + 2)
    for ab, an, a, b, fi in verb:
        abfahrt[ab] += 1
        for m in range(ab, min(an, maxmin) + 1):
            unterwegs[m] += 1

    def fenster(v, w=60):
        s = sum(v[:w])
        best = (0, s)
        for i in range(1, len(v) - w):
            s += v[i + w - 1] - v[i - 1]
            if s > best[1]:
                best = (i, s)
        return best

    fa, na = fenster(abfahrt)
    fu, nu = fenster(unterwegs)
    hhmm = lambda m: "%02d:%02d" % (m // 60 % 24, m % 60)
    print("   dichteste Stunde nach Abfahrten:       %s-%s (%d Abfahrten)"
          % (hhmm(fa), hhmm(fa + 60), na))
    print("   dichteste Stunde nach Zuegen unterwegs: %s-%s (%.0f Zuege im Mittel)"
          % (hhmm(fu), hhmm(fu + 60), nu / 60))

    with open(os.path.join(ZWISCHEN, "netz.bin"), "wb") as f:
        f.write(struct.pack("<4sIIII", b"ZKN1", len(bahnhof), len(bahn),
                            len(verb), fa))
        for ab, an, a, b, fi in verb:
            f.write(struct.pack("<HHIII", ab, an, a, b, fi))
    json.dump(dict(
        quelle=d["source"], datum=d["date"], wochentag=d["weekday"],
        note=d.get("note", ""), klassen=cls, klasse_je_fahrt=kl,
        spitze_abfahrten=[fa, na], spitze_unterwegs=[fu, nu],
        abfahrten_je_minute=abfahrt, unterwegs_je_minute=unterwegs,
        busfahrten=busfahrten, buslinien=sorted(buslinien),
        engelinien={n: round(abstand[n], 2) for n in sorted(eng)},
        strassenhalte=len(strasse), meldungen=len(benutzt), maxmin=maxmin,
        fahrten=len(bahn), verbindungen=len(verb), stationen=bahnhof,
    ), open(os.path.join(ZWISCHEN, "stationen.json"), "w"), ensure_ascii=False)
    print("geschrieben: zwischen/netz.bin, zwischen/stationen.json")


if __name__ == "__main__":
    main()
