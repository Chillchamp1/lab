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
| Unterteil | stehend, runder Anschluss unten | Muffe über das abgesägte Rohr (Innen-Ø 75,8) oder Spitzende in eine HT-Muffe (Außen-Ø 74,4), dann Übergang rund → flach, oben eine Steckzunge |
| Zwischenstück(e) | liegend auf der Seitenwand, bei Bedarf um 45° gedreht | gerader Flachkanal, Muffen an beiden Enden |
| Steckverbinder | stehend | kurzes Rohrstück in Zungenform, verbindet zwei liegende Teile |
| Oberteil | liegend auf der Seitenwand | Muffe, Flachkanal, kastenförmiger Bogen und Stutzen ins Gehäuse |

- **Querschnitt:** Die Dicke ist frei wählbar. Die Breite ist voreingestellt
  auf denselben Innenquerschnitt wie das Rohr (39,8 cm²): Bei 25 mm Dicke und
  2,4 mm Wand ergibt das 202 mm außen. Wahlweise geht auch „so breit wie das
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
- **Verjüngung im Oberteil:** Ist der Kanal breiter als das Loch, verjüngt
  sich das Oberteil nach der Muffe auf die Lochbreite. Das geschieht nur
  einseitig, damit die Bettseite beim liegenden Druck gerade bleibt. Die
  schräge Wand steht etwa 49° steil.
- **Übergang:** Der Übergang führt den Kreis über eine Schar abgerundeter
  Rechtecke in den Flachkanal über (Breite, Tiefe und Eckradius werden mit
  einer Smoothstep-Kurve überblendet). Die Rückseite läuft dabei auf die
  Wand zu. Die Länge des Übergangs wird so lange erhöht, bis keine
  Dreiecksfläche mehr als 42° gegen die Senkrechte überhängt.
- **Steckverbindungen:** Die Steckverbindungen sind überlappend gestoßen.
  Zunge und Muffe haben je die halbe Wandstärke abzüglich des Spiels, so
  bleiben Kanal innen und außen bündig. Am Muffengrund sitzt eine 45°-Fase,
  damit auch liegend gedruckte Muffen ohne Stützen gehen. Liegende Teile
  haben keine Zungen, weil eine Zunge dort frei über dem Bett hinge. Darum
  gibt es den Steckverbinder.
- **Aufteilung:** Die Länge der flachen Strecke reicht von 10 mm unter der
  Tischplatte bis zur Oberkante des Lochs. Sie wird auf die Teile verteilt:
  Das Unterteil bekommt, was in die Bauhöhe passt. Den Rest teilen sich das
  Oberteil und so wenige Zwischenstücke wie möglich, jeweils bis zur
  Bettdiagonale. Mit 270 mm Bauraum (Snapmaker U1) und 60 cm bis zum Loch
  sind das drei Kanalteile plus ein Steckverbinder. Zwei Teile reichen erst,
  wenn das Loch höchstens etwa 35 cm über dem Tisch sitzt.

## Prüfung

`core.js` läuft auch in Node. Für jedes Teil wurde geprüft, dass jede Kante
genau zweimal gegenläufig vorkommt (geschlossener Körper), dass das Volumen
positiv ist und dass das Teil in den Bauraum passt. Das Oberteil besteht aus
zwei sich überlappenden geschlossenen Körpern, der Muffe und dem Kasten. Der
Slicer vereinigt sie beim Schneiden.

## Noch nicht geprüft

- Der Druck selbst. Offen ist, wie fest die Steckverbindungen mit 0,3 mm
  Spiel sitzen und wie sauber die liegenden Teile die obere Wand überbrücken.
- Die Maße der HT-Muffe. Die Werte für das Spitzende sind Normmaße, nicht
  nachgemessen.

Die 3D-Vorschau lädt three.js (r128) von cdnjs. Seitenansicht und STL-Export
gehen ohne.
