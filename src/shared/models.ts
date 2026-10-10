export type CourseId = string;
export type AssignmentId = string;
export type QuestionId = string;
export type ThemePreference = 'light' | 'dark' | 'system';
export type FeatureName = 'assignments' | 'bookmarks' | 'animations';
export interface FeaturePreferences { assignments: boolean; bookmarks: boolean; animations?: boolean }
export interface Preferences { theme: ThemePreference; features?: FeaturePreferences }
export function featurePreferences(preferences: Preferences): FeaturePreferences {
  return preferences.features || { assignments: true, bookmarks: true, animations: true };
}
export type CompletionStatus = 'unknown' | 'not-started' | 'not-completed' | 'in-progress' | 'completed';

export interface Course {
  id: CourseId;
  sourceId: string;
  title: string;
  url: string;
}

export interface Deadline {
  /** ISO timestamp only when actually determined; original label is retained. */
  iso: string | null;
  label: string | null;
  timeZone: string | null;
}

export interface Assignment {
  id: AssignmentId;
  sourceId: string;
  courseId: CourseId;
  title: string;
  url: string;
  deadline: Deadline;
  completion: CompletionStatus;
  kind: 'homework' | 'assessment' | 'unknown';
  /** Explicit adapter evidence of historical homework, not guessed from a score. */
  historical: boolean | null;
  /** Optional additions preserve compatibility with existing cached records. */
  grade?: { percent: number | null; label: string | null };
  start?: Deadline;
  group?: { id: string; label: string | null };
  completionLabel?: string | null;
}

export interface AvailableMaterial {
  availability: 'unknown' | 'available' | 'unavailable';
  url: string | null;
}

export interface Question {
  id: QuestionId;
  sourceId: string;
  courseId: CourseId;
  assignmentId: AssignmentId;
  number: string | null;
  url: string;
  /** A verified native anchor; null means navigate to the assignment only. */
  anchor: string | null;
  prompt: {
    status: 'not-extracted' | 'extracted' | 'unavailable';
    text: string | null;
    format: 'plain-text';
    reason: string | null;
  };
  /** Availability/source metadata only. No submitted responses or solution text. */
  answer: AvailableMaterial;
  solution: AvailableMaterial;
}

export interface AssignmentSnapshot {
  sourceUrl: string;
  observedAt: string;
  courses: Course[];
  assignments: Assignment[];
  /** Evidence of recognized table observations, not an account-wide sync claim. */
  scannedCourseIds?: CourseId[];
}

export interface CachedPage {
  sourceUrl: string;
  observedAt: string;
  courseIds: CourseId[];
  assignmentIds: AssignmentId[];
  scannedCourseIds?: CourseId[];
}

export interface Bookmark {
  id: QuestionId;
  course: Course;
  assignment: Assignment;
  question: Question;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudyRecord {
  course: Course;
  assignment: Assignment;
  questions: Question[];
  sourceUrl: string;
  collectedAt: string;
}

export interface LocalState {
  schemaVersion: 1;
  cache: { courses: Course[]; assignments: Assignment[]; pages: CachedPage[]; refreshRequestedAt: string | null };
  /** User-owned corrections; observed Quest status remains unchanged in the cache. */
  completionOverrides?: Partial<Record<AssignmentId, true>>;
  bookmarks: Bookmark[];
  study: StudyRecord[];
  preferences: Preferences;
}

export interface StudyExport {
  schema: 'betterquest.study.v1';
  exportedAt: string;
  courses: Course[];
  assignments: Assignment[];
  questions: Question[];
  sources: { courseId: CourseId; assignmentId: AssignmentId; url: string; collectedAt: string }[];
  collection: { records: number; extractedPrompts: number; unextractedPrompts: number };
}

export type Extraction<T> =
  | { status: 'ready'; value: T }
  | { status: 'unsupported' | 'unavailable'; reason: string };

export function emptyState(): LocalState {
  return {
    schemaVersion: 1,
    cache: { courses: [], assignments: [], pages: [], refreshRequestedAt: null },
    completionOverrides: {}, bookmarks: [], study: [], preferences: { theme: 'system' },
  };
}
