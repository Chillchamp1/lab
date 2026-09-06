// Knotenmodell in drei Gruppen: Festland, Alaska, Hawaii — hier auf Ebene der
// Bundesstaaten. Getrennt, weil die drei geografisch nicht zusammenhängen.

import { leseShp, leseDbf } from './shp.mjs';
import { albers } from './geometrie.mjs';
import { ALASKA, HAWAII, leseWahlleute, leseStaatsErgebnisse } from './daten.mjs';

// Die Aleuten liegen jenseits der Datumsgrenze; ohne Entwirren zerreisst
// jede Projektion.
const entwirre = lon => lon > 0 ? lon - 360 : lon;

function verschweisse(teile, projektion) {
  const knoten = new Map();
  const lon = [], lat = [];
  const gebiete = teile.map(ringe => ringe.map(r => {
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
    const [x, y] = projektion(lon[i], lat[i]);
    X[i] = x; Y[i] = -y;
  }
  return { gebiete, X, Y };
}

export function baueGruppen() {
  const shapes = leseShp('cb_2024_us_state_20m.shp');
  const attr = leseDbf('cb_2024_us_state_20m.dbf');
  const ev = leseWahlleute(), erg = leseStaatsErgebnisse();

  const nimm = (fips, projektion, umLon = x => x) => {
    const idx = attr.map((a, i) => i).filter(i => fips(attr[i].STATEFP));
    const ringe = idx.map(i => shapes[i].map(r => {
      const k = new Float64Array(r.length);
      for (let j = 0; j < r.length; j += 2) { k[j] = umLon(r[j]); k[j + 1] = r[j + 1]; }
      return k;
    }));
    const gr = verschweisse(ringe, projektion);
    gr.daten = idx.map(i => {
      const a = attr[i], e = erg[a.STATEFP];
      return {
        fips: a.STATEFP, name: a.NAME, kuerzel: a.STUSPS,
        wahlleute: ev[a.STATEFP],
        gop: e.gop, dem: e.dem, gesamt: e.gesamt,
      };
    });
    return gr;
  };

  const conus = nimm(f => ev[f] !== undefined && f !== ALASKA && f !== HAWAII, albers);
  const alaska = nimm(f => f === ALASKA,
    (lon, lat) => albers(lon, lat, { lon0: -152, lat0: 55, lat1: 55, lat2: 65 }), entwirre);
  const hawaii = nimm(f => f === HAWAII,
    (lon, lat) => albers(lon, lat, { lon0: -157, lat0: 20, lat1: 19, lat2: 22 }));

  return { conus, alaska, hawaii };
}
