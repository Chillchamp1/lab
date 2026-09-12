# Stand

Stand: 11. September 2026.

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
  gemeinsamer Massstab, und zwar **für alle Bilder derselbe**. Die Aussengrenze
  bleibt damit über hundertfünfzig Jahre ungefähr, wo sie ist; was sich bewegt,
  bewegt sich, weil sich die Kreise gegeneinander verschieben. Bis dahin wuchs
  die Karte flächenproportional mit der Bevölkerung — das Wachstum ist in die
  Farbe umgezogen (siehe unten), weil es zweimal gezeigt nur die Aufmerksamkeit
  für alles andere kostete.
- `index.html`: eine einzelne Datei, Englisch, **eine einzige Ansicht** — die
  Geländekarte auf schwarzem Grund. Zeitschieberegler mit Marken auf den
  Zählungen, drei Formknöpfe, sonst nichts; Antippen zeigt Zahlen, Rate,
  Stichtag und Methode. Die früheren Ansichten (Wachstum, Einwohner, Nadelrelief)
  und die Notizenliste unter der Karte sind entfallen, ebenso der Umschalter
  zwischen hellem und dunklem Grund: 818 kB → 612 kB.
- Über der Karte stehen Jahr und Einwohnerzahl und die **laufende Notiz
  ausgeschrieben**, mit Überschrift und Sätzen: dreizehn Notizen zu je einem
  Zeitabschnitt, warum sich die Karte gerade so bewegt. Darunter der Faden der
  vorigen Überschriften, jede neue schiebt die vorigen eine Zeile nach unten und
  blasser; sechs bleiben stehen, auf dem Telefon drei, auf einem kurzen Schirm
  keine. Zusammenhang, keine Daten — Kreiszahlen darin stammen aus der eigenen
  Tabelle, der Rest ist Schulwissen.
- **Der Text liegt über der Bühne, nicht in ihr.** Er nimmt der Karte keinen
  Platz mehr weg, und die Karte springt nicht mehr, wenn eine Notiz länger ist
  als die vorige. Drei Ebenen: Jahr und Einwohnerzahl über der Karte, mit Schein
  dahinter; die Karte; darunter Notiz und Faden — wo Platz ist, stehen sie da,
  wo die Karte hinreicht, verschwinden sie dahinter. Im Hochformat steht die
  Karte dabei unten statt mittig: bei festem Seitenverhältnis begrenzt die
  Breite sie, und der übrige Platz gehört ganz dem Text statt zur Hälfte einem
  Loch über der Legende. Die Zweispaltigkeit im
  Querformat ist damit hinfällig und wieder draussen.
- Die **Legende** ist eine Zeile: die Zahlen an den Enden der Leiter, ein Wort
  zur Form, der Stichtag. Umbruch unterbunden, sonst schöbe auch sie die Karte.
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
  die Fläche ist schon mit der Höhenfarbe belegt — eine Schattierung, die stark
  genug für ein Gebirge wäre, wüsche sie aus; Linien nehmen fast keine Fläche
  weg. Dazu Lambert-Schattierung als Grau im Modus `soft-light` (auf schwarzem
  Grund rechnet `overlay` um das mittlere Grau herum und lässt dunkle Farben fast
  unberührt), Muldenverschattung und Schlagschatten aus einer **flacheren Sonne**
  (16 statt 40 Grad — ein Strahl, der steiler abfällt als der Hang, trifft nie
  auf Schatten). 4,8 bis 5,8 Bilder je Sekunde im softwaregerenderten
  Prüfbrowser; das ist der Boden, nicht das, was ein Gerät mit Grafikkarte
  zeigt.
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
- **Tiefpass erster Ordnung über die Bilder.** Das Raster des Höhenfeldes springt
  von Bild zu Bild um Bruchteile eines Punktes, und die Höhenlinien zappeln mit —
  reine Abtastung, in den Daten steht davon nichts. Das gezeigte Feld folgt dem
  gerechneten jetzt mit zwei Zeitkonstanten: 1,2 s für das weite Feld (die
  Linien, ≈ 2,6 Jahre Kartenzeit), 0,30 s für das enge Feld und den Rand (die
  Schattierung hängt an den Umrissen und darf nicht nachlaufen). Gerechnet mit
  der wirklich vergangenen Zeit, also unabhängig von der Bildrate; bei 60 Bildern
  geht ein einzelner Rastersprung zu 1,4 % ein. Wo die Zeit springt — Regler,
  Umschalten, Fenstergrösse —, wird der Filter geleert statt nachgezogen.
  Gemessen im Prüfbrowser (6 Bilder/s, wo der Filter am wenigsten kann):
  Änderung je Bild auf **48 %**.
- **Die Farbe ist die Höhe.** Die Leiter einer physischen Karte, und zwar die
  gesättigte — Tiefland in sattem Grün, dann Gelbgrün, Gelb, Ocker, Orange, Rot,
  oben die helle Kappe; durchgehend steigende Helligkeit —, und gefärbt wird die Höhe, also dieselbe Zahl,
  die das Relief trägt. Die Höhenlinien laufen damit genau auf den Farbgrenzen,
  wie in einem Atlas. Die Seite steht auf Half and half.
- **Keine Grenzen mehr**, in keiner der drei Sorten: die gezeichnete Linie um
  Kreis und Land, die Fuge im Höhenfeld (`breite/420`), die als Graben dasselbe
  zeigte, und die Naht zwischen zwei einzeln gefüllten Nachbarflächen, die die
  Kantenglättung als halb durchsichtigen Spalt stehen lässt — auf schwarzem
  Grund eine feine dunkle Linie, die niemand gezeichnet hat. Gegen die Naht hilft
  ein Strich in der eigenen Farbe der Fläche: sie dehnt sich um einen halben
  Bildpunkt, die Nachbarn überlappen sich, die Naht ist zu. Farbe, Hang und
  Höhenlinie zeigen die Grenze dort, wo sich die Dichte ändert. 3 334 Knotenpaare
  der Landesgrenzen fallen damit aus der Nutzlast.
- **Farbe, Licht und Höhenlinie aus einer Zahl.** Bis hierher war das eine
  Behauptung: gefärbt wurde Kreis für Kreis (ein Mosaik in den Umrissen der
  Verwaltung), die Höhenlinien kamen aus dem weichgezeichneten Feld, das
  darüber hinwegläuft. Berlin war deshalb ein kleiner Farbfleck, während sein
  Berg weit darüber hinausreichte und die Linien sich darin drängten. Jetzt
  steht im Höhenfeld die logarithmische Dichte auf der gemessenen Leiter, und
  daraus kommt alles: Farbe als eines von sechzehn gleich breiten Bändern,
  Schattierung aus dem Gefälle, Höhenlinien auf den Bandgrenzen. Die Silhouette
  darunter in **einer** Farbe — nicht als Farbe der Karte, sondern als scharfe
  Kante, weil der Rand des hochgerechneten Feldes weich ist.
- **Jede Höhenlinie ist eine Farbgrenze.** Ein Achtel Reserve über und unter der
  Leiter legt deren fünfzehn Grenzen im Feld auf 2/20 bis 17/20 — bei zwanzig
  Niveaus (vorher vierzig) genau auf die Niveaus 2 bis 17.
- **Der Bezug der Höhe ist absolut**: die Dichte Deutschlands 2024, für jedes
  Bild dieselbe. ×2 heisst damit in jedem Jahr dasselbe, und das Wachstum steht
  in der Farbe — 1871 liegt das Land fast einfarbig im Tiefgrün, 2024 im Orange.
  Der relative Bezug (mittlere Dichte desselben Bildes) steckt als Schalter im
  Skript, `bezugAbsolut(false)`, ohne Knopf.
- **Die hellste Stufe ist wieder eine Spitze.** Berlin ist 2024 der dichteste
  Kreis (×2,51 gegen Oberhausen ×2,39), sah aber kleiner aus als das
  Ruhrgebiet: die Leiter endete bei q0,95 = ×2,29, alles darüber lag im
  hellsten Band, und **über zehn Prozent der Kartenfläche** waren 2024 in diesem
  einen Ton. Kehrseite des absoluten Bezugs — die Leiter ist über alle zehn
  Zählungen gemessen, 2024 klemmt oben an. Jetzt q0,97, und dazu enger geglättet
  (weiter Radius `breite/28` statt `/22`, enges Feld 0,55 statt 0,40 Gewicht):
  das weite Feld bevorzugt Plateaus vor Spitzen, und das Ruhrgebiet ist ein
  Plateau, Berlin eine Spitze. Nebenbei zerfällt das Ruhrgebiet wieder in die
  Städte, aus denen es besteht. Zeitkonstante des engen Feldes dafür von 0,30 s
  auf 0,55 s; gemessen ist die Bewegung danach ruhiger als vorher (0,77 statt
  0,81 Promille Änderung je Bild).
- **Eine Leiter für alle drei Formen**, ×0,18 … ×3,62 — sonst hiesse ×1 je nach
  Knopfstellung etwas anderes. Möglich geworden, weil das Wachstum jetzt in
  jeder Form steckt, auch im Kartogramm: dessen Fläche ist fest, seine
  Bevölkerung wächst, also steigt seine Dichte von ×0,35 auf ×1,00. Das
  Kartogramm ist damit nicht mehr die tote Fläche, die es war — es liegt in
  jedem Jahr einfarbig da, aber die Farbe wandert mit den Jahren.
- **Das Relief hängt jetzt an der Binnenspanne**, also der Streuung innerhalb
  *eines* Bildes, nicht mehr an der Gesamtspanne über alle. Im Kartogramm sind
  die beiden grundverschieden: innerhalb eines Jahres keine Streuung, über die
  Jahre die volle. Mit demselben Anteil läuft auch die **Farbe** gegen das
  Bildmittel — sonst wurden aus den Konvergenzresten des Diffusionsverfahrens
  sichtbare Farbbänder (1943 ein Ost-West-Verlauf über dem Kartogramm, der wie
  ein Befund aussah und keiner war).
- **Die Leiter wird je Form aus den Daten gemessen**, einmal, über alle Kreise in
  allen Zählungen, **flächengewichtet**: q0,05 bis q0,97. Landkarte ×0,18 … ×3,62,
  Half and half ×0,28 … ×2,6, volles Kartogramm ×0,35 … ×1,00. Flächengewichtet,
  weil Fläche gefärbt wird und nicht Kreise — ungewichtet setzten die
  hundertsieben winzigen kreisfreien Städte das obere Quantil, und acht von
  sechzehn Bändern blieben leer; jetzt sind zwölf bis dreizehn belegt.
- **Die kreisfreien Städte tragen doch einen Umriss**, einen feinen dunklen über
  dem Relief. Ein Landkreis braucht keinen, er wird kaum verzerrt; eine
  kreisfreie Stadt ist auf dem Boden winzig und in der Karte gross, und ihr Berg
  reicht weit über sie hinaus. Im vollen Kartogramm sind diese Umrisse das
  Einzige, was auf der einfarbigen Fläche noch zu sehen ist.
- **Im vollen Kartogramm ist keine Höhe mehr übrig**, und das soll man sehen.
  Eine Leiter über die verbliebenen anderthalb Prozent machte aus Rundungsresten
  ein Gebirge — und das weichgezeichnete Feld tat dasselbe, weil ein gross
  gezeichneter Kreis von den Fugen weniger abbekam als ein kleiner; Berlin sah
  wieder aus wie ein Berg, obwohl es nur gross gezeichnet ist. (Die Fugen sind
  inzwischen weg, siehe oben; die Leiter bleibt.) Also zwei Bremsen
  aus derselben gemessenen Spanne: die Leiter bekommt eine Mindestbreite (Faktor
  2,6, danach um ein halbes Band verschoben, sonst kippen die Rundungsreste über
  die Bandgrenze und sprenkeln die Fläche), und das Relief wird im selben
  Verhältnis ausgeblendet. Der Weg von der
  Landkarte zum Kartogramm zeigt damit genau das, worum es geht — die Berge
  sinken in die Fläche.
- Die **Städtenamen** stehen nicht mehr auf dem Gipfel: jeder rückt um die
  Hälfte des Radius nach unten, den ein Kreis seiner Fläche hätte. „Berlin"
  und „Hamburg" deckten sonst genau den Berg zu, den sie benennen.
- Die **Städtenamen** haben eine Obergrenze an der Kartenbreite (`breite/38`)
  statt fester dreissig Pixel: Berlin und Hamburg standen sonst als Überschrift
  über der Karte statt als Beschriftung darin.
- Das **Gitternetz** (30 × 30 km, eine Fassung lang) ist wieder draussen: neben
  Relief und Formregler brachte es zu wenig für den Platz. 713 Knoten aus dem
  Modell heraus.
- Der Rahmen füllt den Schirm; Jahr, Einwohnerzahl und Notiz stehen darin oben,
  die Legende unten. Die Leinwand bekommt allen Platz, der nach dem Text und der
  Bedienung übrig bleibt.
- Dreizehn Städte tragen ihren Namen, von Anfang an: die grössten, um
  sechzig Kilometer voneinander ausgedünnt. Die Schrift wächst mit der
  gezeichneten Fläche, fällt aber nie unter sieben Pixel; wo zwei Namen
  einander berühren, weichen sie aus.
- Der Bauvorgang kann auch mit Reihen umgehen, die nur einen Teil des Landes
  abdecken — beim Pilotgebiet Berlin und Brandenburg war das nötig. Siehe
  METHODIK.md, Abschnitt 4.

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
