import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isSyncableCourseUrl,
  syncTargetsFromCourses,
  syncCoursesSequentially,
} from '../src/features/assignments/course-sync';
import { courseId } from '../src/shared/identity';

test('only Quest course-show URLs are syncable', () => {
  assert.equal(isSyncableCourseUrl('https://quest.cns.utexas.edu/student/courses/show?course=3491354'), true);
  assert.equal(isSyncableCourseUrl('https://quest.cns.utexas.edu/student/courses'), false);
  assert.equal(isSyncableCourseUrl('https://quest.cns.utexas.edu/student/instances/show?instance=1'), false);
  assert.equal(isSyncableCourseUrl('https://evil.example/student/courses/show?course=1'), false);
});

test('sync targets keep course identity and drop non-course links', () => {
  const targets = syncTargetsFromCourses([
    {
      id: courseId('unique:1'),
      sourceId: 'unique:1',
      title: 'Calc (1)',
      url: 'https://quest.cns.utexas.edu/student/courses/show?course=1',
    },
    {
      id: courseId('unique:2'),
      sourceId: 'unique:2',
      title: 'Bad',
      url: 'https://quest.cns.utexas.edu/student/home',
    },
  ]);
  assert.equal(targets.length, 1);
  assert.equal(targets[0]?.id, courseId('unique:1'));
});

test('sequential sync reports progress and tallies results', async () => {
  const previous = globalThis.chrome;
  const calls: string[] = [];
  globalThis.chrome = {
    runtime: {
      sendMessage: async (message: { url: string }) => {
        calls.push(message.url);
        return { ok: true, result: calls.length === 1 ? 'ok' : 'timeout' };
      },
    },
  } as unknown as typeof chrome;
  try {
    const progress: Array<{ done: number; total: number; title: string | null }> = [];
    const result = await syncCoursesSequentially([
      { id: 'a', url: 'https://quest.cns.utexas.edu/student/courses/show?course=1', title: 'A' },
      { id: 'b', url: 'https://quest.cns.utexas.edu/student/courses/show?course=2', title: 'B' },
    ], (done, total, current) => {
      progress.push({ done, total, title: current?.title ?? null });
    });
    assert.deepEqual(result, { ok: 1, failed: 1 });
    assert.equal(calls.length, 2);
    assert.ok(progress.some(step => step.title === 'A'));
    assert.equal(progress.at(-1)?.done, 2);
  } finally {
    globalThis.chrome = previous;
  }
});
