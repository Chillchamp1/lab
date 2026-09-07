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
  1000,                                   // Globus: keine Verzerrung, Faktor 1
]);

// Die Kontinentnamen kommen schon englisch aus Natural Earth (CONTINENT).
const kontinentZeilen = Object.entries(kont)
  .filter(([k]) => k !== 'Seven seas (open ocean)')
  .sort((a, b) => b[1].anteil[iM] - a[1].anteil[iM])
  .map(([k, v]) => [
    k,
    ...v.anteil.map(a => +(a * 100).toFixed(1)),
    Math.round(v.einw / 1e6),
  ]);

const daten = {
  netze: [
    ...NETZE.map(n => ({ id: n.id, name: n.name, jahr: n.jahr, art: n.art })),
    // Der Globus wird nicht hier gerechnet, sondern im Browser aus den
    // Einheitsvektoren auf der Kugel — er hängt an der Drehung.
    // Nicht „undistorted". Die Kugel selbst ist es, ihr Bild auf einem flachen
    // Schirm aber nicht — und genau das misst die Seite ja mit und schreibt es
    // eine Zeile tiefer hin (1,00× in der Mitte, 0,00× am Rand). „Unverzerrt"
    // hätte der eigenen Messung widersprochen.
    { id: 'globus', name: 'Globe', jahr: null, art: 'the sphere itself, seen from outside' },
  ],
  kappung: +(KAPPUNG / GRAD).toFixed(0),
  gitter: nutz.gitter,
  lon: nutz.lon, lat: nutz.lat, ringe: nutz.ringe, ringzahl: nutz.ringzahl,
  laender: kompakt,
  kontinente: kontinentZeilen,
  zugaben: ZUGABEN,
};

const SEITE = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>164 to 1 for a new world map</title>
<meta name="description" content="On 4 September 2026 the UN General Assembly voted, on Togo's motion, for equal-area world maps. A slider shows what the switch from Mercator to Equal Earth actually changes.">
<style>
:root{--papier:#f4f4f2;--tinte:#16181d;--leise:#6a6f79;--linie:#d8d8d4;--karte:#edebe6;
 --zuklein:#0c5480;--mitte:#c9c3b9;--zugross:#8a3910;--akzent:#8a5a2b}
*{box-sizing:border-box}
body{margin:0;background:var(--papier);color:var(--tinte);
 font-family:"Inter","Helvetica Neue",Helvetica,Arial,sans-serif;font-size:15px;line-height:1.55}
.wrap{max-width:1020px;margin:0 auto;padding:22px 20px 70px}

/* ---- Der Kopf der Seite: Karte, Zustandszeile, Legende, Bedienung ---- */
figure{margin:0 -8px}
canvas{width:100%;height:auto;display:block;background:var(--karte);border-radius:2px;touch-action:none}
/* Solange der Globus im Bild ist, gehört der Zug der Kugel, nicht der Seite.
   touch-action wird dafür in zeigerHaltung() umgeschaltet. */

.triWrap{position:relative;width:100%;max-width:300px;margin:22px 0 0}
.tri{display:block;width:100%;height:auto;overflow:visible;cursor:grab;touch-action:none}
.tri.zieht{cursor:grabbing}
.tri .kante{fill:none;stroke:var(--linie);stroke-width:1.5}
.tri .ecke{fill:var(--linie)}
.tri text{fill:var(--leise);font-family:inherit;font-size:12px}
.tri .kugel{fill:var(--tinte);stroke:var(--papier);stroke-width:2.5;pointer-events:none}
.tri .feld{fill:transparent}
.triSpiel{position:absolute;left:0;top:0;
 width:52px;height:52px;border-radius:50%;border:1px solid var(--linie);
 background:var(--papier);color:var(--leise);font:inherit;font-size:12px;
 cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}
.triSpiel:hover{border-color:var(--leise);color:var(--tinte)}
.triSpiel[aria-pressed="true"]{background:var(--tinte);color:var(--papier);border-color:var(--tinte)}
.triSpiel:focus-visible{outline:2px solid var(--akzent);outline-offset:2px}

.skala{margin:16px 0 0;max-width:460px}
.skala .titel{display:block;color:var(--leise);font-size:12.5px;margin:0 0 6px}
.skala .bar{position:relative;display:block;height:10px;border-radius:2px;
 background:linear-gradient(90deg,var(--zuklein),var(--mitte),var(--zugross))}
.skala .bar i{position:absolute;top:0;bottom:0;width:1px;background:rgba(244,244,242,.7)}
.skala .bar b{position:absolute;left:0;width:100%;top:calc(100% + 3px);height:3px;
 border-radius:2px;background:var(--tinte);transition:left .12s linear,width .12s linear}
.skala .marken{position:relative;display:block;height:15px;margin-top:9px;
 color:var(--leise);font-size:11.5px;font-variant-numeric:tabular-nums}
.skala .marken span{position:absolute;transform:translateX(-50%);white-space:nowrap}
.skala .marken span:first-child{transform:none}
.skala .marken span:last-child{transform:translateX(-100%)}
.skala .marken b{color:var(--tinte);font-weight:600}

.ctrl{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin:22px 0 0}
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
.hinweis{margin:14px 0 0;max-width:70ch;color:var(--leise);font-size:14px}
.hinweis b{color:var(--tinte);font-weight:600}

/* ---- Darunter: worum es geht ---- */
h1{font-family:Georgia,"Times New Roman",serif;font-weight:400;
 font-size:clamp(28px,4.8vw,44px);line-height:1.1;letter-spacing:-.015em;
 margin:54px 0 14px;padding-top:30px;border-top:1px solid var(--linie)}
.deck{color:var(--leise);max-width:62ch;margin:0 0 20px;font-size:16px}
.deck b{color:var(--tinte);font-weight:600}
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

<figure><canvas id="karte" role="img" aria-label="World map that cross-fades between the Mercator projection, an equal-area projection and a globe. Colour shows how much image area each country gets compared with its true share of the world's land. Drag sideways to move the centre of the map; on the globe, drag to turn it. The numbers are in the tables further down."></canvas></figure>

<div class="skala">
  <span class="titel">Image area a country gets, against its true share of the world's land</span>
  <span class="bar" aria-hidden="true"><i style="left:18.4%"></i><i style="left:50%"></i><i style="left:81.6%"></i><b id="spanne"></b></span>
  <span class="marken" aria-hidden="true">
    <span style="left:0%">⅓×</span><span style="left:18.4%">½×</span>
    <span style="left:50%"><b>1×</b></span>
    <span style="left:81.6%">2×</span><span style="left:100%">3×</span>
  </span>
</div>

<div class="triWrap">
<svg class="tri" id="tri" viewBox="0 0 330 262" role="img" aria-label="Mercator">
  <rect class="feld" x="0" y="0" width="330" height="262"/>
  <polygon class="kante" points="165,30 47.2,234 282.8,234"/>
  <circle class="ecke" cx="165" cy="30" r="3"/>
  <circle class="ecke" cx="47.2" cy="234" r="3"/>
  <circle class="ecke" cx="282.8" cy="234" r="3"/>
  <text x="165" y="18" text-anchor="middle">Globe</text>
  <text x="47.2" y="253" text-anchor="middle">Mercator</text>
  <text x="282.8" y="253" text-anchor="middle">Equal Earth</text>
  <circle class="kugel" id="kugel" cx="47.2" cy="234" r="6.5"/>
</svg>
<button class="triSpiel" id="spiel" aria-pressed="false" aria-label="Play the tour">Play</button>
</div>

<div class="ctrl">
  <input type="range" id="reg" min="0" max="1000" value="0" step="1" aria-label="Cross-fade between Mercator and the selected projection">
  <div class="seg" id="ziele" role="group" aria-label="Projection"></div>
</div>
<div class="schalter">
  <label><input type="checkbox" id="cGrad" checked> Graticule</label>
  <label><input type="checkbox" id="cTissot" checked> Distortion circles</label>
  <label><input type="checkbox" id="cFest"> Hold Mercator's distortion</label>
  <label><input type="checkbox" id="cKurs"> Two flight routes</label>
</div>

<p class="hinweis" id="hinweisGlobus" hidden><b>Drag to turn the globe</b> — the same drag that moves the centre of the flat maps. On the sphere itself everything is right at once — area, shape, angles — because nothing is forced into a plane. But its <i>image</i> on a flat screen is a projection again. <b>Where you look straight down, the scale is exact</b>; towards the rim everything shrinks, at 60° to half, at the edge to nothing. The colour measures that too and travels with the rotation. Unlike a flat map there is only one direction here: the globe shows nothing too large, but almost everything too small.</p>
<p class="hinweis" id="hinweisFarbe" hidden></p>
<p class="hinweis" id="hinweisTissot" hidden></p>
<p class="lgd" id="lgdKurs" hidden>
  <span><i class="lox"></i>constant compass course</span>
  <span><i class="gk"></i>shortest path</span>
  <span class="wo">New York – Lisbon and Frankfurt – Tokyo</span>
</p>

<h1>164 to 1 for<br>a new world map</h1>
<p class="deck">On <b>4 September 2026</b> the UN General Assembly adopted the
resolution <b>&ldquo;Correct the Map&rdquo;</b>, moved by <b>Togo</b> on behalf of the
African member states: 164 votes in favour, one against, six abstentions. It does not
ban Mercator; it calls on governments, schools, organisations and technology companies
to use <b>equal-area</b> maps wherever relative size matters — naming
<b>Equal Earth</b> in particular.</p>
<p class="deck">What is at stake can be measured. On the Mercator map, Europe and North
America together take up <b>${nordAnteil(iM).toFixed(0)} %</b> of the land area shown;
their true share is
<b>${((kont['Europe'].wahr + kont['North America'].wahr) * 100).toFixed(0)} %</b>.
The slider fades between them. The colour shows, for every country, how much image area
it gets measured against its real share of the world's land — and how that distortion
disappears along the way. Next to the two maps stands the <b>globe</b>: the one
depiction without any distortion at all, and therefore the yardstick both maps are
measured against.</p>

<h2 class="sec">What was decided</h2>
<p class="sec">The resolution is titled <i>&ldquo;Correct the Map: Rebalancing global
cartographic representation and promoting equitable representation of the world's
regions, particularly Africa&rdquo;</i>. It is <b>not binding</b> — the UN can compel
neither Google Maps nor textbook publishers nor national mapping agencies. The United
States was the only country to vote against; Estonia, Georgia, Lithuania, Moldova,
Serbia and Ukraine abstained.</p>
<p class="sec">No particular projection is prescribed; what is asked for is
<b>equal area</b>. Equal Earth is named — built in 2018 by Bojan Šavrič,
Tom Patterson and Bernhard Jenny, equal-area and designed for recognisable outlines
at the same time.</p>
<p class="sec">The third button is the control case. On the <b>globe</b> the question of
the right projection does not arise: area, shape and angles are all correct, because
nothing is forced into a plane. It costs half the world — you only ever see one side.
That is exactly the bargain every world map strikes, and the slider shows it in both
directions. <b>Drag to turn the globe.</b></p>
<p class="sec"><b>Drag sideways to move the centre of the map.</b> A world map has to be cut
open somewhere, and whoever sits in the middle is shown whole while whoever sits at the
edge is cut in two. That choice is a second bias on top of the projection, and it is just
as arbitrary: the map here starts on Greenwich for no better reason than habit. It is one
setting for all three views — on the flat maps it is the central meridian, on the globe it
is the longitude facing you — so it survives when you switch projection or let the tour
run.</p>
<p class="sec"><b>Pinch or scroll to zoom in</b>, on any of the three — the flat maps and the
globe alike. Dragging then moves the section: sideways it keeps turning the world, so there
is no left or right edge to run into. A double-tap, or a double-click, puts the whole map
back in the frame.</p>
<p class="sec">Even the globe is not entirely off the hook, and the map says so: its
<i>image</i> on a flat screen is a projection again. There the areal scale is the cosine
of the distance from the centre of the image — where you look straight down it is exact,
at 60° it is halved, at the rim it is zero. That is why the colour is not looked up in a
table but measured, in every single frame, from what is actually on the screen. On
Mercator this comes out to the same value as the table below, to two decimal places; on
the globe it shows the rim compression, and it travels with the rotation.</p>
<p class="sec">What it is measured against is not the same thing in both cases. A flat map
shows the whole world: the sheet is a fixed stock that gets shared out, and the question is
whether a country gets more or less of it than it is due — both directions are possible.
The sphere shows one half and has a natural scale, the one at the point you are looking at.
There it is undistorted; everywhere else it is too small. <b>The globe shows nothing too
large, but almost everything too small</b> — which is why it is pale in the middle and
grows steadily stronger towards the rim.</p>

<h2 class="sec">Who gets how much room</h2>
<p class="sec">Share of the land area shown, Antarctica not counted. Equal Earth and the
globe share a column: both are equal-area, one because it was built that way, the other
because there is nothing to distort on a sphere. That second column is therefore not just
a third opinion — it is the true share.</p>
<div class="tabelle-scroll"><table id="tKont"></table></div>

<h2 class="sec">Biggest change</h2>
<p class="sec">Countries above 150,000 km², sorted by how their share of the image area
changes when switching from Mercator to <b id="zielName2">Equal Earth</b>.</p>
<div class="zwei">
  <div class="tabelle-scroll"><table id="tVerlust"></table></div>
  <div class="tabelle-scroll"><table id="tGewinn"></table></div>
</div>

<h2 class="sec">What Mercator is good at</h2>
<p class="sec">The <b>distortion circles</b> say it most clearly. Every one of them has the
same radius on the earth, 800 km. On Mercator each one stays a <b>circle</b> — they merely
grow larger towards the north and the south. A circle that stays a circle means: at this
spot the stretching is the same in every direction. So angles are preserved, and with them
the local shape. On an equal-area projection it is the other way round: every circle is the
same size, but sheared into an ellipse — the area is right, the shape is not. There is
nothing more to say about the trade, and you see it in a single movement. On the
<b>globe</b> the circles are then the same size <i>and</i> round: the control case that
shows both are possible at once — just not on a sheet of paper.</p>
<p class="sec">Measured, and worth being exact about. On <b>Equal Earth</b> all thirty
circles come out to the same area to the last digit — 0.0000 % spread — while their axis
ratio runs from 1.23 to 3.16. Even on the equator it is 1.36, so Equal Earth is nowhere
conformal; equal area is bought everywhere, not only at the edges. On <b>Mercator</b> the
areas grow by 1.00, 1.34, 4.10 from the equator to 60°, against <code>sec²φ</code> of 1.00,
1.33, 4.00 — and the shapes are not perfect circles either: 1.00 on the equator, 1.08 at
30°, 1.25 at 60°. That is not a flaw in the drawing. A Tissot indicatrix is an
<i>infinitesimal</i> circle; these are 800 km wide, and across that span Mercator's own
scale already changes, so the northern half of each circle is stretched more than the
southern half. Drawn at a size you can see, the circles show the projection's second-order
behaviour along with the first.</p>
<p class="sec">The two flight routes show what that was practically good for. Because
angles are correct on Mercator, a line of <b>constant compass course</b> is a straight line
there — you lay down a ruler and read off the bearing. In 1569 that was the entire job. The
<b>shortest path</b> is a different thing and on Mercator always the arc; both are labelled
on the map.</p>
<p class="sec">How straight the course line is can be measured — greatest deviation from
the straight connection, as a percentage of the route length:</p>
<div class="tabelle-scroll"><table>
<tr><th>Route</th><th class="z">Mercator, course line</th><th class="z">Mercator, shortest path</th><th class="z">Equal Earth, shortest path</th></tr>
<tr><td>New York – Lisbon</td><td class="z">0.00 %</td><td class="z">10.1 %</td><td class="z">9.8 %</td></tr>
<tr><td>Frankfurt – Tokyo</td><td class="z">0.00 %</td><td class="z">31.4 %</td><td class="z">17.8 %</td></tr>
</table></div>
<p class="sec">Zero per cent, and that for any route whatsoever — not an approximation but
the property the projection was built for. The converse does not hold: the shortest path
becomes straight on neither projection here, it merely bends less. That would take a
gnomonic projection, which in turn cannot show even a full hemisphere in one piece. The
price of the straight course line is the area distortion; on a flat map you cannot have
both.</p>

<footer>
<p><b>Geometry:</b> <a href="https://www.naturalearthdata.com/">Natural Earth</a>,
<code>ne_50m_admin_0_countries</code> — ${laender.length} countries and territories,
${punkte.toLocaleString('en-US')} points. Public domain. Population figures from the same
dataset (<code>POP_EST</code>, mostly as of 2019) and therefore only rough.</p>
<p><b>Crimea</b> is drawn as part of Ukraine. Natural Earth's default layer maps control on
the ground and puts it with Russia; this page follows the position of the UN General
Assembly (resolution 68/262 of 27 March 2014). One polygon is reassigned in the build, which
moves 26,970 km² from Russia to Ukraine and leaves every other border as the source draws
it — so other disputed areas, from Western Sahara to Kashmir, still appear the way Natural
Earth's de-facto layer has them. The population figures are the dataset's own and were not
adjusted.</p>
<p><b>Areas</b> are computed from the geometry itself, as a line integral on the sphere,
not taken from a table. Check: the result agrees to four decimal places with the route via
an equal-area projection, and the two equal-area projections agree with each other on the
shares to within 0.03 %.</p>
<p><b>Mercator</b> is clipped at ${(KAPPUNG / GRAD).toFixed(0)}° — the areal scale there is already
${(1 / Math.cos(KAPPUNG) ** 2).toFixed(0)}×, and at 85° it is ${(1 / Math.cos(85 * GRAD) ** 2).toFixed(0)}×. Antarctica stays in the picture all the
same; it is precisely what shows what happens at the poles. It does not count towards the
shares. Both flat projections are normalised to the same equator length, so that the
cross-fade changes only the projection and not the size along with it. The <b>globe</b> has
radius 1 for the same reason: a map of that equator length wraps exactly onto a sphere of
that size. It is drawn orthographically, the way a sphere looks from far away; points
behind the horizon move onto the rim, so an outline crossing the horizon closes cleanly
there.</p>
<p><b>On the resolution:</b> <a href="https://news.un.org/en/story/2026/09/1168284">UN
News</a>, <a href="https://www.handelsblatt.com/politik/international/kritik-an-ueblicher-darstellung-un-stimmen-auf-antrag-togos-fuer-reform-der-weltkarte/100252209.html">Handelsblatt</a>,
<a href="https://www.zdfheute.de/panorama/un-resolution-weltkarten-100.html">ZDF</a>.
Vote of 4 September 2026.</p>
<p>Part of <a href="../">lab</a>. Source and build scripts on
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
