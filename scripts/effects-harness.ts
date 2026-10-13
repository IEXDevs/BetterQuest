/** Visual smoke-test grid for the react-bits effect ports (dev tool only —
 *  never bundled into the extension).
 *
 *  Build + open:
 *    npx esbuild scripts/effects-harness.ts --bundle --format=iife --outfile=<dir>/harness.js
 *    (write an index.html next to it: <div id="app"></div> + the script)
 *  Effects mount in batches of 6 (hero-size + card-size each) to stay under
 *  the browser's live WebGL context limit; step through with the buttons. */

import { COURSE_EFFECTS } from '../src/features/courses/effects';
import type { CourseEffect } from '../src/features/courses/effects';
import { REACTBITS_EFFECTS } from '../src/features/courses/reactbits';

const BATCH = 6;

interface MountReport { effect: CourseEffect; status: string }

function mountBatch(page: number, app: HTMLElement, log: HTMLElement): (() => void) {
  const dispose: Array<() => void> = [];
  const start = page * BATCH;
  const batch = COURSE_EFFECTS.slice(start, start + BATCH);
  const grid = document.createElement('div');
  grid.className = 'grid';
  const reports: MountReport[] = [];

  for (const effect of batch) {
    const cell = document.createElement('figure');
    const label = document.createElement('figcaption');
    label.textContent = effect;

    const heroLayer = document.createElement('div');
    heroLayer.className = 'layer hero-size';
    const cardWrap = document.createElement('div');
    cardWrap.className = 'card-wrap';
    const cardLayer = document.createElement('div');
    cardLayer.className = 'layer card-size';
    cardWrap.append(cardLayer);

    let status = '';
    for (const [kind, layer] of [['hero', heroLayer], ['card', cardLayer]] as const) {
      const mount = REACTBITS_EFFECTS[effect];
      let instance: ReturnType<typeof mount> = null;
      try {
        instance = mount(layer);
      } catch (error) {
        status += ` ${kind}:THREW(${String(error).slice(0, 60)})`;
        continue;
      }
      if (instance) {
        dispose.push(() => instance.destroy());
        status += ` ${kind}:live`;
      } else {
        status += ` ${kind}:fallback`;
      }
    }
    reports.push({ effect, status: status.trim() });
    label.textContent = `${effect} — ${status.trim()}`;
    cell.append(label, heroLayer, cardWrap);
    grid.append(cell);
  }

  app.replaceChildren(grid);
  log.textContent = reports.map(report => `${report.effect}: ${report.status}`).join('\n');
  return () => { for (const fn of dispose) fn(); };
}

function start(): void {
  const app = document.getElementById('app');
  const log = document.getElementById('log');
  if (!app || !log) return;
  let page = 0;
  let teardown: (() => void) | null = null;
  const pages = Math.ceil(COURSE_EFFECTS.length / BATCH);

  const render = (): void => {
    teardown?.();
    teardown = mountBatch(page, app, log);
    const nav = document.getElementById('nav');
    if (nav) nav.textContent = `page ${page + 1} / ${pages}`;
  };

  document.getElementById('prev')?.addEventListener('click', () => {
    page = (page - 1 + pages) % pages;
    render();
  });
  document.getElementById('next')?.addEventListener('click', () => {
    page = (page + 1) % pages;
    render();
  });
  render();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
