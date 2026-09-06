# 312 zu 226, entschieden in 3 Staaten

→ **https://chillchamp1.github.io/lab/usa-wahlleute-2024/**

Die US-Präsidentschaftswahl 2024 nach Wahlleuten. Ein Regler verzieht die Karte
von der Fläche zu ihrer Zahl, ein Abspiel-Knopf lässt den Übergang in Schleife
laufen. Die Bundesstaaten sind beschriftet, weil bei 51 Gebieten die
Orientierung sonst verloren geht.

## Was die Karte zeigt

Nicht die Stimmen wählen den Präsidenten, sondern die Wahlleute. Landesweit
trennt beide Bewerber **1,5 Punkte**, im Gremium sind es **312 zu 226**.

Und die Mehrheit war schmal: hätten die **drei knappsten Staaten** anders
entschieden — Wisconsin (0,87 Punkte), Michigan (1,44) und Pennsylvania (1,73),
zusammen 44 Wahlleute — wäre Trump auf 268 gefallen und damit unter die
nötigen 270.

Das ist eine Ablesung, keine Prognose. Es sagt, wie schmal die Mehrheit war,
nicht wie wahrscheinlich ein anderer Ausgang gewesen wäre.

## Woher die Wahlleutezahlen kommen

Nicht aus einer abgetippten Tabelle, sondern abgeleitet: **Sitze im
Repräsentantenhaus plus zwei Senatoren.** Die Sitze ergeben sich aus der Zahl
der Wahlbezirke des 119. Kongresses — der Kammer, die im November 2024 gewählt
wurde. Die Bezirksdatei des Census enthält 436 Einträge; einer davon ist der
Delegiertenbezirk von Washington DC, das keine Sitze im Haus hat. Bleiben 435.
DC bekommt drei Wahlleute, festgelegt durch den 23. Verfassungszusatz.

435 + 100 + 3 = **538.** Die Rechnung geht auf, und damit ist die Ableitung
geprüft.

## Maine und Nebraska

Beide vergeben je zwei Wahlleute an den Landessieger und die übrigen einzeln an
die Sieger ihrer Wahlbezirke. Die Karte färbt sie nach dem Landesergebnis, zeigt
sie also einfarbig, obwohl beide 2024 gesplittet haben.

Auf die Gesamtzahl wirkt sich das nicht aus: Maine gab einen Wahlmann an Trump
ab, Nebraska einen an Harris — das hebt sich auf. Deshalb stimmt 312 zu 226
trotz der vereinfachten Färbung. Wollte man die Splits auch zeichnen, bräuchte
es Ergebnisse auf Ebene der Wahlbezirke; die liegen hier nicht vor.

## Verfahren

Diffusionskartogramm nach Gastner und Newman (2004) auf flächentreuer
Albers-Projektion — dieselbe Technik wie bei der
[Countykarte](../usa-wahl-2024/). Bei 51 Gebieten konvergiert es leicht:
Flächenabweichung im Median 0,08 Prozent, im Maximum 0,5 Prozent, keine
gefalteten Ringe.

Alaska und Hawaii sind je ein einziges Gebiet; ihr Kartogramm ist deshalb eine
reine Skalierung um den Schwerpunkt und exakt. Beim Übergang bewegt sich nur
Alaska — es schrumpft auf ein Sechstel seiner Kantenlänge.

## Die Farben

Dieselbe wahrnehmungsgleiche Skala wie bei der Countykarte: in OKLab
konstruiert, an beiden Enden gleiche Helligkeit und Buntheit, neutrale graue
Mitte.

Ein Unterschied ist wichtig. Bei der Countykarte folgt die Fläche der
Wählerschaft, und deshalb entspricht die Farbmenge fast dem Landesergebnis.
Hier folgt die Fläche den **Wahlleuten**, und die verteilen sich nicht
proportional zu den Stimmen — die Farbmenge sagt also bewusst *nicht* das
Ergebnis. Genau diese Lücke ist der Gegenstand der Karte.

## Daten

- **Staatsgrenzen und Wahlbezirke** — US Census Bureau, Grenzdateien 2024
- **Wahlergebnisse** — [tonmcg/US_County_Level_Election_Results_08-24](https://github.com/tonmcg/US_County_Level_Election_Results_08-24), je Staat aufsummiert

In den USA führt keine Bundesbehörde die Wahlergebnisse zusammen; die Ergebnisse
stammen daher aus einer gepflegten Sammlung, die Geometrie ist amtlich.

## Neu bauen

```
cd build && node build.mjs > ../index.html
```

Welche Rohdaten daneben liegen müssen, steht in [build/DATEN.md](build/DATEN.md).
