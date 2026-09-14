// Einlesen der NHGIS-Zeitreihentabellen.
//
// Der Auszug liegt als vier CSV in `build/roh-usa/`: die Tabelle A00
// (nominal integriert, 1790 bis 2020) und CL8 (auf den Gebietsstand 2010
// gerechnet, 1990 bis 2020), je einmal auf County- und einmal auf
// Staatsebene. Welche Datei was ist, steht in DATEN.md.
//
// **Der Schlüssel ist die Falle.** NHGIS führt drei Kennungen nebeneinander:
//
// - `GISJOIN` ist die eigene, stabile Kennung (G + `STATENH` + `COUNTYNH`).
//   Sie ist immer da.
// - `STATEFP` und `COUNTYFP` sind die heutigen FIPS — und sie sind **leer**,
//   wenn es die Einheit heute nicht mehr gibt. Von 56 088 Zeilen haben 1 369
//   kein `COUNTYFP` und 897 nicht einmal ein `STATEFP`.
//
// Wer daraus naiv `STATEFP + COUNTYFP` zusammensetzt, wirft alle
// verschwundenen Countys eines Staates auf denselben Schlüssel — und merkt es
// nicht, weil dabei eine gültig aussehende zweistellige Zeichenkette
// herauskommt. Genau das ist hier beim ersten Durchgang passiert; aufgefallen
// ist es daran, dass „Campbell, Georgia" unter dem Schlüssel `13` stand.
//
// Deshalb: `fips()` gibt nur dann einen Schlüssel zurück, wenn **beide** Teile
// da sind, und sonst `null`. Wer eine Zeile ohne Schlüssel bekommt, muss sie
// benennen, nicht wegwerfen — sie trägt Menschen.
//
// **Und die Territorien.** Arizona, New Mexico, Oklahoma und das Indian
// Territory waren 1900 noch keine Bundesstaaten. Ihre Zeilen stehen in der
// Tabelle, aber ohne `STATEFP`. Ein Filter auf moderne FIPS lässt sie
// unbemerkt durchfallen — und mit ihnen 1900 über eine Million Menschen, die
// heute auf dem Gebiet der Lower 48 leben. `imGebiet()` entscheidet deshalb
// nach Namen, wo kein Code steht.

import { readFileSync } from 'node:fs';
import { zerlege } from '../../daten.mjs';

const ROH = new URL('../../roh-usa/', import.meta.url);

// Nicht auf der Karte: Alaska, Hawaii, Amerikanisch-Samoa, Guam, Nördliche
// Marianen, Puerto Rico, Amerikanische Jungferninseln.
export const AUSSEN = new Set(['02', '15', '60', '66', '69', '72', '78']);

// Gebiete ohne heutigen Staats-FIPS, nach Namen entschieden. Vollständig für
// die Bilder ab 1900 — die übrigen Territorien (Dakota, Utah, Washington und
// zwei Dutzend mehr) sind bis 1890 Staaten geworden und kommen hier nicht vor.
//
// Die vier ersten liegen auf dem Gebiet der heutigen Lower 48 und gehören auf
// die Karte, sobald ihre Grenzen umgerechnet sind. Alaska und Hawaii nicht.
//
// „Persons in the Military" ist kein Ort: 91 219 Menschen im Jahr 1900, US-
// Militär im Ausland, das die Zählung als eigene Kategorie ohne Bundesstaat
// führt. Sie stehen nur auf Staatsebene, haben kein County und können keinem
// zugeschlagen werden. Sie fehlen der Karte also — benannt, nicht verschwiegen.
const TERRITORIUM = {
  'Arizona Territory': true,
  'New Mexico Territory': true,
  'Oklahoma Territory': true,
  'Indian Territory': true,
  'Alaska Territory': false,
  'Hawaii Territory': false,
  'Persons in the Military': false,
};

export function lies(datei) {
  const text = readFileSync(new URL(datei, ROH), 'utf8').replace(/\r\n/g, '\n');
  const zeilen = text.split('\n').filter(z => z.length);
  const kopf = zerlege(zeilen[0]);
  return zeilen.slice(1).map(z => {
    const f = zerlege(z), o = {};
    for (let i = 0; i < kopf.length; i++) o[kopf[i]] = f[i] ?? '';
    return o;
  });
}

// Der fünfstellige Schlüssel — oder null, wenn die Einheit heute nicht mehr
// existiert. Die geog2010-Dateien nennen die Spalten STATEA/COUNTYA.
export function fips(z) {
  const s = (z.STATEFP ?? z.STATEA ?? '').trim();
  const c = (z.COUNTYFP ?? z.COUNTYA ?? '').trim();
  return s && c ? s + c : null;
}

// Liegt die Zeile auf dem Gebiet der Lower 48 + DC?
export function imGebiet(z) {
  const s = (z.STATEFP ?? z.STATEA ?? '').trim();
  if (s) return !AUSSEN.has(s);
  const t = TERRITORIUM[z.STATE];
  if (t === undefined) throw new Error('unbekanntes Gebiet ohne FIPS: ' + z.STATE);
  return t;
}

// Sammelgebiete ("multi-county reporting area") tragen COUNTYNH 99xx und sind
// keine Countys, sondern Bündel. Sie dürfen nicht als Gebiet gezählt werden.
export function istSammelgebiet(z) {
  return (z.COUNTYNH ?? '').startsWith('99');
}

export function zahl(s) {
  const t = (s ?? '').trim();
  return t === '' ? null : Number(t);
}
