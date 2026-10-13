/** Liquid Ether — canvas-2D background ported from the BetterQuest marketing
 *  site's `LiquidEther` component (web/src/bits/LiquidEther.tsx + .css), which
 *  is itself the authoritative LiquidEther-style look for this effect.
 *  Layered sine/cosine wave ribbons with gradient fills over a drifting blurred
 *  plasma field and a vignette, faithful to the original layers, colors, and
 *  timing constants. react-bits lineage (MIT + Commons Clause, © David H). */

import { abortMount, canRunEffects, effectCanvas, fitCanvas, pixelRatio, windowOf } from './shared';
import type { EffectInstance, EffectMount } from './shared';

const DRIFT_CYCLE = 12; // seconds per direction of the plasma drift keyframes

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

/** Approximates the CSS `ease-in-out` timing function (sine variant). */
const easeInOut = (t: number): number => (1 - Math.cos(Math.PI * clamp(t, 0, 1))) / 2;

export const mountLiquidEther: EffectMount = (root) => {
  if (!canRunEffects(root)) return null;
  const win = windowOf(root);
  const doc = root.ownerDocument;
  if (!win) return null;

  // Fixed defaults from the original component signature.
  const settings = {
    primaryColor: '#9333ea',
    secondaryColor: '#c084fc',
    accentColor: '#e9d5ff',
    waveSpeed: 1,
  };

  const makeLayer = (zIndex: string): HTMLDivElement => {
    const div = doc.createElement('div');
    div.setAttribute('aria-hidden', 'true');
    div.style.position = 'absolute';
    div.style.inset = '0';
    div.style.pointerEvents = 'none';
    div.style.zIndex = zIndex;
    return div;
  };

  // Container background from .liquid-ether-container (opaque dark base).
  const base = makeLayer('0');
  base.style.background = '#0b0318';

  // .liquid-ether-plasma — blurred radial gradients drifting behind the waves.
  const plasma = makeLayer('1');
  plasma.style.inset = '-30%';
  plasma.style.width = '160%';
  plasma.style.height = '160%';
  plasma.style.background =
    'radial-gradient(circle at 30% 25%, rgba(168, 85, 247, 0.55) 0%, transparent 50%),' +
    ' radial-gradient(circle at 75% 70%, rgba(124, 58, 237, 0.45) 0%, transparent 55%),' +
    ' radial-gradient(circle at 50% 85%, rgba(192, 132, 252, 0.35) 0%, transparent 45%)';
  plasma.style.filter = 'blur(28px)';

  root.append(base, plasma);

  const canvas = effectCanvas(root);
  canvas.style.zIndex = '2';
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    base.remove();
    plasma.remove();
    return abortMount(canvas);
  }

  // .liquid-ether-vignette — sits above the canvas in the original stack.
  const vignette = makeLayer('3');
  vignette.style.background =
    'radial-gradient(ellipse at center, transparent 30%, rgba(11, 3, 24, 0.75) 100%),' +
    ' linear-gradient(to top, rgba(11, 3, 24, 0.88) 0%, transparent 65%)';
  root.append(vignette);

  const reduce = win.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const view = { width: 1, height: 1 };
  let t = 0;
  let drift = 0;
  let last = 0;
  let raf = 0;
  let visible = true;
  let alive = true;

  const resize = (): void => {
    const dpr = pixelRatio(win);
    const size = fitCanvas(canvas, root, dpr);
    view.width = size.width;
    view.height = size.height;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const drawWaves = (): void => {
    const { width, height } = view;
    t += 0.016 * settings.waveSpeed;
    if (width <= 0 || height <= 0) return;
    ctx.clearRect(0, 0, width, height);

    // Layered fluid ether wave ribbons (values from the site component).
    const layers = [
      { freq: 0.014, amp: 18, speed: 1.2, alpha: 0.35, color: settings.primaryColor, offset: 0 },
      { freq: 0.022, amp: 24, speed: 0.8, alpha: 0.45, color: settings.secondaryColor, offset: Math.PI / 3 },
      { freq: 0.018, amp: 14, speed: 1.5, alpha: 0.55, color: settings.accentColor, offset: Math.PI / 1.5 },
    ];

    for (const layer of layers) {
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let x = 0; x <= width; x += 4) {
        const y1 = Math.sin(x * layer.freq + t * layer.speed + layer.offset) * layer.amp;
        const y2 = Math.cos(x * layer.freq * 0.7 - t * layer.speed * 0.6) * (layer.amp * 0.6);
        const baseline = height * 0.55;
        ctx.lineTo(x, baseline + y1 + y2);
      }
      ctx.lineTo(width, height);
      ctx.closePath();

      const grad = ctx.createLinearGradient(0, height * 0.3, width, height);
      grad.addColorStop(0, `${layer.color}15`);
      grad.addColorStop(0.5, `${layer.color}60`);
      grad.addColorStop(1, `${layer.color}10`);

      ctx.fillStyle = grad;
      ctx.fill();

      ctx.strokeStyle = `${layer.color}80`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  };

  // Reproduces the `liquid-ether-drift` keyframes (12s ease-in-out alternate,
  // scale 1→1.15→0.95, rotate 0→180→360deg) without needing a <style> tag.
  const updatePlasma = (): void => {
    if (reduce) return;
    const raw = (drift % (DRIFT_CYCLE * 2)) / DRIFT_CYCLE; // 0 → 2, ping-pong
    const p = raw <= 1 ? raw : 2 - raw; // 0 → 1 → 0
    const eased = p < 0.5 ? easeInOut(p / 0.5) / 2 : 0.5 + easeInOut((p - 0.5) / 0.5) / 2;
    let scale: number;
    let rotate: number;
    if (eased < 0.5) {
      const k = eased / 0.5;
      scale = 1 + (1.15 - 1) * k;
      rotate = 180 * k;
    } else {
      const k = (eased - 0.5) / 0.5;
      scale = 1.15 + (0.95 - 1.15) * k;
      rotate = 180 + 180 * k;
    }
    plasma.style.transform = `scale(${scale.toFixed(4)}) rotate(${rotate.toFixed(3)}deg)`;
  };

  const frame = (now: number): void => {
    raf = 0;
    if (!alive || !visible) return;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    drift += dt;
    drawWaves();
    updatePlasma();
    raf = win.requestAnimationFrame(frame);
  };

  const wake = (): void => {
    if (raf || !alive || !visible) return;
    raf = win.requestAnimationFrame(frame);
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
        last = 0;
        wake();
      }
    });
    visibility.observe(root);
  }

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
      base.remove();
      plasma.remove();
      vignette.remove();
      canvas.remove();
    },
  };
  return instance;
};
