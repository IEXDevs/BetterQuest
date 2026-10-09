import { findNavigation } from './navigation';
import { createNavigationButton } from './ui';
import { isStudentPage } from '../shared/messages';
import { startPageFeatures } from './features';
import type { Subscribe } from '../features/assignments/section';
import { execute, subscribeLocal, type Execute } from '../shared/client';

export interface Integration { reconcile: () => void; dispose: () => void }

/** One controller owns all injected nodes and listeners for this document. */
export function startIntegration(document: Document, window: Window, options: { run?: Execute; subscribe?: Subscribe } = {}): Integration {
  let disposed = false;
  let scheduled: number | null = null;
  let navigation: ReturnType<typeof createNavigationButton> | null = null;
  const features = startPageFeatures(document, window, options.run || execute, options.subscribe || subscribeLocal);

  // Remove orphaned hosts from a previous injection, without touching Quest nodes.
  document.querySelectorAll('[data-betterquest="navigation"], [data-betterquest="panel"]').forEach(node => node.remove());
  function unmount() {
    navigation?.host.remove();
    navigation = null;
  }

  function reconcile() {
    if (disposed) return;
    features.reconcile();
    const nextUrl = window.location.href;
    if (!isStudentPage(nextUrl)) { unmount(); return; }
    const target = findNavigation(document);
    if (!target) { unmount(); return; }

    if (!navigation) {
      navigation = createNavigationButton(document, false, () => {
        features.focusAssignments();
      });
      navigation.button.removeAttribute('aria-haspopup');
      navigation.button.removeAttribute('aria-expanded');
      navigation.button.setAttribute('aria-label', 'Go to Upcoming Assignments');
    }
    if (navigation.host.parentElement !== target.navbar || navigation.host.nextSibling !== target.before) {
      target.navbar.insertBefore(navigation.host, target.before);
    }
    const available = features.hasAssignmentSection();
    navigation.button.disabled = !available;
    navigation.button.title = available ? 'Jump to the inline assignment section' : 'Visit a Quest course page to view assignments.';
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
      if (scheduled !== null) window.clearTimeout(scheduled);
      window.removeEventListener('popstate', schedule);
      window.removeEventListener('hashchange', schedule);
      window.removeEventListener('pageshow', schedule);
      browserNavigation?.removeEventListener('navigatesuccess', schedule);
      unmount();
    },
  };
}
