# Was von der Vorlage übernommen wird

Vorlage ist [`bevoelkerung-kreise`](../bevoelkerung-kreise/) — „Deutschland,
gezeichnet von seinen Menschen". Dieses Papier ist der Befund: gelesen wurden
`index.html` (3 477 Zeilen), `METHODIK.md` (2 577), `README.md`, `STAND.md`,
`QUELLEN.md` und die sechzehn Dateien unter `build/`. Nichts hier ist geraten;
wo eine Zahl steht, steht sie so auch dort.

Übernommen wird, was **Machart** ist. Nicht übernommen wird, was aus dem
Gegenstand der Vorlage folgt — Kartogramm, Kreisgrenzen, Bevölkerungsdichte.
Die neue Karte zeigt echtes Gelände; sie braucht kein Kartogramm, weil ihre
Fläche nicht umverteilt wird.

Der Grundsatz der Vorlage gilt weiter und ist der eigentliche Fund:

> **Farbe, Licht und Höhenlinie kommen aus einer einzigen Zahl.**

Dort ist diese Zahl die gezeichnete Dichte. Hier ist sie die Paläotopographie
in Metern. Der Rest der Konstruktion bleibt, wie er ist.


## 1. Ordnername und Titel

Die Ordner des Repos heissen klein und mit Bindestrichen, deutsch, nach dem
**Gegenstand**, nicht nach der Technik: `bevoelkerung-kreise`,
`weltkarte-projektionen`, `wandel-2021-2025`. Der Vorlagenordner setzt
*Thema* vor *räumliche Einheit* — Bevölkerung, Kreise.

Also **`eiszeit-europa`**: Thema, dann Einheit. Nicht `ice6g-paleodem`, nicht
`lgm-relief-map` — beides wären technische Kürzel, und die kommen im Repo
nicht vor.

Der Titel in `projects.json` ist ein Satz, kein Etikett („Deutschland,
gezeichnet von seinen Menschen", „312 zu 226, entschieden in 3 Staaten"). Die
Seite selbst ist auf **Englisch** — so wie die Vorlage und
`weltkarte-projektionen` —, der Eintrag in `projects.json` deutsch mit dem
Vermerk „In English." am Ende.


## 2. Verzeichnisstruktur und Build-Setup

Eins zu eins übernommen:

```
eiszeit-europa/
  index.html          eine Datei, alles darin, lädt nichts nach
  README.md           Gegenstand, Verfahren, Quellen, Grenzen
  METHODIK.md         die langen Begründungen
  QUELLEN.md          Inventur: was geprüft, was erreichbar, was gesperrt
  STAND.md            was fehlt und warum
  ASTHETIK.md         dieses Papier
  data/               die aufbereitete Tabelle, zum Nachsehen
  data/raw/           die Rohdaten (nicht im Repo, siehe .gitignore)
  build/
    holen.sh          lädt die Rohdaten, prüft Prüfsummen
    DATEN.md          welche Rohdaten wohin
    build.mjs         erzeugt die fertige index.html
    *.mjs             ein Schritt je Datei
```

**Keine npm-Abhängigkeiten, keine Build-Pipeline im Auslieferungspfad.** Die
Vorlage schreibt ihren Shapefile-Leser selbst (`build/shp.mjs`, 56 Zeilen) und
ihre Koordinatenkodierung (`code.mjs`, 19 Zeilen), statt ein Paket zu ziehen.
Das wird hier für NetCDF genauso gemacht: ein Leser für NetCDF-3 classic ist
kurz, und die ICE-6G_C-Dateien sind classic.

Gebaut wird in zwei Schritten, wie dort:

```
cd build
./holen.sh                     # Rohdaten nach ../data/raw/
node build.mjs > ../index.html
```

Die Ausgabe geht auf **stdout**, die Kennzahlen auf **stderr** — so macht es
`build.mjs` der Vorlage, und das ist der Grund, warum sich ein Bau gegen den
vorigen diffen lässt.

Teure Zwischenergebnisse landen in einer Cache-Datei mit den Bauparametern als
Schlüssel (`zeitreihe-alle.json` dort). Hier ist das der Ausschnitt aus dem
DEM: das Herunterrechnen des 15-Bogensekunden-Rasters ist der teure Schritt und
hängt nur am Ausschnitt und am Zielraster.

Stellschrauben als Umgebungsvariablen, mit Vorgabe im Skript — `KNOTEN`,
`GITTER`, `NBAND`, `WASSER`, `UFER` dort; hier `RASTER` (Zielauflösung in
Bogenminuten), `NBAND`, `EISBAND`.

Und `film.mjs`: macht aus der fertigen Seite ein hochkantes mp4, per
Playwright, mit **gestellter Uhr** (`dtSek = 1/FPS`, `setzeZeit(i/(n−1))`)
statt in Echtzeit. Braucht `playwright-core` und `ffmpeg-static`, die
ausdrücklich **nicht** im Repo liegen — es ist Werkzeug, keine Seite.


## 3. Farbrampen

### Die Leiter wird gerechnet, nicht gegriffen

Die 25 Bänder der Vorlage stehen nicht als Liste im Quelltext, sie werden beim
Bauen aus ihrer Beschreibung erzeugt: **je Band eine Helligkeit, ein Farbton
und der grösste Buntheitswert, den sRGB an dieser Stelle noch hergibt**,
gesucht per Halbierung in OKLCh. Das wird übernommen, samt Code.

Die Leiter der Vorlage ist die eines Schulatlas:

| Bänder | |
|---|---|
| 1–5 | Wasser, tief dunkelblau (`#082c5d`) bis Hellblau am Ufer (`#398ec7`) |
| 6–… | Land: Waldgrün (`#00621b`), Grasgrün, Gelbgrün, Gelb, Ocker, Orange, Rot |
| vorletztes | fast entsättigtes Grau — der Übergang von Fels zu Schnee |
| letztes | reines Weiss |

Die Helligkeit steigt im Wasser bis zum Ufer, fällt dort **scharf** ins
Waldgrün, steigt wieder bis zum Gelb, fällt mit den Rot-Tönen und steigt in
den obersten beiden wieder ins Weiss. Das ist Konvention und nicht zu umgehen,
wenn Gelb der hellste Farbton sein soll.

Gemessene mittlere Buntheit der Landbänder in OKLab: **0,17**. Die frühen
Fassungen lagen bei 0,15 und 0,13 und waren zu blass — „auf schwarzem Grund
braucht eine Karte Farbe, sonst wird sie zu Schlamm."

**Für die Eiszeitkarte gilt die Leiter unverändert für das Gestein.** Sie ist
ja ursprünglich eine Höhenleiter; in der Vorlage war sie geborgt, hier kommt
sie nach Hause. Ein Band ist dann keine Dichtestufe mehr, sondern ein
Höhenintervall in Metern.

### Das Ufer ist eine Zahl, die etwas heisst

Die Kopplung

    Ufer = WASSER / NBAND · (1 + RESERVE) · Leiterende

ist die wichtigste Einzelentscheidung der Vorlagenleiter. Zwei der drei Zahlen
sind frei, die dritte folgt. 25 Bänder und 5 blaue setzen das Ufer auf ×0,50 —
und weil das ungefähr die EU-Schwelle für „dünn besiedelt" ist, **bedeutet die
Küstenlinie etwas**, statt Nebenprodukt zweier anderer Entscheidungen zu sein.

Hier ist das Ufer buchstäblich das Ufer: die Nulllinie der Paläotopographie.
Die Kopplung bleibt trotzdem — die Zahl der blauen Bänder bestimmt, wie tief
der Schelf aufgelöst wird, und die Nordsee ist in dieser Karte flach und
wichtig.

### Die zweite Leiter für Rot-Grün-Schwäche

Wird übernommen, samt Bedienung. Wasser dunkel nach hell, Land **Braun nach
Creme**, oben Fels und Schnee wie gehabt; in OKLab nachgerechnet streng
monoton in der Helligkeit, kleinster Schritt 0,022. Braun gegen Blau liegt auf
der Achse, die eine Deuteranopie behält.

Der Knopf heisst *Colours* und steht **bei der Legende, nicht in der
Bedienzeile** — „denn er ist die Legende". Die Wahl bleibt im `localStorage`
gemerkt und lässt sich mit `#cvd` in der Adresse mitgeben.

### Was neu dazukommt: die Eisrampe

Die Vorlage hat **eine** Leiter, und sie ist stolz darauf. Hier braucht es
eine zweite, weil zwei physisch verschiedene Oberflächen übereinanderliegen —
Gestein und Eis. Das ist keine Aufweichung des Grundsatzes, sondern seine
Anwendung: eine Leiter je Material, nicht je Ansicht.

Die Eisrampe muss sich **in der Anmutung** vom Gestein absetzen, nicht nur im
Ton: entsättigtes Blauweiss, sehr enge Buntheit, Helligkeit als einzige
tragende Achse. Sie darf der Gesteinsleiter nirgends ins Gehege kommen — das
einzige Weiss der Gesteinsleiter ist ihr oberstes Band, und das liegt bei
Alpengipfeln, die unter dem skandinavischen Eisschild nicht vorkommen.


## 4. Schattierungsverfahren

Alles hiervon wird übernommen. Es ist der Kern der Vorlage und in drei
Fassungen erarbeitet.

### Das Höhenfeld

Gerechnet auf **55 Prozent der Bildpunkte** (`RAUF = 0.55`), nicht in voller
Auflösung: es trägt nur den Verlauf, und ein Verlauf verträgt das
Hochrechnen. Hochgerechnet wird **bilinear** (`imageSmoothingQuality = 'low'`)
— gegen `'high'` gemessen ein Zweihundertstel Unterschied im Bild und das
Dreifache an Zeit.

Zwei Weichzeichner, eng (`breite/95`) und weit (`breite/28`), gemischt 85 zu
15, dazu ein **drittes, sehr viel weiteres Feld** (`breite/9`) als Bezug für
die Unscharfmaskierung. Das dritte wird nicht auf der Leinwand gerechnet,
sondern **in Zahlen**: ein Kastenfilter mit laufender Summe kostet je Bildpunkt
dasselbe, egal wie breit er ist, und zweimal quer angewendet ergibt er einen
Dreieckskern. Das spart die teure dritte Weichzeichnung und vor allem das
dritte Auslesen der Bildpunkte — „das Auslesen ist der teuerste Schritt am
ganzen Relief."

Gelesen wird **in zwei Kanälen**, und das ist der Kniff, den man ohne die
Vorlage nicht fände: `getImageData` gibt die Farbe **unmultipliziert** zurück,
Rot ist also schon `blur(Höhe·Deckung) / blur(Deckung)` — die normalisierte
Faltung, geschenkt. Die Deckung steht daneben im Alphakanal.

Für die Eiszeitkarte ist das unmittelbar brauchbar: die Eismächtigkeit
`stgit` ist ausserhalb des Eises null und hat einen scharfen Rand. Genau
dafür ist der Zweikanaltrick gebaut.

### Beleuchtete Höhenlinien nach Tanaka Kitiro (1950)

Das Stück, das die Form wirklich trägt, und die Begründung dafür ist der Satz,
an dem die ganze Vorlage hängt:

> **Die Fläche ist schon vergeben.** Sie trägt die Farbe, und die Farbe sind
> die Daten. Eine Schattierung, die stark genug für ein Gebirge wäre, wüsche
> sie aus. Linien nehmen fast keine Fläche weg.

Weiss, wo der Hang der Sonne zugewandt ist, schwarz, wo er von ihr wegfällt,
dick, wo er voll im Licht oder voll im Schatten steht.

**Verfolgt, nicht gemalt.** Marching Squares über das Feld liefert Strecken,
die Strecken werden zu durchgehenden Linien **verkettet**, und gezeichnet wird
als weiche Kurve auf der Leinwand selbst, in deren voller Auflösung. Ins
Raster gemalt und hochgerechnet blieben sie ein Schmier, bei jeder Auflösung;
Strecke für Strecke gezeichnet sahen sie gepunktet aus. Auf der fertigen Kette
wird die Beleuchtung **längs geglättet** (zwei Durchgänge eines
Dreipunktmittels), dann wird sie in Läufe gleicher Stärke zerlegt, die sich um
eine Stützstelle überlappen.

Gebündelt nach Beleuchtungsstärke: **12 Stufen, hell und dunkel, also 24 Züge
für die ganze Karte** statt zweitausend einzelner Striche. Die Buchhaltung
wird einmal angelegt und über alle Niveaus **und alle Bilder** wiederbenutzt,
mit fortlaufendem Stempel statt Leeren. (Fortlaufend über die Bilder — sonst
hat das erste Bild Linien und alle weiteren nicht. Genau so ist es dort beim
ersten Versuch gewesen.)

Die Niveaus sind die Bandgrenzen. **Jede Höhenlinie ist eine Farbgrenze, jede
Farbgrenze trägt ihre Linie.** Jede fünfte ist eine Zählkurve, kräftiger
gezeichnet, und fällt auf die Zahlen der Legende.

Ausgedünnt statt abgeschaltet, wo zwei Niveaus unter vier Bildpunkte
zusammenrücken: jedes vierte hält am längsten durch, dann jedes zweite, dann
der Rest. Vorher blendeten alle gemeinsam aus — und das traf ausgerechnet den
steilsten Hang, also den höchsten Berg der Karte. Für die Alpen und das
Skandinavische Gebirge ist das keine Feinheit, sondern die Bedingung dafür,
dass sie überhaupt Höhenlinien bekommen.

### Licht, Mulde, Schlagschatten

| | |
|---|---|
| Schattierung | Lambert, Licht von **oben links**, `SONNE = 40` Grad über der Fläche |
| Schlagschatten | dasselbe Licht **flacher**, `WURFSONNE = 16` Grad |
| Mulde | was tiefer liegt als seine weite Umgebung, bekommt weniger Himmel (`MULDE = 0.85`) |
| Stärke | `STAERKE = 1.6`, gedeckelt bei ±0,55 |

Die beiden Sonnen sind kein Versehen: „ein Strahl, der steiler abfällt als der
Hang selbst, trifft nie auf Schatten — bei 40 Grad gäbe es über diesen sanften
Kuppen überhaupt keinen. Kartenzeichner trennen die beiden Lichter seit
jeher."

Der Schlagschatten läuft in **einem einzigen Durchgang**: das Licht kommt aus
genau 45 Grad, die Strahlen laufen auf der Leinwand diagonal, und je Diagonale
genügt ein mitgeführter Horizont — `s = max(s − Abfall, Höhe)`.

**Die Schattierung wird in die Farbe gerechnet**, nicht als graues Bild
darübergelegt. Das ist der teuerste Fehler, den die Vorlage gemacht und
behoben hat: *soft-light* enthält den Faktor C·(1−C), und der ist bei Weiss
null — **weiches Licht kann Weiss nicht dunkler machen**. Auf den hellsten
Bändern, also genau auf den Gipfeln, kam keine Hangschattierung an. `overlay`
und `hard-light` haben dieselbe Stelle.

Für die Eiszeitkarte ist das existenziell: die Oberfläche des Eisschildes ist
fast weiss. Ein Eisschild, der mit soft-light schattiert wird, ist eine
strukturlose weisse Fläche. Also aufhellen gegen Weiss (`AUFHELLEN = 0.55`)
und abdunkeln gegen Schwarz (`ABDUNKELN = 0.70`), in derselben Schleife, in
der das Band nachgeschlagen wird.

### Der Tiefpass über die Bilder

Das Raster des Höhenfeldes springt von Bild zu Bild um Bruchteile eines
Punktes, und die verfolgten Linien zappeln mit. Also ein Tiefpass erster
Ordnung, mit **zwei Zeitkonstanten**:

| | τ |
|---|---|
| weites Feld (Höhenlinien, grosse Form) | 1,2 s |
| enges Feld und Rand (Schattierung) | 0,55 s |

Gerechnet mit der **wirklich vergangenen Zeit**, nicht je Bild — sonst hinge
die Zeitkonstante daran, wie schnell das Gerät ist. Wo die Zeit springt (am
Regler, beim Ändern der Grösse), wird der Filter **geleert statt nachgezogen**.

Und: sobald das Feld nirgends mehr als ein Viertel Band vom Ziel entfernt ist,
wird es **eingefroren** und bei jeder Geste wiederverwendet. Das ist der
Griff, der ein gekipptes Standbild auf dem Telefon von 141 auf 54 ms bringt.


## 5. Kameraführung und Projektion

### Parallelriss, kein Blickpunkt

„Wie ein Blockbild im Schulatlas. Zwei gleich hohe Berge sind damit gleich
hoch gezeichnet, auch wenn einer weiter weg steht — was für eine Karte der
richtige Tausch ist."

### Das Laserschnittmodell

Die Schrägsicht ist kein zweites Bild und kein Höhenmodell: das Feld wird in
so viele Scheiben geschnitten, **wie es Farbbänder gibt**, und die Scheiben
werden versetzt übereinandergelegt. Jede Scheibe ist genau ein Band, jede
Stufenkante genau eine Höhenlinie.

Eine Scheibe ist ein **Umriss**, keine Fläche — gezogen mit demselben Marching
Squares wie die Höhenlinien, auf denselben Niveaus. Gemessen: 25 Pfade
beschneiden und das Bild hineinzeichnen kostet **0,1 ms**, derselbe Stapel als
Rastermasken **242 ms**.

Gefüllt wird mit **einer Farbe** je Platte — eine Platte *ist* ein Band, dafür
ist sie geschnitten. Vorher wurde die fertige schattierte Karte
hineinbeschnitten, und weil die Farbe auf dem gröberen Gitter entsteht,
blutete auf jeder Platte ein Saum der Nachbarfarbe über den Rand.

Dazu, jedes Stück gemessen und begründet:

- **Wände.** Derselbe Ring eine Stufe tiefer gefüllt; was stehen bleibt, ist
  der nach Süden gewandte Saum. Gestrichen in Schritten von **drei
  Bildpunkten**, nicht in einem Sprung von einer Plattendicke — gekippt
  staucht der Kosinus die Form zusammen, und der Rest blieb schwarz. Bei 80
  Grad fallen die Lücken von 343 auf rund hundert.
- **Kontaktschatten** am Fuss jeder Wand: der unterste Streifen dunkler
  (`WANDFUSS = 0.55` statt `WANDDUNKEL = 0.80`). Ein Farbwechsel, kostet
  nichts.
- **Sockel:** die Grundplatte bekommt die Wand des untersten Wasserrings.
  Der echte Umriss wäre genauer und ist viermal so teuer.
- **Beleuchtete Kanten** mit dem alten Prägetrick: derselbe Ring zweimal
  versetzt gefüllt, weiss zum Licht und schwarz von ihm weg, dann die
  Bandfarbe darüber, die von beiden die innere Hälfte zudeckt. Wo die Kante
  längs zum Licht läuft, verschwinden beide von selbst — genau wie bei Tanaka.
  Versetzt wird in **Grundriss-Koordinaten**, damit die Sonne beim Drehen mit
  der Karte wandert, und der Versatz wächst mit dem Zoom mit (gedeckelt beim
  Vierfachen).
- **Das Licht als eigene Ebene**, im Feldgitter gebaut und **einmal** fertig
  hochgelegt, mit `soft-light` darüber. Je Scheibe aufgelegt kostete es so
  viel wie vorher die ganze Textur — „die Kosten sitzen in den
  fünfundzwanzig Blits, nicht im Bild." Ein zweiter Blit je Scheibe, eine
  Stufe tiefer, legt das Licht auch auf die Wände.
- **Gemischt wird nur im Kasten des Stapels**, nicht über die ganze Leinwand.

> Unscharf wird dabei nur das Licht; Farbe, Kanten und Wände bleiben scharf.
> **Weiches Licht auf harten Flächen ist ein Modell — hartes Licht auf weichen
> Flächen war der alte Fehler.**

**Verworfen und hier nicht noch einmal zu versuchen:** ein Tiefenverlauf, der
die Ferne abdunkelt. „Er hätte die fernen Gipfel gedämpft, und die sind
Daten."

### Der Rahmen steht fest

Eingepasst wird **auf das obere Ende der Farbleiter**, nicht auf den höchsten
Berg, der gerade dasteht. Sonst schrumpfte die Karte in dem Mass, in dem die
Berge wachsen, und zwei Bilder wären nicht mehr vergleichbar — „genau das,
wofür die ganze Karte gebaut ist."

Für die Eiszeitkarte heisst das: der Rahmen richtet sich nach der Summe aus
höchstem Gestein und dickstem Eis über die **ganze** Zeitachse. Der Eisschild
wächst und schwindet; die Karte darf dabei nicht atmen.

### Zoom ist ein Vergrösserungsglas

Ausdrücklich kein neues Rechnen. Die Weichzeichner messen in Bildpunkten der
Leinwand; würde beim Heranziehen neu gerechnet, änderte sich mit dem Massstab
die Form der Berge, und zwei Zoomstufen zeigten zwei verschiedene Karten.
**„Lieber unscharf als unwahr."** Die Schrägsicht ist davon ausgenommen — der
Scheibenstapel wird wirklich neu geschnitten.

### Gesten

| Finger | |
|---|---|
| einer, gezogen | schiebt den Ausschnitt |
| einer, getippt | der Zettel zum Ort darunter |
| einer, zweimal getippt | Ansicht zurück |
| zwei, Abstand | Zoom, bis achtfach |
| zwei, Winkel | Drehung |
| zwei, Mitte hoch/runter | Neigung, 220 Bildpunkte für den ganzen Bereich |

Der Kniff: jede der drei Grössen wird gegen das **vorige Ereignis** gemessen,
nicht gegen den Anfang der Geste. Dann trennen sie sich von selbst, und es
braucht keine Schwellen und keine Sperren.

Und: **alles dreht sich um die Finger.** Bodenpunkt unter der Fingermitte
merken, ändern und neu einpassen, um die Differenz verschieben. Bezug ist der
**Boden**, nicht die Geländeoberfläche — man fasst die Karte an, nicht die
Flanke eines Berges. Gemessen wandert der angefasste Punkt bei allen vier
Gesten um **0,00 Bildpunkte**.

Die Regler halten stattdessen die Mitte des Rahmens fest. Ein Bild je
`requestAnimationFrame`; solange der Finger liegt, ist die Leinwand grob (ein
Gerätepunkt je CSS-Punkt), das volle Bild kommt beim Loslassen.

**Alle Regler fangen links an** — die Zeitleiste beim Anfang, der Kippregler
bei flach, der Drehregler bei Norden oben (0 bis 360, nicht −180 bis 180).

### Die Projektion selbst

Hier weicht die neue Karte ab, und zwar begründet. Die Vorlage rechnet auf
einer **flächentreuen** Projektion (Lambert azimutal, 52° N 10° O), weil
Fläche × Höhe = Bevölkerung ihre eine Aussage ist.

Diese Karte hat diese Aussage nicht. Ihr Ausschnitt ist 12° W bis 45° E und
34° N bis 72° N — 38 Breitengrade, von Kreta bis zum Nordkap. In einer
Plattkarte wäre Skandinavien dreifach überbreit gezogen, und der Eisschild,
um den es geht, läge genau dort. Gewählt wird deshalb **Lambert azimutal
flächentreu, zentriert auf 53° N 15° O** — dieselbe Projektionsfamilie wie die
Vorlage, nur auf den neuen Ausschnitt gesetzt. Formeln und Umkehrung stehen
schon in `build/geometrie.mjs` der Vorlage.


## 6. Typografie

Kein Zeichensatz wird geladen — `system-ui, -apple-system, "Segoe UI",
sans-serif`, Grundgrösse 15 px. Das ist Absicht: „alles mitliefern", und ein
Webfont wäre ein Nachladen.

| | |
|---|---|
| Jahr | 30 px, `font-weight: 650`, `letter-spacing: -.02em`, `line-height: 1` |
| Nebenzeile daneben | 13 px, `--ink2` |
| laufende Notiz | `clamp(9px, 1.36cqw, 11.6px)` |
| Überschrift der Notiz | `clamp(9.8px, 1.48cqw, 12.6px)`, 650 |
| Faden der vorigen | `clamp(7.2px, 1.09cqw, 9.3px)`, 600 |
| Legende, Zeile darunter | 11,5 px |
| Zahlen | `font-variant-numeric: tabular-nums`, überall |

Der Trick dahinter ist **`container-type: inline-size` auf der Bühne**: `1cqw`
ist ein Hundertstel ihrer Breite, also wächst der Text mit der Karte statt in
Bildpunkten festzustehen. Die Karte misst sich ja auch an dieser Breite. Nach
unten ein Boden in Pixeln, nach oben ein Deckel, weil die Bühne bei 860
Bildpunkten aufhört.

Beschriftung **in** der Karte wird als **Teiler der Kartenbreite** angegeben,
nicht in Pixeln: `breite/56` für den kleinsten Namen, `breite/33` für den
grössten, Boden bei 7 px. „Berlin lief sonst in jeder Grösse gegen dieselben
dreissig Pixel und stand als Überschrift über der Karte statt als Beschriftung
darin."

Farben:

```
--plane:#000;  --surface:#0c0c0c;  --ink:#fff;  --ink2:#bfbeb6;
--muted:#7f7d77;  --line:#232321;  --axis:#33332f;  --ring:rgba(255,255,255,.09);
```

**Ein Farbklima, kein Umschalten zwischen hell und dunkel.** Das spart nicht
nur Code — es ist der Grund, warum das Tiefgrün so tief sein darf.

### Drei Ebenen

Der Text liegt **über der Bühne, nicht in ihr**, damit die Karte nicht
springt, wenn eine Notiz länger ist als die vorige:

| Ebene | |
|---|---|
| 2 | Jahr und Kennzahl, mit Schein dahinter — die eine Zeile, die immer lesbar sein muss |
| 1 | die Karte |
| 0 | Notiz und Faden — **hinter** der Karte |

Der Text weicht der Karte aus, statt sie zu verdrängen. Die Karte steht im
Hochformat **unten statt mittig** (`rest * 0.875`), weil oben der Text steht
und unten nichts stand.

Der Schein hinter dem Schild ist dreifacher `text-shadow` in der
Hintergrundfarbe, kein Kasten.

### Die laufende Notiz und der Faden

Übernommen. Eine Notiz je Zeitabschnitt, ausgeschrieben mit Überschrift und
Sätzen; darunter der Faden der vorigen Überschriften, sechs Zeilen, mit jeder
blasser (`1, 0.52, 0.38, 0.27, 0.19, 0.13`), auf dem Telefon drei. Geschoben
wird nicht Zeile für Zeile: der ganze Faden springt ohne Übergang um eine
Zeilenhöhe nach oben und läuft dann zurück — „kostet eine Bewegung statt
sechs". Läuft die Uhr rückwärts, wird der Faden neu aufgebaut.

Und der Grundsatz dazu: **was in einer Notiz eine Zahl nennt, stammt aus der
Tabelle dieser Seite; der Rest ist Schulwissen und als solches
gekennzeichnet.**


## 7. Zeitachsen-Bedienung

### Die Uhr läuft über Spielzeit, nicht über Jahre

Der wichtigste Fund für diese Karte. Jeder Abschnitt bekommt einen Anteil an
der Gesamtlaufzeit, der **Dauer und Umschichtung mischt** — das geometrische
Mittel aus seinem Anteil an den Jahren und seinem Anteil an allem, was sich
bewegt. Dazu eine **Untergrenze**, „sonst ist ein Abschnitt vorbei, ehe seine
Notiz gelesen ist."

Rein nach Jahren bekäme der Bruch von 1939 auf 1946 vier Sekunden — die
gewaltigste Umwälzung der Reihe, vorbei, ehe man hinsieht. So bekommt er acht.

Für die Eiszeitkarte ist das genau richtig: zwischen 26 und 21 ka bewegt sich
wenig, zwischen 16 und 11 ka bricht der Eisschild zusammen. Nach Jahren
gerechnet liefe der Zusammenbruch in einem Fünftel der Zeit ab.

Der Regler misst entsprechend **Spielzeit**, und die Marken sitzen dort, wo
die Datenpunkte im Ablauf liegen. Die Jahreszahl zeigt weiter das wirkliche
Jahr und läuft innerhalb eines Abschnitts gleichmässig.

### Die Marken sagen, wo Daten stehen

`.marken i` sind Striche unter der Bahn, ein Strich je Zeitscheibe, `i.voll`
kräftiger für die vollständig belegten. **Das ist der Ort, an dem die
tatsächliche Schrittweite der Daten ablesbar wird** — ICE-6G_C hat 1-ka-
Schritte bis 21 ka und 0,5-ka-Schritte danach, und das steht dann als
sichtbare Verdichtung der Striche in der zweiten Hälfte der Bahn.

### Zwischen den Datenpunkten

Monotone kubische Kurve (Fritsch–Carlson, wie PCHIP), gerechnet auf der
**Spielzeitachse**, nicht auf der Jahresachse — „sichtbar ist Bewegung je
Sekunde, nicht je Jahr, und ohne diesen Bezug entstünde an jeder Zählung genau
der Knick zurück, den die Kurve beseitigen soll."

Sie geht durch jeden gemessenen Wert, knickt dort nicht und **schiesst nie
über die beiden Nachbarwerte hinaus** (gemessen: 0,0000 % Überschiessen).

> Hier gilt allerdings die Ansage der Aufgabe: **linear interpolieren.** Die
> Vorlage begründet ihre Kurve mit einem gemessenen Knick von 74 Prozent an
> jeder Zählung und zahlt dafür im Mittel 0,75 Prozent Abweichung. Bei
> gleichmässigen 1-ka-Schritten ist der Knick klein und der Preis
> unbegründet — und „kein Glätten über die Datenlage hinweg" steht in der
> Aufgabe. Die Maschinerie (`steigungen`, `hermite`, `STRAFF`) wird
> übernommen und `STRAFF` auf 0 gesetzt; eine Hermite-Kurve, deren beide
> Steigungen gleich der Sehne sind, **ist** die Gerade. Damit steht der
> Schalter da, falls sich die Frage am Übergang 21 ka (wo die Schrittweite
> wechselt) doch noch stellt.

### Die Bedienleiste

Zwei Reihen, und mehr nicht:

```
[▶]  [=========== Zeitleiste ===========]
     ‖  ‖  ‖  ‖  ‖  ‖   (Marken)
Tilt [=====]  Turn [=====]  [Names]
```

Der Spielknopf ist 38 px breit und fest (`flex: 0 0 38px`), damit die Bahn
nicht springt, wenn ▶ zu ❚❚ wird. `accent-color: #9aa07f` auf den Reglern —
ein gedämpftes Oliv, das gegen die Geländefarben nicht anschreit.

Drei Dinge liegen **auf der Karte** statt in der Bedienzeile, „die ist auf 320
Punkten schon voll": Nordpfeil unten links (nur wenn gedreht), ↺ oben rechts
(nur wenn die Ansicht vom Anfang abweicht), und die Farbleiter bei der
Legende.

Beim Laden liegt die Karte flach, und nach 700 ms läuft der Film von selbst
an.

### Der Ticker unten

Die Vorlage hat `p.klein#legText` unter der Farbleiter: eine Zeile, die
mitläuft und sagt, was gerade gilt. **Eine Zeile, auch wenn sie leer ist** —
`min-height: 1.35em` —, „sonst ist die Leiste beim ersten Messen niedriger als
gleich darauf, und die Karte wird für eine Höhe gezeichnet, die es nicht mehr
gibt." Auf dem Telefon darf sie auf zwei Zeilen umbrechen, mehr nicht.

Genau dort steht in der neuen Karte die **Meeresspiegelkurve**.


## 8. Was ausdrücklich nicht übernommen wird

| | warum |
|---|---|
| Diffusionskartogramm | die Fläche wird hier nicht umverteilt |
| halbe Verzerrung, `FORM = 0.5` | dito |
| „Volumen ist Bevölkerung" | die tragende Aussage der Vorlage, hier gegenstandslos |
| Städtenamen nach laufender Grösse | hier stehen Orte fest; Beschriftung, wenn überhaupt, ist Ortsmarke |
| Kreisumriss beim Antippen | es gibt keine Verwaltungseinheiten |
| `ABSOLUT` / relativ-Schalter | die Höhe ist in Metern, es gibt nichts zu beziehen |

Und ein Grundsatz, der übernommen wird, obwohl er kein Verfahren ist:

> **Eine Seite, die eine Sache gut zeigt, ist mehr wert als eine mit vier
> Knöpfen.**

Die Vorlage hat drei Ansichten, ein Nadelrelief, ein Gitternetz, einen
Hell-Dunkel-Umschalter und einen Artikel unter der Karte abgeräumt. Diese
Karte fängt deshalb schon aufgeräumt an: eine Ansicht, zwei Leitern
(Gestein und Eis), eine Zeitleiste, Tilt/Turn, das Unsicherheitsband. Was
darüber hinaus verlockt, muss sich erst verdienen.
