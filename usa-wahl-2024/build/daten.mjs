// Liest die drei Quelldateien und verknüpft sie über den fünfstelligen
// FIPS-Code des Countys.

import { readFileSync } from 'node:fs';

// Aussengebiete ohne Wahlleute bleiben draussen. Alaska und Hawaii sind dabei,
// aber als eigene Gruppen: sie haengen geografisch nicht am Festland, also
// kann das Kartogramm sie nicht mit derselben Stroemung verziehen.
export const AUSSEN = new Set(['60', '66', '69', '72', '78']);
export const ALASKA = '02', HAWAII = '15';

// Alaska zaehlt nicht nach Boroughs aus, sondern nach State House Districts.
// Auf Borough-Ebene gibt es schlicht keine Zahlen; der Staat wird deshalb als
// ein Gebiet mit dem Landesergebnis gefuehrt.
export function alaskaLandesweit(erg) {
  let gop = 0, dem = 0, gesamt = 0;
  for (const [fips, e] of erg) if (fips.startsWith(ALASKA)) { gop += e.gop; dem += e.dem; gesamt += e.gesamt; }
  return { gop, dem, gesamt };
}

// Kalawao (81 Einwohner, die frühere Leprakolonie auf Molokai) wird
// wahlrechtlich zu Maui gezaehlt und hat keine eigenen Ergebnisse.
export const KALAWAO = '15005', MAUI = '15009';

// CSV mit Anführungszeichen: Felder können Kommas enthalten.
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

function liesCsv(pfad, kodierung = 'utf8') {
  const roh = readFileSync(pfad, kodierung).replace(/^﻿/, '');
  const zeilen = roh.split(/\r?\n/).filter(z => z.trim() !== '');
  const kopf = zeileTeilen(zeilen[0]);
  return zeilen.slice(1).map(z => {
    const f = zeileTeilen(z);
    const o = {};
    kopf.forEach((k, i) => o[k] = f[i]);
    return o;
  });
}

export function leseErgebnisse() {
  const m = new Map();
  for (const r of liesCsv('results.csv')) {
    let fips = String(r.county_fips).padStart(5, '0');
    // Die Quelle teilt Washington DC in acht Wards auf, die Geometrie kennt
    // einen Bezirk. Ohne Zusammenfassung bekaeme DC nur die Stimmen von Ward 1.
    if (fips.startsWith('11')) fips = '11001';
    const vor = m.get(fips);
    if (vor) {
      vor.gop += Number(r.votes_gop) || 0;
      vor.dem += Number(r.votes_dem) || 0;
      vor.gesamt += Number(r.total_votes) || 0;
      continue;
    }
    m.set(fips, {
      fips,
      name: fips === '11001' ? 'District of Columbia' : r.county_name,
      staat: r.state_name,
      gop: Number(r.votes_gop) || 0,
      dem: Number(r.votes_dem) || 0,
      gesamt: Number(r.total_votes) || 0,
    });
  }
  return m;
}

export function leseBevoelkerung() {
  const m = new Map();
  // Diese Datei ist Latin-1 kodiert, nicht UTF-8 (Ortsnamen mit Akzenten).
  for (const r of liesCsv('pop.csv', 'latin1')) {
    if (r.SUMLEV !== '050') continue;          // 050 = County, 040 = Staat
    const fips = String(r.STATE).padStart(2, '0') + String(r.COUNTY).padStart(3, '0');
    m.set(fips, {
      fips,
      name: r.CTYNAME,
      staat: r.STNAME,
      einwohner: Number(r.POPESTIMATE2024) || 0,
    });
  }
  return m;
}
