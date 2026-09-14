# Rohdaten der US-Prüfung

Wie überall in diesem Projekt: **die Skripte laden nichts herunter.** Die
Dateien müssen von Hand in `build/roh-usa/` liegen. Der Grund ist hier nicht
Bequemlichkeit, sondern Zwang — aus der Arbeitsumgebung dieses Repos
beantwortet der Netzfilter jede Verbindung zu `www2.census.gov`,
`www.census.gov`, `data2.nhgis.org`, `www.nhgis.org` und `data.nber.org` mit
403 beim CONNECT. Nachgemessen am 14. September 2026, über die Shell und über
`WebFetch`. Erreichbar sind nur `github.com`, `raw.githubusercontent.com`,
`objects.githubusercontent.com` und `registry.npmjs.org`.

## Was da liegt

| Datei | Quelle |
|---|---|
| `nhgis0001_csv.zip` | IPUMS NHGIS, Data Finder auf `data2.nhgis.org`, Reiter *Time Series Tables*. Auszug mit zwei Tabellen auf zwei Ebenen, Format *Comma delimited*, Layout *Time varies by row*. Das Zip bleibt liegen; es enthält die Codebücher mit der Zitierpflicht. |

Entpackt ergibt das acht Dateien, von denen der Prüfer vier liest:

| Datei | Inhalt | Zeilen |
|---|---|---|
| `nhgis0001_ts_nominal_county.csv` | **A00 Total Population**, nominal integriert, 1790–2020, County | 56 088 |
| `nhgis0001_ts_nominal_state.csv` | dasselbe auf Staatsebene | 1 034 |
| `nhgis0001_ts_geog2010_county.csv` | **CL8 Total Population**, Gebietsstand 2010, 1990–2020, County | 12 572 |
| `nhgis0001_ts_geog2010_state.csv` | dasselbe auf Staatsebene | 204 |

Dazu je ein `_codebook.txt`, in dem NHGIS die Integrationsmethode und die
Zitierpflicht beschreibt. Die Zitierpflicht gehört nach `QUELLEN.md`, sobald
Zahlen daraus in die lange CSV gehen.

**Warum zwei Tabellen.** A00 reicht als einzige bis 1900 zurück, ist aber
nominal integriert — Grenzänderungen bleiben unkorrigiert. CL8 deckt nur vier
Bilder ab, dafür auf einheitlichem Gebietsstand. Das zweite Häkchen im
Extraktkorb kostet nichts und liefert eine bekannt richtige Antwort, gegen die
sich A00 eichen lässt. Was dabei herauskam, steht in `bericht.md`, Abschnitt 5.

## Wie der Auszug entsteht

Kostenloses Konto auf `data2.nhgis.org`. Dann:

1. **Select Data** → Reiter **TIME SERIES TABLES**. (Voreingestellt ist
   *Source Tables*, und die geben je Tabelle ein Jahr — wer dort sucht, findet
   keine Reihe über 120 Jahre und hält sie für nicht vorhanden.)
2. Links filtern: *Geographic Levels = County*, *Topics = Total Population*.
3. **A00** und **CL8** ankreuzen, **CONTINUE**.
4. Im Extraktkorb *County* **und** *State* wählen, Format *Comma delimited*,
   Layout *Time varies by row*, **SUBMIT**.

Der Klickweg stammt aus einem Browser ausserhalb dieser Arbeitsumgebung; die
Oberfläche selbst habe ich nie gesehen. Die **Dateien** dagegen sind hier
geöffnet, gelesen und nachgerechnet — was über ihren Inhalt in `bericht.md`
steht, ist gemessen.

## Was noch fehlt

| Was | Wofür | Woher |
|---|---|---|
| `cb_2020_us_county_500k.zip` | Geometrie, Schlüsseltest, Dichte | `www2.census.gov/geo/tiger/GENZ2020/shp/` |
| `co-est2025-alldata.csv` | Fortschreibung, letztes Bild | Seite `2020s-counties-total.html` |
| `sub-est2025` | Connecticut über die Towns zusammenrechnen | Seite `2020s-total-cities-and-towns.html` |
| `cencounts.csv` | zweite, unabhängige Quelle 1900–1990 | `data.nber.org/census/population/cencounts/` |
| Atlas of Historical County Boundaries | Flächeninterpolation für 1900/1910 | Newberry Library, rund 65 MB |

## Aufruf

Aus `build/`:

    node pruefung/usa/pruefe.mjs > pruefung/usa/bericht.md

Liest nur, schreibt nur nach stdout. Läuft in unter zwei Sekunden.
