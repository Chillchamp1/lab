// Aus den Zwischendateien die Nutzlast der Seite.
//
// Drei Felder, drei verschiedene Kodierungen, und jede ist gemessen:
//
//   DEM        Karte, voll aufgeloest. Vorhergesagt aus links + oben minus
//              links-oben (dasselbe, was PNG "Paeth" nennt), Rest varint.
//              Zeilenweise nur ueber den gueltigen Abschnitt — die Maske
//              kostet damit kein Zeichen.
//   Topo_Diff  projiziertes Grobgitter, Raumdelta je Zeitscheibe.
//   stgit      dito, eigenes Grobgitter.
//
// Gemessen wurde auch, was **nicht** genommen wurde; die Zahlen stehen in
// METHODIK.md. Die wichtigste Ueberraschung: beim DEM ist die rohe Groesse von
// der Vorhersage fast unabhaengig (ein Varint-Zeichen je Wert, ganz gleich wie
// klein der Rest ist), auf der Leitung nach gzip aber nicht — Zeilendelta 149,
// Paeth 115 kB. Die Vorhersage ist also fuers Ausliefern da, nicht fuer die
// Datei.

import { readFileSync } from 'node:fs';
import { packe, packeL } from './code.mjs';

const kuerzer = (v) => {
  const a = packe(v), b = packeL(v);
  return b.length < a.length ? { s: b, lauf: 1 } : { s: a, lauf: 0 };
};

export function baueNutzlast(zwischen, log) {
  const meta = JSON.parse(readFileSync(zwischen + '/meta.json', 'utf8'));
  const g = meta.gitter;
  const NT = meta.zeiten.length;

  const roh = (f) => readFileSync(zwischen + '/' + f);
  const dem = new Int16Array(roh('dem.i16').buffer.slice(0));
  const maske = new Uint8Array(roh('maske.u8'));
  const td = new Int16Array(roh('topodiff.i16').buffer.slice(0));
  const eis = new Uint16Array(roh('stgit.u16').buffer.slice(0));

  // ---------------------------------------------------- Die gueltigen Spannen
  // Je Zeile ein Anfang und ein Ende. Dass das reicht — dass die gueltige
  // Flaeche zeilenweise **zusammenhaengend** ist — folgt nicht von selbst,
  // sondern aus der Form des Fensters unter dieser Projektion. Also wird es
  // nachgezaehlt statt angenommen.
  const von = new Int32Array(g.h), bis = new Int32Array(g.h);
  let loecher = 0, gueltig = 0;
  for (let y = 0; y < g.h; y++) {
    let a = -1, b = -1, luecken = 0, drin = false;
    for (let x = 0; x < g.w; x++) {
      const m = maske[y * g.w + x];
      if (m) { if (a < 0) a = x; b = x; if (!drin) { drin = true; if (a >= 0 && x > a) luecken++; } }
      else if (drin) drin = false;
    }
    // Loch = ungueltige Zelle zwischen a und b
    if (a >= 0) for (let x = a; x <= b; x++) if (!maske[y * g.w + x]) loecher++;
    von[y] = a; bis[y] = b;
    if (a >= 0) gueltig += b - a + 1;
  }
  if (loecher) log(`  ACHTUNG: ${loecher} ungueltige Zellen innerhalb einer Zeilenspanne — `
    + `die Maske ist nicht zeilenweise zusammenhaengend, die Spannen decken zu viel`);

  // ------------------------------------------------------------------ Das DEM
  const QDEM = 10;                     // Meter je Stufe
  const Q = (y, x) => Math.round(dem[y * g.w + x] / QDEM);
  const dv = [];
  for (let y = 0; y < g.h; y++) {
    const a = von[y], b = bis[y];
    if (a < 0) continue;
    const ao = y > 0 ? von[y - 1] : -1, bo = y > 0 ? bis[y - 1] : -1;
    const oben = (x) => (ao >= 0 && x >= ao && x <= bo) ? Q(y - 1, x) : null;
    for (let x = a; x <= b; x++) {
      const L = x > a ? Q(y, x - 1) : null;
      const O = oben(x);
      const LO = x > a ? oben(x - 1) : null;
      let p;
      if (L !== null && O !== null && LO !== null) p = L + O - LO;
      else if (L !== null) p = L;
      else if (O !== null) p = O;
      else p = 0;
      dv.push(Q(y, x) - p);
    }
  }
  const demK = kuerzer(dv);
  log(`  DEM        ${g.w} x ${g.h}, ${gueltig} gueltige Zellen, `
    + `${QDEM} m je Stufe -> ${(demK.s.length / 1024).toFixed(0)} kB`);

  // Die Spannen selbst: Anfang als Delta zur vorigen Zeile, Laenge als Delta.
  const spv = [];
  let vA = 0, vL = 0;
  for (let y = 0; y < g.h; y++) {
    const a = von[y] < 0 ? 0 : von[y];
    const l = von[y] < 0 ? 0 : bis[y] - von[y] + 1;
    spv.push(a - vA, l - vL); vA = a; vL = l;
  }
  const spK = kuerzer(spv);

  // -------------------------------------------------------- Die groben Felder
  function feld(name, arr, w, h, q, einheit) {
    const n = w * h;
    const v = [];
    for (let t = 0; t < NT; t++) {
      for (let y = 0; y < h; y++) {
        let vor = 0;
        for (let x = 0; x < w; x++) {
          const c = Math.round(arr[t * n + y * w + x] / q);
          v.push(c - vor); vor = c;
        }
      }
    }
    const k = kuerzer(v);
    log(`  ${name.padEnd(10)} ${w} x ${h} x ${NT}, ${q} ${einheit} je Stufe -> `
      + `${(k.s.length / 1024).toFixed(0)} kB (${k.lauf ? 'mit Nulllaeufen' : 'flach'})`);
    return k;
  }
  const QTD = 2, QEIS = 10;
  const tdK = feld('Topo_Diff', td, meta.topodiff.w, meta.topodiff.h, QTD, 'm');
  const eisK = feld('stgit', eis, meta.stgit.w, meta.stgit.h, QEIS, 'm');

  // ------------------------------------------------------------- DATED-1
  // Die Linien liegen schon in Gitterkoordinaten. Auf ein Zehntel einer Zelle
  // gerundet — feiner als ein Bildpunkt ist sinnlos, und die Raender sind
  // handdigitalisiert.
  const dated = JSON.parse(readFileSync(zwischen + '/dated.json', 'utf8'));
  const dl = [];
  const dstruktur = {};
  for (const ka of Object.keys(dated).sort((a, b) => +a - +b)) {
    dstruktur[ka] = {};
    for (const sorte of ['mc', 'max', 'min']) {
      const linien = dated[ka][sorte];
      if (!linien) continue;
      const laengen = [];
      for (const linie of linien) {
        laengen.push(linie.length);
        let px = 0, py = 0;
        for (const [x, y] of linie) {
          const qx = Math.round(x * 10), qy = Math.round(y * 10);
          dl.push(qx - px, qy - py); px = qx; py = qy;
        }
      }
      dstruktur[ka][sorte] = laengen;
    }
  }
  const datK = kuerzer(dl);
  log(`  DATED-1    ${Object.keys(dstruktur).length} Zeitscheiben, `
    + `${dl.length / 2} Punkte -> ${(datK.s.length / 1024).toFixed(0)} kB`);

  const D = {
    g: { w: g.w, h: g.h, s: g.schritt, x0: g.x0, y0: g.y0 },
    mitte: meta.mitte, erdr: meta.erdradius, fenster: meta.ausschnitt,
    t: meta.zeiten, takt: meta.takt, msp: meta.meeresspiegel.map(v => Math.round(v * 10) / 10),
    qdem: QDEM, qtd: QTD, qeis: QEIS,
    // Die gemessene Gelaendesteigung (90-Prozent-Quantil, Meter je
    // Gitterzelle). Aus ihr rechnet die Seite die Hoehe des Scheibenstapels —
    // siehe seite.mjs, LAMBDA.
    g90: Math.round(meta.g90_m_je_zelle || 0) || undefined,
    sp: spK.s, spL: spK.lauf,
    dem: demK.s, demL: demK.lauf,
    td: { w: meta.topodiff.w, h: meta.topodiff.h, d: tdK.s, L: tdK.lauf },
    eis: { w: meta.stgit.w, h: meta.stgit.h, d: eisK.s, L: eisK.lauf },
    dated: { s: dstruktur, d: datK.s, L: datK.lauf },
    je: meta.je_scheibe.map(e => ({
      ka: e.ka,
      land: Math.round(e.land_anteil * 1e4) / 1e4,
      eis: Math.round(e.eis_anteil * 1e4) / 1e4,
      vol: Math.round(e.eis_volumen_km3),
      hoch: Math.round(e.hoechster_m),
    })),
  };
  const text = JSON.stringify(D);
  log(`  Nutzlast zusammen ${(text.length / 1024).toFixed(0)} kB`);
  return { D, text, meta };
}
