import type { Course, LocalState } from '../../shared/models';
import { execute, subscribeLocal, type Execute } from '../../shared/client';
import { sourceUrl } from '../../shared/identity';
import { findAssignmentSectionSlot } from '../../adapters/quest/assignment-placement';
import { assignmentPanelData, displayDeadline, visibleAssignments } from './view-model';

export type Subscribe = (callback: () => void) => () => void;
const PREVIEW_SIZE = 3;

/** Compact summary inside Quest's existing empty course-info column. */
export function createAssignmentSection(root: Element, run: Execute = execute, subscribe: Subscribe = subscribeLocal) {
  const document = root.ownerDocument;
  const host = document.createElement('div');
  host.dataset.betterquest = 'assignment-section';
  // Remove the old standalone tracker or an orphaned prior injection.
  root.querySelectorAll('[data-betterquest="assignment-section"]').forEach(node => node.remove());
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.addEventListener('click', event => event.stopPropagation());
  const style = document.createElement('style');
  style.textContent = `
    :host { display:block; color:inherit; font-family:inherit; scroll-margin-top:84px; }
    * { box-sizing:border-box; }
    section { font:inherit; font-size:13px; line-height:1.4; text-align:left; }
    h2 { font:inherit; font-size:14px; font-weight:500; margin:0 0 6px; color:var(--bq-text,#42576a); }
    h2:focus-visible,a:focus-visible { outline:2px solid var(--bq-accent,#168d83); outline-offset:3px; }
    ul { list-style:none; margin:0; padding:0; }
    li { padding:4px 0; }
    .assignment-link { display:block; color:var(--bq-accent,#227ab0); text-decoration:none; overflow:hidden;
      white-space:nowrap; text-overflow:ellipsis; font-weight:500; }
    a:hover { text-decoration:underline; }
    .deadline { display:block; color:var(--bq-muted,#748491); font-size:11px; margin-top:1px; }
    .overdue { color:var(--bq-warning,#a96645); }
    .footer { display:flex; align-items:center; flex-wrap:wrap; gap:4px 9px; margin-top:7px; font-size:11px; }
    .view-all { color:var(--bq-accent,#227ab0); text-decoration:none; white-space:nowrap; }
    .note { color:var(--bq-muted,#84909a); font-size:10px; }
    .empty,.error { margin:5px 0; color:var(--bq-muted,#748491); font-size:12px; }
    .error { color:var(--bq-warning,#a3453c); }
  `;
  const section = document.createElement('section');
  section.setAttribute('aria-labelledby', 'bq-upcoming-title');
  const title = document.createElement('h2');
  title.id = 'bq-upcoming-title'; title.tabIndex = -1; title.textContent = 'Upcoming Assignments';
  const result = document.createElement('div'); result.setAttribute('aria-live', 'polite');
  const footer = document.createElement('div'); footer.className = 'footer';
  const viewAll = document.createElement('a');
  viewAll.className = 'view-all'; viewAll.href = '#tabs-elements'; viewAll.textContent = 'View all →';
  viewAll.setAttribute('aria-label', 'View all course assignments in Quest');
  const note = document.createElement('span'); note.className = 'note';
  note.textContent = 'Course data only'; note.title = 'Other courses are not yet scanned automatically. Cached assignments may be stale.';
  footer.append(viewAll, note); section.append(title, result, footer); shadow.append(style, section);
  let course: Course | undefined;
  let disposed = false;
  let generation = 0;
  let lastRendered = '';
  let unsubscribe: (() => void) | undefined;

  function position(): boolean {
    const slot = findAssignmentSectionSlot(document);
    if (!slot || slot.root !== root) { host.remove(); return false; }
    if (host.parentElement !== slot.column) slot.column.append(host);
    return true;
  }

  function render(cache: LocalState['cache']) {
    if (!course || disposed) return;
    const focusedId = shadow.activeElement?.closest('[data-assignment-id]')?.getAttribute('data-assignment-id');
    const data = assignmentPanelData(cache);
    // Unknown status isn't evidence of incompletion; it stays in the native full list.
    const pending = visibleAssignments(cache, course.id, 'course', 'todo').filter(assignment => assignment.completion !== 'unknown');
    const observed = data.courses.find(summary => summary.course.id === course!.id)?.scanned;
    result.replaceChildren();
    if (!pending.length) {
      const empty = document.createElement('p'); empty.className = 'empty';
      empty.textContent = observed ? 'No incomplete assignments in collected rows.' : 'Waiting for assignment tables…';
      result.append(empty);
    } else {
      const list = document.createElement('ul'); list.className = 'list';
      for (const assignment of pending.slice(0, PREVIEW_SIZE)) {
        const row = document.createElement('li'); row.className = 'row'; row.dataset.assignmentId = assignment.id;
        const link = document.createElement('a'); link.className = 'assignment-link';
        link.href = sourceUrl(assignment.url); link.textContent = assignment.title; link.title = assignment.title;
        const due = displayDeadline(assignment);
        const deadline = document.createElement('time');
        deadline.className = 'deadline' + (due.overdue ? ' overdue' : '');
        if (assignment.deadline.iso) deadline.dateTime = assignment.deadline.iso;
        deadline.textContent = (due.overdue ? 'Overdue · ' : '') + due.date + ' · ' + due.time;
        deadline.title = assignment.deadline.label || assignment.deadline.iso || 'No verified deadline';
        row.append(link, deadline); list.append(row);
      }
      result.append(list);
    }
    note.textContent = !observed ? 'Not scanned yet' : pending.length > PREVIEW_SIZE ? `${pending.length} incomplete · Course data only` : 'Course data only';
    if (focusedId) {
      [...result.querySelectorAll<HTMLAnchorElement>('a')].find(link => link.closest('[data-assignment-id]')?.getAttribute('data-assignment-id') === focusedId)?.focus({ preventScroll: true });
    }
  }

  async function refresh() {
    if (disposed || !position()) return;
    const current = ++generation;
    try {
      const state = await run({ kind: 'state:read' });
      if (disposed || current !== generation) return;
      const signature = JSON.stringify({ cache: state.cache, course });
      if (signature !== lastRendered) { render(state.cache); lastRendered = signature; }
    } catch (error) {
      if (!disposed && current === generation) {
        const message = document.createElement('p'); message.className = 'error'; message.setAttribute('role', 'alert');
        message.textContent = error instanceof Error ? error.message : 'Assignments could not be loaded.';
        result.replaceChildren(message); lastRendered = '';
      }
    }
  }

  viewAll.addEventListener('click', event => {
    const nativeTab = root.querySelector<HTMLAnchorElement>('#student-elements-a');
    const nativeAssignments = root.querySelector<HTMLElement>('#tabs-elements');
    if (!nativeTab || !nativeAssignments) return;
    event.preventDefault();
    nativeTab.click(); // Keep Quest's original tab/loading behavior.
    nativeAssignments.scrollIntoView?.({ block: 'start' });
  });
  position();
  const loading = document.createElement('p'); loading.className = 'empty'; loading.textContent = 'Reading assignments…';
  result.append(loading);
  try { unsubscribe = subscribe(() => { void refresh(); }); } catch { /* DOM changes can still refresh the summary. */ }
  return {
    refresh(currentCourse: Course) { course = currentCourse; return refresh(); },
    focus() {
      if (disposed || !position()) return false;
      // Respect the native collapse; never force the course info open.
      const info = host.closest<HTMLElement>('#student-course-info-header');
      if (info && document.defaultView?.getComputedStyle(info).display === 'none') return false;
      host.scrollIntoView?.({ block: 'start' }); title.focus({ preventScroll: true }); return true;
    },
    isConnected: () => host.isConnected && !disposed,
    dispose() { disposed = true; generation++; unsubscribe?.(); host.remove(); },
  };
}
