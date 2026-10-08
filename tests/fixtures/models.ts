import type { Assignment, AssignmentSnapshot, Course, Question, StudyRecord } from '../../src/shared/models';
import { assignmentId, courseId, questionId } from '../../src/shared/identity';

// Synthetic records for contracts only; never loaded into extension UI/storage.
export const now = '2026-10-08T18:00:00.000Z';
export const course: Course = { id: courseId('fixture-course'), sourceId: 'fixture-course', title: 'Fixture course', url: 'https://quest.cns.utexas.edu/student/fixture-course' };
export const assignment: Assignment = {
  id: assignmentId(course.id, 'fixture-homework'), sourceId: 'fixture-homework', courseId: course.id, title: 'Fixture homework',
  url: 'https://quest.cns.utexas.edu/student/fixture-homework', deadline: { iso: null, label: 'Unparsed fixture deadline', timeZone: null },
  completion: 'unknown', kind: 'homework', historical: true,
};
export const question: Question = {
  id: questionId(assignment.id, 'fixture-question'), sourceId: 'fixture-question', courseId: course.id, assignmentId: assignment.id,
  number: '1', url: assignment.url, anchor: null,
  prompt: { status: 'not-extracted', text: null, format: 'plain-text', reason: 'No prompt adapter configured.' },
  answer: { availability: 'unknown', url: null }, solution: { availability: 'unavailable', url: null },
};
export const snapshot = (): AssignmentSnapshot => structuredClone({ sourceUrl: course.url, observedAt: now, courses: [course], assignments: [assignment] });
export const study = (): StudyRecord => structuredClone({ sourceUrl: assignment.url, collectedAt: now, course, assignment, questions: [question] });
