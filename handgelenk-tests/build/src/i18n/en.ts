// All user-facing text lives here. Add `de.ts` with the same shape for German.
import type { StructureId } from '../model/structures';

export type StructureText = { name: string; kind: string; where: string; loads: string; hyp: string; support: string };

export const en = {
  title: 'Wrist tests',
  intro: 'Clinical wrist tests, step by step on a 3D wrist. Pick a test, press play, and see what is done, where it hurts when positive, and what it points to.',
  exploreIntro: 'Move the wrist freely, add load, switch on hypermobility, and see which structures take the strain and where outside support helps.',
  credits: 'Bone meshes: BodyParts3D, © The Database Center for Life Science, CC BY-SA 2.1 Japan (dbarchive.biosciencedbc.jp/en/bodyparts3d). Derived meshes are shared under the same licence.',
  disclaimer: 'Schematic and simplified for intuition — not to scale, not a diagnosis. All strain numbers are invented heuristics, not measurements. Persistent pinky-side pain, clicking, snapping or giving way: see a hand surgeon or hand therapist.',

  side: { label: 'Which wrist?', R: 'Right', L: 'Left' },
  views: { label: 'View', free: 'Free', dorsal: 'Back of hand', thumb: 'Thumb side', palm: 'Palm', ulnar: 'Pinky side', end: 'End-on', body: 'Body', wrist: 'Wrist' },
  viewHint: 'Drag to orbit, pinch or scroll to zoom. Tap a coloured structure for details.',
  layers: { label: 'Show', bones: 'Bones', xray: 'See-through bones', ligaments: 'Ligaments', tendons: 'Tendons', supports: 'Supports' },

  modes: { free: 'Explore', test: 'Tests' },
  present: { label: 'Show', skin: 'Skin', xray: 'X-ray', bones: 'Bones' },
  zoomHint: 'Scroll or pinch to zoom in on the wrist · drag to rotate',
  limiters: { held: 'held fixed', table: 'rests on the table', seat: 'rests on the seat', under: 'pushes against the table' },
  risk: {
    label: 'Who can do this',
    1: 'Safe to try yourself',
    2: 'Careful',
    3: 'Examiner only',
    banner3: 'For a hand surgeon or hand therapist. Shown so you know what to expect — do not try this on yourself.',
  },
  who: { you: 'You', partner: 'Partner', examiner: 'Examiner' },
  filters: { label: 'Show tests', all: 'All', self: 'On my own', partner: 'With a partner', examiner: 'Examiner only' },
  end: {
    title: 'Last part — then the other side',
    body: 'Compare with the other wrist. Only a difference between the sides, or your usual pain, counts.',
    replay: (side: string) => `Replay on the ${side} wrist`,
  },
  explore: { options: 'Display options', views: 'View', hint: 'Drag to orbit, pinch or scroll to zoom. Tap a coloured structure for details.' },
  keys: 'Play repeats the current part. ⏮ ⏭ (or ← →) change the part and play it. Space: play / pause.',
  tests: {
    rulesTitle: 'Before you test',
    pick: 'Pick a test to watch it step by step.',
    partner: 'needs a partner',
    homeBadge: 'at home',
    notHome: 'examiner only',
    back: 'All tests',
    all: 'All tests',
    step: (i: number, n: number) => `Step ${i} of ${n}`,
    play: 'Play', pause: 'Pause', prev: 'Previous step', next: 'Next step', restart: 'Replay',
    yourWrist: 'Your wrist',
    speed: 'Speed',
    timeline: 'Timeline: drag to move back and forth',
    positive: { label: 'Show positive result', sub: 'Off: what a normal wrist does in the same test' },
    pain: 'Show where it hurts',
    positiveIf: 'Positive if',
    painZones: 'Where it hurts when positive',
    meaning: 'What it points to',
    home: 'At home',
    source: 'Source',
    textOnly: 'Not shown in the model',
    wrist: 'Wrist',
    legend: { examiner: 'examiner', self: 'you', body: 'body weight', table: 'table', pad: 'examiner finger', pain: 'pain zone', hold: 'held fixed', rest: 'support' },
  },
  landmarks: {
    ulnar_fovea: 'ulnar fovea (soft spot, palm side of the ulnar bump)',
    ulnar_head_dorsal: 'back of the ulnar head',
    ulnar_styloid: 'ulnar styloid',
    ecu_groove: 'ECU groove',
    pisiform: 'pisiform',
    triquetrum_dorsal: 'back of the triquetrum',
    lt_interval_dorsal: 'between lunate and triquetrum (back)',
    sl_interval_dorsal: 'between scaphoid and lunate (back)',
    scaphoid_tubercle: 'scaphoid tubercle (palm side)',
    midcarpal_ulnar_dorsal: 'pinky-side midcarpal joint (back)',
    ulnocarpal_volar: 'pinky side of the wrist, palm side',
    druj_dorsal: 'DRUJ, back',
    druj_volar: 'DRUJ, palm side',
    carpal_tunnel: 'carpal tunnel',
    lateral_epicondyle: 'lateral epicondyle',
  },
  pose: 'Pose',
  sliders: {
    ext: { label: 'Bend', lo: 'palm-ward (flex)', hi: 'back-ward (extend)' },
    dev: { label: 'Side tilt', lo: 'thumb side', hi: 'pinky side' },
    rot: { label: 'Forearm turn', lo: 'palm down', hi: 'palm up' },
    load: { label: 'Load', lo: 'none', hi: 'hard grip / body weight' },
  },
  values: {
    ext: (v: number) => (v === 0 ? 'neutral' : v > 0 ? `${v}° extended` : `${-v}° flexed`),
    dev: (v: number) => (v === 0 ? 'straight' : v > 0 ? `${v}° to pinky` : `${-v}° to thumb`),
    rot: (v: number) => (v === 0 ? 'thumb up' : v > 0 ? `${v}° palm up` : `${-v}° palm down`),
    load: (v: number) => `${v}%`,
  },

  toggles: {
    hyper: { label: 'Hypermobile wrist', sub: 'More range, looser joints, more muscle work' },
    supportGroup: 'Outside support',
    band: { label: 'DRUJ band', sub: 'WristWidget or tape strip 1, just above the ulnar head' },
    lift: { label: 'Pisiform lift', sub: 'Tape strip 2 or splint pad under the pinky-side heel of the hand' },
    wrap: { label: 'Carpal wrap', sub: 'Firm band around the carpal bones' },
  },

  reset: 'Reset',

  recsTitle: 'Where support would help right now',
  recs: {
    band: 'DRUJ band just above the ulnar head (WristWidget / tape strip 1) — offloads TFCC and radioulnar ligaments.',
    lift: 'Pisiform lift (tape strip 2 or splint pad) — holds the pinky-side carpus up against sag.',
    wrap: 'Carpal wrap — compresses the carpal bones, helps the scapholunate area.',
    ext: 'Block end-range extension — fists, push-up handles or wedges instead of flat palms.',
    none: 'Nothing is loaded much in this pose — no support needed.',
    on: 'on',
  },

  listTitle: "What's working hardest",
  pastLimit: 'past limit',
  heuristicNote: 'Percentages are a hand-tuned heuristic for intuition.',
  detail: {
    now: 'now',
    levels: { low: 'low', moderate: 'moderate', high: 'high' },
    where: 'Where',
    loads: 'Loaded by',
    hyp: 'In a hypermobile wrist',
    support: 'Support from outside',
  },

  notices: {
    beyond: 'Beyond typical range — only the ligaments are stopping the motion now.',
    sublux: 'ECU tendon at risk of snapping out of its groove.',
    clunk: 'Clunk — the proximal carpal row snaps from flexed to extended (midcarpal instability). Try the pisiform lift.',
  },

  structures: {
    tfcc: { name: 'TFCC (triangular fibrocartilage)', kind: 'Cartilage disc with ligaments', where: 'Pinky side, between the end of the ulna and the carpal bones.', loads: 'Tilting toward the pinky, gripping, loading with the palm down (push-ups, planks).', hyp: 'A loose radioulnar joint lets the ulna shift, adding shear on the disc.', support: 'DRUJ band just above the ulnar head (WristWidget / tape strip 1). For push-ups: fists or handles.' },
    druj: { name: 'Radioulnar ligaments (DRUJ)', kind: 'Ligaments, part of the TFCC', where: 'Hold radius and ulna together at the wrist.', loads: 'Turning the forearm to the end of its range, especially while gripping — keys, screwdrivers, doorknobs, jars.', hyp: 'The main weak point in lax wrists: the ulnar head shifts more with every turn.', support: 'DRUJ band — this is exactly the job the WristWidget takes over.' },
    ecu: { name: 'ECU tendon and its sheath', kind: 'Tendon', where: 'Groove on the back of the ulna, pinky side.', loads: 'Palm up + wrist bent palm-ward + pinky-side tilt. In that position it can snap out of its groove.', hyp: 'Looser sheath, so it snaps out more easily; the tendon also works overtime as a stabiliser.', support: 'DRUJ band helps somewhat. Avoid palm-up gripping with the wrist flexed. Repeated snapping needs a splint that keeps the forearm palm-down.' },
    ulnocarpal: { name: 'Ulnocarpal ligaments', kind: 'Ligaments, palm side', where: 'From the ulna and TFCC to the lunate and triquetrum.', loads: 'Extension, palm-up turning, tilt toward the thumb.', hyp: 'When the pinky-side carpus sags palm-ward, it hangs on these ligaments.', support: 'Pisiform lift (tape strip 2) or a splint with a pad under the pisiform.' },
    sl: { name: 'Scapholunate ligament', kind: 'Ligament', where: 'Between scaphoid and lunate, center of the wrist.', loads: 'Loaded extension (push-ups), hard grip, pinky-side tilt.', hyp: 'The gap between the two bones opens more under grip.', support: 'Carpal wrap with gentle pressure on the back of the wrist; avoid loading in full extension.' },
    lt: { name: 'Lunotriquetral ligament', kind: 'Ligament', where: 'Between lunate and triquetrum, pinky side.', loads: 'Tilting toward the thumb, palm-down loading, falls onto the hand.', hyp: 'Pulled on by the sagging pinky-side carpus.', support: 'Pisiform lift / pinky-side support.' },
    volar: { name: 'Palm-side wrist ligaments', kind: 'Ligaments (radioscaphocapitate, radiolunate)', where: 'Palm side, from the radius to the carpal bones.', loads: 'End-range extension — these are the brakes in push-ups, planks and yoga.', hyp: 'The range goes further before they stop it, so the end-stop comes later and harder.', support: 'Limit end-range extension: fists, handles or wedges, or an X-tape over the palm side.' },
    dorsal: { name: 'Back-of-wrist ligaments', kind: 'Ligaments (dorsal radiocarpal, dorsal intercarpal)', where: 'Back of the wrist.', loads: 'End-range flexion, especially with load.', hyp: 'Later, harder end-stop in flexion.', support: 'Carpal wrap; keep loaded work out of deep flexion.' },
    midcarpal: { name: 'Midcarpal joint, pinky side', kind: 'Joint and ligaments', where: 'Between the two rows of carpal bones.', loads: 'Palm-down loading and grip.', hyp: 'Typical in hypermobility: the hand sags palm-ward here and "clunks" when tilting toward the pinky (midcarpal instability).', support: 'Pisiform lift — pushes the pinky-side carpus back up (tape strip 2 or a pisiform-boost splint).' },
    flexors: { name: 'Finger flexor tendons', kind: 'Tendons', where: 'Through the carpal tunnel, palm side.', loads: 'Grip force. Carpal-tunnel pressure rises in deep flexion and in deep extension.', hyp: 'Muscles co-contract more to make up for loose ligaments, which tires them.', support: 'Thicker handles, lighter grip, neutral wrist.' },
    extensors: { name: 'Wrist and finger extensors', kind: 'Tendons and muscles', where: 'Back of the forearm into the hand, up to the elbow (tennis-elbow area).', loads: 'Gripping with the wrist bent palm-ward — they hold the wrist up against the grip.', hyp: 'Extra stabilising work, so they fatigue sooner.', support: 'Grip with the wrist neutral or slightly extended; counterforce strap at the elbow if sore there.' },
    fcu: { name: 'FCU tendon and pisiform', kind: 'Tendon', where: 'Palm side, pinky edge, inserting on the pisiform.', loads: 'Loaded pinky-side tilt or extension, carrying heavy bags.', hyp: 'Works as an active stabiliser of the pinky side.', support: 'Pisiform lift; carry closer to neutral.' },
  } satisfies Record<StructureId, StructureText>,

};

export type Strings = typeof en;
export const t: Strings = en;
