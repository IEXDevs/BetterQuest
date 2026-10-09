import { findNavigation } from '../../content/navigation';

/** Saved Questions is user-opened in normal page flow after the verified navbar. */
export function findSavedQuestionsNavbar(document: Document): HTMLElement | null {
  const navbar = findNavigation(document)?.navbar;
  if (!navbar?.isConnected || !navbar.parentElement || navbar.parentElement.matches('ul,ol,table,tbody,thead,tr')) return null;
  return navbar;
}
