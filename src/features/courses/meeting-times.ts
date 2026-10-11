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

export function parseClockTime(raw: string): { hour: number; minute: number; ampm?: 'AM' | 'PM' } | null {
  const ampmMatch = raw.match(/\b(AM|PM)\b/i);
  const ampm = ampmMatch ? (ampmMatch[1].toUpperCase() as 'AM' | 'PM') : undefined;
  const numOnly = raw.replace(/[^\d:]/g, '').trim();
  const clean = numOnly.replace(/:/g, '');
  if (!clean || !/^\d{3,4}$/.test(clean)) return null;
  const minute = Number(clean.slice(-2));
  const hour = Number(clean.slice(0, -2));
  if (minute >= 60 || hour < 1 || hour > 24) return null;
  return { hour, minute, ampm };
}

function inferAmpm(startHour: number, endHour?: number, explicitEndAmpm?: 'AM' | 'PM'): { startAmpm: 'AM' | 'PM'; endAmpm?: 'AM' | 'PM' } {
  if (explicitEndAmpm) {
    if (endHour !== undefined) {
      if (explicitEndAmpm === 'AM') {
        return { startAmpm: 'AM', endAmpm: 'AM' };
      }
      if (startHour >= 8 && startHour <= 11 && (endHour === 12 || endHour < startHour)) {
        return { startAmpm: 'AM', endAmpm: 'PM' };
      }
      return { startAmpm: 'PM', endAmpm: 'PM' };
    }
    return { startAmpm: explicitEndAmpm };
  }

  const startAmpm: 'AM' | 'PM' = (startHour >= 7 && startHour <= 11) ? 'AM' : 'PM';
  if (endHour === undefined) {
    return { startAmpm };
  }

  let endAmpm: 'AM' | 'PM';
  if (startAmpm === 'AM') {
    if (endHour > startHour && endHour <= 11) {
      endAmpm = 'AM';
    } else {
      endAmpm = 'PM';
    }
  } else {
    endAmpm = 'PM';
  }

  return { startAmpm, endAmpm };
}

export function formatSingleClockTime(digits: string, ampm?: 'AM' | 'PM'): string {
  const parsed = parseClockTime(digits);
  if (!parsed) return digits.trim();
  const resolvedAmpm = ampm || parsed.ampm || inferAmpm(parsed.hour).startAmpm;
  const minutes = String(parsed.minute).padStart(2, '0');
  return `${parsed.hour}:${minutes} ${resolvedAmpm}`;
}

export function formatMeetingTimeRange(range: string): string {
  const explicitRangeAmpm = range.match(/\s*(AM|PM)\s*$/i)?.[1]?.toUpperCase() as 'AM' | 'PM' | undefined;
  const parts = range.split(/\s*[-–—]\s*/);
  if (parts.length === 2) {
    const p1 = parseClockTime(parts[0]);
    const p2 = parseClockTime(parts[1]);
    if (p1 && p2) {
      const explicitEnd = p2.ampm || explicitRangeAmpm;
      const explicitStart = p1.ampm;
      const { startAmpm, endAmpm } = inferAmpm(p1.hour, p2.hour, explicitEnd);
      const startMinutes = String(p1.minute).padStart(2, '0');
      const endMinutes = String(p2.minute).padStart(2, '0');
      return `${p1.hour}:${startMinutes} ${explicitStart || startAmpm} - ${p2.hour}:${endMinutes} ${explicitEnd || endAmpm}`;
    }
  }

  const single = parseClockTime(range);
  if (single) {
    const minutes = String(single.minute).padStart(2, '0');
    const ampm = single.ampm || explicitRangeAmpm || inferAmpm(single.hour).startAmpm;
    return `${single.hour}:${minutes} ${ampm}`;
  }

  return range.trim();
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

  const match = trimmed.match(/^([A-Za-z]+)\s+([\d:]{3,5}(?:\s*(?:AM|PM))?\s*[-–—]\s*[\d:]{3,5}(?:\s*(?:AM|PM))?)$/i);
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
