import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { readAssessmentResponses } from '../src/adapters/quest/assessment';
import { createPdfAssessmentWorkspace } from '../src/features/assessment/workspace';
import { createInteractivePdfViewer, type InteractivePdfOptions } from '../src/features/assessment/pdf-viewer';
import { numericResponsePlacement } from '../src/features/assessment/numeric-placement';
import type { NumericResponse } from '../src/features/assessment/numeric-response';

const fixture = readFileSync(new URL('./fixtures/quest-numeric-response.html', import.meta.url), 'utf8');
const descriptor: NumericResponse = { value: '', placeholder: 'ex: 20.5 or 3.1e6', title: 'Enter integer, decimal or scientific notation.', maxLength: 255, disabled: false };
const run = (text: string, top: number, left = 50, height = 14) => ({ text, top, left, width: 120, height, page: 1 });
const runs = [run('007', 80), run('Find the value of f at (2, 1)', 130), run('f(x,y) = x+y', 190), run('008', 400), run('Find the derivative', 440), run('1.', 490), run('2.', 550)];

function page() {
  const dom = new JSDOM(`<div id="target"><div id="pdf-frame"><div id="presentation-pdf-frame"><iframe title="Assignment PDF" src="/student/images/problem_pdf?instance=courseuserassignment_1"></iframe></div></div>${fixture}</div>`, { url: 'https://quest.cns.utexas.edu/student/instances/show?instance=courseuserassignment_1', pretendToBeVisual: true });
  dom.window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList;
  return dom;
}

test('verified numeric fields remain native, preserve scientific values, and never invent options from tries', () => {
  const dom = page();
  try {
    const doc = dom.window.document;
    const table = doc.querySelector('table')!;
    const native = doc.querySelector<HTMLInputElement>('input[name="response"]')!;
    native.value = '-3.1e6';
    const before = table.innerHTML;
    let rows = readAssessmentResponses(table);
    assert.equal(rows[0].kind, 'numeric'); assert.equal(rows[0].select, native);
    assert.equal(rows[0].select.value, '-3.1e6'); assert.deepEqual(rows[0].options, []);
    assert.equal(rows[0].answered, false);
    assert.equal(rows[1].select.tagName, 'SELECT'); assert.equal(rows[1].options.length, 2);
    assert.equal(table.innerHTML, before);
    native.disabled = true;
    rows = readAssessmentResponses(table);
    assert.equal(rows[0].answered, true);
  } finally { dom.window.close(); }
});

test('sidebar and PDF numeric inputs mirror the native field and use its Submit exactly once', () => {
  const dom = page(); const doc = dom.window.document;
  let options!: InteractivePdfOptions;
  const mirrored: string[] = [];
  const workspace = createPdfAssessmentWorkspace(doc.querySelector<HTMLElement>('#target')!, {
    createPdfViewer: (container, supplied) => {
      options = supplied;
      const element = doc.createElement('section'); element.dataset.betterquest = 'interactive-pdf'; container.append(element);
      return { element, ready: new Promise(() => {}), setNumericValue(_q: number, value: string) { mirrored.push(value); }, dispose() { element.remove(); } };
    },
  });
  try {
    workspace.reconcile();
    const native = doc.querySelector<HTMLInputElement>('input[name="response"]')!;
    let submissions = 0, inputs = 0, changes = 0;
    const nativeSubmit = native.closest('tr')!.querySelector('button')!;
    nativeSubmit.addEventListener('click', () => { submissions++; });
    native.addEventListener('input', () => { inputs++; }); native.addEventListener('change', () => { changes++; });
    const rail = doc.querySelector('[data-betterquest="assessment-rail"]')!.shadowRoot!;
    const field = rail.querySelector<HTMLInputElement>('[aria-label="Answer for question 7"]')!;
    assert.ok(field); assert.equal(field.placeholder, native.placeholder); assert.equal(field.maxLength, 255);
    assert.equal(rail.querySelector('[data-question-id="cuaip_7"] .choice'), null);
    assert.ok(rail.querySelector('[data-question-id="cuaip_8"] .choice'));
    assert.equal(options.optionMaximums.get(7), 0); assert.equal(options.optionMaximums.get(8), 2);
    field.value = '-3.1e6'; field.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    assert.equal(native.value, '-3.1e6'); assert.equal(inputs, 1); assert.equal(submissions, 0);
    assert.equal(mirrored.at(-1), '-3.1e6');
    assert.equal(options.onNumericInput!(7, '.25'), true); assert.equal(field.value, '.25');
    assert.equal(options.onNumericSubmit!(7, '.25'), true);
    assert.equal(submissions, 1); assert.equal(changes, 1);
    assert.equal(dom.window.sessionStorage.getItem('betterquest_fresh_submits'), null, 'numeric answers are not persisted');
    native.value = '20.5'; native.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    assert.equal(field.value, '20.5');
    native.readOnly = true;
    assert.equal(options.onNumericInput!(7, '999'), false);
    assert.equal(options.onNumericSubmit!(7, '999'), false); assert.equal(submissions, 1);
  } finally { workspace.dispose(); dom.window.close(); }
});

test('PDF places a numeric form after the prompt and before the next question, with no choice badges', async () => {
  const dom = new JSDOM('<div></div>', { url: 'https://quest.cns.utexas.edu/student/instances/show' });
  let answer = '', submits = 0;
  const viewer = createInteractivePdfViewer(dom.window.document.querySelector('div')!, {
    url: '/student/images/problem_pdf?instance=courseuserassignment_1', optionMaximums: new Map([[7, 0], [8, 2]]),
    numericResponses: new Map([[7, descriptor]]), onChoose() {},
    onNumericInput(_q, value) { answer = value; return true; }, onNumericSubmit(_q, value) { answer = value; submits++; return true; },
    openDocument: async () => ({ pageCount: 1, destroy() {}, async renderPage() { return { width: 600, height: 800, runs }; } }),
  });
  try {
    assert.equal(await viewer.ready, true);
    const shadow = viewer.element.shadowRoot!;
    const form = shadow.querySelector<HTMLElement>('.pdf-numeric-response[data-question="7"]')!;
    assert.ok(form);
    const top = Number.parseFloat(form.style.top) / 100 * 800;
    const bottom = top + Number.parseFloat(form.style.height) / 100 * 800;
    assert.ok(top > 204); assert.ok(bottom < 376);
    assert.equal(shadow.querySelector('.option-hit[data-question="7"]'), null);
    assert.ok(shadow.querySelector('.option-hit[data-question="8"]'));
    const field = form.querySelector('input')!;
    field.value = '-2.5e-3'; field.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    assert.equal(answer, '-2.5e-3'); assert.equal(submits, 0);
    field.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    assert.equal(submits, 1);
    viewer.setNumericValue(7, '20.5'); assert.equal(field.value, '20.5');
    viewer.setNumericResponses(new Map([[7, { ...descriptor, value: '21' }]]));
    assert.equal(form.querySelector('input'), field, 'value updates reuse the input instead of remounting it');
    assert.equal(field.value, '21');
    viewer.setAnsweredQuestions(new Set([7])); assert.equal(form.hidden, true);
  } finally { viewer.dispose(); dom.window.close(); }
});

test('tight or unknown PDF gaps stay available in the desk without covering question text', async () => {
  assert.equal(numericResponsePlacement([run('007', 80), run('Prompt', 340), run('008', 370)], 7, new Map([[1, { width: 600, height: 800 }]])), null);
  assert.equal(numericResponsePlacement([run('No text boundary', 80)], 7, new Map([[1, { width: 600, height: 800 }]])), null);
  const dom = new JSDOM('<div></div>', { url: 'https://quest.cns.utexas.edu/student/instances/show' });
  const viewer = createInteractivePdfViewer(dom.window.document.querySelector('div')!, {
    url: '/student/images/problem_pdf?instance=courseuserassignment_1', optionMaximums: new Map([[7, 0]]), numericResponses: new Map([[7, descriptor]]), onChoose() {},
    openDocument: async () => ({ pageCount: 1, destroy() {}, async renderPage() { return { width: 600, height: 800, runs: [run('007', 80), run('Prompt', 740)] }; } }),
  });
  try {
    assert.equal(await viewer.ready, true);
    assert.equal(viewer.element.shadowRoot!.querySelector('.pdf-numeric-response'), null);
    viewer.setAnsweredQuestions(new Set());
    assert.match(viewer.element.shadowRoot!.querySelector('.meta')!.textContent!, /response desk/);
    assert.doesNotMatch(viewer.element.shadowRoot!.querySelector('.meta')!.textContent!, /All questions completed/);
  } finally { viewer.dispose(); dom.window.close(); }
});
