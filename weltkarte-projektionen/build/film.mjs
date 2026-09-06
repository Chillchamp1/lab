// Erzeugt aus der fertigen index.html ein Video im Hochformat (1080 × 1920)
// für Telefone: nur Karte, Dreieck, Zustandszeile und Legende, alles darunter
// fällt weg, kein Titel.
//
// Nicht in Echtzeit mitgeschnitten, sondern Bild für Bild gestellt. Der Treiber
// rechnet dieselbe Beschleunigungskurve wie animiere() in der Seite, setzt den
// Zustand über setze() beziehungsweise zielA/zielB/u und ruft zeichne() auf.
// Die Bewegung ist damit exakt die der Webseite und hängt nicht davon ab, wie
// lange ein einzelnes Bild zum Rendern braucht. Die Bilder gehen als PNG durch
// eine Pipe direkt an ffmpeg — es liegt nie ein Einzelbild auf der Platte.
//
// Aufruf:  node film.mjs [zieldatei.mp4]
//
// Braucht playwright und ein ffmpeg mit libx264 (etwa über das Paket
// ffmpeg-static). Beides ist keine Abhängigkeit der Seite selbst — die bleibt
// ohne npm; hier geht es um ein Werkzeug daneben.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const hier = dirname(fileURLToPath(import.meta.url));
const SEITE = 'file://' + resolve(hier, '..', 'index.html');

// ffmpeg-static, wenn vorhanden; sonst das ffmpeg aus dem Pfad.
let ffmpegPfad = 'ffmpeg';
try { ffmpegPfad = createRequire(import.meta.url)('ffmpeg-static'); } catch { /* dann eben aus dem Pfad */ }

const FPS = 30;
const B = 1080, H = 1920, DSF = 2;         // 9:16, wie es auf einem Telefon steht
const ZIEL = process.argv[2] || resolve(process.cwd(), 'weltkarte.mp4');

const browser = await chromium.launch({ ...(process.env.CHROMIUM_PFAD ? { executablePath: process.env.CHROMIUM_PFAD } : {}) });
const p = await browser.newPage({ viewport: { width: B / DSF, height: H / DSF }, deviceScaleFactor: DSF });
const fehler = [];
p.on('pageerror', e => fehler.push(String(e)));
p.on('console', m => { if (m.type() === 'error') fehler.push(m.text()); });
await p.goto(SEITE);
await p.waitForTimeout(900);

// Alles unterhalb der Skala fällt weg; der Rest steht mittig im Hochformat.
await p.addStyleTag({ content: `
  body{display:flex;align-items:center;justify-content:center;min-height:100vh}
  .wrap{padding:0 18px;width:100%}
  .wrap > *{display:none !important}
  .wrap > figure, .wrap > .tri, .wrap > .jetzt, .wrap > .skala{display:block !important}
  .skala{max-width:none}
  figure{margin:0 -8px}
  .tri{margin:20px auto 0;max-width:420px}
  .tri text{font-size:15px}
  .jetzt{margin-top:10px;font-size:23px}
  .jetzt .wie{font-size:17px;margin-top:3px}
  .jetzt .proz{font-size:19px}
  .skala{margin-top:30px}
  .skala .titel{font-size:16px;margin-bottom:9px}
  .skala .bar{height:14px}
  .skala .bar b{height:4px;top:calc(100% + 4px)}
  .skala .marken{font-size:15px;height:20px;margin-top:13px}
  .skala .jetztwert{font-size:16px;margin-top:9px}
` });
await p.evaluate(() => {
  // Fürs Hochformat bekommt die Karte ein fast quadratisches Feld statt der
  // 1,30:1 der Webseite. Equal Earth ist ohnehin breitenbegrenzt und bleibt
  // gleich gross; Mercator und der Globus nutzen die gewonnene Höhe.
  messe = function () {
    const w = cv.parentElement.clientWidth;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    breite = w; hoehe = Math.round(w / 1.02);
    cv.width = Math.round(breite * dpr); cv.height = Math.round(hoehe * dpr);
    cv.style.height = hoehe + 'px';
    duenneAus();
  };
  messe(); zeichne();
});
await p.waitForTimeout(400);

const dauern = await p.evaluate(() => ({ t: DAUER, u: DAUER_WECHSEL, halt: HALT }));
console.log('Dauern aus der Seite:', JSON.stringify(dauern));

// Die Folge des Rundlaufs, genau wie RUNDLAUF in der Seite. Der Regler steht
// zu Beginn auf Mercator, das Ziel ist Equal Earth (1).
const R = [
  { art: 'regler', von: 0, nach: 1, dauer: dauern.t },                 // Mercator → Equal Earth
  { art: 'wechsel', von: 1, nach: 2, dauer: dauern.u },                // Equal Earth → Globus
  { art: 'regler', von: 1, nach: 0, dauer: dauern.t },                 // Globus → Mercator
  { art: 'regler', von: 0, nach: 1, dauer: dauern.t },                 // Mercator → Globus
  { art: 'wechsel', von: 2, nach: 1, dauer: dauern.u },                // Globus → Equal Earth
  { art: 'regler', von: 1, nach: 0, dauer: dauern.t },                 // Equal Earth → Mercator
];
const gesamt = R.reduce((s, x) => s + x.dauer + dauern.halt, 0);
const bilder = Math.round(gesamt / 1000 * FPS);
console.log(`Rundlauf ${(gesamt / 1000).toFixed(2)} s → ${bilder} Bilder bei ${FPS}/s`);

const ff = spawn(ffmpegPfad, [
  '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', 'pipe:0',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '20',
  '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
  '-vf', `scale=${B}:${H}:flags=lanczos`, ZIEL,
]);
ff.stderr.on('data', () => {});
const fertig = new Promise((ok, weg) => { ff.on('close', c => c === 0 ? ok() : weg(new Error('ffmpeg ' + c))); });
const schreib = buf => new Promise(ok => ff.stdin.write(buf) ? ok() : ff.stdin.once('drain', ok));

// Beschleunigungskurve, wortgleich zu animiere() in der Seite.
const kurve = q => q < .5 ? 4 * q * q * q : 1 - Math.pow(-2 * q + 2, 3) / 2;

let n = 0;
const bild = async () => { await schreib(await p.screenshot({ type: 'png' })); n++; };

// Ausgangszustand: Mercator, Ziel Equal Earth.
await p.evaluate(() => { zielA = 1; zielB = 1; u = 1; setze(0, { schieber: false }); beschrifte(); zeichne(); });

for (const s of R) {
  const schritte = Math.round(s.dauer / 1000 * FPS);
  for (let i = 1; i <= schritte; i++) {
    const e = kurve(i / schritte);
    if (s.art === 'regler') {
      await p.evaluate(v => { setze(v, { schieber: false }); zeichne(); }, s.von + (s.nach - s.von) * e);
    } else {
      await p.evaluate(([a, b, e]) => { zielA = a; zielB = b; u = e; beschrifte(); zeichne(); }, [s.von, s.nach, e]);
    }
    await bild();
  }
  // Zustand einrasten und stehen lassen.
  if (s.art === 'wechsel') await p.evaluate(b => { zielA = b; zielB = b; u = 1; knoepfe(); beschrifte(); zeichne(); }, s.nach);
  const halt = Math.round(dauern.halt / 1000 * FPS);
  for (let i = 0; i < halt; i++) await bild();
  process.stderr.write(`  ${s.art} ${s.von}→${s.nach}: ${n} Bilder\n`);
}

ff.stdin.end();
await fertig;
await browser.close();
console.log(`${n} Bilder geschrieben, Fehler: ${fehler.length ? fehler.join(';') : 'keine'}`);
