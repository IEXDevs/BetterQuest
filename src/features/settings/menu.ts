import { featurePreferences, type FeatureName, type Preferences } from '../../shared/models';
import { execute, type Execute } from '../../shared/client';
import type { Subscribe } from '../assignments/section';
import { ThemePreferences, resolveTheme } from '../theme/preferences';
import type { QuestNavigationLink } from '../../content/navigation';

export type MenuView = 'betterquest' | 'quest';

export function createSettingsMenu(
  host: HTMLElement,
  trigger: HTMLButtonElement,
  run: Execute = execute,
  subscribe?: Subscribe,
  actions: {
    saved: () => void;
    upcoming: () => boolean;
    hasUpcoming: () => boolean;
    darkAvailable: () => boolean;
    questLinks?: () => QuestNavigationLink[];
  } = { saved() {}, upcoming: () => false, hasUpcoming: () => false, darkAvailable: () => false },
  questTrigger?: HTMLButtonElement
) {
  const document = host.ownerDocument;
  const menuHost = document.createElement('span');
  menuHost.hidden = true;
  const shadow = menuHost.attachShadow({ mode: 'open' });
  shadow.addEventListener('click', event => event.stopPropagation());

  const style = document.createElement('style');
  style.textContent = `
    :host {
      display: block;
      position: absolute;
      top: calc(100% + 8px);
      left: 0;
      right: 0;
      z-index: 1200;
      pointer-events: none;
    }
    :host([hidden]) { display: none; }
    * { box-sizing: border-box; }
    .menu-dropdown [hidden], [hidden] { display: none !important; }
    .menu-dropdown {
      pointer-events: auto;
      position: absolute;
      top: 0;
      overflow: visible;
      background: color-mix(in srgb, var(--bq-surface, #141c26) 96%, transparent);
      color: var(--bq-text, #edf3fb);
      border: 1px solid var(--bq-border, rgba(255, 255, 255, 0.12));
      border-radius: 18px;
      box-shadow: 0 20px 55px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.1);
      font: 13px/1.45 ui-rounded, 'Avenir Next', -apple-system, sans-serif;
      text-align: left;
      animation: menu-in 0.18s cubic-bezier(0.2, 0.8, 0.2, 1);
      backdrop-filter: blur(20px);
    }
    .bq-menu {
      width: 330px;
      max-width: calc(100vw - 20px);
      padding: 16px;
      left: 0;
      right: auto;
      transform-origin: top left;
    }
    .quest-menu {
      width: 250px;
      max-width: calc(100vw - 20px);
      padding: 14px;
      right: 0;
      left: auto;
      transform-origin: top right;
    }
    h2 {
      font: 800 17px/1.2 ui-rounded, 'Avenir Next', sans-serif;
      letter-spacing: -0.02em;
      margin: 0 0 2px;
      color: var(--bq-text, #f8fafc);
    }
    .eyebrow {
      margin: 0 0 12px;
      color: var(--bq-muted, #94a3b8);
      font-size: 11px;
    }
    .section-title {
      margin: 14px 0 6px;
      color: var(--bq-muted, #94a3b8);
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.11em;
      text-transform: uppercase;
    }
    label {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 14px;
      padding: 9px 0;
      border-bottom: 1px solid var(--bq-border, rgba(255, 255, 255, 0.07));
      cursor: pointer;
    }
    small {
      display: block;
      color: var(--bq-muted, #94a3b8);
      font-size: 11px;
      margin-top: 2px;
    }
    input {
      accent-color: var(--bq-accent, #f6a24a);
      width: 16px;
      height: 16px;
      flex: none;
      cursor: pointer;
    }
    button {
      display: block;
      background: transparent;
      border: 0;
      color: var(--bq-accent, #f6a24a);
      font: inherit;
      padding: 8px 0;
      cursor: pointer;
      text-align: left;
      width: 100%;
    }
    button:hover { text-decoration: underline; }
    .quick {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .quick button {
      padding: 9px 12px;
      border: 1px solid var(--bq-border, rgba(255, 255, 255, 0.08));
      border-radius: 11px;
      background: var(--bq-raised, rgba(255, 255, 255, 0.06));
      color: var(--bq-text, #f8fafc);
      font-weight: 700;
      text-decoration: none !important;
      transition: all 0.15s ease;
    }
    .quick button:hover {
      background: var(--bq-raised, rgba(255, 255, 255, 0.12));
      color: #fff;
    }
    /* Quest links & flyouts */
    .quest-links {
      display: grid;
      gap: 4px;
      position: relative;
    }
    .quest-item-wrapper {
      position: relative;
    }
    .quest-link {
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: 38px;
      padding: 8px 11px;
      border-radius: 10px;
      color: var(--bq-text, #f1f5f9);
      text-decoration: none;
      font-weight: 600;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.05);
      transition: all 0.15s ease;
    }
    .quest-link:hover {
      background: rgba(255, 255, 255, 0.12);
      color: var(--bq-accent, #f6a24a);
      border-color: rgba(246, 162, 74, 0.35);
    }
    .quest-link.danger { color: #f87171; }
    .quest-link.danger:hover { color: #fca5a5; border-color: rgba(248, 113, 113, 0.4); }
    .quest-item-wrapper.has-flyout > .quest-link::after {
      content: '›';
      font-size: 16px;
      line-height: 1;
      opacity: 0.6;
      margin-left: auto;
      transition: all 0.14s ease;
    }
    .quest-item-wrapper.has-flyout:hover > .quest-link::after {
      opacity: 1;
      color: var(--bq-accent, #f6a24a);
      transform: translateX(1px);
    }
    /* Side-opening suboptions */
    .sub-flyout {
      position: absolute;
      top: 0;
      left: 100%;
      margin-left: 8px;
      width: 200px;
      padding: 8px;
      background: color-mix(in srgb, var(--bq-surface, #141c26) 98%, transparent);
      border: 1px solid var(--bq-border, rgba(255, 255, 255, 0.16));
      border-radius: 13px;
      box-shadow: 0 16px 45px rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(20px);
      z-index: 1300;
      display: flex;
      flex-direction: column;
      gap: 3px;
      animation: flyout-in 0.16s ease-out;
    }
    .sub-flyout::before {
      content: '';
      position: absolute;
      top: -24px;
      bottom: -24px;
      width: 36px;
      pointer-events: auto;
    }
    .sub-flyout.is-right::before {
      right: 100%;
    }
    .sub-flyout.is-left::before {
      left: 100%;
    }
    .sub-flyout-item {
      display: block;
      padding: 7px 10px;
      border-radius: 8px;
      color: #e2e8f0;
      text-decoration: none;
      font-size: 11.5px;
      font-weight: 600;
      transition: all 0.14s ease;
    }
    .sub-flyout-item:hover {
      background: rgba(255, 255, 255, 0.12);
      color: var(--bq-accent, #f6a24a);
    }
    button:focus-visible, input:focus-visible, .quest-link:focus-visible, .sub-flyout-item:focus-visible {
      outline: 2px solid var(--bq-accent, #f6a24a);
      outline-offset: 2px;
    }
    .status {
      font-size: 11px;
      color: var(--bq-muted, #94a3b8);
      min-height: 16px;
      margin-top: 8px;
    }
    .error { color: var(--bq-warning, #f87171); }
    @keyframes menu-in {
      from { opacity: 0; transform: translateY(-5px) scale(0.98); }
      to { opacity: 1; transform: none; }
    }
    @keyframes flyout-in {
      from { opacity: 0; transform: scale(0.96); }
      to { opacity: 1; transform: none; }
    }
    @media (prefers-reduced-motion: reduce) {
      .menu-dropdown, .sub-flyout { animation: none; }
    }
    :root[data-betterquest-animations="disabled"] .menu-dropdown,
    :root[data-betterquest-animations="disabled"] .sub-flyout {
      animation: none !important;
      transition: none !important;
    }
  `;

  // 1. BetterQuest dropdown
  const bqMenu = document.createElement('section');
  bqMenu.className = 'menu-dropdown bq-menu';
  bqMenu.hidden = true;
  bqMenu.setAttribute('role', 'dialog');
  bqMenu.setAttribute('aria-label', 'BetterQuest settings');

  const title = document.createElement('h2');
  title.textContent = 'BetterQuest';
  const eyebrow = document.createElement('p');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = 'A calmer workspace for Quest.';
  bqMenu.append(title, eyebrow);

  const inputs = new Map<FeatureName, HTMLInputElement>();
  for (const [feature, name, description] of [
    ['assignments', 'Assignment tracker', 'Homepage overview and course summaries.'],
    ['bookmarks', 'Question bookmarks', 'Show save icons; saved questions remain available.'],
    ['animations', 'Animations', 'Fluid swirly backgrounds and motion.'],
  ] as const) {
    const label = document.createElement('label');
    const text = document.createElement('span');
    text.textContent = name;
    const help = document.createElement('small');
    help.textContent = description;
    text.append(help);
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('role', 'switch');
    input.setAttribute('aria-label', name);
    input.disabled = true;
    label.append(text, input);
    bqMenu.append(label);
    inputs.set(feature, input);
    input.addEventListener('change', () => {
      void save(async () => {
        await run({ kind: 'feature:set', feature, enabled: input.checked });
      }, input);
    });
  }

  const darkLabel = document.createElement('label');
  const darkText = document.createElement('span');
  darkText.textContent = 'Dark mode';
  const darkHelp = document.createElement('small');
  darkHelp.textContent = 'Quest components only; original PDF colors are preserved.';
  darkText.append(darkHelp);
  const darkInput = document.createElement('input');
  darkInput.type = 'checkbox';
  darkInput.setAttribute('role', 'switch');
  darkInput.setAttribute('aria-label', 'Dark mode');
  darkInput.disabled = true;
  darkLabel.append(darkText, darkInput);
  bqMenu.append(darkLabel);

  const theme = new ThemePreferences(run);
  darkInput.addEventListener('change', () => {
    void save(async () => {
      await theme.set(darkInput.checked ? 'dark' : 'light');
    }, darkInput);
  });

  const quickTitle = document.createElement('p');
  quickTitle.className = 'section-title';
  quickTitle.textContent = 'Workspace';
  const quick = document.createElement('div');
  quick.className = 'quick';
  const saved = document.createElement('button');
  saved.className = 'saved-action';
  saved.type = 'button';
  saved.textContent = 'Saved questions';
  saved.addEventListener('click', () => {
    close(false);
    actions.saved();
  });
  const upcoming = document.createElement('button');
  upcoming.className = 'upcoming-action';
  upcoming.type = 'button';
  upcoming.textContent = 'Assignments';
  upcoming.addEventListener('click', () => {
    close(false);
    actions.upcoming();
  });
  quick.append(saved, upcoming);
  bqMenu.append(quickTitle, quick);

  const status = document.createElement('div');
  status.className = 'status';
  status.setAttribute('role', 'status');
  bqMenu.append(status);

  // 2. Quest Settings dropdown
  const questMenu = document.createElement('section');
  questMenu.className = 'menu-dropdown quest-menu';
  questMenu.hidden = true;
  questMenu.setAttribute('role', 'dialog');
  questMenu.setAttribute('aria-label', 'Quest settings');

  const qTitle = document.createElement('h2');
  qTitle.textContent = 'Quest Settings';
  const qEyebrow = document.createElement('p');
  qEyebrow.className = 'eyebrow';
  qEyebrow.textContent = 'University tools and account options.';
  const questLinks = document.createElement('nav');
  questLinks.className = 'quest-links';
  questLinks.setAttribute('aria-label', 'Quest account links');
  questMenu.append(qTitle, qEyebrow, questLinks);

  shadow.append(style, bqMenu, questMenu);
  host.append(menuHost);

  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-label', 'BetterQuest settings');

  if (questTrigger) {
    questTrigger.setAttribute('aria-haspopup', 'dialog');
    questTrigger.setAttribute('aria-expanded', 'false');
    questTrigger.setAttribute('aria-label', 'Quest settings');
  }

  let activeView: MenuView = 'betterquest';
  let disposed = false, generation = 0;
  let preference: Preferences | undefined;
  let stop: (() => void) | undefined;
  let hoverTimer: ReturnType<typeof setTimeout> | number | undefined;

  const media = document.defaultView!.matchMedia?.('(prefers-color-scheme: dark)');

  function paint() {
    if (!preference) return;
    const features = featurePreferences(preference);
    for (const [name, input] of inputs) {
      input.checked = Boolean(features[name]);
      input.disabled = false;
    }
    darkLabel.hidden = !actions.darkAvailable();
    darkInput.checked = resolveTheme(preference.theme, Boolean(media?.matches)) === 'dark';
    darkInput.disabled = !actions.darkAvailable();
    upcoming.hidden = !actions.hasUpcoming();
  }

  // Flyout suboption definitions
  const FLYOUT_SUBOPTIONS: Record<string, { label: string; href: string }[]> = {
    Account: [
      { label: 'Edit Profile Details', href: '/student/profiles/edit' },
      { label: 'Sign Out Session', href: '/student/home/logoff' },
    ],
    'What I Owe': [
      { label: 'Tuition & Fees Balance', href: '/student/courses/fees' },
      { label: 'Payment Records', href: '/student/courses/fees' },
    ],
    Wiki: [
      { label: 'Student Documentation', href: 'https://wikis.utexas.edu/display/questla/Students' },
      { label: 'Assessment Help', href: 'https://wikis.utexas.edu/display/questla/Students' },
    ],
    Contact: [
      { label: 'Submit Support Ticket', href: '/student/contact/new' },
      { label: 'CNS Helpdesk Info', href: '/student/contact/new' },
    ],
  };

  function paintQuestLinks() {
    questLinks.replaceChildren();
    const flyoutEntries: { flyout: HTMLElement; hide: () => void }[] = [];

    for (const item of actions.questLinks?.() || []) {
      const wrap = document.createElement('div');
      wrap.className = 'quest-item-wrapper';

      const link = document.createElement('a');
      link.className = 'quest-link' + (/log out/i.test(item.label) ? ' danger' : '');
      link.textContent = item.label;
      link.setAttribute('href', item.href);
      if (item.target) {
        link.target = item.target;
        link.rel = 'noopener noreferrer';
      }

      const subList = FLYOUT_SUBOPTIONS[item.label];
      wrap.className = 'quest-item-wrapper' + (subList ? ' has-flyout' : '');

      if (subList) {
        const flyout = document.createElement('div');
        flyout.className = 'sub-flyout';
        flyout.hidden = true;

        for (const sub of subList) {
          const subLink = document.createElement('a');
          subLink.className = 'sub-flyout-item';
          subLink.textContent = sub.label;
          subLink.href = sub.href;
          if (item.target) {
            subLink.target = item.target;
            subLink.rel = 'noopener noreferrer';
          }
          flyout.append(subLink);
        }

        wrap.append(link, flyout);

        let flyoutTimer: ReturnType<typeof setTimeout> | number | undefined;
        const cancelFlyoutClose = () => {
          if (flyoutTimer) {
            clearTimeout(flyoutTimer);
            flyoutTimer = undefined;
          }
        };

        const scheduleFlyoutClose = () => {
          cancelFlyoutClose();
          flyoutTimer = setTimeout(() => {
            flyout.hidden = true;
          }, 2000);
        };

        flyoutEntries.push({
          flyout,
          hide: () => {
            cancelFlyoutClose();
            flyout.hidden = true;
          },
        });

        // Smart page boundary calculation
        const onHoverItem = () => {
          for (const entry of flyoutEntries) {
            if (entry.flyout !== flyout) entry.hide();
          }
          cancelFlyoutClose();
          cancelHoverClose();
          flyout.hidden = false;
          const rect = wrap.getBoundingClientRect();
          const winWidth = document.defaultView?.innerWidth || 1200;
          const winHeight = document.defaultView?.innerHeight || 800;
          const flyoutWidth = 210;
          const flyoutHeight = 85;

          // Horizontal overflow check
          if (rect.right + flyoutWidth > winWidth - 12) {
            flyout.className = 'sub-flyout is-left';
            flyout.style.left = 'auto';
            flyout.style.right = '100%';
            flyout.style.marginLeft = '0';
            flyout.style.marginRight = '8px';
          } else {
            flyout.className = 'sub-flyout is-right';
            flyout.style.left = '100%';
            flyout.style.right = 'auto';
            flyout.style.marginLeft = '8px';
            flyout.style.marginRight = '0';
          }

          // Vertical overflow check
          if (rect.top + flyoutHeight > winHeight - 12) {
            flyout.style.top = 'auto';
            flyout.style.bottom = '0';
          } else {
            flyout.style.top = '0';
            flyout.style.bottom = 'auto';
          }
        };

        wrap.addEventListener('pointerenter', onHoverItem);
        wrap.addEventListener('pointermove', cancelHoverClose);
        wrap.addEventListener('pointerleave', scheduleFlyoutClose);

        flyout.addEventListener('pointerenter', () => {
          cancelFlyoutClose();
          cancelHoverClose();
        });
        flyout.addEventListener('pointermove', () => {
          cancelFlyoutClose();
          cancelHoverClose();
        });
        flyout.addEventListener('pointerleave', () => {
          scheduleFlyoutClose();
          scheduleHoverClose();
        });
      } else {
        wrap.append(link);
      }

      questLinks.append(wrap);
    }
  }

  async function refresh() {
    const current = ++generation;
    try {
      const state = await run({ kind: 'state:read' });
      if (disposed || menuHost.hidden || current !== generation) return;
      preference = state.preferences;
      paint();
      status.className = 'status';
      status.textContent = 'Saved to this device';
    } catch (error) {
      if (!disposed && !menuHost.hidden && current === generation) {
        status.className = 'status error';
        status.textContent = error instanceof Error ? error.message : 'Settings unavailable.';
      }
    }
  }

  async function save(operation: () => Promise<void>, input: HTMLInputElement) {
    input.disabled = true;
    try {
      await operation();
      document.defaultView!.dispatchEvent(
        new document.defaultView!.Event('betterquest:preferences-changed')
      );
      await refresh();
    } catch (error) {
      paint();
      status.className = 'status error';
      status.textContent = error instanceof Error ? error.message : 'Preference could not be saved.';
    }
  }

  function close(restoreFocus = true) {
    cancelHoverClose();
    menuHost.hidden = true;
    bqMenu.hidden = true;
    questMenu.hidden = true;
    generation++;
    stop?.();
    stop = undefined;
    trigger.setAttribute('aria-expanded', 'false');
    if (questTrigger) questTrigger.setAttribute('aria-expanded', 'false');
    if (restoreFocus && trigger.isConnected) {
      if (activeView === 'quest' && questTrigger && questTrigger.isConnected) {
        questTrigger.focus();
      } else {
        trigger.focus();
      }
    }
  }

  function open(view: MenuView = 'betterquest') {
    if (disposed) return;
    activeView = view;
    cancelHoverClose();
    menuHost.hidden = false;

    const hostRect = host.getBoundingClientRect();
    const winWidth = document.defaultView?.innerWidth || 1200;

    if (view === 'betterquest') {
      bqMenu.hidden = false;
      questMenu.hidden = true;
      trigger.setAttribute('aria-expanded', 'true');
      if (questTrigger) questTrigger.setAttribute('aria-expanded', 'false');

      if (hostRect.width > 0 && hostRect.left + 330 > winWidth - 16) {
        bqMenu.style.left = 'auto';
        bqMenu.style.right = '0';
        bqMenu.style.transformOrigin = 'top right';
      } else if (hostRect.width > 0) {
        bqMenu.style.left = '0';
        bqMenu.style.right = 'auto';
        bqMenu.style.transformOrigin = 'top left';
      }
    } else {
      bqMenu.hidden = true;
      questMenu.hidden = false;
      trigger.setAttribute('aria-expanded', 'false');
      if (questTrigger) questTrigger.setAttribute('aria-expanded', 'true');

      if (hostRect.width > 0 && hostRect.right - 250 < 16) {
        questMenu.style.left = '0';
        questMenu.style.right = 'auto';
        questMenu.style.transformOrigin = 'top left';
      } else if (hostRect.width > 0) {
        questMenu.style.left = 'auto';
        questMenu.style.right = '0';
        questMenu.style.transformOrigin = 'top right';
      }
    }

    status.textContent = 'Loading preferences…';
    paintQuestLinks();
    darkLabel.hidden = !actions.darkAvailable();
    upcoming.hidden = !actions.hasUpcoming();
    if (subscribe && !stop) {
      try {
        stop = subscribe(() => {
          void refresh();
        });
      } catch {}
    }
    void refresh();
  }

  // Graceful hover timers
  const cancelHoverClose = () => {
    if (hoverTimer) {
      clearTimeout(hoverTimer);
      hoverTimer = undefined;
    }
  };

  const scheduleHoverClose = () => {
    cancelHoverClose();
    hoverTimer = setTimeout(() => close(false), 2000);
  };

  trigger.addEventListener('pointerenter', () => {
    cancelHoverClose();
    open('betterquest');
  });
  trigger.addEventListener('pointerleave', scheduleHoverClose);

  if (questTrigger) {
    questTrigger.addEventListener('pointerenter', () => {
      cancelHoverClose();
      open('quest');
    });
    questTrigger.addEventListener('pointerleave', scheduleHoverClose);
  }

  bqMenu.addEventListener('pointerenter', cancelHoverClose);
  bqMenu.addEventListener('pointermove', cancelHoverClose);
  bqMenu.addEventListener('pointerleave', scheduleHoverClose);

  questMenu.addEventListener('pointerenter', cancelHoverClose);
  questMenu.addEventListener('pointermove', cancelHoverClose);
  questMenu.addEventListener('pointerleave', scheduleHoverClose);

  menuHost.addEventListener('pointerenter', cancelHoverClose);
  menuHost.addEventListener('pointermove', cancelHoverClose);

  const outside = (event: Event) => {
    if (!menuHost.hidden && !event.composedPath().includes(host)) close(false);
  };
  document.addEventListener('pointerdown', outside);

  shadow.addEventListener('keydown', event => {
    if ((event as KeyboardEvent).key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  });

  media?.addEventListener('change', paint);
  paintQuestLinks();

  return {
    toggle: (view?: MenuView) => {
      const targetView = view ?? 'betterquest';
      if (menuHost.hidden || targetView !== activeView) {
        open(targetView);
      } else {
        close();
      }
    },
    open,
    close,
    dispose() {
      disposed = true;
      generation++;
      cancelHoverClose();
      stop?.();
      stop = undefined;
      document.removeEventListener('pointerdown', outside);
      media?.removeEventListener('change', paint);
      menuHost.remove();
    },
  };
}
