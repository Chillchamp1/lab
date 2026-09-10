# Brandenburg, gezeichnet von seinen Menschen

→ **https://chillchamp1.github.io/lab/bevoelkerung-kreise/**

Die Bevölkerungsentwicklung auf einer regionalen Ebene, die sich nicht ändert:
den heutigen Kreisen und kreisfreien Städten. Jeder Kreis wird so gross
gezeichnet, wie er Menschen hat, und die Karte läuft durch die Zeit — von der
Volkszählung 1875 bis zum 31. Dezember 2025.

Das Besondere gegenüber den anderen Kartogrammen hier: **die Karte wächst
mit**. Ein Kartogramm für sich verteilt nur um, seine Gesamtfläche bleibt
gleich, ob 1875 oder heute. Hier gilt für alle Zeitpunkte dieselbe Fläche je
Mensch, also ist 1875 wirklich kleiner als 2025 — flächenproportional, halb so
viele Menschen, halb so viel Karte. Die Seite ist auf Englisch und fürs
Hochformat gebaut.

Die Farbe lässt sich umschalten: Einwohner, Dichte je Quadratkilometer
wirklicher Fläche, oder Index mit dem ersten Bild als 100.

## Pilotgebiet, und der Knopf über der Karte

Die Daten decken 19 Kreise ab: Berlin und die 18 brandenburgischen. Das ist das
Pilotgebiet eines grösseren Vorhabens — dieselbe Karte für alle 400 deutschen
Kreise, mit allen Volkszählungen seit dem 19. Jahrhundert. Was davon steht und
was fehlt, sagt [STAND.md](STAND.md); was geprüft wurde und was erreichbar war,
[QUELLEN.md](QUELLEN.md).

Zu sehen sind zunächst nur die 18 brandenburgischen. Der Grund steckt in der
Sache: Berlin hat Zahlen erst ab 1995 und dann mehr Einwohner als ganz
Brandenburg — 59 Prozent der Fläche des Bildes. Weil die Stadt mitten in
Brandenburg liegt und auf dem Boden winzig ist, presst sie im Kartogramm alles
andere zu einem Ring zusammen. Das ist kein Fehler, sondern was ein
flächentreues Kartogramm tut, wenn ein eingeschlossenes Gebiet die Mehrheit der
Menschen hält. Der Knopf über der Karte schaltet Berlin dazu, und man sieht es
sofort.

Gerade deshalb ist das Pilotgebiet ein harter Fall — und die Karte für ganz
Deutschland wird nicht so aussehen: unter 400 Kreisen ist Berlin vier Prozent
des Landes, nicht 59 Prozent der Region.

Warum Berlin erst 1995 anfängt: Gross-Berlin entstand 1920 aus Dutzenden
Umlandorten, und keine erreichbare Quelle weist sie für die Zeit davor
gesondert aus. Die Zahlen für das alte Berlin von 66,9 km² sind keine Zahlen
für das heutige von 891 km². Zwischen zwei Zählungen sind Form und Zahl
interpoliert; die Karte schreibt das dazu.

## Gebietsstand

Der heutige Kreis ist die Einheit, der fünfstellige AGS der Schlüssel. Alle
Zeitpunkte sind auf denselben Gebietsstand gerechnet — nicht von dieser Karte,
sondern vom Landesamt selbst: das Historische Gemeindeverzeichnis Brandenburgs
setzt jede Gemeinde so an, „als ob diese veränderte Struktur bereits am
01.12.1875 bestand".

Die Zahlen werden nicht stillschweigend gemischt. Bis 1933 zählte man die
ortsanwesende Bevölkerung samt Militär, ab 1939 die Wohnbevölkerung, ab 1995
ist es Fortschreibung; jede Zeile führt ihren Begriff und ihren wirklichen
Stichtag mit. Ausführlich in [METHODIK.md](METHODIK.md).

## Verfahren

Diffusionskartogramm nach Gastner und Newman (2004), wie bei den
[Wahlkreisen](../wahlkreise-2025/): die Dichte wird als Wärme aufgefasst und
fliesst auseinander, bis sie überall gleich ist, und die Grenzen schwimmen mit.
Für jeden Zeitpunkt ein eigenes Kartogramm, jedes vom vorigen aus gestartet —
so ist der Übergang eine Bewegung und kein Sprung. Zwei Reihen über derselben
Geometrie, mit und ohne Berlin, im selben Massstab.

Verbleibende Flächenabweichung im Median unter einem Promille, keine gefalteten
Ringe. Die Gegenprobe der Zahlen läuft beim Bauen mit: die Summe der 18
brandenburgischen Kreise gegen die veröffentlichte Landeszeile, über alle 29
Stichtage der Quelle **0,0000 %** Abweichung.

## Daten

- **Bevölkerung 1875–1981** — Amt für Statistik Berlin-Brandenburg,
  Historisches Gemeindeverzeichnis des Landes Brandenburg 1875 bis 2005,
  Tabelle 1, Gebietsstand 31.12.2005
- **Bevölkerung 1995–2025** — dasselbe Amt, Bevölkerungsstand lange Reihe,
  Gebietsstand 31.12.2025
- **Geometrie** — BKG, Verwaltungsgebiete 1:2 500 000, Gebietsstand
  1. Januar 2026, © GeoBasis-DE / BKG, Datenlizenz Deutschland –
  Namensnennung 2.0
- **Flächen und Namen** — Gemeindeverzeichnis des Statistischen Bundesamts,
  Stand 31.12.2024

Die aufbereitete Tabelle liegt als
[`data/bevoelkerung_kreise_long.csv`](data/bevoelkerung_kreise_long.csv)
daneben, eine Zeile je Kreis und Zeitpunkt, mit Stichtag, Begriff, Methode und
Quelle.

## Neu bauen

Zwei Schritte; der erste braucht Python und zwei Pakete, der zweite nur Node.
Welche Rohdaten daneben liegen müssen, steht in [build/DATEN.md](build/DATEN.md).

```
cd build
pip install pypdf openpyxl
python3 quellen.py
node build.mjs > ../index.html
```
