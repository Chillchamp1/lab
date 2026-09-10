// Die Zahlen für das Nadelrelief: dieselben Menschen wie im Kartogramm, nur
// stellen sie sich hier auf, statt die Fläche zu verziehen.
//
// Grundlage sind nicht die Kreise, sondern die 11 007 Gemeinden aus GPOP.
// Die Datei führt zu jeder Gemeinde Länge, Breite und Fläche, und das genügt:
// Umrisse braucht ein Nadelbild nicht.
//
// Wichtig ist, dass die Nadeln vergleichbar sind. Eine Nadel je Gemeinde wäre
// es nicht — die kleinste hat 4 Hektar, die grösste 891 km². Also wird auf ein
// flächentreues Raster gerechnet: jede Gemeinde verteilt ihre Menschen
// gleichmässig über eine Scheibe ihrer eigenen Fläche, und gezählt wird je
// Zelle. Danach ist die Nadelhöhe Menschen je gleich grosser Fläche, also
// Dichte, und Berlin ragt aus demselben Grund heraus, aus dem es das im Bild
// tun soll.
//
// Die Zellen liegen versetzt, Reihe für Reihe um eine halbe Zelle verschoben:
// ein Dreiecksgitter, also dasselbe Muster, das ein Sechseckraster erzeugt.
// Auf dem geraden Gitter standen die Nadeln in Spalten wie auf Karopapier, und
// das Auge sah eher das Gitter als das Land. Die Zellen bleiben dabei alle
// gleich gross; nur die Nachbarschaft ändert sich.
//
// Die Annahme dabei: innerhalb einer Gemeinde wohnen die Menschen gleichmässig
// verteilt. Das stimmt nie ganz, ist aber genau die Annahme, die jede
// Flächenfärbung ohnehin macht.

import { readFileSync, existsSync } from 'node:fs';
import { laea } from './geometrie.mjs';
import { packe } from './code.mjs';
import { leseLang, baueBilder } from './daten.mjs';
import { ladeKreise } from './laden.mjs';
import { baueKnotenmodell, vereinfache } from './topologie.mjs';

// Dieselbe Bündelung wie in `quellen.py`; dort steht sie mit Stichtagen und
// Begriffen. Dass beide dasselbe meinen, wird unten gegen die Kreistabelle
// geprüft, statt es zu behaupten.
const BILDER = [
  ['1871', ['pop_1871']],
  ['1900–1910', ['pop_1900', 'pop_1905', 'pop_1910']],
  ['1939', ['pop_1939']],
  ['1946–1950', ['pop_1946', 'pop_1950']],
  ['1961–1964', ['pop_1961', 'pop_1964']],
  ['1985–1987', ['pop_1985', 'pop_1987']],
  ['1996', ['pop_1996']],
  ['2011', ['pop_2011']],
  ['2019', ['pop_2019']],
];

const REIHE = Math.sqrt(3) / 2;    // Reihenabstand des Dreiecksgitters
const STUFE = 25;                  // Höhen werden auf 25 Personen gerundet
const FEIN = 8;                    // Umriss in Achtelzellen

function leseCsv(pfad) {
  const text = readFileSync(pfad, 'utf8').replace(/^﻿/, '');
  const zeilen = text.split(/\r?\n/).filter(z => z.trim() !== '');
  const zerlege = z => {
    const f = []; let feld = '', inAnf = false;
    for (let i = 0; i < z.length; i++) {
      const c = z[i];
      if (inAnf) {
        if (c === '"' && z[i + 1] === '"') { feld += '"'; i++; }
        else if (c === '"') inAnf = false;
        else feld += c;
      } else if (c === '"') inAnf = true;
      else if (c === ',') { f.push(feld); feld = ''; }
      else feld += c;
    }
    f.push(feld);
    return f;
  };
  const kopf = zerlege(zeilen[0]);
  return zeilen.slice(1).map(z => Object.fromEntries(zerlege(z).map((v, i) => [kopf[i], v])));
}

// Der Boden. Ohne ihn ist das Nadelfeld eine Wolke in der Luft: aus einem
// Winkel von fünfzig Grad sieht man zwischen den Nadeln hindurch, und woher
// jemand wissen soll, dass er auf Deutschland schaut, bleibt offen. Gezeichnet
// werden eine gefüllte Platte — die Aussengrenze, zu Ringen verkettet — und
// darauf die Landesgrenzen als Striche.
//
// Y zeigt im Knotenmodell wie in der Gemeindedatei nach Süden; beide Seiten
// rechnen in derselben Richtung, also wird hier nichts gespiegelt.
//
// Für einen Umriss unter tausend Nadeln braucht es nicht die volle Auflösung
// von VG2500; generalisiert spart das die halbe Nutzlast und sieht aus dieser
// Entfernung gleich aus.
function boden(nachZelle) {
  const roh = baueKnotenmodell(ladeKreise().kreise);
  const knapp = vereinfache(roh.gebiete, roh.X, roh.Y, 3500);
  const modell = { gebiete: knapp.gebiete, attr: roh.attr, X: knapp.X, Y: knapp.Y };

  const gehoert = new Map();
  modell.gebiete.forEach((ringe, gi) => {
    for (const r of ringe) for (let i = 0; i < r.length; i++)
      gehoert.set(r[i] + '>' + r[(i + 1) % r.length], gi);
  });

  // Aussenkanten: die, deren Gegenkante fehlt. Sie werden zu Ringen verkettet,
  // damit sich die Platte füllen lässt. Jede Kante hat genau einen Nachfolger,
  // solange das Modell sauber ist; wo mehrere zusammenstossen, wird der erste
  // noch freie genommen und der Ring später einfach geschlossen.
  const ausgang = new Map();
  const grenzen = [];
  modell.gebiete.forEach((ringe, gi) => {
    for (const r of ringe) for (let i = 0; i < r.length; i++) {
      const a = r[i], b = r[(i + 1) % r.length];
      const gegen = gehoert.get(b + '>' + a);
      if (gegen === undefined) {
        if (!ausgang.has(a)) ausgang.set(a, []);
        ausgang.get(a).push(b);
      } else if (gegen > gi && modell.attr[gegen].land !== modell.attr[gi].land) {
        for (const n of [a, b]) grenzen.push(...nachZelle(modell.X[n], modell.Y[n]));
      }
    }
  });

  const ringe = [];
  for (const [start] of ausgang) {
    while (ausgang.get(start)?.length) {
      const ring = [start];
      let a = start;
      for (;;) {
        const weiter = ausgang.get(a);
        if (!weiter || !weiter.length) break;
        const b = weiter.shift();
        if (b === start) break;
        ring.push(b);
        a = b;
      }
      if (ring.length >= 3) ringe.push(ring);
    }
  }

  const punkte = [];
  const laengen = ringe.map(r => {
    for (const n of r) punkte.push(...nachZelle(modell.X[n], modell.Y[n]));
    return r.length;
  });
  return { laengen, punkte, grenzen, ringe: ringe.length, kanten: grenzen.length / 4 };
}

export function baueNadeln({ zelle = Number(process.env.ZELLE ?? 6000), log = () => {} } = {}) {
  const datei = 'gpop_muni.csv';
  if (!existsSync(datei)) throw new Error(`${datei} fehlt — siehe DATEN.md`);
  const gemeinden = leseCsv(datei);

  // Projizieren und den Rahmen bestimmen
  const P = gemeinden.map(g => {
    const [x, y] = laea(Number(g.lon), Number(g.lat));
    return { x, y: -y, flaeche: Number(g.area) * 1e6, roh: g };
  });
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of P) {
    if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
  }
  const puffer = 30000;     // damit auch die Scheiben der Randgemeinden hineinpassen
  minX -= puffer; maxX += puffer; minY -= puffer; maxY += puffer;
  const zeilenhoehe = zelle * REIHE;
  const NX = Math.ceil((maxX - minX) / zelle) + 1, NY = Math.ceil((maxY - minY) / zeilenhoehe) + 1;
  log(`Raster: ${NX} × ${NY} Zellen à ${zelle / 1000} km, versetzt`);

  // Welche Zelle liegt einem Punkt am nächsten? Im versetzten Gitter kommen
  // dafür zwei Reihen in Frage, also werden beide gerechnet.
  const zelleVon = (x, y) => {
    const ry = (y - minY) / zeilenhoehe, rx = (x - minX) / zelle;
    let best = null, bestD = Infinity;
    for (const gy of [Math.floor(ry), Math.ceil(ry)]) {
      const gx = Math.round(rx - 0.5 * (gy & 1));
      const dx = rx - (gx + 0.5 * (gy & 1)), dy = ry - gy;
      const d = dx * dx + dy * dy * (REIHE * REIHE) / 1;
      if (d < bestD) { bestD = d; best = [gx, gy]; }
    }
    return best;
  };
  const nachZelle = (x, y) => [
    Math.round((x - minX) / zelle * FEIN),
    Math.round((y - minY) / zeilenhoehe * REIHE * FEIN),   // in Zellenbreiten, nicht in Reihen
  ];

  // Menschen auf das Raster verteilen. Jede Gemeinde streut ihre Bevölkerung
  // gleichmässig über eine Scheibe ihrer eigenen Fläche; die Streupunkte liegen
  // auf einer Fibonacci-Spirale, damit sie sich nicht klumpen.
  const felder = BILDER.map(() => new Float64Array(NX * NY));
  const GOLD = Math.PI * (3 - Math.sqrt(5));
  const summeJeBild = BILDER.map(() => 0);

  for (const p of P) {
    const werte = BILDER.map(([, spalten]) => {
      for (const s of spalten) {
        const v = p.roh[s].trim();
        if (v) return Number(v);
      }
      return null;
    });
    if (werte.every(v => v === null)) continue;
    const radius = Math.sqrt(p.flaeche / Math.PI);
    const punkte = Math.max(1, Math.min(400, Math.round(p.flaeche / (zelle * zelle) * 12)));
    const ziele = [];
    for (let i = 0; i < punkte; i++) {
      const r = radius * Math.sqrt((i + 0.5) / punkte);
      const w = i * GOLD;
      const [gx, gy] = zelleVon(p.x + r * Math.cos(w), p.y + r * Math.sin(w));
      if (gx < 0 || gy < 0 || gx >= NX || gy >= NY) continue;
      ziele.push(gy * NX + gx);
    }
    if (!ziele.length) {
      const [gx, gy] = zelleVon(p.x, p.y);
      ziele.push(gy * NX + gx);
    }
    werte.forEach((v, b) => {
      if (v === null) return;
      const anteil = v / ziele.length;
      for (const z of ziele) felder[b][z] += anteil;
      summeJeBild[b] += v;
    });
  }

  // Gegenprobe: die Summe je Bild muss die der Kreistabelle sein. Damit ist
  // belegt, dass hier dieselben Spalten zu denselben Bildern gebündelt werden
  // wie in `quellen.py` — und dass beim Verteilen nichts verloren geht.
  const kreisBilder = baueBilder(leseLang());
  log('Gegenprobe gegen die Kreistabelle:');
  BILDER.forEach(([name], b) => {
    const kreis = kreisBilder.find(x => x.jahr === name);
    const gerastert = felder[b].reduce((a, v) => a + v, 0);
    if (!kreis) { log(`  ${name}: in der Kreistabelle nicht vorhanden`); return; }
    const abwSumme = Math.abs(summeJeBild[b] / kreis.summe - 1);
    const abwRaster = Math.abs(gerastert / summeJeBild[b] - 1);
    log(`  ${name}: Gemeinden ${(summeJeBild[b] / 1e6).toFixed(3)} Mio gegen Kreise `
      + `${(kreis.summe / 1e6).toFixed(3)} Mio — ${(abwSumme * 100).toFixed(4)} %, `
      + `nach dem Rastern ${(abwRaster * 100).toFixed(4)} %`);
    if (abwSumme > 0.0005) throw new Error(`${name}: Gemeinden und Kreise gehen auseinander`);
  });

  // Nur belegte Zellen behalten, in Zeichenreihenfolge: von hinten nach vorn.
  // Die Kamera steht im Süden, also wird von Norden her gezeichnet, damit die
  // vorderen Nadeln die hinteren verdecken und nicht umgekehrt.
  const zellen = [];
  for (let gy = 0; gy < NY; gy++) {
    for (let gx = 0; gx < NX; gx++) {
      const i = gy * NX + gx;
      if (felder.some(f => f[i] > 0.5)) zellen.push({ gx, gy, werte: felder.map(f => f[i]) });
    }
  }
  log(`belegte Zellen: ${zellen.length}`);

  const grund = boden(nachZelle);
  log(`Boden: ${grund.ringe} Ringe, ${grund.kanten} Kanten an den Landesgrenzen`);

  // Kodieren. Die Höhen werden auf 25 Personen gerundet — feiner als jeder
  // Bildschirm auflöst — und über die Bilder als Kette von Unterschieden
  // abgelegt, weil sich eine Zelle von einer Zählung zur nächsten wenig ändert.
  const laufend = a => { const d = new Array(a.length); let v = 0; for (let i = 0; i < a.length; i++) { d[i] = a[i] - v; v = a[i]; } return d; };
  const kette = [];
  let vor = zellen.map(() => 0);
  BILDER.forEach((_, b) => {
    const jetzt = zellen.map(z => Math.round(z.werte[b] / STUFE));
    kette.push(...jetzt.map((v, i) => v - vor[i]));
    vor = jetzt;
  });
  const hoechste = Math.max(...zellen.map(z => Math.max(...z.werte)));

  const daten = {
    nx: NX, ny: NY, reihe: Number(REIHE.toFixed(6)), zelle, stufe: STUFE, fein: FEIN,
    gx: packe(laufend(zellen.map(z => z.gx))),
    gy: packe(laufend(zellen.map(z => z.gy))),
    h: packe(kette),
    pl: packe(grund.laengen), pp: packe(laufend(grund.punkte)),
    gr: packe(laufend(grund.grenzen)),
    b: BILDER.map(([name], b) => {
      const k = kreisBilder.find(x => x.jahr === name);
      return { jahr: name, t: null, bev: Math.round(summeJeBild[b]),
        stichtage: k ? k.stichtage : [], begriffe: k ? k.begriffe : [] };
    }),
    hoechste: Math.round(hoechste),
  };
  // Der Zeitpunkt eines Bildes steht in der Kreistabelle; hier wird er aus den
  // Stichtagen mit der Bevölkerung gewichtet, genau wie dort.
  daten.b.forEach(bd => {
    const k = kreisBilder.find(x => x.jahr === bd.jahr);
    const jahre = bd.stichtage.map(s => {
      const d = new Date(s + 'T00:00:00Z');
      return d.getUTCFullYear() + (d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 1)) / (365.25 * 864e5);
    });
    const g = bd.stichtage.map(s => k.gewichte[s] ?? 1);
    bd.t = Number((jahre.reduce((a, j, n) => a + j * g[n], 0) / g.reduce((a, b2) => a + b2, 0)).toFixed(3));
  });

  log(`Nadeln: ${(JSON.stringify(daten).length / 1024).toFixed(0)} kB roh, `
    + `höchste Zelle ${Math.round(hoechste).toLocaleString('en-GB')} Menschen`);
  return { daten, gemeinden: gemeinden.length, zellen: zellen.length };
}

// Direkt aufgerufen: nur rechnen und die Kennzahlen zeigen.
if (process.argv[1]?.endsWith('nadeln.mjs')) {
  baueNadeln({ log: s => process.stderr.write(s + '\n') });
}
