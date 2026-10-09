import { ASSIGNMENT_SELECTORS } from './assignments';

function emptyColumn(column: HTMLElement): boolean {
  return [...column.childNodes].every(node =>
    node.nodeType === 8 ||
    (node.nodeType === 3 && !(node.textContent || '').trim()) ||
    (node.nodeType === 1 && (node as Element).matches('[data-betterquest="assignment-section"]')));
}

/** Verified course-info row: use the first empty existing column after Meets. */
export function findAssignmentSectionSlot(document: Document): { root: HTMLElement; column: HTMLElement } | null {
  const root = document.querySelector<HTMLElement>(ASSIGNMENT_SELECTORS.root);
  const row = root?.querySelector<HTMLElement>('#student-course-info-header > .row.text-center');
  const title = root?.querySelector(ASSIGNMENT_SELECTORS.title)?.textContent || '';
  if (!root || !row || !/\(\d+\)\s*$/.test(title.trim())) return null;
  const columns = [...row.querySelectorAll<HTMLElement>(':scope > .col')];
  const meets = columns.findIndex(column => column.querySelector(':scope > .qlabel')?.textContent?.trim() === 'Meets');
  if (meets < 0) return null;
  const column = columns.slice(meets + 1).find(emptyColumn);
  return column ? { root, column } : null;
}

// Homepage placement is intentionally absent: its DOM has not been supplied.
