export const NAV_MARKER = 'navigation';

export function createNavigationButton(
  document: Document,
  _list: boolean,
  onOpen: (view?: 'betterquest' | 'quest') => void,
  onOpenQuest?: () => void
) {
  const host = document.createElement('li');
  host.className = 'qh-nav-item qh-dropdown';
  host.dataset.betterquest = NAV_MARKER;
  host.style.position = 'relative';

  const toolbar = document.createElement('div');
  toolbar.className = 'bq-nav-toolbar';
  toolbar.style.cssText = 'display:inline-flex;align-items:center;gap:8px;';

  // 1. BetterQuest button
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'qh-nav-link qh-dropdown-toggle bq-toolbar-btn bq-toolbar-betterquest';
  button.style.cssText = 'border:0;background:transparent;font:inherit;cursor:pointer;';
  button.setAttribute('aria-label', 'Open BetterQuest');
  button.innerHTML = '<span class="bq-nav-mark" aria-hidden="true">BQ</span><span class="qh-nav-label bq-nav-name">BetterQuest</span><svg class="bq-nav-chevron" viewBox="0 0 20 20" aria-hidden="true"><path d="m5 7.5 5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  button.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    onOpen('betterquest');
  });

  // 2. Quest Settings button
  const questButton = document.createElement('button');
  questButton.type = 'button';
  questButton.className = 'qh-nav-link qh-dropdown-toggle bq-toolbar-btn bq-toolbar-quest';
  questButton.style.cssText = 'border:0;background:transparent;font:inherit;cursor:pointer;';
  questButton.setAttribute('aria-label', 'Open Quest Settings');
  questButton.innerHTML = '<span class="bq-quest-mark" aria-hidden="true"><svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor"><path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/></svg></span><span class="qh-nav-label bq-nav-name">Quest Settings</span><svg class="bq-nav-chevron" viewBox="0 0 20 20" aria-hidden="true"><path d="m5 7.5 5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  questButton.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    if (onOpenQuest) onOpenQuest();
    else onOpen('quest');
  });

  toolbar.append(button, questButton);
  host.append(toolbar);
  return { host, button, questButton, toolbar };
}
