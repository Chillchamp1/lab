# America, drawn by its people

Eine Geländekarte der Vereinigten Staaten, in der die Höhe nicht das Land
meint, sondern die Menschen. Dreizehn Volkszählungen von 1900 bis 2020, 3 108
Countys, jedes Bild ein flächentreues Kartogramm: wo viele wohnen, wird die
Fläche gross und das Gelände hoch.

**[Zur Karte →](https://chillchamp1.github.io/lab/bevoelkerung-counties/)**

Die Schwester dieser Seite ist
[die Karte der deutschen Kreise](../bevoelkerung-kreise/); Maschine und
Bildsprache sind dieselben, die Daten sind es nicht.

## Was zu sehen ist

Der Regler läuft durch 120 Jahre. Die Notizen oben links sagen, was gerade
geschieht — nicht als Deutung der Karte, sondern als das, was in keiner Zahl
steht. Der Rest ist die Karte selbst:

- **1900 bis 1920.** Der Kontinent füllt sich noch. Oklahoma wird 1907 Staat,
  Arizona und New Mexico 1912.
- **1920 bis 1930.** Detroit baut das Auto und verdoppelt sich daran: Wayne
  County wächst von 348 793 Menschen im Jahr 1900 auf 1 888 946 im Jahr 1930.
- **1930 bis 1940.** 961 von 3 089 Countys verlieren Menschen. Die Great Plains
  wehen davon.
- **1950 bis 1970.** Die Industriestädte erreichen ihren höchsten Stand und
  kippen. Wayne County steht 1970 bei 2 666 751 und fällt seither.
- **2010 bis 2020.** 1 637 von 3 108 Countys schrumpfen — 52,7 Prozent, zum
  ersten Mal mehr als die Hälfte.

Alle diese Zahlen stehen in `data/bevoelkerung_counties_long.csv` und sind von
dort genommen, nicht aus dem Gedächtnis.

## Was fehlt, und warum

**Alaska und Hawaii sind nicht dabei.** Alaska allein ist ein Fünftel der
Landfläche bei 0,2 Prozent der Menschen; versetzt einmontiert würde es das
Kartogramm auseinanderreissen, das auf einem gemeinsamen Feld rechnet.

**In den Bildern 1900 und 1910 sind Löcher.** 290 beziehungsweise 165 der 3 108
Gebiete haben dort keine Zahl — nicht weil niemand dort wohnte, sondern weil es
das County noch nicht gab. Die Menschen stehen im Vorgänger, auf dessen alten
Grenzen. Sie auf die heutigen umzurechnen braucht historische Grenzpolygone;
das ist der nächste Schritt und noch nicht getan. Die Karte behandelt solche
Gebiete wie Wasser: sie treiben mit und werden nicht gezeichnet.

**Das Kartogramm zählt hier weniger als bei den Kreisen.** Gezeigt wird es zu
28 statt zu 50 Prozent gegen die Landkarte. Gemessen verschiebt es die Knoten
17,7 Prozent der Kartendiagonale, Deutschland nur 3,8 — das Viereinhalbfache.
Bei gleicher Wichtung verlöre das Land seine Form, und weil die Farbe die
*gezeichnete* Dichte meint, würden die Städte dabei auch noch blasser. Beides
zusammen in [METHODIK.md](METHODIK.md), Abschnitt 3.

**Das Kartogramm ist nicht so genau wie das deutsche.** Bei den Kreisen bleibt
die Abweichung zwischen Fläche und Bevölkerung im Median unter 0,2 Prozent;
hier sind es je nach Bild 3,8 bis 17,2 Prozent. Der Grund steht in
[METHODIK.md](METHODIK.md) und ist nicht Nachlässigkeit, sondern der Stoff:
die Dichte der US-Countys spannt fünf Zehnerpotenzen statt dreieinhalb.

## Wie es gebaut ist

Alles in einer Datei: Zahlen, Geometrie, Skript, Stil. Die Seite lädt nichts
nach. Gebaut wird aus `build/`, die Rohdaten liegen von Hand daneben — siehe
[build/DATEN.md](build/DATEN.md).

Die Quellen und was ihre Prüfung ergeben hat, stehen in
[QUELLEN.md](QUELLEN.md). Kurz: zwei unabhängig zusammengetragene Reihen
derselben Zählungen gehen in 30 451 Vergleichen **zehnmal** auseinander, und
beide Bilanzen — 1900 und 2020 — schliessen auf null.
