// Skin of the forearm and hand (BodyParts3D body skin, cropped by the pipeline), deformed on the CPU:
// every vertex follows up to two rig frames with the weights baked into skin.glb (_FRAME / _WEIGHT).
// ~16k vertices × 2 matrices per frame is cheap, and it keeps the skin independent of three.js skeleton rules.
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import skinUrl from '../assets/skin.glb?url';
import rigJson from './rigdata.json';
import type { FrameId, RigData } from './anatomy';
import { useFrames } from './frames';
import { useStore } from '../state/store';

const RIG = rigJson as unknown as RigData;
const FRAMES = RIG.skinFrames as FrameId[];

export const skinMat = new THREE.MeshStandardMaterial({ color: '#F0D3BE', roughness: 0.78, metalness: 0, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide });

export function Skin({ rootRef }: { rootRef: React.RefObject<THREE.Object3D | null> }) {
  const { scene } = useGLTF(skinUrl);
  const { frames } = useFrames();
  const present = useStore((s) => s.present);
  // GLTFLoader renames the mesh when it clashes with the scene name and lowercases custom attributes, so find it by type.
  const src = useMemo(() => { let g: THREE.BufferGeometry | null = null; scene.traverse((o) => { if (!g && (o as THREE.Mesh).isMesh) g = (o as THREE.Mesh).geometry; }); return g!; }, [scene]);

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setIndex(src.getIndex());
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(src.getAttribute('position').array), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(src.getAttribute('normal').array), 3));
    return g;
  }, [src]);
  const rest = useMemo(() => {
    // read through the accessors: the loader may interleave / pad the small custom attributes
    const fa = src.getAttribute('_frame'), wa = src.getAttribute('_weight'), n = fa.count;
    const f = new Uint8Array(n * 2), w = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) { f[2 * i] = fa.getX(i); f[2 * i + 1] = fa.getY(i); w[2 * i] = wa.getX(i); w[2 * i + 1] = wa.getY(i); }
    return { p: Float32Array.from(src.getAttribute('position').array), n: Float32Array.from(src.getAttribute('normal').array), f, w };
  }, [src]);
  const mats = useMemo(() => FRAMES.map(() => new THREE.Matrix4()), []);
  const tmp = useMemo(() => ({ inv: new THREE.Matrix4(), v: new THREE.Vector3(), n: new THREE.Vector3(), a: new THREE.Vector3(), b: new THREE.Vector3(), nm: FRAMES.map(() => new THREE.Matrix3()) }), []);
  const mesh = useRef<THREE.Mesh>(null);

  useEffect(() => {
    skinMat.opacity = present === 'skin' ? 1 : 0.3;
    skinMat.transparent = present !== 'skin';
    skinMat.depthWrite = present === 'skin';
    skinMat.needsUpdate = true;
  }, [present]);

  useFrame(() => {
    const root = rootRef.current;
    if (!root || present === 'bones') return;
    tmp.inv.copy(root.matrixWorld).invert();
    FRAMES.forEach((id, i) => { const o = frames.get(id); if (o) { mats[i].multiplyMatrices(tmp.inv, o.matrixWorld); tmp.nm[i].getNormalMatrix(mats[i]); } });
    const pos = geo.getAttribute('position') as THREE.BufferAttribute, nrm = geo.getAttribute('normal') as THREE.BufferAttribute;
    const P = pos.array as Float32Array, N = nrm.array as Float32Array;
    for (let i = 0, j = 0; i < rest.p.length; i += 3, j += 2) {
      const f0 = rest.f[j], f1 = rest.f[j + 1], w0 = rest.w[j], w1 = rest.w[j + 1];
      tmp.v.set(rest.p[i], rest.p[i + 1], rest.p[i + 2]);
      tmp.n.set(rest.n[i], rest.n[i + 1], rest.n[i + 2]);
      tmp.a.copy(tmp.v).applyMatrix4(mats[f0]).multiplyScalar(w0);
      tmp.b.copy(tmp.n).applyMatrix3(tmp.nm[f0]).multiplyScalar(w0);
      if (w1 > 0) {
        tmp.a.addScaledVector(tmp.v.applyMatrix4(mats[f1]), w1);
        tmp.b.addScaledVector(tmp.n.applyMatrix3(tmp.nm[f1]), w1);
      }
      P[i] = tmp.a.x; P[i + 1] = tmp.a.y; P[i + 2] = tmp.a.z;
      N[i] = tmp.b.x; N[i + 1] = tmp.b.y; N[i + 2] = tmp.b.z;
    }
    pos.needsUpdate = true; nrm.needsUpdate = true;
  });

  return <mesh ref={mesh} geometry={geo} material={skinMat} visible={present !== 'bones'} renderOrder={5} frustumCulled={false} />;
}

useGLTF.preload(skinUrl);
