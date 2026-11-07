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
  button.className = 'qh-nav-link bq-toolbar-btn bq-toolbar-betterquest';
  button.style.cssText = 'border:0;background:transparent;font:inherit;cursor:pointer;';
  button.setAttribute('aria-label', 'Open BetterQuest');
  button.innerHTML = '<span class="qh-nav-label bq-nav-name">BetterQuest</span><svg class="bq-nav-chevron" viewBox="0 0 20 20" aria-hidden="true"><path d="m5 7.5 5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  button.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    onOpen('betterquest');
  });

  // 2. Quest Settings button
  const questButton = document.createElement('button');
  questButton.type = 'button';
  questButton.className = 'qh-nav-link bq-toolbar-btn bq-toolbar-quest';
  questButton.style.cssText = 'border:0;background:transparent;font:inherit;cursor:pointer;';
  questButton.setAttribute('aria-label', 'Open Quest Settings');
  questButton.innerHTML = '<span class="qh-nav-label bq-nav-name">Quest Settings</span><svg class="bq-nav-chevron" viewBox="0 0 20 20" aria-hidden="true"><path d="m5 7.5 5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  questButton.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    if (onOpenQuest) onOpenQuest();
    else onOpen('quest');
  });

  toolbar.append(button, questButton);
  const savedButton = document.createElement('button');
  savedButton.type = 'button';
  savedButton.className = 'qh-nav-link bq-toolbar-btn bq-toolbar-saved';
  savedButton.setAttribute('aria-label', 'Saved Questions');
  savedButton.setAttribute('aria-haspopup', 'dialog');
  savedButton.setAttribute('aria-expanded', 'false');
  savedButton.title = 'Saved Questions';
  savedButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z"/></svg>';
  toolbar.prepend(savedButton);
  host.append(toolbar);
  return { host, button, questButton, savedButton, toolbar };
}
