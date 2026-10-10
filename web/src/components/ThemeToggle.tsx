import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Classic } from '@theme-toggles/react';
import '@theme-toggles/react/styles/classic.css';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!resolvedTheme) return;
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      'content',
      resolvedTheme === 'dark' ? '#080808' : '#f1efe9',
    );
  }, [resolvedTheme]);

  if (!mounted) {
    return (
      <button
        className="theme-toggle"
        type="button"
        aria-label="Toggle theme"
        disabled
      />
    );
  }

  const isDark = resolvedTheme === 'dark';

  const handleToggle = () => {
    const nextTheme = isDark ? 'light' : 'dark';
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const doc = document as Document & {
      startViewTransition?: (callback: () => void) => { ready: Promise<void>; finished: Promise<void> };
    };

    if (!reduceMotion && typeof doc.startViewTransition === 'function') {
      doc.startViewTransition(() => {
        setTheme(nextTheme);
      });
    } else {
      const root = document.documentElement;
      if (!reduceMotion) {
        root.classList.add('theme-transitioning');
        window.setTimeout(() => {
          root.classList.remove('theme-transitioning');
        }, 450);
      }
      setTheme(nextTheme);
    }
  };

  return (
    <Classic
      className="theme-toggle"
      toggled={isDark}
      duration={500}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      onClick={handleToggle}
    />
  );
}
