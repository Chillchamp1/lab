// The object an exercise is done with (dumbbell, hammer, soft ball, bottle), built from simple shapes and placed in
// the fist. It hangs on the 'mid' frame (metacarpals), so it follows the wrist; the left hand mirrors it with the rig.
import { useMemo } from 'react';
import * as THREE from 'three';
import { guided, useStore } from '../state/store';
import { findProgram } from '../model/exercises';
import type { FrameId } from './anatomy';
import { BALL, BOTTLE, DUMBBELL, GRIP, GRIP_X, GRIP_Y, GRIP_Z, HAMMER, type PropId } from './props';

type Attach = (frame: FrameId) => (o: THREE.Object3D | null) => void;

const GRIP_Q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(...GRIP_X), new THREE.Vector3(...GRIP_Y), new THREE.Vector3(...GRIP_Z)));
const ALONG_X: [number, number, number] = [0, 0, -Math.PI / 2]; // three.js cylinders stand along Y; lay them along the grip

const steel = new THREE.MeshStandardMaterial({ color: '#9AA4A8', metalness: 0.55, roughness: 0.35 });
const iron = new THREE.MeshStandardMaterial({ color: '#3D464A', metalness: 0.4, roughness: 0.5 });
const woodMat = new THREE.MeshStandardMaterial({ color: '#B58A58', roughness: 0.7 });
const foam = new THREE.MeshStandardMaterial({ color: '#E0954A', roughness: 0.9 });
const plastic = new THREE.MeshStandardMaterial({ color: '#BFD9E6', roughness: 0.2, transparent: true, opacity: 0.32, depthWrite: false });
const water = new THREE.MeshStandardMaterial({ color: '#3F8FC4', roughness: 0.15, transparent: true, opacity: 0.6, depthWrite: false });
const cap = new THREE.MeshStandardMaterial({ color: '#2F6FB0', roughness: 0.6 });

// a cylinder between two positions on the grip axis
const Rod = ({ from, to, r, material, seg = 24, order }: { from: number; to: number; r: number; material: THREE.Material; seg?: number; order?: number }) => (
  <mesh position={[(from + to) / 2, 0, 0]} rotation={ALONG_X} material={material} renderOrder={order}>
    <cylinderGeometry args={[r, r, Math.abs(to - from), seg]} />
  </mesh>
);

function Dumbbell() {
  const { r, len, plateR, plateW } = DUMBBELL, h = len / 2;
  return (
    <>
      <Rod from={-h} to={h} r={r} material={steel} />
      {[-1, 1].map((s) => (
        <group key={s}>
          <Rod from={s * (h - plateW)} to={s * h} r={plateR} material={iron} seg={32} />
          <Rod from={s * (h - plateW - 0.006)} to={s * (h - plateW)} r={plateR * 0.55} material={steel} />
        </group>
      ))}
    </>
  );
}

function Hammer() {
  const { r, butt, top, head } = HAMMER;
  return (
    <>
      <Rod from={butt} to={top} r={r} material={woodMat} />
      <mesh position={[top, 0.012, 0]} material={iron}><boxGeometry args={head} /></mesh>
    </>
  );
}

function Bottle() {
  const { r, bottom, shoulder, neckR, neck, water: level } = BOTTLE;
  return (
    <>
      <Rod from={bottom + 0.002} to={level} r={r - 0.002} material={water} order={4} />
      <Rod from={bottom} to={shoulder} r={r} material={plastic} seg={32} order={5} />
      <mesh position={[shoulder + 0.012, 0, 0]} rotation={ALONG_X} material={plastic} renderOrder={5}><cylinderGeometry args={[neckR, r, 0.024, 32]} /></mesh>
      <Rod from={shoulder + 0.024} to={shoulder + 0.024 + neck} r={neckR} material={plastic} order={5} />
      <Rod from={shoulder + 0.024 + neck - 0.012} to={shoulder + 0.024 + neck + 0.003} r={neckR + 0.002} material={cap} />
    </>
  );
}

const SHAPES: Record<PropId, () => React.ReactNode> = {
  dumbbell: Dumbbell, hammer: Hammer, bottle: Bottle,
  ball: () => <mesh material={foam}><sphereGeometry args={[BALL.r, 32, 20]} /></mesh>,
};

export function HeldProp({ attach }: { attach: Attach }) {
  const mode = useStore((s) => s.mode), id = useStore((s) => s.player.id);
  const prop = guided(mode) ? findProgram(id)?.prop : undefined;
  const Shape = useMemo(() => (prop ? SHAPES[prop] : null), [prop]);
  if (!prop || !Shape) return null;
  return (
    <group ref={attach('mid')}>
      <group position={GRIP[prop]} quaternion={GRIP_Q}><Shape /></group>
    </group>
  );
}
