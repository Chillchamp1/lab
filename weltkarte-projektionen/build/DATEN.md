# Rohdaten für den Neubau

Die Skripte laden nichts herunter. Diese eine Datei muss neben ihnen liegen
(entpackt, im selben Ordner wie `build.mjs`):

| Datei | Quelle |
|---|---|
| `ne_50m_admin_0_countries.geojson` | [Natural Earth 1:50 m, Admin 0 – Countries](https://www.naturalearthdata.com/downloads/50m-cultural-vectors/) — GeoJSON-Fassung im [Repo `nvkelso/natural-earth-vector`](https://github.com/nvkelso/natural-earth-vector/tree/master/geojson) (2,9 MB) |

Natural Earth ist gemeinfrei; eine Namensnennung ist nicht vorgeschrieben,
steht aber im Fussbereich der Seite.

```
node build.mjs > ../index.html
```

Rechnet in wenigen Sekunden. Die Proben (Abweichung zwischen den beiden
flächentreuen Netzen, Kugelintegral gegen Lambert, Punktzahl, Nutzlast) laufen
dabei auf die Fehlerausgabe.

## Warum 1:50 m und nicht 1:110 m

Die kleinere Auflösung wäre ein Fünftel so gross, lässt aber **65 Staaten
komplett weg** — Kap Verde, Komoren, Seychellen, Mauritius, Malediven,
São Tomé, Singapur, Malta und die gesamte pazifische Inselwelt. Eine Karte
darüber, wer zu klein dargestellt wird, darf nicht selbst die Kleinen
wegwerfen.

Dazu kommt ein technischer Grund: 1:50 m ist bereits dicht genug. Von rund
98.000 Kanten überschreiten neun einen Bogengrad. Bei 1:110 m müsste man vor
dem Projizieren nachverdichten, sonst laufen gerade Grenzen — der 49.
Breitengrad zwischen den USA und Kanada, Ägypten–Libyen, die Unterkante der
Antarktis — im Zielnetz falsch, weil eine im Gradnetz gerade Strecke dort
gekrümmt ist.

## Was wo liegt

| Datei | Aufgabe |
|---|---|
| `geometrie.mjs` | Die vier Netze, Kugelflächen, Flächen in der Ebene |
| `nutzlast.mjs` | Einlesen, Kennzahlen, Umrisse packen |
| `code.mjs` | Kompakte Kodierung der Koordinaten für die Seite |
| `seite.js` | Der Teil, der im Browser läuft — wird unverändert eingebettet |
| `build.mjs` | Erzeugt die fertige `index.html` |

`seite.js` enthält dieselben vier Netzformeln noch einmal. Das ist Absicht:
gerechnet wird im Browser, nicht beim Bauen, damit nur ein Satz Koordinaten
in geografischen Graden ausgeliefert werden muss statt vier Sätze fertiger
Bildschirmkoordinaten. Ändert sich eine Formel, muss sie an beiden Stellen
geändert werden — die Probe dagegen ist die Seite selbst: die Anteilstabelle
kommt aus `geometrie.mjs`, das Bild aus `seite.js`.
