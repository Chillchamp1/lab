import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { rechneAlles } from './kartogramme.mjs';
import { packe } from './code.mjs';

const BREITE = 10000;
const CACHE = 'kartogramm-cache.json';

// Legt Alaska und Hawaii über dem Festland ab, in Kilometern des gemeinsamen
// Massstabs. Verankert wird am Schwerpunkt: Alaska schrumpft dadurch an Ort
// und Stelle, statt in eine Ecke zu wandern.
const PLATZ = {
  alaska: { x: 1150, y: -1180 },
  hawaii: { x: 3650, y: -720 },
};

function schwerpunkt(X, Y) {
  let cx = 0, cy = 0;
  for (let i = 0; i < X.length; i++) { cx += X[i]; cy += Y[i]; }
  return { cx: cx / X.length, cy: cy / Y.length };
}

export function baueNutzlast({ gitter = 2000, durchgaenge = 6, log = () => {} } = {}) {
  let r;
  if (existsSync(CACHE)) {
    const c = JSON.parse(readFileSync(CACHE, 'utf8'));
    if (c.gitter === gitter && c.durchgaenge === durchgaenge && c.fassung === 2) {
      log('  Kartogramm aus ' + CACHE);
      r = c.gruppen;
      for (const g of Object.values(r)) {
        g.gebiete = g.gebiete.map(a => a.map(b => Int32Array.from(b)));
        for (const k of ['X', 'Y', 'geoX', 'geoY']) g[k] = Float64Array.from(g[k]);
      }
      r.bilanz = c.bilanz;
    }
  }
  if (!r) {
    const roh = rechneAlles({ gitter, durchgaenge, log });
    r = { conus: roh.conus, alaska: roh.alaska, hawaii: roh.hawaii, bilanz: roh.bilanz };
    writeFileSync(CACHE, JSON.stringify({
      gitter, durchgaenge, fassung: 2, bilanz: roh.bilanz,
      gruppen: Object.fromEntries(['conus', 'alaska', 'hawaii'].map(n => [n, {
        gebiete: r[n].gebiete.map(a => a.map(b => Array.from(b))),
        daten: r[n].daten,
        X: Array.from(r[n].X), Y: Array.from(r[n].Y),
        geoX: Array.from(r[n].geoX), geoY: Array.from(r[n].geoY),
      }])),
    }));
    log('  Kartogramm in ' + CACHE + ' abgelegt');
  }

  // Einsätze an ihren Platz schieben, in beiden Zuständen gleich
  const verschoben = {};
  for (const name of ['conus', 'alaska', 'hawaii']) {
    const g = r[name];
    const X = g.X.slice(), Y = g.Y.slice(), gX = g.geoX.slice(), gY = g.geoY.slice();
    if (PLATZ[name]) {
      const zielX = PLATZ[name].x * 1000, zielY = PLATZ[name].y * 1000;
      for (const [px, py] of [[X, Y], [gX, gY]]) {
        const { cx, cy } = schwerpunkt(px, py);
        for (let i = 0; i < px.length; i++) { px[i] += zielX - cx; py[i] += zielY - cy; }
      }
    } else {
      // Festland: linke obere Ecke der Geografie auf den Ursprung
      let minX = Infinity, minY = Infinity;
      for (let i = 0; i < gX.length; i++) { if (gX[i] < minX) minX = gX[i]; if (gY[i] < minY) minY = gY[i]; }
      const mitteGeo = schwerpunkt(gX, gY), mitteKar = schwerpunkt(X, Y);
      for (let i = 0; i < gX.length; i++) { gX[i] -= minX; gY[i] -= minY; }
      // Kartogramm auf denselben Schwerpunkt legen wie die Geografie
      const dx = (mitteGeo.cx - minX) - mitteKar.cx, dy = (mitteGeo.cy - minY) - mitteKar.cy;
      for (let i = 0; i < X.length; i++) { X[i] += dx; Y[i] += dy; }
    }
    verschoben[name] = { gebiete: g.gebiete, daten: g.daten, X, Y, geoX: gX, geoY: gY };
  }

  // Alles zu einer Knotenliste zusammenfassen
  const alleGeoX = [], alleGeoY = [], alleKarX = [], alleKarY = [];
  const gebiete = [], daten = [];
  for (const name of ['conus', 'alaska', 'hawaii']) {
    const g = verschoben[name];
    const versatz = alleGeoX.length;
    for (let i = 0; i < g.geoX.length; i++) {
      alleGeoX.push(g.geoX[i]); alleGeoY.push(g.geoY[i]);
      alleKarX.push(g.X[i]); alleKarY.push(g.Y[i]);
    }
    g.gebiete.forEach((ringe, i) => {
      gebiete.push(ringe.map(rr => Int32Array.from(rr, n => n + versatz)));
      daten.push({ ...g.daten[i], gruppe: name });
    });
  }

  // Gemeinsamer Rahmen: die Geografie bestimmt die Bildgrösse
  let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity;
  for (let i = 0; i < alleGeoX.length; i++) {
    if (alleGeoX[i] < a) a = alleGeoX[i]; if (alleGeoX[i] > b) b = alleGeoX[i];
    if (alleGeoY[i] < c) c = alleGeoY[i]; if (alleGeoY[i] > d) d = alleGeoY[i];
  }
  const rand = (b - a) * 0.012;
  a -= rand; b += rand; c -= rand; d += rand;
  const skala = BREITE / (b - a);
  const hoehe = Math.round((d - c) * skala);

  const raster = (px, py) => {
    const qx = new Int32Array(px.length), qy = new Int32Array(py.length);
    for (let i = 0; i < px.length; i++) { qx[i] = Math.round((px[i] - a) * skala); qy[i] = Math.round((py[i] - c) * skala); }
    return { qx, qy };
  };
  const G = raster(alleGeoX, alleGeoY), K = raster(alleKarX, alleKarY);

  const delta = arr => { const o = new Array(arr.length); let v = 0; for (let i = 0; i < arr.length; i++) { o[i] = arr[i] - v; v = arr[i]; } return o; };
  const nutz = {
    breite: BREITE, hoehe,
    gx: packe(delta(G.qx)), gy: packe(delta(G.qy)),
    kx: packe(delta(K.qx)), ky: packe(delta(K.qy)),
    ringe: packe(gebiete.flatMap(g => g.map(rr => rr.length))),
    ringzahl: packe(gebiete.map(g => g.length)),
    idx: packe(gebiete.flatMap(g => g.flatMap(rr => { const o = []; let v = 0; for (const n of rr) { o.push(n - v); v = n; } return o; }))),
  };

  return { nutz, daten, bilanz: r.bilanz, knoten: alleGeoX.length };
}
