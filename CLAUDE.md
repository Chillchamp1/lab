# Hinweise für Claude

## Immer den Link mitliefern

Jedes Projekt hier ist eine Webseite, keine Bibliothek. Wenn eine Änderung
fertig ist, gehört der Link auf die veröffentlichte Seite in die Antwort —
nicht nur der Commit oder die Pull-Request-Nummer:

    https://chillchamp1.github.io/lab/<slug>/

Übersicht: https://chillchamp1.github.io/lab/

Dazu gehört die ehrliche Angabe, welcher Stand dort gerade steht. Solange
eine Änderung nur in einem offenen Pull Request liegt, zeigt die Seite noch
den alten Stand; das dann dazusagen. GitHub Pages braucht nach einem Merge
ein bis zwei Minuten.

## Sofort mergen

Fertige Änderungen kommen ohne Rückfrage nach `main`: Entwurf freigeben und
per Squash mergen, damit die Historie linear bleibt. Nicht auf eine Freigabe
warten — der Pull Request ist hier Protokoll, kein Tor.

`main` bewegt sich in diesem Repo oft. Vor dem Mergen also `origin/main`
einmischen; die Konflikte liegen praktisch immer in den drei Sammellisten
(`projects.json`, `.gitignore`, `README.md`), sind rein additiv, und die
README wird danach mit `node tools/readme.mjs` neu erzeugt statt von Hand
geflickt.

Danach: PR-Beobachtung und geplante Nachschauen abräumen, den Link nennen.

## Was dieses Repo ist

Sammel-Repo für kleine Web-Projekte, je ein Ordner mit `index.html`,
ausgeliefert über GitHub Pages. Die Regeln dafür — relative Pfade, alles
mitliefern, `.nojekyll` nicht löschen, neue Projekte in `projects.json`
eintragen und `node tools/readme.mjs` laufen lassen — stehen in der
[README](README.md). Keine Build-Pipeline, keine npm-Abhängigkeiten.
