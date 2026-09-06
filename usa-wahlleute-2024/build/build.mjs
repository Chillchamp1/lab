// Erzeugt die fertige, in sich geschlossene index.html.
// Aufruf: node build.mjs > ../index.html

import { baueNutzlast } from './nutzlast.mjs';
import { baueSkala } from './palette.mjs';
import { ENTPACKER } from './code.mjs';

const log = s => process.stderr.write(s + '\n');
const { nutz, daten, bilanz, knoten } = baueNutzlast({ gitter: 1400, durchgaenge: 8, log });

const SKALA = baueSkala({ L: 0.62 });
const STUFEN = 81, MITTE = 40;
const LUT = Array.from({ length: STUFEN }, (_, i) => SKALA.farbe((i - MITTE) / MITTE));
const ROT = LUT[STUFEN - 1], BLAU = LUT[0];

const marge = d => (d.gop - d.dem) / ((d.gop + d.dem) || 1);
const stufe = d => Math.max(0, Math.min(STUFEN - 1, Math.round(MITTE + marge(d) * MITTE)));

const kompakt = daten.map((d, i) => [
  d.name, d.kuerzel, d.wahlleute, d.gop, d.dem, d.gesamt, stufe(d), d.gop > d.dem ? 1 : 0,
]);

const evTrump = daten.filter(d => d.gop > d.dem).reduce((a, d) => a + d.wahlleute, 0);
const evHarris = daten.filter(d => d.dem >= d.gop).reduce((a, d) => a + d.wahlleute, 0);
const G = daten.reduce((a, d) => a + d.gop, 0), DD = daten.reduce((a, d) => a + d.dem, 0);
const S = daten.reduce((a, d) => a + d.gesamt, 0);
const landesweit = (G - DD) / (G + DD);

// Wie wenige Staaten haben es entschieden: die knappsten aufaddieren, bis
// ihr Wechsel das Ergebnis kippen würde.
const nachMarge = [...daten].map(d => ({ ...d, m: Math.abs(marge(d)) })).sort((a, b) => a.m - b.m);
let kipp = 0, kippEv = 0;
const noetig = evTrump - 269;      // so viele müsste Trump verlieren
for (const d of nachMarge) {
  if (d.gop <= d.dem) continue;    // nur seine eigenen Staaten können kippen
  kippEv += d.wahlleute; kipp++;
  if (kippEv >= noetig) break;
}
const knappste = nachMarge.slice(0, 10);
const groesste = [...daten].sort((a, b) => b.wahlleute - a.wahlleute).slice(0, 10);

const D = {
  sicht: nutz.sicht,
  gx: nutz.gx, gy: nutz.gy, kx: nutz.kx, ky: nutz.ky,
  idx: nutz.idx, ringe: nutz.ringe, ringzahl: nutz.ringzahl,
  lut: LUT, staaten: kompakt, marken: nutz.marken,
};

const zahl = n => Math.round(n).toLocaleString('de-DE');
const mio = n => (n / 1e6).toFixed(2).replace('.', ',');
const kom = (n, st = 1) => n.toFixed(st).replace('.', ',');
const punkt = d => `<span class="punkt" style="background:${LUT[stufe(d)]}"></span>`;
const band = Array.from({ length: 80 }, (_, k) =>
  `<i style="background:${SKALA.farbe(-1 + 2 * k / 79)}"></i>`).join('');

process.stdout.write(`<!doctype html>
<html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>312 zu 226, entschieden in wenigen Staaten</title>
<meta name="description" content="US-Präsidentschaftswahl 2024 nach Wahlleuten: die Karte verzieht sich von der Fläche zur Zahl der Wahlleute.">
<style>
:root{--papier:#f4f4f2;--tinte:#16181d;--leise:#6a6f79;--linie:#d8d8d4;--karte:#e7e7e3}
*{box-sizing:border-box}
body{margin:0;background:var(--papier);color:var(--tinte);
 font-family:"Inter","Helvetica Neue",Helvetica,Arial,sans-serif;font-size:15px;line-height:1.55}
.wrap{max-width:1020px;margin:0 auto;padding:38px 20px 70px}
h1{font-family:Georgia,"Times New Roman",serif;font-weight:400;
 font-size:clamp(30px,5.4vw,50px);line-height:1.08;letter-spacing:-.015em;margin:0 0 14px}
.deck{color:var(--leise);max-width:62ch;margin:0 0 26px;font-size:16px}
.deck b{color:var(--tinte);font-weight:600}
.ctrl{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin:0 0 6px}
.seg{display:inline-flex;border:1px solid var(--linie);border-radius:3px;overflow:hidden}
.seg button{background:transparent;color:var(--leise);border:0;font:inherit;font-size:13.5px;
 padding:9px 15px;cursor:pointer}
.seg button+button{border-left:1px solid var(--linie)}
.seg button[aria-pressed="true"]{background:var(--tinte);color:var(--papier)}
.seg button:focus-visible{outline:2px solid ${ROT};outline-offset:2px}
.ctrl input[type=range]{flex:1;min-width:190px;accent-color:var(--tinte)}
.ends{display:flex;justify-content:space-between;color:var(--leise);font-size:12.5px;margin:0 0 4px}
figure{margin:10px -8px 0}
svg.map{width:100%;height:auto;display:block;background:var(--karte)}
svg.map path.k{stroke:var(--karte);stroke-width:9;stroke-linejoin:round;cursor:default}
svg.map path.k.an{stroke:#fff;stroke-width:22}
svg.map text{font-family:"Inter",Helvetica,Arial,sans-serif;font-weight:600;fill:#fff;
 stroke:#00000055;stroke-width:6;paint-order:stroke fill;text-anchor:middle;
 dominant-baseline:middle;pointer-events:none}
#tip{position:fixed;pointer-events:none;opacity:0;transform:translate(-50%,-128%);
 background:#16181d;color:#f4f4f2;border-radius:4px;padding:9px 11px;font-size:12.5px;
 line-height:1.4;max-width:280px;z-index:9;transition:opacity .1s}
#tip .n{font-weight:600;font-size:13.5px}
#tip .m{color:#a8acb4;font-size:11.5px;margin-bottom:6px}
#tip .bal{display:flex;height:9px;border-radius:2px;overflow:hidden;margin:5px 0 4px}
#tip .z{display:flex;justify-content:space-between;font-variant-numeric:tabular-nums;font-size:11.5px}
.skala{display:flex;align-items:center;gap:10px;margin:20px 0 3px;flex-wrap:wrap}
.skala .band{display:flex;flex:1;min-width:220px;height:13px;border-radius:2px;overflow:hidden}
.skala .band i{flex:1;display:block}
.skala .b{color:var(--leise);font-size:12.5px;white-space:nowrap}
.skalaZahlen{display:flex;justify-content:space-between;color:var(--leise);font-size:11.5px;
 font-variant-numeric:tabular-nums;margin:0 0 20px;padding:0 52px}
.waage{display:flex;margin:16px 0 6px;height:34px;border-radius:3px;overflow:hidden;
 font-size:12.5px;color:#fff;font-variant-numeric:tabular-nums;position:relative}
.waage div{display:flex;align-items:center;padding:0 10px;white-space:nowrap}
.waage .r{justify-content:flex-end}
.waage .mitte{position:absolute;left:50%;top:-4px;bottom:-4px;width:2px;background:var(--tinte);padding:0}
.waageBesch{display:flex;justify-content:space-between;color:var(--leise);font-size:12.5px;margin-bottom:16px}
h2.sec{font-family:Georgia,serif;font-weight:400;font-size:26px;margin:46px 0 10px;
 padding-top:26px;border-top:1px solid var(--linie)}
table.t{border-collapse:collapse;width:100%;font-size:14px;margin-top:10px}
table.t th,table.t td{text-align:left;padding:7px 10px 7px 0;border-bottom:1px solid var(--linie)}
table.t th{color:var(--leise);font-weight:400;font-size:12.5px}
table.t td.z{text-align:right;font-variant-numeric:tabular-nums}
.punkt{display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:6px}
footer{margin-top:46px;padding-top:22px;border-top:1px solid var(--linie);
 color:var(--leise);font-size:13px;max-width:78ch}
footer a{color:${ROT}}
footer p{margin:0 0 11px}
.scroll{overflow-x:auto}
</style></head><body>
<div class="wrap">

<h1>${evTrump} zu ${evHarris},<br>entschieden in ${kipp} Staaten</h1>
<p class="deck">Nicht die Stimmen wählen den Präsidenten, sondern die Wahlleute. Der Regler verzieht
die Karte von der Fläche zu ihrer Zahl — jeder Wahlmann und jede Wahlfrau bekommt gleich viel Platz.
Landesweit trennt beide Bewerber <b>${kom(Math.abs(landesweit) * 100)} Punkte</b>, im Wahlleutegremium
sind es <b>${evTrump} zu ${evHarris}</b>. Hätten die <b>${kipp} knappsten Staaten</b> anders
entschieden — zusammen ${kippEv} Wahlleute — wäre die Wahl gekippt.</p>

<div class="ends"><span>Fläche</span><span>Wahlleute</span></div>
<div class="ctrl">
  <input type="range" id="reg" min="0" max="1000" value="0" step="1" aria-label="Verzerrung zwischen Fläche und Wahlleuten">
  <div class="seg"><button id="bPlay" aria-pressed="false">Abspielen</button></div>
  <div class="seg">
    <button id="bF" aria-pressed="true">Fläche</button>
    <button id="bE" aria-pressed="false">Wahlleute</button>
  </div>
  <div class="seg">
    <button id="mVor" aria-pressed="true">Vorsprung</button>
    <button id="mSieg" aria-pressed="false">nur Sieger</button>
  </div>
</div>

<figure>
  <svg class="map" id="map" viewBox="${nutz.sicht.join(' ')}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Karte der Bundesstaaten nach Wahlleuten"></svg>
</figure>

<div class="skala">
  <span class="b">Harris</span><span class="band">${band}</span><span class="b">Trump</span>
</div>
<div class="skalaZahlen"><span>+100</span><span>+50</span><span>gleichauf</span><span>+50</span><span>+100</span></div>

<div class="waage">
  <div style="background:${ROT};width:${(evTrump / 538 * 100).toFixed(2)}%">Trump ${evTrump}</div>
  <div class="r" style="background:${BLAU};width:${(evHarris / 538 * 100).toFixed(2)}%">${evHarris} Harris</div>
  <div class="mitte"></div>
</div>
<div class="waageBesch"><span>270 sind nötig</span><span>538 insgesamt</span></div>

<h2 class="sec">Die zehn knappsten Staaten</h2>
<p class="deck" style="margin-bottom:0">Kleinster Abstand zwischen beiden Bewerbern, in
Prozentpunkten der Stimmen für die beiden.</p>
<div class="scroll"><table class="t">
<tr><th>Staat</th><th class="z">Wahlleute</th><th class="z">Abstand</th><th>gewonnen von</th></tr>
${knappste.map(d => `<tr><td>${punkt(d)}${d.name}</td><td class="z">${d.wahlleute}</td>` +
  `<td class="z">${kom(d.m * 100, 2)} Pp.</td><td>${d.gop > d.dem ? 'Trump' : 'Harris'}</td></tr>`).join('\n')}
</table></div>

<h2 class="sec">Die zehn grössten Staaten</h2>
<div class="scroll"><table class="t">
<tr><th>Staat</th><th class="z">Wahlleute</th><th class="z">Trump</th><th class="z">Harris</th></tr>
${groesste.map(d => `<tr><td>${punkt(d)}${d.name}</td><td class="z">${d.wahlleute}</td>` +
  `<td class="z">${kom(d.gop / d.gesamt * 100)} %</td><td class="z">${kom(d.dem / d.gesamt * 100)} %</td></tr>`).join('\n')}
</table></div>

<footer>
<p><b>Wahlleute.</b> Die Zahlen sind nicht aus einer Tabelle übernommen, sondern abgeleitet: Sitze
im Repräsentantenhaus plus zwei Senatoren. Die Sitze ergeben sich aus der Zahl der Wahlbezirke des
119. Kongresses, also der Kammer, die im November 2024 gewählt wurde. Washington DC hat drei,
festgelegt durch den 23. Verfassungszusatz. Zusammen ${zahl(538)} — die Rechnung geht auf.</p>

<p><b>Maine und Nebraska.</b> Beide vergeben je zwei Wahlleute an den Landessieger und die
übrigen einzeln an die Sieger ihrer Wahlbezirke. Die Karte färbt sie nach dem Landesergebnis,
zeigt sie also einfarbig, obwohl beide 2024 gesplittet haben. Auf die Gesamtzahl wirkt sich das
nicht aus: Maine gab einen Wahlmann an Trump ab, Nebraska einen an Harris, das hebt sich auf.
Deshalb stimmt ${evTrump} zu ${evHarris} trotz der vereinfachten Färbung.</p>

<p><b>Wie viele Staaten es entschieden haben.</b> Aufaddiert werden die knappsten von Trump
gewonnenen Staaten, bis ihr Verlust ihn unter 270 gebracht hätte: ${kipp} Staaten mit zusammen
${kippEv} Wahlleuten. Das ist keine Prognose, sondern eine Ablesung — es sagt, wie schmal die
Mehrheit war, nicht wie wahrscheinlich ein anderer Ausgang gewesen wäre.</p>

<p><b>Verzerrung.</b> Diffusionskartogramm nach Gastner und Newman (2004) auf flächentreuer
Albers-Projektion. Alaska und Hawaii sind je ein einziges Gebiet, ihr Kartogramm ist deshalb eine
reine Skalierung und exakt; nur das Festland wird gerechnet. Verbleibende Flächenabweichung dort
im Median ${kom(bilanz.conus.median * 100, 2)} Prozent, im Maximum ${kom(bilanz.conus.max * 100, 1)} Prozent.
Beide Zustände benutzen dieselben ${zahl(knoten)} Stützpunkte. Beim Übergang bewegt sich nur
Alaska — es schrumpft dabei auf ein Sechstel seiner Kantenlänge und stünde sonst verloren im Leeren.</p>

<p><b>Die Farben.</b> Dieselbe wahrnehmungsgleiche Skala wie bei der Countykarte: in OKLab
konstruiert, an beiden Enden gleiche Helligkeit und gleiche Buntheit, neutrale graue Mitte. Anders
als dort entspricht die Farbmenge hier <b>nicht</b> dem Ergebnis — die Fläche folgt den Wahlleuten,
und die verteilen sich nicht proportional zu den Stimmen. Genau das ist der Punkt dieser Karte.</p>

<p><b>Daten.</b> Staats- und Wahlbezirksgrenzen vom
<a href="https://www.census.gov/">US Census Bureau</a>. Wahlergebnisse als Summe der Countyzeilen
aus <a href="https://github.com/tonmcg/US_County_Level_Election_Results_08-24">tonmcg/US_County_Level_Election_Results_08-24</a>;
in den USA führt keine Bundesbehörde die Ergebnisse zusammen. Zusammen ${mio(G)} Millionen Stimmen
für Trump und ${mio(DD)} Millionen für Harris.</p>

<p><b>Verwandt.</b> Dieselbe Wahl nach Wählerschaft, auf Ebene der Countys:
<a href="../usa-wahl-2024/">Die Wahl 2024, nach Stimmen gewichtet</a>.</p>
</footer>

</div>
<div id="tip" role="status"></div>

<script>
const D = ${JSON.stringify(D)};
${ENTPACKER}
function summe(s){const a=entpacke(s);let v=0;for(let i=0;i<a.length;i++){v+=a[i];a[i]=v}return a}

const GX=summe(D.gx), GY=summe(D.gy), KX=summe(D.kx), KY=summe(D.ky);
const ringzahl=entpacke(D.ringzahl), ringlaenge=entpacke(D.ringe), idxRoh=entpacke(D.idx);

const staatRinge=[]; let rz=0, ip=0;
for(let g=0; g<ringzahl.length; g++){
  const ringe=[];
  for(let r=0; r<ringzahl[g]; r++){
    const n=ringlaenge[rz++]; const arr=new Int32Array(n); let v=0;
    for(let k=0;k<n;k++){ v+=idxRoh[ip++]; arr[k]=v }
    ringe.push(arr);
  }
  staatRinge.push(ringe);
}

const map=document.getElementById('map'), tip=document.getElementById('tip');
const NS='http://www.w3.org/2000/svg';
const ROT=D.lut[D.lut.length-1], BLAU=D.lut[0];

const staaten = D.staaten.map((c,i)=>{
  const [name, kuerzel, ev, gop, dem, gesamt, st, trump] = c;
  return { i, name, kuerzel, ev, gop, dem, gesamt: gesamt||1,
           farbeVorsprung: D.lut[st], farbeSieger: trump ? ROT : BLAU };
});

const pfade = staaten.map(s=>{
  const p=document.createElementNS(NS,'path');
  p.setAttribute('class','k'); p.setAttribute('fill',s.farbeVorsprung); p.dataset.i=s.i;
  map.appendChild(p);
  return p;
});
const schriften = staaten.map(s=>{
  const t=document.createElementNS(NS,'text');
  t.textContent = s.kuerzel;
  map.appendChild(t);
  return t;
});

let t=0, modus='vorsprung';
function zeichne(){
  for(let i=0;i<pfade.length;i++){
    const ringe=staatRinge[i]; const teile=[];
    for(const ring of ringe){
      let d='M';
      for(let k=0;k<ring.length;k++){
        const n=ring[k];
        const x=GX[n]+(KX[n]-GX[n])*t, y=GY[n]+(KY[n]-GY[n])*t;
        d+=(k?'L':'')+Math.round(x)+' '+Math.round(y);
      }
      teile.push(d+'Z');
    }
    pfade[i].setAttribute('d',teile.join(''));
    // Beschriftung: Schwerpunkt und Grösse wandern mit
    const m=D.marken[i];
    const cx=m[0]+(m[3]-m[0])*t, cy=m[1]+(m[4]-m[1])*t, r=m[2]+(m[5]-m[2])*t;
    const gr=Math.min(210, Math.max(0, r*0.42));
    const el=schriften[i];
    if(gr<52){ el.setAttribute('opacity','0') }
    else { el.setAttribute('opacity','1'); el.setAttribute('x',cx.toFixed(0));
           el.setAttribute('y',cy.toFixed(0)); el.setAttribute('font-size',gr.toFixed(0)) }
  }
}
function faerbe(){
  for(let i=0;i<pfade.length;i++)
    pfade[i].setAttribute('fill', modus==='sieger' ? staaten[i].farbeSieger : staaten[i].farbeVorsprung);
}
zeichne();

const reg=document.getElementById('reg'), bF=document.getElementById('bF'), bE=document.getElementById('bE');
const mVor=document.getElementById('mVor'), mSieg=document.getElementById('mSieg');
let wartet=false;
function setze(v,{schieber=true}={}){
  t=v; if(schieber) reg.value=Math.round(v*1000);
  bF.setAttribute('aria-pressed', v<0.02?'true':'false');
  bE.setAttribute('aria-pressed', v>0.98?'true':'false');
  if(!wartet){ wartet=true; requestAnimationFrame(()=>{ wartet=false; zeichne() }) }
}
reg.addEventListener('input',()=>{ halte(); setze(reg.value/1000,{schieber:false}) });
function animiere(ziel){
  const start=t, t0=performance.now(), dauer=900;
  (function schritt(jetzt){
    const p=Math.min(1,(jetzt-t0)/dauer);
    const e=p<0.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2;
    setze(start+(ziel-start)*e);
    if(p<1) requestAnimationFrame(schritt);
  })(t0);
}
bF.addEventListener('click',()=>{ halte(); animiere(0) });
bE.addEventListener('click',()=>{ halte(); animiere(1) });
function setzeModus(m){
  modus=m;
  mVor.setAttribute('aria-pressed', m==='vorsprung'?'true':'false');
  mSieg.setAttribute('aria-pressed', m==='sieger'?'true':'false');
  faerbe();
}
mVor.addEventListener('click',()=>setzeModus('vorsprung'));
mSieg.addEventListener('click',()=>setzeModus('sieger'));

// Endlosschleife mit Halt an beiden Enden
const bPlay=document.getElementById('bPlay');
let laeuft=false, phase=0, letzte=performance.now();
function halte(){
  if(!laeuft) return;
  laeuft=false; bPlay.textContent='Abspielen'; bPlay.setAttribute('aria-pressed','false');
}
bPlay.addEventListener('click',()=>{
  laeuft=!laeuft;
  bPlay.textContent = laeuft ? 'Pause' : 'Abspielen';
  bPlay.setAttribute('aria-pressed', laeuft?'true':'false');
  letzte=performance.now();
  if(laeuft) phase = 0.15 + t * 0.35;
});
function takt(jetzt){
  const dt=Math.min(64, jetzt-letzte); letzte=jetzt;
  if(laeuft){
    phase=(phase+dt/5200)%1;
    let v;
    if(phase<0.15) v=0;
    else if(phase<0.5) v=(phase-0.15)/0.35;
    else if(phase<0.65) v=1;
    else v=1-(phase-0.65)/0.35;
    setze(v<0.5?4*v*v*v:1-Math.pow(-2*v+2,3)/2);
  }
  requestAnimationFrame(takt);
}
requestAnimationFrame(takt);

let aktiv=null;
function zeigeTip(s,ev){
  const pg=s.gop/s.gesamt*100, pd=s.dem/s.gesamt*100;
  const vor=(s.gop-s.dem)/(s.gop+s.dem)*100;
  const kom=(x,n)=>x.toFixed(n).replace('.',',');
  tip.innerHTML='<div class="n">'+s.name+'</div>'+
    '<div class="m">'+s.ev+' Wahlleute · '+(s.gesamt/1e6).toFixed(2).replace('.',',')+' Mio Stimmen</div>'+
    '<div class="bal"><div style="background:'+ROT+';width:'+pg.toFixed(1)+'%"></div>'+
      '<div style="background:'+BLAU+';width:'+pd.toFixed(1)+'%"></div>'+
      '<div style="background:#5c6067;flex:1"></div></div>'+
    '<div class="z"><span>Trump '+kom(pg,1)+' %</span><span>'+kom(pd,1)+' % Harris</span></div>'+
    '<div class="z" style="margin-top:3px;color:#a8acb4"><span>Vorsprung '+kom(Math.abs(vor),1)+' Punkte</span></div>';
  tip.style.left=ev.clientX+'px'; tip.style.top=ev.clientY+'px'; tip.style.opacity='1';
}
map.addEventListener('mousemove',ev=>{
  const el=ev.target.closest('path.k');
  if(!el){ if(aktiv){aktiv.classList.remove('an');aktiv=null} tip.style.opacity='0'; return }
  if(aktiv!==el){ if(aktiv)aktiv.classList.remove('an'); aktiv=el; el.classList.add('an') }
  zeigeTip(staaten[+el.dataset.i],ev);
});
map.addEventListener('mouseleave',()=>{ if(aktiv){aktiv.classList.remove('an');aktiv=null} tip.style.opacity='0' });
</script>
</body></html>
`);

log('');
log(`Fertig. ${daten.length} Staaten, ${knoten} Knoten. Trump ${evTrump}, Harris ${evHarris}. Kipp-Punkt: ${kipp} Staaten, ${kippEv} Wahlleute.`);
