// Macht aus der fertigen Seite ein hochkantes mp4 — fuer alles, wo eine
// Webseite nicht hinpasst.
//
//   node film.mjs ../index.html film.mp4 30
//
// Der Inhalt ist der der Seite, nichts nachgebaut: sie wird geladen, die
// Bedienung ausgeblendet, dann Bild fuer Bild weitergestellt.
//
// Gerechnet wird **nicht in Echtzeit**, sondern mit gestellter Uhr: je Bild
// dtSek = 1/FPS und setzeZeit(i/(n-1)), genau das, was die Seite bei fluessigem
// Lauf taete. Die Spielzeit stimmt damit auf die Sekunde.
//
// Braucht playwright-core und ffmpeg-static, beide **nicht im Repo** — das hier
// ist Werkzeug, keine Seite, und die Regel „keine Abhaengigkeiten" gilt fuer
// alles, was ausgeliefert wird.
//
//   npm install playwright-core ffmpeg-static

import { spawn } from 'node:child_process';
import { resolve, dirname, join } from 'node:path';
import { mkdirSync, existsSync, writeFileSync, rmSync, statSync } from 'node:fs';

const [, , seite = '../index.html', ziel = 'film.mp4', fpsArg = '30'] = process.argv;
const FPS = Number(fpsArg);
const BREITE = 1080, HOEHE = 1920;   // was herauskommt
const LAUF = Number(process.env.LAUF || 69);   // muss zu LAUF in der Seite passen
const NACH = 2;                      // Sekunden Standbild am Ende

/* ---------------------------------------------------- Wie gross gerechnet wird
   Drei Groessen, und es ist wichtig, sie auseinanderzuhalten:

   SATZ    die Breite in CSS-Punkten, in der die **Seite gesetzt** wird. Sie
           entscheidet ueber das Bild, nicht ueber die Schaerfe: wie gross die
           Schrift zur Karte steht, wo das CSS auf Hochkant umschaltet, wie
           viele Zeilen die Notiz braucht. 540 ist die halbe Zielbreite und
           trifft die Telefonspalte, fuer die die Seite gemacht ist.
   UEBER   der Punktdichtefaktor, mit dem dieser Satz gerendert wird. Die
           Leinwand steht damit auf SATZ x UEBER Punkten — bei 540 und 4 also
           2 160, dem Doppelten der Zielbreite. Am Ende wird auf 1 080
           heruntergerechnet, und aus je vier gerechneten Punkten wird einer.
           Das ist Kantenglaettung durch Ueberabtastung, und auf Hoehenlinien,
           die einen Punkt breit sind, ist sie der sichtbarste Unterschied
           ueberhaupt. Die Seite selbst kann sie sich nicht leisten, ein Film
           schon.
   FEIN    wie fein das Reliefgitter steht, als Vielfaches der Satzbreite. Die
           Seite deckelt es bei 0,9 und 680 Zellen, weil dort jedes Bild in
           Echtzeit fallen muss; hier traegt es bei FEIN 3 rund 1 620 Zellen,
           also drei Viertel der Leinwand.

   Das Ziel durch UEBER zu teilen, statt SATZ eigens zu setzen, ist der Fehler,
   der hier einmal drinstand: die Leinwand kam dann genau auf die Zielgroesse
   heraus, und ueberabgetastet wurde gar nichts.

   Gemessen im Pruefbrowser, je Bild einschliesslich Schuss, bei SATZ 540:

       UEBER 2  FEIN 2     Feld 1,21 M   2 147 ms
       UEBER 3  FEIN 3     Feld 2,73 M   4 163 ms
       UEBER 4  FEIN 2,5   Feld 1,90 M   4 136 ms
       UEBER 4  FEIN 3     Feld 2,73 M   4 957 ms
       UEBER 4  FEIN 4     Feld 4,85 M   7 305 ms

   Die dritte Zeile kostet dasselbe wie die zweite und rechnet die Leinwand
   doppelt statt anderthalbfach — Leinwandgroesse ist billiger als
   Feldgroesse. Genommen wird die vierte: zweifache Ueberabtastung **und** ein
   Feld, das drei Viertel der Leinwand traegt. */
const SATZ = Number(process.env.SATZ || Math.round(BREITE / 2));
const UEBER = Number(process.env.UEBER || 4);
const FEIN = Number(process.env.FEIN || 3);

/* Gerechnet wird in Abschnitten, jeder fuer sich ein mp4, am Ende
   aneinandergehaengt. Drei Stunden an einem Stueck sind drei Stunden, in denen
   nichts schiefgehen darf; so ist die teuerste verlorene Arbeit ein Abschnitt.
   Wer neu startet, ueberspringt, was schon dasteht. */
const ABSCHNITT = Number(process.env.ABSCHNITT || 300);   // Bilder je Abschnitt

const { chromium } = await import('playwright-core');
const ffmpeg = (await import('ffmpeg-static')).default;

const CSSB = SATZ, CSSH = Math.round(SATZ * HOEHE / BREITE);
const teile = join(dirname(resolve(ziel)), '.film-teile');
mkdirSync(teile, { recursive: true });

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
await page.goto('file://' + resolve(seite));
await page.waitForTimeout(1500);

/* Die Bedienung weg — und die Karte in der **Standardkippung**, nicht flach:
   ein Eisschild ist ein Koerper, und der Film hat keine Regler, mit denen man
   das selbst herausfindet.

   Die Regler verschwinden mit display:none statt visibility:hidden: unsichtbar
   halten sie sonst ihren Platz, und im Bild steht ein schwarzes Band, in dem
   nichts passiert. Die Karte waechst dadurch nicht — ihre Hoehe haengt an der
   Schirmbreite, nicht an dem, was die Geschwister uebriglassen —, aber die
   Notiz rueckt auf. */
await page.evaluate(([ueber, fein]) => {
  halte();
  ZOOM = 1; vX = 0; vY = 0; NEIGUNG = KIPPSTART; DREHUNG = 0;
  for (const s of ['.regler', '.sicht']) {
    const e = document.querySelector(s);
    if (e) e.style.display = 'none';
  }
  // Der Knopf, der die Ansicht zuruecksetzt, steht auf der Karte selbst.
  const z = document.getElementById('zurueck');
  if (z) z.style.display = 'none';
  /* Und die Karte auf die volle Breite. Auf der Seite deckelt das CSS die
     Feldhoehe bei 62 svh, damit unter der Karte noch die Leiste Platz hat;
     im Film ist die Leiste weg, und der Deckel kostete 30 der 540 Punkte —
     die Karte stand 510 breit mit Rand links und rechts. Gesetzt wird die
     Hoehe, aus der die Karte ihre Breite bekommt, nicht umgekehrt. */
  const feld = cv.parentElement;
  feld.style.height = Math.ceil(innerWidth * GH / GW) + 'px';
  DPRMAX = ueber; RAUF = fein; FELDMAX = 9000;
  masse(); sichtRechnen();
}, [UEBER, FEIN]);
const lage = await page.evaluate(() => ({ rW, rH, cw: cv.width, ch: cv.height }));
const ssaa = (CSSB * UEBER / BREITE).toFixed(2);
console.error(`Satz ${CSSB} x ${CSSH} CSS, Leinwand ${lage.cw} x ${lage.ch} `
  + `-> ${BREITE} x ${HOEHE} (${ssaa}-fach ueberabgetastet), `
  + `Feld ${lage.rW} x ${lage.rH}`);
if (Number(ssaa) < 1.5) throw new Error(
  `Ueberabtastung nur ${ssaa}-fach — SATZ x UEBER muss deutlich ueber der `
  + `Zielbreite ${BREITE} liegen, sonst ist das Verkleinern wirkungslos.`);

const n = Math.round(LAUF * FPS);
const gesamt = n + NACH * FPS;

function kodierer(datei) {
  /* yuv420p und High-Profile, weil Reddit alles andere entweder ablehnt oder
     selbst umrechnet; faststart, damit der Kopf vorne steht. Lanczos beim
     Verkleinern — bilinear verschmiert genau die Hoehenlinien, fuer die die
     Ueberabtastung gerechnet wurde. crf 17 ist knapp unter sichtbar; die Karte
     ist grossflaechig ruhig und hat feine Linien, und die kostet ein zu hoher
     crf zuerst. */
  return spawn(ffmpeg, [
    '-y', '-loglevel', 'error', '-nostats',
    '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-vf', `scale=${BREITE}:${HOEHE}:flags=lanczos`,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17',
    '-profile:v', 'high', '-level', '4.2', '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart', '-r', String(FPS), datei,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
}

const t0 = Date.now();
const liste = [];
for (let von = 0; von <= gesamt; von += ABSCHNITT) {
  const bis = Math.min(gesamt, von + ABSCHNITT - 1);
  const datei = join(teile, `t${String(von).padStart(5, '0')}.mp4`);
  liste.push(datei);
  if (existsSync(datei) && statSync(datei).size > 1024) {
    console.error(`  Abschnitt ${von}..${bis} steht schon`);
    continue;
  }
  const proc = kodierer(datei);
  const schreibe = b => new Promise(r => proc.stdin.write(b) ? r() : proc.stdin.once('drain', r));
  for (let i = von; i <= bis; i++) {
    const s = Math.min(1, i / n);
    await page.evaluate(([v, dt]) => {
      dtSek = dt; setzeZeit(v); notizen(); zeichne();
    }, [s, 1 / FPS]);
    await schreibe(await page.screenshot({ type: 'png' }));
    if (i % 50 === 0) {
      const je = (Date.now() - t0) / 1000 / Math.max(1, i + 1);
      const rest = Math.round(je * (gesamt - i) / 60);
      console.error(`  ${i}/${gesamt}  ${(100 * i / gesamt).toFixed(0)} %  `
        + `${je.toFixed(1)} s/Bild  noch rund ${rest} min`);
    }
  }
  proc.stdin.end();
  await new Promise(r => proc.on('close', r));
}
await browser.close();

// Aneinanderhaengen ohne Neukodieren — die Abschnitte haben dieselben Parameter.
const liszt = join(teile, 'liste.txt');
writeFileSync(liszt, liste.map(f => `file '${f}'`).join('\n') + '\n');
await new Promise((r, x) => {
  const p = spawn(ffmpeg, ['-y', '-loglevel', 'error', '-nostats',
    '-f', 'concat', '-safe', '0', '-i', liszt,
    '-c', 'copy', '-movflags', '+faststart', resolve(ziel)],
    { stdio: ['ignore', 'inherit', 'inherit'] });
  p.on('close', c => c === 0 ? r() : x(new Error('concat ' + c)));
});
if (!process.env.BEHALTEN) rmSync(teile, { recursive: true, force: true });
process.stderr.write(`fertig: ${ziel} nach ${((Date.now() - t0) / 60000).toFixed(0)} min\n`);
