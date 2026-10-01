// Registry of named rig frames (bones / pivots), shared by the rig, tubes, overlays and camera presets.
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type * as THREE from 'three';
import type { FrameId } from './anatomy';

type Frames = {
  frames: Map<FrameId, THREE.Object3D>;
  reg: (id: FrameId) => (o: THREE.Object3D | null) => void;
  root: { current: THREE.Object3D | null };
  setRoot: (o: THREE.Object3D | null) => void;
  // The figure poses its joints here, before the rig solves; keeps parent matrices fresh in one frame callback.
  preFrame: { fn: ((dt: number) => void) | null };
};

const Ctx = createContext<Frames | null>(null);

export function FramesProvider({ children }: { children: ReactNode }) {
  const value = useMemo<Frames>(() => {
    const frames = new Map<FrameId, THREE.Object3D>();
    const root = { current: null as THREE.Object3D | null };
    return {
      frames, root, preFrame: { fn: null },
      reg: (id) => (o) => { if (o) frames.set(id, o); },
      setRoot: (o) => { root.current = o; },
    };
  }, []);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useFrames = () => useContext(Ctx)!;
