// Zickzack-Varint in einem 64-Zeichen-Alphabet. Reicht fuer Koordinaten-Deltas
// und Knotenindizes; entpackt in wenigen Zeilen im Browser.
export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@_';

export function packe(zahlen) {
  let out = '';
  for (let n of zahlen) {
    let z = n < 0 ? -2 * n - 1 : 2 * n;      // Zickzack
    while (z >= 32) { out += ALPHABET[(z & 31) | 32]; z = Math.floor(z / 32); }
    out += ALPHABET[z];
  }
  return out;
}

// Gegenstueck, wird als Text in die Seite geschrieben.
export const ENTPACKER = `
function entpacke(s){const A={};for(let i=0;i<64;i++)A["ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@_"[i]]=i;
const r=[];let z=0,p=1;for(let i=0;i<s.length;i++){const v=A[s[i]];z+=(v&31)*p;
if(v&32){p*=32;}else{r.push(z&1?-(z+1)/2:z/2);z=0;p=1;}}return r}`.trim();
