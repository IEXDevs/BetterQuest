import { ASSIGNMENT_SELECTORS } from './assignments';

/** Course-page placement verified in the supplied #target fragment. */
export function findAssignmentSectionSlot(document: Document): { root: HTMLElement; before: HTMLElement } | null {
  const root = document.querySelector<HTMLElement>(ASSIGNMENT_SELECTORS.root);
  const tabs = root?.querySelector<HTMLElement>('#panel-tabs');
  const data = root?.querySelector<HTMLElement>('#info-tab-data');
  const title = root?.querySelector(ASSIGNMENT_SELECTORS.title)?.textContent || '';
  if (!root || !tabs || !data || tabs.parentElement !== root || data.parentElement !== root || !/\(\d+\)\s*$/.test(title.trim())) return null;
  return { root, before: tabs };
}

// Homepage placement is intentionally absent: its DOM has not been supplied.
