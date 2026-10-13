/** Strands — the react-bits animation of the same name, ported from React to
 *  a plain mount. Up to twelve glowing sine strands drawn by one full-screen
 *  ogl pass, optionally composited through a glass-lens pass that reads the
 *  scene from a render target. Original: react-bits (MIT + Commons Clause,
 *  © David H); shaders and animation math kept verbatim. */

import { Color, Mesh, Program, Renderer, RenderTarget, Triangle } from 'ogl';
import { canRunEffects, windowOf } from './shared';
import type { EffectInstance, EffectMount } from './shared';

const MAX_STRANDS = 12;
const MAX_COLORS = 8;

const VERT = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAG = `#version 300 es
precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec3 uColors[${MAX_COLORS}];
uniform int uColorCount;
uniform int uStrandCount;
uniform float uSpeed;
uniform float uAmplitude;
uniform float uWaviness;
uniform float uThickness;
uniform float uGlow;
uniform float uTaper;
uniform float uSpread;
uniform float uHueShift;
uniform float uIntensity;
uniform float uOpacity;
uniform float uScale;
uniform float uSaturation;

out vec4 fragColor;

const float PI = 3.14159265;

vec3 spectrum(float t) {
  return 0.5 + 0.5 * cos(2.0 * PI * (t + vec3(0.00, 0.33, 0.67)));
}

vec3 samplePalette(float t) {
  t = fract(t);
  float scaled = t * float(uColorCount);
  int idx = int(floor(scaled));
  float blend = fract(scaled);
  int nextIdx = idx + 1;
  if (nextIdx >= uColorCount) nextIdx = 0;
  return mix(uColors[idx], uColors[nextIdx], blend);
}

vec3 strandColor(float t) {
  if (uColorCount > 0) return samplePalette(t);
  return spectrum(t);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;
  uv /= max(uScale, 0.0001);

  float e = 0.06 + uIntensity * 0.94;
  float env = pow(max(cos(uv.x * PI * 1.3), 0.0), uTaper);

  vec3 col = vec3(0.0);

  for (int i = 0; i < ${MAX_STRANDS}; i++) {
    if (i >= uStrandCount) break;

    float fi = float(i);
    float ph = fi * 1.7 * uSpread;
    float freq = (2.0 + fi * 0.35) * uWaviness;
    float spd = 1.4 + fi * 1.2;

    float tt = uTime * uSpeed;
    float w = sin(uv.x * freq + tt * spd + ph) * 0.60
            + sin(uv.x * freq * 1.1 - tt * spd * 0.7 + ph * 1.7) * 0.40;

    float amp = (0.1 + 0.02 * e) * env * uAmplitude;
    float y = w * amp;

    float d = abs(uv.y - y);
    float thick = (0.001 + 0.05 * e) * (0.35 + env) * uThickness;
    float g = thick / (d + thick * 0.45);
    g = g * g;

    float h = fi / float(uStrandCount) + uv.x * 0.30 + uTime * 0.04 + uHueShift;
    col += strandColor(h) * g * env;
  }

  col *= 0.45 + 0.7 * e;
  col = 1.0 - exp(-col * uGlow);

  float gray = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = max(mix(vec3(gray), col, uSaturation), 0.0);

  float lum = max(max(col.r, col.g), col.b);
  float alpha = clamp(lum, 0.0, 1.0) * uOpacity;

  fragColor = vec4(col * uOpacity, alpha);
}
`;

const GLASS_FRAG = `#version 300 es
precision highp float;

uniform sampler2D uScene;
uniform vec2 uResolution;
uniform float uRadius;
uniform float uRefraction;
uniform float uDispersion;

out vec4 fragColor;

vec2 toUv(vec2 p) {
  return p * (uResolution.y / uResolution) + 0.5;
}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;
  float d = length(p);
  float r = uRadius;

  float edge = fwidth(d) * 1.5;
  float mask = 1.0 - smoothstep(r - edge, r + edge, d);
  if (mask <= 0.0) {
    fragColor = vec4(0.0);
    return;
  }

  // sphere height: 0 at the rim, 1 at the center
  float z = sqrt(max(r * r - d * d, 0.0)) / r;
  float nd = d / r; // 0 at the center, 1 at the rim

  // refraction is confined to a narrow band near the rim; the rest stays undistorted
  vec2 dir = d > 0.0 ? p / d : vec2(0.0);
  float lens = smoothstep(0.85, 1.0, nd) * pow(nd, 6.0);
  vec2 offset = -dir * lens * uRefraction * 0.15;
  vec2 disp = -dir * lens * uDispersion * 0.012;

  vec3 light;
  light.r = texture(uScene, toUv(p + offset - disp)).r;
  light.g = texture(uScene, toUv(p + offset)).g;
  light.b = texture(uScene, toUv(p + offset + disp)).b;

  // neutral fresnel rim (no color tint so the glass stays clear)
  float fres = pow(1.0 - z, 3.0);
  vec3 rim = vec3(1.0) * fres * 0.18;

  // specular highlight from the upper-left
  vec2 lightDir = normalize(vec2(-0.55, 0.6));
  float spec = pow(max(dot(p / max(r, 1e-4), lightDir), 0.0), 6.0);
  spec *= smoothstep(r, r * 0.55, d);

  vec3 emissive = light + rim + vec3(spec) * 0.4;
  float emissiveA = clamp(max(max(emissive.r, emissive.g), emissive.b), 0.0, 1.0);

  // almost clear glass body: only a faint neutral darkening, mostly near the rim
  float bodyA = 0.05 + fres * 0.05;

  // composite emissive light over the clear body (premultiplied)
  float outA = emissiveA + bodyA * (1.0 - emissiveA);
  vec3 outRGB = emissive;

  outRGB *= mask;
  outA *= mask;

  fragColor = vec4(outRGB, outA);
}
`;

const buildPalette = (colors: string[]): number[][] => {
  const filled = colors && colors.length ? colors : ['#ffffff'];
  const padded: number[][] = [];
  for (let i = 0; i < MAX_COLORS; i++) {
    const hex = filled[i] ?? filled[filled.length - 1];
    const c = new Color(hex);
    padded.push([c.r, c.g, c.b]);
  }
  return padded;
};

export const mountStrands: EffectMount = (root) => {
  if (!canRunEffects(root)) return null;
  const win = windowOf(root);
  const doc = root.ownerDocument;
  if (!win) return null;

  // Fixed defaults from the original component signature.
  const settings = {
    colors: ['#FF4242', '#7C3AED', '#06B6D4', '#EAB308'],
    count: 3,
    speed: 0.5,
    amplitude: 1,
    waviness: 1,
    thickness: 0.7,
    glow: 2.6,
    taper: 3,
    spread: 1,
    hueShift: 0,
    intensity: 0.6,
    saturation: 1.5,
    opacity: 1,
    scale: 1.5,
    glass: false,
    refraction: 1,
    dispersion: 1,
    glassSize: 1
  };

  let renderer: Renderer;
  try {
    renderer = new Renderer({
      canvas: doc.createElement('canvas'),
      alpha: true,
      premultipliedAlpha: true,
      antialias: true
    });
  } catch {
    return null;
  }
  const gl = renderer.gl;
  const canvas = gl.canvas;
  gl.clearColor(0, 0, 0, 0);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  canvas.style.backgroundColor = 'transparent';

  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.position = 'absolute';
  canvas.style.inset = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  canvas.style.pointerEvents = 'none';
  root.appendChild(canvas);

  const geometry = new Triangle(gl);
  if (geometry.attributes.uv) {
    delete geometry.attributes.uv;
  }

  const program = new Program(gl, {
    vertex: VERT,
    fragment: FRAG,
    uniforms: {
      uTime: { value: 0 },
      uResolution: { value: [root.offsetWidth, root.offsetHeight] },
      uColors: { value: buildPalette(settings.colors) },
      uColorCount: { value: Math.min(settings.colors.length, MAX_COLORS) },
      uStrandCount: { value: Math.min(settings.count, MAX_STRANDS) },
      uSpeed: { value: settings.speed },
      uAmplitude: { value: settings.amplitude },
      uWaviness: { value: settings.waviness },
      uThickness: { value: settings.thickness },
      uGlow: { value: settings.glow },
      uTaper: { value: settings.taper },
      uSpread: { value: settings.spread },
      uHueShift: { value: settings.hueShift },
      uIntensity: { value: settings.intensity },
      uOpacity: { value: settings.opacity },
      uScale: { value: settings.scale },
      uSaturation: { value: settings.saturation }
    }
  });

  const mesh = new Mesh(gl, { geometry, program });

  const renderTarget = new RenderTarget(gl, {
    width: root.offsetWidth,
    height: root.offsetHeight
  });

  const glassProgram = new Program(gl, {
    vertex: VERT,
    fragment: GLASS_FRAG,
    uniforms: {
      uScene: { value: renderTarget.texture },
      uResolution: { value: [root.offsetWidth, root.offsetHeight] },
      uRadius: { value: 0.46 * settings.glassSize },
      uRefraction: { value: settings.refraction },
      uDispersion: { value: settings.dispersion }
    }
  });
  const glassMesh = new Mesh(gl, { geometry, program: glassProgram });

  let alive = true;
  let raf = 0;

  const resize = (): void => {
    const width = root.offsetWidth;
    const height = root.offsetHeight;
    renderer.setSize(width, height);
    program.uniforms.uResolution.value = [width, height];
    renderTarget.setSize(width, height);
    glassProgram.uniforms.uResolution.value = [width, height];
  };
  win.addEventListener('resize', resize);
  resize();

  const update = (t: number): void => {
    if (!alive) return;
    raf = win.requestAnimationFrame(update);
    program.uniforms.uTime.value = t * 0.001;
    program.uniforms.uColors.value = buildPalette(settings.colors);
    program.uniforms.uColorCount.value = Math.min(settings.colors.length, MAX_COLORS);
    program.uniforms.uStrandCount.value = Math.min(Math.max(Math.round(settings.count), 1), MAX_STRANDS);
    program.uniforms.uSpeed.value = settings.speed;
    program.uniforms.uAmplitude.value = settings.amplitude;
    program.uniforms.uWaviness.value = settings.waviness;
    program.uniforms.uThickness.value = settings.thickness;
    program.uniforms.uGlow.value = settings.glow;
    program.uniforms.uTaper.value = settings.taper;
    program.uniforms.uSpread.value = settings.spread;
    program.uniforms.uHueShift.value = settings.hueShift;
    program.uniforms.uIntensity.value = settings.intensity;
    program.uniforms.uOpacity.value = settings.opacity;
    program.uniforms.uScale.value = settings.scale;
    program.uniforms.uSaturation.value = settings.saturation;

    if (settings.glass) {
      renderer.render({ scene: mesh, target: renderTarget });
      glassProgram.uniforms.uScene.value = renderTarget.texture;
      glassProgram.uniforms.uRefraction.value = settings.refraction;
      glassProgram.uniforms.uDispersion.value = settings.dispersion;
      glassProgram.uniforms.uRadius.value = 0.46 * settings.glassSize;
      renderer.render({ scene: glassMesh });
    } else {
      renderer.render({ scene: mesh });
    }
  };
  raf = win.requestAnimationFrame(update);

  const instance: EffectInstance = {
    destroy() {
      alive = false;
      if (raf) win.cancelAnimationFrame(raf);
      raf = 0;
      win.removeEventListener('resize', resize);
      canvas.remove();
      try {
        gl.getExtension('WEBGL_lose_context')?.loseContext();
      } catch { /* context already gone */ }
    }
  };
  return instance;
};
