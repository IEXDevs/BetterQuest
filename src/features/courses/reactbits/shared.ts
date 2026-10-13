/** Shared plumbing for the react-bits effect ports.
 *
 *  These effects are ports of react-bits (https://reactbits.dev,
 *  github.com/DavidHDev/react-bits), licensed "MIT + Commons Clause".
 *  Original work © David H. Each effect file keeps its original shaders and
 *  animation logic, converted from React components to plain DOM mounting.
 *
 *  Contract for effect modules:
 *    - export `const mountXxx: EffectMount`
 *    - create the canvas via `effectCanvas(root)` (fills the root layer)
 *    - return `null` whenever rendering is impossible (no WebGL, no rAF, …)
 *      so callers keep the CSS fallback art
 *    - `destroy()` must cancel every frame, observer, and listener it made
 */

export interface EffectInstance {
  /** Stops all listeners/observers/frames and removes created DOM nodes. */
  destroy(): void;
}

/** Mounts an effect into `root` — an absolutely-positioned layer sized by the
 *  caller (inset: 0 of the artwork/hero box). Returns null on failure. */
export type EffectMount = (root: HTMLElement) => EffectInstance | null;

/** True when this environment can actually run an effect loop. Callers in
 *  tests (jsdom without animation frames) get `null` instead of a live loop. */
export function canRunEffects(root: HTMLElement): boolean {
  const win = root.ownerDocument.defaultView;
  return Boolean(win && typeof win.requestAnimationFrame === 'function');
}

/** The window for `root`'s document, or null. */
export function windowOf(root: HTMLElement): Window | null {
  return root.ownerDocument.defaultView;
}

/** Creates the effect canvas: absolutely fills `root`, draws above the CSS
 *  fallback art, and never swallows clicks meant for the page. */
export function effectCanvas(root: HTMLElement): HTMLCanvasElement {
  const canvas = root.ownerDocument.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.position = 'absolute';
  canvas.style.inset = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  canvas.style.pointerEvents = 'none';
  root.append(canvas);
  return canvas;
}

/** Device pixel ratio capped at 2 (effects render at CSS size × this). */
export function pixelRatio(win: Window): number {
  return Math.min(win.devicePixelRatio || 1, 2);
}

/** Sizes the canvas backing store to `root`'s CSS box × dpr; returns CSS px. */
export function fitCanvas(canvas: HTMLCanvasElement, root: HTMLElement, dpr: number): { width: number; height: number } {
  const width = Math.max(1, Math.round(root.clientWidth * dpr));
  const height = Math.max(1, Math.round(root.clientHeight * dpr));
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  return { width: Math.max(1, root.clientWidth), height: Math.max(1, root.clientHeight) };
}

/** Cleans up after a partially-built mount: removes the canvas, drops the
 *  context, and tells the caller to keep the CSS fallback. */
export function abortMount(canvas: HTMLCanvasElement): null {
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  canvas.remove();
  try {
    (gl as WebGLRenderingContext | null)?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch { /* context already gone */ }
  return null;
}
