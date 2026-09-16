# Quellen

Stand: 16. September 2026. Jede Zeile ist selbst geprüft — abgerufen und
nachgezählt, nicht aus dem Gedächtnis notiert.

## Der Befund vorweg

Dieses Projekt hat **eine** Datenquelle, und sie liegt auf GitHub. Das ist
keine Vorliebe, sondern die Lage: aus der Arbeitsumgebung dieses Repos
antwortet der Netzausgang auf `overpass-api.de` mit `403 CONNECT tunnel
failed`. Damit war ein amtliches Verzeichnis der deutschen Bahnhöfe nicht zu
bekommen, und die Trennung von Eisenbahn und Straßenbahn musste aus dem
Fahrplan selbst kommen (siehe [METHODIK.md](METHODIK.md), 1.1 und 1.2).

| Wirt | für | Stand |
|---|---|---|
| `github.com/Chillchamp1/github.io` | Fahrplantag und Landesgrenzen | **geladen**, 8,8 MB + 39 kB |
| dieses Repo, `bevoelkerung-kreise/` | Kreisbevölkerung und Kreisgeometrie | **vorhanden**, 1,2 MB + 347 kB |
| `overpass-api.de` | Verzeichnis der Bahnhöfe (OpenStreetMap) | **gesperrt**, 403 am 16.09.2026 |

## 1. Der Fahrplan

**`data/trains.json`** aus
[Chillchamp1/github.io](https://github.com/Chillchamp1/github.io)
(MIT-Lizenz, derselbe Urheber wie dieses Repo), 8,8 MB.

Die Datei ist ein Tagesauszug des offenen Fahrplandatensatzes von
**[DELFI e. V.](https://www.delfi.de/)**, der Durchgängigen Elektronischen
Fahrgastinformation — dem gemeinsamen Datensatz der Länder und
Verkehrsverbünde, veröffentlicht als GTFS-Gesamtdatensatz Deutschland. Der
Auszug ist mit `build/build_gtfs.py` jenes Repos gebaut und enthält:

| | |
|---|---|
| Fahrplantag | **Mittwoch, 13. Mai 2026** |
| Meldepunkte | 7.552 |
| Fahrten | 27.757 |
| Halteereignisse | 318.693 |
| Kategorien | ICE/TGV/RJ 800 · IC/EC/FLX 493 · RE/RB/MEX 26.410 · NJ/EN 54 |
| bereits herausgefiltert | S-Bahn (`route_type` 109), U-Bahn, Straßenbahn, Bus, Schienenersatzverkehr |

Was daraus wird und was dabei noch herausfällt, steht in
[METHODIK.md](METHODIK.md), Abschnitt 1.

**Was dieser Auszug nicht ist**: ein Mittel über viele Mittwoche. Es ist ein
Tag. Der 13. Mai 2026 ist der Tag vor Christi Himmelfahrt (Donnerstag, 14.
Mai) — der Regionalfahrplan ist der eines normalen Mittwochs, im abendlichen
Fernverkehr kann ein Brückentag ein paar Züge mehr bedeuten. Für die Rechnung
ab 06:36 ist das ohne Belang.

**Und es ist der Soll-Fahrplan**, nicht der gefahrene. Verspätungen, Ausfälle
und Baustellen stehen nicht darin. Eine Erreichbarkeitskarte aus Ist-Daten
sähe anders aus, und wohl nicht schöner.

## 2. Umriss und Ländergrenzen

**`data/germany.json`** aus demselben Repo, 39 kB: der Außenumriss in 5 Ringen
mit 428 Punkten und die sechzehn Landesflächen in 21 Ringen mit 2.100 Punkten,
unprojiziert in Länge und Breite.

Verwendet werden die **Landesflächen**, nicht der Umriss: mit 2.100 statt 428
Punkten sind sie fünfmal feiner, und mit dem groben Umriss fielen Lindau-Insel,
Kehl, Gronau und Rheinfelden aus Deutschland heraus (siehe METHODIK 1.4).

Beide sind vereinfachte Geometrien. Was das kostet, ist an einer Stelle sogar
sichtbar: die Bodden hinter Rügen und das Wattenmeer bei Husum erscheinen als
schwarze Flecken in der Karte, weil dort wirklich Wasser ist und der Umriss
sie aussticht. Das ist richtig, sieht aber auf den ersten Blick nach einem
Fehler aus.

## 3. Die Menschen

Zwei Dateien aus dem Nachbarprojekt [bevoelkerung-kreise](../bevoelkerung-kreise/)
in diesem Repo — dasselbe Repo, derselbe Urheber, und die Quellen dahinter sind
dort dokumentiert:

| Datei | was daraus wird |
|---|---|
| `data/bevoelkerung_kreise_long.csv` | die Kreisbevölkerung zum 31.12.2024, 400 Kreise, 83,6 Mio |
| `index.html` | die Kreisgeometrie, 400 Kreise mit 12.000 Knoten, aus der Nutzlast der Seite entpackt |

Die Bevölkerungszahlen sind letztlich die **German Local Population Database
(GPOP), Version 1.0** — Roesel, Felix (2022): *The German Local Population
Database (GPOP), 1871 to 2019*, Jahrbücher für Nationalökonomie und Statistik,
DOI 10.1515/jbnst-2022-0046, CC BY 4.0 — fortgeschrieben auf den Stand
31.12.2024 nach dem Gemeindeverzeichnis des Statistischen Bundesamtes. Die
Geometrie ist der **BKG-Datensatz VG2500** (Verwaltungsgebiete 1:2 500 000),
Datenlizenz Deutschland – Namensnennung 2.0, © GeoBasis-DE / BKG, in einer
Lambert-azimutal flächentreuen Projektion (ETRS89-LAEA).

Beides wird hier **nicht neu geholt**, sondern aus dem Nachbarprojekt
übernommen — und weil die Projektion flächentreu ist, lässt sich die
Übernahme gegen die amtlichen Kreisflächen prüfen, statt ihr zu glauben. Die
Probe steht in [METHODIK.md](METHODIK.md) 4.2: Median 0,71 % Abweichung,
Gesamtfläche 357.677 km² wie amtlich, und neun Städte mit bekannter Lage
liegen alle neun im Ring ihres eigenen Kreises.

## 4. Verfahren

Nicht Daten, aber ebenso zitierpflichtig:

- **Connection Scan Algorithm** — Julian Dibbelt, Thomas Pajor, Ben Strasser,
  Dorothea Wagner: *Intriguingly Simple and Fast Transit Routing*, SEA 2013.
  Das Verfahren hinter `02_zeiten.c`.
- **SMACOF / Stress-Majorisierung** — Jan de Leeuw: *Applications of convex
  analysis to multidimensional scaling*, 1977. Das Verfahren hinter der
  flachen Federkarte.
- **Adam** — Diederik P. Kingma, Jimmy Ba: *Adam: A Method for Stochastic
  Optimization*, ICLR 2015. Nachführung im Geländeteil.
- **Lambert-Kegelprojektion**, konform, Normalparallelen 48,67° und 53,67° N.

## 5. Was nicht verwendet wurde, und warum nicht

- **OpenStreetMap über Overpass** wäre die erste Wahl für ein Verzeichnis der
  Bahnhöfe gewesen (`railway=station|halt`, etwa 5.400 in Deutschland) und
  hätte die Trennung von Eisenbahn und Straßenbahn in 1.2 unnötig gemacht.
  Der Netzausgang gibt sie nicht her.
- **Bevölkerung auf Gemeinde- oder Rasterebene** wäre für die Einzugsgebiete
  das Richtige: Kreisebene nimmt die Bevölkerung innerhalb eines Kreises als
  gleichmäßig verteilt an, und in einem Landkreis mit einer Stadt und viel
  Wald ist sie das nicht. Der Zensus-100-m-Raster wäre die Antwort, liegt
  hier aber nicht; das Nachbarprojekt hat eine Gemeindedatei (`gpop_muni.csv`)
  in seiner Quellenliste, braucht sie selbst nicht und liefert sie deshalb
  nicht mit.
- **Preise und Umstiegszahl** stehen nicht im Datensatz und gehören auch nicht
  in eine Karte, die eine Sache zeigt.
