// Erzeugt die fertige, in sich geschlossene index.html.
// Aufruf: node build.mjs > ../index.html

import { baueNutzlast } from './nutzlast.mjs';
import { ENTPACKER } from './code.mjs';

const FARBE = {
  'CDU/CSU': '#20232a', 'SPD': '#d81f28', 'Grüne': '#3f9c35', 'FDP': '#f2c500',
  'Linke': '#8d2f8f', 'BSW': '#6b2d8c', 'Freie Wähler': '#ee7f1a', 'AfD': '#8a5a2b',
};

const log = s => process.stderr.write(s + '\n');

const { nutz, gebieteDaten, bilanz, knoten } = baueNutzlast({ gitter: 1300, durchgaenge: 6, log });

// Kompakte Gebietsdaten: [nr, name, land, bev, flaeche, gueltig, wahlberechtigte, waehlende, [[partei, stimmen], ...]]
const parteien = [...new Set(gebieteDaten.flatMap(g => g.top.map(t => t[0])))];
const pIdx = Object.fromEntries(parteien.map((p, i) => [p, i]));
const kompakt = gebieteDaten.map(g => [
  g.nr, g.name, g.land, g.bev, g.flaeche, g.gueltig, g.wahlberechtigte, g.waehlende,
  g.top.map(([p, v]) => [pIdx[p], v]),
]);

const sieger = {};
for (const g of gebieteDaten) {
  const p = g.top[0][0];
  sieger[p] = (sieger[p] ?? 0) + 1;
}
const legende = Object.entries(sieger).sort((a, b) => b[1] - a[1]);

const flaechen = gebieteDaten.map(g => g.flaeche).sort((a, b) => a - b);
const faktorFlaeche = Math.round(flaechen.at(-1) / flaechen[0]);
const bevs = gebieteDaten.map(g => g.bev).sort((a, b) => a - b);
const faktorBev = (bevs.at(-1) / bevs[0]).toFixed(1);

const daten = {
  vb: [nutz.breite, nutz.hoehe],
  gx: nutz.gx, gy: nutz.gy, kx: nutz.kx, ky: nutz.ky,
  idx: nutz.idx, ringe: nutz.ringe, ringzahl: nutz.ringzahl,
  parteien, farben: parteien.map(p => FARBE[p] ?? '#8b8d93'),
  gebiete: kompakt,
};

const zahl = n => n.toLocaleString('de-DE');

process.stdout.write(`<!doctype html>
<html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>299 Wahlkreise, nach Menschen gewichtet</title>
<meta name="description" content="Bundestagswahl 2025: jeder Wahlkreis in der Farbe der stärksten Partei, verzogen zwischen Fläche und Einwohnerzahl.">
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
.seg button:focus-visible{outline:2px solid #8a5a2b;outline-offset:2px}
.ctrl input[type=range]{flex:1;min-width:190px;accent-color:var(--tinte)}
.ends{display:flex;justify-content:space-between;color:var(--leise);font-size:12.5px;margin:0 0 4px}
figure{margin:10px -8px 0}
svg.map{width:100%;height:auto;display:block;background:var(--karte)}
svg.map path.k{stroke:var(--karte);stroke-width:2;stroke-linejoin:round;cursor:default}
svg.map path.k.an{stroke:#fff;stroke-width:9}
#tip{position:fixed;pointer-events:none;opacity:0;transform:translate(-50%,-128%);
 background:#16181d;color:#f4f4f2;border-radius:4px;padding:9px 11px;font-size:12.5px;
 line-height:1.4;max-width:290px;z-index:9;transition:opacity .1s}
#tip .n{font-weight:600;font-size:13.5px}
#tip .m{color:#a8acb4;font-size:11.5px;margin-bottom:5px}
#tip .bars{display:grid;grid-template-columns:auto 1fr auto;gap:3px 7px;align-items:center;margin-top:6px}
#tip .bars i{width:8px;height:8px;border-radius:1px;display:block}
#tip .bars u{display:block;height:8px;border-radius:1px;min-width:1px;text-decoration:none}
#tip .bars b{font-variant-numeric:tabular-nums;font-weight:400;font-size:11.5px;color:#d8dbe1}
.leg{display:flex;flex-wrap:wrap;gap:6px 20px;margin:20px 0 0;padding:0;list-style:none;
 color:var(--leise);font-size:13.5px}
.leg li{display:flex;align-items:center;gap:7px}
.leg i{width:11px;height:11px;border-radius:2px;display:block;flex:none}
.leg b{color:var(--tinte);font-weight:600;font-variant-numeric:tabular-nums}
h2.sec{font-family:Georgia,serif;font-weight:400;font-size:26px;margin:46px 0 10px;
 padding-top:26px;border-top:1px solid var(--linie)}
table{border-collapse:collapse;width:100%;font-size:14px;margin-top:10px}
th,td{text-align:left;padding:7px 10px 7px 0;border-bottom:1px solid var(--linie)}
th{color:var(--leise);font-weight:400;font-size:12.5px}
td.z{text-align:right;font-variant-numeric:tabular-nums}
td .pk{display:inline-flex;align-items:center;gap:6px}
td .pk i{width:9px;height:9px;border-radius:2px;display:block}
footer{margin-top:46px;padding-top:22px;border-top:1px solid var(--linie);
 color:var(--leise);font-size:13px;max-width:78ch}
footer a{color:#8a5a2b}
footer p{margin:0 0 11px}
.tabelle-scroll{overflow-x:auto}
</style></head><body>
<div class="wrap">

<h1>299 Wahlkreise,<br>nach Menschen gewichtet</h1>
<p class="deck">Jeder Wahlkreis in der Farbe der Partei mit den meisten <b>Zweitstimmen</b> bei der
Bundestagswahl 2025. Der Regler verzieht die Karte von der Fläche zur Einwohnerzahl. Weil Wahlkreise
nach Bevölkerung zugeschnitten werden, gleichen sich die Gebiete dabei weitgehend an: der
Flächenunterschied schrumpft vom <b>${faktorFlaeche}-fachen</b> auf etwa das <b>${faktorBev}-fache</b>.
Was bleibt, zeigt, wo dieses Prinzip strapaziert wird.</p>

<div class="ends"><span>Fläche</span><span>Einwohner</span></div>
<div class="ctrl">
  <input type="range" id="reg" min="0" max="1000" value="0" step="1" aria-label="Verzerrung zwischen Fläche und Einwohnerzahl">
  <div class="seg">
    <button id="bF" aria-pressed="true">Fläche</button>
    <button id="bE" aria-pressed="false">Einwohner</button>
  </div>
</div>

<figure>
  <svg class="map" id="map" viewBox="0 0 ${nutz.breite} ${nutz.hoehe}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Karte der 299 Wahlkreise"></svg>
</figure>

<ul class="leg" id="leg"></ul>

<h2 class="sec">Die knappsten Wahlkreise</h2>
<p class="deck" style="margin-bottom:0">Gebiete, in denen der Abstand zwischen erster und zweiter Partei
am kleinsten ist — gemessen in Prozentpunkten der gültigen Zweitstimmen.</p>
<div class="tabelle-scroll"><table id="knapp"></table></div>

<footer>
<p><b>Gebietsauflösung.</b> Alle 299 Wahlkreise der Bundestagswahl 2025 in ihrem amtlichen
Zuschnitt. Anders als bei einer Kreiskarte ist keine Zusammenfassung und keine Übertragung von
Werten nötig: der Wahlkreis ist die Einheit, in der das Ergebnis erhoben wird.</p>

<p><b>Verzerrung.</b> Diffusionskartogramm nach Gastner und Newman (2004). Die Einwohnerdichte
wird als Wärme aufgefasst und fliesst auseinander, bis sie überall gleich ist; jeder Punkt der Karte
schwimmt mit der Strömung mit. Weil alle Punkte demselben glatten Feld folgen, bleiben die Umrisse
der Wahlkreise erkennbar — anders als bei Kraftverfahren, die jedes Gebiet einzeln um seinen
Schwerpunkt aufblasen und dabei die Form verlieren. Gerechnet wird auf einer flächentreuen
Projektion (Lambert azimutal, Bezugspunkt 52° N 10° O), damit die Ausgangsflächen nicht schon durch
die Projektion verfälscht sind.</p>

<p><b>Genauigkeit.</b> Verbleibende Flächenabweichung im Median ${(bilanz.median * 100).toFixed(3)} Prozent,
im Maximum ${(bilanz.max * 100).toFixed(1)} Prozent; ${bilanz.ueber1} von 299 Gebieten liegen über einem Prozent.
Die Grenze setzt die Auflösung des Rechengitters: der kleinste Wahlkreis ist keine 27 Quadratkilometer
gross und belegt darin nur wenige Zellen. Beide Zustände benutzen dieselben ${zahl(knoten)} Stützpunkte;
Punkte gleicher Ausgangslage sind zu einem Knoten verschweisst, damit gemeinsame Grenzen beim
Verziehen gemeinsam bleiben. Nachgemessen überdecken sich die verzogenen Gebiete nicht: von
652.719 belegten Rasterzellen ist genau eine doppelt belegt.</p>

<p><b>Daten.</b> Zweitstimmen: amtliches Endergebnis der Bundestagswahl 2025, Stand 14. März 2025.
Geometrie: Wahlkreiseinteilung zum 21. Deutschen Bundestag, generalisierte Fassung.
Einwohnerzahlen: Strukturdaten der Wahlkreise, Stand 31. Dezember 2023. Alle drei von der
<a href="https://www.bundeswahlleiterin.de/">Bundeswahlleiterin</a>,
<a href="https://www.govdata.de/dl-de/by-2-0">Datenlizenz Deutschland – Namensnennung 2.0</a>.
CDU und CSU sind zusammengefasst.</p>

<p><b>Zur Einwohnerzahl.</b> Gewichtet wird nach der Gesamtbevölkerung. Das gesetzliche Kriterium
für den Zuschnitt der Wahlkreise ist dagegen die deutsche Bevölkerung — deshalb weichen die
Gebiete hier stärker voneinander ab, als es die Vorgabe des Bundeswahlgesetzes vermuten lässt.</p>

<p><b>Verwandt.</b> Was sich seit 2021 verschoben hat, auf demselben Zuschnitt:
<a href="../wandel-2021-2025/">Vier Jahre später, die Hälfte gewechselt</a> ·
dieselbe Wahl auf Ebene der Kreise und Gemeindeverbände:
<a href="../wahlkarte-2025/">Stärkste Partei, Bundestagswahl 2025</a>.</p>
</footer>

</div>

<div id="tip" role="status"></div>

<script>
const D = ${JSON.stringify(daten)};
${ENTPACKER}

function summe(s){const a=entpacke(s);let v=0;for(let i=0;i<a.length;i++){v+=a[i];a[i]=v}return a}

const GX=summe(D.gx), GY=summe(D.gy), KX=summe(D.kx), KY=summe(D.ky);
const ringzahl=entpacke(D.ringzahl), ringlaenge=entpacke(D.ringe), idxRoh=entpacke(D.idx);

// Ringe je Gebiet als Index-Arrays wiederherstellen
const gebietRinge=[]; let rz=0, ip=0;
for(let g=0; g<ringzahl.length; g++){
  const ringe=[];
  for(let r=0; r<ringzahl[g]; r++){
    const n=ringlaenge[rz++]; const arr=new Int32Array(n); let v=0;
    for(let k=0;k<n;k++){ v+=idxRoh[ip++]; arr[k]=v }
    ringe.push(arr);
  }
  gebietRinge.push(ringe);
}

const map=document.getElementById('map');
const tip=document.getElementById('tip');
const NS='http://www.w3.org/2000/svg';

// Farbe: Parteifarbe, zum Papier hin aufgehellt je nach Vorsprung
function mische(hex, anteil){
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  const pr=231, pg=231, pb=227;
  const f=x=>Math.round(x).toString(16).padStart(2,'0');
  return '#'+f(r+(pr-r)*anteil)+f(g+(pg-g)*anteil)+f(b+(pb-b)*anteil);
}

const gebiete=D.gebiete.map((g,i)=>{
  const top=g[8];
  const gueltig=g[5]||1;
  const p1=top[0], p2=top[1];
  const vorsprung=p2 ? (p1[1]-p2[1])/gueltig*100 : 100;
  const anteil=Math.max(0, Math.min(0.62, 0.62-vorsprung/26*0.62));
  return {
    i, nr:g[0], name:g[1], land:g[2], bev:g[3], flaeche:g[4],
    gueltig, wahlberechtigte:g[6], waehlende:g[7], top,
    partei:D.parteien[p1[0]], farbe:mische(D.farben[p1[0]], anteil), vorsprung,
  };
});

// Pfade anlegen
const pfade=gebiete.map(g=>{
  const p=document.createElementNS(NS,'path');
  p.setAttribute('class','k');
  p.setAttribute('fill',g.farbe);
  p.dataset.i=g.i;
  map.appendChild(p);
  return p;
});

let t=0;
function zeichne(){
  for(let i=0;i<pfade.length;i++){
    const ringe=gebietRinge[i]; const teile=[];
    for(const ring of ringe){
      let d='M';
      for(let k=0;k<ring.length;k++){
        const n=ring[k];
        const x=GX[n]+(KX[n]-GX[n])*t;
        const y=GY[n]+(KY[n]-GY[n])*t;
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
  bF.setAttribute('aria-pressed', v<0.02 ? 'true':'false');
  bE.setAttribute('aria-pressed', v>0.98 ? 'true':'false');
  if(!wartet){ wartet=true; requestAnimationFrame(()=>{ wartet=false; zeichne() }) }
}
reg.addEventListener('input',()=>setze(reg.value/1000,{schieber:false}));
bF.addEventListener('click',()=>animiere(0));
bE.addEventListener('click',()=>animiere(1));

function animiere(ziel){
  const start=t, t0=performance.now(), dauer=850;
  (function schritt(jetzt){
    const p=Math.min(1,(jetzt-t0)/dauer);
    const e=p<0.5 ? 4*p*p*p : 1-Math.pow(-2*p+2,3)/2;
    setze(start+(ziel-start)*e);
    if(p<1) requestAnimationFrame(schritt);
  })(t0);
}

// Legende
const leg=document.getElementById('leg');
leg.innerHTML=${JSON.stringify(legende)}.map(([p,n])=>{
  const f=D.farben[D.parteien.indexOf(p)];
  return '<li><i style="background:'+f+'"></i>'+p+' <b>'+n+'</b></li>';
}).join('');

// Tooltip
let aktiv=null;
function zeigeTip(g,ev){
  const zeilen=g.top.slice(0,5).map(([pi,v])=>{
    const anteil=v/g.gueltig*100;
    return '<i style="background:'+D.farben[pi]+'"></i>'+
      '<u style="background:'+D.farben[pi]+';width:'+Math.max(1,anteil*2.4)+'px"></u>'+
      '<b>'+anteil.toFixed(1)+'%</b>';
  }).join('');
  tip.innerHTML='<div class="n">'+g.name+'</div>'+
    '<div class="m">Wahlkreis '+g.nr+' · '+g.land+' · '+g.bev.toLocaleString('de-DE')+' Einwohner</div>'+
    '<div class="bars">'+zeilen+'</div>';
  tip.style.left=ev.clientX+'px';
  tip.style.top=ev.clientY+'px';
  tip.style.opacity='1';
}
map.addEventListener('mousemove',ev=>{
  const el=ev.target.closest('path.k');
  if(!el){ if(aktiv){aktiv.classList.remove('an');aktiv=null} tip.style.opacity='0'; return }
  if(aktiv!==el){ if(aktiv)aktiv.classList.remove('an'); aktiv=el; el.classList.add('an'); el.parentNode.appendChild(el) }
  zeigeTip(gebiete[+el.dataset.i],ev);
});
map.addEventListener('mouseleave',()=>{ if(aktiv){aktiv.classList.remove('an');aktiv=null} tip.style.opacity='0' });

// Knappste Wahlkreise
const knapp=[...gebiete].sort((a,b)=>a.vorsprung-b.vorsprung).slice(0,12);
document.getElementById('knapp').innerHTML=
  '<tr><th>Wahlkreis</th><th>Land</th><th>Stärkste</th><th>Zweite</th><th class="z" style="text-align:right">Abstand</th></tr>'+
  knapp.map(g=>{
    const p1=g.top[0], p2=g.top[1];
    const pk=(pi,txt)=>'<span class="pk"><i style="background:'+D.farben[pi]+'"></i>'+txt+'</span>';
    return '<tr><td>'+g.name+'</td><td>'+g.land+'</td>'+
      '<td>'+pk(p1[0],D.parteien[p1[0]])+'</td>'+
      '<td>'+pk(p2[0],D.parteien[p2[0]])+'</td>'+
      '<td class="z">'+g.vorsprung.toFixed(1)+' Pp.</td></tr>';
  }).join('');
</script>
</body></html>
`);

log('');
log('Fertig. Knoten ' + knoten + ', Median ' + (bilanz.median * 100).toFixed(4) + '%, Max ' + (bilanz.max * 100).toFixed(2) + '%');
