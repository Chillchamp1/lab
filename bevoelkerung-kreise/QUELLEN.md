# Quellen-Inventur

Stand: 10. September 2026. Jede Zeile ist selbst geprüft, nicht aus dem
Gedächtnis notiert; wo „Zugang" etwas anderes als „offen" sagt, steht dort das
Ergebnis eines tatsächlichen Abrufversuchs aus dieser Arbeitsumgebung.

## 0. Erreichbarkeit — der bestimmende Befund

Die Arbeitsumgebung lässt nur einen schmalen Ausschnitt des Netzes zu. Geprüft
wurde jeder Host einzeln mit einem echten Abruf.

| Host | Ergebnis |
|---|---|
| `raw.githubusercontent.com` | **offen** |
| `registry.npmjs.org`, `pypi.org`, `files.pythonhosted.org` | **offen** |
| `repo.anaconda.com`, `conda.anaconda.org`, `repo1.maven.org`, `rubygems.org`, `static.crates.io` | **offen** |
| Websuche (nur Trefferlisten und Kurzfassungen) | **offen** |
| `daten.gdz.bkg.bund.de`, `gdz.bkg.bund.de`, `sg.geodatenzentrum.de` | gesperrt |
| `www.destatis.de`, `www-genesis.destatis.de`, `www.regionalstatistik.de` | gesperrt |
| `www.ifo.de`, `leopard.tu-braunschweig.de`, `doi.org` | gesperrt |
| `www.statistik-berlin-brandenburg.de` | gesperrt |
| `de.wikipedia.org`, `www.wikidata.org`, `query.wikidata.org` | gesperrt |
| `github.com`, `api.github.com`, `codeload.github.com` | gesperrt |
| `zenodo.org`, `osf.io`, `dataverse.harvard.edu`, `figshare.com` | gesperrt |
| `cran.r-project.org`, `cloud.r-project.org` | gesperrt |
| `overpass-api.de`, `nominatim.openstreetmap.org`, `opendata.arcgis.com` | gesperrt |

Damit ist keine der in der Aufgabe genannten Fachquellen direkt abrufbar. Eine
Suche über GitHub, npm und PyPI nach Spiegelungen historischer deutscher
Bevölkerungsdaten blieb ergebnislos — dort liegen Geometrien und Corona-Zahlen,
aber keine Zählungsergebnisse vor 1990.

Freizuschaltende Hosts, nach Nutzen sortiert, stehen in [STAND.md](STAND.md).

## 1. Zeitpunkte

Aus der Aufgabenstellung, mit den Stichtagen, soweit sie feststehen. Die
Stichtagsspalte wird beim Einlesen je Zelle aus der Quelle gefüllt, nicht von
hier übernommen.

| Zeitpunkt | Stichtag | Geltungsbereich | Begriff |
|---|---|---|---|
| 1816, 1849, 1864 | wechselnd (Dez.) | nur Preussen | ortsanwesend |
| 1871 | 1.12.1871 | Deutsches Reich | ortsanwesend |
| 1880, 1890, 1900, 1910 | 1.12. bzw. 1.12.1910 | Deutsches Reich | ortsanwesend |
| 1925, 1933, 1939 | 16.6.1925, 16.6.1933, 17.5.1939 | Deutsches Reich (1925/33 ohne Saargebiet) | ortsanwesend / Wohnbevölkerung |
| 1946 | 29.10.1946 | vier Zonen | Wohnbevölkerung |
| BRD 1950, 1961, 1970, 1987 | 13.9.1950, 6.6.1961, 27.5.1970, 25.5.1987 | Bundesgebiet | Wohnbevölkerung |
| DDR 1950, 1964, 1971, 1981 | 31.8.1950, 31.12.1964, 1.1.1971, 31.12.1981 | DDR | Wohnbevölkerung |
| 1995, 2000 | 31.12. | Deutschland | Fortschreibung |
| 2011, 2022 | 9.5.2011, 15.5.2022 | Deutschland | Zensus |
| jüngstes Jahr | 31.12. | Deutschland | Fortschreibung |

Abweichende Stichtage zwischen BRD und DDR werden **nicht** angeglichen,
sondern in der Spalte `stichtag` geführt.

## 2. Kandidatenquellen, nach Methode

### A — bereits auf heutigen Gebietsstand gerechnet

**GPOP — German Local Population Database, Version 1.0.**
Felix Roesel, TU Braunschweig / ifo Dresden. Gesamtbevölkerung für 1871, 1910,
1939, 1946, 1961, 1987, 1996, 2011 und 2019 für **alle Gemeinden, Kreise und
Länder auf einheitlichem Gebietsstand 31.12.2019**, aus über 50 Quellen
zusammengetragen. Veröffentlicht in: Jahrbücher für Nationalökonomie und
Statistik 243 (3–4), 2023, 415–430; Datensatz über den Publikationsserver der
TU Braunschweig (DOI 10.24355/dbbs.084-…).
→ Deckt neun der geforderten Zeitpunkte flächendeckend nach Methode A ab und
ist damit das Rückgrat. Zugang: **gesperrt** (`leopard.tu-braunschweig.de`).

**Historische Gemeindeverzeichnisse der Landesämter.** Für den Pilotraum:
Brandenburg 1875–2005 beim Amt für Statistik Berlin-Brandenburg. Sachsen:
Digitales Historisches Ortsverzeichnis des ISGV (`hov.isgv.de`). Bayern:
Historisches Gemeindeverzeichnis des LfStat. Zugang: **gesperrt**.

### B — historische Gemeindedaten, selbst zugeordnet

**Uli Schuberts Gemeindeverzeichnis** (`gemeindeverzeichnis.de`) für 1900 und
1910, einschliesslich der preussischen Gutsbezirke. Zugang: **gesperrt**.

**Rademacher, Deutsche Verwaltungsgeschichte** (`verwaltungsgeschichte.de`) —
Zuordnung historischer Gemeinden und Kreise. Zugang: **gesperrt**.

### C — nur Kreisdaten, Flächeninterpolation nötig

**iPEHD — ifo Prussian Economic History Database.** Becker, Cinnirella, Hornung,
Woessmann. Kreisebene für ganz Preussen, Zählungen 1816–1901, CSV, bis 1901
574 Kreise, über 1 500 Variablen. Vertrieb über das GESIS-Datenarchiv
(DOI 10.4232/1.12140), Dokumentation beim ifo. Zugang: **gesperrt**.

**MPIDR Population History GIS Collection** — historische Kreisgrenzen als
Shapefiles, Voraussetzung für jede Flächeninterpolation nach Methode C.
Zugang: **gesperrt**.

### Neuere Jahre

**Regionaldatenbank Deutschland / GENESIS** (`regionalstatistik.de`), Tabelle
12411 (Bevölkerungsstand) ab 1995 auf Kreisebene; **Zensus 2011 und 2022**;
**BBSR-Umsteigeschlüssel** für Gebietsänderungen ab 1990, mittelbar über das
R-Paket `ags` von Moritz Marbach. Zugang: **gesperrt** (das R-Paket selbst
liegt auf GitHub und wäre erreichbar, enthält aber nur die Schlüssel, keine
Bevölkerungszahlen).

Ein hilfreicher, geprüfter Wegweiser durch die Landesangebote ist Marbachs
[A Guide to Germany's Regional Data](https://github.com/sumtxt/regionalstatistik)
(Stand 17.12.2024) — über `raw.githubusercontent.com` erreichbar und
vollständig gelesen. Daraus stammt die Liste, welche Landesämter überhaupt
eigene Datenbanken betreiben und welche nur Tabellen veröffentlichen.

## 3. Geometrie

**Soll:** VG2500 des BKG für die Karte, VG250 für Zuordnungen, jeweils zum
aktuellen Gebietsstand. Zugang: **gesperrt**.

**Ersatzweise in Benutzung:** ein VG250-Auszug der Kreisebene als GeoJSON,
gespiegelt in `jgehrcke/covid-19-germany-gae` (`geodata/DE-counties.geojson`),
über `raw.githubusercontent.com` erreichbar. Es sind unveränderte
BKG-Attribute (ADE, GF, ARS, AGS, GEN, BEZ, NUTS, DEBKG_ID, WSK), 401 Kreise
mit `GF = 4` plus 30 Wasserflächen mit `GF = 2`; jüngster Wirksamkeitsstichtag
1.1.2019. Der Gebietsstand ist also der vor der Eingliederung Eisenachs in den
Wartburgkreis am 1.7.2021; dieser eine Schritt wird im Bauvorgang nachgeholt
(siehe [METHODIK.md](METHODIK.md)) und ergibt die heutigen 400 Kreise.
© GeoBasis-DE / BKG, Datenlizenz Deutschland – Namensnennung 2.0.

Sobald VG2500 erreichbar ist, ersetzt es diesen Auszug ohne Änderung am
Bauvorgang; die Eingliederungstabelle wird dann leer, weil VG2500 zum
aktuellen Stand bereits 400 Kreise führt.

**Geprüft und verworfen:** `isellsoap/deutschlandGeoJSON` (434 Gebiete, aus
DIVA-GIS, ohne AGS, Gebietsstand vor den Kreisreformen), `m-ad/geofeatures-ags-germany`
und `AliceWi/TopoJSON-Germany` (aus GADM, nicht BKG),
`SBejga/germany-administrative-geojson` (BKG 2018, aber ohne erreichbaren
Kreis-Auszug unter den vermuteten Pfaden).

## 4. Fallen, die noch offen sind

Alle vier brauchen Quellen, die zurzeit gesperrt sind; sie sind hier
festgehalten, damit sie beim Weiterarbeiten nicht untergehen.

- **Oder-Neisse-Grenze.** Nur der westliche Teil geteilter Kreise zählt.
  Görlitz, Guben und Frankfurt (Oder) sind als Städte geteilt — dort werden
  Ortsteilzahlen gebraucht, sonst geschätzt und geflaggt.
- **Gross-Berlin 1920.** Zahlen vor 1920 aus den eingemeindeten Orten
  zusammensetzen, nicht die Altstadt Berlin fortschreiben.
- **Saarland.** Fehlt in den Reichszählungen 1925 und 1933 und in der
  BRD-Zählung 1950. Ersatzzählungen des Saargebiets suchen und flaggen.
- **Bevölkerungsbegriff.** Im Kaiserreich ortsanwesende Bevölkerung
  einschliesslich Militär, später Wohnbevölkerung. Je Zählung prüfen und in
  der Spalte `begriff` führen.
