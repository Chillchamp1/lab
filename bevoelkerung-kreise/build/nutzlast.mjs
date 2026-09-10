// Geometrie, Zeitreihe und Kreisdaten in eine kompakte Nutzlast für die Seite.
//
// Die Zustände liegen alle im selben Bezug und unterscheiden sich von einem
// Zeitpunkt zum nächsten nur wenig. Kodiert wird deshalb nicht jeder Zustand
// für sich, sondern der Unterschied zum vorigen — beim ersten der Unterschied
// zur Landkarte. Zusammen mit dem Zickzack-Varint aus `code.mjs` schrumpft
// das auf ein bis zwei Zeichen je Koordinate.

import { packe } from './code.mjs';

// Wo auf der Zeitachse ein Bild sitzt. Trägt es mehrere Stichtage — 1950 etwa
// den 13. September für die Bundesrepublik und den 31. August für die DDR —,
// liegt es in deren Mitte; genannt werden in der Karte trotzdem beide.
function dezimaljahr(stichtage, gewichte = null) {
  let summe = 0, gesamt = 0;
  for (const s of stichtage) {
    const d = new Date(s + 'T00:00:00Z');
    const j = Number.isNaN(d.getTime()) ? Number(String(s).slice(0, 4))
      : d.getUTCFullYear() + (d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 1)) / (365.25 * 864e5);
    if (!Number.isFinite(j)) continue;
    const g = gewichte?.[s] ?? 1;
    summe += j * g; gesamt += g;
  }
  return Number((summe / gesamt).toFixed(3));
}

const BREITE = 8000;

function rahmen(px, py) {
  let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity;
  for (let i = 0; i < px.length; i++) {
    if (px[i] < a) a = px[i]; if (px[i] > b) b = px[i];
    if (py[i] < c) c = py[i]; if (py[i] > d) d = py[i];
  }
  return { minX: a, maxX: b, minY: c, maxY: d, w: b - a, h: d - c };
}

// reihen: eine oder zwei Zeitreihen über derselben Geometrie. Die zweite
// lässt Kreise weg, die nur in wenigen Bildern Zahlen haben — im Pilotgebiet
// ist das Berlin, und ohne die Stadt sind Brandenburgs Kreise überhaupt erst
// zu erkennen. Beide teilen Knoten, Ringe und Massstab; unterschiedlich sind
// nur die Koordinaten je Bild.
export function baueNutzlast({ gebiete, attr, X, Y, reihen, bilder, kreisInfo, log = () => {} }) {
  const anker = reihen[0].zeitreihe.anker;
  const zustaende = reihen[0].zeitreihe.zustaende;

  // Gemeinsames Gitter: alle Zustände und die Landkarte in einen Rahmen,
  // gleicher Massstab, gleicher Mittelpunkt.
  const alle = [rahmen(X, Y), ...reihen.flatMap(r => r.zeitreihe.zustaende.map(z => rahmen(z.X, z.Y)))];
  const minX = Math.min(...alle.map(r => r.minX)), maxX = Math.max(...alle.map(r => r.maxX));
  const minY = Math.min(...alle.map(r => r.minY)), maxY = Math.max(...alle.map(r => r.maxY));
  const skala = BREITE / (maxX - minX);
  const hoehe = Math.round((maxY - minY) * skala);
  const gitter = (px, py) => {
    const qx = new Int32Array(px.length), qy = new Int32Array(py.length);
    for (let i = 0; i < px.length; i++) {
      qx[i] = Math.round((px[i] - minX) * skala);
      qy[i] = Math.round((py[i] - minY) * skala);
    }
    return { qx, qy };
  };

  const G = gitter(X, Y);

  const laufend = arr => { const d = new Array(arr.length); let v = 0; for (let i = 0; i < arr.length; i++) { d[i] = arr[i] - v; v = arr[i]; } return d; };
  const gegen = (a, b) => { const d = new Array(a.length); for (let i = 0; i < a.length; i++) d[i] = a[i] - b[i]; return d; };

  const nutz = {
    breite: BREITE, hoehe,
    // Der Ankerpunkt, um den jeder Zustand beim Zeichnen auf seine Grösse
    // gebracht wird — im selben Gitter wie die Koordinaten.
    ank: [Math.round((anker.x - minX) * skala), Math.round((anker.y - minY) * skala)],
    gx: packe(laufend(G.qx)), gy: packe(laufend(G.qy)),
    ringzahl: packe(gebiete.map(g => g.length)),
    ringe: packe(gebiete.flatMap(g => g.map(r => r.length))),
    idx: packe(gebiete.flatMap(g => g.flatMap(r => { const d = []; let v = 0; for (const id of r) { d.push(id - v); v = id; } return d; }))),
  };

  // Wie gut die Flächen am Ende wirklich stimmen — gemessen an den ganzen
  // Zahlen, die in der Seite landen, nicht an den Gleitkommazahlen davor.
  // Was hier steht, ist das, was jemand am Bildschirm sieht.
  const abweichungen = [];
  const flaecheGanz = (ringe, qx, qy) => {
    let A = 0;
    for (const r of ringe) {
      let a = 0; const n = r.length;
      for (let i = 0, j = n - 1; i < n; j = i++) a += qx[r[j]] * qy[r[i]] - qx[r[i]] * qy[r[j]];
      A += a;
    }
    return Math.abs(A / 2);
  };

  // Zustände als Kette von Unterschieden, je Reihe
  nutz.reihen = reihen.map(r => {
    const K = r.zeitreihe.zustaende.map(z => gitter(z.X, z.Y));
    r.zeitreihe.zustaende.forEach((z, i) => {
      const drin = z.abgedeckt.flatMap((a, g) => a ? [g] : []);
      const fl = drin.map(g => flaecheGanz(gebiete[g], K[i].qx, K[i].qy));
      const summeF = fl.reduce((a, b) => a + b, 0);
      const summeW = drin.reduce((a, g) => a + (r.bilder.find(x => x.jahr === z.jahr).werte.get(attr[g].ags) ?? 0), 0);
      drin.forEach((g, k) => {
        const wert = r.bilder.find(x => x.jahr === z.jahr).werte.get(attr[g].ags) ?? 0;
        if (wert > 0) abweichungen.push(Math.abs(fl[k] / (summeF * wert / summeW) - 1));
      });
    });
    let vorX = G.qx, vorY = G.qy;
    return {
      id: r.id, name: r.name,
      zustaende: r.zeitreihe.zustaende.map((z, i) => {
        const dx = packe(gegen(K[i].qx, vorX)), dy = packe(gegen(K[i].qy, vorY));
        vorX = K[i].qx; vorY = K[i].qy;
        const b = r.bilder.find(x => x.jahr === z.jahr);
        return { jahr: z.jahr, skala: Number(z.skala.toFixed(5)), bev: z.bevoelkerung, dx, dy };
      }),
    };
  });

  // Was für alle Reihen gleich ist, steht nur einmal da.
  nutz.bilder = zustaende.map(z => {
    const b = bilder.find(x => x.jahr === z.jahr);
    return {
      jahr: z.jahr, t: dezimaljahr(b.stichtage, b.gewichte),
      stichtage: b.stichtage, begriffe: b.begriffe,
      methoden: b.methoden, quellen: b.quellen,
    };
  });

  // Kanten, die zwei Länder trennen oder aussen liegen. Bei 400 Kreisen ist
  // die Karte sonst eine Masse gleichartiger Flecken; die Landesgrenzen geben
  // ihr wieder eine Gestalt, in der man sich zurechtfindet. Gesucht wird über
  // die Nachbarschaft: eine Kante gehört dazu, wenn die Gegenkante fehlt (dann
  // ist es die Aussengrenze) oder zu einem Kreis in einem anderen Land gehört.
  const gehoert = new Map();
  gebiete.forEach((ringe, gi) => {
    for (const r of ringe) for (let i = 0; i < r.length; i++)
      gehoert.set(r[i] + '>' + r[(i + 1) % r.length], gi);
  });
  const grenzkanten = [];
  gebiete.forEach((ringe, gi) => {
    for (const r of ringe) for (let i = 0; i < r.length; i++) {
      const a = r[i], b = r[(i + 1) % r.length];
      const gegen = gehoert.get(b + '>' + a);
      if (gegen === undefined) { grenzkanten.push(a, b); continue; }
      if (gegen > gi && attr[gegen].land !== attr[gi].land) grenzkanten.push(a, b);
    }
  });
  nutz.grenzen = packe(laufend(grenzkanten));
  log(`  ${grenzkanten.length / 2} Kanten an Landes- und Aussengrenzen`);
  abweichungen.sort((a, b) => a - b);
  nutz.guete = {
    median: abweichungen[Math.floor(abweichungen.length / 2)],
    max: abweichungen[abweichungen.length - 1],
    ueber1: abweichungen.filter(a => a > 0.01).length,
    zellen: abweichungen.length,
  };
  log(`  Flächen in der Nutzlast: Median ${(nutz.guete.median * 100).toFixed(2)} %, `
    + `Max ${(nutz.guete.max * 100).toFixed(1)} %, über 1 %: ${nutz.guete.ueber1} von ${nutz.guete.zellen}`);

  // Kreisdaten: Stammdaten einmal, Bevölkerung je Bild als Kette
  const jeKreis = attr.map((a, i) => {
    const info = kreisInfo.get(a.ags) ?? {};
    return { ags: a.ags, name: a.name, bez: a.bez, land: a.land, flaeche: info.flaeche ?? null };
  });
  // Bevölkerung je Reihe und Bild, als Kette von Unterschieden
  nutz.bev = reihen.map(r => {
    const kette = [];
    let vor = attr.map(() => 0);
    for (const b of r.bilder) {
      const jetzt = attr.map(a => Math.round(b.werte.get(a.ags) ?? 0));
      kette.push(...jetzt.map((v, i) => v - vor[i]));
      vor = jetzt;
    }
    return packe(kette);
  });
  nutz.methodenJeWert = bilder.map(b => attr.map(a => (b.methodeJeKreis?.get(a.ags) ?? '-')).join('')).join('');
  nutz.anteilJeWert = packe(bilder.flatMap(b => attr.map(a => Math.round((b.anteilJeKreis?.get(a.ags) ?? 0) * 100))));

  log(`  Nutzlast: ${reihen.length} Reihen à ${zustaende.length} Zustände, `
    + `${(JSON.stringify(nutz).length / 1024).toFixed(0)} kB roh`);
  return { nutz, jeKreis };
}
