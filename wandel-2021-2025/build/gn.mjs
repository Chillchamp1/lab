// Diffusionskartogramm über mehrere Durchgänge.
//
// Ein einzelner Durchgang bleibt an der Gitterauflösung hängen: der kleinste
// Wahlkreis belegt nur eine Handvoll Zellen, sein Dichteberg verschwindet in
// der ersten Glättung, bevor die Punkte darauf reagieren konnten. Der Fehler
// sinkt darum nur linear mit der Auflösung.
//
// Also wird wiederholt: nach jedem Durchgang wird die bereits verformte
// Geometrie neu gerastert, und als Dichte dient, was an Ungleichheit noch
// übrig ist — Zielwert geteilt durch die aktuelle Fläche. Jeder weitere
// Durchgang hat weniger zu tun, und die Restfehler schrumpfen geometrisch.

import { baueTopologie } from './vorbereiten.mjs';
import { baueDichte } from './raster.mjs';
import { diffusionsKartogramm } from './diffusion.mjs';
import { flaecheUndZentrum, ringVorzeichen, gefalteteRinge } from './geometrie.mjs';
import { leseStruktur } from './daten.mjs';

function bilanz(gebiete, X, Y, werte) {
  let summe = 0;
  const fl = gebiete.map(g => flaecheUndZentrum(g, X, Y).flaeche);
  fl.forEach(f => summe += f);
  const wSumme = werte.reduce((a, b) => a + b, 0);
  const abw = fl.map((f, i) => Math.abs(f / (summe * werte[i] / wSumme) - 1));
  const s = [...abw].sort((a, b) => a - b);
  return {
    flaechen: fl, summe,
    median: s[Math.floor(s.length / 2)],
    max: s[s.length - 1],
    ueber1: s.filter(a => a > 0.01).length,
  };
}

export function rechne({ breite = 900, wachstum = 1.05, durchgaenge = 6, log = () => {} } = {}) {
  const { gebiete, attr, X, Y } = baueTopologie();
  const werte = attr.map(a => leseStruktur().get(Number(a.WKR_NR)).bevoelkerung);
  const geoX = X.slice(), geoY = Y.slice();
  const vorzeichen = ringVorzeichen(gebiete, X, Y);

  const start = bilanz(gebiete, X, Y, werte);
  log(`  Ausgangslage: Median ${(start.median * 100).toFixed(1)}%, Max ${(start.max * 100).toFixed(0)}%`);

  let bestX = X.slice(), bestY = Y.slice(), besterMedian = start.median;

  for (let d = 1; d <= durchgaenge; d++) {
    const vor = bilanz(gebiete, X, Y, werte);
    // Was noch auszugleichen ist: Zielwert je aktueller Fläche
    const rest = werte.map((w, i) => w / Math.max(vor.flaechen[i], 1e-9));

    const R = baueDichte(gebiete, X, Y, rest.map((r, i) => r * vor.flaechen[i]), { breite });
    const PX = new Float64Array(X.length), PY = new Float64Array(Y.length);
    for (let i = 0; i < X.length; i++) { PX[i] = R.nachGitter.x(X[i]); PY[i] = R.nachGitter.y(Y[i]); }

    diffusionsKartogramm(R.dichte, R.breite, R.hoehe, PX, PY, { wachstum, log: () => {} });
    for (let i = 0; i < X.length; i++) { X[i] = R.nachWelt.x(PX[i]); Y[i] = R.nachWelt.y(PY[i]); }

    const nach = bilanz(gebiete, X, Y, werte);
    const faltung = gefalteteRinge(gebiete, X, Y, vorzeichen);
    log(`  Durchgang ${d}: Median ${(nach.median * 100).toFixed(3)}%  Max ${(nach.max * 100).toFixed(1)}%  über 1%: ${nach.ueber1}  gefaltet ${faltung.kaputt}`);

    if (nach.median < besterMedian && faltung.kaputt === 0) {
      besterMedian = nach.median; bestX = X.slice(); bestY = Y.slice();
    }
  }

  X.set(bestX); Y.set(bestY);
  const ende = bilanz(gebiete, X, Y, werte);
  const faltung = gefalteteRinge(gebiete, X, Y, vorzeichen);

  return {
    gebiete, attr, X, Y, geoX, geoY, werte,
    bilanz: {
      median: ende.median, max: ende.max, ueber1: ende.ueber1,
      gefaltet: faltung.kaputt, ringe: faltung.gesamt,
    },
  };
}
