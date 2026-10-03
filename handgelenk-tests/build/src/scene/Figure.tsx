// The mannequin: gender-neutral, standard adult proportions (1.72 m), seated on a chair / at a table or standing,
// posed per test step. Its right forearm and hand are not drawn: the detailed wrist rig is mounted at its right elbow.
// Figure faces +Z; its right side is −X. Left wrist = the whole scene mirrored (Scene.tsx).
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { guided, useStore } from '../state/store';
import type { Body } from '../model/tests';
import { findProgram } from '../model/exercises';
import { useFrames } from './frames';
import rigJson from './rigdata.json';
import type { FrameId, RigData, V3 } from './anatomy';
import { LANDMARKS } from './landmarks';
import { TOWEL } from './props';

const RIG = rigJson as unknown as RigData;
const D2R = Math.PI / 180;
const damp = THREE.MathUtils.damp;

// proportions (m)
const HEAD_R = 0.105, NECK = 0.05, TORSO = 0.50, SHOULDER_W = 0.19, HIP_W = 0.10;
const UPPER_ARM = 0.30, FOREARM = 0.26, HAND = 0.18, THIGH = 0.42, SHIN = 0.40, FOOT = 0.24;
export const SEAT_H = 0.45;

// back: the pad sits this far toward the elbow (the forearm lies on a short table and the wrist is past its edge)
export type Rest = { part: 'forearm' | 'hand' | 'fist'; dir: 'down' | 'up'; back?: number } | null;
// Leaning on the hands at the table: which point of the hand touches the table top, and how far the heel of the hand
// is propped up (deg). The body is then posed by a controller, see preFrame.
export type Press = { contact: 'palm' | 'towel' | 'fist'; wedge: number };
const TABLE_DEPTH = 0.64, TABLE_NEAR = 0.10; // full table: its near edge is 10 cm in front of the hips
export type Scene = {
  chair: boolean; table?: number; tableDepth?: number; rest: Rest; press?: Press;
  pelvis: [number, number, number]; lean: number; hip: number; knee: number;
  shoulderR: [number, number]; shoulderL: [number, number]; elbowL: number; // [flex, abduct] deg
};
export const SCENES: Record<Body, Scene> = {
  seated_table: { chair: true, table: 0.72, rest: { part: 'forearm', dir: 'down' }, pelvis: [0, SEAT_H + 0.08, 0], lean: 4, hip: 90, knee: 90, shoulderR: [25, 8], shoulderL: [15, 6], elbowL: 70 },
  // short table: the forearm lies on it, the wrist and hand are free beyond its far edge (exercises with a weight)
  seated_table_edge: { chair: true, table: 0.72, tableDepth: 0.235, rest: { part: 'forearm', dir: 'down', back: 0.05 }, pelvis: [0, SEAT_H + 0.08, 0], lean: 4, hip: 90, knee: 90, shoulderR: [25, 8], shoulderL: [15, 6], elbowL: 70 },
  seated_elbow_vertical: { chair: true, table: 0.72, rest: null, pelvis: [0, SEAT_H + 0.08, 0], lean: 10, hip: 90, knee: 90, shoulderR: [45, 10], shoulderL: [15, 6], elbowL: 70 },
  seated_under_table: { chair: true, table: 0.80, rest: { part: 'hand', dir: 'up' }, pelvis: [0, SEAT_H + 0.08, 0], lean: 0, hip: 90, knee: 90, shoulderR: [8, 6], shoulderL: [8, 6], elbowL: 90 },
  chair_press: { chair: true, rest: { part: 'hand', dir: 'down' }, pelvis: [0, SEAT_H + 0.08, 0], lean: 2, hip: 90, knee: 90, shoulderR: [-18, 14], shoulderL: [-18, 14], elbowL: 20 },
  chair_press_up: { chair: true, rest: { part: 'hand', dir: 'down' }, pelvis: [0, SEAT_H + 0.16, 0], lean: 2, hip: 85, knee: 85, shoulderR: [-18, 14], shoulderL: [-18, 14], elbowL: 0 },
  standing: { chair: false, rest: null, pelvis: [0, 0.92, 0], lean: 0, hip: 0, knee: 0, shoulderR: [90, 5], shoulderL: [5, 5], elbowL: 10 },
  // standing at the table, body straight and tilted forward, both hands on the top (pelvis, lean, hips, arms: preFrame)
  standing_table_fists: { chair: false, table: 0.72, rest: { part: 'fist', dir: 'down' }, press: { contact: 'fist', wedge: 0 }, pelvis: [0, 0.8, -0.45], lean: -25, hip: -25, knee: 0, shoulderR: [25, 6], shoulderL: [25, 6], elbowL: 0 },
  standing_table_towel: { chair: false, table: 0.72, rest: { part: 'hand', dir: 'down' }, press: { contact: 'towel', wedge: 20 }, pelvis: [0, 0.75, -0.5], lean: -32, hip: -32, knee: 0, shoulderR: [65, 6], shoulderL: [65, 6], elbowL: 0 },
  standing_table_flat: { chair: false, table: 0.72, rest: { part: 'hand', dir: 'down' }, press: { contact: 'palm', wedge: 0 }, pelvis: [0, 0.75, -0.5], lean: -32, hip: -32, knee: 0, shoulderR: [75, 6], shoulderL: [75, 6], elbowL: 0 },
};

// where each contact point sits in its bone frame, and how high above the table top it should end up
const CONTACT: Record<Press['contact'], { frame: FrameId; p: V3; lift: number }> = {
  palm: { frame: 'mid', p: LANDMARKS.hand_palmar.skin!, lift: 0.002 },
  towel: { frame: 'mid', p: TOWEL.c, lift: TOWEL.r },
  fist: { frame: 'f3_1', p: LANDMARKS.fist_knuckles.skin!, lift: 0.002 },
};
const LEG_LEN = 0.82, FOOT_H = 0.06; // hip to sole when the leg is straight
const HAND_Z = 0.27; // where the hands land on the table top (world z; the top runs from 0.10 to 0.74)
export const currentBody = (): Body => {
  const s = useStore.getState();
  if (!guided(s.mode)) return 'seated_table';
  return findProgram(s.player.id)?.steps[s.player.step]?.body ?? 'seated_table';
};

// Rig frame (+X ulnar, +Y distal, +Z dorsal) → elbow frame of the hanging right arm (palm medial, thumb forward):
// ulnar → backward (−Z), distal → down (−Y), dorsal → lateral (−X for the right arm).
const MOUNT_Q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, -1, 0), new THREE.Vector3(-1, 0, 0)));
const MOUNT_P = new THREE.Vector3(...RIG.elbow.c).applyQuaternion(MOUNT_Q).multiplyScalar(-1);

// transparent from the start: three.js compiles opacity support into the shader, so it cannot be switched on later
const bodyMat = new THREE.MeshStandardMaterial({ color: '#B9B2A6', roughness: 0.75, transparent: true });
const wood = new THREE.MeshStandardMaterial({ color: '#8E7A62', roughness: 0.85, transparent: true });
// the table is see-through so the arm stays visible from every side
const glassTop = new THREE.MeshStandardMaterial({ color: '#8E7A62', roughness: 0.6, transparent: true, opacity: 0.38, depthWrite: false });
const glassLeg = new THREE.MeshStandardMaterial({ color: '#5E5042', roughness: 0.6, transparent: true, opacity: 0.3, depthWrite: false });
const woodDark = new THREE.MeshStandardMaterial({ color: '#5E5042', roughness: 0.85, transparent: true });

const Seg = ({ len, r, children }: { len: number; r: number; children?: ReactNode }) => (
  <>
    <mesh position={[0, -len / 2, 0]} material={bodyMat}><capsuleGeometry args={[r, Math.max(len - 2 * r, 0.01), 6, 12]} /></mesh>
    <group position={[0, -len, 0]}>{children}</group>
  </>
);

type Refs = React.MutableRefObject<Record<string, THREE.Group | null>>;

function Arm({ side, refs, children }: { side: 1 | -1; refs: Refs; children?: ReactNode }) {
  const k = side === -1 ? 'R' : 'L'; // the figure's right arm is on −X
  return (
    <group position={[side * SHOULDER_W, TORSO, 0]} ref={(o) => { refs.current[`sh${k}`] = o; }}>
      <Seg len={UPPER_ARM} r={0.045}>
        <group ref={(o) => { refs.current[`el${k}`] = o; }}>
          {k === 'R' ? (
            <group position={MOUNT_P} quaternion={MOUNT_Q}>{children}</group>
          ) : (
            <Seg len={FOREARM} r={0.038}>
              <group ref={(o) => { refs.current.wrL = o; }}>
                <mesh position={[0, -HAND / 2, 0]} material={bodyMat}><boxGeometry args={[0.028, HAND, 0.085]} /></mesh>
                <mesh position={[0, -0.05, 0.055]} rotation={[-0.5, 0, 0]} material={bodyMat}><capsuleGeometry args={[0.013, 0.05, 4, 8]} /></mesh>
              </group>
            </Seg>
          )}
        </group>
      </Seg>
    </group>
  );
}

function Leg({ side, refs }: { side: 1 | -1; refs: Refs }) {
  const k = side === -1 ? 'R' : 'L';
  return (
    <group position={[side * HIP_W, 0, 0]} ref={(o) => { refs.current[`hip${k}`] = o; }}>
      <Seg len={THIGH} r={0.07}>
        <group ref={(o) => { refs.current[`kn${k}`] = o; }}>
          <Seg len={SHIN} r={0.05}>
            <mesh position={[0, -0.03, FOOT / 2 - 0.05]} material={bodyMat}><boxGeometry args={[0.09, 0.06, FOOT]} /></mesh>
          </Seg>
        </group>
      </Seg>
    </group>
  );
}

function Props({ refs }: { refs: Refs }) {
  return (
    <>
      <group ref={(o) => { refs.current.chair = o; }}>
        <mesh position={[0, SEAT_H - 0.02, 0]} material={wood}><boxGeometry args={[0.46, 0.04, 0.46]} /></mesh>
        <mesh position={[0, SEAT_H + 0.22, -0.22]} material={wood}><boxGeometry args={[0.46, 0.44, 0.03]} /></mesh>
        {[[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]].map(([x, z]) => (
          <mesh key={`${x}${z}`} position={[x, SEAT_H / 2 - 0.02, z]} material={woodDark}><boxGeometry args={[0.035, SEAT_H - 0.04, 0.035]} /></mesh>
        ))}
      </group>
      <group ref={(o) => { refs.current.table = o; }}>
        {/* the top is stretched and the far legs are moved to the scene's table depth */}
        <group ref={(o) => { refs.current.tableTop = o; }} position={[0, -0.02, TABLE_NEAR + TABLE_DEPTH / 2]}>
          <mesh material={glassTop} renderOrder={3}><boxGeometry args={[1.0, 0.04, TABLE_DEPTH]} /></mesh>
        </group>
        {[-0.45, 0.45].map((x) => (
          <mesh key={x} position={[x, -0.4, TABLE_NEAR + 0.05]} material={glassLeg} renderOrder={3}><boxGeometry args={[0.04, 0.72, 0.04]} /></mesh>
        ))}
        <group ref={(o) => { refs.current.tableFar = o; }}>
          {[-0.45, 0.45].map((x) => (
            <mesh key={x} position={[x, -0.4, TABLE_NEAR + TABLE_DEPTH - 0.05]} material={glassLeg} renderOrder={3}><boxGeometry args={[0.04, 0.72, 0.04]} /></mesh>
          ))}
        </group>
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0.3]}>
        <circleGeometry args={[1.6, 48]} />
        <meshStandardMaterial color="#CFD6D6" roughness={1} />
      </mesh>
    </>
  );
}

export function Figure({ children }: { children?: ReactNode }) {
  const refs = useRef<Record<string, THREE.Group | null>>({});
  const root = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Group>(null);
  const cur = useRef<Record<string, number>>({});
  const { preFrame, root: rigRoot, frames } = useFrames();
  const lean = useRef({ on: false, beta: 30, z: -0.5 }); // leaning controller state: body tilt (deg), pelvis z
  const tmpV = useMemo(() => new THREE.Vector3(), []);
  const camera = useThree((s) => s.camera);
  const wristPos = useMemo(() => new THREE.Vector3(), []);
  const go = useMemo(() => (key: string, target: number, dt: number) => (cur.current[key] = damp(cur.current[key] ?? target, target, 10, dt)), []);

  useEffect(() => {
    preFrame.fn = (dt) => {
      const s = useStore.getState();
      const body = currentBody(), sc = SCENES[body];
      const r = refs.current;
      if (!root.current || !torso.current || !r.shR) return;
      // Examined arm: where the limb rests, the shoulder and elbow angles follow from the furniture height so the
      // forearm really lies on the table (or presses against its underside, or the elbow stands on it).
      const T = sc.table, shoulderY = sc.pelvis[1] + TORSO * Math.cos(sc.lean * D2R);
      const flexFor = (elbowY: number) => Math.acos(Math.max(-1, Math.min(1, (shoulderY - elbowY) / UPPER_ARM))) / D2R;
      let shF = sc.shoulderR[0], elbow = s.frame.aux.elbow;
      if (T && sc.rest?.part === 'forearm') { shF = flexFor(T + 0.042); elbow = 93.5 - shF; } // forearm on the top, tapering to the wrist
      else if (T && sc.rest?.dir === 'up') { shF = flexFor(T - 0.065); elbow = 90 - shF; } // forearm under the top, palm against it
      else if (T && body === 'seated_elbow_vertical') { shF = flexFor(T + 0.03); elbow = 172 - shF; } // elbow on the top, forearm up
      let pelvis = sc.pelvis, leanDeg = sc.lean, hip = sc.hip, shL = sc.shoulderL[0], elL = sc.elbowL, wristL = 0;
      // Leaning on the hands: the body is a straight plank pivoting at the feet. A flat hand fixes the arm angle
      // (arm angle from vertical = 90° − wrist extension − towel tilt; a fist needs an upright forearm). Two small
      // controllers then tilt the plank and move the feet until the contact point lies on the table top at HAND_Z.
      const L = lean.current;
      if (sc.press && T) {
        const P = sc.press, C = CONTACT[P.contact];
        if (!L.on) { L.on = true; L.beta = -sc.lean; L.z = sc.pelvis[2]; }
        const alpha = P.contact === 'fist' ? 0 : Math.max(0, 90 - s.pose.ext - P.wedge);
        const f = frames.get(C.frame);
        if (f) {
          tmpV.set(...C.p).applyMatrix4(f.matrixWorld);
          L.beta = Math.max(5, Math.min(60, L.beta + Math.max(-1.5, Math.min(1.5, (tmpV.y - T - C.lift) * 500 * dt))));
          L.z += Math.max(-0.02, Math.min(0.02, (HAND_Z - tmpV.z) * 3 * dt));
        }
        pelvis = [0, LEG_LEN * Math.cos(L.beta * D2R) + FOOT_H, L.z];
        leanDeg = -L.beta; hip = -L.beta;
        shF = alpha + L.beta; shL = shF; elbow = 0; elL = 0;
        wristL = P.contact === 'fist' ? 0 : 90 - alpha; // the plain left hand lies flat too
      } else L.on = false;
      root.current.position.set(go('px', pelvis[0], dt), go('py', pelvis[1], dt), go('pz', pelvis[2], dt));
      torso.current.rotation.x = -go('lean', leanDeg, dt) * D2R;
      for (const k of ['R', 'L'] as const) {
        r[`hip${k}`]!.rotation.x = -go(`hip${k}`, hip, dt) * D2R;
        r[`kn${k}`]!.rotation.x = go(`kn${k}`, sc.knee, dt) * D2R;
      }
      r.shR!.rotation.set(-go('shRf', shF, dt) * D2R, 0, -go('shRa', sc.shoulderR[1], dt) * D2R);
      r.shL!.rotation.set(-go('shLf', shL, dt) * D2R, 0, go('shLa', sc.shoulderL[1], dt) * D2R);
      r.elR!.rotation.x = -go('elR', elbow, dt) * D2R;
      r.elL!.rotation.x = -go('elL', elL, dt) * D2R;
      // the left hand turns palm down (about the forearm) and bends back by the same angle as the right wrist
      const wl = go('wrL', wristL, dt), turn = go('wrLt', sc.press ? 1 : 0, dt);
      r.wrL?.rotation.set(-wl * D2R, turn * Math.PI / 2, 0);
      // Close-ups: the body and the chair fade to a faint ghost as the camera nears the wrist, so the view is never
      // cluttered by (or stuck inside) the mannequin; from about a metre away the whole figure is solid.
      const d = rigRoot.current ? camera.position.distanceTo(rigRoot.current.getWorldPosition(wristPos)) : 2;
      const a = go('fade', Math.max(0, Math.min(1, (d - 0.45) / 0.55)), dt);
      for (const m of [bodyMat, wood, woodDark]) { m.opacity = 0.1 + 0.9 * a; m.depthWrite = a > 0.6; }
      glassTop.opacity = 0.16 + 0.22 * a; glassLeg.opacity = 0.06 + 0.24 * a;
      r.chair!.visible = sc.chair;
      r.table!.visible = !!sc.table;
      if (sc.table) r.table!.position.y = go('tableY', sc.table, dt);
      const depth = go('tableD', sc.tableDepth ?? TABLE_DEPTH, dt);
      r.tableTop!.scale.z = depth / TABLE_DEPTH;
      r.tableTop!.position.z = TABLE_NEAR + depth / 2;
      r.tableFar!.position.z = depth - TABLE_DEPTH;
    };
    return () => { preFrame.fn = null; };
  }, [preFrame, go, camera, rigRoot, wristPos, frames, tmpV]);

  return (
    <>
      <group ref={root}>
        <group ref={torso}>
          <mesh position={[0, TORSO / 2, 0]} material={bodyMat} scale={[1, 1, 0.72]}><capsuleGeometry args={[0.15, TORSO - 0.3, 6, 14]} /></mesh>
          <mesh position={[0, TORSO + NECK + HEAD_R, 0]} material={bodyMat} scale={[0.9, 1.1, 1]}><sphereGeometry args={[HEAD_R, 20, 14]} /></mesh>
          <Arm side={-1} refs={refs}>{children}</Arm>
          <Arm side={1} refs={refs} />
        </group>
        <Leg side={-1} refs={refs} />
        <Leg side={1} refs={refs} />
      </group>
      <Props refs={refs} />
    </>
  );
}
