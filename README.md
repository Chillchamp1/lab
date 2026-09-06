# lab

Kleine Web-Projekte, je ein Ordner mit `index.html`, ausgeliefert über GitHub Pages.

**Übersicht:** https://chillchamp1.github.io/lab/

## Projekte

<!-- PROJEKTE:START -->

- **[Stärkste Partei, Bundestagswahl 2025](https://chillchamp1.github.io/lab/wahlkarte-2025/)** — 431 Gebiete nach Zweitstimmen eingefärbt, mit Regler zwischen Landkarte und flächentreuem Kartogramm. · [Doku](wahlkarte-2025/README.md)
- **[299 Wahlkreise, nach Menschen gewichtet](https://chillchamp1.github.io/lab/wahlkreise-2025/)** — Dieselbe Wahl auf Wahlkreisebene. Weil Wahlkreise nach Bevölkerung geschnitten werden, gleicht das Kartogramm die Gebiete fast an. · [Doku](wahlkreise-2025/README.md)
- **[Vier Jahre später, die Hälfte gewechselt](https://chillchamp1.github.io/lab/wandel-2021-2025/)** — Bundestagswahl 2021 und 2025 im selben Bild: in 149 von 299 Wahlkreisen führt eine andere Partei. · [Doku](wandel-2021-2025/README.md)
- **[Die Wahl 2024, nach Menschen gewichtet](https://chillchamp1.github.io/lab/usa-wahl-2024/)** — US-Präsidentschaftswahl: 3109 Countys, verzogen von der Fläche zur Einwohnerzahl. Trump gewann 2661 Countys, Harris 448 — in denen die Hälfte des Landes lebt. · [Doku](usa-wahl-2024/README.md)

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
