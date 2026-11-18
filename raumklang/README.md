# Raumklang

Binaurale Ambient-Klangszenen für Kopfhörer, gebaut aus echten Aufnahmen:
liegend in einem knarzenden Ruderboot auf dem Meer (`szenen/boot.json`) und
angelehnt an einen Baumstamm in einem Dinosaurierwald im Herbstregen
(`szenen/wald.json`).

## Aufbau

```
pipeline/hrtf.py            SOFA laden, diffusfeld-entzerren, stetig zwischen Richtungen interpolieren
pipeline/kern.py            Renderkern: bewegte Quelle → Schallweg → binaural (blockweise, mit Laufzeit)
pipeline/boot.py            das Boot als Raum: Schaukeln, Bordkante, Bordwände, Boden, Wasserspiegel
pipeline/wald.py            der Wald als Raum: Waldboden, Stamm im Rücken, Blätterdach, Zusatzdämpfung des Waldes
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

Wo Wikimedia oder Freesound den Download sperren (Claude-Cloud-Umgebung), lädt der
Workflow „Raumklang-Material holen“ (`.github/workflows/raumklang-material.yml`) die
Dateien auf einem GitHub-Runner und legt sie auf den Zweig `raumklang-material`.
Starten mit den gewünschten ids aus `quellen.json`, danach:

```
git fetch origin raumklang-material && git archive FETCH_HEAD | tar -x -C material/roh
```

Für Freesound braucht der Workflow das Repo-Secret `FREESOUND_API_KEY`.

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

## Der Dinosaurierwald

Der Hörer sitzt am Boden, halb liegend an einen Stamm gelehnt, Blick 55° schräg
ins Blätterdach – dieselbe Kopfhaltung wie beim Liegen, damit die Szene zur
echten Hörhaltung passt. Schallwege: direkt (mit einer Zusatzdämpfung des Waldes
von 0,1 dB/m bei 3 kHz ab 3 m, für Quellen über dem Blätterdach zusätzlich das
Laub), gespiegelt am nassen Laubboden (schluckt die Höhen) und am Stamm im
Rücken; Nachhall T60 1,0 s tief / 0,45 s hoch.

Saurier gibt es nicht als Aufnahme. Ihre Laute sind echte Tierlaute, langsamer
und tiefer abgespielt (`tempo_faktor`): Kühe, Bullen und Kraniche als ferne
Rufe, Schweine-Schnauben und ruhiges Schlafatmen beim Schnuppern, fressende
Schweine und ein fressender Grizzly (Yellowstone, gemeinfrei) beim Kauen,
Schritte auf Waldboden, Kies und Laub als Tritte, nasser Schnee als Matsch,
Knackser aus Feueraufnahmen als brechende Äste. Generatoren: `vorbeigang`
(Bahn in 15–35 m mit Tritten, Matsch, Knacken, Rascheln), `besuch`
(heranlaufen, äsen – abzupfen, kauen –, Kopf bis 0,6–0,9 m an den Hörer,
schnuppern, weggehen), `musik` (ganz leise synthetische Akkordfläche,
periodisch, nicht räumlich gerendert).

Zweite Runde nach Benjamins Urteil („die Saurier sind noch zu subtil“): Waldvögel
(ESC-50-Waldaufnahmen, zerlegt, in den Bäumen ringsum), Regen auf großen
Blättern direkt über dem Hörer (Aufnahmen von Regen auf Zeltplane und
Kunststoffdach), ein Bach statt des Blubberns, schwerere Tritte (Klopfen an eine
schwere Holztür auf 35 % verlangsamt – daraus wird ein tiefer Stampfer, 71 % der
Energie unter 100 Hz), brechende Äste (Knarren, Krachen, herabfallendes Laub,
Aufschlag). Dazu Rufe, bei denen man denken soll „so könnte ein Dinosaurier
geklungen haben“:

- **Gröhlen über dem Tal** (`gebruell`): Bullen, auf 38 % verlangsamt, in 350–650 m;
  die Echos sind Spiegelquellen an den Talhängen in anderen Richtungen und
  150–1800 m weiter weg – Verzögerung und Dämpfung ergeben sich aus dem Weg.
  Die Walddämpfung gilt nur für die letzten 80 m; darüber läuft der Schall über
  die Kronen.
- **Kammrufe**: Rufe von Kranich und Kühen, tief gelegt und durch eine
  Röhrenresonanz geschickt (`roehre`: schmale Resonanzen bei Vielfachen von
  38–55 Hz) – so färbt der hohle Schädelkamm eines Entenschnabelsauriers wie
  Parasaurolophus den Ruf zu einem hohlen, posaunenartigen Ton.
- **Wummern**: kurze Schweinegrunzer, auf 30 % verlangsamt, durch eine kurze,
  stark gedämpfte Röhre (26–34 Hz), als Folge von drei bis sechs Stößen – das
  Rufen mit geschlossenem Maul, wie es Strauße, Emus und Krokodile können und
  wie es für viele Dinosaurier vermutet wird (Riede u. a. 2016).

## HRTF-Auswahltest

`hrtf-test/` ist der Hörtest, mit dem die HRTF ausgewählt wurde: 48 Rauschstöße
aus 8 Richtungen mit 6 Kunstohren (MIT-KEMAR und 5 CIPIC-Köpfe, diffusfeld-
entzerrt, mit frühen Reflexionen und leisem Nachhall), danach je HRTF ein Kreis
um den Kopf. Die HRIRs liegen in `hrtf-test/hrtf.json`. Das Ergebnis bleibt im
Browser (Fortsetzen möglich) und lässt sich kopieren oder als Datei speichern.

## Vergleich Stereo gegen Raumklang

(Nicht mehr auf der Seite; die Werkzeuge bleiben.)


`--stereo` rendert dieselbe Szene mit denselben Ereignissen in konventionellem
Stereo: nur Links-rechts-Verteilung mit gleicher Leistung, Entfernung,
Luftdämpfung und derselbe Nachhall – ohne HRTF, ohne Spiegelungen, ohne Beugung
über die Bordkante, ohne Nahfeld. `--drehung` übernimmt den Startpunkt der
räumlichen Fassung, damit beide deckungsgleich sind – und zwar als
`start_abtastwerte` aus deren Bericht: die gerundeten Sekunden verschoben die
Fassungen um 2,8 ms (bis 17.11.). `pipeline/wechsel.py`
schneidet beide im Wechsel zusammen (14 Abschnitte à 14,3 s, 0,6 s gleichstarke
Überblendung, auch über die Schleifennaht).

## Mehr Weite (Vergleich A/B/C)

Drei Fassungen der Meeresszene mit denselben Ereignissen (`szenen/boot.json`,
`boot_weite_b.json`, `boot_weite_c.json`):

- **B** – Raumanteil nach Entfernung: Quellen ab 25 m speisen zusätzlich einen
  langen, dumpfen Weitenhall (Nachklingzeit 3 s tief, 0,8 s hoch); sein Anteil
  nimmt mit der Entfernung nicht ab, der Direktschall schon – das Verhältnis
  kippt mit der Entfernung zum Raum hin. Dazu Luftflimmern ab 30 m: langsame
  Pegel- und Klangschwankung bis 3 dB, für beide Ohren teils verschieden (eigene
  Zufallsquelle je Ereignis, damit die Ereignisfolge gleich bleibt).
- **C** – B plus ferne Schicht: Brandung am Horizont in 400–1200 m, eine
  Möwenkolonie in 150–450 m, bis 70 m hoch (hinten angehängt, damit die
  übrigen Gruppen ihre Zufallsfolge behalten).

Benjamins Urteil: in B und C ist zu viel los, die Brandung wird zu Rauschen, das
anderes ertränkt; die ferne Kolonie und die Behandlung der Möwen sind gut.
Daraus **D** (`boot_weite_d.json`, auf der Seite im Wechsel mit A): Weitenhall
und Luftflimmern nur noch für die Möwengruppen (`gruppen` in `weite` und
`flimmern`), keine Horizont-Brandung, ferne Kolonie bleibt. Neu `windtragen`:
die gemeinsame Böenkurve ändert Pegel und Klang der Möwen je nach Windseite –
in Luv lauter und heller, in Lee leiser und dumpfer (2,5 dB je Böenstärke in den
Höhen, 35 % davon im Bass, ab 12 m, voll ab 60 m). B und C sind nicht mehr auf
der Seite.

Gemessen (mittlere Übereinstimmung linkes/rechtes Ohr in 200–800 / 800–3000 /
3000–8000 Hz): Stereo 0,67 / 0,69 / 0,69, A 0,39 / 0,20 / 0,14, B 0,30 / 0,15 /
0,11, C 0,29 / 0,13 / 0,11.

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
