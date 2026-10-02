// Exercises tab: ground rules, the card for the open exercise (what it trains, how much, how to progress, when to ease
// off, sources) and the list of all exercises. The steps themselves play on the stage, as in the tests.
import { t } from '../i18n/en';
import { useStore } from '../state/store';
import { EXERCISES, EXERCISE_GROUPS, EXERCISE_RULES, type Exercise } from '../model/exercises';
import { Sources } from './TestsPanel';

// Three-segment bar: where an exercise sits in the build-up from holding still to moving a load.
function LevelBar({ x, compact }: { x: Exercise; compact?: boolean }) {
  const lvl = x.risk.level;
  return (
    <span className={`risk lvl l${lvl}${compact ? ' compact' : ''}`} title={x.risk.note}>
      <span className="bar"><i className={lvl >= 1 ? 'on' : ''} /><i className={lvl >= 2 ? 'on' : ''} /><i className={lvl >= 3 ? 'on' : ''} /></span>
      <span className="txt">{t.train.level[lvl]}</span>
    </span>
  );
}

function TrainList() {
  const openTest = useStore((s) => s.openTest), current = useStore((s) => s.player.id);
  return (
    <section className="card">
      <h2>{t.train.all}</h2>
      <p className="note pick">{t.train.pickHint}</p>
      {EXERCISE_GROUPS.map((g) => (
        <div key={g} className="tgroup">
          <h3>{g}</h3>
          <div className="list">
            {EXERCISES.filter((x) => x.group === g).map((x) => (
              <button key={x.id} id={`ex-${x.id}`} className="row test" aria-current={current === x.id} onClick={() => { openTest(x.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                <span className="go" aria-hidden="true">▶</span>
                <span className="nm">{x.name}</span>
                <span className="meaning">{x.summary}</span>
                <span className="meta"><LevelBar x={x} compact /><span className="badge">{x.equipment}</span></span>
                <span className="chev" aria-hidden="true">›</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function TrainRules() {
  return (
    <section className="card rules">
      <h2>{t.train.rulesTitle}</h2>
      <ul>{EXERCISE_RULES.map((r) => <li key={r}>{r}</li>)}</ul>
    </section>
  );
}

function TrainInfo({ x }: { x: Exercise }) {
  return (
    <section className="card result">
      <h2>{x.name}</h2>
      <div className="riskrow"><LevelBar x={x} /><span className="note">{x.risk.note}</span></div>
      <dl>
        <div><dt>{t.train.goal}</dt><dd>{x.goal}</dd></div>
        <div><dt>{t.train.equipment}</dt><dd>{x.equipment}</dd></div>
        <div><dt>{t.train.dose}</dt><dd>{x.dose}</dd></div>
        <div><dt>{t.train.progress}</dt><dd>{x.progress}</dd></div>
        <div className="hyp"><dt>{t.train.stop}</dt><dd>{x.stop}</dd></div>
        <Sources of={x} note={t.train.sourcesNote} />
      </dl>
      <p className="note keys">{t.keys}</p>
    </section>
  );
}

export function TrainPanel() {
  const id = useStore((s) => s.player.id);
  const x = EXERCISES.find((e) => e.id === id);
  return (
    <>
      {x ? <TrainInfo x={x} /> : <TrainRules />}
      <TrainList />
    </>
  );
}
