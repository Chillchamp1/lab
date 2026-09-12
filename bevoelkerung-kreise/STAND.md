# Stand

Stand: 12. September 2026.

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
  Geländekarte auf schwarzem Grund bei halber Verzerrung. Zeitschieberegler mit
  Marken auf den Zählungen, sonst nichts; Antippen zeigt Zahlen, Rate,
  Stichtag und Methode. Die früheren Ansichten (Wachstum, Einwohner, Nadelrelief)
  und die Notizenliste unter der Karte sind entfallen, ebenso der Umschalter
  zwischen hellem und dunklem Grund: 818 kB → **259 kB**.
- Über der Karte stehen Jahr und Einwohnerzahl — zwischen zwei Zählungen mit
  einem **Ungefähr-Zeichen** und dem Zusatz „interpolated between the counts of
  … and …", auf einer Zählung mit ihrem Stichtag. Ohne das las sich „1941 ·
  60,5 Millionen" wie ein Befund, und im Krieg wäre das ein falscher: gezählt
  sind 59,63 Mio (17.5.1939) und 66,19 Mio (1946/1950), der Weg dazwischen ist
  eine monotone Kurve. Die Zunahme ist echt — zwölf Millionen Vertriebene —,
  aber sie kam 1945 und 1946 und nicht gleichmässig ab 1940. Dazu die
  **laufende Notiz
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
- Die **Legende** ist die Leiter mit sechs Zahlen darauf (0, ×0,5, ×1, ×1,5,
  ×2, ×3) und darunter ein Satz, was die Höhe misst. Umbruch unterbunden, sonst schöbe
  er die Karte.
- Die Uhr läuft 84 Sekunden für 153 Jahre. Die Spielzeit je Abschnitt mischt
  Dauer und Umschichtung (geometrisches Mittel) und liegt nie unter
  5,4 Sekunden, also bekommt 1939→1946 acht Sekunden statt vier und
  2019→2024 5,4 statt zwei. Zwischen den Zählungen wird mit einer monotonen
  kubischen Kurve gerechnet, nicht geradlinig: kein Knick, kein Überschiessen.
  Der Knick der Höhe an einer Zählung fällt im Median über die 400 Kreise von
  74 auf 5 Prozent; der Preis dafür sind 0,75 Prozent Abweichung von der
  Geraden im Mittel, fast alles davon in der 39-Jahre-Lücke 1871–1910.
- **Eine Form, die halbe Verzerrung** (a = 0,5), auf den Mittelwert aller zehn
  Kartogramme. Jeder Knoten liegt bei `Landkarte + a · (Mittelkartogramm −
  Landkarte)`; die Landkarte steht ohnehin als Anfang der Differenzkette in der
  Nutzlast, also kostet die Zwischenform kein Byte und keine zweite Zeitreihe.
  Berlin nimmt damit 1,87 % der Fläche — gegen 4,41 % im vollen Kartogramm und
  0,25 % auf der Landkarte.
- **Volumen bleibt Bevölkerung.** Was der Fläche fehlt, holt die Höhe: Höhe =
  Bevölkerung / *gezeichnete* Fläche, an den Umrissen gemessen statt aus einer
  Formel. Berlin steht dadurch 2,5 mal so hoch wie der Durchschnitt —
  1,75 × 2,5 = 4,4 = 0,25 × 17,8, der Tausch geht exakt auf. Die Zahl steht beim
  Antippen.
- Nachgezählt, dass die Zwischenformen nichts umstülpen: **0 gefaltete Ringe von
  4650** bei a = 0,25, 0,5 und 0,75 über alle zehn Bilder — und **0 von 465** für
  die Mittelform, auf der die Seite steht.
- Das **Relief** ist ein Höhenfeld, und die Form tragen **beleuchtete
  Höhenlinien nach Tanaka (1950)**: weiss, wo der Hang der Sonne zugewandt ist,
  schwarz, wo er wegfällt, dick, wo er voll im Licht oder Schatten steht. Grund:
  die Fläche ist schon mit der Höhenfarbe belegt — eine Schattierung, die stark
  genug für ein Gebirge wäre, wüsche sie aus; Linien nehmen fast keine Fläche
  weg. Dazu Lambert-Schattierung, **in die Farbe gerechnet** statt als Mischmodus
  darübergelegt (weiches Licht kann Weiss nicht dunkler machen — auf den Gipfeln
  kam gar keine Hangschattierung an), Muldenverschattung und Schlagschatten aus
  einer **flacheren Sonne** (16 statt 40 Grad — ein Strahl, der steiler abfällt
  als der Hang, trifft nie auf Schatten). 12,9 Bilder je Sekunde im
  softwaregerenderten Prüfbrowser gegen 11,1 mit dem Mischmodus; das ist der
  Boden, nicht das, was ein Gerät mit Grafikkarte zeigt.
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
  gesättigte — tiefes Waldgrün, Grasgrün, Gelbgrün, Gelb, Ocker, Orange, Rot,
  oben Fels und Schnee —, und gefärbt wird die Höhe, also dieselbe Zahl,
  die das Relief trägt. Die Höhenlinien laufen damit genau auf den Farbgrenzen,
  wie in einem Atlas.
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
  steht im Höhenfeld die Dichte auf der gemessenen Leiter, und
  daraus kommt alles: Farbe als eines von zwanzig gleich breiten Bändern,
  Schattierung aus dem Gefälle, Höhenlinien auf den Bandgrenzen. Die Silhouette
  darunter in **einer** Farbe — nicht als Farbe der Karte, sondern als scharfe
  Kante, weil der Rand des hochgerechneten Feldes weich ist.
- **Jede Höhenlinie ist eine Farbgrenze.** Bandgrenzen und Niveaus liegen auf
  denselben k/NBAND des Feldwerts; die Zahl der Niveaus hängt an der Zahl der
  Bänder. Die beiden obersten Bänder, Fels und Schnee, liegen dabei **über** dem
  gemessenen Quantil: die Reserve trägt selbst Farbe, statt farblos Platz zu
  halten.
- **Der Bezug der Höhe ist absolut**: die Dichte Deutschlands 2024, für jedes
  Bild dieselbe. ×2 heisst damit in jedem Jahr dasselbe, und das Wachstum steht
  in der Farbe — 1871 liegt das Land fast einfarbig im Tiefgrün, 2024 im Orange.
  Der relative Bezug (mittlere Dichte desselben Bildes) steckt als Schalter im
  Skript, `bezugAbsolut(false)`, ohne Knopf.
- **Volumen ist Bevölkerung.** Die Leiter teilt linear auf, nicht logarithmisch:
  Weichzeichnen erhält das Integral, also ist das Volumen unter der
  Geländeoberfläche die Bevölkerung, über jeden Ausschnitt. Gemessen für 2024,
  Berlin gegen Ruhrgebiet: logarithmisch standen beide gleich hoch (0,88 : 0,88),
  obwohl Berlin dichter ist; linear steht Berlin elf Prozent höher
  (0,83 : 0,75), und das Volumenverhältnis geht von 1,94 auf 1,74 zurück, bei
  1,35 Menschen. Der Rest ist das Weichzeichnen, das Berlins Berg über die
  eigene Kreisgrenze trägt. Preis: die frühen Bilder verlieren an Zeichnung.
  Schalter im Skript, `LINEAR = false`.
- **Ein Layoutfehler, zwei Symptome.** `#legText` darf nicht umbrechen, und die
  min-content-Breite eines Flex-Kindes ist voreingestellt die seines Inhalts —
  eine lange Zeile („1946–1950 → 1961–1964") dehnte damit die ganze Bühne über
  ihren Rahmen hinaus, und die Karte sprang um siebzehn Bildpunkte in die Breite
  und zurück, je nach Notiz. Dazu mass die Massfunktion die Leinwand, bevor die
  Legendenzeile gefüllt war: gezeichnet wurde für 808 Bildpunkte Höhe, ausgelegt
  waren 784, also lag die Karte drei Prozent gestaucht da. Behoben mit
  `min-width:0`, einer reservierten Zeilenhöhe und einem **ResizeObserver** auf
  dem Kartenfeld, der neu misst, wenn sich das Auslegen ändert — wer immer es
  ändert.
- **Die Nutzlast trägt nur noch eine Form.** Neun der zehn Kartogramme gingen
  nur in den Mittelwert ein — rund 450 kB für Formen, die niemand zu sehen
  bekam. Gemittelt wird jetzt beim Bauen: **138 statt 500 kB Nutzlast, 259 statt
  632 kB Seite.** Mit ihnen fielen der Massstab je Zustand und der Ankerpunkt,
  um den er wirkte — ein fester Massstab um einen festen Punkt tut nichts mehr,
  sobald `masse()` den Rahmen der gezeichneten Punkte auf die Leinwand normiert.
  Gemessen wird beim Bauen jetzt, wie sehr die eine Form noch ein Kartogramm
  ist: ihre Flächen gegen den **mittleren** Anteil über alle Bilder, Median
  0,78 %, Max 7,9 %, über 1 % bei 155 von 400. Schlechter als ein einzelnes
  Kartogramm (Median 0,18 %) und kein Fehler — der Mittelwert zehn flächentreuer
  Formen ist selbst nicht flächentreu.
- **Der Boden steht still: der Mittelwert aller zehn Kartogramme.** Verzerrt
  wurde bisher auf das Kartogramm des jeweiligen Jahres — die Fläche eines
  Kreises war sein Anteil an der Bevölkerung *dieses* Bildes. Damit sind zwei
  Bilder unvergleichbar, und zwar aus Arithmetik: Volumen = Fläche × Höhe, das
  Volumen je Mensch steht fest, also muss die Höhe ausgleichen, was die Fläche
  tut. Berlin hatte 1910 dieselben 3,7 Millionen wie heute, hielt aber fast
  jeden dreizehnten Deutschen statt jeden dreiundzwanzigsten — wurde 60 % breiter
  gezeichnet und lag flach.
  Jetzt der **Mittelwert aller zehn Kartogramme**, zur Hälfte eingemischt: ein
  Körper, der keinem Jahr gehört und allen (das Kartogramm von 2024 würde 1871
  auf der Gestalt von heute zeichnen). Berlins Grundfläche steht damit in jedem
  Bild auf 1,87 %, und seine Höhe ist unmittelbar seine Bevölkerung: ×0,60
  (1871), ×2,39 (1910), **×2,78 (1939)**, ×2,03 (1948), ×1,97 (1987), ×2,36
  (2024). Berlin 1910 steht so hoch wie heute — beide im obersten Band —, 1939
  höher als beide. Volumen je Million Menschen über alle zehn Zählungen konstant
  bei 182. Neu sichtbar: **Orte, die
  schrumpfen** — Leipzig, Dresden, Chemnitz ragen 1910 heraus und sinken, vorher
  schrumpfte mit ihren Menschen auch ihre Grundfläche.
  Der Preis ist die Bewegung: die Karte verformt sich nicht mehr, sie steigt und
  fällt. Damit fällt auch die Bahn zwischen zwei Bildern weg — acht Zahlenreihen
  zu je 12 000 Knoten und eine kubische Kurve je Abschnitt; die Orte werden
  einmal gerechnet. Nachgezählt, dass die Mischung aus elf Formen nichts
  umstülpt: **0 gefaltete Ringe von 465**. Schneegrenze dafür von 1,17 auf 1,10,
  Wasser 2024 9,2 % statt 6,6 %.
- **Unten Wasser.** Die untersten fünf der fünfundzwanzig Bänder sind ein See:
  tief dunkelblau, zum Ufer hin heller. Wo auf die Fläche am wenigsten Menschen
  kommen, liegt jetzt Wasser, und die Uferlinie ist die schärfste Grenze, die
  eine Geländekarte kennt. Zwei Gewinne: die Landbänder verteilen sich über
  einen engeren Bereich des Feldes, **lösen also feiner auf**, und die frühen
  Bilder bekommen ihre Zeichnung zurück — die lineare Leiter legt sie fast alle
  in die untersten Bänder, und genau dort liegt jetzt die Abstufung. Unter
  Wasser wird weiter schattiert und weiter Höhenlinie gezogen — es sind
  Tiefenlinien, aus derselben Zahl wie alles andere. Wo der Spiegel steht und
  warum genau dort, siehe unten.
- **Die Gipfel hatten einen Krater, jetzt laufen sie in einer flachen Spitze
  aus.** Die Schärfung zog das weite Feld ab, und das **wölbt** sich über einem
  breiten Plateau zur Mitte auf: Berlins enges Feld steht quer durch den Kreis
  konstant auf 0,929, das weite steigt von 0,761 am Rand auf 0,839 in der Mitte,
  und heraus kam 0,955 am Rand gegen 0,943 in der Mitte. Zwölf Tausendstel, und
  die Schattierung machte daraus eine sichtbare Mulde. Der Bezug der Schärfung
  ist jetzt ein **drittes, dreimal weiteres Feld**, über einem Plateau fast
  konstant; die Form der Kuppe macht wieder das Gemisch aus engem und weitem
  Feld, mit dem engen unter eins. Gipfel Berlin 0,988 statt 0,972, keine Kuhle,
  Volumen Ruhr : Berlin unverändert 1,45 : 1. Gerechnet wird das sehr weite Feld
  **in Zahlen** statt auf der Leinwand — ein Kastenfilter mit laufender Summe
  kostet je Bildpunkt dasselbe, egal wie breit er ist, und spart das teure
  dritte Auslesen der Bildpunkte.
- **Die Farbleiter wird beim Bauen gerechnet**, nicht mehr als Liste von
  Zeichenketten gepflegt: je Band eine Helligkeit, ein Farbton und der Anteil
  der grössten Buntheit, die sRGB dort hergibt, gesucht per Halbierung in
  OKLCh. `NBAND` und `WASSER` sind damit Stellschrauben statt Handarbeit.
- **Real map und Cartogram sind gelöscht**, nicht nur versteckt: kein
  Überblenden zwischen Formen, keine Leiter je Form, keine Mindestbreite der
  Leiter, kein Ausblenden des Reliefs. Das waren alles Vorkehrungen für das
  volle Kartogramm, in dem jeder Kreis dieselbe Dichte hat; bei halber
  Verzerrung stand die Binnenspanne bei 1,76 gegen die 0,96, ab denen die Bremse
  überhaupt gegriffen hätte. Die Nutzlast enthält beide Enden weiterhin — die
  Landkarte ist der Anfang der Differenzkette —, wer die Knöpfe zurückwill,
  braucht keine neuen Daten, nur wieder Code.
- **Berlin ist der höchste Berg, und jetzt sieht man es auch.** Es ist 2024 der
  zweitdichteste Kreis (×2,51; nur München steht mit ×2,58 darüber), dichter als
  jede einzelne Ruhrstadt — auf der Karte sah es umgekehrt aus. Drei Ursachen,
  alle drei Darstellung:
  **(1) Die Leiter war oben zu.** Was über q0,95 lag, wurde auf denselben Wert
  geklemmt: elf Kreise 2024, und ihr Unterschied war weg, *bevor der erste
  Weichzeichner lief*. Danach entschied nur noch die Breite der Fläche, und da
  gewinnt ein Band dichter Städte gegen einen Fleck — Berlins Gipfel stand im
  Feld auf 0,866, der des Ruhrgebiets auf 0,877. Statt des Deckels jetzt ein
  **weiches Knie**: linear bis zum Quantil, darüber exponentiell in die Reserve,
  nichts wird mehr gekappt.
  **(2) Die Reserve hatte keine Farbe.** Die Bänder liegen jetzt auf dem
  Feldwert statt auf dem Leiterwert; die beiden obersten, Fels und Schnee,
  gehören der Spitze über dem Quantil allein.
  **(3) Weichzeichnen trägt Volumen über die Kreisgrenze**, und wen es trifft,
  entscheidet die Nachbarschaft: Berlin verliert an Brandenburg und bekommt
  nichts zurück, Essen verliert an Bochum und bekommt von Bochum dasselbe wieder.
  Dagegen eine **Unscharfmaskierung** (`ENGANTEIL` 1,15 statt 0,55) — sie schlägt
  genau die Differenz aus engem und weitem Feld wieder auf, ist gross bei einem
  einzelnen Gipfel, null über einem Plateau und über die Karte mittelwertfrei.
  Gemessen 2024: Gipfel Berlin 0,972 gegen Ruhrgebiet 0,889, Bänder 19 gegen 17,
  **Volumen Ruhr : Berlin 1,44 : 1** bei 1,36 : 1 Menschen — vorher 1,76 : 1.
  Der Preis: eine Unscharfmaskierung überschiesst, Berlins höchster Punkt liest
  sich knapp ein Zehntel über der Dichte seines Kreises. Der Gipfel ist eine
  Schätzung, das Volumen ist die Bevölkerung.
- **Mehr Bänder, und oben echter Schnee.** Erst zwanzig statt sechzehn, jetzt
  vierundzwanzig mit dem Wasser. Die Leiter ist gerechnet statt gegriffen:
  mittlere Buntheit der Landbänder 0,17 (OKLab) gegen 0,15 der vorigen Fassung.
  Das oberste Band ist **weiss**, nicht hellbraun; darunter ein fast
  entsättigtes Grau als Übergang von Fels zu Schnee. 2024 sind zweiundzwanzig
  der vierundzwanzig Bänder belegt. (Heute sind es fünfundzwanzig Bänder,
  siehe „Der Meeresspiegel".)
- **Die Höhenlinien werden ausgedünnt, nicht fallengelassen.** Wo zwei Niveaus
  auf der Leinwand zusammenrückten, blendeten bisher *alle* aus — was genau den
  steilsten Hang traf. Berlins Flanke fällt in wenigen Bildpunkten durch fünf
  Niveaus, also hatte ausgerechnet der höchste Berg keine Höhenlinien mehr.
  Jetzt hält jedes vierte Niveau am längsten durch, dann jedes zweite, dann der
  Rest; mittlere Sichtbarkeit in Berlin 0,74 statt 0,59.
- **Die Schattierung wird in die Farbe gerechnet.** Sie lag als Grau im
  Mischmodus `soft-light` darüber, und dessen Rechenvorschrift enthält den
  Faktor C·(1−C) — bei Weiss also null. Auf den hellsten Bändern, den Gipfeln,
  kam **überhaupt keine Hangschattierung an**; `overlay` und `hard-light` haben
  dieselbe Stelle. Jetzt läuft der helle Hang anteilig gegen Weiss, der dunkle
  gegen Schwarz, im selben Durchgang, in dem das Farbband nachgeschlagen wird.
  Das greift stärker in tiefe Töne ein, also Stärke 1,6 statt 2,2 und
  Schlagschatten 0,32 statt 0,50 — und es spart eine Leinwand und einen
  Kompositionsdurchgang: 12,9 statt 11,1 Bilder je Sekunde im Prüfbrowser.
- **Enger geglättet** (weiter Radius `breite/28` statt `/22`, enges Feld 0,55
  statt 0,40 Gewicht): das weite Feld bevorzugt Plateaus vor Spitzen, und das
  Ruhrgebiet ist ein Plateau, Berlin eine Spitze. Nebenbei zerfällt das
  Ruhrgebiet wieder in die Städte, aus denen es besteht. Zeitkonstante des engen
  Feldes dafür von 0,30 s auf 0,55 s; gemessen ist die Bewegung danach ruhiger
  als vorher (0,77 statt 0,81 Promille Änderung je Bild).
- **Die Leiter misst die Form, die gezeichnet wird**, bis ×2,39 und als Knie
  weiter bis ×2,68 (linear ab null). Solange drei Formen umschaltbar waren,
  musste sie alle drei umschliessen, sonst hiesse ×1 je nach Knopfstellung etwas
  anderes — und dann setzte die Landkarte mit ihrer weitesten Streuung das obere
  Ende für alle. Mit einer Form misst sie genau das Gezeichnete: q0,95 liegt bei
  ×2,04 statt ×2,29, was die Schneegrenze ausgleicht (1,17 statt 1,04). Am Ende
  steht die Leiter fast dort, wo sie vorher stand, aber aus dem richtigen Grund.
- **Das Relief hängt jetzt an der Binnenspanne**, also der Streuung innerhalb
  *eines* Bildes, nicht mehr an der Gesamtspanne über alle. Im Kartogramm sind
  die beiden grundverschieden: innerhalb eines Jahres keine Streuung, über die
  Jahre die volle. Mit demselben Anteil läuft auch die **Farbe** gegen das
  Bildmittel — sonst wurden aus den Konvergenzresten des Diffusionsverfahrens
  sichtbare Farbbänder (1943 ein Ost-West-Verlauf über dem Kartogramm, der wie
  ein Befund aussah und keiner war).
- **Die Leiter wird je Form aus den Daten gemessen**, einmal, über alle Kreise in
  allen Zählungen, **flächengewichtet**: q0,05 bis q0,95. Landkarte
  Half and half ×0,28 … ×2,39 (nicht gezeichnet: Landkarte ×0,18 … ×2,68,
  Kartogramm ×0,35 … ×1,17). Flächengewichtet,
  weil Fläche gefärbt wird und nicht Kreise — ungewichtet setzten die
  hundertsieben winzigen kreisfreien Städte das obere Quantil, und die halbe
  Palette blieb leer; jetzt sind 2024 dreiundzwanzig der fünfundzwanzig Bänder
  belegt.
- **Die Legende behauptete eine Dichte, die die Höhe nicht ist.** Da stand
  „× the average population density of Germany 2024", und das verspricht
  wirkliche Dichte. Gefärbt wird aber Bevölkerung je **gezeichneter** Fläche
  auf einem halb eingemischten Kartogramm, und das geht genau dort auseinander,
  wo man zuerst hinsieht: München ×3,16 auf der Karte gegen ×20,7 wirklich
  (4 844 E/km²), Berlin ×2,36 gegen ×17,7, die Prignitz ×0,25 gegen ×0,15. Der
  Verzerrungsfaktor läuft von 0,57 bis 7,5, im Median 0,99 — für einen
  gewöhnlichen Landkreis stimmte der Satz, für Städte nicht. Jetzt steht dort,
  was die Karte wirklich zusichert: „volume = people · ×1 = the German average
  of 2024". Und der Zettel beim Antippen stellt die beiden Zahlen nebeneinander
  — „Per km² 4 136 · ×17,7" gegen „Height here ×2,4" —, das ist der einzige
  Ort, an dem sich der Unterschied zeigen lässt, ohne die Karte zuzudecken.
- **Vier Stellen in der Methodik nachgemessen und richtiggestellt.** „Volumen =
  Bevölkerung" galt dort auf die Stelle; gemessen sind es **+2,4 %** über die
  ganze Karte (davon 2,1 % vom randnormierten Weichzeichnen, nicht von der
  Schärfung), **+5,8 %** beim Vergleich Ruhrgebiet gegen Berlin und **+18 %**
  am Berliner Gipfel allein durch die Schärfung, bezahlt mit einer Mulde von
  0,05 rings um jede Stadt. Der Tiefpass hinkt dem Jahr um **1,1 bis 2,9
  Jahre** nach (Tabelle stand auf einer 70-Sekunden-Uhr und mit τ = 0,30 statt
  0,55). Das weite Weichzeichnen ist `breite/28` und die Mischung 85:15, nicht
  `breite/22` und 40:60. Und die Stufe an den Ländergrenzen im Bild 1900–1910
  ist jetzt beziffert: Bayern 1900 (96 Kreise, 5,41 Mio), Nordwesten 1905 (155,
  16,26 Mio), der Rest 1910 (149, 26,11 Mio), bei 15,2 % Reichswachstum im
  Jahrzehnt. Aus GPOP nicht zu heilen — die Spalten schliessen einander aus.
- **Neu in der Methodik: die Form eines Berges ist die Form des
  Weichzeichners.** Ein Kreis ist ein Plateau einer einzigen Höhe; die Kuppe
  kommt vom Gaussschen Kern und nicht von der Besiedlung. Berlins Kegel sagt
  nicht, dass die Mitte dichter ist — die Karte weiss innerhalb von 891 km²
  nichts. Auflösung: 400 Zellen, kleinste Schweinfurt 35,7 km², grösste
  Mecklenburgische Seenplatte 5 495 km², Median 800.
- **Die Seite gibt es auch als Film.** `build/film.mjs` macht aus ihr ein
  hochkantes mp4 — 1080 × 1920, dreissig Bilder in der Sekunde, 84 Sekunden
  Lauf plus zwei Sekunden Standbild, rund 25 MB. Der Inhalt ist der der Seite,
  nichts nachgebaut: sie wird geladen, der Regler ausgeblendet, dann Bild für
  Bild weitergestellt. Nicht in Echtzeit abgefilmt — der Browser schafft hier
  elf Bilder in der Sekunde —, sondern mit **gestellter Uhr**: je Bild
  `dtSek = 1/FPS` und `setzeZeit(i/(n−1))`, also genau das, was die Seite bei
  flüssigem Lauf täte. Spielzeit auf die Sekunde, derselbe Tiefpass. Das
  Skript braucht `playwright-core` und `ffmpeg-static`, beide nicht im Repo:
  Werkzeug, keine Seite.
- **Kein Name läuft mehr aus der Leinwand.** Mönchengladbach liegt so weit im
  Westen, dass sein Name auf dem Telefon zwanzig Bildpunkte links neben der
  Karte begann — das M war weg. Jeder Name wird jetzt in jeder der vierzig
  Runden in den Rahmen geklemmt, und zwar **innerhalb** der Runden, damit der
  Nachbar ausweichen kann statt sich zu überlagern. Nachgemessen über den
  ganzen Lauf bei 1280, 420 und 390 Bildpunkten Fensterbreite: nichts ragt mehr
  heraus.
- **Am Ende der Leiter steht jetzt die ×3.** Nach der ×2 folgte nichts mehr, und
  das letzte Fünftel der Rampe stand unbeschriftet da. Jetzt: **0, ×0,5, ×1,
  ×1,5, ×2, ×3** — die ersten fünf bei 0, 20, 40, 60, 80 Prozent, die ×3 bei 99.
  Dass der letzte Schritt ein ganzer ist und kein halber, liegt am Knie: ab
  ×2,222 biegt es die Leiter um, eine ×2,5 läge drei Prozent vor der ×3 und
  damit auf ihr. Eine Leiter, die wirklich bei ×3 endet (24 Bänder, 4 blaue),
  wurde ausprobiert und verworfen: das Knie läge dann sechzehn Prozent über dem
  gemessenen Quantil, die obersten vier Bänder trügen 0,4 statt 2,2 Prozent der
  Fläche, und Berlin, Köln und Hamburg verlören ihre weissen Kappen.
- **Zwischen zwei Zählungen sagt die Zahl über der Karte, dass sie keine
  Zählung ist.** Vorher stand dort schlicht „1941 · 60.5 million people", und
  das las sich wie ein Befund. Im Krieg ist es einer der falschen: gezählt sind
  **59,63 Mio** am 17.5.1939 und **66,19 Mio** 1946/1950 (heutiger
  Gebietsstand), und die Zunahme dazwischen ist echt — zwölf Millionen
  Vertriebene, mehr als der Krieg gekostet hat —, nur kam sie 1945 und 1946 und
  nicht gleichmässig ab 1940. Dazwischen liegt keine Zählung, die Kurve ist eine
  Annahme. Jetzt: „≈ 60.5 million people · interpolated between the counts of
  1939 and 1946–1950", auf schmalen Schirmen „≈ 60.5 million · 1939 →
  1946–1950"; auf einer Zählung steht stattdessen der Stichtag. Der Zusatz
  stand früher in der Legende und war mit ihrer Kürzung weggefallen — er gehört
  aber ohnehin zur Jahreszahl und nicht zur Farbleiter.
- **Der Meeresspiegel ist jetzt eine Zahl, die etwas heisst.** Er lag bei ×0,43
  der heutigen mittleren Dichte, und das war kein Schwellenwert, sondern das
  Nebenprodukt zweier anderer Entscheidungen: vier von vierundzwanzig Bändern
  blau, Leiterende beim gemessenen Quantil. Blau hiess „unten", weiter nichts.
  Jetzt liegt er bei **×0,50 — der halben mittleren Dichte Deutschlands von
  2024**, in der Wirklichkeit rund 95 Einwohner je km² und damit ungefähr die
  EU-Linie für „dünn besiedelt" (100 E/km²). Unter Wasser steht also, was man
  strukturschwach nennt, wenn man es an der Dichte misst. Das „ungefähr" ist
  der einzige Haken: gefärbt wird **gezeichnete** Dichte, und der feste Boden
  schrumpft leere Kreise — die 27 Kreise zwischen ×0,48 und ×0,52 haben real
  zwischen 78 und 126 Einwohner je km², im Median 95; unter Wasser stehen
  12,4 Prozent der Karte, während real 31,9 Prozent der Landesfläche unter
  100 E/km² liegen. Bezahlt ist der Spiegel mit **25 Bändern statt 24 und fünf
  blauen statt vier** — und damit geht die ganze Leiter in runden Zahlen auf:
  ein Band ist ×0,1, fünf Bänder sind die Küste, die Rampe endet bei ×2,5, das
  Knie beginnt bei ×2,222 (gemessenes Quantil ×2,305, vier Prozent daneben).
  Jede halbe Stufe fällt auf eine Bandgrenze; 23 der 25 Bänder sind 2024
  belegt, Berlin bleibt im Feld über dem Ruhrgebiet. Geprüft und verworfen: ×1,00 (die heutige
  mittlere Dichte) setzt 58 Prozent der Fläche unter Wasser und 1871 das ganze
  Land; ×0,35 (die mittlere Dichte von 1871, 82 E/km²) ist die schönere
  Erzählung, zeigt 2024 aber nur 4 Prozent Blau. Der Lauf der Küste: 1871
  **90,5 %** der Fläche unter Wasser — die Karte ist eine Inselgruppe —, 1900
  55,9 %, 1939 34,4 %, um 1950 **11,4 %** (nie wohnte in der Fläche so viel
  Deutschland wie nach der Vertreibung), dann wieder 8,9 % 1996, 11,4 % 2011,
  **12,2 % 2024**, fast nur im Nordosten.
- **Die Zahlen stehen auf der Leiter statt daneben.** Links und rechts standen
  Anfang und Ende, dazwischen nichts — bei einer linearen Leiter die
  ungünstigste aller Auskünfte, weil sich der bewohnte Bereich ins linke
  Drittel drängt. Jetzt sechs Marken an ihrer wirklichen Stelle, alle rund oder
  halb: **0, ×0,5, ×1, ×1,5, ×2, ×2,5** — gleichmässig bei 0, 20, 40, 60 und 80
  Prozent, jede auf einer Bandgrenze, die ×0,5 auf der Uferkante. ×1 steht
  damit bei 40 Prozent und nicht in der Mitte: in der Mitte stünde sie nur bei
  einem Ende von ×2,0, und darüber liegen 2024 noch **7,1 Prozent der Fläche**
  (Berlin, München, Frankfurt, das halbe Ruhrgebiet), die sich dann das letzte
  Fünftel der Farben teilen müssten — genau die Krankheit, die „Die Leiter war
  oben zu" schon einmal hatte. Über ×2,5 liegen nur 0,65 Prozent. Und ×2,5 ist
  kein Deckel: ab ×2,222 biegt das Knie weich um, die Marke sitzt deshalb bei
  96 statt 100 Prozent, der Rest der Rampe trägt alles darüber (höchster Kreis:
  München 2024 mit ×3,16). Vorher stand rechts „×2,3+" am äussersten Rand und
  sah aus wie Schluss. Damit die ×0,5 stimmt, zeigt die Rampe **harte Stufen**
  statt eines
  weichen Verlaufs: ein CSS-Verlauf setzt seine Stützstellen auf k/(N−1) und
  mischt, die Bänder liegen aber auf k/N — das Ufer lag im Verlauf drei Prozent
  neben seiner Zahl. Und die Legendenzeile sagt nur noch einen Satz:
  „× the average population density of Germany 2024". Der Stichtag steht im
  Tippen, wo ohnehin Zahl, Rate und Methode des Kreises stehen.
- **Das Ruhrgebiet trägt endlich mehr als einen Namen.** Der Mindestabstand
  zwischen zwei Beschriftungen war ein fester Wert auf der **Landkarte**
  (sechzig Kilometer), und daran ging genau diese Region zugrunde: Köln liegt
  55 Kilometer von Essen entfernt und warf es aus der Liste — Essen war 1910
  mit 477 611 Menschen die neuntgrösste Stadt des Landes. Gemessen wird jetzt
  **auf dem Bild**, als Zwölftel der Kartenbreite in Bodenmass. Der feste
  Boden ist ein halb eingemischtes Kartogramm und zieht das Revier
  auseinander (zwei Bildpunkte je Kilometer statt 0,9 im Landesmittel), dort
  stehen also doppelt so viele Namen wie anderswo. Seither: Essen, Dortmund
  und Köln nebeneinander; 2024 dazu Münster und Karlsruhe, beide grösser als
  Chemnitz und vorher von einem Nachbarn verdeckt. Und weil das Mass am
  Boden hängt und nicht am Fenster, zeigt das Telefon dieselben Städte wie
  der Schirm.
- **Die Legende nennt nicht mehr die Form.** Da stand „× the 2024 average
  density · fixed ground · 1871-12-01" — drei Sachen an Mittelpunkten
  aufgereiht, und die mittlere las sich wie eine Eigenschaft der Jahreszahl
  daneben. Das Wort stammte aus der Zeit mit drei umschaltbaren Formen. Jetzt:
  „height: × the average density of Germany in 2024 · counted 1871-12-01",
  jede Angabe mit einem Wort davor, das sagt, was sie ist. (Heute steht dort
  nur noch der eine Satz; die Zahlen sind auf die Leiter gewandert, der
  Stichtag ins Tippen.)
- **Die dreizehn Notizen sind auf 64 Prozent gekürzt** (1 922 → 1 228 Zeichen).
  Je Notiz bleibt eine Aussage und eine Zahl.
- **Welche Städte einen Namen tragen, entscheidet das Jahr.** Nicht mehr die
  siebzehn grössten von heute, ein für alle Mal beim Bauen gewählt, sondern die
  siebzehn grössten **jetzt** — die Auswahl läuft in jedem Bild neu über die
  laufende Einwohnerzahl, aus einem Vorrat von fünfundsiebzig Städten (je über
  100 000 Einwohner). 1871 stehen damit Karlsruhe, Kassel und Erfurt auf der
  Karte und Bielefeld, Mannheim und Kiel nicht; heute ist es umgekehrt.
  Insgesamt kommen zweiundzwanzig Namen vor, die ersten zwölf stehen immer.
  Der Wechsel springt nicht: die Schwelle ist der Wert des siebzehnten Namens,
  wer darunter rutscht, blendet über sechs Prozent aus, und im Augenblick des
  Wechsels sind beide gleich gross — die Blende ist dort gerade offen.
- **Die Schriftgrösse folgt derselben Uhr**, stufenlos statt in vier festen
  Stufen: aus dem Logarithmus des Verhältnisses zur Schwelle, `breite/56` für
  den letzten Namen der Auswahl bis `breite/33` für den vierzehnfachen. Sie
  hängt am Verhältnis, nicht an der Einwohnerzahl — der Berg sagt, wie viele
  Menschen da sind, der Name sagt, wer gerade zu den grössten gehört. Absolut
  gerechnet wäre Chemnitz heute grösser geschrieben als 1871, obwohl es damals
  die elftgrösste Stadt war und heute die sechzehnte.
- **Der beschreibende Text hängt an der Breite der Bühne** statt an einer festen
  Pixelzahl: `clamp(9px, 1,36cqw, 11,6px)`, die Überschrift und der Faden im
  selben Verhältnis. Auf dem Telefon bleibt alles wie zuvor — die neun Pixel
  sind der Boden —, auf einem breiten Schirm wächst der Text mit der Karte mit
  (11,2 px bei 1280 Pixeln Fenster). Er stand dort sonst als immer kleiner
  werdender Fleck neben einer Karte, deren eigene Schrift sich nach genau dieser
  Breite richtet.
- **Ein roter Punkt auf dem Ort, und siebzehn Städte statt dreizehn.** Seit die
  Umrisse weg sind, sagt kein Strich mehr, wo eine Stadt genau liegt — der Name
  steht ja bewusst unter dem Gipfel. Also ein kleiner roter Punkt mit dunklem
  Ring, Name darunter. Rot, weil es die einzige Farbe ist, die auf dieser Leiter
  nichts bedeutet. Schwelle 250 000 statt 400 000 Einwohner (höchster Stand),
  dazu Magdeburg, Bielefeld, Mannheim und Kiel. Die **Schriftgrösse** kam
  damit aus der Stadt statt aus der gezeichneten Fläche (die Fläche steht seit
  dem festen Boden still und sagte ohnehin mehr über den Zuschnitt des Kreises
  als über die Stadt) — inzwischen kommt sie aus dem Jahr, siehe oben.
- **Der beschreibende Text ist deutlich kleiner** (13,5 → 9 px, Überschrift
  14,5 → 9,8, der Faden im selben Verhältnis). Er stand als Block über der Karte
  und zog den Blick, bevor die Karte ihn bekam. Zwischendurch stand er bei 7 und
  war zu klein; die neun sind die Mitte und heute die Untergrenze, siehe oben.
- **Auch die Städte tragen keinen Umriss mehr.** Die hundertsieben kreisfreien
  Städte waren die letzte Ausnahme von „keine Grenzen"; der Strich sagte, wie
  weit eine Stadt reicht, solange sie mit ihrer Bevölkerung wuchs. Bei festem
  Boden ist die Grundfläche über alle Jahre dieselbe, er zeigt also nur noch
  Verwaltung.
- **Im vollen Kartogramm ist keine Höhe mehr übrig**, und das soll man sehen.
  Eine Leiter über die verbliebenen anderthalb Prozent machte aus Rundungsresten
  ein Gebirge — und das weichgezeichnete Feld tat dasselbe, weil ein gross
  gezeichneter Kreis von den Fugen weniger abbekam als ein kleiner; Berlin sah
  wieder aus wie ein Berg, obwohl es nur gross gezeichnet ist. (Die Fugen sind
  inzwischen weg, siehe oben; die Leiter bleibt.) Also zwei Bremsen
  aus derselben gemessenen Spanne: die Leiter bekommt eine Mindestbreite (Faktor
  2,6, danach um ein halbes Band verschoben, sonst kippen die Rundungsreste über
  die Bandgrenze und sprenkeln die Fläche), und das Relief wird im selben
  Verhältnis ausgeblendet. Beides ist mit dem Kartogramm **gelöscht**: bei
  halber Verzerrung stand die Binnenspanne bei 1,76 gegen die 0,96, ab denen die
  Bremse überhaupt gegriffen hätte — sie hat nie etwas getan.
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
- Siebzehn Städte tragen ihren Namen: die grössten des gerade gezeigten
  Jahres, um ein Zwölftel der Kartenbreite voneinander ausgedünnt. Die Schrift
  wächst mit dem Abstand zur Schwelle, fällt aber nie unter sieben Pixel; wo
  zwei Namen einander berühren, weichen sie aus.
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
