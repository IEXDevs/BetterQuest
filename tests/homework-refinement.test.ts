import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createPdfAssessmentWorkspace, createSlideAssessmentEnhancement } from '../src/features/assessment/workspace';
import { createInteractivePdfViewer } from '../src/features/assessment/pdf-viewer';
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
  const scrollToCalls: number[] = [];
  const workspace = createPdfAssessmentWorkspace(root, { createPdfViewer: container => {
    const element = doc.createElement('section');
    element.dataset.betterquest = 'interactive-pdf';
    container.append(element);
    return { element, ready: Promise.resolve(true), setSelected() {}, setFullscreen() {}, setAnsweredQuestions() {}, markWrong() {}, celebrate() {}, announce() {},
      scrollToQuestion(qn: number) { scrollToCalls.push(qn); return true; },
      dispose() { element.remove(); } };
  } });
  workspace.reconcile();
  return { root, workspace, scrollToCalls, rail: () => doc.querySelector('[data-betterquest="assessment-rail"]')!.shadowRoot! };
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

test('answers still reach Quest when fullscreen hides the response table wrappers', () => {
  const dom = homework();
  const doc = dom.window.document;
  const tableRoot = doc.querySelector<HTMLElement>('#view-responses-table-id')!;
  const row = doc.createElement('div');
  row.className = 'row';
  tableRoot.before(row);
  row.append(tableRoot);
  // Exactly what the fullscreen CSS does to every #target child but #pdf-frame.
  row.style.setProperty('display', 'none', 'important');
  const { workspace, rail } = mount(dom);
  try {
    const choice = rail().querySelector<HTMLButtonElement>('[data-value="2"]')!;
    choice.click();
    assert.equal(doc.querySelector('select')!.value, '2', 'The answer must reach Quest even while its wrappers are out of layout');
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

test('icon-only problem_pdf links still become a visible PDF Download button', () => {
  const dom = new JSDOM('<main id="main-content"><div id="target">' +
    '<p id="due">Due date 10/14/26 11:59 PM</p>' +
    '<p id="download"><a href="/student/images/problem_pdf?instance=courseuserassignment_1" aria-label="Download">' +
    '<img src="/icons/pdf.png" alt=""></a></p>' +
    '<div id="pdf-frame"><div id="presentation-pdf-frame"><iframe title="Assignment PDF" src="/student/images/problem_pdf?instance=1"></iframe></div></div>' +
    '</div></main>',
    { url: 'https://quest.cns.utexas.edu/student/instances/show?instance=courseuserassignment_1', pretendToBeVisual: true });
  const doc = dom.window.document;
  const header = createAssessmentHeader(doc.querySelector<HTMLElement>('#main-content')!);
  header.reconcile();
  try {
    const link = doc.querySelector<HTMLAnchorElement>('a[href*="/images/problem_pdf"]')!;
    assert.equal(link.dataset.betterquestDownload, 'true');
    assert.equal(link.textContent, 'PDF Download');
    assert.equal(link.parentElement, doc.querySelector('#due'));
    assert.equal(doc.querySelector('#download')?.getAttribute('data-betterquest-download-gap'), 'true');
  } finally { header.dispose(); dom.window.close(); }
});

test('Slides/Classic links become a segmented control beside the due date', () => {
  const dom = new JSDOM('<main id="main-content"><div id="target">' +
    '<div id="info-header-div"><div class="d-flex justify-content-between">' +
    '<span id="due_date_field">Due date 10/14/26 11:59 PM</span>' +
    '<div class="view-links"><a href="/student/instances/show?instance=1&view=slides">Slides</a>' +
    '<a href="/student/instances/show?instance=1&view=classic">Classic</a></div>' +
    '</div></div>' +
    '<div id="pdf-frame"><div id="presentation-pdf-frame"><iframe title="Assignment PDF" src="/student/images/problem_pdf?instance=1"></iframe></div></div>' +
    '</div></main>',
    { url: 'https://quest.cns.utexas.edu/student/instances/show?instance=1', pretendToBeVisual: true });
  const doc = dom.window.document;
  const header = createAssessmentHeader(doc.querySelector<HTMLElement>('#main-content')!);
  header.reconcile();
  try {
    const toggle = doc.querySelector<HTMLElement>('[data-betterquest="view-toggle"]')!;
    assert.ok(toggle, 'View toggle host is created');
    assert.equal(toggle.parentElement, doc.querySelector('.d-flex.justify-content-between'));
    assert.equal(toggle.querySelectorAll('a').length, 2);
    assert.equal(toggle.querySelector('[data-betterquest-view-kind="classic"]')?.getAttribute('data-betterquest-view-active'), 'true');
    assert.equal(toggle.querySelector('[data-betterquest-view-kind="slides"]')?.hasAttribute('data-betterquest-view-active'), false);
    header.dispose();
    assert.equal(doc.querySelector('[data-betterquest="view-toggle"]'), null);
    assert.equal(doc.querySelector('.view-links a')?.textContent, 'Slides');
  } finally { header.dispose(); dom.window.close(); }
});

test('on Slides pages a lone Classic switch link is emphasized in the toolbar', () => {
  const dom = new JSDOM('<main id="main-content"><div id="target">' +
    '<div id="info-header-div"><div class="d-flex justify-content-between">' +
    '<span id="due_date_field">Due date 10/14/26 11:59 PM</span>' +
    '<a href="/student/instances/show?instance=1&view=classic">Classic</a>' +
    '</div></div>' +
    '<div id="presentation-div"><div class="instanceitempart"><label><input type="radio" name="response_1" value="1">1</label>' +
    '<button type="button" class="submit-btn">Submit</button></div></div></div></main>',
    { url: 'https://quest.cns.utexas.edu/student/instances/show?instance=1', pretendToBeVisual: true });
  const doc = dom.window.document;
  const header = createAssessmentHeader(doc.querySelector<HTMLElement>('#main-content')!);
  header.reconcile();
  try {
    const toggle = doc.querySelector<HTMLElement>('[data-betterquest="view-toggle"]')!;
    assert.ok(toggle);
    const classic = toggle.querySelector('[data-betterquest-view-kind="classic"]')!;
    assert.ok(classic);
    assert.equal(toggle.dataset.betterquestViewSingle, 'true');
    assert.equal(classic.getAttribute('data-betterquest-view-active'), 'true');
  } finally { header.dispose(); dom.window.close(); }
});

test('slides put PDF Download beside the date, not under a bare Due label', () => {
  const dom = new JSDOM('<main id="main-content"><div id="target">' +
    '<div id="sched"><div class="label">Due date</div><div class="val">10/14/26 11:59 PM</div></div>' +
    '<p id="download"><a href="/student/images/problem_pdf?instance=courseuserassignment_1">PDF w/o expl</a></p>' +
    '<div id="presentation-div"><div class="instanceitempart"><label><input type="radio" name="response_1" value="1">1</label>' +
    '<button type="button" class="submit-btn">Submit</button></div></div></div></main>',
    { url: 'https://quest.cns.utexas.edu/student/instances/show?instance=courseuserassignment_1', pretendToBeVisual: true });
  const doc = dom.window.document;
  const header = createAssessmentHeader(doc.querySelector<HTMLElement>('#main-content')!);
  header.reconcile();
  try {
    const link = doc.querySelector<HTMLAnchorElement>('a')!;
    assert.equal(link.parentElement, doc.querySelector('#sched'), 'Download sits in the due row beside the date value');
    assert.equal(doc.querySelector('.label')!.querySelector('a'), null, 'The bare label never hosts the button');
    header.dispose();
    assert.equal(link.parentElement, doc.querySelector('#download'));
  } finally { header.dispose(); dom.window.close(); }
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
    assert.match(root.style.getPropertyValue('--bq-pdf-workspace-height'), /^\d+px$/, 'Workspace locks to the viewport height');

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

    const deckPct = rail().querySelector<HTMLElement>('.deck-pct')!;
    const pctValue = rail().querySelector<HTMLElement>('.pct-value')!;
    assert.ok(deckPct, 'Bottom percentage display exists');
    assert.equal(pctValue.textContent, '100%');

    const railCss = rail().querySelector('style')!.textContent!;
    assert.match(railCss, /\.rail\{[^}]*border-radius:3px/, 'Response deck keeps almost-sharp corners');
    assert.match(railCss, /\.metric-value\{[^}]*white-space:normal/, 'Metric values wrap instead of cutting off');
    assert.match(railCss, /@keyframes bq-flow/, 'Progress flows like liquid');
    assert.match(railCss, /\.meter:hover span\{animation-duration:1s\}/, 'Hovering speeds the flow');
    assert.match(railCss, /bq-sheen/, 'Progress carries a shine sweep');
    assert.match(railCss, /\[data-collapsed="true"\]\) \.metric-sd\{display:none\}/, 'Collapsed hides Standard Deviation');
    assert.match(railCss, /\[data-collapsed="true"\]\) \.progress-wrap\{display:none\}/, 'Collapsed swaps the % bar for the bottom progress deck');
    assert.match(railCss, /\.deck-pct/, 'Bottom percentage display exists in styles');
    assert.match(railCss, /\.qnav-btn\{[^}]*aspect-ratio:1/, 'Question buttons are square boxes');

    const css = doc.querySelector('[data-betterquest="assessment-style"]')!.textContent!;
    assert.match(css, /grid-template-rows:auto minmax\(0,var\(--bq-pdf-workspace-height,calc\(100dvh - 104px\)\)\)/, 'Workspace is a viewport-locked grid');
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

test('a natively correct answer is celebrated on the PDF without celebration animation', async () => {
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
    assert.deepEqual(celebrateCalls, [[1, '3', false]], 'Correct answers get highlighted without replaying celebration animation on load');
  } finally { workspace.dispose(); dom.window.close(); }
});

test('a fresh correct submit celebrates with celebration animation and tells the user', async () => {
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
    assert.deepEqual(celebrateCalls, [[1, '2', true]], 'Fresh correct answers celebrate with celebration animation');
    assert.deepEqual(verdictCalls, [[1, 'correct']], 'User must be told the answer was correct');
    assert.equal(doc.querySelector('#target')?.getAttribute('data-betterquest-pdf-mode'), 'betterquest', 'Correct answers stay in our view');
    assert.equal(rail.querySelector<HTMLElement>('.questions')!.style.display, '', 'Submit panels stay visible after a correct answer');
  } finally { workspace.dispose(); dom.window.close(); }
});

test('a correct submit still celebrates after the page reloads', async () => {
  const dom = homework();
  const doc = dom.window.document;
  const root = doc.querySelector<HTMLElement>('#target')!;
  const celebrateCalls: Array<[number, string, boolean]> = [];
  const verdictCalls: Array<[number, string]> = [];
  const createPdfViewer = (container: HTMLElement) => {
    const element = doc.createElement('section');
    element.dataset.betterquest = 'interactive-pdf';
    container.append(element);
    return { element, ready: Promise.resolve(true), setSelected() {}, setFullscreen() {}, setAnsweredQuestions() {}, markWrong() {},
      celebrate(qn: number, opt: string, party: boolean) { celebrateCalls.push([qn, opt, party]); },
      announce(qn: number, verdict: string) { verdictCalls.push([qn, verdict]); },
      dispose() { element.remove(); } };
  };
  let workspace = createPdfAssessmentWorkspace(root, { createPdfViewer });
  workspace.reconcile();
  try {
    const rail = doc.querySelector('[data-betterquest="assessment-rail"]')!.shadowRoot!;
    rail.querySelector<HTMLButtonElement>('[data-value="2"]')!.click();
    rail.querySelector<HTMLButtonElement>('.submit')!.click();
    // Quest grades the answer and serves the page again — with extra query params.
    workspace.dispose();
    dom.window.history.replaceState({}, '', '/student/instances/show?instance=courseuserassignment_1&saved=1');
    const select = doc.querySelector<HTMLSelectElement>('tr[data-id="cuaip_1"] select')!;
    select.value = '2';
    select.disabled = true;
    doc.querySelector('tr[data-id="cuaip_1"] .status')!.innerHTML = '<span class="text-success">Correct</span>';
    doc.querySelector('tr[data-id="cuaip_1"] .previous')!.textContent = '2 / 3';
    workspace = createPdfAssessmentWorkspace(root, { createPdfViewer });
    workspace.reconcile();
    await new Promise(resolve => setTimeout(resolve, 10));
    assert.deepEqual(celebrateCalls, [[1, '2', true]], 'The celebration survives the reload');
    assert.deepEqual(verdictCalls, [[1, 'correct']], 'The user is told they were right after a refresh');
  } finally { workspace.dispose(); dom.window.close(); }
});

test('a wrong submit keeps its red mark after the page reloads', async () => {
  const dom = homework();
  const doc = dom.window.document;
  const root = doc.querySelector<HTMLElement>('#target')!;
  const wrongCalls: Array<[number, string]> = [];
  const verdictCalls: Array<[number, string]> = [];
  const createPdfViewer = (container: HTMLElement) => {
    const element = doc.createElement('section');
    element.dataset.betterquest = 'interactive-pdf';
    container.append(element);
    return { element, ready: Promise.resolve(true), setSelected() {}, setFullscreen() {}, setAnsweredQuestions() {},
      markWrong(qn: number, value: string) { wrongCalls.push([qn, value]); },
      celebrate() {}, announce(qn: number, verdict: string) { verdictCalls.push([qn, verdict]); },
      dispose() { element.remove(); } };
  };
  let workspace = createPdfAssessmentWorkspace(root, { createPdfViewer });
  workspace.reconcile();
  try {
    const rail = doc.querySelector('[data-betterquest="assessment-rail"]')!.shadowRoot!;
    rail.querySelector<HTMLButtonElement>('[data-value="2"]')!.click();
    rail.querySelector<HTMLButtonElement>('.submit')!.click();
    // Refresh after a wrong try: Quest keeps the attempts but not the choice.
    workspace.dispose();
    const select = doc.querySelector<HTMLSelectElement>('tr[data-id="cuaip_1"] select')!;
    select.value = '';
    select.disabled = false;
    doc.querySelector('tr[data-id="cuaip_1"] .previous')!.textContent = '2 / 3';
    workspace = createPdfAssessmentWorkspace(root, { createPdfViewer });
    workspace.reconcile();
    await new Promise(resolve => setTimeout(resolve, 10));
    assert.deepEqual(wrongCalls[0], [1, '2'], 'The red mark comes back after a refresh');
    assert.ok(wrongCalls.every(([qn, value]) => qn === 1 && value === '2'), 'Marks only ever target the submitted answer');
    assert.deepEqual(verdictCalls, [[1, 'wrong']], 'The user is reminded to try again exactly once');
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
    assert.ok(nav[1].classList.contains('q-wrong') || nav[1].classList.contains('q-retry-wrong'), 'Wrong answers show red or amber retry');
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

test('sidebar provides go to question on expanded view with green, orange, red, and neutral status colors, plus a collapsed legend', () => {
  const dom = new JSDOM('<main id="main-content"><div id="target">' +
    '<p id="due">Due date 10/14/26 11:59 PM</p>' +
    '<div id="pdf-frame"><div id="presentation-pdf-frame"><iframe title="Assignment PDF" src="/student/images/problem_pdf?instance=courseuserassignment_1"></iframe></div></div>' +
    '<div id="view-responses-table-id"><table id="instance-table-courseuserassignment_1"><tbody>' +
    // Question 1: 1 attempt, correct -> green (done)
    '<tr data-id="cuaip_1"><td>1.</td><td><select name="response"><option value="1" selected>1</option></select></td><td class="status"><span class="text-success">Correct</span></td><td class="previous">1 / 4</td><td class="correct">10</td><td><button type="button">Submit</button></td></tr>' +
    // Question 2: 2 attempts, correct -> orange (retry)
    '<tr data-id="cuaip_2"><td>2.</td><td><select name="response"><option value="2" selected>2</option></select></td><td class="status"><span class="text-success">Correct</span></td><td class="previous">2 / 4</td><td class="correct">7</td><td><button type="button">Submit</button></td></tr>' +
    // Question 3: 1 attempt, incorrect -> red (wrong)
    '<tr data-id="cuaip_3"><td>3.</td><td><select name="response"><option value="1">1</option></select></td><td class="status"><span class="text-danger">Incorrect</span></td><td class="previous">1 / 4</td><td class="correct">0</td><td><button type="button">Submit</button></td></tr>' +
    // Question 4: 0 attempts, unattempted -> neutral
    '<tr data-id="cuaip_4"><td>4.</td><td><select name="response"><option value=""></option><option value="1">1</option></select></td><td class="status"></td><td class="previous">0 / 4</td><td class="correct"></td><td><button type="button" aria-label="Submit response">Submit</button></td></tr>' +
    '</tbody></table></div></div></main>', { url: 'https://quest.cns.utexas.edu/student/instances/show?instance=courseuserassignment_1', pretendToBeVisual: true });

  const { workspace, rail, scrollToCalls } = mount(dom);
  try {
    const r = rail();

    // 1. Expanded view has "Go to question" header and navigation
    const qnavHeader = r.querySelector('.qnav-header');
    assert.ok(qnavHeader, 'Go to question header exists in expanded view');
    assert.equal(qnavHeader?.querySelector('.qnav-title')?.textContent, 'Go to question');
    const railCss = r.querySelector('style')!.textContent!;
    assert.match(railCss, /\.qnav\{display:grid;grid-template-columns:repeat\(auto-fill,minmax\(34px,1fr\)\);gap:6px;padding:2px\}/, 'Expanded qnav is dynamic without inner scroll');

    const navButtons = r.querySelectorAll<HTMLButtonElement>('.qnav-btn');
    assert.equal(navButtons.length, 4, 'All 4 question buttons exist');

    // 2. Status colors:
    // Question 1: 1 try & correct -> green (q-done)
    assert.ok(navButtons[0].classList.contains('q-done'), 'Question 1 is green on first-try correct');
    assert.match(navButtons[0].title, /Correct/);

    // Question 2: 2 tries & correct -> orange (q-retry)
    assert.ok(navButtons[1].classList.contains('q-retry'), 'Question 2 is orange for correct after retries');
    assert.match(navButtons[1].title, /Correct \(retried\)/);

    // Question 3: 1 try & incorrect -> red (q-wrong)
    assert.ok(navButtons[2].classList.contains('q-wrong'), 'Question 3 is red for incorrect attempt');
    assert.match(navButtons[2].title, /Incorrect/);

    // Question 4: 0 tries & unattempted -> neutral (no q-done/retry/wrong)
    assert.equal(navButtons[3].classList.contains('q-done'), false);
    assert.equal(navButtons[3].classList.contains('q-retry'), false);
    assert.equal(navButtons[3].classList.contains('q-wrong'), false);

    // 3. Question cards in expanded view carry status
    const card1 = r.querySelector<HTMLElement>('[data-question-id="cuaip_1"]')!;
    const card2 = r.querySelector<HTMLElement>('[data-question-id="cuaip_2"]')!;
    const card3 = r.querySelector<HTMLElement>('[data-question-id="cuaip_3"]')!;
    const card4 = r.querySelector<HTMLElement>('[data-question-id="cuaip_4"]')!;
    assert.equal(card1.dataset.status, 'done');
    assert.equal(card2.dataset.status, 'retry');
    assert.equal(card3.dataset.status, 'wrong');
    assert.equal(card4.dataset.status, 'unattempted');

    // 4. Clicking a question jump button scrolls only the PDF, not the sidebar
    let cardScrolled = false;
    card2.scrollIntoView = () => { cardScrolled = true; };
    navButtons[1].click();
    assert.equal(cardScrolled, false, 'Clicking jump button never auto-scrolls the sidebar card');
    assert.deepEqual(scrollToCalls, [2], 'Clicking jump button scrolls PDF to question 2');

    // 4b. In collapsed view, clicking jump button scrolls the PDF even when cards are hidden
    const host = dom.window.document.querySelector<HTMLElement>('[data-betterquest="assessment-rail"]')!;
    host.dataset.collapsed = 'true';
    navButtons[3].click();
    assert.deepEqual(scrollToCalls, [2, 4], 'Clicking jump button in collapsed view scrolls PDF to question 4');

    // 5. Collapsed rail contains the legend and bottom percentage text
    const legend = r.querySelector('.legend');
    assert.ok(legend, 'Legend exists in the rail');
    const legendDots = legend?.querySelectorAll('.legend-dot');
    assert.equal(legendDots?.length, 5, 'Legend has 5 status dots');

    const pctValue = r.querySelector('.pct-value');
    assert.ok(pctValue, 'Percentage readout exists at the bottom');
    assert.match(pctValue!.textContent || '', /\d+%/);
  } finally { workspace.dispose(); dom.window.close(); }
});

function responseRow(q: number): string {
  return `<tr data-id="cuaip_${q}"><td>${q}.</td><td><select name="response"><option value=""></option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option></select></td><td class="status"></td><td class="previous">0 / 5</td><td><button type="button" aria-label="Submit response">Submit</button></td></tr>`;
}

function pdfRunsFor(questions: number) {
  const runs: { text: string; page: number; left: number; top: number; width: number; height: number }[] = [];
  let top = 40;
  for (let q = 1; q <= questions; q++) {
    runs.push({ text: String(q).padStart(3, '0'), page: 1, left: 55, top, width: 24, height: 12 });
    top += 40;
    for (let v = 1; v <= 5; v++) {
      runs.push({ text: `${v}.`, page: 1, left: 80, top, width: 12, height: 12 });
      top += 40;
    }
  }
  return runs;
}

test('answer boxes appear for questions whose response rows Quest renders later', async () => {
  // Quest's DataTables Scroller renders response rows lazily, so the first read
  // only sees a window of them. The viewer must grow its question map as more
  // rows arrive, otherwise later questions never get answer boxes.
  const dom = new JSDOM('<main id="main-content"><div id="target">' +
    '<div id="pdf-frame"><div id="presentation-pdf-frame"><iframe title="Assignment PDF" src="/student/images/problem_pdf?instance=courseuserassignment_1"></iframe></div></div>' +
    '<div id="view-responses-table-id"><table id="instance-table-courseuserassignment_1"><tbody>' +
    responseRow(1) + responseRow(2) +
    '</tbody></table></div></div></main>', {
    url: 'https://quest.cns.utexas.edu/student/instances/show?instance=courseuserassignment_1', pretendToBeVisual: true,
  });
  const doc = dom.window.document;
  const root = doc.querySelector<HTMLElement>('#target')!;
  const runs = pdfRunsFor(4);
  const workspace = createPdfAssessmentWorkspace(root, { createPdfViewer: (container, options) => createInteractivePdfViewer(container, {
    ...options,
    openDocument: async () => ({ pageCount: 1, renderPage: async () => ({ width: 600, height: 1600, runs }), destroy() {} }),
  }) });
  const tick = () => new Promise(resolve => setTimeout(resolve, 20));
  try {
    workspace.reconcile();
    await tick();
    const host = doc.querySelector<HTMLElement>('[data-betterquest="interactive-pdf"]')!;
    const boxes = (q: number) => host.shadowRoot!.querySelectorAll(`.option-hit[data-question="${q}"]`).length;
    assert.equal(boxes(1), 5, 'Question 1 is mapped from the first read');
    assert.equal(boxes(2), 5, 'Question 2 is mapped from the first read');
    assert.equal(boxes(3), 0, 'Question 3 has no response row yet');

    const tbody = doc.querySelector('tbody')!;
    for (const q of [3, 4]) {
      const row = doc.createElement('tr');
      row.dataset.id = `cuaip_${q}`;
      row.innerHTML = `<td>${q}.</td><td><select name="response"><option value=""></option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option></select></td><td class="status"></td><td class="previous">0 / 5</td><td><button type="button" aria-label="Submit response">Submit</button></td>`;
      tbody.append(row);
    }
    workspace.reconcile();
    await tick();
    assert.equal(boxes(3), 5, 'Question 3 gets its answer boxes once its row is readable');
    assert.equal(boxes(4), 5, 'Question 4 gets its answer boxes once its row is readable');
  } finally { workspace.dispose(); dom.window.close(); }
});

