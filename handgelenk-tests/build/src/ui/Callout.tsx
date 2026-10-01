// The current instruction, on the 3D stage: a box in the corner away from the body, and a pointer line from the box to
// the spot the step is about. The box never takes clicks, so dragging through it still rotates the view.
import { useEffect, useRef } from 'react';
import { t } from '../i18n/en';
import { useStore } from '../state/store';
import { TESTS, stepWho } from '../model/tests';
import { calloutBus } from '../scene/CalloutAnchor';
import { stepColor } from './TestsPanel';

const RING = 8; // px, radius of the ring around the target
const INSET = 12; // px, the line starts this far inside the box (the box is drawn over it)
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export function Callout() {
  const mode = useStore((s) => s.mode), id = useStore((s) => s.player.id), stepIx = useStore((s) => s.player.step);
  const side = useStore((s) => s.side);
  const box = useRef<HTMLDivElement>(null), svg = useRef<SVGSVGElement>(null);

  useEffect(() => {
    // Called by the scene once per frame with the target in stage pixels; writes straight to the SVG, no re-render.
    calloutBus.draw = (x, y, visible) => {
      const b = box.current, g = svg.current;
      if (!b || !g) return;
      const l = b.offsetLeft, tp = b.offsetTop, w = b.offsetWidth, h = b.offsetHeight;
      const sx = clamp(x, l + INSET, l + w - INSET), sy = clamp(y, tp + INSET, tp + h - INSET);
      const d = Math.hypot(x - sx, y - sy);
      if (!visible || d < INSET + RING + 6) { g.style.opacity = '0'; return; } // target behind the camera or under the box
      g.style.opacity = '1';
      const ex = x - ((x - sx) / d) * RING, ey = y - ((y - sy) / d) * RING;
      for (const ln of g.querySelectorAll('line')) {
        ln.setAttribute('x1', sx.toFixed(1)); ln.setAttribute('y1', sy.toFixed(1));
        ln.setAttribute('x2', ex.toFixed(1)); ln.setAttribute('y2', ey.toFixed(1));
      }
      for (const c of g.querySelectorAll('circle')) { c.setAttribute('cx', x.toFixed(1)); c.setAttribute('cy', y.toFixed(1)); }
    };
    return () => { calloutBus.draw = null; };
  }, []);

  const test = TESTS.find((x) => x.id === id);
  if (mode !== 'test' || !test) return null;
  const step = test.steps[stepIx], who = stepWho(test, step);
  const color = { ['--c' as string]: stepColor(stepIx) };

  return (
    <>
      <svg ref={svg} className="pointer" aria-hidden="true" style={{ ...color, opacity: 0 }}>
        <line className="halo" /><circle className="halo" r={RING} />
        <line className="ln" /><circle className="ln" r={RING} />
      </svg>
      <div ref={box} id="callout" className={`callout ${side === 'L' ? 'right' : 'left'}`} style={color} aria-live="polite">
        <div className="head"><span className="tl-count">{t.tests.step(stepIx + 1, test.steps.length)}</span><span className={`who ${who}`}>{t.who[who]}</span></div>
        <p>{step.text}</p>
        <div className="src">{t.tests.source}: {test.sources.map((s) => s.short).join(' · ')}</div>
      </div>
    </>
  );
}
