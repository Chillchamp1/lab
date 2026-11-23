// Seite einer einzelnen Szene (…/raumklang/<adresse>/): schlicht – Titel, Spieler, Live-Karte, Teilen.
// Spielt beim Öffnen sofort los, wenn der Browser es erlaubt; sonst ein großer Startknopf.
// Die Karte folgt der Abspielzeit: jede Klangquelle als Punkt, so wie der Renderer sie gesetzt hat.
// Drehbuch, Bausteine und Aufnahmen stehen eingeklappt unter „About this scene“.
import { spieler, zeit, esc, standSuffix, standText } from './spieler.js';
import { ladeKarte, zeichneKarte, drehbuchJetzt } from './karte.js';

const name = document.body.dataset.szene;          // Name der Renderdatei, z. B. boot
const $ = id => document.getElementById(id);
const slug = location.pathname.replace(/\/$/, '').split('/').pop();

const b = await fetch(`../audio/${name}.json`).then(r => r.json());
const stand = standSuffix(b.stand);

const haupt = window.haupt = spieler($('spieler'), `../audio/${name}.mp3`, b.abtastwerte, `${slug}${stand}.mp3`, {
  beiFehler: () => { $('start').hidden = false; $('start-knopf').focus(); },
  titel: b.titel,
});
$('start-knopf').addEventListener('click', async () => {
  $('start').hidden = true;
  if (!(await haupt.spielen())) $('start').hidden = false;
});
haupt.spielen();          // sofort versuchen – klappt, wenn der Browser Ton ohne Tippen erlaubt

// ---------- Live-Karte: von oben, im Bezug des Hörers
const canvas = $('karte');
let K = null, letzteLegende = '';
ladeKarte(`../audio/${name}_karte.json`).then(k => { K = k; malen(); }).catch(() => { canvas.closest('.kartenbox').hidden = true; });
function malen() {
  const t = haupt.position();
  const aktiv = zeichneKarte(canvas, K, t, { log: true });
  $('jetzt').textContent = drehbuchJetzt(K, t);
  // Legende: immer alle Gruppen; was gerade zu hören ist, leuchtet auf
  if (!letzteLegende) {
    $('legende').innerHTML = K.gruppen.map(g => `<span data-g="${esc(g.name)}"><i style="background:${K.farbe[g.name]};color:${K.farbe[g.name]}"></i>${esc(g.titel)}</span>`).join('');
    letzteLegende = 'gebaut';
  }
  for (const el of $('legende').children) el.classList.toggle('an', aktiv.has(el.dataset.g));
  requestAnimationFrame(malen);
}

// ---------- Teilen: Teilen-Menü des Geräts, sonst Link kopieren
$('teilen').addEventListener('click', async () => {
  const daten = { title: document.title, text: b.titel, url: location.href.split('#')[0] };
  if (navigator.share) { try { await navigator.share(daten); return; } catch (e) { if (e.name === 'AbortError') return; } }
  try { await navigator.clipboard.writeText(daten.url); $('teilen-info').textContent = 'Link copied'; }
  catch (e) { $('teilen-info').textContent = daten.url; }
  setTimeout(() => { $('teilen-info').textContent = ''; }, 4000);
});

// ---------- About this scene (eingeklappt, Bausteine erst beim Aufklappen bauen)
$('werte').innerHTML = `<span><b>${zeit(b.dauer)}</b> loop</span><span>Version <b>${esc(standText(b.stand))}</b></span>` +
  `<span>HRTF <b>${esc(b.hrtf.replace('.sofa', ''))}</b></span><span><a href="../karte/?s=${name}">Full scene map</a></span>`;
let mehrGebaut = false;
document.querySelector('details.ueber').addEventListener('toggle', async e => {
  if (!e.target.open || mehrGebaut) return;
  mehrGebaut = true;
  const quellen = await fetch('../quellen.json').then(r => r.json()).catch(() => []);
  const nachId = Object.fromEntries(quellen.map(q => [q.id, q]));
  const teile = [];
  if (b.drehbuch && b.drehbuch.length) {
    teile.push(`<details><summary>Script – what happens in the scene</summary><ul>` +
      b.drehbuch.map(([t, x]) => `<li><b>${zeit(t)}</b> ${esc(x)}</li>`).join('') + `</ul></details>`);
  }
  teile.push(`<details><summary>${b.gruppen.length ? 'Listen to the layers one by one, recordings used' : 'Recordings used'}</summary>` +
    b.gruppen.map(g => `<div class="baustein"><h3>${esc(g.titel)}</h3><p>${esc(g.text)}</p>` +
      (g.probe_ab_s != null && g.probe_abtastwerte ? `<p class="leise">This layer on its own, ${zeit(g.probe_ab_s)}–${zeit((g.probe_ab_s + g.probe_abtastwerte / 44100) % b.dauer)} of the scene – where there is most of it to hear.</p>` : '') +
      `<div class="spieler" data-name="${esc(g.name)}"></div></div>`).join('') +
    (b.gruppen.length ? `<h4>Recordings used</h4>` : '') + `<div class="tabelle"><table><thead><tr><th>Recording</th><th>By</th><th>Licence</th></tr></thead><tbody>` +
    (b.quellen || []).map(i => nachId[i]).filter(Boolean).map(q =>
      `<tr><td><a href="${esc(q.seite)}">${esc(q.titel || q.datei)}</a></td><td>${esc(q.urheber || '–')}</td><td>${esc(q.lizenz.replace('Public domain', 'public domain').replace('gemeinfrei', 'public domain'))}</td></tr>`).join('') +
    `</tbody></table></div></details>`);
  $('mehr').innerHTML = teile.join('');
  for (const g of b.gruppen) {
    const el = document.querySelector(`.spieler[data-name="${g.name}"]`);
    if (el) spieler(el, `../audio/${name}_${g.name}.mp3`, g.probe_abtastwerte, `${slug}_${g.name}${stand}.mp3`);
  }
});
