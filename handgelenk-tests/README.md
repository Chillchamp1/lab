# Handgelenktests in 3D

Zwölf klinische Handgelenktests, Schritt für Schritt an einem 3D-Modell: eine sitzende Figur, deren rechter
Unterarm und Hand ein Knochen- und Hautmodell sind. Die Seite selbst ist auf Englisch.

**Kein Diagnosewerkzeug.** Schematisch und vereinfacht, nicht maßstäblich. Alle Belastungswerte sind erfundene
Faustwerte zur Anschauung, keine Messungen.

## Was man sieht

- Tests nach Gruppen: TFCC / ulnare Seite, DRUJ, ECU, Midkarpalgelenk, Karpalbänder (SL, LT), Beighton-Score.
- Je Test eine Ampel in drei Stufen: selbst probieren · Vorsicht (Last oder Partner) · nur Untersucher.
- Zeitleiste mit einer Farbe je Abschnitt, mit der Maus oder dem Finger hin- und herziehbar. Abspielen wiederholt
  nur den aktuellen Abschnitt; ⏮ ⏭ wechseln den Abschnitt.
- Die Anweisung zum aktuellen Abschnitt steht im 3D-Bild: ein Kasten in der Ecke, die vom Körper weg zeigt, mit
  einer Zeigerlinie zu der Stelle, um die es im Abschnitt geht.
- Kraftpfeile, Fingerauflagen des Untersuchers, Halteringe („held fixed“), Auflageflächen (Tisch, Sitz),
  Schmerzzonen bei positivem Befund.
- Darstellung umschaltbar: Haut · Röntgen · Knochen. Die Ansicht dreht immer um das Handgelenk.
- Reiter „Exercises“: neun Kräftigungsübungen für Handgelenk und Unterarm, Schwerpunkt lockeres (hypermobiles)
  Handgelenk. Erst Halten ohne Bewegung gegen die eigene Hand, dann leichte Last. Die Gegenstände (Hantel, Hammer,
  weicher Ball, halbvolle Flasche) sind aus Grundformen gebaut und liegen in der Faust. Je Übung: was sie trainiert,
  was man braucht, wie viel, wie man steigert, wann man nachlässt, und die Quellen.
- Reiter „Explore“: freie Haltung, Last, Hypermobilität, äußere Stützen (DRUJ-Band, Pisiforme-Lift,
  Karpalwickel) mit eingefärbter Belastung der Bänder und Sehnen.

## Quellen und Lizenz

- Knochen und Haut: **BodyParts3D**, © The Database Center for Life Science, lizenziert unter
  CC Attribution-Share Alike 2.1 Japan (https://dbarchive.biosciencedbc.jp/en/bodyparts3d/). Die abgeleiteten
  Netze in `assets/*.glb` stehen unter derselben Lizenz. Verwendet wird die zu 99 % reduzierte OBJ-Fassung,
  im Bau einmal geglättet (Loop-Unterteilung).
- Testbeschreibungen: `build/src/model/wrist-tests.json`. Jeder Test nennt seine Quellen (Erstbeschreibung oder die
  meistzitierte Arbeit, mit DOI-Link): im Kasten im 3D-Bild in Kurzform, in der Karte zum Test als volles Zitat.
  Die Schritte auf der Seite sind vereinfacht. Zwei Quellen sind nur über spätere Übersichtsarbeiten zugeordnet:
  der Supination-Lift-Test (Buterbaugh 1998) und das Klaviertastenzeichen (Cooney, Linscheid, Dobyns 1998).
- Die Figur ist eine Gliederpuppe aus Grundformen mit üblichen Erwachsenenproportionen, kein gescannter Mensch.

## Bekannte Grenzen

- Ansatzpunkte der Bänder und Sehnen sind grob gesetzt und auf die Knochenoberfläche geschnappt, nicht einzeln geprüft.
- Die Karpalkinematik ist ein Zwei-Drehpunkt-Modell (radiokarpal, midkarpal) mit kleinen Zusatzbewegungen;
  echte Handwurzelknochen bewegen sich gekoppelt in sechs Freiheitsgraden.
- Sätze und Wiederholungen der Übungen sind übliche Startwerte aus der Handtherapie, keine Verordnung. Die Quellen
  stützen das Prinzip der jeweiligen Übung; nur wo es dabeisteht, stammt die Übung selbst aus einer Studie.
- Der zweite Mensch (Partner, Untersucher) erscheint nur als Ringe, Auflagen und Pfeile.
- Oberfläche und Texte bisher nur auf Englisch.

## Bauen

Der Quellcode liegt in [`build/`](build/README.md) (Vite, TypeScript, React, three.js). Die Seite hier ist das
Bauergebnis:

```bash
cd handgelenk-tests/build
npm install
npm run lab
```

`npm run lab` baut und kopiert `index.html` und `assets/` in diesen Ordner. Die Rohdaten von BodyParts3D
(62 MB) liegen nicht im Repo; `build/README.md` beschreibt, wie man sie holt und die Knochen neu erzeugt.
