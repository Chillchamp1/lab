# Methodik

Was gerechnet wird, in welcher Reihenfolge, mit welchen Entscheidungen — und
welche Wege verworfen wurden. Jede Zahl hier steht so in der Ausgabe der
Bauskripte; wer sie nachzählen will, lässt sie laufen.

## 0. Der Weg in einem Satz

Aus einem Fahrplantag wird ein Netz, aus dem Netz eine Reisezeitmatrix
zwischen allen Bahnhöfen, aus der Matrix eine Lage in der Ebene, und über die
Lage kommt ein Relief.

```
trains.json  →  01_netz.py   →  Bahnhöfe, Verbindungen, Spitzenstunde
             →  02_zeiten.py →  4.781 × 4.781 Reisezeiten (C, 13 s)
             →  03_lage.py   →  Federkarte und Geländekarte (C, 5 min)
             →  04_seite.py  →  data/karte.json
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
der ist kleinräumig. Gemessen: Modellhöhe und gemessene Erreichbarkeit
korrelieren mit **r = −0,06**, also gar nicht.

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

**Die Höhe** ist die **gemessene Erreichbarkeit**: die mittlere Reisezeit von
diesem Bahnhof zu allen 4.780 anderen, hin und zurück gemittelt, aufgetragen
über dem besten Wert. Kein Modellwert, eine Zahl in Minuten.

Sie reicht von **260 Minuten** (Frankfurt (Main) Hbf) bis **718** (Gottmadingen
im Landkreis Konstanz), Spanne 458 Minuten. Die zehn tiefsten Bahnhöfe sind
Frankfurt Hbf, Fulda, Kassel-Wilhelmshöhe, Erfurt, Frankfurt Flughafen,
Würzburg, Nürnberg, Frankfurt Süd, Hanau, Göttingen — das ICE-Kreuz, und es
kommt aus der Rechnung, nicht aus einer Liste. Am höchsten liegen die
Rügener Bäderbahn (Göhren, Baabe, Sellin), der Zipfel um Konstanz und
Singen und die Stichbahnen im Freiburger Umland.

### Das Höhenfeld

Aufgetragen wird **gespritzt, nicht gesucht**: jeder Bahnhof legt eine
Glockenkurve mit σ = 15 Minuten (etwa 13 km) ins Feldgitter, danach wird durch
die Summe der Gewichte geteilt. Das kostet einmal die Zahl der Bahnhöfe mal
die Fläche der Glocke, statt für jede Feldzelle die nächsten Bahnhöfe zu
suchen — gemessen ein Achtel der Zeit, und das Feld wird glatter. Löcher, wo
keine Glocke hinreicht, werden aus den Nachbarn nachgezogen, bis keines mehr
offen ist; eine frühere Fassung stopfte sie nach vier Durchgängen mit einem
festen Ersatzwert, und aus dem wurde eine weiße Kuppe im Nirgendwo. Zuletzt
zwei Durchgänge Binomialglättung.

### Wo ist Land?

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
weit darüber hinaus: **537 von 4.781** liegen in der reinen Zeitkarte jenseits
der Küste, die Rügener Bäderbahn zwölf Stunden von allem entfernt. Ein Bahnhof
gehört aber immer auf Land, sonst steht er im Schwarzen neben der Karte — und
genau das war zu sehen. Also bekommt jeder Bahnhof, der außerhalb des
Umrisses liegt, eine weiche Scholle von etwa 20 Minuten Radius; benachbarte
Schollen wachsen zusammen.

Das stellt sich von selbst richtig ein: in der Landkarte liegt kein deutscher
Bahnhof draußen, es kommt nichts hinzu, und die Karte ist genau Deutschland.
Je weiter der Regler läuft, desto mehr Inseln lösen sich. Eine Zwischenfassung
nahm stattdessen die Abdeckung **aller** Bahnhöfe und blies damit auch die
Landkarte zu einer Wolke auf, zwanzig Kilometer über jede Küste hinaus.

### Der Umriss in Dreiecken

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

### Der Bildausschnitt steht fest

Er wird **einmal** bestimmt und gilt für jede Reglerstellung: über die
Bahnhöfe in beiden Lagen und über den Umriss in beiden Lagen. Das hat zwei
Gründe.

Nur die Bahnhöfe zu nehmen war zu wenig, denn das Verschiebungsfeld verzieht
die Küste über sie hinaus. Und einen Ausschnitt je Reglerstellung zu rechnen
wäre falsch, denn dann wanderte der Maßstab beim Schieben mit — und genau die
Verformung, um die es geht, wäre nicht mehr zu sehen. Der Preis ist, dass die
Landkarte den Schirm nicht ausfüllt: die Federkarte ist **1.274 × 1.302
Minuten** groß, die Landkarte nur 715 × 956. Dass die Karte beim Schieben
aufgeht statt sich nur zu verbiegen, ist selbst eine Aussage — die Zeit macht
Deutschland größer.

### Farbe, Licht, Höhenlinien, Schnee

**Fünfunddreißig Bänder**: fünf Blaustufen unter Wasser, vierundzwanzig
Landbänder darüber — die Höhenstufen eines physischen Atlas, Tiefland satt
grün, dann Gelbgrün, Gelb, Ocker, Orange, Rot, Braun — und zuoberst **sechs
Bänder Schnee**, von hellem Grau bis Weiß. So viele, damit jede Bandgrenze
eine Höhenlinie tragen kann und die Karte die gestochene Dichte einer
Reliefkarte bekommt.

Die **Schneegrenze** ist nicht gesetzt, sondern abgeleitet: die Leiter läuft
vom Wasserstand bis zum höchsten Wert **auf dem Land**, und die letzten sechs
Bänder sind Schnee. In Minuten steht sie in der Tafel — auf der Landkarte bei
+95 Minuten Wasser etwa +266 Minuten. Als oberes Ende dient das
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

### Die Beschriftung

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
ein Fleck. Mit ihm stehen dort Granitz Jagdschloß, Göhren, Groß Schönebeck,
Freiburg Zähringen, Gottmadingen, Reichenau (Baden).

### Isochronen

Für 54 Knoten liegt die Reisezeit zu allen 4.815 Bahnhöfen in der Seite
(als 8-Bit-Werte in Schritten von 3 Minuten). Daraus wird dasselbe
Glockenfeld gebaut und mit marschierenden Quadraten in Linien gleicher
Reisezeit geschnitten, alle 60 Minuten.

Das ist die Probe aufs Ganze, und sie ist der Grund, warum die Isochronen
bedienbar sind statt fest: auf der Landkarte sind das ausgefranste Sterne,
auf der Zeitkarte müssen daraus Kreise werden. Sie werden es nicht ganz — es
bleiben ja 23 % Stress —, aber sichtbar viel mehr als vorher.

## 5. Was fehlt

- **Kein Stadtverkehr.** S-Bahn, U-Bahn, Straßenbahn, Bus fehlen. Für die
  Ballungsräume heißt das: die Karte zeigt, wie gut sie mit *Regionalzügen*
  erschlossen sind, nicht wie gut sie erschlossen sind. Hamburg, München und
  das Rheinland liegen dadurch höher, als sie liegen müssten.
- **227 Bahnhöfe fehlen ganz** (siehe 2).
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
