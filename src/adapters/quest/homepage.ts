import type { Course } from '../../shared/models';
import { courseId, sourceUrl } from '../../shared/identity';

export interface HomepageCourseRow {
  row: HTMLTableRowElement;
  artworkCell: HTMLTableCellElement;
  nativeImage: HTMLImageElement | null;
  departmentCode: string;
  courseCode: string;
  /** Quest's unique number for the course. An open course page prints it in the
   *  card header, so it is the one id both views share for artwork identity. */
  courseUnique: string;
  /** The `?course=` id shared with the course page URL; presentation memory only. */
  courseParam: string | null;
}

/** Index of a labelled column in the course table header, or -1. */
function columnIndex(table: HTMLTableElement, label: string): number {
  const headers = [...table.querySelectorAll('thead tr:first-child > th')];
  return headers.findIndex(th => (th.textContent || '').trim() === label);
}

/** Homepage selectors/column labels from the supplied authenticated document. */
export function findHomepageSlot(document: Document): { root: HTMLElement; wrapper: HTMLElement; table: HTMLTableElement } | null {
  if (new URL(document.URL).pathname.replace(/\/$/, '') !== '/student/courses') return null;
  const wrapper = document.querySelector<HTMLElement>('#courses-table_wrapper');
  const table = wrapper?.querySelector<HTMLTableElement>('#courses-table');
  const root = wrapper?.parentElement;
  const enroll = document.querySelector<HTMLElement>('#enroll-div');
  if (!wrapper || !table || !root || root.id !== 'courses-table-div' || !enroll || !(wrapper.compareDocumentPosition(enroll) & 4)) return null;
  return { root, wrapper, table };
}

export function readHomepageCourses(document: Document): Course[] {
  const slot = findHomepageSlot(document);
  if (!slot) return [];
  const nameIndex = columnIndex(slot.table, 'Name'), uniqueIndex = columnIndex(slot.table, 'Unique');
  if (nameIndex < 0 || uniqueIndex < 0) return [];
  const courses = new Map<string, Course>();
  for (const row of slot.table.querySelectorAll('tbody > tr')) {
    const cells = [...row.querySelectorAll(':scope > td')];
    const link = cells[nameIndex]?.querySelector<HTMLAnchorElement>('a[href]');
    const unique = cells[uniqueIndex]?.textContent?.trim();
    if (!link || !unique || !/^\d+$/.test(unique)) continue;
    const title = link.textContent?.replace(/\s+/g, ' ').trim();
    if (!title) continue;
    try {
      const url = sourceUrl(link.getAttribute('href')!, document.URL);
      const parsed = new URL(url);
      if (parsed.pathname !== '/student/courses/show' || !/^\d+$/.test(parsed.searchParams.get('course') || '')) continue;
      const sourceId = `unique:${unique}`;
      courses.set(sourceId, { id: courseId(sourceId), sourceId, title: `${title} (${unique})`, url });
    } catch { /* Invalid/non-Quest course links do not become records. */ }
  }
  return [...courses.values()];
}

export function departmentFromCourseCode(courseCode: string): string {
  const prefix = courseCode.toUpperCase().match(/^\s*([A-Z][A-Z\s]{0,7}?)\s*\d/);
  return (prefix?.[1] || courseCode.match(/[A-Za-z]+/)?.[0] || 'UT').replace(/\s+/g, '').slice(0, 5) || 'UT';
}

/** Reads presentation-only row slots; course identity continues to come from readHomepageCourses. */
export function readHomepageCourseRows(document: Document): HomepageCourseRow[] {
  const slot = findHomepageSlot(document);
  if (!slot) return [];
  const uniqueIndex = columnIndex(slot.table, 'Unique');
  const rows: HomepageCourseRow[] = [];
  for (const row of slot.table.querySelectorAll<HTMLTableRowElement>('tbody > tr')) {
    const artworkCell = row.querySelector<HTMLTableCellElement>(':scope > td:first-child');
    const codeCell = row.querySelector<HTMLTableCellElement>('td[aria-label^="Course Short Name:"]');
    const courseCode = (codeCell?.getAttribute('aria-label')?.replace(/^Course Short Name:\s*/i, '') || codeCell?.textContent || '').replace(/\s+/g, ' ').trim();
    if (!artworkCell || !courseCode) continue;
    const cells = [...row.querySelectorAll<HTMLTableCellElement>(':scope > td')];
    const courseUnique = (uniqueIndex < 0 ? '' : (cells[uniqueIndex]?.textContent || '').replace(/\s+/g, ''));
    let courseParam: string | null = null;
    try {
      const link = row.querySelector<HTMLAnchorElement>('td a[href*="courses/show"]');
      const href = link?.getAttribute('href');
      if (href) courseParam = new URL(sourceUrl(href, document.URL)).searchParams.get('course');
    } catch { /* Rows without a verifiable course link keep a null param. */ }
    rows.push({ row, artworkCell, nativeImage: artworkCell.querySelector('img'), departmentCode: departmentFromCourseCode(courseCode), courseCode, courseUnique, courseParam });
  }
  return rows;
}
