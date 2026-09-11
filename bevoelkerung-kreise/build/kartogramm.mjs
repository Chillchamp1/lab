// Ein Kartogramm für einen Zeitpunkt.
//
// Verfahren wie in `wahlkreise-2025`: Diffusionskartogramm nach Gastner und
// Newman (2004), über mehrere Durchgänge, weil ein einzelner an der
// Gitterauflösung hängenbleibt. Zwei Dinge kommen hier dazu.
//
// Erstens die Lücken. Für 1816, 1849 und 1864 gibt es nur preussische Zahlen;
// die übrigen Kreise haben für diese Zeitpunkte keinen Wert. Sie werden nicht
// geraten, sondern wie Meer behandelt: sie bekommen die mittlere Dichte der
// abgedeckten Kreise, strömen also weder auseinander noch zusammen, und
// gezeichnet werden sie ohnehin nicht.
//
// Zweitens der Massstab. Das Kartogramm verteilt nur um; seine Gesamtfläche
// bleibt ungefähr die der Ausgangskarte, gleich wie viele Menschen darin
// wohnen. Dass die Karte mit der Bevölkerung wächst, richtet `zeitreihe.mjs`
// hinterher ein.

import { baueDichte } from './raster.mjs';
import { diffusionsKartogramm } from './diffusion.mjs';
import { flaecheUndZentrum, ringVorzeichen, gefalteteRinge } from './geometrie.mjs';

// Gefaltete Ringe nur dort zählen, wo auch gezeichnet wird. Kreise ohne Zahl
// treiben im Strömungsfeld mit, ohne dass es jemanden stört — ihre Form wäre
// ein Fehlalarm.
function faltungAbgedeckt(gebiete, X, Y, vorzeichen, abgedeckt) {
  const teil = gebiete.filter((_, i) => abgedeckt[i]);
  let ab = 0; const teilVorz = [];
  gebiete.forEach((ringe, i) => {
    for (let k = 0; k < ringe.length; k++) if (abgedeckt[i]) teilVorz.push(vorzeichen[ab + k]);
    ab += ringe.length;
  });
  return gefalteteRinge(teil, X, Y, teilVorz);
}

function flaechen(gebiete, X, Y) {
  return gebiete.map(g => flaecheUndZentrum(g, X, Y).flaeche);
}

// Wie weit ist die Fläche eines Kreises von seinem Sollanteil entfernt?
function bilanz(gebiete, X, Y, werte, abgedeckt) {
  const fl = flaechen(gebiete, X, Y);
  let summeFl = 0, summeW = 0;
  for (let i = 0; i < fl.length; i++) if (abgedeckt[i]) { summeFl += fl[i]; summeW += werte[i]; }
  const abw = [];
  for (let i = 0; i < fl.length; i++) if (abgedeckt[i] && werte[i] > 0)
    abw.push(Math.abs(fl[i] / (summeFl * werte[i] / summeW) - 1));
  abw.sort((a, b) => a - b);
  return {
    flaechen: fl, summeFl, summeW,
    median: abw[Math.floor(abw.length / 2)] ?? 0,
    max: abw[abw.length - 1] ?? 0,
    ueber1: abw.filter(a => a > 0.01).length,
  };
}

export function rechneKartogramm({
  gebiete, X: X0, Y: Y0, werte, abgedeckt,
  gitter = 1100, rand = 0.30, durchgaenge = 5, wachstum = 1.05, meer = 'mittel', log = () => {},
}) {
  const X = Float64Array.from(X0), Y = Float64Array.from(Y0);
  // Immer eine ausdrückliche Liste, auch wenn sie alle Kreise enthält: der
  // Ausschnitt des Dichtegitters soll allein an den Kreisen hängen. In X und Y
  // schwimmen ausserdem die Knoten des Gitternetzes mit, die zu keinem Kreis
  // gehören — sie sollen den Ausschnitt nicht verschieben.
  const nurGebiete = abgedeckt.flatMap((a, i) => a ? [i] : []);
  const vorzeichen = ringVorzeichen(gebiete, X, Y);
  const geoFl = flaechen(gebiete, X0, Y0);

  let bestX = X.slice(), bestY = Y.slice();
  let besterMedian = bilanz(gebiete, X, Y, werte, abgedeckt).median;

  for (let d = 1; d <= durchgaenge; d++) {
    const vor = bilanz(gebiete, X, Y, werte, abgedeckt);
    const mittelDichte = vor.summeW / vor.summeFl;

    // Was noch auszugleichen ist. Nicht abgedeckte Kreise bekommen genau die
    // mittlere Dichte und bleiben damit in der Strömung neutral.
    const masse = werte.map((w, i) => abgedeckt[i] ? w : mittelDichte * vor.flaechen[i]);

    const R = baueDichte(gebiete, X, Y, masse, { breite: gitter, rand, nurGebiete, meer });
    const PX = new Float64Array(X.length), PY = new Float64Array(Y.length);
    for (let i = 0; i < X.length; i++) { PX[i] = R.nachGitter.x(X[i]); PY[i] = R.nachGitter.y(Y[i]); }

    diffusionsKartogramm(R.dichte, R.breite, R.hoehe, PX, PY, { wachstum });
    for (let i = 0; i < X.length; i++) { X[i] = R.nachWelt.x(PX[i]); Y[i] = R.nachWelt.y(PY[i]); }

    const nach = bilanz(gebiete, X, Y, werte, abgedeckt);
    const faltung = faltungAbgedeckt(gebiete, X, Y, vorzeichen, abgedeckt);
    log(`    Durchgang ${d}: Median ${(nach.median * 100).toFixed(3)}%  Max ${(nach.max * 100).toFixed(1)}%  über 1%: ${nach.ueber1}  gefaltet ${faltung.kaputt}`);
    if (nach.median < besterMedian && faltung.kaputt === 0) {
      besterMedian = nach.median; bestX = X.slice(); bestY = Y.slice();
    }
  }
  X.set(bestX); Y.set(bestY);

  const ende = bilanz(gebiete, X, Y, werte, abgedeckt);
  const faltung = faltungAbgedeckt(gebiete, X, Y, vorzeichen, abgedeckt);
  return {
    X, Y, geoFl,
    bilanz: { median: ende.median, max: ende.max, ueber1: ende.ueber1, gefaltet: faltung.kaputt, ringe: faltung.gesamt },
  };
}
