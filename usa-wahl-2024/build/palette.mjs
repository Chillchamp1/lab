// Wahrnehmungsgleiche divergierende Skala in OKLab.
//
// Zwei Eigenschaften, die eine naive Rot-Blau-Palette nicht hat:
//
//   Gleiche Helligkeit und gleiche Buntheit an beiden Enden. Sonst wirkt eine
//   Seite kräftiger als die andere, und das Auge zählt Fläche falsch. Reines
//   Rot und reines Blau trennen in OKLab 0,18 Helligkeitspunkte — Rot wirkt
//   dadurch heller und näher.
//
//   Neutrale Mitte. Ein Gebiet bei 50 zu 50 ist grau, nicht kräftig violett.
//   Nur so entspricht die Menge an Farbe dem Vorsprung, und auf einem
//   Bevölkerungskartogramm entspricht die Summe der Farbe dem Stimmenanteil.

import { hexZuOklab, oklabZuHex, chroma, winkel } from './oklab.mjs';

// Grösste Buntheit, die bei dieser Helligkeit und diesem Farbwinkel noch
// in sRGB darstellbar ist.
export function maxChroma(L, hueGrad, schritt = 0.002) {
  const rad = hueGrad * Math.PI / 180;
  let c = 0;
  for (let probe = schritt; probe < 0.45; probe += schritt) {
    const hex = oklabZuHex({ L, a: Math.cos(rad) * probe, b: Math.sin(rad) * probe });
    const zurueck = hexZuOklab(hex);
    // Ausserhalb des Farbraums wird geklemmt; dann weicht die Rückrechnung ab.
    if (Math.abs(zurueck.L - L) > 0.006 || Math.abs(chroma(zurueck) - probe) > 0.006) break;
    c = probe;
  }
  return c;
}

export function baueSkala({ L = 0.58, hueRot = 29, hueBlau = 254, reserve = 0.94 } = {}) {
  const C = Math.min(maxChroma(L, hueRot), maxChroma(L, hueBlau)) * reserve;
  const rot = hueRot * Math.PI / 180, blau = hueBlau * Math.PI / 180;
  // s von -1 (ganz blau) über 0 (neutral) bis +1 (ganz rot)
  const farbe = s => {
    const t = Math.max(-1, Math.min(1, s));
    const w = t >= 0 ? rot : blau;
    const c = Math.abs(t) * C;
    return oklabZuHex({ L, a: Math.cos(w) * c, b: Math.sin(w) * c });
  };
  return { farbe, L, C, hueRot, hueBlau, endeRot: farbe(1), endeBlau: farbe(-1), mitte: farbe(0) };
}
