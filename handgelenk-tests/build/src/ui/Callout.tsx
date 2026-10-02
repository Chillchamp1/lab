// The current instruction, on the 3D stage: a box in the corner away from the body, and a pointer line from the box to
// the spot the step is about. The box never takes clicks, so dragging through it still rotates the view.
import { useEffect, useRef } from 'react';
import { t } from '../i18n/en';
import { guided, useStore } from '../state/store';
import { stepWho } from '../model/tests';
import { findProgram } from '../model/exercises';
import { calloutBus } from '../scene/CalloutAnchor';
import { stepColor } from './TestsPanel';

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
      if (!visible || d < INSET + 10) { g.style.opacity = '0'; return; } // target behind the camera or under the box
      g.style.opacity = '1';
      const ln = g.firstElementChild!;
      ln.setAttribute('x1', sx.toFixed(1)); ln.setAttribute('y1', sy.toFixed(1));
      ln.setAttribute('x2', x.toFixed(1)); ln.setAttribute('y2', y.toFixed(1));
    };
    return () => { calloutBus.draw = null; };
  }, []);

  const test = findProgram(id);
  if (!guided(mode) || !test) return null;
  const step = test.steps[stepIx], who = stepWho(test, step);
  const color = { ['--c' as string]: stepColor(stepIx) };

  return (
    <>
      <svg ref={svg} className="pointer" aria-hidden="true" style={{ ...color, opacity: 0 }}>
        <line className="ln" />
      </svg>
      <div ref={box} id="callout" className={`callout ${side === 'L' ? 'right' : 'left'}`} style={color} aria-live="polite">
        <div className="head"><span className="tl-count">{t.tests.step(stepIx + 1, test.steps.length)}</span><span className={`who ${who}`}>{t.who[who]}</span></div>
        <p>{step.text}</p>
      </div>
    </>
  );
}
