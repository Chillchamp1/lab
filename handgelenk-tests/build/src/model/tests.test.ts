import { describe, expect, it } from 'vitest';
import { BODIES, TESTS, blend, stepTarget } from './tests';
import { EXERCISES, PROGRAMS } from './exercises';
import rig from '../scene/rigdata.json';
import { LANDMARKS } from '../scene/landmarks';
import { PROP_IDS } from '../scene/props';
import { STRUCTURE_IDS } from './structures';
import { en } from '../i18n/en';

const LM = Object.keys(rig.landmarks);

describe('clinical test data', () => {
  it.each(TESTS.map((t) => [t.id, t] as const))('%s references only known landmarks', (_id, t) => {
    const used = [...t.painZones, ...t.steps.flatMap((s) => [...(s.contacts ?? []), ...(s.forces ?? []).map((f) => f.at)])];
    for (const id of used) {
      expect(LM).toContain(id);
      expect(en.landmarks).toHaveProperty(id);
    }
  });

  it('every test carries a risk level, a presentation and a posture per step', () => {
    for (const t of TESTS) {
      expect([1, 2, 3]).toContain(t.risk.level);
      expect(t.risk.note.length).toBeGreaterThan(10);
      expect(['skin', 'xray', 'bones']).toContain(t.present);
      for (const s of t.steps) {
        expect(BODIES).toContain(s.body);
        for (const h of s.holds ?? []) expect(['forearm', 'wrist', 'hand']).toContain(h);
      }
    }
  });

  it('every test and exercise names at least one source with a full citation', () => {
    for (const x of PROGRAMS) {
      expect(x.sources.length, x.id).toBeGreaterThan(0);
      for (const s of x.sources) {
        expect(s.short, x.id).toMatch(/\d{4}$/);
        expect(s.cite.length, x.id).toBeGreaterThan(40);
        if (s.url) expect(s.url, x.id).toMatch(/^https:\/\/doi\.org\/10\./);
      }
    }
  });

  it('every step has text and a positive duration', () => {
    for (const t of PROGRAMS) for (const s of t.steps) { expect(s.text.length).toBeGreaterThan(5); expect(s.dur).toBeGreaterThan(0); }
  });
});

describe('exercise data', () => {
  it.each(EXERCISES.map((x) => [x.id, x] as const))('%s is complete and references only known things', (_id, x) => {
    for (const k of ['name', 'group', 'summary', 'goal', 'dose', 'progress', 'stop', 'equipment'] as const) expect(x[k].length, k).toBeGreaterThan(3);
    expect([1, 2, 3]).toContain(x.risk.level);
    if (x.prop) expect(PROP_IDS).toContain(x.prop);
    for (const id of x.targets) expect(STRUCTURE_IDS).toContain(id);
    for (const s of x.steps) {
      expect(BODIES).toContain(s.body);
      for (const f of s.forces ?? []) expect(Object.keys(LANDMARKS)).toContain(f.at);
      // a lax wrist trains in mid-range: no step goes near the end of the normal range
      expect(Math.abs(s.pose.ext)).toBeLessThanOrEqual(35);
      expect(Math.abs(s.pose.dev)).toBeLessThanOrEqual(18);
    }
  });

  it('tests link only to exercises that exist, each with a reason', () => {
    const ids = EXERCISES.map((x) => x.id);
    for (const t of TESTS) for (const f of t.exercises ?? []) {
      expect(ids, t.id).toContain(f.id);
      expect(f.why.length, t.id).toBeGreaterThan(20);
    }
    // a scapholunate problem must not be sent to hard gripping or to the ECU hold
    const sl = TESTS.find((t) => t.id === 'watson_scaphoid_shift')!.exercises!.map((f) => f.id);
    expect(sl).not.toContain('ball_squeeze');
    expect(sl).not.toContain('iso_holds');
  });

  it('ids do not clash with the tests', () => {
    expect(new Set(PROGRAMS.map((p) => p.id)).size).toBe(PROGRAMS.length);
  });
});

describe('step targets', () => {
  const druj = TESTS.find((t) => t.id === 'druj_ballottement')!;
  const ecu = TESTS.find((t) => t.id === 'ecu_subluxation_test')!;
  const clunk = TESTS.find((t) => t.id === 'active_catchup_clunk')!;
  const press = TESTS.find((t) => t.id === 'press_test')!;

  it('scales the DRUJ shift up when hypermobile and down for a normal wrist', () => {
    const base = stepTarget(druj, 1, { hyper: false, positive: true }).kin.drujShift!;
    expect(base).toBe(-1);
    expect(stepTarget(druj, 1, { hyper: true, positive: true }).kin.drujShift).toBeCloseTo(-1.6);
    expect(stepTarget(druj, 1, { hyper: false, positive: false }).kin.drujShift).toBeCloseTo(-0.3);
  });

  it('hides the ECU snap and the clunk for a normal wrist', () => {
    expect(stepTarget(ecu, 1, { hyper: false, positive: true }).kin.ecuSublux).toBe(1);
    expect(stepTarget(ecu, 1, { hyper: false, positive: false }).kin.ecuSublux).toBe(0);
    expect(stepTarget(clunk, 1, { hyper: false, positive: true }).clunkAtDev).toBe(7);
    expect(stepTarget(clunk, 1, { hyper: true, positive: true }).clunkAtDev).toBe(6);
    expect(stepTarget(clunk, 1, { hyper: false, positive: false }).clunkAtDev).toBeUndefined();
  });

  it('adds load-driven findings from the hyper block when a step has none', () => {
    const k = stepTarget(press, 1, { hyper: true, positive: true }).kin;
    expect(k.midcarpalSag).toBeCloseTo(0.6 * 0.9);
    expect(k.drujShift).toBeCloseTo(0.4 * 0.9);
    expect(stepTarget(press, 1, { hyper: false, positive: true }).kin.midcarpalSag).toBeUndefined();
  });

  it('maps grip/axial to load and keeps fingers open for weight bearing', () => {
    const p = stepTarget(press, 1, { hyper: false, positive: true }).pose;
    expect(p.load).toBe(90);
    expect(p.fingers).toBe(0);
  });

  it('blends from the previous step and holds after 60 % of the duration', () => {
    const a = stepTarget(druj, 0, { hyper: false, positive: true }), b = stepTarget(druj, 1, { hyper: false, positive: true });
    expect(blend(a, b, 0, 2).kin.drujShift).toBeCloseTo(0);
    expect(blend(a, b, 0.6, 2).kin.drujShift).toBeCloseTo(-0.5);
    expect(blend(a, b, 1.2, 2).kin.drujShift).toBeCloseTo(-1);
    expect(blend(a, b, 2, 2).kin.drujShift).toBeCloseTo(-1);
  });
});
