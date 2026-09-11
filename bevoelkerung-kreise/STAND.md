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

### Offen: Schlesien

Gewünscht ist eine vierte Ansicht — Deutschland **mit Schlesien**, bis es
verloren geht, mit dem Einbruch durch Flucht und Vertreibung und dem
anschliessenden Verschwinden. Der Bauvorgang kann das (er kennt mehrere Reihen
über derselben Zeitachse, siehe METHODIK 4); es fehlen die Daten:

- **Geometrie** historischer Kreise östlich der Oder-Neisse. Die Sammlung des
  MPIDR wäre die Quelle; `www.mpidr.de` antwortet aus dieser Umgebung nicht.
  Heutige polnische Woiwodschaften als Ersatz zu nehmen wäre genau das
  Gleichsetzen verschiedener Gebietsstände, das dieses Projekt nicht macht.
- **Bevölkerung** schlesischer Kreise. iPEHD (ifo) hätte 1871, 1890 und 1900
  auf Kreisebene, liegt aber hinter einer Bot-Sperre („Client Challenge"), die
  ich nicht umgehe. 1910, 1925, 1933 und 1939 stehen nur in der *Statistik des
  Deutschen Reichs*, also in Bildvorlagen — dafür gilt der Stopp.
- **Nach 1945** polnische Zählungen für dasselbe Gebiet (GUS).

Was hülfe: iPEHD und die MPIDR-Grenzen heruntergeladen und hier abgelegt, wie
seinerzeit GPOP. Dann sind 1871, 1890 und 1900 machbar; für 1939 und den
Einbruch danach braucht es entweder eine maschinenlesbare Quelle oder die
Freigabe, aus Bildvorlagen abzuschreiben.

### Karte

- Ein Diffusionskartogramm je Zeitpunkt, warm vom vorigen gestartet;
  gemeinsamer Massstab, sodass die Karte flächenproportional mit der
  Bevölkerung wächst.
- `index.html`: eine einzelne Datei, Englisch, Hochformat, Zeitschieberegler
  mit Marken auf den Zählungen, **drei Ansichten** an derselben Uhr — Growth
  (Veränderung je Jahr über den gerade durchlaufenen Abschnitt, rot gegen blau;
  steht vorn), Einwohner und das Nadelrelief; Antippen zeigt Zahlen, Rate,
  Stichtag und Methode.
- Im Rahmen über der Karte stehen Jahr und Einwohnerzahl, oben links **in** der
  Karte ein Faden aus den Überschriften: dreizehn Notizen zu je einem
  Zeitabschnitt, warum sich die Karte gerade so bewegt. Die neueste obenauf,
  jede weitere schiebt die vorigen eine Zeile nach unten und blasser; sechs
  bleiben stehen, auf dem Telefon vier. Zusammenhang, keine Daten — Kreiszahlen
  darin stammen aus der eigenen Tabelle, der Rest ist Schulwissen; vollständig
  mit allen Sätzen als Liste unter der Karte.
- Die Uhr läuft 70 Sekunden für 153 Jahre. Die Spielzeit je Abschnitt mischt
  Dauer und Umschichtung (geometrisches Mittel) und liegt nie unter
  viereinhalb Sekunden, also bekommt 1939→1946 fünf Sekunden statt drei und
  2019→2024 viereinhalb statt eineinhalb. Zwischen den Zählungen wird mit einer monotonen
  kubischen Kurve gerechnet, nicht geradlinig: kein Knick, kein Überschiessen.
  Grösster Geschwindigkeitssprung von 125 auf 19 Prozent.
- **Drei Kartogramm-Typen zum Umschalten**, an einem Regler zwischen Landkarte
  und Kartogramm: Real map (a = 0), Half and half (a = 0,5), Cartogram (a = 1).
  Jeder Knoten liegt bei `Landkarte + a · (Kartogramm − Landkarte)`; die
  Landkarte steht ohnehin als Anfang der Differenzkette in der Nutzlast, also
  kostet das kein Byte und keine zweite Zeitreihe. Berlin: 4,41 % der Fläche
  bei a = 1, 1,75 % bei a = 0,5, 0,25 % bei a = 0.
- **Volumen bleibt Bevölkerung, in jeder Stellung.** Was der Fläche fehlt, holt
  die Höhe: Höhe = Bevölkerung / *gezeichnete* Fläche, an den Umrissen gemessen
  statt aus einer Formel. Berlin steht dadurch 1,0 / 2,5 / 17,8 mal so hoch wie
  der Durchschnitt — 1,75 × 2,5 = 4,4 = 0,25 × 17,8. Gezeichnet gestaucht
  (`0,34 + 0,66 · (h/hmax)^0,45`), weil die Spanne auf der Landkarte 134 : 1
  beträgt; die Zahl steht beim Antippen.
- Nachgezählt, dass die Zwischenformen nichts umstülpen: **0 gefaltete Ringe von
  4650** bei a = 0,25, 0,5 und 0,75 über alle zehn Bilder.
- Das **Relief** ist ein Höhenfeld, und die Form tragen **beleuchtete
  Höhenlinien nach Tanaka (1950)**: weiss, wo der Hang der Sonne zugewandt ist,
  schwarz, wo er wegfällt, dick, wo er voll im Licht oder Schatten steht. Grund:
  die Fläche ist schon mit Daten belegt — eine Schattierung, die stark genug für
  ein Gebirge wäre, macht aus Rot und Blau Grau; Linien nehmen fast keine Fläche
  weg. 5,9 bis 6,0 Bilder je Sekunde im Prüfbrowser gegen 4,1 vor dem Umbau. Dazu Lambert-Schattierung als Grau im Modus `overlay` (dunkel:
  `soft-light`), Muldenverschattung und Schlagschatten aus einer **flacheren
  Sonne** (16 statt 40 Grad — ein Strahl, der steiler abfällt als der Hang, trifft
  nie auf Schatten).
- Das Höhenfeld wird **in zwei Kanälen** gelesen: unmultipliziertes Rot ist die
  normalisierte Faltung, also der Höhenmittelwert ohne Randabfall, Alpha ist der
  Rand der Karte. Sonst wäre der grösste Berg im Feld Deutschland selbst.
- Die Höhenlinien werden **verfolgt statt gemalt**: Marching Squares über das
  weite Feld, gezeichnet als Pfade auf der Leinwand selbst — in voller
  Auflösung und mit deren Kantenglättung. Vorher lagen sie im Höhenfeld und
  wurden mit ihm hochgerechnet; das liess sich durch mehr Auflösung nicht
  beheben, weil eine Linie von ein bis zwei Rasterpunkten gestreckt immer ein
  Schmier bleibt.
- Und sie werden **verkettet**: je Gitterkante der Schnittpunkt und die ein bis
  zwei benachbarten Kanten, dann durchlaufen — offene Ketten zuerst, dann die
  Ringe. Auf der Kette wird die Beleuchtung längs geglättet und die Linie in
  Läufe gleicher Stärke zerlegt, gezeichnet als weiche Kurve durch die
  Mittelpunkte. Strecke für Strecke gezeichnet sah es gepunktet aus, nicht wie
  eine Höhenlinie. Vierzig Niveaus, flächendeckend, 24 Züge für die ganze Karte.
- Das Höhenfeld selbst darf grob bleiben (55 % der Bildpunkte): es trägt nur
  noch den Verlauf. Die Höhen der Kreise stehen in 200 Stufen statt 24 — bei 64
  sprang im Lauf der Zeit ein Kreis von einer Stufe zur nächsten, und die Linien
  in seiner Umgebung zuckten mit.
- Die **Städtenamen** haben eine Obergrenze an der Kartenbreite (`breite/38`)
  statt fester dreissig Pixel: Berlin und Hamburg standen sonst als Überschrift
  über der Karte statt als Beschriftung darin.
- Das **Gitternetz** (30 × 30 km, eine Fassung lang) ist wieder draussen: neben
  Relief und Formregler brachte es zu wenig für den Platz. 713 Knoten aus dem
  Modell heraus.
- Über dem Kartenrahmen steht kein Text mehr; Jahr und Einwohnerzahl stehen im
  Rahmen, die Legende unten darin. Der Rahmen
  passt als Ganzes ins Querformat (406 von 430 Pixeln Fensterhöhe), die Karte
  bekommt sonst so viel Platz wie möglich — das Seitenverhältnis der Leinwand
  folgt dem der Karte.
- Alle Notizen stehen vollständig als Liste unter der Karte: erreichtes
  normal, laufendes angestrichen, kommendes blass.
- **Farbskalen: je Farbe zwei Leitern, keine umgedrehte.** Vorher wurde die
  helle Leiter auf dunklem Grund umgedreht — dann ist der Höchstwert fast weiss
  und der leerste Kreis tiefblau, was sich gegen jede Erwartung liest. Jetzt
  läuft beides in dieselbe Richtung: mehr ist satter. Die dunkle Leiter steigt
  in OKLab von L 0,37 / C 0,02 (fast graues Blaugrau) auf L 0,64 / C 0,21
  (kräftiges Azur), der rote Arm spiegelt sie bei gleicher Helligkeit.
- Die Richtungsfarbe blendet nur noch nach hinten über. Vorher zeigte sie den
  Einbruch von 1939 schon 1934 — ein Sechstel eines neunundzwanzigjährigen
  Abschnitts sind fünf Jahre.
- Dreizehn Städte tragen ihren Namen, von Anfang an: die grössten, um
  sechzig Kilometer voneinander ausgedünnt. Die Schrift wächst mit der
  gezeichneten Fläche, fällt aber nie unter sieben Pixel; wo zwei Namen
  einander berühren, weichen sie aus.
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
