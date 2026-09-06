# 164 zu 1 für eine neue Weltkarte

→ **https://chillchamp1.github.io/lab/weltkarte-projektionen/**

Am 4. September 2026 hat die UN-Vollversammlung auf Antrag Togos, eingebracht
für die afrikanischen Mitgliedstaaten, die Resolution „Correct the Map"
angenommen: 164 Stimmen dafür, eine dagegen, sechs Enthaltungen. Diese Seite
zeigt, was der Beschluss praktisch bedeutet.

Ein Regler blendet die Weltkarte von Mercator auf ein flächentreues Netz um.
Jedes Land ist danach eingefärbt, wie viel Bildfläche es bekommt, gemessen an
seinem wirklichen Anteil an der Landfläche der Erde. Beim Umblenden läuft die
Farbe aus der Karte heraus — das ist die ganze Aussage in einer Bewegung.

## Welches Netz die UN meint

Die Resolution heisst vollständig *„Correct the Map: Rebalancing global
cartographic representation and promoting equitable representation of the
world's regions, particularly Africa"*. Sie ist **nicht bindend** und verbietet
Mercator nicht, sondern ruft Regierungen, Schulen, Organisationen und
Technikkonzerne dazu auf, flächentreue Karten zu benutzen, wo es auf
Grössenverhältnisse ankommt — namentlich **Equal Earth**, entwickelt 2018 von
Šavrič, Patterson und Jenny. Dagegen stimmten die Vereinigten Staaten als
einziges Land; enthalten haben sich Estland, Georgien, Litauen, Moldau,
Serbien und die Ukraine.

Equal Earth ist deshalb das voreingestellte Zielnetz. Zwei weitere stehen zum
Vergleich daneben, und beide haben einen Grund:

- **Gall-Peters** (1855/1973) ist genauso flächentreu und in Deutschland als
  „Peters-Karte" von UN-Entwicklungsorganisationen und Hilfswerken bekannt. In
  der Anteilstabelle steht es deshalb in derselben Spalte wie Equal Earth —
  und sieht trotzdem völlig anders aus. Das ist der Beweis dafür, dass
  „flächentreu" die Form noch nicht festlegt, und die beste Begründung dafür,
  warum die Resolution ein bestimmtes Netz nennt und nicht nur eine
  Eigenschaft fordert.
- **Robinson** (1963) ist das Kompromissnetz vieler Atlanten und gehört
  ausdrücklich *nicht* dazu. Es ist nicht flächentreu und bleibt in den Zahlen
  auf halbem Weg stehen — Grönland behält dort noch das 1,6-fache seines
  Anteils statt des 6,7-fachen bei Mercator.

Mercator selbst hat einen eigenen Knopf: es ist der Ausgangszustand, und man
muss zurückkönnen.

Nicht dabei ist die azimutal-äquidistante Polkarte aus dem UN-Emblem. Sie hat
mit dem Beschluss nichts zu tun und bricht ausserdem die Überblendung: der
Südpol wird bei ihr zum ganzen Kartenrand, weshalb schon das Emblem bei 60°
Süd aufhört.

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

- **Verzerrungskreise** (Tissot-Indikatrizen): Kreise gleichen wahren Radius
  (800 km). Sie sind die eigentliche Antwort auf die Frage, was Mercator besser
  kann. Dort bleibt jeder ein Kreis und wird nur grösser — gleich stark gedehnt
  in alle Richtungen, also bleiben Winkel und örtliche Form erhalten. Auf einem
  flächentreuen Netz sind alle gleich gross und zu Ellipsen geschert. Ein
  mitlaufender Satz unter der Karte sagt, was gerade zu sehen ist.
- **Zwei Flugstrecken**, Loxodrome gegen Grosskreis: die praktische Folge
  daraus. Weil Winkel stimmen, ist eine Linie konstanten Kompasskurses auf
  Mercator eine Gerade — nachgemessen weicht sie um **0,00 %** der
  Streckenlänge ab, für jede beliebige Strecke. Der Bogen, den man sieht, ist
  immer der kürzeste Weg, der auf Mercator um 10 bis 31 % ausholt. Umgekehrt
  gilt es nicht: auf Equal Earth wird er nicht gerade, nur weniger krumm
  (10 bis 18 %). Dafür bräuchte es ein gnomonisches Netz.

  Die beiden Linien werden **auf der Karte selbst beschriftet**, nicht in einer
  Legende darunter. Zwei Linien, die einander ähnlich sehen, und eine Erklärung
  drei Zeilen weiter unten — daran springt der Blick hin und her, und man weiss
  am Ende trotzdem nicht, welcher Bogen welcher ist.
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
