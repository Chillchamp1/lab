// Limiters: what blocks the motion in a step. A hold ring where the examiner's hand fixes forearm, wrist or hand,
// and a rest pad where the limb lies on the table / chair seat or pushes against the table underside.
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { guided, useStore } from '../state/store';
import type { Hold } from '../model/tests';
import { findProgram } from '../model/exercises';
import { SCENES, currentBody } from './Figure';
import type { FrameId, V3 } from './anatomy';
import { useFrames } from './frames';
import { t } from '../i18n/en';
import { FORCE_COLOR } from './TestOverlay';

type Attach = (frame: FrameId) => (o: THREE.Object3D | null) => void;

// ring position and half-axes (X across, Z thick) in the frame's coordinates
const HOLDS: Record<Hold, { frame: FrameId; y: number; rx: number; rz: number }> = {
  forearm: { frame: 'ulna', y: -0.075, rx: 0.037, rz: 0.031 },
  wrist: { frame: 'prox', y: 0.0, rx: 0.036, rz: 0.024 },
  hand: { frame: 'mid', y: 0.06, rx: 0.047, rz: 0.019 },
};
const REST: Record<'forearm' | 'hand', { frame: FrameId; base: V3; off: number; across: number; along: number }> = {
  forearm: { frame: 'ulna', base: [0.003, -0.06, 0], off: 0.031, across: 0.03, along: 0.07 },
  hand: { frame: 'mid', base: [-0.004, 0.055, 0], off: 0.019, across: 0.045, along: 0.05 },
};

// drawn with depth, so they sit around / under the limb instead of covering it
const holdMat = new THREE.MeshBasicMaterial({ color: FORCE_COLOR.examiner, transparent: true, opacity: 0.8, depthWrite: false });
const holdSelfMat = new THREE.MeshBasicMaterial({ color: FORCE_COLOR.other, transparent: true, opacity: 0.8, depthWrite: false }); // your own other hand
const restMat = new THREE.MeshBasicMaterial({ color: '#5C6B70', transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide });

// Labels stand off from the limb: a short, faint line in the label's colour runs from the edge of the glyph to the
// text. Each label is laid out on screen every frame so that it
//   · stands to the side of the limb (across its long axis), holds above and supporting surfaces on their own side,
//   · stays inside the picture and off the instruction box and the other labels,
//   · is hidden in the overview, where it would only cover the figure (the key under the timeline explains the glyphs).
type Dir2 = [number, number]; // screen direction, y down
type Rect = { x: number; y: number; w: number; h: number }; // centre and size, px
const fallbackDir = (side: 'L' | 'R', up: boolean): Dir2 => [side === 'L' ? 0.5 : -0.5, up ? -0.866 : 0.866];
const PLACED = new Map<object, Rect>(); // where each visible label currently is, so the others keep off it
const hits = (p: Rect, q: Rect, gap = 4) => Math.abs(p.x - q.x) < (p.w + q.w) / 2 + gap && Math.abs(p.y - q.y) < (p.h + q.h) / 2 + gap;
const NEAR = 1.4, FAR = 1.7; // m from the camera: labels are fully shown below NEAR and gone beyond FAR

// Which way a label goes: across the limb as seen on screen, on the side `up` asks for. The side only flips when the
// limb has clearly turned past vertical, and the turn is eased, so the label does not jump about.
type Steer = { sign: number; ang: number | null };
const A = { c: new THREE.Vector3(), d: new THREE.Vector3() };
function steer(st: Steer, parent: THREE.Object3D, c: THREE.Vector3, up: boolean, side: 'L' | 'R', camera: THREE.Camera, size: { width: number; height: number }, dt: number): Dir2 {
  camera.updateMatrixWorld();
  A.c.copy(c).applyMatrix4(parent.matrixWorld).project(camera);
  A.d.copy(c).setY(c.y + 0.05).applyMatrix4(parent.matrixWorld).project(camera).sub(A.c); // 5 cm along the limb
  const ax = A.d.x * size.width / 2, ay = -A.d.y * size.height / 2, len = Math.hypot(ax, ay);
  let d: Dir2;
  if (len < 6) d = fallbackDir(side, up); // looking along the limb
  else {
    const nx = -ay / len, ny = ax / len, dot = up ? -ny : ny; // across the limb; dot > 0 = on the wanted side
    if (st.sign === 0) st.sign = dot >= 0 ? 1 : -1;
    else if (dot * st.sign < -0.3) st.sign = -st.sign;
    d = [nx * st.sign, ny * st.sign];
  }
  const want = Math.atan2(d[1], d[0]);
  if (st.ang == null) st.ang = want;
  else st.ang += Math.atan2(Math.sin(want - st.ang), Math.cos(want - st.ang)) * (1 - Math.exp(-dt * 10));
  return [Math.cos(st.ang), Math.sin(st.ang)];
}

function Lead({ kind, label, dir }: { kind: 'hold' | 'hold self' | 'rest'; label: string; dir: React.RefObject<Dir2> }) {
  const g = useRef<THREE.Group>(null), root = useRef<HTMLDivElement>(null);
  const v = useMemo(() => new THREE.Vector3(), []);
  const me = useMemo(() => ({}), []);
  useEffect(() => () => { PLACED.delete(me); }, [me]);

  useFrame(({ camera, size }) => {
    const el = root.current, line = el?.firstElementChild as HTMLElement | null, tag = el?.lastElementChild as HTMLElement | null;
    if (!g.current || !el || !line || !tag) return;
    g.current.getWorldPosition(v);
    const dist = camera.position.distanceTo(v);
    v.project(camera);
    const W = size.width, H = size.height;
    const ax = (v.x * 0.5 + 0.5) * W, ay = (-v.y * 0.5 + 0.5) * H;
    const show = Math.max(0, Math.min(1, (FAR - dist) / (FAR - NEAR)));
    if (show <= 0 || v.z > 1 || ax < 0 || ax > W || ay < 0 || ay > H) { el.style.opacity = '0'; PLACED.delete(me); return; }

    const d = dir.current, len = W < 520 ? 30 : 46;
    const r: Rect = { x: 0, y: 0, w: tag.offsetWidth, h: tag.offsetHeight };
    r.x = ax + d[0] * (len + r.w / 2); r.y = ay + d[1] * (len + r.h / 2);
    // keep inside the picture, below the display buttons
    const bar = document.querySelector<HTMLElement>('.stagebar');
    const top = (bar ? bar.offsetTop + bar.offsetHeight : 0) + 6;
    const fit = () => { r.x = Math.max(r.w / 2 + 6, Math.min(W - r.w / 2 - 6, r.x)); r.y = Math.max(top + r.h / 2, Math.min(H - r.h / 2 - 6, r.y)); };
    fit();
    // keep off the instruction box: go above it, or beside it where that is the shorter way
    const box = document.getElementById('callout');
    if (box) {
      const b: Rect = { x: box.offsetLeft + box.offsetWidth / 2, y: box.offsetTop + box.offsetHeight / 2, w: box.offsetWidth, h: box.offsetHeight };
      if (hits(r, b, 6)) {
        const upY = b.y - b.h / 2 - 6 - r.h / 2;
        const sideX = b.x < W / 2 ? b.x + b.w / 2 + 6 + r.w / 2 : b.x - b.w / 2 - 6 - r.w / 2;
        const sideOk = sideX - r.w / 2 > 6 && sideX + r.w / 2 < W - 6;
        if (sideOk && Math.abs(sideX - r.x) < Math.abs(upY - r.y)) r.x = sideX; else r.y = upY;
      }
    }
    // keep off the other labels: step away along the own direction
    for (const [k, o] of PLACED) {
      if (k === me || !hits(r, o)) continue;
      r.y = d[1] < 0 ? o.y - o.h / 2 - 4 - r.h / 2 : o.y + o.h / 2 + 4 + r.h / 2;
    }
    PLACED.set(me, { ...r });

    // the wrapper sits on the anchor; everything below is relative to it
    const lx = r.x - ax, ly = r.y - ay;
    tag.style.transform = `translate(${(lx - r.w / 2).toFixed(1)}px, ${(ly - r.h / 2).toFixed(1)}px)`;
    const ex = Math.max(lx - r.w / 2, Math.min(lx + r.w / 2, 0)), ey = Math.max(ly - r.h / 2, Math.min(ly + r.h / 2, 0)); // nearest point of the label
    const ll = Math.hypot(ex, ey);
    line.style.width = `${ll.toFixed(1)}px`;
    line.style.transform = `rotate(${Math.atan2(ey, ex).toFixed(3)}rad)`;
    el.style.opacity = show.toFixed(2);
  });

  return (
    <group ref={g}>
      <Html zIndexRange={[5, 0]}>
        <div ref={root} className={`lead ${kind}`} style={{ opacity: 0 }}>
          <i />
          <span className={`lbl3d ${kind}`}>{label}</span>
        </div>
      </Html>
    </group>
  );
}

// Angle of the point on an ellipse (centre c, half-axes u and v, in `parent` coordinates) that lies furthest in the
// screen direction `dir`: the line starts there, on the visible edge of the ring or pad.
const E = { c: new THREE.Vector3(), u: new THREE.Vector3(), v: new THREE.Vector3() };
function edgeAngle(parent: THREE.Object3D, c: THREE.Vector3, u: THREE.Vector3, v: THREE.Vector3, dir: Dir2, camera: THREE.Camera, size: { width: number; height: number }) {
  E.c.copy(c).applyMatrix4(parent.matrixWorld).project(camera);
  E.u.copy(c).add(u).applyMatrix4(parent.matrixWorld).project(camera).sub(E.c);
  E.v.copy(c).add(v).applyMatrix4(parent.matrixWorld).project(camera).sub(E.c);
  const along = (p: THREE.Vector3) => p.x * size.width * dir[0] - p.y * size.height * dir[1];
  return Math.atan2(along(E.v), along(E.u));
}

function HoldRing({ h, self, attach }: { h: Hold; self: boolean; attach: Attach }) {
  const spec = HOLDS[h];
  const side = useStore((s) => s.side);
  const dir = useRef<Dir2>(fallbackDir(side, true));
  const st = useMemo<Steer>(() => ({ sign: 0, ang: null }), []);
  const grp = useRef<THREE.Object3D | null>(null);
  const lab = useRef<THREE.Group>(null);
  const ell = useMemo(() => ({ c: new THREE.Vector3(0, spec.y, 0), u: new THREE.Vector3(spec.rx, 0, 0), v: new THREE.Vector3(0, 0, spec.rz) }), [spec]);
  const geo = useMemo(() => {
    const pts = Array.from({ length: 49 }, (_, i) => { const a = (i / 48) * 2 * Math.PI; return new THREE.Vector3(spec.rx * Math.cos(a), spec.y, spec.rz * Math.sin(a)); });
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 64, 0.0022, 8, true);
  }, [spec]);
  useFrame(({ camera, size }, dt) => {
    if (!grp.current || !lab.current) return;
    dir.current = steer(st, grp.current, ell.c, true, side, camera, size, dt);
    const a = edgeAngle(grp.current, ell.c, ell.u, ell.v, dir.current, camera, size);
    lab.current.position.set(spec.rx * Math.cos(a), spec.y, spec.rz * Math.sin(a));
  });
  return (
    <group ref={(o) => { grp.current = o; attach(spec.frame)(o); }}>
      <mesh geometry={geo} material={self ? holdSelfMat : holdMat} renderOrder={21} />
      <group ref={lab}><Lead kind={self ? 'hold self' : 'hold'} label={self ? t.limiters.heldSelf : t.limiters.held} dir={dir} /></group>
    </group>
  );
}

// Flat pad where the limb meets the supporting surface; "down" is world gravity transformed into the frame.
function RestPad({ part, dir, back, label, attach }: { part: 'forearm' | 'hand'; dir: 'down' | 'up'; back: number; label: string; attach: Attach }) {
  const spec = REST[part];
  const { frames } = useFrames();
  const mesh = useRef<THREE.Mesh>(null);
  const labelRef = useRef<THREE.Group>(null);
  const side = useStore((s) => s.side);
  const lead = useRef<Dir2>(fallbackDir(side, dir === 'up'));
  const st = useMemo<Steer>(() => ({ sign: 0, ang: null }), []);
  const tmp = useMemo(() => ({ d: new THREE.Vector3(), q: new THREE.Quaternion(), tng: new THREE.Vector3(), b: new THREE.Vector3(), m: new THREE.Matrix4(), u: new THREE.Vector3(), v: new THREE.Vector3() }), []);
  useFrame(({ camera, size }, dt) => {
    const f = frames.get(spec.frame);
    if (!f || !mesh.current) return;
    f.matrixWorld.decompose(tmp.b, tmp.q, tmp.tng);
    tmp.d.set(0, dir === 'down' ? -1 : 1, 0).applyQuaternion(tmp.q.invert()); // world down/up in frame coordinates
    const n = tmp.d.clone().multiplyScalar(-1); // pad normal points back into the limb
    tmp.tng.set(0, 1, 0).addScaledVector(n, -n.y).normalize(); // along the limb, flattened onto the pad
    tmp.b.crossVectors(n, tmp.tng);
    tmp.m.makeBasis(tmp.b, n, tmp.tng);
    mesh.current.quaternion.setFromRotationMatrix(tmp.m);
    mesh.current.position.set(spec.base[0] + tmp.d.x * spec.off, spec.base[1] - back + tmp.d.y * spec.off, spec.base[2] + tmp.d.z * spec.off);
    // the label's line starts on the pad's edge, on the side the label stands on
    const parent = mesh.current.parent;
    if (!parent || !labelRef.current) return;
    tmp.u.copy(tmp.b).multiplyScalar(spec.across); tmp.v.copy(tmp.tng).multiplyScalar(spec.along);
    lead.current = steer(st, parent, mesh.current.position, dir === 'up', side, camera, size, dt);
    const a = edgeAngle(parent, mesh.current.position, tmp.u, tmp.v, lead.current, camera, size);
    labelRef.current.position.copy(mesh.current.position).addScaledVector(tmp.u, Math.cos(a)).addScaledVector(tmp.v, Math.sin(a));
  });
  return (
    <group ref={attach(spec.frame)}>
      <mesh ref={mesh} material={restMat} renderOrder={16} scale={[spec.across, 1, spec.along]}>
        <cylinderGeometry args={[1, 1, 0.0015, 36]} />
      </mesh>
      <group ref={labelRef}><Lead kind="rest" label={label} dir={lead} /></group>
    </group>
  );
}

export function Limiters({ attach }: { attach: Attach }) {
  const mode = useStore((s) => s.mode), id = useStore((s) => s.player.id), step = useStore((s) => s.player.step);
  if (!guided(mode) || !id) return null;
  const test = findProgram(id);
  const st = test?.steps[step];
  const body = currentBody(), rest = SCENES[body].rest;
  const label = rest?.dir === 'up' ? t.limiters.under : body.startsWith('chair') ? t.limiters.seat : t.limiters.table;
  return (
    <>
      {st?.holds?.map((h) => <HoldRing key={h} h={h} self={mode === 'train'} attach={attach} />)}
      {rest && <RestPad key={`${rest.part}${rest.dir}`} part={rest.part} dir={rest.dir} back={rest.back ?? 0} label={label} attach={attach} />}
    </>
  );
}
