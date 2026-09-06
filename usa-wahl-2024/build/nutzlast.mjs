import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { rechneAlles } from './kartogramme.mjs';
import { packe } from './code.mjs';

const BREITE = 10000;
const CACHE = 'kartogramm-cache.json';

// Abstände in Kilometern des gemeinsamen Massstabs. Senkrecht knapp, damit
// die Einsätze am Festland kleben; waagerecht grosszügiger, weil Alaskas
// Aleutenkette sonst optisch mit Hawaiis Inseln verschmilzt.
const LUECKE_Y = 130, LUECKE_X = 420;

function rahmen(X, Y) {
  let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity;
  for (let i = 0; i < X.length; i++) {
    if (X[i] < a) a = X[i]; if (X[i] > b) b = X[i];
    if (Y[i] < c) c = Y[i]; if (Y[i] > d) d = Y[i];
  }
  return { minX: a, maxX: b, minY: c, maxY: d, w: b - a, h: d - c };
}

function schiebe(X, Y, dx, dy) {
  for (let i = 0; i < X.length; i++) { X[i] += dx; Y[i] += dy; }
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

  // Die Einsätze werden in jedem Zustand einzeln ans Festland herangerückt.
  // Wären sie fest verankert, klebte es entweder auf der Landkarte oder im
  // Kartogramm: Alaska schrumpft zwischen beiden auf ein Zehntel.
  // Reihenfolge über dem Festland: Hawaii links, Alaska rechts daneben.
  const verschoben = {};
  for (const name of ['conus', 'alaska', 'hawaii']) {
    const g = r[name];
    verschoben[name] = {
      gebiete: g.gebiete, daten: g.daten,
      X: g.X.slice(), Y: g.Y.slice(), geoX: g.geoX.slice(), geoY: g.geoY.slice(),
    };
  }

  // Festland: Geografie auf den Ursprung, Kartogramm auf denselben Schwerpunkt
  {
    const c = verschoben.conus;
    const rG = rahmen(c.geoX, c.geoY);
    schiebe(c.geoX, c.geoY, -rG.minX, -rG.minY);
    const rG2 = rahmen(c.geoX, c.geoY), rK = rahmen(c.X, c.Y);
    schiebe(c.X, c.Y,
      (rG2.minX + rG2.w / 2) - (rK.minX + rK.w / 2),
      (rG2.minY + rG2.h / 2) - (rK.minY + rK.h / 2));
  }

  // Einsätze je Zustand: Unterkante knapp über das Festland, von links nach
  // rechts aufgereiht.
  for (const zustand of [['geoX', 'geoY'], ['X', 'Y']]) {
    const [fx, fy] = zustand;
    const rC = rahmen(verschoben.conus[fx], verschoben.conus[fy]);
    const unten = rC.minY - LUECKE_Y * 1000;
    let links = rC.minX;
    for (const name of ['hawaii', 'alaska']) {
      const g = verschoben[name];
      const rr = rahmen(g[fx], g[fy]);
      schiebe(g[fx], g[fy], links - rr.minX, (unten - rr.maxY));
      links += rr.w + LUECKE_X * 1000;
    }
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

  // Bildausschnitt je Zustand. Im Kartogramm ist Alaska ein Fleck; wäre der
  // Ausschnitt fest, bliebe oben eine grosse leere Fläche stehen.
  const kasten = (qx, qy) => {
    let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity;
    for (let i = 0; i < qx.length; i++) {
      if (qx[i] < a) a = qx[i]; if (qx[i] > b) b = qx[i];
      if (qy[i] < c) c = qy[i]; if (qy[i] > d) d = qy[i];
    }
    const luft = (b - a) * 0.012;
    return [Math.round(a - luft), Math.round(c - luft), Math.round(b - a + 2 * luft), Math.round(d - c + 2 * luft)];
  };
  const sichtGeo = kasten(G.qx, G.qy), sichtKar = kasten(K.qx, K.qy);

  const delta = arr => { const o = new Array(arr.length); let v = 0; for (let i = 0; i < arr.length; i++) { o[i] = arr[i] - v; v = arr[i]; } return o; };
  const nutz = {
    breite: BREITE, hoehe, sichtGeo, sichtKar,
    gx: packe(delta(G.qx)), gy: packe(delta(G.qy)),
    kx: packe(delta(K.qx)), ky: packe(delta(K.qy)),
    ringe: packe(gebiete.flatMap(g => g.map(rr => rr.length))),
    ringzahl: packe(gebiete.map(g => g.length)),
    idx: packe(gebiete.flatMap(g => g.flatMap(rr => { const o = []; let v = 0; for (const n of rr) { o.push(n - v); v = n; } return o; }))),
  };

  return { nutz, daten, bilanz: r.bilanz, knoten: alleGeoX.length };
}
