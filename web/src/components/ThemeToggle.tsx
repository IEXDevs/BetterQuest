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

  return (
    <Classic
      className="theme-toggle"
      toggled={isDark}
      duration={500}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    />
  );
}
