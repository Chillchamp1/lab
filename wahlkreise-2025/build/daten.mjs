import { readFileSync } from 'node:fs';

const zahl = s => { const t = String(s ?? '').trim().replace(/\./g, '').replace(',', '.'); return t === '' || t === '-' ? null : Number(t); };
const zeilen = p => readFileSync(p, 'utf8').replace(/^﻿/, '').split(/\r?\n/);

export function leseErgebnisse() {
  const wk = new Map();
  for (const z of zeilen('kerg2.csv')) {
    const f = z.split(';');
    if (f[2] !== 'Wahlkreis' || f[10] !== '2') continue;
    const nr = Number(f[3]);
    if (!wk.has(nr)) wk.set(nr, { nr, name: f[4], landNr: f[6], stimmen: {}, gueltig: 0, wahlberechtigte: 0, waehlende: 0 });
    const e = wk.get(nr);
    const anzahl = zahl(f[11]);
    if (anzahl === null) continue;
    if (f[7] === 'Partei') {
      let name = f[8];
      if (name === 'CDU' || name === 'CSU') name = 'CDU/CSU';
      else if (name === 'GRÜNE') name = 'Grüne';
      else if (name === 'Die Linke') name = 'Linke';
      else if (name === 'FREIE WÄHLER') name = 'Freie Wähler';
      e.stimmen[name] = (e.stimmen[name] ?? 0) + anzahl;
    } else if (f[8] === 'Gültige') e.gueltig = anzahl;
    else if (f[8] === 'Wahlberechtigte') e.wahlberechtigte = anzahl;
    else if (f[8] === 'Wählende') e.waehlende = anzahl;
  }
  return wk;
}

export function leseStruktur() {
  const s = new Map();
  for (const z of zeilen('strukturdaten.csv')) {
    if (z.startsWith('#') || z.startsWith('Spalten') || z.startsWith('Land;')) continue;
    const f = z.split(';');
    const nr = Number(f[1]);
    if (!Number.isFinite(nr) || nr < 1 || nr > 299) continue;
    s.set(nr, { nr, land: f[0], name: f[2], flaeche: zahl(f[4]), bevoelkerung: zahl(f[5]) * 1000 });
  }
  return s;
}

