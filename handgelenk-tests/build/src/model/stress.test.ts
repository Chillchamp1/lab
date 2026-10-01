// Parity: the ported computeStress must match compute() in the 2D prototype exactly.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { computeStress, type StressInput } from './stress';

const html = readFileSync(new URL('../../docs/wrist-load-model.html', import.meta.url), 'utf8');
const src = html.match(/const RANGE=[^\n]*\n/)![0] + html.match(/const clamp=[^\n]*\n/)![0] +
  html.match(/function compute\(\)\{[\s\S]*?\n\}\n/)![0];
const protoCompute = (S: StressInput) => new Function('S', `${src}; return compute();`)(S);

const cases: StressInput[] = [];
const POSES = [
  { ext: 0, dev: 0, rot: 0, load: 0 }, { ext: 80, dev: 5, rot: -80, load: 85 }, { ext: 88, dev: 10, rot: -85, load: 60 },
  { ext: 20, dev: 15, rot: -80, load: 8 }, { ext: 0, dev: 10, rot: 75, load: 45 }, { ext: -10, dev: 5, rot: 85, load: 65 },
  { ext: 0, dev: 22, rot: 0, load: 70 }, { ext: -30, dev: 15, rot: -30, load: 10 }, { ext: -25, dev: 25, rot: 60, load: 80 },
];
for (const pose of POSES) for (const hyper of [false, true]) for (const sup of [0, 1, 2, 7])
  cases.push({ ...pose, hyper, band: !!(sup & 1), lift: !!(sup & 2), wrap: !!(sup & 4) });
cases.push({ ext: -95, dev: 45, rot: 100, load: 100, hyper: true, band: false, lift: false, wrap: false });

describe('computeStress', () => {
  it.each(cases.map((c, i) => [i, c] as const))('matches the prototype (case %i)', (_i, c) => {
    const a = computeStress(c), b = protoCompute(c);
    for (const k of Object.keys(b.st)) expect(a.st[k as keyof typeof a.st]).toBeCloseTo(b.st[k], 12);
    expect(a.sublux).toBe(!!b.sublux);
    expect(a.beyond).toBe(b.beyond);
    expect(a.druj).toBeCloseTo(b.druj, 12);
    expect(a.sag).toBeCloseTo(b.sag, 12);
  });
});
