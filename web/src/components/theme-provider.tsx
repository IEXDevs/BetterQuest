import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type Theme = 'light' | 'dark' | 'system';

type ThemeContextValue = {
  theme: Theme | undefined;
  setTheme: (theme: Theme | ((prev: Theme | undefined) => Theme)) => void;
  resolvedTheme: 'light' | 'dark' | undefined;
  themes: string[];
  systemTheme: 'light' | 'dark' | undefined;
};

const STORAGE_KEY = 'betterquest.theme';
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function readStoredTheme(storageKey = STORAGE_KEY): Theme {
  try {
    const saved = window.localStorage.getItem(storageKey);
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
  } catch {
    /* Storage unavailable: follow the system preference. */
  }
  return 'system';
}

function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyTheme(resolved: 'light' | 'dark') {
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
}

type ThemeProviderProps = {
  children: ReactNode;
  /** Kept for call-site compatibility with the old next-themes API. */
  attribute?: string;
  defaultTheme?: string;
  enableSystem?: boolean;
  storageKey?: string;
  disableTransitionOnChange?: boolean;
};

/**
 * Client theme state only. FOUC prevention lives in `theme-boot.js` so we never
 * render a React `<script>` (React 19 logs that as an error on every page).
 */
export function ThemeProvider({
  children,
  storageKey = STORAGE_KEY,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() =>
    typeof window === 'undefined' ? 'system' : readStoredTheme(storageKey),
  );
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(() =>
    typeof window !== 'undefined' && systemPrefersDark() ? 'dark' : 'light',
  );

  const resolvedTheme = theme === 'system' ? systemTheme : theme;

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setSystemTheme(media.matches ? 'dark' : 'light');
    onChange();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  const setTheme = useCallback((next: Theme | ((prev: Theme | undefined) => Theme)) => {
    setThemeState((prev) => {
      const value = typeof next === 'function' ? next(prev) : next;
      try {
        window.localStorage.setItem(storageKey, value);
      } catch {
        /* Storage unavailable: still update the in-memory theme. */
      }
      return value;
    });
  }, [storageKey]);

  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    setTheme,
    resolvedTheme,
    themes: ['light', 'dark', 'system'],
    systemTheme,
  }), [theme, setTheme, resolvedTheme, systemTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext) ?? {
    theme: undefined,
    setTheme: () => undefined,
    resolvedTheme: undefined,
    themes: [],
    systemTheme: undefined,
  };
}
