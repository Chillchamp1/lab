# Raumklang

Binaurale Ambient-Klangszenen für Kopfhörer, gebaut aus echten Aufnahmen. Erste
Szene: liegend in einem knarzenden Ruderboot auf dem Meer.

## Aufbau

```
pipeline/hrtf.py            SOFA laden, diffusfeld-entzerren, zwischen Richtungen interpolieren
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

Die Laufzeit wird als gleitende Verzögerung gelesen, daraus ergibt sich der
Doppler-Effekt. Nahe Quellen bekommen zusätzlich den Pegelunterschied zwischen
den Ohren aus dem Abstand zu jedem Ohr. Bootsfeste Quellen (Knarzen, Wasser am
Rumpf) stehen im Kopfbezug still, alles draußen wandert mit dem Schaukeln.

## Material

Keine Synthese. Quellen:

- Wikimedia Commons, gemeinfrei, CC0 oder CC BY (Möwen).
- [ESC-50](https://github.com/karolpiczak/ESC-50): Fünf-Sekunden-Ausschnitte aus
  Freesound-Aufnahmen. Der Datensatz als Ganzes ist CC BY-NC; hier werden nur
  Clips benutzt, deren Original laut `LICENSE` des Datensatzes CC0 oder CC BY
  ist (Wellen, Wind, Holz).

Die Seite listet genau die Aufnahmen, die in der gerenderten Fassung stecken.

## Grenzen

- Die HRTF reicht nur bis −50° Elevation; tiefere Richtungen fallen auf den
  Rand der Messung.
- Fünf-Sekunden-Clips: Flächenklänge sind aus vielen kurzen Stücken genäht.
- Möwen: rund 30 verschiedene Rufe aus fünf Aufnahmen, auf 5–10 kHz bandbegrenzt.
  Flügelschläge fehlen, weil es dafür keine passende freie Aufnahme gab.
- Geprüft ist messtechnisch (Pegel, Spektren, Links-rechts-Verlauf), nicht nach
  Gehör – das Urteil fällt am Kopfhörer.
