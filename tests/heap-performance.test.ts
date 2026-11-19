import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { LocalRepository } from '../src/storage/repository';
import { emptyState } from '../src/shared/models';
import { createPdfAssessmentWorkspace } from '../src/features/assessment/workspace';
import { createInteractivePdfViewer } from '../src/features/assessment/pdf-viewer';

test('a state read makes one isolated copy rather than cloning the full state three times', async () => {
  const raw = emptyState();
  const repository = new LocalRepository({ read: async () => raw, write: async () => {} });
  const original = globalThis.structuredClone;
  let copies = 0;
  globalThis.structuredClone = ((value: unknown) => { copies++; return original(value); }) as typeof structuredClone;
  try {
    const state = await repository.execute({ kind: 'state:read' });
    assert.equal(copies, 1);
    state.preferences.theme = 'dark';
    assert.equal(raw.preferences.theme, 'system');
  } finally { globalThis.structuredClone = original; }
});

test('the repository queue does not retain the last full response after settling', async () => {
  const repository = new LocalRepository({ read: async () => emptyState(), write: async () => {} });
  await repository.execute({ kind: 'state:read' });
  const queue = repository as unknown as { tail: Promise<unknown> };
  assert.equal(await queue.tail, undefined);
});

function pdfPage() {
  const dom = new JSDOM('<div id="target"><div id="pdf-frame"><div id="presentation-pdf-frame"><iframe title="Assignment PDF" src="/student/images/problem_pdf?instance=courseuserassignment_1"></iframe></div></div><div id="view-responses-table-id"><table id="instance-table-courseuserassignment_1"><tbody><tr data-id="cuaip_1"><td>1.</td><td><select name="response"><option value=""></option><option value="1">1</option><option value="2">2</option></select></td><td></td><td class="previous">0 / 3</td><td><button aria-label="Submit response">Submit</button></td></tr></tbody></table></div></div>', { url: 'https://quest.cns.utexas.edu/student/instances/show?instance=courseuserassignment_1', pretendToBeVisual: true });
  dom.window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList;
  return dom;
}

for (const ready of [true, false]) test(`native PDF source is suspended for custom viewing and restored on ${ready ? 'disposal' : 'failure'}`, async () => {
  const dom = pdfPage();
  const doc = dom.window.document;
  const frame = doc.querySelector('iframe')!;
  const originalSource = frame.getAttribute('src');
  let opened = '', loads = 0;
  const workspace = createPdfAssessmentWorkspace(doc.querySelector<HTMLElement>('#target')!, {
    createPdfViewer: (container, options) => {
      opened = options.url; loads++;
      const element = doc.createElement('section'); element.dataset.betterquest = 'interactive-pdf'; container.append(element);
      return { element, ready: Promise.resolve(ready), dispose() { element.remove(); } };
    },
  });
  try {
    workspace.reconcile();
    assert.match(opened, /problem_pdf/);
    assert.equal(frame.getAttribute('src'), null, 'hidden native PDF must not keep processing the same document');
    await Promise.resolve(); await Promise.resolve();
    if (ready) {
      for (let i = 0; i < 10; i++) workspace.reconcile();
      assert.equal(loads, 1, 'unchanged refreshes must not reload the PDF');
    } else assert.equal(frame.getAttribute('src'), originalSource);
    workspace.dispose();
    assert.equal(frame.getAttribute('src'), originalSource);
  } finally { workspace.dispose(); dom.window.close(); }
});

test('a disposed PDF viewer cannot remap retained text or recreate choices', async () => {
  const dom = new JSDOM('<div></div>', { url: 'https://quest.cns.utexas.edu/student/instances/show' });
  const viewer = createInteractivePdfViewer(dom.window.document.querySelector('div')!, {
    url: '/student/images/problem_pdf?instance=courseuserassignment_1', optionMaximums: new Map([[1, 2]]), onChoose() {},
    openDocument: async () => ({ pageCount: 1, destroy() {}, async renderPage() {
      return { width: 600, height: 800, runs: ['001', '1.', '2.'].map((text, i) => ({ text, page: 1, top: 40 + i * 40, left: 50, width: 15, height: 12 })) };
    } }),
  });
  try {
    assert.equal(await viewer.ready, true);
    viewer.dispose();
    assert.equal(viewer.setOptionMaximums(new Map([[1, 5]])), false);
  } finally { viewer.dispose(); dom.window.close(); }
});
