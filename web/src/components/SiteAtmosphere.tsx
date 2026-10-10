import { lazy, Suspense, useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

const DotGrid = lazy(() => import('../bits/DotGrid'));

export function SiteAtmosphere() {
  const [enabled, setEnabled] = useState(false);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const saveData = 'connection' in navigator
      && Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);
    if (reduceMotion || saveData) return;
    setEnabled(true);
  }, []);

  if (!enabled) return null;

  const isLight = resolvedTheme === 'light';

  return (
    <div className="site-atmosphere" aria-hidden="true">
      <Suspense fallback={null}>
        <DotGrid
          dotSize={3.5}
          gap={18}
          baseColor={isLight ? '#9ca3af' : '#40404a'}
          activeColor={isLight ? '#111827' : '#ffffff'}
          proximity={150}
          shockRadius={280}
          shockStrength={6}
          resistance={650}
          returnDuration={1.2}
        />
      </Suspense>
    </div>
  );
}
