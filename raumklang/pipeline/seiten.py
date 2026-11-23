"""Schreibt je Szene eine eigene Seite raumklang/<adresse>/index.html zum Teilen.

Titel und Beschreibung stehen fest im HTML (nicht erst per Skript), damit Messenger und
soziale Netze beim Teilen eine Vorschau zeigen. Den Rest (Spieler, Drehbuch, Bausteine) baut
szene.js aus audio/<name>.json. Nach jedem Rendern einer Szene laufen lassen:

    python3 pipeline/seiten.py
"""
import html, json
from pathlib import Path

WURZEL = Path(__file__).resolve().parent.parent
BASIS = 'https://chillchamp1.github.io/lab/raumklang/'

# Adresse auf der Seite → Name der Renderdatei in audio/ (Reihenfolge = Übersicht)
SZENEN = [('wald', 'wald'), ('meer', 'boot'), ('ruine', 'ruine'), ('elefanten', 'elefanten'), ('meerestier', 'ozean')]

VORLAGE = """<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{titel} – Klangszene für Kopfhörer</title>
<meta name="description" content="{text}">
<meta property="og:type" content="website">
<meta property="og:title" content="{titel} – Klangszene für Kopfhörer">
<meta property="og:description" content="{text}">
<meta property="og:url" content="{url}">
<meta property="og:audio" content="{audio}">
<meta property="og:audio:type" content="audio/mpeg">
<meta name="twitter:card" content="summary">
<link rel="stylesheet" href="../stil.css">
<link rel="preload" href="../audio/{name}.json" as="fetch" crossorigin>
</head>
<body data-szene="{name}">
<main>
  <p class="zurueck"><a href="../">← Alle Klangszenen</a></p>
  <h1>{titel}</h1>
  <p class="unter">{text}</p>
  <div class="spieler gross" id="spieler"></div>
  <div class="knoepfe"><button id="teilen" type="button">Teilen</button><span id="teilen-info" aria-live="polite"></span></div>
  <div class="werte" id="werte"></div>
  <p class="hinweis" style="margin-top:18px"><b>So hören:</b> Kopfhörer auf (links/rechts richtig herum), hinlegen, Augen zu.
  Die Szene läuft in Endlosschleife ohne hörbare Naht.</p>
  <div id="mehr"></div>
</main>
<div id="start" hidden>
  <div class="karte">
    <button id="start-knopf" type="button" aria-label="Abspielen">▶</button>
    <h2>{titel}</h2>
    <p>Kopfhörer auf und tippen – dein Browser startet Ton erst nach einem Tipp.</p>
  </div>
</div>
<script type="module" src="../szene.js"></script>
</body>
</html>
"""


def main():
    for adresse, name in SZENEN:
        bericht = WURZEL / 'audio' / f'{name}.json'
        if not bericht.exists():
            continue
        b = json.loads(bericht.read_text())
        ziel = WURZEL / adresse / 'index.html'
        ziel.parent.mkdir(exist_ok=True)
        ziel.write_text(VORLAGE.format(titel=html.escape(b.get('titel', name)), text=html.escape(b.get('text', '')),
                                       url=BASIS + adresse + '/', audio=BASIS + f'audio/{name}.mp3', name=name))
        print(ziel.relative_to(WURZEL))


if __name__ == '__main__':
    main()
