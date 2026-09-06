// Erzeugt die fertige, in sich geschlossene index.html.
// Aufruf: node build.mjs > ../index.html

import { readFileSync } from 'node:fs';
import { baueNutzlast, ZUGABEN } from './nutzlast.mjs';
import { ENTPACKER } from './code.mjs';
import { NETZE, KAPPUNG, GRAD } from './geometrie.mjs';

const BROWSER = readFileSync('seite.js', 'utf8');
const log = s => process.stderr.write(s + '\n');
const { laender, nutz, punkte } = baueNutzlast({ log });

const iM = NETZE.findIndex(n => n.id === 'mercator');
const zaehlt = l => l.iso !== 'ATA';

// Anteil eines Kontinents an der gezeigten Landfläche, je Netz.
const kont = {};
for (const l of laender.filter(zaehlt)) {
  const k = kont[l.kontinent] ??= { anteil: NETZE.map(() => 0), wahr: 0, einw: 0 };
  NETZE.forEach((n, i) => { k.anteil[i] += l.anteilWahr * l.faktor[i]; });
  k.wahr += l.anteilWahr;
  k.einw += l.einwohner;
}
const nordAnteil = i => (kont['Europe'].anteil[i] + kont['North America'].anteil[i]) * 100;
log(`  Europa + Nordamerika: Mercator ${nordAnteil(iM).toFixed(0)} %, in Wahrheit ${(  (kont['Europe'].wahr + kont['North America'].wahr) * 100).toFixed(0)} %`);

const kompakt = laender.map(l => [
  l.name, l.iso, l.kontinent,
  Math.round(l.wahr),
  l.einwohner,
  ...l.faktor.map(f => Math.round(f * 1000)),
]);

const kontinentZeilen = Object.entries(kont)
  .filter(([k]) => k !== 'Seven seas (open ocean)')
  .sort((a, b) => b[1].anteil[iM] - a[1].anteil[iM])
  .map(([k, v]) => [
    { Europe: 'Europa', 'North America': 'Nordamerika', Asia: 'Asien', Africa: 'Afrika',
      'South America': 'Südamerika', Oceania: 'Ozeanien' }[k] ?? k,
    ...v.anteil.map(a => +(a * 100).toFixed(1)),
    Math.round(v.einw / 1e6),
  ]);

const daten = {
  netze: NETZE.map(n => ({ id: n.id, name: n.name, jahr: n.jahr, art: n.art })),
  kappung: +(KAPPUNG / GRAD).toFixed(0),
  gitter: nutz.gitter,
  lon: nutz.lon, lat: nutz.lat, ringe: nutz.ringe, ringzahl: nutz.ringzahl,
  laender: kompakt,
  kontinente: kontinentZeilen,
  zugaben: ZUGABEN,
};

const SEITE = `<!doctype html>
<html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>164 zu 1 für eine neue Weltkarte</title>
<meta name="description" content="Die UN-Vollversammlung hat am 4. September 2026 auf Antrag Togos für flächentreue Weltkarten gestimmt. Ein Regler zeigt, was der Wechsel von Mercator auf Equal Earth ausmacht.">
<style>
:root{--papier:#f4f4f2;--tinte:#16181d;--leise:#6a6f79;--linie:#d8d8d4;--karte:#edebe6;
 --zuklein:#1d6f78;--mitte:#e6e0d3;--zugross:#a8402b;--akzent:#8a5a2b}
*{box-sizing:border-box}
body{margin:0;background:var(--papier);color:var(--tinte);
 font-family:"Inter","Helvetica Neue",Helvetica,Arial,sans-serif;font-size:15px;line-height:1.55}
.wrap{max-width:1020px;margin:0 auto;padding:38px 20px 70px}
h1{font-family:Georgia,"Times New Roman",serif;font-weight:400;
 font-size:clamp(30px,5.4vw,50px);line-height:1.08;letter-spacing:-.015em;margin:0 0 14px}
.deck{color:var(--leise);max-width:62ch;margin:0 0 26px;font-size:16px}
.deck b{color:var(--tinte);font-weight:600}
.ctrl{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin:0 0 6px}
.seg{display:inline-flex;flex-wrap:wrap;border:1px solid var(--linie);border-radius:3px;overflow:hidden}
.seg button{background:transparent;color:var(--leise);border:0;font:inherit;font-size:13.5px;
 padding:9px 13px;cursor:pointer;white-space:nowrap}
.seg button+button{border-left:1px solid var(--linie)}
@media(max-width:520px){
  .seg{display:grid;grid-template-columns:1fr 1fr;width:100%}
  .seg button+button{border-left:0}
  .seg button:nth-child(2n){border-left:1px solid var(--linie)}
  .seg button:nth-child(n+3){border-top:1px solid var(--linie)}
}
.seg button[aria-pressed="true"]{background:var(--tinte);color:var(--papier)}
.seg button:focus-visible{outline:2px solid var(--akzent);outline-offset:-2px}
.ctrl input[type=range]{flex:1;min-width:190px;accent-color:var(--tinte)}
.ends{display:flex;justify-content:space-between;color:var(--leise);font-size:12.5px;margin:0 0 4px}
.schalter{display:flex;gap:18px;flex-wrap:wrap;margin:12px 0 0;color:var(--leise);font-size:13.5px}
.schalter label{display:inline-flex;align-items:center;gap:6px;cursor:pointer}
.schalter input{accent-color:var(--tinte)}
.lgd{display:flex;flex-wrap:wrap;gap:6px 20px;margin:10px 0 0;color:var(--leise);font-size:13px}
.lgd[hidden]{display:none}
.lgd span{display:inline-flex;align-items:center;gap:8px}
.lgd i{width:26px;height:0;border-top-width:2px;display:block;flex:none}
.lgd i.lox{border-top-style:dashed;border-top-color:var(--akzent)}
.lgd i.gk{border-top-style:solid;border-top-color:var(--tinte)}
.lgd .wo{opacity:.75;font-style:italic}
figure{margin:14px -8px 0}
canvas{width:100%;height:auto;display:block;background:var(--karte);border-radius:2px;touch-action:pan-y}
.skala{display:flex;align-items:center;gap:10px;margin:16px 0 0;color:var(--leise);font-size:12.5px}
.skala .bar{flex:0 0 210px;height:10px;border-radius:2px;
 background:linear-gradient(90deg,var(--zuklein),var(--mitte),var(--zugross))}
h2.sec{font-family:Georgia,serif;font-weight:400;font-size:26px;margin:46px 0 10px;
 padding-top:26px;border-top:1px solid var(--linie)}
p.sec{max-width:70ch;color:var(--leise)}
p.sec b{color:var(--tinte);font-weight:600}
table{border-collapse:collapse;width:100%;font-size:14px;margin-top:10px}
th,td{text-align:left;padding:7px 10px 7px 0;border-bottom:1px solid var(--linie)}
th{color:var(--leise);font-weight:400;font-size:12.5px}
td.z,th.z{text-align:right;font-variant-numeric:tabular-nums}
.zwei{display:grid;grid-template-columns:1fr 1fr;gap:0 34px}
@media(max-width:640px){.zwei{grid-template-columns:1fr}}
.tabelle-scroll{overflow-x:auto}
#tip{position:fixed;pointer-events:none;opacity:0;transform:translate(-50%,-128%);
 background:#16181d;color:#f4f4f2;border-radius:4px;padding:9px 11px;font-size:12.5px;
 line-height:1.45;max-width:280px;z-index:9;transition:opacity .1s}
#tip .n{font-weight:600;font-size:13.5px}
#tip .m{color:#a8acb4;font-size:11.5px;margin-bottom:5px}
#tip .f{margin-top:6px;padding-top:5px;border-top:1px solid #33363d}
footer{margin-top:46px;padding-top:22px;border-top:1px solid var(--linie);
 color:var(--leise);font-size:13px;max-width:78ch}
footer a{color:var(--akzent)}
footer p{margin:0 0 11px}
</style></head><body>
<div class="wrap">

<h1>164 zu 1 für<br>eine neue Weltkarte</h1>
<p class="deck">Am <b>4. September 2026</b> hat die UN-Vollversammlung auf Antrag
<b>Togos</b>, eingebracht für die afrikanischen Mitgliedstaaten, die Resolution
<b>„Correct the Map"</b> angenommen: 164 Stimmen dafür, eine dagegen, sechs Enthaltungen.
Sie verbietet Mercator nicht, sondern ruft Regierungen, Schulen, Organisationen und
Technikkonzerne dazu auf, <b>flächentreue</b> Karten zu benutzen, wo es auf
Grössenverhältnisse ankommt — namentlich <b>Equal Earth</b>.</p>
<p class="deck">Worum es dabei geht, lässt sich messen. Auf der Mercator-Karte belegen
Europa und Nordamerika zusammen <b>${nordAnteil(iM).toFixed(0)} %</b> der gezeigten
Landfläche; zustehen würden ihnen
<b>${((kont['Europe'].wahr + kont['North America'].wahr) * 100).toFixed(0)} %</b>.
Der Regler blendet um. Die Farbe zeigt für jedes Land, wie viel Bildfläche es
bekommt, gemessen an seinem wirklichen Anteil an der Landfläche der Erde — und wie
diese Verzerrung dabei verschwindet.</p>

<div class="ends"><span id="startName"></span><span id="zielName"></span></div>
<div class="ctrl">
  <input type="range" id="reg" min="0" max="1000" value="0" step="1" aria-label="Überblendung zwischen Mercator und dem gewählten Netz">
  <div class="seg" id="ziele" role="group" aria-label="Kartennetz"></div>
</div>
<div class="schalter">
  <label><input type="checkbox" id="cGrad" checked> Gradnetz</label>
  <label><input type="checkbox" id="cTissot"> Tissot-Kreise (je 800 km Radius)</label>
  <label><input type="checkbox" id="cKurs"> Kurs- und Grosskreislinien</label>
</div>
<p class="lgd" id="lgdKurs" hidden>
  <span><i class="lox"></i>Kurslinie — gleichbleibender Kompasskurs (Loxodrome)</span>
  <span><i class="gk"></i>kürzester Weg (Grosskreis)</span>
  <span class="wo">New York – Lissabon und Frankfurt – Tokio</span>
</p>

<figure><canvas id="karte" role="img" aria-label="Weltkarte, überblendbar zwischen der Mercator-Projektion und einem flächentreuen Netz. Die Zahlen dazu stehen in den Tabellen darunter."></canvas></figure>

<div class="skala">
  <span>halb so viel Bildfläche wie zustehend</span>
  <span class="bar" aria-hidden="true"></span>
  <span>doppelt so viel</span>
</div>

<h2 class="sec">Was beschlossen wurde</h2>
<p class="sec">Die Resolution trägt den Titel <i>„Correct the Map: Rebalancing global
cartographic representation and promoting equitable representation of the world's
regions, particularly Africa"</i>. Sie ist <b>nicht bindend</b> — die UN kann weder
Google Maps noch Schulbuchverlage oder Landesvermessungsämter zu etwas zwingen.
Gegen die Resolution stimmten die Vereinigten Staaten als einziges Land; enthalten
haben sich Estland, Georgien, Litauen, Moldau, Serbien und die Ukraine.</p>
<p class="sec">Vorgeschrieben wird kein bestimmtes Netz, gefordert wird
<b>Flächentreue</b>. Genannt wird Equal Earth, entwickelt 2018 von Bojan Šavrič,
Tom Patterson und Bernhard Jenny — flächentreu und dabei auf erkennbare Umrisse hin
gebaut. Dass „flächentreu" die Form noch nicht festlegt, zeigt der Vergleich mit
<b>Gall-Peters</b>: dieselbe Flächenbilanz, in der Tabelle unten deshalb dieselbe
Spalte, und trotzdem eine ganz andere Karte. <b>Robinson</b> ist zum Vergleich mit
dabei und gehört nicht dazu — es ist ein Kompromissnetz und bleibt auf halbem Weg
stehen, wie die Zahlen zeigen.</p>

<h2 class="sec">Wer wie viel Platz bekommt</h2>
<p class="sec">Anteil an der gezeigten Landfläche, Antarktis nicht mitgerechnet.
Gall-Peters und Equal Earth sind beide flächentreu und liefern deshalb dieselbe
Spalte — der Unterschied zwischen ihnen liegt allein in der Form.
Robinson ist ein Kompromiss und bleibt auf halbem Weg stehen.</p>
<div class="tabelle-scroll"><table id="tKont"></table></div>

<h2 class="sec">Grösste Veränderung</h2>
<p class="sec">Länder über 150.000 km², sortiert danach, wie sich ihr Anteil an der
Bildfläche beim Wechsel von Mercator auf <b id="zielName2">Equal Earth</b> ändert.</p>
<div class="zwei">
  <div class="tabelle-scroll"><table id="tVerlust"></table></div>
  <div class="tabelle-scroll"><table id="tGewinn"></table></div>
</div>

<h2 class="sec">Was Mercator dafür kann</h2>
<p class="sec">Mercator ist nicht falsch, sondern für die Navigation gebaut: eine Linie
konstanten Kompasskurses — eine <b>Loxodrome</b> — ist dort eine Gerade, und das war
1569 die ganze Aufgabe. Schalte oben die Kurslinien ein: <b>gestrichelt</b> der
konstante Kurs, <b>durchgezogen</b> der Grosskreis, also der wirklich kürzeste Weg.
Der Bogen, den man sieht, ist immer der Grosskreis.</p>
<p class="sec">Wie gerade die gestrichelte Linie ist, lässt sich messen — grösster
Abstand von der geraden Verbindung, in Prozent der Streckenlänge:</p>
<div class="tabelle-scroll"><table>
<tr><th>Strecke</th><th class="z">Mercator, Kurslinie</th><th class="z">Mercator, Grosskreis</th><th class="z">Equal Earth, Grosskreis</th></tr>
<tr><td>New York – Lissabon</td><td class="z">0,00 %</td><td class="z">10,1 %</td><td class="z">9,8 %</td></tr>
<tr><td>Frankfurt – Tokio</td><td class="z">0,00 %</td><td class="z">31,4 %</td><td class="z">17,8 %</td></tr>
</table></div>
<p class="sec">Null Prozent, und zwar für jede beliebige Strecke — das ist keine
Näherung, sondern die Eigenschaft, für die das Netz gebaut wurde. Umgekehrt gilt es
nicht: der Grosskreis wird auf keinem der Netze hier gerade, er biegt sich nur
weniger. Dafür bräuchte es ein gnomonisches Netz, das dann wiederum nicht einmal eine
Halbkugel am Stück zeigen kann. Der Preis für die gerade Kurslinie ist die
Flächenverzerrung; beides zugleich geht auf einer ebenen Karte nicht.</p>

<footer>
<p><b>Geometrie:</b> <a href="https://www.naturalearthdata.com/">Natural Earth</a>,
<code>ne_50m_admin_0_countries</code> — ${laender.length} Staaten und Gebiete,
${punkte.toLocaleString('de-DE')} Punkte. Gemeinfrei. Einwohnerzahlen aus demselben
Datensatz (<code>POP_EST</code>, überwiegend Stand 2019) und deshalb nur grob.</p>
<p><b>Flächen</b> sind aus der Geometrie selbst gerechnet, als Linienintegral auf der
Kugel, nicht aus einer Tabelle übernommen. Probe: das Ergebnis stimmt auf vier
Nachkommastellen mit dem Weg über eine flächentreue Projektion überein, und die
beiden flächentreuen Netze liefern untereinander auf 0,03 % dieselben Anteile.</p>
<p><b>Mercator</b> ist bei ${(KAPPUNG / GRAD).toFixed(0)}° gekappt — der Flächenmassstab beträgt dort schon
das ${(1 / Math.cos(KAPPUNG) ** 2).toFixed(0)}-fache, bei 85° das ${(1 / Math.cos(85 * GRAD) ** 2).toFixed(0)}-fache. Die Antarktis bleibt trotzdem im
Bild; gerade sie zeigt, was an den Polen passiert. Bei den Anteilen zählt sie nicht mit.
Alle Netze sind auf dieselbe Äquatorlänge normiert, damit die Überblendung nur das
Netz ändert und nicht zusätzlich die Grösse.</p>
<p><b>Zur Resolution:</b> <a href="https://news.un.org/en/story/2026/09/1168284">UN
News</a>, <a href="https://www.handelsblatt.com/politik/international/kritik-an-ueblicher-darstellung-un-stimmen-auf-antrag-togos-fuer-reform-der-weltkarte/100252209.html">Handelsblatt</a>,
<a href="https://www.zdfheute.de/panorama/un-resolution-weltkarten-100.html">ZDF</a>.
Abstimmung vom 4. September 2026.</p>
<p>Teil von <a href="../">lab</a>. Quelle und Bauskripte auf
<a href="https://github.com/Chillchamp1/lab/tree/main/weltkarte-projektionen">GitHub</a>.</p>
</footer>

</div>
<div id="tip" aria-hidden="true"></div>

<script>
const D=${JSON.stringify(daten)};
${ENTPACKER}
</script>
<script>
${BROWSER}
</script>
</body></html>
`;

process.stdout.write(SEITE);
