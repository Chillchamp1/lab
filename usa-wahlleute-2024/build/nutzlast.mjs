import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { rechneAlles } from './kartogramme.mjs';
import { flaecheUndZentrum } from './geometrie.mjs';
import { packe } from './code.mjs';

const BREITE = 10000;
const CACHE = 'kartogramm-cache.json';

// Senkrecht knapp, damit die Einsätze am Festland kleben; waagerecht
// grosszügiger, weil Alaskas Aleutenkette sonst mit Hawaii verschmilzt.
const LUECKE_Y = 130, LUECKE_X = 420;

function rahmen(X, Y) {
  let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity;
  for (let i = 0; i < X.length; i++) {
    if (X[i] < a) a = X[i]; if (X[i] > b) b = X[i];
    if (Y[i] < c) c = Y[i]; if (Y[i] > d) d = Y[i];
  }
  return { minX: a, maxX: b, minY: c, maxY: d, w: b - a, h: d - c };
}

const schiebe = (X, Y, dx, dy) => {
  for (let i = 0; i < X.length; i++) { X[i] += dx; Y[i] += dy; }
};

export function baueNutzlast({ gitter = 1400, durchgaenge = 8, log = () => {} } = {}) {
  let r;
  if (existsSync(CACHE)) {
    const c = JSON.parse(readFileSync(CACHE, 'utf8'));
    if (c.gitter === gitter && c.durchgaenge === durchgaenge) {
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
      gitter, durchgaenge, bilanz: roh.bilanz,
      gruppen: Object.fromEntries(['conus', 'alaska', 'hawaii'].map(n => [n, {
        gebiete: r[n].gebiete.map(a => a.map(b => Array.from(b))),
        daten: r[n].daten,
        X: Array.from(r[n].X), Y: Array.from(r[n].Y),
        geoX: Array.from(r[n].geoX), geoY: Array.from(r[n].geoY),
      }])),
    }));
    log('  Kartogramm in ' + CACHE + ' abgelegt');
  }

  const verschoben = {};
  for (const name of ['conus', 'alaska', 'hawaii']) {
    const g = r[name];
    verschoben[name] = {
      gebiete: g.gebiete, daten: g.daten,
      X: g.X.slice(), Y: g.Y.slice(), geoX: g.geoX.slice(), geoY: g.geoY.slice(),
    };
  }

  // Festland: Geografie auf den Ursprung, Kartogramm mittig darauf
  {
    const c = verschoben.conus;
    const rG = rahmen(c.geoX, c.geoY);
    schiebe(c.geoX, c.geoY, -rG.minX, -rG.minY);
    const rG2 = rahmen(c.geoX, c.geoY), rK = rahmen(c.X, c.Y);
    schiebe(c.X, c.Y,
      (rG2.minX + rG2.w / 2) - (rK.minX + rK.w / 2),
      (rG2.minY + rG2.h / 2) - (rK.minY + rK.h / 2));
  }

  // Hawaii steht fest, Alaska wandert — es schrumpft auf ein Sechstel und
  // stünde sonst in einem der beiden Zustände verloren im Leeren.
  const rCg = rahmen(verschoben.conus.geoX, verschoben.conus.geoY);
  const rCk = rahmen(verschoben.conus.X, verschoben.conus.Y);
  const regal = Math.min(rCg.minY, rCk.minY) - LUECKE_Y * 1000;
  const linkeKante = Math.min(rCg.minX, rCk.minX);

  let hawaiiRechts;
  {
    const h = verschoben.hawaii;
    const rG = rahmen(h.geoX, h.geoY), rK = rahmen(h.X, h.Y);
    const breiteste = Math.max(rG.w, rK.w), hoechste = Math.max(rG.h, rK.h);
    const zielX = linkeKante + breiteste / 2, zielY = regal - hoechste / 2;
    for (const [fx, fy] of [['geoX', 'geoY'], ['X', 'Y']]) {
      const rr = rahmen(h[fx], h[fy]);
      schiebe(h[fx], h[fy], zielX - (rr.minX + rr.w / 2), zielY - (rr.minY + rr.h / 2));
    }
    hawaiiRechts = zielX + breiteste / 2;
  }
  for (const [fx, fy] of [['geoX', 'geoY'], ['X', 'Y']]) {
    const a = verschoben.alaska;
    const rr = rahmen(a[fx], a[fy]);
    schiebe(a[fx], a[fy], (hawaiiRechts + LUECKE_X * 1000) - rr.minX, regal - rr.maxY);
  }

  // Zu einer Knotenliste zusammenfassen
  const geoX = [], geoY = [], karX = [], karY = [];
  const gebiete = [], daten = [];
  for (const name of ['conus', 'alaska', 'hawaii']) {
    const g = verschoben[name];
    const versatz = geoX.length;
    for (let i = 0; i < g.geoX.length; i++) {
      geoX.push(g.geoX[i]); geoY.push(g.geoY[i]);
      karX.push(g.X[i]); karY.push(g.Y[i]);
    }
    g.gebiete.forEach((ringe, i) => {
      gebiete.push(ringe.map(rr => Int32Array.from(rr, n => n + versatz)));
      daten.push({ ...g.daten[i], gruppe: name });
    });
  }

  // Fester Ausschnitt für beide Zustände
  const kasten = (px, py) => {
    const rr = rahmen(px, py);
    const luft = rr.w * 0.012;
    return [rr.minX - luft, rr.minY - luft, rr.w + 2 * luft, rr.h + 2 * luft];
  };
  const kG = kasten(geoX, geoY), kK = kasten(karX, karY);
  const links = Math.min(kG[0], kK[0]), oben = Math.min(kG[1], kK[1]);
  const weltBreite = Math.max(kG[0] + kG[2], kK[0] + kK[2]) - links;
  const weltHoehe = Math.max(kG[1] + kG[3], kK[1] + kK[3]) - oben;
  const skala = BREITE / weltBreite;

  const raster = (px, py) => {
    const qx = new Int32Array(px.length), qy = new Int32Array(py.length);
    for (let i = 0; i < px.length; i++) { qx[i] = Math.round((px[i] - links) * skala); qy[i] = Math.round((py[i] - oben) * skala); }
    return { qx, qy };
  };
  const G = raster(geoX, geoY), K = raster(karX, karY);

  // Beschriftung: Schwerpunkt und Grösse je Staat, in beiden Zuständen
  const marken = gebiete.map((ringe, i) => {
    const a = flaecheUndZentrum(ringe, G.qx, G.qy);
    const b = flaecheUndZentrum(ringe, K.qx, K.qy);
    return [
      Math.round(a.cx), Math.round(a.cy), Math.round(Math.sqrt(a.flaeche)),
      Math.round(b.cx), Math.round(b.cy), Math.round(Math.sqrt(b.flaeche)),
    ];
  });

  const delta = arr => { const o = new Array(arr.length); let v = 0; for (let i = 0; i < arr.length; i++) { o[i] = arr[i] - v; v = arr[i]; } return o; };
  const nutz = {
    sicht: [0, 0, BREITE, Math.round(weltHoehe * skala)],
    gx: packe(delta(G.qx)), gy: packe(delta(G.qy)),
    kx: packe(delta(K.qx)), ky: packe(delta(K.qy)),
    ringe: packe(gebiete.flatMap(g => g.map(rr => rr.length))),
    ringzahl: packe(gebiete.map(g => g.length)),
    idx: packe(gebiete.flatMap(g => g.flatMap(rr => { const o = []; let v = 0; for (const n of rr) { o.push(n - v); v = n; } return o; }))),
    marken,
  };

  return { nutz, daten, bilanz: r.bilanz, knoten: geoX.length };
}
