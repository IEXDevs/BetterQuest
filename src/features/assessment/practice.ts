import { findPracticeSlides } from '../../adapters/quest/assessment';

/**
 * Quest's Slides view for practice and informational items ships as bare MDB:
 * an `h2` with floating spans, two icon buttons separated by spacer divs, and
 * the slide body in a `col-md-*`. None of that is styled, so the page is the
 * one place in Quest the extension currently leaves untouched.
 *
 * This rebuilds only the chrome — the question bar and the pager. Question
 * bodies are left exactly as Quest renders them.
 */

const PRACTICE_STYLES = `
  /* Question bar: index chip, title, points pill. */
  #main-content #target[data-betterquest-practice="true"] #question-bar-div {
    margin: 4px 0 16px !important;
  }
  #main-content #target[data-betterquest-practice="true"] #question-bar-div .questionBar {
    display: flex !important;
    flex-wrap: wrap !important;
    align-items: center !important;
    gap: 8px 12px !important;
    height: auto !important;
    min-height: 0 !important;
    margin: 0 !important;
    padding: 14px 18px !important;
    border: 1px solid var(--bq-border, #dbe3ee) !important;
    border-radius: 14px !important;
    background: var(--bq-raised, #f1f5f9) !important;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05) !important;
  }
  #main-content #target[data-betterquest-practice="true"] #question-bar-div .currentQuestionIndex {
    display: inline-grid !important;
    place-items: center !important;
    flex: 0 0 auto !important;
    min-width: 30px !important;
    height: 30px !important;
    padding: 0 9px !important;
    border-radius: 9px !important;
    background: #2563eb !important;
    color: #fff !important;
    font-size: 14px !important;
    font-weight: 800 !important;
    line-height: 1 !important;
  }
  #main-content #target[data-betterquest-practice="true"] #question-bar-div .elementName {
    flex: 1 1 220px !important;
    min-width: 0 !important;
    color: var(--bq-text, #0f172a) !important;
    font-size: 17px !important;
    font-weight: 750 !important;
    line-height: 1.3 !important;
  }
  #main-content #target[data-betterquest-practice="true"] #question-bar-div .pooledQuestions:empty { display: none !important; }
  #main-content #target[data-betterquest-practice="true"] #question-bar-div .itemPoints {
    flex: 0 0 auto !important;
    padding: 5px 11px !important;
    border: 1px solid var(--bq-border, #dbe3ee) !important;
    border-radius: 999px !important;
    background: var(--bq-surface, #fff) !important;
    color: var(--bq-muted, #475569) !important;
    font-size: 12px !important;
    font-weight: 700 !important;
    white-space: nowrap !important;
  }
  /* Quest often leaves whitespace inside .itemPoints, so :empty alone is not enough. */
  #main-content #target[data-betterquest-practice="true"] #question-bar-div .itemPoints:empty,
  #main-content #target[data-betterquest-practice="true"] #question-bar-div .itemPoints[data-betterquest-empty="true"] {
    display: none !important;
  }

  /* Pager: one toolbar, real buttons, a progress track instead of spacer divs. */
  #main-content #target[data-betterquest-practice="true"] #upper-paging-div {
    margin: 0 0 18px !important;
  }
  #main-content #target[data-betterquest-practice="true"] #upper-paging-div > .d-flex {
    align-items: center !important;
    gap: 10px !important;
  }
  #main-content #target[data-betterquest-practice="true"] #upper-paging-div > .d-flex > div:empty,
  #main-content #target[data-betterquest-practice="true"] #upper-paging-div br { display: none !important; }
  #main-content #target[data-betterquest-practice="true"] #upper-paging-div button.btn-primary {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    width: 36px !important;
    height: 36px !important;
    padding: 0 !important;
    border: 1px solid var(--bq-border, #dbe3ee) !important;
    border-radius: 10px !important;
    background: var(--bq-surface, #fff) !important;
    color: var(--bq-text, #18253a) !important;
    line-height: 1 !important;
    box-shadow: none !important;
    transition: background-color .15s ease, border-color .15s ease, transform .15s ease !important;
  }
  #main-content #target[data-betterquest-practice="true"] #upper-paging-div button.btn-primary:hover {
    border-color: #2563eb !important;
    background: color-mix(in srgb, #2563eb 10%, var(--bq-surface, #fff)) !important;
  }
  #main-content #target[data-betterquest-practice="true"] #upper-paging-div button.btn-primary:active { transform: scale(0.96); }
  #main-content #target[data-betterquest-practice="true"] #upper-paging-div button[disabled] {
    opacity: 0.4 !important;
    cursor: not-allowed !important;
  }
  #main-content #target[data-betterquest-practice="true"] #upper-paging-div .h5 {
    display: flex !important;
    align-items: center !important;
    gap: 10px !important;
    margin: 0 !important;
    color: var(--bq-muted, #64748b) !important;
    font-size: 13px !important;
    font-weight: 700 !important;
    white-space: nowrap !important;
  }
  #main-content #target[data-betterquest-practice="true"] #upper-paging-div .h5 .currentQuestionIndex {
    display: inline-block !important;
    width: auto !important;
    height: auto !important;
    min-width: 0 !important;
    padding: 0 !important;
    border-radius: 0 !important;
    background: none !important;
    color: var(--bq-text, #0f172a) !important;
    font-size: 13px !important;
    font-weight: 800 !important;
  }

  /* Slide body gets its own breathing room inside Quest's column grid. */
  #main-content #target[data-betterquest-practice="true"] #presentation-div { margin-bottom: 8px !important; }
`;

function readProgress(root: HTMLElement): { current: number; total: number } {
  const paging = root.querySelector('#upper-paging-div');
  const current = Number(paging?.querySelector('.currentQuestionIndex')?.textContent?.replace(/\D+/g, '') || 0);
  const total = Number(paging?.querySelector('.activeElementCount')?.textContent?.replace(/\D+/g, '') || 0);
  return { current, total };
}

/**
 * Quest renders the question bar as `<span class="currentQuestionIndex">7</span>.`
 * The period is only a separator for the old inline title. The index is its own
 * pill now, so the leftover period would float on its own.
 */
function dropSeparatorPeriod(bar: HTMLElement | null) {
  const index = bar?.querySelector('.currentQuestionIndex');
  const next = index?.nextSibling;
  if (next && next.nodeType === 3 && (next.textContent || '').trim() === '.') next.remove();
}

export function createPracticeSlideEnhancement(root: HTMLElement) {
  const doc = root.ownerDocument;
  let progress: HTMLElement | null = null;
  let owned = false;

  // Quest swaps the slide body in place, so advancing leaves the reader staring
  // at the middle of the old question. This shell exists only on practice and
  // informational slides; the PDF workspace keeps its own reading position.
  function scrollToTopOnPagerClick(event: Event) {
    if (!(event.target as Element | null)?.closest?.('#upper-paging-div button')) return;
    try { doc.defaultView?.scrollTo({ top: 0, left: 0, behavior: 'auto' }); }
    catch { /* No viewport to scroll: navigation handles it. */ }
  }
  root.addEventListener('click', scrollToTopOnPagerClick, true);

  function syncEmptyPoints() {
    for (const points of root.querySelectorAll<HTMLElement>('#question-bar-div .itemPoints')) {
      if ((points.textContent || '').trim()) points.removeAttribute('data-betterquest-empty');
      else points.dataset.betterquestEmpty = 'true';
    }
  }

  function render() {
    if (findPracticeSlides(doc) !== root) {
      clear();
      return;
    }
    root.dataset.betterquestPractice = 'true';
    dropSeparatorPeriod(root.querySelector('#question-bar-div .questionBar'));
    syncEmptyPoints();
    const bar = root.querySelector('#upper-paging-div .h5');
    if (bar && !progress?.isConnected) {
      progress = doc.createElement('span');
      progress.dataset.betterquest = 'practice-progress';
      progress.style.cssText =
        'flex:1 1 120px;min-width:90px;height:6px;border-radius:999px;overflow:hidden;' +
        'background:var(--bq-border,#dbe3ee);';
      const fill = doc.createElement('span');
      fill.style.cssText = 'display:block;height:100%;border-radius:999px;background:#2563eb;transition:width .25s ease;';
      progress.append(fill);
      bar.append(progress);
      owned = true;
    }
    if (progress?.isConnected) {
      const fill = progress.firstElementChild as HTMLElement | null;
      const { current, total } = readProgress(root);
      if (fill) fill.style.width = `${total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0}%`;
    }
  }

  function clear() {
    root.removeAttribute('data-betterquest-practice');
    for (const points of root.querySelectorAll<HTMLElement>('#question-bar-div .itemPoints[data-betterquest-empty]')) {
      points.removeAttribute('data-betterquest-empty');
    }
    if (owned) progress?.remove();
    progress = null;
    owned = false;
  }

  const style = doc.createElement('style');
  style.dataset.betterquestPractice = 'true';
  style.textContent = PRACTICE_STYLES;
  doc.head.append(style);
  render();

  return {
    reconcile: render,
    dispose() {
      clear();
      root.removeEventListener('click', scrollToTopOnPagerClick, true);
      style.remove();
    },
  };
}