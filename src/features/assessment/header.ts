/** Keep the original download URL and native link behavior in every assessment view. */
export function createAssessmentHeader(root: HTMLElement) {
  const doc = root.ownerDocument;
  const style = doc.createElement('style');
  style.dataset.betterquest = 'assessment-header-style';
  style.textContent = `
    [data-betterquest-due-row]{display:flex!important;align-items:center;flex-wrap:wrap;gap:8px 12px!important;margin:0!important;padding:0!important;grid-column:1/-1;order:0!important}
    #main-content a[data-betterquest-download]{display:inline-flex!important;align-items:center;justify-content:center;min-height:34px;padding:6px 12px!important;margin:0!important;border:1px solid var(--bq-border,#cbd5e1)!important;border-radius:6px;background:var(--bq-surface,#fff)!important;color:var(--bq-text,#18253a)!important;font:600 13px/1.4 inherit;text-decoration:none!important;box-shadow:none!important;transform:none!important;white-space:nowrap}
    #main-content a[data-betterquest-download]:hover{background:var(--bq-raised,#eef3f6)!important}
    #main-content a[data-betterquest-download]:focus-visible{outline:2px solid #2563eb;outline-offset:3px}
    [data-betterquest-download-gap]{display:none!important}
    #main-content .assessment-integrity-banner[data-betterquest-integrity-inline] {
      display:block!important;max-width:100%;min-width:0;box-sizing:border-box;
      margin:3px 0 0!important;padding:3px 7px!important;
      background:var(--bq-surface,#182434)!important;color:var(--bq-muted,#a9b8ca)!important;
      border:1px solid var(--bq-border,#3b4b63)!important;border-left-width:1px!important;
      border-radius:4px!important;font-size:11px!important;line-height:1.4!important;
      white-space:nowrap;overflow-x:auto;scrollbar-width:thin;box-shadow:none!important;
    }
    #main-content .assessment-integrity-banner[data-betterquest-integrity-inline]:focus-visible {outline:2px solid var(--bq-accent,#9cc9ff);outline-offset:2px}
  `;
  doc.head.append(style);
  const restores: Array<() => void> = [];
  const handled = new WeakSet<HTMLAnchorElement>();
  const notices = new Map<HTMLElement, { marker: Comment; tabIndex: string | null }>();
  function reconcile() {
    const header = root.querySelector<HTMLElement>('#info-header-div');
    const due = header?.querySelector('#due_date_field');
    const dueAndSlides = due?.closest('.d-flex.justify-content-between');
    const notice = root.querySelector<HTMLElement>('.assessment-integrity-banner');
    if (header && dueAndSlides && header.contains(dueAndSlides) && notice && !notice.contains(header)) {
      if (!notices.has(notice)) {
        const marker = doc.createComment('BetterQuest integrity notice position');
        notice.before(marker);
        notices.set(notice, { marker, tabIndex: notice.getAttribute('tabindex') });
        notice.dataset.betterquestIntegrityInline = 'true';
        // Full text remains available by horizontal scroll and assistive technology.
        notice.tabIndex = 0;
      }
      if (dueAndSlides.nextElementSibling !== notice) dueAndSlides.after(notice);
    }
    for (const link of root.querySelectorAll<HTMLAnchorElement>('a[href*="/images/problem_pdf"], a[href*="/images/download_pdf"]')) {
      if (handled.has(link) || link.closest('[data-betterquest]')) continue;
      // Only the native problem PDF link; never relabel a solution download.
      if (!/PDF/i.test(link.textContent || '')) continue;
      handled.add(link);
      const originalNodes = [...link.childNodes];
      const marker = doc.createComment('BetterQuest PDF link position');
      link.before(marker);
      const originalParent = link.parentElement;
      link.textContent = 'PDF Download';
      link.dataset.betterquestDownload = 'true';
      const findDue = (): HTMLElement | null => {
        const leaf = [...root.querySelectorAll<HTMLElement>('p, div, span, td, th, li')].find(el =>
          /\bdue(?:\s+date)?\b/i.test(el.textContent || '') &&
          !el.querySelector('p, div, table, iframe, select, input, [data-betterquest], [data-betterquest-download]') &&
          !el.contains(link) &&
          (el.textContent || '').length < 220);
        if (leaf) return leaf;
        // Slides pages nest the due line (icons, labels, date blocks); climb from the matching text node.
        const showText: number = doc.defaultView?.NodeFilter?.SHOW_TEXT ?? 4;
        const walker = doc.createTreeWalker(root, showText);
        let fallback: HTMLElement | null = null;
        let node = walker.nextNode();
        while (node) {
          const text = node.textContent || '';
          if (/\bdue(?:\s+date)?\b/i.test(text)) {
            let el = (node as Text).parentElement;
            while (el && el !== root && /^(span|b|i|strong|em|font|small|label|a)$/i.test(el.tagName)) el = el.parentElement;
            if (el && el !== root && !el.contains(link) &&
              !el.querySelector('table, iframe, canvas, select, img, svg, [data-betterquest-download]')) {
              const len = (el.textContent || '').length;
              if (len > 0 && len <= 300) {
                if (/due\s+date/i.test(text)) return el;
                fallback ??= el;
              }
            }
          }
          node = walker.nextNode();
        }
        return fallback;
      };
      const nearDue = link.parentElement;
      const alreadyPlaced = Boolean(nearDue && /\bdue(?:\s+date)?\b/i.test(nearDue.textContent || ''));
      let due = alreadyPlaced ? null : findDue();
      // A bare "Due date" label is not the row: the row carries the label AND
      // the date value, and the download belongs on that line, to their right.
      if (due && !/\d/.test(due.textContent || '')) {
        const row = due.parentElement;
        if (row && row !== root && !row.contains(link) &&
          /\bdue(?:\s+date)?\b/i.test(row.textContent || '') &&
          /\d/.test(row.textContent || '') &&
          (row.textContent || '').length <= 300 &&
          !row.querySelector('p, table, iframe, canvas, select, img, svg, input, button, [data-betterquest-download]')) {
          due = row;
        }
      }
      if (due && !due.contains(link)) {
        due.dataset.betterquestDueRow = 'true';
        due.append(link);
        restores.push(() => due.removeAttribute('data-betterquest-due-row'));
      }
      if (originalParent && originalParent !== due && !originalParent.textContent?.trim() &&
          !originalParent.querySelector('a,button,input,select,iframe,canvas,img,table') && originalParent !== root) {
        originalParent.dataset.betterquestDownloadGap = 'true';
        restores.push(() => originalParent.removeAttribute('data-betterquest-download-gap'));
      }
      // Collapse only line breaks bordering the moved link or its empty wrapper.
      for (const sibling of [marker.previousSibling, marker.nextSibling, originalParent?.previousSibling, originalParent?.nextSibling]) {
        if (sibling?.nodeType === 1 && (sibling as Element).tagName === 'BR') {
          (sibling as HTMLElement).dataset.betterquestDownloadGap = 'true';
          restores.push(() => (sibling as Element).removeAttribute('data-betterquest-download-gap'));
        }
      }
      restores.push(() => {
        if (marker.parentNode) marker.replaceWith(link);
        link.replaceChildren(...originalNodes);
        link.removeAttribute('data-betterquest-download');
      });
    }
  }
  return { reconcile, dispose() {
    for (const [notice, original] of notices) {
      if (original.marker.isConnected && notice.isConnected) original.marker.replaceWith(notice);
      else original.marker.remove();
      notice.removeAttribute('data-betterquest-integrity-inline');
      if (original.tabIndex === null) notice.removeAttribute('tabindex');
      else notice.setAttribute('tabindex', original.tabIndex);
    }
    notices.clear();
    for (const restore of restores.splice(0).reverse()) restore(); style.remove();
  } };
}
