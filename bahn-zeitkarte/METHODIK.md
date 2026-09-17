# Methodik

Was gerechnet wird, in welcher Reihenfolge, mit welchen Entscheidungen — und
welche Wege verworfen wurden. Jede Zahl hier steht so in der Ausgabe der
Bauskripte; wer sie nachzählen will, lässt sie laufen.

## 0. Der Weg in einem Satz

Aus einem Fahrplantag wird ein Netz, aus dem Netz eine Reisezeitmatrix
zwischen allen Bahnhöfen, aus der Matrix eine Lage in der Ebene, und über die
Lage kommt ein Relief.

```
trains.json  →  01_netz.py      →  Bahnhöfe, Verbindungen, Spitzenstunde
             →  02_zeiten.py    →  4.781 × 4.781 Reisezeiten (C, 13 s)
             →  03_lage.py      →  Federkarte und Geländekarte (C, 5 min)
             →  04_menschen.py  →  Bevölkerungsgewicht je Bahnhof
             →  05_seite.py     →  data/karte.json
```

## 1. Vom Fahrplan zum Netz

Die Quelle ist `data/trains.json` aus
[Chillchamp1/github.io](https://github.com/Chillchamp1/github.io): ein
Fahrplantag des offenen DELFI-Datensatzes, **Mittwoch, 13. Mai 2026**, dort
schon nach GTFS-`route_type` auf Schienenverkehr gefiltert. Enthalten sind
7.552 Meldepunkte und 27.757 Fahrten; enthalten ist **kein** Stadtverkehr —
S-Bahn (`route_type` 109), U-Bahn, Straßenbahn und Bus sind dort bereits
heraus.

### 1.1 Busse, die als Schiene gemeldet werden

Der `route_type`-Filter der Quelle lässt eine Handvoll Regionalbusnetze durch,
weil ihre Zulieferer sie als Regionalbahn melden. Sie sind an den Liniennamen
zu erkennen; vier Muster fangen alle 61:

| Muster | Beispiele | wer das ist |
|---|---|---|
| `^R\d` | R8, R10, R59, R62, R90 | Raumbus Hohenlohe und Limes |
| `^\d{3,4}$` | 338, 604, 801, 848, 1408 | Nummernlinien in Oberhavel, Havelland, Coburg |
| `^\d{2,4}\s?R$` | 97 R, 101 R, 819R, 966R | Rufbusse um Dillingen und Memmingen |
| `^MS\d` | MS9, MS14 | Ulmer Stadtlinien |

Zusammen **609 Fahrten auf 61 Linien**; 27.148 Zugfahrten bleiben.

**Was ausdrücklich drinbleibt**, obwohl der Name keine Bahn verrät: A1–A3 ist
die AKN, RS1–RS71 sind Regio-S-Bahn und Regionalstadtbahnen, DRB die
Fichtelbergbahn, MBB der Molli, SAB die Schwäbische Alb-Bahn, FEX der Berliner
Flughafenexpress, FLX Flixtrain, THA Thalys, ECM ein EuroCity, TES der
Werksverkehr nach Grünheide, DRF ein Autoreisezug, und Os, L7, NRE, NRB, P
sowie die einstelligen und zweistelligen Nummern sind grenzüberschreitende
Züge von SBB, ÖBB, ČD und SNCB. Ein erster Ansatz, der nur Linien mit
bekanntem Produktkürzel (ICE, RE, RB …) behalten wollte, hätte diese
**1.978 Zugfahrten mitverworfen** — die AKN, Flixtrain und Thalys
eingeschlossen. (2.587 Fahrten tragen kein bekanntes Produktkürzel, davon sind
609 Busse.) Ein Namensfilter, der vom Erwünschten her denkt, verwirft zu viel.

### 1.2 Straßenhalte der Zweisystemwagen

Übrig bleibt ein Sonderfall: die City-Bahn Chemnitz fährt außerhalb der Stadt
Eisenbahn und in der Stadt Straßenbahn. Die Regel dafür ist gemessen, nicht
aufgezählt: für jede Linie wird der **mittlere Abstand zwischen zwei Halten**
bestimmt, und unter **1,3 km** gilt eine Linie als straßenlaufend. Genau fünf
Linien fallen darunter — C15 (0,49 km), C11 (0,56), NRB (0,70), C14 (0,81),
C13 (1,24) —, und die nächste darüber ist mit deutlichem Abstand die AKN A2
mit 1,38 km, dann RS12 mit 1,45 und die Fichtelbergbahn mit 1,59. Die Schwelle
trennt also nicht scharf gesetzt, sondern der Datensatz selbst hat dort eine
Lücke.

Ein Halt fällt heraus, wenn ihn **nur** solche Linien bedienen **und** sein
Name kein Bahnhofswort trägt (Bahnhof, Bf, Hbf, Hp, Haltepunkt, …). Das sind
**44 Halte**, alle im Chemnitzer Netz: „Chemnitz, Zentralhaltestelle",
„Chemnitz, Theaterplatz", „Chemnitz, TU Campus" und so weiter. Die Bahnhöfe
auf denselben Linien bleiben: Stollberg, Aue, Hainichen, Mittweida, Chemnitz
Hbf. Die Züge halten an den verworfenen Punkten weiter, nur sind es keine
Bahnhöfe, und die Karte zeichnet Bahnhöfe.

**Das kostet etwas, und zwar nachzählbar.** Etwa fünfzehn der 44 sind
wirkliche Eisenbahnhaltepunkte auf den Strecken nach Stollberg, Aue und
Hainichen — Chemnitz-Harthau, Chemnitz-Altchemnitz, Einsiedel, Burkhardtsdorf
Mitte, Thalheim Mitte, Wittgensdorf Mitte, Frankenberg Süd, Aue Stadion. Sie
gehen mit, weil der Datensatz sie von den Straßenhalten nicht trennt: bedient
werden sie nur von C-Linien, und ein Bahnhofswort tragen sie nicht. Fünfzehn
von 4.781 ist der Preis dafür, dreißig Straßenbahnhaltestellen nicht als
Bahnhöfe zu zeichnen.

### 1.3 Bahnsteige zusammenlegen

Denselben Bahnhof melden mehrere Verkehrsverbünde getrennt: Frankfurt (Main)
Hauptbahnhof steht viermal im Datensatz, Nürnberg Hbf siebenmal, Augsburg
siebenmal. Ungetrennt kostet ein Umstieg innerhalb von Frankfurt Hbf fünf
Minuten Fußweg, den es nicht gibt — und der Bahnhof erscheint in der
Reisezeitmatrix als mehrere schlechter erreichbare Orte.

Zusammengelegt wird mit Union-Find über zwei Regeln: Abstand unter **200 m**,
oder gleicher normalisierter Name und Abstand unter **900 m**. Die
Normalisierung räumt `(oben)`, `S+U`-Vorsätze und die sechs Schreibweisen von
„Hauptbahnhof" weg. Ergebnis: **6.341 Meldepunkte → 5.464 Bahnhöfe**; die
weiteste Einzelmeldung liegt 440 m von ihrem Bahnhof.

### 1.4 Deutschland abgrenzen

Gerechnet wird über das ganze Netz, gezeichnet werden nur die deutschen
Bahnhöfe. Der Test läuft gegen die **sechzehn Landesflächen** aus derselben
Quelle, nicht gegen den Außenumriss: die Ländergrenzen haben 2.100 Punkte, der
Umriss nur 428, und mit dem grob vereinfachten Umriss fielen Lindau-Insel,
Kehl, Gronau und Rheinfelden aus Deutschland heraus. Auch die Landesflächen
sind vereinfacht, darum zählt ein **Saum von 0,6 km** jenseits der Grenze noch
mit. Ergebnis: 4.960 Bahnhöfe innerhalb, 42 im Saum, **5.002 deutsche**, 462
im Ausland.

Die 0,6 km sind eine Abwägung mit nachgezählter Antwort. Der Saum holt
umgekehrt echte Auslandsbahnhöfe herein, und die stehen dann als schlecht
erreichbare Gipfel auf einer Karte von Deutschland — schlecht erreichbar sind
sie aber nur, weil dieser Datensatz ihre eigenen Landesfahrpläne nicht kennt.
Bei **2,5 km** waren es 82 gerettete Bahnhöfe, von denen **37 im Ausland**
lagen: Gubin, Zgorzelec, Słubice, Schärding, Braunau, Kreuzlingen, Kufstein,
Salzburg Taxham. Salzburg Taxham lag in der Zeitkarte als beschriftete
Schneeinsel im Meer, und das ist ein Fehler, den man sieht. Bei **0,6 km**
sind es 42, davon 8 im Ausland. Der Preis sind ein paar deutsche Bahnhöfe
knapp jenseits der vereinfachten Linie: Lindau-Insel (1,16 km), Herten
(Baden) (1,41) und Rheinfelden (Baden) (2,33). Eine Trennung nach Abstand
allein geht nicht weiter — Gubin liegt 0,08 km von der Grenze, Kehl 0,29.

### 1.5 Die Spitzenstunde, gemessen

Für jede Minute des Tages wird gezählt, wie viele Züge in der folgenden Stunde
abfahren, und wie viele Zugminuten in dieser Stunde gefahren werden. Beides
hat ein Maximum, und es sind **zwei verschiedene**:

| Maß | dichteste Stunde | |
|---|---|---|
| Abfahrten | **06:36–07:36** | 17.468 Abfahrten |
| Züge gleichzeitig unterwegs | 16:59–17:59 | 1.845 im Mittel |

Gerechnet wird mit der morgendlichen, aus zwei Gründen. Sie hat die meisten
Abfahrten, also die meisten Anschlüsse — und das ist es, was Reisezeit
bestimmt. Und wer um sieben losfährt, hat den Tag noch vor sich: abends um
sechs ist eine Reise quer durchs Land im Fahrplan eines einzelnen Tages nicht
mehr zu Ende zu bringen, und eine Reisezeit, die am letzten Zug scheitert,
misst nicht mehr den Fahrplan, sondern den Rand des Datensatzes. Der
Unterschied zwischen den beiden Spitzen ist ohnehin klein: nach Abfahrten
liegt der Morgen 4 % vorn, nach Zügen unterwegs der Abend 1 %.

Ausgabe: 279.680 Fahrplanabschnitte, nach Abfahrtszeit sortiert. 202
Abschnitte ohne Ortswechsel (Start und Ziel nach dem Zusammenlegen derselbe
Bahnhof) fallen weg.

## 2. Die Reisezeitmatrix

Gerechnet wird mit dem **Connection Scan Algorithm** (Dibbelt, Pajor,
Strasser, Wagner 2013), der für genau diese Frage gemacht ist: einmal linear
über alle nach Abfahrtszeit sortierten Verbindungen laufen, und man hat die
früheste Ankunft an jedem Bahnhof. Kein Graph, keine Prioritätswarteschlange.

**Reisezeit heißt Tür-zu-Tür ab der Anfrageminute.** Die Wartezeit auf den
ersten Zug zählt mit. Das ist die eine Entscheidung, aus der die ganze Karte
folgt: ein Knotenbahnhof mit vier Zügen je Stunde liegt näher als ein
Haltepunkt mit einem alle zwei Stunden, auch bei gleicher Fahrzeit. Ohne diese
Entscheidung wäre die Karte eine Karte der Streckenlängen und nicht eine der
Erreichbarkeit.

- **Abfahrtsraster**: zwölf Minuten quer durch die Spitzenstunde, 06:36,
  06:41, … 07:31. Gemittelt wird über die zwölf Ergebnisse, damit nicht der
  Zufall einer einzelnen Minute die Karte formt — wer 06:36 anfragt, erwischt
  den Anschluss, wer 06:37 anfragt, wartet 59 Minuten.
- **Mindestumsteigezeit**: 5 Minuten, überall gleich. Am Startbahnhof keine —
  der Zeiger steht schon auf dem Bahnsteig. Im Code steht dafür ein um
  MINUM vorgezogener Ankunftswert am Start, damit der Einstiegstest nicht
  verzweigen muss.
- **Suchhorizont**: 18 Stunden ab der Anfrage.
- Umfang: 5.002 × 12 = **60.024 Fahrplanauskünfte**, jede über bis zu 279.680
  Abschnitte. 13 Sekunden auf vier Kernen.

Ergebnis ist eine 5.002² Matrix in Minuten, 47 MB. Sie ist **nicht
symmetrisch** — hin und zurück unterscheiden sich im Mittel um 16 Minuten,
weil die Anschlüsse in den beiden Richtungen andere sind. Für das Federmodell
wird gemittelt; eine Feder hat nur eine Ruhelänge.

### Die Lücken, und was aus ihnen folgt

5,7 % aller Paare sind an diesem Tag ab dieser Stunde nicht zu verbinden, und
diese Lücken liegen nicht verstreut, sondern gebündelt. Die Verteilung über
die Bahnhöfe ist scharf zweigeteilt: 95 % der Bahnhöfe erreichen mehr als
95,8 % aller anderen, und dann kippt es auf einen Schlag — 122 Bahnhöfe
erreichen **gar nichts**.

Es sind Nebenbahnen, deren einziger Anschluss an das Netz eine S-Bahn-Station
ist, und S-Bahn steht nicht im Datensatz: die **Strohgäubahn** (Korntal–
Weissach, Anschluss an die S6 in Korntal), die **Gräfenbergbahn** (Nürnberg
Nordost–Gräfenberg), die **Müglitztalbahn** (Heidenau–Altenberg), und ein paar
Stichstrecken mehr. Sie sind im Datensatz Inseln, und eine Insel hat keine
Lage in der Zeit.

Für die Karte bleiben die Bahnhöfe, die mehr als 80 % aller anderen erreichen:
**4.781 von 5.002**. Die 221 anderen fehlen, und sie sind in der Seite
benannt. Innerhalb des Kerns bleiben **0,012 % der Paare** ohne Verbindung;
diese bekommen keine Feder, statt eine geratene Ruhelänge zu erhalten.

## 3. Das Federmodell

### 3.1 Projektion und Maßstab

Die Geografie wird **kegelkonform nach Lambert** projiziert, mit den
Normalparallelen 48,67° und 53,67° N, Ursprung 51° N / 10,5° O. Das ist die
Projektion, die für Deutschland gemacht ist: sie hält Winkel und damit Formen,
und ein Längenmaßstab in Kilometern gilt in der Mitte des Landes genau und an
den Rändern auf ein halbes Prozent. Ausdehnung: 626 × 837 km.

Der Startmaßstab kommt aus der Kleinste-Quadrate-Anpassung der Geografie an
die Reisezeit und ist **1,199 Minuten je Kilometer**; nach der Optimierung
steht er bei 1,192 für die flache und 1,143 für die Geländekarte — im Mittel
also 50 bis 52 km/h von Bahnhof zu Bahnhof, Warten und Umsteigen eingerechnet.

### 3.2 Die flache Karte: Stress-Majorisierung

Zwischen je zwei Bahnhöfen hängt eine Feder mit der Reisezeit als Ruhelänge.
Gesucht ist die Lage, die

    Stress = Σ w_ij (‖p_i − p_j‖ − t_ij)²  /  Σ w_ij t_ij²

minimiert. Gelöst wird das mit **SMACOF** (de Leeuw 1977), nicht mit einem
Gradientenverfahren: jeder SMACOF-Schritt senkt den Stress garantiert, was auf
dieser Zielfunktion sonst nicht gilt. 400 Schritte über 11,4 Millionen
Federpaare; konvergiert ist es nach etwa 100.

**Gewichtet wird mit w = 1/t².** Damit wird der *relative* Fehler gemessen.
Ohne diese Gewichtung walzen die Fernpaare die Nahbeziehungen platt: eine
Reise von zehn Stunden um zehn Minuten zu verfehlen ist kein Fehler, eine von
zehn Minuten um zehn Minuten ist einer.

Gestartet wird in der Geografie, nicht im Zufall. Das hält die Lösung in
derselben Mulde — Norden bleibt oben — und spart die Frage, welche von zwei
gespiegelten Lösungen die richtige ist. Am Ende wird die Lage mit einer reinen
Drehung gegen die Geografie ausgerichtet (0,34°); Maßstab und Spiegelung
bleiben unangetastet, weil beide Bedeutung tragen.

Ergebnis: Stress **23,37 %**, gegen 29,95 % für die bestmöglich skalierte
Landkarte. Der Grundriss liegt im Mittel 77,4 km (RMS) von der Geografie, nach
optimalem Drehen und Skalieren.

### 3.3 Das Gelände: die geprüfte Vermutung

Die Reisezeit ist keine Geometrie der Ebene, und man kann genau sagen, woran
es scheitert: von einem abgelegenen Ort sind es zu allem zwei Stunden, aber in
der Ebene gibt es keinen Punkt, der von allem gleich weit weg ist und
trotzdem in der Nähe liegt. 23 % bleiben liegen, und keine flache Lage nimmt
sie weg.

Der Vorschlag, mit dem dieses Projekt anfing, war: **abgelegene Orte höher
zeichnen.** Formal heißt das, jedem Bahnhof eine dritte Zahl h ≥ 0 zu geben
und die Modelldistanz nicht mehr als Luftlinie zu rechnen, sondern als
**kürzesten Weg über das Gelände** — die kürzeste Kette von Kanten im
Nachbarschaftsgraphen, jede Kante so lang wie

    ℓ_ij = √( (x_i−x_j)² + (y_i−y_j)² + (h_i−h_j)² )

Das ist die richtige Geometrie für ein Netz aus Knoten und Ästen, und zwar aus
einem Grund, der in der Luftlinie fehlt: **vom Gipfel zum Gipfel muss der Weg
ins Tal hinunter und wieder hinauf.** Die beiden Höhen addieren sich, genau wie
sich die Zu- und Abgangszeiten addieren. Zwei Nachbarn auf demselben Ast
bleiben dagegen Nachbarn, weil der Weg oben auf dem Kamm bleibt — und daran
scheitert das einfachere additive Modell t̂ = ‖Δp‖ + h_a + h_b, das zwei
Haltepunkte fünf Minuten auseinander auf ihre beiden Zugangszeiten
aufaddieren würde.

Gerechnet wird der Gradient über die Kürzeste-Wege-Bäume: für jede Quelle
einmal Dijkstra, dann die Lasten von den Blättern her aufsummieren — das ist
O(n) je Quelle statt O(n · Weglänge), und damit ist der ganze exakte Gradient
über 11,4 Millionen Paare in 1,4 Sekunden da. Nachgeführt wird mit Adam, die
Schrittweite fällt über 200 Schritte auf 3 %.

Drei Dinge mussten dabei gelernt werden:

**Bei h ≡ 0 ist der Höhengradient genau null.** In die Kantenlänge geht nur der
Höhen*unterschied* ein, und der ist überall null: das flache Optimum ist für
die Höhe ein Sattel, aus dem kein Gradientenschritt herausführt. Die Höhe
braucht einen Anstoß, und er kommt nicht aus dem Zufall, sondern aus der
Messung — wo die flache Karte einen Bahnhof im Mittel zu nah an alles andere
zeichnet, fehlt Weg, und der fehlende Weg ist die Höhe. Die Hälfte dieses
Rests ist der Ansatz (die Hälfte, weil zwei Gipfel ihre Höhen beide
beitragen): im Mittel 13,7, höchstens 40 Minuten.

**h ≥ 0 muss erzwungen werden.** Weil nur Höhenunterschiede zählen, wüsste das
Modell von sich aus nicht, ob ein abgelegener Ort ein Berg oder ein Loch ist —
für einen Weg über die Oberfläche kostet beides dasselbe. Die Schranke
entscheidet das: die gut erreichbaren Achsen liegen auf null, alles andere
steigt daraus auf.

**Der Nachbarschaftsgraph gehört zur Lage, nicht zur Rechnung.** In einer
ersten Fassung wurde er alle zwanzig Schritte neu gebaut. Gemessen sank der
Stress zwanzig Schritte lang auf 0,2044 und stieg beim ersten Neubau wieder
auf 0,215: das Verfahren hatte nicht die Zeit getroffen, sondern die Umwege
des festgehaltenen Graphen ausgenutzt. Jetzt wird er in jedem Schritt neu
gebaut, zwölf Nachbarn je Bahnhof, rund 33.500 Kanten.

Gerechnet in zwei Abschnitten: 50 Schritte nur die Höhe, die Ebene hält still;
dann 150 Schritte beide zusammen.

| Karte | Stress | Grundriss von der Geografie |
|---|---:|---:|
| Landkarte, bestmöglich skaliert | 29,95 % | 0 km |
| flache Federkarte | 23,37 % | 77,4 km |
| dieselbe Ebene, dazu ein Höhenfeld | 21,77 % | 77,4 km |
| Ebene und Höhe zusammen | 19,65 % | **76,5 km** |

**Die Vermutung stimmt.** Das Relief nimmt ein Drittel des Weges von der
Landkarte zur perfekten Karte, und der Grundriss wird dabei nicht krummer,
sondern eine Spur gerader: 76,5 gegen 77,4 km. Die Höhe nimmt der Ebene Arbeit
ab, ohne sie zu bezahlen.

### 3.4 Warum diese Höhe trotzdem nicht auf der Karte steht

Die Modellhöhe ist **nicht die Erreichbarkeit**, und sie kann es nicht sein.
Dass Hamburg weiter von allem entfernt liegt als Fulda, steht schon im
Grundriss — Hamburg liegt am Rand des Landes. Was der Grundriss ausdrücken
kann, braucht die Höhe nicht auszudrücken; für sie bleibt nur der Rest, und
der ist kleinräumig. Gemessen: Modellhöhe und die mittlere Reisezeit zu allen
Bahnhöfen korrelieren mit **r = −0,06**, also gar nicht.

Wie das aussieht, ist der eigentliche Befund. Die Modellhöhe wird am tiefsten
an den Rändern — Westerland, Ostseebad Binz, Zittau liegen bei 0 —, weil die
Ebene sie ohnehin weit außen zeichnet und keine Höhe braucht. Am höchsten
wird sie über dem Spessart, der Rhön und Thüringen, wo Orte mitten im Land
liegen und trotzdem schlecht zu erreichen sind. Und die großen Knoten liegen
bei 13 bis 17 Minuten, also **über** Westerland. Mathematisch richtig,
erzählerisch falsch.

Ein Versuch, das zu retten, steht im Code: ein Sparsamkeitsglied λ·Σh, das die
Höhe nach unten zieht, damit nur stehen bleibt, was sich verdient. Es
funktioniert wie erwartet — bei λ = 0,15 · mittlerer Höhengradient sinkt die
mittlere Höhe von 19,2 auf 9,7 Minuten und der Stress steigt um weniger als
einen Punkt — und es ändert nichts an der Sache: die Höhe bleibt der
kleinräumige Rest und wird nicht zur Erreichbarkeit. Zu haben ist es über
`./feder … <λ> <Schritte>`; voreingestellt ist λ = 0.

## 4. Was gezeichnet wird

**Der Grundriss** ist die flache Federkarte (3.2), verzogen von der Geografie
in die Zeit, mit einem Regler dazwischen. Die flache und nicht die
Geländelage, weil die Aussage dann so einfach ist, wie sie klingt: *der
Abstand auf der Karte ist die Reisezeit.*

**Die Höhe** ist eine gemessene Größe, kein Modellwert — welche, ist die
Frage dieses Abschnitts, und die Antwort ist ein Regler statt einer Zahl.

### 4.1 Eine Familie, kein einzelnes Maß

Gefragt ist nicht Entfernung, sondern das Gefühl, angebunden zu sein. Zwei
naheliegende Antworten sind beide schief, und zwar in entgegengesetzte
Richtungen.

| Kandidat | Spanne | Median | r gegen A |
|---|---:|---:|---:|
| **A** mittlere Reisezeit zu allen 4.780 anderen Bahnhöfen | 260–718 | 380 | — |
| **B** dasselbe, nach Menschen gewichtet | 241–712 | 364 | **+0,973** |

**A ist falsch gewichtet.** Ein Haltepunkt mit dreißig Einwohnern zählt darin
wie Köln. Weil die Haltepunkte in der Fläche liegen und die Städte wenige
Bahnhöfe haben, zieht das die Karte nach außen.

**B behebt genau das — und ändert die Karte fast nicht.** A und B korrelieren
mit **r = 0,973**. Der Grund ist einfach, sobald man ihn sieht: ein Mittelwert
über ein großes Land wird von der *fernen Hälfte* bestimmt. Für jeden Ort in
Deutschland ist die größte Summe in diesem Mittel die Strecke zum anderen
Ende, und die hängt davon ab, wo er liegt, nicht davon, wie er angeschlossen
ist. An den Zahlen: München 316 Minuten in A, 316 in B; Nürnberg 272 und 271.
Nur der Westen rutscht (Dortmund 315 → 270). München liegt in beiden so
schlecht wie Ulm, und München fühlt sich nicht so an.

**Der umgekehrte Fehler ist genauso leicht zu machen.** Eine erste Fassung
dieser Karte fragte „wie lange, bis ein Zehntel Deutschlands erreichbar ist",
und das Ruhrgebiet wurde darin ein einziger blauer See. Bei einer Million ist
es noch deutlicher: dann misst die Größe im Grunde, wie lange man braucht, um
die eigene Stadt zu durchqueren — Berlin 18 Minuten, München 24 — und die
Karte ist eine Karte der Ballungsräume.

#### Beides ist dieselbe Größe

Sortiert man von einem Bahnhof aus alle anderen nach Reisezeit und summiert
ihre Einzugsgebiete auf, entsteht eine Verteilung F_i(t): welcher Anteil
Deutschlands nach t Minuten in Reichweite ist. Dann ist

    A_i = ∫ t dF_i(t)              der Mittelwert dieser Verteilung
    C_i(q) = F_i⁻¹(q)              ihr q-Quantil

Beide Pole sind Funktionale **derselben** Verteilung, und der Anteil q ist der
Parameter, der zwischen ihnen schiebt: kleines q schaut nur auf die nächste
Bevölkerung (Dichte), großes q verlangt, bis in die Ecken zu kommen
(Geografie). Darum ist der Anteil in der Seite ein **Regler** und keine
gesetzte Zahl. Achtzehn Stufen von 2 bis 90 Prozent liegen vorgerechnet in der
Nutzlast — logarithmisch gelegt, weil sich das Bild unten schnell und oben
langsam ändert —, und die Seite mischt linear in log q zwischen den beiden
benachbarten Stufen. Der Unterschied zwischen Nachbarstufen ist klein gegen
die Glättung des Höhenfeldes (4.3), die Mischung also nicht zu sehen.

| Anteil | Minuten | Median | die drei tiefsten | r gegen A |
|---:|---:|---:|---|---:|
| 2 % | 28–597 | 136 | Berlin Hbf, Köln, Düsseldorf | 0,760 |
| 3 % | 38–604 | 152 | Köln, Düsseldorf, Berlin Ostbahnhof | 0,767 |
| 4 % | 48–608 | 164 | Düsseldorf, Duisburg, Düsseldorf Flughafen | 0,775 |
| 6 % | 58–617 | 186 | Düsseldorf, Duisburg, Mülheim | 0,811 |
| 8 % | 70–626 | 204 | Duisburg, Düsseldorf, Essen | 0,845 |
| 10 % | 81–630 | 216 | Düsseldorf, Duisburg, Essen | 0,860 |
| 13 % | 100–640 | 236 | Duisburg, Essen, Düsseldorf | 0,878 |
| 17 % | 126–650 | 256 | Dortmund, Essen, Düsseldorf | 0,895 |
| 21 % | 149–656 | 272 | Frankfurt Flughafen, Köln, Frankfurt Hbf | 0,906 |
| **25 %** | **160–665** | **288** | **Frankfurt Flughafen, Frankfurt Hbf, Köln** | **0,916** |
| 30 % | 175–672 | 305 | Frankfurt Flughafen, Frankfurt Hbf, Mannheim | 0,927 |
| 36 % | 192–702 | 324 | Frankfurt Flughafen, Frankfurt Hbf, Frankfurt Süd | 0,934 |
| 43 % | 214–716 | 344 | Frankfurt Flughafen, Frankfurt Hbf, Mannheim | 0,944 |
| 50 % | 232–744 | 364 | Frankfurt Hbf, Frankfurt Flughafen, Kassel-Wilhelmshöhe | 0,954 |
| 58 % | 254–774 | 388 | Frankfurt Hbf, Kassel-Wilhelmshöhe, Fulda | 0,968 |
| 67 % | 272–790 | 415 | Fulda, Kassel-Wilhelmshöhe, Frankfurt Hbf | 0,978 |
| 78 % | 298–806 | 451 | Fulda, Kassel-Wilhelmshöhe, Göttingen | 0,980 |
| 90 % | 353–863 | 509 | Fulda, Kassel-Wilhelmshöhe, Göttingen | 0,964 |

Von unten nach oben ist das der ganze Weg von der Dichte- zur Geografiekarte,
und die Korrelation mit A steigt monoton von 0,76 auf 0,98. Bei keiner Stufe
bleibt ein Bahnhof übrig, der den Anteil im Suchhorizont nicht erreicht.

#### Wo die Voreinstellung sitzt, und warum

Die Wahl hat eine gemessene Grenze. Eine Erreichbarkeitskarte ist genau so
lange eine Dichtekarte, wie die **eigene Agglomeration den geforderten Anteil
allein hergibt** — dann muss niemand das Netz benutzen. Nachgezählt, mit der
Bevölkerung aus 4.2:

| von | in 45 min | in 60 min | in 90 min |
|---|---:|---:|---:|
| Essen Hbf | 3,3 % | 5,2 % | **11,6 %** |
| Frankfurt (Main) Hbf | 1,3 % | 2,6 % | 5,6 % |
| Berlin Hbf | 3,2 % | 4,1 % | 5,4 % |
| München Hbf | 1,9 % | 2,8 % | 4,9 % |

Rhein-Ruhr ist die größte zusammenhängende Ballung des Landes, und sie ist
rund ein Achtel davon wert. Oberhalb von etwa einem Siebtel kann also keine
Region mehr aus sich selbst schöpfen — und genau dort kippt die Tabelle: bei
17 % führt noch das Ruhrgebiet, bei 21 % Frankfurt. Am oberen Ende friert die
Rangfolge ab etwa zwei Dritteln ein, weil es dann nur noch darauf ankommt, wie
schnell man Sylt und Rügen erreicht.

Damit liegt das brauchbare Fenster zwischen einem Sechstel und der Hälfte. Ein
**Viertel** — 20,9 Millionen, etwa das Doppelte der größten Ballung — ist die
runde Zahl in seiner Mitte. Voreingestellt ist inzwischen aber **die Hälfte**, 41,8
Millionen, also das *obere* Ende des Fensters: das ist das Land und nicht der
Ballungsraum. Bei der Hälfte zahlt sich eine mittige Lage aus, und am tiefsten
liegen Frankfurt Hbf, Frankfurt Flughafen und Kassel-Wilhelmshöhe; das Relief
spannt von 232 bis 744 Minuten. Schiebt man zum Sechstel hinunter, bekommt man
die andere Lesart, in der das Netz entscheidet und nicht der Ort. Beide sind
wahre Aussagen über dieselben Daten — der Regler ist da, weil keine von beiden
die einzige ist, und `VORGABE` in `build/05_seite.py` sagt nur, wo er beim
Aufschlagen steht.

Gerechnet wird auf der **hin und zurück gemittelten** Matrix, wie A und B. Die
Richtung „von hier weg" allein wäre näher an der Formulierung, aber
anfälliger: eine einzelne glückliche Morgenverbindung kann sie um eine halbe
Stunde verschieben.

### 4.2 Das Bevölkerungsgewicht

Gebraucht wird eine Zahl je Bahnhof: wie viele Menschen über ihn an das Netz
kommen. Drei Schritte, jeder geprüft.

**Die Kreisbevölkerung** kommt zum 31. Dezember 2024 aus dem Nachbarprojekt
[bevoelkerung-kreise](../bevoelkerung-kreise/) — 400 Kreise, zusammen 83,6
Millionen, letztlich aus der German Local Population Database (GPOP).

**Die Kreisgeometrie** kommt aus derselben Seite, wo sie in der Nutzlast
liegt: ein Zickzack-Varint über einem 64-Zeichen-Alphabet, fünf Bit je
Zeichen, Bit 32 als Fortsetzung. Entpackt sind das 400 Kreise mit 12.000
Knoten in einem 8000 × 10213 großen Gitter über einer Lambert-azimutal
flächentreuen Projektion (ETRS89-LAEA, Bezugsmeridian 10° O,
Bezugsbreite 52° N).

Weil die Projektion **flächentreu** ist, lässt sich das Ganze gegen die
amtlichen Kreisflächen prüfen, und das ist die eigentliche Absicherung dieser
Kette:

| Probe | Ergebnis |
|---|---|
| Maßstab aus den amtlichen Flächen | 1 Gittereinheit = 86,06 m |
| Maßstab aus dem Rahmen gegen den Umriss | 85,85 m in x, 85,85 m in y |
| Unterschied zwischen den Achsen | 0,00 % |
| Abweichung der Kreisflächen, Median | 0,71 % |
| — 90. Perzentil | 4,56 % |
| — Maximum | 23,9 % (Bremerhaven) |
| Gesamtfläche | 357.677 km², amtlich wie gerastert |
| neun Städte bekannter Lage im Ring ihres Kreises | 9 von 9 |

Die y-Achse des Gitters läuft übrigens nach **Süden** — Flensburg liegt bei
qy 472, München bei 9052. Die Nutzlast des Nachbarprojekts steht also schon in
Bildschirmrichtung, nicht in Projektionsrichtung. Ohne diese Probe wäre die
Karte oben-unten vertauscht in die Kreise gelaufen, und niemand hätte es
gesehen, weil die Summen gestimmt hätten.

**Die Einzugsgebiete** entstehen durch Rastern: jeder Kreis wird mit 2 km
abgetastet (89.089 Zellen), jede Zelle trägt ihren Anteil an der
Kreisbevölkerung, und dieser Anteil geht an den **nächstgelegenen Bahnhof** —
über Kreisgrenzen hinweg, denn Menschen fahren zum nächsten Bahnhof und nicht
zum nächsten im eigenen Kreis. Verteilt werden alle 83,6 Millionen, keine
bleibt liegen; 41 Bahnhöfe bekommen null, weil ein größerer Nachbar ihnen
jede Rasterzelle abnimmt.

Zwei Dinge kann das nicht:

- **Innerhalb eines Kreises ist die Bevölkerung gleichmäßig verteilt.** In
  einem Landkreis mit einer Stadt und viel Wald sitzt damit zu viel
  Bevölkerung im Wald. Feiner geht es nur mit Gemeinde- oder Rasterdaten, und
  die liegen hier nicht (siehe [QUELLEN.md](QUELLEN.md)).
- **Die größten Einzugsgebiete liegen an Vorortbahnhöfen** — München Ost
  476.000, Leverkusen Mitte 408.000, Berlin Schöneweide 370.000 —, weil in den
  Städten die S-Bahn fehlt und die Stadtbevölkerung an den wenigen
  verbliebenen Regionalbahnhöfen landet. Für das Maß C ist das ohne Belang,
  weil diese Bahnhöfe Minuten voneinander entfernt liegen; als Zahl je Bahnhof
  gelesen ist es irreführend, und im Zeiger steht sie trotzdem.

### 4.3 Das Höhenfeld

Das Feld ist ein mit einer Glocke gewichteter Mittelwert der Bahnhofshöhen,
σ = 11 Minuten (etwa 10 km).

Gerechnet wurde das lange **Glocke für Glocke**: jeder Bahnhof legte seine
Kurve ins Raster, danach wurde durch die Summe der Gewichte geteilt. Das
kostet die Zahl der Bahnhöfe mal die Fläche der Glocke, mit je einem `exp()`
darin — und die Glockenfläche wächst mit dem *Quadrat* der Feinheit. Bei drei
Minuten je Zelle waren es zweieinhalb Millionen `exp()` und 149 ms; bei
anderthalb Minuten zehn Millionen und 647 ms. Damit war das Raster nicht
feiner zu machen, und genau das sollte es werden (4.11).

Jetzt kommt jeder Bahnhof als **Impuls** ins Raster — bilinear auf vier Zellen
verteilt, damit seine Lage im Bruchteil einer Zelle nicht verloren geht —, und
dann werden Zähler und Nenner **getrennt verwischt**. Der Quotient ist
derselbe gewichtete Mittelwert wie vorher, nur kostet er O(Zellen) statt
O(n · r²). Verwischt wird mit **drei Kastenfiltern hintereinander**: das ist
eine Glocke auf drei Prozent genau (Kovesi), und ein Kastenfilter mit
laufender Summe kostet je Zelle zwei Additionen, ganz gleich wie breit er ist.
Am Rand wird mit Null gerechnet, was man hier darf, weil Zähler und Nenner
denselben Filter sehen und sich der Rand im Quotienten heraushebt. Gefiltert
wird nur **waagerecht**: für die senkrechten Durchgänge wird das Feld
blockweise transponiert. Eine Spaltenschleife springt bei
siebenhunderttausend Zellen einmal je Spalte durch knapp drei Megabyte, und
das hält kein Cache aus.

**Gerechnet wird gröber, als gezeichnet wird**, und das ist der zweite
Eingriff. Beides sind verschiedene Dinge: das Feld ist mit σ = 11 Minuten
geglättet und bei 1,2 Minuten je Zelle also neunfach überabgetastet — feiner
gerechnet wird es nicht genauer. Scharf sein muss nicht das Feld, sondern was
daraus gezeichnet wird: Farbbänder, Höhenlinien, Licht. Die sind
nichtlineare Funktionen der Höhe und brauchen jede Bildzelle. Also läuft die
ganze Kette — Impulse, Verwischen, Teilen, Löcher — auf einem Gitter von
etwa 3,6 Minuten je Zelle, wird bilinear aufs Bildgitter gesetzt und einmal
nachgeglättet. Das Rechengitter hat damit ein Neuntel der Zellen.

Drei Kastenfilter mit **ganzzahligem** Radius treffen aber nicht jedes σ. Auf
dem feinen Gitter fällt das nicht auf; auf dem gröberen liegen zwischen r = 2
und r = 3 volle vier Minuten, und die Karte wäre entweder zu scharf oder um
ein Sechstel zu weich gewaschen. Darum **gemischte Radien**: ein Teil der
Durchgänge einen Schritt breiter, und gesucht wird das Tripel, dessen
Varianzsumme der Zielvarianz am nächsten kommt. Die Zielvarianz ist dabei
nicht σ² selbst, denn das bilineare Hochsetzen (Varianz (s²−1)/12) und die
Nachglättung verwischen mit; ihre Varianz wird **abgezogen**, statt sie oben
draufzulegen. Nachgemessen bleibt σ über alle Rasterstufen bei 10,6 bis 10,8
Minuten — gleich genug, dass ein Wechsel der Stufe das Gelände nicht
verändert.

| | Glocke für Glocke | Kastenfilter, feines Gitter | Kastenfilter, gröberes Gitter |
| --- | --- | --- | --- |
| ZELLE = 3,0 | 149 ms | 21 ms | — |
| ZELLE = 1,5 | 647 ms | 118 ms | — |
| ZELLE = 1,24 | — | 93–135 ms | **33–53 ms** |

**Löcher**, wo kein Filter mehr hinreicht, werden aus den Nachbarn
nachgezogen. Sie liegen immer *außerhalb* des Landes — ein Bahnhof ist selbst
ein Impuls und hat damit Abdeckung —, und das Land wird ohnehin beschnitten
(4.5); gebraucht wird ihr Wert nur für den Saum, über den beim Hochskalieren
interpoliert wird. Vierzig Durchgänge über das **ganze** Raster, jeder mit
einer Kopie des Feldes, waren darum der zweitteuerste Posten der Rechnung —
und zwar gerade bei der Landkarte, wo die halbe Bildfläche leer ist und nie
ein Loch zuging. Eine *Liste* der Löcher war dann der nächste Fehler: bei der
Landkarte sind das dreihunderttausend Einträge, und ein JavaScript-Array
verpackt jede Zahl einzeln — das allein kostete mehr als das ganze
Verwischen. Jetzt ist die Liste ein `Int32Array`, wird einmal angelegt und in
jeder Runde an derselben Stelle zusammengeschoben; nach acht Runden bekommt
der Rest das Mittel des Feldes, weil er nie gezeigt wird, NaN sich aber durch
die Glättung frisst. Eine sehr frühe Fassung stopfte alle Löcher mit einem
festen Wert, und aus dem wurde eine weiße Kuppe im Nirgendwo. Zuletzt
Binomialglättung — bei gröberem Rechengitter zweimal, weil eine bilineare
Vergrößerung knickige Ableitungen hat und die Ableitung hier das Licht ist:
ohne diesen Durchgang bekäme der Hang Facetten auf den Zellgrenzen des
Rechengitters.

σ war eine Fassung lang 15 Minuten. Das neue Maß springt zwischen Nachbarn
stärker als das alte, und bei 15 wusch das Feld die Knoten weg: Frankfurt
Hauptbahnhof lag über dem Wasserstand, obwohl der Bahnhof darunter liegt.

### 4.4 Wo ist Land?

Zwei Schichten, und die zweite ist der Punkt.

Die erste ist der **verzogene Umriss**. Umriss und Ländergrenzen liegen in der
Geografie, die Karte liegt irgendwo zwischen Geografie und Zeit. Verschoben
wird jeder Grenzpunkt mit dem **Verschiebungsfeld der Bahnhöfe selbst**:
gewichtet mit dem Kehrwert des Quadrats des Abstands plus 35 Minuten Dämpfung,
über mindestens vierzig Bahnhöfe in seiner Umgebung. So bleibt die Kieler
Förde die Kieler Förde, auch wenn Kiel wegläuft. Eine erste Fassung nahm sechs
Nachbarn mit 15 Minuten Dämpfung; die folgte einzelnen Bahnhöfen und riss
Zacken in die Küste.

Die zweite Schicht gilt **nur für die Ausgewanderten**. Der verzogene Umriss
ist ein geglättetes Mittel, und die Federkarte schleudert einzelne Bahnhöfe
weit darüber hinaus: **539 von 4.781** liegen in der reinen Zeitkarte jenseits
der Küste, die Rügener Bäderbahn zwölf Stunden von allem entfernt. Ein Bahnhof
gehört aber immer auf Land, sonst steht er im Schwarzen neben der Karte — und
genau das war zu sehen. Also bekommt jeder Bahnhof, der außerhalb des
Umrisses liegt, eine eigene **Scholle**; benachbarte Schollen wachsen
zusammen.

Die Scholle war eine Glockenkurve mit weichem Saum und gut zwanzig Minuten
Radius, und auf dem Bildschirm wurde daraus ein ausgefranster Nebelfleck.
Jetzt ist sie eine **Kreisscheibe mit hartem Rand und 11,5 Minuten Radius** —
halb so groß. Das ist zweimal besser: der Rand ist eine Kante statt eines
Verlaufs, und die Scheibe hat eine Zahl, an der man sie fassen kann. Wo
mehrere Ausgewanderte dicht beieinander liegen, laufen die Scheiben zu einer
Gruppe zusammen, und aus der Wolke wird ein Archipel.

Das stellt sich von selbst richtig ein: in der Landkarte liegt kein deutscher
Bahnhof draußen, es kommt nichts hinzu, und die Karte ist genau Deutschland.
Je weiter der Regler läuft, desto mehr Inseln lösen sich. Eine Zwischenfassung
nahm stattdessen die Abdeckung **aller** Bahnhöfe und blies damit auch die
Landkarte zu einer Wolke auf, zwanzig Kilometer über jede Küste hinaus.

### 4.5 Der Umriss in Dreiecken

Ein verzogener Ring lässt sich nicht einfach füllen. Das Verschiebungsfeld
schert ihn, und wo er sich dabei selbst überschlägt, heben sich die
Umlaufzahlen auf: mit der Nonzero-Regel wird aus der Falte ein **Loch**, und
auf der Karte standen kleine schwarze Dreiecke mitten im Land. Mit Evenodd
wird es nicht besser, nur anders — und Evenodd hat noch ein zweites Problem,
weil Rügen und Hiddensee im Quelldatensatz eigene Ringe sind und den
Hauptumriss überlappen.

Darum wird jeder Ring **einmal** in Dreiecke zerlegt (Ohrenschneiden, 2.476
Dreiecke aus 2.528 Punkten, einmalig beim Laden), und je Bild werden die
Dreiecke gefüllt. In der Falte überdecken sie einander, statt sich
wegzurechnen. Damit das auch für umgeklappte Dreiecke gilt, wird die
Umlaufrichtung **nach** dem Verziehen geprüft und notfalls gedreht: dann
zählen alle positiv, und eine Überlappung ist nie ein Loch. Nachgezählt bleiben
zwei Löcher im Land — und die sind echt: die Bodden hinter Rügen und das
Wattenmeer bei Husum.

**Beschnitten, nicht maskiert.** Aus diesen Dreiecken und den Inselscheiben
(4.4) wurde lange eine Maske im Feldraster: ein Alphakanal je Zelle, den das
Bild mitführte. Der hat die Küste weich gemacht, und zwar unvermeidlich — das
Feldbild wird auf den Bildschirm hochskaliert, und dabei wird der Alphakanal
bilinear mitinterpoliert. Bei drei Minuten je Zelle war eine Zelle zweieinhalb
Pixel breit, und die Küste damit ein Verlauf über zweieinhalb Pixel.

Jetzt ist dieselbe Geometrie ein **Pfad in Bildschirmkoordinaten**, und das
Bild wird damit beschnitten (`clip`) statt ausmaskiert. Ein Pfad hat keine
Auflösung; die Kante ist so scharf, wie der Bildschirm kann. Der Nonzero-Umlauf
trägt weiter, weil die Dreiecke nach dem Verziehen auf positive
Umlaufrichtung gedreht werden und ein `arc()` mit wachsendem Winkel dieselbe
hat — eine Überlappung addiert also, sie hebt sich nicht auf. Im Bild selbst
steht nun überall Alpha 255, auch außerhalb des Landes: dort gibt das
Höhenfeld trotzdem eine sinnvolle Farbe her, und darum blutet an der
Schnittkante kein Schwarz ein.

Das Raster braucht die Maske weiter, aber nur noch als *Statistik* — für die
Frage, welche Zellen beim 99,5-Perzentil der Farbleiter mitzählen (4.7), und
für die Frage, wer außerhalb des Umrisses liegt (4.4). Gezeichnet wird sie
nicht mehr.

Der scharfe Schnitt zeigt eine Eigenheit der Daten, die der Verlauf verdeckt
hat: Umriss und Ländergrenzen sind zwei unabhängig vereinfachte Polygonzüge
und stimmen nicht genau überein. 0,47 % der Landfläche deckt nur der
Länderzug, 0,40 % nur der Umriss. Wo so ein Splitter weit von jedem Bahnhof
liegt, steht er jetzt als kleine weiße Zunge im Meer. Gezeichnet wird trotzdem
die **Vereinigung**, denn jede der beiden allein lässt Lücken, und dem reinen
Umriss fielen neun Bahnhöfe aus dem Land.

### 4.6 Der Bildausschnitt steht fest — und ist zugeschnitten

Er wird **einmal** bestimmt und gilt für jede Reglerstellung: über die
Bahnhöfe in beiden Lagen und über den Umriss in beiden Lagen. Das hat zwei
Gründe.

Nur die Bahnhöfe zu nehmen war zu wenig, denn das Verschiebungsfeld verzieht
die Küste über sie hinaus. Und einen Ausschnitt je Reglerstellung zu rechnen
wäre falsch, denn dann wanderte der Maßstab beim Schieben mit — und genau die
Verformung, um die es geht, wäre nicht mehr zu sehen. Dass die Karte beim
Schieben aufgeht statt sich nur zu verbiegen, ist selbst eine Aussage — die
Zeit macht Deutschland größer.

Der Preis war, dass die Landkarte den Schirm nicht ausfüllte, und er war zu
hoch. Der Ausschnitt kommt nämlich **ganz** von der Zeitkarte: die Federkarte
ist 1.274 × 1.302 Minuten groß, die Landkarte nur 715 × 956. Ein paar Enden
von Nebenbahnen — Oberwiesenthal, die Rügener Bäderbahn, Westerland — fahren
so weit hinaus, dass Deutschland in der Mitte des Bildes auf drei Viertel der
Bildhöhe schrumpfte und dort saß wie eine Briefmarke auf einem Bogen.

Also wird der Ausschnitt zugeschnitten, und zwar **so weit, wie die Landkarte
es zulässt**: bis sie in der engeren Achse mit einem Saum von 8 Minuten genau
hineinpasst. Der Faktor ist damit nicht gesetzt, sondern gemessen — bei diesen
Daten **1,29**, also 985 × 1.006 Minuten. Verschoben wird danach nur noch, nie
gedehnt, sonst wäre der Gewinn wieder weg.

Der Reglerstreifen unter der Karte (4.10) kostet auch noch Höhe. Nachgemessen
gegen die Fassung davor bleibt:

| Fenster | Maßstab vorher | nachher | Deutschland |
| --- | --- | --- | --- |
| 1920 × 1080 | 0,796 | 0,985 | **+24 %** |
| 1440 × 900 | 0,660 | 0,809 | **+23 %** |
| 1280 × 720 | 0,524 | 0,632 | **+21 %** |
| 400 × 860 (hochkant) | 0,297 | 0,384 | **+29 %** |

(Maßstab in Pixeln je Minute.) Hochkant kommt der Zuschnitt voll durch, weil
die Karte dort breitenbegrenzt ist und der Streifen keine Bildhöhe wegnimmt,
die der Maßstab überhaupt nutzen könnte.

Bei `morph = 0` geht dabei garantiert nichts verloren — das ist die Bedingung,
aus der der Faktor kommt. In der reinen Zeitkarte fliegen die weit
hinausgefahrenen Enden aus dem Bild, und das ist der Handel:

| | |
| --- | --- |
| Bahnhöfe außerhalb des Ausschnitts, `morph = 0` | 0 |
| Bahnhöfe außerhalb des Ausschnitts, `morph = 1` | 108 von 4.781 = **2,3 %** |
| … deren Anteil an allen Halten | 2.656 von 295.476 = **0,9 %** |
| Median Halte am Tag, hinausgefallen / alle | 20 / 42 |

Es sind erwartbare Namen: die Bodenseerunde von Friedrichshafen bis
Überlingen, die Rügener Bäderbahn, die Erzgebirgs- und Zittauer Schmalspur,
Sylt und Dagebüll, der Bayerische Wald um Grafenau, die Heidekrautbahn, die
Schwäbische Alb um Münsingen. Ein Halt mit acht Zügen am Tag hat kaum Federn,
die ihn halten; seine Lage ist die unsicherste der ganzen Rechnung, und ihn zu
verlieren kostet die Karte am wenigsten.

Wer außerhalb liegt, wird **nicht gezeichnet** — kein Punkt, kein Name, keine
Kurzinfo unter dem Zeiger. Eine Beschriftung, die allein im schwarzen Rand
steht, sieht nicht nach „aus der Karte gefallen" aus, sondern nach einem
Fehler. Weil in der Zeitkarte gerade die *abgelegensten* Halte die sind, die
hinausfahren, und weil genau die die Beschriftung der treibenden Schollen
liefern (4.8), kommen die Fernmarken jetzt aus einem größeren Vorrat, und
gezählt wird, was **gemalt** wurde — nicht, was angeboten war. Sonst rückten
mit jedem Ausfall zwei neue Namen nach und die Karte würde ein Register.

### 4.7 Farbe, Licht, Höhenlinien, Schnee

Die Farbleiter ist in **absoluten Minuten** beschriftet, nicht als Aufschlag
auf den besten Bahnhof: „Wasser unter 250 Minuten" ist eine Aussage, „unter
+90" ist eine Rechenaufgabe. Gerechnet wird intern über dem Besten, weil die
Leiter dort ihren Nullpunkt hat.

**Fünfunddreißig Bänder**: fünf Blaustufen unter Wasser, vierundzwanzig
Landbänder darüber — die Höhenstufen eines physischen Atlas, Tiefland satt
grün, dann Gelbgrün, Gelb, Ocker, Orange, Rot, Braun — und zuoberst **sechs
Bänder Schnee**, von hellem Grau bis Weiß. So viele, damit jede Bandgrenze
eine Höhenlinie tragen kann und die Karte die gestochene Dichte einer
Reliefkarte bekommt.

Die **Schneegrenze** ist nicht gesetzt, sondern abgeleitet: die Leiter läuft
vom Wasserstand bis zum 99,5-Perzentil der Höhe **auf dem Land**, und die
letzten sechs Bänder sind Schnee. In Minuten steht sie in der **Legende unter
der Karte** — bei der Hälfte und Wasser auf 322 Minuten liegt sie bei 519
Minuten, und zwar in jeder Reglerstellung (4.13).

Die Legende lag eine Fassung lang in der Tafel und trug nur ihre beiden
Endpunkte. Farben liest man aber am Bild und nicht in einer Seitenspalte, und
zwei Endpunkte sind zu wenig, weil die Leiter zwischen ihnen **nicht linear**
ist: fünf ihrer fünfunddreißig Bänder liegen unter Wasser und dehnen die
Minuten bis zum Meeresspiegel über ein Siebtel der Breite. Ein Teilstrich muss
darum stückweise gesetzt werden, sonst steht er an der falschen Stelle. Zwei
Striche sind benannt — der Meeresspiegel und die Schneegrenze —, und ein
runder Strich, der einem von beiden näher als 46 Pixel kommt, fällt aus: zwei
Zahlen übereinander sind schlechter als eine Zahl weniger, dasselbe Argument
wie bei der Beschriftung (4.8).

Das obere Ende der Leiter hängt an der Höhe und an nichts sonst — nicht am
Zoom und nicht am Verziehen. Das kostete zwei Anläufe und hat ein eigenes
Gitter bekommen; 4.13 rechnet es nach. Weil der Anteilsregler die ganze
Leiter verschiebt, wird der Wasserstand intern als Aufschlag auf den besten
Bahnhof geführt und nur absolut beschriftet: sonst würde ein Zug am
Anteilsregler die halbe Karte fluten oder trockenlegen. Als oberes Ende dient das
**99,5-Perzentil** des Landes, nicht das Maximum: ein einzelner Ausreißer
walzt sonst die ganze Leiter platt, und dann liegt nirgends Schnee. Was
darüber liegt, wird auf das oberste Band geklemmt.

Das **Licht** kommt aus Nordwesten, 45° über dem Horizont, und wird in die
Farbe hineingerechnet statt als graue Ebene darübergelegt: *soft-light*
enthält den Faktor C·(1−C) und kann Weiß nicht dunkler machen — auf den
hellsten Bändern, also genau auf den Gipfeln, käme keine Schattierung an. Der
Gradient wird mit dem Faktor 2,7 überhöht, denn ein Gelände, dessen Spanne ein
Zehntel seiner Breite ist, wäre sonst glatt wie Glas. Die Abdunkelung hat
einen Boden bei 47 %: ohne ihn wurde der Schatten eines steilen Einzelgipfels
auf dunklem Grün fast schwarz, und mit dem alten, dunkelbraunen ersten
Schneeband entstanden schwarze Krater rund um weiße Spitzen.

Die **Höhenlinien** liegen auf den Bandgrenzen und werden im selben Durchgang
gezogen: der Abstand zur Bandgrenze wird durch den Betrag des Gradienten
geteilt, also in Zellen gemessen statt in Minuten. Damit ist die Linie im
Steilen so dünn wie im Flachen.

### 4.8 Die Beschriftung

**Beim Hineinzoomen kommen neue Namen dazu**, und zwar die der kleineren
Bahnhöfe, aus einer **Rangliste nach Halten am Tag** — der größte Bahnhof im
Bild kommt zuerst. Angeboten wird dabei die ganze Rangliste und nicht ihr
Kopf: wer in den Harz hineinzoomt, soll dort Namen sehen und nicht die von
Hannover, das national weiter oben steht, aber außerhalb des Bildes liegt.
Teuer ist das nicht, weil eine Zeile, deren Budget aufgebraucht ist, nur noch
einen Vergleich kostet.

Wie viele dazukommen, sagt **nicht der Zoom, sondern der Platz**: die
Gesamtzahl der Namen im Bild bleibt ungefähr gleich. Beim Hineinzoomen fallen
die Ortsmarken aus dem Bild — von 62 sind bei Zoom 8 noch drei übrig —, und
genau diese Lücke füllen die Bahnhofsnamen auf. Eine Zahl, die am Zoom hing
(dreißig je Stufe), gab bei Zoom 8 einhundertvierundachtzig Bahnhofsnamen:
das war kein Kartenbild mehr, sondern ein Register. Gemessen auf 1440 × 900:

| Zoom | Namen gesamt | davon Bahnhöfe |
| --- | --- | --- |
| 1,15 | 81 | 11 |
| 2 | 62 | 6 |
| 4 | 62 | 37 |
| 8 | 62 | 59 |

**Die Bahnhofspunkte sind von Anfang an eingeblendet.** Sie sind das, woraus
die Karte gemacht ist, und ohne sie sieht ein Relief aus wie eine Behauptung.
Beim Hineinzoomen werden sie etwas größer, mit der Wurzel des Zooms und
gedeckelt — linear lägen sie schon bei Zoom 4 wie Murmeln.

**Rot heißt: hier steht ein Name.** Der rote Punkt ist der Anker der
Beschriftung und gehört zu ihr; weiß sind die übrigen viertausendsiebenhundert,
aus denen das Relief gemacht ist. Welche Bahnhöfe rot sind, ändert sich mit dem
Zoom, und das ist der Sinn der Sache: beim Hineinzoomen kommen neue Namen dazu,
und ein Name ohne Anker schwebt im Gelände.

Eine Fassung lang war Rot den **Ortsmarken** vorbehalten — eine feste Liste,
damit sich beim Verziehen nichts umfärbt. Das war zu vorsichtig: es nahm der
Beschriftung ihren Anker, um ein Flackern zu vermeiden, das klein ist.
Nachgezählt kommen und gehen über den ganzen Morph eine Handvoll Punkte, 86 in
der Landkarte gegen 79 in der Zeitkarte, weil dann andere Namen Platz finden.
Die Ortsmarken bleiben zusätzlich rot, auch wenn ihr Name keinen Platz fand —
sonst verschwände beim Hineinzoomen die Mitte einer Stadt ganz.

Die Schrift ist **8 Pixel** groß, auf schmalen Schirmen 9. Sie war 11,5 und
damit für eine Karte zu laut: sie hat die Karte gelesen statt sie zu
beschriften, und mit dem feineren Raster (4.11) stand nun ein gestochenes
Relief unter einem Plakat. Dreißig Prozent kleiner ist das schonende Ende der
Spanne, die gewünscht war — eine Beschriftung, die man nicht mehr liest, ist
keine. Was sie an Größe verliert, bekommt sie an Kontrast zurück: der schwarze
Saum um jeden Namen bleibt anteilig dicker als vorher, und der rote Punkt
schrumpft mit (1,55 · √Zoom Pixel Radius, gedeckelt bei 2,0, statt 2,1). Alle
Abstände hängen an der Schriftgröße, damit ein anderer Wert die Halterei nicht
durcheinanderbringt.

Beschriftet werden **Orte, nicht Bahnhofsnamen**. Der Fahrplan kennt „Pasing"
und „Oberkotzau" mit vielen Halten und Karlsruhe mit wenigen; und er nennt
Stuttgart Hbf „Hauptbahnhof (oben)". Zu jedem von 113 Orten wird darum der
Bahnhof gesucht, der ihm am nächsten liegt (bis 13 km) und dort am meisten
hält — nach Koordinate, nicht nach Namen, weil jedes Bundesland seine
Bahnhöfe anders schreibt. Gezeichnet werden so viele, wie ohne Überdeckung
hineinpassen: jeder versucht acht Plätze um seinen Punkt, wer keinen findet,
wird nicht gezeichnet. Zwei Namen übereinander sind schlechter als ein Name
weniger.

Dazu kommt ein zweiter Durchgang mit den abgelegensten Orten **und den
abgelegensten Bahnhöfen unter ihrem eigenen Namen**. Ortsmarken helfen dort
nicht: Konstanz Hbf liegt gut angebunden am Land, und was in der Zeitkarte als
weiße Scholle im Meer treibt, heißt Konstanz-Wollmatingen. Ohne diesen
Durchgang bleiben die Inseln namenlos, und eine weiße Scholle ohne Namen ist
ein Fleck. Mit ihm stehen in der reinen Zeitkarte dort Freiburg Herdern,
Kennelgarten (Pfalz), Nistertal-Büdingen (Westerwald), Dienheim (Rhein) und
Demker (Altmark). Die *allerschlimmsten* — Granitz Jagdschloß, Göhren,
Gottmadingen, Reichenau (Baden) — sind es nicht mehr: sie liegen jenseits des
zugeschnittenen Ausschnitts (4.6) und werden gar nicht gezeichnet. Deshalb
kommen die Kandidaten aus einem größeren Vorrat und das Budget zählt, was
gemalt wurde.

### 4.9 Isochronen

Für 54 Knoten liegt die Reisezeit zu allen 4.815 Bahnhöfen in der Seite
(als 8-Bit-Werte in Schritten von 3 Minuten). Daraus wird dasselbe Feld wie in
4.3 gebaut — Impulse, dann Zähler und Nenner getrennt verwischt, hier mit
σ = 22 Minuten, weil eine Isochrone eine Linie sein soll und kein Zickzack —
und mit marschierenden Quadraten in Linien gleicher Reisezeit geschnitten,
alle 60 Minuten. Die Zellen werden dafür **einmal** durchlaufen und nicht
achtmal: Kleinst- und Größtwert der vier Ecken sagen sofort, welche Stufen
überhaupt durch die Zelle laufen können, und bei den meisten keine.

Das ist die Probe aufs Ganze, und sie ist der Grund, warum die Isochronen
bedienbar sind statt fest: auf der Landkarte sind das ausgefranste Sterne,
auf der Zeitkarte müssen daraus Kreise werden. Sie werden es nicht ganz — es
bleiben ja 23 % Stress —, aber sichtbar viel mehr als vorher.

### 4.10 Die Regler liegen unter der Karte

Sie haben in der Seitenspalte gestanden, und das war falsch: man schaut beim
Schieben auf die Karte und nicht auf den Regler, und wenn beide 900 Pixel
auseinanderliegen, schiebt man blind. Jetzt liegen die drei Griffe direkt
unter dem, was sie bewegen.

Der Streifen ist **eine** Zeile hoch, und das ist keine Kosmetik: jede Zeile,
die er sich nimmt, nimmt er der Karte weg, und die Karte sollte gerade größer
werden (4.6). Darum liegen dort nur die drei Regler; die Anzeigeschalter —
Namen, Höhenlinien, Bahnhöfe, Isochronen — bleiben in der Tafel, wo sie keine
Bildhöhe kosten. Unter 640 Pixeln Breite wird der Streifen zweispaltig, unter
440 einspaltig.

**Landkarte → Zeitkarte** und **Anteil Deutschlands** haben je einen
Abspielknopf. Ein Regler, den man nicht anfasst, sieht wie eine Behauptung
aus; ein Regler, der von selbst durchfährt, ist ein Beweis — man sieht die
Verformung als Bewegung, statt sie aus zwei Standbildern zusammenzudenken. Am
Ende des Wegs kehrt die Fahrt um statt zu springen, weil ein Sprung wie ein
Schnitt aussieht und alles verliert, was man gerade verfolgt hat. Eine Fahrt
der Verformung dauert 6 Sekunden, eine Fahrt durch die Anteile 8 — dort liegen
achtzehn gemessene Stufen hintereinander, und jede soll man einen Augenblick
lang sehen.

An beiden Enden **hält die Fahrt kurz an**, eine Dreiviertelsekunde. Ohne den
Halt kehrt sie im Endzustand um, ohne ihn gezeigt zu haben — und die beiden
Endzustände sind gerade das, was die Karte behauptet: hier die Geografie, dort
die Zeit. Dreiviertel einer Sekunde reicht, um das Bild stehen zu sehen, und
ist kurz genug, dass es nicht nach einem Hänger aussieht.

Es läuft immer nur **einer**: zwei gleichzeitige Bewegungen würden dieselbe
Verformung erklären, und dann ordnet man keine von beiden mehr zu. Wer selbst
an einen Regler greift, hat Vorrang und stoppt die Fahrt. Im verdeckten Tab
hält sie an.

### 4.11 Wie fein das Raster ist

Nicht in Minuten, sondern in **Bildschirmpixeln**: eine Zelle soll etwa so
groß sein wie ein Pixel, also `ZELLE = Feinheit / Maßstab`. Eine feste
Minutenzahl war beides falsch — auf dem großen Schirm zu grob (drei Minuten
waren dort zweieinhalb Pixel, und alles, was ins Raster gezeichnet wird, also
Farbbänder, Höhenlinien und Licht, war um diesen Faktor verwaschen) und auf
dem Telefon Verschwendung, weil dieselbe Minute dort ein Drittel so breit ist.
So bleibt die Schärfe auf jedem Gerät dieselbe und die Rechenlast auch. Nach
oben deckelt eine Höchstzahl von 700.000 Zellen die Rechnung, damit ein sehr
großes Fenster sie nicht sprengt.

| | Pixel je Zelle | bei 1440 × 900 |
| --- | --- | --- |
| in Ruhe | 1,0 | 1,24 min, 696.000 Zellen |
| im Halt an den Enden | 1,5 | 1,86 min |
| beim Ziehen | 3,0 | 3,71 min, 78.000 Zellen |
| in der Fahrt | gemessen, 1,0 … 1,35 | 1,24 … 1,67 min |

Vorher war es fest 3,0 / 4,5 / 5,5 Minuten: das ruhende Bild ist jetzt also
zweieinhalbmal feiner je Achse und sechsmal so zellenreich — und dank 4.3
trotzdem schneller zu rechnen als früher das grobe (134 ms statt 235 auf
1440 × 900, gemessen ohne Beschleunigung in einem Container; auf einem
gewöhnlichen Rechner deutlich schneller).

**In der Fahrt wird die Stufe nicht gesetzt, sondern gemessen.** Weich werden
soll die Karte dort nämlich nicht, und eine vorsorglich gröbere Stufe ist
genau das: eine Wette gegen die Maschine, die man auch verliert, wenn die
Maschine schnell ist. Also läuft die Fahrt auf der Ruhestufe, und nur wenn ein
Bild länger braucht als 110 ms, geht sie schrittweise gröber — höchstens bis
1,35 Pixel je Zelle, was einer sehr milden Weichheit entspricht und weit von
den 3,8 entfernt ist, die hier einmal fest standen. Wird es wieder schnell,
kommt die Schärfe von selbst zurück. Auf einem gewöhnlichen Rechner kommt die
Stufe gar nicht zum Tragen.

Drei weitere Posten fallen in der Fahrt weg oder kleiner aus:

- Die **Rastermaske** wird nur noch als Statistik gebraucht (4.5) und in der
  Fahrt jedes zweite Bild neu gerechnet. Ein Bahnhof, der gerade die Küste
  überquert, bekommt seine Scholle einen Wimpernschlag zu früh oder zu spät;
  das kostet nichts und spart dreißig Millisekunden je Bild.
- Das **99,5-Perzentil** der Farbleiter (4.7) zählt jede vierte Zelle statt
  jeder. Die Schneegrenze weicht dadurch um eine Minute ab.
- **Schattiert wird nur, was gezeichnet wird.** Das Bild deckt den ganzen
  Ausschnitt ab, gezeigt wird davon aber nur das Land, und das ist bei der
  Landkarte nicht die Hälfte. Eine Zelle Nachsicht in alle vier Richtungen,
  weil beim Hochskalieren über die Schnittkante interpoliert wird. Das halbiert
  den Posten (30–53 ms statt 72–88).

Im Halt nicht ganz das Feinste, denn ein Bild, das eine halbe Sekunde zum
Rechnen braucht, sieht mitten in einer Fahrt nicht nach einer Pause aus,
sondern nach einem Hänger. Ein Bild, das steht, soll die feinste Stufe haben —
und eines, das läuft, soll trotzdem scharf sein.

### 4.12 Zoomen, und die vier Gitter

Am Rad, mit zwei Fingern, Ziehen zum Verschieben, Doppelklick zurück in die
Anfangsstellung.

**Die Anfangsstellung ist 1,15** und nicht 1, und das kostet etwas, und zwar
unvermeidlich. Deutschland ist hoch — 990 Minuten — und der Schirm ist breit,
die Ansicht also **höhenbegrenzt**: das Land füllt schon bei Zoom 1 die
Bildhöhe, während die halbe Breite leer bleibt. Größer geht darum nur, indem
oben und unten etwas abgeschnitten wird; bei 1,15 sind das rund fünfzig
Minuten je Seite, also die Spitze von Sylt und der Zipfel um Konstanz. Der
Handel ist zu vertreten, seit man herauszoomen kann — und die Ansicht startet
in der Mitte des **Rahmens** und nicht des Umfangs, sonst läge der Anschnitt
einseitig: die Mitte des Umfangs liegt gut achtzig Minuten weiter südlich,
weil die Zeitkarte nach Süden weiter ausgreift.

**Nach unten reicht der Zoom bis 0,69.** Dort passt der ganze Umfang ins Bild,
1.322 × 1.350 Minuten statt der 985 × 1.006 des Rahmens: die Enden, die der
Zuschnitt (4.6) hinausgeworfen hat, liegen dann samt Scholle und Namen im
Bild. Das ist der Grund, warum die Grenze gerechnet und nicht gesetzt ist —
sie folgt aus WELT und dem Fenster, nicht aus einer Zahl. Zoom und
Verschiebung sind eine Sache des Betrachtens und nicht der Karte: sie ändern
nur, welcher Weltausschnitt auf den Schirm kommt. Die Mitte wird so
festgehalten, dass nie ein leerer Rand entsteht — passt der Bildausschnitt
(4.6) ganz ins Bild, sitzt er mittig; sonst darf die Mitte nur so weit
wandern, wie der Rand es zulässt. Gezoomt wird **um einen Punkt**: der
Weltpunkt unter dem Finger bleibt unter dem Finger, sonst zoomt man ins
Nichts und muss hinterher suchen. Und hochkant gehört die Wischbewegung bei
Zoom 1 der Seite und nicht der Karte, sonst kann man nicht mehr scrollen —
`touch-action` schaltet mit dem Zoom um.

Der eigentliche Eingriff steckt aber darunter. Zoomen soll **Detail
hinzufügen**, nicht ein Bild vergrößern, und es soll nicht teurer werden. Beides
geht nur, wenn das Feld nur für den sichtbaren Ausschnitt gerechnet wird; dann
schrumpft der Ausschnitt mit demselben Faktor, mit dem die Auflösung wächst,
und die Zellzahl bleibt stehen. Zwei Dinge dürfen dabei aber gerade **nicht**
am Zoom hängen — das obere Ende der Farbleiter (4.7, 4.13) und die Liste der
Ausgewanderten (4.4) —, denn eine Farbe oder eine Insel, die sich beim
Heranzoomen ändert, ist eine Lüge über die Daten.

Also vier Gitter, und jedes hat genau eine Aufgabe:

| | Ausdehnung | Weite | Aufgabe |
| --- | --- | --- | --- |
| **Grundgitter** | ganzer Bildausschnitt | fest 3 min | Landmaske, Liste der Ausgewanderten, Isochronenfeld |
| **Rechengitter** | Sichtbares + 2,5 σ | ≈ 3 px | das Höhenfeld, sobald hineingezoomt ist |
| **Bildgitter** | Sichtbares | 1 px | das gezeichnete Bild |
| **Leitergitter** | Deutschland, unverzogen | fest 4 min | das obere Ende der Farbleiter (4.13) |

Das Grundgitter hängt nur an Lage und Anteil. Ein Zähler wird hochgesetzt,
sobald sich einer von beiden ändert; solange er stillsteht, werden Grundfeld
und Maske beim Zoomen und Schieben **nicht neu gerechnet**. Eine Zoomgeste
kostet damit kaum mehr als ein einzelnes Bild.

Das Rechengitter braucht seinen Saum von zweieinhalb σ über den sichtbaren
Rand hinaus, weil die Glocke so weit trägt; ohne ihn stünde am Bildrand ein
falscher Wert, weil die Bahnhöfe knapp außerhalb fehlten. Es entsteht nur,
wenn das Grundgitter für ein Bild zu grob wäre, also ab etwa Zoom 1,7.

Die **Isochronen** (4.9) liegen jetzt ebenfalls auf dem Grundgitter. Bei
σ = 22 Minuten sind das mehr als sieben Zellen, also reichlich aufgelöst; die
Linien kommen als Pfad in Weltkoordinaten heraus und sind darum bei jedem Zoom
scharf. Auf dem Bildgitter gerechnet wären sie zwanzigmal so teuer, und beim
Hineinzoomen fehlte der Glocke am Bildrand der halbe Saum.

**Während der Geste** wird absichtlich gröber gerastert (3,4 Pixel je Zelle)
und nach 220 Millisekunden ohne Ereignis wieder fein. Das ist hier anders
gelöst als bei der Fahrt (4.11), wo gemessen wird: eine Zoomgeste ist kurz,
ihr Ende ist ein klarer Zeitpunkt, und ein Bild, das während des Ziehens
hinterherhinkt, macht das Zielen unmöglich.

Ein Klick, der eigentlich ein Schieben war, wählt keinen Isochronenknoten: der
zurückgelegte Weg wird mitgezählt, und über acht Pixel gilt es als Wischen.

Mit der Maus wird geschoben, sobald es etwas zu schieben gibt; mit dem Finger
erst oberhalb der Anfangsstellung. Sonst nähme die Karte der Seite das
Wischen ab, und man käme auf dem Telefon nicht mehr an den Text darunter.

### 4.13 Die Farbleiter darf nur an der Höhe hängen

Beim Verziehen wechselten die Farben. Nicht die Höhen — die stehen fest, und
das ist nachgemessen: die Höhe eines Bahnhofs ist die Zeit, bis von dort ein
Anteil des Landes in Reichweite ist, und zwischen Landkarte und Zeitkarte
unterscheidet sie sich um **genau null Minuten**. Die Bahnhöfe wandern, ihre
Höhe wandert nicht.

Was wanderte, war die **Leiter**. Ihr oberes Ende ist das 99,5-Perzentil der
Höhe auf dem Land, und das wurde bis zuletzt aus dem *gezeichneten* Feld
gezogen. Das Feld hängt aber an der Lage: in der Landkarte stand das Ende bei
337 Minuten, in der Zeitkarte bei 349, die Schneegrenze bei 520 gegen 530. Ein
Farbband ist elf Minuten breit — die ganze Leiter verschob sich also im Lauf
der Bewegung um ein Band, und das sah man als Flackern über die gesamte Fläche.
Es war dieselbe Verwechslung wie beim Zoom eine Fassung vorher, nur mit dem
Verziehen statt dem Ausschnitt: eine Eigenschaft der *Ansicht* war in eine
Aussage über das *Land* geraten.

Das Perzentil hat darum ein eigenes, viertes Gitter bekommen — **196 × 256
Zellen von je vier Minuten über der unverzogenen Geografie**, die Bahnhöfe an
ihren geografischen Orten, die Landmaske aus dem unverzogenen Umriss. Das ist
zugleich die richtige Bezugsfläche: „das Perzentil über dem Land" meint
Deutschland und nicht die verzogene Zeitkarte. Gitter und Maske stehen damit
ein für alle Mal fest, das Feld darauf wird nur neu gerechnet, wenn der
Anteilsregler sich bewegt — im Morphbild kostet es nichts (166 gegen 161
Millisekunden je Bild, also Rauschen). Nachgemessen steht das obere Ende jetzt
bei 336,55 Minuten in allen elf Morphstellungen von 0 bis 1 und bei jedem Zoom
von 0,69 bis 16, die Schneegrenze bei 519. Am Anteil hängt es weiter, und das
soll es: 284 Minuten bei drei Prozent, 350 bei zweiundsechzig.

Ein Rest bleibt, und der ist kein Fehler, sondern die Rechnung aus 4.3. Das
Relief ist die geglättete Fläche **zwischen** den Bahnhöfen, und wer neben
einem Bahnhof liegt, ist in der Zeitkarte ein anderer als in der Landkarte —
dort liegt neben einem Ort, was von ihm aus schnell zu erreichen ist, nicht
was neben ihm liegt. Der gemalte Wert am Bahnhof wandert dadurch über den
ganzen Morph im Median um **acht Minuten**, im 90. Perzentil um 27: etwa zwei
Drittel Farbband, in Einzelfällen mehr.

Das ließe sich wegrechnen, und der Versuch steht hier, weil sein Ergebnis
lehrreich ist. Man zerlegt die Glättung — σ² addiert sich, also ist
9,2 ⊕ 6,0 = 11 —, glättet den ersten Teil über der Geografie und lässt jeden
Bahnhof seine geglättete Höhe **mit sich tragen**; gezeichnet wird nur noch
mit dem kleinen σ, das die Fläche zwischen den Orten füllt. Der Rest fällt
damit von acht auf **vier Minuten**. Nur: eine Glättung mit kleinem σ über
einem Punkthaufen trifft die Punkte fast genau, und damit steht in der
Zeitkarte plötzlich die *geografische* Nachbarschaft im Bild — der glatte
Trichter bekommt eine Kräuselung, jeder Bahnhof eine kleine eigene Delle. Die
Zeitkarte lebt aber davon, dass Lage und Höhe dort übereinstimmen und der
Trichter glatt ist. Vier Minuten sind das nicht wert; die Fassung ist wieder
heraus, und die acht Minuten bleiben stehen.

### 4.14 Einen Bahnhof anfassen, und die Kamera mitnehmen

**Der Name zählt wie der Punkt.** Anklickbar war bisher der Punkt, und der ist
drei Pixel breit; der Name daneben ist fünfzig und im Blick das Auffälligere.
Wer „Göttingen" liest und darauf zeigt, hat Göttingen gemeint — eine Fläche,
die aussieht wie ein Ziel und keines ist, ist eine stille Fehlfunktion, und auf
dem Telefon ist der Name die einzige Fläche, die ein Finger verlässlich trifft.

Die Namenskästen werden beim Zeichnen ohnehin geführt: die Beschriftung prüft
jeden gegen die schon belegten, damit sich keine zwei überdecken (4.8). Diese
Liste wird jetzt mit dem Bahnhof, zu dem sie gehört, aufbewahrt, um zwei Pixel
großzügiger vermerkt als gemalt, und beim Klicken **zuerst** geprüft. Zuerst,
weil sie das Genauere ist: der Umkreis von 26 Pixeln um einen Punkt erwischt
im Ruhrgebiet ein halbes Dutzend Bahnhöfe, ein Namenskasten trifft genau einen.
Nachgemessen treffen alle 75 Kästen des Anfangsbildes ihren eigenen Bahnhof.

**Die Kurzinfo steht in der Karte, in der Ecke.** Dort ist bei jeder
Reglerstellung schwarzer Grund, und der Blick muss nicht zwischen Karte und
Seitenspalte wechseln. In *welcher* Ecke, sagt der gewählte Bahnhof: in der
vom ihm entferntesten, sonst deckt der Kasten gerade das zu, was man
angeklickt hat — bei München lag er auf München. Hochkant ist die Karte zu
schmal für zwei Spalten, dort entscheidet nur oben oder unten. Nachgemessen
über fünf Bahnhöfe in vier Himmelsrichtungen und zwei Fenstergrößen: keiner
verdeckt. Sie nennt die Minuten bis zum Anteil, den Aufschlag auf
den besten Bahnhof im Land, die Halte am Tag und das Einzugsgebiet — und sie
hängt an jedem Bild, weil zwei der vier Zahlen mit den Reglern wandern. Neu
geschrieben wird sie nur, wenn sich etwas darin geändert hat; sonst kostete sie
in der Fahrt drei `innerHTML` je Bild für nichts.

Hochkant war sie zu groß: dort liegt sie auf einer Karte, die nur ein Drittel
so hoch ist, und nahm mit 129 Punkten von 416 fast ein Drittel davon ein — mehr
im Weg als die Auskunft wert war. Unter 560 Punkten Fensterbreite stehen
dieselben vier Zahlen mit Trennpunkten statt in Sätzen und der Hinweis in fünf
Wörtern: zwei Zeilen statt vier, nachgemessen **78 Punkte** statt 129. Am
Schirm bleibt der ausgeschriebene Text — dort ist der Platz da.

**Und dann nimmt die Kamera ihn mit.** Ist ein Bahnhof gewählt und drückt man
▶, bleibt er in der Bildmitte stehen und das Land verzieht sich um ihn. Das ist
der Grund, einen zu wählen: sonst sieht man die Verformung des *Bildes* und muss
sich dabei merken, wo ein Ort vorher lag. Steht der Ort still, liest man
unmittelbar ab, was mit ihm geschieht. Der Weg von der Landkarte in die
Zeitkarte ist im Median 57 Minuten lang, im 90. Perzentil 143 und im Äußersten
566: Frankfurt Hbf rückt 24 Minuten, Göttingen 45, Berlin Hbf 152, Göhren auf
Rügen 182.

Geklemmt wird dabei anders als sonst. Die normale Klemmung hält das *Bild* im
Umfang; bei der Anfangsstellung zöge sie den Bahnhof sofort wieder in die
Bildmitte des Landes, und die Kamera bewegte sich gar nicht. Beim Folgen wird
darum nur die *Mitte* in den Umfang geklemmt: der Bahnhof steht genau in der
Mitte, auch wenn dafür schwarzer Grund an den Rand kommt. Ein Bahnhof jenseits
des Umfangs kann nicht vorkommen — WELT ist als Hülle über alle
Reglerstellungen gebaut, nachgezählt null Bahnhöfe draußen bei jedem Morphwert
—, die Klemmung ist also nur der Gürtel.

Das Folgen endet, sobald die Fahrt endet oder jemand selbst schiebt oder
kneift: wer die Karte anfasst, führt. Ein Klick ins Leere hebt die Wahl auf,
Escape auch, und der gewählte Bahnhof bekommt einen weißen Ring — eine
Markierung und keine vierte Farbe — und seinen Namen außerhalb des Budgets,
damit er beschriftet ist, auch wenn er es in der Rangliste nie so weit nach
oben geschafft hätte.

## 5. Was fehlt

- **Kein Stadtverkehr.** S-Bahn, U-Bahn, Straßenbahn, Bus fehlen. Für die
  Ballungsräume heißt das: die Karte zeigt, wie gut sie mit *Regionalzügen*
  erschlossen sind, nicht wie gut sie erschlossen sind. Hamburg, München und
  das Rheinland liegen dadurch höher, als sie liegen müssten.
- **221 Bahnhöfe fehlen ganz** (siehe 2).
- **Die Bevölkerung ist innerhalb eines Kreises gleichmäßig verteilt** (siehe
  4.2). Das ist die gröbste Annahme in der ganzen Kette.
- **Die Höhe hängt von einer Wahl ab**, und die Karte sagt das auch: der
  Anteilsregler *ist* diese Wahl. Eine Karte mit einer Zahl darin hätte
  dieselbe Abhängigkeit, nur unsichtbar.
- **Die Bevölkerung ist die von 2024, der Fahrplan der von 2026.** Zwei Jahre
  Unterschied; an der Rangfolge der Kreise ändert das nichts.
- **Ein Fahrplantag, kein Mittel über viele Mittwoche.** Der 13. Mai 2026 ist
  der Tag vor Christi Himmelfahrt. Der Regionalfahrplan ist der eines normalen
  Mittwochs, im abendlichen Fernverkehr kann ein Brückentag ein paar Züge mehr
  bedeuten. Für die Rechnung ab 06:36 ist das ohne Belang.
- **Fahrplan, nicht Wirklichkeit.** Verspätungen, Ausfälle und Baustellen
  stehen nicht im Soll-Fahrplan.
- **Eine Mindestumsteigezeit für alle.** Fünf Minuten überall; in Wirklichkeit
  ist sie je Bahnhof verschieden, und die Quelle führt sie nicht.
- **Keine Fußwege zwischen Bahnhöfen.** Wer in Köln am Hauptbahnhof ankommt
  und von Messe/Deutz weiterfahren will, muss im Modell fahren.
- **Ein Reisender ohne Gepäck und ohne Vorlieben.** Gerechnet wird die
  früheste Ankunft, ohne Rücksicht auf die Zahl der Umstiege oder den Preis.
- **Wie die Menschen zum Bahnhof kommen, steht nicht im Modell.** Das
  Einzugsgebiet nimmt an, wer am nächsten wohnt, fährt von dort — ob das zehn
  Minuten zu Fuß sind oder zwanzig mit dem Auto, macht keinen Unterschied.
