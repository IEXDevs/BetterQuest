import { findNavigation } from '../../content/navigation';

/** Anchor the user-opened Saved Questions popup to the verified navbar. */
export function findSavedQuestionsNavbar(document: Document): HTMLElement | null {
  const navbar = findNavigation(document)?.navbar;
  if (!navbar?.isConnected || !navbar.parentElement || navbar.parentElement.matches('ul,ol,table,tbody,thead,tr')) return null;
  return navbar;
}
