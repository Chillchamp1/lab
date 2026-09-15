# Methodik

Gilt für den jetzigen Stand: 48 Zeitscheiben von 26 bis 0 ka, Ausschnitt
12° W … 45° E und 34° N … 72° N. Was von der Vorlage übernommen ist, steht in
[ASTHETIK.md](ASTHETIK.md); welche Quellen geprüft und welche gesperrt waren,
in [QUELLEN.md](QUELLEN.md); was fehlt, in [STAND.md](STAND.md).

Alle Zahlen hier sind **gemessen**, und zwar an der Kette selbst. Weil die
Quellen aus dieser Arbeitsumgebung nicht erreichbar sind, ist der gemessene
Gegenstand teilweise das Prüfgerüst (Abschnitt 8) — wo das so ist, steht es
dabei. Was sich am Gerüst nicht messen lässt, wird auch nicht behauptet.

## 1. Der Ausschnitt und die Projektion

Lambert azimutal flächentreu, Kugel mit R = 6 371,0088 km, zentriert auf
**53° N / 15° O**. Dieselbe Projektionsfamilie wie in der Vorlage, nur auf
diesen Ausschnitt gesetzt; die Mitte liegt im Schwerpunkt des Fensters und
damit dort, wo die Verzerrung am kleinsten ist — mitten im skandinavischen
Eisschild.

### Warum ein Drittel des Bildes leer ist

Das Fenster ist ein Längen-Breiten-Rechteck, sein Bild unter einer
flächentreuen Projektion ist keines. Der Rahmen wird deshalb am **dicht
abgetasteten Rand** gemessen, nicht an den vier Ecken: in einer azimutalen
Projektion sind die Ecken nicht die Extrempunkte.

Was dabei herauskommt, ist unvermeidlich und wurde gemessen, Anteil des
Bildrechtecks innerhalb des Fensters:

| Projektion | bedeckt |
|---|---|
| **Lambert azimutal 53 N / 15 O** | **68,8 %** |
| Lambert azimutal 52 N / 10 O (EPSG:3035) | 67,9 % |
| Albers 43/65 | 67,5 % |
| Albers 40/68 | 67,4 % |
| Albers 45/62 | 67,8 % |

Alle gleichauf: die Lücke ist die Form des Fensters, nicht die Wahl der
Projektion. 38 Grad Breite auf 57 Grad Länge lassen sich flächentreu nicht in
ein Rechteck legen. Eine zylindrische flächentreue Projektion täte es —
und stauchte Skandinavien bei 72° N auf 29 Prozent seiner Proportion. Für eine
Karte, deren Gegenstand ein skandinavischer Eisschild ist, ist das keine
Option.

Also bleibt es bei der azimutalen, und der Rest wird **maskiert** statt
gefüllt. Das ist die Machart der Vorlage — draussen ist die Leinwand
durchsichtig — und sieht aus wie ein Atlasblatt mit gebogenen Breitenkreisen.

Bezahlt wird dafür **nichts**: das Höhenmodell wird zeilenweise nur über seinen
gültigen Abschnitt kodiert, ein Anfang und ein Ende je Zeile.

### Die zeilenweise Hülle

Dass ein Anfang und ein Ende je Zeile reichen, setzt voraus, dass der gültige
Teil einer Zeile zusammenhängend ist. **Er ist es nicht.** Unter dieser
Projektion biegen sich die Breitenkreise so, dass eine waagerechte Linie oben
das Fenster verlassen und wieder betreten kann. Nachgezählt: **4 878 Zellen**,
1,4 Prozent der gültigen.

Aufgefüllt wird deshalb bis zur zeilenweisen Hülle. Was dabei dazukommt, ist
kein erfundenes Gelände, sondern echtes DEM knapp ausserhalb des Fensters — ein
Saum an den oberen Ecken, der bis 73,66° N reicht. Die Kennzahlen rechnen
weiter mit dem **strengen** Fenster, damit die Zahlen in den Notizen den
Ausschnitt meinen, den die Aufgabe nennt, und nicht den Saum.

### Das Gitter läuft nach Süden

Zeile 0 ist der Nordrand. Die Leinwand zählt y nach unten, die Projektion nach
Norden; ohne den Dreh stand Skandinavien am unteren Bildrand und das Mittelmeer
oben. Der Dreh gehört ins Gitter und nicht in die Seite — dann stimmen
Höhenmodell, DATED-Linien und Kennzahlen von selbst miteinander überein.

## 2. Das Relief

**Die eine Konstruktion, auf der alles steht:**

    Eisoberfläche(t) = modernes DEM + interpoliertes Topo_Diff(t)
    Fels(t)          = Eisoberfläche(t) − stgit(t)

Die Aufgabe schreibt sie andersherum — `Paläotopographie = DEM + Topo_Diff`,
und das Eis dann obendrauf. Das Ziel ist übernommen, die Formel korrigiert,
und zwar nicht aus Geschmack, sondern nach einer Messung: **`Topo_Diff`
enthält das Eis.**

Über dem Bottnischen Meerbusen steht bei 21 ka `Topo_Diff` = +1845 m bei
2374 m Eismächtigkeit. Wäre das die Kruste, hätte sie sich unter dem Eis um
1845 m **gehoben**; sie liegt aber 525 m tiefer als heute. ICE-6G_Cs `Topo`
ist die Höhe der Oberfläche — Fels, wo keiner liegt, Eisoberfläche, wo Eis
aufliegt —, und `Topo_Diff` erbt das. Über allen Zellen mit mehr als 1500 m
Eis ist der Median von `Topo_Diff` **+1590 m**; wäre es die Kruste, stünde
dort eine negative Zahl. `quellen.py` misst genau das als Probe 1b.

Wer wörtlich addiert, statt abzuziehen, bekommt das Skandinavische Gebirge
bei 21 ka als zweitausend Meter hohen **Fels** und das Eis noch einmal
zweitausendvierhundert Meter darüber. Das sieht nicht kaputt aus. Es sieht
nach einem Gebirge aus — nach einem, das es nie gab.

Ein Grad ist am 53. Breitengrad rund 67 km. Die Alpen wären darin ein Hügel,
das Skandinavische Gebirge ein Wall ohne Täler. Deshalb trägt das feine DEM
die Berge, und vom groben Modell kommt **nur das Differenzfeld**: isostatische
Absenkung, Hebung, Meeresspiegel — und die Eismächtigkeit, die gleich wieder
abgezogen wird. Die ersten drei sind Grössen mit Wellenlängen von hunderten
Kilometern; für sie sind 67 km nicht grob, sondern reichlich.

### Nur aufliegendes Eis

Das grobe `stgit` wird bikubisch hochgerechnet und läuft dabei über den
Eisrand hinaus aufs offene Meer. Ohne Schranke stünde bei 21 ka auf 5 bis 9
Prozent der Eiszellen eine Eisoberfläche **unter** dem Meeresspiegel, die
tiefste 2,8 km darunter.

Die Schranke ist keine Geschmacksfrage. Aufliegendes Eis der Mächtigkeit H
auf einem Grund b < 0 hält sich nur, solange es nicht aufschwimmt:
H ≥ (ρ_w/ρ_i)·(−b) = 1,09·(−b). Seine Oberfläche liegt dann bei
b + H ≥ −0,09·b, also **immer über null**. Eine Eisoberfläche unter dem
Meeresspiegel kann es nicht geben; was die Schranke wegnimmt, ist
ausschliesslich der Überlauf der Interpolation.

### Das DEM wird gemittelt, nicht abgetastet

15 Bogensekunden auf rund 6,8 km Zielzelle ist ein Verhältnis von etwa 1:15 in
jeder Achse. Punktweise abgetastet bekäme man ein Zweihundertfünfundzwanzigstel
der Werte und der Rest wäre Rauschen — und genau die Alpen, um die es geht,
bestehen aus dem, was dabei wegfiele.

Also wird das Quellgitter erst **blockweise gemittelt**, bis seine Zelle
ungefähr so gross ist wie eine Zielzelle, und dann bilinear abgetastet.
Gelesen wird in Streifen: der Fensterausschnitt bei 15" ist über 120 Millionen
Werte und passt nicht als Ganzes in den Speicher.

Bilinear und nicht bikubisch, und das ist Absicht: es wird **herunter**gerechnet,
und dabei überschwingt eine kubische Kurve an der Küste — ein Überschwinger an
der Nulllinie ist auf dieser Karte eine erfundene Insel.

An der Maskenkante wird nur über die gültigen Nachbarn gemittelt. Sonst zieht
die Null von draussen die Küste herunter, und die Karte bekäme ringsum einen
Saum aus Flachwasser, den niemand gemessen hat.

### Das Differenzfeld wird bikubisch hochgerechnet

Catmull-Rom, von Hand statt per scipy — es sind zwanzig Zeilen, und die Regel
des Repos ist, keine Abhängigkeit zu ziehen, die sich in zwanzig Zeilen
schreiben lässt. Catmull-Rom geht durch jeden Stützpunkt: auf den Gitterpunkten
von ICE-6G_C soll genau der Wert stehen, der dort steht, und nicht ein
geglätteter.

Hochgerechnet wird in der **Seite**, nicht beim Bauen. Der Grund ist die
Nutzlast: ein einmal hochgerechnetes Feld spart nichts und wiegt das
Fünfzigfache. Die Seite muss zwischen zwei Zeitscheiben ohnehin interpolieren,
also interpoliert sie im groben Feld und rechnet danach einmal hoch.

Gerechnet wird **separabel** — erst vier Quellzeilen längs strecken, dann quer
mischen —, mit Gewichten, die nur an der Feldgrösse hängen und einmal je
Fenstergrösse entstehen.

### Das grobe Feld liegt projiziert

Beide groben Felder werden beim Bauen auf ein **projiziertes** Grobgitter
gelegt, nicht als Längen-Breiten-Feld durchgereicht. Das nimmt der Seite die
Umkehrung der Projektion je Feldpunkt ab: Grobgitter und Karte liegen
achsenparallel übereinander, und das Hochrechnen ist eine reine Streckung.

Die Teiler sind nicht geraten:

| Feld | Teiler | Zelle | Begründung |
|---|---|---|---|
| `Topo_Diff` | 10 | rund 68 km | Die kürzeste wirkliche Wellenlänge setzt die Biegesteifigkeit der Lithosphäre; sie liegt über hundert Kilometern. |
| `stgit` | 10 | rund 68 km | Die Eismächtigkeit hätte gern mehr, bekommt aber nicht mehr, als die Quelle hat. |

Die Teiler stehen nicht als Zahlen im Quelltext, sondern werden **aus der
Quellzelle gerechnet**: `quellen.py` misst, wie gross eine Zelle der
ICE-6G_C-Datei am Fenstermittelpunkt wirklich ist, und lässt kein Grobgitter
feiner werden als sie. Mit der 1°-Variante sind das 67 km und damit Teiler 10;
läge eines Tages die 10'-Variante unter `data/raw/`, wären es 18 km und
Teiler 3, ohne dass eine Zeile zu ändern wäre. Ein Grobgitter feiner als seine
Quelle behauptet eine Schärfe, die in den Zahlen nicht steht.

## 3. Die Küstenlinie

Aus der **Nulllinie der gerechneten Paläotopographie**, nicht aus `sftlf`.

Das ist nicht nur die Vorgabe, es ist auch der Punkt, an dem diese Karte
zusammenhält. `sftlf` ist ein Flächenanteil auf 67 km — eine Küste daraus hätte
die Auflösung eines Rasters, in dem die ganze Doggerbank vier Zellen breit ist,
und sie widerspräche dem Relief, das daneben in voller Auflösung steht.

Aus der Nulllinie gezogen ist die Küste **dieselbe Zahl wie das Relief**. Damit
gilt der Satz der Vorlage auch hier: Farbe, Licht und Höhenlinie kommen aus
einer einzigen Zahl. Die Null ist eine Bandgrenze der Farbleiter, also ist die
Küstenlinie eine Höhenlinie wie jede andere — nur kräftiger gezeichnet.

`sftlf` und `stgif` werden trotzdem gelesen: sie sind die Gegenprobe.

## 4. Die Farbleitern

Zwei, eine je Material, und das ist der einzige Punkt, an dem diese Karte
bewusst mehr hat als die Vorlage. Dort ist die eine Leiter ein Stolz; hier
liegen zwei physisch verschiedene Oberflächen übereinander. Eine Leiter je
**Material** ist dasselbe Prinzip — nicht eine je Ansicht.

Beide werden beim Bauen **aus ihrer Beschreibung gerechnet**, wie in der
Vorlage: je Band eine Helligkeit, ein Farbton und die grösste Buntheit, die
sRGB an dieser Stelle noch hergibt, gesucht per Halbierung in OKLCh.

### Das Gestein, in Metern

| | |
|---|---|
| 17 Landbänder × 250 m | 0 … 4 250 m, darüber ein Knie (Mont Blanc 4 808 m) |
| 8 Wasserbänder × 500 m | 0 … −4 000 m, darunter ein Knie |
| **die Null ist eine Bandgrenze** | daran hängt die Küstenlinie |

Land und Wasser bekommen **verschiedene Schrittweiten**, und das ist
Atlaskonvention und keine Nachlässigkeit: die Tiefenlinien eines Seeatlas
stehen weiter als seine Höhenlinien. 250 m an Land lösen die Mittelgebirge auf,
500 m unter Wasser reichen bis auf den Schelf und lassen die Nordsee trotzdem
drei Bänder tief werden.

Oben und unten ein **Knie** statt eines Deckels — übernommen aus der Vorlage,
wo der Deckel der Grund war, warum Berlin kleiner aussah, als es ist: bis zur
letzten Bandgrenze genau linear, darüber weich weiter, die Reserve erst im
Unendlichen. Geklemmt wird nichts, die Reihenfolge der Gipfel bleibt überall
erhalten.

### Das Eis

Zwölf Bänder à 300 m Eisoberfläche. Entsättigtes Blauweiss, sehr enge Buntheit,
Helligkeit als einzige tragende Achse — so liest es sich als anderes Material
und nicht als weitere Höhenstufe.

**Die ganze Rampe liegt hell** (OKLab-Helligkeit 0,840 bis 0,992). Der erste
Wurf lief von 0,62 nach 0,985, also von dunklem Blaugrau ins Weiss — und weil
sie die Eis*oberfläche* färbt, bekam ein dünner Rand auf tiefem Land den
dunkelsten Ton. Das las sich wie grauer Kunststoff, nicht wie Eis: ein
Gletscherrand ist nicht dunkler als seine Kuppe, er ist nur flacher. Jetzt
trägt die Helligkeit nur noch eine Nuance, und die Form macht das Licht.

### Die zweite Leiter, für Rot-Grün-Schwäche

Übernommen samt Begründung. Wasser dunkel nach hell, Land von Braun nach Creme,
oben Weiss; in OKLab nachgerechnet **streng monoton**, kleinster Schritt 0,0266
(die Vorlage: 0,022).

Der erste Wurf war es nicht: das Wasser endete heller (0,52), als das Land
anfing (0,40), und genau an der einen Stelle, an der die Leiter am meisten
leisten muss — der Küstenkante —, fiel die Helligkeit um 0,12. Für die
Atlasleiter ist dieser Sprung Absicht, dort trägt der Farbton die
Unterscheidung. Hier gibt es keinen Farbton, auf den Verlass ist.

`build.mjs` **bricht ab**, wenn die zweite Leiter nicht monoton ist. Eine
Leiter für Farbschwäche, deren Helligkeit irgendwo fällt, taugt nicht dafür,
und das soll kein Bau stillschweigend ausliefern.

## 5. Licht und Höhenlinien

### Die Schattierung wird in die Farbe gerechnet

Lambert von oben links, 40 Grad über der Fläche, `STAERKE = 1,55`, aufgehellt
gegen Weiss (0,55) und abgedunkelt gegen Schwarz (0,70).

**Nicht** als graues Bild mit `soft-light` darübergelegt — und auf dieser Karte
ist das keine Feinheit, sondern die Bedingung dafür, dass man den Eisschild
überhaupt modelliert sieht. Die Rechenvorschrift von `soft-light` enthält den
Faktor C·(1−C), und der ist bei Weiss null: weiches Licht kann Weiss nicht
dunkler machen. Auf einer Oberfläche, deren hellstes Band `#fafafa` ist, käme
davon gar nichts an. `overlay` und `hard-light` haben dieselbe Stelle.

Dazu, beides aus der Vorlage: die **Mulde** — was tiefer liegt als seine weite
Umgebung, bekommt weniger Himmel ab — und der **Schlagschatten** aus einer
flacheren Sonne (16 statt 40 Grad), in einem einzigen Durchgang je Diagonale
mit mitgeführtem Horizont. Zwei Lichter, weil ein Strahl, der steiler abfällt
als der Hang selbst, nie auf Schatten trifft.

Das weite Bezugsfeld für die Mulde entsteht **in Zahlen**, nicht auf der
Leinwand: ein Kastenfilter mit laufender Summe kostet je Bildpunkt dasselbe,
egal wie breit er ist, und zweimal quer angewendet ergibt er einen
Dreieckskern.

### Die Höhenlinien, nach Tanaka Kitiro (1950)

Weiss, wo die Kante der Sonne zugewandt ist, schwarz, wo sie wegfällt.
Verfolgt statt gemalt, zu durchgehenden Linien verkettet, längs geglättet (zwei
Durchgänge eines Dreipunktmittels), in Läufe gleicher Stärke zerlegt und nach
Beleuchtungsstärke gebündelt — zwölf Stufen, hell und dunkel, mit und ohne
Zählkurve, also **achtundvierzig Züge** für die ganze Karte.

**Zwei Durchgänge, weil zwei Materialien übereinanderliegen:** die
Gesteinslinien auf den Bandgrenzen der Gesteinsleiter, dort wo kein Eis liegt;
die Eislinien auf denen der Eisleiter, dort wo welches liegt. Eine Zelle, deren
vier Ecken nicht alle im selben Material liegen, wird übersprungen. Jede
Höhenlinie ist damit eine Farbgrenze und jede Farbgrenze trägt ihre Linie —
genau wie in der Vorlage, nur zweimal.

Die Buchhaltung wird einmal angelegt und über alle Niveaus **und alle Bilder**
wiederbenutzt, mit fortlaufendem Stempel statt Leeren.

### Der Eisrand als eigene Linie

Eine ruhige, neutral blaugraue Linie auf der Schwelle der Eismächtigkeit
(12 m). Sie gehört nicht zu den drei DATED-Linien und darf deshalb nicht wie
sie aussehen.

Ohne sie steht das Eis als weisse Fläche ohne Kante auf dem Gestein — und der
Betrachter hält die orange Linie für den Rand des gezeichneten Eises, was sie
nicht ist. Die eine ist Modell, die andere Datierung, und **wo sie
auseinanderlaufen, ist das der Befund.**

## 6. Das Unsicherheitsband

Die drei DATED-1-Linien je Zeitscheibe: *most-credible* kräftig in Creme,
*maximum* und *minimum* als halbtransparentes Band dazwischen.

Gezeichnet als Fläche zwischen den beiden Linien — beide sind geschlossene
Umrisse, also geht das mit der Nichtnull-Regel: maximum füllen, minimum mit
`evenodd` wieder herausnehmen.

**Beschnitten auf die Silhouette der Karte.** Die Ränder reichen weiter als der
Ausschnitt, und ein Eisrand, der über den Kartenrand hinaus ins Schwarze läuft,
sieht aus wie ein Fehler. Die Silhouette steht dabei ohne Rechnen da: das DEM
ist ja zeilenweise über genau einen Abschnitt kodiert, links die Anfänge,
rechts die Enden.

**Gekippt liegen die Ränder auf der Oberfläche**, nicht auf dem Boden: sie
werden um dieselbe Zahl Scheiben angehoben, um die der Stapel an dieser Stelle
aufragt. Auf dem Boden gezeichnet hängt die Linie unter dem Eisschild, den sie
begrenzt — geometrisch richtig für eine Bodenmarke, als Karte aber unlesbar,
denn die Linie sagt ja gerade, wo die weisse Fläche aufhört.

**Zwischen zwei Rekonstruktionen wird nicht interpoliert.** DATED-1 gibt es
alle 1 000 Jahre von 25 bis 10 ka; gezeigt wird die nächstgelegene, wenn sie
höchstens 500 Jahre entfernt ist, und sonst keine. Eine Linie, die zwischen
zwei Datierungen schwebt, wäre eine Behauptung, die niemand aufgestellt hat.

## 7. Die Zeitachse

48 Zeitscheiben: 26 bis 21 ka in 1-ka-Schritten, 21 bis 0 ka in 0,5-ka-
Schritten. Das ist die Datenlage, und sie wird nicht geglättet.

**Sie ist in der Oberfläche ablesbar**: unter der Zeitleiste steht ein Strich je
Zeitscheibe, kräftiger für die vollen Jahrtausende — in der zweiten Hälfte der
Bahn stehen sie doppelt so dicht. Eine zweite Reihe in Orange markiert die
sechzehn DATED-1-Rekonstruktionen. Über der Karte steht dazu, ob man auf einer
Zeitscheibe steht oder zwischen zweien.

### Linear interpoliert, mit Absicht

Die Vorlage rechnet mit einer monotonen kubischen Kurve (Fritsch–Carlson) und
begründet das mit einem gemessenen Knick von **74 Prozent** an jeder ihrer
ungleich verteilten Zählungen; sie zahlt dafür im Mittel 0,75 Prozent
Abweichung von der Geraden.

Hier sind die Schritte gleichmässig — 1 ka, dann 0,5 ka —, der Knick ist klein,
und der Preis wäre, dass die Kurve zwischen zwei Datenpunkten etwas behauptet.
Die Aufgabe sagt es selbst: kein Glätten über die Datenlage hinweg, das ist
eine Rekonstruktion und keine Simulation.

Die einzige Stelle, an der sich die Frage stellen könnte, ist der Wechsel der
Schrittweite bei 21 ka. Dort ändert sich die Geschwindigkeit je Sekunde
sprunghaft — aber das ist eine Eigenschaft der Zeitachse (Abschnitt 7.2), nicht
der Interpolation.

### Die Uhr läuft über Spielzeit

Jeder Abschnitt bekommt einen Anteil an den 90 Sekunden, der **Dauer und
Umschichtung** mischt: das geometrische Mittel aus seinem Anteil an den Jahren
und seinem Anteil an der Summe aller Änderungen des Eisvolumens. Dazu eine
Untergrenze von 55 Prozent des Gleichanteils — darunter ist ein Abschnitt
vorbei, ehe seine Notiz gelesen ist.

Ohne das liefe der Zusammenbruch des Eisschildes zwischen 16 und 11 ka in einem
Fünftel der Zeit ab, während die ruhigen fünftausend Jahre vor dem Hochstand
ein Viertel bekämen. Dasselbe Verfahren wie in der Vorlage, nur mit Eisvolumen
statt Menschen.

Der Regler misst entsprechend Spielzeit, und die Marken sitzen dort, wo die
Zeitscheiben im Ablauf liegen. Die Jahreszahl zeigt weiter das wirkliche Jahr.

### Der Meeresspiegel-Ticker

Unten mitlaufend, relativ zu heute, als Kurve über die Spielzeit mit Zeiger.

Er kommt aus demselben Feld wie alles andere. `Topo` ist die Höhe über dem
**damaligen** Meeresspiegel; über tiefem Ozean ohne nennenswerte
Krustenbewegung gilt deshalb

    Topo_Diff = Topo(t) − Topo(0) = −Meeresspiegeländerung

Genommen wird der Median über den äquatorialen Pazifik (20° S bis 20° N,
170° W bis 120° W, nur Punkte tiefer als −3 000 m), weit weg von allen
Eisschilden und ihren Vorwölbungen. **Das ist die einzige Stelle, an der diese
Karte etwas ausserhalb ihres Ausschnitts liest** — die Zahl steht sonst
nirgends in den Dateien.

## 8. Das Prüfgerüst, und was es gefunden hat

Solange keine der drei Quellen erreichbar war, wäre die ganze Kette
ungetesteter Code gewesen. Inzwischen liegen alle Rohdaten da — das Gerüst
bleibt trotzdem, weil es die Kette in Sekunden durchmisst, wo der echte Lauf
zwanzig braucht, und weil es Fälle stellen kann, die in den echten Daten nicht
vorkommen.

`build/pruefgeruest.py` erzeugt einen vollständigen Satz Eingangsdateien in den
**echten Dateiformaten**: ein DEM als NetCDF-4 bei 30", 48 ICE-6G_C-Scheiben
als globales NetCDF-3 classic bei 10' mit `Topo`, `Topo_Diff`, `stgit`, `sftlf`
und `sftgif`, und DATED-1-Linien als Shapefiles. `Topo` trägt dort das Eis,
genau wie in den echten Dateien — ein Gerüst, das eine andere Konvention
nachbaut als die Quelle, prüft eine Kette, die es nicht gibt. Der Inhalt ist erfunden:
Gausskuppen ungefähr dort, wo in Europa wirklich etwas steht, und ein
Eisschild, der aufwächst, einen Hochstand hält und zusammenbricht.

Zwei Sicherungen dagegen, dass daraus je eine veröffentlichte Karte wird: es
schreibt nach `build/pruefgeruest-roh/` und nie nach `data/raw/`, und jede
Datei trägt ein globales Attribut, das `quellen.py` weiterreicht und `build.mjs`
prüft. **Ohne `--geruest` bricht der Bau ab**; mit `--geruest` trägt die Seite
ein Wasserzeichen, das man nicht übersehen kann.

### Fünf Fehler, die es gefunden hat

Sie stehen hier, weil sie mehr über die Sache sagen als das Ergebnis. Was der
Lauf mit den **echten** Daten dann noch gefunden hat, steht in Abschnitt 8b —
und das war der grössere Fang.

**1. Die Karte stand auf dem Kopf.** Die Projektion zählt y nach Norden, die
Leinwand nach unten. Skandinavien lag am unteren Bildrand. Behoben im Gitter,
nicht in der Seite — dann stimmen Höhenmodell, Ränder und Kennzahlen von selbst
überein.

**2. Die Gegenprobe verglich die falschen Dinge.** Sie hielt `DEM + Topo_Diff`
gegen `Topo` auf dem *feinen* Gitter und bekam für jede Zeitscheibe dieselben
49 m — das war nicht die Prüfung, sondern der Auflösungsunterschied zweier
Datensätze. Jetzt prüft sie die Identität, die wirklich gelten muss:
`Topo(t) − Topo(0) − Topo_Diff(t) = 0`, auf dem Quellgitter, ohne jede
Interpolation. Am Gerüst **0,000 m**. Diese Probe fängt genau die beiden
Fehler, die man hier wirklich macht: ein vertauschtes Vorzeichen und einen
falschen Bezugszeitpunkt. Beides sieht man dem Bild nicht an — es sieht nur
falsch aus, und zwar plausibel falsch. An den echten Daten musste sie dann
umgeschrieben werden, siehe Abschnitt 8b.

**3. Kein einziges DATED-1-Shapefile wurde zugeordnet.** Der reguläre Ausdruck
für die Jahreszahl griff die `1` aus `DATED-1` statt der `10` aus `10ka`. Beim
Nachbessern schlug die Wortgrenze `ka\b` fehl, weil auf `10ka_maximum` ein
Unterstrich folgt — und der ist ein Wortzeichen. Aufgefallen ist beides nur,
weil die Zählung am Ende „0 zugeordnet, 48 nicht" sagte. **Eine Schleife, die
still nichts findet, braucht einen Zähler.**

**4. Das DEM wurde über dem falschen Bereich gelesen.** Es wurde auf das
Fenster beschnitten, die zeilenweise Hülle reicht aber 1,7 Grad darüber hinaus.
4 196 Zellen bekamen dadurch keinen Wert — und dort hätte Meereshöhe gestanden,
wo nichts gemessen ist. Behoben durch die Reihenfolge: erst die Hülle, dann das
DEM für die Hülle.

**5. Die DATED-Linien lagen weit ausserhalb der Leinwand.** Der Packer setzt
die Delta-Kette je Linie zurück, der Entpacker nicht; die Koordinaten
summierten sich über alle Linien auf, der erste Punkt lag bei Gitter 23 061
statt bei 400. Gezeichnet wurde alles korrekt — nur eben woanders.

Dazu zwei Sachen, die keine Fehler der Kette waren, sondern des Gerüsts: seine
Feinstruktur hatte elf Schwingungen je Längengrad und damit gut eine je Zelle,
also reines Aliasing, und die Karte trug ein Gitternetz aus Höhenlinien, das
wie ein Zeichenfehler aussah. Und sein DEM reichte bis 74° N, die Hülle bis
73,66° — knapp daneben ist auch vorbei.

### Was das Gerüst nicht prüft

Die Zahlen. Ob ICE-6G_Cs `Topo_Diff` wirklich so heisst, ob seine Breitenachse
auf- oder absteigt, ob PANGAEA die Shapefiles so benennt, wie hier vermutet —
all das steht erst fest, wenn die echten Dateien da sind. Deshalb liest
`quellen.py` Variablennamen **fallunabhängig und mit Alternativen**, dreht die
Längenachse selbst zurecht, wenn sie von 0 bis 360 läuft, und meldet jede
Zuordnung, die nicht gelingt, mit Zähler.

## 8b. Was der Lauf mit den echten Daten gefunden hat

**1. `Topo_Diff` enthält das Eis.** Der grosse Fang, ausführlich in
Abschnitt 2. Aufgefallen ist er nur, weil Probe 1 an den echten Daten nicht
null war und die Untersuchung dieser Abweichung bei der Frage endete, was
`Topo` überhaupt ist. Ohne Probe wäre die Karte fertig geworden — und falsch,
auf eine Art, die kein Betrachter hätte sehen können.

**2. Probe 1 ist an den echten Daten nicht null, und das ist richtig so.**
`max |Topo(t) − Topo(0) − Topo_Diff(t)|` steht im Fenster bei **584 m**. Die
Erklärung steht im Kopf der Datei: `Topo` trägt den Zusatz „(Point-value
altitude)", `Topo_Diff` trägt ihn nicht. Wo das Differenzfeld **innerhalb
einer Zelle** eine Stufe hat — am Eisrand, an einer wandernden Küste, in der
Antarktis an der Aufsetzlinie —, sind ein Stichwert im Zellmittelpunkt und ein
Zellmittel zwei verschiedene Zahlen.

Gemessen ist das so scharf, wie man es sich wünscht: an allen Zellen, deren
Land- und Eisanteil sich gegenüber heute **nicht** geändert hat, liegt die
Abweichung quer durch alle 48 Scheiben unter **2,6 m** — ausdrücklich auch
über den Alpen, wo das Gelände schroff ist, das Differenzfeld aber glatt. An
den übrigen 28 Prozent der Zellen wird sie dreistellig. Und sobald in Europa
kein Eis mehr liegt (ab 9,5 ka), fällt sie über dem **ganzen** Fenster unter
1,4 m und von da an monoton auf null.

Die Probe prüft deshalb jetzt die stufenfreien Zellen scharf und meldet die
übrigen daneben. Weicher ist sie dadurch nicht: ein vertauschtes Vorzeichen
und ein falscher Bezugszeitpunkt schlagen global durch und fänden dort kein
Versteck.

**3. Das Eis lief beim Hochrechnen aufs offene Meer.** Bei 21 ka stand auf 5
bis 9 Prozent der gezeichneten Eiszellen eine Eisoberfläche unter dem
Meeresspiegel, die tiefste 2,8 km darunter. Behoben mit der
Aufschwimm-Schranke aus Abschnitt 2.

**4. DATED-1 reicht weiter als die Karte.** Die Rekonstruktion deckt die
eurasischen Eisschilde bis Taimyr und über 80° N; der Ausschnitt endet bei
45° O und 72° N. Flach schnitt die Silhouette das weg, gekippt hing ein
Eisrand über der Barentssee im Schwarzen — ein Punkt nördlich des Fensters
wird beim Anheben auf die oberste Gitterzeile geklemmt und bekommt deren Höhe.
Beschnitten wird jetzt in den Daten (Sutherland-Hodgman gegen das
Gitterrechteck, vor dem Vereinfachen, damit die Ringe geschlossen und die
Bänder füllbar bleiben), und die dabei entstehende Schnittkante wird nie
gestrichelt: sie ist kein Eisrand. Nebenbei 15 917 → 11 178 Punkte.

**5. Das Layout rechnete mit einem hochkanten Ausschnitt.** Die Vorlage nagelt
ihre Bühne auf `100dvh`; ihr Ausschnitt ist Deutschland. Dieser hier ist
Europa von 12° W bis 45° O, also breiter als hoch — auf einem hochkant
gehaltenen Telefon füllte die Karte 48 Prozent des Feldes, der Rest war
schwarz, die Notiz lag hinter der Karte und war zu zwei Dritteln verdeckt, und
die Marken der Farbleiter klebten ineinander. Behoben: das Feld hält das
Seitenverhältnis der Karte, die Bühne schrumpft mit, die Notiz wandert unter
640 px unter die Karte, und die Marken der Leiter werden **gemessen** und bei
Berührung ausgedünnt, statt nach einer geratenen Schwelle.

## 8c. Die Schrägsicht: wie hoch der Stapel steht

Die Schrägsicht ist ein Laserschnittmodell — das Feld wird in Höhenscheiben
geschnitten und versetzt übereinandergelegt. Zwei Dinge daran waren falsch, und
beide fielen erst am fertigen Bild auf.

### Die Überhöhung war eine geratene Zahl

Sie stand als Anteil der Feldhöhe: `hoch = hoehe × 0,30`. Das sagt über das
Gelände nichts. Dieselbe Zahl macht aus einem Tiefland einen Teller und aus den
Alpen einen Nadelwald — und genau das war zu sehen: jede Bergspitze ein Turm,
der Eisschild eine Wand.

**Die Metrik, die an ihre Stelle tritt,** misst, was schiefgeht. Bei einem
Laserschnittmodell ist das das Verdecken: steht die Wand einer Platte höher, als
die Terrasse darunter tief ist, sieht man von der Terrasse nichts mehr.

    λ(g) = tan(φ) · g · px_v / px_h

mit *g* der Geländesteigung in Metern je Gitterzelle, *px_v* den Bildpunkten je
Meter Höhe, *px_h* den Bildpunkten je Gitterzelle, *φ* der Kippung. λ < 1 heisst:
die Terrasse bleibt sichtbar.

Ausgelegt wird auf die stärkste Kippung — dort verdeckt es am meisten — und auf
den Hang, der das Gebirge ausmacht. Gemessen wird er in `quellen.py` über alle
48 Zeitscheiben, auf genau dem Feld, das die Seite zeichnet:

| Quantil der Steigung | m je 6,83-km-Zelle | Neigung |
|---|---|---|
| p50 | 20,3 | 0,30 % |
| p75 | 66,0 | 0,97 % |
| **p90** | **173,4** | **2,54 %** |
| p99 | 547,4 | 8,01 % |
| p100 | 2 180,7 | 31,9 % |

Genommen wird **p90**: unterhalb davon liegt das Flachland, das ohnehin flach
aussieht; oberhalb liegen die einzelnen Steilkanten, nach denen man nicht
auslegen kann, ohne alles andere platt zu drücken. Die Zahl reist als `D.g90`
in der Nutzlast mit, die Seite rechnet daraus

    hoch = λ · px_h · (S_BIS − S_VON) / (tan(φ_max) · g90)

**Der Zielwert λ ist am Bild festgelegt, nicht gerechnet.** Die Metrik sagt, was
gemessen wird, nicht wo die Grenze des guten Geschmacks liegt. Gerendert und
verglichen:

| λ | Überhöhung | Anteil der Feldhöhe | Bild |
|---|---|---|---|
| 13 | 273-fach | 0,30 | der alte Zustand: Nadelwald, der Eisschild eine Wand |
| 6 | 126-fach | 0,14 | die Alpen fangen wieder an zu zacken |
| **4** | **84-fach** | **0,09** | **Gebirge bleiben Gebirge, der Eisschild ist eine Kuppel** |
| 2,6 | 55-fach | 0,06 | die Mittelgebirge verschwinden |

84-fach ist immer noch viel. Die Karte ist 4 400 km breit und 5 km hoch: bei 1:1
wäre der Eisschild einen halben Bildpunkt dick. Eine Schrägsicht auf einen
Kontinent kommt ohne starke Überhöhung nicht aus — sie sollte nur eine gemessene
sein und keine geratene.

### Eine Platte hatte eine Farbe zu wenig

Eine Platte ist eine Höhenstufe, und eine Höhenstufe hat eine Farbe. Welche —
Gestein oder Eis — wurde danach entschieden, was auf dieser Höhe über die ganze
Karte überwiegt. Bei 1 400 m liegen aber die Alpen **und** der Eisschild, und wer
von beiden mehr Zellen hatte, färbte den anderen mit: **der Gletscher bekam
grüne Wände, die Alpen weisse.** Auf einem Bild, das Fels und Eis trennen soll,
ist das der eine Fehler, den es nicht geben darf.

Jetzt wird je Höhe zweimal geschnitten — einmal über das ganze Feld, einmal nur
über die Eiszellen — und in dieser Reihenfolge gemalt. Der Eisring ist per
Konstruktion eine Teilmenge des Felsrings, liegt also genau dort darüber, wo Eis
liegt. Das ist dasselbe „Eis gewinnt, wo es liegt" wie in der flachen Sicht, nur
in drei Dimensionen.

Gekostet hat es 126 statt 98 ms je Bild; der Eisstapel überspringt dafür die
Höhen, in denen kein Eis liegt, und fällt ganz weg, sobald keines mehr da ist
(96 ms bei 0 ka).

### Und die Lichtebene lag schief

Die Schattierung wird nicht ueber die Karte gemalt, sondern in eine eigene
Ebene im Feldgitter gebaut und am Ende in einem Stueck mit `soft-light`
aufgelegt — so macht es die Vorlage, und die Kosten sitzen in den Blits, nicht
im Bild.

Nur wurde das Lichtbild dort mit der **Einheitsmatrix** gezeichnet, waehrend
der Ausschnitt, auf den es geschnitten wurde, die gedrehte und gekippte Sicht
war. Flach faellt das kaum auf. Gedreht liegt die ganze Schattierung schief
ueber dem Relief: die Hell-Dunkel-Struktur bleibt stehen, waehrend sich die
Karte darunter dreht — am auffaelligsten im Wasser, wo die Terrassen fein sind
und das falsche Licht wie eine Textur wirkt, die nicht mitdreht.

Das Lichtbild nimmt jetzt denselben Weg wie das Gelaende, dessen Licht es ist:
erst ins Grundriss-Mass (mal kw/rW, plus kx), dann durch die Sichtmatrix. Dazu
zwei Dinge, die derselbe Fehler verdeckt hatte:

- **Der Massstab der Lichtebene** war rW/kw statt rW/breite, und der Versatz
  der Karte steckte mit drin. Solange die Karte die Leinwand ausfuellt, ist das
  dasselbe; sobald sie es nicht tut — ein breites Fenster, die Buehne
  gedeckelt —, lag das Licht daneben.
- **Ein grauer Saum um die Karte.** `soft-light` rechnet mit dem Untergrund;
  wo der durchsichtig ist, gibt die Formel die Quelle unveraendert zurueck, und
  die ist hier ein mittleres Grau. Der Lichtstapel wird im Feldgitter
  geschnitten, also bei einem Viertel der Leinwandbreite, und ein grob
  gerasterter Rand deckt Punkte, die die feine Farbe daneben nur halb fuellt.

  Gegen den Saum wurde dreierlei gemessen: die Ebene um einen Punkt schrumpfen
  (half halb), um zwei (half etwas mehr), ohne Glaettung hochrechnen (machte
  Bloecke daraus). Was hilft, ist derselbe Umriss in voller Aufloesung: die
  Ringe werden beim Malen mitgesammelt und schneiden den Blit. Die
  naheliegende Loesung — die fertige Karte als Maske hineinblitten — kostete
  **110 ms je Bild**: die grosse Leinwand zurueckzulesen haelt die Pipeline an.

Und weil das Licht nun richtig lag, wurde ein dritter Fehler sichtbar: zwischen
zwei Platten blieb ein Spalt offen, wo die Ringe weit auseinanderliegen — an
steilen Kuesten. Die Wand wurde mit einem einzigen Strich gemalt, sobald die
Platten duenn genug waren. Jetzt sind es mindestens zwei.

### Der Rahmen der Platten, und was darunter fehlte

Der Scheibenstapel lief von −1000 bis 3800 m. Alles darunter hatte keine
Platte, also auch keine Farbe: **neunzehn Prozent der Karte** — der ganze
Atlantik, das ganze Mittelmeer, die Norwegische See — standen gekippt als
schwarze Löcher da, während sie flach in vier Blautönen lagen.

Der Rahmen ist jetzt **die Farbleiter**: von der untersten Bandgrenze
(−4000 m) bis zur obersten (4250 m), und die Plattendicke ist die Landstufe
(250 m). Weil ein Wasserband genau zwei Landstufen misst, fällt damit jede
Bandgrenze auf eine Plattenkante — Farbe, Höhenlinie und Plattenrand sind
dieselbe Zahl. Das ist der Grundsatz der Karte, der bisher nur flach galt.

Die zwei Prozent, die tiefer liegen als die unterste Bandgrenze, liegen auf
einem **Sockel**: die ganze Kartenfläche in der Farbe des tiefsten Bandes,
genau wie sie in der Farbleiter im untersten Band liegen.

Kosten: 33 Platten statt 26, also 162 statt 132 ms je Bild gekippt.

### Zwei Farbentscheidungen, beide gemessen

**Das tiefste Wasserband** lag bei einer Helligkeit von 0,22. Auf dem fast
schwarzen Seitengrund war der Atlantik davon nicht zu unterscheiden, und das
Mittelmeer las sich als Loch in der Karte. Jetzt 0,33 — immer noch das
dunkelste Blau der Leiter, aber vom Grund getrennt.

**Die Eisleiter läuft jetzt nach oben blauer**, vom fast weissen Randeis ins
Eisblau der Kuppe, und ihre Helligkeit fällt dabei. Das läuft der
Atlaskonvention zuwider, und das ist hier richtig: die Gesteinsleiter daneben
wird nach oben heller; liefen beide gleich, stiessen sie an ihrem hellen Ende
aneinander. So trennt schon die Richtung der Helligkeit die Materialien.

Dazu zwei Messungen, ohne die die Leiter nicht gegriffen hätte:

| | |
|---|---|
| höchste Eisoberfläche im Fenster | **2 798 m** |
| Leiter reichte bis | 3 600 m (12 × 300 m) |
| Folge | die obersten drei Bänder — die kräftig blauen — kamen in keinem Bild vor |
| jetzt | 12 × **250 m** = 3 000 m, dieselbe Stufe wie beim Land |

Und die Stützstellen der Leiter liegen **nicht** gleichmässig: ein Eisschild
ist eine flache Kuppel, die Hälfte seiner Fläche liegt unter einem Drittel
seiner Höhe (bei 22 ka: Median 804 m, 90 Prozent unter 2 081 m). Eine lineare
Bahn liesse die halbe Fläche im blassen Teil der Leiter.

## 9. Kodierung und Nutzlast

Grundlage ist der Zickzack-Varint der Vorlage im selben 64-Zeichen-Alphabet.
Dazu kommt **eine** Erweiterung: eine Null trägt die Zahl der Nullen hinter
sich. Die Felder dieser Karte sind Zeitableitungen — ausserhalb des Eisschildes
ändert sich über eine halbe Jahrtausendscheibe gar nichts.

Welche Form genommen wird, entscheidet die Messung, nicht das Gefühl: beide
werden gepackt und die kürzere gewinnt, je Feld.

Gemessen am **echten** Datensatz, bei Gitterbreite 760:

| | Werte | roh |
|---|---|---|
| DEM, 10 m je Stufe | 343 893 | 360 kB |
| `Topo_Diff`, Teiler 10, 2 m je Stufe | 233 472 | 189 kB |
| `stgit`, Teiler 10, 10 m je Stufe | 233 472 | 37 kB |
| DATED-1, 11 178 Punkte | | 37 kB |
| **Nutzlast zusammen** | | **628 kB** |
| **fertige Seite** | | **706 kB**, gzip 345 kB |

Zum Vergleich dieselbe Messung am Prüfgerüst: Nutzlast 634 kB, Seite 709 kB,
gzip **169 kB**. Roh fast gleich, gzip doppelt — genau wie vorhergesagt: die
rohe Grösse hängt an der Zahl der Werte, die komprimierte an ihrer Entropie,
und erfundenes Gelände aus ein paar Gausskuppen hat wenig zu sagen. Echtes
Gelände hat in jeder Zelle etwas zu sagen.

Die Schraube, falls die Seite zu schwer wird, ist `BREITE`: 640 statt 760
kostet ein Drittel der DEM-Werte und liegt immer noch über dem Reliefgitter.
Bei 345 kB gzip für eine Reliefkarte Europas mit 48 Zeitscheiben ist sie
nicht nötig.

Dass `stgit` von 253 auf 37 kB fiel, liegt nicht am Packen, sondern am
gröberen Teiler — und daran, dass echtes Eis ausserhalb Skandinaviens
tatsächlich null ist, wo das Gerüst überall ein bisschen etwas hatte. Die
Nullläufe greifen dort voll.

### Was beim DEM gemessen wurde

Die rohe Grösse ist von der Vorhersage fast **unabhängig** — ein
Varint-Zeichen je Wert, ganz gleich wie klein der Rest ist. Auf der Leitung
nach gzip aber nicht:

| Vorhersage | roh | gzip |
|---|---|---|
| Zeilendelta | 472 kB | 149 kB |
| Mittel aus links und oben | 472 kB | 124 kB |
| **links + oben − links-oben** (Paeth) | **472 kB** | **115 kB** |

Die Vorhersage ist also fürs Ausliefern da, nicht für die Datei.

Und die Quantisierung ändert an der rohen Grösse ebenfalls fast nichts
(5 m: 481 kB, 10 m: 472, 25 m: 472) — also wird die **feinere** genommen: 10 m
kosten dasselbe wie 25 und halten die Höhenlinien glatt.

### Warum die groben Felder projiziert und geteilt sind

Gemessen, `Topo_Diff` als Raumdelta je Scheibe auf dem Längen-Breiten-Gitter:

| Gröbung | Werte | roh |
|---|---|---|
| 10' (360 × 246) | 4 250 880 | 925 kB |
| 20' (180 × 123) | 1 062 720 | 280 kB |
| 30' (120 × 82) | 472 320 | 136 kB |

(Am Gerüst gemessen, das bei 10' liegt. Mit der 1°-Quelle steht die Frage gar
nicht mehr: dort ist schon die feinste Stufe grob genug.)

Und noch eine Überraschung, die Arbeit erspart hat: für `Topo_Diff` ist das
**Raumdelta besser als das Zeitdelta** (925 gegen 2 726 kB bei gleicher
Stufung). Das Feld ist räumlich glatt und zeitlich überall ein bisschen in
Bewegung — genau andersherum, als man vermutet.

### Die Auflösung der Karte

760 Zellen Breite, gewählt nach dem, was gezeichnet wird: die Bühne ist auf
900 Bildpunkte gedeckelt, das Reliefgitter liegt bei 55 Prozent davon, also bei
rund 460. 760 ist damit gut anderthalbfach überabgetastet — mehr wäre Nutzlast
ohne Bild. Der Zoom ist ausdrücklich ein **Vergrösserungsglas** und kein neues
Rechnen; die Schrägsicht wird dagegen wirklich neu geschnitten und bleibt
scharf.

## 10. Was gemessen ist

Im Prüfbrowser ohne Grafikkarte, 1 100 × 900 bei doppelter Punktdichte, Mittel
aus fünf Bildern:

| | |
|---|---|
| flach, Jahr läuft | 92 ms |
| gekippt, Jahr läuft | 162 ms |
| gekippt, heute (kein Eis) | 132 ms |

Zum Vergleich nennt die Vorlage für ihre Karte im selben Messgeschirr 143 ms
flach und 133 ms gekippt. Die Zahlen sind nicht unmittelbar vergleichbar —
anderes Gerät, andere Karte —, aber sie liegen in derselben Grössenordnung, und
der Film läuft damit.

Die Gegenproben laufen bei jedem Lauf von `quellen.py` mit:

| Probe | was sie fängt | am Gerüst | echt |
|---|---|---|---|
| 1 `Topo(t) − Topo(0) − Topo_Diff(t)`, stufenfreie Zellen | Vorzeichen, Bezugszeitpunkt | **0,000 m** | **2,561 m** |
| 1 dieselbe an Stufenzellen (Eisrand, Küste) | — nur gemeldet | 0,000 m | 584 m (28 % der Zellen) |
| 1b Median `Topo_Diff`, wo über 1500 m Eis liegt | ob `Topo_Diff` das Eis trägt | **+1967 m** | **+1590 m** |
| 2 DEM auf Quellgitter gemittelt gegen `Topo(0)` | Ausschnitt, Achsenrichtung | Median 46,8 m, 95 % 120,9 m | Median 58,4 m, 95 % 735,1 m |
| 3 eigene Nulllinie gegen `Topo > 0` | dasselbe, an der Küste | 92 bis 98 % | 92 bis 95 % |

Probe 1b ist die einzige mit einem **Abbruchkriterium im Vorzeichen**: steht
dort eine negative Zahl, ist `Topo_Diff` die eisfreie Kruste, und dann darf die
Seite `stgit` nicht abziehen. Beide Fassungen sind plausibel; nur eine ist
richtig, und welche, sagt diese Zahl.

Proben 2 und 3 sind **keine Fehlermasse**: sie messen den Unterschied zweier
Datensätze und zweier Auflösungen, und genau der ist der Zweck der ganzen
Übung. Dass Probe 2 echt bei 95 % auf 735 m steht und am Gerüst auf 121 m,
sagt nichts über einen Fehler — es sagt, dass ein 1°-Stichwert in den Alpen
etwas anderes ist als das Mittel von 15″-Werten über dieselbe Zelle. Genau
deshalb trägt das DEM die Berge und nicht `Topo`.
