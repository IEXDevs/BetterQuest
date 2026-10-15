import { formatMeetingTime } from './meeting-times';
import { enhanceCourseReviewTab } from './review-enhancer';
import { enhanceCourseHero, disposeCourseHero } from './hero';
import type { Execute } from '../../shared/client';

export function isCourseShowPage(url: string): boolean {
  try {
    const { pathname } = new URL(url);
    // Quest serves this page as `/student/courses/show` and as `/student/courses/show/58735`.
    return pathname === '/student/courses/show' || /^\/student\/courses\/show\/\d+$/.test(pathname);
  } catch {
    return false;
  }
}

/** Writes a class only when it actually changes, so a repeated pass raises no DOM mutation. */
function setClass(node: Element, name: string, on: boolean) {
  if (node.classList.contains(name) === on) return;
  node.classList.toggle(name, on);
}

export function enhanceCourseInfoCard(root: HTMLElement) {
  const infoHeader = root.querySelector<HTMLElement>('#student-course-info-header') ||
    (root.id === 'student-course-info-header' ? root : null);
  if (!infoHeader) return;

  const row = infoHeader.querySelector<HTMLElement>(':scope > .row');
  if (!row) return;

  setClass(infoHeader, 'bq-course-info-header', true);
  setClass(row, 'bq-course-info-row', true);

  const cols = [...row.querySelectorAll<HTMLElement>(':scope > .col')];

  // 1. Clean up instructor column
  const instructorCol = cols.find(col => {
    const qlabel = col.querySelector('.qlabel');
    return /instructor/i.test(qlabel?.textContent || '');
  });
  if (instructorCol) {
    setClass(instructorCol, 'bq-col-instructor', true);
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
    setClass(meetsCol, 'bq-col-meets', true);
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
    setClass(upcomingCol, 'bq-col-upcoming', true);
  }

  // 4. Mark empty columns (and release one that gained the assignment panel
  //    after an earlier pass had written it off as empty).
  for (const col of cols) {
    const text = (col.textContent || '').trim();
    setClass(col, 'bq-col-empty', !text && !col.querySelector('[data-betterquest="assignment-section"]'));
  }
}

/** Assignment category panels on the Assignments tab, open or mid-animation. */
const CATEGORY_PANEL_SELECTOR =
  '#tabs-elements div.collapse, div.collapse[id^="header-"]';

/** Categories the student opened with Quest's own toggle; their choice outranks the default. */
const openedCategories = new WeakMap<Document, Set<string>>();
const trackedDocuments = new WeakSet<Document>();

function isAssignmentCategory(panel: Element): boolean {
  // Never the course info card.
  if (panel.id === 'student-course-info-header') return false;
  // The tab pane that owns the panel decides what it is. Reading the toggle's
  // caption instead would skip real categories, because Quest titles them with
  // weights — "Midterms - 28 percent of grade, lowest dropped" is an assignment
  // category, not a Grades panel.
  const pane = panel.closest<HTMLElement>('.tab-pane');
  if (pane?.id && /grade|review/i.test(pane.id)) return false;
  if (panel.closest('#tabs-grades, #tabs-review, [id*="grades"]')) return false;
  return !/grade/i.test(panel.id);
}

/** Remembers real toggles so a re-rendered or re-opened category can be collapsed again. */
function trackCategoryClicks(document: Document, opened: Set<string>) {
  if (trackedDocuments.has(document)) return;
  trackedDocuments.add(document);
  // Capture phase, so the panel still carries its pre-click state here.
  document.addEventListener('click', event => {
    const button = (event.target as Element | null)?.closest?.('button[data-toggle="collapse"]');
    const id = (button?.getAttribute('data-target') || '').replace(/^#/, '');
    if (!id) return;
    const panel = document.getElementById(id);
    if (!panel || !isAssignmentCategory(panel)) return;
    // A click on an open category closes it, so only a click on a closed one opens it.
    if (panel.classList.contains('show')) opened.delete(id);
    else opened.add(id);
  }, true);
}

/**
 * Force a category closed without Bootstrap's height animation. Leaving
 * `.collapsing` or an inline height behind keeps the panel in-flow and can
 * pump the page taller every time Quest and BetterQuest fight over `.show`.
 */
function forceCategoryClosed(cat: HTMLElement) {
  cat.classList.remove('show', 'collapsing');
  if (cat.style.height) cat.style.removeProperty('height');
  if (cat.style.overflow) cat.style.removeProperty('overflow');
}

export function collapseCourseCategoriesByDefault(document: Document) {
  const opened = openedCategories.get(document) ?? new Set<string>();
  openedCategories.set(document, opened);
  trackCategoryClicks(document, opened);
  for (const cat of document.querySelectorAll<HTMLElement>(CATEGORY_PANEL_SELECTOR)) {
    if (!isAssignmentCategory(cat)) continue;
    // Quest re-renders and re-opens categories on its own; only a real toggle is left alone.
    if (opened.has(cat.id)) continue;
    const isOpen = cat.classList.contains('show') || cat.classList.contains('collapsing');
    const hasBootstrapHeight = Boolean(cat.style.height || cat.style.overflow);
    if (!isOpen && !hasBootstrapHeight) continue;
    forceCategoryClosed(cat);
    const buttons = document.querySelectorAll<HTMLButtonElement>(
      `button[data-target="#${cat.id}"], button[data-target*="${cat.id}"]`
    );
    for (const button of buttons) {
      button.setAttribute('aria-expanded', 'false');
      setClass(button, 'collapsed', true);
      const icon = button.querySelector<HTMLElement>('.material-icons');
      if (icon && icon.textContent === 'remove') {
        icon.textContent = 'add';
      }
    }
  }
}

export function createCourseDetailsFacelift(root: HTMLElement, run?: Execute) {
  let disposed = false;
  const doc = root.ownerDocument;

  function reconcile() {
    if (disposed) return;
    enhanceCourseInfoCard(root);
    enhanceCourseHero(root, run);
    collapseCourseCategoriesByDefault(doc);
    enhanceCourseReviewTab(doc);
  }

  reconcile();
  // Quest injects most category panels AFTER the page settles, and re-renders
  // them on every tab visit. Watch only the assignments tab for late panels —
  // a document-wide observer re-enters on every preview/hero childList write.
  let scheduled = false;
  const collapseLateArrivals = () => {
    if (disposed || scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      if (!disposed) collapseCourseCategoriesByDefault(doc);
    });
  };
  const Observer = doc.defaultView?.MutationObserver;
  const observer = Observer ? new Observer(collapseLateArrivals) : undefined;
  const tabs = doc.querySelector('#tabs-elements') || doc.querySelector('#info-tab-data') || root;
  observer?.observe(tabs, { childList: true, subtree: true });

  return {
    reconcile,
    dispose() {
      disposed = true;
      observer?.disconnect();
      disposeCourseHero(doc);
    },
  };
}
