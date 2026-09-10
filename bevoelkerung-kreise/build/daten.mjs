// Einlesen von `data/bevoelkerung_kreise_long.csv`.
//
// Eine Zeile ist ein Kreis zu einem Zeitpunkt. Die Spalten stehen in
// METHODIK.md; hier zählt vor allem, was nicht zusammengerührt wird:
//
// - `jahr` benennt das Bild, `stichtag` den Tag der einzelnen Zählung. Beide
//   deutschen Staaten haben zwischen 1949 und 1990 zu verschiedenen Tagen
//   gezählt, teils Jahre auseinander. Das Bild trägt beide Stichtage, statt
//   sie auf ein Datum zu ziehen.
// - `begriff` unterscheidet ortsanwesende Bevölkerung (Kaiserreich,
//   einschliesslich Militär) von Wohnbevölkerung. Wer beides ohne Hinweis
//   übereinanderlegt, baut sich Sprünge ein, die es nie gab.
// - `methode` ist A, B oder C, `anteil_interpoliert` sagt bei C, wie viel des
//   Werts aus einer Flächenumrechnung stammt.

import { readFileSync } from 'node:fs';

const CSV = '../data/bevoelkerung_kreise_long.csv';

export const SPALTEN = [
  'kreis_ags', 'kreis_name', 'jahr', 'stichtag', 'bevoelkerung',
  'begriff', 'methode', 'anteil_interpoliert', 'quelle', 'bemerkung',
];

function zerlege(zeile) {
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

export function leseLang(pfad = CSV) {
  const text = readFileSync(pfad, 'utf8').replace(/^﻿/, '');
  const zeilen = text.split(/\r?\n/).filter(z => z.trim() !== '');
  const kopf = zerlege(zeilen[0]);
  const fehlt = SPALTEN.filter(s => !kopf.includes(s));
  if (fehlt.length) throw new Error('Spalten fehlen: ' + fehlt.join(', '));
  const pos = Object.fromEntries(SPALTEN.map(s => [s, kopf.indexOf(s)]));

  const zeilenObjekte = [];
  for (let i = 1; i < zeilen.length; i++) {
    const f = zerlege(zeilen[i]);
    const bev = f[pos.bevoelkerung].trim();
    zeilenObjekte.push({
      ags: f[pos.kreis_ags].trim().padStart(5, '0'),
      name: f[pos.kreis_name].trim(),
      jahr: f[pos.jahr].trim(),
      stichtag: f[pos.stichtag].trim(),
      bevoelkerung: bev === '' ? null : Number(bev),
      begriff: f[pos.begriff].trim(),
      methode: f[pos.methode].trim(),
      anteilInterpoliert: Number(f[pos.anteil_interpoliert] || 0),
      quelle: f[pos.quelle].trim(),
      bemerkung: f[pos.bemerkung].trim(),
    });
  }
  return zeilenObjekte;
}

// Zeilen zu Bildern bündeln. Ein Bild ist ein `jahr`; es kann Stichtage aus
// mehreren Zählungen enthalten, etwa 1950 aus der Bundesrepublik (13.9.) und
// der DDR (31.8.). Die Spannweite der Stichtage wird mitgeführt und in der
// Karte angezeigt.
export function baueBilder(zeilen) {
  const nach = new Map();
  for (const z of zeilen) {
    if (z.bevoelkerung === null) continue;
    if (!nach.has(z.jahr)) nach.set(z.jahr, { jahr: z.jahr, werte: new Map(), stichtage: new Map(), begriffe: new Set(), methoden: new Set(), quellen: new Set(), methodeJeKreis: new Map(), anteilJeKreis: new Map() });
    const b = nach.get(z.jahr);
    b.werte.set(z.ags, (b.werte.get(z.ags) ?? 0) + z.bevoelkerung);
    if (z.methode) b.methodeJeKreis.set(z.ags, z.methode);
    if (z.anteilInterpoliert) b.anteilJeKreis.set(z.ags, z.anteilInterpoliert);
    b.stichtage.set(z.stichtag, (b.stichtage.get(z.stichtag) ?? 0) + 1);
    if (z.begriff) b.begriffe.add(z.begriff);
    if (z.methode) b.methoden.add(z.methode);
    if (z.quelle) b.quellen.add(z.quelle);
  }
  const bilder = [...nach.values()].sort((a, b) => sortierschluessel(a.jahr) - sortierschluessel(b.jahr));
  return bilder.map(b => ({
    jahr: b.jahr,
    werte: b.werte,
    stichtage: [...b.stichtage.keys()].sort(),
    begriffe: [...b.begriffe].sort(),
    methoden: [...b.methoden].sort(),
    quellen: [...b.quellen].sort(),
    methodeJeKreis: b.methodeJeKreis,
    anteilJeKreis: b.anteilJeKreis,
    summe: [...b.werte.values()].reduce((a, c) => a + c, 0),
  }));
}

// „1961/1964" sortiert nach der ersten Jahreszahl.
function sortierschluessel(jahr) {
  const m = String(jahr).match(/\d{4}/);
  return m ? Number(m[0]) : 0;
}
