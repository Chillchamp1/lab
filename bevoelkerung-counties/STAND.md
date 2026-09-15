# Stand

Stand: 15. September 2026. Zweite Fassung — das Kartogramm rechnet jetzt.

## Fertig

- **3 108 Gebiete**, die Lower 48 und der District of Columbia, Gebietsstand
  2020 (Connecticut also mit acht Countys, Oglala Lakota schon unter 46102).
- **Dreizehn Bilder**, 1900 bis 2020, von 75,5 auf 329,3 Millionen Menschen.
- **39 824 Zeilen** in `data/bevoelkerung_counties_long.csv`, davon alle nach
  Methode A oder B, `anteil_interpoliert` durchweg 0.
- Geometrie als TopoJSON, 24 000 Knoten nach Generalisierung, 0 von 42 016
  geprüften Ringen gefaltet.
- Seite rund 790 kB, lädt nichts nach.

## Gemessen

| | |
|---|---|
| Bilanz 1900 | 75 994 575, Differenz 0 zur amtlichen Zahl |
| Bilanz 2020 | 331 449 281 mit Alaska und Hawaii, Differenz 0 |
| Countysumme gegen Staatszeile | fünf Abweichungen von je einer Person in dreizehn Bildern |
| NHGIS gegen Forstall | zehn Abweichungen in 30 451 Vergleichen |
| Kartogramm, gezeichnete Fläche gegen Bevölkerungsanteil | California 0,91×, Texas 1,11×, New York 0,96×, Pennsylvania 0,97×, Florida 0,89× |
| davor, mit Faltungsschranke 0 | California 0,24×, Montana 5,9×, Wyoming 4,9× — die Karte stand still |
| Wichtung gegen die Landkarte | 0,12 statt 0,5 — auf dieselbe gezeichnete Verformung geeicht wie Deutschland (2,01 % gegen 1,92 %) |
| Verschiebung durch das volle Kartogramm | 16,72 % der Diagonale, Deutschland 3,83 % |
| Film | 1080 × 1080 statt 1080 × 1920, weil die Bühne 1,57 breit zu hoch misst |
| Gefaltete Ringe | 0 |

## Offen

| Fehlt | Warum | Weg dorthin |
|---|---|---|
| 290 Gebiete in 1900, 165 in 1910 | Countys, die es damals nicht gab; die Menschen stehen im Vorgänger | Atlas of Historical County Boundaries, Flächeninterpolation, Methode C |
| Bild 2025 | Schätzreihe liegt noch nicht vor | `co-est2025-alldata.csv` und `sub-est2025` für Connecticut |
| Kartogramm unter 1 % | Verfahren stösst bei fünf Zehnerpotenzen Dichte an seine Grenze | anderes Verfahren; mehr Durchgänge helfen nachweislich nicht |
| Alaska, Hawaii | versetzte Montage reisst das gemeinsame Feld auseinander | offen, ob überhaupt wünschenswert |

## Was als Nächstes am meisten brächte

1. **Die historischen Grenzen.** Sie schliessen die einzige sichtbare Lücke der
   Karte — das Loch, das Oklahoma 1900 in den Kontinent reisst.
2. **Das Bild 2025.** Zwei Dateien, ein Join über 169 Towns, und die Karte
   reicht bis heute statt bis 2020.
3. **Ein besseres Kartogramm.** Kein Datenproblem, ein Rechenproblem — und das
   einzige, bei dem diese Karte hinter der deutschen zurückbleibt.
