# Stand

Was steht, was offen ist, und was bewusst so bleibt.

## Was steht

Alles, was die Seite braucht. Die Kette läuft von den beiden Rohdateien bis
`data/karte.json` durch, jeder Schritt zählt aus, was er getan hat, und die
Zahlen in der Seite und in [METHODIK.md](METHODIK.md) sind die Ausgabe dieser
Läufe — nicht von Hand übertragen.

```
python3 build/01_netz.py && python3 build/02_zeiten.py \
  && python3 build/03_lage.py && python3 build/04_menschen.py \
  && python3 build/05_seite.py
```

Geprüft wurde dabei:

- **Die Reisezeiten gegen den wirklichen Fahrplan**, an zweiundzwanzig
  Strecken (die Tabelle steht in der [README](README.md)). Berlin–Hamburg
  141 Minuten gegen 1:45 Fahrzeit plus Warten, Frankfurt–München 218 gegen
  3:10, Stuttgart–München 131 gegen 2:15, Westerland–Hamburg 233 gegen 3:00.
  Alle im erwarteten Band.
- **Die Erreichbarkeit gegen das, was jeder weiß**: am tiefsten liegen
  Frankfurt Hbf, Fulda, Kassel-Wilhelmshöhe, Erfurt, Würzburg, Nürnberg,
  Göttingen, Hannover — das ICE-Kreuz, und es kommt aus der Rechnung, nicht
  aus einer Liste.
- **Die Federkarte gegen die Isochronen**: die Linien gleicher Reisezeit um
  einen Knoten sind auf der Landkarte ausgefranste Sterne und auf der
  Zeitkarte annähernd Kreise. Nicht ganz — es bleiben 23 % Stress —, aber
  sichtbar.

## Was die Gewichtung nach Menschen ergeben hat

Die Frage war: nach Menschen gewichten statt nach Bahnhöfen, um das Gefühl von
Angebundenheit zu treffen. Die Antwort kam in drei Schritten, und keiner davon
war der erwartete.

**Erstens: die Gewichtung allein bringt fast nichts.** „Mittlere Reisezeit zu
allen Menschen" und „zu allen Bahnhöfen" korrelieren mit **r = 0,973** — es
ist dieselbe Karte. Ein Mittelwert über ein großes Land wird von der fernen
Hälfte bestimmt, und die hängt daran, wo ein Ort liegt, nicht daran, wie er
angeschlossen ist. München steht in beiden so schlecht wie Ulm.

**Zweitens: die andere Frage schießt über.** „Wie lange, bis ein Zehntel
Deutschlands erreichbar ist" ändert die Karte deutlich — und zwar zu weit. Das
Ruhrgebiet wurde ein einziger blauer See, weil es ein Zehntel des Landes aus
sich selbst schöpft und dafür kein Netz braucht. Aus der Geografiekarte war
eine Dichtekarte geworden.

**Drittens: beides ist dieselbe Größe mit zwei Parametern.** „Minuten bis zum
Anteil q" ist das q-Quantil der Reisezeitverteilung unter dem
Bevölkerungsmaß; der Mittelwert ist ihr erstes Moment. Kleines q ist die
Dichtekarte, großes q die Geografiekarte, und die Korrelation mit dem
Mittelwert steigt monoton von 0,76 bei 2 % auf 0,98 bei 78 %. Darum ist der
Anteil in der Seite ein **Regler** und keine gesetzte Zahl — und die
Voreinstellung, ein Viertel, hat eine gemessene Grenze hinter sich: von Essen
aus sind in 90 Minuten 11,6 % Deutschlands erreichbar, von Frankfurt 5,6 %.
Oberhalb eines Siebtels kann keine Region mehr aus sich selbst schöpfen, und
genau dort kippt die Rangfolge. Die ganze Begründung steht in
[METHODIK 4.1](METHODIK.md).

## Sechs Fehler, die im Laufen gefunden wurden

Sie stehen hier, weil jeder von ihnen eine Karte erzeugt hat, die plausibel
aussah.

**`INT32_MAX + 5` läuft über.** Die erste Fassung des Connection Scan setzte
den Ankunftswert unerreichter Bahnhöfe auf `INT32_MAX` und prüfte den Einstieg
mit `ankunft + UMSTEIGEZEIT <= abfahrt`. Der Überlauf machte daraus eine große
negative Zahl, also war **jede** Verbindung besteigbar: Berlin–Hamburg kam auf
12 Minuten heraus, und jeder Bahnhof hatte dieselbe mittlere Reisezeit von 32
Minuten. Auffällig wurde es an der zweiten Zahl, nicht an der ersten.

**Bei h ≡ 0 ist der Höhengradient null.** Der Geländeteil lief zweihundert
Schritte und gab als maximale Höhe 0 aus. In die Kantenlänge geht nur der
Höhen*unterschied* ein: das flache Optimum ist für die Höhe ein Sattel. Die
Starthöhe kommt jetzt aus dem Rest, den die Ebene liegen lässt.

**Ein festgehaltener Nachbarschaftsgraph wird ausgenutzt.** Er wurde alle
zwanzig Schritte neu gebaut; der Stress sank zwanzig Schritte lang und stieg
beim Neubau wieder. Das Verfahren hatte die Umwege des Graphen optimiert, nicht
die Reisezeit. Jetzt wird er in jedem Schritt neu gebaut.

**Eine Falte im verzogenen Umriss wird zum Loch.** Der Umriss wurde als Ring
gefüllt. Wo das Verschiebungsfeld ihn so schert, dass er sich selbst
überschlägt, heben sich die Umlaufzahlen auf — und in der Karte standen kleine
schwarze Dreiecke mitten im Land. Jetzt wird jeder Ring einmal in Dreiecke
zerlegt und die Umlaufrichtung nach dem Verziehen geprüft.

**Die Abdeckung durch Bahnhöfe blies die Landkarte auf.** Weil einzelne
Bahnhöfe in der Zeitkarte jenseits der verzogenen Küste landen, kam eine
zweite Landschicht aus der Bahnhofsdichte hinzu. Genommen für *alle* Bahnhöfe
machte sie aus Deutschland auch in der Landkarte eine Wolke, zwanzig Kilometer
über jede Küste hinaus. Jetzt gilt sie nur für die, die wirklich draußen
liegen — in der Landkarte also für keinen.

**Ein Ausreißer walzte die Farbleiter platt.** Das obere Ende war der höchste
Feldwert. Ein einzelner Haltepunkt mit zwei Zügen am Tag reicht bis +458
Minuten, und damit lag die Schneegrenze so hoch, dass nirgends Schnee lag.
Jetzt ist das obere Ende das 99,5-Perzentil des Landes.

## Der Bildausschnitt, und was er kostet

Die Karte saß zu klein im Bild, und der Grund war messbar: der Ausschnitt muss
beide Lagen fassen, und er kommt damit **ganz** von der Zeitkarte. Die
Federkarte spannt 1.274 × 1.302 Minuten, die Landkarte nur 715 × 956 — ein
paar Enden von Nebenbahnen fahren so weit hinaus, dass Deutschland auf drei
Viertel der Bildhöhe schrumpfte.

Der Zuschnitt ist jetzt **gemessen statt gesetzt**: er geht so weit, wie die
Landkarte es zulässt, bis sie in der engeren Achse mit einem Saum von 8
Minuten genau hineinpasst. Bei diesen Daten ist das der Faktor 1,29 (985 ×
1.006 Minuten). Der Reglerstreifen unter der Karte kostet auch noch Höhe;
nachgemessen gegen die Fassung davor bleibt +24 % auf 1920 × 1080, +23 % auf
1440 × 900 (Maßstab 0,809 gegen 0,660 Pixel je Minute), +21 % auf 1280 × 720
und +29 % hochkant auf dem Telefon, wo die Karte breitenbegrenzt ist und der
Zuschnitt voll durchkommt.

Der Preis, nachgezählt:

| | |
| --- | --- |
| Bahnhöfe außerhalb, Landkarte | 0 — das ist die Bedingung, aus der der Faktor kommt |
| Bahnhöfe außerhalb, reine Zeitkarte | 108 von 4.781 = 2,3 % |
| … deren Anteil an allen Halten | 2.656 von 295.476 = 0,9 % |
| Median Halte am Tag, hinausgefallen / alle | 20 / 42 |

Es sind erwartbare Namen: die Bodenseerunde von Friedrichshafen bis
Überlingen, die Rügener Bäderbahn, die Erzgebirgs- und Zittauer Schmalspur,
Sylt und Dagebüll, der Bayerische Wald um Grafenau, die Heidekrautbahn, die
Schwäbische Alb um Münsingen. Wer draußen liegt, wird nicht mehr gezeichnet —
kein Punkt, kein Name, keine Kurzinfo: eine Beschriftung allein im schwarzen
Rand sieht nicht nach „aus der Karte gefallen" aus, sondern nach einem Fehler.

Zwei Zahlen in der Seite haben sich dadurch verschoben, weil das Höhenfeld
jetzt eine kleinere Fläche und damit ein anderes 99,5-Perzentil hat: die
Schneegrenze lag damals bei einem Viertel und Wasser auf 250 Minuten bei 467
Minuten in der Zeitkarte (vorher 571) und bei 435 in der Landkarte. Und die
beschrifteten Schollen sind andere, weil die schlimmsten von ihnen jetzt
draußen liegen — darum kommen die Fernmarken aus einem größeren Vorrat, und
das Budget zählt, was gemalt wurde, statt was angeboten war.

## Die Kanten, die Auflösung, und was sie gekostet haben

Die Karte war weich, und zwar aus zwei Gründen gleichzeitig.

**Erstens die Maske.** Land und Meer wurden über einen Alphakanal im
Feldraster getrennt, und das Feldbild wird auf den Bildschirm hochskaliert —
dabei wird der Alphakanal bilinear mitinterpoliert. Bei drei Minuten je Zelle
war eine Zelle zweieinhalb Pixel breit, und die Küste damit unvermeidlich ein
Verlauf über zweieinhalb Pixel. Jetzt ist dieselbe Geometrie ein **Pfad in
Bildschirmkoordinaten** und das Bild wird damit beschnitten. Ein Pfad hat
keine Auflösung.

**Zweitens das Raster selbst**, und hier steckte die eigentliche Arbeit. Es
sollte deutlich feiner werden, ging aber nicht: das Feld entstand Glocke für
Glocke, jeder Bahnhof legte seine Kurve mit σ = 11 Minuten ins Raster, und
die Glockenfläche wächst mit dem *Quadrat* der Feinheit. Gemessen:

| | Glocke für Glocke | Impulse + drei Kastenfilter |
| --- | --- | --- |
| ZELLE = 3,0 | 149 ms | 21 ms |
| ZELLE = 1,5 | 647 ms | 118 ms |

Der Ausweg ist alt und gut: drei Kastenfilter hintereinander sind eine Glocke
auf drei Prozent genau, und ein Kastenfilter mit laufender Summe kostet je
Zelle zwei Additionen, ganz gleich wie breit er ist. Jeder Bahnhof kommt als
Impuls ins Raster (bilinear auf vier Zellen), Zähler und Nenner werden
getrennt verwischt, der Quotient ist derselbe gewichtete Mittelwert wie vorher.

Der zweitteuerste Posten war das **Löcherfüllen**: vierzig Durchgänge über das
ganze Raster, jeder mit einer Kopie des Feldes — und zwar gerade bei der
Landkarte, wo die halbe Bildfläche leer ist und nie ein Loch zuging. Darum war
die Landkarte langsamer als die Zeitkarte (310 gegen 117 ms), was erst
auffiel, als die Stufen einzeln gemessen wurden. Jetzt stehen die Löcher in
einer Liste, die mit jeder Runde kürzer wird.

Erst damit ließ sich das Raster **in Bildschirmpixeln** statt in Minuten
setzen: eine Zelle je Pixel im Ruhezustand. Das ruhende Bild ist
zweieinhalbmal feiner je Achse und sechsmal so zellenreich wie vorher — und
dank der beiden Eingriffe trotzdem schneller zu rechnen als früher das grobe.

Das gleiche Verfahren trägt das Isochronenfeld, und die marschierenden
Quadrate laufen jetzt einmal über die Zellen statt achtmal: Kleinst- und
Größtwert der vier Ecken sagen sofort, welche Stufen durch die Zelle laufen
können, und bei den meisten keine.

**Was der scharfe Schnitt sichtbar gemacht hat:** Umriss und Ländergrenzen
sind zwei unabhängig vereinfachte Polygonzüge und stimmen nicht genau
überein — 0,47 % der Landfläche deckt nur der Länderzug, 0,40 % nur der
Umriss. Wo so ein Splitter weit von jedem Bahnhof liegt, steht er nun als
kleine weiße Zunge im Meer, wo er vorher im Verlauf unterging. Gezeichnet
wird trotzdem die Vereinigung: jede der beiden allein lässt Lücken, und dem
reinen Umriss fielen neun Bahnhöfe aus dem Land. Das wäre in den Daten zu
beheben, nicht im Zeichner.

## Scharf bleiben in der Fahrt

Die Fahrt lief auf einer festen, gröberen Rasterstufe — 3,8 Pixel je Zelle —,
und das war eine Wette gegen die Maschine, die man auch dann verliert, wenn
die Maschine schnell ist. Jetzt wird die Stufe **gemessen statt gesetzt**: die
Fahrt läuft auf der Ruhestufe, und nur wenn ein Bild länger als 110 ms
braucht, geht sie schrittweise gröber, höchstens bis 1,35 Pixel je Zelle. Wird
es wieder schnell, kommt die Schärfe von selbst zurück.

Damit die Regelung meistens gar nicht eingreifen muss, ist das Bild billiger
geworden. Vier Posten, alle gemessen auf 1440 × 900 bei 1,24 Minuten je Zelle:

| | vorher | nachher |
| --- | --- | --- |
| Höhenfeld | 93–135 ms | **33–53 ms** |
| Schattieren | 72–88 ms | **30–53 ms** |
| Isochronenbild | 445 ms | **253 ms** |
| ganzes Bild | 235 ms | **134 ms** |

Woher das kommt, von groß nach klein:

**Gerechnet wird gröber, als gezeichnet wird.** Das ist die eigentliche
Einsicht. Das Feld ist mit σ = 11 Minuten geglättet und bei 1,24 Minuten je
Zelle also neunfach überabgetastet — feiner gerechnet wird es nicht genauer.
Scharf sein muss nicht das Feld, sondern was daraus gezeichnet wird:
Farbbänder, Höhenlinien, Licht, alles nichtlineare Funktionen der Höhe. Also
läuft die ganze Kette auf einem Gitter von 3,6 Minuten und wird bilinear aufs
Bildgitter gesetzt.

Der Preis dafür wäre ein gerastertes σ gewesen: drei Kastenfilter mit
ganzzahligem Radius treffen auf dem gröberen Gitter nur 9,1 oder 12,9 Minuten,
nicht 11. Darum gemischte Radien, ein Teil der Durchgänge einen Schritt
breiter, und die Varianz des bilinearen Hochsetzens und der Nachglättung wird
vom Ziel **abgezogen** statt oben draufgelegt. Nachgemessen sitzt σ über alle
Rasterstufen bei 10,6 bis 10,8 Minuten — gleich genug, dass ein Wechsel der
Stufe das Gelände nicht verändert, und das ist die Bedingung dafür, dass eine
geregelte Stufe überhaupt zulässig ist.

**Schattiert wird nur, was gezeichnet wird.** Das Bild deckt den ganzen
Ausschnitt ab, gezeigt wird davon aber nur das Land (der Beschnitt), und das
ist bei der Landkarte nicht die Hälfte. Eine Zelle Nachsicht in alle vier
Richtungen, weil beim Hochskalieren über die Schnittkante interpoliert wird.

**Die Rastermaske jedes zweite Bild**, in der Fahrt. Sie ist nur noch
Statistik — Perzentil der Farbleiter und Liste der Ausgewanderten —, und beides
ändert sich von Bild zu Bild kaum.

**Und drei Kleinigkeiten, die zusammen ein Drittel brachten:** `Math.sqrt`
statt `Math.hypot` in der Höhenlinienrechnung (hypot skaliert gegen Überlauf,
den hier niemand braucht, und kostet in V8 ein Vielfaches); der senkrechte
Kastenfilter durch blockweises Transponieren ersetzt, weil eine
Spaltenschleife bei siebenhunderttausend Zellen einmal je Spalte durch drei
Megabyte springt; und das Perzentil der Farbleiter auf jeder vierten Zelle
statt jeder, was die Schneegrenze um eine Minute verschiebt.

Gemessen wurde das stufenweise und nicht geraten, und zweimal war die
Vermutung falsch. Die Löcherliste war teurer als das ganze Verwischen — ein
JavaScript-Array verpackt jede Zahl einzeln, jetzt ist es ein `Int32Array`.
Und bei den Isochronen hielt ich die marschierenden Quadrate für den Posten:
sie einmal statt achtmal über die Zellen laufen zu lassen brachte 41 der 445
Millisekunden, das Wiederverwenden der drei Drei-Megabyte-Puffer 80, und die
eigentlichen 192 kamen dann von der Feldrechnung, die alle teilen.

Was bleibt: in diesem Container ohne Beschleunigung sind es 8 Bilder je
Sekunde auf 1440 × 900 und 14 auf einem Telefonformat. Auf einem
gewöhnlichen Rechner deutlich mehr, aber das ist von hier aus nicht zu messen.
Wer es wirklich flüssig **und** scharf braucht, müsste das Schattieren in
einen WebGL-Fragmentshader verlegen — dieselbe Rechnung, nur auf der
Grafikkarte, und ohne npm oder Bündler, also verträglich mit den Regeln
dieses Repos. Das ist der nächste Schritt, wenn einer kommt.

## Englisch, Legende, halbes Land, Zoom

Vier Wünsche in einer Runde, und der vierte hat den Zeichner umgebaut.

**Die Seite ist auf Englisch** — alles, was man sieht: Titel, Regler,
Legende, Kurzinfo, der ganze Text hinter „About this map". Die vier Dokumente
neben der Seite (README, Methodik, Quellen, Stand) und die Kommentare im Code
bleiben deutsch: sie sind die Rechenakte und nicht das Produkt. Die Bahnhofs-
und Ortsnamen bleiben natürlich, wie sie heißen.

**Die Legende liegt unter der Karte** statt in der Tafel, mit Teilstrichen in
absoluten Minuten statt nur den beiden Endpunkten. Die brauchte es, weil die
Farbleiter zwischen ihnen nicht linear ist — fünf ihrer fünfunddreißig Bänder
liegen unter Wasser und dehnen die Minuten bis zum Meeresspiegel über ein
Siebtel der Breite. Ein Strich muss darum stückweise gesetzt werden. Zwei sind
benannt (Meeresspiegel, Schneegrenze), und ein runder Strich, der einem von
beiden zu nah kommt, fällt aus.

**Voreingestellt ist jetzt die Hälfte** statt eines Viertels: 41,8 Millionen
Menschen, das obere Ende des brauchbaren Fensters. Die Messung dahinter ist
dieselbe und steht unverändert in METHODIK 4.1 — das Fenster liegt zwischen
einem Sechstel und der Hälfte, weil unterhalb eines Siebtels jede Region noch
aus sich selbst schöpft und oberhalb von zwei Dritteln nur noch Sylt und Rügen
zählen. Ein Viertel ist die runde Zahl in der Mitte, die Hälfte das obere
Ende; die eine zeigt das Netz, die andere das Land. `VORGABE` in
`build/05_seite.py` sagt nur, wo der Regler beim Aufschlagen steht, und der
Regler in der Seite wird aus der Nutzlast gestellt, damit nicht zwei
Voreinstellungen in der Seite stehen und eine davon irgendwann die falsche ist.

## Zoomen, ohne dass die Farben wandern

Zoom am Rad und mit zwei Fingern war der Wunsch, mit ausdrücklicher Erlaubnis,
während der Geste an der Auflösung zu sparen. Die Erlaubnis wird genutzt — 3,4
Pixel je Zelle während der Bewegung, wieder fein 220 Millisekunden nach dem
letzten Ereignis —, aber das war der kleinere Teil.

Der größere: Zoomen soll **Detail hinzufügen** und nicht ein Bild vergrößern,
und es soll nicht teurer werden. Beides geht nur, wenn das Feld allein für den
sichtbaren Ausschnitt gerechnet wird; dann schrumpft der Ausschnitt mit
demselben Faktor, mit dem die Auflösung wächst, und die Zellzahl bleibt
stehen. Gemessen bei Zoom 5,2: 700.000 Bildzellen wie bei Zoom 1, dazu 99.000
Zellen Rechengitter.

Dabei gibt es aber zwei Größen, die gerade **nicht** am Zoom hängen dürfen:
das obere Ende der Farbleiter und die Liste der Ausgewanderten. Eine Farbe
oder eine Insel, die sich beim Heranzoomen ändert, ist eine Lüge über die
Daten. Beide kamen bisher aus demselben Raster wie das Bild.

Also drei Gitter statt einem (ein viertes kam später dazu, siehe „Die Höhe
wandert nicht"):

| | Ausdehnung | Weite | Aufgabe |
| --- | --- | --- | --- |
| Grundgitter | ganzer Ausschnitt | fest 3 min | Landmaske, Perzentil, Ausgewanderte, Isochronen |
| Rechengitter | Sichtbares + 2,5 σ | ≈ 3 px | Höhenfeld, sobald hineingezoomt ist |
| Bildgitter | Sichtbares | 1 px | das Bild |

Das Grundgitter hängt nur an Lage und Anteil, und ein Zähler sagt, wann es neu
muss. Nachgemessen: Meeresspiegel 322 und Schneegrenze 530 Minuten stehen über
den ganzen Zoombereich auf derselben Zahl.

Zwei Dinge sind dabei nebenbei besser geworden. Die Nachsicht, mit der ein
Bahnhof noch als „an Land" gilt, stand in **Zellen** und hing damit an der
Auflösung — die Zahl der Inseln war 537 bei drei Minuten je Zelle und 593 bei
1,24; jetzt sind es 585, und zwar bei jeder Auflösung. Jetzt steht sie in Minuten (zwei) und die Karte hat immer dieselben
Inseln. Und die Isochronen liegen auf dem Grundgitter: bei σ = 22 Minuten sind
das über sieben Zellen, die Linien kommen als Pfad in Weltkoordinaten heraus
und sind bei jedem Zoom scharf — auf dem Bildgitter waren sie zwanzigmal so
teuer.

Was noch auffiel, weil das Grundgitter es sichtbar machte: die Anzeige am
Wasserstandsregler stand auf einer anderen Zahl als die Legende. Der
Wasserstand ist intern ein Aufschlag auf den besten Bahnhof, angezeigt wird er
absolut — und der beste Bahnhof wandert mit dem Anteilsregler. Die Anzeige
gehört darum zu jedem Bild und nicht nur zum eigenen Regler.

## Größer anfangen, weiter herauszoomen

Der Wunsch war: Anfangszoom größer, aber auch herauszoomen können, um die
entlegenen Stationen zu erkunden. Beides zusammen geht nur, weil es zwei
verschiedene Rechtecke gibt.

**Anfangszoom 1,15**, und das kostet oben und unten je rund fünfzig Minuten —
die Spitze von Sylt, der Zipfel um Konstanz. Unvermeidlich: Deutschland ist
990 Minuten hoch, der Schirm ist breit, die Ansicht also höhenbegrenzt. Das
Land füllte schon bei Zoom 1 die Bildhöhe, während die halbe Breite leer blieb;
größer geht nur durch Beschneiden. Die Ansicht startet dabei in der Mitte des
**Rahmens** und nicht des Umfangs — die liegt gut achtzig Minuten weiter
südlich, weil die Zeitkarte nach Süden weiter ausgreift, und der Anschnitt
wäre einseitig gewesen.

**Herausgezoomt wird bis 0,69**, und dort passt der ganze Umfang ins Bild:
1.322 × 1.350 Minuten statt der 985 × 1.006 des Rahmens. Dafür gibt es jetzt
zwei Rechtecke statt einem — RAHMEN sagt nur, wohin die Ansicht beim
Aufschlagen zeigt, WELT ist der Umfang, in dem es überhaupt Karte gibt.
Gerechnet, maskiert und gezeichnet wird bis WELT; die Grenze des Zooms folgt
daraus und ist nicht gesetzt.

Ein Fehler, der dabei entstand und gleich wieder weg musste: mit dem
Grundgitter über WELT zählte auch das 99,5-Perzentil der Farbleiter die
hinausgefahrenen Enden mit, und die sind so extrem, dass sie das obere Ende
allein bestimmten — die Schneegrenze stieg von 530 auf 629 Minuten, und auf
dem Land lag nirgends mehr Schnee. Gezählt wird darum nur **innerhalb des
Rahmens**, obwohl das Gitter weiter reicht: der Rahmen ist die Karte.

**Beim Hineinzoomen kommen neue Namen dazu.** Mit jedem Zoomschritt wird ein
Budget für Bahnhofsnamen frei, gefüllt aus einer Rangliste nach Halten am Tag;
gemessen über der Mitte des Landes 11 Bahnhofsnamen bei 1,15, 26 bei Zoom 2,
85 bei 4, 184 bei 8. Angeboten wird die **ganze** Rangliste und nicht ihr
Kopf — das war der erste Versuch, und er brachte fast nichts: wer in den Harz
zoomt, bekam die Namen von Hannover angeboten, das national weiter oben steht,
aber außerhalb des Bildes liegt.

**Die Bahnhofspunkte sind von Anfang an eingeblendet** und werden mit der
Wurzel des Zooms etwas größer, gedeckelt — linear lägen sie schon bei Zoom 4
wie Murmeln.

Nebenbei: die Zahl der Inseln liegt jetzt bei 585 statt 593, weil die
Nachsicht in Minuten statt in Zellen steht und das Grundgitter drei Minuten
weit ist. Das ist derselbe Wert wie in der Fassung mit drei Minuten je Zelle
(537) — er hängt eben nicht mehr an der Auflösung.

## Die Farbe eines Punktes darf nichts über den Platz sagen

Beim Verziehen wechselten Bahnhofspunkte zwischen Weiß und Rot, und die Frage
war, warum. Nachgesehen: die Punktebene zeichnet alle 4.781 Bahnhöfe weiß, und
die Beschriftung zeichnete darüber einen roten Kreis für jeden Bahnhof, dessen
Name untergebracht werden konnte — 83 bei morph 0, 81 bei morph 1, und
dazwischen eine andere Auswahl, weil beim Verziehen andere Namen passen als
vorher. Es sah aus, als sagte die Farbe etwas über den Bahnhof; sie sagte
etwas über den Platz.

Rot bekommen jetzt die **Ortsmarken**, unabhängig davon, ob ihr Name
untergebracht wurde: eine feste Liste, nachgemessen 62 bei jedem Morphwert.
Ein Name zeichnet keinen eigenen Punkt mehr — außer wenn die Punktebene
ausgeschaltet ist, denn dann braucht er einen Anker.

Der Fehler ist mit dem Einblenden der Punkte entstanden. Vorher waren die
Punkte aus, und der rote Kreis war die *einzige* Marke — dann fällt nicht auf,
dass er kommt und geht, weil dort vorher nichts war.

*Nachtrag: zurückgenommen, siehe „Rot heißt: hier steht ein Name" weiter
unten.*

## Zu viele Namen beim Hineinzoomen

Die Zahl der Bahnhofsnamen hing am Zoom (dreißig je Stufe, höchstens 260), und
bei Zoom 8 standen 184 im Bild. Das war kein Kartenbild mehr, sondern ein
Register.

Jetzt sagt nicht der Zoom, wie viele dazukommen, sondern der **Platz**: die
Gesamtzahl der Namen im Bild bleibt ungefähr gleich. Beim Hineinzoomen fallen
die Ortsmarken aus dem Bild — von 62 sind bei Zoom 8 noch drei übrig —, und
genau diese Lücke füllen die Bahnhofsnamen auf.

| Zoom | Namen gesamt | davon Bahnhöfe |
| --- | --- | --- |
| 1,15 | 81 | 11 |
| 2 | 62 | 6 |
| 4 | 62 | 37 |
| 8 | 62 | 59 |

## Die Höhe wandert nicht, die Leiter wanderte

Die Frage war, warum die Bahnhöfe beim Verziehen manchmal ihre Höhe wechseln —
und die Erwartung dabei, dass sie das nicht tun. Die Erwartung ist richtig,
und sie ist jetzt nachgemessen: die Höhe eines Bahnhofs unterscheidet sich
zwischen Landkarte und Zeitkarte um **null Minuten**.

Gewandert war die **Farbleiter**. Ihr oberes Ende, das 99,5-Perzentil der Höhe
auf dem Land, kam aus dem gezeichneten Feld — und das hängt an der Lage:

| | oberes Ende | Schneegrenze |
| --- | --- | --- |
| Landkarte | 337 min | 520 min |
| Zeitkarte | 349 min | 530 min |

Ein Farbband ist elf Minuten breit. Die ganze Leiter verschob sich also im Lauf
der Bewegung um ein Band: dieselbe Höhe bekam eine andere Farbe, über die
gesamte Fläche zugleich. Dieselbe Verwechslung wie beim Zoom eine Fassung
vorher — eine Eigenschaft der Ansicht war in eine Aussage über das Land
geraten.

Das Perzentil hat darum ein **viertes Gitter** bekommen: 196 × 256 Zellen von
je vier Minuten über der *unverzogenen* Geografie, mit der Landmaske aus dem
unverzogenen Umriss. Gitter und Maske stehen ein für alle Mal fest, das Feld
darauf wird nur neu gerechnet, wenn der Anteilsregler sich bewegt; im
Morphbild kostet es nichts (166 gegen 161 Millisekunden, also Rauschen).
Nachgemessen: **336,55 Minuten in allen elf Morphstellungen und bei jedem Zoom
von 0,69 bis 16**, Schneegrenze 519. Am Anteil hängt es weiter, und das soll
es — 284 Minuten bei drei Prozent, 350 bei zweiundsechzig.

Ein Rest bleibt und ist kein Fehler: das Relief ist die geglättete Fläche
*zwischen* den Bahnhöfen, und wer neben einem Bahnhof liegt, ist in der
Zeitkarte ein anderer als in der Landkarte. Der gemalte Wert am Bahnhof
wandert dadurch im Median um acht Minuten, zwei Drittel Farbband. Der Versuch,
auch das wegzurechnen — jeder Ort trägt seine geglättete Höhe mit sich, die
Glättung zerlegt in 9,2 ⊕ 6,0 — kommt auf vier Minuten und ist wieder heraus:
das kleine σ trifft die Punkte fast genau, damit steht die *geografische*
Nachbarschaft im Bild, und der glatte Trichter der Zeitkarte bekommt eine
Kräuselung. Der glatte Trichter ist das Bild. Die Rechnung steht in
[METHODIK 4.13](METHODIK.md).

## Rot heißt: hier steht ein Name

Der rote Punkt an beschrifteten Bahnhöfen war beliebt und ist wieder da.

Weggenommen wurde er, weil er beim Verziehen kam und ging: rot bekam, wessen
Name gerade daneben passte, und beim Verziehen passen andere Namen. Das war zu
vorsichtig gerechnet. Der rote Punkt ist der **Anker der Beschriftung** — er
sagt nicht „dieser Bahnhof ist wichtig", er sagt „dieser Name gehört hierher",
und ohne ihn schwebt ein Name im Gelände. Dass sich die Auswahl mit dem Zoom
ändert, *soll* so sein: beim Hineinzoomen kommen neue Namen dazu, und die
brauchen ihren Punkt.

Der Preis ist nachgezählt und klein: über den ganzen Morph kommen und gehen
eine Handvoll Punkte, 86 in der Landkarte gegen 79 in der Zeitkarte. Über den
Zoom sind es 79 bei der Anfangsstellung und 63 bis 64 weiter drinnen — die
Ortsmarken fallen aus dem Bild, die Bahnhofsnamen füllen nach.

Die Ortsmarken bleiben zusätzlich rot, auch wenn ihr Name keinen Platz fand;
sonst verschwände beim Hineinzoomen die Mitte einer Stadt ganz. Alle roten
Punkte haben jetzt dieselbe Größe (Radius 1,55 · √Zoom, gedeckelt bei 2,0) —
vorher waren der Ankerpunkt und die Ortsmarke verschieden groß.

## Einen Bahnhof anfassen, und die Kamera mitnehmen

Drei Dinge, und das erste war eine stille Fehlfunktion.

**Der Name zählt jetzt wie der Punkt.** Anklickbar war der Punkt, drei Pixel
breit; der Name daneben ist fünfzig und im Blick das Auffälligere. Eine Fläche,
die aussieht wie ein Ziel und keines ist, ist schlimmer als keine — und auf dem
Telefon ist der Name die einzige, die ein Finger verlässlich trifft. Die
Namenskästen werden beim Zeichnen ohnehin geführt (die Beschriftung prüft jeden
gegen die belegten), sie werden jetzt mit ihrem Bahnhof aufbewahrt und beim
Klicken **zuerst** geprüft: ein Kasten trifft genau einen Bahnhof, der Umkreis
von 26 Pixeln um einen Punkt erwischt im Ruhrgebiet ein halbes Dutzend.
Nachgemessen treffen alle 75 Kästen des Anfangsbildes ihren eigenen Bahnhof.

**Die Kurzinfo steht in der Karte, in der Ecke** — dort ist bei jeder
Reglerstellung schwarzer Grund, und der Blick muss nicht in die Seitenspalte.
In welcher Ecke, sagt der gewählte Bahnhof: in der von ihm entferntesten. Die
erste Fassung stand immer unten links und lag damit bei München auf München.

Hochkant war der Kasten zu groß: 129 Punkte auf einer Karte von 416, fast ein
Drittel, und damit mehr im Weg als die Auskunft wert war. Unter 560 Punkten
Fensterbreite stehen die vier Zahlen jetzt mit Trennpunkten statt in Sätzen und
der Hinweis in fünf Wörtern — zwei Zeilen statt vier, nachgemessen **78 Punkte**
statt 129, ein Fünftel der Karte statt einem Drittel. Am Schirm bleibt der
ausgeschriebene Text.
Sie nennt Minuten bis zum Anteil, Aufschlag auf den besten Bahnhof im Land,
Halte am Tag, Einzugsgebiet. Zwei der vier Zahlen wandern mit den Reglern, sie
hängt also an jedem Bild; neu geschrieben wird sie nur, wenn sich etwas darin
geändert hat.

**Und dann nimmt die Kamera den Bahnhof mit.** Ist einer gewählt und drückt man
▶, bleibt er in der Bildmitte stehen und das Land verzieht sich um ihn. Das ist
der Grund, einen zu wählen: sonst sieht man die Verformung des Bildes und muss
sich dabei merken, wo ein Ort vorher lag. Der Weg von der Landkarte in die
Zeitkarte ist im Median 57 Minuten lang, im 90. Perzentil 143 — Frankfurt Hbf
rückt 24, Göttingen 45, Berlin Hbf 152, Göhren 182.

Die Klemmung musste dafür anders sein. Die normale hält das *Bild* im Umfang
und zöge den Bahnhof bei der Anfangsstellung sofort wieder in die Bildmitte des
Landes — die Kamera bewegte sich gar nicht. Beim Folgen wird nur die *Mitte* in
den Umfang geklemmt: der Bahnhof steht genau in der Mitte, auch wenn dafür
schwarzer Grund an den Rand kommt. Nachgemessen bleibt der Abstand zwischen
Bildmitte und Bahnhof über die ganze Fahrt bei null Minuten.

Das Folgen endet, sobald die Fahrt endet oder jemand selbst schiebt oder
kneift. Ein Klick ins Leere hebt die Wahl auf, Escape auch. Der gewählte
Bahnhof bekommt einen weißen Ring — eine Markierung, keine vierte Farbe — und
seinen Namen außerhalb des Budgets, damit er beschriftet ist, auch wenn er es
in der Rangliste nie so weit nach oben geschafft hätte.

## Ein hochkantes mp4 aus der Seite

`build/film.mjs` macht aus der fertigen Seite ein Video für die Stellen, an
denen eine Webseite nicht hingeht. Der Inhalt ist der der Seite, nichts
nachgebaut: sie wird geladen, die Regler ausgeblendet, dann Bild für Bild
weitergestellt und in eine Röhre an ffmpeg geschoben.

**Was aus der Vorlage übernommen wurde, ist die Einstellung, nicht nur das
Verfahren.** Bei `eiszeit-europa` hat genau das einmal gefehlt und vier
Rechenläufe gekostet: Reddit wies ein hochkantes mp4 wiederholt ab, mit nichts
als „submit failed", und die Ursache war die **Spitzenbitrate**. Nicht die
Tonspur — die funktionierende Fassung hat gar keine —, nicht B-Frames, nicht
Edit-Listen, nicht das Profil. Was hilft, ist `-maxrate 2600k -bufsize 5200k`
neben dem CRF. Diese Flags stehen hier unverändert.

Geändert ist nur **CRF: 18 statt 23**. Bei 23 kam der Lauf dort auf
1,93 Mbit/s — anderthalb Mbit/s Luft unter einem Deckel, den niemand nutzte.
Der Deckel begrenzt die Spitze, nicht den Durchschnitt; ein kleineres CRF füllt
also die Luft aus, ohne das Risiko anzufassen, um das es ging.

**Gerechnet wird groß und verkleinert.** Die Seite deckelt die Punktdichte bei
2 und das Feldgitter bei 700.000 Zellen, weil dort jedes Bild in Echtzeit
fallen muss; beides ist dafür jetzt `let` statt `const`. Der Film dreht auf:

| | Seite | Vorlage (eiszeit) | hier |
| --- | --- | --- | --- |
| Leinwand | 1× Zielbreite | 2160 (2× überabgetastet) | **3240 (3×)** |
| Feldgitter | 540 Zellen quer | ~1.620 | **2.704 = 9,56 M Zellen** |

Die Überabtastung ist auf Höhenlinien und Acht-Punkt-Schrift der sichtbarste
Unterschied überhaupt — und der Film kann sie sich leisten, die Seite nicht.

**Gemessen, bevor gerechnet wurde** (`MESSEN=1`, Bildzeit bei 3× Leinwand):

| Feldzellen | Bildzeit | Lauf |
| --- | --- | --- |
| 0,35 M (FEIN 1,0) | 1,35 s | 45 min |
| 1,38 M (FEIN 0,5) | 1,31 s | 44 min |
| 2,98 M (FEIN 0,34) | 2,70 s | 91 min |
| 8,58 M (FEIN 0,20) | 3,63 s | 122 min |

Zwischen FEIN 1,0 und 0,5 **kostet das feinere Gitter nichts** — der
Screenshot einer 3.240 Punkte breiten Leinwand dominiert. Wer hier am Gitter
spart, spart an der falschen Stelle. Genommen wurde die feinste Zeile.

**Das Drehbuch steht im Skript, nicht in der Seite.** Die Vorlagen sind
Zeitreihen mit einer Uhr und einem `setzeZeit(p)`; diese Seite ist ein Werkzeug
mit drei Reglern. Zehn Akte über 65 Sekunden stellen Morph, Anteil, Zoom und
den gewählten Bahnhof — ein Filmdrehbuch in einer Seite, die niemand als Film
benutzt, wäre totes Gewicht für jeden Besucher.

**Der Film zeigt nur den Morph, und der Rahmen steht fest.** Vier Fassungen
des Drehbuchs sind verworfen, und die letzte war die lehrreichste.

Zuerst standen Zoom und Mitte von Hand, dann rechnete **jedes Bild** seinen
Rahmen neu — und das war wieder falsch, nur anders. Der Umriss wird beim
Verziehen größer, also ging der Zoom auf und die Mitte wanderte; im Bild sah
es aus, als wackle das Land. Gewollt ist das Gegenteil: die Landschaft verzieht
sich, ihre Lage im Bild nicht.

Jetzt gilt **ein** Rahmen für den ganzen Film, und er muss den verzogenen
Umriss bei jeder Reglerstellung fassen. Die weißen Bahnhofspunkte dürfen
hinausfliegen — in der Zeitkarte liegen 585 jenseits der Küste, und wer die
alle fassen will, druckt Deutschland auf Briefmarkengröße —, die Grenzen des
Zeit-Deutschlands nicht.

Gerechnet wird er aus **zwei** Bildern, nicht aus einundzwanzig: `verziehe`
mittelt die Verschiebungen der Bahnhöfe mit Gewichten, die nur an der
Geografie hängen, und die Verschiebung selbst ist `(fxx − gxx) · morph`. Jeder
Umrisspunkt läuft damit **linear** im Morph, und eine Strecke hat ihre Extreme
an den Enden. Nachgemessen an neun Zwischenstellungen: größte Überschreitung
der Vereinigung der beiden Enden **0,000 Minuten**.

Bei diesen Daten ist die Vereinigung schlicht der Umriss der Zeitkarte,
852 × 1.062 Minuten um (−17 / 60), Zoom 1,118. Die Landkarte liegt ganz darin
und steht deshalb etwas kleiner im Bild — der Preis dafür, dass sie sich nicht
bewegt, und der günstigere. Geprüft wird es auch: das Skript rechnet nach dem
Setzen für beide Endzustände die Luft zwischen Umriss und Bildrand aus (25,5
und 12,9 Punkte) und bricht ab, wenn sie negativ wird. Die Klemmung, die das
Bild im Umfang hält, kann die Mitte nämlich noch verschieben — ein Rahmen, der
das nicht nachprüft, schneidet unten drei Pixel ab, und es fällt erst am
fertigen Film auf.

Die Akte des Anteilsreglers und die Kamerafahrt an Berlin sind damit heraus:
beide brachten Bewegung ins Bild, die nicht die der Karte ist. Übrig bleiben
fünf Akte über 34 Sekunden — Landkarte, hin, Zeitkarte, zurück, Landkarte —,
und der Film endet auf seinem Anfangsbild, damit die Schleife, in der solche
Videos laufen, ohne Schnitt zusammengeht.

Was die verworfenen Fassungen gelehrt haben, bleibt hier stehen:

- **Ein Zoom von Hand, fest.** Die Landkarte spannt 715 × 956 Minuten, die
  Zeitkarte 1.274 × 1.302. Bei einem Zoom, der die Landkarte füllt, fliegt die
  Zeitkarte hinaus; bei einem, der die Zeitkarte fasst, steht am Anfang die
  Hälfte des Bildes schwarz. Die Lösung war nicht mehr Bewegung, sondern der
  richtige Bezug: nicht die Bahnhöfe rahmen, sondern den Umriss.
- **Zoom von Hand auf- und zufahren** (1,26 → 0,86). Die Mitte blieb die des
  **Rahmens** — und der kommt ganz von der Zeitkarte und liegt 58 Minuten
  westlich der Mitte der Landkarte. Sachsen stand im ersten Bild halb draußen:
  Dresden am Rand, Görlitz weg. Ein Film über Deutschland, auf dem Deutschland
  nicht ganz drauf ist.
- **Göhren als Held des Kamera-Akts.** Göhren wandert 182 Minuten und landet
  weit im Meer: die Kamera stand mit ihm im Schwarzen und Deutschland in einer
  Ecke. Berlin Hbf wandert 152 Minuten und landet **im** Land — es steht still,
  und Deutschland zieht darum herum vorbei. Der Akt ist mit der Kamerafahrt
  zusammen heraus, die Lehre bleibt: wer die Kamera an etwas bindet, muss
  prüfen, ob das Etwas im Bild bleibt.

**Der Untertitel hängt am Morph.** „distance on this map **is** travel time"
stimmt erst, wenn die Karte fertig verzogen ist; im ersten Bild ist sie eine
Landkarte. Drei Fassungen, und die Richtung kommt aus dem Akt selbst, einen
Wimpernschlag weiter gefragt: „a map of Germany, coloured by how far its trains
get" bei Morph 0, „distance is **turning into** travel time" hin, „and
**turning back** into geography" zurück, und die Behauptung erst am Ende.

**Der Wasserstand ist so gewählt, dass Berlin gerade so ein See ist** — und
zwar nachgemessen, nicht nach Berlins eigener Höhe. Die liegt bei 293 Minuten,
61 über dem besten Bahnhof; bei 62 Minuten Aufschlag blieb Berlin trocken.
Überflutet wird nicht der Bahnhof, sondern das **gemalte Feld** an seinem Ort,
und das liegt dort 35 Minuten höher (96 Aufschlag, 329 absolut): Berlin ist eine
Insel guter Anbindung in einem schlecht angebundenen Brandenburg, und die
Glättung zieht es hoch. Bei 97 geht der Punkt unter, ohne dass der See schon bis
Potsdam reicht.

Zwei Fassungen fallen aus **einem** Bilddurchgang, weil das Rechnen der Bilder
das Teure ist und die Kodierer nebenherlaufen: `film.mp4` mit 1080 × 1920 und
dem gedeckelten Rezept für Reddit, `film-hoch.mp4` mit 1440 × 2560 ohne Deckel
für alles andere.

Die hohe Fassung stand zuerst auf CRF 16 und kam damit bei 34 Sekunden auf
**42,8 MB** — und passte durch keinen der Kanäle, über die sie danach
verschickt werden sollte (30 MB). Eine zweite Kodierung rettet das, kostet aber
eine Generation; gemessen landet CRF 19 bei 30 MB und 20 bei 27. Jetzt steht
20 im Rezept: die Auflösung bleibt voll, und bei diesem Stoff ist der
Unterschied zu 16 nicht zu sehen. Die Lehre ist dieselbe wie beim
Bitratendeckel, nur eine Stufe später — **eine Datei, die niemand
weiterschicken kann, ist keine fertige Datei.** Die Grenze gehört ins Rezept
und nicht in eine Nachbearbeitung. Die hohe Fassung ist zugleich die Rückversicherung:
Sollte Reddit die gedeckelte doch abweisen, lässt sich daraus in einer Minute
eine vorsichtigere rechnen, ohne die zwei Stunden neu zu rendern.

**Der Zwischenstand fällt dabei ab.** `build/zwischenstand.mjs` hängt die
Abschnitte zusammen, die eine Quittung haben, und gibt ein spielbares mp4 —
während der Lauf am nächsten Abschnitt weiterrechnet. Das ist keine Vorschau,
sondern buchstäblich der Anfang des endgültigen Films in endgültiger Qualität.
Möglich macht es allein die Quittung: der Abschnitt, an dem gerade gerechnet
wird, liegt als halbe Datei daneben und würde den Zusammenschnitt zerreißen.
Die Quittung war gegen einen anderen Fehler gebaut (siehe unten) und trägt
diesen Nutzen kostenlos mit.

Gerechnet wird in Abschnitten von 240 Bildern, jeder für sich ein mp4, mit einer
Quittung daneben, die erst nach dem Schließen des Kodierers geschrieben wird.
Der Ordner hängt an einem Abdruck von Seite, Skript und allen Einstellungen: ein
Neustart findet seine Arbeit wieder, ein anderer Stand fängt neu an. Das ist
gegen den Fehler gebaut, der bei der Vorlage passiert ist — dort wurden
stillschweigend Abschnitte aus einem anderen Stand der Seite übernommen, und der
Film war vorne alt und hinten neu, ohne ein Wort im Protokoll.

## Warum die Punkte am Kartenrand flackerten

Aufgefallen ist es im Film, und die erste Vermutung war falsch. Nicht die
Beschriftung: über 30 Bilder wechseln nur fünf Namen, jeder einmal. Es waren
die **Eisschollen**, und ihre Zahl lief durch die Verformung nicht monoton —
240, 236, 238, 237, 242, 242, 244, 242, 241 …, also 80 Wechsel in 29 Bildern.

Zwei Ursachen, und sie ließen sich trennen, indem gezählt wurde, wie oft
*derselbe* Bahnhof kippt. Über 60 Bilder:

| Wechsel je Bahnhof | Anzahl |
| --- | --- |
| 1 — echter Übertritt | 101 |
| 2 | 5 |
| 3 und mehr — Flackern | 29, einer zwölfmal |

**Erstens** lag der Auswanderer-Test auf der ganzzahligen Rasterzelle (`|0`)
und nahm das Maximum über drei mal drei Zellen. Sein Prüffenster sprang damit
bei jeder Zellgrenze um eine ganze Zelle weiter, und an der Küste kippte die
Entscheidung hin und her. Gegriffen wird jetzt bilinear und an einem Ring von
acht Richtungen: stetig in der Lage des Bahnhofs. Das brachte die 80 Wechsel
auf 62 — besser, aber nicht gut.

**Zweitens**, und das war der größere Teil: eine Entscheidung ist immer ja oder
nein, und mit ihr erschien schlagartig eine weiße Scheibe von 23 Minuten
Durchmesser. Die 101 einmaligen Übertritte sind richtig — aber jeder war ein
Aufblitzen. Jetzt **wächst** die Scholle: ihr Radius hängt daran, wie weit der
Bahnhof draußen liegt, und geht an der Küstenlinie auf null.

Nachgemessen über 231 Übertritte in zwei Sekunden, bei 6,9 Pixeln Vollradius:

| Sprung beim Erscheinen | vorher | jetzt |
| --- | --- | --- |
| Mittel | 6,9 px (immer die ganze Scheibe) | **0,20 px** |
| über 1 px | alle 231 | 8 |
| über 3 px | alle 231 | 2 |

Der Nebeneffekt ist der eigentliche Gewinn: die 34 Bahnhöfe, die genau auf der
Schwelle kippen, haben jetzt eine Scholle von nahezu null Radius. Ihr Kippen
ist unsichtbar, **ohne** dass die Entscheidung geglättet oder mit einem
Gedächtnis versehen werden musste. Beides war der naheliegende Griff und wäre
teuer gewesen: eine Hysterese hätte gekostet, dass dieselbe Reglerstellung
dieselbe Karte zeigt — und genau dafür steht die Nachsicht in Minuten und nicht
in Zellen.

Die Zahl der Inseln in der reinen Zeitkarte liegt damit bei **585** statt 539,
weil der bilineare Griff etwas strenger ist als das Maximum über neun Zellen.
Davon haben 558 mehr als halben und 11 weniger als ein Zehntel Radius — das
Bild ändert sich also kaum, nur die Grenzfälle blenden sich aus. Bei jedem Zoom
dieselbe Zahl, wie zugesagt.

## Der Film läuft in der Schleife

Die Standbilder waren zu lang, und der Grund lag nicht in ihrer Länge, sondern
in der Schleife: der Film endet dort, wo er anfängt, also **addierte** sich das
Standbild am Ende zu dem am Anfang. Zwei mal 3,5 Sekunden waren an der Naht
sieben Sekunden Stillstand.

Jetzt gibt es am Ende gar keines — das Standbild am Anfang *ist* das der Naht,
und es dauert 1,6 Sekunden; der Halt in der Zeitkarte 2,4 statt 5. Das letzte
Bild wird nicht mehr gerechnet, weil es mit dem ersten identisch wäre und dort
ein Bild lang stotterte; nachgemessen unterscheiden sich erstes und letztes Bild
um 0,1 von 255 im Mittel. Die Kreuzblende der Texte ist von 0,45 auf 0,3
Sekunden herunter, weil bei 1,6 Sekunden Halt sonst mehr als ein Viertel davon
für das Ein- und Ausblenden draufging.

Statt eines Schlussakts mit der Adresse steht die Quelle dauerhaft unten: in
einer Schleife läuft ohnehin jeder Akt wieder vorbei, und ein Akt, der nur eine
Adresse zeigt, kostet Sekunden, in denen die Karte stillsteht. Länge jetzt
**26 Sekunden**, 780 Bilder.

## Was offen ist

**Die Bevölkerung ist innerhalb eines Kreises gleichmäßig verteilt.** Das ist
jetzt die gröbste Annahme in der Kette. Die Einzugsgebiete entstehen, indem
jeder Kreis mit 2 km gerastert und jede Zelle dem nächsten Bahnhof zugeschlagen
wird — mit der Kreisbevölkerung als einziger Dichteangabe. In einem Landkreis
mit einer Stadt und viel Wald sitzt damit zu viel Bevölkerung im Wald, und der
Haltepunkt am Waldrand bekommt ein Einzugsgebiet, das es nicht gibt. Die
Antwort wäre der Zensus-100-m-Raster oder wenigstens die Gemeindeebene; beides
liegt hier nicht (siehe [QUELLEN.md](QUELLEN.md)).

**Die größten Einzugsgebiete liegen an den falschen Bahnhöfen.** München Ost
bekommt 476.000 Menschen, München Hbf weniger — weil in den Städten die
S-Bahn fehlt und die Stadtbevölkerung an den wenigen verbliebenen
Regionalbahnhöfen landet, und welcher davon der nächste ist, entscheidet die
Geometrie. Für das gezeichnete Maß ist das ohne Belang (diese Bahnhöfe liegen
Minuten voneinander entfernt), im Zeiger steht die Zahl trotzdem, und dort
ist sie irreführend.

**Der Stadtverkehr fehlt, und das verzerrt die Ballungsräume.** Die Quelle
führt keine S-Bahn. Hamburg, München und das Rheinland liegen dadurch höher,
als sie müssten, und 227 Bahnhöfe an Nebenbahnen mit S-Bahn-Anschluss fehlen
ganz. Zu beheben wäre das nur mit einem eigenen GTFS-Auszug, der auch
`route_type` 109 behält — und dann müsste entschieden werden, ob eine
U-Bahn-Station ein Bahnhof ist. Für diese Karte lautet die Antwort nein.

**Nur eine Stunde.** Die Karte zeigt die dichteste Stunde des Tages. Dieselbe
Rechnung um 22:00 gäbe eine ganz andere Karte — ein Regler über den Tag wäre
das nächste, was dieses Projekt reizvoll machen würde, und er kostet nur
Rechenzeit: eine Reisezeitmatrix je Stunde, 24 mal 13 Sekunden, und 24 mal
fünf Minuten Federmodell. Die Nutzlast wäre allerdings 24 Lagen statt einer.

**Die Bodden und das Wattenmeer sind schwarze Flecken.** Hinter Rügen und bei
Husum liegt wirklich Wasser, und der Umriss sticht es aus der Karte. Das ist
richtig und sieht nach einem Fehler aus. Ein Meeresgrund in Blau statt des
schwarzen Grundes würde es auflösen und die Karte von ihrem schwarzen Grund
lösen, der das Beste an ihr ist.

**Der Grenzsaum trennt Deutschland nicht sauber ab.** Die Landesgrenze ist auf
2.100 Punkte vereinfacht und liegt deshalb um ein paar hundert Meter neben der
wirklichen; ohne einen Saum fallen Kehl, Gronau und Warnemünde aus dem Land.
Mit Saum kommen Auslandsbahnhöfe herein, und weil dieser Datensatz deren
eigene Landesfahrpläne nicht kennt, stehen sie als schlecht erreichbare Gipfel
auf einer Karte von Deutschland. Bei 2,5 km waren es 37 solche; bei den jetzt
gewählten 0,6 km sind es 8, und der Preis sind Lindau-Insel, Herten (Baden)
und Rheinfelden (Baden), die fehlen. Nach Abstand allein ist das nicht weiter
zu trennen — Gubin liegt 0,08 km von der Grenze, Kehl 0,29. Sauber ginge es
nur mit einer ungefähren Landesgrenze, und die gibt der Netzausgang hier nicht
her (siehe [QUELLEN.md](QUELLEN.md)).

## Der nächste Schritt, wenn einer kommt

**Die Netzqualität von der Lage trennen.** Alles auf dieser Karte ist absolut
gemessen, und das ist richtig für ein Gefühl: wer in Göhren wohnt, ist
abgehängt, und dass dort auch niemand in der Nähe wohnt, gehört dazu. Man kann
aber die andere Frage stellen — *leistet das Netz hier, was seine Lage
hergibt?* — indem man die gemessene Reichweite gegen die rechnet, die bei
Luftlinie und Landesdurchschnittsgeschwindigkeit herauskäme. Die Höhe wäre
dann der **Zeitverlust gegenüber der Luftlinie**, und die Karte zeigte nicht
mehr, wo wenig Leute wohnen, sondern wo das Netz unter seinen Möglichkeiten
bleibt: die Eifel, Mecklenburg, der Bayerische Wald, die Querverbindungen
überhaupt. Das ist eine andere Karte und eine eigene Seite wert, keine dritte
Lesart auf dieser.

## Was bewusst so bleibt

- **Die gezeichnete Höhe ist eine gemessene Größe, nicht die Modellhöhe.**
  Warum, steht in [METHODIK 3.4](METHODIK.md). Kurz: die Modellhöhe trifft die
  Zahlen besser und erzählt das Falsche.
- **Ein Zehntel als Schwelle, nicht eine Million.** Bei einer Million misst
  das Maß im Grunde, wie lange man braucht, um die eigene Stadt zu
  durchqueren — Berlin 18 Minuten, München 24 —, und das Relief wäre eine
  Karte der Großstädte. Ein Zehntel zwingt über die eigene Agglomeration
  hinaus.
- **Ein Regler für den Anteil, aber kein Umschalter zwischen Maßen.** A und B
  sind gerechnet und stehen als Kennzahlen in der Nutzlast, nicht als Ansicht.
  Der Anteilsregler deckt beide Pole ohnehin ab — bei 90 % *ist* die Karte die
  Geografiekarte —, und drei Knöpfe für dasselbe wären zwei zu viel.
- **Die Hälfte als Voreinstellung.** Sie ist das obere Ende des gemessenen
  Fensters und zeigt das Land statt des Ballungsraums. Ein Viertel, ein
  Fünftel und ein Drittel liegen genauso darin und zeigen dieselbe Familie von
  weiter unten; die Wahl sagt, wo der Regler aufschlägt, und nicht, welche
  Lesart richtig ist.
- **Der Grundriss ist die flache Federkarte, nicht die Geländelage.** Damit
  der Satz stimmt, der die Karte erklärt: der Abstand auf der Karte ist die
  Reisezeit.
- **Ein Reisender ohne Gepäck.** Gerechnet wird die früheste Ankunft, ohne
  Rücksicht auf Umstiegszahl, Preis oder Sitzplatz.
- **Fünf Minuten Umsteigezeit überall.** Die Quelle führt keine
  bahnhofsgenauen Zeiten, und eine geratene Staffelung wäre schlechter als
  eine ehrliche Pauschale.
