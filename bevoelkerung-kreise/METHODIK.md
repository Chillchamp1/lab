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

Der Grund ist immer der der Seite — eine Seite, ein Hintergrund. Auf hellem
Papier lässt sich eine Helligkeitsleiter nicht von unten aufbauen, also dreht
sie sich um: eine zweite Leiter, ebenfalls in OKLab, von einem Creme, das kaum
vom Boden absteht, über Gold, Orange und Rot ins tiefe Violett. Nicht die
umgedrehte Nachtleiter — die hätte in der Mitte ein lautes Orange, und damit
stünde auf hellem Grund das halbe Land in Flammen. Aus demselben Grund ist die
Kurve dort flacher (Exponent 0,72 statt 0,55): das flache Land bleibt länger im
Blassen. In beiden Fällen trägt die Helligkeit die Höhe, nur die Richtung
dreht sich.

## 4c. Die Untertitel

Dreizehn Notizen laufen unter der Jahreszahl mit, eine je Zeitabschnitt, in
allen drei Ansichten dieselben, weil sie nur an der Uhr hängen.

Sie sind **Zusammenhang, keine Daten**, und das steht auch auf der Seite. Was
darin eine Kreiszahl nennt — Gelsenkirchen 23 794 auf 219 501, Berlin minus 1,2
Millionen, Ostholstein von 103 951 auf 213 916, Essen 750 501 im Jahr 1961 —
stammt aus `data/bevoelkerung_kreise_long.csv` und lässt sich auf der Seite
selbst nachprüfen. Der Rest (zwölf Millionen Vertriebene, 2,7 Millionen
Republikflüchtlinge bis 1961, die Zensuskorrektur von 1,5 Millionen im Jahr
2011) ist Schulwissen.

Die Anzeigefenster sind nicht die Jahreszahlen des Ereignisses — die stehen in
der Überschrift der Notiz. Die Fenster stossen aneinander, damit immer eine
Notiz zu sehen ist. Gewechselt wird über Aus- und Einblenden, nicht hart.

Zu sehen ist davon in der Karte nur die **Überschrift**, und zwar in der Karte
selbst: oben links liegt ein Faden aus den letzten sechs, die neueste obenauf,
darunter die vorigen, mit jeder Zeile blasser. Kommt eine dazu, rutschen die
anderen eine Zeile nach unten.

Er liegt **über** der Zeichnung, nicht über dem Rahmen, und kostet deshalb keine
Höhe — die Karte soll so gross sein wie möglich, und über ihrer oberen linken
Ecke liegt in jedem Bild Nordsee. Lesbar bleibt die Schrift über einem
Farbfleck durch einen Halo in der Flächenfarbe. Auf einem Telefon bricht jede
Überschrift auf zwei Zeilen um; dort hält der Faden vier statt sechs.

Geschoben wird nicht Zeile für Zeile: der ganze Faden springt ohne Übergang um
eine Zeilenhöhe nach oben und läuft dann nach unten zurück. Weil die neue
Überschrift oben schon steht, sieht das aus, als drücke sie die anderen weg —
und kostet eine Bewegung statt sechs. Läuft die Uhr am Regler rückwärts, wird
der Faden neu aufgebaut statt fortgeschrieben.

Verschwinden tut dabei nichts: unter der Karte steht die vollständige Liste mit
allen Sätzen. Was vorbei ist, ist dort deutlich, die laufende Notiz ist
angestrichen, das Kommende ist blass.

## 4d. Was zwischen den Zählungen steht

Zwischen zwei Zählungen wurde geradlinig gerechnet. Das trifft die Zählungen
genau, aber die Bewegung knickt an jeder von ihnen: die Geschwindigkeit
springt. Ein Kreis, der zwischen 1946 und 1950 doppelt so schnell wächst wie
danach, wechselt das Tempo genau im Bild der Zählung — und das sieht aus wie
ein Ruck, oft genug, um zu stören.

Gerechnet wird deshalb mit einer **monotonen kubischen Kurve** (Fritsch–Carlson,
wie PCHIP), für die Werte, für die Knoten des Kartogramms und für die
Nadelhöhen. Sie geht durch jeden gezählten Wert und hat an den Zählungen keinen
Knick mehr. Der Unterschied zu einem gewöhnlichen Spline ist die Monotonie: wo
eine Reihe steigt und dann fällt, wird die Steigung an der Spitze auf null
gesetzt, statt eine Beule zu erfinden. Damit gilt: **zwischen zwei Zählungen
liegt kein Wert ausserhalb dieser beiden.** Ein Kreis hat unterwegs nie mehr
Menschen als in einem der beiden Bilder, und eine Ecke der Karte wandert nie
über den Ort hinaus, den sie in beiden hat.

Nachgemessen an 900 Stellen der Zeitachse: das Überschiessen über die
Zählwerte ist **0,0000 %**, der grösste Sprung der Bewegungsgeschwindigkeit
fällt von **74 % auf 12,8 %** (er bleibt, wo eine Reihe kippt — dort ist die
Steigung mit Absicht null), und kein Ring dreht unterwegs seine Orientierung
um, es entstehen also keine Faltungen.

## 4e. Die Uhr

Die Uhr braucht 70 Sekunden für die 153 Jahre. Wie viel davon ein Abschnitt
bekommt, hängt an zwei Dingen zugleich: **wie lang er dauerte und wie viel sich
in ihm umschichtete**. Genommen wird das geometrische Mittel aus beiden
Anteilen — dem an der Summe der Jahre und dem an der Summe aller Veränderungen
je Kreis (Σ|Bevölkerung(b) − Bevölkerung(a)|).

Dazu eine **Untergrenze von viereinhalb Sekunden** (Anteil 4,5/70): darunter ist ein Abschnitt
vorbei, ehe seine Notiz gelesen ist. Das betrifft das Ende der Reihe, wo die
Zählungen dicht liegen — 2011 bis 2019 und 2019 bis 2024 bekämen sonst zwei
Sekunden und weniger. Wer über der Grenze liegt, gibt anteilig ab.

| Abschnitt | Jahre | Umschichtung | Spielzeit |
|---|---|---|---|
| 1871 → 1900–1910 | 34,0 | 18,6 Mio | 11,5 s |
| 1900–1910 → 1939 | 33,5 | 11,9 Mio | 8,6 s |
| 1939 → 1946–1950 | 9,4 | 14,5 Mio | 4,9 s |
| 1946–1950 → 1961–1964 | 14,5 | 12,0 Mio | 5,8 s |
| 1961–1964 → 1985–1987 | 23,5 | 10,4 Mio | 7,1 s |
| 1985–1987 → 1996 | 10,3 | 7,1 Mio | 4,5 s |
| 1996 → 2011 | 14,4 | 4,7 Mio | 4,5 s |
| 2011 → 2019 | 8,6 | 4,0 Mio | 4,5 s |
| 2019 → 2024 | 5,0 | 1,6 Mio | 4,5 s |

Rein nach Jahren bekäme der Bruch von 1939 auf 1946 drei Sekunden — die
gewaltigste Umwälzung der ganzen Reihe, vorbei, ehe man hinsieht. Rein nach
Umschichtung wäre die Zeitachse keine mehr. So bekommt er fünf, und die langen
ruhigen Strecken behalten trotzdem den grössten Teil, weil sie am längsten sind.

Der Regler misst entsprechend **Spielzeit**, und die Marken der Zählungen sitzen
dort, wo sie im Ablauf liegen. Die Jahreszahl im Rahmen zeigt weiter das
wirkliche Jahr; innerhalb eines Abschnitts läuft sie gleichmässig.

Die Steigungen der weichen Kurve (4d) werden auf derselben Spielzeitachse
gerechnet. Das ist der Punkt: sichtbar ist Bewegung je Sekunde, nicht je Jahr,
und ohne diesen Bezug entstünde an jeder Zählung genau der Knick zurück, den
4d beseitigt.

## 4f. Der Regler zwischen Landkarte und Kartogramm

Ein Kartogramm steckt die ganze Bevölkerung in die Fläche. Bei Berlin heisst
das: 0,25 Prozent des Bodens werden zu 4,4 Prozent der Karte, ein Faktor 17,6,
und Deutschland sieht nicht mehr wie Deutschland aus. Eine Landkarte mit Höhen
steckt sie ganz in die Höhe: die Form stimmt, aber die Städte sind Nadeln auf
einer Fläche, die man nicht mehr trifft.

Die Seite lässt beides nebeneinander stehen und dazwischen einen Zwischenschritt
— drei Knöpfe unter dem Regler:

| | Berlins Anteil an der Karte | Berlins Höhe | Höhenspanne im Bild |
|---|---|---|---|
| **Real map** | 0,25 % | 17,8 × Mittel | 134 : 1 |
| **Half and half** | 1,75 % | 2,5 × Mittel | 9 : 1 |
| **Cartogram** | 4,41 % | 1,0 × Mittel | 1 : 1 |

Der Tausch ist exakt: 1,75 × 2,5 = 4,4 = 0,25 × 17,8. **Volumen bleibt
Bevölkerung**, in jeder Stellung.

### Wie die Zwischenform entsteht

Nicht als eigenes Kartogramm. Die Landkarte steht schon in der Nutzlast — sie
ist der Anfang der Differenzkette, aus der jeder Zustand entsteht —, also liegt
jeder Knoten für einen Wert *a* zwischen 0 und 1 einfach bei

    Ort(a) = Landkarte + a · (Kartogramm − Landkarte)

Das kostet **kein einziges Zeichen mehr** in der Datei, und die Bewegung beim
Umschalten ist dieselbe weiche Verschiebung, die auch zwischen zwei Zählungen
läuft. Der Preis: die Flächen der Zwischenform folgen keiner geschlossenen
Formel. Ein eigens gerechnetes Teilkartogramm mit der Masse
*Bevölkerung^a · Fläche^(1−a)* träfe genau *Fläche ∝ P^a · G^(1−a)* — kostete
aber je Zwischenschritt eine eigene Zeitreihe (rund vierzig Minuten Rechnen und
etwa 250 kB mehr in der Seite).

Gebraucht wird die Formel gar nicht, weil die Höhe **gemessen** statt gerechnet
wird:

    Höhe = Bevölkerung / gezeichnete Fläche,  bezogen auf die mittlere Dichte des Bildes

Die gezeichnete Fläche steht ohnehin zur Verfügung — sie wird je Bild aus den
Umrissen gerechnet, dieselbe Schleife, die auch die Städtenamen setzt. Damit
stimmt Fläche × Höhe = Bevölkerung bei *jedem* Zwischenwert von selbst, ohne
dass die Zwischenform ein eigenes Kartogramm bräuchte. Im vollen Kartogramm
kommt für jeden Kreis die Höhe 1 heraus (gemessen 0,99 bis 1,00), und die Karte
sieht aus wie vorher.

### Dass sich dabei nichts umstülpt

Eine lineare Mischung zweier knickfreier Formen muss selbst nicht knickfrei
sein. Also wird beim Bauen nachgezählt, für *a* = 0,25, 0,5 und 0,75 über alle
zehn Bilder: **0 gefaltete Ringe von 4650**.

### Und dass die Höhe gestaucht gezeichnet wird

Zwischen dem leersten Landkreis und Berlin liegt auf der Landkarte der Faktor
134. Ein Relief mit Faktor 134 ist eine senkrechte Wand neben einer Ebene, in
der nichts mehr zu unterscheiden ist. Gezeichnet wird deshalb

    Grauwert = 0,34 + 0,66 · (Höhe / höchste Höhe)^0,45

— ein Sockel, damit die Ebene eine Ebene bleibt und nicht im Dunkeln liegt, und
eine Wurzel, die sich beleuchten lässt. Die **Reihenfolge bleibt richtig, der
Abstand nicht**; die Zahl selbst steht beim Antippen („Stands 2,5 × average").
Im vollen Kartogramm sind alle Höhen gleich, dann ist beides wirkungslos.

Was hier nicht gemacht wird: die Karte kippen und die Kreise wirklich
extrudieren. Perspektive verzerrt Flächen, und dann liesse sich die eine Aussage
dieser Karte nicht mehr ablesen. Wer wirkliche Höhe von der Seite sehen will,
findet sie in der dritten Ansicht, dem Nadelrelief.

## 4g. Das Relief der Karte

Die Karte liegt nicht flach, sondern wölbt sich. Drei Fassungen hat das
gebraucht, und die beiden verworfenen sagen am meisten darüber, worauf es
ankommt.

**Erste Fassung: Kanten.** An jeder Kreisgrenze ein heller Strich oben links,
ein dunkler unten rechts. Rechnerisch richtig — gleich breite Ränder heissen
gleiche Dicke —, aber es sah aus wie eine Kontur und nicht wie ein Körper.

**Zweite Fassung: ein Höhenfeld mit Lambert-Beleuchtung.** Richtiger, aber zu
schwach: eine Schattierung, die über eine farbige Fläche gelegt wird, muss
sehr kräftig werden, ehe sie als Form gelesen wird — und dann ist von Rot und
Blau nichts mehr übrig. Das ist kein Einstellungsfehler, sondern der Kern des
Problems: **die Fläche ist schon vergeben.** Sie trägt die Farbe, und die Farbe
sind die Daten.

**Dritte Fassung: Linien statt Fläche.** Linien nehmen fast keine Fläche weg.

### Das Höhenfeld

1. Eine Vorlage: jeder Kreis in seinem Grauwert (das ist seine Höhe, siehe 4f),
   die Fugen zwischen ihnen schwarz und überall gleich breit (`breite/420`).
   Draussen bleibt sie durchsichtig. Gezeichnet in vierundzwanzig Bündeln statt
   in vierhundert Füllungen.
2. Zweimal weichgezeichnet — einmal knapp (`breite/95`), einmal weit
   (`breite/22`, auf einer dreimal gröberen Leinwand). Das knappe Feld trägt
   den einzelnen Kreis, das weite die Landschaft darüber; gemischt 40 zu 60.
3. **Gelesen in zwei Kanälen**, und das ist der Kniff. Weichzeichnen mischt am
   Rand Farbe mit Nichts; nähme man das Ergebnis einfach als Höhe, fiele die
   Karte schon dreissig Pixel vor der Küste ab, und der grösste Berg im Feld
   wäre Deutschland selbst. `getImageData` gibt die Farbe aber
   **unmultipliziert** zurück: Rot ist bereits blur(Höhe·Deckung) /
   blur(Deckung), also der örtliche Mittelwert der Höhe **ohne** den Rand — die
   normalisierte Faltung, geschenkt. Die Deckung steht daneben im Alphakanal
   und gibt den Rand als eigene, schmale Rundung. Damit gehört die ganze
   Höhenspanne dem Inneren.

### Was daraus gezeichnet wird

**Schattierung**, aus dem Gefälle des Feldes die Normale, Lambert von oben
links, 40 Grad über der Fläche. Aufgetragen als *Grau* im Mischmodus `overlay`
(auf dunklem Grund `soft-light`), nicht als schwarze und weisse Deckkraft:
Deckkraft zieht jede Farbe gegen Schwarz oder Weiss, `overlay` rechnet den Ton
gegen die Farbe, die schon da liegt — dunkler wird dunkler, heller heller, der
Farbton bleibt.

**Mulden.** Was tiefer liegt als seine weite Umgebung, bekommt weniger Himmel
ab; dasselbe, was in einem Tal weniger Licht ankommen lässt.

**Schlagschatten**, in einem einzigen Durchgang. Das Licht kommt aus genau 45
Grad von oben links, also laufen die Strahlen auf der Leinwand diagonal, und je
Diagonale genügt ein mitgeführter Horizont:

    s = max(s − Abfall, Höhe),   und im Schatten liegt, was unter s bleibt.

Dabei steht die Sonne **flacher als bei der Schattierung** (16 statt 40 Grad),
und das ist kein Versehen: ein Strahl, der steiler abfällt als der Hang selbst,
trifft nie auf Schatten — bei 40 Grad gäbe es über diesen sanften Kuppen
überhaupt keinen. Kartenzeichner trennen die beiden Lichter seit jeher.

**Beleuchtete Höhenlinien, nach Tanaka Kitiro (1950).** Das ist das Stück, das
die Form wirklich trägt. Eine gewöhnliche Höhenlinie ist überall gleich dunkel
und sagt nur, wo gleiche Höhe liegt. Tanakas Linien werden **weiss, wo der Hang
der Sonne zugewandt ist, und schwarz, wo er von ihr wegfällt**, und dick, wo
der Hang voll im Licht oder voll im Schatten steht. Sie tragen damit dieselbe
Auskunft wie eine Schattierung — aber als Kante, und eine Kante sieht das Auge
sehr viel deutlicher als einen Verlauf. Vor allem: sie kosten fast keine
Fläche, die Farbe der Kreise bleibt.

Gerechnet aus dem **weiten** Feld, nicht aus dem gemischten: das enge hat an
jeder Kreisgrenze eine Stufe, und auf einer Stufe lägen alle Niveaus
übereinander — das gäbe einen Strich an jeder Grenze statt einer Höhenlinie.
Dreissig Niveaus über die volle Höhe. Zwei Bremsen halten sie sauber: über fast
ebenem Land blenden sie mit dem Gefälle ein (sonst sind sie Kratzer), und wo
das Feld so steil abfällt, dass die Niveaus auf weniger als zwei Bildpunkte
zusammenrücken, blenden sie wieder aus (sonst flimmern sie).

Zwei Lagen also, weil sie verschieden gemischt gehören: die Schattierung als
Grau im Modus `overlay`, die Linien schlicht darüber.

Die Fugen sind dabei überall gleich breit. Wie hoch ein Kreis steht, sagt 4f:
im vollen Kartogramm für alle dasselbe, sonst Bevölkerung durch gezeichnete
Fläche.

> Volumen = Fläche × Höhe ∝ Bevölkerung — in jeder Stellung des Reglers.

Dass im vollen Kartogramm trotzdem die grossen Städte aufgehen, ist deshalb kein
zweiter Datensatz und keine zweite Farbskala, sondern folgt aus der ersten: ein
Kreis mit vielen Menschen ist breit gezeichnet, kommt weit von seinen Fugen weg
und erreicht die volle Höhe; ein kleiner erreicht sie nie und bleibt ein flaches
Kissen.

Darunter liegt die ganze Platte: derselbe Pfad zweimal versetzt gefüllt, weit
unten und weich als Schatten, knapp darunter als Kante. Weil die Kreise die
Fläche lückenlos teilen, ist die Vereinigung ihrer Umrisse zugleich die
Silhouette der Karte; beides braucht denselben Pfad, und der entsteht ohnehin.

Gerechnet wird das Höhenfeld auf **40 Prozent** der Bildpunkte, das weite Feld
noch einmal dreimal gröber — Weichzeichnen kostet nach Fläche, und ein Feld, das
nur die grosse Form trägt, braucht die Auflösung nicht. Beschnitten wird nicht
mit `clip` an einem Pfad aus vierhundert Vielecken, sondern mit derselben
Vorlage als Schablone (`destination-in`); die Linienlage braucht nicht einmal
das, weil das weite Feld ausserhalb der Karte null und damit eben ist.

## 4h. Die Städtenamen

Die grössten Städte tragen ihren Namen: die kreisfreien Städte und Stadtkreise,
die in irgendeinem Bild über 400 000 Menschen haben, dazu die Region Hannover,
in der die Stadt 2001 aufgegangen ist. Achtzehn Namen sind es insgesamt; zu
sehen sind je nach Bild weniger.

**Alle Namen stehen von Anfang an da**, auch 1871, wo die Flecken winzig sind.
Ein Name, der im Lauf der Zeit erscheint oder verschwindet, ist ein Sprung im
Bild, und davon hat die Karte genug.

Damit das geht, sind zwei Dinge nötig. Erstens eine **Untergrenze**: die
Schrifthöhe folgt der Wurzel aus der gezeichneten Fläche — wächst also mit dem
Fleck, nicht mit der Einwohnerzahl —, fällt aber nie unter sieben Pixel. Das ist
knapp, auf einem Telefon mit dreifacher Pixeldichte aber gut zu lesen, und es
hält die Namen 1871 so klein, dass sie die Karte nicht zudecken. Zweitens **Abstand**: aus jedem Bündel
eng benachbarter Städte bleibt die grösste, gemessen mit sechzig Kilometern auf
dem Boden. Sonst trügen Rhein und Ruhr auf einem daumengrossen Bild sieben
Namen. Übrig bleiben dreizehn.

Wo zwei Namen einander trotzdem berühren, weichen beide aus: ein paar Runden
Abstossen entlang der kleineren Überlappung, dazu eine schwache Feder, die
jeden zu seinem Fleck zurückzieht. Das Ergebnis ändert sich von Bild zu Bild
ruhig, flackert also nicht. Wer dabei weit von seinem Fleck weggerutscht ist,
bekommt einen Haarstrich dorthin zurück.

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
über — aber **nur nach hinten**: an der Zählung gilt noch die alte Rate, und
erst im ersten Sechstel des neuen Abschnitts wandert die Farbe mit einer
weichen Kurve zur neuen hinüber. Die Farbe läuft damit durch, ohne zu springen,
und die Zahl in der Sprechblase nennt weiter die Rate des Abschnitts.

Die erste Fassung blendete in beide Richtungen, und das war falsch: bei einem
Abschnitt von neunundzwanzig Jahren reicht ein Sechstel fünf Jahre weit, also
färbten sich die Städte schon **1934** rot — sie zeigten den Einbruch von 1939
bis 1946, den es noch gar nicht gab. Nichts auf dieser Karte nimmt mehr etwas
vorweg: was zu sehen ist, ist gezählt oder schon vorbei. Nachgemessen: von 1910
bis 1939 zeigen Berlin, Hamburg, Essen und Dortmund durchgehend ihre gemessenen
+0,5 bis +1,2 % im Jahr, und erst nach 1939 kippt es auf −2,3 bis −3,6.

Zu unterscheiden davon ist die Glättung der **Werte** (4d): die schiesst nie
über eine Zählung hinaus und lässt einen wachsenden Kreis auch nie unterwegs
schrumpfen — nachgemessen über den Abschnitt 1910 bis 1939, kein einziger
Rückgang bei keinem der 400 Kreise.

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
— und funktioniert bei jeder Form von Farbsehen.

### Zwei Leitern je Farbe, nicht eine umgedrehte

Die erste Fassung hatte je Farbe **eine** Leiter und drehte sie auf dunklem
Grund um. Der Gedanke dahinter: der Schritt neben der Fläche soll immer „wenig"
heissen, also hell auf hellem Grund, dunkel auf dunklem. Das Ergebnis war
falsch herum: umgedreht wird „viel" nachts fast weiss, und ein **blassblauer
Höchstwert neben einem tiefblauen Nichts** liest sich gegen jede Erwartung.
Dasselbe am roten Arm: der stärkste Rückgang kam als hellrosa heraus.

Beide Leitern laufen jetzt in dieselbe Richtung — **mehr ist satter**. Auf
hellem Grund wird dabei auch dunkler (blass nach tiefblau), auf dunklem steigt
vor allem die Buntheit: von einem fast grauen Blaugrau, das gerade über der
Fläche liegt (OKLab L 0,37, C 0,02), bis zu einem kräftigen Azur (L 0,64,
C 0,21). Der rote Arm spiegelt das bei gleicher Helligkeit, damit in der
Richtungsskala keine Seite die andere überstrahlt. Gerechnet in OKLab, damit
die dreizehn Stufen gleich weit auseinanderliegen.

Auf hellem Grund hören beide Arme weiter vor den dunkelsten Stufen auf: dort
laufen Blau und Rot beide gegen Schwarz, und dann ist die Richtung nicht mehr
zu sehen. Auf dunklem Grund ist das nicht nötig — die Arme enden dort in
kräftigem Azur und kräftigem Zinnober und bleiben bis zuletzt zu trennen.

Was die Karte **nicht** mehr zeigt: das Gitternetz, die Dichte je
Quadratkilometer und den Index gegen 1871.

Das **Gitternetz** — Quadrate zu 30 × 30 km echter Fläche, die im Kartogramm
mitschwammen — war eine Fassung lang da und ist wieder weg. Es zeigte die
Verzerrung, die das Kartogramm aufgewendet hat, und war als Idee richtig; nur
brachte es neben Relief und Formregler zu wenig für den Platz, den es auf der
Fläche nahm. Den Regler zwischen Landkarte und Kartogramm (4f) beantwortet
dieselbe Frage besser: man sieht die Verzerrung entstehen, statt sie
abzulesen. Die 713 Knoten sind wieder aus dem Modell heraus.

Dichte und Index standen ebenfalls einmal hier. Die Dichte, weil ein
Bevölkerungskartogramm sie ohnehin schon in der Verzerrung trägt — ein dichter
Kreis wird gross gezogen, das ist dieselbe Aussage zweimal, und im
Zwischenschritt des Formreglers steht sie ausserdem als Höhe da. Der Index gegen
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
