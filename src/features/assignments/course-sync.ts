import { QUEST_ORIGIN } from '../../shared/messages';
import type { Course } from '../../shared/models';

export type CourseSyncTarget = { id: string; url: string; title: string };
export type CourseSyncResult = 'ok' | 'timeout' | 'error';

export function isSyncableCourseUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const isShow = url.pathname === '/student/courses/show' && /^\d+$/.test(url.searchParams.get('course') || '');
    const isShowPath = /^\/student\/courses\/show\/\d+$/.test(url.pathname);
    return url.origin === QUEST_ORIGIN && (isShow || isShowPath);
  } catch {
    return false;
  }
}

export function syncTargetsFromCourses(courses: Course[]): CourseSyncTarget[] {
  return courses
    .filter(course => isSyncableCourseUrl(course.url))
    .map(course => ({ id: course.id, url: course.url, title: course.title }));
}

/** Ask the background worker to open one course tab, wait for a scan, then close it. */
export async function syncCourseInBackground(course: CourseSyncTarget): Promise<CourseSyncResult> {
  let response: { ok?: boolean; result?: CourseSyncResult; error?: string } | undefined;
  try {
    response = await chrome.runtime.sendMessage({
      type: 'betterquest:sync-course',
      courseId: course.id,
      url: course.url,
    });
  } catch {
    return 'error';
  }
  if (!response?.ok) return 'error';
  return response.result === 'ok' || response.result === 'timeout' ? response.result : 'error';
}

/**
 * Sync every listed course one at a time. Progress is for the homepage caption —
 * never an account-wide "fully synced" claim beyond what Quest pages actually returned.
 */
export async function syncCoursesSequentially(
  courses: CourseSyncTarget[],
  onProgress: (done: number, total: number, current: CourseSyncTarget | null) => void,
  signal?: AbortSignal,
): Promise<{ ok: number; failed: number }> {
  let ok = 0;
  let failed = 0;
  const total = courses.length;
  onProgress(0, total, null);
  for (let i = 0; i < courses.length; i++) {
    if (signal?.aborted) break;
    const course = courses[i]!;
    onProgress(i, total, course);
    const result = await syncCourseInBackground(course);
    if (result === 'ok') ok++;
    else failed++;
    onProgress(i + 1, total, null);
  }
  return { ok, failed };
}
