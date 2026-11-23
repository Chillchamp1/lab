// Spieler für die Klangszenen.
//
// Startet sofort: ein <audio>-Element streamt die Datei (der Browser lädt nach und nach, Springen
// lädt nur den nötigen Teil). Im Hintergrund wird die ganze Datei geladen und dekodiert; an der
// nächsten Schleifennaht übernimmt dann die Web-Audio-Schleife, die sample-genau ohne Lücke
// wiederholt. Bis dahin – oder wenn das Gerät zu wenig Speicher hat – wiederholt das Element selbst
// (`loop`), was je nach Browser an der Naht kurz aussetzen kann; die Naht liegt in einem ruhigen Moment.

export const FS = 44100;
export const zeit = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
export const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let ctx = null, aktiv = null;
function kontext() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}
// genug Speicher für eine ganz dekodierte Szene (10 min Stereo ≈ 210 MB)?
const vielSpeicher = () => !navigator.deviceMemory || navigator.deviceMemory >= 4;

/**
 * el: Behälter; src: MP3; soll: Länge in Abtastwerten (44,1 kHz); dateiname: für den Download.
 * opt.beiFehler(grund): wird gerufen, wenn der Browser das Abspielen ohne Tippen verweigert.
 * Rückgabe: { spielen, stopp, laeuft() }
 */
export function spieler(el, src, soll, dateiname, opt = {}) {
  el.innerHTML = `<button aria-label="Play">▶</button><div class="leiste"><i></i><span></span></div>` +
    `<span class="zeit">0:00</span>` + (dateiname ? `<a href="${src}" download="${esc(dateiname)}">MP3</a>` : '');
  const knopf = el.querySelector('button'), leiste = el.querySelector('.leiste');
  const balken = leiste.querySelector('span'), geladen = leiste.querySelector('i'), anz = el.querySelector('.zeit');
  const audio = new Audio();
  audio.preload = 'none';
  audio.src = src;
  audio.loop = true;
  let puffer = null, laedt = false, quelle = null, verst = null;
  let modus = null;               // 'element' | 'puffer' | null (angehalten)
  let start = 0, ab = 0, naht = false;
  const dauer = () => soll ? soll / FS : (puffer ? puffer.duration : (isFinite(audio.duration) ? audio.duration : 0));

  function position() {
    if (modus === 'puffer') { const d = puffer.duration; return (((ctx.currentTime - start) % d) + d) % d; }
    if (modus === 'element') return audio.currentTime % (dauer() || 1);
    return ab;
  }
  function anzeigen() {
    const d = dauer(), p = position();
    if (d) {
      balken.style.width = (100 * p / d) + '%';
      anz.textContent = `${zeit(p)} / ${zeit(d)}`;
      if (puffer) geladen.style.width = '100%';
      else if (audio.buffered.length) geladen.style.width = (100 * Math.min(audio.buffered.end(audio.buffered.length - 1) / d, 1)) + '%';
    }
  }
  function tick() {
    if (!modus) return;
    anzeigen();
    // an der Naht vom Element auf die lückenlose Schleife wechseln
    if (modus === 'element' && puffer && !naht && ctx && ctx.state === 'running') {
      const rest = dauer() - audio.currentTime;
      if (rest > 0.05 && rest < 0.6) wechselAnDerNaht(rest);
    }
    requestAnimationFrame(tick);
  }
  function wechselAnDerNaht(rest) {
    naht = true;
    audio.loop = false;
    const t0 = ctx.currentTime + rest;
    pufferStarten(0, t0, 0.02);
    setTimeout(() => { if (modus === 'puffer') audio.pause(); }, rest * 1000 + 20);
  }

  async function laden() {
    if (puffer || laedt || !vielSpeicher()) return;
    laedt = true;
    try {
      const c = kontext();
      const roh = await c.decodeAudioData(await (await fetch(src)).arrayBuffer());
      // manche Browser hängen beim Dekodieren die Stille des Kodierers an: auf die Soll-Länge kürzen
      const n = soll ? Math.round(soll * c.sampleRate / FS) : roh.length;
      if (soll && roh.length > n + 2) {
        const vor = Math.min(Math.round(1105 * c.sampleRate / FS), roh.length - n);
        const b = c.createBuffer(roh.numberOfChannels, n, c.sampleRate);
        for (let k = 0; k < roh.numberOfChannels; k++) b.copyToChannel(roh.getChannelData(k).subarray(vor, vor + n), k);
        puffer = b;
      } else puffer = roh;
    } catch (e) { /* bleibt beim Element mit loop */ }
    laedt = false;
  }

  function pufferStarten(von, wann, einblenden) {
    const c = kontext();
    if (quelle) { try { quelle.stop(); } catch (e) {} }
    quelle = c.createBufferSource(); quelle.buffer = puffer; quelle.loop = true;
    verst = c.createGain();
    verst.gain.setValueAtTime(0, wann); verst.gain.linearRampToValueAtTime(1, wann + einblenden);
    quelle.connect(verst).connect(c.destination);
    quelle.start(wann, von % puffer.duration);
    start = wann - von; modus = 'puffer';
  }

  function stopp() {
    if (!modus) return;
    ab = position();
    if (modus === 'puffer' && quelle) {
      const t = ctx.currentTime, q = quelle, v = verst;
      v.gain.cancelScheduledValues(t); v.gain.setValueAtTime(v.gain.value, t); v.gain.linearRampToValueAtTime(0, t + 0.25);
      q.stop(t + 0.3); quelle = null;
    }
    audio.pause();
    modus = null; naht = false;
    knopf.textContent = '▶'; knopf.setAttribute('aria-label', 'Play');
    anzeigen();
  }

  async function spielen(von = ab) {
    if (aktiv && aktiv !== api) aktiv.stopp();
    aktiv = api;
    if (modus) stopp();
    knopf.textContent = '❚❚'; knopf.setAttribute('aria-label', 'Pause');
    // Web Audio vorbereiten, solange wir im Tipp des Nutzers sind (Safari erlaubt es sonst nicht)
    // (ohne Tippen bleibt resume() in Chrome einfach hängen – deshalb nicht endlos warten)
    try { await Promise.race([kontext().resume(), new Promise(r => setTimeout(r, 300))]); } catch (e) {}
    if (puffer && ctx.state === 'running') {
      pufferStarten(von, ctx.currentTime + 0.02, 1.2);
    } else {
      audio.loop = true; naht = false;
      try {
        if (von) audio.currentTime = von;
        await audio.play();
      } catch (e) {
        knopf.textContent = '▶'; knopf.setAttribute('aria-label', 'Play');
        modus = null;
        if (opt.beiFehler) opt.beiFehler(e && e.name);
        return false;
      }
      modus = 'element';
      // die ganze Datei erst laden, wenn das Streamen läuft – das hat Vorrang
      setTimeout(laden, 4000);
    }
    requestAnimationFrame(tick);
    return true;
  }

  audio.addEventListener('loadedmetadata', anzeigen);
  audio.addEventListener('progress', anzeigen);
  audio.addEventListener('waiting', () => { if (modus === 'element') knopf.textContent = '…'; });
  audio.addEventListener('playing', () => { if (modus === 'element') knopf.textContent = '❚❚'; });
  knopf.addEventListener('click', () => modus ? stopp() : spielen());
  leiste.addEventListener('click', e => {
    const d = dauer();
    if (!d) return;
    const r = leiste.getBoundingClientRect();
    const ziel = Math.max(0, Math.min((e.clientX - r.left) / r.width, 0.999)) * d;
    if (modus) spielen(ziel); else { ab = ziel; anzeigen(); }
  });
  if (soll) anz.textContent = `0:00 / ${zeit(soll / FS)}`;
  const api = { spielen, stopp, laeuft: () => !!modus, modus: () => modus, position, dauer };
  return api;
}

const MONATE = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// Stand „23.11.2026 17:05“ (aus dem Bericht) für die Seite: „23 Nov 2026, 17:05“
export function standText(stand) {
  const m = String(stand || '').match(/(\d+)\.(\d+)\.(\d+)\s+(\d+):(\d+)/);
  return m ? `${+m[1]} ${MONATE[m[2] - 1]} ${m[3]}, ${m[4]}:${m[5]}` : String(stand || '');
}

// Dateiname beim Herunterladen mit dem Stand der Fassung, z. B. sea_2026-11-23_17-05.mp3
export function standSuffix(stand) {
  const m = String(stand || '').match(/(\d+)\.(\d+)\.(\d+)\s+(\d+):(\d+)/);
  return m ? `_${m[3]}-${m[2]}-${m[1]}_${m[4]}-${m[5]}` : '';
}
