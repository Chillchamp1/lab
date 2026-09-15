// Einlesen von `data/bevoelkerung_counties_long.csv`.
//
// Eine Zeile ist ein County zu einer Zählung. Gebaut wird die Datei von
// `quellen.mjs`; die Spalten sind dieselben wie bei der deutschen Karte, nur
// die ersten beiden heissen anders.
//
// Was hier zählt und nicht zusammengerührt wird:
//
// - `jahr` benennt das Bild, `stichtag` den wirklichen Zähltag. Der wandert:
//   1900 wurde am 1. Juni gezählt, 1910 am 15. April, 1920 am 1. Januar, ab
//   1930 immer am 1. April. Das Bild trägt den Tag, nicht das gerundete Jahr.
// - `methode` ist A, wenn der Wert so in der Quelle steht, und B, wenn er die
//   Summe mehrerer damaliger Gebiete ist, deren Vereinigung genau das heutige
//   ergibt. C — Flächeninterpolation — kommt hier nicht vor: was sich nicht
//   exakt zuordnen liess, bleibt leer.

import { readFileSync } from 'node:fs';

const CSV = '../data/bevoelkerung_counties_long.csv';

export const SPALTEN = [
  'county_fips', 'county_name', 'jahr', 'stichtag', 'bevoelkerung',
  'begriff', 'methode', 'anteil_interpoliert', 'quelle', 'bemerkung',
];

export function zerlege(zeile) {
  const felder = [];
  let feld = '', inAnfuehrung = false;
  for (let i = 0; i < zeile.length; i++) {
    const c = zeile[i];
    if (inAnfuehrung) {
      if (c === '"' && zeile[i + 1] === '"') { feld += '"'; i++; }
      else if (c === '"') inAnfuehrung = false;
      else feld += c;
    } else if (c === '"') inAnfuehrung = true;
    else if (c === ',') { felder.push(feld); feld = ''; }
    else feld += c;
  }
  felder.push(feld);
  return felder;
}

export function leseLang() {
  const text = readFileSync(CSV, 'utf8').replace(/\r\n/g, '\n');
  const zeilen = text.split('\n').filter(z => z.length);
  const kopf = zerlege(zeilen[0]);
  const ix = {};
  for (const s of SPALTEN) ix[s] = kopf.indexOf(s);
  return zeilen.slice(1).map(z => {
    const f = zerlege(z);
    return {
      ags: f[ix.county_fips].padStart(5, '0'),
      name: f[ix.county_name],
      jahr: Number(f[ix.jahr]),
      stichtag: f[ix.stichtag],
      wert: Number(f[ix.bevoelkerung]),
      begriff: f[ix.begriff],
      methode: f[ix.methode],
    };
  });
}

// Zeilen zu Bildern bündeln — je Zählung eines.
export function baueBilder(zeilen) {
  const nach = new Map();
  for (const z of zeilen) {
    if (!nach.has(z.jahr)) nach.set(z.jahr, { jahr: z.jahr, stichtage: new Set(), werte: new Map() });
    const b = nach.get(z.jahr);
    b.stichtage.add(z.stichtag);
    b.werte.set(z.ags, z.wert);
  }
  return [...nach.values()]
    .sort((a, b) => a.jahr - b.jahr)
    .map(b => ({
      jahr: String(b.jahr),
      stichtage: [...b.stichtage].sort(),
      werte: b.werte,
      summe: [...b.werte.values()].reduce((x, y) => x + y, 0),
    }));
}
