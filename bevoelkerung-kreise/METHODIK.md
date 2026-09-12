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

#### Was das kostet: eine Stufe an der Ländergrenze

Das ist die grösste offene Schwäche der Karte, und sie hat einen sichtbaren Ort.
Weil die Stichtage innerhalb eines Bildes um bis zu zehn Jahre auseinanderliegen
und die Ländergrenzen entlanglaufen, **springt der Stand an diesen Grenzen**.
Das Bild 1900–1910 ist der schlimmste Fall:

| Stichtag | Kreise | Menschen |
|---|---|---|
| 1.12.1900 (Bayern) | 96 | 5,41 Mio |
| 1.12.1905 (SH, NI, NW, RP, SL) | 155 | 16,26 Mio |
| 1.12.1910 (übrige) | 149 | 26,11 Mio |

Das Reich wuchs in diesem Jahrzehnt um **15,2 Prozent** (56,4 auf 64,9
Millionen). Bayern steht in diesem Bild also grob ein Zehntel unter dem Stand,
den es 1910 hatte, und die Grenze zu Baden-Württemberg trägt eine Stufe, die
nichts als Buchführung ist. Im Ruhrgebiet, das damals mehrere Prozent im Jahr
wuchs, ist die Fünfjahresstufe zu Hessen deutlich grösser als die
Landesdurchschnitte vermuten lassen. Dasselbe, schwächer, im Bild 1946–1950:
Rheinland-Pfalz, Baden-Württemberg und Bayern liegen vier Jahre vor dem Rest —
mitten in der Verteilung der Vertriebenen.

**Reparieren lässt sich das aus dieser Quelle nicht.** GPOPs Spalten schliessen
einander aus: `pop_1900` ist für 96 Kreise belegt, `pop_1905` für 155,
`pop_1910` für 150 — zusammen genau die 401. Es gibt für Bayern kein 1910 und
für Sachsen kein 1900. Die Alternative wäre, jeden Kreis auf einen gemeinsamen
Tag zu rechnen; das ginge nur durch Interpolation über die 39-Jahre-Lücke zu
1939 und ersetzte eine ehrliche Flickendecke durch eine geschätzte. Deshalb
bleibt sie, wird aber überall genannt: das Schild über der Karte führt alle
Stichtage eines Bildes auf, und der Zettel beim Antippen nennt den des
einzelnen Kreises.

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
nicht wieder bei der Landkarte. Das spart Rechenzeit und hält die zehn Bilder
beieinander — was jetzt doppelt zählt, weil aus ihnen ein Mittelwert wird (4f):
zehn Formen, die auseinanderlaufen, mitteln sich zu Matsch.

**Ausschnitt nach den Daten.** Das Gitter richtet sich nach den Kreisen, für
die es Zahlen gibt. Solange das alle sind, ist das ganz Deutschland; sobald
eine Reihe nur einen Teil abdeckt, bleibt die Auflösung dort, wo sie gebraucht
wird.

**Gemeinsamer Massstab.** Das Kartogramm selbst verteilt nur um; seine
Gesamtfläche bleibt die der Ausgangskarte, gleich wie viele Menschen darin
wohnen. Jeder gespeicherte Zustand ist auf diese Fläche normiert und um den
festen Schwerpunkt der Gesamtkarte zentriert; die Grösse steckt allein in einem
Faktor, der beim Zeichnen daraufkommt.

Dieser Faktor war lange √(Bevölkerung / grösste Bevölkerung): dieselbe Fläche
je Mensch für alle Zeitpunkte, also **wuchs die Karte mit** — halb so viele
Menschen, halb so viel Karte. Er ist jetzt für alle Bilder derselbe, der des
letzten. Die Aussengrenze bleibt damit über hundertfünfzig Jahre ungefähr, wo
sie ist, und was sich noch bewegt, bewegt sich, weil sich die Kreise
gegeneinander verschieben.

Das Wachstum ist deshalb nicht verschwunden, es ist umgezogen: es steht jetzt
in der **Farbe** (4b). Beides zugleich zeigte dasselbe zweimal und kostete nur
die Aufmerksamkeit für alles andere. Die Zahlen der Nutzlast sind unverändert;
geändert hat sich allein, mit welchem Faktor sie gezeichnet werden.

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
wie PCHIP). Sie galt einmal auch den Knoten des Kartogramms; seit der Boden
stillsteht, gilt sie nur noch den Zahlen. Sie geht durch
jeden gezählten Wert und hat an den Zählungen keinen
Knick mehr. Der Unterschied zu einem gewöhnlichen Spline ist die Monotonie: wo
eine Reihe steigt und dann fällt, wird die Steigung an der Spitze auf null
gesetzt, statt eine Beule zu erfinden. Damit gilt: **zwischen zwei Zählungen
liegt kein Wert ausserhalb dieser beiden.** Ein Kreis hat unterwegs nie mehr
Menschen als in einem der beiden Bilder, und eine Ecke der Karte wandert nie
über den Ort hinaus, den sie in beiden hat.

### Was sie kostet, und ob sie das wert ist

Die Kurve war für die **Knoten des Kartogramms** gedacht; der Boden steht
still, seit die Karte eine feste Form hat. Also nachgemessen, über alle Kreise
und neunhundert Stellen der Achse. `STRAFF` ist ein Regler von der Geraden (0)
zur vollen Fritsch–Carlson-Kurve (1) — eine Hermite-Kurve, deren beide
Steigungen gleich der Sehne sind, *ist* die Gerade, also lässt sich dazwischen
stufenlos mischen. Gemessen wird die Abweichung von der Geraden gegen den
Knick der Höhe an einer Zählung (Median über die 400 Kreise):

| STRAFF | grösste Abweichung | im Mittel | Knick im Median |
|---|---|---|---|
| 0 (Gerade) | 0 | 0,00 % | 74 % |
| 0,25 | 58 305 | 0,19 % | 65 % |
| 0,5 | 116 611 | 0,38 % | 53 % |
| 0,75 | 174 916 | 0,57 % | 35 % |
| **1 (eingestellt)** | **233 221** | **0,75 %** | **5 %** |

Die Mitte ist das Schlechteste von beidem: den halben Preis für ein Viertel
des Nutzens. Also ganz oder gar nicht — und ganz, weil ein Knick von 74 Prozent
heisst, dass die Wachstumsgeschwindigkeit des mittleren Kreises an jeder
Zählung fast um die Hälfte springt. Neunmal im Lauf, über vierhundert Kreise
zugleich: ein sichtbares Zucken.

Der Preis liegt nicht gleichmässig. Fast alles davon steckt in der einen
39-Jahre-Lücke zwischen 1871 und 1910, wo Berlin um bis zu **233 221 Menschen**
über der Geraden läuft: die Kurve zieht das Wachstum nach vorn, weil der
folgende Abschnitt flach ist und die Monotonie diese Flachheit rückwärts in
die Anfahrt trägt. Für eine Stadt, deren Wachstum sich in der Gründerzeit
beschleunigte, zeigt das in die falsche Richtung. Gezählt ist dort nichts;
beide Annahmen sind Annahmen, und die gerade wäre die vorsichtigere.

Was die Kurve dagegen **nicht** tut: etwas erfinden, was über die Zählwerte
hinausgeht. Das Überschiessen ist **0,0000 %** — zwischen zwei Zählungen liegt
kein Wert ausserhalb dieser beiden. Ein langer Tiefstand auf der Karte ist
also gezählt, nicht geglättet. Berlin zum Beispiel: 4 338 756 (1939),
3 170 832 (1946), 3 270 959 (1964), 3 075 670 (1987), 3 458 763 (1996) — vier
Jahrzehnte flach, und der Stand von 1939 ist bis heute nicht wieder erreicht.
Die Glättung verschiebt dort höchstens 9 000 Menschen.

### Die Kriegsjahre sind die eine Stelle, an der die Kurve etwas behauptet

Sie ist monoton, also steigt sie zwischen 1939 und 1946 gleichmässig an, und
das liest sich, als sei Deutschland durch den Krieg hindurch gewachsen. **Das
war es nicht.**

Gezählt sind nur die beiden Enden, und beide stimmen: **59,63 Millionen** am
17. Mai 1939 und **66,19 Millionen** 1946/1950, jeweils auf den heutigen
Gebietsstand gerechnet. Die Zunahme ist echt — sie ist die **Flucht und
Vertreibung**: rund zwölf Millionen Deutsche aus den Ostgebieten kamen in die
vier Zonen, mehr als der Krieg an Menschen gekostet hat. Die Bevölkerung des
heutigen Deutschlands war 1946 tatsächlich grösser als 1939.

Nur lief sie nicht so dorthin. Dazwischen liegt **keine einzige Zählung**; der
Weg ist eine Annahme, und die wirkliche Kurve fiel erst — Gefallene, Bombentote,
Ermordete — und sprang dann binnen zweier Jahre, 1945 und 1946, nach oben. Die
Karte zeigt stattdessen acht Sekunden ruhiges Wachstum. Was in den Kriegsjahren
zutrifft, ist die **Umschichtung**, nicht die Summe: die Städte leeren sich, das
Land füllt sich, und beide Enden davon sind gezählt.

Deshalb steht die Zahl über der Karte zwischen zwei Zählungen mit einem
Ungefähr-Zeichen und dem Zusatz, zwischen welchen Zählungen sie liegt. Auf einer
Zählung steht dort stattdessen ihr Stichtag.

Und auch das Ende dieses Abschnitts ist kein einzelner Tag: von den 400 Kreisen
sind **224 am 29. Oktober 1946** gezählt (47,57 Mio, die Zählung in den
Besatzungszonen) und **176 am 13. September 1950** (18,62 Mio). Die Quelle gibt
her, was sie hat; die Karte nennt beide Stichtage.

## 4e. Die Uhr

Die Uhr braucht 84 Sekunden für die 153 Jahre. Wie viel davon ein Abschnitt
bekommt, hängt an zwei Dingen zugleich: **wie lang er dauerte und wie viel sich
in ihm umschichtete**. Genommen wird das geometrische Mittel aus beiden
Anteilen — dem an der Summe der Jahre und dem an der Summe aller Veränderungen
je Kreis (Σ|Bevölkerung(b) − Bevölkerung(a)|).

Dazu eine **Untergrenze von 5,4 Sekunden** (Anteil 5,4/84): darunter ist ein
Abschnitt vorbei, ehe seine Notiz gelesen ist. Das betrifft das Ende der Reihe,
wo die Zählungen dicht liegen — 2019 bis 2024 bekäme sonst zwei Sekunden. Wer
über der Grenze liegt, gibt anteilig ab.

| Abschnitt | Jahre | Umschichtung | Spielzeit |
|---|---|---|---|
| 1871 → 1900–1910 | 36,2 | 18,6 Mio | 18,6 s |
| 1900–1910 → 1939 | 31,3 | 11,9 Mio | 13,8 s |
| 1939 → 1946–1950 | 8,5 | 14,5 Mio | 8,0 s |
| 1946–1950 → 1961–1964 | 14,5 | 12,0 Mio | 9,4 s |
| 1961–1964 → 1985–1987 | 24,7 | 10,4 Mio | 11,5 s |
| 1985–1987 → 1996 | 9,9 | 7,1 Mio | 6,0 s |
| 1996 → 2011 | 14,4 | 4,7 Mio | 5,9 s |
| 2011 → 2019 | 8,6 | 4,0 Mio | 5,4 s |
| 2019 → 2024 | 5,0 | 1,6 Mio | 5,4 s |

Die Jahre sind die Abstände der **Zähltage**, nicht der Jahreszahlen; wo eine
Zählung als Spanne geführt wird (1900–1910), steht sie dort, wo ihr
Bevölkerungsschwerpunkt liegt — nicht in der blossen Mitte der Daten. Für
1900–1910 sind das 1908,1 und nicht 1905, weil hinter dem Stichtag 1910
sechsundzwanzig der siebenundvierzig Millionen stehen.

Rein nach Jahren bekäme der Bruch von 1939 auf 1946 vier Sekunden — die
gewaltigste Umwälzung der ganzen Reihe, vorbei, ehe man hinsieht. Rein nach
Umschichtung wäre die Zeitachse keine mehr. So bekommt er acht, und die langen
ruhigen Strecken behalten trotzdem den grössten Teil, weil sie am längsten sind.

Der Regler misst entsprechend **Spielzeit**, und die Marken der Zählungen sitzen
dort, wo sie im Ablauf liegen. Die Jahreszahl im Rahmen zeigt weiter das
wirkliche Jahr; innerhalb eines Abschnitts läuft sie gleichmässig.

Die Steigungen der weichen Kurve (4d) werden auf derselben Spielzeitachse
gerechnet. Das ist der Punkt: sichtbar ist Bewegung je Sekunde, nicht je Jahr,
und ohne diesen Bezug entstünde an jeder Zählung genau der Knick zurück, den
4d beseitigt.

## 4f. Halbe Verzerrung: der Tausch zwischen Fläche und Höhe

Ein Kartogramm steckt die ganze Bevölkerung in die Fläche. Bei Berlin heisst
das: 0,25 Prozent des Bodens werden zu 4,4 Prozent der Karte, ein Faktor 17,6,
und Deutschland sieht nicht mehr wie Deutschland aus. Eine Landkarte mit Höhen
steckt sie ganz in die Höhe: die Form stimmt, aber die Städte sind Spitzen auf
einer Fläche, die man nicht mehr trifft.

Die Seite zeigt den Schritt dazwischen, und nur ihn:

| | Berlins Anteil an der Karte | Berlins Höhe | Höhenspanne im Bild |
|---|---|---|---|
| Real map (a = 0) | 0,25 % | 17,8 × Mittel | 134 : 1 |
| **Half and half (a = 0,5)** | **1,75 %** | **2,5 × Mittel** | **9 : 1** |
| Cartogram (a = 1) | 4,41 % | 1,0 × Mittel | 1 : 1 |

Der Tausch ist exakt: 1,75 × 2,5 = 4,4 = 0,25 × 17,8. **Volumen bleibt
Bevölkerung**, in jeder Stellung — die halbe ist nur die, in der beide Hälften
des Tauschs noch zu sehen sind.

Die anderen beiden waren als Knöpfe erreichbar, dann nur noch als Liste im
Skript, und jetzt sind sie **weg** — samt allem, was nur ihretwegen dastand:
kein Überblenden zwischen Formen, keine Leiter je Form, keine Mindestbreite,
kein Ausblenden des Reliefs. Das waren Vorkehrungen für das volle Kartogramm,
in dem jeder Kreis dieselbe Dichte hat und nichts mehr zu modellieren ist.

Was bleibt, ist die Zahl: jeder Knoten liegt auf halbem Weg zwischen seinem Ort
auf der Landkarte und seinem Ort im Kartogramm. **Beide Enden stehen weiterhin
in der Nutzlast** — die Landkarte ist der Anfang der Differenzkette —, die
Zwischenform kostet also nichts, und wer die Knöpfe zurückwill, braucht dafür
keine neuen Daten, nur wieder Code.

### Ein Boden, der keinem Jahr gehört

Welches Kartogramm? Lange war es das **des jeweiligen Jahres**: die Fläche eines
Kreises war sein Anteil an der Bevölkerung dieses Bildes, und der Umriss
verformte sich im Lauf der Zeit. Das zeigte gut, wo die Menschen gerade sind —
und machte zwei Bilder unvergleichbar.

Der Grund ist Arithmetik, kein Fehler. Volumen = Grundfläche × Höhe, und das
Volumen je Mensch steht fest. Folgt die Grundfläche dem Anteil des Jahres, muss
die Höhe das ausgleichen. Berlin hatte 1910 dieselben 3,7 Millionen wie heute,
hielt damals aber fast jeden dreizehnten Deutschen und heute nur noch jeden
dreiundzwanzigsten — es wurde also sechzig Prozent breiter gezeichnet und lag
entsprechend flach. Gleich viele Menschen, sehr verschiedener Berg.

Jetzt steht der Boden still, und zwar auf dem **Mittelwert aller zehn
Kartogramme**, zur Hälfte in die Landkarte gemischt. Nicht auf dem von 2024:
das wäre ein Körper, der einem Jahr gehört, und 1871 würde auf der Gestalt von
heute gezeichnet. Der Mittelwert gehört keinem Jahr und allen.

Daraus folgt, worum es geht: die Grundfläche eines Kreises ist über
hundertfünfzig Jahre dieselbe, also **ist seine Höhe unmittelbar seine
Bevölkerung**. Gemessen für Berlin:

| Jahr | Menschen | Grundfläche | Höhe | Band |
|---|---|---|---|---|
| 1871 | 0,93 Mio | 1,87 % | ×0,60 | 5 |
| 1900–1910 | 3,73 Mio | 1,87 % | ×2,39 | 23 |
| 1939 | 4,34 Mio | 1,87 % | **×2,78** | 23 |
| 1946–1950 | 3,17 Mio | 1,87 % | ×2,03 | 19 |
| 1985–1987 | 3,08 Mio | 1,87 % | ×1,97 | 19 |
| 2024 | 3,69 Mio | 1,87 % | ×2,36 | 23 |

Berlin 1910 steht damit so hoch wie Berlin heute, und 1939 — sein wirklicher
Höchststand — höher als beide. Das Volumen je Million Menschen bleibt dabei über
alle zehn Zählungen konstant bei 182 (1871: 178, −2 % durch das Klemmen bei
null). Und es wird etwas sichtbar, das die wandernde
Form verbarg: **Orte, die schrumpfen.** Leipzig, Dresden und Chemnitz ragen 1910
heraus und sinken danach; vorher schrumpfte mit ihren Menschen auch ihre
Grundfläche, und die Höhe blieb, wo sie war.

Was die Karte dafür aufgibt, ist die **Bewegung**: sie verformt sich nicht mehr,
sie steigt und fällt. Damit fällt auch die Bahn zwischen zwei Bildern weg — acht
Zahlenreihen zu je zwölftausend Knoten und eine kubische Kurve je Abschnitt.
Die Orte hängen nicht mehr an der Zeit und werden einmal gerechnet.

Eine lineare Mischung knickfreier Formen muss selbst nicht knickfrei sein, und
hier werden eng eine Landkarte und zehn Kartogramme gemischt. Nachgezählt beim
Bauen: **0 gefaltete Ringe von 465.**

**Und die Nutzlast schrumpft.** Neun der zehn Kartogramme gingen nur noch in den
Mittelwert ein — rund 450 kB für Formen, die niemand mehr zu sehen bekam.
Gemittelt wird jetzt beim Bauen, in der Seite steht nur die eine Form als
Unterschied zur Landkarte: **138 statt 500 kB Nutzlast, 259 statt 632 kB Seite.**

Mit ihnen fielen zwei weitere Reste: der **Massstab je Zustand** (eingefroren,
seit das Wachstum in die Farbe zog) und der **Ankerpunkt**, um den er wirkte.
Ein fester Massstab um einen festen Punkt tut nichts mehr, sobald die Seite den
Rahmen der gezeichneten Punkte misst und auf die Leinwand normiert — beide
Faktoren kürzen sich heraus.

Was die eine Form noch an Kartogramm ist, wird beim Bauen gemessen: ihre Flächen
gegen den **mittleren** Bevölkerungsanteil über alle zehn Bilder, Median 0,78 %,
grösste Abweichung 7,9 %, über ein Prozent bei 155 von 400 Kreisen. Das ist
schlechter als ein einzelnes Kartogramm (Median 0,18 %) und kein Fehler: der
Mittelwert zehn flächentreuer Formen ist selbst nicht flächentreu.

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
der nichts mehr zu unterscheiden ist. Gestaucht wird deshalb — aber **linear**,
auf die gemessene Spanne der Farbleiter (4b):

    Leiterwert = Höhe / oberes Leiterende,   darüber ein weiches Knie
    Feldwert   = Leiterwert, auf 0 … 1+⅛ gelegt

Linear und nicht logarithmisch, und das ist eine inhaltliche Entscheidung, kein
Geschmack: siehe „Volumen ist Bevölkerung" in 4b.

**Das Knie war vorher ein Deckel, und das war der Fehler, der Berlin klein
gemacht hat.** Alles über dem oberen Leiterende wurde auf denselben Wert
geklemmt. 2024 traf das elf Kreise auf einmal — Berlin, München, Oberhausen,
Essen —, und sie wurden dadurch **ununterscheidbar, bevor der erste
Weichzeichner lief**. Was danach noch über die Höhe entschied, war allein die
Breite der Fläche, und da gewinnt ein fünfzig Kilometer langes Band dichter
Städte gegen einen einzelnen Fleck: Berlins Gipfel stand im Feld auf 0,866, der
des Ruhrgebiets auf 0,877. Die falsche Reihenfolge, und sie kam nicht aus den
Zahlen, sondern aus dem Deckel.

Jetzt läuft die Leiter bis zum gemessenen Quantil **genau linear** — daran hängt
ja, dass das Volumen die Bevölkerung ist — und geht darüber in ein
exponentielles Knie über, das die Reserve erst im Unendlichen erreicht:

    darüber:  1 + ⅛ · (1 − e^−(u−1)/⅛)

Geklemmt wird damit nichts mehr, die Reihenfolge bleibt überall erhalten, und
die Spitze behält ihren Vorsprung. Auf der Landkarte, wo die Dichte bis zum
Fünfzehnfachen geht, staucht das Knie stark — aber es staucht, statt zu kappen.

Damit steht im Höhenfeld dieselbe Zahl, die auch die Farbe zeigt — und das ist
der ganze Punkt (4b, „Eine Zahl, drei Darstellungen"). Die **Reihenfolge bleibt
richtig, der Abstand nicht**; die Zahl selbst steht beim Antippen („Stands
2,5 × average"). Im vollen Kartogramm sind alle Höhen gleich, dann ist es
wirkungslos.

Die Reserve über der Leiter hat seither zwei Aufgaben. Die alte: der Gipfel
soll Platz haben. Die neue: **sie bekommt Farbe** — die beiden obersten Bänder,
Fels und Schnee, liegen genau dort. An eine bestimmte Zahl ist sie nicht mehr
gebunden; das war sie, solange die Farbbänder auf dem Leiterwert lagen (siehe
4b). Nach unten braucht die lineare Leiter gar keine: sie fängt bei null an,
und unter null wohnt niemand.

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
   (`breite/28`). Das knappe Feld trägt den einzelnen Kreis, das weite die
   Landschaft darüber; gemischt 85 zu 15. Das weite entstand eine Fassung lang
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
links, 40 Grad über der Fläche. Sie wird **in die Farbe gerechnet**, im selben
Durchgang, in dem das Band nachgeschlagen wird: der helle Hang läuft anteilig
gegen Weiss, der dunkle gegen Schwarz.

Zwei Fassungen lang lag sie stattdessen als graues Bild im Mischmodus
`soft-light` darüber, und das war aus gutem Grund so — ein Mischmodus rechnet
den Ton gegen die Farbe, die schon da liegt, statt jede Farbe gegen Schwarz oder
Weiss zu ziehen. Es hatte nur einen Fehler, und es war der teuerste dieser
Karte: **weiches Licht kann Weiss nicht dunkler machen.** In der
Rechenvorschrift steht der Faktor C·(1−C), und der ist bei Weiss null. Auf den
hellsten Bändern — also genau auf den Gipfeln, um die es hier geht — kam
überhaupt keine Hangschattierung an. `overlay` und `hard-light` haben dieselbe
Stelle.

Aufhellen und Abdunkeln haben diese Schwäche nicht. Sie greifen dafür stärker in
tiefe Töne ein, also steht die Stärke jetzt bei 1,6 statt 2,2 und der
Schlagschatten bei 0,32 statt 0,50. Nebenbei entfällt eine Leinwand und ein
ganzer Kompositionsdurchgang über die volle Bildfläche; gemessen im weich
gerenderten Prüfbrowser läuft die Seite dadurch mit 12,9 statt 11,1 Bildern.

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
- Wo zwei Niveaus auf der Leinwand unter vier Bildpunkte zusammenrücken, wird
  **ausgedünnt statt abgeschaltet**: jedes vierte Niveau hält am längsten durch,
  dann jedes zweite, dann der Rest. Vorher blendeten alle gemeinsam aus, und
  unter anderthalb Bildpunkten waren sie ganz weg — was genau den steilsten Hang
  traf. Berlins Flanke fällt in wenigen Bildpunkten durch fünf Niveaus, also
  hatte ausgerechnet der höchste Berg der Karte keine Höhenlinien mehr: die
  Umkehrung dessen, was eine Höhenlinie tun soll. Ausgedünnt bleiben dort vier
  Linien statt keiner, und ihr Abstand untereinander ist wieder lesbar.
  Gemessen für 2024 steigt die mittlere Sichtbarkeit in Berlin von 0,59 auf
  0,74.
- Eine Zelle, deren vier Ecken nicht ganz auf der Karte liegen, wird
  übersprungen. Das erspart das Beschneiden an einem Pfad aus vierhundert
  Vielecken und lässt der Küste einen schmalen, linienfreien Saum — der sieht
  ohnehin besser aus.

Zwei Lagen also, weil sie verschieden gehören: die Fläche, in die Farbe und
Schattierung gemeinsam gerechnet sind, und die Linien als Pfade darüber — in
voller Auflösung, nicht in der des Feldes.

Wie hoch ein Kreis steht, sagt 4f: im vollen Kartogramm für alle dasselbe, sonst
Bevölkerung durch gezeichnete Fläche.

> Volumen = Fläche × Höhe ∝ Bevölkerung — bei jedem Wert von *a*, also auch
> bei dem einen, der gezeichnet wird.

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

Die grössten Städte tragen ihren Namen — und zwar die, die **im gerade
gezeigten Jahr** die grössten sind, nicht die von heute. Der Vorrat steht in
der Seite: alle kreisfreien Städte und Stadtkreise, die je über 100 000
Menschen hatten, dazu die Region Hannover, in der die Stadt 2001 aufgegangen
ist — fünfundsiebzig Einträge. Ausgewählt werden daraus siebzehn, in jedem
Bild neu, nach der laufenden Einwohnerzahl.

Das ändert weniger, als man denkt, und genau das Richtige. Die ersten zwölf
Namen stehen in jedem Bild: Berlin, Hamburg, München, Köln, Leipzig, Dresden,
Hannover, Frankfurt, Dortmund, Stuttgart, Bremen, Nürnberg. Gewechselt wird am
unteren Ende der Liste:

| | dazu | weg |
|---|---|---|
| 1871 | Karlsruhe, Kassel, Erfurt | — |
| 1900–1910 | Mannheim, Kiel | Karlsruhe, Erfurt |
| 1946–1950 | Lübeck, Bielefeld | Kiel, Kassel |
| 1961–1964 | Kiel | Lübeck |
| 1985–1987 | Rostock | Kiel |
| 1996 | Kiel | Rostock |
| 2019 | Karlsruhe | Mannheim |
| 2024 | Mannheim | Karlsruhe |

Insgesamt kommen zweiundzwanzig Städte vor. Chemnitz und Magdeburg stehen 1871
unter den zwölf grössten und heute als letzte in der Liste — dieselbe
Geschichte, die der Berg daneben erzählt, noch einmal in Schrift.

**Der Übergang darf nicht springen.** Die Schwelle ist der Wert des
siebzehnten Namens. Wer darüber liegt, steht voll da; wer darunter rutscht,
blendet über einen Saum von sechs Prozent aus. Im Augenblick des Wechsels sind
der siebzehnte und der achtzehnte gleich gross, die Blende ist dort also gerade
offen — niemand erscheint oder verschwindet plötzlich. Zu sehen sind damit
siebzehn Namen und gelegentlich ein achtzehnter, der gerade geht.

Beim Auseinanderschieben zählt ein ausblendender Name entsprechend weniger: er
wird voll weggeschoben, schiebt aber selbst nur nach Massgabe seiner
Deckkraft. Sonst rückte die halbe Karte in dem Augenblick zur Seite, in dem ein
Name unter die Schwelle fällt.

**Und keiner steht auf seinem Gipfel.** Der Berg eines Kreises sitzt in seiner
Mitte — das weite Weichzeichnen macht aus der Fläche eine Kuppe, und deren
höchster Punkt ist der Schwerpunkt. Genau dort stand der Name, und bei Berlin
und Hamburg deckte er zu, was man sehen soll. Der Name rückt deshalb um die
Hälfte des Radius nach unten, den ein Kreis dieser Fläche hätte: bei einem
grossen Fleck sind das viele Bildpunkte und der Gipfel wird frei, bei einem
kleinen wenige. Nach unten, weil das Licht von oben links kommt — der Südhang
liegt ohnehin im Schatten.

**Die Schriftgrösse** kommt aus dem Logarithmus des Verhältnisses zur
Schwelle, stufenlos: der letzte Name der Auswahl bekommt `breite/56`, wer
vierzehnmal so gross ist wie er, `breite/33`. Angegeben als Teiler der
Kartenbreite, damit dieselbe Ordnung auf dem Telefon und auf dem Schirm gilt —
Berlin lief sonst in jeder Grösse gegen dieselben dreissig Pixel und stand als
Überschrift über der Karte statt als Beschriftung darin. Nach unten begrenzen
sieben Pixel; darunter ist nichts mehr zu lesen.

Dass die Schrift am **Verhältnis** hängt und nicht an der Einwohnerzahl, ist
Absicht. Der Berg sagt, wie viele Menschen da sind, absolut und über
hundertfünfzig Jahre vergleichbar; der Name sagt, wer hier gerade zu den
grössten gehört. Eine absolute Skala hätte 1871 siebzehn gleich kleine Namen
gezeigt, weil ausser Berlin keine Stadt 500 000 Menschen hatte — und Chemnitz
heute grösser geschrieben als 1871, obwohl es damals die elftgrösste Stadt war
und heute die sechzehnte. Der Abstand zwischen der grössten Stadt und der
siebzehnten liegt übrigens in jedem Bild zwischen zwölf und zweiundzwanzig,
1871 wie 2024: dieselbe Spreizung, dieselbe Schrift.

### Abstand — und warum das Ruhrgebiet ihn anders braucht

Aus jedem Bündel eng benachbarter Städte bleibt die grösste, sonst trügen
Rhein und Ruhr auf einem daumengrossen Bild sieben Namen. Die Regel war
**sechzig Kilometer auf der Landkarte**, und daran ging genau diese Region
zugrunde: Köln liegt 55 Kilometer von Essen entfernt, warf es also aus der
Liste — und Essen war 1910 mit 477 611 Menschen die neuntgrösste Stadt des
Landes, grösser als Dortmund, das stattdessen dastand. Übrig blieb ein
einziger Name für eine Region, in der sechs Städte unter den zwanzig grössten
lagen: Essen, Dortmund, Düsseldorf, Duisburg, Wuppertal, Bochum.

Gedrängt wird aber nicht auf der Landkarte, sondern **auf dem Bild**. Und der
feste Boden ist ein halb eingemischtes Kartogramm, zieht das Ruhrgebiet also
auseinander: dort liegen rund zwei Bildpunkte auf einem Kilometer, im Land im
Mittel 0,9. Derselbe Abstand auf dem Bild lässt dem Revier damit gut die
doppelte Zahl an Namen — und genau da braucht man sie.

Gemessen wird als Bruchteil der Kartenbreite, ein Zwölftel, in Bodenmass. Das
hängt an nichts als der Karte: dieselben Städte auf dem Telefon wie auf dem
Schirm, gleich wie hoch oder breit das Fenster steht. Seither stehen Essen,
Dortmund und Köln nebeneinander, und 2024 kommen Münster und Karlsruhe dazu —
beide grösser als Chemnitz, beide vorher von einem Nachbarn verdeckt.

Wo zwei Namen einander trotzdem berühren, weichen beide aus: vierzig Runden
Abstossen entlang der kleineren Überlappung, dazu eine schwache Feder, die
jeden zu seinem Fleck zurückzieht. Das Ergebnis ändert sich von Bild zu Bild
ruhig, flackert also nicht. Wer dabei weit von seinem Fleck weggerutscht ist,
bekommt einen Haarstrich dorthin zurück.

Zwei Feinheiten, ohne die aus zwei Namen ein Wort wird. Erstens: Abstossen und
Feder stehen im Gleichgewicht, die Überlappung wird also nie ganz aufgelöst,
sondern nur bis auf Feder/(Feder + Abstossung). Bei 0,08 gegen 0,3 blieb ein
Fünftel stehen — „HannoverBraunschweig"; bei 0,05 gegen 0,45 ist es ein
Zehntel. Zweitens hängt der Luftspalt an der Schrift statt an einer festen
Zahl: vier Bildpunkte sind bei einer 24-Punkt-Schrift ein Haar.

Und wer gerade ausblendet, schiebt nur nach Massgabe seiner Deckkraft —
weggeschoben wird er voll. Sonst rückte die halbe Karte in dem Augenblick zur
Seite, in dem ein Name unter die Schwelle fällt.

Und keiner darf aus der Leinwand laufen. Mönchengladbach liegt so weit im
Westen, dass sein Name auf dem Telefon zwanzig Bildpunkte links neben der Karte
begann — das M war abgeschnitten. Jeder Name wird deshalb in jeder Runde in den
Rahmen geklemmt, mit einem halben Wortmass Luft an den Seiten und einem
Dreiviertel-Zeilenmass oben und unten. Das Klemmen steht **innerhalb** der
vierzig Runden und nicht danach: so weicht der Nachbar in der nächsten Runde
aus, statt dass zwei Namen am Rand übereinanderstehen. Nachgemessen über den
ganzen Lauf, in drei Fenstergrössen (1280, 420 und 390 Bildpunkte): kein Name
ragt mehr heraus.

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

| | τ | Nachlauf im Lauf |
|---|---|---|
| **weites Feld** (Höhenlinien, grosse Form) | 1,2 s | 1,1 bis 2,9 Jahre |
| **enges Feld und Rand** (Schattierung am Kreis) | 0,55 s | 0,5 bis 1,3 Jahre |

Die Spanne kommt daher, dass die Uhr nicht gleichmässig läuft: zwischen 1996 und
2011 sind es 2,44 Jahre je Sekunde, zwischen 2019 und 2024 nur 0,93 (siehe die
Taktverteilung in 4e). **Das Relief hinkt der Jahreszahl in der Ecke also um
ein bis drei Jahre nach, solange der Film läuft** — von hundertdreiundfünfzig,
und am Zähltag zusätzlich leicht gedämpft. Wer am Regler zieht, sieht den
genauen Stand: dieser Weg setzt den Tiefpass zurück, statt ihn laufen zu
lassen.

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

Die Karte wird gemalt, wie ein Atlas ein Gebirge malt: unten Wasser, dann
Tiefland in tiefem Waldgrün, Grasgrün, Gelbgrün, Gelb, Ocker, Orange, Rot —
oben Fels und Schnee. **Fünfundzwanzig Bänder**, und sie werden beim Bauen aus
ihrer Beschreibung gerechnet statt von Hand gesetzt: je Band eine Helligkeit,
ein Farbton und die grösste Buntheit, die sRGB an dieser Stelle noch hergibt,
gesucht per Halbierung in OKLCh.

Die ersten Fassungen waren blasser — gedämpftes Oliv und Graubraun, aus Sorge um
das Relief, das darüber liegt. Die Sorge war unbegründet, und auf schwarzem
Grund braucht eine Karte Farbe, sonst wird sie zu Schlamm. Gemessen in OKLab
liegt die mittlere Buntheit der Landbänder jetzt bei 0,17, gegen 0,15 der
vorigen und 0,13 der ersten Fassung.

### Unten Wasser

**Die untersten fünf Bänder sind ein See.** Wo auf die Fläche am wenigsten
Menschen kommen, liegt Wasser: tief dunkelblau, zum Ufer hin heller. Die Grenze
zwischen Wasser und Land ist die schärfste, die eine Geländekarte kennt — man
sieht auf einen Blick, welcher Teil des Landes leer ist.

Sie kostet nichts und bringt zweierlei. Erstens verteilen sich die Landbänder
über einen engeren Bereich des Feldes, **dieselbe Farbzahl löst also feiner
auf**, und zwar dort, wo die Menschen wohnen. Zweitens bekommen die frühen
Bilder ihre Zeichnung zurück: die lineare Leiter legt sie fast alle in die
untersten Bänder (siehe „Volumen ist Bevölkerung"), und genau dort liegt jetzt
die Abstufung.

### Der Meeresspiegel ist eine Zahl, die etwas heisst

Lange war er keine. Vier von vierundzwanzig Bändern waren blau, das obere Ende
der Leiter lag beim gemessenen Quantil ×2,31, und daraus fiel eine Küste bei
**×0,43** heraus. Das war kein Schwellenwert, den irgendwer kennt, sondern das
Nebenprodukt zweier anderer Entscheidungen. Blau hiess „unten", weiter nichts.

Jetzt liegt der Meeresspiegel bei **×0,50 — der halben mittleren Dichte
Deutschlands von 2024**. In der Wirklichkeit sind das **rund 95 Einwohner je
Quadratkilometer** und damit ungefähr die Linie, unterhalb derer die EU eine
Gegend „dünn besiedelt" nennt (100 E/km²). Unter Wasser steht also das, was man
strukturschwach nennt, wenn man es an der Dichte misst.

Das „ungefähr" ist ernst gemeint und der einzige Haken an der Sache. Gefärbt
wird **gezeichnete** Dichte — Menschen je Fläche auf dem festen Boden, und der
ist ein halb eingemischtes Kartogramm, das leere Kreise schrumpft und volle
streckt. ×0,50 ist damit in der Karte exakt, in Einwohnern je km² aber nur im
Mittel: die 27 Kreise, die 2024 zwischen ×0,48 und ×0,52 liegen, haben real
zwischen 78 und 126 Einwohner je km², im Median 95. Und weil der Boden die
leeren Kreise kleiner zeichnet, als sie sind, steht unter Wasser **12,4 Prozent
der Karte**, während real 31,9 Prozent der Landesfläche unter 100 E/km² liegen.
Die Karte ist an dieser Stelle strenger als die Wirklichkeit — 47 Kreise liegen
im Bild unter dem Spiegel, 43 davon auch in der Wirklichkeit unter 100.

Dass die Küste genau dort liegt, ist eine Kopplung dreier Zahlen — der Zahl der
Bänder, der Zahl der blauen darunter und dem oberen Ende der Leiter:

    Ufer = WASSER / NBAND · (1 + RESERVE) · Leiterende

Zwei davon sind frei, die dritte folgt. Gewählt sind **25 Bänder und 5 blaue**,
und damit geht die ganze Leiter in runden Zahlen auf:

| | |
|---|---|
| ein Band | ×0,1 |
| fünf Bänder | ×0,5 — die Küste |
| Ende der Farbrampe | ×2,5 |
| Beginn des Knies | ×2,222 (gemessenes Quantil ×2,305, vier Prozent daneben) |

Jede halbe Stufe fällt damit auf eine Bandgrenze und also auf eine Höhenlinie.
2024 sind 23 der 25 Bänder belegt, und Berlins Gipfel bleibt im Feld über dem
des Ruhrgebiets.

Andere Schwellen wurden geprüft und verworfen. Die **mittlere Dichte von heute**
(×1,00) setzt 58 Prozent der Fläche unter Wasser und 1871 das ganze Land — sie
sagt etwas, aber nichts mehr, was man noch sehen könnte. Die **mittlere Dichte
von 1871** (×0,35, also 82 E/km²: „dünner als das ganze Kaiserreich am Anfang
des Films") ist die schönere Erzählung und lässt 1871 halb über Wasser, zeigt
aber 2024 nur noch 4 Prozent Blau — zu wenig, um das Leerlaufen des Nordostens
noch zu sehen.

Was die Küste über die Zeit zeigt:

| Jahr | Wasserfläche |
|---|---|
| 1871 | 90,5 % |
| 1900–1910 | 55,9 % |
| 1939 | 34,4 % |
| 1946–1950 | **11,4 %** |
| 1961–1964 | 13,1 % |
| 1985–1987 | 9,9 % |
| 1996 | 8,9 % |
| 2011 | 11,4 % |
| 2024 | 12,2 % |

1871 ist Deutschland eine Inselgruppe: neun Zehntel des Landes liegen unter der
Marke, über Wasser stehen Ruhr und Köln als grosse Insel, dazu Berlin, Hamburg,
Sachsen, Frankfurt, Stuttgart und München. Das ist kein Fehler und keine
Übertreibung — nach heutigem Massstab war das Land damals fast leer. Dann steigt
es, und **um 1950 ist der Tiefstand erreicht**: nie wohnte in der Fläche so viel
Deutschland wie nach der Vertreibung. Seither steigt die See wieder, langsam und
fast nur im Nordosten — 8,9 Prozent 1996, 11,4 Prozent 2011, 12,2 Prozent 2024.
Das Binnenmeer über Mecklenburg, der Uckermark, der Altmark und der Lausitz ist
der sichtbarste Befund der ganzen Karte.

### Die Zahlen stehen auf der Leiter

Sie standen links und rechts daneben — der Anfang und das Ende, dazwischen
nichts. Bei einer **linearen** Leiter ist das die ungünstigste aller Auskünfte:
der ganze bewohnte Bereich drängt sich ins linke Drittel, und wo darin ×1 liegt,
war nicht zu erraten.

Jetzt trägt die Leiter sechs Marken, alle rund oder halb, jede an ihrer
wirklichen Stelle: **0, ×0,5, ×1, ×1,5, ×2 und ×3**. Weil die Leiter linear
teilt und bei ×2,5 endet, sitzen die ersten fünf bei 0, 20, 40, 60 und 80
Prozent — gleichmässig, jede auf einer Bandgrenze, und die ×0,5 genau auf der
Uferkante.

Die letzte ist die ×3, und sie steht am Ende der Rampe, bei 99 Prozent. Dass
nach der ×2 nicht die ×2,5 kommt, sondern gleich die ×3, liegt am Knie: ab
×2,222 biegt es die Leiter weich um, das letzte Fünftel der Rampe trägt deshalb
eine ganze statt einer halben Stufe. Die Marken stehen dadurch alle rund zwanzig
Prozent auseinander, und die Zahlen sagen, dass der letzte Schritt der doppelte
ist. Eine ×2,5 stünde drei Prozent vor der ×3 und läge auf ihr.

**Warum ×1 nicht in der Mitte steht.** In der Mitte stünde sie nur bei einem
Ende von ×2,0 — und dort ist zu wenig Platz. Über ×2,0 liegen 2024 noch
**7,1 Prozent der Fläche**: Berlin, München, Frankfurt, das halbe Ruhrgebiet,
Hamburg, Stuttgart. Die müssten sich das letzte Fünftel der Farben teilen, und
genau daran krankte eine frühere Fassung („Die Leiter war oben zu"). Über ×2,5
liegen nur noch 0,65 Prozent — das ist ein Gipfel und keine Landschaft, und
dafür sind Fels und Schnee da.

**Und was ist das sinnvolle Maximum?** Die Farben enden bei ×2,5, die Leiter
endet nicht: ab ×2,222 biegt das Knie sie weich um, und der schmale Rest der
Rampe trägt alles darüber — bis ins Unendliche, ohne je abzuschneiden. Die
letzte Marke steht deshalb auf der ×3, der höchsten runden Zahl, die noch auf
die Rampe passt. Gemessen reicht das aus: der höchste Kreis überhaupt ist
**München 2024 mit ×3,16**, danach Leverkusen ×2,71, Frankfurt ×2,56, Berlin und
Köln ×2,36. Nach dem Schärfen steht 0,012 Prozent der Fläche am rechnerischen
Anschlag — zwölf Millionstel, und dort ist ohnehin schon alles weiss.

Ein Ende bei ×3 statt bei ×2,5 wurde ausprobiert (24 Bänder, 4 blaue: die Küste
bliebe auf ×0,5, die Marken stünden bei 0, 16,7, 33,3, 50, 66,7 und 83,3
Prozent). Es sieht schlechter aus: das Knie läge dann bei ×2,667 und damit
sechzehn Prozent über dem gemessenen Quantil, die obersten vier Bänder trügen
zusammen 0,4 statt 2,2 Prozent der Fläche, und Berlin, Köln und Hamburg
verlören ihre weissen Kappen. Die Leiter wäre runder und die Karte flacher.

Vorher stand rechts „×2,3+". Die Zahl war das gemessene Quantil, das Pluszeichen
sollte sagen, dass es weitergeht — nur stand sie am äussersten Rand, und damit
sah es aus, als wäre dort Schluss. Jetzt steht sie, wo sie hingehört, und das
letzte Stück Rampe ist sichtbar mehr.

Damit die ×0,5 wirklich auf der Kante sitzt, zeigt die Farbrampe **harte
Stufen** statt eines weichen Verlaufs: ein CSS-Verlauf setzt seine Stützstellen
auf k/(N−1) und mischt dazwischen, die Bänder der Karte liegen aber auf k/N und
mischen nicht — das Ufer lag im Verlauf drei Prozent links von seiner Zahl. Die
Leiter zeigt jetzt dieselben fünfundzwanzig Bänder wie die Karte.

Darunter steht ein Satz:

> people per area relative to Germany's average in 2024

Diese Zeile hat fünf Fassungen gebraucht, und die ersten vier scheiterten an
derselben Stelle: **an der Eins**.

| Fassung | Problem |
|---|---|
| `× the average population density of Germany 2024` | schlicht falsch: Berlin stünde auf 551 E/km² statt 4 136 |
| `volume = people · ×1 = the German average of 2024` | ehrlich, aber zwei Gleichungen nebeneinander, und keine sagt, wovon das Mittel das Mittel ist |
| `people per patch of map · Germany 2024 sits at ×1` | ehrlich, aber „patch of map" ist genau der Fachbegriff, den zu vermeiden die Übung war |
| `×1 is Germany's average in 2024. ×2 means twice as many people in the same space.` | verständlich, brauchte aber zwei Zeilen |

Das Wort, das gefehlt hat, ist **„relative to"**. Es sagt in zwei Silben, dass
die Zahlen an der Leiter ein Verhältnis sind und wozu — und danach braucht keine
Gleichung mehr erklärt zu werden. Die Zeile passt mit fünf Bildpunkten Luft auf
eine Zeile bis 360 Bildpunkte Fensterbreite hinunter; darunter bricht sie um.

**Bezahlt ist das mit einer Ungenauigkeit, und sie sei hier benannt.** „Per area"
lässt offen, welche Fläche gemeint ist, und gemeint ist die **gezeichnete**. Für
das Land als Ganzes stimmt der Satz genau — die Leiter ist ja darauf geeicht.
Für einen einzelnen Kreis untertreibt er, weil das Kartogramm die Städte schon
breiter gezogen hat: Berlin steht auf ×2,4 und ist wirklich ×17,7. Wer das genau
wissen will, tippt den Kreis an; im Zettel stehen beide Zahlen nebeneinander.
Eine Legende, die gelesen wird, ist mehr wert als eine genauere, die keiner
versteht — und falsch ist der Satz nicht, nur ungefähr.

Was dort früher noch stand — der Meeresspiegel, der Stichtag — steht woanders
besser: die Zahlen auf der Leiter selbst, der Stichtag im Schild über der Karte.

Geprüft und verworfen wurde unterwegs auch, das Wort direkt auf die Marke zu
setzen — „Germany 2024" statt „×1", dann erklärt sich die Leiter von allein.
Nachgemessen ist es zu breit: die Beschriftung braucht 86 Bildpunkte, die Marken
stehen bei 360 Bildpunkten Fensterbreite aber nur 52 auseinander. Sie hätte die
×0,5 überschrieben, und das ist die Uferkante. Zwei Fassungen davor stand dort „× the average population density of
Germany 2024" und versprach damit wirkliche Dichte (siehe unten); eine Fassung
davor „volume = people · ×1 = the German average of 2024" — ehrlich, aber nicht
lesbar: zwei Gleichungen nebeneinander, und keine sagt, wovon das Mittel das
Mittel ist. Dass das Volumen die Bevölkerung ist, steht jetzt nicht mehr in der
Legende: das ist ein Bauprinzip und kein Schlüssel zur Farbleiter.

Unter Wasser wird weiter schattiert und weiter Höhenlinie gezogen. Das ist
Absicht: es sind Tiefenlinien, wie sie ein Atlas auch zeichnet, und sie kommen
aus derselben Zahl wie alles andere. Ein glatter blauer Spiegel sähe ruhiger
aus, wäre aber eine zweite Geschichte neben der einen, die diese Karte
erzählt.

**Oben endet die Leiter in Weiss**, nicht in einem hellen Braun — das ist der
Unterschied zwischen Schnee und altem Schnee, und auf einer Karte, deren Gipfel
die Frage sind, entscheidet er, ob man einen Gipfel als solchen erkennt. Das
vorletzte Band ist ein sehr helles, fast entsättigtes Grau: der Übergang von
Fels zu Schnee, und zugleich die Stelle, an der die Farbe die Sättigung ablegt,
damit das Weiss darüber als Weiss ankommt.

Die Helligkeit steigt im Wasser durchgehend bis zum Ufer, fällt dort scharf ins
Waldgrün, steigt wieder bis zum Gelb und fällt mit den Rot-Tönen. Das ist die
Konvention eines Schulatlas und nicht zu umgehen, wenn Gelb der hellste Farbton
sein soll; die beiden obersten Bänder steigen wieder bis ins Weiss.

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
| im Feld steht | Dichte / oberes Leiterende, mit Knie, auf 0 … 1 gelegt |
| die Farbe ist | das Band, in das dieser Wert fällt — zwanzig gleich breite |
| die Höhenlinie liegt | auf den Bandgrenzen |
| das Licht kommt | aus dem Gefälle desselben Feldes |

Gezeichnet wird das Feld in seiner eigenen, gröberen Auflösung und beim
Hochrechnen bilinear geglättet: die Bandgrenze wird dadurch ein Übergang von
ein, zwei Bildpunkten, und die Höhenlinie liegt in seiner Mitte. Scharf
gerastert sähe dieselbe Grenze treppig aus. Darunter liegt die Silhouette in
**einer** Farbe, der Mitte der Leiter — nicht als Farbe der Karte, sondern als
scharfe Kante, weil der Rand des hochgerechneten Feldes ein, zwei Bildpunkte
weich ist.

**Und die Zahlen passen zusammen.** Die zwanzig Bandgrenzen liegen bei k/20 des
Feldwerts, und die zwanzig Höhenlinien-Niveaus liegen bei denselben k/20.
**Jede Höhenlinie ist eine Farbgrenze, und jede Farbgrenze trägt ihre Linie.**
Das ist die Konstruktion eines Schulatlas, und es ist das, was eine Höhenlinie
auf einer Geländekarte überhaupt tun soll: den Farbwechsel begründen, statt quer
durch ihn hindurchzulaufen.

Das hing vorher an einer Zahl. Solange die Bänder auf dem *Leiterwert* lagen,
fiel eine Farbgrenze nur dann auf ein Niveau, wenn die Reserve genau ein Achtel
betrug — und auch dann nur jede zweite. Seit die Bänder auf dem *Feldwert*
liegen, fallen sie immer zusammen, und die Reserve bekommt obendrein selbst
Farbe: **die beiden obersten Bänder, Fels und Schnee, liegen oberhalb des
gemessenen Quantils.** Vorher hatte dieser Bereich keinen eigenen Ton, und
München, Berlin und Oberhausen sassen zusammen im hellsten Band.

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

### Ein roter Punkt auf dem Ort

Seit die Umrisse weg sind, sagt kein Strich mehr, wo eine Stadt genau liegt —
der Name steht ja bewusst **unter** dem Gipfel, damit er ihn nicht zudeckt.
Also ein kleiner roter Punkt auf den Ort selbst, mit dunklem Ring, und der Name
darunter. Das ist die älteste Konvention der Kartografie und die einzige, die
hier noch fehlte.

Rot, weil es die einzige Farbe ist, die auf dieser Leiter **nichts bedeutet**:
Blau, Grün, Gelb, Orange und Weiss sind Daten, ein roter Punkt ist eine Marke.
Der dunkle Ring trägt ihn über das rote Band und durch den Schnee.

Der Versatz des Namens nach unten hat zwei Teile. Der eine hängt am Fleck — bei
einem grossen rückt der Name weiter herunter, damit der Gipfel frei bleibt. Der
andere ist ein fester Abstand zur Kartenbreite; ohne ihn klebt die Schrift einer
kleinen Stadt am Punkt, weil deren Fleck kaum Versatz hergibt.

**Siebzehn Städte, und welche, entscheidet das Jahr** — siehe
[4h](#4h-die-städtenamen). Die Auswahl lief zuerst einmalig beim Bauen, nach
dem höchsten Stand, den eine Stadt je hatte; sie stand damit still, während die
Karte lief. Jetzt läuft sie in jedem Bild mit.

Auch die **Schriftgrösse** hing erst an diesem höchsten Stand, in vier festen
Stufen, und davor an der gezeichneten **Fläche**. Die Fläche hatte ihren Sinn,
solange sie mit der Bevölkerung wuchs; seit der Boden stillsteht, ist sie über
alle Jahre dieselbe — und sie sagt ohnehin mehr über den Zuschnitt des Kreises
als über die Stadt darin: Leipzig hat ein weites Stadtgebiet, Nürnberg ein
enges.

### Die Ausnahme ist auch weg

Die hundertsieben kreisfreien Städte trugen als Einzige noch einen Umriss, einen
feinen dunklen über dem Relief. Er hatte seinen Grund, solange sich die Karte
verformte: eine Stadt wuchs dann mit ihrer Bevölkerung, und der Strich sagte,
wie weit sie reicht — **bis hierhin die Stadt, der Rest ihr Schatten.**

Seit der Boden stillsteht, sagt er das nicht mehr. Die Grundfläche ist über alle
Jahre dieselbe, der Umriss zeigt also nur noch Verwaltung, und Verwaltung ist
genau das, was von dieser Karte verschwinden sollte. Damit trägt sie **keine
Grenze mehr**, in keiner Sorte.

### Volumen ist Bevölkerung

Die Leiter kann auf zwei Weisen zwischen ihren Enden aufteilen, und sie sind
nicht gleichwertig.

**Logarithmisch** — gleiche Vielfache liegen gleich weit auseinander: von ×0,5
auf ×1 ist derselbe Weg wie von ×1 auf ×2. Das löst unten gut auf, wo die
meisten Kreise liegen, und staucht oben. Die Farbe ist damit eine brauchbare
Rangfolge, aber die **Fläche unter ihr bedeutet nichts**.

**Linear** — der Feldwert *ist* die Dichte. Und Weichzeichnen erhält das
Integral, also gilt

> Volumen unter der Geländeoberfläche = Bevölkerung

nicht nur je Kreis, sondern über jeden Ausschnitt, den man herausgreift. Zwei
gleich grosse Flecken gleicher Farbe haben dann gleich viele Menschen, und ein
doppelt so hoher Berg auf halber Fläche ebenso.

**Wie genau, nachgemessen.** Der Satz ist die Absicht der Konstruktion und
gilt bis auf ein paar Prozent, nicht auf die Stelle. Drei Zahlen dazu, alle für
2024:

| | |
|---|---|
| Volumen über die ganze Karte, gegen die Summe der Zählwerte | **+2,4 %** |
| davon ohne die Schärfung | +2,1 % |
| Ruhrgebiet gegen Berlin: Volumenverhältnis 1,433 gegen 1,355 Menschen | **+5,8 %** |
| Berliner Gipfel mit Schärfung ×2,65, ohne ×2,25 | **+18 %** |

Die zwei Prozent über die ganze Karte kommen nicht von der Schärfung, sondern
vom **Rand**: das weite Weichzeichnen wird mit der weichgezeichneten Maske
normiert, damit die Küste keine grüne Bordüre bekommt. Das erhält den örtlichen
Mittelwert und bläht das Integral leicht auf.

Die achtzehn Prozent am Gipfel sind die Schärfung, und sie sind Absicht (siehe
„Weichzeichnen und Schärfen"): sie holt die Spitzen zurück, die das weite
Weichzeichnen wegbügelt. Bezahlt wird mit einer flachen Mulde rings um jede
Stadt — gemessen 0,05 Höheneinheiten, vierzig bis sechzig Feldpunkte vom
Gipfel. Volumen wird also von der Flanke auf den Gipfel verschoben.

Praktisch heisst das: **gleiches Volumen = gleich viele Menschen gilt oberhalb
der Grösse eines Ballungsraums**, nicht für den einzelnen Gipfel. Wer zwei
Berge auf drei Prozent vergleichen will, tippt sie an.

### Die Form eines Berges ist die Form des Weichzeichners

Das ist die wichtigste Grenze der Karte und die leichteste, sie zu überlesen.
Ein Kreis ist ein **Plateau von einer einzigen Höhe** — innerhalb seiner Grenzen
weiss diese Karte nichts. Was aus dem Plateau einen Berg macht, ist allein das
Weichzeichnen: die Kuppe ist die Form des Gaussschen Kerns, nicht die Form der
Besiedlung.

Berlin hat 891 km² in einem einzigen Stück, Hamburg 755. Der Kegel über Berlin
sagt also **nicht**, dass es in der Mitte am dichtesten ist — das ist wahr, aber
die Karte weiss es nicht. Sie kennt nur „3,69 Millionen, gleichmässig über 891
km²", und der Rest ist Weichzeichner.

Die Auflösung ist damit der Kreis: 400 Zellen, die kleinste Schweinfurt mit
35,7 km², die grösste die Mecklenburgische Seenplatte mit 5 495 km², im Median
800. Zweiundvierzig kreisfreie Städte liegen unter 100 km² — dort ist die Karte
am feinsten, und genau dort stehen die Gipfel.

Das entscheidet den Fall Ruhrgebiet gegen Berlin, der weiter unten steht.
Gemessen für 2024, innerhalb der jeweiligen Kreisgrenzen:

| | logarithmisch | linear | linear, mit Knie und Schärfung |
|---|---|---|---|
| mittlere Höhe Berlin | 0,88 | 0,83 | 0,88 |
| mittlere Höhe Ruhrgebiet | 0,88 | 0,75 | 0,68 |
| Gipfel Berlin : Ruhr | — | 0,87 : 0,88 | 0,97 : 0,88 |
| Volumen Ruhr : Berlin | 1,94 : 1 | 1,74 : 1 | **1,42 : 1** |
| Menschen Ruhr : Berlin | 1,36 : 1 | 1,36 : 1 | 1,36 : 1 |

Logarithmisch stehen die beiden **gleich hoch**, obwohl Berlin dichter ist.
Linear steht Berlin höher, aber sein *Gipfel* stand immer noch niedriger als
der des Ruhrgebiets — das lag am Deckel der Leiter und am Weichzeichnen, und
beides ist behoben (Knie, siehe 4f; Schärfung, gleich unten). Der Rest, 1,44
statt 1,36, ist das, was der Weichzeichner immer noch über Berlins Kreisgrenze
hinausträgt; wer weiter aussen misst, kommt näher heran.

Der Preis steht unten: die Hälfte der Fläche liegt in den untersten zwei, drei
Bändern, und die frühen Bilder verlieren an Zeichnung — 1900 liegen ein Viertel
der Fläche in den untersten fünf Bändern. Das Relief trägt dort, was die Farbe
nicht mehr trägt. Der Schalter steht im Skript (`LINEAR = false`), ohne Knopf.

### Bezogen worauf? Absolut

Die Höhe ist ein Verhältnis, und die Frage ist, wozu. Bezug ist die Dichte
**Deutschlands 2024**, für jedes Bild dieselbe:

    Höhe = Dichte des Kreises / Dichte Deutschlands 2024

×2 heisst damit in jedem Jahr dasselbe, und daraus folgt das Bild, um das es
geht: 1871 liegt das Land fast einfarbig im Tiefgrün, und über die Jahrzehnte
steigt es daraus auf, bis 2024 die halbe Karte im Orange liegt. Seit die Karte
nicht mehr mitwächst (2.), ist die Farbe der einzige Ort, an dem das Wachstum
steht — und dort steht es richtig.

Der Preis ist bekannt: die frühen Bilder haben weniger Binnenzeichnung. 1871
hebt sich das Ruhrgebiet nur noch schwach vom Umland ab, weil sein Vorsprung am
Maßstab von 2024 gemessen klein ist. Das Relief trägt dort, was die Farbe nicht
mehr trägt.

Die Gegenrechnung, **relativ**, war lange die Voreinstellung: Bezug ist dann die
mittlere Dichte *desselben Bildes*, ein Kreis steht auf ×2, wenn dort doppelt so
dicht gewohnt wird wie im Landesdurchschnitt jenes Jahres, und wer mit dem Land
Schritt hält, behält seine Farbe über hundertfünfzig Jahre. Das zeigt die
Verteilung schärfer und verschweigt das Wachstum. Der Schalter steckt im Skript
(`bezugAbsolut(false)`), ohne Knopf; die gemessenen Spannen hängen daran und
werden beim Umschalten verworfen. Gerechnet ist der Unterschied ein einziger
Faktor — die Bevölkerung des Bildes geteilt durch die des letzten, also 0,35 im
Jahr 1871.

### Eine Leiter, und sie misst die Form, die gezeichnet wird

Solange die Seite drei Formen zeigte, musste die Leiter alle drei umschliessen,
sonst hiesse ×1 je nach Knopfstellung etwas anderes. Das kostete: die Landkarte
streut am weitesten, also setzte **sie** das obere Ende, und in der halben
Verzerrung blieb ein Stück Leiter ungenutzt.

Mit einer Form misst die Leiter genau das, was auch gezeichnet wird. Ihr
fünfundneunzigstes Prozent liegt bei ×2,04 statt bei ×2,29 der Landkarte, also
rücken die Farben um gut ein Zehntel nach oben — was die Schneegrenze wieder
ausgleicht (Faktor 1,17 statt 1,04, siehe unten). Am Ende steht die Leiter fast
genau dort, wo sie vorher stand, **×0,28 … ×2,39**, aber sie steht dort aus dem
richtigen Grund.

Was bleibt: dieselbe Farbe heisst über die ganzen hundertdreiundfünfzig Jahre
dasselbe. Das hängt am festen Bezug und am festen Massstab, nicht an der Zahl
der Formen.

### Die Leiter wird gemessen, nicht gesetzt

Gesetzt ist an der Leiter nur, dass sie fünfundzwanzig Bänder hat; wo sie
anfängt und aufhört, kommt **aus den Daten**: alle vierhundert Kreise in allen zehn
Zählungen, das fünfte und das fünfundneunzigste Prozent (oben plus siebzehn
Prozent Schneegrenze, siehe unten), einmal gemessen und dann behalten. Das geht,
ohne zu zeichnen, weil die Höhe ein Verhältnis ist und sich beim Skalieren der
ganzen Karte nicht ändert.

Gemessen wird an der gezeichneten Form, der halben Verzerrung: **×0,28 … ×2,305**.
Zum Vergleich, damals mitgemessen: die Landkarte streute ×0,18 … ×2,68, das
volle Kartogramm ×0,35 … ×1,17 — die Landkarte setzte also das obere Ende für
alle drei.

Nach oben läuft die Leiter als Knie weiter bis ×2,50 am Ende der Farbrampe;
unten fängt sie bei null an, und die untersten fünf Bänder sind Wasser. Das Knie
beginnt seit dem gesetzten Meeresspiegel nicht mehr beim gemessenen Quantil,
sondern bei ×2,222 — vier Prozent darunter, und dafür endet die Rampe auf einer
runden Zahl (siehe „Der Meeresspiegel ist eine Zahl, die etwas heisst").

### Das Ruhrgebiet und Berlin

Die dichtesten Kreise sind 2024 auf dem festen Boden München ×3,16,
Leverkusen ×2,71, Frankfurt ×2,56, Berlin und Köln ×2,36, Oberhausen ×2,31,
Hamburg ×2,22, Essen ×2,07. Berlin ist also dichter als jede einzelne
Ruhrstadt. (Die Zahlen sind Höhen auf dem gezeichneten Boden, nicht Einwohner
je km²: der Boden streckt die Ballungsräume und staucht die leeren Kreise.) Auf der Karte sah es lange umgekehrt aus —
das Ruhrgebiet trug die grosse helle Kappe, Berlin einen Fleck, und wer das
liest, liest dort zwei- bis dreimal so viele Menschen. **Drei Gründe, und alle
drei sind Darstellung, nicht Befund.**

**1. Die Leiter war oben zu.** Sie endete beim fünfundneunzigsten Prozent, und
alles darüber wurde auf denselben Wert geklemmt: Berlin, München, Essen,
Oberhausen, ununterscheidbar, reichlich vier Prozent der Kartenfläche in einem
Ton. Schlimmer noch — der Unterschied zwischen ihnen war weg, **bevor der erste
Weichzeichner lief**. Was danach noch über die Höhe entschied, war allein die
Breite der Fläche, und da gewinnt ein Band dichter Städte gegen einen einzelnen
Fleck: Berlins Gipfel stand im Feld auf 0,866, der des Ruhrgebiets auf 0,877.
Behoben durch das **Knie** (4f): die Leiter läuft bis zum Quantil genau linear
und darüber weich weiter, geklemmt wird nichts mehr.

**2. Die Reserve hatte keine Farbe.** Die Farbbänder endeten am Quantil, die
Spitze darüber bekam keinen eigenen Ton. Jetzt liegen die Bänder auf dem
Feldwert, und die beiden obersten — Fels und Schnee — gehören ihr allein.

**3. Weichzeichnen trägt Volumen über die Kreisgrenze.** Über die ganze Karte
bleibt das Integral erhalten, über einen Ausschnitt nicht, und wen es trifft,
entscheidet die Nachbarschaft: Berlin verliert an Brandenburg und bekommt von
dort nichts zurück, Essen verliert an Bochum und bekommt von Bochum dasselbe
wieder. Der Weichzeichner bevorzugt damit systematisch das Plateau vor der
Spitze.

Dagegen steht eine **Unscharfmaskierung**: zum engen Feld wird ein Anteil der
Differenz „enges Feld minus sehr weites Feld" hinzugeschlagen. Diese Differenz
ist genau das Mass für „steht dieser Berg allein" — gross bei einem einzelnen
Gipfel, klein über einem Plateau, und über die ganze Karte mittelwertfrei,
sodass das Volumen die Bevölkerung bleibt.

**Der Bezug muss dabei sehr weit sein, und das war zuerst nicht so.** Eine
Fassung lang wurde gegen das ohnehin vorhandene weite Feld geschärft
(`ENGANTEIL` 1,15 statt 0,55 — dieselbe Rechnung, anders geschrieben). Das
zieht aber eine **Wölbung** ab: über einem breiten Plateau wie Berlin ist das
enge Feld flach, das weite wölbt sich zur Mitte auf, und was übrig bleibt, hat
in der Mitte eine Kuhle. Gemessen quer durch Berlin, im Feldwert:

| | Rand | Mitte |
|---|---|---|
| enges Feld | 0,929 | 0,929 |
| weites Feld | 0,761 | 0,839 |
| Ergebnis, alte Schärfung | 0,955 | **0,943** |

Zwölf Tausendstel Kuhle, und die Schattierung macht daraus eine sichtbare
Mulde im Gipfel — Berlin und Hamburg trugen einen Krater.

Der Bezug ist deshalb jetzt ein **drittes, sehr viel weiteres Feld**, rund
dreimal so weit wie das bisherige. Über einem Plateau ist es fast konstant, die
Schärfung hebt es also als Ganzes statt es auszuhöhlen; der Anteil ist dafür
klein (0,13 statt 0,15). Die Form der Kuppe macht danach wieder das gewohnte
Gemisch aus engem und weitem Feld, und weil das enge mit 0,85 unter eins liegt,
**läuft der Gipfel in einer flachen Spitze aus** statt flach zu enden.

(Höchster Punkt im Kreis, nicht der Wert auf dieser einen Zeile:)

| | ohne Schärfung | alte, enge | neue, sehr weite |
|---|---|---|---|
| Gipfel Berlin | 0,937 | 0,972 | **0,988** |
| Gipfel Ruhrgebiet | 0,875 | 0,887 | 0,901 |
| Kuhle in Berlins Mitte | keine | −0,012 | **keine** |
| Volumen Ruhr : Berlin | 1,51 | 1,45 | **1,45** |

Berlin steht damit als einziges grosses Gebiet im Schnee, das Ruhrgebiet bleibt
im Rot — und das ist die Reihenfolge, die auch in den Zahlen steht.

Das sehr weite Feld wird nicht auf der Leinwand gerechnet, sondern **in
Zahlen**: ein Kastenfilter mit laufender Summe kostet je Bildpunkt dasselbe,
egal wie breit er ist, und zweimal quer angewendet ist er glatt genug für einen
Bezugswert. Das spart die teure dritte Weichzeichnung und vor allem das dritte
Auslesen der Bildpunkte. Normalisiert wird er mit derselben Deckung wie die
anderen Felder, sonst zöge das Meer die Küste herunter und eine Hafenstadt sähe
weniger allein aus, als sie ist.

**Der Preis steht im Gipfel.** Eine Unscharfmaskierung überschiesst: Berlins
höchster Punkt liest sich um gut ein Zehntel über der Dichte seines eigenen
Kreises. Das ist der Tausch — der Gipfel ist eine Schätzung, das Volumen ist
die Bevölkerung. Mehr Schärfung klemmt den Gipfel oben wieder an, dann ist
nichts gewonnen.

Wo die Leiter oben endet, bleibt eine eigene Stellschraube — die
**Schneegrenze**. Seit das Knie nichts mehr kappt, entscheidet sie nicht mehr
darüber, ob ein Gipfel Zeichnung behält, sondern nur noch, wie hoch der Schnee
anfängt. Gemessen für 2024:

| Schneegrenze | Fels und Schnee | Gipfel Berlin : Ruhr | Volumen R:B |
|---|---|---|---|
| 1,00 × q0,95 | 2,9 % | 0,99 : 0,92 | 1,48 |
| **1,04 × q0,95** | **1,8 %** | **0,97 : 0,89** | **1,44** |
| 1,08 × q0,95 | 1,4 % | 0,95 : 0,86 | 1,44 |

Gewählt ist 1,04: knapp ein Prozent der Fläche im weissen Band, knapp zwei in
den obersten beiden. Und die Schneegrenze wandert mit den Jahren — 1943 liegt
nichts darüber, die Gipfel entstehen erst.

Was bleibt, bleibt zu Recht. Die gleichfarbige Zone ist im Ruhrgebiet grösser,
weil dort auf grösserer Fläche ähnlich dicht gewohnt wird. Bei halber
Verzerrung steckt die Hälfte des Unterschieds in der Fläche und die andere in
der Höhe; wer die reinen Zahlen will, tippt einen Kreis an — Berlins 3,7
Millionen stehen neben den 5,0 des Ruhrgebiets.

Gewichtet wird mit der **Fläche**, nicht je Kreis gleich. Das ist der
Unterschied zwischen „wie dicht wohnt ein Kreis" und „wie dicht ist das Land
hier", und gefärbt wird Fläche. Ungewichtet setzten die hundertsieben
kreisfreien Städte das obere Quantil: sie sind dicht, aber winzig, und nach dem
Weichzeichnen bleibt von ihnen wenig übrig. Die Leiter reichte dann weit über
das hinaus, was im Feld je vorkommt, und **die halbe Palette blieb ungenutzt** —
die Hälfte der Bänder auf der Landkarte. Aus demselben Grund fünf Prozent an
den Enden statt eines halben: das Weichzeichnen zieht die Verteilung ohnehin zur
Mitte.

### Wenn keine Höhe mehr übrig ist — und warum das jetzt niemanden mehr angeht

*Das Folgende ist **aus dem Skript entfernt**, zusammen mit dem vollen
Kartogramm. Es steht hier, weil es erklärt, was an dieser Karte hängt, sobald
jemand das Kartogramm zurückholt — und weil es eine der wenigen Stellen war, an
denen die Karte etwas über sich selbst wusste.*

Im vollen Kartogramm steckt die ganze Bevölkerung in der Fläche; **innerhalb**
eines Jahres hat dort jeder Kreis dieselbe Dichte, es gibt also keine Höhe. Was
das Feld dort noch an Unterschieden zeigt, ist der Rest, den das
Diffusionsverfahren nicht ganz wegbekommen hat.

Gemessen wird deshalb eine zweite Zahl: die **Binnenspanne**, also die
gewichtete Spanne innerhalb *eines* Bildes, und davon die grösste über alle
Bilder. Sie ist etwas anderes als die Gesamtspanne, aus der die Farbleiter
kommt — im Kartogramm sind die beiden sogar grundverschieden: innerhalb eines
Jahres keine Streuung, über die Jahre die volle. Vorher fielen sie zusammen und
eine Zahl reichte für beides; seit die Karte nicht mehr mitwächst, nicht mehr.

Aus der Binnenspanne kommt ein Anteil zwischen 0 und 1, und der blendet zweierlei
aus:

1. Das **Relief** — Schattierung, Mulden, Schlagschatten, Höhenlinien werden mit
   ihm multipliziert. (Unter zwei Prozent wird die Linienverfolgung ganz
   übersprungen, was im Kartogramm auch Rechenzeit spart.)
2. Die **Farbe**, die mit demselben Anteil gegen die Farbe des Bildmittels
   läuft. Ohne das wurden aus den Konvergenzresten sichtbare Farbbänder: auf
   einer Leiter, deren Band einen Faktor 1,17 breit ist, lag 1943 ein
   Ost-West-Verlauf über dem Kartogramm, der wie ein Befund aussah und keiner
   war.

Der Weg vom Relief zum Kartogramm zeigte damit genau das, worum es geht: **die
Berge sinken in die Fläche, weil die Menschen von der Höhe in die Breite
wandern** — und die Farben gleichen sich an, während sie sinken. Den Weg kann
man auf der Seite gerade nicht gehen; die Mechanik dafür steht noch.

Auch die **Mindestbreite** der Leiter (Faktor 2,6, um ein halbes Band
verschoben) ist weg. Bei halber Verzerrung stand die gemessene Binnenspanne bei
1,76 gegen die 0,96, ab denen sie überhaupt eingegriffen hätte — sie hat nie
etwas getan, solange nur diese eine Form gezeichnet wurde. Wer das Kartogramm
zurückholt, braucht beide wieder: dort schnurrt die Spanne auf ein Prozent
zusammen, und ohne Bremse wird aus den Rundungsresten des Diffusionsverfahrens
ein Gebirge.

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

### Eine Falle beim Nachmessen

Alle diese Zahlen sind im Prüfbrowser gemessen, und dabei ist zweimal dasselbe
schiefgegangen: nach einem Sprung am Zeitregler braucht das weite Feld seine
Zeitkonstante, 1,2 Sekunden, um dort anzukommen. Wer nach 700 Millisekunden
misst oder ein Bild macht, sieht erst vierundvierzig Prozent des Weges — die
Karte ist dann zu kalt und die gemessene Gipfelfläche zu gross. So kamen die
„über zehn Prozent" zustande, die hier eine Fassung lang standen; richtig sind
reichlich vier.

Die Proben leeren den Tiefpass deshalb jetzt nach jedem Sprung
(`reliefFrisch(); zeichne();`) und messen das exakte Feld.

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
