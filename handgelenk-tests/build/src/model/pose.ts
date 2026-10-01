// Anatomical pose conventions (right hand; the left hand is a mirror of the rig, the numbers keep their meaning):
//   rot  forearm rotation in deg: − pronation (palm down), + supination (palm up), 0 = thumb up
//   ext  wrist in deg: + extension, − flexion
//   dev  wrist in deg: + ulnar (pinky side), − radial (thumb side)
//   load 0..100 grip / weight-bearing
//   fingers 0..100 finger curl (0 open, 100 fist)
export type Pose = { ext: number; dev: number; rot: number; load: number; fingers: number };
export type Supports = { band: boolean; lift: boolean; wrap: boolean };
export type PoseKey = 'ext' | 'dev' | 'rot';

export const RANGE: Record<'normal' | 'hyper', Record<PoseKey, [number, number]>> = {
  normal: { ext: [-75, 70], dev: [-20, 35], rot: [-80, 85] },
  hyper: { ext: [-95, 95], dev: [-25, 45], rot: [-90, 100] },
};

export const NEUTRAL: Pose = { ext: 0, dev: 0, rot: 0, load: 0, fingers: 10 };

// Finger curl follows grip load in free mode (the test player sets it explicitly).
export const fingersForLoad = (load: number) => Math.round(10 + 0.8 * load);
