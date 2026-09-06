// Knotenmodell in drei Gruppen: Festland, Alaska, Hawaii.
//
// Getrennt, weil die drei geografisch nicht zusammenhaengen. Das
// Diffusionskartogramm arbeitet auf einem zusammenhaengenden Gebiet; Inseln
// weit draussen wuerden nur Rechengitter fuellen, ohne dass Stroemung
// zwischen ihnen und dem Festland stattfaende.

import { leseShp, leseDbf } from './shp.mjs';
import { albers } from './geometrie.mjs';
import { AUSSEN, ALASKA, HAWAII, KALAWAO, MAUI, leseErgebnisse, leseBevoelkerung, alaskaLandesweit } from './daten.mjs';

// Alaska reicht ueber die Datumsgrenze: die Aleuten liegen bei +179 Grad,
// das Festland bei -150. Ohne Verschiebung zerreisst jede Projektion.
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
  const shapes = leseShp('cb_2024_us_county_20m.shp');
  const attrAlle = leseDbf('cb_2024_us_county_20m.dbf');
  const erg = leseErgebnisse(), bev = leseBevoelkerung();

  // --- Festland samt DC -------------------------------------------------
  const conusIdx = [];
  attrAlle.forEach((a, i) => {
    if (AUSSEN.has(a.STATEFP) || a.STATEFP === ALASKA || a.STATEFP === HAWAII) return;
    if (!erg.has(a.GEOID) || !bev.has(a.GEOID)) return;
    conusIdx.push(i);
  });
  const conus = verschweisse(conusIdx.map(i => shapes[i]), albers);
  conus.daten = conusIdx.map(i => {
    const a = attrAlle[i], e = erg.get(a.GEOID), b = bev.get(a.GEOID);
    return { fips: a.GEOID, name: a.NAME, staat: a.STATE_NAME, kuerzel: a.STUSPS,
             gop: e.gop, dem: e.dem, gesamt: e.gesamt, einwohner: b.einwohner };
  });

  // --- Alaska: ein Gebiet aus allen Boroughs ----------------------------
  const akIdx = attrAlle.map((a, i) => i).filter(i => attrAlle[i].STATEFP === ALASKA);
  const akRinge = akIdx.flatMap(i => shapes[i]).map(r => {
    const k = new Float64Array(r.length);
    for (let j = 0; j < r.length; j += 2) { k[j] = entwirre(r[j]); k[j + 1] = r[j + 1]; }
    return k;
  });
  // Eigener Albers-Bezug, sonst wird Alaska von den Festland-Parametern verzerrt.
  const akProj = (lon, lat) => albers(lon, lat, { lon0: -152, lat0: 55, lat1: 55, lat2: 65 });
  const alaska = verschweisse([akRinge], akProj);
  const akErg = alaskaLandesweit(erg);
  const akBev = akIdx.reduce((a, i) => a + (bev.get(attrAlle[i].GEOID)?.einwohner ?? 0), 0);
  alaska.daten = [{ fips: '02', name: 'Alaska', staat: 'Alaska', kuerzel: 'AK',
                    gop: akErg.gop, dem: akErg.dem, gesamt: akErg.gesamt, einwohner: akBev,
                    hinweis: 'Landesergebnis; Alaska zählt nicht nach Boroughs aus' }];

  // --- Hawaii: vier Countys, Kalawao gehört zu Maui ---------------------
  const hiIdx = attrAlle.map((a, i) => i).filter(i => attrAlle[i].STATEFP === HAWAII);
  const hiGruppen = [];
  const mauiRinge = [];
  for (const i of hiIdx) {
    const a = attrAlle[i];
    if (a.GEOID === KALAWAO || a.GEOID === MAUI) { mauiRinge.push(...shapes[i]); continue; }
    hiGruppen.push({ idx: [i], geoid: a.GEOID, ringe: shapes[i] });
  }
  hiGruppen.push({ geoid: MAUI, ringe: mauiRinge });
  const hiProj = (lon, lat) => albers(lon, lat, { lon0: -157, lat0: 20, lat1: 19, lat2: 22 });
  const hawaii = verschweisse(hiGruppen.map(g => g.ringe), hiProj);
  hawaii.daten = hiGruppen.map(g => {
    const a = attrAlle.find(x => x.GEOID === g.geoid);
    const e = erg.get(g.geoid), b = bev.get(g.geoid);
    const kal = g.geoid === MAUI ? (bev.get(KALAWAO)?.einwohner ?? 0) : 0;
    return { fips: g.geoid, name: a.NAME, staat: 'Hawaii', kuerzel: 'HI',
             gop: e.gop, dem: e.dem, gesamt: e.gesamt, einwohner: b.einwohner + kal };
  });

  return { conus, alaska, hawaii };
}
