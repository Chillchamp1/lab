/* Flachkanal DN 75 – Geometrie ohne DOM. Läuft im Browser und in Node.
 *
 * Koordinaten im Einbau: x entlang der Wand (Mitte = 0), y von der Wand weg
 * (Wand = 0), z nach oben (Tischoberkante = 0). Alle Maße in mm.
 */
const Core = (() => {
  const PIPE_OD = 75;      // HT-Rohr DN 75: Außendurchmesser
  const PIPE_ID = 71.2;    // Wandstärke 1,9 mm
  const N = 240;           // Punkte je Querschnitt
  const LOFT_STEPS = 48;

  const lerp = (a, b, t) => a + (b - a) * t;

  /* Abgerundetes Rechteck, gleichmäßig nach Bogenlänge abgetastet, gegen den
   * Uhrzeigersinn ab der Mitte der rechten Seite. Ein Kreis ist der Sonderfall
   * hx = hy = rc. Weil alle Querschnitte gleich abgetastet werden, passen die
   * Punkte zweier Ringe zueinander. */
  function rrect(hx, hy, rc, cy, cx = 0) {
    rc = Math.min(rc, hx, hy);
    const sx = hx - rc, sy = hy - rc, q = Math.PI * rc / 2, h = Math.PI / 2;
    const arc = (cx, cyy, a0) => t => [cx + rc * Math.cos(a0 + t * h), cyy + rc * Math.sin(a0 + t * h)];
    const segs = [
      [sy, t => [hx, t * sy]],
      [q, arc(sx, sy, 0)],
      [2 * sx, t => [sx - 2 * sx * t, hy]],
      [q, arc(-sx, sy, h)],
      [2 * sy, t => [-hx, sy - 2 * sy * t]],
      [q, arc(-sx, -sy, 2 * h)],
      [2 * sx, t => [-sx + 2 * sx * t, -hy]],
      [q, arc(sx, -sy, 3 * h)],
      [sy, t => [hx, -sy + t * sy]],
    ];
    let P = 0; for (const s of segs) P += s[0];
    const pts = new Float64Array(N * 2);
    let si = 0, acc = 0;
    for (let i = 0; i < N; i++) {
      const s = P * i / N;
      while (si < segs.length - 1 && s > acc + segs[si][0] + 1e-12) { acc += segs[si][0]; si++; }
      const L = segs[si][0], t = L > 0 ? Math.min(1, Math.max(0, (s - acc) / L)) : 0;
      const [x, y] = segs[si][1](t);
      pts[2 * i] = x + cx; pts[2 * i + 1] = y + cy;
    }
    return pts;
  }

  // Querschnitt als [hx, hy, rc, cy]; nach innen versetzt um d
  const inset = (pr, d, rcMin = 0.3) => [pr[0] - d, pr[1] - d, Math.max(pr[2] - d, rcMin), pr[3], pr[4] || 0];

  /* Rohr aus Ringen: jeder Ring hat Außen- und Innenquerschnitt auf einer
   * Höhe. Zwei Ringe auf gleicher Höhe ergeben eine waagrechte Stufe. */
  function tube(rings) {
    const P = rings.map(r => ({ z: r.z, o: rrect(...r.o), i: rrect(...r.i) }));
    const tris = [];
    const same = (a, b) => { for (let k = 0; k < a.length; k++) if (Math.abs(a[k] - b[k]) > 1e-9) return false; return true; };
    const V = (pts, k, z) => [pts[2 * k], pts[2 * k + 1], z];
    const quad = (a, b, c, d) => tris.push(a, b, c, a, c, d);
    for (let r = 0; r < P.length - 1; r++) {
      const A = P[r], B = P[r + 1];
      for (const side of ['o', 'i']) {
        if (Math.abs(A.z - B.z) < 1e-9 && same(A[side], B[side])) continue;
        for (let k = 0; k < N; k++) {
          const k1 = (k + 1) % N;
          const a = V(A[side], k, A.z), b = V(A[side], k1, A.z), c = V(B[side], k1, B.z), d = V(B[side], k, B.z);
          if (side === 'o') quad(a, b, c, d); else quad(a, d, c, b);
        }
      }
    }
    const bot = P[0], top = P[P.length - 1];
    for (let k = 0; k < N; k++) {
      const k1 = (k + 1) % N;
      quad(V(bot.o, k, bot.z), V(bot.i, k, bot.z), V(bot.i, k1, bot.z), V(bot.o, k1, bot.z));
      quad(V(top.o, k, top.z), V(top.o, k1, top.z), V(top.i, k1, top.z), V(top.i, k, top.z));
    }
    return flatten(tris);
  }

  const flatten = tris => { const f = new Float32Array(tris.length * 3); tris.forEach((v, i) => f.set(v, i * 3)); return f; };

  /* Ohrenschneiden für ein einfaches Polygon (CCW), gibt Indexdreiecke. */
  function earclip(poly) {
    const idx = poly.map((_, i) => i), out = [];
    const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const inside = (p, a, b, c) => cross(a, b, p) > 1e-12 && cross(b, c, p) > 1e-12 && cross(c, a, p) > 1e-12;
    let guard = 0;
    while (idx.length > 3 && guard++ < 1000) {
      for (let i = 0; i < idx.length; i++) {
        const ia = idx[(i + idx.length - 1) % idx.length], ib = idx[i], ic = idx[(i + 1) % idx.length];
        const a = poly[ia], b = poly[ib], c = poly[ic];
        if (cross(a, b, c) <= 1e-12) continue;
        if (idx.some(j => j !== ia && j !== ib && j !== ic && inside(poly[j], a, b, c))) continue;
        out.push([ia, ib, ic]); idx.splice(i, 1); break;
      }
    }
    out.push(idx);
    return out;
  }

  /* Hohler Kasten: Außenpolygon Po und Hohlraum Q in der y-z-Ebene, entlang
   * x ausgezogen (außen ±hx, innen ±hi). openings: Paare [Kante von Po, Kante
   * von Q], die auf derselben Linie liegen – dort ist der Kasten offen. */
  function box(Po, Q, openings, hx, hi, cx = 0) {
    const tris = [];
    const P3 = (p, x) => [x + cx, p[0], p[1]];
    const tri = (a, b, c, n) => {
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      const cr = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      if (cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2] < 0) tris.push(a, c, b); else tris.push(a, b, c);
    };
    const quad = (a, b, c, d, n) => { tri(a, b, c, n); tri(a, c, d, n); };
    for (const [poly, x, nx] of [[Po, hx, 1], [Po, -hx, -1], [Q, hi, -1], [Q, -hi, 1]])
      for (const [i, j, k] of earclip(poly)) tri(P3(poly[i], x), P3(poly[j], x), P3(poly[k], x), [nx, 0, 0]);
    const openPo = new Set(openings.map(o => o[0])), openQ = new Set(openings.map(o => o[1]));
    const walls = (poly, h, sign, open) => poly.forEach((a, i) => {
      if (open.has(i)) return;
      const b = poly[(i + 1) % poly.length], dy = b[0] - a[0], dz = b[1] - a[1];
      const n = [0, sign * dz, -sign * dy];
      quad(P3(a, -h), P3(b, -h), P3(b, h), P3(a, h), n);
    });
    walls(Po, hx, 1, openPo);
    walls(Q, hi, -1, openQ);
    for (const [eo, eq] of openings) {
      const A = Po[eo], B = Po[(eo + 1) % Po.length];
      let C = Q[eq], D = Q[(eq + 1) % Q.length];
      if (Math.hypot(C[0] - A[0], C[1] - A[1]) > Math.hypot(D[0] - A[0], D[1] - A[1])) [C, D] = [D, C];
      const n = [0, B[1] - A[1], -(B[0] - A[0])];
      quad(P3(A, -hx), P3(B, -hx), P3(D, -hi), P3(C, -hi), n);
      quad(P3(B, -hx), P3(B, hx), P3(D, hi), P3(D, -hi), n);
      quad(P3(B, hx), P3(A, hx), P3(C, hi), P3(D, hi), n);
      quad(P3(A, hx), P3(A, -hx), P3(C, -hi), P3(C, hi), n);
    }
    return flatten(tris);
  }

  /* ---------- Teile ---------- */

  function defaults() {
    return {
      depth: 25,        // Kanaldicke außen (Spalt hinter dem Tisch minus etwas Luft)
      widthMode: 'rohr',// 'rohr' = gleicher Querschnitt wie das Rohr, 'loch' = so breit wie das Loch, 'eigen'
      width: 150,       // Kanalbreite außen bei 'eigen'
      desk: 40,         // Tischplatte samt Zarge, so weit muss es unter der Oberkante flach sein
      holeZ: 600,       // Tischoberkante → Unterkante Loch
      holeW: 70, holeH: 40,
      encGap: 27,       // Wand ↔ Außenseite Gehäuserückwand
      insert: 5,        // so weit reicht der Stutzen von außen ins Loch – am besten nur die Wandstärke
      end: 'muffe',     // 'muffe' (über das Rohrende) | 'spitz' (in eine HT-Muffe)
      t: 2.4,           // Wandstärke
      clr: 0.3,         // Spiel in der Steckverbindung
      bed: 270,         // Bauraum (Snapmaker U1: 270 × 270 × 270)
      collar: 40,       // Länge des runden Anschlusses
    };
  }

  function plan(inp) {
    const p = { ...defaults(), ...inp };
    const warn = [], t = p.t, c = p.clr;
    const D = p.depth;
    const Ws0 = p.holeW - 1;                         // Stutzen: 1 mm kleiner als das Loch
    const pipeArea = Math.PI * (PIPE_ID / 2) ** 2;
    const Wrohr = Math.ceil(pipeArea / Math.max(1, D - 2 * t) + 2 * t);
    let W = p.widthMode === 'loch' ? Ws0 : p.widthMode === 'eigen' ? p.width : Wrohr;
    W = Math.max(W, 2 * t + 10);
    const Ws = Math.min(Ws0, W);
    const hx = W / 2, hy = D / 2, rcf = Math.min(2, hy, hx);
    if (D - 2 * t < 8) warn.push(`Der Kanal ist zu dünn: innen blieben nur ${(D - 2 * t).toFixed(1)} mm.`);
    if (W > p.bed - 8) warn.push(`Der Kanal ist ${Math.round(W)} mm breit; liegend gedruckt ist das höher als der Bauraum.`);
    if (p.holeH - 1 - 2 * t < 8) warn.push('Das Loch ist zu niedrig für Stutzen samt Wänden.');
    if (p.encGap < D) warn.push(`Die Gehäuserückwand steht näher an der Wand (${p.encGap} mm) als der Kanal tief ist (${D} mm).`);

    const OUT = [hx, hy, rcf, hy];
    const REG = inset(OUT, t);
    const dS = (t - c) / 2, dT = (t + c) / 2;   // Muffe innen / Zunge außen
    const SOCK = inset(OUT, dS), TONG = inset(OUT, dT);
    const Lt = 15, sock = Lt + 0.5, ch = t - dS; // Zungenlänge, Muffentiefe, 45°-Fase

    /* Unterteil: rund → flach, stehend gedruckt, runder Anschluss unten */
    const R0 = PIPE_ID / 2 + t;
    let Rmax, ringsRound, z0;
    const circ = (R, cy) => [R, R, R, cy];
    if (p.end === 'muffe') {
      const Ri = (PIPE_OD + 0.8) / 2, Ro = Ri + t;
      Rmax = Ro;
      z0 = p.collar + (Ri - (R0 - t));
      ringsRound = [
        { z: 0, o: circ(Ro, Rmax), i: circ(Ri, Rmax) },
        { z: p.collar, o: circ(Ro, Rmax), i: circ(Ri, Rmax) },
        { z: z0, o: circ(Ro, Rmax), i: circ(R0 - t, Rmax) },
        { z: z0, o: circ(R0, Rmax), i: circ(R0 - t, Rmax) },
      ];
    } else {
      const Ro = (PIPE_OD - 0.6) / 2, Ri = Ro - t;
      Rmax = Math.max(Ro, R0);
      z0 = p.collar + Math.max(0.5, R0 - Ro);
      ringsRound = [
        { z: 0, o: circ(Ro - 1, Rmax), i: circ(Ri, Rmax) },
        { z: 1, o: circ(Ro, Rmax), i: circ(Ri, Rmax) },
        { z: p.collar, o: circ(Ro, Rmax), i: circ(Ri, Rmax) },
        { z: z0, o: circ(R0, Rmax), i: circ(R0 - t, Rmax) },
      ];
    }
    const loftRings = H => {
      const out = [];
      for (let j = 1; j <= LOFT_STEPS; j++) {
        const s = j / LOFT_STEPS, e = s * s * (3 - 2 * s);
        const ex = lerp(R0, hx, e), ey = lerp(R0, hy, e), rc = lerp(R0, rcf, e);
        const cy = (Rmax - R0) * (1 - e) + ey;
        const o = [ex, ey, rc, cy];
        out.push({ z: z0 + s * H, o, i: inset(o, t) });
      }
      return out;
    };
    // Übergangslänge: so lang, dass keine Wand flacher als 45° überhängt
    let H = 40, overhang = 90;
    for (; H < 400; H += 5) {
      overhang = maxOverhang(tube([ringsRound[ringsRound.length - 1], ...loftRings(H)]));
      if (overhang <= 42) break;
    }

    /* Aufteilung der flachen Strecke */
    const S = p.bed - 8, diag = S * Math.SQRT2;
    const flat0 = -(p.desk + 10);                     // hier muss der Kanal spätestens flach sein
    const zt = p.holeZ + p.holeH - 0.5, hb = p.holeZ + 0.5;
    const total = zt - flat0;
    const ye = p.encGap + p.insert;
    const untenFixed = z0 + H + Lt;
    const fuMax = S - untenFixed;
    const LmMax = diag - D;                           // liegend, notfalls diagonal
    const LoMax = diag - ye;
    // Oberteil: nach der Muffe verjüngt es sich einseitig auf Lochbreite. Die
    // Bettseite (x = −W/2) bleibt gerade, die obere Wand fällt mit gut 49° ab.
    const taper = W - Ws > 0.5;
    const zT0 = sock + ch + 3, Lta = taper ? 0.85 * (W - Ws) : 0;
    const zb = taper ? zT0 + Lta + 3 : sock + ch;      // ab hier ist das Oberteil ein Kasten
    const cxN = -W / 2 + Ws / 2;
    const NOUT = [Ws / 2, hy, Math.min(rcf, Ws / 2), hy, cxN], NREG = inset(NOUT, t);
    const LoMin = zb + 10 + (zt - hb);
    if (fuMax < 10) warn.push('Der Bauraum ist zu niedrig für das Unterteil.');
    let n = 0;
    while (n < 20 && fuMax + n * LmMax + LoMax < total) n++;
    let fu, Lm = 0, Lo;
    const R = total - fuMax;
    if (R < LoMin) { fu = Math.max(10, total - LoMin); Lo = total - fu; }
    else {
      fu = fuMax;
      const k = R / (n * LmMax + LoMax);
      Lo = Math.max(LoMin, k * LoMax);
      Lm = n ? (R - Lo) / n : 0;
      if (!n) Lo = R;
    }
    if (Lo < LoMin - 1e-6) warn.push('Das Loch sitzt zu tief über dem Tisch für Bogen und Steckverbindung.');

    const parts = [];
    // Unterteil
    const untenRings = [
      ...ringsRound, ...loftRings(H),
      { z: z0 + H + fu, o: OUT, i: REG },
      { z: z0 + H + fu, o: TONG, i: REG },
      { z: z0 + H + fu + Lt, o: TONG, i: REG },
    ];
    const untenZ = flat0 - z0 - H;
    parts.push({
      id: 'unten', name: 'Unterteil', file: 'flachkanal-1-unterteil.stl',
      what: `${p.end === 'muffe' ? 'Muffe über das DN-75-Rohr' : 'Spitzende in eine DN-75-Muffe'} → Übergang auf flach`,
      local: tube(untenRings), at: untenZ, lying: false,
    });
    // Zwischenstücke: liegend gedruckt, darum an beiden Enden Muffen – eine
    // Zunge würde dort frei über dem Bett hängen. Verbunden wird mit einem
    // stehend gedruckten Steckverbinder.
    let zc = flat0 + fu;
    for (let i = 0; i < n; i++) {
      parts.push({
        id: 'mitte' + i, name: n > 1 ? `Zwischenstück ${i + 1}` : 'Zwischenstück',
        file: `flachkanal-${2 + i}-zwischenstueck.stl`, what: 'gerader Flachkanal, Muffen an beiden Enden',
        local: tube([
          { z: 0, o: OUT, i: SOCK }, { z: sock, o: OUT, i: SOCK }, { z: sock + ch, o: OUT, i: REG },
          { z: Lm - sock - ch, o: OUT, i: REG }, { z: Lm - sock, o: OUT, i: SOCK }, { z: Lm, o: OUT, i: SOCK },
        ]),
        at: zc, lying: true,
      });
      zc += Lm;
    }
    if (n) {
      let zk = flat0 + fu;
      const local = tube([{ z: 0, o: TONG, i: inset(OUT, t + 0.6) }, { z: 2 * Lt, o: TONG, i: inset(OUT, t + 0.6) }]);
      const at = [];
      for (let i = 0; i < n; i++) { zk += Lm; at.push(zk - Lt); }
      parts.push({
        id: 'koppler', name: 'Steckverbinder', count: n, file: 'flachkanal-steckverbinder.stl',
        what: n > 1 ? `verbindet die liegenden Teile, ${n}× drucken` : 'verbindet Zwischenstück und Oberteil',
        local, at: at[0], atAll: at, lying: false,
      });
    }
    // Oberteil: Steckmuffe + Kasten mit Stutzen ins Gehäuse
    const zt_ = zt - zc, hb_ = hb - zc, k = 14;
    const r2 = Math.SQRT2 - 1;
    const Po = [[0, zb], [D, zb], [D, hb_], [ye, hb_], [ye, zt_], [k, zt_], [0, zt_ - k]];
    const Q = [[t, zb], [D - t, zb], [D - t, hb_ + t], [ye, hb_ + t], [ye, zt_ - t], [k + t * r2, zt_ - t], [t, zt_ - k - t * r2]];
    const stubRings = [{ z: 0, o: OUT, i: SOCK }, { z: sock, o: OUT, i: SOCK }, { z: sock + ch, o: OUT, i: REG }];
    if (taper) {
      const mix = (a, b, e) => a.map((v, j) => lerp(v, b[j] || 0, e));
      const A = [...OUT, 0], B = NOUT;
      for (let j = 0; j <= 24; j++) {
        const e = j / 24, o = mix(A, B, e);
        stubRings.push({ z: zT0 + e * Lta, o, i: inset(o, t) });
      }
    }
    stubRings.push({ z: zb + 5, o: taper ? NOUT : OUT, i: taper ? NREG : REG });
    const stub = tube(stubRings);
    const bx = box(Po, Q, [[0, 0], [3, 3]], Ws / 2, Ws / 2 - t, taper ? cxN : 0);
    const ob = new Float32Array(stub.length + bx.length); ob.set(stub); ob.set(bx, stub.length);
    parts.push({
      id: 'oben', name: 'Oberteil', file: `flachkanal-${2 + n}-oberteil.stl`,
      what: taper ? 'verjüngt sich auf Lochbreite, Bogen und Stutzen ins Gehäuse' : 'Flachkanal mit Bogen und Stutzen ins Gehäuse', local: ob, shells: [stub.length / 9, bx.length / 9],
      at: zc, lying: true, outline: { Po, zb: zc, D },
    });

    // Druckausrichtung, Maße
    for (const pt of parts) {
      pt.world = translate(pt.local, 0, 0, pt.at);
      const pr = toPrint(pt.local, pt.lying, hx, S);
      pt.print = pr.mesh; pt.diagonal = pr.diagonal;
      pt.size = bbox(pr.mesh).size;
      pt.fits = pt.size.every(v => v <= p.bed + 1e-6);
      if (!pt.fits) warn.push(`${pt.name} passt nicht in den Bauraum.`);
    }

    const innerArea = (pr) => { const [a, b, r] = pr; return 4 * a * b - (4 - Math.PI) * r * r; };
    return {
      p, D, W, Ws, Wrohr, snoutX: taper ? cxN : 0, H, t, Rmax, n, fu, Lm, Lo, total, flat0, zt, hb, ye, overhang, warn, parts,
      pipeTop: untenZ + (p.end === 'muffe' ? p.collar : 0),   // Rohrende, Höhe über Tischoberkante
      pipeAxis: Rmax,
      untenBottom: untenZ,
      area: { pipe: pipeArea, duct: innerArea(REG), snout: (Ws - 2 * t) * (p.holeH - 1 - 2 * t) },
      profiles: { OUT, REG },
      untenRings,
    };
  }

  /* größter Überhang (Grad gegen die Senkrechte) über alle nach unten zeigenden Dreiecke */
  function maxOverhang(m) {
    let worst = 0;
    for (let i = 0; i < m.length; i += 9) {
      const ux = m[i + 3] - m[i], uy = m[i + 4] - m[i + 1], uz = m[i + 5] - m[i + 2];
      const vx = m[i + 6] - m[i], vy = m[i + 7] - m[i + 1], vz = m[i + 8] - m[i + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const l = Math.hypot(nx, ny, nz); if (l < 1e-9) continue;
      const z = nz / l;
      if (z < -0.999) continue;                      // waagrechte Flächen (Stufen, Boden) zählen nicht
      if (z < 0) worst = Math.max(worst, Math.asin(-z) * 180 / Math.PI);
    }
    return worst;
  }

  function translate(m, dx, dy, dz) {
    const o = new Float32Array(m.length);
    for (let i = 0; i < m.length; i += 3) { o[i] = m[i] + dx; o[i + 1] = m[i + 1] + dy; o[i + 2] = m[i + 2] + dz; }
    return o;
  }

  function bbox(m) {
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < m.length; i += 3) for (let a = 0; a < 3; a++) { lo[a] = Math.min(lo[a], m[i + a]); hi[a] = Math.max(hi[a], m[i + a]); }
    return { lo, hi, size: hi.map((h, a) => h - lo[a]) };
  }

  /* Liegende Teile kommen mit der Seitenwand aufs Bett (x wird zur Höhe);
   * passt die Länge nicht gerade aufs Bett, wird um 45° gedreht. Danach mittig
   * auf z = 0. */
  function toPrint(m, lying, hx, S) {
    let o = new Float32Array(m.length);
    for (let i = 0; i < m.length; i += 3) {
      if (lying) { o[i] = m[i + 2]; o[i + 1] = -m[i + 1]; o[i + 2] = m[i] + hx; }   // Drehung, keine Spiegelung
      else { o[i] = m[i]; o[i + 1] = m[i + 1]; o[i + 2] = m[i + 2]; }
    }
    let b = bbox(o), diagonal = false;
    if (lying && Math.max(b.size[0], b.size[1]) > S) {
      diagonal = true;
      const c = Math.SQRT1_2;
      for (let i = 0; i < o.length; i += 3) { const x = o[i], y = o[i + 1]; o[i] = c * (x - y); o[i + 1] = c * (x + y); }
      b = bbox(o);
    }
    const cx = (b.lo[0] + b.hi[0]) / 2, cy = (b.lo[1] + b.hi[1]) / 2;
    return { mesh: translate(o, -cx, -cy, -b.lo[2]), diagonal };
  }

  function stl(m, name = 'flachkanal') {
    const n = m.length / 9, buf = new ArrayBuffer(84 + 50 * n), dv = new DataView(buf);
    const head = `${name} – Flachkanal DN 75`.slice(0, 80);
    for (let i = 0; i < head.length; i++) dv.setUint8(i, head.charCodeAt(i) & 0x7f);
    dv.setUint32(80, n, true);
    let o = 84;
    for (let i = 0; i < m.length; i += 9) {
      const ux = m[i + 3] - m[i], uy = m[i + 4] - m[i + 1], uz = m[i + 5] - m[i + 2];
      const vx = m[i + 6] - m[i], vy = m[i + 7] - m[i + 1], vz = m[i + 8] - m[i + 2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const l = Math.hypot(nx, ny, nz) || 1;
      dv.setFloat32(o, nx / l, true); dv.setFloat32(o + 4, ny / l, true); dv.setFloat32(o + 8, nz / l, true);
      for (let k = 0; k < 9; k++) dv.setFloat32(o + 12 + 4 * k, m[i + k], true);
      o += 50;
    }
    return new Uint8Array(buf);
  }

  /* Prüfung: jede Kante genau zweimal, gegenläufig; Volumen positiv */
  function check(m) {
    const key = (i) => `${m[i].toFixed(4)},${m[i + 1].toFixed(4)},${m[i + 2].toFixed(4)}`;
    const edges = new Map();
    let vol = 0, degenerate = 0;
    for (let i = 0; i < m.length; i += 9) {
      const k = [key(i), key(i + 3), key(i + 6)];
      if (k[0] === k[1] || k[1] === k[2] || k[0] === k[2]) { degenerate++; continue; }
      for (let e = 0; e < 3; e++) {
        const a = k[e], b = k[(e + 1) % 3], id = a < b ? a + '|' + b : b + '|' + a;
        edges.set(id, (edges.get(id) || 0) + (a < b ? 1 : 1000));
      }
      vol += (m[i] * (m[i + 4] * m[i + 8] - m[i + 5] * m[i + 7]) - m[i + 1] * (m[i + 3] * m[i + 8] - m[i + 5] * m[i + 6]) + m[i + 2] * (m[i + 3] * m[i + 7] - m[i + 4] * m[i + 6])) / 6;
    }
    let bad = 0; for (const v of edges.values()) if (v !== 1001) bad++;
    return { bad, vol, degenerate, tris: m.length / 9 };
  }

  return { defaults, plan, stl, check, bbox, maxOverhang, PIPE_OD, PIPE_ID };
})();
if (typeof module !== 'undefined') module.exports = Core;
