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
  `;
  doc.head.append(style);
  const restores: Array<() => void> = [];
  const handled = new WeakSet<HTMLAnchorElement>();
  function reconcile() {
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
      const due = alreadyPlaced ? null : findDue();
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
  return { reconcile, dispose() { for (const restore of restores.splice(0).reverse()) restore(); style.remove(); } };
}
