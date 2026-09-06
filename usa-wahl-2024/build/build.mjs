// Erzeugt die fertige, in sich geschlossene index.html.
// Aufruf: node build.mjs > ../index.html

import { baueNutzlast } from './nutzlast.mjs';
import { ENTPACKER } from './code.mjs';

const ROT = '#c0392b', BLAU = '#2c6fbb';

const log = s => process.stderr.write(s + '\n');
const { nutz, daten, bilanz, knoten } = baueNutzlast({ gitter: 2000, durchgaenge: 6, log });

const kompakt = daten.map(d => [
  d.name, d.kuerzel, d.gop, d.dem, d.gesamt, d.einwohner,
]);

// Kennzahlen für Text und Tabelle
const trumpCountys = daten.filter(d => d.gop > d.dem);
const harrisCountys = daten.filter(d => d.dem >= d.gop);
const einwohnerGesamt = daten.reduce((a, d) => a + d.einwohner, 0);
const stimmenGesamt = daten.reduce((a, d) => a + d.gesamt, 0);
const gopGesamt = daten.reduce((a, d) => a + d.gop, 0);
const demGesamt = daten.reduce((a, d) => a + d.dem, 0);
const einwohnerTrump = trumpCountys.reduce((a, d) => a + d.einwohner, 0);
const einwohnerHarris = harrisCountys.reduce((a, d) => a + d.einwohner, 0);

const anteilHarrisCountys = harrisCountys.length / daten.length * 100;
const anteilHarrisMenschen = einwohnerHarris / einwohnerGesamt * 100;

const groesste = [...daten].sort((a, b) => b.einwohner - a.einwohner).slice(0, 12);
const knappste = [...daten]
  .filter(d => d.gesamt > 20000)
  .map(d => ({ ...d, abstand: Math.abs(d.gop - d.dem) / d.gesamt * 100 }))
  .sort((a, b) => a.abstand - b.abstand).slice(0, 12);

const D = {
  vb: [nutz.breite, nutz.hoehe],
  gx: nutz.gx, gy: nutz.gy, kx: nutz.kx, ky: nutz.ky,
  idx: nutz.idx, ringe: nutz.ringe, ringzahl: nutz.ringzahl,
  rot: ROT, blau: BLAU,
  countys: kompakt,
};

const zahl = n => Math.round(n).toLocaleString('de-DE');
const mio = n => (n / 1e6).toFixed(2).replace('.', ',');
// Dezimalkomma für den sichtbaren Text. CSS-Breiten brauchen weiter den Punkt.
const kom = (n, stellen = 1) => n.toFixed(stellen).replace('.', ',');

process.stdout.write(`<!doctype html>
<html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Die Wahl 2024, nach Menschen gewichtet</title>
<meta name="description" content="US-Präsidentschaftswahl 2024: 3109 Countys, verzogen zwischen Fläche und Einwohnerzahl.">
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
svg.map path.k{stroke:var(--karte);stroke-width:1.4;stroke-linejoin:round;cursor:default}
svg.map path.k.an{stroke:#fff;stroke-width:7}
#tip{position:fixed;pointer-events:none;opacity:0;transform:translate(-50%,-128%);
 background:#16181d;color:#f4f4f2;border-radius:4px;padding:9px 11px;font-size:12.5px;
 line-height:1.4;max-width:280px;z-index:9;transition:opacity .1s}
#tip .n{font-weight:600;font-size:13.5px}
#tip .m{color:#a8acb4;font-size:11.5px;margin-bottom:6px}
#tip .bal{display:flex;height:9px;border-radius:2px;overflow:hidden;margin:5px 0 4px}
#tip .z{display:flex;justify-content:space-between;font-variant-numeric:tabular-nums;font-size:11.5px}
.waage{display:flex;margin:22px 0 6px;height:30px;border-radius:3px;overflow:hidden;
 font-size:12px;color:#fff;font-variant-numeric:tabular-nums}
.waage div{display:flex;align-items:center;padding:0 9px;white-space:nowrap}
.waage .l{justify-content:flex-start}.waage .r{justify-content:flex-end}
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

<h1>Die Wahl 2024,<br>nach Menschen gewichtet</h1>
<p class="deck">Jedes County in der Farbe des Siegers der Präsidentschaftswahl. Der Regler verzieht
die Karte von der Fläche zur Einwohnerzahl, bis jeder Mensch gleich viel Platz einnimmt. Trump
gewann <b>${zahl(trumpCountys.length)} der ${zahl(daten.length)} Countys</b>, Harris nur
<b>${zahl(harrisCountys.length)}</b> — aber in diesen ${anteilHarrisCountys.toFixed(0)} Prozent der
Countys lebt <b>${anteilHarrisMenschen.toFixed(0)} Prozent</b> der Bevölkerung. Genau diese Lücke
macht die Verzerrung sichtbar.</p>

<div class="ends"><span>Fläche</span><span>Einwohner</span></div>
<div class="ctrl">
  <input type="range" id="reg" min="0" max="1000" value="0" step="1" aria-label="Verzerrung zwischen Fläche und Einwohnerzahl">
  <div class="seg">
    <button id="bF" aria-pressed="true">Fläche</button>
    <button id="bE" aria-pressed="false">Einwohner</button>
  </div>
</div>

<figure>
  <svg class="map" id="map" viewBox="0 0 ${nutz.breite} ${nutz.hoehe}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Karte der Countys des US-Festlands"></svg>
</figure>

<div class="waage">
  <div class="l" style="background:${ROT};width:${(gopGesamt / stimmenGesamt * 100).toFixed(2)}%">Trump ${kom(gopGesamt / stimmenGesamt * 100)} %</div>
  <div class="r" style="background:${BLAU};width:${(demGesamt / stimmenGesamt * 100).toFixed(2)}%">Harris ${kom(demGesamt / stimmenGesamt * 100)} %</div>
  <div style="background:#9aa0a6;flex:1"></div>
</div>
<div class="waageBesch"><span>${mio(gopGesamt)} Mio Stimmen</span><span>${mio(demGesamt)} Mio Stimmen</span></div>

<h2 class="sec">Die zwölf grössten Countys</h2>
<p class="deck" style="margin-bottom:0">Nach Einwohnern — im Kartogramm nehmen sie den Platz ein,
den sie auf der Landkarte nicht haben.</p>
<div class="scroll"><table class="t">
<tr><th>County</th><th>Staat</th><th class="z">Einwohner</th><th class="z">Trump</th><th class="z">Harris</th></tr>
${groesste.map(d => `<tr><td><span class="punkt" style="background:${d.gop > d.dem ? ROT : BLAU}"></span>${d.name}</td><td>${d.kuerzel}</td>` +
  `<td class="z">${zahl(d.einwohner)}</td><td class="z">${kom(d.gop / d.gesamt * 100)} %</td>` +
  `<td class="z">${kom(d.dem / d.gesamt * 100)} %</td></tr>`).join('\n')}
</table></div>

<h2 class="sec">Die knappsten Countys</h2>
<p class="deck" style="margin-bottom:0">Kleinster Abstand zwischen beiden Bewerbern, unter den
Countys mit mehr als 20.000 abgegebenen Stimmen.</p>
<div class="scroll"><table class="t">
<tr><th>County</th><th>Staat</th><th class="z">Stimmen</th><th class="z">Abstand</th></tr>
${knappste.map(d => `<tr><td><span class="punkt" style="background:${d.gop > d.dem ? ROT : BLAU}"></span>${d.name}</td><td>${d.kuerzel}</td>` +
  `<td class="z">${zahl(d.gesamt)}</td><td class="z">${kom(d.abstand, 2)} Pp.</td></tr>`).join('\n')}
</table></div>

<footer>
<p><b>Umfang.</b> Die ${zahl(daten.length)} Countys des Festlands samt Washington DC. Alaska und
Hawaii fehlen: im Kartogramm blieben sie als leere Ozeanfläche stehen, und eine Verbundprojektion,
die sie heranrückt, bricht die Flächentreue, auf der das ganze Verfahren beruht. Zusammen sind das
sieben Wahlleute und rund 0,8 Millionen Stimmen. Connecticut erscheint mit den Planungsregionen,
die dort seit 2022 an die Stelle der Countys getreten sind; die Stimmen von Washington DC sind aus
den acht Wards zusammengefasst.</p>

<p><b>Verzerrung.</b> Diffusionskartogramm nach Gastner und Newman (2004): die Einwohnerdichte wird
als Wärme aufgefasst und fliesst auseinander, bis sie überall gleich ist, während die Grenzen
mitschwimmen. Gerechnet wird auf einer flächentreuen Projektion (Albers, Bezugsbreiten 29,5° und
45,5° N). Beide Zustände benutzen dieselben ${zahl(knoten)} Stützpunkte; Punkte gleicher
Ausgangslage sind zu einem Knoten verschweisst, damit gemeinsame Grenzen gemeinsam bleiben.</p>

<p><b>Genauigkeit.</b> Die Spannweite ist hier extrem: die Countyflächen unterscheiden sich um das
Zehntausendfache, die Einwohnerzahlen um das Zweihunderttausendfache — von 48 Menschen in Loving
County bis zu 9,8 Millionen in Los Angeles. Wo ein County kleiner ist als eine Rasterzelle, stösst
das Verfahren an seine Grenze. Gemessen an der Fläche, die man tatsächlich sieht, trifft es gut:
Gebiete mit weniger als 20 Prozent Abweichung machen ${(bilanz.flaecheGut ?? 0).toFixed(0)} Prozent
der Kartenfläche aus, und nach Einwohnern gewichtet liegt die mittlere Abweichung bei
${kom(bilanz.gewichtet ?? 0)} Prozent. Die grössten relativen Fehler treffen menschenleere
Countys, die auf beiden Karten zu klein sind, um aufzufallen.</p>

<p><b>Daten.</b> Countygrenzen und Einwohnerzahlen (Schätzung 2024) vom
<a href="https://www.census.gov/">US Census Bureau</a>. Wahlergebnisse aus der gepflegten Sammlung
<a href="https://github.com/tonmcg/US_County_Level_Election_Results_08-24">tonmcg/US_County_Level_Election_Results_08-24</a>
— in den USA führt keine Bundesbehörde die Ergebnisse zusammen, Wahlen sind Sache der Staaten.
Gegengerechnet: Festland und DC ergeben ${mio(gopGesamt)} Millionen Stimmen für Trump und
${mio(demGesamt)} Millionen für Harris; die Differenz zum landesweiten Ergebnis entspricht
Alaska und Hawaii.</p>

<p><b>Verwandt.</b> Dasselbe Verfahren für Deutschland:
<a href="../wahlkreise-2025/">299 Wahlkreise, nach Menschen gewichtet</a>.</p>
</footer>

</div>
<div id="tip" role="status"></div>

<script>
const D = ${JSON.stringify(D)};
${ENTPACKER}
function summe(s){const a=entpacke(s);let v=0;for(let i=0;i<a.length;i++){v+=a[i];a[i]=v}return a}

const GX=summe(D.gx), GY=summe(D.gy), KX=summe(D.kx), KY=summe(D.ky);
const ringzahl=entpacke(D.ringzahl), ringlaenge=entpacke(D.ringe), idxRoh=entpacke(D.idx);

const countyRinge=[]; let rz=0, ip=0;
for(let g=0; g<ringzahl.length; g++){
  const ringe=[];
  for(let r=0; r<ringzahl[g]; r++){
    const n=ringlaenge[rz++]; const arr=new Int32Array(n); let v=0;
    for(let k=0;k<n;k++){ v+=idxRoh[ip++]; arr[k]=v }
    ringe.push(arr);
  }
  countyRinge.push(ringe);
}

const map=document.getElementById('map'), tip=document.getElementById('tip');
const NS='http://www.w3.org/2000/svg';

function mische(hex, anteil){
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  const f=x=>Math.round(x).toString(16).padStart(2,'0');
  return '#'+f(r+(231-r)*anteil)+f(g+(231-g)*anteil)+f(b+(227-b)*anteil);
}

const countys = D.countys.map((c,i)=>{
  const [name, staat, gop, dem, gesamt, einwohner] = c;
  const g = gesamt || 1;
  const vorsprung = Math.abs(gop-dem)/g*100;
  const anteil = Math.max(0, Math.min(0.68, 0.68 - vorsprung/45*0.68));
  return { i, name, staat, gop, dem, gesamt:g, einwohner,
    farbe: mische(gop>dem ? D.rot : D.blau, anteil) };
});

const pfade = countys.map(c=>{
  const p=document.createElementNS(NS,'path');
  p.setAttribute('class','k'); p.setAttribute('fill',c.farbe); p.dataset.i=c.i;
  map.appendChild(p);
  return p;
});

let t=0;
function zeichne(){
  for(let i=0;i<pfade.length;i++){
    const ringe=countyRinge[i]; const teile=[];
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
  }
}
zeichne();

const reg=document.getElementById('reg'), bF=document.getElementById('bF'), bE=document.getElementById('bE');
let wartet=false;
function setze(v,{schieber=true}={}){
  t=v; if(schieber) reg.value=Math.round(v*1000);
  bF.setAttribute('aria-pressed', v<0.02?'true':'false');
  bE.setAttribute('aria-pressed', v>0.98?'true':'false');
  if(!wartet){ wartet=true; requestAnimationFrame(()=>{ wartet=false; zeichne() }) }
}
reg.addEventListener('input',()=>setze(reg.value/1000,{schieber:false}));
function animiere(ziel){
  const start=t, t0=performance.now(), dauer=900;
  (function schritt(jetzt){
    const p=Math.min(1,(jetzt-t0)/dauer);
    const e=p<0.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2;
    setze(start+(ziel-start)*e);
    if(p<1) requestAnimationFrame(schritt);
  })(t0);
}
bF.addEventListener('click',()=>animiere(0));
bE.addEventListener('click',()=>animiere(1));

let aktiv=null;
function zeigeTip(c,ev){
  const pg=c.gop/c.gesamt*100, pd=c.dem/c.gesamt*100;
  tip.innerHTML='<div class="n">'+c.name+'</div>'+
    '<div class="m">'+c.staat+' · '+c.einwohner.toLocaleString('de-DE')+' Einwohner</div>'+
    '<div class="bal"><div style="background:'+D.rot+';width:'+pg.toFixed(1)+'%"></div>'+
      '<div style="background:'+D.blau+';width:'+pd.toFixed(1)+'%"></div>'+
      '<div style="background:#5c6067;flex:1"></div></div>'+
    '<div class="z"><span>Trump '+pg.toFixed(1)+' %</span><span>'+pd.toFixed(1)+' % Harris</span></div>';
  tip.style.left=ev.clientX+'px'; tip.style.top=ev.clientY+'px'; tip.style.opacity='1';
}
map.addEventListener('mousemove',ev=>{
  const el=ev.target.closest('path.k');
  if(!el){ if(aktiv){aktiv.classList.remove('an');aktiv=null} tip.style.opacity='0'; return }
  if(aktiv!==el){ if(aktiv)aktiv.classList.remove('an'); aktiv=el; el.classList.add('an'); el.parentNode.appendChild(el) }
  zeigeTip(countys[+el.dataset.i],ev);
});
map.addEventListener('mouseleave',()=>{ if(aktiv){aktiv.classList.remove('an');aktiv=null} tip.style.opacity='0' });
</script>
</body></html>
`);

log('');
log('Fertig. ' + daten.length + ' Countys, ' + knoten + ' Knoten.');
