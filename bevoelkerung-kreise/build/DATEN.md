# Rohdaten für den Neubau

Die Skripte laden nichts herunter. Diese vier Dateien müssen neben ihnen
liegen, im selben Ordner wie `build.mjs`:

| Datei | Quelle |
|---|---|
| `vg2500_krs.shp` + `.dbf` + `.shx` + `.cpg` | [BKG, Verwaltungsgebiete 1:2 500 000 (VG2500)](https://daten.gdz.bkg.bund.de/produkte/vg/vg2500/aktuell/) — `vg2500_01-01-2026.utm32s.shape.zip`, daraus `vg2500/VG2500_KRS.*`, umbenannt |
| `gpop_county.csv` + `gpop_state.csv` + `gpop_muni.csv` | [German Local Population Database (GPOP), Version 1.0](https://leopard.tu-braunschweig.de/receive/dbbs_mods_00071017) — aus `gpop_v1.zip` die Dateien `data/county.csv`, `data/state.csv` und `data/muni.csv`, umbenannt. Die Gemeindedatei wird zurzeit nicht gebraucht. CC BY 4.0 |
| `gvisys-04-kreise.xlsx` | Statistisches Bundesamt, [Gemeindeverzeichnis, Kreisfreie Städte und Landkreise](https://www.destatis.de/DE/Themen/Laender-Regionen/Regionales/Gemeindeverzeichnis/Administrativ/04-kreise.html) (`04-kreise.xlsx`) |
| `hgv_brandenburg_1875-2005.pdf` | **Nur für die Gegenprobe, ohne sie läuft es auch.** Amt für Statistik Berlin-Brandenburg, *Historisches Gemeindeverzeichnis des Landes Brandenburg 1875 bis 2005* — irgendeiner der 15 Teile; Tabelle 1 mit allen Kreisen steht in jedem ([Teil 15, Uckermark](https://download.statistik-berlin-brandenburg.de/faedc7c46a0039e4/adf73748ddd2/SB_A01-99-15_2006u00_BB.pdf)) |

Der GPOP-Download ist durch eine Rechenaufgabe gegen Maschinen geschützt; das
Zip lässt sich nur von Hand holen, nicht per Skript.

Lizenzen: BKG-Geometrie unter Datenlizenz Deutschland – Namensnennung 2.0,
© GeoBasis-DE / BKG. GPOP unter CC BY 4.0, zu zitieren als Roesel (2022),
DOI 10.1515/jbnst-2022-0046. Die amtlichen Tabellen mit Quellenangabe frei
verwendbar.

Fällt das Shapefile weg, springt ersatzweise ein `vg250_kreise.geo.json` ein —
ein VG250-Auszug der Kreisebene mit BKG-Attributen und älterem Gebietsstand.
Der Bauvorgang holt dann die Eingliederung Eisenachs nach. Gedacht ist das nur
als Notbehelf; VG2500 ist der Weg.

## Bauen

Zwei Schritte. Der erste braucht Python und zwei Pakete und erzeugt die
Datentabelle; der zweite braucht nur Node und erzeugt die Seite.

```
pip install pypdf openpyxl
python3 quellen.py          # -> ../data/bevoelkerung_kreise_long.csv, stammdaten.json
node build.mjs  > ../index.html
```

Der zweite Schritt rechnet für jeden Zeitpunkt ein eigenes Kartogramm — bei
voller Auflösung etwa 25 Minuten für die zehn Bilder. Das Zwischenergebnis
landet in `zeitreihe-alle.json`; löschen erzwingt eine Neuberechnung, alles
danach — Nutzlast, Text, Seite — läuft in Sekunden. Die Kennzahlen laufen auf
die Fehlerausgabe.

Deckt eine Reihe nur einen Teil des Landes ab und gibt es Kreise, die in
weniger als der Hälfte der Bilder Zahlen haben, entsteht zusätzlich eine
zweite Reihe ohne sie (`zeitreihe-kern.json`), zwischen denen die Seite
umschalten kann. Flächendeckend fällt das weg.

Zwei Stellschrauben als Umgebungsvariablen:

```
KNOTEN=9000 GITTER=1600 node build.mjs > ../index.html
```

`KNOTEN` ist das Knotenbudget nach der Generalisierung, `GITTER` die Breite des
Diffusionsgitters. Kleiner heisst schneller und ungenauer; für einen schnellen
Blick reichen `KNOTEN=2500 GITTER=420`, das dauert keine zwei Minuten.

**Die veröffentlichte Seite ist mit `KNOTEN=12000` gebaut**, nicht mit der
Voreinstellung 9000 — sie wiegt dadurch etwas mehr und hält die kleinen
kreisfreien Städte in Form. Wer die Seite neu baut, sollte das mitgeben, sonst
wird sie unbemerkt gröber.

Drei weitere, nur zum Ausprobieren der Farbleiter: `NBAND` (Zahl der Bänder,
Voreinstellung 25), `WASSER` (wie viele davon blau sind, 5) und `UFER` (wo der
Meeresspiegel liegen soll, in Vielfachen der mittleren Dichte von 2024, 0,50).
`UFER` setzt das obere Ende der Leiter so, dass die Küste genau dort fällt; auf
null gestellt gilt wieder das gemessene Quantil. Die drei hängen zusammen —
`Ufer = WASSER / NBAND · (1 + RESERVE) · Leiterende` —, und 25/5 sind gewählt,
weil dann alles rund aufgeht: ein Band ×0,1, die Küste bei ×0,5, das Ende der
Rampe bei ×2,5, das Knie bei ×2,222 (gemessenes Quantil ×2,305).

## Der Film

`film.mjs` macht aus der Seite ein hochkantes mp4 — für Reddit und alles
andere, wo eine Webseite nicht hinpasst. Der Inhalt ist der der Seite, nichts
nachgebaut: sie wird geladen, der Regler ausgeblendet, dann Bild für Bild
weitergestellt.

```
node film.mjs ../index.html film.mp4 30
```

1080 × 1920, dreissig Bilder in der Sekunde, 84 Sekunden Lauf plus zwei
Sekunden Standbild am Ende; rund 25 MB. Gerechnet wird nicht in Echtzeit —
der Browser schafft hier weich gerendert elf Bilder in der Sekunde —, sondern
mit gestellter Uhr: je Bild `dtSek = 1/FPS` und `setzeZeit(i/(n−1))`, genau
das, was die Seite bei flüssigem Lauf täte. Die Spielzeit stimmt damit auf die
Sekunde, und der Tiefpass über die Bilder bekommt denselben Zeitschritt wie im
Browser. Ein Lauf dauert etwa fünf Minuten je Minute Film.

Zwei Dinge, die man wissen sollte. Erstens braucht das Skript `playwright-core`
und `ffmpeg-static`, beide **nicht im Repo** — es ist Werkzeug, keine Seite,
und die Regel „keine npm-Abhängigkeiten" gilt weiter für alles, was
ausgeliefert wird. Zweitens hängen die Blenden der Notizen an CSS-Übergängen
und damit an der wirklichen Uhr: ein Wechsel blendet im Film über zwei Bilder
statt über zwölf.

## Was wo liegt

| Datei | Aufgabe |
|---|---|
| `quellen.py` | liest GPOP und die amtlichen Tabellen, prüft dreifach gegen, schreibt die lange CSV und `stammdaten.json` |
| `shp.mjs` | Shapefile- und DBF-Leser, ohne Fremdbibliothek |
| `film.mjs` | macht aus der fertigen Seite ein hochkantes mp4 (Werkzeug, nicht Teil der Seite) |
| `laden.mjs` | Kreisgeometrie einlesen, egal ob Shapefile oder GeoJSON |
| `geometrie.mjs` | flächentreue Projektion, Umkehrung der UTM-Abbildung, Ringflächen, Faltungsprüfung |
| `topologie.mjs` | Verschweissen, Auflösen alter Gebietsstände, Generalisieren, Einschränken |
| `daten.mjs` | die lange CSV lesen und zu Bildern bündeln |
| `raster.mjs` | Dichtefeld auf ein Gitter, mit „Meer" am Rand |
| `diffusion.mjs` | Wärmeleitung per Gaussglättung, Punkte schwimmen mit |
| `kartogramm.mjs` | ein Kartogramm für einen Zeitpunkt |
| `zeitreihe.mjs` | alle Zeitpunkte einer Reihe, warmer Start, gemeinsamer Massstab |
| `stammdaten.mjs` | Namen und amtliche Flächen der Kreise |
| `code.mjs` | kompakte Kodierung der Koordinaten für die Seite |
| `nutzlast.mjs` | Geometrie, Zeitreihe und Kreisdaten in die Nutzlast |
| `build.mjs` | erzeugt die fertige `index.html` |
