import type { Assignment, LocalState } from '../../shared/models';

export type AssignmentView = 'todo' | 'completed';
export type AssignmentScope = 'course' | 'visited';
export type CompletionOverrides = LocalState['completionOverrides'];

export function assignmentIsCompleted(assignment: Assignment, overrides: CompletionOverrides = {}): boolean {
  return assignment.completion === 'completed' || overrides?.[assignment.id] === true;
}

export function assignmentPanelData(cache: LocalState['cache']) {
  const assignments = [...cache.assignments].sort((a, b) => {
    const difference = (a.deadline.iso ? Date.parse(a.deadline.iso) : Infinity) - (b.deadline.iso ? Date.parse(b.deadline.iso) : Infinity);
    return (Number.isNaN(difference) ? 0 : difference) || a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
  });
  const courses = cache.courses.map(course => {
    const observations = cache.pages.filter(page => page.scannedCourseIds?.includes(course.id)).sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt));
    return { course, scanned: observations.length > 0, observedAt: observations[0]?.observedAt || null,
      assignmentCount: cache.assignments.filter(a => a.courseId === course.id).length };
  });
  return { assignments, courses };
}

export function visibleAssignments(cache: LocalState['cache'], courseId: string, scope: AssignmentScope, view: AssignmentView, overrides: CompletionOverrides = {}): Assignment[] {
  const rows = assignmentPanelData(cache).assignments.filter(assignment =>
    (scope === 'visited' || assignment.courseId === courseId) &&
    (view === 'completed' ? assignmentIsCompleted(assignment, overrides) : !assignmentIsCompleted(assignment, overrides)));
  // Explicitly incomplete work comes before entries whose completion is unknown.
  return view === 'todo' ? rows.sort((a, b) => Number(a.completion === 'unknown') - Number(b.completion === 'unknown')) : rows.sort((a, b) => {
    const difference = (b.deadline.iso ? Date.parse(b.deadline.iso) : -Infinity) - (a.deadline.iso ? Date.parse(a.deadline.iso) : -Infinity);
    return (Number.isNaN(difference) ? 0 : difference) || a.title.localeCompare(b.title);
  });
}

export function completionText(assignment: Assignment, overrides: CompletionOverrides = {}): string {
  if (assignment.completion !== 'completed' && assignmentIsCompleted(assignment, overrides)) return 'Completed manually';
  return { completed: 'Completed', 'not-completed': 'Not completed', 'not-started': 'Not started', 'in-progress': 'In progress', unknown: 'Status unknown' }[assignment.completion];
}

export function displayDeadline(assignment: Assignment, now = Date.now(), overrides: CompletionOverrides = {}) {
  if (!assignment.deadline.iso) return { date: 'Unknown deadline', time: 'Check Quest', overdue: false };
  const date = new Date(assignment.deadline.iso);
  const timeZone = assignment.deadline.timeZone || 'UTC';
  try {
    return {
      date: new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', timeZone }).format(date),
      time: new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short', timeZone }).format(date),
      overdue: date.getTime() < now && !assignmentIsCompleted(assignment, overrides),
    };
  } catch {
    return { date: assignment.deadline.label || assignment.deadline.iso, time: 'See original deadline', overdue: date.getTime() < now && !assignmentIsCompleted(assignment, overrides) };
  }
}
