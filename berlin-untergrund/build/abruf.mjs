// Friert den OSM-Stand ein: schickt ../abfrage.overpassql an Overpass und
// schreibt die Antwort nach ../data/osm.json. Liegt die Datei da, liest die
// Seite sie statt der Live-Abfrage — schneller und unabhängig von Overpass.
//
//   node berlin-untergrund/build/abruf.mjs
//
// Ohne Abhängigkeiten; braucht Node 18 oder neuer (fetch).

import { readFile, writeFile, mkdir } from 'node:fs/promises';

const hier = new URL('..', import.meta.url);
const abfrage = await readFile(new URL('abfrage.overpassql', hier), 'utf8');
const r = await fetch('https://overpass-api.de/api/interpreter', {
  method: 'POST',
  body: 'data=' + encodeURIComponent(abfrage),
  headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'chillchamp1-lab/berlin-untergrund' },
});
if (!r.ok) throw new Error(`Overpass antwortet ${r.status}: ${(await r.text()).slice(0, 300)}`);
const daten = await r.json();
await mkdir(new URL('data/', hier), { recursive: true });
await writeFile(new URL('data/osm.json', hier), JSON.stringify(daten));
const zahl = {};
for (const e of daten.elements) zahl[e.type] = (zahl[e.type] || 0) + 1;
console.log('Stand', daten.osm3s?.timestamp_osm_base, zahl);
