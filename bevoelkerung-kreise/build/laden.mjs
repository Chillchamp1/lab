// Einlesen der Kreisgeometrie, unabhängig davon, in welcher Form sie vorliegt.
//
// Bevorzugt wird das Shapefile VG2500 des BKG (Ebene KRS), weil es bereits auf
// 1:2 500 000 generalisiert ist und den aktuellen Gebietsstand führt. Liegt es
// nicht daneben, springt ein GeoJSON-Auszug derselben BKG-Daten in feinerer
// Auflösung und älterem Stand ein; generalisiert wird dann in `topologie.mjs`.
//
// Beide Wege liefern dasselbe: je Kreis der fünfstellige AGS, Name, Bezeichnung
// und die Ringe in geografischen Koordinaten.

import { existsSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { leseShp, leseDbf } from './shp.mjs';
import { utmNachGeo } from './geometrie.mjs';

const SHAPEFILE = 'vg2500_krs.shp';
const GEOJSON = 'vg250_kreise.geo.json';

function ausShapefile() {
  const shapes = leseShp(SHAPEFILE);
  const attr = leseDbf(SHAPEFILE.replace(/\.shp$/, '.dbf'));
  const kreise = [];
  shapes.forEach((ringe, i) => {
    const a = attr[i];
    // GF 4 ist die reine Landfläche in VG250, GF 9 die Kreisfläche
    // einschliesslich Gewässer, wie VG2500 sie führt.
    if (![4, 9].includes(Number(a.GF))) return;
    kreise.push({
      ags: a.ARS ?? a.AGS ?? a.RS,
      name: a.GEN,
      bez: a.BEZ,
      land: (a.SN_L ?? String(a.ARS ?? '').slice(0, 2)),
      // VG2500 liegt in ETRS89/UTM 32N; gerechnet wird über Länge und Breite.
      ringe: ringe.map(r => {
        const g = new Array(r.length);
        for (let i = 0; i < r.length; i += 2) {
          const [lon, lat] = utmNachGeo(r[i], r[i + 1]);
          g[i] = lon; g[i + 1] = lat;
        }
        return g;
      }),
    });
  });
  return { kreise, quelle: 'BKG VG2500, Gebietsstand 01.01.2026' };
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
  return { kreise, quelle: 'BKG VG250 (GeoJSON-Auszug), Gebietsstand 01.01.2019' };
}

export function ladeKreise() {
  if (existsSync(SHAPEFILE)) return ausShapefile();
  if (existsSync(GEOJSON)) return ausGeoJson();
  throw new Error(`Weder ${SHAPEFILE} noch ${GEOJSON} gefunden — siehe DATEN.md`);
}
