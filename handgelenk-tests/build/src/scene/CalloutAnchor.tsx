// Finds the point the on-stage instruction refers to (where the hands act in this step, else the wrist), projects it
// to screen pixels every frame and hands it to the DOM callout, which draws the pointer line. No React state involved:
// this runs at frame rate.
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { guided, useStore } from '../state/store';
import type { V3 } from './anatomy';
import { LANDMARKS as LM } from './landmarks';
import { useFrames } from './frames';

// The callout (src/ui/Callout.tsx) registers its draw function here.
export const calloutBus: { draw: ((x: number, y: number, visible: boolean) => void) | null } = { draw: null };

export function CalloutAnchor({ wrist }: { wrist: V3 }) {
  const { frames, root } = useFrames();
  const v = useRef(new THREE.Vector3());
  const st = useRef({ key: '', x: 0, y: 0, ox: 0, oy: 0 });

  useFrame(({ camera, size }, dt) => {
    const draw = calloutBus.draw;
    if (!draw) return;
    const s = useStore.getState(), a = st.current;
    if (!guided(s.mode) || !s.player.id || !root.current) { a.key = ''; draw(0, 0, false); return; }

    // a held weight is not the point of a step; the wrist is
    const id = s.frame.forces.find((f) => f.by !== 'weight')?.at ?? s.frame.contacts[0];
    const lm = id ? LM[id] : undefined, frame = lm && frames.get(lm.frame);
    const onSkin = s.present !== 'bones';
    if (lm && frame) v.current.set(...(onSkin && lm.skin ? lm.skin : lm.p)).applyMatrix4(frame.matrixWorld);
    else v.current.set(...wrist).applyMatrix4(root.current.matrixWorld);
    camera.updateMatrixWorld();
    v.current.project(camera);
    const x = (v.current.x * 0.5 + 0.5) * size.width, y = (-v.current.y * 0.5 + 0.5) * size.height;

    // When the target changes (next step), glide over from the old spot; camera motion itself is followed exactly.
    const key = `${s.player.id}|${id ?? 'wrist'}`;
    if (a.key && a.key !== key) { a.ox = a.x - x; a.oy = a.y - y; }
    a.key = key;
    const decay = Math.exp(-dt * 9);
    a.ox *= decay; a.oy *= decay;
    a.x = x + a.ox; a.y = y + a.oy;
    draw(a.x, a.y, v.current.z < 1);
  });
  return null;
}
