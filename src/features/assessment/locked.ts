import { findLockedAssessment } from '../../adapters/quest/assessment';

/**
 * Quest ships past-due and locked assessments as a full response-table shell
 * with no rows: an empty DataTables skeleton whose pagination and "show N
 * entries" controls still work, sitting beside a PDF frame that never loaded.
 *
 * The PDF workspace deliberately stays off these pages, so this module owns the
 * presentation. It only ever *adds* to the page — the native status line, the
 * score tally, and Quest's own messages all stay readable.
 */

const LOCK_ICON =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<rect width="18" height="11" x="3" y="11" rx="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>';

const LOCKED_STYLES = `
  /* Quest splits the page 8/4 for a PDF that was never served here. Give the
     score summary the full width instead of leaving a dead column. */
  #main-content #target[data-betterquest-locked="true"] .col-md-4 {
    flex: 0 0 100% !important;
    max-width: 100% !important;
  }
  #main-content #target[data-betterquest-locked="true"] .col-md-8:not(:has(iframe,embed,object,canvas,video)) {
    display: none !important;
  }

  /* The empty table shell is all chrome: a header, a length picker, working
     pagination, and a single "No data available" row. None of it is useful. */
  #main-content #target[data-betterquest-locked="true"] :is(
    .dataTables_length, .dataTables_paginate, .dataTables_processing,
    .dataTables_scrollHead, .dataTables_scrollBody, .dataTables_info
  ) { display: none !important; }

  /* Status card around Quest's own "Due Date has Passed." line — plain border, no accent strip. */
  #main-content #target[data-betterquest-locked="true"] .view-responses {
    background: var(--bq-surface, #fff) !important;
    border: 1px solid var(--bq-border, #dbe3ee) !important;
    border-radius: 8px !important;
    padding: 18px 22px 20px !important;
    margin: 0 0 16px !important;
    width: 100% !important;
    max-width: none !important;
    box-sizing: border-box !important;
  }
  #main-content #target[data-betterquest-locked="true"] .view-responses > .h5 {
    color: var(--bq-muted, #64748b) !important;
    font-size: 13px !important;
    font-weight: 650 !important;
    margin: 10px 0 0 !important;
  }
  #main-content #target[data-betterquest-locked="true"] .view-responses + hr { display: none !important; }

  #main-content [data-betterquest="locked-notice"] {
    display: flex !important;
    align-items: flex-start !important;
    gap: 12px !important;
    margin: 0 !important;
    padding: 0 !important;
    color: var(--bq-muted, #475569) !important;
    font-size: 14px !important;
    line-height: 1.55 !important;
  }
  #main-content [data-betterquest="locked-notice"] .bq-locked-icon {
    display: grid !important;
    place-items: center !important;
    flex: 0 0 auto !important;
    width: 28px !important;
    height: 28px !important;
    border-radius: 6px !important;
    border: 1px solid var(--bq-border, #dbe3ee) !important;
    background: var(--bq-raised, #f1f5f9) !important;
    color: var(--bq-muted, #64748b) !important;
  }
  #main-content [data-betterquest="locked-notice"] .bq-locked-title {
    color: var(--bq-text, #0f172a) !important;
    font-size: 17px !important;
    font-weight: 700 !important;
    line-height: 1.3 !important;
  }
  #main-content [data-betterquest="locked-notice"] p { margin: 2px 0 0 !important; }

  /* Score + class average use the full column width as stacked rows. */
  #main-content #target[data-betterquest-locked="true"] #tally-div {
    background: var(--bq-surface, #fff) !important;
    border: 1px solid var(--bq-border, #dbe3ee) !important;
    border-radius: 8px !important;
    padding: 20px 24px !important;
    width: 100% !important;
    max-width: none !important;
    box-sizing: border-box !important;
  }
  #main-content #target[data-betterquest-locked="true"] #tally-div .text-center {
    display: flex !important;
    flex-direction: column !important;
    align-items: stretch !important;
    gap: 0 !important;
    width: 100% !important;
    text-align: left !important;
  }
  #main-content #target[data-betterquest-locked="true"] #tally-div .h4 {
    margin: 0 0 14px !important;
    padding: 0 0 14px !important;
    border-bottom: 1px solid var(--bq-border, #dbe3ee) !important;
    font-size: 24px !important;
    font-weight: 750 !important;
    color: var(--bq-text, #0f172a) !important;
  }
  #main-content #target[data-betterquest-locked="true"] #tally-div .text-center > div:not(.h4) {
    display: flex !important;
    align-items: baseline !important;
    justify-content: space-between !important;
    gap: 32px !important;
    width: 100% !important;
    margin: 0 !important;
    padding: 12px 0 !important;
    border-bottom: 1px solid var(--bq-border, #edf1f4) !important;
  }
  #main-content #target[data-betterquest-locked="true"] #tally-div .text-center > div:not(.h4):last-child {
    border-bottom: 0 !important;
    padding-bottom: 0 !important;
  }
  #main-content #target[data-betterquest-locked="true"] #tally-div .qlabel {
    display: block !important;
    flex: 0 1 auto !important;
    color: var(--bq-muted, #64748b) !important;
    font-size: 13px !important;
    font-weight: 600 !important;
  }
  #main-content #target[data-betterquest-locked="true"] #tally-div .qtext {
    flex: 1 1 auto !important;
    text-align: right !important;
    color: var(--bq-text, #0f172a) !important;
    font-size: 15px !important;
    font-weight: 650 !important;
  }
`;

/** "9/27/26 12:00 AM" from Quest's own due-date field, if it is on the page. */
function readDueDate(root: HTMLElement): string {
  const value = root.querySelector<HTMLElement>('#due_date_field .qtext, #due_date_span .qtext')
    ?.textContent?.replace(/\s+/g, ' ').trim();
  return value || '';
}

export function createLockedAssessmentEnhancement(root: HTMLElement) {
  const doc = root.ownerDocument;
  let panel: HTMLElement | null = null;

  function removePanel() {
    panel?.remove();
    panel = null;
  }

  function render() {
    if (findLockedAssessment(doc) !== root) {
      // Quest re-opened submissions: the empty shell is no longer the truth.
      root.removeAttribute('data-betterquest-locked');
      removePanel();
      return;
    }
    root.dataset.betterquestLocked = 'true';
    if (panel?.isConnected) return;
    removePanel();
    panel = doc.createElement('div');
    panel.dataset.betterquest = 'locked-notice';
    const icon = doc.createElement('span');
    icon.className = 'bq-locked-icon';
    icon.innerHTML = LOCK_ICON;
    const copy = doc.createElement('div');
    const title = doc.createElement('div');
    title.className = 'bq-locked-title';
    title.textContent = 'Past due';
    const detail = doc.createElement('p');
    const due = readDueDate(root);
    detail.textContent = due
      ? `Closed ${due}. Submissions are turned off, so the questions below can no longer be answered.`
      : 'Submissions are turned off, so the questions below can no longer be answered.';
    copy.append(title, detail);
    panel.append(icon, copy);
    const responses = root.querySelector<HTMLElement>('#view-responses-table-id');
    if (responses) responses.prepend(panel);
    else root.querySelector('#tally-div')?.before(panel);
  }

  const style = doc.createElement('style');
  style.dataset.betterquestLocked = 'true';
  style.textContent = LOCKED_STYLES;
  doc.head.append(style);
  render();

  return {
    reconcile: render,
    dispose() {
      root.removeAttribute('data-betterquest-locked');
      removePanel();
      style.remove();
    },
  };
}