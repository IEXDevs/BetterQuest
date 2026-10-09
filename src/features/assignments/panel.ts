import type { Assignment, LocalState } from '../../shared/models';
import { execute, subscribeLocal, type Execute } from '../../shared/client';
import { sourceUrl } from '../../shared/identity';

export type Subscribe = (callback: () => void) => () => void;

export function assignmentPanelData(cache: LocalState['cache']) {
  const assignments = [...cache.assignments].sort((a, b) => {
    const difference = (a.deadline.iso ? Date.parse(a.deadline.iso) : Infinity) - (b.deadline.iso ? Date.parse(b.deadline.iso) : Infinity);
    return (Number.isNaN(difference) ? 0 : difference) || a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
  });
  const courses = cache.courses.map(course => {
    const observations = cache.pages.filter(page => page.scannedCourseIds?.includes(course.id)).sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt));
    return { course, scanned: observations.length > 0, observedAt: observations[0]?.observedAt || null,
      assignmentCount: cache.assignments.filter(a => a.courseId === course.id).length };
  });
  return { assignments, courses };
}

function statusText(assignment: Assignment): string {
  return { completed: 'Completed', 'not-completed': 'Not completed', 'not-started': 'Not started', 'in-progress': 'In progress', unknown: 'Completion unknown' }[assignment.completion];
}

/** Small list inside the existing panel; read-only and entirely Shadow-DOM scoped. */
export function createAssignmentPanel(container: HTMLElement, run: Execute = execute, subscribe: Subscribe = subscribeLocal, scanCurrentPage?: () => Promise<void>) {
  const document = container.ownerDocument;
  const style = document.createElement('style');
  style.textContent = `
    .bq-tracker { padding: 14px 18px; font: 12px/1.5 system-ui,sans-serif; color:#18253a; }
    .bq-toolbar { display:flex; align-items:center; justify-content:space-between; gap:12px; }
    .bq-tracker h3 { margin:0; font-size:14px; }
    .bq-tracker button { all:unset; cursor:pointer; color:#2563eb; font:600 12px system-ui; padding:5px 7px; border-radius:5px; }
    .bq-tracker button:focus-visible,.bq-tracker a:focus-visible { outline:2px solid #2563eb; outline-offset:2px; }
    .bq-tracker button:disabled { opacity:.5; cursor:wait; }
    .bq-coverage { margin:10px 0; color:#607089; font-size:11px; }
    .bq-courses { padding:0; margin:10px 0; list-style:none; }
    .bq-courses li { padding:6px 0; border-bottom:1px solid #edf1f7; }
    .bq-courses span { display:block; font-size:11px; color:#607089; }
    .bq-assignments { padding:0; list-style:none; margin:12px 0 0; }
    .bq-assignments li { padding:12px 0; border-top:1px solid #edf1f7; }
    .bq-assignments a { color:#1d4ed8; text-decoration:none; font-weight:600; }
    .bq-assignments a:hover { text-decoration:underline; }
    .bq-detail { display:block; margin-top:4px; color:#607089; font-size:11px; }
    .bq-error { color:#a53434; }
  `;
  const content = document.createElement('div'); content.className = 'bq-tracker';
  const toolbar = document.createElement('div'); toolbar.className = 'bq-toolbar';
  const heading = document.createElement('h3'); heading.textContent = 'Assignments';
  const refreshButton = document.createElement('button'); refreshButton.type = 'button'; refreshButton.textContent = 'Refresh';
  refreshButton.setAttribute('aria-label', 'Refresh collected assignments');
  toolbar.append(heading, refreshButton);
  const coverage = document.createElement('p'); coverage.className = 'bq-coverage';
  coverage.textContent = 'Collected as you visit course pages. Other courses are not yet scanned; open each course in Quest. This is not a full account sync.';
  const result = document.createElement('div'); result.setAttribute('aria-live', 'polite');
  content.append(toolbar, coverage, result); container.append(style, content);
  let active = false;
  let generation = 0;
  let stop: (() => void) | undefined;

  function render(cache: LocalState['cache']) {
    result.replaceChildren();
    const data = assignmentPanelData(cache);
    const courses = document.createElement('ul'); courses.className = 'bq-courses';
    for (const summary of data.courses) {
      const row = document.createElement('li'); row.textContent = summary.course.title;
      const note = document.createElement('span');
      note.textContent = summary.scanned ? `${summary.assignmentCount} cached assignments · last observed ${new Date(summary.observedAt!).toLocaleString()}` : 'Not scanned yet · waiting for a recognized assignment table';
      row.append(note); courses.append(row);
    }
    if (data.courses.length) result.append(courses);
    if (!data.assignments.length) {
      const empty = document.createElement('p'); empty.textContent = 'No assignments collected yet. Visit a course’s Assignments tab and let its tables load.';
      result.append(empty); return;
    }
    const order = document.createElement('p'); order.className = 'bq-coverage'; order.textContent = 'Earliest deadline first. Unknown deadlines are listed last. Cached rows may be older than the current page.';
    result.append(order);
    const list = document.createElement('ul'); list.className = 'bq-assignments';
    for (const assignment of data.assignments) {
      const item = document.createElement('li'); item.dataset.assignmentId = assignment.id;
      const link = document.createElement('a'); link.href = sourceUrl(assignment.url); link.textContent = assignment.title;
      const course = cache.courses.find(course => course.id === assignment.courseId);
      const context = document.createElement('span'); context.className = 'bq-detail';
      context.textContent = [course?.title, assignment.group?.label].filter(Boolean).join(' · ');
      const due = document.createElement('span'); due.className = 'bq-detail';
      due.textContent = assignment.deadline.iso ? `Due: ${assignment.deadline.label || assignment.deadline.iso}` : `Deadline unknown${assignment.deadline.label ? ': ' + assignment.deadline.label : ''}`;
      const status = document.createElement('span'); status.className = 'bq-detail';
      status.textContent = `${statusText(assignment)} · Grade: ${assignment.grade?.percent !== null && assignment.grade?.percent !== undefined ? assignment.grade.percent + '%' : assignment.grade?.label || 'Unavailable'}`;
      item.append(link, context, due, status); list.append(item);
    }
    result.append(list);
  }

  async function refresh(scan = false) {
    if (!active) return;
    const current = ++generation;
    refreshButton.disabled = true;
    try {
      if (scan && scanCurrentPage) await scanCurrentPage();
      const state = await run({ kind: 'state:read' });
      if (active && current === generation) render(state.cache);
    } catch (error) {
      if (active && current === generation) {
        const message = document.createElement('p'); message.className = 'bq-error'; message.setAttribute('role', 'alert');
        message.textContent = error instanceof Error ? error.message : 'Could not read local assignments.';
        result.replaceChildren(message);
      }
    } finally { if (current === generation) refreshButton.disabled = false; }
  }
  refreshButton.addEventListener('click', () => { void refresh(true); });
  return {
    open() {
      active = true;
      if (!stop) {
        try { stop = subscribe(() => { void refresh(); }); } catch { /* Refresh remains available if the worker restarted. */ }
      }
      if (!result.childElementCount) result.textContent = 'Reading saved assignments…';
      void refresh();
    },
    pause() { active = false; generation++; stop?.(); stop = undefined; refreshButton.disabled = false; },
    dispose() { active = false; generation++; stop?.(); stop = undefined; style.remove(); content.remove(); },
  };
}
