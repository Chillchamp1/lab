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
const NACH = 2;                           // Sekunden Standbild am Ende

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
const misch = (a, b, u) => a + (b - a) * weich(u);
const HELD = 'Berlin Hbf';   /* siehe unten, Akt 8 */
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
/* Zoom und Mitte werden **nicht gesetzt, sondern gerechnet** — je Bild aus
   dem, was gerade zu sehen ist (siehe `stellen`). Von Hand gesetzt war beides
   falsch: der Rahmen der Seite kommt ganz von der Zeitkarte und liegt 58
   Minuten westlich der Mitte der Landkarte, also stand Sachsen im ersten Bild
   halb draussen. Fuer die Kamerafahrt am Ende bleibt ein Zoom stehen, weil
   dort der Bahnhof den Rahmen gibt und nicht das Land. */
const ZNAHE = 1.5;
const AKTE = [
  { s: 3.5, t: '<b>Height is time.</b> How long until half of Germany is '
              + 'within reach by train — from every one of 4,781 stations.',
    f: () => ({ morph: 0 }) },
  { s: 13, t: '<b>Now distance becomes travel time.</b> Every station moves to '
             + 'where the timetable puts it, and the coastline comes along.',
    f: u => ({ morph: weich(u) }) },
  { s: 4.5, t: '<b>The time map.</b> The high-speed cross pulls together; '
              + 'branch lines fly out to sea and become islands.',
    f: () => ({ morph: 1 }) },
  { s: 4, t: '<b>And back.</b> Same heights, same stations — only the places '
            + 'return to their coordinates.',
    f: u => ({ morph: 1 - weich(u) }) },
  { s: 7, t: '<b>Who has to be in reach?</b> Turn the share down to a few per '
            + 'cent and the Ruhr wins: it is big enough for itself.',
    f: u => ({ morph: 0, anteil: Math.exp(misch(Math.log(0.5), Math.log(0.03), u)) }) },
  { s: 8.5, t: '<b>Nine tenths of the country,</b> and the map turns back into '
              + 'a geography map: now it measures where a place is.',
    f: u => ({ morph: 0, anteil: Math.exp(misch(Math.log(0.03), Math.log(0.9), u)) }) },
  { s: 4.5, t: '<b>Half of Germany</b> is the setting in between — real '
              + 'distance, and a central position starts to pay.',
    f: u => ({ morph: 0, anteil: Math.exp(misch(Math.log(0.9), Math.log(0.5), u)) }) },
  /* Und zuletzt die Kamera an einem einzelnen Bahnhof. Der Held darf nicht
     hinausfliegen: Göhren auf Rügen wandert 182 Minuten und landet weit im
     Meer — die Kamera stand dann mit ihm im Schwarzen und das Land in einer
     Ecke. Berlin Hbf wandert 152 Minuten und landet **im** Land: es steht
     still, und Deutschland zieht darum herum vorbei. Das ist der Satz, den der
     Akt zeigen soll. */
  { s: 4, t: '<b>Berlin Hbf.</b> A hundred and fifty-two minutes lie between '
            + 'where it is and where the timetable puts it.',
    f: u => ({ morph: 0, wahl: HELD, nah: ZNAHE, nahU: weich(u) }) },
  { s: 12, t: '<b>Hold the camera on one station</b> and it stands still while '
             + 'the whole country warps past it.',
    f: u => ({ morph: weich(u), wahl: HELD, folgt: true, zoom: ZNAHE }) },
  { s: 4, t: '<b>chillchamp1.github.io/lab/bahn-zeitkarte</b> — every slider, '
            + 'every station, and the method written out.',
    f: () => ({ morph: 1, wahl: HELD, folgt: true, zoom: ZNAHE }) },
];
/* KURZ=20 staucht alle Akte auf ein Zwanzigstel. Damit laeuft die ganze Kette
   — zwei Kodierer, Abschnitte, Quittungen, Aneinanderhaengen — in drei Minuten
   durch, und man sieht vorher, ob sie durchlaeuft. Zwei Stunden zu rechnen und
   dann am Zusammenfuegen zu scheitern ist der teuerste Weg zu dieser Auskunft. */
const KURZ = Number(process.env.KURZ || 1);
for (const k of AKTE) k.s /= KURZ;
const LAUF = AKTE.reduce((a, k) => a + k.s, 0);

/* Aus den Akten ein Bild: welcher Akt, wie weit hinein, und wie stark der Text
   gerade steht. Der Text blendet nur dann aus, wenn der naechste Akt einen
   anderen hat — sonst blinkte er an jeder Aktgrenze. */
const BLENDE = 0.45;                                     // Sekunden
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
  const z = { morph: 0, anteil: 0.5, zoom: null, wahl: null, folgt: false,
              nah: null, nahU: 0, wasser: WASSER, ...akt.f(u) };
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
const FUSS = `<div id="filmfuss"><p id="filmtext">&nbsp;</p></div>`;
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
  #filmfuss{padding:8px 16px 10px;min-height:76px}
  #filmfuss p{margin:0;font-size:13px;line-height:1.4;color:var(--ink2);
    text-wrap:pretty}
  #filmfuss p b{color:var(--ink);font-weight:600}
  /* Die Kurzinfo steht im Film nicht in der Ecke, sondern gar nicht: der Text
     unter der Karte sagt dasselbe und deckt nichts zu. */
  #wahlfeld{display:none !important}`;
await page.evaluate(([css, kopf, fuss, ueber, fein, hoehe]) => {
  const s = document.createElement('style');
  s.textContent = css.replace('HOEHE', String(hoehe));
  document.head.appendChild(s);
  const l = document.getElementById('links');
  l.insertAdjacentHTML('afterbegin', kopf);
  l.insertAdjacentHTML('beforeend', fuss);
  DPRMAX = ueber; FEINHEIT = fein; ZELLMAX = 40e6;
  Z.punkte = true; Z.namen = true; Z.linien = true;
  messen();
}, [FILMCSS, KOPF, FUSS, UEBER, FEIN, Math.round(CSSH * 0.735)]);
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

/* ---------------------------------------------------------- Ein Bild stellen */
async function stellen(z) {
  await page.evaluate(w => {
    if (Math.abs(Z.anteil - w.anteil) > 1e-9) { Z.anteil = w.anteil; stufeSetzen(); }
    Z.wasser = w.wasser;
    Z.morph = w.morph;
    const i = w.wahl === null ? -1 : nm.indexOf(w.wahl);
    if (i !== Z.wahl) waehlen(i);
    folgt = w.folgt && i >= 0;
    /* **Deutschland muss ganz im Bild sein**, bei jeder Reglerstellung — und
       welcher Zoom das leistet, weiss nur das Bild selbst. Gerechnet wird der
       Rahmen aus dem verzogenen Umriss und den Bahnhofsorten ohne die
       aeussersten halben Prozent: der Umriss allein liesse die Schollen
       abschneiden, alle Bahnhoefe zusammen zwingen wegen einer Handvoll
       Aussenseiter (Sylt, Mittenwald) die ganze Karte auf Briefmarkengroesse.
       `lage` und `umrissVerziehen` haengen nur am Morph und nicht an der
       Ansicht, laufen hier also vorweg; `zeichne` rechnet sie danach noch
       einmal, mit demselben Ergebnis. */
    lage(); umrissVerziehen();
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const r of umrissW) for (let k = 0; k < r.length; k += 2) {
      if (r[k] < x0) x0 = r[k];       if (r[k] > x1) x1 = r[k];
      if (r[k+1] < y0) y0 = r[k+1];   if (r[k+1] > y1) y1 = r[k+1];
    }
    const xs = Array.from(wx.slice(0, n)).sort((a, c) => a - c);
    const ys = Array.from(wy.slice(0, n)).sort((a, c) => a - c);
    const q = (a, t2) => a[Math.floor(t2 * (a.length - 1))];
    x0 = Math.min(x0, q(xs, 0.005)); x1 = Math.max(x1, q(xs, 0.995));
    y0 = Math.min(y0, q(ys, 0.005)); y1 = Math.max(y1, q(ys, 0.995));
    const saum = 1.04;
    const wcx = (x0 + x1) / 2, wcy = (y0 + y1) / 2;
    const wz = Math.min(W / ((x1 - x0) * saum), H / ((y1 - y0) * saum)) / skalaBasis;
    if (w.nah !== null && i >= 0) {
      /* Das Heranfahren an den Bahnhof: Mitte und Zoom wandern vom gerechneten
         Rahmen auf ihn zu. Die Mitte wird hier selbst gesetzt und nicht dem
         Folgen ueberlassen, sonst sprang sie im ersten Bild des Akts. */
      folgt = false;
      V.zoom = wz + (w.nah - wz) * w.nahU;
      V.cx = wcx + (wx[i] - wcx) * w.nahU;
      V.cy = wcy + (wy[i] - wcy) * w.nahU;
    } else if (w.zoom !== null) {
      V.zoom = w.zoom;                      /* die Mitte macht `folgt` */
    } else {
      V.cx = wcx; V.cy = wcy; V.zoom = wz;
    }
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
const gesamt = n + NACH * FPS;

/* --------------------------------------------------------------- Die Kodierer
   Zwei Fassungen aus **einem** Bilddurchgang: das Rechnen der Bilder ist das
   Teure, das Kodieren laeuft nebenher. Die Bilder gehen in zwei Roehren.

   **film.mp4 — die Fassung fuer Reddit.** Dort steht die Erfahrung, die Geld
   gekostet hat: ein hochkantes mp4 wurde wiederholt abgewiesen, mit nichts als
   „submit failed", und der Grund war die **Spitzenbitrate**. Nicht die
   Tonspur (die funktionierende Fassung hat gar keine), nicht B-Frames, nicht
   Edit-Listen, nicht das Profil — vier Runden Raten, alle wirkungslos. Was
   half, war `maxrate` mit `bufsize` = 2 x maxrate.

   2 600 k ist der Wert, mit dem es durchging, und er bleibt. Was sich gegen
   `eiszeit-europa` aendert, ist CRF: dort stand 23 und der Lauf kam auf
   1,93 Mbit/s — anderthalb Mbit/s Luft unter dem Deckel, die niemand nutzte.
   Mit CRF 18 fuellt der Kodierer sie aus, die **Spitze bleibt gedeckelt**, und
   damit steigt die Qualitaet, ohne das Risiko anzufassen, um das es ging.

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
    mehr: ['-crf', '18', '-maxrate', '2600k', '-bufsize', '5200k'] },
  { name: 'hoch', b: HOCH_B, h: HOCH_H, mehr: ['-crf', '16'] },
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
