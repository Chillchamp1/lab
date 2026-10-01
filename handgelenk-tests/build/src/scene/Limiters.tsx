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

function HoldRing({ h, attach }: { h: Hold; attach: Attach }) {
  const spec = HOLDS[h];
  const geo = useMemo(() => {
    const pts = Array.from({ length: 49 }, (_, i) => { const a = (i / 48) * 2 * Math.PI; return new THREE.Vector3(spec.rx * Math.cos(a), spec.y, spec.rz * Math.sin(a)); });
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 64, 0.0022, 8, true);
  }, [spec]);
  return (
    <group ref={attach(spec.frame)}>
      <mesh geometry={geo} material={holdMat} renderOrder={21} />
      <Html position={[0, spec.y - 0.012, spec.rz + 0.008]} center zIndexRange={[5, 0]}><span className="lbl3d hold">{t.limiters.held}</span></Html>
    </group>
  );
}

// Flat pad where the limb meets the supporting surface; "down" is world gravity transformed into the frame.
function RestPad({ part, dir, label, attach }: { part: 'forearm' | 'hand'; dir: 'down' | 'up'; label: string; attach: Attach }) {
  const spec = REST[part];
  const { frames } = useFrames();
  const mesh = useRef<THREE.Mesh>(null);
  const labelRef = useRef<THREE.Group>(null);
  const tmp = useMemo(() => ({ d: new THREE.Vector3(), q: new THREE.Quaternion(), tng: new THREE.Vector3(), b: new THREE.Vector3(), m: new THREE.Matrix4() }), []);
  useFrame(() => {
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
    labelRef.current?.position.copy(mesh.current.position).addScaledVector(tmp.b, -(spec.across + 0.012));
  });
  return (
    <group ref={attach(spec.frame)}>
      <mesh ref={mesh} material={restMat} renderOrder={16} scale={[spec.across, 1, spec.along]}>
        <cylinderGeometry args={[1, 1, 0.0015, 36]} />
      </mesh>
      <group ref={labelRef}><Html center zIndexRange={[5, 0]}><span className="lbl3d rest">{label}</span></Html></group>
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
