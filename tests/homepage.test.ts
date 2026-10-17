import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createHomepageOverview } from '../src/features/assignments/homepage';
import { emptyState, type Assignment, type LocalState } from '../src/shared/models';
import { assignmentId, courseId } from '../src/shared/identity';

const url = 'https://quest.cns.utexas.edu/student/courses';
const courseUrl = 'https://quest.cns.utexas.edu/student/courses/show?course=3491354';

function state(): LocalState {
  const course = { id: courseId('unique:3491354'), sourceId: 'unique:3491354', title: 'Calculus (3491354)', url: courseUrl };
  const base = {
    courseId: course.id, url: courseUrl,
    deadline: { iso: null as string | null, label: null as string | null, timeZone: null as string | null },
    kind: 'unknown' as Assignment['kind'], historical: null as Assignment['historical'],
  };
  const done = { ...base, id: assignmentId(course.id, 'courseuserassignment_1'), sourceId: 'courseuserassignment_1', title: 'HW 1', completion: 'completed' as const };
  const todo = { ...base, id: assignmentId(course.id, 'courseuserassignment_2'), sourceId: 'courseuserassignment_2', title: 'HW 2', completion: 'not-completed' as const };
  return {
    ...emptyState(),
    cache: {
      courses: [course],
      assignments: [done, todo],
      pages: [{
        sourceUrl: courseUrl,
        observedAt: new Date().toISOString(),
        courseIds: [course.id],
        assignmentIds: [done.id, todo.id],
        scannedCourseIds: [course.id],
      }],
      refreshRequestedAt: null,
    },
  };
}

test('homepage progress bar flows like liquid and stays accessible', async () => {
  const dom = new JSDOM('<div id="courses-table-div"><div id="courses-table_wrapper">' +
    '<table id="courses-table"><thead><tr><th>Name</th><th>Unique</th></tr></thead><tbody>' +
    '<tr><td><a href="/student/courses/show?course=3491354">Calculus</a></td><td>3491354</td></tr>' +
    '</tbody></table></div></div><div id="enroll-div"></div>', { url, pretendToBeVisual: true });
  const doc = dom.window.document;
  const current = state();
  const overview = createHomepageOverview(
    doc.querySelector('#courses-table-div')!,
    (async () => current) as never,
  );
  try {
    await overview.refresh();
    const host = doc.querySelector('[data-betterquest="homepage-overview"]')!;
    const bar = host.shadowRoot!.querySelector<HTMLElement>('.meter')!;
    assert.ok(bar, 'Fluid bar replaces the native progress element');
    assert.equal(bar.getAttribute('role'), 'progressbar');
    assert.equal(bar.getAttribute('aria-valuenow'), '1');
    assert.equal(bar.getAttribute('aria-valuemax'), '2');
    assert.equal(bar.querySelector('span')!.style.width, '50%');
    const css = host.shadowRoot!.querySelector('style')!.textContent!;
    assert.match(css, /@keyframes bq-flow/, 'Bar fill flows like liquid');
    assert.match(css, /\.meter:hover span\{animation-duration:1s\}/, 'Hovering speeds the flow');
    assert.match(css, /bq-sheen/, 'Bar carries a shine sweep');
    assert.equal(host.shadowRoot!.querySelector('.sync-btn'), null, 'Sync is automatic — no manual button');
  } finally { overview.dispose(); dom.window.close(); }
});

test('homepage auto-syncs unscanned courses in the background without a Sync button', async () => {
  const dom = new JSDOM('<div id="courses-table-div"><div id="courses-table_wrapper">' +
    '<table id="courses-table"><thead><tr><th>Name</th><th>Unique</th></tr></thead><tbody>' +
    '<tr><td><a href="/student/courses/show?course=3491354">Calculus</a></td><td>3491354</td></tr>' +
    '</tbody></table></div></div><div id="enroll-div"></div>', { url, pretendToBeVisual: true });
  const doc = dom.window.document;
  const current = emptyState();
  current.cache.courses = [{
    id: courseId('unique:3491354'),
    sourceId: 'unique:3491354',
    title: 'Calculus (3491354)',
    url: courseUrl,
  }];
  const previous = globalThis.chrome;
  const messages: unknown[] = [];
  globalThis.chrome = {
    runtime: {
      sendMessage: async (message: unknown) => {
        messages.push(message);
        return { ok: true, result: 'ok' };
      },
    },
  } as unknown as typeof chrome;
  const overview = createHomepageOverview(
    doc.querySelector('#courses-table-div')!,
    (async () => current) as never,
  );
  try {
    await overview.refresh();
    // Let the auto-sync pass schedule and call the background worker.
    await new Promise(resolve => setTimeout(resolve, 20));
    const host = doc.querySelector('[data-betterquest="homepage-overview"]')!;
    assert.equal(host.shadowRoot!.querySelector('.sync-btn'), null);
    assert.ok(messages.some(message =>
      Boolean(message && typeof message === 'object' && 'type' in message && message.type === 'betterquest:sync-course')));
  } finally {
    overview.dispose();
    globalThis.chrome = previous;
    dom.window.close();
  }
});

test('homepage recognizes course scan when page URL differs from homepage link and renders course meter', async () => {
  const dom = new JSDOM('<div id="courses-table-div"><div id="courses-table_wrapper">' +
    '<table id="courses-table"><thead><tr><th>Name</th><th>Unique</th></tr></thead><tbody>' +
    '<tr><td><a href="/student/courses/show?course=3491354">DIFFEREN AND INTEGRAL CALCULUS</a></td><td>58360</td></tr>' +
    '</tbody></table></div></div><div id="enroll-div"></div>', { url, pretendToBeVisual: true });
  const doc = dom.window.document;
  const course = {
    id: courseId('unique:58360'),
    sourceId: 'unique:58360',
    title: 'DIFFEREN AND INTEGRAL CALCULUS (58360)',
    url: 'https://quest.cns.utexas.edu/student/courses/show?course=3491354',
  };
  const base = {
    courseId: course.id,
    url: 'https://quest.cns.utexas.edu/student/instances/route?instance=courseuserassignment_1',
    deadline: { iso: new Date(Date.now() + 86400000).toISOString(), label: 'Tomorrow', timeZone: 'America/Chicago' },
    kind: 'unknown' as Assignment['kind'], historical: null as Assignment['historical'],
  };
  const openHw = { ...base, id: assignmentId(course.id, 'courseuserassignment_1'), sourceId: 'courseuserassignment_1', title: 'HW 1 - Derivatives', completion: 'not-completed' as const };
  const current: LocalState = {
    ...emptyState(),
    cache: {
      courses: [course],
      assignments: [openHw],
      pages: [{
        // Page was scanned at bare /student/courses/show after redirect
        sourceUrl: 'https://quest.cns.utexas.edu/student/courses/show',
        observedAt: new Date().toISOString(),
        courseIds: [course.id],
        assignmentIds: [openHw.id],
        scannedCourseIds: [course.id],
      }],
      refreshRequestedAt: null,
    },
  };
  const overview = createHomepageOverview(
    doc.querySelector('#courses-table-div')!,
    (async () => current) as never,
  );
  try {
    await overview.refresh();
    const host = doc.querySelector('[data-betterquest="homepage-overview"]')!;
    const shadow = host.shadowRoot!;
    const coverage = shadow.querySelector('.coverage')!;
    assert.equal(coverage.textContent, '1 of 1 courses synced');
    const upcomingRow = shadow.querySelector('.assignment');
    assert.ok(upcomingRow, 'Open homework is listed in Upcoming assignments');
    assert.match(upcomingRow.textContent!, /HW 1 - Derivatives/);
    const courseItems = shadow.querySelectorAll('.grid > div:last-child li');
    assert.equal(courseItems.length, 1);
    const courseStatus = courseItems[0].querySelector('.meta')!;
    assert.match(courseStatus.textContent!, /1 pending · 0 of 1 completed/);
    const courseMeter = courseItems[0].querySelector<HTMLElement>('.course-meter')!;
    assert.ok(courseMeter, 'Per-course meter is rendered');
    assert.equal(courseMeter.getAttribute('aria-valuenow'), '0');
    assert.equal(courseMeter.getAttribute('aria-valuemax'), '1');
  } finally {
    overview.dispose();
    dom.window.close();
  }
});
