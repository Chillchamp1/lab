# Flachkanal DN 75

Generator für einen 3D-gedruckten Abluftkanal. Ein HT-Rohr DN 75 kommt von
unten. Hinter der Tischkante wird es flach, damit der Tisch fast an der Wand
stehen kann. Danach läuft der Kanal flach an der Wand hoch und biegt in ein
rechteckiges Loch in der Rückwand eines Druckergehäuses. Alle Maße sind
einstellbar. Die Seite rechnet daraus die Teile und gibt sie als STL aus,
fertig ausgerichtet für den Druck.

## Aufbau

| Teil | Druck | Was es tut |
|---|---|---|
| Unterteil | stehend, runder Anschluss unten | Muffe über das abgesägte Rohr (Innen-Ø 75,8) oder Spitzende in eine HT-Muffe (Außen-Ø 74,4), dann Übergang rund → flach, oben stumpf |
| Zwischenstück(e) | liegend auf der Seitenwand, bei Bedarf um 45° gedreht | Flachkanal, beide Enden stumpf, wird schmaler, wo die Verjüngung durchläuft |
| Steckverbinder (einer je Stoß) | stehend | 30 mm langes Rohrstück mit Rippen, steckt innen im Stoß |
| Oberteil | liegend auf der Seitenwand | Flachkanal, kastenförmiger Bogen und Stutzen ins Gehäuse |

- **Querschnitt:** Die Dicke ist frei wählbar. Die Breite ist voreingestellt
  auf denselben Innenquerschnitt wie das Rohr (39,8 cm²): Bei 25 mm Dicke und
  1,2 mm Wand ergibt das 182 mm außen. Wahlweise geht auch „so breit wie das
  Loch“ oder eine eigene Breite. Innen ist der Kanal ein Rechteck mit kleinen
  Rundungen. Er liegt mit der flachen Rückseite an der Wand.
- **Warum breit, obwohl das Loch eng ist:** Druckverluste addieren sich. Das
  Loch ist ein einmaliger Verlust, der nicht mit der Länge wächst. Reibung
  und Bogen hängen dagegen an der Geschwindigkeit im Kanal. Ein Beispiel mit
  10 m³/h (kleiner Gehäuselüfter), überschlagen: Der 69 × 30-Kanal kommt auf
  etwa 4,2 Pa, der 202 × 25-Kanal auf etwa 2,3 Pa. Davon entfallen etwa
  0,8 Pa auf den Einlauf ins Loch. Ein Stutzen, der ins Gehäuse hineinragt,
  hat einen höheren Einlaufverlust als ein bündig endender. Deshalb steht er
  nur 5 mm tief im Loch.
- **Wände:** Fast das ganze Filament steckt in den Wänden. Sie sind deshalb
  nur 1,2 mm dick, das sind 3 Linien mit einer 0,4-mm-Düse. Infill gibt es
  keins, denn die Wand besteht nur aus Wandlinien. Was dann noch sparen kann,
  ist weniger Fläche: ein schmalerer Kanal oder 0,8-mm-Wände.
- **Stützrippen:** Die Rippen tragen nur Druck zwischen Vorder- und Rückwand.
  Sie sind deshalb 0,8 mm dick (2 Linien). In der Grundeinstellung sind sie
  kurze Stege von 12 mm, von Spalte zu Spalte um eine halbe Teilung versetzt.
  Das spart gegenüber durchgehenden Rippen gut die Hälfte des Rippenmaterials.
  Die Spalten liegen so eng, dass die Wand etwa so steif ist wie 2,4 mm auf
  70 mm Feld. Die Durchbiegung wächst mit Feldbreite⁴ / Wandstärke³, bei
  1,2 mm Wand ergibt das höchstens 42 mm Feld, also 4 Spalten. Jede Spalte
  folgt einer Stromlinie: Sie behält ihren Anteil an der lichten Breite und
  läuft mit der Verjüngung zusammen auf das Loch zu. Keine Rippe endet an der
  schrägen Wand, es entstehen also keine Keile, in denen die Luft steht. Wo
  der schmalere Kanal weniger Spalten braucht, enden überzählige frei in der
  Strömung, dort laufen nur zwei Kanäle zusammen. Erster und letzter Steg
  sitzen genau 15,5 mm vor jedem Stoß, daran stößt der Steckverbinder. Den
  Querschnitt, den die Rippen wegnehmen, gleicht die automatische Breite aus.
- **Filament:** Bei 600 mm Lochhöhe und 120 mm Lochbreite sind es rund
  400 cm³ (≈ 510 g PETG). Mit 0,8-mm-Wänden und 120 mm Kanalbreite sind es
  etwa 235 cm³ (≈ 300 g).
- **Verjüngung:** Ist der Kanal breiter als das Loch, wird er nach der ersten
  Stoß über dem Unterteil allmählich schmaler, über Zwischenstück(e) und
  Oberteil hinweg bis kurz vor den Bogen. Die Steigung beginnt und endet sanft,
  dazwischen ist sie gerade. An den Stößen zwischen liegenden Teilen pausiert
  die Verjüngung für die Länge des Steckverbinders, damit dieser gerade
  bleibt. Jeder Steckverbinder hat deshalb die Breite seines Stoßes. Bei
  600 mm Lochhöhe ist die Verjüngung gut 50 cm lang, an der steilsten Stelle 16°.
  Sie geht nur zu einer Seite, damit die Bettseite beim liegenden Druck gerade
  bleibt. Die schräge Wand wird liegend über die Kanaltiefe (rund 2 cm)
  zwischen Vorder- und Rückwand überbrückt.
- **Übergang:** Der Übergang führt den Kreis über eine Schar abgerundeter
  Rechtecke in den Flachkanal über (Breite, Tiefe und Eckradius werden mit
  einer Smoothstep-Kurve überblendet). Die Rückseite läuft dabei auf die
  Wand zu. Die Länge des Übergangs wird so lange erhöht, bis keine
  Dreiecksfläche mehr als 42° gegen die Senkrechte überhängt.
- **Stöße:** Alle Teile enden stumpf. In jedem Stoß steckt innen ein
  Steckverbinder: 30 mm lang, außen 0,3 mm kleiner als der Kanal innen, mit
  Rippen an denselben Stellen wie die Teile. Seine Rippen stoßen an die
  Rippenenden der Teile und halten ihn so mittig. Früher waren die Stöße
  überlappend: Zunge und Muffe hatten je die halbe Wandstärke. Das zwang zu
  dicken Wänden. Der Steckverbinder engt den Kanal auf 3 cm Länge um 2 × 1,5 mm
  ein, das kostet praktisch nichts.
- **Aufteilung:** Die Länge der flachen Strecke reicht von 10 mm unter der
  Tischplatte bis zur Oberkante des Lochs. Sie wird auf die Teile verteilt:
  Das Unterteil bekommt, was in die Bauhöhe passt. Den Rest teilen sich das
  Oberteil und so wenige Zwischenstücke wie möglich, jeweils bis zur
  Bettdiagonale. Mit 270 mm Bauraum (Snapmaker U1) und 60 cm bis zum Loch
  sind das drei Kanalteile plus zwei Steckverbinder. Zwei Teile reichen erst,
  wenn das Loch höchstens etwa 35 cm über dem Tisch sitzt.

## Prüfung

`core.js` läuft auch in Node. Für jedes Teil wurde geprüft, dass jede Kante
genau zweimal gegenläufig vorkommt (geschlossener Körper), dass das Volumen
positiv ist und dass das Teil in den Bauraum passt. Rippen, Kasten und Rohrstück
sind je eigene geschlossene Körper, die sich überlappen. Der Slicer vereinigt
sie beim Schneiden.

## Noch nicht geprüft

- Der Druck selbst. Offen ist, wie fest die Steckverbindungen mit 0,3 mm
  Spiel sitzen und wie sauber die liegenden Teile die obere Wand überbrücken.
- Wie fest die Rippen den Kanal tatsächlich machen. Gerechnet ist das nicht,
  nur so angelegt, dass die freien Felder höchstens 7 cm breit sind.
- Die Maße der HT-Muffe. Die Werte für das Spitzende sind Normmaße, nicht
  nachgemessen.

Die 3D-Vorschau nutzt three.js r128 (npm `three@0.128.0`, MIT, Lizenz in
`drei/LICENSE`), fest eingebunden aus `drei/three.min.js`; nur wenn die Datei
fehlt, wird cdnjs versucht. Stellt der Browser kein WebGL bereit, zeichnet die
Seite eine einfache Vorschau selbst: Dieselben Teile werden in grober
Auflösung (40 statt 240 Punkte je Querschnitt) perspektivisch projiziert und
von hinten nach vorn gemalt, die Hülle durchscheinend, die Stege kräftig.
Seitenansicht und STL-Export brauchen weder three.js noch WebGL.
