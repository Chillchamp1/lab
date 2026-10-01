// Input spec for the bone pipeline (scripts/build-bones.mjs) and shared types.
// Rig frame (right hand): metres, +X ulnar, +Y distal, +Z dorsal, origin at the lunate centroid, forearm in
// neutral rotation (thumb up). The pipeline turns this spec into src/scene/rigdata.json + src/assets/hand.glb.
// Keep this file free of non-erasable TypeScript so Node can import it directly.
import type { StructureId } from '../model/structures';

export type V3 = [number, number, number];

export type FrameId =
  | 'humerus' | 'ulna' | 'radius' | 'bandFrame' | 'ecuGroove' | 'prox' | 'triq' | 'scaphoid' | 'mid' | 'f1_0'
  | `f${1 | 2 | 3 | 4 | 5}_${1 | 2 | 3}`;

// BodyParts3D 4.0 element file ids (PART-OF tree, right side) → bone name → rig frame.
export const BONES: Record<string, { fj: string; frame: FrameId }> = {
  humerus: { fj: 'FJ3368', frame: 'humerus' },
  ulna: { fj: 'FJ3391', frame: 'ulna' },
  radius: { fj: 'FJ3349', frame: 'radius' },
  scaphoid: { fj: 'FJ3383', frame: 'scaphoid' },
  lunate: { fj: 'FJ3374', frame: 'prox' },
  triquetrum: { fj: 'FJ3390', frame: 'triq' },
  pisiform: { fj: 'FJ3382', frame: 'triq' },
  trapezium: { fj: 'FJ3388', frame: 'mid' },
  trapezoid: { fj: 'FJ3389', frame: 'mid' },
  capitate: { fj: 'FJ3361', frame: 'mid' },
  hamate: { fj: 'FJ3367', frame: 'mid' },
  mc1: { fj: 'FJ3350', frame: 'f1_0' }, mc2: { fj: 'FJ3352', frame: 'mid' }, mc3: { fj: 'FJ3354', frame: 'mid' },
  mc4: { fj: 'FJ3356', frame: 'mid' }, mc5: { fj: 'FJ3358', frame: 'mid' },
  pp1: { fj: 'FJ3327', frame: 'f1_1' }, dp1: { fj: 'FJ3198', frame: 'f1_2' },
  pp2: { fj: 'FJ3322', frame: 'f2_1' }, mp2: { fj: 'FJ3303', frame: 'f2_2' }, dp2: { fj: 'FJ3193', frame: 'f2_3' },
  pp3: { fj: 'FJ3325', frame: 'f3_1' }, mp3: { fj: 'FJ3306', frame: 'f3_2' }, dp3: { fj: 'FJ3196', frame: 'f3_3' },
  pp4: { fj: 'FJ3326', frame: 'f4_1' }, mp4: { fj: 'FJ3292', frame: 'f4_2' }, dp4: { fj: 'FJ3197', frame: 'f4_3' },
  pp5: { fj: 'FJ3323', frame: 'f5_1' }, mp5: { fj: 'FJ3304', frame: 'f5_2' }, dp5: { fj: 'FJ3194', frame: 'f5_3' },
};
export const FINGERS = [['mc1', 'pp1', 'dp1'], ['mc2', 'pp2', 'mp2', 'dp2'], ['mc3', 'pp3', 'mp3', 'dp3'], ['mc4', 'pp4', 'mp4', 'dp4'], ['mc5', 'pp5', 'mp5', 'dp5']];
export const FINGER_FLEX = [[45, 70], [85, 100, 70], [85, 100, 70], [85, 100, 70], [85, 100, 70]]; // deg at full curl

// Anchor: a rough point in rig coordinates that the pipeline snaps onto the nearest bone surface of that frame,
// or a point along a bone (t = 0 proximal end … 1 distal end) on its palmar or dorsal surface.
export type BoneAnchor = { bone: string; t: number; side: 'palmar' | 'dorsal' };
export type AnchorSpec = [FrameId, V3 | BoneAnchor];
export type Anchor = [FrameId, V3];
export type BandSpec<A = AnchorSpec> = { id: StructureId; kind: 'ligament' | 'tendon'; r: number; pts: A[] };

const pp = (n: number, t: number, side: 'palmar' | 'dorsal'): AnchorSpec => [`f${n}_1` as FrameId, { bone: `pp${n}`, t, side }];
const mp = (n: number, t: number, side: 'palmar' | 'dorsal'): AnchorSpec => [`f${n}_2` as FrameId, { bone: `mp${n}`, t, side }];
const dp = (n: number, t: number, side: 'palmar' | 'dorsal'): AnchorSpec => [`f${n}_3` as FrameId, { bone: `dp${n}`, t, side }];
const mc = (n: number, t: number, side: 'palmar' | 'dorsal'): AnchorSpec => ['mid', { bone: `mc${n}`, t, side }];

export const BAND_SPECS: BandSpec[] = [
  { id: 'sl', kind: 'ligament', r: 0.0014, pts: [['scaphoid', [-0.0095, 0.002, 0.006]], ['prox', [-0.0055, 0.002, 0.006]]] },
  { id: 'lt', kind: 'ligament', r: 0.0014, pts: [['prox', [0.0055, 0.002, 0.006]], ['triq', [0.0095, 0.003, 0.006]]] },
  { id: 'dorsal', kind: 'ligament', r: 0.0012, pts: [['radius', [-0.012, -0.010, 0.010]], ['prox', [0.003, 0.0, 0.0088]], ['triq', [0.013, 0.004, 0.0068]]] },
  { id: 'dorsal', kind: 'ligament', r: 0.0012, pts: [['triq', [0.014, 0.006, 0.0062]], ['mid', [0.004, 0.016, 0.0072]], ['scaphoid', [-0.017, 0.012, 0.0045]]] },
  { id: 'volar', kind: 'ligament', r: 0.0013, pts: [['radius', [-0.024, -0.010, -0.0065]], ['scaphoid', [-0.015, 0.004, -0.0078]], ['mid', [-0.002, 0.018, -0.0068]]] },
  { id: 'volar', kind: 'ligament', r: 0.0013, pts: [['radius', [-0.010, -0.010, -0.0102]], ['prox', [-0.002, -0.001, -0.0095]]] },
  { id: 'ulnocarpal', kind: 'ligament', r: 0.0012, pts: [['ulna', [0.011, -0.011, -0.0065]], ['prox', [0.003, 0.0, -0.0092]]] },
  { id: 'ulnocarpal', kind: 'ligament', r: 0.0012, pts: [['ulna', [0.014, -0.010, -0.0062]], ['triq', [0.0135, 0.002, -0.0065]]] },
  { id: 'druj', kind: 'ligament', r: 0.0013, pts: [['radius', [0.004, -0.013, 0.0078]], ['ulna', [0.013, -0.012, 0.0042]]] },
  { id: 'druj', kind: 'ligament', r: 0.0013, pts: [['radius', [0.004, -0.013, -0.0078]], ['ulna', [0.013, -0.012, -0.0062]]] },
  { id: 'midcarpal', kind: 'ligament', r: 0.0012, pts: [['triq', [0.0125, 0.006, -0.0052]], ['mid', [0.009, 0.016, -0.0068]], ['mid', [0.001, 0.016, -0.0062]]] },
  { id: 'ecu', kind: 'tendon', r: 0.0016, pts: [['ulna', [0.019, -0.15, 0.004]], ['ulna', [0.019, -0.04, 0.0062]], ['ecuGroove', [0.0175, -0.019, 0.0088]], ['triq', [0.019, 0.004, 0.0062]], mc(5, 0.05, 'dorsal')] },
  { id: 'fcu', kind: 'tendon', r: 0.0017, pts: [['ulna', [0.017, -0.15, -0.009]], ['ulna', [0.017, -0.035, -0.0112]], ['triq', [0.016, 0.004, -0.0128]]] },
  { id: 'flexors', kind: 'tendon', r: 0.0014, pts: [['radius', [-0.004, -0.15, -0.010]], ['radius', [-0.004, -0.030, -0.0128]], ['prox', [-0.003, 0.002, -0.0128]], mc(3, 0.2, 'palmar'), mc(3, 0.95, 'palmar'), pp(3, 0.5, 'palmar'), mp(3, 0.5, 'palmar'), dp(3, 0.3, 'palmar')] },
  { id: 'flexors', kind: 'tendon', r: 0.0013, pts: [['radius', [0.001, -0.15, -0.010]], ['radius', [0.001, -0.030, -0.0128]], ['prox', [0.003, 0.002, -0.0128]], mc(4, 0.2, 'palmar'), mc(4, 0.95, 'palmar'), pp(4, 0.5, 'palmar'), mp(4, 0.5, 'palmar'), dp(4, 0.3, 'palmar')] },
  { id: 'extensors', kind: 'tendon', r: 0.0014, pts: [['radius', [-0.006, -0.15, 0.010]], ['radius', [-0.008, -0.025, 0.0128]], ['prox', [-0.002, 0.002, 0.0115]], mc(3, 0.2, 'dorsal'), mc(3, 0.95, 'dorsal'), pp(3, 0.5, 'dorsal'), mp(3, 0.4, 'dorsal')] },
  { id: 'extensors', kind: 'tendon', r: 0.0016, pts: [['radius', [-0.013, -0.15, 0.009]], ['radius', [-0.015, -0.024, 0.0125]], ['scaphoid', [-0.016, 0.010, 0.0062]], mc(3, 0.06, 'dorsal')] },
];

// Generated by the pipeline (rigdata.json)
export type LandmarkId =
  | 'ulnar_fovea' | 'ulnar_head_dorsal' | 'ulnar_styloid' | 'ecu_groove' | 'pisiform' | 'triquetrum_dorsal'
  | 'lt_interval_dorsal' | 'sl_interval_dorsal' | 'scaphoid_tubercle' | 'midcarpal_ulnar_dorsal' | 'ulnocarpal_volar'
  | 'druj_dorsal' | 'druj_volar' | 'carpal_tunnel' | 'lateral_epicondyle';
export type Landmark = { frame: FrameId; p: V3; n: V3; skin?: V3 };

export type RigData = {
  source: string;
  pivots: { radialHead: V3; fovea: V3; radiocarpal: V3; midcarpal: V3; scaphoid: V3 };
  elbow: { c: V3; axis: V3 };
  thumbCmc: { c: V3; radAxis: V3; palmAxis: V3 };
  landmarks: Record<LandmarkId, Landmark>;
  skinFrames: FrameId[];
  tfcc: { c: V3; r: number; h: number };
  fingers: { joints: { c: V3; axis: V3; maxFlex: number }[] }[];
  bones: Record<string, FrameId>;
  bands: BandSpec<Anchor>[];
  support: {
    band: { c: V3; r: [number, number]; h: number };
    wrap: { c: V3; r: [number, number]; h: number };
    lift: Anchor[];
  };
};
