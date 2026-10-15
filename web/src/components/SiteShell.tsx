import type { ReactNode } from 'react';
import { SiteAtmosphere } from './SiteAtmosphere';
import { ThemeProvider } from './theme-provider';

export function SiteShell({
  children,
  atmosphere: _atmosphere = 'aurora',
}: {
  children: ReactNode;
  atmosphere?: 'aurora' | 'threads';
}) {
  return (
    <ThemeProvider>
      <div className="theme-blur-veil" aria-hidden="true" />
      <SiteAtmosphere />
      {children}
    </ThemeProvider>
  );
}
