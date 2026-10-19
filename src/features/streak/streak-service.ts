import type { StreakData } from '../../shared/models';

/** Returns local date in YYYY-MM-DD format (respects student local timezone). */
export function localDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Calculates current streak and all-time longest streak from a list of active dates (YYYY-MM-DD). */
export function calculateStreak(
  activeDates: string[],
  todayStr: string = localDateString()
): { current: number; longest: number } {
  const validDates = activeDates.filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d));
  const dateSet = new Set(validDates);
  if (dateSet.size === 0) return { current: 0, longest: 0 };

  // 1. Current streak calculation:
  // Streak is active if either today was active OR yesterday was active (grace period for today).
  const today = new Date(todayStr + 'T12:00:00');
  const todayFormatted = formatDate(today);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayFormatted = formatDate(yesterday);

  let current = 0;
  let startAnchor: string | null = null;

  if (dateSet.has(todayFormatted)) {
    startAnchor = todayFormatted;
  } else if (dateSet.has(yesterdayFormatted)) {
    // Yesterday had activity; streak is still alive today waiting for activity.
    startAnchor = yesterdayFormatted;
  }

  if (startAnchor) {
    const cursor = new Date(startAnchor + 'T12:00:00');
    while (dateSet.has(formatDate(cursor))) {
      current++;
      cursor.setDate(cursor.getDate() - 1);
    }
  }

  // 2. Longest streak calculation across all time:
  const sorted = [...dateSet].sort();
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
  // Keep up to 180 active dates to conserve local storage while maintaining months of history.
  return sorted.slice(-180);
}

/** Reconciles streak data given newly recorded date or existing dates. */
export function updateStreakData(
  currentStreak?: StreakData | null,
  newDate: string = localDateString()
): StreakData {
  const existingDates = currentStreak?.activeDates || [];
  const activeDates = recordActiveDate(existingDates, newDate);
  const { current, longest } = calculateStreak(activeDates, newDate);
  const prevLongest = currentStreak?.longest || 0;
  return {
    current,
    longest: Math.max(longest, prevLongest),
    lastActiveDate: newDate,
    activeDates,
  };
}
