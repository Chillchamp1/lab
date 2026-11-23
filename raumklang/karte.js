// Szenenkarte: Draufsicht, Hörer in der Mitte, jede Klangquelle als Punkt mit kurzer Spur –
// so, wie der Renderer sie gerechnet hat (audio/<name>_karte.json). Gezeichnet in ein <canvas>,
// kein Video: die Daten sind wenige zehn kB, die Zeichnung folgt der Abspielzeit.

const FARBEN = ['#7fc4c9', '#e2b866', '#d9826b', '#9ccf7f', '#b39ddb', '#f0a1c2', '#6fa8dc', '#c9c97f', '#e07f7f', '#7fd4b0',
  '#d4a373', '#8fa3ab', '#a3c4f3', '#f6bd60', '#84a59d', '#cdb4db', '#90be6d'];

export async function ladeKarte(url) {
  const K = await fetch(url).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
  K.farbe = {};
  K.gruppen.forEach((g, i) => K.farbe[g.name] = FARBEN[i % FARBEN.length]);
  for (const q of K.quellen) { q.n = q.p.length; q.ende = q.t0 + (q.n - 1) * q.dt; }
  // Drehbuch auf Dateizeit, sortiert
  K.db = (K.drehbuch || []).map(([z, x]) => [((z - K.start_s) % K.dauer + K.dauer) % K.dauer, x]).sort((a, b) => a[0] - b[0]);
  // größte Entfernung (98. Perzentil) für den logarithmischen Maßstab
  const d = [];
  for (const q of K.quellen) for (const p of q.p) d.push(Math.hypot(p[0] - K.kopf[0], p[1] - K.kopf[1]));
  d.sort((a, b) => a - b);
  K.rmax = Math.max(20, d[Math.floor(d.length * 0.98)] || 20);
  return K;
}

// Bootsbezug → Hörerbezug: [vorn, links] relativ zum Kopf (liegt der Hörer quer, ist vorn nicht der Bug)
function hoerer(K, p) {
  const a = (K.liegt_grad || 0) * Math.PI / 180, rx = p[0] - K.kopf[0], ry = p[1] - K.kopf[1];
  return [rx * Math.cos(a) + ry * Math.sin(a), -rx * Math.sin(a) + ry * Math.cos(a)];
}

export function ort(K, q, ts) {        // Ort einer Quelle zur Szenenzeit ts (oder null)
  for (const k of [0, -K.dauer, K.dauer]) {
    const x = ts + k;
    if (x >= q.t0 - 0.25 && x <= q.ende + 0.25) {
      const f = Math.min(Math.max((x - q.t0) / q.dt, 0), q.n - 1), i = Math.floor(f), j = Math.min(i + 1, q.n - 1), u = f - i;
      return q.p[i].map((v, a) => v + u * (q.p[j][a] - v));
    }
  }
  return null;
}

/** Was im Drehbuch gerade passiert (Dateizeit t in s). */
export function drehbuchJetzt(K, t) {
  const jetzt = K.db.filter(([z]) => z <= t).pop() || K.db[K.db.length - 1];
  return jetzt ? jetzt[1] : '';
}

/**
 * Zeichnet die Karte zur Dateizeit t (s). opt.massstab: fester Radius in m (0 = automatisch,
 * weich nachgeführt, damit das Bild nicht springt). Gibt die Namen der gerade hörbaren Gruppen zurück.
 */
export function zeichneKarte(canvas, K, t, opt = {}) {
  if (opt.log) return zeichneLog(canvas, K, t);
  const g = canvas.getContext('2d'), W = canvas.width, M = W / 2;
  const ts = (t + K.start_s) % K.dauer;        // Szenenzeit
  const aktiv = [];
  for (const q of K.quellen) { const p = ort(K, q, ts); if (p) aktiv.push([q, p]); }
  let R = opt.massstab || 0;
  if (!R) {             // automatisch: alle aktiven Quellen außer fernen Flächen und Echos
    const nah = aktiv.filter(([q]) => q.dt < 1 && q.art !== 'echo');
    const d = (nah.length ? nah : aktiv).map(([, p]) => Math.hypot(...hoerer(K, p))).sort((a, b) => a - b);
    const ziel = Math.max(6, (d[Math.floor(d.length * 0.85)] || 10) * 1.15);
    // weich nachführen: hinaus schnell (nichts fällt aus dem Bild), herein langsam
    K._R = K._R ? K._R * Math.pow(ziel / K._R, ziel > K._R ? 0.15 : 0.02) : ziel;
    R = K._R;
  }
  const s = M / R;
  const dunkel = matchMedia('(prefers-color-scheme: dark)').matches;
  g.clearRect(0, 0, W, W);
  // Abstandsringe
  g.strokeStyle = dunkel ? '#24343d' : '#d5dfe1'; g.fillStyle = dunkel ? '#8fa3ab' : '#5b6f77'; g.lineWidth = 2;
  g.font = `${Math.round(W / 50)}px system-ui, sans-serif`;
  const stufe = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000].find(x => x * 4 >= R) || 10000;
  for (let r = stufe; r <= R * 1.5; r += stufe) {
    g.beginPath(); g.arc(M, M, r * s, 0, 7); g.stroke();
    g.fillText(r >= 1000 ? `${r / 1000} km` : `${r} m`, M + r * s * 0.71 + 4, M - r * s * 0.71 - 4);
  }
  // Hörer, Blick nach vorn (x) = oben im Bild; links (y) = links
  const px = p => M - hoerer(K, p)[1] * s, py = p => M - hoerer(K, p)[0] * s;
  if (K.boot && R < 40) {            // Umriss des Boots (Bootsbezug: Ursprung mittschiffs)
    g.strokeStyle = dunkel ? '#3d5560' : '#b9c9cd'; g.lineWidth = 3; g.beginPath();
    for (let i = 0; i <= 72; i++) { const w = i / 72 * 2 * Math.PI, q = [K.boot.a * Math.cos(w), K.boot.b * Math.sin(w)]; i ? g.lineTo(px(q), py(q)) : g.moveTo(px(q), py(q)); }
    g.stroke();
  }
  g.fillStyle = dunkel ? '#dfe8ea' : '#17252b'; g.beginPath(); g.arc(M, M, W / 130, 0, 7); g.fill();
  g.strokeStyle = g.fillStyle; g.lineWidth = 4; g.beginPath(); g.moveTo(M, M - 8); g.lineTo(M, M - W / 27); g.stroke();
  g.beginPath(); g.moveTo(M - 10, M - W / 35); g.lineTo(M, M - W / 25); g.lineTo(M + 10, M - W / 35); g.stroke();
  // Spuren und Punkte
  const gruppen = new Set();
  for (const [q, p] of aktiv) {
    const f = K.farbe[q.g] || '#888';
    gruppen.add(q.g);
    g.strokeStyle = f; g.globalAlpha = 0.35; g.lineWidth = 3; g.beginPath();
    for (let k = 0; k <= 6; k++) { const pp = ort(K, q, ts - k); if (!pp) break; k ? g.lineTo(px(pp), py(pp)) : g.moveTo(px(pp), py(pp)); }
    g.stroke(); g.globalAlpha = q.art === 'echo' ? 0.35 : 1;
    g.fillStyle = f; g.beginPath(); g.arc(px(p), py(p), q.dt > 1 ? W / 200 : W / 120, 0, 7); g.fill(); g.globalAlpha = 1;
  }
  return gruppen;
}

/**
 * Dieselbe Karte mit logarithmischem Abstand: 1 m, 10 m und 1 km sind gleichzeitig gut zu sehen,
 * das Bild muss nie zoomen (für die Live-Karte auf der Szenenseite). Richtungen bleiben richtig.
 */
function zeichneLog(canvas, K, t) {
  const g = canvas.getContext('2d'), W = canvas.width, M = W / 2, D0 = 1.5;
  const rand = M * 0.94, norm = Math.log(1 + K.rmax / D0);
  const rad = d => rand * Math.log(1 + d / D0) / norm;
  const proj = p => {
    const [dy, dx] = hoerer(K, p), d = Math.hypot(dx, dy);
    if (d < 1e-6) return [M, M];
    const f = Math.min(rad(d), M * 0.985) / d;
    return [M - dx * f, M - dy * f];
  };
  const ts = (t + K.start_s) % K.dauer;
  const dunkel = matchMedia('(prefers-color-scheme: dark)').matches;
  g.clearRect(0, 0, W, W);
  // Ringe, nicht zu dicht
  g.strokeStyle = dunkel ? '#24343d' : '#d5dfe1'; g.fillStyle = dunkel ? '#8fa3ab' : '#5b6f77'; g.lineWidth = 2;
  g.font = `${Math.round(W / 46)}px system-ui, sans-serif`;
  let letzt = 0;
  for (const r of [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000]) {
    if (r > K.rmax * 1.05) break;
    const rr = rad(r);
    if (rr - letzt < W * 0.06) continue;
    letzt = rr;
    g.beginPath(); g.arc(M, M, rr, 0, 7); g.stroke();
    g.fillText(r >= 1000 ? `${r / 1000} km` : `${r} m`, M + rr * 0.71 + 4, M - rr * 0.71 - 4);
  }
  if (K.boot) {            // Umriss des Boots, ebenfalls logarithmisch abgebildet
    g.strokeStyle = dunkel ? '#3d5560' : '#b9c9cd'; g.lineWidth = 3; g.beginPath();
    for (let i = 0; i <= 72; i++) {
      const w = i / 72 * 2 * Math.PI, [x, y] = proj([K.boot.a * Math.cos(w), K.boot.b * Math.sin(w)]);
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.stroke();
  }
  // Hörer und Blickrichtung
  g.fillStyle = dunkel ? '#dfe8ea' : '#17252b'; g.beginPath(); g.arc(M, M, W / 120, 0, 7); g.fill();
  g.strokeStyle = g.fillStyle; g.lineWidth = 4; g.beginPath(); g.moveTo(M, M - 8); g.lineTo(M, M - W / 22); g.stroke();
  g.beginPath(); g.moveTo(M - 11, M - W / 30); g.lineTo(M, M - W / 20); g.lineTo(M + 11, M - W / 30); g.stroke();
  const gruppen = new Set();
  for (const q of K.quellen) {
    const p = ort(K, q, ts);
    if (!p) continue;
    const f = K.farbe[q.g] || '#888';
    gruppen.add(q.g);
    g.strokeStyle = f; g.globalAlpha = 0.35; g.lineWidth = 3; g.beginPath();
    for (let k = 0; k <= 6; k++) { const pp = ort(K, q, ts - k); if (!pp) break; const [x, y] = proj(pp); k ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke(); g.globalAlpha = q.art === 'echo' ? 0.35 : 1;
    const [x, y] = proj(p);
    g.fillStyle = f; g.beginPath(); g.arc(x, y, q.dt > 1 ? W / 180 : W / 105, 0, 7); g.fill(); g.globalAlpha = 1;
    if (q.dt < 1 || q.n * q.dt > 20) {          // klingt gerade: Schallringe laufen nach außen (nicht bei Flächen)
      if (q.dt > 1 && q.n * q.dt > K.dauer * 0.9) continue;
      const alter = ts - q.t0;
      g.strokeStyle = f; g.lineWidth = 3;
      for (let k = 0; k < 2; k++) {
        const u = ((alter * 1.3 + k * 0.5) % 1 + 1) % 1;
        g.globalAlpha = 0.7 * (1 - u); g.beginPath(); g.arc(x, y, W / 105 + u * W / 22, 0, 7); g.stroke();
      }
      g.globalAlpha = 1;
    }
  }
  return gruppen;
}

/** Namen der Gruppen, die zur Dateizeit t zu hören sind (für die Legende). */
export function aktiveGruppen(K, t) {
  const ts = (t + K.start_s) % K.dauer, aus = new Set();
  for (const q of K.quellen) if (!aus.has(q.g) && ort(K, q, ts)) aus.add(q.g);
  return aus;
}
