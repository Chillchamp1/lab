# Stärkste Partei, Bundestagswahl 2025

→ **https://chillchamp1.github.io/lab/wahlkarte-2025/**

431 Gebiete, jedes in der Farbe der Partei mit den meisten Zweitstimmen. Ein Regler
verzieht die Karte stufenlos zwischen Landkarte und flächentreuem Kartogramm.
Zusätzliche Abschnitte: Parteien im Spektrum, wo die Grünen führen, wer Zweiter
wird, und die knappsten Gebiete.

Eine einzelne `index.html` ohne externe Abhängigkeiten — Geometrie, Daten und
Logik stecken inline. Läuft offline, per Doppelklick, überall.

## Gebietsauflösung

Für den größten Teil Deutschlands liegen die Zweitstimmen auf Ebene der
Gemeindeverbände vor und werden zu Kreisen zusammengefasst. In Städten, für die
nur Wahlkreisergebnisse existieren, ist der Wahlkreis die Einheit. Beides zusammen
deckt die Fläche lückenlos und überschneidungsfrei ab — anders als bei einer reinen
Kreiskarte muss kein Wert auf ein Gebiet übertragen werden, das er nicht abdeckt.

Zwei Ausnahmen bleiben: der Wahlkreis Gelsenkirchen umfasst zusätzlich Gladbeck,
der Wahlkreis Dresden II einen Teil des Landkreises Bautzen. Beide Male ist der
Wert der des ganzen Wahlkreises, gezeichnet ist nur der städtische Teil.

## Kartogramm

Flächentreues Kartogramm nach Dougenik, Chrisman und Niemeyer (1985), jede Insel
eines Gebiets mit eigenem Kraftzentrum. Verbleibende Flächenabweichung im Median
unter einem Promille, im Maximum ein Prozent.

Beide Zustände benutzen dieselben 33.342 Stützpunkte; Punkte gleicher Ausgangslage
sind zu einem Knoten verschweißt, damit gemeinsame Grenzen beim Verziehen gemeinsam
bleiben.

## Daten

- **Zweitstimmen und Flächengeometrie** — Wahlnacht-Datensatz von Zeit Online,
  25. Februar 2025. Vorläufige Zahlen: in sehr knappen Gebieten kann die Führung
  im amtlichen Endergebnis anders ausfallen.
- **Einwohnerzahlen** — Gemeindeverzeichnis des Statistischen Bundesamts
  (Stand 31.12.2018), innerhalb geteilter Städte nach Wahlberechtigten aufgeteilt.

CDU und CSU sind zusammengefasst.
