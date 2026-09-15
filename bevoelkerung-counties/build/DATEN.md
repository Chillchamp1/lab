# Rohdaten

Die Skripte laden nichts herunter. Diese vier Dateien müssen in `build/roh/`
liegen, sonst bricht der Bau ab. Das ist hier nicht Bequemlichkeit, sondern
Zwang: aus der Arbeitsumgebung dieses Repos beantwortet der Netzfilter jede
Verbindung zu `www2.census.gov`, `data2.nhgis.org` und `data.nber.org` mit 403.
Erreichbar ist nur GitHub und die npm-Registry — und über die kommt, wie sich
zeigte, die Geometrie.

| Datei | Quelle |
|---|---|
| `counties-10m.json` | Paket `us-atlas` 3.0.1 von der npm-Registry (`npm pack us-atlas`), Datei `counties-10m.json`. TopoJSON der kartografischen Grenzdateien des US Census Bureau, generalisiert auf 1:10 000 000, unprojiziert in Länge und Breite. ISC-Lizenz; die zugrunde liegenden Census-Dateien sind gemeinfrei. |
| `nhgis0001_ts_nominal_county.csv` | IPUMS NHGIS, Zeitreihentabelle **A00 „Total Population"**, nominal integriert, County-Ebene, 1790–2020. Aus dem Data Finder auf `data2.nhgis.org`, Reiter *Time Series Tables*, Format *Comma delimited*, Layout *Time varies by row*. Kostenloses Konto nötig. |
| `nhgis0001_ts_nominal_state.csv` | dieselbe Tabelle auf Staatsebene, als Gegenprobe |
| `cencounts.csv` | NBER, `data.nber.org/census/population/cencounts/cencounts.csv`. Richard L. Forstalls „Population of Counties by Decennial Census: 1900 to 1990", vom NBER aus der Textvorlage in CSV gegossen. Kein Konto nötig. |

Der Auszug enthält zusätzlich die Tabelle **CL8** auf Gebietsstand 2010. Sie
wird für die Karte nicht gebraucht, aber für die Prüfung: sie deckt 1990 bis
2020 auf einheitlichem Gebietsstand ab und ist damit die einzige Stelle, an der
sich die nominale Integration gegen eine bekannt richtige Antwort halten lässt.
Der Prüfbericht liegt in `bevoelkerung-kreise/build/pruefung/usa/`.

## Bauen

Aus `build/`:

    node quellen.mjs                       # erzeugt ../data/…csv und stammdaten.json
    KNOTEN=24000 GITTER=900 node build.mjs > ../index.html

Der zweite Schritt rechnet dreizehn Kartogramme und braucht auf dieser Maschine
rund zehn Minuten. Der Zwischenspeicher `zeitreihe-alle.json` trägt die
Bauparameter als Schlüssel — **und ein Bau mit anderen Parametern überschreibt
ihn.** Wer einmal ohne `KNOTEN=24000` baut, bekommt danach eine gröbere Seite
und zahlt den nächsten richtigen Bau noch einmal.

Mit `CACHE=probe` legt der Bau seinen Zwischenspeicher unter eigenem Namen ab;
damit lässt sich ein schneller Probelauf fahren, ohne den guten Stand zu
verlieren.
