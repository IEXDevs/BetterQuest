export const NAV_MARKER = 'navigation';

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
  button:disabled { opacity:.6; cursor:default; box-shadow:none; }
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
  button.innerHTML = '<span>BetterQuest</span><svg aria-hidden="true" viewBox="0 0 16 16" fill="none"><path d="M4 12 12 4M4 4h8v8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  button.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    onOpen();
  });
  root.append(style, button);
  return { host, button };
}
