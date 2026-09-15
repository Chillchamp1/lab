# Stand

Was fehlt, was offen ist, und was bewusst so bleibt.

## Was steht

Alles. Die drei Rohdatensätze liegen unter `data/raw/` (65 Dateien, 418 MB,
Prüfsummen in `build/PRUEFSUMMEN.eigen`), die Karte ist daraus gebaut, und die
Seite unter der Adresse zeigt sie.

```
cd build
./holen.sh                     # lädt alles drei, prüft die TLS-Kette selbst
python3 quellen.py
node build.mjs > ../index.html
```

## Was beim ersten echten Lauf geprüft wurde

Die fünf Punkte, die hier als offen standen, sind beantwortet — **drei davon
waren falsch geraten**, und einer davon hätte die Karte still verdorben.

1. **Heissen die Variablen so?** Ja. `Topo`, `Topo_Diff`, `stgit`, `sftlf`,
   `sftgif` — nur `sftgif`, nicht `stgif`, wie das Prüfgerüst annahm.
2. **Probe 1 muss null sein.** War sie nicht: 584 m. Und das war richtig so.
   `Topo` trägt im Kopf der Datei den Zusatz „(Point-value altitude)",
   `Topo_Diff` trägt ihn nicht — wo das Differenzfeld innerhalb einer Zelle
   eine Stufe hat, sind ein Stichwert und ein Zellmittel zwei verschiedene
   Zahlen. Gemessen: an Zellen ohne solche Stufe unter **2,6 m** quer durch
   alle 48 Scheiben, ausdrücklich auch über den Alpen; an den übrigen 28
   Prozent dreistellig. Die Probe prüft jetzt die stufenfreien Zellen scharf
   und meldet die übrigen daneben.

   **Der eigentliche Fang steckte dahinter:** Beim Nachgehen dieser Abweichung
   kam heraus, dass `Topo` und `Topo_Diff` das **Eis enthalten**. Die Formel
   der Aufgabe hätte das Skandinavische Gebirge bei 21 ka als 2000 m hohen
   Fels gezeichnet und das Eis noch einmal 2400 m darüber. Siehe
   [METHODIK.md](METHODIK.md), Abschnitt 2 und 8b.
3. **Läuft die Breitenachse aufsteigend?** Ja, `lat0 = 30,5`, `dlat = +1`.
4. **Wie benennt PANGAEA die Shapefiles?** Nicht wie vermutet: `TS20_mc`,
   Polygone in polaren Lambert-Azimutal-Metern, Zeit als Attribut `AV_Time`.
5. **Deckt das DEM die Hülle?** Nach der Korrektur ja — **100,0 Prozent**. Auf
   dem Weg dahin ein echter Fehler: jede ETOPO-Kachel wurde für sich
   blockgemittelt, dadurch fielen an den Kachelgrenzen 2 872 Zellen (0,84 %)
   aus. Behoben durch global ausgerichtete Blöcke.

## Was der Ausschnitt kostet

**ICE-6G_C liegt hier bei 1 Grad, nicht bei 10 Bogenminuten.** Die
10'-Variante gibt es nur bei PMIP4, hinter einem Zertifikat, das abgelaufen
*und* auf einen anderen Namen ausgestellt ist; das wird nicht umgangen
([QUELLEN.md](QUELLEN.md), Abschnitt 1). Die groben Felder liegen damit bei
68 km statt 27 km.

Der Fels verliert dadurch nichts — er kommt aus dem 15″-Höhenmodell. Weich
wird ICE-6G_Cs **Eisrand**, und über genau den sagt die Karte ihre Aussage
ohnehin nicht selbst: das tun die DATED-1-Linien, die in voller Schärfe
darüber liegen.

Sollte die 10'-Variante eines Tages erreichbar sein, genügt es, sie nach
`data/raw/ice6g/` zu legen: `quellen.py` rechnet die Teiler aus der Quellzelle
und wird von selbst feiner.

## Was fehlt und erreichbar wäre

### Die Zeit vor 26 ka

Die Aufgabe setzt die Achse auf 26 bis 0 ka, und ICE-6G_C fängt dort an. DATED-1
reicht bis 40 ka zurück. Ein Aufbau ab 40 ka wäre also für die **Ränder**
belegt, für die Mächtigkeit nicht — und eine Karte, die einen Eisschild ohne
Dicke zeichnet, kann nichts zeigen.

### Die anderen Eisschilde

Der Ausschnitt schneidet Grönland und den Laurentidischen Eisschild ab. Das ist
eine Entscheidung der Aufgabe und keine der Daten: ICE-6G_C ist global, und die
Kette käme mit einem grösseren Fenster zurecht. Nur wäre es dann keine Karte
Europas mehr.

### Die zweite Unsicherheit

DATED-1 gibt die Unsicherheit des **Randes**. Für die **Mächtigkeit** gibt
ICE-6G_C keine Fehlerfelder heraus; die ±20–30 % stehen in der Literatur, nicht
in den Dateien. Man könnte sie als zweites Band über die Eisoberfläche legen —
zwei Bänder für zwei verschiedene Unsicherheiten auf einer Karte sind aber
vermutlich eines zu viel. Bis jemand einen guten Weg dafür hat, steht die Zahl
im Text und nicht im Bild.

### Der Vergleich zweier Modelle

ICE-6G_C ist nicht die einzige Rekonstruktion; ANU und GLAC-1D kommen zu
anderen Mächtigkeiten. Zwei Modelle nebeneinander wären die ehrlichste
Darstellung der Modellunsicherheit — und ein zweiter Datensatz, ein zweiter
Download, ein zweiter Regler. Das ist ein eigenes Projekt.

## Was bewusst so bleibt

- **Ortsnamen: als Ebene von heute, nicht als Beschriftung der Karte.** Hier
  stand lange „keine" — die Vorlage beschriftet Städte, weil ihre Aussage an
  Orten hängt, und hier hängt sie an Flächen und Rändern. Das Argument stimmt
  weiter für Namen, die den Zustand benennen: ein „Doggerland" ins Bild zu
  setzen wäre Beschriftung dessen, was die Karte ohnehin zeigt.

  Zehn heutige Städte und die heutige Küstenlinie sind etwas anderes. Sie
  sagen nichts über die Eiszeit, sie geben dem Auge einen Anker in der
  Gegenwart — und genau dadurch wird die Bewegung ablesbar: wo die Karte bei
  22 ka Land zeigt und die dünne Linie darunter durchläuft, stand später
  Wasser. Deshalb sind sie eine **eigene, abschaltbare Ebene** („Today") und
  liegen im Ton so weit zurück, dass sie das Relief nicht stören.
- **Keine Interpolation der DATED-Ränder.** Siehe METHODIK, Abschnitt 6.
- **Kein Beschneiden der Ränder auf den Eisschild.** Wo die DATED-Linie und
  ICE-6G_Cs Eisrand auseinanderlaufen, ist das der Befund und kein Fehler, den
  man wegrechnet.
- **Eine Ansicht.** Kein Umschalten zwischen Mächtigkeit, Oberfläche und
  Gestein. Die Vorlage hat drei Ansichten, ein Nadelrelief, ein Gitternetz und
  einen Hell-Dunkel-Umschalter abgeräumt; dieser Ordner fängt deshalb schon
  aufgeräumt an.

## Bekannte Schwächen der jetzigen Fassung

- **Die Überhöhung der Schrägsicht ist 84-fach.** Das ist gemessen und nicht
  geraten (METHODIK, Abschnitt 8c) — aber es bleibt eine Überhöhung, und wer
  Hangneigungen aus dem Bild abliest, liest sie falsch. Das Gegenmittel wäre
  eine Zahl im Bild; sie hätte auf einer Karte, die schon zwei Leitern, eine
  Zeitleiste und ein Unsicherheitsband trägt, keinen Platz, der sie besser
  machte.
- **Der Eisrand ist auf 68 km abgetastet.** Das ist die Auflösung der Quelle,
  nicht eine Sparmassnahme: `quellen.py` lässt das Grobgitter nie feiner
  werden als die ICE-6G_C-Zelle. Die Stufe am Eisrand wird dadurch über rund
  zehn Bildpunkte weich. Die DATED-Linien liegen in voller Schärfe darüber —
  sie sind die Aussage über den Rand.
- **Wenn das Eis weg ist, stimmen die Küsten noch nicht.** Das ist kein Fehler,
  sondern die Aussage: bei 8,5 ka liegt kein Eis mehr im Fenster, der
  Meeresspiegel steht aber noch bei −6,6 m und die Kruste bewegt sich weiter.
  `Topo_Diff` reicht dort bis −206 m. Erst bei 0 ka ist es exakt null — dann
  ist die Küste **genau** die moderne, weil das moderne Höhenmodell die Karte
  ist.
- **Über 90 Grad Drehung bleiben graue Wolken stehen.** Die Lichtebene wird je
  Höhenscheibe mit der Regel „gerade-ungerade" beschnitten, damit Löcher —
  Meeresboden unter der Scheibenhöhe — ausgespart bleiben; der Umriss, der
  daraus als Maske für den Blit entsteht, kennt diese Löcher nicht mehr. Bei
  kleinen Drehwinkeln liegt der Unterschied hinter der Karte, bei starken tritt
  er als Wolke daneben. Der saubere Weg wäre eine Maske je Scheibe in voller
  Auflösung, also ein Füllvorgang mehr je Scheibe. Bis dahin: die üblichen
  Blickwinkel sind sauber, der Fehler steht hier.
- **Gekippt ragt das Unsicherheitsband am Ostrand ein paar Pixel über die
  Karte.** Die DATED-Ringe sind auf das Gitterrechteck beschnitten; die
  Schnittkante wird nicht gestrichelt, aber die **Füllung** des Bandes wird an
  ihr angehoben wie das Gelände daneben, und am Ostrand steht das Gelände
  niedriger als der Hub. Sichtbar nur gekippt, nur am Rand, wenige Pixel. Ganz
  weg wäre es mit einer Schablone, die den Hub zeilenweise aus dem Feldstand
  nimmt statt pauschal aus der Stapelhöhe.
- **Die Schrägsicht rechnet die Scheibenringe je Bild neu**, solange die Uhr
  läuft — und seit der Trennung von Fels und Eis zwei Sätze davon. Gemessen 175
  ms je Bild gekippt, 140 ms sobald kein Eis mehr da ist, 88 ms flach. Die
  Vorlage friert ihr Feld ein, sobald es steht, und spart damit die teuersten
  Posten bei jeder Geste. Hier ist nur der Ringspeicher an den Feldstand
  gehängt; der Rest wäre nachzuziehen, wenn sich die Schrägsicht auf dem Telefon
  als zäh erweist.
- **Kein Tiefpass über die Bilder.** Die Vorlage glättet das Höhenfeld über die
  Zeit, weil ihr Raster von Bild zu Bild springt und die Höhenlinien mitzappeln.
  Hier steht das Gitter fest — es ist aus einem festen DEM abgeleitet, nicht aus
  wandernden Umrissen —, also gibt es das Zittern nicht. Sollte es sich beim
  Lauf mit echten Daten doch zeigen, ist der Filter aus der Vorlage zu
  übernehmen.
- **Der Film ist nicht gelaufen.** `build/film.mjs` steht und ist gegen die
  Vorlage geschrieben, aber ohne echte Daten gibt es nichts zu filmen.
