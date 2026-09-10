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

// Umkehrung der UTM-Abbildung (Transversale Mercatorprojektion) auf
// geografische Koordinaten. Die Verwaltungsgebiete des BKG kommen in
// ETRS89/UTM Zone 32N; gerechnet wird aber flächentreu, also muss der Umweg
// über Länge und Breite gehen. Reihenentwicklung nach Snyder, im Zentimeter
// genau — deutlich feiner, als die Daten selbst sind.
export function utmNachGeo(E, Nord, zone = 32, sued = false) {
  const a = 6378137.0, f = 1 / 298.257222101, k0 = 0.9996;
  const e2 = f * (2 - f), ep2 = e2 / (1 - e2);
  const lon0 = ((zone - 1) * 6 - 180 + 3) * Math.PI / 180;
  const M = (Nord - (sued ? 1e7 : 0)) / k0;
  const mu = M / (a * (1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 ** 3 / 256));
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const p1 = mu
    + (3 * e1 / 2 - 27 * e1 ** 3 / 32) * Math.sin(2 * mu)
    + (21 * e1 ** 2 / 16 - 55 * e1 ** 4 / 32) * Math.sin(4 * mu)
    + (151 * e1 ** 3 / 96) * Math.sin(6 * mu)
    + (1097 * e1 ** 4 / 512) * Math.sin(8 * mu);
  const sp = Math.sin(p1), cp = Math.cos(p1), tp = Math.tan(p1);
  const C1 = ep2 * cp * cp, T1 = tp * tp;
  const N1 = a / Math.sqrt(1 - e2 * sp * sp);
  const R1 = a * (1 - e2) / (1 - e2 * sp * sp) ** 1.5;
  const D = (E - 500000) / (N1 * k0);
  const lat = p1 - (N1 * tp / R1) * (D * D / 2
    - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * ep2) * D ** 4 / 24
    + (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * ep2 - 3 * C1 * C1) * D ** 6 / 720);
  const lon = lon0 + (D - (1 + 2 * T1 + C1) * D ** 3 / 6
    + (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * ep2 + 24 * T1 * T1) * D ** 5 / 120) / cp;
  return [lon * 180 / Math.PI, lat * 180 / Math.PI];
}
