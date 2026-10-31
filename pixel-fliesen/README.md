# Pixel-Fliesen

Ein Bild einfügen, und die Seite zerlegt es in **neun 2×2-Fliesen**
(LEGO®-kompatibel, 3 × 3 Fliesen, ca. 47,8 × 47,8 mm), die man auf eine
Bauplatte steckt. Ausgabe ist eine mehrfarbige **3MF für Snapmaker Orca**
(Snapmaker U1, vier Werkzeugköpfe), dazu STL je Farbe und eine PNG-Vorlage.
Alles läuft im Browser; das Bild verlässt den Rechner nicht.

## Bedienung

1. Bild hineinziehen, einfügen (Strg+V) oder auswählen. Am besten ein großes
   Artwork als PNG mit transparentem Hintergrund; einfarbige Hintergründe
   werden freigestellt.
2. Die Seite sucht die Farbtöne selbst. Ein Farbfeld anklicken und auf das
   eigene Filament setzen macht die Farbe fest; danach wird neu zugeordnet.
3. Mit dem Pinsel lassen sich einzelne Stellen nachmalen (Strg+Z zurück).
4. 3MF herunterladen, in Snapmaker Orca öffnen, Bildseite liegt unten auf dem
   Bett. Schichthöhe 0,2 mm.

Die 3D-Vorschau lädt beim ersten Öffnen three.js (r128) von cdnjs.

## Wie die Farben gefunden werden

- **Konturen zuerst.** Was dunkel, eher grau und höchstens etwa 1,2 mm breit
  ist, gilt als Umriss. Breite dunkle Flächen (Schatten) und kräftig gefärbte
  dunkle Stellen bleiben normale Farbe. Die Schwelle ist ein Regler.
- **Farbton vor Helligkeit.** Im Lab-Farbraum zählt die Helligkeit nur halb,
  damit Licht, Schatten und Glanz beim selben Farbton bleiben.
- **Dominante Farbtöne.** Erst 16 feine Gruppen (k-means), dann werden die
  zwei ähnlichsten so lange zusammengelegt, bis so viele übrig sind wie
  Filamente. Kleine Flächen geben dabei etwas leichter nach, ein deutlich
  anderer Farbton wie rote Augen bleibt aber erhalten.

## Konturen als Graben

Statt eines eigenen schwarzen Filaments werden die Umrisse 0,2–0,6 mm tief in
die Bildseite eingelassen. Den Grabenboden druckt das dunkelste Filament (oder
ein gewähltes), der Schatten im Graben macht die Linie zusätzlich dunkel. So
bleiben alle vier Filamente für Flächenfarben. Im Druck mit der Bildseite nach
unten bleibt der Graben in den ersten Schichten frei und wird dann überbrückt.

## Geometrie

- 15,8 × 15,8 × 3,2 mm, Decke 1,2 mm, davon 0,6 mm Farbschicht (3 Schichten).
- Wand 1,2 mm, Mittelröhrchen Ø 6,51 / 4,8 mm.
- **Klemmrippen:** acht Rippen an der Innenwand, je zwei pro Noppe, ragen
  standardmäßig 0,1 mm über den Noppenrand. Ohne sie berühren die Wände die
  Noppen nicht (0,3 mm Luft) und die Fliese hält nur am Röhrchen, was im
  FDM-Druck zu locker ist. Der **Passungstest** erzeugt vier schlichte
  Fliesen mit +0,05 / +0,10 / +0,15 / +0,20 mm, erkennbar an 1–4 Punkten.
- Farbflächen entstehen aus einem 0,1-mm-Raster per Marching Squares,
  vereinfacht (Douglas-Peucker, 0,04 mm) und mit earcut trianguliert.
  Flecken unter der Düsenbreite werden vorher entfernt.

## 3MF

Aufbau wie von Snapmaker Orca 2.4 gespeichert: je Fliese eine Objektdatei in
`3D/Objects/`, Teile mit Filament-Zuordnung in
`Metadata/model_settings.config`. Geprüft ist, dass alle Teile geschlossene
Körper sind und die Farbteile jede Fliese lückenlos füllen.

## Stand

Nicht geprüft ist der Druck selbst: wie fest die Fliesen halten, wie dunkel
die Gräben wirken und ob Orca die Filamente beim Öffnen richtig zuordnet.

## Lizenz der eingebetteten Bibliothek

earcut 2.2.4 (ISC, © Mapbox) ist in `index.html` eingebettet.
