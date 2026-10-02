import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { CameraControls } from '@react-three/drei';
import CameraControlsImpl from 'camera-controls';
import * as THREE from 'three';
import { useStore } from '../state/store';
import { TESTS } from '../model/tests';
import { FramesProvider, useFrames } from './frames';
import { Rig } from './Rig';
import { Figure } from './Figure';
import { TestDriver } from './TestDriver';
import { CalloutAnchor } from './CalloutAnchor';
import rig from './rigdata.json';

const CUT_Y = rig.pivots.fovea[1] - 0.004; // cross-section through the ulnar head / DRUJ
// World-space cut plane; only bone materials clip against it (see Rig), so ligaments and arrows stay visible.
export const CUT_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), 1e9);

// One camera rule, no options: every start view shows the whole figure from the front on the side of the examined
// arm, and the orbit centre is always the wrist. The user zooms in (wheel / pinch) and rotates (drag) from there.
const START_DIST = 3.3; // m; fits head to feet around the off-centre wrist at fov 35°
const START_DIR = new THREE.Vector3(-0.55, 0.28, 0.8).normalize(); // for the right arm; x flips for the left
const WRIST: [number, number, number] = [0, 0.01, 0]; // orbit centre in rig coordinates (just distal of the lunate)

function CameraRig() {
  const ctl = useRef<CameraControls>(null);
  const { frames, root } = useFrames();
  const seen = useRef(-1);
  const setup = useRef(false);
  const tmp = useRef({ f: new THREE.Vector3(), n: new THREE.Vector3(), p: new THREE.Vector3(), distal: new THREE.Vector3(), toCam: new THREE.Vector3() });

  useFrame(({ size }) => {
    const s = useStore.getState();
    const rootObj = root.current, c = ctl.current;
    if (!rootObj || !c) return;
    if (!setup.current) { // the controls ref is only filled after mount, so configure them here, once
      setup.current = true;
      const A = CameraControlsImpl.ACTION;
      c.mouseButtons.right = A.NONE; c.mouseButtons.middle = A.DOLLY; // no panning: the orbit centre is the wrist
      c.touches.two = A.TOUCH_DOLLY; c.touches.three = A.NONE;
      c.dollySpeed = 2.2; // the start view is far out; get to the wrist in a few wheel notches
      if (import.meta.env.DEV) (window as unknown as { __ctl: unknown }).__ctl = c;
    }
    // Pin the orbit centre to the wrist every frame: the camera follows the limb as the figure moves.
    const { f, n, p, distal, toCam } = tmp.current;
    f.set(...WRIST).applyMatrix4(rootObj.matrixWorld);
    c.moveTo(f.x, f.y, f.z, false);
    // On a phone the instruction box spans the bottom edge: lift the picture by half its height, so the wrist sits
    // in the middle of the part that is left free.
    const box = size.width < 600 ? document.getElementById('callout') : null;
    const lift = box ? box.offsetHeight / 2 + 4 : 0; // px
    const perPx = (2 * c.distance * Math.tan(THREE.MathUtils.degToRad((c.camera as THREE.PerspectiveCamera).fov) / 2)) / size.height;
    c.setFocalOffset(0, lift * perPx, 0, false);

    // DRUJ cross-section: for tests about the radius–ulna joint, the hand is cut away automatically once the user has
    // zoomed in and looks along the forearm from the fingertips.
    const ulna = frames.get('ulna');
    if (ulna) {
      distal.set(0, 1, 0).transformDirection(ulna.matrixWorld);
      n.copy(distal).multiplyScalar(-1);
      p.set(0, CUT_Y, 0).applyMatrix4(ulna.matrixWorld);
      CUT_PLANE.setFromNormalAndCoplanarPoint(n, p);
      const wantsCut = s.mode === 'test' && TESTS.find((t) => t.id === s.player.id)?.view === 'end';
      const cut = !!wantsCut && c.distance < 0.5 && toCam.copy(c.camera.position).sub(f).normalize().dot(distal) > 0.5;
      if (cut !== s.cut) s.setCut(cut);
    }

    if (seen.current === s.viewSeq) return;
    const first = seen.current === -1;
    seen.current = s.viewSeq;
    const m = s.side === 'L' ? -1 : 1;
    c.camera.up.set(0, 1, 0); c.updateCameraUp();
    c.setLookAt(f.x + m * START_DIR.x * START_DIST, f.y + START_DIR.y * START_DIST, f.z + START_DIR.z * START_DIST, f.x, f.y, f.z, !first);
  });

  return <CameraControls ref={ctl} minDistance={0.06} maxDistance={5} smoothTime={0.35} />;
}

export function Scene() {
  const side = useStore((s) => s.side);
  return (
    <Canvas dpr={[1, 2]} camera={{ fov: 35, near: 0.005, far: 40, position: [-1.8, 1.7, 3] }} gl={{ antialias: true, localClippingEnabled: true }}>
      <hemisphereLight args={['#ffffff', '#9a948c', 1.25]} />
      <directionalLight position={[0.3, 0.6, 0.7]} intensity={1.7} />
      <directionalLight position={[-0.5, -0.3, -0.4]} intensity={0.55} />
      <FramesProvider>
        <group scale={[side === 'L' ? -1 : 1, 1, 1]}>
          <Figure>
            <Rig />
          </Figure>
        </group>
        <CameraRig />
        <TestDriver />
        <CalloutAnchor wrist={WRIST} />
      </FramesProvider>
    </Canvas>
  );
}
