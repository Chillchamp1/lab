// Diffusionskartogramm nach Gastner und Newman (2004).
//
// Die Idee: die Bevölkerungsdichte wird als Wärme aufgefasst und fliesst
// auseinander, bis sie überall gleich ist. Jeder Punkt der Karte schwimmt mit
// der Strömung mit. Weil das Feld glatt ist und alle Punkte derselben Strömung
// folgen, bleiben lokale Formen erhalten — anders als bei Kraftverfahren, die
// jedes Gebiet einzeln um seinen Schwerpunkt aufblasen.
//
// Die Wärmeleitungsgleichung wird nicht per Fourier gelöst, sondern über ihre
// analytische Lösung: das Feld zur Zeit t ist das Ausgangsfeld, gefaltet mit
// einer Gaussglocke der Breite sigma = sqrt(2t). Gaussglättung lässt sich mit
// drei Kastenfiltern je Achse in linearer Zeit annähern, und weil zwei
// Glättungen sich zu sqrt(s1^2 + s2^2) addieren, kann in einem Feld
// fortlaufend weitergeglättet werden.
//
// Geschwindigkeit ist v = -grad(rho)/rho. Mit t = sigma^2/2 ist dt = sigma dsigma,
// also dx/dsigma = v * sigma — gerechnet wird deshalb in sigma, nicht in t.

// Kastenfilter mit gespiegeltem Rand, waagerecht.
function kastenX(q, ziel, breite, hoehe, r) {
  const f = 1 / (2 * r + 1);
  for (let y = 0; y < hoehe; y++) {
    const z = y * breite;
    let summe = q[z] * (r + 1);
    for (let i = 0; i < r; i++) summe += q[z + Math.min(i, breite - 1)];
    for (let x = 0; x < breite; x++) {
      summe += q[z + Math.min(x + r, breite - 1)] - q[z + Math.max(x - r - 1, 0)];
      ziel[z + x] = summe * f;
    }
  }
}

// Kastenfilter mit gespiegeltem Rand, senkrecht.
function kastenY(q, ziel, breite, hoehe, r) {
  const f = 1 / (2 * r + 1);
  for (let x = 0; x < breite; x++) {
    let summe = q[x] * (r + 1);
    for (let i = 0; i < r; i++) summe += q[Math.min(i, hoehe - 1) * breite + x];
    for (let y = 0; y < hoehe; y++) {
      summe += q[Math.min(y + r, hoehe - 1) * breite + x] - q[Math.max(y - r - 1, 0) * breite + x];
      ziel[y * breite + x] = summe * f;
    }
  }
}

// Näherung einer Gaussglättung der Breite sigma durch drei Kastenfilter.
// Drei Kastendurchgänge ergeben die Varianz r(r+1); daraus folgt der Radius.
function glaette(feld, hilfe, breite, hoehe, r) {
  for (let d = 0; d < 3; d++) {
    kastenX(feld, hilfe, breite, hoehe, r);
    kastenY(hilfe, feld, breite, hoehe, r);
  }
}

export function diffusionsKartogramm(dichte0, breite, hoehe, PX, PY, {
  sigmaEnde = null,
  wachstum = 1.03,
  unterschritte = 1,
  log = () => {},
} = {}) {
  const N = breite * hoehe;
  const rho = Float64Array.from(dichte0);
  const hilfe = new Float64Array(N);
  const vx = new Float64Array(N), vy = new Float64Array(N);

  const sEnde = sigmaEnde ?? Math.max(breite, hoehe) * 1.4;
  let sigma = 0;
  let schritte = 0;

  // Startglättung: bei sigma = 0 ist das Feld an den Gebietsgrenzen unstetig
  // und die Geschwindigkeit dort unendlich. Ein Schritt von einer Zelle Breite
  // nimmt die Spitzen heraus, ohne die Verteilung zu verschieben.
  glaette(rho, hilfe, breite, hoehe, 1);
  sigma = Math.sqrt(2);   // r = 1 traegt die Varianz r(r+1) = 2 bei

  while (sigma < sEnde) {
    // Gewuenschtes naechstes sigma, daraus der noetige Kastenradius.
    // Drei Durchgaenge mit Radius r tragen die Varianz r(r+1) bei; sigma wird
    // anschliessend aus dem tatsaechlich benutzten r zurueckgerechnet, damit
    // Buchfuehrung und Feld nicht auseinanderlaufen.
    const wunsch = Math.min(sEnde, sigma * wachstum + 0.5);
    const noetig = Math.max(2, wunsch * wunsch - sigma * sigma);
    const r = Math.max(1, Math.round((Math.sqrt(1 + 4 * noetig) - 1) / 2));
    const sNeu = Math.sqrt(sigma * sigma + r * (r + 1));
    const dSigma = sNeu - sigma;

    // Geschwindigkeitsfeld v = -grad(rho)/rho aus dem aktuellen Zustand
    for (let y = 0; y < hoehe; y++) {
      const z = y * breite;
      const zo = (y > 0 ? y - 1 : 0) * breite;
      const zu = (y < hoehe - 1 ? y + 1 : hoehe - 1) * breite;
      for (let x = 0; x < breite; x++) {
        const li = z + (x > 0 ? x - 1 : 0), re = z + (x < breite - 1 ? x + 1 : breite - 1);
        const d = rho[z + x];
        if (d <= 0) { vx[z + x] = 0; vy[z + x] = 0; continue; }
        vx[z + x] = -(rho[re] - rho[li]) * 0.5 / d;
        vy[z + x] = -(rho[zu + x] - rho[zo + x]) * 0.5 / d;
      }
    }

    // Punkte mitschwimmen lassen: dx = v * sigma * dSigma.
    // Bei starken Dichtesprüngen ist ein einziger Schritt zu grob; das Feld
    // steht während der Teilschritte still, nur die Punkte laufen weiter.
    const teil = Math.max(1, unterschritte | 0);
    const faktor = sigma * dSigma / teil;
    for (let u = 0; u < teil; u++)
    for (let p = 0; p < PX.length; p++) {
      let gx = PX[p], gy = PY[p];
      const ix = Math.min(breite - 2, Math.max(0, Math.floor(gx)));
      const iy = Math.min(hoehe - 2, Math.max(0, Math.floor(gy)));
      const fx = Math.min(1, Math.max(0, gx - ix)), fy = Math.min(1, Math.max(0, gy - iy));
      const i00 = iy * breite + ix, i10 = i00 + 1, i01 = i00 + breite, i11 = i01 + 1;
      const w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy), w01 = (1 - fx) * fy, w11 = fx * fy;
      const ux = vx[i00] * w00 + vx[i10] * w10 + vx[i01] * w01 + vx[i11] * w11;
      const uy = vy[i00] * w00 + vy[i10] * w10 + vy[i01] * w01 + vy[i11] * w11;
      PX[p] = gx + ux * faktor;
      PY[p] = gy + uy * faktor;
    }

    // Feld mit genau dem Radius weiterglätten, aus dem sNeu berechnet wurde
    glaette(rho, hilfe, breite, hoehe, r);

    sigma = sNeu;
    schritte++;
    if (schritte % 40 === 0) log(`  sigma ${sigma.toFixed(0)} von ${sEnde.toFixed(0)} (${schritte} Schritte)`);
  }

  // Restliche Ungleichverteilung als Mass für die Vollständigkeit
  let min = Infinity, max = -Infinity, summe = 0;
  for (let i = 0; i < N; i++) { if (rho[i] < min) min = rho[i]; if (rho[i] > max) max = rho[i]; summe += rho[i]; }
  log(`  ${schritte} Schritte, Restschwankung der Dichte ${((max / min - 1) * 100).toFixed(2)}%`);
  return { schritte, restschwankung: max / min - 1 };
}
