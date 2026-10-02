import { useEffect, useRef, useState } from 'react';
import { t } from '../i18n/en';
import { useStore, stressOf } from '../state/store';
import { RANGE, fingersForLoad, type PoseKey } from '../model/pose';
import { recommendations, strainCss } from '../model/stress';
import { STRUCTURE_IDS } from '../model/structures';
import type { Layers } from '../state/store';
import type { Present } from '../model/tests';

const pct = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 100);

export function useStress() {
  const pose = useStore((s) => s.pose), hyper = useStore((s) => s.hyper), supports = useStore((s) => s.supports);
  return stressOf({ pose, hyper, supports });
}

export function StageOverlay() {
  const c = useStress();
  const clunkSeq = useStore((s) => s.clunkSeq);
  const [toast, setToast] = useState(false);
  const first = useRef(clunkSeq);
  useEffect(() => {
    if (clunkSeq === first.current) return;
    setToast(true);
    const id = setTimeout(() => setToast(false), 2800);
    return () => clearTimeout(id);
  }, [clunkSeq]);
  return (
    <>
      <div className="notices">
        {c.beyond && <div className="notice warn">{t.notices.beyond}</div>}
        {c.sublux && <div className="notice warn">{t.notices.sublux}</div>}
      </div>
      <div className={`toast${toast ? ' on' : ''}`} role="status">{toast ? t.notices.clunk : ''}</div>
    </>
  );
}

type SliderKey = PoseKey | 'load';
function Slider({ k }: { k: SliderKey }) {
  const v = useStore((s) => s.pose[k]), hyper = useStore((s) => s.hyper), setPose = useStore((s) => s.setPose);
  const range = k === 'load' ? [0, 100] : (hyper ? RANGE.hyper : RANGE.normal)[k];
  const L = t.sliders[k];
  return (
    <div className="slider">
      <div className="top"><label htmlFor={`sl-${k}`}>{L.label}</label><b>{t.values[k](v)}</b></div>
      <input type="range" id={`sl-${k}`} min={range[0]} max={range[1]} step={1} value={v}
        onChange={(e) => setPose(k === 'load' ? { load: +e.target.value, fingers: fingersForLoad(+e.target.value) } : { [k]: +e.target.value })} />
      <div className="ends"><span>{L.lo}</span><span>{L.hi}</span></div>
    </div>
  );
}

export function Toggle({ id, on, onClick, label, sub, hyper }: { id: string; on: boolean; onClick: () => void; label: string; sub: string; hyper?: boolean }) {
  return (
    <button id={id} className={`tg${hyper ? ' hyper' : ''}`} aria-pressed={on} onClick={onClick}>
      <span className="sw" /><span>{label}<small>{sub}</small></span>
    </button>
  );
}

export function PoseCard() {
  const reset = useStore((s) => s.reset);
  const hyper = useStore((s) => s.hyper), toggleHyper = useStore((s) => s.toggleHyper);
  const sup = useStore((s) => s.supports), toggleSupport = useStore((s) => s.toggleSupport);
  return (
    <section className="card">
      <div className="card-head"><h2>{t.pose}</h2><button id="reset" className="chip" onClick={reset}>{t.reset}</button></div>
      {(['ext', 'dev', 'rot', 'load'] as SliderKey[]).map((k) => <Slider key={k} k={k} />)}
      <div className="toggles">
        <Toggle id="t-hyper" hyper on={hyper} onClick={toggleHyper} {...t.toggles.hyper} />
        <div className="grouplabel">{t.toggles.supportGroup}</div>
        <Toggle id="t-band" on={sup.band} onClick={() => toggleSupport('band')} {...t.toggles.band} />
        <Toggle id="t-lift" on={sup.lift} onClick={() => toggleSupport('lift')} {...t.toggles.lift} />
        <Toggle id="t-wrap" on={sup.wrap} onClick={() => toggleSupport('wrap')} {...t.toggles.wrap} />
      </div>
    </section>
  );
}

export function RecsCard() {
  const c = useStress(), sup = useStore((s) => s.supports);
  const recs = recommendations(c, sup);
  return (
    <section className="card">
      <h2>{t.recsTitle}</h2>
      <ul className="recs">
        {recs.length ? recs.map((r) => <li key={r.k}>{t.recs[r.k]}{r.on && <span className="on-tag">{t.recs.on}</span>}</li>) : <li>{t.recs.none}</li>}
      </ul>
    </section>
  );
}

export function StrainList() {
  const c = useStress();
  const selected = useStore((s) => s.selected), select = useStore((s) => s.select);
  const rows = STRUCTURE_IDS.map((id) => ({ id, v: c.st[id] })).sort((p, q) => q.v - p.v);
  return (
    <section className="card">
      <h2>{t.listTitle}</h2>
      <div className="list">
        {rows.map((r) => (
          <button key={r.id} id={`row-${r.id}`} className="row" aria-current={selected === r.id}
            onClick={() => select(r.id)}>
            <span className="nm">{t.structures[r.id].name}{r.v > 1 && <span className="tag">{t.pastLimit}</span>}</span>
            <span className="pc">{pct(r.v)}%</span>
            <span className="bar"><i style={{ width: `${pct(r.v)}%`, background: strainCss(r.v) }} /></span>
          </button>
        ))}
      </div>
      <p className="note">{t.heuristicNote}</p>
    </section>
  );
}

export function DetailCard() {
  const c = useStress();
  const id = useStore((s) => s.selected), hyper = useStore((s) => s.hyper);
  const d = t.structures[id], v = c.st[id];
  const lvl = v < 0.33 ? 'low' : v < 0.66 ? 'moderate' : 'high';
  return (
    <section className="card detail" aria-live="polite">
      <h3>{d.name}</h3>
      <div className="kind">{d.kind} · {t.detail.now} {pct(v)}% ({t.detail.levels[lvl]})</div>
      <dl>
        <div><dt>{t.detail.where}</dt><dd>{d.where}</dd></div>
        <div><dt>{t.detail.loads}</dt><dd>{d.loads}</dd></div>
        <div className={hyper ? 'hyp' : ''}><dt>{t.detail.hyp}</dt><dd>{d.hyp}</dd></div>
        <div><dt>{t.detail.support}</dt><dd>{d.support}</dd></div>
      </dl>
    </section>
  );
}

// Stage control: what is drawn. Each test sets its own default; the user can override.
export function PresentBar() {
  const present = useStore((s) => s.present), setPresent = useStore((s) => s.setPresent);
  return (
    <div className="stagebar">
      <div className="seg small" role="group" aria-label={t.present.label}>
        {(['skin', 'xray', 'bones'] as Present[]).map((p) => (
          <button key={p} id={`present-${p}`} aria-pressed={present === p} onClick={() => setPresent(p)}>{t.present[p]}</button>
        ))}
      </div>
    </div>
  );
}

// Explore mode: free posing plus the advanced display toggles, folded away.
export function ExplorePanel() {
  const layers = useStore((s) => s.layers), toggle = useStore((s) => s.toggleLayer);
  return (
    <>
      <p className="note top">{t.intros.free}</p>
      <PoseCard />
      <RecsCard />
      <StrainList />
      <DetailCard />
      <details className="card options">
        <summary>{t.explore.options}</summary>
        <div className="grouplabel">{t.layers.label}</div>
        <div className="chiprow">
          {(['bones', 'ligaments', 'tendons', 'supports'] as (keyof Layers)[]).map((k) => (
            <button key={k} id={`layer-${k}`} className="chip" aria-pressed={layers[k]} onClick={() => toggle(k)}>{t.layers[k]}</button>
          ))}
        </div>
        <p className="note">{t.explore.hint}</p>
      </details>
    </>
  );
}
