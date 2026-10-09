import { featurePreferences, type FeatureName, type Preferences } from '../../shared/models';
import { execute, type Execute } from '../../shared/client';
import type { Subscribe } from '../assignments/section';
import { ThemePreferences, resolveTheme } from '../theme/preferences';

export function createSettingsMenu(host: HTMLElement, trigger: HTMLButtonElement, run: Execute = execute, subscribe?: Subscribe,
  actions: { saved: () => void; upcoming: () => boolean; hasUpcoming: () => boolean; darkAvailable: () => boolean } = { saved() {}, upcoming: () => false, hasUpcoming: () => false, darkAvailable: () => false }) {
  const document = host.ownerDocument;
  const menuHost = document.createElement('span'); menuHost.hidden = true;
  const shadow = menuHost.attachShadow({ mode: 'open' });
  shadow.addEventListener('click', event => event.stopPropagation());
  const style = document.createElement('style');
  style.textContent = `
    :host{display:block;position:absolute;top:100%;right:0;z-index:1200;width:290px;max-width:calc(100vw - 24px)}:host([hidden]){display:none}
    *{box-sizing:border-box}.menu [hidden]{display:none!important}.menu{background:var(--bq-surface,#fff);color:var(--bq-text,#26384a);border:1px solid var(--bq-border,#dbe3e9);border-radius:6px;box-shadow:0 8px 26px #07172630;padding:14px;font:13px/1.5 system-ui,sans-serif;text-align:left}
    h2{font:inherit;font-weight:600;margin:0 0 6px}label{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:10px 0;border-bottom:1px solid var(--bq-border,#edf1f4);cursor:pointer}
    small{display:block;color:var(--bq-muted,#748491);font-size:11px;margin-top:2px}input{accent-color:var(--bq-accent,#227ab0);width:16px;height:16px;flex:none;cursor:pointer}
    button{display:block;background:transparent;border:0;color:var(--bq-accent,#227ab0);font:inherit;padding:8px 0;cursor:pointer;text-align:left;width:100%}button:hover{text-decoration:underline}
    button:focus-visible,input:focus-visible{outline:2px solid var(--bq-accent,#227ab0);outline-offset:3px}.status{font-size:11px;color:var(--bq-muted,#748491);min-height:16px;margin-top:5px}.error{color:var(--bq-warning,#a3453c)}
  `;
  const menu = document.createElement('section'); menu.className = 'menu'; menu.setAttribute('role', 'dialog'); menu.setAttribute('aria-modal', 'false'); menu.setAttribute('aria-label', 'BetterQuest settings');
  const title = document.createElement('h2'); title.textContent = 'BetterQuest settings'; menu.append(title);
  const inputs = new Map<FeatureName, HTMLInputElement>();
  for (const [feature, name, description] of [
    ['assignments', 'Assignment tracker', 'Homepage overview and course summaries.'],
    ['bookmarks', 'Question bookmarks', 'Show save icons; saved questions remain available.'],
  ] as const) {
    const label = document.createElement('label'); const text = document.createElement('span'); text.textContent = name;
    const help = document.createElement('small'); help.textContent = description; text.append(help);
    const input = document.createElement('input'); input.type = 'checkbox'; input.setAttribute('role', 'switch'); input.setAttribute('aria-label', name); input.disabled = true;
    label.append(text, input); menu.append(label); inputs.set(feature, input);
    input.addEventListener('change', () => { void save(async () => { await run({ kind: 'feature:set', feature, enabled: input.checked }); }, input); });
  }
  const darkLabel = document.createElement('label'); const darkText = document.createElement('span'); darkText.textContent = 'Dark mode';
  const darkHelp = document.createElement('small'); darkHelp.textContent = 'Quest components only; original PDF colors are preserved.'; darkText.append(darkHelp);
  const darkInput = document.createElement('input'); darkInput.type = 'checkbox'; darkInput.setAttribute('role', 'switch'); darkInput.setAttribute('aria-label', 'Dark mode'); darkInput.disabled = true;
  darkLabel.append(darkText, darkInput); menu.append(darkLabel);
  const theme = new ThemePreferences(run);
  darkInput.addEventListener('change', () => { void save(async () => { await theme.set(darkInput.checked ? 'dark' : 'light'); }, darkInput); });
  const saved = document.createElement('button'); saved.className = 'saved-action'; saved.type = 'button'; saved.textContent = 'Saved Questions →'; saved.addEventListener('click', () => { close(false); actions.saved(); });
  const upcoming = document.createElement('button'); upcoming.className = 'upcoming-action'; upcoming.type = 'button'; upcoming.textContent = 'Upcoming assignments →'; upcoming.addEventListener('click', () => { close(false); actions.upcoming(); });
  const status = document.createElement('div'); status.className = 'status'; status.setAttribute('role', 'status');
  menu.append(saved, upcoming, status); shadow.append(style, menu); host.append(menuHost);
  trigger.setAttribute('aria-haspopup', 'dialog'); trigger.setAttribute('aria-expanded', 'false'); trigger.setAttribute('aria-label', 'BetterQuest settings');
  let disposed = false, generation = 0;
  let preference: Preferences | undefined;
  let stop: (() => void) | undefined;
  const media = document.defaultView!.matchMedia?.('(prefers-color-scheme: dark)');
  function paint() {
    if (!preference) return;
    const features = featurePreferences(preference);
    for (const [name, input] of inputs) { input.checked = features[name]; input.disabled = false; }
    darkLabel.hidden = !actions.darkAvailable(); darkInput.checked = resolveTheme(preference.theme, Boolean(media?.matches)) === 'dark'; darkInput.disabled = !actions.darkAvailable();
    upcoming.hidden = !actions.hasUpcoming();
  }
  async function refresh() {
    const current = ++generation;
    try {
      const state = await run({ kind: 'state:read' });
      if (disposed || menuHost.hidden || current !== generation) return;
      preference = state.preferences; paint(); status.className = 'status'; status.textContent = 'Preferences saved on this device.';
    } catch (error) { if (!disposed && !menuHost.hidden && current === generation) { status.className = 'status error'; status.textContent = error instanceof Error ? error.message : 'Settings unavailable.'; } }
  }
  async function save(operation: () => Promise<void>, input: HTMLInputElement) {
    input.disabled = true;
    try {
      await operation();
      // Apply this page's change even if its older worker port became idle.
      document.defaultView!.dispatchEvent(new document.defaultView!.Event('betterquest:preferences-changed'));
      await refresh();
    }
    catch (error) { paint(); status.className = 'status error'; status.textContent = error instanceof Error ? error.message : 'Preference could not be saved.'; }
  }
  function close(restoreFocus = true) { menuHost.hidden = true; generation++; stop?.(); stop = undefined; trigger.setAttribute('aria-expanded', 'false'); if (restoreFocus && trigger.isConnected) trigger.focus(); }
  function open() {
    if (disposed) return;
    menuHost.hidden = false; trigger.setAttribute('aria-expanded', 'true'); status.textContent = 'Reading preferences…';
    darkLabel.hidden = !actions.darkAvailable(); upcoming.hidden = !actions.hasUpcoming();
    if (subscribe && !stop) { try { stop = subscribe(() => { void refresh(); }); } catch { /* Opening reads current persisted state. */ } }
    void refresh(); saved.focus();
  }
  const outside = (event: Event) => { if (!menuHost.hidden && !event.composedPath().includes(host)) close(false); };
  document.addEventListener('pointerdown', outside);
  shadow.addEventListener('keydown', event => { if ((event as KeyboardEvent).key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); } });
  media?.addEventListener('change', paint);
  return { toggle: () => { if (menuHost.hidden) open(); else close(); }, close,
    dispose() { disposed = true; generation++; stop?.(); stop = undefined; document.removeEventListener('pointerdown', outside); media?.removeEventListener('change', paint); menuHost.remove(); },
  };
}
