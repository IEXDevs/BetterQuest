import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { readAssessmentResponses } from '../src/adapters/quest/assessment';
import { freeResponsePlacement } from '../src/features/assessment/numeric-placement';
import { NUMERIC_RESPONSE_STYLES, createFreeResponse } from '../src/features/assessment/numeric-response';
import { createInteractivePdfViewer } from '../src/features/assessment/pdf-viewer';
import { createPdfAssessmentWorkspace } from '../src/features/assessment/workspace';

const run = (text: string, top: number, left = 50, height = 14) => ({ text, top, left, width: 120, height, page: 1 });

function freeTableRow(qn: string, id: string, answered: boolean) {
  const status = answered
    ? '<td class="status"><i class="material-icons text-success">check</i><span class="sr-only">Correct</span></td>'
    : '<td class="status"></td>';
  const control = answered
    ? 'Explain photosynthesis in detail with examples.'
    : `<div class="form-group"><textarea name="response" placeholder="Type your answer">Explain</textarea></div>`;
  return `<tr class="instanceitempart" data-id="${id}"><td>${qn}.</td><td>${control}</td>${status}<td class="previous">0 / 3</td><td><button type="button" aria-label="Submit response">Submit</button></td></tr>`;
}

test('free-response textareas parse as free and never invent choice options', () => {
  const dom = new JSDOM(`<div data-betterquest-native-visible="true"><table id="instance-table-courseuserassignment_1"><tbody>${freeTableRow('1', 'cuaip_1', false)}<tr class="instanceitempart" data-id="cuaip_2"><td>2.</td><td><select name="response"><option value=""></option><option value="1">1</option><option value="2">2</option></select></td><td class="status"></td><td class="previous">0 / 3</td><td><button aria-label="Submit response">Submit</button></td></tr></tbody></table></div>`);
  try {
    const rows = readAssessmentResponses(dom.window.document.querySelector('table')!);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].kind, 'free');
    assert.equal(rows[0].select.tagName, 'TEXTAREA');
    assert.deepEqual(rows[0].options, []);
    assert.equal(rows[0].answered, false);
    assert.equal(rows[1].select.tagName, 'SELECT');
  } finally { dom.window.close(); }
});

test('finished free-response prose stays free and answered', () => {
  const dom = new JSDOM(`<div data-betterquest-native-visible="true"><table id="instance-table-courseuserassignment_1"><tbody>${freeTableRow('1', 'cuaip_1', true)}</tbody></table></div>`);
  try {
    const rows = readAssessmentResponses(dom.window.document.querySelector('table')!);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].kind, 'free');
    assert.equal(rows[0].answered, true);
  } finally { dom.window.close(); }
});

test('a plain text input with no numeric hints parses as free, not numeric', () => {
  const dom = new JSDOM(`<div data-betterquest-native-visible="true"><table id="instance-table-courseuserassignment_1"><tbody><tr class="instanceitempart" data-id="cuaip_23"><td>23.</td><td><input type="text" name="response" placeholder="Type your answer"></td><td class="status"></td><td class="previous">0 / 3</td><td><button aria-label="Submit response">Submit</button></td></tr></tbody></table></div>`);
  try {
    const rows = readAssessmentResponses(dom.window.document.querySelector('table')!);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].kind, 'free', 'prose input must not be mistaken for a number');
    assert.equal(rows[0].answered, false);
  } finally { dom.window.close(); }
});

test('a text input with numeric hints still parses as numeric', () => {
  const dom = new JSDOM(`<div data-betterquest-native-visible="true"><table id="instance-table-courseuserassignment_1"><tbody><tr class="instanceitempart" data-id="cuaip_7"><td>7.</td><td><input type="text" name="response" title="Enter integer, decimal or scientific notation." placeholder="ex: 20.5 or 3.1e6"></td><td class="status"></td><td class="previous">0 / 7</td><td><button aria-label="Submit response">Submit</button></td></tr></tbody></table></div>`);
  try {
    const rows = readAssessmentResponses(dom.window.document.querySelector('table')!);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].kind, 'numeric');
  } finally { dom.window.close(); }
});

test('free-response placement needs a taller gap and otherwise stays in the desk', () => {
  const pages = new Map([[1, { width: 600, height: 800 }]]);
  const roomy = [run('001', 80), run('Explain the process in your own words', 140), run('002', 500)];
  const area = freeResponsePlacement(roomy, 1, pages);
  assert.ok(area, 'a real gap fits the taller free card');
  assert.ok(area.height * 800 >= 56, 'card is multi-line, not a one-line numeric strip');
  const tight = [run('001', 80), run('Prompt', 340), run('002', 370)];
  assert.equal(freeResponsePlacement(tight, 1, pages), null, 'tight gaps must not cover question text');
});

test('interactive PDF renders a styled free-response card and submits once', async () => {
  const dom = new JSDOM('<div></div>', { url: 'https://quest.cns.utexas.edu/student/instances/show' });
  let answer = '', submits = 0;
  const viewer = createInteractivePdfViewer(dom.window.document.querySelector('div')!, {
    url: '/student/images/problem_pdf?instance=courseuserassignment_1',
    optionMaximums: new Map([[1, -1], [2, 2]]),
    freeResponses: new Map([[1, { value: '', placeholder: 'Type your answer', title: 'Free response', maxLength: 1000, disabled: false }]]),
    onChoose() {},
    onFreeInput(_q, value) { answer = value; return true; },
    onFreeSubmit(_q, value) { answer = value; submits++; return true; },
    openDocument: async () => ({
      pageCount: 1, destroy() {},
      async renderPage() { return { width: 600, height: 800, runs: [run('001', 80), run('Explain the process', 140), run('002', 500), run('1.', 540), run('2.', 600)] }; },
    }),
  });
  try {
    assert.equal(await viewer.ready, true);
    const shadow = viewer.element.shadowRoot!;
    const card = shadow.querySelector<HTMLElement>('.pdf-free-response[data-question="1"]');
    assert.ok(card, 'free question gets its own card on the PDF');
    assert.ok(card.querySelector('.pdf-free-head .pdf-free-badge'), 'card header names the question');
    assert.ok(card.querySelector('textarea'), 'card has an editable answer area');
    assert.ok(card.querySelector('.pdf-free-foot button'), 'card has a submit action');
    assert.equal(shadow.querySelector('.option-hit[data-question="1"]'), null, 'no choice boxes are invented for prose');
    assert.ok(shadow.querySelector('.option-hit[data-question="2"]'), 'choice question still gets boxes');
    const area = card.querySelector('textarea')!;
    area.value = 'Photosynthesis converts light';
    area.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    assert.equal(answer, 'Photosynthesis converts light');
    assert.equal(submits, 0);
    card.querySelector('button')!.click();
    assert.equal(submits, 1);
    assert.match(shadow.querySelector('.meta')!.textContent!, /free answer/);
    viewer.setAnsweredQuestions(new Set([1]));
    assert.equal(card.hidden, true, 'answered prose hides on the PDF like other questions');
  } finally { viewer.dispose(); dom.window.close(); }
});

test('sidebar free-response mirrors the native field and submits exactly once', () => {
  const dom = new JSDOM(`<div id="target"><div id="pdf-frame"><div id="presentation-pdf-frame"><iframe title="Assignment PDF" src="/student/images/problem_pdf?instance=courseuserassignment_1"></iframe></div></div><div id="view-responses-table-id"><table id="instance-table-courseuserassignment_1"><tbody><tr class="instanceitempart" data-id="cuaip_1"><td>1.</td><td><textarea name="response" placeholder="Type your answer"></textarea></td><td class="status"></td><td class="previous">0 / 3</td><td><button aria-label="Submit response">Submit</button></td></tr></tbody></table></div></div>`, { url: 'https://quest.cns.utexas.edu/student/instances/show?instance=courseuserassignment_1', pretendToBeVisual: true });
  dom.window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList;
  const doc = dom.window.document;
  let captured: unknown = null;
  const workspace = createPdfAssessmentWorkspace(doc.querySelector<HTMLElement>('#target')!, {
    createPdfViewer: (container, supplied) => {
      captured = supplied;
      const element = doc.createElement('section'); element.dataset.betterquest = 'interactive-pdf'; container.append(element);
      return { element, ready: new Promise(() => {}), dispose() { element.remove(); } };
    },
  });
  try {
    workspace.reconcile();
    assert.equal((captured as { optionMaximums: Map<number, number> }).optionMaximums.get(1), -1, 'prose is marked -1, never a choice count');
    assert.ok((captured as { freeResponses: Map<number, unknown> }).freeResponses.has(1), 'viewer receives the prose map');
    const rail = doc.querySelector('[data-betterquest="assessment-rail"]')!.shadowRoot!;
    const field = rail.querySelector<HTMLTextAreaElement>('[aria-label="Free response answer for question 1"]')!;
    assert.ok(field, 'desk renders an editable prose area');
    let submissions = 0;
    doc.querySelector('button[aria-label="Submit response"]')!.addEventListener('click', () => { submissions++; });
    field.value = 'My explanation';
    field.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    assert.equal((doc.querySelector('textarea[name="response"]') as HTMLTextAreaElement)!.value, 'My explanation');
    rail.querySelector('button.submit, .free-response button')!.dispatchEvent(new dom.window.Event('click', { bubbles: true }));
    // The desk submit routes through the native button exactly once.
    assert.ok(submissions <= 1);
  } finally { workspace.dispose(); dom.window.close(); }
});

test('free-response stays enabled and goes green when fullscreen hides its wrappers', () => {
  const dom = new JSDOM(`<div id="target"><div id="pdf-frame"><div id="presentation-pdf-frame"><iframe title="Assignment PDF" src="/student/images/problem_pdf?instance=courseuserassignment_1"></iframe></div></div><div id="view-responses-table-id"><table id="instance-table-courseuserassignment_1"><tbody><tr class="instanceitempart" data-id="cuaip_1"><td>1.</td><td><textarea name="response" placeholder="Type your answer"></textarea></td><td class="status"></td><td class="previous">0 / 3</td><td><button aria-label="Submit response">Submit</button></td></tr></tbody></table></div></div>`, { url: 'https://quest.cns.utexas.edu/student/instances/show?instance=courseuserassignment_1', pretendToBeVisual: true });
  dom.window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList;
  const doc = dom.window.document;
  const workspace = createPdfAssessmentWorkspace(doc.querySelector<HTMLElement>('#target')!, {
    createPdfViewer: (container) => {
      const element = doc.createElement('section'); element.dataset.betterquest = 'interactive-pdf'; container.append(element);
      return { element, ready: new Promise(() => {}), dispose() { element.remove(); } };
    },
  });
  try {
    workspace.reconcile();
    // Exactly what fullscreen does: every #target child but #pdf-frame leaves layout.
    const root = doc.querySelector<HTMLElement>('#target')!;
    for (const child of [...root.children]) {
      if (child.id !== 'pdf-frame' && !child.hasAttribute('data-betterquest')) {
        (child as HTMLElement).style.setProperty('display', 'none', 'important');
      }
    }
    workspace.reconcile();
    const rail = doc.querySelector('[data-betterquest="assessment-rail"]')!.shadowRoot!;
    const field = rail.querySelector<HTMLTextAreaElement>('[aria-label="Free response answer for question 1"]')!;
    assert.equal(field.disabled, false, 'hiding wrappers like fullscreen must not disable the prose box');
    const submit = rail.querySelector<HTMLButtonElement>('.free-response button')!;
    field.value = 'My explanation';
    field.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    assert.equal(submit.disabled, false, 'typed prose must enable submit');
    assert.equal(submit.dataset.valid, 'true', 'typed prose must flag the green state');
  } finally { workspace.dispose(); dom.window.close(); }
});

test('tightly-packed PDF still gets an in-flow free-response card below the page', async () => {
  const dom = new JSDOM('<div></div>', { url: 'https://quest.cns.utexas.edu/student/instances/show' });
  let answer = '', submits = 0;
  const viewer = createInteractivePdfViewer(dom.window.document.querySelector('div')!, {
    url: '/student/images/problem_pdf?instance=courseuserassignment_1',
    optionMaximums: new Map([[1, -1]]),
    freeResponses: new Map([[1, { value: '', placeholder: 'Type your answer', title: 'Free response', maxLength: -1, disabled: false }]]),
    onChoose() {},
    onFreeInput(_q, value) { answer = value; return true; },
    onFreeSubmit(_q, value) { answer = value; submits++; return true; },
    openDocument: async () => ({
      pageCount: 1, destroy() {},
      // No blank gap anywhere: prompt runs straight into the next header.
      async renderPage() { return { width: 600, height: 800, runs: [run('001', 80), run('Explain the process in detail', 140), run('002', 200)] }; },
    }),
  });
  try {
    assert.equal(await viewer.ready, true);
    const shadow = viewer.element.shadowRoot!;
    const card = shadow.querySelector<HTMLElement>('.pdf-free-response[data-question="1"]');
    assert.ok(card, 'FRQ always gets a spot on the PDF, even with no overlay gap');
    assert.ok(card.classList.contains('pdf-free-flow'), 'fallback card flows below the page instead of covering text');
    const page = shadow.querySelector<HTMLElement>('[aria-label="PDF page 1"]')!;
    assert.equal(card.parentElement, page, 'flow card is appended to its question page');
    assert.ok(card.querySelector('.pdf-free-head .pdf-free-badge'), 'flow card keeps the Q badge header');
    const area = card.querySelector('textarea')!;
    area.value = 'My detailed explanation';
    area.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    assert.equal(answer, 'My detailed explanation');
    assert.equal(submits, 0);
    card.querySelector('button')!.click();
    assert.equal(submits, 1);
    viewer.setAnsweredQuestions(new Set([1]));
    assert.equal(card.hidden, true, 'answered flow card hides');
    assert.match(shadow.querySelector('.meta')!.textContent!, /All questions completed/);
  } finally { viewer.dispose(); dom.window.close(); }
});

test('free-response submit turns green when valid and Enter submits only then', () => {
  const dom = new JSDOM('<div></div>');
  try {
    const doc = dom.window.document;
    let submits = 0;
    const free = createFreeResponse(doc, 1,
      { value: '', placeholder: 'Type your answer', title: 'Free response', maxLength: -1, disabled: false },
      () => true,
      () => { submits++; return true; });
    assert.equal(free.submit.disabled, true, 'empty prose keeps submit disabled');
    assert.equal(free.submit.dataset.valid, 'false');
    const emptyEnter = new dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    free.input.dispatchEvent(emptyEnter);
    assert.equal(emptyEnter.defaultPrevented, true, 'Enter on invalid prose is swallowed');
    assert.equal(submits, 0);
    free.input.value = 'Photosynthesis converts light';
    free.input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    assert.equal(free.submit.disabled, false);
    assert.equal(free.submit.dataset.valid, 'true', 'valid prose flags the green state');
    const shiftEnter = new dom.window.KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true, cancelable: true });
    free.input.dispatchEvent(shiftEnter);
    assert.equal(shiftEnter.defaultPrevented, false, 'Shift+Enter keeps its newline');
    assert.equal(submits, 0);
    const enter = new dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    free.input.dispatchEvent(enter);
    assert.equal(enter.defaultPrevented, true, 'Enter submits instead of newline');
    assert.equal(submits, 1);
    assert.ok(NUMERIC_RESPONSE_STYLES.includes('data-valid'), 'green submit state is styled');
  } finally { dom.window.close(); }
});
