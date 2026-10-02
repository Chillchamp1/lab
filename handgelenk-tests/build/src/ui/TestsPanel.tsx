import { useRef, useState } from 'react';
import { t } from '../i18n/en';
import { guided, painShown, useStore, type Mode } from '../state/store';
import { GLOBAL_RULES, TESTS, TEST_GROUPS, stepWho, type Force, type Program, type Test } from '../model/tests';
import { findProgram } from '../model/exercises';
import { FORCE_COLOR } from '../scene/TestOverlay';
import { SCENES } from '../scene/Figure';

export function ModeTabs() {
  const mode = useStore((s) => s.mode), setMode = useStore((s) => s.setMode);
  return (
    <div className="seg modes" role="tablist" aria-label="Mode">
      {(['test', 'train', 'free'] as Mode[]).map((m) => (
        <button key={m} id={`mode-${m}`} role="tab" aria-selected={mode === m} aria-pressed={mode === m} onClick={() => setMode(m)}>{t.modes[m]}</button>
      ))}
    </div>
  );
}

export function SideSwitch() {
  const side = useStore((s) => s.side), setSide = useStore((s) => s.setSide);
  return (
    <div className="sideswitch">
      <span className="lbl">{t.side.label}</span>
      <div className="seg small" role="group" aria-label={t.side.label}>
        {(['L', 'R'] as const).map((s) => <button key={s} id={`side-${s}`} aria-pressed={side === s} onClick={() => setSide(s)}>{t.side[s]}</button>)}
      </div>
    </div>
  );
}

// Three-segment bar: how far a layperson should go with this test.
function RiskBar({ test, compact }: { test: Test; compact?: boolean }) {
  const lvl = test.risk.level;
  return (
    <span className={`risk l${lvl}${compact ? ' compact' : ''}`} title={test.risk.note}>
      <span className="bar"><i className={lvl >= 1 ? 'on' : ''} /><i className={lvl >= 2 ? 'on' : ''} /><i className={lvl >= 3 ? 'on' : ''} /></span>
      <span className="txt">{t.risk[lvl]}</span>
    </span>
  );
}

type Filter = 'all' | 'self' | 'partner' | 'examiner';
const matches = (f: Filter, x: Test) =>
  f === 'all' || (f === 'self' && x.homeOk && !x.needsPartner) || (f === 'partner' && x.homeOk && x.needsPartner) || (f === 'examiner' && !x.homeOk);

// The list of all tests; always shown, the open test is marked.
function TestList() {
  const openTest = useStore((s) => s.openTest), current = useStore((s) => s.player.id);
  const [filter, setFilter] = useState<Filter>('all');
  return (
    <section className="card">
      <h2>{t.tests.all}</h2>
      <p className="note pick">{t.tests.pickHint}</p>
      <div className="chiprow filters" role="group" aria-label={t.filters.label}>
        {(['all', 'self', 'partner', 'examiner'] as Filter[]).map((f) => (
          <button key={f} id={`filter-${f}`} className="chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>{t.filters[f]}</button>
        ))}
      </div>
      {TEST_GROUPS.map((g) => {
        const items = TESTS.filter((x) => x.group === g && matches(filter, x));
        if (!items.length) return null;
        return (
          <div key={g} className="tgroup">
            <h3>{g}</h3>
            <div className="list">
              {items.map((x) => (
                <button key={x.id} id={`test-${x.id}`} className="row test" aria-current={current === x.id} onClick={() => { openTest(x.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                  <span className="go" aria-hidden="true">▶</span>
                  <span className="nm">{x.name}</span>
                  <span className="meaning">{x.meaning}</span>
                  <span className="meta"><RiskBar test={x} compact />{x.needsPartner && <span className="badge partner">{t.tests.partner}</span>}</span>
                  <span className="chev" aria-hidden="true">›</span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}

function Rules() {
  return (
    <section className="card rules">
      <h2>{t.tests.rulesTitle}</h2>
      <ul>{GLOBAL_RULES.map((r) => <li key={r}>{r}</li>)}</ul>
    </section>
  );
}

// Full citations with links; used by the test card and the exercise card.
export function Sources({ of, note }: { of: Program; note: string }) {
  return (
    <div className="sources">
      <dt>{t.tests.sources}</dt>
      <dd>
        <ol>
          {of.sources.map((s) => (
            <li key={s.cite}>
              {s.url ? <a href={s.url} target="_blank" rel="noopener noreferrer">{s.cite}</a> : s.cite}
              {s.note && <span className="why"> {s.note}</span>}
            </li>
          ))}
        </ol>
        <p className="note">{note}</p>
      </dd>
    </div>
  );
}

// About the open test: who can do it, what a positive result means, and where the test comes from.
// The steps themselves are shown on the stage; they are not repeated here.
function TestInfo() {
  const p = useStore((s) => s.player);
  const ctl = useStore((s) => s.playerCtl);
  const test = TESTS.find((x) => x.id === p.id)!;

  return (
    <section className="card result">
      <h2>{test.name}</h2>
      <div className="riskrow"><RiskBar test={test} /><span className="note">{test.risk.note}</span></div>
      {test.risk.level === 3 && <div className="banner">{t.risk.banner3}</div>}

      <dl>
        <div className="hyp"><dt>{t.tests.positiveIf}</dt><dd>{test.positive}</dd></div>
        {test.painZones.length > 0 && (
          <div>
            <dt>{t.tests.painZones}</dt>
            <dd>
              {test.painZones.map((z) => t.landmarks[z]).join(', ')}
              {' '}<button className="chip" id="pl-pain" aria-pressed={p.pain} onClick={() => ctl({ pain: !p.pain })}>{t.tests.pain}</button>
            </dd>
          </div>
        )}
        <div><dt>{t.tests.meaning}</dt><dd>{test.meaning}</dd></div>
        <div><dt>{t.tests.home}</dt><dd>{test.home}</dd></div>
        {test.textOnly && <div><dt>{t.tests.textOnly}</dt><dd><ul>{test.textOnly.map((x) => <li key={x}>{x}</li>)}</ul></dd></div>}
        <Sources of={test} note={t.tests.sourcesNote} />
      </dl>
      <p className="note keys">{t.keys}</p>
    </section>
  );
}

export function TestsPanel() {
  const id = useStore((s) => s.player.id);
  return (
    <>
      {id ? <TestInfo /> : <Rules />}
      <TestList />
    </>
  );
}

// One colour per step, so the timeline and the instruction on the stage can be matched at a glance.
export const STEP_COLORS = ['#2E8B7A', '#2F6FB0', '#C9862B', '#7A4FD6', '#C2365A'];
export const stepColor = (i: number) => STEP_COLORS[i % STEP_COLORS.length];

// Under the 3D view: a scrubbable timeline (drag anywhere on it), transport, and the key to the glyphs in the picture.
// The instruction itself is on the stage (Callout).
export function Timeline() {
  const mode = useStore((s) => s.mode), p = useStore((s) => s.player);
  const forces = useStore((s) => s.frame.forces), contacts = useStore((s) => s.frame.contacts);
  const ctl = useStore((s) => s.playerCtl), gotoStep = useStore((s) => s.gotoStep), seek = useStore((s) => s.seek);
  const showPain = useStore(painShown);
  const track = useRef<HTMLDivElement>(null);
  const drag = useRef<{ wasPlaying: boolean } | null>(null);
  const test = findProgram(p.id);
  if (!guided(mode) || !test) return null;

  const step = test.steps[p.step];
  const total = test.steps.reduce((a, x) => a + x.dur, 0);
  const now = p.done ? total : test.steps.slice(0, p.step).reduce((a, x) => a + x.dur, 0) + Math.min(p.t, step.dur);
  const by = [...new Set(forces.map((f: Force) => f.by))];
  const holds = step.holds?.length ?? 0, rest = SCENES[step.body].rest;

  const seekTo = (clientX: number) => {
    const r = track.current!.getBoundingClientRect();
    seek(Math.max(0, Math.min(0.9999, (clientX - r.left) / r.width)) * total);
  };
  const onDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { wasPlaying: p.playing };
    ctl({ playing: false });
    seekTo(e.clientX);
  };
  const onMove = (e: React.PointerEvent) => { if (drag.current) seekTo(e.clientX); };
  const onUp = () => { if (drag.current?.wasPlaying) ctl({ playing: true }); drag.current = null; };
  const onPlay = () => ctl({ playing: !p.playing });

  return (
    <div className="timeline">
      <div className="track" ref={track} role="slider" tabIndex={0} aria-label={t.tests.timeline} aria-valuemin={0} aria-valuemax={Math.round(total * 10)} aria-valuenow={Math.round(now * 10)}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        {test.steps.map((s, i) => {
          const fill = i < p.step || p.done ? 1 : i === p.step ? Math.min(1, p.t / s.dur) : 0;
          return (
            <div key={i} className={`tseg${i === p.step ? ' cur' : ''}`} style={{ flexGrow: s.dur, ['--c' as string]: stepColor(i) }}>
              <span className="lab">{i + 1} · {t.who[stepWho(test, s)]}</span>
              <i style={{ width: `${fill * 100}%` }}><span className="lab">{i + 1} · {t.who[stepWho(test, s)]}</span></i>
            </div>
          );
        })}
        <div className="playhead" style={{ left: `${(now / total) * 100}%` }} />
      </div>

      <div className="tl-row">
        <div className="transport">
          <button id="pl-prev" aria-label={t.tests.prev} onClick={() => { gotoStep(p.step - 1); ctl({ playing: true }); }} disabled={p.step === 0}>⏮</button>
          <button id="pl-play" className="primary" onClick={onPlay}>{p.playing ? `⏸ ${t.tests.pause}` : `▶ ${t.tests.play}`}</button>
          <button id="pl-next" aria-label={t.tests.next} onClick={() => { gotoStep(p.step + 1); ctl({ playing: true }); }} disabled={p.step >= test.steps.length - 1}>⏭</button>
        </div>
        {(by.length > 0 || contacts.length > 0 || showPain || holds > 0 || rest) && (
          <div className="legend" aria-label={t.tests.legendLabel}>
            {by.map((b) => <span key={b}><i style={{ background: FORCE_COLOR[b] }} />{t.tests.legend[b]}</span>)}
            {contacts.length > 0 && <span><i className="pad" />{t.tests.legend.pad}</span>}
            {holds > 0 && <span><i className={mode === 'train' ? 'hold self' : 'hold'} />{mode === 'train' ? t.limiters.heldSelf : t.tests.legend.hold}</span>}
            {rest && <span><i className="rest" />{t.tests.legend.rest}</span>}
            {showPain && <span><i className="pain" />{t.tests.legend.pain}</span>}
          </div>
        )}
        <div className="chiprow speed" role="group" aria-label={t.tests.speed}>
          <span className="lbl">{t.tests.speed}</span>
          {[0.5, 1, 2].map((v) => <button key={v} className="chip" aria-pressed={p.speed === v} onClick={() => ctl({ speed: v })}>{v}×</button>)}
        </div>
      </div>
    </div>
  );
}
