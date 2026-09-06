# Rohdaten für den Neubau

Die Skripte laden nichts herunter. Diese drei Dateien müssen neben ihnen liegen
(entpackt, im selben Ordner wie `build.mjs`):

| Datei | Quelle |
|---|---|
| `btw25_geometrie_wahlkreise_shp_geo.shp` + `.dbf` | [Wahlkreiseinteilung 2025, Downloads](https://www.bundeswahlleiterin.de/bundestagswahlen/2025/wahlkreiseinteilung/downloads.html) — Shapefile generalisiert, geografische Koordinaten (647 KB) |
| `kerg2.csv` | [Open Data BTW 2025](https://www.bundeswahlleiterin.de/bundestagswahlen/2025/ergebnisse/opendata/btw25/csv/) — amtliches Endergebnis |
| `strukturdaten.csv` | [Strukturdaten der Wahlkreise](https://www.bundeswahlleiterin.de/bundestagswahlen/2025/strukturdaten.html) |

Alle drei: Bundeswahlleiterin, Datenlizenz Deutschland – Namensnennung 2.0.

```
node build.mjs > ../index.html
```

Rechnet beim ersten Mal ein bis zwei Minuten und legt das Ergebnis in
`kartogramm-cache.json` ab; weitere Läufe sind sofort fertig. Die Datei
löschen erzwingt eine Neuberechnung. Die Kennzahlen
(Flächenabweichung, gefaltete Ringe) laufen dabei auf die Fehlerausgabe.

## Was wo liegt

| Datei | Aufgabe |
|---|---|
| `shp.mjs` | Shapefile- und DBF-Leser, ohne Fremdbibliothek |
| `geometrie.mjs` | Flächentreue Projektion, Ringflächen, Schwerpunkte, Faltungsprüfung |
| `vorbereiten.mjs` | Knotenmodell: gleiche Punkte werden verschweisst |
| `daten.mjs` | Einlesen der beiden CSV-Dateien |
| `raster.mjs` | Dichtefeld auf ein Gitter, mit „Meer" am Rand |
| `diffusion.mjs` | Wärmeleitung per Gaussglättung, Punkte schwimmen mit |
| `gn.mjs` | Mehrere Durchgänge, bis der Restfehler klein ist |
| `code.mjs` | Kompakte Kodierung der Koordinaten für die Seite |
| `nutzlast.mjs` | Beides zusammen in die Nutzlast |
| `build.mjs` | Erzeugt die fertige `index.html` |

Das Ergebnis von 2021 kommt aus derselben `kerg2.csv`: die Bundeswahlleiterin
weist dort zu jedem Wert die Vorperiode aus, amtlich auf den Zuschnitt von 2025
umgerechnet. Eine zweite Ergebnisdatei ist nicht nötig.
