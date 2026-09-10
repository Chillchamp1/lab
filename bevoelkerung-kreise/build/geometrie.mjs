// Geometrische Grundlagen: flaechentreue Projektion, Ringflaechen,
// Schwerpunkte und die Pruefung auf gefaltete Ringe.

const R_ERD = 6378137;

// Lambert azimutal flächentreu (ETRS89-LAEA, EPSG:3035-Parameter)
export function laea(lon, lat, lon0 = 10, lat0 = 52) {
  const rad = Math.PI / 180;
  const p = lat * rad, l = (lon - lon0) * rad, p0 = lat0 * rad;
  const k = Math.sqrt(2 / (1 + Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(l)));
  return [
    R_ERD * k * Math.cos(p) * Math.sin(l),
    R_ERD * k * (Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(l)),
  ];
}

// Signierte doppelte Fläche und Schwerpunkt eines Rings.
function ringMass(ring, X, Y) {
  let A2 = 0, cx = 0, cy = 0;
  const n = ring.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = X[ring[i]], yi = Y[ring[i]], xj = X[ring[j]], yj = Y[ring[j]];
    const f = xj * yi - xi * yj;
    A2 += f; cx += (xi + xj) * f; cy += (yi + yj) * f;
  }
  if (Math.abs(A2) < 1e-9) return { a2: 0, cx: 0, cy: 0 };
  return { a2: A2, cx: cx / (3 * A2), cy: cy / (3 * A2) };
}

export function flaecheUndZentrum(ringe, X, Y) {
  let A2 = 0, cx = 0, cy = 0;
  for (const ring of ringe) {
    const m = ringMass(ring, X, Y);
    A2 += m.a2; cx += m.cx * m.a2; cy += m.cy * m.a2;
  }
  if (Math.abs(A2) < 1e-9) return { flaeche: 0, cx: 0, cy: 0 };
  return { flaeche: Math.abs(A2 / 2), cx: cx / A2, cy: cy / A2 };
}

export function ringVorzeichen(gebiete, X, Y) {
  const v = [];
  for (const ringe of gebiete) for (const r of ringe) v.push(Math.sign(ringMass(r, X, Y).a2));
  return v;
}

export function gefalteteRinge(gebiete, X, Y, vorzeichen) {
  let kaputt = 0, gesamt = 0;
  for (const ringe of gebiete) {
    for (const r of ringe) {
      if (Math.sign(ringMass(r, X, Y).a2) !== vorzeichen[gesamt]) kaputt++;
      gesamt++;
    }
  }
  return { kaputt, gesamt };
}
