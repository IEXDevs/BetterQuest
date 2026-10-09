import type { Course, LocalState } from '../../shared/models';
import { execute, subscribeLocal, type Execute } from '../../shared/client';
import { sourceUrl } from '../../shared/identity';
import { findAssignmentSectionSlot } from '../../adapters/quest/assignment-placement';
import { assignmentPanelData, completionText, displayDeadline, visibleAssignments, type AssignmentScope, type AssignmentView } from './view-model';

export type Subscribe = (callback: () => void) => () => void;
const PAGE_SIZE = 4;

/** Inline course enhancement, not a separate page or overlay. */
export function createAssignmentSection(root: Element, run: Execute = execute, subscribe: Subscribe = subscribeLocal, scanCurrentPage?: () => Promise<void>) {
  const document = root.ownerDocument;
  const host = document.createElement('div');
  host.dataset.betterquest = 'assignment-section';
  host.className = 'card';
  root.querySelectorAll('[data-betterquest="assignment-section"]').forEach(node => node.remove());
  const shadow = host.attachShadow({ mode: 'open' });
  // Keep extension controls out of Quest's delegated UI handlers; native link
  // navigation still works because the default click action is not prevented.
  shadow.addEventListener('click', event => event.stopPropagation());
  shadow.addEventListener('change', event => event.stopPropagation());
  const style = document.createElement('style');
  style.textContent = `
    :host { display:block; margin:0 0 20px; color:#26384a; background:#fff;
      border:1px solid #e3e9ed; border-radius:8px; overflow:hidden; scroll-margin-top:84px;
      box-shadow:0 2px 5px #18334a0a; font-family:inherit; }
    * { box-sizing:border-box; }
    section { font:inherit; font-size:14px; line-height:1.5; }
    header { padding:16px 20px 12px; display:flex; flex-wrap:wrap; justify-content:space-between;
      gap:14px; align-items:center; border-top:3px solid #26a69a; }
    h2 { font:inherit; font-size:18px; font-weight:600; margin:0; color:#243c4e; letter-spacing:-.25px; }
    h2:focus { outline:2px solid #26a69a; outline-offset:4px; border-radius:3px; }
    .subtitle { margin:3px 0 0; color:#71808c; font-size:12px; }
    button,select { font:inherit; }
    button { cursor:pointer; }
    button:disabled { cursor:default; opacity:.45; }
    button:focus-visible,a:focus-visible,select:focus-visible,summary:focus-visible { outline:2px solid #168d83; outline-offset:3px; }
    .tools { display:flex; align-items:center; gap:12px; }
    select { color:#42576a; background:#fff; border:1px solid #dbe3e8; border-radius:5px; padding:6px 9px; font-size:12px; max-width:180px; }
    .refresh,.pager button { border:0; background:transparent; color:#168d83; padding:5px 7px; font-size:12px; border-radius:4px; }
    .refresh:hover,.pager button:hover:not(:disabled) { background:#eff8f6; }
    .filters { display:flex; align-items:center; gap:6px; padding:0 20px 12px; }
    .filters button { border:1px solid transparent; background:transparent; color:#687d8d; border-radius:5px; font-size:12px; padding:5px 10px; }
    .filters button[aria-pressed="true"] { color:#127c73; background:#eaf7f4; border-color:#d8ede7; font-weight:600; }
    .filters span { margin-left:5px; font-size:11px; }
    ul { padding:0; margin:0; list-style:none; }
    .list { border-top:1px solid #edf1f4; }
    .row { display:grid; grid-template-columns:minmax(0,1fr) auto auto; align-items:center; gap:18px; padding:12px 20px; border-bottom:1px solid #edf1f4; }
    .row:last-child { border-bottom:0; }
    .name { min-width:0; }
    .name a { color:#227ab0; font-weight:500; text-decoration:none; display:inline-flex; align-items:center; gap:6px; max-width:100%; }
    .name a:hover { text-decoration:underline; }
    .name a span:first-child { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .course { display:block; color:#7b8994; font-size:11px; margin-top:3px; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
    .deadline { display:flex; flex-direction:column; font-size:12px; align-items:flex-end; white-space:nowrap; }
    .deadline small { color:#7b8994; font-size:11px; }
    .deadline.overdue { color:#b15d39; }
    .status { color:#788995; font-size:11px; border-radius:4px; padding:3px 7px; background:#f3f6f8; white-space:nowrap; }
    .status.done { color:#27836b; background:#edf8f2; }
    .status.progress { color:#8b701b; background:#fbf6e6; }
    .empty,.error { margin:0; padding:17px 20px; color:#6f8190; font-size:13px; border-top:1px solid #edf1f4; }
    .error { color:#a3453c; }
    .footer { padding:10px 20px; border-top:1px solid #edf1f4; display:flex; align-items:flex-start; justify-content:space-between; gap:18px; color:#7b8994; font-size:11px; }
    .coverage { flex:1; min-width:0; }
    .coverage summary { cursor:pointer; width:fit-content; color:#718695; }
    .coverage p { margin:7px 0; max-width:550px; line-height:1.7; }
    .coverage li { padding:3px 0; }
    .coverage li span { margin-left:7px; color:#7b8994; }
    .pager { display:flex; align-items:center; gap:5px; white-space:nowrap; }
    .pager span { margin-right:5px; }
    @media (max-width:600px) {
      header { padding:14px; gap:10px; } h2 { font-size:16px; } .tools { gap:5px; }
      .filters { padding:0 14px 10px; } .row { padding:10px 14px; gap:10px; grid-template-columns:minmax(0,1fr) auto; }
      .status { grid-column:1; grid-row:auto; width:fit-content; } .deadline { grid-column:2; grid-row:1 / span 2; }
      .footer { padding:10px 14px; flex-wrap:wrap; gap:9px; } .coverage { min-width:180px; }
    }
  `;
  const section = document.createElement('section'); section.setAttribute('aria-labelledby', 'bq-upcoming-title');
  const header = document.createElement('header');
  const introduction = document.createElement('div');
  const title = document.createElement('h2'); title.id = 'bq-upcoming-title'; title.tabIndex = -1; title.textContent = 'Upcoming Assignments';
  const subtitle = document.createElement('p'); subtitle.className = 'subtitle'; subtitle.textContent = 'Your next work, right here in Quest.';
  introduction.append(title, subtitle);
  const tools = document.createElement('div'); tools.className = 'tools';
  const scopeSelect = document.createElement('select'); scopeSelect.setAttribute('aria-label', 'Assignment course scope');
  for (const [value, text] of [['course', 'This course'], ['visited', 'All visited courses']]) {
    const option = document.createElement('option'); option.value = value; option.textContent = text; scopeSelect.append(option);
  }
  const refreshButton = document.createElement('button'); refreshButton.className = 'refresh'; refreshButton.type = 'button'; refreshButton.textContent = 'Refresh';
  refreshButton.setAttribute('aria-label', 'Refresh assignments from this Quest page'); tools.append(scopeSelect, refreshButton); header.append(introduction, tools);
  const filters = document.createElement('div'); filters.className = 'filters'; filters.setAttribute('role', 'group'); filters.setAttribute('aria-label', 'Assignment completion');
  const todo = document.createElement('button'); todo.type = 'button';
  const completed = document.createElement('button'); completed.type = 'button';
  filters.append(todo, completed);
  const result = document.createElement('div'); result.setAttribute('aria-live', 'polite');
  const footer = document.createElement('div'); footer.className = 'footer';
  const coverage = document.createElement('details'); coverage.className = 'coverage';
  const coverageSummary = document.createElement('summary');
  const coverageNote = document.createElement('p'); coverageNote.textContent = 'Only visited course pages are included. Other courses are not yet scanned; open each course to collect its assignments. A full course list is not available yet, and cached work may be stale.';
  const courseList = document.createElement('ul'); coverage.append(coverageSummary, coverageNote, courseList);
  const pager = document.createElement('div'); pager.className = 'pager';
  const range = document.createElement('span');
  const previous = document.createElement('button'); previous.type = 'button'; previous.textContent = 'Previous'; previous.setAttribute('aria-label', 'Previous assignments');
  const next = document.createElement('button'); next.type = 'button'; next.textContent = 'Next'; next.setAttribute('aria-label', 'Next assignments');
  pager.append(range, previous, next); footer.append(coverage, pager);
  section.append(header, filters, result, footer); shadow.append(style, section);
  let cache: LocalState['cache'] | undefined;
  let course: Course | undefined;
  let scope: AssignmentScope = 'course';
  let view: AssignmentView = 'todo';
  let page = 0;
  let disposed = false;
  let generation = 0;
  let lastRendered = '';
  let unsubscribe: (() => void) | undefined;

  function position(): boolean {
    const slot = findAssignmentSectionSlot(document);
    if (!slot || slot.root !== root) { host.remove(); return false; }
    if (host.parentElement !== root || host.nextSibling !== slot.before) root.insertBefore(host, slot.before);
    return true;
  }

  function render() {
    if (!cache || !course || disposed) return;
    const focusedAssignment = shadow.activeElement?.closest('[data-assignment-id]')?.getAttribute('data-assignment-id');
    const data = assignmentPanelData(cache);
    const pending = visibleAssignments(cache, course.id, scope, 'todo');
    const finished = visibleAssignments(cache, course.id, scope, 'completed');
    todo.textContent = `To Do (${pending.length})`; todo.setAttribute('aria-pressed', String(view === 'todo'));
    completed.textContent = `Completed (${finished.length})`; completed.setAttribute('aria-pressed', String(view === 'completed'));
    title.textContent = view === 'todo' ? 'Upcoming Assignments' : 'Completed Assignments';
    subtitle.textContent = scope === 'course' ? course.title : 'Across your visited courses';
    const rows = view === 'todo' ? pending : finished;
    page = Math.min(page, Math.max(0, Math.ceil(rows.length / PAGE_SIZE) - 1));
    result.replaceChildren();
    if (!rows.length) {
      const message = document.createElement('p'); message.className = 'empty';
      const current = data.courses.find(summary => summary.course.id === course!.id);
      message.textContent = scope === 'course' && !current?.scanned ? 'Waiting for this course’s assignment tables. Collected work will appear as they load.' :
        view === 'todo' ? 'No incomplete assignments in the collected rows. Completed work is available separately.' : 'No completed assignments in the collected rows.';
      result.append(message);
    } else {
      const list = document.createElement('ul'); list.className = 'list';
      for (const assignment of rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)) {
        const row = document.createElement('li'); row.className = 'row'; row.dataset.assignmentId = assignment.id;
        const name = document.createElement('div'); name.className = 'name';
        const link = document.createElement('a'); link.href = sourceUrl(assignment.url);
        const text = document.createElement('span'); text.textContent = assignment.title;
        const arrow = document.createElement('span'); arrow.textContent = '↗'; arrow.setAttribute('aria-hidden', 'true'); link.append(text, arrow);
        const context = document.createElement('span'); context.className = 'course'; context.textContent = cache.courses.find(c => c.id === assignment.courseId)?.title || 'Course unavailable'; context.title = context.textContent;
        name.append(link, context);
        const due = displayDeadline(assignment);
        const deadline = document.createElement('div'); deadline.className = 'deadline' + (due.overdue ? ' overdue' : '');
        deadline.title = assignment.deadline.label || assignment.deadline.iso || 'No verified deadline';
        const date = document.createElement('time'); if (assignment.deadline.iso) date.dateTime = assignment.deadline.iso;
        date.textContent = (due.overdue ? 'Overdue · ' : '') + due.date;
        const time = document.createElement('small'); time.textContent = due.time; deadline.append(date, time);
        const status = document.createElement('span'); status.className = 'status' + (assignment.completion === 'completed' ? ' done' : assignment.completion === 'in-progress' ? ' progress' : ''); status.textContent = completionText(assignment);
        row.append(name, deadline, status); list.append(row);
      }
      result.append(list);
    }
    const observed = data.courses.filter(summary => summary.scanned).length;
    const unscanned = data.courses.filter(summary => !summary.scanned).length;
    coverageSummary.textContent = `${observed} course${observed === 1 ? '' : 's'} observed${unscanned ? ` · ${unscanned} not scanned` : ''} · Visited pages only`;
    courseList.replaceChildren();
    for (const summary of data.courses) {
      const item = document.createElement('li'); item.textContent = summary.course.title;
      const state = document.createElement('span'); state.textContent = summary.scanned ? 'Observed' : 'Not scanned yet';
      if (summary.observedAt) state.title = `Last observed: ${new Date(summary.observedAt).toLocaleString()}`;
      item.append(state); courseList.append(item);
    }
    pager.hidden = rows.length <= PAGE_SIZE;
    range.textContent = rows.length ? `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, rows.length)} of ${rows.length}` : '';
    previous.disabled = page === 0; next.disabled = (page + 1) * PAGE_SIZE >= rows.length;
    if (focusedAssignment) {
      const link = [...result.querySelectorAll<HTMLAnchorElement>('a')].find(a => a.closest('[data-assignment-id]')?.getAttribute('data-assignment-id') === focusedAssignment);
      link?.focus({ preventScroll: true });
    }
  }

  async function refresh(scan = false) {
    if (disposed || !position()) return;
    const current = ++generation; refreshButton.disabled = true;
    try {
      if (scan && scanCurrentPage) await scanCurrentPage();
      const state = await run({ kind: 'state:read' });
      if (disposed || current !== generation) return;
      const signature = JSON.stringify({ cache: state.cache, course });
      cache = state.cache;
      if (signature !== lastRendered) { render(); lastRendered = signature; }
    } catch (error) {
      if (!disposed && current === generation) {
        const message = document.createElement('p'); message.className = 'error'; message.setAttribute('role', 'alert');
        message.textContent = error instanceof Error ? error.message : 'Assignments could not be loaded. Try Refresh.';
        result.replaceChildren(message);
        lastRendered = '';
      }
    } finally { if (current === generation) refreshButton.disabled = false; }
  }
  todo.addEventListener('click', () => { view = 'todo'; page = 0; render(); });
  completed.addEventListener('click', () => { view = 'completed'; page = 0; render(); });
  scopeSelect.addEventListener('change', () => { scope = scopeSelect.value as AssignmentScope; page = 0; render(); });
  previous.addEventListener('click', () => { page--; render(); }); next.addEventListener('click', () => { page++; render(); });
  refreshButton.addEventListener('click', () => { void refresh(true); });
  position();
  todo.textContent = 'To Do'; todo.setAttribute('aria-pressed', 'true'); completed.textContent = 'Completed'; completed.setAttribute('aria-pressed', 'false');
  coverageSummary.textContent = 'Course coverage';
  pager.hidden = true;
  const loading = document.createElement('p'); loading.className = 'empty'; loading.textContent = 'Reading collected assignments…'; result.append(loading);
  try { unsubscribe = subscribe(() => { void refresh(); }); } catch { /* Refresh still works if the worker is restarting. */ }
  return {
    refresh(currentCourse: Course) { course = currentCourse; return refresh(); },
    focus() { if (!position() || disposed) return false; host.scrollIntoView?.({ block: 'start', behavior: 'smooth' }); title.focus({ preventScroll: true }); return true; },
    isConnected: () => host.isConnected && !disposed,
    dispose() { disposed = true; generation++; unsubscribe?.(); host.remove(); },
  };
}
