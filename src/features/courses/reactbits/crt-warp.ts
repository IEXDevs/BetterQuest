/** CRTWarp — the react-bits background of the same name, ported from the
 *  three.js original to a raw WebGL mount (no `three` dependency, kept light
 *  for the content script). The fragment shader is kept verbatim; three's
 *  orthographic full-screen quad is replaced by a full-screen triangle, and
 *  THREE.Color's sRGB→linear→sRGB round-trip nets out to feeding the sRGB hex
 *  values directly. Original: react-bits (MIT + Commons Clause, © David H). */

import { abortMount, canRunEffects, effectCanvas, fitCanvas, windowOf } from './shared';
import type { EffectInstance, EffectMount } from './shared';

const VERTEX = `
in vec2 aPosition;
out vec2 vUv;

void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const FRAGMENT = `
precision highp float;

varying vec2 vUv;
uniform vec2 uResolution;
uniform float uTime;
uniform vec3 uColor;
uniform vec3 uBackgroundColor;
uniform float uCurvature;
uniform float uScanlineStrength;
uniform float uScanlineFrequency;
uniform float uWaveAmplitude;
uniform float uWaveFrequency;
uniform float uBloom;
uniform float uBloomRadius;
uniform float uNoise;
uniform float uVignette;
uniform float uBrightness;
uniform float uPixelation;
uniform float uRgbShift;
uniform vec2 uPointer;
uniform float uMouseStrength;
uniform float uMouseReact;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

vec2 crtCurve(vec2 uv, float radius) {
  vec2 p = (uv - 0.5) * 2.0;
  float safeRadius = max(radius, 1.415);
  float cornerScale = safeRadius / sqrt(max(safeRadius * safeRadius - 2.0, 0.001));
  p = safeRadius * p / sqrt(max(safeRadius * safeRadius - dot(p, p), 0.001));
  p /= cornerScale;
  return p * 0.5 + 0.5;
}

float referencePlasma(vec2 uv, float t) {
  float frequencyScale = max(uWaveFrequency / 2.2, 0.001);
  uv = (uv - 0.5) * frequencyScale + 0.5;

  float scanline = 0.5 - 0.5 * cos(uv.y * 3.14159265 * uScanlineFrequency);
  scanline = mix(1.0, scanline, uScanlineStrength);

  uv *= vec2(80.0, 24.0);
  uv = ceil(uv);
  uv /= vec2(80.0, 24.0);

  float amplitude = uWaveAmplitude / 0.28;
  float field = 0.0;
  field += 0.7 * sin(0.5 * uv.x + t / 5.0);
  field += 3.0 * sin(1.6 * uv.y + t / 5.0);
  field += sin(10.0 * (uv.y * sin(t / 2.0) + uv.x * cos(t / 5.0)) + t / 2.0);

  float cx = uv.x + 0.5 * sin(t / 2.0);
  float cy = uv.y + 0.5 * cos(t / 4.0);
  field += 0.4 * sin(sqrt(100.0 * cx * cx + 100.0 * cy * cy + 1.0) + t);
  field += 0.9 * sin(sqrt(75.0 * cx * cx + 25.0 * cy * cy + 1.0) + t);
  field -= 1.4 * sin(sqrt(256.0 * cx * cx + 25.0 * cy * cy + 1.0) + t);
  field += 0.3 * sin(0.5 * uv.y + uv.x + sin(t));

  return scanline * floor(3.0 * (0.5 + 0.499 * sin(field * amplitude))) / 3.0;
}

void main() {
  vec2 uv = vUv;
  if (uPixelation > 1.001) {
    vec2 cells = max(uResolution / uPixelation, vec2(1.0));
    uv = (floor(uv * cells) + 0.5) / cells;
  }

  float curveRadius = 1.1 + 0.42 / max(uCurvature, 0.001);
  if (uMouseReact > 0.5) {
    curveRadius *= exp(-uPointer.y * uMouseStrength * 0.4);
  }
  vec2 curvedUv = crtCurve(uv, curveRadius);
  if (uMouseReact > 0.5) {
    curvedUv.x -= uPointer.x * uMouseStrength * 0.035;
  }

  float signal = referencePlasma(curvedUv, uTime);
  float radius = 0.01 * uBloomRadius;
  float glow = signal * 0.2;
  glow += referencePlasma(curvedUv + vec2(radius, 0.0), uTime) * 0.12;
  glow += referencePlasma(curvedUv - vec2(radius, 0.0), uTime) * 0.12;
  glow += referencePlasma(curvedUv + vec2(0.0, radius), uTime) * 0.12;
  glow += referencePlasma(curvedUv - vec2(0.0, radius), uTime) * 0.12;
  glow += referencePlasma(curvedUv + vec2(radius), uTime) * 0.08;
  glow += referencePlasma(curvedUv - vec2(radius), uTime) * 0.08;
  glow += referencePlasma(curvedUv + vec2(radius, -radius), uTime) * 0.08;
  glow += referencePlasma(curvedUv + vec2(-radius, radius), uTime) * 0.08;

  float redSignal = referencePlasma(curvedUv + vec2(uRgbShift, 0.0), uTime);
  float blueSignal = referencePlasma(curvedUv - vec2(uRgbShift, 0.0), uTime);
  vec3 channelSignal = vec3(redSignal, signal, blueSignal);
  vec3 waveColor = uColor * (0.3 + signal * 0.7 + glow * uBloom * 0.65);
  waveColor += (channelSignal - signal) * 0.42;

  float edge = clamp(1.0 - dot(vUv - 0.5, vUv - 0.5) * 2.0, 0.0, 1.0);
  float edgeFade = mix(1.0, smoothstep(0.0, 1.0, edge), uVignette);
  float waveMask = clamp(signal * 0.82 + glow * 0.52, 0.0, 1.0) * edgeFade;

  float grain = hash21(gl_FragCoord.xy + vec2(fract(uTime) * 173.0));
  waveColor = max(waveColor * uBrightness, vec3(0.0));
  vec3 color = mix(uBackgroundColor, waveColor, waveMask);
  color += (grain - 0.5) * uNoise;
  gl_FragColor = vec4(max(color, vec3(0.0)), 1.0);
}
`;

const hexToRgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16) / 255,
  parseInt(hex.slice(3, 5), 16) / 255,
  parseInt(hex.slice(5, 7), 16) / 255,
];

const compile = (gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  gl.deleteShader(shader);
  return null;
};

export const mountCrtWarp: EffectMount = (root) => {
  if (!canRunEffects(root)) return null;
  const win = windowOf(root);
  const doc = root.ownerDocument;
  if (!win) return null;

  const canvas = effectCanvas(root);
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false });
  if (!gl) return abortMount(canvas);

  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) {
    if (program) gl.deleteProgram(program);
    if (vertex) gl.deleteShader(vertex);
    if (fragment) gl.deleteShader(fragment);
    return abortMount(canvas);
  }
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    return abortMount(canvas);
  }
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'aPosition');
  if (position < 0 || !buffer) {
    gl.deleteProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    return abortMount(canvas);
  }
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const names = [
    'uResolution', 'uTime', 'uSpeed', 'uColor', 'uBackgroundColor', 'uCurvature',
    'uScanlineStrength', 'uScanlineFrequency', 'uWaveAmplitude', 'uWaveFrequency',
    'uBloom', 'uBloomRadius', 'uNoise', 'uVignette', 'uBrightness', 'uPixelation',
    'uRgbShift', 'uPointer', 'uMouseStrength', 'uMouseReact',
  ];
  const uniforms: Record<string, WebGLUniformLocation | null> = {};
  for (const name of names) uniforms[name] = gl.getUniformLocation(program, name);

  // Fixed defaults from the original component signature.
  const settings = {
    color: hexToRgb('#c755f7'),
    backgroundColor: hexToRgb('#05010a'),
    speed: 0.5,
    curvature: 0.25,
    scanlineStrength: 0.25,
    scanlineFrequency: 200,
    waveAmplitude: 0.3,
    waveFrequency: 2.5,
    bloom: 1.5,
    bloomRadius: 1,
    noise: 0.1,
    vignette: 0,
    brightness: 1.25,
    pixelation: 1,
    rgbShift: 0.015,
    mouseReact: true,
    mouseStrength: 0.5,
    fps: 30,
    paused: false,
  };

  const view = { width: 1, height: 1 };
  const pointerTarget = { x: 0, y: 0 };
  const pointerCurrent = { x: 0, y: 0 };
  let phase = 0;
  let lastFrame = 0;
  let prev = 0;
  let raf = 0;
  let visible = true;
  let alive = true;

  const render = (): void => {
    const s = settings;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uniforms.uResolution, view.width, view.height);
    gl.uniform1f(uniforms.uTime, phase);
    gl.uniform1f(uniforms.uSpeed, s.speed);
    gl.uniform3f(uniforms.uColor, s.color[0], s.color[1], s.color[2]);
    gl.uniform3f(uniforms.uBackgroundColor, s.backgroundColor[0], s.backgroundColor[1], s.backgroundColor[2]);
    gl.uniform1f(uniforms.uCurvature, s.curvature);
    gl.uniform1f(uniforms.uScanlineStrength, s.scanlineStrength);
    gl.uniform1f(uniforms.uScanlineFrequency, s.scanlineFrequency);
    gl.uniform1f(uniforms.uWaveAmplitude, s.waveAmplitude);
    gl.uniform1f(uniforms.uWaveFrequency, s.waveFrequency);
    gl.uniform1f(uniforms.uBloom, s.bloom);
    gl.uniform1f(uniforms.uBloomRadius, s.bloomRadius);
    gl.uniform1f(uniforms.uNoise, s.noise);
    gl.uniform1f(uniforms.uVignette, s.vignette);
    gl.uniform1f(uniforms.uBrightness, s.brightness);
    gl.uniform1f(uniforms.uPixelation, s.pixelation);
    gl.uniform1f(uniforms.uRgbShift, s.rgbShift);
    gl.uniform2f(uniforms.uPointer, pointerCurrent.x, pointerCurrent.y);
    gl.uniform1f(uniforms.uMouseStrength, s.mouseStrength);
    gl.uniform1f(uniforms.uMouseReact, s.mouseReact ? 1 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const frame = (now: number): void => {
    raf = 0;
    if (!alive) return;
    if (!visible || doc.hidden) {
      raf = win.requestAnimationFrame(frame);
      return;
    }
    const interval = 1000 / settings.fps;
    if (now - lastFrame < interval) {
      raf = win.requestAnimationFrame(frame);
      return;
    }
    lastFrame = now - ((now - lastFrame) % interval);
    // THREE.Clock.getDelta() equivalent, clamped like the original.
    const delta = prev ? Math.min((now - prev) / 1000, 0.1) : 0;
    prev = now;
    if (!settings.paused) phase += delta * settings.speed;
    pointerCurrent.x += (pointerTarget.x - pointerCurrent.x) * 0.08;
    pointerCurrent.y += (pointerTarget.y - pointerCurrent.y) * 0.08;
    render();
    raf = win.requestAnimationFrame(frame);
  };

  const wake = (): void => {
    if (raf || !alive) return;
    raf = win.requestAnimationFrame(frame);
  };

  // The site listens on the container; our layer is pointer-events: none, so
  // listen on the window and test the pointer against the layer's bounds.
  const onPointerLeave = (): void => {
    pointerTarget.x = 0;
    pointerTarget.y = 0;
  };

  const onPointerMove = (event: PointerEvent): void => {
    const rect = root.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1;
    const y = -(((event.clientY - rect.top) / Math.max(rect.height, 1)) * 2 - 1);
    if (x >= -1 && x <= 1 && y >= -1 && y <= 1) {
      pointerTarget.x = x;
      pointerTarget.y = y;
    } else {
      onPointerLeave();
    }
  };

  const resize = (): void => {
    // The original caps the pixel ratio at 1 (low-power renderer).
    const size = fitCanvas(canvas, root, 1);
    view.width = size.width;
    view.height = size.height;
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
      if (visible) wake();
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
      if (buffer) gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      canvas.remove();
    },
  };
  return instance;
};
