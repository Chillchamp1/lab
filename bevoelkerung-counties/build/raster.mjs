// Rasterisiert die Wahlkreise in ein Dichtefeld für das Diffusionskartogramm.
//
// Jede Zelle bekommt die Dichte des Gebiets, in dem sie liegt: Einwohner je
// Fläche. Aussen herum liegt ein "Meer" mittlerer Dichte, damit der Rand der
// Karte sich frei bewegen kann, ohne die Verteilung im Inneren zu verzerren.

// Füllt ein Polygon (mehrere Ringe, Gerade-Ungerade-Regel) zeilenweise.
// Löcher ergeben sich dabei von selbst: sie werden doppelt gekreuzt.
function fuelle(ringe, X, Y, breite, hoehe, nachGitter, treffer) {
  let minY = Infinity, maxY = -Infinity;
  for (const r of ringe) for (const n of r) {
    const y = nachGitter.y(Y[n]);
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const von = Math.max(0, Math.floor(minY)), bis = Math.min(hoehe - 1, Math.ceil(maxY));
  const schnitte = [];

  for (let py = von; py <= bis; py++) {
    const zeile = py + 0.5;
    schnitte.length = 0;
    for (const r of ringe) {
      const n = r.length;
      for (let i = 0, j = n - 1; i < n; j = i++) {
        const y1 = nachGitter.y(Y[r[j]]), y2 = nachGitter.y(Y[r[i]]);
        if ((y1 <= zeile) === (y2 <= zeile)) continue;
        const x1 = nachGitter.x(X[r[j]]), x2 = nachGitter.x(X[r[i]]);
        schnitte.push(x1 + (zeile - y1) / (y2 - y1) * (x2 - x1));
      }
    }
    if (!schnitte.length) continue;
    schnitte.sort((a, b) => a - b);
    for (let k = 0; k + 1 < schnitte.length; k += 2) {
      const a = Math.max(0, Math.ceil(schnitte[k] - 0.5));
      const b = Math.min(breite - 1, Math.floor(schnitte[k + 1] - 0.5));
      for (let px = a; px <= b; px++) treffer(py * breite + px);
    }
  }
}

// rand: wie viel Meer um die Karte gelegt wird, als Anteil der Kartenbreite.
// nurGebiete: wenn gesetzt, richtet sich der Ausschnitt allein nach diesen
// Gebieten. Das ist nötig, solange die Reihe nur einen Teil Deutschlands
// abdeckt — sonst verteilt sich das Gitter über die ganze Republik, und dem
// Pilotgebiet bleiben so wenige Zellen, dass der Ausgleich daran hängenbleibt.
export function baueDichte(gebiete, X, Y, werte, { breite = 512, rand = 0.45, nurGebiete = null, meer = 'mittel' } = {}) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const punkte = nurGebiete
    ? function* () { for (const gi of nurGebiete) for (const r of gebiete[gi]) for (const n of r) yield n; }()
    : X.keys();
  for (const i of punkte) {
    if (X[i] < minX) minX = X[i]; if (X[i] > maxX) maxX = X[i];
    if (Y[i] < minY) minY = Y[i]; if (Y[i] > maxY) maxY = Y[i];
  }
  const kartenB = maxX - minX, kartenH = maxY - minY;
  const puffer = kartenB * rand;
  const x0 = minX - puffer, y0 = minY - puffer;
  const gesamtB = kartenB + 2 * puffer, gesamtH = kartenH + 2 * puffer;
  const zelle = gesamtB / breite;
  const hoehe = Math.ceil(gesamtH / zelle);

  const nachGitter = { x: wx => (wx - x0) / zelle, y: wy => (wy - y0) / zelle };
  const nachWelt = { x: gx => x0 + gx * zelle, y: gy => y0 + gy * zelle };

  // Gebietszugehörigkeit je Zelle. Ist der Ausschnitt eingeschränkt, werden
  // auch nur diese Gebiete gerastert: die übrigen liegen zum Teil weit
  // ausserhalb des Gitters und würden sich beim Abschneiden über den Rand
  // schmieren. Alles Ungerasterte ist Meer mittlerer Dichte.
  const gebietVon = new Int32Array(breite * hoehe).fill(-1);
  const zellen = new Int32Array(gebiete.length);
  const zuRastern = nurGebiete ?? gebiete.keys();
  for (const gi of zuRastern) {
    fuelle(gebiete[gi], X, Y, breite, hoehe, nachGitter, idx => {
      if (gebietVon[idx] === -1) zellen[gi]++;
      gebietVon[idx] = gi;
    });
  }

  // Dichte je Zelle. Gebiete ohne getroffene Zelle (winzige Inseln) fallen
  // auf die mittlere Dichte zurück; ihr Beitrag ist verschwindend.
  let summeWert = 0, summeZellen = 0;
  for (const i of (nurGebiete ?? gebiete.keys())) { summeWert += werte[i]; summeZellen += zellen[i]; }
  const mittel = summeWert / Math.max(1, summeZellen);

  // Dichte des Meers. „mittel" ist die Gesamtdichte der Karte, wie bei Gastner
  // und Newman. Wird die Karte von einem einzelnen dichten Gebiet beherrscht —
  // Berlin hat mehr Einwohner als ganz Brandenburg —, liegt dieser Mittelwert
  // weit über dem, was am Rand wirklich wohnt, und das Meer drückt die
  // Randkreise zusammen, während in der Mitte alles auseinandergeht. „rand"
  // nimmt stattdessen die mittlere Dichte der Gebiete, die selbst am Rand
  // liegen: dort ändert sich dann nichts, und die Verformung bleibt da, wo sie
  // hingehört.
  let meerDichte = mittel;
  if (meer === 'rand') {
    const auswahl = [...(nurGebiete ?? gebiete.keys())].filter(i => zellen[i] > 0);
    const d = auswahl.map(i => werte[i] / zellen[i]).sort((a, b) => a - b);
    meerDichte = d.length ? d[Math.floor(d.length / 2)] : mittel;
  }

  const dichte = new Float64Array(breite * hoehe);
  for (let i = 0; i < dichte.length; i++) {
    const g = gebietVon[i];
    dichte[i] = g === -1 ? meerDichte : (zellen[g] ? werte[g] / zellen[g] : meerDichte);
  }

  return { dichte, breite, hoehe, zelle, x0, y0, nachGitter, nachWelt, gebietVon, zellen, mittel, summeZellen };
}
