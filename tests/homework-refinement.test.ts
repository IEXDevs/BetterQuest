import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createPdfAssessmentWorkspace, createSlideAssessmentEnhancement } from '../src/features/assessment/workspace';
import { observeScoped } from '../src/features/lifecycle';
import { createAssessmentHeader } from '../src/features/assessment/header';
import { enhanceCourseReviewTab, disposeReviewSliders } from '../src/features/courses/review-enhancer';
import { QUEST_DARK_STYLES } from '../src/adapters/quest/theme';

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
    return { element, ready: Promise.resolve(true), setSelected() {}, setFullscreen() {}, setAnsweredQuestions() {}, markWrong() {}, celebrate() {}, announce() {}, dispose() { element.remove(); } };
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

test('unified view shows answer panels, fullscreen, and a collapsible sidebar', () => {
  const dom = homework();
  const { workspace, rail } = mount(dom);
  try {
    const doc = dom.window.document;
    const root = doc.querySelector<HTMLElement>('#target')!;
    const questions = rail().querySelector<HTMLElement>('.questions')!;
    const focus = rail().querySelector<HTMLButtonElement>('.focus')!;
    const collapse = rail().querySelector<HTMLButtonElement>('.collapse-btn')!;
    assert.equal(rail().querySelector('.mode-switcher'), null, 'View switcher is gone');
    assert.equal(questions.style.display, '', 'Answer panels always show');
    assert.notEqual(focus.style.display, 'none', 'Fullscreen stays available');
    assert.ok(rail().querySelector('.metrics-grid'), 'Score info stays visible');
    assert.ok(rail().querySelector('.qnav'), 'Collapsed question navigator exists');
    assert.match(root.style.height, /^\d+px$/, 'Workspace locks to the viewport height');

    collapse.click();
    const host = doc.querySelector<HTMLElement>('[data-betterquest="assessment-rail"]')!;
    assert.equal(host.dataset.collapsed, 'true');
    assert.equal(root.dataset.betterquestRail, 'collapsed');
    assert.equal(dom.window.localStorage.getItem('betterquest_rail_collapsed'), '1');
    const navButtons = rail().querySelectorAll<HTMLButtonElement>('.qnav-btn');
    assert.equal(navButtons.length, 1, 'Collapsed rail lists every question number');
    assert.equal(navButtons[0].textContent, '1');
    assert.ok(navButtons[0].classList.contains('q-wrong'), 'Attempted question shows red');
    assert.equal(rail().querySelector('.metric-average .metric-label')!.textContent, 'Class Avg.');
    collapse.click();
    assert.equal(host.dataset.collapsed, 'false');
    assert.equal(root.dataset.betterquestRail, 'extended');
    assert.equal(dom.window.localStorage.getItem('betterquest_rail_collapsed'), '0');
    assert.ok(rail().querySelector('.metric-card.metric-score'), 'Your Score card exists');
    assert.ok(rail().querySelector('.metric-card.metric-average'), 'Class Average card exists');

    const thermoFill = rail().querySelector<HTMLElement>('.thermo-fill')!;
    const thermoPct = rail().querySelector<HTMLElement>('.thermo-pct')!;
    assert.equal(thermoFill.style.height, '100%', 'Thermometer fills with progress');
    assert.equal(thermoPct.textContent, '100%');

    const railCss = rail().querySelector('style')!.textContent!;
    assert.match(railCss, /\.rail\{[^}]*border-radius:14px/, 'Response deck gets rounded corners');
    assert.match(railCss, /\.metric-value\{[^}]*white-space:normal/, 'Metric values wrap instead of cutting off');
    assert.match(railCss, /@keyframes bq-flow/, 'Progress flows like liquid');
    assert.match(railCss, /\.meter:hover span\{animation-duration:1s\}/, 'Hovering speeds the flow');
    assert.match(railCss, /bq-sheen/, 'Progress carries a shine sweep');
    assert.match(railCss, /bq-thermo-flow/, 'Thermometer flows too');
    assert.match(railCss, /\[data-collapsed="true"\]\) \.metric-sd\{display:none\}/, 'Collapsed hides Standard Deviation');
    assert.match(railCss, /\[data-collapsed="true"\]\) \.progress-wrap\{display:none\}/, 'Collapsed swaps the % bar for the thermometer');
    assert.match(railCss, /\.thermo-fill/, 'Thermometer exists');

    const css = doc.querySelector('[data-betterquest="assessment-style"]')!.textContent!;
    assert.match(css, /grid-template-rows:auto minmax\(0,1fr\)/, 'Workspace is a viewport-locked grid');
    assert.match(css, /overflow:hidden/, 'No page scrolling from the workspace');
    assert.match(css, /#info-header-div/, 'Header pins to the top row');
    assert.match(css, /#instanceitem-list/, 'Quicklink strip stays hidden');
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
  const verdictCalls: Array<[number, string]> = [];
  const workspace = createPdfAssessmentWorkspace(root, { createPdfViewer: container => {
    const element = doc.createElement('section');
    element.dataset.betterquest = 'interactive-pdf';
    container.append(element);
    return { element, ready: Promise.resolve(true), setSelected() {}, setFullscreen() {}, setAnsweredQuestions() {},
      markWrong(qn: number, opt: string) { wrongCalls.push([qn, opt]); },
      celebrate() {}, announce(qn: number, verdict: string) { verdictCalls.push([qn, verdict]); },
      dispose() { element.remove(); } };
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
    assert.deepEqual(verdictCalls, [[1, 'wrong']], 'User must be told the answer was wrong');
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
      announce() {}, dispose() { element.remove(); } };
  } });
  workspace.reconcile();
  try {
    await new Promise(resolve => setTimeout(resolve, 10));
    assert.deepEqual(celebrateCalls, [[1, '3', false]], 'Correct answers get highlighted without replaying confetti on load');
  } finally { workspace.dispose(); dom.window.close(); }
});

test('a fresh correct submit celebrates with confetti and tells the user', async () => {
  const dom = homework();
  const doc = dom.window.document;
  const root = doc.querySelector<HTMLElement>('#target')!;
  const celebrateCalls: Array<[number, string, boolean]> = [];
  const verdictCalls: Array<[number, string]> = [];
  const workspace = createPdfAssessmentWorkspace(root, { createPdfViewer: container => {
    const element = doc.createElement('section');
    element.dataset.betterquest = 'interactive-pdf';
    container.append(element);
    return { element, ready: Promise.resolve(true), setSelected() {}, setFullscreen() {}, setAnsweredQuestions() {}, markWrong() {},
      celebrate(qn: number, opt: string, party: boolean) { celebrateCalls.push([qn, opt, party]); },
      announce(qn: number, verdict: string) { verdictCalls.push([qn, verdict]); },
      dispose() { element.remove(); } };
  } });
  workspace.reconcile();
  try {
    const rail = doc.querySelector('[data-betterquest="assessment-rail"]')!.shadowRoot!;
    rail.querySelector<HTMLButtonElement>('[data-value="2"]')!.click();
    rail.querySelector<HTMLButtonElement>('.submit')!.click();
    const row = doc.querySelector('tr[data-id="cuaip_1"]')!;
    (row.querySelector('select') as HTMLSelectElement).disabled = true;
    row.querySelector('.status')!.innerHTML = '<span class="text-success">Correct</span>';
    row.querySelector('.previous')!.textContent = '2 / 3';
    workspace.reconcile();
    await new Promise(resolve => setTimeout(resolve, 10));
    assert.deepEqual(celebrateCalls, [[1, '2', true]], 'Fresh correct answers celebrate with confetti');
    assert.deepEqual(verdictCalls, [[1, 'correct']], 'User must be told the answer was correct');
    assert.equal(doc.querySelector('#target')?.getAttribute('data-betterquest-pdf-mode'), 'betterquest', 'Correct answers stay in our view');
    assert.equal(rail.querySelector<HTMLElement>('.questions')!.style.display, '', 'Submit panels stay visible after a correct answer');
  } finally { workspace.dispose(); dom.window.close(); }
});

test('answer cards show right or wrong status with points earned', () => {
  const dom = new JSDOM('<main id="main-content"><div id="target">' +
    '<p id="due">Due date 10/14/26 11:59 PM</p>' +
    '<div id="pdf-frame"><div id="presentation-pdf-frame"><iframe title="Assignment PDF" src="/student/images/problem_pdf?instance=courseuserassignment_1"></iframe></div></div>' +
    '<div id="view-responses-table-id"><table id="instance-table-courseuserassignment_1"><tbody>' +
    '<tr data-id="cuaip_1"><td>1.</td><td><select name="response" disabled><option value=""></option><option value="2" selected>2</option></select></td>' +
    '<td class="status"><span class="text-success">Correct</span></td><td class="previous">1 / 4</td><td class="correct">10</td><td><button type="button" aria-label="Submit response">Submit</button></td></tr>' +
    '<tr data-id="cuaip_2"><td>2.</td><td><select name="response" disabled><option value=""></option><option value="1" selected>1</option></select></td>' +
    '<td class="status"><span class="text-danger">Incorrect</span></td><td class="previous">2 / 4</td><td class="correct">0</td><td><button type="button" aria-label="Submit response">Submit</button></td></tr>' +
    '</tbody></table></div></div></main>', { url: 'https://quest.cns.utexas.edu/student/instances/show?instance=courseuserassignment_1', pretendToBeVisual: true });
  const doc = dom.window.document;
  const root = doc.querySelector<HTMLElement>('#target')!;
  const workspace = createPdfAssessmentWorkspace(root, { createPdfViewer: (container, options) => {
    const element = doc.createElement('section');
    element.dataset.betterquest = 'interactive-pdf';
    container.append(element);
    options.onPoints?.(new Map([[1, 10], [2, 10]]));
    return { element, ready: Promise.resolve(true), setSelected() {}, setFullscreen() {}, setAnsweredQuestions() {}, markWrong() {}, celebrate() {}, announce() {}, dispose() { element.remove(); } };
  } });
  workspace.reconcile();
  try {
    const rail = doc.querySelector('[data-betterquest="assessment-rail"]')!.shadowRoot!;
    const card1 = rail.querySelector<HTMLElement>('[data-question-id="cuaip_1"]')!;
    assert.match(card1.querySelector('.verdict-pill.verdict-correct')!.textContent || '', /Correct/);
    assert.match(card1.querySelector('.points-note')!.textContent || '', /10 pts \(100%\)/);
    assert.equal(card1.querySelector('.selected')!.textContent, '1/4', 'Tries replace the redundant submitted text');
    const card2 = rail.querySelector<HTMLElement>('[data-question-id="cuaip_2"]')!;
    assert.match(card2.querySelector('.verdict-pill.verdict-wrong')!.textContent || '', /Incorrect/);
    assert.match(card2.querySelector('.points-note')!.textContent || '', /0 pts \(0%\)/);
    assert.equal(card2.querySelector('.selected')!.textContent, '2/4');
    const nav = rail.querySelectorAll('.qnav-btn');
    assert.ok(nav[0].classList.contains('q-done'), 'Correct answers show green');
    assert.ok(nav[1].classList.contains('q-wrong'), 'Wrong answers show red');
  } finally { workspace.dispose(); dom.window.close(); }
});

test('review sliders turn fluid with a centered readout', () => {
  const dom = new JSDOM('<div id="tabs-review">' +
    '<p>Custom Reviews allow you to create non-graded assignments.</p><p id="progress">you have completed <strong>46 / 121</strong> review problems</p>' +
    '<div class="card"><div class="card-header h4">2. How many questions?</div><div class="card"><br><div class="d-flex flex-row">' +
    '<div class="col-1 text-right"><b>10</b></div><div class="col-3"><div class="slidecontainer">' +
    '<input name="customreview[number_of_items]" type="range" min="10" max="50" value="20" step="10" class="form-control-range active" id="countSlider" aria-label="Number of questions (10 to 50)">' +
    '<span class="thumb active"><span class="value">10</span></span>' +
    '</div></div><div class="col-1"><b>50</b></div></div><br></div></div>' +
    '<button>Create Review</button></div>');
  const doc = dom.window.document;
  try {
    assert.equal(enhanceCourseReviewTab(doc), true);
    const input = doc.querySelector<HTMLInputElement>('#countSlider')!;
    assert.equal(input.getAttribute('step'), '1', 'Slider moves fluidly instead of snapping between notches');
    assert.equal(input.min, '10');
    assert.equal(input.max, '50');
    assert.equal(input.name, 'customreview[number_of_items]', 'Quest submission field is untouched');
    const output = doc.querySelector<HTMLElement>('[data-betterquest="slider-value"]')!;
    assert.ok(output, 'Centered value readout appears under the slider');
    assert.equal(output.textContent, '20');
    assert.equal(output.parentElement, doc.querySelector('.slidecontainer'));
    input.value = '37';
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    assert.equal(output.textContent, '37', 'Readout tracks free values');
    assert.equal(input.style.getPropertyValue('--bq-fill'), '67.5%');
    assert.equal(doc.querySelector('[data-betterquest="slider-bubble"]'), null, 'No bubble element anymore');
    const css = doc.querySelector('[data-betterquest="review-slider-styles"]')!.textContent!;
    assert.match(css, /\.bq-slider-value[^{]*\{[^}]*text-align:center/, 'Value sits centered under the slider');
    assert.match(css, /\.bq-slider-value[^{]*\{[^}]*font-size:24px/, 'Value is large');
    assert.equal(doc.querySelector('#tabs-review')?.getAttribute('data-betterquest-sliders'), 'true', 'Pane carries the slider scope');
    assert.equal(doc.querySelectorAll('[data-betterquest="slider-value"]').length, 1, 'Exactly one readout per slider');
    assert.match(css, /\[data-betterquest-sliders\] \.slidecontainer > \.thumb\{display:none/, 'Native thumb bubble stays hidden');
    disposeReviewSliders(doc);
    assert.equal(input.getAttribute('step'), '10', 'Original step restores on disposal');
    assert.equal(doc.querySelector('[data-betterquest="slider-value"]'), null);
    assert.equal(doc.querySelector('[data-betterquest="review-slider-styles"]'), null);
  } finally { dom.window.close(); }
});

test('review progress flows and reacts to hovering', () => {
  assert.match(QUEST_DARK_STYLES, /@keyframes bq-review-flow/, 'Review fill flows like liquid');
  assert.match(QUEST_DARK_STYLES, /\.bq-review-track:hover \.bq-review-fill/, 'Hovering speeds the review flow');
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
