// Einlesen der County-Geometrie.
//
// Quelle ist `counties-10m.json` aus dem Paket `us-atlas` — TopoJSON der
// kartografischen Grenzdateien des US Census Bureau, generalisiert auf
// 1:10 000 000 und in Länge und Breite (NAD83). Warum TopoJSON die bessere
// Vorlage ist als ein Shapefile, steht in `topojson.mjs`.
//
// Der Gebietsstand liegt zwischen 2015 und 2022: Oglala Lakota County trägt
// schon die neue Kennziffer 46102, Connecticut noch seine acht Countys statt
// der neun Planungsregionen von 2022. Genau der Stand, auf den die
// Bevölkerungsreihe gerechnet ist.
//
// Zurück kommt dasselbe wie beim Shapefile-Weg der deutschen Karte: je Gebiet
// die fünfstellige Kennziffer, der Name und die Ringe in geografischen
// Koordinaten.

import { readFileSync } from 'node:fs';
import { gebiete } from './topojson.mjs';
import { AUSSEN } from './quellen.mjs';

const DATEI = 'roh/counties-10m.json';

export function ladeCountys() {
  const topo = JSON.parse(readFileSync(DATEI, 'utf8'));
  const kreise = gebiete(topo, 'counties')
    .filter(g => !AUSSEN.has(g.id.slice(0, 2)))
    .map(g => ({ ags: g.id, name: g.name, bez: '', land: g.id.slice(0, 2), ringe: g.ringe }));
  return { kreise, quelle: 'US Census Bureau, kartografische Grenzdateien, über us-atlas 3.0.1' };
}
