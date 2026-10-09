import type { ThemePreference } from '../../shared/models';
import { createThemeScope } from './tokens';
import { resolveTheme } from './preferences';
import { themeAdapter, findThemePageRoot, QUEST_DARK_STYLES } from '../../adapters/quest/theme';

/** Paint only the verified shared Quest shell and known component families. */

export function createQuestTheme(document: Document, window: Window) {
  const style = document.createElement('style'); style.dataset.betterquest = 'theme-styles'; style.textContent = QUEST_DARK_STYLES;
  document.querySelectorAll('[data-betterquest="theme-styles"]').forEach(node => node.remove());
  let preference: ThemePreference = 'system';
  let disposed = false;
  const scopes = new Map<HTMLElement, { scope: ReturnType<typeof createThemeScope>; original: string | null }>();
  let page: { element: HTMLElement; original: string | null } | undefined;
  const media = window.matchMedia?.('(prefers-color-scheme: dark)');
  const dark = () => resolveTheme(preference, Boolean(media?.matches)) === 'dark';
  function restore(element: HTMLElement, original: string | null) { if (original === null) element.removeAttribute('data-betterquest-theme'); else element.setAttribute('data-betterquest-theme', original); }
  function mark(element: HTMLElement) { const next = dark() ? 'dark' : 'light'; if (element.getAttribute('data-betterquest-theme') !== next) element.setAttribute('data-betterquest-theme', next); }
  function reconcile() {
    if (disposed) return;
    const main = themeAdapter.locate(document);
    if (main && !style.isConnected) document.head.append(style);
    else if (!main && style.isConnected) style.remove();
    const roots = main ? themeAdapter.roots(main) : [];
    for (const [root, value] of scopes) if (!roots.includes(root)) { value.scope.dispose(); restore(root, value.original); scopes.delete(root); }
    for (const root of roots) {
      if (!scopes.has(root)) scopes.set(root, { scope: createThemeScope(root, window, preference), original: root.getAttribute('data-betterquest-theme') });
      mark(root);
    }
    const body = main ? findThemePageRoot(document) : null;
    if (page?.element !== body) { if (page) restore(page.element, page.original); page = body ? { element: body, original: body.getAttribute('data-betterquest-theme') } : undefined; }
    if (page) mark(page.element);
  }
  const changed = () => { for (const root of scopes.keys()) mark(root); if (page) mark(page.element); };
  media?.addEventListener('change', changed);
  return {
    available: () => Boolean(themeAdapter.locate(document)),
    reconcile,
    update(next: ThemePreference) {
      if (preference !== next) { preference = next; for (const value of scopes.values()) value.scope.update(next); }
      reconcile();
    },
    dispose() { disposed = true; media?.removeEventListener('change', changed); for (const [root, value] of scopes) { value.scope.dispose(); restore(root, value.original); } scopes.clear(); if (page) restore(page.element, page.original); style.remove(); },
  };
}
