import type { StreakData } from '../../shared/models';

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

/** Calculates current streak and all-time longest streak from a list of active dates and frozen dates (YYYY-MM-DD). */
export function calculateStreak(
  activeDates: string[],
  todayStr: string = localDateString(),
  frozenDates: string[] = []
): { current: number; longest: number } {
  const validDates = activeDates.filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d));
  const validFreezes = frozenDates.filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d));
  const allSet = new Set([...validDates, ...validFreezes]);
  if (allSet.size === 0) return { current: 0, longest: 0 };

  const today = new Date(todayStr + 'T12:00:00');
  const todayFormatted = formatDate(today);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayFormatted = formatDate(yesterday);

  let current = 0;
  let startAnchor: string | null = null;

  if (allSet.has(todayFormatted)) {
    startAnchor = todayFormatted;
  } else if (allSet.has(yesterdayFormatted)) {
    // Yesterday had activity or freeze; streak is still alive today waiting for activity.
    startAnchor = yesterdayFormatted;
  }

  if (startAnchor) {
    const cursor = new Date(startAnchor + 'T12:00:00');
    while (allSet.has(formatDate(cursor))) {
      current++;
      cursor.setDate(cursor.getDate() - 1);
    }
  }

  // 2. Longest streak calculation across all time:
  const sorted = [...allSet].sort();
  let longest = 0;
  let running = 0;
  let prevDate: Date | null = null;

  for (const dStr of sorted) {
    const d = new Date(dStr + 'T12:00:00');
    if (prevDate) {
      const diffMs = d.getTime() - prevDate.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        running++;
      } else if (diffDays > 1) {
        running = 1;
      }
    } else {
      running = 1;
    }
    prevDate = d;
    if (running > longest) longest = running;
  }

  return { current, longest: Math.max(longest, current) };
}

/** Records an active date and returns an updated, trimmed list (last 180 active dates). */
export function recordActiveDate(
  activeDates: string[] = [],
  dateStr: string = localDateString()
): string[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return activeDates;
  const set = new Set(activeDates.filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)));
  set.add(dateStr);
  const sorted = [...set].sort();
  return sorted.slice(-180);
}

/**
 * Reconciles streak data, auto-applying freezes to missed days if available,
 * and awarding 2 freezes every 5 consecutive days.
 */
export function updateStreakData(
  currentStreak?: StreakData | null,
  newDate: string = localDateString()
): StreakData {
  const existingDates = currentStreak?.activeDates || [];
  const existingFrozen = currentStreak?.frozenDates || [];
  let freezesAvailable = currentStreak?.freezesAvailable ?? 0;
  const startDate = currentStreak?.startDate || (existingDates[0] ? [...existingDates].sort()[0] : newDate);

  const frozenDates = [...existingFrozen];

  // Auto-protect any missed gap days between last active date and newDate if freezes are available
  if (currentStreak?.lastActiveDate && freezesAvailable > 0) {
    const lastD = new Date(currentStreak.lastActiveDate + 'T12:00:00');
    const newD = new Date(newDate + 'T12:00:00');
    const diffDays = Math.round((newD.getTime() - lastD.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 1) {
      const cursor = new Date(lastD);
      cursor.setDate(cursor.getDate() + 1);
      while (cursor < newD && freezesAvailable > 0) {
        const gapDate = formatDate(cursor);
        if (!existingDates.includes(gapDate) && !frozenDates.includes(gapDate)) {
          frozenDates.push(gapDate);
          freezesAvailable--;
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    }
  }

  const activeDates = recordActiveDate(existingDates, newDate);
  const prevCurrent = currentStreak?.current || 0;
  const { current, longest } = calculateStreak(activeDates, newDate, frozenDates);
  const prevLongest = currentStreak?.longest || 0;

  // Award 2 streak freezes when reaching 5 days straight (and for every 5-day cycle: 5, 10, 15, ...)
  const prevMilestones = Math.floor(prevCurrent / 5);
  const newMilestones = Math.floor(current / 5);
  if (newMilestones > prevMilestones && current >= 5) {
    const earnedFreezes = (newMilestones - prevMilestones) * 2;
    freezesAvailable += earnedFreezes;
  }

  return {
    current,
    longest: Math.max(longest, prevLongest),
    lastActiveDate: newDate,
    activeDates,
    freezesAvailable,
    frozenDates: [...new Set(frozenDates)].sort().slice(-180),
    startDate,
  };
}

/**
 * Reconciles current streak state for display (e.g. on page load without an active submit today).
 * Consumes freezes if past days were missed to protect the streak.
 */
export function reconcileStreak(
  currentStreak?: StreakData | null,
  todayStr: string = localDateString()
): StreakData {
  if (!currentStreak) {
    return { current: 0, longest: 0, lastActiveDate: null, activeDates: [], freezesAvailable: 0, frozenDates: [], startDate: null };
  }
  const existingDates = currentStreak.activeDates || [];
  const existingFrozen = currentStreak.frozenDates || [];
  let freezesAvailable = currentStreak.freezesAvailable ?? 0;
  const startDate = currentStreak.startDate || (existingDates[0] ? [...existingDates].sort()[0] : null);
  const frozenDates = [...existingFrozen];

  // Auto-protect gap days between lastActiveDate and todayStr if freezes are available
  if (currentStreak.lastActiveDate && currentStreak.current > 0 && freezesAvailable > 0) {
    const lastD = new Date(currentStreak.lastActiveDate + 'T12:00:00');
    const todayD = new Date(todayStr + 'T12:00:00');
    const diffDays = Math.round((todayD.getTime() - lastD.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 1) {
      const cursor = new Date(lastD);
      cursor.setDate(cursor.getDate() + 1);
      while (cursor < todayD && freezesAvailable > 0) {
        const gapDate = formatDate(cursor);
        if (!existingDates.includes(gapDate) && !frozenDates.includes(gapDate)) {
          frozenDates.push(gapDate);
          freezesAvailable--;
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    }
  }

  const { current, longest } = calculateStreak(existingDates, todayStr, frozenDates);
  return {
    current,
    longest: Math.max(longest, currentStreak.longest || 0),
    lastActiveDate: currentStreak.lastActiveDate,
    activeDates: existingDates,
    freezesAvailable,
    frozenDates: [...new Set(frozenDates)].sort(),
    startDate,
  };
}

export type StreakBadgeStatus = 'active' | 'frozen' | 'broken';

/** Returns the display status for the badge/pill. */
export function getStreakBadgeStatus(
  streak?: StreakData | null,
  todayStr: string = localDateString()
): {
  status: StreakBadgeStatus;
  label: string;
  count: number;
  freezesAvailable: number;
} {
  const current = streak?.current || 0;
  const activeDates = streak?.activeDates || [];
  const frozenDates = streak?.frozenDates || [];
  const freezesAvailable = streak?.freezesAvailable || 0;

  const todayDone = activeDates.includes(todayStr);
  const todayFrozen = frozenDates.includes(todayStr);

  const today = new Date(todayStr + 'T12:00:00');
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatDate(yesterday);
  const yesterdayActiveOrFrozen = activeDates.includes(yesterdayStr) || frozenDates.includes(yesterdayStr);

  let status: StreakBadgeStatus = 'broken';
  if (todayDone) {
    status = 'active'; // Green: active and done today
  } else if (todayFrozen) {
    status = 'frozen'; // Blue: protected today by freeze
  } else if (current > 0 && yesterdayActiveOrFrozen) {
    status = frozenDates.includes(yesterdayStr) ? 'frozen' : 'active';
  } else {
    status = 'broken'; // Red: broken streak
  }

  const label = current === 1 ? '1 day streak' : `${current} day streak`;
  return { status, label, count: current, freezesAvailable };
}

export interface CalendarDay {
  day: number;
  dateStr: string;
  status: 'before-start' | 'active' | 'frozen' | 'missed' | 'future';
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
 * Days before startDate show grey hyphens '-', completed days show fire,
 * frozen days show ice, missed days show red X, and future days show grey hyphens '-'.
 */
export function getStreakCalendar(
  streak?: StreakData | null,
  todayStr: string = localDateString()
): CalendarMonth[] {
  const activeSet = new Set(streak?.activeDates || []);
  const freezeSet = new Set(streak?.frozenDates || []);

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
      } else if (activeSet.has(dateStr)) {
        dayStatus = 'active';
      } else if (freezeSet.has(dateStr)) {
        dayStatus = 'frozen';
      } else if (dateStr === todayStr) {
        // Today is still ongoing; show pending hyphen if streak is alive
        dayStatus = (streak?.current || 0) > 0 ? 'future' : 'missed';
      } else {
        dayStatus = 'missed';
      }
      days.push({ day: d, dateStr, status: dayStatus });
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

/** Returns the display emoji/symbol for a calendar day status. */
export function getCalendarDayIcon(status: CalendarDay['status']): string {
  switch (status) {
    case 'active':
      return '🔥';
    case 'frozen':
      return '🧊';
    case 'missed':
      return '❌';
    case 'before-start':
    case 'future':
    default:
      return '—';
  }
}
