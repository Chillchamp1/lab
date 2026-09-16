# Rohdaten

Die Skripte laden nichts herunter. Zwei Dateien müssen in `build/roh/` liegen,
sonst bricht der Bau ab:

| Datei | Quelle | Größe |
|---|---|---|
| `trains.json` | `Chillchamp1/github.io`, `data/trains.json` | 8,8 MB |
| `germany.json` | `Chillchamp1/github.io`, `data/germany.json` | 39 kB |
| `bevoelkerung_kreise_long.csv` | dieses Repo, `bevoelkerung-kreise/data/` | 1,2 MB |
| `bevoelkerung-kreise.html` | dieses Repo, `bevoelkerung-kreise/index.html` | 347 kB |

Die ersten beiden kommen aus `Chillchamp1/github.io` (MIT, derselbe Urheber)
und sind dort schon aufbereitet: `trains.json` ist ein Fahrplantag des offenen
DELFI-Datensatzes vom 13. Mai 2026, auf Schienenverkehr gefiltert;
`germany.json` trägt Umriss und Ländergrenzen.

Die anderen beiden kommen aus dem Nachbarprojekt in diesem Repo und tragen die
Menschen: die CSV die Kreisbevölkerung, die Seite die Kreisgeometrie in ihrer
Nutzlast. Was in allen vier steht, erklärt [../QUELLEN.md](../QUELLEN.md).

Holen:

```
mkdir -p build/roh
cd build/roh
curl -LO https://raw.githubusercontent.com/Chillchamp1/github.io/main/data/trains.json
curl -LO https://raw.githubusercontent.com/Chillchamp1/github.io/main/data/germany.json
```

Dazu, aus diesem Repo:

```
cp ../bevoelkerung-kreise/data/bevoelkerung_kreise_long.csv build/roh/
cp ../bevoelkerung-kreise/index.html build/roh/bevoelkerung-kreise.html
```

Oder aus einer vorhandenen Arbeitskopie kopieren. Die Pfade lassen sich über
`ROHDATEN`, `GEODATEN`, `KREISCSV` und `KREISSEITE` überschreiben.

## Bauen

Aus `bahn-zeitkarte/`:

```
python3 build/01_netz.py      # Netz, Bahnhöfe, Spitzenstunde             ~3 s
python3 build/02_zeiten.py    # Reisezeitmatrix (C, alle Kerne)          ~15 s
python3 build/03_lage.py      # Federmodell und Gelände (C, alle Kerne) ~5 min
python3 build/04_menschen.py  # Bevölkerungsgewicht je Bahnhof           ~40 s
python3 build/05_seite.py     # data/karte.json, data/isochronen.json      ~3 s
```

Gebraucht werden `python3` mit `numpy` und ein C-Übersetzer (`cc`). Die beiden
C-Teile werden von ihren Python-Treibern übersetzt, sobald die Quelle neuer
ist als das Programm.

## Was in `zwischen/` entsteht

Nichts davon gehört ins Repo; `.gitignore` hält es draußen.

| Datei | |
|---|---|
| `stationen.json` | 5.464 Bahnhöfe mit Lage, Name, Zahl der Halte, Landkennung |
| `netz.bin` | 279.680 Fahrplanabschnitte, nach Abfahrtszeit sortiert |
| `deutsch.bin` | die Nummern der 5.042 deutschen Bahnhöfe |
| `zeiten.bin` | die Reisezeitmatrix, 5.042² Minuten als `uint16`, 48 MB |
| `kern.bin`, `kern.json`, `geo.bin` | der Kern von 4.815 Bahnhöfen und seine geografische Lage |
| `lage.bin` | flache Federkarte, Geländekarte, Höhe, Geografie, Kennzahlen |
| `menschen.json` | das Bevölkerungsgewicht je Bahnhof des Kerns |
| `zeiten`, `feder` | die übersetzten C-Programme |

## Zum Nachrechnen des Geländeteils

`03_feder.c` nimmt zwei zusätzliche Argumente, mit denen der Versuch aus
METHODIK 3.4 nachzustellen ist — das Sparsamkeitsglied λ (als Vielfaches des
mittleren Höhengradienten) und die Zahl der Schritte:

```
build/zwischen/feder build/zwischen/zeiten.bin build/zwischen/kern.bin \
    build/zwischen/geo.bin /tmp/lage-015.bin  0.15  120
```

Voreingestellt ist λ = 0, und die Zahlen in der Seite sind mit λ = 0 und 200
Schritten gerechnet.
