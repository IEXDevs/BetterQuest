import type { Course } from '../../shared/models';
import { courseId, sourceUrl } from '../../shared/identity';

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
  const headers = [...slot.table.querySelectorAll('thead tr:first-child > th')].map(th => th.textContent?.trim() || '');
  const nameIndex = headers.indexOf('Name'), uniqueIndex = headers.indexOf('Unique');
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
