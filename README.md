# lab

Kleine Web-Projekte, je ein Ordner mit `index.html`, ausgeliefert über GitHub Pages.

**Übersicht:** https://chillchamp1.github.io/lab/

## Projekte

<!-- PROJEKTE:START -->

- **[Stärkste Partei, Bundestagswahl 2025](https://chillchamp1.github.io/lab/wahlkarte-2025/)** — 431 Gebiete nach Zweitstimmen eingefärbt, mit Regler zwischen Landkarte und flächentreuem Kartogramm. · [Doku](wahlkarte-2025/README.md)
- **[299 Wahlkreise, nach Menschen gewichtet](https://chillchamp1.github.io/lab/wahlkreise-2025/)** — Dieselbe Wahl auf Wahlkreisebene. Weil Wahlkreise nach Bevölkerung geschnitten werden, gleicht das Kartogramm die Gebiete fast an. · [Doku](wahlkreise-2025/README.md)
- **[Vier Jahre später, die Hälfte gewechselt](https://chillchamp1.github.io/lab/wandel-2021-2025/)** — Bundestagswahl 2021 und 2025 im selben Bild: in 149 von 299 Wahlkreisen führt eine andere Partei. · [Doku](wandel-2021-2025/README.md)
- **[Die Wahl 2024, nach Stimmen gewichtet](https://chillchamp1.github.io/lab/usa-wahl-2024/)** — US-Präsidentschaftswahl: 3114 Gebiete samt Alaska und Hawaii, verzogen von der Fläche zur Wählerschaft — der Farbdurchschnitt der Karte trifft dabei fast das Landesergebnis. · [Doku](usa-wahl-2024/README.md)
- **[164 to 1 for a new world map](https://chillchamp1.github.io/lab/weltkarte-projektionen/)** — On 4 September 2026 the UN voted, on Togo's motion, for equal-area world maps. A slider fades from Mercator to Equal Earth or winds the map up into a globe, colouring every country by how much image area it gets too much or too little. In English. · [Doku](weltkarte-projektionen/README.md)
- **[312 zu 226, entschieden in 3 Staaten](https://chillchamp1.github.io/lab/usa-wahlleute-2024/)** — Dieselbe Wahl nach Wahlleuten statt nach Stimmen. Drei Staaten mit zusammen 44 Wahlleuten hätten das Ergebnis gekippt. · [Doku](usa-wahlleute-2024/README.md)
- **[Deutschland, gezeichnet von seinen Menschen](https://chillchamp1.github.io/lab/bevoelkerung-kreise/)** — Alle 400 heutigen Kreise über 150 Jahre, jeder Zeitpunkt auf heutigem Gebietsstand, als Geländekarte: der Boden steht fest, die Höhe ist die Bevölkerung — und weil ein Mensch immer dasselbe Volumen Erde einnimmt, steigt das Land von 1871 bis 2024 buchstäblich aus dem Wasser: erst eine Inselgruppe, am Ende ein Gebirge mit Schnee auf Berlin und München. Beschriftet ist, wer im gezeigten Jahr zu den größten gehört — 1871 also Karlsruhe, Kassel und Erfurt, heute Bielefeld, Mannheim und Kiel. In English. · [Doku](bevoelkerung-kreise/README.md)
- **[America, drawn by its people](https://chillchamp1.github.io/lab/bevoelkerung-counties/)** — Dieselbe Geländekarte für 3.108 US-Countys: dreizehn Volkszählungen von 1900 bis 2020, von 75,5 auf 329,3 Millionen Menschen. · [Doku](bevoelkerung-counties/README.md)
- **[Europa unter dem Eis](https://chillchamp1.github.io/lab/eiszeit-europa/)** — Eine animierte Reliefkarte Europas durch die letzte Eiszeit, von 26 000 Jahren vor heute bis in die Gegenwart. Das Gebirgsrelief kommt aus einem 15-Bogensekunden-Höhenmodell, die Bewegung darunter aus ICE-6G_C: die Kruste sinkt unter dem Eis ein und steigt danach wieder, der Meeresspiegel fällt um 135 Meter und legt Doggerland trocken. Darüber die drei Kuppen des eurasischen Eisschildes — Fennoskandien, Barents-Kara und Britannien, jede mit ihrer Höhe zur gezeigten Zeit — und das veröffentlichte Unsicherheitsband ihres Randes aus DATED-1, das breit wird, wo die Datierung dünn ist. In English. · [Doku](eiszeit-europa/README.md)
- **[Deutschland, gezeichnet von seinen Fahrplänen](https://chillchamp1.github.io/lab/bahn-zeitkarte/)** — 4.781 Bahnhöfe des Fern- und Regionalverkehrs, nicht nach Kilometern gezeichnet, sondern nach der Reisezeit mit dem Zug: zwischen je zwei Bahnhöfen hängt eine Feder mit der Reisezeit als Ruhelänge, und die Karte ist die Lage, in der alle Federn zusammen am wenigsten ziehen — ein Kilometer Luftlinie ist dabei 1,14 Minuten wert. Das Relief darüber misst nicht Entfernung, sondern Reichweite: wie lange es dauert, bis von hier ein Anteil Deutschlands mit dem Zug erreichbar ist. Dieser Anteil ist ein Regler, und er schiebt zwischen den beiden Polen, zwischen denen jede Erreichbarkeitskarte steht — bei einem Fünfzigstel zählt nur die Nachbarschaft und jeder Ballungsraum wird ein eigener See, bei neun Zehnteln muss man bis in die Ecken und es gewinnen Fulda und Kassel in der Mitte. Voreingestellt ist die Hälfte — 41,8 Millionen Menschen, das obere Ende des brauchbaren Fensters: unterhalb eines Siebtels schöpft jede Region noch aus sich selbst, denn das Ruhrgebiet erreicht in 90 Minuten 11,6 Prozent des Landes. Die Seite selbst ist auf Englisch. Die Karte lässt sich mit Rad oder zwei Fingern zoomen: beim Hineinzoomen erscheinen die Namen der kleineren Bahnhöfe, beim Herauszoomen die Enden, die der Bildausschnitt hinausgeworfen hat — Sylt, die Rügener Bäderbahn, der Zipfel um Singen. Fahrplan ist ein Mittwoch aus dem offenen DELFI-Datensatz, Abfahrt in der dichtesten Stunde des Tages, die gemessen wurde und 06:36 bis 07:36 liegt. · [Doku](bahn-zeitkarte/README.md)

<!-- PROJEKTE:ENDE -->

Diese Liste wird aus `projects.json` erzeugt — nicht von Hand bearbeiten,
sondern `node tools/readme.mjs` laufen lassen.

## Neues Projekt hinzufügen

1. Ordner anlegen, Namen klein und mit Bindestrichen (`mein-projekt`) —
   der Ordnername ist die URL.
2. `index.html` hineinlegen, samt allem was dazugehört (CSS, JS, Daten).
3. Eintrag in `projects.json` ergänzen:

   ```json
   { "slug": "mein-projekt", "titel": "Mein Projekt", "beschreibung": "Ein Satz dazu.", "datum": "2026-09" }
   ```

4. `node tools/readme.mjs` — schreibt die Liste oben neu.
5. Committen und pushen. Die Seite ist nach ein bis zwei Minuten unter
   `https://chillchamp1.github.io/lab/mein-projekt/` erreichbar.

Startseite und README lesen beide aus `projects.json`. Der Ordner allein reicht
technisch schon — der Eintrag macht ihn nur auffindbar.

## Wann ein Projekt eine eigene README bekommt

`projects.json` trägt den Einzeiler, mehr nicht. Eine eigene `README.md` im
Projektordner lohnt sich, sobald es etwas zu erklären gibt, das der Satz nicht
fasst: Datenquellen und deren Stand, Methodik, bekannte Einschränkungen, wie das
Ding gebaut wurde. Bei [wahlkarte-2025](wahlkarte-2025/README.md) ist das der
Fall — Gebietsauflösung und Kartogramm-Verfahren gehören dokumentiert.

Was **nicht** in eine Projekt-README gehört: eine Wiederholung von Titel und
Beschreibung. Doppelte Pflege ist der Grund, warum solche Listen verrotten.
Der Generator verlinkt eine vorhandene Projekt-README automatisch mit.

## Regeln, die sich bewährt haben

- **Relative Pfade.** `data/foo.json`, nie `/data/foo.json` — absolute Pfade
  brechen, sobald etwas in einem Unterordner liegt.
- **Alles mitliefern.** Keine Abhängigkeit auf Dateien außerhalb des eigenen
  Ordners, sonst lässt sich ein Projekt später nicht mehr herauslösen.
- **`.nojekyll` nicht löschen.** Ohne die Datei ignoriert GitHub Pages jeden
  Ordner, der mit `_` beginnt.
- **Groß gewordene Projekte ausziehen lassen.** Sobald ein Projekt eine
  Build-Pipeline, große Binärdaten oder eine eigene Domain braucht, gehört es
  in ein eigenes Repo — hier soll Kleinkram liegen, nicht alles.
