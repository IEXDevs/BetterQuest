import type { Assignment, StreakData } from '../../shared/models';

/** One answered question, or newly completed work, satisfies a day that has homework. */
const QUESTION_MINIMUM_DATES = 1;

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
  const now = context?.now ?? Date.now();
  const overrides = context?.completionOverrides;
  const yesterday = shiftDay(today, -1);

  for (const assignment of context?.assignments ?? []) {
    const startDay = assignment.start?.iso ? zonedDay(assignment.start.iso, assignment.start.timeZone) : null;
    const dueDay = assignment.deadline?.iso ? zonedDay(assignment.deadline.iso, assignment.deadline.timeZone) : null;
    const dueInstant = assignment.deadline?.iso ? Date.parse(assignment.deadline.iso) : NaN;
    const overdue = Number.isFinite(dueInstant) && dueInstant < now;

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
  return { hardBreaks, obligations };
}

type DayRole = 'credit' | 'frozen' | 'rest' | 'pending' | 'miss' | 'break';

function dayRole(day: string, today: string, active: Set<string>, frozen: Set<string>, facts: StreakFacts): DayRole {
  if (facts.hardBreaks.has(day)) return 'break';
  if (active.has(day)) return 'credit';
  if (frozen.has(day)) return 'frozen';
  if (facts.obligations.has(day)) return day === today ? 'pending' : 'miss';
  if (day === today) return 'pending';
  return 'rest';
}

function earliestMark(dates: string[], today: string): string {
  let earliest = today;
  for (const day of dates) {
    if (validDate(day) && day < earliest) earliest = day;
  }
  return earliest;
}

/**
 * Current streak counts question days, freezes, and days with nothing due.
 * A rest day counts once a streak is already going. It does not start a streak by itself,
 * and it does not break one. Today stays open until the day is over or a question is answered.
 * A missed question day, or an unfinished assignment past its due date, ends the streak.
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
  frozenDates: string[],
  context?: StreakContext,
  brokenDates?: string[],
): { current: number; longest: number; keptRest: Set<string> } {
  const active = new Set(activeDates.filter(validDate));
  const frozen = new Set(frozenDates.filter(validDate));
  const facts = buildFacts(todayStr, context, brokenDates);
  const limit = earliestMark([...active, ...frozen], todayStr);
  const keptRest = new Set<string>();

  let longest = 0;
  let run = 0;
  let alive = false;
  let day = limit;
  for (let step = 0; step < 500; step++) {
    const role = dayRole(day, todayStr, active, frozen, facts);
    if (role === 'credit' || role === 'frozen') {
      alive = true;
      run += 1;
      if (run > longest) longest = run;
    } else if (role === 'rest' && alive) {
      keptRest.add(day);
      run += 1;
      if (run > longest) longest = run;
    } else if (role === 'break' || role === 'miss') {
      run = 0;
      alive = false;
    }
    if (day === todayStr) break;
    day = shiftDay(day, 1);
  }

  let current = 0;
  let trailingRest = 0;
  let anchored = false;
  day = todayStr;
  for (let step = 0; step < 500; step++) {
    const role = dayRole(day, todayStr, active, frozen, facts);
    if (role === 'break' || role === 'miss') break;
    if (role === 'credit' || role === 'frozen') {
      current += QUESTION_MINIMUM_DATES + trailingRest;
      trailingRest = 0;
      anchored = true;
    } else if (role === 'rest') {
      if (anchored) current += QUESTION_MINIMUM_DATES;
      else trailingRest += 1;
    }
    if (day === limit) break;
    day = shiftDay(day, -1);
  }

  return { current, longest: Math.max(longest, current), keptRest };
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

function protectObligationGaps(
  lastActive: string | null | undefined,
  target: string,
  activeDates: string[],
  frozenDates: string[],
  freezesAvailable: number,
  context?: StreakContext,
  brokenDates?: string[],
): { frozenDates: string[]; freezesAvailable: number } {
  if (!validDate(lastActive) || !validDate(target) || lastActive >= target || freezesAvailable <= 0) {
    return { frozenDates, freezesAvailable };
  }
  const facts = buildFacts(target, context, brokenDates);
  let latestBreak: string | null = null;
  for (const day of facts.hardBreaks) {
    if (day > lastActive && day < target && (!latestBreak || day > latestBreak)) latestBreak = day;
  }
  const active = new Set(activeDates);
  const frozen = new Set(frozenDates);
  const nextFrozen = [...frozenDates];
  let available = freezesAvailable;
  let day = shiftDay(latestBreak ?? lastActive, 1);
  while (day < target && available > 0) {
    if (facts.hardBreaks.has(day)) break;
    if (!active.has(day) && !frozen.has(day) && facts.obligations.has(day)) {
      nextFrozen.push(day);
      frozen.add(day);
      available -= 1;
    }
    day = shiftDay(day, 1);
  }
  return { frozenDates: nextFrozen, freezesAvailable: available };
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
  let freezesAvailable = currentStreak?.freezesAvailable ?? 0;
  const startDate = currentStreak?.startDate || (existingDates[0] ? [...existingDates].sort()[0] : newDate);
  const protectedGap = protectObligationGaps(
    currentStreak?.lastActiveDate,
    newDate,
    existingDates,
    existingFrozen,
    freezesAvailable,
    context,
    existingBroken,
  );
  freezesAvailable = protectedGap.freezesAvailable;
  const frozenDates = protectedGap.frozenDates;

  const activeDates = recordActiveDate(existingDates, newDate);
  const prevCurrent = currentStreak?.current || 0;
  const { current, longest } = calculateStreak(activeDates, newDate, frozenDates, context, existingBroken);
  const prevLongest = currentStreak?.longest || 0;

  // Award 2 streak freezes when reaching 5 days straight (and for every 5-day cycle: 5, 10, 15, ...)
  const prevMilestones = Math.floor(prevCurrent / 5);
  const newMilestones = Math.floor(current / 5);
  if (newMilestones > prevMilestones && current >= 5) {
    const earnedFreezes = (newMilestones - prevMilestones) * 2;
    freezesAvailable += earnedFreezes;
  }

  const facts = buildFacts(newDate, context, existingBroken);
  const brokenDates = [...new Set([...existingBroken, ...facts.hardBreaks])].sort().slice(-180);

  return {
    current,
    longest: Math.max(longest, prevLongest),
    lastActiveDate: newDate,
    activeDates,
    freezesAvailable,
    frozenDates: [...new Set(frozenDates)].sort().slice(-180),
    startDate,
    brokenDates,
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
  const protectedGap = protectObligationGaps(
    currentStreak.lastActiveDate,
    todayStr,
    existingDates,
    existingFrozen,
    currentStreak.freezesAvailable ?? 0,
    context,
    existingBroken,
  );
  const frozenDates = [...new Set(protectedGap.frozenDates)].sort();
  const { current, longest } = calculateStreak(existingDates, todayStr, frozenDates, context, existingBroken);
  const facts = buildFacts(todayStr, context, existingBroken);
  const brokenDates = [...new Set([...existingBroken, ...facts.hardBreaks])].sort().slice(-180);

  return {
    current,
    longest: Math.max(longest, currentStreak.longest || 0),
    lastActiveDate: currentStreak.lastActiveDate,
    activeDates: existingDates,
    freezesAvailable: protectedGap.freezesAvailable,
    frozenDates,
    startDate,
    brokenDates,
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
  const { keptRest } = accountStreak(streak?.activeDates || [], todayStr, streak?.frozenDates || [], context, streak?.brokenDates);

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
      } else if (facts.hardBreaks.has(dateStr)) {
        dayStatus = 'missed';
      } else if (activeSet.has(dateStr)) {
        dayStatus = 'active';
      } else if (freezeSet.has(dateStr)) {
        dayStatus = 'frozen';
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
  if (status === 'active') return 'Streak kept: you answered a question';
  if (status === 'frozen') return 'Streak kept: a freeze covered this day';
  if (status === 'rest' || status === 'kept') return 'Streak kept: nothing was due';
  if (status === 'missed') {
    return facts.hardBreaks.has(dateStr)
      ? 'Streak canceled: an assignment was still unfinished after the due date'
      : 'Streak canceled: homework was open and no question was answered';
  }
  if (status === 'before-start') return 'Before your streak started';
  if (dateStr === todayStr) {
    return facts.obligations.has(dateStr)
      ? 'Today is still open: answer a question to keep your streak'
      : 'Today is still open: nothing is due';
  }
  return 'Coming up';
}

/** Returns the display emoji/symbol for a calendar day status. */
export function getCalendarDayIcon(status: CalendarDay['status']): string {
  switch (status) {
    case 'active':
      return '🔥';
    case 'frozen':
      return '🧊';
    case 'missed':
      return '❌';
    case 'kept':
    case 'rest':
    case 'before-start':
    case 'future':
    default:
      return '—';
  }
}
