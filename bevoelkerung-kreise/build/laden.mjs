// Einlesen der Kreisgeometrie, unabhängig davon, in welcher Form sie vorliegt.
//
// Bevorzugt wird das Shapefile VG2500 des BKG (Ebene KRS), weil es bereits auf
// 1:2 500 000 generalisiert ist. Liegt es nicht daneben, wird auf einen
// GeoJSON-Auszug derselben BKG-Daten in feinerer Auflösung zurückgegriffen;
// generalisiert wird dann in `topologie.mjs`.
//
// Beide Wege liefern dasselbe: je Kreis der fünfstellige AGS, Name, Bezeichnung
// und die Ringe in geografischen Koordinaten. Wasserflächen (GF = 2) fallen
// weg, gezählt wird nur das Land (GF = 4).

import { existsSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { leseShp, leseDbf } from './shp.mjs';

const SHAPEFILE = 'vg2500_krs.shp';
const GEOJSON = 'vg250_kreise.geo.json';

function ausShapefile() {
  const shapes = leseShp(SHAPEFILE);
  const attr = leseDbf(SHAPEFILE.replace(/\.shp$/, '.dbf'));
  const kreise = [];
  shapes.forEach((ringe, i) => {
    const a = attr[i];
    if (Number(a.GF) !== 4) return;
    kreise.push({
      ags: a.ARS ?? a.AGS ?? a.RS,
      name: a.GEN,
      bez: a.BEZ,
      land: (a.SN_L ?? String(a.ARS ?? '').slice(0, 2)),
      ringe: ringe.map(r => Array.from(r)),
    });
  });
  return { kreise, quelle: 'VG2500 (Shapefile)' };
}

function ausGeoJson() {
  const g = JSON.parse(readFileSync(GEOJSON, 'utf8'));
  const kreise = [];
  for (const f of g.features) {
    const p = f.properties;
    if (Number(p.GF) !== 4) continue;
    const teile = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    const ringe = [];
    for (const teil of teile) for (const ring of teil) ringe.push(ring.flat());
    kreise.push({
      ags: p.AGS ?? p.ARS ?? p.RS,
      name: p.GEN,
      bez: p.BEZ,
      land: p.SN_L ?? String(p.AGS ?? '').slice(0, 2),
      ringe,
    });
  }
  return { kreise, quelle: 'VG250 (GeoJSON-Auszug)' };
}

export function ladeKreise() {
  if (existsSync(SHAPEFILE)) return ausShapefile();
  if (existsSync(GEOJSON)) return ausGeoJson();
  throw new Error(`Weder ${SHAPEFILE} noch ${GEOJSON} gefunden — siehe DATEN.md`);
}
