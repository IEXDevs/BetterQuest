export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'betterquest.theme';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

interface ThemeControllerDependencies {
  document: Document;
  storage: StorageLike;
  prefersDark: () => boolean;
  prefersReducedMotion: () => boolean;
  startTransition?: (update: () => void) => void;
}

export function resolveTheme(stored: string | null | undefined, prefersDark: boolean): Theme {
  if (stored === 'light' || stored === 'dark') return stored;
  return prefersDark ? 'dark' : 'light';
}

function nextTheme(theme: Theme): Theme {
  return theme === 'dark' ? 'light' : 'dark';
}

function updateThemeUi(document: Document, theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#080808' : '#f1efe9');

  const button = document.querySelector<HTMLButtonElement>('[data-theme-toggle]');
  if (!button) return;
  button.setAttribute('aria-pressed', String(theme === 'dark'));
  button.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
  button.dataset.theme = theme;
  const label = button.querySelector<HTMLElement>('[data-theme-label]');
  if (label) label.textContent = theme === 'dark' ? 'Dark' : 'Light';
}

export function createThemeController(dependencies: ThemeControllerDependencies) {
  const { document, storage, prefersDark, prefersReducedMotion, startTransition } = dependencies;
  let theme: Theme = 'light';

  const commit = (next: Theme) => {
    theme = next;
    try {
      storage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage can be disabled; the theme still applies for this page view.
    }
    updateThemeUi(document, next);
  };

  const toggle = (event?: Event) => {
    const next = nextTheme(theme);
    const target = event?.currentTarget;
    if (target instanceof document.defaultView!.HTMLElement) {
      const rect = target.getBoundingClientRect();
      document.documentElement.style.setProperty('--theme-x', `${rect.left + rect.width / 2}px`);
      document.documentElement.style.setProperty('--theme-y', `${rect.top + rect.height / 2}px`);
    }

    const update = () => commit(next);
    if (!prefersReducedMotion() && startTransition) startTransition(update);
    else update();
  };

  const mount = () => {
    let stored: string | null = null;
    try {
      stored = storage.getItem(THEME_STORAGE_KEY);
    } catch {
      // Use the system preference when storage is unavailable.
    }
    theme = resolveTheme(stored, prefersDark());
    updateThemeUi(document, theme);
    document.querySelector<HTMLButtonElement>('[data-theme-toggle]')?.addEventListener('click', toggle);
  };

  return { mount, toggle };
}

export function mountBrowserThemeController() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const transitionDocument = document as Document & {
    startViewTransition?: (update: () => void) => unknown;
  };
  const controller = createThemeController({
    document,
    storage: {
      getItem: (key) => window.localStorage.getItem(key),
      setItem: (key, value) => window.localStorage.setItem(key, value),
    },
    prefersDark: () => window.matchMedia('(prefers-color-scheme: dark)').matches,
    prefersReducedMotion: () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    startTransition: transitionDocument.startViewTransition
      ? (update) => transitionDocument.startViewTransition!(update)
      : undefined,
  });
  controller.mount();
  return controller;
}
