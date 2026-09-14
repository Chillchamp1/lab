# Quellen-Inventur

Stand: 14. September 2026. Wie in der Vorlage gilt: **jede Zeile ist selbst
geprüft** — abgerufen, nicht aus dem Gedächtnis notiert. Wo „gesperrt" steht,
ist das das Ergebnis eines wirklichen Abrufversuchs aus dieser
Arbeitsumgebung, mit Datum und Fehlercode.

## 1. Der Befund vorweg

Stand nach der Freigabe der Netzpolitik am 14.09.2026. **Zwei der drei Quellen
sind geladen, die dritte hängt an einem fehlenden Zwischenzertifikat.**

| Wirt | für | Stand | |
|---|---|---|---|
| `www.ngdc.noaa.gov` | ETOPO 2022 | **geladen** | 15 Kacheln, 406 MB |
| `store.pangaea.de`, `doi.pangaea.de` | DATED-1 | **geladen** | 12 MB, 58 Shapefiles |
| `www.atmosp.physics.utoronto.ca` | ICE-6G_C | **offen** | CONNECT geht durch, TLS scheitert |
| `crt.sectigo.com` | das fehlende Zwischenzertifikat | **gesperrt** | 403 auf CONNECT |
| `pmip4.lsce.ipsl.fr` | Verzeichnisseite ICE-6G_C | **unbrauchbar** | Zertifikat am 4.8.2026 abgelaufen |
| `www.bodc.ac.uk` | GEBCO | erreichbar, nicht gebraucht | ETOPO tut es |

### Warum ICE-6G_C noch fehlt, und was genau fehlt

Der Tunnel zum Toronto-Server steht (CONNECT 200). Das Serverzertifikat ist
**gültig** — 29.04. bis 13.11.2026 — und deckt `www.atmosp.physics.utoronto.ca`
in seinen alternativen Namen ab. Der Server sendet nur sein **Zwischen-
zertifikat nicht mit**:

```
Blatt:  CN = mail.atmosp.physics.utoronto.ca   (SAN enthält www.atmosp…)
fehlt:  CN = Sectigo Public Server Authentication CA OV R36
Wurzel: CN = Sectigo Public Server Authentication Root R46   ← liegt im Bundle
```

Die Wurzel ist also da, nur das Glied dazwischen nicht. Browser holen es
stillschweigend über die AIA-Adresse im Zertifikat nach; `curl` tut das nicht.
Die Adresse steht im Zertifikat:

    http://crt.sectigo.com/SectigoPublicServerAuthenticationCAOVR36.crt

`crt.sectigo.com` ist gesperrt. Geprüft und erfolglos: ob ein anderer
erreichbarer Wirt dieselbe Zwischenstelle mitliefert (NOAA nutzt DigiCert,
PANGAEA und NCEI Let's Encrypt, PyPI und npm etwas anderes), und ob die
Zwischenstelle schon im Bundle liegt (nein — Bundles führen Wurzeln, keine
Zwischenstellen).

**Die TLS-Prüfung wird dafür nicht abgeschaltet.** Ein Zwischenzertifikat
nachzuliefern, das der Server hätte senden sollen, ändert am Vertrauensanker
nichts; die Prüfung auszuschalten schon. Es fehlt also genau ein Wirt in der
Freigabe: `crt.sectigo.com`.

### Was daraus folgt

`build/holen.sh` trägt jetzt die **geprüften** Adressen: die erratenen von
vorher waren teils falsch (siehe unten). Ein Lauf meldet 17 Dateien da, 48
fehlend.

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

**Benutzt wird der Ersatz:** **NOAA NCEI (2022):** *ETOPO 2022 15 Arc-Second
Global Relief Model*, doi:10.25921/fd45-gt74, fünfzehn 15-Grad-Kacheln des
Satzes `15s_surface_elev_netcdf`, zusammen 406 MB.

Und zwar **surface**, nicht `bed` — das sieht nach einem Widerspruch zum
Absatz darüber aus und ist keiner. Nachgesehen hat der 15″-`bed`-Satz nur 62
Kacheln: es gibt ihn **nur dort, wo heute Eis liegt** (Grönland, Antarktis,
hohe Arktis). Überall sonst ist die Oberfläche der Fels, und für 12° W bis
45° E deckt keine einzige `bed`-Kachel den Ausschnitt. `surface` ist hier also
genau das, was `bed` wäre.

GEBCO bleibt die Vorgabe der Aufgabe und ist gleichwertig; ETOPO ist genommen,
weil sein gekachelter Satz 406 MB statt 7,5 GB überträgt.

## 2b. Was an den erratenen Adressen falsch war

Drei von vier Vermutungen haben nicht gestimmt. Sie stehen hier, weil sie
zeigen, wie wenig eine plausible URL wert ist:

| vermutet | wirklich |
|---|---|
| `download.pangaea.de/dataset/848117/allfiles.zip` | gibt es nicht (404). Der Datensatz ist eine **Liste von Dateiadressen**; `?format=textfile` nennt sie. Gebraucht wird `store.pangaea.de/Publications/HughesA-etal_2015/DATED-1_TimeSlices_shp.zip`. |
| ETOPO `15s_bed_elev_netcdf`, Kacheln `N90W030`/`N90E000` | Der bed-Satz hat nur 62 Kacheln — es gibt ihn **nur dort, wo heute Eis liegt**. Für Europa ist `15s_surface_elev_netcdf` der Fels, und es braucht 15 Kacheln. |
| DATED-1 als Linien in Grad, Dateiname `10ka_maximum` | **Polygone** in polaren Lambert-Azimutal-**Metern** auf WGS84, Dateien heissen `TS20_mc`, und die Zeit steht als Attribut `AV_Time` im DBF. |
| `I6_C.VM5a_10min.<t>.nc` auf dem Toronto-Server | noch ungeprüft — der Wirt ist erreichbar, aber die TLS-Kette bricht ab. |

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
