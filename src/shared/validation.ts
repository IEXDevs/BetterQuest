import type { Assignment, AssignmentSnapshot, Bookmark, CachedPage, Course, LocalState, Question, StudyRecord, StudyExport } from './models';
import { courseId, assignmentId, questionId, sourceUrl } from './identity';

type ObjectValue = Record<string, unknown>;
export const object = (value: unknown): value is ObjectValue => !!value && typeof value === 'object' && !Array.isArray(value);
const string = (value: unknown, max = 2000): value is string => typeof value === 'string' && value.length <= max;
const nullableString = (value: unknown, max = 2000) => value === null || string(value, max);
export const timestamp = (value: unknown): value is string => string(value, 100) && /^\d{4}-\d{2}-\d{2}T/.test(value) && /(Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
const url = (value: unknown) => { try { return string(value) && sourceUrl(value) === value; } catch { return false; } };
export const themePreference = (value: unknown) => typeof value === 'string' && ['light', 'dark', 'system'].includes(value);
const array = <T>(value: unknown, guard: (item: unknown) => item is T, max = 1000): value is T[] => Array.isArray(value) && value.length <= max && value.every(guard);
const unique = (values: { id: string }[]) => new Set(values.map(value => value.id)).size === values.length;
const only = (value: ObjectValue, keys: string[]) => Object.keys(value).every(key => keys.includes(key));

export function isCourse(value: unknown): value is Course {
  if (!object(value) || !string(value.sourceId) || !value.sourceId.trim()) return false;
  return only(value, ['id', 'sourceId', 'title', 'url']) && value.id === courseId(value.sourceId) && string(value.title, 500) && url(value.url);
}

export function isAssignment(value: unknown): value is Assignment {
  if (!object(value) || !string(value.sourceId) || !value.sourceId.trim() || !string(value.courseId, 4000) || !object(value.deadline)) return false;
  return only(value, ['id', 'sourceId', 'courseId', 'title', 'url', 'deadline', 'completion', 'kind', 'historical', 'grade', 'start', 'group', 'completionLabel']) &&
    only(value.deadline, ['iso', 'label', 'timeZone']) && value.id === assignmentId(value.courseId, value.sourceId) && string(value.title, 500) && url(value.url) &&
    (value.deadline.iso === null || timestamp(value.deadline.iso)) && nullableString(value.deadline.label, 500) && nullableString(value.deadline.timeZone, 100) &&
    typeof value.completion === 'string' && ['unknown', 'not-started', 'not-completed', 'in-progress', 'completed'].includes(value.completion) &&
    typeof value.kind === 'string' && ['homework', 'assessment', 'unknown'].includes(value.kind) && (value.historical === null || typeof value.historical === 'boolean') &&
    (value.grade === undefined || (object(value.grade) && only(value.grade, ['percent', 'label']) && (value.grade.percent === null || (typeof value.grade.percent === 'number' && Number.isFinite(value.grade.percent))) && nullableString(value.grade.label, 500))) &&
    (value.start === undefined || (object(value.start) && only(value.start, ['iso', 'label', 'timeZone']) && (value.start.iso === null || timestamp(value.start.iso)) && nullableString(value.start.label, 500) && nullableString(value.start.timeZone, 100))) &&
    (value.group === undefined || (object(value.group) && only(value.group, ['id', 'label']) && string(value.group.id) && nullableString(value.group.label, 500))) &&
    (value.completionLabel === undefined || nullableString(value.completionLabel, 500));
}

function material(value: unknown): boolean {
  return object(value) && only(value, ['availability', 'url']) && typeof value.availability === 'string' && ['unknown', 'available', 'unavailable'].includes(value.availability) &&
    (value.url === null || url(value.url)) && (value.availability === 'available' || value.url === null);
}

export function isQuestion(value: unknown): value is Question {
  if (!object(value) || !string(value.sourceId) || !value.sourceId.trim() || !string(value.assignmentId, 6000) || !string(value.courseId, 4000) || !object(value.prompt)) return false;
  return only(value, ['id', 'sourceId', 'courseId', 'assignmentId', 'number', 'url', 'anchor', 'prompt', 'answer', 'solution']) &&
    only(value.prompt, ['status', 'text', 'format', 'reason']) && value.id === questionId(value.assignmentId, value.sourceId) && nullableString(value.number, 100) && url(value.url) && nullableString(value.anchor, 500) &&
    value.prompt.format === 'plain-text' && nullableString(value.prompt.reason, 1000) &&
    (value.prompt.status === 'extracted' ? string(value.prompt.text, 100000) && !!value.prompt.text.trim() :
      typeof value.prompt.status === 'string' && ['not-extracted', 'unavailable'].includes(value.prompt.status) && value.prompt.text === null) &&
    material(value.answer) && material(value.solution);
}

export function linked(course: Course, assignment: Assignment, question?: Question): boolean {
  return assignment.courseId === course.id && (!question || (question.courseId === course.id && question.assignmentId === assignment.id));
}

export function isSnapshot(value: unknown): value is AssignmentSnapshot {
  return object(value) && only(value, ['sourceUrl', 'observedAt', 'courses', 'assignments', 'scannedCourseIds']) && url(value.sourceUrl) && timestamp(value.observedAt) &&
    array(value.courses, isCourse) && array(value.assignments, isAssignment) && unique(value.courses) && unique(value.assignments) &&
    value.assignments.every(assignment => (value.courses as Course[]).some(course => course.id === assignment.courseId)) &&
    (value.scannedCourseIds === undefined || (array(value.scannedCourseIds, (v): v is string => string(v, 4000)) && value.scannedCourseIds.every(id => (value.courses as Course[]).some(c => c.id === id))));
}

export function isBookmark(value: unknown): value is Bookmark {
  return object(value) && only(value, ['id', 'course', 'assignment', 'question', 'note', 'createdAt', 'updatedAt']) && isCourse(value.course) && isAssignment(value.assignment) && value.assignment.kind !== 'assessment' && isQuestion(value.question) &&
    value.id === value.question.id && linked(value.course, value.assignment, value.question) &&
    string(value.note, 10000) && timestamp(value.createdAt) && timestamp(value.updatedAt);
}

export function isStudyRecord(value: unknown): value is StudyRecord {
  return object(value) && only(value, ['course', 'assignment', 'questions', 'sourceUrl', 'collectedAt']) && isCourse(value.course) && isAssignment(value.assignment) && value.assignment.kind === 'homework' && value.assignment.historical === true &&
    linked(value.course, value.assignment) && array(value.questions, isQuestion, 500) && unique(value.questions) &&
    value.questions.every(question => linked(value.course as Course, value.assignment as Assignment, question)) &&
    url(value.sourceUrl) && timestamp(value.collectedAt);
}

function isCachedPage(value: unknown): value is CachedPage {
  return object(value) && only(value, ['sourceUrl', 'observedAt', 'courseIds', 'assignmentIds', 'scannedCourseIds']) && url(value.sourceUrl) && timestamp(value.observedAt) &&
    array(value.courseIds, (v): v is string => string(v, 4000)) && array(value.assignmentIds, (v): v is string => string(v, 6000)) &&
    (value.scannedCourseIds === undefined || (array(value.scannedCourseIds, (v): v is string => string(v, 4000)) && value.scannedCourseIds.every(id => (value.courseIds as string[]).includes(id))));
}

export function isLocalState(value: unknown): value is LocalState {
  if (!object(value) || value.schemaVersion !== 1 || !object(value.cache) || !object(value.preferences)) return false;
  const cache = value.cache;
  const overrides = value.completionOverrides;
  return only(value, ['schemaVersion', 'cache', 'completionOverrides', 'bookmarks', 'study', 'preferences']) && only(cache, ['courses', 'assignments', 'pages', 'refreshRequestedAt']) && only(value.preferences, ['theme', 'features']) &&
    array(cache.courses, isCourse, 2000) && array(cache.assignments, isAssignment, 10000) && array(cache.pages, isCachedPage, 2000) &&
    unique(cache.courses) && unique(cache.assignments) &&
    cache.assignments.every(a => (cache.courses as Course[]).some(c => c.id === a.courseId)) &&
    cache.pages.every(p => p.courseIds.every(id => (cache.courses as Course[]).some(c => c.id === id)) && p.assignmentIds.every(id => (cache.assignments as Assignment[]).some(a => a.id === id))) &&
    (cache.refreshRequestedAt === null || timestamp(cache.refreshRequestedAt)) &&
    (overrides === undefined || (object(overrides) && Object.keys(overrides).length <= 10000 && Object.entries(overrides).every(([id, completed]) =>
      string(id, 6000) && completed === true && (cache.assignments as Assignment[]).some(assignment => assignment.id === id)))) &&
    array(value.bookmarks, isBookmark, 5000) && unique(value.bookmarks) && array(value.study, isStudyRecord, 1000) &&
    themePreference(value.preferences.theme) &&
    (value.preferences.features === undefined || (object(value.preferences.features) && only(value.preferences.features, ['assignments', 'bookmarks', 'animations']) &&
      typeof value.preferences.features.assignments === 'boolean' && typeof value.preferences.features.bookmarks === 'boolean' &&
      (value.preferences.features.animations === undefined || typeof value.preferences.features.animations === 'boolean')));
}

export function isStudyExport(value: unknown): value is StudyExport {
  if (!object(value) || !only(value, ['schema', 'exportedAt', 'courses', 'assignments', 'questions', 'sources', 'collection']) ||
      value.schema !== 'betterquest.study.v1' || !timestamp(value.exportedAt) || !array(value.courses, isCourse, 2000) ||
      !array(value.assignments, isAssignment, 10000) || !array(value.questions, isQuestion, 10000) || !object(value.collection) || !Array.isArray(value.sources)) return false;
  const courses = value.courses;
  const assignments = value.assignments;
  return unique(courses) && unique(assignments) && unique(value.questions) &&
    assignments.every(a => a.kind === 'homework' && a.historical === true && courses.some(c => c.id === a.courseId)) &&
    value.questions.every(q => assignments.some(a => a.id === q.assignmentId && a.courseId === q.courseId)) &&
    value.sources.every(s => object(s) && only(s, ['courseId', 'assignmentId', 'url', 'collectedAt']) && url(s.url) && timestamp(s.collectedAt) && assignments.some(a => a.id === s.assignmentId && a.courseId === s.courseId)) &&
    only(value.collection, ['records', 'extractedPrompts', 'unextractedPrompts']) && value.collection.records === value.sources.length &&
    value.collection.extractedPrompts === value.questions.filter(q => q.prompt.status === 'extracted').length &&
    value.collection.unextractedPrompts === value.questions.filter(q => q.prompt.status !== 'extracted').length;
}
