# Deutschland, gezeichnet von seinen Fahrplänen

→ **https://chillchamp1.github.io/lab/bahn-zeitkarte/**

Auf einer Landkarte ist der Maßstab der Kilometer. Hier ist er die Minute:
**4.781 Bahnhöfe** des deutschen Fern- und Regionalverkehrs, jeder so weit von
jedem anderen gezeichnet, wie die Bahn zwischen beiden braucht. Zwischen je
zwei Bahnhöfen hängt eine Feder, deren Ruhelänge die Reisezeit ist, und die
Karte ist die Lage, in der alle Federn zusammen am wenigsten ziehen.

Darüber liegt ein Relief, und es misst nicht Entfernung, sondern
**Reichweite**: wie lange es dauert, bis von hier ein **Anteil Deutschlands**
mit dem Zug erreichbar ist. Dieser Anteil ist ein Regler, und das ist keine
Bequemlichkeit — er schiebt zwischen den beiden Polen, zwischen denen jede
Erreichbarkeitskarte steht. Voreingestellt ist **die Hälfte**, 41,8 Millionen
Menschen: dann liegen Frankfurt Hbf und Frankfurt Flughafen am tiefsten, dahinter
Kassel-Wilhelmshöhe — das Relief spannt von 232 bis 744 Minuten.

> Die Seite ist **auf Englisch**. Diese vier Dokumente — README, Methodik,
> Quellen, Stand — sind die Rechenakte und bleiben deutsch.
Wer schnell Menschen erreicht, liegt tief und läuft unter Wasser; über den
abgehängten Gegenden liegt Schnee.

**Der Fahrplan.** Ein Tag des offenen DELFI-Datensatzes, **Mittwoch, 13. Mai
2026** — derselbe Tag, den [Ein Tag auf der
Schiene](https://chillchamp1.github.io/github.io/#de) abspielt, und von dort
auch der aufbereitete Auszug. 27.148 Zugfahrten, 279.680 Fahrplanabschnitte.
Abgefahren wird in der **dichtesten Stunde des Tages**, und die ist nicht
gesetzt, sondern gesucht: 06:36–07:36, mit 17.468 Abfahrten.

**Nur Züge.** ICE, IC, EC, Flixtrain, Thalys, Nachtzüge, RE, RB, IRE, MEX und
die Bahnen der Privatbahnen. Kein Stadtverkehr: S-Bahn, U-Bahn, Straßenbahn
und Bus stehen nicht im Quelldatensatz, und das ist Absicht — eine Karte, in
der die Berliner S-Bahn so zählt wie der ICE, zeigt Ballungsräume und nichts
sonst. Was das kostet, steht in [METHODIK.md](METHODIK.md) und im
Über-Fenster der Seite.

## Die Reisezeit zählt das Warten mit

Das ist der Punkt der ganzen Karte. Gerechnet wird **von Tür zu Tür ab der
Anfrageminute**, die Wartezeit auf den ersten Zug eingerechnet. Ein
Knotenbahnhof mit vier Zügen je Stunde liegt damit näher als ein Haltepunkt
mit einem alle zwei Stunden, auch wenn die Fahrt selbst gleich lang wäre.
Gemittelt wird über zwölf Abfahrtsminuten im Abstand von fünf Minuten quer
durch die Spitzenstunde, damit nicht der Zufall einer einzelnen Minute die
Karte formt. Umsteigen kostet überall fünf Minuten.

Der Maßstab fällt aus derselben Rechnung: **1,14 Minuten je Kilometer**
Luftlinie, also im Mittel 52 km/h von Bahnhof zu Bahnhof — Warten und
Umsteigen eingerechnet.

Ein paar Proben gegen den wirklichen Fahrplan (Mittelwert über die zwölf
Abfahrtsminuten, Wartezeit enthalten):

| von | nach | gerechnet | im Kursbuch |
|---|---|---:|---:|
| Berlin Hbf | Hamburg Hbf | 141 min | 1:45 + Warten |
| Frankfurt (Main) Hbf | Köln Hbf | 84 min | 1:05 + Warten |
| München Hbf | Berlin Hbf | 266 min | 4:00 + Warten |
| Frankfurt (Main) Hbf | München Hbf | 218 min | 3:10 + Warten |
| Stuttgart Hbf | München Hbf | 131 min | 2:15 |
| Nürnberg Hbf | München Hbf | 90 min | 1:05 + Warten |
| Kiel Hbf | Hamburg Hbf | 85 min | 1:15 + Warten |
| Garmisch-Partenkirchen | München Hbf | 94 min | 1:25 |
| Westerland (Sylt) | Hamburg Hbf | 233 min | 3:00 + Warten |

## Warum ein Relief

Die Reisezeit ist keine Geometrie der Ebene. Von einem abgelegenen Ort sind es
zu allem zwei Stunden, und in der Ebene gibt es keinen Punkt, der von allem
gleich weit weg ist und trotzdem in der Nähe liegt. Darum bleibt selbst die
beste flache Federkarte **23,4 %** daneben, gemessen als Stress — der
bleibende Unterschied zwischen gezeichneter Länge und Reisezeit.

Eine dritte Zahl je Bahnhof hilft, und das war die Vermutung, mit der dieses
Projekt anfing: *wenn schlechter erreichbare Orte höher gezeichnet werden,
müsste sich die Verzerrung in der Ebene verringern lassen.* Sie wurde geprüft.
Wird die Modelldistanz nicht als Luftlinie, sondern als **Weg über ein
Gelände** gerechnet — die kürzeste Kette von Kanten im Nachbarschaftsgraphen,
jede so lang wie √(Δx² + Δy² + Δh²) —, dann fällt der Stress von 23,4 % auf
**19,7 %**, und der Grundriss wird dabei *nicht* krummer: er liegt mit 76,5 km
im Mittel genauso weit von der Geografie wie der der flachen Karte mit
77,4 km.

| Karte | Stress |
|---|---:|
| die Landkarte selbst, bestmöglich skaliert | 30,0 % |
| die flache Federkarte | 23,4 % |
| dieselbe Ebene, dazu ein Höhenfeld | 21,8 % |
| Ebene und Höhe zusammen gesucht | 19,7 % |

**Die Vermutung stimmt also — und trotzdem steht diese Höhe nicht auf der
Karte.** Die Höhe, die das Modell sich wünscht, kann die Erreichbarkeit nicht
sein: dass Hamburg weiter von allem entfernt liegt als Fulda, steht schon im
Grundriss, Hamburg liegt am Rand. Für die Höhe bleibt nur, was der Grundriss
*nicht* sagen kann, und das ist etwas Kleinräumiges — mit der gemessenen
Erreichbarkeit korreliert sie mit **r = −0,06**, also gar nicht. In einer
Fassung lag Frankfurt Hauptbahnhof darin höher als Westerland auf Sylt.
Mathematisch richtig, erzählerisch falsch.

## Und welche Höhe dann — ein Regler statt einer Zahl

Die Frage dahinter: **was fühlt sich als angebunden an?** Zwei naheliegende
Antworten sind beide schief, und zwar in entgegengesetzte Richtungen.

| | Spanne | Median |
|---|---:|---:|
| **A** mittlere Reisezeit zu allen 4.780 anderen Bahnhöfen | 260–718 | 380 |
| **B** dasselbe, nach Menschen gewichtet | 241–712 | 364 |

**A ist falsch gewichtet:** ein Haltepunkt mit dreißig Einwohnern zählt darin
wie Köln. **B behebt das — und ändert die Karte fast nicht.** A und B
korrelieren mit **r = 0,973**, und das war das überraschendste Ergebnis dieses
Projekts. Der Grund ist einfach, sobald man ihn sieht: ein Mittelwert über ein
großes Land wird von der *fernen Hälfte* bestimmt. Er misst, wie weit es bis
zum anderen Ende ist — also Geografie. München steht in beiden so schlecht wie
Ulm, und München fühlt sich nicht so an.

Der umgekehrte Fehler ist genauso leicht zu machen. Fragt man „wie lange, bis
eine Million Menschen erreichbar sind", misst man im Grunde, wie lange man
braucht, um die eigene Stadt zu durchqueren — Berlin 18 Minuten, München 24 —,
und die Karte wird eine Karte der Ballungsräume.

**Beides ist dieselbe Größe mit zwei verschiedenen Parametern.** Sortiert man
von einem Bahnhof aus alle anderen nach Reisezeit und summiert ihre
Einzugsgebiete auf, entsteht eine Verteilung: welcher Anteil Deutschlands nach
wie vielen Minuten in Reichweite ist. „Minuten bis zum Anteil q" ist ihr
q-Quantil, und die beiden Pole sind genau seine beiden Enden. Darum ist der
Anteil hier ein Regler:

| Anteil | Minuten | Median | die drei tiefsten | r zu A |
|---:|---:|---:|---|---:|
| 2,0 % | 28–597 | 136 | Berlin Hbf, Köln, Düsseldorf | 0,76 |
| 4 % | 48–608 | 164 | Düsseldorf, Duisburg, Düsseldorf Flughafen | 0,78 |
| 8 % | 70–626 | 204 | Duisburg, Düsseldorf, Essen | 0,85 |
| 13 % | 100–640 | 236 | Duisburg, Essen, Düsseldorf | 0,88 |
| 17 % | 126–650 | 256 | Dortmund, Essen, Düsseldorf | 0,90 |
| **25 %** | **160–665** | **288** | **Frankfurt Flughafen, Frankfurt Hbf, Köln** | **0,92** |
| 36 % | 192–702 | 324 | Frankfurt Flughafen, Frankfurt Hbf, Frankfurt Süd | 0,93 |
| 50 % | 232–744 | 364 | Frankfurt Hbf, Frankfurt Flughafen, Kassel-Wilhelmshöhe | 0,95 |
| 67 % | 272–790 | 415 | Fulda, Kassel-Wilhelmshöhe, Frankfurt Hbf | 0,98 |
| 90 % | 353–863 | 509 | Fulda, Kassel-Wilhelmshöhe, Göttingen | 0,96 |

Von unten nach oben gelesen ist das der ganze Weg: bei 2 % gewinnen Berlin und
Köln, bei 4 bis 17 % das **Ruhrgebiet**, ab 21 % **Frankfurt**, und ab zwei
Dritteln **Fulda, Kassel-Wilhelmshöhe und Göttingen** — die geometrische Mitte
des Landes. Die Korrelation mit A steigt dabei von 0,76 auf 0,98: am oberen
Ende *ist* die Karte die Geografiekarte.

## Wo die Voreinstellung sitzt, und warum

Die Wahl ist nicht Geschmack, sondern hat eine gemessene Grenze. Eine
Erreichbarkeitskarte ist genau so lange eine Dichtekarte, wie die **eigene
Agglomeration den geforderten Anteil allein hergibt** — dann muss niemand das
Netz benutzen. Nachgezählt:

| von | in 90 Minuten erreichbar |
|---|---:|
| Essen Hbf | **11,6 %** Deutschlands |
| Frankfurt (Main) Hbf | 5,6 % |
| Berlin Hbf | 5,4 % |
| München Hbf | 4,9 % |

Rhein-Ruhr ist die größte zusammenhängende Ballung des Landes, und sie ist
rund ein Achtel davon wert. Oberhalb von etwa einem Siebtel kann also keine
Region mehr aus sich selbst schöpfen — und genau dort kippt die Tabelle oben:
bei 17 % führt noch das Ruhrgebiet, bei 21 % Frankfurt. Am anderen Ende friert
die Rangfolge ab etwa zwei Dritteln ein, weil es dann nur noch darauf ankommt,
wie schnell man Sylt und Rügen erreicht.

Das brauchbare Fenster liegt damit zwischen einem Sechstel und der Hälfte, und
die Voreinstellung sitzt an dessen **oberem Rand: der Hälfte** — 41,8
Millionen, viermal die größte Ballung. Das ist das Land und nicht der
Ballungsraum: bei der Hälfte zahlt sich eine mittige Lage aus, und am tiefsten
liegen Frankfurt Hbf, Frankfurt Flughafen und Kassel-Wilhelmshöhe. Schiebt man
zum Sechstel hinunter, bekommt man die andere Lesart, in der das Netz
entscheidet und nicht der Ort. Beide sind wahre Aussagen über dieselben Daten;
der Regler ist da, weil keine von beiden die einzige ist.

Ein Viertel war eine Fassung lang voreingestellt, mit demselben Argument aus
derselben Messung — es ist die runde Zahl in der Mitte des Fensters. Die
Hälfte zeigt dieselbe Familie von ihrem anderen Ende.

## Woher die Menschen kommen

Ein Bevölkerungsgewicht je Bahnhof, aus drei Schritten — und jeder ist
geprüft:

1. **Kreisbevölkerung** zum 31. Dezember 2024 aus dem Nachbarprojekt
   [bevoelkerung-kreise](../bevoelkerung-kreise/): 400 Kreise, zusammen 83,6
   Millionen, letztlich aus der German Local Population Database.
2. **Kreisgeometrie** aus derselben Seite, wo sie als Zickzack-Varint über
   einem 64-Zeichen-Alphabet liegt: 400 Kreise, 12.000 Knoten, in einer
   flächentreuen Projektion (ETRS89-LAEA). Weil die flächentreu ist, lässt
   sich der Maßstab gegen die *amtlichen* Kreisflächen prüfen — 1
   Gittereinheit = 85,9 m aus dem Rahmen gegen 86,1 m aus den Flächen, und die
   Abweichung je Kreis liegt im Median bei 0,71 %, bei 90 % der Kreise unter
   4,6 %. Neun Städte mit bekannter Lage landen alle neun im Ring ihres
   eigenen Kreises.
3. **Einzugsgebiete.** Jeder Kreis wird mit 2 km gerastert (89.089 Zellen),
   jede Zelle trägt ihren Anteil an der Kreisbevölkerung, und dieser Anteil
   geht an den **nächstgelegenen Bahnhof** — über Kreisgrenzen hinweg, denn
   Menschen fahren zum nächsten Bahnhof und nicht zum nächsten im eigenen
   Kreis. Verteilt werden so alle 83,6 Millionen, keiner bleibt liegen.

Die ganze Rechnung, samt der verworfenen Wege, steht in
[METHODIK.md](METHODIK.md); die Quellenlage in [QUELLEN.md](QUELLEN.md); was
offen bleibt in [STAND.md](STAND.md).

## Bedienung

Die drei Regler liegen **direkt unter der Karte**, nicht in der Seitenspalte:
man schaut beim Schieben auf die Karte und nicht auf den Regler. Der Streifen
ist eine Zeile hoch, weil jede Zeile, die er sich nimmt, der Karte fehlt.

- **Landkarte → Zeitkarte** verzieht die Karte von der Geografie in die
  Reisezeit. Umriss und Ländergrenzen laufen mit — verschoben mit dem
  Verschiebungsfeld der Bahnhöfe selbst, damit die Kieler Förde die Kieler
  Förde bleibt, auch wenn Kiel wegläuft. Der **Abspielknopf** fährt hin und her
  und hält an beiden Enden eine Dreiviertelsekunde an: sonst kehrt die Fahrt im
  Endzustand um, ohne ihn gezeigt zu haben. **Diese Fahrt läuft beim
  Aufschlagen von selbst**, einmal, von der Landkarte in die Zeitkarte — wer
  die Zeitkarte ohne die Landkarte daneben sieht, hält sie für eine schlechte
  Landkarte. Wer die Karte anfasst, bricht ab; bei
  `prefers-reduced-motion` bleibt es beim Standbild der Zeitkarte.
- **Anteil Deutschlands** ist der Regler, der die Höhe *definiert*: von einem
  Fünfzigstel (Dichtekarte) bis zu neun Zehnteln (Geografiekarte). Achtzehn
  Stufen liegen vorgerechnet in der Nutzlast, dazwischen wird gemischt. Auch
  er hat einen Abspielknopf.
- **Wasserstand** hebt den Meeresspiegel, beschriftet in absoluten Minuten —
  bei der Hälfte liegt die Voreinstellung bei 322 Minuten. Die Farbleiter
  rückt mit, die Schneegrenze also auch.
- **Isochronen** zeichnet die Linien gleicher Reisezeit um einen von 54
  vorgerechneten Knoten, anzuklicken auf der Karte. Das ist die Probe aufs
  Ganze: auf der Landkarte sind das ausgefranste Sterne, auf der Zeitkarte
  müssen daraus Kreise werden.
- **Hauptachsen** blendet die 490 Bahnhofspaare ein, die ein ICE, IC/EC oder
  Nachtzug **ohne Zwischenhalt** verbindet, **Nebennetz** die übrigen 6.062
  Paare des Kerns — Regionalverkehr. Das ist ein Verbindungsgraph und keine
  Gleiskarte: die Gerade Berlin–Frankfurt ist der Sprung eines ICE und nicht
  der Verlauf der Strecke. Genau deshalb wird nach Produktklasse geteilt und
  nicht nach einem gesetzten Schwellenwert — im Fernverkehr *sind* die Kanten
  Sprünge (Median 31 km, bis 415 km), im Regionalverkehr folgen sie der
  Strecke (Median 4,5 km, drei von 6.062 über 60 km). Beide Lagen werden
  mitverzogen, und das ist der Witz daran: in der Zeitkarte ist die Länge
  eines Strichs eine Dauer, die Hauptachsen ziehen sich zusammen, die
  Nebenbahnen bleiben lang.
- **Zoom** mit Rad oder zwei Fingern, Ziehen zum Verschieben, Doppelklick
  zurück. Zoomen *verfeinert* das Raster statt es zu vergrößern, weil das Feld
  nur für den sichtbaren Ausschnitt gerechnet wird — beim Hineinzoomen wächst
  also das Detail und nicht die Zellzahl. Während der Geste wird absichtlich
  gröber gerastert, und sobald man loslässt, wieder fein.
  - Die Ansicht **startet bei 1,15** und nicht bei 1. Das kostet oben und
    unten je rund fünfzig Minuten — die Spitze von Sylt, der Zipfel um
    Konstanz —, und zwar unvermeidlich: Deutschland ist hoch (990 Minuten) und
    der Schirm ist breit, die Ansicht also höhenbegrenzt. Das Land füllt schon
    bei Zoom 1 die Bildhöhe, und die halbe Breite bleibt leer; größer geht nur
    durch Beschneiden.
  - Nach unten reicht der Zoom **bis 0,69**, und dort passt der ganze Umfang
    ins Bild: 1.322 × 1.350 Minuten statt der 985 × 1.006 des Rahmens. Wer die
    hinausgefahrenen Enden ansehen will — Rügener Bäderbahn, Sylt, den Zipfel
    um Singen, Mittenwald —, zoomt heraus; sie liegen dort mit Scholle und
    Namen.
- **Die Bahnhöfe sind von Anfang an eingeblendet**, und beim Hineinzoomen
  kommen **neue Namen** dazu, aus einer Rangliste nach Halten am Tag — der
  größte Bahnhof im Bild kommt zuerst. Wie viele, sagt nicht der Zoom, sondern
  der Platz: die Gesamtzahl der Namen bleibt ungefähr gleich, und die
  Bahnhofsnamen füllen die Lücke, die die aus dem Bild gefallenen Ortsmarken
  lassen.
- **Ein roter Punkt heißt: hier steht ein Name.** Er ist der Anker der
  Beschriftung, also ändert sich mit dem Zoom, welche Bahnhöfe rot sind; die
  übrigen 4.781 sind weiß. Rot bleiben außerdem die Ortsmarken, auch wenn ihr
  Name keinen Platz fand.
- Zeiger über einen Punkt zeigt Name, Erreichbarkeit und Zahl der Halte.
- **Ein Klick auf einen Bahnhof — auf den Punkt *oder* auf seinen Namen** —
  stellt seine Zahlen in die Ecke der Karte: Minuten bis zum Anteil, Aufschlag
  auf den besten Bahnhof im Land, Halte am Tag, Einzugsgebiet. Der Name ist die
  größere Fläche und auf dem Telefon die einzige, die man verlässlich trifft.
  Der Kasten geht in die Ecke, die am weitesten von dem Bahnhof weg ist, damit
  er ihn nicht zudeckt.
- Danach **▶**, und die Ansicht **fährt mit diesem Bahnhof**: er steht in der
  Mitte still, das Land verzieht sich um ihn. Wer selbst schiebt, führt wieder.

### Die Legende liegt unter der Karte

Farben liest man am Bild und nicht in einer Seitenspalte, also steht die
Farbleiter unter der Karte — mit **Teilstrichen in absoluten Minuten** statt
nur den beiden Endpunkten. Die brauchte es, weil die Leiter zwischen ihnen
nicht linear ist: fünf ihrer fünfunddreißig Bänder liegen unter Wasser und
dehnen die Minuten bis zum Meeresspiegel über ein Siebtel der Breite. Zwei
Striche sind benannt — der Meeresspiegel und die Schneegrenze —, und ein
runder Strich, der einem von beiden zu nah kommt, fällt aus.

Was die Legende **nicht** tut: sich beim Zoomen ändern. Das obere Ende der
Leiter kommt aus einem Gitter über dem ganzen Bildausschnitt, nicht aus dem
sichtbaren Teil; dieselbe Höhe hat darum dieselbe Farbe, ganz gleich wie nah
man herangeht.

### Drei Gitter, und jedes hat eine Aufgabe

Damit Zoomen billig bleibt und die Legende trotzdem stillhält, liegen drei
Gitter übereinander:

| | Ausdehnung | Weite | Aufgabe |
| --- | --- | --- | --- |
| **Grundgitter** | ganzer Ausschnitt | fest 3 min | Landmaske, oberes Ende der Farbleiter, Liste der Ausgewanderten, Isochronen |
| **Rechengitter** | Sichtbares + 2,5 σ | ~3 px | das Höhenfeld, wenn hineingezoomt ist |
| **Bildgitter** | Sichtbares | 1 px | das gezeichnete Bild |

Das Grundgitter hängt nur an Lage und Anteil, nicht an der Ansicht: beim Zoomen
und Schieben wird es nicht neu gerechnet, und genau deshalb kostet eine
Zoomgeste kaum mehr als ein Bild. Das Rechengitter braucht seinen Saum von
zweieinhalb σ über den Rand hinaus, weil die Glocke so weit trägt — ohne ihn
stünde am Bildrand ein falscher Wert.

### Auflösung und Kanten

Das Höhenfeld wird mit **einer Zelle je Bildschirmpixel** gerastert, nicht mit
einer festen Minutenzahl: `ZELLE = Feinheit / Maßstab`. Drei Minuten waren auf
einem großen Schirm zweieinhalb Pixel, und alles, was ins Raster gezeichnet
wird — Farbbänder, Höhenlinien, Licht —, war um diesen Faktor verwaschen; auf
dem Telefon waren dieselben drei Minuten Verschwendung. Das ruhende Bild ist
damit zweieinhalbmal feiner je Achse und sechsmal so zellenreich wie vorher.

Bezahlt ist das mit einem anderen Rechenweg: das Feld entsteht nicht mehr
Glocke für Glocke, sondern aus Impulsen plus **drei Kastenfiltern**
hintereinander — eine Glocke auf drei Prozent genau, aber O(Zellen) statt
O(n · r²). Und gerechnet wird **gröber, als gezeichnet wird**: das Feld ist
mit σ = 11 Minuten geglättet und bei 1,2 Minuten je Zelle neunfach
überabgetastet, also läuft die Kette auf einem Gitter von 3,6 Minuten und
wird bilinear aufs Bildgitter gesetzt. Scharf sein muss nicht das Feld,
sondern was daraus gezeichnet wird — Farbbänder, Höhenlinien, Licht. Von 647
auf 33 bis 53 ms.

**In der Fahrt bleibt die Karte scharf.** Die Rasterstufe wird dort nicht
gesetzt, sondern gemessen: die Fahrt läuft auf der Ruhestufe, und nur wenn ein
Bild länger als 110 ms braucht, geht sie schrittweise gröber — höchstens bis
1,35 Pixel je Zelle. Vorher standen dort fest 3,8, und das sah man.
Nebenbei fällt in der Fahrt weg, was nicht je Bild neu sein muss: die
Rastermaske wird jedes zweite Bild gerechnet, das Perzentil der Farbleiter
zählt jede vierte Zelle, und schattiert wird nur, was der Beschnitt auch
zeigt.

Und die Küste wird **beschnitten statt ausmaskiert**: dieselben Dreiecke und
Inselscheiben, aber als Pfad in Bildschirmkoordinaten. Ein Pfad hat keine
Auflösung — eine Maske im Feldraster wurde beim Hochskalieren bilinear
weichgezeichnet, und die Küste war ein Verlauf über zweieinhalb Pixel.

### Der Bildausschnitt

Er steht **fest** und wandert beim Schieben nicht mit — sonst wäre genau die
Verformung, um die es geht, nicht mehr zu sehen. Er kommt aber ganz von der
Zeitkarte: die Federkarte ist 1.274 × 1.302 Minuten groß, die Landkarte nur
715 × 956, und ein paar Enden von Nebenbahnen fahren so weit hinaus, dass
Deutschland in der Mitte saß wie eine Briefmarke auf einem Bogen.

Darum ist er **zugeschnitten**, und zwar so weit, wie die Landkarte es
zulässt: bis sie mit einem Saum von 8 Minuten genau hineinpasst. Der Faktor
ist nicht gesetzt, sondern gemessen — 1,29, also 985 × 1.006 Minuten. Der
Reglerstreifen kostet auch noch Höhe; nachgemessen bleibt gegenüber vorher
**+23 %** auf 1440 × 900, +21 % auf 1280 × 720, +24 % auf 1920 × 1080 und
+29 % hochkant auf dem Telefon, wo die Karte breitenbegrenzt ist und der
Zuschnitt voll durchkommt.

Bei `morph = 0` geht dabei garantiert nichts verloren. In der reinen Zeitkarte
fliegen **108 von 4.781 Bahnhöfen** aus dem Bild (2,3 %) — aber nur 0,9 %
aller Halte, Median 20 Halte am Tag gegen 42 im ganzen Netz. Es sind die
Bodenseerunde, die Rügener Bäderbahn, die Erzgebirgs- und Zittauer Schmalspur,
Sylt und Dagebüll, der Bayerische Wald, die Heidekrautbahn. Wer draußen liegt,
wird nicht gezeichnet: ein roter Punkt mit Namen allein im schwarzen Rand
sieht nicht nach „aus der Karte gefallen" aus, sondern nach einem Fehler.

## Schnee, und die Inseln im Meer

Über den am schlechtesten erreichbaren Gegenden liegt **Schnee** — die
obersten sechs der fünfunddreißig Farbbänder. Die Grenze ist nicht gesetzt,
sondern abgeleitet: sie liegt dort, wo die Leiter vom Wasserstand bis zum
99,5-Perzentil der Höhe **auf dem Land** ihre letzten sechs Bänder erreicht,
und steht in absoluten Minuten in der Legende unter der Karte. Bei der Hälfte
und Wasser auf 322 Minuten liegt sie bei 519 Minuten — in der Landkarte wie in
der Zeitkarte, denn das obere Ende wird über der unverzogenen Geografie
gerechnet und wandert beim Verziehen nicht mehr mit (siehe
[STAND.md](STAND.md)). Schnee haben dann 179 Bahnhöfe: der Zipfel um
Konstanz, der Bayerische Wald um Grafenau, die Heidekrautbahn bei Groß
Schönebeck, die Rügener Bäderbahn, Loßburg-Rodt im Schwarzwald — und einzelne
Haltepunkte mitten im Land, an denen zweimal am Tag ein Zug hält, etwa Demker
in der Altmark. Sylt und die Rügener
Bäderbahn sind in der Zeitkarte über den Rand hinaus.

Und je weiter der Regler in die Zeit läuft, desto mehr **Inseln** lösen sich
vom Land. Das ist kein Zeichenfehler: die Federkarte schleudert die
abgehängten Orte so weit hinaus, dass der verzogene Umriss ihnen nicht mehr
folgen kann — 585 von 4.781 Bahnhöfen liegen in der reinen Zeitkarte jenseits
der Küste, 108 davon sogar jenseits des Bildausschnitts. Ein Bahnhof gehört
aber immer auf Land, also bekommt jeder Ausgewanderte seine eigene **Scholle**:
eine Kreisscheibe mit hartem Rand und 11,5 Minuten Radius. Sie war eine
Glockenkurve mit weichem Saum und doppeltem Radius, und daraus wurde auf dem
Bildschirm ein ausgefranster Nebelfleck; wo mehrere Ausgewanderte dicht
beieinander liegen, laufen die Scheiben jetzt zu einem Archipel zusammen statt
zu einer Wolke. Was im Meer treibt und noch im Bild ist, ist beschriftet:
Freiburg Herdern, Kennelgarten in der Pfalz, Nistertal-Büdingen im
Westerwald, Dienheim am Rhein, Demker in der Altmark.

## Bauen

Keine npm-Abhängigkeiten, kein Bündler. Gebraucht werden `python3` mit
`numpy` und ein C-Übersetzer. Die Rohdaten liegen nicht im Repo; wie sie
hereinkommen, steht in [build/DATEN.md](build/DATEN.md).

```
cd bahn-zeitkarte
python3 build/01_netz.py      # Netz, Bahnhöfe, Spitzenstunde          (3 s)
python3 build/02_zeiten.py    # Reisezeitmatrix, 5.002² Paare         (15 s)
python3 build/03_lage.py      # Federmodell und Gelände             (4,5 min)
python3 build/04_menschen.py  # Bevölkerungsgewicht je Bahnhof        (40 s)
python3 build/05_seite.py     # data/karte.json, data/isochronen.json  (3 s)
```

Jeder Schritt schreibt nach `build/zwischen/` und zählt aus, was er getan hat.
Die beiden schweren Teile sind in C und laufen auf allen Kernen: die
Reisezeitmatrix braucht 13 Sekunden auf vier Kernen, das Federmodell fünf
Minuten.

## Ein Video aus der Seite

`build/film.mjs` macht aus der fertigen Seite ein hochkantes mp4 (1080 × 1920
für Reddit, dazu 1440 × 2560 ohne Bitratendeckel), für die Stellen, an denen
eine Webseite nicht hingeht. Der Inhalt ist der der Seite: sie wird geladen,
die Regler ausgeblendet, dann Bild für Bild weitergestellt. Das Werkzeug
braucht zwei npm-Pakete — die Regel „keine Abhängigkeiten" gilt für alles, was
*ausgeliefert* wird, und ein Filmskript wird es nicht:

```
cd build && npm install playwright-core ffmpeg-static
MESSEN=1 node film.mjs              # Bildzeit je Einstellung, schreibt nichts
BILDER=0,0.3,0.9 node film.mjs      # einzelne Standbilder zur Ansicht
KURZ=20 node film.mjs probe.mp4     # die ganze Kette in drei Minuten
UEBER=6 FEIN=0.20 node film.mjs film.mp4    # der Lauf, rund zwei Stunden

# und waehrend der laeuft: ein spielbares mp4 aus dem, was schon fertig ist
node zwischenstand.mjs .film-teile-<abdruck> stand.mp4
```

Das Drehbuch steht im Skript (`AKTE`), die Begründung der Einstellungen in
[STAND.md](STAND.md) — besonders die des Bitratendeckels, die einmal vier
Rechenläufe gekostet hat.
