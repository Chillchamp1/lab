# Methodik

Gilt für den jetzigen Stand: alle 400 heutigen Kreise, zehn Zeitpunkte von 1871
bis 2024. Was noch fehlt und warum, steht in [STAND.md](STAND.md); welche
Quellen geprüft wurden, in [QUELLEN.md](QUELLEN.md).

## 1. Gebietsstand

**Einheit ist der heutige Kreis, Schlüssel der fünfstellige AGS.**

Geometrie: BKG VG2500, Ebene KRS, Gebietsstand 1. Januar 2026, ETRS89/UTM 32N,
401 Kreise. Für Zuordnungen, Namen und die amtlichen Flächen: das
Gemeindeverzeichnis-Informationssystem GV-ISys des Statistischen Bundesamts,
Stand 31. Dezember 2024, 400 Kreise.

Zwei Kreisschlüssel müssen zusammengeführt werden, beide Male exakt und ohne
Schätzung, weil der heutige Kreis genau die Vereinigung der alten ist:

> **Hanau** ist zum 1. Januar 2026 kreisfrei geworden (AGS 06415) und steht in
> VG2500 bereits als eigener Kreis. Keine Bevölkerungsreihe trennt die Stadt
> vom Main-Kinzig-Kreis — auch die jüngste nicht. Ein Kreis, der in allen
> Zeitpunkten ein Loch wäre, hilft niemandem, also wird Hanau in der Geometrie
> wieder aufgelöst. Damit sind es **400 Gebiete**, der Kreisstand des
> Gemeindeverzeichnisses vom 31.12.2024.
>
> **Eisenach** (AGS 16056) ist am 1. Juli 2021 in den Wartburgkreis
> eingegliedert worden. Die Bevölkerungsquelle steht auf dem Gebietsstand
> 31.12.2019 und führt die Stadt noch getrennt; ihre Zahlen werden zum
> Wartburgkreis addiert.

Zur Kontrolle: die Flächensumme der 400 Kreise beträgt nach der
Generalisierung 357 102 km², amtlich sind es 357 677 km² — 0,16 % weniger, was
dem Massstab 1:2 500 000 entspricht. Für die Dichte wird deshalb nicht die
gezeichnete Fläche benutzt, sondern die amtliche aus GV-ISys.

## 2. Von der Rohgeometrie zum Kartogramm-Modell

Drei Schritte, alle in `build/topologie.mjs`:

1. **Verschweissen.** Gleiche Koordinaten werden zu einem Knoten. Danach ist
   die gemeinsame Grenze zweier Kreise dieselbe Knotenfolge. Ohne das reissen
   beim Verziehen Lücken auf, weil beide Seiten unabhängig wandern.

2. **Auflösen.** Je Kreis werden dessen Ringe zu einem Umriss vereinigt:
   Kanten, die in zwei Ringen desselben Kreises gegenläufig vorkommen, sind
   innere Grenzen und heben sich auf; der Rest wird über eine Winkelverfolgung
   zu neuen Ringen verkettet. Nur so verschmelzen zwei Gebiete wirklich, statt
   nebeneinander liegen zu bleiben. Das ist der Weg, auf dem Hanau in den
   Main-Kinzig-Kreis zurückgeht.

3. **Generalisieren.** Knotenweise nach Visvalingam, aber am eigenen Kreis
   gemessen statt absolut — sonst verlieren die kreisfreien Städte zuerst ihre
   Form, und gerade sie werden im Kartogramm gross gezogen. Entschieden wird je
   Knoten, nicht je Ring: ein Knoten fällt überall oder nirgends weg, damit
   gemeinsame Grenzen gemeinsam bleiben. Knoten, an denen mehr als zwei Kreise
   zusammenstossen, bleiben immer.

Gerechnet wird durchgehend auf einer flächentreuen Projektion (Lambert
azimutal, 52° N 10° O). VG2500 liegt in UTM; die Umkehrung der UTM-Abbildung
steht in `build/geometrie.mjs` und ist im Zentimeter genau, also viel feiner
als die Daten.

## 3. Die Zahlen

### Rangfolge der Methoden

- **A** — eine Reihe, die schon auf einen einheitlichen Gebietsstand gerechnet
  ist. Direkt übernommen.
- **B** — historische Gemeindedaten, Gemeinde für Gemeinde einem heutigen Kreis
  zugeordnet und aufsummiert.
- **C** — nur wo ausschliesslich Kreisdaten existieren: Flächeninterpolation
  über historische Kreisgrenzen, mit Qualitätsflag und interpoliertem Anteil.

Historische Kreise werden **nie** pauschal einem heutigen gleichgesetzt.

Im jetzigen Stand ist **jede Zelle Methode A**; die Spalte
`anteil_interpoliert` ist überall 0. Das liegt an der Quelle: Roesel hat die
Zuordnung auf Gemeindeebene gemacht — also Methode B, sauber ausgeführt und
veröffentlicht — und daraus die Kreissummen gebildet. Für diese Karte ist
nichts mehr umzurechnen.

### Woher die Zellen stammen

| Bild | Stichtage | Quelle |
|---|---|---|
| 1871 | 1.12.1871 | GPOP |
| 1900–1910 | 1.12.1900 (Bayern), 1.12.1905 (SH, NI, NW, RP, SL), 1.12.1910 (übrige) | GPOP |
| 1939 | 17.5.1939 | GPOP |
| 1946–1950 | 29.10.1946, 13.9.1950 (RP, BW, BY) | GPOP |
| 1961–1964 | 6.6.1961 (West), 31.12.1964 (Ost) | GPOP |
| 1985–1987 | 31.12.1985 (Ost), 25.5.1987 (West) | GPOP |
| 1996 | 31.12.1996 | GPOP |
| 2011 | 9.5.2011 (Zensus) | GPOP |
| 2019 | 31.12.2019 | GPOP |
| 2024 | 31.12.2024 | GV-ISys |

**GPOP** ist die *German Local Population Database*, Version 1.0, von Felix
Roesel (TU Braunschweig): Bevölkerung aller 11 007 Gemeinden, 401 Kreise und
16 Länder auf einheitlichem Gebietsstand 31.12.2019, aus über 50 Quellen
zusammengetragen, CC BY 4.0.

Wo Ost und West zu verschiedenen Tagen gezählt haben, führt GPOP zwei Spalten,
die einander ergänzen. Sie werden zu einem Bild zusammengefasst, aber **nicht
angeglichen**: jede Zeile behält ihren eigenen Stichtag, das Bild trägt beide,
und auf der Zeitachse sitzt es dort, wo sein Bevölkerungsschwerpunkt liegt —
das Bild 1961–1964 also näher an 1961, weil im Westen mehr Menschen wohnten.

### Bevölkerungsbegriff

Nicht stillschweigend gemischt, sondern je Zeile in der Spalte `begriff`
geführt:

| Zeitpunkte | Begriff |
|---|---|
| 1871 bis 1910 | ortsanwesende Bevölkerung — wer in der Zählnacht da war, Militär eingeschlossen |
| 1939 bis 1964, 1987, 2011 | Wohnbevölkerung |
| 1985, 1996, 2019, 2024 | Fortschreibung, Bevölkerung am Ort der Hauptwohnung |

Der Bruch liegt bei der Zählung vom 17. Mai 1939, die erstmals die
Wohnbevölkerung ausweist. Er ist keine Erfindung der Karte, sondern eine
Eigenschaft der Zählungen; die Quelle schreibt den Begriff nicht mit, er folgt
der jeweils gültigen Zählungsdefinition.

## 4. Das Kartogramm

**Diffusionskartogramm nach Gastner und Newman (2004)**, wie in
[wahlkreise-2025](../wahlkreise-2025/): die Bevölkerungsdichte wird als Wärme
aufgefasst und fliesst auseinander, bis sie überall gleich ist; jeder Punkt der
Karte schwimmt mit der Strömung mit. Weil das Feld glatt ist und alle Punkte
derselben Strömung folgen, bleiben lokale Formen erhalten — anders als bei
Kraftverfahren, die jedes Gebiet einzeln um seinen Schwerpunkt aufblasen.

Die Wärmeleitungsgleichung wird nicht per Fourier gelöst, sondern über ihre
analytische Lösung: das Feld zur Zeit *t* ist das Ausgangsfeld, gefaltet mit
einer Gaussglocke der Breite σ = √(2t), angenähert durch Kastenfilter in
linearer Zeit.

Vier Dinge kommen gegenüber der Wahlkreiskarte dazu:

**Mehrere Durchgänge.** Ein einzelner bleibt an der Gitterauflösung hängen.
Nach jedem Durchgang wird die verformte Geometrie neu gerastert und der
Restfehler erneut ausgeglichen.

**Warmer Start.** Zwei aufeinanderfolgende Zählungen unterscheiden sich wenig.
Das Kartogramm des nächsten Zeitpunkts fängt deshalb beim vorigen Ergebnis an,
nicht wieder bei der Landkarte. Das spart Rechenzeit und hält die Bilder
beieinander, sodass der Übergang eine Bewegung ist und kein Sprung.

**Ausschnitt nach den Daten.** Das Gitter richtet sich nach den Kreisen, für
die es Zahlen gibt. Solange das alle sind, ist das ganz Deutschland; sobald
eine Reihe nur einen Teil abdeckt, bleibt die Auflösung dort, wo sie gebraucht
wird.

**Gemeinsamer Massstab.** Das Kartogramm selbst verteilt nur um; seine
Gesamtfläche bleibt die der Ausgangskarte, gleich wie viele Menschen darin
wohnen. Damit die Karte *mit* der Bevölkerung wächst, gilt für alle Zeitpunkte
dieselbe Fläche je Mensch — so viel, dass das bevölkerungsreichste Bild gerade
die Fläche der geografischen Karte einnimmt. Jeder gespeicherte Zustand ist auf
diese Fläche normiert und um den festen Schwerpunkt der Gesamtkarte zentriert;
die Grösse steckt allein im Faktor √(Bevölkerung / grösste Bevölkerung), der
beim Zeichnen wieder daraufkommt. Halb so viele Menschen heisst dann wirklich
halb so viel Karte.

Zwischen zwei Zeitpunkten läuft die Karte linear in der Zeit, nicht in gleichen
Schritten je Zählung. Was zwischen zwei Stichtagen gezeigt wird, ist
interpoliert, und die Karte sagt das an.

### Wenn eine Reihe nur einen Teil abdeckt

Der Bauvorgang kann damit umgehen, auch wenn es im jetzigen Stand nicht
gebraucht wird. Kreise ohne Zahl werden im Dichtefeld wie Meer behandelt — sie
bekommen die mittlere Dichte der abgedeckten Kreise, treiben also in der
Strömung mit, ohne sie zu verzerren — und nicht gezeichnet. Kreise, die in
weniger als der Hälfte der Bilder Zahlen haben, bekommen zusätzlich eine
eigene Reihe ohne sie, zwischen denen die Seite umschalten kann.

Das war beim Pilotgebiet Berlin und Brandenburg nötig und ist dort auch
gemessen worden: Berlin hielt 59 % der Menschen der Region, lag mitten darin
und ist auf dem Boden winzig — im Kartogramm presste es Brandenburg zu einem
Ring zusammen. Rechnerisch war das einwandfrei (keine gefalteten Ringe, keine
Selbstüberschneidungen), als einzige Ansicht aber unlesbar. So verhält sich ein
flächentreues Kartogramm, wenn ein eingeschlossenes Gebiet die Mehrheit der
Menschen hält. Deutschlandweit stellt sich die Frage nicht: dort ist Berlin
vier Prozent des Landes.

## 4a. Das Nadelrelief

Die dritte Ansicht — **Standing up** — zeigt dieselben Zahlen anders herum: die
Karte behält ihre wirkliche Form, und die Bevölkerung stellt sich auf.
Verfahren nach den „crisp spike maps" von Milos Popovic, die mit rayshader aus
einem Bevölkerungsraster ein Nadelfeld rendern — hier in der Fläche gerechnet
und durch die Zeit laufend. Die Uhr ist dieselbe wie im Kartogramm; nur bleibt
das Feld nach 2019 stehen, weil die Gemeindezahlen dort enden.

Grundlage sind die **11 007 Gemeinden** aus GPOP, nicht die Kreise. Die Datei
führt zu jeder Gemeinde Länge, Breite und Fläche; Umrisse braucht ein Nadelbild
nicht.

Eine Nadel je Gemeinde wäre nicht vergleichbar — die kleinste Gemeinde hat vier
Hektar, die grösste 891 km². Gerechnet wird deshalb auf ein flächentreues
Raster: jede Gemeinde verteilt ihre Menschen gleichmässig über eine Scheibe
ihrer eigenen Fläche (Streupunkte auf einer Fibonacci-Spirale, damit sie sich
nicht klumpen), und gezählt wird je Zelle. Die Nadelhöhe ist danach Menschen je
gleich grosser Fläche, also Dichte.

Die Zellen liegen **versetzt**, jede Reihe um eine halbe Zelle verschoben:
ein Dreiecksgitter, also dasselbe Muster, das ein Sechseckraster erzeugt —
derselbe Grund, aus dem die Vorlage auf H3-Sechsecke setzt. Auf dem geraden
Gitter standen die Nadeln in Spalten wie auf Karopapier, und das Auge sah eher
das Papier als das Land. Die Zellen bleiben dabei alle gleich gross: Spalten im
Abstand von 6 km, Reihen im Abstand von 6 km · √3/2, also 31 km² je Zelle und
11 665 belegte Zellen. Zugeordnet wird nach dem nächsten Zellenmittelpunkt,
wofür im versetzten Gitter zwei Reihen in Frage kommen und beide gerechnet
werden.

**Die Annahme:** innerhalb einer Gemeinde wohnen die Menschen gleichmässig
verteilt. Das stimmt nie ganz — es ist aber genau die Annahme, die jede
Flächenfärbung ohnehin macht, und sie steht auf der Seite.

Neun Bilder statt zehn: der Zeitpunkt 2024 liegt nur auf Kreisebene vor und
liesse sich nicht auf Gemeinden herunterbrechen, ohne Detail zu erfinden.

Gegengeprüft wird beim Bauen: die Summe der Gemeinden je Bild gegen die Summe
der Kreise aus `data/bevoelkerung_kreise_long.csv`, und die Summe nach dem
Rastern gegen die Summe davor. Beides 0,0000 %. Damit ist belegt, dass beide
Seiten dieselben Spalten zu denselben Bildern bündeln und beim Verteilen nichts
verloren geht.

### Kamera, Licht und Boden

Der Blick steht **fünfzig Grad über der Ebene**, von Süden nach Norden, Norden
also oben. Flacher — die erste Fassung schaute aus zwölf Grad und von der
falschen Seite — sieht man vor lauter Nadeln das Land nicht mehr und erkennt
die Karte nicht wieder; steiler verliert das Relief seine Tiefe. Gerechnet wird
mit einer echten Lochkamera, nicht mit einer Parallelprojektion: die vorderen
Nadeln sind grösser als die hinteren, und erst das macht die Tiefe. Der
Ausschnitt wird einmal über alles gelegt, was je zu sehen ist — jede Zelle am
Boden und mit ihrer höchsten Nadel über alle Bilder —, damit das Bild nicht
wandert, während die Zeit läuft. Die Bildhöhe folgt dem Inhalt statt einem
festen Format, sonst bliebe entweder Himmel übrig oder die Spitzen fielen
heraus.

Der Boden ist eine **gefüllte Platte**: die Aussengrenze, zu Ringen verkettet,
mit den Landesgrenzen als Strichen darauf, auf 3 500 Knoten generalisiert. Ohne
sie ist das Nadelfeld eine Wolke — aus fünfzig Grad sieht man zwischen den
Nadeln hindurch, und dass man auf Deutschland schaut, bliebe offen. Der leichte
Verlauf von hinten nach vorn ist keine Beleuchtung, sondern Luftperspektive.

Jede Nadel ist ein leicht verjüngter Körper: die Südseite trägt die Farbe der
Höhe, der Deckel dieselbe Farbe heller. Mehr Beleuchtung braucht ein Feld aus
lauter gleich ausgerichteten Säulen nicht — bei Licht aus Südwesten und 60°
über dem Horizont ist die waagerechte Fläche oben die hellste, und die
Südseiten sähen ohnehin alle gleich aus.

Gezeichnet wird nach dem Malerverfahren, von hinten nach vorn. Innerhalb einer
Reihe stehen alle Nadeln gleich weit weg, verdecken einander also nicht — und
lassen sich deshalb nach Farbe bündeln. Zellen, deren Nadel kürzer als zwei
Pixel wäre, sind aus diesem Winkel nichts als Kacheln auf dem Boden; sie werden
in einem Zug für das ganze Bild gebündelt. Aus zwölftausend einzelnen
Füllungen werden so etwa sechzehnhundert.

### Die Farbe des Reliefs

Dreizehn Stufen, in OKLab gleichmässig in der Helligkeit gestuft, von einem
Indigo, das kaum vom Boden absteht, bis zu hellem Gold. Perzeptuell
gleichmässig heisst: gleiche Schritte in der Zahl sind gleich grosse Schritte
im Eindruck. Beim Relief trägt die Helligkeit die Höhe, warm und hell oben auf
dunklem Grund — so treten die Türme hervor, noch bevor die Beleuchtung wirkt.
Ein Regenbogen täte das nicht.

Die Höhe wird mit einer Wurzelkurve (Exponent 0,55) auf die Stufen abgebildet:
linear bliebe das Land eine schwarze Fläche mit ein paar hellen Nadeln darin,
logarithmisch stünde schon jedes Dorf im Gold.

Der dunkle Grund gilt in beiden Erscheinungsbildern der Seite. Auf hellem Grund
liesse sich eine Helligkeitsleiter nicht von unten aufbauen; die Ansicht bringt
deshalb ihren eigenen Nachthimmel mit.

## 4b. Die beiden Farbskalen des Kartogramms

**People** färbt nach Einwohnern, logarithmisch von 30 000 bis 1,5 Millionen.
Die Grenzen sind mit Absicht runde Zahlen und nicht das Kleinste und Grösste
der Reihe: Berlin hatte 1939 über vier Millionen, und liesse man die Skala bis
dorthin laufen, sässe der halbe Rest im selben Blau. Die Skala ist für alle
Bilder dieselbe — dass die Karte über die Zeit nachdunkelt, ist deshalb kein
Kniff, sondern das Ergebnis.

**Which way** färbt nach der Veränderung je Jahr über den Abschnitt, zwischen
dessen beiden Zählungen die Karte gerade steht. Je Jahr, weil die Abstände sehr
verschieden sind: achteinhalb Jahre zwischen 1939 und 1946, sechsunddreissig
zwischen 1871 und 1900. Die Rate gehört dem Abschnitt, nicht einem Augenblick
darin: sie bleibt stehen, solange die Karte von einem Bild zum nächsten läuft.

An der Zählung sprang sie um — und ein Sprung mitten in einer laufenden
Bewegung sieht aus wie ein Fehler, nicht wie ein Befund. Sie blendet deshalb
über: im letzten Sechstel eines Abschnitts wandert sie hinüber zur Rate des
nächsten, im ersten Sechstel kommt sie von der des vorigen her, jeweils mit
einer weichen Kurve. Genau auf der Zählung stehen beide zur Hälfte — von links
und von rechts derselbe Wert, die Farbe läuft also durch. Die mittleren zwei
Drittel jedes Abschnitts zeigen seine Rate unverfälscht, und die Zahl in der
Sprechblase nennt immer die des Abschnitts, nie die überblendete.

Der Massstab endet bei ±3 % im Jahr und ist dazwischen nach asinh gestaucht.
Neun von zehn Werten liegen zwischen −1 und +2, aber der Sprung von 1939 auf
1946 reicht von −6 bis +9 — Flucht, Vertreibung, zerbombte Städte. Linear
gerechnet wäre alles andere grau; hart abgeschnitten wäre dieser eine Übergang
eine Fläche ohne Zeichnung. asinh gibt dem dichten Mittelfeld Auflösung und
lässt die Ränder atmen.

**Rot gegen Blau, nicht Rot gegen Grün.** Rot und Grün sind das eine Paar, das
etwa acht Prozent der Männer nicht trennen können; auf einer Karte mit 400
kleinen Flecken ist das nicht unschön, sondern unlesbar. Rot gegen Blau trägt
dieselbe Bedeutung — Rot verliert Menschen, Blau gewinnt welche, Grau hält sich
— und funktioniert bei jeder Form von Farbsehen. Beide Arme hören vor den
dunkelsten Stufen auf: ganz unten laufen Blau und Rot beide gegen Schwarz, und
dann ist die Richtung nicht mehr zu sehen.

Was die Karte **nicht** mehr zeigt: die Dichte je Quadratkilometer und den
Index gegen 1871. Beides stand einmal hier. Die Dichte, weil ein
Bevölkerungskartogramm sie ohnehin schon in der Verzerrung trägt — ein dichter
Kreis wird gross gezogen, das ist dieselbe Aussage zweimal. Der Index gegen
1871, weil er nur eine Antwort hatte: fast jeder Kreis ist gewachsen, die Karte
war blau, und das Interessante — wann und wo es gekippt ist — ging darin unter.
Genau das zeigt **Which way**.

## 5. Was geprüft ist

Drei Gegenproben laufen bei jedem Lauf von `quellen.py` mit:

| Prüfung | Ergebnis |
|---|---|
| Summe der Kreise gegen die Ländersummen derselben Quelle, alle 14 Spalten | **0,0000 %** |
| GPOP gegen das Historische Gemeindeverzeichnis Brandenburgs, 1910, 1939, 1946, 1964, 1985, je 18 Kreise | Mittel **0,07 bis 0,12 %**, grösste Einzelabweichung 1,24 % (Barnim 1910) |
| Fortschreibung 2019 gegen GV-ISys 2024 | grösste Änderung 7,5 %, plausibel als Zensuskorrektur |

Die zweite ist die aussagekräftigste: zwei **voneinander unabhängige**
Umrechnungen auf heutigen Gebietsstand — eine vom Amt für Statistik
Berlin-Brandenburg, eine von Roesel — kommen auf ein Zehntelprozent zusammen.
Das ist ein starker Hinweis darauf, dass beide Wege stimmen.

Dazu die Kennzahlen des Kartogramms. Gemessen wird an den ganzen Zahlen, die
in der Seite landen, nicht an den Gleitkommazahlen davor — was dort steht, ist
also das, was jemand am Bildschirm sieht:

| Grösse | Wert |
|---|---|
| Flächenabweichung, Median über alle 4 000 Zellen (400 Kreise × 10 Bilder) | **0,18 %** |
| Zellen über 1 % | 66 von 4 000 |
| grösste Einzelabweichung | 9,5 % — München in den frühen Bildern, eine kleine kreisfreie Stadt, die auf das Sechzehnfache ihrer Bodenfläche anschwellen muss |
| gefaltete Ringe | **0** |
| Generalisierung: Flächenverlust gegenüber VG2500 | 0,16 % |

## 6. Die vier Fallen

- **Oder-Neisse-Grenze.** Von der Quelle behandelt: für Görlitz, Frankfurt
  (Oder), Guben und Forst schätzt Roesel aus historischen Berichten, wie viele
  Menschen auf dem heute deutschen Teil lebten. Das sind die einzigen
  geschätzten Werte in der Tabelle; sie tragen den Vermerk in der Spalte
  `bemerkung`.
- **Gross-Berlin 1920.** Von der Quelle behandelt: die 1920 eingemeindeten
  Orte sind zurückgerechnet, Berlin hat 1871 deshalb 931 984 Einwohner statt
  der 826 000 der damaligen Stadt.
- **Saarland.** GPOP führt für das Saarland dieselben Zeitpunkte wie für alle
  anderen Länder; die Lücke der Reichszählungen 1925 und 1933 wird erst zum
  Problem, wenn diese beiden Zeitpunkte dazukommen.
- **Bevölkerungsbegriff.** Behandelt, siehe oben.

## 7. Die Datei

`data/bevoelkerung_kreise_long.csv`, eine Zeile je Kreis und Zeitpunkt,
4 000 Zeilen:

| Spalte | Inhalt |
|---|---|
| `kreis_ags` | fünfstelliger AGS des heutigen Kreises |
| `kreis_name` | Name nach GV-ISys |
| `jahr` | Name des Bildes; bündelt bei geteilten Zählungen zwei Stichtage, etwa „1961–1964" |
| `stichtag` | der wirkliche Tag der Zählung, ISO |
| `bevoelkerung` | Personen |
| `begriff` | ortsanwesende Bevölkerung, Wohnbevölkerung oder Fortschreibung |
| `methode` | A, B oder C |
| `anteil_interpoliert` | Anteil des Werts aus Flächeninterpolation, 0 bis 1 |
| `quelle` | Werk, Tabelle, Gebietsstand |
| `bemerkung` | welche Zählung, und bei den geteilten Städten der Hinweis auf die Schätzung |
