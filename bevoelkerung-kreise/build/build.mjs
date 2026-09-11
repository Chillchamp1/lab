// Erzeugt die fertige, in sich geschlossene index.html.
// Aufruf: node build.mjs > ../index.html

import { ladeKreise } from './laden.mjs';
import { baueKnotenmodell, vereinfache, beschraenke } from './topologie.mjs';
import { leseLang, baueBilder } from './daten.mjs';
import { rechneZeitreihe } from './zeitreihe.mjs';
import { baueNutzlast } from './nutzlast.mjs';
import { ENTPACKER } from './code.mjs';
import { kreisStammdaten } from './stammdaten.mjs';
import { baueNadeln } from './nadeln.mjs';
import { ringVorzeichen, gefalteteRinge } from './geometrie.mjs';

const log = s => process.stderr.write(s + '\n');
const KNOTEN = Number(process.env.KNOTEN ?? 9000);
const GITTER = Number(process.env.GITTER ?? 1600);
const NETZ_KM = Number(process.env.NETZ_KM ?? 30);
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

// ---------------------------------------------------------------------------
// Das Gitternetz.
//
// Ein Kartogramm sagt, wie viele Menschen wo wohnen, und verschweigt dabei,
// wie stark es dafür ziehen musste. Genau das ist aber die interessante Zahl:
// die Dichte auf dem Boden. Deshalb schwimmt ein regelmässiges Gitter in der
// Strömung mit — Quadrate von vierzig mal vierzig Kilometern echter Fläche,
// verankert am Ursprung der Projektion. Sie gehören zu keinem Kreis, zählen
// bei keiner Fläche mit und sind bei der Verzerrung nur Treibgut; gezeichnet
// ergeben sie das Netz über der Karte. Wo seine Maschen gross sind, wohnen
// viele Menschen auf wenig Land, wo sie klein sind, wenige auf viel.
//
// Verankert heisst: die Linien liegen auf Vielfachen von vierzig Kilometern,
// nicht auf dem Rand der Karte. Ein Netz, das sich dem Ausschnitt anpasst,
// hätte Maschen verschiedener Grösse, und dann hiesse eine grosse Masche
// nichts mehr.
function baueNetz(gebiete, X, Y, weite) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const g of gebiete) for (const r of g) for (const n of r) {
    if (X[n] < minX) minX = X[n]; if (X[n] > maxX) maxX = X[n];
    if (Y[n] < minY) minY = Y[n]; if (Y[n] > maxY) maxY = Y[n];
  }
  const i0 = Math.floor(minX / weite), i1 = Math.ceil(maxX / weite);
  const j0 = Math.floor(minY / weite), j1 = Math.ceil(maxY / weite);
  const nx = [], ny = [];
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { nx.push(i * weite); ny.push(j * weite); }
  return { sp: i1 - i0 + 1, ze: j1 - j0 + 1, X: nx, Y: ny };
}
const netz = baueNetz(geo.gebiete, geo.X, geo.Y, NETZ_KM * 1000);
const netzInfo = { n0: geo.X.length, sp: netz.sp, ze: netz.ze, km: NETZ_KM };
const NETZX = Float64Array.from([...geo.X, ...netz.X]);
const NETZY = Float64Array.from([...geo.Y, ...netz.Y]);
log(`  Gitternetz ${netz.sp} × ${netz.ze} Maschen zu ${NETZ_KM} km, ${netz.X.length} Knoten mehr`);

log('Zeitreihe …');
const reihen = [];
if (kommtSpaet.length) {
  log(`  ohne ${spaeteNamen.join(', ')}`);
  reihen.push({ id: 'kern', name: 'without ' + spaeteNamen.join(' and '), bilder: bilderOhne,
    zeitreihe: rechneZeitreihe({ gebiete: geo.gebiete, X: NETZX, Y: NETZY, attr: modell.attr,
      bilder: bilderOhne, groesste, gitter: GITTER, cache: 'zeitreihe-kern' + CACHE + '.json', log }) });
}
log('  mit allen Kreisen');
reihen.push({ id: 'alle', name: kommtSpaet.length ? 'with ' + spaeteNamen.join(' and ') : 'all counties',
  bilder, zeitreihe: rechneZeitreihe({ gebiete: geo.gebiete, X: NETZX, Y: NETZY, attr: modell.attr,
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
        BX[i] = NETZX[i] + a * (z.X[i] - NETZX[i]);
        BY[i] = NETZY[i] + a * (z.Y[i] - NETZY[i]);
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
  gebiete: geo.gebiete, attr: modell.attr, X: NETZX, Y: NETZY,
  reihen, bilder, kreisInfo: stamm, netz: netzInfo, log,
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
  R: nutz.reihen, B: nutz.bilder, gr: nutz.grenzen, takt: null, netz: nutz.netz,
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

// Das Nadelrelief zeigt immer das ganze Land — es rechnet aus der
// Gemeindedatei, nicht aus der Kreistabelle. Im Pilotgebiet bleibt es deshalb
// weg, sonst stünde neben der Karte zweier Länder ein Relief von Deutschland.
log('Nadeln …');
const nadeln = ganzesLand ? baueNadeln({ log: t => log('  ' + t) }) : null;
// Farbskala des Reliefs: gleichmässige Schritte in OKLab von einem Indigo, das
// kaum vom Boden absteht, bis zu hellem Gold. Perzeptuell gleichmässig heisst,
// dass gleiche Schritte in der Zahl gleich grosse Schritte im Eindruck sind —
// bei einem Relief trägt die Helligkeit die Höhe, und ein Regenbogen täte das
// nicht. Warm und hell oben auf dunklem Grund: so treten die Türme hervor,
// noch bevor die Beleuchtung anfängt zu wirken.
const NADELTON = ['#0c0a1d','#240943','#41075a','#620966','#831369','#a12566','#bc3c60',
  '#d0585b','#de775d','#e7966a','#ebb483','#efd1a6','#f5ebce'];
// Und dieselbe Leiter für helles Papier: von einem Creme, das kaum vom Boden
// absteht, über Gold, Orange und Rot ins tiefe Violett. Nicht die umgedrehte
// Nachtleiter — die hätte in der Mitte ein lautes Orange, und auf hellem Grund
// stünde damit das halbe Land in Flammen. Diese hier bleibt unten blass.
const NADELTON_HELL = ['#fbf5df','#f6dfb6','#f7c68f','#f7aa71','#f48c60','#ea715e','#d85965',
  '#c0486d','#a33d71','#83376f','#633465','#452f52','#2d2838'];
// Der Deckel einer Nadel bekommt dieselbe Farbe, nur heller: das Licht steht
// hoch (60° über dem Horizont) und aus Südwesten, also ist die waagerechte
// Fläche oben die hellste am ganzen Körper. Mehr Beleuchtung braucht ein Feld
// aus lauter gleich ausgerichteten Säulen nicht — die Südseiten sähen ohnehin
// alle gleich aus. Gerechnet wird das auf der Seite, weil es davon abhängt,
// ob die Leiter gerade auf hellem oder dunklem Grund steht.
const ZELLFLAECHE = nadeln ? (nadeln.daten.zelle ** 2 * nadeln.daten.reihe / 1e6) : 0;
const mitRelief = !!nadeln;
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
:root{
  --plane:#f9f9f7; --surface:#fcfcfb; --ink:#0b0b0b; --ink2:#52514e; --muted:#898781;
  --line:#e1e0d9; --axis:#c3c2b7; --ring:rgba(11,11,11,.10);
  --leer:#e6e5e0;
}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){
  --plane:#0d0d0d; --surface:#1a1a19; --ink:#fff; --ink2:#c3c2b7; --muted:#898781;
  --line:#2c2c2a; --axis:#383835; --ring:rgba(255,255,255,.10);
  --leer:#262624;
}}
*{box-sizing:border-box}
html,body{margin:0}
body{background:var(--plane);color:var(--ink);
  font-family:system-ui,-apple-system,"Segoe UI",sans-serif;font-size:15px;line-height:1.5;
  -webkit-text-size-adjust:100%}
.wrap{max-width:560px;margin:0 auto;padding:10px 12px 40px}
h1{font-size:24px;line-height:1.2;margin:0 0 6px;letter-spacing:-.01em}
.unter{color:var(--ink2);margin:0 0 18px;font-size:15px}
.buehne{position:relative;background:var(--surface);border:1px solid var(--ring);border-radius:12px;
  padding:6px;margin:0 0 10px}
h1{margin-top:28px}
canvas{display:block;width:100%;height:auto;touch-action:manipulation}
canvas[hidden]{display:none}
.schild{display:flex;flex-wrap:wrap;align-items:baseline;gap:2px 8px;padding:2px 4px 6px}
.schild>b{font-size:28px;font-weight:650;letter-spacing:-.02em;line-height:1.05}
.schild>span{color:var(--ink2);font-size:12.5px}
.kopf{color:var(--muted);font-size:11.5px;margin:6px 2px 10px;min-height:1.35em}
.regler{display:flex;align-items:center;gap:10px;margin-bottom:6px}
button{font:inherit;color:var(--ink);background:var(--surface);border:1px solid var(--axis);
  border-radius:8px;padding:7px 12px;cursor:pointer}
button:hover{border-color:var(--muted)}
#spiel{width:44px;flex:0 0 44px;font-variant-numeric:tabular-nums}
.bahn{position:relative;flex:1}
input[type=range]{width:100%;margin:0;accent-color:#2a78d6}
.marken{position:relative;height:12px;margin-top:2px}
.marken i{position:absolute;top:0;width:1px;height:5px;background:var(--axis)}
.marken i.voll{height:8px;background:var(--muted)}
.modi{display:flex;gap:6px;margin:14px 0 10px;flex-wrap:wrap}
.modi button{flex:1;min-width:96px;padding:8px 6px;font-size:14px}
.modi button[aria-pressed=true]{background:var(--ink);color:var(--plane);border-color:var(--ink)}
/* Die Formleiste ist der zweite Regler und nicht die Hauptsache: kleiner,
   enger, und die gewählte Form nur angestrichen statt ausgefüllt. */
.formen{margin:10px 0 0;gap:5px}
.formen button{flex:1;min-width:72px;padding:5px 4px;font-size:12.5px;color:var(--ink2)}
.formen button[aria-pressed=true]{background:var(--surface);color:var(--ink);
  border-color:var(--ink);font-weight:600}
.formen[hidden]{display:none}
.fuss{padding:8px 4px 2px}
.fuss .klein{margin:4px 0 0;font-size:12px;line-height:1.45;min-height:2.9em}
.legende{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--ink2);
  font-variant-numeric:tabular-nums}
.rampe{flex:1;height:10px;border-radius:5px;border:1px solid var(--ring)}
.tip{position:absolute;pointer-events:none;background:var(--surface);border:1px solid var(--axis);
  border-radius:9px;padding:8px 10px;font-size:13px;box-shadow:0 6px 20px rgba(0,0,0,.14);
  max-width:220px;opacity:0;transition:opacity .12s}
.tip b{display:block;font-size:14px;margin-bottom:2px}
.tip dl{margin:0;display:grid;grid-template-columns:auto auto;gap:1px 10px}
.tip dt{color:var(--ink2)}
.tip dd{margin:0;text-align:right;font-variant-numeric:tabular-nums}
.tip .warn{display:block;margin-top:4px;color:var(--ink2);font-size:12px}
h2{font-size:17px;margin:26px 0 6px}
h3{font-size:14px;margin:18px 0 4px}
/* Der Faden: nur die Überschriften, und zwar in der Karte selbst. Er liegt
   über der Zeichnung statt über dem Rahmen, kostet also keine Höhe — der Platz
   im Rahmen gehört der Karte. Die neueste steht oben; kommt eine dazu, rutscht
   alles andere eine Zeile nach unten und wird blasser. Der Halo aus der
   Flächenfarbe hält die Schrift auch über einem dunklen Fleck lesbar. */
.feld{position:relative}
.faden{position:absolute;left:6px;top:4px;width:min(48%,215px);pointer-events:none;
  display:flex;flex-direction:column;gap:3px;will-change:transform}
.faden b{font-size:11px;line-height:1.25;font-weight:650;color:var(--ink);
  text-shadow:0 0 3px var(--surface),0 0 3px var(--surface),0 0 4px var(--surface),
    0 0 8px var(--surface),0 0 8px var(--surface);transition:opacity .5s}
@media(max-width:540px){.faden{width:min(52%,184px);gap:2px}.faden b{font-size:10px}}
/* Vollständig stehen die Notizen unten im Text: die erreichten deutlich, die
   laufende angestrichen, die übrigen blass, bis die Uhr sie einholt. */
.wann{list-style:none;margin:14px 0 0;padding:0;font-size:11.5px;line-height:1.45}
.wann li{margin:0 0 5px;padding-left:9px;border-left:2px solid transparent;
  color:var(--muted);opacity:.42;transition:opacity .35s,color .35s}
.wann li.da{opacity:1;color:var(--ink2)}
.wann li.jetzt{border-left-color:var(--ink);color:var(--ink)}
.wann li b{font-weight:600}
p{margin:0 0 10px}
.klein{font-size:13px;color:var(--ink2)}
table{border-collapse:collapse;width:100%;font-size:13px;font-variant-numeric:tabular-nums}
th,td{text-align:right;padding:3px 4px;border-bottom:1px solid var(--line)}
th:first-child,td:first-child{text-align:left}
th{color:var(--ink2);font-weight:600}
details{margin:10px 0}
summary{cursor:pointer;color:var(--ink2)}
a{color:inherit}
@media(min-width:620px){.wrap{max-width:600px}}
</style>
</head><body>
<div class="wrap">
<div class="buehne" id="buehne">
  <div class="schild">
    <b id="jahrZahl">–</b><span id="jahrBev"></span>
  </div>
  <div class="feld">
    <canvas id="karte"></canvas>${mitRelief ? `
    <canvas id="relief" hidden></canvas>` : ''}
    <div class="faden" id="faden" aria-live="polite"></div>
    <div class="tip" id="tip"></div>
  </div>
  <div class="fuss">
    <div class="legende"><span id="legLinks"></span><div class="rampe" id="rampe"></div><span id="legRechts"></span></div>
    <p class="klein" id="legText"></p>
  </div>
</div>
<div class="kopf" id="kopf"></div>

<div class="regler">
  <button id="spiel" aria-label="Play or pause">▶</button>
  <div class="bahn">
    <input type="range" id="zeit" min="0" max="1000" value="0" step="1" aria-label="Year">
    <div class="marken" id="marken"></div>
  </div>
</div>

<div class="modi" id="reihen" role="group" aria-label="Which counties are drawn" hidden></div>
<div class="modi formen" id="formen" role="group" aria-label="How much of the population goes into area">
  <button data-form="0">Real map</button>
  <button data-form="0.5">Half and half</button>
  <button data-form="1" aria-pressed="true">Cartogram</button>
</div>
<div class="modi" role="group" aria-label="What the map shows">
  <button data-modus="wandel" aria-pressed="true">Growth</button>
  <button data-modus="menschen" aria-pressed="false">People</button>${mitRelief ? `
  <button data-modus="relief" aria-pressed="false">Standing up</button>` : ''}
</div>

<h1>${titel}</h1>
<p class="unter">${anzahlKreise} counties and county-level cities, each sized by the people living
in it, ${jahrVon} to ${jahrBis}. Every figure is recomputed onto today's boundaries, so the
same places are compared across ${jahrBis - jahrVon} years. And the map itself grows: the
same number of people per square millimetre, start to finish, so ${jahrVon} really is
that much smaller than today.${ganzesLand ? '' : `</p>
<p class="unter">This is the pilot region of a larger project — the same map for all
${jeKreis.length} German counties. What is missing, and why, is written up in the repository.`}</p>

<h2>How to read it</h2>
<p>One sentence holds the whole map together: <b>volume is population.</b> How that volume is
split between area and height is the row of buttons under the slider.</p>

<p><b>Cartogram</b> is the classic: all of it goes into area, a county twice as populous is
drawn twice as large, and every county is the same height. Berlin then takes 4.4 % of the map
and Germany stops looking like Germany. <b>Real map</b> is the other end: the true outline,
every county at its true size, and the whole population in the height instead — Berlin keeps
its 0.25 % of the ground and stands almost eighteen times the average. <b>Half and half</b> is
what the two are for: the shape stays recognisable, Berlin comes down to 1.8 % of the area,
and the 2.5 it is missing is in the height. Area times height is its population in all three.</p>

<p>The height is measured, not assumed — the page takes the area each county actually ends up
with and divides the population by it, so the sum comes out right at every step of the morph,
not just at the ends. It is drawn compressed, because on the real map the range from the
emptiest district to Berlin is 134 to one and a relief like that is a wall next to a plain. The
order stays true; tap a county for the number.</p>

<p>Colour is a separate switch and means the same thing in all three shapes.</p>

<p>The mesh is a grid of squares ${NETZ_KM} km by ${NETZ_KM} km of real ground,
anchored to the projection and dragged along by the same current that makes the cartogram. Every
cell holds the same amount of land, so the size of a cell is the people on that land: where the
mesh is stretched wide, many people live on little ground; where it is squeezed to a knot, few
live on much. It is the density the cartogram spent to make area mean population — normally
thrown away, here drawn. On <b>Real map</b> it is a plain regular grid, which is the point:
the mesh is exactly the distortion, so you can watch it appear.</p>

<p>The light comes from the upper left over a surface built out of the same thing: each county
is a pad as high as the figure above says, and the grooves between the pads are all the same
width. In the full cartogram every pad is the same height, so what you see is only the
rounding at the edges — a county drawn wide reaches full height and reads as a plateau, one
drawn small never gets there and stays a low cushion. Pull the distortion back and the pads
start to differ, and the cities rise into real hills. The relief is never a second colour
scale; it is the half of the population the area is no longer carrying.</p>

<p>Headlines of what was happening stand in the top corner of the map. Each new one arrives at
the top and pushes the ones before it down; the full notes are further down this page.</p>

<p><b>Growth</b> is what the map is really for, and what it opens on. It colours each county
by how fast it is gaining or losing people <i>at that moment</i>: the change per year over
the stretch of time the animation is currently crossing. Blue is growing, red is shrinking,
grey is holding steady. Watch the Ruhr go from the deepest blue on the map to red within a
lifetime, and the east turn red after 1990.</p>

<p><b>People</b> shades each county by how many people live in it, on a fixed scale from
30 000 to 1.5 million. Fixed means the same shade means the same number in every frame, in
1871 as in 2024 — so the map darkening as the clock runs forward is not a trick of the
colouring, it is the result. The scale is logarithmic because the counties are: on a
straight scale nine in ten of them would sit in the bottom tenth of it and come out as one
flat blue.</p>

<p>The reading belongs to the stretch between two censuses, so it holds while the map crosses
one. It never runs ahead: at a census the old rate still stands, and the new one fades in
over the first sixth of the stretch that follows. Nothing on this map shows a change before
it was counted — the collapse of 1939 to 1946 appears after 1939, not before it.</p>

<p>Per year, because the gaps are wildly uneven — eight years from 1939 to 1946, thirty-six
from 1871 to 1900. The scale ends at ±3 % a year and is squeezed in between, so the quiet
decades still show something and the one violent stretch, 1939 to 1946, still fits.</p>

<p>Tap a county for its numbers. Between two censuses the shapes and the figures are
interpolated, and the readout says how wide the gap is — thirty-one years between the census
of 1910 and the one of 1939, which is why the First World War leaves so little mark here:
nothing was counted at county level while it happened. The interpolation runs along a smooth curve rather than a
straight line: it passes through every counted value exactly, has no kink at a census, and
never leaves the range of the two it lies between. A county can never hold more people
mid-stretch than it does at either end of it.</p>

<p>The clock does not run evenly through the years. Each stretch between two censuses gets a
share of the seventy seconds that mixes how long it lasted with how much moved in it — so the
years of war, flight and rebuilding, when the country was reshuffled fastest, slow down to
about five seconds instead of three, while the long quiet stretches still get the most
because they are the longest. The marks under the slider show where the censuses fall in
that running time.</p>

<p>The ${staedte.length} largest cities carry their names from the first frame onwards, and
the type grows with the patch: sized from the drawn area, but never below what a phone can
still read. Where two names would land on each other they step aside, and a hairline points
back to the patch a name has left. A city within ${ABSTAND_KM} km of a bigger one is not
labelled — otherwise the Rhine and the Ruhr would carry seven names on one thumbnail.</p>
${mitRelief ? `
<p><b>Standing up</b> drops the cartogram and gives the country its real shape back. It
keeps the page's own background — dark needles glowing to gold at night, pale ground and ink
by day — because one page should not change its ground when you switch a view. The
people become height instead: over every cell of ${ZELLFLAECHE.toFixed(0)} km² of ground
stands a needle as tall as the people living on it. Same ground everywhere, so the height is
density — which is why the Ruhr, Berlin, Hamburg and Munich rise out of a flat country. The
tallest needle holds ${zahl(nadeln.daten.hoechste)} people. The clock is the same one; the
needles hold still after ${nadeln.daten.b[nadeln.daten.b.length - 1].jahr}, because the
municipality figures end there.</p>` : ''}

<h2>What happened when</h2>
<p class="klein">The headlines running over the map, with what belongs to them. Figures marked
here are from the table this page draws; the rest is common history.</p>
<ol class="wann" id="wann">
${NOTIZEN.map((n, i) => `  <li data-n="${i}"><b>${n.kopf}</b> ${n.kurz} ${n.mehr}</li>`).join('\n')}
</ol>

${kommtSpaet.length ? `<h2>The button above the map</h2>
<p>${spaeteNamen.join(' and ')} ${spaeteNamen.length > 1 ? 'have' : 'has'} figures only from
${bilder.find(b => b.werte.has(kommtSpaet[0])).jahr} onwards — and more people than all of
${gebietsname} put together. Switch ${spaeteNamen.length > 1 ? 'them' : 'it'} on and watch what
happens: the city takes ${(100 * bilder[bilder.length - 1].werte.get(kommtSpaet[0]) / bilder[bilder.length - 1].summe).toFixed(0)} %
of the area, and because it sits in the middle and is tiny on the ground, everything around it
is squeezed into a ring. That is not a fault in the map — it is what an area cartogram does when
one enclosed unit holds most of the people. It is also why the pilot region is a hard case and
the full German map will not look like this: among 400 counties, Berlin is 4 % of the country,
not 59 % of the region.</p>

<p>Why ${spaeteNamen.join(' and ')} ${spaeteNamen.length > 1 ? 'start' : 'starts'} in
${bilder.find(b => b.werte.has(kommtSpaet[0])).jahr}: Greater Berlin was formed in 1920 out of
dozens of surrounding towns, and no reachable source gives those towns separately for the years
before. The figures for the old Berlin of 66.9 km² are not figures for today's 891 km², so they
are left out rather than quietly reused.</p>` : ''}

<h2>Method, in short</h2>
<p>Diffusion cartogram after Gastner and Newman (2004): population density is treated
as heat and flows apart until it is even everywhere, and the borders drift with the
current. Computed on an equal-area projection. Each census gets its own cartogram;
consecutive ones start from the previous result, so the map moves rather than jumps.
Area error left over, measured on the very numbers this page draws:
${(medianGuete * 100).toFixed(2)} % median across all ${zahl(nutz.guete.zellen)} county-frames,
${nutz.guete.ueber1} of them above 1 %, ${(maxGuete * 100).toFixed(1)} % at worst (Munich in the
early frames — a small city county that has to swell to sixteen times its ground area).
${gefaltet} folded rings.</p>

<h2>Time points</h2>
<table><thead><tr><th>Frame</th><th>Census date</th><th>Counties</th><th>People</th></tr></thead><tbody>
${bilder.map(b => `<tr><td>${b.jahr}</td><td>${b.stichtage.join(', ')}</td><td>${b.werte.size}</td><td>${mio(b.summe)} m</td></tr>`).join('\n')}
</tbody></table>

<h2>Three things the map does not smooth over</h2>
<p><b>Two states, two census days.</b> Between 1949 and 1990 the two Germanys counted at
different times, and the counts were never synchronised. So four of these frames carry two
dates rather than one: the West counted in June 1961, the East in December 1964; the West
in May 1987, the East's figure is the end of 1985. Nothing is shifted to make them line up
— each county's own date is in the readout, and the frame sits on the timeline where its
people are, not halfway between the dates.</p>

<p><b>Greater Berlin.</b> Berlin swallowed dozens of surrounding towns in 1920 and grew
from 67 to 891 km². The 1871 figure here is 931,984, not the 826,000 the city of the day
had: the source rebuilds today's Berlin out of the places that were later absorbed. The
same reconstruction is what makes every other county comparable across 150 years.</p>

<p><b>The eastern border.</b> Görlitz, Frankfurt (Oder), Guben and Forst were cut in two in
1945; their eastern halves are in Poland. For the years before, the source estimates how
many people lived on what is German ground today. Those four counties are the only figures
here that are estimates rather than counts, and each carries that note.</p>

<h2>Sources</h2>
<p class="klein">Population: Roesel, Felix (2022), <i>The German Local Population Database
(GPOP), 1871 to 2019</i>, Jahrbücher für Nationalökonomie und Statistik,
DOI 10.1515/jbnst-2022-0046 — all figures recomputed to boundaries as of 31 December 2019,
assembled from more than 50 sources, CC BY 4.0. The ${letztes.jahr} frame is from the
Federal Statistical Office's municipality directory (GV-ISys), 31 December 2024, as are the
county names and the surface areas used for density. Geometry: ${roh.quelle},
© GeoBasis-DE / BKG, Datenlizenz Deutschland – Namensnennung 2.0. Method notes and the
tidy data table are in the
<a href="https://github.com/Chillchamp1/lab/tree/main/bevoelkerung-kreise">repository</a>.
Counts are shown as they were taken: through 1910 the censuses counted the people present
on the day, soldiers included; from 17 May 1939 they counted residents; 1985, 1996, 2019 and
2024 are population updates rather than censuses.</p>
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
const GRENZEN = kum(entpacke(D.gr));      // Knotenpaare an Landes- und Aussengrenzen
// Das Gitternetz: n0 ist der erste seiner Knoten, sp und ze sind Spalten und
// Reihen, km die Weite einer Masche auf dem Boden. Seine Knoten stecken in
// denselben Feldern wie die der Kreise und werden deshalb genauso interpoliert.
const NETZ = D.netz;
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
let FORM = 1, formZiel = 2;      // formZiel ist der Index in FORMEN
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

/* ---------- Farbskalen ---------- */
const BLAU = ['#cde2fb','#b7d3f6','#9ec5f4','#86b6ef','#6da7ec','#5598e7','#3987e5','#2a78d6','#256abf','#1c5cab','#184f95','#104281','#0d366b'];
const ROT  = ['#f8d7d3','#f1c4bf','#edb0aa','#e69c95','#e08881','#d8746d','#d15d57','#c14e49','#ac4440','#993936','#85302d','#732624','#5f1f1d'];
const dunkel = () => matchMedia('(prefers-color-scheme:dark)').matches;
const stil = n => getComputedStyle(document.body).getPropertyValue(n).trim();
let LEER = '#e6e5e0', STRICH = '#fcfcfb', GRENZE = '#fcfcfb';
let INK = '#0b0b0b', SCHATTEN = 'rgba(0,0,0,.18)', KANTE3D = '#b9b8b0';
let NETZTON = 'rgba(11,11,11,.20)', HELLMAX = 0.50, DUNKELMAX = 0.40;
function farbenHolen() {
  LEER = stil('--leer'); STRICH = stil('--surface'); GRENZE = stil('--surface'); INK = stil('--ink');
  // Der Stapel unter der Karte: auf hellem Grund ein Grau, auf dunklem fast
  // schwarz, dazu ein weicher Schatten. Beides sind Dekoration, keine Daten —
  // deshalb halten sie sich zurück.
  SCHATTEN = dunkel() ? 'rgba(0,0,0,.55)' : 'rgba(11,11,11,.16)';
  KANTE3D = dunkel() ? '#0a0a0a' : '#b4b3ab';
  // Das Netz nimmt sich zurück: es soll zu lesen sein, ohne die Farbe der
  // Fläche zu verfälschen. Licht und Schatten des Reliefs sind auf dunklem
  // Grund anders verteilt als auf hellem — dort trägt der Schatten, hier das
  // Licht.
  NETZTON = dunkel() ? 'rgba(255,255,255,.22)' : 'rgba(11,11,11,.26)';
  HELLMAX = dunkel() ? 0.32 : 0.36;
  DUNKELMAX = dunkel() ? 0.44 : 0.36;
  if (typeof reliefFarben === 'function') reliefFarben();
}
// Auf heller Fläche läuft die Skala hell -> dunkel, auf dunkler dunkel -> hell:
// der Schritt neben der Fläche heisst immer „wenig".
const rampe = () => dunkel() ? [...BLAU].reverse() : BLAU;
const rampeRot = () => dunkel() ? [...ROT].reverse() : ROT;
const MITTE = () => dunkel() ? '#383835' : '#f0efec';
const stufe = (r, u) => r[Math.max(0, Math.min(r.length - 1, Math.round(u * (r.length - 1))))];

// Die Skala für die Bevölkerung: logarithmisch von 30 000 bis 1,5 Millionen,
// fest für alle Bilder. Die Grenzen sind mit Absicht runde Zahlen und nicht
// das Kleinste und Grösste der Reihe — Berlin hatte 1939 mehr als vier
// Millionen, und liesse man die Skala bis dorthin laufen, sässe der halbe
// Rest im selben Blau. So bekommt das dichte Mittelfeld die halbe Leiter, ein
// paar Grossstädte sitzen am dunklen Anschlag, und die kleinsten Kreise am
// hellen. Fest heisst: dieselbe Farbe bedeutet 1871 dasselbe wie 2024, und
// dass die Karte über die Zeit nachdunkelt, ist keine Einstellung, sondern
// das Ergebnis.
const MENSCHEN_VON = 30000, MENSCHEN_BIS = 1500000;
const lnVon = Math.log(MENSCHEN_VON), lnSpanne = Math.log(MENSCHEN_BIS) - lnVon;

// Die Skala für die Richtung: Veränderung je Jahr zwischen den beiden Bildern,
// zwischen denen die Karte gerade steht. Je Jahr, weil die Abstände sehr
// verschieden sind — zwischen 1939 und 1946 liegen achteinhalb Jahre, zwischen
// 1871 und 1900 sechsunddreissig.
//
// Der Massstab endet bei ±3 % im Jahr und ist dazwischen nach asinh gestaucht.
// Neun von zehn Werten liegen zwischen −1 und +2, aber der Sprung von 1939 auf
// 1946 reicht von −6 bis +9: Flucht, Vertreibung, zerbombte Städte. Linear
// gerechnet wäre alles andere grau, hart abgeschnitten wäre dieser eine
// Übergang eine Fläche ohne Zeichnung. asinh gibt dem dichten Mittelfeld
// Auflösung und lässt die Ränder trotzdem noch atmen.
const WANDEL_ENDE = 3, WANDEL_KNICK = 0.4;
const wandelSkala = r => Math.asinh(r / WANDEL_KNICK) / Math.asinh(WANDEL_ENDE / WANDEL_KNICK);

function farbe(modus, wert, k, rate) {
  if (!(wert > 0)) return LEER;
  if (modus === 'wandel') {
    if (rate === null) return LEER;
    const v = wandelSkala(rate);
    if (Math.abs(v) < 0.05) return MITTE();
    // Die beiden Arme hören vor den dunkelsten Stufen auf. Ganz unten laufen
    // Blau und Rot beide gegen Schwarz, und dann ist auf einer Karte mit 400
    // kleinen Flecken nicht mehr zu sehen, welche Richtung gemeint ist.
    return v > 0 ? stufe(rampe().slice(0, 10), Math.min(1, v))
                 : stufe(rampeRot().slice(0, 10), Math.min(1, -v));
  }
  return stufe(rampe(), Math.max(0, Math.min(1, (Math.log(wert) - lnVon) / lnSpanne)));
}

/* ---------- Zustand ---------- */
// Die Uhr läuft über die Spielzeit, nicht über die Jahre. Wie viel Spielzeit
// ein Abschnitt bekommt, steht in D.takt und ist beim Bauen gerechnet: das
// geometrische Mittel aus seinem Anteil an den Jahren und seinem Anteil an
// allem, was sich umschichtet. Wo viel in Bewegung ist, läuft die Uhr also
// langsamer — 1939 bis 1946 bekommt fünf Sekunden statt drei —, ohne dass die
// Zeitachse ganz aufhört, eine zu sein.
const TAKT = D.takt, TAKTKUM = [0];
for (let i = 0; i < TAKT.length; i++) TAKTKUM.push(TAKTKUM[i] + TAKT[i]);
let modus = 'wandel', spiel = 0, jahr = T0, laeuft = false, letzterTip = -1;
function setzeZeit(p) {
  spiel = Math.max(0, Math.min(1, p));
  let a = 0;
  while (a < NF - 2 && TAKTKUM[a + 1] <= spiel) a++;
  const u = Math.max(0, Math.min(1, (spiel - TAKTKUM[a]) / TAKT[a]));
  jahr = JAHRE[a] + (JAHRE[a + 1] - JAHRE[a]) * u;
}
const cv = document.getElementById('karte'), ctx = cv.getContext('2d');
let breite = 0, hoehe = 0, mass = 1, verX = 0, verY = 0;

const cv2 = document.getElementById('relief');
// Wie hoch darf der Rahmen sein? So hoch, dass er mit Kopfzeile und Legende
// ins Fenster passt — quer gehalten bleibt davon wenig, und genau das ist der
// Sinn: der Rahmen als Ganzes soll auch im Querformat vollständig zu sehen
// sein. Sonst bekommt die Karte so viel wie möglich.
function platzImRahmen() {
  const schild = document.querySelector('.schild'), fuss = document.querySelector('.fuss');
  const drum = (schild ? schild.offsetHeight : 0) + (fuss ? fuss.offsetHeight : 0) + 30;
  return Math.max(150, Math.round(innerHeight * 0.96 - drum));
}
function masse() {
  breite = cv.parentElement.clientWidth;
  // Das Seitenverhältnis kommt aus der Karte selbst: ein Kasten, der genauso
  // geformt ist wie das, was hineinsoll, verschenkt keinen Platz. Beim
  // Überblenden von einer Form zur anderen richtet sich der Kasten schon nach
  // dem Ziel und die Karte wandert darin — sonst müsste die Leinwand
  // vierzigmal in der Sekunde neu angelegt werden, und das ruckelt.
  const Z = reihe.rahmenJe[formZiel];
  const h = Math.round(Math.min(breite * (Z.h / Z.w), platzImRahmen()));
  const dpr = Math.min(2.5, devicePixelRatio || 1);
  const bw = Math.round(breite * dpr), bh = Math.round(h * dpr);
  if (cv.width !== bw || cv.height !== bh) {
    cv.width = bw; cv.height = bh; cv.style.height = h + 'px';
  }
  hoehe = h;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const V = rahmenJetzt();
  mass = Math.min(breite / V.w, hoehe / V.h) * 0.99;
  verX = (breite - V.w * mass) / 2 - V.x * mass;
  verY = (hoehe - V.h * mass) / 2 - V.y * mass;
  if (cv2) reliefMasse(dpr);
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

/* ---------- Gitternetz ----------
   Die Knoten des Netzes liegen in denselben Feldern wie die der Kreise und
   sind durch dieselbe Strömung gelaufen. Gezeichnet wird es innerhalb der
   Silhouette: was draussen liegt, gehört zu keinem Kreis und hiesse nichts.
   Die Linien sind gerade von Knoten zu Knoten — eine geglättete Kurve sähe
   ruhiger aus, behauptete aber einen Verlauf, den niemand gerechnet hat. */
function zeichneNetz() {
  if (!NETZ) return;
  const n0 = NETZ.n0, sp = NETZ.sp, ze = NETZ.ze;
  ctx.beginPath();
  for (let j = 0; j < ze; j++) for (let i = 0; i < sp; i++) {
    const n = n0 + j * sp + i, x = px[n] * mass + verX, y = py[n] * mass + verY;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  for (let i = 0; i < sp; i++) for (let j = 0; j < ze; j++) {
    const n = n0 + j * sp + i, x = px[n] * mass + verX, y = py[n] * mass + verY;
    if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.lineJoin = 'round';
  ctx.strokeStyle = NETZTON;
  ctx.lineWidth = Math.max(0.45, breite / 850);
  ctx.stroke();
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
// Die Stauchung und der Sockel, auf dem das Relief steht. Ohne Sockel läge auf
// der Landkarte das halbe Land im Dunkeln, weil eine einzige Stadt die Skala
// setzt; mit Sockel ist die Ebene eine Ebene und die Städte steigen daraus auf.
// Im vollen Kartogramm sind alle Höhen gleich, dann ist der Sockel wirkungslos
// und es bleibt genau beim flachen Deckel von vorher.
const STAUCH = 0.45, BODEN_H = 0.34;
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
  let gross = 1;
  for (let g = 0; g < NK; g++) {
    HOCH[g] = (deck[g] > 0.5 && GEZEICHNET[g] > 0 && w[g] > 0) ? (w[g] / GEZEICHNET[g]) / mittel : 0;
    if (HOCH[g] > gross) gross = HOCH[g];
  }
  return gross;
}

const RAUF = 0.42;                // Auflösung des Höhenfelds, Anteil der Bildpunkte
const WEIT = 3;                   // das weite Feld noch einmal so viel gröber
const hkA = document.createElement('canvas'), hcA = hkA.getContext('2d');
const hkB = document.createElement('canvas'), hcB = hkB.getContext('2d', { willReadFrequently: true });
const hkC = document.createElement('canvas'), hcC = hkC.getContext('2d');
const hkL = document.createElement('canvas'), hcL = hkL.getContext('2d');
let rW = 0, rH = 0, rBild = null, feldH = null;
function reliefFeld() {
  const w = Math.max(8, Math.round(breite * RAUF)), h = Math.max(8, Math.round(hoehe * RAUF));
  if (w === rW && h === rH) return;
  rW = w; rH = h;
  for (const k of [hkA, hkB, hkL]) { k.width = w; k.height = h; }
  hkC.width = Math.max(4, Math.round(w / WEIT)); hkC.height = Math.max(4, Math.round(h / WEIT));
  rBild = hcL.createImageData(w, h);
  feldH = new Float32Array(w * h);
}
const STUFEN = 24;                // so viele Höhenstufen, in Bündeln gezeichnet
const EIMER_H = Array.from({ length: STUFEN }, () => []);
function reliefUeber(sil, deck, gross) {
  if (!(breite > 60 && hoehe > 60)) return;
  reliefFeld();
  const s = rW / breite;
  const fuge = Math.max(1.0, breite / 420);     // Breite der Fuge zwischen zwei Kreisen
  const fein = Math.max(1.8, breite / 130);     // enges Weichzeichnen: der einzelne Kreis
  const grob = Math.max(7, breite / 22);        // weites: die Landschaft darüber

  // Die Vorlage. Draussen bleibt sie durchsichtig, nicht schwarz: dieselbe
  // Fläche dient hinterher als Schablone, mit der das Licht auf die Karte
  // beschnitten wird — das erspart ein zweites Beschneiden an einem Pfad aus
  // vierhundert Vielecken, und das ist der teuerste Teil des Bildes.
  hcA.setTransform(1, 0, 0, 1, 0, 0);
  hcA.clearRect(0, 0, rW, rH);
  hcA.setTransform(s, 0, 0, s, 0, 0);
  // Jeder Kreis bekommt sein eigenes Grau: das ist seine Höhe. Gezeichnet
  // wird in vierundzwanzig Bündeln statt in vierhundert Füllungen — dieselbe
  // Ersparnis wie im Nadelrelief.
  for (const e of EIMER_H) e.length = 0;
  for (let g = 0; g < NK; g++) {
    if (!(deck[g] > 0.5) || !(HOCH[g] > 0)) continue;
    const v = BODEN_H + (1 - BODEN_H) * Math.pow(HOCH[g] / gross, STAUCH);
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
    hcA.fillStyle = 'rgb(' + t + ',' + t + ',' + t + ')';
    hcA.fill('evenodd');
  }
  hcA.lineJoin = 'round'; hcA.lineWidth = fuge; hcA.strokeStyle = '#000'; hcA.stroke(sil);

  // Das weite Feld entsteht auf einer dreimal gröberen Leinwand. Weichzeichnen
  // kostet nach Fläche, und ein Feld, das ohnehin nur die grosse Form trägt,
  // braucht die Auflösung nicht.
  hcC.setTransform(1, 0, 0, 1, 0, 0);
  hcC.clearRect(0, 0, hkC.width, hkC.height);
  hcC.filter = 'blur(' + (grob * s / WEIT).toFixed(2) + 'px)';
  hcC.drawImage(hkA, 0, 0, hkC.width, hkC.height);
  hcC.filter = 'none';

  hcB.setTransform(1, 0, 0, 1, 0, 0);
  hcB.globalAlpha = 1;
  hcB.clearRect(0, 0, rW, rH);
  hcB.filter = 'blur(' + (fein * s).toFixed(2) + 'px)';
  hcB.drawImage(hkA, 0, 0);
  hcB.filter = 'none';
  hcB.globalAlpha = 0.42;
  hcB.drawImage(hkC, 0, 0, rW, rH);
  hcB.globalAlpha = 1;

  // Gelesen wird die Höhe als Rot mal Deckkraft: was halb durchsichtig ist,
  // liegt halb so hoch. Ohne das wäre der Rand der Karte eine Klippe.
  const d = hcB.getImageData(0, 0, rW, rH).data, o = rBild.data;
  for (let i = 0, n = rW * rH; i < n; i++) feldH[i] = d[i << 2] * d[(i << 2) + 3];

  // Licht von oben links, 50 Grad über der Fläche. Auf dem Bildschirm zeigt y
  // nach unten, oben links ist also die negative Richtung in beiden Achsen.
  const hoch = Math.cos(Math.PI * 50 / 180) * Math.SQRT1_2;
  const lx = -hoch, ly = -hoch, lz = Math.sin(Math.PI * 50 / 180);
  const k = 3.2 / 65025;
  for (let y = 0; y < rH; y++) {
    const zc = y * rW, zo = (y > 0 ? y - 1 : y) * rW, zu = (y < rH - 1 ? y + 1 : y) * rW;
    for (let x = 0; x < rW; x++) {
      const xm = x > 0 ? x - 1 : x, xp = x < rW - 1 ? x + 1 : x;
      const gx = (feldH[zc + xp] - feldH[zc + xm]) * k;
      const gy = (feldH[zu + x] - feldH[zo + x]) * k;
      const I = (-gx * lx - gy * ly + lz) / Math.sqrt(gx * gx + gy * gy + 1) - lz;
      const i4 = (zc + x) << 2;
      let a = I * 2.0;
      if (a > 0) { if (a > HELLMAX) a = HELLMAX; o[i4] = 255; o[i4 + 1] = 255; o[i4 + 2] = 255; }
      else { a = -a; if (a > DUNKELMAX) a = DUNKELMAX; o[i4] = 0; o[i4 + 1] = 0; o[i4 + 2] = 0; }
      o[i4 + 3] = a * 255;
    }
  }
  hcL.putImageData(rBild, 0, 0);
  // Schablone: nur, was auf der Karte liegt.
  hcL.globalCompositeOperation = 'destination-in';
  hcL.drawImage(hkA, 0, 0);
  hcL.globalCompositeOperation = 'source-over';
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(hkL, 0, 0, breite, hoehe);
}

function zeichne() {
  if (modus === 'relief') { zeichneRelief(); return; }
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
  const gross = hoehen(w, deck);
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

  for (let g = 0; g < NK; g++) {
    if (!(deck[g] > 0.001)) continue;             // ohne Zahl wird nicht gezeichnet
    ctx.globalAlpha = deck[g];
    const ringe = GEBIETE[g];
    ctx.beginPath();
    for (const r of ringe) {
      ctx.moveTo(px[r[0]] * mass + verX, py[r[0]] * mass + verY);
      for (let i = 1; i < r.length; i++) ctx.lineTo(px[r[i]] * mass + verX, py[r[i]] * mass + verY);
      ctx.closePath();
    }
    ctx.fillStyle = farbe(modus, w[g], g, rate[g]);
    ctx.fill('evenodd');
    ctx.strokeStyle = STRICH; ctx.lineWidth = Math.max(0.3, Math.min(0.6, breite / 700)); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // Landes- und Aussengrenzen darüber, damit die 400 Kreise eine Gestalt
  // behalten, in der man sich zurechtfindet.
  ctx.beginPath();
  for (let i = 0; i < GRENZEN.length; i += 2) {
    const p = GRENZEN[i], q = GRENZEN[i + 1];
    ctx.moveTo(px[p] * mass + verX, py[p] * mass + verY);
    ctx.lineTo(px[q] * mass + verX, py[q] * mass + verY);
  }
  ctx.strokeStyle = GRENZE; ctx.lineWidth = Math.max(0.7, Math.min(1.2, breite / 420)); ctx.stroke();

  ctx.save();
  ctx.clip(sil);
  zeichneNetz();
  ctx.restore();
  reliefUeber(sil, deck, gross);

  beschrifte(deck);
  schreibe(a, b, u, w, deck);
  notizen();
  if (modus === 'wandel') legendeText(a, b);
}

const nf = new Intl.NumberFormat('en-GB');
function schreibe(a, b, u, w, deck) {
  const zwischen = u > 0.001 && u < 0.999;
  let summe = 0; for (let k = 0; k < NK; k++) summe += w[k] * deck[k];
  document.getElementById('jahrZahl').textContent = zwischen ? Math.round(jahr) : D.B[u < 0.5 ? a : b].jahr;
  document.getElementById('jahrBev').textContent = (summe / 1e6).toFixed(1) + ' million people';
  const z = D.B[u < 0.5 ? a : b];
  // Zwischen zwei Zählungen steht dabei, wie gross die Lücke ist. Wer sich
  // fragt, warum vom Ersten Weltkrieg nichts zu sehen ist, liest hier die
  // Antwort: zwischen 1910 und 1939 wurde auf Kreisebene nichts gezählt.
  const luecke = Math.round(JAHRE[b] - JAHRE[a]);
  document.getElementById('kopf').textContent = zwischen
    ? 'between ' + D.B[a].jahr + ' and ' + D.B[b].jahr + ' — interpolated across '
      + luecke + ' years with no census'
    : z.stichtage.join(' and ') + ' · ' + z.begriffe.join(', ') + ' · method ' + z.methoden.join('/');
  document.getElementById('zeit').value = Math.round(spiel * 1000);
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
    if (bestA > 0) liste.push({ name, A: bestA, mx, my, bb, bh });
  }
  liste.sort((a, b) => b.A - a.A);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';

  // Grösse: aus der Fläche, aber nie unter MINSCHRIFT und nie grösser, als der
  // Fleck trägt. Alle Namen stehen von Anfang an da — 1871 sind die Flecken
  // winzig, und ein Name, der erst später erscheint, ist ein Sprung im Bild.
  for (const s of liste) {
    ctx.font = '600 10px system-ui,-apple-system,sans-serif';
    s.je10 = ctx.measureText(s.name).width / 10;
    s.hoch = Math.max(MINSCHRIFT, Math.min(Math.sqrt(s.A) * 0.40, 30, s.bb * 1.3 / s.je10, s.bh * 0.9));
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
   Was jeweils geschah, steht als Überschrift in der Karte selbst, oben links.
   Kommt eine neue dazu, setzt sie sich obenauf und schiebt die vorigen eine
   Zeile nach unten, blasser mit jedem Schritt. Der Faden hält die letzten
   ${FADEN_TIEFE}; alles Weitere steht ausgeschrieben unter der Karte.

   Geschoben wird nicht Zeile für Zeile, sondern in einem Stück: der ganze
   Faden springt ohne Übergang um eine Zeilenhöhe nach oben und läuft dann
   nach unten zurück. Weil die neue Überschrift oben schon steht, sieht das
   aus, als drücke sie die anderen weg — und kostet eine einzige Bewegung
   statt ${FADEN_TIEFE}.

   Welche Notiz gilt, hängt nur an der Uhr, also gilt sie in allen drei
   Ansichten. Am Regler kann die Zeit auch zurücklaufen; dann wird der Faden
   neu aufgebaut statt fortgeschrieben. */
const NOTIZ = ${JSON.stringify(NOTIZEN.map(n => [n.von, n.bis, n.kopf, n.kurz]))};
const WANN = [...document.querySelectorAll('#wann li')];
const FADEN = document.getElementById('faden');
const TIEFE_FADEN = ${FADEN_TIEFE};
const FADEN_DECK = ${JSON.stringify(FADEN_DECK)};
let notizJetzt = -2;
function fadenBaue(i, geschoben) {
  // Auf einem Telefon bricht jede Überschrift auf zwei Zeilen um; dort hält
  // der Faden weniger, sonst wüchse er über die halbe Karte.
  const tief = innerWidth < 540 ? 4 : TIEFE_FADEN;
  const gab = FADEN.firstElementChild !== null;
  FADEN.textContent = '';
  for (let n = i; n >= 0 && i - n < tief; n--) {
    const el = document.createElement('b');
    el.textContent = NOTIZ[n][2];
    el.style.opacity = FADEN_DECK[i - n];
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
  // Die Liste unten führt mit: erreicht, laufend, noch nicht.
  WANN.forEach((li, n) => {
    li.classList.toggle('da', i >= 0 && n <= i);
    li.classList.toggle('jetzt', n === i);
  });
  fadenBaue(i, geschoben);
}

/* ---------- Legende ---------- */
// Der Text der Richtungsskala nennt den Abschnitt, für den sie gerade gilt;
// er wandert also mit der Zeit mit.
function legendeText(a, b) {
  document.getElementById('legText').textContent = 'Change per year, ' + D.B[a].jahr + ' to '
    + D.B[b].jahr + '. Red: losing people. Blue: gaining. Grey: holding steady.';
}
function legende() {
  const r = document.getElementById('rampe');
  const li = document.getElementById('legLinks'), re = document.getElementById('legRechts');
  const t = document.getElementById('legText');
  if (modus === 'relief') {
    r.style.background = 'linear-gradient(90deg,' + NADEL.join(',') + ')';
    li.textContent = '0'; re.textContent = nf.format(D2.hoechste);
    t.textContent = 'Needle height and colour are both people per cell of '
      + FLAECHE + ' km² of real ground — the same scale in every frame, so the country '
      + 'really does grow into a skyline.';
  } else if (modus === 'wandel') {
    r.style.background = 'linear-gradient(90deg,' + rampeRot().slice(0, 10).reverse().join(',')
      + ',' + MITTE() + ',' + rampe().slice(0, 10).join(',') + ')';
    li.textContent = '−3 %'; re.textContent = '+3 %';
    const [a, b] = bildBei(jahr);
    t.textContent = 'Change per year, ' + D.B[a].jahr + ' to ' + D.B[b].jahr
      + '. Red: losing people. Blue: gaining. Grey: holding steady. ' + formSatz();
  } else {
    r.style.background = 'linear-gradient(90deg,' + rampe().join(',') + ')';
    li.textContent = nf.format(MENSCHEN_VON); re.textContent = (MENSCHEN_BIS / 1e6) + ' m';
    t.textContent = 'People per county, logarithmic, same scale in every frame — which is why the '
      + 'whole map darkens as the country fills up. ' + formSatz();
  }
}
// Ein Satz zur eingestellten Form. Er sagt jedes Mal dasselbe in anderen
// Anteilen: das Volumen ist die Bevölkerung, und wie es sich auf Fläche und
// Höhe verteilt, steht am Umschalter.
function formSatz() {
  if (formZiel === 2) return 'Area is population; every county is the same height.';
  if (formZiel === 0) return 'True shape; the population is all in the height.';
  return 'Half the distortion; the rest of the population is in the height.';
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

${mitRelief ? `/* ---------- Nadelrelief ----------
   Dieselben Menschen, nur stellen sie sich auf: die Karte behält ihre wirkliche
   Form, und über jeder Rasterzelle steht eine Nadel, so hoch wie die Menschen
   darin. Die Zellen liegen versetzt — ein Dreiecksgitter, also dasselbe Muster
   wie ein Sechseckraster; auf dem geraden Gitter standen die Nadeln in Spalten
   wie auf Karopapier, und das Auge sah eher das Papier als das Land. */
const D2 = ${JSON.stringify(nadeln.daten)};
const FLAECHE = ${ZELLFLAECHE.toFixed(0)};
/* Die Leiter des Reliefs, dreizehn Stufen, in OKLab gleichmässig in der
   Helligkeit. Auf dunklem Grund läuft sie von einem Indigo, das kaum absteht,
   nach hellem Gold; auf hellem Grund von blassem Creme ins tiefe Violett. Der
   Grund selbst ist immer der der Seite: eine Seite, ein Hintergrund. Was auf
   dunklem Grund als Glut nach oben leuchtet, wird auf hellem Grund zur Tusche —
   die Helligkeit trägt in beiden Fällen die Höhe, nur die Richtung dreht sich. */
const LEITER = ${JSON.stringify(NADELTON)}, LEITER_HELL = ${JSON.stringify(NADELTON_HELL)};
const heller = (h, f) => '#' + [1, 3, 5]
  .map(i => Math.min(255, Math.round(parseInt(h.slice(i, i + 2), 16) * f)).toString(16).padStart(2, '0')).join('');
let NADEL = LEITER, KOPF = LEITER, HIMMEL = '#fff', BODEN1 = '#eee', BODEN2 = '#ddd', UFER = '#ccc';
// Wie steil die Höhe auf die Stufen abgebildet wird. Auf dunklem Grund darf
// das Land früh Farbe annehmen, es bleibt trotzdem dunkel; auf hellem Grund
// stünde bei derselben Kurve die halbe Fläche in Orange, also bleibt das
// flache Land dort länger im Blassen.
let KURVE = 0.55;
function reliefFarben() {
  const d = dunkel();
  NADEL = d ? LEITER : LEITER_HELL;
  KOPF = NADEL.map(t => heller(t, d ? 1.45 : 1.12));
  KURVE = d ? 0.55 : 0.72;
  HIMMEL = stil('--surface');
  BODEN1 = d ? '#262625' : '#efede6';        // hinten
  BODEN2 = d ? '#353532' : '#e2dfd5';        // vorn
  UFER = d ? '#4a4a45' : '#cfccc0';
  bodenTon = null;
}
const ctx2 = cv2.getContext('2d');

const kumI = a => { let v = 0; const o = new Int32Array(a.length); for (let i = 0; i < a.length; i++) { v += a[i]; o[i] = v; } return o; };
const RGX = kumI(entpacke(D2.gx)), RGY = kumI(entpacke(D2.gy));
const NZ = RGX.length, NF2 = D2.b.length;
const RH = [];
{ const d = entpacke(D2.h); let vor = new Float64Array(NZ);
  for (let f = 0; f < NF2; f++) {
    const jetzt = new Float64Array(NZ);
    for (let i = 0; i < NZ; i++) jetzt[i] = vor[i] + d[f * NZ + i];
    RH.push(jetzt); vor = jetzt;
  } }
const JAHRE2 = D2.b.map(b => b.t);
// Der Boden: die Aussengrenze als Ringe, die Landesgrenzen als Striche darauf.
// Beides in Zellenbreiten, dieselbe Einheit wie die Nadeln.
const RPLATTE = [];
{ const laengen = entpacke(D2.pl), pp = kumI(entpacke(D2.pp)); let o = 0;
  for (const len of laengen) {
    const r = new Float64Array(len * 2);
    for (let i = 0; i < len * 2; i++) r[i] = pp[o + i] / D2.fein;
    o += len * 2; RPLATTE.push(r);
  } }
const RGRENZ = kumI(entpacke(D2.gr));

/* Kamera: im Süden, um fünfzig Grad über der Ebene, Blick nach Norden. Flacher
   sähe man vor lauter Nadeln das Land nicht mehr, steiler verlöre das Relief
   seine Tiefe; fünfzig Grad ist die übliche Wahl für Reliefbilder. Norden bleibt
   oben, damit die Karte auf den ersten Blick als Deutschland zu erkennen ist.
   Eine echte Lochkamera, kein Parallelbild: die vorderen Nadeln sind grösser
   als die hinteren, und erst das macht die Tiefe. */
const RPHI = 50 * Math.PI / 180, rsin = Math.sin(RPHI), rcos = Math.cos(RPHI);
const rnx = D2.nx, rny = D2.ny * D2.reihe;            // Feldmass in Zellenbreiten
const rmitte = rnx / 2;
const rcamY = rny / 2 + 2.4 * rny * rcos, rcamZ = 2.4 * rny * rsin;
// Höhe der höchsten Nadel, gemessen an der Nord-Süd-Ausdehnung des Landes. Sie
// gilt für alle Bilder, damit das Feld über die Zeit wirklich wächst.
const RHOCH = 0.66 * rny / (D2.hoechste / D2.stufe);
const RB = 0.275, RS = 0.124;      // halbe Fussbreite, halbe Kopfbreite je Nadel
const rwx = i => RGX[i] + 0.5 * (RGY[i] & 1), rwy = i => RGY[i] * D2.reihe;

function rproj(x, y, z) {
  const dy = y - rcamY, dz = z - rcamZ;
  const t = -dy * rcos - dz * rsin;
  if (t < 0.2) return null;
  return [(x - rmitte) / t, (dy * rsin - dz * rcos) / t];
}
// Der Ausschnitt wird einmal über alles gelegt, was je zu sehen ist: jede Zelle
// am Boden und mit ihrer höchsten Nadel über alle Bilder, dazu der Umriss. Sonst
// wanderte das Bild, während die Zeit läuft.
const RHOECHST = new Float64Array(NZ);
for (const f of RH) for (let i = 0; i < NZ; i++) if (f[i] > RHOECHST[i]) RHOECHST[i] = f[i];
let rL = Infinity, rR = -Infinity, rO = Infinity, rU = -Infinity;
{ const merke = p => { if (!p) return;
    if (p[0] < rL) rL = p[0]; if (p[0] > rR) rR = p[0];
    if (p[1] < rO) rO = p[1]; if (p[1] > rU) rU = p[1]; };
  for (let i = 0; i < NZ; i++) {
    merke(rproj(rwx(i), rwy(i), 0));
    merke(rproj(rwx(i), rwy(i), RHOECHST[i] * RHOCH));
  }
  for (const r of RPLATTE) for (let i = 0; i < r.length; i += 2) merke(rproj(r[i], r[i + 1], 0)); }

let rhoehe = 0, rskala = 1, rvx = 0, rvy = 0, FLACH = 0;
let PLATTE_S = [], GRENZ_S = new Float64Array(0);
function reliefMasse(dpr) {
  // Die Höhe des Bildes folgt dem Inhalt, statt fest zu sein: das Feld ist so
  // hoch, wie das Land breit und Berlin hoch ist. Ein festes Format liesse
  // entweder Himmel übrig oder schnitte die Spitzen ab.
  rhoehe = Math.round(Math.min(breite * (rU - rO) / (rR - rL), platzImRahmen()));
  cv2.width = Math.round(breite * dpr); cv2.height = Math.round(rhoehe * dpr);
  cv2.style.height = rhoehe + 'px';
  ctx2.setTransform(dpr, 0, 0, dpr, 0, 0);
  rskala = breite * 0.98 / (rR - rL);
  rvx = breite / 2 - rskala * (rL + rR) / 2;
  rvy = rhoehe / 2 - rskala * (rO + rU) / 2;
  // Der Boden bewegt sich nicht, also wird er einmal ausgerechnet und nicht
  // fünfzigmal in der Sekunde.
  bodenTon = null;
  PLATTE_S = RPLATTE.map(r => {
    const o = new Float64Array(r.length);
    for (let i = 0; i < r.length; i += 2) {
      const p = rproj(r[i], r[i + 1], 0);
      o[i] = rvx + rskala * p[0]; o[i + 1] = rvy + rskala * p[1];
    }
    return o;
  });
  // Ab welcher Höhe ist eine Nadel mehr als eine Kachel? Gemessen in der Mitte
  // des Feldes: was kürzer als zwei Pixel wäre, wird als flache Fläche
  // gezeichnet — aus fünfzig Grad ist das genau das, was man sähe.
  const m0 = rproj(rmitte, rny / 2, 0), m1 = rproj(rmitte, rny / 2, 1);
  FLACH = 2 / (rskala * (m0[1] - m1[1]) * RHOCH);
  GRENZ_S = new Float64Array(RGRENZ.length);
  for (let i = 0; i < RGRENZ.length; i += 2) {
    const p = rproj(RGRENZ[i] / D2.fein, RGRENZ[i + 1] / D2.fein, 0);
    GRENZ_S[i] = rvx + rskala * p[0]; GRENZ_S[i + 1] = rvy + rskala * p[1];
  }
}

function bildBei2(t) {
  let a = 0;
  while (a < NF2 - 2 && JAHRE2[a + 1] <= t) a++;
  const b = Math.min(NF2 - 1, a + 1);
  const u = JAHRE2[b] > JAHRE2[a] ? Math.max(0, Math.min(1, (t - JAHRE2[a]) / (JAHRE2[b] - JAHRE2[a]))) : 0;
  return [a, b, u];
}

// Gezeichnet wird von hinten nach vorn, Zeile für Zeile — so verdecken die
// vorderen Nadeln die hinteren und nicht umgekehrt. Innerhalb einer Zeile
// stehen alle Nadeln gleich weit weg, also lassen sie sich nach Farbe bündeln:
// aus zwölftausend einzelnen Füllungen werden ein paar Dutzend je Zeile, und
// das ist der Unterschied zwischen dreissig Bildern in der Sekunde und fünf.
const EIMER = NADEL.map(() => ({ b: [], k: [] }));
function pfad(a) {
  ctx2.beginPath();
  for (let i = 0; i < a.length; i += 8) {
    ctx2.moveTo(a[i], a[i + 1]); ctx2.lineTo(a[i + 2], a[i + 3]);
    ctx2.lineTo(a[i + 4], a[i + 5]); ctx2.lineTo(a[i + 6], a[i + 7]);
  }
}
function maleZeile() {
  for (let s = 0; s < EIMER.length; s++) {
    const e = EIMER[s];
    if (e.b.length) { pfad(e.b); ctx2.fillStyle = NADEL[s]; ctx2.fill(); e.b.length = 0; }
    if (e.k.length) { pfad(e.k); ctx2.fillStyle = KOPF[s]; ctx2.fill(); e.k.length = 0; }
  }
}

// Der Boden bekommt einen Verlauf: hinten dunkler, vorn heller. Das ist keine
// Beleuchtung, sondern Luftperspektive — dasselbe, was die Ferne im Gebirge
// blasser macht — und es kostet nichts.
let bodenTon = null;
function bodenFarbe() {
  if (!bodenTon) {
    bodenTon = ctx2.createLinearGradient(0, 0, 0, rhoehe);
    bodenTon.addColorStop(0, BODEN1); bodenTon.addColorStop(1, BODEN2);
  }
  return bodenTon;
}

// Dieselbe weiche Kurve wie im Kartogramm, hier für die Nadelhöhen: sonst
// ruckt das ganze Feld an jeder Zählung.
const RHOEHE = new Float64Array(NZ), RM1 = new Float64Array(NZ), RM2 = new Float64Array(NZ);
let rTangFuer = -1;
function reliefHoehen(a, b, u) {
  if (rTangFuer !== a) {
    rTangFuer = a;
    const y = new Float64Array(4);
    const von = Math.max(0, a - 1), bis = Math.min(NF2 - 1, a + 2);
    const n = bis - von + 1, hh = [];
    for (let f = von; f < bis; f++) hh.push(TAKT[f]);   // Relief: dieselben Bilder ohne das letzte
    for (let i = 0; i < NZ; i++) {
      for (let f = von; f <= bis; f++) y[f - von] = RH[f][i];
      const m = steigungen(y, hh, a - von, n);
      RM1[i] = m[0]; RM2[i] = m[1];
    }
  }
  for (let i = 0; i < NZ; i++) RHOEHE[i] = hermite(RH[a][i], RH[b][i], RM1[i], RM2[i], u);
}

function zeichneRelief() {
  const [a, b, u] = bildBei2(jahr);
  reliefHoehen(a, b, u);
  ctx2.fillStyle = HIMMEL; ctx2.fillRect(0, 0, breite, rhoehe);

  ctx2.beginPath();
  for (const r of PLATTE_S) {
    ctx2.moveTo(r[0], r[1]);
    for (let i = 2; i < r.length; i += 2) ctx2.lineTo(r[i], r[i + 1]);
    ctx2.closePath();
  }
  ctx2.fillStyle = bodenFarbe(); ctx2.fill('evenodd');
  ctx2.strokeStyle = UFER; ctx2.lineWidth = 0.8; ctx2.stroke();
  ctx2.beginPath();
  for (let i = 0; i < GRENZ_S.length; i += 4) {
    ctx2.moveTo(GRENZ_S[i], GRENZ_S[i + 1]); ctx2.lineTo(GRENZ_S[i + 2], GRENZ_S[i + 3]);
  }
  ctx2.stroke();

  // Farbe nach Höhe, mit einer Wurzelkurve: linear bliebe das Land eine
  // schwarze Fläche mit ein paar hellen Nadeln darin, logarithmisch stünde
  // schon jedes Dorf im Gold. Dazwischen liegt das Bild.
  const hm = D2.hoechste / D2.stufe, NS = NADEL.length - 1;
  const stufeVon = h => Math.min(NS, Math.round(Math.pow(Math.min(1, h / hm), KURVE) * NS));
  const deckel = (e, x, y, z) => {
    const C = rproj(x + RS, y + RS, z), E = rproj(x - RS, y + RS, z);
    const F = rproj(x + RS, y - RS, z), G = rproj(x - RS, y - RS, z);
    if (!C || !E || !F || !G) return;
    e.k.push(rvx + rskala * E[0], rvy + rskala * E[1], rvx + rskala * C[0], rvy + rskala * C[1],
      rvx + rskala * F[0], rvy + rskala * F[1], rvx + rskala * G[0], rvy + rskala * G[1]);
  };

  // Erst die flache Fläche. Eine Zelle, deren Nadel kürzer als zwei Pixel wäre,
  // ist aus diesem Winkel nichts als eine Kachel auf dem Boden — und Kacheln
  // verdecken einander nicht. Also lassen sie sich alle auf einmal nach Farbe
  // bündeln, statt Zeile für Zeile: das sind die meisten Zellen, und danach
  // kosten sie dreizehn Füllungen statt tausend.
  for (let i = 0; i < NZ; i++) {
    const h = RHOEHE[i];
    if (h < 0.4 || h >= FLACH) continue;          // unter zehn Menschen je Zelle
    deckel(EIMER[stufeVon(h)], rwx(i), rwy(i), h * RHOCH);
  }
  maleZeile();

  // Dann, was wirklich steht: zeilenweise von hinten nach vorn, damit die
  // vorderen Nadeln die hinteren verdecken und nicht umgekehrt.
  let zeile = -1;
  for (let i = 0; i < NZ; i++) {
    const h = RHOEHE[i];
    if (h < FLACH) continue;
    if (RGY[i] !== zeile) { maleZeile(); zeile = RGY[i]; }
    const x = rwx(i), y = rwy(i), z = h * RHOCH;
    const A = rproj(x - RB, y + RB, 0), B = rproj(x + RB, y + RB, 0);
    const C = rproj(x + RS, y + RS, z), E = rproj(x - RS, y + RS, z);
    if (!A || !B || !C || !E) continue;
    const ax = rvx + rskala * A[0], bx = rvx + rskala * B[0];
    const e = EIMER[stufeVon(h)];
    e.b.push(ax, rvy + rskala * A[1], bx, rvy + rskala * B[1],
      rvx + rskala * C[0], rvy + rskala * C[1], rvx + rskala * E[0], rvy + rskala * E[1]);
    if (bx - ax > 1.2) deckel(e, x, y, z);        // der Deckel, wenn er ein Pixel bedeckt
  }
  maleZeile();
  schreibeRelief(a, b, u);
  notizen();
}

function schreibeRelief(a, b, u) {
  const ende = JAHRE2[NF2 - 1];
  const steht = jahr > ende + 0.01;
  const zwischen = !steht && u > 0.001 && u < 0.999;
  const bd = D2.b[steht ? NF2 - 1 : (u < 0.5 ? a : b)];
  document.getElementById('jahrZahl').textContent = zwischen ? Math.round(jahr) : bd.jahr;
  const bev = D2.b[a].bev + (D2.b[b].bev - D2.b[a].bev) * u;
  document.getElementById('jahrBev').textContent = (bev / 1e6).toFixed(1) + ' million people';
  document.getElementById('kopf').textContent = steht
    ? 'The municipality figures end in ' + bd.jahr + ' — the needles hold still while the clock runs on.'
    : zwischen ? 'between ' + D2.b[a].jahr + ' and ' + D2.b[b].jahr + ' — heights interpolated'
      : bd.stichtage.join(' and ') + ' · ' + bd.begriffe.join(', ') + ' · '
        + nf.format(NZ) + ' cells of ' + FLAECHE + ' km²';
  document.getElementById('zeit').value = Math.round(spiel * 1000);
}
` : ''}
/* ---------- Ablauf ---------- */
// Millisekunden für die ganze Zeitachse. Langsam genug, dass jede Notiz zu
// lesen ist — zusammen mit der Untergrenze je Abschnitt (siehe D.takt).
const DAUER = ${SPIELZEIT * 1000};
let zuletzt = 0;
function schlag(t) {
  if (laeuft) {
    if (zuletzt) setzeZeit(spiel + (t - zuletzt) / DAUER);
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
  halte(); setzeZeit(e.target.value / 1000); zeichne();
});
const MODUSKNOPF = [...document.querySelectorAll('.modi button[data-modus]')];
for (const b of MODUSKNOPF) b.onclick = () => {
  modus = b.dataset.modus;
  for (const o of MODUSKNOPF) o.setAttribute('aria-pressed', String(o === b));
  ansicht(); legende(); zeichne();
};

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
  masse();
  if (!laeuft) zeichne();
  if (rest > 0) requestAnimationFrame(morphSchritt);
  else { FORM = morphAuf; tangenteFuer = -1; masse(); zeichne(); }
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
// Beim Umschalten wechselt nur die Leinwand — der Grund bleibt der der Seite.
// Die Sprechblase der Karte hat im Relief nichts zu suchen.
function ansicht() {
  const relief = modus === 'relief';
  cv.hidden = relief;
  if (cv2) cv2.hidden = !relief;
  // Das Nadelrelief hat seine eigene Geometrie; die Formleiste gilt dort nicht.
  document.getElementById('formen').hidden = relief;
  tip.style.opacity = 0; letzterTip = -1;
}
addEventListener('resize', () => { masse(); zeichne(); });
matchMedia('(prefers-color-scheme:dark)').addEventListener('change', () => { farbenHolen(); legende(); zeichne(); });

// Markierungen für die Zählungen auf der Zeitachse
function marken() {
  const VOLL = Math.max(...reihe.BEV.map(b => b.filter(v => v > 0).length));
  // Die Marken sitzen dort, wo die Zählungen im Ablauf liegen — der Regler
  // misst Spielzeit, nicht Jahre.
  document.getElementById('marken').innerHTML = D.B.map((b, i) =>
    '<i class="' + (reihe.BEV[i].filter(v => v > 0).length >= VOLL ? 'voll' : '') + '" style="left:' +
    (TAKTKUM[i] * 100).toFixed(2) + '%" title="' + b.jahr + '"></i>').join('');
}

// Umschalter zwischen den Reihen
if (REIHEN.length > 1) {
  const leiste = document.getElementById('reihen');
  leiste.hidden = false;
  REIHEN.forEach((r, i) => {
    const b = document.createElement('button');
    b.textContent = r.name;
    b.setAttribute('aria-pressed', String(i === 0));
    b.onclick = () => {
      reihe = r;
      for (const o of leiste.children) o.setAttribute('aria-pressed', String(o === b));
      masse(); marken(); legende(); zeichne();
    };
    leiste.appendChild(b);
  });
}

farbenHolen(); ansicht(); masse(); marken(); legende(); zeichne();
requestAnimationFrame(schlag);
setTimeout(starte, 700);
</script>
</body></html>
`);
