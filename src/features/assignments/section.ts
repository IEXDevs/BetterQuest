import type { Course, LocalState } from '../../shared/models';
import { execute, subscribeLocal, commandErrorMessage, isContextInvalidated, type Execute } from '../../shared/client';
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
    :host { display:block; color:inherit; font-family:inherit; scroll-margin-top:84px; width:100%; }
    * { box-sizing:border-box; }
    section { font:inherit; font-size:13px; line-height:1.4; text-align:left; width:100%; }
    h2 { font:inherit; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; margin:0 0 8px; color:var(--bq-muted,#64748b); line-height:1.2; }
    h2:focus-visible,a:focus-visible { outline:2px solid var(--bq-accent,#0284c7); outline-offset:3px; }
    ul { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:6px; }
    li { padding:0 0 6px; border-bottom:1px solid var(--bq-border, rgba(148,163,184,0.18)); }
    li:last-child { border-bottom:none; padding-bottom:2px; }
    .assignment-link { display:block; color:var(--bq-accent,#0284c7); text-decoration:none; overflow:hidden;
      white-space:nowrap; text-overflow:ellipsis; font-size:13.5px; font-weight:600; line-height:1.3; transition:color .15s ease; }
    a.assignment-link:hover { color:#38bdf8; text-decoration:underline; }
    .deadline { display:inline-flex; align-items:center; color:var(--bq-muted,#64748b); font-size:11.5px; font-weight:500; white-space:nowrap; }
    .overdue { color:var(--bq-warning,#ef4444); font-weight:600; }
    .meta-row { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-top:4px; }
    .section-mark-btn { display:inline-flex; align-items:center; gap:4px; padding:3px 8px; border:1px solid var(--bq-border,#cbd7e3); border-radius:5px; background:var(--bq-surface,#fff); color:var(--bq-muted,#64748b); font:600 11px/1.2 inherit; cursor:pointer; transition:all .18s ease; flex-shrink:0; }
    .section-mark-btn:hover { border-color:var(--bq-good,#10b981); color:var(--bq-good,#10b981); background:rgba(16,185,129,0.06); }
    .section-mark-btn svg { width:11px; height:11px; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }
    .footer { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:6px 12px; margin-top:8px; padding-top:6px; border-top:1px solid var(--bq-border, rgba(148,163,184,0.18)); font-size:11.5px; }
    .view-all { color:var(--bq-accent,#0284c7); text-decoration:none; font-weight:600; white-space:nowrap; }
    .view-all:hover { text-decoration:underline; }
    .note { color:var(--bq-muted,#94a3b8); font-size:10.5px; }
    .empty,.error { margin:6px 0; color:var(--bq-muted,#64748b); font-size:12.5px; }
    .error { color:var(--bq-warning,#ef4444); }
    .reload-btn { background:none; border:0; padding:0; color:var(--bq-accent,#0284c7); font:inherit; font-weight:600; text-decoration:underline; cursor:pointer; white-space:nowrap; }
    .reload-btn:focus-visible { outline:2px solid var(--bq-accent,#0284c7); outline-offset:3px; }
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

  function render(state: LocalState) {
    if (!course || disposed) return;
    const focusedId = shadow.activeElement?.closest('[data-assignment-id]')?.getAttribute('data-assignment-id');
    const data = assignmentPanelData(state.cache);
    // Unknown status isn't evidence of incompletion; it stays in the native full list.
    const pending = visibleAssignments(state.cache, course.id, 'course', 'todo', state.completionOverrides).filter(assignment => assignment.completion !== 'unknown');
    const observed = data.courses.find(summary => summary.course.id === course!.id)?.scanned;
    result.replaceChildren();
    if (!pending.length) {
      const empty = document.createElement('p'); empty.className = 'empty';
      empty.textContent = observed ? 'All caught up! No incomplete assignments.' : 'Loading assignments…';
      result.append(empty);
    } else {
      const list = document.createElement('ul'); list.className = 'list';
      for (const assignment of pending.slice(0, PREVIEW_SIZE)) {
        const row = document.createElement('li'); row.className = 'row'; row.dataset.assignmentId = assignment.id;
        const link = document.createElement('a'); link.className = 'assignment-link';
        link.href = sourceUrl(assignment.url); link.textContent = assignment.title; link.title = assignment.title;
        const due = displayDeadline(assignment, Date.now(), state.completionOverrides);
        const deadline = document.createElement('time');
        deadline.className = 'deadline' + (due.overdue ? ' overdue' : '');
        if (assignment.deadline.iso) deadline.dateTime = assignment.deadline.iso;
        deadline.textContent = (due.overdue ? 'Overdue · ' : '') + due.date + ' · ' + due.time;
        deadline.title = assignment.deadline.label || assignment.deadline.iso || 'No deadline listed';
        const metaRow = document.createElement('div');
        metaRow.className = 'meta-row';
        const markBtn = document.createElement('button');
        markBtn.type = 'button';
        markBtn.className = 'section-mark-btn';
        markBtn.title = 'Mark complete';
        markBtn.setAttribute('aria-label', `Mark ${assignment.title} complete`);
        markBtn.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7"/></svg><span>Mark done</span>';
        markBtn.onclick = async (e) => {
          e.preventDefault(); e.stopPropagation();
          markBtn.disabled = true;
          try {
            await run({ kind: 'assignment:completion:set', assignmentId: assignment.id, completed: true });
          } catch {
            markBtn.disabled = false;
          }
        };
        metaRow.append(deadline, markBtn);
        row.append(link, metaRow); list.append(row);
      }
      result.append(list);
    }
    note.textContent = !observed ? 'Not synced yet' : pending.length > PREVIEW_SIZE ? `${pending.length} more remaining` : '';
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
      const signature = JSON.stringify({ cache: state.cache, completionOverrides: state.completionOverrides, course });
      if (signature !== lastRendered) { render(state); lastRendered = signature; }
    } catch (error) {
      if (!disposed && current === generation) {
        const message = document.createElement('p'); message.className = 'error'; message.setAttribute('role', 'alert');
        message.textContent = commandErrorMessage(error);
        if (isContextInvalidated()) {
          const reload = document.createElement('button');
          reload.type = 'button'; reload.className = 'reload-btn'; reload.textContent = 'Reload page';
          reload.addEventListener('click', () => document.defaultView?.location.reload());
          message.append(document.createTextNode(' '), reload);
        }
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
  const loading = document.createElement('p'); loading.className = 'empty'; loading.textContent = 'Loading assignments…';
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
