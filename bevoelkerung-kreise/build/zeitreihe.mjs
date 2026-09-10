// Ein Kartogramm je Zeitpunkt, alle im selben Massstab.
//
// Zwei Entscheidungen stecken hier drin.
//
// Der gemeinsame Massstab. Jedes Kartogramm für sich verteilt nur um: seine
// Gesamtfläche bleibt die der Ausgangskarte, gleich ob 1871 oder heute. Damit
// die Karte mit der Bevölkerung wächst, wird für alle Zeitpunkte dieselbe
// Fläche je Mensch festgelegt — so viel, dass das bevölkerungsreichste Bild
// gerade die Fläche der geografischen Karte einnimmt. Alle früheren Bilder
// sind entsprechend kleiner, und zwar flächenproportional: halb so viele
// Menschen, halb so viel Karte.
//
// Der warme Start. Zwei aufeinanderfolgende Zählungen unterscheiden sich
// wenig. Das Kartogramm des nächsten Zeitpunkts fängt deshalb nicht wieder
// bei der Landkarte an, sondern beim vorigen Ergebnis. Das spart nicht nur
// Rechenzeit — es hält auch die Bilder beieinander, sodass der Übergang von
// einem zum nächsten eine Bewegung ist und kein Sprung.
//
// Bilder ohne flächendeckende Daten (Preussen 1816, 1849, 1864) starten kalt
// von der Landkarte: sie an eine Reihe anzuhängen, die ganz Deutschland
// abdeckt, würde ihre Form von Gebieten prägen lassen, für die es keine
// Zahlen gibt.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { rechneKartogramm } from './kartogramm.mjs';
import { flaecheUndZentrum } from './geometrie.mjs';

const CACHE = 'zeitreihe-cache.json';

function gesamtflaeche(gebiete, X, Y) {
  let s = 0;
  for (const g of gebiete) s += flaecheUndZentrum(g, X, Y).flaeche;
  return s;
}

function schwerpunkt(gebiete, X, Y) {
  let A = 0, cx = 0, cy = 0;
  for (const g of gebiete) {
    const m = flaecheUndZentrum(g, X, Y);
    A += m.flaeche; cx += m.cx * m.flaeche; cy += m.cy * m.flaeche;
  }
  return { x: cx / A, y: cy / A };
}

export function rechneZeitreihe({
  gebiete, X, Y, attr, bilder, groesste = null,
  gitter = 1600, kaltDurchgaenge = 6, warmDurchgaenge = 4,
  cache = CACHE, log = () => {},
}) {
  const schluessel = JSON.stringify({
    gitter, kaltDurchgaenge, warmDurchgaenge, knoten: X.length, groesste,
    bilder: bilder.map(b => [b.jahr, b.summe, b.werte.size]),
  });
  if (existsSync(cache)) {
    const c = JSON.parse(readFileSync(cache, 'utf8'));
    if (c.schluessel === schluessel) {
      log(`  Zeitreihe aus ${cache}`);
      return {
        anker: c.anker, flaecheJeMensch: c.flaecheJeMensch,
        zustaende: c.zustaende.map(z => ({ ...z, X: Float64Array.from(z.X), Y: Float64Array.from(z.Y) })),
      };
    }
  }

  const geoFlaeche = gesamtflaeche(gebiete, X, Y);
  const anker = schwerpunkt(gebiete, X, Y);
  // Der Bezug für die Grösse. Wird er von aussen vorgegeben, teilen sich
  // mehrere Reihen denselben Massstab — dann heisst Umschalten wirklich
  // „dasselbe Bild, ein Kreis mehr", und nicht „alles neu skaliert".
  const bezug = groesste ?? Math.max(...bilder.map(b => b.summe));
  const flaecheJeMensch = geoFlaeche / bezug;

  // Reihenfolge: erst die Bilder mit voller Abdeckung der Reihe nach (warmer
  // Start), danach die lückenhaften einzeln von der Landkarte aus. „Voll"
  // heisst hier: so viele Kreise wie das bestabgedeckte Bild der Reihe. Im
  // Pilotgebiet sind das 19 von 400 — der Massstab ist die Reihe selbst,
  // nicht die Zahl aller deutschen Kreise.
  const beste = Math.max(...bilder.map(b => b.werte.size));
  const vollstaendig = bilder.filter(b => b.werte.size >= beste * 0.9);
  const teilweise = bilder.filter(b => !vollstaendig.includes(b));

  const zustaende = new Map();
  let vorX = null, vorY = null;

  const rechne = (b, startX, startY, durchgaenge) => {
    const werte = attr.map(a => b.werte.get(a.ags) ?? 0);
    const abgedeckt = attr.map(a => b.werte.has(a.ags));
    log(`  ${b.jahr}: ${b.werte.size} Kreise, ${(b.summe / 1e6).toFixed(2)} Mio`);
    const k = rechneKartogramm({
      gebiete, X: startX, Y: startY, werte, abgedeckt, gitter, durchgaenge, log,
    });
    zustaende.set(b.jahr, {
      jahr: b.jahr,
      // Gespeichert wird der Zustand vor der Grössenskalierung, damit die
      // Bilder untereinander nahe beieinanderliegen und sich knapp kodieren
      // lassen. Weil jeder gespeicherte Zustand auf die geografische
      // Gesamtfläche normiert wird, ist der Massstab beim Zeichnen einfach
      // die Wurzel aus dem Bevölkerungsanteil am grössten Bild.
      X: k.X, Y: k.Y, skala: Math.sqrt(b.summe / bezug), bevoelkerung: b.summe,
      abgedeckt, bilanz: k.bilanz,
    });
    return k;
  };

  vollstaendig.forEach((b, i) => {
    const warm = i > 0;
    const k = rechne(b, warm ? vorX : X, warm ? vorY : Y, warm ? warmDurchgaenge : kaltDurchgaenge);
    vorX = k.X; vorY = k.Y;
  });
  for (const b of teilweise) rechne(b, X, Y, kaltDurchgaenge);

  const geordnet = bilder.map(b => zustaende.get(b.jahr)).filter(Boolean);

  // Die Zustände sind noch in ihren eigenen Koordinaten. Für die Nutzlast
  // werden sie auf denselben Bezug gebracht: Schwerpunkt der gezeichneten
  // Kreise auf den Anker, Gesamtfläche der gezeichneten Kreise auf die
  // geografische Gesamtfläche. Die Grösse steckt danach allein in `skala`.
  for (const z of geordnet) {
    let A = 0, cx = 0, cy = 0;
    for (let i = 0; i < gebiete.length; i++) {
      if (!z.abgedeckt[i]) continue;
      const m = flaecheUndZentrum(gebiete[i], z.X, z.Y);
      A += m.flaeche; cx += m.cx * m.flaeche; cy += m.cy * m.flaeche;
    }
    cx /= A; cy /= A;
    const f = Math.sqrt(geoFlaeche / A);
    for (let i = 0; i < z.X.length; i++) {
      z.X[i] = (z.X[i] - cx) * f + anker.x;
      z.Y[i] = (z.Y[i] - cy) * f + anker.y;
    }
  }

  writeFileSync(cache, JSON.stringify({
    schluessel, anker, flaecheJeMensch,
    zustaende: geordnet.map(z => ({ ...z, X: Array.from(z.X), Y: Array.from(z.Y) })),
  }));
  log(`  Zeitreihe in ${cache} abgelegt`);
  return { anker, flaecheJeMensch, zustaende: geordnet };
}
