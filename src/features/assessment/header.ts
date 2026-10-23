import { execute, type Execute } from '../../shared/client';
import { rememberStreakCredit } from '../streak/pending-credit';

/** Keep the original download URL and native link behavior in every assessment view. */
export function createAssessmentHeader(root: HTMLElement, options: { run?: Execute } = {}) {
  const doc = root.ownerDocument;
  const run = options.run || execute;
  const onAssessmentSubmit = () => {
    rememberStreakCredit(doc, run);
  };
  doc.addEventListener('submit', onAssessmentSubmit, true);
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
      border:1px solid var(--bq-border,#3b4b63)!important;
      border-radius:4px!important;font-size:11px!important;line-height:1.4!important;
      white-space:nowrap;overflow-x:auto;scrollbar-width:thin;box-shadow:none!important;
    }
    #main-content .assessment-integrity-banner[data-betterquest-integrity-inline]:focus-visible {outline:2px solid var(--bq-accent,#9cc9ff);outline-offset:2px}

    /* Quest's Slides / Classic links → compact segmented control. */
    #main-content [data-betterquest="view-toggle"]{
      display:inline-flex!important;align-items:center;gap:2px;padding:3px;margin:0 0 0 auto!important;
      border:1px solid var(--bq-border,#d7e2f0);border-radius:8px;
      background:var(--bq-raised,#eef2f6);box-shadow:none;flex-shrink:0;
    }
    #main-content [data-betterquest="view-toggle"] > a,
    #main-content [data-betterquest="view-toggle"] > button{
      display:inline-flex!important;align-items:center;justify-content:center;min-height:30px;
      padding:5px 12px!important;margin:0!important;border:0!important;border-radius:6px!important;
      background:transparent!important;color:var(--bq-muted,#64748b)!important;
      font:700 12px/1.2 inherit!important;text-decoration:none!important;box-shadow:none!important;
      cursor:pointer;white-space:nowrap;transition:background .15s ease,color .15s ease,box-shadow .15s ease;
    }
    #main-content [data-betterquest="view-toggle"] > a:hover,
    #main-content [data-betterquest="view-toggle"] > button:hover{
      color:var(--bq-text,#18253a)!important;background:color-mix(in srgb,var(--bq-surface,#fff) 70%,transparent)!important;
    }
    #main-content [data-betterquest="view-toggle"] > :is(a,button)[data-betterquest-view-active="true"],
    #main-content [data-betterquest="view-toggle"] > :is(a,button)[aria-current="page"],
    #main-content [data-betterquest="view-toggle"][data-betterquest-view-single="true"] > :is(a,button){
      background:linear-gradient(135deg,#8b5cf6,#7c3aed)!important;color:#fff!important;box-shadow:0 1px 4px #00000024!important;
    }
    #main-content [data-betterquest="view-toggle"] > :is(a,button):focus-visible{
      outline:2px solid #7c3aed;outline-offset:1px;
    }
    #main-content[data-betterquest-theme="dark"] [data-betterquest="view-toggle"]{
      background:#1e293b;border-color:#3b4b63;
    }
    #main-content[data-betterquest-theme="dark"] [data-betterquest="view-toggle"] > a,
    #main-content[data-betterquest-theme="dark"] [data-betterquest="view-toggle"] > button{
      color:#94a3b8!important;
    }
    #main-content[data-betterquest-theme="dark"] [data-betterquest="view-toggle"] > a:hover,
    #main-content[data-betterquest-theme="dark"] [data-betterquest="view-toggle"] > button:hover{
      color:#f8fafc!important;background:#334155!important;
    }
    #main-content[data-betterquest-theme="dark"] [data-betterquest="view-toggle"] > :is(a,button)[data-betterquest-view-active="true"],
    #main-content[data-betterquest-theme="dark"] [data-betterquest="view-toggle"] > :is(a,button)[aria-current="page"],
    #main-content[data-betterquest-theme="dark"] [data-betterquest="view-toggle"][data-betterquest-view-single="true"] > :is(a,button){
      background:linear-gradient(135deg,#8b5cf6,#6d28d9)!important;color:#fff!important;
    }
    /* Quest's worked-solutions PDF joins the assignment download in one toolbar. */
    #main-content [data-betterquest-explanation="true"]{
      display:inline-flex!important;align-items:center;margin-left:10px!important;padding:5px 10px!important;
      border:1px solid var(--bq-border,#d7e2f0)!important;border-radius:6px!important;
      background:var(--bq-raised,#eef2f6)!important;color:var(--bq-muted,#64748b)!important;
      font:700 12px/1.2 inherit!important;text-decoration:none!important;
    }
    #main-content [data-betterquest-theme="dark"] [data-betterquest-explanation="true"],
    #main-content[data-betterquest-theme="dark"] [data-betterquest-explanation="true"]{ color:#a9b8ca!important; }
    /* Keep the due / download / view-toggle cluster on one toolbar row. */
    #main-content #info-header-div > .d-flex.justify-content-between[data-betterquest-view-bar="true"],
    #main-content [data-betterquest-due-row][data-betterquest-view-bar="true"]{
      display:flex!important;align-items:center;flex-wrap:wrap;gap:8px 12px;width:100%;
    }
    /* Quest redraws a blue Slides/Classic control beside ours — never show it. */
    #main-content [data-betterquest-view-duplicate="true"]{display:none!important}
    /* Instant hide while JS catches up: Quest reinjects btn-primary into the header. */
    #main-content[data-betterquest-view-hosted="true"] #info-header-div a.btn-primary:not([data-betterquest-download]),
    #main-content[data-betterquest-view-hosted="true"] #info-header-div a.btn-secondary:not([data-betterquest-download]),
    #main-content[data-betterquest-view-hosted="true"] #info-header-div a.float-right:not([data-betterquest-download]){
      display:none!important
    }
  `;
  doc.head.append(style);
  const restores: Array<() => void> = [];
  const handled = new WeakSet<HTMLAnchorElement>();
  const notices = new Map<HTMLElement, { marker: Comment; tabIndex: string | null }>();
  let viewToggle: HTMLElement | null = null;
  const viewRestore: Array<() => void> = [];

  function labelOf(el: Element): string {
    return (el.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function isViewLink(el: Element): 'slides' | 'classic' | null {
    const text = labelOf(el);
    if (/^slides?$/i.test(text)) return 'slides';
    if (/^classic$/i.test(text)) return 'classic';
    return null;
  }

  /**
   * Quest stacks "Due date" and then "Completed" on one metadata line. The
   * download belongs after every date on that line, so the toolbar reads in the
   * order a student scans it. Without a Completed line it stays on the due date.
   */
  function downloadHost(due: HTMLElement): HTMLElement {
    const line = due.closest<HTMLElement>('#due-date-messaging-div') || due.parentElement;
    if (!line) return due;
    const completed = [...line.children].filter(child =>
      /^completed/i.test(labelOf(child)) && /\d/.test(child.textContent || ''));
    return (completed[completed.length - 1] as HTMLElement | undefined) || due;
  }

  /**
   * Quest's explanation PDF is a different document from the assignment PDF, so
   * it stays reachable — it just joins the download in the toolbar instead of
   * sitting alone in its own leftover row.
   */
  function collectExplanationLinks(download: HTMLAnchorElement) {
    const links = [...root.querySelectorAll<HTMLAnchorElement>('a[href*="/images/explanation_pdf"]')]
      .filter(link => !link.closest('[data-betterquest]') && link !== download);
    for (const link of links) {
      const marker = doc.createComment('BetterQuest explanation PDF position');
      link.before(marker);
      const originalParent = link.parentElement;
      link.textContent = 'PDF with solutions';
      link.dataset.betterquestExplanation = 'true';
      download.after(link);
      restores.push(() => {
        if (marker.parentNode) marker.replaceWith(link);
        else originalParent?.append(link);
        link.removeAttribute('data-betterquest-explanation');
      });
      if (originalParent && originalParent !== download.parentElement && !originalParent.textContent?.trim() &&
          !originalParent.querySelector('a,button,input,select,iframe,canvas,img,table')) {
        originalParent.dataset.betterquestDownloadGap = 'true';
        restores.push(() => originalParent.removeAttribute('data-betterquest-download-gap'));
      }
    }
  }

  function findViewControls(): HTMLElement[] {
    const byKind = new Map<string, HTMLElement>();
    // Prefer links we already host (often inside the PDF shadow toolbar).
    // Quest re-injects a blue Slides/Classic control into the header on redraw;
    // if that duplicate wins, purple and blue flicker every reconcile.
    // Include hosted links even if the toggle was briefly detached (PDF slot remount).
    if (viewToggle) {
      for (const el of viewToggle.querySelectorAll<HTMLElement>('a, button')) {
        const kind = isViewLink(el);
        if (kind) byKind.set(kind, el);
      }
    }
    const scope = root.querySelector('#info-header-div') || root;
    for (const el of scope.querySelectorAll<HTMLElement>('a, button')) {
      if (el.closest('[data-betterquest="view-toggle"]')) continue;
      if (el.hasAttribute('data-betterquest-download')) continue;
      const kind = isViewLink(el);
      if (!kind) continue;
      if (byKind.has(kind)) {
        // Duplicate native control — hide it so the blue Quest button cannot flash.
        if (!el.hasAttribute('data-betterquest-view-duplicate')) {
          el.dataset.betterquestViewDuplicate = 'true';
          viewRestore.push(() => el.removeAttribute('data-betterquest-view-duplicate'));
        }
        continue;
      }
      byKind.set(kind, el);
    }
    return [...byKind.values()];
  }

  /**
 * The interactive PDF toolbar lives in a shadow root. When it is on screen the
 * view switch belongs directly beside the PDF dark/light switch; slides mode has
 * no such toolbar, so it stays top right on the header row.
 */
function pdfToolbarSlot(document: Document): HTMLElement | null {
    const host = document.querySelector<HTMLElement>('[data-betterquest="interactive-pdf"]');
    return host?.shadowRoot?.querySelector<HTMLElement>('[data-betterquest="view-toggle-slot"]') || null;
  }

function placeViewToggle(controls: HTMLElement[]) {
    if (!controls.length) return;
    const header = root.querySelector<HTMLElement>('#info-header-div');
    const due = header?.querySelector('#due_date_field') ||
      root.querySelector<HTMLElement>('[data-betterquest-due-row]');
    const dueRow = due?.closest<HTMLElement>('.d-flex.justify-content-between') ||
      due?.closest<HTMLElement>('[data-betterquest-due-row]') ||
      due?.parentElement;

    if (!viewToggle) {
      viewToggle = doc.createElement('div');
      viewToggle.dataset.betterquest = 'view-toggle';
      viewToggle.setAttribute('role', 'group');
      viewToggle.setAttribute('aria-label', 'Assignment view');
    }

    for (const control of controls) {
      if (control.parentElement === viewToggle) continue;
      const marker = doc.createComment('BetterQuest view toggle position');
      control.before(marker);
      // Annotated: comparing this against `viewToggle` (a `let` that dispose()
      // reassigns) otherwise makes TS infer a circular type for `parent`.
      const parent: HTMLElement | null = control.parentElement;
      // Drop Quest's blue button classes so the purple segment is the only look.
      control.classList.remove('btn', 'btn-primary', 'btn-secondary', 'btn-link', 'float-right');
      viewToggle.append(control);
      viewRestore.push(() => {
        if (marker.parentNode) marker.replaceWith(control);
        else parent?.append(control);
        control.removeAttribute('data-betterquest-view-active');
        control.removeAttribute('data-betterquest-view-kind');
      });
      // Hide an emptied native wrapper so we do not leave a stray blank slot.
      if (parent && parent !== dueRow && parent !== viewToggle &&
          !(parent.textContent || '').trim() &&
          !parent.querySelector('a,button,input,select,iframe,img,table,[data-betterquest]')) {
        (parent as HTMLElement).dataset.betterquestDownloadGap = 'true';
        viewRestore.push(() => parent.removeAttribute('data-betterquest-download-gap'));
      }
    }

    const slidesMode = Boolean(root.querySelector('#presentation-div'));
    const kids = [...viewToggle.children] as HTMLElement[];
    if (kids.length === 1) viewToggle.dataset.betterquestViewSingle = 'true';
    else viewToggle.removeAttribute('data-betterquest-view-single');
    for (const control of kids) {
      const kind = isViewLink(control);
      if (!kind) continue;
      control.dataset.betterquestViewKind = kind;
      // Pair mode: highlight the current view. Single mode: the lone link is the
      // switch action (Quest only offers the other view), so it stays emphasized.
      const active = kids.length === 1 ? true : (kind === 'slides' ? slidesMode : !slidesMode);
      if (active) control.dataset.betterquestViewActive = 'true';
      else control.removeAttribute('data-betterquest-view-active');
    }

    const slot = pdfToolbarSlot(doc);
    const pdfHost = doc.querySelector<HTMLElement>('[data-betterquest="interactive-pdf"]');
    const shadow = pdfHost?.shadowRoot;
    const shadowActions = shadow?.querySelector<HTMLElement>('.toolbar-actions');
    const headerHost = dueRow || header || root.querySelector('#target') || root;
    const inPdfShadow = (el: Node) => Boolean(shadow?.contains(el));
    // Prefer the PDF toolbar slot, but never bounce back to the header while the
    // interactive PDF host still exists — slot nodes flicker during PDF remounts.
    let host: HTMLElement = headerHost;
    if (slot?.isConnected) {
      host = slot;
    } else if (viewToggle.isConnected && inPdfShadow(viewToggle) && viewToggle.parentElement) {
      host = viewToggle.parentElement;
    } else if (shadowActions?.isConnected) {
      // Slot removed mid-remount — park beside Dark pages, not in the header.
      host = shadowActions;
    }
    if (viewToggle.parentElement !== host) host.append(viewToggle);
    const inPdf = inPdfShadow(viewToggle);
    viewToggle.dataset.betterquestViewPlacement = (slot && viewToggle.parentElement === slot) || inPdf
      ? 'pdf-toolbar'
      : 'header';
    if (dueRow) dueRow.dataset.betterquestViewBar = 'true';
    const main = doc.getElementById('main-content') || root;
    main.setAttribute('data-betterquest-view-hosted', 'true');
  }

  function reconcileViewToggle() {
    const controls = findViewControls();
    if (!controls.length) {
      // Keep the purple host through Quest redraw windows. Tearing it down
      // restores the blue Slides button for a frame — that is the flicker.
      return;
    }
    placeViewToggle(controls);
  }

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
      // Already promoted, or claimed by the view switch / another BetterQuest host.
      if (link.hasAttribute('data-betterquest-download') || handled.has(link)) continue;
      if (link.closest('[data-betterquest="view-toggle"], [data-betterquest="interactive-pdf"]')) continue;
      // Href selects the assignment PDF; explanation/solution links use different paths.
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
      // Quest puts the download in its own row below the dates. If it already
      // sits on the due line, keep that row as the starting point so the
      // download can still be moved behind "Completed".
      let due: HTMLElement | null = null;
      if (nearDue && /\bdue(?:\s+date)?\b/i.test(nearDue.textContent || '')) due = nearDue;
      else due = findDue();
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
      if (due) {
        const host = downloadHost(due);
        if (host !== link.parentElement) {
          host.dataset.betterquestDueRow = 'true';
          host.append(link);
          restores.push(() => host.removeAttribute('data-betterquest-due-row'));
        }
        due = host;
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
      collectExplanationLinks(link);
    }
    reconcileViewToggle();
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
    for (const restore of viewRestore.splice(0).reverse()) restore();
    viewToggle?.remove();
    viewToggle = null;
    (doc.getElementById('main-content') || root).removeAttribute('data-betterquest-view-hosted');
    root.querySelectorAll('[data-betterquest-view-bar]').forEach(el => el.removeAttribute('data-betterquest-view-bar'));
    doc.removeEventListener('submit', onAssessmentSubmit, true);
    for (const restore of restores.splice(0).reverse()) restore(); style.remove();
  } };
}
