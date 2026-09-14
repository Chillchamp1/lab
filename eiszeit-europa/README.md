# Europa unter dem Eis

→ **https://chillchamp1.github.io/lab/eiszeit-europa/**
>
> **Dort steht noch keine Karte.** Die Seite ist online und nennt, woraus sie
> gebaut wird — die Rohdaten fehlen noch. Sie zeigt bewusst **nichts
> Erfundenes**: eine Rekonstruktion mit ausgedachtem Eisschild unter echten
> Zitaten wäre das eine, was sie nicht tun darf. Warum die Daten fehlen, steht
> im nächsten Absatz und ausführlich in [QUELLEN.md](QUELLEN.md).
>
> Erzeugt wird dieser Zustand vom selben Bauvorgang wie die richtige Seite:
> `node build.mjs --leer > ../index.html`. Sobald die Daten da sind, ersetzt
> `node build.mjs > ../index.html` sie unter derselben Adresse.

Eine animierte Reliefkarte Europas durch die letzte Eiszeit: von 26 000 Jahren
vor heute bis in die Gegenwart, das Festland als echtes Gebirgsrelief, darüber
der skandinavische Eisschild, und beides verändert sich über die Zeitachse.

Machart und Bedienung sind von [Deutschland, gezeichnet von seinen
Menschen](../bevoelkerung-kreise/) übernommen. Was genau, und was nicht, steht
in [ASTHETIK.md](ASTHETIK.md) — das ist der Befund, aus dem alles Weitere
folgt.

## Der Stand

Aus der Arbeitsumgebung, in der dieser Ordner entstanden ist, war **keiner der
drei Datenhalter erreichbar**: PMIP4 und der Server der University of Toronto
(ICE-6G_C), PANGAEA (DATED-1) und BODC/NOAA (GEBCO, ETOPO) antworten alle mit
403 auf den CONNECT-Tunnel. Das ist die Ausgangssperre dieser Sitzung, nicht
die Quellen — die sind offen. Jeder Versuch ist mit Wirt, Datum und Code in
[QUELLEN.md](QUELLEN.md) protokolliert.

Was daraus folgt, und was nicht:

- **Fertig und geprüft** ist die ganze Kette — Downloadskript, NetCDF- und
  Shapefile-Verarbeitung, Projektion, Herunterrechnen des DEM, bikubisches
  Hochrechnen des Differenzfeldes, Kodierung, Seite, Film. Geprüft an einem
  **Prüfgerüst**, das dieselben Dateiformate mit erfundenem Inhalt erzeugt
  (`build/pruefgeruest.py`). Es hat dabei fünf echte Fehler gefunden; sie
  stehen in [METHODIK.md](METHODIK.md), weil sie mehr über die Sache sagen als
  das Ergebnis.
- **Nicht da** sind die Zahlen. Es fehlen die Bytes, nicht das Verfahren.

Sobald die drei Datensätze unter `data/raw/` liegen, erzeugt ein Befehl die
echte Seite. Erfundenes Gelände kommt dabei nicht durch: `build.mjs` erkennt
Gerüstdaten und **weigert sich**, daraus eine Seite ohne Wasserzeichen zu
schreiben.

## Was die Karte zeigt

**Das Relief ist echt, die Bewegung ist rekonstruiert.** Das ist die eine
Konstruktion, auf der alles steht:

    Paläotopographie(t) = modernes DEM + interpoliertes Topo_Diff(t)

Das moderne Höhenmodell hat 15 Bogensekunden — rund 460 Meter. ICE-6G_C hat
10 Bogenminuten, also rund 18 Kilometer; die Alpen wären darin ein Hügel von
vier Zellen Breite. Deshalb trägt das feine DEM die Berge, und vom groben
Modell kommt **nur das Differenzfeld**: die isostatische Absenkung unter dem
Eis, die Hebung danach, der Meeresspiegel. Bikubisch hochgerechnet und
aufaddiert. So bleiben Alpen, Skandinavisches Gebirge, Karpaten und
Mittelgebirge in voller Auflösung, während sich Krustenlage und Küstenlinie
korrekt mitbewegen.

**Die Küstenlinie ist die Nulllinie dieser Rechnung**, nicht das Landraster
`sftlf` des Modells. Damit ist sie dieselbe Zahl wie das Relief daneben — und
damit gilt hier derselbe Satz wie in der Vorlage: Farbe, Licht und Höhenlinie
kommen aus einer einzigen Zahl. Jede Höhenlinie ist eine Farbgrenze, jede
Farbgrenze trägt ihre Linie, und die Küste ist die Linie bei null.

**Das Eis ist ein eigener Layer.** Eisoberfläche = Paläotopographie + `stgit`,
mit eigener Farbleiter: entsättigtes Blauweiss, in dem allein die Helligkeit
trägt. Sie liegt ganz im Hellen (OKLab-Helligkeit 0,84 bis 0,99) — ein
Gletscherrand ist nicht dunkler als seine Kuppe, er ist nur flacher, und die
Form macht das Licht. Dass die Schattierung **in die Farbe gerechnet** wird
statt als `soft-light` darüberzuliegen, ist auf dieser Karte keine Feinheit,
sondern die Bedingung dafür, dass man den Eisschild überhaupt modelliert
sieht: weiches Licht kann Weiss nicht dunkler machen.

## Das Unsicherheitsband

Über dem Eis liegen die Ränder aus DATED-1, und zwar alle drei: die
*most-credible*-Linie kräftig, dazwischen *maximum* und *minimum* als
halbtransparentes Band.

**Das Band ist kein Deko-Element, es ist die Kernaussage.** Wo es breit wird,
ist die Rekonstruktion schwach — und es wird nicht gleichmässig breit. Der
Aufbau vor 25 ka ist deutlich schwächer belegt als der Rückzug danach, weil
vorrückendes Eis zerstört, was es überfährt, und zurückweichendes datierbares
Material hinterlässt.

Daneben steht eine zweite, ruhige Linie in neutralem Blaugrau: der Eisrand,
wie **ICE-6G_C** ihn hat. Die beiden sind nicht dasselbe — die eine ist ein
GIA-Modell, die andere eine Datierungssammlung —, und wo sie auseinanderlaufen,
ist genau das der Befund. Ohne die zweite Linie hielte man die orange für den
Rand des gezeichneten Eises, was sie nicht ist.

DATED-1 deckt 25 bis 10 ka. Davor und danach gibt es **kein Band**, nicht weil
es keine Unsicherheit gäbe, sondern weil sie nicht veröffentlicht ist. Und
zwischen zwei Rekonstruktionen wird nicht interpoliert: eine Linie, die
zwischen zwei Datierungen schwebt, wäre eine Behauptung, die niemand
aufgestellt hat.

## Die Zeitachse

Abspielbar von 26 ka bis 0, in 48 Zeitscheiben. Die Schrittweite der Daten ist
ungleichmässig, und **das ist in der Oberfläche ablesbar**: ICE-6G_C hat von 26
bis 21 ka Schritte von tausend Jahren und danach von fünfhundert. Unter der
Zeitleiste steht ein Strich je Zeitscheibe — in der zweiten Hälfte der Bahn
stehen sie doppelt so dicht. Eine zweite Reihe in Orange markiert die
DATED-1-Rekonstruktionen.

Dazwischen wird **linear** interpoliert. Die Vorlage rechnet mit einer
monotonen kubischen Kurve und begründet das mit einem gemessenen Knick von 74
Prozent an jeder ihrer ungleich verteilten Zählungen. Hier sind die Schritte
gleichmässig, der Knick ist klein, und der Preis einer Kurve wäre, dass sie
zwischen zwei Datenpunkten etwas behauptet. Kein Glätten über die Datenlage
hinweg — das ist eine Rekonstruktion, keine Simulation.

Über der Karte steht deshalb auch immer, woran man gerade ist: auf einer
Zeitscheibe deren Jahr, dazwischen die beiden, zwischen denen interpoliert
wird.

**Die Uhr läuft nicht gleichmässig durch die Jahre.** Jeder Abschnitt bekommt
einen Anteil an den 90 Sekunden, der Dauer und Umschichtung mischt — das
geometrische Mittel aus seinem Anteil an den Jahren und seinem Anteil an der
Veränderung des Eisvolumens, mit einer Untergrenze. Rein nach Jahren liefe der
Zusammenbruch des Eisschildes in einem Fünftel der Zeit ab, während die ruhigen
fünftausend Jahre vor dem Hochstand ein Viertel bekämen. Dasselbe Verfahren
wie in der Vorlage, nur mit Eis statt Menschen.

Unten läuft die **Meeresspiegelkurve** mit, relativ zu heute. Sie kommt aus
demselben Feld wie alles andere: `Topo_Diff` über tiefem Fernfeld-Ozean *ist*
die negative Meeresspiegeländerung. Das ist die einzige Stelle, an der diese
Karte etwas ausserhalb ihres Ausschnitts liest.

## Aufrichten und Drehen

*Tilt* kippt die Karte aus der Senkrechten, *Turn* dreht sie, *Band* schaltet
das Unsicherheitsband weg. Zwei Finger auf der Karte tun dasselbe:
auseinanderziehen vergrössert, verdrehen dreht, beide Finger zusammen nach oben
schieben richtet auf. Der Punkt, den man anfasst, bleibt dabei liegen.

Gerechnet wird die Schrägsicht als **Laserschnittmodell**: das Höhenfeld wird
in sechsundzwanzig Scheiben geschnitten und versetzt übereinandergelegt, jede
Scheibe eine Höhenstufe, jede Stufenkante eine Höhenlinie. Die Scheiben stehen
dabei auf **absoluten Höhen** und der Rahmen fest — nach dem höchsten Punkt zu
rechnen, der gerade dasteht, schrumpfte die Karte in dem Mass, in dem der
Eisschild wächst, und zwei Bilder wären nicht mehr vergleichbar.

## Der Ausschnitt

12° W bis 45° E, 34° N bis 72° N, in einer flächentreuen Lambert-Azimutal-
projektion um 53° N / 15° O — dieselbe Familie wie in der Vorlage.

Rund ein Drittel des Bildrechtecks liegt dabei ausserhalb des Fensters. Das ist
nicht die Schuld der Projektion, sondern die Form des Fensters: 38 Grad Breite
auf 57 Grad Länge lassen sich flächentreu nicht in ein Rechteck legen.
Nachgemessen liegen alle Kandidaten gleichauf — Lambert azimutal 68,8 %, EPSG:
3035 67,9 %, Albers 43/65 67,5 %. Also bleibt es bei der azimutalen, und der
Rest wird **maskiert** statt gefüllt: die Karte steht als Form auf schwarzem
Grund, mit gebogenen Breitenkreisen wie ein Atlasblatt. Bezahlt wird dafür
nichts — das Höhenmodell wird zeilenweise nur über seinen gültigen Abschnitt
kodiert.

## Daten

- **Eismächtigkeit, Paläotopographie und Krustenbewegung** — Peltier, W. R.,
  Argus, D. F. & Drummond, R. (2015): *Space geodesy constrains ice age
  terminal deglaciation: The global ICE-6G_C (VM5a) model.* Journal of
  Geophysical Research: Solid Earth 120(1), 450–487,
  DOI 10.1002/2014JB011176. Dazu Argus, D. F., Peltier, W. R., Drummond, R. &
  Moore, A. W. (2014): *The Antarctica component of postglacial rebound model
  ICE-6G_C (VM5a).* Geophysical Journal International 198(1), 537–563,
  DOI 10.1093/gji/ggu140. Variante 10 Bogenminuten, bezogen über
  [PMIP4](https://pmip4.lsce.ipsl.fr/doku.php/data:ice_ice6g_c).
- **Eisränder** — Hughes, A. L. C., Gyllencreutz, R., Lohne, Ø. S., Mangerud,
  J. & Svendsen, J. I. (2016): *The last Eurasian ice sheets – a chronological
  database and time-slice reconstruction, DATED-1.* Boreas 45(1), 1–45,
  DOI 10.1111/bor.12142. Datensatz DOI 10.1594/PANGAEA.848117, CC BY 3.0.
- **Modernes Höhenmodell** — GEBCO Compilation Group (2024): *GEBCO 2024 Grid*,
  DOI 10.5285/1c44ce99-0a0d-5f4f-e063-7086abc0ea0f, Variante sub-ice topo,
  15 Bogensekunden. Ersatzweise NOAA NCEI (2022): *ETOPO 2022 15 Arc-Second
  Global Relief Model*, DOI 10.25921/fd45-gt74, Variante bed elevation.

Welche Datei wohin gehört und wie sie geholt wird, steht in
[build/DATEN.md](build/DATEN.md); was geprüft und was gesperrt war, in
[QUELLEN.md](QUELLEN.md).

## Grenzen

Drei, und sie gehören zur Karte, nicht in eine Fussnote.

**Die Eismächtigkeiten sind GIA-modelliert.** ICE-6G_C ist kein Messwert,
sondern ein Modell, das an Meeresspiegelmarken, GPS-Vertikalbewegungen und
Eisrandrekonstruktionen angepasst wurde. Die veröffentlichte Unsicherheit der
Mächtigkeit liegt bei **±20 bis 30 Prozent**. Ein Eisschild, der in dieser
Karte 3 000 Meter dick steht, kann 2 200 oder 3 800 gewesen sein — und die
Farbe sagt das nicht.

**Der Aufbau ist schwächer belegt als der Rückzug.** Vor 25 ka gibt es
erheblich weniger datierbares Material, weil vorrückendes Eis zerstört, was es
überfährt. Genau deshalb ist das DATED-1-Band dort breit, und genau deshalb
steht es auf der Karte und nicht daneben. Die ersten fünf Zeitscheiben dieser
Animation — 26 bis 21 ka — sind der am schlechtesten belegte Teil des ganzen
Films.

**Das Relief ist heutiges Relief.** Addiert wird ein glattes Differenzfeld;
was sich seit der Eiszeit örtlich geändert hat — ausgeräumte Trogtäler,
Moränen, Flussläufe, die Sedimentfüllung der Nordsee —, steht nicht darin. Die
Berge dieser Karte sind die von heute, an ihre damalige Höhenlage gehoben, und
nicht die von damals.

## Neu bauen

Drei Schritte; der erste braucht nur `curl`, der zweite Python und drei Pakete,
der dritte nur Node.

```
cd build
./holen.sh
pip install numpy netCDF4 pyshp
python3 quellen.py
node build.mjs > ../index.html
```

Und danach, weil sonst niemand merkt, dass es die Seite gibt: Eintrag in
`../projects.json` ergänzen und `node ../tools/readme.mjs` laufen lassen.

Die ganze Seite steckt in dieser einen Datei — Höhenmodell, Eisfelder, Ränder,
Skript, Stil. Am Prüfgerüst wiegt sie 706 kB und lädt nichts nach; mit echtem
Gelände wird sie grösser, weil ein echtes DEM in jeder Zelle etwas zu sagen
hat. Die Schraube dafür ist `BREITE` — siehe [METHODIK.md](METHODIK.md),
Abschnitt 9.

Die Kette ohne Daten durchspielen:

```
python3 pruefgeruest.py
ROH=pruefgeruest-roh ZWISCHEN=zwischen-geruest python3 quellen.py
ZWISCHEN=zwischen-geruest node build.mjs --geruest > /tmp/probe.html
```
