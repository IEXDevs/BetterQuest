import { findNavigation } from './navigation';
import { createNavigationButton } from './ui';
import { isStudentPage } from '../shared/messages';
import { startPageFeatures } from './features';
import type { Subscribe } from '../features/assignments/section';
import { execute, subscribeLocal, type Execute } from '../shared/client';
import { BookmarkService } from '../features/bookmarks/service';
import { createSavedQuestionsView } from '../features/bookmarks/saved-view';
import { findSavedQuestionsNavbar } from '../adapters/quest/saved-questions-placement';

export interface Integration { reconcile: () => void; dispose: () => void }

/** One controller owns all injected nodes and listeners for this document. */
export function startIntegration(document: Document, window: Window, options: { run?: Execute; subscribe?: Subscribe } = {}): Integration {
  let disposed = false;
  let scheduled: number | null = null;
  let navigation: ReturnType<typeof createNavigationButton> | null = null;
  let savedView: ReturnType<typeof createSavedQuestionsView> | undefined;
  let lastUrl = window.location.href;
  const features = startPageFeatures(document, window, options.run || execute, options.subscribe || subscribeLocal);

  // Remove orphaned hosts from a previous injection, without touching Quest nodes.
  document.querySelectorAll('[data-betterquest="navigation"], [data-betterquest="panel"], [data-betterquest="saved-questions"]').forEach(node => node.remove());
  function unmount() {
    savedView?.close(false);
    navigation?.host.remove();
    navigation = null;
  }

  function reconcile() {
    if (disposed) return;
    features.reconcile();
    const nextUrl = window.location.href;
    if (nextUrl !== lastUrl) { savedView?.close(false); lastUrl = nextUrl; }
    if (!isStudentPage(nextUrl)) { unmount(); return; }
    const target = findNavigation(document);
    if (!target) { unmount(); return; }

    if (!navigation) {
      navigation = createNavigationButton(document, false, () => {
        const navbar = findSavedQuestionsNavbar(document);
        if (!navbar) return;
        if (!savedView) savedView = createSavedQuestionsView(
          document, new BookmarkService(options.run || execute), options.subscribe || subscribeLocal,
          restoreFocus => {
            navigation?.button.setAttribute('aria-expanded', 'false');
            if (restoreFocus && navigation?.host.isConnected) navigation.button.focus();
          }, () => features.focusAssignments(),
        );
        if (savedView.isOpen()) savedView.close();
        else { savedView.open(navbar, features.hasAssignmentSection()); navigation?.button.setAttribute('aria-expanded', 'true'); }
      });
      navigation.button.removeAttribute('aria-haspopup');
      navigation.button.setAttribute('aria-expanded', 'false');
      navigation.button.setAttribute('aria-label', 'Show Saved Questions');
    }
    if (navigation.host.parentElement !== target.navbar || navigation.host.nextSibling !== target.before) {
      target.navbar.insertBefore(navigation.host, target.before);
    }
    const navbar = findSavedQuestionsNavbar(document);
    navigation.button.disabled = !navbar;
    navigation.button.title = 'Saved Questions · stored on this device';
    if (navbar && savedView?.isOpen()) savedView.position(navbar);
  }

  function schedule() {
    if (scheduled !== null || disposed) return;
    scheduled = window.setTimeout(() => { scheduled = null; reconcile(); }, 80);
  }

  const observer = new document.defaultView!.MutationObserver(records => {
    const relevant = records.some(record => {
      const node = record.target.nodeType === 1 ? record.target as Element : record.target.parentElement;
      if (node?.closest('[data-betterquest]')) return false;
      const changed = [...record.addedNodes, ...record.removedNodes];
      return record.type !== 'childList' || changed.length === 0 ||
        changed.some(node => node.nodeType !== 1 || !(node as Element).matches('[data-betterquest]'));
    });
    if (relevant) schedule();
  });
  observer.observe(document.documentElement, {
    childList: true, subtree: true, characterData: true, attributes: true,
    attributeFilter: ['class', 'hidden', 'aria-hidden', 'aria-label', 'href', 'style'],
  });

  window.addEventListener('popstate', schedule);
  window.addEventListener('hashchange', schedule);
  window.addEventListener('pageshow', schedule);
  const browserNavigation = (window as Window & { navigation?: EventTarget }).navigation;
  browserNavigation?.addEventListener('navigatesuccess', schedule);
  reconcile();

  return {
    reconcile,
    dispose() {
      disposed = true;
      observer.disconnect();
      features.dispose();
      savedView?.dispose();
      if (scheduled !== null) window.clearTimeout(scheduled);
      window.removeEventListener('popstate', schedule);
      window.removeEventListener('hashchange', schedule);
      window.removeEventListener('pageshow', schedule);
      browserNavigation?.removeEventListener('navigatesuccess', schedule);
      unmount();
    },
  };
}
