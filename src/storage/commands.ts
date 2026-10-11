import { featurePreferences, type AssignmentSnapshot, type Bookmark, type FeatureName, type LocalState, type StudyRecord, type ThemePreference } from '../shared/models';
import { isBookmark, isSnapshot, isStudyRecord, object, themePreference, timestamp } from '../shared/validation';

export type Command =
  | { kind: 'state:read' }
  | { kind: 'assignments:cache'; snapshot: AssignmentSnapshot }
  | { kind: 'assignments:refresh'; requestedAt: string }
  | { kind: 'assignment:completion:set'; assignmentId: string; completed: boolean }
  | { kind: 'bookmarks:put'; bookmark: Bookmark }
  | { kind: 'bookmarks:remove'; questionId: string }
  | { kind: 'theme:set'; preference: ThemePreference }
  | { kind: 'feature:set'; feature: FeatureName; enabled: boolean }
  | { kind: 'study:save'; record: StudyRecord };

export function isCommand(value: unknown): value is Command {
  if (!object(value)) return false;
  try {
  switch (value.kind) {
    case 'state:read': return true;
    case 'assignments:cache': return isSnapshot(value.snapshot);
    case 'assignments:refresh': return timestamp(value.requestedAt);
    case 'assignment:completion:set': return typeof value.assignmentId === 'string' && value.assignmentId.length > 0 && value.assignmentId.length <= 6000 && typeof value.completed === 'boolean';
    case 'bookmarks:put': return isBookmark(value.bookmark);
    case 'bookmarks:remove': return typeof value.questionId === 'string' && value.questionId.length <= 8000;
    case 'theme:set': return themePreference(value.preference);
    case 'feature:set': return (value.feature === 'assignments' || value.feature === 'bookmarks' || value.feature === 'animations' || value.feature === 'celebrations' || value.feature === 'whimsy') && typeof value.enabled === 'boolean';
    case 'study:save': return isStudyRecord(value.record);
    default: return false;
  }
  } catch { return false; }
}

function merge<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  const result = new Map(existing.map(item => [item.id, item]));
  incoming.forEach(item => result.set(item.id, item));
  return [...result.values()];
}

export function applyCommand(state: LocalState, command: Command): LocalState {
  if (!isCommand(command)) throw new Error('Invalid BetterQuest command.');
  const next = structuredClone(state);
  switch (command.kind) {
    case 'state:read': break;
    case 'assignments:cache': {
      const snapshot = command.snapshot;
      const previous = next.cache.pages.find(page => page.sourceUrl === snapshot.sourceUrl);
      // A late asynchronous response must not regress a newer page snapshot.
      if (previous && Date.parse(previous.observedAt) > Date.parse(snapshot.observedAt)) break;
      const newer = next.cache.pages.filter(page => Date.parse(page.observedAt) > Date.parse(snapshot.observedAt));
      next.cache.courses = merge(next.cache.courses, snapshot.courses.filter(course => !newer.some(page => page.courseIds.includes(course.id))));
      next.cache.assignments = merge(next.cache.assignments, snapshot.assignments.filter(assignment => !newer.some(page => page.assignmentIds.includes(assignment.id))));
      next.cache.pages = [...next.cache.pages.filter(page => page.sourceUrl !== snapshot.sourceUrl), {
        sourceUrl: snapshot.sourceUrl, observedAt: snapshot.observedAt,
        courseIds: snapshot.courses.map(c => c.id), assignmentIds: snapshot.assignments.map(a => a.id),
        ...(snapshot.scannedCourseIds === undefined ? {} : { scannedCourseIds: snapshot.scannedCourseIds }),
      }];
      break;
    }
    case 'assignments:refresh': next.cache.refreshRequestedAt = command.requestedAt; break;
    case 'assignment:completion:set': {
      if (!next.cache.assignments.some(assignment => assignment.id === command.assignmentId)) throw new Error('Unknown assignment completion target.');
      const overrides = { ...(next.completionOverrides || {}) };
      if (command.completed) overrides[command.assignmentId] = true;
      else delete overrides[command.assignmentId];
      next.completionOverrides = overrides;
      break;
    }
    case 'bookmarks:put': {
      const old = next.bookmarks.find(bookmark => bookmark.id === command.bookmark.id);
      next.bookmarks = merge(next.bookmarks, [{ ...command.bookmark, createdAt: old?.createdAt || command.bookmark.createdAt }]);
      break;
    }
    case 'bookmarks:remove': next.bookmarks = next.bookmarks.filter(bookmark => bookmark.id !== command.questionId); break;
    case 'theme:set': next.preferences.theme = command.preference; break;
    case 'feature:set': next.preferences.features = { ...featurePreferences(next.preferences), [command.feature]: command.enabled }; break;
    case 'study:save': next.study = [...next.study.filter(record => record.assignment.id !== command.record.assignment.id), command.record]; break;
  }
  return next;
}
