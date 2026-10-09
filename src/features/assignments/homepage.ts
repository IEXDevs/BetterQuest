import type { Course, LocalState } from '../../shared/models';
import { findHomepageSlot, readHomepageCourses } from '../../adapters/quest/homepage';
import { execute, type Execute } from '../../shared/client';
import type { Subscribe } from './section';
import { completionText, displayDeadline } from './view-model';

function canonical(value: string) { const url = new URL(value); url.hash = ''; url.searchParams.sort(); return url.href; }

/** Only assignment IDs observed on the exact current course URL count as coverage. */
export function homepageOverview(courses: Course[], cache: LocalState['cache']) {
  const summaries = courses.map(course => {
    const page = cache.pages.filter(page => page.courseIds.includes(course.id) && canonical(page.sourceUrl) === canonical(course.url))
      .sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt))[0];
    const scanned = Boolean(page?.scannedCourseIds?.includes(course.id));
    const ids = new Set(scanned ? page!.assignmentIds : []);
    const assignments = cache.assignments.filter(a => a.courseId === course.id && ids.has(a.id));
    return { course, scanned, assignments, observedAt: scanned ? page!.observedAt : null };
  });
  const assignments = summaries.flatMap(summary => summary.assignments);
  const completed = assignments.filter(a => a.completion === 'completed').length;
  const pending = assignments.filter(a => a.completion !== 'completed' && a.completion !== 'unknown')
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
    progress{display:block;appearance:none;width:100%;height:8px;margin:8px 0;border:0;border-radius:5px;overflow:hidden;background:var(--bq-raised,#eef3f6)}progress::-webkit-progress-bar{background:var(--bq-raised,#eef3f6)}progress::-webkit-progress-value{background:var(--bq-good,#26a69a);border-radius:5px}
    .grid{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(240px,1fr);gap:24px;margin-top:22px}h3{font:inherit;font-weight:600;margin:0 0 10px}
    ul{list-style:none;margin:0;padding:0}li{padding:10px 0;border-top:1px solid var(--bq-border,#edf1f4)}.assignment{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:15px;align-items:center}
    a{color:var(--bq-accent,#227ab0);text-decoration:none}a:hover{text-decoration:underline}a:focus-visible,button:focus-visible{outline:2px solid var(--bq-accent,#227ab0);outline-offset:3px}
    .meta{display:block;font-size:12px;color:var(--bq-muted,#748491);margin-top:3px}.due{text-align:right;font-size:12px;white-space:nowrap}.due small{display:block;color:var(--bq-muted,#748491)}.overdue{color:var(--bq-warning,#a96645)}
    .course-title{font-weight:500}.unscanned{color:var(--bq-warning,#a96645)}button{font:inherit;font-size:12px;cursor:pointer;border:0;color:var(--bq-accent,#227ab0);background:transparent;padding:6px 0}.empty{color:var(--bq-muted,#748491);font-size:13px}.error{color:var(--bq-warning,#a3453c)}
    @media(max-width:750px){section{padding:16px}.grid{grid-template-columns:1fr;gap:18px}header{align-items:flex-start;flex-direction:column;gap:5px}.progress-label{flex-wrap:wrap}.assignment{gap:10px}}
  `;
  const section = document.createElement('section'); section.setAttribute('aria-labelledby', 'bq-home-title');
  const heading = document.createElement('h2'); heading.id = 'bq-home-title'; heading.tabIndex = -1; heading.textContent = 'Your assignments';
  const content = document.createElement('div'); content.setAttribute('aria-live', 'polite');
  section.append(heading, content); shadow.append(style, section);
  let disposed = false, generation = 0, fingerprint = '', lastRender = '', limit = 5;
  let courses: Course[] = [], cache: LocalState['cache'] | undefined;
  let stop: (() => void) | undefined;
  function position() {
    const slot = findHomepageSlot(document);
    if (!slot || slot.root !== root) { host.remove(); return false; }
    if (slot.wrapper.nextSibling !== host) slot.wrapper.after(host);
    return true;
  }
  function render() {
    if (!cache || disposed) return;
    const data = homepageOverview(courses, cache); content.className = ''; content.replaceChildren();
    const coverage = document.createElement('p'); coverage.className = 'coverage';
    coverage.textContent = `${data.observed} of ${courses.length} listed course pages observed · Cached rows only`;
    const label = document.createElement('div'); label.className = 'progress-label';
    const progressText = document.createElement('span'); progressText.textContent = `${data.completed} / ${data.total} observed assignments completed`;
    const percent = document.createElement('span'); percent.textContent = data.total ? `${Math.round(data.completed / data.total * 100)}% of observed rows` : 'No observed assignment data';
    label.append(progressText, percent);
    const progress = document.createElement('progress'); progress.max = Math.max(1, data.total); progress.value = data.completed;
    progress.setAttribute('aria-label', 'Completion of cached observed assignments');
    progress.setAttribute('aria-valuetext', progressText.textContent!);
    const caption = document.createElement('p'); caption.className = 'caption';
    caption.textContent = 'This is not account-wide progress. Open unscanned courses to collect their work; newly added or hidden assignments may be missing.' + (data.unknown ? ` ${data.unknown} observed completion statuses are unknown.` : '');
    const grid = document.createElement('div'); grid.className = 'grid';
    const upcoming = document.createElement('div'); const upcomingTitle = document.createElement('h3'); upcomingTitle.textContent = 'Upcoming incomplete work'; upcoming.append(upcomingTitle);
    const list = document.createElement('ul');
    for (const assignment of data.pending.slice(0, limit)) {
      const row = document.createElement('li'); row.className = 'assignment';
      const info = document.createElement('div'); const link = document.createElement('a'); link.href = assignment.url; link.textContent = assignment.title;
      const meta = document.createElement('span'); meta.className = 'meta'; meta.textContent = `${courses.find(c => c.id === assignment.courseId)?.title || ''} · ${completionText(assignment)}`;
      info.append(link, meta); const due = displayDeadline(assignment);
      const date = document.createElement('div'); date.className = 'due' + (due.overdue ? ' overdue' : ''); date.textContent = (due.overdue ? 'Overdue · ' : '') + due.date;
      const time = document.createElement('small'); time.textContent = due.time; date.append(time); row.append(info, date); list.append(row);
    }
    upcoming.append(list);
    if (!data.pending.length) { const empty = document.createElement('p'); empty.className = 'empty'; empty.textContent = data.observed ? 'No known incomplete assignments in the observed rows.' : 'Visit a course’s Assignments page to populate this overview.'; upcoming.append(empty); }
    if (data.pending.length > limit) { const more = document.createElement('button'); more.type = 'button'; more.textContent = `Show more (${data.pending.length - limit})`; more.onclick = () => { limit += 5; render(); }; upcoming.append(more); }
    const summary = document.createElement('div'); const summaryTitle = document.createElement('h3'); summaryTitle.textContent = 'Your courses'; summary.append(summaryTitle);
    const courseList = document.createElement('ul');
    for (const item of data.summaries) {
      const row = document.createElement('li'); const link = document.createElement('a'); link.className = 'course-title'; link.href = item.course.url; link.textContent = item.course.title;
      const status = document.createElement('span'); status.className = 'meta' + (!item.scanned ? ' unscanned' : '');
      status.textContent = item.scanned ? `${item.assignments.filter(a => a.completion === 'completed').length} / ${item.assignments.length} observed rows complete · Cached` : 'Not scanned — open this course to collect assignments';
      if (item.observedAt) status.title = `Last observed: ${new Date(item.observedAt).toLocaleString()}`;
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
      courses = discovered; cache = state.cache;
      const renderKey = JSON.stringify({ courses, cache }); if (renderKey !== lastRender) { render(); lastRender = renderKey; }
    } catch (error) {
      if (!disposed && current === generation) { lastRender = ''; content.className = 'error'; content.textContent = error instanceof Error ? error.message : 'Assignments could not be loaded.'; }
    }
  }
  position(); content.textContent = 'Reading observed assignments…';
  if (subscribe) { try { stop = subscribe(() => { void refresh(); }); } catch { /* DOM refreshes can still update the overview. */ } }
  return { refresh, focus: () => { if (!position()) return false; host.scrollIntoView?.({ block: 'start' }); heading.focus({ preventScroll: true }); return true; }, dispose: () => { disposed = true; generation++; stop?.(); host.remove(); } };
}
