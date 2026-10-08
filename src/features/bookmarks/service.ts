import type { Assignment, Bookmark, Course, Question } from '../../shared/models';
import { execute, type Execute } from '../../shared/client';
import { isBookmark } from '../../shared/validation';
import { sourceUrl } from '../../shared/identity';

export class BookmarkService {
  constructor(private run: Execute = execute) {}

  async add(course: Course, assignment: Assignment, question: Question, note = '', now = new Date().toISOString()) {
    const bookmark: Bookmark = { id: question.id, course, assignment, question, note, createdAt: now, updatedAt: now };
    if (!isBookmark(bookmark) || assignment.kind !== 'homework') throw new Error('A verified homework question is required.');
    return this.run({ kind: 'bookmarks:put', bookmark });
  }

  async remove(questionId: string) { return this.run({ kind: 'bookmarks:remove', questionId }); }

  async list(filter: { courseId?: string; assignmentId?: string } = {}) {
    const { bookmarks } = await this.run({ kind: 'state:read' });
    return bookmarks.filter(b => (!filter.courseId || b.course.id === filter.courseId) && (!filter.assignmentId || b.assignment.id === filter.assignmentId));
  }

  async organized() {
    const groups = new Map<string, Map<string, Bookmark[]>>();
    for (const bookmark of await this.list()) {
      const course = groups.get(bookmark.course.id) || new Map<string, Bookmark[]>();
      course.set(bookmark.assignment.id, [...(course.get(bookmark.assignment.id) || []), bookmark]);
      groups.set(bookmark.course.id, course);
    }
    return groups;
  }
}

export function bookmarkUrl(bookmark: Bookmark): string {
  const url = new URL(sourceUrl(bookmark.question.url));
  if (bookmark.question.anchor !== null) url.hash = bookmark.question.anchor;
  // No artificial question hash or guessed slide number.
  return url.href;
}
