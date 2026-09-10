# Stand

Stand: 10. September 2026.

## Fertig

**Der ganze Weg steht, einmal durchgezogen.** Von der BKG-Geometrie über die
Datentabelle und ein Kartogramm je Zeitpunkt bis zur fertigen Seite läuft es
mit zwei Befehlen durch. Was jetzt noch fehlt, sind Zahlen für weitere Länder
— keine Technik.

### Gebietsstand und Geometrie

- BKG VG2500, Ebene KRS, Gebietsstand **1. Januar 2026**, aus UTM 32N auf
  Länge und Breite und weiter auf eine flächentreue Projektion gerechnet.
  401 Kreise gelesen, Hanau in den Main-Kinzig-Kreis aufgelöst → **400**, der
  Kreisstand des Gemeindeverzeichnisses vom 31.12.2024.
- Flächensumme nach Generalisierung 357 102 km² gegen amtlich 357 677 km²,
  also 0,16 % Abweichung durch den Massstab 1:2 500 000.
- Knotenmodell mit verschweissten Grenzen; Auflösen alter Gebietsstände über
  Kantenauslöschung mit Winkelverfolgung, an Eisenach + Wartburgkreis geprüft
  (104,3 + 1 263,8 = 1 368,0 km² vorher wie nachher).
- Generalisierung knotenweise nach Visvalingam, am eigenen Kreis gemessen,
  damit die kleinen Städte ihre Form behalten.

### Daten (Pilot Berlin + Brandenburg)

- `data/bevoelkerung_kreise_long.csv`: **293 Zeilen, 19 Kreise, 16 Zeitpunkte**
  von 1875 bis 2025, alle nach **Methode A**, `anteil_interpoliert` durchweg 0.
- **Plausibilitätsprüfung bestanden.** Die Summe der 18 brandenburgischen
  Kreise gegen die veröffentlichte Landeszeile, über alle 29 Stichtage der
  Quelle: grösste Abweichung **0,0000 %**. Die geforderte Schwelle von 1 % ist
  nicht annähernd berührt. Die Prüfung läuft bei jedem Lauf von `quellen.py`
  mit.
- Bevölkerungsbegriff je Zeile geführt, Bruch bei der Zählung vom 17.5.1939.
  Stichtage nicht angeglichen.

### Karte

- Ein Diffusionskartogramm je Zeitpunkt, warm vom vorigen gestartet;
  gemeinsamer Massstab, sodass die Karte flächenproportional mit der
  Bevölkerung wächst.
- Flächenabweichung im Median **unter einem Promille**, Maximum um ein
  Promille, **keine gefalteten Ringe**.
- `index.html`: eine einzelne Datei, Englisch, Hochformat, Zeitschieberegler
  mit Marken auf den Zählungen, umschaltbar zwischen Einwohnern, Dichte und
  Index; Antippen zeigt Zahlen, Stichtag und Methode.
- Zwei Reihen über derselben Geometrie, umschaltbar: ohne und mit Berlin. Die
  Stadt hält 59 % der Menschen des Pilotgebiets und liegt mitten darin — im
  Kartogramm presst sie Brandenburg zu einem Ring zusammen. Das ist der
  richtige Umgang eines flächentreuen Kartogramms mit dieser Lage, aber als
  einzige Ansicht wäre es unlesbar; als Knopf ist es die Aussage selbst. In der
  Karte für ganz Deutschland stellt sich die Frage nicht: dort ist Berlin vier
  Prozent des Landes.

## Offen

### Die eine grosse Lücke: GPOP

Die **German Local Population Database** (Felix Roesel, TU Braunschweig,
CC-BY 4.0) hätte 1871, 1910, 1939, 1946, 1961, 1987, 1996, 2011 und 2019 für
**alle** deutschen Gemeinden und Kreise auf einheitlichem Gebietsstand
geliefert — neun Zeitpunkte flächendeckend nach Methode A, in einem Zug.

Sie liegt hinter einer Rechenaufgabe gegen Maschinen. Die Metadaten-Schnittstelle
antwortet (Objekt `dbbs_mods_00071017`, Ableitung `dbbs_derivate_00049631`),
der Dateiabruf nicht; einen Browser zu starten oder die Prüfaufgabe zu lösen
ist dieser Umgebung untersagt, und daran wurde nicht vorbeigearbeitet.

**Was hilft:** die Dateien einmal von Hand herunterladen —
<https://leopard.tu-braunschweig.de/receive/dbbs_mods_00071017> — und nach
`bevoelkerung-kreise/build/` legen. Das ist ein Klick und spart nach der
Schätzung unten rund achtzig Stunden.

### Berlin vor 1920

Berlin steht erst ab 1995 in den Daten. Für die Zeit vor der Bildung
Gross-Berlins 1920 müssten die Zahlen aus den eingemeindeten Orten
zusammengesetzt werden; keine erreichbare Quelle weist sie aus. Die Zahlen des
alten Berlin von 66,9 km² sind keine Zahlen für das heutige von 891 km² und
werden deshalb nicht eingesetzt.

### Weitere Zeitpunkte im Pilotgebiet

Das brandenburgische Verzeichnis führt 1875 statt 1871 und 1880 und lässt 1900
aus. Diese drei Zeitpunkte bräuchten iPEHD (Preussen, historische Kreise,
Methode C) — und dafür historische Kreisgrenzen, die beim MPIDR liegen. Der
Host ist weiterhin gesperrt.

### Nicht erreichbar

`www-genesis.destatis.de`, `www.mpidr.de`, `www.verwaltungsgeschichte.de`.
`search.gesis.org` antwortet mit 403.

## Aufwandsschätzung für die übrigen Länder

Stunden, grob, für die Zeitpunkte der Aufgabenstellung. Getrennt danach, ob es
die Quelle maschinenlesbar gibt oder nur als Bildvorlage.

### Maschinenlesbar vorhanden

| Vorhaben | Deckt ab | Stunden |
|---|---|---|
| **GPOP einlesen und prüfen** (sobald die Dateien da sind) | 9 Zeitpunkte, alle 400 Kreise | **2–3** |
| GV100AD 1993–2025 mit BBSR-Umsteigeschlüssel, Methode B | 1995, 2000, 2011, 2022, 2025, alle Länder | 8–12 |
| Regionaldatenbank als Gegenprobe dazu | dieselben | 3–4 |
| Historische Gemeindeverzeichnisse der Landesämter, je Land: Format prüfen, Parser anpassen, Landessumme gegenprüfen | je Land die dort geführten Zählungen | 3–6 je Land |
| — davon voraussichtlich als Text-PDF vorhanden: Bayern, Sachsen, Sachsen-Anhalt, Thüringen, Mecklenburg-Vorpommern, Niedersachsen | | 20–35 zusammen |
| — Existenz und Format erst zu prüfen: Nordrhein-Westfalen, Hessen, Baden-Württemberg, Rheinland-Pfalz, Schleswig-Holstein | | 5–8 nur fürs Prüfen |
| Stadtstaaten Hamburg und Bremen sowie das Saarland, je eigene Reihe | alle Zeitpunkte | 2–4 je Land |
| iPEHD einlesen (Preussen, Kreisebene, CSV) | 1816–1901, preussischer Teil | 4–6 |
| **Summe, wenn GPOP vorliegt** | | **etwa 45–70** |
| **Summe ohne GPOP** | | **etwa 90–140** |

### Nur als Bildvorlage

Hier wird nichts abgeschrieben, bevor du es freigibst.

| Vorhaben | Stunden |
|---|---|
| 1880, 1900, 1925, 1933 ausserhalb Preussens, aus der *Statistik des Deutschen Reichs* | 25–40 |
| Ersatzzählungen des Saargebiets für 1925, 1933 und 1950 | 4–8 |
| Ortsteilzahlen für die geteilten Städte Görlitz, Guben, Frankfurt (Oder) | 3–6 |
| Gross-Berlin: die 1920 eingemeindeten Orte für 1871–1910 | 6–10 |

### Was nicht in Stunden zu messen ist

Methode C — Flächeninterpolation über historische Kreisgrenzen — hängt an den
Grenzen des MPIDR. Solange der Host gesperrt ist, ist der Aufwand nicht
abschätzbar, weil das Verfahren nicht durchführbar ist. Betroffen sind die
preussischen Zusatzzeitpunkte 1816, 1849, 1864 und überall dort, wo nur
Kreisdaten und keine Gemeindedaten existieren.

## Nächster Schritt

Nach der Aufgabenstellung ist hier der vereinbarte Halt: Pilot fertig,
Plausibilitätsprüfung bestanden, keine Abschrift von Bildvorlagen ohne
Freigabe. Das Sinnvollste zuerst wäre, GPOP von Hand zu holen — danach ist die
Karte in wenigen Stunden für ganz Deutschland gefüllt, statt in Wochen.
