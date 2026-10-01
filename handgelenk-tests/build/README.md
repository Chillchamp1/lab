# Wrist Load Model 3D

Source of https://chillchamp1.github.io/lab/handgelenk-tests/ — clinical wrist tests on a 3D figure with a detailed
wrist. Not a diagnostic tool. "HANDOVER" below refers to the original planning notes, which are not part of this repo.

## Run

```bash
npm install
npm run dev            # http://localhost:5173 (also on the LAN for phone testing)
npm test               # stress-model parity with the 2D prototype
npm run lint
npm run build          # static site in dist/
npm run lab            # build, then copy index.html + assets/ one level up (the folder GitHub Pages serves)
npm run build:artifact # single HTML file in dist-artifact/wrist3d.html (claude.ai artifact preview)
```

Deploy: this folder is `handgelenk-tests/build/` in the `lab` repo. `npm run lab`, then commit and push `lab`;
GitHub Pages serves `handgelenk-tests/index.html` from `main` a minute or two later.
`node scripts/smoke.mjs <url>` checks a served build in headless Chrome (needs a local Chrome).

## Layout

| path | what |
|---|---|
| `src/i18n/en.ts` | every user-facing string (structure texts, notices). Add `de.ts` with the same shape. |
| `src/model/stress.ts` | `computeStress()` — exact port of the prototype's `compute()`, plus recommendations and strain colours |
| `src/model/kinematics.ts` | `solveRig()` pose → joint targets (HANDOVER 3.4), `stepClunk()` catch-up clunk state machine, tunable constants `K` |
| `src/model/pose.ts` | pose conventions, normal / hypermobile ranges |
| `src/state/store.ts` | the one zustand store (pose, flags, side, selection, layers, view) |
| `scripts/build-bones.mjs` | bone pipeline: BodyParts3D OBJ → rig frame → `src/assets/hand.glb` + `src/scene/rigdata.json` (`npm run bones`) |
| `src/scene/anatomy.ts` | pipeline input: bone list (BodyParts3D ids → rig frames), finger chains, ligament/tendon anchor guesses; shared types |
| `src/scene/rigdata.json` | generated: pivots, finger joint centres/axes, TFCC, supports, anchors snapped onto bone surfaces |
| `src/scene/Skin.tsx` | forearm + hand skin (cropped BodyParts3D body skin), CPU-skinned to the rig frames with weights from `skin.glb` |
| `src/scene/Figure.tsx` | the mannequin (gender-neutral, standard proportions) with chair / see-through table; its right forearm + hand *are* the rig, mounted at the elbow. Shoulder/elbow angles are solved so the forearm really rests on the furniture |
| `src/scene/Limiters.tsx` | what blocks the motion in a step: hold rings (examiner fixes forearm / wrist / hand, `holds` in the JSON) and rest pads (table top, seat, table underside) with HTML labels |
| `src/scene/Rig.tsx` | nested pivot groups (ulna → PV_forearm → radius → PV_radiocarpal → proximal row → PV_midcarpal → hand), per-frame tube rebuild |
| `src/scene/Scene.tsx` | canvas, left/right mirror, camera presets, end-on cross-section clipping |
| `src/ui/Panels.tsx` | controls, strain list, info card, recommendations |
| `src/ui/Callout.tsx` + `src/scene/CalloutAnchor.tsx` | the current instruction on the 3D stage: a box in the corner away from the body and a pointer line to the spot the step is about (first force / contact landmark, else the wrist). The scene projects the spot to pixels every frame and the box draws the SVG line, without React re-renders |
| `src/model/wrist-tests.json` | the tests: steps, forces, postures, risk level and `sources` (short form, full citation, DOI link, note) for every test |
| `docs/` | test data draft, 2D prototype (used by the parity test) |

## Conventions and decisions

- **Rig frame (right hand): +X ulnar, +Y distal, +Z dorsal**, metres, origin at the radiocarpal pivot.
  HANDOVER 6.2 suggested +X radial, but +X radial / +Y distal / +Z dorsal is a *left* hand in a right-handed
  coordinate system. Keep +X ulnar in the Blender export (M2).
- Display: forearm along world +X, thumb up at `rot = 0`, back of hand toward the default camera.
  Left hand = `scale.x = -1` on the whole rig; pose numbers keep their anatomical meaning.
- Forearm rotation about the radial-head → ulnar-fovea axis; the ulna is the fixed reference.
- Flex/ext split radiocarpal/midcarpal 40 % / 66 % (Sarrafian), deviation split 45 %, proximal row
  extends 0.5° per degree of ulnar deviation and slides radially.
- Hypermobile catch-up clunk: with load ≥ 30 % and no pisiform lift, the proximal row stays flexed after
  radial deviation and snaps at 6° ulnar deviation (`K.clunkAtDev`).
- Strain colours use the prototype heuristic only. Geometric strain (`length / restLength − 1`) comes with real attachment points in M3.

## Bones (M2)

- Source: BodyParts3D 4.0, PART-OF tree, `partof_BP3D_4.0_obj_99.zip` (62 MB, 99 % polygon-reduced OBJ, mm,
  +X left, −Y anterior, +Z up, anatomical position). Licence CC BY-SA 2.1 Japan; credited in the app footer and the glb.
- Download into `assets-src/bodyparts3d/` (git-ignored), extract the 29 right-side bones listed in `anatomy.ts` to `obj/`, run `npm run bones`.
- The pipeline pronates radius + hand by 90° (anatomical position → thumb-up neutral) about radial head → ulnar fovea,
  checks that the back of the hand then faces lateral and the thumb anterior, applies one Loop subdivision, and writes a
  quantized meshopt glb (~330 KB, ~45k triangles).
- Built in Node (gltf-transform + meshoptimizer) rather than Blender: reproducible with `npm`, no Blender install needed.
  Own CT/MRI later: export bones as OBJ in the same orientation and names, rerun.

## Clinical tests (M4/M5)

- Data: `src/model/wrist-tests.json` (poses, forces, contacts, pain zones, findings, per-test camera `view`). No test logic is hard-coded.
- `src/model/tests.ts` turns a step into a target (pose, extra channels like elbow/thumb, and findings such as
  `drujShift`, `ecuSublux`, `midcarpalSag`, `clunkAtDev`) and blends steps (move in the first 60 %, then hold).
- **Show positive result** off scales findings to what a normal wrist shows (`NEGATIVE_SCALE`). Hypermobility applies
  the test's `hyper` block. Supports act on the findings: the DRUJ band cuts the DRUJ shift, the pisiform lift prevents the clunk and reduces sag.
- Landmarks (`LM_*` from HANDOVER 6.3) are computed by the bone pipeline from the bone surfaces and stored in `rigdata.json`;
  `src/scene/TestOverlay.tsx` draws force arrows (anatomical directions in the bone's frame), examiner finger pads and pulsing pain zones.
- The humerus is included for elbow positions (Beighton, elbow 90° in most tests); knee and floor items stay text.
- Each test carries `risk` (1 safe alone · 2 careful: load or partner · 3 examiner only), a default `present`
  (`skin` | `xray` | `bones`; currently `bones` for all) and a posture `body` per step. In a test only the structures in `targets` are drawn.
- One scene: the figure sits at the table, the detailed wrist is its right forearm. Left wrist = whole scene mirrored.
  One camera rule, no options: every start view shows the whole figure (3.3 m, front, on the side of the examined
  arm) and the orbit centre is always the wrist, re-pinned every frame (`CameraControls.moveTo`); panning is disabled.
  For tests marked `view: "end"` the hand is cut away at the DRUJ automatically once the user has zoomed in and looks
  along the forearm from the fingertips (`cut` in the store).
- Player layout: in Tests mode the 3D view takes the full width; under it a scrubbable timeline (one colour per
  part, drag to move back and forth, `seek()` in the store), transport, and the current instruction; below that the
  test's info card and, always, the list of all tests. A test opens paused. Play loops the current part only;
  ⏮ ⏭ change the part and start it. Playback runs at half the authored durations (`BASE_RATE` in `TestDriver.tsx`).
  Tests always show the positive finding on a plain wrist; hypermobility and supports exist only in Explore. Body and chair fade to a 10 % ghost when the camera
  is closer than ~0.45 m to the wrist (`Figure.tsx`).
- `scripts/smoke.mjs` runs the built file in headless Chrome (real frame loop): console errors, fps, player advance,
  orbit / zoom / scrub. Use it instead of the in-app browser pane, which does not animate while hidden.
- Presentation presets: **Skin** = opaque skin, markers on the skin surface (what to do on a real hand); **X-ray** =
  translucent skin + bones, target ligaments; **Bones** = no skin, opaque bones (for findings that are bone motion).
  Landmarks have a bone point `p` and a skin point `skin` (nearest skin vertex along the landmark normal).

## Milestones

- [x] M0 setup (Vite + TS + React + R3F + drei + zustand, ESLint, Vitest, Pages workflow, artifact build)
- [x] M1 kinematics with primitives, left/right, ported stress model, supports, layers, camera presets
- [x] M2 real bones (BodyParts3D, Node pipeline instead of Blender; see below)
- [ ] M3 attachment empties, geometric strain blend
- [x] M4 test player (`src/model/wrist-tests.json`)
- [x] M5 pain zones, examiner forces, hypermobility extras (first pass)
- [x] M6a skin + UX pass (tests first, risk bars, presentation presets)
- [x] M6b mannequin in the main scene, limiters (hold rings, rest pads), orbit pinned to the wrist
- [ ] M6b i18n DE, deploy
