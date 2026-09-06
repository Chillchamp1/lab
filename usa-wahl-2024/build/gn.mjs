// Diffusionskartogramm über mehrere Durchgänge, für die Countys des Festlands.
//
// Die Wiederholung ist hier wichtiger als in Deutschland: das kleinste County
// misst gut fünf Quadratkilometer und belegt auf dem Rechengitter zunächst
// keine einzige Zelle. Nach dem ersten Durchgang ist es gewachsen und wird
// auflösbar, der nächste Durchgang kann es genauer treffen.

import { baueTopologie } from './vorbereiten.mjs';
import { baueDichte } from './raster.mjs';
import { diffusionsKartogramm } from './diffusion.mjs';
import { flaecheUndZentrum, ringVorzeichen, gefalteteRinge } from './geometrie.mjs';

function bilanz(gebiete, X, Y, werte) {
  let summe = 0;
  const fl = gebiete.map(g => flaecheUndZentrum(g, X, Y).flaeche);
  fl.forEach(f => summe += f);
  const wSumme = werte.reduce((a, b) => a + b, 0);
  const abw = fl.map((f, i) => Math.abs(f / (summe * werte[i] / wSumme) - 1));
  const s = [...abw].sort((a, b) => a - b);
  // Der ungewichtete Median taeuscht: die groessten relativen Fehler treffen
  // menschenleere Countys, die auf der fertigen Karte unsichtbar sind.
  // Aussagekraeftiger ist der Fehler dort, wo Flaeche entsteht.
  let gewichtet = 0, flaecheGut = 0;
  for (let i = 0; i < abw.length; i++) {
    gewichtet += werte[i] * abw[i];
    if (abw[i] < 0.2) flaecheGut += fl[i];
  }
  gewichtet = gewichtet / wSumme * 100;
  flaecheGut = flaecheGut / summe * 100;
  return {
    flaechen: fl, summe, gewichtet, flaecheGut,
    median: s[Math.floor(s.length / 2)],
    p90: s[Math.floor(s.length * 0.9)],
    max: s[s.length - 1],
    ueber1: s.filter(a => a > 0.01).length,
    ueber10: s.filter(a => a > 0.10).length,
  };
}

export function rechne({ breite = 1600, wachstum = 1.05, durchgaenge = 8, rand = 0.35, maxFaltung = 12, unterschritte = 16, log = () => {} } = {}) {
  const { gebiete, attr, daten, X, Y } = baueTopologie();
  const werte = daten.map(d => Math.max(1, d.einwohner));   // Null würde die Dichte sprengen
  const geoX = X.slice(), geoY = Y.slice();
  const vorzeichen = ringVorzeichen(gebiete, X, Y);

  const start = bilanz(gebiete, X, Y, werte);
  log(`  Ausgangslage: Median ${(start.median * 100).toFixed(0)}%, über 10%: ${start.ueber10} von ${gebiete.length}`);

  let bestX = X.slice(), bestY = Y.slice(), besterMedian = start.median, besteFaltung = 0;

  for (let d = 1; d <= durchgaenge; d++) {
    const vor = bilanz(gebiete, X, Y, werte);
    const rest = werte.map((w, i) => w);   // Ziel bleibt die Einwohnerzahl

    const R = baueDichte(gebiete, X, Y, rest, { breite, rand });
    const PX = new Float64Array(X.length), PY = new Float64Array(Y.length);
    for (let i = 0; i < X.length; i++) { PX[i] = R.nachGitter.x(X[i]); PY[i] = R.nachGitter.y(Y[i]); }

    diffusionsKartogramm(R.dichte, R.breite, R.hoehe, PX, PY, { wachstum, unterschritte, log: () => {} });
    for (let i = 0; i < X.length; i++) { X[i] = R.nachWelt.x(PX[i]); Y[i] = R.nachWelt.y(PY[i]); }

    const nach = bilanz(gebiete, X, Y, werte);
    const faltung = gefalteteRinge(gebiete, X, Y, vorzeichen);
    log(`  Durchgang ${d}: Median ${(nach.median * 100).toFixed(3)}%  90% ${(nach.p90 * 100).toFixed(2)}%  Max ${(nach.max * 100).toFixed(0)}%  über 1%: ${nach.ueber1}  gefaltet ${faltung.kaputt}`);

    // Ein paar gefaltete Ringe unter dreitausend sind hinnehmbar; null zu
    // verlangen hiesse, jeden Durchgang zu verwerfen und nichts zu liefern.
    if (nach.median < besterMedian && faltung.kaputt <= maxFaltung) {
      besterMedian = nach.median; bestX = X.slice(); bestY = Y.slice(); besteFaltung = faltung.kaputt;
    }
  }

  X.set(bestX); Y.set(bestY);
  const ende = bilanz(gebiete, X, Y, werte);
  const faltung = gefalteteRinge(gebiete, X, Y, vorzeichen);

  return {
    gebiete, attr, daten, X, Y, geoX, geoY, werte,
    bilanz: {
      median: ende.median, p90: ende.p90, max: ende.max,
      gewichtet: ende.gewichtet, flaecheGut: ende.flaecheGut,
      ueber1: ende.ueber1, ueber10: ende.ueber10,
      gefaltet: faltung.kaputt, ringe: faltung.gesamt, anzahl: gebiete.length, besteFaltung,
    },
  };
}
