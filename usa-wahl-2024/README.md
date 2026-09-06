# Die Wahl 2024, nach Menschen gewichtet

→ **https://chillchamp1.github.io/lab/usa-wahl-2024/**

Die US-Präsidentschaftswahl 2024 auf Ebene der Countys. Ein Regler verzieht die
Karte von der Fläche zur Einwohnerzahl; Alaska und Hawaii stehen oben, im selben
Massstab. Umschaltbar zwischen einer Skala für den Vorsprung und der üblichen
Sieger-Einfärbung.

Trump gewann **2661 der 3109 Countys**, Harris **448**. Bei den Stimmen stand es
76,92 zu 74,55 Millionen. Diese Lücke zwischen gewonnener Fläche und gewonnenen
Stimmen ist der ganze Punkt der Karte: das rote Meer der Landkarte schrumpft im
Kartogramm auf ein Netz zwischen den Ballungsräumen zusammen.

## Umfang

Alle 3109 Countys des Festlands plus Washington DC, dazu Hawaii mit vier
Countys und Alaska — zusammen 3114 Gebiete. Alle im **selben Massstab**: auf
der Landkarte überall dieselbe Fläche je Bildpunkt, im Kartogramm überall
dieselbe Zahl Menschen.

Übliche US-Karten verkleinern Alaska stillschweigend auf etwa ein Drittel.
Hier wäre das gerade der Fehler, den die Darstellung zeigen will: Alaska
erscheint auf der Landkarte so gross, wie es ist, und schrumpft im Kartogramm
auf ein Zehntel seiner Kantenlänge — 3651 mal 1922 Kilometer werden zu 382 mal
201.

## Drei Sonderfälle

**Alaska erscheint ungeteilt.** Der Staat zählt nicht nach Boroughs aus,
sondern nach Wahlbezirken des Staatsparlaments; auf Borough-Ebene gibt es
keine Zahlen. Alaska trägt deshalb das Landesergebnis (Trump 56,9 zu Harris
43,1 Prozent) als ein einziges Gebiet, ohne Binnengrenzen. Innerhalb Alaskas
ist die Karte stumm. Nebenbei überschreitet der Staat mit den Aleuten die
Datumsgrenze, was vor dem Projizieren entwirrt werden muss.

**Kalawao gehört zu Maui.** Das County auf Molokaʻi — 81 Einwohner, die
frühere Leprakolonie — wählt wahlrechtlich mit Maui und hat keine eigenen
Ergebnisse. Es ist dort eingerechnet.

Zwei weitere Eigenheiten: Connecticut hat
2022 seine Countys durch Planungsregionen ersetzt, mit neuen FIPS-Codes — hier
erscheinen die Planungsregionen, weil Geometrie und Ergebnisse beide darauf
liegen. Und die Ergebnisquelle teilt Washington DC in acht Wards auf, während
die Geometrie einen Bezirk kennt; die Wards werden zusammengefasst. Ohne das
bekäme DC nur die Stimmen von Ward 1.

## Was hier schwieriger ist als in Deutschland

| | Deutschland | USA |
|---|---|---|
| Fläche je Gebiet | Faktor 235 | Faktor 10.123 |
| Einwohner je Gebiet | Faktor 2 | Faktor 203.275 |

Von 48 Menschen in Loving County, Texas, bis zu 9,8 Millionen in Los Angeles.
Das Rechengitter stösst an seine Grenze, wo ein County kleiner ist als eine
Zelle — die unabhängigen Städte in Virginia messen fünf Quadratkilometer.

Deshalb taugt die übliche Kennzahl hier nicht. Der ungewichtete Median der
Flächenabweichung wird von menschenleeren Countys bestimmt, die auf der
fertigen Karte unsichtbar sind: Kenedy County in Texas hat 330 Einwohner und
müsste um das Tausendfache schrumpfen, sein Restfehler ist gewaltig und sein
sichtbarer Beitrag null.

Aussagekräftig ist der Fehler dort, wo Fläche entsteht. Nach Einwohnern
gewichtet liegt die mittlere Abweichung bei **1,9 Prozent**, und **98 Prozent
der Kartenfläche** entfallen auf Countys mit weniger als 20 Prozent Abweichung.
Das Verhältnis Ist zu Soll liegt für vier Fünftel der Countys zwischen 0,89
und 1,22.

## Die Farben

Eine naive Wahlkartenpalette aus reinem Rot und Blau ist wahrnehmungstechnisch
schief. In OKLab gemessen:

| Farbe | Helligkeit L | Buntheit C |
|---|---|---|
| reines Rot | 0,628 | 0,258 |
| reines Blau | 0,452 | 0,313 |

0,18 Helligkeitspunkte Unterschied — Rot wirkt dadurch heller, näher und
schwerer, und das Auge zählt Fläche falsch.

Die Skala hier ist in OKLab konstruiert und hat an beiden Enden **dieselbe
Helligkeit und dieselbe Buntheit** (gemessen 0,004 Unterschied) sowie eine
neutrale graue Mitte. Der Vorsprung wird linear aufgetragen: die Menge an Farbe
entspricht dem Vorsprung, ein Gebiet bei fünfzig zu fünfzig ist grau statt
kräftig violett.

Was das **nicht** leistet: verlässlich zeigen, wer landesweit führt. Grosse
zusammenhängende Flächen wirken schwerer als ein feines Netz gleicher
Gesamtfläche. Rechnerisch liegt der einwohnergewichtete Farbwert nahe am
Landesergebnis (0,008 gegen 0,016), optisch bleibt ein Rest. Dafür ist der
Balken unter der Karte da. Der Umschalter *nur Sieger* zeigt zum Vergleich die
übliche Darstellung, in der ein Gebiet mit 50,1 Prozent aussieht wie eines mit
90.

## Verfahren

Diffusionskartogramm nach Gastner und Newman (2004) auf einer flächentreuen
Albers-Projektion (Bezugsbreiten 29,5° und 45,5° N). Festland und Hawaii werden
gerechnet; Alaska ist ein einziges Gebiet, sein Kartogramm ist deshalb eine
reine Skalierung um den Schwerpunkt und exakt. Beide Zustände benutzen
dieselben 22.789 Stützpunkte; Punkte gleicher Ausgangslage sind zu einem Knoten
verschweisst, damit gemeinsame Grenzen beim Verziehen gemeinsam bleiben.

Das Verfahren läuft mehrfach: nach jedem Durchgang wird die verformte Geometrie
neu gerastert und der Restfehler erneut ausgeglichen. Hier ist das wichtiger als
in Deutschland, weil die kleinsten Countys anfangs keine einzige Rasterzelle
belegen — nach dem ersten Durchgang sind sie gewachsen und werden auflösbar.

## Daten

- **Countygrenzen** — US Census Bureau, kartografische Grenzdatei 2024,
  generalisiert (1:20 Mio)
- **Einwohnerzahlen** — US Census Bureau, Schätzung zum 1. Juli 2024
- **Wahlergebnisse** — [tonmcg/US_County_Level_Election_Results_08-24](https://github.com/tonmcg/US_County_Level_Election_Results_08-24)

Geometrie und Bevölkerung sind amtlich. Die Ergebnisse sind es **nicht**: in
den USA führt keine Bundesbehörde die Wahlergebnisse zusammen, Wahlen sind
Sache der Staaten. Benutzt wird eine gepflegte Sammlung. Als Gegenprobe ergeben
Festland und DC 76,92 Millionen Stimmen für Trump und 74,55 Millionen für
Harris; die Differenz zum landesweiten Ergebnis entspricht Alaska und Hawaii.
Eine akademisch dokumentierte Alternative wäre das
[MIT Election Lab](https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/VOQCHQ).

## Neu bauen

```
cd build && node build.mjs > ../index.html
```

Welche Rohdaten daneben liegen müssen, steht in [build/DATEN.md](build/DATEN.md).
