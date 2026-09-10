# Methodik

Was hier steht, gilt für den jetzigen Stand: das Pilotgebiet Berlin und
Brandenburg über 16 Zeitpunkte von 1875 bis 2025. Was noch fehlt und warum,
steht in [STAND.md](STAND.md); welche Quellen geprüft wurden, in
[QUELLEN.md](QUELLEN.md).

## 1. Gebietsstand

**Einheit ist der heutige Kreis, Schlüssel der fünfstellige AGS.**

Geometrie: BKG VG2500, Ebene KRS, Gebietsstand 1. Januar 2026, ETRS89/UTM 32N,
401 Kreise. Für Zuordnungen und die amtlichen Flächen: das
Gemeindeverzeichnis-Informationssystem GV-ISys des Statistischen Bundesamts,
Stand 31. Dezember 2024, 400 Kreise.

Die beiden unterscheiden sich in genau einem Punkt, und der ist entschieden
worden:

> **Hanau** ist zum 1. Januar 2026 kreisfrei geworden (AGS 06415) und steht in
> VG2500 bereits als eigener Kreis. Keine Bevölkerungsreihe trennt die Stadt
> vom Main-Kinzig-Kreis — auch die jüngste nicht. Ein Kreis, der in allen
> Zeitpunkten ein Loch wäre, hilft niemandem, also wird Hanau in der Geometrie
> wieder in den Main-Kinzig-Kreis aufgelöst. Damit sind es **400 Gebiete**, der
> Kreisstand des Gemeindeverzeichnisses vom 31.12.2024. Sobald eine Reihe Hanau
> gesondert ausweist, fällt der Eintrag in `GEBIETSSTAND` weg und es sind 401.

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
   zu neuen Ringen verkettet. Nur so verschmelzen zwei Gebiete wirklich,
   statt nebeneinander liegen zu bleiben. Gegenprobe an Eisenach und dem
   Wartburgkreis in der Ersatzgeometrie: 104,3 + 1 263,8 km² vorher,
   1 368,0 km² nachher.

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

Kreise ohne Zahlen werden vor dem Rechnen aussortiert. Solange die Reihe nur
einen Teil Deutschlands abdeckt, bekämen sie sonst den grössten Teil des
Knotenbudgets und der Nutzlast, obwohl sie nie gezeichnet werden.

## 3. Die Zahlen

### Rangfolge der Methoden

- **A** — eine Reihe, die ein Statistisches Landesamt schon auf einen
  einheitlichen Gebietsstand gerechnet hat. Direkt übernommen.
- **B** — historische Gemeindedaten, Gemeinde für Gemeinde einem heutigen Kreis
  zugeordnet und aufsummiert.
- **C** — nur wo ausschliesslich Kreisdaten existieren: Flächeninterpolation
  über historische Kreisgrenzen, mit Qualitätsflag und interpoliertem Anteil.

Historische Kreise werden **nie** pauschal einem heutigen gleichgesetzt.

Im jetzigen Stand ist **jede Zelle Methode A**; Spalte `anteil_interpoliert`
ist überall 0.

### Woher die Zellen stammen

| Zeitpunkte | Gebiet | Quelle | Methode |
|---|---|---|---|
| 1875, 1890, 1910, 1925, 1933, 1939, 1946, 1950, 1964, 1971, 1981 | Brandenburg, 18 Kreise | Amt für Statistik Berlin-Brandenburg, *Historisches Gemeindeverzeichnis des Landes Brandenburg 1875 bis 2005*, Tabelle 1 | A |
| 1995, 2000, 2011, 2022, 2025 | Berlin und Brandenburg, 19 Kreise | dasselbe Amt, *Bevölkerungsstand — lange Reihe 1990/91 bis 2025*, Blatt 1 und Blatt 7 | A |

Das Historische Gemeindeverzeichnis sagt über sich selbst: „Für den gesamten
Zeitraum ab 1875 wurde der Bevölkerungsbestand zum einheitlichen Gebietsstand,
dem 31.12.2005, umgesetzt. Jede Gemeinde wird betrachtet, als ob diese
veränderte Struktur bereits am 01.12.1875 bestand." Brandenburgs Kreise sind
seit 1993 unverändert, der Stand von 2005 ist also der heutige. Weiter: „Für
die Bevölkerungsangaben bis 1981 wurden die amtlichen Ergebnisse der
Volkszählungen, für spätere Jahre die Stichtagsangaben jeweils zum 31.12. aus
der amtlichen Bevölkerungsfortschreibung verwendet."

Die Vorlage ist ein Text-PDF, keine Bildvorlage; die Zahlen werden ausgelesen,
nicht abgeschrieben. Das Skript dafür ist `build/quellen.py`.

### Bevölkerungsbegriff

Nicht stillschweigend gemischt, sondern je Zeile in der Spalte `begriff`
geführt:

| Zeitpunkte | Begriff |
|---|---|
| 1875 bis 1933 | ortsanwesende Bevölkerung — wer in der Zählnacht da war, Militär eingeschlossen |
| 1939 bis 1981 | Wohnbevölkerung |
| ab 1995 | Fortschreibung, Bevölkerung am Ort der Hauptwohnung |

Der Bruch liegt bei der Zählung vom 17. Mai 1939, die erstmals die
Wohnbevölkerung ausweist. Er ist keine Erfindung der Karte, sondern eine
Eigenschaft der Zählungen; die Quellen selbst schreiben den Begriff nicht
mit, er folgt der jeweils gültigen Zählungsdefinition.

### Stichtage

Werden **nicht** angeglichen. Jede Zeile trägt ihren eigenen Stichtag, und die
Karte zeigt ihn an. Das ist wichtig, sobald West und Ost dazukommen: die
Bundesrepublik zählte am 13.9.1950, 6.6.1961, 27.5.1970 und 25.5.1987, die DDR
am 31.8.1950, 31.12.1964, 1.1.1971 und 31.12.1981. Ein gemeinsames Bild trägt
dann beide Stichtage nebeneinander, nicht einen gemittelten.

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

Fünf Dinge kommen gegenüber der Wahlkreiskarte dazu:

**Mehrere Durchgänge.** Ein einzelner bleibt an der Gitterauflösung hängen.
Nach jedem Durchgang wird die verformte Geometrie neu gerastert und der
Restfehler erneut ausgeglichen.

**Warmer Start.** Zwei aufeinanderfolgende Zählungen unterscheiden sich wenig.
Das Kartogramm des nächsten Zeitpunkts fängt deshalb beim vorigen Ergebnis an,
nicht wieder bei der Landkarte. Das spart Rechenzeit und hält die Bilder
beieinander, sodass der Übergang eine Bewegung ist und kein Sprung. Bilder mit
Lücken starten kalt von der Landkarte: sie an eine Reihe anzuhängen, die mehr
abdeckt, würde ihre Form von Gebieten prägen lassen, für die es keine Zahlen
gibt.

**Ausschnitt nach den Daten.** Das Gitter richtet sich nach den Kreisen mit
Zahlen, nicht nach ganz Deutschland. Andernfalls blieben dem Pilotgebiet zu
wenige Zellen, und der Ausgleich käme nicht über wenige Prozent hinaus.

**Zwei Reihen.** Kreise, die nur in weniger als der Hälfte der Bilder Zahlen
haben, bekommen eine eigene Reihe: einmal ohne sie, einmal mit. Im Pilotgebiet
ist das Berlin. Die Stadt hat Zahlen erst ab 1995 und dann 59 % der Menschen
der Region; weil sie eingeschlossen und auf dem Boden winzig ist, presst sie im
Kartogramm alles andere zu einem Ring. Beide Reihen liegen über derselben
Geometrie und teilen denselben Massstab, sodass Umschalten wirklich heisst
„dasselbe Bild, ein Kreis mehr". Sobald ein Gebiet in der Mehrzahl der Bilder
Zahlen hat, entfällt die zweite Reihe von selbst.

**Gemeinsamer Massstab.** Das Kartogramm selbst verteilt nur um; seine
Gesamtfläche bleibt die der Ausgangskarte, gleich wie viele Menschen darin
wohnen. Damit die Karte *mit* der Bevölkerung wächst, wird für alle Zeitpunkte
dieselbe Fläche je Mensch festgelegt — so viel, dass das bevölkerungsreichste
Bild gerade die Fläche der geografischen Karte einnimmt. Jeder gespeicherte
Zustand ist auf diese Fläche normiert und um den festen Schwerpunkt der
Gesamtkarte zentriert; die Grösse steckt allein im Faktor
√(Bevölkerung / grösste Bevölkerung), der beim Zeichnen wieder daraufkommt.
Halb so viele Menschen heisst dann wirklich halb so viel Karte.

Zwischen zwei Zeitpunkten läuft die Karte linear in der Zeit, nicht in
gleichen Schritten je Zählung: 1946 und 1950 liegen dicht beieinander, 1890 und
1910 weit auseinander, und so sieht man es auch. Was zwischen zwei Stichtagen
gezeigt wird, ist interpoliert, und die Karte sagt das an.

## 5. Bekannte Fehlergrössen

| Grösse | Wert |
|---|---|
| Flächenabweichung im Kartogramm, Median über alle Bilder | siehe `bau.log` beziehungsweise die Angabe unter der Karte |
| Flächenabweichung, Maximum | dito |
| Gefaltete Ringe | 0 |
| Generalisierung: Flächenänderung gegenüber VG2500 | 0,16 % über alle Kreise |
| Zahlen selbst | amtliche Ergebnisse, unverändert übernommen; Rundungen der Quelle bleiben |

Die Gegenprobe der Zahlen läuft bei jedem Lauf von `quellen.py` mit: die Summe
der 18 brandenburgischen Kreise wird gegen die veröffentlichte Landeszeile
gehalten. Grösste Abweichung über alle 29 Stichtage der Quelle: **0,0000 %**.
Die vom Auftrag gesetzte Schwelle von 1 % ist damit nicht annähernd berührt.

## 6. Die vier Fallen

- **Oder-Neisse-Grenze.** Betrifft im Pilotgebiet Frankfurt (Oder) und die
  Kreise Märkisch-Oderland, Oder-Spree, Spree-Neisse und Uckermark. Die Quelle
  löst das selbst: sie rechnet auf den Gebietsstand 31.12.2005, also auf das
  heutige, westliche Gebiet. Die östlichen Teile geteilter Kreise und der
  östliche Teil Frankfurts sind nicht enthalten. Für Görlitz und Guben, die
  ausserhalb des Pilotgebiets liegen, ist die Frage noch offen.
- **Gross-Berlin 1920.** Ungelöst. Berlin steht erst ab 1995 in den Daten, weil
  keine erreichbare Quelle die 1920 eingemeindeten Orte für die Zeit davor
  ausweist. Die Zahlen für das alte Berlin (66,9 km²) wären keine Zahlen für
  das heutige Berlin (891 km²) und werden deshalb nicht eingesetzt. Siehe
  STAND.md.
- **Saarland.** Ausserhalb des Pilotgebiets, noch offen.
- **Bevölkerungsbegriff.** Behandelt, siehe oben.

## 7. Die Datei

`data/bevoelkerung_kreise_long.csv`, eine Zeile je Kreis und Zeitpunkt:

| Spalte | Inhalt |
|---|---|
| `kreis_ags` | fünfstelliger AGS des heutigen Kreises |
| `kreis_name` | Name nach GV-ISys |
| `jahr` | Name des Bildes; kann mehrere Stichtage bündeln (etwa „1950" für 13.9. West und 31.8. Ost) |
| `stichtag` | der wirkliche Tag der Zählung, ISO |
| `bevoelkerung` | Personen |
| `begriff` | ortsanwesende Bevölkerung, Wohnbevölkerung oder Fortschreibung |
| `methode` | A, B oder C |
| `anteil_interpoliert` | Anteil des Werts aus Flächeninterpolation, 0 bis 1 |
| `quelle` | Werk, Tabelle, Gebietsstand |
| `bemerkung` | Freitext, etwa die Zensusbasis einer Fortschreibung |
