# Stand

Was steht, was offen ist, und was bewusst so bleibt.

## Was steht

Alles, was die Seite braucht. Die Kette läuft von den beiden Rohdateien bis
`data/karte.json` durch, jeder Schritt zählt aus, was er getan hat, und die
Zahlen in der Seite und in [METHODIK.md](METHODIK.md) sind die Ausgabe dieser
Läufe — nicht von Hand übertragen.

```
python3 build/01_netz.py && python3 build/02_zeiten.py \
  && python3 build/03_lage.py && python3 build/04_seite.py
```

Geprüft wurde dabei:

- **Die Reisezeiten gegen den wirklichen Fahrplan**, an zweiundzwanzig
  Strecken (die Tabelle steht in der [README](README.md)). Berlin–Hamburg
  141 Minuten gegen 1:45 Fahrzeit plus Warten, Frankfurt–München 218 gegen
  3:10, Stuttgart–München 131 gegen 2:15, Westerland–Hamburg 233 gegen 3:00.
  Alle im erwarteten Band.
- **Die Erreichbarkeit gegen das, was jeder weiß**: am tiefsten liegen
  Frankfurt Hbf, Fulda, Kassel-Wilhelmshöhe, Erfurt, Würzburg, Nürnberg,
  Göttingen, Hannover — das ICE-Kreuz, und es kommt aus der Rechnung, nicht
  aus einer Liste.
- **Die Federkarte gegen die Isochronen**: die Linien gleicher Reisezeit um
  einen Knoten sind auf der Landkarte ausgefranste Sterne und auf der
  Zeitkarte annähernd Kreise. Nicht ganz — es bleiben 23 % Stress —, aber
  sichtbar.

## Sechs Fehler, die im Laufen gefunden wurden

Sie stehen hier, weil jeder von ihnen eine Karte erzeugt hat, die plausibel
aussah.

**`INT32_MAX + 5` läuft über.** Die erste Fassung des Connection Scan setzte
den Ankunftswert unerreichter Bahnhöfe auf `INT32_MAX` und prüfte den Einstieg
mit `ankunft + UMSTEIGEZEIT <= abfahrt`. Der Überlauf machte daraus eine große
negative Zahl, also war **jede** Verbindung besteigbar: Berlin–Hamburg kam auf
12 Minuten heraus, und jeder Bahnhof hatte dieselbe mittlere Reisezeit von 32
Minuten. Auffällig wurde es an der zweiten Zahl, nicht an der ersten.

**Bei h ≡ 0 ist der Höhengradient null.** Der Geländeteil lief zweihundert
Schritte und gab als maximale Höhe 0 aus. In die Kantenlänge geht nur der
Höhen*unterschied* ein: das flache Optimum ist für die Höhe ein Sattel. Die
Starthöhe kommt jetzt aus dem Rest, den die Ebene liegen lässt.

**Ein festgehaltener Nachbarschaftsgraph wird ausgenutzt.** Er wurde alle
zwanzig Schritte neu gebaut; der Stress sank zwanzig Schritte lang und stieg
beim Neubau wieder. Das Verfahren hatte die Umwege des Graphen optimiert, nicht
die Reisezeit. Jetzt wird er in jedem Schritt neu gebaut.

**Eine Falte im verzogenen Umriss wird zum Loch.** Der Umriss wurde als Ring
gefüllt. Wo das Verschiebungsfeld ihn so schert, dass er sich selbst
überschlägt, heben sich die Umlaufzahlen auf — und in der Karte standen kleine
schwarze Dreiecke mitten im Land. Jetzt wird jeder Ring einmal in Dreiecke
zerlegt und die Umlaufrichtung nach dem Verziehen geprüft.

**Die Abdeckung durch Bahnhöfe blies die Landkarte auf.** Weil einzelne
Bahnhöfe in der Zeitkarte jenseits der verzogenen Küste landen, kam eine
zweite Landschicht aus der Bahnhofsdichte hinzu. Genommen für *alle* Bahnhöfe
machte sie aus Deutschland auch in der Landkarte eine Wolke, zwanzig Kilometer
über jede Küste hinaus. Jetzt gilt sie nur für die, die wirklich draußen
liegen — in der Landkarte also für keinen.

**Ein Ausreißer walzte die Farbleiter platt.** Das obere Ende war der höchste
Feldwert. Ein einzelner Haltepunkt mit zwei Zügen am Tag reicht bis +458
Minuten, und damit lag die Schneegrenze so hoch, dass nirgends Schnee lag.
Jetzt ist das obere Ende das 99,5-Perzentil des Landes.

## Was offen ist

**Die Erreichbarkeit ist nach Bahnhöfen gewichtet, nicht nach Menschen.** Das
ist die größte offene Stelle. „Mittlere Reisezeit zu allen 4.814 anderen
Bahnhöfen" zählt einen Haltepunkt mit dreißig Einwohnern so wie Köln — und
weil die Haltepunkte in der Fläche liegen, zieht das die Karte nach außen.
Richtiger wäre „mittlere Reisezeit zu allen Menschen". Die Einwohnerzahlen
liegen im Nachbarprojekt [bevoelkerung-kreise](../bevoelkerung-kreise/) auf
Kreisebene; sie auf Bahnhöfe zu verteilen (Kreisbevölkerung anteilig nach
Nähe) ist eine halbe Stunde Arbeit und würde die Karte messbar verändern. Es
ist bewusst nicht getan: dann wären es zwei Karten in einer, und die zweite
wäre eine Bevölkerungskarte.

**Der Stadtverkehr fehlt, und das verzerrt die Ballungsräume.** Die Quelle
führt keine S-Bahn. Hamburg, München und das Rheinland liegen dadurch höher,
als sie müssten, und 227 Bahnhöfe an Nebenbahnen mit S-Bahn-Anschluss fehlen
ganz. Zu beheben wäre das nur mit einem eigenen GTFS-Auszug, der auch
`route_type` 109 behält — und dann müsste entschieden werden, ob eine
U-Bahn-Station ein Bahnhof ist. Für diese Karte lautet die Antwort nein.

**Nur eine Stunde.** Die Karte zeigt die dichteste Stunde des Tages. Dieselbe
Rechnung um 22:00 gäbe eine ganz andere Karte — ein Regler über den Tag wäre
das nächste, was dieses Projekt reizvoll machen würde, und er kostet nur
Rechenzeit: eine Reisezeitmatrix je Stunde, 24 mal 13 Sekunden, und 24 mal
fünf Minuten Federmodell. Die Nutzlast wäre allerdings 24 Lagen statt einer.

**Die Bodden und das Wattenmeer sind schwarze Flecken.** Hinter Rügen und bei
Husum liegt wirklich Wasser, und der Umriss sticht es aus der Karte. Das ist
richtig und sieht nach einem Fehler aus. Ein Meeresgrund in Blau statt des
schwarzen Grundes würde es auflösen und die Karte von ihrem schwarzen Grund
lösen, der das Beste an ihr ist.

**Der Grenzsaum trennt Deutschland nicht sauber ab.** Die Landesgrenze ist auf
2.100 Punkte vereinfacht und liegt deshalb um ein paar hundert Meter neben der
wirklichen; ohne einen Saum fallen Kehl, Gronau und Warnemünde aus dem Land.
Mit Saum kommen Auslandsbahnhöfe herein, und weil dieser Datensatz deren
eigene Landesfahrpläne nicht kennt, stehen sie als schlecht erreichbare Gipfel
auf einer Karte von Deutschland. Bei 2,5 km waren es 37 solche; bei den jetzt
gewählten 0,6 km sind es 8, und der Preis sind Lindau-Insel, Herten (Baden)
und Rheinfelden (Baden), die fehlen. Nach Abstand allein ist das nicht weiter
zu trennen — Gubin liegt 0,08 km von der Grenze, Kehl 0,29. Sauber ginge es
nur mit einer ungefähren Landesgrenze, und die gibt der Netzausgang hier nicht
her (siehe [QUELLEN.md](QUELLEN.md)).

## Was bewusst so bleibt

- **Die gezeichnete Höhe ist die gemessene Erreichbarkeit, nicht die
  Modellhöhe.** Warum, steht in [METHODIK 3.4](METHODIK.md). Kurz: die
  Modellhöhe trifft die Zahlen besser und erzählt das Falsche.
- **Der Grundriss ist die flache Federkarte, nicht die Geländelage.** Damit
  der Satz stimmt, der die Karte erklärt: der Abstand auf der Karte ist die
  Reisezeit.
- **Ein Reisender ohne Gepäck.** Gerechnet wird die früheste Ankunft, ohne
  Rücksicht auf Umstiegszahl, Preis oder Sitzplatz.
- **Fünf Minuten Umsteigezeit überall.** Die Quelle führt keine
  bahnhofsgenauen Zeiten, und eine geratene Staffelung wäre schlechter als
  eine ehrliche Pauschale.
