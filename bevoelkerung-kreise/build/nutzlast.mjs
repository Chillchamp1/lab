// Geometrie, Zeitreihe und Kreisdaten in eine kompakte Nutzlast für die Seite.
//
// Gerechnet wird für jeden Zeitpunkt ein eigenes Kartogramm — die Seite
// zeichnet aber nur noch **eine** Form, den Mittelwert aller. Also steht auch
// nur der in der Nutzlast, als Unterschied zur Landkarte, mit dem
// Zickzack-Varint aus `code.mjs` auf ein bis zwei Zeichen je Koordinate.
//
// Eine Fassung lang lagen hier alle zehn Zustände als Kette von Unterschieden,
// weil die Karte sich von einem zum nächsten verformte. Das waren rund 450 kB
// für neun Formen, die niemand mehr zu sehen bekam; sie gingen nur noch in den
// Mittelwert ein, und den kann man auch hier rechnen.

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

  /* Der Ankerpunkt stand hier, und mit ihm je Zustand ein Massstab: damit wuchs
     die Karte flächenproportional mit der Bevölkerung. Beides ist weg. Der
     Massstab wurde schon eingefroren, als das Wachstum in die Farbe zog, und
     ein fester Massstab um einen festen Punkt ist wirkungslos, sobald die Seite
     den Kartenausschnitt ohnehin auf die Leinwand normiert — sie misst den
     Rahmen der gezeichneten Punkte und rechnet ihn passend. */
  const nutz = {
    breite: BREITE, hoehe,
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

  /* Eine Form je Reihe: der Mittelwert aller Kartogramme, im selben ganzzahligen
     Gitter. Gemittelt wird **nach** dem Rastern, damit in der Nutzlast genau
     die Zahlen stehen, aus denen die Seite hinterher rechnet.

     Gemessen wird danach, wie sehr diese eine Form noch ein Kartogramm ist:
     ihre Flächen gegen den **mittleren** Bevölkerungsanteil über alle Bilder.
     Das ist die Aussage, die die Nutzlast jetzt trägt — nicht mehr „Fläche ist
     Bevölkerung dieses Jahres", sondern „Fläche ist Bevölkerung im Mittel der
     hundertfünfzig Jahre". */
  nutz.reihen = reihen.map(r => {
    const K = r.zeitreihe.zustaende.map(z => gitter(z.X, z.Y));
    const MX = new Int32Array(G.qx.length), MY = new Int32Array(G.qy.length);
    for (let i = 0; i < MX.length; i++) {
      let sx = 0, sy = 0;
      for (const k of K) { sx += k.qx[i]; sy += k.qy[i]; }
      MX[i] = Math.round(sx / K.length); MY[i] = Math.round(sy / K.length);
    }
    // Mittlerer Anteil je Kreis über alle Bilder, und dagegen die Fläche.
    const drin = r.zeitreihe.zustaende[0].abgedeckt.flatMap((a, g) => a ? [g] : []);
    const anteil = new Map(drin.map(g => [g, 0]));
    for (const b of r.bilder) {
      let summeW = 0;
      for (const g of drin) summeW += b.werte.get(attr[g].ags) ?? 0;
      for (const g of drin) anteil.set(g, anteil.get(g) + (b.werte.get(attr[g].ags) ?? 0) / summeW / r.bilder.length);
    }
    const fl = drin.map(g => flaecheGanz(gebiete[g], MX, MY));
    const summeF = fl.reduce((a, b) => a + b, 0);
    drin.forEach((g, k) => {
      if (anteil.get(g) > 0) abweichungen.push(Math.abs(fl[k] / (summeF * anteil.get(g)) - 1));
    });
    return { id: r.id, name: r.name, mx: packe(gegen(MX, G.qx)), my: packe(gegen(MY, G.qy)) };
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

  abweichungen.sort((a, b) => a - b);
  nutz.guete = {
    median: abweichungen[Math.floor(abweichungen.length / 2)],
    max: abweichungen[abweichungen.length - 1],
    ueber1: abweichungen.filter(a => a > 0.01).length,
    zellen: abweichungen.length,
  };
  log(`  Mittelform gegen den mittleren Anteil: Median ${(nutz.guete.median * 100).toFixed(2)} %, `
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

  log(`  Nutzlast: ${reihen.length} Reihe(n), eine Form aus ${zustaende.length} Kartogrammen, `
    + `${(JSON.stringify(nutz).length / 1024).toFixed(0)} kB roh`);
  return { nutz, jeKreis };
}
