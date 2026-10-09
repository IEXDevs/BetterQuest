import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { findAssignmentSectionSlot } from '../src/adapters/quest/assignment-placement';
import { startIntegration } from '../src/content/integration';
import { LocalRepository } from '../src/storage/repository';
import type { LocalState } from '../src/shared/models';

const html = readFileSync(new URL('./fixtures/quest-assignments.html', import.meta.url), 'utf8');
const navbar = '<nav class="qh-navbar"><div class="qh-breadcrumbs"></div><ul class="qh-nav"></ul></nav>';
const pause = () => new Promise(resolve => setTimeout(resolve, 180));
function page(markup = html) {
  return new JSDOM(`<body>${navbar}${markup}</body>`, { url: 'https://quest.cns.utexas.edu/student/fixture-course', pretendToBeVisual: true });
}
function store() {
  let state: LocalState | undefined;
  const listeners = new Set<() => void>();
  const repo = new LocalRepository({ read: async () => state, write: async next => { state = structuredClone(next); listeners.forEach(fn => fn()); } });
  return { run: repo.execute.bind(repo), subscribe: (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; } };
}

test('placement uses existing third column without altering Instructor or Meets', () => {
  const dom = page();
  try {
    const columns = [...dom.window.document.querySelectorAll<HTMLElement>('#student-course-info-header > .row.text-center > .col')];
    const before = columns.map(col => col.outerHTML);
    assert.equal(findAssignmentSectionSlot(dom.window.document)?.column, columns[2]);
    assert.deepEqual(columns.map(col => col.outerHTML), before);
  } finally { dom.window.close(); }
});

test('occupied columns are skipped; no empty column disables injection instead of overwriting', () => {
  const dom = page();
  try {
    const columns = [...dom.window.document.querySelectorAll<HTMLElement>('#student-course-info-header > .row.text-center > .col')];
    columns[2].textContent = 'Native course information';
    assert.equal(findAssignmentSectionSlot(dom.window.document)?.column, columns[3]);
    columns[3].textContent = 'Another native widget';
    assert.equal(findAssignmentSectionSlot(dom.window.document), null);
    assert.equal(columns[2].textContent, 'Native course information');
  } finally { dom.window.close(); }
});

test('missing Meets label or verified row does not fall back to a standalone card', () => {
  const dom = page();
  try {
    dom.window.document.querySelectorAll('#student-course-info-header .qlabel')[1].textContent = 'Unknown label';
    assert.equal(findAssignmentSectionSlot(dom.window.document), null);
    assert.equal(dom.window.document.querySelector('#target > [data-betterquest="assignment-section"]'), null);
  } finally { dom.window.close(); }
});

test('automatic mount removes old standalone tracker, keeps four columns, and remains idempotent', async () => {
  const dom = page(); const f = store();
  const document = dom.window.document;
  const root = document.querySelector('#target')!;
  const columns = [...document.querySelectorAll('#student-course-info-header > .row.text-center > .col')];
  const untouched = [columns[0].outerHTML, columns[1].outerHTML, columns[3].outerHTML];
  root.insertAdjacentHTML('beforeend', '<div class="card" data-betterquest="assignment-section">Old standalone tracker</div>');
  const integration = startIntegration(document, dom.window as unknown as Window, f);
  try {
    await pause(); integration.reconcile(); await pause();
    const widget = root.querySelector('[data-betterquest="assignment-section"]')!;
    assert.equal(widget.parentElement, columns[2]);
    assert.equal(root.querySelectorAll('[data-betterquest="assignment-section"]').length, 1);
    assert.equal(root.querySelector(':scope > [data-betterquest="assignment-section"]'), null);
    assert.equal(document.querySelectorAll('#student-course-info-header > .row.text-center > .col').length, 4);
    assert.deepEqual([columns[0].outerHTML, columns[1].outerHTML, columns[3].outerHTML], untouched);
    assert.equal(widget.classList.contains('card'), false);
  } finally { integration.dispose(); dom.window.close(); }
});

test('same-root course-info rerender restores one summary in the replacement empty column', async () => {
  const dom = page(); const f = store(); const document = dom.window.document;
  const info = document.querySelector('#student-course-info-header')!;
  const original = info.innerHTML;
  const integration = startIntegration(document, dom.window as unknown as Window, f);
  try {
    await pause();
    info.innerHTML = original; await pause();
    const columns = [...info.querySelectorAll('.row.text-center > .col')];
    assert.equal(document.querySelector('[data-betterquest="assignment-section"]')?.parentElement, columns[2]);
    assert.equal(document.querySelectorAll('[data-betterquest="assignment-section"]').length, 1);
    assert.equal(document.querySelectorAll('[data-betterquest="navigation"]').length, 1);
  } finally { integration.dispose(); dom.window.close(); }
});

test('summary belongs to native collapse and neither mounting nor navbar focus forces it open', async () => {
  const dom = page(); const f = store(); const document = dom.window.document;
  const info = document.querySelector<HTMLElement>('#student-course-info-header')!;
  info.classList.remove('show'); info.style.display = 'none';
  const before = info.className;
  const integration = startIntegration(document, dom.window as unknown as Window, f);
  try {
    await pause();
    const widget = document.querySelector('[data-betterquest="assignment-section"]')!;
    assert.equal(widget.closest('#student-course-info-header'), info);
    document.querySelector('[data-betterquest="navigation"]')!.shadowRoot!.querySelector<HTMLButtonElement>('button')!.click();
    assert.equal(info.className, before); assert.equal(info.style.display, 'none');
    assert.equal(widget.shadowRoot!.activeElement, null);
  } finally { integration.dispose(); dom.window.close(); }
});

test('course details and source IDs come from the page rather than hardcoded values', async () => {
  const dom = page(html.replace('MULTIVARIABLE CALCULUS (58735)', 'ANOTHER COURSE (12345)'));
  const f = store();
  const integration = startIntegration(dom.window.document, dom.window as unknown as Window, f);
  try {
    await pause();
    const cached = await f.run({ kind: 'state:read' });
    assert.equal(cached.cache.courses[0].sourceId, 'unique:12345');
    assert.equal(cached.cache.courses[0].title, 'ANOTHER COURSE (12345)');
    assert.equal(dom.window.document.querySelector('[data-betterquest="assignment-section"]')!.shadowRoot!.querySelectorAll('.row').length, 1);
  } finally { integration.dispose(); dom.window.close(); }
});
