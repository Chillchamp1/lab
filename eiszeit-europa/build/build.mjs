// Erzeugt die fertige, in sich geschlossene index.html.
//   node build.mjs > ../index.html
//
// Die Seite geht auf stdout, die Kennzahlen auf stderr — so macht es die
// Vorlage, und das ist der Grund, warum sich ein Bau gegen den vorigen diffen
// laesst.

import { readFileSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { baueNutzlast } from './nutzlast.mjs';
import { baueSeite } from './seite.mjs';
import { gesteinAtlas, gesteinCvd, eisRampe, monoton } from './leiter.mjs';

const log = s => process.stderr.write(s + '\n');
const ZWISCHEN = process.env.ZWISCHEN || 'zwischen';

/* ---------- Die Leiter, in Metern ----------
   Gesetzt ist nur, wie viele Baender es gibt. Wo sie anfangen und aufhoeren,
   sind Meter — und die **Null ist eine Bandgrenze**. Das ist die eine Zahl,
   an der hier alles haengt: dadurch ist die Kuestenlinie eine Hoehenlinie wie
   jede andere, und sie faellt genau dorthin, wo die gerechnete
   Paläotopographie ihr Vorzeichen wechselt.

   Land und Wasser bekommen **verschiedene Schrittweiten**, und das ist keine
   Nachlaessigkeit, sondern Atlaskonvention: die Tiefenlinien eines Seeatlas
   stehen weiter als seine Hoehenlinien. 250 m an Land loesen die Mittelgebirge
   auf, 500 m unter Wasser reichen bis auf den Schelf und lassen die Nordsee
   trotzdem drei Baender tief werden.

     17 Landbaender x 250 m  =  0 … 4250 m, darueber ein Knie (Mont Blanc 4808)
      8 Wasserbaender x 500 m = 0 … −4000 m, darunter ein Knie
     12 Eisbaender x 300 m    = 0 … 3600 m Eisoberflaeche */
const WASSER = Number(process.env.WASSER ?? 8);
const NBAND = Number(process.env.NBAND ?? 25);
const NEIS = Number(process.env.EISBAND ?? 12);
const LANDSTUFE = Number(process.env.LANDSTUFE ?? 250);
const WASSERSTUFE = Number(process.env.WASSERSTUFE ?? 500);
const EISSTUFE = Number(process.env.EISSTUFE ?? 300);

if (!existsSync(ZWISCHEN + '/meta.json')) {
  log('Keine Zwischendateien unter ' + ZWISCHEN + '/.');
  log('Erst  ./holen.sh  und dann  python3 quellen.py  laufen lassen.');
  log('Scheitert das Laden an der Netzpolitik: siehe ../QUELLEN.md.');
  process.exit(1);
}

log('Farbleitern');
const gestein = gesteinAtlas(WASSER, NBAND - WASSER);
const cvd = gesteinCvd(WASSER, NBAND - WASSER);
const eis = eisRampe(NEIS);
const mC = monoton(cvd), mE = monoton(eis);
log(`  Gestein ${gestein.length} Baender (${WASSER} unter Null), Eis ${eis.length}`);
log(`  CVD-Leiter monoton in der Helligkeit: ${mC.verletzt === 0 ? 'ja' : 'NEIN (' + mC.verletzt + ')'}`
  + `, kleinster Schritt ${mC.kleinsterSchritt.toFixed(4)}`);
log(`  Eisleiter  monoton: ${mE.verletzt === 0 ? 'ja' : 'NEIN'}`
  + `, kleinster Schritt ${mE.kleinsterSchritt.toFixed(4)}`);
if (mC.verletzt) {
  log('  ABBRUCH: die zweite Leiter ist fuer Rot-Gruen-Schwaeche da. Faellt ihre');
  log('           Helligkeit irgendwo, taugt sie dafuer nicht.');
  process.exit(1);
}

log('Nutzlast');
const { D, text, meta } = baueNutzlast(ZWISCHEN, log);
D.wasser = WASSER;
D.landstufe = LANDSTUFE;
D.wasserstufe = WASSERSTUFE;
D.eisstufe = EISSTUFE;

/* ---------- Die Notizen ----------
   Eine je Zeitabschnitt, [von ka, bis ka, Ueberschrift, Text]. Sie sind
   **Zusammenhang, keine Daten**, und das steht auch auf der Seite: was eine
   Zahl nennt, stammt aus den Kennzahlen dieses Baus (Landanteil, Eisvolumen,
   Meeresspiegel) oder aus der zitierten Literatur, der Rest ist Schulwissen.

   Die Fenster stossen aneinander, damit immer eine Notiz zu sehen ist. */
const je = Object.fromEntries(meta.je_scheibe.map(e => [e.ka, e]));
const mspBei = k => {
  const e = je[k];
  return e ? Math.round(e.meeresspiegel_m) : null;
};
const NOTIZEN = [
  [26, 23, 'Before the maximum',
    'The Eurasian ice sheet is still growing. Britain and Scandinavia carry '
    + 'separate domes; the North Sea between them is dry land. This is the '
    + 'stretch DATED-1 calls poorly constrained &#8212; far fewer dates '
    + 'record a build-up than a retreat, because advancing ice destroys what '
    + 'it overruns.'],
  [23, 20.5, 'The Last Glacial Maximum',
    'Ice reaches its greatest extent. The crust beneath the dome is pressed '
    + 'down by hundreds of metres, and the water locked up in ice drops the '
    + 'sea far enough to walk from England to Denmark.'],
  [20.5, 18, 'Doggerland',
    'The southern North Sea is a plain of rivers and marsh, not a sea. It is '
    + 'not a land bridge but a country in its own right &#8212; the largest '
    + 'single piece of ground Europe has lost.'],
  [18, 15, 'The margin starts to give',
    'The ice front pulls back from its southern limit. The uncertainty band '
    + 'narrows here: retreat leaves datable material behind, so this part of '
    + 'the reconstruction rests on far more evidence than the build-up does.'],
  [15, 13, 'Meltwater',
    'Sea level climbs fast. The Baltic basin fills and empties as the ice '
    + 'dams break and reform; the shoreline on this map is the zero line of '
    + 'the reconstruction, not a surveyed coast.'],
  [13, 11.5, 'The cold snap',
    'The Younger Dryas interrupts the warming for more than a thousand years. '
    + 'ICE-6G_C carries the readvance only faintly &#8212; it is a model '
    + 'fitted to sea level and crustal motion, not a climate simulation.'],
  [11.5, 9, 'The last domes',
    'What is left of the ice sits over the Gulf of Bothnia, the deepest part '
    + 'of the isostatic bowl. The land there is still hundreds of metres below '
    + 'where it will end up.'],
  [9, 4, 'Rebound',
    'The ice is gone, and the crust is still rising. This is the part of the '
    + 'map that keeps moving after the white is gone &#8212; Scandinavia is '
    + 'lifting out of the sea, and it has not stopped.'],
  [4, -1, 'Today',
    'The coastline matches the modern one, because the modern elevation model '
    + 'is exactly what the map is built on. Everything before this is that '
    + 'same terrain with the reconstructed difference field added.'],
];
log('Notizen');
log(`  ${NOTIZEN.length} Abschnitte, Meeresspiegel bei 26/20/15/10/0 ka: `
  + [26, 20, 15, 10, 0].map(k => mspBei(k) === null ? '?' : mspBei(k) + ' m').join(', '));

log('Seite');
const seite = baueSeite({
  D, nutzlast: text, gestein, gesteinCvd: cvd, eisrampe: eis,
  notizen: NOTIZEN, kenn: meta.kennzahlen,
});

/* ---------- Die Sperre ----------
   Das Pruefgeruest erzeugt erfundene Rohdaten in den echten Dateiformaten, um
   die Kette zu pruefen. Daraus darf **nie** eine veroeffentlichte Karte
   werden: eine Reliefkarte Europas mit ausgedachtem Eisschild unter echten
   Zitaten waere genau das, wogegen das Unsicherheitsband steht.

   quellen.py schreibt deshalb in die Zwischendateien, woher sie stammen, und
   hier wird das geprueft. Mit --geruest laesst es sich uebergehen — dann
   traegt die Seite ein Wasserzeichen, das man nicht uebersehen kann. */
const geruest = !!meta.pruefgeruest;
const erlaubt = process.argv.includes('--geruest');
if (geruest && !erlaubt) {
  log('');
  log('ABBRUCH: die Zwischendateien stammen aus dem Pruefgeruest, nicht aus den');
  log('         Quellen. Diese Seite zeigt erfundenes Gelaende und darf nicht');
  log('         veroeffentlicht werden.');
  log('         Zum Ansehen:  node build.mjs --geruest > /tmp/probe.html');
  process.exit(2);
}

let aus = seite;
if (geruest) {
  aus = aus.replace('<body>', `<body>
<div style="position:fixed;inset:0;z-index:99;pointer-events:none;
  display:grid;place-items:center">
  <div style="transform:rotate(-24deg);font:700 min(9vw,74px)/1.1 system-ui,sans-serif;
    color:rgba(255,80,60,.20);text-align:center;letter-spacing:.02em">
    TEST FIXTURE<br><span style="font-size:.42em;letter-spacing:.14em">INVENTED DATA</span>
  </div>
</div>`);
  log('');
  log('  ! Wasserzeichen gesetzt — erfundene Daten.');
}

log('');
log(`Seite ${(aus.length / 1024).toFixed(0)} kB, gzip ${(gzipSync(Buffer.from(aus)).length / 1024).toFixed(0)} kB`);
process.stdout.write(aus);
