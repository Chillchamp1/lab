# Quellen-Inventur

Stand: 14. September 2026. Wie in der Vorlage gilt: **jede Zeile ist selbst
geprüft** — abgerufen, nicht aus dem Gedächtnis notiert. Wo „gesperrt" steht,
ist das das Ergebnis eines wirklichen Abrufversuchs aus dieser
Arbeitsumgebung, mit Datum und Fehlercode.

## 1. Der Befund vorweg

**Keine der drei Quellen ist aus dieser Arbeitsumgebung erreichbar.** Die
Netzpolitik dieser Sitzung lässt Ausgangsverbindungen nur zu GitHub,
Bitbucket, npm und PyPI zu; jeder wissenschaftliche Datenhalter antwortet mit
403 auf den CONNECT-Tunnel, also noch bevor eine Anfrage beim Server ankommt.

Das ist keine Aussage über die Quellen — die sind offen und frei — sondern
über diese Umgebung.

| Wirt | gebraucht für | Versuch | Ergebnis |
|---|---|---|---|
| `www.atmosp.physics.utoronto.ca` | ICE-6G_C NetCDF | 14.09.2026 | **403**, CONNECT abgelehnt |
| `pmip4.lsce.ipsl.fr` | ICE-6G_C Verzeichnisseite | 14.09.2026 | **403**, CONNECT abgelehnt |
| `doi.pangaea.de` | DATED-1 Datensatzseite | 14.09.2026 | **403**, CONNECT abgelehnt |
| `download.pangaea.de`, `store.pangaea.de`, `pangaea.de` | DATED-1 Dateien | 14.09.2026 | **403** |
| `www.bodc.ac.uk` | GEBCO 2024 | 14.09.2026 | **403** |
| `www.ngdc.noaa.gov`, `www.ncei.noaa.gov`, `gis.ngdc.noaa.gov` | ETOPO 2022 | 14.09.2026 | **403** |
| `doi.org` | Auflösung jeder DOI | 14.09.2026 | **403** |
| `zenodo.org`, `figshare.com`, `osf.io`, `datadryad.org`, `dataverse.harvard.edu` | mögliche Zweitablagen | 14.09.2026 | **403** |
| `esgf-node.llnl.gov`, `esgf.nci.org.au`, `thredds.met.no` | mögliche Spiegel | 14.09.2026 | **403** |
| `naciscdn.org`, `www.naturalearthdata.com` | Küstenlinien zum Gegenlesen | 14.09.2026 | **403** |

Erreichbar sind: `github.com`, `raw.githubusercontent.com`, `api.github.com`
(nur auf dieses Repo beschränkt — die Suche ist abgeschaltet),
`bitbucket.org`, `registry.npmjs.org`, `pypi.org`.

Ein Spiegel auf GitHub wäre technisch erreichbar. **Er wird nicht benutzt**,
und zwar aus zwei Gründen, die beide in der Machart dieses Repos stehen: die
GitHub-Suche ist in dieser Sitzung gesperrt, ein Fund wäre also geraten statt
gefunden; und ein erratenes Ablagefach ist keine zitierfähige Quelle. Die
Aufgabe verlangt ausdrücklich „Prüfe Checksummen, wo angegeben" — dafür
braucht es die Quelle, nicht eine Kopie unbekannter Herkunft.

**Erfundene Daten kommen nicht in Frage.** Diese Karte ist eine Rekonstruktion,
und eine Rekonstruktion mit ausgedachten Zahlen unter echten Zitaten wäre das
Gegenteil dessen, wofür das Unsicherheitsband in Schritt 4 da ist.

Das Downloadskript `build/holen.sh` ist trotzdem fertig und läuft: es erzeugt
die richtige Dateiliste (48 Zeitscheiben), holt, setzt abgebrochene
Übertragungen fort, rechnet Prüfsummen nach und meldet den Fehlschlag mit
Wirt und Code. Nachgewiesen ist das an einem echten Lauf — siehe
`data/raw/.holen.log`. Es fehlen die Bytes, nicht das Verfahren.

### Was die Vorlage in derselben Lage getan hat

`bevoelkerung-kreise` kennt den Fall: GPOP „liegt hinter einer Rechenaufgabe
gegen Maschinen, die diese Arbeitsumgebung nicht lösen darf; sie wurde deshalb
von Hand heruntergeladen und beigesteuert." Dasselbe ist hier der Weg — die
Dateien nach `data/raw/` legen, `./holen.sh pruefen` bestätigt die Ablage, und
`build.mjs` läuft.

## 2. Was benutzt wird

### (a) Das Eis und die Kruste: ICE-6G_C (VM5a)

**Peltier, W. R., Argus, D. F. & Drummond, R. (2015):** *Space geodesy
constrains ice age terminal deglaciation: The global ICE-6G_C (VM5a) model.*
Journal of Geophysical Research: Solid Earth 120(1), 450–487,
doi:10.1002/2014JB011176.

Ergänzend, weil es die Korrektur zur Antarktis trägt (für diesen Ausschnitt
ohne Belang, für die Zitation nicht):
**Argus, D. F., Peltier, W. R., Drummond, R. & Moore, A. W. (2014):** *The
Antarctica component of postglacial rebound model ICE-6G_C (VM5a).*
Geophysical Journal International 198(1), 537–563, doi:10.1093/gji/ggu140.

Bezogen über das PMIP4-Verzeichnis,
<https://pmip4.lsce.ipsl.fr/doku.php/data:ice_ice6g_c>, Variante **10
Bogenminuten**, Dateien `I6_C.VM5a_10min.<t>.nc`.

Gebraucht werden vier Felder:

| Feld | | wofür |
|---|---|---|
| `Topo_Diff` | Topographie minus heutige, m | **das Einzige, was ins Relief eingeht** (Schritt 3) |
| `stgit` | Eismächtigkeit, m | die Eisoberfläche (Schritt 4) |
| `Topo` | Paläotopographie auf 10', m | nur zur Gegenprobe gegen die eigene Rechnung |
| `sftlf`, `stgif` | Land- und Eisflächenanteil | **nicht** für die Küstenlinie, siehe unten |

Die Schrittweite ist ungleichmässig und wird nicht geglättet: **26 bis 21 ka
in 1-ka-Schritten, 21 ka bis heute in 0,5-ka-Schritten**, zusammen 48
Zeitscheiben. Die Marken unter der Zeitleiste zeigen das.

Prüfsummen veröffentlicht die Quelle nicht. `holen.sh` legt deshalb beim
ersten erfolgreichen Lauf `PRUEFSUMMEN.eigen` an — das prüft
Wiederholbarkeit, nicht Echtheit, und sagt das auch.

### (b) Die Ränder: DATED-1

**Hughes, A. L. C., Gyllencreutz, R., Lohne, Ø. S., Mangerud, J. & Svendsen,
J. I. (2016):** *The last Eurasian ice sheets – a chronological database and
time-slice reconstruction, DATED-1.* Boreas 45(1), 1–45,
doi:10.1111/bor.12142.

Datensatz: **doi:10.1594/PANGAEA.848117**. 25 bis 10 ka in 1-ka-Schritten, je
Scheibe drei Linien — **most-credible, maximum, minimum**.

Die drei Linien sind nicht Beiwerk. Der Abstand zwischen Maximum und Minimum
ist das veröffentlichte Unsicherheitsmass der Rekonstruktion, und wo er breit
wird, ist die Datierung dünn. Auf der Karte ist er deshalb ein halbdurch-
sichtiges Band und kein gestrichelter Hilfsstrich.

**Der Ausschnitt der Aufgabe ist grösser als DATED-1.** Die Ränder decken 25
bis 10 ka; die Zeitachse läuft von 26 bis 0. Vor 25 ka und nach 10 ka gibt es
kein Band — nicht, weil es keine Unsicherheit gäbe, sondern weil sie nicht
veröffentlicht ist. Das gehört auf die Seite, nicht in eine Fussnote.

### (c) Der Boden: GEBCO 2024, ersatzweise ETOPO 2022

**GEBCO Compilation Group (2024):** *GEBCO 2024 Grid*,
doi:10.5285/1c44ce99-0a0d-5f4f-e063-7086abc0ea0f. 15 Bogensekunden, global.

Gebraucht wird das **sub-ice-topo**-Gitter, nicht das Standardgitter: die
Paläotopographie dieser Karte ist die **Gesteins**oberfläche, und das Eis
kommt getrennt aus `stgit` darauf. Mit dem Standardgitter läge Grönlands und
Islands heutiges Eis als Fels in der Karte und bekäme darüber noch einmal das
eiszeitliche.

Ersatz, falls der globale GEBCO-Satz zu gross ist:
**NOAA NCEI (2022):** *ETOPO 2022 15 Arc-Second Global Relief Model*,
doi:10.25921/fd45-gt74, Variante **bed elevation**, Kacheln `N90W030` und
`N90E000`.

Für das Gebiet zwischen 12° W und 45° E sind beide gleichwertig; GEBCO ist die
Vorgabe der Aufgabe.

## 3. Was ausdrücklich nicht benutzt wird

**`sftlf` für die Küstenlinie.** Die Aufgabe verlangt die Nulllinie der
gerechneten Paläotopographie, und das ist auch sachlich richtig: `sftlf` ist
ein Flächenanteil auf einem 10'-Gitter, also rund 18 km breit. Eine Küste
daraus hätte die Auflösung eines Rasters, in dem die ganze Doggerbank vier
Zellen breit ist, und sie widerspräche dem Relief, das daneben in voller
Auflösung steht. Aus der Nulllinie gezogen ist die Küste dagegen **dieselbe
Zahl wie das Relief** — das ist der Grundsatz der Vorlage („Farbe, Licht und
Höhenlinie kommen aus einer einzigen Zahl"), hier auf die Küste angewandt.

`sftlf` und `stgif` bleiben trotzdem im Datensatz und werden gelesen: sie sind
die Gegenprobe. Wo die eigene Nulllinie und `sftlf` weit auseinanderlaufen,
stimmt etwas nicht.

**ICE-6G_C `Topo` als Relief.** 10 Bogenminuten sind rund 18 km. Die Alpen
wären darin ein Hügel von drei, vier Zellen Breite, das Skandinavische
Gebirge ein Wall ohne Täler. Deshalb der Umweg über `Topo_Diff` (Schritt 3 der
Aufgabe). `Topo` wird gelesen, um die eigene Rechnung dagegenzuhalten:
`DEM_grob + Topo_Diff` muss `Topo` treffen, wenn das DEM auf 10' gemittelt
wird. Weicht es ab, ist entweder der Bezugszeitpunkt oder das Vorzeichen
falsch.

## 4. Zitation, wie sie auf der Seite steht

Die Seite selbst nennt alle drei in der Fusszeile, ausgeschrieben, mit DOI.
Nicht als Linkliste — als Sätze, wie die Vorlage es unter „Daten" tut.

Lizenzen: ICE-6G_C ist zur freien wissenschaftlichen Nutzung mit Zitation
veröffentlicht; DATED-1 steht bei PANGAEA unter CC BY 3.0; GEBCO-Gitter sind
gemeinfrei mit Namensnennung (GEBCO Compilation Group), ETOPO 2022 ist ein
Werk der US-Regierung.
