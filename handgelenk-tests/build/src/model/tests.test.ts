import { describe, expect, it } from 'vitest';
import { TESTS, blend, stepTarget } from './tests';
import rig from '../scene/rigdata.json';
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
        expect(['seated_table', 'seated_elbow_vertical', 'seated_under_table', 'chair_press', 'chair_press_up', 'standing']).toContain(s.body);
        for (const h of s.holds ?? []) expect(['forearm', 'wrist', 'hand']).toContain(h);
      }
    }
  });

  it('every test names at least one source with a full citation', () => {
    for (const x of TESTS) {
      expect(x.sources.length, x.id).toBeGreaterThan(0);
      for (const s of x.sources) {
        expect(s.short, x.id).toMatch(/\d{4}$/);
        expect(s.cite.length, x.id).toBeGreaterThan(40);
        if (s.url) expect(s.url, x.id).toMatch(/^https:\/\/doi\.org\/10\./);
      }
    }
  });

  it('every step has text and a positive duration', () => {
    for (const t of TESTS) for (const s of t.steps) { expect(s.text.length).toBeGreaterThan(5); expect(s.dur).toBeGreaterThan(0); }
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
