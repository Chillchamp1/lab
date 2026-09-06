# Rohdaten für den Neubau

Die Skripte laden nichts herunter. Diese Dateien müssen neben ihnen liegen
(Shapefiles entpackt, im selben Ordner wie `build.mjs`):

| Datei | Quelle |
|---|---|
| `cb_2024_us_state_20m.shp` + `.dbf` | [Census Bureau, Cartographic Boundary Files 2024](https://www2.census.gov/geo/tiger/GENZ2024/shp/cb_2024_us_state_20m.zip) — Bundesstaaten, generalisiert |
| `cb_2024_us_cd119_20m.dbf` | [Wahlbezirke des 119. Kongresses](https://www2.census.gov/geo/tiger/GENZ2024/shp/cb_2024_us_cd119_20m.zip) — nur die Attributtabelle, zum Zählen der Sitze |
| `results.csv` | [tonmcg, County Level Presidential Results 2024](https://raw.githubusercontent.com/tonmcg/US_County_Level_Election_Results_08-24/master/2024_US_County_Level_Presidential_Results.csv) |

Die Countyergebnisse werden je Staat aufsummiert; Staatsergebnisse braucht es
nicht separat. Von der Bezirksdatei wird nur die `.dbf` gebraucht — die
Geometrie bleibt ungenutzt, gezählt werden bloss die Bezirke je Staat.

```
node build.mjs > ../index.html
```

Rechnet beim ersten Mal etwa eine Minute und legt das Ergebnis in
`kartogramm-cache.json` ab. Bei 51 Gebieten konvergiert das Verfahren leicht:
Flächenabweichung im Median 0,08 Prozent, im Maximum 0,5 Prozent.

## Was wo liegt

| Datei | Aufgabe |
|---|---|
| `shp.mjs` | Shapefile- und DBF-Leser, ohne Fremdbibliothek |
| `geometrie.mjs` | Albers-Projektion, Ringflächen, Schwerpunkte, Faltungsprüfung |
| `daten.mjs` | Wahlleute aus Bezirkszahlen, Staatsergebnisse aus Countyzeilen |
| `vorbereiten.mjs` | Drei Gruppen, Datumsgrenze bei den Aleuten |
| `raster.mjs` | Dichtefeld auf ein Gitter, mit „Meer" am Rand |
| `diffusion.mjs` | Wärmeleitung per Gaussglättung, Punkte schwimmen mit |
| `kartogramme.mjs` | Festland per Diffusion, Alaska und Hawaii per Skalierung |
| `oklab.mjs`, `palette.mjs` | Wahrnehmungsgleiche divergierende Farbskala |
| `code.mjs` | Kompakte Kodierung der Koordinaten für die Seite |
| `nutzlast.mjs` | Alles zusammen, mit Cache und Beschriftungspunkten |
| `build.mjs` | Erzeugt die fertige `index.html` |
