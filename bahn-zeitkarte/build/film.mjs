// Macht aus der fertigen Seite ein hochkantes mp4 — fuer alles, wo eine
// Webseite nicht hinpasst.
//
//   node film.mjs film.mp4
//
// Der Inhalt ist der der Seite, nichts nachgebaut: sie wird geladen, die
// Bedienung ausgeblendet, dann Bild fuer Bild weitergestellt. Anders als bei
// `eiszeit-europa` hat diese Seite keine Uhr — sie ist ein Werkzeug mit drei
// Reglern und keine Zeitreihe. Die Abfolge steht darum **hier** (siehe AKTE
// weiter unten) und nicht in der Seite: ein Filmdrehbuch in einer Seite, die
// niemand als Film benutzt, waere totes Gewicht fuer jeden Besucher.
//
// Braucht playwright-core und ffmpeg-static, beide **nicht im Repo** — das hier
// ist Werkzeug, keine Seite, und die Regel „keine Abhaengigkeiten" gilt fuer
// alles, was ausgeliefert wird.
//
//   cd build && npm install playwright-core ffmpeg-static
//
// Umgebungsvariablen: SATZ UEBER FEIN FPS ABSCHNITT BROWSER BEHALTEN,
// MESSEN=1 misst nur die Bildzeit mehrerer Einstellungen und schreibt nichts.

import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { resolve, dirname, join, extname } from 'node:path';
import { mkdirSync, existsSync, writeFileSync, readFileSync, rmSync,
         createReadStream, statSync } from 'node:fs';

const [, , ziel = 'film.mp4'] = process.argv;
const FPS = Number(process.env.FPS || 30);
const BREITE = 1080, HOEHE = 1920;        // was auf Reddit hochgeht
const HOCH_B = 1440, HOCH_H = 2560;       // die zweite, ungedeckelte Fassung
/* Kein Standbild am Ende: der Film endet auf seinem Anfangsbild, damit die
   Schleife, in der solche Videos laufen, ohne Schnitt zusammengeht. */
const NACH = Number(process.env.NACH || 0);

/* ---------------------------------------------------- Wie gross gerechnet wird
   Drei Groessen, und es ist wichtig, sie auseinanderzuhalten:

   SATZ    die Breite in CSS-Punkten, in der die **Seite gesetzt** wird. Sie
           entscheidet ueber das Bild, nicht ueber die Schaerfe: wie gross die
           Schrift zur Karte steht, wo das CSS auf Hochkant umschaltet, wie
           viele Namen das Budget hergibt. 540 ist die halbe Zielbreite und
           trifft die Telefonspalte, fuer die die Seite gemacht ist.
   UEBER   der Punktdichtefaktor, mit dem dieser Satz gerendert wird. Die
           Leinwand steht damit auf SATZ x UEBER Punkten — bei 540 und 4 also
           2 160, dem Doppelten der Zielbreite. Am Ende wird auf 1 080
           heruntergerechnet, aus je vier gerechneten Punkten wird einer. Das
           ist Kantenglaettung durch Ueberabtastung, und auf Hoehenlinien und
           Acht-Punkt-Schrift ist sie der sichtbarste Unterschied ueberhaupt.
           Die Seite deckelt DPR bei 2, ein Film darf mehr.
   FEIN     CSS-Punkte je Feldzelle, also FEINHEIT der Seite. Die Zahl der
           Zellen quer ist SATZ/FEIN und haengt **nicht** am Zoom: bei FEIN 0,5
           traegt das Feld 1 080 Zellen, genau die Zielbreite; bei 0,25 das
           Doppelte. Die Seite steht auf 1,0, weil dort jedes Bild in Echtzeit
           fallen muss. Gemessen mit MESSEN=1 (Werte in STAND.md).

   Das Ziel durch UEBER zu teilen, statt SATZ eigens zu setzen, ist der Fehler,
   der in der Vorlage einmal drinstand: die Leinwand kommt dann genau auf die
   Zielgroesse heraus, und ueberabgetastet wird gar nichts. */
const SATZ = Number(process.env.SATZ || Math.round(BREITE / 2));
const UEBER = Number(process.env.UEBER || 4);
const FEIN = Number(process.env.FEIN || 0.34);

/* Gerechnet wird in Abschnitten, jeder fuer sich ein mp4, am Ende
   aneinandergehaengt. Drei Stunden an einem Stueck sind drei Stunden, in denen
   nichts schiefgehen darf; so ist die teuerste verlorene Arbeit ein Abschnitt.
   Wer neu startet, ueberspringt, was schon dasteht. */
const ABSCHNITT = Number(process.env.ABSCHNITT || 240);

const { chromium } = await import('playwright-core');
const ffmpeg = (await import('ffmpeg-static')).default;

const CSSB = SATZ, CSSH = Math.round(SATZ * HOEHE / BREITE);

/* --------------------------------------------------------------- Das Drehbuch
   Je Akt: Sekunden, der Text unter der Karte, und was der Akt mit den vier
   Groessen macht, die diese Seite ausmachen — Morph, Anteil, Zoom und der
   gewaehlte Bahnhof. `u` laeuft von 0 bis 1 durch den Akt.

   Die Reihenfolge ist nicht beliebig. Zuerst die Verformung, weil sie das
   einzige ist, was in den ersten drei Sekunden ueberzeugt; dann der
   Anteilsregler, der erklaert, woher die Hoehe kommt; zuletzt die Kamera an
   einem einzelnen Bahnhof, weil man da schon weiss, was man sieht. */
const weich = u => u * u * (3 - 2 * u);                  // sanft an und ab
/* Der Wasserstand wird intern als Aufschlag auf den besten Bahnhof gefuehrt,
   und gewaehlt ist er so, dass Berlin **gerade so** ein See ist.
   Nicht nach Berlins eigener Hoehe: die liegt bei 293 Minuten, also 61 ueber
   dem besten Bahnhof — bei 62 Aufschlag blieb Berlin trocken. Ueberflutet wird
   nicht der Bahnhof, sondern das **gemalte Feld** an seinem Ort, und das liegt
   dort 35 Minuten hoeher (96 Aufschlag, 329 absolut): Berlin ist eine Insel
   guter Anbindung in einem schlecht angebundenen Brandenburg, und die Glaettung
   zieht es hoch. Einen Zaehler darueber, und der Punkt geht unter, ohne dass
   der See schon bis Potsdam reicht. Nachgemessen, nicht geraten. */
const WASSER = 97;
/* Die Standbilder sind kurz, und das hat mit der Schleife zu tun. Der Film
   endet dort, wo er anfaengt — bei Morph 0 —, also **addiert** sich ein
   Standbild am Ende zu dem am Anfang. Zwei mal 3,5 Sekunden waren an der Naht
   sieben Sekunden Stillstand, und die fielen auf. Jetzt gibt es am Ende gar
   keines: das Standbild am Anfang **ist** das der Naht, und es dauert 1,6
   Sekunden. Der Halt in der Zeitkarte liegt mitten im Film und braucht die
   Zugabe nicht, also 2,4 statt 5. */
const AKTE = [
  { s: 1.6, t: '<b>Height is time.</b> How long until half of Germany is '
              + 'within reach by train — from every one of 4,781 stations.',
    f: () => ({ morph: 0 }) },
  { s: 13, t: '<b>Now distance becomes travel time.</b> Every station moves to '
             + 'where the timetable puts it, and the coastline comes along.',
    f: u => ({ morph: weich(u) }) },
  { s: 2.4, t: '<b>The time map.</b> The high-speed cross pulls together; '
              + 'branch lines fly out to sea and become islands.',
    f: () => ({ morph: 1 }) },
  { s: 9, t: '<b>And back.</b> Same heights, same stations — only the places '
            + 'return to their coordinates.',
    f: u => ({ morph: 1 - weich(u) }) },
];

const KURZ = Number(process.env.KURZ || 1);
for (const k of AKTE) k.s /= KURZ;
const LAUF = AKTE.reduce((a, k) => a + k.s, 0);

/* Aus den Akten ein Bild: welcher Akt, wie weit hinein, und wie stark der Text
   gerade steht. Der Text blendet nur dann aus, wenn der naechste Akt einen
   anderen hat — sonst blinkte er an jeder Aktgrenze. */
/* Kurz, weil der Halt kurz ist: an der Naht der Schleife kreuzen sich die
   Blenden des letzten und des ersten Akts, das Bild bei t = 0 ist also der
   Kreuzungspunkt und zeigt keinen Text. Bei 0,45 Sekunden gingen davon mehr
   als ein Viertel des 1,6-Sekunden-Halts drauf. */
const BLENDE = 0.3;                                      // Sekunden
function bildZustand(i) {
  const t = Math.min(i / FPS, LAUF - 1e-6);
  let a = 0, v = 0;
  while (a < AKTE.length - 1 && v + AKTE[a].s <= t) { v += AKTE[a].s; a++; }
  const akt = AKTE[a], u = Math.max(0, Math.min(1, (t - v) / akt.s));
  const rein = Math.min(1, (t - v) / BLENDE);
  const vorText = a > 0 ? AKTE[a - 1].t : null;
  const nachText = a < AKTE.length - 1 ? AKTE[a + 1].t : null;
  const raus = nachText === akt.t ? 1
             : Math.min(1, (v + akt.s - t) / BLENDE);
  const z = { morph: 0, anteil: 0.5, wasser: WASSER, ...akt.f(u) };
  z.text = akt.t;
  /* „distance **is** travel time" stimmt erst, wenn die Karte fertig verzogen
     ist. Am Anfang ist es eine Landkarte, dazwischen wird sie eine — und ein
     Untertitel, der schon im ersten Bild die Zeitkarte behauptet, macht genau
     die Aussage, die die Karte an dieser Stelle noch nicht macht. */
  /* Und in welche Richtung sie es tut, sagt der Akt selbst — einen Wimpernschlag
     weiter gefragt. „turning into" im Rueckweg waere wieder dieselbe Sorte
     kleiner Unwahrheit. */
  const spaeter = akt.f(Math.min(1, u + 0.01)).morph;
  const hin = spaeter === undefined || spaeter >= z.morph;
  z.unter = z.morph < 0.015
    ? '4,781 stations · a map of Germany, coloured by how far its trains get'
    : z.morph > 0.985
    ? '4,781 stations · distance on this map <b>is</b> travel time by train'
    : hin
    ? '4,781 stations · distance is <b>turning into</b> travel time'
    : '4,781 stations · and <b>turning back</b> into geography';
  z.deck = Math.max(0, Math.min(1, Math.min(vorText === akt.t ? 1 : rein, raus)));
  return z;
}

/* ------------------------------------------------ Woran ein Abschnitt haengt
   Der Ordner haengt an einem Abdruck von allem, was das Bild bestimmt — der
   Seite selbst, dem Drehbuch und jeder Einstellung. Aendert sich eine davon,
   ist es ein anderer Ordner, und es gibt nichts zu uebernehmen. Aendert sich
   nichts, findet ein Neustart seine Arbeit wieder.

   Je fertigem Abschnitt liegt eine Quittung daneben, die erst **nach** dem
   Schliessen des Kodierers geschrieben wird und die Bildzahl nennt. Ein
   abgebrochener Lauf hinterlaesst eine halbe mp4-Datei, aber keine Quittung —
   und eine halbe Datei ohne Quittung zaehlt nicht. */
const wurzel = resolve(dirname(new URL(import.meta.url).pathname), '..');
const abdruck = createHash('sha256')
  .update(readFileSync(join(wurzel, 'index.html')))
  .update(readFileSync(new URL(import.meta.url)))
  .update(JSON.stringify({ BREITE, HOEHE, HOCH_B, HOCH_H, FPS, NACH,
                           SATZ, UEBER, FEIN, KURZ }))
  .digest('hex').slice(0, 12);
const teile = join(dirname(resolve(ziel)), '.film-teile-' + abdruck);

/* ---------------------------------------------------------------- Der Server
   Die Seite holt ihre Nutzlast mit fetch, und fetch auf file:// ist verboten.
   Also ein Dateiserver in zwanzig Zeilen — eine Abhaengigkeit dafuer waere
   eine zu viel. */
const TYPEN = { '.html': 'text/html', '.json': 'application/json',
                '.js': 'text/javascript', '.css': 'text/css' };
const server = createServer((q, a) => {
  const pfad = join(wurzel, decodeURIComponent(q.url.split('?')[0]));
  if (!pfad.startsWith(wurzel) || !existsSync(pfad) || statSync(pfad).isDirectory()) {
    a.writeHead(404); a.end(); return;
  }
  a.writeHead(200, { 'content-type': TYPEN[extname(pfad)] || 'application/octet-stream' });
  createReadStream(pfad).pipe(a);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const tor = server.address().port;

/* Playwright bringt seine eigenen Browser mit und sucht sie an einer Stelle,
   die zur eingebauten Versionsnummer passt. Steht daneben schon ein Chromium
   (etwa weil die Umgebung eins mitliefert), nimmt BROWSER ihn statt eines
   zweiten Downloads. */
const browser = await chromium.launch({
  args: ['--no-sandbox'],
  ...(process.env.BROWSER ? { executablePath: process.env.BROWSER } : {}),
});
const page = await browser.newPage({
  viewport: { width: CSSB, height: CSSH }, deviceScaleFactor: UEBER,
});
page.on('pageerror', e => { console.error('SEITENFEHLER ' + e.message); });
await page.goto(`http://127.0.0.1:${tor}/index.html`);
await page.waitForFunction(() => typeof n !== 'undefined' && n > 0, null,
                           { timeout: 120000 });
await page.waitForTimeout(1200);

/* ------------------------------------------------------- Die Seite herrichten
   Die Bedienung weg, die Karte gross, Kopf und Fuss dazu. Die Regler
   verschwinden mit display:none statt visibility:hidden: unsichtbar halten sie
   sonst ihren Platz, und im Bild stuende ein schwarzes Band, in dem nichts
   passiert.

   Die **Legende bleibt** — sie ist keine Bedienung, sondern die einzige
   Moeglichkeit, die Farben zu lesen, und ein Relief ohne Leiter ist ein Bild
   und keine Karte. */
const KOPF = `
  <div id="filmkopf">
    <h2>Germany, drawn by its timetables</h2>
    <p id="filmunter">&nbsp;</p>
  </div>`;
/* Die Quelle steht dauerhaft unten und nicht in einem Schlussakt: in einer
   Schleife laeuft jeder Akt ohnehin wieder vorbei, und ein Akt, der nur eine
   Adresse zeigt, kostet Sekunden, in denen die Karte stillsteht. */
const FUSS = `<div id="filmfuss"><p id="filmtext">&nbsp;</p>
  <p id="filmquelle">chillchamp1.github.io/lab/bahn-zeitkarte</p></div>`;
const FILMCSS = `
  html,body{overflow:hidden}
  #huelle{display:block;height:auto;min-height:0}
  #regler,#tafel,#laden,.tip{display:none !important}
  #filmkopf{padding:12px 16px 7px}
  #filmkopf h2{margin:0;font-size:20px;font-weight:650;letter-spacing:-.02em;
    line-height:1.15}
  #filmkopf p{margin:3px 0 0;font-size:11px;color:var(--muted);line-height:1.35}
  #filmkopf p b{color:var(--ink2);font-weight:600}
  #buehne{height:HOEHEpx;padding:0;flex:0 0 auto}
  #cv{inset:0;width:100%;height:100%;border-radius:0}
  #legende{padding:9px 16px 4px}
  #filmfuss{padding:8px 16px 9px;min-height:78px}
  #filmfuss #filmtext{margin:0;font-size:13px;line-height:1.4;color:var(--ink2);
    text-wrap:pretty}
  #filmfuss #filmtext b{color:var(--ink);font-weight:600}
  #filmquelle{margin:5px 0 0;font-size:10.5px;color:var(--muted);
    letter-spacing:.02em}
  /* Die Kurzinfo steht im Film nicht in der Ecke, sondern gar nicht: der Text
     unter der Karte sagt dasselbe und deckt nichts zu. */
  #wahlfeld{display:none !important}`;
await page.evaluate(([css, kopf, fuss, ueber, fein, hoehe]) => {
  window.FILMCX = 0; window.FILMCY = 0; window.FILMZOOM = 1;
  const s = document.createElement('style');
  s.textContent = css.replace('HOEHE', String(hoehe));
  document.head.appendChild(s);
  const l = document.getElementById('links');
  l.insertAdjacentHTML('afterbegin', kopf);
  l.insertAdjacentHTML('beforeend', fuss);
  DPRMAX = ueber; FEINHEIT = fein; ZELLMAX = 40e6;
  Z.punkte = true; Z.namen = true; Z.linien = true;
  messen();
}, [FILMCSS, KOPF, FUSS, UEBER, FEIN, Math.round(CSSH * 0.72)]);
await page.waitForTimeout(400);

const lage = await page.evaluate(() => ({
  W, H, DPR, cw: cv.width, ch: cv.height, FW, FH,
  hoehe: document.documentElement.scrollHeight,
}));
const ssaa = (lage.cw / BREITE).toFixed(2);
console.error(`Satz ${CSSB} x ${CSSH} CSS · Karte ${lage.W} x ${lage.H} `
  + `· Leinwand ${lage.cw} x ${lage.ch} -> ${BREITE} x ${HOEHE} `
  + `(${ssaa}-fach ueberabgetastet) · Feld ${lage.FW} x ${lage.FH} `
  + `= ${(lage.FW * lage.FH / 1e6).toFixed(2)} M Zellen`);
if (Number(ssaa) < 1.5) throw new Error(
  `Ueberabtastung nur ${ssaa}-fach — SATZ x UEBER muss deutlich ueber der `
  + `Zielbreite ${BREITE} liegen, sonst ist das Verkleinern wirkungslos.`);
if (lage.hoehe > CSSH + 2) throw new Error(
  `Die Seite ist ${lage.hoehe} statt ${CSSH} Punkte hoch — unten wird `
  + `abgeschnitten. Kopf, Karte, Legende und Fuss passen nicht.`);

/* ------------------------------------------------------------- Der Rahmen
   **Einer, fuer den ganzen Film.** Er muss den verzogenen Umriss bei *jeder*
   Reglerstellung fassen — die Grenzen des Zeit-Deutschlands duerfen nicht aus
   dem Bild, die weissen Bahnhofspunkte schon: von denen fliegen in der
   Zeitkarte 539 jenseits der Kueste, und wer die alle fassen will, druckt
   Deutschland auf Briefmarkengroesse.

   Gerechnet wird er aus **zwei** Bildern, nicht aus einundzwanzig. `verziehe`
   mittelt die Verschiebungen der Bahnhoefe mit Gewichten, die nur an der
   Geografie haengen; die Verschiebung selbst ist `(fxx - gxx) * morph`. Jeder
   Umrisspunkt laeuft damit **linear** im Morph, und eine Strecke hat ihre
   Extreme an den Enden. Der Umschlag der Enden ist also exakt der Umschlag
   ueber alles dazwischen — nachgemessen an neun Zwischenstellungen, groesste
   Ueberschreitung 0,000 Minuten.

   Bei diesen Daten ist die Vereinigung schlicht der Umriss der Zeitkarte:
   852 x 1 062 Minuten um (-17 / 60). Die Landkarte liegt ganz darin und steht
   deshalb etwas kleiner im Bild — das ist der Preis dafuer, dass sie sich
   nicht bewegt, und er ist der guenstigere. */
async function rahmenSetzen() {
  const r = await page.evaluate(() => {
    const kasten = m => {
      Z.morph = m; lage(); umrissVerziehen();
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (const ring of umrissW) for (let k = 0; k < ring.length; k += 2) {
        if (ring[k] < x0) x0 = ring[k];       if (ring[k] > x1) x1 = ring[k];
        if (ring[k+1] < y0) y0 = ring[k+1];   if (ring[k+1] > y1) y1 = ring[k+1];
      }
      return [x0, x1, y0, y1];
    };
    const a = kasten(0), z = kasten(1);
    const u = [Math.min(a[0], z[0]), Math.max(a[1], z[1]),
               Math.min(a[2], z[2]), Math.max(a[3], z[3])];
    const saum = 1.05;
    window.FILMCX = (u[0] + u[1]) / 2; window.FILMCY = (u[2] + u[3]) / 2;
    window.FILMZOOM = Math.min(W / ((u[1] - u[0]) * saum),
                               H / ((u[3] - u[2]) * saum)) / skalaBasis;
    /* Und nachsehen, ob es stimmt — mit den Werten, die **nach** dem Zeichnen
       gelten. `ansichtKlemmen` haelt das Bild im Umfang und kann die Mitte
       noch verschieben; ein Rahmen, der das nicht beruecksichtigt, schneidet
       unten drei Pixel ab, und niemand merkt es vor dem fertigen Film. */
    const pruef = m => {
      Z.morph = m; V.cx = window.FILMCX; V.cy = window.FILMCY;
      V.zoom = window.FILMZOOM; zeichne();
      let luft = 1e9;
      for (const ring of umrissW) for (let k = 0; k < ring.length; k += 2) {
        const X = schirmX(ring[k]), Y = schirmY(ring[k+1]);
        luft = Math.min(luft, X, W - X, Y, H - Y);
      }
      return +luft.toFixed(1);
    };
    return { union: u.map(v => +v.toFixed(1)),
             cx: window.FILMCX, cy: window.FILMCY,
             zoom: +window.FILMZOOM.toFixed(4), luft0: pruef(0), luft1: pruef(1) };
  });
  /* Gerundet zurueckschreiben, damit Skript und Seite genau dieselbe Zahl
     benutzen und der Rahmen nicht in der vierten Stelle atmet. */
  await page.evaluate(([cx, cy, z]) => {
    window.FILMCX = cx; window.FILMCY = cy; window.FILMZOOM = z;
  }, [r.cx, r.cy, r.zoom]);
  console.error(`Rahmen fest: ${Math.round(r.union[1]-r.union[0])} x `
    + `${Math.round(r.union[3]-r.union[2])} min um `
    + `(${r.cx.toFixed(0)} / ${r.cy.toFixed(0)}), Zoom ${r.zoom} — `
    + `Luft zum Bildrand ${r.luft0} Punkte in der Landkarte, ${r.luft1} in der `
    + `Zeitkarte`);
  if (Math.min(r.luft0, r.luft1) < 0) throw new Error(
    `Der Umriss haengt ${(-Math.min(r.luft0, r.luft1)).toFixed(1)} Punkte aus `
    + `dem Bild. Saum erhoehen.`);
}
await rahmenSetzen();

/* ---------------------------------------------------------- Ein Bild stellen */
async function stellen(z) {
  await page.evaluate(w => {
    if (Math.abs(Z.anteil - w.anteil) > 1e-9) { Z.anteil = w.anteil; stufeSetzen(); }
    Z.wasser = w.wasser;
    Z.morph = w.morph;
    /* Der Rahmen steht **fest** und wird hier nur wieder eingesetzt. Eine
       Kamera, die je Bild neu rahmt, faehrt die ganze Zeit mit — der Umriss
       wird beim Verziehen groesser, also ging der Zoom auf und die Mitte
       wanderte, und im Bild sah es aus, als wackle das Land. Gewollt ist das
       Gegenteil: die Landschaft verzieht sich, ihre Lage im Bild nicht. Wie
       der Rahmen zustande kommt, steht bei `rahmenSetzen`. */
    V.cx = window.FILMCX; V.cy = window.FILMCY; V.zoom = window.FILMZOOM;
    document.getElementById('filmunter').innerHTML = w.unter;
    const t = document.getElementById('filmtext');
    t.innerHTML = w.text;
    t.style.opacity = w.deck;
    zeichne();
  }, z);
}

/* ---------------------------------------------------------------- Die Messung
   MESSEN=1 rechnet ein paar Bilder je Einstellung und schreibt nichts. Ein
   Lauf ueber zweitausend Bilder dauert Stunden; welche Einstellung er kostet,
   will man vorher wissen und nicht hinterher. */
if (process.env.MESSEN) {
  const proben = [0.2, 0.34, 0.5, 0.7, 1.0];
  for (const f of proben) {
    await page.evaluate(v => { FEINHEIT = v; messen(); }, f);
    await page.waitForTimeout(200);
    const t0 = Date.now();
    const k = 4;
    for (let i = 0; i < k; i++) {
      await stellen(bildZustand(Math.round((0.35 + 0.1 * i) * FPS * LAUF)));
      await page.screenshot({ type: 'png' });
    }
    const feld = await page.evaluate(() => FW * FH);
    console.error(`  FEIN ${f.toFixed(2)}  Feld ${(feld / 1e6).toFixed(2)} M  `
      + `${((Date.now() - t0) / k / 1000).toFixed(2)} s/Bild  `
      + `-> ${Math.round((Date.now() - t0) / k / 1000 * (LAUF + NACH) * FPS / 60)} min Lauf`);
  }
  await browser.close(); server.close(); process.exit(0);
}

/* --------------------------------------------------------------- Die Probe
   BILDER=0,0.3,0.6 schreibt einzelne Bilder an diesen Stellen des Films und
   hoert auf. Zwei Stunden zu rechnen und **danach** zu sehen, dass der Text
   ueber der Legende klebt, ist der teuerste Weg, das herauszufinden. */
if (process.env.BILDER) {
  for (const a of process.env.BILDER.split(',')) {
    const i = Math.round(Number(a) * LAUF * FPS);
    await stellen(bildZustand(i));
    const datei = `probe-${String(Math.round(Number(a) * 100)).padStart(3, '0')}.png`;
    await page.screenshot({ path: datei });
    console.error(`  ${datei}  t = ${(i / FPS).toFixed(1)} s`);
  }
  await browser.close(); server.close(); process.exit(0);
}

mkdirSync(teile, { recursive: true });
console.error(`Abschnitte in ${teile}`);
console.error(`Laufzeit ${LAUF.toFixed(1)} s + ${NACH} s Standbild `
  + `= ${Math.round((LAUF + NACH) * FPS)} Bilder`);

const n = Math.round(LAUF * FPS);
/* Bis n-1 und nicht bis n: das Bild bei t = LAUF ist dasselbe wie das bei
   t = 0, und in der Schleife stotterte es dort ein Bild lang. Wer doch ein
   Standbild am Ende bestellt (NACH), bekommt es dahinter. */
const gesamt = n - 1 + NACH * FPS;

/* --------------------------------------------------------------- Die Kodierer
   Zwei Fassungen aus **einem** Bilddurchgang: das Rechnen der Bilder ist das
   Teure, das Kodieren laeuft nebenher. Die Bilder gehen in zwei Roehren.

   **film.mp4 — die Fassung fuer Reddit.** Dort steht die Erfahrung, die Geld
   gekostet hat: ein hochkantes mp4 wurde wiederholt abgewiesen, mit nichts als
   „submit failed", und der Grund war die **Spitzenbitrate**. Nicht die
   Tonspur (die funktionierende Fassung hat gar keine), nicht B-Frames, nicht
   Edit-Listen, nicht das Profil — vier Runden Raten, alle wirkungslos. Was
   half, war `maxrate` mit `bufsize` = 2 x maxrate.

   2 600 k ist der Wert, mit dem es durchging, und er bleibt. Der Versuch, die
   Luft darunter mit einem kleineren CRF auszufuellen, war aber ein Denkfehler,
   und er ist nachgemessen: `maxrate` deckelt **nicht die Spitze**, sondern die
   Rate im Mittel — kurze Ausschlaege bis zur Puffergroesse sind erlaubt. Mit
   CRF 18 kam der Lauf auf 2,68 Mbit/s im Mittel, und ueber Fenster von einer,
   zwei und fuenf Sekunden auf 4,67, 3,65 und 3,10. Die Datei lag damit **am**
   Deckel statt darunter, und die nachgewiesen angenommene Fassung lag bei
   1,93. 2,68 ist ungepruefstes Mittelfeld zwischen 1,93 (ging durch) und
   3,3 bis 4,2 (ging nicht), und darin will man nicht stehen.

   Gedeckelt wird darum das **Mittel** und nicht die Qualitaet: `-b:v 1900k`
   neben demselben `maxrate`. Nachgemessen 1,97 Mbit/s im Mittel und 3,45 /
   2,87 / 2,63 ueber die drei Fenster — das ist die Fassung, die es schon
   einmal durch Reddit geschafft hat, und das ist hier mehr wert als ein Viertel
   mehr Bitrate.

   **film-hoch.mp4 — die Fassung fuer alles andere.** 1 440 x 2 560, CRF 16,
   kein Deckel. Reddit will sie nicht, YouTube und ein Download schon.

   Lanczos beim Verkleinern, weil bilinear genau die Hoehenlinien verschmiert,
   fuer die die Ueberabtastung gerechnet wurde; yuv420p, weil alles andere
   umgerechnet wird; faststart, damit der Kopf vorne steht. */
function kodierer(datei, breite, hoehe, mehr) {
  return spawn(ffmpeg, [
    '-y', '-loglevel', 'error', '-nostats',
    '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-vf', `scale=${breite}:${hoehe}:flags=lanczos`,
    '-c:v', 'libx264', '-preset', 'slow', ...mehr,
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-r', String(FPS), datei,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
}
const FASSUNGEN = [
  { name: 'reddit', b: BREITE, h: HOEHE,
    mehr: ['-b:v', '1900k', '-maxrate', '2600k', '-bufsize', '5200k'] },
  /* CRF 16 gab bei 34 Sekunden 42,8 MB, und damit passte die Datei durch
     keinen der Kanaele, ueber die sie danach verschickt werden sollte (30 MB).
     Eine zweite Kodierung rettet das, kostet aber eine Generation. 19 landet
     bei 30 MB, 20 bei 27 — genommen ist 20, und der Unterschied zu 16 ist bei
     diesem Stoff nicht zu sehen. Die Auflösung bleibt voll. */
  { name: 'hoch', b: HOCH_B, h: HOCH_H, mehr: ['-crf', '20'] },
];

const t0 = Date.now();
let gerechnet = 0;            /* Bilder in **diesem** Lauf, fuer die Schaetzung */
const listen = { reddit: [], hoch: [] };
for (let von = 0; von <= gesamt; von += ABSCHNITT) {
  const bis = Math.min(gesamt, von + ABSCHNITT - 1);
  const marke = String(von).padStart(5, '0');
  const dateien = FASSUNGEN.map(f => join(teile, `${f.name}-${marke}.mp4`));
  FASSUNGEN.forEach((f, k) => listen[f.name].push(dateien[k]));
  const quittung = join(teile, `q-${marke}`);
  if (existsSync(quittung)
      && readFileSync(quittung, 'utf8').trim() === String(bis - von + 1)
      && dateien.every(existsSync)) {
    console.error(`  Abschnitt ${von}..${bis} steht schon (${bis - von + 1} Bilder)`);
    continue;
  }
  const procs = FASSUNGEN.map((f, k) => kodierer(dateien[k], f.b, f.h, f.mehr));
  const schreibe = b => Promise.all(procs.map(p =>
    new Promise(r => p.stdin.write(b) ? r() : p.stdin.once('drain', r))));
  for (let i = von; i <= bis; i++) {
    await stellen(bildZustand(Math.min(i, n)));
    await schreibe(await page.screenshot({ type: 'png' }));
    gerechnet++;
    if (i % 30 === 0) {
      const je = (Date.now() - t0) / 1000 / gerechnet;
      const rest = Math.round(je * (gesamt - i) / 60);
      console.error(`  ${i}/${gesamt}  ${(100 * i / gesamt).toFixed(0)} %  `
        + `${je.toFixed(2)} s/Bild  noch rund ${rest} min`);
    }
  }
  for (const p of procs) p.stdin.end();
  await Promise.all(procs.map(p => new Promise(r => p.on('close', r))));
  writeFileSync(quittung, String(bis - von + 1) + '\n');
}
await browser.close();
server.close();

// Aneinanderhaengen ohne Neukodieren — die Abschnitte haben dieselben Parameter.
for (const f of FASSUNGEN) {
  const aus = f.name === 'reddit' ? resolve(ziel)
            : resolve(ziel).replace(/\.mp4$/, '-hoch.mp4');
  const liszt = join(teile, `liste-${f.name}.txt`);
  writeFileSync(liszt, listen[f.name].map(d => `file '${d}'`).join('\n') + '\n');
  await new Promise((r, x) => {
    const p = spawn(ffmpeg, ['-y', '-loglevel', 'error', '-nostats',
      '-f', 'concat', '-safe', '0', '-i', liszt,
      '-c', 'copy', '-movflags', '+faststart', aus],
      { stdio: ['ignore', 'inherit', 'inherit'] });
    p.on('close', c => c === 0 ? r() : x(new Error('concat ' + c)));
  });
  const mb = (statSync(aus).size / 1048576).toFixed(1);
  const bit = (statSync(aus).size * 8 / (LAUF + NACH) / 1e6).toFixed(2);
  console.error(`${aus}  ${f.b} x ${f.h}  ${mb} MB  ${bit} Mbit/s`);
}
if (!process.env.BEHALTEN) rmSync(teile, { recursive: true, force: true });
process.stderr.write(`fertig nach ${((Date.now() - t0) / 60000).toFixed(0)} min\n`);
