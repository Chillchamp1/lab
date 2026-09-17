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
Schneegrenze liegt bei einem Viertel und Wasser auf 250 Minuten nun bei 467
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
- **Ein Viertel als Voreinstellung, nicht ein Fünftel oder ein Drittel.** Alle
  drei liegen im brauchbaren Fenster; das Viertel ist die runde Zahl mit dem
  klarsten Satz dazu.
- **Der Grundriss ist die flache Federkarte, nicht die Geländelage.** Damit
  der Satz stimmt, der die Karte erklärt: der Abstand auf der Karte ist die
  Reisezeit.
- **Ein Reisender ohne Gepäck.** Gerechnet wird die früheste Ankunft, ohne
  Rücksicht auf Umstiegszahl, Preis oder Sitzplatz.
- **Fünf Minuten Umsteigezeit überall.** Die Quelle führt keine
  bahnhofsgenauen Zeiten, und eine geratene Staffelung wäre schlechter als
  eine ehrliche Pauschale.
