// Test-mode overlays: force arrows, examiner finger pads and pain-zone glows, each attached to its landmark's bone frame.
// Arrow directions are anatomical (palmar, dorsal …) in the bone's local frame, so they follow the pose and mirror for the left hand.
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { painShown, useStore } from '../state/store';
import { TESTS, type Force } from '../model/tests';
import type { FrameId, Landmark, LandmarkId, RigData, V3 } from './anatomy';
import rigJson from './rigdata.json';

const RIG = rigJson as unknown as RigData;
const LM = RIG.landmarks;
const Y = new THREE.Vector3(0, 1, 0);
const DIR: Record<string, V3> = { palmar: [0, 0, -1], dorsal: [0, 0, 1], radial: [-1, 0, 0], ulnar: [1, 0, 0], proximal: [0, -1, 0], distal: [0, 1, 0] };
// examiner/partner glyphs are violet so they never read as a (blue) support band
export const FORCE_COLOR: Record<Force['by'], string> = { examiner: '#7A4FD6', self: '#2E8B7A', body: '#C9862B', table: '#8A7A5C' };
const SHAFT_R = 0.0015, HEAD_R = 0.004, HEAD_L = 0.008;

const overlayMat = (color: string, opacity = 1) =>
  new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthTest: false, depthWrite: false });

function StraightArrow({ lm, f }: { lm: Landmark; f: Force }) {
  const { shaft, head, q, len } = useMemo(() => {
    const d = new THREE.Vector3(...DIR[f.dir]);
    const tip = new THREE.Vector3(...lm.p).addScaledVector(new THREE.Vector3(...lm.n), 0.0012);
    const len = 0.016 + 0.02 * f.mag;
    return {
      len,
      q: new THREE.Quaternion().setFromUnitVectors(Y, d),
      head: tip.clone().addScaledVector(d, -HEAD_L / 2),
      shaft: tip.clone().addScaledVector(d, -HEAD_L - (len - HEAD_L) / 2),
    };
  }, [lm, f]);
  const mat = useMemo(() => overlayMat(FORCE_COLOR[f.by]), [f.by]);
  return (
    <>
      <mesh position={shaft} quaternion={q} material={mat} renderOrder={20}><cylinderGeometry args={[SHAFT_R, SHAFT_R, len - HEAD_L, 10]} /></mesh>
      <mesh position={head} quaternion={q} material={mat} renderOrder={20}><coneGeometry args={[HEAD_R, HEAD_L, 16]} /></mesh>
    </>
  );
}

// Rotation torque: an arc around the forearm axis (radial head → ulnar fovea), head showing the turning direction.
function ArcArrow({ lm, f }: { lm: Landmark; f: Force }) {
  const { tube, head, q } = useMemo(() => {
    const p = new THREE.Vector3(...lm.p);
    const c = new THREE.Vector3(RIG.pivots.fovea[0], p.y, RIG.pivots.fovea[2]);
    const v0 = p.clone().sub(c).setLength(p.distanceTo(c) + 0.012);
    const sign = f.dir === 'rotate_pronation' ? -1 : 1; // pronation = negative rotation about the distal axis
    const pts = Array.from({ length: 13 }, (_, i) => c.clone().add(v0.clone().applyAxisAngle(Y, sign * THREE.MathUtils.degToRad(-25 + (85 * i) / 12))));
    const end = pts[pts.length - 1], tan = end.clone().sub(pts[pts.length - 2]).normalize();
    return {
      tube: new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, SHAFT_R, 8, false),
      head: end.clone().addScaledVector(tan, HEAD_L / 2),
      q: new THREE.Quaternion().setFromUnitVectors(Y, tan),
    };
  }, [lm, f]);
  const mat = useMemo(() => overlayMat(FORCE_COLOR[f.by]), [f.by]);
  return (
    <>
      <mesh geometry={tube} material={mat} renderOrder={20} />
      <mesh position={head} quaternion={q} material={mat} renderOrder={20}><coneGeometry args={[HEAD_R, HEAD_L, 16]} /></mesh>
    </>
  );
}

function Pad({ lm }: { lm: Landmark }) {
  const pos = useMemo(() => new THREE.Vector3(...lm.p).addScaledVector(new THREE.Vector3(...lm.n), 0.005), [lm]);
  const mat = useMemo(() => overlayMat(FORCE_COLOR.examiner, 0.45), []);
  return <mesh position={pos} material={mat} renderOrder={19}><sphereGeometry args={[0.0048, 20, 14]} /></mesh>;
}

function PainGlow({ lm }: { lm: Landmark }) {
  const core = useMemo(() => overlayMat('#E5484D', 0.7), []);
  const halo = useMemo(() => overlayMat('#E5484D', 0.22), []);
  const haloRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const w = 0.5 + 0.5 * Math.sin(clock.elapsedTime * 4);
    core.opacity = 0.5 + 0.35 * w;
    haloRef.current?.scale.setScalar(1 + 0.35 * w);
  });
  return (
    <group position={lm.p}>
      <mesh material={core} renderOrder={18}><sphereGeometry args={[0.0042, 20, 14]} /></mesh>
      <mesh ref={haloRef} material={halo} renderOrder={17}><sphereGeometry args={[0.0085, 20, 14]} /></mesh>
    </group>
  );
}

type Attach = (frame: FrameId) => (o: THREE.Object3D | null) => void;
const AtLandmark = ({ id, attach, onSkin, children }: { id: LandmarkId; attach: Attach; onSkin: boolean; children: (lm: Landmark) => React.ReactNode }) => {
  const lm = LM[id];
  if (!lm) return null;
  const at = onSkin && lm.skin ? { ...lm, p: lm.skin } : lm;
  return <group ref={attach(lm.frame)}>{children(at)}</group>;
};

export function TestOverlay({ attach }: { attach: Attach }) {
  const mode = useStore((s) => s.mode);
  const onSkin = useStore((s) => s.present !== 'bones'); // markers sit on the skin whenever the skin is drawn
  const id = useStore((s) => s.player.id);
  const showPain = useStore(painShown);
  const forces = useStore((s) => s.frame.forces);
  const contacts = useStore((s) => s.frame.contacts);
  if (mode !== 'test' || !id) return null;
  const test = TESTS.find((t) => t.id === id);
  return (
    <>
      {forces.map((f, i) => (
        <AtLandmark key={`f${i}${f.at}${f.dir}${onSkin}`} id={f.at} attach={attach} onSkin={onSkin}>
          {(lm) => (f.dir.startsWith('rotate') ? <ArcArrow lm={lm} f={f} /> : <StraightArrow lm={lm} f={f} />)}
        </AtLandmark>
      ))}
      {contacts.map((c) => <AtLandmark key={`c${c}${onSkin}`} id={c} attach={attach} onSkin={onSkin}>{(lm) => <Pad lm={lm} />}</AtLandmark>)}
      {showPain && test?.painZones.map((z) => <AtLandmark key={`p${z}${onSkin}`} id={z} attach={attach} onSkin={onSkin}>{(lm) => <PainGlow lm={lm} />}</AtLandmark>)}
    </>
  );
}
