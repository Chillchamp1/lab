// Single store for pose and app state. Free mode and the test player both write poses here.
import { create } from 'zustand';
import { NEUTRAL, RANGE, type Pose, type PoseKey, type Supports } from '../model/pose';
import type { StructureId } from '../model/structures';
import { stepClunk } from '../model/kinematics';
import { computeStress } from '../model/stress';
import { AUX_FREE, TESTS, type Aux, type Force, type Kin, type Present } from '../model/tests';
import type { LandmarkId } from '../scene/anatomy';

export type Side = 'R' | 'L';
export type Layers = { bones: boolean; xray: boolean; ligaments: boolean; tendons: boolean; supports: boolean };
export type Mode = 'free' | 'test';

export type Player = {
  id: string | null; step: number; t: number; playing: boolean; speed: number;
  positive: boolean; done: boolean; pain: boolean; seq: number; // seq bumps on (re)start so the driver re-reads the start pose
};
export type TestFrame = { kin: Kin; aux: Aux; forces: Force[]; contacts: LandmarkId[]; forceAlpha: number };

type State = {
  pose: Pose; hyper: boolean; supports: Supports; side: Side;
  selected: StructureId; layers: Layers;
  viewSeq: number; cut: boolean; // viewSeq bumps → camera returns to the start view; cut = DRUJ cross-section active
  rowLag: boolean; clunkSeq: number;
  mode: Mode; player: Player; frame: TestFrame;
  present: Present;
  setPresent: (p: Present) => void;
  setPose: (p: Partial<Pose>) => void;
  reset: () => void;
  toggleHyper: () => void;
  toggleSupport: (k: keyof Supports) => void;
  setSide: (s: Side) => void;
  select: (id: StructureId) => void;
  setCut: (on: boolean) => void;
  toggleLayer: (k: keyof Layers) => void;
  setMode: (m: Mode) => void;
  openTest: (id: string | null) => void;
  playerCtl: (p: Partial<Player>) => void;
  gotoStep: (step: number) => void;
  seek: (time: number) => void; // seconds along the whole test timeline
  restart: () => void;
  // test driver only
  writeTestFrame: (pose: Pose, frame: TestFrame, rowLag: boolean, clunk: boolean, player: Partial<Player>) => void;
};

const clampPose = (p: Pose, hyper: boolean): Pose => {
  const r = hyper ? RANGE.hyper : RANGE.normal;
  const out = { ...p };
  (['ext', 'dev', 'rot'] as PoseKey[]).forEach((k) => (out[k] = Math.max(r[k][0], Math.min(r[k][1], out[k]))));
  return out;
};

const FREE_FRAME: TestFrame = { kin: {}, aux: AUX_FREE, forces: [], contacts: [], forceAlpha: 0 };
const PLAYER0: Player = { id: null, step: 0, t: 0, playing: false, speed: 1, positive: true, done: false, pain: false, seq: 0 };

export const useStore = create<State>()((set, get) => {
  // Every free-mode pose/flag change goes through here so the clunk state machine sees it.
  const commit = (pose: Pose, hyper: boolean, supports: Supports) => {
    const s = get();
    if (s.mode === 'test') { set({ hyper, supports }); return; } // the test driver owns the pose
    const c = stepClunk(s.rowLag, pose, hyper, supports.lift);
    set({ pose, hyper, supports, rowLag: c.rowLag, clunkSeq: s.clunkSeq + (c.clunk ? 1 : 0) });
  };
  return {
    pose: { ...NEUTRAL }, hyper: false, supports: { band: false, lift: false, wrap: false }, side: 'R',
    selected: 'tfcc', layers: { bones: true, xray: true, ligaments: true, tendons: true, supports: true },
    viewSeq: 0, cut: false, rowLag: false, clunkSeq: 0,
    mode: 'test', player: PLAYER0, frame: FREE_FRAME,
    present: 'bones',

    setPresent: (present) => set({ present }),

    setPose: (p) => { const s = get(); commit(clampPose({ ...s.pose, ...p }, s.hyper), s.hyper, s.supports); },
    reset: () => { const s = get(); set({ rowLag: false }); commit({ ...NEUTRAL }, s.hyper, s.supports); },
    toggleHyper: () => { const s = get(); commit(clampPose(s.pose, !s.hyper), !s.hyper, s.supports); },
    toggleSupport: (k) => { const s = get(); commit(s.pose, s.hyper, { ...s.supports, [k]: !s.supports[k] }); },
    setSide: (side) => set((s) => ({ side, viewSeq: s.viewSeq + 1 })),
    select: (selected) => set({ selected }),
    setCut: (cut) => set({ cut }),
    toggleLayer: (k) => set((s) => ({ layers: { ...s.layers, [k]: !s.layers[k] } })),

    setMode: (mode) => {
      if (mode === get().mode) return;
      // tests always show a plain wrist with the positive finding; hypermobility and supports belong to Explore
      set((s) => ({ mode, viewSeq: s.viewSeq + 1, ...(mode === 'test' ? { hyper: false, supports: { band: false, lift: false, wrap: false } } : {}), player: { ...PLAYER0, positive: s.player.positive, speed: s.player.speed, seq: s.player.seq + 1 }, frame: FREE_FRAME, rowLag: false, pose: { ...NEUTRAL } }));
    },
    openTest: (id) => {
      const s = get();
      const test = TESTS.find((x) => x.id === id);
      set({
        player: { ...s.player, id, step: 0, t: 0, playing: false, done: false, pain: false, seq: s.player.seq + 1 }, // paused until Play
        frame: FREE_FRAME, rowLag: false, pose: { ...NEUTRAL },
        viewSeq: s.viewSeq + 1, present: test ? test.present : 'bones',
      });
    },
    playerCtl: (p) => set((s) => ({ player: { ...s.player, ...p } })),
    gotoStep: (step) => set((s) => {
      const test = TESTS.find((x) => x.id === s.player.id);
      if (!test) return {};
      const st = Math.max(0, Math.min(test.steps.length - 1, step));
      return { player: { ...s.player, step: st, t: 0, done: false } };
    }),
    seek: (time) => set((s) => {
      const test = TESTS.find((x) => x.id === s.player.id);
      if (!test) return {};
      let acc = 0, step = 0;
      for (; step < test.steps.length - 1 && time >= acc + test.steps[step].dur; step++) acc += test.steps[step].dur;
      const t = Math.max(0, Math.min(test.steps[step].dur, time - acc));
      return { player: { ...s.player, step, t, done: false } };
    }),
    restart: () => set((s) => ({ player: { ...s.player, step: 0, t: 0, done: false, pain: false, playing: true, seq: s.player.seq + 1 }, rowLag: false })),

    writeTestFrame: (pose, frame, rowLag, clunk, player) => set((s) => ({
      pose, frame, rowLag, clunkSeq: s.clunkSeq + (clunk ? 1 : 0), player: { ...s.player, ...player },
    })),
  };
});

// Pain zones: on demand, or while the last part of a test holds its end position.
export const painShown = (s: State) => {
  if (s.player.pain) return true;
  const test = TESTS.find((x) => x.id === s.player.id);
  if (!test) return false;
  const last = test.steps.length - 1;
  return s.player.step === last && s.player.t >= 0.6 * test.steps[last].dur;
};

export const stressOf = (s: Pick<State, 'pose' | 'hyper' | 'supports'>) =>
  computeStress({ ...s.pose, hyper: s.hyper, ...s.supports });

if (import.meta.env.DEV) (window as unknown as { __store: typeof useStore }).__store = useStore;
