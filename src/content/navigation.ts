/** Authenticated Quest navbar structure supplied by the user. */
export const NAVIGATION_SELECTOR = '.qh-navbar';

export function findNavigation(document: Document): { navbar: HTMLElement; before: HTMLElement } | null {
  const navbar = document.querySelector<HTMLElement>(NAVIGATION_SELECTOR);
  const breadcrumbs = navbar?.querySelector<HTMLElement>(':scope > .qh-breadcrumbs');
  const before = navbar?.querySelector<HTMLElement>(':scope > .qh-nav');
  if (!navbar || !breadcrumbs || !before) return null;
  const children = [...navbar.children];
  if (children.indexOf(breadcrumbs) >= children.indexOf(before)) return null;
  return { navbar, before };
}
