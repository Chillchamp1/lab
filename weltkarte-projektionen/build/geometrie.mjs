// Die vier Netze, die Flächenrechnung auf der Kugel und die Kennzahlen daraus.

export const GRAD = Math.PI / 180;
export const ERDRADIUS = 6371.0088;          // km, mittlerer Radius (IUGG)

// Über 83° wächst der Flächenmassstab von Mercator ins Groteske (sec²83 = 67,
// sec²85 = 132). Die klassische Wandkarte kappt irgendwo hier, wir auch.
export const KAPPUNG = 83 * GRAD;

// Alle Netze sind so normiert, dass der Äquator überall gleich lang ist (2π).
// Nur dann heisst die Überblendung „gleiche Karte, anderes Netz" — sonst
// mischte sich eine blosse Grössenänderung in die Aussage.

const mercator = (lam, phi) => {
  const p = Math.max(-KAPPUNG, Math.min(KAPPUNG, phi));
  return [lam, Math.log(Math.tan(Math.PI / 4 + p / 2))];
};

// Equal Earth, Šavrič/Patterson/Jenny 2018.
const A1 = 1.340264, A2 = -0.081106, A3 = 0.000893, A4 = 0.003796;
const equalEarthRoh = (lam, phi) => {
  const th = Math.asin(Math.sqrt(3) / 2 * Math.sin(phi));
  const t2 = th * th, t6 = t2 * t2 * t2, t8 = t6 * t2;
  return [
    2 * Math.sqrt(3) * lam * Math.cos(th) / (3 * (9 * A4 * t8 + 7 * A3 * t6 + 3 * A2 * t2 + A1)),
    A4 * t8 * th + A3 * t6 * th + A2 * t2 * th + A1 * th,
  ];
};
const S_EE = Math.PI / equalEarthRoh(Math.PI, 0)[0];
const equalEarth = (lam, phi) => {
  const [x, y] = equalEarthRoh(lam, phi);
  return [x * S_EE, y * S_EE];
};

// Flächentreue Referenz für die Kennzahlen: Lambert zylindrisch, Normalparallel
// am Äquator. Gleicher Äquatormassstab wie Mercator, Gesamtfläche 4π wie die
// Einheitskugel — der Vergleich Mercator/Lambert ist damit direkt der Faktor,
// um den ein Land zu gross erscheint.
export const lambert = (lam, phi) => [lam, Math.sin(phi)];

// Nur zwei ebene Netze: das, gegen das sich die Resolution richtet, und das,
// das sie nennt. Der dritte Zustand ist der Globus, und der entsteht nicht
// hier, sondern im Browser — er hängt an der Drehung.
export const NETZE = [
  { id: 'mercator', name: 'Mercator', jahr: 1569, art: 'winkeltreu', punkt: mercator },
  { id: 'equalearth', name: 'Equal Earth', jahr: 2018, art: 'flächentreu', punkt: equalEarth },
];

// Fläche eines geschlossenen Rings auf der Kugel, km². Linienintegral über die
// Kanten; der Betrag macht die Umlaufrichtung egal.
export function kugelflaeche(ring) {
  let s = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const l1 = ring[j][0] * GRAD, l2 = ring[i][0] * GRAD;
    const p1 = ring[j][1] * GRAD, p2 = ring[i][1] * GRAD;
    s += (l2 - l1) * (2 + Math.sin(p1) + Math.sin(p2));
  }
  return Math.abs(s * ERDRADIUS * ERDRADIUS / 2);
}

// Fläche eines Rings, nachdem er durch ein Netz gegangen ist (Gausssche
// Trapezformel in der Ebene).
export function ebeneFlaeche(ring, netz) {
  let s = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [x1, y1] = netz(ring[j][0] * GRAD, ring[j][1] * GRAD);
    const [x2, y2] = netz(ring[i][0] * GRAD, ring[i][1] * GRAD);
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s / 2);
}

// Ringe eines Features, Aussenring zuerst, Löcher mit Vorzeichen -1.
export function ringe(geometrie) {
  if (!geometrie) return [];
  const polys = geometrie.type === 'Polygon' ? [geometrie.coordinates] : geometrie.coordinates;
  return polys.flatMap(poly => poly.map((ring, i) => ({ ring, zeichen: i === 0 ? 1 : -1 })));
}
