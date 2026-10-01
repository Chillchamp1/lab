// Port of compute() from the 2D prototype (docs/wrist-load-model.html). Hand-tuned heuristic, not measured.
// Keep this numerically identical to the prototype; stress.test.ts checks parity.
import type { StructureId } from './structures';
import { RANGE } from './pose';

export type StressInput = {
  ext: number; dev: number; rot: number; load: number;
  hyper: boolean; band: boolean; lift: boolean; wrap: boolean;
};
export type Stress = {
  e: number; f: number; ud: number; rd: number; pro: number; sup: number; L: number; lax: number;
  druj: number; sag: number; slGap: number; st: Record<StructureId, number>; sublux: boolean; beyond: boolean;
};

export function computeStress(S: StressInput): Stress {
  const e = Math.max(S.ext, 0) / 70, f = Math.max(-S.ext, 0) / 75, ud = Math.max(S.dev, 0) / 35, rd = Math.max(-S.dev, 0) / 20,
    pro = Math.max(-S.rot, 0) / 80, sup = Math.max(S.rot, 0) / 85, L = S.load / 100, lax = S.hyper ? 1 : 0;
  const druj = (0.22 * (pro + sup) + 0.3 * L) * (1 + 1.3 * lax) * (S.band ? 0.4 : 1);
  const sag = lax * (0.35 + 0.65 * L) * (S.lift ? 0.35 : 1) * (S.wrap ? 0.8 : 1);
  const slGap = (lax ? 1 : 0.25) * (0.15 + 0.85 * L * (0.5 + 0.5 * ud)) * (S.wrap ? 0.65 : 1);
  const st: Record<StructureId, number> = {
    tfcc: (0.42 * ud + 0.2 * pro + 0.36 * L + 0.15 * e * L + 0.3 * druj) * (S.band ? 0.72 : 1) * (S.lift ? 0.9 : 1),
    druj: (0.5 * Math.max(pro, sup) ** 2 + 0.15 * L + 0.5 * druj) * (S.band ? 0.8 : 1),
    ecu: (0.45 * sup + 0.25 * f + 0.3 * ud + 0.15 * L + 0.2 * lax * L) * (S.band ? 0.88 : 1),
    ulnocarpal: (0.4 * e + 0.3 * sup + 0.2 * rd + 0.2 * L * e + 0.25 * sag) * (S.lift ? 0.8 : 1),
    sl: (0.3 * e + 0.2 * ud + 0.35 * L + 0.35 * slGap) * (S.wrap ? 0.82 : 1),
    lt: (0.35 * rd + 0.2 * pro + 0.25 * L + 0.15 * e + 0.25 * sag) * (S.lift ? 0.88 : 1),
    volar: 0.85 * Math.pow(e, 1.4) + 0.2 * L * e + 0.2 * sag,
    dorsal: (0.85 * Math.pow(f, 1.4) + 0.15 * L + 0.15 * lax * f) * (S.wrap ? 0.9 : 1),
    midcarpal: 0.25 * L + 0.25 * pro + 0.15 * ud + 0.65 * sag,
    flexors: 0.5 * L + 0.3 * f + 0.25 * e,
    extensors: 0.38 * L + 0.35 * f * L + 0.2 * f + 0.15 * lax * L,
    fcu: (0.2 * L + 0.3 * ud * L + 0.25 * e * L + 0.15 * lax * L + 0.1 * e) * (S.lift ? 0.85 : 1),
  };
  const sublux = (sup > 0.55 && ud > 0.25 && f > 0.15) || (!!lax && st.ecu > 0.75 && sup > 0.4);
  const N = RANGE.normal;
  const beyond = S.ext > N.ext[1] || S.ext < N.ext[0] || S.dev > N.dev[1] || S.dev < N.dev[0] || S.rot > N.rot[1] || S.rot < N.rot[0];
  return { e, f, ud, rd, pro, sup, L, lax, druj, sag, slGap, st, sublux, beyond };
}

export type RecId = 'band' | 'lift' | 'wrap' | 'ext';
export function recommendations(c: Stress, on: { band: boolean; lift: boolean; wrap: boolean }) {
  const st = c.st;
  return ([
    { k: 'band', on: on.band, v: Math.max(st.tfcc, st.druj, st.ecu * 0.6) },
    { k: 'lift', on: on.lift, v: Math.max(st.midcarpal, st.ulnocarpal, st.lt, st.fcu * 0.7) },
    { k: 'wrap', on: on.wrap, v: Math.max(st.sl, st.dorsal * 0.8) },
    { k: 'ext', on: false, v: st.volar },
  ] as { k: RecId; on: boolean; v: number }[])
    .filter((r) => r.v > 0.3).sort((p, q) => q.v - p.v).slice(0, 3);
}

// teal → ochre → crimson, as in the prototype
export function strainRGB(v: number): [number, number, number] {
  v = Math.max(0, Math.min(1, v));
  const a = [46, 139, 122], b = [211, 155, 46], c = [194, 54, 58];
  const [p, q, t] = v < 0.5 ? [a, b, v / 0.5] : [b, c, (v - 0.5) / 0.5];
  return p.map((x, i) => Math.round(x + (q[i] - x) * t)) as [number, number, number];
}
export const strainCss = (v: number) => `rgb(${strainRGB(v).join(',')})`;
