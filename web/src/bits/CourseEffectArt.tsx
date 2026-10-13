import { useEffect, useRef, type CSSProperties } from 'react';
import { COURSE_EFFECT_CSS, courseArtMood, palette, solidColor } from '../../../src/features/courses/effects';
import { mountLightFall } from '../../../src/features/courses/reactbits/light-fall';
import { mountMagicRings } from '../../../src/features/courses/reactbits/magic-rings';
import type { EffectInstance, EffectMount } from '../../../src/features/courses/reactbits/shared';

/** Backdrops the site shares with the extension: the same react-bits ports,
 *  mounted the same way, over the same CSS fallback art. */
export type SharedEffect = 'light-fall' | 'magic-rings';

const MOUNTS: Record<SharedEffect, EffectMount> = {
  'light-fall': mountLightFall,
  'magic-rings': mountMagicRings,
};

let fallbackCss: HTMLStyleElement | null = null;

/** The extension's fallback art is one stylesheet; load it once per page. */
function ensureFallbackCss(): void {
  if (fallbackCss?.isConnected) return;
  fallbackCss = document.createElement('style');
  fallbackCss.textContent = COURSE_EFFECT_CSS;
  document.head.append(fallbackCss);
}

export interface CourseEffectArtProps {
  effect: SharedEffect;
  /** Course key, so the same course always shows the same animation phase. */
  artKey: string;
}

export function CourseEffectArt({ effect, artKey }: CourseEffectArtProps) {
  const fallbackRef = useRef<HTMLSpanElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ensureFallbackCss();
    const layer = layerRef.current;
    const fallback = fallbackRef.current;
    if (!layer || !fallback) return;
    let instance: EffectInstance | null = null;
    try {
      instance = MOUNTS[effect](layer);
    } catch {
      instance = null; // No WebGL here — the CSS fallback art stays.
    }
    if (!instance) return;
    fallback.style.display = 'none';
    return () => {
      instance?.destroy();
      fallback.style.removeProperty('display');
    };
  }, [effect]);

  // One palette for every course: the M408D purple, with no hue drift, so
  // all the backdrops read as the same family of art.
  const [deep, bright, paper] = palette('M');
  const mood = courseArtMood(artKey);
  const variables = {
    '--fx-deep': deep,
    '--fx-bright': bright,
    '--fx-paper': paper,
    '--fx-solid': solidColor('M'),
    '--fx-hue': '0deg',
    '--fx-delay': `${mood.delay}s`,
  } as CSSProperties;

  return (
    <div className="course-effect-art" style={variables}>
      <span ref={fallbackRef} className={`art-bg fx-${effect}`} aria-hidden="true" />
      <div ref={layerRef} className="fx-layer" aria-hidden="true" />
    </div>
  );
}

export default CourseEffectArt;
