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
  } finally { overview.dispose(); dom.window.close(); }
});
