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
const PROJ = {
  mercator(l, p) { const q = Math.max(-KAPP, Math.min(KAPP, p)); return [l, Math.log(Math.tan(Math.PI / 4 + q / 2))]; },
  equalearth(l, p) { const r = eeRoh(l, p); return [r[0] * S_EE, r[1] * S_EE]; },
};
// Nur die ebenen Netze werden hier projiziert. Der Globus steht in D.netze
// mit dabei, wird aber gedreht statt projiziert und hängt hinten dran.
const NETZ = D.netze.filter(n => PROJ[n.id]).map(n => n.id);
const M = NETZ.indexOf('mercator');

// Eine Ebene hält dieselben Punkte in allen vier Netzen. Das kostet vier
// Float32Arrays und macht das Überblenden zu einer reinen Interpolation.
// Der Globus ist eine Kugel vom Radius 1. Das ist nicht willkürlich: die
// ebenen Netze sind auf die Äquatorlänge 2π normiert, und eine Karte dieser
// Breite wickelt sich genau auf eine Kugel dieses Radius. Die Überblendung
// zeigt also wirklich das Aufwickeln und nicht nebenbei eine Grössenänderung.
// Alle drei Zustände tragen dieselbe Handschrift: Länder schwimmen auf dem
// Papier, getrennt von einer Linie in Papierfarbe, und ein Meer gibt es
// nirgends — auch auf der Kugel nicht. Ein eigenes Blau nur für den Globus
// hätte den Vergleich zu einem Vergleich zweier Kartenstile gemacht statt
// zweier Projektionen; das Auge liest den Farbwechsel zuerst und die Form
// danach.
const PAPIER_RGB = [237, 235, 230];

const R_GLOBUS = 1;
const GLOBUS = NETZ.length;          // Steckplatz hinter den ebenen Netzen

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

  // Für den Globus wird nicht projiziert, sondern gedreht. Die Einheitsvektoren
  // auf der Kugel hängen nicht von der Drehung ab und werden einmal gerechnet;
  // eine Drehung ist danach eine Handvoll Multiplikationen je Punkt, ganz ohne
  // Winkelfunktionen. Deshalb kann der Globus am Zeiger hängen.
  const vx = new Float32Array(n), vy = new Float32Array(n), vz = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const l = lo[i] * RAD, p = la[i] * RAD, c = Math.cos(p);
    vx[i] = c * Math.cos(l); vy[i] = c * Math.sin(l); vz[i] = Math.sin(p);
  }
  X.push(new Float32Array(n)); Y.push(new Float32Array(n));
  kasten.push([-R_GLOBUS, R_GLOBUS, -R_GLOBUS, R_GLOBUS]);

  return { n, X, Y, kasten, vx, vy, vz, vorn: new Uint8Array(n),
           // Zwei Lagen für die Rückseite: durchgefaltet und an den Rand geklemmt.
           fx: new Float32Array(n), fy: new Float32Array(n),
           kx: new Float32Array(n), ky: new Float32Array(n),
           cx: new Float32Array(n), cy: new Float32Array(n) };
}

// Blickmitte des Globus. Vorbelegt auf Afrika und Europa — das ist der Streit.
let dreheLam = 10 * RAD, drehePhi = 20 * RAD;

// Die Rückseite bekommt zwei Lagen, weil das Aufwickeln und die fertige Kugel
// Verschiedenes brauchen.
//
// *Durchgefaltet* ist die schlichte orthografische Lage: ein Punkt hinter dem
// Horizont klappt nach innen zurück. Das ist die Bewegung, die das Aufwickeln
// braucht — die abgewandte Seite läuft weiter, taucht am Rand ein und geht
// hinter der Vorderseite durch, statt sich als Wand am Rand aufzustauen.
//
// *Geklemmt* schiebt denselben Punkt längs seiner Richtung auf den Rand. Das
// braucht die fertige Kugel: ein Umriss, der über den Horizont läuft, bekommt
// dadurch genau den Randbogen als Abschluss, ohne dass man Vielecke an einem
// Kreis beschneiden müsste.
function dreheEbene(e) {
  const sl = Math.sin(dreheLam), cl = Math.cos(dreheLam);
  const sp = Math.sin(drehePhi), cp = Math.cos(drehePhi);
  const { fx, fy, kx, ky, vorn: V } = e;
  for (let i = 0; i < e.n; i++) {
    const x = e.vx[i], y = e.vy[i], z = e.vz[i];
    const px = x * cl + y * sl, py = y * cl - x * sl;
    const qy = z * cp - px * sp, qz = px * cp + z * sp;
    V[i] = qz > 0 ? 1 : 0;
    fx[i] = R_GLOBUS * py; fy[i] = R_GLOBUS * qy;
    if (qz > 0) { kx[i] = fx[i]; ky[i] = fy[i]; }
    else {
      const r = Math.hypot(py, qy);
      if (r < 1e-9) { kx[i] = R_GLOBUS; ky[i] = 0; }
      else { kx[i] = R_GLOBUS * py / r; ky[i] = R_GLOBUS * qy / r; }
    }
  }
  e.klemmeStand = -1;
}

// Erst zum Schluss des Aufwickelns wird geklemmt. Vorher geht die Rückseite
// durch sich selbst hindurch; das Klemmen zieht sie dann in den Rand, während
// sie ohnehin schon verblasst.
function klemmeSetzen(e, k) {
  if (e.klemmeStand === k) return;
  e.klemmeStand = k;
  const X = e.X[GLOBUS], Y = e.Y[GLOBUS], { fx, fy, kx, ky } = e;
  if (k <= 0) { X.set(fx); Y.set(fy); return; }
  if (k >= 1) { X.set(kx); Y.set(ky); return; }
  for (let i = 0; i < e.n; i++) {
    X[i] = fx[i] + (kx[i] - fx[i]) * k;
    Y[i] = fy[i] + (ky[i] - fy[i]) * k;
  }
}

// Zwei Vorgänge, die sich nicht überschneiden dürfen.
//
// Erst *verblasst* die abgewandte Seite: sie ist bis dahin durchgefaltet, läuft
// also hinter der Vorderseite durch, und geht dort aus, wo sie hingehört —
// hinten. Danach erst *klemmt* der Rest an den Rand. Überschnitten sie sich,
// zöge die Klemme die Rückseite noch einmal nach aussen und machte das
// Durchgehen wieder zunichte.
//
// Was am Ende noch geklemmt wird, sind die Zipfel der Länder, die über den
// Horizont ragen. Die liegen dicht am Rand, wo durchgefaltet und geklemmt fast
// dasselbe ist — deshalb fällt dieser Teil nicht auf.
const weich = x => { const s = Math.max(0, Math.min(1, x)); return s * s * (3 - 2 * s); };
const verblassenAus = gA => weich((gA - .6) / .25);
const klemmeAus = gA => weich((gA - .85) / .15);

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
// Nur das längere Streckenpaar wird beschriftet — bei vier Beschriftungen
// stünde die Karte voll, und die kurze Strecke zeigt dasselbe.
const BESCHRIFTUNG = [[2, 'gleicher Kompasskurs', false], [3, 'kürzester Weg', true]];

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

const EBENEN = [land, gradnetz, tissot, kurse];
function dreheAlle() { for (const e of EBENEN) dreheEbene(e); }
function klemmeAlle(k) { for (const e of EBENEN) klemmeSetzen(e, k); }
dreheAlle();

// ---------- Länder ----------
const LAND = D.laender.map((r, i) => {
  const f = r.slice(5).map(v => v / 1000);        // Mercator, Equal Earth, Globus
  return {
    i, name: r[0], iso: r[1], kontinent: r[2], wahr: r[3], einwohner: r[4],
    faktor: f, logF: f.map(Math.log),
    x0: 0, x1: 0, y0: 0, y1: 0,
  };
});

// ---------- Farbskala ----------
const misch = (a, b, f) => a.map((v, i) => Math.round(v + (b[i] - v) * f));
const hex = c => '#' + c.map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');

// Stützstellen statt zweier Endpunkte: der direkte Weg von Blaugrün nach
// Rostrot führt im RGB-Raum durch ein schlammiges Grau. Die Mitte ist bewusst
// ein satter Sandton und kein Papierweiss — bei einem flächentreuen Netz
// stehen alle Länder auf 1, und die Karte muss dann noch auf dem Papier zu
// sehen sein. Viel ist es nicht: 1,25:1 gegen das Papier, die schwächste der
// 65 Stufen. Das ist der Preis dafür, dass alle drei Ansichten gleich
// aussehen, und er fällt in allen dreien gleich an.
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

let t = 0, u = 1, zielA = 1, zielB = 1;              // Ziel 1 = Equal Earth
let zeigGrad = true, zeigTissot = false, zeigKurs = false;

// Normalerweise sagt die Farbe, wie stark die *gerade gezeigte* Darstellung ein
// Land verzerrt. Festgehalten sagt sie stattdessen, wie stark *Mercator* es
// verzerrt, und bleibt beim Umblenden stehen: dann sieht man auf der richtigen
// Gestalt, wen die alte Karte kleinrechnet.
let farbeFest = false;

// Die laufende Verzerrung wird nicht aus einer Tabelle geholt, sondern in jedem
// Bild an dem gemessen, was tatsächlich auf dem Schirm steht: Flächeninhalt
// jedes Landes im aktuellen Bild, geteilt durch seinen Anteil an der Wahrheit.
//
// Das war nötig, weil die Kugel selbst verzerrt. Eine vorberechnete Tabelle
// kennt nur die Netze und behauptet für den Globus überall Faktor 1 — aber die
// Ansicht einer Kugel staucht zum Rand hin alles zusammen, bei 60° vom
// Mittelpunkt auf die Hälfte, am Rand auf null. Gemessen statt behauptet zeigt
// die Farbe das mit, und sie wandert beim Drehen mit.
let liveLog = null, bezug = null, bezugSumme = 0;

// Flächeninhalt eines Landes im gerade gezeichneten Bild (Gausssche
// Trapezformel über seine Ringe). Löcher zählen mit, aber weil die Bezugsgrösse
// mit derselben Regel gemessen wird, kürzt sich das im Verhältnis heraus.
//
// Gemessen wird über *alle* Punkte, nicht über die ausgedünnten. Die Ausdünnung
// wirft weg, was unter einem halben Bildpunkt liegt — für das Zeichnen ist das
// unsichtbar, für eine Flächenmessung nicht: ein Zwergstaat schrumpft dabei auf
// die drei Ecken, die ein Ring mindestens braucht, und daran ist nichts mehr zu
// messen. Saint-Barthélemy lag so um 118 % daneben. Rechnen ist billig, das
// Bauen der Pfade ist es nicht — also volle Geometrie fürs Messen, ausgedünnte
// fürs Zeichnen.
function bildFlaeche(i, X, Y) {
  let f = 0;
  for (let r = landRing[i]; r < landRing[i + 1]; r++) {
    const a = ringOff[r], b = ringOff[r + 1];
    let s = 0;
    for (let p = a, q = b - 1; p < b; q = p++) s += X[q] * Y[p] - X[p] * Y[q];
    f += Math.abs(s / 2);
  }
  return f;
}

// Bezug ist das flächentreue Netz: dort bekommt jedes Land genau seinen Anteil.
function messeBezug() {
  const iE = NETZ.indexOf('equalearth');
  bezug = new Float64Array(LAND.length);
  bezugSumme = 0;
  for (const l of LAND) {
    bezug[l.i] = bildFlaeche(l.i, land.X[iE], land.Y[iE]);
    if (l.iso !== 'ATA') bezugSumme += bezug[l.i];
  }
}

// Woran der Vergleich hängt, ist bei der ebenen Karte und bei der Kugel nicht
// dasselbe, und das eine auf das andere zu zwingen war der Fehler.
//
// Die ebene Karte zeigt die ganze Welt. Das Blatt ist ein fester Vorrat, der
// verteilt wird, und die Frage lautet: bekommt ein Land mehr oder weniger davon,
// als ihm zusteht? Deshalb wird auf die gezeigte Gesamtfläche normiert, und
// deshalb gibt es beide Richtungen — zu gross und zu klein.
//
// Die Kugel zeigt eine Hälfte, und sie hat einen natürlichen Massstab: dort, wo
// man senkrecht draufschaut, ist sie unverzerrt. Der Flächenmassstab ist genau
// der Kosinus des Abstands zu diesem Punkt, also 1 in der Mitte und 0 am Rand.
// Hier gibt es nur eine Richtung: zu klein, nirgends zu gross. Auf die gezeigte
// Fläche zu normieren hätte behauptet, die Mitte bekomme mehr als ihren Anteil —
// sie bekommt genau ihren, alles andere weniger.
//
// Der feste Umrechnungsfaktor für die Kugel ist kein angepasster Wert: die
// Bezugsgrössen liegen im auf Äquatorlänge 2π gestreckten Equal-Earth-Netz, und
// diese Streckung vergrössert Flächen um S_EE². Das wieder herausgerechnet
// liefert den Kosinus blank.
const NORM_GLOBUS = S_EE * S_EE;

function messeLive() {
  if (!liveLog) liveLog = new Float64Array(LAND.length);
  let summe = 0;
  const jetzt = new Float64Array(LAND.length);
  for (const l of LAND) {
    jetzt[l.i] = bildFlaeche(l.i, land.cx, land.cy);
    if (l.iso !== 'ATA') summe += jetzt[l.i];
  }
  const gA = globusAnteil();
  const flach = summe > 0 ? bezugSumme / summe : 1;
  const norm = Math.pow(flach, 1 - gA) * Math.pow(NORM_GLOBUS, gA);
  for (const l of LAND) {
    let f = bezug[l.i] > 0 ? jetzt[l.i] * norm / bezug[l.i] : 1;
    // Ein Land ganz auf der Rückseite ist auf den Rand zusammengefallen. Seine
    // gemessene Fläche ist dann nur noch Rauschen, und bei einer winzigen Insel
    // kann das den eigenen Bezugswert übersteigen — Niue kam so auf 12,56 und
    // wäre tiefrot geworden, obwohl es gar nicht zu sehen ist. Auf der Kugel ist
    // der richtige Wert null.
    if (gA > 0) f *= 1 - gA * (istVorn(l.i) ? 0 : 1);
    liveLog[l.i] = f > 1e-6 ? Math.log(f) : Math.log(1e-6);
  }
}

// Liegt irgendein Punkt des Landes auf der zugewandten Seite?
function istVorn(i) {
  const V = land.vorn;
  for (let p = ringOff[landRing[i]], b = ringOff[landRing[i + 1]]; p < b; p++) if (V[p]) return true;
  return false;
}

const farbwert = l => farbeFest ? l.logF[M] : liveLog[l.i];

const dreiFach = (m, a, b) => m + ((a + (b - a) * u) - m) * t;

// Wie stark der Globus gerade im Bild ist. Steuert das Wegfallen der
// Rückseite und ob ein Zug am Zeiger dreht statt zu zeigen. An der Farbgebung
// hängt nichts mehr: die ist in allen drei Ansichten dieselbe.
const globusAnteil = () =>
  dreiFach(0, zielA === GLOBUS ? 1 : 0, zielB === GLOBUS ? 1 : 0);

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
  messeBezug();
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
  klemmeAlle(klemmeAus(globusAnteil()));
  mischeEbene(land);
  messeLive();
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

  const CX = land.cx, CY = land.cy, gA = globusAnteil();

  // Ein Land ganz auf der Rückseite verblasst über dasselbe letzte Fünftel, in
  // dem es in den Rand gezogen wird. Vorher ist es eine echte Fläche, die durch
  // die Vorderseite hindurchwandert und dabei zu sehen sein soll.
  const klemme = klemmeAus(gA), verblassen = verblassenAus(gA);
  const rueckseiteWeg = verblassen >= 1;
  const vorn = land.vorn;

  // Die trennende Linie in Papierfarbe — dieselbe auf dem Blatt wie auf der
  // Kugel, und in derselben Stärke. Sie hängt an nichts, was sich während der
  // Überblendung ändert, also ändert sich auch nichts an ihr.
  ctx.lineJoin = 'round';
  ctx.strokeStyle = hex(PAPIER_RGB);
  ctx.lineWidth = .7 / skala;

  for (const l of LAND) {
    const hinten = verblassen > 0 && !istVorn(l.i);
    if (hinten && verblassen >= 1) continue;
    ctx.globalAlpha = hinten ? 1 - verblassen : 1;
    ctx.fillStyle = SKALA[skalaIndex(farbwert(l))];
    ctx.beginPath();
    let gezeichnet = false;
    for (let r = landRing[l.i]; r < landRing[l.i + 1]; r++) {
      const a = zRingVon[r], b = zRingVon[r + 1];
      if (rueckseiteWeg) {
        let sichtbar = false;
        for (let k = a; k < b; k++) if (vorn[AUSWAHL[k]]) { sichtbar = true; break; }
        if (!sichtbar) continue;
      }
      ctx.moveTo(CX[AUSWAHL[a]], CY[AUSWAHL[a]]);
      for (let k = a + 1; k < b; k++) ctx.lineTo(CX[AUSWAHL[k]], CY[AUSWAHL[k]]);
      ctx.closePath();
      gezeichnet = true;
    }
    if (!gezeichnet) continue;
    ctx.fill('evenodd');
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const zug = (e, i) => {
    const [a, n] = e.abschnitt[i];
    ctx.moveTo(e.cx[a], e.cy[a]);
    for (let p = a + 1; p < a + n; p++) ctx.lineTo(e.cx[p], e.cy[p]);
  };
  // Linien auf der Rückseite werden beim Aufwickeln ausgeblendet, je weiter der
  // Globus im Bild ist. Ohne das schlingern sie: ihre Punkte laufen alle auf den
  // Rand zu, und die Zwischenzustände dieser Bewegung sehen aus wie Schlaufen.
  // Ein Zug halb vorn, halb hinten verblasst entsprechend halb.
  const zugAlpha = (e, i) => {
    if (gA <= 0) return 1;
    const [a, n] = e.abschnitt[i];
    let v = 0;
    for (let p = a; p < a + n; p++) if (e.vorn[p]) v++;
    return 1 - verblassen * (1 - v / n);
  };

  if (zeigGrad) {
    ctx.strokeStyle = 'rgba(22,24,29,.19)';
    ctx.lineWidth = .8 / skala;
    for (let i = 0; i < gradnetz.abschnitt.length; i++) {
      const al = zugAlpha(gradnetz, i);
      if (al < .02) continue;
      ctx.globalAlpha = al;
      ctx.beginPath(); zug(gradnetz, i); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  if (zeigTissot) {
    ctx.fillStyle = 'rgba(22,24,29,.10)';
    ctx.strokeStyle = 'rgba(22,24,29,.42)';
    ctx.lineWidth = 1.1 / skala;
    for (let i = 0; i < tissot.abschnitt.length; i++) {
      const al = zugAlpha(tissot, i);
      if (al < .02) continue;
      ctx.globalAlpha = al;
      ctx.beginPath(); zug(tissot, i); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  if (zeigKurs) {
    ctx.lineWidth = 2 / skala; ctx.lineCap = 'round';
    for (let i = 0; i < kurse.abschnitt.length; i++) {
      const al = zugAlpha(kurse, i);
      if (al < .02) continue;
      ctx.globalAlpha = al;
      const gk = kurse.art[i] === 'gk';
      ctx.strokeStyle = gk ? '#16181d' : '#8a5a2b';
      ctx.setLineDash(gk ? [] : [6 / skala, 5 / skala]);
      ctx.beginPath(); zug(kurse, i); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Die Linien werden an Ort und Stelle beschriftet. Eine Legende unter der
  // Karte zwingt den Blick zum Hin- und Herspringen; bei zwei Linien, die
  // einander ähnlich sehen, reicht das nicht.
  if (zeigKurs) {
    ctx.font = '600 12.5px "Inter","Helvetica Neue",Helvetica,Arial,sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    for (const [i, text, hoch] of BESCHRIFTUNG) {
      const [a, n] = kurse.abschnitt[i], p = a + Math.round(n * 0.55);
      if (gA > .5 && !kurse.vorn[p]) continue;
      const x = (kurse.cx[p] - mx) * skala + breite / 2;
      const y = hoehe / 2 - (kurse.cy[p] - my) * skala + (hoch ? -13 : 15);
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--karte').trim() || '#eceae4';
      ctx.strokeText(text, x, y);
      ctx.fillStyle = kurse.art[i] === 'gk' ? '#16181d' : '#8a5a2b';
      ctx.fillText(text, x, y);
    }
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  hinweis();
}

// Was die Kreise im gerade gezeigten Zustand aussagen. Das ist die eigentliche
// Antwort auf „was kann Mercator besser": ein Kreis, der Kreis bleibt, heisst,
// dass in alle Richtungen gleich stark gedehnt wird — also bleiben Winkel und
// örtliche Form erhalten. Genau daraus folgt die gerade Kurslinie.
let letzterHinweis = '';
function hinweis() {
  document.getElementById('hinweisGlobus').hidden = globusAnteil() < .5 || farbeFest;
  const fe = document.getElementById('hinweisFarbe');
  fe.hidden = !farbeFest;
  if (farbeFest) {
    fe.innerHTML = globusAnteil() > .5
      ? '<b>Die Farbe steht auf Mercator, die Gestalt auf der Wahrheit.</b> Türkis heisst: '
        + 'dieses Land bekommt auf der Mercator-Karte weniger Bildfläche, als ihm zusteht — '
        + 'und hier sieht man auf der richtigen Kugel, um welche Länder es dabei geht. '
        + 'Ziehen dreht sie.'
      : '<b>Die Farbe bleibt bei Mercator stehen.</b> Sie sagt nicht mehr, was die gerade '
        + 'gezeigte Darstellung tut, sondern was Mercator tut — und wandert deshalb beim '
        + 'Umblenden mit dem Land mit, während sich die Gestalt korrigiert.';
  }
  const el = document.getElementById('hinweisTissot');
  el.hidden = !zeigTissot;
  if (!zeigTissot) return;
  let s;
  if (globusAnteil() > .88) {
    s = '<b>Auf der Kugel wären alle Kreise gleich gross und rund</b> — auf der Kugel. '
      + 'Was Sie sehen, ist ihr Bild auf einem flachen Schirm: in der Mitte, wo Sie '
      + 'senkrecht draufschauen, stimmt es genau, zum Rand hin werden dieselben Kreise '
      + 'zu schmalen Sicheln. Der Globus löst das Problem also nicht, er verschiebt es '
      + 'an den Rand — und dreht es weg, sobald Sie ziehen.';
  } else if (t < .12) {
    s = '<b>Alle Kreise sind Kreise geblieben</b> — nur verschieden gross. Das ist Mercators '
      + 'Stärke: in alle Richtungen wird gleich stark gedehnt, also stimmen Winkel und örtliche '
      + 'Form. Daraus folgt die gerade Kurslinie. Bezahlt wird es mit der Grösse.';
  } else if (t > .88) {
    s = '<b>Alle Kreise sind jetzt gleich gross</b> — dafür zu Ellipsen geschert. Die Fläche '
      + 'stimmt überall, die Form nicht mehr. Das ist der Tausch, den eine ebene Karte '
      + 'nicht umgehen kann.';
  } else {
    s = 'Dazwischen: die Kreise gleichen sich in der Grösse an und verlieren dabei ihre runde Form. '
      + 'Beides zugleich geht auf einer ebenen Karte nicht.';
  }
  s += ' <span class="wo">Jeder Kreis hat auf der Erde 800 km Radius (Tissot-Indikatrix).</span>';
  if (s !== letzterHinweis) { el.innerHTML = s; letzterHinweis = s; }
}

// ---------- Bedienung ----------
const reg = document.getElementById('reg');
let wartet = false;
function neuZeichnen() {
  if (wartet) return;
  wartet = true;
  requestAnimationFrame(() => { wartet = false; zeichne(); });
}
function setze(v, { schieber = true } = {}) { t = v; if (schieber) reg.value = Math.round(v * 1000); knoepfe(); zeigerHaltung(); neuZeichnen(); }
reg.addEventListener('input', () => { rundlaufStopp(); setze(reg.value / 1000, { schieber: false }); });

// Überblendungsdauern. Ein Achtel des ursprünglichen Tempos: die Bewegung
// trägt die eigentliche Aussage, und beim Aufwickeln gibt es viel zu sehen.
// Die Standzeit bleibt, wo sie war — sie ist keine Geschwindigkeit.
const DAUER = 6800;          // der Regler von einem Ende zum anderen
const DAUER_WECHSEL = 4960;  // ein Zielwechsel bei stehendem Regler
const HALT = 900;            // Standzeit auf jedem Zustand im Rundlauf

// Läuft schon eine Bewegung, wird sie beim Start der nächsten stillgelegt —
// aber nur die auf demselben Kanal. Ein Netzknopf startet zwei zugleich: der
// Regler fährt ans Ende, und gleichzeitig blendet das alte Ziel ins neue. Ein
// gemeinsamer Zähler hätte die eine die andere erschlagen lassen.
const lauffolge = { t: 0, u: 0 };

function animiere(schritt, dauer, fertig, kanal = 't') {
  const meine = ++lauffolge[kanal], t0 = performance.now();
  (function lauf(jetzt) {
    if (meine !== lauffolge[kanal]) return;
    const p = Math.min(1, (jetzt - t0) / dauer);
    schritt(p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
    if (p < 1) requestAnimationFrame(lauf); else if (fertig) fertig();
  })(t0);
}

// Mercator gehört mit in die Knopfreihe. Es ist der Ausgangszustand, um den es
// der Seite geht — ohne eigenen Knopf steht es nur als graue Beschriftung am
// Reglerende, und zurück kommt man gar nicht mehr.
const ziele = document.getElementById('ziele');
D.netze.forEach((n, i) => {
  const b = document.createElement('button');
  b.textContent = n.name;
  b.dataset.netz = i;
  b.addEventListener('click', () => waehle(i));
  ziele.appendChild(b);
});

// Gedrückt ist der Knopf, dessen Netz gerade zu sehen ist: am einen Reglerende
// Mercator, am anderen das Zielnetz, dazwischen keiner.
function knoepfe() {
  for (const b of ziele.children) {
    const i = +b.dataset.netz;
    b.setAttribute('aria-pressed', (i === M ? t < .02 : i === zielB && t > .98) ? 'true' : 'false');
  }
}

function zuT(ziel, fertig) {
  const start = t;
  if (Math.abs(ziel - start) < .002) { setze(ziel); if (fertig) fertig(); return; }
  animiere(e => setze(start + (ziel - start) * e), DAUER, fertig, 't');
}

// Ein Zielwechsel bei stehendem Regler: das alte und das neue Netz werden
// ineinander geblendet. Damit lässt sich auch Equal Earth gegen Globus zeigen,
// ohne den Umweg über Mercator.
function wechsleZiel(i, fertig) {
  zielA = zielB; zielB = i; u = 0;
  beschrifte();
  tabellen();
  animiere(e => { u = e; neuZeichnen(); }, DAUER_WECHSEL,
    () => { zielA = zielB; u = 1; knoepfe(); if (fertig) fertig(); }, 'u');
}

function waehle(i) {
  rundlaufStopp();
  if (i === M) { zuT(0); return; }
  if (i !== zielB) wechsleZiel(i);
  zuT(1);
}

// Drei Zustände ergeben sechs Übergänge. Diese Folge zeigt jeden genau einmal
// und endet wieder am Anfang, läuft also rund:
//   Mercator → Equal Earth → Globus → Mercator → Globus → Equal Earth → Mercator
const RUNDLAUF = [
  { ziel: 1, t: 1 },   // Mercator → Equal Earth
  { ziel: 2, t: 1 },   // Equal Earth → Globus   (Zielwechsel, Regler steht)
  { ziel: 2, t: 0 },   // Globus → Mercator
  { ziel: 2, t: 1 },   // Mercator → Globus
  { ziel: 1, t: 1 },   // Globus → Equal Earth   (Zielwechsel, Regler steht)
  { ziel: 1, t: 0 },   // Equal Earth → Mercator
];

let rundlauf = null;
const knopfSpiel = document.getElementById('spiel');

function rundlaufSchritt() {
  if (!rundlauf) return;
  const s = RUNDLAUF[rundlauf.i % RUNDLAUF.length];
  rundlauf.i++;
  const weiter = () => {
    if (!rundlauf) return;
    rundlauf.uhr = setTimeout(rundlaufSchritt, HALT);
  };
  if (s.ziel !== zielB) wechsleZiel(s.ziel, weiter);
  else zuT(s.t, weiter);
}

function rundlaufStart() {
  rundlauf = { i: 0, uhr: null };
  knopfSpiel.textContent = 'Anhalten';
  knopfSpiel.setAttribute('aria-pressed', 'true');
  // Von Mercator aus ist die Folge vollständig; steht der Regler woanders,
  // fährt der erste Schritt ihn ohnehin an ein Ende.
  rundlaufSchritt();
}

function rundlaufStopp() {
  if (!rundlauf) return;
  clearTimeout(rundlauf.uhr);
  rundlauf = null;
  lauffolge.t++; lauffolge.u++;      // laufende Bewegungen stilllegen
  // Ein abgebrochener Zielwechsel liesse zwei Netze halb ineinander stehen.
  // Auf das nähere von beiden einrasten, damit ein Netz gezeigt wird.
  if (zielA !== zielB) { if (u < .5) zielB = zielA; else zielA = zielB; u = 1; }
  knoepfe(); beschrifte(); tabellen(); neuZeichnen();
  knopfSpiel.textContent = 'Abspielen';
  knopfSpiel.setAttribute('aria-pressed', 'false');
}

knopfSpiel.addEventListener('click', () => rundlauf ? rundlaufStopp() : rundlaufStart());

function beschrifte() {
  const nenne = n => n.name + (n.jahr ? ', ' + n.jahr : '') + ' \u00b7 ' + n.art;
  document.getElementById('startName').textContent = nenne(D.netze[M]);
  document.getElementById('zielName').textContent = nenne(D.netze[zielB]);
  document.getElementById('zielName2').textContent = D.netze[zielB].name;
}

document.getElementById('cGrad').addEventListener('change', e => { zeigGrad = e.target.checked; neuZeichnen(); });
document.getElementById('cTissot').addEventListener('change', e => { zeigTissot = e.target.checked; neuZeichnen(); });
document.getElementById('cFest').addEventListener('change', e => {
  farbeFest = e.target.checked;
  hinweis();
  neuZeichnen();
});
document.getElementById('cKurs').addEventListener('change', e => {
  zeigKurs = e.target.checked;
  document.getElementById('lgdKurs').hidden = !zeigKurs;
  neuZeichnen();
});

// ---------- Tabellen ----------
const nf = (n, d = 0) => n.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
function tabellen() {
  const z = zielB;
  // Der Globus steht nicht als eigene Spalte da: er ist unverzerrt, liefert also
  // dieselben Anteile wie das flächentreue Netz. Die zweite Spalte ist beides.
  const spalten = NETZ.length;
  document.getElementById('tKont').innerHTML =
    '<tr><th>Kontinent</th><th class="z">Mercator</th>' +
    '<th class="z">Equal Earth und Globus</th><th class="z">Einwohner</th></tr>' +
    D.kontinente.map(r => '<tr><td>' + r[0] + '</td>' +
      r.slice(1, 1 + spalten).map(v => '<td class="z">' + nf(v, 1) + ' %</td>').join('') +
      '<td class="z">' + nf(r[1 + spalten]) + ' Mio</td></tr>').join('');

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
  const hinten = globusAnteil() > .5, vorn = land.vorn;
  for (const l of LAND) {
    if (x < l.x0 || x > l.x1 || y < l.y0 || y > l.y1) continue;
    let drin = false;
    for (let r = landRing[l.i]; r < landRing[l.i + 1]; r++) {
      const a = zRingVon[r], b = zRingVon[r + 1];
      if (hinten) {
        let sichtbar = false;
        for (let k = a; k < b; k++) if (vorn[AUSWAHL[k]]) { sichtbar = true; break; }
        if (!sichtbar) continue;
      }
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
  const f = Math.exp(farbwert(l));
  const ab = Math.round(Math.abs(f - 1) * 100);
  const wo = farbeFest ? 'auf Mercator ' : '';
  const satz = ab < 3 ? wo + 'so gross wie zustehend'
    : f > 1 ? wo + nf(ab) + ' % mehr Bildfläche als zustehend'
            : wo + nf(ab) + ' % weniger Bildfläche als zustehend';
  tip.innerHTML = '<div class="n">' + l.name + '</div>' +
    '<div class="m">' + nf(l.wahr / 1e6, 3) + ' Mio km²' +
    (l.einwohner ? ' · ' + nf(l.einwohner / 1e6, 1) + ' Mio Einw.' : '') + '</div>' +
    '<div class="f">' + satz + '<br>Faktor ' + nf(f, 2) + '</div>';
  tip.style.left = ev.clientX + 'px';
  tip.style.top = ev.clientY + 'px';
  tip.style.opacity = '1';
}

// Solange der Globus im Bild ist, dreht ein Zug ihn, statt zu zeigen. Darunter
// bleibt der Zeiger, was er war.
let zieht = null;

function zeigerHaltung() {
  cv.style.cursor = zieht ? 'grabbing' : (globusAnteil() > .3 ? 'grab' : 'default');
}

cv.addEventListener('pointerdown', ev => {
  // Ein Druck auf die Karte ist eine Übernahme, ob danach gedreht wird oder nicht.
  rundlaufStopp();
  if (globusAnteil() <= .3) return;
  zieht = { x: ev.clientX, y: ev.clientY };
  cv.setPointerCapture(ev.pointerId);
  tip.style.opacity = '0';
  zeigerHaltung();
  ev.preventDefault();
});

const zugEnde = ev => {
  if (!zieht) return;
  zieht = null;
  if (cv.hasPointerCapture(ev.pointerId)) cv.releasePointerCapture(ev.pointerId);
  zeigerHaltung();
};
cv.addEventListener('pointerup', zugEnde);
cv.addEventListener('pointercancel', zugEnde);

cv.addEventListener('pointermove', ev => {
  if (zieht) {
    const dx = ev.clientX - zieht.x, dy = ev.clientY - zieht.y;
    zieht.x = ev.clientX; zieht.y = ev.clientY;
    dreheLam -= dx * .38 * RAD;
    drehePhi = Math.max(-85 * RAD, Math.min(85 * RAD, drehePhi + dy * .38 * RAD));
    dreheAlle();
    neuZeichnen();
    return;
  }
  const r = cv.getBoundingClientRect();
  const l = treffer(ev.clientX - r.left, ev.clientY - r.top);
  aktiv = l;
  if (l) zeigeTip(l, ev); else tip.style.opacity = '0';
});
cv.addEventListener('pointerleave', () => { aktiv = null; tip.style.opacity = '0'; });

// ---------- Start ----------
addEventListener('resize', () => { messe(); zeichne(); });
messe(); beschrifte(); knoepfe(); tabellen(); zeigerHaltung(); zeichne();
