// Schreibt die Projektliste aus projects.json in den markierten Block der README.
// Aufruf: node tools/readme.mjs   (--check prüft nur, ohne zu schreiben)

import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const BASIS = 'https://chillchamp1.github.io/lab';
const START = '<!-- PROJEKTE:START -->';
const ENDE = '<!-- PROJEKTE:ENDE -->';

const projekte = JSON.parse(readFileSync('projects.json', 'utf8'));

const zeilen = projekte
  .slice()
  .sort((a, b) => String(b.datum ?? '').localeCompare(String(a.datum ?? '')))
  .map(p => {
    const fehlt = !existsSync(`${p.slug}/index.html`);
    const doku = existsSync(`${p.slug}/README.md`) ? ` · [Doku](${p.slug}/README.md)` : '';
    const warn = fehlt ? ' ⚠️ *kein index.html*' : '';
    return `- **[${p.titel ?? p.slug}](${BASIS}/${p.slug}/)** — ${p.beschreibung ?? ''}${doku}${warn}`;
  });

const block = zeilen.length
  ? zeilen.join('\n')
  : '*Noch nichts hier.*';

const readme = readFileSync('README.md', 'utf8');
const i = readme.indexOf(START);
const j = readme.indexOf(ENDE);
if (i === -1 || j === -1) {
  console.error(`Marker ${START} / ${ENDE} fehlen in README.md`);
  process.exit(1);
}

const neu = readme.slice(0, i + START.length) + '\n\n' + block + '\n\n' + readme.slice(j);

if (process.argv.includes('--check')) {
  const gleich = neu === readme;
  console.log(gleich ? 'README ist aktuell.' : 'README weicht ab — node tools/readme.mjs ausführen.');
  process.exit(gleich ? 0 : 1);
}

if (neu !== readme) {
  writeFileSync('README.md', neu);
  console.log(`README aktualisiert — ${projekte.length} Projekt(e).`);
} else {
  console.log('README war schon aktuell.');
}
