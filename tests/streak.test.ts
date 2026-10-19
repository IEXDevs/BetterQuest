import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateStreak, recordActiveDate } from '../src/features/streak/streak-service';
import { applyCommand } from '../src/storage/commands';
import { emptyState } from '../src/shared/models';
import { assignmentId, courseId, questionId } from '../src/shared/identity';

test('calculateStreak returns 0 for empty active dates', () => {
  const result = calculateStreak([]);
  assert.equal(result.current, 0);
  assert.equal(result.longest, 0);
});

test('calculateStreak counts 1 day when active today', () => {
  const today = '2026-10-19';
  const result = calculateStreak(['2026-10-19'], today);
  assert.equal(result.current, 1);
  assert.equal(result.longest, 1);
});

test('calculateStreak maintains streak if active yesterday but not yet today', () => {
  const today = '2026-10-19';
  const yesterday = '2026-10-18';
  const result = calculateStreak([yesterday], today);
  assert.equal(result.current, 1);
  assert.equal(result.longest, 1);
});

test('calculateStreak counts multi-day consecutive streak ending today', () => {
  const today = '2026-10-19';
  const dates = ['2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18', '2026-10-19'];
  const result = calculateStreak(dates, today);
  assert.equal(result.current, 5);
  assert.equal(result.longest, 5);
});

test('calculateStreak resets current to 0 if inactive yesterday and today, but preserves longest', () => {
  const today = '2026-10-19';
  const pastDates = ['2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13']; // 4-day streak in past
  const result = calculateStreak(pastDates, today);
  assert.equal(result.current, 0);
  assert.equal(result.longest, 4);
});

test('recordActiveDate adds date uniquely and keeps sorted', () => {
  const initial = ['2026-10-17', '2026-10-18'];
  const updated = recordActiveDate(initial, '2026-10-19');
  assert.deepEqual(updated, ['2026-10-17', '2026-10-18', '2026-10-19']);

  const duplicate = recordActiveDate(updated, '2026-10-18');
  assert.deepEqual(duplicate, ['2026-10-17', '2026-10-18', '2026-10-19']);
});

test('applyCommand streak:record updates state.streak', () => {
  const state = emptyState();
  const next = applyCommand(state, { kind: 'streak:record', date: '2026-10-19' });
  assert.ok(next.streak);
  assert.equal(next.streak.lastActiveDate, '2026-10-19');
  assert.ok(next.streak.activeDates.includes('2026-10-19'));
  assert.ok(next.streak.current >= 1);
});

test('applyCommand assignment:completion:set automatically advances streak', () => {
  const state = emptyState();
  state.cache.courses = [{ id: 'course_1', sourceId: 'c1', title: 'Calculus', url: 'https://quest.cns.utexas.edu/student/course_1' }];
  state.cache.assignments = [{
    id: 'asg_1',
    sourceId: 'a1',
    courseId: 'course_1',
    title: 'Homework 1',
    url: 'https://quest.cns.utexas.edu/student/asg_1',
    completion: 'in-progress',
    kind: 'homework',
    historical: null,
    deadline: { iso: '2026-10-25T00:00:00Z', label: 'Oct 25', timeZone: 'America/Chicago' },
  }];

  const next = applyCommand(state, { kind: 'assignment:completion:set', assignmentId: 'asg_1', completed: true });
  assert.ok(next.streak);
  assert.ok(next.streak.activeDates.length >= 1);
  assert.ok(next.streak.current >= 1);
});

test('applyCommand bookmarks:put automatically advances streak', () => {
  const state = emptyState();
  const cId = courseId('c1');
  const course = { id: cId, sourceId: 'c1', title: 'Physics', url: 'https://quest.cns.utexas.edu/student/course_1' };
  const aId = assignmentId(cId, 'a1');
  const assignment = {
    id: aId,
    sourceId: 'a1',
    courseId: cId,
    title: 'HW 1',
    url: 'https://quest.cns.utexas.edu/student/instances/show',
    completion: 'unknown' as const,
    kind: 'homework' as const,
    historical: null,
    deadline: { iso: null, label: null, timeZone: null },
  };
  const qId = questionId(aId, 'q1');
  const question = {
    id: qId,
    sourceId: 'q1',
    courseId: cId,
    assignmentId: aId,
    number: '1',
    url: 'https://quest.cns.utexas.edu/student/instances/show',
    anchor: null,
    prompt: { status: 'not-extracted' as const, text: null, format: 'plain-text' as const, reason: null },
    answer: { availability: 'unknown' as const, url: null },
    solution: { availability: 'unknown' as const, url: null },
  };
  const bookmark = {
    id: question.id,
    course,
    assignment,
    question,
    note: '',
    createdAt: '2026-10-19T10:00:00.000Z',
    updatedAt: '2026-10-19T10:00:00.000Z',
  };

  const next = applyCommand(state, { kind: 'bookmarks:put', bookmark });
  assert.ok(next.streak);
  assert.ok(next.streak.activeDates.length >= 1);
  assert.ok(next.streak.current >= 1);
});
