// Kartogramm für alle drei Gruppen, in einem gemeinsamen Massstab.
//
// Der gemeinsame Massstab ist der Punkt: im Kartogramm bekommt jeder Mensch
// überall gleich viel Fläche, auch in Alaska und Hawaii. Nur so sind die
// Einsätze mit dem Festland vergleichbar, statt bloss dekorativ danebenzustehen.
//
// Alaska ist ein einziges Gebiet, sein Kartogramm ist deshalb eine reine
// Skalierung um den Schwerpunkt — exakt, ohne Diffusion. Hawaii besteht aus
// vier getrennten Inseln, die beim Wachsen Abstand brauchen; dort läuft das
// übliche Verfahren.

import { baueGruppen } from './vorbereiten.mjs';
import { baueDichte } from './raster.mjs';
import { diffusionsKartogramm } from './diffusion.mjs';
import { flaecheUndZentrum, ringVorzeichen, gefalteteRinge } from './geometrie.mjs';

function flaechen(gebiete, X, Y) {
  return gebiete.map(g => flaecheUndZentrum(g, X, Y).flaeche);
}

function bilanz(gebiete, X, Y, werte) {
  const fl = flaechen(gebiete, X, Y);
  const S = fl.reduce((a, b) => a + b, 0), W = werte.reduce((a, b) => a + b, 0);
  const abw = fl.map((f, i) => Math.abs(f / (S * werte[i] / W) - 1));
  const s = [...abw].sort((a, b) => a - b);
  let gew = 0, gut = 0;
  for (let i = 0; i < abw.length; i++) { gew += werte[i] * abw[i]; if (abw[i] < 0.2) gut += fl[i]; }
  return {
    median: s[Math.floor(s.length / 2)], max: s[s.length - 1],
    ueber1: s.filter(a => a > 0.01).length,
    gewichtet: gew / W * 100, flaecheGut: gut / S * 100,
  };
}

function diffusion(gr, { breite, durchgaenge, rand = 0.35, log = () => {} }) {
  const werte = gr.daten.map(d => Math.max(1, d.einwohner));
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
    log(`    Durchgang ${d}: Median ${(b.median * 100).toFixed(2)}%  gewichtet ${b.gewichtet.toFixed(2)}%  gefaltet ${f.kaputt}`);
    if (b.median < bester && f.kaputt <= 12) { bester = b.median; bestX = gr.X.slice(); bestY = gr.Y.slice(); }
  }
  gr.X.set(bestX); gr.Y.set(bestY);
  return bilanz(gr.gebiete, gr.X, gr.Y, werte);
}

// Skaliert jedes Gebiet einer Gruppe um seinen Schwerpunkt auf die Zielfläche.
// Exakt für Gruppen mit einem einzigen Gebiet.
function skaliereAufZiel(gr, zielDichte) {
  for (let i = 0; i < gr.gebiete.length; i++) {
    const { flaeche, cx, cy } = flaecheUndZentrum(gr.gebiete[i], gr.X, gr.Y);
    const ziel = gr.daten[i].einwohner / zielDichte;
    const k = Math.sqrt(ziel / flaeche);
    const gesehen = new Set();
    for (const ring of gr.gebiete[i]) for (const n of ring) {
      if (gesehen.has(n)) continue;
      gesehen.add(n);
      gr.X[n] = cx + (gr.X[n] - cx) * k;
      gr.Y[n] = cy + (gr.Y[n] - cy) * k;
    }
  }
}

export function rechneAlles({ gitter = 2000, durchgaenge = 6, log = () => {} } = {}) {
  const { conus, alaska, hawaii } = baueGruppen();
  for (const gr of [conus, alaska, hawaii]) { gr.geoX = gr.X.slice(); gr.geoY = gr.Y.slice(); }

  log('  Festland:');
  const bConus = diffusion(conus, { breite: gitter, durchgaenge, log });

  // Massstab des Festland-Kartogramms: Menschen je Flächeneinheit
  const flConus = flaechen(conus.gebiete, conus.X, conus.Y).reduce((a, b) => a + b, 0);
  const einwohnerConus = conus.daten.reduce((a, d) => a + d.einwohner, 0);
  const zielDichte = einwohnerConus / flConus;
  log(`  Kartogramm-Massstab: ${(zielDichte * 1e6).toFixed(1)} Menschen je km² der Zeichenfläche`);

  log('  Hawaii:');
  const bHawaii = diffusion(hawaii, { breite: 700, durchgaenge: 5, rand: 0.6, log });
  // Danach die ganze Gruppe auf den gemeinsamen Massstab bringen
  const skaliereGruppe = (gr, k) => {
    let cx = 0, cy = 0, n = 0;
    for (let i = 0; i < gr.X.length; i++) { cx += gr.X[i]; cy += gr.Y[i]; n++; }
    cx /= n; cy /= n;
    for (let i = 0; i < gr.X.length; i++) { gr.X[i] = cx + (gr.X[i] - cx) * k; gr.Y[i] = cy + (gr.Y[i] - cy) * k; }
  };
  const flHawaii = flaechen(hawaii.gebiete, hawaii.X, hawaii.Y).reduce((a, b) => a + b, 0);
  const einwohnerHawaii = hawaii.daten.reduce((a, d) => a + d.einwohner, 0);
  skaliereGruppe(hawaii, Math.sqrt((einwohnerHawaii / zielDichte) / flHawaii));

  log('  Alaska: reine Skalierung (ein Gebiet)');
  skaliereAufZiel(alaska, zielDichte);
  const bAlaska = bilanz(alaska.gebiete, alaska.X, alaska.Y, alaska.daten.map(d => d.einwohner));

  return { conus, alaska, hawaii, zielDichte, bilanz: { conus: bConus, hawaii: bHawaii, alaska: bAlaska } };
}
