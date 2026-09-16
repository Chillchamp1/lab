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
html,body{margin:0;height:100%;overscroll-behavior:none}
body{background:var(--plane);color:var(--ink);
  font-family:system-ui,-apple-system,"Segoe UI",sans-serif;font-size:15px;line-height:1.5;
  -webkit-text-size-adjust:100%;overflow:hidden}
/* min-height statt height, und die Buehne oben ausgerichtet: sie ist so hoch
   wie ihr Inhalt, hoechstens schirmhoch. Die Vorlage nagelt ihre auf 100dvh —
   richtig fuer einen hochkanten Ausschnitt, falsch fuer diesen queren. */
/* **svh statt dvh, und das ist der ganze Trick.** dvh ist die *dynamische*
   Schirmhoehe: auf dem Telefon wandert sie, sobald die Adressleiste ein- oder
   ausfaehrt, und jede Wanderung legt die Buehne neu aus — die Karte wird neu
   gemessen, neu gezeichnet und springt. Wer dabei scrollt, faehrt die Leiste
   weiter ein, was die Hoehe weiter aendert: das Bild hopst.

   svh ist die *kleine* Schirmhoehe — die mit ausgefahrener Leiste, also die
   kleinste, die vorkommt. Damit steht die Auslegung fest: faehrt die Leiste
   ein, bleibt unten etwas Seitengrund stehen, und nichts bewegt sich. vh davor
   als Rueckfall fuer Browser, die svh nicht kennen. */
.wrap{max-width:900px;margin:0 auto;min-height:100vh;min-height:100svh;padding:6px;
  display:flex;align-items:flex-start}
/* container-type macht die Buehne zum Massstab fuer alles darin: 1cqw ist ein
   Hundertstel ihrer Breite. Damit waechst der Text mit der Karte, statt in
   Bildpunkten festzustehen. min-width:0, weil ein Flex-Kind sonst mindestens
   so breit ist wie sein Inhalt — und in der Legende steht eine Zeile, die
   nicht umbrechen darf. */
.buehne{container-type:inline-size;
  position:relative;flex:0 1 auto;width:100%;min-width:0;min-height:0;
  max-height:calc(100vh - 12px);max-height:calc(100svh - 12px);
  display:flex;flex-direction:column;
  background:var(--surface);border:1px solid var(--ring);border-radius:14px;padding:10px 12px 8px}

/* ---------- Zwei Ebenen, und eine, die es nicht mehr gibt ----------
     Ebene 2  Jahr und Zeitscheibe — ueber der Karte, mit Schein dahinter.
     Ebene 1  die Karte.
   Die Notiz lag frueher als Ebene 0 **hinter** der Karte, und die Karte wich
   ihr aus. Das Prinzip der Vorlage haengt daran, dass der Umriss der Karte
   Platz laesst: Deutschland tut das. Seit der Rahmen hier in Kilometern steht
   und gefuellt ist, laesst er **nirgends** Platz — ein Rechteck hat keine
   leere Ecke. Also steht die Notiz jetzt auf allen Breiten unter der Karte,
   im Fluss, so wie sie auf dem Telefon immer schon stand. */
/* Das Schild stand ueber der Karte, mit einem Schein aus dem Seitengrund
   dahinter. Das trug, solange unter ihm Wasser lag. Seit der Rahmen bis
   Groenland reicht, liegt dort **Eis** — weisse Schrift auf weissem Eis, und
   der Schein macht es nicht besser. Es steht jetzt ueber der Karte statt auf
   ihr; das kostet eine Zeile Hoehe und ist zu jeder Zeit lesbar. */
.schild{order:-1;margin-bottom:5px;pointer-events:none;
  display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.schild>b{font-size:30px;font-weight:650;letter-spacing:-.02em;line-height:1;
  font-variant-numeric:tabular-nums}
.schild>span{color:var(--ink2);font-size:13px}
.schild .roh{color:var(--muted)}

.text{order:3;padding-top:8px;pointer-events:none}
.jetzt{margin:0;max-width:min(94%,470px);
  font-size:clamp(9px,1.36cqw,11.6px);line-height:1.5;color:var(--ink2);
  opacity:0;transition:opacity .4s}
.jetzt b{display:block;color:var(--ink);font-weight:650;
  font-size:clamp(9.8px,1.48cqw,12.6px);margin-bottom:2px}
/* Der Faden — die Ueberschriften aller Abschnitte — laeuft quer statt
   untereinander: unter der Karte ist Breite da und Hoehe knapp, hinter ihr war
   es umgekehrt. */
.faden{width:100%;padding-top:4px;
  display:flex;flex-direction:row;flex-wrap:wrap;gap:0 10px;will-change:transform}
.faden b{font-size:clamp(8px,1.09cqw,9.5px);line-height:1.35;font-weight:600;
  color:var(--ink);transition:opacity .5s}

/* ---------- Hochkant auf dem Telefon: die Karte randlos ----------
   Der Rahmen der Buehne kostet dort, wo am wenigsten da ist: 6 px Seitenrand,
   12 px Polster und ein Strich machen auf 390 px Schirmbreite **zehn Prozent**
   der Karte aus. Also faellt er weg — die Karte laeuft von Kante zu Kante, und
   nur was Text ist, bekommt sein Polster zurueck.

   Das Feld haelt dabei mindestens die halbe Schirmhoehe. Bei einem Rahmen von
   5 370 auf 5 250 km und voller Breite steht die Karte selbst auf 45 Prozent
   der Hoehe; den Rest nimmt die Schraegsicht, die den Stapel nach oben
   aufstellt. Mehr ginge nur, indem die Karte seitlich beschnitten wird — und
   ein beschnittener Rahmen ist genau das, was dieser Ordner hinter sich hat. */
@media(max-width:640px) and (orientation:portrait){
  .wrap{padding:0;align-items:stretch}
  .buehne{border:0;border-radius:0;padding:0;background:transparent;
    max-height:none}
  /* Fest, nicht nur mindestens: sonst nimmt das Feld sich, was die Notiz
     gerade uebrig laesst — und die Notiz wechselt mit dem Abschnitt ihre
     Laenge. Drei Zeilen weniger, und die Karte waere um dreissig Punkte
     gewachsen: das Bild hopst bei jedem Abschnittswechsel. */
  /* Die Feldhoehe folgt der **Karte**, nicht dem Schirm: volle Breite geteilt
     durch ihr Seitenverhaeltnis. Vorher stand hier eine feste Zahl (52 svh),
     und solange der Rahmen quer war, passte das — die Breite band. Seit er
     hochkant ist (4 500 auf 5 250 km), bindet die Hoehe: die Karte stand 376
     statt 390 Punkte breit und liess links und rechts sieben Punkte Rand
     stehen. Genau den sollte es nicht geben.

     Fest ist die Hoehe trotzdem, denn sie haengt nur an der Schirmbreite —
     nicht an der Notiz, die mit dem Abschnitt ihre Laenge wechselt. Gedeckelt
     bei 62 svh, damit auf einem kurzen Schirm noch Platz fuer die Leiste
     bleibt. */
  .buehne .feld{flex:0 0 auto;min-height:0;
    height:min(calc(100vw / var(--kartenmass,1)), 62vh);
    height:min(calc(100vw / var(--kartenmass,1)), 62svh)}
  /* Und die Notiz nimmt, was uebrig ist, statt die Seite laenger zu machen.
     Eine laengere Seite heisst auf dem Telefon: die Adressleiste faehrt beim
     Scrollen ein, die Schirmhoehe aendert sich, und alles darueber wandert
     mit. contain haelt das Scrollen in der Notiz. */
  .text{flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain}
  .schild,.fuss,.regler,.msp,.temp,.sicht,.text{padding-inline:10px}
  .schild{padding-top:8px}
  /* Die Zeitangabe steht hochkant **immer** in ihrer eigenen Zeile. Neben der
     Jahreszahl passt sie mal (auf einer Zeitscheibe: „ICE-6G_C time slice 21
     ka") und mal nicht (dazwischen: „between the 22 and 21 ka slices —
     interpolated"); dann bricht sie um, das Schild wird 28 Punkte hoeher, und
     die ganze Karte darunter rutscht nach unten. Achtundvierzigmal im Film —
     das war das Hopsen. Eine feste Zeile kostet weniger als ein springendes
     Bild. */
  .schild>span{flex:0 0 100%}
  .sicht{padding-bottom:10px}
  /* Der lange Legendensatz wird auf dem Telefon ohnehin nach zwei Zeilen
     abgeschnitten und sagt dort nichts, was die Leiter darueber nicht zeigt. */
  .fuss .klein{display:none}
  /* Der Faden nennt alle neun Abschnitte; auf 390 px sind das zwei Zeilen
     graue Woerter neben einer Notiz, die dasselbe schon sagt. */
  .faden{display:none}
  .pole{font-size:10.5px}
}
@media(max-width:640px){
  .jetzt{max-width:100%;font-size:11.5px}
  .jetzt b{font-size:12.5px}
  .faden b{font-size:9.5px}
  .schild>b{font-size:26px}
  .schild>span{font-size:12px}
}

/* Das Feld haelt das Seitenverhaeltnis der Karte, statt den Schirm zu fuellen.
   Die Vorlage nagelt ihre Buehne auf 100dvh, und das ist dort richtig: ihr
   Ausschnitt ist Deutschland, also hochkant. Dieser hier ist Europa von 12 W
   bis 45 O — breiter als hoch. Auf einem hochkant gehaltenen Telefon blieb
   damit die Haelfte des Feldes schwarz (gemessen: 48 % Fuellung bei 390 px).
   Mit aspect-ratio schrumpft stattdessen die Buehne, und der Rand unten ist
   Seitengrund statt Loch in der Karte. */
.feld{position:relative;z-index:1;flex:0 1 auto;min-height:0;
  aspect-ratio:var(--kartenmass,0.857)}
/* Breite und Hoehe kommen aus masse(): die Leinwand ist genau die Karte, ohne
   schwarzen Rand darin. */
canvas{position:absolute;left:0;top:0}

/* ---------- Auf einem breiten, queren Schirm steht die Leiste daneben ----
   Die Karte ist fast quadratisch, das Fenster ist quer. Untereinander bleibt
   der Karte die Fensterhoehe **minus** Leiste, Reglern und Notiz — auf 1 440 ×
   900 waren das 515 × 530 Punkte in einem Fenster von 1 296 000: ein Fuenftel.
   Nebeneinander bekommt sie die **ganze** Hoehe und wird 896 × 876.
   Der Bruch liegt dort, wo die Spalte daneben noch Text tragen kann. */
@media (min-width:1040px) and (min-aspect-ratio:11/10){
  .wrap{max-width:none;padding:8px}
  .buehne{display:grid;height:calc(100vh - 16px);height:calc(100svh - 16px);max-height:none;
    grid-template-columns:minmax(0,1fr) clamp(280px,23vw,390px);
    grid-template-rows:auto auto auto auto auto auto minmax(0,1fr);
    column-gap:16px}
  .feld{grid-column:1;grid-row:1/-1;min-width:0;aspect-ratio:auto}
  .schild{grid-column:2;grid-row:1}
  .fuss{grid-column:2;grid-row:2}
  .regler{grid-column:2;grid-row:3}
  .msp{grid-column:2;grid-row:4}
  .temp{grid-column:2;grid-row:5}
  .sicht{grid-column:2;grid-row:6}
  .text{grid-column:2;grid-row:7;overflow:hidden;min-height:0}
  /* In einer schmalen Spalte steht der Faden wieder untereinander. */
  .faden{flex-direction:column;gap:2px}
  .fuss .klein{white-space:normal;max-height:4em}
  .sicht{flex-wrap:wrap}
}
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
/* Beide sitzen am Rand der **Leinwand**, nicht des Feldes: die Leinwand ist
   schmaler, wenn die Hoehe klemmt (siehe masse()). */
.feld{--rand:calc((100% - var(--kb,100%)) / 2);--randY:calc((100% - var(--kh,100%)) / 2)}
#nord{left:calc(8px + var(--rand));bottom:calc(8px + var(--randY))}
#zurueck{right:calc(8px + var(--rand));top:calc(8px + var(--randY))}
#farben{padding:2px 7px;font-size:11px;line-height:1.2;border-radius:6px;color:var(--muted);
  border-style:dashed}
#farben[aria-pressed=true]{color:var(--ink);border-style:solid}
/* Der Meeresspiegel-Ticker. Eine Kurve, die mitlaeuft — sie steht unter der
   Karte, weil sie die eine Zahl ist, die den ganzen Vorgang zusammenfasst. */
.msp,.temp{display:flex;align-items:center;gap:8px;margin-top:4px}
.msp canvas,.temp canvas{position:static;width:100%;height:26px;display:block}
.msp .wert,.temp .wert{flex:0 0 auto;font-size:11.5px;color:var(--ink2);
  font-variant-numeric:tabular-nums;min-width:5.4em;text-align:right}
.msp .bahn2,.temp .bahn2{position:relative;flex:1;min-width:0;height:26px}
/* Die Beschriftung. Bis hierher war das die einzige unbeschriftete Stelle der
   Oberflaeche: die Farbleitern haben ihre Zeile, die Regler haben "Tilt" und
   "Turn", die beiden Kurven hatten nur ihre Einheit — und eine Einheit ist
   keine Bezeichnung. Der Satz, der sie benannte, steht in legText, und der
   ist auf dem Telefon ausgeblendet (.fuss .klein); ausgerechnet dort fehlte
   der Name also ganz.

   Feste Breite, nicht min-width, damit **beide Kurven an derselben x-Stelle
   beginnen**. Zwei Zeitachsen uebereinander, die nicht uebereinanderliegen,
   sind schlimmer als gar keine Beschriftung — sie laden dazu ein, senkrecht
   zu vergleichen. Mit min-width wurde die Spalte so breit wie ihr Inhalt:
   98 px fuer "Global temperature" gegen 62 fuer "Sea level", die Bahnen
   begannen 36 px versetzt. Und min-width:0 dazu, weil das automatische
   Minimum eines Flexelements seine Min-Content-Breite ist und "temperature"
   mit 62,86 px ueber die zuerst gesetzten 6,2 em ging. Gemessen: beide
   Spalten exakt 66,00 px, in allen drei Lagen.

   10 px und zwei Zeilen statt 11,5 px und einer: so passt "Global
   temperature" ganz hinein und bleibt schmaler als ein einzeiliges
   "Temperature". Das Wort global ist hier kein Beiwerk — ohne es liest
   jemand "nur 7 Grad" und unterschaetzt, was er sieht. */
.msp .marke,.temp .marke{flex:0 0 6.6em;min-width:0;font-size:10px;
  line-height:1.15;color:var(--muted)}
/* Die Temperaturzeile ruecht enger an den Meeresspiegel: die beiden gehoeren
   zusammen — was das Eis dem Meer nahm und was es die Welt an Waerme kostete. */
.temp{margin-top:1px}
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
    <span class="marke">Sea level</span>
    <div class="bahn2"><canvas id="mspBahn" aria-hidden="true"></canvas></div>
    <span class="wert" id="mspWert"></span>
  </div>
  <div class="temp">
    <span class="marke">Global temperature</span>
    <div class="bahn2"><canvas id="tempBahn" aria-hidden="true"></canvas></div>
    <span class="wert" id="tempWert"></span>
  </div>
  <div class="sicht">
    <label><span>Tilt</span><input type="range" id="kipp" min="0" max="100" value="0" step="1" aria-label="Tilt"></label>
    <label><span>Turn</span><input type="range" id="dreh" min="0" max="360" value="0" step="1" aria-label="Turn"></label>
    <button id="heute" aria-pressed="true" title="Today&#39;s coastline and cities, for orientation">Today</button>
    <button id="band" aria-pressed="false" title="DATED-1 dated ice margin and its maximum/minimum uncertainty band">Band</button>
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
const ORTE = D.orte || [], MB = D.mb || null, KUPPEN = D.kuppen || [];
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

/* ================================================================ Das Feld
   RAUF ist die Feinheit des Reliefgitters als Anteil der gezeichneten Karte.
   Es stand auf 0,55 — jede Feldzelle also knapp zwei Bildpunkte breit —, und
   das war vertretbar, solange die Karte 540 Punkte breit stand. Seit sie 900
   Punkte breit steht, sah man es: die Farbflaeche wird aus dem Feld
   hochskaliert und wurde klotzig, und die Hoehenlinien laufen ueber die
   Ecken des Feldgitters und wurden eckig.

   Gedeckelt wird trotzdem, und zwar in absoluten Zellen: die Kosten je Bild
   haengen an der Zahl der Feldzellen, und gekippt wird der Scheibenstapel je
   Bild neu geschnitten. FELDMAX ist gemessen (METHODIK 8f), nicht gegriffen. */
let RAUF = 0.9, FELDMAX = 680, DPRMAX = 2.5;  // let, damit der Film sie hochdreht
let rW = 0, rH = 0, randF = null;
let demR = null, maskeR = null, rock = null, eisD = null, flaeche = null;
let bild = null, licht = null, lichtBild = null;
// Vorberechnete Gewichte fuers Hochrechnen — sie haengen nur an der Feldgroesse.
let wxT = null, ixT = null, wyT = null, iyT = null;
let wxE = null, ixE = null, wyE = null, iyE = null;
let tmpT = null, tmpE = null;
const hkF = document.createElement('canvas'), hcF = hkF.getContext('2d');
const hkL = document.createElement('canvas'), hcL = hkL.getContext('2d');
const hkS = document.createElement('canvas'), hcS = hkS.getContext('2d');
const hkE = document.createElement('canvas'), hcE = hkE.getContext('2d');

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
  const deckel = Math.min(1, FELDMAX / Math.max(1, kw * RAUF));
  const w = Math.max(8, Math.round(kw * RAUF * deckel));
  const h = Math.max(8, Math.round(kh * RAUF * deckel));
  if (w === rW && h === rH) return false;
  rW = w; rH = h;
  for (const k of [hkF, hkL, hkS]) { k.width = w; k.height = h; }
  bild = hcF.createImageData(w, h);
  lichtBild = hcL.createImageData(w, h);
  demR = new Float32Array(w * h); maskeR = new Uint8Array(w * h);
  rock = new Float32Array(w * h); eisD = new Float32Array(w * h);
  randF = new Float32Array(w * h);
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
   **Monotones kubisches Hermite** nach Fritsch–Carlson, wie in der Vorlage.

   Hier stand lange linear, mit einer ausdruecklichen Begruendung: eine Kurve
   behaupte zwischen zwei Datenpunkten etwas, und das hier sei eine
   Rekonstruktion, keine Simulation. Das Argument gilt fuer eine **freie**
   Kurve — eine Catmull-Rom schwingt ueber die Datenpunkte hinaus und erfindet
   dabei Eis, wo in beiden Nachbarscheiben weniger stand.

   Fuer die monotone Variante gilt es nicht. Sie geht durch jeden Datenpunkt
   exakt hindurch, und ihre Knotensteigung ist null, sobald die beiden
   Sekanten das Vorzeichen wechseln — die Kurve bleibt damit in jedem Segment
   **zwischen** den beiden Werten, die sie verbindet. Sie behauptet nichts
   ueber die Hoehe, nur ueber die Geschwindigkeit.

   Und genau die war das Problem. Linear ist die Hoehe stetig, die
   Geschwindigkeit aber nicht: an jeder der 48 Scheiben knickt sie um. Im Lauf
   sind das 48 Rucke in 69 Sekunden, und man sieht sie — der Eisrand wandert
   nicht, er pulst. Das faellt beim Schieben des Reglers nicht auf und im Film
   sofort.

   Die Gewichte laufen ueber die **Spielzeit** der Segmente (TAKT), nicht ueber
   ihre Jahrtausende: die Zeitachse steht ungleichmaessig (1 ka, dann 0,5 ka)
   und die Spielzeit je Scheibe haengt ausserdem daran, wie viel sich in ihr
   bewegt. Stetig soll die Geschwindigkeit dort sein, wo das Auge sie sieht. */
const tdJetzt = new Float32Array(TD.w * TD.h);
const eisJetzt = new Float32Array(EIS.w * EIS.h);
const eisMaske = new Float32Array(EIS.w * EIS.h);

/* Die Randbedingung an beiden Enden ist die einseitige Sekante: Tm = T0 setzt
   dm = d0, und das gewichtete harmonische Mittel zweier gleicher Zahlen ist
   die Zahl selbst. Kein Sonderfall im Code, nur eine Zuweisung davor. */
function kurveFeld(scheiben, ziel, a, b, u) {
  const am = a > 0 ? a - 1 : a, bp = b < NT - 1 ? b + 1 : b;
  const T0 = TAKT[a] || 1;
  const Tm = a > 0 ? (TAKT[a - 1] || T0) : T0;
  const T1 = b < NT - 1 ? (TAKT[b] || T0) : T0;
  const Vm = scheiben[am], V0 = scheiben[a], V1 = scheiben[b], V2 = scheiben[bp];
  // Alles, was nur an den Segmentlaengen haengt, einmal je Bild statt je Zelle.
  const wm1 = 2 * T0 + Tm, wm2 = T0 + 2 * Tm;
  const wp1 = 2 * T1 + T0, wp2 = T1 + 2 * T0;
  const u2 = u * u, u3 = u2 * u;
  const h00 = 2 * u3 - 3 * u2 + 1, h10 = (u3 - 2 * u2 + u) * T0;
  const h01 = -2 * u3 + 3 * u2,    h11 = (u3 - u2) * T0;
  for (let i = 0; i < ziel.length; i++) {
    const v0 = V0[i], v1 = V1[i];
    const d0 = (v1 - v0) / T0;
    const dm = a > 0 ? (v0 - Vm[i]) / Tm : d0;
    const d1 = b < NT - 1 ? (V2[i] - v1) / T1 : d0;
    const m0 = dm * d0 > 0 ? (wm1 + wm2) / (wm1 / dm + wm2 / d0) : 0;
    const m1 = d0 * d1 > 0 ? (wp1 + wp2) / (wp1 / d0 + wp2 / d1) : 0;
    ziel[i] = h00 * v0 + h10 * m0 + h01 * v1 + h11 * m1;
  }
}
function zeitFelder() {
  const a = abschnitt, b = Math.min(NT - 1, a + 1), u = uAbschnitt;
  kurveFeld(TD.s, tdJetzt, a, b, u);
  kurveFeld(EIS.s, eisJetzt, a, b, u);
}
/* Dieselbe Kurve fuer einen einzelnen Wert — der Meeresspiegel im Ticker soll
   nicht rucken, wenn das Eis es nicht tut. */
function kurveWert(reihe, a, b, u) {
  const T0 = TAKT[a] || 1;
  const Tm = a > 0 ? (TAKT[a - 1] || T0) : T0;
  const T1 = b < NT - 1 ? (TAKT[b] || T0) : T0;
  const v0 = reihe[a], v1 = reihe[b];
  const d0 = (v1 - v0) / T0;
  /* Ein **fehlender** Nachbar zaehlt wie gar kein Nachbar, nicht wie eine
     Null. Der Meeresspiegel ist lueckenlos, die Temperaturreihe nicht: sie
     beginnt erst bei 23 ka. Ohne diese Bedingung liest JavaScript das null
     der Scheibe davor als 0 Grad, und die Kurve bekaeme am Anfang eine
     Steigung, die aus einer Luecke gerechnet ist. Am Rand der Reihe gilt
     dasselbe wie am Rand des Feldes: die einseitige Sekante. */
  const hat = v => v !== null && v !== undefined;
  const dm = a > 0 && hat(reihe[a - 1]) ? (v0 - reihe[a - 1]) / Tm : d0;
  const d1 = b < NT - 1 && hat(reihe[b + 1]) ? (reihe[b + 1] - v1) / T1 : d0;
  const wm1 = 2 * T0 + Tm, wm2 = T0 + 2 * Tm;
  const wp1 = 2 * T1 + T0, wp2 = T1 + 2 * T0;
  const m0 = dm * d0 > 0 ? (wm1 + wm2) / (wm1 / dm + wm2 / d0) : 0;
  const m1 = d0 * d1 > 0 ? (wp1 + wp2) / (wp1 / d0 + wp2 / d1) : 0;
  const u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * v0 + (u3 - 2 * u2 + u) * T0 * m0
       + (-2 * u3 + 3 * u2) * v1 + (u3 - u2) * T0 * m1;
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
let eisAnzahl = 0, eisMin = 0, eisMax = 0;
/* Der hoechste Punkt **je Kuppe**, nicht einer fuers ganze Bild. Seit
   Groenland im Rahmen liegt, waere der eine Punkt immer Groenland — und die
   drei eurasischen Kuppen, um die es geht, haetten gar kein Schild mehr. */
const kuppeHoch = new Float64Array(KUPPEN.length);
const kuppeWo = new Int32Array(KUPPEN.length);
/* Welcher Feldpunkt zu welcher Kuppe gehoert — 0 heisst keine, sonst der
   Index plus eins. Einmal je Feldgroesse gerechnet und behalten: Punkt-in-
   Polygon je Zelle und je Bild waere teuer, das Fenster bewegt sich aber nie.
   Ein einziges Feld statt dreier Masken, damit die Schleife in paleo() einen
   Zugriff je Zelle behaelt und nicht drei. */
let kuppeIdx = null, kuppeIdxRW = 0;
function kuppenMaskeBauen() {
  if (kuppeIdx && kuppeIdxRW === rW) return kuppeIdx;
  kuppeIdx = new Uint8Array(rW * rH);
  kuppeIdxRW = rW;
  for (let k = 0; k < KUPPEN.length; k++) {
    const rand = KUPPEN[k].rand;
    if (!rand || rand.length < 3) continue;
    const n = rand.length;
    for (let y = 0; y < rH; y++) {
      const gy = y / rH * GH;
      for (let x = 0; x < rW; x++) {
        const gx = x / rW * GW;
        let drin = false;
        for (let i = 0, j = n - 1; i < n; j = i++) {
          const [xi, yi] = rand[i], [xj, yj] = rand[j];
          if ((yi > gy) !== (yj > gy)
              && gx < (xj - xi) * (gy - yi) / (yj - yi) + xi) drin = !drin;
        }
        // Zuerst gewinnt: die Kuppen sind als Kaesten gesetzt und koennen
        // sich an ihrer Naht ueberlappen.
        if (drin && !kuppeIdx[y * rW + x]) kuppeIdx[y * rW + x] = k + 1;
      }
    }
  }
  return kuppeIdx;
}
function paleo() {
  feldStand++;
  zeitFelder();
  hochrechnen(tdJetzt, TD.w, TD.h, rock, rW, rH, wxT, ixT, wyT, iyT, tmpT);
  hochrechnen(eisJetzt, EIS.w, EIS.h, eisD, rW, rH, wxE, ixE, wyE, iyE, tmpE);
  /* ---- und wo das grobe Feld ueberhaupt Eis hat ----
     Die Maechtigkeit wird bikubisch hochgerechnet, und eine glatte Kurve durch
     eine Kante laeuft ein Stueck weiter, als die Daten reichen. Auf dem Meer
     faengt die Aufschwimm-Schranke unten das ab; an Land fing es nichts.

     Also dieselbe Hochrechnung noch einmal ueber eine **Ja-Nein-Maske** des
     groben Feldes: wo die unter der Haelfte bleibt, liegt kein Eis. Der Rand
     landet damit auf der Mitte zwischen der letzten Eiszelle und der ersten
     leeren — dort, wo er bei diesem Raster hingehoert.

     **Es bringt wenig, und das gehoert dazugeschrieben.** Der Anlass war die
     Frage, warum Eis ausserhalb der DATED-1-Linie steht; die Vermutung war,
     die Interpolation trage den Rand weit hinaus. Nachgemessen sind es
     bei 21 ka 2,0 Prozent der Eisflaeche, und der Anteil ausserhalb der
     DATED-1-Maximallinie faellt von 13 auf 12 Prozent (bei 16 ka von 28 auf
     27). Der Rand rueckt im Mittel um rund sechs Kilometer herein, nicht um
     die vermutete halbe Quellzelle.

     Der weit groessere Teil des Unterschieds ist **kein Artefakt**: ICE-6G_C
     ist an Meeresspiegelmarken und GPS angepasst und rekonstruiert die Last,
     DATED-1 an datiertes Material und rekonstruiert den Rand. Dass die beiden
     auseinanderlaufen, ist der Befund, nicht der Fehler — und genau deshalb
     liegen beide in derselben Karte.

     Bleibt trotzdem drin: 27 ms je Bild (2,5 Prozent) dafuer, dass die Karte
     kein Eis zeigt, wo die Quelle keines hat. */
  for (let i = 0; i < eisJetzt.length; i++)
    eisMaske[i] = eisJetzt[i] >= EISSCHWELLE ? 1 : 0;
  hochrechnen(eisMaske, EIS.w, EIS.h, randF, rW, rH, wxE, ixE, wyE, iyE, tmpE);
  for (let i = 0; i < rock.length; i++) {
    if (eisD[i] < 0 || randF[i] < 0.5) eisD[i] = 0;
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
  /* Wo das Eis liegt, in Hoehen — damit der Eisstapel nur die Scheiben
     schneidet, in denen ueberhaupt Eis vorkommt. Ohne das lief er auch dann
     ueber das ganze Feld, wenn gar kein Eis mehr da ist. */
  eisAnzahl = 0; eisMin = 1e9; eisMax = -1e9;
  kuppeHoch.fill(0); kuppeWo.fill(-1);
  const kid = kuppenMaskeBauen();
  for (let i = 0; i < rock.length; i++) {
    if (!maskeR[i] || eisD[i] < EISSCHWELLE) continue;
    eisAnzahl++;
    if (flaeche[i] < eisMin) eisMin = flaeche[i];
    if (flaeche[i] > eisMax) eisMax = flaeche[i];
    const k = kid[i];
    if (k && flaeche[i] > kuppeHoch[k - 1]) {
      kuppeHoch[k - 1] = flaeche[i]; kuppeWo[k - 1] = i;
    }
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
/* MULDE und LICHTHUB standen auf 0,55 und 1,7 — die Vorlage hat 0,85 und
   1,7. Gekippt wirkte das Relief damit flach: die Platten sind Volltonflaechen,
   und alles, was innerhalb einer Platte Form gibt, ist dieses Licht. Es darf
   hier mehr tragen. Verglichen an sechs Varianten, siehe METHODIK 8c. */
const MULDE = 0.85, WURF = 0.30, LICHTHUB = 2.2, SCHATTENHUB = 0.6;
const HELLMAX = 0.55, DUNKELMAX = 0.55;
/* Die Mulde lief ueber **eine** Weite (rW/14). Eine einzelne Weite kennt genau
   eine Groesse von Hohlform: die Alpentaeler verschwanden darin, das Becken
   der Nordsee war zu gross fuer sie. Jetzt drei, von eng nach weit
   zusammengezaehlt — das ist die billige Fassung dessen, was ein Renderer
   Umgebungsverdeckung nennt: wie viel Himmel eine Stelle sieht. Eng faengt den
   Talgrund, weit das Becken, und die Summe steht dazwischen.

   Die Gewichte fallen nach aussen: die enge Form ist die, die man wirklich als
   Form liest, die weite gibt nur den Grundton. */
const MULDENWEITE = [56, 18, 6], MULDENGEWICHT = [0.5, 0.33, 0.17];
/* Der Schlagschatten hatte eine Kante von einem Feldpunkt (die Rampe lief ueber
   0,05). Eine Sonne von 16 Grad wirft keine solche Kante — sie hat einen
   Halbschatten. Der kommt hier aus einem kurzen Kasten ueber das Schattenfeld
   selbst, nach dem Sweep: billiger als mehrere Sonnen, und fuer eine Karte
   sieht es genauso aus. */
const HALBSCHATTEN = 220;        // Nenner: je groesser, desto enger die Kante
/* Eis glaenzt. Gestein in dieser Karte nicht — es traegt die Farbleiter, und
   ein Glanzlicht darauf saehe nach Plastik aus. Auf einer Eiskuppe ist es das,
   was sie zu einem Koerper macht statt zu einer weissen Flaeche: der Schimmer
   sitzt auf den Flanken, die dem Halbvektor zugewandt sind, und wandert ueber
   sie, waehrend die Kuppe waechst. */
const GLANZKRAFT = 0.16, GLANZQUADRATE = 4;   // Schaerfe = nh hoch 2^4, also 16
let schattenF = null, weitF = null, kastA = null, kastB = null;
let muldeF = null, glanzF = null;

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
    muldeF = new Float32Array(n); glanzF = new Float32Array(n);
  }
  /* Die Umgebung in drei Weiten, fuer die Mulde. Kastenfilter mit laufender
     Summe: kostet je Bildpunkt dasselbe, egal wie breit er ist — deshalb sind
     drei Weiten auch nur dreimal ein billiger Durchgang und nicht dreimal ein
     teurer. Zweimal Kasten je Weite ergibt eine Glocke; scharfe Kastenkanten
     saehe man als Rechtecke im Licht. */
  muldeF.fill(0);
  for (let w = 0; w < MULDENWEITE.length; w++) {
    const r = Math.max(2, Math.round(rW / MULDENWEITE[w]));
    kastenX(flaeche, kastB, r, rW, rH); kastenY(kastB, kastA, r, rW, rH);
    kastenX(kastA, kastB, r, rW, rH); kastenY(kastB, weitF, r, rW, rH);
    const g = MULDENGEWICHT[w];
    for (let i = 0; i < n; i++) muldeF[i] += (weitF[i] - flaeche[i]) * g;
  }

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
  /* Und weich an der Kante. Der Sweep liefert eine harte Grenze; eine Sonne
     von 16 Grad hat einen Halbschatten, der mit dem Abstand vom Werfer
     breiter wird. Ein kurzer Kasten ueber das Feld traegt das nicht exakt
     nach, aber er nimmt die Treppe heraus, und mehr sieht man auf einer Karte
     nicht. Der Radius haengt an der Feldgroesse, damit er bei jeder
     Aufloesung gleich breit **aussieht**. */
  const rs = Math.max(1, Math.round(rW / HALBSCHATTEN));
  kastenX(schattenF, kastB, rs, rW, rH); kastenY(kastB, schattenF, rs, rW, rH);

  const hochL = Math.cos(Math.PI * SONNE / 180) * Math.SQRT1_2;
  const lx = -hochL, ly = -hochL, lz = Math.sin(Math.PI * SONNE / 180);
  /* Der Halbvektor zwischen Sonne und Blick. Geblickt wird senkrecht von oben
     (0,0,1) — die Kippung dreht spaeter das fertige Bild, nicht das Licht. */
  const hx0 = lx, hy0 = ly, hz0 = lz + 1;
  const hl = Math.sqrt(hx0 * hx0 + hy0 * hy0 + hz0 * hz0);
  const hx = hx0 / hl, hy = hy0 / hl, hz = hz0 / hl;
  for (let y = 0; y < rH; y++) {
    const zc = y * rW, zo = (y > 0 ? y - 1 : y) * rW, zu = (y < rH - 1 ? y + 1 : y) * rW;
    for (let x = 0; x < rW; x++) {
      const xm = x > 0 ? x - 1 : x, xp = x < rW - 1 ? x + 1 : x;
      const i = zc + x;
      const gx = (flaeche[zc + xp] - flaeche[zc + xm]) * 0.5 * UEBERHOEHT;
      const gy = (flaeche[zu + x] - flaeche[zo + x]) * 0.5 * UEBERHOEHT;
      const nl = 1 / Math.sqrt(gx * gx + gy * gy + 1);
      let I = (-gx * lx - gy * ly + lz) * nl - lz;
      const mulde = muldeF[i] * UEBERHOEHT;
      if (mulde > 0) I -= mulde * MULDE;
      /* Weiche Rampe statt harter Kante: smoothstep ueber dieselbe Breite,
         ueber die vorher linear aufgeblendet wurde. */
      const sch = schattenF[i];
      if (sch > 0) {
        const t = sch < 0.05 ? sch / 0.05 : 1;
        I -= t * t * (3 - 2 * t) * WURF;
      }
      let a = I * STAERKE;
      if (a > HELLMAX) a = HELLMAX; else if (a < -DUNKELMAX) a = -DUNKELMAX;
      licht[i] = a;
      /* Der Schimmer — nur dort gerechnet, wo auch Eis liegt. Im Schatten
         gibt es ihn nicht: ein Glanzlicht ohne Sonne ist der Fehler, an dem
         man billige Renderer erkennt. */
      let gl = 0;
      if (eisD[i] >= EISSCHWELLE && sch < 0.02) {
        const nh = (-gx * hx - gy * hy + hz) * nl;
        if (nh > 0) {
          // nh hoch 16, durch viermal Quadrieren — billiger als Math.pow
          // und hier je Feldzelle und Bild gerechnet.
          let q = nh;
          for (let e = 0; e < GLANZQUADRATE; e++) q *= q;
          gl = q * GLANZKRAFT;
        }
      }
      glanzF[i] = gl;
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
    /* Der Schimmer kommt **nach** dem Licht und zieht gegen Weiss, nicht
       gegen die Bandfarbe: ein Glanzlicht hat die Farbe der Quelle, nicht die
       des Stoffs. Auf Eis heisst das fast dieselbe Farbe — sichtbar ist der
       Unterschied nur auf den blauen Baendern der tiefen Eisleiter. */
    const gl = glanzF[i];
    if (gl > 0) { r += (255 - r) * gl; g += (255 - g) * gl; b += (255 - b) * gl; }
    fo[j] = r; fo[j + 1] = g; fo[j + 2] = b; fo[j + 3] = 255;
    let L = 128 + (a > 0 ? 127 * a * AUFHELLEN : 128 * a * ABDUNKELN) * LICHTHUB;
    if (schattenF[i] > 0) {
      const t = schattenF[i] < 0.05 ? schattenF[i] / 0.05 : 1;
      L -= 60 * SCHATTENHUB * t * t * (3 - 2 * t);
    }
    if (gl > 0) L += 255 * gl * LICHTHUB * 0.5;
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
let bahnX = null, bahnY = null, bahnF = null, glX = null, glY = null;
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
  glX = new Float32Array(n); glY = new Float32Array(n);
}

/* ---------- Die Ecken aus den Linien nehmen ----------
   Marching Squares setzt seine Stuetzpunkte auf die **Kanten des Gitters**.
   Eine Hoehenlinie besteht damit aus lauter kurzen Stuecken, die nur vier
   Richtungen kennen, und auf einer Karte von 900 Punkten sieht man das: die
   Umrisse wirken gezackt, als waeren sie mit dem Lineal gezogen.

   Zwei Durchgaenge Laplace-Glaettung nehmen das heraus: jeder Punkt rueckt zur
   Haelfte auf die Mitte seiner beiden Nachbarn zu. Die Zahl der Punkte bleibt
   gleich — anders als beim Eckenschneiden, das sie verdoppelt und damit das
   Streichen verteuert.

   Weit rueckt dabei nichts: die Zacken sind eine halbe Feldzelle hoch, also
   knapp ein Bildpunkt, und genau der wird geglaettet. Die Linie bleibt auf
   ihrer Bandgrenze — sie muss es, denn die Farbflaeche darunter kommt aus
   demselben Feld.

   Ein geschlossener Ring wird zyklisch geglaettet und bleibt geschlossen; bei
   einer offenen Kette wandern auch die Enden ein wenig, und das ist an einer
   Schnittkante gleichgueltig. */
function glaetten(m) {
  if (m < 5) return;
  const zu = Math.abs(bahnX[0] - bahnX[m - 1]) < 1e-6
          && Math.abs(bahnY[0] - bahnY[m - 1]) < 1e-6;
  const n = zu ? m - 1 : m;
  if (n < 4) return;
  for (let d = 0; d < 2; d++) {
    for (let i = 0; i < n; i++) { glX[i] = bahnX[i]; glY[i] = bahnY[i]; }
    for (let i = 0; i < n; i++) {
      const p = i === 0 ? (zu ? n - 1 : 0) : i - 1;
      const q = i === n - 1 ? (zu ? 0 : n - 1) : i + 1;
      bahnX[i] = glX[i] * 0.5 + (glX[p] + glX[q]) * 0.25;
      bahnY[i] = glY[i] * 0.5 + (glY[p] + glY[q]) * 0.25;
    }
  }
  if (zu) { bahnX[m - 1] = bahnX[0]; bahnY[m - 1] = bahnY[0]; }
}

/* ---------- Kachelindex fuer Marching Squares ----------
   Ohne ihn laeuft jeder Zug ueber das **ganze** Feld: 37 Hoehenlinien mal
   140 000 Marschzellen sind fuenf Millionen Besuche je Bild, und gekippt
   kommen 33 Platten mal zwei Materialien noch einmal so viel dazu. Gemessen
   waren das 610 von 619 ms — die Karte ist mit dem feineren Feld nicht an
   ihrem Bild teuer geworden, sondern an dieser einen Schleife.

   Der Index teilt das Marschgitter in Kacheln von 8 mal 8 Zellen und merkt
   sich je Kachel den kleinsten und groessten Feldwert darin. Ein Zug auf der
   Hoehe t kann eine Kachel nur kreuzen, wenn t zwischen beiden liegt; alle
   anderen werden als Block uebersprungen. Gelaende ist zusammenhaengend —
   eine Kachel deckt rund hundert Kilometer, und ueber hundert Kilometer
   aendert sich die Hoehe selten um mehr als zwei, drei Baender.

   Gebaut wird er in **einem** Durchgang ueber das Feld, mit derselben
   Vorschrift, die der Zug spaeter liest. Er darf nur zu weit greifen, nie zu
   eng: uebersprungen wird ausschliesslich, was streng ausserhalb liegt. */
const TKACHEL = 4, TKBIT = 2;   // 1 << TKBIT === TKACHEL

/* ---------- Was ueberhaupt zu sehen ist ----------
   Die Schleifen liefen ueber das **ganze** Feld, auch wenn die Karte
   vierfach vergroessert dasteht und neun Zehntel davon neben der Leinwand
   liegen. Gerechnet wird jetzt nur, was ins Bild fallen kann.

   Gerechnet wird das Rechteck ueber die Umkehrung der Sicht: die vier Ecken
   der Leinwand zurueck auf den Boden. Zwei Zugaben gehoeren dazu:

   - Die Leinwand wird nach unten um die **Stapelhoehe** verlaengert. Der
     Stapel hebt jeden Punkt auf dem Schirm nach oben; ein Punkt, dessen Boden
     unter der Leinwand liegt, kann mit seiner obersten Platte noch
     hereinragen.
   - Das Ergebnis wird auf Vielfache von 16 Zellen **nach aussen gerundet**.
     Sonst wechselt das Rechteck bei jedem Pixel einer Geste, und der
     Ringspeicher, der daran haengt, waere bei jeder Bewegung ungueltig.

   Zu weit greifen darf es, zu eng nie. */
const SICHTRUND = 16;
let sichtX0 = 0, sichtX1 = 0, sichtY0 = 0, sichtY1 = 0, sichtSchluessel = '';
function sichtFeldRechnen() {
  const S = sichtRechnen();
  const hub = schraeg() ? NSCHEIBE * S.dz : 0;
  let X0 = 1e9, X1 = -1e9, Y0 = 1e9, Y1 = -1e9;
  for (const [sx, sy] of [[0, 0], [breite, 0], [0, hoehe + hub], [breite, hoehe + hub]]) {
    const [X, Y] = bodenUnter(sx, sy);
    if (X < X0) X0 = X; if (X > X1) X1 = X;
    if (Y < Y0) Y0 = Y; if (Y > Y1) Y1 = Y;
  }
  const je = kw / rW;
  const ab = (v, hin) => {
    const z = (v - hin) / je;
    return z;
  };
  const r = SICHTRUND;
  sichtX0 = Math.max(0, Math.floor(ab(X0, kx) / r) * r);
  sichtX1 = Math.min(rW - 1, Math.ceil(ab(X1, kx) / r) * r);
  sichtY0 = Math.max(0, Math.floor(ab(Y0, ky) / r) * r);
  sichtY1 = Math.min(rH - 1, Math.ceil(ab(Y1, ky) / r) * r);
  if (!(sichtX1 > sichtX0)) { sichtX0 = 0; sichtX1 = rW - 1; }
  if (!(sichtY1 > sichtY0)) { sichtY0 = 0; sichtY1 = rH - 1; }
  sichtSchluessel = sichtX0 + ',' + sichtX1 + ',' + sichtY0 + ',' + sichtY1;
}
let kacNX = 0, kacNY = 0, kacMin = null, kacMax = null;
function kachelBauen(nx, ny, feld, modus) {
  const tnx = Math.ceil(nx / TKACHEL), tny = Math.ceil(ny / TKACHEL);
  if (tnx !== kacNX || tny !== kacNY || !kacMin) {
    kacNX = tnx; kacNY = tny;
    kacMin = new Float32Array(tnx * tny); kacMax = new Float32Array(tnx * tny);
  }
  const S = LSCHRITT;
  for (let ty = 0; ty < tny; ty++) {
    const cy1 = Math.min(ny, (ty + 1) * TKACHEL);
    const py0 = ty * TKACHEL * S, py1 = Math.min(rH - 1, cy1 * S);
    for (let tx = 0; tx < tnx; tx++) {
      const cx1 = Math.min(nx, (tx + 1) * TKACHEL);
      const px0 = tx * TKACHEL * S, px1 = Math.min(rW - 1, cx1 * S);
      let mn = Infinity, mx = -Infinity;
      for (let y = py0; y <= py1; y++) {
        const z = y * rW;
        for (let x = px0; x <= px1; x++) {
          const i = z + x;
          // Ohne Rueckruf je Zelle: eine halbe Million indirekter Aufrufe je
          // Bild kosten mehr als der Vergleich, der dahinter steht.
          /* modus 0: das rohe Feld (Hoehenlinien — ungueltige Zellen werden im
             Rumpf uebersprungen, ihr Wert kommt nie vor).
             modus 1: wie ecke() beim Gesteinsstapel, 2: wie ecke() beim Eis.

             Und zwar **einschliesslich des Sichtrands**. Ohne ihn kennt der
             Index den Sprung auf -1e9 an der Schnittkante nicht, haelt die
             Kachel dort fuer gleichfoermig und ueberspringt sie — dann bleibt
             der Ring offen und fuellt sich als Keil quer ueber die Karte.
             Genau dieser Fehler stand schon einmal hier, mit der Randspalte
             statt dem Sichtrand. Ein Ring ist geschlossen oder Unsinn. */
          const drin = modus === 0
            || (x >= sichtX0 && x <= sichtX1 && y >= sichtY0 && y <= sichtY1);
          const v = !drin ? -1e9
                  : modus === 0 ? feld[i]
                  : modus === 1 ? (maskeR[i] ? feld[i] : -1e9)
                  : (maskeR[i] && eisD[i] >= EISSCHWELLE ? feld[i] : -1e9);
          if (v < mn) mn = v;
          if (v > mx) mx = v;
        }
      }
      kacMin[ty * tnx + tx] = mn; kacMax[ty * tnx + tx] = mx;
    }
  }
  return tnx;
}

// Ein Zug je Beleuchtungsstufe: 12 Stufen, hell und dunkel, also 24 Zuege fuer
// die ganze Karte statt zweitausend einzelner Striche.
const LINIENEIMER = Array.from({ length: 4 * NSTUFE }, () => []);

function zieheLinien(zc, feld, niveaus, gilt, fest) {
  linienFeld();
  const S = LSCHRITT, je = kw / rW, nx = lnx, ny = lny;
  for (const e of LINIENEIMER) e.length = 0;
  const holL = (x, y) => licht[Math.max(0, Math.min(rH - 1, y)) * rW + Math.max(0, Math.min(rW - 1, x))];

  /* Der Index liest hier das **rohe** Feld, nicht die Gueltigkeit: eine
     ungueltige Zelle wird im Rumpf uebersprungen, ihr Wert kommt also nie
     vor. Damit ist [min,max] eine Obermenge dessen, was der Zug sieht — und
     eine Obermenge ueberspringt nie zu viel. */
  const tnx = kachelBauen(nx, ny, feld, 0), tny = kacNY;
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
    for (let ty = 0; ty < tny; ty++) {
     for (let tx = 0; tx < tnx; tx++) {
      const ti = ty * tnx + tx;
      if (t < kacMin[ti] || t > kacMax[ti]) continue;
      const cyA = ty * TKACHEL, cyB = Math.min(ny, cyA + TKACHEL);
      const cxA = tx * TKACHEL, cxB = Math.min(nx, cxA + TKACHEL);
      // Liegt die Kachel ganz neben der Leinwand, ist sie nicht zu zeichnen.
      // Hoehenlinien werden gestrichen, nicht gefuellt — eine Linie, die am
      // Rand endet, ist harmlos.
      if (cxB * S < sichtX0 || cxA * S > sichtX1
          || cyB * S < sichtY0 || cyA * S > sichtY1) continue;
      for (let cy = cyA; cy < cyB; cy++) {
       for (let cx = cxA; cx < cxB; cx++) {
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
        if (m > 2) {
          glaetten(m);
          if (fest) festMalen(zc, m); else ablegen(m, niv.zaehl, niv.kueste);
        }
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

/* Duenner als frueher (0,7 / 1,6 / 2,1). Die Strichbreite steht in
   Bildpunkten und die Karte ist fast doppelt so gross geworden — dieselbe
   Breite liest sich auf der grossen Karte als Balken, nicht als Linie. */
const LINIE = 0.55, ZAEHLSTARK = 1.7, KUESTESTARK = 2.3;
/* Ein Strich je Eimer und Breite, nicht je Zug.
   Vorher wurde jeder Zug einzeln begonnen und gestrichen: bei feinem Feld
   sind das mehrere tausend Striche je Bild, und gemessen waren es **182
   von 271 ms**. Die Punkte sind dieselben; teuer war das Aufsetzen. Jetzt
   sammelt ein Pfad alle Zuege eines Eimers, die dieselbe Breite
   haben — zwei Breiten je Eimer, also rund fuenfzig Striche fuer die ganze
   Karte. Die Kueste kommt zuletzt, damit sie obenauf liegt. */
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
    for (let art = 0; art < 2; art++) {
      const kueste = art === 1;
      let offen = false;
      for (const e of eimer) {
        if (e.kueste !== kueste) continue;
        if (!offen) { zc.beginPath(); offen = true; }
        const seg = e.seg;
        zc.moveTo(seg[0], seg[1]);
        for (let i = 1; i < seg.length / 2; i++) zc.lineTo(seg[i * 2], seg[i * 2 + 1]);
      }
      if (offen) {
        zc.lineWidth = LINIE * (kueste ? KUESTESTARK : zaehl ? ZAEHLSTARK : 1);
        zc.stroke();
      }
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
  zc.lineWidth = 0.75;
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
/* Die Karte steht **leicht gekippt** da, nicht flach. Der Grund ist der
   Gegenstand: ein Eisschild ist ein Koerper, und flach gesehen ist er eine
   weisse Flaeche. Schon zwoelf Grad geben dem Stapel eine Kante und dem
   Betrachter den Hinweis, dass er kippen und drehen kann.
   KIPPSTART in Anteilen von KIPPMAX; „Zurueck" stellt darauf zurueck. */
const KIPPSTART = 0.2;
let NEIGUNG = KIPPSTART, DREHUNG = 0, ZOOM = 1, vX = 0, vY = 0;
const KIPPMAX = 62 * Math.PI / 180, ZOOMMAX = 8;
/* ---------- Wie hoch der Stapel steht ----------
   Vorher ein Anteil der Feldhoehe: hoch = hoehe mal 0,30. Das ist bequem und
   sagt ueber das Gelaende nichts — dieselbe Zahl macht aus einem Tiefland
   einen Teller und aus den Alpen einen Nadelwald. Genau das war zu sehen.

   Stattdessen eine Metrik, die misst, was schiefgeht. Bei einem
   Laserschnittmodell ist das Verdecken: steht die Wand einer Platte hoeher, als
   die Terrasse darunter tief ist, sieht man von der Terrasse nichts mehr, und
   aus einer Stufenpyramide wird eine Nadel. Das Verhaeltnis der beiden ist

       lambda(g) = tan(phi) * g * px_v / px_h

   mit g der Gelaendesteigung in Metern je Gitterzelle, px_v den Bildpunkten je
   Meter Hoehe, px_h den Bildpunkten je Gitterzelle und phi der Kippung.
   lambda < 1 heisst: die Terrasse bleibt sichtbar.

   Ausgelegt wird auf die **staerkste** Kippung — dort verdeckt es am meisten —
   und auf den Hang, der das Gebirge ausmacht: das 90-Prozent-Quantil der
   Steigung, ueber alle Zeitscheiben gemessen und in der Nutzlast mitgeliefert
   (D.g90). Fuer diesen Ausschnitt sind das 173 m je 6,8-km-Zelle, also 2,5
   Prozent Neigung.

   Der alte Wert 0,30 entsprach lambda(g90) = 13: dreizehn Wandhoehen auf eine
   Terrassentiefe. Der Median des Gelaendes stand schon bei lambda = 1,6. */
/* Der Zielwert ist am Bild festgelegt, nicht gerechnet — die Metrik sagt, was
   gemessen wird, nicht wo die Grenze des guten Geschmacks liegt. Gerendert und
   verglichen wurden lambda = 13 (der alte Zustand), 8, 6, 5, 4, 2,6, 1,8, 1,2:

     13   Nadelwald. Jede Alpenspitze ein Turm, der Eisschild eine Wand.
      6   die Alpen fangen wieder an zu zacken.
      4   Gebirge bleiben Gebirge, der Eisschild ist eine Kuppel. Gewaehlt.
      2,6 die Mittelgebirge verschwinden, das Relief wird zur Reliefandeutung.

   lambda = 4 entspricht hier einer Ueberhoehung von rund 84-fach — viel, aber
   die Karte ist 4400 km breit und 5 km hoch: bei 1:1 waere der Eisschild
   einen halben Bildpunkt dick. Vorher standen 273-fach. */
const LAMBDA = Number(D.lambda ?? 4);
let HOCH3D = 0.30;               // wird in masse() aus der Metrik gesetzt
const schraeg = () => NEIGUNG > 0.001 || Math.abs(DREHUNG) > 1e-4;
const ansichtFrei = () => ZOOM !== 1 || vX !== 0 || vY !== 0;
let SICHT = null;
/* Aus, bis jemand danach fragt. Die DATED-1-Linien sind die **Feldbefunde** —
   wo Datierungen den Eisrand tatsaechlich belegen — und liegen damit auf einer
   anderen Ebene als alles andere im Bild: die Karte zeigt ein Modell, sie
   zeigen die Messungen dazu. Fuer den ersten Blick ist das eine Ebene zu viel,
   und im Film, der keine Knoepfe hat, waere sie gar nicht abwaehlbar. Wer den
   Vergleich sehen will, drueckt „Band". */
let BAND = false;

// Die Scheiben liegen auf **absoluten Hoehen**, damit der Rahmen feststeht.
// Nach dem hoechsten Punkt zu rechnen, der gerade dasteht, waere verlockend —
// und dann schrumpfte die Karte in dem Mass, in dem der Eisschild waechst.
// Zwei Bilder waeren nicht mehr vergleichbar, und genau dafuer ist sie gebaut.
/* Der Rahmen ist **die Farbleiter**, nicht eine runde Zahl.

   Vorher stand hier −1000 bis 3800 m. Alles darunter hatte keine Platte, also
   auch keine Farbe: neunzehn Prozent der Karte — der ganze Atlantik, das
   ganze Mittelmeer, die Norwegische See — standen gekippt als schwarze
   Loecher da, waehrend sie flach in vier Blautoenen lagen.

   Jetzt laufen die Platten von der untersten Bandgrenze der Gesteinsleiter bis
   zur obersten, und ihre Dicke ist **die Landstufe**. Weil ein Wasserband
   genau zwei Landstufen misst, faellt damit jede Bandgrenze auf eine
   Plattenkante: Farbe, Hoehenlinie und Plattenrand sind dieselbe Zahl. Das ist
   der Grundsatz der Karte, der bisher nur flach galt.

   Was tiefer liegt als die unterste Bandgrenze — zwei Prozent, die Tiefsee —
   liegt auf dem Sockel, genau wie es in der Farbleiter im untersten Band
   liegt. */
const S_VON = -TIEFMAX, S_BIS = HOCHMAX;
const dzM = LANDSTUFE;
const NSCHEIBE = Math.round((S_BIS - S_VON) / dzM);

function sichtRechnen() {
  const phi = NEIGUNG * KIPPMAX, co = Math.cos(phi), si = Math.sin(phi);
  const ct = Math.cos(DREHUNG), st = -Math.sin(DREHUNG);
  const cx = breite / 2, cy = hoehe / 2, hoch = hoehe * HOCH3D;
  // hoch ist in masse() gesetzt; HOCH3D ist nur noch die abgeleitete Zahl,
  // damit ein Blick in die Konsole sie zeigt.
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
/* Zwei Staepel statt einem, und das ist der Grund:
   Eine Platte ist eine Hoehenstufe, und eine Hoehenstufe hat **eine** Farbe.
   Welche — Gestein oder Eis — wurde vorher danach entschieden, was auf dieser
   Hoehe ueber die ganze Karte ueberwiegt. Bei 1400 m liegen aber die Alpen
   **und** der Eisschild, und wer von beiden mehr Zellen hat, faerbte den
   anderen mit: der Gletscher bekam gruene Waende, die Alpen weisse. Auf einem
   Bild, das Fels und Eis trennen soll, ist das der eine Fehler, den es nicht
   geben darf.

   Jetzt wird je Hoehe zweimal geschnitten — einmal ueber das ganze Feld, einmal
   nur ueber die Eiszellen — und in dieser Reihenfolge gemalt. Der Eisring ist
   per Konstruktion eine Teilmenge des Felsrings, liegt also genau dort darueber,
   wo Eis liegt. Das ist dasselbe „Eis gewinnt, wo es liegt" wie in der flachen
   Sicht, nur in drei Dimensionen. */
let ringeCache = [null, null], ringeStand = -1, ringeRW = 0, ringeSicht = '';
function scheibenRinge(nurEis) {
  if (ringeCache[nurEis] && ringeStand === feldStand && ringeRW === rW
      && ringeSicht === sichtSchluessel)
    return ringeCache[nurEis];
  if (ringeStand !== feldStand || ringeRW !== rW || ringeSicht !== sichtSchluessel)
    ringeCache = [null, null];
  ringFeld();
  const S = LSCHRITT, je = kw / rW, nx = rnx, ny = rny;
  /* Ausserhalb des Sichtbaren gilt dasselbe wie ausserhalb des Feldes: tiefer
     als jede Platte. Das ist **noetig, nicht bloss sparsam** — ein Plattenring
     wird gefuellt, und eine Kette, die am Rand einfach aufhoert, fuellt sich
     als Keil quer ueber die Karte. Mit dem Nullrand schliesst sich der Ring
     entlang der Schnittkante, und die liegt neben der Leinwand. */
  const ecke = (px, py) => {
    if (px < sichtX0 || py < sichtY0 || px > sichtX1 || py > sichtY1) return -1e9;
    if (px < 0 || py < 0 || px >= rW || py >= rH) return -1e9;
    const i = py * rW + px;
    if (!maskeR[i]) return -1e9;
    if (nurEis && eisD[i] < EISSCHWELLE) return -1e9;
    return flaeche[i];
  };
  const pfade = new Array(NSCHEIBE).fill(null);
  if (nurEis && eisAnzahl === 0) { ringeCache[1] = pfade; return pfade; }
  /* Derselbe Kachelindex wie bei den Hoehenlinien, mit derselben Vorschrift,
     die ecke() liest. Gekippt sind es 33 Platten mal zwei Materialien statt
     37 Hoehenlinien — dieselbe Schleife, dieselbe Rechnung, dieselbe
     Ersparnis. */
  const tnx = kachelBauen(nx, ny, flaeche, nurEis ? 2 : 1);
  for (let k = 1; k < NSCHEIBE; k++) {
    const t = S_VON + k * dzM;
    // Der Eisstapel braucht nur die Hoehen, in denen Eis liegt. Eine Scheibe
    // ueber dem hoechsten oder unter dem tiefsten Eis ist leer, und ein leerer
    // Marching-Squares-Lauf ueber 760 mal 649 Punkte kostet trotzdem.
    if (nurEis && (t > eisMax || t + dzM < eisMin)) continue;
    const stempel = ++rZaehler;
    let nk = 0;
    const setze = (idx, x, y) => {
      if (rStempel[idx] !== stempel) {
        rStempel[idx] = stempel; rX[idx] = x; rY[idx] = y;
        rA[idx] = -1; rB[idx] = -1; rBesucht[idx] = 0; rListe[nk++] = idx;
      }
    };
    const binde = (p, q) => { if (rA[p] < 0) rA[p] = q; else if (rB[p] < 0) rB[p] = q; };
    // Nur ueber das Sichtbare, plus eine Zelle Rand ringsum: dort schliessen
    // sich die Ringe gegen den Nullrand aus ecke().
    const cyVon = Math.max(-1, ((sichtY0 / S) | 0) - 1);
    const cyBis = Math.min(ny, ((sichtY1 / S) | 0) + 1);
    const cxVon = Math.max(-1, ((sichtX0 / S) | 0) - 1);
    const cxBis = Math.min(nx, ((sichtX1 / S) | 0) + 1);
    for (let cy = cyVon; cy <= cyBis; cy++) {
      // Der Rand aus Nullen schliesst die Ringe und wird immer gegangen; im
      // Inneren springt der Index ueber ganze Kacheln hinweg.
      const randY = cy <= cyVon || cy >= cyBis;
      for (let cx = cxVon; cx <= cxBis; cx++) {
        if (!randY && cx > cxVon && cx < cxBis && cx >= 0 && cx < nx) {
          const ti = (cy >> TKBIT) * tnx + (cx >> TKBIT);
          if (t < kacMin[ti] || t > kacMax[ti]) {
            // Ans Kachelende — aber hoechstens bis nx-1, sonst ueberspringt
            // das cx++ der Schleife die **Randspalte** cx = nx. Ohne sie
            // schliesst sich der Ring am rechten Bildrand nicht, und eine
            // offene Kette wird als Keil gefuellt: grosse schiefe Flaechen
            // quer ueber die Karte.
            const ende = (((cx >> TKBIT) + 1) << TKBIT) - 1;
            const deckel = Math.min(nx - 1, cxBis - 1);
            cx = ende < deckel ? ende : deckel;
            continue;
          }
        }
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
  ringeCache[nurEis] = pfade; ringeStand = feldStand; ringeRW = rW;
  ringeSicht = sichtSchluessel;
  return pfade;
}

/* Die Farbe einer Platte: **eine**, denn eine Platte ist genau eine Hoehenstufe.
   Vorher wurde die fertige Karte hineinbeschnitten, und weil die Farbe auf dem
   groeberen Gitter entsteht, blutete auf jeder Platte ein Saum der Nachbarfarbe
   ueber den Rand. Welche Leiter — Gestein oder Eis — entscheidet, ob auf dieser
   Hoehe ueberwiegend Eis liegt. */
/* Die Farbe einer Platte haengt nur an ihrer Hoehe und ihrem Material — eine
   Platte ist genau eine Hoehenstufe, und welche Leiter sie traegt, steht jetzt
   beim Schneiden fest (siehe scheibenRinge). Das Abzaehlen, was auf einer Hoehe
   ueberwiegt, ist damit weg: es war die Quelle der gruenen Gletscherwaende. */
function bandFarbe(k, eis) {
  const t = S_VON + k * dzM;
  if (eis) {
    const j = Math.max(0, Math.min(NEIS - 1, Math.floor(eisLeiter(t) * NEIS)));
    return [ER[j], EG[j], EB[j]];
  }
  const j = Math.max(0, Math.min(NBAND - 1, Math.floor(gesteinLeiter(t) * NBAND)));
  return [GR[j], GG[j], GB[j]];
}

/* Die Wand einer Platte, und ihr Fuss. Beide standen auf 0,78 und 0,55 —
   gemessen an 26 Platten. Seit der Stapel von der untersten Bandgrenze bis zur
   obersten laeuft, sind es 33, und damit stehen ein Drittel mehr dunkle
   Streifen im Bild; 0,86 und 0,70 trugen die Stufe weiter, ohne die Karte zu
   zerschneiden. Mit der harten Kante und dem Schlagschatten darunter muss die
   Wand den Absatz nicht mehr allein zeigen: 0,82 und 0,62 lassen sie wieder
   etwas dunkler stehen. */
const WANDDUNKEL = 0.82, WANDFUSS = 0.62, WANDSCHRITT = 3;
/* Die Sicheln der beleuchteten Kante sind absichtlich **nicht** ganz deckend:
   gerade das laesst die Bandfarbe durchscheinen, statt sie zu ueberblenden.
   Der erste Wurf stand auf 0,85/0,75 und uebertoente den Eisschild — bei 26
   Scheiben liegen die Kanten dort dichter als die Terrassen breit sind. */
/* Die beleuchtete Kante: **duenn und hart**, nicht breit und schwach.

   Der Praegetrick fuellt den Ring je Platte zweimal halbdurchsichtig, weiss
   zum Licht und schwarz von ihm weg, versetzt um lv. Sichtbar bleibt ein
   Saum von der Breite lv. Der Schleier, der gekippt ueber der Karte lag, war
   die Summe dieser Saeume ueber 33 Platten — und der erste Versuch dagegen
   war, die Deckkraft zu senken. Das nahm den Schleier und mit ihm die Kante:
   das Relief wirkte flach, die Karte verwaschen.

   Richtig ist das Umgekehrte: die Kante **schmal** machen — ein Geraetepixel,
   nicht ein CSS-Pixel — und **hart** lassen. Ein duenner Saum summiert sich
   nicht zu Milchglas, weil er kaum Flaeche hat; und hart gezogen liest er
   sich als Schnittkante eines Modells, nicht als Weichzeichner. Gemessen an
   sechs Varianten (METHODIK 8c): 0,70 bei einem Geraetepixel Breite.

   Die Deckkraft bleibt an die Zahl der Platten gekoppelt: ueber n Platten
   bleibt (1 − a)^n durch, also a(n) = 1 − (1 − 0,70)^(33/n). */
let KANTENVERSATZ = 0.55; const KANTENZOOM = 4;
const KANTENBEI = 33, KANTENHELL33 = 0.70, KANTENDUNKEL33 = 0.70;
const kantenDeck = a => 1 - Math.pow(1 - a, KANTENBEI / Math.max(1, NSCHEIBE));
let KANTENHELL = kantenDeck(KANTENHELL33), KANTENDUNKEL = kantenDeck(KANTENDUNKEL33);

/* Der Schlagschatten einer Platte auf die darunter: drei dunkle Kopien des
   Rings, vom Licht weg versetzt, nach aussen abnehmend deckend. Er ist das,
   was einem Laserschnittmodell Tiefe gibt — die Kante sagt, **wo** die Stufe
   ist, der Schatten sagt, **wie hoch**. WURFLAENGE in Vielfachen des
   CSS-Pixel-Versatzes, WURFDECK die Deckkraft der innersten Kopie. */
let WURFLAENGE = 1.2, WURFDECK = 0.35, WURFSTUFEN = 3;

function scheibenMalen() {
  const Dp = DPR;
  const S = sichtRechnen();
  const { co, si, ct, st, cx, cy, z: zz, oX: ozX, oY: ozY, dz } = S;
  const fels = scheibenRinge(0), eis = scheibenRinge(1);
  // Der Umriss dessen, was dieser Durchgang malt — in Geraetepunkten, damit er
  // am Ende den Lichtblit schneiden kann.
  const lichtMaske = new Path2D();
  const a2 = Dp * zz * ct, c2 = Dp * zz * st, b2 = -Dp * co * zz * st, d2 = Dp * co * zz * ct;
  const eX = Dp * ozX - a2 * cx - c2 * cy;
  // lv0 ist ein CSS-Pixel im Grundriss; die Kante bekommt davon so viel, dass
  // sie auf dem Schirm ein Geraetepixel breit ist — auf Retina also die Haelfte.
  const lv0 = KANTENVERSATZ * Math.min(KANTENZOOM, ZOOM) / zz * breite / rW;
  const lv = lv0 * Math.max(0.58, Math.min(1, 1.16 / Dp));

  /* Der Sockel: die ganze Kartenflaeche in der Farbe des tiefsten Bandes.
     Die Schleife darunter faengt bei k = 1 an, deckt also erst ab der zweiten
     Bandgrenze; was tiefer liegt — die Tiefsee — bekaeme ohne den Sockel keine
     Platte und stuende schwarz da. Genommen wird die Silhouette, die es fuer
     die DATED-Raender ohnehin gibt. */
  {
    const [r, g, b] = bandFarbe(0, 0);
    const sil = silhouette();
    const schritte = Math.max(2, Math.ceil(Dp * dz / WANDSCHRITT));
    ctx.fillStyle = 'rgb(' + Math.round(r * WANDFUSS) + ',' + Math.round(g * WANDFUSS)
      + ',' + Math.round(b * WANDFUSS) + ')';
    for (let w = 0; w < schritte; w++) {
      ctx.setTransform(a2, b2, c2, d2, eX,
        Dp * (ozY + (1 - w / schritte) * dz) - b2 * cx - d2 * cy);
      ctx.fill(sil, 'evenodd');
    }
    ctx.setTransform(a2, b2, c2, d2, eX, Dp * ozY - b2 * cx - d2 * cy);
    ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
    ctx.fill(sil, 'evenodd');
    lichtMaske.addPath(sil, new DOMMatrix([a2, b2, c2, d2, eX,
      Dp * ozY - b2 * cx - d2 * cy]));
  }

  /* Von unten nach oben, und je Hoehe erst das Gestein, dann das Eis darauf.
     Nicht erst alle Felsplatten und dann alle Eisplatten: der Stapel muss in
     der Tiefe geordnet bleiben, sonst laege eine niedrige Eisplatte ueber
     einem hohen Berg. */
  for (let k = 1; k < NSCHEIBE; k++) {
    for (const istEis of [0, 1]) {
    const ringe = istEis ? eis : fels;
    if (!ringe[k]) continue;
    const [r, g, b] = bandFarbe(k, istEis);
    const wand = 'rgb(' + Math.round(r * WANDDUNKEL) + ',' + Math.round(g * WANDDUNKEL) + ',' + Math.round(b * WANDDUNKEL) + ')';
    const fuss = 'rgb(' + Math.round(r * WANDFUSS) + ',' + Math.round(g * WANDFUSS) + ',' + Math.round(b * WANDFUSS) + ')';
    /* Erst die Wand: derselbe Ring, eine Stufe tiefer, gefuellt — und
       **gestrichen statt gesprungen**. Ein einzelner Abzug laesst nur den
       unteren Saum der Form stehen, und der ist so hoch wie die Form auf dem
       Schirm, nicht wie die Platte. Gekippt staucht der Kosinus sie zusammen,
       und der Rest bliebe schwarz — die Kuppen schwebten. */
    /* Mindestens zwei Striche. Bei einem blieb zwischen zwei Platten ein Spalt
       offen, wo die Ringe weit auseinanderliegen — an steilen Kuesten —, und
       durch den Spalt sah man den schwarzen Grund. Auffallen tat es erst,
       als das Licht richtig lag: auf Durchsichtigem malt soft-light grau. */
    const schritte = Math.max(2, Math.ceil(Dp * dz / WANDSCHRITT));
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
    if (!istEis) for (const tief of [k - 1, k])
      lichtMaske.addPath(ringe[k], new DOMMatrix([a2, b2, c2, d2, eX,
        Dp * (ozY - tief * dz) - b2 * cx - d2 * cy]));
    ctx.save();
    ctx.translate(-lv, -lv);
    ctx.fillStyle = '#fff'; ctx.globalAlpha = KANTENHELL; ctx.fill(ringe[k], 'evenodd');
    ctx.translate(2 * lv, 2 * lv);
    ctx.fillStyle = '#000'; ctx.globalAlpha = KANTENDUNKEL; ctx.fill(ringe[k], 'evenodd');
    ctx.translate(-lv, -lv);
    if (WURFLAENGE > 0 && WURFDECK > 0) {
      // Von aussen nach innen, jede Stufe deckender: die aeussere Kopie
      // liegt unter den inneren, also addiert sich der Rand nicht.
      for (let w = WURFSTUFEN; w >= 1; w--) {
        const o = lv0 * WURFLAENGE * w / WURFSTUFEN;
        ctx.save();
        ctx.translate(o, o);
        ctx.fillStyle = '#000';
        ctx.globalAlpha = WURFDECK * (WURFSTUFEN - w + 1) / WURFSTUFEN;
        ctx.fill(ringe[k], 'evenodd');
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
    ctx.fill(ringe[k], 'evenodd');
    ctx.restore();
    }
  }
  ctx.setTransform(Dp, 0, 0, Dp, 0, 0);

  /* Das Licht als eigene Ebene, im Feldgitter gebaut und **einmal** fertig
     hochgelegt. Je Scheibe aufgelegt kostete es so viel wie vorher die ganze
     Textur — die Kosten sitzen in den Blits, nicht im Bild. Unscharf wird dabei
     nur das Licht; Farbe, Kanten und Waende bleiben scharf. */
  hcS.setTransform(1, 0, 0, 1, 0, 0);
  hcS.clearRect(0, 0, rW, rH);
  /* Zwei Abbildungen, und beide muessen stimmen.

     hkS ist eine verkleinerte Kopie der **Leinwand** — am Ende wird sie in
     einem Stueck darueber geblittet. Der Massstab ist deshalb rW/breite, nicht
     rW/kw, und der Versatz der Karte (kx,ky) gehoert **nicht** hinein: die
     Leinwand faengt bei null an.

     Das Lichtbild hkL dagegen liegt im **Feldgitter**. Es muss denselben Weg
     nehmen wie das Gelaende, dessen Licht es ist: erst ins Grundriss-Mass
     (mal kw/rW, plus kx), dann durch die Sichtmatrix. Genau das fehlte —
     es wurde mit der Einheitsmatrix gezeichnet, also **ungedreht**, waehrend
     der Ausschnitt gedreht war. Flach faellt das kaum auf; gedreht liegt die
     ganze Schattierung schief ueber dem Relief, und das Wasser sieht aus, als
     drehte seine Textur nicht mit. */
  const f = rW / breite;                        // Leinwand -> Lichtleinwand
  const A2 = f * zz * ct, C2 = f * zz * st, B2 = -f * co * zz * st, D2 = f * co * zz * ct;
  const EX = f * ozX - A2 * cx - C2 * cy;
  const gx = kw / rW, gy = kh / rH;             // Feldgitter -> Grundriss
  // Fuer das Licht genuegt der Gesteinsstapel: er ist die volle Flaeche, der
  // Eisstapel eine Teilmenge davon. Zweimal aufzulegen kostete nur Zeit.
  for (let k = 0; k < NSCHEIBE; k++) {
    const ring = k === 0 ? silhouette() : fels[k];
    if (!ring) continue;
    for (const tief of (k === 0 ? [0] : [k - 1, k])) {
      hcS.save();
      hcS.setTransform(A2, B2, C2, D2, EX, f * (ozY - tief * dz) - B2 * cx - D2 * cy);
      hcS.beginPath();
      hcS.clip(ring, 'evenodd');
      hcS.transform(gx, 0, 0, gy, kx, ky);
      hcS.drawImage(hkL, 0, 0);
      hcS.restore();
    }
  }
  /* Und die Lichtebene auf das beschneiden, was wirklich gemalt ist.
     soft-light rechnet mit dem Untergrund — wo der **durchsichtig** ist, gibt
     die Formel die Quelle unveraendert zurueck, und das ist hier ein
     mittleres Grau. Genau das stand als grauer Saum um die Karte, sobald sie
     gedreht war und der Lichtstapel ueber ihren Rand hinausragte.

     destination-in behaelt vom Licht nur, was die fertige Karte deckt. Ein
     Blit der grossen Leinwand in die kleine, einmal je Bild. */
  /* Und der Blit **geschnitten auf das, was wirklich gemalt ist**.

     soft-light rechnet mit dem Untergrund; wo der durchsichtig ist, gibt die
     Formel die Quelle unveraendert zurueck, und die ist hier ein mittleres
     Grau. Das stand als Saum um die Karte — am deutlichsten gedreht, weil der
     Rand dann schraeg liegt.

     Der Saum kommt nicht vom Hochrechnen, sondern von der **Aufloesung des
     Ausschnitts**: der Lichtstapel wird im Feldgitter geschnitten, also bei
     einem Viertel der Leinwandbreite, und ein grob gerasterter Rand deckt
     Punkte ab, die die feine Farbe daneben nur halb fuellt. Dagegen hilft kein
     Schrumpfen der Ebene — gemessen mit einem und mit zwei Punkten Erosion,
     der Saum blieb.

     Was hilft, ist derselbe Umriss in voller Aufloesung: die Ringe werden beim
     Malen mitgesammelt (lichtMaske) und schneiden hier den Blit. Ein Pfad, ein
     Blit, kein Ruecklesen der grossen Leinwand — das kostete 110 ms je Bild. */
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clip(lichtMaske);
  ctx.globalCompositeOperation = 'soft-light';
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(hkS, 0, 0, cv.width, cv.height);
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
}

/* ================================================== Heute, und zwei Gipfel
   Zwei Ebenen mit verschiedenen Aussagen, deshalb getrennt behandelt:

   **Heute** — die moderne Kuestenlinie und achtzehn Staedte. Sie gehoeren
   nicht in die Karte, sie gehoeren daneben: sie sagen nichts ueber die
   Eiszeit, sondern geben dem Auge einen Anker. Abschaltbar, und im Ton so
   weit zurueck, dass sie das Relief nicht stoeren.

   Eine Ausnahme: die Staedte, die unter dem Eis lagen, tragen darunter in
   Klammern dessen Maechtigkeit — live, nicht als Hoechstwert. Das *ist* eine
   Aussage ueber die Eiszeit, und zwar die greifbarste, die die Karte machen
   kann: nicht „hier lag mal Eis", sondern „ueber Oslo liegen gerade 2 374
   Meter davon".

   **Die Gipfel** — der hoechste Punkt des Eises und der Mont Blanc, beide mit
   ihrer Hoehe zur gezeigten Zeit. Der Vergleich ist die Aussage: der
   Eisschild ueber Skandinavien misst sich am hoechsten Berg der Alpen, und
   zwar an dem, der damals dastand, nicht an dem von heute. Immer sichtbar. */
/* ---------- Wer zuerst da ist, behaelt den Platz ----------
   Achtzehn Staedte, drei Eiskuppen und der Mont Blanc, und die Haelfte davon
   draengt sich auf Skandinavien. Solange jede Stadt nur ihren Namen trug, ging
   das gerade noch; seit die vereisten eine zweite Zeile bekommen, ist
   „Helsinki (1 331 m under ice)" doppelt so breit wie vorher und liegt quer
   ueber Sankt Petersburg.

   Also eine Belegungsliste je Bild: ein flaches Feld aus Rechtecken, in der
   Reihenfolge gefuellt, in der die Beschriftungen ihren Anspruch anmelden.
   Wer keinen freien Platz findet, weicht auf die andere Seite aus; wer auch
   dort keinen findet, gibt zuerst die zweite Zeile auf und dann den Namen.
   Der Punkt bleibt immer stehen — er ist der Anker, der Name ist der Komfort.

   Die Reihenfolge ist die Rangfolge:
     1. die Eiskuppen und der Mont Blanc  — sie sind die Aussage der Karte
     2. die Staedte **unter** Eis         — sie sind die Aussage dieser Ebene
     3. alle uebrigen Staedte             — Anker fuers Auge, sonst nichts */
const belegt = [];
function frei(x0, y0, x1, y1) {
  for (let i = 0; i < belegt.length; i += 4)
    if (x0 < belegt[i + 2] && x1 > belegt[i]
     && y0 < belegt[i + 3] && y1 > belegt[i + 1]) return false;
  return true;
}
function belege(x0, y0, x1, y1) { belegt.push(x0, y0, x1, y1); }

const HEUTEFARBE = 'rgba(255,255,255,.22)';
const ORTFARBE = 'rgba(255,255,255,.52)';
const ORTPUNKT = 'rgba(255,255,255,.62)';
/* Die zweite Zeile unter den Staedten, die gerade unter Eis liegen. Ein
   Hauch blau — es ist eine Aussage ueber das Eis, nicht ueber die Stadt —,
   und kleiner gesetzt: der Name ist der Anker, die Zahl der Zusatz. */
const UNTEREIS = 'rgba(200,226,255,.72)';
const UNTERKLEIN = 7.5 / 8.5;   // Groessenverhaeltnis der beiden Zeilen
let HEUTE = true;

function heuteUeber() {
  if (!HEUTE) return;
  ctx.save();
  /* Der Schnitt gilt **nur der Kuestenlinie**. Er stand frueher ueber dem
     ganzen Block, und damals war das folgenlos: die Karte war maskiert, und
     wo nichts gezeichnet wurde, stand ohnehin kein Ort. Mit dem gefuellten
     Rahmen schnitt er die Namen am Bildrand ab — „Yekaterinburg" endete als
     „Yekate". */
  if (!schraeg()) ctx.clip(silhouette());
  ctx.strokeStyle = HEUTEFARBE;
  ctx.lineWidth = schraeg() ? 0.7 : 0.8;
  ctx.lineJoin = 'round';
  const p = new Path2D();
  for (const [xs, ys] of heuteKueste()) {
    for (let i = 0; i < xs.length; i++) {
      const [sx, sy] = projRand(xs[i], ys[i]);
      if (i === 0) p.moveTo(sx, sy); else p.lineTo(sx, sy);
    }
  }
  ctx.stroke(p);
  ctx.restore();
  ctx.save();

  /* Die Orte: ein Punkt von anderthalb Bildpunkten und ein Name daneben.
     Geschrieben wird **mit dunklem Umriss**, nicht mit Schlagschatten: die
     Karte hat weisses Eis und dunkles Wasser, und ein Schatten traegt nur auf
     einem von beiden. Stockholm stand auf der Eiskuppe und war nicht zu
     lesen. */
  ctx.font = '600 ' + (breite < 460 ? 7.5 : 8.5) + 'px system-ui,sans-serif';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  /* Erst die unter Eis, dann die uebrigen — beide in ihrer bisherigen
     Reihenfolge. Sortiert wird ueber einen Index, nicht ueber eine Kopie der
     Liste: ORTE steht fest, und je Bild ein Feld anzulegen waere Abfall. */
  const reihe = ORTE.map((o, i) => i);
  const dickeVon = new Float32Array(ORTE.length);
  for (let i = 0; i < ORTE.length; i++) {
    const o = ORTE[i];
    const fx = Math.max(0, Math.min(rW - 1, Math.round(o.x / GW * rW)));
    const fy = Math.max(0, Math.min(rH - 1, Math.round(o.y / GH * rH)));
    const fi = fy * rW + fx;
    dickeVon[i] = maskeR[fi] && eisD[fi] >= EISSCHWELLE ? eisD[fi] : 0;
  }
  reihe.sort((a, b) => (dickeVon[b] > 0) - (dickeVon[a] > 0) || a - b);

  const gross = breite < 460 ? 7.5 : 8.5, klein = breite < 460 ? 6.5 : 7.5;
  for (const oi of reihe) {
    const o = ORTE[oi];
    const [sx, sy] = projRand(o.x, o.y);
    if (sx < -20 || sy < -20 || sx > breite + 20 || sy > hoehe + 20) continue;
    const dick = dickeVon[oi];
    const zweite = dick ? '(' + nfm.format(Math.round(dick)) + ' m under ice)' : '';

    // Gemessen wird am **Kartenrand**, nicht am Rand der Leinwand: die Karte
    // steht in einem breiteren Feld, und ein Name, der rechts neben ihr im
    // Schwarzen haengt, sieht aus wie ein Versehen.
    const [randX] = projRand(GW, o.y);
    const ende = Math.min(breite, randX) - 4;
    const bName = ctx.measureText(o.name).width;
    ctx.font = '600 ' + klein + 'px system-ui,sans-serif';
    const bZweite = zweite ? ctx.measureText(zweite).width : 0;
    ctx.font = '600 ' + gross + 'px system-ui,sans-serif';

    /* Die Platzsuche. Zuerst variiert die **Lage**, zuletzt der Inhalt: eine
       Stadt, die etwas zu sagen hat, soll lieber zehn Punkte tiefer stehen
       als ihre Zahl verlieren.

       Sechs Lagen — neben dem Punkt, darueber, darunter, jeweils rechts und
       links —, und erst wenn keine davon passt, faellt die zweite Zeile weg
       und dieselben sechs werden noch einmal probiert. Mittig zuerst, weil
       dort die Zuordnung zum Punkt am klarsten ist. */
    let gewaehlt = null;
    for (const mitZweiter of zweite ? [true, false] : [false]) {
      const w = mitZweiter ? Math.max(bName, bZweite) : bName;
      const tief = mitZweiter ? 10 : 0;          // Abstand der zweiten Zeile
      const lagen = mitZweiter
        ? [sy - 4.5, sy - 15, sy + 6]
        : [sy - 0.5, sy - 10, sy + 9];
      for (const ny of lagen) {
        const y0 = ny - gross / 2 - 1;
        const y1 = ny + tief + (mitZweiter ? klein / 2 : gross / 2) + 1;
        for (const r of [false, true]) {
          const x0 = r ? sx - 4 - w : sx + 4, x1 = x0 + w;
          if (!r && x1 > ende) continue;
          if (r && x0 < 4) continue;
          if (y0 < 2 || y1 > hoehe - 2) continue;
          if (!frei(x0, y0, x1, y1)) continue;
          gewaehlt = { rechts: r, mitZweiter, ny, x0, y0, x1, y1 };
          break;
        }
        if (gewaehlt) break;
      }
      if (gewaehlt) break;
    }

    // Der Punkt steht immer — er ist der Anker, der Name ist der Komfort.
    ctx.strokeStyle = 'rgba(0,0,0,.62)';
    ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.arc(sx, sy, 1.5, 0, 7); ctx.stroke();
    ctx.fillStyle = ORTPUNKT;
    ctx.beginPath(); ctx.arc(sx, sy, 1.5, 0, 7); ctx.fill();
    if (!gewaehlt) continue;
    belege(gewaehlt.x0, gewaehlt.y0, gewaehlt.x1, gewaehlt.y1);

    ctx.textAlign = gewaehlt.rechts ? 'right' : 'left';
    const dx = gewaehlt.rechts ? -4 : 4;
    const oben = gewaehlt.ny;
    ctx.strokeStyle = 'rgba(0,0,0,.62)';
    ctx.lineWidth = 2.6;
    ctx.strokeText(o.name, sx + dx, oben);
    ctx.fillStyle = ORTFARBE;
    ctx.fillText(o.name, sx + dx, oben);
    if (gewaehlt.mitZweiter) {
      /* Kleiner und leiser als der Name: die Stadt ist der Anker, die Zahl
         der Zusatz. Beide gleich laut zu setzen hiesse, die Karte traegt
         achtzehn gleich wichtige Beschriftungen. */
      ctx.font = '600 ' + klein + 'px system-ui,sans-serif';
      ctx.strokeStyle = 'rgba(0,0,0,.62)';
      ctx.lineWidth = 2.4;
      ctx.strokeText(zweite, sx + dx, oben + 10);
      ctx.fillStyle = UNTEREIS;
      ctx.fillText(zweite, sx + dx, oben + 10);
      ctx.font = '600 ' + gross + 'px system-ui,sans-serif';
    }
    ctx.textAlign = 'left';
  }
  ctx.restore();
}

/* Der hoechste Punkt des Eises — gesucht wird er in paleo(), wo das Feld
   ohnehin einmal durchlaufen wird. Hier steht nur, wo er landet. */
const GIPFELFARBE = 'rgba(255,255,255,.88)';
const GIPFELFELS = 'rgba(255,214,150,.92)';
const nfm = new Intl.NumberFormat('en-GB');
/* „rechts" heisst hier: der Text **endet** am Kreuz, liegt also links davon.
   lieberLinks dreht die Vorliebe um — fuer die Eiskuppen, deren Schild sonst
   quer ueber das Eis laeuft, auf dem es am schlechtesten zu lesen ist. Westlich
   von ihnen liegt in jeder Zeitscheibe Wasser. Passt der Text dort nicht hin,
   faellt er auf die andere Seite zurueck. */
function marke(sx, sy, text, farbe, unten, lieberLinks) {
  ctx.lineJoin = 'round';
  // Klein. Die Schilder sind Beschriftung, nicht Ueberschrift: auf einer Karte,
  // die 900 Punkte breit steht, trug die alte Groesse wie ein Plakat.
  ctx.font = '600 ' + (breite < 520 ? 8 : 9) + 'px system-ui,sans-serif';
  ctx.textBaseline = unten ? 'top' : 'bottom';
  // Gemessen, nicht geraten: die Schilder hiessen einmal „ice 2 798 m" und
  // waren 60 Punkte breit; sie heissen jetzt „Scandinavian ice 2 694 m" und
  // sind doppelt so breit. Eine feste Schwelle von 90 Punkten liess sie am
  // rechten Rand halb draussen haengen.
  const tb = ctx.measureText(text).width;
  /* Die Seite wird nicht nur nach dem Bildrand gewaehlt, sondern auch nach
     dem, was schon dasteht. Diese Schilder haben Vorrang — sie melden ihren
     Anspruch vor den Staedten an —, aber untereinander weichen sie sich aus:
     bei 26 ka liegen Barents-Kara und Skandinavien nah beieinander.
     Findet sich gar kein Platz, wird trotzdem gesetzt: eine Eiskuppe ohne
     Schild ist schlimmer als ein Schild, das sich ueberschneidet. */
  const hk = 11;
  const seiten = lieberLinks ? [true, false] : [false, true];
  let rechts = seiten[0];
  for (const r of seiten) {
    const x0 = r ? sx - 6 - tb : sx + 6, x1 = x0 + tb;
    if (x0 < 4 || x1 > breite - 4) continue;
    const y0 = unten ? sy + 5 : sy - 5 - hk;
    if (!frei(x0, y0, x1, y0 + hk)) continue;
    rechts = r; break;
  }
  {
    const x0 = rechts ? sx - 6 - tb : sx + 6;
    const y0 = unten ? sy + 5 : sy - 5 - hk;
    belege(x0, y0, x0 + tb, y0 + hk);
  }
  ctx.textAlign = rechts ? 'right' : 'left';
  const dx = rechts ? -6 : 6, dy = unten ? 5 : -5;
  // Erst das Kreuz und die Schrift dunkel umranden, dann hell fuellen: auf
  // weissem Eis wie auf dunklem Wasser lesbar.
  ctx.strokeStyle = 'rgba(0,0,0,.66)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(sx - 4, sy); ctx.lineTo(sx + 4, sy);
  ctx.moveTo(sx, sy - 4); ctx.lineTo(sx, sy + 4);
  ctx.stroke();
  ctx.strokeText(text, sx + dx, sy + dy);
  ctx.strokeStyle = farbe;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(sx - 4, sy); ctx.lineTo(sx + 4, sy);
  ctx.moveTo(sx, sy - 4); ctx.lineTo(sx, sy + 4);
  ctx.stroke();
  ctx.fillStyle = farbe;
  ctx.fillText(text, sx + dx, sy + dy);
  ctx.textAlign = 'left';
}

function gipfelUeber() {
  ctx.save();
  /* Eine Marke je Kuppe des eurasischen Eiskomplexes, und sie verschwindet,
     sobald diese Kuppe geschmolzen ist. Das ist der Gewinn des groesseren
     Rahmens: dass Barents-Kara neben Skandinavien steht, dass Britannien mit
     knapp der halben Hoehe daneben liegt, und dass man beim Ablaufen sieht,
     in welcher Reihenfolge sie verschwinden.

     Groenland traegt **keine** Marke, obwohl es der hoechste Eispunkt des
     Bildes ist: es gehoert nicht zum eurasischen Komplex. Dass es als
     einziges Eis am Ende noch dasteht, sagt das Bild von selbst. */
  for (let k = 0; k < KUPPEN.length; k++) {
    /* Gemessen werden alle drei Kuppen, beschriftet wird nur, wer ein Schild
       hat — und das ist nur noch Barents-Kara. Ueber Skandinavien und
       Britannien stehen inzwischen Staedte mit ihrer Eismaechtigkeit, und die
       sagen dasselbe konkreter: „Oslo (2 374 m under ice)" ist eine Aussage,
       an der ein Mensch etwas hat, „Scandinavian ice 2 773 m" eine Zahl ueber
       einen Punkt, den niemand zeigen kann. Ueber Barents-Kara liegt keine
       Stadt und kann keine liegen — es war ein Schelfmeer —, also bleibt dort
       das Schild die einzige Moeglichkeit, ueberhaupt eine Hoehe zu nennen. */
    if (KUPPEN[k].schild === false) continue;
    if (!(kuppeHoch[k] > 0) || kuppeWo[k] < 0) continue;
    const gx = (kuppeWo[k] % rW) / rW * GW, gy = ((kuppeWo[k] / rW) | 0) / rH * GH;
    const [sx, sy] = projRand(gx, gy);
    /* Der Name **und** das Wort: „Scandinavian 2 694 m" liest sich wie ein
       Berg. Es ist aber die Oberflaeche eines Eisschildes, und genau das ist
       der Vergleich, den die Karte anbietet — daneben steht der Mont Blanc
       mit seiner Felshoehe zur selben Zeit. */
    marke(sx, sy, KUPPEN[k].name + ' ice ' + nfm.format(Math.round(kuppeHoch[k])) + ' m',
      GIPFELFARBE, false, true);
  }
  if (MB && MB.gipfel_m) {
    const [sx, sy] = projRand(MB.x, MB.y);
    // Die Gipfelhoehe aus dem feinen DEM, plus das Differenzfeld an dieser
    // Stelle — genau die Rechnung, aus der auch das Relief entsteht.
    const fx = Math.max(0, Math.min(rW - 1, Math.round(MB.x / GW * rW)));
    const fy = Math.max(0, Math.min(rH - 1, Math.round(MB.y / GH * rH)));
    const i = fy * rW + fx;
    const h = MB.gipfel_m + (maskeR[i] ? flaeche[i] - demR[i] : 0);
    marke(sx, sy, 'Mont Blanc ' + nfm.format(Math.round(h)) + ' m', GIPFELFELS, true);
  }
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

/* ---------- Die heutige Kuestenlinie ----------
   Die Nulllinie des **modernen** Hoehenmodells, ohne Differenzfeld. Sie
   aendert sich nie, haengt also nur an der Feldgroesse und wird einmal
   geschnitten und behalten.

   Sie ist der Anker, an dem man die Bewegung ablesen kann: wo die Karte bei
   22 ka Land zeigt und die Linie darunter durchlaeuft, stand spaeter Wasser.
   Deshalb liegt sie **unter** allem anderen im Ton und nicht darueber — eine
   Referenz, keine Aussage. */
let kuesteCache = null, kuesteRW = 0;
function heuteKueste() {
  if (kuesteCache && kuesteRW === rW) return kuesteCache;
  ringFeld();
  const S = LSCHRITT, je = kw / rW, nx = rnx, ny = rny;
  /* Ausserhalb des Sichtbaren gilt dasselbe wie ausserhalb des Feldes: tiefer
     als jede Platte. Das ist **noetig, nicht bloss sparsam** — ein Plattenring
     wird gefuellt, und eine Kette, die am Rand einfach aufhoert, fuellt sich
     als Keil quer ueber die Karte. Mit dem Nullrand schliesst sich der Ring
     entlang der Schnittkante, und die liegt neben der Leinwand. */
  const ecke = (px, py) => {
    if (px < sichtX0 || py < sichtY0 || px > sichtX1 || py > sichtY1) return -1e9;
    if (px < 0 || py < 0 || px >= rW || py >= rH) return -1e9;
    const i = py * rW + px;
    return maskeR[i] ? demR[i] : -1e9;
  };
  const stempel = ++rZaehler;
  let nk = 0;
  const setze = (idx, x, y) => {
    if (rStempel[idx] !== stempel) {
      rStempel[idx] = stempel; rX[idx] = x; rY[idx] = y;
      rA[idx] = -1; rB[idx] = -1; rBesucht[idx] = 0; rListe[nk++] = idx;
    }
  };
  const binde = (q, r) => { if (rA[q] < 0) rA[q] = r; else if (rB[q] < 0) rB[q] = r; };
  const t = 0;
  for (let cy = -1; cy <= ny; cy++) {
    for (let cx = -1; cx <= nx; cx++) {
      const px0 = cx * S, px1 = px0 + S, py0 = cy * S, py1 = py0 + S;
      const a = ecke(px0, py0), b = ecke(px1, py0), c = ecke(px1, py1), d = ecke(px0, py1);
      const A = a > t, B = b > t, C = c > t, E = d > t;
      const code = (A ? 1 : 0) | (B ? 2 : 0) | (C ? 4 : 0) | (E ? 8 : 0);
      if (code === 0 || code === 15) continue;
      const X0 = px0 * je, Y0 = py0 * je, SS = S * je;
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
  // Als Punktzuege im **Gittermass** ablegen, damit sie sich gekippt auf die
  // Oberflaeche heben lassen wie die DATED-Raender.
  const zuege = [];
  for (let q = 0; q < nk; q++) {
    const start = rListe[q];
    if (rBesucht[start] === stempel) continue;
    let cur = start, vor = -1, m = 0;
    const xs = [], ys = [];
    while (cur >= 0) {
      rBesucht[cur] = stempel;
      xs.push(rX[cur] / kw * GW); ys.push(rY[cur] / kh * GH);
      m++;
      const na = rA[cur], nb = rB[cur];
      const w = (na >= 0 && na !== vor && rBesucht[na] !== stempel) ? na
              : (nb >= 0 && nb !== vor && rBesucht[nb] !== stempel) ? nb : -1;
      vor = cur; cur = w;
    }
    if (m > 3) zuege.push([xs, ys]);
  }
  kuesteCache = zuege; kuesteRW = rW;
  return zuege;
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
  /* Der Knopf schaltet die **ganze** Ebene. Vorher deckte er nur die Fuellung
     zwischen maximum und minimum ab, und die orange Linie blieb stehen: wer
     „Band" ausschaltete, bekam trotzdem eine DATED-1-Linie ueber seiner Karte.
     Ein Schalter, der nur die Haelfte dessen abschaltet, was man sieht, ist
     keiner. */
  if (!BAND) return;
  const t = datedBei(ka);
  if (!t) return;
  const s = DATED[t.ka];
  if (!s) return;
  ctx.save();
  ctx.clip(schraeg() ? silhouetteHoch() : silhouette());
  if (s.max && s.min) {
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
  sichtFeldRechnen();
  paleo();
  lichtRechnen();
  // Das Farbbild ist die **flache** Karte. Gekippt malt jede Platte ihre
  // Bandfarbe selbst und das Bild wird nie hochgelegt — es zu rechnen kostete
  // 35 ms je Bild fuer nichts.
  if (!schraeg()) farbeRechnen();
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
  /* Die Beschriftungen in der Rangfolge ihres Anspruchs, nicht in der der
     Ebenen: erst das Band ganz unten, dann die Gipfelschilder, die sich den
     Platz zuerst nehmen, dann die Staedte, die ausweichen. Dass die Staedte
     damit zuoberst liegen, ist ohne Folge — sie ueberschneiden ja nichts
     mehr. */
  belegt.length = 0;
  datedUeber();
  gipfelUeber();
  heuteUeber();
  schreibe();
  sichtMarken();
}

/* Die Hoehe des Schildes wurde einmal gemessen und als --kopf an das CSS
   gegeben: die Notiz lag hinter der Karte und musste unter dem Schild
   anfangen. Seit sie unter der Karte steht, gibt es nichts mehr zu messen —
   der Fluss macht das von selbst. */

/* Die Stapelhoehe aus der Metrik. Sie haengt an der Kartenbreite, nicht an der
   Feldhoehe: beim Zoomen soll das Relief mitwachsen, beim Strecken des Fensters
   nicht steiler werden. */
function hoeheSetzen() {
  const pxH = kw / GW;                          // Bildpunkte je Gitterzelle
  const g90 = Math.max(1, D.g90 || 173);        // Meter je Zelle, gemessen
  const hoch = LAMBDA * pxH * (S_BIS - S_VON) / (Math.tan(KIPPMAX) * g90);
  HOCH3D = hoch / Math.max(1, hoehe);
  SICHT = null;
}

function masse() {
  const feld = cv.parentElement;
  // Das Seitenverhaeltnis der Karte an das CSS geben — es setzt damit die
  // Feldhoehe, statt dass das Feld den Schirm fuellt und die Karte darin
  // schwimmt.
  const buehne = feld.closest('.buehne') || document.documentElement;
  buehne.style.setProperty('--kartenmass', (GW / GH).toFixed(4));
  /* Die Leinwand ist **genau die Karte**, in beiden Richtungen. Das CSS-Feld
     kann sie nicht liefern: ein Flex-Kind mit aspect-ratio schrumpft in der
     Hoehe, ohne in der Breite nachzugeben (die Leinwand stand 862 Punkte breit
     da und die Karte darin 543), und in der Spalte daneben ist das Feld so
     hoch wie das Fenster und die Karte nicht. Was daneben oder darueber
     liegt, ist Seitengrund und wird nicht gerechnet. */
  const fw = Math.max(120, feld.clientWidth), fh = Math.max(120, feld.clientHeight);
  const mass = GW / GH;
  /* Die Hoehe nimmt die Leinwand ganz, die Breite nur so viel, wie die Karte
     braucht. Hochkant ist das Feld hoeher als die Karte breit — und die
     Schraegsicht stellt den Stapel nach oben auf, braucht die Hoehe also. In
     der Breite waere alles darueber schwarzer Rand, der jedes Bild mitgerechnet
     wuerde: quer stand die Leinwand einmal 862 Punkte breit und die Karte darin
     543. */
  hoehe = fh;
  breite = Math.min(fw, Math.round(fh * mass));
  cv.style.width = breite + 'px';
  cv.style.height = hoehe + 'px';
  // Gerueckt wird mit left/top, **nicht** mit einem transform: eine verschobene
  // Leinwand kostete im Pruefbrowser 25 ms je Bild gekippt, weil sie damit
  // eine eigene Ebene bekommt und in jedem Bild neu zusammengesetzt wird.
  cv.style.left = Math.round((fw - breite) / 2) + 'px';
  cv.style.top = Math.round((fh - hoehe) / 2) + 'px';
  feld.style.setProperty('--kb', breite + 'px');
  feld.style.setProperty('--kh', hoehe + 'px');
  /* Der Deckel von 2,5 ist fuer die Seite: darueber zahlt ein Telefon
     Bildpunkte, die sein Schirm nicht hat. Der Film dreht ihn hoch und
     rechnet absichtlich groesser als das Ziel, um beim Verkleinern
     Kantenglaettung geschenkt zu bekommen — deshalb let, nicht const. */
  const dpr = GROB ? 1 : Math.min(DPRMAX, devicePixelRatio || 1);
  DPR = dpr;
  const bw = Math.round(breite * dpr), bh = Math.round(hoehe * dpr);
  if (cv.width !== bw || cv.height !== bh) { cv.width = bw; cv.height = bh; }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  feldAnlegen();
  hoeheSetzen();     // braucht kw/kh aus feldAnlegen()
  ansichtKlemmen();
}

/* ================================================================ Das Schild */
const nf = new Intl.NumberFormat('en-GB');

/* Die Zeit stand als „21,8 ka" da. Das ist die Einheit der Quelle — ICE-6G_C
   zaehlt Jahrtausende vor **1950**, dem Nullpunkt der Radiokohlenstoffdatierung
   —, und ausserhalb des Fachs versteht sie niemand. Gezeigt wird deshalb die
   Jahreszahl: 21,8 ka sind 21 800 Jahre vor 1950, also 19 850 v. Chr.

   Gerundet wird auf hundert Jahre. Feiner waere gelogen: die Scheiben stehen
   fuenfhundert Jahre auseinander, und dazwischen wird interpoliert. Groeber
   waere traege — die Zahl soll sich beim Lauf bewegen.

   Unter 1950 Jahren vor heute kippt es in die Zeitrechnung: 1,5 ka sind 450
   n. Chr. Und ganz am Ende steht „today", nicht „2026 n. Chr." — die letzte
   Scheibe ist die Gegenwart, nicht ein Jahr darin. */
function jahrWort(kaWert, alsScheibe) {
  const vor1950 = kaWert * 1000;
  // Vierstellige Jahre ohne Trennzeichen: „AD 1500", nicht „AD 1,500".
  const z = v => v < 10000 ? String(v) : nf.format(v);
  if (kaWert <= 0.049) {
    // Die letzte Scheibe **ist** 1950 — das ist der Nullpunkt, auf den sich
    // „vor heute" bezieht. Als Jahreszahl im Schild waere das aber eine
    // falsche Genauigkeit: gemeint ist die Gegenwart.
    return alsScheibe ? 'AD 1950' : 'today';
  }
  const v = Math.round((vor1950 - 1950) / 100) * 100;
  if (v > 0) return z(v) + ' BC';
  const n = Math.round((1950 - vor1950) / 100) * 100;
  return n <= 0 ? 'AD 1950' : 'AD ' + z(n);
}
function schreibe() {
  const j = document.getElementById('jahrZahl');
  const n = document.getElementById('jahrNeben');
  j.textContent = jahrWort(ka);
  // Steht die Uhr auf einer Zeitscheibe, wird sie genannt; dazwischen sagt das
  // Schild, dass interpoliert wird und zwischen welchen beiden. Kein Glaetten
  // ueber die Datenlage hinweg — dieselbe Regel wie in der Vorlage.
  const a = abschnitt, b = Math.min(NT - 1, a + 1);
  const auf = uAbschnitt < 1e-6 ? a : uAbschnitt > 1 - 1e-6 ? b : -1;
  const e = D.je[auf >= 0 ? auf : a];
  const vol = D.je[auf >= 0 ? auf : a].vol;
  const teil = auf >= 0
    ? 'ICE-6G_C time slice ' + jahrWort(D.t[auf], true)
    : 'between the ' + jahrWort(D.t[a], true) + ' and ' + jahrWort(D.t[b], true)
      + ' slices &#8212; interpolated';
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
  return kurveWert(D.msp, a, b, uAbschnitt);
}

/* ---------------------------------------- Die globale Mitteltemperatur
   Zweite Zeile, eigene Leinwand, **eigene Skala**. Beide Kurven in ein Bild
   zu legen waere der naheliegende Platzspargriff und der klassische Fehler:
   zwei Achsen in einem Rahmen behaupten eine Deckung, die man nicht gezeigt
   hat. Hier laufen die beiden ohnehin fast parallel — und genau deshalb darf
   man sie nicht uebereinanderlegen, sonst liest man die Parallele als Beweis
   statt als Beobachtung.

   Die Reihe beginnt bei 23 ka: weiter zurueck reicht die Quelle nicht. Vor
   dem ersten Wert steht kein Strich und keine Zahl, so wie das
   Unsicherheitsband vor 25 ka fehlt. */
const TEMPFARBE = '#c08a5a';
const tempCv = document.getElementById('tempBahn'), tempCtx = tempCv.getContext('2d');
const TEMP = D.temp || [];
const tempDa = TEMP.some(v => v !== null && v !== undefined);

function tempMalen() {
  if (!tempDa) return;
  const b = tempCv.parentElement.clientWidth, h = 26;
  const dpr = Math.min(2.5, devicePixelRatio || 1);
  tempCv.width = Math.round(b * dpr); tempCv.height = Math.round(h * dpr);
  tempCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  tempCtx.clearRect(0, 0, b, h);
  const werte = TEMP.filter(v => v !== null && v !== undefined);
  const lo = Math.min(...werte), hi = Math.max(...werte, 0);
  const y = v => h - 2 - (v - lo) / Math.max(0.1, hi - lo) * (h - 6);
  // Wie beim Meeresspiegel laeuft die Kurve ueber die **Spielzeit**, nicht
  // ueber die Jahre — sonst stuende der Zeiger nicht dort, wo die Zeitleiste
  // steht.
  tempCtx.beginPath();
  let erst = true;
  for (let i = 0; i < NT; i++) {
    const v = TEMP[i];
    if (v === null || v === undefined) { erst = true; continue; }
    const x = TAKTKUM[i] * b;
    if (erst) { tempCtx.moveTo(x, y(v)); erst = false; } else tempCtx.lineTo(x, y(v));
  }
  tempCtx.strokeStyle = TEMPFARBE; tempCtx.lineWidth = 1.4; tempCtx.stroke();
  // Die Nulllinie: heutiger Stand.
  tempCtx.beginPath();
  tempCtx.moveTo(0, y(0)); tempCtx.lineTo(b, y(0));
  tempCtx.strokeStyle = 'rgba(255,255,255,.18)'; tempCtx.lineWidth = 1; tempCtx.stroke();
  const x = spiel * b;
  tempCtx.beginPath(); tempCtx.moveTo(x, 0); tempCtx.lineTo(x, h);
  tempCtx.strokeStyle = 'rgba(255,255,255,.55)'; tempCtx.lineWidth = 1; tempCtx.stroke();
}

function tempJetzt() {
  const a = abschnitt, b = Math.min(NT - 1, a + 1);
  const va = TEMP[a], vb = TEMP[b];
  const daA = va !== null && va !== undefined;
  const daB = vb !== null && vb !== undefined;
  if (daA && daB) return kurveWert(TEMP, a, b, uAbschnitt);
  /* An der Kante der Reihe: **auf** dem belegten Knoten gilt sein Wert, sonst
     steht nichts da. Zwischen einer leeren und einer belegten Scheibe zu
     interpolieren hiesse, einen Wert aus Daten zu rechnen, die es nicht
     gibt — und ohne diesen Fall bliebe ausgerechnet die erste belegte
     Scheibe leer, weil ihr Segment von der leeren davor kommt. */
  if (daB && uAbschnitt > 1 - 1e-6) return vb;
  if (daA && uAbschnitt < 1e-6) return va;
  return null;
}

function tickerSchreiben() {
  const v = mspJetzt();
  document.getElementById('mspWert').textContent =
    (v >= -0.5 ? '0' : Math.round(v)) + ' m';
  tickerMalen();
  if (tempDa) {
    const t = tempJetzt();
    document.getElementById('tempWert').textContent =
      t === null ? '' : (t > -0.05 && t < 0.05 ? '0.0' : t.toFixed(1)) + ' \u00b0C';
    tempMalen();
  }
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
  legendeText();
}
/* Steht getrennt, weil der Band-Knopf sie mitfuehren muss: ein Legendensatz,
   der eine orange Linie erklaert, die gerade nicht da ist, ist schlimmer als
   keiner. */
function legendeText() {
  document.getElementById('legText').innerHTML =
    'Rock elevation and ice-surface elevation, metres. Every contour is a colour boundary.'
    + (tempDa
      ? ' Below: sea level, and global mean temperature against today &#8212; global, so Europe cooled a good deal more.'
      : '')
    + (BAND
      ? ' The orange line is the DATED-1 most-credible ice margin, the band around it its maximum and minimum.'
      : ' Press Band for the DATED-1 dated ice margins.');
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
  const vorher = zeiger.get(e.pointerId);
  if (!vorher) return;
  /* Der Weg seit dem letzten Ereignis wird **selbst gerechnet**, nicht aus
     movementX genommen. Das ist der Unterschied zwischen Maus und Finger:
     movementX/Y fuellt der Browser nur fuer Zeigegeraete zuverlaessig, bei
     Beruehrungen steht dort null. Mit der Maus liess sich die Karte also
     schieben, mit dem Finger nicht — und aufgefallen ist es keinem, der am
     Schreibtisch sass. */
  const dx = e.offsetX - vorher[0], dy = e.offsetY - vorher[1];
  zeiger.set(e.pointerId, [e.offsetX, e.offsetY]);
  const p = [...zeiger.values()];
  if (p.length === 1) {
    if (tippStart && Math.hypot(e.offsetX - tippStart[0], e.offsetY - tippStart[1]) > 8) {
      grobAn();
      vX += dx; vY += dy;
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
/* Sekunden fuer 26 000 Jahre. Waren 90; 30 Prozent schneller sind 69. Die
   Verteilung der Zeit auf die Abschnitte bleibt davon unberuehrt — sie ist
   ein Anteil, kein Betrag. */
const LAUF = 69;
let zuletzt = 0;
function schlag(t) {
  if (laeuft) {
    if (zuletzt) {
      /* Der Deckel ist ein **Schutz gegen Pausen**, keine Geschwindigkeit: ein
         Blatt im Hintergrund bekommt keine Bilder, und ohne ihn spraenge der
         Film beim Zurueckkommen um die ganze Pause vor. Er stand auf 0,1 s —
         und war damit zugleich eine heimliche Bremse: dauert ein Bild laenger
         als ein Zehntel, zaehlt die Uhr trotzdem nur ein Zehntel weiter. Flach
         und klein fiel das kaum auf; seit die Karte viermal so gross steht und
         gekippt der Standard ist, brauchte der Film 795 statt 69 Sekunden.

         Jetzt eine Sekunde: jedes echte Bild geht ungedeckelt durch, und eine
         Pause springt hoechstens um anderthalb Prozent des Films. Die Uhr
         laeuft damit in echter Zeit — bei langsamen Bildern in groesseren
         Schritten, aber nicht langsamer. */
      dtSek = Math.min(1, (t - zuletzt) / 1000);
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
document.getElementById('heute').addEventListener('click', e => {
  HEUTE = !HEUTE;
  e.currentTarget.setAttribute('aria-pressed', HEUTE ? 'true' : 'false');
  zeichne();
});
document.getElementById('band').addEventListener('click', e => {
  BAND = !BAND;
  e.currentTarget.setAttribute('aria-pressed', BAND ? 'true' : 'false');
  legendeText();
  zeichne();
});
document.getElementById('zurueck').addEventListener('click', () => {
  ZOOM = 1; vX = 0; vY = 0; NEIGUNG = KIPPSTART; DREHUNG = 0;
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
.wrap{max-width:900px;margin:0 auto;min-height:100vh;min-height:100svh;padding:6px;display:flex}
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
  rebounding underneath it, the three domes of the Eurasian ice sheet on top,
  and the published uncertainty of their margin drawn as a band.</p>

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
    <div><b>Temperature</b><p>global mean surface temperature against today,
      from a proxy data assimilation. <b>Global</b> is the word that matters:
      Europe beside the ice cooled far more than the global figure. The series
      starts at 23,000 years ago, where its source begins.</p></div>
    <div><b>The band</b><p>maximum against minimum, from the dated margins.
      Where it widens, the reconstruction is weak. Off by default, because it
      is a different kind of statement from everything else in the picture —
      press <b>Band</b> for it.</p></div>
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
