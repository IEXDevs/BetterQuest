/** GridScan — the react-bits background of the same name, ported from React
 *  to a plain mount. WebGL2 ray-traced room swept by a scan line, with a
 *  quarter-res bloom chain (downsample + separable blur) composited over the
 *  MRT scene, pointer parallax/hover, and click pings. Original: react-bits
 *  (MIT + Commons Clause, © David H); conversion keeps the shaders and
 *  animation math intact. The optional webcam face-tracking head control of
 *  the original (enableWebcam, default off) is not ported. */

import { abortMount, canRunEffects, effectCanvas, fitCanvas, pixelRatio, windowOf } from './shared';
import type { EffectInstance, EffectMount } from './shared';

const MAX_PINGS = 4;
const PING_LIFE = 2.4;
const INTRO_SECONDS = 2.2;
const EYE_DISTANCE = 1.25;
const STYLES: Record<string, number> = { solid: 0, dashed: 1, dotted: 2 };

const VERTEX = `#version 300 es
out vec2 vUv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const ROOM = `#version 300 es
precision highp float;
precision highp int;
uniform float uAspect;
uniform float uPixel;
uniform vec3 uEye;
uniform float uDepth;
uniform vec3 uCell;
uniform float uThick;
uniform float uDot;
uniform int uStyle;
uniform vec3 uLineColor;
uniform vec3 uScanColor;
uniform vec3 uCoreColor;
uniform float uFade;
uniform float uScanZ;
uniform float uScanDir;
uniform float uScanAlpha;
uniform float uScanWidth;
uniform float uTrail;
uniform float uReveal;
uniform float uPoints;
uniform float uReflect;
uniform float uHaze;
uniform float uShade;
uniform float uLight;
uniform vec4 uPing[4];
uniform float uPingAlpha[4];
uniform vec4 uHover;
uniform float uTime;
in vec2 vUv;
layout(location = 0) out vec4 outColor;
layout(location = 1) out vec4 outGlow;

struct Light {
  float grid;
  float fade;
  float core;
  float trail;
  float spill;
  float ping;
  float wake;
  float reveal;
};

float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

vec2 hash2(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.103, 0.0973));
  q += dot(q, q.yzx + 33.33);
  return fract((q.xx + q.yz) * q.zy);
}

float lines(float across, float along, float period, float dash, float fa, float fb) {
  float u = across / period;
  float du = fa / period;
  float d = abs(fract(u + 0.5) - 0.5) / max(du, 1e-5);
  float dense = smoothstep(0.1, 0.4, du);
  if (uStyle == 2) {
    float c = along / dash * 5.0;
    float dc = fb / dash * 5.0;
    float e = abs(fract(c + 0.5) - 0.5) / max(dc, 1e-5);
    float cov = clamp(uThick + 1.0 - length(vec2(d, e)), 0.0, 1.0);
    float mean = min(1.0, 3.1416 * (uThick + 0.5) * (uThick + 0.5) * du * dc);
    return mix(cov, mean, max(dense, smoothstep(0.1, 0.4, dc)));
  }
  float cov = clamp(uThick + 0.5 - d, 0.0, 1.0);
  float mean = min(1.0, 2.0 * uThick * du);
  if (uStyle == 1) {
    float c = along / dash * 4.0;
    float dc = fb / dash * 4.0;
    float e = abs(fract(c + 0.5) - 0.5);
    float m = clamp((0.25 - e) / max(dc, 1e-5) + 0.5, 0.0, 1.0);
    cov *= mix(m, 0.5, smoothstep(0.1, 0.4, dc));
    mean *= 0.5;
  }
  return mix(cov, mean, dense);
}

float depthFade(float z) {
  float n = clamp(z / uDepth, 0.0, 1.0);
  return mix(1.0, (exp(-3.0 * n) - 0.0497871) / 0.9502129, uFade);
}

vec3 project(vec3 eye, vec3 o, int face, float plane) {
  vec3 d = o - eye;
  float t = face == 0 ? (plane - o.x) / d.x : (face == 1 ? (plane - o.y) / d.y : (plane - o.z) / d.z);
  return o + d * t;
}

void trace(vec3 o, vec3 d, out int face, out float plane, out vec3 h) {
  float sx = d.x > 0.0 ? 0.5 * uAspect : -0.5 * uAspect;
  float sy = d.y > 0.0 ? 0.5 : -0.5;
  float tx = abs(d.x) > 1e-6 ? (sx - o.x) / d.x : 1e9;
  float ty = abs(d.y) > 1e-6 ? (sy - o.y) / d.y : 1e9;
  float t = (uDepth - o.z) / d.z;
  face = 2;
  plane = uDepth;
  if (tx < t) {
    face = 0;
    plane = sx;
    t = tx;
  }
  if (ty < t) {
    face = 1;
    plane = sy;
    t = ty;
  }
  h = o + d * t;
}

vec2 faceUv(vec3 h, int face) {
  if (face == 0) return vec2(h.z, h.y + 0.5);
  if (face == 1) return vec2(h.x + 0.5 * uAspect, h.z);
  return vec2(h.x + 0.5 * uAspect, h.y + 0.5);
}

Light illuminate(vec3 h, int face, vec2 uv, vec2 foot, float blur) {
  Light l;
  vec2 cell = face == 0 ? uCell.zy : (face == 1 ? uCell.xz : uCell.xy);
  vec2 f = foot * blur;
  float minor = max(lines(uv.x, uv.y, cell.x, cell.y, f.x, f.y), lines(uv.y, uv.x, cell.y, cell.x, f.y, f.x));
  float major = max(
    lines(uv.x, uv.y, cell.x * 4.0, cell.y, f.x, f.y),
    lines(uv.y, uv.x, cell.y * 4.0, cell.x, f.y, f.x)
  );
  l.grid = max(minor * 0.75, major) / blur;
  float z = h.z;
  l.fade = depthFade(z);
  l.reveal = smoothstep(uReveal, uReveal - 0.2, z);
  float zFoot = face == 0 ? f.x : (face == 1 ? f.y : 0.0);
  float width = max(uScanWidth, zFoot * 1.1);
  float dz = z - uScanZ;
  l.core = exp(-dz * dz / (width * width)) * (face == 2 ? 0.45 : 1.0) * uScanAlpha;
  float behind = -dz * uScanDir;
  l.trail = exp(-max(behind, 0.0) / uTrail) * smoothstep(-width, width * 0.5, behind) * uScanAlpha;
  l.spill = exp(-dz * dz / 0.05) * uScanAlpha;
  l.ping = 0.0;
  l.wake = 0.0;
  for (int i = 0; i < 4; i++) {
    float alpha = uPingAlpha[i];
    if (alpha <= 0.0) continue;
    float dist = length(h - uPing[i].xyz) - uPing[i].w;
    l.ping += exp(-dist * dist / 0.0012) * alpha;
    l.wake += exp(min(dist, 0.0) / 0.22) * smoothstep(0.03, -0.03, dist) * alpha;
  }
  return l;
}

void over(inout vec4 acc, vec3 color, float alpha) {
  alpha = clamp(alpha, 0.0, 1.0);
  acc = vec4(color * alpha, alpha) + acc * (1.0 - alpha);
}

void paint(inout vec4 color, inout float energy, Light l, float gain, float lift, float hover) {
  float base = l.grid * l.fade * l.reveal * lift;
  float far = l.fade * l.reveal * gain;
  float lit = l.grid * (l.core * 1.2 + l.trail * 0.75 + l.ping * 1.4 + l.wake * 0.5 + hover * 0.5) * far;
  float sheen = (l.core * 0.14 + l.spill * 0.05 + l.trail * 0.03 + l.ping * 0.2 + l.wake * 0.04) * far;
  float laser = (l.core + l.ping * 0.35) * far;
  over(color, uLineColor, base);
  over(color, uScanColor, sheen);
  over(color, uScanColor, lit);
  over(color, uCoreColor, laser * 0.9);
  energy += laser * 0.9 + lit * 0.5;
}

void main() {
  vec3 p = vec3((vUv.x - 0.5) * uAspect, vUv.y - 0.5, 0.0);
  vec3 d = p - uEye;
  int face;
  float plane;
  vec3 h;
  trace(p, d, face, plane, h);
  vec3 hx = project(uEye, p + vec3(uPixel, 0.0, 0.0), face, plane);
  vec3 hy = project(uEye, p + vec3(0.0, uPixel, 0.0), face, plane);
  vec2 uv = faceUv(h, face);
  vec2 ux = faceUv(hx, face) - uv;
  vec2 uy = faceUv(hy, face) - uv;
  vec2 foot = vec2(length(vec2(ux.x, uy.x)), length(vec2(ux.y, uy.y)));
  Light l = illuminate(h, face, uv, foot, 1.0);

  vec4 color = vec4(0.0);
  float energy = 0.0;

  if (uShade > 0.0) {
    vec2 gaps = face == 0
      ? vec2(0.5 - abs(h.y), uDepth - h.z)
      : (face == 1 ? vec2(0.5 * uAspect - abs(h.x), uDepth - h.z) : vec2(0.5 * uAspect - abs(h.x), 0.5 - abs(h.y)));
    vec2 crease = 1.0 - exp(-max(gaps, 0.0) / 0.16);
    float occlusion = crease.x * crease.y;
    float lamp = 1.0 / (1.0 + h.z * h.z * 0.9);
    float tilt = face == 1 ? (plane < 0.0 ? 1.1 : 0.85) : (face == 2 ? 0.8 : 1.0);
    float glowSpill = (l.spill * 0.5 + l.trail * 0.12) * l.reveal * l.fade;
    if (uLight > 0.5) {
      float shadow = (1.0 - lamp * tilt) * 0.09 + (1.0 - occlusion) * 0.2;
      over(color, vec3(0.0), shadow * uShade * l.reveal * l.fade);
    } else {
      over(color, vec3(1.0), lamp * tilt * occlusion * 0.11 * uShade * l.reveal * l.fade);
    }
    over(color, uScanColor, glowSpill * uShade * occlusion * 0.35);
  }

  if (face == 1 && plane < 0.0 && uReflect > 0.0) {
    vec3 mirror = vec3(uEye.x, -1.0 - uEye.y, uEye.z);
    vec3 r = h - mirror;
    int face2;
    float plane2;
    vec3 h2;
    trace(h, r, face2, plane2, h2);
    vec2 uv2 = faceUv(h2, face2);
    vec2 ux2 = faceUv(project(mirror, hx, face2, plane2), face2) - uv2;
    vec2 uy2 = faceUv(project(mirror, hy, face2, plane2), face2) - uv2;
    vec2 foot2 = vec2(length(vec2(ux2.x, uy2.x)), length(vec2(ux2.y, uy2.y)));
    float travel = length(h2 - h);
    Light m = illuminate(h2, face2, uv2, foot2, 1.0 + travel * 4.0);
    m.reveal *= l.reveal;
    float grazing = 1.0 - normalize(r).y;
    float gain = (0.3 + 0.7 * grazing * grazing * grazing * grazing) * uReflect * exp(-travel * 1.1) * (uLight > 0.5 ? 0.6 : 1.0);
    float reflected = 0.0;
    paint(color, reflected, m, gain, 0.0, 0.0);
    energy += reflected * 0.6;
  }

  vec3 near = h - uHover.xyz;
  float hover = exp(-dot(near, near) / 0.08) * uHover.w;
  paint(color, energy, l, 1.0, 1.0, hover);

  if (uPoints > 0.5) {
    vec2 cell = face == 0 ? uCell.zy : (face == 1 ? uCell.xz : uCell.xy);
    vec2 spacing = cell / 2.5;
    vec2 q = uv / spacing;
    vec2 id = floor(q);
    vec2 seed = id + vec2(float(face) * 13.7 + plane * 5.3, float(face) * 3.1);
    vec2 delta = (q - id - (0.2 + 0.6 * hash2(seed))) * spacing;
    float det = ux.x * uy.y - ux.y * uy.x;
    vec2 s = vec2(delta.x * uy.y - delta.y * uy.x, ux.x * delta.y - ux.y * delta.x) / det;
    float radius = uDot * mix(1.0, 0.55, clamp(h.z / uDepth, 0.0, 1.0));
    float spot = clamp(radius + 0.5 - length(s), 0.0, 1.0);
    float gap = min(spacing.x / foot.x, spacing.y / foot.y);
    float r = hash(seed + 7.7);
    float flicker = 0.75 + 0.25 * sin(uTime * (3.0 + r * 5.0) + r * 40.0);
    float dots = spot * smoothstep(5.0, 10.0, gap) * smoothstep(0.25, 0.6, r) * (0.3 + 0.7 * r * r) * flicker;
    float hot = l.core * 2.5 + l.ping * 1.6;
    float warm = l.trail * l.trail * 1.3 + l.wake * 0.6 + hover * 1.3;
    float spark = dots * (hot + warm) * l.fade * l.reveal;
    over(color, mix(uScanColor, uCoreColor, clamp(hot / max(hot + warm, 1e-4), 0.0, 1.0)), spark);
    energy += spark * 0.9;
  }

  if (uHaze > 0.0 && uScanAlpha > 0.0 && uScanZ > 0.0 && h.z > uScanZ) {
    vec3 c = p + d * (uScanZ / d.z);
    float grain = hash(floor(c.xy * 180.0) + floor(uTime * 24.0) * 7.0);
    float edge = min(0.5 * uAspect - abs(c.x), 0.5 - abs(c.y));
    float rim = exp(-edge / 0.06);
    float veil = uHaze * uScanAlpha * (0.45 + 0.9 * grain) * (0.55 + rim * 1.6);
    over(color, uScanColor, veil * depthFade(uScanZ) * l.reveal);
  }

  energy = clamp(energy, 0.0, 1.0);
  outColor = color;
  outGlow = vec4(uScanColor * energy, energy);
}`;

const DOWN = `#version 300 es
precision highp float;
uniform sampler2D uSource;
uniform vec2 uTexel;
in vec2 vUv;
out vec4 outColor;
void main() {
  vec2 o = uTexel;
  outColor = 0.25 * (
    texture(uSource, vUv + vec2(-o.x, -o.y)) +
    texture(uSource, vUv + vec2(o.x, -o.y)) +
    texture(uSource, vUv + vec2(-o.x, o.y)) +
    texture(uSource, vUv + vec2(o.x, o.y))
  );
}`;

const BLUR = `#version 300 es
precision highp float;
uniform sampler2D uSource;
uniform vec2 uStep;
in vec2 vUv;
out vec4 outColor;
void main() {
  vec4 sum = texture(uSource, vUv) * 0.1964825501511404;
  sum += (texture(uSource, vUv + uStep * 1.411764705882353) + texture(uSource, vUv - uStep * 1.411764705882353)) * 0.2969069646728344;
  sum += (texture(uSource, vUv + uStep * 3.2941176470588234) + texture(uSource, vUv - uStep * 3.2941176470588234)) * 0.09447039785044732;
  sum += (texture(uSource, vUv + uStep * 5.176470588235294) + texture(uSource, vUv - uStep * 5.176470588235294)) * 0.010381362401148057;
  outColor = sum;
}`;

const COMPOSITE = `#version 300 es
precision highp float;
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform float uGlow;
in vec2 vUv;
out vec4 outColor;
float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}
void main() {
  vec4 scene = texture(uScene, vUv);
  vec4 bloom = texture(uBloom, vUv) * uGlow;
  bloom.a = min(bloom.a, 1.0);
  bloom.rgb = min(bloom.rgb, vec3(bloom.a));
  vec4 color = scene + bloom * (1.0 - scene.a);
  float noise = (hash(gl_FragCoord.xy) - 0.5) / 255.0;
  color.a = clamp(color.a + noise, 0.0, 1.0);
  color.rgb = clamp(color.rgb + noise, vec3(0.0), vec3(color.a));
  outColor = color;
}`;

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const compile = (gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  gl.deleteShader(shader);
  return null;
};

interface Linked {
  program: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation | null>;
}

const link = (gl: WebGL2RenderingContext, fragmentSource: string): Linked | null => {
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) {
    if (program) gl.deleteProgram(program);
    if (vertex) gl.deleteShader(vertex);
    if (fragment) gl.deleteShader(fragment);
    return null;
  }
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  const uniforms: Record<string, WebGLUniformLocation | null> = {};
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number;
  for (let i = 0; i < count; i++) {
    const info = gl.getActiveUniform(program, i);
    if (!info) continue;
    const name = info.name.replace(/\[0\]$/, '');
    uniforms[name] = gl.getUniformLocation(program, name);
  }
  return { program, uniforms };
};

interface Target { texture: WebGLTexture | null; width: number; height: number }

const createTarget = (gl: WebGL2RenderingContext): Target => {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return { texture, width: 0, height: 0 };
};

const sizeTarget = (gl: WebGL2RenderingContext, target: Target, width: number, height: number): void => {
  if (target.width === width && target.height === height) return;
  target.width = width;
  target.height = height;
  gl.bindTexture(gl.TEXTURE_2D, target.texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
};

export const mountGridScan: EffectMount = (root) => {
  if (!canRunEffects(root)) return null;
  const win = windowOf(root);
  const doc = root.ownerDocument;
  if (!win) return null;

  const canvas = effectCanvas(root);
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
  });
  if (!gl) return abortMount(canvas);

  const room = link(gl, ROOM);
  const down = link(gl, DOWN);
  const blur = link(gl, BLUR);
  const composite = link(gl, COMPOSITE);
  const programs = [room, down, blur, composite];
  if (!room || !down || !blur || !composite) {
    programs.forEach(item => { if (item) gl.deleteProgram(item.program); });
    return abortMount(canvas);
  }
  const vao = gl.createVertexArray();
  const scene = createTarget(gl);
  const light = createTarget(gl);
  const bloomA = createTarget(gl);
  const bloomB = createTarget(gl);
  const sceneBuffer = gl.createFramebuffer();
  const bloomBufferA = gl.createFramebuffer();
  const bloomBufferB = gl.createFramebuffer();
  const targets = [scene, light, bloomA, bloomB];
  const framebuffers = [sceneBuffer, bloomBufferA, bloomBufferB];
  if (!vao || targets.some(target => !target.texture) || framebuffers.some(buffer => !buffer)) {
    targets.forEach(target => { if (target.texture) gl.deleteTexture(target.texture); });
    framebuffers.forEach(buffer => { if (buffer) gl.deleteFramebuffer(buffer); });
    if (vao) gl.deleteVertexArray(vao);
    programs.forEach(item => { if (item) gl.deleteProgram(item.program); });
    return abortMount(canvas);
  }

  const probe = doc.createElement('canvas').getContext('2d', { willReadFrequently: true });
  const colorCache = new Map<string, number[]>();
  const parse = (value: string): number[] => {
    const key = String(value);
    const cached = colorCache.get(key);
    if (cached) return cached;
    let rgb = [1, 1, 1];
    if (probe) {
      probe.clearRect(0, 0, 1, 1);
      probe.fillStyle = '#000000';
      probe.fillStyle = key;
      probe.fillRect(0, 0, 1, 1);
      const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
      rgb = [r / 255, g / 255, b / 255];
    }
    colorCache.set(key, rgb);
    return rgb;
  };

  const reduce = win.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  // Fixed defaults from the original component signature (clamped as clamped there).
  const settings = {
    linesColor: '#4d4757',
    scanColor: '#7dd3fc',
    cells: 8,
    thickness: 1,
    style: STYLES['solid'] ?? 0,
    depth: 3,
    depthFade: 0.6,
    parallax: 1,
    points: true,
    reflection: 0.35,
    shading: 0.7,
    direction: 'forward',
    duration: 2.4,
    delay: 1.6,
    scanWidth: 1,
    trail: 0.5,
    glow: 0.6,
    autoScan: true,
    interactive: true,
    clickEffect: 'ping',
    enableGyro: false,
    intro: true,
    lightMode: false,
  };

  const view = { width: 1, height: 1, ratio: 1 };
  const eye = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, f: EYE_DISTANCE, vf: 0, tf: EYE_DISTANCE };
  const pointer = { x: 0, y: 0, inside: false };
  const look = { x: 0, y: 0, held: false };
  const tilt = { gamma: 0, beta: 0, ready: false, asked: false };
  const hover = { x: 0, y: 0, z: 0, strength: 0, ready: false };
  const scan = { z: 0, dir: 1, alpha: 0, start: 0, sweeps: 0, waiting: false };
  const pings: Array<{ x: number; y: number; z: number; age: number }> = [];
  const pingData = new Float32Array(MAX_PINGS * 4);
  const pingAlpha = new Float32Array(MAX_PINGS);
  let time = 0;
  let introClock = settings.intro && !reduce ? 0 : 1;
  let raf = 0;
  let last = 0;
  let visible = true;
  let alive = true;
  let leaveTimer = 0;

  const roomSize = (): { aspect: number; cx: number; cy: number; roomDepth: number } => {
    const aspect = view.width / view.height;
    const cy = 1 / Math.round(settings.cells);
    const cx = aspect / Math.max(1, Math.round(aspect / cy));
    const roomDepth = Math.max(cy, Math.round(settings.depth / cy) * cy);
    return { aspect, cx, cy, roomDepth };
  };

  const castRay = (u: number, v: number): { x: number; y: number; z: number } => {
    const { aspect, roomDepth } = roomSize();
    const px = (u - 0.5) * aspect;
    const py = v - 0.5;
    const dx = px - eye.x;
    const dy = py - eye.y;
    const dz = eye.f;
    const sx = dx > 0 ? 0.5 * aspect : -0.5 * aspect;
    const sy = dy > 0 ? 0.5 : -0.5;
    let t = roomDepth / dz;
    if (Math.abs(dx) > 1e-6) t = Math.min(t, (sx - px) / dx);
    if (Math.abs(dy) > 1e-6) t = Math.min(t, (sy - py) / dy);
    return { x: px + dx * t, y: py + dy * t, z: dz * t };
  };

  const startSweep = (s: typeof settings): void => {
    scan.dir = s.direction === 'backward' || (s.direction === 'pingpong' && scan.sweeps % 2 === 1) ? -1 : 1;
    scan.start = time;
    scan.waiting = false;
    scan.sweeps += 1;
  };

  const updateScan = (s: typeof settings, roomDepth: number): void => {
    if (introClock < 1) {
      const k = introClock;
      scan.dir = 1;
      scan.z = k * (roomDepth + 0.4) - 0.2;
      scan.alpha = Math.min(1, k * 6) * (1 - Math.max(0, k - 0.85) / 0.15);
      return;
    }
    if (scan.sweeps === 0 && !scan.waiting) {
      scan.waiting = true;
      scan.start = time;
      scan.alpha = 0;
    }
    if (scan.waiting) {
      scan.alpha = 0;
      if (s.autoScan && !reduce && time - scan.start >= s.delay) startSweep(s);
      return;
    }
    const k = (time - scan.start) / s.duration;
    if (k >= 1) {
      scan.waiting = true;
      scan.start = time;
      scan.alpha = 0;
      return;
    }
    const travel = k * (roomDepth + 0.3) - 0.15;
    scan.z = scan.dir > 0 ? travel : roomDepth - travel;
    scan.alpha = Math.min(1, k / 0.12) * Math.min(1, (1 - k) / 0.12);
  };

  const updateEye = (dt: number): void => {
    const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      eye.vx += ((eye.tx - eye.x) * 42 - eye.vx * 11) * h;
      eye.vy += ((eye.ty - eye.y) * 42 - eye.vy * 11) * h;
      eye.vf += ((eye.tf - eye.f) * 42 - eye.vf * 11) * h;
      eye.x += eye.vx * h;
      eye.y += eye.vy * h;
      eye.f += eye.vf * h;
    }
  };

  const setLook = (nx: number, ny: number, held: boolean): void => {
    look.x = clamp(nx, -1, 1);
    look.y = clamp(ny, -1, 1);
    look.held = held;
  };

  const aimEye = (s: typeof settings): void => {
    const aspect = view.width / view.height;
    const drift = reduce ? 0 : 1;
    const nx = look.held ? look.x : (Math.sin(time * 0.21) * 0.2 + Math.sin(time * 0.083 + 1.3) * 0.12) * drift;
    const ny = look.held ? look.y : Math.sin(time * 0.17 + 2.1) * 0.16 * drift;
    eye.tx = nx * s.parallax * 0.22 * aspect;
    eye.ty = ny * s.parallax * 0.22;
  };

  const resize = (): void => {
    if (!alive) return;
    view.ratio = pixelRatio(win);
    const size = fitCanvas(canvas, root, view.ratio);
    view.width = size.width;
    view.height = size.height;
    sizeTarget(gl, scene, canvas.width, canvas.height);
    sizeTarget(gl, light, canvas.width, canvas.height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, sceneBuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, scene.texture, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, light.texture, 0);
    const bw = Math.max(1, Math.round(canvas.width / 4));
    const bh = Math.max(1, Math.round(canvas.height / 4));
    sizeTarget(gl, bloomA, bw, bh);
    sizeTarget(gl, bloomB, bw, bh);
    gl.bindFramebuffer(gl.FRAMEBUFFER, bloomBufferA);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, bloomA.texture, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, bloomBufferB);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, bloomB.texture, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    draw();
    wake();
  };

  const draw = (): void => {
    const s = settings;
    const { aspect, cx, cy, roomDepth } = roomSize();
    const lineRgb = parse(s.linesColor);
    const scanRgb = parse(s.scanColor);
    const coreRgb = s.lightMode ? scanRgb : scanRgb.map(c => c + (1 - c) * 0.65);
    const ru = room.uniforms;
    gl.bindVertexArray(vao);
    gl.disable(gl.BLEND);
    gl.bindFramebuffer(gl.FRAMEBUFFER, sceneBuffer);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(room.program);
    gl.uniform1f(ru.uAspect, aspect);
    gl.uniform1f(ru.uPixel, 1 / canvas.height);
    gl.uniform3f(ru.uEye, eye.x, eye.y, -eye.f);
    gl.uniform1f(ru.uDepth, roomDepth);
    gl.uniform3f(ru.uCell, cx, cy, cy);
    gl.uniform1f(ru.uThick, s.thickness * view.ratio * 0.5);
    gl.uniform1f(ru.uDot, 1.8 * view.ratio);
    gl.uniform1i(ru.uStyle, s.style);
    gl.uniform3fv(ru.uLineColor, lineRgb);
    gl.uniform3fv(ru.uScanColor, scanRgb);
    gl.uniform3fv(ru.uCoreColor, coreRgb);
    gl.uniform1f(ru.uFade, s.depthFade);
    gl.uniform1f(ru.uScanZ, scan.z);
    gl.uniform1f(ru.uScanDir, scan.dir);
    gl.uniform1f(ru.uScanAlpha, scan.alpha);
    gl.uniform1f(ru.uScanWidth, 0.006 * s.scanWidth);
    gl.uniform1f(ru.uTrail, 0.04 + s.trail * 1.1);
    gl.uniform1f(ru.uReveal, introClock < 1 ? scan.z + 0.05 : 1e4);
    gl.uniform1f(ru.uPoints, s.points ? 1 : 0);
    gl.uniform1f(ru.uReflect, s.reflection);
    gl.uniform1f(ru.uHaze, s.lightMode ? 0.03 : 0.05);
    gl.uniform1f(ru.uShade, s.shading);
    gl.uniform1f(ru.uLight, s.lightMode ? 1 : 0);
    gl.uniform4fv(ru.uPing, pingData);
    gl.uniform1fv(ru.uPingAlpha, pingAlpha);
    gl.uniform4f(ru.uHover, hover.x, hover.y, hover.z, hover.strength);
    gl.uniform1f(ru.uTime, time);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    const glowing = s.glow > 0;
    if (glowing) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, bloomBufferA);
      gl.viewport(0, 0, bloomA.width, bloomA.height);
      gl.useProgram(down.program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, light.texture);
      gl.uniform1i(down.uniforms.uSource, 0);
      gl.uniform2f(down.uniforms.uTexel, 1 / light.width, 1 / light.height);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      const spread = (2.2 * view.ratio) / 2;
      gl.useProgram(blur.program);
      gl.uniform1i(blur.uniforms.uSource, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, bloomBufferB);
      gl.bindTexture(gl.TEXTURE_2D, bloomA.texture);
      gl.uniform2f(blur.uniforms.uStep, spread / bloomA.width, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindFramebuffer(gl.FRAMEBUFFER, bloomBufferA);
      gl.bindTexture(gl.TEXTURE_2D, bloomB.texture);
      gl.uniform2f(blur.uniforms.uStep, 0, spread / bloomA.height);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(composite.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, scene.texture);
    gl.uniform1i(composite.uniforms.uScene, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, bloomA.texture);
    gl.uniform1i(composite.uniforms.uBloom, 1);
    gl.uniform1f(composite.uniforms.uGlow, glowing ? s.glow * (s.lightMode ? 0.8 : 1.6) : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.activeTexture(gl.TEXTURE0);
  };

  const frame = (now: number): void => {
    raf = 0;
    if (!alive || !visible || doc.hidden) return;
    const s = settings;
    const dt = last ? clamp((now - last) / 1000, 0.001, 0.05) : 1 / 60;
    last = now;
    time += dt;
    if (introClock < 1) introClock = Math.min(1, introClock + dt / INTRO_SECONDS);
    const { roomDepth } = roomSize();
    updateScan(s, roomDepth);
    aimEye(s);
    updateEye(dt);

    const aim = s.interactive && pointer.inside && !reduce ? 1 : 0;
    if (aim) {
      const target = castRay(pointer.x, pointer.y);
      if (!hover.ready) Object.assign(hover, target, { ready: true });
      const follow = 1 - Math.exp(-dt / 0.08);
      hover.x += (target.x - hover.x) * follow;
      hover.y += (target.y - hover.y) * follow;
      hover.z += (target.z - hover.z) * follow;
    }
    hover.strength += (aim - hover.strength) * (1 - Math.exp(-dt / 0.25));
    if (!aim && hover.strength < 0.01) hover.ready = false;

    for (let i = pings.length - 1; i >= 0; i--) {
      pings[i].age += dt;
      if (pings[i].age > PING_LIFE) pings.splice(i, 1);
    }
    for (let i = 0; i < MAX_PINGS; i++) {
      const ping = pings[i];
      if (!ping) {
        pingAlpha[i] = 0;
        continue;
      }
      const k = ping.age / PING_LIFE;
      pingData.set([ping.x, ping.y, ping.z, ping.age * 1.15], i * 4);
      pingAlpha[i] = Math.min(1, ping.age / 0.05) * (1 - k) * (1 - k);
    }

    draw();

    const settling =
      Math.abs(eye.tx - eye.x) + Math.abs(eye.ty - eye.y) + Math.abs(eye.tf - eye.f) > 1e-4 ||
      Math.abs(eye.vx) + Math.abs(eye.vy) + Math.abs(eye.vf) > 1e-4;
    const busy =
      introClock < 1 ||
      (!reduce && s.autoScan) ||
      !scan.waiting ||
      pings.length > 0 ||
      settling ||
      hover.strength > 0.002 ||
      (!reduce && s.parallax > 0 && !look.held) ||
      (s.points && !reduce && scan.alpha > 0);
    if (busy) raf = win.requestAnimationFrame(frame);
    else last = 0;
  };

  const wake = (): void => {
    if (!alive || raf || !visible || doc.hidden) return;
    raf = win.requestAnimationFrame(frame);
  };

  const locate = (event: PointerEvent): { u: number; v: number; inside: boolean } => {
    const rect = root.getBoundingClientRect();
    const u = (event.clientX - rect.left) / Math.max(1, rect.width);
    const v = 1 - (event.clientY - rect.top) / Math.max(1, rect.height);
    return { u, v, inside: u >= 0 && u <= 1 && v >= 0 && v <= 1 };
  };

  const onPointerMove = (event: PointerEvent): void => {
    const { u, v, inside } = locate(event);
    pointer.x = u;
    pointer.y = v;
    const was = pointer.inside;
    pointer.inside = inside;
    if (inside) {
      win.clearTimeout(leaveTimer);
      leaveTimer = 0;
      if (settings.interactive && !reduce) setLook(u * 2 - 1, v * 2 - 1, true);
      wake();
    } else if (was && !leaveTimer) {
      leaveTimer = win.setTimeout(() => {
        leaveTimer = 0;
        look.held = false;
        wake();
      }, 220);
      wake();
    }
  };

  const onPointerDown = (event: PointerEvent): void => {
    const s = settings;
    const { u, v, inside } = locate(event);
    if (!inside || reduce || s.clickEffect === 'none') return;
    if (s.clickEffect === 'scan') {
      if (introClock >= 1) startSweep(s);
    } else {
      const hit = castRay(u, v);
      pings.unshift({ ...hit, age: 0 });
      if (pings.length > MAX_PINGS) pings.pop();
    }
    wake();
  };

  const onPointerLeave = (): void => {
    pointer.inside = false;
    look.held = false;
    wake();
  };

  const onOrientation = (event: DeviceOrientationEvent): void => {
    const s = settings;
    if (!s.enableGyro || reduce || event.gamma === null || event.beta === null) return;
    if (!tilt.ready) Object.assign(tilt, { gamma: event.gamma, beta: event.beta, ready: true });
    setLook((event.gamma - tilt.gamma) / 25, (event.beta - tilt.beta) / -25, true);
    wake();
  };

  const onClick = (): void => {
    const DeviceOrientationCtor = (win as unknown as { DeviceOrientationEvent?: { requestPermission?: () => Promise<PermissionState> } }).DeviceOrientationEvent;
    const request = DeviceOrientationCtor?.requestPermission;
    if (!settings.enableGyro || tilt.asked || typeof request !== 'function') return;
    tilt.asked = true;
    request.call(DeviceOrientationCtor).catch(() => {});
  };

  const onVisibility = (): void => {
    last = 0;
    wake();
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

  win.addEventListener('pointermove', onPointerMove, { passive: true });
  win.addEventListener('pointerdown', onPointerDown, { passive: true });
  win.addEventListener('deviceorientation', onOrientation);
  win.addEventListener('click', onClick);
  doc.documentElement.addEventListener('pointerleave', onPointerLeave);
  doc.addEventListener('visibilitychange', onVisibility);
  resize();
  wake();

  const instance: EffectInstance = {
    destroy() {
      alive = false;
      if (raf) win.cancelAnimationFrame(raf);
      raf = 0;
      win.clearTimeout(leaveTimer);
      resizeObserver?.disconnect();
      visibility?.disconnect();
      if (onWindowResize) win.removeEventListener('resize', onWindowResize);
      win.removeEventListener('pointermove', onPointerMove);
      win.removeEventListener('pointerdown', onPointerDown);
      win.removeEventListener('deviceorientation', onOrientation);
      win.removeEventListener('click', onClick);
      doc.documentElement.removeEventListener('pointerleave', onPointerLeave);
      doc.removeEventListener('visibilitychange', onVisibility);
      targets.forEach(target => { if (target.texture) gl.deleteTexture(target.texture); });
      framebuffers.forEach(buffer => { if (buffer) gl.deleteFramebuffer(buffer); });
      gl.deleteVertexArray(vao);
      programs.forEach(item => { if (item) gl.deleteProgram(item.program); });
      try {
        gl.getExtension('WEBGL_lose_context')?.loseContext();
      } catch { /* context already gone */ }
      canvas.remove();
    },
  };
  return instance;
};
