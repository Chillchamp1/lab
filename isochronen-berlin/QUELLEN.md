# Quellen

Stand: 11. November 2026. Was die Seite ausliefert, ist aus diesen Quellen
abgeleitet; die Rohdaten selbst liegen nicht im Repo. Wie sie hereinkommen,
steht in [build/README.md](build/README.md).

| Quelle | wofür | Lizenz |
|---|---|---|
| OpenStreetMap, über Geofabrik | Straßen- und Wegenetz, Gleise, Gebäude, Grenzen | ODbL 1.0 |
| OpenFreeMap | gerenderte Grundkarte | Daten ODbL, Bedingungen laut openfreemap.org |
| VBB-Fahrplan (GTFS) | Fahrplan Berlin-Brandenburg, Linienverläufe, Stationswege | CC BY 4.0 |
| gtfs.de `fv_free`, `rv_free` | Fern- und Regionalverkehr Deutschland | Daten von DELFI e. V., Lizenz laut gtfs.de |
| Valhalla auf dem FOSSGIS-Server | Radzeiten der ersten 60 Minuten | Dienst: Nutzungsbedingungen des Betreibers; Daten ODbL |
| LEP HR 2019 | Abgrenzung des Berliner Umlands | amtlicher Plan, nur die Gemeindeliste übernommen |
| Leaflet | Kartenanzeige in der Seite | BSD-2-Clause |
| MapLibre GL JS | Rendern der Grundkarte (nur beim Bauen) | BSD-3-Clause |

## 1. OpenStreetMap

**© OpenStreetMap-Mitwirkende**, Open Database License (ODbL) 1.0 —
<https://www.openstreetmap.org/copyright>.

Geladen als Länder-Extrakte von **Geofabrik**
(<https://download.geofabrik.de/europe/germany/>): die sechzehn Bundesländer,
dazu die polnischen Woiwodschaften Westpommern (`zachodniopomorskie`) und
Lebus (`lubuskie`) für die Strecken über die Oder. Jede Datei wird gegen ihre
MD5-Summe geprüft, verarbeitet und wieder gelöscht; eine ganze
Deutschland-Datei wird nicht gebraucht. Daraus:

- **Straßen und Wege** für das Rad: Wohnstraßen, Verbindungsstraßen, Radwege,
  Feld- und Waldwege (ohne `tracktype=grade5`), Fuß- und Reitwege nur mit
  Radfreigabe, ohne Privatwege; die großen Straßen (Autobahn bis
  Kreisstraße) für das Hauptnetz.
- **Gleise** (`railway=rail|light_rail|subway|narrow_gauge`) für den
  Gleisgraphen, auf dem Zugabschnitte ohne Linienverlauf geroutet werden.
- **Gebäudeumrisse und Flächennutzung** um Berlin für die Innenstadt-Zone.
- **Verwaltungsgrenzen** für Berlin, die Umland-Gemeinden und Brandenburg, und
  die Grenzrelation Deutschlands (Relation 51477) für die Außengrenze.

Zu Beginn kamen Teile des Wegenetzes über die **Overpass API**
(<https://overpass-api.de/> und Spiegel); heute stammt alles, was neu
gerechnet wird, aus den Geofabrik-Extrakten.

## 2. Die Grundkarte: OpenFreeMap

Die dunkle Karte unter den Straßen ist der Stil `dark` von **OpenFreeMap**
(<https://openfreemap.org/>), Vektorkacheln im OpenMapTiles-Schema aus
OpenStreetMap-Daten. Sie wurde **einmal** mit MapLibre GL JS im Browser
gerendert, mit gedämpften Farben und deutschen Namen, in doppelter
Pixeldichte, getrennt in Hintergrund und Beschriftung, und liegt als
WebP-Kacheln in `tiles/`. Die Seite lädt zur Laufzeit nichts von OpenFreeMap.
Namensnennung auf der Karte: © OpenStreetMap · OpenFreeMap.

## 3. Der Fahrplan

**VBB — Verkehrsverbund Berlin-Brandenburg**, GTFS-Datensatz, Lizenz
**CC BY 4.0** — <https://www.vbb.de/vbb-services/api-open-data/datensaetze/>.
Verwendet: Fahrten, Halte, Kalender, Linienverläufe (`shapes.txt`), die
Angabe `bikes_allowed` je Fahrt, Mindestumstiegszeiten (`transfers.txt`) und
die Wege innerhalb der Stationen (`pathways.txt`, `levels.txt`).

**gtfs.de**, zwei Feeds mit Daten von **DELFI e. V.**
(<https://www.delfi.de/>), dem gemeinsamen Fahrplandatensatz der Länder und
Verkehrsverbünde:

- `fv_free` — Fernverkehr (ICE, IC, EC und weitere),
  <https://download.gtfs.de/germany/fv_free/latest.zip>
- `rv_free` — Regionalverkehr ganz Deutschlands,
  <https://download.gtfs.de/germany/rv_free/latest.zip>

Beide nennen in ihrer `attributions.txt` DELFI e. V. und GTFS.de als
Herausgeber. Lizenz laut gtfs.de (<https://gtfs.de/>).

Gerechnet wird mit dem **Soll-Fahrplan vom Dienstag, 10. November 2026**,
Fenster 07:55–13:20. Fahrten, die in zwei Feeds stehen, sind nur einmal
gezählt (siehe README).

## 4. Routing

**Valhalla** (<https://github.com/valhalla/valhalla>, MIT-Lizenz), abgefragt
auf dem öffentlichen Server der **FOSSGIS e. V.**,
<https://valhalla1.openstreetmap.de/>: je eine Expansion über 60 Minuten ab
Berlin Hauptbahnhof — das Fahrrad (Trekkingrad, 17 km/h) für die Zeiten, dazu
Auto, Fuß und ein schnelles Radprofil nur als Gerüst des Straßennetzes. Alles danach — der Weg weiter
draußen, der Weiterweg nach jedem Ausstieg — ist eine eigene Rechnung auf dem
OSM-Netz, kalibriert an diesen Valhalla-Zeiten.

Der Fahrplan läuft über einen eigenen **Connection Scan** — Julian Dibbelt,
Thomas Pajor, Ben Strasser, Dorothea Wagner: *Intriguingly Simple and Fast
Transit Routing*, SEA 2013.

## 5. Die Stadtzonen

- **Innenstadt** — aus den OSM-Gebäudeumrissen: die zusammenhängend dicht
  bebaute Stadt, in der Gebäude im Umkreis von 350 m mindestens 22 % der
  Fläche bedecken; Tiergarten und Tempelhofer Feld eingeschlossen, schmale
  Ausläufer entfernt.
- **Stadtgrenze Berlin** und **Brandenburg** — OSM-Verwaltungsgrenzen.
- **Speckgürtel** — das *Berliner Umland* nach dem **Landesentwicklungsplan
  Hauptstadtregion Berlin-Brandenburg (LEP HR)**, in Kraft seit 1. Juli 2019,
  Ziel 1.1; herausgegeben von der **Gemeinsamen Landesplanung
  Berlin-Brandenburg** (<https://gl.berlin-brandenburg.de/>). Aus dem Plan
  stammt nur die Liste — Potsdam und 50 Städte und Gemeinden —, die Flächen
  selbst sind die OSM-Gemeindegrenzen.

## 6. Software

- **Leaflet 1.9.4** (<https://leafletjs.com/>, BSD-2-Clause) — in die Seite
  eingebettet.
- **MapLibre GL JS 4.7.1** (<https://maplibre.org/>, BSD-3-Clause) — nur zum
  Rendern der Grundkarte beim Bauen.
- Beim Bauen außerdem Python mit pyosmium, NumPy, SciPy, pandas, Shapely,
  pyproj, contourpy und Pillow; für die Videos ffmpeg mit libx264.
