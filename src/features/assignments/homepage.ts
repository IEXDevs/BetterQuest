import type { Course, LocalState } from '../../shared/models';
import { findHomepageSlot, readHomepageCourses } from '../../adapters/quest/homepage';
import { execute, commandErrorMessage, isContextInvalidated, type Execute } from '../../shared/client';
import type { Subscribe } from './section';
import { assignmentIsCompleted, completionText, displayDeadline, type CompletionOverrides } from './view-model';

function canonical(value: string) { const url = new URL(value); url.hash = ''; url.searchParams.sort(); return url.href; }

/** Only assignment IDs observed on the exact current course URL count as coverage. */
export function homepageOverview(courses: Course[], cache: LocalState['cache'], overrides: CompletionOverrides = {}) {
  const summaries = courses.map(course => {
    const page = cache.pages.filter(page => page.courseIds.includes(course.id) && canonical(page.sourceUrl) === canonical(course.url))
      .sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt))[0];
    const scanned = Boolean(page?.scannedCourseIds?.includes(course.id));
    const ids = new Set(scanned ? page!.assignmentIds : []);
    const assignments = cache.assignments.filter(a => a.courseId === course.id && ids.has(a.id));
    return { course, scanned, assignments, observedAt: scanned ? page!.observedAt : null };
  });
  const assignments = summaries.flatMap(summary => summary.assignments);
  const completed = assignments.filter(a => assignmentIsCompleted(a, overrides)).length;
  const pending = assignments.filter(a => !assignmentIsCompleted(a, overrides) && a.completion !== 'unknown')
    .sort((a, b) => ((a.deadline.iso ? Date.parse(a.deadline.iso) : Infinity) - (b.deadline.iso ? Date.parse(b.deadline.iso) : Infinity)) || a.title.localeCompare(b.title));
  return { summaries, completed, total: assignments.length, unknown: assignments.filter(a => a.completion === 'unknown').length,
    observed: summaries.filter(s => s.scanned).length, pending };
}

export function createHomepageOverview(root: Element, run: Execute = execute, subscribe?: Subscribe) {
  const document = root.ownerDocument;
  root.querySelectorAll('[data-betterquest="homepage-overview"]').forEach(node => node.remove());
  const host = document.createElement('div'); host.dataset.betterquest = 'homepage-overview';
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.addEventListener('click', event => event.stopPropagation());
  const style = document.createElement('style');
  style.textContent = `
    :host{display:block;margin:22px 0;scroll-margin-top:80px;font-family:inherit}
    *{box-sizing:border-box}section{padding:22px;background:var(--bq-surface,#fff);color:var(--bq-text,#26384a);border:1px solid var(--bq-border,#e1e7ed);border-radius:8px;font-size:14px;line-height:1.5}
    header{display:flex;align-items:center;justify-content:space-between;gap:18px}h2{font:inherit;font-weight:600;font-size:20px;margin:0}h2:focus-visible{outline:2px solid var(--bq-accent,#227ab0);outline-offset:4px}
    .coverage,.caption{color:var(--bq-muted,#748491);font-size:12px;margin:8px 0}.progress-label{display:flex;justify-content:space-between;gap:12px;margin-top:16px;font-size:13px}
    .meter{height:8px;margin:8px 0;border-radius:5px;overflow:hidden;background:var(--bq-raised,#eef3f6);position:relative}
    .meter span{display:block;height:100%;width:0;border-radius:inherit;background:linear-gradient(90deg,var(--bq-good,#26a69a),#5eead4,var(--bq-good,#26a69a));background-size:200% 100%;animation:bq-flow 3s linear infinite;transition:width .25s ease}
    .meter span::after{content:'';position:absolute;inset:0;background:linear-gradient(100deg,transparent 20%,#ffffff70 50%,transparent 80%);transform:translateX(-100%);animation:bq-sheen 3.5s ease-in-out infinite}
    .meter:hover{box-shadow:0 0 0 3px color-mix(in srgb,var(--bq-good,#26a69a) 25%,transparent)}
    .meter:hover span{animation-duration:1s}
    @keyframes bq-flow{to{background-position:-200% 0}}
    @keyframes bq-sheen{0%{transform:translateX(-100%)}60%,100%{transform:translateX(100%)}}
    @media(prefers-reduced-motion:reduce){.meter span,.meter span::after{animation:none;transition:none}}
    .grid{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(240px,1fr);gap:24px;margin-top:22px}h3{font:inherit;font-weight:600;margin:0 0 10px}
    ul{list-style:none;margin:0;padding:0}li{padding:10px 0;border-top:1px solid var(--bq-border,#edf1f4)}.assignment{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:12px;align-items:center}
    .assignment-actions{display:flex;align-items:center}
    .mark-done-btn{display:inline-flex;align-items:center;gap:4px;padding:4px 9px;border:1px solid var(--bq-border,#cbd7e3);border-radius:6px;background:var(--bq-surface,#fff);color:var(--bq-muted,#607286);font:600 11px/1.1 inherit;cursor:pointer;transition:all .18s ease;white-space:nowrap}
    .mark-done-btn:hover{border-color:var(--bq-good,#287f68);color:var(--bq-good,#287f68);background:color-mix(in srgb,var(--bq-good,#287f68) 8%,var(--bq-surface,#fff))}
    .mark-done-btn.is-done{background:color-mix(in srgb,var(--bq-good,#287f68) 16%,var(--bq-surface,#fff));border-color:var(--bq-good,#287f68);color:var(--bq-good,#287f68)}
    .mark-done-btn svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
    .manual-toggle-btn{display:inline-block;margin-top:10px;font-size:12px;color:var(--bq-accent,#227ab0);background:none;border:none;cursor:pointer;padding:4px 0;text-decoration:none}
    .manual-toggle-btn:hover{text-decoration:underline}
    .manual-list{list-style:none;margin:8px 0 0;padding:0;border-top:1px dashed var(--bq-border,#cbd7e3)}
    a{color:var(--bq-accent,#227ab0);text-decoration:none}a:hover{text-decoration:underline}a:focus-visible,button:focus-visible{outline:2px solid var(--bq-accent,#227ab0);outline-offset:3px}
    .meta{display:block;font-size:12px;color:var(--bq-muted,#748491);margin-top:3px}.due{text-align:right;font-size:12px;white-space:nowrap}.due small{display:block;color:var(--bq-muted,#748491)}.overdue{color:var(--bq-warning,#a96645)}
    .course-title{font-weight:500}.unscanned{color:var(--bq-warning,#a96645)}button{font:inherit;font-size:12px;cursor:pointer;border:0;color:var(--bq-accent,#227ab0);background:transparent;padding:6px 0}.reload-btn{padding:0;font-weight:600;text-decoration:underline;white-space:nowrap}.empty{color:var(--bq-muted,#748491);font-size:13px}.error{color:var(--bq-warning,#a3453c)}
    @media(max-width:750px){section{padding:16px}.grid{grid-template-columns:1fr;gap:18px}header{align-items:flex-start;flex-direction:column;gap:5px}.progress-label{flex-wrap:wrap}.assignment{gap:10px}}
  `;
  const section = document.createElement('section'); section.setAttribute('aria-labelledby', 'bq-home-title');
  const heading = document.createElement('h2'); heading.id = 'bq-home-title'; heading.tabIndex = -1; heading.textContent = 'Your assignments';
  const content = document.createElement('div'); content.setAttribute('aria-live', 'polite');
  section.append(heading, content); shadow.append(style, section);
  let disposed = false, generation = 0, fingerprint = '', lastRender = '', limit = 5, showCompletedManual = false;
  let courses: Course[] = [], cache: LocalState['cache'] | undefined, overrides: CompletionOverrides = {};
  let stop: (() => void) | undefined;
  function position() {
    const slot = findHomepageSlot(document);
    if (!slot || slot.root !== root) { host.remove(); return false; }
    if (slot.wrapper.nextSibling !== host) slot.wrapper.after(host);
    return true;
  }
  function render() {
    if (!cache || disposed) return;
    const data = homepageOverview(courses, cache, overrides); content.className = ''; content.replaceChildren();
    const coverage = document.createElement('p'); coverage.className = 'coverage';
    coverage.textContent = `${data.observed} of ${courses.length} courses synced`;
    const label = document.createElement('div'); label.className = 'progress-label';
    const progressText = document.createElement('span'); progressText.textContent = `${data.completed} of ${data.total} assignments completed`;
    const percent = document.createElement('span'); percent.textContent = data.total ? `${Math.round(data.completed / data.total * 100)}% complete` : 'No assignments yet';
    label.append(progressText, percent);
    const progress = document.createElement('div'); progress.className = 'meter';
    progress.setAttribute('role', 'progressbar');
    progress.setAttribute('aria-label', 'Assignment completion progress');
    progress.setAttribute('aria-valuemin', '0');
    progress.setAttribute('aria-valuemax', String(Math.max(1, data.total)));
    progress.setAttribute('aria-valuenow', String(data.completed));
    progress.setAttribute('aria-valuetext', progressText.textContent!);
    const progressFill = document.createElement('span');
    progressFill.style.width = data.total ? `${data.completed / data.total * 100}%` : '0%';
    progress.append(progressFill);
    const caption = document.createElement('p'); caption.className = 'caption';
    caption.textContent = 'Open any unscanned courses to sync their assignments.' + (data.unknown ? ` (${data.unknown} statuses unknown)` : '');
    const grid = document.createElement('div'); grid.className = 'grid';
    const upcoming = document.createElement('div'); const upcomingTitle = document.createElement('h3'); upcomingTitle.textContent = 'Upcoming assignments'; upcoming.append(upcomingTitle);
    const list = document.createElement('ul');
    for (const assignment of data.pending.slice(0, limit)) {
      const row = document.createElement('li'); row.className = 'assignment';
      const info = document.createElement('div'); const link = document.createElement('a'); link.href = assignment.url; link.textContent = assignment.title;
      const meta = document.createElement('span'); meta.className = 'meta'; meta.textContent = `${courses.find(c => c.id === assignment.courseId)?.title || ''} · ${completionText(assignment, overrides)}`;
      info.append(link, meta); const due = displayDeadline(assignment, Date.now(), overrides);
      const date = document.createElement('div'); date.className = 'due' + (due.overdue ? ' overdue' : ''); date.textContent = (due.overdue ? 'Overdue · ' : '') + due.date;
      const time = document.createElement('small'); time.textContent = due.time; date.append(time);
      const actions = document.createElement('div'); actions.className = 'assignment-actions';
      const markBtn = document.createElement('button');
      markBtn.type = 'button';
      markBtn.className = 'mark-done-btn';
      markBtn.title = 'Mark complete';
      markBtn.setAttribute('aria-label', `Mark ${assignment.title} complete`);
      markBtn.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7"/></svg><span>Mark done</span>';
      markBtn.onclick = async (e) => {
        e.preventDefault(); e.stopPropagation();
        markBtn.disabled = true;
        try {
          await run({ kind: 'assignment:completion:set', assignmentId: assignment.id, completed: true });
          await refresh();
        } catch {
          markBtn.disabled = false;
        }
      };
      actions.append(markBtn);
      row.append(info, date, actions); list.append(row);
    }
    upcoming.append(list);
    const manualDone = data.summaries.flatMap(s => s.assignments).filter(a => overrides?.[a.id] === true);
    if (manualDone.length > 0) {
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'manual-toggle-btn';
      toggle.textContent = showCompletedManual ? `Hide manually completed (${manualDone.length})` : `Show manually completed (${manualDone.length})`;
      toggle.onclick = () => { showCompletedManual = !showCompletedManual; render(); };
      upcoming.append(toggle);

      if (showCompletedManual) {
        const mList = document.createElement('ul');
        mList.className = 'manual-list';
        for (const assignment of manualDone) {
          const mRow = document.createElement('li'); mRow.className = 'assignment';
          const mInfo = document.createElement('div'); const mLink = document.createElement('a'); mLink.href = assignment.url; mLink.textContent = assignment.title;
          const mMeta = document.createElement('span'); mMeta.className = 'meta';
          mMeta.textContent = `${courses.find(c => c.id === assignment.courseId)?.title || ''} · Completed manually`;
          mInfo.append(mLink, mMeta);
          const mDue = displayDeadline(assignment, Date.now(), overrides);
          const mDate = document.createElement('div'); mDate.className = 'due'; mDate.textContent = mDue.date;
          const mTime = document.createElement('small'); mTime.textContent = mDue.time; mDate.append(mTime);
          const mActions = document.createElement('div'); mActions.className = 'assignment-actions';
          const undoBtn = document.createElement('button');
          undoBtn.type = 'button';
          undoBtn.className = 'mark-done-btn is-done';
          undoBtn.title = 'Marked complete. Click to undo.';
          undoBtn.setAttribute('aria-label', `Mark ${assignment.title} incomplete`);
          undoBtn.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m4 10 4 4 8-9"/></svg><span>Done</span>';
          undoBtn.onclick = async (e) => {
            e.preventDefault(); e.stopPropagation();
            undoBtn.disabled = true;
            try {
              await run({ kind: 'assignment:completion:set', assignmentId: assignment.id, completed: false });
              await refresh();
            } catch {
              undoBtn.disabled = false;
            }
          };
          mActions.append(undoBtn);
          mRow.append(mInfo, mDate, mActions);
          mList.append(mRow);
        }
        upcoming.append(mList);
      }
    }
    if (!data.pending.length) { const empty = document.createElement('p'); empty.className = 'empty'; empty.textContent = data.observed ? 'All caught up! No incomplete assignments.' : 'Open a course to see upcoming assignments here.'; upcoming.append(empty); }
    if (data.pending.length > limit) { const more = document.createElement('button'); more.type = 'button'; more.textContent = `Show more (${data.pending.length - limit})`; more.onclick = () => { limit += 5; render(); }; upcoming.append(more); }
    const summary = document.createElement('div'); const summaryTitle = document.createElement('h3'); summaryTitle.textContent = 'Your courses'; summary.append(summaryTitle);
    const courseList = document.createElement('ul');
    for (const item of data.summaries) {
      const row = document.createElement('li'); const link = document.createElement('a'); link.className = 'course-title'; link.href = item.course.url; link.textContent = item.course.title;
      const status = document.createElement('span'); status.className = 'meta' + (!item.scanned ? ' unscanned' : '');
      status.textContent = item.scanned ? `${item.assignments.filter(a => assignmentIsCompleted(a, overrides)).length} of ${item.assignments.length} completed` : 'Not synced yet — open this course to sync';
      if (item.observedAt) status.title = `Last synced: ${new Date(item.observedAt).toLocaleString()}`;
      row.append(link, status); courseList.append(row);
    }
    summary.append(courseList); grid.append(upcoming, summary); content.append(coverage, label, progress, caption, grid);
  }
  async function refresh() {
    if (disposed || !position()) return;
    const current = ++generation;
    try {
      const discovered = readHomepageCourses(document);
      const signature = JSON.stringify(discovered);
      if (signature !== fingerprint) {
        const previous = fingerprint; fingerprint = signature;
        try { await run({ kind: 'assignments:cache', snapshot: { sourceUrl: document.URL, observedAt: new Date().toISOString(), courses: discovered, assignments: [], scannedCourseIds: [] } }); }
        catch (error) { if (fingerprint === signature) fingerprint = previous; throw error; }
        if (disposed || current !== generation) return;
      }
      const state = await run({ kind: 'state:read' });
      if (disposed || current !== generation) return;
      courses = discovered; cache = state.cache; overrides = state.completionOverrides || {};
      const renderKey = JSON.stringify({ courses, cache, overrides }); if (renderKey !== lastRender) { render(); lastRender = renderKey; }
    } catch (error) {
      if (!disposed && current === generation) {
        lastRender = ''; content.className = 'error'; content.replaceChildren();
        const message = document.createElement('span');
        message.textContent = commandErrorMessage(error);
        content.append(message);
        if (isContextInvalidated()) {
          const reload = document.createElement('button');
          reload.type = 'button'; reload.className = 'reload-btn'; reload.textContent = 'Reload page';
          reload.addEventListener('click', () => document.defaultView?.location.reload());
          content.append(document.createTextNode(' '), reload);
        }
      }
    }
  }
  position(); content.textContent = 'Loading assignments…';
  if (subscribe) { try { stop = subscribe(() => { void refresh(); }); } catch { /* DOM refreshes can still update the overview. */ } }
  return { refresh, focus: () => { if (!position()) return false; host.scrollIntoView?.({ block: 'start' }); heading.focus({ preventScroll: true }); return true; }, dispose: () => { disposed = true; generation++; stop?.(); host.remove(); } };
}
