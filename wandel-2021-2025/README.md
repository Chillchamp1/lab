# Vier Jahre später, die Hälfte gewechselt

→ **https://chillchamp1.github.io/lab/wandel-2021-2025/**

Die Bundestagswahlen 2021 und 2025 im selben Bild. Die Karte blendet zwischen
den Jahren, jeder Wahlkreis in der Farbe seiner stärksten Partei bei den
Zweitstimmen. Umschaltbar zwischen echter Fläche und Bevölkerungskartogramm,
und zwischen allen Gebieten und nur den gewechselten.

## Was die Zahlen sagen

In **149 von 299 Wahlkreisen** führt 2025 eine andere Partei als 2021 — genau
die Hälfte. Die Richtung ist einseitig: jeder dieser Wechsel geht von der SPD
oder den Grünen weg. Ein einziger Wahlkreis wandert zur SPD, und der kam von
den Grünen.

| 2021 stärkste | 2025 stärkste | Wahlkreise |
|---|---|---|
| SPD | CDU/CSU | 98 |
| SPD | AfD | 32 |
| Grüne | CDU/CSU | 11 |
| Grüne | Linke | 4 |
| SPD | Linke | 3 |
| Grüne | SPD | 1 |

Die AfD hat in **allen 299** Wahlkreisen zugelegt, SPD und FDP haben in
**allen 299** verloren. Die Grünen legen in vier zu, die Linke in 289,
die Union in 287.

## Warum ein Vergleich hier überhaupt geht

Wahlkreisgrenzen ändern sich zwischen den Wahlen — für 2025 wurden 16 neu
abgegrenzt. Ein Gebiet-für-Gebiet-Vergleich wäre damit eigentlich unmöglich.

Die Bundeswahlleiterin weist im amtlichen Ergebnis zu jedem Wert die
**Vorperiode** aus, umgerechnet auf den aktuellen Zuschnitt. Beide Jahre liegen
hier also auf der Einteilung von 2025, und zwar nach amtlicher Umrechnung, nicht
nach eigener Schätzung. Nur deshalb behalten die Gebiete über die Zeit ihre
Identität und die Farben können ineinander blenden, statt dass zwei
verschiedene Polygonmengen übereinandergelegt werden müssten.

Diese Umrechnung reicht genau eine Wahl zurück. Für eine längere Reihe müsste
jede Wahl auf ihrer eigenen Geometrie stehen — dann wäre nur noch Überblenden
möglich, kein Morphen.

## Verfahren

Geometrie, Kartogramm und Kodierung wie bei der
[Momentaufnahme](../wahlkreise-2025/): Diffusionskartogramm nach Gastner und
Newman auf flächentreuer Projektion, verbleibende Flächenabweichung im Median
0,20 Prozent. Gewichtet wird für beide Jahre nach der Bevölkerung von 2023 —
sonst würde die Fläche zwei Dinge gleichzeitig erzählen.

Die Zeitachse läuft von selbst hin und her, mit Halt an beiden Enden, und lässt
sich anhalten. Bei `prefers-reduced-motion` startet sie angehalten auf 2025.

## Daten

Amtliches Endergebnis der Bundestagswahl 2025 samt ausgewiesener Vorperiode
(Stand 14.03.2025), Wahlkreisgeometrie und Strukturdaten — alle von der
Bundeswahlleiterin, Datenlizenz Deutschland – Namensnennung 2.0. CDU und CSU
sind zusammengefasst. Das Ergebnis von 2021 schliesst die Berliner
Wiederholungswahl vom Februar 2024 ein.

## Neu bauen

```
cd build && node build.mjs > ../index.html
```

Welche Rohdaten daneben liegen müssen, steht in [build/DATEN.md](build/DATEN.md).
