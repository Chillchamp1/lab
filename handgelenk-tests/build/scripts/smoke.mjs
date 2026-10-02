// Smoke test in a real (headless) browser with a running frame loop:
//   node scripts/smoke.mjs [url]        default: the single-file build served on :5174
// Reports console errors, frame rate, whether the player advances, and whether drag / wheel move the camera.
// Uses the locally installed Chrome with a throwaway profile; screenshots go to dist-artifact/smoke-*.png.
/* global document, requestAnimationFrame */
import puppeteer from 'puppeteer-core';
import { createHash } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const URL = process.argv[2] ?? 'http://localhost:5174/wrist3d.html';
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new', userDataDir: mkdtempSync(join(tmpdir(), 'wrist-smoke-')),
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--window-size=1280,900'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)); });
page.on('pageerror', (e) => errors.push('PAGEERROR ' + String(e.message).slice(0, 300)));

const shot = async (name) => {
  const buf = await page.screenshot({ path: `dist-artifact/smoke-${name}.png` });
  return createHash('md5').update(buf).digest('hex').slice(0, 8);
};
const canvasShot = async () => {
  const el = await page.$('.view canvas');
  return createHash('md5').update(await el.screenshot()).digest('hex').slice(0, 8);
};
const fps = () => page.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else res(n / 2); }; requestAnimationFrame(f); }));
const text = (sel) => page.evaluate((s) => document.querySelector(s)?.textContent ?? null, sel);

const out = {};
await page.goto(URL, { waitUntil: 'load' });
await sleep(5000);
out.startFps = await fps();
out.tests = await page.evaluate(() => document.querySelectorAll('.row.test').length);
await shot('1-start');

await page.click('#test-druj_ballottement');
await sleep(1500);
out.pausedOnOpen = (await text('#pl-play')).includes('Play');
await page.click('#pl-play');
await sleep(9000); // part 1 lasts 3 s at half speed: it must have looped, not advanced
out.stepWhileLooping = await text('.tl-count');
await page.click('#pl-next');
await sleep(1200);
out.afterNext = `${await text('.tl-count')} / ${(await text('#pl-play')).includes('Pause') ? 'playing' : 'paused'}`;
out.testFps = await fps();
// the instruction sits on the stage, with a pointer line from the box to the spot the step is about
out.callout = await page.evaluate(() => {
  const box = document.querySelector('#callout'), view = document.querySelector('.view'), ln = document.querySelector('.pointer line.ln');
  if (!box || !view || !ln) return null;
  const b = box.getBoundingClientRect(), v = view.getBoundingClientRect();
  const n = (k) => Math.round(+ln.getAttribute(k));
  return {
    text: box.querySelector('p')?.textContent?.slice(0, 40),
    box: [b.left - v.left, b.top - v.top, b.width, b.height].map(Math.round), view: [v.width, v.height].map(Math.round),
    line: [n('x1'), n('y1'), n('x2'), n('y2')], lineShown: document.querySelector('.pointer').style.opacity === '1',
  };
});
await shot('2-test');

// orbit: drag on the canvas, away from the overlays
const box = await (await page.$('.view')).boundingBox();
const cx = box.x + box.width * 0.5, cy = box.y + box.height * 0.35;
await page.click('#pl-play'); // pause so only the camera changes the picture
await sleep(500);
const before = await canvasShot();
await page.mouse.move(cx, cy); await page.mouse.down(); await page.mouse.move(cx + 160, cy + 30, { steps: 12 }); await page.mouse.up();
await sleep(1200);
const afterDrag = await canvasShot();
out.dragChangesView = before !== afterDrag;
await shot('3-dragged');
await page.mouse.move(cx, cy);
for (let i = 0; i < 6; i++) { await page.mouse.wheel({ deltaY: -120 }); await sleep(250); } // six wheel notches toward the wrist
await sleep(1200);
out.wheelChangesView = afterDrag !== (await canvasShot());
await shot('4-zoomed');

// scrub: drag along the timeline from 10 % to 85 %
const tb = await (await page.$('.track')).boundingBox();
await page.mouse.move(tb.x + tb.width * 0.1, tb.y + tb.height / 2); await page.mouse.down();
await page.mouse.move(tb.x + tb.width * 0.85, tb.y + tb.height / 2, { steps: 10 }); await page.mouse.up();
await sleep(600);
out.stepAfterScrub = await text('.tl-count');
await page.mouse.move(tb.x + tb.width * 0.85, tb.y + tb.height / 2); await page.mouse.down();
await page.mouse.move(tb.x + tb.width * 0.05, tb.y + tb.height / 2, { steps: 10 }); await page.mouse.up();
await sleep(600);
out.stepAfterScrubBack = await text('.tl-count');
await page.click('#present-skin'); await sleep(1500); await shot('5-skin');
// exercises tab: list, an exercise with an object in the hand, the player
await page.click('#mode-train'); await sleep(1500);
out.exercises = await page.evaluate(() => document.querySelectorAll('[id^="ex-"]').length);
await page.click('#ex-hammer_rotation'); await sleep(1500);
await page.click('#pl-play'); await sleep(2500);
await page.click('#pl-next'); await sleep(1500);
out.exercise = `${await text('.tl-count')} / ${(await text('#callout p'))?.slice(0, 40)}`;
out.sourcesInCard = await page.evaluate(() => document.querySelectorAll('.sources li').length);
await shot('7-exercise');
await page.click('#mode-free'); await sleep(2500);
out.exploreSliders = await page.evaluate(() => document.querySelectorAll('input[type=range]').length);
await shot('6-explore');

out.errors = errors;
console.log(JSON.stringify(out, null, 1));
await browser.close();
