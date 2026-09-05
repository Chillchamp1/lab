import { leseShp, leseDbf } from './shp.mjs';
import { laea } from './geometrie.mjs';

// Knotenmodell: eindeutige Koordinaten -> Index; Ringe als Index-Listen.
export function baueTopologie() {
  const shapes = leseShp('btw25_geometrie_wahlkreise_shp_geo.shp');
  const attr = leseDbf('btw25_geometrie_wahlkreise_shp_geo.dbf');
  const knoten = new Map();
  const lon = [], lat = [];
  const gebiete = shapes.map(ringe => ringe.map(r => {
    const ids = new Int32Array(r.length / 2);
    for (let i = 0, k = 0; i < r.length; i += 2) {
      const key = r[i] + ',' + r[i + 1];
      let id = knoten.get(key);
      if (id === undefined) { id = lon.length; knoten.set(key, id); lon.push(r[i]); lat.push(r[i + 1]); }
      ids[k++] = id;
    }
    return ids;
  }));
  const X = new Float64Array(lon.length), Y = new Float64Array(lon.length);
  for (let i = 0; i < lon.length; i++) { const [x, y] = laea(lon[i], lat[i]); X[i] = x; Y[i] = -y; }
  return { gebiete, attr, X, Y, anzahlKnoten: lon.length };
}
