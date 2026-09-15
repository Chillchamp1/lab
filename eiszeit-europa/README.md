# Europa unter dem Eis

→ **https://chillchamp1.github.io/lab/eiszeit-europa/**

Eine animierte Reliefkarte Europas durch die letzte Eiszeit: von 26 000 Jahren
vor heute bis in die Gegenwart, das Festland als echtes Gebirgsrelief, darüber
der skandinavische Eisschild, und beides verändert sich über die Zeitachse.

Machart und Bedienung sind von [Deutschland, gezeichnet von seinen
Menschen](../bevoelkerung-kreise/) übernommen. Was genau, und was nicht, steht
in [ASTHETIK.md](ASTHETIK.md) — das ist der Befund, aus dem alles Weitere
folgt.

## Der Stand

Alle drei Datensätze liegen unter `data/raw/`, die Karte ist daraus gebaut.
Zwei Dinge sind anders gekommen, als die Aufgabe sie vorgezeichnet hat, und
beide stehen hier, weil sie die Karte verändern:

- **ICE-6G_C kommt bei 1 Grad, nicht bei 10 Bogenminuten.** Die 10'-Variante
  liegt nur bei PMIP4, und deren Zertifikat ist abgelaufen *und* auf einen
  anderen Namen ausgestellt — von einer Umleitung nicht zu unterscheiden. Das
  wird nicht umgangen. Der Server der Arbeitsgruppe in Toronto führt dasselbe
  Modell bei 1°, mit prüfbarer Kette. Was das kostet: die groben Felder liegen
  bei 68 km statt 27 km. Was es **nicht** kostet: das Relief — das kommt aus
  dem 15″-Höhenmodell und ist unverändert. Ausführlich in
  [QUELLEN.md](QUELLEN.md).
- **`Topo_Diff` enthält das Eis.** Die Aufgabe schreibt
  `Paläotopographie = DEM + Topo_Diff` und meint damit den Fels. Gemessen ist
  es die **Oberfläche**: über dem Bottnischen Meerbusen steht bei 21 ka
  `Topo_Diff` = +1845 m bei 2374 m Eis, und die Kruste liegt dort 525 m tiefer
  als heute. Wer addiert, statt abzuziehen, bekommt ein Gebirge aus Fels, wo
  ein Eisschild über eingedrückter Kruste liegt. Siehe unten.

Geprüft wurde die Kette zuerst an einem **Prüfgerüst**, das dieselben
Dateiformate mit erfundenem Inhalt erzeugt (`build/pruefgeruest.py`) — es hat
fünf echte Fehler gefunden. Der Lauf mit den echten Daten hat fünf weitere
gefunden, darunter den mit dem Eis. Alle zehn stehen in
[METHODIK.md](METHODIK.md), weil sie mehr über die Sache sagen als das
Ergebnis.

Erfundenes Gelände kommt nicht durch: `build.mjs` erkennt Gerüstdaten und
**weigert sich**, daraus eine Seite ohne Wasserzeichen zu schreiben.

## Was die Karte zeigt

**Das Relief ist echt, die Bewegung ist rekonstruiert.** Das ist die eine
Konstruktion, auf der alles steht:

    Eisoberfläche(t) = modernes DEM + interpoliertes Topo_Diff(t)
    Fels(t)          = Eisoberfläche(t) − stgit(t)

Das moderne Höhenmodell hat 15 Bogensekunden — rund 460 Meter. ICE-6G_C hat
ein Grad, am 53. Breitengrad also rund 67 Kilometer; die Alpen wären darin ein
Hügel. Deshalb trägt das feine DEM die Berge, und vom groben Modell kommt
**nur das Differenzfeld**: die isostatische Absenkung unter dem Eis, die
Hebung danach, der Meeresspiegel — und die Eismächtigkeit, die gleich wieder
abgezogen wird. Bikubisch hochgerechnet und aufaddiert. So bleiben Alpen,
Skandinavisches Gebirge, Karpaten und Mittelgebirge in voller Auflösung,
während sich Krustenlage, Küstenlinie und Eisrand mitbewegen.

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
einen Anteil an den 69 Sekunden, der Dauer und Umschichtung mischt — das
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
in dreiunddreissig Scheiben geschnitten und versetzt übereinandergelegt, jede
Scheibe eine Höhenstufe, jede Stufenkante eine Höhenlinie. Die Scheiben stehen
dabei auf **absoluten Höhen** und der Rahmen fest — nach dem höchsten Punkt zu
rechnen, der gerade dasteht, schrumpfte die Karte in dem Mass, in dem der
Eisschild wächst, und zwei Bilder wären nicht mehr vergleichbar.

## Der Rahmen

**5 370 × 5 250 km** um 53° N / 15° O, in einer flächentreuen Lambert-Azimutal-
projektion — dieselbe Familie wie in der Vorlage. Der Rahmen ist ein Rechteck
in *Kilometern*, nicht in Grad.

Das war einmal anders, und es sah danach aus. Ein Grad-Rechteck (12° W … 45° O,
34 … 72° N) hat unter einer flächentreuen Projektion kein rechteckiges Bild:
31 Prozent der Leinwand blieben leer, und die Karte stand als Tortenstück da.
Die Projektion konnte nichts dafür — nachgemessen liegen alle Kandidaten
gleichauf (Lambert azimutal 68,8 %, EPSG:3035 67,9 %, Albers 43/65 67,5 %); die
Lücke war die Form des *Fensters*. Ein Atlas schneidet in Kilometern.

Jede Kante hält etwas: Westen Island und den ostgrönländischen Schelf, Osten
das Kaspische Meer und die Obmündung, Süden gerade noch Sizilien und Tarifa,
Norden Franz-Josef-Land. Der Norden ist der Grund für das Ganze:
das alte Fenster schnitt ein Viertel der DATED-1-Ränder ab — und mit ihnen den
**barentsisch-karischen Eisschild**, der auf einem Schelfmeer lag und so gross
war wie der skandinavische. Der Rahmen hält jetzt 96,8 Prozent der Ränder
statt 71,8.

In Grad greift er von 64,3° W bis 97,6° O und von 31,0° bis 83,9° N; in den
Ecken stehen Grönland, Spitzbergen, Sewernaja Semlja und Westsibirien. Die
Breitenkreise laufen weiter gebogen durch das Bild — wie auf jedem
Atlasblatt.

## Daten

- **Eismächtigkeit, Paläotopographie und Krustenbewegung** — Peltier, W. R.,
  Argus, D. F. & Drummond, R. (2015): *Space geodesy constrains ice age
  terminal deglaciation: The global ICE-6G_C (VM5a) model.* Journal of
  Geophysical Research: Solid Earth 120(1), 450–487,
  DOI 10.1002/2014JB011176. Dazu Argus, D. F., Peltier, W. R., Drummond, R. &
  Moore, A. W. (2014): *The Antarctica component of postglacial rebound model
  ICE-6G_C (VM5a).* Geophysical Journal International 198(1), 537–563,
  DOI 10.1093/gji/ggu140. Variante 1 Grad, bezogen über den
  [Server der Arbeitsgruppe](https://www.atmosp.physics.utoronto.ca/~peltier/data.php);
  warum nicht die 10'-Variante, steht in [QUELLEN.md](QUELLEN.md).
- **Eisränder** — Hughes, A. L. C., Gyllencreutz, R., Lohne, Ø. S., Mangerud,
  J. & Svendsen, J. I. (2016): *The last Eurasian ice sheets – a chronological
  database and time-slice reconstruction, DATED-1.* Boreas 45(1), 1–45,
  DOI 10.1111/bor.12142. Datensatz DOI 10.1594/PANGAEA.848117, CC BY 3.0.
- **Modernes Höhenmodell** — GEBCO Compilation Group (2024): *GEBCO 2024 Grid*,
  DOI 10.5285/1c44ce99-0a0d-5f4f-e063-7086abc0ea0f, Variante sub-ice topo,
  15 Bogensekunden. Ersatzweise NOAA NCEI (2022): *ETOPO 2022 15 Arc-Second
  Global Relief Model*, DOI 10.25921/fd45-gt74, Variante surface elevation,
  15 Kacheln. **Benutzt wird ETOPO.** Warum `surface` und nicht `bed` hier
  dasselbe ist, steht in [QUELLEN.md](QUELLEN.md).

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
