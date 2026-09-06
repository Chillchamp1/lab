# Rohdaten für den Neubau

Die Skripte laden nichts herunter. Diese Dateien müssen neben ihnen liegen
(Shapefile entpackt, im selben Ordner wie `build.mjs`):

| Datei | Quelle | Grösse |
|---|---|---|
| `cb_2024_us_county_20m.shp` + `.dbf` | [Census Bureau, Cartographic Boundary Files 2024](https://www2.census.gov/geo/tiger/GENZ2024/shp/cb_2024_us_county_20m.zip) — Countys, generalisiert 1:20 Mio | 0,86 MB |
| `pop.csv` | [Census Bureau, County Population Totals 2020–2024](https://www2.census.gov/programs-surveys/popest/datasets/2020-2024/counties/totals/co-est2024-alldata.csv) | 1,69 MB |
| `results.csv` | [tonmcg, County Level Presidential Results 2024](https://raw.githubusercontent.com/tonmcg/US_County_Level_Election_Results_08-24/master/2024_US_County_Level_Presidential_Results.csv) | 0,34 MB |

Die beiden Census-Dateien sind gemeinfreie Werke der US-Bundesregierung. Die
Ergebnisdatei ist eine gepflegte Sammlung, keine amtliche Quelle — in den USA
führt keine Bundesbehörde die Wahlergebnisse zusammen.

`pop.csv` ist Latin-1 kodiert, nicht UTF-8; der Leser berücksichtigt das.

```
node build.mjs > ../index.html
```

Rechnet beim ersten Mal etwa fünf Minuten (Gitter 2000, sechs Durchgänge) und
legt das Ergebnis in `kartogramm-cache.json` ab; weitere Läufe sind sofort
fertig. Die Datei löschen erzwingt eine Neuberechnung.

## Was wo liegt

| Datei | Aufgabe |
|---|---|
| `shp.mjs` | Shapefile- und DBF-Leser, ohne Fremdbibliothek |
| `geometrie.mjs` | Albers-Projektion, Ringflächen, Schwerpunkte, Faltungsprüfung |
| `daten.mjs` | CSV-Leser, Filter auf das Festland, Zusammenfassung der DC-Wards |
| `vorbereiten.mjs` | Knotenmodell: gleiche Punkte werden verschweisst |
| `raster.mjs` | Dichtefeld auf ein Gitter, mit „Meer" am Rand |
| `diffusion.mjs` | Wärmeleitung per Gaussglättung, Punkte schwimmen mit |
| `gn.mjs` | Mehrere Durchgänge, bis der Restfehler klein ist |
| `code.mjs` | Kompakte Kodierung der Koordinaten für die Seite |
| `nutzlast.mjs` | Beides zusammen in die Nutzlast, mit Cache |
| `build.mjs` | Erzeugt die fertige `index.html` |

Die Module sind dieselben wie bei den deutschen Karten, bis auf drei
Unterschiede: Albers statt Lambert azimutal, ein Filter auf das Festland samt
Sonderfällen (DC-Wards, Connecticuts Planungsregionen), und eine nach
Einwohnern gewichtete Fehlerkennzahl, weil der ungewichtete Median hier von
menschenleeren Countys bestimmt würde.
