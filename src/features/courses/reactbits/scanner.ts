/** Scanner — the react-bits background of the same name, ported from React
 *  to a plain mount. A single WebGL2 full-screen ogl pass painting sweeping
 *  chromatic scan bands with grain, scanlines, vignette, and mouse bloom.
 *  Original: react-bits (MIT + Commons Clause, © David H); shader and
 *  animation math kept verbatim. */

import { Mesh, Program, Renderer, Triangle } from 'ogl';
import { canRunEffects, pixelRatio, windowOf } from './shared';
import type { EffectInstance, EffectMount } from './shared';

const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [1, 1, 1];
  return [parseInt(result[1], 16) / 255, parseInt(result[2], 16) / 255, parseInt(result[3], 16) / 255];
};

const directionToFloat = (dir: string): number => (dir === 'horizontal' ? 1.0 : dir === 'diagonal' ? 2.0 : 0.0);

const vertex = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragment = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform float uSpeed;
uniform float uSweepSpeed;
uniform float uSweepWidth;
uniform float uSweepFalloff;
uniform float uScale;
uniform float uFrequency;
uniform float uRipple;
uniform float uBandDensity;
uniform float uLineSharpness;
uniform float uGlow;
uniform float uColorSpread;
uniform float uBrightness;
uniform float uContrast;
uniform float uSoftness;
uniform float uVignette;
uniform float uOpacity;
uniform float uScanline;
uniform float uGrain;
uniform float uGrainIntensity;
uniform float uDirection;
uniform vec2 uMouse;
uniform float uMouseEnabled;
uniform float uMouseRadius;
uniform float uMouseStrength;
uniform float uMouseActive;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
out vec4 fragColor;

const float TAU = 6.2831853;

float signalField(vec2 p, float t) {
  float w = sin(p.x * 1.3 + t * 0.7);
  w += sin(p.y * 1.7 - t * 0.52) * 0.8;
  w += sin((p.x + p.y) * 0.9 + t * 0.91) * 0.6;
  w += sin((p.x - p.y) * 1.53 - t * 0.63) * 0.42;
  return w * 0.35;
}

vec3 palette(float f) {
  f = clamp(f, 0.0, 1.0);
  f = pow(f, uContrast);
  vec3 c = mix(uColor1, uColor2, smoothstep(0.08, 0.6, f));
  return mix(c, uColor3, smoothstep(0.68, 1.0, f));
}

float scanBand(float x, float aa, float sharp) {
  float v = mix(0.5, 0.5 + 0.5 * cos(x * TAU), aa);
  return pow(v, sharp);
}

void main() {
  float aspect = iResolution.x / iResolution.y;
  vec2 uv0 = (gl_FragCoord.xy * 2.0 - iResolution.xy) / iResolution.y;
  vec2 p = uv0 / max(uScale, 0.001);

  float t = iTime * uSpeed;

  float mouseBoost = 0.0;
  if (uMouseEnabled > 0.5) {
    vec2 mUv = vec2((uMouse.x * 2.0 - 1.0) * aspect, uMouse.y * 2.0 - 1.0);
    vec2 md = uv0 - mUv;
    float r = max(uMouseRadius, 0.001);
    mouseBoost = exp(-dot(md, md) / (r * r)) * uMouseStrength * uMouseActive;
  }

  float axis;
  if (uDirection < 0.5) axis = p.y;
  else if (uDirection < 1.5) axis = p.x;
  else axis = (p.x + p.y) * 0.70710678;

  float sig = signalField(p * uFrequency, t);
  float coord = axis + sig * uRipple;

  float phase = coord / max(uSweepWidth, 0.05) - t * uSweepSpeed;
  float sweep = pow(0.5 + 0.5 * cos(phase * TAU), max(uSweepFalloff, 0.1));

  float lc = coord * uBandDensity;
  float aa = 1.0 / (1.0 + uSoftness * fwidth(lc) * 3.0);
  aa = clamp(aa * (1.0 + mouseBoost * 0.6), 0.0, 1.0);

  float bodyBase = clamp(0.5 + 0.5 * sig, 0.0, 1.0);
  float body = bodyBase * bodyBase * uGlow * sweep;

  float sharp = max(uLineSharpness, 0.1);
  float split = uColorSpread * 0.16;
  float fr = clamp(scanBand(lc + split, aa, sharp) * sweep + body, 0.0, 1.0);
  float fg = clamp(scanBand(lc, aa, sharp) * sweep + body, 0.0, 1.0);
  float fb = clamp(scanBand(lc - split, aa, sharp) * sweep + body, 0.0, 1.0);

  vec3 col = vec3(palette(fr).r, palette(fg).g, palette(fb).b);

  float inten = (fr + fg + fb) * 0.3333333 * uBrightness;
  inten *= 1.0 + mouseBoost * 0.9;

  if (uScanline > 0.5) {
    inten *= 1.0 - 0.18 * (0.5 + 0.5 * cos(gl_FragCoord.y * 1.7));
  }

  if (uGrain > 0.5) {
    float g = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)) + iTime) * 43758.5453);
    inten += (g - 0.5) * uGrainIntensity;
  }

  inten *= clamp(1.0 - uVignette * smoothstep(0.55, 1.65, length(uv0)), 0.0, 1.0);
  inten = clamp(inten, 0.0, 1.0);

  float a = clamp(inten * uOpacity, 0.0, 1.0);
  fragColor = vec4(clamp(col, 0.0, 1.0) * a, a);
}
`;

export const mountScanner: EffectMount = (root) => {
  if (!canRunEffects(root)) return null;
  const win = windowOf(root);
  const doc = root.ownerDocument;
  if (!win) return null;

  // Fixed defaults from the original component signature.
  const settings = {
    color1: '#5227FF',
    color2: '#FF9FFC',
    color3: '#FFFFFF',
    speed: 0.5,
    sweepSpeed: 0.25,
    sweepWidth: 1.6,
    sweepFalloff: 6,
    scale: 1.5,
    frequency: 2,
    ripple: 0.22,
    bandDensity: 11,
    lineSharpness: 5.5,
    glow: 0.22,
    scanDirection: 'vertical',
    colorSpread: 0.7,
    brightness: 1.0,
    contrast: 1.15,
    softness: 1.4,
    vignette: 0.45,
    scanline: true,
    grain: true,
    grainIntensity: 0.05,
    opacity: 1.0,
    mouseInteraction: true,
    mouseRadius: 0.5,
    mouseStrength: 0.5
  };

  let renderer: Renderer;
  try {
    renderer = new Renderer({
      canvas: doc.createElement('canvas'),
      webgl: 2,
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      dpr: pixelRatio(win)
    });
  } catch {
    return null;
  }

  const gl = renderer.gl;
  gl.clearColor(0, 0, 0, 0);
  const canvas = gl.canvas;
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.position = 'absolute';
  canvas.style.inset = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  canvas.style.pointerEvents = 'none';
  root.appendChild(canvas);

  const geometry = new Triangle(gl);
  const program = new Program(gl, {
    vertex,
    fragment,
    uniforms: {
      iTime: { value: 0 },
      iResolution: { value: new Float32Array([1, 1]) },
      uSpeed: { value: settings.speed },
      uSweepSpeed: { value: settings.sweepSpeed },
      uSweepWidth: { value: settings.sweepWidth },
      uSweepFalloff: { value: settings.sweepFalloff },
      uScale: { value: settings.scale },
      uFrequency: { value: settings.frequency },
      uRipple: { value: settings.ripple },
      uBandDensity: { value: settings.bandDensity },
      uLineSharpness: { value: settings.lineSharpness },
      uGlow: { value: settings.glow },
      uColorSpread: { value: settings.colorSpread },
      uBrightness: { value: settings.brightness },
      uContrast: { value: settings.contrast },
      uSoftness: { value: settings.softness },
      uVignette: { value: settings.vignette },
      uOpacity: { value: settings.opacity },
      uScanline: { value: settings.scanline ? 1.0 : 0.0 },
      uGrain: { value: settings.grain ? 1.0 : 0.0 },
      uGrainIntensity: { value: settings.grainIntensity },
      uDirection: { value: directionToFloat(settings.scanDirection) },
      uMouse: { value: new Float32Array([0.5, 0.5]) },
      uMouseEnabled: { value: settings.mouseInteraction ? 1.0 : 0.0 },
      uMouseRadius: { value: settings.mouseRadius },
      uMouseStrength: { value: settings.mouseStrength },
      uMouseActive: { value: 0.0 },
      uColor1: { value: new Float32Array(hexToRgb(settings.color1)) },
      uColor2: { value: new Float32Array(hexToRgb(settings.color2)) },
      uColor3: { value: new Float32Array(hexToRgb(settings.color3)) }
    }
  });

  const mesh = new Mesh(gl, { geometry, program });

  let alive = true;
  let raf = 0;
  let visible = true;
  let isPageVisible = !doc.hidden;

  const setSize = (): void => {
    const rect = root.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    renderer.setSize(w, h);
    const res = program.uniforms.iResolution.value as Float32Array;
    res[0] = gl.drawingBufferWidth;
    res[1] = gl.drawingBufferHeight;
    renderer.render({ scene: mesh });
  };

  let currentMouse = [0.5, 0.5];
  let targetMouse = [0.5, 0.5];
  let mouseActive = 0;
  let targetMouseActive = 0;

  const onMouseMove = (e: MouseEvent): void => {
    const rect = root.getBoundingClientRect();
    targetMouse = [
      (e.clientX - rect.left) / Math.max(1, rect.width),
      1.0 - (e.clientY - rect.top) / Math.max(1, rect.height)
    ];
    targetMouseActive = 1;
  };
  const onMouseLeave = (): void => {
    targetMouseActive = 0;
  };

  const t0 = win.performance.now();

  const loop = (t: number): void => {
    if (!alive) return;
    program.uniforms.iTime.value = (t - t0) * 0.001;

    if (!settings.mouseInteraction) {
      targetMouseActive = 0;
    }
    currentMouse[0] += 0.05 * (targetMouse[0] - currentMouse[0]);
    currentMouse[1] += 0.05 * (targetMouse[1] - currentMouse[1]);
    program.uniforms.uMouse.value[0] = currentMouse[0];
    program.uniforms.uMouse.value[1] = currentMouse[1];
    mouseActive += 0.05 * (targetMouseActive - mouseActive);
    program.uniforms.uMouseActive.value = mouseActive;

    renderer.render({ scene: mesh });
    raf = win.requestAnimationFrame(loop);
  };

  const tryStart = (): void => {
    if (visible && isPageVisible && raf === 0) raf = win.requestAnimationFrame(loop);
  };
  const tryStop = (): void => {
    if (raf !== 0) {
      win.cancelAnimationFrame(raf);
      raf = 0;
    }
  };

  const ResizeCtor = (win as unknown as { ResizeObserver?: typeof ResizeObserver }).ResizeObserver;
  let resizeObserver: ResizeObserver | null = null;
  let onWindowResize: (() => void) | null = null;
  if (typeof ResizeCtor === 'function') {
    resizeObserver = new ResizeCtor(setSize);
    resizeObserver.observe(root);
  } else {
    onWindowResize = () => setSize();
    win.addEventListener('resize', onWindowResize);
  }

  const VisibilityCtor = (win as unknown as { IntersectionObserver?: typeof IntersectionObserver }).IntersectionObserver;
  let visibility: IntersectionObserver | null = null;
  if (typeof VisibilityCtor === 'function') {
    visibility = new VisibilityCtor(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        visible = entry.isIntersecting;
        if (visible) tryStart();
        else tryStop();
      },
      { threshold: 0 }
    );
    visibility.observe(root);
  }

  const onVisibility = (): void => {
    isPageVisible = !doc.hidden;
    if (isPageVisible) tryStart();
    else tryStop();
  };

  win.addEventListener('mousemove', onMouseMove, { passive: true });
  doc.documentElement.addEventListener('mouseleave', onMouseLeave);
  doc.addEventListener('visibilitychange', onVisibility);

  setSize();
  tryStart();

  const instance: EffectInstance = {
    destroy() {
      alive = false;
      tryStop();
      resizeObserver?.disconnect();
      visibility?.disconnect();
      if (onWindowResize) win.removeEventListener('resize', onWindowResize);
      doc.removeEventListener('visibilitychange', onVisibility);
      win.removeEventListener('mousemove', onMouseMove);
      doc.documentElement.removeEventListener('mouseleave', onMouseLeave);
      canvas.remove();
      try {
        gl.getExtension('WEBGL_lose_context')?.loseContext();
      } catch { /* context already gone */ }
    }
  };
  return instance;
};
