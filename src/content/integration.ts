import { applyNavigationFacelift, findNavigation, questNavigationLinks } from './navigation';
import { createNavigationButton } from './ui';
import { isStudentPage } from '../shared/messages';
import { startPageFeatures } from './features';
import type { Subscribe } from '../features/assignments/section';
import { execute, subscribeLocal, type Execute } from '../shared/client';
import { BookmarkService } from '../features/bookmarks/service';
import { createSavedQuestionsView } from '../features/bookmarks/saved-view';
import { findSavedQuestionsNavbar } from '../adapters/quest/saved-questions-placement';
import { createSettingsMenu } from '../features/settings/menu';
import { flushPendingStreakCredit } from '../features/streak/pending-credit';

export interface Integration { reconcile: () => void; dispose: () => void }

/** One controller owns all injected nodes and listeners for this document. */
export function startIntegration(document: Document, window: Window, options: { run?: Execute; subscribe?: Subscribe } = {}): Integration {
  let disposed = false;
  let scheduled: number | null = null;
  let navigation: ReturnType<typeof createNavigationButton> | null = null;
  let savedView: ReturnType<typeof createSavedQuestionsView> | undefined;
  let settings: ReturnType<typeof createSettingsMenu> | undefined;
  let navShell: { navbar: HTMLElement; dispose: () => void } | undefined;
  let lastUrl = window.location.href;
  const bookmarkService = new BookmarkService(options.run || execute);
  let savedDismissed = false;
  let lastBookmarkCount = 0;
  let checkInFlight = false;
  const features = startPageFeatures(document, window, options.run || execute, options.subscribe || subscribeLocal);
  void flushPendingStreakCredit(document, options.run || execute);

  // Remove orphaned hosts from a previous injection, without touching Quest nodes.
  document.querySelectorAll('[data-betterquest="navigation"], [data-betterquest="panel"], [data-betterquest="saved-questions"]').forEach(node => node.remove());
  function unmount() {
    settings?.dispose(); settings = undefined;
    savedView?.close(false);
    navigation?.host.remove();
    navigation = null;
    navShell?.dispose(); navShell = undefined;
  }

  const openSaved = (userInitiated = true) => {
    const navbar = findSavedQuestionsNavbar(document);
    if (!navbar) return;
    if (userInitiated) savedDismissed = false;
    if (!savedView) {
      savedView = createSavedQuestionsView(
        document, bookmarkService, options.subscribe || subscribeLocal,
        restoreFocus => {
          savedDismissed = true;
          if (restoreFocus && navigation?.host.isConnected) navigation.button.focus();
        },
        () => features.focusAssignments(),
      );
    }
    savedView.open(navbar, features.hasAssignmentSection(), { focus: userInitiated, scroll: userInitiated });
  };

  const maybeAutoOpenSaved = () => {
    if (disposed || (savedView && savedView.isOpen())) return;
    if (/^#question-\d+/i.test(window.location.hash)) return;
    const navbar = findSavedQuestionsNavbar(document);
    if (!navbar) return;
    if (checkInFlight) return;
    checkInFlight = true;
    void bookmarkService.list().then(bookmarks => {
      checkInFlight = false;
      if (disposed || (savedView && savedView.isOpen())) return;
      const previousCount = lastBookmarkCount;
      lastBookmarkCount = bookmarks.length;
      if (bookmarks.length > previousCount && savedDismissed) {
        savedDismissed = false;
      }
      if (bookmarks.length > 0 && !savedDismissed) {
        openSaved(false);
      }
    }).catch(() => {
      checkInFlight = false;
    });
  };

  function reconcile() {
    if (disposed) return;
    features.reconcile();
    const nextUrl = window.location.href;
    if (nextUrl !== lastUrl) {
      settings?.close(false);
      savedView?.close(false);
      const isAnchorOnly = nextUrl.split('#')[0] === lastUrl.split('#')[0];
      lastUrl = nextUrl;
      if (!isAnchorOnly) {
        savedDismissed = false;
      }
    }
    if (!isStudentPage(nextUrl)) { unmount(); return; }
    const target = findNavigation(document);
    if (!target) { unmount(); return; }
    if (navShell?.navbar !== target.navbar) {
      navShell?.dispose();
      navShell = { navbar: target.navbar, ...applyNavigationFacelift(document, target.navbar) };
    }

    if (!navigation) {
      navigation = createNavigationButton(document, true, view => { settings?.toggle(view); });
      settings = createSettingsMenu(navigation.host, navigation.button, options.run || execute, options.subscribe || subscribeLocal,
        { saved: () => openSaved(true), upcoming: () => features.focusAssignments(), hasUpcoming: () => features.hasAssignmentSection(), darkAvailable: features.darkAvailable,
          questLinks: () => questNavigationLinks(document) }, navigation.questButton);
    }
    const items = target.before;
    const nameItem = [...items.children].find(item => !item.hasAttribute('data-betterquest') && item.querySelector(':scope > span.qh-nav-link'));
    if (navigation.host.parentElement !== items) {
      if (nameItem) nameItem.after(navigation.host); else items.prepend(navigation.host);
    }
    const navbar = findSavedQuestionsNavbar(document);
    navigation.button.disabled = !navbar;
    navigation.button.title = 'BetterQuest settings';
    if (navigation.questButton) {
      navigation.questButton.disabled = !navbar;
      navigation.questButton.title = 'Quest settings';
    }
    if (navbar && savedView?.isOpen()) savedView.position(navbar);
    if (navbar && !savedDismissed && (!savedView || !savedView.isOpen())) {
      maybeAutoOpenSaved();
    }
  }

  function schedule() {
    if (scheduled !== null || disposed) return;
    scheduled = window.setTimeout(() => { scheduled = null; reconcile(); }, 80);
  }

  const observer = new document.defaultView!.MutationObserver(records => {
    const relevant = records.some(record => {
      if (record.type === 'childList' && [...record.removedNodes].some(removed => removed.nodeType === 1 &&
        ((removed as Element).matches('[data-betterquest="navigation"]') || Boolean((removed as Element).querySelector('[data-betterquest="navigation"]'))))) return true;
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
  const unsubscribeState = (options.subscribe || subscribeLocal)(() => {
    maybeAutoOpenSaved();
  });
  reconcile();

  return {
    reconcile,
    dispose() {
      disposed = true;
      unsubscribeState();
      observer.disconnect();
      features.dispose();
      settings?.dispose(); settings = undefined;
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
