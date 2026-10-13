/** Quest prints course codes ("M 408C") only on the homepage course table;
 *  course pages show name + unique only. Remember what the homepage showed
 *  (per browser tab session) so the course hero can still display the code. */

import type { HomepageCourseRow } from '../../adapters/quest/homepage';

export interface CourseCodeEntry { code: string; departmentCode: string; unique: string }

const STORAGE_KEY = 'betterquest:course-codes';
const MAX_ENTRIES = 40;
const memory = new Map<string, CourseCodeEntry>();

function session(): Storage | null {
  try { return globalThis.sessionStorage ?? null; } catch { return null; }
}

function load(): void {
  const store = session();
  if (!store || memory.size) return;
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return;
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      const entry = value as CourseCodeEntry;
      if (entry && typeof entry.code === 'string' && typeof entry.departmentCode === 'string') {
        memory.set(key, { code: entry.code, departmentCode: entry.departmentCode, unique: typeof entry.unique === 'string' ? entry.unique : '' });
      }
    }
  } catch { /* Unreadable session data simply means no remembered codes. */ }
}

function persist(): void {
  const store = session();
  if (!store) return;
  try { store.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(memory))); } catch { /* Quota/private mode keeps the in-memory copy. */ }
}

/** Records homepage rows keyed by their `?course=` parameter. */
export function rememberCourseCodes(rows: HomepageCourseRow[]): void {
  let changed = false;
  for (const row of rows) {
    if (!row.courseParam) continue;
    const entry = { code: row.courseCode, departmentCode: row.departmentCode, unique: row.courseUnique };
    const existing = memory.get(row.courseParam);
    if (existing && existing.code === entry.code && existing.departmentCode === entry.departmentCode && existing.unique === entry.unique) continue;
    memory.delete(row.courseParam); memory.set(row.courseParam, entry); changed = true;
  }
  while (memory.size > MAX_ENTRIES) { const oldest = memory.keys().next().value; if (oldest === undefined) break; memory.delete(oldest); changed = true; }
  if (changed) persist();
}

/** Looks up the current course page's `?course=` parameter. */
export function lookupCourseCode(document: Document): CourseCodeEntry | null {
  let param: string | null = null;
  try {
    const url = new URL(document.URL);
    if (!url.pathname.endsWith('/courses/show')) return null;
    param = url.searchParams.get('course');
  } catch { return null; }
  if (!param) return null;
  load();
  return memory.get(param) || null;
}
