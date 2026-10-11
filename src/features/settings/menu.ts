import { featurePreferences, type FeatureName, type Preferences } from '../../shared/models';
import { execute, type Execute } from '../../shared/client';
import type { Subscribe } from '../assignments/section';
import { ThemePreferences, resolveTheme } from '../theme/preferences';
import type { QuestNavigationLink } from '../../content/navigation';

export type MenuView = 'betterquest' | 'quest';

const HOVER_CLOSE_DELAY_MS = 250;

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
      background: color-mix(in srgb, var(--bq-surface, #0f172a) 94%, transparent);
      color: var(--bq-text, #edf3fb);
      border: 1px solid var(--bq-border, rgba(255, 255, 255, 0.14));
      border-radius: 11px;
      box-shadow: 0 28px 70px -10px rgba(0, 0, 0, 0.72), 0 0 0 1px rgba(255, 255, 255, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.16);
      font: 13px/1.45 ui-rounded, 'Avenir Next', -apple-system, sans-serif;
      text-align: left;
      animation: menu-fluid-spring 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      backdrop-filter: blur(28px) saturate(190%);
      will-change: transform, opacity, filter;
    }
    .menu-dropdown::before {
      content: '';
      position: absolute;
      top: -12px;
      left: 0;
      right: 0;
      height: 12px;
      pointer-events: auto;
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
    .menu-dropdown > * {
      animation: dropdown-child-fade 0.26s cubic-bezier(0.16, 1, 0.3, 1) backwards;
    }
    .menu-dropdown > *:nth-child(1) { animation-delay: 0.015s; }
    .menu-dropdown > *:nth-child(2) { animation-delay: 0.035s; }
    .menu-dropdown > *:nth-child(3) { animation-delay: 0.055s; }
    .menu-dropdown > *:nth-child(4) { animation-delay: 0.075s; }
    .menu-dropdown > *:nth-child(5) { animation-delay: 0.095s; }
    .menu-dropdown > *:nth-child(6) { animation-delay: 0.115s; }
    .menu-dropdown > *:nth-child(7) { animation-delay: 0.135s; }
    .menu-dropdown > *:nth-child(8) { animation-delay: 0.155s; }
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
      padding: 8px 10px;
      margin: 2px -10px;
      border-radius: 7px;
      border-bottom: 1px solid var(--bq-border, rgba(255, 255, 255, 0.07));
      cursor: pointer;
      transition: background 0.2s cubic-bezier(0.16, 1, 0.3, 1),
                  transform 0.2s cubic-bezier(0.16, 1, 0.3, 1),
                  border-color 0.2s ease;
    }
    label:hover {
      background: rgba(129, 140, 248, 0.08);
      transform: translateX(3px);
    }
    label:active {
      transform: translateX(1px) scale(0.99);
    }
    small {
      display: block;
      color: var(--bq-muted, #94a3b8);
      font-size: 11px;
      margin-top: 2px;
    }
    input {
      accent-color: #818cf8;
      width: 17px;
      height: 17px;
      flex: none;
      cursor: pointer;
      transition: transform 0.24s cubic-bezier(0.34, 1.56, 0.64, 1),
                  filter 0.2s ease;
    }
    input:hover {
      transform: scale(1.15);
      filter: drop-shadow(0 2px 6px rgba(129, 140, 248, 0.4));
    }
    input:checked {
      filter: drop-shadow(0 2px 6px rgba(129, 140, 248, 0.45));
    }
    button {
      display: block;
      background: transparent;
      border: 0;
      color: var(--bq-accent, #38bdf8);
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
      padding: 10px 14px;
      border: 1px solid var(--bq-border, rgba(255, 255, 255, 0.08));
      border-radius: 7px;
      background: var(--bq-raised, rgba(255, 255, 255, 0.05));
      color: var(--bq-text, #f8fafc);
      font-weight: 700;
      text-decoration: none !important;
      transition: transform 0.24s cubic-bezier(0.16, 1, 0.3, 1),
                  background 0.24s cubic-bezier(0.16, 1, 0.3, 1),
                  border-color 0.24s cubic-bezier(0.16, 1, 0.3, 1),
                  box-shadow 0.24s ease;
    }
    .quick button:hover {
      transform: translateY(-2px) scale(1.02);
      background: linear-gradient(135deg, rgba(129, 140, 248, 0.22), rgba(56, 189, 248, 0.12));
      border-color: rgba(129, 140, 248, 0.45);
      box-shadow: 0 10px 28px rgba(0, 0, 0, 0.42);
      color: #fff;
    }
    .quick button:active {
      transform: translateY(0) scale(0.97);
    }
    /* Quest links & flyouts */
    .quest-links {
      display: grid;
      gap: 5px;
      position: relative;
    }
    .quest-item-wrapper {
      position: relative;
    }
    .quest-link {
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: 40px;
      padding: 9px 12px;
      border-radius: 7px;
      color: var(--bq-text, #f1f5f9);
      text-decoration: none;
      font-weight: 600;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1),
                  background 0.22s cubic-bezier(0.16, 1, 0.3, 1),
                  border-color 0.22s cubic-bezier(0.16, 1, 0.3, 1),
                  color 0.18s ease,
                  box-shadow 0.22s ease;
    }
    .quest-link:hover {
      transform: translateX(3px);
      background: linear-gradient(90deg, rgba(129, 140, 248, 0.18), rgba(56, 189, 248, 0.1));
      color: #fff;
      border-color: rgba(129, 140, 248, 0.4);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
    }
    .quest-link.danger { color: #f87171; }
    .quest-link.danger:hover {
      background: rgba(248, 113, 113, 0.15);
      color: #fca5a5;
      border-color: rgba(248, 113, 113, 0.4);
    }
    .quest-item-wrapper.has-flyout > .quest-link::after {
      content: '›';
      font-size: 18px;
      line-height: 1;
      opacity: 0.55;
      margin-left: auto;
      transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease, color 0.2s ease;
    }
    .quest-item-wrapper.has-flyout:hover > .quest-link::after {
      opacity: 1;
      color: #818cf8;
      transform: translateX(4px) scale(1.2);
    }
    /* Side-opening suboptions */
    .sub-flyout {
      position: absolute;
      top: 0;
      width: 216px;
      padding: 8px;
      background: color-mix(in srgb, var(--bq-surface, #0f172a) 95%, transparent);
      border: 1px solid var(--bq-border, rgba(255, 255, 255, 0.15));
      border-radius: 9px;
      box-shadow: 0 24px 60px -8px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(28px) saturate(190%);
      z-index: 1300;
      display: flex;
      flex-direction: column;
      gap: 3px;
      will-change: transform, opacity, filter;
    }
    .sub-flyout.is-right {
      left: 100%;
      margin-left: 8px;
      transform-origin: top left;
      animation: flyout-fluid-right 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    .sub-flyout.is-left {
      right: 100%;
      margin-right: 8px;
      transform-origin: top right;
      animation: flyout-fluid-left 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    .sub-flyout::before {
      content: '';
      position: absolute;
      top: -30px;
      bottom: -30px;
      width: 44px;
      pointer-events: auto;
    }
    .sub-flyout.is-right::before {
      right: 100%;
    }
    .sub-flyout.is-left::before {
      left: 100%;
    }
    .sub-flyout > .sub-flyout-item {
      animation: dropdown-child-fade 0.22s cubic-bezier(0.16, 1, 0.3, 1) backwards;
    }
    .sub-flyout > .sub-flyout-item:nth-child(1) { animation-delay: 0.02s; }
    .sub-flyout > .sub-flyout-item:nth-child(2) { animation-delay: 0.045s; }
    .sub-flyout > .sub-flyout-item:nth-child(3) { animation-delay: 0.07s; }
    .sub-flyout-item {
      display: block;
      padding: 8px 12px;
      border-radius: 6px;
      color: #e2e8f0;
      text-decoration: none;
      font-size: 12px;
      font-weight: 600;
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1),
                  background 0.2s cubic-bezier(0.16, 1, 0.3, 1),
                  color 0.18s ease;
    }
    .sub-flyout-item:hover {
      transform: translateX(4px);
      background: linear-gradient(90deg, rgba(129, 140, 248, 0.24), rgba(56, 189, 248, 0.14));
      color: #fff;
    }
    .sub-flyout-item:active {
      transform: translateX(2px) scale(0.98);
    }
    button:focus-visible, input:focus-visible, .quest-link:focus-visible, .sub-flyout-item:focus-visible {
      outline: 2px solid #818cf8;
      outline-offset: 2px;
    }
    .status {
      font-size: 11px;
      color: var(--bq-muted, #94a3b8);
      min-height: 16px;
      margin-top: 8px;
    }
    .error { color: var(--bq-warning, #f87171); }
    @keyframes dropdown-child-fade {
      from {
        opacity: 0;
        transform: translateY(6px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    @keyframes menu-fluid-spring {
      0% {
        opacity: 0;
        transform: translateY(-10px) scale(0.95);
        filter: blur(6px);
      }
      65% {
        opacity: 1;
        transform: translateY(1.5px) scale(1.008);
        filter: blur(0);
      }
      100% {
        opacity: 1;
        transform: translateY(0) scale(1);
        filter: blur(0);
      }
    }
    @keyframes flyout-fluid-right {
      0% {
        opacity: 0;
        transform: translateX(-12px) scale(0.94);
        filter: blur(4px);
      }
      70% {
        opacity: 1;
        transform: translateX(2px) scale(1.008);
        filter: blur(0);
      }
      100% {
        opacity: 1;
        transform: translateX(0) scale(1);
        filter: blur(0);
      }
    }
    @keyframes flyout-fluid-left {
      0% {
        opacity: 0;
        transform: translateX(12px) scale(0.94);
        filter: blur(4px);
      }
      70% {
        opacity: 1;
        transform: translateX(-2px) scale(1.008);
        filter: blur(0);
      }
      100% {
        opacity: 1;
        transform: translateX(0) scale(1);
        filter: blur(0);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .menu-dropdown, .sub-flyout, .menu-dropdown > *, .sub-flyout > * { animation: none !important; }
    }
    :root[data-betterquest-animations="disabled"] .menu-dropdown,
    :root[data-betterquest-animations="disabled"] .sub-flyout,
    :root[data-betterquest-animations="disabled"] .menu-dropdown > *,
    :root[data-betterquest-animations="disabled"] .sub-flyout > * {
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
          }, HOVER_CLOSE_DELAY_MS);
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
      status.textContent = 'Could not update settings. Please try again.';
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
    trigger.classList.remove('is-open');
    if (questTrigger) {
      questTrigger.setAttribute('aria-expanded', 'false');
      questTrigger.classList.remove('is-open');
    }
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
      trigger.classList.add('is-open');
      if (questTrigger) {
        questTrigger.setAttribute('aria-expanded', 'false');
        questTrigger.classList.remove('is-open');
      }

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
      trigger.classList.remove('is-open');
      if (questTrigger) {
        questTrigger.setAttribute('aria-expanded', 'true');
        questTrigger.classList.add('is-open');
      }

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
    hoverTimer = setTimeout(() => close(false), HOVER_CLOSE_DELAY_MS);
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
