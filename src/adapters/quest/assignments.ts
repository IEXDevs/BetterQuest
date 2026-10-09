import type { AssignmentAdapter, PageContext } from '../../shared/adapters';
import { notConfigured } from '../../shared/adapters';
import type { Assignment, AssignmentSnapshot, CompletionStatus, Course, Deadline, Extraction } from '../../shared/models';
import { assignmentId, courseId, sourceUrl } from '../../shared/identity';

/** Selectors verified against the supplied authenticated Quest fragment. */
export const ASSIGNMENT_SELECTORS = {
  root: '#target',
  title: 'button[data-target="#student-course-info-header"] .h4',
  tab: '#tabs-elements',
  tables: 'table[id^="instances-table-eh"]',
  accessible: '.sr-only',
  processing: '.dataTables_processing',
} as const;

const clean = (value: string | null | undefined) => (value || '').replace(/\s+/g, ' ').trim();

function label(cell: Element | undefined, prefix: RegExp): string | null {
  if (!cell) return null;
  return clean(cell.querySelector(ASSIGNMENT_SELECTORS.accessible)?.textContent || cell.textContent).replace(prefix, '').trim() || null;
}

/** Machine timestamps are authoritative; timezone parsing never uses browser time. */
export function readDeadline(cell: Element | undefined, heading: string): Deadline {
  const raw = label(cell, /^(?:Due|Start) Date:\s*/i);
  // A date cell's screen-reader span labels the column, not the value.
  const value = cell ? clean(cell.textContent).replace(/^(?:Due|Start) Date:\s*/i, '') || null : raw;
  const zone = /Central Time/i.test(heading) || /\bC[DS]T\b/.test(value || '') ? 'America/Chicago' : null;
  const unix = cell?.getAttribute('data-order')?.trim();
  let iso: string | null = null;
  if (unix && /^\d{9,11}$/.test(unix) && Number(unix) > 0) {
    const date = new Date(Number(unix) * 1000);
    if (Number.isFinite(date.getTime())) iso = date.toISOString();
  }
  if (!iso && value) {
    const match = value.match(/^([A-Za-z]+) (\d{1,2}), (\d{4}) (\d{1,2}):(\d{2}) (AM|PM) (CDT|CST)$/);
    if (match) {
      const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      const month = months.indexOf(match[1]);
      const day = Number(match[2]), year = Number(match[3]), hour = Number(match[4]), minute = Number(match[5]);
      if (month >= 0 && hour >= 1 && hour <= 12 && minute < 60 && day >= 1 && day <= new Date(Date.UTC(year, month + 1, 0)).getUTCDate()) {
        const local = Date.UTC(year, month, day, hour % 12 + (match[6] === 'PM' ? 12 : 0), minute);
        iso = new Date(local + (match[7] === 'CDT' ? 5 : 6) * 3_600_000).toISOString();
      }
    }
  }
  return { iso, label: value, timeZone: zone };
}

function completion(cell: Element | undefined): { status: CompletionStatus; label: string | null } {
  const value = label(cell, /^Completed status:\s*/i);
  if (value === 'Completed') return { status: 'completed', label: value };
  if (value === 'Not completed') return { status: 'not-completed', label: value };
  return { status: 'unknown', label: value };
}

function grade(cell: Element | undefined): NonNullable<Assignment['grade']> {
  const value = label(cell, /^Grade:\s*/i);
  const number = value?.match(/^([-+]?\d+(?:\.\d+)?)\s*(?:percent|%)?$/i);
  return { percent: number ? Number(number[1]) : null, label: value };
}

function tableColumns(table: Element): string[] {
  return [...table.querySelectorAll('thead tr:first-child > th')].map(th => clean(th.textContent));
}

function groupFor(root: Element, table: Element): NonNullable<Assignment['group']> {
  const id = table.id.replace('instances-table-eh', '');
  const title = [...root.querySelectorAll('button[data-target]')].find(button => button.getAttribute('data-target') === `#header-${id}`)?.querySelector('.h4');
  return { id, label: clean(title?.textContent) || null };
}

function parseCourse(root: Element, context: PageContext): Course | null {
  const title = clean(root.querySelector(ASSIGNMENT_SELECTORS.title)?.textContent);
  const unique = title.match(/\((\d+)\)\s*$/)?.[1];
  if (!unique) return null;
  const url = new URL(sourceUrl(context.url));
  url.hash = ''; url.searchParams.sort();
  // The supplied fragment exposes the course unique number, not an internal ID.
  const sourceId = `unique:${unique}`;
  return { id: courseId(sourceId), sourceId, title, url: url.href };
}

export function parseAssignmentPage(root: Element, context: PageContext): Extraction<AssignmentSnapshot> {
  if (context.signal.aborted) return { status: 'unavailable', reason: 'Assignment collection cancelled.' };
  const course = parseCourse(root, context);
  if (!course) return { status: 'unavailable', reason: 'Verified course title/unique number is missing.' };
  const assignments = new Map<string, Assignment>();
  const tab = root.querySelector(ASSIGNMENT_SELECTORS.tab);
  let observedTables = 0;
  let loading = false;
  for (const table of tab?.querySelectorAll(ASSIGNMENT_SELECTORS.tables) || []) {
    const headers = tableColumns(table);
    const nameIndex = headers.indexOf('Name');
    if (nameIndex < 0) continue;
    const dueIndex = headers.findIndex(text => /^Due Date\b/.test(text));
    const startIndex = headers.indexOf('Start Date');
    const completionIndex = headers.indexOf('Completed');
    const gradeIndex = headers.indexOf('Grade');
    const processing = table.closest('.dataTables_wrapper')?.querySelector<HTMLElement>(ASSIGNMENT_SELECTORS.processing);
    if (processing && !processing.hidden && root.ownerDocument.defaultView?.getComputedStyle(processing).display !== 'none') loading = true;
    let rowsRead = 0;
    for (const row of table.querySelectorAll('tbody > tr')) {
      const cells = [...row.querySelectorAll(':scope > td')];
      const link = cells[nameIndex]?.querySelector<HTMLAnchorElement>('a[href]');
      if (!link) continue; // DataTables empty/loading placeholders are not assignments.
      let url: URL;
      try { url = new URL(sourceUrl(link.getAttribute('href')!, context.url)); } catch { continue; }
      const sourceId = url.searchParams.get('instance');
      if (url.pathname !== '/student/instances/route' || !sourceId || !/^courseuserassignment_\d+$/.test(sourceId)) continue;
      const title = clean(link.textContent);
      if (!title) continue;
      const state = completion(cells[completionIndex]);
      const item: Assignment = {
        id: assignmentId(course.id, sourceId), sourceId, courseId: course.id, title, url: url.href,
        deadline: readDeadline(cells[dueIndex], headers[dueIndex] || ''),
        completion: state.status, completionLabel: state.label, grade: grade(cells[gradeIndex]),
        start: readDeadline(cells[startIndex], headers[startIndex] || ''), group: groupFor(root, table),
        // A web-assignment icon does not distinguish homework from an assessment.
        kind: 'unknown', historical: null,
      };
      rowsRead++;
      if (!assignments.has(item.id)) assignments.set(item.id, item);
    }
    if (rowsRead || table.querySelector('.dataTables_empty')) observedTables++;
  }
  return { status: 'ready', value: {
    sourceUrl: course.url, observedAt: context.observedAt, courses: [course], assignments: [...assignments.values()],
    scannedCourseIds: observedTables > 0 && !loading ? [course.id] : [],
  } };
}

export const assignmentAdapter: AssignmentAdapter = {
  locate: document => document.querySelector(ASSIGNMENT_SELECTORS.root),
  read: parseAssignmentPage,
};

export function readAssignments(document: Document, context: PageContext, adapter: AssignmentAdapter | null = assignmentAdapter): Extraction<AssignmentSnapshot> {
  if (!adapter) return notConfigured('Assignment tracking');
  const root = adapter.locate(document);
  return root ? adapter.read(root, context) : { status: 'unavailable', reason: 'Verified assignment container is absent on this page.' };
}
