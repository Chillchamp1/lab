// Aus den Rohdaten die lange Tabelle bauen — eine Zeile je County und Zählung.
//
// Das Gegenstück zu `quellen.py` der deutschen Karte, und mit derselben Regel:
// **es wird nichts geschätzt.** Jeder Wert steht so in einer Quelle, oder er
// steht gar nicht da. Was fehlt, bleibt leer und wird auf der Karte wie See
// behandelt, statt mit einer plausiblen Zahl gefüllt zu werden.
//
// Zwei Quellen, in dieser Reihenfolge:
//
// - **NHGIS A00** ist das Rückgrat: alle dreizehn Zählungen, County-Ebene.
//   Die Tabelle ist *nominal integriert* — Einheiten werden über Namen und
//   Code zusammengeführt, Grenzänderungen bleiben unkorrigiert. Was das
//   kostet, ist in `bevoelkerung-kreise/build/pruefung/usa/bericht.md`
//   gemessen: im Median null.
// - **Forstall (NBER)** füllt, wo NHGIS nichts hat — die Territorien, die 1900
//   noch keine Bundesstaaten waren, und den District of Columbia, den NHGIS
//   ausgerechnet für 1900 auslässt. Beide Reihen sind unabhängig voneinander
//   zusammengetragen worden und gehen in über dreissigtausend Vergleichen
//   zehnmal auseinander, jedes Mal an einer Grenze, die sich bewegt hat.
//
// **Die Umschlüsselung** ist der einzige Eingriff, und sie ist exakt. Jede
// Zeile unten ist entweder eine Umbenennung mit neuer Kennziffer oder eine
// Eingliederung, bei der das heutige Gebiet genau die Vereinigung der alten
// ist. Addieren ist dann kein Schätzen — dieselbe Begründung, mit der die
// deutsche Karte Eisenach dem Wartburgkreis zuschlägt. Geteilt wird nie.

import { readFileSync, writeFileSync } from 'node:fs';
import { gebiete } from './topojson.mjs';
import { laea } from './geometrie.mjs';

export const BILDER = [1900, 1910, 1920, 1930, 1940, 1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020];

// Die Zähltage. Der Tag steht in der Tabelle, nicht das gerundete Jahr — wie
// bei den deutschen Kreisen auch.
const STICHTAG = {
  1900: '1900-06-01', 1910: '1910-04-15', 1920: '1920-01-01', 1930: '1930-04-01',
  1940: '1940-04-01', 1950: '1950-04-01', 1960: '1960-04-01', 1970: '1970-04-01',
  1980: '1980-04-01', 1990: '1990-04-01', 2000: '2000-04-01', 2010: '2010-04-01',
  2020: '2020-04-01',
};

// Nicht auf dieser Karte.
export const AUSSEN = new Set(['02', '15', '60', '66', '69', '72', '78']);

// Alte Kennziffer → heutiges Gebiet. Alles Umbenennungen oder Eingliederungen;
// das heutige Gebiet ist jeweils genau die Vereinigung der alten.
const UMSCHLUESSELUNG = {
  '12025': '12086',   // Dade County → Miami-Dade County, umbenannt 1997
  '46113': '46102',   // Shannon County → Oglala Lakota County, umbenannt 2015
  '32025': '32510',   // Ormsby County und Carson City, 1969 zusammengelegt
  '51515': '51019',   // Bedford city → 2013 in Bedford County eingegliedert
  '51560': '51005',   // Clifton Forge city → 2001 in Alleghany County
  '51780': '51083',   // South Boston city → 1995 in Halifax County
  '51123': '51800',   // Nansemond County → Nansemond city → 1974 Suffolk city
  '51055': '51650',   // Elizabeth City County → 1952 in Hampton city
  '51189': '51700',   // Warwick County → 1958 in Newport News city
  '51129': '51550',   // Norfolk County → 1963 Chesapeake city
  '51151': '51810',   // Princess Anne County → 1963 Virginia Beach city
};

// **Kurzschlüssel statt voller Zitate.** Die deutsche Tabelle trägt die
// Quellenangabe ausgeschrieben in jeder Zeile; bei 4 000 Zeilen kostet das
// 1,2 MB und ist es wert. Hier sind es 39 824 Zeilen, und dieselbe Gewohnheit
// blähte die Datei auf 14 MB — für ein Repo, in dem Kleinkram liegen soll, zu
// viel. Die Spalte trägt deshalb einen Schlüssel; ausgeschrieben stehen beide
// Quellen in QUELLEN.md, mit Fassung, Herausgeber und Zugangsweg.
const QUELLE_NHGIS = 'NHGIS A00 (nominal)';
const QUELLE_FORSTALL = 'Forstall/NBER';

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

function lies(datei) {
  const zeilen = readFileSync('roh/' + datei, 'utf8').replace(/\r\n/g, '\n').split('\n').filter(z => z.length);
  const kopf = zerlege(zeilen[0]);
  return zeilen.slice(1).map(z => {
    const f = zerlege(z), o = {};
    for (let i = 0; i < kopf.length; i++) o[kopf[i]] = f[i] ?? '';
    return o;
  });
}

const heutiges = k => UMSCHLUESSELUNG[k] ?? k;

export function baueTabelle(log = () => {}) {
  // --- Geometrie: welche Gebiete gibt es, wie heissen sie, wie gross sind sie
  const topo = JSON.parse(readFileSync('roh/counties-10m.json', 'utf8'));
  const alle = gebiete(topo, 'counties').filter(g => !AUSSEN.has(g.id.slice(0, 2)));
  const stamm = {};
  for (const g of alle) {
    // Fläche aus der **ungeneralisierten** Geometrie, über dieselbe
    // flächentreue Projektion wie die Karte. Ein amtliches Flächenverzeichnis
    // liegt nicht vor; der Fehler der Projektion liegt bei einem Promille.
    let a2 = 0;
    for (const r of g.ringe) {
      const n = r.length / 2;
      for (let i = 0, j = n - 1; i < n; j = i++) {
        const [xi, yi] = laea(r[i * 2], r[i * 2 + 1], -96, 37.5);
        const [xj, yj] = laea(r[j * 2], r[j * 2 + 1], -96, 37.5);
        a2 += xj * yi - xi * yj;
      }
    }
    stamm[g.id] = { name: g.name, flaeche: Math.abs(a2) / 2 / 1e6 };
  }
  log(`  Geometrie: ${alle.length} Gebiete, Fläche zusammen `
    + `${Math.round(Object.values(stamm).reduce((s, v) => s + v.flaeche, 0)).toLocaleString('de-DE')} km²`);

  // --- NHGIS
  const werte = new Map();          // jahr -> fips -> { wert, quelle }
  for (const j of BILDER) werte.set(j, new Map());
  let umgeschluesselt = 0;
  for (const z of lies('nhgis0001_ts_nominal_county.csv')) {
    const j = Number(z.YEAR);
    if (!werte.has(j)) continue;
    const s = z.STATEFP.trim(), c = z.COUNTYFP.trim(), v = z.A00AA.trim();
    if (!s || !c || !v || AUSSEN.has(s)) continue;
    const k = heutiges(s + c);
    if (k !== s + c) umgeschluesselt++;
    const m = werte.get(j);
    const alt = m.get(k);
    m.set(k, { wert: (alt?.wert ?? 0) + Number(v), quelle: 'nhgis', teile: (alt?.teile ?? 0) + 1 });
  }
  log(`  NHGIS: ${[...werte.values()].reduce((s, m) => s + m.size, 0)} Zellen, `
    + `${umgeschluesselt} Zeilen umgeschlüsselt`);

  // --- Forstall füllt, wo NHGIS nichts hat
  let gefuellt = 0;
  for (const z of lies('cencounts.csv')) {
    const f = (z.fips ?? '').trim();
    if (!f || f.endsWith('000') || AUSSEN.has(f.slice(0, 2))) continue;
    const k = heutiges(f);
    for (const j of BILDER) {
      const roh = (z['pop' + j] ?? '').trim();
      if (!roh || roh === '.' || roh === 'NA') continue;
      const m = werte.get(j);
      if (m.has(k)) continue;                    // NHGIS hat Vorrang
      m.set(k, { wert: Number(roh), quelle: 'forstall', teile: 1 });
      gefuellt++;
    }
  }
  log(`  Forstall: ${gefuellt} Zellen ergänzt, die NHGIS nicht hat`);

  // --- Lange Tabelle
  const kennung = new Set(Object.keys(stamm));
  const zeilen = [];
  const fehlend = new Map();
  for (const j of BILDER) {
    const m = werte.get(j);
    let da = 0;
    for (const k of [...kennung].sort()) {
      const e = m.get(k);
      if (!e) continue;
      da++;
      zeilen.push({
        county_fips: k,
        county_name: stamm[k].name,
        jahr: j,
        stichtag: STICHTAG[j],
        bevoelkerung: e.wert,
        begriff: 'resident population',
        methode: e.teile > 1 ? 'B' : 'A',
        anteil_interpoliert: 0,
        quelle: e.quelle === 'nhgis' ? QUELLE_NHGIS : QUELLE_FORSTALL,
        bemerkung: e.teile > 1 ? 'Summe aus ' + e.teile + ' damaligen Gebieten' : 'Volkszählung',
      });
    }
    fehlend.set(j, kennung.size - da);
  }
  return { zeilen, stamm, fehlend, gebieteZahl: kennung.size };
}

// Nur zitieren, wo es sein muss. Bei knapp vierzigtausend Zeilen sind acht
// überflüssige Anführungszeichen je Zeile ein Drittel Megabyte.
const q = s => {
  const t = String(s);
  return /[",\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
};
const SPALTEN = ['county_fips', 'county_name', 'jahr', 'stichtag', 'bevoelkerung',
  'begriff', 'methode', 'anteil_interpoliert', 'quelle', 'bemerkung'];

if (import.meta.url === 'file://' + process.argv[1]) {
  const log = (...t) => console.error(...t);
  log('Rohdaten …');
  const { zeilen, stamm, fehlend, gebieteZahl } = baueTabelle(log);
  const aus = [SPALTEN.join(',')];
  for (const z of zeilen) {
    aus.push(SPALTEN.map(s => q(z[s])).join(','));
  }
  writeFileSync('../data/bevoelkerung_counties_long.csv', aus.join('\n') + '\n');
  writeFileSync('stammdaten.json', JSON.stringify(stamm));
  log(`\n${zeilen.length} Zeilen, ${gebieteZahl} Gebiete, ${BILDER.length} Bilder`);
  log('\nBild   mit Zahl   ohne   Summe');
  for (const j of BILDER) {
    const s = zeilen.filter(z => z.jahr === j).reduce((a, z) => a + z.bevoelkerung, 0);
    log(`${j}   ${(gebieteZahl - fehlend.get(j)).toString().padStart(8)}   ${fehlend.get(j).toString().padStart(4)}   ${s.toLocaleString('de-DE').padStart(13)}`);
  }
}
