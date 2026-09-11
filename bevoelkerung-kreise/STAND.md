# Stand

Stand: 10. September 2026.

## Fertig

**Deutschlandweit, nicht mehr nur der Pilot.** Alle 400 heutigen Kreise, zehn
Zeitpunkte von 1871 bis 2024, von 29,3 auf 83,6 Millionen Menschen — jeder
Zeitpunkt auf denselben Gebietsstand gerechnet, jede Zelle Methode A.

### Gebietsstand und Geometrie

- BKG VG2500, Ebene KRS, Gebietsstand **1. Januar 2026**, aus UTM 32N auf
  Länge und Breite und weiter auf eine flächentreue Projektion gerechnet.
  401 Kreise gelesen, Hanau in den Main-Kinzig-Kreis aufgelöst → **400**, der
  Kreisstand des Gemeindeverzeichnisses vom 31.12.2024. Eisenach wird auf der
  Datenseite zum Wartburgkreis addiert.
- Flächensumme nach Generalisierung 357 102 km² gegen amtlich 357 677 km²,
  also 0,16 % Abweichung durch den Massstab 1:2 500 000.
- Knotenmodell mit verschweissten Grenzen; Auflösen alter Gebietsstände über
  Kantenauslöschung mit Winkelverfolgung; Generalisierung knotenweise nach
  Visvalingam, am eigenen Kreis gemessen, damit die kleinen Städte ihre Form
  behalten.

### Daten

- `data/bevoelkerung_kreise_long.csv`: **4 000 Zeilen, 400 Kreise, 10
  Zeitpunkte**, alle nach **Methode A**, `anteil_interpoliert` durchweg 0.
- Rückgrat ist **GPOP**, die German Local Population Database von Felix Roesel
  (TU Braunschweig, CC BY 4.0): alle Gemeinden, Kreise und Länder auf
  einheitlichem Gebietsstand 31.12.2019, aus über 50 Quellen. Der jüngste
  Zeitpunkt kommt aus dem Gemeindeverzeichnis.
- **Drei Gegenproben bestanden**, sie laufen bei jedem Bauen mit:
  Kreissummen gegen Ländersummen **0,0000 %**; GPOP gegen das Historische
  Gemeindeverzeichnis Brandenburgs an fünf gemeinsamen Stichtagen im Mittel
  **0,07 bis 0,12 %** (grösste Einzelabweichung 1,24 %, Barnim 1910);
  Fortschreibung 2019 gegen GV-ISys 2024 ohne Auffälligkeiten.
  Die zweite ist die wichtigste: zwei voneinander unabhängige Umrechnungen auf
  heutigen Gebietsstand kommen auf ein Zehntelprozent zusammen.
- Bevölkerungsbegriff je Zeile geführt, Bruch bei der Zählung vom 17.5.1939.
  Stichtage nicht angeglichen: vier Bilder tragen zwei Daten nebeneinander,
  West und Ost, und sitzen auf der Zeitachse an ihrem
  Bevölkerungsschwerpunkt.
- Gross-Berlin 1920 und die an der Oder-Neisse geteilten Städte sind von der
  Quelle behandelt; die vier geteilten Städte sind die einzigen geschätzten
  Werte und tragen den Vermerk.

### Karte

- Ein Diffusionskartogramm je Zeitpunkt, warm vom vorigen gestartet;
  gemeinsamer Massstab, sodass die Karte flächenproportional mit der
  Bevölkerung wächst.
- `index.html`: eine einzelne Datei, Englisch, Hochformat, Zeitschieberegler
  mit Marken auf den Zählungen, **drei Ansichten** an derselben Uhr —
  Einwohner, Richtung (Veränderung je Jahr über den gerade durchlaufenen
  Abschnitt, rot gegen blau) und das Nadelrelief; Antippen zeigt Zahlen, Rate,
  Stichtag und Methode.
- Im Rahmen über der Karte stehen Jahr, Einwohnerzahl und ein Untertitel:
  dreizehn Notizen zu je einem Zeitabschnitt, warum sich die Karte gerade so
  bewegt. Zusammenhang, keine Daten — Kreiszahlen darin stammen aus der eigenen
  Tabelle, der Rest ist Schulwissen; vollständig noch einmal als Liste unter
  der Karte.
- Die Uhr läuft rund fünfzig Sekunden für 153 Jahre, linear in Jahren.
  Zwischen den Zählungen wird mit einer monotonen kubischen Kurve gerechnet,
  nicht geradlinig: kein Knick an den Zählungen, kein Überschiessen darüber
  hinaus. Grösster Geschwindigkeitssprung von 125 auf 22 Prozent.
- Die achtzehn grössten Städte tragen ihren Namen; die Schrift wächst mit der
  gezeichneten Fläche, 1871 ist nur Berlin gross genug dafür.
- Das Relief nimmt den Hintergrund der Seite an, hell wie dunkel, mit je einer
  eigenen Farbleiter.
- Der Bauvorgang kann auch mit Reihen umgehen, die nur einen Teil des Landes
  abdecken — beim Pilotgebiet Berlin und Brandenburg war das nötig. Siehe
  METHODIK.md, Abschnitt 4.
- Das **Nadelrelief** ist die dritte Ansicht derselben Seite, kein eigenes
  Blatt mehr. Die Karte behält ihre Form, die Menschen stellen sich auf — je
  31 km² eine Nadel, 11 665 belegte Zellen auf einem versetzten Gitter, aus den
  11 007 Gemeinden von GPOP auf ein flächentreues Raster gelegt. Blick fünfzig
  Grad über der Ebene, gefüllte Bodenplatte mit Landesgrenzen. Neun Bilder; das
  Bild 2024 fehlt, weil es nur auf Kreisebene vorliegt, und das Feld steht nach
  2019 still, während die Uhr weiterläuft. Gegenprobe beim Bauen:
  Gemeindesummen gegen Kreissummen, 0,0000 Prozent.

## Offen

Von den Zeitpunkten der Aufgabenstellung fehlen noch:

| Fehlt | Warum | Weg dorthin |
|---|---|---|
| 1880, 1890 | GPOP führt sie nicht | Preussen aus iPEHD (Kreisebene, CSV); ausserhalb Preussens nur Bildvorlagen |
| 1925, 1933 | dito | *Statistik des Deutschen Reichs*, Bildvorlagen; Saarland fehlt in beiden Zählungen und braucht Ersatz |
| BRD 1970, DDR 1971 und 1981 | dito | Landesämter und *Statistisches Jahrbuch der DDR*; die Kreisreformen 1968–1978 machen daraus Methode B oder C |
| DDR 1950 | GPOP führt 1950 nur für RP, BW und BY | Landesämter der neuen Länder |
| 1995, 2000, 2022 | GPOP endet 2019, GV-ISys beginnt hier 2024 | Regionaldatenbank und GV100AD-Archiv, beide maschinenlesbar |
| Preussen 1816, 1849, 1864 | Zusatz, nicht flächendeckend | iPEHD **und** historische Kreisgrenzen |

### Was wirklich blockiert

Genau eines: **Methode C ist nicht durchführbar**, solange `www.mpidr.de`
gesperrt ist. Ohne historische Kreisgrenzen lässt sich keine
Flächeninterpolation rechnen, und damit fallen die preussischen
Zusatzzeitpunkte 1816, 1849 und 1864 aus — iPEHD allein liefert Zahlen zu
Kreisen, die es heute nicht mehr gibt, und die einem heutigen Kreis
gleichzusetzen wäre genau das, was nicht passieren soll.

Ebenfalls gesperrt, aber ohne Folgen für den jetzigen Stand:
`www-genesis.destatis.de` und `www.verwaltungsgeschichte.de`.

## Aufwandsschätzung für die fehlenden Zeitpunkte

Stunden, grob. Getrennt danach, ob es die Quelle maschinenlesbar gibt oder nur
als Bildvorlage.

### Maschinenlesbar vorhanden

| Vorhaben | Bringt | Stunden |
|---|---|---|
| Regionaldatenbank und GV100AD-Archiv mit BBSR-Umsteigeschlüssel | 1995, 2000, 2022 flächendeckend | 8–12 |
| iPEHD einlesen (Preussen, Kreisebene, CSV) | Grundlage für 1880, 1890 im preussischen Teil | 4–6 |
| GPOP-Gemeindedatei (11 007 Gemeinden) als eigene Zuordnungsbasis nutzen | erlaubt Methode B für weitere Jahre ohne fremde Schlüssel | 4–6 |
| **Summe** | | **16–24** |

### Nur als Bildvorlage

Hier wird nichts abgeschrieben, bevor du es freigibst.

| Vorhaben | Stunden |
|---|---|
| 1880 und 1890 ausserhalb Preussens | 15–25 |
| 1925 und 1933, einschliesslich Ersatzzählungen fürs Saargebiet | 25–40 |
| BRD 1970 auf Kreisebene, über die Kreisreformen hinweg | 15–25 |
| DDR 1950, 1971 und 1981 auf Kreisebene | 15–25 |

### Nicht abschätzbar

Methode C — Flächeninterpolation über historische Kreisgrenzen — hängt an den
Grenzen des MPIDR. Solange der Host gesperrt ist, ist der Aufwand nicht zu
beziffern, weil das Verfahren nicht durchführbar ist.

## Was als Nächstes am meisten brächte

1. **1995, 2000 und 2022** aus der Regionaldatenbank — maschinenlesbar, füllt
   die Lücke zwischen 1996 und 2024 und bringt den Zensus 2022 als eigenen
   Zeitpunkt statt nur als Basis der Fortschreibung. Ein Tag Arbeit.
2. **iPEHD** einlesen — auch ohne historische Grenzen lohnt es sich, die Daten
   dazuhaben; sie sind die Voraussetzung für alles Preussische.
3. `www.mpidr.de` freischalten. Danach wird aus Punkt 2 die
   Flächeninterpolation, und 1816, 1849 und 1864 werden möglich.
