# Stand

Stand: 10. September 2026.

## Blockiert — und woran

Die Arbeitsumgebung lässt nur `raw.githubusercontent.com`, die Paketregister
(npm, PyPI, conda, Maven, RubyGems, crates.io) und die Websuche durch. Jede in
der Aufgabe genannte Fachquelle ist gesperrt; die Einzelbefunde stehen in
[QUELLEN.md](QUELLEN.md). Historische Bevölkerungszahlen sind über die offenen
Wege nachweislich nicht zu bekommen — gesucht wurde, gefunden wurden nur
Geometrien und Gegenwartsdaten.

**Damit steht und fällt alles an der Freischaltung dieser Hosts.**

Nach Nutzen sortiert:

| Rang | Host | Wofür |
|---|---|---|
| 1 | `leopard.tu-braunschweig.de` | GPOP — neun Zeitpunkte 1871–2019, Gemeinde- und Kreisebene, bereits auf heutigem Gebietsstand |
| 2 | `daten.gdz.bkg.bund.de`, `gdz.bkg.bund.de`, `sg.geodatenzentrum.de` | VG2500 und VG250, Geometrie und Zuordnung |
| 3 | `www.destatis.de`, `www-genesis.destatis.de` | GV-ISys, massgeblicher Kreisstand |
| 4 | `www.regionalstatistik.de` | Regionaldatenbank ab 1995, Zensus 2011 und 2022 |
| 5 | `www.statistik-berlin-brandenburg.de`, `download.statistik-berlin-brandenburg.de` | Pilot: historisches Gemeindeverzeichnis Brandenburg 1875–2005 |
| 6 | `www.ifo.de`, `search.gesis.org`, `dbk.gesis.org`, `data.gesis.org` | iPEHD — Preussen 1816–1901 auf Kreisebene |
| 7 | `www.mpidr.de` | historische Kreisgrenzen für die Flächeninterpolation |
| 8 | `www.bbsr.bund.de`, `www.inkar.de` | Umsteigeschlüssel für Gebietsänderungen ab 1990 |
| 9 | `www.gemeindeverzeichnis.de`, `www.verwaltungsgeschichte.de`, `hov.isgv.de` | Gemeindedaten 1900/1910, Verwaltungsgeschichte, Sachsen |
| 10 | `de.wikipedia.org`, `upload.wikimedia.org` | Nachschlagen bei den geteilten Städten an der Oder-Neisse-Grenze |
| 11 | `www.statistischebibliothek.de`, `doi.org` | Digitalisate, DOI-Auflösung |

Rang 1 und 2 allein genügen für eine erste vollständige Karte über neun
Zeitpunkte. Alles ab Rang 3 füllt die übrigen Stichjahre auf.

## Fertig

- **Kreisgeometrie auf heutigem Gebietsstand.** 400 Kreise, aus einem
  BKG-VG250-Auszug (Stand 1.1.2019) gelesen, Eisenach in den Wartburgkreis
  aufgelöst. Flächensumme 356 699 km², das ist die amtliche Landfläche.
- **Knotenmodell.** 45 208 Knoten, 661 Ringe; gleiche Koordinaten
  verschweisst, damit gemeinsame Grenzen beim Verziehen gemeinsam bleiben.
- **Verschmelzen alter Gebietsstände.** Kantenauslöschung mit
  Winkelverfolgung, damit aus zwei Kreisen wirklich ein Umriss wird und keine
  Schlaufen abschnüren. Prüfung an Eisenach + Wartburgkreis: 104,3 + 1 263,8 =
  1 368,0 km², nach dem Auflösen 1 368,0 km².
- **Generalisierung.** Knotenweise Visvalingam, am eigenen Kreis gemessen,
  damit die kleinen Städte ihre Form behalten. 45 208 → 10 000 Knoten bei
  0,74 % Flächenabweichung im Median, alle 661 Ringe erhalten.
- **Kartogramm-Bausteine** aus `wahlkreise-2025/build` übernommen:
  flächentreue Projektion, Rasterung, Diffusion nach Gastner und Newman,
  Koordinatenkodierung.

## Offen

- Bevölkerungsdaten: **nichts** vorhanden, siehe oben.
- Zeitreihen-Kartogramm (ein Zustand je Zeitpunkt, gemeinsamer Massstab).
- `karte.html` beziehungsweise `index.html` als Webapp.
- `data/bevoelkerung_kreise_long.csv`.
- `METHODIK.md`.
- Pilot Berlin + Brandenburg und dessen Plausibilitätsprüfung gegen
  publizierte Landessummen.

## Aufwandsschätzung

Erst belastbar, wenn feststeht, welche Quellen erreichbar sind — die Schätzung
hängt vollständig daran, ob GPOP vorliegt (dann Methode A für neun Zeitpunkte)
oder ob jede Zelle einzeln aufgebaut werden muss. Sie wird hier nachgetragen,
sobald die Freischaltung steht.
