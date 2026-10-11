import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { assignmentAdapter, readAssignments, readDeadline } from '../src/adapters/quest/assignments';
import { startPageFeatures } from '../src/content/features';
import { startIntegration } from '../src/content/integration';
import { AssignmentTracker } from '../src/features/assignments/tracker';
import { assignmentPanelData } from '../src/features/assignments/view-model';
import { createAssignmentSection } from '../src/features/assignments/section';
import { LocalRepository } from '../src/storage/repository';
import { emptyState, type AssignmentSnapshot, type LocalState } from '../src/shared/models';
import { isSnapshot } from '../src/shared/validation';
import { courseId } from '../src/shared/identity';
import type { Execute } from '../src/shared/client';

const html = readFileSync(new URL('./fixtures/quest-assignments.html', import.meta.url), 'utf8');
const base = 'https://quest.cns.utexas.edu/student/fixture-course?unique=58735';
const nav = '<nav class="qh-navbar"><div class="qh-breadcrumbs"></div><ul class="qh-nav"></ul></nav>';
const now = '2026-10-08T18:00:00.000Z';
function page(markup = html, url = base) {
  return new JSDOM(`<html><body>${nav}${markup}</body></html>`, { url, pretendToBeVisual: true });
}
function snapshot(dom: JSDOM): AssignmentSnapshot {
  const result = readAssignments(dom.window.document, { url: dom.window.location.href, observedAt: now, signal: new AbortController().signal });
  assert.equal(result.status, 'ready');
  if (result.status !== 'ready') throw new Error('No snapshot');
  assert.equal(isSnapshot(result.value), true);
  return result.value;
}
function store() {
  let raw: LocalState | undefined;
  let writes = 0;
  const listeners = new Set<() => void>();
  const repo = new LocalRepository({
    read: async () => raw, write: async state => {
      raw = JSON.parse(JSON.stringify(state)); writes++; listeners.forEach(callback => callback());
    }
  });
  const run: Execute = command => repo.execute(command);
  const subscribe = (callback: () => void) => { listeners.add(callback); return () => { listeners.delete(callback); }; };
  return { run, subscribe, listeners, writes: () => writes };
}
const pause = () => new Promise(resolve => setTimeout(resolve, 160));

test('supplied real Quest HTML parses ten stable assignments and course/group identity', () => {
  const dom = page();
  try {
    const data = snapshot(dom);
    assert.equal(data.courses[0].sourceId, 'unique:58735');
    assert.equal(data.courses[0].title, 'MULTIVARIABLE CALCULUS (58735)');
    assert.equal(data.courses[0].url, base);
    assert.equal(data.assignments.length, 10);
    assert.equal(data.assignments[0].sourceId, 'courseuserassignment_316051496');
    assert.equal(data.assignments[0].url, 'https://quest.cns.utexas.edu/student/instances/route?instance=courseuserassignment_316051496');
    assert.deepEqual(data.assignments[0].group, { id: '3769540', label: 'MULTIVARIABLE CALCULUS group 1' });
    assert.deepEqual(data.scannedCourseIds, [data.courses[0].id]);
    assert.equal(data.assignments.every(a => a.kind === 'unknown' && a.historical === null), true);
  } finally { dom.window.close(); }
});

test('uses Unix deadlines with Central timezone and does not depend on browser locale', () => {
  const dom = page();
  try {
    const first = snapshot(dom).assignments[0];
    assert.deepEqual(first.deadline, { iso: '2026-08-31T04:59:00.000Z', label: 'August 30, 2026 11:59 PM CDT', timeZone: 'America/Chicago' });
    assert.equal(first.start?.iso, '2026-08-15T21:00:00.000Z');
    const cells = dom.window.document.querySelectorAll('#instances-table-eh3769540 tbody tr:first-child td');
    cells[3].textContent = 'A changed display label';
    assert.equal(snapshot(dom).assignments[0].deadline.iso, first.deadline.iso);
  } finally { dom.window.close(); }
});

test('reads explicit completion and grade labels; a grade never substitutes for completion', () => {
  const dom = page();
  try {
    const data = snapshot(dom);
    assert.equal(data.assignments.filter(a => a.completion === 'completed').length, 9);
    const last = data.assignments.find(a => a.sourceId === 'courseuserassignment_319714716')!;
    assert.equal(last.completion, 'not-completed');
    assert.deepEqual(last.grade, { percent: null, label: 'Not available' });
    assert.deepEqual(data.assignments[0].grade, { percent: 100, label: '100 percent' });
    const row = dom.window.document.querySelector('#instances-table-eh3769540 tbody tr:last-child')!;
    row.querySelectorAll('td')[5].innerHTML = '<span class="sr-only">Grade: 42.5 percent</span><span aria-hidden="true">42.5</span>';
    const updated = snapshot(dom).assignments.at(-1)!;
    assert.equal(updated.grade?.percent, 42.5); assert.equal(updated.completion, 'not-completed');
    row.querySelectorAll('td')[4].textContent = '';
    assert.equal(snapshot(dom).assignments.at(-1)!.completion, 'unknown');
  } finally { dom.window.close(); }
});

test('incomplete Quest rows receive a reversible local completed checkmark', async () => {
  const dom = page(); const f = store();
  const features = startPageFeatures(dom.window.document, dom.window as unknown as Window, f.run, f.subscribe);
  try {
    features.reconcile(); await pause();
    const row = [...dom.window.document.querySelectorAll('#tabs-elements tbody tr')]
      .find(item => item.textContent?.includes('Section 12.5'))!;
    const host = row.querySelector<HTMLElement>('[data-betterquest="completion-toggle"]')!;
    assert.ok(host);
    const button = host.shadowRoot!.querySelector<HTMLButtonElement>('button')!;
    assert.equal(button.getAttribute('aria-pressed'), 'false');
    button.click(); await pause();
    const state = await f.run({ kind: 'state:read' });
    const item = state.cache.assignments.find(a => a.title === 'Section 12.5')!;
    assert.equal(state.completionOverrides?.[item.id], true);
    assert.equal(button.getAttribute('aria-pressed'), 'true');
    button.click(); await pause();
    assert.equal((await f.run({ kind: 'state:read' })).completionOverrides?.[item.id], undefined);
  } finally { features.dispose(); dom.window.close(); }
});

test('unknown Quest completion markup does not receive a manual completion control', async () => {
  const dom = page(); const f = store();
  const row = dom.window.document.querySelector('#instances-table-eh3769540 tbody tr:last-child')!;
  row.querySelectorAll('td')[4].textContent = '';
  const features = startPageFeatures(dom.window.document, dom.window as unknown as Window, f.run, f.subscribe);
  try {
    features.reconcile(); await pause();
    assert.equal(row.querySelector('[data-betterquest="completion-toggle"]'), null);
  } finally { features.dispose(); dom.window.close(); }
});

test('multiple assignment groups are collected, empty placeholders ignored, duplicates collapsed', () => {
  const dom = page();
  try {
    const source = dom.window.document.querySelector('#instances-table-eh3769540 tbody tr')!;
    const target = dom.window.document.querySelector('#instances-table-eh3849120 tbody')!;
    target.replaceChildren(source.cloneNode(true));
    assert.equal(snapshot(dom).assignments.length, 10);
    const row = source.cloneNode(true) as Element;
    row.querySelector('a')!.setAttribute('href', '/student/instances/route?instance=courseuserassignment_999999');
    target.append(row);
    const data = snapshot(dom);
    assert.equal(data.assignments.length, 11);
    assert.equal(data.assignments.find(a => a.sourceId === 'courseuserassignment_999999')?.group?.label, 'Custom Reviews');
  } finally { dom.window.close(); }
});

test('parsing is read-only and does not invoke embedded Quest scripts or touch tables/forms', () => {
  const dom = page();
  try {
    const target = dom.window.document.querySelector('#target')!;
    target.insertAdjacentHTML('beforeend', '<form><input value="private response"><button type="submit">Submit</button></form>');
    const before = target.outerHTML;
    snapshot(dom); snapshot(dom);
    assert.equal(target.outerHTML, before);
    assert.equal(dom.window.document.querySelector('input')!.value, 'private response');
  } finally { dom.window.close(); }
});

test('handles missing/invalid fields and hidden DataTables columns without guessing metadata', () => {
  const dom = page();
  try {
    const table = dom.window.document.querySelector('#instances-table-eh3769540')!;
    for (const row of table.querySelectorAll('tr')) row.children[2].remove(); // Quest can hide Start Date.
    assert.equal(snapshot(dom).assignments[0].deadline.iso, '2026-08-31T04:59:00.000Z');
    const first = table.querySelector('tbody tr')!;
    first.children[2].removeAttribute('data-order'); first.children[2].textContent = 'Due Date: To be announced';
    assert.deepEqual(snapshot(dom).assignments[0].deadline, { iso: null, label: 'To be announced', timeZone: 'America/Chicago' });
    first.querySelector('a')!.setAttribute('href', 'https://foreign.example/student/instances/route?instance=courseuserassignment_1');
    assert.equal(snapshot(dom).assignments.length, 9);
    dom.window.document.querySelector('button[data-target="#student-course-info-header"] .h4')!.textContent = 'No verified unique number';
    assert.equal(readAssignments(dom.window.document, { url: base, observedAt: now, signal: new AbortController().signal }).status, 'unavailable');
  } finally { dom.window.close(); }
});

test('fallback accepts only explicit CDT/CST dates and preserves unparseable deadlines', () => {
  const dom = page();
  try {
    const cell = dom.window.document.createElement('td');
    cell.textContent = 'Due Date: November 15, 2026 11:59 PM CST';
    assert.equal(readDeadline(cell, 'Due Date (Central Time)').iso, '2026-11-16T05:59:00.000Z');
    cell.textContent = 'February 30, 2026 11:59 PM CST'; assert.equal(readDeadline(cell, '').iso, null);
    cell.textContent = 'October 11, 2026 11:59 PM'; assert.equal(readDeadline(cell, '').iso, null);
  } finally { dom.window.close(); }
});

test('loading course is known but not scanned; dynamic rows/groups and data-order changes update cache', async () => {
  const dom = page(); const f = store();
  const elements = dom.window.document.querySelector('#tabs-elements')!;
  const saved = elements.innerHTML; elements.replaceChildren();
  const features = startPageFeatures(dom.window.document, dom.window as unknown as Window, f.run);
  try {
    features.reconcile(); await pause();
    let cache = (await f.run({ kind: 'state:read' })).cache;
    assert.equal(cache.courses.length, 1); assert.equal(cache.assignments.length, 0);
    assert.equal(assignmentPanelData(cache).courses[0].scanned, false);
    elements.innerHTML = saved; await pause();
    cache = (await f.run({ kind: 'state:read' })).cache;
    assert.equal(cache.assignments.length, 10); assert.equal(assignmentPanelData(cache).courses[0].scanned, true);
    const cell = dom.window.document.querySelector('#instances-table-eh3769540 tbody tr:first-child td:nth-child(4)')!;
    cell.setAttribute('data-order', '1791781140'); await pause();
    assert.equal((await f.run({ kind: 'state:read' })).cache.assignments[0].deadline.iso, '2026-10-12T04:59:00.000Z');
    const writes = f.writes();
    dom.window.document.querySelector('#student-course-info-header')!.append('unrelated course detail'); await pause();
    assert.equal(f.writes(), writes); // No redundant cache writes or refresh feedback loops.
  } finally { features.dispose(); dom.window.close(); }
});

test('processing indicators prevent premature scan claims and are observed when they hide', async () => {
  const dom = page(); const f = store();
  const processing = dom.window.document.querySelector<HTMLElement>('#instances-table-eh3769540_processing')!;
  processing.style.display = 'block';
  const features = startPageFeatures(dom.window.document, dom.window as unknown as Window, f.run);
  try {
    features.reconcile(); await pause();
    assert.equal(assignmentPanelData((await f.run({ kind: 'state:read' })).cache).courses[0].scanned, false);
    processing.style.display = 'none'; await pause();
    assert.equal(assignmentPanelData((await f.run({ kind: 'state:read' })).cache).courses[0].scanned, true);
  } finally { features.dispose(); dom.window.close(); }
});

test('visited courses aggregate persistently and rescans deduplicate by stable assignment identity', async () => {
  const first = page();
  const second = page(html.replace('MULTIVARIABLE CALCULUS (58735)', 'OTHER COURSE (12345)').replaceAll('courseuserassignment_', 'courseuserassignment_9'), 'https://quest.cns.utexas.edu/student/fixture-course?unique=12345');
  const f = store(); const tracker = new AssignmentTracker(f.run);
  try {
    await tracker.cache(snapshot(first)); await tracker.cache(snapshot(first)); await tracker.cache(snapshot(second));
    const cache = await tracker.read();
    assert.equal(cache.courses.length, 2); assert.equal(cache.assignments.length, 20);
    assert.equal(assignmentPanelData(cache).courses.filter(c => c.scanned).length, 2);
    const known = { ...snapshot(first).courses[0], id: courseId('unique:33333'), sourceId: 'unique:33333', title: 'Known but unscanned' };
    await tracker.cache({ sourceUrl: base + '&known=1', observedAt: now, courses: [known], assignments: [], scannedCourseIds: [] });
    assert.equal(assignmentPanelData(await tracker.read()).courses.find(c => c.course.id === known.id)?.scanned, false);
  } finally { first.window.close(); second.window.close(); }
});

test('course-info summary shows the next three incomplete assignments in the first empty column', async () => {
  const dom = page(); const f = store(); const tracker = new AssignmentTracker(f.run);
  await tracker.cache(snapshot(dom));
  const root = dom.window.document.querySelector('#target')!;
  const view = createAssignmentSection(root, f.run, f.subscribe);
  const host = root.querySelector<HTMLElement>('[data-betterquest="assignment-section"]')!;
  const body = host.shadowRoot!;
  try {
    await view.refresh(snapshot(dom).courses[0]);
    assert.equal(body.querySelectorAll('.row').length, 1);
    assert.match(body.querySelector('.row a')!.textContent!, /Section 12.5/);
    assert.match(body.querySelector<HTMLElement>('.note')!.title, /Other courses are not yet scanned/);
    const columns = root.querySelectorAll('#student-course-info-header > .row.text-center > .col');
    assert.equal(host.parentElement, columns[2]);
    assert.equal(host.classList.contains('card'), false);
    const data = snapshot(dom);
    data.assignments.slice(0, 4).forEach(a => { a.completion = 'not-completed'; });
    await tracker.cache(data); await pause();
    assert.equal(body.querySelectorAll('.row').length, 3);
    assert.deepEqual([...body.querySelectorAll('.assignment-link')].map(a => a.textContent), ['Section 10.1', 'Section 10.4', 'Section 10.5']);
    assert.equal(body.querySelectorAll('.deadline').length, 3);
    assert.equal(body.querySelector('.view-all')?.getAttribute('href'), '#tabs-elements');
    assert.equal(f.listeners.size, 1);
    assert.equal(host.querySelector('style'), null);
  } finally { view.dispose(); dom.window.close(); }
});

test('invalidated extension context shows a reload prompt instead of raw errors', async () => {
  const dom = page(); const data = snapshot(dom);
  const previous = (globalThis as { chrome?: unknown }).chrome;
  (globalThis as { chrome?: unknown }).chrome = { runtime: {} };
  const root = dom.window.document.querySelector('#target')!;
  const view = createAssignmentSection(root, async () => { throw new Error('Extension context invalidated.'); }, () => () => { });
  try {
    await view.refresh(data.courses[0]);
    const alert = root.querySelector('[data-betterquest="assignment-section"]')!.shadowRoot!.querySelector('[role="alert"]')!;
    assert.match(alert.textContent || '', /Extension updated\. Reload this page to continue\./);
    const reload = alert.querySelector<HTMLButtonElement>('.reload-btn')!;
    assert.equal(reload.textContent, 'Reload page');
  } finally {
    (globalThis as { chrome?: unknown }).chrome = previous;
    view.dispose(); dom.window.close();
  }
});

test('unknown deadlines sort last; inline errors are visible and do not mutate state', async () => {
  const dom = page(); const f = store(); const data = snapshot(dom);
  data.assignments[0].deadline.iso = null; await new AssignmentTracker(f.run).cache(data);
  assert.equal(assignmentPanelData((await f.run({ kind: 'state:read' })).cache).assignments.at(-1)?.title, 'Section 10.1');
  const root = dom.window.document.querySelector('#target')!;
  const view = createAssignmentSection(root, async () => { throw new Error('Storage fixture failed'); }, () => () => { });
  try {
    await view.refresh(data.courses[0]);
    assert.equal(root.querySelector('[data-betterquest="assignment-section"]')!.shadowRoot!.querySelector('[role="alert"]')?.textContent, 'Storage fixture failed');
  }
  finally { view.dispose(); dom.window.close(); }
});

test('full integration keeps the automatic summary while navbar opens Saved Questions', async () => {
  const dom = page(); const f = store();
  const original = dom.window.document.querySelector('#target')!.outerHTML;
  const integration = startIntegration(dom.window.document, dom.window as unknown as Window, { run: f.run, subscribe: f.subscribe });
  try {
    await pause();
    const navigation = dom.window.document.querySelector('[data-betterquest="navigation"]')!;
    const button = navigation.querySelector<HTMLButtonElement>('button.qh-nav-link')!;
    const section = dom.window.document.querySelector<HTMLElement>('[data-betterquest="assignment-section"]')!;
    assert.equal(section.shadowRoot!.querySelectorAll('.row').length, 1);
    button.click();
    navigation.querySelector(':scope > span')!.shadowRoot!.querySelector<HTMLButtonElement>('.saved-action')!.click();
    const saved = dom.window.document.querySelector('[data-betterquest="saved-questions"]')!;
    assert.equal(saved.shadowRoot!.activeElement, saved.shadowRoot!.querySelector('h2'));
    assert.equal(dom.window.document.querySelector('[data-betterquest="panel"]'), null);
    const targetCopy = dom.window.document.querySelector('#target')!.cloneNode(true) as Element;
    targetCopy.querySelector('[data-betterquest="assignment-section"]')!.remove();
    targetCopy.querySelectorAll('[data-betterquest="completion-toggle"]').forEach(node => node.remove());
    assert.equal(targetCopy.outerHTML, original);
    assert.equal(dom.window.document.querySelectorAll('[data-betterquest="navigation"]').length, 1);
  } finally { integration.dispose(); dom.window.close(); }
});

test('legacy records without optional scan/grade fields remain readable and do not claim scan coverage', () => {
  const cache = emptyState().cache;
  assert.deepEqual(assignmentPanelData(cache), { courses: [], assignments: [] });
  const dom = page();
  try {
    const data = snapshot(dom);
    cache.courses = data.courses;
    cache.assignments = data.assignments.map(({ grade: _grade, start: _start, group: _group, completionLabel: _label, ...rest }) => rest);
    cache.pages = [{ sourceUrl: base, observedAt: now, courseIds: data.courses.map(c => c.id), assignmentIds: data.assignments.map(a => a.id) }];
    assert.equal(assignmentPanelData(cache).courses[0].scanned, false);
    assert.ok(assignmentAdapter.locate(dom.window.document));
  } finally { dom.window.close(); }
});

test('View all delegates to Quest native assignment tab without changing collapse or columns', async () => {
  const dom = page(); const f = store(); const tracker = new AssignmentTracker(f.run);
  await tracker.cache(snapshot(dom));
  const root = dom.window.document.querySelector('#target')!;
  const view = createAssignmentSection(root, f.run, () => () => { });
  try {
    await view.refresh(snapshot(dom).courses[0]);
    const body = root.querySelector('[data-betterquest="assignment-section"]')!.shadowRoot!;
    const info = root.querySelector('#student-course-info-header')!;
    const before = info.className;
    const columns = [...info.querySelectorAll('.row.text-center > .col')];
    let clicked = 0;
    const tab = root.querySelector('#student-elements-a')!;
    tab.addEventListener('click', event => { event.preventDefault(); clicked++; });
    body.querySelector<HTMLAnchorElement>('.view-all')!.click();
    assert.equal(clicked, 1);
    assert.equal(info.className, before);
    assert.deepEqual([...info.querySelectorAll('.row.text-center > .col')], columns);
    assert.equal(root.querySelectorAll('[data-betterquest="assignment-section"]').length, 1);
  } finally { view.dispose(); dom.window.close(); }
});
