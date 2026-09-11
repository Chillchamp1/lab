# Deutschland, gezeichnet von seinen Menschen

→ **https://chillchamp1.github.io/lab/bevoelkerung-kreise/**

Die Bevölkerungsentwicklung auf einer regionalen Ebene, die sich nicht ändert:
den 400 heutigen Kreisen und kreisfreien Städten. Jeder Kreis wird so gross
gezeichnet, wie er Menschen hat, und die Karte läuft durch die Zeit — von der
ersten Reichszählung 1871 bis zum 31. Dezember 2024, von 29,3 auf 83,6
Millionen.

Das Besondere gegenüber den anderen Kartogrammen hier: **die Karte wächst
mit**. Ein Kartogramm für sich verteilt nur um, seine Gesamtfläche bleibt
gleich, ob 1871 oder heute. Hier gilt für alle Zeitpunkte dieselbe Fläche je
Mensch, also ist 1871 wirklich kleiner als 2024 — flächenproportional, halb so
viele Menschen, halb so viel Karte. Die Seite ist auf Englisch und fürs
Hochformat gebaut.

Die Ansicht lässt sich umschalten. **Growth** steht vorn und ist die eigentliche
Karte: sie färbt jeden Kreis danach, wie schnell er gerade wächst oder
schrumpft. **People** färbt nach Einwohnern,
logarithmisch von 30 000 bis 1,5 Millionen und in jedem Bild gleich — dass die
Karte über die Zeit nachdunkelt, ist deshalb kein Kniff, sondern das Ergebnis.
**Growth** rechnet die Veränderung je Jahr über den Abschnitt, den die Zeit
gerade durchläuft. Blau wächst, Rot schrumpft, Grau
hält sich. Man sieht das Ruhrgebiet innerhalb eines Menschenlebens vom dunkelsten
Blau der Karte ins Rot kippen und den Osten nach 1990 rot werden. An den
Zählungen blendet die Lesart über, statt umzuspringen; die mittleren zwei Drittel
jedes Abschnitts zeigen seine Rate unverfälscht.

Rot gegen Blau statt Rot gegen Grün: Rot und Grün sind genau das Paar, das
etwa acht Prozent der Männer nicht auseinanderhalten können, und auf einer
Karte mit 400 kleinen Flecken wäre das nicht nur unschön, sondern unlesbar.
Rot gegen Blau trägt dieselbe Bedeutung und funktioniert bei jeder Form von
Farbsehen.

## Was jeweils geschah

Oben links **in** der Karte steht ein Faden aus Überschriften: Ostflucht,
Weltkrieg, Vertreibung, Wirtschaftswunder, Gastarbeiter, Zechensterben, Wende,
Zensuskorrektur 2011, Ukraine. Die Karte zeigt, *dass* sich etwas ändert und
*wo* — das Warum steht in keiner Zahl, also steht es daneben. Kommt eine neue
Überschrift, setzt sie sich obenauf und schiebt die vorigen eine Zeile nach
unten, blasser mit jedem Schritt; sechs bleiben stehen, auf dem Telefon vier.
Weil der Faden über der Zeichnung liegt und nicht über dem Rahmen, kostet er
keine Höhe.

Dreizehn Notizen sind es insgesamt, jede mit ihrem Zeitfenster; vollständig mit
allen Sätzen noch einmal in einer Liste unter der Karte. Was darin eine
Kreiszahl nennt, ist aus der Tabelle dieser Seite genommen, der Rest ist
Schulwissen und als solches gekennzeichnet.

Die Uhr läuft siebzig Sekunden für 153 Jahre — langsam genug, um die
Überschriften zu lesen.

## Und dasselbe stehend

**Standing up**, die dritte Ansicht, dreht die Idee um: die Karte behält ihre
wirkliche Form, und die Menschen stellen sich auf. Über jeder Rasterzelle von
31 km² steht eine Nadel, so hoch wie die Menschen darin — die Machart der
„crisp spike maps" von Milos Popovic, nur läuft sie durch die Zeit. Aus der
Ebene von 1871 wächst bis 2019 eine Skyline; die höchste Nadel hält 212 270
Menschen. Der Blick steht fünfzig Grad über der Ebene, Norden oben, damit man
die Karte wiedererkennt und trotzdem Tiefe sieht. Der Grund ist der der Seite:
auf dunklem Papier glühen die Nadeln von Indigo nach Gold, auf hellem laufen
sie von blassem Creme ins tiefe Violett — eine Seite, ein Hintergrund.

Grundlage sind hier nicht die Kreise, sondern die 11 007 **Gemeinden** aus GPOP.
Damit die Nadeln vergleichbar sind, verteilt jede Gemeinde ihre Menschen
gleichmässig über eine Scheibe ihrer eigenen Fläche, und gezählt wird je
Rasterzelle; die Nadelhöhe ist danach Dichte, nicht Gemeindegrösse. Die Zellen
liegen versetzt — ein Dreiecksgitter, also dasselbe Muster wie ein
Sechseckraster —, sonst stehen die Nadeln in Spalten wie auf Karopapier und man
sieht eher das Papier als das Land. Dass beide Ansichten dieselben Zahlen
zeigen, wird beim Bauen geprüft: die Gemeindesummen je Bild gegen die
Kreissummen, 0,0000 Prozent.

## Gebietsstand

Der heutige Kreis ist die Einheit, der fünfstellige AGS der Schlüssel. Jeder
Zeitpunkt ist auf denselben Gebietsstand gerechnet — und zwar nicht von dieser
Karte, sondern von der Quelle: die German Local Population Database setzt jede
historische Gemeinde dorthin, wo ihr Gebiet heute liegt, und summiert von
unten auf.

Damit lösen sich zwei der klassischen Fallen von selbst. **Gross-Berlin**:
Berlin hat 1871 nicht die 826 000 Einwohner der damaligen Stadt, sondern
931 984 — die 1920 eingemeindeten Orte sind zurückgerechnet. **Oder-Neisse**:
für Görlitz, Frankfurt (Oder), Guben und Forst schätzt die Quelle, wie viele
Menschen auf dem heute deutschen Teil lebten; das sind die einzigen
geschätzten Werte in der Tabelle, und jeder trägt den Vermerk.

Die Zahlen werden nicht stillschweigend gemischt. Bis 1910 zählte man die
ortsanwesende Bevölkerung samt Militär, ab 1939 die Wohnbevölkerung; 1985,
1996, 2019 und 2024 sind Fortschreibungen. Und zwischen 1949 und 1990 zählten
die beiden deutschen Staaten zu verschiedenen Tagen — vier Bilder tragen
deshalb zwei Stichtage nebeneinander, angeglichen wird nichts. Jede Zeile führt
ihren Begriff und ihren wirklichen Stichtag mit. Ausführlich in
[METHODIK.md](METHODIK.md).

## Verfahren

Über der Karte liegt ein **Gitternetz**: Quadrate von 30 mal 30 Kilometern
echter Fläche, die in derselben Strömung mitschwimmen wie die Kreise. Jede
Masche hält gleich viel Land, also ist ihre Grösse auf der Karte die Zahl der
Menschen darauf — weit gezogen über Berlin, Hamburg, Ruhrgebiet und München, zu
einem Knoten zusammengezogen auf dem Land. Das ist die Dichte, die das
Kartogramm ausgegeben hat, um Fläche zu Bevölkerung zu machen; sonst fällt sie
weg, hier steht sie da.

Und die Karte liegt nicht flach. Aus den Kreisflächen und den gleich breiten
Fugen dazwischen entsteht ein Höhenfeld, das von oben links beleuchtet wird —
die grossen Städte gehen als Kuppen auf, die kleinen Kreise bleiben flache
Kissen. Das ist keine zweite Zahl, sondern folgt aus der ersten: alle Kreise
sind gleich dick, und weil die Fläche schon die Bevölkerung ist, ist es das
Volumen dann auch. Ein Buckel, der bei grossen Kreisen auch höher wäre, zeigte
Fläche mal Fläche und damit nichts.

Diffusionskartogramm nach Gastner und Newman (2004), wie bei den
[Wahlkreisen](../wahlkreise-2025/): die Dichte wird als Wärme aufgefasst und
fliesst auseinander, bis sie überall gleich ist, und die Grenzen schwimmen mit.
Für jeden Zeitpunkt ein eigenes Kartogramm, jedes vom vorigen aus gestartet —
so ist der Übergang eine Bewegung und kein Sprung.

Dazwischen wird nicht geradlinig gerechnet, sondern mit einer monotonen
kubischen Kurve: sie geht durch jeden gezählten Wert, knickt an den Zählungen
nicht und bleibt trotzdem immer zwischen den beiden Werten, die sie verbindet.
Vorher sprang die Geschwindigkeit an jeder Zählung um bis zu 74 Prozent, jetzt
um höchstens 12,8.

Die Uhr läuft nicht gleichmässig durch die Jahre. Jeder Abschnitt bekommt einen
Anteil an den 70 Sekunden, der Dauer und Umschichtung mischt — der Bruch von
1939 auf 1946 also fünf Sekunden statt drei, während die langen ruhigen Strecken
trotzdem den grössten Teil behalten, weil sie am längsten sind. Keiner bekommt
weniger als viereinhalb Sekunden; sonst wäre er vorbei, ehe die Notiz gelesen
ist.

Dreizehn Städte tragen ihren Namen, von Anfang an und durchgehend. Die Schrift
wächst mit dem Fleck, fällt aber nie unter das, was auf einem Telefon noch zu
lesen ist; wo zwei Namen einander berühren, weichen sie aus. Städte im Umkreis
von sechzig Kilometern um eine grössere sind nicht beschriftet — sonst trügen
Rhein und Ruhr allein sieben Namen.

## Was geprüft ist

Drei Gegenproben laufen bei jedem Bauen mit:

- Die Summe der Kreise gegen die Ländersummen derselben Quelle: **0,0000 %**
  Abweichung.
- Die Quelle gegen das Historische Gemeindeverzeichnis des Landes Brandenburg,
  für die fünf Stichtage, die beide führen. Das sind **zwei voneinander
  unabhängige Umrechnungen** auf heutigen Gebietsstand — eine vom Landesamt,
  eine von Roesel. Sie weichen im Mittel um 0,07 bis 0,12 Prozent voneinander
  ab, im schlimmsten Fall um 1,2 Prozent (Barnim 1910).
- Die Fortschreibung 2019 gegen das Gemeindeverzeichnis 2024, als Fangnetz für
  vertauschte Schlüssel.

Dazu die Geometrie: Flächensumme der 400 Kreise nach der Generalisierung
357 102 km² gegen amtlich 357 677 km², also 0,16 Prozent Verlust durch den
Massstab 1:2 500 000. Verbleibende Flächenabweichung im Kartogramm im Median
unter einem Promille, keine gefalteten Ringe.

## Daten

- **Bevölkerung 1871–2019** — Roesel, Felix (2022): *The German Local
  Population Database (GPOP), 1871 to 2019*, Jahrbücher für Nationalökonomie
  und Statistik, DOI 10.1515/jbnst-2022-0046. CC BY 4.0.
- **Bevölkerung 2024, Flächen und Namen** — Gemeindeverzeichnis des
  Statistischen Bundesamts, Stand 31.12.2024
- **Geometrie** — BKG, Verwaltungsgebiete 1:2 500 000, Gebietsstand
  1. Januar 2026, © GeoBasis-DE / BKG, Datenlizenz Deutschland –
  Namensnennung 2.0
- **Gegenprobe** — Amt für Statistik Berlin-Brandenburg, Historisches
  Gemeindeverzeichnis des Landes Brandenburg 1875 bis 2005

Die aufbereitete Tabelle liegt als
[`data/bevoelkerung_kreise_long.csv`](data/bevoelkerung_kreise_long.csv)
daneben, eine Zeile je Kreis und Zeitpunkt, mit Stichtag, Begriff, Methode und
Quelle.

Was noch fehlt — die preussischen Zusatzzeitpunkte 1816 bis 1864, die Zählungen
1880, 1890, 1925 und 1933, der Zensus 2022 — steht in [STAND.md](STAND.md);
was geprüft und was erreichbar war, in [QUELLEN.md](QUELLEN.md).

## Neu bauen

Zwei Schritte; der erste braucht Python und zwei Pakete, der zweite nur Node.
Welche Rohdaten daneben liegen müssen, steht in [build/DATEN.md](build/DATEN.md).

```
cd build
pip install pypdf openpyxl
python3 quellen.py
node build.mjs > ../index.html
```

Alle drei Ansichten stecken in dieser einen Datei; `nadeln.mjs` rechnet das
Relief und wird von `build.mjs` mitgenommen.
