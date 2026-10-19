import type { StreakData } from '../../shared/models';
import {
  getStreakBadgeStatus,
  getStreakCalendar,
  getCalendarDayIcon,
  localDateString,
  reconcileStreak,
  type CalendarMonth,
} from './streak-service';

export interface StreakPillController {
  /** The root DOM element representing the streak pill with hover popover. */
  element: HTMLElement;
  /** Re-renders the streak pill and popover with new streak data. */
  update(streak?: StreakData | null, todayStr?: string): void;
  /** Cleans up timers or listeners. */
  dispose?: () => void;
}

export const streakPillStyles = `
  .streak-pill-wrapper {
    position: relative;
    display: inline-block;
  }
  .streak-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 12px;
    border-radius: 999px;
    background: color-mix(in srgb, #16a34a 12%, transparent);
    border: 1px solid color-mix(in srgb, #16a34a 32%, transparent);
    color: #16a34a;
    font: 700 12px/1 inherit;
    letter-spacing: .02em;
    cursor: pointer;
    user-select: none;
    transition: all .18s ease;
    white-space: nowrap;
  }
  .streak-badge:hover {
    background: color-mix(in srgb, #16a34a 20%, transparent);
    border-color: #16a34a;
  }
  .streak-badge.active,
  .streak-badge[data-state="active"] {
    background: color-mix(in srgb, #16a34a 12%, transparent);
    border: 1px solid color-mix(in srgb, #16a34a 32%, transparent);
    color: #16a34a;
  }
  .streak-badge.active:hover,
  .streak-badge[data-state="active"]:hover {
    background: color-mix(in srgb, #16a34a 20%, transparent);
    border-color: #16a34a;
  }
  .streak-badge.frozen,
  .streak-badge[data-state="frozen"] {
    background: color-mix(in srgb, #2563eb 12%, transparent);
    border: 1px solid color-mix(in srgb, #2563eb 32%, transparent);
    color: #2563eb;
  }
  .streak-badge.frozen:hover,
  .streak-badge[data-state="frozen"]:hover {
    background: color-mix(in srgb, #2563eb 20%, transparent);
    border-color: #2563eb;
  }
  .streak-badge.broken,
  .streak-badge[data-state="broken"] {
    background: color-mix(in srgb, #dc2626 12%, transparent);
    border: 1px solid color-mix(in srgb, #dc2626 32%, transparent);
    color: #dc2626;
  }
  .streak-badge.broken:hover,
  .streak-badge[data-state="broken"]:hover {
    background: color-mix(in srgb, #dc2626 20%, transparent);
    border-color: #dc2626;
  }
  .streak-badge svg {
    width: 14px;
    height: 14px;
    fill: currentColor;
    flex-shrink: 0;
  }
  .streak-freeze-tag {
    display: inline-flex;
    align-items: center;
    margin-left: 2px;
    padding: 1px 5px;
    border-radius: 6px;
    font-size: 10px;
    font-weight: 600;
    background: color-mix(in srgb, #2563eb 15%, transparent);
    color: #2563eb;
  }
  .streak-calendar-popover {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    z-index: 1000;
    min-width: 420px;
    width: 450px;
    max-width: calc(100vw - 32px);
    padding: 16px;
    background: var(--bq-surface, #ffffff);
    color: var(--bq-text, #1e293b);
    border: 1px solid var(--bq-border, #e2e8f0);
    border-radius: 12px;
    box-shadow: 0 16px 36px -8px rgba(0, 0, 0, 0.18), 0 8px 16px -4px rgba(0, 0, 0, 0.08);
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transform: translateY(-4px);
    transition: opacity .18s ease, transform .18s ease, visibility .18s ease;
  }
  .streak-calendar-popover::before {
    content: '';
    position: absolute;
    top: -14px;
    left: 0;
    right: 0;
    height: 14px;
    pointer-events: auto;
  }
  .streak-pill-wrapper.is-open .streak-calendar-popover,
  .streak-pill-wrapper:hover .streak-calendar-popover,
  .streak-pill-wrapper:focus-within .streak-calendar-popover {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
    transform: translateY(0);
  }
  .streak-cal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }
  .streak-cal-title {
    font-weight: 800;
    font-size: 16px;
    color: var(--bq-text, #1e293b);
  }
  .streak-cal-nav {
    background: none;
    border: 1px solid var(--bq-border, #cbd5e1);
    border-radius: 8px;
    width: 30px;
    height: 30px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 20px;
    font-weight: 700;
    color: var(--bq-text, #334155);
    padding: 0;
    line-height: 1;
    transition: background .15s ease, border-color .15s ease;
  }
  .streak-cal-nav:hover:not(:disabled) {
    background: var(--bq-raised, #f1f5f9);
    border-color: var(--bq-accent, #3b82f6);
  }
  .streak-cal-nav:disabled {
    opacity: 0.3;
    cursor: default;
  }
  .streak-cal-stats {
    display: flex;
    gap: 12px;
    align-items: center;
    justify-content: space-between;
    font-size: 13px;
    font-weight: 700;
    padding: 7px 12px;
    border-radius: 8px;
    background: var(--bq-raised, #f8fafc);
    margin-bottom: 12px;
  }
  .streak-stat-count {
    color: #15803d;
  }
  .streak-stat-freezes {
    color: #1d4ed8;
    cursor: help;
  }
  .streak-cal-dow-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    text-align: center;
    font-size: 12px;
    font-weight: 700;
    color: var(--bq-muted, #64748b);
    margin-bottom: 6px;
  }
  .streak-cal-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
    text-align: center;
  }
  .streak-cal-cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4px 2px;
    min-height: 42px;
    border-radius: 8px;
    font-size: 14px;
    cursor: default;
    transition: transform .12s ease;
  }
  .streak-cal-cell:hover:not(.streak-cal-empty) {
    transform: scale(1.05);
  }
  .streak-cal-num {
    font-size: 11px;
    font-weight: 700;
    color: var(--bq-muted, #64748b);
    margin-bottom: 2px;
  }
  .streak-cal-icon {
    font-size: 16px;
    line-height: 1;
  }
  .streak-cal-day.status-active {
    background: color-mix(in srgb, #16a34a 14%, transparent);
  }
  .streak-cal-day.status-frozen {
    background: color-mix(in srgb, #2563eb 14%, transparent);
  }
  .streak-cal-day.status-missed {
    background: color-mix(in srgb, #dc2626 14%, transparent);
  }
  .streak-cal-day.status-missed .streak-cal-icon {
    color: #dc2626;
    font-weight: 800;
  }
  .streak-cal-day.status-before-start .streak-cal-icon,
  .streak-cal-day.status-future .streak-cal-icon {
    color: var(--bq-muted, #94a3b8);
  }
  .streak-cal-legend {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    font-weight: 600;
    color: var(--bq-muted, #64748b);
    margin-top: 12px;
    padding-top: 8px;
    border-top: 1px solid var(--bq-border, #e2e8f0);
  }
  .streak-cal-legend .legend-freeze {
    cursor: help;
  }
  .streak-cal-legend .legend-missed {
    color: #dc2626;
  }
  .streak-cal-legend .legend-none {
    color: var(--bq-muted, #94a3b8);
  }
`;


export function createStreakPill(
  initialStreak?: StreakData | null,
  initialTodayStr?: string,
  doc?: Document
): StreakPillController {
  const domDoc = doc || (typeof document !== 'undefined' ? document : (globalThis as any).document);
  if (!domDoc) throw new Error('DOM document required for createStreakPill');
  const create = <K extends keyof HTMLElementTagNameMap>(tag: K): HTMLElementTagNameMap[K] => domDoc.createElement(tag);

  const container = create('div');
  container.className = 'streak-pill-wrapper';

  const badge = create('div');
  badge.className = 'streak-badge';
  badge.setAttribute('tabindex', '0');
  badge.setAttribute('role', 'button');
  badge.setAttribute('aria-haspopup', 'dialog');
  badge.setAttribute('aria-expanded', 'false');
  badge.setAttribute('aria-label', 'Streak and calendar');

  const popover = create('div');
  popover.className = 'streak-calendar-popover';
  popover.setAttribute('role', 'dialog');
  popover.setAttribute('aria-label', 'Streak calendar details');
  popover.setAttribute('aria-hidden', 'true');

  container.append(badge, popover);

  let currentStreak = initialStreak;
  let currentTodayStr = initialTodayStr || localDateString();
  let calendarMonths: CalendarMonth[] = [];
  let viewingMonthIndex = 0;

  function renderMonth() {
    popover.replaceChildren();
    if (calendarMonths.length === 0) return;

    if (viewingMonthIndex < 0) viewingMonthIndex = 0;
    if (viewingMonthIndex >= calendarMonths.length) viewingMonthIndex = calendarMonths.length - 1;

    const monthData = calendarMonths[viewingMonthIndex];

    // Header with Navigation
    const header = create('div');
    header.className = 'streak-cal-header';

    const prevBtn = create('button');
    prevBtn.type = 'button';
    prevBtn.className = 'streak-cal-nav streak-cal-prev';
    prevBtn.setAttribute('aria-label', 'Previous month');
    prevBtn.innerHTML = '‹';
    prevBtn.disabled = viewingMonthIndex === 0;
    prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (viewingMonthIndex > 0) {
        viewingMonthIndex--;
        renderMonth();
      }
    });

    const title = create('div');
    title.className = 'streak-cal-title';
    title.textContent = monthData.title;

    const nextBtn = create('button');
    nextBtn.type = 'button';
    nextBtn.className = 'streak-cal-nav streak-cal-next';
    nextBtn.setAttribute('aria-label', 'Next month');
    nextBtn.innerHTML = '›';
    nextBtn.disabled = viewingMonthIndex === calendarMonths.length - 1;
    nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (viewingMonthIndex < calendarMonths.length - 1) {
        viewingMonthIndex++;
        renderMonth();
      }
    });

    header.append(prevBtn, title, nextBtn);

    // Subheader stats (streak count & freezes available)
    const statsRow = create('div');
    statsRow.className = 'streak-cal-stats';

    const streakItem = create('span');
    streakItem.className = 'streak-stat-item streak-stat-count';
    const streakCount = currentStreak?.current || 0;
    streakItem.textContent = streakCount === 1 ? '🔥 1 day streak' : `🔥 ${streakCount} day streak`;

    const freezeItem = create('span');
    freezeItem.className = 'streak-stat-item streak-stat-freezes';
    const freezes = currentStreak?.freezesAvailable || 0;
    freezeItem.textContent = freezes === 1 ? '🧊 1 freeze left' : `🧊 ${freezes} freezes left`;
    freezeItem.title = 'Get a 5 day streak for 2 freezes';

    statsRow.append(streakItem, freezeItem);

    // Days of week header
    const dowGrid = create('div');
    dowGrid.className = 'streak-cal-dow-grid';
    const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    for (const d of daysOfWeek) {
      const col = create('div');
      col.className = 'streak-cal-dow';
      col.textContent = d;
      dowGrid.append(col);
    }

    // Month days grid
    const daysGrid = create('div');
    daysGrid.className = 'streak-cal-grid';

    // Leading empty cells
    for (let i = 0; i < monthData.firstDayOfWeek; i++) {
      const empty = create('div');
      empty.className = 'streak-cal-cell streak-cal-empty';
      daysGrid.append(empty);
    }

    // Days 1..N
    for (const d of monthData.days) {
      const cell = create('div');
      cell.className = `streak-cal-cell streak-cal-day status-${d.status}`;
      cell.dataset.status = d.status;
      cell.dataset.date = d.dateStr;

      let labelText = `${d.dateStr}: `;
      if (d.status === 'active') labelText += 'Completed';
      else if (d.status === 'frozen') labelText += 'Streak freeze used';
      else if (d.status === 'missed') labelText += 'Missed';
      else labelText += 'No activity';
      cell.setAttribute('title', labelText);
      cell.setAttribute('aria-label', labelText);

      const num = create('span');
      num.className = 'streak-cal-num';
      num.textContent = String(d.day);

      const icon = create('span');
      icon.className = 'streak-cal-icon';
      icon.textContent = getCalendarDayIcon(d.status);

      cell.append(num, icon);
      daysGrid.append(cell);
    }

    // Legend
    const legend = create('div');
    legend.className = 'streak-cal-legend';
    legend.innerHTML = `
      <span>🔥 Done</span>
      <span class="legend-freeze" title="Get a 5 day streak for 2 freezes">🧊 Freeze</span>
      <span class="legend-missed">❌ Missed</span>
      <span class="legend-none">— Rest</span>
    `;

    popover.append(header, statsRow, dowGrid, daysGrid, legend);
  }

  function update(streak?: StreakData | null, todayStr?: string) {
    currentTodayStr = todayStr || localDateString();
    currentStreak = reconcileStreak(streak, currentTodayStr);

    const { status, label, count } = getStreakBadgeStatus(currentStreak, currentTodayStr);

    // Update badge classes and data attributes
    badge.className = 'streak-badge';
    badge.classList.toggle('active', status === 'active');
    badge.classList.toggle('frozen', status === 'frozen');
    badge.classList.toggle('broken', status === 'broken');
    badge.dataset.state = status;

    // SVG icon depending on state
    let iconSvg = '';
    if (status === 'frozen') {
      // Ice crystal / freeze SVG
      iconSvg = '<svg viewBox="0 0 20 20" aria-hidden="true" fill="none"><path d="M 10 2 v 16 M 2 10 h 16 M 4.5 4.5 l 11 11 M 4.5 15.5 l 11 -11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    } else if (status === 'broken') {
      // Broken flame SVG
      iconSvg = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M 10 2 C 9.5 4 8 5.5 7 7 C 5.8 8.8 5.5 10.5 6.2 12.2 C 6.9 14 8.4 15 10 15 C 12.8 15 15 12.8 15 10 C 15 7 13 4.5 10 2 Z" opacity="0.45"/><path d="M 6.5 13.5 l 7 -7 M 13.5 13.5 l -7 -7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    } else {
      // Active flame SVG
      iconSvg = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M 10 2 C 9.5 4 8 5.5 7 7 C 5.8 8.8 5.5 10.5 6.2 12.2 C 6.9 14 8.4 15 10 15 C 12.8 15 15 12.8 15 10 C 15 7 13 4.5 10 2 Z"/></svg>';
    }

    badge.innerHTML = `${iconSvg}<span>${label}</span>`;
    badge.title = status === 'frozen'
      ? (currentStreak?.longest ? `Current streak: ${count} days · Best: ${currentStreak.longest} days · Get a 5 day streak for 2 freezes` : 'Get a 5 day streak for 2 freezes')
      : (currentStreak?.longest ? `Current streak: ${count} days · Best: ${currentStreak.longest} days` : 'Visit Quest or study daily to keep your streak alive!');

    if (currentStreak?.freezesAvailable) {
      const freezeTag = create('span');
      freezeTag.className = 'streak-freeze-tag';
      freezeTag.textContent = `🧊${currentStreak.freezesAvailable}`;
      freezeTag.title = 'Get a 5 day streak for 2 freezes';
      badge.append(freezeTag);
    }

    // Refresh Calendar Data
    calendarMonths = getStreakCalendar(currentStreak, currentTodayStr);
    // Default to the current month (last month in array)
    viewingMonthIndex = Math.max(0, calendarMonths.length - 1);
    renderMonth();
  }

  // Hover and focus delay: keep the calendar open for 500ms when cursor leaves
  let closeTimer: ReturnType<typeof setTimeout> | null = null;

  function showPopover() {
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }
    container.classList.add('is-open');
    badge.setAttribute('aria-expanded', 'true');
    popover.setAttribute('aria-hidden', 'false');
  }

  function hidePopoverWithDelay() {
    if (closeTimer) clearTimeout(closeTimer);
    closeTimer = setTimeout(() => {
      container.classList.remove('is-open');
      badge.setAttribute('aria-expanded', 'false');
      popover.setAttribute('aria-hidden', 'true');
      closeTimer = null;
    }, 500);
  }

  container.addEventListener('mouseenter', showPopover);
  container.addEventListener('mouseleave', hidePopoverWithDelay);
  container.addEventListener('focusin', showPopover);
  container.addEventListener('focusout', (e) => {
    if (!container.contains(e.relatedTarget as Node)) {
      hidePopoverWithDelay();
    }
  });

  // Initial render
  update(initialStreak, initialTodayStr);

  return {
    element: container,
    update,
    dispose: () => {
      if (closeTimer) {
        clearTimeout(closeTimer);
        closeTimer = null;
      }
    },
  };
}
