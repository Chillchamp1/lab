# Rohdaten für den Neubau

Anders als in der Vorlage **lädt das Skript hier selbst**: `./holen.sh` holt
alles nach `../data/raw/`. Von Hand abgelegte Dateien sind der Notfall, nicht
der Weg.

```
cd build
./holen.sh                     # alles, was fehlt
./holen.sh pruefen             # nichts laden, nur nachsehen und Summen rechnen
node build.mjs > ../index.html
```

Einzeln geht auch: `./holen.sh ice6g`, `./holen.sh dated`, `./holen.sh dem`.

## Was geholt wird

| Ziel | Quelle | Menge |
|---|---|---|
| `data/raw/ice6g/I6_C.VM5a_10min.<t>.nc` | [PMIP4, ICE-6G_C (VM5a), 10'](https://pmip4.lsce.ipsl.fr/doku.php/data:ice_ice6g_c) | 48 Dateien, 26 … 0 ka |
| `data/raw/dated1/allfiles.zip` → `entpackt/` | [PANGAEA doi:10.1594/PANGAEA.848117](https://doi.pangaea.de/10.1594/PANGAEA.848117) | 25 … 10 ka, je 3 Linien |
| `data/raw/dem/…` | [GEBCO 2024 sub-ice topo, 15"](https://www.bodc.ac.uk/data/open_download/gebco/gebco_2024_sub_ice_topo/zip/) | global, mehrere GB |

Das DEM ist der grosse Posten. Wer den globalen GEBCO-Satz nicht will:

```
DEM=etopo ./holen.sh dem      # ETOPO 2022, 15", nur zwei Kacheln
```

Beide sind **bedrock / sub-ice**, nicht „surface". Das ist keine Feinheit: die
Paläotopographie dieser Karte ist die Gesteinsoberfläche, und das eiszeitliche
Eis kommt getrennt aus `stgit` darauf. Mit einem Oberflächen-DEM läge
Grönlands heutiges Eis als Fels darin und bekäme das eiszeitliche noch einmal
obendrauf.

## Prüfsummen

Zwei Dateien, und sie tun Verschiedenes:

| | |
|---|---|
| `PRUEFSUMMEN.amtlich` | was die Quelle selbst veröffentlicht. Im Repo. |
| `PRUEFSUMMEN.eigen` | beim ersten erfolgreichen Lauf gerechnet. **Nicht** im Repo. |

Die zweite prüft **Wiederholbarkeit, nicht Echtheit**: ein zweiter Rechner
bekommt dieselben Bytes oder erfährt, dass er es nicht tut. Wer eine amtliche
Summe findet, trägt sie in die erste ein — das Format ist das von
`sha256sum`, eine Zeile je Datei, Pfad relativ zu `data/raw`.

Eine Datei mit falscher Summe wird **nicht stillschweigend ersetzt**, sondern
gemeldet. Sonst merkt niemand, dass sich eine Quelle unter der Hand geändert
hat.

## Wenn `holen.sh` nichts holt

Der übliche Grund ist nicht die Quelle, sondern das Netz zwischen ihr und
diesem Rechner. Bei **403 oder 407** ist es eine Ausgangssperre, keine
Ablehnung durch den Server — `data/raw/.holen.log` trägt den Code.

Genau das ist der Stand, in dem dieser Ordner gebaut wurde: aus der
Arbeitsumgebung war **kein einziger** der drei Wirte erreichbar. Was geprüft
wurde und mit welchem Code es scheiterte, steht vollständig in
[../QUELLEN.md](../QUELLEN.md). Die Dateien lassen sich dann von einem Rechner
mit freiem Netz holen und nach `data/raw/` legen; `./holen.sh pruefen`
bestätigt die Ablage, und `build.mjs` läuft ohne Änderung.

## Bauen

`build.mjs` erzeugt die fertige, in sich geschlossene `index.html` auf
**stdout**; die Kennzahlen laufen auf **stderr**. So lässt sich ein Bau gegen
den vorigen diffen.

Der teure Schritt ist der Ausschnitt aus dem DEM: 15 Bogensekunden über
12° W … 45° E und 34° N … 72° N sind rund 280 Millionen Werte, die auf das
Zielraster heruntergemittelt werden müssen. Das Ergebnis landet in
`dem-ausschnitt-<raster>.bin` und wird wiederverwendet; löschen erzwingt eine
Neurechnung.

Stellschrauben als Umgebungsvariablen:

```
RASTER=1.5 NBAND=25 node build.mjs > ../index.html
```

| | Vorgabe | |
|---|---|---|
| `RASTER` | 1.5 | Zielauflösung in Bogenminuten |
| `NBAND` | 25 | Farbbänder des Gesteins |
| `EISBAND` | 12 | Farbbänder des Eises |
| `WASSER` | 5 | wie viele Gesteinsbänder unter Null liegen |

`RASTER` ist die eine Schraube, an der Dateigrösse und Schärfe hängen. 1,5
Bogenminuten sind über diesem Ausschnitt rund 2 280 × 1 520 Werte — feiner,
als ein Bildschirm zeigt, und damit fein genug für das Vergrösserungsglas
(siehe ASTHETIK.md, Abschnitt 5). 3 Bogenminuten halbieren das in beiden
Achsen und sind für einen schnellen Blick gedacht.

## Was wo liegt

| Datei | Aufgabe |
|---|---|
| `holen.sh` | lädt die Rohdaten, prüft Summen, meldet Fehlschläge mit Wirt und Code |
| `netcdf.mjs` | NetCDF-3-classic-Leser, ohne Fremdbibliothek |
| `shp.mjs` | Shapefile- und DBF-Leser (aus der Vorlage übernommen) |
| `geometrie.mjs` | Lambert azimutal flächentreu, Umkehrung, Ringflächen |
| `dem.mjs` | Ausschnitt aus dem 15"-DEM, Herunterrechnen auf das Zielraster |
| `ice6g.mjs` | die 48 Zeitscheiben lesen, `Topo_Diff` und `stgit` bikubisch aufs Zielraster |
| `dated.mjs` | die drei Linien je Zeitscheibe, vereinfacht und projiziert |
| `meeresspiegel.mjs` | die Kurve für den Ticker, aus `Topo_Diff` über dem offenen Ozean |
| `takt.mjs` | Spielzeit je Abschnitt (Dauer × Umschichtung, mit Untergrenze) |
| `code.mjs` | kompakte Kodierung der Felder für die Seite |
| `nutzlast.mjs` | DEM, Differenzfelder, Eis und Ränder in die Nutzlast |
| `build.mjs` | erzeugt die fertige `index.html` |
| `film.mjs` | macht aus der fertigen Seite ein hochkantes mp4 (Werkzeug, nicht Teil der Seite) |
