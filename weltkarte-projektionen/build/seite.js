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

// Beide ebenen Netze haben dieselbe Bauart: x = λ · g(φ), und y hängt gar nicht
// von λ ab. Bei Mercator ist g = 1, bei Equal Earth steckt es im Nenner des
// Polynoms. Das ist der Grund, warum sich die Karte überhaupt bezahlbar
// verschieben lässt — ein neuer Mittelmeridian kostet je Punkt eine Subtraktion
// und eine Multiplikation statt einer ganzen Neuprojektion.
const GFAKTOR = {
  mercator() { return 1; },
  equalearth(p) {
    const th = Math.asin(Math.sqrt(3) / 2 * Math.sin(p));
    const t2 = th * th, t6 = t2 * t2 * t2, t8 = t6 * t2;
    return S_EE * 2 * Math.sqrt(3) * Math.cos(th) / (3 * (9 * A4 * t8 + 7 * A3 * t6 + 3 * A2 * t2 + A1));
  },
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
  const n = lo.length, X = [], Y = [], G = [], kasten = [];
  const lam = new Float64Array(n);
  for (let i = 0; i < n; i++) lam[i] = lo[i] * RAD;
  for (const id of NETZ) {
    const x = new Float32Array(n), y = new Float32Array(n), g = new Float32Array(n);
    let y0 = Infinity, y1 = -Infinity;
    for (let i = 0; i < n; i++) {
      const p = la[i] * RAD;
      g[i] = GFAKTOR[id](p);
      x[i] = lam[i] * g[i];
      y[i] = PROJ[id](lam[i], p)[1];
      if (y[i] < y0) y0 = y[i]; if (y[i] > y1) y1 = y[i];
    }
    X.push(x); Y.push(y); G.push(g);
    // Der Rahmen kommt nicht aus den Daten, sondern aus dem Netz: beide Karten
    // sind genau 2π breit. Aus den Daten gelesen wüchse er beim Verschieben mit
    // den Ringen, die über die Naht ragen, und die Karte zappelte im Bild.
    kasten.push([-Math.PI, Math.PI, y0, y1]);
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

  return { n, X, Y, G, lam, kasten, vx, vy, vz, vorn: new Uint8Array(n),
           // Zwei Lagen für die Rückseite: durchgefaltet und an den Rand geklemmt.
           fx: new Float32Array(n), fy: new Float32Array(n),
           kx: new Float32Array(n), ky: new Float32Array(n),
           cx: new Float32Array(n), cy: new Float32Array(n), cg: new Float32Array(n) };
}

// Die Blickmitte, und zwar für alle drei Ansichten dieselbe: auf dem Globus die
// Länge, die einen anschaut, auf den ebenen Karten der Mittelmeridian. Ein Wert
// für beides, damit ein Zug über die Karte in jedem Zustand dasselbe tut und
// die Einstellung den Rundlauf übersteht.
//
// In der Länge auf Afrika und Europa — das ist der Streit. In der Breite aber auf den Äquator, und das ist keine Kleinigkeit:
// der Flächenmassstab der Kugelansicht ist der Kosinus des Abstands zur
// Bildmitte, ein Schwenk nach Norden rückte also die Nordhalbkugel näher an
// den unverzerrten Punkt und schöbe die Südhalbkugel zum schrumpfenden Rand.
// Auf einer Seite über nördliche Überrepräsentation wäre ausgerechnet der
// Massstab dann wieder nach Norden geneigt. Bei 0° ist er zwischen den
// Halbkugeln symmetrisch.
let dreheLam = 15 * RAD, drehePhi = 0;

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

// ---------- Den Mittelmeridian verschieben ----------
//
// Der Kommentar dazu war: die Karte steht fest auf Greenwich. Auf einer Seite
// über die Schlagseite von Weltkarten ist das eine eigene Schlagseite — wer in
// der Mitte steht, steht ganz, und wer am Rand steht, wird zerschnitten.
//
// Verschoben wird nicht neu projiziert, sondern nur x neu gerechnet: bei beiden
// Netzen ist x = λ · g(φ), y hängt nicht von λ ab. Je Punkt eine Subtraktion und
// eine Multiplikation.
//
// Die Naht ist der eigentliche Aufwand. Ein Ring, der über sie läuft, würde als
// Streifen quer durchs Bild schiessen, wenn man je Punkt in (−180, 180] faltet.
// Deshalb wird je *Ring* gefaltet: jeder Ring bekommt die Kopie, deren Mitte am
// nächsten am Mittelmeridian liegt, und bleibt damit in einem Stück. Was dann
// über den Rand ragt, holt eine zweite Kopie auf der anderen Seite zurück; der
// Beschnitt auf den Kartenumriss schneidet beide sauber ab.
function stueckeSetzen(e, bereiche) {
  const st = [];
  for (const [a, b] of bereiche) {
    let lo = Infinity, hi = -Infinity;
    for (let i = a; i < b; i++) { const l = e.lam[i]; if (l < lo) lo = l; if (l > hi) hi = l; }
    st.push({ a, b, mitte: (lo + hi) / 2, halb: (hi - lo) / 2 });
  }
  e.stuecke = st;
}

const ZWEIPI = 2 * Math.PI;

// Legt X für die ebenen Netze neu an. `zusatz` verschiebt einen Ring um ganze
// Umläufe — damit zeichnet dieselbe Maschinerie auch die zweite Kopie.
function richteAus(e) {
  for (const s of e.stuecke) {
    const k = -Math.round((s.mitte - dreheLam) / ZWEIPI);
    s.versatz = k * ZWEIPI - dreheLam;
    // Ragt der Ring über den Rand, holt eine Kopie von der Gegenseite das
    // fehlende Stück zurück. Die Antarktis umspannt die ganze Erde und braucht
    // beide Seiten.
    const m = s.mitte + s.versatz;
    s.links = m + s.halb > Math.PI + 1e-9;
    s.rechts = m - s.halb < -Math.PI - 1e-9;
  }
  for (let netzNr = 0; netzNr < NETZ.length; netzNr++) {
    const X = e.X[netzNr], g = e.G[netzNr];
    for (const s of e.stuecke) {
      for (let i = s.a; i < s.b; i++) X[i] = (e.lam[i] + s.versatz) * g[i];
    }
  }
}



// Der Kartenumriss als eigener Zug: die Ränder bei λ = ±180 und die beiden
// Polkanten. Er wird *nicht* mitverschoben — in Kartenkoordinaten liegt der Rand
// immer bei ±π·g, ganz gleich, wo der Mittelmeridian steht. Durch dieselbe
// Mischung geschickt ergibt das bei Mercator ein Rechteck (die Pole sind bei 83°
// gekappt), bei Equal Earth die gebogene Aussenkante mit ihrer Pollinie.
const rand = (() => {
  const q = [];
  for (let p = 90; p >= -90; p -= 1) q.push([180, p]);
  for (let l = 180; l >= -180; l -= 2) q.push([l, -90]);
  for (let p = -90; p <= 90; p += 1) q.push([-180, p]);
  for (let l = -180; l <= 180; l += 2) q.push([l, 90]);
  return zuegeZuEbene([q]);
})();

const I_EE = NETZ.indexOf('equalearth');
const EBENEN_LAM = [land, gradnetz, tissot, kurse];   // verschieben sich mit
const EBENEN = [...EBENEN_LAM, rand];                 // drehen sich mit
stueckeSetzen(land, Array.from({ length: ringLen.length }, (_, r) => [ringOff[r], ringOff[r + 1]]));
for (const e of EBENEN_LAM.slice(1)) stueckeSetzen(e, e.abschnitt.map(([a, n]) => [a, a + n]));
function richteAlle() { for (const e of EBENEN_LAM) richteAus(e); }
richteAlle();
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

// Blau gegen Orange, nicht Türkis gegen Rost. Nachgerechnet mit der
// Simulation von Machado u. a. (2009): bei Protanopie fallen bei Türkis/Rost
// zwei acht Stufen auseinanderliegende Farben auf einen RGB-Abstand von 20
// zusammen und die beiden Skalenenden auf 104 — mit Blau/Orange sind es 36
// und 119. Blau gegen Orange ist die farbsicherste divergierende Paarung, und
// die Zahlen sagen dasselbe.
//
// Stützstellen statt zweier Endpunkte: der direkte Weg führt im RGB-Raum durch
// ein schlammiges Grau. Die Mitte ist ein warmes Hellgrau, kein Papierweiss —
// auf einem flächentreuen Netz stehen alle Länder auf 1, und die Karte muss
// dann noch auf dem Papier zu sehen sein. Sie steht mit 1,47:1 gegen das
// Papier (vorher 1,25:1) und bleibt trotzdem leise genug, dass „stimmt so"
// nicht wie eine Aussage aussieht.
const STUETZEN = [
  [-1.000, [ 12,  84, 128]],
  [-0.585, [ 62, 136, 178]],
  [-0.256, [140, 180, 204]],
  [ 0.000, [201, 195, 185]],
  [ 0.369, [224, 153,  88]],
  [ 0.631, [197, 106,  42]],
  [ 1.000, [138,  57,  16]],
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

// Zoom und Ausschnitt. Der Rahmen (rahmenX/rahmenY) ist die Mitte dessen, was
// die gerade gezeigte Mischung an Ausdehnung hat; der Versatz verschiebt den
// Ausschnitt darin und wird auf das begrenzt, was die Karte hergibt. Waagrecht
// verschiebt sonst der Mittelmeridian — der läuft um und kennt keinen Rand.
let zoom = 1, versatzX = 0, versatzY = 0, rahmenX = 0, rahmenY = 0, rahmenW = 1, rahmenH = 1;

// Versatz begrenzen und mx/my daraus setzen. Das muss auch zwischen zwei
// Bildern gehen: ein Rad hat mehrere Rasten, und jede rechnet auf dem Stand der
// vorigen weiter. Ohne das blieben mx und my bis zum nächsten Bild stehen und
// der Punkt unter dem Zeiger wanderte weg.
function versatzKlemmen() {
  const gX = Math.max(0, rahmenW / 2 - breite / (2 * skala));
  const gY = Math.max(0, rahmenH / 2 - hoehe / (2 * skala));
  versatzX = Math.max(-gX, Math.min(gX, versatzX));
  versatzY = Math.max(-gY, Math.min(gY, versatzY));
  mx = rahmenX + versatzX; my = rahmenY + versatzY;
}
const ZOOM_MAX = 24;
// Der Grundmassstab des letzten Bildes — skala ohne Zoom. Die Zeigergesten
// rechnen damit, statt auf das nächste Bild zu warten.
let basisMerk = 1;

let t = 0, u = 1, zielA = 1, zielB = 1;              // Ziel 1 = Equal Earth
let zeigGrad = true, zeigTissot = true, zeigKurs = false;

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

// Wo auf dem Balken liegt ein Faktor? Die Skala läuft über ±ln 3.
const balkenOrt = lf => Math.max(0, Math.min(1, (lf / LN3 + 1) / 2));

// Die Spanne, die gerade auf dem Schirm steht, als Klammer unter dem Balken.
//
// Das ist die Antwort auf „Equal Earth hat kaum Kontrast": stimmt, und zwar
// weil dort nichts zu zeigen ist — jedes Land steht auf 1. Ohne die Klammer
// sähe das aus wie eine blasse Karte, mit ihr ist es eine Aussage. Auf
// Mercator spannt sie fast über den ganzen Balken, auf Equal Earth fällt sie
// zu einem Strich in der Mitte zusammen.
//
// Gezählt wird derselbe Satz wie in den Tabellen: über 150.000 km², ohne die
// Antarktis. Ohne die Schwelle klebte das Maximum auf Mercator dauerhaft am
// Anschlag, und das Minimum hinge an einer Insel von 21 km². Auf der Kugel
// zählt ausserdem nur die zugewandte Seite: ein Land dahinter steht
// rechnerisch auf 0 und sagte über das Bild nichts aus.
const spanneEl = document.getElementById('spanne');

function spanneZeigen() {
  let lo = Infinity, hi = -Infinity, gefunden = false;
  const gA = globusAnteil();
  for (const l of LAND) {
    if (l.iso === 'ATA' || l.wahr <= 150000) continue;
    if (gA > .5 && !farbeFest && !istVorn(l.i)) continue;
    const v = farbwert(l);
    if (!Number.isFinite(v)) continue;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
    gefunden = true;
  }
  if (!gefunden) return;
  const a = balkenOrt(lo), b = balkenOrt(hi);
  spanneEl.style.left = (a * 100).toFixed(2) + '%';
  spanneEl.style.width = Math.max(.4, (b - a) * 100).toFixed(2) + '%';
}


const dreiFach = (m, a, b) => m + ((a + (b - a) * u) - m) * t;

// Wie stark der Globus gerade im Bild ist. Steuert das Wegfallen der
// Rückseite und ob ein Zug am Zeiger dreht statt zu zeigen. An der Farbgebung
// hängt nichts mehr: die ist in allen drei Ansichten dieselbe.
const globusAnteil = () =>
  dreiFach(0, zielA === GLOBUS ? 1 : 0, zielB === GLOBUS ? 1 : 0);

// Neben x und y wird auch g gemischt. Damit lässt sich eine Kopie des Rings um
// genau einen Umlauf versetzen — ein Punkt wandert dabei um 2π·g, nicht um einen
// festen Betrag, denn auf Equal Earth ist die Karte oben schmaler als am
// Äquator. Der Globus bringt g = 0 ein: beim Aufwickeln fallen die Kopien
// deshalb von selbst auf das Original zusammen, statt als Geister danebenzustehen.
const NULLG = null;
function mischeEbene(e, auswahl) {
  const ax = e.X[zielA], ay = e.Y[zielA], bx = e.X[zielB], by = e.Y[zielB], mxA = e.X[M], myA = e.Y[M];
  const gm = e.G[M], ga = zielA < NETZ.length ? e.G[zielA] : NULLG, gb = zielB < NETZ.length ? e.G[zielB] : NULLG;
  if (auswahl) {
    for (let k = 0; k < auswahl.length; k++) {
      const i = auswahl[k];
      e.cx[i] = dreiFach(mxA[i], ax[i], bx[i]);
      e.cy[i] = dreiFach(myA[i], ay[i], by[i]);
      e.cg[i] = dreiFach(gm[i], ga ? ga[i] : 0, gb ? gb[i] : 0);
    }
    return;
  }
  for (let i = 0; i < e.n; i++) {
    e.cx[i] = dreiFach(mxA[i], ax[i], bx[i]);
    e.cy[i] = dreiFach(myA[i], ay[i], by[i]);
    e.cg[i] = dreiFach(gm[i], ga ? ga[i] : 0, gb ? gb[i] : 0);
  }
}

// Natural Earth 1:50 m ist an den Küsten weit feiner, als ein Bildschirm zeigen
// kann: bei 1000 Punkten Kartenbreite deckt ein Bildpunkt gut ein Drittel Grad
// ab. Punkte, die enger beieinanderliegen als ein halber Bildpunkt, werden vor
// dem Zeichnen übersprungen — je Ring einzeln, was an gemeinsamen Grenzen
// Lücken unter einem halben Bildpunkt hinterlässt und damit unter der Strichbreite,
// mit der die Länder ohnehin gegeneinander abgesetzt sind.
let AUSWAHL = null, zRingVon = null, auswahlZoom = 1;

function duenneAus() {
  let sMax = 0;
  for (let i = 0; i < NETZ.length; i++) {
    const k = land.kasten[i];
    sMax = Math.max(sMax, Math.min(breite / (k[1] - k[0]), hoehe / (k[3] - k[2])) * .97);
  }
  // Beim Hineinzoomen wird die Ausdünnung zu grob: was bei ganzer Karte unter
  // einem halben Bildpunkt lag, ist zehnfach vergrössert eine sichtbare Ecke.
  const schwelle = .5 / (sMax * zoom) / RAD;     // ein halber Bildpunkt, in Grad
  auswahlZoom = zoom;
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
  const CX = land.cx, CY = land.cy, CG = land.cg;
  for (const l of LAND) {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    const a = zRingVon[landRing[l.i]], b = zRingVon[landRing[l.i + 1]];
    // Die Kästen müssen die Umlaufkopien mit einschliessen, sonst zeigt der
    // Tooltip über einem gewickelten Land nichts an.
    for (let r = landRing[l.i]; r < landRing[l.i + 1]; r++) {
      const st = land.stuecke[r];
      if (!st.links && !st.rechts) continue;
      for (let k = zRingVon[r]; k < zRingVon[r + 1]; k++) {
        const p = AUSWAHL[k], d = ZWEIPI * CG[p];
        if (st.links) { const x = CX[p] - d; if (x < x0) x0 = x; if (x > x1) x1 = x; }
        if (st.rechts) { const x = CX[p] + d; if (x < x0) x0 = x; if (x > x1) x1 = x; }
      }
    }
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
  const basisSkala = Math.min(breite / (x1 - x0), hoehe / (y1 - y0)) * .97;
  basisMerk = basisSkala;
  skala = basisSkala * zoom;
  rahmenX = (x0 + x1) / 2; rahmenY = (y0 + y1) / 2;
  rahmenW = x1 - x0; rahmenH = y1 - y0;
  versatzKlemmen();

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, breite, hoehe);
  ctx.setTransform(skala * dpr, 0, 0, -skala * dpr,
    (breite / 2 - mx * skala) * dpr, (hoehe / 2 + my * skala) * dpr);

  const CX = land.cx, CY = land.cy, gA = globusAnteil();

  // Beschnitt auf den Umriss der Karte. Ohne ihn ragen die Kopien über den Rand
  // hinaus und es sähe aus, als ginge die Welt dort weiter. Der Umriss ist der
  // Rand λ = Mittelmeridian ± 180° und wird durch dieselbe Mischung geschickt
  // wie alles andere, ist also bei Mercator ein Rechteck, bei Equal Earth die
  // gebogene Aussenkante und dazwischen das Zwischending.
  //
  // Den Globus lässt er dabei aussen vor. Durch dieselbe Mischung wie alles
  // andere geschickt liefe diese Kante beim Aufwickeln nach hinten, schlüge sich
  // selbst und schnitte als Pfad mit Windungszahl null ein Loch mitten in die
  // Karte — genau dort, wo der Mittelmeridian steht. Er mischt deshalb nur
  // zwischen den beiden ebenen Netzen. Das genügt: die Kugel hat Radius 1 und
  // liegt damit vollständig innerhalb der ebenen Aussenkante, wird also nie
  // beschnitten, während die Umlaufkopien beim Aufwickeln nach aussen fallen und
  // dort weggeschnitten werden.
  ctx.save();
  {
    const g = gewichte(), su = g[M] + g[I_EE];
    const f = su > 1e-6 ? g[I_EE] / su : 1;
    const ax = rand.X[M], ay = rand.Y[M], bx = rand.X[I_EE], by = rand.Y[I_EE];
    ctx.beginPath();
    ctx.moveTo(ax[0] + (bx[0] - ax[0]) * f, ay[0] + (by[0] - ay[0]) * f);
    for (let i = 1; i < rand.n; i++) ctx.lineTo(ax[i] + (bx[i] - ax[i]) * f, ay[i] + (by[i] - ay[i]) * f);
    ctx.closePath();
    ctx.clip();
  }

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

  // Ein Ring, ein Zug — und für einen Ring über der Naht zusätzlich die Kopie
  // von der Gegenseite, versetzt um genau einen Umlauf. Der Versatz je Punkt ist
  // 2π·g, weil die Karte oben schmaler ist als am Äquator.
  const CG = land.cg;
  const zugRing = (a, b, um) => {
    const p0 = AUSWAHL[a];
    ctx.moveTo(CX[p0] + um * ZWEIPI * CG[p0], CY[p0]);
    for (let k = a + 1; k < b; k++) {
      const p = AUSWAHL[k];
      ctx.lineTo(CX[p] + um * ZWEIPI * CG[p], CY[p]);
    }
    ctx.closePath();
  };

  // Jede Kopie bekommt ihren eigenen Pfad. In einen gemeinsamen gelegt löschten
  // sich Original und Kopie bei „evenodd" gegenseitig aus, sobald sie einander
  // überlappen — und die Antarktis umspannt die ganze Erde, überlappt sich also
  // mit beiden Kopien grossflächig. Sie kam dadurch als gestufter Streifen
  // heraus. Getrennt gezeichnet malt der Überlapp bloss zweimal dieselbe Farbe.
  for (const l of LAND) {
    const hinten = verblassen > 0 && !istVorn(l.i);
    if (hinten && verblassen >= 1) continue;
    ctx.globalAlpha = hinten ? 1 - verblassen : 1;
    ctx.fillStyle = SKALA[skalaIndex(farbwert(l))];
    for (const um of [0, -1, 1]) {
      ctx.beginPath();
      let gezeichnet = false;
      for (let r = landRing[l.i]; r < landRing[l.i + 1]; r++) {
        const st = land.stuecke[r];
        if (um === -1 && !st.links) continue;
        if (um === 1 && !st.rechts) continue;
        const a = zRingVon[r], b = zRingVon[r + 1];
        if (rueckseiteWeg) {
          let sichtbar = false;
          for (let k = a; k < b; k++) if (vorn[AUSWAHL[k]]) { sichtbar = true; break; }
          if (!sichtbar) continue;
        }
        zugRing(a, b, um);
        gezeichnet = true;
      }
      if (!gezeichnet) continue;
      ctx.fill('evenodd');
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;

  const zugEinmal = (e, a, n, um) => {
    ctx.moveTo(e.cx[a] + um * ZWEIPI * e.cg[a], e.cy[a]);
    for (let p = a + 1; p < a + n; p++) ctx.lineTo(e.cx[p] + um * ZWEIPI * e.cg[p], e.cy[p]);
  };
  const zug = (e, i) => {
    const [a, n] = e.abschnitt[i], st = e.stuecke[i];
    zugEinmal(e, a, n, 0);
    if (st.links) zugEinmal(e, a, n, -1);
    if (st.rechts) zugEinmal(e, a, n, 1);
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
    // Noch einmal leiser, weil sie jetzt von Anfang an mitlaufen und nicht mehr
    // eine Sache sind, die man eigens einschaltet. Sie sitzen auf den Kreuzungen
    // des Gradnetzes, wo ohnehin Linie auf Linie liegt; kräftig gezogen ergäbe
    // das einen Knoten. Ihre Aussage steckt in Grösse und Form, nicht in der
    // Deckkraft — eine Spur über dem Gradnetz (.19) reicht.
    ctx.fillStyle = 'rgba(22,24,29,.04)';
    ctx.strokeStyle = 'rgba(22,24,29,.22)';
    ctx.lineWidth = .8 / skala;
    for (let i = 0; i < tissot.abschnitt.length; i++) {
      const al = zugAlpha(tissot, i);
      if (al < .02) continue;
      ctx.globalAlpha = al;
      ctx.beginPath(); zug(tissot, i); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  if (zeigKurs) {
    // Erst eine Fassung in Papierfarbe, dann die Linie darauf. Das Ockergelb der
    // Kurslinie steht gegen das orange Ende der Skala nur auf 1,34:1 — über
    // Grönland auf Mercator wäre sie sonst kaum zu sehen. Die Fassung löst das
    // unabhängig von der Füllung, so wie die Beschriftung darunter es auch tut.
    ctx.lineCap = 'round';
    for (const fassung of [true, false]) {
      ctx.lineWidth = (fassung ? 4.4 : 2) / skala;
      for (let i = 0; i < kurse.abschnitt.length; i++) {
        const al = zugAlpha(kurse, i);
        if (al < .02) continue;
        ctx.globalAlpha = fassung ? al * .85 : al;
        const gk = kurse.art[i] === 'gk';
        ctx.strokeStyle = fassung ? hex(PAPIER_RGB) : (gk ? '#16181d' : '#8a5a2b');
        ctx.setLineDash(fassung ? [] : (gk ? [] : [6 / skala, 5 / skala]));
        ctx.beginPath(); zug(kurse, i); ctx.stroke();
      }
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

  ctx.restore();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  spanneZeigen();
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
      ? '<b>The colour is Mercator\u2019s, the shape is the truth.</b> Teal means: on the '
        + 'Mercator map this country gets less image area than it is due — and here you see, '
        + 'on the correct sphere, which countries those are. Drag to turn it.'
      : '<b>The colour is held at Mercator.</b> It no longer says what the view on screen is '
        + 'doing, but what Mercator does — so it travels with each country through the '
        + 'cross-fade while the shape corrects itself.';
  }
  const el = document.getElementById('hinweisTissot');
  el.hidden = !zeigTissot;
  if (!zeigTissot) return;
  let s;
  if (globusAnteil() > .88) {
    s = '<b>On the sphere all the circles would be the same size and round</b> — on the '
      + 'sphere. What you see is their image on a flat screen: in the middle, where you look '
      + 'straight down, it is exact; towards the rim the very same circles become narrow '
      + 'slivers. So the globe does not solve the problem, it moves it to the rim — and turns '
      + 'it out of the way as soon as you drag.';
  } else if (t < .12) {
    s = '<b>Every circle has stayed a circle</b> — only the sizes differ. That is Mercator\u2019s '
      + 'strength: the stretching is equal in every direction, so angles and local shape are '
      + 'right. The straight course line follows from it. It is paid for in size: from the '
      + 'equator to 60° the areas grow 1.00, 1.34, 4.10. (Not perfectly circles, measured — '
      + '1.25:1 at 60°. These are 800 km wide, and a Tissot indicatrix is infinitesimal.)';
  } else if (t > .88) {
    s = '<b>Every circle is now the same size</b> — all thirty to the last digit, 0.0000 % '
      + 'spread — sheared into an ellipse in return, from 1.23:1 to 3.16:1. Even on the '
      + 'equator it is 1.36:1, so Equal Earth is nowhere conformal. That is the trade a flat '
      + 'map cannot get around.';
  } else {
    s = 'In between: the circles even out in size and lose their round shape doing it. On a '
      + 'flat map you cannot have both at once.';
  }
  s += ' <span class="wo">Every circle has a radius of 800 km on the earth (Tissot\u2019s indicatrix). '
    + 'They sit on the graticule intersections, on every second meridian.</span>';
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
function setze(v, { schieber = true } = {}) { t = v; if (schieber) reg.value = Math.round(v * 1000); knoepfe(); beschrifte(); zeigerHaltung(); neuZeichnen(); }
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

// Gedrückt ist der Knopf, dessen Netz gerade zu sehen ist — und zwar ganz.
// Früher stand hier „i === zielB && t > .98"; das leuchtete auch mitten auf der
// Kante Equal Earth–Globus, weil der Regler dort ja am Ende steht. Aus den
// Gewichten gelesen stimmt es in jedem Punkt des Dreiecks.
function knoepfe() {
  const g = gewichte();
  for (const b of ziele.children) {
    const i = +b.dataset.netz;
    b.setAttribute('aria-pressed', g[i] > .98 ? 'true' : 'false');
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
  animiere(e => { u = e; beschrifte(); neuZeichnen(); }, DAUER_WECHSEL,
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
  knopfSpiel.textContent = 'Pause';
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
  knopfSpiel.textContent = 'Play';
  knopfSpiel.setAttribute('aria-pressed', 'false');
}

knopfSpiel.addEventListener('click', () => rundlauf ? rundlaufStopp() : rundlaufStart());

// Das Dreieck unter der Legende ist die Zustandsanzeige. Ein Satz darunter
// steht nicht mehr; für eine Vorlesesoftware ist das SVG aber ein Bild ohne
// Inhalt, also bekommt es dieselbe Aussage als Beschriftung.
const triEl = document.getElementById('tri');
let letztesJetzt = '';

function beschrifte() {
  document.getElementById('zielName2').textContent = D.netze[zielB].name;
  kugelSetzen();

  const A = D.netze[zielA], B = D.netze[zielB], MER = D.netze[M];
  let s;
  if (zielA !== zielB && u > .002 && u < .998) s = A.name + ' to ' + B.name;
  else if (t < .002) s = MER.name;
  else if (t > .998) s = B.name;
  else s = MER.name + ' to ' + B.name;
  if (s !== letztesJetzt) { triEl.setAttribute('aria-label', s); letztesJetzt = s; }
}

// Die drei Zustände spannen ein gleichseitiges Dreieck auf, und die Kugel steht
// darin genau dort, wo die Karte gerade steht. Das ist keine Metapher, sondern
// dieselbe Rechnung: das Bild ist die Mischung
//
//     Mercator · (1−t)  +  zielA · t(1−u)  +  zielB · t·u
//
// (siehe dreiFach), und das sind baryzentrische Gewichte auf dem Dreieck. Die
// Kugel ist der so gewichtete Schwerpunkt der drei Ecken. Damit stimmt sie auch
// in dem Fall, den ein Fortschrittsbalken nicht könnte: ein Netzknopf startet
// Regler und Zielwechsel gleichzeitig, die Karte ist dann eine Mischung aus
// allen dreien, und die Kugel läuft quer durch die Fläche statt an einer Kante
// entlang.
const ECKEN = { mercator: [47.2, 234], equalearth: [282.8, 234], globus: [165, 30] };
const kugelEl = document.getElementById('kugel');

// Die Gewichte der drei Zustände im gerade gezeigten Bild.
function gewichte() {
  const g = new Float64Array(D.netze.length);
  g[M] += 1 - t;
  g[zielA] += t * (1 - u);
  g[zielB] += t * u;
  return g;
}

function kugelSetzen() {
  const g = gewichte();
  let x = 0, y = 0;
  for (let i = 0; i < g.length; i++) {
    if (!g[i]) continue;
    const e = ECKEN[D.netze[i].id];
    x += g[i] * e[0]; y += g[i] * e[1];
  }
  kugelEl.setAttribute('cx', x.toFixed(2));
  kugelEl.setAttribute('cy', y.toFixed(2));
}

// Das Dreieck ist nicht nur Anzeige, sondern Bedienung: ein Zug darin setzt die
// Karte. Umgekehrt zu kugelSetzen — aus dem Punkt werden baryzentrische
// Gewichte, daraus Regler und Ziel.
//
//   wMercator = 1 − t,  wA = t(1−u),  wB = t·u
//
// Damit die Knöpfe und die Beschriftung stimmen, werden die Ränder eingerastet:
// liegt kein Gewicht auf dem Globus, sind beide Ziele Equal Earth, und
// umgekehrt. Sonst zeigte an der Ecke Equal Earth kein Knopf als gedrückt an,
// obwohl genau dieses Netz zu sehen ist.
const triSvg = document.getElementById('tri');
const triWrap = triSvg.parentElement;
const iEE = D.netze.findIndex(n => n.id === 'equalearth');
const iGL = D.netze.findIndex(n => n.id === 'globus');

function gewichteAus(px, py) {
  const A = ECKEN.mercator, B = ECKEN.equalearth, C = ECKEN.globus;
  const d = (B[1] - C[1]) * (A[0] - C[0]) + (C[0] - B[0]) * (A[1] - C[1]);
  let a = ((B[1] - C[1]) * (px - C[0]) + (C[0] - B[0]) * (py - C[1])) / d;
  let b = ((C[1] - A[1]) * (px - C[0]) + (A[0] - C[0]) * (py - C[1])) / d;
  let c = 1 - a - b;
  // Ausserhalb des Dreiecks: auf null kappen und neu normieren. Ein Zug knapp
  // neben einer Kante rastet damit auf diese Kante ein, statt zu springen.
  a = Math.max(0, a); b = Math.max(0, b); c = Math.max(0, c);
  const s = a + b + c;
  return s > 0 ? [a / s, b / s, c / s] : [1, 0, 0];
}

function triSetzen(ev) {
  const r = triSvg.getBoundingClientRect();
  const px = (ev.clientX - r.left) / r.width * 330;
  const py = (ev.clientY - r.top) / r.height * 262;
  const [wM, wE, wG] = gewichteAus(px, py);

  const altesZiel = zielB;
  if (wG <= 1e-6) { zielA = zielB = iEE; u = 1; }
  else if (wE <= 1e-6) { zielA = zielB = iGL; u = 1; }
  else { zielA = iEE; zielB = iGL; u = wG / (wE + wG); }
  if (zielB !== altesZiel) tabellen();
  setze(1 - wM);
}

// Der Play-Knopf sitzt im Schwerpunkt und deckte damit genau die Stelle ab, an
// der alle drei Zustände gemischt sind — dort liess sich nicht mehr ziehen.
// Deshalb hängen die Zeiger am Umschlag, nicht am SVG, und ein Zug wird erst ab
// vier Pixeln einer: ein Tipp auf den Knopf bleibt ein Tipp, ein Zug darüber
// hinweg wird zum Ziehen, und der Klick des Knopfes wird dann einmal geschluckt.
let triZieht = false, triStart = null;

triWrap.addEventListener('pointerdown', ev => {
  triStart = { x: ev.clientX, y: ev.clientY, id: ev.pointerId,
               aufKnopf: knopfSpiel.contains(ev.target) };
});

triWrap.addEventListener('pointermove', ev => {
  if (!triStart || ev.pointerId !== triStart.id) return;
  if (!triZieht) {
    if (Math.hypot(ev.clientX - triStart.x, ev.clientY - triStart.y) < 4) return;
    triZieht = true;
    rundlaufStopp();
    triSvg.classList.add('zieht');
    triWrap.setPointerCapture(ev.pointerId);
    triWrap.addEventListener('click', schluck, { capture: true, once: true });
  }
  triSetzen(ev);
  ev.preventDefault();
});

const schluck = ev => { ev.stopPropagation(); ev.preventDefault(); };

const triEnde = ev => {
  if (triStart && ev.pointerId !== triStart.id) return;
  // Ein Tipp neben den Knopf setzt die Karte auf diese Stelle. Ohne das täte
  // ein kurzes Antippen des Dreiecks gar nichts, weil die Vier-Pixel-Schwelle
  // nie überschritten würde — und genau ein Tipp auf eine Ecke ist die
  // naheliegendste Geste.
  if (!triZieht && triStart && !triStart.aufKnopf) { rundlaufStopp(); triSetzen(ev); }
  triStart = null;
  if (!triZieht) return;
  triZieht = false;
  triSvg.classList.remove('zieht');
  if (triWrap.hasPointerCapture(ev.pointerId)) triWrap.releasePointerCapture(ev.pointerId);
  // Falls doch kein Klick mehr kommt, den Fänger wieder abräumen.
  setTimeout(() => triWrap.removeEventListener('click', schluck, { capture: true }), 0);
};
triWrap.addEventListener('pointerup', triEnde);
triWrap.addEventListener('pointercancel', triEnde);



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
const nf = (n, d = 0) => n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
function tabellen() {
  const z = zielB;
  // Der Globus steht nicht als eigene Spalte da: er ist unverzerrt, liefert also
  // dieselben Anteile wie das flächentreue Netz. Die zweite Spalte ist beides.
  const spalten = NETZ.length;
  document.getElementById('tKont').innerHTML =
    '<tr><th>Continent</th><th class="z">Mercator</th>' +
    '<th class="z">Equal Earth and globe</th><th class="z">Population</th></tr>' +
    D.kontinente.map(r => '<tr><td>' + r[0] + '</td>' +
      r.slice(1, 1 + spalten).map(v => '<td class="z">' + nf(v, 1) + ' %</td>').join('') +
      '<td class="z">' + nf(r[1 + spalten]) + ' m</td></tr>').join('');

  // Sortiert wird nach der absolut gewonnenen oder verlorenen Bildfläche, nicht
  // nach Prozent: sonst stünden auf der Gewinnerseite nur winzige Äquatorländer,
  // die alle denselben Wert tragen.
  const kandidaten = LAND.filter(l => l.wahr > 150000 && l.iso !== 'ATA')
    .map(l => ({ l, v: l.faktor[z] / l.faktor[M] - 1, d: l.wahr * (l.faktor[z] - l.faktor[M]) }))
    .sort((a, b) => a.d - b.d);
  const tab = (titel, zeilen) =>
    '<tr><th>' + titel + '</th><th class="z">Area</th><th class="z">Image share</th></tr>' +
    zeilen.map(({ l, v }) => '<tr><td>' + l.name + '</td><td class="z">' +
      nf(l.wahr / 1e6, 2) + ' m km²</td><td class="z">' +
      (v >= 0 ? '+' : '\u2212') + nf(Math.abs(v) * 100) + ' %</td></tr>').join('');
  document.getElementById('tVerlust').innerHTML = tab('loses image area', kandidaten.slice(0, 8));
  document.getElementById('tGewinn').innerHTML = tab('gains image area', kandidaten.slice(-8).reverse());
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
      // Auch die Umlaufkopien treffen. Der Versatz ist je Punkt 2π·g, deshalb
      // wird er hier Punkt für Punkt aufgeschlagen statt als fester Betrag.
      const st = land.stuecke[r];
      for (const um of st.links && st.rechts ? [0, -1, 1] : st.links ? [0, -1] : st.rechts ? [0, 1] : [0]) {
        for (let k = a, m = b - 1; k < b; m = k++) {
          const i = AUSWAHL[k], j = AUSWAHL[m];
          const yi = land.cy[i], yj = land.cy[j];
          const xi = land.cx[i] + um * ZWEIPI * land.cg[i];
          const xj = land.cx[j] + um * ZWEIPI * land.cg[j];
          if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) drin = !drin;
        }
      }
    }
    if (drin) return l;
  }
  return null;
}

function zeigeTip(l, ev) {
  const f = Math.exp(farbwert(l));
  const ab = Math.round(Math.abs(f - 1) * 100);
  const wo = farbeFest ? ' on Mercator' : '';
  const satz = ab < 3 ? 'the size it is due' + wo
    : f > 1 ? nf(ab) + ' % more image area than it is due' + wo
            : nf(ab) + ' % less image area than it is due' + wo;
  tip.innerHTML = '<div class="n">' + l.name + '</div>' +
    '<div class="m">' + nf(l.wahr / 1e6, 3) + ' m km²' +
    (l.einwohner ? ' \u00b7 ' + nf(l.einwohner / 1e6, 1) + ' m people' : '') + '</div>' +
    '<div class="f">' + satz + '<br>factor ' + nf(f, 2) + '</div>';
  tip.style.left = ev.clientX + 'px';
  tip.style.top = ev.clientY + 'px';
  tip.style.opacity = '1';
}

// Solange der Globus im Bild ist, dreht ein Zug ihn, statt zu zeigen. Darunter
// bleibt der Zeiger, was er war.
let zieht = null;

function zeigerHaltung() {
  // Solange der Globus im Bild ist, gehört ein Zug über der Karte der Kugel.
  // Ohne das eigene touch-action rollt der Browser auf dem Telefon nebenher die
  // Seite mit, und man dreht die Kugel, während einem das Menü davonläuft.
  // Ziehen tut jetzt in jedem Zustand etwas — auf der Kugel dreht es, auf dem
  // Blatt verschiebt es den Mittelmeridian. Also zeigt der Zeiger das überall an.
  // Immer „none": zwei Finger sollen zoomen, und das ginge sonst an den Browser.
  // Das Scrollen der Seite übernimmt dafür der senkrechte Zug selbst.
  cv.style.touchAction = 'none';
  cv.style.cursor = zieht ? 'grabbing' : 'grab';
}

// Zwei Finger zoomen, einer verschiebt. Damit der Browser die Kneifgeste nicht
// selbst abfängt, steht touch-action auf der Karte auf „none" — dafür übernimmt
// ein senkrechter Zug bei ganzer Karte das Scrollen der Seite selbst, sonst
// klebte man auf dem Telefon an der Karte fest.
const zeiger = new Map();
let kneift = null, achse = null, letzterTipp = 0, warGeste = false;

// Bildpunkt → Kartenkoordinate, mit dem Rahmen des letzten Bildes.
const zuKarte = (sx, sy) => {
  const r = cv.getBoundingClientRect();
  return [(sx - r.left - breite / 2) / skala + mx, my - (sy - r.top - hoehe / 2) / skala];
};

// Setzt den Versatz so, dass der Kartenpunkt (ax, ay) wieder unter dem
// Bildpunkt (sx, sy) liegt.
function haltePunkt(ax, ay, sx, sy) {
  const r = cv.getBoundingClientRect();
  versatzX = ax - (sx - r.left - breite / 2) / skala - rahmenX;
  versatzY = ay + (sy - r.top - hoehe / 2) / skala - rahmenY;
  versatzKlemmen();
}

cv.addEventListener('pointerdown', ev => {
  // Ein Druck auf die Karte ist eine Übernahme, ob danach gedreht wird oder nicht.
  rundlaufStopp();
  zeiger.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
  // Das Einfangen darf nicht der Rest der Geste kosten. Es scheitert in Fällen,
  // die uns nicht kümmern (kein aktiver Zeiger mehr), und riss bis eben den
  // ganzen Handler mit — die Geste kam dann gar nicht erst zustande.
  try { cv.setPointerCapture(ev.pointerId); } catch { /* dann eben ohne */ }
  tip.style.opacity = '0';
  if (zeiger.size === 2) {
    const [a, b] = [...zeiger.values()];
    const sx = (a.x + b.x) / 2, sy = (a.y + b.y) / 2;
    const [ax, ay] = zuKarte(sx, sy);
    kneift = { abstand: Math.hypot(a.x - b.x, a.y - b.y), zoom0: zoom, ax, ay };
    warGeste = true;
    zieht = null;
  } else if (zeiger.size === 1) {
    zieht = { x: ev.clientX, y: ev.clientY };
    achse = null;
  }
  zeigerHaltung();
  ev.preventDefault();
});

const zugEnde = ev => {
  zeiger.delete(ev.pointerId);
  try { if (cv.hasPointerCapture(ev.pointerId)) cv.releasePointerCapture(ev.pointerId); } catch { /* egal */ }
  if (zeiger.size < 2) kneift = null;
  if (zeiger.size === 0) {
    // Doppeltipp setzt den Ausschnitt zurück — auf dem Telefon der einzige
    // bequeme Weg heraus aus einem tiefen Zoom.
    //
    // Als Tipp zählt nur, was weder gekniffen noch gezogen hat. Ohne diese
    // Bedingung galt das Abheben nach einer Kneifgeste selbst als Tipp: zwei
    // Kneifgesten kurz hintereinander setzten den gerade gesetzten Zoom sofort
    // wieder zurück. Und die Uhr läuft nur für echte Tipps weiter, damit eine
    // Kneifgeste keinen falschen Doppeltipp scharfstellt.
    const jetzt = performance.now();
    const tipp = !warGeste && achse === null;
    if (tipp && jetzt - letzterTipp < 320) { zoomZurueck(); letzterTipp = 0; }
    else if (tipp) letzterTipp = jetzt;
    warGeste = false;
    zieht = null; achse = null;
  } else if (zeiger.size === 1) {
    const [a] = [...zeiger.values()];
    zieht = { x: a.x, y: a.y };
    achse = null;
  }
  zeigerHaltung();
};
cv.addEventListener('pointerup', zugEnde);
cv.addEventListener('pointercancel', zugEnde);

function zoomZurueck() {
  zoom = 1; versatzX = 0; versatzY = 0;
  if (Math.abs(Math.log(zoom / auswahlZoom)) > .2) duenneAus();
  neuZeichnen();
}

cv.addEventListener('pointermove', ev => {
  if (zeiger.has(ev.pointerId)) zeiger.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });

  if (kneift && zeiger.size >= 2) {
    const [a, b] = [...zeiger.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    const sx = (a.x + b.x) / 2, sy = (a.y + b.y) / 2;
    zoom = Math.max(1, Math.min(ZOOM_MAX, kneift.zoom0 * d / kneift.abstand));
    skala = basisMerk * zoom;
    haltePunkt(kneift.ax, kneift.ay, sx, sy);
    if (Math.abs(Math.log(zoom / auswahlZoom)) > .2) duenneAus();
    neuZeichnen();
    ev.preventDefault();
    return;
  }

  if (zieht) {
    const dx = ev.clientX - zieht.x, dy = ev.clientY - zieht.y;
    zieht.x = ev.clientX; zieht.y = ev.clientY;
    const gA = globusAnteil();

    // Bei ganzer Karte und ebenem Netz gehört ein senkrechter Zug der Seite.
    // Die Achse wird einmal je Geste festgelegt, sonst zittert es zwischen
    // Scrollen und Verschieben.
    if (achse === null && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
      achse = (zoom === 1 && gA <= .05 && Math.abs(dy) > Math.abs(dx)) ? 'seite' : 'karte';
      warGeste = true;
    }
    if (achse === 'seite') { scrollBy(0, -dy); return; }

    // Auf dem Blatt folgt die Karte dem Finger genau: ein Bildpunkt ist
    // 1/skala Bogenmass. Auf der Kugel bleibt das eingespielte Mass, geteilt
    // durch den Zoom — hineingezoomt deckt ein Bildpunkt weniger Kugel ab.
    dreheLam -= dx * ((1 - gA) / skala + gA * .38 * RAD / zoom);
    if (gA > .05) drehePhi = Math.max(-85 * RAD, Math.min(85 * RAD, drehePhi + dy * .38 * RAD / zoom));
    else if (zoom > 1) { versatzY += dy / skala; versatzKlemmen(); }
    dreheLam = ((dreheLam + Math.PI) % ZWEIPI + ZWEIPI) % ZWEIPI - Math.PI;
    richteAlle();
    dreheAlle();
    neuZeichnen();
    return;
  }

  const r = cv.getBoundingClientRect();
  const l = treffer(ev.clientX - r.left, ev.clientY - r.top);
  aktiv = l;
  if (l) zeigeTip(l, ev); else tip.style.opacity = '0';
});

cv.addEventListener('wheel', ev => {
  ev.preventDefault();
  rundlaufStopp();
  const [ax, ay] = zuKarte(ev.clientX, ev.clientY);
  zoom = Math.max(1, Math.min(ZOOM_MAX, zoom * Math.exp(-ev.deltaY * .0016)));
  skala = basisMerk * zoom;
  haltePunkt(ax, ay, ev.clientX, ev.clientY);
  if (Math.abs(Math.log(zoom / auswahlZoom)) > .2) duenneAus();
  neuZeichnen();
}, { passive: false });

cv.addEventListener('dblclick', ev => { ev.preventDefault(); zoomZurueck(); });

cv.addEventListener('pointerleave', () => { aktiv = null; tip.style.opacity = '0'; });

// ---------- Start ----------
addEventListener('resize', () => { messe(); zeichne(); });
messe(); beschrifte(); knoepfe(); tabellen(); zeigerHaltung(); zeichne();
