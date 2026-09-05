# 299 Wahlkreise, nach Menschen gewichtet

→ **https://chillchamp1.github.io/lab/wahlkreise-2025/**

Die Bundestagswahl 2025 auf Ebene der 299 Wahlkreise. Jeder in der Farbe der
Partei mit den meisten Zweitstimmen; ein Regler verzieht die Karte von der
Fläche zur Einwohnerzahl.

Entstanden auf eine Bitte unter dem r/MapPorn-Beitrag zur
[Kreiskarte](../wahlkarte-2025/) — dieselbe Wahl, aber nach Wahlkreisen
statt nach Kreisen.

## Warum diese Karte anders aussieht

Wahlkreise werden nach Bevölkerung zugeschnitten, Kreise nicht. Die Fläche
schwankt um den Faktor 235, die Einwohnerzahl nur zwischen 193.000 und 395.000.
Das Kartogramm muss also praktisch die gesamte Flächenvariation wegbügeln und
endet nahe einer gleichmässigen Parkettierung. Was an Unterschied bleibt, zeigt,
wo das Zuschnittprinzip strapaziert wird.

Ein Nebeneffekt: die Auflösung ist sauberer als bei der Kreiskarte. Dort mussten
Gemeindeverbände zu Kreisen zusammengefasst und in einigen Städten Wahlkreise
eingesetzt werden, mit zwei Sonderfällen. Hier ist der Wahlkreis von vornherein
die Einheit, in der das Ergebnis erhoben wird — keine Aggregation, keine
Ausnahmen.

## Verfahren

Diffusionskartogramm nach Gastner und Newman (2004): die Einwohnerdichte wird
als Wärme aufgefasst und fliesst auseinander, bis sie überall gleich ist, und
die Grenzen schwimmen mit der Strömung mit.

Der erste Anlauf benutzte das Kraftverfahren nach Dougenik, Chrisman und
Niemeyer, wie es die Kreiskarte tut. Bei Wahlkreisen scheitert das: weil die
Zielflächen fast gleich sind, muss die gesamte Flächenvariation verschwinden,
und das Aufblasen um Schwerpunkte zerstört dabei die Umrisse — Gotha–Ilm-Kreis
wurde zur konturlosen Sichel, Berlin-Reinickendorf zur Blase. Das Diffusionsfeld
ist glatt, alle Punkte folgen derselben Strömung, und die Formen bleiben.

Gerechnet wird auf einer flächentreuen Projektion (Lambert azimutal, 52° N 10° O).
Die Wärmeleitungsgleichung wird nicht per Fourier gelöst, sondern über ihre
analytische Lösung: das Feld zur Zeit *t* ist das Ausgangsfeld, gefaltet mit
einer Gaussglocke der Breite σ = √(2t) — angenähert durch Kastenfilter in
linearer Zeit. Das Verfahren läuft mehrfach; nach jedem Durchgang wird die
verformte Geometrie neu gerastert und der Restfehler erneut ausgeglichen, weil
ein einzelner Durchgang an der Gitterauflösung hängenbleibt.

Geprüft wurde nicht nur die Flächenbilanz, sondern auch, ob die Gebiete einander
überdecken: von 652.719 belegten Rasterzellen ist genau eine doppelt belegt.

## Daten

- **Zweitstimmen** — amtliches Endergebnis, Stand 14. März 2025
  (`kerg2.csv` aus dem Open-Data-Angebot)
- **Geometrie** — Wahlkreiseinteilung zum 21. Deutschen Bundestag,
  generalisierte Fassung in geografischen Koordinaten
- **Einwohnerzahlen** — Strukturdaten der Wahlkreise, Stand 31.12.2023

Alle drei von der Bundeswahlleiterin, Datenlizenz Deutschland – Namensnennung 2.0.
CDU und CSU sind zusammengefasst.

Gewichtet wird nach der Gesamtbevölkerung. Das gesetzliche Kriterium für den
Zuschnitt ist die deutsche Bevölkerung — deshalb weichen die Gebiete stärker
voneinander ab, als es das Bundeswahlgesetz vermuten lässt.

## Neu bauen

Die Skripte in `build/` erzeugen die `index.html` aus den Rohdaten. Sie laden
nichts herunter; die drei Quelldateien müssen daneben liegen. Kein npm, keine
Abhängigkeiten — Shapefile- und DBF-Leser sind Teil des Ordners.

```
cd build && node build.mjs > ../index.html
```

Welche Rohdaten daneben liegen müssen, steht in [build/DATEN.md](build/DATEN.md).
