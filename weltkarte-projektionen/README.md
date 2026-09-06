# Grönland schrumpft um 85 Prozent

→ **https://chillchamp1.github.io/lab/weltkarte-projektionen/**

Ein Regler blendet die Weltkarte von Mercator auf ein flächentreues Netz um.
Jedes Land ist danach eingefärbt, wie viel Bildfläche es bekommt, gemessen an
seinem wirklichen Anteil an der Landfläche der Erde. Beim Umblenden läuft die
Farbe aus der Karte heraus — das ist die ganze Aussage in einer Bewegung.

## Welche „UN-Karte"

Der Anstoss war die Frage nach einer Überblendung von Mercator auf „die neue
UN-Karte". Darunter werden mindestens drei verschiedene Karten verstanden:

- **Equal Earth** (2018) — die Karte hinter der „Correct the Map"-Kampagne, die
  seit 2025 den Wechsel weg von Mercator bei UN und Weltbank fordert.
- **Gall-Peters** (1855/1973) — in Deutschland die klassische „UN-Karte":
  Arno Peters, übernommen von UN-Entwicklungsorganisationen und Hilfswerken.
- **Robinson** (1963) — das Kompromissnetz vieler Atlanten und Institutionen.

Die Seite entscheidet sich nicht, sondern lässt alle drei zu. Das kostet nichts:
ausgeliefert wird ein einziger Satz Koordinaten in geografischen Graden, und
jedes weitere Netz ist eine Formel von acht Zeilen. Der interessantere Vergleich
liegt ohnehin zwischen Gall-Peters und Equal Earth — beide flächentreu, und
trotzdem sieht das eine schlecht aus.

Die vierte Kandidatin, die azimutal-äquidistante Polkarte aus dem UN-Emblem,
fehlt bewusst. Sie bricht die Überblendung: der Südpol wird bei ihr zum ganzen
Kartenrand, weshalb schon das Emblem bei 60° Süd aufhört. Ein Ein- und
Ausblenden der Antarktis mitten in der Bewegung wäre mehr Störung als Erkenntnis.

## Die Kennzahl

Nicht der lokale Flächenmassstab (bei Mercator `sec²φ`), sondern der **Anteil an
der gezeigten Landfläche**, geteilt durch den wirklichen Anteil an der
Landfläche der Erde. 1 heisst richtig gross, 2 heisst doppelt so viel Bildfläche
wie zustehend.

Das ist der ehrlichere Massstab, weil er die Frage beantwortet, die man
tatsächlich hat: wie viel Platz auf dem Blatt bekommt ein Land im Vergleich zu
den anderen. Und er fördert eine Pointe zutage, die der reine Massstab
verdeckt — **Deutschland liegt bei 1,06**. Die Mercator-Karte lügt uns nicht
über uns selbst, sondern über die anderen. Für Grönland steht 6,7 und für
Nigeria 0,43.

## Was die Karte sonst noch zeigt

- **Tissot-Indikatrizen**: Kreise gleichen wahren Radius (800 km). Bei Mercator
  bleiben es Kreise, werden aber riesig; bei den flächentreuen Netzen bleibt die
  Fläche gleich und die Form schert. Das ist die Erklärung, die kein Text leistet.
- **Loxodrome gegen Grosskreis**: Mercator ist nicht falsch, sondern für die
  Navigation gebaut — eine Linie konstanten Kompasskurses ist dort eine Gerade.
  Zwei Strecken zeigen, was das kostet und was es einbringt.
- **Gradnetz**, weil man sonst sieht, *dass* sich etwas verschiebt, aber nicht
  *warum*.

## Verfahren

Alle vier Netze sind auf dieselbe **Äquatorlänge** normiert. Sonst mischte sich
in die Überblendung eine blosse Grössenänderung, und das Ergebnis hinge davon
ab, wie man die Karten in den Rahmen einpasst. Die Seitenverhältnisse fallen
dadurch auseinander — Mercator 1,12:1, Gall-Peters 1,57:1, Robinson 1,97:1,
Equal Earth 2,05:1 —, was der Rahmen mit etwas Luft an beiden Enden auffängt.

Die Umrisse liegen **einmal** in geografischen Graden in der Seite. Der Browser
rechnet daraus beim Laden alle vier Netze und interpoliert zwischen ihnen. Das
halbiert gegenüber dem naheliegenden Weg — zwei Sätze fertiger
Bildschirmkoordinaten — nicht nur die Nutzlast, es macht auch das vierte Netz
gratis.

Mercator ist bei **83°** gekappt. Der Flächenmassstab beträgt dort schon das
67-fache, bei 85° das 132-fache. Die Antarktis bleibt trotzdem im Bild; gerade
sie zeigt, was an den Polen passiert. Bei den Anteilen zählt sie nicht mit —
sie hat keine Einwohner, und die klassische Wandkarte schneidet sie ohnehin ab.

Gezeichnet wird auf ein `<canvas>` statt wie in den anderen Projekten hier in
SVG. Bei 97.866 Punkten, die bei jedem Bild neu durch drei Interpolationen
laufen, wäre ein Pfad-Attribut je Land pro Bild rund ein Megabyte Zeichenkette.

Gezeichnet wird ausserdem nicht jeder Punkt. Natural Earth ist an den Küsten
weit feiner, als ein Bildschirm auflösen kann — bei 1000 Punkten Kartenbreite
deckt ein Bildpunkt gut ein Drittel Grad ab. Was enger beieinanderliegt als ein
halber Bildpunkt, wird übersprungen; die Schwelle richtet sich nach der
tatsächlichen Kartenbreite und wird bei jeder Grössenänderung neu bestimmt. Auf
einem grossen Bildschirm bleiben davon 39.000 Punkte übrig und ein Bild kostet
7 Millisekunden, auf einem Telefon 18.000 Punkte und 4 Millisekunden. Am Bild
ist der Unterschied nicht zu sehen: ausgedünnt wird je Ring einzeln, die
Lücken an gemeinsamen Grenzen bleiben unter einem halben Bildpunkt und damit
unter der Strichbreite, mit der die Länder ohnehin gegeneinander abgesetzt sind.

## Proben

- Gall-Peters und Equal Earth sind beide flächentreu und müssen dieselben
  Anteile liefern: grösste Abweichung **0,03 %**.
- Die Flächen sind als Linienintegral auf der Kugel gerechnet, nicht aus einer
  Tabelle übernommen. Gegengerechnet über eine flächentreue Projektion:
  **0,0000 %** Abweichung. Gegen die amtlichen Werte liegt das Ergebnis rund
  1 % daneben, was die Generalisierung der Umrisse ist, nicht das Verfahren.
- In allen Zwischenzuständen aller drei Ziele bleibt die Karte im Rahmen;
  geprüft wurde der Abstand zum Rand bei jedem Viertelschritt.

## Daten

**Geometrie und Einwohnerzahlen** — [Natural Earth](https://www.naturalearthdata.com/),
`ne_50m_admin_0_countries`: 242 Staaten und Gebiete, 97.866 Punkte, deutsche
Ländernamen aus dem Feld `NAME_DE`. Gemeinfrei. Die Einwohnerzahlen
(`POP_EST`) stammen überwiegend aus dem Stand 2019 und sind nur grob.

## Neu bauen

Die Skripte in `build/` erzeugen die `index.html`. Sie laden nichts herunter;
die Quelldatei muss daneben liegen. Kein npm, keine Abhängigkeiten.

```
cd build && node build.mjs > ../index.html
```

Welche Rohdaten daneben liegen müssen, steht in [build/DATEN.md](build/DATEN.md).
