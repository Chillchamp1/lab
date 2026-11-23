"""Schreibt je Szene eine eigene Seite raumklang/<adresse>/index.html (Adressen englisch, die Seite ist englisch) zum Teilen.

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
SZENEN = [('forest', 'wald'), ('sea', 'boot'), ('ruins', 'ruine'), ('elephants', 'elefanten'), ('sea-creature', 'ozean')]

VORLAGE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{titel} – soundscape for headphones</title>
<meta name="description" content="{text}">
<meta property="og:type" content="website">
<meta property="og:title" content="{titel} – soundscape for headphones">
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
  <p class="zurueck"><a href="../">← All soundscapes</a></p>
  <h1>{titel}</h1>
  <p class="unter">{text}</p>
  <div class="spieler gross" id="spieler"></div>
  <div class="knoepfe"><button id="teilen" type="button">Share</button><span id="teilen-info" aria-live="polite"></span></div>
  <div class="werte" id="werte"></div>
  <p class="hinweis" style="margin-top:18px"><b>How to listen:</b> headphones on (left and right the right way round), lie down, close your eyes.
  The scene loops endlessly without an audible seam.</p>
  <div id="mehr"></div>
</main>
<div id="start" hidden>
  <div class="karte">
    <button id="start-knopf" type="button" aria-label="Play">▶</button>
    <h2>{titel}</h2>
    <p>Put your headphones on and tap – your browser only starts sound after a tap.</p>
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
