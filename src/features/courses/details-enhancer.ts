import { formatMeetingTime } from './meeting-times';
import { enhanceCourseReviewTab } from './review-enhancer';
import { enhanceCourseHero, disposeCourseHero } from './hero';

export function isCourseShowPage(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.pathname === '/student/courses/show' || parsed.pathname.endsWith('/courses/show');
  } catch {
    return false;
  }
}

export function enhanceCourseInfoCard(root: HTMLElement) {
  const infoHeader = root.querySelector<HTMLElement>('#student-course-info-header') ||
    (root.id === 'student-course-info-header' ? root : null);
  if (!infoHeader) return;

  const row = infoHeader.querySelector<HTMLElement>(':scope > .row');
  if (!row) return;

  infoHeader.classList.add('bq-course-info-header');
  row.classList.add('bq-course-info-row');

  const cols = [...row.querySelectorAll<HTMLElement>(':scope > .col')];

  // 1. Clean up instructor column
  const instructorCol = cols.find(col => {
    const qlabel = col.querySelector('.qlabel');
    return /instructor/i.test(qlabel?.textContent || '');
  });
  if (instructorCol) {
    instructorCol.classList.add('bq-col-instructor');
    if (!instructorCol.dataset.betterquestCleaned) {
      instructorCol.dataset.betterquestCleaned = 'true';
      const nameDiv = instructorCol.querySelector<HTMLElement>(':scope > div:not(.qlabel):not(.bq-contact-btn)');
      if (nameDiv) {
        nameDiv.classList.add('bq-instructor-name');
      }
      const mailLink = instructorCol.querySelector<HTMLAnchorElement>('a[href^="mailto:"]');
      if (mailLink && !mailLink.querySelector('svg')) {
        mailLink.classList.add('bq-contact-btn');
        mailLink.setAttribute('aria-label', `Email ${mailLink.textContent || 'instructor'}`);
        mailLink.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg><span>Email Instructor</span>`;
      }
      // Clean up empty whitespace text nodes around the link
      for (const node of [...instructorCol.childNodes]) {
        if (node.nodeType === 3 && !(node.textContent || '').trim()) {
          node.remove();
        }
      }
    }
  }

  // 2. Clean up meets column
  const meetsCol = cols.find(col => {
    const qlabel = col.querySelector('.qlabel');
    return /meets/i.test(qlabel?.textContent || '');
  });
  if (meetsCol) {
    meetsCol.classList.add('bq-col-meets');
    if (!meetsCol.dataset.betterquestCleaned) {
      meetsCol.dataset.betterquestCleaned = 'true';
      // Format meeting time
      const timeDiv = meetsCol.querySelector<HTMLElement>(':scope > div:not(.qlabel):not(.bq-course-location)');
      if (timeDiv) {
        const rawText = timeDiv.textContent?.trim() || '';
        const parsed = formatMeetingTime(rawText);
        if (parsed) {
          timeDiv.textContent = '';
          const host = timeDiv.ownerDocument.createElement('span');
          host.className = 'bq-meeting-time';
          host.dataset.betterquest = 'meeting-time';
          host.dataset.raw = rawText;
          host.title = rawText;

          const daysSpan = timeDiv.ownerDocument.createElement('span');
          daysSpan.className = 'bq-meeting-days';
          daysSpan.textContent = parsed.days;

          if (parsed.time) {
            const sep = timeDiv.ownerDocument.createTextNode(' ');
            const hoursSpan = timeDiv.ownerDocument.createElement('span');
            hoursSpan.className = 'bq-meeting-hours';
            hoursSpan.textContent = parsed.time;
            host.append(daysSpan, sep, hoursSpan);
          } else {
            host.append(daysSpan);
          }
          timeDiv.append(host);
        }
      }

      // Clean up location text (e.g. "in PMA 4.102" or "<br>in PMA 4.102")
      const brs = meetsCol.querySelectorAll('br');
      brs.forEach(br => br.remove());
      for (const node of [...meetsCol.childNodes]) {
        if (node.nodeType === 3) {
          const text = (node.textContent || '').trim();
          if (/^in\s+[A-Za-z0-9.]+/i.test(text) || /[A-Za-z]{2,4}\s+\d+\.\d+/i.test(text)) {
            const locSpan = meetsCol.ownerDocument.createElement('div');
            locSpan.className = 'bq-course-location';
            const locClean = text.replace(/^in\s+/i, '');
            locSpan.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg><span>${locClean}</span>`;
            node.replaceWith(locSpan);
          }
        }
      }
      const otherDivs = meetsCol.querySelectorAll<HTMLElement>(':scope > div:not(.qlabel):not(.bq-course-location)');
      for (const d of otherDivs) {
        const text = (d.textContent || '').trim();
        if ((/^in\s+[A-Za-z0-9.]+/i.test(text) || /[A-Za-z]{2,4}\s+\d+\.\d+/i.test(text)) && !d.querySelector('.bq-meeting-time')) {
          const locClean = text.replace(/^in\s+/i, '');
          d.className = 'bq-course-location';
          d.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg><span>${locClean}</span>`;
        }
      }
    }
  }

  // 3. Mark upcoming assignments column
  const upcomingCol = cols.find(col => col.querySelector('[data-betterquest="assignment-section"]') || col === cols[2]);
  if (upcomingCol) {
    upcomingCol.classList.add('bq-col-upcoming');
  }

  // 4. Mark empty columns (and release one that gained the assignment panel
  //    after an earlier pass had written it off as empty).
  for (const col of cols) {
    const text = (col.textContent || '').trim();
    if (!text && !col.querySelector('[data-betterquest="assignment-section"]')) {
      col.classList.add('bq-col-empty');
    } else {
      col.classList.remove('bq-col-empty');
    }
  }
}

export function collapseCourseCategoriesByDefault(document: Document) {
  const categories = document.querySelectorAll<HTMLElement>(
    '#tabs-elements div.collapse.show, div.collapse.show[id^="header-"]'
  );
  for (const cat of categories) {
    // Only target assignment category panels; never course info header or panels in grades
    if (cat.id === 'student-course-info-header') continue;
    if (cat.closest('#tabs-grades, [id*="grades"], .grades-tab, #info-tab-grades, .tab-pane#tabs-grades')) continue;
    if (/grade/i.test(cat.id)) continue;
    const catButton = document.querySelector<HTMLButtonElement>(`button[data-target*="${cat.id}"]`);
    if (catButton && /grade/i.test(catButton.textContent || '')) continue;

    if (cat.dataset.betterquestDefaultCollapsed === 'true') continue;
    cat.dataset.betterquestDefaultCollapsed = 'true';
    cat.classList.remove('show');
    const buttons = document.querySelectorAll<HTMLButtonElement>(
      `button[data-target="#${cat.id}"], button[data-target*="${cat.id}"]`
    );
    for (const button of buttons) {
      button.setAttribute('aria-expanded', 'false');
      button.classList.add('collapsed');
      const icon = button.querySelector<HTMLElement>('.material-icons');
      if (icon && icon.textContent === 'remove') {
        icon.textContent = 'add';
      }
    }
  }
}

export function createCourseDetailsFacelift(root: HTMLElement) {
  let disposed = false;
  const doc = root.ownerDocument;

  function reconcile() {
    if (disposed) return;
    enhanceCourseInfoCard(root);
    enhanceCourseHero(root);
    collapseCourseCategoriesByDefault(doc);
    enhanceCourseReviewTab(doc);
  }

  reconcile();
  // Quest injects most category panels AFTER the page settles, and re-renders
  // them on every tab visit. Watch for late arrivals so every category ends up
  // collapsed — not only the ones that existed at mount.
  let scheduled = false;
  const collapseLateArrivals = () => {
    if (disposed || scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      if (!disposed) { collapseCourseCategoriesByDefault(doc); enhanceCourseHero(root); }
    });
  };
  const Observer = doc.defaultView?.MutationObserver;
  const observer = Observer ? new Observer(collapseLateArrivals) : undefined;
  observer?.observe(doc.documentElement, { childList: true, subtree: true });

  return {
    reconcile,
    dispose() {
      disposed = true;
      observer?.disconnect();
      disposeCourseHero(doc);
    },
  };
}
