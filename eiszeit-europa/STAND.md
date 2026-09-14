# Stand

Was fehlt, was offen ist, und was bewusst so bleibt.

## Das eine, was wirklich fehlt

**ICE-6G_C.** DEM und DATED-1 liegen seit dem 14.09.2026 unter `data/raw/`
(17 Dateien, 418 MB, Prüfsummen in `build/PRUEFSUMMEN.eigen`). Für ICE-6G_C
fehlt in der Netzfreigabe genau ein Wirt: `crt.sectigo.com`, von dem das
Zwischenzertifikat des Toronto-Servers kommt. Warum, steht in
[QUELLEN.md](QUELLEN.md), Abschnitt 1.

Solange ICE-6G_C fehlt, steht unter der Adresse die Seite ohne Karte
(`node build.mjs --leer`). Was zu tun ist, sobald die 48 Zeitscheiben da sind:

```
cd build
./holen.sh ice6g               # oder die Dateien von Hand nach data/raw/ice6g/
python3 quellen.py
node build.mjs > ../index.html
```

Der Eintrag in `projects.json` steht schon; seine Beschreibung ist dann
nachzuziehen, danach `node ../tools/readme.mjs`.

## Was beim ersten echten Lauf zu prüfen ist

Die Kette ist am Prüfgerüst durchgemessen (METHODIK, Abschnitt 8). Was das
Gerüst **nicht** prüfen kann, sind die Eigenheiten der echten Dateien. Diese
fünf Punkte gehören beim ersten Lauf angesehen, nicht überflogen:

> **Drei der fünf Punkte sind inzwischen beantwortet** — und zwei davon waren
> falsch geraten. Punkt 3 (Achsenrichtung) stimmte; Punkt 4 (Benennung der
> Shapefiles) stimmte **nicht**, die Dateien heissen `TS20_mc` und tragen die
> Zeit als Attribut; Punkt 5 (DEM-Abdeckung) hat einen echten Fehler
> aufgedeckt, siehe METHODIK 8. Offen sind Punkt 1 und 2, beide zu ICE-6G_C.

1. **Heissen die Variablen so?** `quellen.py` sucht fallunabhängig und mit
   Alternativen (`Topo_Diff`/`topo_diff`/`TopoDiff`, `stgit`/`thk`/…). Findet
   es nichts, nennt es alle vorhandenen Namen. Ein Bau, der an einem
   Grossbuchstaben scheitert, hilft niemandem — einer, der stillschweigend das
   falsche Feld nimmt, noch weniger.
2. **Probe 1 muss null sein.** `max |Topo(t) − Topo(0) − Topo_Diff(t)|` ist
   per Definition null. Steht dort etwas anderes, ist entweder das Vorzeichen
   von `Topo_Diff` umgekehrt gemeint oder der Bezugszeitpunkt ein anderer.
   **Bevor irgendetwas gezeichnet wird.**
3. **Läuft die Breitenachse aufsteigend?** Wenn nicht, steht die Karte auf dem
   Kopf. `quellen.py` liest `dlat` mit Vorzeichen; ein Blick auf die gemeldeten
   `lat0`/`dlat` sagt es.
4. **Wie benennt PANGAEA die Shapefiles?** Die Zuordnung Datei → (Zeit, Sorte)
   rät aus Dateiname und Ordner. Am Ende steht „N zugeordnet, M nicht" — wenn M
   nicht null ist, gehört der Ausdruck angepasst. Erwartet werden 16 × 3 = 48.
5. **Deckt das DEM die Hülle?** Nicht nur das Fenster: die zeilenweise Hülle
   reicht bis rund 73,7° N. `quellen.py` meldet Zellen ohne Wert — dort stünde
   sonst Meereshöhe, wo nichts gemessen ist.

## Was fehlt und erreichbar wäre

### Die Zeit vor 26 ka

Die Aufgabe setzt die Achse auf 26 bis 0 ka, und ICE-6G_C fängt dort an. DATED-1
reicht bis 40 ka zurück. Ein Aufbau ab 40 ka wäre also für die **Ränder**
belegt, für die Mächtigkeit nicht — und eine Karte, die einen Eisschild ohne
Dicke zeichnet, kann nichts zeigen.

### Die anderen Eisschilde

Der Ausschnitt schneidet Grönland und den Laurentidischen Eisschild ab. Das ist
eine Entscheidung der Aufgabe und keine der Daten: ICE-6G_C ist global, und die
Kette käme mit einem grösseren Fenster zurecht. Nur wäre es dann keine Karte
Europas mehr.

### Die zweite Unsicherheit

DATED-1 gibt die Unsicherheit des **Randes**. Für die **Mächtigkeit** gibt
ICE-6G_C keine Fehlerfelder heraus; die ±20–30 % stehen in der Literatur, nicht
in den Dateien. Man könnte sie als zweites Band über die Eisoberfläche legen —
zwei Bänder für zwei verschiedene Unsicherheiten auf einer Karte sind aber
vermutlich eines zu viel. Bis jemand einen guten Weg dafür hat, steht die Zahl
im Text und nicht im Bild.

### Der Vergleich zweier Modelle

ICE-6G_C ist nicht die einzige Rekonstruktion; ANU und GLAC-1D kommen zu
anderen Mächtigkeiten. Zwei Modelle nebeneinander wären die ehrlichste
Darstellung der Modellunsicherheit — und ein zweiter Datensatz, ein zweiter
Download, ein zweiter Regler. Das ist ein eigenes Projekt.

## Was bewusst so bleibt

- **Keine Ortsnamen.** Die Vorlage beschriftet Städte, weil ihre Aussage an
  Orten hängt. Hier hängt sie an Flächen und Rändern. Ein „Doggerland" ins Bild
  zu setzen wäre schön und wäre Beschriftung eines Zustands, den die Karte
  ohnehin zeigt.
- **Keine Interpolation der DATED-Ränder.** Siehe METHODIK, Abschnitt 6.
- **Kein Beschneiden der Ränder auf den Eisschild.** Wo die DATED-Linie und
  ICE-6G_Cs Eisrand auseinanderlaufen, ist das der Befund und kein Fehler, den
  man wegrechnet.
- **Eine Ansicht.** Kein Umschalten zwischen Mächtigkeit, Oberfläche und
  Gestein. Die Vorlage hat drei Ansichten, ein Nadelrelief, ein Gitternetz und
  einen Hell-Dunkel-Umschalter abgeräumt; dieser Ordner fängt deshalb schon
  aufgeräumt an.

## Bekannte Schwächen der jetzigen Fassung

- **Der Eisrand ist auf 27 km abgetastet.** `stgit` liegt im Grobgitter mit
  Teiler 4. Die Stufe am Eisrand wird dadurch über gut vier Bildpunkte weich.
  Feiner ginge, kostet aber je Halbierung des Teilers das Vierfache an
  Nutzlast; und ICE-6G_C selbst hat dort 18 km. Die DATED-Linien liegen in
  voller Schärfe darüber — sie sind die Aussage über den Rand.
- **Die Schrägsicht rechnet die Scheibenringe je Bild neu**, solange die Uhr
  läuft. Die Vorlage friert ihr Feld ein, sobald es steht, und spart damit die
  teuersten Posten bei jeder Geste. Hier ist nur der Ringspeicher an den
  Feldstand gehängt; der Rest wäre nachzuziehen, wenn sich die Schrägsicht auf
  dem Telefon als zäh erweist.
- **Kein Tiefpass über die Bilder.** Die Vorlage glättet das Höhenfeld über die
  Zeit, weil ihr Raster von Bild zu Bild springt und die Höhenlinien mitzappeln.
  Hier steht das Gitter fest — es ist aus einem festen DEM abgeleitet, nicht aus
  wandernden Umrissen —, also gibt es das Zittern nicht. Sollte es sich beim
  Lauf mit echten Daten doch zeigen, ist der Filter aus der Vorlage zu
  übernehmen.
- **Der Film ist nicht gelaufen.** `build/film.mjs` steht und ist gegen die
  Vorlage geschrieben, aber ohne echte Daten gibt es nichts zu filmen.
