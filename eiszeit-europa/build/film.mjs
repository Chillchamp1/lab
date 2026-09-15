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
import { resolve } from 'node:path';

const [, , seite = '../index.html', ziel = 'film.mp4', fpsArg = '30'] = process.argv;
const FPS = Number(fpsArg);
const BREITE = 1080, HOEHE = 1920;
const LAUF = 69;                 // Sekunden, muss zu LAUF in der Seite passen
const NACH = 2;                  // Sekunden Standbild am Ende

const { chromium } = await import('playwright-core');
const ffmpeg = (await import('ffmpeg-static')).default;

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({
  viewport: { width: BREITE / 2, height: HOEHE / 2 }, deviceScaleFactor: 2,
});
await page.goto('file://' + resolve(seite));
await page.waitForTimeout(1500);

/* Die Bedienung weg — und die Karte in der **Standardkippung**, nicht flach:
   ein Eisschild ist ein Koerper, und der Film hat keine Regler, mit denen man
   das selbst herausfindet.

   Dazu wird das Reliefgitter hochgedreht. Die Seite deckelt es bei 680 Zellen,
   weil dort jedes Bild in Echtzeit fallen muss; der Film rechnet Bild fuer
   Bild und hat es nicht eilig. RAUF = 1,4 heisst: das Feld ist feiner als die
   Leinwand breit ist — Farbflaeche und Hoehenlinien kommen damit auf
   Geraeteaufloesung heraus statt auf halbe. Das ist der ganze Unterschied
   zwischen „am Telefon fluessig" und „sieht gut aus". */
const FEIN = Number(process.env.FEIN || 1.4);
await page.evaluate((fein) => {
  halte();
  ZOOM = 1; vX = 0; vY = 0; NEIGUNG = KIPPSTART; DREHUNG = 0;
  for (const s of ['.regler', '.sicht']) {
    const e = document.querySelector(s);
    if (e) e.style.visibility = 'hidden';
  }
  RAUF = fein; FELDMAX = 4000;
  masse(); sichtRechnen();
}, FEIN);
console.error(`Feld ${await page.evaluate(() => rW + ' x ' + rH)}, `
  + `Leinwand ${await page.evaluate(() => breite + ' x ' + hoehe)}`);

const n = Math.round(LAUF * FPS);
const proc = spawn(ffmpeg, [
  '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20',
  '-vf', `scale=${BREITE}:${HOEHE}`, ziel,
], { stdio: ['pipe', 'inherit', 'inherit'] });

const schreibe = b => new Promise(r => proc.stdin.write(b) ? r() : proc.stdin.once('drain', r));

for (let i = 0; i <= n + NACH * FPS; i++) {
  const s = Math.min(1, i / n);
  await page.evaluate(([v, dt]) => {
    dtSek = dt; setzeZeit(v); notizen(); zeichne();
  }, [s, 1 / FPS]);
  await schreibe(await page.screenshot({ type: 'png' }));
  if (i % (FPS * 5) === 0) process.stderr.write(`  ${(100 * i / (n + NACH * FPS)).toFixed(0)} %\n`);
}
proc.stdin.end();
await new Promise(r => proc.on('close', r));
await browser.close();
process.stderr.write(`fertig: ${ziel}\n`);
