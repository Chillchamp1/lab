# lab

Sammel-Repo für kleine Web-Projekte. Jedes Projekt ist ein Unterordner mit einer
`index.html` und wird direkt über GitHub Pages ausgeliefert.

**Live:** https://chillchamp1.github.io/lab/

## Neues Projekt hinzufügen

1. Ordner anlegen, Namen klein und mit Bindestrichen (`mein-projekt`) —
   der Ordnername ist die URL.
2. `index.html` hineinlegen, samt allem was dazugehört (CSS, JS, Daten).
3. Eintrag in `projects.json` ergänzen:

   ```json
   { "slug": "mein-projekt", "titel": "Mein Projekt", "beschreibung": "Ein Satz dazu.", "datum": "2026-09" }
   ```

4. Committen und pushen. Die Seite ist nach ein bis zwei Minuten unter
   `https://chillchamp1.github.io/lab/mein-projekt/` erreichbar.

Die Startseite liest `projects.json` und listet alles automatisch auf —
der Ordner allein reicht technisch schon, der Eintrag macht ihn nur auffindbar.

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
