import { rechne } from './gn.mjs';
import { leseErgebnisse, leseStruktur } from './daten.mjs';
import { packe } from './code.mjs';

const BREITE = 10000;

export function baueNutzlast({ gitter = 1300, durchgaenge = 6, log = () => {} } = {}) {
  const { gebiete, attr, X, Y, geoX, geoY, bilanz } = rechne({ breite: gitter, durchgaenge, log });
  const erg = leseErgebnisse(), str = leseStruktur();

  // Beide Zustände in ein gemeinsames Raster, gleicher Massstab und Mittelpunkt
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
    const versatzX = (BREITE - r.w * skala) / 2 - r.minX * skala;
    const versatzY = (hoehe - r.h * skala) / 2 - r.minY * skala;
    for (let i = 0; i < px.length; i++) {
      qx[i] = Math.round(px[i] * skala + versatzX);
      qy[i] = Math.round(py[i] * skala + versatzY);
    }
    return { qx, qy };
  };
  const G = raster(geoX, geoY, rG), K = raster(X, Y, rK);

  const delta = arr => { const d = new Array(arr.length); let v = 0; for (let i = 0; i < arr.length; i++) { d[i] = arr[i] - v; v = arr[i]; } return d; };
  const nutz = {
    breite: BREITE, hoehe,
    gx: packe(delta(G.qx)), gy: packe(delta(G.qy)),
    kx: packe(delta(K.qx)), ky: packe(delta(K.qy)),
    ringe: packe(gebiete.flatMap(g => g.map(r => r.length))),
    ringzahl: packe(gebiete.map(g => g.length)),
    idx: packe(gebiete.flatMap(g => g.flatMap(r => { const d = []; let v = 0; for (const id of r) { d.push(id - v); v = id; } return d; }))),
  };

  const gebieteDaten = attr.map(a => {
    const nr = Number(a.WKR_NR), e = erg.get(nr), s = str.get(nr);
    const sortiert = Object.entries(e.stimmen).filter(([, v]) => v > 0).sort((x, y) => y[1] - x[1]);
    return {
      nr, name: a.WKR_NAME, land: a.LAND_NAME,
      bev: Math.round(s.bevoelkerung), flaeche: s.flaeche,
      gueltig: e.gueltig, wahlberechtigte: e.wahlberechtigte, waehlende: e.waehlende,
      top: sortiert.slice(0, 6).map(([p, v]) => [p, v]),
    };
  });

  return { nutz, gebieteDaten, bilanz, knoten: geoX.length };
}
