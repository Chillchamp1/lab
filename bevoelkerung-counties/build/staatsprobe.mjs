// Stimmt das Kartogramm dort, wo man es sieht?
//
// `konv.mjs` misst den Median über alle 3 108 Countys. Diese Zahl verharmlost,
// denn der Fehler ist **räumlich sortiert**: der leere Westen bleibt zu gross,
// die dichten Küsten werden zu klein. Ein Median von 17 Prozent kann daneben
// stehen, während Kalifornien um das Fünffache danebenliegt.
//
// Deshalb misst dieses Werkzeug, was ein Mensch sieht: je Bundesstaat das
// Verhältnis von gezeichneter Fläche zu Bevölkerungsanteil. 1,00 heisst
// richtig, 0,44 heisst „auf 44 Prozent der verdienten Fläche geschrumpft",
// 14,8 heisst „fast fünfzehnmal zu gross". Gerechnet wird am Bild 2020.
//
// Aufruf aus `build/`:   GS=900,1600,2400 D=8 node staatsprobe.mjs
//
import { ladeCountys } from './laden.mjs';
import { baueKnotenmodell, vereinfache, beschraenke } from './topologie.mjs';
import { leseLang, baueBilder } from './daten.mjs';
import { rechneKartogramm } from './kartogramm.mjs';
const zeilen = leseLang(), bilder = baueBilder(zeilen);
const roh = ladeCountys();
const alles = baueKnotenmodell(roh.kreise);
const m = beschraenke(alles.gebiete, alles.attr, alles.X, alles.Y, new Set(zeilen.map(z => z.ags)));
const geo = vereinfache(m.gebiete, m.X, m.Y, 24000);
const b = bilder[bilder.length - 1];
const werte = m.attr.map(a => b.werte.get(a.ags) ?? 0);
const abgedeckt = m.attr.map(a => b.werte.has(a.ags));
// Anteil je Staat zum Vergleich
const staatBev = {}; let ges = 0;
m.attr.forEach((a, i) => { const s = a.ags.slice(0,2); staatBev[s] = (staatBev[s]??0) + werte[i]; ges += werte[i]; });
for (const wa of (process.env.WACHSTUM ?? '1.05').split(',').map(Number))
for (const bd of (process.env.BODEN ?? '0').split(',').map(Number))
for (const g of (process.env.GS ?? '900,1600,2400').split(',').map(Number)) {
  const t0 = Date.now(); let frei = 0;
  const k = rechneKartogramm({ gebiete: geo.gebiete, X: geo.X, Y: geo.Y, werte, abgedeckt,
    gitter: g, boden: bd, wachstum: wa, faltGrenze: Number(process.env.FALTEN ?? 0), durchgaenge: Number(process.env.D ?? 8), log: t => { if (/gefaltet 0$/.test(t)) frei++; } });
  // Staatsflächen im Ergebnis
  const fl = {}; let gesFl = 0;
  geo.gebiete.forEach((ringe, gi) => {
    let A2 = 0;
    for (const r of ringe) for (let i = 0, j = r.length - 1; i < r.length; j = i++)
      A2 += k.X[r[j]] * k.Y[r[i]] - k.X[r[i]] * k.Y[r[j]];
    const s = m.attr[gi].ags.slice(0,2);
    fl[s] = (fl[s] ?? 0) + Math.abs(A2)/2; gesFl += Math.abs(A2)/2;
  });
  const v = s => (fl[s]/gesFl) / (staatBev[s]/ges);
  console.log(`Boden ${bd} Wachstum ${wa}  GITTER ${String(g).padStart(4)} (${g}×${Math.round(g/1.571)} = ${(g*g/1.571/1e6).toFixed(1)} Mio Zellen): `
    + `Median ${(k.bilanz.median*100).toFixed(2)}%  faltungsfreie Durchgänge ${frei}  `
    + `CA ${v('06').toFixed(2)}×  TX ${v('48').toFixed(2)}×  MT ${v('30').toFixed(2)}×  WY ${v('56').toFixed(2)}×  `
    + `${((Date.now()-t0)/1000).toFixed(0)} s`);
}
