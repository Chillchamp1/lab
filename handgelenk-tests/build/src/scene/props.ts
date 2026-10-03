// Hand-held training objects: where each one sits in the hand and how big it is. Pure data, in the coordinates of the
// 'mid' frame (the metacarpals), so the object follows every wrist movement. The meshes are built in HeldProp.tsx.
import rigJson from './rigdata.json';
import type { RigData, V3 } from './anatomy';

const RIG = rigJson as unknown as RigData;
const knuckle = (finger: number): V3 => RIG.fingers[finger - 1].joints[0].c; // MCP joint centre, finger 2 = index … 5 = little
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: V3, b: V3, k = 1): V3 => [a[0] + k * b[0], a[1] + k * b[1], a[2] + k * b[2]];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: V3): V3 => { const l = Math.hypot(...a); return [a[0] / l, a[1] / l, a[2] / l]; };

// Grip frame: +X along the knuckles toward the thumb side (where a hammer's head or a bottle's neck points),
// +Y toward the fingertips, +Z out of the palm.
export const GRIP_X = unit(sub(knuckle(2), knuckle(5)));
export const GRIP_Z = unit(cross(GRIP_X, [0, 1, 0]));
export const GRIP_Y = cross(GRIP_Z, GRIP_X);
const KNUCKLES: V3 = [2, 3, 4, 5].map(knuckle).reduce((s, c) => add(s, c, 0.25), [0, 0, 0] as V3);

// Centre of a gripped cylinder or ball of radius r: in front of the palm, just short of the knuckles.
const gripCentre = (r: number): V3 => add(add(KNUCKLES, GRIP_Y, -(0.012 + 0.45 * r)), GRIP_Z, 0.013 + r);

export type PropId = 'dumbbell' | 'hammer' | 'ball' | 'bottle';
export const PROP_IDS: PropId[] = ['dumbbell', 'hammer', 'ball', 'bottle'];

export const DUMBBELL = { r: 0.0125, len: 0.15, plateR: 0.034, plateW: 0.026 };
export const HAMMER = { r: 0.0115, butt: -0.05, top: 0.22, head: [0.03, 0.1, 0.03] as V3 }; // handle from butt to top along +X
export const BALL = { r: 0.03 };
export const BOTTLE = { r: 0.031, bottom: -0.075, shoulder: 0.1, neckR: 0.012, neck: 0.035, water: 0.02 };

// Placed, not held (Step.gear). Towel: a rolled hand towel across the heel of the hand, in the 'mid' frame.
// Tape: a firm ring of non-stretch tape around the carpal bones, in the 'prox' frame (sized from the carpal wrap).
export const TOWEL = { c: [-0.006, 0.006, -0.040] as V3, r: 0.017, len: 0.085 };
export const TAPE = { c: RIG.support.wrap.c, r: [RIG.support.wrap.r[0] * 1.04, RIG.support.wrap.r[1] * 1.15] as [number, number], h: 0.026 };

export const GRIP: Record<PropId, V3> = {
  dumbbell: gripCentre(DUMBBELL.r), hammer: gripCentre(HAMMER.r), ball: gripCentre(BALL.r), bottle: gripCentre(BOTTLE.r),
};

// Where the weight of each object acts (for the gravity arrow), in 'mid' frame coordinates.
export const PROP_CENTRE: Record<PropId, V3> = {
  dumbbell: GRIP.dumbbell,
  hammer: add(GRIP.hammer, GRIP_X, HAMMER.top),
  ball: GRIP.ball,
  bottle: add(GRIP.bottle, GRIP_X, 0.5 * (BOTTLE.bottom + BOTTLE.water)),
};
