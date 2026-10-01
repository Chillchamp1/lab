// Publishes the built site into the lab repo layout: this folder is <lab>/handgelenk-tests/build/, GitHub Pages serves
// <lab>/handgelenk-tests/index.html + assets/. Run via `npm run lab` (builds first), then commit and push the lab repo.
import { cpSync, existsSync, rmSync } from 'node:fs';

if (!existsSync('../../projects.json')) {
  console.error('Not inside the lab repo (../../projects.json missing): nothing copied.');
  process.exit(1);
}
rmSync('../assets', { recursive: true, force: true }); // hashed file names change with every build
cpSync('dist/assets', '../assets', { recursive: true });
cpSync('dist/index.html', '../index.html');
console.log('copied dist/ → ../index.html, ../assets/');
