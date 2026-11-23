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
Kunststoffdach), ein Bach statt des Blubberns, schwerere Tritte (damals Klopfen
an eine schwere Holztür, verlangsamt – seit dem 19.11. ersetzt durch echte schwere
Aufpralle auf Waldboden und Erde mit Wucht-Schicht, siehe unten), brechende Äste (Knarren, Krachen, herabfallendes Laub,
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

## Drehbuch

Jede Szene hat ein kleines Drehbuch (`drehbuch` in `szenen/*.json`): langsame
Kurven 0…1 über die Szenendauer (Stützstellen, geglättet, periodisch – der Bogen
geht in der Schleife auf), etwa `wind`, `regen`, `see`, `herde`, `wale`.

- Die Böenkurve folgt `wind`: bei viel Wind häufigere und stärkere Böen.
- Gruppen folgen einer Kurve (`folgt`: Rate und Pegel je Kurvenwert, `invers`,
  `exponent`): Regen und Tropfen dem Regen, Wellen, Rumpf und Brecher am Felsen
  der See (die ihrem Wind 20–30 s nachläuft), Gesang nur in der Regenpause.
- Reaktionen: Steigt eine Böe über die Schwelle, schrecken Vögel auf
  (`aufschrecken`: Schwall aufgeregter Rufe, Flügelschläge). Ferne Rufer kommen
  näher und ziehen weg (`naehe_folgt`).
- Der Bericht und die Seite zeigen das Drehbuch als Zeitleiste, bezogen auf den
  Anfang der Datei.

Fertige Wetter-Szenen sind 10 Minuten lang (ein ganzer Bogen ruhig → Sturm →
ruhig); neue Szenen werden zum Ausprobieren erst mit 2 Minuten gerendert.

## Körperliche Quellen (23.11.)

`pipeline/raumwirkung.py`, je Gruppe in der Szene einstellbar, mit `--ohne
breite,richtwirkung,nahfeld,streuung,kette` für Vergleiche abschaltbar (die
Ereignisfolge bleibt dabei gleich, weil jede Wirkung ihre eigene Zufallsquelle hat):

- **Breite** (`breite_m`): Wellen, Brandung, Regenflächen, Kronen, Bach sind keine
  Punkte. Das Spektrum wird in Bänder geteilt (unten 300 Hz breit, darüber
  Terzen), die abwechselnd aus bis zu fünf Richtungen über die Breite der Quelle
  kommen; die Masken ergänzen sich zu 1. Kostet nur zusätzliche HRTF-Abfragen.
  Einzelne 10 m breite Quelle in 10 m: Übereinstimmung der Ohrsignale 0,99 → 0,55.
- **Richtwirkung** (`richtwirkung`): Rufe sind in Rufrichtung heller (abgewandt
  bis −8 dB bei 8 kHz). Rufrichtung = Flugrichtung bzw. zufällig, mit Kopfwendung.
- **Nahfeld**: unter 1 m frequenzabhängiger Ohrunterschied nach dem Kugelkopf
  (Duda & Martens 1998), relativ zur Messentfernung der HRTF. Wirkt spürbar erst
  unter etwa 30 cm; bei 50 cm kaum mehr als die alte Pegelkorrektur.
- **Stamm-Streuung** (Wald, `staemme`): 36 Stämme werfen kurze Ereignisse als
  frühe, gerichtete Echos zurück (15–190 ms, ohne Tiefen), als eine Faltung je
  Ereignis. Etwa 12 dB unter dem Direktschall.
- **Weitenhall mit Obergrenze** (`max_faktor`): sehr ferne Quellen bestanden sonst
  fast nur aus Hall (ferne Möwenkolonie: Hall 14 dB über dem Direktschall – klang
  wie vor einer Klippe; jetzt 4,5 dB darunter, kürzer).

## Ereigniskette

Generatoren melden Ereignisse (`kx.melde`: große Welle, Brecher am Felsen, harter
Schlag gegen den Rumpf, Astbruch, Gebrüll), andere reagieren darauf: die Welle
erreicht kurz darauf den Rumpf auf ihrer Seite, nach einem harten Schlag knarzt
das Holz dort nach, Möwen schrecken bei Brechern auf, Vögel fliegen nach einem
Astbruch auf und verstummen nach einem Gebrüll, auf ein Gebrüll antwortet
manchmal ein zweites Tier. Ein Vorlauf ohne Ton sammelt alle Meldungen, damit die
Reihenfolge der Gruppen keine Rolle spielt; Reaktionen ziehen nicht aus der
Zufallsfolge ihrer Gruppe.

Auswahl der Ausschnitte: von drei zufälligen Kandidaten der am seltensten
benutzte; jedes Tier bekommt eine Stimme aus mindestens acht Ausschnitten
(kleine Aufnahmen werden zusammengelegt).

## Szenenkarte und Plausibilitätsprüfung

Beim Rendern schreibt der Renderer `audio/<szene>_karte.json`: jede Quelle mit
Gruppe, Art (Quelle/Echo), Startzeit und Ort im Hörerbezug (x vorn, y links,
z oben; 2 Hz, durchlaufende Quellen 0,5 Hz), dazu Kopf, Blick, Schleifenstart
und Drehbuch. `--karte` schreibt nur die Karte, ohne Audio – mit denselben
Ereignissen wie das gerenderte Stück.

`python3 pipeline/pruefe_karte.py audio/<szene>_karte.json` prüft je Gruppe
Entfernung, Tempo und Höhe gegen Grenzen (`pruefung` je Gruppe in der Szene),
meldet stumme Gruppen, Quellen am Kopf und seltene, nahe Ereignisse, die
weniger als 8 s auseinanderliegen. Gefunden hat sie bisher: einen stummen
Vorbeigang, eine Elefantenherde, die mit bis zu 5 m/s um das Zelt kreiste,
eine Trompete von hinten, eine Saurierherde mit 11 m/s, eine Möwenkolonie mit
39 m/s.

Dazu Komposition (Anteil links/rechts, längste einseitige Strecke, welche
Entfernungszone wie lange vorn liegt, Fokuswechsel je Minute) und Wiederholung
(Ereignisse je Gruppe, verschiedene Ausschnitte, häufigster).
`python3 pipeline/pruefe_material.py szenen/<szene>.json` prüft die Aufnahmen
selbst: Bandbreite, Dynamik, mitgebrachter Nachklang, Ausbeute an Ereignissen.

`karte/?s=<szene>` zeigt die Karte als Draufsicht im Browser, im
Schnelldurchlauf oder synchron mit dem Ton.

## Klosterruine, Elefanten, Meerestier

- `ruine.py`: Mittelschiff ohne Gewölbe, Längsmauern und Chorwand spiegeln, was
  im Schiff ist; was dahinter liegt, kommt gedämpft durch oder über die
  Mauerkrone. Langer Steinhall.
- Elefanten am Wasserloch: Umgebung `wald.py` als offene Savanne (kein
  Blätterdach, Zeltwand statt Stamm). Herde, Trinken, Vorbeigang, Besuch am Zelt.
- `ozean.py`: frei im Wasser – Spiegelquellen an Oberfläche (Vorzeichenwechsel)
  und Grund bis zur 3. Ordnung, zylindrische Ausbreitung jenseits der doppelten
  Wassertiefe, Absorption nach Thorp, Laufzeit mit 1500 m/s. Der Kern kann Wege
  ohne Luftdämpfung rechnen (`luft=False`).

## HRTF-Auswahltest

`hrtf-test/` ist der Hörtest, mit dem die HRTF ausgewählt wurde: 48 Rauschstöße
aus 8 Richtungen mit 6 Kunstohren (MIT-KEMAR und 5 CIPIC-Köpfe, diffusfeld-
entzerrt, mit frühen Reflexionen und leisem Nachhall), danach je HRTF ein Kreis
um den Kopf. Die HRIRs liegen in `hrtf-test/hrtf.json`. Das Ergebnis bleibt im
Browser (Fortsetzen möglich) und lässt sich kopieren oder als Datei speichern.

## Fassungen und Blindvergleich

Auf der Seite stehen nur noch die aktuellen Fassungen: Wald, Meer (**A**) und
– nur im Blindvergleich – Meer mit mehr Weite (**D**, `szenen/boot_weite_d.json`).
D ist A mit denselben Ereignissen plus ferner Möwenkolonie (150–450 m),
Weitenhall und Luftflimmern nur für die Möwen (`gruppen` in `weite` und
`flimmern`) und `windtragen`: die Böenkurve ändert Pegel und Klang der Möwen je
nach Windseite (Luv lauter und heller, Lee leiser und dumpfer).

`vergleich/` ist ein Blindvergleich: 10 Durchgänge an verteilten Stellen, je
ein 20-s-Ausschnitt beider Fassungen, die synchron laufen; X/Y zufällig, aber
ausgeglichen zugeordnet; Fragen nach Weite, Natürlichkeit, Entspannung
(X / gleich / Y). Auswertung je Frage mit exaktem Binomialtest ohne die
Gleich-Antworten. Ergebnis bleibt im Browser, kopieren oder als Datei
speichern. Neue Vergleiche in `VERGLEICHE` eintragen (zwei gleich lange,
deckungsgleich gerenderte Dateien; `--drehung` mit `start_abtastwerte` der
ersten Fassung).

Verworfen (17.11.): B (Weitenhall ab 25 m für alle fernen Quellen), C (B plus
Brandung am Horizont) – „zu viel los, die Brandung wird zu Rauschen“; der
Wechsel Stereo/räumlich (`--stereo` bleibt im Renderer).

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
Schlag, das Achterliek knattert, und das Tuch weht etwas zur Seite. Den Klang
trägt echtes Stoffflattern (Freesound, CC0/CC BY: Baumwolle, Flaggen) – in der
Flaute fast still, mit der Böe lauter. Die frühere Nachbildung aus Windrauschen
(Füllen, Knattern, Knistern) liegt leise darunter (`nachbildung_pegel`).

## Wucht

Was mit viel Kraft passiert – ein Brecher, ein harter Schlag gegen den Rumpf,
der Tritt eines Riesen, ein Gebrüll aus einem großen Brustkorb – bekommt eine
tiefe Schicht (`wucht` in der Sammlung, `material.wucht`):

- **Moden**: Eigenschwingungen, angeregt vom Ereignis selbst (Rumpf 68/97/142 Hz,
  Waldboden 52/71/104 Hz, Brustkorb 62/88 Hz).
- **Grollen**: tiefes Rauschen (35–150 Hz), das der Hüllkurve folgt – mitgerissene
  Luft und Wasser beim Brecher.
- **Obertöne**: weiche, unsymmetrische Sättigung der tiefen Schicht. Offene
  Kopfhörer wie der Grado geben unter 50 Hz kaum etwas wieder (RS1: −10 dB bei
  30 Hz); die Obertöne 2f und 3f kommen an, das Ohr ergänzt den Grundton.

Die Schicht bleibt getrennt und wächst überproportional mit der Stärke des
Ereignisses (`wucht_pegel · Stärke^wucht_exponent`, Exponent 2–3): leichte
Schwapps bleiben schlank, harte Schläge wummern. Die frühere Bodenresonanz bei
30/46/72 Hz lag größtenteils unterhalb dessen, was der Kopfhörer abstrahlt.

## Material

Echte Aufnahmen; synthetisch sind nur die Wucht-Schicht (siehe oben), die leise
Segel-Nachbildung unter dem echten Stoff und die Musik im Wald. Quellen:

- Wikimedia Commons, gemeinfrei, CC0 oder CC BY.
- Freesound, nur CC0 oder CC BY (über den Workflow, siehe oben): Stoff und
  Flaggen, Flügelschläge, Möwen nah, Holzboot und Wasser, Brecher, schwere
  Aufpralle, Matsch, Äste, Bäche.
- [ESC-50](https://github.com/karolpiczak/ESC-50): Fünf-Sekunden-Ausschnitte aus
  Freesound-Aufnahmen. Der Datensatz als Ganzes ist CC BY-NC; hier werden nur
  Clips benutzt, deren Original laut `LICENSE` des Datensatzes CC0 oder CC BY
  ist (Wellen, Wind, Holz).

Die Seite listet genau die Aufnahmen, die in der gerenderten Fassung stecken.

## Grenzen

- Die HRTF reicht nur bis −50° Elevation; darunter wird über große Dreiecke
  zwischen den Rändern der Messung gemischt, das ist dort nur grob.
- Fünf-Sekunden-Clips: Flächenklänge sind aus vielen kurzen Stücken genäht.
- Möwen: acht Aufnahmen; einige ältere sind auf 5–10 kHz bandbegrenzt.
- Flügelschläge sind echte Aufnahmen (`fluegel_echt`); der Fahrtwind darunter ist
  echtes Windrauschen ohne eigene Schläge.
- Geprüft ist messtechnisch (Pegel, Spektren, Links-rechts-Verlauf), nicht nach
  Gehör – das Urteil fällt am Kopfhörer.
