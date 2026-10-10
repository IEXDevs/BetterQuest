export interface FormattedMeetingTime {
  days: string;
  time: string;
  formatted: string;
}

export function parseDayTokens(rawDays: string): string[] {
  const normalized = rawDays.toUpperCase().trim();
  const dayRegex = /(TH|SU|M|T|W|F|S)/g;
  const matches = normalized.match(dayRegex);
  if (!matches) return [rawDays];

  const map: Record<string, string> = {
    M: 'Monday',
    T: 'Tuesday',
    W: 'Wednesday',
    TH: 'Thursday',
    F: 'Friday',
    S: 'Saturday',
    SU: 'Sunday',
  };

  return matches.map(m => map[m] || m);
}

export function formatSingleClockTime(digits: string): string {
  const clean = digits.trim().replace(/:/g, '');
  if (!/^\d{3,4}$/.test(clean)) return digits.trim();
  const minutes = clean.slice(-2);
  const hours = clean.slice(0, -2);
  return `${hours}:${minutes}`;
}

export function formatMeetingTimeRange(range: string): string {
  const ampmMatch = range.match(/\s*(AM|PM|am|pm)\s*$/i);
  const suffix = ampmMatch ? ` ${ampmMatch[1].toUpperCase()}` : '';
  const cleanRange = range.replace(/\s*(AM|PM|am|pm)\s*$/i, '').trim();

  const parts = cleanRange.split(/\s*[-–—]\s*/);
  if (parts.length === 2) {
    const start = formatSingleClockTime(parts[0]);
    const end = formatSingleClockTime(parts[1]);
    return `${start} - ${end}${suffix}`;
  }
  return `${formatSingleClockTime(cleanRange)}${suffix}`;
}

export function formatMeetingTime(raw: string): FormattedMeetingTime | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.replace(/\s+/g, ' ').trim();
  if (!trimmed) return null;

  if (trimmed.includes(',')) {
    const parts = trimmed.split(',').map(p => formatMeetingTime(p.trim())).filter(Boolean) as FormattedMeetingTime[];
    if (parts.length > 0) {
      return {
        days: parts.map(p => p.days).join(', '),
        time: parts.map(p => p.time).join(', '),
        formatted: parts.map(p => p.formatted).join(', '),
      };
    }
  }

  const match = trimmed.match(/^([A-Za-z]+)\s+([\d:]{3,5}\s*[-–—]\s*[\d:]{3,5}(?:\s*(?:AM|PM|am|pm))?)$/);
  if (match) {
    const rawDays = match[1];
    const rawTime = match[2];
    const daysList = parseDayTokens(rawDays);
    const days = daysList.join('/');
    const time = formatMeetingTimeRange(rawTime);
    return {
      days,
      time,
      formatted: time ? `${days} ${time}` : days,
    };
  }

  if (/^(online|internet|web|tba|arranged|arr|independent study)$/i.test(trimmed)) {
    return {
      days: trimmed,
      time: '',
      formatted: trimmed,
    };
  }

  return null;
}

export function createMeetingTimesEnhancer(table: HTMLTableElement) {
  let disposed = false;
  const modifiedCells = new Map<HTMLTableCellElement, string>();

  function reconcile() {
    if (disposed) return;
    const headers = [...table.querySelectorAll('thead th')].map(th => (th.textContent || '').trim());
    const meetingTimeIndex = headers.findIndex(h => /meeting\s*time/i.test(h));

    for (const row of table.querySelectorAll<HTMLTableRowElement>('tbody > tr')) {
      const cells = [...row.querySelectorAll<HTMLTableCellElement>(':scope > td')];
      let targetCell: HTMLTableCellElement | null = null;
      if (meetingTimeIndex >= 0 && cells[meetingTimeIndex]) {
        targetCell = cells[meetingTimeIndex];
      } else {
        targetCell = cells.find(cell => {
          const text = (cell.textContent || '').trim();
          return /^[A-Za-z]+\s+[\d:]{3,5}\s*[-–—]\s*[\d:]{3,5}/.test(text);
        }) || null;
      }

      if (!targetCell) continue;
      if (targetCell.querySelector('[data-betterquest="meeting-time"]')) continue;

      const raw = targetCell.textContent?.trim() || '';
      const parsed = formatMeetingTime(raw);
      if (!parsed) continue;

      if (!modifiedCells.has(targetCell)) {
        modifiedCells.set(targetCell, raw);
      }

      targetCell.textContent = '';
      const host = targetCell.ownerDocument.createElement('span');
      host.className = 'bq-meeting-time';
      host.dataset.betterquest = 'meeting-time';
      host.dataset.raw = raw;
      host.title = raw;

      const daysSpan = targetCell.ownerDocument.createElement('span');
      daysSpan.className = 'bq-meeting-days';
      daysSpan.textContent = parsed.days;

      if (parsed.time) {
        const sep = targetCell.ownerDocument.createTextNode(' ');
        const hoursSpan = targetCell.ownerDocument.createElement('span');
        hoursSpan.className = 'bq-meeting-hours';
        hoursSpan.textContent = parsed.time;
        host.append(daysSpan, sep, hoursSpan);
      } else {
        host.append(daysSpan);
      }

      targetCell.append(host);
    }
  }

  reconcile();

  return {
    reconcile,
    dispose() {
      disposed = true;
      for (const [cell, original] of modifiedCells) {
        if (cell.isConnected) {
          cell.textContent = original;
        }
      }
      modifiedCells.clear();
    },
  };
}
