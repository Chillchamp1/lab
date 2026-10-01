// Clinical test definitions (data in wrist-tests.json) and the pure step-interpolation logic of the player.
import data from './wrist-tests.json';
import type { Pose } from './pose';
import type { LandmarkId } from '../scene/anatomy';
import type { ViewId } from './structures';

export type ForceDir = 'palmar' | 'dorsal' | 'radial' | 'ulnar' | 'proximal' | 'distal' | 'rotate_pronation' | 'rotate_supination';
export type Force = { at: LandmarkId; dir: ForceDir; mag: number; by: 'examiner' | 'self' | 'body' | 'table' };
export type Kin = Partial<Record<'drujShift' | 'ecuSublux' | 'midcarpalSag' | 'proximalRowFlex' | 'scaphoidDorsalShift' | 'slGap' | 'ltShear', number>>;
export type StepPose = {
  rot: number; ext: number; dev: number; elbow?: number; fingers?: number; grip?: number; axial?: number;
  thumb?: 'radial_abduction' | 'to_forearm'; littleFingerExt?: number;
};
export type Body = 'seated_table' | 'seated_elbow_vertical' | 'seated_under_table' | 'chair_press' | 'chair_press_up' | 'standing';
export type Present = 'skin' | 'xray' | 'bones';
export type Risk = { level: 1 | 2 | 3; note: string };
export type Hold = 'forearm' | 'wrist' | 'hand';
export type Step = { dur: number; pose: StepPose; text: string; body: Body; holds?: Hold[]; contacts?: LandmarkId[]; forces?: Force[]; kinematics?: Kin & { clunkAtDev?: number } };
export type Test = {
  id: string; name: string; group: string; targets: string[]; needsPartner: boolean; homeOk: boolean;
  steps: Step[]; positive: string; painZones: LandmarkId[]; meaning: string; home: string;
  hyper?: Kin & { clunkAtDev?: number }; source?: string; textOnly?: string[]; view: ViewId | 'free';
  risk: Risk; present: Present;
};

// Who acts in a step: derived from the forces, so the data stays free of UI labels.
export type Who = 'you' | 'partner' | 'examiner';
export function stepWho(test: Test, step: Step): Who {
  if (!step.forces?.some((f) => f.by === 'examiner')) return 'you';
  return test.homeOk && test.needsPartner ? 'partner' : 'examiner';
}

export const RISK_LEVELS = [1, 2, 3] as const;

export const TESTS = data.tests as unknown as Test[];
export const GLOBAL_RULES = data._meta.globalRules;
export const TEST_GROUPS = [...new Set(TESTS.map((t) => t.group))];

// Extra pose channels the free mode doesn't expose.
export type Aux = { elbow: number; thumbRad: number; thumbPalm: number; littleExt: number };
export const AUX_FREE: Aux = { elbow: 90, thumbRad: 0, thumbPalm: 0, littleExt: 0 };

const AMPLITUDE: (keyof Kin)[] = ['drujShift', 'ecuSublux', 'midcarpalSag', 'proximalRowFlex', 'scaphoidDorsalShift', 'slGap', 'ltShear'];
// How much of each finding a normal (negative) wrist still shows.
const NEGATIVE_SCALE: Record<keyof Kin, number> = {
  drujShift: 0.3, ecuSublux: 0, midcarpalSag: 0.2, proximalRowFlex: 0.2, scaphoidDorsalShift: 0, slGap: 0.2, ltShear: 0.25,
};

export type StepTarget = { pose: Pose; aux: Aux; kin: Kin; clunkAtDev?: number };

export function stepTarget(test: Test, i: number, opts: { hyper: boolean; positive: boolean }): StepTarget {
  const s = test.steps[i], p = s.pose;
  const load = Math.max(p.grip ?? 0, p.axial ?? 0);
  const fingers = p.fingers != null ? p.fingers * 100 : (p.axial ?? 0) > (p.grip ?? 0) ? 0 : 10 + 80 * (p.grip ?? 0);
  const kin: Kin = {};
  for (const k of AMPLITUDE) if (s.kinematics?.[k] != null) kin[k] = s.kinematics[k];
  let clunkAtDev = s.kinematics?.clunkAtDev;
  if (opts.hyper && test.hyper) {
    for (const k of AMPLITUDE) {
      const h = test.hyper[k];
      if (h == null) continue;
      kin[k] = kin[k] != null ? kin[k]! * Math.max(1, h) : h * load; // scale the step's finding, or add a load-driven one
    }
    if (clunkAtDev != null && test.hyper.clunkAtDev != null) clunkAtDev = test.hyper.clunkAtDev;
  }
  if (!opts.positive) {
    for (const k of AMPLITUDE) if (kin[k] != null) kin[k] = kin[k]! * NEGATIVE_SCALE[k];
    clunkAtDev = undefined;
  }
  return {
    pose: { ext: p.ext, dev: p.dev, rot: p.rot, load: Math.round(load * 100), fingers },
    aux: {
      elbow: p.elbow ?? 90,
      thumbRad: p.thumb === 'radial_abduction' ? 1 : 0,
      thumbPalm: p.thumb === 'to_forearm' ? 1 : 0,
      littleExt: p.littleFingerExt ?? 0,
    },
    kin, clunkAtDev,
  };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => t * t * (3 - 2 * t);

// Moves during the first 60 % of a step, then holds so the reader can look.
export function blend(from: StepTarget, to: StepTarget, t: number, dur: number): StepTarget {
  const a = ease(Math.min(1, t / (0.6 * dur)));
  const mix = <T extends Record<string, number>>(x: T, y: T) =>
    Object.fromEntries([...new Set([...Object.keys(x), ...Object.keys(y)])].map((k) => [k, lerp(x[k] ?? 0, y[k] ?? 0, a)])) as T;
  return { pose: mix(from.pose, to.pose), aux: mix(from.aux, to.aux), kin: mix(from.kin as Record<string, number>, to.kin as Record<string, number>), clunkAtDev: to.clunkAtDev };
}
