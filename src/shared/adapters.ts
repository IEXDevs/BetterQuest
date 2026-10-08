import type { Assignment, AssignmentSnapshot, Course, Extraction, Question, StudyRecord } from './models';

export interface PageContext { url: string; observedAt: string; signal: AbortSignal }
export interface AssignmentAdapter {
  locate(document: Document): Element | null;
  read(root: Element, context: PageContext): Extraction<AssignmentSnapshot>;
}
export interface QuestionBinding {
  course: Course;
  assignment: Assignment;
  question: Question;
  /** Verified insertion slot, outside answer inputs and submit controls. */
  controlSlot: HTMLElement;
}
export interface QuestionAdapter {
  locate(document: Document): Element | null;
  read(root: Element, context: PageContext): Extraction<QuestionBinding[]>;
}
export interface PdfDocument {
  id: string;
  url: string;
  kind: 'link' | 'embed';
  element: HTMLElement;
  controlSlot: HTMLElement | null;
}
export interface PdfAdapter {
  locate(document: Document): Element | null;
  read(root: Element, context: PageContext): Extraction<PdfDocument[]>;
}
export interface HistoryAdapter {
  locate(document: Document): Element | null;
  read(root: Element, context: PageContext): Extraction<StudyRecord>;
}
export interface ThemeAdapter {
  locate(document: Document): Element | null;
  /** Adapter may opt in only verified component roots, never document/body. */
  roots(root: Element): HTMLElement[];
}

export function notConfigured<T>(feature: string): Extraction<T> {
  return { status: 'unsupported', reason: `${feature} requires inspected Quest markup; no adapter is configured.` };
}
