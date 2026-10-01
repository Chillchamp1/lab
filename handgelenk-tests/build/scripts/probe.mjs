// Dev-only probe (needs the dev server on :5173, which exposes window.__ctl / __store):
// prints camera distance / target and takes side views of the forearm in each presentation.
//   node scripts/probe.mjs
/* global window */
import puppeteer from 'puppeteer-core';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new',
  userDataDir: mkdtempSync(join(tmpdir(), 'wrist-probe-')),
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
await page.goto(process.argv[2] ?? 'http://localhost:5173/', { waitUntil: 'load' });
await sleep(5000);
const read = (label) => page.evaluate((label) => {
  const c = window.__ctl;
  if (!c) return { label, ctl: false };
  const t = c.getTarget(new c.camera.position.constructor());
  const r = (v) => v.toArray().map((x) => +x.toFixed(3));
  return { label, dist: +c.distance.toFixed(3), cam: r(c.camera.position), target: r(t), view: window.__store.getState().view };
}, label);
const out = [await read('start')];

// side view of the whole forearm (camera lateral of the right arm, 0.95 m away)
for (const present of ['skin', 'xray']) {
  await page.evaluate((present) => {
    window.__store.getState().setPresent(present);
    window.__ctl.rotateTo(-Math.PI / 2, 1.35, false);
    window.__ctl.dollyTo(0.95, false);
  }, present);
  await sleep(2500);
  await page.screenshot({ path: `dist-artifact/probe-side-${present}.png` });
}
out.push(await read('side'));
console.log(JSON.stringify(out), errors);
await browser.close();
