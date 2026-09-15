// Wie viele Durchgänge braucht das Kartogramm, bis es steht?
//
// **Antwort: es steht nicht.** Gemessen an Bild 2020, 24 000 Knoten,
// Gitter 900, dreissig Durchgänge: der Median fällt bis etwa zum zwölften
// Durchgang auf rund 15 Prozent und pendelt danach zwischen 15 und 22, während
// die Zahl gefalteter Ringe von 0 auf über 60 steigt. Das Feld beginnt sich zu
// überschlagen, statt zu konvergieren.
//
// Deshalb baut die Seite mit 6 und 4 Durchgängen, und `kartogramm.mjs` behält
// je Bild den besten Durchgang, der ganz ohne Faltung auskommt. Mehr Rechnen
// wäre verschenkte Zeit — das ist hier nachgemessen, nicht vermutet.
//
// Aufruf aus `build/`:   D=30 G=900 KN=24000 node konv.mjs
import { ladeCountys } from './laden.mjs';
import { baueKnotenmodell, vereinfache, beschraenke } from './topologie.mjs';
import { leseLang, baueBilder } from './daten.mjs';
import { rechneKartogramm } from './kartogramm.mjs';
const zeilen = leseLang(), bilder = baueBilder(zeilen);
const roh = ladeCountys();
const alles = baueKnotenmodell(roh.kreise);
const m = beschraenke(alles.gebiete, alles.attr, alles.X, alles.Y, new Set(zeilen.map(z => z.ags)));
const geo = vereinfache(m.gebiete, m.X, m.Y, Number(process.env.KN ?? 24000));
const b = bilder[bilder.length - 1];
const werte = m.attr.map(a => b.werte.get(a.ags) ?? 0);
const abgedeckt = m.attr.map(a => b.werte.has(a.ags));
const t0 = Date.now();
const k = rechneKartogramm({ gebiete: geo.gebiete, X: geo.X, Y: geo.Y, werte, abgedeckt,
  gitter: Number(process.env.G ?? 900), durchgaenge: Number(process.env.D ?? 24),
  log: s => console.log(s) });
console.log(`ENDE Median ${(k.bilanz.median*100).toFixed(2)}%  ${((Date.now()-t0)/1000).toFixed(0)} s`);
