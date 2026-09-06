// Liest Natural Earth ein, packt die Umrisse und rechnet die Kennzahlen aus,
// die die Seite anzeigt.

import { readFileSync } from 'node:fs';
import { packe } from './code.mjs';
import { NETZE, GRAD, kugelflaeche, ebeneFlaeche, lambert, ringe } from './geometrie.mjs';

export const QUELLE = 'ne_50m_admin_0_countries.geojson';

// 0,01° ≈ 1,1 km. Bei 3200 Gerätepunkten Kartenbreite ist ein Bildpunkt rund
// 0,11° breit — die Rasterung liegt also eine Zehnerpotenz unter dem, was man
// sehen kann.
const GITTER = 100;

// Die Antarktis zählt bei den Anteilen nicht mit: sie hat keine Einwohner, und
// die klassische Wandkarte schneidet sie ohnehin ab. Auf der Karte bleibt sie —
// gerade sie zeigt, was Mercator an den Polen anrichtet.
const OHNE = new Set(['ATA']);

export function baueNutzlast({ log = () => {} } = {}) {
  const roh = JSON.parse(readFileSync(QUELLE, 'utf8'));
  log(`  ${roh.features.length} Länder aus ${QUELLE}`);

  const laender = [];
  for (const f of roh.features) {
    const rs = ringe(f.geometry);
    if (!rs.length) continue;
    const p = f.properties;

    let wahr = 0;
    const netzFlaeche = NETZE.map(() => 0);
    let lambertFlaeche = 0;
    for (const { ring, zeichen } of rs) {
      wahr += zeichen * kugelflaeche(ring);
      lambertFlaeche += zeichen * ebeneFlaeche(ring, lambert);
      NETZE.forEach((n, i) => { netzFlaeche[i] += zeichen * ebeneFlaeche(ring, n.punkt); });
    }

    laender.push({
      name: p.NAME_DE || p.NAME,
      iso: p.ISO_A3 && p.ISO_A3 !== '-99' ? p.ISO_A3 : p.ADM0_A3,
      kontinent: p.CONTINENT,
      einwohner: p.POP_EST || 0,
      wahr, lambertFlaeche, netzFlaeche,
      ringe: rs.map(r => r.ring),
    });
  }

  // Anteile an der gezeigten Landfläche, je Netz. Der Faktor ist der Quotient
  // aus gezeigtem und zustehendem Anteil: 1 heisst richtig gross, 2 heisst
  // doppelt so viel Bildfläche wie zustehend.
  const zaehlt = l => !OHNE.has(l.iso);
  const summe = f => laender.filter(zaehlt).reduce((s, l) => s + f(l), 0);
  const sWahr = summe(l => l.wahr);
  const sNetz = NETZE.map((n, i) => summe(l => l.netzFlaeche[i]));

  for (const l of laender) {
    l.anteilWahr = l.wahr / sWahr;
    l.faktor = NETZE.map((n, i) => (l.netzFlaeche[i] / sNetz[i]) / l.anteilWahr);
  }

  // Probe 1: Equal Earth ist flächentreu, also muss jedes Land dort genau den
  // Anteil bekommen, der ihm zusteht — Faktor 1, für alle 242.
  const iE = NETZE.findIndex(n => n.id === 'equalearth');
  const abw = Math.max(...laender.filter(zaehlt).map(l => Math.abs(l.faktor[iE] - 1)));
  log(`  Probe Equal Earth flächentreu: grösste Abweichung vom Faktor 1: ${(abw * 100).toFixed(4)} %`);

  // Probe 2: Kugelfläche gegen Lambert, der ja flächentreu ist. Beide Wege
  // müssen dasselbe Verhältnis liefern.
  const abw2 = Math.max(...laender.map(l =>
    Math.abs(l.lambertFlaeche / (l.wahr / (sWahr / summe(x => x.lambertFlaeche))) - 1)));
  log(`  Probe Kugelintegral gegen Lambert: grösste Abweichung ${(abw2 * 100).toFixed(4)} %`);

  // Umrisse packen: je Ring ein Zug aus Deltas, doppelte Punkte fallen weg.
  const lon = [], lat = [], ringLaenge = [], ringZahl = [];
  let vx = 0, vy = 0, punkte = 0, verworfen = 0;
  for (const l of laender) {
    const behalten = [];
    for (const ring of l.ringe) {
      const q = [];
      for (const [x, y] of ring) {
        const qx = Math.round(x * GITTER), qy = Math.round(y * GITTER);
        if (q.length && q[q.length - 1][0] === qx && q[q.length - 1][1] === qy) { verworfen++; continue; }
        q.push([qx, qy]);
      }
      // Schlusspunkt wiederholt den ersten; der Zeichner schliesst selbst.
      if (q.length > 1 && q[0][0] === q[q.length - 1][0] && q[0][1] === q[q.length - 1][1]) q.pop();
      if (q.length < 3) { verworfen += q.length; continue; }
      for (const [qx, qy] of q) { lon.push(qx - vx); lat.push(qy - vy); vx = qx; vy = qy; }
      ringLaenge.push(q.length);
      punkte += q.length;
      behalten.push(q.length);
    }
    ringZahl.push(behalten.length);
  }
  log(`  ${punkte} Punkte in ${ringLaenge.length} Ringen (${verworfen} beim Rastern zusammengefallen)`);

  const nutz = {
    lon: packe(lon), lat: packe(lat),
    ringe: packe(ringLaenge), ringzahl: packe(ringZahl),
    gitter: GITTER,
  };
  log(`  Nutzlast Umrisse: ${((nutz.lon.length + nutz.lat.length + nutz.ringe.length) / 1024).toFixed(0)} KB`);

  return { laender, nutz, punkte, sWahr };
}

// Gradnetz, Tissot-Kreise und die beiden Kurslinien entstehen aus Formeln —
// sie kosten Rechenzeit im Browser, aber kein einziges Byte Nutzlast. Hier
// stehen nur die Parameter, die die Seite dafür braucht.
export const ZUGABEN = {
  gradnetzSchritt: 30,
  tissotRadiusKm: 800,
  tissotBreiten: [-60, -30, 0, 30, 60],
  tissotLaengen: [-160, -120, -80, -40, 0, 40, 80, 120, 160],
  kurse: [
    { name: 'New York – Lissabon', von: [-74.01, 40.71], nach: [-9.14, 38.72] },
    { name: 'Frankfurt – Tokio', von: [8.68, 50.11], nach: [139.69, 35.69] },
  ],
};
