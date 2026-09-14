// Kompakte Kodierung der Felder fuer die Seite.
//
// Grundlage ist der Zickzack-Varint der Vorlage (bevoelkerung-kreise/build/
// code.mjs), im selben 64-Zeichen-Alphabet und mit demselben Entpacker in drei
// Zeilen. Dazu kommt **eine** Erweiterung, und sie ist der ganze Unterschied:
//
//     Eine Null traegt die Zahl der Nullen hinter sich.
//
// Warum das noetig ist: die Felder dieser Karte sind Zeitableitungen. Zwischen
// zwei Zeitscheiben aendert sich die Krustenlage im halben Ausschnitt um
// keinen Meter, und die Eismaechtigkeit ausserhalb des Schildes um gar nichts.
// Roh varint-kodiert kostet jede dieser Nullen ein Zeichen — bei 48 Scheiben
// auf 246 x 360 sind das vier Millionen Zeichen fuer nichts.
//
// Der Preis ist ein zweites Zeichen fuer eine **einzelne** Null. Wo Nullen
// selten sind, ist das der schlechtere Tausch, deshalb gibt es beide Formen;
// welche genommen wird, entscheidet nutzlast.mjs nach Messung, nicht nach
// Gefuehl.

export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@_';

function schreibe(z, out) {            // z >= 0, schon zickzack
  while (z >= 32) { out.push(ALPHABET[(z & 31) | 32]); z = Math.floor(z / 32); }
  out.push(ALPHABET[z]);
}

const zickzack = n => (n < 0 ? -2 * n - 1 : 2 * n);

/** Ohne Nulllaeufe — bitgleich mit der Vorlage. */
export function packe(zahlen) {
  const out = [];
  for (const n of zahlen) schreibe(zickzack(n), out);
  return out.join('');
}

/** Mit Nulllaeufen: auf eine 0 folgt die Zahl der **weiteren** Nullen. */
export function packeL(zahlen) {
  const out = [];
  const n = zahlen.length;
  for (let i = 0; i < n; i++) {
    const v = zahlen[i];
    if (v === 0) {
      let j = i + 1;
      while (j < n && zahlen[j] === 0) j++;
      schreibe(0, out);
      schreibe(j - i - 1, out);
      i = j - 1;
    } else schreibe(zickzack(v), out);
  }
  return out.join('');
}

/** Beide messen und die kuerzere nehmen. Gibt [text, mitLauf] zurueck. */
export function packeBest(zahlen) {
  const a = packe(zahlen), b = packeL(zahlen);
  return b.length < a.length ? [b, 1] : [a, 0];
}

// Gegenstueck, wird als Text in die Seite geschrieben. Bewusst kurz gehalten:
// es steht am Anfang der Seite und wird vor allem anderen ausgefuehrt.
export const ENTPACKER = `
function entpacke(s,L){const A={};for(let i=0;i<64;i++)A["${ALPHABET}"[i]]=i;
const r=[];let z=0,p=1,n=0;for(let i=0;i<s.length;i++){const v=A[s[i]];z+=(v&31)*p;
if(v&32){p*=32;continue}
if(n){for(let k=0;k<z;k++)r.push(0);n=0}
else if(L&&z===0){r.push(0);n=1}
else r.push(z&1?-(z+1)/2:z/2);
z=0;p=1}return r}`.trim();
