/* Der Film: dieselbe Seite, hochkant, ohne Regler, als mp4.

   Gedacht für Reddit und alles andere, wo eine Webseite nicht hinpasst. Der
   Inhalt ist der der Seite, nichts nachgebaut — die Seite wird geladen, der
   Regler ausgeblendet und dann Bild für Bild weitergestellt.

   **Warum nicht einfach abfilmen.** Der Browser hier zeichnet weich gerendert
   etwa elf Bilder in der Sekunde. Wer das aufnimmt, bekommt einen Film in
   Zeitlupe oder mit ausgelassenen Bildern. Stattdessen wird die Uhr von Hand
   gestellt: je Bild `dtSek = 1/FPS` und `setzeZeit(i/(n−1))`, genau das, was
   `schlag()` bei flüssigem Lauf täte. Der Tiefpass über die Bilder bekommt
   damit denselben Zeitschritt wie im Browser bei dieser Bildrate, die
   Spielzeit stimmt auf die Sekunde, und gerechnet werden darf, solange es
   dauert.

   **Was anders ist als im Browser.** Die Blenden der Notizen sind
   CSS-Übergänge und hängen an der wirklichen Uhr, nicht an der gestellten. Ein
   Wechsel blendet im Film über zwei Bilder statt über zwölf. Fällt bei neun
   Wechseln auf zweitausendfünfhundert Bildern nicht auf.

   **Aufruf** (braucht `playwright-core` und `ffmpeg-static`, beide nicht im
   Repo — das hier ist Werkzeug, keine Seite):

       node film.mjs ../index.html film.mp4 30

   Dauert etwa fünf Minuten je Minute Film. Die Bilder gehen als JPEG durch
   eine Röhre an ffmpeg, es liegt also nie mehr als ein Bild auf der Platte. */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import ffmpeg from 'ffmpeg-static';

const SEITE = process.argv[2];
const ZIEL  = process.argv[3] ?? 'film.mp4';
const FPS   = Number(process.argv[4] ?? 30);
const NUR   = Number(process.argv[5] ?? 0);        // Probelauf: nur so viele Bilder
// 432 × 768 mit zweieinhalbfacher Auflösung sind 1080 × 1920. Die CSS-Breite
// liegt damit unter 540, also gilt dasselbe Auslegen wie auf dem Telefon.
const CSSB = 432, CSSH = 768, DSF = 2.5;
const HALT = 2;                                    // Sekunden Standbild am Ende

// CHROMIUM zeigt auf einen mitgelieferten Browser, falls playwright keinen
// eigenen gefunden hat.
const browser = await chromium.launch({ args: ['--no-sandbox'],
  executablePath: process.env.CHROMIUM || undefined });
const seite = await browser.newPage({ viewport: { width: CSSB, height: CSSH }, deviceScaleFactor: DSF });
seite.on('pageerror', e => console.error('Seitenfehler:', e.message));
await seite.goto('file://' + SEITE);
await seite.waitForTimeout(2500);

// Regler weg, Rahmen weg: die Bühne füllt das Bild bis an den Rand.
await seite.addStyleTag({ content: `
  .regler{display:none!important}
  .wrap{padding:0!important;max-width:none!important}
  .buehne{border:none!important;border-radius:0!important;padding:10px 12px 6px!important}
  body{background:var(--surface)!important}
` });
await seite.waitForTimeout(400);

const DAUER = await seite.evaluate(() => { laeuft = false; masse(); reliefFrisch(); return DAUER; });
const N = NUR || Math.round(DAUER / 1000 * FPS);
console.error(`${DAUER / 1000} s · ${FPS} Bilder/s · ${N} Bilder · ${CSSB * DSF}×${CSSH * DSF}`);

const ff = spawn(ffmpeg, ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '23', '-pix_fmt', 'yuv420p',
  '-movflags', '+faststart', ZIEL], { stdio: ['pipe', 'ignore', 'pipe'] });
let klage = '';
ff.stderr.on('data', d => { klage += d; });
const fertig = new Promise((gut, schlecht) =>
  ff.on('close', c => c === 0 ? gut() : schlecht(new Error(klage.slice(-2000)))));
const schiebe = async b => { if (!ff.stdin.write(b)) await new Promise(r => ff.stdin.once('drain', r)); };

const t0 = Date.now();
let letztes = null;
for (let i = 0; i < N; i++) {
  await seite.evaluate(([i, n, fps]) => { dtSek = 1 / fps; setzeZeit(n > 1 ? i / (n - 1) : 0); zeichne(); },
                       [i, N, FPS]);
  letztes = await seite.screenshot({ type: 'jpeg', quality: 92 });
  await schiebe(letztes);
  if (i % 150 === 0 || i === N - 1) {
    const s = (Date.now() - t0) / 1000;
    console.error(`  ${i + 1}/${N}  ${(s / (i + 1) * 1000).toFixed(0)} ms je Bild  `
      + `noch ${((N - i - 1) * s / (i + 1) / 60).toFixed(1)} min`);
  }
}
// Zwei Sekunden auf dem Schlussbild stehenbleiben, damit der Film nicht mitten
// in 2024 abreisst. Dasselbe Bild noch einmal, nicht neu gemalt.
for (let k = 0; letztes && k < HALT * FPS; k++) await schiebe(letztes);
ff.stdin.end();
await fertig;
await browser.close();
console.error('fertig:', ZIEL);
