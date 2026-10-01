// The kinematic rig: nested pivot groups (HANDOVER 6.2) holding the BodyParts3D bones, plus ligament/tendon tubes.
// Every frame's content is in rig coordinates; a pivot is `group(position = pivot, rotation) → group(position = −pivot)`.
// All per-frame work happens in one useFrame: solve targets → damp → apply → update tubes.
import { Suspense, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useStore, stressOf } from '../state/store';
import { solveRig, type RigTargets } from '../model/kinematics';
import { strainRGB } from '../model/stress';
import type { StructureId } from '../model/structures';
import type { Anchor, FrameId, RigData, V3 } from './anatomy';
import rigJson from './rigdata.json';
import handUrl from '../assets/hand.glb?url';
import { useFrames } from './frames';
import { TestOverlay } from './TestOverlay';
import { Skin } from './Skin';
import { TESTS } from '../model/tests';
import { CUT_PLANE } from './Scene';
import { Limiters } from './Limiters';

const RIG = rigJson as unknown as RigData;
const PIVOT = RIG.pivots;
const D2R = Math.PI / 180;
const UNIT_TUBE = new THREE.CylinderGeometry(1, 1, 1, 48, 1, true);
const neg = (v: V3): V3 => [-v[0], -v[1], -v[2]];
const FOREARM_AXIS = new THREE.Vector3(...PIVOT.fovea).sub(new THREE.Vector3(...PIVOT.radialHead)).normalize();
const JOINT_AXES = RIG.fingers.map((f) => f.joints.map((j) => new THREE.Vector3(...j.axis)));
const ELBOW_AXIS = new THREE.Vector3(...RIG.elbow.axis);
const CMC = RIG.thumbCmc, CMC_RAD = new THREE.Vector3(...CMC.radAxis), CMC_PALM = new THREE.Vector3(...CMC.palmAxis);
const THUMB_RAD_DEG = 35, THUMB_PALM_DEG = 55;

const boneMat = new THREE.MeshStandardMaterial({ color: '#EDE3CC', roughness: 0.6, metalness: 0, side: THREE.DoubleSide });
const tfccMat = new THREE.MeshStandardMaterial({ roughness: 0.5 });
const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false });
const supportMat = new THREE.MeshStandardMaterial({ color: '#2F6FB0', roughness: 0.5, transparent: true, opacity: 0.38, side: THREE.DoubleSide, depthWrite: false });

const BONES_BY_FRAME = Object.entries(RIG.bones).reduce<Partial<Record<FrameId, string[]>>>((acc, [bone, frame]) => {
  (acc[frame] ??= []).push(bone);
  return acc;
}, {});

function BoneMeshes({ frame }: { frame: FrameId }) {
  const { nodes } = useGLTF(handUrl);
  return (
    <>
      {(BONES_BY_FRAME[frame] ?? []).map((b) => {
        const m = nodes[b] as THREE.Mesh;
        return <mesh key={b} geometry={m.geometry} material={boneMat} position={m.position} quaternion={m.quaternion} scale={m.scale} />;
      })}
    </>
  );
}

function Bones({ frame, visible }: { frame: FrameId; visible: boolean }) {
  return <group visible={visible}><Suspense fallback={null}><BoneMeshes frame={frame} /></Suspense></group>;
}

// Finger chain: each joint is a pivot at its centre, flexing about its own axis.
function Finger({ f, reg, jointRefs, showBones, cmcRef }: { f: number; reg: (id: FrameId) => (o: THREE.Object3D | null) => void; jointRefs: THREE.Group[][]; showBones: boolean; cmcRef: React.RefObject<THREE.Group | null> }) {
  const joints = RIG.fingers[f].joints;
  const build = (j: number): ReactNode => {
    if (j >= joints.length) return null;
    const fid = `f${f + 1}_${j + 1}` as FrameId;
    return (
      <group position={joints[j].c} ref={(o) => { if (o) jointRefs[f][j] = o; }}>
        <group position={neg(joints[j].c)} ref={reg(fid)}>
          <Bones frame={fid} visible={showBones} />
          {build(j + 1)}
        </group>
      </group>
    );
  };
  if (f !== 0) return <>{build(0)}</>;
  // thumb: the metacarpal sits on its own CMC pivot
  return (
    <group position={CMC.c} ref={cmcRef}>
      <group position={neg(CMC.c)} ref={reg('f1_0')}>
        <Bones frame="f1_0" visible={showBones} />
        {build(0)}
      </group>
    </group>
  );
}

type Cur = RigTargets;
const damp = THREE.MathUtils.damp;

export function Rig() {
  const { frames, reg, setRoot, preFrame } = useFrames();
  const scene = useThree((s) => s.scene);
  const layers = useStore((s) => s.layers);
  const supports = useStore((s) => s.supports);
  const select = useStore((s) => s.select);
  const endOn = useStore((s) => s.cut);
  const inTest = useStore((s) => s.mode === 'test');
  const present = useStore((s) => s.present);
  const testId = useStore((s) => s.player.id);
  const targets = useMemo(() => new Set(TESTS.find((t) => t.id === testId)?.targets ?? []), [testId]);
  // What is drawn: in a test, the app decides (presentation preset + only the structures the test examines);
  // in Explore, the user's layer toggles apply.
  const showBones = inTest ? present !== 'skin' : layers.bones;
  const xray = inTest ? present === 'xray' : layers.xray;
  const showBand = (b: { id: StructureId; kind: 'ligament' | 'tendon' }) =>
    inTest ? present !== 'skin' && targets.has(b.id) : b.kind === 'ligament' ? layers.ligaments : layers.tendons;
  const showTfcc = inTest ? present !== 'skin' && targets.has('tfcc') : layers.ligaments;

  const forearmRef = useRef<THREE.Group>(null), forearmInnerRef = useRef<THREE.Group>(null);
  const bandRef = useRef<THREE.Group>(null), grooveRef = useRef<THREE.Group | null>(null);
  const rcRef = useRef<THREE.Group>(null), scaphRef = useRef<THREE.Group>(null), mcRef = useRef<THREE.Group>(null);
  const rootRef = useRef<THREE.Group | null>(null), tfccRef = useRef<THREE.Mesh>(null);
  const elbowRef = useRef<THREE.Group>(null), triqRef = useRef<THREE.Group>(null), cmcRef = useRef<THREE.Group | null>(null);
  const attached = useMemo(() => new Map<THREE.Object3D, FrameId>(), []);
  const attach = useMemo(() => (frame: FrameId) => (o: THREE.Object3D | null) => { if (o) { o.matrixAutoUpdate = false; attached.set(o, frame); } }, [attached]);
  const qa = useMemo(() => new THREE.Quaternion(), []);

  // See-through bones: ligaments and tendons stay opaque and show through.
  useEffect(() => {
    boneMat.transparent = xray;
    boneMat.opacity = xray ? 0.42 : 1;
    boneMat.depthWrite = !xray;
    boneMat.side = xray ? THREE.FrontSide : THREE.DoubleSide;
    boneMat.needsUpdate = true;
  }, [xray]);
  // End-on view: cut bones and the TFCC disc at the DRUJ; everything else stays whole.
  useEffect(() => {
    for (const m of [boneMat, tfccMat]) { m.clippingPlanes = endOn ? [CUT_PLANE] : null; m.needsUpdate = true; }
  }, [endOn]);
  const jointRefs = useMemo(() => RIG.fingers.map(() => [] as THREE.Group[]), []);
  const bandMeshes = useRef<(THREE.Mesh | null)[]>([]);
  const hitMeshes = useRef<(THREE.Mesh | null)[]>([]);
  const liftMesh = useRef<THREE.Mesh>(null);
  const cur = useRef<Cur | null>(null);
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), inv: new THREE.Matrix4() }), []);

  const onPick = (id: StructureId) => (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6) return; // was an orbit drag
    e.stopPropagation();
    select(id);
  };

  useFrame(({ clock }, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1);
    preFrame.fn?.(dt); // pose the figure first so the rig's parent matrices are current
    const s = useStore.getState();
    const c = stressOf(s);
    const tg = solveRig(s.pose, s.hyper, s.supports, c, s.rowLag, s.frame.kin, s.frame.aux);
    if (!cur.current) cur.current = { ...tg };
    const k = cur.current;
    (Object.keys(tg) as (keyof Cur)[]).forEach((key) => (k[key] = damp(k[key], tg[key], 14, dt)));

    // forearm rotation about radial head → ulnar fovea; DRUJ translation + ulnar variance in the radius frame
    forearmRef.current!.quaternion.setFromAxisAngle(FOREARM_AXIS, k.forearm * D2R);
    forearmInnerRef.current!.position.set(-PIVOT.fovea[0], -PIVOT.fovea[1] - k.ulnarVar, -PIVOT.fovea[2] - k.drujShift);
    bandRef.current!.quaternion.setFromAxisAngle(FOREARM_AXIS, 0.5 * k.forearm * D2R); // skin turns about half as far
    grooveRef.current!.position.set(0.005 * k.ecuSublux, 0, -0.0085 * k.ecuSublux);

    rcRef.current!.position.set(PIVOT.radiocarpal[0] + k.rowSlide, PIVOT.radiocarpal[1], PIVOT.radiocarpal[2]);
    rcRef.current!.rotation.set((k.rcExt + k.rowExtra) * D2R, 0, -k.rcDev * D2R, 'ZXY');
    scaphRef.current!.position.set(PIVOT.scaphoid[0] - k.scaphoidGap, PIVOT.scaphoid[1], PIVOT.scaphoid[2] + k.scaphoidDorsal);
    triqRef.current!.position.set(0, 0, 0.0022 * k.ltShear * Math.sin(clock.elapsedTime * 2 * Math.PI * 1.1)); // LT ballottement
    elbowRef.current!.quaternion.setFromAxisAngle(ELBOW_AXIS, k.elbow * D2R);
    cmcRef.current?.quaternion.setFromAxisAngle(CMC_RAD, k.thumbRad * THUMB_RAD_DEG * D2R).multiply(qa.setFromAxisAngle(CMC_PALM, k.thumbPalm * THUMB_PALM_DEG * D2R));
    scaphRef.current!.rotation.set(k.scaphoidFlex * D2R, 0, 0);
    mcRef.current!.position.set(PIVOT.midcarpal[0], PIVOT.midcarpal[1], PIVOT.midcarpal[2] - k.sag);
    mcRef.current!.rotation.set((k.mcExt - k.rowExtra) * D2R, 0, -k.mcDev * D2R, 'ZXY');

    jointRefs.forEach((chain, f) => chain.forEach((g, j) => {
      const deg = f === 4 && j === 0 && k.littleExt > 1 ? -k.littleExt : k.fingers * RIG.fingers[f].joints[j].maxFlex;
      g.quaternion.setFromAxisAngle(JOINT_AXES[f][j], deg * D2R);
    }));

    // tubes: anchor points → rig-root space
    const root = rootRef.current!;
    scene.updateMatrixWorld(true);
    tmp.inv.copy(root.matrixWorld).invert();
    attached.forEach((frame, o) => {
      if (!o.parent) { attached.delete(o); return; } // unmounted overlay
      const f = frames.get(frame);
      if (f) o.matrix.multiplyMatrices(tmp.inv, f.matrixWorld);
    });
    const toRoot = (pts: Anchor[]) => pts.map(([f, p]) => {
      const o = frames.get(f);
      const v = new THREE.Vector3(...p);
      return o ? v.applyMatrix4(tmp.m.multiplyMatrices(tmp.inv, o.matrixWorld)) : v;
    });
    const tube = (mesh: THREE.Mesh, pts: Anchor[] | THREE.CatmullRomCurve3, radius: number, radial = 8) => {
      const curve = Array.isArray(pts) ? new THREE.CatmullRomCurve3(toRoot(pts), false, 'centripetal') : pts;
      mesh.geometry.dispose();
      mesh.geometry = new THREE.TubeGeometry(curve, Math.min(64, 4 * curve.points.length + 6), radius, radial, false);
      return curve;
    };
    RIG.bands.forEach((b, i) => {
      const mesh = bandMeshes.current[i];
      if (!mesh || !mesh.parent?.visible) return;
      const sel = s.selected === b.id;
      const curve = tube(mesh, b.pts, b.r * (sel ? 1.6 : 1) * (0.9 + 0.5 * Math.min(1, c.st[b.id])));
      const hit = hitMeshes.current[i];
      if (hit) tube(hit, curve, Math.max(0.004, 3 * b.r), 5); // fat invisible tube for touch picking
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.color.setRGB(...(strainRGB(c.st[b.id]).map((x) => x / 255) as V3), THREE.SRGBColorSpace);
      mat.emissive.set(sel ? '#3a6fb8' : '#000000');
    });
    if (liftMesh.current?.visible) tube(liftMesh.current, RIG.support.lift, 0.0032);
    const tf = tfccRef.current!.material as THREE.MeshStandardMaterial;
    tf.color.setRGB(...(strainRGB(c.st.tfcc).map((x) => x / 255) as V3), THREE.SRGBColorSpace);
    tf.emissive.set(s.selected === 'tfcc' ? '#3a6fb8' : '#000000');
  });

  const { band, wrap } = RIG.support;

  return (
    <group ref={(o) => { rootRef.current = o; setRoot(o); }}>
      {/* ulna = fixed reference */}
      <group ref={reg('ulna')}>
        <Bones frame="ulna" visible={showBones} />
        {/* humerus frame kept for landmarks; the mannequin's upper arm is drawn instead of the bone */}
        <group position={RIG.elbow.c} ref={elbowRef}>
          <group position={neg(RIG.elbow.c)} ref={reg('humerus')} />
        </group>
        <group ref={(o) => { grooveRef.current = o; reg('ecuGroove')(o); }} />
        <group position={PIVOT.fovea}>
          <group ref={bandRef}>
            <group position={neg(PIVOT.fovea)} ref={reg('bandFrame')}>
              <mesh geometry={UNIT_TUBE} material={supportMat} visible={layers.supports && supports.band}
                position={band.c} scale={[band.r[0], band.h, band.r[1]]} renderOrder={2} />
            </group>
          </group>
        </group>

        {/* PV_forearm: radius + hand rotate about radial head → ulnar fovea */}
        <group ref={forearmRef} position={PIVOT.fovea}>
          <group ref={forearmInnerRef}>
            <group ref={reg('radius')}>
              <Bones frame="radius" visible={showBones} />
              <mesh ref={tfccRef} position={RIG.tfcc.c} material={tfccMat} visible={showTfcc} onClick={onPick('tfcc')}>
                <cylinderGeometry args={[RIG.tfcc.r, RIG.tfcc.r * 0.85, RIG.tfcc.h, 28]} />
              </mesh>

              {/* PV_radiocarpal */}
              <group ref={rcRef}>
                <group position={neg(PIVOT.radiocarpal)} ref={reg('prox')}>
                  <Bones frame="prox" visible={showBones} />
                  <group ref={(o) => { triqRef.current = o; reg('triq')(o); }}>
                    <Bones frame="triq" visible={showBones} />
                  </group>
                  <mesh geometry={UNIT_TUBE} material={supportMat} visible={layers.supports && supports.wrap}
                    position={wrap.c} scale={[wrap.r[0], wrap.h, wrap.r[1]]} renderOrder={2} />
                  <group ref={scaphRef}>
                    <group position={neg(PIVOT.scaphoid)} ref={reg('scaphoid')}>
                      <Bones frame="scaphoid" visible={showBones} />
                    </group>
                  </group>

                  {/* PV_midcarpal */}
                  <group ref={mcRef}>
                    <group position={neg(PIVOT.midcarpal)} ref={reg('mid')}>
                      <Bones frame="mid" visible={showBones} />
                      {RIG.fingers.map((_, f) => <Finger key={f} f={f} reg={reg} jointRefs={jointRefs} showBones={showBones} cmcRef={cmcRef} />)}
                    </group>
                  </group>
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>

      {/* tubes live in rig-root space and are rebuilt every frame */}
      {RIG.bands.map((b, i) => (
        <group key={i} visible={showBand(b)}>
          <mesh ref={(m) => { bandMeshes.current[i] = m; }}>
            <bufferGeometry />
            <meshStandardMaterial roughness={0.45} />
          </mesh>
          <mesh ref={(m) => { hitMeshes.current[i] = m; }} material={hitMat} onClick={onPick(b.id)}>
            <bufferGeometry />
          </mesh>
        </group>
      ))}
      <Suspense fallback={null}><Skin rootRef={rootRef} /></Suspense>
      <TestOverlay attach={attach} />
      <Limiters attach={attach} />
      <mesh ref={liftMesh} material={supportMat} visible={layers.supports && supports.lift} renderOrder={2}>
        <bufferGeometry />
      </mesh>
    </group>
  );
}

useGLTF.preload(handUrl);
