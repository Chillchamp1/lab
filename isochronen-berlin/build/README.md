# Bauen

Die Skripte, aus denen `index.html`, `data/streets.json` und `tiles/`
entstanden sind. Sie sind die **Rechenakte**, kein Ein-Knopf-Bau: die Kette
hat rund zwanzig Schritte, braucht einige Gigabyte Downloads, einen Browser
für die Grundkarte und für den Hauptschritt viel **Arbeitsspeicher** (ohne
Polen und Tschechien waren es rund 16 GB; das Radnetz ist seitdem gut ein
Drittel größer). Gelaufen ist sie unter Windows mit Python 3.12.

## Arbeitsordner

Jedes Skript sucht seine Daten **neben sich**: `data/`, `osm_parts/`,
`plcz_parts/`, `plcz_poly/`, `zones_work/`, `borders_parts/`, `renders/`,
`tiles_bg/`, `tiles_lab/`, `vendor/`. Am einfachsten wird `build/` selbst
der Arbeitsordner, oder man kopiert die Skripte in einen leeren Ordner. Was
dabei entsteht, gehört nicht ins Repo; die `.gitignore` hier hält es draußen.

Gebraucht werden:

- Python mit `numpy`, `scipy`, `pandas`, `shapely` (2.x), `pyproj`,
  `osmium` (pyosmium), `contourpy`, `Pillow`, `requests`
- `curl` (die OSM-Skripte laden damit selbst herunter)
- ein Chromium-Browser für das Rendern der Grundkarte
- für die Videos `ffmpeg` mit libx264 (oder das Paket `imageio-ffmpeg`)

## 1. Downloads

| was | wohin | woher |
|---|---|---|
| VBB-Fahrplan, GTFS | `gtfs/vbb/` (entpackt) | <https://www.vbb.de/vbb-services/api-open-data/datensaetze/> |
| Fernverkehr, gtfs.de `fv_free` | `gtfs/fv/` | <https://download.gtfs.de/germany/fv_free/latest.zip> |
| Regionalverkehr, gtfs.de `rv_free` | `gtfs/rv/` | <https://download.gtfs.de/germany/rv_free/latest.zip> |
| Bahn Polen, GTFS „polish_trains“ (mkuran.pl) | `gtfs/pl/` | <https://mkuran.pl/gtfs/polish_trains.zip> |
| Bahn Tschechien, CZPTT-GTFS von obehy.cz | `gtfs/cz/` | <https://obehy.cz> |
| Geofabrik `berlin-latest.osm.pbf`, `brandenburg-latest.osm.pbf` | beliebig, für die Stadtzonen | <https://download.geofabrik.de/europe/germany/> |
| Geofabrik-Umrisse `<region>.poly` (nur für `regions_plcz.py`) | `plcz_poly/` | <https://download.geofabrik.de/europe/> |
| Leaflet 1.9.4, `leaflet.js` und `leaflet.css` | `vendor/` | <https://leafletjs.com/download.html> |

Alle übrigen OSM-Extrakte laden `osm_extract.py`, `osm_extract_plcz.py` und
`borders_extract.py` selbst, eine Region nach der anderen, mit MD5-Prüfung,
und löschen sie nach der Verarbeitung wieder — eine Deutschland-Datei passt
nicht auf jede Platte.

Der Fahrplantag ist in `gtfs_prep.py` und `gtfs_prep_plcz.py` fest eingetragen
(`DATE = 20261110`, Dienstag). Mit einem neueren Download muss er auf einen
Tag zeigen, den alle Feeds abdecken.

## 2. Die Kette

Aus dem Arbeitsordner, in dieser Reihenfolge. Jeder Schritt schreibt seine
Zählungen auf die Konsole.

```
# Fahrplan nur Deutschland: VBB + Fern- + Regionalverkehr, 07:55-13:20  (einige Minuten)
# (Grundlage der Kreise in reach_areas.py; der Hauptschritt nimmt gtfs_prep_plcz.pkl)
python -I -u -W ignore gtfs_prep.py gtfs/vbb gtfs/fv gtfs/rv       # -> data/gtfs_prep.pkl

# Radzeiten der ersten 60 min ab dem Hauptbahnhof (FOSSGIS-Valhalla, 4 Anfragen)
python -I fetch_valhalla.py hbf 52.5251 13.3694                   # -> data/hbf/exp_{car,bike,walk,net}.json

# Wo draußen Straßen gebraucht werden: Kreise um erreichte Bahnhöfe
python -I -u reach_areas.py                                       # -> data/far_missing.json, far_missing5.json

# OSM aus Geofabrik: Gleise, große Straßen, Radwege in den Kreisen (~45 min)
python -I -u osm_extract.py run                                   # -> data/osm_rail_de.json, osm_major_de.json,
                                                                  #    overpass_far3.json, overpass_far5.json
python -I -u prep_streets.py                                      # -> data/far5_segs.npz, overpass_major5.json (~2 min)

# Polen und Tschechien: Fahrplan DE + PL + CZ, 06:55-14:30        (~35 s)
python -I -u -W ignore gtfs_prep_plcz.py gtfs/vbb gtfs/fv gtfs/rv gtfs/pl gtfs/cz   # -> data/gtfs_prep_plcz.pkl

# Reichweite, beste von fünf Abfahrten 7-9 Uhr; neue Kreise       (~10 s)
python -I -u reach_areas_plcz.py                                  # -> data/far_missing6.json, reach_plcz_stops.csv
python -I regions_plcz.py                                         # optional: welche Geofabrik-Regionen nötig sind

# OSM aus Geofabrik: Wege um die neuen Bahnhöfe, Gleise und große
# Straßen in PL/CZ (~90 min, vor allem Downloads)
python -I -u osm_extract_plcz.py run                              # -> data/overpass_far6.json, osm_rail_plcz.json,
                                                                  #    overpass_major6.json
python -I -u prep_streets.py --plcz                               # -> data/far6_segs.npz (~80 s)

# Hauptschritt: Connection Scan + Rad, 25 Abfahrten 07:00-09:00,
# schnellste Verbindung, bis 5 h                                   (~35 min, viel RAM)
python -I -u build_isochronen.py hbf 52.5251 13.3694 gtfs/vbb     # -> data/hbf/streets_raw.json

# Gleise DE + PL/CZ in eine Datei (die beiden elements-Listen hintereinander)
python -I -c "import json; a = json.load(open('data/osm_rail_de.json', encoding='utf-8')); a['elements'] += json.load(open('data/osm_rail_plcz.json', encoding='utf-8'))['elements']; json.dump(a, open('data/osm_rail_all.json', 'w', encoding='utf-8'))"

# Zugabschnitte ohne Linienverlauf auf die OSM-Gleise legen        (~2 min)
python -I -u reroute_hops.py data/hbf/streets_raw.json data/hbf/streets_rr.json --rail data/osm_rail_all.json

# Webfassung ausdünnen: bis 2 h alles, bis 3 h Hauptnetz, danach große Straßen
python -I lite_streets.py data/hbf/streets_rr.json data/hbf/streets_web_lite.json

# Stadtzonen und Grenzen
python -I -u zones_extract.py <pfad>/berlin-latest.osm.pbf zones_work/berlin
python -I -u zones_extract.py <pfad>/brandenburg-latest.osm.pbf zones_work/brandenburg
python -I -u zones_build.py 0.22 350                              # -> data/zones.json
python -I -u borders_extract.py                                   # -> borders_parts/*.json
python -I -u borders_build.py                                     # -> data/borders.json

# Grundkarte: siehe Abschnitt 3, danach
python -I tiles_split.py                                          # -> tiles_bg/, tiles_lab/, tiles_lists.json
python -I trim_lab.py
python -I tiles_lowzoom.py                                        # z8-z11 für das ganze Gebiet

# Seite zusammensetzen
python -I assemble_web.py ..                                      # -> ../index.html, ../data/streets.json, ../tiles/
```

### Drei Eingaben ohne eigenes Skript

Drei Dateien in `data/` stammen aus Overpass-Abfragen vom Anfang des Projekts
und werden von keinem Skript hier erzeugt. Sie lassen sich mit denselben
Filtern aus den Geofabrik-Extrakten gewinnen (`osm_extract.py` hat die
Bausteine dafür):

| Datei | Inhalt | gebraucht von |
|---|---|---|
| `overpass_major.json` | große Straßen (`motorway` bis `tertiary`, samt `_link`) in 51,2–54,1° N, 10,9–15,8° O | `prep_streets.py`, nur als Rahmen: was darin liegt, kommt in `overpass_major5.json` |
| `overpass_minor_main.json` | `unclassified`, `cycleway`, `track` (grade1/2) in 52,07–53,17° N, 12,42–14,13° O | `build_isochronen.py`, nur für die Einstufung ins Hauptnetz (Darstellung) |
| `overpass_far.json` | um jeden Kreis aus `far_missing.json`: `residential`/`living_street` bis 4 km, `unclassified`, `cycleway` und `track` grade1/2 bis zum Kreisradius | `build_isochronen.py`, Radnetz um die entfernten Bahnhöfe |

Das Format ist das von Overpass mit `out tags geom`:
`{"elements":[{"id":…,"tags":{…},"geometry":[{"lat":…,"lon":…},…]}]}`.

### Was die Schritte tun

**`gtfs_prep.py`** liest die drei Feeds, nimmt die Fahrten des Tages im
Fenster 07:55–13:20 und legt sie als Verbindungen (Halt → nächster Halt) ab.
Fahrten, die im Regionalverkehrs-Feed *und* im VBB- oder Fernverkehrs-Feed
stehen, werden über Halte-Ereignisse erkannt (≤ 300 m, ≤ 60 s); der doppelte
Abschnitt fällt weg, die Weiterfahrt über die VBB-Grenze bleibt und bekommt
dieselbe Fahrt-ID, damit man sitzen bleiben kann. Dazu je Haltepunkt die
Wege zur Straße aus `pathways.txt` — zu Fuß und mit Rad — und die Umstiege
(VBB-Mindestumstiegszeiten, Stationswege, sonst über die Straße bis 400 m).
`bikes_allowed` entscheidet je Fahrt, ob das Rad mitdarf.

**`fetch_valhalla.py`** fragt beim Valhalla-Server der FOSSGIS je eine
Graph-Expansion über 60 Minuten ab: jede Kante mit ihrer Ankunftszeit. Das
Radprofil ist ein Trekkingrad mit 17 km/h; Auto, Fuß und ein schnelles
Radprofil liefern nur das Gerüst des Straßennetzes um Berlin. Der Server ist
ein freiwilliger Dienst — bitte nicht in einer Schleife laufen lassen.

**`reach_areas.py`** ist eine grobe Vorab-Reichweite (Zugang zum Bahnhof per
Luftlinie, dann Connection Scan) und legt fest, um welche entfernten Bahnhöfe
herum Straßen geladen werden: Kreise mit der Restzeit als Radius, höchstens
12 km. Die Listen müssen nur großzügig genug sein — wo sie zu klein sind,
fehlen später Straßen, das Ergebnis wird nicht falsch, nur lückenhaft.

**`osm_extract.py`** liest die Geofabrik-Extrakte der sechzehn Länder und
zweier polnischer Woiwodschaften mit pyosmium und schreibt Gleise, große
Straßen und die radtauglichen Wege in den Kreisen im Overpass-ähnlichen
JSON-Format. **`prep_streets.py`** verdichtet das zu kompakten Arrays und
merkt sich je Wegstück den Abstand zum nächsten Bahnhofskreis.

**`gtfs_prep_plcz.py`** macht dasselbe wie `gtfs_prep.py` im Fenster
06:55–14:30 und nimmt zwei Feeds dazu: die polnische Bahn (mkuran.pl) und die
tschechische (CZPTT von obehy.cz). Teilfahrten, die der Feed selbst als
zusammengehörig markiert (`transfers.txt`), werden eine Fahrt. Deutsche
Verbindungen mit beiden Enden in Polen oder Tschechien fallen weg; die
polnischen und tschechischen Fahrten werden mit derselben
Halte-Ereignis-Regel (≤ 300 m, ≤ 60 s, ≥ 2 Treffer) gegen die übrigen
Verbindungen geprüft, Doppeltes fällt weg. Wo eine Fahrt an der Schnittstelle
direkt anschließt, bekommt sie die ID der deutschen Fahrt — man bleibt über
die Grenze sitzen. Regionalzüge, die `rv_free` an Grenzpunkten „(Gr)“ teilt,
werden wieder zusammengesetzt. Rad: in Tschechien `bikes_allowed` je Fahrt,
in Polen kein Rad im EIP; Ersatzbusse (ZKA, NAD) nie, alles andere ja.

**`reach_areas_plcz.py`** rechnet die Vorab-Reichweite wie `reach_areas.py`
auf dem neuen Fahrplan, aber als beste Reisezeit über die Abfahrten 07:00,
07:30, 08:00, 08:30 und 09:00, und vergleicht an einigen Kontrollbahnhöfen
(Szczecin, Poznań, Wrocław, Liberec, Děčín, Praha …) mit dem deutschen
Fahrplan allein (`gtfs_prep.pkl`, 08:00). Neue Kreise (höchstens 8 km) kommen
nur dazu, wo die alten sie nicht schon abdecken. **`regions_plcz.py`** zeigt,
welche Geofabrik-Regionen diese Kreise schneiden. Die Regionsliste in
`osm_extract_plcz.py`: elf Woiwodschaften und Tschechien, dort auch für Gleise
und große Straßen, dazu die Bundesländer mit neuen Kreisen — alle außer Berlin
und dem Saarland.

**`osm_extract_plcz.py`** nutzt die Bausteine von `osm_extract.py`: aus jeder
Region die radtauglichen Wege in den neuen Kreisen (`overpass_far6.json`), aus
den polnischen und tschechischen dazu Gleise (`osm_rail_plcz.json`, ohne
Wege, die schon in `osm_rail_de.json` stehen) und große Straßen.
`overpass_major6.json` ist `overpass_major5.json` plus diese großen Straßen
und die deutschen aus `osm_major_de.json` um die neuen Kreise.
**`prep_streets.py --plcz`** macht daraus `far6_segs.npz`, im selben Format
wie `far5_segs.npz`.

**`build_isochronen.py`** ist der Hauptschritt. Er setzt das Radnetz zusammen
(Valhalla-Kanten, Netz um Berlin, Wege um die entfernten Bahnhöfe in
Deutschland, Polen und Tschechien, im äußeren Ring nur innerhalb von 8 km,
doppelte Wegstücke aus `far5_segs.npz` und `far6_segs.npz` nur einmal),
verlängert die Valhalla-Zeiten über 60 Minuten hinaus mit einem eigenen
Dijkstra, dessen Tempo an den Valhalla-Zeiten kalibriert ist (`isolib.py`), und
rechnet dann für jede Abfahrt von 07:00 bis 09:00 im 5-Minuten-Takt
(25 Abfahrten) einen **Connection Scan** nur über Fahrten mit Radmitnahme. Je
Bahnsteig bleibt die beste Reisezeit ab der jeweiligen Abfahrt und die Fahrt,
die sie erreicht; ab diesen Bestzeiten läuft **ein** Mehrquellen-Dijkstra auf
dem Radnetz. Je Straße bleiben die Reisezeit und das höchstrangige
Verkehrsmittel der Reise; je Halt-Paar die gefahrenen Abschnitte der
schnellsten Fahrten, entlang der VBB-Linienverläufe (`shapes.txt`, daher das
GTFS-Verzeichnis als Argument). Kodiert wird in 10-s-Schritten als
Varint-Deltas, bis 3 h alle Straßen, danach nur das Hauptnetz.

**`reroute_hops.py`** nimmt jeden Zugabschnitt, der danach noch eine gerade
Linie zwischen zwei Halten ist — Fern- und Regionalverkehr außerhalb des VBB
und die Bahn in Polen und Tschechien haben keine Linienverläufe —, und routet
ihn auf einem Gleisgraphen aus OSM (`railgraph.py`; Abstell- und Werksgleise
teurer, U-Bahn auf U-Bahn-Gleisen). Mit `--rail data/osm_rail_all.json`
bekommt er die deutschen und die polnisch-tschechischen Gleise zusammen.
`hopcodec.py` ist die Kodierung dieser Abschnitte.

**`lite_streets.py`** dünnt die Straßen für den Browser aus; die Fläche je
Zeitschritt ist davon unberührt, sie wird vorher aus allen Straßen gezählt.

**`zones_extract.py` / `zones_build.py`** bauen die drei Stadtzonen:
Innenstadt aus der Gebäudedichte (Schwelle und Radius als Argumente), Berlin
und das Berliner Umland aus den OSM-Gemeindegrenzen, mit der Gemeindeliste
des LEP HR 2019. **`borders_extract.py` / `borders_build.py`** holen die
deutsche Grenzrelation und bauen daraus Brandenburgs Umriss, die Linien der
Außengrenze und die Beschriftung der Nachbarländer.

## 3. Die Grundkarte

Die Kacheln in `tiles/` sind OpenFreeMap, einmal im Browser gerendert und in
zwei Lagen geteilt: **Hintergrund** ohne Schrift (`tiles/bg/`) und
**Beschriftung** auf transparentem Grund (`tiles/lab/`), damit die Namen über
den Straßen der Animation liegen können.

1. `python render_server.py` startet einen kleinen Server auf
   <http://127.0.0.1:8766/render_tiles.html>; er speichert jedes gerenderte
   Bild nach `renders/<name>.png`.
2. Auf der Seite für jede Region `await renderRegion(z, x0, y0, x1, y1, name)`
   aufrufen. Eine Region ist ein Kachelrechteck `[z, x0, y0, x1, y1]`; die
   Listen liegen in `tiles_regions_*.json`:

   | Datei, Schlüssel | Namen | Lage |
   |---|---|---|
   | `tiles_regions_detail.json`, `bg2` | `bg2_<i>` | Hintergrund z12–z14 |
   | `tiles_regions_detail.json`, `labels2` | `lab2_<i>` | Beschriftung z8–z14 |
   | `tiles_regions_base.json`, `bg11` | `bg11_<i>` | Hintergrund z11 um Berlin |
   | `tiles_regions_lowzoom.json`, `bg11` | `bg8_<i>` | Hintergrund z11, ganzes Gebiet |
   | `tiles_regions_lowzoom.json`, `labels` | `lab8_<i>` | Beschriftung z8–z11, ganzes Gebiet |

   Vorher die Schalter setzen: `window.PR = 2` (doppelte Pixeldichte, so
   erwarten es die Kachelskripte), `window.MODE = 'bg'` oder `'labels'`,
   `window.CALM = true` für gedämpfte Farben und nach Zoom gestaffelte
   Beschriftung, wahlweise `window.BUILT = true`, damit Bebauung leicht
   sichtbar wird.
3. `tiles_split.py` schneidet die Bilder in 512-px-Kacheln (WebP) und rechnet
   z10 bis z8 durch Verkleinern aus z11, mit einer leichten
   Kontrastanhebung (`tiles_lib.py`); `trim_lab.py` entfernt fast
   unsichtbare Saumpixel aus der Beschriftung; `tiles_lowzoom.py` baut z8 bis
   z11 für das ganze Gebiet bis an die Ränder Deutschlands neu.

`assemble_web.py` nimmt davon, was die Seite braucht, und lässt einen Teil
der z11-Beschriftung weg (`keep_bg`, `keep_lab`).

## 4. Videos (optional)

Die MP4s entstehen aus der fertigen Seite, Bild für Bild und unabhängig von
der Rechnerleistung: `video_export.js` stellt die Animationszeit selbst
weiter, zeichnet Karte, Straßen, Züge, Zonen und eine Einblendung in ein
Canvas und schickt jedes Bild an `video_server.py`, der es an ffmpeg
weiterreicht.

```
python -I video_server.py --out video_out      # http://127.0.0.1:8767/, ffmpeg aus $FFMPEG, imageio-ffmpeg oder PATH
```

Dann die zusammengesetzte Seite über diesen Server öffnen, `video_export.js`
in der Konsole laden und zum Beispiel:

```
await VIDEO.preview({T: 45})                                   // ein Standbild bei 45 min
await VIDEO.start({to: 30, name: 'probe.mp4'})                 // die ersten 30 Kartenminuten
await VIDEO.start({fps: 60, name: 'quer.mp4'})                 // ganz, 1920 x 1080
await VIDEO.start({fps: 60, w: 1080, h: 1920, name: 'hoch.mp4'})   // hochkant
```

Alle Optionen stehen im Kopf von `video_export.js`.

## Dateien

| Datei | |
|---|---|
| `gtfs_prep.py` | Fahrplan aus VBB, gtfs.de fv/rv |
| `fetch_valhalla.py` | Valhalla-Expansionen ab dem Start |
| `reach_areas.py` | Kreise um die entfernten Bahnhöfe |
| `osm_extract.py` | Gleise, Straßen, Radwege aus Geofabrik |
| `prep_streets.py` | kompakte Straßen-Arrays für den Hauptschritt (`--plcz`: für Polen/Tschechien) |
| `gtfs_prep_plcz.py` | Fahrplan aus VBB, gtfs.de fv/rv, Bahn Polen und Tschechien |
| `reach_areas_plcz.py`, `regions_plcz.py` | neue Kreise mit Polen/Tschechien, nötige Geofabrik-Regionen |
| `osm_extract_plcz.py` | Wege, Gleise, große Straßen für die Erweiterung aus Geofabrik |
| `isolib.py` | Graph, Dijkstra, Valhalla-Fortsetzung, Flächenreihe |
| `build_isochronen.py` | Hauptschritt: Connection Scan + Rad, schnellste Verbindung 7–9 Uhr |
| `railgraph.py`, `hopcodec.py`, `reroute_hops.py` | Zugabschnitte auf die Gleise |
| `lite_streets.py` | Webfassung der Straßendaten |
| `zones_extract.py`, `zones_build.py` | Innenstadt, Berlin, Umland |
| `borders_extract.py`, `borders_build.py` | Brandenburg und Außengrenze |
| `render_tiles.html`, `render_server.py` | Grundkarte im Browser rendern |
| `tiles_lib.py`, `tiles_split.py`, `trim_lab.py`, `tiles_lowzoom.py`, `tiles_regions_*.json` | Kacheln schneiden |
| `template.html`, `assemble_web.py` | die Seite |
| `video_export.js`, `video_server.py` | Videos |
