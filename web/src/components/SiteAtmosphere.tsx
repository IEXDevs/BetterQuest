import { lazy, Suspense, useEffect, useState } from 'react';

const SoftAurora = lazy(() => import('../bits/SoftAurora'));
const Threads = lazy(() => import('../bits/Threads'));

export function SiteAtmosphere({ variant = 'aurora' }: { variant?: 'aurora' | 'threads' }) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const saveData = 'connection' in navigator
      && Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);
    if (reduceMotion || saveData) return;
    setEnabled(true);
  }, []);

  if (!enabled) return null;

  return (
    <div className="site-atmosphere" aria-hidden="true">
      <Suspense fallback={null}>
        {variant === 'threads' ? (
          <Threads
            color="#bf5700"
            accentColor="#f47b25"
            amplitude={0.85}
            distance={0.25}
            enableMouseInteraction
            lineCount={28}
            thickness={1.1}
            softness={0.7}
            speed={0.35}
            opacity={0.55}
            brightness={0.9}
            fade={0.55}
          />
        ) : (
          <SoftAurora
            speed={0.55}
            scale={1.15}
            brightness={0.72}
            color1="#bf5700"
            color2="#1a0f08"
            noiseFrequency={1.1}
            noiseAmplitude={0.55}
            bandHeight={0.42}
            bandSpread={1.35}
            colorSpeed={0.45}
            enableMouseInteraction
            mouseInfluence={0.85}
          />
        )}
      </Suspense>
    </div>
  );
}
