export const NAV_MARKER = 'navigation';
export const PANEL_MARKER = 'panel';

const buttonStyles = `
  :host { all: initial !important; display: inline-flex !important;
    vertical-align: middle !important; align-self: center !important;
    margin: 0 16px !important; padding: 0 !important; border: 0 !important;
    flex: 0 0 auto !important; list-style: none !important; }
  :host::before, :host::after { content: none !important; display: none !important; }
  button { all: unset; box-sizing: border-box; font: 600 13px/1.2 system-ui, sans-serif;
    letter-spacing: .1px; cursor: pointer; display: inline-flex; align-items: center;
    gap: 8px; padding: 9px 14px; min-height: 34px; border-radius: 8px;
    background: #2563eb; color: #fff; border: 1px solid #75a1ff;
    box-shadow: 0 2px 5px #071f4826; transition: background .15s; white-space: nowrap; }
  button:hover { background: #1d4ed8; }
  button:active { background: #1e40af; }
  button:focus-visible { outline: 2px solid #fff; outline-offset: 3px; }
  svg { width: 14px; height: 14px; flex: none; }
  @media (prefers-reduced-motion: reduce) { button { transition: none; } }
`;

export function createNavigationButton(document: Document, list: boolean, onOpen: () => void) {
  const host = document.createElement(list ? 'li' : 'span');
  host.dataset.betterquest = NAV_MARKER;
  // Lists need a valid LI wrapper; LI itself cannot host a shadow root.
  const shadowHost = list ? document.createElement('span') : host;
  if (list) {
    host.style.cssText = 'display: inline-flex; align-items: center; list-style: none;';
    host.append(shadowHost);
  }
  const root = shadowHost.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = buttonStyles;
  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute('aria-label', 'Open BetterQuest');
  button.setAttribute('aria-haspopup', 'dialog');
  button.setAttribute('aria-expanded', 'false');
  button.innerHTML = '<span>BetterQuest</span><svg aria-hidden="true" viewBox="0 0 16 16" fill="none"><path d="M4 12 12 4M4 4h8v8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  button.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    onOpen();
  });
  root.append(style, button);
  return { host, button };
}

export interface Panel {
  host: HTMLElement;
  open: () => void;
  close: (restoreFocus?: boolean) => void;
  isOpen: () => boolean;
  dispose: () => void;
}

export function createPanel(document: Document, onClose: (restoreFocus: boolean) => void): Panel {
  const host = document.createElement('div');
  host.dataset.betterquest = PANEL_MARKER;
  host.hidden = true;
  const root = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = `
    :host { all: initial !important; display: block !important; position: fixed !important;
      inset: 84px 24px auto auto !important; width: min(360px, calc(100vw - 32px)) !important;
      z-index: 2147483646 !important; }
    :host([hidden]) { display: none !important; }
    * { box-sizing: border-box; }
    section { background: #fff; color: #18253a; border: 1px solid #d7e2f0;
      border-radius: 14px; box-shadow: 0 16px 48px #0f27482b;
      font: 14px/1.5 system-ui, sans-serif; overflow: hidden; }
    header { display: flex; align-items: center; justify-content: space-between;
      gap: 16px; padding: 16px 18px; border-bottom: 1px solid #edf1f7; }
    h2 { margin: 0; font-size: 15px; font-weight: 650; letter-spacing: -.2px; }
    button { all: unset; box-sizing: border-box; cursor: pointer; display: grid;
      place-items: center; width: 30px; height: 30px; border-radius: 7px; color: #607089; }
    button:hover { background: #eff5ff; color: #2563eb; }
    button:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }
    svg { width: 16px; height: 16px; }
    .body { min-height: 200px; }
    @media (max-width: 480px) { :host { inset: 80px 16px auto auto !important; } }
  `;
  const dialog = document.createElement('section');
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-labelledby', 'betterquest-panel-title');
  // Non-modal: Quest stays usable. No backdrop, inert, scroll lock, or focus trap.
  dialog.setAttribute('aria-modal', 'false');
  dialog.innerHTML = '<header><h2 id="betterquest-panel-title">BetterQuest</h2><button type="button" aria-label="Close BetterQuest"><svg aria-hidden="true" viewBox="0 0 16 16" fill="none"><path d="m4 4 8 8m0-8-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button></header><div class="body"></div>';
  const closeButton = dialog.querySelector<HTMLButtonElement>('button')!;
  const close = (restoreFocus = true) => { host.hidden = true; onClose(restoreFocus); };
  closeButton.addEventListener('click', () => close());
  root.addEventListener('keydown', event => {
    if ((event as KeyboardEvent).key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  });
  root.append(style, dialog);
  return {
    host,
    open: () => { host.hidden = false; closeButton.focus(); },
    close,
    isOpen: () => !host.hidden,
    dispose: () => host.remove(),
  };
}
