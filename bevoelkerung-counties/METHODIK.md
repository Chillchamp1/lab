# Methodik

Diese Seite ist die Schwester der [Karte der deutschen
Kreise](../bevoelkerung-kreise/METHODIK.md). Was dort über das
Diffusionskartogramm, das Geländemodell, die Beleuchtung, die monotone
Interpolation und den Takt der Zeitachse steht, gilt hier unverändert — es ist
dieselbe Maschine. Hier steht nur, was **anders** ist.

## 1. Die Geometrie kommt als TopoJSON

Die deutsche Karte liest ein Shapefile: dort trägt jedes Gebiet seine Grenze
selbst, benachbarte Kreise haben dieselbe Linie zweimal, und `topologie.mjs`
schweisst sie über exakte Koordinatengleichheit wieder zusammen.

TopoJSON speichert jede Grenze **einmal** als Bogen und lässt beide Nachbarn
darauf zeigen. Die Topologie ist also schon da. Der Leser in `topojson.mjs`
rechnet die Bögen trotzdem in Punktfolgen zurück und lässt das Verschweissen
laufen — die Bogenenden sind dann bitgleich, und der bestehende Weg bleibt
unverändert. Ein Sonderfall weniger ist ein Fehler weniger.

3 108 Gebiete, 3 242 Ringe, 61 342 Punkte. Zum Vergleich: Deutschland hat 400
Gebiete, 465 Ringe und 60 868 Punkte. Achtmal so viele Gebiete bei derselben
Gesamtkomplexität — US-Countys sind im Westen oft Rechtecke.

Projiziert wird flächentreu azimutal auf 96 Grad West und 37,5 Grad Nord, den
Bezugspunkt des US National Atlas. Flächentreu muss es sein, weil das
Kartogramm Flächen ausgleicht.

## 2. Das Knotenbudget

Deutschland kommt mit 12 000 Knoten aus, also rund dreissig je Kreis. Hier sind
es **24 000** — knapp acht je County. Das klingt wenig und reicht trotzdem,
weil die Generalisierung nach Visvalingam knotenweise entscheidet und an der
eigenen Fläche des Gebiets misst: ein Rechteck in Wyoming braucht vier Punkte,
und die gesparten kommen der zerklüfteten Ostküste zugute. Unter vier Punkte je
Ring geht es nie.

Das war teuer gelernt: ein erster Bau mit 8 000 Knoten ergab 2,6 Punkte je
Gebiet, und das Kartogramm kam auf eine mittlere Abweichung von 37 Prozent.
Nicht das Gitter war schuld, sondern die Geometrie.

## 3. Wie genau das Kartogramm wird — und warum nicht genauer

Das ist der ehrliche Teil.

Bei den deutschen Kreisen bleibt die Abweichung zwischen gezeichneter Fläche
und Bevölkerungsanteil im Median **unter 0,2 Prozent**. Hier nicht:

| Bild | 1900 | 1920 | 1940 | 1960 | 1980 | 2000 | 2020 |
|---|---|---|---|---|---|---|---|
| Median | 3,8 % | 6,6 % | 8,9 % | 13,4 % | 14,0 % | 14,8 % | 17,2 % |

Die Zahl wächst mit der Zeit, und das ist kein Zufall: je später das Bild,
desto stärker sitzen die Menschen in wenigen Countys, und desto extremer muss
die Verformung sein.

**Warum es nicht besser wird.** Die Dichte der deutschen Kreise spannt gut drei
Zehnerpotenzen — Berlin gegen die Prignitz. Die der US-Countys spannt fünf:
Manhattan hat 28 000 Menschen je Quadratkilometer, Loving County in Texas
0,04. Das Diffusionsverfahren nach Gastner und Newman muss Manhattan um das
Hundertfache aufblasen und Loving County um das Tausendfache schrumpfen, und
das in einem einzigen zusammenhängenden Feld.

Nachgemessen: dreissig Durchgänge statt sechs bringen nichts. Der Median pendelt
ab etwa dem zwölften Durchgang zwischen 15 und 22 Prozent, und die Zahl
gefalteter Ringe **steigt** dabei — das Feld beginnt sich zu überschlagen.
Der Bau behält deshalb je Bild den besten Durchgang, der ganz ohne Faltung
auskommt. In allen dreizehn Bildern und allen Zwischenformen ist das Ergebnis
faltungsfrei: 0 von 42 016 geprüften Ringen.

Ein feineres Gitter ist nicht die Antwort — es macht das Zielfeld schärfer und
die Strömung unruhiger. Was helfen würde, wäre ein anderes Verfahren für den
Randfall extremer Dichteunterschiede. Das steht noch aus.

## 4. Die Daten

Zwei Quellen, beide in [QUELLEN.md](QUELLEN.md) beschrieben, und eine Regel:
**es wird nichts geschätzt.** Jeder Wert steht so in einer Quelle oder gar
nicht. Die Spalte `anteil_interpoliert` ist deshalb überall 0.

`methode` ist `A`, wo der Wert direkt aus der Quelle kommt, und `B`, wo er die
Summe mehrerer damaliger Gebiete ist, deren Vereinigung genau das heutige
ergibt. Elf solcher Zusammenführungen gibt es, alle in `quellen.mjs`
aufgeschrieben und begründet — Umbenennungen mit neuer Kennziffer (Dade County
wird 1997 zu Miami-Dade, Shannon County 2015 zu Oglala Lakota) und
Eingliederungen (Bedford city geht 2013 in Bedford County auf). Addieren ist
dann exakt und kein Schätzen; dieselbe Begründung, mit der die deutsche Karte
Eisenach dem Wartburgkreis zuschlägt. **Geteilt wird nie.**

## 5. Was die Prüfung ergeben hat

Vor dem ersten Strich stand ein Prüfbericht; er liegt in
[`bevoelkerung-kreise/build/pruefung/usa/bericht.md`](../bevoelkerung-kreise/build/pruefung/usa/bericht.md)
und ist mit `pruefe.mjs` jederzeit neu zu erzeugen. Die tragenden Befunde:

- **Beide Bilanzen schliessen auf null.** 1900 ergeben Countys, Territorien und
  die in NHGIS fehlende Zeile für den District of Columbia zusammen 75 994 575
  — genau die veröffentlichte Zahl. 2020 ergeben Karte plus Alaska plus Hawaii
  331 449 281, ebenfalls genau.
- **Zwei unabhängige Quellen stimmen überein.** NHGIS gegen Forstall: zehn
  Abweichungen in 30 451 Vergleichen, alle zehn namentlich im Bericht, alle
  zehn an Grenzen, die sich bewegt haben.
- **Die nominale Integration kostet im Median nichts.** Für 1990 bis 2020 gibt
  es bei NHGIS eine zweite Tabelle auf einheitlichem Gebietsstand. Gegen sie
  gehalten ist die mittlere Abweichung der benutzten Reihe null; über ein
  Prozent weichen 14, 7 und 7 Gebiete ab.

## 6. Was noch fehlt

- Die Bilder **1900 und 1910** haben 290 und 165 Löcher — Countys, die es damals
  noch nicht gab. Um sie zu füllen, braucht es die historischen Grenzpolygone
  (Atlas of Historical County Boundaries der Newberry Library) und eine
  Flächeninterpolation. Das wäre dann Methode C, mit Qualitätsflag je Zelle.
- Ein **vierzehntes Bild** für 2025 aus der Schätzreihe des Census Bureau. Es
  braucht zusätzlich die Gemeindezahlen, weil Connecticut seine Countys 2022
  durch neun Planungsregionen ersetzt hat und der Join sonst genau dort bricht.
- Ein Verfahren, das mit fünf Zehnerpotenzen Dichte umgeht (Abschnitt 3).
