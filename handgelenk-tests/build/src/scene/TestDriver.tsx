// Runs the clinical test timeline: advances time, blends step targets, fires the catch-up clunk, writes the store.
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStore } from '../state/store';
import { NEUTRAL, RANGE } from '../model/pose';
import { AUX_FREE, TESTS, blend, stepTarget, type StepTarget } from '../model/tests';

const START: StepTarget = { pose: NEUTRAL, aux: AUX_FREE, kin: {} };
const NONE: never[] = [];
const BASE_RATE = 0.5; // playback runs at half the authored step durations; easier to follow
const clamp = (v: number, [a, b]: [number, number]) => Math.max(a, Math.min(b, v));

export function TestDriver() {
  const prevDev = useRef(0);
  const lastSig = useRef('');

  useFrame((_, dtRaw) => {
    const s = useStore.getState();
    const p = s.player;
    if (s.mode !== 'test' || !p.id) return;
    const test = TESTS.find((x) => x.id === p.id);
    if (!test) return;

    const { step, playing, done } = p;
    let t = p.t;
    if (playing) t += Math.min(dtRaw, 0.25) * p.speed * BASE_RATE; // generous clamp: slow devices still play in real time
    if (t >= test.steps[step].dur) t = 0; // loop this part; Next / Previous move on

    const sig = [p.seq, step, t.toFixed(3), done, s.hyper, p.positive, s.supports.band, s.supports.lift, s.supports.wrap].join('|');
    if (sig === lastSig.current) return; // paused and nothing changed
    lastSig.current = sig;

    const opts = { hyper: s.hyper, positive: p.positive };
    const from = step === 0 ? START : stepTarget(test, step - 1, opts);
    const cur = blend(from, stepTarget(test, step, opts), t, test.steps[step].dur);
    const R = RANGE.hyper;
    const pose = { ...cur.pose, ext: clamp(cur.pose.ext, R.ext), dev: clamp(cur.pose.dev, R.dev), rot: clamp(cur.pose.rot, R.rot) };

    // Catch-up clunk: the proximal row lags flexed until the tilt passes the threshold, then snaps. A pisiform lift prevents it.
    let rowLag = false, clunk = false;
    if (cur.clunkAtDev != null && !s.supports.lift) {
      rowLag = pose.dev < cur.clunkAtDev;
      clunk = playing && prevDev.current < cur.clunkAtDev && pose.dev >= cur.clunkAtDev;
    }
    prevDev.current = pose.dev;

    const st = test.steps[step];
    s.writeTestFrame(pose, { kin: cur.kin, aux: cur.aux, forces: st.forces ?? NONE, contacts: st.contacts ?? NONE, forceAlpha: 1 },
      rowLag, clunk, { t });
  });
  return null;
}
