/** Pixel Blast — canvas-2D background ported from the BetterQuest marketing
 *  site's `PixelCard` component (web/src/bits/PixelCard.tsx + .css), the
 *  authoritative PixelBlast-style look for this effect: a grid of tiny squares
 *  with idle sparkles and a pointer glow that brightens nearby pixels.
 *  Colors, grid math, sparkle rate, and timing are kept faithful to the
 *  original. react-bits lineage (MIT + Commons Clause, © David H). */

import { abortMount, canRunEffects, effectCanvas, fitCanvas, pixelRatio, windowOf } from './shared';
import type { EffectInstance, EffectMount } from './shared';

type PixelCardVariant = 'default' | 'blue' | 'yellow' | 'pink' | 'emerald' | 'orange' | 'purple';

const VARIANTS: Record<PixelCardVariant, string[]> = {
  default: ['#18181b', '#27272a', '#3f3f46', '#52525b', '#71717a'],
  blue: ['#082f49', '#0369a1', '#0284c7', '#38bdf8', '#7dd3fc'],
  yellow: ['#422006', '#854d0e', '#ca8a04', '#eab308', '#fef08a'],
  pink: ['#500724', '#9d174d', '#db2777', '#f472b6', '#fbcfe8'],
  emerald: ['#022c22', '#064e3b', '#059669', '#10b981', '#6ee7b7'],
  orange: ['#431407', '#9a3412', '#c2410c', '#f97316', '#fdba74'],
  purple: ['#2e1065', '#581c87', '#7c3aed', '#a855f7', '#d8b4fe'],
};

interface Pixel {
  x: number;
  y: number;
  size: number;
  color: string;
  alpha: number;
  targetAlpha: number;
  step: number;
}

export const mountPixelBlast: EffectMount = (root) => {
  if (!canRunEffects(root)) return null;
  const win = windowOf(root);
  const doc = root.ownerDocument;
  if (!win) return null;

  const canvas = effectCanvas(root);
  const ctx = canvas.getContext('2d');
  if (!ctx) return abortMount(canvas);

  // Fixed defaults from the original component signature.
  const settings = {
    variant: 'emerald' as PixelCardVariant,
    gap: 5,
    speed: 30,
    colors: undefined as string | undefined,
  };

  // Container background from .pixel-card-container, behind the canvas.
  const backdrop = doc.createElement('div');
  backdrop.setAttribute('aria-hidden', 'true');
  backdrop.style.position = 'absolute';
  backdrop.style.inset = '0';
  backdrop.style.background = '#09090b';
  backdrop.style.pointerEvents = 'none';
  backdrop.style.zIndex = '0';
  root.insertBefore(backdrop, canvas);
  canvas.style.zIndex = '1';

  const colorPalette = settings.colors
    ? settings.colors.split(',').map(c => c.trim())
    : VARIANTS[settings.variant] ?? VARIANTS.emerald;

  const pointer = { x: -1000, y: -1000, isHovered: false };
  const view = { width: 1, height: 1 };
  let pixels: Pixel[] = [];
  let raf = 0;
  let visible = true;
  let alive = true;

  const resize = (): void => {
    const dpr = pixelRatio(win);
    const size = fitCanvas(canvas, root, dpr);
    view.width = size.width;
    view.height = size.height;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Re-initialize pixels
    const step = Math.max(3, settings.gap);
    const cols = Math.ceil(view.width / step);
    const rows = Math.ceil(view.height / step);
    pixels = [];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const randomColor = colorPalette[Math.floor(Math.random() * colorPalette.length)];
        const initialAlpha = Math.random() < 0.18 ? Math.random() * 0.4 + 0.1 : 0.04;
        pixels.push({
          x: c * step,
          y: r * step,
          size: step - 1,
          color: randomColor,
          alpha: initialAlpha,
          targetAlpha: initialAlpha,
          step: (Math.random() * 0.02 + 0.01) * (settings.speed / 20),
        });
      }
    }
  };

  let lastTime = 0;
  const frame = (time: number): void => {
    raf = 0;
    if (!alive || !visible) return;
    const dt = time - lastTime;
    if (dt > 16) {
      lastTime = time;
      ctx.clearRect(0, 0, view.width, view.height);

      // Randomly pick a few idle pixels to sparkle
      const sparkleCount = Math.floor(pixels.length * 0.015);
      for (let i = 0; i < sparkleCount; i++) {
        const p = pixels[Math.floor(Math.random() * pixels.length)];
        if (p) {
          p.targetAlpha = Math.random() * 0.55 + 0.15;
          p.color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
        }
      }

      const prox = 42; // radius for pointer glow
      const proxSq = prox * prox;

      for (let i = 0; i < pixels.length; i++) {
        const p = pixels[i];

        if (pointer.isHovered) {
          const dx = p.x - pointer.x;
          const dy = p.y - pointer.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < proxSq) {
            const boost = 1 - distSq / proxSq;
            p.targetAlpha = Math.max(p.targetAlpha, boost * 0.95);
          }
        }

        // Smoothly interpolate alpha towards target
        if (p.alpha < p.targetAlpha) {
          p.alpha = Math.min(p.targetAlpha, p.alpha + p.step);
        } else {
          p.alpha = Math.max(0.04, p.alpha - p.step * 0.4);
        }

        if (Math.abs(p.alpha - p.targetAlpha) < 0.01 && !pointer.isHovered) {
          p.targetAlpha = 0.04 + Math.random() * 0.06;
        }

        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
    }

    raf = win.requestAnimationFrame(frame);
  };

  const wake = (): void => {
    if (raf || !alive || !visible) return;
    raf = win.requestAnimationFrame(frame);
  };

  // The site listens on the container; our layer is pointer-events: none, so
  // listen on the window and test the pointer against the layer's bounds.
  const onPointerLeave = (): void => {
    pointer.isHovered = false;
    pointer.x = -1000;
    pointer.y = -1000;
  };

  const onPointerMove = (event: PointerEvent): void => {
    const rect = root.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (x >= 0 && y >= 0 && x <= rect.width && y <= rect.height) {
      pointer.x = x;
      pointer.y = y;
      pointer.isHovered = true;
    } else {
      onPointerLeave();
    }
  };

  const ResizeCtor = (win as unknown as { ResizeObserver?: typeof ResizeObserver }).ResizeObserver;
  let resizeObserver: ResizeObserver | null = null;
  let onWindowResize: (() => void) | null = null;
  if (typeof ResizeCtor === 'function') {
    resizeObserver = new ResizeCtor(resize);
    resizeObserver.observe(root);
  } else {
    onWindowResize = () => resize();
    win.addEventListener('resize', onWindowResize);
  }

  const VisibilityCtor = (win as unknown as { IntersectionObserver?: typeof IntersectionObserver }).IntersectionObserver;
  let visibility: IntersectionObserver | null = null;
  if (typeof VisibilityCtor === 'function') {
    visibility = new VisibilityCtor(entries => {
      visible = entries.some(entry => entry.isIntersecting);
      if (visible) {
        lastTime = 0;
        wake();
      }
    });
    visibility.observe(root);
  }

  win.addEventListener('pointermove', onPointerMove, { passive: true });
  doc.documentElement.addEventListener('pointerleave', onPointerLeave);
  resize();
  wake();

  const instance: EffectInstance = {
    destroy() {
      alive = false;
      if (raf) win.cancelAnimationFrame(raf);
      raf = 0;
      resizeObserver?.disconnect();
      visibility?.disconnect();
      if (onWindowResize) win.removeEventListener('resize', onWindowResize);
      win.removeEventListener('pointermove', onPointerMove);
      doc.documentElement.removeEventListener('pointerleave', onPointerLeave);
      backdrop.remove();
      canvas.remove();
    },
  };
  return instance;
};
