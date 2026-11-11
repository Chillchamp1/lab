# Mit Bahn und Rad ab Berlin Hauptbahnhof

→ **https://chillchamp1.github.io/lab/isochronen-berlin/**

Eine Isochronenkarte, die nicht in Ringen wächst, sondern **Straße für
Straße**. Start ist **Berlin Hauptbahnhof** an einem Dienstagmorgen, mit dem
Fahrrad; für jeden Ort zählt die schnellste Verbindung mit Abfahrt zwischen 7
und 9 Uhr. Man darf jeden Zug und jede Bahn nehmen, die das Rad mitnimmt, und
nach dem Aussteigen weiterradeln — auch über die Grenzen nach Polen und
Tschechien. Jede Straße erscheint in dem Moment, in dem sie zum ersten Mal
erreicht ist — bis fünf Stunden nach der Abfahrt.

> Die Seite ist **auf Englisch**, mit einem Umschalter auf Deutsch (DE/EN oben
> im Kasten, die Wahl wird gemerkt). Diese Dokumente — README, Quellen,
> Bauanleitung — bleiben deutsch.

Videos: siehe Releases

Die Videos sind die Animation der Seite als MP4, einmal **quer (1920 × 1080)**
und einmal **hochkant (1080 × 1920)**. Sie liegen nicht im Repo, sondern als
Downloads an den Releases.

## Was man sieht

**Die Straßen.** Jede Straße bekommt die Farbe des **höchstrangigen
Verkehrsmittels**, das auf dem Weg dorthin benutzt wurde — nicht des letzten.
Wer mit dem ICE nach Leipzig fährt und dort in die S-Bahn steigt, färbt die
Straßen um seinen Ausstieg in der Farbe des Fernzugs. Die Rangfolge ist
Fernzug → Regionalbahn → S-Bahn → U-Bahn → Tram → Fähre; Straßen, die man
direkt mit dem Rad praktisch genauso schnell erreicht wie mit irgendeinem Zug,
sind „Rad ab Start". Umschaltbar auf eine Färbung nach **Reisezeit**.

**Die Züge.** Ein leuchtender Punkt ist ein Zug unterwegs; hinter ihm bleibt
die gefahrene Strecke als blasse Linie stehen. Hervorgehoben sind die **Züge an
der Spitze der Ausbreitung** — die, die gerade Neuland erschließen; ihr Ring
zeigt das Verkehrsmittel. Die Linien folgen den Gleisen: aus den Linienverläufen
des VBB-Fahrplans, und wo die fehlen (Fernverkehr, Regionalverkehr außerhalb
des VBB, Polen und Tschechien), über einen Gleisgraphen aus OpenStreetMap
geroutet.

**Die Bahnhöfe.** Ein Bahnhof **blitzt auf**, wenn man dort aussteigt und von
dort aus mit dem Rad als Erster Straßen erreicht — nicht jeder Halt, an dem ein
Zug vorbeikommt. Das sind **2.770 Ausstiegsbahnhöfe**.

**Die erschlossene Fläche** ist warm getönt: ein Raster aus 400-m-Zellen mit
erreichter Straße, Lücken bis etwa 800 m geschlossen. Was ringsum von
erreichten Straßen eingeschlossen ist — Flugfeld Tegel, Flughafen, Seen, Wälder und
Parks ohne Wege —, zählt mit. Schmale Ausläufer entlang einzelner Straßen
bleiben außen vor. Die Tönung ist nur Darstellung; die km²-Zahl zählt nur
Zellen mit Straße.

**Die Stadtzonen.** Drei Umrisse geben Maßstab:

- **Innenstadt** — die zusammenhängend dicht bebaute Stadt: Gebäude bedecken im
  Umkreis von 350 m mindestens 22 % der Fläche, aus den Gebäudeumrissen von
  OpenStreetMap; Tiergarten und Tempelhofer Feld eingeschlossen, 104 km².
- **Stadtgrenze** — Berlin, 891 km².
- **Speckgürtel** — das *Berliner Umland* nach dem Landesentwicklungsplan
  Hauptstadtregion (LEP HR 2019, Ziel 1.1): Potsdam und 50 Städte und
  Gemeinden, 2.888 km².

Dazu die **Landesgrenze Brandenburgs** und die **deutsche Außengrenze** mit den
Namen der Nachbarländer — am Ende reicht die Karte über beide hinaus. Eine Zone pulsiert kurz, wenn die Ausbreitung sie erreicht.

## In Zahlen

Erreichte Fläche, gezählt als 250-m-Rasterzellen mit mindestens einer
erreichten Straße (schnellste Verbindung mit Abfahrt zwischen 7 und 9 Uhr,
siehe unten):

| nach | Fläche | zum Vergleich |
|---|---:|---|
| 1 h | **1.700 km²** | fast doppelt so viel wie Berlin (891 km²) |
| 2 h | **10.180 km²** | mehr als das Zweieinhalbfache von Berlin samt Speckgürtel (3.779 km²) |
| 3 h | **29.474 km²** | fast so viel wie Brandenburg und Berlin zusammen (30.546 km²) |
| 4 h | **57.837 km²** | fast das Doppelte von Brandenburg und Berlin zusammen |
| 5 h | **94.724 km²** | mehr als ein Viertel der Fläche Deutschlands (rund 357.600 km²) |

Zeitauflösung **10 Sekunden**: die Daten sind 1.800 Zeitschritte, und in jedem
steht, welche Straßen neu dazukommen — zusammen **rund 7,6 Millionen
Linienzüge**, von denen die Webfassung 3,5 Millionen ausliefert (38 MB, siehe
unten). Nach fünf Stunden reicht das Gebiet von 48,1° bis 54,8° Nord und von
7,1° bis 18,7° Ost.

Einige Ziele: **München Hbf** nach 4:51, **Poznań** nach 3:12, **Wrocław** nach
etwa 4:56, **Děčín** nach 3:58, **Toruń** nach 4:55. **Prag** erreicht die Karte
nicht: an diesem Dienstag steht in den Fahrplandaten im Abfahrtsfenster kein
direkter Fernzug Berlin–Praha.

## Bedienung

- **▶ / Leertaste** spielt ab, der **Zeitregler** springt an jeden Zeitpunkt.
  Drei Tempi: schnell, normal (75 Sekunden je 90 Kartenminuten), langsam.
- **Das Tempo passt sich an.** Bis etwa 1:20 läuft die Uhr gleichmäßig, danach
  so viel schneller, wie die Karte herauszoomt — höchstens vierfach. So bleibt
  die sichtbare Ausbreitung pro Sekunde ungefähr gleich, und die fünfte Stunde
  dauert nicht so lange wie die ganze Berliner Phase.
- **Kamera folgt**: der Ausschnitt fährt mit der Ausbreitung mit, samt der
  äußersten Züge, weich nachgeführt. Dabei zoomt sie höchstens bis Zoomstufe 7
  heraus (etwa 750 m pro Pixel), damit die Radgebiete um die Bahnhöfe als
  Flächen erkennbar bleiben; die äußersten Orte, etwa München, dürfen am Ende
  aus dem Bild laufen. Wer selbst zoomt oder schiebt, schaltet sie ab; daneben
  drei feste Ausschnitte — Umgebung, Berlin, Gesamtgebiet.
- **Straßenfarbe**: Verkehrsmittel oder Reisezeit.
- **Stadtzonen** ein- und ausblenden.
- Oben im Kasten die **erreichte Fläche** und ein Balken, **womit** die Straßen
  der letzten Minute erreicht wurden.
- Herausgezoomt zeigt die Karte nur die großen Straßen; beim Hineinzoomen
  kommen Verbindungsstraßen, Radwege und befestigte Wege dazu, nah dran alle
  Straßen.

## Annahmen und Grenzen

**Der Fahrplan.** Soll-Fahrplan vom **Dienstag, 10. November 2026**. Für jeden
Ort zählt die **schnellste Verbindung** mit Abfahrt am Hauptbahnhof zwischen
**07:00 und 09:00 Uhr**, geprüft alle 5 Minuten (25 Abfahrten). Die Reisezeit
zählt ab dieser Abfahrt; Warten am Start zählt also nicht mit. Je Bahnsteig
bleibt die beste Reisezeit über alle Abfahrten, samt der Fahrt, die sie
erreicht; von diesen Bestzeiten aus rechnet dann ein einziger Rad-Dijkstra
weiter. So hängt das Bild nicht vom Zufall der Startminute ab.
Fahrplanfenster 06:55 bis 14:30. Verspätungen, Ausfälle und Baustellen stehen
nicht darin.

**Fünf Fahrpläne zusammen.** Der VBB-Datensatz für Berlin und Brandenburg, der
Fernverkehr aus dem gtfs.de-Feed `fv_free`, der Regionalverkehr ganz
Deutschlands aus `rv_free`, dazu die **polnische Bahn** (GTFS „polish_trains“
von Mikołaj Kuranowski, Daten von PKP PLK und den Bahnbetreibern) und die
**tschechische Bahn** (der CZPTT-Fahrplan der Správa železnic, vom Projekt
Oběhy mit JrUtil zu GTFS gemacht). Fahrten, die in zwei Feeds stehen, werden
über gemeinsame Halte erkannt und nur einmal gezählt. Wo ein Zug über eine
Grenze fährt, bleibt man im selben Zug sitzen: über die VBB-Grenze hinaus
ohnehin, nach Polen und Tschechien, indem die deutsche Fahrt im polnischen
oder tschechischen Feed unter ihrer Fahrt-ID weitergeführt wird. Regionalzüge,
die der deutsche Feed an Grenzpunkten („(Gr)“) in zwei Fahrten teilt, werden
wieder zu einer zusammengesetzt.

**Wo das Rad mit darf.**

- Im VBB gilt die Angabe `bikes_allowed` je Fahrt. Fehlt sie, gelten S-Bahn,
  U-Bahn, Regionalbahn, Tram und Fähre als radtauglich, **Busse nicht** (nur
  eine Handvoll Busfahrten erlaubt es ausdrücklich).
- **Fernzüge** werden als radtauglich angenommen. In der Praxis braucht man
  dort einen Stellplatz mit Reservierung, und nicht jeder ICE hat welche.
- **Regionalverkehr außerhalb des VBB** (gtfs.de `rv_free`) gilt ebenfalls als
  radtauglich, außer Schienenersatzverkehr und Fahrten, die es ausdrücklich
  ausschließen.
- **In Polen und Tschechien** gilt die Angabe je Fahrt, wo der Feed sie hat.
  Der polnische Schnellzug **EIP** nimmt kein Rad mit, Ersatzbusse (ZKA, NAD)
  nie; die übrigen Fernzüge gelten wie in Deutschland als radtauglich.

**Das Rad.** Ein Trekkingrad mit **17 km/h**, Wald- und Feldwege erlaubt. Die
ersten **60 Minuten** ab dem Hauptbahnhof kommen aus der Routing-Maschine
Valhalla (auf OpenStreetMap); darüber hinaus und nach jedem Ausstieg rechnet
eine eigene Fortsetzung auf dem OSM-Straßennetz, deren Tempo an den
Valhalla-Zeiten kalibriert ist.

**Im Bahnhof.** Die Wege zwischen Straße und Bahnsteig kommen aus den
GTFS-Pathways des VBB: Rad schieben mit etwa 1 m/s, auf Treppen tragen, Aufzug
60 Sekunden extra. Umsteigen heißt aussteigen, zum anderen Bahnsteig, wieder
einsteigen — am selben Bahnsteig eine Minute.

**Das Straßennetz draußen.** Um Berlin herum liegt das ganze Netz vor. Weiter
draußen werden Straßen nur um die Bahnhöfe herum geladen, an denen man
ankommt: in den ersten drei Stunden die radtauglichen Wege in dem Umkreis, den
die Restzeit hergibt (höchstens 12 km); im äußeren Ring bis fünf Stunden
Wohn- und Verbindungsstraßen, Radwege und befestigte Feld- und Waldwege
**innerhalb von 8 km** um die Bahnhöfe. Das gilt in Polen und Tschechien
ebenso. Wer darüber hinaus radeln würde, kommt in der Karte nicht an.

**Was gespeichert ist.** Gerechnet wird mit allen Straßen. Gespeichert sind
bis drei Stunden alle, danach nur noch das Hauptnetz — sonst würde die Datei
zu groß. Die Webfassung dünnt weiter aus, damit sie in einem normalen Browser
flüssig läuft: bis zwei Stunden alle Straßen, bis drei Stunden das Hauptnetz
mit Radwegen und befestigten Wegen, danach die großen Straßen.

**Die Gleise.** Wo der Fahrplan keinen Linienverlauf mitliefert, wird jeder
Abschnitt zwischen zwei Halten auf dem OSM-Gleisnetz geroutet, das jetzt auch
die Strecken in Polen und Tschechien enthält. Gelingt das nicht, bleibt es bei
der Luftlinie.

**Die Karte darunter** ist ein dunkler Stil von OpenFreeMap, einmal gerendert
und als Kacheln mitgeliefert — die Seite lädt keine Kartendienste nach.
Kartendaten © OpenStreetMap-Mitwirkende (ODbL).

## Quellen und Bauen

Alle Datenquellen mit Lizenzen stehen in [QUELLEN.md](QUELLEN.md). Die
Skripte, mit denen die Daten entstanden sind, liegen in [build/](build/) —
samt Reihenfolge, Laufzeiten und dem, was man dafür herunterladen muss, in
[build/README.md](build/README.md). Rohdaten, Zwischenstände und die
gerenderten Kacheln der Grundkarte liegen nicht im Repo, nur das Ergebnis:
`index.html`, `data/streets.json` und `tiles/`.
