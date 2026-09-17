// Ein spielbares mp4 aus dem, was ein laufender Filmlauf schon fertig hat.
//
//   node zwischenstand.mjs <teile-ordner> [ziel.mp4] [fassung]
//
// `film.mjs` rechnet in Abschnitten von 240 Bildern, und jeder fertige
// Abschnitt ist fuer sich ein mp4 mit einer **Quittung** daneben, die erst nach
// dem Schliessen des Kodierers geschrieben wird. Genau das macht diesen Blick
// moeglich: was eine Quittung hat, ist ganz und laesst sich ohne Neukodieren
// aneinanderhaengen — waehrend der Lauf am naechsten Abschnitt weiterrechnet.
//
// Ohne die Quittung waere es gefaehrlich: der Abschnitt, an dem gerade
// gerechnet wird, liegt als halbe Datei daneben und wuerde den Zusammenschnitt
// abschneiden oder zerreissen. Eine halbe Datei ohne Quittung zaehlt nicht.

import { spawn } from 'node:child_process';
import { resolve, join } from 'node:path';
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';

const [, , ordner, ziel = 'zwischenstand.mp4', fassung = 'reddit'] = process.argv;
if (!ordner) {
  console.error('node zwischenstand.mjs <teile-ordner> [ziel.mp4] [fassung]');
  process.exit(2);
}
const ffmpeg = (await import('ffmpeg-static')).default;

/* Nur Abschnitte mit Quittung, und in der Reihenfolge ihrer Nummer — die
   Dateinamen sind auf fuenf Stellen aufgefuellt, damit das die Sortierung
   schon erledigt. */
const da = readdirSync(ordner);
const marken = da.filter(f => f.startsWith('q-')).map(f => f.slice(2)).sort();
const teile = [];
let bilder = 0;
for (const m of marken) {
  const datei = join(ordner, `${fassung}-${m}.mp4`);
  if (!da.includes(`${fassung}-${m}.mp4`)) continue;
  teile.push(datei);
  bilder += Number(readFileSync(join(ordner, 'q-' + m), 'utf8').trim()) || 0;
}
if (!teile.length) {
  console.error('noch kein Abschnitt fertig — es gibt keine Quittung');
  process.exit(1);
}

const liszt = join(ordner, `zwischen-${fassung}.txt`);
writeFileSync(liszt, teile.map(d => `file '${d}'`).join('\n') + '\n');
await new Promise((r, x) => {
  const p = spawn(ffmpeg, ['-y', '-loglevel', 'error', '-nostats',
    '-f', 'concat', '-safe', '0', '-i', liszt,
    '-c', 'copy', '-movflags', '+faststart', resolve(ziel)],
    { stdio: ['ignore', 'inherit', 'inherit'] });
  p.on('close', c => c === 0 ? r() : x(new Error('concat ' + c)));
});
const mb = (statSync(resolve(ziel)).size / 1048576).toFixed(1);
console.error(`${resolve(ziel)}  ${teile.length} Abschnitte  ${bilder} Bilder  `
  + `${(bilder / 30).toFixed(1)} s  ${mb} MB`);
