// Erzeugt die fertige, in sich geschlossene index.html.
// Aufruf: node build.mjs > ../index.html

import { ladeKreise } from './laden.mjs';
import { baueKnotenmodell, vereinfache, beschraenke } from './topologie.mjs';
import { leseLang, baueBilder } from './daten.mjs';
import { rechneZeitreihe } from './zeitreihe.mjs';
import { baueNutzlast } from './nutzlast.mjs';
import { ENTPACKER } from './code.mjs';
import { kreisStammdaten } from './stammdaten.mjs';
import { ringVorzeichen, gefalteteRinge } from './geometrie.mjs';

const log = s => process.stderr.write(s + '\n');
const KNOTEN = Number(process.env.KNOTEN ?? 9000);
const GITTER = Number(process.env.GITTER ?? 1600);
// Wohin die gerechnete Zeitreihe zwischengelegt wird. Mit einem eigenen Namen
// lässt sich ein schneller Probebau fahren, ohne den guten Stand zu überschreiben.
const CACHE = process.env.CACHE ? '-' + process.env.CACHE : '';

log('Daten …');
const zeilen = leseLang();
const bilder = baueBilder(zeilen);
log(`  ${zeilen.length} Zeilen, ${bilder.length} Zeitpunkte: ${bilder.map(b => b.jahr).join(', ')}`);

log('Geometrie …');
const roh = ladeKreise();
const alles = baueKnotenmodell(roh.kreise);
const mitZahlen = new Set(zeilen.map(z => z.ags));
const modell = beschraenke(alles.gebiete, alles.attr, alles.X, alles.Y, mitZahlen);
const fehlend = [...mitZahlen].filter(a => !alles.attr.some(x => x.ags === a));
if (fehlend.length) log(`  ohne Geometrie: ${fehlend.join(', ')}`);
const geo = vereinfache(modell.gebiete, modell.X, modell.Y, KNOTEN);
log(`  ${alles.gebiete.length} Kreise gelesen, ${modell.gebiete.length} mit Zahlen, `
  + `${geo.X.length} Knoten, Quelle: ${roh.quelle}`);

// Kreise, die nur in wenigen Bildern Zahlen haben. Im Pilotgebiet ist das
// Berlin: die Stadt steht erst ab 1995 in den Daten, hat dort aber mehr
// Einwohner als ganz Brandenburg — und weil sie mitten in Brandenburg liegt
// und winzig ist, presst sie im Kartogramm alles andere zu einem Ring
// zusammen. Deshalb entstehen zwei Reihen über derselben Geometrie: eine
// ohne diese Kreise, eine mit. Umschalten macht sichtbar, was die Stadt
// wiegt, statt es elf Bildern lang zu verstecken.
const kommtSpaet = modell.attr
  .map(a => a.ags)
  .filter(ags => bilder.filter(b => b.werte.has(ags)).length < bilder.length / 2);
const ohne = m => new Map([...m].filter(([ags]) => !kommtSpaet.includes(ags)));
const bilderOhne = bilder.map(b => ({ ...b, werte: ohne(b.werte),
  summe: [...ohne(b.werte).values()].reduce((x, y) => x + y, 0) }));
const spaeteNamen = kommtSpaet.map(ags => modell.attr.find(a => a.ags === ags).name);
const groesste = Math.max(...bilder.map(b => b.summe));

log('Zeitreihe …');
const reihen = [];
if (kommtSpaet.length) {
  log(`  ohne ${spaeteNamen.join(', ')}`);
  reihen.push({ id: 'kern', name: 'without ' + spaeteNamen.join(' and '), bilder: bilderOhne,
    zeitreihe: rechneZeitreihe({ gebiete: geo.gebiete, X: geo.X, Y: geo.Y, attr: modell.attr,
      bilder: bilderOhne, groesste, gitter: GITTER, cache: 'zeitreihe-kern' + CACHE + '.json', log }) });
}
log('  mit allen Kreisen');
reihen.push({ id: 'alle', name: kommtSpaet.length ? 'with ' + spaeteNamen.join(' and ') : 'all counties',
  bilder, zeitreihe: rechneZeitreihe({ gebiete: geo.gebiete, X: geo.X, Y: geo.Y, attr: modell.attr,
    bilder, groesste, gitter: GITTER, cache: 'zeitreihe-alle' + CACHE + '.json', log }) });

// Die Zwischenformen. Die Seite kann von der Landkarte zum Kartogramm
// überblenden, indem sie jeden Knoten zwischen seinen beiden Orten setzt. Das
// ist billig — die Landkarte steht schon in der Nutzlast —, aber eine lineare
// Mischung zweier knickfreier Formen muss selbst nicht knickfrei sein. Also
// nachgezählt: kein Ring darf sich dabei umstülpen.
{
  const vorz = ringVorzeichen(geo.gebiete, geo.X, geo.Y);
  for (const a of [0.25, 0.5, 0.75]) {
    let kaputt = 0, gesamt = 0;
    for (const z of reihen[reihen.length - 1].zeitreihe.zustaende) {
      const BX = new Float64Array(z.X.length), BY = new Float64Array(z.Y.length);
      for (let i = 0; i < z.X.length; i++) {
        BX[i] = geo.X[i] + a * (z.X[i] - geo.X[i]);
        BY[i] = geo.Y[i] + a * (z.Y[i] - geo.Y[i]);
      }
      const f = gefalteteRinge(geo.gebiete, BX, BY, vorz);
      kaputt += f.kaputt; gesamt += f.gesamt;
    }
    log(`  Zwischenform ${a}: ${kaputt} gefaltete Ringe von ${gesamt}`);
  }
}

log('Nutzlast …');
const stamm = kreisStammdaten();
const { nutz, jeKreis } = baueNutzlast({
  gebiete: geo.gebiete, attr: modell.attr, X: geo.X, Y: geo.Y,
  reihen, bilder, kreisInfo: stamm, log,
});

// Kennzahlen für den Text unter der Karte
const medianGuete = nutz.guete.median, maxGuete = nutz.guete.max;
const gefaltet = reihen.flatMap(r => r.zeitreihe.zustaende).reduce((a, z) => a + z.bilanz.gefaltet, 0);
const erstes = bilder[0], letztes = bilder[bilder.length - 1];
// Welche Länder die Daten abdecken — daraus entstehen Titel und Vorspann,
// damit die Seite mitwächst, sobald weitere Länder dazukommen.
// Titel und Vorspann richten sich nach der Reihe, die zuerst zu sehen ist.
const startReihe = reihen[0];
const kreiseStart = modell.attr.filter(a => startReihe.bilder.some(b => b.werte.has(a.ags)));
const abgedeckt = [...new Set(kreiseStart.map(a => a.land))].sort();
const anzahlKreise = kreiseStart.length;
const anzahlAlle = new Set(zeilen.map(z => z.ags)).size;
const laender = {
  '01': 'Schleswig-Holstein', '02': 'Hamburg', '03': 'Lower Saxony', '04': 'Bremen',
  '05': 'North Rhine-Westphalia', '06': 'Hesse', '07': 'Rhineland-Palatinate',
  '08': 'Baden-Württemberg', '09': 'Bavaria', '10': 'Saarland', '11': 'Berlin',
  '12': 'Brandenburg', '13': 'Mecklenburg-Vorpommern', '14': 'Saxony',
  '15': 'Saxony-Anhalt', '16': 'Thuringia',
};

const daten = {
  vb: [nutz.breite, nutz.hoehe], ank: nutz.ank,
  gx: nutz.gx, gy: nutz.gy,
  ringzahl: nutz.ringzahl, ringe: nutz.ringe, idx: nutz.idx,
  R: nutz.reihen, B: nutz.bilder, takt: null,
  bev: nutz.bev, mj: nutz.methodenJeWert, ai: nutz.anteilJeWert,
  k: jeKreis.map(k => [k.ags, k.name, k.bez, k.land, k.flaeche]),
  L: laender,
};

// ---------------------------------------------------------------------------
// Was jeweils geschah. Die Karte zeigt, dass sich etwas ändert, und wo — warum,
// steht in keiner Zahl. Diese Notizen laufen als Untertitel mit.
//
// `von` und `bis` sind Anzeigefenster auf der Zeitachse, nicht die Jahreszahlen
// des Ereignisses; die stehen in der Überschrift. Die Fenster stossen
// aneinander, damit immer eine Notiz zu sehen ist, und sind dort etwas gedehnt,
// wo die Karte schnell durchläuft. `kurz` steht unter der Karte und muss in drei
// Zeilen passen, `mehr` kommt nur in der Liste weiter unten dazu.
//
// Was sich aus der Tabelle dieser Seite selbst belegen lässt, ist von dort
// genommen; der Rest ist Schulwissen und als solches gekennzeichnet.
// Wie viele Überschriften der Faden in der Karte hält und wie blass sie mit
// jeder Zeile werden. Sechs sind so viele, wie oben links Platz haben, ohne
// über die Karte zu wachsen.
const FADEN_TIEFE = 6;
const FADEN_DECK = [1, 0.52, 0.38, 0.27, 0.19, 0.13];
const NOTIZEN = [
  { von: 1871, bis: 1899, kopf: '1871–1900 · Coal and steel',
    kurz: 'The Ruhr fills, the farming east empties.',
    mehr: 'Gelsenkirchen grows from 23,794 people in 1871 to 219,501 by 1910, on today’s boundaries.' },
  { von: 1899, bis: 1913, kopf: '1900–1910 · The metropolis',
    kurz: 'Berlin passes three and a half million.',
    mehr: '931,984 in 1871, 3,734,258 by 1910. Almost all of the country’s growth is now urban.' },
  { von: 1913, bis: 1927, kopf: '1914–1918 · The First World War',
    kurz: 'Two million soldiers dead, no census until 1939.',
    mehr: 'The map glides over the war years because nothing was counted in them. The loss is real; the dip is not drawn.' },
  { von: 1927, bis: 1937, kopf: '1933–1939 · Rearmament',
    kurz: 'Whole towns rise for the arms industry.',
    mehr: 'Wolfsburg for the Volkswagen works, Salzgitter for ore and steel — open country until then, 94,026 and 111,510 people by 1961.' },
  { von: 1937, bis: 1945, kopf: '1939–1945 · The Second World War',
    kurz: 'Bombing empties the cities; Berlin loses 1.2 million.',
    mehr: 'Hamburg is down 308,577. The count of October 1946 is taken in a country whose cities are rubble.' },
  { von: 1945, bis: 1952, kopf: '1945–1950 · Flight and expulsion',
    kurz: 'Twelve million Germans expelled from the east.',
    mehr: 'The rural north takes the worst of it: Ostholstein doubles from 103,951 to 213,916 people, with nowhere to house them.' },
  { von: 1952, bis: 1962, kopf: '1950–1961 · Wirtschaftswunder',
    kurz: 'The west rebuilds, 2.7 million leave the GDR.',
    mehr: 'Essen holds 750,501 people in 1961 and never as many again. The Wall goes up in August of that year.' },
  { von: 1962, bis: 1973, kopf: '1961–1973 · Guest workers',
    kurz: 'The factories recruit in Italy, Turkey, Yugoslavia.',
    mehr: 'From 1972 onward more people die in West Germany than are born there — every year since, growth has depended on who arrives.' },
  { von: 1973, bis: 1988, kopf: '1973–1987 · The pits close',
    kurz: 'Coal and steel close; the Ruhr turns red.',
    mehr: 'It has stayed red ever since. The growth moves south and out to the districts around the cities.' },
  { von: 1988, bis: 1996, kopf: '1989–1996 · Reunification',
    kurz: 'The east goes west; its birth rate halves.',
    mehr: 'One of the sharpest peacetime falls ever recorded. Berlin is the exception and grows again.' },
  { von: 1996, bis: 2011, kopf: '1996–2011 · Shrinking, and recounting',
    kurz: 'The 2011 census finds 1.5 million fewer.',
    mehr: 'The registers carried 81.8 million, the census counted 80.2. That correction sits on this stretch, on top of the real losses in the east.' },
  { von: 2011, bis: 2019, kopf: '2011–2019 · The cities fill again',
    kurz: 'Free movement and 2015 outweigh the deaths.',
    mehr: 'Leipzig, down a third between 1939 and 2011, climbs back above 600,000 people.' },
  { von: 2019, bis: 2025, kopf: '2020–2024 · Covid, then Ukraine',
    kurz: 'A million arrive from Ukraine in 2022.',
    mehr: 'Germany reaches 83.6 million, and nearly all of the gain sits in the cities and the districts around them.' },
];

// Die grössten Städte tragen ihren Namen auf der Karte. Genommen werden die
// kreisfreien Städte und Stadtkreise, die in irgendeinem Bild über 400 000
// Menschen haben, dazu die Region Hannover: die Stadt ist 2001 darin
// aufgegangen, und ohne sie fehlte auf der Karte eine der zehn grössten.
// Der Name wird gekürzt, wo er einen Zusatz trägt — auf einem Fleck von
// zwanzig Pixeln ist „Frankfurt am Main, Stadt" nicht zu lesen.
const kurzerName = n => n === 'Region Hannover' ? 'Hannover'
  : n.split(',')[0].split(/ am | an der | im | \(/)[0].trim();
const hoechsteBev = new Map();
for (const b of bilder) for (const [ags, v] of b.werte) hoechsteBev.set(ags, Math.max(hoechsteBev.get(ags) ?? 0, v));
const STADTKREISE = new Set(['Kreisfreie Stadt', 'Stadtkreis']);
// Alle Namen sollen von Anfang an dastehen, auch 1871, wo die Flecken winzig
// sind. Dann dürfen sie nicht dicht beieinanderliegen: aus jedem Bündel eng
// benachbarter Städte bleibt die grösste. Gemessen wird auf dem Boden, nicht im
// Kartogramm — im Kartogramm wandern sie ohnehin auseinander, während sie
// wachsen. Sechzig Kilometer Abstand lassen aus Rhein und Ruhr einen Namen
// übrig statt sieben.
const ABSTAND_KM = 60;
const mitte = new Map();
geo.gebiete.forEach((ringe, g) => {
  let sx = 0, sy = 0, n = 0;
  for (const r of ringe) for (const id of r) { sx += geo.X[id]; sy += geo.Y[id]; n++; }
  if (n) mitte.set(modell.attr[g].ags, [sx / n, sy / n]);
});
const staedte = [];
for (const k of jeKreis
  .map((k, i) => ({ i, ags: k.ags, kurz: kurzerName(k.name), bev: hoechsteBev.get(k.ags) ?? 0,
    stadt: STADTKREISE.has(k.bez) || k.ags === '03241' }))
  .filter(k => k.stadt && k.bev >= 400000)
  .sort((a, b) => b.bev - a.bev)) {
  const m = mitte.get(k.ags);
  if (!m) continue;
  const nah = staedte.some(s => Math.hypot(s.m[0] - m[0], s.m[1] - m[1]) < ABSTAND_KM * 1000);
  if (nah) continue;
  staedte.push({ ...k, m });
}
log(`Beschriftet: ${staedte.length} Städte — ${staedte.map(k => k.kurz).join(', ')}`);

// Wie lange dauert welcher Abschnitt? Nicht nach Jahren allein — dann rauscht
// die Umwälzung zwischen 1939 und 1946 in drei Sekunden vorbei, während die
// ruhigen Jahrzehnte vor 1900 elf bekommen. Und nicht nach Umschichtung allein,
// denn dann wäre die Zeitachse keine mehr. Genommen wird das geometrische
// Mittel aus beidem: dem Anteil an den Jahren und dem Anteil an der Summe aller
// Veränderungen je Kreis. Die Kriegs- und Nachkriegsjahre bekommen damit rund
// fünf statt drei Sekunden, ohne dass die langen ruhigen Strecken einbrechen.
const abschnitte = bilder.slice(0, -1).map((b, i) => {
  const a = bilder[i], c = bilder[i + 1];
  let um = 0;
  for (const [ags, v] of a.werte) { const w = c.werte.get(ags); if (w > 0) um += Math.abs(w - v); }
  return { jahre: Math.max(0.1, nutz.bilder[i + 1].t - nutz.bilder[i].t), um: Math.max(1, um) };
});
// Dazu eine Untergrenze: unter viereinhalb Sekunden ist ein Abschnitt vorbei,
// ehe die Notiz gelesen ist. Die kurzen Abschnitte am Ende — 2011 bis 2019,
// 2019 bis 2024 — bekämen nach Jahren und Umschichtung sonst zwei Sekunden und
// weniger. Wer über der Grenze liegt, gibt dafür anteilig ab; das wird ein paar
// Mal wiederholt, bis es steht.
const SPIELZEIT = 70;             // Sekunden für die ganze Achse
const MINDEST = 4.5 / SPIELZEIT;  // kleinster Anteil je Abschnitt
{
  const sj = abschnitte.reduce((x, a) => x + a.jahre, 0), su = abschnitte.reduce((x, a) => x + a.um, 0);
  const roh = abschnitte.map(a => Math.sqrt((a.jahre / sj) * (a.um / su)));
  let anteil = roh.map(v => v / roh.reduce((x, y) => x + y, 0));
  for (let runde = 0; runde < 20; runde++) {
    const klein = anteil.map(v => v < MINDEST);
    if (!klein.some(Boolean)) break;
    const fest = klein.reduce((x, k, i) => x + (k ? MINDEST : 0), 0);
    const rest = anteil.reduce((x, v, i) => x + (klein[i] ? 0 : v), 0);
    anteil = anteil.map((v, i) => klein[i] ? MINDEST : v * (1 - fest) / rest);
  }
  abschnitte.forEach((a, i) => { a.anteil = Number(anteil[i].toFixed(5)); });
}
log('Takt: ' + abschnitte.map((a, i) => `${bilder[i].jahr}→${bilder[i + 1].jahr} ${(a.anteil * SPIELZEIT).toFixed(1)}s`).join(', '));

const mio = n => (n / 1e6).toFixed(1);
const zahl = n => n.toLocaleString('en-GB');
const undListe = a => a.length < 2 ? (a[0] ?? '') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
const gebietsname = undListe(abgedeckt.map(l => laender[l]));
const ganzesLand = abgedeckt.length >= 16;
const titel = ganzesLand ? 'Germany, drawn by its people'
  : gebietsname + ', drawn by ' + (abgedeckt.length > 1 ? 'their' : 'its') + ' people';
const jahrVon = erstes.jahr.match(/\d{4}/)[0], jahrBis = letztes.jahr.match(/\d{4}/)[0];

daten.takt = abschnitte.map(a => a.anteil);
// Beschriftung der Umschalter, jetzt wo die Ländernamen bekannt sind.
if (nutz.reihen.length > 1) {
  nutz.reihen[0].name = gebietsname + ' only';
  nutz.reihen[1].name = 'with ' + spaeteNamen.join(' and ');
}

process.stdout.write(`<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${titel}</title>
<meta name="description" content="Every one of today's ${anzahlKreise} counties in ${gebietsname} sized by the people living in it, from ${jahrVon} to ${jahrBis}. The map grows as the population does.">
<style>
/* Eine Seite, ein Bild. Schwarz aussen, die Karte füllt den Schirm; alles, was
   nicht zur Karte gehört, ist weg. Nur ein Farbklima, kein Umschalten zwischen
   hell und dunkel: die Geländefarben sind auf diesen Grund gesetzt. */
:root{
  --plane:#000; --surface:#0c0c0c; --ink:#fff; --ink2:#bfbeb6; --muted:#7f7d77;
  --line:#232321; --axis:#33332f; --ring:rgba(255,255,255,.09);
  --leer:#1a1a18;
}
*{box-sizing:border-box}
html,body{margin:0;height:100%}
body{background:var(--plane);color:var(--ink);
  font-family:system-ui,-apple-system,"Segoe UI",sans-serif;font-size:15px;line-height:1.5;
  -webkit-text-size-adjust:100%;overflow:hidden}
.wrap{max-width:860px;margin:0 auto;height:100dvh;padding:6px;display:flex}
.buehne{position:relative;flex:1;min-height:0;display:flex;flex-direction:column;
  background:var(--surface);border:1px solid var(--ring);border-radius:14px;padding:10px 12px 8px}

/* Kopfzeile: Jahr und Einwohnerzahl. */
/* ---------- Drei Ebenen ----------
   Der Text stand einmal über der Karte im Fluss und schob sie nach unten: eine
   lange Notiz kostete der Karte vier Zeilen Höhe, eine kurze gab sie zurück,
   und die Karte sprang. Jetzt liegt der Text **über der Bühne**, nicht in ihr,
   und nimmt keinen Platz mehr weg — die Karte bekommt in jedem Fall die ganze
   Fläche.

   Damit stellt sich die Frage, was oben liegt. Die Leinwand ist draussen
   durchsichtig, also:

     Ebene 2  Jahr und Einwohnerzahl — über der Karte, mit Schein dahinter;
              das ist die eine Zeile, die immer lesbar sein muss.
     Ebene 1  die Karte.
     Ebene 0  die Notiz und der Faden — **hinter** der Karte. Wo Platz ist,
              stehen sie da; wo die Karte hinreicht, verschwinden sie dahinter.

   Der Text weicht der Karte also aus, statt sie zu verdrängen. */
.schild{position:absolute;left:12px;right:12px;top:10px;z-index:2;pointer-events:none;
  display:flex;align-items:baseline;gap:10px;
  text-shadow:0 0 6px var(--surface),0 0 6px var(--surface),0 0 14px var(--surface)}
.schild>b{font-size:30px;font-weight:650;letter-spacing:-.02em;line-height:1}
.schild>span{color:var(--ink2);font-size:13px}

.text{position:absolute;left:12px;right:12px;top:48px;z-index:0;pointer-events:none}

/* Die laufende Notiz, ausgeschrieben: Überschrift und Sätze. */
.jetzt{margin:0;max-width:min(94%,540px);
  font-size:13.5px;line-height:1.45;color:var(--ink2);opacity:0;transition:opacity .4s}
.jetzt b{display:block;color:var(--ink);font-weight:650;font-size:14.5px;margin-bottom:1px}

/* Darunter die vorigen Überschriften, mit jeder Zeile blasser. */
.faden{width:min(52%,210px);padding-top:5px;
  display:flex;flex-direction:column;gap:3px;will-change:transform}
.faden b{font-size:10.5px;line-height:1.25;font-weight:600;color:var(--ink);
  transition:opacity .5s}
@media(max-width:540px){.faden b{font-size:9.5px}}

/* Die Karte füllt die Bühne. */
.feld{position:relative;z-index:1;flex:1 1 auto;min-height:0}
canvas{position:absolute;left:0;top:0;width:100%;height:100%;touch-action:manipulation}

.fuss{flex:0 0 auto;padding:6px 0 0}
.fuss .klein{margin:4px 0 0;font-size:11.5px;line-height:1.35;color:var(--ink2);
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.legende{display:flex;align-items:center;gap:8px;font-size:11.5px;color:var(--ink2);
  font-variant-numeric:tabular-nums}
.rampe{flex:1;height:9px;border-radius:5px;border:1px solid var(--ring)}

/* Die Bedienung, so wenig wie möglich: ein Knopf, ein Regler, drei Formen. */
.regler{display:flex;align-items:center;gap:9px;flex:0 0 auto;margin-top:6px}
button{font:inherit;color:var(--ink);background:transparent;border:1px solid var(--axis);
  border-radius:8px;padding:5px 10px;cursor:pointer}
button:hover{border-color:var(--muted)}
#spiel{width:38px;flex:0 0 38px;padding:5px 0;font-variant-numeric:tabular-nums}
.bahn{position:relative;flex:1}
input[type=range]{width:100%;margin:0;accent-color:#9aa07f}
.marken{position:relative;height:9px;margin-top:1px}
.marken i{position:absolute;top:0;width:1px;height:4px;background:var(--axis)}
.marken i.voll{height:7px;background:var(--muted)}
.formen{display:flex;gap:5px;flex:0 0 auto;margin-top:5px}
.formen button{flex:1;min-width:64px;padding:4px 3px;font-size:11.5px;color:var(--muted)}
.formen button[aria-pressed=true]{color:var(--ink);border-color:var(--ink2);font-weight:600}

.tip{position:absolute;pointer-events:none;background:#141412;border:1px solid var(--axis);
  border-radius:9px;padding:7px 9px;font-size:12.5px;box-shadow:0 6px 20px rgba(0,0,0,.5);
  max-width:210px;opacity:0;transition:opacity .12s}
.tip b{display:block;font-size:13px;margin-bottom:2px}
.tip dl{margin:0;display:grid;grid-template-columns:auto auto;gap:1px 10px}
.tip dt{color:var(--ink2)}
.tip dd{margin:0;text-align:right;font-variant-numeric:tabular-nums}
.tip .warn{display:block;margin-top:3px;color:var(--muted);font-size:11.5px}
</style>
</head><body>
<div class="wrap">
<div class="buehne" id="buehne">
  <div class="feld">
    <canvas id="karte"></canvas>
    <div class="tip" id="tip"></div>
  </div>
  <div class="fuss">
    <div class="legende"><span id="legLinks"></span><div class="rampe" id="rampe"></div><span id="legRechts"></span></div>
    <p class="klein" id="legText"></p>
  </div>
  <div class="regler">
    <button id="spiel" aria-label="Play or pause">▶</button>
    <div class="bahn">
      <input type="range" id="zeit" min="0" max="1000" value="0" step="1" aria-label="Year">
      <div class="marken" id="marken"></div>
    </div>
  </div>
  <div class="formen" id="formen" role="group" aria-label="How much of the population goes into area">
    <button data-form="0">Real map</button>
    <button data-form="0.5" aria-pressed="true">Half and half</button>
    <button data-form="1">Cartogram</button>
  </div>
  <div class="schild"><b id="jahrZahl">–</b><span id="jahrBev"></span></div>
  <div class="text">
    <p class="jetzt" id="jetzt"></p>
    <div class="faden" id="faden" aria-live="polite"></div>
  </div>
</div>
</div>

<script>
${ENTPACKER}
const D = ${JSON.stringify(daten)};

/* ---------- Geometrie aus der Nutzlast ---------- */
const kum = a => { let v = 0; const o = new Int32Array(a.length); for (let i = 0; i < a.length; i++) { v += a[i]; o[i] = v; } return o; };
const GX = kum(entpacke(D.gx)), GY = kum(entpacke(D.gy));
const N = GX.length;
const RINGZAHL = entpacke(D.ringzahl), RINGLEN = entpacke(D.ringe), IDXD = entpacke(D.idx);
const GEBIETE = [];
{ let rp = 0, ip = 0;
  for (const nr of RINGZAHL) {
    const rs = [];
    for (let k = 0; k < nr; k++) {
      const len = RINGLEN[rp++]; const r = new Int32Array(len); let v = 0;
      for (let m = 0; m < len; m++) { v += IDXD[ip++]; r[m] = v; }
      rs.push(r);
    }
    GEBIETE.push(rs);
  } }
const NK = D.k.length, NF = D.B.length;
const JAHRE = D.B.map(b => b.t);
const T0 = JAHRE[0], T1 = JAHRE[NF - 1];
const [AX, AY] = D.ank;

/* ---------- Die Reihen: dieselbe Geometrie, andere Verzerrung ---------- */
const REIHEN = D.R.map((r, ri) => {
  const ZX = [], ZY = [];
  let px = GX, py = GY;
  for (const z of r.zustaende) {
    const dx = entpacke(z.dx), dy = entpacke(z.dy);
    const nx = new Int32Array(N), ny = new Int32Array(N);
    for (let i = 0; i < N; i++) { nx[i] = px[i] + dx[i]; ny[i] = py[i] + dy[i]; }
    ZX.push(nx); ZY.push(ny); px = nx; py = ny;
  }
  const BEV = [];
  const d = entpacke(D.bev[ri]);
  let vor = new Float64Array(NK);
  for (let f = 0; f < NF; f++) {
    const jetzt = new Float64Array(NK);
    for (let k = 0; k < NK; k++) jetzt[k] = vor[k] + d[f * NK + k];
    BEV.push(jetzt); vor = jetzt;
  }
  return { id: r.id, name: r.name, ZX, ZY, BEV, SKALA: r.zustaende.map(z => z.skala) };
});
const ANTEIL = entpacke(D.ai);
let reihe = REIHEN[0];

/* ---------- Weiche Interpolation ----------
   Zwischen zwei Zählungen wurde geradlinig gerechnet. Das trifft die Zählungen
   genau, aber die Bewegung knickt an jeder von ihnen: die Geschwindigkeit
   springt, und das sieht aus wie ein Ruck. Zwischen 1946 und 1950 wächst ein
   Kreis vielleicht doppelt so schnell wie zwischen 1950 und 1961, und genau
   im Bild der Zählung wechselt das schlagartig.

   Stattdessen eine monotone kubische Kurve (Fritsch–Carlson, wie PCHIP): sie
   geht durch jeden gezählten Wert, hat an den Zählungen keinen Knick mehr —
   und schiesst trotzdem nie über sie hinaus. Das ist der Unterschied zu einem
   gewöhnlichen Spline: wo eine Reihe steigt und dann fällt, wird die Steigung
   an der Spitze auf null gesetzt, statt eine Beule zu erfinden. Ein Kreis kann
   also zwischen zwei Zählungen nie mehr Menschen haben als in beiden, und eine
   Ecke der Karte wandert nie über den Ort hinaus, den sie in beiden Bildern
   hat. Dass die Zählungen selbst unverändert bleiben, ist damit garantiert.

   Gerechnet wird auf der Spielzeitachse, denn auf ihr läuft die Bewegung: die
   Abschnitte bekommen verschieden viel Zeit, und eine Steigung, die das nicht
   berücksichtigt, ergäbe genau den Knick, den sie vermeiden soll. Die Abstände
   kommen deshalb als h dazu.

   Zurückgegeben werden die beiden Steigungen bereits mit h multipliziert, also
   auf den Abschnitt normiert — dann rechnet hermite auf [0,1]. */
function steigungen(y, h, f, n) {
  const d1 = (y[f + 1] - y[f]) / h[f];
  const d0 = f > 0 ? (y[f] - y[f - 1]) / h[f - 1] : d1;
  const d2 = f + 2 < n ? (y[f + 2] - y[f + 1]) / h[f + 1] : d1;
  let m1, m2;
  // Am Rand einseitig; innen das gewichtete harmonische Mittel nach
  // Fritsch–Carlson, das an einem Wendepunkt der Reihe auf null geht.
  if (f === 0) m1 = d1;
  else if (d0 * d1 <= 0) m1 = 0;
  else { const w1 = 2 * h[f] + h[f - 1], w2 = h[f] + 2 * h[f - 1]; m1 = (w1 + w2) / (w1 / d0 + w2 / d1); }
  if (f + 2 >= n) m2 = d1;
  else if (d1 * d2 <= 0) m2 = 0;
  else { const w1 = 2 * h[f + 1] + h[f], w2 = h[f + 1] + 2 * h[f]; m2 = (w1 + w2) / (w1 / d1 + w2 / d2); }
  return [m1 * h[f], m2 * h[f]];
}
// Hermite auf [0,1] mit den beiden Steigungen
function hermite(y1, y2, m1, m2, t) {
  const t2 = t * t, t3 = t2 * t;
  return y1 * (2 * t3 - 3 * t2 + 1) + m1 * (t3 - 2 * t2 + t)
       + y2 * (-2 * t3 + 3 * t2) + m2 * (t3 - t2);
}

/* ---------- Zeichenkoordinaten ---------- */
const px = new Float64Array(N), py = new Float64Array(N);
// Ein Knoten im Bild f, schon auf den gemeinsamen Massstab gebracht.
/* ---------- Wie stark verzerrt wird ----------
   FORM ist der Regler zwischen der Landkarte (0) und dem vollen Kartogramm
   (1). Die Landkarte steckt schon in der Nutzlast — sie ist der Anfang der
   Differenzkette —, also kostet der Zwischenschritt kein einziges Zeichen
   mehr: jeder Knoten liegt einfach zwischen seinem Ort auf dem Boden und
   seinem Ort im Kartogramm.

   Was dabei an Fläche fehlt, holt die Höhe zurück; das rechnet hoehen()
   weiter unten. Die Grösse der ganzen Karte bleibt in jedem Fall die
   Bevölkerung, dafür sorgt SKALA. */
const FORMEN = [0, 0.5, 1];
let FORM = 0.5, formZiel = 1;    // formZiel ist der Index in FORMEN
const ortX = (f, i) => ((GX[i] + FORM * (reihe.ZX[f][i] - GX[i])) - AX) * reihe.SKALA[f] + AX;
const ortY = (f, i) => ((GY[i] + FORM * (reihe.ZY[f][i] - GY[i])) - AY) * reihe.SKALA[f] + AY;

// Die Steigungen hängen nur am Abschnitt, nicht an der Stelle darin — sie
// werden einmal je Abschnitt gerechnet und dann für alle Bilder benutzt.
let tangenteFuer = -1, tangenteReihe = null;
const AX1 = new Float64Array(N), AX2 = new Float64Array(N);
const AY1 = new Float64Array(N), AY2 = new Float64Array(N);
const PX1 = new Float64Array(N), PX2 = new Float64Array(N);
const PY1 = new Float64Array(N), PY2 = new Float64Array(N);
function tangenten(a) {
  if (tangenteFuer === a && tangenteReihe === reihe) return;
  tangenteFuer = a; tangenteReihe = reihe;
  const von = Math.max(0, a - 1), bis = Math.min(NF - 1, a + 2);
  const n = bis - von + 1, hh = [];
  for (let f = von; f < bis; f++) hh.push(TAKT[f]);
  const y = new Float64Array(4);
  for (let i = 0; i < N; i++) {
    for (let f = von; f <= bis; f++) y[f - von] = ortX(f, i);
    let [m1, m2] = steigungen(y, hh, a - von, n);
    PX1[i] = ortX(a, i); PX2[i] = ortX(a + 1, i); AX1[i] = m1; AX2[i] = m2;
    for (let f = von; f <= bis; f++) y[f - von] = ortY(f, i);
    [m1, m2] = steigungen(y, hh, a - von, n);
    PY1[i] = ortY(a, i); PY2[i] = ortY(a + 1, i); AY1[i] = m1; AY2[i] = m2;
  }
}
function setzePunkte(a, b, u) {
  if (b === a) { for (let i = 0; i < N; i++) { px[i] = ortX(a, i); py[i] = ortY(a, i); } return; }
  tangenten(a);
  const t = u, t2 = t * t, t3 = t2 * t;
  const c1 = 2 * t3 - 3 * t2 + 1, c2 = t3 - 2 * t2 + t, c3 = -2 * t3 + 3 * t2, c4 = t3 - t2;
  for (let i = 0; i < N; i++) {
    px[i] = PX1[i] * c1 + AX1[i] * c2 + PX2[i] * c3 + AX2[i] * c4;
    py[i] = PY1[i] * c1 + AY1[i] * c2 + PY2[i] * c3 + AY2[i] * c4;
  }
}
// Grösster Rahmen je Reihe und je Form, gemessen nur an den Kreisen, die im
// jeweiligen Bild auch gezeichnet werden. So füllt jede Ansicht die Fläche,
// statt sich nach Gebieten zu richten, die gar nicht zu sehen sind. Je Form
// ein eigener Rahmen, weil die Landkarte hochkant steht und das Kartogramm
// breiter läuft; dazwischen wird zwischen den Rahmen überblendet.
function rahmenFuer(r, form) {
  const merkR = reihe, merkF = FORM;
  reihe = r; FORM = form;
  let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity;
  for (let f = 0; f < NF; f++) {
    setzePunkte(f, f, 0);
    for (let g = 0; g < NK; g++) {
      if (!(r.BEV[f][g] > 0)) continue;
      for (const ring of GEBIETE[g]) for (const i of ring) {
        if (px[i] < a) a = px[i]; if (px[i] > b) b = px[i];
        if (py[i] < c) c = py[i]; if (py[i] > d) d = py[i];
      }
    }
  }
  reihe = merkR; FORM = merkF; tangenteFuer = -1;
  return { x: a, y: c, w: b - a, h: d - c };
}
for (const r of REIHEN) r.rahmenJe = FORMEN.map(f => rahmenFuer(r, f));
// Der Rahmen zur gerade eingestellten Form, zwischen den beiden nächsten
// gemessenen überblendet.
function rahmenJetzt() {
  const R = reihe.rahmenJe;
  let k = 0; while (k < FORMEN.length - 2 && FORMEN[k + 1] < FORM) k++;
  const t = Math.max(0, Math.min(1, (FORM - FORMEN[k]) / (FORMEN[k + 1] - FORMEN[k])));
  const A = R[k], B = R[k + 1];
  return { x: A.x + (B.x - A.x) * t, y: A.y + (B.y - A.y) * t,
           w: A.w + (B.w - A.w) * t, h: A.h + (B.h - A.h) * t };
}

/* ---------- Die Farbleiter ----------
   Eine einzige, und es ist die eines Schulatlas: Tiefland grün, dann gelb,
   dann braun, oben Fels und Schnee. Sie ist keine Datenskala im üblichen Sinn,
   sondern eine Konvention — und sie funktioniert, weil man sie schon kann.

   Gefärbt wird damit die **Höhe**, also dasselbe, was auch das Relief zeigt.
   Daraus folgt das Beste daran: die Höhenlinien liegen genau auf den
   Farbgrenzen, wie in einer Geländekarte, weil beide dieselbe Zahl sind.

   Gesetzt ist sie auf schwarzen Grund; die Seite kennt kein zweites Klima
   mehr. Das spart nicht nur Code, es ist auch der Grund, warum das Tiefgrün
   so tief sein darf. */
/* Die Leiter einer Reliefkarte, und zwar die gesättigte: Tiefland in sattem
   Grün, dann Gelbgrün, Gelb, Ocker, Orange, Rot — oben die helle Kappe. Die
   erste Fassung war um eine ganze Stufe blasser, gedämpftes Oliv und Graubraun,
   aus Sorge um das Relief, das darüber liegt. Die Sorge war unbegründet:
   weiches Licht bleicht eine satte Farbe nicht aus, es hebt und senkt sie. Und
   auf schwarzem Grund braucht eine Karte Farbe, sonst wird sie zu Schlamm.

   Die Helligkeit steigt durchgehend vom ersten zum letzten Band — das trägt die
   Höhe auch dann, wenn jemand die Farbtöne nicht trennen kann. */
const HYPSO = ['#15633a','#177546','#18884c','#2e9b4e','#50af52','#7ac159','#a7d05e','#d1da60',
               '#edd254','#f3b741','#f29c33','#eb802c','#de6228','#ca4628','#bf5f48','#e3b5a4'];
const stil = n => getComputedStyle(document.body).getPropertyValue(n).trim();
let LEER = '#1a1a18', INK = '#fff', STRICH = '#0c0c0c';
const SCHATTEN = 'rgba(0,0,0,.6)', KANTE3D = '#060605';
const STADTSTRICH = 'rgba(0,0,0,.42)';
const HELLMAX = 0.55, DUNKELMAX = 0.55;
function farbenHolen() {
  LEER = stil('--leer'); INK = stil('--ink'); STRICH = stil('--surface');
}
/* Sechzehn Bänder gleicher Breite, Grenzen bei k/16. Nicht gerundet auf
   sechzehn Stützstellen, sondern abgeschnitten auf sechzehn Bänder — das ist
   der Unterschied zwischen „sechzehn Farben" und „fünfzehn Grenzen an
   bekannten Stellen", und die Höhenlinien brauchen die Grenzen. */
const bandIdx = u => Math.max(0, Math.min(15, Math.floor(u * 16)));
const stufe = (r, u) => r[Math.max(0, Math.min(r.length - 1, Math.round(u * (r.length - 1))))];

/* ---------- Die Höhenskala ----------
   Die Höhe eines Kreises ist seine Bevölkerung geteilt durch seine gezeichnete
   Fläche, bezogen auf die mittlere Dichte des Bildes — im vollen Kartogramm
   also für jeden 1, auf der Landkarte seine wirkliche Dichte im Verhältnis zur
   mittleren.

   Wie weit die Werte streuen, hängt damit ganz an der Form: auf der Landkarte
   vom Fünftel bis zum Fünfzehnfachen, bei halber Verzerrung nur noch von 0,36
   bis 2,5, im vollen Kartogramm gar nicht. Eine feste Skala für alle drei wäre
   in zweien davon fast leer — die halbe Leiter bliebe ungenutzt, und die Karte
   läge in einem einzigen Gelb.

   Also wird die Spanne **je Form einmal aus den Daten gemessen**: alle Kreise
   in allen Zählungen, ein halbes und neunundneunzigeinhalb Prozent. Das geht ohne
   zu zeichnen, weil die Höhe ein Verhältnis ist und sich beim Skalieren der
   ganzen Karte nicht ändert. Gemessen wird einmal je Form und dann behalten:
   dieselbe Farbe heisst damit über die ganzen hundertfünfzig Jahre dasselbe.
   Zwischen zwei Formen wird logarithmisch übergeblendet. */
const SPANNEJE = [];
function hoehenSpanne(fi) {
  if (SPANNEJE[fi]) return SPANNEJE[fi];
  const merkR = reihe, merkF = FORM;
  FORM = FORMEN[fi];
  const alle = [];
  const fl = new Float64Array(NK);
  for (let f = 0; f < NF; f++) {
    setzePunkte(f, f, 0);
    let sP = 0, sA = 0;
    for (let g = 0; g < NK; g++) {
      const w = reihe.BEV[f][g];
      let A2 = 0;
      if (w > 0) for (const r of GEBIETE[g]) {
        const n = r.length;
        for (let i = 0, j = n - 1; i < n; j = i++) A2 += px[r[j]] * py[r[i]] - px[r[i]] * py[r[j]];
      }
      fl[g] = Math.abs(A2 / 2);
      if (w > 0 && fl[g] > 0) { sP += w; sA += fl[g]; }
    }
    const mittel = sA > 0 ? sP / sA : 1;
    for (let g = 0; g < NK; g++) {
      const w = reihe.BEV[f][g];
      if (w > 0 && fl[g] > 0) alle.push([(w / fl[g]) / mittel, fl[g]]);
    }
  }
  /* Gewichtet mit der **Fläche**, nicht je Kreis gleich. Das ist der
     Unterschied zwischen „wie dicht wohnt ein Kreis" und „wie dicht ist das
     Land hier", und gefärbt wird Fläche. Ungewichtet setzten die hundertsieben
     kreisfreien Städte das obere Quantil — sie sind dicht, aber winzig, und
     nach dem Weichzeichnen bleibt von ihnen wenig übrig. Die Leiter reichte
     deshalb weit über das hinaus, was im Feld je vorkommt, und die halbe
     Palette blieb ungenutzt.

     Aus demselben Grund ein Fünftelprozent statt eines halben an den Enden:
     das Weichzeichnen zieht die Verteilung ohnehin zur Mitte, die Leiter darf
     also enger stehen als die rohen Kreiswerte. */
  alle.sort((a, b) => a[0] - b[0]);
  let ges = 0; for (const [, fa] of alle) ges += fa;
  const q = t => {
    let ziel = t * ges, lauf = 0;
    for (const [v, fa] of alle) { lauf += fa; if (lauf >= ziel) return v; }
    return alle[alle.length - 1][0];
  };
  // Im vollen Kartogramm liegen alle Werte auf 1; eine Spanne gibt es dort
  // nicht, und die Karte ist zu Recht einfarbig.
  const lo = Math.max(1e-3, q(0.05)), hi = Math.max(lo * 1.02, q(0.95));
  FORM = merkF; reihe = merkR; tangenteFuer = -1;
  return (SPANNEJE[fi] = [Math.log(lo), Math.log(hi)]);
}
function hoehenSkala() {
  let k = 0; while (k < FORMEN.length - 2 && FORMEN[k + 1] < FORM) k++;
  const t = Math.max(0, Math.min(1, (FORM - FORMEN[k]) / (FORMEN[k + 1] - FORMEN[k])));
  const a = hoehenSpanne(k), b = hoehenSpanne(k + 1);
  const von = a[0] + (b[0] - a[0]) * t, bis = a[1] + (b[1] - a[1]) * t;
  return [von, Math.max(von + 1e-4, bis)];
}
/* ---------- Wenn keine Höhe mehr übrig ist ----------
   Im vollen Kartogramm steckt die ganze Bevölkerung in der Fläche; jeder Kreis
   hat dann dieselbe Dichte, und die gemessene Spanne schnurrt auf ein Prozent
   zusammen. Eine Leiter, die über dieses eine Prozent gespannt wird, macht aus
   Rundungsresten ein Gebirge: sie stünde auf ×0,99 bis ×1,01 und zeigte doch
   alle sechzehn Farben. Das Feld selbst tut dasselbe — was dort im Kartogramm
   noch an Bergen steht, sind die Fugen zwischen den Kreisen, weichgezeichnet;
   ein grosser Kreis behält davon mehr Mitte als ein kleiner, und schon sieht
   Berlin wieder aus wie ein Berg, obwohl es nur gross gezeichnet ist.

   Also zwei Bremsen, beide aus derselben gemessenen Spanne:

   1. Die Leiter bekommt eine **Mindestbreite**. Ist die Spanne enger, wird sie
      um ihre Mitte auf dieses Mass aufgezogen; alle Werte landen dann in der
      Mitte der Leiter, und die Karte liegt einfarbig da — wie es einem
      Kartogramm zusteht.
   2. Das **Relief wird ausgeblendet**, im selben Verhältnis. Bei voller Spanne
      steht es ganz, bei keiner gar nicht, dazwischen anteilig. Der Weg vom
      Relief zum Kartogramm zeigt damit genau das, worum es geht: die Berge
      sinken in die Fläche, weil die Menschen von der Höhe in die Breite
      wandern. */
const SPANNE_MIN = Math.log(2.6);
function skalaBreit(von, bis) {
  const fehlt = SPANNE_MIN - (bis - von);
  if (fehlt <= 0) return [von, bis];
  /* Symmetrisch aufgezogen läge die Mitte der Werte auf u = 0,5 — und das ist
     genau die Grenze zwischen dem achten und dem neunten Farbband. Im
     Kartogramm, wo alle Werte dicht um diese Mitte liegen, kippte deshalb jeder
     Rundungsrest über die Grenze und sprenkelte die Fläche mit Flecken des
     Nachbartons. Also um ein halbes Band verschoben: die Mitte fällt in die
     Mitte eines Bandes, und die Fläche bleibt einfarbig. */
  const a = von - fehlt / 2, b = bis + fehlt / 2;
  const halbesBand = (b - a) / 32;
  return [a - halbesBand, b - halbesBand];
}
function reliefAnteil(von, bis) {
  return Math.max(0, Math.min(1, (bis - von) / SPANNE_MIN));
}


let skalaVon = -1, skalaBis = 1, RELIEF_ANTEIL = 1;

/* ---------- Zustand ---------- */
// Die Uhr läuft über die Spielzeit, nicht über die Jahre. Wie viel Spielzeit
// ein Abschnitt bekommt, steht in D.takt und ist beim Bauen gerechnet: das
// geometrische Mittel aus seinem Anteil an den Jahren und seinem Anteil an
// allem, was sich umschichtet. Wo viel in Bewegung ist, läuft die Uhr also
// langsamer — 1939 bis 1946 bekommt fünf Sekunden statt drei —, ohne dass die
// Zeitachse ganz aufhört, eine zu sein.
const TAKT = D.takt, TAKTKUM = [0];
for (let i = 0; i < TAKT.length; i++) TAKTKUM.push(TAKTKUM[i] + TAKT[i]);
let spiel = 0, jahr = T0, laeuft = false, letzterTip = -1;
let dtSek = 1 / 60;   // wie lange das letzte Bild gedauert hat, für den Tiefpass
function setzeZeit(p) {
  spiel = Math.max(0, Math.min(1, p));
  let a = 0;
  while (a < NF - 2 && TAKTKUM[a + 1] <= spiel) a++;
  const u = Math.max(0, Math.min(1, (spiel - TAKTKUM[a]) / TAKT[a]));
  jahr = JAHRE[a] + (JAHRE[a + 1] - JAHRE[a]) * u;
}
const cv = document.getElementById('karte'), ctx = cv.getContext('2d');
let breite = 0, hoehe = 0, mass = 1, verX = 0, verY = 0;

function masse() {
  // Die Leinwand füllt, was der Rahmen ihr lässt — Kopfzeile, laufende Notiz,
  // Legende und Bedienung stehen fest, der Rest gehört der Karte. Gemessen
  // wird das Feld selbst; das Auslegen macht der Umbruch, nicht die Rechnung.
  const feld = cv.parentElement;
  breite = feld.clientWidth;
  hoehe = Math.max(120, feld.clientHeight);
  const dpr = Math.min(2.5, devicePixelRatio || 1);
  const bw = Math.round(breite * dpr), bh = Math.round(hoehe * dpr);
  if (cv.width !== bw || cv.height !== bh) { cv.width = bw; cv.height = bh; }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const V = rahmenJetzt();
  mass = Math.min(breite / V.w, hoehe / V.h) * 0.99;
  verX = (breite - V.w * mass) / 2 - V.x * mass;
  /* Nicht senkrecht mittig, sondern **nach unten gerückt**. Die Karte hat ein
     festes Seitenverhältnis; im Hochformat begrenzt sie die Breite, und was an
     Höhe übrig bleibt, lag bisher zur Hälfte oben und zur Hälfte unten. Oben
     aber steht der Text, und unten stand nichts. Also bekommt der Text den
     freien Platz und die Karte rückt bis kurz vor die Legende — beides
     gewinnt. Ein Achtel Rest bleibt unten stehen, damit sie nicht anstösst.

     Im Querformat, wo die Höhe die Karte begrenzt, ist der Rest null und die
     Zeile tut nichts. */
  const rest = Math.max(0, hoehe - V.h * mass);
  verY = rest * 0.875 - V.y * mass;
}

function bildBei(t) {
  let a = 0;
  while (a < NF - 2 && JAHRE[a + 1] <= t) a++;
  const b = Math.min(NF - 1, a + 1);
  const u = JAHRE[b] > JAHRE[a] ? Math.max(0, Math.min(1, (t - JAHRE[a]) / (JAHRE[b] - JAHRE[a]))) : 0;
  return [a, b, u];
}

// Werte zwischen zwei Bildern. Fehlt ein Kreis in einem der beiden — Berlin
// hat vor 1995 keine Zahl —, wird nicht dazwischengerechnet, sondern
// ein- oder ausgeblendet: der vorhandene Wert gilt, die Deckkraft wandert.
// Die Veränderung je Jahr im Abschnitt j, also zwischen den Bildern j und j+1.
function rateIm(j, k) {
  if (j < 0 || j + 1 >= NF) return null;
  const va = reihe.BEV[j][k], vb = reihe.BEV[j + 1][k], dt = JAHRE[j + 1] - JAHRE[j];
  if (!(va > 0) || !(vb > 0) || !(dt > 0)) return null;
  return (Math.pow(vb / va, 1 / dt) - 1) * 100;
}
// Die Richtung gehört dem Abschnitt zwischen zwei Zählungen, nicht einem
// einzelnen Augenblick darin. Sie bleibt deshalb stehen, solange die Karte von
// einem Bild zum nächsten läuft — nur an der Zählung selbst sprang sie um, und
// ein Sprung mitten in einer laufenden Bewegung sieht aus wie ein Fehler.
//
// Sie blendet deshalb über, aber **nur nach hinten**: an der Zählung gilt noch
// die alte Rate, und im ersten Sechstel des neuen Abschnitts wandert die Farbe
// zur neuen hinüber. Die erste Fassung blendete auch nach vorn, und das war
// falsch: der Einbruch von 1939 war dann schon 1934 zu sehen, weil die Karte
// eine Rate zeigte, die es noch gar nicht gab. Keine Farbe nimmt jetzt etwas
// vorweg — was zu sehen ist, ist gezählt oder schon vorbei.
const UEBER = 1 / 6;
const glatt = x => x * x * (3 - 2 * x);
function werteBei(a, b, u) {
  const w = new Float64Array(NK), deck = new Float64Array(NK), rate = new Array(NK).fill(null);
  const vonF = Math.max(0, a - 1), bisF = Math.min(NF - 1, b + 1), nF = bisF - vonF + 1;
  const hh = [];
  for (let f = vonF; f < bisF; f++) hh.push(TAKT[f]);
  for (let k = 0; k < NK; k++) {
    const va = reihe.BEV[a][k], vb = reihe.BEV[b][k];
    if (va > 0 && vb > 0) {
      // Dieselbe weiche Kurve wie für die Form, damit Zahl und Fläche
      // zusammenpassen: über die Zählung hinaus geht sie nie.
      const y = [];
      for (let f = vonF; f <= bisF; f++) y.push(reihe.BEV[f][k]);
      if (y.every(v => v > 0)) {
        const [m1, m2] = steigungen(y, hh, a - vonF, nF);
        w[k] = hermite(va, vb, m1, m2, u);
      } else w[k] = va + (vb - va) * u;
      deck[k] = 1;
      const hier = rateIm(a, k);
      if (hier !== null) {
        let r = hier;
        if (u < UEBER) {
          const vor = rateIm(a - 1, k);
          if (vor !== null) r = vor + (hier - vor) * glatt(u / UEBER);
        }
        rate[k] = r;
      }
    }
    else if (va > 0) { w[k] = va; deck[k] = 1 - u; }
    else if (vb > 0) { w[k] = vb; deck[k] = u; }
  }
  return { w, deck, rate };
}

/* ---------- Relief ----------
   Die Karte soll nicht flach liegen, sondern sich wölben. Gerechnet wird das
   über ein Höhenfeld, nicht über gezeichnete Kanten:

   1. Die Kreise weiss, die Fugen zwischen ihnen schwarz und überall gleich
      breit. Das ist die Vorlage.
   2. Zweimal weichgezeichnet und gemischt: einmal knapp, einmal weit. Das
      knappe Feld rundet jeden Kreis für sich ab, das weite mittelt darüber,
      wie dicht die Fugen liegen.
   3. Aus dem Gefälle des Feldes die Normale, daraus Lambert-Beleuchtung von
      oben links.

   Dass dabei die grossen Städte aufgehen, ist kein Effekt, sondern folgt aus
   der Fläche: ein Kreis mit vielen Menschen ist breit gezeichnet, kommt weit
   von seinen Fugen weg und erreicht die volle Höhe; ein kleiner erreicht sie
   nie und bleibt ein flaches Kissen. Die Dicke ist für alle dieselbe — Fläche
   mal Höhe, also Volumen, bleibt damit die Bevölkerung. */
/* ---------- Wie hoch ein Kreis steht ----------
   Die eine Aussage dieser Karte ist: **Volumen ist Bevölkerung.** Im vollen
   Kartogramm trägt das allein die Fläche, und die Höhe ist überall dieselbe.
   Nimmt man die Verzerrung zurück, fehlt der Fläche etwas — und genau das
   bekommt die Höhe:

       Höhe = Bevölkerung / gezeichnete Fläche

   Gemessen wird die gezeichnete Fläche, nicht gerechnet, was sie sein
   sollte. Damit stimmt die Rechnung bei jedem Zwischenschritt von selbst,
   ohne dass die Zwischenform ein eigenes Kartogramm bräuchte. Bezug ist die
   mittlere Dichte des Bildes: im vollen Kartogramm kommt für jeden Kreis 1
   heraus, auf der Landkarte seine wirkliche Dichte im Verhältnis zur
   mittleren.

   Gezeichnet wird die Höhe gestaucht. Zwischen dem leersten Landkreis und
   Berlin liegt auf der Landkarte der Faktor 140, und ein Relief mit Faktor
   140 ist eine senkrechte Wand neben einer Ebene. Die Wurzel daraus lässt
   sich beleuchten. Die Reihenfolge bleibt dabei richtig, der Abstand nicht —
   die Zahl selbst steht beim Antippen. */
const GEZEICHNET = new Float64Array(NK), HOCH = new Float64Array(NK);
// Je Farbstufe ein Eimer, dazu einer für die Kreise ohne Zahl.
// Die Stauchung und der Sockel, auf dem das Relief steht. Ohne Sockel läge auf
// der Landkarte das halbe Land im Dunkeln, weil eine einzige Stadt die Skala
// setzt; mit Sockel ist die Ebene eine Ebene und die Städte steigen daraus auf.
// Im vollen Kartogramm sind alle Höhen gleich, dann ist der Sockel wirkungslos
// und es bleibt genau beim flachen Deckel von vorher.
/* ---------- Was im Höhenfeld steht ----------
   Bis hierher stand darin die **gestauchte Höhe**: Wurzel aus der Dichte,
   normiert auf den höchsten Kreis des Bildes. Die Farbe dagegen kam aus
   log(Dichte) auf der gemessenen Leiter, und gefärbt wurde Kreis für Kreis.
   Zwei verschiedene Grössen, zwei verschiedene Geometrien — und das sah man:
   Berlin war ein kleiner Farbfleck in der Form seines Kreises, während sein
   Berg, aus dem weiten Feld gezogen, weit darüber hinausreichte und seine
   Höhenlinien sich drängten. Farbe und Relief widersprachen einander.

   Jetzt steht im Feld **dieselbe Zahl, die auch die Leiter zeigt**: die
   logarithmische Dichte, linear auf die gemessene Spanne abgebildet. Daraus
   kommen Farbe, Schattierung und Höhenlinien gemeinsam — dieselbe Zahl,
   dieselbe Glättung, dieselbe Geometrie.

   RESERVE ist Luft über und unter der Farbleiter: die Spanne ist bei einem
   halben Prozent gekappt (q0,005 / q0,995), und ohne Luft bekäme Berlin einen
   abgeschnittenen Gipfel — ein flaches Plateau ohne Modellierung. Ein Achtel
   der Spanne nach jeder Seite reicht.

   Der Wert ist mit Bedacht ein Achtel. Damit liegen die fünfzehn Farbgrenzen
   (bei k/16 der Leiter) im Feld auf (k+2)/20, und bei vierzig Niveaus ist das
   jedes zweite: **jede zweite Höhenlinie ist eine Farbgrenze.** Das ist die
   Konstruktion eines Schulatlas. */
const RESERVE = 0.125;
// Leiterwert (0 = unteres Ende der Farbskala, 1 = oberes) → Feldwert und zurück.
const zuFeld = u => Math.max(0, Math.min(1, (u + RESERVE) / (1 + 2 * RESERVE)));
const ausFeld = v => v * (1 + 2 * RESERVE) - RESERVE;
function hoehen(w, deck) {
  let sP = 0, sA = 0;
  for (let g = 0; g < NK; g++) {
    let A2 = 0;
    if (deck[g] > 0.5) for (const r of GEBIETE[g]) {
      const n = r.length;
      for (let i = 0, j = n - 1; i < n; j = i++) A2 += px[r[j]] * py[r[i]] - px[r[i]] * py[r[j]];
    }
    GEZEICHNET[g] = Math.abs(A2 / 2) * mass * mass;
    if (deck[g] > 0.5 && w[g] > 0 && GEZEICHNET[g] > 0) { sP += w[g]; sA += GEZEICHNET[g]; }
  }
  const mittel = sA > 0 ? sP / sA : 1;
  for (let g = 0; g < NK; g++)
    HOCH[g] = (deck[g] > 0.5 && GEZEICHNET[g] > 0 && w[g] > 0) ? (w[g] / GEZEICHNET[g]) / mittel : 0;
}

const RAUF = 0.55;                // Auflösung des Höhenfelds, Anteil der Bildpunkte
const hkA = document.createElement('canvas'), hcA = hkA.getContext('2d');
const hkB = document.createElement('canvas'), hcB = hkB.getContext('2d', { willReadFrequently: true });
const hkC = document.createElement('canvas'), hcC = hkC.getContext('2d', { willReadFrequently: true });
const hkL = document.createElement('canvas'), hcL = hkL.getContext('2d');
const hkF = document.createElement('canvas'), hcF = hkF.getContext('2d');
let rW = 0, rH = 0, rBild = null, fBild = null;
let feinH = null, grobH = null, grobM = null, grobAuf = null, feldH = null,
    farbF = null, maskeH = null, schatten = null;
// Die Farbleiter als drei Zahlenreihen — je Bildpunkt ein Nachschlagen statt
// eines Zerlegens von '#rrggbb'.
const HYPSO_R = HYPSO.map(h => parseInt(h.slice(1, 3), 16));
const HYPSO_G = HYPSO.map(h => parseInt(h.slice(3, 5), 16));
const HYPSO_B = HYPSO.map(h => parseInt(h.slice(5, 7), 16));
/* ---------- Tiefpass ----------
   Das Höhenfeld wird jedes Bild neu gerastert, und dabei rutschen die Kreise um
   Bruchteile eines Feldpunktes. Das Feld selbst ist glatt, aber sein Raster
   springt — und die Höhenlinien, die daraus verfolgt werden, zappeln mit, um
   ein, zwei Bildpunkte, sechzigmal in der Sekunde. Zu sehen ist das als Zittern,
   obwohl sich in den Daten nichts dergleichen tut.

   Also ein Tiefpass erster Ordnung über die Bilder: das gezeigte Feld folgt dem
   gerechneten mit einer Zeitkonstanten von einer halben Sekunde. Bei siebzig
   Sekunden für hundertdreiundfünfzig Jahre ist das gut ein Jahr — das Zittern
   des Rasters fällt weg, die Bewegung über die Jahre bleibt.

   Gerechnet mit der wirklich vergangenen Zeit, nicht je Bild: sonst hinge die
   Zeitkonstante daran, wie schnell das Gerät gerade ist. Und wo die Zeit
   springt — am Regler, beim Umschalten, beim Ändern der Grösse —, wird der
   Filter geleert statt nachgezogen; sonst zeigte das Bild danach eine halbe
   Sekunde lang das Gelände von vorher. */
// Zwei Zeitkonstanten, in Sekunden. Das weite Feld trägt die Höhenlinien und
// darf träge sein: es ist ohnehin über fünfzehn Punkte verschmiert, ein paar
// Jahre Nachlauf sieht dort niemand. Das enge Feld und der Rand hängen an den
// Umrissen der Kreise — liefen sie zu weit nach, sässe die Schattierung neben
// ihrer Fläche.
const TIEFPASS_GROB = 1.2, TIEFPASS_FEIN = 0.30;
let glattFein = null, glattGrob = null, glattGrobM = null, glattMaske = null, glattDa = false;
function reliefFrisch() { glattDa = false; }
function reliefFeld() {
  const w = Math.max(8, Math.round(breite * RAUF)), h = Math.max(8, Math.round(hoehe * RAUF));
  if (w === rW && h === rH) return;
  rW = w; rH = h;
  for (const k of [hkA, hkB, hkC, hkL, hkF]) { k.width = w; k.height = h; }
  rBild = hcL.createImageData(w, h);
  fBild = hcL.createImageData(w, h);
  feinH = new Float32Array(w * h); feldH = new Float32Array(w * h);
  grobH = new Float32Array(w * h); grobM = new Float32Array(w * h);
  grobAuf = new Float32Array(w * h); farbF = new Float32Array(w * h);
  maskeH = new Float32Array(w * h); schatten = new Float32Array(w * h);
}
// Die Stellschrauben des Reliefs.
// Zwei Sonnen, und das ist Absicht. Die Modellierung braucht ein Licht, das
// hoch genug steht, damit die Hänge noch Zeichnung haben; der Schlagschatten
// braucht ein Licht, das flach genug steht, damit überhaupt einer entsteht —
// ein Strahl, der steiler abfällt als der Hang selbst, trifft nie auf Schatten.
// Kartenzeichner machen das seit jeher so.
// Auf schwarzem Grund. Weiches Licht statt Ueberlagern: Ueberlagern rechnet um
// das mittlere Grau herum und laesst dunkle Farben fast unberuehrt, und auf
// dieser Karte ist fast alles dunkel. Weiches Licht hebt auch tiefe Toene noch,
// darum darf die Staerke hoeher liegen.
const STAERKE = 2.2, MISCHUNG = 'soft-light';
let SONNE = 40;                 // Grad über der Fläche, Licht von oben links
let WURFSONNE = 16;             // dasselbe Licht, flach, nur für den Schlagschatten
let UEBERHOEHT = 30;            // volle Höhe in Bildpunkten des Höhenfelds
let MULDE = 0.85;               // wie stark Mulden verschatten
let WURF = 0.50;                // wie dunkel ein Schlagschatten ist
/* Zwanzig Niveaus, und die Zahl ist nicht frei gewählt: mit einem Achtel
   Reserve über und unter der Farbleiter liegen deren fünfzehn Grenzen im Feld
   auf 2/20 bis 17/20 — also **ist jede Höhenlinie eine Farbgrenze** und jede
   Farbgrenze trägt ihre Linie. Das ist die Konstruktion eines Schulatlas, und
   es ist das, was eine Höhenlinie auf einer Geländekarte überhaupt tun soll:
   den Farbwechsel begründen, statt quer durch ihn hindurchzulaufen. */
let LINIE = 0.72, NIVEAUS = 20, FLACHHANG = 0.0012, DUNKELLINIE = 0.85;
const LINIENSCHRITT = 2;          // Gitterschritt der Linienverfolgung, in Feldpunkten
// So fein wird die Höhe abgestuft, ehe sie weichgezeichnet wird. Gezeichnet
// wird in Bündeln, und die Zahl ist nicht beliebig: die Stufen stecken
// hinterher im Feld. Zu grob, und die Höhenlinien laufen an ihnen entlang statt
// an der Landschaft — und schlimmer, im Lauf der Zeit springt ein Kreis von
// einer Stufe zur nächsten, und die Linien in seiner Umgebung zucken mit.
const STUFEN = 200;
const EIMER_H = Array.from({ length: STUFEN }, () => []);
function reliefUeber(sil, deck) {
  if (!(breite > 60 && hoehe > 60)) return;
  reliefFeld();
  const s = rW / breite;
  const fein = Math.max(2.2, breite / 95);      // enges Weichzeichnen: der einzelne Kreis
  const grob = Math.max(7, breite / 22);        // weites: die Landschaft darüber

  // Die Vorlage. Draussen bleibt sie durchsichtig, nicht schwarz: dieselbe
  // Fläche dient hinterher als Schablone, mit der das Licht auf die Karte
  // beschnitten wird — das erspart ein zweites Beschneiden an einem Pfad aus
  // vierhundert Vielecken, und das ist der teuerste Teil des Bildes.
  hcA.setTransform(1, 0, 0, 1, 0, 0);
  hcA.clearRect(0, 0, rW, rH);
  hcA.setTransform(s, 0, 0, s, 0, 0);
  // Jeder Kreis bekommt sein eigenes Grau: das ist seine Höhe. Gezeichnet
  // wird in Bündeln statt in vierhundert Füllungen — dieselbe Ersparnis wie
  // im Nadelrelief.
  for (const e of EIMER_H) e.length = 0;
  for (let g = 0; g < NK; g++) {
    if (!(deck[g] > 0.5) || !(HOCH[g] > 0)) continue;
    const v = zuFeld((Math.log(HOCH[g]) - skalaVon) / (skalaBis - skalaVon));
    let st = Math.round(v * (STUFEN - 1));
    if (st < 1) st = 1; if (st > STUFEN - 1) st = STUFEN - 1;
    EIMER_H[st].push(g);
  }
  for (let st = 1; st < STUFEN; st++) {
    const e = EIMER_H[st];
    if (!e.length) continue;
    hcA.beginPath();
    for (const g of e) for (const r of GEBIETE[g]) {
      hcA.moveTo(px[r[0]] * mass + verX, py[r[0]] * mass + verY);
      for (let i = 1; i < r.length; i++) hcA.lineTo(px[r[i]] * mass + verX, py[r[i]] * mass + verY);
      hcA.closePath();
    }
    const t = Math.round(255 * st / (STUFEN - 1));
    const grau = 'rgb(' + t + ',' + t + ',' + t + ')';
    hcA.fillStyle = grau;
    hcA.fill('evenodd');
    // Dieselbe Naht wie auf der Leinwand, und hier wiegt sie schwerer: ein
    // durchsichtiger Spalt im Höhenfeld wird nach dem Weichzeichnen zu einer
    // Kerbe, also wieder zu einer sichtbaren Grenze — diesmal als Relief.
    hcA.strokeStyle = grau; hcA.lineWidth = 1 / s; hcA.stroke();
  }
  // Hier stand eine Fuge: ein schwarzer Strich auf jeder Kreisgrenze, der nach
  // dem Weichzeichnen einen Graben hinterliess und jeden Kreis als eigene
  // Platte ausformte. Das war eine Grenze wie jede andere, nur als Relief
  // gezeichnet statt als Linie — und sie blieb sichtbar, als die Linien
  // längst weg waren. Jetzt stossen die Plateaus unmittelbar aneinander; das
  // enge Weichzeichnen macht daraus einen Hang, und es bleibt ein
  // durchgehendes Gelände statt eines Mosaiks.

  // Das weite Feld. Es entstand eine Fassung lang auf einer dreimal gröberen
  // Leinwand — Weichzeichnen kostet nach Fläche, und für die grosse Form
  // schien die Auflösung zu reichen. Sie reichte für die Schattierung, aber
  // nicht für die Höhenlinien: aus einem dreifach hochgerechneten Feld wurden
  // zappelige Linien mit Knicken an jeder Stützstelle. Jetzt in voller
  // Auflösung; Weichzeichnen ist ohnehin linear in der Fläche, nicht im
  // Radius.
  hcC.setTransform(1, 0, 0, 1, 0, 0);
  hcC.clearRect(0, 0, rW, rH);
  hcC.filter = 'blur(' + (grob * s).toFixed(2) + 'px)';
  hcC.drawImage(hkA, 0, 0);
  hcC.filter = 'none';

  hcB.setTransform(1, 0, 0, 1, 0, 0);
  hcB.globalAlpha = 1;
  hcB.clearRect(0, 0, rW, rH);
  hcB.filter = 'blur(' + (fein * s).toFixed(2) + 'px)';
  hcB.drawImage(hkA, 0, 0);
  hcB.filter = 'none';

  /* Gelesen wird in zwei Kanälen, und das ist der Kniff.

     Die Vorlage ist draussen durchsichtig. Weichzeichnen mischt deshalb am
     Rand Farbe mit Nichts — nähme man das Ergebnis einfach als Höhe, fiele
     die Karte schon dreissig Pixel vor der Küste ab, und der grösste Berg im
     Feld wäre Deutschland selbst. Für die Berge im Inneren bliebe kaum
     Spielraum.

     getImageData gibt die Farbe aber **unmultipliziert** zurück: Rot ist
     bereits blur(Höhe·Deckung) / blur(Deckung), also der örtliche Mittelwert
     der Höhe ohne den Rand — genau die normalisierte Faltung, die man sonst
     von Hand bauen müsste. Die Deckung steht daneben im Alphakanal und gibt
     den Rand der Karte, jetzt als eigene, schmale Rundung.

     Höhe und Rand sind damit getrennt: die ganze Spanne gehört dem Inneren,
     und die Küste bekommt trotzdem eine Kante, die nicht senkrecht abbricht. */
  const df = hcB.getImageData(0, 0, rW, rH).data;
  for (let i = 0, n = rW * rH; i < n; i++) {
    feinH[i] = df[i << 2] / 255;
    const a = df[(i << 2) + 3] / 255;
    maskeH[i] = a * a * (3 - 2 * a);
  }
  
  // Das weite Feld bekommt seinen eigenen Rand, den aus seinem eigenen
  // Alphakanal: der ist über dieselbe weite Strecke verlaufen und damit glatt.
  // Nähme es den schmalen Rand des engen Feldes, knickten die Höhenlinien
  // entlang der Küste.
  const dg = hcC.getImageData(0, 0, rW, rH).data;
  for (let i = 0, n = rW * rH; i < n; i++) {
    grobH[i] = dg[i << 2] / 255;
    const a = dg[(i << 2) + 3] / 255;
    grobM[i] = a * a * (3 - 2 * a);
  }

  // Und hier der Tiefpass. Drei Felder, ein Gewicht, aus der wirklich
  // vergangenen Zeit gerechnet.
  const n3 = rW * rH;
  if (!glattFein || glattFein.length !== n3) {
    glattFein = new Float32Array(n3); glattGrob = new Float32Array(n3);
    glattGrobM = new Float32Array(n3); glattMaske = new Float32Array(n3);
    glattDa = false;
  }
  if (!glattDa) {
    glattFein.set(feinH); glattGrob.set(grobH); glattGrobM.set(grobM); glattMaske.set(maskeH);
    glattDa = true;
  } else {
    const dt = Math.max(0.001, Math.min(0.25, dtSek));
    const gG = 1 - Math.exp(-dt / TIEFPASS_GROB), gF = 1 - Math.exp(-dt / TIEFPASS_FEIN);
    for (let i = 0; i < n3; i++) {
      glattFein[i] += (feinH[i] - glattFein[i]) * gF;
      glattGrob[i] += (grobH[i] - glattGrob[i]) * gG;
      glattGrobM[i] += (grobM[i] - glattGrobM[i]) * gG;
      glattMaske[i] += (maskeH[i] - glattMaske[i]) * gF;
    }
  }
  // Der Tiefpass liegt jetzt auf dem **weiten Feld selbst**, nicht mehr auf
  // seinem Produkt mit dem Rand: aus diesem Feld kommt gleich die Farbe der
  // Karte, und die darf den Randabfall nicht mitnehmen — sonst bekäme die
  // Küste eine grüne Bordüre.
  feinH.set(glattFein); grobH.set(glattGrob); grobM.set(glattGrobM); maskeH.set(glattMaske);

  /* Drei Felder aus denselben zwei Weichzeichnungen:

     Das Farbfeld trägt **Farbe und Höhenlinien**. Es mischt eng und weit, 40 zu 60 —
     das weite allein wäre für die Farbe zu grob, eine kreisfreie Stadt von
     zwölf Bildpunkten verschwände darin ganz. Ohne Randabfall, denn die Küste
     soll keine grüne Bordüre bekommen und dort werden ohnehin keine Linien
     gezogen.

     Das Relieffeld trägt die **Schattierung** und ist dasselbe, nur mit dem Rand: der
     Abfall zur Küste hin ist es, der ihr eine Kante gibt. Im Inneren, wo die
     Maske 1 ist, sind beide gleich — also liegen Farbe, Linie und Licht
     aufeinander.

     Das dritte ist das weite Feld mit seinem eigenen, breiteren Rand; aus ihm
     kommt die Muldenverschattung, die ja gerade die weite Umgebung braucht. */
  for (let i = 0; i < n3; i++) {
    grobAuf[i] = grobH[i] * grobM[i];
    farbF[i] = 0.40 * feinH[i] + 0.60 * grobH[i];
    feldH[i] = 0.40 * feinH[i] * maskeH[i] + 0.60 * grobAuf[i];
  }

  /* ---------- Die Farbe der Karte, aus demselben Feld ----------
     Gefärbt wurde bisher Kreis für Kreis: jede Fläche bekam ihre eigene Dichte
     als Ton, und heraus kam ein Mosaik. Die Höhenlinien dagegen kamen aus dem
     weiten Feld, das über die Kreisgrenzen hinweg verläuft. Berlin war deshalb
     ein kleiner Farbfleck in der Form seines Kreises, während sein Berg weit
     darüber hinausreichte — Farbe und Relief widersprachen einander.

     Jetzt kommt die Farbe aus dem weiten Feld selbst, also aus genau dem, das die
     Linien trägt. Sechzehn Bänder, und weil ein Achtel Reserve über und unter
     der Leiter liegt, fällt jede zweite Höhenlinie auf eine Farbgrenze.

     Gezeichnet wird das Feld in seiner eigenen, gröberen Auflösung und beim
     Hochrechnen bilinear geglättet: die Bandgrenze wird dadurch ein weicher
     Übergang von ein, zwei Bildpunkten, und die Höhenlinie liegt in seiner
     Mitte. Scharf gerastert sähe dieselbe Grenze treppig aus. */
  const fo = fBild.data;
  for (let i = 0; i < n3; i++) {
    const k = bandIdx(ausFeld(farbF[i]));
    const j = i << 2;
    fo[j] = HYPSO_R[k]; fo[j + 1] = HYPSO_G[k]; fo[j + 2] = HYPSO_B[k]; fo[j + 3] = 255;
  }
  hcF.setTransform(1, 0, 0, 1, 0, 0);
  hcF.globalCompositeOperation = 'source-over';
  hcF.putImageData(fBild, 0, 0);
  hcF.globalCompositeOperation = 'destination-in';   // nur, was auf der Karte liegt
  hcF.drawImage(hkA, 0, 0);
  hcF.globalCompositeOperation = 'source-over';
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(hkF, 0, 0, breite, hoehe);

  /* Schlagschatten. Das ist der Unterschied zwischen einer gewölbten Fläche
     und einem Gebirge: ein Berg wirft einen Schatten über das, was hinter ihm
     liegt. Gerechnet in einem einzigen Durchgang — das Licht kommt aus genau
     45 Grad von oben links, also laufen die Strahlen auf der Leinwand
     diagonal, und je Diagonale genügt ein mitgeführter Horizont:

         s = max(s − Abfall, Höhe)      und im Schatten liegt, was unter s ist.

     Der Abfall ist, wie viel Höhe der Strahl je Schritt verliert. Aus ihm
     folgt die Länge der Schatten, und damit, wie hoch das Gebirge wirkt. */
  const ABFALL = Math.SQRT2 * Math.tan(Math.PI * WURFSONNE / 180) / UEBERHOEHT;
  for (let k = 0; k < rW + rH - 1; k++) {
    let x = k < rW ? k : 0, y = k < rW ? 0 : k - rW + 1, s2 = -1;
    while (x < rW && y < rH) {
      const i = y * rW + x;
      s2 -= ABFALL;
      if (feldH[i] >= s2) { s2 = feldH[i]; schatten[i] = 0; }
      else schatten[i] = s2 - feldH[i];
      x++; y++;
    }
  }

  // Licht von oben links. Auf dem Bildschirm zeigt y nach unten, oben links
  // ist also die negative Richtung in beiden Achsen.
  const o = rBild.data;
  const hochL = Math.cos(Math.PI * SONNE / 180) * Math.SQRT1_2;
  const lx = -hochL, ly = -hochL, lz = Math.sin(Math.PI * SONNE / 180);
  for (let y = 0; y < rH; y++) {
    const zc = y * rW, zo = (y > 0 ? y - 1 : y) * rW, zu = (y < rH - 1 ? y + 1 : y) * rW;
    for (let x = 0; x < rW; x++) {
      const xm = x > 0 ? x - 1 : x, xp = x < rW - 1 ? x + 1 : x;
      const i = zc + x;
      const rx = (feldH[zc + xp] - feldH[zc + xm]) * 0.5;
      const ry = (feldH[zu + x] - feldH[zo + x]) * 0.5;
      const gx = rx * UEBERHOEHT, gy = ry * UEBERHOEHT;
      let I = (-gx * lx - gy * ly + lz) / Math.sqrt(gx * gx + gy * gy + 1) - lz;

      // Die Mulde. Was tiefer liegt als seine weite Umgebung, bekommt weniger
      // Himmel ab — dasselbe, was in einem Tal weniger Licht ankommen lässt.
      const mulde = grobAuf[i] - feldH[i];
      if (mulde > 0) I -= mulde * MULDE;
      // Und der Schlagschatten.
      if (schatten[i] > 0) I -= (schatten[i] < 0.05 ? schatten[i] / 0.05 : 1) * WURF;

      const i4 = i << 2;
      let a = I * STAERKE * RELIEF_ANTEIL;
      if (a > 0) { if (a > HELLMAX) a = HELLMAX; }
      else { if (a < -DUNKELMAX) a = -DUNKELMAX; }
      const g = 128 + a * 127;
      o[i4] = g; o[i4 + 1] = g; o[i4 + 2] = g; o[i4 + 3] = 255;
    }
  }
  // Die Schattierung als Grau im Modus overlay, damit die Farbe der Fläche
  // bleibt. Sie ist ein Verlauf und verträgt das Hochrechnen; die Linien
  // kommen danach als Pfade, in voller Auflösung.
  hcL.putImageData(rBild, 0, 0);
  hcL.globalCompositeOperation = 'destination-in';   // nur, was auf der Karte liegt
  hcL.drawImage(hkA, 0, 0);
  hcL.globalCompositeOperation = 'source-over';
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.globalCompositeOperation = MISCHUNG;
  ctx.drawImage(hkL, 0, 0, breite, hoehe);
  ctx.globalCompositeOperation = 'source-over';
  if (LINIE * RELIEF_ANTEIL > 0.02) hoehenLinien(s);
}

/* ---------- Beleuchtete Höhenlinien, nach Tanaka Kitiro (1950) ----------
   Eine gewöhnliche Höhenlinie ist überall gleich dunkel und sagt über die Form
   nur, wo gleiche Höhe liegt. Tanakas Linien werden **weiss, wo der Hang der
   Sonne zugewandt ist, und schwarz, wo er von ihr wegfällt**, und dick, wo der
   Hang voll im Licht oder voll im Schatten steht — sie tragen damit dieselbe
   Auskunft wie eine Schattierung, aber als Kante, und eine Kante sieht das
   Auge sehr viel deutlicher als einen Verlauf. Vor allem nehmen sie fast keine
   Fläche weg, und die Fläche ist hier schon vergeben: sie trägt die Farbe, und
   die Farbe sind die Daten.

   Die ersten Fassungen malten sie **ins Höhenfeld**, also in ein Raster von
   vierzig bis sechzig Prozent der Bildpunkte, und rechneten dieses Bild
   hinterher hoch. Das kann nicht scharf werden: eine Linie ist ein bis zwei
   Punkte breit, und zwei Punkte, um das Anderthalbfache gestreckt und weich
   gezeichnet, sind ein Schmier mit ungleichmässigem Rand. Genau das war das
   Zappeln.

   Jetzt werden sie **verfolgt statt gemalt**: Marching Squares über das weite
   Feld liefert die Linien als Strecken, und gezeichnet werden sie als Pfade
   auf der Leinwand selbst — mit deren voller Auflösung und deren Kantenglättung.
   Das Höhenfeld darf dafür ruhig grob sein: es ist über fünfzehn Punkte
   weichgezeichnet, und die Stützstellen einer Linie dürfen weiter
   auseinanderliegen als ein Bildpunkt, solange die Linie selbst scharf ist.

   Gerechnet aus dem weiten Feld, nicht aus dem gemischten: das enge hat an
   jeder Kreisgrenze eine Stufe, und auf einer Stufe lägen alle Niveaus
   übereinander — das gäbe einen Strich an jeder Grenze statt einer Höhenlinie.

   Gebündelt wird nach Beleuchtungsstärke: acht Stufen, hell und dunkel, also
   sechzehn Pfade statt Tausender einzelner Striche. */
const NSTUFE = 12;
const LINIENEIMER = Array.from({ length: 2 * NSTUFE }, () => []);
const LSCHRITT = 2;               // Gitterschritt der Verfolgung, in Feldpunkten

/* Die Buchhaltung der Verfolgung. Jede Kante des Verfolgungsgitters kann von
   einer Höhenlinie geschnitten werden, und jede Kante gehört zu genau zwei
   Zellen — daraus ergibt sich die Kette von selbst: notiere je Kante den
   Schnittpunkt und die ein bis zwei Kanten, mit denen sie in ihren Zellen
   verbunden ist, und laufe hinterher durch.

   Die Felder werden einmal angelegt und über alle Niveaus wiederbenutzt; ein
   Stempel je Niveau erspart das Leeren. */
let lnx = 0, lny = 0;
let kX = null, kY = null, kA = null, kB = null, kStempel = null, kBesucht = null;
let kListe = null, bahnX = null, bahnY = null, bahnF = null, bahnG = null;
let zellenJe = null;
// Der Stempel muss über Bilder hinweg fortlaufen, nicht bloss über die Niveaus
// eines Bildes: sonst trägt die Buchhaltung im zweiten Bild noch die Marken des
// ersten, hält jede Kante für schon gesetzt und findet keine einzige Linie.
let stempelZaehler = 0;
function linienFeld() {
  const nx = Math.floor((rW - 1) / LSCHRITT), ny = Math.floor((rH - 1) / LSCHRITT);
  if (nx === lnx && ny === lny && zellenJe && zellenJe.length === NIVEAUS) return;
  lnx = nx; lny = ny;
  const n = 2 * (nx + 1) * (ny + 1);
  kX = new Float32Array(n); kY = new Float32Array(n);
  kA = new Int32Array(n); kB = new Int32Array(n);
  kStempel = new Int32Array(n); kBesucht = new Int32Array(n);
  kListe = new Int32Array(n);
  const lang = Math.max(256, ((nx * ny) >> 2) + 64);
  bahnX = new Float32Array(lang); bahnY = new Float32Array(lang);
  bahnF = new Float32Array(lang); bahnG = new Float32Array(lang);
  zellenJe = Array.from({ length: NIVEAUS }, () => []);
}

/* Eine Linie in Läufe gleicher Beleuchtung zerlegen und in die Eimer legen.
   Gezeichnet wird erst am Ende, alle Läufe eines Eimers in einem Zug: sonst
   stünden bei hundert Linien und vierundzwanzig Stärken zweitausend einzelne
   Striche an, und jeder kostet für sich.

   Die Läufe überlappen sich um eine Stützstelle, damit zwischen zwei Stärken
   keine Lücke steht. Abgelegt wird je Lauf die Zahl der Punkte und dann die
   Punkte selbst. */
function bahnAblegen(m, geschlossen) {
  // Beleuchtung längs der Linie glätten: stützstellenweise gerechnet springt
  // sie um ein paar Prozent hin und her, und das ist genau das Zappeln.
  for (let d = 0; d < 2; d++) {
    let vor = bahnF[geschlossen ? m - 2 : 0];
    for (let i = 0; i < m; i++) {
      const nach = bahnF[i + 1 < m ? i + 1 : (geschlossen ? 1 : i)];
      const jetzt = bahnF[i];
      bahnF[i] = (vor + 2 * jetzt + nach) * 0.25;
      vor = jetzt;
    }
  }
  const lege = (e, von, bis) => {
    if (e < 0 || bis - von < 1) return;
    const p = LINIENEIMER[e];
    p.push(bis - von + 1);
    for (let i = von; i <= bis; i++) p.push(bahnX[i], bahnY[i]);
  };
  let lauf = -1, von = 0;
  for (let i = 0; i < m; i++) {
    const st = Math.min(1, Math.abs(bahnF[i]) * bahnG[i]);
    let k = (st * NSTUFE) | 0; if (k > NSTUFE - 1) k = NSTUFE - 1;
    const e = st < 0.03 ? -1 : (bahnF[i] > 0 ? k : NSTUFE + k);
    if (e !== lauf) { lege(lauf, von, i); lauf = e; von = i > 0 ? i - 1 : 0; }
  }
  lege(lauf, von, m - 1);
}

// Und am Ende: je Eimer ein Pfad, als weiche Kurve durch die Mittelpunkte der
// Stützstellen. Vierundzwanzig Züge für die ganze Karte.
function linienMalen(strichBreite) {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let e = 0; e < LINIENEIMER.length; e++) {
    const p = LINIENEIMER[e];
    if (!p.length) continue;
    const hell = e < NSTUFE, k = e - (hell ? 0 : NSTUFE);
    const st = (k + 0.5) / NSTUFE;
    ctx.beginPath();
    for (let q = 0; q < p.length;) {
      const anz = p[q]; q++;
      const erst = q;
      ctx.moveTo(p[erst], p[erst + 1]);
      for (let i = 1; i < anz - 1; i++) {
        const a = erst + 2 * i;
        ctx.quadraticCurveTo(p[a], p[a + 1], (p[a] + p[a + 2]) / 2, (p[a + 1] + p[a + 3]) / 2);
      }
      const letzt = erst + 2 * (anz - 1);
      ctx.lineTo(p[letzt], p[letzt + 1]);
      q += 2 * anz;
    }
    p.length = 0;
    ctx.lineWidth = (0.40 + 0.95 * st) * strichBreite;
    ctx.strokeStyle = hell ? '#fff' : '#000';
    ctx.globalAlpha = Math.min(1, LINIE * RELIEF_ANTEIL * st * (hell ? 1 : DUNKELLINIE));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function hoehenLinien(s) {
  linienFeld();
  const S = LSCHRITT, je = 1 / s, nx = lnx, ny = lny;
  const F = farbF, M = maskeH;   // dasselbe Feld, aus dem die Farbe kommt
  const strichBreite = Math.max(0.7, breite / 760);
  const lang = bahnX.length;
  for (const z of zellenJe) z.length = 0;

  // Erster Durchgang: welche Zelle schneidet welche Niveaus? Nur die Niveaus
  // zwischen kleinstem und grösstem Eckwert kommen in Frage, meist null bis
  // zwei von vierzig.
  for (let cy = 0; cy < ny; cy++) {
    const r0 = cy * S * rW, r1 = (cy * S + S) * rW;
    for (let cx = 0; cx < nx; cx++) {
      const x0 = cx * S, x1 = x0 + S;
      if (M[r0 + x0] < 0.85 || M[r0 + x1] < 0.85 || M[r1 + x1] < 0.85 || M[r1 + x0] < 0.85) continue;
      const a = F[r0 + x0], b = F[r0 + x1], c = F[r1 + x1], d = F[r1 + x0];
      let lo = a, hi = a;
      if (b < lo) lo = b; if (b > hi) hi = b;
      if (c < lo) lo = c; if (c > hi) hi = c;
      if (d < lo) lo = d; if (d > hi) hi = d;
      let n0 = Math.ceil(lo * NIVEAUS), n1 = Math.floor(hi * NIVEAUS);
      if (n0 < 1) n0 = 1; if (n1 > NIVEAUS - 1) n1 = NIVEAUS - 1;
      const zelle = cy * nx + cx;
      for (let n = n0; n <= n1; n++) zellenJe[n].push(zelle);
    }
  }

  const stamm = 2 * (nx + 1);
  for (let n = 1; n < NIVEAUS; n++) {
    const zellen = zellenJe[n];
    if (zellen.length < 2) continue;
    const t = n / NIVEAUS;
    const stempel = ++stempelZaehler;
    let nk = 0;

    // Zweiter Durchgang: Schnittpunkte eintragen und benachbarte Kanten
    // verbinden. Zwei Kanten sind benachbart, wenn dieselbe Zelle zwischen
    // ihnen liegt.
    const setze = (k, x, y) => {
      if (kStempel[k] !== stempel) { kStempel[k] = stempel; kX[k] = x; kY[k] = y; kA[k] = -1; kB[k] = -1; kBesucht[k] = 0; kListe[nk++] = k; }
    };
    const binde = (p, q) => { if (kA[p] < 0) kA[p] = q; else if (kB[p] < 0) kB[p] = q; };
    for (let z = 0; z < zellen.length; z++) {
      const zelle = zellen[z], cy = (zelle / nx) | 0, cx = zelle - cy * nx;
      const x0 = cx * S, x1 = x0 + S, r0 = cy * S * rW, r1 = (cy * S + S) * rW;
      const a = F[r0 + x0], b = F[r0 + x1], c = F[r1 + x1], d = F[r1 + x0];
      const A = a > t, B = b > t, C = c > t, D = d > t;
      const ka = (A ? 1 : 0) | (B ? 2 : 0) | (C ? 4 : 0) | (D ? 8 : 0);
      if (ka === 0 || ka === 15) continue;
      const px0 = x0 * je, py0 = cy * S * je, SS = S * je;
      const h0 = cy * stamm + 2 * cx, h2 = (cy + 1) * stamm + 2 * cx;
      const v3 = h0 + 1, v1 = cy * stamm + 2 * (cx + 1) + 1;
      if (A !== B) setze(h0, px0 + SS * (t - a) / (b - a), py0);
      if (B !== C) setze(v1, px0 + SS, py0 + SS * (t - b) / (c - b));
      if (D !== C) setze(h2, px0 + SS * (t - d) / (c - d), py0 + SS);
      if (A !== D) setze(v3, px0, py0 + SS * (t - a) / (d - a));
      switch (ka) {
        case 1: case 14: binde(v3, h0); binde(h0, v3); break;
        case 2: case 13: binde(h0, v1); binde(v1, h0); break;
        case 3: case 12: binde(v3, v1); binde(v1, v3); break;
        case 4: case 11: binde(v1, h2); binde(h2, v1); break;
        case 6: case 9:  binde(h0, h2); binde(h2, h0); break;
        case 7: case 8:  binde(h2, v3); binde(v3, h2); break;
        default:         binde(v3, h0); binde(h0, v3); binde(v1, h2); binde(h2, v1);
      }
    }

    // Dritter Durchgang: die Ketten ablaufen. Erst die offenen — eine Kante
    // mit nur einem Nachbarn ist ein Anfang —, dann die geschlossenen Ringe.
    for (let runde = 0; runde < 2; runde++) {
      for (let q = 0; q < nk; q++) {
        const start = kListe[q];
        if (kBesucht[start] === stempel) continue;
        if (runde === 0 && kB[start] >= 0) continue;
        let cur = start, vor = -1, m = 0;
        while (cur >= 0 && m < lang) {
          kBesucht[cur] = stempel;
          // Beleuchtung und die beiden Bremsen an dieser Stützstelle, aus dem
          // Gefälle des Feldes dort.
          let ix = (kX[cur] * s) | 0, iy = (kY[cur] * s) | 0;
          if (ix < 1) ix = 1; if (ix > rW - 2) ix = rW - 2;
          if (iy < 1) iy = 1; if (iy > rH - 2) iy = rH - 2;
          const gx = (F[iy * rW + ix + 1] - F[iy * rW + ix - 1]) * 0.5;
          const gy = (F[(iy + 1) * rW + ix] - F[(iy - 1) * rW + ix]) * 0.5;
          const ql = Math.sqrt(gx * gx + gy * gy);
          bahnX[m] = kX[cur]; bahnY[m] = kY[cur];
          bahnF[m] = ql > 1e-7 ? (gx + gy) / (ql * Math.SQRT2) : 0;
          // Über fast ebenem Land blenden die Linien ein, und wo zwei Niveaus
          // auf der Leinwand zusammenrücken, wieder aus.
          const abstand = ql > 1e-7 ? je / (ql * NIVEAUS) : 1e9;
          bahnG[m] = Math.min(1, ql / FLACHHANG)
            * (abstand > 4 ? 1 : Math.max(0, (abstand - 1.4) / 2.6));
          m++;
          const na = kA[cur], nb = kB[cur];
          const weiter = (na >= 0 && na !== vor && kBesucht[na] !== stempel) ? na
                       : (nb >= 0 && nb !== vor && kBesucht[nb] !== stempel) ? nb : -1;
          vor = cur; cur = weiter;
        }
        // Ein Ring schliesst sich: die letzte Stützstelle ist mit der ersten
        // verbunden, also noch einmal dorthin.
        const zu = m > 2 && m < lang && (kA[vor] === start || kB[vor] === start);
        if (zu) { bahnX[m] = bahnX[0]; bahnY[m] = bahnY[0]; bahnF[m] = bahnF[0]; bahnG[m] = bahnG[0]; m++; }
        if (m >= 2) bahnAblegen(m, zu);
      }
    }
  }
  linienMalen(strichBreite);
}

function zeichne() {
  const [a, b, u] = bildBei(jahr);
  setzePunkte(a, b, u);
  const { w, deck, rate } = werteBei(a, b, u);
  ctx.clearRect(0, 0, breite, hoehe);
  ctx.lineJoin = 'round';

  /* Ein Pfad aus allen Umrissen. Weil die Kreise die Fläche lückenlos teilen,
     ist die Vereinigung ihrer Umrisse zugleich die Silhouette der Karte, und
     seine Teilpfade sind zugleich alle Kreisgrenzen. Schatten, Kante, Netz
     und Relief hängen alle daran. */
  const TIEFE = Math.max(2.5, breite / 130);
  const sil = new Path2D();
  hoehen(w, deck);
  const roh = hoehenSkala();
  RELIEF_ANTEIL = reliefAnteil(roh[0], roh[1]);
  [skalaVon, skalaBis] = skalaBreit(roh[0], roh[1]);
  for (let g = 0; g < NK; g++) {
    if (!(deck[g] > 0.5)) continue;
    for (const r of GEBIETE[g]) {
      sil.moveTo(px[r[0]] * mass + verX, py[r[0]] * mass + verY);
      for (let i = 1; i < r.length; i++) sil.lineTo(px[r[i]] * mass + verX, py[r[i]] * mass + verY);
      sil.closePath();
    }
  }
  ctx.save();
  ctx.translate(0, TIEFE * 1.9); ctx.filter = 'blur(' + (TIEFE * 1.2).toFixed(1) + 'px)';
  ctx.fillStyle = SCHATTEN; ctx.fill(sil);
  ctx.restore();
  ctx.save();
  ctx.translate(0, TIEFE);
  ctx.fillStyle = KANTE3D; ctx.fill(sil);
  ctx.restore();

  /* Die Grundfläche, in **einer** Farbe: der Mitte der Leiter, also dem Ton,
     den ein Kreis von durchschnittlicher Dichte hat.

     Sie ist nicht die Farbe der Karte — die kommt gleich aus dem Höhenfeld und
     legt sich darüber. Sie ist nur die scharfe Kante: das Feld hat seine
     eigene, gröbere Auflösung, und sein Rand ist beim Hochrechnen ein, zwei
     Bildpunkte weich. Darunter muss etwas liegen, sonst franst die Küste aus.

     Eine Farbe und nicht vierhundert, weil das Durchscheinende sonst als
     Flecken sichtbar wird — im Kartogramm, wo das Feld einfarbig ist, lagen an
     jeder schmalen Stelle Reste der alten Kreisfärbung. */
  ctx.fillStyle = HYPSO[bandIdx((0 - skalaVon) / (skalaBis - skalaVon))];
  ctx.fill(sil, 'evenodd');

  /* Keine Grenzen mehr, weder um die Kreise noch um die Länder. Eine
     Geländekarte hat keine; sie hat Farbe, Hang und Höhenlinie, und die
     zeigen dieselbe Grenze dort, wo sie etwas bedeutet — wo sich die Dichte
     ändert. Wo zwei Nachbarn gleich dicht wohnen, war der Strich ohnehin nur
     Verwaltung. */

  reliefUeber(sil, deck);
  stadtRand(deck);

  beschrifte(deck);
  schreibe(a, b, u, w, deck);
  notizen();
}

const nf = new Intl.NumberFormat('en-GB');
function schreibe(a, b, u, w, deck) {
  const zwischen = u > 0.001 && u < 0.999;
  let summe = 0; for (let k = 0; k < NK; k++) summe += w[k] * deck[k];
  document.getElementById('jahrZahl').textContent = zwischen ? Math.round(jahr) : D.B[u < 0.5 ? a : b].jahr;
  document.getElementById('jahrBev').textContent = (summe / 1e6).toFixed(1) + ' million people';
  legText();
  document.getElementById('zeit').value = Math.round(spiel * 1000);
}

/* Ein feiner dunkler Strich um jede kreisfreie Stadt, nach dem Relief
   gezeichnet, damit er darüber liegt und nicht von der Schattierung
   weggewaschen wird. Dunkel, nicht hell: eine Stadt ist auf dieser Karte ein
   Berg, und ein dunkler Umriss liest sich als sein Fuss. */
function stadtRand(deck) {
  ctx.beginPath();
  for (const g of STADTRAND) {
    if (!(deck[g] > 0.5)) continue;
    for (const r of GEBIETE[g]) {
      ctx.moveTo(px[r[0]] * mass + verX, py[r[0]] * mass + verY);
      for (let i = 1; i < r.length; i++) ctx.lineTo(px[r[i]] * mass + verX, py[r[i]] * mass + verY);
      ctx.closePath();
    }
  }
  ctx.strokeStyle = STADTSTRICH;
  ctx.lineWidth = Math.max(0.5, Math.min(1.1, breite / 620));
  ctx.lineJoin = 'round';
  ctx.stroke();
}

/* ---------- Städtenamen ----------
   Die grössten Städte tragen ihren Namen, und die Schrift wächst mit dem
   Fleck: die Schrifthöhe folgt der Wurzel aus der gezeichneten
   Fläche, also wächst sie wie die Stadt, nicht wie ihre Einwohnerzahl. 1871
   ist Dortmund ein Punkt und bleibt namenlos; irgendwann wird der Fleck gross
   genug, und der Name erscheint von selbst.

   Gezeichnet wird nur, was hineinpasst und nichts anderes verdeckt: zu kleine
   Schrift fällt weg, ein Name breiter als sein Fleck fällt weg, und wer sich
   mit einem schon gesetzten Namen überschneidet, fällt auch weg — die
   grösseren zuerst, damit im Ruhrgebiet nicht die kleinste Stadt gewinnt. */
const STADT = ${JSON.stringify(staedte.map(k => [k.i, k.kurz]))};
/* ---------- Der Umriss der Städte ----------
   Die Kreisgrenzen sind weg, und für einen Landkreis ist das richtig: er wird
   im Kartogramm kaum verzerrt, also sagt sein Umriss nichts, was die Farbe
   nicht schon sagt. Eine kreisfreie Stadt ist der andere Fall. Sie ist auf dem
   Boden winzig und in der Karte gross — Berlin geht vom Viertelprozent der
   Fläche auf viereinhalb —, und ohne Umriss verschwimmt sie mit dem Umland,
   dessen Farbe sie ohnehin mitgeprägt hat. Der Umriss sagt hier also etwas,
   das sonst niemand sagt: bis hierhin reicht die Stadt.

   Nur die hundertsieben kreisfreien Städte und Stadtkreise, nicht die
   Landkreise. */
const STADTRAND = ${JSON.stringify(jeKreis.map((k, i) => [i, k.bez])
  .filter(([, bez]) => STADTKREISE.has(bez)).map(([i]) => i))};
const MINSCHRIFT = 7;       // kleinste Schrift; auf einem Telefon knapp, aber lesbar
function beschrifte(deck) {
  const liste = [];
  for (const [g, name] of STADT) {
    if (!(deck[g] > 0.5)) continue;
    let bestA = 0, mx = 0, my = 0, bb = 0, bh = 0;
    for (const r of GEBIETE[g]) {
      let A2 = 0, sx = 0, sy = 0, links = Infinity, rechts = -Infinity, oben = Infinity, unten = -Infinity;
      for (let i = 0, n = r.length; i < n; i++) {
        const a = r[i], b = r[(i + 1) % n];
        const xa = px[a] * mass + verX, ya = py[a] * mass + verY;
        const xb = px[b] * mass + verX, yb = py[b] * mass + verY;
        const f = xa * yb - xb * ya;
        A2 += f; sx += (xa + xb) * f; sy += (ya + yb) * f;
        if (xa < links) links = xa; if (xa > rechts) rechts = xa;
        if (ya < oben) oben = ya; if (ya > unten) unten = ya;
      }
      const A = Math.abs(A2 / 2);
      if (A > bestA) { bestA = A; mx = sx / (3 * A2); my = sy / (3 * A2); bb = rechts - links; bh = unten - oben; }
    }
    /* Nicht auf den Gipfel. Der Berg eines Kreises sitzt in seiner Mitte —
       das weite Weichzeichnen macht aus der Fläche eine Kuppe, und ihr höchster
       Punkt ist der Schwerpunkt. Genau dort stand bisher der Name, und bei
       Berlin und Hamburg deckte er zu, was man sehen soll.

       Also rückt der Name nach unten, um die Hälfte des Radius, den ein Kreis
       dieser Fläche hätte. Bei einem grossen Fleck sind das viele Pixel und
       der Gipfel wird frei; bei einem kleinen sind es wenige, und der Name
       bleibt, wo er hingehört. Nach unten, weil das Licht von oben links
       kommt: der Südhang liegt im Schatten, dort stört die Schrift am
       wenigsten. */
    if (bestA > 0) {
      const versatz = Math.sqrt(bestA / Math.PI) * 0.5;
      liste.push({ name, A: bestA, mx, my: my + versatz, bb, bh });
    }
  }
  liste.sort((a, b) => b.A - a.A);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';

  // Grösse: aus der Fläche, aber nie unter MINSCHRIFT und nie grösser, als der
  // Fleck trägt. Alle Namen stehen von Anfang an da — 1871 sind die Flecken
  // winzig, und ein Name, der erst später erscheint, ist ein Sprung im Bild.
  for (const s of liste) {
    ctx.font = '600 10px system-ui,-apple-system,sans-serif';
    s.je10 = ctx.measureText(s.name).width / 10;
    // Der Deckel hängt an der Kartenbreite, nicht an einer festen Zahl: Berlin
    // und Hamburg liefen sonst in jeder Grösse gegen dieselben dreissig Pixel
    // und standen als Überschrift über der Karte statt als Beschriftung darin.
    s.hoch = Math.max(MINSCHRIFT,
      Math.min(Math.sqrt(s.A) * 0.40, breite / 38, s.bb * 1.3 / s.je10, s.bh * 0.9));
    s.br = s.je10 * s.hoch;
    s.x = s.mx; s.y = s.my;
  }
  // Auseinanderschieben statt weglassen: wo zwei Namen übereinanderlägen,
  // weichen beide entlang der kleineren Überlappung aus, und eine schwache
  // Feder zieht jeden zu seinem Fleck zurück. Nach ein paar Runden steht ein
  // Kompromiss, der sich von Bild zu Bild ruhig verändert — kein Flackern.
  for (let runde = 0; runde < 40; runde++) {
    for (let i = 0; i < liste.length; i++) for (let j = i + 1; j < liste.length; j++) {
      const a = liste[i], b = liste[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      const ux = (a.br + b.br) / 2 + 4 - Math.abs(dx);
      const uy = (a.hoch + b.hoch) / 2 + 3 - Math.abs(dy);
      if (ux <= 0 || uy <= 0) continue;
      if (uy / (a.hoch + b.hoch) < ux / (a.br + b.br)) {
        const v = (dy >= 0 ? 1 : -1) * uy * 0.3; a.y -= v; b.y += v;
      } else {
        const v = (dx >= 0 ? 1 : -1) * ux * 0.3; a.x -= v; b.x += v;
      }
    }
    for (const s of liste) { s.x += (s.mx - s.x) * 0.08; s.y += (s.my - s.y) * 0.08; }
  }

  for (const s of liste) {
    ctx.font = '600 ' + s.hoch.toFixed(1) + 'px system-ui,-apple-system,sans-serif';
    // Weit ausgewichen? Dann ein Strich zurück zum Fleck, sonst weiss niemand,
    // wem der Name gehört.
    if (Math.hypot(s.x - s.mx, s.y - s.my) > s.hoch * 0.9) {
      ctx.beginPath(); ctx.moveTo(s.mx, s.my); ctx.lineTo(s.x, s.y);
      ctx.strokeStyle = STRICH; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(s.mx, s.my); ctx.lineTo(s.x, s.y);
      ctx.strokeStyle = INK; ctx.lineWidth = 0.7; ctx.globalAlpha = 0.45; ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.lineWidth = Math.max(2, s.hoch * 0.2); ctx.strokeStyle = STRICH;
    ctx.strokeText(s.name, s.x, s.y);
    ctx.fillStyle = INK; ctx.fillText(s.name, s.x, s.y);
  }
}

/* ---------- Der Faden ----------
   Was gerade geschieht, steht ausgeschrieben über der Karte. Was davor geschah,
   steht darunter als blosse Überschrift: kommt eine neue Notiz, setzt sie sich
   obenauf und schiebt die vorigen eine Zeile nach unten, blasser mit jedem
   Schritt. Der Faden hält die letzten ${FADEN_TIEFE}.

   Geschoben wird nicht Zeile für Zeile, sondern in einem Stück: der ganze
   Faden springt ohne Übergang um eine Zeilenhöhe nach oben und läuft dann
   nach unten zurück. Weil die neue Überschrift oben schon steht, sieht das
   aus, als drücke sie die anderen weg — und kostet eine einzige Bewegung
   statt ${FADEN_TIEFE}.

   Welche Notiz gilt, hängt nur an der Uhr, also gilt sie in jeder Form. Am
   Regler kann die Zeit auch zurücklaufen; dann wird der Faden neu aufgebaut
   statt fortgeschrieben. */
const NOTIZ = ${JSON.stringify(NOTIZEN.map(n => [n.von, n.bis, n.kopf, n.kurz, n.mehr]))};
const FADEN = document.getElementById('faden');
const TIEFE_FADEN = ${FADEN_TIEFE};
const FADEN_DECK = ${JSON.stringify(FADEN_DECK)};
let notizJetzt = -2, notizMarke = 0;
function fadenBaue(i, geschoben) {
  // Auf einem Telefon bricht jede Überschrift auf zwei Zeilen um; dort hält
  // der Faden weniger, sonst wüchse er über die halbe Karte.
  const tief = innerWidth < 540 ? 3 : TIEFE_FADEN;
  const gab = FADEN.firstElementChild !== null;
  FADEN.textContent = '';
  for (let n = i - 1; n >= 0 && i - n <= tief; n--) {
    const el = document.createElement('b');
    el.textContent = NOTIZ[n][2];
    el.style.opacity = FADEN_DECK[i - n - 1];
    FADEN.appendChild(el);
  }
  // Um wie viel die vorigen nach unten rücken: um die Höhe der neuen Zeile
  // samt Lücke. Gemessen wird sie, nachdem sie steht — eine Überschrift kann
  // eine Zeile brauchen oder zwei.
  const neu = FADEN.firstElementChild;
  const zeile = neu ? neu.offsetHeight + 3 : 0;
  if (!geschoben || !gab || !zeile) { FADEN.style.transition = 'none'; FADEN.style.transform = 'none'; return; }
  FADEN.style.transition = 'none';
  FADEN.style.transform = 'translateY(-' + zeile + 'px)';
  requestAnimationFrame(() => {
    FADEN.style.transition = 'transform .45s cubic-bezier(.22,.61,.36,1)';
    FADEN.style.transform = 'translateY(0)';
  });
}
function notizen() {
  let i = -1;
  for (let n = 0; n < NOTIZ.length; n++) if (jahr >= NOTIZ[n][0] && jahr < NOTIZ[n][1]) { i = n; break; }
  if (i === notizJetzt) return;
  const geschoben = i === notizJetzt + 1;
  notizJetzt = i;
  // Die laufende Notiz steht ausgeschrieben; die vorigen stehen als blosse
  // Überschriften darunter und rücken mit jeder neuen nach unten.
  const el = document.getElementById('jetzt'), marke = ++notizMarke;
  el.style.opacity = 0;
  setTimeout(() => {
    if (marke !== notizMarke) return;
    if (i < 0) { el.textContent = ''; return; }
    el.innerHTML = '<b>' + NOTIZ[i][2] + '</b>' + NOTIZ[i][3] + ' ' + NOTIZ[i][4];
    el.style.opacity = 1;
  }, 260);
  fadenBaue(i, geschoben);
}

/* ---------- Legende ---------- */
// Ein Satz zur eingestellten Form: das Volumen ist immer die Bevölkerung, und
// wie es sich auf Fläche und Höhe verteilt, steht am Umschalter.
// Ein Wort zur eingestellten Form, nicht mehr. Was sie bedeutet, steht am
// Knopf darunter; die Leiter muss es nicht noch einmal erklären.
// formZiel ist der Index in FORMEN: 0 Landkarte, 1 halb, 2 volles Kartogramm.
function formWort() {
  return formZiel === 0 ? 'true shape' : formZiel === 2 ? 'full cartogram' : 'half distortion';
}
function legende() {
  document.getElementById('rampe').style.background =
    'linear-gradient(90deg,' + HYPSO.join(',') + ')';
  legText();
}
// Was unter der Leiter steht. Die Zahlen an den Enden sind Vielfache der
// mittleren Dichte des Bildes, also dessen, was ein Kreis an Höhe hätte, wenn
// alle gleich dicht wohnten.
function legText() {
  const [a, b, u] = bildBei(jahr);
  const zwischen = u > 0.001 && u < 0.999;
  // Die Zahlen an den Enden der Leiter stehen je Bild neu: beim Überblenden von
  // einer Form zur anderen wandert die Spanne mit.
  const [von, bis] = skalaBreit(...hoehenSkala());
  const zeig = x => (x >= 10 ? x.toFixed(0) : x >= 1 ? x.toFixed(1) : x.toFixed(2));
  document.getElementById('legLinks').textContent = '×' + zeig(Math.exp(von));
  document.getElementById('legRechts').textContent = '×' + zeig(Math.exp(bis));
  // Eine Zeile: was die Zahlen an der Leiter sind, welche Form eingestellt ist,
  // und welcher Stichtag gilt. Der Rest steht in der Methodik, nicht hier.
  document.getElementById('legText').textContent =
    '× the average density · ' + formWort() + ' · '
    + (zwischen ? D.B[a].jahr + ' → ' + D.B[b].jahr
                : D.B[u < 0.5 ? a : b].stichtage.join(', '));
}

/* ---------- Tippen ---------- */
function imGebiet(g, x, y) {
  let drin = false;
  for (const r of GEBIETE[g]) {
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const xi = px[r[i]] * mass + verX, yi = py[r[i]] * mass + verY;
      const xj = px[r[j]] * mass + verX, yj = py[r[j]] * mass + verY;
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) drin = !drin;
    }
  }
  return drin;
}
const tip = document.getElementById('tip');
function zeigeTip(x, y) {
  const [a, b, u] = bildBei(jahr);
  const { w, deck, rate } = werteBei(a, b, u);
  let treffer = -1;
  for (let g = 0; g < NK; g++) if (deck[g] > 0.001 && imGebiet(g, x, y)) { treffer = g; break; }
  if (treffer < 0) { tip.style.opacity = 0; letzterTip = -1; return; }
  letzterTip = treffer;
  const k = D.k[treffer], v = w[treffer];
  const abschnitt = rateIm(a, treffer);
  const f = D.B[u < 0.5 ? a : b];
  const anteil = ANTEIL[(u < 0.5 ? a : b) * NK + treffer];
  const methode = D.mj[(u < 0.5 ? a : b) * NK + treffer];
  const zwischen = u > 0.001 && u < 0.999;
  tip.innerHTML = '<b>' + k[1] + '</b><dl>'
    + '<dt>' + (D.L[k[3]] || '') + '</dt><dd>' + k[2] + '</dd>'
    + '<dt>People</dt><dd>' + nf.format(Math.round(v)) + '</dd>'
    + (k[4] ? '<dt>Per km²</dt><dd>' + nf.format(Math.round(v / k[4])) + '</dd>' : '')
    + (formZiel < 2 && HOCH[treffer] > 0
      ? '<dt>Stands</dt><dd>' + HOCH[treffer].toFixed(1) + '× average</dd>' : '')
    + (abschnitt === null ? ''
      : '<dt>' + D.B[a].jahr + '→' + D.B[b].jahr + '</dt><dd>'
        + (abschnitt >= 0 ? '+' : '−') + Math.abs(abschnitt).toFixed(2) + ' %/yr</dd>')
    + '</dl>'
    + (zwischen ? '<span class="warn">Interpolated between ' + D.B[a].jahr + ' and ' + D.B[b].jahr + '.</span>'
      : '<span class="warn">' + f.stichtage.join(', ') + ' · method ' + (methode === '-' ? '–' : methode)
        + (anteil ? ', ' + anteil + ' % interpolated' : '') + '</span>');
  tip.style.opacity = 1;
  // Der Zettel liegt jetzt im selben Kasten wie die Leinwand, also sind seine
  // Koordinaten dieselben wie die des Zeigers — der alte Versatz um den Rahmen
  // fällt weg.
  tip.style.left = Math.max(0, Math.min(breite - 224, x - 100)) + 'px';
  tip.style.top = Math.max(2, y - tip.offsetHeight - 14) + 'px';
}
cv.addEventListener('pointerdown', e => {
  const r = cv.getBoundingClientRect();
  zeigeTip(e.clientX - r.left, e.clientY - r.top);
});
cv.addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse') return;
  const r = cv.getBoundingClientRect();
  zeigeTip(e.clientX - r.left, e.clientY - r.top);
});
cv.addEventListener('pointerleave', () => { tip.style.opacity = 0; });

/* ---------- Ablauf ---------- */
// Millisekunden für die ganze Zeitachse. Langsam genug, dass jede Notiz zu
// lesen ist — zusammen mit der Untergrenze je Abschnitt (siehe D.takt).
const DAUER = ${SPIELZEIT * 1000};
let zuletzt = 0;
function schlag(t) {
  if (laeuft) {
    if (zuletzt) { dtSek = Math.max(0.001, (t - zuletzt) / 1000); setzeZeit(spiel + (t - zuletzt) / DAUER); }
    zuletzt = t;
    if (spiel >= 1) halte();
    zeichne();
  }
  requestAnimationFrame(schlag);
}
function starte() {
  if (spiel >= 1 - 1e-9) setzeZeit(0);
  laeuft = true; zuletzt = 0; document.getElementById('spiel').textContent = '❚❚';
}
function halte() { laeuft = false; document.getElementById('spiel').textContent = '▶'; }
document.getElementById('spiel').onclick = () => laeuft ? halte() : starte();
document.getElementById('zeit').addEventListener('input', e => {
  halte(); setzeZeit(e.target.value / 1000); reliefFrisch(); zeichne();
});
/* ---------- Umschalter zwischen den Formen ----------
   Nicht hart umschalten: die Karte läuft in einer halben Sekunde von der
   einen Form in die andere. Wer sieht, wie Berlin schrumpft und dafür
   aufsteigt, versteht den Tausch ohne Beschriftung. Der Kasten richtet sich
   dabei schon nach dem Ziel — sonst würde die Leinwand während der Bewegung
   vierzigmal neu angelegt. */
const FORMKNOPF = [...document.querySelectorAll('#formen button')];
const MORPH = 600;
let morphVon = 1, morphAuf = 1, morphEnde = 0;
function morphSchritt(t) {
  const rest = morphEnde - t;
  const u = rest <= 0 ? 1 : 1 - rest / MORPH;
  FORM = morphVon + (morphAuf - morphVon) * glatt(Math.max(0, Math.min(1, u)));
  tangenteFuer = -1;
  masse(); reliefFrisch();
  if (!laeuft) zeichne();
  if (rest > 0) requestAnimationFrame(morphSchritt);
  else { FORM = morphAuf; tangenteFuer = -1; masse(); reliefFrisch(); zeichne(); }
}
for (const b of FORMKNOPF) b.onclick = () => {
  const z = FORMEN.indexOf(Number(b.dataset.form));
  if (z < 0 || z === formZiel) return;
  formZiel = z;
  for (const o of FORMKNOPF) o.setAttribute('aria-pressed', String(o === b));
  morphVon = FORM; morphAuf = FORMEN[z]; morphEnde = performance.now() + MORPH;
  tip.style.opacity = 0; letzterTip = -1;
  legende();
  requestAnimationFrame(morphSchritt);
};
addEventListener('resize', () => { masse(); reliefFrisch(); zeichne(); });

// Markierungen für die Zählungen auf der Zeitachse
function marken() {
  const VOLL = Math.max(...reihe.BEV.map(b => b.filter(v => v > 0).length));
  // Die Marken sitzen dort, wo die Zählungen im Ablauf liegen — der Regler
  // misst Spielzeit, nicht Jahre.
  document.getElementById('marken').innerHTML = D.B.map((b, i) =>
    '<i class="' + (reihe.BEV[i].filter(v => v > 0).length >= VOLL ? 'voll' : '') + '" style="left:' +
    (TAKTKUM[i] * 100).toFixed(2) + '%" title="' + b.jahr + '"></i>').join('');
}

farbenHolen(); masse(); marken(); legende(); zeichne();
requestAnimationFrame(schlag);
setTimeout(starte, 700);
</script>
</body></html>
`);
