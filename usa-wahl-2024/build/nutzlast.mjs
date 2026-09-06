import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { rechne } from './gn.mjs';
import { packe } from './code.mjs';

const BREITE = 10000;

// Das Kartogramm zu rechnen dauert Minuten. Geometrie und Einwohnerzahlen
// aendern sich zwischen Laeufen nicht, darum wird das Ergebnis abgelegt.
// Loeschen erzwingt eine Neuberechnung.
const CACHE = 'kartogramm-cache.json';

export function baueNutzlast({ gitter = 1800, durchgaenge = 10, log = () => {} } = {}) {
  let g;
  if (existsSync(CACHE)) {
    const c = JSON.parse(readFileSync(CACHE, 'utf8'));
    if (c.gitter === gitter && c.durchgaenge === durchgaenge) {
      log('  Kartogramm aus ' + CACHE);
      g = {
        gebiete: c.gebiete.map(r => r.map(a => Int32Array.from(a))),
        daten: c.daten,
        X: Float64Array.from(c.X), Y: Float64Array.from(c.Y),
        geoX: Float64Array.from(c.geoX), geoY: Float64Array.from(c.geoY),
        bilanz: c.bilanz,
      };
    }
  }
  if (!g) {
    g = rechne({ breite: gitter, durchgaenge, log });
    writeFileSync(CACHE, JSON.stringify({
      gitter, durchgaenge,
      gebiete: g.gebiete.map(r => r.map(a => Array.from(a))),
      daten: g.daten,
      X: Array.from(g.X), Y: Array.from(g.Y),
      geoX: Array.from(g.geoX), geoY: Array.from(g.geoY),
      bilanz: g.bilanz,
    }));
    log('  Kartogramm in ' + CACHE + ' abgelegt');
  }
  const { gebiete, daten, X, Y, geoX, geoY, bilanz } = g;

  const rahmen = (px, py) => {
    let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity;
    for (let i = 0; i < px.length; i++) {
      if (px[i] < a) a = px[i]; if (px[i] > b) b = px[i];
      if (py[i] < c) c = py[i]; if (py[i] > d) d = py[i];
    }
    return { minX: a, maxX: b, minY: c, maxY: d, w: b - a, h: d - c };
  };
  const rG = rahmen(geoX, geoY), rK = rahmen(X, Y);
  const skala = BREITE / Math.max(rG.w, rK.w);
  const hoehe = Math.round(Math.max(rG.h, rK.h) * skala);

  const raster = (px, py, r) => {
    const qx = new Int32Array(px.length), qy = new Int32Array(py.length);
    const vx = (BREITE - r.w * skala) / 2 - r.minX * skala;
    const vy = (hoehe - r.h * skala) / 2 - r.minY * skala;
    for (let i = 0; i < px.length; i++) {
      qx[i] = Math.round(px[i] * skala + vx);
      qy[i] = Math.round(py[i] * skala + vy);
    }
    return { qx, qy };
  };
  const G = raster(geoX, geoY, rG), K = raster(X, Y, rK);

  const delta = arr => { const d = new Array(arr.length); let v = 0; for (let i = 0; i < arr.length; i++) { d[i] = arr[i] - v; v = arr[i]; } return d; };
  const nutz = {
    breite: BREITE, hoehe,
    gx: packe(delta(G.qx)), gy: packe(delta(G.qy)),
    kx: packe(delta(K.qx)), ky: packe(delta(K.qy)),
    ringe: packe(gebiete.flatMap(g2 => g2.map(r => r.length))),
    ringzahl: packe(gebiete.map(g2 => g2.length)),
    idx: packe(gebiete.flatMap(g2 => g2.flatMap(r => { const d = []; let v = 0; for (const id of r) { d.push(id - v); v = id; } return d; }))),
  };

  return { nutz, daten, bilanz, knoten: geoX.length };
}
