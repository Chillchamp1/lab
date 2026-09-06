// ---------- Umrisse auspacken ----------
const RAD = Math.PI / 180, KAPP = D.kappung * RAD;
const G = D.gitter;

const dlon = entpacke(D.lon), dlat = entpacke(D.lat);
const NP = dlon.length;
const LON = new Float64Array(NP), LAT = new Float64Array(NP);
for (let i = 0, x = 0, y = 0; i < NP; i++) { x += dlon[i]; y += dlat[i]; LON[i] = x / G; LAT[i] = y / G; }

const ringLen = entpacke(D.ringe), ringZahl = entpacke(D.ringzahl);
const ringOff = new Int32Array(ringLen.length + 1);
for (let i = 0; i < ringLen.length; i++) ringOff[i + 1] = ringOff[i] + ringLen[i];
const landRing = new Int32Array(ringZahl.length + 1);
for (let i = 0; i < ringZahl.length; i++) landRing[i + 1] = landRing[i] + ringZahl[i];

// ---------- Die vier Netze, wortgleich zu build/geometrie.mjs ----------
const A1 = 1.340264, A2 = -0.081106, A3 = 0.000893, A4 = 0.003796;
function eeRoh(l, p) {
  const th = Math.asin(Math.sqrt(3) / 2 * Math.sin(p));
  const t2 = th * th, t6 = t2 * t2 * t2, t8 = t6 * t2;
  return [2 * Math.sqrt(3) * l * Math.cos(th) / (3 * (9 * A4 * t8 + 7 * A3 * t6 + 3 * A2 * t2 + A1)),
          A4 * t8 * th + A3 * t6 * th + A2 * t2 * th + A1 * th];
}
const S_EE = Math.PI / eeRoh(Math.PI, 0)[0];
const R_X = [1, .9986, .9954, .99, .9822, .973, .96, .9427, .9216, .8962, .8679, .835,
             .7986, .7597, .7186, .6732, .6213, .5722, .5322];
const R_Y = [0, .062, .124, .186, .248, .31, .372, .434, .4958, .5571, .6176, .6769,
             .7346, .7903, .8435, .8936, .9394, .9761, 1];
const S_ROB = 1 / .8487;

const PROJ = {
  mercator(l, p) { const q = Math.max(-KAPP, Math.min(KAPP, p)); return [l, Math.log(Math.tan(Math.PI / 4 + q / 2))]; },
  peters(l, p) { return [l, 2 * Math.sin(p)]; },
  equalearth(l, p) { const r = eeRoh(l, p); return [r[0] * S_EE, r[1] * S_EE]; },
  robinson(l, p) {
    const a = Math.abs(p) / RAD / 5, i = Math.min(17, Math.floor(a)), f = a - i;
    return [.8487 * l * (R_X[i] + (R_X[i + 1] - R_X[i]) * f) * S_ROB,
            Math.sign(p) * 1.3523 * (R_Y[i] + (R_Y[i + 1] - R_Y[i]) * f) * S_ROB];
  },
};
const NETZ = D.netze.map(n => n.id);
const M = NETZ.indexOf('mercator');

// Eine Ebene hält dieselben Punkte in allen vier Netzen. Das kostet vier
// Float32Arrays und macht das Überblenden zu einer reinen Interpolation.
function ebene(lo, la) {
  const n = lo.length, X = [], Y = [], kasten = [];
  for (const id of NETZ) {
    const x = new Float32Array(n), y = new Float32Array(n);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (let i = 0; i < n; i++) {
      const r = PROJ[id](lo[i] * RAD, la[i] * RAD);
      x[i] = r[0]; y[i] = r[1];
      if (r[0] < x0) x0 = r[0]; if (r[0] > x1) x1 = r[0];
      if (r[1] < y0) y0 = r[1]; if (r[1] > y1) y1 = r[1];
    }
    X.push(x); Y.push(y); kasten.push([x0, x1, y0, y1]);
  }
  return { n, X, Y, kasten, cx: new Float32Array(n), cy: new Float32Array(n) };
}

const land = ebene(LON, LAT);

// ---------- Zugaben: entstehen aus Formeln, kosten keine Nutzlast ----------
function zuegeZuEbene(zuege) {
  const n = zuege.reduce((s, z) => s + z.length, 0);
  const lo = new Float64Array(n), la = new Float64Array(n), abschnitt = [];
  let k = 0;
  for (const z of zuege) { abschnitt.push([k, z.length]); for (const p of z) { lo[k] = p[0]; la[k] = p[1]; k++; } }
  const e = ebene(lo, la); e.abschnitt = abschnitt; return e;
}

const gradnetz = (() => {
  const s = D.zugaben.gradnetzSchritt, z = [];
  for (let l = -180; l < 180; l += s) { const q = []; for (let p = -90; p <= 90; p += 1) q.push([l, p]); z.push(q); }
  for (let p = -90 + s; p < 90; p += s) { const q = []; for (let l = -180; l <= 180; l += 2) q.push([l, p]); z.push(q); }
  return zuegeZuEbene(z);
})();

// Kreis gleichen wahren Radius um einen Punkt der Kugel. Was ein Netz mit ihm
// macht, ist genau das, was es mit jeder kleinen Fläche dort macht.
const tissot = (() => {
  const d = D.zugaben.tissotRadiusKm / 6371.0088, z = [];
  for (const p0 of D.zugaben.tissotBreiten) for (const l0 of D.zugaben.tissotLaengen) {
    const f0 = p0 * RAD, g0 = l0 * RAD, q = [];
    for (let k = 0; k <= 48; k++) {
      const b = k / 48 * 2 * Math.PI;
      const f = Math.asin(Math.sin(f0) * Math.cos(d) + Math.cos(f0) * Math.sin(d) * Math.cos(b));
      const g = g0 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(f0), Math.cos(d) - Math.sin(f0) * Math.sin(f));
      q.push([g / RAD, f / RAD]);
    }
    z.push(q);
  }
  return zuegeZuEbene(z);
})();

// Loxodrome (konstanter Kurs) und Grosskreis (kürzester Weg) für dieselben
// Endpunkte. Gestrichelt ist der Kurs, durchgezogen der kurze Weg.
const kurse = (() => {
  const psi = p => Math.log(Math.tan(Math.PI / 4 + p * RAD / 2)), z = [], art = [];
  for (const k of D.zugaben.kurse) {
    const [l1, p1] = k.von, [l2, p2] = k.nach;
    const q1 = [], d1 = psi(p2) - psi(p1);
    for (let i = 0; i <= 200; i++) {
      const p = p1 + (p2 - p1) * i / 200;
      q1.push([l1 + (d1 === 0 ? (l2 - l1) * i / 200 : (psi(p) - psi(p1)) / d1 * (l2 - l1)), p]);
    }
    z.push(q1); art.push('lox');
    const v = (l, p) => [Math.cos(p * RAD) * Math.cos(l * RAD), Math.cos(p * RAD) * Math.sin(l * RAD), Math.sin(p * RAD)];
    const a = v(l1, p1), b = v(l2, p2);
    const w = Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))), q2 = [];
    for (let i = 0; i <= 200; i++) {
      const f = i / 200, s1 = Math.sin((1 - f) * w) / Math.sin(w), s2 = Math.sin(f * w) / Math.sin(w);
      const c = [a[0] * s1 + b[0] * s2, a[1] * s1 + b[1] * s2, a[2] * s1 + b[2] * s2];
      q2.push([Math.atan2(c[1], c[0]) / RAD, Math.asin(c[2] / Math.hypot(c[0], c[1], c[2])) / RAD]);
    }
    z.push(q2); art.push('gk');
  }
  const e = zuegeZuEbene(z); e.art = art; return e;
})();

// ---------- Länder ----------
const LAND = D.laender.map((r, i) => ({
  i, name: r[0], iso: r[1], kontinent: r[2], wahr: r[3], einwohner: r[4],
  faktor: [r[5] / 1000, r[6] / 1000, r[7] / 1000, r[8] / 1000],
  logF: [Math.log(r[5] / 1000), Math.log(r[6] / 1000), Math.log(r[7] / 1000), Math.log(r[8] / 1000)],
  x0: 0, x1: 0, y0: 0, y1: 0,
}));

// ---------- Farbskala ----------
const misch = (a, b, f) => a.map((v, i) => Math.round(v + (b[i] - v) * f));
const hex = c => '#' + c.map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');

// Stützstellen statt zweier Endpunkte: der direkte Weg von Blaugrün nach
// Rostrot führt im RGB-Raum durch ein schlammiges Grau. Die Mitte ist bewusst
// ein sattes Sandton und kein Papierweiss — bei einem flächentreuen Netz
// stehen alle Länder auf 1, und die Karte muss dann noch im Meer zu sehen sein.
const STUETZEN = [
  [-1.000, [ 18, 105, 122]],
  [-0.585, [ 74, 154, 163]],
  [-0.256, [154, 190, 185]],
  [ 0.000, [222, 211, 186]],
  [ 0.369, [208, 154, 114]],
  [ 0.631, [184,  95,  60]],
  [ 1.000, [141,  48,  30]],
];
const SKALA = [];
for (let i = 0; i <= 64; i++) {
  const v = i / 32 - 1;
  let k = 0;
  while (k < STUETZEN.length - 2 && v > STUETZEN[k + 1][0]) k++;
  const [v0, c0] = STUETZEN[k], [v1, c1] = STUETZEN[k + 1];
  SKALA.push(hex(misch(c0, c1, (v - v0) / (v1 - v0))));
}
const LN3 = Math.log(3);
const skalaIndex = lf => Math.max(0, Math.min(64, Math.round((lf / LN3 + 1) * 32)));

// ---------- Zeichnen ----------
const cv = document.getElementById('karte'), ctx = cv.getContext('2d');
// Mercator ist mit gekappten Polen fast quadratisch (1,12:1), Equal Earth doppelt
// so breit wie hoch (2,06:1). Ein Rahmen dazwischen lässt beiden Enden etwas
// Luft, statt einem von beiden den Platz wegzunehmen.
const VERHAELTNIS = 1.30;
let breite = 0, hoehe = 0, dpr = 1, skala = 1, mx = 0, my = 0;

let t = 0, u = 1, zielA = 2, zielB = 2;              // Ziel 2 = Equal Earth
let zeigGrad = true, zeigTissot = false, zeigKurs = false;

const dreiFach = (m, a, b) => m + ((a + (b - a) * u) - m) * t;

function mischeEbene(e, auswahl) {
  const ax = e.X[zielA], ay = e.Y[zielA], bx = e.X[zielB], by = e.Y[zielB], mxA = e.X[M], myA = e.Y[M];
  if (auswahl) {
    for (let k = 0; k < auswahl.length; k++) {
      const i = auswahl[k];
      e.cx[i] = dreiFach(mxA[i], ax[i], bx[i]);
      e.cy[i] = dreiFach(myA[i], ay[i], by[i]);
    }
    return;
  }
  for (let i = 0; i < e.n; i++) {
    e.cx[i] = dreiFach(mxA[i], ax[i], bx[i]);
    e.cy[i] = dreiFach(myA[i], ay[i], by[i]);
  }
}

// Natural Earth 1:50 m ist an den Küsten weit feiner, als ein Bildschirm zeigen
// kann: bei 1000 Punkten Kartenbreite deckt ein Bildpunkt gut ein Drittel Grad
// ab. Punkte, die enger beieinanderliegen als ein halber Bildpunkt, werden vor
// dem Zeichnen übersprungen — je Ring einzeln, was an gemeinsamen Grenzen
// Lücken unter einem halben Bildpunkt hinterlässt und damit unter der Strichbreite,
// mit der die Länder ohnehin gegeneinander abgesetzt sind.
let AUSWAHL = null, zRingVon = null;

function duenneAus() {
  let sMax = 0;
  for (let i = 0; i < NETZ.length; i++) {
    const k = land.kasten[i];
    sMax = Math.max(sMax, Math.min(breite / (k[1] - k[0]), hoehe / (k[3] - k[2])) * .97);
  }
  const schwelle = .5 / sMax / RAD;              // ein halber Bildpunkt, in Grad
  const idx = [], von = new Int32Array(ringLen.length + 1);
  for (let r = 0; r < ringLen.length; r++) {
    von[r] = idx.length;
    const a = ringOff[r], b = ringOff[r + 1];
    let lx = LON[a], ly = LAT[a];
    idx.push(a);
    for (let p = a + 1; p < b; p++) {
      if (Math.abs(LON[p] - lx) >= schwelle || Math.abs(LAT[p] - ly) >= schwelle) {
        idx.push(p); lx = LON[p]; ly = LAT[p];
      }
    }
    // Ein Ring braucht drei Ecken, sonst verschwindet die Insel ganz.
    for (let p = a + 1; p < b && idx.length - von[r] < 3; p++) if (idx[idx.length - 1] !== p) idx.push(p);
  }
  von[ringLen.length] = idx.length;
  AUSWAHL = Int32Array.from(idx); zRingVon = von;
}

function messe() {
  const w = cv.parentElement.clientWidth;
  dpr = Math.min(2, window.devicePixelRatio || 1);
  breite = w; hoehe = Math.round(w / VERHAELTNIS);
  cv.width = Math.round(breite * dpr); cv.height = Math.round(hoehe * dpr);
  cv.style.height = hoehe + 'px';
  duenneAus();
}

let bildNr = 0, kastenNr = -1;

function kaesten() {
  if (kastenNr === bildNr) return;
  kastenNr = bildNr;
  const CX = land.cx, CY = land.cy;
  for (const l of LAND) {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    const a = zRingVon[landRing[l.i]], b = zRingVon[landRing[l.i + 1]];
    for (let k = a; k < b; k++) {
      const p = AUSWAHL[k], x = CX[p], y = CY[p];
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    l.x0 = x0; l.x1 = x1; l.y0 = y0; l.y1 = y1;
  }
}

function zeichne() {
  bildNr++;
  mischeEbene(land, AUSWAHL);
  if (zeigGrad) mischeEbene(gradnetz);
  if (zeigTissot) mischeEbene(tissot);
  if (zeigKurs) mischeEbene(kurse);

  const k = land.kasten;
  const x0 = dreiFach(k[M][0], k[zielA][0], k[zielB][0]), x1 = dreiFach(k[M][1], k[zielA][1], k[zielB][1]);
  const y0 = dreiFach(k[M][2], k[zielA][2], k[zielB][2]), y1 = dreiFach(k[M][3], k[zielA][3], k[zielB][3]);
  skala = Math.min(breite / (x1 - x0), hoehe / (y1 - y0)) * .97;
  mx = (x0 + x1) / 2; my = (y0 + y1) / 2;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, breite, hoehe);
  ctx.setTransform(skala * dpr, 0, 0, -skala * dpr,
    (breite / 2 - mx * skala) * dpr, (hoehe / 2 + my * skala) * dpr);

  const CX = land.cx, CY = land.cy;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--karte').trim() || '#eceae4';
  ctx.lineWidth = .7 / skala;

  for (const l of LAND) {
    const f = dreiFach(l.logF[M], l.logF[zielA], l.logF[zielB]);
    ctx.fillStyle = SKALA[skalaIndex(f)];
    ctx.beginPath();
    for (let r = landRing[l.i]; r < landRing[l.i + 1]; r++) {
      const a = zRingVon[r], b = zRingVon[r + 1];
      ctx.moveTo(CX[AUSWAHL[a]], CY[AUSWAHL[a]]);
      for (let k = a + 1; k < b; k++) ctx.lineTo(CX[AUSWAHL[k]], CY[AUSWAHL[k]]);
      ctx.closePath();
    }
    ctx.fill('evenodd');
    ctx.stroke();
  }

  const zug = (e, i) => {
    const [a, n] = e.abschnitt[i];
    ctx.moveTo(e.cx[a], e.cy[a]);
    for (let p = a + 1; p < a + n; p++) ctx.lineTo(e.cx[p], e.cy[p]);
  };

  if (zeigGrad) {
    ctx.strokeStyle = 'rgba(22,24,29,.19)'; ctx.lineWidth = .8 / skala;
    ctx.beginPath();
    for (let i = 0; i < gradnetz.abschnitt.length; i++) zug(gradnetz, i);
    ctx.stroke();
  }
  if (zeigTissot) {
    ctx.fillStyle = 'rgba(22,24,29,.10)'; ctx.strokeStyle = 'rgba(22,24,29,.42)';
    ctx.lineWidth = 1.1 / skala;
    for (let i = 0; i < tissot.abschnitt.length; i++) {
      ctx.beginPath(); zug(tissot, i); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }
  if (zeigKurs) {
    ctx.lineWidth = 2 / skala; ctx.lineCap = 'round';
    for (let i = 0; i < kurse.abschnitt.length; i++) {
      const gk = kurse.art[i] === 'gk';
      ctx.strokeStyle = gk ? '#16181d' : '#8a5a2b';
      ctx.setLineDash(gk ? [] : [6 / skala, 5 / skala]);
      ctx.beginPath(); zug(kurse, i); ctx.stroke();
    }
    ctx.setLineDash([]);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

// ---------- Bedienung ----------
const reg = document.getElementById('reg');
let wartet = false;
function neuZeichnen() {
  if (wartet) return;
  wartet = true;
  requestAnimationFrame(() => { wartet = false; zeichne(); });
}
function setze(v, { schieber = true } = {}) { t = v; if (schieber) reg.value = Math.round(v * 1000); neuZeichnen(); }
reg.addEventListener('input', () => setze(reg.value / 1000, { schieber: false }));

function animiere(schritt, dauer, fertig) {
  const t0 = performance.now();
  (function lauf(jetzt) {
    const p = Math.min(1, (jetzt - t0) / dauer);
    schritt(p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
    if (p < 1) requestAnimationFrame(lauf); else if (fertig) fertig();
  })(t0);
}

const ziele = document.getElementById('ziele');
D.netze.forEach((n, i) => {
  if (i === M) return;
  const b = document.createElement('button');
  b.textContent = n.name;
  b.dataset.netz = i;
  b.setAttribute('aria-pressed', i === zielB ? 'true' : 'false');
  b.addEventListener('click', () => waehle(i));
  ziele.appendChild(b);
});

function waehle(i) {
  if (i === zielB) { if (t < .999) animiere(e => setze(e), 850); return; }
  zielA = zielB; zielB = i; u = 0;
  for (const b of ziele.children) b.setAttribute('aria-pressed', +b.dataset.netz === i ? 'true' : 'false');
  beschrifte();
  tabellen();
  animiere(e => { u = e; neuZeichnen(); }, 620, () => { zielA = zielB; u = 1; });
  if (t < .999) animiere(e => setze(e), 850);
}

function beschrifte() {
  const n = D.netze[zielB];
  document.getElementById('zielName').textContent = n.name + ', ' + n.jahr;
  document.getElementById('zielName2').textContent = n.name;
}

document.getElementById('cGrad').addEventListener('change', e => { zeigGrad = e.target.checked; neuZeichnen(); });
document.getElementById('cTissot').addEventListener('change', e => { zeigTissot = e.target.checked; neuZeichnen(); });
document.getElementById('cKurs').addEventListener('change', e => { zeigKurs = e.target.checked; neuZeichnen(); });

// ---------- Tabellen ----------
const nf = (n, d = 0) => n.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
function tabellen() {
  const z = zielB;
  document.getElementById('tKont').innerHTML =
    '<tr><th>Kontinent</th>' + D.netze.map(n => '<th class="z">' + n.name + '</th>').join('') +
    '<th class="z">Einwohner</th></tr>' +
    D.kontinente.map(r => '<tr><td>' + r[0] + '</td>' +
      r.slice(1, 5).map(v => '<td class="z">' + nf(v, 1) + ' %</td>').join('') +
      '<td class="z">' + nf(r[5]) + ' Mio</td></tr>').join('');

  // Sortiert wird nach der absolut gewonnenen oder verlorenen Bildfläche, nicht
  // nach Prozent: sonst stünden auf der Gewinnerseite nur winzige Äquatorländer,
  // die alle denselben Wert tragen.
  const kandidaten = LAND.filter(l => l.wahr > 150000 && l.iso !== 'ATA')
    .map(l => ({ l, v: l.faktor[z] / l.faktor[M] - 1, d: l.wahr * (l.faktor[z] - l.faktor[M]) }))
    .sort((a, b) => a.d - b.d);
  const tab = (titel, zeilen) =>
    '<tr><th>' + titel + '</th><th class="z">Fläche</th><th class="z">Bildanteil</th></tr>' +
    zeilen.map(({ l, v }) => '<tr><td>' + l.name + '</td><td class="z">' +
      nf(l.wahr / 1e6, 2) + ' Mio km²</td><td class="z">' +
      (v >= 0 ? '+' : '−') + nf(Math.abs(v) * 100) + ' %</td></tr>').join('');
  document.getElementById('tVerlust').innerHTML = tab('verliert Bildfläche', kandidaten.slice(0, 8));
  document.getElementById('tGewinn').innerHTML = tab('gewinnt Bildfläche', kandidaten.slice(-8).reverse());
}

// ---------- Tooltip ----------
const tip = document.getElementById('tip');
let aktiv = null;

function treffer(px, py) {
  kaesten();
  const x = (px - breite / 2) / skala + mx, y = (hoehe / 2 - py) / skala + my;
  for (const l of LAND) {
    if (x < l.x0 || x > l.x1 || y < l.y0 || y > l.y1) continue;
    let drin = false;
    for (let r = landRing[l.i]; r < landRing[l.i + 1]; r++) {
      const a = zRingVon[r], b = zRingVon[r + 1];
      for (let k = a, m = b - 1; k < b; m = k++) {
        const i = AUSWAHL[k], j = AUSWAHL[m], yi = land.cy[i], yj = land.cy[j];
        if ((yi > y) !== (yj > y) &&
            x < (land.cx[j] - land.cx[i]) * (y - yi) / (yj - yi) + land.cx[i]) drin = !drin;
      }
    }
    if (drin) return l;
  }
  return null;
}

function zeigeTip(l, ev) {
  const f = Math.exp(dreiFach(l.logF[M], l.logF[zielA], l.logF[zielB]));
  const ab = Math.round(Math.abs(f - 1) * 100);
  const satz = ab < 3 ? 'so gross wie zustehend'
    : f > 1 ? nf(ab) + ' % mehr Bildfläche als zustehend'
            : nf(ab) + ' % weniger Bildfläche als zustehend';
  tip.innerHTML = '<div class="n">' + l.name + '</div>' +
    '<div class="m">' + nf(l.wahr / 1e6, 3) + ' Mio km²' +
    (l.einwohner ? ' · ' + nf(l.einwohner / 1e6, 1) + ' Mio Einw.' : '') + '</div>' +
    '<div class="f">' + satz + '<br>Faktor ' + nf(f, 2) + '</div>';
  tip.style.left = ev.clientX + 'px';
  tip.style.top = ev.clientY + 'px';
  tip.style.opacity = '1';
}

cv.addEventListener('pointermove', ev => {
  const r = cv.getBoundingClientRect();
  const l = treffer(ev.clientX - r.left, ev.clientY - r.top);
  aktiv = l;
  if (l) zeigeTip(l, ev); else tip.style.opacity = '0';
});
cv.addEventListener('pointerleave', () => { aktiv = null; tip.style.opacity = '0'; });

// ---------- Start ----------
addEventListener('resize', () => { messe(); zeichne(); });
messe(); beschrifte(); tabellen(); zeichne();
