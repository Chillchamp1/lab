// Erzeugt die fertige, in sich geschlossene index.html.
// Aufruf: node build.mjs > ../index.html

import { baueNutzlast } from './nutzlast.mjs';
import { baueSkala } from './palette.mjs';
import { ENTPACKER } from './code.mjs';

const log = s => process.stderr.write(s + '\n');
const { nutz, daten, bilanz, knoten } = baueNutzlast({ gitter: 2000, durchgaenge: 6, log });

// Farbtabelle: 81 Stufen von ganz blau über neutral bis ganz rot.
// Vorab gerechnet, damit die Seite keine Farbraum-Mathematik braucht.
const SKALA = baueSkala({ L: 0.62 });
const STUFEN = 81, MITTE = 40;
const LUT = Array.from({ length: STUFEN }, (_, i) => SKALA.farbe((i - MITTE) / MITTE));
const ROT = LUT[STUFEN - 1], BLAU = LUT[0];

const marge = d => (d.gop - d.dem) / ((d.gop + d.dem) || 1);
const stufe = d => Math.max(0, Math.min(STUFEN - 1, Math.round(MITTE + marge(d) * MITTE)));

const kompakt = daten.map(d => [
  d.name, d.kuerzel, d.gop, d.dem, d.gesamt, d.einwohner, stufe(d), d.gop > d.dem ? 1 : 0,
]);

const conus = daten.filter(d => d.gruppe === 'conus');
const ak = daten.find(d => d.gruppe === 'alaska');
const trumpC = daten.filter(d => d.gop > d.dem), harrisC = daten.filter(d => d.dem >= d.gop);
const E = daten.reduce((a, d) => a + d.einwohner, 0);
const S = daten.reduce((a, d) => a + d.gesamt, 0);
const G = daten.reduce((a, d) => a + d.gop, 0);
const DD = daten.reduce((a, d) => a + d.dem, 0);
const eHarris = harrisC.reduce((a, d) => a + d.einwohner, 0);
const landesweit = (G - DD) / (G + DD);
const sHarris = harrisC.reduce((a, d) => a + d.gesamt, 0);
// Flächengewichteter Farbwert: Fläche folgt den Stimmen, also über Stimmen mitteln
const farbMittel = daten.reduce((a, d) => a + d.gesamt / S * marge(d), 0);
const akRot = ak.gop / (ak.gop + ak.dem) * 100;

const groesste = [...daten].sort((a, b) => b.einwohner - a.einwohner).slice(0, 12);
const knappste = [...daten].filter(d => d.gesamt > 20000)
  .map(d => ({ ...d, abstand: Math.abs(marge(d)) * 100 }))
  .sort((a, b) => a.abstand - b.abstand).slice(0, 12);

const D = {
  gx: nutz.gx, gy: nutz.gy, kx: nutz.kx, ky: nutz.ky,
  idx: nutz.idx, ringe: nutz.ringe, ringzahl: nutz.ringzahl,
  lut: LUT, countys: kompakt,
  grenzLaengen: nutz.grenzLaengen, grenzIdx: nutz.grenzIdx,

};

const zahl = n => Math.round(n).toLocaleString('de-DE');
const mio = n => (n / 1e6).toFixed(2).replace('.', ',');
const kom = (n, st = 1) => n.toFixed(st).replace('.', ',');
const punkt = d => `<span class="punkt" style="background:${LUT[stufe(d)]}"></span>`;

// Farbband für die Legende
const band = Array.from({ length: 80 }, (_, k) =>
  `<i style="background:${SKALA.farbe(-1 + 2 * k / 79)}"></i>`).join('');

process.stdout.write(`<!doctype html>
<html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Die Wahl 2024, nach Stimmen gewichtet</title>
<meta name="description" content="US-Präsidentschaftswahl 2024: alle Countys, verzogen zwischen Fläche und Wählerschaft, mit wahrnehmungsgleicher Farbskala.">
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
svg.map path.k{stroke:var(--karte);stroke-width:1.2;stroke-linejoin:round;cursor:default}
svg.map path.k.an{stroke:#fff;stroke-width:6}
svg.map path.grenze{fill:none;stroke:#4a4e55;stroke-width:15;stroke-linejoin:round;
 stroke-linecap:round;opacity:.55;pointer-events:none}
#tip{position:fixed;pointer-events:none;opacity:0;transform:translate(-50%,-128%);
 background:#16181d;color:#f4f4f2;border-radius:4px;padding:9px 11px;font-size:12.5px;
 line-height:1.4;max-width:290px;z-index:9;transition:opacity .1s}
#tip .n{font-weight:600;font-size:13.5px}
#tip .m{color:#a8acb4;font-size:11.5px;margin-bottom:6px}
#tip .bal{display:flex;height:9px;border-radius:2px;overflow:hidden;margin:5px 0 4px}
#tip .z{display:flex;justify-content:space-between;font-variant-numeric:tabular-nums;font-size:11.5px}
#tip .hin{color:#c8b48a;font-size:11px;margin-top:5px;line-height:1.3}
.skala{display:flex;align-items:center;gap:10px;margin:20px 0 3px;flex-wrap:wrap}
.skala .band{display:flex;flex:1;min-width:220px;height:13px;border-radius:2px;overflow:hidden}
.skala .band i{flex:1;display:block}
.skala .b{color:var(--leise);font-size:12.5px;white-space:nowrap}
.skalaZahlen{display:flex;justify-content:space-between;color:var(--leise);font-size:11.5px;
 font-variant-numeric:tabular-nums;margin:0 0 20px;padding:0 52px}
.waage{display:flex;margin:16px 0 6px;height:30px;border-radius:3px;overflow:hidden;
 font-size:12px;color:#fff;font-variant-numeric:tabular-nums}
.waage div{display:flex;align-items:center;padding:0 9px;white-space:nowrap}
.waage .r{justify-content:flex-end}
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

<h1>Die Wahl 2024,<br>nach Stimmen gewichtet</h1>
<p class="deck">Der Regler verzieht die Karte von der Fläche zur <b>Wählerschaft</b>, bis jede
abgegebene Stimme gleich viel Platz einnimmt. Alaska und Hawaii stehen oben, im selben Massstab —
Alaska schrumpft dabei auf ein Zehntel seiner Kantenlänge. Trump gewann
<b>${zahl(trumpC.length)} der ${zahl(daten.length)} Gebiete</b>, Harris <b>${zahl(harrisC.length)}</b>;
in diesen ${(harrisC.length / daten.length * 100).toFixed(0)} Prozent der Gebiete liegen aber
<b>${kom(sHarris / S * 100, 0)} Prozent aller Stimmen</b>. Landesweit trennt beide nur
<b>${kom(Math.abs(landesweit) * 100)} Punkte</b>.</p>

<div class="ends"><span>Fläche</span><span>Einwohner</span></div>
<div class="ctrl">
  <input type="range" id="reg" min="0" max="1000" value="0" step="1" aria-label="Verzerrung zwischen Fläche und Einwohnerzahl">
  <div class="seg">
    <button id="bPlay" aria-pressed="false">Abspielen</button>
  </div>
  <div class="seg">
    <button id="bF" aria-pressed="true">Fläche</button>
    <button id="bE" aria-pressed="false">Einwohner</button>
  </div>
  <div class="seg">
    <button id="mVor" aria-pressed="true">Vorsprung</button>
    <button id="mSieg" aria-pressed="false">nur Sieger</button>
  </div>
</div>

<figure>
  <svg class="map" id="map" viewBox="${nutz.sicht.join(' ')}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Karte aller Countys, Alaska und Hawaii oben"></svg>
</figure>

<div class="skala">
  <span class="b">Harris</span><span class="band">${band}</span><span class="b">Trump</span>
</div>
<div class="skalaZahlen"><span>+100</span><span>+50</span><span>gleichauf</span><span>+50</span><span>+100</span></div>
<p class="deck" style="margin:-8px 0 18px;font-size:14px">Weil die Fläche der Wählerschaft folgt und
die Skala an beiden Enden gleich kräftig ist, liegt der <b>Farbdurchschnitt der ganzen Karte</b> nahe
am Landesergebnis: ${kom(farbMittel * 100, 2)} gegen ${kom(landesweit * 100, 2)} Punkte für Trump.</p>

<div class="waage">
  <div style="background:${ROT};width:${(G / S * 100).toFixed(2)}%">Trump ${kom(G / S * 100)} %</div>
  <div class="r" style="background:${BLAU};width:${(DD / S * 100).toFixed(2)}%">Harris ${kom(DD / S * 100)} %</div>
  <div style="background:#9aa0a6;flex:1"></div>
</div>
<div class="waageBesch"><span>${mio(G)} Mio Stimmen</span><span>${mio(DD)} Mio Stimmen</span></div>

<h2 class="sec">Die zwölf grössten Gebiete</h2>
<p class="deck" style="margin-bottom:0">Nach Einwohnern — im Kartogramm nehmen sie den Platz ein,
den sie auf der Landkarte nicht haben.</p>
<div class="scroll"><table class="t">
<tr><th>Gebiet</th><th>Staat</th><th class="z">Einwohner</th><th class="z">Trump</th><th class="z">Harris</th></tr>
${groesste.map(d => `<tr><td>${punkt(d)}${d.name}</td><td>${d.kuerzel}</td>` +
  `<td class="z">${zahl(d.einwohner)}</td><td class="z">${kom(d.gop / d.gesamt * 100)} %</td>` +
  `<td class="z">${kom(d.dem / d.gesamt * 100)} %</td></tr>`).join('\n')}
</table></div>

<h2 class="sec">Die knappsten Gebiete</h2>
<p class="deck" style="margin-bottom:0">Kleinster Abstand zwischen beiden Bewerbern, unter den
Gebieten mit mehr als 20.000 abgegebenen Stimmen — in Prozentpunkten der beiden.</p>
<div class="scroll"><table class="t">
<tr><th>Gebiet</th><th>Staat</th><th class="z">Stimmen</th><th class="z">Abstand</th></tr>
${knappste.map(d => `<tr><td>${punkt(d)}${d.name}</td><td>${d.kuerzel}</td>` +
  `<td class="z">${zahl(d.gesamt)}</td><td class="z">${kom(d.abstand, 2)} Pp.</td></tr>`).join('\n')}
</table></div>

<footer>
<p><b>Umfang.</b> Die ${zahl(conus.length)} Countys des Festlands samt Washington DC, dazu Hawaii
mit vier Countys und Alaska. Alle drei stehen im <b>selben Massstab</b>: auf der Landkarte gilt
überall dieselbe Fläche je Bildpunkt, im Kartogramm überall dieselbe Zahl Stimmen. Alaska ist
deshalb auf der Landkarte so gross zu sehen, wie es wirklich ist — und schrumpft im Kartogramm auf
ein Zehntel seiner Kantenlänge. Übliche Karten verkleinern Alaska stillschweigend; hier wäre das
gerade der Fehler, den die Darstellung zeigen will.</p>

<p><b>Alaska als ein Gebiet.</b> Der Staat zählt nicht nach Boroughs aus, sondern nach Wahlbezirken
des Staatsparlaments. Ergebnisse auf Borough-Ebene gibt es nicht, deshalb erscheint Alaska
ungeteilt mit dem Landesergebnis: Trump ${kom(akRot)} zu Harris ${kom(100 - akRot)} Prozent.
Innerhalb Alaskas ist die Karte also stumm. Kalawao auf Molokaʻi — 81 Einwohner, die frühere
Leprakolonie — wählt mit Maui und ist dort eingerechnet. Connecticut erscheint mit den
Planungsregionen, die 2022 an die Stelle der Countys traten; Washington DC ist aus seinen acht
Wards zusammengefasst.</p>

<p><b>Warum nach Stimmen.</b> Gewichtet wird nach den abgegebenen Stimmen, nicht nach der
Bevölkerung: eine Wahlkarte soll zeigen, wo die Stimmen herkommen, nicht wo Menschen wohnen. Die
Wahlbeteiligung je Einwohner schwankt zwischen den Gebieten um den Faktor 1,8, und genau diese
Schwankung verschob früher das Bild. Der Nebeneffekt ist der wichtigere: Farbmenge mal Fläche
summiert sich jetzt fast genau zum Landesergebnis. Der Rest von ${kom(Math.abs(landesweit - farbMittel) * 100, 2)}
Punkten geht auf die Drittparteien, die 1,7 Prozent der Stimmen halten und in der Zweifarbenskala
nicht vorkommen.</p>

<p><b>Staatsgrenzen.</b> Die dunklen Linien sind Bundesstaatsgrenzen, abgeleitet aus den
Countygrenzen: wo die Nachbarschaft über eine Staatsgrenze läuft, wird die Kante gezeichnet. Ohne
sie ist das Kartogramm kaum zu verorten — die Countys verlieren beim Verziehen ihre Form, und es
fehlt die Zwischenebene, an der sich das Auge festhält.</p>

<p><b>Die Farben.</b> Rot und Blau sind hier nicht die üblichen. Eine naive Wahlkartenpalette aus
reinem Rot und Blau ist wahrnehmungstechnisch schief: die beiden trennen in OKLab 0,18
Helligkeitspunkte, Rot wirkt dadurch heller, näher und schwerer. Diese Skala hat an beiden Enden
<b>dieselbe Helligkeit und dieselbe Buntheit</b> — gemessen 0,004 Unterschied — und eine neutrale
graue Mitte. Die Menge an Farbe entspricht damit dem Vorsprung, nicht der Laune des Auges: ein
Gebiet bei fünfzig zu fünfzig ist grau, nicht kräftig violett.</p>

<p><b>Was die Farbe trotzdem nicht kann.</b> Auch eine ausgewogene Skala verrät nicht zuverlässig,
wer landesweit führt: grosse zusammenhängende Flächen wirken schwerer als ein feines Netz gleicher
Gesamtfläche. Rechnerisch stimmt der Farbdurchschnitt jetzt bis auf
${kom(Math.abs(landesweit - farbMittel) * 100, 2)} Punkte, optisch bleibt ein Rest. Wer die Zahl will, liest den Balken. Der Umschalter <i>nur Sieger</i> zeigt zum
Vergleich die übliche Darstellung, in der ein Gebiet mit 50,1 Prozent genauso aussieht wie eines
mit 90.</p>

<p><b>Verzerrung.</b> Diffusionskartogramm nach Gastner und Newman (2004) auf flächentreuer
Albers-Projektion. Festland und Hawaii werden gerechnet; Alaska ist ein einziges Gebiet, sein
Kartogramm ist deshalb eine reine Skalierung und exakt. Beide Zustände benutzen dieselben
${zahl(knoten)} Stützpunkte. Nach Einwohnern gewichtet liegt die Abweichung auf dem Festland bei
${kom(bilanz.conus.gewichtet)} Prozent; ${kom(bilanz.conus.flaecheGut, 0)} Prozent der Kartenfläche
entfallen auf Gebiete mit weniger als 20 Prozent Abweichung. Die grössten relativen Fehler treffen
menschenleere Countys, die auf beiden Karten zu klein sind, um aufzufallen.</p>

<p><b>Daten.</b> Grenzen und Einwohnerzahlen (Schätzung 2024) vom
<a href="https://www.census.gov/">US Census Bureau</a>. Wahlergebnisse aus der gepflegten Sammlung
<a href="https://github.com/tonmcg/US_County_Level_Election_Results_08-24">tonmcg/US_County_Level_Election_Results_08-24</a>
— in den USA führt keine Bundesbehörde die Ergebnisse zusammen, Wahlen sind Sache der Staaten.
Zusammen ergeben die Gebiete ${mio(G)} Millionen Stimmen für Trump und ${mio(DD)} Millionen für
Harris.</p>

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

const map=document.getElementById('map'), tip=document.getElementById('tip');
const NS='http://www.w3.org/2000/svg';
const ROT=D.lut[D.lut.length-1], BLAU=D.lut[0];

const countys = D.countys.map((c,i)=>{
  const [name, staat, gop, dem, gesamt, einwohner, st, trump] = c;
  return { i, name, staat, gop, dem, gesamt: gesamt||1, einwohner,
           farbeVorsprung: D.lut[st], farbeSieger: trump ? ROT : BLAU };
});

// Staatsgrenzen als Linienzüge, aus denselben Knoten wie die Countys
const grenzLaengen=entpacke(D.grenzLaengen), grenzRoh=entpacke(D.grenzIdx);
const grenzZuege=[]; { let p=0;
  for(const n of grenzLaengen){ const a=new Int32Array(n); let v=0;
    for(let k=0;k<n;k++){ v+=grenzRoh[p++]; a[k]=v } grenzZuege.push(a) } }

const pfade = countys.map(c=>{
  const p=document.createElementNS(NS,'path');
  p.setAttribute('class','k'); p.setAttribute('fill',c.farbeVorsprung); p.dataset.i=c.i;
  // Alaska ist ein Gebiet mit einem Wert; die Borough-Grenzen darin wuerden
  // Daten vortaeuschen, die es nicht gibt.
  // Inline-Stil, weil die Klassenregel ein stroke-Attribut ueberstimmen wuerde
  if(c.staat==='AK') p.style.stroke='none';
  map.appendChild(p);
  return p;
});

const grenzPfad=document.createElementNS(NS,'path');
grenzPfad.setAttribute('class','grenze');
map.appendChild(grenzPfad);

let t=0, modus='vorsprung';
function zeichne(){
  for(let i=0;i<pfade.length;i++){
    const ringe=gebietRinge[i]; const teile=[];
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
  const g=[];
  for(const zug of grenzZuege){
    let d='M';
    for(let k=0;k<zug.length;k++){
      const n=zug[k];
      const x=GX[n]+(KX[n]-GX[n])*t, y=GY[n]+(KY[n]-GY[n])*t;
      d+=(k?'L':'')+Math.round(x)+' '+Math.round(y);
    }
    g.push(d);
  }
  grenzPfad.setAttribute('d',g.join(''));
}
function faerbe(){
  for(let i=0;i<pfade.length;i++)
    pfade[i].setAttribute('fill', modus==='sieger' ? countys[i].farbeSieger : countys[i].farbeVorsprung);
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
bF.addEventListener('click',()=>{ halte(); animiere(0) });
bE.addEventListener('click',()=>{ halte(); animiere(1) });

// Endlosschleife zwischen Fläche und Einwohnerzahl, mit Halt an beiden Enden.
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
  // dort einsteigen, wo der Regler steht: Vorwaertsschenkel der Schleife
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
reg.addEventListener('pointerdown', halte);
function setzeModus(m){
  modus=m;
  mVor.setAttribute('aria-pressed', m==='vorsprung'?'true':'false');
  mSieg.setAttribute('aria-pressed', m==='sieger'?'true':'false');
  faerbe();
}
mVor.addEventListener('click',()=>setzeModus('vorsprung'));
mSieg.addEventListener('click',()=>setzeModus('sieger'));

let aktiv=null;
function zeigeTip(c,ev){
  const pg=c.gop/c.gesamt*100, pd=c.dem/c.gesamt*100;
  const vor=(c.gop-c.dem)/(c.gop+c.dem)*100;
  const kom=(x,n)=>x.toFixed(n).replace('.',',');
  tip.innerHTML='<div class="n">'+c.name+'</div>'+
    '<div class="m">'+c.staat+' · '+c.einwohner.toLocaleString('de-DE')+' Einwohner</div>'+
    '<div class="bal"><div style="background:'+ROT+';width:'+pg.toFixed(1)+'%"></div>'+
      '<div style="background:'+BLAU+';width:'+pd.toFixed(1)+'%"></div>'+
      '<div style="background:#5c6067;flex:1"></div></div>'+
    '<div class="z"><span>Trump '+kom(pg,1)+' %</span><span>'+kom(pd,1)+' % Harris</span></div>'+
    '<div class="z" style="margin-top:3px;color:#a8acb4"><span>Vorsprung '+kom(Math.abs(vor),1)+' Punkte</span></div>'+
    (c.staat==='AK' ? '<div class="hin">Landesergebnis — Alaska zählt nicht nach Boroughs aus</div>' : '');
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
log(`Fertig. ${daten.length} Gebiete, ${knoten} Knoten, Skala L=${SKALA.L} C=${SKALA.C.toFixed(3)}`);
