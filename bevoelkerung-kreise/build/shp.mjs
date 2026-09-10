import { readFileSync } from 'node:fs';

export function leseDbf(pfad) {
  const buf = readFileSync(pfad);
  const n = buf.readInt32LE(4), headLen = buf.readInt16LE(8), recLen = buf.readInt16LE(10);
  const felder = [];
  for (let o = 32; buf[o] !== 0x0d && o < headLen; o += 32)
    felder.push({ name: buf.toString('latin1', o, o + 11).replace(/\0.*$/, ''), laenge: buf[o + 16] });
  const zeilen = [];
  for (let r = 0; r < n; r++) {
    let o = headLen + r * recLen + 1;
    const z = {};
    for (const f of felder) { z[f.name] = buf.toString('utf8', o, o + f.laenge).trim(); o += f.laenge; }
    zeilen.push(z);
  }
  return zeilen;
}

// Liest Polygon-Shapes (Typ 5). Gibt je Shape ein Array von Ringen zurück,
// jeder Ring ein flaches [x0,y0,x1,y1,...].
export function leseShp(pfad) {
  const buf = readFileSync(pfad);
  const gesamt = buf.readInt32BE(24) * 2; // Dateilänge in Bytes
  const shapes = [];
  let o = 100;
  while (o < gesamt) {
    const laenge = buf.readInt32BE(o + 4) * 2;
    const c = o + 8;
    const typ = buf.readInt32LE(c);
    if (typ === 5) {
      const numParts = buf.readInt32LE(c + 36);
      const numPoints = buf.readInt32LE(c + 40);
      const partsAb = c + 44;
      const punkteAb = partsAb + numParts * 4;
      const grenzen = [];
      for (let i = 0; i < numParts; i++) grenzen.push(buf.readInt32LE(partsAb + i * 4));
      grenzen.push(numPoints);
      const ringe = [];
      for (let i = 0; i < numParts; i++) {
        const von = grenzen[i], bis = grenzen[i + 1];
        const ring = new Float64Array((bis - von) * 2);
        for (let p = von, k = 0; p < bis; p++) {
          ring[k++] = buf.readDoubleLE(punkteAb + p * 16);
          ring[k++] = buf.readDoubleLE(punkteAb + p * 16 + 8);
        }
        ringe.push(ring);
      }
      shapes.push(ringe);
    } else {
      shapes.push([]);
    }
    o = c + laenge;
  }
  return shapes;
}

