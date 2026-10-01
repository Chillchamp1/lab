// Procedural wrist kinematics (HANDOVER 3.4). Pure function: pose + flags → joint targets.
// Angles in degrees, translations in metres, rig frame: +X ulnar, +Y distal, +Z dorsal (right hand).
import type { Pose, Supports } from './pose';
import type { Stress } from './stress';
import type { Aux, Kin } from './tests';

export const K = {
  rcExt: 0.66, // share of extension at the radiocarpal joint (Sarrafian 1977)
  rcFlex: 0.4, // share of flexion at the radiocarpal joint
  rcDev: 0.45, // share of deviation at the radiocarpal joint
  rowDevCoupling: 0.5, // proximal row ext(+)/flex(−) per degree of ulnar(+)/radial(−) deviation
  rowSlide: 0.00006, // m per degree of deviation; the row slides opposite to the hand
  drujMax: 0.0028, // m ulnar-head translation at druj = 1
  ulnarVariance: 0.0012, // m extra ulnar variance at full pronation + full grip
  sag: 0.003, // m palmar midcarpal sag at sag = 1
  visi: 12, // deg proximal-row flexion at sag = 1
  slGap: 0.0018, // m scaphoid drift at slGap = 1
  scaphoidRadialFlex: 15, // deg extra scaphoid flexion at full radial deviation
  clunkAtDev: 6, // deg ulnar deviation where the lagging proximal row snaps (hypermobile)
  clunkLoad: 30, // % load needed for the catch-up clunk
};

export type RigTargets = {
  forearm: number; drujShift: number; ulnarVar: number;
  rcExt: number; rcDev: number; rowExtra: number; rowSlide: number;
  mcExt: number; mcDev: number; sag: number;
  scaphoidGap: number; scaphoidFlex: number;
  ecuSublux: number; fingers: number;
  scaphoidDorsal: number; ltShear: number;
  elbow: number; thumbRad: number; thumbPalm: number; littleExt: number;
};

// `kin` carries findings a clinical test demonstrates (DRUJ shift, ECU snap, sag …); free mode passes {}.
export function solveRig(p: Pose, hyper: boolean, sup: Supports, c: Stress, rowLag: boolean, kin: Kin, aux: Aux): RigTargets {
  const lax = hyper ? 1 : 0;
  const rcExt = p.ext >= 0 ? K.rcExt * p.ext : K.rcFlex * p.ext;
  const rcDev = K.rcDev * p.dev;
  const visi = K.visi * c.sag;
  // While the row lags (hypermobile, loaded, coming from radial deviation) it stays flexed as in radial deviation.
  const coupled = rowLag ? K.rowDevCoupling * -15 - 4 : K.rowDevCoupling * p.dev;
  const rowExtra = coupled - visi - K.visi * (kin.proximalRowFlex ?? 0) * (sup.lift ? 0.4 : 1);
  const drujSign = p.rot <= 0 ? 1 : -1; // pronation: ulnar head dorsal; supination: palmar
  return {
    forearm: p.rot,
    drujShift: kin.drujShift != null ? K.drujMax * kin.drujShift * (sup.band ? 0.4 : 1) : K.drujMax * Math.min(c.druj, 1.3) * drujSign,
    ulnarVar: K.ulnarVariance * Math.min(1, 0.5 * c.pro + 0.5 * c.L),
    rcExt, rcDev, rowExtra,
    rowSlide: -K.rowSlide * p.dev * (1 + 0.4 * lax),
    mcExt: p.ext - rcExt,
    mcDev: p.dev - rcDev,
    sag: (K.sag * c.sag * (rowLag ? 1.5 : 1) + K.sag * (kin.midcarpalSag ?? 0)) * (sup.lift ? 0.6 : 1),
    scaphoidGap: K.slGap * (c.slGap + (kin.slGap ?? 0) * (sup.wrap ? 0.65 : 1)),
    scaphoidFlex: -K.scaphoidRadialFlex * c.rd,
    ecuSublux: Math.max(c.sublux ? 1 : 0, kin.ecuSublux ?? 0),
    fingers: p.fingers / 100,
    scaphoidDorsal: 0.0025 * (kin.scaphoidDorsalShift ?? 0),
    ltShear: kin.ltShear ?? 0,
    elbow: aux.elbow, thumbRad: aux.thumbRad, thumbPalm: aux.thumbPalm, littleExt: aux.littleExt,
  };
}

// Catch-up clunk state machine. Returns the new lag state and whether a clunk just happened.
export function stepClunk(prevLag: boolean, p: Pose, hyper: boolean, lift: boolean) {
  const active = hyper && !lift && p.load >= K.clunkLoad;
  if (!active) return { rowLag: false, clunk: false };
  if (p.dev <= 0) return { rowLag: true, clunk: false };
  if (prevLag && p.dev >= K.clunkAtDev) return { rowLag: false, clunk: true };
  return { rowLag: prevLag, clunk: false };
}
