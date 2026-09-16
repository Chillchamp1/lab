# Methodik

Gilt für den jetzigen Stand: 48 Zeitscheiben von 26 bis 0 ka, Rahmen
4 500 × 5 250 km um 53° N / 15° O. Was von der Vorlage übernommen ist, steht in
[ASTHETIK.md](ASTHETIK.md); welche Quellen geprüft und welche gesperrt waren,
in [QUELLEN.md](QUELLEN.md); was fehlt, in [STAND.md](STAND.md).

Alle Zahlen hier sind **gemessen**, und zwar an der Kette selbst. Weil die
Quellen aus dieser Arbeitsumgebung nicht erreichbar sind, ist der gemessene
Gegenstand teilweise das Prüfgerüst (Abschnitt 8) — wo das so ist, steht es
dabei. Was sich am Gerüst nicht messen lässt, wird auch nicht behauptet.

## 1. Der Rahmen und die Projektion

Lambert azimutal flächentreu, Kugel mit R = 6 371,0088 km, zentriert auf
**53° N / 15° O**. Dieselbe Projektionsfamilie wie in der Vorlage. Der Rahmen
ist ein Rechteck von **4 500 × 5 250 km** in ebendieser projizierten Ebene —
760 × 887 Zellen zu 5,92 km.

### Das Tortenstück war der Schnitt, nicht die Projektion

Bis hierher stand der Rahmen als **Grad-Rechteck**: 12° W … 45° O, 34° … 72° N,
die Vorgabe der Aufgabe. Das Bild eines Grad-Rechtecks ist unter einer
flächentreuen Projektion aber keines, sondern ein Fächer. 31 Prozent der
Leinwand blieben leer und wurden maskiert, und die Karte sah aus wie ein
Tortenstück.

Die Projektion konnte nichts dafür. Nachgemessen, Anteil des Bildrechtecks
innerhalb des Grad-Fensters:

| Projektion | bedeckt |
|---|---|
| Lambert azimutal 53 N / 15 O | 68,8 % |
| Lambert azimutal 52 N / 10 O (EPSG:3035) | 67,9 % |
| Albers 43/65 | 67,5 % |
| Albers 40/68 | 67,4 % |
| Albers 45/62 | 67,8 % |

Alle gleichauf: die Lücke ist die Form des *Fensters*. 38 Grad Breite auf 57
Grad Länge lassen sich flächentreu nicht in ein Rechteck legen; 4 500 auf
5 250 Kilometer schon, denn das **ist** eines. Ein Atlas schneidet in
Kilometern, und seither ist der Rahmen gefüllt.

### Warum nicht Mercator

Weil dieser Ausschnitt Mercators schlechtester Fall ist. Der Maßstab wächst
mit 1/cos φ:

| | |
|---|---|
| Längenmaßstab 72° N gegen 34° N | **2,68 ×** |
| Flächenmaßstab | **7,2 ×** |
| Seitenverhältnis dieses Fensters unter Mercator | 0,82 (statt 0,98) |

Der Gegenstand dieser Karte ist ein Eisschild bei 60 bis 80 Grad Nord.
Mercator zeigte ihn bis zu siebenmal zu gross gegenüber dem Mittelmeer, und
die Zahlen in den Notizen („Eis 27 % der Kartenfläche") widersprächen dem
Bild. Dazu kommt das Relief: die Überhöhung der Schrägsicht rechnet mit
**einem** waagerechten Maßstab (Abschnitt 8c). Unter Mercator wäre derselbe
Absatz von 1 000 m in Norwegen 2,7-mal flacher als in Andalusien.

Eine zylindrisch flächentreue Projektion wäre rechteckig und flächentreu —
und stauchte Skandinavien bei 72° N auf 29 Prozent seiner Proportion. Auch
keine Option.

### Was jede Kante hält

Der Rahmen ist nicht gegriffen; jede seiner vier Kanten hält etwas:

| Kante | km | hält |
|---|---|---|
| Westen | −2 150 | Island ganz, Kap St. Vincent (−2 111) knapp |
| Osten | +2 350 | den Ural (+2 167) und die Obmündung (+2 124) |
| Süden | −1 850 | gerade noch Sizilien (Kap Passero −1 807) und Tarifa (−1 630) |
| Norden | +3 400 | Franz-Josef-Land |

Der Rahmen ist zweimal enger geworden, und beide Male aus demselben Grund: was
die Karte nicht zeigen muss, kostet Nutzlast **und** Rechenzeit in jedem Bild.
Der Süden gab 250 km Sahara auf, Westen und Osten je 300 bis 550 km offenen
Atlantik und kaspische Steppe. Der Norden nie — dort liegt das Thema.

Und ein Nebeneffekt, der keiner ist: 4 500 auf 5 250 km sind **hochkant**. Auf
einem hochkant gehaltenen Telefon füllt die Karte damit 54 statt 45 Prozent der
Schirmhöhe; der Rahmen hat dieselbe Form wie das Gerät, auf dem er meistens
angesehen wird.

Der Norden ist der Grund für das Ganze. Das alte Fenster endete bei 72° N und
45° O — und schnitt damit ein Viertel der DATED-1-Rekonstruktion ab:

| | Stützpunkte der DATED-1-Ränder im Bild |
|---|---|
| altes Grad-Fenster | 71,8 % |
| altes Bildrechteck | 74,4 % |
| erster Kilometer-Rahmen (5 370 × 5 250 km) | 96,8 % |
| **jetziger Rahmen (4 500 × 5 250 km)** | **96,4 %** |

Was da fehlte, war kein Rand, sondern ein ganzer Eisschild: der
**barentsisch-karische**, der auf einem Schelfmeer lag, so gross war wie der
skandinavische und im alten Ausschnitt gar nicht vorkam. Er hat jetzt seine
eigene Marke (Abschnitt 8e).

In Grad greift der Rahmen damit von 61,3° W bis 93,2° O und von 32,8° bis
83,9° N. In den Ecken stehen Grönland, Spitzbergen, Sewernaja Semlja und
Westsibirien; die Breitenkreise laufen weiter gebogen durch das Bild, Norden
ist am Bildrand nicht genau oben — wie auf jedem Atlasblatt.

### Was dabei weggefallen ist

Die **zeilenweise Hülle**. Unter der alten Maske konnte eine waagerechte Linie
das gebogene Fenster verlassen und wieder betreten (4 878 Zellen, 1,4 Prozent),
also wurde je Zeile bis zur Hülle aufgefüllt, und das DEM musste über der
Hülle gelesen werden statt über dem Fenster — sonst fehlte ihm ein Saum von
4 196 Zellen. Ein Rechteck hat dieses Problem nicht. Die Maske steht als
lauter Einsen weiter da: sie kostet in der Nutzlast nichts (je Zeile ein
Anfang und ein Ende, hier immer 0 und *w*), und wer den Rahmen eines Tages
wieder beschneidet, bekommt die Machart zurück, ohne sie neu zu bauen.

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

15 Bogensekunden auf rund 6,0 km Zielzelle ist ein Verhältnis von etwa 1:13 in
jeder Achse. Punktweise abgetastet bekäme man ein Zweihundertfünfundzwanzigstel
der Werte und der Rest wäre Rauschen — und genau die Alpen, um die es geht,
bestehen aus dem, was dabei wegfiele.

Also wird das Quellgitter erst **blockweise gemittelt**, bis seine Zelle
ungefähr so gross ist wie eine Zielzelle, und dann bilinear abgetastet.
Gelesen wird in Streifen: der Rahmen bei 15" ist über **500 Millionen Werte**
in 39 Kacheln und passt nicht als Ganzes in den Speicher. (Es waren 120
Millionen in 15 Kacheln, solange der Rahmen ein Grad-Rechteck war — ein
Kilometer-Rechteck greift an seinen Nordecken weit nach Westen und Osten aus,
bis Grönland und bis zur Karasee.)

**Genommen wird `surface`, nicht `bed`** — und seit Grönland im Rahmen liegt,
ist das keine Verlegenheit mehr, sondern die richtige Wahl. Die Rechnung
dieser Karte ist Fläche(t) = DEM + `Topo_Diff`(t), und `Topo_Diff` ist auf
`Topo`(0) bezogen, also auf die **Oberfläche** von heute, Eis inbegriffen
(Probe 1b). Das DEM muss dieselbe Grösse sein, sonst stimmt der Bezugspunkt
nicht. Probe 2 misst genau das, und sie misst es über Grönland (Median 76 m)
so gut wie über Europa (52 m). Der Fels kommt danach heraus, nicht hinein:
Fels = Fläche − `stgit`. Mit einem `bed`-DEM läge Grönland drei Kilometer zu
tief, und das eiszeitliche Eis schwebte über einer abgesackten Insel.

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

#### Die Mulde kannte nur eine Grösse von Hohlform

Sie lief über **eine** Weite (rW/14), und eine einzelne Weite sieht genau eine
Grösse: die Alpentäler verschwanden darin, das Becken der Nordsee war zu gross
für sie. Jetzt drei Weiten, von eng nach weit zusammengezählt —

| Weite | Anteil | was sie sieht |
|---|---|---|
| rW/56 | 50 % | den Talgrund, die Form, die man wirklich als Form liest |
| rW/18 | 33 % | Mittelgebirge, Fjorde, den Fuss der Eiskuppe |
| rW/6 | 17 % | Becken und Schelf, nur als Grundton |

— und das ist die billige Fassung dessen, was ein Renderer
Umgebungsverdeckung nennt: wie viel Himmel eine Stelle sieht. Weil der
Kastenfilter O(1) je Bildpunkt ist, kosten drei Weiten dreimal einen billigen
Durchgang und nicht dreimal einen teuren.

#### Der Schlagschatten hatte eine Kante von einem Feldpunkt

Der Sweep liefert eine harte Grenze, und die Rampe darüber lief linear über
0,05. Eine Sonne von 16 Grad wirft keine solche Kante — sie hat einen
Halbschatten. Zwei Änderungen: ein kurzer Kasten über das Schattenfeld nach
dem Sweep (billiger als mehrere Sonnen, und auf einer Karte sieht man den
Unterschied nicht), und eine Smoothstep-Rampe statt der linearen. Die Breite
des Kastens hängt an der Feldgrösse, damit die Kante bei jeder Auflösung
gleich breit **aussieht** — sonst wäre sie im Film, der ein dreimal feineres
Feld rechnet, wieder hart.

#### Eis glänzt, Gestein nicht

Ein Glanzlicht auf dem Gestein sähe nach Plastik aus — die Fläche trägt dort
die Farbleiter, und die sind die Daten. Auf einer Eiskuppe ist es das, was sie
zu einem Körper macht statt zu einer weissen Fläche: ein Blinn-Term über den
Halbvektor aus Sonne und Blick, `n·h` hoch 16, mit 0,16 gewichtet. Der
Schimmer sitzt auf den Flanken, die dem Halbvektor zugewandt sind, und wandert
über sie, während die Kuppe wächst.

Zwei Bedingungen, beide nötig:

- **Nur wo Eis liegt** (`eisD >= EISSCHWELLE`) — sonst glänzt die Nordsee.
- **Nicht im Schlagschatten.** Ein Glanzlicht ohne Sonne ist der Fehler, an dem
  man billige Renderer erkennt.

Er zieht gegen Weiss, nicht gegen die Bandfarbe: ein Glanzlicht hat die Farbe
der Quelle, nicht die des Stoffs. Auf Eis ist das fast dieselbe Farbe —
sichtbar wird der Unterschied nur auf den blauen Bändern der tiefen Eisleiter.

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

### Standardmässig aus — und der Knopf schaltet jetzt alles

Zwei Änderungen, eine davon ein Fehler:

**Der Knopf schaltete nur die Hälfte.** `BAND` deckte die Füllung zwischen
*maximum* und *minimum* ab, die creme *most-credible*-Linie aber nicht. Wer
„Band" ausschaltete, bekam trotzdem eine DATED-1-Linie über seiner Karte — und
zwar die auffälligste der drei. Ein Schalter, der nur einen Teil dessen
abschaltet, was man sieht, ist keiner. Jetzt liegt die ganze Ebene dahinter.

**Und er steht jetzt auf aus.** Die DATED-1-Linien sind die *Feldbefunde* — wo
Datierungen den Eisrand tatsächlich belegen — und liegen damit auf einer
anderen Ebene als alles andere im Bild: die Karte zeigt ein Modell, sie zeigen
die Messungen dazu. Für den ersten Blick ist das eine Ebene zu viel. Dazu
kommt, dass sie am Eisrand entlanglaufen, also genau dort, wo ohnehin die
Kante zwischen Weiss und Grün das Auge hält; die creme Linie konkurriert mit
ihr, statt sie zu erklären.

Im **Film** fällt das doppelt ins Gewicht: er hat keine Knöpfe, die Ebene wäre
dort also gar nicht abwählbar, und in Bewegung springt sie alle 1 000 Jahre um
(sie wird nicht interpoliert, siehe unten) — ein Zucken, das neben der glatten
Eisbewegung wie ein Fehler aussieht.

Der Legendensatz führt den Schalter mit: er erklärt die orange Linie nur,
solange sie da ist, und sagt sonst, welcher Knopf sie holt. Ein
Legendensatz, der etwas beschreibt, was gerade nicht im Bild steht, ist
schlimmer als keiner.

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

### Monoton kubisch interpoliert — nach einem Irrtum

Hier stand lange **linear**, mit einer ausdrücklichen Begründung: eine Kurve
behaupte zwischen zwei Datenpunkten etwas, die Aufgabe verlange kein Glätten
über die Datenlage hinweg, und das hier sei eine Rekonstruktion und keine
Simulation. Die Vorlage rechnet mit einer monotonen kubischen Kurve
(Fritsch–Carlson), aber sie hat ungleich verteilte Zählungen und einen
gemessenen Knick von 74 Prozent an jeder; hier seien die Schritte gleichmässig
und der Knick klein.

**Das Argument war richtig und trotzdem falsch angewandt.** Es gilt für eine
*freie* Kurve — eine Catmull-Rom schwingt über die Datenpunkte hinaus und
erfindet dabei Eis, wo in beiden Nachbarscheiben weniger stand. Für die
**monotone** Variante gilt es nicht, und genau die hatte die Vorlage genommen:

- Sie geht durch **jeden** Datenpunkt exakt hindurch.
- Ihre Knotensteigung ist null, sobald die beiden Sekanten das Vorzeichen
  wechseln. Die Kurve bleibt damit in jedem Segment zwischen den beiden
  Werten, die sie verbindet.

Sie behauptet also nichts über die Höhe — nur über die *Geschwindigkeit*. Und
über die musste ohnehin etwas behauptet werden: linear ist die Höhe stetig,
die Geschwindigkeit aber nicht. An jeder der 48 Scheiben knickt sie um. Das
sind 48 Rucke in 69 Sekunden Lauf, und man sieht sie — der Eisrand wandert
nicht, er pulst. Beim Schieben des Reglers fällt das nicht auf, im Film sofort.

Nachgemessen an der Summe des Eisfeldes über alle 2 071 Bilder des Laufs, als
zweite Differenz (das ist die Beschleunigung je Bild):

| | Median | 99 % | **Maximum** |
|---|---|---|---|
| linear | 0,009 | 275 | **2 220** |
| monoton kubisch | 12,8 | 97 | **111** |

Linear steht die Beschleunigung bei vier von fünf Bildern praktisch auf null
und schlägt dann an der Scheibengrenze aus; die Kurve verteilt sie. **Der
grösste Ruck fällt um den Faktor 20.** Das ist der ganze Unterschied zwischen
„wandert" und „pulst".

Geprüft ist auch, dass die Kurve hält, was sie verspricht — über alle 2 071
Bilder und alle 5 520 Zellen des groben Feldes:

- Überschwinger über oder unter die beiden verbundenen Scheiben: **0**, grösste
  Abweichung 0,0000 m.
- Negative Eismächtigkeit: **0**.
- Anfang und Ende treffen Scheibe 0 und Scheibe 47 auf **0,000000 m**.

Die Gewichte laufen über die **Spielzeit** der Segmente, nicht über ihre
Jahrtausende. Die Zeitachse steht ungleichmässig (1 ka, dann 0,5 ka), und die
Spielzeit je Scheibe hängt ausserdem daran, wie viel sich in ihr bewegt
(Abschnitt 7.2). Stetig soll die Geschwindigkeit dort sein, wo das Auge sie
sieht — auf dem Schirm, nicht auf der Zeitachse. Damit ist auch der Wechsel der
Schrittweite bei 21 ka erledigt, der vorher als „Eigenschaft der Zeitachse,
nicht der Interpolation" abgebucht war.

Derselbe Weg nimmt der Meeresspiegel im Ticker: er soll nicht rucken, wenn das
Eis es nicht tut.

### Die Zeit steht als Jahreszahl da, nicht als „ka"

ICE-6G_C zählt in Jahrtausenden vor **1950**, dem Nullpunkt der
Radiokohlenstoffdatierung. Das ist die Einheit der Quelle und die Einheit des
Fachs; ausserhalb davon versteht sie niemand. Gezeigt wird deshalb die
Jahreszahl: 21,8 ka sind 21 800 Jahre vor 1950, also **19 850 v. Chr.**

Gerundet wird auf hundert Jahre. Feiner wäre gelogen — die Scheiben stehen
fünfhundert Jahre auseinander und dazwischen wird interpoliert; gröber wäre
träge, denn die Zahl soll sich beim Lauf bewegen.

Unter 1950 Jahren vor heute kippt es in die Zeitrechnung (1,5 ka = AD 450), und
vierstellige Jahre stehen ohne Trennzeichen da. Im Schild heisst die letzte
Scheibe **today**, in der Zeitangabe darunter **AD 1950**: das eine ist die
Gegenwart, das andere der Nullpunkt, auf den sich „vor heute" bezieht.

### Die Uhr läuft über Spielzeit

Jeder Abschnitt bekommt einen Anteil an den 69 Sekunden, der **Dauer und
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

#### Der Deckel war eine heimliche Bremse

Die Uhr zählt echte Zeit: je Bild kommt sie um die verstrichenen Sekunden
weiter, geteilt durch die Spieldauer. Darüber lag ein Deckel von **0,1 s**,
und der ist als Schutz gegen Pausen gemeint — ein Blatt im Hintergrund bekommt
keine Bilder, und ohne Deckel spränge der Film beim Zurückkommen um die ganze
Pause vor.

Nur bremst ein solcher Deckel eben auch: dauert ein Bild länger als ein
Zehntel, zählt die Uhr trotzdem nur ein Zehntel weiter. Flach und auf einer
Karte von 515 Punkten fiel das kaum auf. Seit die Karte viermal so gross steht
und gekippt der Standard ist, fiel es sehr auf — gemessen im Prüfbrowser:

| | Dauer des ganzen Films |
|---|---|
| gesetzt | 69 s |
| tatsächlich, Deckel 0,1 s | **795 s** |
| tatsächlich, Deckel 1 s | 80 s |

Der Deckel steht jetzt bei **einer Sekunde**: jedes echte Bild geht
ungedeckelt durch, und eine Pause springt höchstens um anderthalb Prozent des
Films. Bei langsamen Bildern läuft der Film damit in **grösseren Schritten**,
aber nicht langsamer — und das ist die richtige Reihenfolge der Übel: eine
Karte, die ruckelt, sieht man; eine, die zehnmal zu lang braucht, hält man für
kaputt.

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

### Das Gerüst muss mit dem Rahmen mitwandern

Als der Rahmen auf 4 500 × 5 250 km umgestellt wurde, fielen am Gerüst Probe 2
(Median 46,8 → 264,3 m, 95 % 121 → 4 000 m) und Probe 3 (92 → 66 Prozent) in
den Keller, ohne dass an der Kette etwas geändert worden wäre. Der Grund stand
im Gerüst, nicht in der Seite: sein DEM lag nur über 16° W bis 49° O und 30 bis
76° N, und seine erfundene Topographie setzte alles ausserhalb von 12° W…46° O
und 33…73° N pauschal auf −4 000 m. Der neue Rahmen reicht von Reykjavík bis
zum Ural. Was die Proben also massen, war nicht der Unterschied zweier
Datensätze, sondern die selbstgebaute Stufe an der Kante des Gerüsts.

Die exakte Null von Probe 1 blieb dabei die ganze Zeit stehen — sie hängt nur
an der Kette, nicht am Ausschnitt. Genau deshalb ist sie die scharfe Wache und
die anderen sind Beschreibung.

Behoben, indem das Gerüst-DEM auf 67° W…96° O und 28…86° N gezogen wurde, bei
60″ statt 30″, damit die Datei bezahlbar bleibt (der Blockmittelungsschritt
wird weiterhin durchlaufen, nur mit Teiler 3). Probe 2 steht seither wieder bei
45,7 m Median und 120,2 m im 95. Perzentil, also dort, wo sie vor der
Rahmenänderung stand. Probe 3 liegt am Gerüst jetzt zwischen 83 und 99 Prozent
statt 92 und 98: über der neu gedeckten Fläche liegt die erfundene
Topographie fast auf Meereshöhe, und dort kippt Land/Wasser schon bei ein paar
Metern. Das ist eine Eigenschaft der Gausskuppen, keine der Kette.

**Die Lehre:** ein Prüfgerüst hat einen Ausschnitt, und der steht nicht in
`quellen.py`, sondern im Gerüst selbst. Wandert der Rahmen, wandert es mit —
sonst misst man ab da seinen Rand.

## 8b. Was der Lauf mit den echten Daten gefunden hat

**1. `Topo_Diff` enthält das Eis.** Der grosse Fang, ausführlich in
Abschnitt 2. Aufgefallen ist er nur, weil Probe 1 an den echten Daten nicht
null war und die Untersuchung dieser Abweichung bei der Frage endete, was
`Topo` überhaupt ist. Ohne Probe wäre die Karte fertig geworden — und falsch,
auf eine Art, die kein Betrachter hätte sehen können.

**2. Probe 1 ist an den echten Daten nicht null, und das ist richtig so.**
`max |Topo(t) − Topo(0) − Topo_Diff(t)|` steht im Rahmen bei **1 208 m**. Die
Erklärung steht im Kopf der Datei: `Topo` trägt den Zusatz „(Point-value
altitude)", `Topo_Diff` trägt ihn nicht. Wo das Differenzfeld **innerhalb
einer Zelle** eine Stufe hat — am Eisrand, an einer wandernden Küste, in der
Antarktis an der Aufsetzlinie —, sind ein Stichwert im Zellmittelpunkt und ein
Zellmittel zwei verschiedene Zahlen.

Gemessen ist das so scharf, wie man es sich wünscht — sofern man die Zellen
richtig sortiert. Drei Mengen, alle 48 Scheiben:

| Zellen | max. Abweichung | Anteil |
|---|---|---|
| **eisfrei und stufenfrei** | **2,8 m** | 77 % |
| unter stehendem Eis | 170 m | 4,4 % |
| an Stufenzellen (Eisrand, Küste) | 1 208 m | 19,5 % |

Die erste Zeile ist die eigentliche Probe: unter 3 m quer durch alle Scheiben,
ausdrücklich auch über den Alpen, wo das Gelände schroff ist, das
Differenzfeld aber glatt.

Die mittlere Zeile ist neu und kam mit dem grösseren Rahmen: **Grönland**.
Dort ändert sich die Eismächtigkeit um Hunderte Meter, ohne dass sich der
Eisanteil der Zelle ändert — kein Stufenfall nach `sftgif`, aber derselbe
Unterschied zwischen Stichwert und Zellmittel an den steilen Flanken der
Kuppe. Ohne eine eigene Spalte hätte Grönland die scharfe Probe von 2,8 auf
170 m aufgefressen, und der Wächter wäre stumpf geworden, ohne dass es jemand
gemerkt hätte.

Weicher ist die Probe dadurch nicht: ein vertauschtes Vorzeichen und ein
falscher Bezugszeitpunkt schlagen global durch und fänden in keiner der drei
Spalten ein Versteck.

**3. Das Eis lief beim Hochrechnen aufs offene Meer.** Bei 21 ka stand auf 5
bis 9 Prozent der gezeichneten Eiszellen eine Eisoberfläche unter dem
Meeresspiegel, die tiefste 2,8 km darunter. Behoben mit der
Aufschwimm-Schranke aus Abschnitt 2.

**4. DATED-1 reichte weiter als die Karte.** Die Rekonstruktion deckt die
eurasischen Eisschilde bis Taimyr und über 80° N; das Grad-Fenster endete bei
45° O und 72° N und liess **28 Prozent der Stützpunkte** draussen. Flach
schnitt die Silhouette das weg, gekippt hing ein Eisrand über der Barentssee
im Schwarzen — ein Punkt nördlich des Fensters wird beim Anheben auf die
oberste Gitterzeile geklemmt und bekommt deren Höhe.

Beschnitten wird seither in den Daten (Sutherland-Hodgman gegen das
Gitterrechteck, vor dem Vereinfachen, damit die Ringe geschlossen und die
Bänder füllbar bleiben), und die dabei entstehende Schnittkante wird nie
gestrichelt: sie ist kein Eisrand.

Das war die Behandlung des Symptoms. Die Ursache war der Ausschnitt, und sie
ist mit dem Kilometer-Rahmen weg: er hält jetzt **96,8 Prozent** der
Stützpunkte, und was noch abgeschnitten wird, liegt auf Sewernaja Semlja und
Taimyr — 4 000 km östlich von Berlin und nach keiner Lesart Europa. Der
Zuschnitt bleibt trotzdem stehen; er kostet nichts und fängt den nächsten
Rahmen mit. Übrig bleiben 15 092 statt 15 917 Punkten (mit dem alten Fenster:
11 178).

**5. Das Layout rechnete mit einem hochkanten Ausschnitt.** Die Vorlage nagelt
ihre Bühne auf `100dvh`; ihr Ausschnitt ist Deutschland. Der hier war Europa
von 12° W bis 45° O, also breiter als hoch — auf einem hochkant gehaltenen
Telefon füllte die Karte 48 Prozent des Feldes, der Rest war schwarz, die
Notiz lag hinter der Karte und war zu zwei Dritteln verdeckt, und die Marken
der Farbleiter klebten ineinander. Behoben: das Feld hält das
Seitenverhältnis der Karte, die Bühne schrumpft mit, die Notiz wandert unter
die Karte, und die Marken der Leiter werden **gemessen** und bei Berührung
ausgedünnt, statt nach einer geratenen Schwelle.

Mit dem Kilometer-Rahmen kamen drei Nachzügler desselben Befundes, und alle
drei hängen daran, dass die Karte jetzt ein **gefülltes Rechteck** ist:

- **Die Notiz** lag hinter der Karte, und die Karte wich ihr aus. Das setzt
  voraus, dass der Umriss Platz lässt. Ein Rechteck lässt nirgends Platz —
  also steht die Notiz jetzt auf allen Breiten unter der Karte, so wie sie auf
  dem Telefon immer schon stand.
- **Das Schild** („21,8 ka") stand auf der Karte, mit einem Schein aus dem
  Seitengrund dahinter. Das trug, solange unter ihm Wasser lag; seit dort
  Grönland liegt, ist es weisse Schrift auf weissem Eis. Es steht jetzt über
  der Karte statt auf ihr.
- **Die Leinwand war ein Drittel zu breit.** Ein Flex-Kind mit
  `aspect-ratio` schrumpft in der Höhe, ohne in der Breite nachzugeben: auf
  einem breiten, niedrigen Schirm stand die Leinwand 862 Punkte breit da und
  die Karte darin 543. Ein Drittel der Bildpunkte wurde für schwarzen Rand
  gerechnet, und der Zuschnitt der Silhouette hat nebenbei die Ortsnamen am
  Bildrand abgeschnitten — „Yekaterinburg" endete als „Yekate" (die Stadt lag
  damals noch im Rahmen; heute stehen dort Perm und Arkhangelsk). Die Leinwand
  bekommt ihre Breite jetzt in `masse()`, gerückt mit `left` und **nicht** mit
  einem `transform`: eine verschobene Leinwand bekommt eine eigene
  Kompositionsebene und kostete im Prüfbrowser 25 ms je Bild gekippt.

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

| Quantil der Steigung | m je 5,92-km-Zelle | Neigung |
|---|---|---|
| p50 | 16,6 | 0,28 % |
| p75 | 51,0 | 0,86 % |
| **p90** | **140,5** | **2,37 %** |
| p99 | 484,4 | 8,18 % |
| p100 | 2 466,6 | 41,7 % |

(Mit dem alten Grad-Fenster: p90 = 173,4 m je 6,83-km-Zelle, also 2,54 %. Die
Zahl in Metern fällt mit der Zellgrösse, die **Neigung** bleibt — und genau die
steht in der Formel. Dass sie leicht sinkt, liegt am Rahmen: er hält jetzt mehr
flache Tiefsee und mehr westsibirische Ebene.)

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

### Die Kante: dünn und hart, nicht breit und leise

Die beleuchtete Kante entsteht mit dem alten Prägetrick: derselbe Ring
zweimal versetzt gefüllt, weiss zum Licht und schwarz von ihm weg, halb
durchsichtig, dann die Bandfarbe darüber. Sichtbar bleibt ein Saum von der
Breite des Versatzes.

Was davon stehen bleibt, hängt **nicht** an der einzelnen Deckkraft, sondern
an ihrer Potenz: über *n* Platten bleibt (1 − a)ⁿ durch. Eine feste Zahl
heisst deshalb, dass der Schleier mitwächst, sobald der Stapel feiner wird —
und genau das ist passiert, als aus 26 Platten 33 wurden. Über jeder
Küstenlinie lag ein weisser Saum, und die Karte sah gekippt aus, als hätte
jemand Milchglas davorgestellt.

Der erste Griff dagegen war, die Deckkraft zu senken, von 0,62 auf 0,34, und
sie an die Zahl der Platten zu koppeln. Das nahm den Schleier — und mit ihm
die Kante: das Relief wirkte flach, die Textur verwaschen, „ich kann es nicht
richtig greifen". Der Fehler sass in der Annahme, Schleier und Kante seien
dieselbe Grösse. Sind sie nicht. Der Schleier ist **Fläche mal Deckkraft**,
summiert über die Platten; die Kante ist **Kontrast am Rand**. Ein breiter,
leiser Saum hat viel Fläche und wenig Kontrast — das Schlechteste von beidem.

Verglichen wurden sechs Fassungen, jede gekippt bei 22,2 ka, über den Alpen
und am Eisrand:

| | Kante | dazu | Bild |
|---|---|---|---|
| 0 | 0,34, ein CSS-Pixel Versatz | — | kein Schleier, aber flach; die Stufen sind kaum zu greifen |
| 1 | 0,85 / 0,75 wie die Vorlage | Mulde 0,85 | die Kante ist da, das Milchglas auch wieder |
| 2 | 0,34 | Schlagschatten | Tiefe kommt, die Kante bleibt weich |
| 3 | 0,34 | Schlagschatten, Mulde 0,85, Lichthub 2,2 | die Flächen bekommen Form, der Rand nicht |
| 4 | 0,55, ein CSS-Pixel | Schlagschatten | der Schleier kommt zurück |
| **5** | **0,70, ein Gerätepixel Versatz** | **Schlagschatten, Mulde 0,85, Lichthub 2,2** | **scharfe Schnittkante, Tiefe, kein Schleier** |

Genommen ist die fünfte. Drei Dinge daran:

**Der Versatz ist ein Gerätepixel**, nicht ein CSS-Pixel: 0,55 Gerätepixel
bei einfacher Punktdichte wie in der Vorlage, 0,64 bei doppelter statt 1,1.
Ein Saum, der kaum Fläche hat, summiert sich nicht zu Milchglas, wie hoch
seine Deckkraft auch steht; und hart gezogen liest er sich als Schnittkante
eines Modells, nicht als Weichzeichner. Die Deckkraft bleibt an die Zahl der
Platten gekoppelt,

    a(n) = 1 − (1 − 0,70)^(33/n)

also 0,78 bei 26 Platten, 0,63 bei 40 — damit der Eindruck stabil bleibt,
wenn sich der Stapel je ändert, und er hat sich in diesem Ordner schon
zweimal geändert.

**Ein Schlagschatten** unter jeder Platte: drei schwarze Kopien des Rings, vom
Licht weg versetzt, nach aussen abnehmend deckend (0,35 · 0,23 · 0,12), bis
zum 1,2-fachen des Kantenversatzes. Die Kante sagt, *wo* die Stufe ist; der
Schatten sagt, *wie hoch*. Ohne ihn stehen die Platten nebeneinander wie die
Farbflächen einer Landkarte, mit ihm liegen sie aufeinander. Kosten: drei
Füllungen mehr je Platte, 13 ms je Bild gekippt.

**Mulde und Lichthub** stehen auf 0,85 und 2,2 (vorher 0,55 und 1,7; die
Vorlage hat 0,85 und 1,7). Die Platten sind Volltonflächen — alles, was
innerhalb einer Platte Form gibt, ist dieses Licht, und es durfte mehr tragen.
Dass es auf Feldauflösung unscharf bleibt, bleibt: weiches Licht auf harten
Flächen ist ein Modell, und die harte Kante, gegen die es sich absetzt, ist
jetzt da.

Die **Wand** einer Platte stand bei 0,86 ihrer Farbe, ihr Fuss bei 0,70 —
heraufgesetzt, als die 33 Platten ein Drittel mehr dunkle Streifen ins Bild
brachten. Mit der harten Kante und dem Schatten darunter muss die Wand den
Absatz nicht mehr allein zeigen; 0,82 und 0,62 lassen sie wieder etwas
dunkler stehen, ohne die Karte zu zerschneiden.

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

## 8d. Heute, und die Gipfel

Zwei Ebenen mit verschiedenen Aussagen, deshalb getrennt behandelt.

**Heute** — die moderne Küstenlinie und fünfzehn Städte. Die Linie ist die
Nulllinie des **modernen** Höhenmodells, ohne Differenzfeld: sie ändert sich
nie, wird einmal geschnitten und behalten. Die Städte sind in `quellen.py`
projiziert und reisen als Gitterpunkte mit; die Seite muss von Länge und
Breite nichts wissen.

Beide sagen nichts über die Eiszeit. Sie geben dem Auge einen Anker in der
Gegenwart — und dadurch wird die Bewegung ablesbar: wo die Karte bei 22 ka
Land zeigt und die dünne Linie darunter durchläuft, stand später Wasser. Bei
0 ka verschwindet sie, weil sie dann mit der gezeichneten Küste
zusammenfällt. Abschaltbar über „Today".

Geschrieben wird **mit dunklem Umriss**, nicht mit Schlagschatten: die Karte
hat weisses Eis und dunkles Wasser, und ein Schatten trägt nur auf einem von
beiden. Stockholm stand auf der Eiskuppe und war nicht zu lesen.

### Wie viel Eis über einer Stadt steht — und wer dafür weichen musste

Zwei Städte dazu, drei weg, zwei Eiskuppenschilder weg. Alle drei Schritte
gehören zusammen, denn sie ersetzen **eine** Art von Aussage durch eine
andere.

Die neuen sind nach einem einzigen Kriterium gewählt: **Einwohnerzahl
innerhalb des vereisten Gebiets.**

| | warum diese |
|---|---|
| Manchester | die grösste britische. London und Birmingham lagen *südlich* des Randes, in Frosttundra — nicht unter Eis |
| Oslo, Kopenhagen | Skandinavien und Dänemark |

Berlin stand schon da und ist der Grenzfall, den man sehen will: der
Brandenburger Rand *ist* dort das Maximum, die Stadt liegt also kurz und knapp
unter Eis.

Unter dem Namen steht, solange Eis über der Stadt liegt, dessen Mächtigkeit in
Klammern — **live**, nicht als Höchstwert. Sie wächst und fällt mit dem Lauf,
und das ist die Aussage: nicht „hier lag mal Eis", sondern „hier liegen gerade
2 374 Meter davon". Abgelesen wird dieselbe Feldzelle, aus der auch das Relief
unter der Stadt kommt; gerechnet wird nichts zusätzlich.

| | 26 ka | 22 ka | 18 ka | 15 ka | 12 ka |
|---|---|---|---|---|---|
| Oslo | 2 676 | 2 378 | 2 197 | 1 970 | 521 |
| Reykjavík | 1 280 | 1 216 | 1 176 | 936 | 522 |
| Kopenhagen | 849 | 728 | 925 | — | — |
| Berlin | 409 | 378 | — | — | — |
| Manchester | 328 | 237 | 28 | — | — |

**Sankt Petersburg, Helsinki und Stockholm sind wieder raus.** Sie lagen alle
drei auf derselben Kuppe, dicht beieinander, mit ähnlichen Zahlen — sechs
Beschriftungen auf einem Fleck, von denen fünf dasselbe sagen. Eine Karte, die
das tut, ist eine Tabelle.

**Und die Schilder „Scandinavian ice" und „Britain ice" sind weg.** Über
beiden Kuppen steht jetzt eine Stadt mit ihrer Mächtigkeit, und die sagt
dasselbe konkreter: „Oslo (2 374 m under ice)" ist eine Aussage, an der ein
Mensch etwas hat; „Scandinavian ice 2 773 m" ist eine Zahl über einen Punkt,
den niemand zeigen kann. **Barents-Kara behält sein Schild** — dort liegt
keine Stadt und kann keine liegen, es war ein Schelfmeer. Ohne das Schild
stünde die auffälligste Kuppe der Karte ohne jede Höhenangabe da.

Gemessen werden weiterhin alle drei Kuppen; die Tabelle unten hängt daran. Was
sich geändert hat, ist ein Schalter in den Daten (`schild`), nicht die
Rechnung.

### Taugt die Mächtigkeit als Mass für die Eishöhe?

Nicht ganz, und es lohnt zu wissen, um wie viel sie danebenliegt. Was
dasteht, ist die **Dicke über dem Boden**; was man ablesen möchte, ist die
**Höhe der Eisoberfläche**. Die beiden unterscheiden sich um die Höhe des
Bodens — und der liegt unter einem Eisschild nicht da, wo er heute liegt,
sondern eingedrückt.

Gemessen bei 22 ka:

| | Boden | Dicke (steht da) | Oberfläche | Unterschied |
|---|---|---|---|---|
| Oslo | −280 m | 2 378 m | 2 098 m | Dicke ist **280 m zu hoch** |
| Reykjavík | −163 m | 1 216 m | 1 054 m | 162 m zu hoch |
| Kopenhagen | −38 m | 728 m | 690 m | 38 m zu hoch |
| Berlin | +104 m | 378 m | 483 m | 105 m zu **niedrig** |
| Manchester | +132 m | 237 m | 368 m | 131 m zu niedrig |

Das Vorzeichen ist systematisch und lehrreich: **unter dem dicken Eis ist die
Kruste eingedrückt**, der Boden liegt unter Null, und die Dicke überschätzt die
Oberfläche. **Am Rand** steht der Boden über dem Meer, und sie unterschätzt
sie. Beides bleibt unter 300 Metern, weil alle fünf Städte tief liegen — hätte
eine davon auf 800 m Gebirge gestanden, wäre ihre Zahl als Höhenangabe
wertlos.

Zum Vergleich: die skandinavische Kuppe hatte bei 22 ka eine Oberfläche von
2 732 m, Oslos Dicke sagt 2 378 m. Wer die Zahl als „ungefähr so hoch war das
Eis hier" liest, liegt für die Karte richtig genug; wer sie auf den Meter
nimmt, liest sie falsch.

### Fünfzehn Beschriftungen, und ein Teil drängt sich auf Skandinavien

Solange jede Stadt nur ihren Namen trug, ging das gerade noch. Mit der zweiten
Zeile ist „Helsinki (1 331 m under ice)" doppelt so breit wie vorher und liegt
quer über Sankt Petersburg — im ersten Wurf war Helsinki ganz verschwunden und
Sankt Petersburg hatte seine Zahl verloren.

Also eine **Belegungsliste je Bild**: ein flaches Feld aus Rechtecken, in der
Reihenfolge gefüllt, in der die Beschriftungen ihren Anspruch anmelden. Die
Reihenfolge *ist* die Rangfolge:

1. die Eiskuppen und der Mont Blanc — sie sind die Aussage der Karte
2. die Städte **unter** Eis — sie sind die Aussage dieser Ebene
3. alle übrigen Städte — Anker fürs Auge, sonst nichts

Jede Beschriftung probiert sechs Lagen durch: neben dem Punkt, darüber,
darunter, jeweils rechts und links. Erst wenn keine davon frei ist, fällt die
zweite Zeile weg und dieselben sechs werden noch einmal probiert. Variiert wird
also zuerst die **Lage** und zuletzt der **Inhalt** — eine Stadt, die etwas zu
sagen hat, soll lieber zehn Punkte tiefer stehen als ihre Zahl verlieren. Der
Punkt selbst bleibt immer stehen: er ist der Anker, der Name ist der Komfort.

Die Gipfelschilder weichen einander auch aus (bei 26 ka liegen Barents-Kara und
Skandinavien nah beieinander), werden aber notfalls trotzdem gesetzt: eine
Eiskuppe ohne Schild ist schlimmer als ein Schild, das sich überschneidet.

**Und flackert das im Film?** Das war die Sorge: eine Beschriftung, die von
Bild zu Bild an- und ausgeht, ist im Lauf ein Zucken. Nachgemessen über alle
2 071 Bilder wechselt die Menge der gesetzten Namen **fünfmal**, und der engste
Abstand zwischen zwei Wechseln liegt bei 54 Bildern, also 1,8 Sekunden. Es ist
immer dasselbe: Warschau weicht Berlins zweiter Zeile, wenn dort Eis
ankommt, und kommt zurück, wenn es geht. Das ist kein Flackern, sondern die
Karte, die sagt, dass sich etwas geändert hat.

**Die Gipfel** — der höchste Punkt des Eises und der Mont Blanc, beide mit
ihrer Höhe zur gezeigten Zeit. Der Vergleich ist die Aussage: der Eisschild
misst sich am höchsten Berg der Alpen, und zwar an dem, der damals dastand.

Beim Mont Blanc steckt eine Messung, ohne die die Zahl falsch wäre:

| | |
|---|---|
| Gipfel im 15″-DEM | **4 693 m** |
| dieselbe Stelle im Zielgitter (5,92 km) | **2 245 m** |
| Unterschied | **2 448 m** |

Das Herunterrechnen auf 5,9 km nimmt dem Mont Blanc **mehr als die Hälfte**.
Bemerkenswert daran ist, wie sehr die Zahl wackelt: beim vorigen Rahmen mass
dieselbe Zelle 3 486 m, bei fast gleicher Zellgrösse (5,97 km). Nicht die
Auflösung hat sich geändert, sondern der Ursprung des Gitters — der Gipfel
liegt jetzt anders in seiner Zelle, und über eine Zelle gemittelt entscheidet
das über tausend Meter. Genau deshalb ist diese Zahl kein Messwert der Karte,
sondern die Begründung dafür, sie **nicht** zu benutzen: genommen wird
das Maximum des feinen DEM in seiner Umgebung, und zeitabhängig wird
nur das Differenzfeld addiert — genau die Rechnung, aus der auch das Relief
entsteht. Bei 22 ka steht er dadurch bei 4 783 m, rund 90 m höher als heute:
der Meeresspiegel lag tiefer, und die Alpen standen im Vorwölbungsgürtel.

Der höchste Eispunkt wird in `paleo()` mitgesucht, wo das Feld ohnehin einmal
durchlaufen wird — er kostet nichts extra.

**Nicht einer, sondern drei.** Es war einmal einer — der höchste Punkt des
Eises im ganzen Bild — und daneben ein zweiter für Britannien, weil das
Maximum sonst immer der skandinavische Gipfel ist. Mit dem Kilometer-Rahmen
ging beides nicht mehr: der höchste Eispunkt im Bild ist jetzt **Grönland**,
und eine Marke, die auf Grönland zeigt, sagt über Europa nichts.

Also drei benannte Kuppen statt eines anonymen Maximums — die drei, aus denen
der eurasische Eiskomplex bestand:

| Kuppe | Kasten | | Schild |
|---|---|---|---|
| Scandinavian | 0 … 60° O, 54 … 71,5° N | die grösste, über dem Bottnischen Meerbusen | — |
| Barents-Kara | 10 … 80° O, 71,5 … 83,5° N | auf einem Schelfmeer, und im alten Fenster gar nicht zu sehen | **ja** |
| Britain | 11° W … 0°, 49,5 … 61° N | die kleinste, mit gut der halben Höhe | — |

Beschriftet wird nur noch Barents-Kara; gemessen weiterhin alle drei. Über
Skandinavien und Britannien steht inzwischen eine Stadt mit ihrer
Eismächtigkeit, und die sagt dasselbe konkreter (Abschnitt 8d). Über
Barents-Kara kann keine Stadt stehen — es war ein Schelfmeer —, und ohne das
Schild stünde die auffälligste Kuppe der Karte ohne Höhenangabe da.

Die Grenzen sind **Setzungen, keine Befunde**: beim Hochstand berührten sich
die Schilde, und wo genau, ist selbst Gegenstand der Forschung. Gezogen sind
sie dort, wo das Eis am dünnsten war — Britannien bis zum Nullmeridian und
nicht weiter östlich, weil sich die beiden über der nördlichen Nordsee
trafen; Barents-Kara nördlich von 71,5° N.

Jeder Kasten wird an seinen Rändern abgetastet und projiziert — unter dieser
Projektion ist ein Gradnetz-Rechteck kein Rechteck mehr —, und die Seite
rechnet daraus einmal je Feldgrösse **ein** Indexfeld: 0 heisst keine Kuppe,
sonst die Nummer. Ein Feld und nicht drei Masken, damit die Schleife in
`paleo()` einen Zugriff je Zelle behält. Punkt-in-Polygon je Zelle und je Bild
wäre teuer; die Kästen bewegen sich nie.

Die Schilder stehen **westlich** ihres Kreuzes. Rechts davon liegt bei jeder
Zeitscheibe Eis, und weisse Schrift auf weissem Eis ist genau die Stelle, an
der sie am schlechtesten zu lesen ist; westlich liegt Wasser. Passt der Text
dort nicht mehr hin, fällt er auf die andere Seite zurück.

Beschriftet wird **Name und Material**: „Scandinavian ice 2 724 m". Ohne das
Wort liest sich die Zahl wie ein Berg, und sie ist das Gegenteil davon — die
Oberfläche eines Eisschildes, gegen die schräg darunter der Mont Blanc mit
seiner Felshöhe zur selben Zeit steht. Das ist der Vergleich, den die Karte
anbietet.

**Grönland bekommt keine Marke**, obwohl es der höchste Eispunkt des Bildes
ist. Es gehört nicht zum eurasischen Komplex, und mit ihm im Topf sähe man nur
noch, dass Grönland höher ist. Dass es da ist, ist trotzdem die Pointe: es ist
das einzige Eis im Bild, das am Ende noch dasteht.

Was dabei herauskommt, ist mehr als eine zweite Zahl (Eisoberfläche, in
Klammern die Mächtigkeit):

| ka | Scandinavian | Barents-Kara | Britain |
|---|---|---|---|
| 26,0 | 2 972 m (2 407) | **3 848 m (4 638)** | 1 528 m (758) |
| 24,0 | 2 924 m (2 376) | 2 390 m (1 368) | 1 515 m (746) |
| 22,0 | 2 724 m (1 136) | 2 359 m (1 317) | 1 500 m (726) |
| 19,0 | 2 669 m (1 565) | 2 335 m (1 281) | 1 506 m (727) |
| 15,0 | 2 566 m (935) | 2 281 m (1 216) | 1 066 m (260) |
| 14,0 | 2 125 m (470) | 2 017 m (924) | 884 m (84) |
| **13,0** | 2 085 m (414) | 2 035 m (937) | **1 377 m (766)** |
| 12,0 | 1 952 m (258) | 1 796 m (696) | 864 m (31) |
| 11,0 | 1 899 m (200) | 349 m (12) | — |
| 9,0 | — | — | — |

Gesucht ist der **höchste Punkt der Eisoberfläche**, nicht die dickste Stelle.
Die Zahl in Klammern wackelt deshalb zwischen zwei Gitterständen erheblich —
bei 22 ka steht Skandinavien hier auf 1 136 m Mächtigkeit, im vorigen Rahmen
auf 1 255 m, bei 19 ka umgekehrt 1 565 gegen 1 178 m. Mal gewinnt ein
Berggipfel mit dünnem Eis darauf, mal die Kuppe selbst; die Oberfläche
dagegen liegt in beiden Fällen in derselben Handvoll Meter. Beides ist
richtig gerechnet, und die stabilere der beiden Zahlen steht deshalb vorn:
die Karte zeigt Höhen über dem Meer, und das tut die Marke auch.

Zwei Dinge stehen darin, die eine einzelne Marke nicht zeigen kann.

**Britannien bricht bei 14 ka ein und wächst bei 13 ka wieder** — von 84 auf
766 m Eis. Das ist der **Loch-Lomond-Wiedervorstoss** der Jüngeren Dryas. In
Skandinavien ist davon in derselben Reihe nichts zu sehen; dort läuft die
Kurve durch.

**Barents-Kara ist bei 26 ka die höchste der drei** und verliert bis 24 ka
über drei Kilometer Eis — vor dem Hochstand, nicht nach ihm. Das ist
ICE-6G_C, nicht diese Karte: das Modell ist an Meeresspiegel und
Krustenbewegung angepasst, nicht an Feldbefunde, und seine früheste Scheibe
ist zugleich sein Anfangszustand. Wer wissen will, was der Feldbefund sagt,
schaut auf die orange Linie daneben — DATED-1 —, und das ist genau der Grund,
warum beides im selben Bild steht.

## 8f. Die Karte so gross wie das Fenster — und was das gekostet hat

Drei Zahlen zum Anfang. Auf einem Schirm von 1 440 × 900 stand die Karte

| | Karte | Anteil des Fensters |
|---|---|---|
| untereinander (Leiste unter der Karte) | 515 × 530 | 21 % |
| nebeneinander (Leiste daneben), quadratischer Rahmen | 884 × 864 | 59 % |
| **nebeneinander, hochkanter Rahmen (jetzt)** | **740 × 864** | **49 %** |

Die dritte Zeile ist kein Rückschritt: der Rahmen ist seither hochkant
(4 500 × 5 250 km), und in einem queren Fenster ist die Höhe das Knappe. Die
Karte bekommt sie ganz — 864 Punkte wie vorher —, die Breite folgt aus dem
Seitenverhältnis. Was sie an Fensteranteil verliert, verliert sie an einen
Rahmen, der weniger Wasser und mehr Europa zeigt. Im Telefon hochkant, wofür
die Karte gemacht ist, gewinnt derselbe Rahmen: dort füllt er die Breite ganz.

Die Karte war damals fast quadratisch, das Fenster ist quer. Untereinander bleibt ihr
die Fensterhöhe **minus** Farbleiter, Reglern, Ticker und Notiz — und das ist
in einem queren Fenster fast die Hälfte. Nebeneinander bekommt sie die ganze
Höhe, und die Spalte daneben trägt, was vorher unter ihr lag. Der Bruch liegt
bei 1 040 px Breite und einem Seitenverhältnis über 1,1; darunter bleibt es
beim Stapel, weil eine Spalte von 280 px dort keinen Text mehr trägt.

Dazu zwei Dinge, die vorher nicht auffielen, weil die Karte klein war:

**Die Leinwand war grösser als die Karte.** Ein Flex-Kind mit `aspect-ratio`
schrumpft in der Höhe, ohne in der Breite nachzugeben. Jetzt rechnet
`masse()` beide Kanten selbst, und die Leinwand ist genau die Karte; was
daneben oder darüber liegt, ist Seitengrund und wird nicht gerechnet.

**Das Feld war zu grob.** Das Reliefgitter lag bei 55 Prozent der Kartenbreite
— jede Feldzelle also knapp zwei Bildpunkte. Auf einer Karte von 540 Punkten
ging das durch; auf einer von 884 sah man es: die Farbfläche wird aus dem Feld
hochskaliert und wurde klotzig, und die Höhenlinien laufen über die Ecken des
Feldgitters und wurden eckig. Jetzt 90 Prozent, gedeckelt bei 680 Zellen.

### Und dann war die Seite viermal zu langsam

Gemessen im Prüfbrowser bei 1 440 × 900, Feld 760 × 743:

| | ms je Bild |
|---|---|
| flach | **619** |
| davon Höhenlinien | 610 |

Die Karte war nicht an ihrem Bild teuer geworden, sondern an **einer
Schleife**: Marching Squares läuft je Höhenlinie über das ganze Feld. 37
Linien mal 140 000 Marschzellen sind fünf Millionen Besuche je Bild, und
gekippt kommen 33 Platten mal zwei Materialien noch einmal so viel dazu.

Zwei Eingriffe, beide gemessen:

**Ein Kachelindex.** Das Marschgitter wird in Kacheln von 4 × 4 Zellen
geteilt, und je Kachel stehen der kleinste und der grösste Feldwert darin.
Eine Linie auf der Höhe *t* kann eine Kachel nur kreuzen, wenn *t* dazwischen
liegt; alle anderen werden als Block übersprungen. Gelände ist
zusammenhängend — über die fünfzig Kilometer einer Kachel ändert sich die
Höhe selten um mehr als zwei, drei Bänder. Gebaut wird der Index in **einem**
Durchgang, mit derselben Vorschrift, die der Zug danach liest, und er darf nur
zu weit greifen, nie zu eng.

**Ein Strich je Eimer statt je Zug.** Die Linien werden ohnehin nach
Beleuchtungsstufe in 24 Eimer sortiert, aber jeder Zug wurde einzeln begonnen
und gestrichen — bei feinem Feld mehrere tausend Striche je Bild. Jetzt
sammelt ein Pfad alle Züge eines Eimers mit derselben Breite: rund fünfzig
Striche für die ganze Karte. Die Punkte sind dieselben; teuer war das
Aufsetzen.

| Höhenlinien | ms |
|---|---|
| vorher | 610 |
| mit Kachelindex | 397 |
| davon Aufsetzen der Striche | 182 |
| **mit Kachelindex und gesammelten Strichen** | **93** |

Dazu eine Kleinigkeit mit grosser Wirkung: **gekippt wird das Farbbild nicht
mehr gerechnet.** Es ist die flache Karte; gekippt malt jede Platte ihre
Bandfarbe selbst, und das Bild wurde nie hochgelegt. 35 ms je Bild für nichts.

Der Kachelindex hat einen Fehler mitgebracht, der hier stehen bleibt, weil er
lehrreich ist: beim Überspringen sprang der Zähler ans Kachelende — und beim
letzten Block über die **Randspalte** hinweg. Der Rand aus Nullen ist das, was
die Ringe schliesst; ohne ihn wurde aus einem Ring eine offene Kette, und eine
offene Kette füllt sich als Keil. Das Bild zeigte grosse schiefe Flächen quer
über Russland und den Atlantik. Ein Marching-Squares-Ring ist entweder
geschlossen oder Unsinn — dazwischen gibt es nichts.

### Hochkant: die Karte randlos

Der Rahmen der Bühne kostet dort am meisten, wo am wenigsten da ist. Auf 390 px
Schirmbreite sind 6 px Seitenrand, 12 px Polster und ein Strich zusammen
**zehn Prozent der Kartenbreite**. Hochkant fällt er deshalb weg: die Karte
läuft von Kante zu Kante, und nur was Text ist, bekommt sein Polster zurück.

Das Feld ist hochkant nicht mehr der Rest, den die Notiz übriglässt, sondern
wird aus der Karte gerechnet: `height:min(100vw / Seitenverhältnis, 62svh)`.
Damit ist die Leinwand genau die Karte, und die Karte genau die volle Breite.
Auf 390 × 844 misst beides 390 × 455, also **54 Prozent der Schirmhöhe** bei
null Rand — gemessen, nicht gesetzt.

Der hochkante Rahmen (4 500 × 5 250 km) ist die Voraussetzung dafür. Beim
vorigen, fast quadratischen Rahmen blieb bei voller Breite unten Luft stehen;
beim jetzigen füllt die Karte das Feld ganz. Der Deckel von 62 svh greift erst
auf schmalen, hohen Schirmen und lässt dort die Notiz sichtbar.

Weggefallen ist hochkant auch Text: der lange Legendensatz (er wird nach zwei
Zeilen abgeschnitten und sagt nichts, was die Leiter darüber nicht zeigt) und
der Faden mit allen neun Abschnittsüberschriften (zwei Zeilen graue Wörter
neben einer Notiz, die dasselbe sagt).

### Die Ecken aus den Linien nehmen

Marching Squares setzt seine Stützpunkte auf die **Kanten des Gitters**. Eine
Höhenlinie besteht damit aus lauter kurzen Stücken, die nur vier Richtungen
kennen — auf einer Karte von 900 Punkten sieht man das: die Umrisse wirken
gezackt, als wären sie mit dem Lineal gezogen.

Zwei Durchgänge Laplace-Glättung nehmen das heraus: jeder Punkt rückt zur
Hälfte auf die Mitte seiner beiden Nachbarn zu. Die **Zahl der Punkte bleibt
gleich** — anders als beim Eckenschneiden (Chaikin), das sie verdoppelt und
damit das Streichen verteuert. Gemessen kostet es nichts (313 gegen 322 ms,
innerhalb der Streuung).

Weit rückt dabei nichts: die Zacken sind eine halbe Feldzelle hoch, also knapp
ein Bildpunkt, und genau der wird geglättet. Die Linie bleibt auf ihrer
Bandgrenze — sie muss es, denn die Farbfläche darunter kommt aus demselben
Feld. Ein geschlossener Ring wird zyklisch geglättet und bleibt geschlossen.

### Der Film darf feiner sein als die Seite

Die Seite deckelt das Reliefgitter bei 680 Zellen und die Punktdichte bei 2,5,
weil dort jedes Bild in Echtzeit fallen muss. Der Film rechnet Bild für Bild
und hat es nicht eilig. Dafür stehen `RAUF`, `FELDMAX` und `DPRMAX` als `let`
statt als `const` in der Seite; die Seite selbst rührt sie nie an.

Drei Grössen, und es ist wichtig, sie auseinanderzuhalten:

| | | |
|---|---|---|
| **Satz** | 540 CSS-Punkte | in welcher Breite die Seite **gesetzt** wird: wie gross die Schrift zur Karte steht, wo das CSS auf Hochkant umschaltet, wie viele Zeilen die Notiz braucht |
| **Über** | 4 | die Punktdichte, mit der dieser Satz gerendert wird. Leinwand damit 2 160 × 2 524 — das Doppelte der Zielbreite |
| **Fein** | 3 | das Reliefgitter als Vielfaches der Satzbreite: 1 620 Zellen, drei Viertel der Leinwand |

Am Ende wird von 2 160 auf 1 080 heruntergerechnet, mit Lanczos. Aus je vier
gerechneten Bildpunkten wird einer — Kantenglättung durch **Überabtastung**,
und auf Höhenlinien, die einen Punkt breit sind, ist sie der sichtbarste
Unterschied überhaupt.

#### Der Fehler, der dabei einmal drinstand

Die Satzbreite kam aus `Zielbreite / Über`. Das sieht richtig aus und ist
genau verkehrt herum: die Leinwand landet damit **exakt** auf der Zielgrösse,
das Verkleinern am Ende ist ein 1:1-Kopieren, und überabgetastet wird gar
nichts. Gemerkt an der Zeile, die der Film beim Start ausgibt — Leinwand
1 080 × 1 264 statt 2 160 × 2 524. Seitdem steht die Satzbreite für sich, und
der Film bricht ab, wenn Satz × Über nicht deutlich über der Zielbreite liegt.
Eine Zahl, die man nicht nachrechnen kann, gehört nicht in eine Formel,
sondern in eine Prüfung.

#### Was das kostet

Gemessen im Prüfbrowser, je Bild einschliesslich Schuss, bei Satz 540:

| Über | Fein | Feld | ms je Bild |
|---|---|---|---|
| 2 | 2 | 1,21 M | 2 147 |
| 3 | 3 | 2,73 M | 4 163 |
| 4 | 2,5 | 1,90 M | 4 136 |
| **4** | **3** | **2,73 M** | **4 957** |
| 4 | 4 | 4,85 M | 7 305 |

Zeile drei kostet dasselbe wie Zeile zwei und rechnet die Leinwand doppelt
statt anderthalbfach: **Leinwandgrösse ist billiger als Feldgrösse.** Genommen
ist Zeile vier — zweifache Überabtastung und ein Feld, das drei Viertel der
Leinwand trägt. Für 2 130 Bilder sind das rund drei Stunden.

Gerechnet wird deshalb in **Abschnitten** zu 300 Bildern, jeder für sich ein
mp4, am Ende ohne Neukodieren aneinandergehängt. Drei Stunden an einem Stück
sind drei Stunden, in denen nichts schiefgehen darf; so ist die teuerste
verlorene Arbeit ein Abschnitt, und ein Neustart überspringt, was schon
dasteht.

#### Und woran ein Abschnitt hängt

Die Wiederaufnahme prüfte anfangs nur, ob eine Datei da ist und über ein
Kilobyte wiegt. Damit hat sie **stillschweigend fünf Abschnitte aus einem
anderen Stand der Seite übernommen** — der Film wäre vorne ohne und hinten mit
den neuen Stadtbeschriftungen gelaufen, und im Protokoll stand nur „steht
schon". Der fünfte davon war obendrein ein halb geschriebener Abschnitt aus
einem abgebrochenen Lauf: 1 MB statt 5, aber eben mehr als ein Kilobyte.

Zwei Änderungen, und beide sind dasselbe Prinzip — *woran* etwas hängt, muss
im Namen oder im Nachweis stehen, nicht im Vertrauen:

- **Der Ordner hängt an einem Abdruck** aus der Seite selbst und jeder
  Einstellung (`SHA-256` über `index.html` plus Grösse, Bildrate, Laufzeit,
  Satz, Über, Fein). Ändert sich eine davon, ist es ein anderer Ordner, und es
  gibt nichts zu übernehmen. Ändert sich nichts, findet ein Neustart seine
  Arbeit wieder.
- **Je fertigem Abschnitt liegt eine Quittung daneben**, geschrieben erst
  *nach* dem Schliessen des Kodierers, mit der Bildzahl darin. Ein Abbruch
  hinterlässt eine halbe mp4-Datei, aber keine Quittung — und eine halbe Datei
  ohne Quittung zählt nicht.

Nachgeprüft, indem ein Lauf mitten im zweiten Abschnitt hart abgeschossen
wurde: der Neustart übernahm den ersten (mit Quittung), rechnete den zweiten
neu, und der fertige Film war exakt 5,03 Sekunden lang — die 151 Bilder, die
er haben sollte. Ein Byte an der Seite geändert, und der Ordnername sprang von
`d9c7708c974c` auf `f4c5cd3cbaf1`.

#### Was im Film anders aussieht als auf der Seite

- Die **Bedienung** ist weg, und zwar mit `display:none` statt
  `visibility:hidden`: unsichtbar hielte sie ihren Platz, und im Bild stünde
  ein schwarzes Band, in dem nichts passiert.
- Die **Karte nimmt die volle Breite**. Auf der Seite deckelt das CSS die
  Feldhöhe bei 62 svh, damit unter der Karte noch die Leiste Platz hat; im
  Film ist die Leiste weg, und der Deckel kostete 30 der 540 Punkte — die
  Karte stand 510 breit mit Rand links und rechts.
- Er läuft in der **Standardkippung**, nicht flach: er hat keine Regler, mit
  denen man selbst herausfindet, dass da ein Körper steht.

Nachgemessen über acht Zeitpunkte des Laufs steht die Leinwand auf 0,67 und
540 × 631 — **dieselben vier Zahlen jedes Mal**. Ein Bild, das mit der Länge
der Notiz wandert, wäre im Film ein Ruck, den kein Zuschauer der Notiz
zuordnen könnte.

#### Und was herauskommt

1 080 × 1 920, 30 Bilder je Sekunde, H.264 High in `yuv420p`, crf 17, mit
`+faststart`. Das ist die Kombination, die überall ohne Neukodieren läuft.
30 statt 60 Bilder je Sekunde ist kein Sparen: die Kamera steht still, es
morpht nur die Karte, und dafür reichen 30 — die Glätte kommt aus der
Interpolation (Abschnitt 7), nicht aus der Bildrate.

### Gerechnet wird nur, was zu sehen ist

Der Kachelindex sagt, welche Kachel eine Höhe **kreuzen** kann. Er sagt nicht,
ob sie überhaupt im Bild liegt — und bei vierfacher Vergrösserung liegen neun
Zehntel des Feldes neben der Leinwand. Gerechnet wurden sie trotzdem.

Das sichtbare Rechteck kommt aus der Umkehrung der Sicht: die vier Ecken der
Leinwand zurück auf den Boden, mit zwei Zugaben. Die Leinwand wird nach unten
um die **Stapelhöhe** verlängert, weil der Stapel jeden Punkt auf dem Schirm
anhebt — ein Punkt, dessen Boden unter der Leinwand liegt, kann mit seiner
obersten Platte noch hereinragen. Und das Ergebnis wird auf Vielfache von 16
Zellen nach aussen gerundet, sonst wechselte es bei jedem Pixel einer Geste und
der Ringspeicher, der daran hängt, wäre bei jeder Bewegung ungültig.

Gemessen bei 1 440 × 900, gekippt:

| | ms je Bild |
|---|---|
| Zoom 1 (ganze Karte sichtbar) | 322 — unverändert |
| Zoom 3 | **186** statt 322 |
| Zoom 6 | **157** statt 322 |

Im Normalfall spart es nichts, und das ist richtig so: dort **ist** alles zu
sehen. Es spart genau dann, wenn man hineingeht.

Zwei Dinge dabei, die nicht offensichtlich sind:

**Höhenlinien darf man abschneiden, Plattenringe nicht.** Eine Linie wird
gestrichen; hört sie am Rand auf, ist das harmlos. Ein Ring wird **gefüllt**;
eine Kette, die am Rand aufhört, füllt sich als Keil quer über die Karte.
Ausserhalb des Sichtbaren gilt deshalb dasselbe wie ausserhalb des Feldes:
tiefer als jede Platte. Dann schliesst sich der Ring entlang der Schnittkante,
und die liegt neben der Leinwand.

**Und der Kachelindex muss von diesem Rand wissen.** Er wurde zuerst über die
rohen Werte gebaut; an der Schnittkante sah er ein gleichförmiges Stück
Meeresboden, hielt die Kachel für übersprungbar — und genau dort lag der Sprung
auf den Nullrand. Der Keil stand wieder im Bild. Derselbe Fehler wie bei der
Randspalte eine Runde zuvor, an einer anderen Kante: **ein
Marching-Squares-Ring ist geschlossen oder Unsinn.**

### Das Bild hopste, und zwar aus drei Gründen

Alle drei sind Layout, keiner ist Rechnen, und alle drei fallen nur hochkant
auf, weil dort alles untereinander steht.

**`dvh` ist die *dynamische* Schirmhöhe.** Auf dem Telefon wandert sie, sobald
die Adressleiste ein- oder ausfährt, und jede Wanderung legt die Bühne neu aus.
Wer dabei scrollt, fährt die Leiste weiter ein — das Bild hopst, und das
Scrollen macht es schlimmer. Jetzt `svh`, die *kleine* Schirmhöhe: die mit
ausgefahrener Leiste, also die kleinste, die vorkommt. Damit steht die
Auslegung fest; fährt die Leiste ein, bleibt unten Seitengrund stehen.

**Das Feld nahm sich, was die Notiz übrig liess.** Die Notiz wechselt mit dem
Abschnitt ihre Länge, und drei Zeilen weniger hiessen dreissig Punkte mehr
Karte. Jetzt steht die Kartenhöhe hochkant **fest** (52 svh), und die Notiz
nimmt den Rest und rollt in sich selbst, statt die Seite länger zu machen.

**Und das Schild wuchs um eine Zeile.** Neben der Jahreszahl passt die
Zeitangabe mal („ICE-6G_C time slice 21 ka") und mal nicht („between the 22 and
21 ka slices — interpolated"); dann bricht sie um, das Schild wird 28 Punkte
höher, und die ganze Karte rutscht nach. Das passiert **achtundvierzigmal im
Film** — bei jedem Wechsel zwischen einer Zeitscheibe und der Strecke dazwischen.
Hochkant steht die Zeitangabe deshalb jetzt immer in ihrer eigenen Zeile.

Nachgemessen über sieben Stände des Films auf 390 × 844: Feld 390 × 439, obere
Kante bei 67, Seitenhöhe 844 — siebenmal dieselbe Zahl. Vorher sprang die obere
Kante zwischen 39 und 67.

### Mit dem Finger liess sich die Karte nicht schieben

Und das seit dem ersten Tag. Das Schieben nahm den Weg aus `movementX` und
`movementY` des Zeigerereignisses — die füllt der Browser für Maus und Stift
zuverlässig, bei **Berührungen steht dort null**. Am Schreibtisch funktionierte
alles, auf dem Telefon bewegte sich nichts, und keiner der Prüfläufe hat es
gefangen: sie alle haben die Ansicht direkt gesetzt statt gezogen.

Gerechnet wird der Weg jetzt selbst, aus der vorigen Position desselben
Zeigers — dieselbe Zahl, nur nicht geliehen. Der Prüflauf zieht dafür einen
echten Finger über die Leinwand und sieht nach, ob sich `vX` bewegt.

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
| DEM, 10 m je Stufe | 674 120 | 695 kB |
| `Topo_Diff`, Teiler 11, 2 m je Stufe | 264 960 | 251 kB |
| `stgit`, Teiler 11, 10 m je Stufe | 264 960 | 79 kB |
| DATED-1, 16 949 Punkte | | 56 kB |
| **Nutzlast zusammen** | | **1 089 kB** |
| **fertige Seite** | | **1 216 kB**, gzip 591 kB |

Das ist deutlich mehr als vor dem Kilometer-Rahmen (628 kB Nutzlast, 706 kB
Seite), und die Rechnung dafür geht auf. Der Rahmen deckt 23,6 statt 23,0
Millionen km², er ist dabei **ganz** gefüllt statt zu 69,7 Prozent, und die
Zelle ist von 6,83 auf 5,92 km gefallen: 674 120 statt 343 893 Zellen mit
Gelände darin, also doppelt so viele. Bezahlt wird Karte, nicht Verpackung.

Die Zellgrösse ist dabei keine Geschmacksfrage: auf einem Schirm von 1 440
Punkten wird die Karte 740 Punkte breit gezeichnet, und 4 500 km auf 740
Punkte sind 6,1 km je Bildpunkt. Eine Zelle von 5,92 km ist genau eine Zelle
je Bildpunkt — feiner wäre Nutzlast ohne Bild, gröber wäre sichtbar. Die Karte
ist hochkant, seit der Rahmen es ist: das Fenster gibt ihr die Höhe, und die
Breite folgt daraus. Der kleinere Rahmen hat die Karte also nicht kleiner
gemacht, sondern schmaler und gleich hoch.

Zum Vergleich dieselbe Messung am Prüfgerüst: Nutzlast 634 kB, Seite 709 kB,
gzip **169 kB**. Roh fast gleich, gzip doppelt — genau wie vorhergesagt: die
rohe Grösse hängt an der Zahl der Werte, die komprimierte an ihrer Entropie,
und erfundenes Gelände aus ein paar Gausskuppen hat wenig zu sagen. Echtes
Gelände hat in jeder Zelle etwas zu sagen.

Die Schraube, falls die Seite zu schwer wird, ist `BREITE`: 640 statt 760
kostet ein Drittel der DEM-Werte und liegt immer noch über dem Reliefgitter.
Die zweite Schraube ist der Teiler der groben Felder — `Topo_Diff` ist
räumlich glatt und verträgt eine gröbere Stufe als `stgit`, das einen scharfen
Rand hat; das Format trägt je Feld einen eigenen Teiler, genutzt wird das
bisher nicht.
Bei 591 kB gzip für eine Reliefkarte Europas mit 48 Zeitscheiben ist sie
bisher nicht nötig gewesen.

Dass `stgit` mit 79 kB so leicht ist, liegt nicht am Packen, sondern am
gröberen Teiler — und daran, dass echtes Eis ausserhalb der drei Kuppen
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

760 Zellen Breite, gewählt nach dem, was gezeichnet wird: seit die Karte neben
der Leiste steht statt über ihr, wird sie auf einem Schirm von 1 440 Punkten
740 Punkte breit — eine Gitterzelle je Bildpunkt. Das Reliefgitter liegt bei
90 Prozent davon und ist bei 680 Zellen gedeckelt; auf dem hochkanten Rahmen
greift der Deckel in der Breite gar nicht mehr (666 Zellen auf 740 Punkte),
dafür steht das Feld jetzt 777 Zellen hoch. Leicht unterabgetastet bleibt es —
mehr wäre Nutzlast ohne Bild. Der Zoom ist ausdrücklich ein **Vergrösserungsglas** und kein neues
Rechnen; die Schrägsicht wird dagegen wirklich neu geschnitten und bleibt
scharf.

## 10. Was gemessen ist

Im Prüfbrowser ohne Grafikkarte, 1 440 × 900 bei doppelter Punktdichte, Median
aus sechs Sekunden Lauf je Fall:

| | kleiner Rahmen (jetzt) | grosser Rahmen |
|---|---|---|
| flach | 460 ms | 443 ms |
| in der Standardkippung | 1 038 ms | 1 027 ms |
| stark gekippt | 828 ms | 831 ms |
| in der Standardkippung, heute (kein Eis) | 887 ms | 905 ms |

Karte 740 × 864 Punkte bei Feld 666 × 777 gegen 884 × 864 bei Feld 680 × 665.
**Der kleinere Rahmen kostet nichts** — er ist schmaler, aber sein Feld steht
höher, und das hebt sich auf.

> Diese Tabelle ist **vor** dem neuen Licht gemessen (drei Muldenweiten statt
> einer, weicher Schlagschatten, Schimmer auf dem Eis — Abschnitt 5). Das
> kostet zusätzliche Durchgänge über das Feld und ist hier noch nicht
> beziffert; nachzumessen auf einer Maschine, auf der sonst nichts läuft.

Diese Zahlen sind nicht mit denen der vorigen Runde vergleichbar, und das ist
keine Regression der Seite, sondern eine Eigenschaft des Prüfrechners. Die
Runde davor mass am grossen Rahmen 180 ms flach und 316 ms gekippt. Derselbe
Stand, heute nachgemessen, steht bei 460 und 1 067 ms: der Prüfcontainer läuft
rund 2,8-mal langsamer als damals. Deshalb steht hier eine Tabelle mit zwei
Spalten statt einer Zahlenreihe — **nur der Vergleich in derselben Stunde auf
derselben Maschine trägt**, und der sagt: gleich schnell.

Was an den absoluten Zahlen bleibt: flach ist billiger als gekippt (460 gegen
1 038 ms). Die Schrägsicht ist trotzdem der Standard. Ein Eisschild ist ein
Körper, und flach gesehen ist er eine weisse Fläche — die zwölf Grad sind der
Hinweis, dass es etwas zu kippen gibt. Dass „stark gekippt" billiger ist als
die Standardkippung, ist kein Messfehler: stark gekippt rutscht mehr Karte
aus dem Bild, und gerechnet wird nur, was zu sehen ist (8f).

Zum Vergleich nennt die Vorlage für ihre Karte im selben Messgeschirr 143 ms
flach und 133 ms gekippt — gemessen allerdings zu der früheren, schnelleren
Stunde. Die Zahlen sind ohnehin nicht unmittelbar vergleichbar: andere Karte,
und dort wird das Feld eingefroren, sobald es steht.

Die Gegenproben laufen bei jedem Lauf von `quellen.py` mit:

| Probe | was sie fängt | am Gerüst | echt |
|---|---|---|---|
| 1 `Topo(t) − Topo(0) − Topo_Diff(t)`, eisfrei und stufenfrei | Vorzeichen, Bezugszeitpunkt | **0,000 m** | **2,820 m** |
| 1 dieselbe unter stehendem Eis (Grönland) | — nur gemeldet | 0,000 m | 170 m (4,7 % der Zellen) |
| 1 dieselbe an Stufenzellen (Eisrand, Küste) | — nur gemeldet | 0,000 m | 1 208 m (19,9 % der Zellen) |
| 1b Median `Topo_Diff`, wo über 1500 m Eis liegt | ob `Topo_Diff` das Eis trägt | **+1 773 m** | **+1 293 m** |
| 2 DEM auf Quellgitter gemittelt gegen `Topo(0)` | Ausschnitt, Achsenrichtung | Median 45,7 m, 95 % 120,2 m | Median 51,5 m, 95 % 582,1 m |
| 3 eigene Nulllinie gegen `Topo > 0` | dasselbe, an der Küste | 83 bis 99 % | 93,0 bis 96,3 % |

Probe 1b ist die einzige mit einem **Abbruchkriterium im Vorzeichen**: steht
dort eine negative Zahl, ist `Topo_Diff` die eisfreie Kruste, und dann darf die
Seite `stgit` nicht abziehen. Beide Fassungen sind plausibel; nur eine ist
richtig, und welche, sagt diese Zahl.

Proben 2 und 3 sind **keine Fehlermasse**: sie messen den Unterschied zweier
Datensätze und zweier Auflösungen, und genau der ist der Zweck der ganzen
Übung. Dass Probe 2 echt bei 95 % auf 582 m steht und am Gerüst auf 120 m,
sagt nichts über einen Fehler — es sagt, dass ein 1°-Stichwert in den Alpen
etwas anderes ist als das Mittel von 15″-Werten über dieselbe Zelle. Genau
deshalb trägt das DEM die Berge und nicht `Topo`.
