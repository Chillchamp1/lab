# Die Wahl 2024, nach Menschen gewichtet

→ **https://chillchamp1.github.io/lab/usa-wahl-2024/**

Die US-Präsidentschaftswahl 2024 auf Ebene der Countys. Jedes in der Farbe des
Siegers, ein Regler verzieht die Karte von der Fläche zur Einwohnerzahl.

Trump gewann **2661 der 3109 Countys**, Harris **448**. Bei den Stimmen stand es
76,92 zu 74,55 Millionen. Diese Lücke zwischen gewonnener Fläche und gewonnenen
Stimmen ist der ganze Punkt der Karte: das rote Meer der Landkarte schrumpft im
Kartogramm auf ein Netz zwischen den Ballungsräumen zusammen.

## Umfang

Die Countys des Festlands plus Washington DC. **Alaska und Hawaii fehlen.**
Im Kartogramm blieben sie als leere Ozeanfläche stehen, und eine
Verbundprojektion, die sie heranrückt, bricht die Flächentreue, auf der das
Verfahren beruht. Zusammen sind das sieben Wahlleute und rund 0,8 Millionen
Stimmen.

Zwei Eigenheiten der Gebietsgliederung sind berücksichtigt: Connecticut hat
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

## Verfahren

Diffusionskartogramm nach Gastner und Newman (2004) auf einer flächentreuen
Albers-Projektion (Bezugsbreiten 29,5° und 45,5° N). Beide Zustände benutzen
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
