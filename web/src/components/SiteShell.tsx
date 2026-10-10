import type { ReactNode } from 'react';
import { ThemeProvider } from 'next-themes';
import { SiteAtmosphere } from './SiteAtmosphere';

export function SiteShell({
  children,
  atmosphere: _atmosphere = 'aurora',
}: {
  children: ReactNode;
  atmosphere?: 'aurora' | 'threads';
}) {
  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme="system"
      enableSystem
      storageKey="betterquest.theme"
      disableTransitionOnChange={false}
    >
      <div className="theme-blur-veil" aria-hidden="true" />
      <SiteAtmosphere />
      {children}
    </ThemeProvider>
  );
}
