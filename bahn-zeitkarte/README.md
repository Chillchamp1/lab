# Deutschland, gezeichnet von seinen Fahrplänen

→ **https://chillchamp1.github.io/lab/bahn-zeitkarte/**

Auf einer Landkarte ist der Maßstab der Kilometer. Hier ist er die Minute:
**4.781 Bahnhöfe** des deutschen Fern- und Regionalverkehrs, jeder so weit von
jedem anderen gezeichnet, wie die Bahn zwischen beiden braucht. Zwischen je
zwei Bahnhöfen hängt eine Feder, deren Ruhelänge die Reisezeit ist, und die
Karte ist die Lage, in der alle Federn zusammen am wenigsten ziehen.

Darüber liegt ein Relief, und es misst nicht Entfernung, sondern
**Reichweite**: wie lange es dauert, bis von hier **ein Zehntel
Deutschlands** — 8,4 Millionen Menschen — mit dem Zug zu erreichen ist. Im
Ruhrgebiet sind das 81 Minuten, im Mittel 217, und über zehn Stunden dort, wo
zweimal am Tag ein Zug hält. Wer schnell Menschen erreicht, liegt tief und
läuft unter Wasser; über den abgehängten Gegenden liegt Schnee.

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

## Und welche Höhe dann — drei Kandidaten

Die Frage dahinter: **was fühlt sich als angebunden an?** Drei gemessene
Größen, alle in Minuten, alle gerechnet und gegeneinander gehalten:

| Relief-Kandidat | Spanne | Median |
|---|---:|---:|
| **A** mittlere Reisezeit zu allen Bahnhöfen | 260–718 | 380 |
| **B** mittlere Reisezeit zu allen Menschen | 241–712 | 364 |
| **C** bis ein Zehntel Deutschlands erreichbar ist | **81–630** | **217** |

**A war die erste Fassung, und A ist falsch gewichtet.** Ein Haltepunkt mit
dreißig Einwohnern zählt darin wie Köln, und weil die Haltepunkte in der
Fläche liegen, sieht gut angebunden aus, wer viele kleine Halte um sich hat.

**B behebt das — und ändert die Karte fast nicht.** A und B korrelieren mit
**r = 0,973**. Das war das überraschendste Ergebnis dieses Projekts, und es
hat einen einfachen Grund: ein Mittelwert über ein großes Land wird von der
fernen Hälfte bestimmt. Er misst, wie weit es bis zum anderen Ende ist — also
Geografie. München liegt darin so schlecht wie Ulm, und München fühlt sich
nicht so an.

**C ist die andere Frage.** Nicht „wie weit ist das Mittel", sondern „wie viel
ist in Reichweite": wie lange dauert es, bis von hier 8,4 Millionen Menschen
erreichbar sind. Ein Zehntel, weil das keine einzelne Stadt allein schafft —
wer es erreichen will, muss über die eigene Agglomeration hinaus, und genau
das misst das Netz. Mit A korreliert C nur noch mit r = 0,860: eine andere
Karte.

Am tiefsten liegt das **Ruhrgebiet** — Düsseldorf 81 Minuten, Duisburg 82,
Essen 84, Dortmund 90, Bochum 92 —, dann Köln 97, Frankfurt 115, Stuttgart
130, München 142, Berlin 144, Nürnberg 146, Hamburg 158. Gut angebunden sind
sie alle, aber jede dieser Städte muss weiter greifen als das Ruhrgebiet, weil
um sie herum weniger wohnt. Am höchsten, unter Schnee, liegen die Stichbahnen
um Freiburg (630 Minuten), Gottmadingen und Reichenau am Hochrhein, die
Bäderbahn auf Rügen und die Heidekrautbahn bei Groß Schönebeck.

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

- **Landkarte → Zeitkarte** verzieht die Karte von der Geografie in die
  Reisezeit. Umriss und Ländergrenzen laufen mit — verschoben mit dem
  Verschiebungsfeld der Bahnhöfe selbst, damit die Kieler Förde die Kieler
  Förde bleibt, auch wenn Kiel wegläuft. Der Bildausschnitt steht dabei fest
  und umfasst beide Lagen: die Zeitkarte ist **1.274 × 1.302 Minuten** groß,
  die Landkarte nur 715 × 956, und dass die Karte beim Schieben aufgeht statt
  sich nur zu verbiegen, ist selbst die Aussage. Ein Ausschnitt, der
  mitwandert, hätte sie verschluckt.
- **Wasserstand** hebt den Meeresspiegel, beschriftet in absoluten Minuten:
  bei 181 liegt alles unter Wasser, von dem aus ein Zehntel des Landes in
  weniger als drei Stunden erreichbar ist. Die Farbleiter rückt mit, die
  Schneegrenze also auch.
- **Isochronen** zeichnet die Linien gleicher Reisezeit um einen von 54
  vorgerechneten Knoten, anzuklicken auf der Karte. Das ist die Probe aufs
  Ganze: auf der Landkarte sind das ausgefranste Sterne, auf der Zeitkarte
  müssen daraus Kreise werden.
- Zeiger über einen Punkt zeigt Name, Erreichbarkeit und Zahl der Halte.

## Schnee, und die Inseln im Meer

Über den am schlechtesten erreichbaren Gegenden liegt **Schnee** — die
obersten sechs der fünfunddreißig Farbbänder. Die Grenze ist nicht gesetzt,
sondern abgeleitet: sie liegt dort, wo die Leiter vom Wasserstand bis zum
höchsten Wert **auf dem Land** ihre letzten sechs Bänder erreicht, und steht
in absoluten Minuten in der Tafel. Auf der Landkarte mit Wasser bei 181
Minuten liegt sie bei 351, und Schnee haben dann Sylt, die Rügener Bäderbahn,
der Zipfel um Konstanz, der Bayerische Wald bei Passau, die Heidekrautbahn bei
Groß Schönebeck und einzelne Haltepunkte, an denen zweimal am Tag ein Zug
hält.

Und je weiter der Regler in die Zeit läuft, desto mehr **Inseln** lösen sich
vom Land. Das ist kein Zeichenfehler: die Federkarte schleudert die
abgehängten Orte so weit hinaus, dass der verzogene Umriss ihnen nicht mehr
folgen kann — 537 von 4.781 Bahnhöfen liegen in der reinen Zeitkarte jenseits
der Küste. Ein Bahnhof gehört aber immer auf Land, also bekommt jeder
Ausgewanderte seine eigene Scholle. Was dann im Meer treibt, ist beschriftet:
Granitz Jagdschloß und Göhren auf Rügen, Groß Schönebeck an der
Heidekrautbahn, Freiburg Zähringen, Gottmadingen und Reichenau am
Bodensee.

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
