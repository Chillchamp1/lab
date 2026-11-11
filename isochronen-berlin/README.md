# Mit Bahn und Rad ab Berlin Hauptbahnhof

→ **https://chillchamp1.github.io/lab/isochronen-berlin/**

Eine Isochronenkarte, die nicht in Ringen wächst, sondern **Straße für
Straße**. Start ist **Berlin Hauptbahnhof**, Dienstag, 8 Uhr, mit dem Fahrrad.
Man darf jeden Zug und jede Bahn nehmen, die das Rad mitnimmt, und nach dem
Aussteigen weiterradeln. Jede Straße erscheint in dem Moment, in dem sie zum
ersten Mal erreicht ist — bis fünf Stunden nach der Abfahrt.

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
des VBB), über einen Gleisgraphen aus OpenStreetMap geroutet.

**Die Bahnhöfe.** Ein Bahnhof **blitzt auf**, wenn man dort aussteigt und von
dort aus mit dem Rad als Erster Straßen erreicht — nicht jeder Halt, an dem ein
Zug vorbeikommt. Das sind **1.945 Ausstiegsbahnhöfe**.

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
erreichten Straße (Median über vier Abfahrten, siehe unten):

| nach | Fläche | zum Vergleich |
|---|---:|---|
| 1 h | **1.140 km²** | mehr als Berlin (891 km²) |
| 2 h | **5.317 km²** | fast das Anderthalbfache von Berlin samt Speckgürtel (3.779 km²) |
| 3 h | **20.879 km²** | etwa 70 % der Fläche Brandenburgs |
| 4 h | **40.350 km²** | mehr als Brandenburg und Berlin zusammen (30.546 km²) |
| 5 h | **67.539 km²** | knapp ein Fünftel Deutschlands |

Zeitauflösung **10 Sekunden**: die Daten sind 1.800 Zeitschritte, und in jedem
steht, welche Straßen neu dazukommen — zusammen **rund 5,5 Millionen
Linienzüge**, von denen die Webfassung 2,4 Millionen ausliefert (siehe unten).
Nach fünf Stunden reicht das Gebiet von 48,7° bis 54,8° Nord und von 7,8° bis
15,9° Ost.

## Bedienung

- **▶ / Leertaste** spielt ab, der **Zeitregler** springt an jeden Zeitpunkt.
  Drei Tempi: schnell, normal (75 Sekunden je 90 Kartenminuten), langsam.
- **Das Tempo passt sich an.** Bis etwa 1:20 läuft die Uhr gleichmäßig, danach
  so viel schneller, wie die Karte herauszoomt — höchstens vierfach. So bleibt
  die sichtbare Ausbreitung pro Sekunde ungefähr gleich, und die fünfte Stunde
  dauert nicht so lange wie die ganze Berliner Phase.
- **Kamera folgt**: der Ausschnitt fährt mit der Ausbreitung mit, samt der
  äußersten Züge, weich nachgeführt. Wer selbst zoomt oder schiebt, schaltet
  sie ab; daneben drei feste Ausschnitte — Umgebung, Berlin, Gesamtgebiet.
- **Straßenfarbe**: Verkehrsmittel oder Reisezeit.
- **Stadtzonen** ein- und ausblenden.
- Oben im Kasten die **erreichte Fläche** und ein Balken, **womit** die Straßen
  der letzten Minute erreicht wurden.
- Herausgezoomt zeigt die Karte nur die großen Straßen; beim Hineinzoomen
  kommen Verbindungsstraßen, Radwege und befestigte Wege dazu, nah dran alle
  Straßen.

## Annahmen und Grenzen

**Der Fahrplan.** Soll-Fahrplan vom **Dienstag, 10. November 2026**. Gerechnet
wird für die Abfahrten **08:00, 08:05, 08:10 und 08:15**, Wartezeit
eingerechnet; jede Straße bekommt den **Median** der vier Ankunftszeiten (das
Mittel aus der zweit- und drittfrühesten), damit nicht der Zufall einer
einzelnen Minute die Karte formt. Fahrplanfenster 07:55 bis 13:20.
Verspätungen, Ausfälle und Baustellen stehen nicht darin.

**Drei Fahrpläne zusammen.** Der VBB-Datensatz für Berlin und Brandenburg, der
Fernverkehr aus dem gtfs.de-Feed `fv_free` und der Regionalverkehr ganz
Deutschlands aus `rv_free`. Fahrten, die in zwei Feeds stehen, werden über
gemeinsame Halte erkannt und nur einmal gezählt; wo eine Regionalbahn über die
VBB-Grenze hinausfährt, bleibt man im selben Zug sitzen.

**Wo das Rad mit darf.**

- Im VBB gilt die Angabe `bikes_allowed` je Fahrt. Fehlt sie, gelten S-Bahn,
  U-Bahn, Regionalbahn, Tram und Fähre als radtauglich, **Busse nicht** (nur
  eine Handvoll Busfahrten erlaubt es ausdrücklich).
- **Fernzüge** werden als radtauglich angenommen. In der Praxis braucht man
  dort einen Stellplatz mit Reservierung, und nicht jeder ICE hat welche.
- **Regionalverkehr außerhalb des VBB** (gtfs.de `rv_free`) gilt ebenfalls als
  radtauglich, außer Schienenersatzverkehr und Fahrten, die es ausdrücklich
  ausschließen.

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
**innerhalb von 8 km** um die Bahnhöfe. Wer darüber hinaus radeln würde, kommt
in der Karte nicht an.

**Was gespeichert ist.** Gerechnet wird mit allen Straßen. Gespeichert sind
bis drei Stunden alle, danach nur noch das Hauptnetz — sonst würde die Datei
zu groß. Die Webfassung dünnt weiter aus, damit sie in einem normalen Browser
flüssig läuft: bis zwei Stunden alle Straßen, bis drei Stunden das Hauptnetz
mit Radwegen und befestigten Wegen, danach die großen Straßen.

**Die Gleise.** Wo der Fahrplan keinen Linienverlauf mitliefert, wird jeder
Abschnitt zwischen zwei Halten auf dem OSM-Gleisnetz geroutet. Gelingt das
nicht, bleibt es bei der Luftlinie.

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
