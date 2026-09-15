# Rohdaten für den Neubau

Anders als in der Vorlage **lädt das Skript hier selbst**: `./holen.sh` holt
alles nach `../data/raw/`. Von Hand abgelegte Dateien sind der Notfall, nicht
der Weg.

```
cd build
./holen.sh                     # alles, was fehlt
./holen.sh pruefen             # nichts laden, nur nachsehen und Summen rechnen
pip install numpy netCDF4 pyshp
python3 quellen.py             # -> zwischen/
node build.mjs > ../index.html
```

Drei Schritte, nicht zwei — wie in der Vorlage, wo `quellen.py` die Tabelle
baut und `build.mjs` die Seite. Python liest NetCDF und Shapefiles (GEBCO und
ETOPO sind NetCDF-4, also HDF5), Node kodiert und schreibt.

Einzeln geht auch: `./holen.sh ice6g`, `./holen.sh dated`, `./holen.sh dem`.

## Was geholt wird

| Ziel | Quelle | Menge |
|---|---|---|
| `data/raw/ice6g/I6_C.VM5a_1deg.<t>.nc` | [Peltier, ICE-6G_C (VM5a), 1°](https://www.atmosp.physics.utoronto.ca/~peltier/data.php) | 48 Dateien, 26 … 0 ka, als `.nc.gz` geladen und entpackt |
| `data/raw/dated1/allfiles.zip` → `entpackt/` | [PANGAEA doi:10.1594/PANGAEA.848117](https://doi.pangaea.de/10.1594/PANGAEA.848117) | 25 … 10 ka, je 3 Linien |
| `data/raw/dem/…` | [ETOPO 2022, 15", `15s_surface_elev_netcdf`](https://www.ngdc.noaa.gov/thredds/fileServer/global/ETOPO2022/15s/15s_surface_elev_netcdf/) | 39 Kacheln, 780 MB |

Das DEM ist der grosse Posten. Wer den globalen GEBCO-Satz nicht will:

```
DEM=etopo ./holen.sh dem      # ETOPO 2022, 15", 39 Kacheln, 780 MB
```

Genommen wird die **Oberfläche** (`surface`), nicht der Fels (`bed`), und das
ist keine Feinheit: die Rechnung dieser Karte ist Fläche(t) = DEM +
`Topo_Diff`(t), und `Topo_Diff` ist auf `Topo`(0) bezogen — auf die Oberfläche
von heute, Eis inbegriffen. Das DEM muss dieselbe Grösse sein. Der Fels kommt
danach heraus, nicht hinein: Fels = Fläche − `stgit`.

Hier stand einmal das Gegenteil, mit der Begründung, ein Oberflächen-DEM lege
Grönlands heutiges Eis als Fels in die Karte. Das war falsch, und es ist nie
aufgefallen, weil im alten Ausschnitt gar kein heutiges Eis lag. Seit der
Rahmen bis Grönland reicht, entscheidet die Probe: DEM gegen `Topo`(0),
Median 76 m über Grönland und 58 m über Europa — `surface` trifft, `bed` läge
drei Kilometer daneben.

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

Der teure Schritt ist `quellen.py`: 15 Bogensekunden über den Rahmen (in Grad
64,3° W … 97,6° O und 28,9 … 83,9° N) sind über 500 Millionen Werte, die
streifenweise gelesen und auf das Zielgitter heruntergemittelt werden müssen. Das Ergebnis liegt in
`zwischen/`; löschen erzwingt eine Neurechnung.

Stellschrauben, alle als Umgebungsvariablen:

| für | | Vorgabe | |
|---|---|---|---|
| `quellen.py` | `BREITE` | 900 | Zellen Breite des Zielgitters |
| | `TD_GROB` | 8 | Teiler des Grobgitters für `Topo_Diff` |
| | `EIS_GROB` | 4 | dito für `stgit` |
| | `ROH`, `ZWISCHEN` | | Pfade umbiegen (fürs Prüfgerüst) |
| `build.mjs` | `NBAND` | 25 | Farbbänder des Gesteins |
| | `WASSER` | 8 | wie viele davon unter Null liegen |
| | `EISBAND` | 12 | Farbbänder des Eises |
| | `LANDSTUFE` | 250 | Meter je Landband |
| | `WASSERSTUFE` | 500 | Meter je Wasserband |
| | `EISSTUFE` | 300 | Meter je Eisband |

**`BREITE` ist die eine Schraube, an der Dateigrösse und Schärfe hängen**, und
sie ist gemessen: die Bühne ist auf 900 Bildpunkte gedeckelt, das Reliefgitter
liegt bei 55 Prozent davon, also bei rund 460. Bei `BREITE=760` ist das Gitter
gut anderthalbfach überabgetastet, und die Seite wiegt 807 kB. Mehr ist
Nutzlast ohne Bild — der Zoom ist ausdrücklich ein Vergrösserungsglas (siehe
ASTHETIK.md, Abschnitt 5). Die Messreihe steht in METHODIK.md, Abschnitt 9.

`WASSER` und die drei Stufenweiten hängen zusammen: die **Null muss eine
Bandgrenze sein**, sonst ist die Küstenlinie keine Höhenlinie mehr. Das ist
hier automatisch der Fall, weil Land- und Wasserbänder getrennt gezählt
werden — anders als in der Vorlage, wo eine einzige Leiter durchläuft und das
Ufer aus `WASSER/NBAND · (1+RESERVE) · Leiterende` folgt.

## Was wo liegt

| Datei | Aufgabe |
|---|---|
| `holen.sh` | lädt die Rohdaten, prüft Summen, meldet Fehlschläge mit Wirt und Code |
| `quellen.py` | liest NetCDF und Shapefiles, projiziert, rechnet das DEM herunter, prüft dreifach gegen, schreibt `zwischen/` |
| `pruefgeruest.py` | erzeugt erfundene Rohdaten in den echten Dateiformaten, um die Kette zu prüfen |
| `code.mjs` | Zickzack-Varint mit Nullläufen, samt Entpacker für die Seite |
| `leiter.mjs` | die beiden Farbleitern, in OKLCh gerechnet, mit Monotonieprobe |
| `nutzlast.mjs` | DEM, Differenzfelder, Eis und Ränder in die Nutzlast |
| `seite.mjs` | die Seite selbst: Feld, Licht, Höhenlinien, Scheibenstapel, Bedienung |
| `build.mjs` | setzt alles zusammen, erzeugt `index.html`, sperrt Gerüstdaten |
| `film.mjs` | macht aus der fertigen Seite ein hochkantes mp4 (Werkzeug, nicht Teil der Seite) |

Kein eigener NetCDF-Leser: GEBCO und ETOPO sind NetCDF-4 und damit HDF5, und
ein HDF5-Leser ist nicht die zwanzig Zeilen, ab denen sich das lohnt. Die
Vorlage zieht für ihre Python-Stufe ebenfalls zwei Pakete.

## Die Kette ohne Daten prüfen

```
python3 pruefgeruest.py
ROH=pruefgeruest-roh ZWISCHEN=zwischen-geruest python3 quellen.py
ZWISCHEN=zwischen-geruest node build.mjs --geruest > /tmp/probe.html
```

Das Gerüst schreibt **erfundene** Daten in den echten Dateiformaten. Ohne
`--geruest` weigert sich `build.mjs`, daraus eine Seite zu schreiben; mit
`--geruest` trägt sie ein Wasserzeichen. Was das Gerüst gefunden hat, steht in
METHODIK.md, Abschnitt 8.
