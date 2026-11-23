// Seite einer einzelnen Szene (…/raumklang/<szene>/): spielt beim Öffnen sofort los, wenn der
// Browser es erlaubt; sonst ein großer Startknopf. Darunter Drehbuch, Bausteine, Aufnahmen.
import { spieler, zeit, esc, standSuffix } from './spieler.js';

const name = document.body.dataset.szene;          // Name der Renderdatei, z. B. boot
const $ = id => document.getElementById(id);

const b = await fetch(`../audio/${name}.json`).then(r => r.json());
const quellen = await fetch('../quellen.json').then(r => r.json()).catch(() => []);
const nachId = Object.fromEntries(quellen.map(q => [q.id, q]));
const stand = standSuffix(b.stand);
const slug = location.pathname.replace(/\/$/, '').split('/').pop();

$('werte').innerHTML = `<span><b>${zeit(b.dauer)}</b> in Schleife</span><span>Stand <b>${esc(b.stand)}</b></span>` +
  `<span>HRTF <b>${esc(b.hrtf.replace('.sofa', ''))}</b></span><span><a href="../karte/?s=${name}">Szenenkarte</a></span>`;

const haupt = window.haupt = spieler($('spieler'), `../audio/${name}.mp3`, b.abtastwerte, `${slug}${stand}.mp3`, {
  beiFehler: () => { $('start').hidden = false; $('start-knopf').focus(); },
});
$('start-knopf').addEventListener('click', async () => {
  $('start').hidden = true;
  if (!(await haupt.spielen())) $('start').hidden = false;
});
haupt.spielen();          // sofort versuchen – klappt, wenn der Browser Ton ohne Tippen erlaubt

// Teilen: Teilen-Menü des Geräts, sonst Link kopieren
$('teilen').addEventListener('click', async () => {
  const daten = { title: document.title, text: b.text, url: location.href.split('#')[0] };
  if (navigator.share) { try { await navigator.share(daten); return; } catch (e) { if (e.name === 'AbortError') return; } }
  try { await navigator.clipboard.writeText(daten.url); $('teilen-info').textContent = 'Link kopiert'; }
  catch (e) { $('teilen-info').textContent = daten.url; }
  setTimeout(() => { $('teilen-info').textContent = ''; }, 4000);
});

const teile = [];
if (b.drehbuch && b.drehbuch.length) {
  teile.push(`<details><summary>Drehbuch – was in der Szene passiert</summary><ul>` +
    b.drehbuch.map(([t, x]) => `<li><b>${zeit(t)}</b> ${esc(x)}</li>`).join('') + `</ul></details>`);
}
teile.push(`<details><summary>${esc(b.details_titel || (b.gruppen.length ? 'Bausteine einzeln anhören, Aufnahmen' : 'Verwendete Aufnahmen'))}</summary>` +
  b.gruppen.map(g => `<div class="baustein"><h3>${esc(g.titel)}</h3><p>${esc(g.text)}</p>` +
    (g.probe_ab_s != null && g.probe_abtastwerte ? `<p class="leise">Diese Spur allein, ${zeit(g.probe_ab_s)}–${zeit((g.probe_ab_s + g.probe_abtastwerte / 44100) % b.dauer)} der Szene – die Stelle, an der sie am meisten zu hören ist.</p>` : '') +
    `<div class="spieler" data-name="${esc(g.name)}"></div></div>`).join('') +
  (b.gruppen.length ? `<h4>Verwendete Aufnahmen</h4>` : '') + `<div class="tabelle"><table><thead><tr><th>Aufnahme</th><th>Von</th><th>Lizenz</th></tr></thead><tbody>` +
  (b.quellen || []).map(i => nachId[i]).filter(Boolean).map(e =>
    `<tr><td><a href="${esc(e.seite)}">${esc(e.titel || e.datei)}</a></td><td>${esc(e.urheber || '–')}</td><td>${esc(e.lizenz)}</td></tr>`).join('') +
  `</tbody></table></div></details>`);
$('mehr').innerHTML = teile.join('');
for (const g of b.gruppen) {
  const el = document.querySelector(`.spieler[data-name="${g.name}"]`);
  if (el) spieler(el, `../audio/${name}_${g.name}.mp3`, g.probe_abtastwerte, `${slug}_${g.name}${stand}.mp3`);
}
