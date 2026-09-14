# Prüfbericht USA — Bevölkerung der Countys, 1900 bis 2020

Erzeugt von `build/pruefung/usa/pruefe.mjs`. Jede Zahl hier ist gerechnet,
keine übernommen — ausser den beiden amtlichen Vergleichswerten, die als
solche gekennzeichnet sind.

Quelle: NHGIS-Zeitreihentabellen **A00** (nominal integriert, 1790–2020) und
**CL8** (Gebietsstand 2010, 1990–2020), je auf County- und Staatsebene.
Gebiet: die Lower 48 und der District of Columbia.

| Datei | Zeilen |
|---|---|
| `nhgis0001_ts_nominal_county.csv` | 56.088 |
| `nhgis0001_ts_nominal_state.csv` | 1.034 |
| `nhgis0001_ts_geog2010_county.csv` | 12.572 |

## 1. Abdeckung je Bild

Wie viele der 3.108 heutigen Gebiete haben in diesem Bild eine Zahl.
Eine fehlende Zeile heisst nicht „niemand da", sondern „diesen Kreis gab es
damals nicht" — die Menschen stehen im Vorgänger.

| Bild | mit Zahl | ohne | Anteil ohne |
|---|---|---|---|
| 1900 | 2.755 | 353 | 11.4 % |
| 1910 | 2.894 | 214 | 6.9 % |
| 1920 | 3.051 | 57 | 1.8 % |
| 1930 | 3.084 | 24 | 0.8 % |
| 1940 | 3.084 | 24 | 0.8 % |
| 1950 | 3.088 | 20 | 0.6 % |
| 1960 | 3.092 | 16 | 0.5 % |
| 1970 | 3.100 | 8 | 0.3 % |
| 1980 | 3.103 | 5 | 0.2 % |
| 1990 | 3.105 | 3 | 0.1 % |
| 2000 | 3.106 | 2 | 0.1 % |
| 2010 | 3.107 | 1 | 0.0 % |
| 2020 | 3.108 | 0 | 0.0 % |

## 2. Was ohne heutigen Schlüssel dasteht

Einheiten, die es heute nicht mehr gibt, führen in NHGIS **kein** `COUNTYFP`,
teils nicht einmal ein `STATEFP` — die Territorien vor ihrer Staatswerdung
etwa. Sie tragen Menschen, die auf dem Gebiet der heutigen Karte gelebt haben.
Wer sie wegfiltert, verliert sie lautlos. Hier stehen sie.

| Bild | Zeilen | Menschen | Anteil am Bild | Beispiele |
|---|---|---|---|---|
| 1900 | 85 | 1.185.986 | 1.57 % | Arizona Territory, Georgia, Indian Territory, Minnesota |
| 1910 | 47 | 607.950 | 0.66 % | Arizona Territory, Georgia, New Mexico Territory, South Dakota |
| 1920 | 2 | 18.594 | 0.02 % | Georgia |
| 1930 | 3 | 24.490 | 0.02 % | Georgia, Virginia |
| 1940 | 2 | 8.038 | 0.01 % | Idaho, Virginia |
| 1950 | 2 | 10.434 | 0.01 % | Idaho, Virginia |
| 1960 | 1 | 22.035 | 0.01 % | Virginia |
| 1970 | 0 | 0 | 0 % | — |
| 1980 | 0 | 0 | 0 % | — |
| 1990 | 0 | 0 | 0 % | — |
| 2000 | 0 | 0 | 0 % | — |
| 2010 | 0 | 0 | 0 % | — |
| 2020 | 0 | 0 | 0 % | — |

## 3. Bilanz — geht die Summe auf?

Die schärfste Probe, die ohne zweite Quelle möglich ist: alles zusammenzählen,
was auf dem Gebiet liegt, und gegen die veröffentlichte Gesamtzahl halten.

**1900**

| Posten | Menschen |
|---|---|
| Countys mit heutigem Schlüssel | 74.529.871 |
| Einheiten ohne heutigen Schlüssel | 1.185.986 |
| District of Columbia — Staatszeile ohne County-Zeile | 278.718 |
| **Summe auf der Karte** | **75.994.575** |
| amtlich (Vereinigte Staaten 1900 ohne Alaska und Hawaii) | 75.994.575 |
| **Differenz** | **0** |

**2020**

| Posten | Menschen |
|---|---|
| Countys mit heutigem Schlüssel | 329.260.619 |
| Einheiten ohne heutigen Schlüssel | 0 |
| **Summe auf der Karte** | **329.260.619** |
| Alaska — Bundesstaat, nicht auf der Karte | 733.391 |
| Hawaii — Bundesstaat, nicht auf der Karte | 1.455.271 |
| **Summe mit ihnen** | **331.449.281** |
| amtlich (Vereinigte Staaten 2020, Wohnbevölkerung) | 331.449.281 |
| **Differenz** | **0** |

## 4. Gegenprobe: Countysumme gegen die Staatszeile

Beide Zahlen kommen aus demselben Auszug. Weichen sie ab, ist die Tabelle in
sich uneins — dann taugt keine der beiden.

| Bild | Staaten | Abweichungen | grösste |
|---|---|---|---|
| 1900 | 46 | 0 | — |
| 1910 | 47 | 0 | — |
| 1920 | 49 | 2 | -1 (New York) |
| 1930 | 49 | 0 | — |
| 1940 | 49 | 0 | — |
| 1950 | 49 | 1 | -1 (California) |
| 1960 | 49 | 2 | -1 (Ohio) |
| 1970 | 49 | 0 | — |
| 1980 | 49 | 0 | — |
| 1990 | 49 | 0 | — |
| 2000 | 49 | 0 | — |
| 2010 | 49 | 0 | — |
| 2020 | 49 | 0 | — |

Im Einzelnen:

| Bild | Staat | Summe der Countys | Staatszeile | Differenz |
|---|---|---|---|---|
| 1920 | New York | 10.385.227 | 10.385.228 | -1 |
| 1920 | Pennsylvania | 8.720.017 | 8.720.018 | -1 |
| 1950 | California | 10.586.223 | 10.586.224 | -1 |
| 1960 | Ohio | 9.706.397 | 9.706.398 | -1 |
| 1960 | Texas | 9.579.677 | 9.579.678 | -1 |

## 5. Eichprobe: nominal gegen standardisiert

CL8 rechnet 1990 bis 2020 auf den Gebietsstand 2010. Für diese vier Bilder
gibt es also eine bekannt richtige Antwort. Was A00 davon abweicht, ist genau
der Preis der nominalen Integration — gemessen, nicht geschätzt.

| Bild | gemeinsam | Median | > 100 Pers. | > 1 % | > 5 % | grösste |
|---|---|---|---|---|---|---|
| 1990 | 3.107 | 0.0 | 53 | 14 | 4 | 34.3 % (Alleghany County, Virginia) |
| 2000 | 3.108 | 0.0 | 44 | 7 | 2 | 33.2 % (Alleghany County, Virginia) |
| 2010 | 3.109 | 0.0 | 0 | 0 | 0 | — |
| 2020 | 3.107 | 0.0 | 82 | 7 | 1 | 7.9 % (Bedford County, Virginia) |

2010 muss punktgleich sein — CL8 ist *auf* 2010 gerechnet. Dass es das ist,
prüft die Probe gleich mit.

## 6. Gegenprobe: NHGIS gegen Forstall

Richard L. Forstalls Zusammenstellung „Population of Counties by Decennial
Census: 1900 to 1990", vom NBER in CSV gegossen. Zwei **unabhängig**
erstellte Zusammenstellungen derselben Zählungen: wo sie auseinandergehen,
ist mindestens eine falsch, und wir erfahren es, statt es zu glauben. Das ist
dieselbe Konstruktion, die bei den deutschen Kreisen am meisten getaugt hat.

| Bild | beide | gleich | ungleich | nur Forstall | nur NHGIS | grösste Differenz |
|---|---|---|---|---|---|---|
| 1900 | 2.763 | 2.761 | 2 | 64 | 1 | 3.827 (Nansemond, Virginia) |
| 1910 | 2.903 | 2.900 | 3 | 50 | 4 | 7.008 (Nansemond, Virginia) |
| 1920 | 3.061 | 3.059 | 2 | 6 | 2 | 6.138 (Elizabeth City, Virginia) |
| 1930 | 3.097 | 3.096 | 1 | 4 | 1 | 1 (Fremont County, Idaho) |
| 1940 | 3.097 | 3.097 | 0 | 2 | 1 | — |
| 1950 | 3.100 | 3.100 | 0 | 2 | 1 | — |
| 1960 | 3.102 | 3.102 | 0 | 2 | 1 | — |
| 1970 | 3.108 | 3.108 | 0 | 0 | 0 | — |
| 1980 | 3.109 | 3.107 | 2 | 0 | 0 | 209 (Park County, Montana) |
| 1990 | 3.111 | 3.111 | 0 | 0 | 0 | — |

**10 Abweichungen in 30.451 Vergleichen.** Jede einzelne:

| Bild | Gebiet | Forstall | NHGIS | Differenz |
|---|---|---|---|---|
| 1910 | `51123` Nansemond, Virginia | 19.878 | 26.886 | -7.008 |
| 1920 | `51055` Elizabeth City, Virginia | 19.111 | 25.249 | -6.138 |
| 1910 | `51055` Elizabeth City, Virginia | 15.720 | 21.225 | -5.505 |
| 1900 | `51123` Nansemond, Virginia | 19.251 | 23.078 | -3.827 |
| 1910 | `51095` James City County, Virginia | 3.624 | 6.338 | -2.714 |
| 1920 | `51095` James City County, Virginia | 3.676 | 6.138 | -2.462 |
| 1900 | `38059` Morton County, North Dakota | 10.277 | 8.069 | 2.208 |
| 1980 | `30067` Park County, Montana | 12.869 | 12.660 | 209 |
| 1980 | `30113` Yellowstone National Park, Montana | 66 | 275 | -209 |
| 1930 | `16043` Fremont County, Idaho | 9.924 | 9.925 | -1 |

Was Forstall zusätzlich abdeckt, schliesst die Lücken aus Abschnitt 1 nur
teilweise:

| Bild | Lücke mit NHGIS allein | mit Forstall dazu | geschlossen |
|---|---|---|---|
| 1900 | 353 | 294 | 59 |
| 1910 | 214 | 169 | 45 |
| 1920 | 57 | 53 | 4 |
| 1930 | 24 | 23 | 1 |
| 1940 | 24 | 23 | 1 |
| 1950 | 20 | 19 | 1 |
| 1960 | 16 | 15 | 1 |
| 1970 | 8 | 8 | 0 |
| 1980 | 5 | 5 | 0 |
| 1990 | 3 | 3 | 0 |

Forstall trägt die Territorien mit heutigen Kennziffern und hat für 1900 auch
den District of Columbia, den NHGIS dort auslässt. Die grosse Lücke bleibt
aber: Countys, die es 1900 noch nicht gab, hat auch Forstall nicht.

## 7. Die Lücken, benannt

Ab 1930 sind es wenige genug, um jede einzeln hinzuschreiben. Das ist der
Unterschied zwischen „gelb" und „rot": eine benannte Liste lässt sich abarbeiten.

**1930** — 24 Gebiete ohne Zeile:

- `04012` La Paz County, Arizona
- `08014` Broomfield County, Colorado
- `12086` Miami-Dade County, Florida
- `32510` Carson City, Nevada
- `35006` Cibola County, New Mexico
- `35028` Los Alamos County, New Mexico
- `46102` Oglala Lakota County, South Dakota
- `51550` Chesapeake city, Virginia
- `51570` Colonial Heights city, Virginia
- `51580` Covington city, Virginia
- `51595` Emporia city, Virginia
- `51600` Fairfax city, Virginia
- `51610` Falls Church city, Virginia
- `51620` Franklin city, Virginia
- `51640` Galax city, Virginia
- `51678` Lexington city, Virginia
- `51683` Manassas city, Virginia
- `51685` Manassas Park city, Virginia
- `51720` Norton city, Virginia
- `51735` Poquoson city, Virginia
- `51775` Salem city, Virginia
- `51810` Virginia Beach city, Virginia
- `51820` Waynesboro city, Virginia
- `55078` Menominee County, Wisconsin

**1950** — 20 Gebiete ohne Zeile:

- `04012` La Paz County, Arizona
- `08014` Broomfield County, Colorado
- `12086` Miami-Dade County, Florida
- `32510` Carson City, Nevada
- `35006` Cibola County, New Mexico
- `46102` Oglala Lakota County, South Dakota
- `51550` Chesapeake city, Virginia
- `51580` Covington city, Virginia
- `51595` Emporia city, Virginia
- `51600` Fairfax city, Virginia
- `51620` Franklin city, Virginia
- `51640` Galax city, Virginia
- `51678` Lexington city, Virginia
- `51683` Manassas city, Virginia
- `51685` Manassas Park city, Virginia
- `51720` Norton city, Virginia
- `51735` Poquoson city, Virginia
- `51775` Salem city, Virginia
- `51810` Virginia Beach city, Virginia
- `55078` Menominee County, Wisconsin

**1970** — 8 Gebiete ohne Zeile:

- `04012` La Paz County, Arizona
- `08014` Broomfield County, Colorado
- `12086` Miami-Dade County, Florida
- `35006` Cibola County, New Mexico
- `46102` Oglala Lakota County, South Dakota
- `51683` Manassas city, Virginia
- `51685` Manassas Park city, Virginia
- `51735` Poquoson city, Virginia

**1990** — 3 Gebiete ohne Zeile:

- `08014` Broomfield County, Colorado
- `12086` Miami-Dade County, Florida
- `46102` Oglala Lakota County, South Dakota

**2000** — 2 Gebiete ohne Zeile:

- `08014` Broomfield County, Colorado
- `46102` Oglala Lakota County, South Dakota

**2010** — 1 Gebiete ohne Zeile:

- `46102` Oglala Lakota County, South Dakota

Für 1900 und 1910 sind es zu viele; dort nach Bundesstaat:

| Bild | Bundesstaaten mit den meisten Lücken |
|---|---|
| 1900 | Oklahoma 77, New Mexico 33, Montana 32, Georgia 24, Florida 23, Idaho 23 |
| 1910 | New Mexico 33, Montana 28, Virginia 23, Florida 21, Idaho 21, Arizona 15 |
| 1920 | Virginia 19, Florida 14, Georgia 6, Montana 5, New Mexico 4, Wyoming 2 |

## 8. Sprungprobe

Je Gebiet das grösste Verhältnis zwischen zwei benachbarten Bildern, über
beide Richtungen. Eine Bevölkerung, die sich in zehn Jahren verdreifacht, ist
selten Wanderung und meistens eine Grenzänderung, die der Schlüsselvergleich
verschluckt hat.

Das ist ein **Sieb, kein Urteil**. Unter den stärksten Fällen stehen echte
Grenzänderungen (Virginia Beach verdoppelt sich 1970 einundzwanzigfach, weil
Princess Anne County 1963 einverleibt wurde; Arapahoe County fällt auf ein
Fünfzehntel, weil Denver 1902 herausgeschnitten wurde) neben ebenso echten
Siedlungsschüben im Westen. Beide sehen in der Tabelle gleich aus. Die Liste
ist zum Abarbeiten da.

Gebiete mit mindestens einer Verdopplung oder Halbierung zwischen zwei Bildern: **336** von 3.108 (412 Übergänge). Die zwanzig stärksten:

| Gebiet | von | nach | Faktor |
|---|---|---|---|
| Virginia Beach city, Virginia | 1960: 8.091 | 1970: 172.106 | 21.3 |
| Hampton city, Virginia | 1950: 5.966 | 1960: 89.258 | 15.0 |
| Arapahoe County, Colorado | 1900: 153.017 | 1910: 10.263 | 14.9 |
| Lamb County, Texas | 1920: 1.175 | 1930: 17.452 | 14.9 |
| Stanley County, South Dakota | 1900: 1.341 | 1910: 14.975 | 11.2 |
| Willacy County, Texas | 1920: 1.033 | 1930: 10.499 | 10.2 |
| Williams County, North Dakota | 1900: 1.530 | 1910: 14.234 | 9.3 |
| Hopewell city, Virginia | 1920: 1.397 | 1930: 11.327 | 8.1 |
| Lincoln County, Idaho | 1900: 1.784 | 1910: 12.676 | 7.1 |
| Potter County, Texas | 1900: 1.820 | 1910: 12.424 | 6.8 |
| Nye County, Nevada | 1900: 1.140 | 1910: 7.513 | 6.6 |
| Haskell County, Texas | 1900: 2.637 | 1910: 16.249 | 6.2 |
| Gregory County, South Dakota | 1900: 2.211 | 1910: 13.061 | 5.9 |
| Dawson County, Montana | 1900: 2.443 | 1910: 12.725 | 5.2 |
| Stanley County, South Dakota | 1910: 14.975 | 1920: 2.908 | 5.1 |
| Martin County, Texas | 1920: 1.146 | 1930: 5.785 | 5.0 |
| Hall County, Texas | 1900: 1.670 | 1910: 8.279 | 5.0 |
| Yuma County, Colorado | 1900: 1.729 | 1910: 8.499 | 4.9 |
| Forest County, Wisconsin | 1900: 1.396 | 1910: 6.782 | 4.9 |
| Washington County, Colorado | 1900: 1.241 | 1910: 6.002 | 4.8 |

## 9. Urteil

**Gelb.** Die Zahlen stimmen; die Gebietszuordnung ist in zwei Bildern
unvollständig. Im Einzelnen:

**Was bewiesen ist.** Beide Bilanzen schliessen auf **0** — 1900 wie 2020 geht
jeder Mensch auf. Die Gegenprobe Countysumme gegen Staatszeile findet über alle
dreizehn Bilder nur fünf Abweichungen von je genau einer Person; das sind
veröffentlichte Rundungsartefakte, keine Fehler der Tabelle. Die Eichprobe
gegen CL8 zeigt, dass die nominale Integration dort, wo sie prüfbar ist, im
Median **null** kostet. Und die zweite Quelle bestätigt die erste: zwischen
NHGIS und Forstall stehen zehn Abweichungen in über dreissigtausend
Vergleichen, alle zehn benannt und alle zehn an Grenzen, die sich bewegt
haben — Virginias Städte, die aus ihren Countys herauswuchsen, und die 209
Menschen des Yellowstone-Nationalparks, die beide Quellen verschieden
zuordnen. Bei den deutschen Kreisen war dieselbe Konstruktion die
aussagekräftigste Prüfung überhaupt.

**Was fehlt.** Die Bilder 1900 und 1910 haben für 353 beziehungsweise 214 der
3 108 Gebiete keine Zeile, weil es diese Countys damals nicht gab. Die Menschen
sind nicht verloren — sie stehen im Vorgänger oder in einem Territorium —, aber
sie liegen noch nicht auf der heutigen Einteilung. Ab 1920 sind es 57, ab 1930
24, und davon ist der grössere Teil durch exakte Umschlüsselung zu erledigen:
reine Umbenennungen (Shannon → Oglala Lakota 2015, Dade → Miami-Dade 1997,
Ormsby → Carson City 1969) und Vereinigungen, bei denen das heutige Gebiet
genau die Summe der alten ist (Bedford city → Bedford County 2013, Clifton
Forge → Alleghany 2001, South Boston → Halifax 1995, Campbell → Fulton 1932).
Das ist derselbe Fall wie Hanau und Eisenach bei den deutschen Kreisen:
addieren ist exakt und kein Schätzen.

**Was Flächeninterpolation braucht.** Die echten Teilungen — La Paz 1983,
Cibola 1981, Los Alamos 1949, Menominee 1961, Broomfield 2001, die spät
gegründeten Städte Virginias — und vor allem die vier Territorien von 1900
und 1910. Für die gibt es Zahlen, nur auf eigenen Grenzen.

**Die Entscheidung, die jetzt ansteht.** Forstall schliesst 59 der 353 Lücken
von 1900 und 45 der 214 von 1910 — die Territorien und den District of
Columbia. Der Rest sind Countys, die es damals schlicht noch nicht gab, und
die hat auch Forstall nicht. Für 1900 bleiben **294** der 3 108 Gebiete ohne
Zahl, für 1910 **169**, ab 1920 sind es 53 und ab 1930 23. Entweder werden
diese beiden Bilder über historische Grenzen umgerechnet (Methode C, braucht
den Atlas of Historical County Boundaries), oder die Reihe beginnt später.

**Was diese Prüfung noch nicht konnte.** Der Schlüsseltest gegen die Geometrie
(fehlt noch), die Dichteverteilung (braucht die Flächen) und das letzte Bild
(Fortschreibung 2025 samt Gemeindezahlen für Connecticut, fehlen noch).

Kein Kartenbau, bevor das steht.

