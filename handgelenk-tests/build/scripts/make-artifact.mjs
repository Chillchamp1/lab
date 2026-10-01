// Turns the single-file build into an artifact page body:
// the artifact host adds its own <!doctype>/<head>/<body>, and only scans the first 8 KB for <title>.
import { readFileSync, writeFileSync } from 'node:fs';

const html = readFileSync('dist-artifact/index.html', 'utf8');
const pick = (re) => [...html.matchAll(re)].map((m) => m[0]);
const title = pick(/<title>[\s\S]*?<\/title>/g);
const links = pick(/<link\b[^>]*>/g);
const styles = pick(/<style\b[\s\S]*?<\/style>/g);
const scripts = pick(/<script\b[\s\S]*?<\/script>/g);
const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/)[1].replace(/<script\b[\s\S]*?<\/script>/g, '').trim();

const out = [...title, ...links, ...styles, body, ...scripts].join('\n');
writeFileSync('dist-artifact/wrist3d.html', out);
console.log(`dist-artifact/wrist3d.html  ${(out.length / 1024).toFixed(0)} KB`);
