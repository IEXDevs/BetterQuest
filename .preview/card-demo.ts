/** Temporary visual check: the course card with the hero art filling the whole
 *  card and the info panels hazy on top. Not part of the build. */

import { enhanceCourseHero } from '../src/features/courses/hero';
import { enhanceCourseInfoCard } from '../src/features/courses/details-enhancer';
import { rememberCourseCodes } from '../src/features/courses/course-codes';
import { createAssignmentSection } from '../src/features/assignments/section';
import { QUEST_DARK_STYLES } from '../src/adapters/quest/theme';
import type { Assignment, Course, LocalState } from '../src/shared/models';

function setTheme(value: 'dark' | 'light'): void {
  document.body.setAttribute('data-betterquest-theme', value);
  document.getElementById('main-content')!.setAttribute('data-betterquest-theme', value);
  const button = document.getElementById('theme')!;
  button.textContent = value === 'dark' ? 'Switch to light' : 'Switch to dark';
}

function boot(): void {
  const style = document.createElement('style');
  style.textContent = QUEST_DARK_STYLES;
  document.head.append(style);

  rememberCourseCodes([{
    row: null, artworkCell: null, nativeImage: null,
    departmentCode: 'M', courseCode: 'M 408C', courseUnique: '58360', courseParam: '9001',
  }] as never);

  const target = document.getElementById('target')!;

  // Real assignment section, fed by a stub instead of chrome.storage.
  const course: Course = {
    id: 'course-58360', sourceId: '58360', title: 'DIFFEREN AND INTEGRAL CALCULUS',
    url: 'https://quest.cns.utexas.edu/student/courses/show?course=9001',
  };
  const assignment = (id: string, title: string, iso: string): Assignment => ({
    id, sourceId: id, courseId: course.id, title,
    url: 'https://quest.cns.utexas.edu/student/instances/route?instance=x',
    deadline: { iso, label: null, timeZone: 'America/Chicago' },
    completion: 'not-started', kind: 'homework', historical: null,
  });
  const rows = [
    assignment('a1', 'Problem Set 4 — Integrals', '2026-10-08T23:59:00.000Z'),
    assignment('a2', 'Midterm 2 Review Sheet', '2026-10-15T23:59:00.000Z'),
    assignment('a3', 'WebWork 9', '2026-10-17T23:59:00.000Z'),
  ];
  const state: LocalState = {
    schemaVersion: 1,
    cache: {
      courses: [course],
      assignments: rows,
      pages: [{
        sourceUrl: 'https://quest.cns.utexas.edu/student/courses/show?course=9001',
        observedAt: '2026-10-11T12:00:00.000Z',
        courseIds: [course.id],
        assignmentIds: rows.map(row => row.id),
        scannedCourseIds: [course.id],
      }],
      refreshRequestedAt: null,
    },
    completionOverrides: {}, bookmarks: [], study: [], preferences: { theme: 'system' },
  };
  const section = createAssignmentSection(
    target,
    (async (request: { kind: string }) => request.kind === 'state:read' ? state : null) as never,
    (callback: () => void) => { callback(); return () => {}; },
  );
  section.refresh(course);

  enhanceCourseInfoCard(target);
  enhanceCourseHero(target);

  setTheme('dark');
  document.getElementById('theme')!.addEventListener('click', () => {
    const current = document.getElementById('main-content')!.getAttribute('data-betterquest-theme');
    setTheme(current === 'dark' ? 'light' : 'dark');
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
