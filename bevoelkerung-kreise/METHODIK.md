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

## 4c. Die Untertitel

Dreizehn Notizen laufen unter der Jahreszahl mit, eine je Zeitabschnitt; sie
hängen nur an der Uhr, gelten also in jeder Form der Karte. Die laufende steht
**ausgeschrieben** da, mit Überschrift und Sätzen — sie hat den Platz, also
bekommt sie ihn. Darunter hängt der Faden der vorigen Überschriften.

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

Von den vorigen bleibt nur die **Überschrift** stehen: unter der laufenden
Notiz hängt ein Faden aus den letzten sechs, die jüngste obenauf, darunter die
älteren, mit jeder Zeile blasser. Kommt eine dazu, rutschen die anderen eine
Zeile nach unten.

Notiz und Faden liegen zusammen **über der Bühne, nicht in ihr** (siehe unten),
kosten der Karte also keine Höhe. Auf einem Telefon bricht jede Überschrift auf
zwei Zeilen um; dort hält der Faden drei statt sechs.

### Drei Ebenen

Der Text stand einmal über der Karte im Fluss und schob sie nach unten: eine
lange Notiz kostete der Karte vier Zeilen Höhe, eine kurze gab sie zurück, und
die Karte sprang bei jedem Notizwechsel. Jetzt liegt er darüber und nimmt
keinen Platz mehr weg — die Karte bekommt in jedem Format die ganze Fläche.

Damit stellt sich die Frage, was oben liegt. Die Leinwand ist draussen
durchsichtig, also:

| Ebene | |
|---|---|
| 2 | Jahr und Einwohnerzahl, mit Schein dahinter — die eine Zeile, die immer lesbar sein muss |
| 1 | die Karte |
| 0 | Notiz und Faden — **hinter** der Karte |

Wo Platz ist, stehen Notiz und Faden da; wo die Karte hinreicht, verschwinden
sie dahinter. Der Text weicht der Karte also aus, statt sie zu verdrängen. Auf
einem Telefon im Hochformat ist die Karte breitenbegrenzt und lässt oben Rand,
dort steht die Notiz fast vollständig frei; auf einem breiten Schirm füllt die
Karte die Bühne und nimmt sich den Platz.

Und die Karte steht dort **nicht senkrecht mittig, sondern unten**. Sie hat ein
festes Seitenverhältnis; im Hochformat begrenzt die Breite sie, und was an Höhe
übrig bleibt, lag zur Hälfte oben und zur Hälfte unten. Oben aber steht der
Text, und unten stand nichts — ein Loch von gut hundert Bildpunkten über der
Legende. Jetzt rückt die Karte bis kurz vor die Legende und der freie Platz
gehört ganz dem Text. Ein Achtel Rest bleibt unten, damit sie nicht anstösst.
Im Querformat, wo die Höhe die Karte begrenzt, ist der Rest null und die Regel
tut nichts.

Geschoben wird nicht Zeile für Zeile: der ganze Faden springt ohne Übergang um
eine Zeilenhöhe nach oben und läuft dann nach unten zurück. Weil die neue
Überschrift oben schon steht, sieht das aus, als drücke sie die anderen weg —
und kostet eine Bewegung statt sechs. Läuft die Uhr am Regler rückwärts, wird
der Faden neu aufgebaut statt fortgeschrieben.

## 4d. Was zwischen den Zählungen steht

Zwischen zwei Zählungen wurde geradlinig gerechnet. Das trifft die Zählungen
genau, aber die Bewegung knickt an jeder von ihnen: die Geschwindigkeit
springt. Ein Kreis, der zwischen 1946 und 1950 doppelt so schnell wächst wie
danach, wechselt das Tempo genau im Bild der Zählung — und das sieht aus wie
ein Ruck, oft genug, um zu stören.

Gerechnet wird deshalb mit einer **monotonen kubischen Kurve** (Fritsch–Carlson,
wie PCHIP), für die Werte wie für die Knoten des Kartogramms. Sie geht durch
jeden gezählten Wert und hat an den Zählungen keinen
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
steckt sie ganz in die Höhe: die Form stimmt, aber die Städte sind Spitzen auf
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
der nichts mehr zu unterscheiden ist. Gestaucht wird deshalb **logarithmisch**,
auf die gemessene Spanne der Farbleiter (4b):

    Feldwert = (ln Höhe − unteres Leiterende) / Spanne,
               auf −⅛ … 1+⅛ geklemmt und auf 0 … 1 gelegt

Damit steht im Höhenfeld dieselbe Zahl, die auch die Farbe zeigt — und das ist
der ganze Punkt (4b, „Eine Zahl, drei Darstellungen"). Die **Reihenfolge bleibt
richtig, der Abstand nicht**; die Zahl selbst steht beim Antippen („Stands
2,5 × average"). Im vollen Kartogramm sind alle Höhen gleich, dann ist es
wirkungslos.

Das Achtel Luft über und unter der Leiter ist nicht Kosmetik: die Spanne ist an
den Enden gekappt, und ohne Luft bekäme der dichteste Fleck einen
abgeschnittenen Gipfel — ein Plateau ohne Modellierung. Und die Zahl ist mit
Bedacht ein Achtel, siehe die Höhenlinien weiter unten.

Was hier nicht gemacht wird: die Karte kippen und die Kreise wirklich
extrudieren. Perspektive verzerrt Flächen, und dann liesse sich die eine Aussage
dieser Karte nicht mehr ablesen. Die Höhe steht deshalb senkrecht von oben da,
als Licht, Schatten und Höhenlinie — die Machart einer Reliefkarte, nicht die
eines Modells.

## 4g. Das Relief der Karte

Die Karte liegt nicht flach, sondern wölbt sich. Drei Fassungen hat das
gebraucht, und die beiden verworfenen sagen am meisten darüber, worauf es
ankommt.

**Erste Fassung: Kanten.** An jeder Kreisgrenze ein heller Strich oben links,
ein dunkler unten rechts. Rechnerisch richtig — gleich breite Ränder heissen
gleiche Dicke —, aber es sah aus wie eine Kontur und nicht wie ein Körper.

**Zweite Fassung: ein Höhenfeld mit Lambert-Beleuchtung.** Richtiger, aber zu
schwach: eine Schattierung, die über eine farbige Fläche gelegt wird, muss
sehr kräftig werden, ehe sie als Form gelesen wird — und dann ist von der Farbe
nichts mehr übrig (damals war das Rot gegen Blau, heute ist es die Geländeleiter;
am Befund ändert das nichts). Das ist kein Einstellungsfehler, sondern der Kern
des Problems: **die Fläche ist schon vergeben.** Sie trägt die Farbe, und die
Farbe sind die Daten.

**Dritte Fassung: Linien statt Fläche.** Linien nehmen fast keine Fläche weg.

### Das Höhenfeld

1. Eine Vorlage: jeder Kreis in seinem Grauwert (das ist seine Höhe, siehe 4f),
   die Kreise unmittelbar aneinanderstossend. Draussen bleibt sie durchsichtig.
   Gezeichnet in Bündeln gleicher Höhenstufe statt in vierhundert Füllungen —
   und jedes Bündel wird in seinem eigenen Grau noch einmal umrandet, weil die
   Kantenglättung sonst zwischen zwei Bündeln einen halb durchsichtigen Spalt
   stehen lässt, aus dem nach dem Weichzeichnen eine Kerbe wird.
2. Zweimal weichgezeichnet — einmal knapp (`breite/95`), einmal weit
   (`breite/22`). Das knappe Feld trägt den einzelnen Kreis, das weite die
   Landschaft darüber; gemischt 40 zu 60. Das weite entstand eine Fassung lang
   auf einer dreimal gröberen Leinwand, weil Weichzeichnen nach Fläche kostet.
   Für die Schattierung reichte das, für die Höhenlinien nicht: aus einem
   dreifach hochgerechneten Feld werden zappelige Linien mit einem Knick an
   jeder Stützstelle. Jetzt in voller Auflösung — Weichzeichnen ist ohnehin
   linear in der Fläche und nicht im Radius, der Aufpreis also überschaubar.
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
links, 40 Grad über der Fläche. Aufgetragen als *Grau* im Mischmodus
`soft-light`, nicht als schwarze und weisse Deckkraft: Deckkraft zieht jede
Farbe gegen Schwarz oder Weiss, ein Mischmodus rechnet den Ton gegen die Farbe,
die schon da liegt — dunkler wird dunkler, heller heller, der Farbton bleibt.
`overlay` täte dasselbe und war lange eingestellt, rechnet aber um das mittlere
Grau herum und lässt dunkle Farben fast unberührt; auf schwarzem Grund ist
dieser Karte fast alles dunkel, also `soft-light`, das auch tiefe Töne noch
hebt — und dafür eine kräftigere Stärke verträgt.

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

### Verfolgt, nicht gemalt

Die ersten Fassungen malten die Linien **ins Höhenfeld**, also in ein Raster von
vierzig bis zweiundsechzig Prozent der Bildpunkte, und rechneten dieses Bild
hinterher auf die Leinwand hoch. Das kann nicht scharf werden, und die
Auflösung zu erhöhen half jedes Mal nur ein Stück weit: eine Linie ist ein bis
zwei Rasterpunkte breit, und zwei Punkte, um das Anderthalb- bis
Zweieinhalbfache gestreckt und weichgezeichnet, sind ein Schmier mit
ungleichmässigem Rand. Das war das Zappeln, und es war nicht wegzustellen.

Jetzt werden die Linien **verfolgt**: Marching Squares über das weite Feld
liefert sie als Strecken, und gezeichnet werden sie als Pfade auf der Leinwand
selbst — mit deren voller Auflösung und deren Kantenglättung. Das Höhenfeld
darf dafür grob bleiben (55 Prozent): es ist über fünfzehn Punkte
weichgezeichnet, und die Stützstellen einer Linie dürfen weiter auseinander
liegen als ein Bildpunkt, solange die Linie selbst scharf ist. Verfolgt wird
auf einem Gitter von zwei Feldpunkten, also gut drei Bildpunkten je
Stützstelle.

### Die Strecken werden zu Linien verkettet

Die erste verfolgte Fassung zeichnete jede Strecke für sich, mit einer Stärke
aus ihrer eigenen Zelle. Das ergab keine Höhenlinie, sondern eine Reihe von
Strichen: die Beleuchtung springt von Zelle zu Zelle um ein paar Prozent, und
bei zwölf Stufen fällt eine Strecke schon bei kleinsten Unterschieden in eine
andere Stärke als ihre Nachbarin. Es sah gepunktet aus, und die Frage „sind das
überhaupt Höhenlinien?" war berechtigt.

Also verkettet. Jede Kante des Verfolgungsgitters kann von einer Linie
geschnitten werden, und jede Kante gehört zu genau zwei Zellen — daraus ergibt
sich die Kette von selbst: notiere je Kante den Schnittpunkt und die ein bis
zwei Kanten, mit denen sie in ihren Zellen verbunden ist, und laufe hinterher
durch. Erst die offenen Ketten (eine Kante mit nur einem Nachbarn ist ein
Anfang), dann die geschlossenen Ringe.

Auf der fertigen Kette wird die Beleuchtung **längs geglättet** — zwei
Durchgänge eines Dreipunktmittels —, und die Linie in Läufe gleicher Stärke
zerlegt, die sich um eine Stützstelle überlappen. Gezeichnet wird als weiche
Kurve durch die Mittelpunkte der Stützstellen. Damit ist eine Höhenlinie eine
Linie: durchgehend, mit einem Verlauf von Weiss über Nichts nach Schwarz, wie
sie um eine Kuppe herumläuft.

Die Buchhaltung wird einmal angelegt und über alle Niveaus und alle Bilder
wiederbenutzt; ein fortlaufender Stempel erspart das Leeren. Fortlaufend über
die **Bilder**, nicht nur über die Niveaus eines Bildes — sonst trüge die
Buchhaltung im zweiten Bild noch die Marken des ersten, hielte jede Kante für
schon gesetzt und fände keine einzige Linie. (Genau so ist es beim ersten
Versuch gewesen: das erste Bild hatte Linien, alle weiteren nicht.)

Je Zelle wird einmal gerechnet, was für alle Niveaus darin gilt, und nur die
Niveaus zwischen dem kleinsten und grössten Eckwert werden überhaupt
betrachtet; das ist meist keines oder eines von zwanzig. Gebündelt wird nach
Beleuchtungsstärke: zwölf Stufen, hell und dunkel, also **vierundzwanzig Züge
für die ganze Karte** statt zweitausend einzelner Striche.

Gerechnet aus **demselben Feld, aus dem die Farbe kommt** — dem gemischten aus
eng und weit, 40 zu 60. Eine Fassung lang war es das weite allein, weil das
enge an jeder Kreisgrenze eine Stufe hatte und auf einer Stufe alle Niveaus
übereinanderlägen. Diese Stufen sind weg, seit die Fugen weg sind (4g), und
dafür ist etwas anderes wichtiger geworden: Farbe und Linie müssen aus derselben
Zahl kommen, sonst laufen sie auseinander.

**Zwanzig Niveaus**, und sie decken die Karte **flächendeckend**
— das war eine Fassung lang anders. Wer die Linien über flachem Land wegblendet,
lässt über den Hängen einzelne lange Striche stehen, und die lesen sich als
Tintenstrich statt als Gelände; erst im Verbund einer Schar wird eine Linie zur
Höhenlinie. Drei Dinge halten sie trotzdem sauber:

- Über wirklich ebenem Land blenden sie mit dem Gefälle ein — sonst sind sie
  Kratzer.
- Wo zwei Niveaus auf der Leinwand unter vier Bildpunkte zusammenrücken,
  blenden sie aus — sonst verschmelzen sie zur Fläche.
- Eine Zelle, deren vier Ecken nicht ganz auf der Karte liegen, wird
  übersprungen. Das erspart das Beschneiden an einem Pfad aus vierhundert
  Vielecken und lässt der Küste einen schmalen, linienfreien Saum — der sieht
  ohnehin besser aus.

Zwei Lagen also, weil sie verschieden gehören: die Schattierung als Grau im
Modus `overlay` über die Fläche, die Linien als Pfade darüber.

Wie hoch ein Kreis steht, sagt 4f: im vollen Kartogramm für alle dasselbe, sonst
Bevölkerung durch gezeichnete Fläche.

> Volumen = Fläche × Höhe ∝ Bevölkerung — in jeder Stellung des Reglers.

**Eine Fassung lang lag auf jeder Kreisgrenze eine schwarze Fuge** (`breite/420`),
damit jeder Kreis als eigene Platte modelliert wurde. Sie ist weg. Eine Fuge ist
eine Grenze, nur als Relief gezeichnet statt als Linie — und sie blieb sichtbar,
als die Linien längst weg waren: ein Netz feiner Gräben über dem ganzen Land, an
Stellen, wo sich nichts ändert ausser der Zuständigkeit. Jetzt stossen die
Plateaus unmittelbar aneinander, das enge Weichzeichnen macht aus der Stufe
einen Hang, und es bleibt ein durchgehendes Gelände statt eines Mosaiks.

Darunter liegt die ganze Platte: derselbe Pfad zweimal versetzt gefüllt, weit
unten und weich als Schatten, knapp darunter als Kante. Weil die Kreise die
Fläche lückenlos teilen, ist die Vereinigung ihrer Umrisse zugleich die
Silhouette der Karte; beides braucht denselben Pfad, und der entsteht ohnehin.

Gerechnet wird das Höhenfeld auf **55 Prozent** der Bildpunkte — es trägt nur
noch den Verlauf, und ein Verlauf verträgt das Hochrechnen. Die Höhen der
Kreise werden in **200 Stufen** abgelegt statt in 24. Die Stufen stecken
hinterher im Feld: zu grob, und die Höhenlinien laufen an ihnen entlang statt
an der Landschaft — und schlimmer, im Lauf der Zeit springt ein Kreis von einer
Stufe zur nächsten, und die Linien in seiner Umgebung zucken mit.

Beschnitten wird die Schattierung nicht mit `clip` an einem Pfad aus
vierhundert Vielecken, sondern mit derselben Vorlage als Schablone
(`destination-in`).

## 4h. Die Städtenamen

Die grössten Städte tragen ihren Namen: die kreisfreien Städte und Stadtkreise,
die in irgendeinem Bild über 400 000 Menschen haben, dazu die Region Hannover,
in der die Stadt 2001 aufgegangen ist. Achtzehn Namen sind es insgesamt; zu
sehen sind je nach Bild weniger.

**Alle Namen stehen von Anfang an da**, auch 1871, wo die Flecken winzig sind.
Ein Name, der im Lauf der Zeit erscheint oder verschwindet, ist ein Sprung im
Bild, und davon hat die Karte genug.

**Und keiner steht auf seinem Gipfel.** Der Berg eines Kreises sitzt in seiner
Mitte — das weite Weichzeichnen macht aus der Fläche eine Kuppe, und deren
höchster Punkt ist der Schwerpunkt. Genau dort stand der Name, und bei Berlin
und Hamburg deckte er zu, was man sehen soll. Der Name rückt deshalb um die
Hälfte des Radius nach unten, den ein Kreis dieser Fläche hätte: bei einem
grossen Fleck sind das viele Bildpunkte und der Gipfel wird frei, bei einem
kleinen wenige. Nach unten, weil das Licht von oben links kommt — der Südhang
liegt ohnehin im Schatten.

Damit das geht, sind zwei Dinge nötig. Erstens eine **Untergrenze**: die
Schrifthöhe folgt der Wurzel aus der gezeichneten Fläche — wächst also mit dem
Fleck, nicht mit der Einwohnerzahl —, fällt aber nie unter sieben Pixel. Und
eine **Obergrenze**, die an der Kartenbreite hängt (`breite/38`) statt an einer
festen Zahl: Berlin und Hamburg liefen sonst in jeder Grösse gegen dieselben
dreissig Pixel und standen als Überschrift über der Karte statt als
Beschriftung darin. Das ist
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

## 4j. Der Tiefpass über die Bilder

Das Höhenfeld wird jedes Bild neu gerastert, und dabei rutschen die Kreise um
Bruchteile eines Feldpunktes. Das Feld selbst ist glatt, aber sein **Raster**
springt — und die Höhenlinien, die daraus verfolgt werden, zappeln mit, um ein,
zwei Bildpunkte, sechzigmal in der Sekunde. Zu sehen ist ein Zittern, obwohl
sich in den Daten nichts dergleichen tut: es ist reine Abtastung.

Also ein **Tiefpass erster Ordnung über die Bilder**. Das gezeigte Feld folgt
dem gerechneten:

    gezeigt += (gerechnet − gezeigt) · (1 − e^(−Δt/τ))

Zwei Zeitkonstanten, weil zwei Dinge daran hängen:

| | τ | entspricht bei 70 s für 153 Jahre |
|---|---|---|
| **weites Feld** (Höhenlinien, grosse Form) | 1,2 s | rund 2,6 Jahre |
| **enges Feld und Rand** (Schattierung am Kreis) | 0,30 s | rund 0,7 Jahre |

Das weite Feld darf träge sein: es ist ohnehin über fünfzehn Punkte verschmiert,
und ein paar Jahre Nachlauf sieht dort niemand. Das enge Feld und der Rand
hängen an den Umrissen der Kreise — liefen sie zu weit nach, sässe die
Schattierung neben ihrer Fläche.

Gerechnet wird mit der **wirklich vergangenen Zeit**, nicht je Bild: sonst hinge
die Zeitkonstante daran, wie schnell das Gerät gerade ist. Bei sechzig Bildern
in der Sekunde geht ein einzelner Rastersprung damit zu 1,4 Prozent ins Bild
ein, die Bewegung über ein Jahrzehnt praktisch ungedämpft.

Und wo die Zeit **springt** — am Regler, beim Umschalten der Ansicht oder der
Form, beim Ändern der Fenstergrösse —, wird der Filter geleert statt
nachgezogen. Sonst zeigte das Bild danach eine Sekunde lang das Gelände von
vorher.

Gemessen im Prüfbrowser (der nur sechs Bilder je Sekunde schafft, wo der Filter
am wenigsten ausrichten kann): die Änderung des Feldes je Bild fällt auf
**48 Prozent**. Auf einem Gerät mit sechzig Bildern ist der Unterschied um ein
Vielfaches grösser.

## 4b. Die Farbskala der Karte

Die Karte wird gemalt, wie ein Atlas ein Gebirge malt: Tiefland in sattem Grün,
dann Gelbgrün, Gelb, Ocker, Orange, Rot — oben die helle Kappe. Sechzehn Stufen
von Hand gesetzt, mit durchgehend steigender Helligkeit, damit die Höhe auch
dann lesbar bleibt, wenn jemand die Farbtöne nicht trennen kann.

Die erste Fassung war um eine ganze Stufe blasser — gedämpftes Oliv und
Graubraun, aus Sorge um das Relief, das darüber liegt. Die Sorge war
unbegründet: weiches Licht bleicht eine satte Farbe nicht aus, es hebt und
senkt sie. Und auf schwarzem Grund braucht eine Karte Farbe, sonst wird sie zu
Schlamm.

Gefärbt wird die **Höhe**: Bevölkerung geteilt durch gezeichnete Fläche,
bezogen auf die mittlere Dichte des Bildes. Grün heisst wenige Menschen auf viel
Boden, Braun und Fels viele auf wenig.

### Eine Zahl, drei Darstellungen

Das war eine Fassung lang eine Behauptung und nicht wahr. Gefärbt wurde **Kreis
für Kreis**: jede Fläche bekam ihre eigene Dichte als Ton, und heraus kam ein
Mosaik mit den Umrissen der Verwaltung. Die Höhenlinien dagegen kamen aus dem
weichgezeichneten Feld, das über die Kreisgrenzen hinwegläuft.

Zwei verschiedene Geometrien derselben Zahl, und das sah man: **Berlin war ein
kleiner Farbfleck in der Form seines Kreises, während sein Berg weit darüber
hinausreichte** und die Linien sich darin drängten. Die Karte sagte an
derselben Stelle zweierlei — hier ist es steil, aber hier ist es auch schon zu
Ende.

Jetzt kommen Farbe, Schattierung und Höhenlinien aus **einem** Feld:

| | |
|---|---|
| im Feld steht | (ln Dichte − unteres Leiterende) / Spanne, auf −⅛ … 1+⅛ geklemmt |
| die Farbe ist | das Band, in das dieser Wert fällt — sechzehn gleich breite |
| die Höhenlinie liegt | auf den Bandgrenzen |
| das Licht kommt | aus dem Gefälle desselben Feldes |

Gezeichnet wird das Feld in seiner eigenen, gröberen Auflösung und beim
Hochrechnen bilinear geglättet: die Bandgrenze wird dadurch ein Übergang von
ein, zwei Bildpunkten, und die Höhenlinie liegt in seiner Mitte. Scharf
gerastert sähe dieselbe Grenze treppig aus. Darunter liegt die Silhouette in
**einer** Farbe, der Mitte der Leiter — nicht als Farbe der Karte, sondern als
scharfe Kante, weil der Rand des hochgerechneten Feldes ein, zwei Bildpunkte
weich ist.

**Und die Zahlen passen zusammen.** Ein Achtel Reserve über und unter der Leiter
legt deren fünfzehn Grenzen im Feld auf 2/20 bis 17/20 — bei zwanzig Niveaus
also genau auf die Niveaus 2 bis 17. **Jede Höhenlinie ist eine Farbgrenze, und
jede Farbgrenze trägt ihre Linie.** Das ist die Konstruktion eines Schulatlas,
und es ist das, was eine Höhenlinie auf einer Geländekarte überhaupt tun soll:
den Farbwechsel begründen, statt quer durch ihn hindurchzulaufen.

### Keine Grenzen

Eine Fassung lang standen die Kreisgrenzen noch als dünner heller Strich da und
die Landesgrenzen als dunkler. Beide sind weg, und zwar alle drei Sorten, in
denen eine Grenze auf dieser Karte auftreten kann:

1. die **gezeichnete Linie** um jeden Kreis und um jedes Land,
2. die **Fuge im Höhenfeld** (siehe 4g), die als Graben dasselbe zeigte,
3. die **Naht**: zwei Nachbarn werden einzeln gefüllt, und die Kantenglättung
   lässt an der gemeinsamen Kante einen halb durchsichtigen Spalt stehen. Auf
   schwarzem Grund liest der sich als feine dunkle Linie — eine Grenze, die
   niemand gezeichnet hat. Dagegen hilft, jede Fläche mit ihrem eigenen Ton
   noch einmal zu umranden: sie dehnt sich um einen halben Bildpunkt, die
   Nachbarn überlappen sich, und die Naht ist zu.

Was bleibt, ist Farbe, Hang und Höhenlinie — und die zeigen die Grenze dort, wo
sie etwas bedeutet: wo sich die Dichte ändert. Wo zwei Nachbarn gleich dicht
wohnen, war der Strich ohnehin nur Verwaltung. Eine Geländekarte hat keine
Grenzen; sie hat Gelände.

Damit entfielen auch die 3 334 Knotenpaare der Landesgrenzen aus der Nutzlast.

### Eine Ausnahme: die Städte

Die kreisfreien Städte und Stadtkreise tragen doch einen Umriss, einen feinen
dunklen, über dem Relief gezeichnet. Für einen Landkreis wäre er überflüssig: er
wird kaum verzerrt, sein Umriss sagt nichts, was die Farbe nicht schon sagt.
Eine kreisfreie Stadt ist der andere Fall. Sie ist auf dem Boden winzig und in
der Karte gross — Berlin geht vom Viertelprozent der Fläche auf viereinhalb —,
und ihr Berg reicht nach dem Weichzeichnen weit über sie hinaus. Ohne Umriss
verschwimmt sie mit dem Umland, dessen Farbe sie ja selbst mitgeprägt hat.

Der Umriss sagt hier also etwas, das sonst niemand sagt: **bis hierhin reicht die
Stadt, der Rest ist ihr Schatten.** Im vollen Kartogramm, wo die Fläche einfarbig
ist, sind diese Umrisse das Einzige, was man noch sieht — und genau dort sind sie
am meisten wert, weil sie zeigen, wie gross eine Stadt geworden ist.

### Bezogen worauf? Relativ, nicht absolut

Die Höhe ist ein Verhältnis, und die Frage ist, wozu. Bezug ist die mittlere
Dichte **desselben Bildes**:

    Höhe = Dichte des Kreises / mittlere Dichte des Jahres

Ein Kreis steht also auf ×2, wenn dort doppelt so dicht gewohnt wird wie im
Landesdurchschnitt *jenes* Jahres — und ein Kreis, der mit dem Land Schritt
hält, behält seine Farbe über hundertfünfzig Jahre. Das zeigt die
**Verteilung**: wo sich die Menschen ballen und wie sich das verschiebt. Das
Wachstum trägt die Karte ohnehin schon, in ihrer Fläche.

Die Alternative wäre ein fester Bezug, etwa Deutschland 2024; dann hiesse ×2 in
jedem Jahr dasselbe. Gerechnet ist der Unterschied ein einziger Faktor — die
Bevölkerung des Bildes geteilt durch die des letzten, also 0,35 im Jahr 1871.
Ausprobiert ist es, und es zeigt das Wachstum eindrucksvoll: 1871 liegt fast
einfarbig im Tiefgrün, und über die Jahre steigt das ganze Land daraus auf. Der
Preis ist, dass die frühen Bilder ihre Binnenzeichnung verlieren — 1871 ist das
Ruhrgebiet kaum noch vom Umland zu trennen, weil sein Vorsprung am Maßstab von
2024 gemessen verschwindend klein ist. Und die Farbe zeigte dann dasselbe wie
die Fläche noch einmal.

Die Seite steht deshalb auf relativ. Der Schalter steckt im Skript
(`bezugAbsolut(true)`), ohne Knopf: die gemessenen Spannen hängen daran und
werden beim Umschalten verworfen.

### Die Leiter wird gemessen, nicht gesetzt

Wie weit die Höhen streuen, hängt ganz an der Stellung des Formreglers (4f):
auf der Landkarte ist die Höhe die wirkliche Dichte, im vollen Kartogramm ist
sie für jeden Kreis 1. Eine feste Leiter für alle drei Stellungen läge in
zweien davon in einem einzigen Gelb.

Also wird die Spanne **je Form einmal aus den Daten gemessen**: alle vierhundert
Kreise in allen zehn Zählungen, das fünfte und das fünfundneunzigste Prozent.
Das geht, ohne zu zeichnen, weil die Höhe ein Verhältnis ist und sich beim
Skalieren der ganzen Karte nicht ändert. Gemessen wird einmal je Form und dann
behalten — dieselbe Farbe heisst damit über die ganzen hundertdreiundfünfzig
Jahre dasselbe.

Gewichtet wird dabei mit der **Fläche**, nicht je Kreis gleich. Das ist der
Unterschied zwischen „wie dicht wohnt ein Kreis" und „wie dicht ist das Land
hier", und gefärbt wird Fläche. Ungewichtet setzten die hundertsieben
kreisfreien Städte das obere Quantil: sie sind dicht, aber winzig, und nach dem
Weichzeichnen bleibt von ihnen wenig übrig. Die Leiter reichte dann weit über
das hinaus, was im Feld je vorkommt, und **die halbe Palette blieb ungenutzt** —
acht von sechzehn Bändern auf der Landkarte. Aus demselben Grund fünf Prozent an
den Enden statt eines halben: das Weichzeichnen zieht die Verteilung ohnehin zur
Mitte. Jetzt sind es zwölf bis dreizehn belegte Bänder.

| Form | gemessene Spanne |
|---|---|
| Real map (a = 0) | ×0,26 … ×2,9 |
| Half and half (a = 0,5) | ×0,44 … ×2,3 |
| Cartogram (a = 1) | ×1,00 … ×1,02 |

Zwischen zwei Formen wird logarithmisch übergeblendet, und weil das während der
Bewegung geschieht, stehen die Zahlen an den Enden der Leiter je Bild neu.

### Wenn keine Höhe mehr übrig ist

Die dritte Zeile der Tabelle ist keine Spanne, sondern Rundungsrest. Im vollen
Kartogramm steckt die ganze Bevölkerung in der Fläche; jeder Kreis hat dann
dieselbe Dichte, und was bleibt, ist die Genauigkeit des Diffusionsverfahrens.

Eine Leiter, die über dieses eine Prozent gespannt wird, macht daraus ein
Gebirge: sie stünde auf ×0,99 bis ×1,01 und zeigte doch alle sechzehn Farben —
eine reich gegliederte Landschaft ohne jeden Inhalt.

Zwei Bremsen, beide aus derselben gemessenen Spanne:

1. Die Leiter bekommt eine **Mindestbreite** (Faktor 2,6). Ist die Spanne
   enger, wird sie um ihre Mitte auf dieses Mass aufgezogen; alle Werte landen
   dann in der Mitte der Leiter, und die Karte liegt einfarbig da — wie es
   einem Kartogramm zusteht.

   Aufgezogen und dann noch um ein **halbes Band** verschoben. Symmetrisch läge
   die Mitte der Werte auf genau der Grenze zwischen dem achten und dem neunten
   Band, und dort, wo alle Werte dicht um diese Mitte liegen, kippte jeder
   Rundungsrest über die Grenze: die Fläche war mit Flecken des Nachbartons
   gesprenkelt. Um ein halbes Band verschoben fällt die Mitte in die Mitte eines
   Bandes, und die Fläche bleibt, was sie sein soll — einfarbig.
2. Das **Relief wird ausgeblendet**, im selben Verhältnis: Schattierung,
   Mulden, Schlagschatten und Höhenlinien werden mit demselben Faktor
   multipliziert. Bei voller Spanne steht es ganz, bei keiner gar nicht,
   dazwischen anteilig. (Unter zwei Prozent wird die Linienverfolgung ganz
   übersprungen, was im Kartogramm auch Rechenzeit spart.)

Der Weg vom Relief zum Kartogramm zeigt damit genau das, worum es auf dieser
Seite geht: **die Berge sinken in die Fläche, weil die Menschen von der Höhe in
die Breite wandern.** Die Legende sagt es dann auch mit Worten — „every county
is drawn at the same density now, so the land lies flat".

### Was die Karte nicht mehr zeigt

Frühere Fassungen hatten drei Datenansichten nebeneinander — Wachstum je Jahr
(rot gegen blau), Einwohner (logarithmisch von 30 000 bis 1,5 Millionen) und
das Gelände —, dazu ein Nadelrelief aus den 11 007 Gemeinden, einen Umschalter
zwischen hellem und dunklem Grund mit je eigenen Farbleitern, ein Gitternetz aus
30-km-Quadraten und einen Artikel unter der Karte. Alles das ist weg.

Der Grund ist derselbe wie beim Gitternetz seinerzeit: es brachte zu wenig für
den Platz, den es nahm. Die Geländekarte trägt dieselben Zahlen wie die
Dichteansicht, und sie trägt sie besser, weil das Relief dieselbe Zahl noch
einmal plastisch zeigt. Die Richtungsfarbe war eine eigene Aussage, aber sie
brauchte die Fläche, die jetzt das Gelände trägt — beides zugleich ging nicht:
eine Schattierung, die stark genug für ein Gebirge ist, macht aus Rot und Blau
Grau. Und eine Seite, die eine Sache gut zeigt, ist mehr wert als eine mit vier
Knöpfen.

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
