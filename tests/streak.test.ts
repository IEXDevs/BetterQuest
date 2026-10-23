import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import {
  calculateStreak,
  recordActiveDate,
  updateStreakData,
  reconcileStreak,
  getStreakBadgeStatus,
  getStreakCalendar,
  getCalendarDayIcon,
  type StreakContext,
} from '../src/features/streak/streak-service';
import { createStreakPill } from '../src/features/streak/streak-pill';
import { applyCommand } from '../src/storage/commands';
import { emptyState, type Assignment, type StreakData } from '../src/shared/models';
import { assignmentId, courseId, questionId } from '../src/shared/identity';
import { createPdfAssessmentWorkspace, createSlideAssessmentEnhancement } from '../src/features/assessment/workspace';

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

function homework(partial: Partial<Assignment> = {}): Assignment {
  return {
    id: 'asg_open',
    sourceId: 'a1',
    courseId: 'course_1',
    title: 'Homework 1',
    url: 'https://quest.cns.utexas.edu/student/asg_open',
    completion: 'not-completed',
    kind: 'homework',
    historical: null,
    deadline: { iso: null, label: null, timeZone: null },
    ...partial,
  };
}

test('calculateStreak keeps a streak across days with nothing due', () => {
  const today = '2026-10-19';
  const pastDates = ['2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13'];
  const result = calculateStreak(pastDates, today);
  assert.equal(result.current, 4);
  assert.equal(result.longest, 4);
});

test('calculateStreak breaks when homework was open and no question was answered', () => {
  const today = '2026-10-19';
  const pastDates = ['2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13'];
  const context: StreakContext = {
    now: Date.parse('2026-10-19T18:00:00.000Z'),
    assignments: [homework({
      start: { iso: '2026-10-10T05:00:00.000Z', label: 'Oct 10', timeZone: 'America/Chicago' },
      deadline: { iso: '2026-10-26T04:59:00.000Z', label: 'Oct 25, 11:59 PM CDT', timeZone: 'America/Chicago' },
    })],
  };
  const result = calculateStreak(pastDates, today, [], context);
  assert.equal(result.current, 0);
  assert.equal(result.longest, 4);
});

test('calculateStreak breaks when an assignment is unfinished after its due date', () => {
  const today = '2026-10-19';
  const context: StreakContext = {
    now: Date.parse('2026-10-19T18:00:00.000Z'),
    assignments: [homework({
      start: { iso: '2026-10-17T05:00:00.000Z', label: 'Oct 17', timeZone: 'America/Chicago' },
      deadline: { iso: '2026-10-19T04:59:00.000Z', label: 'Oct 18, 11:59 PM CDT', timeZone: 'America/Chicago' },
    })],
  };
  const answeredOnTheDueDay = calculateStreak(['2026-10-17', '2026-10-18'], today, [], context);
  assert.equal(answeredOnTheDueDay.current, 0);
  const continuedAfter = calculateStreak(['2026-10-17', '2026-10-18', '2026-10-19'], today, [], context);
  assert.equal(continuedAfter.current, 1);
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

test('applyCommand assignment:completion:set does not invent a question day, and clears an overdue break', () => {
  const state = emptyState();
  state.cache.courses = [{ id: 'course_1', sourceId: 'c1', title: 'Calculus', url: 'https://quest.cns.utexas.edu/student/course_1' }];
  state.cache.assignments = [{
    id: 'asg_1',
    sourceId: 'a1',
    courseId: 'course_1',
    title: 'Homework 1',
    url: 'https://quest.cns.utexas.edu/student/asg_1',
    completion: 'not-completed',
    kind: 'homework',
    historical: null,
    start: { iso: '2026-10-17T05:00:00.000Z', label: 'Oct 17', timeZone: 'America/Chicago' },
    deadline: { iso: new Date(Date.now() - 60_000).toISOString(), label: 'Due', timeZone: 'America/Chicago' },
  }];
  state.streak = {
    current: 2,
    longest: 2,
    lastActiveDate: '2026-10-18',
    activeDates: ['2026-10-17', '2026-10-18'],
    freezesAvailable: 0,
    frozenDates: [],
    startDate: '2026-10-17',
  };

  const marked = applyCommand(state, { kind: 'assignment:completion:set', assignmentId: 'asg_1', completed: true });
  assert.deepEqual(marked.streak?.activeDates, ['2026-10-17', '2026-10-18']);
  assert.equal(marked.streak?.current, 2);

  const unmarked = applyCommand(marked, { kind: 'assignment:completion:set', assignmentId: 'asg_1', completed: false });
  assert.equal(unmarked.streak?.current, 0);
});

test('applyCommand bookmarks:put does not advance the streak', () => {
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
  assert.equal(next.streak?.current, 0);
  assert.equal(next.streak?.activeDates.length, 0);
  assert.equal(next.bookmarks.length, 1);
});

test('applyCommand assignments:cache does not advance streak for existing in-progress assignments alone', () => {
  const state = emptyState();
  const cId = courseId('c1');
  const aId = assignmentId(cId, 'a1');
  const snapshot = {
    sourceUrl: 'https://quest.cns.utexas.edu/student/courses/1',
    observedAt: '2026-10-19T12:00:00.000Z',
    courses: [{ id: cId, sourceId: 'c1', title: 'Calculus', url: 'https://quest.cns.utexas.edu/student/courses/1' }],
    assignments: [{
      id: aId,
      sourceId: 'a1',
      courseId: cId,
      title: 'HW 1',
      url: 'https://quest.cns.utexas.edu/student/instances/show',
      completion: 'in-progress' as const,
      kind: 'homework' as const,
      historical: null,
      deadline: { iso: null, label: null, timeZone: null },
    }],
    scannedCourseIds: [cId],
  };

  const next = applyCommand(state, { kind: 'assignments:cache', snapshot });
  assert.equal(next.streak?.current, 0, 'Streak should not advance merely because an assignment is in progress');
  assert.equal(next.streak?.lastActiveDate, null);
  assert.equal(next.streak?.activeDates.length, 0);
});

test('applyCommand assignments:cache advances streak when newly completed work is observed', () => {
  const state = emptyState();
  const cId = courseId('c1');
  const aId = assignmentId(cId, 'a1');
  state.cache.assignments = [{
    id: aId,
    sourceId: 'a1',
    courseId: cId,
    title: 'HW 1',
    url: 'https://quest.cns.utexas.edu/student/instances/show',
    completion: 'not-completed',
    kind: 'homework',
    historical: null,
    deadline: { iso: null, label: null, timeZone: null },
  }];

  const snapshot = {
    sourceUrl: 'https://quest.cns.utexas.edu/student/courses/1',
    observedAt: '2026-10-19T12:00:00.000Z',
    courses: [{ id: cId, sourceId: 'c1', title: 'Calculus', url: 'https://quest.cns.utexas.edu/student/courses/1' }],
    assignments: [{
      id: aId,
      sourceId: 'a1',
      courseId: cId,
      title: 'HW 1',
      url: 'https://quest.cns.utexas.edu/student/instances/show',
      completion: 'completed' as const,
      kind: 'homework' as const,
      historical: null,
      deadline: { iso: null, label: null, timeZone: null },
    }],
    scannedCourseIds: [cId],
  };

  const next = applyCommand(state, { kind: 'assignments:cache', snapshot });
  assert.ok(next.streak);
  assert.ok(next.streak.activeDates.length >= 1);
  assert.ok(next.streak.current >= 1);
});

test('applyCommand assignments:cache breaks the streak when unfinished work is overdue', () => {
  const state = emptyState();
  const cId = courseId('c1');
  const aId = assignmentId(cId, 'a1');
  state.streak = {
    current: 2,
    longest: 2,
    lastActiveDate: '2026-10-18',
    activeDates: ['2026-10-17', '2026-10-18'],
    freezesAvailable: 0,
    frozenDates: [],
    startDate: '2026-10-17',
  };
  const snapshot = {
    sourceUrl: 'https://quest.cns.utexas.edu/student/courses/1',
    observedAt: '2026-10-21T12:00:00.000Z',
    courses: [{ id: cId, sourceId: 'c1', title: 'Calculus', url: 'https://quest.cns.utexas.edu/student/courses/1' }],
    assignments: [homework({
      id: aId,
      sourceId: 'a1',
      courseId: cId,
      url: 'https://quest.cns.utexas.edu/student/instances/show',
      start: { iso: '2026-10-17T05:00:00.000Z', label: 'Oct 17', timeZone: 'America/Chicago' },
      deadline: { iso: new Date(Date.now() - 60_000).toISOString(), label: 'Due', timeZone: 'America/Chicago' },
    })],
    scannedCourseIds: [cId],
  };

  const next = applyCommand(state, { kind: 'assignments:cache', snapshot });
  assert.equal(next.streak?.current, 0);
  assert.deepEqual(next.streak?.activeDates, ['2026-10-17', '2026-10-18']);
});

test('workspace does not advance streak on initial mount of in-progress assignment, but advances when question is submitted', async () => {
  const dom = new JSDOM('<main id="main-content"><div id="target">' +
    '<p id="due">Due date 10/14/26 11:59 PM</p>' +
    '<div id="pdf-frame"><div id="presentation-pdf-frame"><iframe title="Assignment PDF" src="/student/images/problem_pdf?instance=courseuserassignment_1"></iframe></div></div>' +
    '<div id="view-responses-table-id"><table id="instance-table-courseuserassignment_1"><tbody>' +
    '<tr data-id="cuaip_1"><td>1.</td><td><select name="response"><option value=""></option><option value="1" selected>1</option></select></td><td class="status"></td><td class="previous">1 / 3</td><td><button type="button" class="submit" aria-label="Submit response">Submit</button></td></tr>' +
    '</tbody></table></div></div></main>', { url: 'https://quest.cns.utexas.edu/student/instances/show?instance=courseuserassignment_1', pretendToBeVisual: true });
  const doc = dom.window.document;
  const root = doc.querySelector<HTMLElement>('#target')!;
  let streakRecorded = false;
  const run = async (command: any) => {
    if (command.kind === 'streak:record') streakRecorded = true;
    return emptyState();
  };
  const workspace = createPdfAssessmentWorkspace(root, { run });
  workspace.reconcile();
  assert.equal(streakRecorded, false, 'Streak should NOT be recorded on initial load of an in-progress assignment');

  const submitBtn = root.querySelector<HTMLButtonElement>('.submit') || root.querySelector<HTMLButtonElement>('button[aria-label="Submit response"]');
  submitBtn?.click();
  assert.ok(streakRecorded, 'Streak should be recorded when a question is submitted');

  workspace.dispose();
  dom.window.close();
});

test('slide assessment advances streak when a question submit button is clicked', async () => {
  const dom = new JSDOM('<div id="presentation-div"><div class="instanceitempart">' +
    '<input type="radio" name="response_1" value="1" checked>' +
    '<button type="button" class="submit-btn">Submit</button>' +
    '</div></div>');
  const doc = dom.window.document;
  const root = doc.querySelector<HTMLElement>('#presentation-div')!;
  let streakRecorded = false;
  const run = async (command: any) => {
    if (command.kind === 'streak:record') streakRecorded = true;
    return emptyState();
  };
  const enhancement = createSlideAssessmentEnhancement(root, { run });
  enhancement.reconcile();
  const btn = root.querySelector<HTMLButtonElement>('.submit-btn')!;
  btn.click();
  assert.ok(streakRecorded, 'Streak should be recorded when a slide question submit button is clicked');
  enhancement.dispose();
  dom.window.close();
});

test('updateStreakData awards 2 freezes on 5-day streak milestone', () => {
  let streak = updateStreakData(null, '2026-10-01');
  assert.equal(streak.current, 1);
  assert.equal(streak.freezesAvailable, 0);

  streak = updateStreakData(streak, '2026-10-02');
  assert.equal(streak.current, 2);
  assert.equal(streak.freezesAvailable, 0);

  streak = updateStreakData(streak, '2026-10-03');
  assert.equal(streak.current, 3);
  assert.equal(streak.freezesAvailable, 0);

  streak = updateStreakData(streak, '2026-10-04');
  assert.equal(streak.current, 4);
  assert.equal(streak.freezesAvailable, 0);

  // Day 5 completed: awards 2 freezes
  streak = updateStreakData(streak, '2026-10-05');
  assert.equal(streak.current, 5);
  assert.equal(streak.freezesAvailable, 2);

  // Additional activity on Day 5 does not double-award freezes
  streak = updateStreakData(streak, '2026-10-05');
  assert.equal(streak.current, 5);
  assert.equal(streak.freezesAvailable, 2);

  // Completing up to Day 10 awards 2 more freezes
  streak = updateStreakData(streak, '2026-10-06');
  streak = updateStreakData(streak, '2026-10-07');
  streak = updateStreakData(streak, '2026-10-08');
  streak = updateStreakData(streak, '2026-10-09');
  streak = updateStreakData(streak, '2026-10-10');
  assert.equal(streak.current, 10);
  assert.equal(streak.freezesAvailable, 4);
});

const openHomework: StreakContext = {
  now: Date.parse('2026-10-07T18:00:00.000Z'),
  assignments: [homework({
    start: { iso: '2026-10-01T05:00:00.000Z', label: 'Oct 1', timeZone: 'America/Chicago' },
    deadline: { iso: '2026-10-11T04:59:00.000Z', label: 'Oct 10, 11:59 PM CDT', timeZone: 'America/Chicago' },
  })],
};

test('updateStreakData does not spend a freeze when nothing is due', () => {
  let streak: StreakData = {
    current: 5,
    longest: 5,
    lastActiveDate: '2026-10-05',
    activeDates: ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05'],
    freezesAvailable: 2,
    frozenDates: [],
    startDate: '2026-10-01',
  };

  streak = updateStreakData(streak, '2026-10-07');
  assert.equal(streak.current, 6);
  assert.equal(streak.freezesAvailable, 2);
  assert.deepEqual(streak.frozenDates, []);
  assert.ok(streak.activeDates.includes('2026-10-07'));
});

test('updateStreakData consumes a freeze when homework was skipped', () => {
  let streak: StreakData = {
    current: 5,
    longest: 5,
    lastActiveDate: '2026-10-05',
    activeDates: ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05'],
    freezesAvailable: 2,
    frozenDates: [],
    startDate: '2026-10-01',
  };

  streak = updateStreakData(streak, '2026-10-07', openHomework);
  assert.equal(streak.current, 7);
  assert.equal(streak.freezesAvailable, 1);
  assert.deepEqual(streak.frozenDates, ['2026-10-06']);
  assert.ok(streak.activeDates.includes('2026-10-07'));
});

test('reconcileStreak leaves a rest day alone and protects a skipped homework day', () => {
  const streak = {
    current: 5,
    longest: 5,
    lastActiveDate: '2026-10-05',
    activeDates: ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05'],
    freezesAvailable: 2,
    frozenDates: [],
    startDate: '2026-10-01',
  };

  const rested = reconcileStreak(streak, '2026-10-07');
  assert.equal(rested.current, 5);
  assert.equal(rested.freezesAvailable, 2);
  assert.deepEqual(rested.frozenDates, []);

  const protectedDay = reconcileStreak(streak, '2026-10-07', openHomework);
  assert.equal(protectedDay.current, 6);
  assert.equal(protectedDay.freezesAvailable, 1);
  assert.deepEqual(protectedDay.frozenDates, ['2026-10-06']);
});

test('getStreakBadgeStatus reflects active, frozen, and broken states with proper colors', () => {
  // Day 1 completed today -> green (active)
  const day1Done = {
    current: 1,
    longest: 1,
    lastActiveDate: '2026-10-19',
    activeDates: ['2026-10-19'],
    freezesAvailable: 0,
    frozenDates: [],
    startDate: '2026-10-19',
  };
  const status1 = getStreakBadgeStatus(day1Done, '2026-10-19');
  assert.equal(status1.status, 'active');
  assert.equal(status1.count, 1);

  // Freeze active today or yesterday -> blue (frozen)
  const freezeActive = {
    current: 5,
    longest: 5,
    lastActiveDate: '2026-10-17',
    activeDates: ['2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17'],
    freezesAvailable: 1,
    frozenDates: ['2026-10-18'],
    startDate: '2026-10-13',
  };
  const statusFrozen = getStreakBadgeStatus(freezeActive, '2026-10-19');
  assert.equal(statusFrozen.status, 'frozen');

  const restedStreak = {
    current: 0,
    longest: 5,
    lastActiveDate: '2026-10-10',
    activeDates: ['2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10'],
    freezesAvailable: 0,
    frozenDates: [],
    startDate: '2026-10-06',
  };
  const statusRested = getStreakBadgeStatus(restedStreak, '2026-10-19');
  assert.equal(statusRested.status, 'active');
  assert.equal(statusRested.count, 5);

  const overdue = homework({
    start: { iso: '2026-10-06T05:00:00.000Z', label: 'Oct 6', timeZone: 'America/Chicago' },
    deadline: { iso: '2026-10-11T04:59:00.000Z', label: 'Oct 10, 11:59 PM CDT', timeZone: 'America/Chicago' },
  });
  const statusBroken = getStreakBadgeStatus(restedStreak, '2026-10-19', {
    now: Date.parse('2026-10-19T18:00:00.000Z'),
    assignments: [overdue],
  });
  assert.equal(statusBroken.status, 'broken');
  assert.equal(statusBroken.count, 0);
});

test('getStreakCalendar generates months starting from start date up to current month', () => {
  const streak = {
    current: 3,
    longest: 5,
    lastActiveDate: '2026-10-19',
    activeDates: ['2026-08-15', '2026-09-01', '2026-10-17', '2026-10-18', '2026-10-19'],
    freezesAvailable: 2,
    frozenDates: ['2026-09-02'],
    startDate: '2026-08-15',
  };

  const calendar = getStreakCalendar(streak, '2026-10-19');
  // Starts in August 2026 and ends in October 2026 -> 3 months: Aug, Sep, Oct
  assert.equal(calendar.length, 3);
  assert.equal(calendar[0].month, 7); // 0-indexed: 7 is August
  assert.equal(calendar[1].month, 8); // 8 is September
  assert.equal(calendar[2].month, 9); // 9 is October

  // In August: Aug 1 to Aug 14 are before start (grey hyphen)
  const aug1 = calendar[0].days.find(d => d.day === 1)!;
  assert.equal(aug1.status, 'before-start');
  assert.equal(getCalendarDayIcon(aug1.status), '—');

  const aug14 = calendar[0].days.find(d => d.day === 14)!;
  assert.equal(aug14.status, 'before-start');

  // Aug 15 was active -> fire 🔥
  const aug15 = calendar[0].days.find(d => d.day === 15)!;
  assert.equal(aug15.status, 'active');
  assert.equal(getCalendarDayIcon(aug15.status), '🔥');

  // In September: Sep 2 was frozen -> ice 🧊
  const sep2 = calendar[1].days.find(d => d.day === 2)!;
  assert.equal(sep2.status, 'frozen');
  assert.equal(getCalendarDayIcon(sep2.status), '🧊');

  // Sep 3 had nothing due, so it is a rest day
  const sep3 = calendar[1].days.find(d => d.day === 3)!;
  assert.equal(sep3.status, 'rest');
  assert.equal(getCalendarDayIcon(sep3.status), '—');

  // In October: Oct 25 is future -> grey hyphen
  const oct25 = calendar[2].days.find(d => d.day === 25)!;
  assert.equal(oct25.status, 'future');
  assert.equal(getCalendarDayIcon(oct25.status), '—');

  const withHomework = getStreakCalendar(streak, '2026-10-19', {
    now: Date.parse('2026-10-19T18:00:00.000Z'),
    assignments: [homework({
      start: { iso: '2026-10-16T05:00:00.000Z', label: 'Oct 16', timeZone: 'America/Chicago' },
      deadline: { iso: '2026-10-26T04:59:00.000Z', label: 'Oct 25, 11:59 PM CDT', timeZone: 'America/Chicago' },
    })],
  });
  const oct16 = withHomework[2].days.find(d => d.day === 16)!;
  assert.equal(oct16.status, 'missed');
  assert.equal(getCalendarDayIcon(oct16.status), '❌');
  assert.equal(oct16.reason, 'Streak canceled: homework was open and no question was answered');

  const overdue = getStreakCalendar(streak, '2026-10-19', {
    now: Date.parse('2026-10-19T18:00:00.000Z'),
    assignments: [homework({
      start: { iso: '2026-10-16T05:00:00.000Z', label: 'Oct 16', timeZone: 'America/Chicago' },
      deadline: { iso: '2026-10-18T04:59:00.000Z', label: 'Oct 17, 11:59 PM CDT', timeZone: 'America/Chicago' },
    })],
  });
  const dueDay = overdue[2].days.find(d => d.dateStr === '2026-10-17')!;
  assert.equal(dueDay.status, 'missed');
  assert.equal(dueDay.reason, 'Streak canceled: an assignment was still unfinished after the due date');
});

test('createStreakPill renders active green badge with fire icon, freezes, and interactive calendar popover', () => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  const doc = dom.window.document;

  const streak = {
    current: 5,
    longest: 10,
    lastActiveDate: '2026-10-19',
    activeDates: ['2026-08-15', '2026-09-01', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18', '2026-10-19'],
    freezesAvailable: 2,
    frozenDates: ['2026-09-02'],
    startDate: '2026-08-15',
  };

  const pill = createStreakPill(streak, '2026-10-19', doc);
  doc.body.append(pill.element);

  const badge = pill.element.querySelector('.streak-badge')!;
  assert.ok(badge);
  assert.ok(badge.classList.contains('active'), 'Badge should have active class');
  assert.equal(badge.getAttribute('data-state'), 'active');
  assert.equal(badge.querySelector('span')?.textContent, '8 day streak');
  assert.equal(badge.querySelector('.streak-freeze-tag')?.textContent, '🧊2');
  assert.equal(badge.querySelector('.streak-freeze-tag')?.getAttribute('title'), 'Get a 5 day streak for 2 freezes');

  const popover = pill.element.querySelector('.streak-calendar-popover')!;
  assert.ok(popover);
  assert.match(popover.querySelector('.streak-cal-title')?.textContent || '', /October 2026/);
  assert.match(popover.querySelector('.streak-stat-count')?.textContent || '', /8 day streak/);
  assert.match(popover.querySelector('.streak-stat-freezes')?.textContent || '', /2 freezes left/);
  assert.equal(popover.querySelector('.streak-stat-freezes')?.getAttribute('title'), 'Get a 5 day streak for 2 freezes');

  // Month navigation: Next button should be disabled because October is the current month
  const nextBtn = popover.querySelector<HTMLButtonElement>('.streak-cal-next')!;
  assert.ok(nextBtn.disabled, 'Next button should be disabled at current month');

  // Prev button should be enabled
  const prevBtn = popover.querySelector<HTMLButtonElement>('.streak-cal-prev')!;
  assert.ok(!prevBtn.disabled, 'Prev button should be enabled');

  // Clicking prev moves to September 2026
  prevBtn.click();
  assert.match(popover.querySelector('.streak-cal-title')?.textContent || '', /September 2026/);

  // In September, day 2 was frozen
  const sep2Cell = popover.querySelector<HTMLElement>('.streak-cal-cell[data-date="2026-09-02"]')!;
  assert.ok(sep2Cell);
  assert.equal(sep2Cell.dataset.status, 'frozen');
  assert.equal(sep2Cell.querySelector('.streak-cal-icon')?.textContent, '🧊');

  const sep3Cell = popover.querySelector<HTMLElement>('.streak-cal-cell[data-date="2026-09-03"]')!;
  assert.equal(sep3Cell.dataset.status, 'rest');
  const sep3Tip = sep3Cell.querySelector('.streak-day-tip');
  assert.equal(sep3Tip?.tagName, 'DIV');
  assert.equal(sep3Tip?.textContent, 'Streak kept: nothing was due');
  sep3Cell.dispatchEvent(new dom.window.MouseEvent('mouseenter', { bubbles: true }));
  assert.ok(sep3Cell.classList.contains('is-hovered'), 'Hovering a day should reveal why the streak was kept');
  sep3Cell.dispatchEvent(new dom.window.MouseEvent('mouseleave', { bubbles: true }));
  assert.ok(!sep3Cell.classList.contains('is-hovered'));

  // Clicking prev again moves to August 2026 (the start month)
  const prevBtn2 = popover.querySelector<HTMLButtonElement>('.streak-cal-prev')!;
  prevBtn2.click();
  assert.match(popover.querySelector('.streak-cal-title')?.textContent || '', /August 2026/);
  const prevBtn3 = popover.querySelector<HTMLButtonElement>('.streak-cal-prev')!;
  assert.ok(prevBtn3.disabled, 'Prev button should be disabled at start month');

  // In August, day 1 is before-start (grey hyphen)
  const aug1Cell = popover.querySelector<HTMLElement>('.streak-cal-cell[data-date="2026-08-01"]')!;
  assert.ok(aug1Cell);
  assert.equal(aug1Cell.dataset.status, 'before-start');
  assert.equal(aug1Cell.querySelector('.streak-cal-icon')?.textContent, '—');

  // In August, day 15 is active (fire 🔥)
  const aug15Cell = popover.querySelector<HTMLElement>('.streak-cal-cell[data-date="2026-08-15"]')!;
  assert.ok(aug15Cell);
  assert.equal(aug15Cell.dataset.status, 'active');
  assert.equal(aug15Cell.querySelector('.streak-cal-icon')?.textContent, '🔥');

  dom.window.close();
});

test('createStreakPill updates to blue frozen state and red broken state', () => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  const doc = dom.window.document;

  const pill = createStreakPill(null, '2026-10-19', doc);
  doc.body.append(pill.element);

  const badge = pill.element.querySelector('.streak-badge')!;
  // Initial empty streak is broken (0 day streak)
  assert.ok(badge.classList.contains('broken'));
  assert.equal(badge.getAttribute('data-state'), 'broken');
  assert.equal(badge.querySelector('span')?.textContent, '0 day streak');

  // Update with frozen streak
  const frozenStreak = {
    current: 4,
    longest: 4,
    lastActiveDate: '2026-10-17',
    activeDates: ['2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17'],
    freezesAvailable: 1,
    frozenDates: ['2026-10-18'],
    startDate: '2026-10-14',
  };
  pill.update(frozenStreak, '2026-10-19');

  assert.ok(badge.classList.contains('frozen'), 'Badge should have frozen class');
  assert.equal(badge.getAttribute('data-state'), 'frozen');
  assert.equal(badge.querySelector('span')?.textContent, '5 day streak');

  dom.window.close();
});

test('createStreakPill opens and closes the calendar immediately on hover', () => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  const doc = dom.window.document;

  const pill = createStreakPill(null, '2026-10-19', doc);
  doc.body.append(pill.element);

  assert.ok(!pill.element.classList.contains('is-open'));

  pill.element.dispatchEvent(new dom.window.MouseEvent('mouseenter', { bubbles: true }));
  assert.ok(pill.element.classList.contains('is-open'), 'Calendar should open as soon as the pointer enters');
  assert.equal(pill.element.querySelector('.streak-badge')?.getAttribute('aria-expanded'), 'true');

  pill.element.dispatchEvent(new dom.window.MouseEvent('mouseleave', { bubbles: true }));
  assert.ok(!pill.element.classList.contains('is-open'), 'Calendar should close as soon as the pointer leaves');
  assert.equal(pill.element.querySelector('.streak-badge')?.getAttribute('aria-expanded'), 'false');

  dom.window.close();
});


