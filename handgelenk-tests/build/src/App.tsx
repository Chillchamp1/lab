import { useEffect } from 'react';
import { t } from './i18n/en';
import { Scene } from './scene/Scene';
import { ExplorePanel, PresentBar, StageOverlay } from './ui/Panels';
import { ModeTabs, SideSwitch, TestsPanel, Timeline } from './ui/TestsPanel';
import { useStore } from './state/store';
import { TESTS } from './model/tests';

function useKeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useStore.getState();
      if (s.mode !== 'test' || !s.player.id || (e.target as HTMLElement)?.tagName === 'INPUT') return;
      const test = TESTS.find((x) => x.id === s.player.id)!;
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
          <h1>{t.title}</h1>
          <p>{mode === 'test' ? t.intro : t.exploreIntro}</p>
        </div>
        <div className="topctl">
          <SideSwitch />
          <ModeTabs />
        </div>
      </header>
      <main className={mode === 'test' ? 'wide' : ''}>
        <div className="stage">
          <div className="view">
            <Scene />
            <StageOverlay />
            <PresentBar />
          </div>
          <Timeline />
        </div>
        <div className="side-col">
          {mode === 'test' ? <TestsPanel /> : <ExplorePanel />}
        </div>
      </main>
      <footer>
        <p>{t.disclaimer}</p>
        <p>{t.credits}</p>
      </footer>
    </>
  );
}
