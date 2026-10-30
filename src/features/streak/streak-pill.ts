import type { StreakData } from '../../shared/models';
import {
  getStreakBadgeStatus,
  getStreakCalendar,
  localDateString,
  reconcileStreak,
  type CalendarMonth,
  type StreakContext,
} from './streak-service';

export interface StreakPillController {
  /** The root DOM element representing the streak pill with hover popover. */
  element: HTMLElement;
  /** Re-renders the streak pill and popover with new streak data. */
  update(streak?: StreakData | null, todayStr?: string, context?: StreakContext): void;
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
    background: #16a34a;
    border: 1px solid #16a34a;
    color: #ffffff;
    font: 700 12px/1 inherit;
    letter-spacing: .02em;
    cursor: pointer;
    user-select: none;
    transition: all .18s ease;
    white-space: nowrap;
  }
  .streak-badge:hover {
    background: #15803d;
    border-color: #15803d;
    color: #ffffff;
  }
  .streak-badge.active,
  .streak-badge[data-state="active"] {
    background: #16a34a;
    border: 1px solid #16a34a;
    color: #ffffff;
  }
  .streak-badge.active:hover,
  .streak-badge[data-state="active"]:hover {
    background: #15803d;
    border-color: #15803d;
    color: #ffffff;
  }
  .streak-badge.frozen,
  .streak-badge[data-state="frozen"] {
    background: #2563eb;
    border: 1px solid #2563eb;
    color: #ffffff;
  }
  .streak-badge.frozen:hover,
  .streak-badge[data-state="frozen"]:hover {
    background: #1d4ed8;
    border-color: #1d4ed8;
    color: #ffffff;
  }
  .streak-badge.broken,
  .streak-badge[data-state="broken"] {
    background: #dc2626;
    border: 1px solid #dc2626;
    color: #ffffff;
  }
  .streak-badge.broken:hover,
  .streak-badge[data-state="broken"]:hover {
    background: #b91c1c;
    border-color: #b91c1c;
    color: #ffffff;
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
    padding: 1px 6px;
    border-radius: 6px;
    font-size: 10px;
    font-weight: 700;
    background: #1d4ed8;
    border: 1px solid rgba(255, 255, 255, 0.6);
    color: #ffffff;
  }
  .streak-calendar-popover {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    z-index: 1000;
    width: 320px;
    max-width: calc(100vw - 32px);
    padding: 12px;
    background: var(--bq-surface, #ffffff);
    color: var(--bq-text, #1e293b);
    border: 1px solid var(--bq-border, #e2e8f0);
    border-radius: 12px;
    box-shadow: 0 16px 36px -8px rgba(0, 0, 0, 0.18), 0 8px 16px -4px rgba(0, 0, 0, 0.08);
    overflow: visible;
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
    margin-bottom: 8px;
  }
  .streak-cal-title {
    font-weight: 600;
    font-size: 13px;
    color: var(--bq-text, #1e293b);
  }
  .streak-cal-nav {
    background: none;
    border: none;
    border-radius: 6px;
    width: 24px;
    height: 24px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 16px;
    color: var(--bq-muted, #64748b);
    padding: 0;
    line-height: 1;
  }
  .streak-cal-nav:hover:not(:disabled) {
    background: var(--bq-raised, #f1f5f9);
    color: var(--bq-text, #1e293b);
  }
  .streak-cal-nav:disabled {
    opacity: 0.3;
    cursor: default;
  }
  .streak-cal-dow-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    text-align: center;
    font-size: 11px;
    font-weight: 500;
    color: var(--bq-muted, #94a3b8);
    margin-bottom: 4px;
  }
  .streak-cal-grid {
    position: relative;
    z-index: 2;
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 2px;
    text-align: center;
    overflow: visible;
  }
  .streak-cal-cell {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 32px;
    border-radius: 6px;
    font-size: 13px;
    cursor: default;
    overflow: visible;
    color: var(--bq-muted, #64748b);
  }
  .streak-cal-cell:hover:not(.streak-cal-empty),
  .streak-cal-cell.is-hovered:not(.streak-cal-empty) {
    z-index: 6;
  }
  .streak-day-tip {
    position: absolute;
    left: 50%;
    bottom: calc(100% + 8px);
    z-index: 8;
    display: none;
    width: max-content;
    max-width: 180px;
    padding: 6px 8px;
    border-radius: 8px;
    background: #18253a;
    color: #fff;
    font-size: 12px;
    font-weight: 500;
    line-height: 1.35;
    text-align: center;
    white-space: normal;
    pointer-events: none;
    transform: translateX(-50%);
    box-shadow: 0 8px 18px rgba(15, 23, 42, 0.22);
  }
  .streak-day-tip::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 5px solid transparent;
    border-top-color: #18253a;
  }
  .streak-cal-cell:hover .streak-day-tip,
  .streak-cal-cell.is-hovered .streak-day-tip,
  .streak-cal-cell:focus-visible .streak-day-tip {
    display: block;
  }
  .streak-cal-num {
    font-size: 13px;
    font-weight: 500;
    color: inherit;
    line-height: 1;
  }
  .streak-cal-day.status-active,
  .streak-cal-day.status-kept,
  .streak-cal-day.status-rest {
    background: color-mix(in srgb, #16a34a 14%, transparent);
    color: #15803d;
    font-weight: 600;
  }
  .streak-cal-day.status-active .streak-cal-num,
  .streak-cal-day.status-kept .streak-cal-num,
  .streak-cal-day.status-rest .streak-cal-num {
    font-weight: 700;
    color: #15803d;
  }
  .streak-cal-day.status-frozen {
    background: color-mix(in srgb, #2563eb 14%, transparent);
    color: #1d4ed8;
    font-weight: 600;
  }
  .streak-cal-day.status-missed {
    background: color-mix(in srgb, #dc2626 12%, transparent);
    color: #b91c1c;
    font-weight: 600;
  }
  .streak-cal-day.is-today {
    outline: 1px solid currentColor;
    outline-offset: -1px;
  }
  .streak-cal-day.status-before-start,
  .streak-cal-day.status-future {
    color: var(--bq-muted, #cbd5e1);
    opacity: 0.7;
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

      const note = d.reason;
      cell.setAttribute('aria-label', `${d.dateStr}: ${note}`);
      cell.tabIndex = 0;

      const num = create('span');
      num.className = 'streak-cal-num';
      num.textContent = String(d.day);

      const tip = create('div');
      tip.className = 'streak-day-tip';
      tip.setAttribute('role', 'tooltip');
      tip.textContent = note;

      cell.addEventListener('mouseenter', () => cell.classList.add('is-hovered'));
      cell.addEventListener('mouseleave', () => cell.classList.remove('is-hovered'));
      cell.addEventListener('focus', () => cell.classList.add('is-hovered'));
      cell.addEventListener('blur', () => cell.classList.remove('is-hovered'));

      cell.append(num, tip);
      daysGrid.append(cell);
    }

    popover.append(header, dowGrid, daysGrid);
  }

  function update(streak?: StreakData | null, todayStr?: string, context?: StreakContext) {
    currentTodayStr = todayStr || localDateString();
    currentStreak = reconcileStreak(streak, currentTodayStr, context);

    const { status, label, count } = getStreakBadgeStatus(currentStreak, currentTodayStr, context);

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
    badge.title = currentStreak?.longest && currentStreak.longest !== count
      ? `${label} · Best ${currentStreak.longest}`
      : label;

    if (currentStreak?.freezesAvailable) {
      const freezeTag = create('span');
      freezeTag.className = 'streak-freeze-tag';
      const freezeCount = currentStreak.freezesAvailable;
      freezeTag.textContent = freezeCount === 1 ? '1 freeze' : `${freezeCount} freezes`;
      freezeTag.title = freezeTag.textContent;
      badge.append(freezeTag);
    }

    // Refresh Calendar Data
    calendarMonths = getStreakCalendar(currentStreak, currentTodayStr, context);
    // Default to the current month (last month in array)
    viewingMonthIndex = Math.max(0, calendarMonths.length - 1);
    renderMonth();
  }

  const hoverDelayMs = 150;
  let hoverTimer: ReturnType<typeof setTimeout> | null = null;
  let pointerInside = false;
  let pressing = false;

  function clearHoverTimer() {
    if (hoverTimer !== null) {
      clearTimeout(hoverTimer);
      hoverTimer = null;
    }
  }

  function showPopover() {
    clearHoverTimer();
    container.classList.add('is-open');
    badge.setAttribute('aria-expanded', 'true');
    popover.setAttribute('aria-hidden', 'false');
  }

  function hidePopover() {
    if (pointerInside || pressing) return;
    clearHoverTimer();
    container.classList.remove('is-open');
    badge.setAttribute('aria-expanded', 'false');
    popover.setAttribute('aria-hidden', 'true');
  }

  function schedulePopover() {
    if (container.classList.contains('is-open') || hoverTimer !== null) return;
    hoverTimer = setTimeout(showPopover, hoverDelayMs);
  }

  function releasePress() {
    if (!pressing) return;
    pressing = false;
    hidePopover();
  }

  container.addEventListener('mouseenter', () => {
    pointerInside = true;
    schedulePopover();
  });
  container.addEventListener('mouseleave', () => {
    pointerInside = false;
    hidePopover();
  });
  container.addEventListener('mousedown', () => {
    pressing = true;
    showPopover();
  });
  domDoc.addEventListener('mouseup', releasePress);
  container.addEventListener('focusin', showPopover);
  container.addEventListener('focusout', (e) => {
    if (pointerInside || pressing) return;
    if (container.contains(e.relatedTarget as Node)) return;
    hidePopover();
  });

  // Initial render
  update(initialStreak, initialTodayStr);

  return {
    element: container,
    update,
    dispose() {
      clearHoverTimer();
      domDoc.removeEventListener('mouseup', releasePress);
    },
  };
}

