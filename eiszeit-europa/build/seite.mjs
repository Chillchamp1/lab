// Erzeugt die fertige index.html. Alles darin, nichts wird nachgeladen.
//
// Aufbau und Machart folgen bevoelkerung-kreise/index.html; was uebernommen
// wird und warum, steht in ../ASTHETIK.md. Die Unterschiede sind die, die aus
// dem Gegenstand folgen: zwei Materialien statt einem, Hoehe in Metern statt
// Dichte, und ein Unsicherheitsband, das die Kernaussage traegt.

import { ENTPACKER } from './code.mjs';

export function baueSeite({ D, nutzlast, gestein, gesteinCvd, eisrampe, notizen, kenn }) {
  const J = (o) => JSON.stringify(o);
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Europe under the ice</title>
<meta name="description" content="An animated relief map of Europe through the last ice age, 26,000 years ago to today: real mountain terrain from a 15-arcsecond elevation model, the crust pressed down and rebounding from ICE-6G_C, the Scandinavian ice sheet on top, and the DATED-1 margin uncertainty band.">
<style>
/* Eine Seite, ein Bild. Schwarz aussen, die Karte fuellt den Schirm; alles, was
   nicht zur Karte gehoert, ist weg. Nur ein Farbklima, kein Umschalten zwischen
   hell und dunkel: die Gelaendefarben sind auf diesen Grund gesetzt. */
:root{
  --plane:#000; --surface:#0c0c0c; --ink:#fff; --ink2:#bfbeb6; --muted:#7f7d77;
  --line:#232321; --axis:#33332f; --ring:rgba(255,255,255,.09);
}
*{box-sizing:border-box}
html,body{margin:0;height:100%}
body{background:var(--plane);color:var(--ink);
  font-family:system-ui,-apple-system,"Segoe UI",sans-serif;font-size:15px;line-height:1.5;
  -webkit-text-size-adjust:100%;overflow:hidden}
/* min-height statt height, und die Buehne oben ausgerichtet: sie ist so hoch
   wie ihr Inhalt, hoechstens schirmhoch. Die Vorlage nagelt ihre auf 100dvh —
   richtig fuer einen hochkanten Ausschnitt, falsch fuer diesen queren. */
.wrap{max-width:900px;margin:0 auto;min-height:100dvh;padding:6px;
  display:flex;align-items:flex-start}
/* container-type macht die Buehne zum Massstab fuer alles darin: 1cqw ist ein
   Hundertstel ihrer Breite. Damit waechst der Text mit der Karte, statt in
   Bildpunkten festzustehen. min-width:0, weil ein Flex-Kind sonst mindestens
   so breit ist wie sein Inhalt — und in der Legende steht eine Zeile, die
   nicht umbrechen darf. */
.buehne{container-type:inline-size;
  position:relative;flex:0 1 auto;width:100%;min-width:0;min-height:0;max-height:calc(100dvh - 12px);
  display:flex;flex-direction:column;
  background:var(--surface);border:1px solid var(--ring);border-radius:14px;padding:10px 12px 8px}

/* ---------- Drei Ebenen ----------
     Ebene 2  Jahr und Eisvolumen — ueber der Karte, mit Schein dahinter.
     Ebene 1  die Karte.
     Ebene 0  die Notiz und der Faden — hinter der Karte.
   Der Text weicht der Karte aus, statt sie zu verdraengen. */
.schild{position:absolute;left:12px;right:12px;top:10px;z-index:2;pointer-events:none;
  display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;
  text-shadow:0 0 6px var(--surface),0 0 6px var(--surface),0 0 14px var(--surface)}
.schild>b{font-size:30px;font-weight:650;letter-spacing:-.02em;line-height:1;
  font-variant-numeric:tabular-nums}
.schild>span{color:var(--ink2);font-size:13px}
.schild .roh{color:var(--muted)}

/* top kommt aus der gemessenen Hoehe des Schildes (masse()): bricht die
   Zeitangabe neben dem Jahr auf schmalen Schirmen um, waechst das Schild, und
   eine feste Zahl legte die Notiz mitten hinein. */
.text{position:absolute;left:12px;right:12px;top:var(--kopf,48px);z-index:0;
  pointer-events:none}
.jetzt{margin:0;max-width:min(94%,470px);
  font-size:clamp(9px,1.36cqw,11.6px);line-height:1.5;color:var(--ink2);
  opacity:0;transition:opacity .4s}
.jetzt b{display:block;color:var(--ink);font-weight:650;
  font-size:clamp(9.8px,1.48cqw,12.6px);margin-bottom:2px}
.faden{width:min(52%,210px);padding-top:4px;
  display:flex;flex-direction:column;gap:2px;will-change:transform}
.faden b{font-size:clamp(7.2px,1.09cqw,9.3px);line-height:1.3;font-weight:600;
  color:var(--ink);transition:opacity .5s}
@media(max-width:540px){.faden b{font-size:6.5px}}

/* ---------- Auf dem Telefon steht die Notiz unter der Karte ----------
   Das Prinzip der Vorlage — Text hinter der Karte, die Karte weicht ihm aus —
   haengt daran, dass ihr Umriss Platz laesst. Deutschland tut das. Europa von
   12 W bis 45 O nicht: auf 390 px verdeckte die Karte zwei Drittel jeder
   Zeile. Also wandert der Text dort in den Fluss, hinter Karte und Leiste.
   Die Buehne ist da ohnehin kuerzer als der Schirm — der Platz ist da. */
@media(max-width:640px){
  .schild{position:static;order:-1;margin-bottom:6px}
  .text{position:static;order:3;padding-top:8px}
  .jetzt{max-width:100%;font-size:11.5px}
  .jetzt b{font-size:12.5px}
  .faden{width:100%;flex-direction:row;flex-wrap:wrap;gap:0 10px}
  .faden b{font-size:9.5px}
}

/* Das Feld haelt das Seitenverhaeltnis der Karte, statt den Schirm zu fuellen.
   Die Vorlage nagelt ihre Buehne auf 100dvh, und das ist dort richtig: ihr
   Ausschnitt ist Deutschland, also hochkant. Dieser hier ist Europa von 12 W
   bis 45 O — breiter als hoch. Auf einem hochkant gehaltenen Telefon blieb
   damit die Haelfte des Feldes schwarz (gemessen: 48 % Fuellung bei 390 px).
   Mit aspect-ratio schrumpft stattdessen die Buehne, und der Rand unten ist
   Seitengrund statt Loch in der Karte. */
.feld{position:relative;z-index:1;flex:0 1 auto;min-height:0;
  aspect-ratio:var(--kartenmass,1.17)}
canvas{position:absolute;left:0;top:0;width:100%;height:100%}
#karte{touch-action:none}

.fuss{flex:0 0 auto;min-width:0;padding:6px 0 0}
/* Eine Zeile, auch wenn sie leer ist: sonst ist die Leiste beim ersten Messen
   niedriger als gleich darauf, und die Karte wird fuer eine Hoehe gezeichnet,
   die es nicht mehr gibt. */
.fuss .klein{margin:4px 0 0;font-size:11.5px;line-height:1.35;color:var(--ink2);
  min-height:1.35em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  font-variant-numeric:tabular-nums}
@media(max-width:540px){.fuss .klein{white-space:normal;max-height:2.7em}}

.legende{font-size:11.5px;color:var(--ink2);font-variant-numeric:tabular-nums}
.pole{display:flex;justify-content:space-between;color:var(--muted);
  margin-bottom:3px;line-height:1.2}
.pole .rechts{display:flex;align-items:center;gap:8px}
.leitern{display:flex;gap:8px;align-items:stretch}
.leitern>div:first-child{flex:1 1 auto;min-width:0}
.leitern>div:last-child{flex:0 0 27%;min-width:70px}
.rampe{height:9px;border-radius:5px;border:1px solid var(--ring)}
.rname{font-size:9.5px;color:var(--muted);line-height:1.2;margin-bottom:2px}
.stufen{position:relative;height:1.2em;margin-top:3px}
.stufen span{position:absolute;top:0;transform:translateX(-50%);white-space:nowrap}
.stufen span::before{content:'';position:absolute;left:50%;top:-4px;width:1px;
  height:4px;background:var(--axis)}
.stufen .a{transform:none}
.stufen .a::before{left:0}
.stufen .z{transform:translateX(-100%)}
.stufen .z::before{left:100%}
/* Die Null ist der Anker der ganzen Leiter — die Kuestenlinie. Ein laengerer,
   hellerer Strich sagt das, und kostet keinen Bildpunkt Breite. */
.stufen .null{color:var(--ink)}
.stufen .null::before{top:-7px;height:7px;background:var(--ink)}

.regler{display:flex;align-items:center;gap:9px;flex:0 0 auto;margin-top:6px}
button{font:inherit;color:var(--ink);background:transparent;border:1px solid var(--axis);
  border-radius:8px;padding:5px 10px;cursor:pointer}
button:hover{border-color:var(--muted)}
#spiel{width:38px;flex:0 0 38px;padding:5px 0;font-variant-numeric:tabular-nums}
.bahn{position:relative;flex:1}
input[type=range]{width:100%;margin:0;accent-color:#9aa07f}
/* Die Marken sind nicht Zierat: hier wird die **tatsaechliche Schrittweite der
   Daten** ablesbar. ICE-6G_C hat bis 21 ka Schritte von 1 000 Jahren und
   danach von 500 — in der zweiten Haelfte der Bahn stehen die Striche also
   doppelt so dicht, und das sieht man. */
.marken{position:relative;height:9px;margin-top:1px}
.marken i{position:absolute;top:0;width:1px;height:4px;background:var(--axis)}
.marken i.voll{height:7px;background:var(--muted)}
.marken i.dated{top:5px;height:4px;background:#c8792e}

.sicht{display:flex;align-items:center;gap:10px;flex:0 0 auto;margin-top:5px}
.sicht label{display:flex;align-items:center;gap:6px;flex:1 1 0;min-width:0}
.sicht label span{flex:0 0 auto;color:var(--muted);font-size:11.5px}
.sicht button{flex:0 0 auto;padding:3px 9px;font-size:11.5px;border-radius:7px}
.sicht button[aria-pressed=false]{color:var(--muted);border-style:dashed}
.aufKarte{position:absolute;z-index:2;font-size:11.5px;line-height:1;padding:4px 8px;
  border-radius:7px;background:rgba(20,20,18,.78)}
#nord{left:8px;bottom:8px;width:26px;height:26px;padding:0;display:grid;place-items:center;
  color:var(--ink2);border:1px solid var(--axis);pointer-events:none}
#nord[hidden]{display:none}
#nord svg{width:20px;height:20px;display:block}
#zurueck{right:8px;top:8px;font-size:15px;padding:3px 8px}
#farben{padding:2px 7px;font-size:11px;line-height:1.2;border-radius:6px;color:var(--muted);
  border-style:dashed}
#farben[aria-pressed=true]{color:var(--ink);border-style:solid}
/* Der Meeresspiegel-Ticker. Eine Kurve, die mitlaeuft — sie steht unter der
   Karte, weil sie die eine Zahl ist, die den ganzen Vorgang zusammenfasst. */
.msp{display:flex;align-items:center;gap:8px;margin-top:4px}
.msp canvas{position:static;width:100%;height:26px;display:block}
.msp .wert{flex:0 0 auto;font-size:11.5px;color:var(--ink2);
  font-variant-numeric:tabular-nums;min-width:5.4em;text-align:right}
.msp .bahn2{position:relative;flex:1;min-width:0;height:26px}
</style>
</head><body>
<div class="wrap">
<div class="buehne" id="buehne">
  <div class="feld">
    <canvas id="karte"></canvas>
    <div class="aufKarte" id="nord" hidden aria-hidden="true" title="North"><svg viewBox="0 0 20 20"><path d="M10 1 L13 15 L10 12 L7 15 Z" fill="currentColor"/></svg></div>
    <button class="aufKarte" id="zurueck" hidden aria-label="Reset the view" title="Reset the view">&#8634;</button>
  </div>
  <div class="fuss">
    <div class="legende">
      <div class="pole"><span>below sea level &#183; above</span><span class="rechts"><span>ice surface</span><button id="farben" aria-pressed="false" title="A second ramp for red-green colour blindness">Colours</button></span></div>
      <div class="leitern">
        <div><div class="rampe" id="rampe"></div><div class="stufen" id="stufen"></div></div>
        <div><div class="rampe" id="rampeEis"></div><div class="stufen" id="stufenEis"></div></div>
      </div>
      <p class="klein" id="legText"></p>
    </div>
  </div>
  <div class="regler">
    <button id="spiel" aria-label="Play or pause">&#9654;</button>
    <div class="bahn">
      <input type="range" id="zeit" min="0" max="1000" value="0" step="1" aria-label="Time">
      <div class="marken" id="marken"></div>
    </div>
  </div>
  <div class="msp">
    <div class="bahn2"><canvas id="mspBahn"></canvas></div>
    <span class="wert" id="mspWert"></span>
  </div>
  <div class="sicht">
    <label><span>Tilt</span><input type="range" id="kipp" min="0" max="100" value="0" step="1" aria-label="Tilt"></label>
    <label><span>Turn</span><input type="range" id="dreh" min="0" max="360" value="0" step="1" aria-label="Turn"></label>
    <button id="band" aria-pressed="true" title="DATED-1 maximum and minimum margins">Band</button>
  </div>
  <div class="schild"><b id="jahrZahl">&#8211;</b><span id="jahrNeben"></span></div>
  <div class="text">
    <p class="jetzt" id="jetzt"></p>
    <div class="faden" id="faden" aria-live="polite"></div>
  </div>
</div>
</div>

<script>
${ENTPACKER}

const D = ${nutzlast};
const NOTIZ = ${J(notizen)};

/* ================================================================ Nutzlast */
const GW = D.g.w, GH = D.g.h;
const NT = D.t.length;

/* ---------- Das DEM ----------
   Zeilenweise nur ueber den gueltigen Abschnitt kodiert, vorhergesagt aus
   links + oben minus links-oben. Ausserhalb steht KEIN Wert — dort ist die
   Karte nicht, und die Leinwand bleibt durchsichtig. */
const DEM = new Int16Array(GW * GH);
const MASKE = new Uint8Array(GW * GH);
const VON = new Int32Array(GH), BIS = new Int32Array(GH);
{
  const sp = entpacke(D.sp, D.spL);
  let a = 0, l = 0;
  for (let y = 0; y < GH; y++) {
    a += sp[2 * y]; l += sp[2 * y + 1];
    VON[y] = a; BIS[y] = l > 0 ? a + l - 1 : -1;
  }
  const d = entpacke(D.dem, D.demL);
  const Q = new Int32Array(GW * GH);
  let k = 0;
  for (let y = 0; y < GH; y++) {
    const v = VON[y], b = BIS[y];
    if (b < 0) continue;
    const ao = y > 0 ? VON[y - 1] : -1, bo = y > 0 ? BIS[y - 1] : -1;
    for (let x = v; x <= b; x++) {
      const hatL = x > v;
      const hatO = ao >= 0 && x >= ao && x <= bo;
      const hatLO = hatL && ao >= 0 && x - 1 >= ao && x - 1 <= bo;
      const L = hatL ? Q[y * GW + x - 1] : 0;
      const O = hatO ? Q[(y - 1) * GW + x] : 0;
      const LO = hatLO ? Q[(y - 1) * GW + x - 1] : 0;
      const p = (hatL && hatO && hatLO) ? L + O - LO : hatL ? L : hatO ? O : 0;
      const q = d[k++] + p;
      Q[y * GW + x] = q;
      DEM[y * GW + x] = q * D.qdem;
      MASKE[y * GW + x] = 1;
    }
  }
}

/* ---------- Die groben Felder ----------
   Beide liegen auf einem **projizierten** Grobgitter, achsenparallel ueber der
   Karte. Das nimmt der Seite die Umkehrung der Projektion ab: Hochrechnen ist
   eine reine Streckung. */
function grobFeld(o, q) {
  const n = o.w * o.h;
  const d = entpacke(o.d, o.L);
  const s = [];
  let k = 0;
  for (let t = 0; t < NT; t++) {
    const f = new Float32Array(n);
    for (let y = 0; y < o.h; y++) {
      let vor = 0;
      for (let x = 0; x < o.w; x++) { vor += d[k++]; f[y * o.w + x] = vor * q; }
    }
    s.push(f);
  }
  return { w: o.w, h: o.h, s };
}
const TD = grobFeld(D.td, D.qtd);
const EIS = grobFeld(D.eis, D.qeis);

/* ---------- DATED-1 ---------- */
const DATED = {};
{
  const d = entpacke(D.dated.d, D.dated.L);
  let k = 0;
  for (const ka of Object.keys(D.dated.s)) {
    DATED[ka] = {};
    for (const sorte of ['mc', 'max', 'min']) {
      const laengen = D.dated.s[ka][sorte];
      if (!laengen) continue;
      const linien = [];
      for (const n of laengen) {
        // Die Kette faengt **je Linie** wieder bei null an, genau wie beim
        // Packen. Lief sie durch, summierten sich alle vorigen Linien auf,
        // und der erste Punkt der ersten lag bei Gitter 23 061 statt bei 400 —
        // die Raender wurden gezeichnet, nur weit ausserhalb der Leinwand.
        let px = 0, py = 0;
        const xs = new Float32Array(n), ys = new Float32Array(n);
        for (let i = 0; i < n; i++) {
          px += d[k++]; py += d[k++];
          xs[i] = px / 10; ys[i] = py / 10;
        }
        linien.push([xs, ys]);
      }
      DATED[ka][sorte] = linien;
    }
  }
}
const DATED_KA = Object.keys(DATED).map(Number).sort((a, b) => a - b);

/* ================================================================ Die Leiter
   Zwei, eine je Material. Gesetzt ist nur, wie viele Baender; wo sie anfangen
   und aufhoeren, sind Meter — und die Null ist eine Bandgrenze, damit die
   Kuestenlinie eine Hoehenlinie ist wie jede andere. */
const GESTEIN_ATLAS = ${J(gestein)};
const GESTEIN_CVD = ${J(gesteinCvd)};
const EISRAMPE = ${J(eisrampe)};
let GESTEIN = GESTEIN_ATLAS;
const WASSER = ${D.wasser};          // Baender unter Null
const NBAND = GESTEIN.length;
const LANDBAND = NBAND - WASSER;
const LANDSTUFE = ${D.landstufe};    // Meter je Landband
const WASSERSTUFE = ${D.wasserstufe};// Meter je Wasserband
const EISSTUFE = ${D.eisstufe};      // Meter je Eisband
const NEIS = EISRAMPE.length;
const HOCHMAX = LANDBAND * LANDSTUFE;
const TIEFMAX = WASSER * WASSERSTUFE;

/* Meter -> Leiterwert 0..1, mit einem **Knie** an beiden Enden statt eines
   Deckels: bis zur letzten Bandgrenze genau linear, darueber weich weiter, und
   die Reserve wird erst im Unendlichen erreicht. Geklemmt wird damit nichts,
   die Reihenfolge der Gipfel bleibt erhalten. Uebernommen aus der Vorlage —
   dort war der Deckel der Grund, warum Berlin kleiner aussah, als es ist. */
const RESERVE = 0.1;
const knie = u => u > 1 ? 1 + RESERVE * (1 - Math.exp((1 - u) / RESERVE))
              : u < 0 ? -RESERVE * (1 - Math.exp(u / RESERVE)) : u;
function gesteinLeiter(m) {
  if (m >= 0) return WASSER / NBAND + knie(m / HOCHMAX) * LANDBAND / NBAND;
  return WASSER / NBAND - knie(-m / TIEFMAX) * WASSER / NBAND;
}
const eisLeiter = m => knie(m / (NEIS * EISSTUFE));

const hexR = h => parseInt(h.slice(1, 3), 16);
const hexG = h => parseInt(h.slice(3, 5), 16);
const hexB = h => parseInt(h.slice(5, 7), 16);
let GR = [], GG = [], GB = [], ER = [], EG = [], EB = [];
function leiterSetzen(liste) {
  GESTEIN = liste;
  GR = liste.map(hexR); GG = liste.map(hexG); GB = liste.map(hexB);
  ER = EISRAMPE.map(hexR); EG = EISRAMPE.map(hexG); EB = EISRAMPE.map(hexB);
}
leiterSetzen(GESTEIN_ATLAS);

/* ================================================================ Zustand */
const cv = document.getElementById('karte'), ctx = cv.getContext('2d');
let breite = 0, hoehe = 0, DPR = 1, GROB = false;
/* Die Karte behaelt ihr Seitenverhaeltnis. Das Gitter ist 760 zu 649; auf die
   Leinwand gestreckt stuende Skandinavien je nach Fenster mal breit, mal
   schmal — und eine flaechentreue Projektion, die man hinterher verzerrt, ist
   keine mehr. Also eingepasst und zentriert, wie die Vorlage es mit masse()
   tut. kx/ky/kw/kh ist der Platz, den die Karte wirklich einnimmt. */
let kx = 0, ky = 0, kw = 0, kh = 0;
let spiel = 0, laeuft = false, dtSek = 1 / 60;

const TAKT = D.takt, TAKTKUM = [0];
for (let i = 0; i < TAKT.length; i++) TAKTKUM.push(TAKTKUM[i] + TAKT[i]);
// Die Zeitachse laeuft rueckwaerts durch die Jahre: D.t[0] ist 26 ka, D.t[NT-1]
// ist 0. Der Regler laeuft trotzdem von links nach rechts — links steht der
// Anfang, wie bei allen drei Reglern der Vorlage.
let ka = D.t[0];
let abschnitt = 0, uAbschnitt = 0;
function setzeZeit(p) {
  spiel = Math.max(0, Math.min(1, p));
  let a = 0;
  while (a < NT - 2 && TAKTKUM[a + 1] <= spiel) a++;
  const u = Math.max(0, Math.min(1, (spiel - TAKTKUM[a]) / TAKT[a]));
  abschnitt = a; uAbschnitt = u;
  ka = D.t[a] + (D.t[a + 1] - D.t[a]) * u;
}

/* ================================================================ Das Feld */
const RAUF = 0.55;
let rW = 0, rH = 0;
let demR = null, maskeR = null, rock = null, eisD = null, flaeche = null;
let bild = null, licht = null, lichtBild = null;
// Vorberechnete Gewichte fuers Hochrechnen — sie haengen nur an der Feldgroesse.
let wxT = null, ixT = null, wyT = null, iyT = null;
let wxE = null, ixE = null, wyE = null, iyE = null;
let tmpT = null, tmpE = null;
const hkF = document.createElement('canvas'), hcF = hkF.getContext('2d');
const hkL = document.createElement('canvas'), hcL = hkL.getContext('2d');
const hkS = document.createElement('canvas'), hcS = hkS.getContext('2d');

// Catmull-Rom, dieselbe Kurve wie beim Bauen.
function crGewichte(n, quelle, ziel) {
  const w = new Float32Array(ziel * 4), ix = new Int32Array(ziel * 4);
  for (let i = 0; i < ziel; i++) {
    const u = (i + 0.5) / ziel;                 // Mitte der Zielzelle, normiert
    const f = u * quelle - 0.5;                 // gebrochener Quellindex
    const b = Math.floor(f), t = f - b;
    const t2 = t * t, t3 = t2 * t;
    w[i * 4 + 0] = -0.5 * t3 + t2 - 0.5 * t;
    w[i * 4 + 1] = 1.5 * t3 - 2.5 * t2 + 1;
    w[i * 4 + 2] = -1.5 * t3 + 2 * t2 + 0.5 * t;
    w[i * 4 + 3] = 0.5 * t3 - 0.5 * t2;
    for (let k = 0; k < 4; k++) ix[i * 4 + k] = Math.max(0, Math.min(quelle - 1, b - 1 + k));
  }
  return [w, ix];
}
// Separabel: erst vier Quellzeilen laengs strecken, dann quer mischen.
function hochrechnen(src, sw, sh, dst, dw, dh, wx, ix, wy, iy, tmp) {
  for (let y = 0; y < dh; y++) {
    for (let m = 0; m < 4; m++) {
      const zeile = iy[y * 4 + m] * sw, off = m * dw;
      for (let x = 0; x < dw; x++) {
        const o = x * 4;
        tmp[off + x] = wx[o] * src[zeile + ix[o]] + wx[o + 1] * src[zeile + ix[o + 1]]
                     + wx[o + 2] * src[zeile + ix[o + 2]] + wx[o + 3] * src[zeile + ix[o + 3]];
      }
    }
    const a = wy[y * 4], b = wy[y * 4 + 1], c = wy[y * 4 + 2], e = wy[y * 4 + 3];
    const z = y * dw;
    for (let x = 0; x < dw; x++)
      dst[z + x] = a * tmp[x] + b * tmp[dw + x] + c * tmp[2 * dw + x] + e * tmp[3 * dw + x];
  }
}

function feldAnlegen() {
  const mass = Math.min(breite / GW, hoehe / GH);
  kw = GW * mass; kh = GH * mass;
  kx = (breite - kw) / 2; ky = (hoehe - kh) / 2;
  const w = Math.max(8, Math.round(kw * RAUF)), h = Math.max(8, Math.round(kh * RAUF));
  if (w === rW && h === rH) return false;
  rW = w; rH = h;
  for (const k of [hkF, hkL, hkS]) { k.width = w; k.height = h; }
  bild = hcF.createImageData(w, h);
  lichtBild = hcL.createImageData(w, h);
  demR = new Float32Array(w * h); maskeR = new Uint8Array(w * h);
  rock = new Float32Array(w * h); eisD = new Float32Array(w * h);
  flaeche = new Float32Array(w * h); licht = new Float32Array(w * h);
  [wxT, ixT] = crGewichte(4, TD.w, w); [wyT, iyT] = crGewichte(4, TD.h, h);
  [wxE, ixE] = crGewichte(4, EIS.w, w); [wyE, iyE] = crGewichte(4, EIS.h, h);
  tmpT = new Float32Array(w * 4); tmpE = new Float32Array(w * 4);

  // Das DEM haengt nicht an der Zeit — einmal abtasten und behalten. Bilinear,
  // nicht bikubisch: es wird **herunter**gerechnet (760 auf rund 460), und
  // dabei ueberschwingt eine kubische Kurve an der Kueste.
  for (let y = 0; y < h; y++) {
    const fy = (y + 0.5) / h * GH - 0.5;
    const y0 = Math.max(0, Math.min(GH - 2, Math.floor(fy))), ty = Math.max(0, Math.min(1, fy - y0));
    for (let x = 0; x < w; x++) {
      const fx = (x + 0.5) / w * GW - 0.5;
      const x0 = Math.max(0, Math.min(GW - 2, Math.floor(fx))), tx = Math.max(0, Math.min(1, fx - x0));
      const i00 = y0 * GW + x0, i10 = i00 + 1, i01 = i00 + GW, i11 = i01 + 1;
      const m = MASKE[i00] + MASKE[i10] + MASKE[i01] + MASKE[i11];
      const i = y * w + x;
      if (m === 0) { maskeR[i] = 0; demR[i] = 0; continue; }
      // An der Maskenkante nur ueber die gueltigen Nachbarn mitteln, sonst
      // zieht die Null von draussen die Kueste herunter.
      let s = 0, g = 0;
      const nimm = (idx, gew) => { if (MASKE[idx]) { s += DEM[idx] * gew; g += gew; } };
      nimm(i00, (1 - tx) * (1 - ty)); nimm(i10, tx * (1 - ty));
      nimm(i01, (1 - tx) * ty); nimm(i11, tx * ty);
      demR[i] = g > 0 ? s / g : 0;
      maskeR[i] = m === 4 ? 2 : 1;      // 2 = ganz drin, 1 = Randzelle
    }
  }
  return true;
}

/* ---------- Was in der Zeit dazwischen steht ----------
   **Linear**, und das ist eine inhaltliche Entscheidung, keine Bequemlichkeit.
   Die Vorlage rechnet mit einer monotonen kubischen Kurve, weil ihre Zaehlungen
   bis zu 39 Jahre auseinanderliegen und die Geschwindigkeit an jeder von ihnen
   um 74 Prozent sprang. Hier sind die Schritte gleichmaessig — 1 ka, dann
   0,5 ka —, der Knick ist klein, und der Preis einer Kurve waere, dass sie
   zwischen zwei Datenpunkten etwas behauptet. Das ist eine Rekonstruktion,
   keine Simulation. */
const tdJetzt = new Float32Array(TD.w * TD.h);
const eisJetzt = new Float32Array(EIS.w * EIS.h);
function zeitFelder() {
  const a = abschnitt, b = Math.min(NT - 1, a + 1), u = uAbschnitt;
  const A = TD.s[a], B = TD.s[b];
  for (let i = 0; i < tdJetzt.length; i++) tdJetzt[i] = A[i] + (B[i] - A[i]) * u;
  const C = EIS.s[a], E = EIS.s[b];
  for (let i = 0; i < eisJetzt.length; i++) eisJetzt[i] = C[i] + (E[i] - C[i]) * u;
}

/* ---------- Die Paläotopographie ----------
       Oberflaeche(t) = modernes DEM + Topo_Diff(t)
       Gestein(t)     = Oberflaeche(t) − Eismaechtigkeit(t)
   Das feine DEM traegt die Berge, das grobe Differenzfeld nur die Krustenlage,
   den Meeresspiegel — **und das Eis**. Letzteres ist die eine Stelle, an der
   die naheliegende Rechnung falsch ist: ICE-6G_Cs Topo ist die Hoehe der
   Oberflaeche, nicht die des Fels, und Topo_Diff erbt das. Ueber dem
   Bottnischen Meerbusen steht bei 21 ka Topo_Diff = +1845 m bei 2374 m Eis.
   Wer addiert, statt abzuziehen, bekommt ein Gebirge aus Fels, wo ein
   Eisschild ueber eingedrueckter Kruste liegt — und zwar eines, das plausibel
   aussieht. Gemessen wird das in quellen.py, Probe 1b.

   So bleiben Alpen, Skandinavisches Gebirge, Karpaten und Mittelgebirge in
   voller Aufloesung, waehrend sich Kruste, Kueste und Eisrand mitbewegen. */
let feldStand = 0;
function paleo() {
  feldStand++;
  zeitFelder();
  hochrechnen(tdJetzt, TD.w, TD.h, rock, rW, rH, wxT, ixT, wyT, iyT, tmpT);
  hochrechnen(eisJetzt, EIS.w, EIS.h, eisD, rW, rH, wxE, ixE, wyE, iyE, tmpE);
  for (let i = 0; i < rock.length; i++) {
    if (eisD[i] < 0) eisD[i] = 0;
    flaeche[i] = rock[i] + demR[i];   // DEM + Topo_Diff = Oberflaeche
    /* ---- nur aufliegendes Eis ----
       Das grobe stgit-Feld wird bikubisch hochgerechnet und laeuft dabei ueber
       den Eisrand hinaus aufs offene Meer; ohne Schranke stuende bei 21 ka auf
       5 bis 9 Prozent der Eiszellen eine Eisoberflaeche **unter** dem
       Meeresspiegel, die tiefste 2,8 km darunter.

       Die Schranke ist keine Geschmacksfrage. Aufliegendes Eis der Maechtig-
       keit H auf einem Grund b < 0 haelt sich nur, solange es nicht aufschwimmt:
       H >= (rho_w/rho_i)*(-b) = 1,09*(-b). Seine Oberflaeche liegt dann bei
       b + H >= -0,09*b, also **immer ueber Null**. Eine Eisoberflaeche unter
       dem Meeresspiegel kann es nicht geben; was hier wegfaellt, ist
       ausschliesslich der Ueberlauf der Interpolation. */
    if (flaeche[i] <= 0) eisD[i] = 0;
    rock[i] = flaeche[i] - eisD[i];   // der Fels liegt darunter
  }
}

/* ================================================================ Das Licht
   Lambert von oben links, und **in die Farbe gerechnet** statt als graues Bild
   darueber gelegt. Der Grund ist der teuerste Fehler, den die Vorlage gemacht
   und behoben hat: soft-light enthaelt den Faktor C(1-C), und der ist bei
   Weiss null — weiches Licht kann Weiss nicht dunkler machen. Auf einem
   Eisschild, dessen Oberflaeche fast weiss ist, waere davon **gar nichts** zu
   sehen. */
const SONNE = 40, WURFSONNE = 16, UEBERHOEHT = 0.0016;
const STAERKE = 1.55, AUFHELLEN = 0.55, ABDUNKELN = 0.70;
const MULDE = 0.55, WURF = 0.30, LICHTHUB = 1.7, SCHATTENHUB = 0.6;
const HELLMAX = 0.55, DUNKELMAX = 0.55;
let schattenF = null, weitF = null, kastA = null, kastB = null;

function kastenX(a, b, r, w, h) {
  const f = 1 / (2 * r + 1);
  for (let y = 0; y < h; y++) {
    const z = y * w; let s = 0;
    for (let x = -r; x <= r; x++) s += a[z + (x < 0 ? 0 : x > w - 1 ? w - 1 : x)];
    for (let x = 0; x < w; x++) {
      b[z + x] = s * f;
      const ein = x + r + 1, aus = x - r;
      s += a[z + (ein > w - 1 ? w - 1 : ein)] - a[z + (aus < 0 ? 0 : aus)];
    }
  }
}
function kastenY(a, b, r, w, h) {
  const f = 1 / (2 * r + 1);
  for (let x = 0; x < w; x++) {
    let s = 0;
    for (let y = -r; y <= r; y++) s += a[(y < 0 ? 0 : y > h - 1 ? h - 1 : y) * w + x];
    for (let y = 0; y < h; y++) {
      b[y * w + x] = s * f;
      const ein = y + r + 1, aus = y - r;
      s += a[(ein > h - 1 ? h - 1 : ein) * w + x] - a[(aus < 0 ? 0 : aus) * w + x];
    }
  }
}

function lichtRechnen() {
  const n = rW * rH;
  if (!schattenF || schattenF.length !== n) {
    schattenF = new Float32Array(n); weitF = new Float32Array(n);
    kastA = new Float32Array(n); kastB = new Float32Array(n);
  }
  // Die weite Umgebung, fuer die Mulde. Kastenfilter mit laufender Summe:
  // kostet je Bildpunkt dasselbe, egal wie breit er ist.
  const r = Math.max(3, Math.round(rW / 14));
  kastenX(flaeche, kastB, r, rW, rH); kastenY(kastB, kastA, r, rW, rH);
  kastenX(kastA, kastB, r, rW, rH); kastenY(kastB, weitF, r, rW, rH);

  /* Schlagschatten in einem Durchgang. Das Licht kommt aus genau 45 Grad von
     oben links, also laufen die Strahlen diagonal, und je Diagonale genuegt
     ein mitgefuehrter Horizont. Die Sonne steht dabei **flacher** als bei der
     Schattierung: ein Strahl, der steiler abfaellt als der Hang selbst, trifft
     nie auf Schatten. Kartenzeichner trennen die beiden Lichter seit jeher. */
  const ABFALL = Math.SQRT2 * Math.tan(Math.PI * WURFSONNE / 180) / UEBERHOEHT;
  for (let k = 0; k < rW + rH - 1; k++) {
    let x = k < rW ? k : 0, y = k < rW ? 0 : k - rW + 1, s = -1e9;
    while (x < rW && y < rH) {
      const i = y * rW + x;
      s -= ABFALL;
      if (flaeche[i] >= s) { s = flaeche[i]; schattenF[i] = 0; }
      else schattenF[i] = (s - flaeche[i]) * UEBERHOEHT;
      x++; y++;
    }
  }

  const hochL = Math.cos(Math.PI * SONNE / 180) * Math.SQRT1_2;
  const lx = -hochL, ly = -hochL, lz = Math.sin(Math.PI * SONNE / 180);
  for (let y = 0; y < rH; y++) {
    const zc = y * rW, zo = (y > 0 ? y - 1 : y) * rW, zu = (y < rH - 1 ? y + 1 : y) * rW;
    for (let x = 0; x < rW; x++) {
      const xm = x > 0 ? x - 1 : x, xp = x < rW - 1 ? x + 1 : x;
      const i = zc + x;
      const gx = (flaeche[zc + xp] - flaeche[zc + xm]) * 0.5 * UEBERHOEHT;
      const gy = (flaeche[zu + x] - flaeche[zo + x]) * 0.5 * UEBERHOEHT;
      let I = (-gx * lx - gy * ly + lz) / Math.sqrt(gx * gx + gy * gy + 1) - lz;
      const mulde = (weitF[i] - flaeche[i]) * UEBERHOEHT;
      if (mulde > 0) I -= mulde * MULDE;
      if (schattenF[i] > 0) I -= (schattenF[i] < 0.05 ? schattenF[i] / 0.05 : 1) * WURF;
      let a = I * STAERKE;
      if (a > HELLMAX) a = HELLMAX; else if (a < -DUNKELMAX) a = -DUNKELMAX;
      licht[i] = a;
    }
  }
}

/* ---------- Farbe und Licht in einem Durchgang ----------
   Zwei Materialien, zwei Leitern. Eis gewinnt, wo es liegt; das Gestein
   darunter ist dann nicht mehr zu sehen, und das ist richtig so — man sieht
   ja auch in der Wirklichkeit den Fels unter dem Eis nicht. */
const EISSCHWELLE = 12;                 // Meter, ab denen Eis gezeichnet wird
function farbeRechnen() {
  const fo = bild.data, lo = lichtBild.data;
  for (let i = 0; i < rW * rH; i++) {
    const j = i << 2;
    if (!maskeR[i]) { fo[j + 3] = 0; lo[j + 3] = 0; continue; }
    const eis = eisD[i] >= EISSCHWELLE;
    let r, g, b;
    if (eis) {
      const k = Math.max(0, Math.min(NEIS - 1, Math.floor(eisLeiter(flaeche[i]) * NEIS)));
      r = ER[k]; g = EG[k]; b = EB[k];
    } else {
      const k = Math.max(0, Math.min(NBAND - 1, Math.floor(gesteinLeiter(rock[i]) * NBAND)));
      r = GR[k]; g = GG[k]; b = GB[k];
    }
    const a = licht[i];
    if (a > 0) { r += (255 - r) * a * AUFHELLEN; g += (255 - g) * a * AUFHELLEN; b += (255 - b) * a * AUFHELLEN; }
    else if (a < 0) { const f = 1 + a * ABDUNKELN; r *= f; g *= f; b *= f; }
    fo[j] = r; fo[j + 1] = g; fo[j + 2] = b; fo[j + 3] = 255;
    let L = 128 + (a > 0 ? 127 * a * AUFHELLEN : 128 * a * ABDUNKELN) * LICHTHUB;
    if (schattenF[i] > 0)
      L -= 60 * SCHATTENHUB * (schattenF[i] < 0.05 ? schattenF[i] / 0.05 : 1);
    lo[j] = lo[j + 1] = lo[j + 2] = L < 0 ? 0 : L > 255 ? 255 : L;
    lo[j + 3] = 255;
  }
  hcF.putImageData(bild, 0, 0);
  hcL.putImageData(lichtBild, 0, 0);
}

${hoehenlinien()}
${scheiben()}
${bedienung()}
</script>
</body></html>`;
}

/* ====================================================================== */
/* Die Hoehenlinien. Marching Squares ueber das Feld, die Strecken zu Linien
   verkettet, gezeichnet als weiche Kurve auf der Leinwand selbst — in deren
   voller Aufloesung, nicht in der des Feldes. Beleuchtet nach Tanaka: weiss,
   wo die Kante der Sonne zugewandt ist, schwarz, wo sie wegfaellt.           */
function hoehenlinien() {
  return `
/* ================================================== Hoehenlinien nach Tanaka
   Das Stueck, das die Form wirklich traegt, und die Begruendung ist die der
   Vorlage: **die Flaeche ist schon vergeben.** Sie traegt die Farbe, und die
   Farbe sind die Daten. Eine Schattierung, die stark genug fuer ein Gebirge
   waere, wuesche sie aus. Linien nehmen fast keine Flaeche weg.

   Verfolgt, nicht gemalt: ins Raster gemalt und hochgerechnet blieben sie ein
   Schmier, bei jeder Aufloesung.

   Zwei Durchgaenge, weil zwei Materialien uebereinanderliegen: die
   Gesteinslinien auf den Bandgrenzen der Gesteinsleiter, dort wo kein Eis
   liegt, die Eislinien auf denen der Eisleiter, dort wo welches liegt. Jede
   Hoehenlinie ist damit eine Farbgrenze und jede Farbgrenze traegt ihre Linie
   — genau wie in der Vorlage, nur zweimal. */
const LSCHRITT = 2;
const NSTUFE = 12;
const ZAEHLJEDE = 5;
let hkH = null, hcH = null, linienSchluessel = '';

function niveausGestein() {
  const n = [];
  for (let k = 1; k < NBAND; k++) {
    const u = k / NBAND;
    // Bandgrenze zurueck in Meter
    let m;
    if (u >= WASSER / NBAND) m = (u - WASSER / NBAND) * NBAND / LANDBAND * HOCHMAX;
    else m = -((WASSER / NBAND - u) * NBAND / WASSER) * TIEFMAX;
    n.push({ m, zaehl: k % ZAEHLJEDE === 0, kueste: k === WASSER });
  }
  return n;
}
function niveausEis() {
  const n = [];
  for (let k = 1; k < NEIS; k++) n.push({ m: k * EISSTUFE, zaehl: k % 4 === 0, kueste: false });
  return n;
}
const NIV_G = niveausGestein(), NIV_E = niveausEis();

// Buchhaltung fuer die Verfolgung, einmal angelegt und ueber alle Niveaus und
// alle Bilder wiederbenutzt — mit fortlaufendem Stempel statt Leeren.
let lnx = 0, lny = 0, lStamm = 0;
let kX = null, kY = null, kA = null, kB = null, kStempel = null, kBesucht = null, kListe = null;
let bahnX = null, bahnY = null, bahnF = null;
let stempelZaehler = 0;
function linienFeld() {
  const nx = Math.floor((rW - 1) / LSCHRITT), ny = Math.floor((rH - 1) / LSCHRITT);
  if (nx === lnx && ny === lny && kX) return;
  lnx = nx; lny = ny; lStamm = 2 * (nx + 3);
  const n = lStamm * (ny + 3);
  kX = new Float32Array(n); kY = new Float32Array(n);
  kA = new Int32Array(n); kB = new Int32Array(n);
  kStempel = new Int32Array(n); kBesucht = new Int32Array(n); kListe = new Int32Array(n);
  bahnX = new Float32Array(n); bahnY = new Float32Array(n); bahnF = new Float32Array(n);
}

// Ein Zug je Beleuchtungsstufe: 12 Stufen, hell und dunkel, also 24 Zuege fuer
// die ganze Karte statt zweitausend einzelner Striche.
const LINIENEIMER = Array.from({ length: 4 * NSTUFE }, () => []);

function zieheLinien(zc, feld, niveaus, gilt, fest) {
  linienFeld();
  const S = LSCHRITT, je = kw / rW, nx = lnx, ny = lny;
  for (const e of LINIENEIMER) e.length = 0;
  const holL = (x, y) => licht[Math.max(0, Math.min(rH - 1, y)) * rW + Math.max(0, Math.min(rW - 1, x))];

  for (const niv of niveaus) {
    const t = niv.m;
    const stempel = ++stempelZaehler;
    let nk = 0;
    const setze = (k, x, y) => {
      if (kStempel[k] !== stempel) {
        kStempel[k] = stempel; kX[k] = x; kY[k] = y;
        kA[k] = -1; kB[k] = -1; kBesucht[k] = 0; kListe[nk++] = k;
      }
    };
    const binde = (p, q) => { if (kA[p] < 0) kA[p] = q; else if (kB[p] < 0) kB[p] = q; };
    for (let cy = 0; cy < ny; cy++) {
      for (let cx = 0; cx < nx; cx++) {
        const px0 = cx * S, px1 = px0 + S, py0 = cy * S, py1 = py0 + S;
        const i0 = py0 * rW + px0, i1 = py0 * rW + px1, i2 = py1 * rW + px1, i3 = py1 * rW + px0;
        // Eine Zelle, deren Ecken nicht alle gelten, wird uebersprungen. Das
        // erspart das Beschneiden und laesst der Kueste einen schmalen,
        // linienfreien Saum — der sieht ohnehin besser aus.
        if (!gilt(i0) || !gilt(i1) || !gilt(i2) || !gilt(i3)) continue;
        const a = feld[i0], b = feld[i1], c = feld[i2], d = feld[i3];
        const A = a > t, B = b > t, C = c > t, E = d > t;
        const kaCode = (A ? 1 : 0) | (B ? 2 : 0) | (C ? 4 : 0) | (E ? 8 : 0);
        if (kaCode === 0 || kaCode === 15) continue;
        const X0 = kx + px0 * je, Y0 = ky + py0 * je, SS = S * je;
        const h0 = (cy + 1) * lStamm + 2 * (cx + 1), h2 = (cy + 2) * lStamm + 2 * (cx + 1);
        const v3 = h0 + 1, v1 = (cy + 1) * lStamm + 2 * (cx + 2) + 1;
        if (A !== B) setze(h0, X0 + SS * (t - a) / (b - a), Y0);
        if (B !== C) setze(v1, X0 + SS, Y0 + SS * (t - b) / (c - b));
        if (E !== C) setze(h2, X0 + SS * (t - d) / (c - d), Y0 + SS);
        if (A !== E) setze(v3, X0, Y0 + SS * (t - a) / (d - a));
        switch (kaCode) {
          case 1: case 14: binde(v3, h0); binde(h0, v3); break;
          case 2: case 13: binde(h0, v1); binde(v1, h0); break;
          case 3: case 12: binde(v3, v1); binde(v1, v3); break;
          case 4: case 11: binde(v1, h2); binde(h2, v1); break;
          case 6: case 9: binde(h0, h2); binde(h2, h0); break;
          case 7: case 8: binde(h2, v3); binde(v3, h2); break;
          default: binde(v3, h0); binde(h0, v3); binde(v1, h2); binde(h2, v1);
        }
      }
    }
    // Verketten: erst die offenen Ketten, dann die geschlossenen Ringe.
    for (let runde = 0; runde < 2; runde++) {
      for (let q = 0; q < nk; q++) {
        const start = kListe[q];
        if (kBesucht[start] === stempel) continue;
        if (runde === 0 && kA[start] >= 0 && kB[start] >= 0) continue;
        let cur = start, vor = -1, m = 0;
        while (cur >= 0) {
          kBesucht[cur] = stempel;
          bahnX[m] = kX[cur]; bahnY[m] = kY[cur];
          bahnF[m] = holL(Math.round((kX[cur] - kx) / je), Math.round((kY[cur] - ky) / je));
          m++;
          const na = kA[cur], nb = kB[cur];
          const w = (na >= 0 && na !== vor && kBesucht[na] !== stempel) ? na
                  : (nb >= 0 && nb !== vor && kBesucht[nb] !== stempel) ? nb : -1;
          vor = cur; cur = w;
        }
        if (m > 2) { if (fest) festMalen(zc, m); else ablegen(m, niv.zaehl, niv.kueste); }
      }
    }
  }
  if (!fest) malen(zc);
}

function festMalen(zc, m) {
  zc.beginPath();
  zc.moveTo(bahnX[0], bahnY[0]);
  for (let i = 1; i < m; i++) zc.lineTo(bahnX[i], bahnY[i]);
  zc.stroke();
}

// Auf der fertigen Kette wird die Beleuchtung **laengs geglaettet** — zwei
// Durchgaenge eines Dreipunktmittels —, dann wird die Linie in Laeufe gleicher
// Staerke zerlegt, die sich um eine Stuetzstelle ueberlappen.
function ablegen(m, zaehl, kueste) {
  for (let d = 0; d < 2; d++) {
    let vor = bahnF[0];
    for (let i = 1; i < m - 1; i++) {
      const s = (vor + bahnF[i] + bahnF[i + 1]) / 3;
      vor = bahnF[i]; bahnF[i] = s;
    }
  }
  let lauf = -1, ab = 0;
  for (let i = 0; i < m; i++) {
    const f = Math.max(-1, Math.min(1, bahnF[i] / DUNKELMAX));
    let s = Math.min(NSTUFE - 1, Math.floor(Math.abs(f) * NSTUFE));
    const idx = (f >= 0 ? 0 : 1) * 2 * NSTUFE + (zaehl ? NSTUFE : 0) + s;
    if (idx !== lauf) {
      if (lauf >= 0 && i - ab > 1) {
        const seg = new Float32Array((i - ab + 1) * 2);
        for (let k = ab; k <= i && k < m; k++) { seg[(k - ab) * 2] = bahnX[k]; seg[(k - ab) * 2 + 1] = bahnY[k]; }
        LINIENEIMER[lauf].push({ seg, kueste });
      }
      lauf = idx; ab = Math.max(0, i - 1);
    }
  }
  if (lauf >= 0 && m - ab > 1) {
    const seg = new Float32Array((m - ab) * 2);
    for (let k = ab; k < m; k++) { seg[(k - ab) * 2] = bahnX[k]; seg[(k - ab) * 2 + 1] = bahnY[k]; }
    LINIENEIMER[lauf].push({ seg, kueste });
  }
}

const LINIE = 0.7, ZAEHLSTARK = 1.6, KUESTESTARK = 2.1;
function malen(zc) {
  zc.lineCap = 'round'; zc.lineJoin = 'round';
  for (let idx = 0; idx < LINIENEIMER.length; idx++) {
    const eimer = LINIENEIMER[idx];
    if (!eimer.length) continue;
    const dunkel = idx >= 2 * NSTUFE;
    const rest = idx % (2 * NSTUFE);
    const zaehl = rest >= NSTUFE;
    const s = rest % NSTUFE;
    const staerke = (s + 0.5) / NSTUFE;
    zc.strokeStyle = dunkel ? 'rgba(0,0,0,' + (0.15 + 0.7 * staerke).toFixed(3) + ')'
                            : 'rgba(255,255,255,' + (0.12 + 0.62 * staerke).toFixed(3) + ')';
    for (const { seg, kueste } of eimer) {
      zc.lineWidth = LINIE * (kueste ? KUESTESTARK : zaehl ? ZAEHLSTARK : 1);
      zc.beginPath();
      zc.moveTo(seg[0], seg[1]);
      for (let i = 1; i < seg.length / 2; i++) zc.lineTo(seg[i * 2], seg[i * 2 + 1]);
      zc.stroke();
    }
  }
}

/* ---------- Der Eisrand, wie ICE-6G_C ihn hat ----------
   Eine Linie auf der Schwelle der Eismaechtigkeit. Sie gehoert nicht zu den
   drei DATED-Linien und darf deshalb nicht wie sie aussehen: neutral und
   duenn, nicht orange. Ohne sie steht das Eis als weisse Flaeche ohne Kante
   auf dem Gestein — und der Betrachter haelt die orange Linie fuer den Rand
   des gezeichneten Eises, was sie nicht ist. Die eine ist Modell, die andere
   Datierung, und wo sie auseinanderlaufen, ist das der Befund. */
function eisrandUeber(zc) {
  zc.save();
  zc.strokeStyle = 'rgba(120,150,175,.85)';
  zc.lineWidth = 0.9;
  zieheLinien(zc, eisD, [{ m: EISSCHWELLE, zaehl: false, kueste: false }],
    i => maskeR[i] === 2, true);
  zc.restore();
}

function linienUeber(zc) {
  const istEis = i => eisD[i] >= EISSCHWELLE;
  const frei = i => maskeR[i] === 2 && !istEis(i);
  const drauf = i => maskeR[i] === 2 && istEis(i);
  zieheLinien(zc, rock, NIV_G, frei);
  zc.globalAlpha = 0.85;
  zieheLinien(zc, flaeche, NIV_E, drauf);
  zc.globalAlpha = 1;
  eisrandUeber(zc);
}
`;
}

/* ====================================================================== */
/* Die Schraegsicht als Laserschnittmodell und das Unsicherheitsband.       */
function scheiben() {
  return `
/* ============================================ Aufrichten: ein Stapel Scheiben
   Dasselbe Feld, aus dem Farbe, Schattierung und Hoehenlinien kommen, wird
   nicht mehr platt hingelegt, sondern schraeg angesehen. Gerechnet als
   Laserschnittmodell: das Feld wird in so viele Hoehen geschnitten, wie es
   Baender gibt, von jeder die Flaeche genommen, die mindestens so hoch liegt,
   und die Flaechen werden versetzt uebereinandergelegt.

   Eine Scheibe ist ein **Umriss**, keine Maske. Gemessen in der Vorlage:
   Pfade beschneiden 0,1 ms, derselbe Stapel als Rastermasken 242 ms. */
let NEIGUNG = 0, DREHUNG = 0, ZOOM = 1, vX = 0, vY = 0;
const KIPPMAX = 62 * Math.PI / 180, ZOOMMAX = 8;
const HOCH3D = 0.30;
const schraeg = () => NEIGUNG > 0.001 || Math.abs(DREHUNG) > 1e-4;
const ansichtFrei = () => ZOOM !== 1 || vX !== 0 || vY !== 0;
let SICHT = null;
let BAND = true;

// Die Scheiben liegen auf **absoluten Hoehen**, damit der Rahmen feststeht.
// Nach dem hoechsten Punkt zu rechnen, der gerade dasteht, waere verlockend —
// und dann schrumpfte die Karte in dem Mass, in dem der Eisschild waechst.
// Zwei Bilder waeren nicht mehr vergleichbar, und genau dafuer ist sie gebaut.
const NSCHEIBE = 26;
const S_VON = -1000, S_BIS = 3800;      // Meter, fester Rahmen ueber alle Zeiten
const dzM = (S_BIS - S_VON) / NSCHEIBE;

function sichtRechnen() {
  const phi = NEIGUNG * KIPPMAX, co = Math.cos(phi), si = Math.sin(phi);
  const ct = Math.cos(DREHUNG), st = -Math.sin(DREHUNG);
  const cx = breite / 2, cy = hoehe / 2, hoch = hoehe * HOCH3D;
  let aMin = 1e9, aMax = -1e9, yMin = 1e9, yMax = -1e9;
  for (const e of [[0, 0], [breite, 0], [0, hoehe], [breite, hoehe]]) {
    const dx = e[0] - cx, dy = e[1] - cy;
    const a = dx * ct + dy * st, b = -dx * st + dy * ct;
    if (a < aMin) aMin = a; if (a > aMax) aMax = a;
    const y0 = b * co, y1 = b * co - hoch * si;
    if (y1 < yMin) yMin = y1; if (y0 > yMax) yMax = y0;
  }
  const rand = 2;
  const z = Math.min((breite - 2 * rand) / Math.max(1e-6, aMax - aMin),
                     (hoehe - 2 * rand) / Math.max(1e-6, yMax - yMin));
  const oX = rand + (breite - 2 * rand - (aMax - aMin) * z) / 2 - aMin * z;
  const oY = rand + (hoehe - 2 * rand - (yMax - yMin) * z) / 2 - yMin * z;
  const zz = z * ZOOM, ozX = oX * ZOOM + vX, ozY = oY * ZOOM + vY;
  SICHT = { co, si, ct, st, cx, cy, hoch, z: zz, oX: ozX, oY: ozY,
            dz: hoch * si * zz / NSCHEIBE };
  return SICHT;
}
function bodenUnter(sx, sy) {
  if (!schraeg()) return [(sx - vX) / ZOOM, (sy - vY) / ZOOM];
  const S = SICHT || sichtRechnen();
  const u = (sx - S.oX) / S.z, v = (sy - S.oY) / (S.co * S.z);
  return [S.cx + S.ct * u - S.st * v, S.cy + S.st * u + S.ct * v];
}
function bodenAuf(X, Y) {
  if (!schraeg()) return [X * ZOOM + vX, Y * ZOOM + vY];
  const S = SICHT || sichtRechnen();
  const dx = X - S.cx, dy = Y - S.cy;
  const a = dx * S.ct + dy * S.st, b = -dx * S.st + dy * S.ct;
  return [a * S.z + S.oX, b * S.co * S.z + S.oY];
}

// Umrisse der Scheiben, mit demselben Marching Squares wie die Hoehenlinien.
// Das Gitter bekommt einen Rand aus Nullen, damit jeder Ring sich schliesst —
// offene Linien lassen sich nicht als Flaeche beschneiden.
let rnx = 0, rny = 0, rX = null, rY = null, rA = null, rB = null,
    rStempel = null, rBesucht = null, rListe = null, rStamm = 0, rZaehler = 0;
function ringFeld() {
  const nx = Math.floor((rW - 1) / LSCHRITT), ny = Math.floor((rH - 1) / LSCHRITT);
  if (nx === rnx && ny === rny && rX) return;
  rnx = nx; rny = ny; rStamm = 2 * (nx + 3);
  const n = rStamm * (ny + 3);
  rX = new Float32Array(n); rY = new Float32Array(n);
  rA = new Int32Array(n); rB = new Int32Array(n);
  rStempel = new Int32Array(n); rBesucht = new Int32Array(n); rListe = new Int32Array(n);
}
let ringeCache = null, ringeStand = -1, ringeRW = 0;
function scheibenRinge() {
  if (ringeCache && ringeStand === feldStand && ringeRW === rW) return ringeCache;
  ringFeld();
  const S = LSCHRITT, je = kw / rW, nx = rnx, ny = rny;
  const ecke = (px, py) => {
    if (px < 0 || py < 0 || px >= rW || py >= rH) return -1e9;
    const i = py * rW + px;
    return maskeR[i] ? flaeche[i] : -1e9;
  };
  const pfade = new Array(NSCHEIBE).fill(null);
  for (let k = 1; k < NSCHEIBE; k++) {
    const t = S_VON + k * dzM;
    const stempel = ++rZaehler;
    let nk = 0;
    const setze = (idx, x, y) => {
      if (rStempel[idx] !== stempel) {
        rStempel[idx] = stempel; rX[idx] = x; rY[idx] = y;
        rA[idx] = -1; rB[idx] = -1; rBesucht[idx] = 0; rListe[nk++] = idx;
      }
    };
    const binde = (p, q) => { if (rA[p] < 0) rA[p] = q; else if (rB[p] < 0) rB[p] = q; };
    for (let cy = -1; cy <= ny; cy++) {
      for (let cx = -1; cx <= nx; cx++) {
        const px0 = cx * S, px1 = px0 + S, py0 = cy * S, py1 = py0 + S;
        const a = ecke(px0, py0), b = ecke(px1, py0), c = ecke(px1, py1), d = ecke(px0, py1);
        const A = a > t, B = b > t, C = c > t, E = d > t;
        const code = (A ? 1 : 0) | (B ? 2 : 0) | (C ? 4 : 0) | (E ? 8 : 0);
        if (code === 0 || code === 15) continue;
        const X0 = kx + px0 * je, Y0 = ky + py0 * je, SS = S * je;
        const h0 = (cy + 1) * rStamm + 2 * (cx + 1), h2 = (cy + 2) * rStamm + 2 * (cx + 1);
        const v3 = h0 + 1, v1 = (cy + 1) * rStamm + 2 * (cx + 2) + 1;
        if (A !== B) setze(h0, X0 + SS * (t - a) / (b - a), Y0);
        if (B !== C) setze(v1, X0 + SS, Y0 + SS * (t - b) / (c - b));
        if (E !== C) setze(h2, X0 + SS * (t - d) / (c - d), Y0 + SS);
        if (A !== E) setze(v3, X0, Y0 + SS * (t - a) / (d - a));
        switch (code) {
          case 1: case 14: binde(v3, h0); binde(h0, v3); break;
          case 2: case 13: binde(h0, v1); binde(v1, h0); break;
          case 3: case 12: binde(v3, v1); binde(v1, v3); break;
          case 4: case 11: binde(v1, h2); binde(h2, v1); break;
          case 6: case 9: binde(h0, h2); binde(h2, h0); break;
          case 7: case 8: binde(h2, v3); binde(v3, h2); break;
          default: binde(v3, h0); binde(h0, v3); binde(v1, h2); binde(h2, v1);
        }
      }
    }
    const pfad = new Path2D();
    let etwas = false;
    for (let q = 0; q < nk; q++) {
      const start = rListe[q];
      if (rBesucht[start] === stempel) continue;
      let cur = start, vor = -1, m = 0;
      while (cur >= 0) {
        rBesucht[cur] = stempel;
        if (m === 0) pfad.moveTo(rX[cur], rY[cur]); else pfad.lineTo(rX[cur], rY[cur]);
        m++;
        const na = rA[cur], nb = rB[cur];
        const w = (na >= 0 && na !== vor && rBesucht[na] !== stempel) ? na
                : (nb >= 0 && nb !== vor && rBesucht[nb] !== stempel) ? nb : -1;
        vor = cur; cur = w;
      }
      if (m > 2) { pfad.closePath(); etwas = true; }
    }
    if (etwas) pfade[k] = pfad;
  }
  ringeCache = pfade; ringeStand = feldStand; ringeRW = rW;
  return pfade;
}

/* Die Farbe einer Platte: **eine**, denn eine Platte ist genau eine Hoehenstufe.
   Vorher wurde die fertige Karte hineinbeschnitten, und weil die Farbe auf dem
   groeberen Gitter entsteht, blutete auf jeder Platte ein Saum der Nachbarfarbe
   ueber den Rand. Welche Leiter — Gestein oder Eis — entscheidet, ob auf dieser
   Hoehe ueberwiegend Eis liegt. */
/* Welche Leiter eine Platte traegt — Gestein oder Eis —, entscheidet, was auf
   ihrer Hoehe ueberwiegt. Gezaehlt wird das in **einem** Durchgang ueber das
   Feld, nicht in einem je Scheibe: der erste Wurf lief sechsundzwanzigmal
   ueber die ganze Karte und kostete mehr als der ganze Stapel. */
const plattenEis = new Int32Array(NSCHEIBE), plattenFels = new Int32Array(NSCHEIBE);
function plattenZaehlen() {
  plattenEis.fill(0); plattenFels.fill(0);
  for (let i = 0; i < rW * rH; i++) {
    if (!maskeR[i]) continue;
    const k = Math.floor((flaeche[i] - S_VON) / dzM);
    if (k < 0 || k >= NSCHEIBE) continue;
    if (eisD[i] >= EISSCHWELLE) plattenEis[k]++; else plattenFels[k]++;
  }
}
function plattenFarbe(k) {
  const t = S_VON + k * dzM;
  if (plattenEis[k] > plattenFels[k]) {
    const j = Math.max(0, Math.min(NEIS - 1, Math.floor(eisLeiter(t) * NEIS)));
    return [ER[j], EG[j], EB[j]];
  }
  const j = Math.max(0, Math.min(NBAND - 1, Math.floor(gesteinLeiter(t) * NBAND)));
  return [GR[j], GG[j], GB[j]];
}

const WANDDUNKEL = 0.78, WANDFUSS = 0.55, WANDSCHRITT = 3;
/* Die Sicheln der beleuchteten Kante sind absichtlich **nicht** ganz deckend:
   gerade das laesst die Bandfarbe durchscheinen, statt sie zu ueberblenden.
   Der erste Wurf stand auf 0,85/0,75 und uebertoente den Eisschild — bei 26
   Scheiben liegen die Kanten dort dichter als die Terrassen breit sind. */
const KANTENVERSATZ = 0.55, KANTENZOOM = 4, KANTENHELL = 0.62, KANTENDUNKEL = 0.58;
function scheibenMalen() {
  const Dp = DPR;
  const S = sichtRechnen();
  const { co, si, ct, st, cx, cy, z: zz, oX: ozX, oY: ozY, dz } = S;
  const ringe = scheibenRinge();
  plattenZaehlen();
  const a2 = Dp * zz * ct, c2 = Dp * zz * st, b2 = -Dp * co * zz * st, d2 = Dp * co * zz * ct;
  const eX = Dp * ozX - a2 * cx - c2 * cy;
  const lv = KANTENVERSATZ * Math.min(KANTENZOOM, ZOOM) / zz * breite / rW;

  for (let k = 1; k < NSCHEIBE; k++) {
    if (!ringe[k]) continue;
    const [r, g, b] = plattenFarbe(k);
    const wand = 'rgb(' + Math.round(r * WANDDUNKEL) + ',' + Math.round(g * WANDDUNKEL) + ',' + Math.round(b * WANDDUNKEL) + ')';
    const fuss = 'rgb(' + Math.round(r * WANDFUSS) + ',' + Math.round(g * WANDFUSS) + ',' + Math.round(b * WANDFUSS) + ')';
    /* Erst die Wand: derselbe Ring, eine Stufe tiefer, gefuellt — und
       **gestrichen statt gesprungen**. Ein einzelner Abzug laesst nur den
       unteren Saum der Form stehen, und der ist so hoch wie die Form auf dem
       Schirm, nicht wie die Platte. Gekippt staucht der Kosinus sie zusammen,
       und der Rest bliebe schwarz — die Kuppen schwebten. */
    const schritte = Math.max(1, Math.ceil(Dp * dz / WANDSCHRITT));
    for (let w = 0; w < schritte; w++) {
      ctx.fillStyle = (w === 0 && schritte > 1) ? fuss : wand;
      ctx.setTransform(a2, b2, c2, d2, eX,
        Dp * (ozY - (k - 1 + w / schritte) * dz) - b2 * cx - d2 * cy);
      ctx.fill(ringe[k], 'evenodd');
    }
    /* Die beleuchtete Kante mit dem alten Praegetrick: derselbe Ring zweimal
       versetzt gefuellt, weiss zum Licht und schwarz von ihm weg, dann die
       Bandfarbe darueber, die von beiden die innere Haelfte zudeckt. Wo die
       Kante laengs zum Licht laeuft, verschwinden beide von selbst — genau wie
       bei Tanaka. Versetzt wird in Grundriss-Koordinaten, damit die Sonne beim
       Drehen mit der Karte wandert. */
    ctx.setTransform(a2, b2, c2, d2, eX, Dp * (ozY - k * dz) - b2 * cx - d2 * cy);
    ctx.save();
    ctx.translate(-lv, -lv);
    ctx.fillStyle = '#fff'; ctx.globalAlpha = KANTENHELL; ctx.fill(ringe[k], 'evenodd');
    ctx.translate(2 * lv, 2 * lv);
    ctx.fillStyle = '#000'; ctx.globalAlpha = KANTENDUNKEL; ctx.fill(ringe[k], 'evenodd');
    ctx.translate(-lv, -lv);
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
    ctx.fill(ringe[k], 'evenodd');
    ctx.restore();
  }
  ctx.setTransform(Dp, 0, 0, Dp, 0, 0);

  /* Das Licht als eigene Ebene, im Feldgitter gebaut und **einmal** fertig
     hochgelegt. Je Scheibe aufgelegt kostete es so viel wie vorher die ganze
     Textur — die Kosten sitzen in den Blits, nicht im Bild. Unscharf wird dabei
     nur das Licht; Farbe, Kanten und Waende bleiben scharf. */
  hcS.setTransform(1, 0, 0, 1, 0, 0);
  hcS.clearRect(0, 0, rW, rH);
  // Der Lichtstapel liegt im Feldgitter. Die Karte beginnt dort bei (0,0),
  // auf der Leinwand aber bei (kx,ky) — der Versatz muss also heraus, bevor
  // skaliert wird, sonst sitzt das Licht neben seinem Gelaende.
  const f = rW / kw;
  const A2 = f * zz * ct, C2 = f * zz * st, B2 = -f * co * zz * st, D2 = f * co * zz * ct;
  const EX = f * (ozX - kx) - A2 * cx - C2 * cy;
  for (let k = 1; k < NSCHEIBE; k++) {
    if (!ringe[k]) continue;
    for (const tief of [k - 1, k]) {
      hcS.save();
      hcS.setTransform(A2, B2, C2, D2, EX, f * (ozY - ky - tief * dz) - B2 * cx - D2 * cy);
      hcS.beginPath();
      hcS.clip(ringe[k], 'evenodd');
      hcS.setTransform(1, 0, 0, 1, 0, 0);
      hcS.drawImage(hkL, 0, 0);
      hcS.restore();
    }
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'soft-light';
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(hkS, 0, 0, cv.width, cv.height);
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
}

/* ====================================================== Das Unsicherheitsband
   Die drei DATED-1-Linien. Das Band zwischen maximum und minimum ist **kein
   Deko-Element, es ist die Kernaussage**: wo es breit wird, ist die
   Rekonstruktion schwach.

   Gezeichnet wird es als Flaeche zwischen den beiden Linien — und weil beide
   geschlossene Umrisse sind, geht das mit der Nichtnull-Regel: maximum fuellen,
   minimum mit 'evenodd' wieder herausnehmen. */
const BANDFARBE = 'rgba(255,214,150,.17)';
const MCFARBE = 'rgba(255,226,178,.95)';
const RANDFARBE = 'rgba(255,214,150,.42)';

function datedBei(kaJetzt) {
  // Die Raender gibt es nur alle 1 000 Jahre und nur von 25 bis 10 ka. Dazwischen
  // wird **nicht** interpoliert: eine Linie, die zwischen zwei Rekonstruktionen
  // schwebt, waere eine Behauptung, die niemand aufgestellt hat. Gezeigt wird
  // die naechstgelegene, und wie weit sie weg ist, steht im Ticker.
  if (kaJetzt > DATED_KA[DATED_KA.length - 1] + 0.5 || kaJetzt < DATED_KA[0] - 0.5) return null;
  let best = null, dist = 1e9;
  for (const k of DATED_KA) {
    const d = Math.abs(k - kaJetzt);
    if (d < dist) { dist = d; best = k; }
  }
  return dist <= 0.5 ? { ka: best, d: dist } : null;
}

/* Ein Segment, das auf dem Fensterrand liegt, ist kein Eisrand — es ist die
   Schnittkante, an der quellen.py den Ring auf den Ausschnitt beschnitten hat.
   Gefuellt wird der Ring trotzdem geschlossen (sonst fehlte das Band), gezogen
   wird die Schnittkante nicht. */
const RANDEPS = 0.01;
function aufRand(ax, ay, bx, by) {
  return (Math.abs(ax) < RANDEPS && Math.abs(bx) < RANDEPS)
    || (Math.abs(ax - GW) < RANDEPS && Math.abs(bx - GW) < RANDEPS)
    || (Math.abs(ay) < RANDEPS && Math.abs(by) < RANDEPS)
    || (Math.abs(ay - GH) < RANDEPS && Math.abs(by - GH) < RANDEPS);
}
function bandPfad(linien, ohneRand) {
  const p = new Path2D();
  for (const [xs, ys] of linien) {
    const n = xs.length;
    let erst = true;
    for (let i = 0; i < n; i++) {
      const [sx, sy] = projRand(xs[i], ys[i]);
      const j = (i + n - 1) % n;
      if (erst || (ohneRand && aufRand(xs[j], ys[j], xs[i], ys[i]))) {
        p.moveTo(sx, sy); erst = false;
      } else p.lineTo(sx, sy);
    }
    if (!ohneRand) p.closePath();
    else if (!aufRand(xs[n - 1], ys[n - 1], xs[0], ys[0])) {
      const [sx, sy] = projRand(xs[0], ys[0]);
      p.lineTo(sx, sy);
    }
  }
  return p;
}
// Gitterkoordinaten der Nutzlast -> Bildschirm. Das Gitter ist dasselbe wie das
// der Karte, also erst auf Leinwandmass, dann durch dieselbe Abbildung wie das
// Gelaende.
function projGitter(gx, gy) {
  return bodenAuf(kx + gx / GW * kw, ky + gy / GH * kh);
}
/* Gekippt muss ein Eisrand auf der **Oberflaeche** liegen, nicht auf dem Boden.
   Auf dem Boden gezeichnet haengt er unter dem Eisschild, den er begrenzt —
   geometrisch richtig fuer eine Bodenmarke, als Karte aber unlesbar: die Linie
   sagt ja gerade, wo die weisse Flaeche aufhoert. Also wird sie um dieselbe
   Zahl Scheiben angehoben, um die der Stapel an dieser Stelle aufragt. */
function projRand(gx, gy) {
  const [sx, sy] = projGitter(gx, gy);
  if (!schraeg()) return [sx, sy];
  const fx = Math.max(0, Math.min(rW - 1, Math.round(gx / GW * rW)));
  const fy = Math.max(0, Math.min(rH - 1, Math.round(gy / GH * rH)));
  const i = fy * rW + fx;
  if (!maskeR[i]) return [sx, sy];
  const k = Math.max(0, Math.min(NSCHEIBE - 1, (flaeche[i] - S_VON) / dzM));
  return [sx, sy - k * (SICHT || sichtRechnen()).dz];
}

/* ---------- Die Silhouette ----------
   Die gezeichnete Flaeche ist keine Rechteckflaeche, sondern das Fenster unter
   dieser Projektion: oben und unten gebogen, an den Seiten Meridiane. Weil das
   DEM zeilenweise ueber genau einen Abschnitt kodiert ist, steht der Umriss
   ohne Rechnen da — links die Anfaenge, rechts die Enden.

   Gebraucht wird er als **Schablone** fuer die DATED-Raender: die reichen
   weiter als die Karte, und ein Eisrand, der ueber den Kartenrand hinaus ins
   Schwarze laeuft, sieht aus wie ein Fehler. */
let silCache = null, silSchluessel = '';
function silhouette() {
  const k = [kx, ky, kw, kh, ZOOM, vX, vY, NEIGUNG, DREHUNG].join(',');
  if (silCache && silSchluessel === k) return silCache;
  const p = new Path2D();
  const schritt = 3;
  let erst = true;
  for (let y = 0; y < GH; y += schritt) {
    if (BIS[y] < 0) continue;
    const [sx, sy] = projGitter(BIS[y] + 1, y);
    if (erst) { p.moveTo(sx, sy); erst = false; } else p.lineTo(sx, sy);
  }
  for (let y = GH - 1; y >= 0; y -= schritt) {
    if (BIS[y] < 0) continue;
    const [sx, sy] = projGitter(VON[y], y);
    p.lineTo(sx, sy);
  }
  p.closePath();
  silCache = p; silSchluessel = k;
  return p;
}

/* ---------- Dieselbe Schablone, gekippt ----------
   Gekippt liegen die Raender nicht auf dem Boden, sondern um bis zu einen
   ganzen Scheibenstapel darueber. Gegen den Bodenumriss beschnitten fiele
   deshalb weg, was richtig ist; gar nicht beschnitten haengt DATED-1s Rand
   ueber der Barentssee im Schwarzen, weit ausserhalb der Karte — die
   Rekonstruktion reicht bis Taimyr, der Ausschnitt nur bis 45 Grad Ost.

   Die Schablone ist deshalb nicht der Umriss, sondern der Bereich, den er
   beim Anheben ueberstreicht: je Zeile ein Viereck vom Bodensegment bis zu
   seiner hoechstmoeglichen Lage. Die Vierecke ueberlappen sich, nonzero
   vereinigt sie. */
let silHCache = null, silHSchluessel = '';
function silhouetteHoch() {
  const k = [kx, ky, kw, kh, ZOOM, vX, vY, NEIGUNG, DREHUNG].join(',');
  if (silHCache && silHSchluessel === k) return silHCache;
  const p = new Path2D();
  const hub = NSCHEIBE * (SICHT || sichtRechnen()).dz;
  const schritt = 3;
  const tief = Math.abs(kh / GH) * schritt + 2;
  for (let y = 0; y < GH; y += schritt) {
    if (BIS[y] < 0) continue;
    const [ax, ay] = projGitter(VON[y], y);
    const [bx, by] = projGitter(BIS[y] + 1, y);
    p.moveTo(ax, ay + tief);
    p.lineTo(bx, by + tief);
    p.lineTo(bx, by - hub);
    p.lineTo(ax, ay - hub);
    p.closePath();
  }
  silHCache = p; silHSchluessel = k;
  return p;
}

function datedUeber() {
  const t = datedBei(ka);
  if (!t) return;
  const s = DATED[t.ka];
  if (!s) return;
  ctx.save();
  ctx.clip(schraeg() ? silhouetteHoch() : silhouette());
  if (BAND && s.max && s.min) {
    const p = new Path2D();
    p.addPath(bandPfad(s.max));
    p.addPath(bandPfad(s.min));
    ctx.fillStyle = BANDFARBE;
    ctx.fill(p, 'evenodd');
    ctx.strokeStyle = RANDFARBE;
    ctx.lineWidth = 0.8;
    ctx.stroke(bandPfad(s.max, true));
    ctx.stroke(bandPfad(s.min, true));
  }
  if (s.mc) {
    ctx.strokeStyle = MCFARBE;
    ctx.lineWidth = 1.7;
    ctx.lineJoin = 'round';
    ctx.stroke(bandPfad(s.mc, true));
  }
  ctx.restore();
}
`;
}

/* ====================================================================== */
/* Bedienung: Zeit, Regler, Gesten, Legende, Notizen, Ticker.              */
function bedienung() {
  return `
/* ================================================================ Zeichnen */
let hkLinien = null, hcLinien = null;
function zeichne() {
  if (!(breite > 60 && hoehe > 60)) return;
  paleo();
  lichtRechnen();
  farbeRechnen();
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.clearRect(0, 0, breite, hoehe);
  if (schraeg()) {
    scheibenMalen();
  } else {
    ctx.save();
    ctx.setTransform(DPR * ZOOM, 0, 0, DPR * ZOOM, DPR * vX, DPR * vY);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'low';
    ctx.drawImage(hkF, kx, ky, kw, kh);
    linienUeber(ctx);
    ctx.restore();
  }
  datedUeber();
  schreibe();
  sichtMarken();
}

/* Die Hoehe des Schildes, an das CSS gegeben. Beim ersten Messen steht dort
   „26 ka — ICE-6G_C time slice 26 ka" in einer Zeile; sobald die Zeitangabe
   „between the 23 and 22 ka slices — interpolated" lautet, bricht sie um, und
   eine einmal gemessene Zahl legte die Notiz mitten hinein. Deshalb ein
   ResizeObserver statt einer Messung je Bild: er kostet nichts, solange sich
   nichts aendert. */
let kopfZuletzt = 0;
function kopfMessen() {
  const sch = document.querySelector('.schild');
  if (!sch) return;
  const h = sch.offsetHeight;
  if (h === kopfZuletzt) return;
  kopfZuletzt = h;
  (sch.closest('.buehne') || document.documentElement)
    .style.setProperty('--kopf', (sch.offsetTop + h + 8) + 'px');
}
if (typeof ResizeObserver === 'function') {
  const sch = document.querySelector('.schild');
  if (sch) new ResizeObserver(kopfMessen).observe(sch);
}

function masse() {
  const feld = cv.parentElement;
  // Das Seitenverhaeltnis der Karte an das CSS geben — es setzt damit die
  // Feldhoehe, statt dass das Feld den Schirm fuellt und die Karte darin
  // schwimmt.
  const buehne = feld.closest('.buehne') || document.documentElement;
  buehne.style.setProperty('--kartenmass', (GW / GH).toFixed(4));
  // Und die gemessene Hoehe des Schildes, damit die Notiz darunter anfaengt
  // und nicht dahinter: auf schmalen Schirmen bricht das Schild um.
  kopfMessen();
  breite = feld.clientWidth;
  hoehe = Math.max(120, feld.clientHeight);
  const dpr = GROB ? 1 : Math.min(2.5, devicePixelRatio || 1);
  DPR = dpr;
  const bw = Math.round(breite * dpr), bh = Math.round(hoehe * dpr);
  if (cv.width !== bw || cv.height !== bh) { cv.width = bw; cv.height = bh; }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  feldAnlegen();
  ansichtKlemmen();
}

/* ================================================================ Das Schild */
const nf = new Intl.NumberFormat('en-GB');
function schreibe() {
  const j = document.getElementById('jahrZahl');
  const n = document.getElementById('jahrNeben');
  const kaR = Math.round(ka * 10) / 10;
  j.textContent = kaR <= 0.049 ? 'today' : kaR.toFixed(1).replace(/\\.0$/, '') + ' ka';
  // Steht die Uhr auf einer Zeitscheibe, wird sie genannt; dazwischen sagt das
  // Schild, dass interpoliert wird und zwischen welchen beiden. Kein Glaetten
  // ueber die Datenlage hinweg — dieselbe Regel wie in der Vorlage.
  const a = abschnitt, b = Math.min(NT - 1, a + 1);
  const auf = uAbschnitt < 1e-6 ? a : uAbschnitt > 1 - 1e-6 ? b : -1;
  const e = D.je[auf >= 0 ? auf : a];
  const vol = D.je[auf >= 0 ? auf : a].vol;
  const teil = auf >= 0
    ? 'ICE-6G_C time slice ' + D.t[auf] + ' ka'
    : 'between the ' + D.t[a] + ' and ' + D.t[b] + ' ka slices &#8212; interpolated';
  n.innerHTML = '<span class="roh">' + teil + '</span>';
  tickerSchreiben();
}

/* ================================================== Der Meeresspiegel-Ticker
   Unten mitlaufend, relativ zu heute. Sie ist die eine Zahl, die den ganzen
   Vorgang zusammenfasst — und sie kommt aus demselben Feld wie alles andere:
   Topo_Diff ueber tiefem Fernfeld-Ozean **ist** die negative
   Meeresspiegelaenderung. */
const mspCv = document.getElementById('mspBahn'), mspCtx = mspCv.getContext('2d');
function tickerMalen() {
  const b = mspCv.parentElement.clientWidth, h = 26;
  const dpr = Math.min(2.5, devicePixelRatio || 1);
  mspCv.width = Math.round(b * dpr); mspCv.height = Math.round(h * dpr);
  mspCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  mspCtx.clearRect(0, 0, b, h);
  const lo = Math.min(...D.msp), hi = Math.max(...D.msp, 0);
  const y = v => h - 2 - (v - lo) / Math.max(1, hi - lo) * (h - 6);
  // Die Kurve laeuft ueber die **Spielzeit**, nicht ueber die Jahre — sonst
  // stuende der Zeiger nicht dort, wo die Zeitleiste steht.
  mspCtx.beginPath();
  for (let i = 0; i < NT; i++) {
    const x = TAKTKUM[i] * b;
    if (i === 0) mspCtx.moveTo(x, y(D.msp[i])); else mspCtx.lineTo(x, y(D.msp[i]));
  }
  mspCtx.strokeStyle = '#6f8fb0'; mspCtx.lineWidth = 1.4; mspCtx.stroke();
  // Die Nulllinie: heutiger Stand.
  mspCtx.beginPath();
  mspCtx.moveTo(0, y(0)); mspCtx.lineTo(b, y(0));
  mspCtx.strokeStyle = 'rgba(255,255,255,.18)'; mspCtx.lineWidth = 1; mspCtx.stroke();
  // Und der Zeiger.
  const x = spiel * b;
  mspCtx.beginPath(); mspCtx.moveTo(x, 0); mspCtx.lineTo(x, h);
  mspCtx.strokeStyle = 'rgba(255,255,255,.55)'; mspCtx.lineWidth = 1; mspCtx.stroke();
}
function mspJetzt() {
  const a = abschnitt, b = Math.min(NT - 1, a + 1);
  return D.msp[a] + (D.msp[b] - D.msp[a]) * uAbschnitt;
}
function tickerSchreiben() {
  const v = mspJetzt();
  document.getElementById('mspWert').textContent =
    (v >= -0.5 ? '0' : Math.round(v)) + ' m';
  tickerMalen();
}

/* ================================================================ Legende */
function rampeCss(liste) {
  const n = liste.length;
  // Harte Stufen statt eines weichen Verlaufs: ein CSS-Verlauf setzt seine
  // Stuetzstellen auf k/(n-1) und mischt dazwischen, die Baender der Karte
  // liegen aber auf k/n und mischen nicht — die Kuestenkante laege sonst
  // neben ihrer Zahl.
  const st = liste.map((c, i) => c + ' ' + (100 * i / n).toFixed(3) + '% ' + (100 * (i + 1) / n).toFixed(3) + '%');
  return 'linear-gradient(90deg,' + st.join(',') + ')';
}
function stufenWahl(s, bei) {
  const alle = [-2000, -1000, 0, 1000, 2000, 3000];
  const duenn = [-2000, 0, 2000];
  s.innerHTML = alle.map(m => '<span style="left:' + bei(m).toFixed(2) + '%">'
    + (m > 0 ? '' : '&#8722;') + Math.abs(m / 1000) + ' km</span>').join('');
  const k = [...s.children].map(e => e.getBoundingClientRect());
  s.innerHTML = '';
  for (let i = 1; i < k.length; i++)
    if (k[i].left < k[i - 1].right + 4) return duenn;
  return alle;
}
function legende() {
  document.getElementById('rampe').style.background = rampeCss(GESTEIN);
  document.getElementById('rampeEis').style.background = rampeCss(EISRAMPE);
  const s = document.getElementById('stufen');
  const marken = [];
  const bei = m => (gesteinLeiter(m) * 100);
  /* Die Wasserbaender sind doppelt so hoch wie die Landbaender, also draengen
     sich −2 km, −1 km und 0 auf dem linken Drittel der Leiter: acht Prozent
     Abstand bei rund fuenfzig Pixeln Schrift. Bei 390 px klebten sie
     ineinander. Ausgeduennt wird deshalb **gemessen**, nicht geraten — zuerst
     alle setzen, dann nachsehen, ob sie sich beruehren, und notfalls jede
     zweite streichen. Die Null bleibt immer: sie ist die Kuestenlinie. */
  for (const m of stufenWahl(s, bei)) {
    const p = bei(m);
    if (p < -1 || p > 101) continue;
    const kl = m === 0 ? 'null' : '';
    marken.push('<span class="' + kl + '" style="left:' + p.toFixed(2) + '%">'
      + (m === 0 ? '0' : (m > 0 ? '' : '&#8722;') + Math.abs(m / 1000) + ' km') + '</span>');
  }
  s.innerHTML = marken.join('');
  const se = document.getElementById('stufenEis');
  se.innerHTML = '<span class="a" style="left:0%">0</span>'
    + '<span class="z" style="left:100%">' + (NEIS * EISSTUFE / 1000) + ' km</span>';
  document.getElementById('legText').innerHTML =
    'Rock elevation and ice-surface elevation, metres. Every contour is a colour boundary. '
    + 'The orange line is the DATED-1 most-credible ice margin, the band around it its maximum and minimum.';
}

/* ================================================================ Notizen */
const FADEN = document.getElementById('faden');
const TIEFE_FADEN = 6;
const FADEN_DECK = [1, 0.52, 0.38, 0.27, 0.19, 0.13];
let notizJetzt = -2;
function notizIndex() {
  for (let i = 0; i < NOTIZ.length; i++) {
    const [von, bis] = NOTIZ[i];
    if (ka <= von && ka > bis) return i;
  }
  return ka <= NOTIZ[NOTIZ.length - 1][1] ? NOTIZ.length - 1 : 0;
}
function fadenBaue(i, geschoben) {
  const tiefe = innerWidth < 540 ? 3 : TIEFE_FADEN;
  const teile = [];
  for (let k = 1; k <= tiefe; k++) {
    const j = i - k;
    if (j < 0) break;
    teile.push('<b style="opacity:' + FADEN_DECK[Math.min(k - 1, FADEN_DECK.length - 1)] + '">'
      + NOTIZ[j][2] + '</b>');
  }
  FADEN.innerHTML = teile.join('');
  if (geschoben) {
    // Der ganze Faden springt ohne Uebergang um eine Zeilenhoehe nach oben und
    // laeuft dann zurueck — kostet eine Bewegung statt sechs.
    FADEN.style.transition = 'none';
    FADEN.style.transform = 'translateY(-1.3em)';
    requestAnimationFrame(() => {
      FADEN.style.transition = 'transform .45s';
      FADEN.style.transform = 'translateY(0)';
    });
  }
}
function notizen() {
  const i = notizIndex();
  if (i === notizJetzt) return;
  const geschoben = i === notizJetzt + 1;
  notizJetzt = i;
  const el = document.getElementById('jetzt');
  el.style.opacity = 0;
  setTimeout(() => {
    el.innerHTML = '<b>' + NOTIZ[i][2] + '</b>' + NOTIZ[i][3];
    el.style.opacity = 1;
  }, 160);
  fadenBaue(i, geschoben);
}

/* ================================================================ Marken
   Hier wird die tatsaechliche Schrittweite der Daten ablesbar: ein Strich je
   ICE-6G_C-Zeitscheibe, kraeftiger fuer die vollen Jahrtausende, dazu eine
   zweite Reihe fuer die DATED-1-Rekonstruktionen. In der zweiten Haelfte der
   Bahn stehen die Striche doppelt so dicht — dort hat ICE-6G_C 0,5-ka-Schritte
   statt 1-ka-Schritten. */
function marken() {
  const teile = [];
  for (let i = 0; i < NT; i++) {
    const voll = Math.abs(D.t[i] - Math.round(D.t[i])) < 1e-6;
    teile.push('<i class="' + (voll ? 'voll' : '') + '" style="left:'
      + (TAKTKUM[i] * 100).toFixed(3) + '%" title="' + D.t[i] + ' ka"></i>');
  }
  for (const k of DATED_KA) {
    let p = null;
    for (let i = 0; i < NT - 1; i++) {
      const a = D.t[i], b = D.t[i + 1];
      if ((k <= a && k >= b) || (k >= a && k <= b)) {
        const u = (k - a) / (b - a);
        p = TAKTKUM[i] + u * TAKT[i];
        break;
      }
    }
    if (p !== null) teile.push('<i class="dated" style="left:' + (p * 100).toFixed(3)
      + '%" title="DATED-1 ' + k + ' ka"></i>');
  }
  document.getElementById('marken').innerHTML = teile.join('');
}

/* ================================================================ Ansicht */
let nordStand = null, zurueckStand = null;
function sichtMarken() {
  const n = document.getElementById('nord');
  const g = Math.round(DREHUNG * 180 / Math.PI);
  if (g !== nordStand) {
    nordStand = g;
    n.hidden = Math.abs(DREHUNG) < 1e-4;
    n.style.transform = 'rotate(' + g + 'deg)';
  }
  const frei = ansichtFrei() || schraeg();
  if (frei !== zurueckStand) {
    zurueckStand = frei;
    document.getElementById('zurueck').hidden = !frei;
  }
}
function ansichtKlemmen() {
  if (!breite) return;
  const S = sichtRechnen();
  // Von jeder Seite muss die Karte ein Viertel des Rahmens erreichen.
  const b = breite, h = hoehe;
  const ecken = [[0, 0], [b, 0], [0, h], [b, h]].map(([x, y]) => bodenAuf(x, y));
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const [x, y] of ecken) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  if (x1 < b * 0.25) vX += b * 0.25 - x1;
  if (x0 > b * 0.75) vX -= x0 - b * 0.75;
  if (y1 < h * 0.25) vY += h * 0.25 - y1;
  if (y0 > h * 0.75) vY -= y0 - h * 0.75;
}
function haltePunkt(sx, sy, tu) {
  const [X, Y] = bodenUnter(sx, sy);
  tu();
  sichtRechnen();
  const [nx, ny] = bodenAuf(X, Y);
  vX += sx - nx; vY += sy - ny;
  sichtRechnen();
  ansichtKlemmen();
}
function reglerNach() {
  document.getElementById('kipp').value = Math.round(NEIGUNG * 100);
  let g = DREHUNG * 180 / Math.PI;
  g = ((g % 360) + 360) % 360;
  document.getElementById('dreh').value = Math.round(g);
}

/* ================================================================ Gesten
   Jede der drei Groessen wird gegen das **vorige Ereignis** gemessen, nicht
   gegen den Anfang der Geste. Dann trennen sie sich von selbst: eine reine
   Drehung bewegt die Mitte nicht, ein reines Auseinanderziehen aendert den
   Winkel nicht. Es braucht keine Schwellen und keine Sperren. */
const KIPPWEG = 220;
const zeiger = new Map();
let zweiAbstand = 0, zweiWinkel = 0, zweiMitte = 0;
let tippStart = null, letzterTipp = 0, grobUhr = 0;
function grobAn() { if (!GROB) { GROB = true; masse(); } }
function grobAus() { if (GROB) { GROB = false; masse(); zeichne(); } }
function grobKurz() { grobAn(); clearTimeout(grobUhr); grobUhr = setTimeout(grobAus, 220); }

cv.addEventListener('pointerdown', e => {
  cv.setPointerCapture(e.pointerId);
  zeiger.set(e.pointerId, [e.offsetX, e.offsetY]);
  if (zeiger.size === 1) tippStart = [e.offsetX, e.offsetY, performance.now()];
  if (zeiger.size === 2) { grobAn(); zweiMessen(); }
});
function zweiMessen() {
  const p = [...zeiger.values()];
  if (p.length < 2) return;
  zweiAbstand = Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]);
  zweiWinkel = Math.atan2(p[1][1] - p[0][1], p[1][0] - p[0][0]);
  zweiMitte = (p[0][1] + p[1][1]) / 2;
}
cv.addEventListener('pointermove', e => {
  if (!zeiger.has(e.pointerId)) return;
  zeiger.set(e.pointerId, [e.offsetX, e.offsetY]);
  const p = [...zeiger.values()];
  if (p.length === 1) {
    if (tippStart && Math.hypot(e.offsetX - tippStart[0], e.offsetY - tippStart[1]) > 8) {
      grobAn();
      vX += e.movementX; vY += e.movementY;
      ansichtKlemmen(); malBald();
    }
  } else if (p.length === 2) {
    const ab = Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]);
    const wi = Math.atan2(p[1][1] - p[0][1], p[1][0] - p[0][0]);
    const mi = (p[0][1] + p[1][1]) / 2;
    const mx = (p[0][0] + p[1][0]) / 2;
    const fz = zweiAbstand > 4 ? ab / zweiAbstand : 1;
    let dw = wi - zweiWinkel;
    while (dw > Math.PI) dw -= 2 * Math.PI;
    while (dw < -Math.PI) dw += 2 * Math.PI;
    const dk = (mi - zweiMitte) / KIPPWEG;
    haltePunkt(mx, mi, () => {
      ZOOM = Math.max(1, Math.min(ZOOMMAX, ZOOM * fz));
      DREHUNG += dw;
      NEIGUNG = Math.max(0, Math.min(1, NEIGUNG - dk));
    });
    zweiAbstand = ab; zweiWinkel = wi; zweiMitte = mi;
    reglerNach(); malBald();
  }
});
function losLassen(e) {
  zeiger.delete(e.pointerId);
  if (zeiger.size < 2) zweiAbstand = 0;
  if (zeiger.size === 0) {
    const t = performance.now();
    if (tippStart && t - tippStart[2] < 400
        && Math.hypot(e.offsetX - tippStart[0], e.offsetY - tippStart[1]) <= 8) {
      if (t - letzterTipp < 320) { ZOOM = 1; vX = 0; vY = 0; sichtRechnen(); }
      letzterTipp = t;
    }
    tippStart = null;
    grobAus();
  }
}
cv.addEventListener('pointerup', losLassen);
cv.addEventListener('pointercancel', losLassen);
cv.addEventListener('wheel', e => {
  e.preventDefault();
  grobKurz();
  const f = Math.exp(-e.deltaY * 0.0016);
  haltePunkt(e.offsetX, e.offsetY, () => { ZOOM = Math.max(1, Math.min(ZOOMMAX, ZOOM * f)); });
  malBald();
}, { passive: false });

let malAngefordert = false;
function malBald() {
  if (malAngefordert) return;
  malAngefordert = true;
  requestAnimationFrame(() => { malAngefordert = false; zeichne(); });
}

/* ================================================================ Uhr */
const LAUF = 90;                       // Sekunden fuer 26 000 Jahre
let zuletzt = 0;
function schlag(t) {
  if (laeuft) {
    if (zuletzt) {
      dtSek = Math.min(0.1, (t - zuletzt) / 1000);
      setzeZeit(spiel + dtSek / LAUF);
      document.getElementById('zeit').value = Math.round(spiel * 1000);
      notizen();
      zeichne();
      if (spiel >= 1 - 1e-9) halte();
    }
    zuletzt = t;
  }
  requestAnimationFrame(schlag);
}
function starte() {
  if (spiel >= 1 - 1e-9) setzeZeit(0);
  laeuft = true; zuletzt = 0;
  document.getElementById('spiel').innerHTML = '&#10074;&#10074;';
}
function halte() {
  laeuft = false;
  document.getElementById('spiel').innerHTML = '&#9654;';
}
document.getElementById('spiel').onclick = () => laeuft ? halte() : starte();
document.getElementById('zeit').addEventListener('input', e => {
  halte(); setzeZeit(e.target.value / 1000); notizen(); zeichne();
});
document.getElementById('kipp').addEventListener('input', e => {
  const v = e.target.value / 100;
  grobKurz();
  haltePunkt(breite / 2, hoehe / 2, () => { NEIGUNG = v; });
  zeichne();
});
document.getElementById('dreh').addEventListener('input', e => {
  const g = e.target.value * Math.PI / 180;
  grobKurz();
  haltePunkt(breite / 2, hoehe / 2, () => { DREHUNG = g; });
  zeichne();
});
for (const id of ['kipp', 'dreh']) document.getElementById(id).addEventListener('change', grobAus);
document.getElementById('band').addEventListener('click', e => {
  BAND = !BAND;
  e.currentTarget.setAttribute('aria-pressed', BAND ? 'true' : 'false');
  zeichne();
});
document.getElementById('zurueck').addEventListener('click', () => {
  ZOOM = 1; vX = 0; vY = 0; NEIGUNG = 0; DREHUNG = 0;
  reglerNach(); sichtRechnen(); zeichne();
});
function leiterWaehlen(cvd, merken) {
  leiterSetzen(cvd ? GESTEIN_CVD : GESTEIN_ATLAS);
  document.getElementById('farben').setAttribute('aria-pressed', cvd ? 'true' : 'false');
  if (merken) { try { localStorage.setItem('leiter', cvd ? 'cvd' : 'atlas'); } catch (e) {} }
  legende(); zeichne();
}
document.getElementById('farben').addEventListener('click',
  () => leiterWaehlen(GESTEIN !== GESTEIN_CVD, true));
addEventListener('resize', () => { masse(); zeichne(); });
if (window.ResizeObserver) {
  let zW = 0, zH = 0;
  new ResizeObserver(() => {
    const f = cv.parentElement;
    if (f.clientWidth === zW && f.clientHeight === zH) return;
    zW = f.clientWidth; zH = f.clientHeight;
    masse(); zeichne();
  }).observe(cv.parentElement);
}
{
  let cvd = false;
  try { cvd = localStorage.getItem('leiter') === 'cvd'; } catch (e) {}
  if (/cvd/.test(location.hash)) cvd = true;
  if (cvd) { leiterSetzen(GESTEIN_CVD); document.getElementById('farben').setAttribute('aria-pressed', 'true'); }
}
setzeZeit(0);
masse(); marken(); legende(); notizen(); zeichne();
requestAnimationFrame(schlag);
setTimeout(starte, 700);
`;
}

/* ======================================================================
   Die Seite, solange die Daten fehlen.

   Sie ist kein Fehlerbild und keine Vorschau: sie zeigt **nichts Erfundenes**,
   sondern sagt, was gebraucht wird, woher es kommt und was daraus entsteht.
   Erzeugt wird sie vom selben Bauvorgang wie die richtige Seite und mit
   denselben Farben und derselben Typografie — damit der Ort schon so aussieht,
   wie er aussehen wird, wenn die Karte darauf steht.

       node build.mjs --leer > ../index.html
   ====================================================================== */
export function baueLeerseite({ zeitscheiben, fenster }) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Europe under the ice — waiting for its data</title>
<meta name="description" content="An animated relief map of Europe through the last ice age. The processing chain is finished; the page is waiting for the three source datasets.">
<style>
:root{
  --plane:#000; --surface:#0c0c0c; --ink:#fff; --ink2:#bfbeb6; --muted:#7f7d77;
  --axis:#33332f; --ring:rgba(255,255,255,.09);
  --eis:#cbd4dc; --fels:#c8792e;
}
*{box-sizing:border-box}
html,body{margin:0;min-height:100%}
body{background:var(--plane);color:var(--ink);
  font-family:system-ui,-apple-system,"Segoe UI",sans-serif;font-size:15px;line-height:1.5;
  -webkit-text-size-adjust:100%}
.wrap{max-width:900px;margin:0 auto;min-height:100dvh;padding:6px;display:flex}
.buehne{container-type:inline-size;
  position:relative;flex:1;min-width:0;
  background:var(--surface);border:1px solid var(--ring);border-radius:14px;
  padding:26px 22px 20px}
h1{margin:0;font-size:clamp(23px,3.4cqw,34px);font-weight:650;letter-spacing:-.02em;line-height:1.1}
.unter{margin:6px 0 0;color:var(--ink2);font-size:clamp(12px,1.5cqw,14px);max-width:60ch}
.stand{margin:22px 0 0;padding:13px 15px;border:1px solid var(--axis);border-radius:10px;
  background:#0f0f0e}
.stand b{display:block;font-size:13px;letter-spacing:.02em;text-transform:uppercase;
  color:var(--fels);margin-bottom:5px}
.stand p{margin:0;color:var(--ink2);font-size:13.5px;max-width:66ch}
h2{margin:26px 0 8px;font-size:15px;font-weight:650;letter-spacing:.01em}
ol.quellen{margin:0;padding:0;list-style:none;counter-reset:q}
ol.quellen li{counter-increment:q;position:relative;padding:11px 0 11px 30px;
  border-top:1px solid #1c1c1a}
ol.quellen li::before{content:counter(q);position:absolute;left:0;top:11px;
  width:20px;height:20px;border-radius:50%;border:1px solid var(--axis);
  display:grid;place-items:center;font-size:11px;color:var(--muted)}
ol.quellen b{font-weight:650}
ol.quellen span{display:block;color:var(--muted);font-size:12.5px;margin-top:2px}
a{color:var(--ink2);text-decoration-color:var(--axis);text-underline-offset:2px}
a:hover{color:var(--ink)}
code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12.5px;
  color:var(--ink2);background:#151513;padding:1px 5px;border-radius:4px}
pre{margin:10px 0 0;padding:11px 13px;background:#141412;border:1px solid var(--axis);
  border-radius:9px;overflow-x:auto}
pre code{background:none;padding:0;line-height:1.6;color:var(--ink2)}
.was{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px;margin-top:8px}
.was div{padding:11px 13px;border:1px solid #1c1c1a;border-radius:9px}
.was b{display:block;font-size:12.5px;margin-bottom:3px}
.was p{margin:0;color:var(--muted);font-size:12.5px}
footer{margin-top:26px;padding-top:14px;border-top:1px solid #1c1c1a;
  color:var(--muted);font-size:12px}
footer a{color:var(--muted)}
/* Ein schmaler Streifen der beiden Farbleitern, als Vorgriff auf das, was
   hier stehen wird. Er zeigt keine Daten — er zeigt die Leiter. */
.leiter{display:flex;gap:7px;margin:18px 0 0}
.leiter div{height:7px;border-radius:4px;border:1px solid var(--ring)}
.leiter div:first-child{flex:1}
.leiter div:last-child{flex:0 0 27%}
</style>
</head><body>
<div class="wrap"><div class="buehne">

  <h1>Europe under the ice</h1>
  <p class="unter">An animated relief map of Europe through the last ice age:
  ${fenster}, from ${zeitscheiben[0]} 000 years ago to today. Real mountain
  terrain from a 15-arcsecond elevation model, the crust pressed down and
  rebounding underneath it, the Scandinavian ice sheet on top, and the
  published uncertainty of its margin drawn as a band.</p>

  <div class="leiter">
    <div style="background:linear-gradient(90deg,#050d1b,#2e4256,#1d5529,#8aa91f,#e0c40b,#de7721,#cf3020,#d4d0cf,#fff)"></div>
    <div style="background:linear-gradient(90deg,#c3ccd4,#fafafa)"></div>
  </div>

  <div class="stand">
    <b>Waiting for its data</b>
    <p>The processing chain is finished and tested; the three source datasets
    are not here yet. Rather than show you invented terrain, this page shows
    nothing. It is a reconstruction — putting a made-up ice sheet under real
    citations would be the one thing it must not do.</p>
  </div>

  <h2>What it is built from</h2>
  <ol class="quellen">
    <li><b>ICE-6G_C (VM5a), 10 arc-minute</b> — ice thickness, palaeo-topography
      and the crustal difference field, ${zeitscheiben[1]} time slices from
      ${zeitscheiben[0]} to 0 ka.
      <span>Peltier, Argus &amp; Drummond (2015), <i>J. Geophys. Res. Solid Earth</i>
      120(1), 450–487, doi:10.1002/2014JB011176 &#183;
      <a href="https://pmip4.lsce.ipsl.fr/doku.php/data:ice_ice6g_c">via PMIP4</a></span></li>
    <li><b>DATED-1</b> — the ice margin at 25 to 10 ka, three lines per slice:
      most-credible, maximum and minimum.
      <span>Hughes, Gyllencreutz, Lohne, Mangerud &amp; Svendsen (2016),
      <i>Boreas</i> 45(1), 1–45, doi:10.1111/bor.12142 &#183;
      <a href="https://doi.pangaea.de/10.1594/PANGAEA.848117">doi:10.1594/PANGAEA.848117</a></span></li>
    <li><b>GEBCO 2024 sub-ice topography, 15&#8243;</b> — the modern elevation model
      that carries the mountains. ETOPO 2022 bed elevation works as well.
      <span>GEBCO Compilation Group (2024),
      doi:10.5285/1c44ce99-0a0d-5f4f-e063-7086abc0ea0f &#183;
      NOAA NCEI (2022), doi:10.25921/fd45-gt74</span></li>
  </ol>

  <h2>How the relief is put together</h2>
  <div class="was">
    <div><b>Rock</b><p>modern DEM + the interpolated difference field. The fine
      model carries the mountains; only the coarse field moves the crust.</p></div>
    <div><b>Coastline</b><p>the zero line of that sum — the same number as the
      relief, so it is a contour like any other.</p></div>
    <div><b>Ice</b><p>rock + ice thickness, its own layer and its own ramp.</p></div>
    <div><b>The band</b><p>maximum against minimum. Where it widens, the
      reconstruction is weak — that is the point of the map.</p></div>
  </div>

  <h2>Building it</h2>
  <pre><code>cd build
./holen.sh
pip install numpy netCDF4 pyshp
python3 quellen.py
node build.mjs &gt; ../index.html</code></pre>

  <footer>
    The chain is in <code>build/</code> and documented in
    <a href="https://github.com/Chillchamp1/lab/tree/main/eiszeit-europa">the repository</a>:
    what was taken from the sister project in <code>ASTHETIK.md</code>, the method in
    <code>METHODIK.md</code>, every source-fetch attempt in <code>QUELLEN.md</code>,
    what is still open in <code>STAND.md</code>.
    &#183; <a href="../">All projects</a>
  </footer>

</div></div>
</body></html>`;
}
