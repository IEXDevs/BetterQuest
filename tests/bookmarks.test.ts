import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { questionAdapter, readQuestions, readResponseQuestions } from '../src/adapters/quest/questions';
import { createBookmarkControls } from '../src/features/bookmarks/controls';
import { BookmarkService, bookmarkUrl } from '../src/features/bookmarks/service';
import { createSavedQuestionsView } from '../src/features/bookmarks/saved-view';
import { startIntegration } from '../src/content/integration';
import { startPageFeatures } from '../src/content/features';
import { LocalRepository } from '../src/storage/repository';
import { readAssignments } from '../src/adapters/quest/assignments';
import { assignmentId, courseId } from '../src/shared/identity';
import type { Assignment, Course, LocalState } from '../src/shared/models';
import type { QuestionBinding } from '../src/shared/adapters';

const html = readFileSync(new URL('./fixtures/quest-responses.html', import.meta.url), 'utf8');
const courseHtml = readFileSync(new URL('./fixtures/quest-assignments.html', import.meta.url), 'utf8');
const nav = '<nav class="qh-navbar"><div class="qh-breadcrumbs"></div><ul class="qh-nav"></ul></nav>';
const url = 'https://quest.cns.utexas.edu/student/instances/route?instance=courseuserassignment_318853196';
const now = '2026-10-08T18:00:00.000Z';
const context = () => ({ url, observedAt: now, signal: new AbortController().signal });
const pause = () => new Promise(resolve => setTimeout(resolve, 170));
function page(markup = html) { return new JSDOM(`<body>${nav}${markup}</body>`, { url, pretendToBeVisual: true }); }
function store() {
  let raw: LocalState | undefined;
  const listeners = new Set<() => void>();
  const backend = { read: async () => raw, write: async (state: LocalState) => { raw = structuredClone(state); listeners.forEach(fn => fn()); } };
  const repo = new LocalRepository(backend);
  const run = repo.execute.bind(repo);
  return { run, repo, backend, listeners, subscribe: (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; } };
}
async function seed(f: ReturnType<typeof store>) {
  const dom = new JSDOM(courseHtml, { url: 'https://quest.cns.utexas.edu/student/fixture-course' });
  try {
    const result = readAssignments(dom.window.document, { ...context(), url: dom.window.document.URL });
    assert.equal(result.status, 'ready');
    if (result.status !== 'ready') throw new Error('Assignment fixture unavailable');
    await f.run({ kind: 'assignments:cache', snapshot: result.value });
  } finally { dom.window.close(); }
}
async function bindings(dom: JSDOM, f: ReturnType<typeof store>): Promise<QuestionBinding[]> {
  const cache = (await f.run({ kind: 'state:read' })).cache;
  const result = readQuestions(dom.window.document, context(), questionAdapter, cache);
  assert.equal(result.status, 'ready');
  if (result.status !== 'ready') throw new Error('Question fixture unavailable');
  return result.value;
}
function buttonFor(row: Element) { return row.querySelector('[data-betterquest="bookmark-control"]')!.shadowRoot!.querySelector<HTMLButtonElement>('button')!; }
function originalCells(table: Element) {
  return [...table.querySelectorAll('tbody > tr.instanceitempart')].map(row => [...row.querySelectorAll(':scope > td')].slice(0, 5).map(cell => cell.outerHTML));
}

test('real response fixture derives twelve questions from table/row IDs without collecting responses', async () => {
  const dom = page(); const f = store(); await seed(f);
  try {
    const rows = await bindings(dom, f);
    assert.equal(rows.length, 12);
    assert.equal(rows[0].assignment.sourceId, 'courseuserassignment_318853196');
    assert.equal(rows[0].assignment.title, 'Section 12.4');
    assert.equal(rows[0].course.title, 'MULTIVARIABLE CALCULUS (58735)');
    assert.equal(rows[0].question.sourceId, 'cuaip_5040376846');
    assert.equal(rows[11].question.number, '12');
    assert.equal(rows[0].assignment.kind, 'unknown'); // Not relabeled as homework.
    assert.equal(rows[0].controlSlot, dom.window.document.querySelector('tr.instanceitempart')!.lastElementChild);
    assert.equal(rows[0].question.url, url); assert.equal(rows[0].question.anchor, null);
    assert.ok(rows.every(row => row.question.prompt.text === null && row.question.prompt.status === 'not-extracted'));
    dom.window.document.querySelector('td.input')!.textContent = 'PRIVATE-RESPONSE-SENTINEL';
    assert.doesNotMatch(JSON.stringify((await bindings(dom, f)).map(b => b.question)), /PRIVATE-RESPONSE|Correct|PointsEarned/);
  } finally { dom.window.close(); }
});

test('missing cached course/assignment is unavailable, not fabricated; known assessments stay disabled', async () => {
  const dom = page(); const f = store();
  try {
    const root = questionAdapter.locate(dom.window.document)!;
    const missing = readResponseQuestions(root, context());
    assert.equal(missing.status, 'unavailable');
    if ('reason' in missing) assert.match(missing.reason, /Assignments page first/);
    await seed(f); const cache = (await f.run({ kind: 'state:read' })).cache;
    cache.assignments = cache.assignments.map(a => ({ ...a, kind: 'assessment' }));
    assert.equal(readResponseQuestions(root, context(), cache).status, 'unavailable');
  } finally { dom.window.close(); }
});

test('occupied final cells and invalid rows are skipped; display order is not identity', async () => {
  const dom = page(); const f = store(); await seed(f);
  try {
    const table = dom.window.document.querySelector('table')!;
    const rows = [...table.querySelectorAll<HTMLTableRowElement>('tr.instanceitempart')];
    rows[0].lastElementChild!.innerHTML = '<button type="button">Native action</button>';
    rows[1].setAttribute('data-id', 'not-a-cuaip');
    let result = await bindings(dom, f); assert.equal(result.length, 10);
    const stable = result[0].question.id;
    rows[2].firstElementChild!.lastChild!.textContent = '99.';
    table.querySelector('tbody')!.append(rows[2]);
    result = await bindings(dom, f);
    assert.equal(result.find(b => b.question.sourceId === 'cuaip_5040376886')?.question.id, stable);
    assert.equal(result.find(b => b.question.sourceId === 'cuaip_5040376886')?.question.number, '99');
  } finally { dom.window.close(); }
});

test('icon toggle persists a bookmark, fills aria-pressed state, and toggles off', async () => {
  const dom = page(); const f = store(); await seed(f);
  const service = new BookmarkService(f.run); const root = questionAdapter.locate(dom.window.document)!;
  const controls = createBookmarkControls(root, service);
  try {
    await controls.reconcile(await bindings(dom, f));
    const row = root.querySelector('tr.instanceitempart')!; const button = buttonFor(row);
    assert.equal(button.type, 'button'); assert.equal(button.getAttribute('aria-pressed'), 'false');
    assert.equal(button.querySelector('svg')?.getAttribute('aria-hidden'), 'true');
    assert.equal(button.textContent, ''); // Compact icon, not a wide text button.
    button.click(); await pause();
    assert.equal(button.getAttribute('aria-pressed'), 'true'); assert.match(button.getAttribute('aria-label')!, /Remove bookmark/);
    const saved = await service.list(); assert.equal(saved.length, 1); assert.equal(saved[0].question.number, '1'); assert.equal(bookmarkUrl(saved[0]), url);
    const recreated = new LocalRepository(f.backend);
    assert.equal((await recreated.execute({ kind: 'state:read' })).bookmarks.length, 1);
    button.click(); await pause(); assert.equal((await service.list()).length, 0); assert.equal(button.getAttribute('aria-pressed'), 'false');
  } finally { controls.dispose(); dom.window.close(); }
});

test('icons leave the first five cells, hidden response IDs, histories, grades and form submission unchanged', async () => {
  const dom = page(`<form id="native-form">${html}<button type="submit" id="native-submit">Submit</button></form>`);
  const f = store(); await seed(f); const root = questionAdapter.locate(dom.window.document)!;
  const table = root.querySelector('table')!; const before = originalCells(table);
  const service = new BookmarkService(f.run); const controls = createBookmarkControls(root, service);
  let submissions = 0, historyClicks = 0;
  dom.window.document.querySelector('form')!.addEventListener('submit', event => { event.preventDefault(); submissions++; });
  table.querySelector('td.previous button')!.addEventListener('click', () => { historyClicks++; });
  try {
    await controls.reconcile(await bindings(dom, f));
    buttonFor(table.querySelector('tr.instanceitempart')!).click(); await pause();
    assert.deepEqual(originalCells(table), before); assert.equal(submissions, 0); assert.equal(historyClicks, 0);
    assert.equal(table.querySelector('input[name="instanceitempart"]')?.getAttribute('value'), 'cuaip_5040376846');
  } finally { controls.dispose(); dom.window.close(); }
});

test('repeated reconciliation and DataTables clones produce one working icon per question', async () => {
  const dom = page(); const f = store(); await seed(f); const root = questionAdapter.locate(dom.window.document)!;
  const controls = createBookmarkControls(root, new BookmarkService(f.run));
  try {
    await controls.reconcile(await bindings(dom, f)); await controls.reconcile(await bindings(dom, f));
    assert.equal(root.querySelectorAll('[data-betterquest="bookmark-control"]').length, 12);
    const row = root.querySelector('tr.instanceitempart')!; row.replaceWith(row.cloneNode(true));
    await controls.reconcile(await bindings(dom, f));
    assert.equal(root.querySelectorAll('[data-betterquest="bookmark-control"]').length, 12);
    assert.ok(root.querySelector('tr.instanceitempart')!.lastElementChild!.firstElementChild!.shadowRoot);
    for (const row of root.querySelectorAll('tr.instanceitempart')) assert.equal(row.querySelectorAll('[data-betterquest="bookmark-control"]').length, 1);
  } finally { controls.dispose(); dom.window.close(); }
});

test('virtual row recycling changes IDs safely and removes detached controls without losing saved state', async () => {
  const dom = page(); const f = store(); await seed(f); const root = questionAdapter.locate(dom.window.document)!;
  const controls = createBookmarkControls(root, new BookmarkService(f.run));
  try {
    await controls.reconcile(await bindings(dom, f));
    const row = root.querySelector<HTMLTableRowElement>('tr.instanceitempart')!;
    buttonFor(row).click(); await pause();
    row.setAttribute('data-id', 'cuaip_99999'); row.id = 'row-cuaip_99999'; row.firstElementChild!.lastChild!.textContent = '50.';
    await controls.reconcile(await bindings(dom, f));
    assert.equal(row.querySelectorAll('[data-betterquest="bookmark-control"]').length, 1);
    assert.equal(buttonFor(row).getAttribute('aria-pressed'), 'false');
    root.querySelector('tr.instanceitempart:nth-child(2)')!.remove();
    await controls.reconcile(await bindings(dom, f));
    assert.equal(root.querySelectorAll('[data-betterquest="bookmark-control"]').length, 11);
    assert.equal((await f.run({ kind: 'state:read' })).bookmarks[0].question.sourceId, 'cuaip_5040376846');
  } finally { controls.dispose(); dom.window.close(); }
});

test('a row recycled during an in-flight save still bookmarks the question that was clicked', async () => {
  const dom = page(); const f = store(); await seed(f);
  let release!: () => void, started!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const entered = new Promise<void>(resolve => { started = resolve; });
  const service = new BookmarkService(async command => {
    if (command.kind === 'bookmarks:put') { started(); await gate; }
    return f.run(command);
  });
  const root = questionAdapter.locate(dom.window.document)!;
  const controls = createBookmarkControls(root, service);
  try {
    await controls.reconcile(await bindings(dom, f));
    const row = root.querySelector<HTMLTableRowElement>('tr.instanceitempart')!;
    buttonFor(row).click(); await entered;
    row.setAttribute('data-id', 'cuaip_987654'); row.firstElementChild!.lastChild!.textContent = '50.';
    await controls.reconcile(await bindings(dom, f));
    release(); await pause();
    assert.equal((await service.list())[0].question.sourceId, 'cuaip_5040376846');
    assert.equal((await service.list())[0].question.number, '1');
    assert.equal(buttonFor(row).getAttribute('aria-pressed'), 'false');
    assert.equal(row.querySelectorAll('[data-betterquest="bookmark-control"]').length, 1);
  } finally { release(); controls.dispose(); dom.window.close(); }
});

test('feature observer tracks attribute-only virtual IDs, table replacement and later cache availability', async () => {
  const dom = page(); const f = store();
  const features = startPageFeatures(dom.window.document, dom.window as unknown as Window, f.run, f.subscribe);
  try {
    features.reconcile(); await pause(); assert.equal(dom.window.document.querySelectorAll('[data-betterquest="bookmark-control"]').length, 0);
    await seed(f); await pause(); assert.equal(dom.window.document.querySelectorAll('[data-betterquest="bookmark-control"]').length, 12);
    const row = dom.window.document.querySelector<HTMLTableRowElement>('tr.instanceitempart')!;
    row.setAttribute('data-id', 'cuaip_123456'); await pause();
    assert.match(row.querySelector<HTMLElement>('[data-betterquest="bookmark-control"]')!.dataset.questionId!, /cuaip_123456$/);
    const table = dom.window.document.querySelector('table')!; table.replaceWith(table.cloneNode(true)); await pause();
    assert.equal(dom.window.document.querySelectorAll('[data-betterquest="bookmark-control"]').length, 12);
  } finally { features.dispose(); dom.window.close(); }
});

test('DataTables clearing only the injected final cell restores one icon without a feedback loop', async () => {
  const dom = page(); const f = store(); await seed(f);
  const slot = dom.window.document.querySelector('tr.instanceitempart')!.lastElementChild!;
  slot.replaceChildren(); // A native redraw may have a truly empty action cell.
  const features = startPageFeatures(dom.window.document, dom.window as unknown as Window, f.run, f.subscribe);
  try {
    features.reconcile(); await pause();
    slot.querySelector('[data-betterquest="bookmark-control"]')!.remove();
    await pause();
    assert.equal(slot.querySelectorAll('[data-betterquest="bookmark-control"]').length, 1);
    await pause();
    assert.equal(slot.querySelectorAll('[data-betterquest="bookmark-control"]').length, 1);
    assert.equal(dom.window.document.querySelectorAll('[data-betterquest="bookmark-control"]').length, 12);
  } finally { features.dispose(); dom.window.close(); }
});

test('saved view groups real bookmark records by course/assignment and links to assignment only', async () => {
  const dom = page(); const f = store(); await seed(f); const service = new BookmarkService(f.run);
  const rows = await bindings(dom, f); await service.add(rows[0].course, rows[0].assignment, rows[0].question);
  await service.add(rows[1].course, rows[1].assignment, rows[1].question);
  const otherCourse: Course = { ...rows[0].course, id: courseId('other-fixture'), sourceId: 'other-fixture', title: 'Other course' };
  const otherAssignment: Assignment = { ...rows[0].assignment, id: assignmentId(otherCourse.id, 'other-assignment'), sourceId: 'other-assignment', courseId: otherCourse.id, title: 'Other assignment' };
  const otherQuestion = { ...rows[0].question, id: `${otherAssignment.id}/question:${rows[0].question.sourceId}`, courseId: otherCourse.id, assignmentId: otherAssignment.id };
  await service.add(otherCourse, otherAssignment, otherQuestion);
  const view = createSavedQuestionsView(dom.window.document, service, f.subscribe, () => {}, () => false);
  try {
    view.open(dom.window.document.querySelector('.qh-navbar') as HTMLElement, false); await pause();
    const host = dom.window.document.querySelector<HTMLElement>('[data-betterquest="saved-questions"]')!;
    assert.equal(host.previousElementSibling, dom.window.document.querySelector('.qh-navbar'));
    assert.equal(host.shadowRoot!.querySelectorAll('details').length, 2);
    assert.equal(host.shadowRoot!.querySelectorAll('h3').length, 2);
    assert.equal(host.shadowRoot!.querySelector('li a')?.textContent, 'Question 1 ↗');
    assert.equal(host.shadowRoot!.querySelector('li a')?.getAttribute('href'), url);
    assert.equal(new URL(host.shadowRoot!.querySelector('li a')!.getAttribute('href')!).hash, '');
    host.shadowRoot!.querySelector<HTMLButtonElement>('.remove')!.click(); await pause();
    assert.equal((await service.list()).length, 2);
    view.close(); assert.equal(host.hidden, true); assert.equal(f.listeners.size, 0);
  } finally { view.dispose(); dom.window.close(); }
});

test('BetterQuest navbar opens/closes Saved Questions on response pages and keeps row feedback in sync', async () => {
  const dom = page(); const f = store(); await seed(f);
  const integration = startIntegration(dom.window.document, dom.window as unknown as Window, { run: f.run, subscribe: f.subscribe });
  try {
    await pause(); const row = dom.window.document.querySelector('tr.instanceitempart')!;
    buttonFor(row).click(); await pause();
    const navigation = dom.window.document.querySelector('[data-betterquest="navigation"]')!;
    const launcher = navigation.querySelector<HTMLButtonElement>('button.qh-nav-link')!;
    assert.equal(launcher.disabled, false); launcher.click(); await pause();
    navigation.querySelector(':scope > span')!.shadowRoot!.querySelector<HTMLButtonElement>('.saved-action')!.click(); await pause();
    const view = dom.window.document.querySelector<HTMLElement>('[data-betterquest="saved-questions"]')!;
    assert.equal(view.hidden, false); assert.equal(launcher.getAttribute('aria-expanded'), 'false');
    view.shadowRoot!.querySelector<HTMLButtonElement>('.remove')!.click(); await pause();
    assert.equal(buttonFor(row).getAttribute('aria-pressed'), 'false');
    view.shadowRoot!.querySelector<HTMLButtonElement>('[aria-label="Close Saved Questions"]')!.click();
    assert.equal(view.hidden, true); assert.equal(launcher.getAttribute('aria-expanded'), 'false');
    launcher.click(); await pause();
    navigation.querySelector(':scope > span')!.shadowRoot!.querySelector<HTMLButtonElement>('.saved-action')!.click(); await pause();
    assert.equal(dom.window.document.querySelectorAll('[data-betterquest="saved-questions"]').length, 1);
  } finally { integration.dispose(); dom.window.close(); }
});

test('all mounted controls clean up on disposal without altering source table cells', async () => {
  const dom = page(); const f = store(); await seed(f);
  const original = dom.window.document.querySelector('.dataTables_scrollBody')!.outerHTML;
  const integration = startIntegration(dom.window.document, dom.window as unknown as Window, { run: f.run, subscribe: f.subscribe });
  await pause(); integration.dispose();
  assert.equal(dom.window.document.querySelector('.dataTables_scrollBody')!.outerHTML, original);
  assert.equal(f.listeners.size, 0); dom.window.close();
});

test('workspace response desk question cards render a bookmark button that saves and removes a question', async () => {
  const { createPdfAssessmentWorkspace } = await import('../src/features/assessment/workspace');
  const dom = new JSDOM('<main id="main-content"><div id="target">' +
    '<p id="due">Due date 10/14/26 11:59 PM</p><br>' +
    '<p id="download"><a href="/student/images/problem_pdf?instance=courseuserassignment_1">PDF w/o expl</a></p>' +
    '<div id="pdf-frame"><div id="presentation-pdf-frame"><iframe title="Assignment PDF" src="/student/images/problem_pdf?instance=courseuserassignment_1"></iframe></div></div>' +
    '<div id="view-responses-table-id"><table id="instance-table-courseuserassignment_1"><tbody>' +
    '<tr data-id="cuaip_1"><td>1.</td><td><select name="response"><option value=""></option><option value="1">1</option></select></td><td class="status"></td><td class="previous">0 / 3</td><td><button type="button" aria-label="Submit response">Submit</button></td></tr>' +
    '</tbody></table></div></div></main>',
    { url: 'https://quest.cns.utexas.edu/student/instances/show?instance=courseuserassignment_1', pretendToBeVisual: true });
  const f = store();
  const root = dom.window.document.querySelector<HTMLElement>('#target')!;
  const workspace = createPdfAssessmentWorkspace(root, {
    run: f.run,
    createPdfViewer: container => {
      const el = dom.window.document.createElement('div');
      container.append(el);
      return { element: el, ready: Promise.resolve(true), setSelected() {}, setFullscreen() {}, setAnsweredQuestions() {}, markWrong() {}, celebrate() {}, announce() {}, dispose() {} };
    },
  });
  workspace.reconcile();
  try {
    const rail = dom.window.document.querySelector('[data-betterquest="assessment-rail"]')!.shadowRoot!;
    const btn = rail.querySelector<HTMLButtonElement>('.card-bookmark-btn')!;
    assert.ok(btn, 'Bookmark button must be rendered on question card');
    assert.equal(btn.getAttribute('aria-pressed'), 'false');

    btn.click();
    await pause();

    assert.equal(btn.getAttribute('aria-pressed'), 'true');
    const state = await f.run({ kind: 'state:read' });
    assert.equal(state.bookmarks.length, 1);
    assert.equal(state.bookmarks[0].question.number, '1');
    assert.equal(state.streak?.current ?? 0, 0);

    btn.click();
    await pause();
    assert.equal(btn.getAttribute('aria-pressed'), 'false');
    const stateAfter = await f.run({ kind: 'state:read' });
    assert.equal(stateAfter.bookmarks.length, 0);
  } finally {
    workspace.dispose();
    dom.window.close();
  }
});
