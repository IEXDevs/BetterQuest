import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { extractReviewStats } from '../src/features/courses/review-enhancer';
import { readAssessmentResponses } from '../src/adapters/quest/assessment';
import { enhanceCourseHero, disposeCourseHero } from '../src/features/courses/hero';
import { createFeatureRuntime } from '../src/features/lifecycle';
import { createNavigationButton } from '../src/content/ui';
import { createThemeScope } from '../src/features/theme/tokens';
import { createInteractivePdfViewer, type InteractivePdfDocument } from '../src/features/assessment/pdf-viewer';

test('saved toolbar control is icon-only and retains its accessible name', () => {
  const dom = new JSDOM();
  try {
    const { savedButton } = createNavigationButton(dom.window.document, true, () => {});
    assert.equal(savedButton.textContent, '');
    assert.equal(savedButton.getAttribute('aria-label'), 'Saved Questions');
    assert.ok(savedButton.querySelector('svg'));
  } finally { dom.window.close(); }
});

test('unchanged theme updates produce no mutations that can retrigger the page observer', () => {
  const dom = new JSDOM('<main></main>');
  dom.window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList;
  const root = dom.window.document.querySelector('main')!;
  const theme = createThemeScope(root, dom.window as unknown as Window, 'dark');
  const observer = new dom.window.MutationObserver(() => {});
  observer.observe(root, { attributes: true, attributeFilter: ['style'] });
  try {
    for (let i = 0; i < 20; i++) theme.update('dark');
    const writes = observer.takeRecords().length;
    console.log(`theme: ${writes} style mutations / 20 unchanged updates`);
    assert.equal(writes, 0);
    theme.update('light');
    assert.ok(observer.takeRecords().length > 0, 'real preference changes still paint');
  } finally { observer.disconnect(); theme.dispose(); dom.window.close(); }
});

test('repeated review stats reads allocate no cloned DOM and exclude extension text', () => {
  const dom = new JSDOM(`<div id="review"><p>Completed 46 of 121 review problems</p>${'<div><span>Native content</span></div>'.repeat(500)}<div data-betterquest="review-dashboard">Completed 999 of 999 review problems</div></div>`);
  try {
    const root = dom.window.document.querySelector<HTMLElement>('#review')!;
    let clones = 0;
    const original = root.cloneNode;
    root.cloneNode = function (deep) { clones++; return original.call(this, deep); };
    for (let i = 0; i < 20; i++) assert.equal(extractReviewStats(root)?.completed, 46);
    console.log(`review: ${clones} deep clones / 20 reads of a ${root.querySelectorAll('*').length + 1}-element fixture`);
    assert.equal(clones, 0);
  } finally { dom.window.close(); }
});

test('static response rereads reuse synthetic controls and reflect changed answers', () => {
  const html = readFileSync(new URL('./fixtures/quest-responses.html', import.meta.url), 'utf8');
  const dom = new JSDOM(`<div data-betterquest-native-visible="true">${html}</div>`);
  try {
    const doc = dom.window.document;
    const table = doc.querySelector<HTMLTableElement>('table')!;
    const first = readAssessmentResponses(table);
    assert.ok(first.length > 0);
    let created = 0;
    const original = doc.createElement.bind(doc);
    doc.createElement = ((...args: Parameters<typeof doc.createElement>) => { created++; return original(...args); }) as typeof doc.createElement;
    for (let i = 0; i < 20; i++) {
      const rows = readAssessmentResponses(table);
      assert.equal(rows[0].select, first[0].select);
    }
    console.log(`responses: ${created} new elements / 20 unchanged reads`);
    assert.equal(created, 0);
    table.querySelector('tbody > tr > td:nth-child(2)')!.textContent = '4';
    assert.equal(readAssessmentResponses(table)[0].select.value, '4');
  } finally { dom.window.close(); }
});

test('hero cleanup disconnects observers even after Quest removes the course DOM', () => {
  const dom = new JSDOM('<html data-betterquest-animations="disabled"><body><div id="target"><div class="card"><button data-target="#student-course-info-header"><span class="h4">CALCULUS (58735)</span></button><div id="student-course-info-header"></div></div></div></body></html>');
  try {
    const active = new Set<MutationObserver>();
    const Original = dom.window.MutationObserver;
    dom.window.MutationObserver = class extends Original {
      constructor(callback: MutationCallback) { super(callback); active.add(this); }
      disconnect() { active.delete(this); super.disconnect(); }
    };
    const root = dom.window.document.querySelector<HTMLElement>('#target')!;
    for (let i = 0; i < 5; i++) {
      enhanceCourseHero(root);
      assert.equal(active.size, 1);
      const card = root.firstElementChild!;
      card.remove();
      disposeCourseHero(dom.window.document);
      assert.equal(active.size, 0);
      root.append(card);
    }
  } finally { disposeCourseHero(dom.window.document); dom.window.close(); }
});

test('feature refresh bursts serialize work and coalesce to one follow-up', async () => {
  const dom = new JSDOM('<div id="target"></div>', { url: 'https://quest.cns.utexas.edu/student/courses' });
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let running = 0, maximum = 0, calls = 0;
  const runtime = createFeatureRuntime(dom.window.document, [{ name: 'slow', locate: doc => doc.querySelector('#target'), mount: () => ({
    async refresh() { calls++; running++; maximum = Math.max(maximum, running); await gate; running--; }, dispose() {},
  }) }]);
  try {
    runtime.reconcile();
    await Promise.resolve();
    for (let i = 0; i < 20; i++) runtime.refresh();
    await Promise.resolve();
    assert.equal(maximum, 1);
    release();
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(calls, 2);
    runtime.dispose();
    runtime.refresh();
    await Promise.resolve();
    assert.equal(calls, 2);
  } finally { release(); runtime.dispose(); dom.window.close(); }
});

test('late PDF loading releases the document after navigating away', async () => {
  const dom = new JSDOM('<div id="mount"></div>', { url: 'https://quest.cns.utexas.edu/student/instances/show' });
  let resolve!: (source: InteractivePdfDocument) => void;
  const pending = new Promise<InteractivePdfDocument>(done => { resolve = done; });
  let destroyed = 0, rendered = 0;
  const viewer = createInteractivePdfViewer(dom.window.document.querySelector<HTMLElement>('#mount')!, {
    url: '/student/images/problem_pdf?instance=courseuserassignment_1', optionMaximums: new Map(), onChoose() {},
    openDocument: () => pending,
  });
  try {
    viewer.dispose();
    resolve({ pageCount: 3, destroy() { destroyed++; }, async renderPage() { rendered++; return { width: 600, height: 800, runs: [] }; } });
    assert.equal(await viewer.ready, false);
    assert.equal(destroyed, 1);
    assert.equal(rendered, 0);
    assert.equal(dom.window.document.querySelector('[data-betterquest="interactive-pdf"]'), null);
  } finally { viewer.dispose(); dom.window.close(); }
});

test('disposing during a PDF render stops further pages and releases canvas buffers', async () => {
  const dom = new JSDOM('<div id="mount"></div>', { url: 'https://quest.cns.utexas.edu/student/instances/show' });
  let finish!: () => void;
  const pending = new Promise<void>(resolve => { finish = resolve; });
  let rendered = 0, destroyed = 0;
  const viewer = createInteractivePdfViewer(dom.window.document.querySelector<HTMLElement>('#mount')!, {
    url: '/student/images/problem_pdf?instance=courseuserassignment_1', optionMaximums: new Map(), onChoose() {},
    openDocument: async () => ({ pageCount: 3, destroy() { destroyed++; }, async renderPage(_page, canvas) {
      rendered++; canvas.width = 600; canvas.height = 800; await pending;
      return { width: 600, height: 800, runs: [] };
    } }),
  });
  try {
    await Promise.resolve(); await Promise.resolve();
    const canvas = viewer.element.shadowRoot!.querySelector('canvas')!;
    assert.ok(canvas);
    viewer.dispose(); finish();
    assert.equal(await viewer.ready, false);
    assert.equal(rendered, 1);
    assert.equal(destroyed, 1);
    assert.equal(canvas.width, 0); assert.equal(canvas.height, 0);
  } finally { finish(); viewer.dispose(); dom.window.close(); }
});

test('replacing a root cancels the old refresh without queueing work on the disposed feature', async () => {
  const dom = new JSDOM('<div id="target"></div>', { url: 'https://quest.cns.utexas.edu/student/courses' });
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  const calls = [0, 0], signals: AbortSignal[] = [];
  let mounts = 0, disposals = 0;
  const runtime = createFeatureRuntime(dom.window.document, [{ name: 'navigation', locate: doc => doc.querySelector('#target'), mount: () => {
    const index = mounts++;
    return { async refresh(context) { calls[index]++; signals.push(context.signal); await pending; }, dispose() { disposals++; } };
  } }]);
  try {
    runtime.reconcile(); await Promise.resolve(); runtime.refresh();
    dom.window.document.querySelector('#target')!.replaceWith(dom.window.document.createElement('div'));
    dom.window.document.body.lastElementChild!.id = 'target';
    runtime.reconcile(); await Promise.resolve();
    assert.equal(signals[0].aborted, true);
    assert.equal(disposals, 1);
    release(); await new Promise(resolve => setTimeout(resolve, 0));
    assert.deepEqual(calls, [1, 1]);
  } finally { release(); runtime.dispose(); dom.window.close(); }
});
