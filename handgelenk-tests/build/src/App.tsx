import { useEffect } from 'react';
import { t } from './i18n/en';
import { Scene } from './scene/Scene';
import { ExplorePanel, PresentBar, StageOverlay } from './ui/Panels';
import { TrainPanel } from './ui/TrainPanel';
import { ModeTabs, SideSwitch, TestsPanel, Timeline } from './ui/TestsPanel';
import { Callout } from './ui/Callout';
import { guided, useStore } from './state/store';
import { findProgram } from './model/exercises';

function useKeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useStore.getState();
      const test = findProgram(s.player.id);
      if (!guided(s.mode) || !test || (e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.key === ' ') { e.preventDefault(); s.playerCtl({ playing: !s.player.playing }); }
      else if (e.key === 'ArrowRight') { s.gotoStep(Math.min(test.steps.length - 1, s.player.step + 1)); s.playerCtl({ playing: true }); }
      else if (e.key === 'ArrowLeft') { s.gotoStep(Math.max(0, s.player.step - 1)); s.playerCtl({ playing: true }); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

export function App() {
  const mode = useStore((s) => s.mode);
  useKeys();
  return (
    <>
      <header className="top">
        <div className="brand">
          <h1>{t.titles[mode]}</h1>
          <p>{t.intros[mode]}</p>
        </div>
        <div className="topctl">
          <SideSwitch />
          <ModeTabs />
        </div>
      </header>
      <main className={guided(mode) ? 'wide' : ''}>
        <div className="stage">
          <div className="view">
            <Scene />
            <StageOverlay />
            <PresentBar />
            <Callout />
          </div>
          <Timeline />
        </div>
        <div className="side-col">
          {mode === 'test' ? <TestsPanel /> : mode === 'train' ? <TrainPanel /> : <ExplorePanel />}
        </div>
      </main>
      <footer>
        <p>{t.disclaimer}</p>
        <p>{t.credits}</p>
      </footer>
    </>
  );
}
