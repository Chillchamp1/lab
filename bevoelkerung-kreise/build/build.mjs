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

/* ---------- Die Farbleiter, gerechnet statt gegriffen ----------
   Sie stand als Liste von vierundzwanzig Zeichenketten in der Seite, und der
   Kommentar daneben behauptete, sie sei berechnet. Das stimmte auch — nur eben
   einmal, von Hand, und das Ergebnis war hineinkopiert. Jetzt rechnet sie hier,
   aus ihrer Beschreibung: je Band eine Helligkeit, ein Farbton und ein Anteil
   der **grössten Buntheit, die sRGB an dieser Stelle noch hergibt**. Gesucht
   wird die per Halbierung, in OKLCh.

   Zwei Bahnen. Die untersten Bänder sind **Wasser**: tief dunkelblau, zum Ufer
   hin heller. Darüber das Land, von Waldgrün über Grasgrün, Gelb und Ocker bis
   Rot, und ganz oben zwei feste Töne — ein fast entsättigtes Grau als Fels und
   reines Weiss als Schnee. */
/* ---------- Wo die Küste liegt ----------
   Das Ufer war eine Zahl ohne Bedeutung: vier der vierundzwanzig Bänder waren
   blau, das Leiterende lag bei ×2,31, und daraus fiel eine Küste bei ×0,43
   heraus — kein Schwellenwert, den irgendwer kennt, sondern ein Nebenprodukt
   zweier anderer Entscheidungen. Blau hiess „unten", weiter nichts.

   Jetzt heisst es etwas. **Der Meeresspiegel liegt bei ×0,50, der halben
   mittleren Dichte Deutschlands von 2024** — in der Wirklichkeit rund 95
   Einwohner je Quadratkilometer und damit ungefähr die Linie, unterhalb derer
   die EU eine Gegend „dünn besiedelt" nennt. Unter Wasser steht also das, was
   man strukturschwach nennt, wenn man es an der Dichte misst.

   Das „ungefähr" ist ernst gemeint. Gefärbt wird **gezeichnete** Dichte, und
   der feste Boden ist ein halb eingemischtes Kartogramm: er schrumpft leere
   Kreise und streckt volle. ×0,50 ist in der Karte exakt, in Einwohnern je km²
   aber nur im Mittel — die 27 Kreise, die 2024 zwischen ×0,48 und ×0,52
   liegen, haben real zwischen 78 und 126, im Median 95. Und weil der Boden die
   leeren Kreise kleiner zeichnet, als sie sind, liegen 12,4 % der Karte unter
   Wasser, während real 31,9 % der Landesfläche unter 100 E/km² liegen.

   Damit die Küste genau dort liegt, hängen drei Zahlen zusammen — die Zahl der
   Bänder, die Zahl der blauen darunter und das obere Ende der Leiter:

       Ufer = WASSER / NBAND · (1 + RESERVE) · Leiterende

   Zwei davon sind frei, die dritte folgt. Gewählt sind **25 Bänder und 5
   blaue**, und damit geht die ganze Leiter in runden Zahlen auf:

       ein Band          = ×0,1
       fünf Bänder       = ×0,5 = die Küste
       die Rampe endet   = ×2,5
       das Knie beginnt  = ×2,222 (gemessenes Quantil ×2,305, 4 % daneben)

   Jede halbe Stufe fällt damit auf eine Bandgrenze, also auf eine Höhenlinie,
   und die Marken der Legende stehen bei 0, 20, 40, 60 und 80 Prozent der
   Leiter.

   Was das über die Zeit zeigt: 1871 liegen 90 % der Fläche unter Wasser, die
   Karte ist eine Inselgruppe. 1900 sind es 56 %, 1939 34 %, um 1950 nur noch
   11,4 % — nie wohnte in der Fläche so viel Deutschland wie nach der
   Vertreibung. Seither steigt die See wieder: 8,9 % 1996, 11,4 % 2011, 12,2 %
   2024, und sie steht fast ganz im Nordosten. */
const NBAND = Number(process.env.NBAND ?? 25), WASSER = Number(process.env.WASSER ?? 5);
const UFER = Number(process.env.UFER ?? 0.50);   // Meeresspiegel, Vielfache von 2024
const svg = t => t > 0.0031308 ? 1.055 * Math.pow(t, 1 / 2.4) - 0.055 : 12.92 * t;
function oklab(L, a, b) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const q = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return [ 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * q,
          -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * q,
          -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * q];
}
const imRaum = v => v.every(x => x >= -0.0005 && x <= 1.0005);
function ton(L, anteil, h) {
  const r = h * Math.PI / 180;
  let lo = 0, hi = 0.4;
  for (let i = 0; i < 44; i++) {
    const m = (lo + hi) / 2;
    if (imRaum(oklab(L, m * Math.cos(r), m * Math.sin(r)))) lo = m; else hi = m;
  }
  const C = lo * anteil, v = oklab(L, C * Math.cos(r), C * Math.sin(r));
  return '#' + v.map(x => Math.round(Math.max(0, Math.min(1, svg(x))) * 255).toString(16).padStart(2, '0')).join('');
}
// Stützstellen: Anteil, Helligkeit, Farbton, Anteil der grössten Buntheit.
const bahn = (P, t, k) => {
  let i = 0; while (i < P.length - 2 && P[i + 1][0] < t) i++;
  const u = Math.max(0, Math.min(1, (t - P[i][0]) / (P[i + 1][0] - P[i][0])));
  return P[i][k] + (P[i + 1][k] - P[i][k]) * u;
};
const WASSERBAHN = [[0, 0.30, 258, 0.85], [1, 0.62, 242, 0.80]];
const LANDBAHN = [[0, 0.43, 146, 1.0], [0.22, 0.57, 144, 1.0], [0.40, 0.68, 140, 0.95],
                  [0.55, 0.79, 128, 0.88], [0.66, 0.87, 106, 0.88], [0.74, 0.84, 93, 0.92],
                  [0.84, 0.75, 66, 0.95], [0.93, 0.64, 44, 0.94], [1, 0.57, 33, 0.92]];
const HYPSO = [];
for (let i = 0; i < WASSER; i++) {
  const t = WASSER > 1 ? i / (WASSER - 1) : 0;
  HYPSO.push(ton(bahn(WASSERBAHN, t, 1), bahn(WASSERBAHN, t, 3), bahn(WASSERBAHN, t, 2)));
}
const NLAND = NBAND - WASSER - 2;
for (let i = 0; i < NLAND; i++) {
  const t = i / (NLAND - 1);
  HYPSO.push(ton(bahn(LANDBAHN, t, 1), bahn(LANDBAHN, t, 3), bahn(LANDBAHN, t, 2)));
}
HYPSO.push('#f2ebe6', '#ffffff');            // Fels, Schnee
log(`Farbleiter: ${NBAND} Bänder, davon ${WASSER} Wasser`);

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

// Die Form, auf der die Seite steht: der Mittelwert aller Kartogramme, zur
// Hälfte in die Landkarte gemischt. Eine lineare Mischung knickfreier Formen
// muss selbst nicht knickfrei sein — und hier werden gleich elf gemischt, zehn
// Kartogramme und die Landkarte. Also nachgezählt: kein Ring darf sich dabei
// umstülpen. Die einzelnen Zwischenformen stehen mit in der Ausgabe, weil sie
// zeigen, ob es an der Mischung liegt oder an einer der Vorlagen.
{
  const vorz = ringVorzeichen(geo.gebiete, geo.X, geo.Y);
  const zs = reihen[reihen.length - 1].zeitreihe.zustaende;
  const MX = new Float64Array(geo.X.length), MY = new Float64Array(geo.Y.length);
  for (const z of zs) for (let i = 0; i < MX.length; i++) { MX[i] += z.X[i] / zs.length; MY[i] += z.Y[i] / zs.length; }
  for (const a of [0.25, 0.5, 0.75]) {
    let kaputt = 0, gesamt = 0;
    for (const z of zs) {
      const BX = new Float64Array(z.X.length), BY = new Float64Array(z.Y.length);
      for (let i = 0; i < z.X.length; i++) {
        BX[i] = geo.X[i] + a * (z.X[i] - geo.X[i]);
        BY[i] = geo.Y[i] + a * (z.Y[i] - geo.Y[i]);
      }
      const f = gefalteteRinge(geo.gebiete, BX, BY, vorz);
      kaputt += f.kaputt; gesamt += f.gesamt;
    }
    log(`  einzeln, Zwischenform ${a}: ${kaputt} gefaltete Ringe von ${gesamt}`);
  }
  const BX = new Float64Array(MX.length), BY = new Float64Array(MY.length);
  for (let i = 0; i < MX.length; i++) {
    BX[i] = geo.X[i] + 0.5 * (MX[i] - geo.X[i]);
    BY[i] = geo.Y[i] + 0.5 * (MY[i] - geo.Y[i]);
  }
  const f = gefalteteRinge(geo.gebiete, BX, BY, vorz);
  log(`  Mittelform, halb eingemischt: ${f.kaputt} gefaltete Ringe von ${f.gesamt}`);
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
    mehr: 'Gelsenkirchen goes from 23,794 people to 219,501.' },
  { von: 1899, bis: 1913, kopf: '1900–1910 · The metropolis',
    kurz: 'Berlin passes three and a half million.',
    mehr: '931,984 in 1871, 3,734,258 by 1910.' },
  { von: 1913, bis: 1927, kopf: '1914–1918 · The First World War',
    kurz: 'Two million soldiers dead, no census until 1939.',
    mehr: 'The loss is real; nothing was counted, so the map glides.' },
  { von: 1927, bis: 1937, kopf: '1933–1939 · Rearmament',
    kurz: 'Whole towns rise for the arms industry.',
    mehr: 'Wolfsburg and Salzgitter are open country until now.' },
  { von: 1937, bis: 1945, kopf: '1939–1945 · The Second World War',
    kurz: 'Bombing empties the cities; Berlin loses 1.2 million.',
    mehr: 'October 1946 counts a country of rubble.' },
  { von: 1945, bis: 1952, kopf: '1945–1950 · Flight and expulsion',
    kurz: 'Twelve million Germans expelled from the east.',
    mehr: 'Ostholstein doubles, with nowhere to house them.' },
  { von: 1952, bis: 1962, kopf: '1950–1961 · Wirtschaftswunder',
    kurz: 'The west rebuilds, 2.7 million leave the GDR.',
    mehr: 'Essen peaks at 750,501 people in 1961 and never again.' },
  { von: 1962, bis: 1973, kopf: '1961–1973 · Guest workers',
    kurz: 'The factories recruit in Italy, Turkey, Yugoslavia.',
    mehr: 'From 1972 more die in the west than are born there.' },
  { von: 1973, bis: 1988, kopf: '1973–1987 · The pits close',
    kurz: 'Coal and steel close; the Ruhr turns red.',
    mehr: 'It has stayed red ever since; the growth moves south.' },
  { von: 1988, bis: 1996, kopf: '1989–1996 · Reunification',
    kurz: 'The east goes west; its birth rate halves.',
    mehr: 'One of the sharpest peacetime falls on record.' },
  { von: 1996, bis: 2011, kopf: '1996–2011 · Shrinking, and recounting',
    kurz: 'The 2011 census finds 1.5 million fewer.',
    mehr: 'The registers carried 81.8 million, the census counted 80.2.' },
  { von: 2011, bis: 2019, kopf: '2011–2019 · The cities fill again',
    kurz: 'Free movement and 2015 outweigh the deaths.',
    mehr: 'Leipzig, down a third since 1939, is back above 600,000.' },
  { von: 2019, bis: 2025, kopf: '2020–2024 · Covid, then Ukraine',
    kurz: 'A million arrive from Ukraine in 2022.',
    mehr: 'Germany reaches 83.6 million, nearly all of it in the cities.' },
];

// Die grössten Städte tragen ihren Namen auf der Karte — und zwar die, die
// **im gerade gezeigten Jahr** die grössten sind, nicht die von heute. Hier
// entsteht dafür nur der Vorrat: alle kreisfreien Städte und Stadtkreise, die
// je über 100 000 Menschen hatten, dazu die Region Hannover, in der die Stadt
// 2001 aufgegangen ist. Ausgewählt wird dann in der Seite, Bild für Bild.
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
// Wer überhaupt in Frage kommt. Die Schwelle liegt tief genug, dass sie in
// keinem Bild bindet — 1871 reicht der siebzehnte Name mit 60 000 Menschen —,
// und hoch genug, dass Frankfurt (Oder) draussen bleibt: es kürzt sich auf
// denselben Namen wie Frankfurt am Main und käme nie in die Nähe der Auswahl.
const KANDIDAT_AB = 100000;
const mitte = new Map();
geo.gebiete.forEach((ringe, g) => {
  let sx = 0, sy = 0, n = 0;
  for (const r of ringe) for (const id of r) { sx += geo.X[id]; sy += geo.Y[id]; n++; }
  if (n) mitte.set(modell.attr[g].ags, [sx / n, sy / n]);
});
const staedte = jeKreis
  .map((k, i) => ({ i, ags: k.ags, kurz: kurzerName(k.name), bev: hoechsteBev.get(k.ags) ?? 0,
    stadt: STADTKREISE.has(k.bez) || k.ags === '03241', m: mitte.get(k.ags) }))
  .filter(k => k.stadt && k.bev >= KANDIDAT_AB && k.m)
  .sort((a, b) => b.bev - a.bev);
log(`Beschriftung: ${staedte.length} Städte im Vorrat, ausgewählt wird je Bild`);
// Zur Kontrolle: wer stünde in welchem Bild da? Dieselbe Auswahl wie in der
// Seite, nur ohne Zwischenzeiten — damit im Bauprotokoll steht, was die Karte
// später zeigt, und ein Wechsel nicht unbemerkt verschwindet.
{
  const ZEIGE = 17;
  let vorher = null;
  for (const b of bilder) {
    const nimm = [];
    for (const k of staedte.map(k => ({ k, v: b.werte.get(k.ags) ?? 0 }))
      .filter(x => x.v > 0).sort((x, y) => y.v - x.v)) {
      if (nimm.some(s => Math.hypot(s.k.m[0] - k.k.m[0], s.k.m[1] - k.k.m[1]) < ABSTAND_KM * 1000)) continue;
      nimm.push(k);
      if (nimm.length >= ZEIGE) break;
    }
    const namen = nimm.map(x => x.k.kurz);
    const rein = vorher ? namen.filter(n => !vorher.includes(n)) : [];
    const raus = vorher ? vorher.filter(n => !namen.includes(n)) : [];
    log(`  ${String(b.jahr).padEnd(9)} Schwelle ${Math.round(nimm[nimm.length - 1].v / 1000)}k`
      + (rein.length || raus.length ? `   + ${rein.join(', ') || '–'}   − ${raus.join(', ') || '–'}` : ''));
    vorher = namen;
  }
}

// Wie lange dauert welcher Abschnitt? Nicht nach Jahren allein — dann rauscht
// die Umwälzung zwischen 1939 und 1946 in vier Sekunden vorbei, während die
// ruhigen Jahrzehnte vor 1900 fünfzehn bekommen. Und nicht nach Umschichtung allein,
// denn dann wäre die Zeitachse keine mehr. Genommen wird das geometrische
// Mittel aus beidem: dem Anteil an den Jahren und dem Anteil an der Summe aller
// Veränderungen je Kreis. Die Kriegs- und Nachkriegsjahre bekommen damit rund
// acht statt vier Sekunden, ohne dass die langen ruhigen Strecken einbrechen.
const abschnitte = bilder.slice(0, -1).map((b, i) => {
  const a = bilder[i], c = bilder[i + 1];
  let um = 0;
  for (const [ags, v] of a.werte) { const w = c.werte.get(ags); if (w > 0) um += Math.abs(w - v); }
  return { jahre: Math.max(0.1, nutz.bilder[i + 1].t - nutz.bilder[i].t), um: Math.max(1, um) };
});
// Dazu eine Untergrenze: unter fünfeinhalb Sekunden ist ein Abschnitt vorbei,
// ehe die Notiz gelesen ist. Die kurzen Abschnitte am Ende — 2011 bis 2019,
// 2019 bis 2024 — bekämen nach Jahren und Umschichtung sonst drei Sekunden und
// weniger. Wer über der Grenze liegt, gibt dafür anteilig ab; das wird ein paar
// Mal wiederholt, bis es steht.
const SPIELZEIT = 84;             // Sekunden für die ganze Achse
const MINDEST = 5.4 / SPIELZEIT;  // kleinster Anteil je Abschnitt
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
<meta name="description" content="Every one of today's ${anzahlKreise} counties in ${gebietsname} sized by the people living in it, from ${jahrVon} to ${jahrBis}. A relief map: colour and shading are how densely the land is settled.">
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
/* Die Null bei min-width ist kein Feinschliff, sondern ein Fehler, den es zu
   beheben galt: ein Flex-Kind ist voreingestellt mindestens so breit wie sein
   Inhalt, und in der Legende steht eine Zeile, die nicht umbrechen darf. Wurde
   sie lang („1946–1950 → 1961–1964"), dehnte sie die ganze Bühne über ihren
   Rahmen hinaus — die Karte sprang um siebzehn Bildpunkte in die Breite und
   wieder zurück, je nachdem, welche Notiz gerade galt. */
/* container-type macht die Bühne zum Massstab für alles darin: 1cqw ist ein
   Hundertstel ihrer Breite. Damit kann der Text mit der Karte wachsen, statt
   in Bildpunkten festzustehen — die Karte selbst misst sich ja auch an dieser
   Breite (breite/38 für den grössten Stadtnamen). */
.buehne{container-type:inline-size;
  position:relative;flex:1;min-width:0;min-height:0;display:flex;flex-direction:column;
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
/* Deutlich kleiner als in den ersten Fassungen (13,5 → 9). Der Text stand als
   Block über der Karte und zog den Blick, bevor die Karte ihn bekam; klein
   gesetzt ist er da, wenn man ihn sucht, und im Weg, wenn nicht. Zwischendurch
   stand er bei 7 und war zu klein — das hier ist die Mitte. Der Faden darunter
   geht im selben Verhältnis mit, sonst wären die alten Überschriften grösser
   als die laufende Notiz.

   Die neun Bildpunkte sind jetzt der **Boden**, nicht der Wert: darüber hängt
   die Grösse an der Breite der Bühne. Auf dem Telefon ändert sich damit nichts,
   auf einem breiten Schirm wächst der Text mit der Karte mit — er stand dort
   sonst als immer kleiner werdender Fleck neben einer Karte, deren Schrift sich
   nach genau dieser Breite richtet. Nach oben ist gedeckelt, weil die Bühne bei
   860 Bildpunkten aufhört und die Notiz eine Notiz bleiben soll. */
.jetzt{margin:0;max-width:min(94%,470px);
  font-size:clamp(9px,1.36cqw,11.6px);line-height:1.5;color:var(--ink2);
  opacity:0;transition:opacity .4s}
.jetzt b{display:block;color:var(--ink);font-weight:650;
  font-size:clamp(9.8px,1.48cqw,12.6px);margin-bottom:2px}

/* Darunter die vorigen Überschriften, mit jeder Zeile blasser. */
.faden{width:min(52%,210px);padding-top:4px;
  display:flex;flex-direction:column;gap:2px;will-change:transform}
.faden b{font-size:clamp(7.2px,1.09cqw,9.3px);line-height:1.3;font-weight:600;
  color:var(--ink);transition:opacity .5s}
@media(max-width:540px){.faden b{font-size:6.5px}}

/* Die Karte füllt die Bühne. */
.feld{position:relative;z-index:1;flex:1 1 auto;min-height:0}
canvas{position:absolute;left:0;top:0;width:100%;height:100%;touch-action:manipulation}

.fuss{flex:0 0 auto;min-width:0;padding:6px 0 0}
/* Eine Zeile, und zwar auch dann, wenn sie noch leer ist: sonst ist die Leiste
   beim ersten Messen niedriger als gleich darauf, und die Karte wird für eine
   Höhe gezeichnet, die es nicht mehr gibt. */
.fuss .klein{margin:4px 0 0;font-size:11.5px;line-height:1.35;color:var(--ink2);
  min-height:1.35em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
/* Die Leiter trug ihre beiden Zahlen links und rechts daneben — den Anfang und
   das Ende, und dazwischen nichts. Bei einer linearen Leiter ist das die
   ungünstigste aller Auskünfte: der ganze bewohnte Bereich drängt sich im
   linken Drittel, und wo darin ×1 liegt, war nicht zu erraten. Jetzt stehen
   die Zahlen **auf der Leiter**, jede an ihrer Stelle. */
.legende{font-size:11.5px;color:var(--ink2);font-variant-numeric:tabular-nums}
.rampe{height:9px;border-radius:5px;border:1px solid var(--ring)}
.stufen{position:relative;height:1.2em;margin-top:3px}
.stufen span{position:absolute;top:0;transform:translateX(-50%);white-space:nowrap}
.stufen span::before{content:'';position:absolute;left:50%;top:-4px;width:1px;
  height:4px;background:var(--axis)}
.stufen .a{transform:none}
.stufen .a::before{left:0}
.stufen .z{transform:translateX(-100%)}
.stufen .z::before{left:100%}

/* Die Bedienung, so wenig wie möglich: ein Knopf und ein Regler. */
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
    <div class="legende"><div class="rampe" id="rampe"></div><div class="stufen" id="legStufen"></div></div>
    <p class="klein" id="legText"></p>
  </div>
  <div class="regler">
    <button id="spiel" aria-label="Play or pause">▶</button>
    <div class="bahn">
      <input type="range" id="zeit" min="0" max="1000" value="0" step="1" aria-label="Year">
      <div class="marken" id="marken"></div>
    </div>
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

/* ---------- Die Reihen: dieselbe Geometrie, andere Verzerrung ---------- */
const REIHEN = D.R.map((r, ri) => {
  /* ---------- Ein Boden, der keinem Jahr gehört ----------
     Die Karte stand lange auf dem Kartogramm **des jeweiligen Jahres**: die
     Fläche eines Kreises war sein Anteil an der Bevölkerung dieses Bildes, und
     der Umriss verformte sich im Lauf der Zeit. Das zeigte gut, wo die Menschen
     gerade sind — und machte zwei Bilder unvergleichbar. Berlin hatte 1910
     dieselben 3,7 Millionen wie heute, wurde aber sechzig Prozent breiter
     gezeichnet, weil es damals fast jeden dreizehnten Deutschen hielt und heute
     nur noch jeden dreiundzwanzigsten. Bei festem Volumen je Mensch muss die
     Höhe das ausgleichen: derselbe Berg lag flach.

     Jetzt steht der Boden still, auf dem **Mittel aller zehn Kartogramme**.
     Nicht auf dem von 2024 — das wäre ein Körper, der einem Jahr gehört, und
     1871 würde auf der Gestalt von heute gezeichnet. Der Mittelwert gehört
     keinem Jahr und allen.

     Daraus folgt das, worum es geht: die Grundfläche eines Kreises ist über
     hundertfünfzig Jahre dieselbe, also ist seine **Höhe unmittelbar seine
     Bevölkerung**. Zwei Bilder sind vergleichbar; Berlin 1910 steht so hoch wie
     Berlin 2024, und 1939 steht höher als beide. Was die Karte dafür aufgibt,
     ist die Bewegung: sie verformt sich nicht mehr, sie steigt und fällt.

     Gemittelt wird nicht mehr hier, sondern beim Bauen: in der Nutzlast steht
     nur noch die eine Form, als Unterschied zur Landkarte. Die neun anderen
     Kartogramme wogen rund 450 kB und gingen nur in diesen Mittelwert ein. */
  const dx = entpacke(r.mx), dy = entpacke(r.my);
  const MX = new Int32Array(N), MY = new Int32Array(N);
  for (let i = 0; i < N; i++) { MX[i] = GX[i] + dx[i]; MY[i] = GY[i] + dy[i]; }
  const BEV = [];
  const d = entpacke(D.bev[ri]);
  let vor = new Float64Array(NK);
  for (let f = 0; f < NF; f++) {
    const jetzt = new Float64Array(NK);
    for (let k = 0; k < NK; k++) jetzt[k] = vor[k] + d[f * NK + k];
    BEV.push(jetzt); vor = jetzt;
  }
  return { id: r.id, name: r.name, MX, MY, BEV };
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
/* Wie stark geglättet wird. 1 ist die volle Fritsch–Carlson-Kurve, 0 ist die
   Gerade — denn eine Hermite-Kurve, deren beide Steigungen gleich der Sehne
   sind, **ist** die Gerade. Dazwischen wird jede Steigung anteilig zur Sehne
   hin gezogen.

   Der Regler steht hier, weil die Frage berechtigt ist: die Kurve war für die
   Knoten des Kartogramms gedacht, und der Boden steht seit einer Weile still.
   Also nachgemessen, über alle Kreise und neunhundert Stellen der Achse —
   Abweichung von der Geraden gegen den Knick der Höhe an einer Zählung
   (Median über die Kreise, die in allen zehn Bildern Zahlen haben):

     straff   grösste Abweichung   im Mittel   Knick im Median
       0                       0       0,00 %            74 %
       0,25              58 305 M       0,19 %            65 %
       0,5              116 611 M       0,38 %            53 %
       0,75             174 916 M       0,57 %            35 %
       1                233 221 M       0,75 %             5 %

   Die Mitte ist also das Schlechteste von beidem: den halben Preis für ein
   Viertel des Nutzens. Entweder ganz oder gar nicht — und ganz, weil ein
   Knick von 74 Prozent bedeutet, dass sich die Wachstumsgeschwindigkeit des
   mittleren Kreises an jeder Zählung fast verdoppelt oder halbiert. Neunmal
   im Lauf, über vierhundert Kreise zugleich: ein Zucken, und genau dagegen
   ist die Kurve gebaut.

   Der Preis ist im Mittel 0,75 Prozent, steht aber nicht gleichmässig: fast
   alles davon liegt in der einen 39-Jahre-Lücke zwischen 1871 und 1910, wo
   Berlin um bis zu 233 221 Menschen über der Geraden läuft. Die Kurve zieht
   das Wachstum dort nach vorn, weil der folgende Abschnitt flach ist und die
   Monotonie diese Flachheit rückwärts in die Anfahrt trägt — für eine Stadt,
   deren Wachstum sich in der Gründerzeit beschleunigte, die falsche Richtung.
   Gezählt ist zwischen 1871 und 1910 nichts; beide Annahmen sind Annahmen,
   und die gerade wäre dort die vorsichtigere. */
const STRAFF = 1;
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
  return [(d1 + STRAFF * (m1 - d1)) * h[f], (d1 + STRAFF * (m2 - d1)) * h[f]];
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
   weiter unten. */
/* ---------- Eine Form, und nur eine ----------
   Die Seite konnte zwischen drei Formen umschalten — Landkarte, halbe
   Verzerrung, volles Kartogramm —, dann nur noch zwischen einer, und jetzt ist
   auch die Maschinerie dafür weg: kein Umblenden zwischen Formen, keine Leiter
   je Form, keine Mindestbreite, kein Ausblenden des Reliefs. Das waren alles
   Vorkehrungen für das volle Kartogramm, in dem jeder Kreis dieselbe Dichte
   hat und nichts mehr zu modellieren ist; bei halber Verzerrung greift keine
   davon.

   Was bleibt, ist die Zahl: jeder Knoten liegt auf halbem Weg zwischen seinem
   Ort auf der Landkarte und seinem Ort im Kartogramm. Beide Enden stehen
   weiterhin in der Nutzlast — die Landkarte ist der Anfang der Differenzkette
   —, die Zwischenform kostet also nichts und wäre jederzeit wieder aufziehbar.

   Der Nebeneffekt, und er ist der Grund, warum das mehr ist als Aufräumen: die
   Farbleiter wurde über **alle drei** Formen gemessen, damit ×1 in jeder
   Knopfstellung dasselbe heisst. Die Landkarte streut am weitesten, also setzte
   sie das obere Ende für alle. Jetzt misst die Leiter genau das, was gezeichnet
   wird. */
const FORM = 0.5;
/* Hier stand noch ein Massstab und ein Ankerpunkt: jeder Zustand wurde um
   diesen Punkt auf seine Grösse gebracht, damals, als die Karte
   flächenproportional mit der Bevölkerung wuchs. Der Massstab wurde
   eingefroren, als das Wachstum in die Farbe zog — und ein fester Massstab um
   einen festen Punkt tut nichts mehr, sobald masse() den Rahmen der
   gezeichneten Punkte misst und auf die Leinwand normiert: beide Faktoren
   kürzen sich heraus. Also weg damit. */
const ortX = i => GX[i] + FORM * (reihe.MX[i] - GX[i]);
const ortY = i => GY[i] + FORM * (reihe.MY[i] - GY[i]);

/* Hier stand die Bahn zwischen zwei Bildern: acht Zahlenreihen zu je
   zwölftausend Knoten und eine monoton kubische Kurve, damit sich die Karte
   ohne Knick und ohne Überschiessen von einem Kartogramm ins nächste
   verformte. Sie ist weg, weil es nur noch **eine** Form gibt. Die Orte hängen
   nicht mehr an der Zeit, also werden sie einmal gerechnet und dann behalten;
   was sich über die Jahre bewegt, ist die Höhe, und die steckt in der Farbe.
   Die Kurve selbst lebt weiter, einen Stock tiefer: die Bevölkerungszahlen
   zwischen zwei Zählungen laufen weiterhin über sie (siehe werteBei). */
let punkteFuer = null;
function setzePunkte() {
  if (punkteFuer === reihe) return;
  punkteFuer = reihe;
  for (let i = 0; i < N; i++) { px[i] = ortX(i); py[i] = ortY(i); }
}
// Grösster Rahmen je Reihe, gemessen nur an den Kreisen, die im jeweiligen
// Bild auch gezeichnet werden. So füllt die Karte die Fläche, statt sich nach
// Gebieten zu richten, die gar nicht zu sehen sind.
function rahmenFuer(r) {
  const merkR = reihe;
  reihe = r;
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
  reihe = merkR; punkteFuer = null;
  return { x: a, y: c, w: b - a, h: d - c };
}
for (const r of REIHEN) r.rahmen = rahmenFuer(r);

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
/* Fünfundzwanzig Bänder, beim Bauen aus ihrer Beschreibung gerechnet (siehe
   oben im Bauskript): je Band eine Helligkeit, ein Farbton und die grösste
   Buntheit, die sRGB an dieser Stelle noch hergibt.

   Die untersten fünf sind **Wasser**. Wo auf die Fläche am wenigsten Menschen
   kommen, liegt jetzt ein See: tief dunkelblau, zum Ufer hin heller. Das ist
   nicht nur hübsch, es räumt zwei Dinge zugleich auf. Die Grenze zwischen
   Wasser und Land ist die schärfste, die eine Geländekarte kennt — man sieht
   auf einen Blick, welcher Teil des Landes leer ist. Und weil das untere Ende
   der Leiter damit an das Wasser geht, verteilen sich die Landbänder über
   einen engeren Bereich: dieselben Farben lösen feiner auf, dort, wo die
   Menschen wohnen.

   Darüber das Land, von Waldgrün über Grasgrün, Gelbgrün, Gelb und Ocker zu
   Orange und Rot. Oben endet es in **Weiss**, nicht in einem hellen Braun; das
   vorletzte Band ist ein fast entsättigtes Grau als Übergang von Fels zu
   Schnee.

   Die Helligkeit steigt im Wasser durchgehend bis zum Ufer, dann fällt sie
   scharf ins Waldgrün, steigt wieder bis zum Gelb und fällt mit den Rot-Tönen
   — das ist die Konvention eines Schulatlas und nicht zu vermeiden, wenn Gelb
   der hellste Farbton sein soll; die beiden obersten Bänder steigen wieder bis
   ins Weiss. */
const HYPSO = ${JSON.stringify(HYPSO)};
const WASSER = ${WASSER};
const UFER = ${UFER};
const stil = n => getComputedStyle(document.body).getPropertyValue(n).trim();
let LEER = '#1a1a18', INK = '#fff', STRICH = '#0c0c0c';
const SCHATTEN = 'rgba(0,0,0,.6)', KANTE3D = '#060605';
const STADTPUNKT = '#e8291c';
const HELLMAX = 0.55, DUNKELMAX = 0.55;
function farbenHolen() {
  LEER = stil('--leer'); INK = stil('--ink'); STRICH = stil('--surface');
}
/* Bänder gleicher Breite, und sie liegen jetzt **auf dem Feldwert**
   statt auf dem Leiterwert. Das klingt nach nichts und räumt zwei Dinge auf.

   Die Grenzen fallen bei k/NBAND — das sind genau die Niveaus der
   Höhenlinien. Jede Linie ist damit eine Farbgrenze und jede Farbgrenze trägt
   ihre Linie, ohne dass die Reserve ein bestimmter Bruch sein müsste. Vorher
   hing das an RESERVE = 1/8 und galt nur für jede zweite Linie.

   Und die Reserve bekommt Farbe. Vorher endete die Leiter bei ihrem oberen
   Quantil, und was darüber lag, hatte keinen eigenen Ton mehr: München, Berlin
   und Oberhausen sassen im selben hellsten Band. Jetzt reicht die Farbe bis an
   das obere Ende des Feldes — die beiden obersten Bänder, Fels und Schnee,
   gehören der Spitze allein.

   Abgeschnitten, nicht gerundet: es sind Bänder, nicht Stützstellen, und die
   Höhenlinien brauchen die Grenzen. */
const NBAND = HYPSO.length;
const bandIdx = v => Math.max(0, Math.min(NBAND - 1, Math.floor(v * NBAND)));
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
let SPANNE = null;
// Umschalten zwischen relativ und absolut: die gemessene Spanne hängt daran
// und wird verworfen.
function bezugAbsolut(an) {
  if (ABSOLUT === an) return;
  ABSOLUT = an; SPANNE = null;
  masse(); reliefFrisch(); zeichne();
}
// Flächengewichtetes Quantil über eine sortierte Liste von [Wert, Fläche].
function gewichtet(liste) {
  liste.sort((a, b) => a[0] - b[0]);
  let ges = 0; for (const [, fa] of liste) ges += fa;
  return t => {
    let ziel = t * ges, lauf = 0;
    for (const [v, fa] of liste) { lauf += fa; if (lauf >= ziel) return v; }
    return liste[liste.length - 1][0];
  };
}
function hoehenSkala() {
  if (SPANNE) return SPANNE;
  const merkR = reihe;
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
    const mittel = (sA > 0 ? sP / sA : 1) * (ABSOLUT && sP > 0 ? bezugsBev() / sP : 1);
    const jeBild = [];
    for (let g = 0; g < NK; g++) {
      const w = reihe.BEV[f][g];
      if (w > 0 && fl[g] > 0) jeBild.push([(w / fl[g]) / mittel, fl[g]]);
    }
    for (const e of jeBild) alle.push(e);
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
  const q = gewichtet(alle);
  const lo = Math.max(1e-3, q(0.05));
  let hi = Math.max(lo * 1.02, q(0.95) * KOPF);
  /* Und dann wird das obere Ende nicht genommen, sondern gesetzt — damit die
     Küste auf UFER fällt. Der gemessene Wert bleibt die Richtschnur: 25 Bänder
     und 5 blaue setzen das Knie auf ×2,222, vier Prozent unter das gemessene
     Quantil ×2,305 — und dafür endet die Rampe auf der runden ×2,5. Steht UFER
     auf null, gilt wieder das Quantil. */
  if (UFER > 0) hi = UFER * NBAND / (WASSER * (1 + RESERVE));
  reihe = merkR; punkteFuer = null;
  return (SPANNE = [Math.log(lo), Math.log(hi)]);
}
/* Hier standen zwei Bremsen für das volle Kartogramm: eine Mindestbreite der
   Leiter und ein Ausblenden des Reliefs, beide aus der Spanne **innerhalb**
   eines Bildes gerechnet. Dort hat jeder Kreis dieselbe Dichte, die Spanne
   schnurrt auf ein Prozent zusammen, und ohne Bremse wird aus den
   Rundungsresten des Diffusionsverfahrens ein Gebirge. Bei halber Verzerrung
   steht diese Spanne bei 1,76 gegen 0,96, ab denen die Bremse überhaupt
   greifen würde — beide sind mit dem Kartogramm weggefallen. */

let skalaVon = -1, skalaBis = 1;
// Wo das Mittel dieses Bildes auf der Leiter liegt, von 0 bis 1.
/* ---------- Wo eine Dichte auf der Leiter liegt ----------
   Zwei Möglichkeiten, und sie sind nicht gleichwertig.

   **Logarithmisch.** Gleiche Vielfache liegen gleich weit auseinander: von ×0,5
   auf ×1 ist derselbe Weg wie von ×1 auf ×2. Das löst unten gut auf, wo die
   meisten Kreise liegen, und staucht oben. Die Farbe ist damit eine gute
   Rangfolge, aber die Fläche darunter bedeutet nichts.

   **Linear.** Der Feldwert ist die Dichte selbst. Und daraus folgt das, worum
   es hier geht: Weichzeichnen erhält das Integral, also ist

       Volumen unter der Geländeoberfläche = Bevölkerung

   nicht nur je Kreis, sondern über jeden Ausschnitt, den man herausgreift.
   Zwei gleich grosse Flecken mit gleicher Farbe haben dann gleich viele
   Menschen, und ein doppelt so hoher Berg auf halber Fläche ebenso. Der Preis
   ist unten: die Hälfte der Fläche liegt in den untersten zwei, drei Bändern,
   und die frühen Bilder verlieren ihre Zeichnung fast ganz. */
let LINEAR = true;
/* ---------- Und oben: ein Knie statt eines Deckels ----------
   Die Leiter endet bei einem gemessenen Quantil, und was darüber lag, wurde
   abgeschnitten. Das war der eigentliche Grund, warum das Ruhrgebiet höher
   aussah als Berlin.

   Denn geklemmt wurden 2024 elf Kreise auf einmal — München (×2,58), Berlin
   (×2,51), Oberhausen (×2,39), Essen — und sie bekamen dabei **alle denselben
   Wert**.
   Der Unterschied zwischen ihnen, also genau das, worum es geht, war weg,
   bevor der erste Weichzeichner lief. Was danach noch entschied, war allein
   die Breite der Fläche, und da gewinnt ein fünfzig Kilometer langes Band
   dichter Städte gegen einen einzelnen Fleck. Berlins Gipfel lag im Feld bei
   0,866, der des Ruhrgebiets bei 0,877: die falsche Reihenfolge, und sie kam
   nicht aus den Zahlen, sondern aus dem Deckel.

   Jetzt ein Knie: bis zum Quantil bleibt die Leiter genau linear — daran hängt
   ja, dass das Volumen die Bevölkerung ist —, darüber läuft sie weich in die
   Reserve und erreicht sie erst im Unendlichen. Nichts wird mehr geklemmt, die
   Reihenfolge bleibt überall erhalten, und die Spitze behält ihren Vorsprung.
   Auf der Landkarte, wo die Dichte bis zum Fünfzehnfachen geht, staucht das
   Knie stark — aber es staucht, statt zu kappen. */
const knie = u => u > 1 ? 1 + RESERVE * (1 - Math.exp((1 - u) / RESERVE))
                : u < 0 ? -RESERVE * (1 - Math.exp(u / RESERVE))
                : u;
const aufLeiter = h => (h > 0)
  ? knie(LINEAR ? h / Math.exp(skalaBis)
                : (Math.log(h) - skalaVon) / (skalaBis - skalaVon))
  : 0;
const mitteAufLeiter = () => aufLeiter(MITTELHOCH);
// Dasselbe im Feld; dort liegen Farbe und Höhenlinien.
const mitteImFeld = () => zuFeld(aufLeiter(MITTELHOCH));

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
  const V = reihe.rahmen;
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
let MITTELHOCH = 1;
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

   RESERVE ist Luft über der Farbleiter, und sie hat jetzt zwei Aufgaben statt
   einer. Die alte: der Gipfel soll Platz haben. Die neue: sie **bekommt Farbe**
   — die obersten Bänder, Fels und Schnee, liegen genau dort. Zusammen mit dem
   Knie in aufLeiter heisst das, dass über dem gemessenen Quantil weder die
   Höhe noch die Farbe abreisst.

   An eine bestimmte Zahl ist der Wert nicht mehr gebunden. Er war es einmal:
   solange die Farbbänder auf dem Leiterwert lagen, fiel eine Farbgrenze nur
   dann auf eine Höhenlinie, wenn die Reserve genau ein Achtel betrug. Seit die
   Bänder auf dem Feldwert liegen, fallen sie immer zusammen. */
const RESERVE = 0.125;
/* Leiterwert (0 = unteres Ende der Farbskala, 1 = oberes) → Feldwert.

   Unten braucht die lineare Leiter keine Luft: sie fängt bei null an, und unter
   null wohnt niemand — mit Reserve blieben dort die beiden untersten Bänder
   leer. Die logarithmische fängt bei einem gemessenen Quantil an und braucht
   sie. */
const unten = () => LINEAR ? 0 : RESERVE;
const zuFeld = u => {
  const v = (u + unten()) / (1 + unten() + RESERVE);
  return v < 0 ? 0 : v > 1 ? 1 : v;
};
/* ---------- Bezogen worauf? ----------
   Die Höhe ist ein Verhältnis, und die Frage ist, wozu.

   **Absolut** (so steht die Seite): zu einer festen Dichte, der von Deutschland
   2024. Dann heisst ×2 in jedem Jahr dasselbe — doppelt so dicht wie das Land
   heute. Das ganze Land steigt im Lauf der Zeit aus dem Grün heraus, weil es
   sich fast verdreifacht; 1871 liegt fast einfarbig im Tiefgrün, und das ist
   keine Untertreibung, sondern der Befund. Seit die Karte nicht mehr mitwächst,
   ist die Farbe der einzige Ort, an dem das Wachstum steht — und dort steht es
   richtig.

   **Relativ** (der Schalter, früher die Voreinstellung): zur mittleren Dichte
   **desselben Bildes**. Ein Kreis steht dann auf ×2, wenn dort doppelt so dicht
   gewohnt wird wie im Landesdurchschnitt jenes Jahres, und wer mit dem Land
   Schritt hält, behält seine Farbe über hundertfünfzig Jahre. Das zeigt die
   Verteilung schärfer, verschweigt aber das Wachstum.

   Gerechnet ist der Unterschied ein Faktor: die Bevölkerung dieses Bildes,
   geteilt durch die des letzten. */
let ABSOLUT = true;
// Die Bevölkerung des letzten Bildes, einmal gerechnet und behalten.
let bevRef = 0;
function bezugsBev() {
  if (!bevRef) for (let g = 0; g < NK; g++) bevRef += reihe.BEV[NF - 1][g];
  return bevRef;
}
/* Die wirkliche mittlere Dichte des Landes 2024, auf der **amtlichen** Fläche:
   83,6 Millionen auf 357 677 km², also 234 Einwohner je Quadratkilometer. Sie
   hat mit der Höhenskala nichts zu tun — die rechnet auf der gezeichneten
   Fläche — und steht nur im Zettel, damit dort beide Zahlen nebeneinander
   stehen können. */
let dichteRef = 0;
function landesDichte() {
  if (!dichteRef) {
    let fl = 0;
    for (let g = 0; g < NK; g++) if (D.k[g][4] && reihe.BEV[NF - 1][g] > 0) fl += D.k[g][4];
    dichteRef = fl > 0 ? bezugsBev() / fl : 1;
  }
  return dichteRef;
}
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
  const mittel = (sA > 0 ? sP / sA : 1) * (ABSOLUT && sP > 0 ? bezugsBev() / sP : 1);
  // Die Höhe, die ein Kreis von durchschnittlicher Dichte in diesem Bild hätte.
  // Relativ ist das immer 1; absolut ist es die Dichte des Jahres, bezogen auf
  // die von 2024 — also 0,35 im Jahr 1871.
  MITTELHOCH = ABSOLUT && sP > 0 ? sP / bezugsBev() : 1;
  for (let g = 0; g < NK; g++)
    HOCH[g] = (deck[g] > 0.5 && GEZEICHNET[g] > 0 && w[g] > 0) ? (w[g] / GEZEICHNET[g]) / mittel : 0;
}

/* ---------- Wie weit geglättet, und wie stark nachgeschärft ----------
   Drei Zahlen, und an ihnen hängt die Frage, an der sich das Ruhrgebiet und
   Berlin messen.

   2024 sind die dichtesten Kreise bei halber Verzerrung München ×2,58, Berlin
   ×2,51, Frankfurt ×2,41, Oberhausen ×2,39 — Berlin ist also dichter als jede
   einzelne Ruhrstadt. Auf der Karte sah es lange umgekehrt aus: das Ruhrgebiet
   trug die grosse helle Kappe, Berlin einen Fleck. Drei Gründe, und alle drei
   sind Darstellung, nicht Befund. Zwei davon sind anderswo behoben — der
   Deckel der Leiter steht jetzt als Knie in aufLeiter, die Farbe reicht bis in
   die Reserve hinauf. Der dritte steht hier.

   **Weichzeichnen trägt Volumen über die Kreisgrenze.** Über die ganze Karte
   bleibt das Integral erhalten, über einen Ausschnitt nicht — und wen es
   trifft, entscheidet die Nachbarschaft. Berlin verliert an Brandenburg und
   bekommt von dort nichts zurück; Essen verliert an Bochum und bekommt von
   Bochum dasselbe wieder. Der Weichzeichner bevorzugt damit systematisch das
   Plateau vor der Spitze.

   Dagegen steht ENGANTEIL über eins: eine Unscharfmaskierung, die genau die
   Differenz aus engem und weitem Feld wieder aufschlägt. Sie ist gross, wo ein
   Berg allein steht, null, wo ein Plateau liegt, und über die ganze Karte
   mittelwertfrei. Gemessen für 2024 steht das Ruhrgebiet danach bei 1,44 mal
   Berlin, wo die Menschen 1,36 stehen; vorher waren es 1,76.

   Ihr Preis steht im Gipfel: eine Unscharfmaskierung überschiesst, und Berlins
   höchster Punkt liest sich dadurch um knapp ein Zehntel über der Dichte
   seines Kreises. Das ist der Tausch — der Gipfel ist eine Schätzung, das
   Volumen ist die Bevölkerung.

   Was bleibt, bleibt zu Recht: die gleichfarbige Zone ist im Ruhrgebiet
   grösser, weil dort auf grösserer Fläche ähnlich dicht gewohnt wird. */
let FEINTEILER = 95, GROBTEILER = 28, ENGANTEIL = 0.85;
let WEITTEILER = 9, SCHAERFE = 0.13;
/* Wo die Leiter oben endet, im Verhältnis zum gemessenen Quantil — die
   Schneegrenze. Sie ist gemessen, nicht geraten.

   Seit das Knie in aufLeiter nichts mehr kappt, entscheidet sie nicht mehr
   darüber, ob ein Gipfel Zeichnung behält, sondern nur noch, **wie hoch der
   Schnee anfängt**: schiebt man sie hoch, wird die weisse Kappe seltener und
   der Vorsprung des höchsten Berges deutlicher. Gemessen für 2024:

     Schneegrenze   Fels und Schnee   Gipfel Berlin : Ruhr   Volumen R:B
        1,04            5,2 %            1,00 : 0,97           1,54
        1,12            3,0 %            0,99 : 0,93           1,48
        1,17            1,8 %            0,97 : 0,89           1,45
        1,24            1,2 %            0,93 : 0,84           1,43

   (Die Menschen stehen 1,36 : 1.) Gewählt ist 1,17: knapp ein Prozent der
   Fläche im weissen Band, knapp zwei in den obersten beiden. Berlin steht dort
   allein im Schnee, das Ruhrgebiet bleibt im Rot — und das ist die Reihenfolge,
   die auch in den Zahlen steht. Die Schneegrenze wandert mit den Jahren: 1943
   liegt nichts darüber, die Gipfel entstehen erst.

   Der Faktor stand eine Fassung lang bei 1,04, und dass er gestiegen ist,
   heisst nicht, dass die Leiter höher endet — sie endet fast genau dort, wo
   vorher. Gemessen wird jetzt nur noch die eine gezeichnete Form, und deren
   Quantil liegt bei ×2,04 statt bei ×2,29 der Landkarte. Der Faktor gleicht
   das aus; oben steht danach ×2,39 gegen vorher ×2,38. */
let KOPF = 1.10;
const RAUF = 0.55;                // Auflösung des Höhenfelds, Anteil der Bildpunkte
const hkA = document.createElement('canvas'), hcA = hkA.getContext('2d');
const hkB = document.createElement('canvas'), hcB = hkB.getContext('2d', { willReadFrequently: true });
const hkC = document.createElement('canvas'), hcC = hkC.getContext('2d', { willReadFrequently: true });
const hkF = document.createElement('canvas'), hcF = hkF.getContext('2d');
let rW = 0, rH = 0, fBild = null;
let feinH = null, grobH = null, grobM = null, grobAuf = null, feldH = null,
    farbF = null, maskeH = null, schatten = null, licht = null, weitH = null,
    kastenA = null, kastenB = null;
// Die Farbleiter als drei Zahlenreihen — je Bildpunkt ein Nachschlagen statt
// eines Zerlegens von '#rrggbb'.
const HYPSO_R = HYPSO.map(h => parseInt(h.slice(1, 3), 16));
const HYPSO_G = HYPSO.map(h => parseInt(h.slice(3, 5), 16));
const HYPSO_B = HYPSO.map(h => parseInt(h.slice(5, 7), 16));
/* ---------- Ein sehr weites Feld, in Zahlen statt auf der Leinwand ----------
   Gebraucht wird eine dritte, viel weitere Glättung — als Bezug für die
   Schärfung, siehe unten. Über die Leinwand ginge das auch, kostete aber eine
   weitere Weichzeichnung **und** ein weiteres Auslesen der Bildpunkte, und das
   Auslesen ist der teuerste Schritt am ganzen Relief.

   Also von Hand, mit laufender Summe: ein Kastenfilter kostet je Bildpunkt
   dasselbe, egal wie breit er ist, und zweimal quer angewendet ergibt er einen
   Dreieckskern, der für einen Bezugswert glatt genug ist. Vier Durchgänge über
   neunzigtausend Zahlen, ohne eine einzige Leinwand anzufassen. */
function kastenX(a, b, r, w, h) {
  const f = 1 / (2 * r + 1);
  for (let y = 0; y < h; y++) {
    const z = y * w;
    let summe = 0;
    for (let x = -r; x <= r; x++) summe += a[z + (x < 0 ? 0 : x > w - 1 ? w - 1 : x)];
    for (let x = 0; x < w; x++) {
      b[z + x] = summe * f;
      const rein = x + r + 1, raus = x - r;
      summe += a[z + (rein > w - 1 ? w - 1 : rein)] - a[z + (raus < 0 ? 0 : raus)];
    }
  }
}
function kastenY(a, b, r, w, h) {
  const f = 1 / (2 * r + 1);
  for (let x = 0; x < w; x++) {
    let summe = 0;
    for (let y = -r; y <= r; y++) summe += a[(y < 0 ? 0 : y > h - 1 ? h - 1 : y) * w + x];
    for (let y = 0; y < h; y++) {
      b[y * w + x] = summe * f;
      const rein = y + r + 1, raus = y - r;
      summe += a[(rein > h - 1 ? h - 1 : rein) * w + x] - a[(raus < 0 ? 0 : raus) * w + x];
    }
  }
}
// Zweimal Kasten, quer und längs — und **normalisiert**: geteilt wird durch
// dieselbe Glättung der Deckung, sonst zöge das Meer die Küste herunter und
// eine Hafenstadt sähe weniger allein aus, als sie ist.
function weitesFeld(r) {
  const n = rW * rH;
  for (let i = 0; i < n; i++) kastenA[i] = grobH[i] * grobM[i];
  kastenX(kastenA, kastenB, r, rW, rH); kastenY(kastenB, kastenA, r, rW, rH);
  kastenX(kastenA, kastenB, r, rW, rH); kastenY(kastenB, weitH, r, rW, rH);
  for (let i = 0; i < n; i++) kastenA[i] = grobM[i];
  kastenX(kastenA, kastenB, r, rW, rH); kastenY(kastenB, kastenA, r, rW, rH);
  kastenX(kastenA, kastenB, r, rW, rH); kastenY(kastenB, kastenA, r, rW, rH);
  for (let i = 0; i < n; i++) weitH[i] = kastenA[i] > 0.02 ? weitH[i] / kastenA[i] : 0;
}

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
const TIEFPASS_GROB = 1.2, TIEFPASS_FEIN = 0.55;
let glattFein = null, glattGrob = null, glattGrobM = null, glattMaske = null, glattDa = false;
function reliefFrisch() { glattDa = false; }
function reliefFeld() {
  const w = Math.max(8, Math.round(breite * RAUF)), h = Math.max(8, Math.round(hoehe * RAUF));
  if (w === rW && h === rH) return;
  rW = w; rH = h;
  for (const k of [hkA, hkB, hkC, hkF]) { k.width = w; k.height = h; }
  fBild = hcF.createImageData(w, h);
  feinH = new Float32Array(w * h); feldH = new Float32Array(w * h);
  grobH = new Float32Array(w * h); grobM = new Float32Array(w * h);
  grobAuf = new Float32Array(w * h); farbF = new Float32Array(w * h);
  maskeH = new Float32Array(w * h); schatten = new Float32Array(w * h);
  licht = new Float32Array(w * h); weitH = new Float32Array(w * h);
  kastenA = new Float32Array(w * h); kastenB = new Float32Array(w * h);
}
// Die Stellschrauben des Reliefs.
// Zwei Sonnen, und das ist Absicht. Die Modellierung braucht ein Licht, das
// hoch genug steht, damit die Hänge noch Zeichnung haben; der Schlagschatten
// braucht ein Licht, das flach genug steht, damit überhaupt einer entsteht —
// ein Strahl, der steiler abfällt als der Hang selbst, trifft nie auf Schatten.
// Kartenzeichner machen das seit jeher so.
/* Das Licht wird in die Farbe gerechnet, nicht mehr darübergelegt: der helle
   Hang laeuft anteilig gegen Weiss, der dunkle gegen Schwarz. Zwei Zahlen
   statt eines Mischmodus, und sie gelten fuer jede Farbe gleich — auch fuer
   die weisse Kappe, an der weiches Licht abprallte.

   Aufhellen wiegt weniger als Abdunkeln: eine Leiter, die oben in Weiss
   endet, hat nach oben kaum noch Weg, nach unten aber viel. */
let STAERKE = 1.6, AUFHELLEN = 0.55, ABDUNKELN = 0.70;
let SONNE = 40;                 // Grad über der Fläche, Licht von oben links
let WURFSONNE = 16;             // dasselbe Licht, flach, nur für den Schlagschatten
let UEBERHOEHT = 30;            // volle Höhe in Bildpunkten des Höhenfelds
let MULDE = 0.85;               // wie stark Mulden verschatten
let WURF = 0.32;                // wie dunkel ein Schlagschatten ist
/* So viele Niveaus, wie es Farbbänder gibt, und beide liegen bei k/NBAND des
   Feldwerts. **Jede Höhenlinie ist damit eine Farbgrenze** und jede Farbgrenze
   trägt ihre Linie. Das ist die Konstruktion eines Schulatlas, und es ist das,
   was eine Höhenlinie auf einer Geländekarte überhaupt tun soll: den
   Farbwechsel begründen, statt quer durch ihn hindurchzulaufen. */
let LINIE = 0.72, NIVEAUS = NBAND, FLACHHANG = 0.0012, DUNKELLINIE = 0.85;
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
  const fein = Math.max(2.2, breite / FEINTEILER);   // enges Weichzeichnen: der einzelne Kreis
  const grob = Math.max(7, breite / GROBTEILER);     // weites: die Landschaft darüber

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
    const v = zuFeld(aufLeiter(HOCH[g]));
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

  /* Ein Kern, zwei Ableitungen, und der Kern ist **geschärft**.

     ENGANTEIL steht über eins, und das ist kein Tippfehler, sondern eine
     Unscharfmaskierung: 1,15 mal das enge Feld minus 0,15 mal das weite. Der
     Grund ist der zweite Teil der Ruhrgebietsfrage. Weichzeichnen erhält das
     Integral über die ganze Karte, aber nicht über einen Ausschnitt — es trägt
     Volumen über die Kreisgrenze hinaus. Wen das trifft, hängt an der
     Nachbarschaft: Berlin, ein dichter Fleck in dünnem Brandenburg, verliert
     nach aussen und bekommt nichts zurück; Essen verliert an Bochum und bekommt
     von Bochum dasselbe wieder. Die Differenz aus engem und weitem Feld ist
     genau dieses Mass — sie ist gross, wo ein Berg allein steht, und null, wo
     ein Plateau liegt. Sie wieder aufzuschlagen gibt dem einzelnen Gipfel
     zurück, was der Weichzeichner ihm genommen hat, und das Plateau lässt sie
     in Ruhe. Über die ganze Karte ist sie mittelwertfrei, das Volumen bleibt
     also die Bevölkerung.

     Gemessen für 2024 steht das Ruhrgebiet danach bei 1,44 mal Berlin, wo die
     Menschen 1,36 stehen — vorher 1,76. Mehr als 1,15 klemmt den Gipfel oben
     wieder an, dann ist nichts gewonnen.

     Aus dem Kern kommen **Farbe und Höhenlinien** unmittelbar. Die
     **Schattierung** ist derselbe Kern, nur mit dem Randabfall multipliziert:
     der Abfall zur Küste hin ist es, der ihr eine Kante gibt, und im Inneren,
     wo die Maske eins ist, sind beide gleich — also liegen Farbe, Linie und
     Licht wirklich aufeinander. Vorher taten sie das nicht: die Schattierung
     mischte eng und weit 40 zu 60, die Farbe 55 zu 45, und der Kommentar
     behauptete trotzdem, es sei dasselbe Feld.

     Daneben bleibt das weite Feld mit seinem eigenen, breiteren Rand; aus ihm
     kommt die Muldenverschattung, die ja gerade die weite Umgebung braucht. */
  weitesFeld(Math.max(3, Math.round(breite / WEITTEILER * s)));
  for (let i = 0; i < n3; i++) {
    grobAuf[i] = grobH[i] * grobM[i];
    let k = ENGANTEIL * feinH[i] + (1 - ENGANTEIL) * grobH[i]
          + SCHAERFE * (feinH[i] - weitH[i]);
    if (k < 0) k = 0; else if (k > 1) k = 1;
    farbF[i] = k;
    feldH[i] = k * (0.40 * maskeH[i] + 0.60 * grobM[i]);
  }

  /* ---------- Schlagschatten ----------
     Das ist der Unterschied zwischen einer gewölbten Fläche und einem
     Gebirge: ein Berg wirft einen Schatten über das, was hinter ihm liegt.
     Gerechnet in einem einzigen Durchgang — das Licht kommt aus genau 45 Grad
     von oben links, also laufen die Strahlen auf der Leinwand diagonal, und je
     Diagonale genügt ein mitgeführter Horizont:

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

      let a = I * STAERKE;
      if (a > HELLMAX) a = HELLMAX; else if (a < -DUNKELMAX) a = -DUNKELMAX;
      licht[i] = a;
    }
  }

  /* ---------- Die Farbe der Karte, und das Licht darin ----------
     Gefärbt wurde bisher Kreis für Kreis: jede Fläche bekam ihre eigene Dichte
     als Ton, und heraus kam ein Mosaik. Die Höhenlinien dagegen kamen aus dem
     weiten Feld, das über die Kreisgrenzen hinweg verläuft. Berlin war deshalb
     ein kleiner Farbfleck in der Form seines Kreises, während sein Berg weit
     darüber hinausreichte — Farbe und Relief widersprachen einander.

     Jetzt kommt die Farbe aus demselben Feld, das die Linien trägt, und das
     Licht wird gleich mit hineingerechnet. Auch das ist neu, und es war ein
     Fehler, es nicht zu tun: die Schattierung lag eine Fassung lang als graues
     Bild im Modus *soft-light* darüber, und weiches Licht kann Weiss nicht
     dunkler machen. Die Rechenvorschrift enthält den Faktor Cb·(1−Cb), und der
     ist bei Weiss null — auf den hellsten Bändern, also genau auf den Gipfeln,
     kam überhaupt keine Hangschattierung an. Ein Aufhellen zum Weiss und ein
     Abdunkeln zum Schwarz hat diese Schwäche nicht, und es spart nebenbei eine
     Leinwand und einen Durchgang.

     Gezeichnet wird das Feld in seiner eigenen, gröberen Auflösung und beim
     Hochrechnen bilinear geglättet: die Bandgrenze wird dadurch ein weicher
     Übergang von ein, zwei Bildpunkten, und die Höhenlinie liegt in seiner
     Mitte. Scharf gerastert sähe dieselbe Grenze treppig aus. */
  /* Hier lief die Farbe eine Fassung lang anteilig gegen die Farbe des
     Bildmittels — dieselbe Bremse wie beim Relief, und aus demselben Grund:
     im vollen Kartogramm wurden aus den Rundungsresten des
     Diffusionsverfahrens sichtbare Farbbänder. Mit dem Kartogramm ist auch
     sie weg; das Feld färbt jetzt unvermittelt. */
  const fo = fBild.data;
  for (let i = 0; i < n3; i++) {
    const k = bandIdx(farbF[i]);
    let r = HYPSO_R[k], g = HYPSO_G[k], b = HYPSO_B[k];
    const a = licht[i];
    if (a > 0) { r += (255 - r) * a * AUFHELLEN; g += (255 - g) * a * AUFHELLEN; b += (255 - b) * a * AUFHELLEN; }
    else if (a < 0) { const f = 1 + a * ABDUNKELN; r *= f; g *= f; b *= f; }
    const j = i << 2;
    fo[j] = r; fo[j + 1] = g; fo[j + 2] = b; fo[j + 3] = 255;
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

  hoehenLinien(s);
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
    ctx.globalAlpha = Math.min(1, LINIE * st * (hell ? 1 : DUNKELLINIE));
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
    /* Wie lange dieses Niveau durchhält, wenn die Linien zusammenrücken.

       Vorher blendeten **alle** Linien aus, sobald zwei Niveaus auf der
       Leinwand näher als vier Bildpunkte beieinander lagen, und unter
       anderthalb waren sie ganz weg. Das trifft genau den steilsten Hang —
       also Berlin, dessen Flanke in wenigen Bildpunkten durch fünf Niveaus
       fällt. Heraus kam die Umkehrung dessen, was eine Höhenlinie tun soll:
       je steiler das Gelände, desto weniger Linien.

       Jetzt wird ausgedünnt, wie es ein Kartenzeichner tut: jedes vierte
       Niveau hält am längsten durch, dann jedes zweite, dann der Rest. Am
       steilen Hang bleiben vier Linien statt keiner, und ihr Abstand
       untereinander ist wieder lesbar. */
    const haelt = (n % 4 === 0) ? 4 : (n % 2 === 0) ? 2 : 1;
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
          const abstand = (ql > 1e-7 ? je / (ql * NIVEAUS) : 1e9) * haelt;
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
  [skalaVon, skalaBis] = hoehenSkala();
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
  ctx.fillStyle = HYPSO[bandIdx(mitteImFeld())];
  ctx.fill(sil, 'evenodd');

  /* Keine Grenzen mehr, weder um die Kreise noch um die Länder. Eine
     Geländekarte hat keine; sie hat Farbe, Hang und Höhenlinie, und die
     zeigen dieselbe Grenze dort, wo sie etwas bedeutet — wo sich die Dichte
     ändert. Wo zwei Nachbarn gleich dicht wohnen, war der Strich ohnehin nur
     Verwaltung. */

  reliefUeber(sil, deck);

  beschrifte(deck, w);
  schreibe(a, b, u, w, deck);
  notizen();
}

const nf = new Intl.NumberFormat('en-GB');
function schreibe(a, b, u, w, deck) {
  const zwischen = u > 0.001 && u < 0.999;
  let summe = 0; for (let k = 0; k < NK; k++) summe += w[k] * deck[k];
  document.getElementById('jahrZahl').textContent = zwischen ? Math.round(jahr) : D.B[u < 0.5 ? a : b].jahr;
  /* Zwischen zwei Zählungen ist die Zahl **keine Zählung**, und das muss
     danebenstehen. Sonst liest sich „1941 · 60,5 Millionen" wie ein Befund,
     und im Krieg wäre das ein falscher: die beiden Enden sind gezählt (59,6
     Mio 1939, 66,2 Mio 1946/1950 — die Vertriebenen), der Weg dazwischen ist
     eine monotone Kurve und keine Geschichte. In Wirklichkeit fiel die Zahl
     erst und stieg dann in zwei Jahren.

     Auf schmalen Schirmen die kurze Fassung, sonst schöbe sie sich über die
     Karte. */
  const eng = document.getElementById('buehne').clientWidth < 620;
  const bev = (summe / 1e6).toFixed(1);
  document.getElementById('jahrBev').textContent = zwischen
    ? '≈ ' + bev + ' million' + (eng ? '' : ' people') + ' · '
      + (eng ? D.B[a].jahr + ' → ' + D.B[b].jahr
             : 'interpolated between the counts of ' + D.B[a].jahr + ' and ' + D.B[b].jahr)
    : bev + ' million people' + (eng ? '' : ' · counted '
      + D.B[u < 0.5 ? a : b].stichtage.join(', '));
  // Die Legende hängt nicht mehr am Jahr: sie sagt einen Satz, und die Zahlen
  // auf der Leiter stehen fest. Einmal gesetzt, nicht je Bild.
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
/* Der Vorrat, nicht die Auswahl: Kreis und kurzer Name. */
const STADT = ${JSON.stringify(staedte.map(k => [k.i, k.kurz]))};
const ZEIGE = 17;      // so viele Namen zur selben Zeit
/* Wie weit zwei Namen auseinanderliegen müssen — und zwar **auf dem Bild**,
   nicht auf der Landkarte. Das war vorher ein fester Abstand von sechzig
   Kilometern, und daran ging das Ruhrgebiet zugrunde: Köln liegt 55 Kilometer
   von Essen entfernt, warf es also aus der Liste, obwohl Essen 1910 mit
   477 611 Menschen die neuntgrösste Stadt des Landes war. Übrig blieb ein
   einziger Name für eine Region, in der sechs Städte unter den zwanzig
   grössten lagen.

   Gedrängt wird aber nicht auf der Landkarte, sondern auf dem Bild — und der
   feste Boden ist ein halb eingemischtes Kartogramm, zieht das Ruhrgebiet
   also auseinander: dort sind es rund zwei Bildpunkte je Kilometer, im Land
   im Mittel 0,9. Derselbe Abstand auf dem Bild lässt dem Revier damit gut die
   doppelte Zahl an Namen, und genau da braucht man sie.

   Gemessen wird in Bodenmass, als Bruchteil der Kartenbreite. Damit hängt die
   Auswahl an nichts als der Karte: dieselben Städte auf dem Telefon wie auf
   dem Schirm, gleich wie hoch oder breit das Fenster gerade steht. */
const ABSTANDTEILER = 12;   // Mindestabstand = Kartenbreite / 12
const SAUM = 0.06;     // wie weit unter der Schwelle ein Name ausblendet, im Logarithmus
const STUFUNG = 14;    // um diesen Faktor über der Schwelle ist die Schrift am grössten
/* Hier stand ein feiner dunkler Strich um jede der hundertsieben kreisfreien
   Städte. Er hatte seinen Grund, solange sich die Karte verformte: eine Stadt
   wuchs dann mit ihrer Bevölkerung, und der Umriss sagte, wie weit sie reicht.
   Seit der Boden stillsteht, sagt er das nicht mehr — die Grundfläche ist über
   alle Jahre dieselbe, der Strich zeigt also nur noch Verwaltung. Und er war
   das Letzte, was von den Kreisgrenzen übrig war. Eine Geländekarte hat keine
   Grenzen; sie hat Gelände. */
const MINSCHRIFT = 7;       // kleinste Schrift; auf einem Telefon knapp, aber lesbar
/* Welche Städte gerade einen Namen bekommen. Nicht ein für alle Mal die
   siebzehn grössten von heute, sondern die siebzehn grössten **jetzt**: die
   Auswahl läuft in jedem Bild neu über die laufende Einwohnerzahl. 1871 stehen
   damit Karlsruhe, Kassel und Erfurt auf der Karte und Bielefeld, Mannheim und
   Kiel nicht; heute ist es umgekehrt. Chemnitz und Magdeburg sind 1871 unter
   den zwölf grössten und heute die letzten der Liste — das ist die Geschichte,
   die der Berg daneben erzählt, noch einmal in Schrift.

   Zwei Regeln wie vorher: aus einem Bündel eng benachbarter Städte bleibt die
   grösste, sonst hiesse das Ruhrgebiet siebenmal; und gemessen wird auf der
   Landkarte, nicht auf dem gezogenen Boden.

   Der Übergang darf nicht springen. Die **Schwelle** ist der Wert des
   siebzehnten Namens; wer darüber liegt, steht voll da, wer darunter rutscht,
   blendet über einen Saum von sechs Prozent aus. Im Augenblick des Wechsels
   sind beide gleich gross, also ist die Blende dort gerade offen — niemand
   erscheint oder verschwindet plötzlich, die Namen werden blass und dicht wie
   die Berge unter ihnen. */
/* Fläche und Schwerpunkt jeder Stadt auf dem festen Boden, einmal gerechnet.
   Der Boden steht still, also ändern sie sich nie; mal mass ergibt beides den
   Wert auf dem Schirm. Vorher lief diese Schleife in jedem Bild über die
   Ringe jeder beschrifteten Stadt. */
let ORTE = null;
function orte() {
  if (ORTE) return ORTE;
  ORTE = STADT.map(([g]) => {
    let bestA = 0, mx = 0, my = 0;
    for (const r of GEBIETE[g]) {
      let A2 = 0, sx = 0, sy = 0;
      for (let i = 0, n = r.length; i < n; i++) {
        const a = r[i], b = r[(i + 1) % n];
        const xa = px[a], ya = py[a], xb = px[b], yb = py[b];
        const f = xa * yb - xb * ya;
        A2 += f; sx += (xa + xb) * f; sy += (ya + yb) * f;
      }
      const A = Math.abs(A2 / 2);
      if (A > bestA) { bestA = A; mx = sx / (3 * A2); my = sy / (3 * A2); }
    }
    return [mx, my, bestA];
  });
  return ORTE;
}
function auswahl(deck, w) {
  const O = orte(), eng = reihe.rahmen.w / ABSTANDTEILER;
  const kand = [];
  for (let i = 0; i < STADT.length; i++) {
    const g = STADT[i][0];
    if (deck[g] > 0.5 && w[g] > 0 && O[i][2] > 0) kand.push(i);
  }
  kand.sort((a, b) => w[STADT[b][0]] - w[STADT[a][0]]);
  const durch = [];
  for (const i of kand) {
    let nah = false;
    for (const j of durch) if (Math.hypot(O[j][0] - O[i][0], O[j][1] - O[i][1]) < eng) { nah = true; break; }
    if (nah) continue;
    durch.push(i);
    // Ein paar über der Grenze mitnehmen: das sind die, die gerade ausblenden.
    if (durch.length >= ZEIGE + 5) break;
  }
  const schwelle = durch.length >= ZEIGE ? w[STADT[durch[ZEIGE - 1]][0]] : 0;
  return { durch, schwelle };
}
function beschrifte(deck, w) {
  const liste = [];
  const O = orte();
  const { durch, schwelle } = auswahl(deck, w);
  for (let r = 0; r < durch.length; r++) {
    const [g, name] = STADT[durch[r]];
    /* Sichtbarkeit und Schriftgrösse kommen beide aus dem Verhältnis zur
       Schwelle, nicht aus der Einwohnerzahl selbst. Das ist Absicht: der Berg
       sagt, wie viele Menschen da sind — absolut, über hundertfünfzig Jahre
       vergleichbar. Der Name sagt, wer hier gerade zu den grössten gehört. In
       absoluten Zahlen wäre Chemnitz heute grösser geschrieben als 1871, obwohl
       es damals die elftgrösste Stadt war und heute die sechzehnte. */
    const sicht = glatt(Math.max(0, Math.min(1,
      r < ZEIGE ? 1 : 1 - Math.log(schwelle / w[g]) / SAUM)));
    // Unter einem Zwölftel Deckkraft ist ein Name nicht mehr zu sehen, kostet
    // aber Schwerpunkt, Punkt und Strich. Dort endet die Blende.
    if (sicht < 0.08) continue;
    const o = O[durch[r]];
    const bestA = o[2] * mass * mass, mx = o[0] * mass + verX, my = o[1] * mass + verY;
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
    {
      /* Der Versatz hat zwei Teile. Der eine hängt am Fleck — bei einem grossen
         rückt der Name weiter herunter, damit der Gipfel frei bleibt. Der
         andere ist ein fester Abstand zur Kartenbreite: ohne ihn klebt die
         Schrift einer kleinen Stadt am Punkt, weil deren Fleck kaum Versatz
         hergibt. */
      const versatz = Math.sqrt(bestA / Math.PI) * 0.5 + breite / 90;
      // ox/oy ist der Ort selbst, mx/my der Ankerpunkt der Schrift darunter.
      liste.push({ name, A: bestA, sicht, gross: w[g] / schwelle,
        ox: mx, oy: my, mx, my: my + versatz });
    }
  }
  liste.sort((a, b) => b.A - a.A);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';

  /* Grösse: stufenlos, aus dem Logarithmus des Verhältnisses zur Schwelle.
     Der kleinste Name der Auswahl bekommt breite/56, wer vierzehnmal so gross
     ist wie er, breite/33; dazwischen läuft es gleichmässig. Die Spreizung ist
     weiter als die der vier alten Stufen (52 bis 38): weil die Grösse jetzt
     etwas aussagt, soll man sie auch sehen — Berlin steht in jedem Bild fast
     doppelt so gross da wie der letzte Name der Auswahl. Angegeben als
     Teiler der Kartenbreite, damit dieselbe Ordnung auf dem Telefon und auf dem
     Schirm gilt — Berlin lief sonst in jeder Grösse gegen dieselben dreissig
     Bildpunkte und stand als Überschrift über der Karte statt als Beschriftung
     darin.

     Dass die Schrift am Verhältnis hängt und nicht an der Einwohnerzahl, hält
     die Ordnung über hundertfünfzig Jahre lesbar: der Abstand zwischen der
     grössten Stadt und der siebzehnten liegt in jedem Bild zwischen zwölf und
     zweiundzwanzig — 1871 wie 2024. Eine absolute Skala hätte 1871 siebzehn
     gleich kleine Namen gezeigt, weil ausser Berlin keine Stadt 500 000
     Menschen hatte.

     Vorher waren es vier feste Stufen nach der höchsten Einwohnerzahl, die eine
     Stadt je hatte. Das stand still, während die Karte lief. */
  const KLEIN = 56, GROSS = 33;
  for (const s of liste) {
    ctx.font = '600 10px system-ui,-apple-system,sans-serif';
    s.je10 = ctx.measureText(s.name).width / 10;
    const t = Math.max(0, Math.min(1, Math.log(s.gross) / Math.log(STUFUNG)));
    s.hoch = Math.max(MINSCHRIFT, breite / (KLEIN + (GROSS - KLEIN) * t));
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
      // Der Luftspalt hängt an der Schrift, nicht an einer festen Zahl: vier
      // Bildpunkte sind bei einer 24-Punkt-Schrift ein Haar und sahen aus wie
      // ein zusammengewachsenes Wort („HannoverBraunschweig").
      const ux = (a.br + b.br) / 2 + (a.hoch + b.hoch) * 0.28 - Math.abs(dx);
      const uy = (a.hoch + b.hoch) / 2 + (a.hoch + b.hoch) * 0.18 - Math.abs(dy);
      if (ux <= 0 || uy <= 0) continue;
      /* Jeder weicht so weit aus, wie der andere **da** ist. Ein Name, der
         gerade ausblendet, schiebt darum kaum noch — sonst rückte die halbe
         Karte in dem Augenblick zur Seite, in dem ein siebzehnter Name unter
         die Schwelle rutscht, und das wäre ein Sprung an einer Stelle, an der
         nichts springen soll. Weggeschoben wird er trotzdem voll. */
      if (uy / (a.hoch + b.hoch) < ux / (a.br + b.br)) {
        const v = (dy >= 0 ? 1 : -1) * uy * 0.45; a.y -= v * b.sicht; b.y += v * a.sicht;
      } else {
        const v = (dx >= 0 ? 1 : -1) * ux * 0.45; a.x -= v * b.sicht; b.x += v * a.sicht;
      }
    }
    /* Abstossen und Feder stehen im Gleichgewicht, und das heisst: die
       Überlappung wird nie ganz aufgelöst, sondern nur bis auf Feder/(Feder +
       Abstossung). Bei 0,08 gegen 0,3 blieb ein Fünftel stehen — genug, dass
       aus zwei Namen ein Wort wurde. Bei 0,05 gegen 0,45 ist es ein Zehntel. */
    for (const s of liste) { s.x += (s.mx - s.x) * 0.05; s.y += (s.my - s.y) * 0.05; }
    /* Und keiner darf aus der Leinwand laufen. Mönchengladbach liegt so weit
       im Westen, dass sein Name auf dem Telefon zwanzig Bildpunkte links neben
       der Karte begann — das M war weg. Das Klemmen steht **innerhalb** der
       Runden, nicht danach: so weicht der Nachbar in der nächsten Runde aus,
       statt dass zwei Namen am Rand übereinanderstehen. */
    for (const s of liste) {
      const halb = s.br / 2 + 2, rand = s.hoch * 0.7;
      s.x = Math.max(halb, Math.min(breite - halb, s.x));
      s.y = Math.max(rand, Math.min(hoehe - rand, s.y));
    }
  }

  for (const s of liste) {
    // Ein Name, der gerade unter die Schwelle rutscht, geht mitsamt seinem
    // Punkt und seinem Strich aus — sonst bliebe ein roter Fleck ohne Namen.
    ctx.globalAlpha = s.sicht;
    ctx.font = '600 ' + s.hoch.toFixed(1) + 'px system-ui,-apple-system,sans-serif';
    /* Ein kleiner roter Punkt auf dem Ort selbst. Der Name steht darunter, und
       ohne den Punkt sagt er nur ungefähr, wo die Stadt liegt — seit die
       Stadtumrisse weg sind, sagt es sonst niemand mehr. Rot, weil es die
       einzige Farbe ist, die auf dieser Leiter nichts bedeutet: Wasser, Grün,
       Gelb, Orange und Weiss sind Daten, ein roter Punkt ist eine Marke. Ein
       dunkler Ring darum, damit er auch auf dem roten Band und im Schnee steht. */
    const punkt = Math.max(0.8, Math.min(1.7, breite / 380));
    ctx.beginPath(); ctx.arc(s.ox, s.oy, punkt + 0.6, 0, 6.2832);
    ctx.fillStyle = STRICH; ctx.fill();
    ctx.beginPath(); ctx.arc(s.ox, s.oy, punkt, 0, 6.2832);
    ctx.fillStyle = STADTPUNKT; ctx.fill();

    // Weit ausgewichen? Dann ein Strich vom Punkt zum Namen. Gemessen wird ab
    // dem Punkt, nicht ab dem Ankerpunkt — der liegt ohnehin immer ein Stück
    // darunter, und ein Strich für diesen Versatz allein wäre nur Gestrüpp.
    if (Math.hypot(s.x - s.ox, s.y - s.oy) > s.hoch * 1.8) {
      ctx.beginPath(); ctx.moveTo(s.ox, s.oy); ctx.lineTo(s.x, s.y);
      ctx.strokeStyle = STRICH; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(s.ox, s.oy); ctx.lineTo(s.x, s.y);
      ctx.strokeStyle = INK; ctx.lineWidth = 0.7; ctx.globalAlpha = s.sicht * 0.45; ctx.stroke();
      ctx.globalAlpha = s.sicht;
    }
    ctx.lineWidth = Math.max(2, s.hoch * 0.2); ctx.strokeStyle = STRICH;
    ctx.strokeText(s.name, s.x, s.y);
    ctx.fillStyle = INK; ctx.fillText(s.name, s.x, s.y);
  }
  ctx.globalAlpha = 1;
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
/* Hier stand „fixed ground" mitten in der Zeile, zwischen zwei Jahreszahlen:
   „× the 2024 average density · fixed ground · 1871-12-01". Drei Sachen,
   durch Mittelpunkte aneinandergereiht, und die mittlere las sich wie eine
   Eigenschaft der Jahreszahl daneben. Das Wort stand da, solange man zwischen
   Landkarte und Kartogramm umschalten konnte und die Legende sagen musste,
   was gerade eingestellt ist. Es gibt nur noch eine Form; wie sie gemacht
   ist, steht in der Methodik.

   Übrig bleiben zwei Angaben, jede mit einem Wort davor, das sagt, was sie
   ist: wofür das Kreuz an den Enden der Leiter steht, und wann gezählt
   wurde. */
function legende() {
  /* Harte Stufen statt eines weichen Verlaufs. Ein Verlauf setzt seine
     Stützstellen auf k/(N−1) und mischt dazwischen; die Bänder der Karte
     liegen aber auf k/N und mischen nicht. Der Unterschied ist klein und
     ausgerechnet an der einen Stelle sichtbar, auf die es hier ankommt: das
     Ufer lag im Verlauf drei Prozent links von der Zahl, die darunter steht.
     Jetzt zeigt die Leiter dieselben fünfundzwanzig Bänder wie die Karte, und
     die Uferkante fällt genau auf die ×0,5. */
  const n = HYPSO.length, halt = [];
  for (let i = 0; i < n; i++)
    halt.push(HYPSO[i] + ' ' + (100 * i / n).toFixed(3) + '% ' + (100 * (i + 1) / n).toFixed(3) + '%');
  document.getElementById('rampe').style.background = 'linear-gradient(90deg,' + halt.join(',') + ')';
  stufen();
  legText();
}
/* ---------- Die Zahlen auf der Leiter ----------
   Sechs Marken, alle rund oder halb, jede an ihrer wirklichen Stelle. Weil die
   Leiter linear teilt und bei ×2,5 endet, sitzen sie bei 0, 20, 40, 60 und 80
   Prozent — gleichmässig, und ×1 damit bei 40 Prozent und nicht in der Mitte.

   Das ist keine Schieflage, sondern die Ansage, wo die Leiter aufhört. In der
   Mitte stünde ×1 nur bei einem Ende von ×2,0, und dort ist zu wenig Platz:
   über ×2,0 liegen 2024 noch sieben Prozent der Fläche — Berlin, München,
   Frankfurt, das halbe Ruhrgebiet —, und die müssten sich das letzte Fünftel
   der Farben teilen. Über ×2,5 liegt nur noch ein halbes Prozent.

   Die letzte Marke ist die ×3, und sie steht am Ende der Rampe (99 Prozent).
   Dass auf die ×2 keine ×2,5 folgt, sondern gleich die ×3, hat einen Grund:
   ab ×2,222 biegt das Knie die Leiter weich um, und das letzte Fünftel der
   Rampe trägt deshalb eine ganze statt einer halben Stufe. Die Marken stehen
   damit alle rund zwanzig Prozent auseinander, und die Zahlen sagen, dass der
   letzte Schritt der doppelte ist.

   Ein Deckel ist die ×3 nicht. Die Rampe endet rechnerisch im Unendlichen;
   der höchste Kreis überhaupt ist München 2024 mit ×3,16, und abgeschnitten
   wird nichts. */
/* Die Eins sollte einmal ihren Namen tragen statt ihrer Zahl — „Germany 2024"
   direkt auf der Marke, dann erklärt sich die Leiter von allein. Nachgemessen
   war es zu breit: die Beschriftung braucht 86 Bildpunkte, die Marken stehen
   bei 360 Bildpunkten Fensterbreite aber nur 52 auseinander. Sie hätte die
   ×0,5 und die ×1,5 überschrieben, und die ×0,5 ist die Uferkante. Also bleibt
   die Zahl auf der Marke, und die Zeile darunter sagt, wo das Land steht. */
const MARKEN = [0, 0.5, 1, 1.5, 2, 3];
const MARKENWORT = {};
function stufen() {
  const [, bis] = hoehenSkala(), hi = Math.exp(bis), e = document.getElementById('legStufen');
  const zeig = x => (x >= 10 ? x.toFixed(0) : x >= 1 ? x.toFixed(1) : x.toFixed(1));
  e.textContent = '';
  for (const m of MARKEN) {
    const s = document.createElement('span');
    s.textContent = MARKENWORT[m] || (m === 0 ? '0' : '×' + zeig(m));
    // Feldwert, nicht Leiterwert: die Reserve über dem Quantil zählt mit.
    s.style.left = (100 * aufLeiter(m) / (1 + RESERVE)).toFixed(2) + '%';
    if (m === 0) s.className = 'a';
    if (m === MARKEN[MARKEN.length - 1]) s.className = 'z';
    e.appendChild(s);
  }
}
/* ---------- Und darunter ein einziger Satz ----------
   Da standen einmal drei Angaben nebeneinander — wofür das Kreuz steht, wo der
   Meeresspiegel liegt, wann gezählt wurde —, und jede davon steht jetzt
   woanders besser: die Zahlen auf der Leiter selbst, der Stichtag im Tippen.
   Übrig bleibt der eine Satz, der sagt, was die Karte misst.

   Und der sagte eine Fassung lang zu viel. „× the average population density of
   Germany 2024" verspricht **wirkliche Dichte**, und die ist es nicht: gefärbt
   wird Bevölkerung je **gezeichneter** Fläche, und der Boden ist ein halb
   eingemischtes Kartogramm. Gemessen für 2024 geht das auseinander, wo man
   zuerst hinsieht — München steht auf ×3,16 und ist wirklich ×20,7 (4 844
   E/km²), Berlin auf ×2,36 und ist ×17,7, die Prignitz auf ×0,25 und ist
   ×0,15. Der Verzerrungsfaktor läuft von 0,57 bis 7,5, im Median 0,99: für
   einen gewöhnlichen Landkreis stimmte der Satz, für Städte nicht.

   Der erste Versuch dagegen war „volume = people · ×1 = the German average of
   2024", und der war ehrlich, aber nicht lesbar: zwei Gleichungen nebeneinander,
   und keine sagt, wovon das Mittel eigentlich das Mittel ist.

   Jetzt zwei Halbsätze statt zweier Gleichungen — **was gemessen wird**, und
   **wo die Eins liegt**:

       people per patch of map · ×1 = Germany in 2024

   „per patch of map" ist die ganze Ehrlichkeit in vier Wörtern: nicht je
   Quadratkilometer, sondern je Stück gezeichneter Karte, und die ist verzerrt.
   Wer daraufhin fragt, wie viele es denn je km² sind, tippt einen Kreis an —
   im Zettel stehen beide Zahlen nebeneinander. Dass das Volumen die
   Bevölkerung ist, steht nicht mehr hier: das ist ein Bauprinzip und kein
   Schlüssel zur Farbleiter, und es steht in der Methodik.

   Und dann stand da „people per patch of map · ×1 = Germany in 2024" und war
   an einer Stelle immer noch nicht zu verstehen: **an der Eins**. „×1 =
   Germany in 2024" liest sich wie eine Gleichung zwischen einer Zahl und einem
   Land, und das ist keine. Gemeint ist ein **Ort auf der Leiter**.

   Ein Verb reicht:

       people per patch of map · Germany 2024 sits at ×1

   Jetzt sucht das Auge die ×1 auf der Leiter und findet dort das ganze Land;
   alles links davon ist leerer, alles rechts voller. Dass das Mittel **fest**
   ist und nicht das des laufenden Jahres, steht in der Jahreszahl: 1871 liegt
   Deutschland links von seiner eigenen Marke, und das ist der Befund. */
function legText() {
  document.getElementById('legText').textContent =
    'people per patch of map · Germany 2024 sits at ×1';
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
    /* Zwei Zahlen, und sie sind nicht dieselbe. „Per km²" ist die wirkliche
       Dichte auf der amtlichen Fläche, samt Vielfachem des Landesmittels von
       2024; „Height here" ist, wie hoch der Kreis auf dieser Karte steht, also
       Menschen je **gezeichneter** Fläche. Der Boden ist ein halb
       eingemischtes Kartogramm, deshalb gehen die beiden bei den Städten um
       das Fünf- bis Siebenfache auseinander. Hier stehen sie nebeneinander —
       das ist der einzige Ort, an dem sich der Unterschied zeigen lässt, ohne
       die Karte mit Text zuzudecken. */
    + (k[4] ? '<dt>Per km²</dt><dd>' + nf.format(Math.round(v / k[4]))
        + ' · ×' + ((v / k[4]) / landesDichte()).toFixed(1) + '</dd>' : '')
    + (HOCH[treffer] > 0
      ? '<dt>Height here</dt><dd>×' + HOCH[treffer].toFixed(1) + '</dd>' : '')
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
addEventListener('resize', () => { masse(); reliefFrisch(); zeichne(); });
/* Und dasselbe, wenn sich das Feld ändert, ohne dass das Fenster es tut.
   Die Massfunktion misst die Leinwand einmal und hält die Zahl; ändert das Auslegen
   danach noch etwas — eine Zeile, die sich füllt, eine Schrift, die nachlädt —,
   zeichnet die Karte weiter für die alte Grösse, und die Leinwand wird per CSS
   auf die neue gestreckt. Genau so war sie eine Fassung lang um drei Prozent
   gestaucht. Der Beobachter macht daraus einen Nicht-Fehler: wer die Grösse
   ändert, löst das Neumessen aus, egal wer es war. */
if (window.ResizeObserver) {
  let zuletztW = 0, zuletztH = 0;
  new ResizeObserver(() => {
    const f = cv.parentElement;
    if (f.clientWidth === zuletztW && f.clientHeight === zuletztH) return;
    zuletztW = f.clientWidth; zuletztH = f.clientHeight;
    masse(); reliefFrisch(); zeichne();
  }).observe(cv.parentElement);
}

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
