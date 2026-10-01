// Bone pipeline: BodyParts3D OBJ (right arm, anatomical position) → rig frame → src/assets/hand.glb + src/scene/rigdata.json
//
//   node scripts/build-bones.mjs [objDir]      (default objDir: assets-src/bodyparts3d/obj)
//
// Steps: parse + weld → pronate radius and hand from anatomical position (full supination) to neutral (thumb up)
// about the radial-head → ulnar-fovea axis → define the rig frame (+X ulnar, +Y distal, +Z dorsal, origin lunate
// centroid, metres) → one level of Loop subdivision (source meshes are 99 % reduced) → derive pivots, finger joint
// centres/axes, TFCC, supports → snap ligament/tendon anchors onto bone surfaces → write quantized, meshopt-compressed glb.
// For own CT/MRI later: supply OBJ/STL in the same orientation with the same bone names and rerun.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { Document, NodeIO } from '@gltf-transform/core';
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { quantize, reorder } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import { BONES, FINGERS, FINGER_FLEX, BAND_SPECS } from '../src/scene/anatomy.ts';

const OBJ_DIR = process.argv[2] ?? 'assets-src/bodyparts3d/obj';
const SKIN_FJ = 'FJ2810'; // whole-body skin; cropped to the right forearm + hand below
const SKIN_CUT_Y = -0.205; // m proximal of the lunate where the skin sleeve ends
const SUPINATION_DEG = 90; // anatomical position: palms forward = fully supinated relative to thumb-up neutral
const ATTRIBUTION = 'BodyParts3D, (c) The Database Center for Life Science licensed under CC Attribution-Share Alike 2.1 Japan';

// ---------- small vector helpers ----------
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => mul(a, 1 / Math.hypot(...a));
const ortho = (v, axis) => norm(sub(v, mul(axis, dot(v, axis))));
const mean = (pts) => mul(pts.reduce(add, [0, 0, 0]), 1 / pts.length);
const r4 = (v) => v.map((x) => Math.round(x * 1e5) / 1e5);
function rotateAbout(p, origin, axis, deg) { // Rodrigues, right-handed
  const t = (deg * Math.PI) / 180, c = Math.cos(t), s = Math.sin(t), v = sub(p, origin);
  return add(origin, add(add(mul(v, c), mul(cross(axis, v), s)), mul(axis, dot(axis, v) * (1 - c))));
}

// ---------- OBJ ----------
function readObj(file) {
  const pos = [], idx = [], key = new Map(), remap = [];
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (line.startsWith('v ')) {
      const p = line.trim().split(/\s+/).slice(1, 4).map(Number);
      const k = p.map((x) => x.toFixed(4)).join(',');
      if (!key.has(k)) { key.set(k, pos.length); pos.push(p); } // weld duplicates
      remap.push(key.get(k));
    } else if (line.startsWith('f ')) {
      const f = line.trim().split(/\s+/).slice(1).map((s) => remap[parseInt(s, 10) - 1]);
      for (let i = 1; i + 1 < f.length; i++) if (f[0] !== f[i] && f[i] !== f[i + 1] && f[0] !== f[i + 1]) idx.push(f[0], f[i], f[i + 1]);
    }
  }
  return { pos, idx };
}

// ---------- Loop subdivision (one level; boundary / non-manifold edges kept sharp) ----------
function loopSubdivide({ pos, idx }) {
  const nv = pos.length, edges = new Map(), nbr = pos.map(() => new Set()), bnd = new Set();
  const ek = (a, b) => (a < b ? a * nv + b : b * nv + a);
  for (let i = 0; i < idx.length; i += 3) for (let j = 0; j < 3; j++) {
    const a = idx[i + j], b = idx[i + ((j + 1) % 3)], c = idx[i + ((j + 2) % 3)], k = ek(a, b);
    if (!edges.has(k)) edges.set(k, { a, b, opp: [] });
    edges.get(k).opp.push(c);
    nbr[a].add(b); nbr[b].add(a);
  }
  for (const e of edges.values()) if (e.opp.length !== 2) { bnd.add(e.a); bnd.add(e.b); }
  const out = pos.map((p, i) => {
    if (bnd.has(i)) return p;
    const n = [...nbr[i]], k = n.length, beta = k === 3 ? 3 / 16 : 3 / (8 * k);
    return add(mul(p, 1 - k * beta), mul(n.map((j) => pos[j]).reduce(add, [0, 0, 0]), beta));
  });
  for (const e of edges.values()) {
    e.i = out.length;
    out.push(e.opp.length === 2
      ? add(mul(add(pos[e.a], pos[e.b]), 3 / 8), mul(add(pos[e.opp[0]], pos[e.opp[1]]), 1 / 8))
      : mul(add(pos[e.a], pos[e.b]), 0.5));
  }
  const nidx = [];
  for (let i = 0; i < idx.length; i += 3) {
    const [a, b, c] = [idx[i], idx[i + 1], idx[i + 2]];
    const ab = edges.get(ek(a, b)).i, bc = edges.get(ek(b, c)).i, ca = edges.get(ek(c, a)).i;
    nidx.push(a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca);
  }
  return { pos: out, idx: nidx };
}

function vertexNormals({ pos, idx }) {
  const n = pos.map(() => [0, 0, 0]);
  for (let i = 0; i < idx.length; i += 3) {
    const [a, b, c] = [idx[i], idx[i + 1], idx[i + 2]];
    const fn = cross(sub(pos[b], pos[a]), sub(pos[c], pos[a])); // area-weighted
    n[a] = add(n[a], fn); n[b] = add(n[b], fn); n[c] = add(n[c], fn);
  }
  return n.map((v) => (Math.hypot(...v) > 0 ? norm(v) : [0, 1, 0]));
}

// principal axis by power iteration
function principalAxis(pts) {
  const c = mean(pts), C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (const p of pts) { const d = sub(p, c); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) C[i][j] += d[i] * d[j]; }
  let v = [0.3, 1, 0.2];
  for (let it = 0; it < 60; it++) v = norm([dot(C[0], v), dot(C[1], v), dot(C[2], v)]);
  return v;
}
// centroid of vertices within `band` of the min/max projection on `axis`
function endCentroid(pts, axis, which, band) {
  const pr = pts.map((p) => dot(p, axis)), ext = which === 'max' ? Math.max(...pr) : Math.min(...pr);
  return mean(pts.filter((_, i) => Math.abs(pr[i] - ext) <= band));
}

// ---------- 1. load (mm, BodyParts3D frame: +X left, −Y anterior, +Z up) ----------
const raw = Object.fromEntries(Object.entries(BONES).map(([name, b]) => [name, readObj(join(OBJ_DIR, `${b.fj}.obj`))]));
const UP = [0, 0, 1];

// ---------- 2. pronate radius + hand to neutral about radial head → ulnar fovea ----------
const radialHead = endCentroid(raw.radius.pos, UP, 'max', 8);
const ulnarHead = endCentroid(raw.ulna.pos, UP, 'min', 12);
const proAxis = norm(sub(ulnarHead, radialHead)); // points distally
const moving = Object.keys(BONES).filter((n) => n !== 'ulna' && n !== 'humerus');
const elbowRaw = endCentroid(raw.humerus.pos, UP, 'min', 12);
for (const n of moving) raw[n].pos = raw[n].pos.map((p) => rotateAbout(p, radialHead, proAxis, -SUPINATION_DEG));

// ---------- 3. rig frame ----------
const distalOf = (b, band = 15) => endCentroid(raw[b].pos, UP, 'min', band);
const proximalOf = (b, band = 25) => endCentroid(raw[b].pos, UP, 'max', band);
const Y = norm(sub(mean([distalOf('radius'), distalOf('ulna')]), mean([radialHead, proximalOf('ulna')])));
const X = ortho(sub(distalOf('ulna', 12), distalOf('radius')), Y);
const Z = cross(X, Y);
const O = mean(raw.lunate.pos);
const toRig = (p) => { const d = sub(p, O); return [dot(d, X) / 1000, dot(d, Y) / 1000, dot(d, Z) / 1000]; };

// sanity: in neutral the back of the hand faces lateral (BodyParts3D −X for the right side), thumb anterior (−Y)
const lateral = [-1, 0, 0];
if (dot(Z, lateral) < 0.5) throw new Error(`dorsal axis not lateral after pronation (Z=${Z.map((v) => v.toFixed(2))}); check SUPINATION_DEG sign`);
const thumbFwd = dot(sub(mean(raw.mc1.pos), mean(raw.mc5.pos)), [0, -1, 0]);
if (thumbFwd <= 0) throw new Error('thumb is not anterior to the little finger after pronation');

const bones = {};
const rawRig = {};
for (const [n, m] of Object.entries(raw)) {
  const rig = { pos: m.pos.map(toRig), idx: m.idx };
  rawRig[n] = rig.pos;
  const sm = rig.idx.length / 3 < 1500 ? loopSubdivide(rig) : rig; // the 99 %-reduced bones need smoothing; the humerus is denser
  bones[n] = { ...sm, nrm: vertexNormals(sm) };
}
const P = (n) => bones[n].pos;
const Yr = [0, 1, 0];

// ---------- 4. pivots, TFCC, fingers ----------
const pivots = {
  radialHead: toRig(radialHead),
  fovea: endCentroid(P('ulna'), Yr, 'max', 0.012),
  radiocarpal: [0, 0, 0],
  midcarpal: endCentroid(P('capitate'), Yr, 'min', 0.006),
  scaphoid: endCentroid(P('scaphoid'), Yr, 'min', 0.005),
};
const ulnaTop = Math.max(...P('ulna').filter((p) => p[0] < pivots.fovea[0] + 0.002).map((p) => p[1]));
const triBottom = Math.min(...P('triquetrum').map((p) => p[1]));
const tfcc = {
  c: [pivots.fovea[0] - 0.002, (ulnaTop + triBottom) / 2, pivots.fovea[2]],
  r: 0.0075,
  h: Math.max(0.0015, Math.min(0.004, triBottom - ulnaTop - 0.0005)),
};

const boneAxis = (n) => {
  let a = principalAxis(P(n));
  const c = mean(P(n));
  if (dot(a, c) < 0 && dot(a, Yr) < 0) a = mul(a, -1);
  if (dot(a, Yr) < 0) a = mul(a, -1); // point distally
  return a;
};
const ends = (n) => { const a = boneAxis(n); return { a, prox: endCentroid(P(n), a, 'min', 0.0025), dist: endCentroid(P(n), a, 'max', 0.0025) }; };
const fingers = FINGERS.map((chain, f) => ({
  joints: chain.slice(1).map((b, j) => {
    const prev = ends(chain[j]), cur = ends(b);
    const c = mul(add(prev.dist, cur.prox), 0.5);
    const moveDir = f === 0 ? norm([0.6, 0, -0.8]) : [0, 0, -1]; // thumb flexes across the palm
    const axis = norm(cross(cur.a, ortho(moveDir, cur.a)));
    return { c: r4(c), axis: r4(axis), maxFlex: FINGER_FLEX[f][j] };
  }),
}));

// elbow hinge (humerus moves, forearm stays put): flexing by +θ about `axis` swings the humerus from proximal toward radial
let elbowAxis = [X[0], Y[0], Z[0]]; // BodyParts3D medial-lateral axis in rig coordinates
if (dot(elbowAxis, [0, 0, -1]) < 0) elbowAxis = mul(elbowAxis, -1);
const elbow = { c: r4(toRig(elbowRaw)), axis: r4(norm(elbowAxis)) };

// thumb CMC: radial abduction (away from the index, in the palm plane) and palmar abduction (away from the palm)
const mc1 = ends('mc1');
const thumbCmc = {
  c: r4(mc1.prox),
  radAxis: r4(norm(cross(mc1.a, ortho([-1, 0, 0], mc1.a)))),
  palmAxis: r4(norm(cross(mc1.a, ortho([0, 0, -1], mc1.a)))),
};

// ---------- 5. anchors ----------
const FRAME_BONES = {};
for (const [n, b] of Object.entries(BONES)) (FRAME_BONES[b.frame] ??= []).push(n);
FRAME_BONES.ecuGroove = FRAME_BONES.ulna;
const SURFACE_GAP = 0.0009;
function snapNearest(frame, p) {
  let best = null, bd = Infinity;
  for (const n of FRAME_BONES[frame] ?? []) bones[n].pos.forEach((q, i) => {
    const d = Math.hypot(...sub(q, p));
    if (d < bd) { bd = d; best = add(q, mul(bones[n].nrm[i], SURFACE_GAP)); }
  });
  return best ?? p;
}
function alongBone({ bone, t, side }) {
  const e = ends(bone), L = dot(sub(e.dist, e.prox), e.a), s = dot(e.prox, e.a) + t * L;
  const b = bones[bone], sign = side === 'dorsal' ? 1 : -1;
  let best = null, bz = -Infinity;
  b.pos.forEach((q, i) => {
    if (Math.abs(dot(q, e.a) - s) > 0.002) return;
    const z = sign * q[2];
    if (z > bz) { bz = z; best = add(q, mul(b.nrm[i], SURFACE_GAP)); }
  });
  return best;
}
const bands = BAND_SPECS.map((b) => ({
  ...b,
  pts: b.pts.map(([frame, p]) => [frame, r4(Array.isArray(p) ? snapNearest(frame, p) : alongBone(p))]),
}));

// ---------- 5b. landmarks (pain zones, examiner contacts, force targets) ----------
// The surface vertex that sticks out furthest along `dir`, among vertices of `names` near `center`
// (distance measured across `dir`).
function extreme(names, center, dir, radius) {
  dir = norm(dir);
  let best = null, bs = -Infinity;
  for (const n of names) bones[n].pos.forEach((q, i) => {
    const d = sub(q, center), across = sub(d, mul(dir, dot(d, dir)));
    if (Math.hypot(...across) > radius) return;
    const sc = dot(q, dir);
    if (sc > bs) { bs = sc; best = { p: q, n: bones[n].nrm[i] }; }
  });
  if (!best) throw new Error(`no surface near ${center}`);
  return best;
}
const cen = (n) => mean(P(n));
const mid = (a, b) => mul(add(a, b), 0.5);
const fov = pivots.fovea;
const LM = {
  ulnar_styloid: ['ulna', ['ulna'], add(fov, [0, 0.004, 0]), [0, 1, 0], 0.008],
  ulnar_fovea: ['ulna', ['ulna'], add(fov, [0, -0.002, 0]), [1, 0, -1], 0.006],
  ulnar_head_dorsal: ['ulna', ['ulna'], add(fov, [0, -0.006, 0]), [0, 0, 1], 0.006],
  ecu_groove: ['ulna', ['ulna'], add(fov, [0, -0.009, 0]), [0.4, 0, 1], 0.006],
  druj_dorsal: ['ulna', ['ulna', 'radius'], add(fov, [-0.006, -0.007, 0]), [0, 0, 1], 0.004],
  druj_volar: ['ulna', ['ulna', 'radius'], add(fov, [-0.006, -0.007, 0]), [0, 0, -1], 0.004],
  pisiform: ['triq', ['pisiform'], cen('pisiform'), [0, 0, -1], 0.004],
  triquetrum_dorsal: ['triq', ['triquetrum'], cen('triquetrum'), [0, 0, 1], 0.004],
  lt_interval_dorsal: ['prox', ['lunate', 'triquetrum'], mid(cen('lunate'), cen('triquetrum')), [0, 0, 1], 0.003],
  sl_interval_dorsal: ['prox', ['scaphoid', 'lunate'], mid(cen('scaphoid'), cen('lunate')), [0, 0, 1], 0.003],
  scaphoid_tubercle: ['scaphoid', ['scaphoid'], add(cen('scaphoid'), [-0.002, 0.006, 0]), [0, 0, -1], 0.005],
  midcarpal_ulnar_dorsal: ['mid', ['triquetrum', 'hamate'], mid(cen('triquetrum'), cen('hamate')), [0, 0, 1], 0.004],
  ulnocarpal_volar: ['prox', ['ulna', 'lunate', 'triquetrum'], mid(fov, cen('triquetrum')), [0, 0, -1], 0.005],
  carpal_tunnel: ['mid', ['capitate', 'lunate', 'hamate', 'scaphoid'], cen('capitate'), [0, 0, -1], 0.005],
  lateral_epicondyle: ['humerus', ['humerus'], toRig(elbowRaw), [X[0] * -1, Y[0] * -1, Z[0] * -1], 0.03],
};
const landmarks = Object.fromEntries(Object.entries(LM).map(([id, [frame, names, c, dir, r]]) => {
  const e = extreme(names, c, dir, r);
  return [id, { frame, p: r4(add(e.p, mul(e.n, 0.001))), n: r4(e.n) }];
}));
landmarks.carpal_tunnel.p = r4(add(landmarks.carpal_tunnel.p, [0, 0, -0.004])); // in front of the carpus, not on it

// ---------- 5c. skin: crop the body skin to the forearm + hand, bind to bone frames, project landmarks ----------
const skinRaw = readObj(join(OBJ_DIR, `${SKIN_FJ}.obj`));
skinRaw.pos = skinRaw.pos.map((p) => rotateAbout(p, radialHead, proAxis, -SUPINATION_DEG)).map(toRig);
{
  // generous box (fingertips reach ~0.2 m from the lunate); the connected-component step below drops everything else
  const inside = (p) => p[1] > SKIN_CUT_Y && p[1] < 0.27 && Math.abs(p[0]) < 0.15 && Math.abs(p[2]) < 0.15;
  const faces = [];
  for (let i = 0; i < skinRaw.idx.length; i += 3) {
    const f = [skinRaw.idx[i], skinRaw.idx[i + 1], skinRaw.idx[i + 2]];
    if (f.every((v) => inside(skinRaw.pos[v]))) faces.push(f);
  }
  // keep only the connected component that contains the hand (drops thigh/hip fragments caught by the box)
  const adj = new Map();
  faces.forEach((f, i) => f.forEach((v) => { (adj.get(v) ?? adj.set(v, []).get(v)).push(i); }));
  const seedP = mean(rawRig.mc3);
  let seed = 0, sd = Infinity;
  faces.forEach((f, i) => { const d = Math.hypot(...sub(skinRaw.pos[f[0]], seedP)); if (d < sd) { sd = d; seed = i; } });
  const keep = new Set([seed]), stack = [seed];
  while (stack.length) { const i = stack.pop(); for (const v of faces[i]) for (const j of adj.get(v)) if (!keep.has(j)) { keep.add(j); stack.push(j); } }
  const remap = new Map(), pos = [], idx = [];
  for (const i of keep) for (const v of faces[i]) { if (!remap.has(v)) { remap.set(v, pos.length); pos.push(skinRaw.pos[v]); } idx.push(remap.get(v)); }
  // close the open elbow end with a dome, so the forearm ends round like the mannequin's other segments
  const directed = new Set();
  for (let i = 0; i < idx.length; i += 3) for (let j = 0; j < 3; j++) directed.add(`${idx[i + j]}_${idx[i + ((j + 1) % 3)]}`);
  const next = new Map();
  for (const e of directed) { const [a, b] = e.split('_').map(Number); if (!directed.has(`${b}_${a}`)) next.set(a, b); }
  while (next.size) {
    const start = next.keys().next().value, loop = [];
    for (let cur = start; cur !== undefined && next.has(cur); ) { loop.push(cur); const nx = next.get(cur); next.delete(cur); cur = nx; }
    const c = mean(loop.map((i) => pos[i]));
    if (loop.length < 8 || c[1] > SKIN_CUT_Y + 0.04) continue; // only the proximal cut
    const R = loop.reduce((a, i) => a + Math.hypot(...sub(pos[i], c)), 0) / loop.length, axis = [0, -1, 0], RINGS = 4;
    let prev = loop;
    for (let k = 1; k <= RINGS; k++) {
      const th = (k / (RINGS + 1)) * (Math.PI / 2);
      const ring = loop.map((i) => { pos.push(add(add(c, mul(sub(pos[i], c), Math.cos(th))), mul(axis, R * Math.sin(th)))); return pos.length - 1; });
      for (let i = 0; i < loop.length; i++) { const j = (i + 1) % loop.length; idx.push(prev[j], prev[i], ring[i], prev[j], ring[i], ring[j]); }
      prev = ring;
    }
    pos.push(add(c, mul(axis, R)));
    for (let i = 0; i < loop.length; i++) idx.push(prev[(i + 1) % loop.length], prev[i], pos.length - 1);
  }
  skinRaw.pos = pos; skinRaw.idx = idx;
}
const skin = loopSubdivide(skinRaw);
skin.nrm = vertexNormals(skin);

// frame weights: Gaussian falloff to the nearest bones, aggregated per frame, top two frames kept
const FRAME_LIST = [...new Set(Object.values(BONES).map((b) => b.frame))].filter((f) => f !== 'humerus');
const boneFrameIdx = Object.fromEntries(Object.entries(BONES).map(([n, b]) => [n, FRAME_LIST.indexOf(b.frame)]));
const SIGMA = 0.012;
skin.joints = []; skin.weights = [];
for (const p of skin.pos) {
  const acc = new Map();
  for (const [n, pts] of Object.entries(rawRig)) {
    if (n === 'humerus') continue;
    let best = Infinity;
    for (const q of pts) { const d = (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2 + (q[2] - p[2]) ** 2; if (d < best) best = d; }
    const w = Math.exp(-best / (SIGMA * SIGMA)), fi = boneFrameIdx[n];
    acc.set(fi, Math.max(acc.get(fi) ?? 0, w));
  }
  const top = [...acc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2);
  if (top.length === 1 || top[1][1] < 1e-6) top.length = 1;
  const sum = top.reduce((s, [, w]) => s + w, 0) || 1;
  skin.joints.push(top[0][0], top[1]?.[0] ?? top[0][0]);
  skin.weights.push(top[0][1] / sum, (top[1]?.[1] ?? 0) / sum);
}
// where each landmark shows on the skin: nearest skin vertex to the ray along the landmark normal
for (const lm of Object.values(landmarks)) {
  const o = lm.p, n = lm.n;
  let best = null, bs = Infinity;
  for (const q of skin.pos) {
    const d = sub(q, o), t = dot(d, n);
    if (t < 0 || t > 0.03) continue;
    const off = Math.hypot(...sub(d, mul(n, t))) + 0.15 * t;
    if (off < bs) { bs = off; best = q; }
  }
  lm.skin = r4(best && bs < 0.012 ? add(best, mul(n, 0.0008)) : o); // no skin nearby (e.g. elbow): stay on the bone
}


// ---------- 6. supports ----------
const sliceExtent = (names, y0, y1) => {
  const pts = names.flatMap((n) => P(n)).filter((p) => p[1] >= y0 && p[1] <= y1);
  const xs = pts.map((p) => p[0]), zs = pts.map((p) => p[2]);
  return { x: [Math.min(...xs), Math.max(...xs)], z: [Math.min(...zs), Math.max(...zs)] };
};
const bandY = pivots.fovea[1] - 0.022; // just proximal to the ulnar head
const fa = sliceExtent(['radius', 'ulna'], bandY - 0.006, bandY + 0.006);
const carp = sliceExtent(['scaphoid', 'lunate', 'triquetrum', 'pisiform', 'capitate', 'hamate', 'trapezium', 'trapezoid'], -0.01, 0.03);
const SKIN = 0.008;
const support = {
  band: { c: r4([(fa.x[0] + fa.x[1]) / 2, bandY, (fa.z[0] + fa.z[1]) / 2]), r: r4([(fa.x[1] - fa.x[0]) / 2 + SKIN, (fa.z[1] - fa.z[0]) / 2 + SKIN]), h: 0.012 },
  wrap: { c: r4([(carp.x[0] + carp.x[1]) / 2, 0.009, (carp.z[0] + carp.z[1]) / 2]), r: r4([(carp.x[1] - carp.x[0]) / 2 + 0.006, (carp.z[1] - carp.z[0]) / 2 + 0.006]), h: 0.024 },
  lift: [],
};
const pis = P('pisiform').reduce((a, b) => (b[2] < a[2] ? b : a));
support.lift = [
  ['triq', r4(add(pis, [0, 0, -0.005]))],
  ['triq', r4([carp.x[1] + 0.007, pis[1] - 0.004, 0])],
  ['ulna', r4([fa.x[1] + 0.007, bandY + 0.012, (fa.z[0] + fa.z[1]) / 2 + 0.006])],
  ['bandFrame', r4([support.band.c[0] + 0.012, bandY, support.band.c[2] + support.band.r[1]])],
];

// ---------- 7. write ----------
const rigdata = {
  source: ATTRIBUTION,
  pivots: Object.fromEntries(Object.entries(pivots).map(([k, v]) => [k, r4(v)])),
  tfcc: { c: r4(tfcc.c), r: tfcc.r, h: r4([tfcc.h])[0] },
  elbow,
  thumbCmc,
  landmarks,
  fingers,
  bones: Object.fromEntries(Object.entries(BONES).map(([n, b]) => [n, b.frame])),
  skinFrames: FRAME_LIST,
  bands,
  support,
};
mkdirSync('src/assets', { recursive: true });
writeFileSync('src/scene/rigdata.json', JSON.stringify(rigdata, null, 1));

const doc = new Document();
doc.getRoot().getAsset().copyright = ATTRIBUTION;
const buffer = doc.createBuffer();
const scene = doc.createScene('wrist');
let tris = 0;
for (const [n, b] of Object.entries(bones)) {
  const pos = doc.createAccessor().setType('VEC3').setArray(new Float32Array(b.pos.flat())).setBuffer(buffer);
  const nrm = doc.createAccessor().setType('VEC3').setArray(new Float32Array(b.nrm.flat())).setBuffer(buffer);
  const ind = doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(b.idx)).setBuffer(buffer);
  const prim = doc.createPrimitive().setAttribute('POSITION', pos).setAttribute('NORMAL', nrm).setIndices(ind);
  const node = doc.createNode(n).setMesh(doc.createMesh(n).addPrimitive(prim)).setExtras({ frame: BONES[n].frame });
  scene.addChild(node);
  tris += b.idx.length / 3;
}
await MeshoptEncoder.ready;
await doc.transform(reorder({ encoder: MeshoptEncoder }), quantize({ quantizePosition: 14, quantizeNormal: 10 }));
doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
const io = new NodeIO().registerExtensions([EXTMeshoptCompression, KHRMeshQuantization]).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const glb = await io.writeBinary(doc);
writeFileSync('src/assets/hand.glb', glb);

// skin.glb: positions, normals, _FRAME (vec2 u8) and _WEIGHT (vec2 f32) for CPU skinning in the app
{
  const sdoc = new Document();
  sdoc.getRoot().getAsset().copyright = ATTRIBUTION;
  const buf = sdoc.createBuffer();
  const acc = (type, arr) => sdoc.createAccessor().setType(type).setArray(arr).setBuffer(buf);
  const prim = sdoc.createPrimitive()
    .setAttribute('POSITION', acc('VEC3', new Float32Array(skin.pos.flat())))
    .setAttribute('NORMAL', acc('VEC3', new Float32Array(skin.nrm.flat())))
    .setAttribute('_FRAME', acc('VEC2', new Uint8Array(skin.joints)))
    .setAttribute('_WEIGHT', acc('VEC2', new Float32Array(skin.weights)))
    .setIndices(acc('SCALAR', new Uint32Array(skin.idx)));
  sdoc.createScene('skin').addChild(sdoc.createNode('skin').setMesh(sdoc.createMesh('skin').addPrimitive(prim)));
  await sdoc.transform(reorder({ encoder: MeshoptEncoder }));
  sdoc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
  const sglb = await io.writeBinary(sdoc);
  writeFileSync('src/assets/skin.glb', sglb);
  const ys = skin.pos.map((p) => p[1]);
  console.log(`skin.glb ${(sglb.byteLength / 1024).toFixed(0)} KB, ${skin.pos.length} vertices, ${skin.idx.length / 3} triangles, y ${(Math.min(...ys) * 1000).toFixed(0)}..${(Math.max(...ys) * 1000).toFixed(0)} mm`);
}

const span = (n) => { const ys = P(n).map((p) => p[1]); return ((Math.max(...ys) - Math.min(...ys)) * 1000).toFixed(0); };
console.log(`hand.glb ${(glb.byteLength / 1024).toFixed(0)} KB, ${Object.keys(bones).length} bones, ${tris} triangles`);
console.log(`radius length ${span('radius')} mm, mc3 ${span('mc3')} mm; pivots`, rigdata.pivots, 'tfcc', rigdata.tfcc);
