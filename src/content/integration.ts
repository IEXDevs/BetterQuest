import { findNavigation } from './navigation';
import { createNavigationButton, createPanel } from './ui';
import { isStudentPage } from '../shared/messages';

export interface Integration { reconcile: () => void; dispose: () => void }

/** One controller owns all injected nodes and listeners for this document. */
export function startIntegration(document: Document, window: Window): Integration {
  let disposed = false;
  let scheduled: number | null = null;
  let lastUrl = window.location.href;
  let navigation: ReturnType<typeof createNavigationButton> | null = null;

  // Remove orphaned hosts from a previous injection, without touching Quest nodes.
  document.querySelectorAll('[data-betterquest="navigation"], [data-betterquest="panel"]').forEach(node => node.remove());
  const panel = createPanel(document, restoreFocus => {
    navigation?.button.setAttribute('aria-expanded', 'false');
    if (restoreFocus && navigation?.host.isConnected) navigation.button.focus();
  });

  function unmount() {
    panel.close(false);
    panel.host.remove();
    navigation?.host.remove();
    navigation = null;
  }

  function reconcile() {
    if (disposed) return;
    const nextUrl = window.location.href;
    if (nextUrl !== lastUrl) { panel.close(false); lastUrl = nextUrl; }
    if (!isStudentPage(nextUrl)) { unmount(); return; }
    const target = findNavigation(document);
    if (!target) { unmount(); return; }

    if (!navigation) {
      navigation = createNavigationButton(document, false, () => {
        if (!panel.host.isConnected) document.body.append(panel.host);
        navigation?.button.setAttribute('aria-expanded', 'true');
        panel.open();
      });
      navigation.button.setAttribute('aria-expanded', String(panel.isOpen()));
    }
    if (navigation.host.parentElement !== target.navbar || navigation.host.nextSibling !== target.before) {
      target.navbar.insertBefore(navigation.host, target.before);
    }
    // A removed/replaced body can detach the panel as well as the navigation bar.
    if (panel.isOpen() && !panel.host.isConnected) document.body.append(panel.host);
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
      if (scheduled !== null) window.clearTimeout(scheduled);
      window.removeEventListener('popstate', schedule);
      window.removeEventListener('hashchange', schedule);
      window.removeEventListener('pageshow', schedule);
      browserNavigation?.removeEventListener('navigatesuccess', schedule);
      unmount();
      panel.dispose();
    },
  };
}
