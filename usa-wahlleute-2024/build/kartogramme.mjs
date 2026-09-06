// Kartogramm der Bundesstaaten nach Wahlleuten, in einem gemeinsamen Massstab.
//
// Alaska und Hawaii sind je ein einziges Gebiet; ihr Kartogramm ist deshalb
// eine reine Skalierung um den Schwerpunkt und exakt. Nur das Festland braucht
// das Diffusionsverfahren.

import { baueGruppen } from './vorbereiten.mjs';
import { baueDichte } from './raster.mjs';
import { diffusionsKartogramm } from './diffusion.mjs';
import { flaecheUndZentrum, ringVorzeichen, gefalteteRinge } from './geometrie.mjs';

export const gewicht = d => d.wahlleute;

function flaechen(gebiete, X, Y) {
  return gebiete.map(g => flaecheUndZentrum(g, X, Y).flaeche);
}

function bilanz(gebiete, X, Y, werte) {
  const fl = flaechen(gebiete, X, Y);
  const S = fl.reduce((a, b) => a + b, 0), W = werte.reduce((a, b) => a + b, 0);
  const abw = fl.map((f, i) => Math.abs(f / (S * werte[i] / W) - 1));
  const s = [...abw].sort((a, b) => a - b);
  let gew = 0;
  for (let i = 0; i < abw.length; i++) gew += werte[i] * abw[i];
  return {
    median: s[Math.floor(s.length / 2)], max: s[s.length - 1],
    ueber1: s.filter(a => a > 0.01).length,
    gewichtet: gew / W * 100,
  };
}

function diffusion(gr, { breite, durchgaenge, rand = 0.35, log = () => {} }) {
  const werte = gr.daten.map(gewicht);
  const vz = ringVorzeichen(gr.gebiete, gr.X, gr.Y);
  let bestX = gr.X.slice(), bestY = gr.Y.slice();
  let bester = bilanz(gr.gebiete, gr.X, gr.Y, werte).median;

  for (let d = 1; d <= durchgaenge; d++) {
    const R = baueDichte(gr.gebiete, gr.X, gr.Y, werte, { breite, rand });
    const PX = new Float64Array(gr.X.length), PY = new Float64Array(gr.Y.length);
    for (let i = 0; i < gr.X.length; i++) { PX[i] = R.nachGitter.x(gr.X[i]); PY[i] = R.nachGitter.y(gr.Y[i]); }
    diffusionsKartogramm(R.dichte, R.breite, R.hoehe, PX, PY, { wachstum: 1.05, unterschritte: 8, log: () => {} });
    for (let i = 0; i < gr.X.length; i++) { gr.X[i] = R.nachWelt.x(PX[i]); gr.Y[i] = R.nachWelt.y(PY[i]); }
    const b = bilanz(gr.gebiete, gr.X, gr.Y, werte);
    const f = gefalteteRinge(gr.gebiete, gr.X, gr.Y, vz);
    log(`    Durchgang ${d}: Median ${(b.median * 100).toFixed(2)}%  Max ${(b.max * 100).toFixed(1)}%  gefaltet ${f.kaputt}`);
    if (b.median < bester && f.kaputt <= 4) { bester = b.median; bestX = gr.X.slice(); bestY = gr.Y.slice(); }
  }
  gr.X.set(bestX); gr.Y.set(bestY);
  return bilanz(gr.gebiete, gr.X, gr.Y, werte);
}

function skaliereAufZiel(gr, zielDichte) {
  for (let i = 0; i < gr.gebiete.length; i++) {
    const { flaeche, cx, cy } = flaecheUndZentrum(gr.gebiete[i], gr.X, gr.Y);
    const k = Math.sqrt((gewicht(gr.daten[i]) / zielDichte) / flaeche);
    const gesehen = new Set();
    for (const ring of gr.gebiete[i]) for (const n of ring) {
      if (gesehen.has(n)) continue;
      gesehen.add(n);
      gr.X[n] = cx + (gr.X[n] - cx) * k;
      gr.Y[n] = cy + (gr.Y[n] - cy) * k;
    }
  }
}

export function rechneAlles({ gitter = 1400, durchgaenge = 8, log = () => {} } = {}) {
  const { conus, alaska, hawaii } = baueGruppen();
  for (const gr of [conus, alaska, hawaii]) { gr.geoX = gr.X.slice(); gr.geoY = gr.Y.slice(); }

  log('  Festland:');
  const bConus = diffusion(conus, { breite: gitter, durchgaenge, log });

  const flConus = flaechen(conus.gebiete, conus.X, conus.Y).reduce((a, b) => a + b, 0);
  const evConus = conus.daten.reduce((a, d) => a + gewicht(d), 0);
  const zielDichte = evConus / flConus;
  log(`  Massstab: ${(zielDichte * 1e6 * 1e6).toFixed(2)} Wahlleute je Million km² der Zeichenfläche`);

  log('  Alaska und Hawaii: reine Skalierung');
  skaliereAufZiel(alaska, zielDichte);
  skaliereAufZiel(hawaii, zielDichte);

  return {
    conus, alaska, hawaii, zielDichte,
    bilanz: {
      conus: bConus,
      alaska: bilanz(alaska.gebiete, alaska.X, alaska.Y, alaska.daten.map(gewicht)),
      hawaii: bilanz(hawaii.gebiete, hawaii.X, hawaii.Y, hawaii.daten.map(gewicht)),
    },
  };
}
