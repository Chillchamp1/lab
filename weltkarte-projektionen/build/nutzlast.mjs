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

// Natural Earths Standardebene zeichnet die Lage vor Ort („de facto"), und
// dort liegt die Krim seit 2014 bei Russland. Diese Seite zeigt sie bei der
// Ukraine — das ist die völkerrechtliche Zuordnung, der auch die UN folgt
// (Resolution 68/262 vom 27. März 2014, 100 Stimmen dafür). Eine Seite über
// eine UN-Resolution zu Landkarten sollte dabei nicht ausgerechnet in einer
// anderen UN-Frage die Gegenposition zeichnen.
//
// Natural Earth liefert dafür eigene Sichtweisen-Dateien (`_ukr`, `_rus`, …).
// Hier wird stattdessen das eine Polygon umgehängt: das ändert nur die eine
// Zuordnung und lässt alle anderen Grenzen so, wie die Standardebene sie zieht.
const KRIM = [34.10, 44.95];        // Simferopol

const imRing = (pt, ring) => {
  let d = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if ((a[1] > pt[1]) !== (b[1] > pt[1]) &&
        pt[0] < (b[0] - a[0]) * (pt[1] - a[1]) / (b[1] - a[1]) + a[0]) d = !d;
  }
  return d;
};
const polygone = f => f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;

// Das Polygon wird gesucht, nicht abgezählt: über den Punkt Simferopol. Ein
// fester Index wäre still falsch geworden, sobald Natural Earth die Datei
// einmal neu ordnet.
function krimZurUkraine(roh, log) {
  const rus = roh.features.find(f => f.properties.ISO_A3 === 'RUS');
  const ukr = roh.features.find(f => f.properties.ISO_A3 === 'UKR');
  if (!rus || !ukr) throw new Error('RUS oder UKR nicht in der Quelle gefunden');

  const rp = polygone(rus), up = polygone(ukr);
  const krim = rp.filter(p => imRing(KRIM, p[0]));
  if (krim.length !== 1) throw new Error(`Krim: ${krim.length} Polygone bei RUS statt genau eines`);

  rus.geometry = { type: 'MultiPolygon', coordinates: rp.filter(p => !krim.includes(p)) };
  ukr.geometry = { type: 'MultiPolygon', coordinates: [...up, ...krim] };

  // Gegenprobe, damit die Verschiebung nicht still danebengeht.
  const nochBeiRus = polygone(rus).some(p => imRing(KRIM, p[0]));
  const jetztBeiUkr = polygone(ukr).some(p => imRing(KRIM, p[0]));
  if (nochBeiRus || !jetztBeiUkr) throw new Error('Krim-Verschiebung fehlgeschlagen');
  log(`  Krim (${krim[0][0].length} Punkte) von Russland zur Ukraine verschoben; Probe: Simferopol liegt bei UKR`);
}

export function baueNutzlast({ log = () => {} } = {}) {
  const roh = JSON.parse(readFileSync(QUELLE, 'utf8'));
  log(`  ${roh.features.length} Länder aus ${QUELLE}`);
  krimZurUkraine(roh, log);

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
      name: p.NAME_EN || p.NAME,
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
// Die Kreise sitzen auf Kreuzungen des Gradnetzes: alle Werte sind Vielfache
// von 30. In der Breite steht auf jedem gezeichneten Breitenkreis einer, in der
// Länge nur auf jedem zweiten Meridian — sonst stünden 60 Kreise auf der Karte,
// und auf beiden Netzen hängt die Verzerrung ohnehin nur von der Breite ab, in
// einer Zeile sieht also einer aus wie der nächste. Sechs Spalten reichen, um
// die Scherung zum Kartenrand hin mitzuzeigen. ±180 bleibt frei: dort läge ein
// Kreis auf der Nahtstelle und liefe als Streifen über die ganze Karte.
export const ZUGABEN = {
  gradnetzSchritt: 30,
  tissotRadiusKm: 800,
  tissotBreiten: [-60, -30, 0, 30, 60],
  tissotLaengen: [-150, -90, -30, 30, 90, 150],
  kurse: [
    { name: 'New York – Lisbon', von: [-74.01, 40.71], nach: [-9.14, 38.72] },
    { name: 'Frankfurt – Tokyo', von: [8.68, 50.11], nach: [139.69, 35.69] },
  ],
};
