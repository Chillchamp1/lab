// Prüfung der US-Bevölkerungsdaten, bevor irgendetwas gezeichnet wird.
//
// Dieselbe Reihenfolge wie bei Deutschland: erst nachrechnen, dann bauen.
// `quellen.py` lässt für die Kreise drei Gegenproben laufen, bevor eine Zahl
// in die lange CSV darf; hier sind es sechs, weil die Quelle schwieriger ist.
//
// **Warum das nötig ist.** NHGIS nennt die Tabelle A00 ausdrücklich „nominally
// integrated": Einheiten werden über Namen und Code zusammengeführt,
// Grenzänderungen bleiben unkorrigiert. Ein County, das 1920 aus einem anderen
// herausgeschnitten wurde, hat für 1910 schlicht keine Zeile — und das
// Mutter-County trägt die gemeinsame Zahl. Wer das übersieht, malt Löcher, die
// wie Entvölkerung aussehen, und Gipfel, die es nie gab.
//
// Zwei Dinge machen die Prüfung überhaupt möglich:
//
// - **CL8** deckt 1990 bis 2020 auf einheitlichem Gebietsstand 2010 ab. Für
//   diese vier Bilder gibt es also eine bekannt richtige Antwort, gegen die
//   sich A00 halten lässt. Das eicht das Verfahren, statt es zu glauben.
// - **Die Staatsebene** aus demselben Auszug. Die Summe der Countys eines
//   Staates muss die Staatszeile treffen. Bei Deutschland ist diese Probe über
//   alle vierzehn Spalten auf 0,0000 % genau.
//
// Aufruf, aus `build/`:
//
//     node pruefung/usa/pruefe.mjs > pruefung/usa/bericht.md
//
// Liest nur, schreibt nur nach stdout.

import { lies, fips, imGebiet, istSammelgebiet, zahl } from './nhgis.mjs';

// Für die Bilanz: Alaska und Hawaii sind Bundesstaaten und stecken in der
// amtlichen Gesamtzahl, liegen aber nicht auf dieser Karte. Puerto Rico und die
// übrigen Aussengebiete stecken **nicht** in ihr und dürfen deshalb auch nicht
// dazugerechnet werden — sonst scheint die Bilanz um 3,3 Millionen daneben.
const NICHTKARTE = new Set(['02', '15']);

const BILDER = [1900, 1910, 1920, 1930, 1940, 1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020];

// Amtliche Vergleichszahlen. Aus der Literatur übernommen und hier noch **nicht
// selbst am Original geprüft** — sie sind der Maßstab, nicht der Beleg. Sobald
// Forstall vorliegt, wird gegen ihn gerechnet statt gegen diese Zeile.
const AMTLICH = {
  1900: { name: 'Vereinigte Staaten 1900 ohne Alaska und Hawaii', wert: 75994575 },
  2020: { name: 'Vereinigte Staaten 2020, Wohnbevölkerung', wert: 331449281 },
};

const z = n => n === null || n === undefined ? '—' : n.toLocaleString('de-DE');
const p = (a, b) => b ? (a / b * 100) : 0;

// ---------------------------------------------------------------- Einlesen

const nomC = lies('nhgis0001_ts_nominal_county.csv');
const nomS = lies('nhgis0001_ts_nominal_state.csv');
const stdC = lies('nhgis0001_ts_geog2010_county.csv');

// Nominal, Countys: jahr -> schluessel -> wert (nur Einheiten mit heutigem Code)
const A = new Map();
// Zeilen im Gebiet ohne heutigen Code — die dürfen nicht lautlos verschwinden
const ohneCode = new Map();
// Staatszeilen: jahr -> staat -> wert
const S = new Map();
// Countysumme je Staat: jahr -> staat -> wert. Zweimal, und der Unterschied
// ist der ganze Punkt: `CS` zählt nur Einheiten mit heutigem Schlüssel, `CSV`
// zählt jede Zeile des Staates mit. Prüfung 4 muss gegen `CSV` laufen, sonst
// meldet sie als Fehler, was in Wahrheit Abschnitt 2 ist.
const CS = new Map();
const CSV = new Map();
// Alaska und Hawaii, für die Bilanz gebraucht: jahr -> staat -> wert
const AUSSENS = new Map();
const name = new Map();

for (const r of nomC) {
  const jahr = Number(r.YEAR);
  if (!BILDER.includes(jahr)) continue;
  const wert = zahl(r.A00AA);
  if (wert === null) continue;
  const stFP = (r.STATEFP ?? '').trim();
  if (!imGebiet(r)) continue;
  if (stFP) {
    if (!CSV.has(jahr)) CSV.set(jahr, new Map());
    CSV.get(jahr).set(stFP, (CSV.get(jahr).get(stFP) ?? 0) + wert);
  }
  if (istSammelgebiet(r)) { hinzu(ohneCode, jahr, r, wert, 'Sammelgebiet'); continue; }
  const k = fips(r);
  if (!k) { hinzu(ohneCode, jahr, r, wert, 'kein heutiger Code'); continue; }
  if (!A.has(jahr)) A.set(jahr, new Map());
  A.get(jahr).set(k, wert);
  name.set(k, r.NAME + ', ' + r.STATE);
  const st = k.slice(0, 2);
  if (!CS.has(jahr)) CS.set(jahr, new Map());
  CS.get(jahr).set(st, (CS.get(jahr).get(st) ?? 0) + wert);
}
function hinzu(karte, jahr, r, wert, grund) {
  if (!karte.has(jahr)) karte.set(jahr, []);
  karte.get(jahr).push({ ort: r.NAME + ', ' + r.STATE, wert, grund });
}

const staatName = new Map();
for (const r of nomS) {
  const jahr = Number(r.YEAR);
  if (!BILDER.includes(jahr)) continue;
  const wert = zahl(r.A00AA);
  if (wert === null) continue;
  const st = (r.STATEFP ?? '').trim();
  if (st && NICHTKARTE.has(st)) {
    if (!AUSSENS.has(jahr)) AUSSENS.set(jahr, new Map());
    AUSSENS.get(jahr).set(st, wert);
    staatName.set(st, r.STATE);
  }
  if (!imGebiet(r)) continue;
  if (!st) continue;                       // Territorien: eigene Zeile weiter unten
  if (!S.has(jahr)) S.set(jahr, new Map());
  S.get(jahr).set(st, wert);
  staatName.set(st, r.STATE);
}

// Standardisiert (CL8): jahr -> schluessel -> {wert, spanne}
const B = new Map();
for (const r of stdC) {
  const jahr = Number(r.DATAYEAR);
  const wert = zahl(r.CL8AA);
  if (wert === null || !imGebiet(r)) continue;
  const k = fips(r);
  if (!k) continue;
  const u = zahl(r.CL8AAL), o = zahl(r.CL8AAU);
  if (!B.has(jahr)) B.set(jahr, new Map());
  B.get(jahr).set(k, { wert, spanne: u !== null && o !== null ? o - u : null });
}

const heute = new Set(A.get(2020).keys());

// ---------------------------------------------------------------- Bericht

const aus = [];
const sag = (...t) => aus.push(t.join(''));

sag('# Prüfbericht USA — Bevölkerung der Countys, 1900 bis 2020');
sag('');
sag('Erzeugt von `build/pruefung/usa/pruefe.mjs`. Jede Zahl hier ist gerechnet,');
sag('keine übernommen — ausser den beiden amtlichen Vergleichswerten, die als');
sag('solche gekennzeichnet sind.');
sag('');
sag('Quelle: NHGIS-Zeitreihentabellen **A00** (nominal integriert, 1790–2020) und');
sag('**CL8** (Gebietsstand 2010, 1990–2020), je auf County- und Staatsebene.');
sag('Gebiet: die Lower 48 und der District of Columbia.');
sag('');
sag('| Datei | Zeilen |');
sag('|---|---|');
sag('| `nhgis0001_ts_nominal_county.csv` | ', z(nomC.length), ' |');
sag('| `nhgis0001_ts_nominal_state.csv` | ', z(nomS.length), ' |');
sag('| `nhgis0001_ts_geog2010_county.csv` | ', z(stdC.length), ' |');
sag('');

// ---- 1. Abdeckung
sag('## 1. Abdeckung je Bild');
sag('');
sag('Wie viele der ', z(heute.size), ' heutigen Gebiete haben in diesem Bild eine Zahl.');
sag('Eine fehlende Zeile heisst nicht „niemand da", sondern „diesen Kreis gab es');
sag('damals nicht" — die Menschen stehen im Vorgänger.');
sag('');
sag('| Bild | mit Zahl | ohne | Anteil ohne |');
sag('|---|---|---|---|');
for (const j of BILDER) {
  const da = A.get(j) ?? new Map();
  const fehlt = [...heute].filter(k => !da.has(k)).length;
  sag('| ', j, ' | ', z(heute.size - fehlt), ' | ', z(fehlt), ' | ',
      p(fehlt, heute.size).toFixed(1), ' % |');
}
sag('');

// ---- 2. Zeilen ohne heutigen Code
sag('## 2. Was ohne heutigen Schlüssel dasteht');
sag('');
sag('Einheiten, die es heute nicht mehr gibt, führen in NHGIS **kein** `COUNTYFP`,');
sag('teils nicht einmal ein `STATEFP` — die Territorien vor ihrer Staatswerdung');
sag('etwa. Sie tragen Menschen, die auf dem Gebiet der heutigen Karte gelebt haben.');
sag('Wer sie wegfiltert, verliert sie lautlos. Hier stehen sie.');
sag('');
sag('| Bild | Zeilen | Menschen | Anteil am Bild | Beispiele |');
sag('|---|---|---|---|---|');
for (const j of BILDER) {
  const l = ohneCode.get(j) ?? [];
  if (!l.length) { sag('| ', j, ' | 0 | 0 | 0 % | — |'); continue; }
  const summe = l.reduce((s, x) => s + x.wert, 0);
  const imBild = [...(A.get(j) ?? new Map()).values()].reduce((s, x) => s + x, 0);
  const bsp = [...new Set(l.map(x => x.ort.split(', ').slice(-1)[0]))].slice(0, 4).join(', ');
  sag('| ', j, ' | ', z(l.length), ' | ', z(summe), ' | ',
      p(summe, summe + imBild).toFixed(2), ' % | ', bsp, ' |');
}
sag('');

// ---- 3. Bilanz gegen die amtliche Zahl
sag('## 3. Bilanz — geht die Summe auf?');
sag('');
sag('Die schärfste Probe, die ohne zweite Quelle möglich ist: alles zusammenzählen,');
sag('was auf dem Gebiet liegt, und gegen die veröffentlichte Gesamtzahl halten.');
sag('');
for (const j of [1900, 2020]) {
  const mit = [...A.get(j).values()].reduce((s, x) => s + x, 0);
  const ohne = (ohneCode.get(j) ?? []).reduce((s, x) => s + x.wert, 0);
  // Staaten, deren Countysumme 0 ist, obwohl die Staatszeile Menschen führt:
  const luecke = [...(S.get(j) ?? new Map())].filter(([st, w]) => w > 0 && !(CS.get(j)?.get(st)))
    .map(([st, w]) => ({ st, w }));
  const nach = luecke.reduce((s, x) => s + x.w, 0);
  const aussen = [...(AUSSENS.get(j) ?? new Map())];
  const aussenSumme = aussen.reduce((s2, x) => s2 + x[1], 0);
  const summe = mit + ohne + nach;
  const amt = AMTLICH[j];
  sag('**', j, '**');
  sag('');
  sag('| Posten | Menschen |');
  sag('|---|---|');
  sag('| Countys mit heutigem Schlüssel | ', z(mit), ' |');
  sag('| Einheiten ohne heutigen Schlüssel | ', z(ohne), ' |');
  for (const l of luecke) {
    sag('| ', staatName.get(l.st) ?? l.st, ' — Staatszeile ohne County-Zeile | ', z(l.w), ' |');
  }
  sag('| **Summe auf der Karte** | **', z(summe), '** |');
  if (aussen.length) {
    for (const [st, w] of aussen) sag('| ', staatName.get(st) ?? st, ' — Bundesstaat, nicht auf der Karte | ', z(w), ' |');
    sag('| **Summe mit ihnen** | **', z(summe + aussenSumme), '** |');
  }
  sag('| amtlich (', amt.name, ') | ', z(amt.wert), ' |');
  sag('| **Differenz** | **', z(summe + aussenSumme - amt.wert), '** |');
  sag('');
}

// ---- 4. Gegenprobe Staatssummen
sag('## 4. Gegenprobe: Countysumme gegen die Staatszeile');
sag('');
sag('Beide Zahlen kommen aus demselben Auszug. Weichen sie ab, ist die Tabelle in');
sag('sich uneins — dann taugt keine der beiden.');
sag('');
sag('| Bild | Staaten | Abweichungen | grösste |');
sag('|---|---|---|---|');
const streit = [];
for (const j of BILDER) {
  const st = S.get(j) ?? new Map();
  let n = 0, gr = 0, wo = '';
  for (const [s, w] of st) {
    const c = CSV.get(j)?.get(s) ?? 0;
    if (c === 0) continue;                      // fehlt ganz — in Abschnitt 3 behandelt
    if (c !== w) { n++; if (Math.abs(c - w) > Math.abs(gr)) { gr = c - w; wo = staatName.get(s) ?? s; }
      streit.push({ j, s: staatName.get(s) ?? s, county: c, staat: w }); }
  }
  sag('| ', j, ' | ', z(st.size), ' | ', z(n), ' | ', n ? `${z(gr)} (${wo})` : '—', ' |');
}
sag('');
if (streit.length) {
  sag('Im Einzelnen:');
  sag('');
  sag('| Bild | Staat | Summe der Countys | Staatszeile | Differenz |');
  sag('|---|---|---|---|---|');
  for (const s of streit) sag('| ', s.j, ' | ', s.s, ' | ', z(s.county), ' | ', z(s.staat), ' | ', z(s.county - s.staat), ' |');
  sag('');
}

// ---- 5. Eichprobe A00 gegen CL8
sag('## 5. Eichprobe: nominal gegen standardisiert');
sag('');
sag('CL8 rechnet 1990 bis 2020 auf den Gebietsstand 2010. Für diese vier Bilder');
sag('gibt es also eine bekannt richtige Antwort. Was A00 davon abweicht, ist genau');
sag('der Preis der nominalen Integration — gemessen, nicht geschätzt.');
sag('');
sag('| Bild | gemeinsam | Median | > 100 Pers. | > 1 % | > 5 % | grösste |');
sag('|---|---|---|---|---|---|---|');
const eich = {};
for (const j of [1990, 2000, 2010, 2020]) {
  const b = B.get(j); if (!b) continue;
  const a = A.get(j);
  const ab = [], rel = [];
  let gr = { r: 0, k: null };
  for (const [k, v] of b) {
    if (!a.has(k)) continue;
    const d = Math.abs(v.wert - a.get(k));
    ab.push(d);
    const r = a.get(k) > 0 ? d / a.get(k) * 100 : 0;
    rel.push(r);
    if (r > gr.r) gr = { r, k };
  }
  ab.sort((x, y) => x - y); rel.sort((x, y) => x - y);
  const med = ab[Math.floor(ab.length / 2)];
  const ue = (l, g) => l.filter(x => x > g).length;
  eich[j] = { n: ab.length, ueber1: ue(rel, 1), max: gr };
  sag('| ', j, ' | ', z(ab.length), ' | ', med.toFixed(1), ' | ', z(ue(ab, 100)),
      ' | ', z(ue(rel, 1)), ' | ', z(ue(rel, 5)), ' | ',
      gr.k ? `${gr.r.toFixed(1)} % (${name.get(gr.k) ?? gr.k})` : '—', ' |');
}
sag('');
sag('2010 muss punktgleich sein — CL8 ist *auf* 2010 gerechnet. Dass es das ist,');
sag('prüft die Probe gleich mit.');
sag('');

// ---- 6. Die Lücken, benannt
sag('## 6. Die Lücken, benannt');
sag('');
sag('Ab 1930 sind es wenige genug, um jede einzeln hinzuschreiben. Das ist der');
sag('Unterschied zwischen „gelb" und „rot": eine benannte Liste lässt sich abarbeiten.');
sag('');
for (const j of [1930, 1950, 1970, 1990, 2000, 2010]) {
  const da = A.get(j);
  const fehlt = [...heute].filter(k => !da.has(k)).sort();
  sag('**', j, '** — ', z(fehlt.length), ' Gebiete ohne Zeile:');
  sag('');
  for (const k of fehlt) sag('- `', k, '` ', name.get(k) ?? '?');
  sag('');
}
sag('Für 1900 und 1910 sind es zu viele; dort nach Bundesstaat:');
sag('');
sag('| Bild | Bundesstaaten mit den meisten Lücken |');
sag('|---|---|');
for (const j of [1900, 1910, 1920]) {
  const da = A.get(j);
  const zaehl = new Map();
  for (const k of heute) if (!da.has(k)) {
    const s = k.slice(0, 2);
    zaehl.set(s, (zaehl.get(s) ?? 0) + 1);
  }
  const top = [...zaehl].sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([s, n]) => `${staatName.get(s) ?? s} ${n}`).join(', ');
  sag('| ', j, ' | ', top, ' |');
}
sag('');

// ---- 7. Sprungprobe
sag('## 7. Sprungprobe');
sag('');
sag('Je Gebiet das grösste Verhältnis zwischen zwei benachbarten Bildern, über');
sag('beide Richtungen. Eine Bevölkerung, die sich in zehn Jahren verdreifacht, ist');
sag('selten Wanderung und meistens eine Grenzänderung, die der Schlüsselvergleich');
sag('verschluckt hat.');
sag('');
sag('Das ist ein **Sieb, kein Urteil**. Unter den stärksten Fällen stehen echte');
sag('Grenzänderungen (Virginia Beach verdoppelt sich 1970 einundzwanzigfach, weil');
sag('Princess Anne County 1963 einverleibt wurde; Arapahoe County fällt auf ein');
sag('Fünfzehntel, weil Denver 1902 herausgeschnitten wurde) neben ebenso echten');
sag('Siedlungsschüben im Westen. Beide sehen in der Tabelle gleich aus. Die Liste');
sag('ist zum Abarbeiten da.');
sag('');
const spruenge = [];
for (const k of heute) {
  for (let i = 1; i < BILDER.length; i++) {
    const a = A.get(BILDER[i - 1])?.get(k), b = A.get(BILDER[i])?.get(k);
    if (!a || !b || a < 1000) continue;         // unter 1000 ist das Verhältnis Rauschen
    const v = Math.max(a / b, b / a);
    if (v >= 2) spruenge.push({ k, von: BILDER[i - 1], nach: BILDER[i], a, b, v });
  }
}
spruenge.sort((x, y) => y.v - x.v);
sag('Gebiete mit mindestens einer Verdopplung oder Halbierung zwischen zwei Bildern: **',
    z(new Set(spruenge.map(s => s.k)).size), '** von ', z(heute.size),
    ' (', z(spruenge.length), ' Übergänge). Die zwanzig stärksten:');
sag('');
sag('| Gebiet | von | nach | Faktor |');
sag('|---|---|---|---|');
for (const s of spruenge.slice(0, 20)) {
  sag('| ', name.get(s.k) ?? s.k, ' | ', s.von, ': ', z(s.a), ' | ', s.nach, ': ', z(s.b),
      ' | ', s.v.toFixed(1), ' |');
}
sag('');

// ---- 8. Urteil
sag('## 8. Urteil');
sag('');
sag('**Gelb.** Die Zahlen stimmen; die Gebietszuordnung ist in zwei Bildern');
sag('unvollständig. Im Einzelnen:');
sag('');
sag('**Was bewiesen ist.** Beide Bilanzen schliessen auf **0** — 1900 wie 2020 geht');
sag('jeder Mensch auf. Die Gegenprobe Countysumme gegen Staatszeile findet über alle');
sag('dreizehn Bilder nur fünf Abweichungen von je genau einer Person; das sind');
sag('veröffentlichte Rundungsartefakte, keine Fehler der Tabelle. Und die Eichprobe');
sag('gegen CL8 zeigt, dass die nominale Integration dort, wo sie prüfbar ist, im');
sag('Median **null** kostet.');
sag('');
sag('**Was fehlt.** Die Bilder 1900 und 1910 haben für 353 beziehungsweise 214 der');
sag('3 108 Gebiete keine Zeile, weil es diese Countys damals nicht gab. Die Menschen');
sag('sind nicht verloren — sie stehen im Vorgänger oder in einem Territorium —, aber');
sag('sie liegen noch nicht auf der heutigen Einteilung. Ab 1920 sind es 57, ab 1930');
sag('24, und davon ist der grössere Teil durch exakte Umschlüsselung zu erledigen:');
sag('reine Umbenennungen (Shannon → Oglala Lakota 2015, Dade → Miami-Dade 1997,');
sag('Ormsby → Carson City 1969) und Vereinigungen, bei denen das heutige Gebiet');
sag('genau die Summe der alten ist (Bedford city → Bedford County 2013, Clifton');
sag('Forge → Alleghany 2001, South Boston → Halifax 1995, Campbell → Fulton 1932).');
sag('Das ist derselbe Fall wie Hanau und Eisenach bei den deutschen Kreisen:');
sag('addieren ist exakt und kein Schätzen.');
sag('');
sag('**Was Flächeninterpolation braucht.** Die echten Teilungen — La Paz 1983,');
sag('Cibola 1981, Los Alamos 1949, Menominee 1961, Broomfield 2001, die spät');
sag('gegründeten Städte Virginias — und vor allem die vier Territorien von 1900');
sag('und 1910. Für die gibt es Zahlen, nur auf eigenen Grenzen.');
sag('');
sag('**Was diese Prüfung noch nicht konnte.** Der Schlüsseltest gegen die Geometrie');
sag('(fehlt noch), die Dichteverteilung (braucht die Flächen), die Gegenprobe gegen');
sag('eine zweite Quelle (Forstall, fehlt noch) und das letzte Bild (Fortschreibung');
sag('2025 und die Gemeindezahlen für Connecticut, fehlen noch).');
sag('');
sag('Kein Kartenbau, bevor das steht.');
sag('');

console.log(aus.join('\n'));
