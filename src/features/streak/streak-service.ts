import type { Assignment, StreakData } from '../../shared/models';



const KNOWN_INCOMPLETE = new Set<Assignment['completion']>(['not-completed', 'in-progress', 'not-started']);

export interface StreakContext {
  assignments?: Assignment[];
  completionOverrides?: Partial<Record<string, true>>;
  /** Evaluation clock. Defaults to the current time so overdue checks stay live. */
  now?: number;
}

/** Returns local date in YYYY-MM-DD format (respects student local timezone). */
export function localDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function validDate(value: string | null | undefined): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function shiftDay(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T12:00:00`);
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

function zonedDay(iso: string, timeZone: string | null | undefined): string | null {
  const instant = Date.parse(iso);
  if (!Number.isFinite(instant)) return null;
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone || 'America/Chicago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date(instant));
    const year = parts.find(part => part.type === 'year')?.value;
    const month = parts.find(part => part.type === 'month')?.value;
    const day = parts.find(part => part.type === 'day')?.value;
    return year && month && day ? `${year}-${month}-${day}` : null;
  } catch {
    return null;
  }
}

function finished(assignment: Assignment, overrides?: StreakContext['completionOverrides']): boolean {
  return assignment.completion === 'completed' || overrides?.[assignment.id] === true;
}

function knownIncomplete(assignment: Assignment, overrides?: StreakContext['completionOverrides']): boolean {
  return !finished(assignment, overrides) && KNOWN_INCOMPLETE.has(assignment.completion);
}

interface StreakFacts {
  hardBreaks: Set<string>;
  obligations: Set<string>;
  assignmentDays: Set<string>;
}

function addRange(days: Set<string>, start: string, end: string) {
  let day = end;
  for (let step = 0; step < 500 && day >= start; step++) {
    days.add(day);
    if (day === start) break;
    day = shiftDay(day, -1);
  }
}

/**
 * Homework that is actually open creates a question obligation.
 * An unfinished assignment past its deadline is a hard break on the due day.
 * Unknown dates are not backfilled across history.
 */
function buildFacts(today: string, context?: StreakContext, brokenDates?: string[]): StreakFacts {
  const hardBreaks = new Set<string>(brokenDates?.filter(validDate) ?? []);
  const obligations = new Set<string>();
  const assignmentDays = new Set<string>();
  const now = context?.now ?? Date.now();
  const overrides = context?.completionOverrides;
  const yesterday = shiftDay(today, -1);

  for (const assignment of context?.assignments ?? []) {
    const startDay = assignment.start?.iso ? zonedDay(assignment.start.iso, assignment.start.timeZone) : null;
    const dueDay = assignment.deadline?.iso ? zonedDay(assignment.deadline.iso, assignment.deadline.timeZone) : null;
    const dueInstant = assignment.deadline?.iso ? Date.parse(assignment.deadline.iso) : NaN;
    const overdue = Number.isFinite(dueInstant) && dueInstant < now;

    if (startDay && dueDay) {
      addRange(assignmentDays, startDay, dueDay <= today ? dueDay : today);
    } else if (dueDay) {
      assignmentDays.add(dueDay);
    } else if (startDay) {
      addRange(assignmentDays, startDay, today);
    } else {
      assignmentDays.add(today);
    }

    // Data cannot be changed from the past:
    // If an assignment was overdue and its deadline was in the past (dueDay < today),
    // and Quest observed it as incomplete (assignment.completion !== 'completed'),
    // an overdue break occurred on that past day. Marking it done later cannot erase that past break.
    const isPastDue = dueDay !== null && dueDay < today && overdue;
    if (isPastDue && assignment.completion !== 'completed') {
      hardBreaks.add(dueDay);
    }

    if (!knownIncomplete(assignment, overrides)) continue;

    if (overdue) hardBreaks.add(dueDay && dueDay <= today ? dueDay : today);
    if (startDay && startDay > today) continue;

    if (startDay) {
      const windowEnd = dueDay && dueDay < yesterday ? dueDay : yesterday;
      if (windowEnd >= startDay) addRange(obligations, startDay, windowEnd);
      if (!overdue && today >= startDay && (!dueDay || today <= dueDay)) obligations.add(today);
    } else if (dueDay) {
      if (dueDay < today) obligations.add(dueDay);
      if (!overdue && today <= dueDay) obligations.add(today);
    } else {
      obligations.add(today);
    }
  }

  for (const day of hardBreaks) obligations.delete(day);
  return { hardBreaks, obligations, assignmentDays };
}



function earliestMark(dates: string[], today: string): string {
  let earliest = today;
  for (const day of dates) {
    if (validDate(day) && day < earliest) earliest = day;
  }
  return earliest;
}

export interface AccountStreakResult {
  current: number;
  longest: number;
  keptRest: Set<string>;
  milestones: number;
  freezesAvailable: number;
  frozenDates: string[];
  brokenDates: string[];
}

/**
 * Current streak counts question days, freezes, and days with nothing due.
 * A rest day counts once a streak is already going. It does not start a streak by itself,
 * and it does not break one. Today stays open until the day is over or a question is answered.
 * A missed question day, or an unfinished assignment past its due date, ends the streak
 * unless protected by an earned streak freeze.
 */
export function calculateStreak(
  activeDates: string[],
  todayStr: string = localDateString(),
  frozenDates: string[] = [],
  context?: StreakContext,
  brokenDates?: string[],
): { current: number; longest: number } {
  const { current, longest } = accountStreak(activeDates, todayStr, frozenDates, context, brokenDates);
  return { current, longest };
}

function accountStreak(
  activeDates: string[],
  todayStr: string,
  existingFrozen: string[] = [],
  context?: StreakContext,
  brokenDates: string[] = [],
  storedFreezes?: number,
  autoSpendFreezes: boolean = false,
): AccountStreakResult {
  const active = new Set(activeDates.filter(validDate));
  const facts = buildFacts(todayStr, context, brokenDates);
  const previouslyFrozen = new Set(existingFrozen.filter(validDate));
  const limit = earliestMark([...active, ...previouslyFrozen], todayStr);

  function simulate(extraBanked: number): AccountStreakResult {
    let run = 0;
    let alive = false;
    let milestonesInRun = 0;
    let freezesInPocket = extraBanked;
    const frozenDates = new Set<string>(previouslyFrozen);
    const keptRest = new Set<string>();
    const recordedBreaks = new Set<string>();
    const runs: number[] = [];

    let day = limit;
    for (let step = 0; step < 500; step++) {
      const isToday = day === todayStr;
      const isActive = active.has(day);
      const isPreviouslyFrozen = previouslyFrozen.has(day);
      const isHardBreak = facts.hardBreaks.has(day);
      const isObligation = facts.obligations.has(day);

      if (isPreviouslyFrozen) {
        alive = true;
        freezesInPocket = Math.max(0, freezesInPocket - 1);
        frozenDates.add(day);
        run += 1;
        const currentMilestones = Math.floor(run / 5);
        if (currentMilestones > milestonesInRun) {
          freezesInPocket += (currentMilestones - milestonesInRun) * 2;
          milestonesInRun = currentMilestones;
        }
      } else if (isHardBreak && !isToday) {
        const canFreeze = autoSpendFreezes && alive && freezesInPocket > 0 && facts.assignmentDays.has(day);
        if (canFreeze) {
          freezesInPocket -= 1;
          frozenDates.add(day);
          run += 1;
          const currentMilestones = Math.floor(run / 5);
          if (currentMilestones > milestonesInRun) {
            freezesInPocket += (currentMilestones - milestonesInRun) * 2;
            milestonesInRun = currentMilestones;
          }
        } else {
          if (run > 0) runs.push(run);
          run = 0;
          alive = false;
          milestonesInRun = 0;
          recordedBreaks.add(day);
        }
      } else if (isActive) {
        alive = true;
        run += 1;
        const currentMilestones = Math.floor(run / 5);
        if (currentMilestones > milestonesInRun) {
          freezesInPocket += (currentMilestones - milestonesInRun) * 2;
          milestonesInRun = currentMilestones;
        }
      } else if (isObligation) {
        if (isToday) {
          // Today is still ongoing; question can still be answered
        } else if (autoSpendFreezes && alive && freezesInPocket > 0) {
          // A freeze covers this missed day
          freezesInPocket -= 1;
          frozenDates.add(day);
          run += 1;
          const currentMilestones = Math.floor(run / 5);
          if (currentMilestones > milestonesInRun) {
            freezesInPocket += (currentMilestones - milestonesInRun) * 2;
            milestonesInRun = currentMilestones;
          }
        } else {
          // No freeze available or auto-spend disabled; streak breaks
          if (run > 0) runs.push(run);
          run = 0;
          alive = false;
          milestonesInRun = 0;
          recordedBreaks.add(day);
        }
      } else {
        // Rest day: nothing was due
        if (isToday) {
          // Today is open and pending
        } else if (alive) {
          keptRest.add(day);
          run += 1;
          const currentMilestones = Math.floor(run / 5);
          if (currentMilestones > milestonesInRun) {
            freezesInPocket += (currentMilestones - milestonesInRun) * 2;
            milestonesInRun = currentMilestones;
          }
        } else {
          run = 0;
        }
      }

      if (isToday) {
        if (run > 0) runs.push(run);
        break;
      }
      day = shiftDay(day, 1);
    }

    const current = run;
    const longest = runs.reduce((best, len) => Math.max(best, len), current);
    const milestones = runs.reduce((tot, len) => tot + Math.floor(len / 5), 0);
    const finalBroken = [...new Set([...brokenDates, ...recordedBreaks])]
      .filter(d => validDate(d) && !frozenDates.has(d))
      .sort()
      .slice(-180);

    return {
      current,
      longest,
      keptRest,
      milestones,
      freezesAvailable: freezesInPocket,
      frozenDates: [...frozenDates].sort().slice(-180),
      brokenDates: finalBroken,
    };
  }

  const initial = simulate(0);
  const visibleEarned = initial.milestones * 2;
  if (storedFreezes !== undefined && storedFreezes > visibleEarned) {
    const extraBanked = storedFreezes - visibleEarned;
    return simulate(extraBanked);
  }
  return initial;
}

/** Records an active date and returns an updated, trimmed list (last 180 active dates). */
export function recordActiveDate(
  activeDates: string[] = [],
  dateStr: string = localDateString()
): string[] {
  if (!validDate(dateStr)) return activeDates;
  const set = new Set(activeDates.filter(validDate));
  set.add(dateStr);
  const sorted = [...set].sort();
  return sorted.slice(-180);
}

/**
 * Records a question day. Freezes cover skipped homework days only.
 * A day with nothing available does not spend a freeze.
 */
export function updateStreakData(
  currentStreak?: StreakData | null,
  newDate: string = localDateString(),
  context?: StreakContext,
): StreakData {
  const existingDates = currentStreak?.activeDates || [];
  const existingFrozen = currentStreak?.frozenDates || [];
  const existingBroken = currentStreak?.brokenDates || [];
  const startDate = currentStreak?.startDate || (existingDates[0] ? [...existingDates].sort()[0] : newDate);
  const activeDates = recordActiveDate(existingDates, newDate);

  const result = accountStreak(
    activeDates,
    newDate,
    existingFrozen,
    context,
    existingBroken,
    currentStreak?.freezesAvailable,
    true,
  );

  const prevLongest = currentStreak?.longest || 0;

  return {
    current: result.current,
    longest: Math.max(result.longest, prevLongest),
    lastActiveDate: newDate,
    activeDates,
    freezesAvailable: result.freezesAvailable,
    frozenDates: result.frozenDates,
    startDate,
    brokenDates: result.brokenDates,
    freezeMilestonesAwarded: result.milestones,
  };
}

/**
 * Reconciles current streak state for display (e.g. on page load without an active submit today).
 * Spends a freeze only when a past day had homework and no question.
 * An unfinished assignment past its due date breaks the streak and cannot be frozen.
 */
export function reconcileStreak(
  currentStreak?: StreakData | null,
  todayStr: string = localDateString(),
  context?: StreakContext,
): StreakData {
  if (!currentStreak) {
    return { current: 0, longest: 0, lastActiveDate: null, activeDates: [], freezesAvailable: 0, frozenDates: [], startDate: null, brokenDates: [] };
  }
  const existingDates = currentStreak.activeDates || [];
  const existingFrozen = currentStreak.frozenDates || [];
  const existingBroken = currentStreak.brokenDates || [];
  const startDate = currentStreak.startDate || (existingDates[0] ? [...existingDates].sort()[0] : null);

  const result = accountStreak(
    existingDates,
    todayStr,
    existingFrozen,
    context,
    existingBroken,
    currentStreak.freezesAvailable,
    true,
  );

  return {
    current: result.current,
    longest: Math.max(result.longest, currentStreak.longest || 0),
    lastActiveDate: currentStreak.lastActiveDate,
    activeDates: existingDates,
    freezesAvailable: result.freezesAvailable,
    frozenDates: result.frozenDates,
    startDate,
    brokenDates: result.brokenDates,
    freezeMilestonesAwarded: result.milestones,
  };
}

export type StreakBadgeStatus = 'active' | 'frozen' | 'broken';

/** Returns the display status for the badge/pill. */
export function getStreakBadgeStatus(
  streak?: StreakData | null,
  todayStr: string = localDateString(),
  context?: StreakContext,
): {
  status: StreakBadgeStatus;
  label: string;
  count: number;
  freezesAvailable: number;
} {
  const activeDates = streak?.activeDates || [];
  const frozenDates = streak?.frozenDates || [];
  const brokenDates = streak?.brokenDates || [];
  const freezesAvailable = streak?.freezesAvailable || 0;
  const { current } = calculateStreak(activeDates, todayStr, frozenDates, context, brokenDates);
  const todayDone = activeDates.includes(todayStr);
  const yesterdayFrozen = frozenDates.includes(shiftDay(todayStr, -1));
  const todayFrozen = frozenDates.includes(todayStr);

  let status: StreakBadgeStatus = 'broken';
  if (current > 0 && todayDone) status = 'active';
  else if (current > 0 && (todayFrozen || yesterdayFrozen)) status = 'frozen';
  else if (current > 0) status = 'active';

  const label = current === 1 ? '1 day streak' : `${current} day streak`;
  return { status, label, count: current, freezesAvailable };
}

export interface CalendarDay {
  day: number;
  dateStr: string;
  /** `kept` is a rest day inside a streak: it counts, but nothing was completed. */
  status: 'before-start' | 'active' | 'frozen' | 'missed' | 'rest' | 'kept' | 'future';
  /** Why this day kept or canceled the streak. Shown when the day is hovered. */
  reason: string;
}

export interface CalendarMonth {
  year: number;
  month: number;
  title: string;
  firstDayOfWeek: number;
  daysInMonth: number;
  days: CalendarDay[];
}

/**
 * Generates monthly calendar grids from the start month up to the current month.
 * Rest days inside a streak are marked kept: they count, with no completed-work mark.
 * Rest days outside a streak stay neutral. Missed homework and overdue unfinished
 * assignments show as missed.
 */
export function getStreakCalendar(
  streak?: StreakData | null,
  todayStr: string = localDateString(),
  context?: StreakContext,
): CalendarMonth[] {
  const activeSet = new Set(streak?.activeDates || []);
  const freezeSet = new Set(streak?.frozenDates || []);
  const facts = buildFacts(todayStr, context, streak?.brokenDates);
  const { keptRest } = accountStreak(
    streak?.activeDates || [],
    todayStr,
    streak?.frozenDates || [],
    context,
    streak?.brokenDates,
    undefined,
    false,
  );

  const earliest = streak?.startDate ||
    (streak?.activeDates && streak.activeDates.length > 0 ? [...streak.activeDates].sort()[0] : todayStr);

  const startYear = parseInt(earliest.slice(0, 4), 10);
  const startMonth = parseInt(earliest.slice(5, 7), 10) - 1;

  const todayYear = parseInt(todayStr.slice(0, 4), 10);
  const todayMonth = parseInt(todayStr.slice(5, 7), 10) - 1;

  const months: CalendarMonth[] = [];
  let y = startYear;
  let m = startMonth;

  while (y < todayYear || (y === todayYear && m <= todayMonth)) {
    const monthDate = new Date(y, m, 1);
    const monthTitle = monthDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    const firstDayOfWeek = monthDate.getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const days: CalendarDay[] = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      let dayStatus: CalendarDay['status'];

      if (dateStr < earliest) {
        dayStatus = 'before-start';
      } else if (dateStr > todayStr) {
        dayStatus = 'future';
      } else if (freezeSet.has(dateStr)) {
        dayStatus = 'frozen';
      } else if (facts.hardBreaks.has(dateStr)) {
        dayStatus = 'missed';
      } else if (activeSet.has(dateStr)) {
        dayStatus = 'active';
      } else if (dateStr === todayStr) {
        dayStatus = 'future';
      } else if (facts.obligations.has(dateStr)) {
        dayStatus = 'missed';
      } else if (keptRest.has(dateStr)) {
        dayStatus = 'kept';
      } else {
        dayStatus = 'rest';
      }
      days.push({
        day: d,
        dateStr,
        status: dayStatus,
        reason: calendarDayReason(dayStatus, dateStr, todayStr, facts),
      });
    }

    months.push({ year: y, month: m, title: monthTitle, firstDayOfWeek, daysInMonth, days });
    m++;
    if (m > 11) {
      m = 0;
      y++;
    }
  }

  return months;
}

function calendarDayReason(
  status: CalendarDay['status'],
  dateStr: string,
  todayStr: string,
  facts: StreakFacts,
): string {
  if (status === 'active') return 'Answered';
  if (status === 'frozen') return 'Freeze used';
  if (status === 'rest' || status === 'kept') return 'Nothing due';
  if (status === 'missed') {
    return facts.hardBreaks.has(dateStr)
      ? 'Missed — unfinished after the due date'
      : 'Missed — no answer while homework was open';
  }
  if (status === 'before-start') return 'Before you started';
  if (dateStr === todayStr) {
    return facts.obligations.has(dateStr)
      ? 'Today — answer to keep it going'
      : 'Today — nothing due';
  }
  return 'Upcoming';
}

/** Display marker for a calendar day status. Days are color-coded in CSS, so no icon glyph is needed. */
export function getCalendarDayIcon(_status: CalendarDay['status']): string {
  return '';
}
