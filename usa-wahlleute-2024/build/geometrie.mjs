// Geometrische Grundlagen: flächentreue Projektion, Ringflächen,
// Schwerpunkte und die Prüfung auf gefaltete Ringe.

const R_ERD = 6378137;

// Albers flächentreuer Kegelentwurf, Parameter wie EPSG:5070 (Festland-USA).
// Für ein flächentreues Kartogramm muss die Ausgangsprojektion flächentreu
// sein, sonst verfälscht schon sie die Bezugsflächen.
export function albers(lon, lat, { lon0 = -96, lat0 = 23, lat1 = 29.5, lat2 = 45.5 } = {}) {
  const rad = Math.PI / 180;
  const p1 = lat1 * rad, p2 = lat2 * rad, p0 = lat0 * rad;
  const n = (Math.sin(p1) + Math.sin(p2)) / 2;
  const C = Math.cos(p1) * Math.cos(p1) + 2 * n * Math.sin(p1);
  const rho = Math.sqrt(C - 2 * n * Math.sin(lat * rad)) / n;
  const rho0 = Math.sqrt(C - 2 * n * Math.sin(p0)) / n;
  const theta = n * ((lon - lon0) * rad);
  return [R_ERD * rho * Math.sin(theta), R_ERD * (rho0 - rho * Math.cos(theta))];
}

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
