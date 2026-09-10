// Erzeugt spikes.html: dieselben Zahlen als Nadelrelief.
// Aufruf: node spikes.mjs > ../spikes.html
//
// Die Kartogrammseite verzieht die Fläche, damit man Menschen zählen kann.
// Diese hier lässt die Fläche in Ruhe und stellt die Menschen stattdessen
// auf: über jeder Rasterzelle steht eine Nadel, so hoch wie die Zahl der
// Menschen darin. Das ist die Machart der „crisp spike maps", wie sie Milos
// Popovic mit rayshader baut — nur läuft sie hier durch die Zeit.
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
// Die Annahme dabei: innerhalb einer Gemeinde wohnen die Menschen gleichmässig
// verteilt. Das stimmt nie ganz, ist aber genau die Annahme, die jede
// Flächenfärbung ohnehin macht.

import { readFileSync, existsSync } from 'node:fs';
import { laea } from './geometrie.mjs';
import { packe, ENTPACKER } from './code.mjs';
import { leseLang, baueBilder } from './daten.mjs';
import { ladeKreise } from './laden.mjs';
import { baueKnotenmodell, vereinfache } from './topologie.mjs';

const log = s => process.stderr.write(s + '\n');
const ZELLE = Number(process.env.ZELLE ?? 6000);        // Kantenlänge in Metern

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

const DATEI = 'gpop_muni.csv';
if (!existsSync(DATEI)) throw new Error(`${DATEI} fehlt — siehe DATEN.md`);
const gemeinden = leseCsv(DATEI);
log(`Gemeinden: ${gemeinden.length}`);

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
// Rand, damit auch die Scheiben der Randgemeinden hineinpassen
const puffer = 30000;
minX -= puffer; maxX += puffer; minY -= puffer; maxY += puffer;
const NX = Math.ceil((maxX - minX) / ZELLE), NY = Math.ceil((maxY - minY) / ZELLE);
log(`Raster: ${NX} x ${NY} Zellen à ${ZELLE / 1000} km`);

// Menschen auf das Raster verteilen. Jede Gemeinde streut ihre Bevölkerung
// gleichmässig über eine Scheibe ihrer eigenen Fläche; die Streupunkte liegen
// auf einer Fibonacci-Spirale, damit sie sich nicht klumpen.
const felder = BILDER.map(() => new Float64Array(NX * NY));
const GOLD = Math.PI * (3 - Math.sqrt(5));
let summeJeBild = BILDER.map(() => 0);

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
  const punkte = Math.max(1, Math.min(400, Math.round(p.flaeche / (ZELLE * ZELLE) * 12)));
  const ziele = [];
  for (let i = 0; i < punkte; i++) {
    const r = radius * Math.sqrt((i + 0.5) / punkte);
    const w = i * GOLD;
    const gx = Math.floor((p.x + r * Math.cos(w) - minX) / ZELLE);
    const gy = Math.floor((p.y + r * Math.sin(w) - minY) / ZELLE);
    if (gx < 0 || gy < 0 || gx >= NX || gy >= NY) continue;
    ziele.push(gy * NX + gx);
  }
  if (!ziele.length) ziele.push(Math.floor((p.y - minY) / ZELLE) * NX + Math.floor((p.x - minX) / ZELLE));
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

// Nur belegte Zellen behalten, in Zeichenreihenfolge: von hinten (Norden)
// nach vorn, damit die vorderen Nadeln die hinteren verdecken.
const zellen = [];
for (let gy = NY - 1; gy >= 0; gy--) {
  for (let gx = 0; gx < NX; gx++) {
    const i = gy * NX + gx;
    if (felder.some(f => f[i] > 0.5)) zellen.push({ gx, gy, werte: felder.map(f => f[i]) });
  }
}
log(`belegte Zellen: ${zellen.length}`);

// Der Umriss auf dem Boden. Ohne ihn ist das Nadelfeld eine Wolke: die
// vorderen Nadeln verdecken das Land dahinter, und woher jemand wissen soll,
// dass er auf Deutschland schaut, bleibt offen. Gezeichnet werden die
// Aussengrenze und die Landesgrenzen — dieselbe Kantensuche wie bei der
// Kartogrammseite: eine Kante gehört dazu, wenn die Gegenkante fehlt oder zu
// einem Kreis in einem anderen Land gehört.
// Für einen Strich auf dem Boden braucht es nicht die volle Auflösung von
// VG2500 — generalisiert spart das die Hälfte der Nutzlast und sieht aus
// dieser Entfernung gleich aus.
const roh_ = baueKnotenmodell(ladeKreise().kreise);
const knapp = vereinfache(roh_.gebiete, roh_.X, roh_.Y, 3500);
const modell = { gebiete: knapp.gebiete, attr: roh_.attr, X: knapp.X, Y: knapp.Y };
const gehoert = new Map();
modell.gebiete.forEach((ringe, gi) => {
  for (const r of ringe) for (let i = 0; i < r.length; i++)
    gehoert.set(r[i] + '>' + r[(i + 1) % r.length], gi);
});
const striche = [];
modell.gebiete.forEach((ringe, gi) => {
  for (const r of ringe) for (let i = 0; i < r.length; i++) {
    const a = r[i], b = r[(i + 1) % r.length];
    const gegen = gehoert.get(b + '>' + a);
    if (gegen !== undefined && !(gegen > gi && modell.attr[gegen].land !== modell.attr[gi].land)) continue;
    for (const n of [a, b]) {
      striche.push(Math.round((modell.X[n] - minX) / ZELLE * 8),
                   Math.round((-modell.Y[n] - minY) / ZELLE * 8));
    }
  }
});
log(`Umriss: ${striche.length / 4} Kanten`);

// Kodieren. Die Höhen werden auf 25 Personen gerundet — feiner als jeder
// Bildschirm auflöst — und über die Bilder als Kette von Unterschieden
// abgelegt, weil sich eine Zelle von einer Zählung zur nächsten wenig ändert.
const STUFE = 25;
const gxs = zellen.map(z => z.gx), gys = zellen.map(z => z.gy);
const kette = [];
let vor = zellen.map(() => 0);
BILDER.forEach((_, b) => {
  const jetzt = zellen.map(z => Math.round(z.werte[b] / STUFE));
  kette.push(...jetzt.map((v, i) => v - vor[i]));
  vor = jetzt;
});

const laufend = a => { const d = new Array(a.length); let v = 0; for (let i = 0; i < a.length; i++) { d[i] = a[i] - v; v = a[i]; } return d; };
const hoechste = Math.max(...zellen.map(z => Math.max(...z.werte)));

const daten = {
  nx: NX, ny: NY, zelle: ZELLE, stufe: STUFE,
  gx: packe(laufend(gxs)), gy: packe(laufend(gys)),
  h: packe(kette),
  u: packe(laufend(striche)), ufein: 8,
  b: BILDER.map(([name], b) => {
    const k = kreisBilder.find(x => x.jahr === name);
    return { jahr: name, t: k ? k.t ?? null : null, bev: Math.round(summeJeBild[b]),
      stichtage: k ? k.stichtage : [], begriffe: k ? k.begriffe : [] };
  }),
  hoechste: Math.round(hoechste),
};
// Der Zeitpunkt eines Bildes steht in der Kreistabelle; hier wird er aus den
// Stichtagen mit der Bevölkerung gewichtet, genau wie dort.
daten.b.forEach((bd, i) => {
  const k = kreisBilder.find(x => x.jahr === bd.jahr);
  const jahre = bd.stichtage.map(s => {
    const d = new Date(s + 'T00:00:00Z');
    return d.getUTCFullYear() + (d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 1)) / (365.25 * 864e5);
  });
  const g = bd.stichtage.map(s => k.gewichte[s] ?? 1);
  bd.t = Number((jahre.reduce((a, j, n) => a + j * g[n], 0) / g.reduce((a, b2) => a + b2, 0)).toFixed(3));
});

log(`Nutzlast: ${(JSON.stringify(daten).length / 1024).toFixed(0)} kB roh, höchste Zelle ${Math.round(hoechste).toLocaleString('en-GB')} Menschen`);

const nf = n => n.toLocaleString('en-GB');
const erstes = daten.b[0], letztes = daten.b[daten.b.length - 1];

process.stdout.write(`<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Germany, standing up</title>
<meta name="description" content="Germany's population as a field of spikes, ${erstes.jahr} to ${letztes.jahr}: one needle per ${ZELLE / 1000} km cell, as tall as the people in it.">
<style>
:root{--grund:#080a10;--ink:#e8eaf0;--ink2:#8f96a8;--linie:#1b1f2b}
*{box-sizing:border-box}
html,body{margin:0;background:var(--grund)}
body{color:var(--ink);font-family:system-ui,-apple-system,"Segoe UI",sans-serif;
  font-size:15px;line-height:1.5;-webkit-text-size-adjust:100%}
.wrap{max-width:560px;margin:0 auto;padding:18px 16px 40px}
h1{font-size:23px;line-height:1.2;margin:0 0 6px;letter-spacing:-.01em}
.unter{color:var(--ink2);margin:0 0 14px;font-size:14px}
.buehne{position:relative;margin:0 -16px 10px}
canvas{display:block;width:100%;height:auto}
.jahr{position:absolute;left:20px;top:14px;pointer-events:none}
.jahr b{display:block;font-size:40px;font-weight:650;letter-spacing:-.02em;line-height:1}
.jahr span{color:var(--ink2);font-size:13px}
.regler{display:flex;align-items:center;gap:10px;margin:0 0 6px}
button{font:inherit;color:var(--ink);background:#12161f;border:1px solid #262c3a;
  border-radius:8px;padding:7px 12px;cursor:pointer}
button:hover{border-color:#3a4254}
#spiel{width:44px;flex:0 0 44px}
input[type=range]{flex:1;margin:0;accent-color:#5598e7}
.marken{position:relative;height:10px;margin:2px 0 14px 54px}
.marken i{position:absolute;top:0;width:1px;height:6px;background:#39405230}
a{color:inherit}
h2{font-size:16px;margin:22px 0 6px}
p{margin:0 0 10px}
.klein{font-size:13px;color:var(--ink2)}
</style>
</head><body>
<div class="wrap">
<h1>Germany, standing up</h1>
<p class="unter">The same people as on the <a href="./">cartogram</a>, but the map keeps its
shape and the population stands up instead. One needle per ${ZELLE / 1000} × ${ZELLE / 1000} km
of ground, as tall as the people living on it — ${erstes.jahr} to ${letztes.jahr}.</p>

<div class="buehne">
  <canvas id="feld"></canvas>
  <div class="jahr"><b id="jahrZahl">–</b><span id="jahrBev"></span></div>
</div>

<div class="regler">
  <button id="spiel" aria-label="Play or pause">▶</button>
  <input type="range" id="zeit" min="0" max="1000" value="0" step="1" aria-label="Year">
</div>
<div class="marken" id="marken"></div>

<h2>What you are looking at</h2>
<p>Every needle covers the same amount of ground, so its height is people per
square kilometre — which is why Berlin, the Ruhr, Hamburg and Munich rise out of
the plain and the countryside stays flat. The tallest needle holds
${nf(daten.hoechste)} people.</p>

<p>The heights come from the ${nf(gemeinden.length)} municipalities of the German Local
Population Database, each spreading its people evenly over a disc of its own surface
area. That evenness is an assumption and it is never quite true — but it is the same
assumption any shaded map makes.</p>

<p class="klein">Population: Roesel, Felix (2022), <i>The German Local Population Database
(GPOP), 1871 to 2019</i>, DOI 10.1515/jbnst-2022-0046, CC BY 4.0 — municipality file, all
figures on boundaries as of 31 December 2019. Nine census dates; where East and West
counted at different times, both dates are shown. Method notes in the
<a href="https://github.com/Chillchamp1/lab/tree/main/bevoelkerung-kreise">repository</a>.</p>
</div>

<script>
${ENTPACKER}
const D = ${JSON.stringify(daten)};
const kum = a => { let v = 0; const o = new Int32Array(a.length); for (let i = 0; i < a.length; i++) { v += a[i]; o[i] = v; } return o; };
const GX = kum(entpacke(D.gx)), GY = kum(entpacke(D.gy));
const NZ = GX.length, NF = D.b.length;
const UMRISS = kum(entpacke(D.u));    // Kantenpaare, in Sechzehntelzellen
const H = [];
{ const d = entpacke(D.h); let vor = new Int32Array(NZ);
  for (let f = 0; f < NF; f++) {
    const jetzt = new Int32Array(NZ);
    for (let i = 0; i < NZ; i++) jetzt[i] = vor[i] + d[f * NZ + i];
    H.push(jetzt); vor = jetzt;
  } }
const JAHRE = D.b.map(b => b.t), T0 = JAHRE[0], T1 = JAHRE[NF - 1];
// Die höchste Nadel je Zelle über alle Bilder — gebraucht, um den Ausschnitt
// einmal so zu wählen, dass über die ganze Zeit nichts hinausragt.
const HOECHSTE = new Int32Array(NZ);
for (const f of H) for (let i = 0; i < NZ; i++) if (f[i] > HOECHSTE[i]) HOECHSTE[i] = f[i];

/* ---------- Kamera ----------
   Blick von Süden nach Norden, geneigt. Eine echte Lochkamera: die vorderen
   Nadeln sind grösser als die hinteren, sonst steht das Feld flach da und die
   Tiefe fehlt. Eingepasst wird über alles, was gezeichnet wird — auch über die
   Spitze der höchsten Nadel, sonst schiesst Berlin oben aus dem Bild. */
const NEIGUNG = 0.80;                     // Radiant über der Waagerechten (46°)
const sinN = Math.sin(NEIGUNG), cosN = Math.cos(NEIGUNG);
const mitteX = D.nx / 2;
const ABSTAND = D.ny * 2.1;               // Kamera südlich des Rasters
const KAMERAHOEHE = D.ny * 0.55;
// Höhe der höchsten Nadel, in Rastereinheiten. Der Massstab gilt für alle
// Bilder, damit das Feld über die Zeit wirklich wächst.
const HOCH = D.ny * 0.34 / (D.hoechste / D.stufe);

function roh(gx, gy, h) {
  const dx = gx - mitteX, dy = gy + ABSTAND, dz = h - KAMERAHOEHE;
  const tiefe = dy * cosN - dz * sinN;
  if (tiefe < 0.2) return null;
  return [dx / tiefe, -(dy * sinN + dz * cosN) / tiefe, tiefe];
}

let breite = 0, hoehe = 0, dpr = 1, skala = 1, versatzX = 0, versatzY = 0;
const cv = document.getElementById('feld'), ctx = cv.getContext('2d');

function masse() {
  breite = cv.parentElement.clientWidth;
  hoehe = Math.round(breite * 1.1);
  dpr = Math.min(2.5, devicePixelRatio || 1);
  cv.width = Math.round(breite * dpr); cv.height = Math.round(hoehe * dpr);
  cv.style.height = hoehe + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Rahmen über alles Gezeichnete: jede Zelle am Boden und mit ihrer höchsten
  // Nadel über alle Bilder.
  let l = Infinity, r = -Infinity, o = Infinity, u = -Infinity;
  const merke = p => { if (!p) return; if (p[0] < l) l = p[0]; if (p[0] > r) r = p[0]; if (p[1] < o) o = p[1]; if (p[1] > u) u = p[1]; };
  for (let i = 0; i < NZ; i++) {
    merke(roh(GX[i], GY[i], 0));
    merke(roh(GX[i], GY[i], HOECHSTE[i] * HOCH));
  }
  skala = Math.min(breite * 0.96 / (r - l), hoehe * 0.94 / (u - o));
  versatzX = breite / 2 - skala * (l + r) / 2;
  versatzY = hoehe / 2 - skala * (o + u) / 2;
}

const projiziere = (gx, gy, h) => {
  const p = roh(gx, gy, h);
  return p && [versatzX + skala * p[0], versatzY + skala * p[1], p[2]];
};

/* ---------- Farben ----------
   Eine Tonleiter, dunkel nach hell: auf schwarzem Grund heisst der Schritt
   neben der Fläche „wenig". Kein Regenbogen, eine Farbe. */
const TON = ['#16233a','#1c3358','#22447a','#2a589e','#3a72c4','#5598e7','#86b6ef','#b7d3f6','#e4eefb','#ffffff'];
const HELL = TON.length - 1;

/* ---------- Zeichnen ---------- */
let jahr = T0, laeuft = false, zuletzt = 0;
const hoehen = new Float64Array(NZ);

function bildBei(t) {
  let a = 0;
  while (a < NF - 2 && JAHRE[a + 1] <= t) a++;
  const b = Math.min(NF - 1, a + 1);
  const u = JAHRE[b] > JAHRE[a] ? Math.max(0, Math.min(1, (t - JAHRE[a]) / (JAHRE[b] - JAHRE[a]))) : 0;
  return [a, b, u];
}

function zeichne() {
  const [a, b, u] = bildBei(jahr);
  for (let i = 0; i < NZ; i++) hoehen[i] = H[a][i] + (H[b][i] - H[a][i]) * u;
  ctx.clearRect(0, 0, breite, hoehe);

  // Erst der Umriss auf dem Boden, dann die Nadeln darüber.
  ctx.beginPath();
  for (let i = 0; i < UMRISS.length; i += 4) {
    const p = projiziere(UMRISS[i] / D.ufein, UMRISS[i + 1] / D.ufein, 0);
    const q = projiziere(UMRISS[i + 2] / D.ufein, UMRISS[i + 3] / D.ufein, 0);
    if (!p || !q) continue;
    ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]);
  }
  ctx.strokeStyle = '#31415f'; ctx.lineWidth = 1; ctx.stroke();

  // Die Zellen liegen bereits von hinten nach vorn in der Nutzlast, also
  // reicht ein Durchlauf. Die Farbe wird nur gewechselt, wenn sie sich
  // ändert — das spart bei elftausend Nadeln die meiste Zeit.
  let farbe = -1;
  for (let i = 0; i < NZ; i++) {
    const h = hoehen[i];
    const fuss = projiziere(GX[i], GY[i], 0);
    if (!fuss) continue;
    const kopf = projiziere(GX[i], GY[i], h * HOCH);
    if (!kopf) continue;
    const w = Math.max(1, skala / fuss[2] * 0.95);
    // Farbe nach Höhe. Keine Logarithmen hier: die sollen Zahlen lesbar
    // machen, hier soll das Bild lesbar sein. Die Wurzelkurve lässt das Land
    // dunkel und gibt den Türmen den Weissbereich für sich.
    const t = h <= 0 ? 0 : Math.pow(h / (D.hoechste / D.stufe), 0.45);
    const stufe = Math.min(HELL, Math.round(t * HELL));
    if (stufe !== farbe) { ctx.fillStyle = TON[stufe]; farbe = stufe; }
    const y = Math.min(kopf[1], fuss[1]);
    ctx.fillRect(fuss[0] - w / 2, y, w, Math.max(0.7, fuss[1] - y));
  }
  schreibe(a, b, u);
}

const zahl = new Intl.NumberFormat('en-GB');
function schreibe(a, b, u) {
  const zwischen = u > 0.001 && u < 0.999;
  const bd = D.b[u < 0.5 ? a : b];
  document.getElementById('jahrZahl').textContent = zwischen ? Math.round(jahr) : bd.jahr;
  const bev = D.b[a].bev + (D.b[b].bev - D.b[a].bev) * u;
  document.getElementById('jahrBev').textContent =
    (bev / 1e6).toFixed(1) + ' million' + (zwischen ? ' · interpolated' : ' · ' + bd.stichtage.join(' and '));
  document.getElementById('zeit').value = Math.round((jahr - T0) / (T1 - T0) * 1000);
}

const DAUER = 30000;
function schlag(t) {
  if (laeuft) {
    if (zuletzt) jahr += (t - zuletzt) / DAUER * (T1 - T0);
    zuletzt = t;
    if (jahr >= T1) { jahr = T1; halte(); }
    zeichne();
  }
  requestAnimationFrame(schlag);
}
function starte() { if (jahr >= T1 - 1e-6) jahr = T0; laeuft = true; zuletzt = 0; document.getElementById('spiel').textContent = '❚❚'; }
function halte() { laeuft = false; document.getElementById('spiel').textContent = '▶'; }
document.getElementById('spiel').onclick = () => laeuft ? halte() : starte();
document.getElementById('zeit').addEventListener('input', e => { halte(); jahr = T0 + (T1 - T0) * e.target.value / 1000; zeichne(); });
addEventListener('resize', () => { masse(); zeichne(); });
document.getElementById('marken').innerHTML = D.b.map(b =>
  '<i style="left:' + ((b.t - T0) / (T1 - T0) * 100).toFixed(2) + '%" title="' + b.jahr + '"></i>').join('');

masse(); zeichne();
requestAnimationFrame(schlag);
setTimeout(starte, 700);
</script>
</body></html>
`);
