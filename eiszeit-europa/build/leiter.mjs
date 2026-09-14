// Die beiden Farbleitern, gerechnet statt gegriffen.
//
// Uebernommen aus der Vorlage (bevoelkerung-kreise/build/build.mjs): je Band
// eine Helligkeit, ein Farbton und **die groesste Buntheit, die sRGB an dieser
// Stelle noch hergibt**, gesucht per Halbierung in OKLCh. Die Leiter steht
// damit nicht als Liste im Quelltext, sondern als ihre Beschreibung.
//
// Zwei Leitern, nicht eine, und das ist der einzige Punkt, an dem diese Karte
// bewusst mehr hat als die Vorlage: hier liegen zwei physisch verschiedene
// Oberflaechen uebereinander, Gestein und Eis. Eine Leiter je Material ist
// dasselbe Prinzip wie dort eine Leiter je Karte — nicht eine je Ansicht.

const svg = t => t > 0.0031308 ? 1.055 * Math.pow(t, 1 / 2.4) - 0.055 : 12.92 * t;

function oklab(L, a, b) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const q = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return [
    svg(+4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * q),
    svg(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * q),
    svg(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * q),
  ];
}
const drin = c => c.every(v => v >= -0.0005 && v <= 1.0005);
const hex = c => '#' + c.map(v =>
  Math.max(0, Math.min(255, Math.round(v * 255))).toString(16).padStart(2, '0')).join('');

/** L in 0..1, Farbton in Grad, Buntheit als Anteil der hoechsten moeglichen. */
export function ton(L, hGrad, anteil) {
  const h = hGrad * Math.PI / 180;
  let lo = 0, hi = 0.42;
  for (let i = 0; i < 40; i++) {
    const m = (lo + hi) / 2;
    if (drin(oklab(L, m * Math.cos(h), m * Math.sin(h)))) lo = m; else hi = m;
  }
  const C = lo * anteil;
  return hex(oklab(L, C * Math.cos(h), C * Math.sin(h)).map(v => Math.max(0, Math.min(1, v))));
}

/** Lineare Kette durch Stuetzstellen [anteil, L, Farbton, Buntheit]. */
function bahn(n, stuetzen) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const u = n === 1 ? 0 : i / (n - 1);
    let a = 0;
    while (a < stuetzen.length - 2 && stuetzen[a + 1][0] < u) a++;
    const p = stuetzen[a], q = stuetzen[a + 1];
    const t = q[0] > p[0] ? (u - p[0]) / (q[0] - p[0]) : 0;
    out.push(ton(p[1] + (q[1] - p[1]) * t,
                 p[2] + (q[2] - p[2]) * t,
                 p[3] + (q[3] - p[3]) * t));
  }
  return out;
}

/* ---------- Das Gestein ----------
   Die Leiter eines Schulatlas, und hier kommt sie nach Hause: in der Vorlage
   faerbte sie Bevoelkerungsdichte, hier faerbt sie Hoehe in Metern.

   Unten das Meer, tief dunkelblau bis hell am Ufer. Darueber das Land von
   Waldgruen ueber Grasgruen, Gelbgruen, Gelb und Ocker zu Orange und Rot, ganz
   oben ein fast entsaettigtes Grau als Fels und reines Weiss als Schnee.

   Die Helligkeit steigt im Wasser bis zum Ufer, faellt dort **scharf** ins
   Waldgruen, steigt wieder bis zum Gelb, faellt mit den Rot-Toenen und steigt
   in den obersten beiden ins Weiss. Das ist Konvention und nicht zu umgehen,
   wenn Gelb der hellste Farbton sein soll. */
export function gesteinAtlas(wasser, land) {
  const meer = bahn(wasser, [
    [0.00, 0.22, 258, 0.85],
    [0.60, 0.40, 250, 0.90],
    [1.00, 0.62, 242, 0.85],
  ]);
  const oben = 2;                       // Fels und Schnee
  const bunt = bahn(land - oben, [
    [0.00, 0.40, 148, 0.80],            // Waldgruen
    [0.22, 0.58, 135, 0.92],            // Grasgruen
    [0.40, 0.72, 118, 0.95],            // Gelbgruen
    [0.52, 0.84, 95, 1.00],             // Gelb
    [0.68, 0.74, 70, 0.95],             // Ocker
    [0.84, 0.64, 46, 0.92],             // Orange
    [1.00, 0.56, 30, 0.88],             // Rot
  ]);
  return [...meer, ...bunt, ton(0.86, 40, 0.06), '#ffffff'];
}

/* ---------- Das Eis ----------
   Muss sich **in der Anmutung** absetzen, nicht nur im Ton: entsaettigtes
   Blauweiss, sehr enge Buntheit, Helligkeit als einzige tragende Achse. So
   liest es sich als anderes Material und nicht als weitere Hoehenstufe.

   Der Gesteinsleiter kommt es nirgends ins Gehege: deren einziges Weiss ist
   ihr oberstes Band, und das liegt bei Alpengipfeln — unter dem
   skandinavischen Eisschild kommen die nicht vor. */
export function eisRampe(n) {
  /* Die ganze Rampe liegt **hell**. Der erste Wurf lief von 0,62 nach 0,985,
     also von dunklem Blaugrau ins Weiss — und weil sie die Eis*oberflaeche*
     faerbt, bekam ein duenner Rand auf tiefem Land den dunkelsten Ton. Das las
     sich wie grauer Kunststoff, nicht wie Eis: ein Gletscherrand ist nicht
     dunkler als seine Kuppe, er ist nur flacher.

     Jetzt traegt die Helligkeit nur noch eine Nuance (0,84 bis 0,99), und die
     Form macht das Licht. Das ist zugleich der Grund, warum die Schattierung
     in die Farbe gerechnet wird und nicht per soft-light darueberliegt: auf
     Weiss taete soft-light nichts. */
  return bahn(n, [
    [0.00, 0.840, 236, 0.075],          // Randeis, eine Spur blaeulich
    [0.45, 0.905, 232, 0.050],
    [0.80, 0.955, 228, 0.028],
    [1.00, 0.992, 225, 0.010],          // Firn
  ]);
}

/* ---------- Die zweite Leiter, fuer Rot-Gruen-Schwaeche ----------
   Uebernommen samt Begruendung: die Hoehenschichten sind Atlas-Konvention,
   aber Gruen und Rot fallen fuer Deuteranope zusammen, und die Helligkeit
   laeuft nicht mit der Hoehe — Gelb ist heller als Rot. Diese hier laeuft
   **streng** mit: Wasser dunkel nach hell, das Land von Braun nach Creme.
   Braun gegen Blau liegt auf der Achse, die eine Rot-Gruen-Schwaeche behaelt. */
export function gesteinCvd(wasser, land) {
  // Die Helligkeit laeuft **ueber beide Baender hinweg** monoton, auch ueber
  // die Kuestenkante. Beim ersten Wurf tat sie das nicht: das Wasser endete
  // heller (0,52), als das Land anfing (0,40), und genau an der einen Stelle,
  // an der die Leiter am meisten leisten muss, fiel die Helligkeit um 0,12.
  // Fuer die Atlasleiter ist dieser Sprung Absicht — dort traegt der Farbton
  // die Unterscheidung. Hier gibt es keinen Farbton, auf den Verlass ist.
  const meer = bahn(wasser, [
    [0.00, 0.16, 258, 0.55],
    [1.00, 0.37, 250, 0.42],
  ]);
  const bunt = bahn(land - 1, [
    [0.00, 0.41, 62, 0.80],
    [0.55, 0.64, 70, 0.55],
    [1.00, 0.88, 82, 0.28],
  ]);
  return [...meer, ...bunt, '#ffffff'];
}

/** Nachweis, dass eine Leiter in OKLab streng monoton in der Helligkeit ist. */
export function monoton(liste) {
  const L = liste.map(h => {
    const [r, g, b] = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
    const f = v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    const [R, G, B] = [f(r), f(g), f(b)];
    const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
    const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
    const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
    return 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
  });
  let kleinster = Infinity, verletzt = 0;
  for (let i = 1; i < L.length; i++) {
    const d = L[i] - L[i - 1];
    if (d < kleinster) kleinster = d;
    if (d <= 0) verletzt++;
  }
  return { kleinsterSchritt: kleinster, verletzt };
}
