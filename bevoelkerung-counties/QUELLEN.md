# Quellen

Stand: 15. September 2026. Jede Zeile ist selbst geprüft — die Datei wurde
geöffnet, gelesen und nachgerechnet. Wo ein Klickweg beschrieben ist, stammt er
aus einem Browser ausserhalb dieser Arbeitsumgebung; die Oberfläche selbst habe
ich nie gesehen. Die **Zahlen** dagegen sind hier durchgerechnet.

## 1. Die Zeitpunkte

Dreizehn Volkszählungen. Der Zähltag wandert und steht deshalb in jeder Zeile
der Tabelle, statt aufs Jahr gerundet zu werden.

| Bild | Stichtag | Gebiete mit Zahl | von 3 108 |
|---|---|---|---|
| 1900 | 1. Juni 1900 | 2 818 | 90,7 % |
| 1910 | 15. April 1910 | 2 943 | 94,7 % |
| 1920 | 1. Januar 1920 | 3 059 | 98,4 % |
| 1930 | 1. April 1930 | 3 089 | 99,4 % |
| 1940 | 1. April 1940 | 3 089 | 99,4 % |
| 1950 | 1. April 1950 | 3 093 | 99,5 % |
| 1960 | 1. April 1960 | 3 096 | 99,6 % |
| 1970 | 1. April 1970 | 3 102 | 99,8 % |
| 1980 | 1. April 1980 | 3 105 | 99,9 % |
| 1990 | 1. April 1990 | 3 107 | 100,0 % |
| 2000 | 1. April 2000 | 3 107 | 100,0 % |
| 2010 | 1. April 2010 | 3 108 | 100 % |
| 2020 | 1. April 2020 | 3 108 | 100 % |

Was fehlt, fehlt nicht, weil dort niemand wohnte, sondern weil es das County
damals noch nicht gab. Die Menschen stehen im Vorgänger.

## 2. Benutzt

**NHGIS — IPUMS National Historical Geographic Information System.** Steven
Manson, Jonathan Schroeder, David Van Riper u. a., University of Minnesota.
Zeitreihentabelle **A00 „Total Population"** auf County-Ebene, 1790 bis 2020,
**nominal integriert** — Einheiten werden über Namen und Code zusammengeführt,
Grenzänderungen bleiben unkorrigiert. Kostenloses Konto nötig, Zitierpflicht
liegt dem Auszug als Codebuch bei. 56 088 Zeilen; davon werden die dreizehn
Zählungen ab 1900 benutzt.

**Forstall — Population of Counties by Decennial Census: 1900 to 1990.**
Richard L. Forstall, U.S. Bureau of the Census, 1996. CSV-Fassung des National
Bureau of Economic Research. Gemeinfrei, kein Konto. Füllt, was NHGIS nicht hat:
die Territorien, die 1900 noch keine Bundesstaaten waren, und den District of
Columbia, den NHGIS ausgerechnet für 1900 auslässt. 119 Zellen.

**Geometrie — us-atlas 3.0.1.** TopoJSON der kartografischen Grenzdateien des
US Census Bureau, generalisiert auf 1:10 000 000. Gebietsstand zwischen 2015 und
2022: Oglala Lakota County trägt schon die Kennziffer 46102, Connecticut noch
seine acht Countys statt der neun Planungsregionen von 2022. 3 231 Gebiete, davon
**3 108** auf dieser Karte.

## 3. Geprüft, aber nicht benutzt

| Quelle | Warum nicht |
|---|---|
| NHGIS **CL8**, Gebietsstand 2010 | Deckt nur 1990–2020 ab. Dient als Eichmass für die Prüfung, nicht als Datenquelle. |
| ICPSR 2896 (Haines) | Nur für Mitgliedsinstitutionen zugänglich, endet 2002. |
| Census-Schätzreihe `co-est2025` | Würde ein vierzehntes Bild für 2025 geben. Liegt noch nicht vor; ausserdem führt sie Connecticut als neun Planungsregionen und braucht dafür die Gemeindezahlen. |

## 4. Nicht zu bekommen

Aus dieser Arbeitsumgebung antworten `www2.census.gov`, `www.census.gov`,
`api.census.gov`, `data2.nhgis.org`, `www.nhgis.org` und `data.nber.org` mit
403 beim CONNECT — nachgemessen am 14. September 2026 über die Shell und über
`WebFetch`. Alle vier Rohdateien sind deshalb von Hand hereingereicht worden.

## 5. Was die Prüfung ergeben hat

Der vollständige Bericht liegt in
[`bevoelkerung-kreise/build/pruefung/usa/bericht.md`](../bevoelkerung-kreise/build/pruefung/usa/bericht.md).
Die vier Kernzahlen:

| Probe | Ergebnis |
|---|---|
| Bilanz 1900 | Countys + Territorien + DC = 75 994 575, **Differenz 0** zur amtlichen Zahl |
| Bilanz 2020 | Karte + Alaska + Hawaii = 331 449 281, **Differenz 0** |
| Countysumme gegen Staatszeile | dreizehn Bilder, **fünf** Abweichungen von je genau einer Person |
| NHGIS gegen Forstall | **zehn** Abweichungen in **30 451** Vergleichen, alle zehn benannt |
