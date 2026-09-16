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

## 3. Verfahren

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

## 4. Was nicht verwendet wurde, und warum nicht

- **OpenStreetMap über Overpass** wäre die erste Wahl für ein Verzeichnis der
  Bahnhöfe gewesen (`railway=station|halt`, etwa 5.400 in Deutschland) und
  hätte die Trennung von Eisenbahn und Straßenbahn in 1.2 unnötig gemacht.
  Der Netzausgang gibt sie nicht her.
- **Einwohnerzahlen** würden die Erreichbarkeit gewichten — „mittlere
  Reisezeit zu allen Menschen" statt „zu allen Bahnhöfen" ist die bessere
  Größe, weil sie einen Haltepunkt mit dreißig Einwohnern nicht so zählt wie
  Köln. Die Zahlen liegen im Nachbarprojekt
  [bevoelkerung-kreise](../bevoelkerung-kreise/) auf Kreisebene, und sie
  einzuhängen ist der offensichtliche nächste Schritt; siehe
  [STAND.md](STAND.md).
- **Preise und Umstiegszahl** stehen nicht im Datensatz und gehören auch nicht
  in eine Karte, die eine Sache zeigt.
