// Bundesstaaten, Wahlleute und Ergebnisse für die Wahlleute-Karte.
//
// Die Zahl der Wahlleute wird nicht aus einer Tabelle übernommen, sondern
// abgeleitet: Sitze im Repräsentantenhaus plus zwei Senatoren. Die Sitze
// ergeben sich aus der Zahl der Wahlbezirke des 119. Kongresses — also der
// Kammer, die im November 2024 gewählt wurde. Washington DC steht ausserhalb
// dieser Rechnung und hat drei, festgelegt durch den 23. Verfassungszusatz.

import { readFileSync } from 'node:fs';
import { leseDbf } from './shp.mjs';

export const AUSSEN = new Set(['60', '66', '69', '72', '78']);
export const ALASKA = '02', HAWAII = '15', DC = '11';

function zeileTeilen(z) {
  const f = [];
  let feld = '', drin = false;
  for (let i = 0; i < z.length; i++) {
    const c = z[i];
    if (c === '"') { if (drin && z[i + 1] === '"') { feld += '"'; i++; } else drin = !drin; }
    else if (c === ',' && !drin) { f.push(feld); feld = ''; }
    else feld += c;
  }
  f.push(feld);
  return f;
}

function liesCsv(pfad) {
  const zeilen = readFileSync(pfad, 'utf8').replace(/^﻿/, '').split(/\r?\n/).filter(z => z.trim() !== '');
  const kopf = zeileTeilen(zeilen[0]);
  return zeilen.slice(1).map(z => {
    const f = zeileTeilen(z);
    const o = {};
    kopf.forEach((k, i) => o[k] = f[i]);
    return o;
  });
}

export function leseWahlleute() {
  const cd = leseDbf('cb_2024_us_cd119_20m.dbf');
  const sitze = {};
  for (const c of cd) if (!AUSSEN.has(c.STATEFP)) sitze[c.STATEFP] = (sitze[c.STATEFP] ?? 0) + 1;
  const ev = {};
  for (const f of Object.keys(sitze)) ev[f] = f === DC ? 3 : sitze[f] + 2;
  return ev;
}

// Staatsergebnis als Summe der Countyergebnisse. Alaskas Countyzeilen sind in
// Wirklichkeit Wahlbezirke des Staatsparlaments; ihre Summe ist trotzdem das
// Landesergebnis, und genau das wird hier gebraucht.
export function leseStaatsErgebnisse() {
  const proStaat = {};
  for (const r of liesCsv('results.csv')) {
    const f = String(r.county_fips).padStart(5, '0').slice(0, 2);
    if (AUSSEN.has(f)) continue;
    if (!proStaat[f]) proStaat[f] = { gop: 0, dem: 0, gesamt: 0 };
    proStaat[f].gop += Number(r.votes_gop) || 0;
    proStaat[f].dem += Number(r.votes_dem) || 0;
    proStaat[f].gesamt += Number(r.total_votes) || 0;
  }
  return proStaat;
}
