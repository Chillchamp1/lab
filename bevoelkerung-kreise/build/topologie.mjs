// Knotenmodell, Verschmelzen und Generalisieren der Kreisgeometrie.
//
// Drei Schritte, in dieser Reihenfolge:
//
// 1. Verschweissen — gleiche Koordinaten werden zu einem Knoten. Danach ist
//    eine gemeinsame Grenze zweier Kreise dieselbe Knotenfolge, und alles,
//    was den Knoten bewegt, bewegt beide Kreise gemeinsam. Ohne das reissen
//    beim Verziehen Lücken auf.
//
// 2. Auflösen — je Kreis werden die eigenen Ringe zu einem Umriss vereinigt.
//    Kanten, die in zwei Ringen desselben Kreises gegenläufig vorkommen, sind
//    innere Grenzen und heben sich auf; der Rest wird zu neuen Ringen
//    zusammengesetzt. Das ist der Weg, auf dem ein älterer Gebietsstand auf
//    den heutigen gebracht wird: zwei alte Kreise bekommen denselben AGS und
//    verschmelzen dabei wirklich, statt nur nebeneinander zu liegen.
//
// 3. Generalisieren — Knoten mit zu kleinem Flächenbeitrag fallen weg.
//    Entschieden wird je Knoten, nicht je Ring: ein Knoten verschwindet
//    überall oder nirgends, damit gemeinsame Grenzen gemeinsam bleiben.
//    Knoten, an denen mehr als zwei Kreise zusammenstossen, bleiben immer.

import { laea, flaecheUndZentrum } from './geometrie.mjs';

// Gebietsstand: alte Kreisschlüssel auf den heutigen abbilden.
// Der Schlüssel links wird zum Schlüssel rechts; die Geometrie verschmilzt.
export const GEBIETSSTAND = {
  // Hanau ist zum 1. Januar 2026 kreisfrei geworden und in der Geometrie des
  // BKG bereits ein eigener Kreis. Keine der Bevölkerungsreihen trennt die
  // Stadt jedoch vom Main-Kinzig-Kreis — auch die jüngste nicht —, und ein
  // Kreis, der in 24 von 25 Bildern ein Loch wäre, hilft niemandem. Hanau
  // bleibt deshalb im Main-Kinzig-Kreis; damit sind es 400 Gebiete, der
  // Kreisstand des Gemeindeverzeichnisses vom 31.12.2024.
  '06415': '06435',
  // Eisenach ist am 1. Juli 2021 in den Wartburgkreis eingegliedert worden.
  // Nur nötig, wenn eine ältere Geometrie als Notbehelf einspringt.
  '16056': '16063',
};

function schluessel(x, y) { return x + ',' + y; }

// Ringe eines Kreises zu einem Umriss vereinigen (Kantenauslöschung).
// Gibt die neuen Ringe als Knotenindexlisten zurück.
function vereinige(ringe, X, Y) {
  const kante = new Map();          // "a>b" -> [a, b]
  const zaehler = new Map();
  const merke = (a, b) => {
    const hin = a + '>' + b, rueck = b + '>' + a;
    if (zaehler.get(rueck)) {       // gegenläufige Kante da: beide streichen
      zaehler.set(rueck, zaehler.get(rueck) - 1);
      if (!zaehler.get(rueck)) { zaehler.delete(rueck); kante.delete(rueck); }
      return;
    }
    zaehler.set(hin, (zaehler.get(hin) ?? 0) + 1);
    kante.set(hin, [a, b]);
  };
  for (const r of ringe) for (let i = 0; i < r.length; i++) merke(r[i], r[(i + 1) % r.length]);

  if (kante.size === anzahlKanten(ringe)) return ringe.map(r => Int32Array.from(r));  // nichts hob sich auf

  // Übrige Kanten zu Ringen verketten. An Knoten, in denen mehrere Kanten
  // zusammenlaufen — dort berührt sich der Umriss selbst —, darf nicht
  // beliebig gewählt werden, sonst schnürt der Weg kleine Schlaufen ab.
  // Genommen wird die Kante, die im Uhrzeigersinn als nächste auf die
  // Rückrichtung folgt; das läuft die Ränder des Gebiets sauber ab.
  const ab = new Map();
  for (const [a, b] of kante.values()) {
    if (!ab.has(a)) ab.set(a, []);
    ab.get(a).push({ b, winkel: Math.atan2(Y[b] - Y[a], X[b] - X[a]), benutzt: false });
  }
  for (const l of ab.values()) l.sort((p, q) => p.winkel - q.winkel);

  const naechste = (hier, vorher) => {
    const l = ab.get(hier);
    if (!l) return null;
    if (vorher === -1) { const f = l.find(e => !e.benutzt); if (f) f.benutzt = true; return f ? f.b : null; }
    const zurueck = Math.atan2(Y[vorher] - Y[hier], X[vorher] - X[hier]);
    let start = l.findIndex(e => e.winkel >= zurueck);
    if (start < 0) start = 0;
    for (let k = 0; k < l.length; k++) {
      const e = l[(start - 1 - k + 2 * l.length) % l.length];
      if (!e.benutzt) { e.benutzt = true; return e.b; }
    }
    return null;
  };

  const neu = [];
  for (const [start, liste] of ab) {
    while (liste.some(e => !e.benutzt)) {
      const ring = [start];
      let vorher = -1, hier = naechste(start, -1);
      let schutz = 0;
      while (hier !== null && hier !== start && schutz++ < 1e7) {
        ring.push(hier);
        const w = naechste(hier, vorher === -1 ? start : vorher);
        vorher = hier; hier = w;
      }
      if (hier === start && ring.length >= 3) neu.push(Int32Array.from(ring));
    }
  }
  return neu.length ? neu : ringe.map(r => Int32Array.from(r));
}

function anzahlKanten(ringe) { let n = 0; for (const r of ringe) n += r.length; return n; }

// Splitter aussortieren. Wo die gemeinsame Grenze zweier Kreise nicht auf
// jeden Stützpunkt genau übereinstimmt, bleiben nach der Kantenauslöschung
// haarfeine Restringe übrig. Erkennbar sind sie an der Form, nicht an der
// Grösse allein: fast keine Fläche im Verhältnis zum Umfang.
function istSplitter(ring, X, Y) {
  let A2 = 0, u = 0;
  const n = ring.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = X[ring[i]], yi = Y[ring[i]], xj = X[ring[j]], yj = Y[ring[j]];
    A2 += xj * yi - xi * yj;
    u += Math.hypot(xi - xj, yi - yj);
  }
  const flaeche = Math.abs(A2 / 2);
  if (flaeche > 1e6) return false;                       // über 1 km²: echte Insel
  return 4 * Math.PI * flaeche / (u * u) < 0.05;         // gedrungen? dann echt
}

export function baueKnotenmodell(kreise) {
  // Nach heutigem AGS gruppieren
  const gruppen = new Map();
  for (const k of kreise) {
    const ags = GEBIETSSTAND[k.ags] ?? k.ags;
    if (!gruppen.has(ags)) gruppen.set(ags, { ags, name: k.name, bez: k.bez, land: k.land, ringe: [] });
    const g = gruppen.get(ags);
    if (GEBIETSSTAND[k.ags]) { /* eingegliedert: Name des aufnehmenden Kreises behalten */ }
    else { g.name = k.name; g.bez = k.bez; g.land = k.land; }
    g.ringe.push(...k.ringe);
  }

  // Verschweissen
  const knoten = new Map();
  const lon = [], lat = [];
  const alsIndizes = flach => {
    const n = flach.length / 2;
    const ids = [];
    for (let i = 0; i < n; i++) {
      const x = flach[i * 2], y = flach[i * 2 + 1];
      const s = schluessel(x, y);
      let id = knoten.get(s);
      if (id === undefined) { id = lon.length; knoten.set(s, id); lon.push(x); lat.push(y); }
      if (ids.length && ids[ids.length - 1] === id) continue;   // Doppelpunkt
      ids.push(id);
    }
    while (ids.length > 1 && ids[0] === ids[ids.length - 1]) ids.pop();  // Schlusspunkt
    return ids;
  };

  const liste = [...gruppen.values()].sort((a, b) => a.ags.localeCompare(b.ags));
  const roh = liste.map(g => g.ringe.map(alsIndizes).filter(r => r.length >= 3));
  const attr = liste.map(g => ({ ags: g.ags, name: g.name, bez: g.bez, land: g.land }));

  const X = new Float64Array(lon.length), Y = new Float64Array(lon.length);
  for (let i = 0; i < lon.length; i++) { const [x, y] = laea(lon[i], lat[i]); X[i] = x; Y[i] = -y; }

  const gebiete = roh.map(ringe => {
    const vereint = vereinige(ringe, X, Y);
    if (vereint.length === ringe.length && vereint.every((r, i) => r.length === ringe[i].length)) return vereint;
    return vereint.filter(r => !istSplitter(r, X, Y));   // nur nach echtem Auflösen
  });
  return { gebiete, attr, X, Y };
}

// Wie viele verschiedene Nachbarn hat jeder Knoten? Mehr als zwei heisst:
// hier stossen Grenzen zusammen, der Knoten wird nicht angetastet.
function knotengrad(gebiete, anzahl) {
  const nachbarn = Array.from({ length: anzahl }, () => new Set());
  for (const ringe of gebiete) for (const r of ringe) {
    const n = r.length;
    for (let i = 0; i < n; i++) {
      const a = r[i], b = r[(i + 1) % n];
      nachbarn[a].add(b); nachbarn[b].add(a);
    }
  }
  return nachbarn.map(s => s.size);
}

// Dreiecksfläche eines Knotens mit seinen beiden Ringnachbarn (Visvalingam),
// gemessen am eigenen Kreis. Ohne diesen Bezug verlieren die kleinen Kreise
// zuerst ihre Form: eine kreisfreie Stadt ist tausendmal kleiner als ein
// Flächenlandkreis, und absolut gerechnet ist an ihr jeder Knoten unwichtig.
// Im Kartogramm sind es aber gerade die Städte, die gross gezogen werden.
function wichtigkeit(gebiete, X, Y, anzahl, bezug) {
  const w = new Float64Array(anzahl).fill(0);
  for (let gi = 0; gi < gebiete.length; gi++) { const ringe = gebiete[gi]; for (const r of ringe) {
    const n = r.length;
    if (n < 4) { for (const id of r) w[id] = Infinity; continue; }
    for (let i = 0; i < n; i++) {
      const a = r[(i + n - 1) % n], m = r[i], b = r[(i + 1) % n];
      const f = Math.abs((X[a] - X[m]) * (Y[b] - Y[m]) - (X[b] - X[m]) * (Y[a] - Y[m])) / 2 / bezug[gi];
      if (f > w[m]) w[m] = f;
    }
  } }
  return w;
}

// Generalisierung auf etwa `ziel` Knoten. Es wird in Runden gearbeitet: in
// jeder Runde fallen die unwichtigsten Knoten weg, aber nie zwei benachbarte
// gleichzeitig — sonst kollabieren ganze Ringabschnitte auf einen Schlag —
// und nie so viele, dass ein Ring unter vier Knoten fiele.
export function vereinfache(gebiete, X, Y, ziel, log = () => {}) {
  const anzahl = X.length;
  const bezug = gebiete.map(g => Math.max(flaecheUndZentrum(g, X, Y).flaeche, 1));
  const weg = new Uint8Array(anzahl);
  let aktuell = anzahl;

  // Flache Ringliste und die Zuordnung Knoten -> Ringe
  const alleRinge = [];
  for (const ringe of gebiete) for (const r of ringe) alleRinge.push(r);
  const ringeVon = Array.from({ length: anzahl }, () => []);

  for (let runde = 0; runde < 80 && aktuell > ziel; runde++) {
    for (const l of ringeVon) l.length = 0;
    alleRinge.length = 0;
    for (const ringe of gebiete) for (const r of ringe) {
      const ri = alleRinge.push(r) - 1;
      for (const id of r) ringeVon[id].push(ri);
    }
    const laenge = alleRinge.map(r => r.length);
    const grad = knotengrad(gebiete, anzahl);
    const w = wichtigkeit(gebiete, X, Y, anzahl, bezug);

    const kandidaten = [];
    for (let i = 0; i < anzahl; i++) if (!weg[i] && grad[i] === 2 && Number.isFinite(w[i])) kandidaten.push(i);
    if (!kandidaten.length) break;
    kandidaten.sort((a, b) => w[a] - w[b]);
    const wieViele = Math.max(1, Math.ceil((aktuell - ziel) * 0.6));

    const gesperrt = new Uint8Array(anzahl);
    let entfernt = 0;
    for (const id of kandidaten) {
      if (entfernt >= wieViele) break;
      if (gesperrt[id]) continue;
      if (ringeVon[id].some(ri => laenge[ri] <= 4)) continue;
      weg[id] = 1; entfernt++;
      for (const ri of ringeVon[id]) laenge[ri]--;
      const r0 = alleRinge[ringeVon[id][0]];
      const pos = [...r0].indexOf(id);
      gesperrt[r0[(pos + 1) % r0.length]] = 1;
      gesperrt[r0[(pos + r0.length - 1) % r0.length]] = 1;
    }
    if (!entfernt) break;

    for (const ringe of gebiete) for (let ri = 0; ri < ringe.length; ri++)
      ringe[ri] = Int32Array.from([...ringe[ri]].filter(id => !weg[id]));
    aktuell -= entfernt;
    log(`  Runde ${runde + 1}: ${aktuell} Knoten`);
  }

  // Knoten neu durchnummerieren
  const neuId = new Int32Array(anzahl).fill(-1);
  const nX = [], nY = [];
  for (let i = 0; i < anzahl; i++) if (!weg[i]) { neuId[i] = nX.length; nX.push(X[i]); nY.push(Y[i]); }
  const neueGebiete = gebiete.map(ringe => ringe
    .map(r => Int32Array.from([...r].filter(id => neuId[id] >= 0).map(id => neuId[id])))
    .filter(r => r.length >= 3));
  return { gebiete: neueGebiete, X: Float64Array.from(nX), Y: Float64Array.from(nY) };
}

// Das Modell auf eine Auswahl von Kreisen einschränken und die Knoten neu
// durchnummerieren. Solange die Reihe nur einen Teil Deutschlands abdeckt,
// wäre es Verschwendung, die übrigen Kreise mitzuschleppen: gezeichnet werden
// sie nie, aber sie bekämen den grössten Teil des Knotenbudgets und den
// grössten Teil der Nutzlast. Das Meer um das Gebiet herum entsteht ohnehin
// erst beim Rastern.
export function beschraenke(gebiete, attr, X, Y, behalten) {
  const raus = attr.map((a, i) => behalten.has(a.ags) ? i : -1).filter(i => i >= 0);
  const neuId = new Int32Array(X.length).fill(-1);
  const nX = [], nY = [];
  for (const gi of raus) for (const r of gebiete[gi]) for (const id of r) {
    if (neuId[id] < 0) { neuId[id] = nX.length; nX.push(X[id]); nY.push(Y[id]); }
  }
  return {
    gebiete: raus.map(gi => gebiete[gi].map(r => Int32Array.from([...r].map(id => neuId[id])))),
    attr: raus.map(gi => attr[gi]),
    X: Float64Array.from(nX), Y: Float64Array.from(nY),
  };
}
