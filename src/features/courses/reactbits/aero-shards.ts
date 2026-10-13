/** AeroShards — the react-bits background of the same name, ported from React
 *  to a plain mount. Canvas-2D: a handful of glass shards drift across the
 *  surface while their outline points orbit and get pulled toward the pointer.
 *  Original: react-bits (MIT + Commons Clause, © David H); the easing table,
 *  shard physics, and draw order are kept faithful to the original. */

import { abortMount, canRunEffects, effectCanvas, fitCanvas, pixelRatio, windowOf } from './shared';
import type { EffectInstance, EffectMount } from './shared';

const FRICTION = 0.15;
const EASE_FACTOR = 0.02;
const SHARD_COUNT = 16;
const SPEED = 10;
const SLOWDOWN = 5;
const SHARD_H = 50;
const SHARD_W = 50;
const POINTS = 6;
const POINTS_LENGTH = 25;
const POINT_MASS = 0.6;
const ROTATION_SPEED = 0.1;

const COLORS = ['#00A2FF', '#3B82F6', '#60A5FA', '#7DD3FC', '#93C5FD'];

type EasingFunction = (t: number) => number;

const EASING: Record<string, EasingFunction> = {
  linear: t => t,
  easeInQuad: t => t * t,
  easeOutQuad: t => t * (2 - t),
  easeInOutQuad: t => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeInOutCubic: t => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),
  easeOutCubic: t => --t * t * t + 1,
  easeInOutQuart: t => (t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t),
  easeInOutQuint: t => (t < 0.5 ? 16 * t ** 5 : 1 + 16 * --t * t * t * t * t),
  easeInCubic: t => t * t * t,
  easeOutQuart: t => 1 - --t * t * t * t,
  easeInQuart: t => t * t * t * t,
  easeInOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
  easeOutSine: t => Math.sin((t * Math.PI) / 2),
  easeInSine: t => 1 - Math.cos((t * Math.PI) / 2),
  easeOutExpo: t => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  easeInExpo: t => (t === 0 ? 0 : Math.pow(2, 10 * t - 10)),
  easeInOutExpo: t =>
    t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
  easeOutCirc: t => Math.sqrt(1 - --t * t),
  easeOutBack: t => --t * t * t * t * t + 1 + 2.70158 * t * t * t * t + 1.70158 * t * t * t,
  easeInOutCirc: t => (t < 0.5 ? (1 - Math.sqrt(1 - (2 * t) ** 2)) / 2 : (Math.sqrt(1 - (-2 * t + 2) ** 2) + 1) / 2),
  easeInOutBack: t =>
    t < 0.5
      ? ((2 * t) ** 2 * ((2.5949095 + 1) * 2 * t - 2.5949095)) / 2
      : ((2 * t - 2) ** 2 * ((2.5949095 + 1) * (t * 2 - 2) + 2.5949095) + 2) / 2,
  easeInBack: t => t * t * ((1.70158 + 1) * t - 1.70158),
  easeOutElastic: t => (t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
  easeOutBounce: t => {
    const n = 7.5625;
    const d = 2.75;
    if (t < 1 / d) return n * t * t;
    if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
    if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
    return n * (t -= 2.625 / d) * t + 0.984375;
  },
  easeInOutElastic: t =>
    t === 0
      ? 0
      : t === 1
        ? 1
        : t < 0.5
          ? -(2 ** (20 * t - 10) * Math.sin((20 * t - 11.125) * ((2 * Math.PI) / 4.5))) / 2
          : (2 ** (-20 * t + 10) * Math.sin((20 * t - 11.125) * ((2 * Math.PI) / 4.5))) / 2 + 1,
};

interface Point {
  x: number;
  y: number;
  velocity: { x: number; y: number };
  weight?: number;
}

interface Shard {
  x: number;
  y: number;
  hueColor: string;
  speed: number;
  easing: EasingFunction;
  vertices: Point[];
  points: Point[];
  velocityX: number;
  velocityY: number;
  rotation: number;
  updateRotation: boolean;
}

const random = (min: number, max: number): number => Math.random() * (max - min) + min;

export const mountAeroShards: EffectMount = (root) => {
  if (!canRunEffects(root)) return null;
  const win = windowOf(root);
  const doc = root.ownerDocument;
  if (!win) return null;

  const canvas = effectCanvas(root);
  const ctx = canvas.getContext('2d');
  if (!ctx) return abortMount(canvas);

  // Fixed defaults from the original component signature.
  const settings = {
    colors: COLORS,
    speed: SPEED,
    easing: 'easeOutCirc' as const,
    slowdown: SLOWDOWN,
    fastMovement: true,
  };

  const view = { width: 1, height: 1 };
  let shards: Shard[] = [];
  let raf = 0;
  let lastTime = 0;
  let visible = true;
  let alive = true;

  const mouse = { x: 0, y: 0, interactionActive: false };
  let proximity = 0;
  let timeDelta = 0.016;
  let pointerInside = false;

  const easing = EASING[settings.easing] ?? EASING.linear;

  const generatePoints = (): Point[] => {
    const points: Point[] = [];
    for (let i = 0; i < POINTS; i++) {
      points.push({
        x: random(0, view.width),
        y: random(0, view.height),
        velocity: { x: random(-2.5, 2.5), y: random(-2.5, 2.5) },
        weight: random(1, 100),
      });
    }
    return points;
  };

  const createShard = (x: number, y: number, hueColor: string): Shard => {
    const spreadX = random(SHARD_W * 0.4, SHARD_W);
    const spreadY = random(SHARD_H * 0.4, SHARD_H);
    return {
      x,
      y,
      hueColor,
      speed: settings.speed,
      easing,
      // The triangle starts built out: `draw` runs before the first `update`.
      vertices: [
        { x: x - spreadX, y: y + spreadY, velocity: { x: 0, y: 0 } },
        { x: x + spreadX, y: y + spreadY, velocity: { x: 0, y: 0 } },
        { x, y: y - spreadY * 1.8, velocity: { x: 0, y: 0 } },
      ],
      points: generatePoints(),
      velocityX: random(-2.5, 2.5),
      velocityY: random(-2.5, 2.5),
      rotation: random(0, 360),
      updateRotation: true,
    };
  };

  const updatePoint = (point: Point, influence: number): Point => {
    const velocityX = point.velocity.x * influence * random(-1, 1) * EASE_FACTOR;
    const velocityY = point.velocity.y * influence * random(-1, 1) * EASE_FACTOR;
    point.x += velocityX * settings.speed;
    point.y += velocityY * settings.speed;
    const drag = FRICTION * easing(1 / settings.speed);
    point.velocity.x *= drag;
    point.velocity.y *= drag;
    if (point.x > view.width + POINTS_LENGTH) point.x = -POINTS_LENGTH;
    else if (point.x < -POINTS_LENGTH) point.x = view.width + POINTS_LENGTH;
    if (point.y > view.height + POINTS_LENGTH) point.y = -POINTS_LENGTH;
    else if (point.y < -POINTS_LENGTH) point.y = view.height + POINTS_LENGTH;
    return point;
  };

  const updateShardPoints = (shard: Shard): void => {
    shard.points = shard.points.map(point => updatePoint(point, 1));
    const oneThird = shard.vertices.length / 3;
    shard.vertices = [
      updatePoint({ x: shard.x - oneThird, y: shard.y + oneThird, velocity: { x: 0, y: 0 } }, 1),
      updatePoint({ x: shard.x + oneThird, y: shard.y + oneThird, velocity: { x: 0, y: 0 } }, 1),
      updatePoint({ x: shard.x, y: shard.y - oneThird * 1.8, velocity: { x: 0, y: 0 } }, 1),
    ];
  };

  const updateShard = (shard: Shard, dt: number): void => {
    if (settings.fastMovement) {
      shard.velocityX *= easing(dt * settings.speed);
      shard.velocityY *= easing(dt * settings.speed);
    }
    const damp = easing(dt * settings.slowdown);
    if (damp < 1) {
      shard.velocityX *= damp;
      shard.velocityY *= damp;
    }

    shard.x += shard.velocityX * dt * settings.speed;
    shard.y += shard.velocityY * dt * settings.speed;
    if (shard.updateRotation) shard.rotation += ROTATION_SPEED * dt * settings.speed;
    updateShardPoints(shard);
    updateShardVelocity(shard);
  };

  const updateShardVelocity = (shard: Shard): void => {
    if (!pointerInside) return;
    shard.velocityX *= settings.speed * 0.5;
    shard.velocityY *= settings.speed * 0.5;
  };

  /** Pointer attraction: one pass over every shard point, strongest when the
   *  pointer sits near the surface, decaying as the shards gain speed. */
  const resolveMouseInteraction = (): void => {
    if (!mouse.interactionActive) return;
    const prox = proximity;
    const velocityShard = shardSpeed(prox);
    const next = prox * Math.exp(-velocityShard * timeDelta);
    if (next < 0.001) { mouse.interactionActive = false; return; }
    proximity = next;

    for (const shard of shards) {
      const force = { x: 0, y: 0 };
      for (const point of shard.points) {
        const diffX = point.x - mouse.x;
        const diffY = point.y - mouse.y;
        const distance = Math.sqrt(diffX * diffX + diffY * diffY) || 1;
        force.x += (diffX / distance) * (diffX * diffX);
        force.y += (diffY / distance) * (diffY * diffY);
        if (distance < proximity) {
          const falloff = (distance - proximity) / proximity;
          force.x += falloff * diffX;
          force.y += falloff * diffY;
        }
      }
      if (force.x !== 0 && force.y !== 0) {
        const size = POINT_MASS * timeDelta;
        shard.velocityX += force.x / size;
        shard.velocityY += force.y / size;
      }
    }
  };

  const shardSpeed = (prox: number): number => {
    let sum = 0;
    for (const shard of shards) sum += Math.hypot(shard.velocityX, shard.velocityY) * prox;
    return sum || prox;
  };

  const draw = (): void => {
    ctx.clearRect(0, 0, view.width, view.height);
    ctx.fillStyle = 'rgba(2, 8, 23, 0.5)';
    ctx.fillRect(0, 0, view.width, view.height);

    ctx.save();
    ctx.translate(view.width / 2, view.height / 2);
    for (const shard of shards) {
      const gradient = ctx.createLinearGradient(
        shard.x - shard.vertices[0].x, shard.y - shard.vertices[0].y,
        shard.x + shard.vertices[1].x, shard.y + shard.vertices[1].y,
      );
      gradient.addColorStop(0, settings.colors[0]);
      gradient.addColorStop(0.5, shard.hueColor);
      gradient.addColorStop(1, settings.colors[3]);
      ctx.fillStyle = gradient;
      ctx.strokeStyle = gradient;
      ctx.shadowColor = shard.hueColor;
      ctx.shadowBlur = 10;

      ctx.beginPath();
      ctx.moveTo(shard.vertices[0].x, shard.vertices[0].y);
      for (const point of shard.points) ctx.lineTo(point.x, point.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      if (shard.updateRotation) {
        ctx.translate(shard.x, shard.y);
        ctx.rotate((shard.rotation * Math.PI) / 180);
        ctx.translate(-shard.x, -shard.y);
      }
    }
    ctx.restore();
  };

  const resize = (): void => {
    const dpr = pixelRatio(win);
    const size = fitCanvas(canvas, root, dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const reseed = size.width !== view.width || size.height !== view.height;
    view.width = size.width;
    view.height = size.height;
    if (!reseed && shards.length) return;
    shards = [];
    for (let i = 0; i < SHARD_COUNT; i++) {
      shards.push(createShard(random(0, size.width), random(0, size.height), settings.colors[i % settings.colors.length]));
    }
  };

  const frame = (time: number): void => {
    raf = 0;
    if (!alive || !visible) return;
    const dt = lastTime ? Math.min(0.05, (time - lastTime) / 1000) : 1 / 60;
    lastTime = time;
    timeDelta = dt;
    draw();
    resolveMouseInteraction();
    for (const shard of shards) updateShard(shard, dt);
    raf = win.requestAnimationFrame(frame);
  };

  const wake = (): void => {
    if (raf || !alive || !visible) return;
    raf = win.requestAnimationFrame(frame);
  };

  // The layer is pointer-events: none, so the page keeps working and the
  // window listener is bounds-tested against the layer instead.
  const onPointerLeave = (): void => {
    pointerInside = false;
    mouse.interactionActive = false;
  };

  const onPointerMove = (event: PointerEvent): void => {
    const rect = root.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    pointerInside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
    if (!pointerInside) { onPointerLeave(); return; }
    mouse.x = x;
    mouse.y = y;
    proximity = Math.hypot(x - view.width / 2, y - view.height / 2);
    mouse.interactionActive = true;
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
      if (visible) { lastTime = 0; wake(); }
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
      canvas.remove();
    },
  };
  return instance;
};
