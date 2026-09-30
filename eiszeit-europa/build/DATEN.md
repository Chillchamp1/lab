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

Einzeln geht auch: `./holen.sh ice6g`, `./holen.sh dated`, `./holen.sh dem`,
`./holen.sh temp`.

## Was geholt wird

| Ziel | Quelle | Menge |
|---|---|---|
| `data/raw/ice6g/I6_C.VM5a_1deg.<t>.nc` | [Peltier, ICE-6G_C (VM5a), 1°](https://www.atmosp.physics.utoronto.ca/~peltier/data.php) | 48 Dateien, 26 … 0 ka, als `.nc.gz` geladen und entpackt |
| `data/raw/dated1/allfiles.zip` → `entpackt/` | [PANGAEA doi:10.1594/PANGAEA.848117](https://doi.pangaea.de/10.1594/PANGAEA.848117) | 25 … 10 ka, je 3 Linien |
| `data/raw/dem/…` | [ETOPO 2022, 15", `15s_surface_elev_netcdf`](https://www.ngdc.noaa.gov/thredds/fileServer/global/ETOPO2022/15s/15s_surface_elev_netcdf/) | 34 Kacheln, 680 MB |
| `data/raw/lgmr/LGMR_GMST_climo.nc` | [LGMR, Osman u. a. 2021, doi:10.25921/njxd-hg08](https://www.ncei.noaa.gov/pub/data/paleo/reconstructions/osman2021/) | globale Mitteltemperatur, 24–0 ka, 16 kB |

Das DEM ist der grosse Posten. Wer den globalen GEBCO-Satz nicht will:

```
DEM=etopo ./holen.sh dem      # ETOPO 2022, 15", 34 Kacheln, 680 MB
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
Median 76 m über Grönland und 52 m über Europa — `surface` trifft, `bed` läge
drei Kilometer daneben.

## Zusätze (30.09.2026): BRITICE, Polder, Gebirgseis, Biome

Zwei weitere Schritte nach `quellen.py`, beide optional — fehlen ihre
Ausgaben, baut `build.mjs` die Seite wie vorher:

```
pip install pyproj pillow scipy pandas openpyxl h5py
python3 zusatz.py              # BRITICE-Raender, Gebiet, Polder, Gebirgseis -> zwischen/
python3 vegetation.py          # Biome je Zeitscheibe -> zwischen/biome.u8
node build.mjs > ../index.html
```

Die Rohdaten dafür lädt `holen.sh` (noch) nicht; sie gehören von Hand an diese
Stellen:

| Ziel | Quelle |
|---|---|
| `data/raw/britice/Data S3 …GIS data/` | BRITICE-CHRONO, Clark u. a. 2022, Boreas 51, 699–758. [PANGAEA doi:10.1594/PANGAEA.945729](https://doi.pangaea.de/10.1594/PANGAEA.945729), Datei `Data_S3_BRITICE_CHRONO_empirical_reconstruction_GIS_data_zip.zip` (6 MB, CC-BY 4.0), entpackt |
| `data/raw/ne/ne_10m_land/`, `ne_10m_lakes/` | [Natural Earth 1:10m](https://www.naturalearthdata.com/), gemeinfrei |
| `data/raw/veg/Biome_assignments_V1.1_89_time-slices.csv` | Allen u. a. 2020, J. Biogeogr. 47, 2073. [Zenodo 3966353](https://doi.org/10.5281/zenodo.3966353) |
| `data/raw/veg/zanon2018/…/forest_cover_*.grd` | Zanon u. a. 2018, Front. Plant Sci. 9:253. [PANGAEA 886656](https://doi.org/10.1594/PANGAEA.886656) |
| `data/raw/veg/davis2024/Davis et al 2024  Figure data and LGM pollen counts.xlsx` | Davis u. a. 2024, Clim. Past 20, 1939 (Supplement) |
| `data/raw/veg/BIOME6000_classified_plotfile_v1.csv` | BIOME 6000, Harrison 2017, [doi:10.17864/1947.99](https://doi.org/10.17864/1947.99) |

Was die beiden Skripte tun und warum, steht in ihrem Kopf. Kurz:

- **BRITICE-CHRONO** ersetzt DATED-1 für das britisch-irische Eis (26–15 ka,
  Randlinien *optimum*, *max*, *min*). Die Seite zeichnet es nur im Gebiet
  `REGION` (Britische Inseln, Irische und Keltische See, westliche Nordsee bis
  3,5° O), DATED-1 nur ausserhalb. Anlass war ein Hinweis, DATED-1 sei dort
  überholt; BRITICE setzt das Maximum bei 26–25 ka, mit einem Eislappen in die
  Keltische See und eisfreiem Cornwall und Devon.
- **Polder**: Land nach Natural Earth, das im DEM unter null liegt (2 194
  Zellen, v. a. Niederlande und deutsche Nordseeküste). Die Seite hebt es
  zwischen 1 ka und heute auf +1 m, und die heutige Küstenlinie läuft um die
  Polder herum statt durch sie.
- **Gebirgseis**: ICE-6G_C hat über Alpen, Pyrenäen, Karpaten, Balkan, Apennin
  und Kaukasus kein Eis. Eine Schätzung über die Schneegrenze (ELA): 41
  Stützpunkte mit LGM-Werten aus der Literatur, Gauss-verteilt; die Seite
  rechnet ELA(t) = ELA_LGM + 1200 m × (1 − Kälte), die Kälte aus der
  LGMR-Temperatur. Auf der Seite als Schätzung benannt.
- **Biome**: dieselbe Rechnung wie im Film (Modell Allen 2020, im Glazial mit
  Pollen korrigiert, Holozän-Waldanteil aus Zanon 2018), auf sechs Klassen
  gerundet, 24 km Raster, je ICE-6G-Zeitscheibe. Schalter *Biomes*, beim Laden aus.

## Die 3D-Ansicht (Knopf *3D*)

WebGL mit three.js 0.186.1 (MIT, `../drei/three.module.min.js`, `three.core.js`,
`OrbitControls.js`, Lizenz daneben). Geladen wird es **erst beim Einschalten**;
die Seite selbst bleibt in sich geschlossen und wird dadurch nicht schwerer.
Der Code steht in `drei.mjs`.

`../drei/licht.webp` ist eine in Blender (Cycles) gebackene Lichtkarte des
heutigen Geländes: Sonne aus Nordwest, Himmelslicht, Schlagschatten, dazu das
unverglättete 1,5-km-Relief als Bump — 3 040 × 3 548 gebacken, auf 1 520 × 1 774
verkleinert. Gebacken wurde im Filmprojekt, aus dem diese Nachträge stammen;
das Skript liegt als `licht_backen.py` zum Nachlesen hier (es braucht dessen
Szene). Überhöhung dort und in `drei.mjs`: 24-fach, Tiefsee logarithmisch
gestaucht — beides muss gleich sein, sonst passen Schatten und Relief nicht.

Gelände: Farbe der Karte (oder Biome) × gebackenes Licht. Eis: live, mit Glanz
(GGX) und Fresnel-Spiegelung des Himmels. Meer: eigene Fläche mit Tiefenfarbe,
feinen Wellen fürs Glitzern und Himmelsspiegelung. Der Glanz hängt am Blick
und wandert beim Drehen.

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
61,3° W … 93,2° O und 32,8 … 83,9° N) sind über 500 Millionen Werte, die
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
