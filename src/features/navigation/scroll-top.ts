/** PDF homework keeps its own scroll position (question jumps, reader chrome). */
export function isPdfViewPage(document: Document): boolean {
  const target = document.querySelector('#target');
  if (!target) return false;
  if (target.getAttribute('data-betterquest-pdf-workspace')) return true;
  if (target.querySelector('[data-betterquest="interactive-pdf"]')) return true;
  if (target.querySelector('#pdf-frame iframe[src*="problem_pdf"], #pdf-frame iframe[src*="download_pdf"]')) return true;
  return false;
}

export function scrollPageToTop(_window: Window, document: Document) {
  if (isPdfViewPage(document)) return;
  // Prefer scrollTop so tests (jsdom) and real browsers both stay quiet/reliable.
  const scrolling = document.scrollingElement || document.documentElement;
  if (scrolling) scrolling.scrollTop = 0;
  if (document.body) document.body.scrollTop = 0;
}

/**
 * Keep grades / assignments / review / home at the top of the page. Quest's
 * `#tabs-*` anchors and injected chrome otherwise yank the viewport downward.
 */
export function createScrollTopGuard(document: Document, window: Window) {
  let disposed = false;
  let lastUrl = document.URL;

  const pin = () => {
    if (!disposed) scrollPageToTop(window, document);
  };

  const onTabClick = (event: Event) => {
    const target = (event.target as Element | null)?.closest?.(
      '#panel-tabs .nav-link, #panel-tabs [data-toggle="pill"], #panel-tabs [role="tab"]',
    );
    if (!target) return;
    // After Quest activates the pane (hash / focus), pull back to the top.
    window.setTimeout(pin, 0);
    window.setTimeout(pin, 50);
    window.setTimeout(pin, 200);
  };

  const onNavigate = () => {
    if (document.URL === lastUrl) return;
    lastUrl = document.URL;
    window.setTimeout(pin, 0);
    window.setTimeout(pin, 100);
  };

  document.addEventListener('click', onTabClick, true);
  window.addEventListener('hashchange', onNavigate);
  window.addEventListener('popstate', onNavigate);
  // First paint: course pages often land mid-pane because of tab ids.
  window.setTimeout(pin, 0);
  window.setTimeout(pin, 120);

  return {
    reconcile() {
      if (disposed) return;
      if (document.URL !== lastUrl) {
        lastUrl = document.URL;
        pin();
      }
    },
    dispose() {
      disposed = true;
      document.removeEventListener('click', onTabClick, true);
      window.removeEventListener('hashchange', onNavigate);
      window.removeEventListener('popstate', onNavigate);
    },
  };
}
