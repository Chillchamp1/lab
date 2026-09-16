#!/usr/bin/env python3
"""Aus den Zwischenergebnissen die Nutzlast der Seite.

Alles, was die Karte braucht, in eine Datei: die Bahnhoefe mit ihren drei
Lagen (Geografie, flache Federkarte, Gelaendekarte) und ihrer Hoehe, der
Umriss samt Laendergrenzen in derselben Projektion, die Kennzahlen und eine
Handvoll Namen von Hand nachgezogen — der Fahrplandatensatz nennt Stuttgart
Hbf "Hauptbahnhof (oben)", und so kann es nicht auf der Karte stehen.

Zahlen gehen als base64-verpackte Int16-Felder hinein, nicht als JSON-Text:
das ist ein Drittel der Groesse und spart dem Browser das Parsen von
vierzigtausend Zahlen.
"""
import base64, json, math, os, struct, sys, warnings
import numpy as np

HIER = os.path.dirname(os.path.abspath(__file__))
Z = os.path.join(HIER, "zwischen")
AUS = os.path.join(os.path.dirname(HIER), "data")
ERDE = 6371.0088

# Der Fahrplan benennt Bahnhoefe so, wie der jeweilige Zulieferer sie fuehrt.
# Fuer die beschrifteten Orte wird das hier zurechtgezogen; alles andere
# bleibt, wie die Quelle es schreibt.
NAMEN = {
    "Hauptbahnhof (oben)": "Stuttgart Hbf",
    "S+U Berlin Hauptbahnhof": "Berlin Hbf",
    "S Südkreuz Bhf (Berlin)": "Berlin Südkreuz",
    "S+U Gesundbrunnen Bhf (Berlin)": "Berlin Gesundbrunnen",
    "S Ostbahnhof (Berlin)": "Berlin Ostbahnhof",
    "S+U Zoologischer Garten Bhf (Berlin)": "Berlin Zoo",
    "S Potsdam Hauptbahnhof": "Potsdam Hbf",
    "S Oranienburg Bhf": "Oranienburg",
    "Ostbahnhof": "München Ost",
    "Braunschweig, Hauptbahnhof": "Braunschweig Hbf",
    "Aachen, Hbf": "Aachen Hbf",
    "Kaiserslautern, Hbf": "Kaiserslautern Hbf",
    "Chemnitz, Hauptbahnhof": "Chemnitz Hbf",
    "Zwickau, Hauptbahnhof": "Zwickau Hbf",
    "Trier, Hauptbahnhof": "Trier Hbf",
    "Hamm (Westf), Hauptbahnhof": "Hamm (Westf) Hbf",
    "Paderborn, Hauptbahnhof": "Paderborn Hbf",
    "Emden(Ostfriesl) Hbf": "Emden Hbf",
    "Westerland(Sylt) ZOB/Bahnhof": "Westerland (Sylt)",
    "Gießen Bahnhof": "Gießen",
    "Kassel Bahnhof Wilhelmshöhe": "Kassel-Wilhelmshöhe",
    "Friedberg (Hessen) Bahnhof": "Friedberg (Hessen)",
    "Görlitz Bahnhof": "Görlitz",
    "Freiburg Hauptbahnhof": "Freiburg (Brsg) Hbf",
    "Hannover Hauptbahnhof": "Hannover Hbf",
    "Münster Hauptbahnhof": "Münster (Westf) Hbf",
    "Frankfurt (Main) Hauptbahnhof": "Frankfurt (Main) Hbf",
    "Rostock Hauptbahnhof": "Rostock Hbf",
    "Schwerin Hauptbahnhof": "Schwerin Hbf",
    "Magdeburg Hbf": "Magdeburg Hbf",
    "Tübingen Hauptbahnhof": "Tübingen Hbf",
    "Koblenz Hauptbahnhof": "Koblenz Hbf",
    "Ulm Hauptbahnhof": "Ulm Hbf",
    "Karlsruhe Hauptbahnhof": "Karlsruhe Hbf",
    "Rosenheim Bahnhof": "Rosenheim",
    "Oldenburg (Oldb) Hbf": "Oldenburg (Oldb)",
    "Stralsund Hbf": "Stralsund Hbf",
    "Flensburg": "Flensburg",
    "Pirmasens, Hauptbahnhof": "Pirmasens Hbf",
    "Herford, Bahnhof/ZOB": "Herford",
    "Stolberg, Hbf": "Stolberg (Rheinl) Hbf",
    "Limburg (Lahn) Bahnhof": "Limburg (Lahn)",
    "Friedrichsh. Stadtbahnhof": "Friedrichshafen Stadt",
    "Radolfzell Bahnhof": "Radolfzell",
    "Konstanz Bahnhof": "Konstanz",
    "Offenburg Bahnhof": "Offenburg",
    "Zittau Bahnhof": "Zittau",
    "Heidenau Bahnhof": "Heidenau",
    "Bad Kleinen Bahnhof": "Bad Kleinen",
    "Hagenow Land Bahnhof": "Hagenow Land",
    "Parchim Bahnhof": "Parchim",
    "Neubrücke, Bahnhof": "Neubrücke (Nahe)",
    "Sigmaringen Bahnhof": "Sigmaringen",
    "Gammertingen Bahnhof": "Gammertingen",
    "Miltenberg": "Miltenberg",
    "Kressbronn Bahnhof": "Kressbronn",
    "Königstein (Taunus) Bahnhof": "Königstein (Taunus)",
    "Friedrichsdorf Bahnhof": "Friedrichsdorf",
    "Bodenburg/Bahnhof": "Bodenburg",
    "Hildesheim Hauptbahnhof": "Hildesheim Hbf",
    "Tessin, Bahnhof": "Tessin",
    "Selb-Plößberg": "Selb-Plößberg",
    "Aue, Bahnhof": "Aue (Sachs)",
    "Stollberg, Bahnhof": "Stollberg (Sachs)",
}


# Beschriftet werden Orte, nicht Bahnhofsnamen. Der Fahrplan kennt
# "Pasing" und "Oberkotzau" mit vielen Halten und Karlsruhe mit wenigen; was
# auf einer Karte stehen soll, sind die Staedte. Zu jedem Ort wird der
# Bahnhof gesucht, der ihm am naechsten liegt und dort am meisten haelt —
# nach Koordinate, nicht nach Namen, weil jedes Bundesland seine Bahnhoefe
# anders schreibt. Die Reihenfolge ist die Rangfolge: wer zuerst steht, wird
# zuerst gezeichnet, wenn der Platz knapp wird.
ORTE = [
    ("Berlin", 13.369, 52.525), ("Hamburg", 10.007, 53.553),
    ("München", 11.558, 48.140), ("Köln", 6.959, 50.943),
    ("Frankfurt (Main)", 8.663, 50.107), ("Stuttgart", 9.182, 48.784),
    ("Düsseldorf", 6.794, 51.220), ("Leipzig", 12.382, 51.345),
    ("Dortmund", 7.459, 51.518), ("Essen", 7.014, 51.451),
    ("Bremen", 8.814, 53.083), ("Dresden", 13.733, 51.040),
    ("Hannover", 9.741, 52.377), ("Nürnberg", 11.083, 49.446),
    ("Duisburg", 6.775, 51.430), ("Bochum", 7.223, 51.478),
    ("Wuppertal", 7.149, 51.255), ("Bielefeld", 8.532, 52.029),
    ("Bonn", 7.097, 50.732), ("Münster", 7.636, 51.957),
    ("Karlsruhe", 8.401, 48.993), ("Mannheim", 8.469, 49.479),
    ("Augsburg", 10.886, 48.365), ("Wiesbaden", 8.244, 50.071),
    ("Mönchengladbach", 6.446, 51.196), ("Gelsenkirchen", 7.103, 51.505),
    ("Braunschweig", 10.540, 52.252), ("Kiel", 10.132, 54.315),
    ("Aachen", 6.092, 50.768), ("Chemnitz", 12.930, 50.840),
    ("Halle (Saale)", 11.988, 51.478), ("Magdeburg", 11.627, 52.130),
    ("Freiburg", 7.841, 47.997), ("Krefeld", 6.573, 51.334),
    ("Mainz", 8.259, 50.001), ("Lübeck", 10.670, 53.867),
    ("Erfurt", 11.038, 50.973), ("Rostock", 12.131, 54.078),
    ("Kassel", 9.447, 51.313), ("Hagen", 7.461, 51.363),
    ("Saarbrücken", 6.991, 49.241), ("Potsdam", 13.067, 52.392),
    ("Oldenburg", 8.218, 53.144), ("Osnabrück", 8.061, 52.273),
    ("Heidelberg", 8.670, 49.404), ("Darmstadt", 8.629, 49.873),
    ("Regensburg", 12.100, 49.012), ("Paderborn", 8.789, 51.719),
    ("Ingolstadt", 11.437, 48.744), ("Würzburg", 9.936, 49.802),
    ("Wolfsburg", 10.787, 52.429), ("Ulm", 9.983, 48.399),
    ("Heilbronn", 9.204, 49.147), ("Göttingen", 9.926, 51.537),
    ("Trier", 6.647, 49.755), ("Bremerhaven", 8.573, 53.553),
    ("Koblenz", 7.589, 50.351), ("Jena", 11.590, 50.925),
    ("Siegen", 8.013, 50.874), ("Hildesheim", 9.951, 52.159),
    ("Cottbus", 14.326, 51.751), ("Kaiserslautern", 7.768, 49.436),
    ("Schwerin", 11.408, 53.635), ("Gera", 12.088, 50.878),
    ("Flensburg", 9.442, 54.777), ("Passau", 13.451, 48.575),
    ("Konstanz", 9.177, 47.658), ("Görlitz", 14.989, 51.146),
    ("Stralsund", 13.087, 54.307), ("Fulda", 9.688, 50.552),
    ("Bayreuth", 11.567, 49.949), ("Landshut", 12.128, 48.545),
    ("Rosenheim", 12.116, 47.851), ("Garmisch-Partenkirchen", 11.100, 47.491),
    ("Westerland (Sylt)", 8.310, 54.906), ("Emden", 7.191, 53.367),
    ("Lindau", 9.685, 47.548), ("Oberstdorf", 10.281, 47.412),
    ("Kempten", 10.318, 47.722), ("Villingen", 8.459, 48.060),
    ("Offenburg", 7.943, 48.474), ("Marburg", 8.774, 50.816),
    ("Gießen", 8.664, 50.580), ("Wilhelmshaven", 8.115, 53.520),
    ("Neubrandenburg", 13.264, 53.559), ("Frankfurt (Oder)", 14.546, 52.342),
    ("Bamberg", 10.895, 49.888), ("Hof", 11.923, 50.308),
    ("Singen", 8.840, 47.760), ("Nordhausen", 10.796, 51.500),
    ("Meiningen", 10.415, 50.567), ("Straubing", 12.573, 48.883),
    ("Schwandorf", 12.107, 49.328), ("Crailsheim", 10.076, 49.135),
    ("Tübingen", 9.055, 48.516), ("Friedrichshafen", 9.480, 47.654),
    ("Neumünster", 9.984, 54.073), ("Uelzen", 10.552, 52.965),
    ("Lüneburg", 10.420, 53.249), ("Wittenberge", 11.756, 52.993),
    ("Halberstadt", 11.062, 51.897), ("Bautzen", 14.428, 51.176),
    ("Zwickau", 12.476, 50.715), ("Plauen", 12.130, 50.500),
    ("Weimar", 11.335, 50.981), ("Eisenach", 10.315, 50.977),
    ("Bad Hersfeld", 9.703, 50.869), ("Limburg", 8.070, 50.386),
    ("Minden", 8.933, 52.290), ("Rheine", 7.437, 52.281),
    ("Cuxhaven", 8.699, 53.868), ("Husum", 9.053, 54.474),
    ("Binz (Rügen)", 13.612, 54.402),
]


def lambert(lon, lat, p1=48.6666667, p2=53.6666667, p0=51.0, l0=10.5):
    r = math.radians
    n = (math.log(math.cos(r(p1)) / math.cos(r(p2)))
         / math.log(math.tan(math.pi / 4 + r(p2) / 2)
                    / math.tan(math.pi / 4 + r(p1) / 2)))
    F = math.cos(r(p1)) * math.tan(math.pi / 4 + r(p1) / 2) ** n / n
    rho = ERDE * F / np.tan(math.pi / 4 + np.radians(lat) / 2) ** n
    rho0 = ERDE * F / math.tan(math.pi / 4 + r(p0) / 2) ** n
    th = n * np.radians(np.asarray(lon, dtype=float) - l0)
    return rho * np.sin(th), rho0 - rho * np.cos(th)


def i16(a, faktor):
    v = np.rint(np.asarray(a, dtype=float) * faktor)
    if v.min() < -32768 or v.max() > 32767:
        sys.exit("Int16 laeuft ueber: %.0f .. %.0f" % (v.min(), v.max()))
    return base64.b64encode(v.astype("<i2").tobytes()).decode()


def main():
    os.makedirs(AUS, exist_ok=True)
    netz = json.load(open(os.path.join(Z, "stationen.json")))
    S = netz["stationen"]
    kern = json.load(open(os.path.join(Z, "kern.json")))
    kd = kern["kern_de"]                      # Bahnhofsnummern im Kern
    raw = open(os.path.join(Z, "lage.bin"), "rb").read()
    assert raw[:4] == b"ZKL1"
    (N,) = struct.unpack("<I", raw[4:8])
    kenn = struct.unpack("<6d", raw[8:56])
    off = 56
    def feld():
        nonlocal off
        a = np.frombuffer(raw, dtype="<f4", count=N, offset=off)
        off += 4 * N
        return np.array(a, dtype=float)
    fx, fy = feld(), feld()
    tx, ty, th_ = feld(), feld(), feld()
    ggx, ggy = feld(), feld()
    assert N == len(kd)

    # Mittelpunkte abziehen, damit alle drei Lagen um null liegen.
    # ggx/ggy bleiben dabei der geografische Bezug in Kilometern; mx/my
    # halten den Nullpunkt fest, damit Umriss und Ortsmarken dazu passen.
    gm = lambert([S[i]["lon"] for i in kd], [S[i]["lat"] for i in kd])
    mx, my = float(gm[0].mean()), float(gm[1].mean())
    for a in (fx, fy, tx, ty, ggx, ggy):
        a -= a.mean()

    name = [NAMEN.get(S[i]["name"], S[i]["name"]) for i in kd]
    halte = np.array([S[i]["halte"] for i in kd])

    # Der Maßstab: wie viele Minuten der Kilometer Luftlinie im Mittel wert
    # ist. Er macht die Geografie mit den beiden Zeitlagen vergleichbar und
    # steht auf der Karte als Maßstabsleiste.
    def massstab(ax, ay):
        return float((ax @ ggx + ay @ ggy) / (ggx @ ggx + ggy @ ggy))
    mkm_t, mkm_f = massstab(tx, ty), massstab(fx, fy)
    print("Maßstab: Gelaende %.4f, flach %.4f Minuten je Kilometer"
          % (mkm_t, mkm_f))

    # Erreichbarkeit: die mittlere Reisezeit von hier zu allen anderen
    # Bahnhoefen des Kerns, hin und zurueck gemittelt. Kein Modell, eine
    # Messung — und die zweite Lesart des Reliefs.
    zraw = open(os.path.join(Z, "zeiten.bin"), "rb").read()
    nz = struct.unpack("<I", zraw[4:8])[0]
    ZM = np.frombuffer(zraw, dtype=np.uint16, offset=12).reshape(nz, nz)
    ki = np.array(kern["kern"])
    sub = ZM[np.ix_(ki, ki)].astype(np.float32)
    sub[sub == 65535] = np.nan
    np.fill_diagonal(sub, np.nan)
    # 1.304 Paare sind in beiden Richtungen unverbunden; fuer die ist das
    # Mittel aus zwei NaN erwartungsgemaess NaN, und numpy warnt darueber.
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", RuntimeWarning)
        mittel = np.nanmean(np.stack([sub, sub.T]), axis=0)
    zugang = np.nanmean(mittel, axis=1)
    roh_min = float(np.nanmin(np.nanmean(mittel, axis=1)))
    roh_max = float(np.nanmax(np.nanmean(mittel, axis=1)))
    zugang = zugang - np.nanmin(zugang)
    print("Erreichbarkeit: %.0f bis %.0f Minuten mittlere Reisezeit, "
          "Spanne %.0f Minuten"
          % (np.nanmin(np.nanmean(mittel, axis=1)),
             np.nanmax(np.nanmean(mittel, axis=1)), zugang.max()))

    # Ortsmarken: der naechste Bahnhof mit den meisten Halten
    marken = []
    for ort, olon, olat in ORTE:
        ox, oy = lambert([olon], [olat])
        ox, oy = float(ox[0]) - mx, float(oy[0]) - my
        nah = [(halte[i], i) for i in range(len(kd))
               if math.hypot(ggx[i] - ox, ggy[i] - oy) <= 13.0]
        if not nah:
            print("   keine Marke fuer %s" % ort)
            continue
        marken.append([int(max(nah)[1]), ort])
    print("Ortsmarken: %d von %d Orten gefunden" % (len(marken), len(ORTE)))

    # Isochronen-Rohstoff: fuer eine Auswahl von Knoten die Reisezeit zu
    # allem. Auf der Zeitkarte muessen daraus Kreise werden — das ist die
    # Probe aufs Ganze, und sie gehoert in die Hand des Lesers.
    ord_ = np.argsort(-halte)
    wahl, MINKM = [], 28.0
    for i in ord_:
        if len(wahl) >= 48:
            break
        if all(math.hypot(ggx[i] - ggx[j], ggy[i] - ggy[j]) > MINKM for j in wahl):
            wahl.append(int(i))
    for gesucht in ("Westerland", "Oberstdorf", "Görlitz", "Emden",
                    "Konstanz", "Zittau"):
        for i in ord_:
            if gesucht in name[i] and i not in wahl:
                wahl.append(int(i))
                break
    Q = np.full((len(wahl), len(kd)), 255, dtype=np.uint8)
    for r, i in enumerate(wahl):
        v = mittel[i]
        gut = np.isfinite(v)
        Q[r, gut] = np.minimum(np.rint(v[gut] / 3.0), 254).astype(np.uint8)
        Q[r, i] = 0
    # Als base64 in einer JSON-Datei, nicht als roher Binärblock: so laesst
    # sich die Seite ueberall ausliefern, wo nur die ueblichen Dateitypen
    # durchkommen, und gezippt kostet die Verpackung fast nichts.
    pz = os.path.join(AUS, "isochronen.json")
    json.dump(dict(knoten=len(wahl), bahnhoefe=len(kd), schritt=3,
                   daten=base64.b64encode(Q.tobytes()).decode()),
              open(pz, "w"), separators=(",", ":"))
    print("geschrieben: %s (%d Knoten x %d Bahnhoefe, %.0f kB)"
          % (pz, len(wahl), len(kd), os.path.getsize(pz) / 1000))

    # Umriss und Laendergrenzen in dieselbe Projektion
    geo = json.load(open(os.path.join(HIER, "roh", "germany.json")))
    def ringe(rs):
        out = []
        for r in rs:
            X, Y = lambert([p[0] for p in r], [p[1] for p in r])
            out.append([i16(X - mx, 10), i16(Y - my, 10)])
        return out

    d = dict(
        quelle=netz["quelle"], datum=netz["datum"], wochentag=netz["wochentag"],
        spitze=netz["spitze_abfahrten"], spitze_unterwegs=netz["spitze_unterwegs"],
        fahrten=netz["fahrten"], verbindungen=netz["verbindungen"],
        bahnhoefe_alle=len(S), bahnhoefe_de=sum(b["de"] for b in S),
        bahnhoefe=N, raus=len(kern["raus"]), raus_namen=kern["raus_namen"],
        strassenhalte=netz["strassenhalte"], busfahrten=netz["busfahrten"],
        buslinien=netz["buslinien"], engelinien=netz["engelinien"],
        ohne_feder=kern["ohne_feder"],
        klassen=netz["klassen"],
        stress=dict(geo=kenn[0], flach=kenn[1], nurhoehe=kenn[2], gelaende=kenn[3]),
        verzerrung=dict(flach=kenn[4], gelaende=kenn[5]),
        proben=12, raster=5, minum=5,
        minprokm=mkm_t, minprokm_flach=mkm_f, isoschritt=3,
        zugang_min=roh_min, zugang_max=roh_max,
        isoknoten=wahl, isodatei="isochronen.json", marken=marken,
        namen=name,
        halte=[int(v) for v in halte],
        geox=i16(ggx, 10), geoy=i16(ggy, 10),
        flachx=i16(fx, 10), flachy=i16(fy, 10),
        zeitx=i16(tx, 10), zeity=i16(ty, 10), hoehe=i16(th_, 10),
        zugang=i16(zugang, 10),
        umriss=ringe(geo["outline"]), laender=ringe(geo["states"]),
    )
    p = os.path.join(AUS, "karte.json")
    json.dump(d, open(p, "w"), ensure_ascii=False, separators=(",", ":"))
    print("geschrieben: %s (%.0f kB)" % (p, os.path.getsize(p) / 1000))
    print("Hoehe: Mittel %.1f, Median %.1f, Max %.0f Minuten"
          % (th_.mean(), np.median(th_), th_.max()))
    print("Stress %.4f -> %.4f -> %.4f -> %.4f | Grundriss %.1f / %.1f km"
          % tuple(kenn))


if __name__ == "__main__":
    main()
