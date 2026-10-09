export const NAV_MARKER = 'navigation';

export function createNavigationButton(document: Document, _list: boolean, onOpen: () => void) {
  const host = document.createElement('li');
  host.className = 'qh-nav-item qh-dropdown';
  host.dataset.betterquest = NAV_MARKER;
  host.style.position = 'relative';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'qh-nav-link qh-dropdown-toggle';
  // Native link classes supply sizing, color, spacing and hover behavior.
  button.style.cssText = 'border:0;background:transparent;font:inherit;cursor:pointer;';
  button.setAttribute('aria-label', 'Open BetterQuest');
  button.innerHTML = '<span class="qh-nav-label">BetterQuest</span>';
  button.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    onOpen();
  });
  host.append(button);
  return { host, button };
}
