// Knotenmodell für die Countys des Festlands: gleiche Koordinaten werden zu
// einem Knoten verschweisst, damit gemeinsame Grenzen beim Verziehen des
// Kartogramms gemeinsam bleiben.

import { leseShp, leseDbf } from './shp.mjs';
import { albers } from './geometrie.mjs';
import { AUSSEN, leseErgebnisse, leseBevoelkerung } from './daten.mjs';

export function baueTopologie() {
  const shapes = leseShp('cb_2024_us_county_20m.shp');
  const attrAlle = leseDbf('cb_2024_us_county_20m.dbf');
  const erg = leseErgebnisse(), bev = leseBevoelkerung();

  const behalten = [];
  attrAlle.forEach((a, i) => {
    if (AUSSEN.has(a.STATEFP)) return;
    if (!erg.has(a.GEOID) || !bev.has(a.GEOID)) return;
    behalten.push(i);
  });

  const knoten = new Map();
  const lon = [], lat = [];
  const gebiete = behalten.map(i => shapes[i].map(r => {
    const ids = new Int32Array(r.length / 2);
    for (let k = 0, j = 0; k < r.length; k += 2) {
      const key = r[k] + ',' + r[k + 1];
      let id = knoten.get(key);
      if (id === undefined) { id = lon.length; knoten.set(key, id); lon.push(r[k]); lat.push(r[k + 1]); }
      ids[j++] = id;
    }
    return ids;
  }));

  const X = new Float64Array(lon.length), Y = new Float64Array(lon.length);
  for (let i = 0; i < lon.length; i++) {
    const [x, y] = albers(lon[i], lat[i]);
    X[i] = x; Y[i] = -y;              // Bildschirmrichtung: y nach unten
  }

  const attr = behalten.map(i => attrAlle[i]);
  const daten = attr.map(a => {
    const e = erg.get(a.GEOID), b = bev.get(a.GEOID);
    return {
      fips: a.GEOID, name: a.NAME, staat: a.STATE_NAME, kuerzel: a.STUSPS,
      gop: e.gop, dem: e.dem, gesamt: e.gesamt, einwohner: b.einwohner,
    };
  });

  return { gebiete, attr, daten, X, Y, anzahlKnoten: lon.length };
}
