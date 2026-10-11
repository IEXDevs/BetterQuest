import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createPdfAssessmentWorkspace, createSlideAssessmentEnhancement } from '../src/features/assessment/workspace';
import { observeScoped } from '../src/features/lifecycle';
import { createAssessmentHeader } from '../src/features/assessment/header';
import { enhanceCourseReviewTab } from '../src/features/courses/review-enhancer';

function homework(status = '') {
  return new JSDOM('<main id="main-content"><div id="target">' +
    '<p id="due">Due date 10/14/26 11:59 PM</p><br>' +
    '<p id="download"><a href="/student/images/problem_pdf?instance=courseuserassignment_1">PDF w/o expl</a></p>' +
    '<div id="pdf-frame"><div id="presentation-pdf-frame"><iframe title="Assignment PDF" src="/student/images/problem_pdf?instance=courseuserassignment_1"></iframe></div></div>' +
    '<div id="view-responses-table-id"><table id="instance-table-courseuserassignment_1"><tbody>' +
    '<tr data-id="cuaip_1"><td>1.</td><td><select name="response"><option value=""></option><option value="1">1</option><option value="2">2</option></select></td><td class="status">' + status + '</td><td class="previous">1 / 3</td><td><button type="button" aria-label="Submit response">Submit</button></td></tr>' +
    '</tbody></table></div></div></main>', { url: 'https://quest.cns.utexas.edu/student/instances/show?instance=courseuserassignment_1', pretendToBeVisual: true });
}

function mount(dom: JSDOM) {
  const doc = dom.window.document;
  const root = doc.querySelector<HTMLElement>('#target')!;
  const workspace = createPdfAssessmentWorkspace(root, { createPdfViewer: container => {
    const element = doc.createElement('section');
    element.dataset.betterquest = 'interactive-pdf';
    container.append(element);
    return { element, ready: Promise.resolve(true), setSelected() {}, setFullscreen() {}, setAnsweredQuestions() {}, markWrong() {}, celebrate() {}, dispose() { element.remove(); } };
  } });
  workspace.reconcile();
  return { root, workspace, rail: () => doc.querySelector('[data-betterquest="assessment-rail"]')!.shadowRoot! };
}

test('unused spacers between the due date and the PDF are collapsed without hiding real content', () => {
  const dom = homework();
  const doc = dom.window.document;
  const root = doc.querySelector<HTMLElement>('#target')!;
  const pdfFrame = doc.querySelector<HTMLElement>('#pdf-frame')!;
  const spacerBr = doc.createElement('br');
  const emptyPara = doc.createElement('p');
  emptyPara.innerHTML = '&nbsp; ';
  const brChain = doc.createElement('div');
  brChain.innerHTML = '<br><br>';
  root.insertBefore(spacerBr, pdfFrame);
  root.insertBefore(emptyPara, pdfFrame);
  root.insertBefore(brChain, pdfFrame);
  const { workspace } = mount(dom);
  try {
    for (const spacer of [spacerBr, emptyPara, brChain]) {
      assert.equal(spacer.getAttribute('data-betterquest-collapsed-gap'), 'true', 'Empty spacer must collapse');
      assert.equal(spacer.style.getPropertyValue('display'), 'none');
    }
    assert.equal((doc.querySelector('#due') as HTMLElement).style.getPropertyValue('display'), '');
    assert.equal(pdfFrame.style.getPropertyValue('display'), '');
    assert.ok(doc.querySelector('[data-betterquest="assessment-rail"]'), 'Answer rail must stay visible');
  } finally { workspace.dispose(); dom.window.close(); }
});

test('incorrect responses remain selectable while attempts remain', () => {
  const dom = homework('Incorrect');
  const { workspace, rail } = mount(dom);
  try {
    const choice = rail().querySelector<HTMLButtonElement>('[data-value="2"]');
    assert.ok(choice, 'An incorrect attempt must not lock the answer pane');
    let submissions = 0;
    dom.window.document.querySelector('button')!.addEventListener('click', () => submissions++);
    choice.click();
    assert.equal(dom.window.document.querySelector('select')!.value, '2');
    assert.equal(choice.getAttribute('aria-pressed'), 'true');
    assert.equal(submissions, 0);
  } finally { workspace.dispose(); dom.window.close(); }
});

test('workspace settles without observer redraws and preserves focused answer buttons', async () => {
  const dom = homework();
  const { root, workspace, rail } = mount(dom);
  let refreshes = 0;
  const stop = observeScoped(root, () => { refreshes++; workspace.reconcile(); }, ['class', 'value', 'disabled', 'hidden'], true);
  try {
    await new Promise(resolve => setTimeout(resolve, 220));
    const choice = rail().querySelector<HTMLButtonElement>('[data-value="2"]')!;
    choice.focus();
    workspace.reconcile();
    assert.equal(rail().querySelector('[data-value="2"]'), choice, 'Unchanged data must retain the same button');
    await new Promise(resolve => setTimeout(resolve, 350));
    assert.ok(refreshes <= 1, 'Workspace should settle after one update');
    assert.equal(rail().activeElement, choice);
  } finally { stop(); workspace.dispose(); dom.window.close(); }
});

test('PDF Download sits beside the due date and restores the native link on disposal', () => {
  const dom = homework();
  const workspace = createAssessmentHeader(dom.window.document.querySelector<HTMLElement>('#main-content')!);
  workspace.reconcile();
  try {
    const doc = dom.window.document;
    const link = doc.querySelector<HTMLAnchorElement>('a')!;
    assert.equal(link.textContent, 'PDF Download');
    assert.equal(link.parentElement, doc.querySelector('#due'));
    assert.equal(new URL(link.href).searchParams.get('instance'), 'courseuserassignment_1');
    workspace.dispose();
    assert.equal(link.parentElement, doc.querySelector('#download'));
    assert.equal(link.textContent, 'PDF w/o expl');
  } finally { workspace.dispose(); dom.window.close(); }
});

test('slides mode moves PDF Download beside a nested due line', () => {
  const dom = new JSDOM('<main id="main-content"><div id="target">' +
    '<div id="sched">Due date <div class="val">10/14/26 11:59 PM</div></div><br><br>' +
    '<p id="download"><a href="/student/images/problem_pdf?instance=courseuserassignment_1">PDF w/o expl</a></p>' +
    '<div id="presentation-div"><div class="instanceitempart"><label><input type="radio" name="response_1" value="1">1</label>' +
    '<button type="button" class="submit-btn">Submit</button></div></div></div></main>',
    { url: 'https://quest.cns.utexas.edu/student/instances/show?instance=courseuserassignment_1', pretendToBeVisual: true });
  const doc = dom.window.document;
  const header = createAssessmentHeader(doc.querySelector<HTMLElement>('#main-content')!);
  header.reconcile();
  try {
    const link = doc.querySelector<HTMLAnchorElement>('a')!;
    assert.equal(link.textContent, 'PDF Download');
    assert.equal(link.closest('#sched'), doc.querySelector('#sched'), 'Link must move beside the nested due line in slides mode');
    header.dispose();
    assert.equal(link.parentElement, doc.querySelector('#download'));
  } finally { header.dispose(); dom.window.close(); }
});

test('slides mode collapses spacer junk before the first question', () => {
  const dom = new JSDOM('<main id="main-content"><div id="target">' +
    '<p id="due">Due date 10/14/26 11:59 PM</p><br><p> &nbsp; </p>' +
    '<div id="presentation-div"><div class="instanceitempart"><label><input type="radio" name="response_1" value="1">1</label>' +
    '<button type="button" class="submit-btn">Submit</button></div></div></div></main>',
    { url: 'https://quest.cns.utexas.edu/student/instances/show?instance=courseuserassignment_1', pretendToBeVisual: true });
  const doc = dom.window.document;
  const presentation = doc.querySelector<HTMLElement>('#presentation-div')!;
  const enhancement = createSlideAssessmentEnhancement(presentation);
  try {
    enhancement.reconcile();
    const spacers = [...doc.querySelectorAll<HTMLElement>('#target > br, #target > p')]
      .filter(el => el.id !== 'due');
    assert.ok(spacers.length >= 2, 'Fixture must contain spacers');
    for (const spacer of spacers) {
      assert.equal(spacer.style.getPropertyValue('display'), 'none', 'Spacer must collapse');
    }
    assert.equal((doc.querySelector('#due') as HTMLElement).style.getPropertyValue('display'), '');
    assert.equal(presentation.style.getPropertyValue('display'), '');
  } finally { enhancement.dispose(); dom.window.close(); }
});

test('answer pane question numbers are clickable and register', () => {
  const dom = homework();
  const { workspace, rail } = mount(dom);
  try {
    const number = rail().querySelector<HTMLButtonElement>('.number');
    assert.ok(number, 'Question number must exist');
    assert.equal(number.tagName, 'BUTTON', 'Question number must be a button so clicks register');
    let clicked = false;
    number.addEventListener('click', () => { clicked = true; });
    number.click();
    assert.equal(clicked, true);
  } finally { workspace.dispose(); dom.window.close(); }
});

test('betterquest view shows info only while basic view shows answer panels without fullscreen', () => {
  const dom = homework();
  const { workspace, rail } = mount(dom);
  try {
    const doc = dom.window.document;
    const questions = rail().querySelector<HTMLElement>('.questions')!;
    const focus = rail().querySelector<HTMLButtonElement>('.focus')!;
    assert.equal(questions.style.display, 'none', 'BetterQuest view must hide submit panels');
    assert.notEqual(focus.style.display, 'none', 'BetterQuest view keeps fullscreen');
    assert.ok(rail().querySelector('.metrics-grid'), 'Score info stays visible under the PDF');
    assert.ok(rail().querySelector('.progress-copy'), 'Progress info stays visible under the PDF');

    rail().querySelector<HTMLButtonElement>('[data-mode="basic"]')!.click();
    assert.equal(questions.style.display, '', 'Basic view must show answer panels');
    assert.equal(focus.style.display, 'none', 'Basic view must remove fullscreen');

    rail().querySelector<HTMLButtonElement>('[data-mode="betterquest"]')!.click();
    assert.equal(questions.style.display, 'none', 'Switching back hides submit panels again');
    assert.notEqual(focus.style.display, 'none');

    const css = doc.querySelector('[data-betterquest="assessment-style"]')!.textContent!;
    assert.match(css, /due-row\][^{]*\{[^}]*grid-row:1/, 'Due row must sit in the top grid row in basic view');
    const railCss = rail().querySelector('style')!.textContent!;
    assert.match(railCss, /max-height:calc\(100vh - 88px\)/, 'Sidebar must fit the viewport height');
  } finally { workspace.dispose(); dom.window.close(); }
});

test('submit targets the real response button, never the history toggle', () => {
  const dom = new JSDOM('<main id="main-content"><div id="target">' +
    '<p id="due">Due date 10/14/26 11:59 PM</p>' +
    '<div id="pdf-frame"><div id="presentation-pdf-frame"><iframe title="Assignment PDF" src="/student/images/problem_pdf?instance=courseuserassignment_1"></iframe></div></div>' +
    '<div id="view-responses-table-id"><table id="instance-table-courseuserassignment_1"><tbody>' +
    '<tr data-id="cuaip_1"><td>1.</td><td><select name="response"><option value=""></option><option value="1">1</option><option value="2">2</option></select></td><td class="status"></td>' +
    '<td class="previous"><button type="button" aria-label="Toggle response history"><span>0 / 4</span></button></td><td class="correct"></td>' +
    '<td><button type="button" aria-label="Submit response">Submit</button></td></tr>' +
    '</tbody></table></div></div></main>', { url: 'https://quest.cns.utexas.edu/student/instances/show?instance=courseuserassignment_1', pretendToBeVisual: true });
  const doc = dom.window.document;
  const { workspace, rail } = mount(dom);
  try {
    let historyClicked = false, realClicked = false;
    doc.querySelector('[aria-label="Toggle response history"]')!.addEventListener('click', () => { historyClicked = true; });
    doc.querySelector('[aria-label="Submit response"]')!.addEventListener('click', () => { realClicked = true; });
    rail().querySelector<HTMLButtonElement>('[data-value="2"]')!.click();
    rail().querySelector<HTMLButtonElement>('.submit')!.click();
    assert.equal(realClicked, true, 'Submit must reach the real response button');
    assert.equal(historyClicked, false, 'History toggle must never receive the submit');
  } finally { workspace.dispose(); dom.window.close(); }
});

test('a reflected wrong submit strikes through the answer on the PDF', () => {
  const dom = homework();
  const doc = dom.window.document;
  const root = doc.querySelector<HTMLElement>('#target')!;
  const wrongCalls: Array<[number, string]> = [];
  const workspace = createPdfAssessmentWorkspace(root, { createPdfViewer: container => {
    const element = doc.createElement('section');
    element.dataset.betterquest = 'interactive-pdf';
    container.append(element);
    return { element, ready: Promise.resolve(true), setSelected() {}, setFullscreen() {}, setAnsweredQuestions() {},
      markWrong(qn: number, opt: string) { wrongCalls.push([qn, opt]); },
      celebrate() {}, dispose() { element.remove(); } };
  } });
  workspace.reconcile();
  try {
    const rail = doc.querySelector('[data-betterquest="assessment-rail"]')!.shadowRoot!;
    rail.querySelector<HTMLButtonElement>('[data-value="2"]')!.click();
    let nativeSubmits = 0;
    doc.querySelector('button[aria-label="Submit response"]')!.addEventListener('click', () => { nativeSubmits++; });
    rail.querySelector<HTMLButtonElement>('.submit')!.click();
    assert.equal(nativeSubmits, 1);
    doc.querySelector('.previous')!.textContent = '2 / 3';
    workspace.reconcile();
    assert.deepEqual(wrongCalls, [[1, '2']], 'Reflected wrong attempt must strike through the PDF answer');
  } finally { workspace.dispose(); dom.window.close(); }
});

test('a natively correct answer is celebrated on the PDF without confetti', async () => {
  const dom = new JSDOM('<main id="main-content"><div id="target">' +
    '<p id="due">Due date 10/14/26 11:59 PM</p>' +
    '<div id="pdf-frame"><div id="presentation-pdf-frame"><iframe title="Assignment PDF" src="/student/images/problem_pdf?instance=courseuserassignment_1"></iframe></div></div>' +
    '<div id="view-responses-table-id"><table id="instance-table-courseuserassignment_1"><tbody>' +
    '<tr data-id="cuaip_1"><td>1.</td><td><select name="response" disabled><option value=""></option><option value="3" selected>3</option></select></td>' +
    '<td class="status"><span class="text-success">Correct</span></td><td class="previous">1 / 3</td><td><button type="button" aria-label="Submit response">Submit</button></td></tr>' +
    '</tbody></table></div></div></main>', { url: 'https://quest.cns.utexas.edu/student/instances/show?instance=courseuserassignment_1', pretendToBeVisual: true });
  const doc = dom.window.document;
  const root = doc.querySelector<HTMLElement>('#target')!;
  const celebrateCalls: Array<[number, string, boolean]> = [];
  const workspace = createPdfAssessmentWorkspace(root, { createPdfViewer: container => {
    const element = doc.createElement('section');
    element.dataset.betterquest = 'interactive-pdf';
    container.append(element);
    return { element, ready: Promise.resolve(true), setSelected() {}, setFullscreen() {}, setAnsweredQuestions() {}, markWrong() {},
      celebrate(qn: number, opt: string, party: boolean) { celebrateCalls.push([qn, opt, party]); },
      dispose() { element.remove(); } };
  } });
  workspace.reconcile();
  try {
    await new Promise(resolve => setTimeout(resolve, 10));
    assert.deepEqual(celebrateCalls, [[1, '3', false]], 'Correct answers get highlighted without replaying confetti on load');
  } finally { workspace.dispose(); dom.window.close(); }
});

test('review waits for native content and refreshes completion without duplicating the dashboard', () => {
  const dom = new JSDOM('<div id="tabs-review"></div>');
  const doc = dom.window.document;
  try {
    assert.equal(enhanceCourseReviewTab(doc), false);
    const pane = doc.querySelector('#tabs-review')!;
    pane.innerHTML = '<p>Custom Reviews allow you to create non-graded assignments.</p><p id="progress">you have completed <strong>46 / 121</strong> review problems</p><button>Create Review</button>';
    assert.equal(enhanceCourseReviewTab(doc), true);
    assert.equal(pane.querySelector('[role="progressbar"]')!.getAttribute('aria-valuenow'), '38');
    doc.querySelector('#progress strong')!.textContent = '47 / 121';
    enhanceCourseReviewTab(doc);
    assert.equal(pane.querySelector('[role="progressbar"]')!.getAttribute('aria-valuenow'), '39');
    assert.equal(pane.querySelectorAll('[data-betterquest="review-dashboard"]').length, 1);
    assert.equal((pane.querySelector('button') as HTMLElement).hidden, false);
  } finally { dom.window.close(); }
});
