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

// Gall-Peters: x = λ·cos45°, y = sinφ/cos45°. Auf Äquatorlänge 2π normiert
// (mal 1/cos45°) bleibt davon x = λ, y = 2·sinφ.
const peters = (lam, phi) => [lam, 2 * Math.sin(phi)];

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

// Robinson 1963, Stützstellen alle 5°, linear dazwischen.
const R_X = [1.0000, 0.9986, 0.9954, 0.9900, 0.9822, 0.9730, 0.9600, 0.9427, 0.9216,
             0.8962, 0.8679, 0.8350, 0.7986, 0.7597, 0.7186, 0.6732, 0.6213, 0.5722, 0.5322];
const R_Y = [0.0000, 0.0620, 0.1240, 0.1860, 0.2480, 0.3100, 0.3720, 0.4340, 0.4958,
             0.5571, 0.6176, 0.6769, 0.7346, 0.7903, 0.8435, 0.8936, 0.9394, 0.9761, 1.0000];
const S_ROB = 1 / 0.8487;                    // auf Äquatorlänge 2π
const robinson = (lam, phi) => {
  const a = Math.abs(phi) / GRAD / 5;
  const i = Math.min(17, Math.floor(a)), f = a - i;
  const x = R_X[i] + (R_X[i + 1] - R_X[i]) * f;
  const y = R_Y[i] + (R_Y[i + 1] - R_Y[i]) * f;
  return [0.8487 * lam * x * S_ROB, Math.sign(phi) * 1.3523 * y * S_ROB];
};

// Flächentreue Referenz für die Kennzahlen: Lambert zylindrisch, Normalparallel
// am Äquator. Gleicher Äquatormassstab wie Mercator, Gesamtfläche 4π wie die
// Einheitskugel — der Vergleich Mercator/Lambert ist damit direkt der Faktor,
// um den ein Land zu gross erscheint.
export const lambert = (lam, phi) => [lam, Math.sin(phi)];

export const NETZE = [
  { id: 'mercator', name: 'Mercator', jahr: 1569, art: 'winkeltreu', punkt: mercator },
  { id: 'peters', name: 'Gall-Peters', jahr: 1855, art: 'flächentreu', punkt: peters },
  { id: 'equalearth', name: 'Equal Earth', jahr: 2018, art: 'flächentreu', punkt: equalEarth },
  { id: 'robinson', name: 'Robinson', jahr: 1963, art: 'Kompromiss', punkt: robinson },
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
