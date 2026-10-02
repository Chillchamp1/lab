// Limiters: what blocks the motion in a step. A hold ring where the examiner's hand fixes forearm, wrist or hand,
// and a rest pad where the limb lies on the table / chair seat or pushes against the table underside.
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../state/store';
import { TESTS, type Hold } from '../model/tests';
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
const restMat = new THREE.MeshBasicMaterial({ color: '#5C6B70', transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide });

// Labels stand off from the limb: a short, faint line in the label's colour runs from the edge of the glyph to the
// text. Its direction is fixed on screen (up for a hold or a surface above, down for a surface below, sideways away
// from the body), so a label never swings around while the limb moves.
const LEAD = 46; // px
type Dir2 = [number, number]; // screen direction, y down
const leadDir = (side: 'L' | 'R', up: boolean): Dir2 => [side === 'L' ? 0.5 : -0.5, up ? -0.866 : 0.866];

function Lead({ kind, label, dir }: { kind: 'hold' | 'rest'; label: string; dir: Dir2 }) {
  return (
    <Html zIndexRange={[5, 0]}>
      <div className={`lead ${kind}`}>
        <i style={{ width: LEAD, transform: `rotate(${Math.atan2(dir[1], dir[0])}rad)` }} />
        <span className={`lbl3d ${kind}`} style={{ left: dir[0] * LEAD, top: dir[1] * LEAD, transform: `translate(-50%, ${dir[1] < 0 ? '-100%' : '0'})` }}>{label}</span>
      </div>
    </Html>
  );
}

// Angle of the point on an ellipse (centre c, half-axes u and v, in `parent` coordinates) that lies furthest in the
// screen direction `dir`: the line starts there, on the visible edge of the ring or pad.
const E = { c: new THREE.Vector3(), u: new THREE.Vector3(), v: new THREE.Vector3() };
function edgeAngle(parent: THREE.Object3D, c: THREE.Vector3, u: THREE.Vector3, v: THREE.Vector3, dir: Dir2, camera: THREE.Camera, size: { width: number; height: number }) {
  camera.updateMatrixWorld();
  E.c.copy(c).applyMatrix4(parent.matrixWorld).project(camera);
  E.u.copy(c).add(u).applyMatrix4(parent.matrixWorld).project(camera).sub(E.c);
  E.v.copy(c).add(v).applyMatrix4(parent.matrixWorld).project(camera).sub(E.c);
  const along = (p: THREE.Vector3) => p.x * size.width * dir[0] - p.y * size.height * dir[1];
  return Math.atan2(along(E.v), along(E.u));
}

function HoldRing({ h, attach }: { h: Hold; attach: Attach }) {
  const spec = HOLDS[h];
  const side = useStore((s) => s.side);
  const dir = useMemo(() => leadDir(side, true), [side]);
  const grp = useRef<THREE.Object3D | null>(null);
  const lab = useRef<THREE.Group>(null);
  const ell = useMemo(() => ({ c: new THREE.Vector3(0, spec.y, 0), u: new THREE.Vector3(spec.rx, 0, 0), v: new THREE.Vector3(0, 0, spec.rz) }), [spec]);
  const geo = useMemo(() => {
    const pts = Array.from({ length: 49 }, (_, i) => { const a = (i / 48) * 2 * Math.PI; return new THREE.Vector3(spec.rx * Math.cos(a), spec.y, spec.rz * Math.sin(a)); });
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 64, 0.0022, 8, true);
  }, [spec]);
  useFrame(({ camera, size }) => {
    if (!grp.current || !lab.current) return;
    const a = edgeAngle(grp.current, ell.c, ell.u, ell.v, dir, camera, size);
    lab.current.position.set(spec.rx * Math.cos(a), spec.y, spec.rz * Math.sin(a));
  });
  return (
    <group ref={(o) => { grp.current = o; attach(spec.frame)(o); }}>
      <mesh geometry={geo} material={holdMat} renderOrder={21} />
      <group ref={lab}><Lead kind="hold" label={t.limiters.held} dir={dir} /></group>
    </group>
  );
}

// Flat pad where the limb meets the supporting surface; "down" is world gravity transformed into the frame.
function RestPad({ part, dir, label, attach }: { part: 'forearm' | 'hand'; dir: 'down' | 'up'; label: string; attach: Attach }) {
  const spec = REST[part];
  const { frames } = useFrames();
  const mesh = useRef<THREE.Mesh>(null);
  const labelRef = useRef<THREE.Group>(null);
  const side = useStore((s) => s.side);
  const lead = useMemo(() => leadDir(side, dir === 'up'), [side, dir]);
  const tmp = useMemo(() => ({ d: new THREE.Vector3(), q: new THREE.Quaternion(), tng: new THREE.Vector3(), b: new THREE.Vector3(), m: new THREE.Matrix4(), u: new THREE.Vector3(), v: new THREE.Vector3() }), []);
  useFrame(({ camera, size }) => {
    const f = frames.get(spec.frame);
    if (!f || !mesh.current) return;
    f.matrixWorld.decompose(tmp.b, tmp.q, tmp.tng);
    tmp.d.set(0, dir === 'down' ? -1 : 1, 0).applyQuaternion(tmp.q.invert()); // world down/up in frame coordinates
    const n = tmp.d.clone().multiplyScalar(-1); // pad normal points back into the limb
    tmp.tng.set(0, 1, 0).addScaledVector(n, -n.y).normalize(); // along the limb, flattened onto the pad
    tmp.b.crossVectors(n, tmp.tng);
    tmp.m.makeBasis(tmp.b, n, tmp.tng);
    mesh.current.quaternion.setFromRotationMatrix(tmp.m);
    mesh.current.position.set(spec.base[0] + tmp.d.x * spec.off, spec.base[1] + tmp.d.y * spec.off, spec.base[2] + tmp.d.z * spec.off);
    // the label's line starts on the pad's edge, on the side the label stands on
    const parent = mesh.current.parent;
    if (!parent || !labelRef.current) return;
    tmp.u.copy(tmp.b).multiplyScalar(spec.across); tmp.v.copy(tmp.tng).multiplyScalar(spec.along);
    const a = edgeAngle(parent, mesh.current.position, tmp.u, tmp.v, lead, camera, size);
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
  if (mode !== 'test' || !id) return null;
  const test = TESTS.find((x) => x.id === id);
  const st = test?.steps[step];
  const body = currentBody(), rest = SCENES[body].rest;
  const label = rest?.dir === 'up' ? t.limiters.under : body.startsWith('chair') ? t.limiters.seat : t.limiters.table;
  return (
    <>
      {st?.holds?.map((h) => <HoldRing key={h} h={h} attach={attach} />)}
      {rest && <RestPad key={`${rest.part}${rest.dir}`} part={rest.part} dir={rest.dir} label={label} attach={attach} />}
    </>
  );
}
