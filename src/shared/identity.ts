import { isStudentPage } from './messages';

function segment(value: string): string {
  if (!value.trim()) throw new Error('A verified Quest source identifier is required.');
  return encodeURIComponent(value);
}

// Source identifiers must come from verified Quest IDs, never titles or positions.
export const courseId = (sourceId: string) => `course:${segment(sourceId)}`;
export const assignmentId = (course: string, sourceId: string) => `${course}/assignment:${segment(sourceId)}`;
export const questionId = (assignment: string, sourceId: string) => `${assignment}/question:${segment(sourceId)}`;

export function sourceUrl(value: string, base?: string): string {
  const url = new URL(value, base);
  if (!isStudentPage(url.href) || url.username || url.password) throw new Error('Expected a Quest student source URL.');
  return url.href;
}
