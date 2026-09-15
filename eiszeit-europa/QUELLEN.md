# Quellen-Inventur

Stand: 15. September 2026. Wie in der Vorlage gilt: **jede Zeile ist selbst
geprüft** — abgerufen, nicht aus dem Gedächtnis notiert. Wo „gesperrt" steht,
ist das das Ergebnis eines wirklichen Abrufversuchs aus dieser
Arbeitsumgebung, mit Datum und Fehlercode.

## 1. Der Befund vorweg

**Alle drei Quellen sind geladen.** Die letzte, ICE-6G_C, hing an einem
fehlenden Zwischenzertifikat; das ist gelöst, ohne die Prüfung abzuschalten.

| Wirt | für | Stand | |
|---|---|---|---|
| `www.ngdc.noaa.gov` | ETOPO 2022 | **geladen** | 39 Kacheln, 780 MB |
| `store.pangaea.de`, `doi.pangaea.de` | DATED-1 | **geladen** | 12 MB, 58 Shapefiles |
| `www.atmosp.physics.utoronto.ca` | ICE-6G_C | **geladen** | 48 Dateien, 1° |
| `crt.sectigo.com` | das fehlende Zwischenzertifikat | **erreichbar über CONNECT** | siehe unten |
| `pmip4.lsce.ipsl.fr` | die 10'-Variante von ICE-6G_C | **unbrauchbar** | Zertifikat ungültig |
| `www.bodc.ac.uk` | GEBCO | erreichbar, nicht gebraucht | ETOPO tut es |

### Wie ICE-6G_C doch noch kam

Der Toronto-Server sendet sein **Zwischenzertifikat nicht mit**:

```
Blatt:  CN = mail.atmosp.physics.utoronto.ca   (SAN enthält www.atmosp…)
fehlt:  CN = Sectigo Public Server Authentication CA OV R36
Wurzel: CN = Sectigo Public Server Authentication Root R46   ← liegt im Bundle
```

Browser holen das fehlende Glied stillschweigend über die AIA-Adresse im
Zertifikat nach; `curl` tut das nicht. Die Adresse steht im Zertifikat und
spricht nur **HTTP**, der Netzausgang hier nur CONNECT — also wird CONNECT
erzwungen:

    curl --proxytunnel -x "$HTTPS_PROXY" \
         http://crt.sectigo.com/SectigoPublicServerAuthenticationCAOVR36.crt

Das Glied wird vor dem Gebrauch gegen das Systembundle geprüft
(`openssl verify -CAfile`) und erst dann angehängt. **Die TLS-Prüfung bleibt
an.** Ein Zwischenzertifikat nachzuliefern, das der Server hätte senden
sollen, ändert am Vertrauensanker nichts; die Prüfung auszuschalten schon.

Dazu kam eine zweite Hürde, die nichts mit TLS zu tun hat: der Server
antwortet Nicht-Browsern mit **403**. `holen.sh` schickt deshalb eine
Browser-Kennung mit — nachzulesen und zu ändern in `ICE6G_KENN`.

### Warum 1 Grad und nicht 10 Bogenminuten

Die Aufgabe nennt die **10'-Variante**. Die gibt es auf dem Toronto-Server
nicht: sein Verzeichnis führt `I6_C.VM5a_1deg.<t>.nc.gz`, 48 Dateien, und
sonst nichts von ICE-6G_C. Die 10'-Variante liegt beim PMIP4-Verzeichnis,
<https://pmip4.lsce.ipsl.fr/doku.php/data:ice_ice6g_c>, und dessen Zertifikat
ist aus **zwei** Gründen ungültig — nachgesehen am 15.09.2026:

```
subject=CN = livreblancpaleo.lsce.ipsl.fr     ← nicht pmip4.lsce.ipsl.fr
notAfter=Aug  4 09:38:47 2026 GMT             ← seit 41 Tagen abgelaufen
```

Ein abgelaufenes Zertifikat ist eine Panne; ein abgelaufenes **mit falschem
Namen** ist von einer Umleitung nicht zu unterscheiden. Das wird nicht
umgangen. Genommen wird also die 1°-Variante desselben Modells, von der
Quelle, deren Kette sich prüfen lässt.

Was das kostet, steht in [METHODIK.md](METHODIK.md), Abschnitt 4: die groben
Felder liegen dann bei 68 km statt 27 km, der Eisrand von ICE-6G_C wird
entsprechend weich. Der **Fels** verliert dabei nichts — er kommt aus dem
15″-DEM, und das ist unverändert. Und die Aussage über den Eisrand hängt
ohnehin nicht an ICE-6G_C, sondern an DATED-1, das in voller Schärfe darüber
liegt.

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

Bezogen über den Server der Arbeitsgruppe,
<https://www.atmosp.physics.utoronto.ca/~peltier/data.php>, Variante **1
Grad**, Dateien `I6_C.VM5a_1deg.<t>.nc.gz` — warum nicht die 10'-Variante der
Aufgabe, steht in Abschnitt 1.

Gebraucht werden vier Felder:

| Feld | | wofür |
|---|---|---|
| `Topo_Diff` | Oberfläche minus heutige, m | geht ins Relief ein (Schritt 3) |
| `stgit` | Eismächtigkeit, m | trennt Eis vom Fels, siehe gleich |
| `Topo` | Oberfläche zur Zeit t, m | Gegenprobe gegen die eigene Rechnung |
| `sftlf`, `sftgif` | Land- und Eisflächenanteil | **nicht** für die Küstenlinie; sie sagen, wo Probe 1 scharf ist |

**`Topo` und `Topo_Diff` enthalten das Eis.** Das steht in keiner Beschreibung
der Dateien und ist am ersten Lauf mit echten Daten gemessen worden: über dem
Bottnischen Meerbusen steht bei 21 ka `Topo_Diff` = +1845 m bei 2374 m
Eismächtigkeit. Das ist nicht die Kruste, die sich hebt — die liegt dort 525 m
**tiefer** als heute —, das ist das Eis obendrauf. Die Rechnung ist deshalb

    Oberfläche(t) = DEM + Topo_Diff(t)
    Fels(t)       = Oberfläche(t) − stgit(t)

und nicht, wie es die Aufgabe formuliert, `Fels = DEM + Topo_Diff`. Wer das
wörtlich nähme, bekäme das Skandinavische Gebirge bei 21 ka als 2000 m hohen
**Fels** und das Eis noch einmal 2400 m darüber. `quellen.py` misst das als
Probe 1b und bricht ab, wenn das Vorzeichen kippt.

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
Global Relief Model*, doi:10.25921/fd45-gt74, **neununddreissig** 15-Grad-Kacheln
des Satzes `15s_surface_elev_netcdf`, zusammen 780 MB. (Es waren fünfzehn,
solange der Rahmen ein Grad-Rechteck war; ein Kilometer-Rechteck greift an
seinen Nordecken bis Grönland und bis zur Karasee aus.)

Und zwar **surface**, nicht `bed`. Das stand hier einmal als Verlegenheit —
der 15″-`bed`-Satz hat nur 62 Kacheln, es gibt ihn nur dort, wo heute Eis
liegt, und für 12° W bis 45° O deckte keine einzige davon den Ausschnitt. Seit
Grönland im Rahmen liegt, ist es keine Verlegenheit mehr, sondern die
**richtige** Wahl, und zwar aus der Konstruktion heraus:

> Fläche(t) = DEM + `Topo_Diff`(t), und `Topo_Diff` ist auf `Topo`(0) bezogen —
> auf die **Oberfläche** von heute, Eis inbegriffen. Das DEM muss dieselbe
> Grösse sein, sonst stimmt der Bezugspunkt nicht.

Gemessen wird das als Probe 2, und sie fällt über Grönland (Median 76 m)
genauso aus wie über Europa (58 m). Der Fels kommt danach heraus, nicht
hinein: Fels = Fläche − `stgit`. Mit `bed` läge Grönland drei Kilometer zu
tief und das eiszeitliche Eis schwebte über einer abgesackten Insel.

GEBCO bleibt die Vorgabe der Aufgabe und ist gleichwertig; ETOPO ist genommen,
weil sein gekachelter Satz 780 MB statt 7,5 GB überträgt.

## 2b. Was an den erratenen Adressen falsch war

Drei von vier Vermutungen haben nicht gestimmt. Sie stehen hier, weil sie
zeigen, wie wenig eine plausible URL wert ist:

| vermutet | wirklich |
|---|---|
| `download.pangaea.de/dataset/848117/allfiles.zip` | gibt es nicht (404). Der Datensatz ist eine **Liste von Dateiadressen**; `?format=textfile` nennt sie. Gebraucht wird `store.pangaea.de/Publications/HughesA-etal_2015/DATED-1_TimeSlices_shp.zip`. |
| ETOPO `15s_bed_elev_netcdf`, Kacheln `N90W030`/`N90E000` | Der bed-Satz hat nur 62 Kacheln — es gibt ihn **nur dort, wo heute Eis liegt**. Für Europa ist `15s_surface_elev_netcdf` der Fels, und es braucht 15 Kacheln. |
| DATED-1 als Linien in Grad, Dateiname `10ka_maximum` | **Polygone** in polaren Lambert-Azimutal-**Metern** auf WGS84, Dateien heissen `TS20_mc`, und die Zeit steht als Attribut `AV_Time` im DBF. |
| `I6_C.VM5a_10min.<t>.nc` auf dem Toronto-Server | gibt es dort nicht. Toronto führt **nur** `I6_C.VM5a_1deg.<t>.nc.gz`; die 10'-Variante liegt bei PMIP4 hinter einem ungültigen Zertifikat. Siehe Abschnitt 1. |
| `Topo_Diff` sei die Bewegung der **Kruste** | es ist die Bewegung der **Oberfläche**, Eis inbegriffen. Gemessen, nicht gelesen. |

## 3. Was ausdrücklich nicht benutzt wird

**`sftlf` für die Küstenlinie.** Die Aufgabe verlangt die Nulllinie der
gerechneten Paläotopographie, und das ist auch sachlich richtig: `sftlf` ist
ein Flächenanteil auf einem 1°-Gitter, also rund 67 km breit. Eine Küste
daraus hätte die Auflösung eines Rasters, in dem die ganze Doggerbank vier
Zellen breit ist, und sie widerspräche dem Relief, das daneben in voller
Auflösung steht. Aus der Nulllinie gezogen ist die Küste dagegen **dieselbe
Zahl wie das Relief** — das ist der Grundsatz der Vorlage („Farbe, Licht und
Höhenlinie kommen aus einer einzigen Zahl"), hier auf die Küste angewandt.

`sftlf` und `stgif` bleiben trotzdem im Datensatz und werden gelesen: sie sind
die Gegenprobe. Wo die eigene Nulllinie und `sftlf` weit auseinanderlaufen,
stimmt etwas nicht.

**ICE-6G_C `Topo` als Relief.** Ein Grad ist am 53. Breitengrad rund 67 km. Die Alpen
wären darin ein Hügel von drei, vier Zellen Breite, das Skandinavische
Gebirge ein Wall ohne Täler. Deshalb der Umweg über `Topo_Diff` (Schritt 3 der
Aufgabe). `Topo` wird gelesen, um die eigene Rechnung dagegenzuhalten:
`DEM_grob + Topo_Diff` muss `Topo` treffen, wenn das DEM auf 1° gemittelt
wird. Weicht es ab, ist entweder der Bezugszeitpunkt oder das Vorzeichen
falsch.

## 4. Zitation, wie sie auf der Seite steht

Die Seite selbst nennt alle drei in der Fusszeile, ausgeschrieben, mit DOI.
Nicht als Linkliste — als Sätze, wie die Vorlage es unter „Daten" tut.

Lizenzen: ICE-6G_C ist zur freien wissenschaftlichen Nutzung mit Zitation
veröffentlicht; DATED-1 steht bei PANGAEA unter CC BY 3.0; GEBCO-Gitter sind
gemeinfrei mit Namensnennung (GEBCO Compilation Group), ETOPO 2022 ist ein
Werk der US-Regierung.
