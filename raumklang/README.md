# Raumklang

Binaurale Ambient-Klangszenen für Kopfhörer, gebaut aus echten Aufnahmen. Erste
Szene: liegend in einem knarzenden Ruderboot auf dem Meer.

## Aufbau

```
pipeline/hrtf.py            SOFA laden, diffusfeld-entzerren, stetig zwischen Richtungen interpolieren
pipeline/kern.py            Renderkern: bewegte Quelle → Schallweg → binaural (blockweise, mit Laufzeit)
pipeline/boot.py            das Boot als Raum: Schaukeln, Bordkante, Bordwände, Boden, Wasserspiegel
pipeline/material.py        Aufnahmen laden, entrauschen, in Einzelereignisse zerlegen
pipeline/material_holen.py  lädt alles aus quellen.json nach material/roh/
pipeline/szene.py           Szenenbeschreibung → Klanggruppen → Pegel → Mischung → MP3
szenen/boot.json            die Szene als Daten
quellen.json                jede Aufnahme mit Herkunft, Urheber und Lizenz
audio/                      Ergebnis: Mischung, eine Hörprobe je Klanggruppe, Bericht (boot.json)
```

Rendern (Python 3 mit `numpy scipy h5py pyloudnorm`, dazu `ffmpeg`):

```
python3 pipeline/material_holen.py
curl -o material/hrtf/subject_040.sofa https://sofacoustics.org/data/database/cipic/subject_040.sofa
python3 pipeline/szene.py szenen/boot.json --proben
```

`material/` wird nicht eingecheckt. Andere HRTF: `--hrtf pfad/zur/datei.sofa`;
andere Haltung: `--blick 90` (flach auf dem Rücken) bis `--blick 0` (aufrecht).

## Wie ein Klang zum Ohr kommt

Der Kopf liegt fest im Boot, die Ohren 25 cm unter der Bordkante. Jede Quelle
erreicht ihn auf mehreren Wegen; jeder Weg bekommt je Block von 11,6 ms eine
Weglänge, eine Einfallsrichtung im Kopfbezug und einen Frequenzgang:

- **direkt** – steht die Bordkante im Weg, wird der Schall über die Kante
  gebeugt (Maekawa). Er kommt dann aus Richtung der Kante und verliert Höhen.
  Deshalb klingt der Horizont im Boot gedämpft, eine Möwe über dem Boot nicht.
- **Bordwände und Boden** – Spiegelquellen an den Innenflächen, mit einem
  kurzen Streukern statt eines idealen Spiegels: glatte Wände ergäben einen
  hörbar hohlen Kammfilter, den ein Boot mit Spanten nicht hat.
- **Wasserspiegel** – das Spiegelbild hoher Quellen liegt unter der Kante und
  kommt nur gebeugt herein.
- **Rest-Nachhall** – sehr kurz und leise; ohne ihn sitzt der Klang im Kopf.

Die HRTF wird über ein Dreiecksnetz auf der Kugel interpoliert: Jede Richtung
mischt die drei Messrichtungen des umgebenden Dreiecks baryzentrisch, Laufzeit
und Klangfarbe getrennt. Die erste Fassung mischte die drei *nächsten*
Messrichtungen nach Abstand; wechselte dabei eine davon, sprang die
Laufzeitdifferenz um bis zu 65 µs (6–8°) – eine bewegte Möwe ruckelte. Die
Spiegelung auf dem Wasser wird ausgeblendet, sobald ihr Spiegelpunkt unter dem
Rumpf liegt, und die Gültigkeitsgrenzen aller Spiegelungen sind über 60 ms
verschliffen.

Die Laufzeit wird als gleitende Verzögerung gelesen, daraus ergibt sich der
Doppler-Effekt (bei 10–15 m/s rund ±0,5–0,75 Halbtöne, nachgemessen). Beim
Überflug liegt ein langer Ruf genau über dem nächsten Punkt, damit die Tonhöhe
innerhalb eines Rufs kippt. Nahe Quellen bekommen zusätzlich den Pegelunterschied zwischen
den Ohren aus dem Abstand zu jedem Ohr. Bootsfeste Quellen (Knarzen, Wasser am
Rumpf) stehen im Kopfbezug still, alles draußen wandert mit dem Schaukeln.

## Endlosschleife

Die Szene ist auf einer kreisförmigen Zeitachse gerechnet: Was über das Ende
hinausklingt (ein Ruf, ein Nachhall, eine Welle), läuft am Anfang weiter.
Schaukeln, Böen, das Atmen der Flächen und die Flugbahnen der Möwen sind
periodisch über die Szenendauer gebaut; eine kreisende Möwe fliegt eine ganze
Zahl von Runden. Durchlaufende Signale werden vorn und hinten um ein Stück aus
sich selbst verlängert und mit gleichstarken Rampen gewichtet, damit auch die
Blockverarbeitung an der Naht keine Delle hinterlässt. Es gibt keine Ein- und
Ausblendung. Die Hörproben der einzelnen Gruppen sind Ausschnitte, deren Ende
über drei Sekunden in den Anfang überblendet ist.

Die Seite spielt mit der Web-Audio-Schnittstelle: Die Datei wird dekodiert und
sample-genau wiederholt (ein `<audio loop>` setzt je nach Browser an der Naht
kurz aus). Der Bericht `audio/boot.json` enthält die Soll-Länge in
Abtastwerten; hängt ein Browser beim Dekodieren die Stille des MP3-Kodierers
an, schneidet die Seite darauf zurück.

Die Datei beginnt in der Mitte des ruhigsten 4-s-Fensters der Schleife (der
Kreis ist frei drehbar); so startet sie nicht mit einem Ereignis.

## Selbsttest

`python3 pipeline/selbsttest.py` läuft in Sekunden und prüft Fehler, die es schon
gab: Ereignis und Hallanteil an der richtigen Zeit (bis 17.11. landete der
Hallanteil aller Ereignisse bei 0 s und stapelte sich dort zu einem Knall),
Kreisspur und Kreisfaltung, stetige HRTF-Interpolation, periodische Bewegung.
Vor jedem vollen Rendern laufen lassen.

## Ereignisse schneiden

Wellen und Schwapps werden von Tal zu Tal der Hüllkurve geschnitten statt über
einen Schwellwert über dem Grundrauschen. In Brandungsaufnahmen ist das
Grundrauschen selbst laut; der Schwellwert schnitt deshalb mitten im Auslaufen
(Median −8 dB unter der Spitze) und blendete in unter einer Sekunde aus – das
klang abgerissen. Jetzt fällt ab der Spitze eine in dB gerade Abklingkurve auf
−40 dB, und der eigene Auslauf der Aufnahme bleibt darunter erhalten.
Ereignisse mit zu kurzem Auslauf, am Aufnahmeende noch lauten Schnitten oder
flachem Rauschen statt Schlag werden verworfen.

## Segel und Böen

Eine gemeinsame Böenkurve (langsames Grundwehen plus einzelne Böen von 3 bis
8 s, im Mittel alle 22 s) steuert den Wind und das Segel. Das Segel hängt
schlaff am Mast vor den Knien; in einer Böe füllt es sich mit einem weichen
Schlag, das Achterliek knattert, und das Tuch weht etwas zur Seite. Für Stoff
gab es keine freie Aufnahme: Das Rauschen ist echter Wind (CC0), Füllen,
Knattern und Knistern sind nachgebildet.

## Material

Keine Synthese, bis auf die Schlag-Hüllkurve des Fahrtwinds (siehe Grenzen). Quellen:

- Wikimedia Commons, gemeinfrei, CC0 oder CC BY (Möwen).
- [ESC-50](https://github.com/karolpiczak/ESC-50): Fünf-Sekunden-Ausschnitte aus
  Freesound-Aufnahmen. Der Datensatz als Ganzes ist CC BY-NC; hier werden nur
  Clips benutzt, deren Original laut `LICENSE` des Datensatzes CC0 oder CC BY
  ist (Wellen, Wind, Holz).

Die Seite listet genau die Aufnahmen, die in der gerenderten Fassung stecken.

## Grenzen

- Die HRTF reicht nur bis −50° Elevation; darunter wird über große Dreiecke
  zwischen den Rändern der Messung gemischt, das ist dort nur grob.
- Fünf-Sekunden-Clips: Flächenklänge sind aus vielen kurzen Stücken genäht.
- Möwen: rund 30 verschiedene Rufe aus fünf Aufnahmen, auf 5–10 kHz bandbegrenzt.
- Segel: Notlösung (siehe oben), bis eine echte Aufnahme eines schlaffen Segels
  oder einer Flagge im Wind da ist. Der Generator `segel` nimmt sie dann als
  `sammlung`.
- Flügelschläge: Es gab keine saubere freie Aufnahme. Der Fahrtwind beim
  Überflug ist echtes Windrauschen (CC0), die Schlag-Hüllkurve (3 bis 6 Schläge
  mit etwa 3 Hz, dann Gleiten) ist vorgegeben. Abschalten: `fluegel` aus der
  Gruppe `ueberflug` in `szenen/boot.json` entfernen.
- Geprüft ist messtechnisch (Pegel, Spektren, Links-rechts-Verlauf), nicht nach
  Gehör – das Urteil fällt am Kopfhörer.
