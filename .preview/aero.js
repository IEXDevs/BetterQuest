"use strict";
(() => {
  // src/features/courses/reactbits/shared.ts
  function canRunEffects(root) {
    const win = root.ownerDocument.defaultView;
    return Boolean(win && typeof win.requestAnimationFrame === "function");
  }
  function windowOf(root) {
    return root.ownerDocument.defaultView;
  }
  function effectCanvas(root) {
    const canvas = root.ownerDocument.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.position = "absolute";
    canvas.style.inset = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    canvas.style.pointerEvents = "none";
    root.append(canvas);
    return canvas;
  }
  function pixelRatio(win) {
    return Math.min(win.devicePixelRatio || 1, 2);
  }
  function fitCanvas(canvas, root, dpr) {
    const width = Math.max(1, Math.round(root.clientWidth * dpr));
    const height = Math.max(1, Math.round(root.clientHeight * dpr));
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    return { width: Math.max(1, root.clientWidth), height: Math.max(1, root.clientHeight) };
  }
  function abortMount(canvas) {
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    canvas.remove();
    try {
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
    }
    return null;
  }

  // src/features/courses/reactbits/aero-shards.ts
  var FRICTION = 0.15;
  var EASE_FACTOR = 0.02;
  var SHARD_COUNT = 16;
  var SPEED = 10;
  var SLOWDOWN = 5;
  var SHARD_H = 50;
  var SHARD_W = 50;
  var POINTS = 6;
  var POINTS_LENGTH = 25;
  var POINT_MASS = 0.6;
  var ROTATION_SPEED = 0.1;
  var COLORS = ["#00A2FF", "#3B82F6", "#60A5FA", "#7DD3FC", "#93C5FD"];
  var EASING = {
    linear: (t) => t,
    easeInQuad: (t) => t * t,
    easeOutQuad: (t) => t * (2 - t),
    easeInOutQuad: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    easeInOutCubic: (t) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
    easeOutCubic: (t) => --t * t * t + 1,
    easeInOutQuart: (t) => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t,
    easeInOutQuint: (t) => t < 0.5 ? 16 * t ** 5 : 1 + 16 * --t * t * t * t * t,
    easeInCubic: (t) => t * t * t,
    easeOutQuart: (t) => 1 - --t * t * t * t,
    easeInQuart: (t) => t * t * t * t,
    easeInOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
    easeOutSine: (t) => Math.sin(t * Math.PI / 2),
    easeInSine: (t) => 1 - Math.cos(t * Math.PI / 2),
    easeOutExpo: (t) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
    easeInExpo: (t) => t === 0 ? 0 : Math.pow(2, 10 * t - 10),
    easeInOutExpo: (t) => t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
    easeOutCirc: (t) => Math.sqrt(1 - --t * t),
    easeOutBack: (t) => --t * t * t * t * t + 1 + 2.70158 * t * t * t * t + 1.70158 * t * t * t,
    easeInOutCirc: (t) => t < 0.5 ? (1 - Math.sqrt(1 - (2 * t) ** 2)) / 2 : (Math.sqrt(1 - (-2 * t + 2) ** 2) + 1) / 2,
    easeInOutBack: (t) => t < 0.5 ? (2 * t) ** 2 * ((2.5949095 + 1) * 2 * t - 2.5949095) / 2 : ((2 * t - 2) ** 2 * ((2.5949095 + 1) * (t * 2 - 2) + 2.5949095) + 2) / 2,
    easeInBack: (t) => t * t * ((1.70158 + 1) * t - 1.70158),
    easeOutElastic: (t) => t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1,
    easeOutBounce: (t) => {
      const n = 7.5625;
      const d = 2.75;
      if (t < 1 / d) return n * t * t;
      if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
      if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
      return n * (t -= 2.625 / d) * t + 0.984375;
    },
    easeInOutElastic: (t) => t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? -(2 ** (20 * t - 10) * Math.sin((20 * t - 11.125) * (2 * Math.PI / 4.5))) / 2 : 2 ** (-20 * t + 10) * Math.sin((20 * t - 11.125) * (2 * Math.PI / 4.5)) / 2 + 1
  };
  var random = (min, max) => Math.random() * (max - min) + min;
  var mountAeroShards = (root) => {
    if (!canRunEffects(root)) return null;
    const win = windowOf(root);
    const doc = root.ownerDocument;
    if (!win) return null;
    const canvas = effectCanvas(root);
    const ctx = canvas.getContext("2d");
    if (!ctx) return abortMount(canvas);
    const settings = {
      colors: COLORS,
      speed: SPEED,
      easing: "easeOutCirc",
      slowdown: SLOWDOWN,
      fastMovement: true
    };
    const view = { width: 1, height: 1 };
    let shards = [];
    let raf = 0;
    let lastTime = 0;
    let visible = true;
    let alive = true;
    const mouse = { x: 0, y: 0, interactionActive: false };
    let proximity = 0;
    let timeDelta = 0.016;
    let pointerInside = false;
    const easing = EASING[settings.easing] ?? EASING.linear;
    const generatePoints = () => {
      const points = [];
      for (let i = 0; i < POINTS; i++) {
        points.push({
          x: random(0, view.width),
          y: random(0, view.height),
          velocity: { x: random(-2.5, 2.5), y: random(-2.5, 2.5) },
          weight: random(1, 100)
        });
      }
      return points;
    };
    const createShard = (x, y, hueColor) => {
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
          { x, y: y - spreadY * 1.8, velocity: { x: 0, y: 0 } }
        ],
        points: generatePoints(),
        velocityX: random(-2.5, 2.5),
        velocityY: random(-2.5, 2.5),
        rotation: random(0, 360),
        updateRotation: true
      };
    };
    const updatePoint = (point, influence) => {
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
    const updateShardPoints = (shard) => {
      shard.points = shard.points.map((point) => updatePoint(point, 1));
      const oneThird = shard.vertices.length / 3;
      shard.vertices = [
        updatePoint({ x: shard.x - oneThird, y: shard.y + oneThird, velocity: { x: 0, y: 0 } }, 1),
        updatePoint({ x: shard.x + oneThird, y: shard.y + oneThird, velocity: { x: 0, y: 0 } }, 1),
        updatePoint({ x: shard.x, y: shard.y - oneThird * 1.8, velocity: { x: 0, y: 0 } }, 1)
      ];
    };
    const updateShard = (shard, dt) => {
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
    const updateShardVelocity = (shard) => {
      if (!pointerInside) return;
      shard.velocityX *= settings.speed * 0.5;
      shard.velocityY *= settings.speed * 0.5;
    };
    const resolveMouseInteraction = () => {
      if (!mouse.interactionActive) return;
      const prox = proximity;
      const velocityShard = shardSpeed(prox);
      const next = prox * Math.exp(-velocityShard * timeDelta);
      if (next < 1e-3) {
        mouse.interactionActive = false;
        return;
      }
      proximity = next;
      for (const shard of shards) {
        const force = { x: 0, y: 0 };
        for (const point of shard.points) {
          const diffX = point.x - mouse.x;
          const diffY = point.y - mouse.y;
          const distance = Math.sqrt(diffX * diffX + diffY * diffY) || 1;
          force.x += diffX / distance * (diffX * diffX);
          force.y += diffY / distance * (diffY * diffY);
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
    const shardSpeed = (prox) => {
      let sum = 0;
      for (const shard of shards) sum += Math.hypot(shard.velocityX, shard.velocityY) * prox;
      return sum || prox;
    };
    const draw = () => {
      ctx.clearRect(0, 0, view.width, view.height);
      ctx.fillStyle = "rgba(2, 8, 23, 0.5)";
      ctx.fillRect(0, 0, view.width, view.height);
      ctx.save();
      ctx.translate(view.width / 2, view.height / 2);
      for (const shard of shards) {
        const gradient = ctx.createLinearGradient(
          shard.x - shard.vertices[0].x,
          shard.y - shard.vertices[0].y,
          shard.x + shard.vertices[1].x,
          shard.y + shard.vertices[1].y
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
          ctx.rotate(shard.rotation * Math.PI / 180);
          ctx.translate(-shard.x, -shard.y);
        }
      }
      ctx.restore();
    };
    const resize = () => {
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
    const frame = (time) => {
      raf = 0;
      if (!alive || !visible) return;
      const dt = lastTime ? Math.min(0.05, (time - lastTime) / 1e3) : 1 / 60;
      lastTime = time;
      timeDelta = dt;
      draw();
      resolveMouseInteraction();
      for (const shard of shards) updateShard(shard, dt);
      raf = win.requestAnimationFrame(frame);
    };
    const wake = () => {
      if (raf || !alive || !visible) return;
      raf = win.requestAnimationFrame(frame);
    };
    const onPointerLeave = () => {
      pointerInside = false;
      mouse.interactionActive = false;
    };
    const onPointerMove = (event) => {
      const rect = root.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      pointerInside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
      if (!pointerInside) {
        onPointerLeave();
        return;
      }
      mouse.x = x;
      mouse.y = y;
      proximity = Math.hypot(x - view.width / 2, y - view.height / 2);
      mouse.interactionActive = true;
      wake();
    };
    const ResizeCtor = win.ResizeObserver;
    let resizeObserver = null;
    let onWindowResize = null;
    if (typeof ResizeCtor === "function") {
      resizeObserver = new ResizeCtor(resize);
      resizeObserver.observe(root);
    } else {
      onWindowResize = () => resize();
      win.addEventListener("resize", onWindowResize);
    }
    const VisibilityCtor = win.IntersectionObserver;
    let visibility = null;
    if (typeof VisibilityCtor === "function") {
      visibility = new VisibilityCtor((entries) => {
        visible = entries.some((entry) => entry.isIntersecting);
        if (visible) {
          lastTime = 0;
          wake();
        }
      });
      visibility.observe(root);
    }
    win.addEventListener("pointermove", onPointerMove, { passive: true });
    doc.documentElement.addEventListener("pointerleave", onPointerLeave);
    resize();
    wake();
    const instance = {
      destroy() {
        alive = false;
        if (raf) win.cancelAnimationFrame(raf);
        raf = 0;
        resizeObserver?.disconnect();
        visibility?.disconnect();
        if (onWindowResize) win.removeEventListener("resize", onWindowResize);
        win.removeEventListener("pointermove", onPointerMove);
        doc.documentElement.removeEventListener("pointerleave", onPointerLeave);
        canvas.remove();
      }
    };
    return instance;
  };

  // src/features/courses/effects.ts
  var COURSE_EFFECT_CSS = `
  .art-bg {
    position: absolute;
    top: -45%;
    left: -45%;
    width: 190%;
    height: 190%;
    pointer-events: none;
    z-index: 1;
    filter: hue-rotate(var(--fx-hue, 0deg));
  }

  /* LiquidEther \u2014 drifting fluid glow anchored to opposing corners. */
  .fx-ether {
    background:
      radial-gradient(circle at 16% 14%, var(--fx-bright) 0%, transparent 50%),
      radial-gradient(circle at 86% 84%, var(--fx-deep) 0%, transparent 55%),
      radial-gradient(circle at 88% 12%, var(--fx-bright) 0%, transparent 45%),
      radial-gradient(circle at 10% 90%, var(--fx-deep) 0%, transparent 45%),
      linear-gradient(135deg, #0f051d 0%, var(--fx-deep) 100%);
    filter: blur(10px) saturate(1.15) hue-rotate(var(--fx-hue, 0deg));
    animation: bq-fx-ether 10s ease-in-out infinite alternate;
  }

  /* PixelBlast \u2014 pixel-grid shimmer lit from two corners. */
  .fx-pixel {
    background:
      radial-gradient(circle at 20% 18%, var(--fx-bright) 0%, transparent 70%),
      radial-gradient(circle at 82% 86%, var(--fx-deep) 0%, transparent 65%),
      repeating-conic-gradient(from 0deg, var(--fx-deep) 0deg 90deg, #09090d 90deg 180deg),
      linear-gradient(135deg, var(--fx-deep), var(--fx-bright));
    background-size: 100% 100%, 100% 100%, 8px 8px, 100% 100%;
    opacity: .9;
    animation: bq-fx-pixel 4s steps(4) infinite alternate;
  }

  /* MicroSlats \u2014 hairline slats with a passing light sweep. */
  .fx-micro-slats {
    background:
      repeating-linear-gradient(0deg, rgba(255,255,255,.05) 0 1px, transparent 1px 4px),
      repeating-linear-gradient(0deg, var(--fx-deep) 0 2px, #0a0d14 2px 4px);
  }
  .fx-micro-slats::after {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(100deg, transparent 35%, rgba(255,255,255,.18) 50%, transparent 65%);
    animation: bq-fx-slats-sweep 5.5s linear infinite;
  }

  /* Aero Shards \u2014 glassy angular shards drifting corner to corner. */
  .fx-aero-shards {
    background:
      linear-gradient(32deg, transparent 40%, var(--fx-bright) 41% 44%, transparent 45%),
      linear-gradient(-22deg, transparent 52%, var(--fx-paper) 53% 55%, transparent 56%),
      linear-gradient(58deg, transparent 28%, var(--fx-bright) 29% 31%, transparent 32%),
      linear-gradient(160deg, var(--fx-deep), #0b1018 70%);
    opacity: .9;
    animation: bq-fx-shards 9s ease-in-out infinite alternate;
  }

  /* Ghost Fibres \u2014 soft blurred fibre strands swaying. */
  .fx-ghost-fibres {
    background:
      repeating-linear-gradient(85deg, transparent 0 14px, rgba(255,255,255,.10) 14px 15px, transparent 15px 30px),
      repeating-linear-gradient(80deg, transparent 0 22px, var(--fx-bright) 22px 23px, transparent 23px 44px),
      linear-gradient(180deg, var(--fx-deep), #0a0f16);
    filter: blur(1px) hue-rotate(var(--fx-hue, 0deg));
    animation: bq-fx-fibres 8s ease-in-out infinite alternate;
  }

  /* CRT Warp \u2014 scanlines with the tube darkening pushed into the corners. */
  .fx-crt-warp {
    background:
      radial-gradient(ellipse at 50% 45%, transparent 26%, rgba(0,0,0,.62) 52%),
      repeating-linear-gradient(0deg, rgba(0,0,0,.35) 0 1px, transparent 1px 3px),
      linear-gradient(120deg, var(--fx-deep) 60%, var(--fx-bright));
    animation: bq-fx-crt 4s steps(8) infinite;
  }

  /* Scanner \u2014 bright bar sweeping down the surface. */
  .fx-scanner {
    background:
      repeating-linear-gradient(0deg, rgba(255,255,255,.04) 0 1px, transparent 1px 5px),
      linear-gradient(180deg, var(--fx-deep), #080d13);
  }
  .fx-scanner::after {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(180deg, transparent 42%, var(--fx-bright) 50%, transparent 58%);
    background-size: 100% 260%;
    opacity: .55;
    mix-blend-mode: screen;
    animation: bq-fx-scan 3.4s linear infinite;
  }

  /* Light Fall \u2014 rays raining down from the top corners. */
  .fx-light-fall {
    background:
      repeating-linear-gradient(112deg, transparent 0 26px, rgba(255,255,255,.08) 26px 27px, transparent 27px 52px),
      linear-gradient(152deg, var(--fx-bright) -35%, var(--fx-deep) 55%, #07090f 100%);
    animation: bq-fx-fall 7s linear infinite;
  }

  /* Ferrofluid \u2014 spiky liquid metal mound breathing. */
  .fx-ferrofluid {
    background:
      repeating-conic-gradient(from 8deg at 50% 62%, var(--fx-deep) 0deg 2.2deg, transparent 2.2deg 7deg),
      radial-gradient(circle at 50% 62%, var(--fx-bright) 0%, var(--fx-deep) 26%, #05070b 62%);
    animation: bq-fx-ferro 6s ease-in-out infinite alternate;
  }

  /* Line Waves \u2014 rippling parallel lines. */
  .fx-line-waves {
    background:
      repeating-linear-gradient(0deg, transparent 0 12px, rgba(255,255,255,.13) 12px 13px, transparent 13px 26px),
      repeating-linear-gradient(0deg, transparent 0 24px, var(--fx-bright) 24px 25px, transparent 25px 52px),
      linear-gradient(180deg, var(--fx-deep), #080c12);
    filter: blur(.6px) hue-rotate(var(--fx-hue, 0deg));
    animation: bq-fx-waves 9s ease-in-out infinite alternate;
  }

  /* Radar \u2014 range rings under a rotating sweep. */
  .fx-radar {
    background:
      repeating-radial-gradient(circle at 50% 50%, transparent 0 12px, rgba(255,255,255,.10) 12px 13px),
      radial-gradient(circle at 50% 50%, var(--fx-deep), #050a08 75%);
  }
  .fx-radar::after {
    content: ''; position: absolute; inset: 0;
    background: conic-gradient(from 0deg, transparent 0 300deg, var(--fx-bright) 358deg, transparent 360deg);
    opacity: .6;
    mix-blend-mode: screen;
    animation: bq-fx-radar 3.6s linear infinite;
  }

  /* Magic Rings \u2014 concentric rings pulsing outward. */
  .fx-magic-rings {
    background:
      repeating-radial-gradient(circle at 50% 58%, transparent 0 10px, var(--fx-bright) 10px 11px, transparent 11px 22px),
      radial-gradient(circle at 50% 58%, var(--fx-deep), #06070c 70%);
    opacity: .9;
    animation: bq-fx-rings 5s ease-in-out infinite;
  }

  /* Floating Lines \u2014 diagonal lines drifting past. */
  .fx-floating-lines {
    background:
      repeating-linear-gradient(48deg, transparent 0 18px, rgba(255,255,255,.09) 18px 19px, transparent 19px 36px),
      linear-gradient(120deg, var(--fx-deep), #090d14);
    animation: bq-fx-float 10s linear infinite;
  }

  /* Grid Scan \u2014 technical grid with a roaming highlight. */
  .fx-grid-scan {
    background:
      repeating-linear-gradient(0deg, rgba(255,255,255,.08) 0 1px, transparent 1px 22px),
      repeating-linear-gradient(90deg, rgba(255,255,255,.08) 0 1px, transparent 1px 22px),
      linear-gradient(160deg, var(--fx-deep), #070a10);
  }
  .fx-grid-scan::after {
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(45% 60% at 50% 50%, var(--fx-bright) 0%, transparent 70%);
    opacity: .35;
    mix-blend-mode: screen;
    animation: bq-fx-gridscan 6s ease-in-out infinite alternate;
  }

  /* Gradient Blinds \u2014 slatted gradient bands catching light from a corner. */
  .fx-gradient-blinds {
    background:
      linear-gradient(200deg, rgba(255,255,255,.10), transparent 45%),
      repeating-linear-gradient(90deg, var(--fx-deep) 0 10px, var(--fx-bright) 10px 12px, #0a0e15 12px 22px);
    animation: bq-fx-blinds 7s ease-in-out infinite alternate;
  }

  /* Iridescence \u2014 rotating prism shimmer. */
  .fx-iridescence {
    background:
      radial-gradient(circle at 50% 50%, rgba(255,255,255,.14) 0%, transparent 55%),
      conic-gradient(from 0deg at 50% 50%, #f0abfc, #a5b4fc, #7dd3fc, #9ae6c4, #fde68a, #fca5a5, #f0abfc);
    filter: blur(8px) saturate(1.1) hue-rotate(var(--fx-hue, 0deg));
    opacity: .8;
    animation: bq-fx-iris 9s linear infinite;
  }

  /* Letter Glitch \u2014 digital blocks jittering with hue splits. */
  .fx-letter-glitch {
    background:
      repeating-linear-gradient(90deg, rgba(255,255,255,.11) 0 5px, transparent 5px 11px),
      repeating-linear-gradient(0deg, transparent 0 8px, rgba(255,255,255,.06) 8px 9px, transparent 9px 17px),
      linear-gradient(135deg, var(--fx-deep), #08090f);
    animation: bq-fx-glitch .9s steps(3) infinite;
  }

  /* Strands \u2014 braided flowing strands. */
  .fx-strands {
    background:
      repeating-linear-gradient(96deg, transparent 0 20px, var(--fx-bright) 20px 21px, transparent 21px 42px),
      repeating-linear-gradient(84deg, transparent 0 28px, var(--fx-paper) 28px 29px, transparent 29px 60px),
      linear-gradient(160deg, var(--fx-deep), #080b11);
    filter: blur(1px) hue-rotate(var(--fx-hue, 0deg));
    animation: bq-fx-strands 11s ease-in-out infinite alternate;
  }

  /* Per-course phase. Declared after the effect rules so it wins over the zero
   * delay their \`animation\` shorthand sets. */
  .art-bg, .art-bg::after { animation-delay: var(--fx-delay, 0s); }

  @keyframes bq-fx-ether {
    0% { transform: scale(1) rotate(0deg); }
    50% { transform: scale(1.12) rotate(6deg); }
    100% { transform: scale(0.96) rotate(-4deg); }
  }
  @keyframes bq-fx-pixel {
    0% { transform: translate(0, 0); }
    50% { transform: translate(-4px, 4px); }
    100% { transform: translate(4px, -4px); }
  }
  @keyframes bq-fx-slats-sweep {
    0% { transform: translateX(-80%); }
    55% { transform: translateX(80%); }
    100% { transform: translateX(80%); }
  }
  @keyframes bq-fx-shards {
    from { transform: translateY(-3%) rotate(-1.5deg) scale(1.02); }
    to { transform: translateY(3%) rotate(1.5deg) scale(1.08); }
  }
  @keyframes bq-fx-fibres {
    from { background-position: 0 0, 0 0, 0 0; }
    to { background-position: 40px 30px, -30px 24px, 0 0; }
  }
  @keyframes bq-fx-crt {
    0%, 100% { opacity: 1; }
    8% { opacity: .86; }
    10% { opacity: 1; }
    52% { opacity: .92; }
  }
  @keyframes bq-fx-scan {
    from { background-position: 0 -130%; }
    to { background-position: 0 130%; }
  }
  @keyframes bq-fx-fall {
    from { background-position: 0 0, 0 0; }
    to { background-position: 0 220px, 0 0; }
  }
  @keyframes bq-fx-ferro {
    0% { transform: scale(1) rotate(0deg); }
    50% { transform: scale(1.07) rotate(3deg); }
    100% { transform: scale(0.98) rotate(-3deg); }
  }
  @keyframes bq-fx-waves {
    from { background-position: 0 0, 0 0, 0 0; transform: skewY(-1.2deg); }
    to { background-position: 60px 14px, -40px 10px, 0 0; transform: skewY(1.2deg); }
  }
  @keyframes bq-fx-radar {
    to { transform: rotate(360deg); }
  }
  @keyframes bq-fx-rings {
    0% { background-size: 100% 100%; opacity: .5; }
    50% { opacity: 1; }
    100% { background-size: 130% 130%; opacity: .5; }
  }
  @keyframes bq-fx-float {
    from { background-position: 0 0, 0 0; }
    to { background-position: 180px 0, 0 0; }
  }
  @keyframes bq-fx-gridscan {
    from { transform: translateX(-38%); }
    to { transform: translateX(38%); }
  }
  @keyframes bq-fx-blinds {
    from { transform: skewY(-2deg) scale(1.02); }
    to { transform: skewY(2deg) scale(1.08); }
  }
  @keyframes bq-fx-iris {
    to { transform: rotate(360deg) scale(1.12); }
  }
  @keyframes bq-fx-glitch {
    0% { background-position: 0 0, 0 0, 0 0; filter: none; }
    33% { background-position: -7px 3px, 4px -2px, 0 0; filter: hue-rotate(24deg); }
    66% { background-position: 5px -4px, -6px 2px, 0 0; filter: hue-rotate(-20deg); }
    100% { background-position: 0 0, 0 0, 0 0; filter: none; }
  }
  @keyframes bq-fx-strands {
    from { background-position: 0 0, 0 0, 0 0; transform: skewX(-1.5deg); }
    to { background-position: -70px 40px, 50px -30px, 0 0; transform: skewX(1.5deg); }
  }
  @media (prefers-reduced-motion: reduce) {
    .art-bg, .art-bg::after { animation: none !important; }
  }
`;

  // .preview/aero.ts
  var host = document.createElement("div");
  host.style.cssText = "position:absolute;left:20px;top:20px;width:520px;height:118px;overflow:hidden;border-radius:10px";
  var shadow = host.attachShadow({ mode: "open" });
  var style = document.createElement("style");
  style.textContent = `
  *{box-sizing:border-box}
  .fx-layer{position:absolute;top:-45%;left:-45%;width:190%;height:190%;z-index:1;overflow:hidden;pointer-events:none;filter:hue-rotate(var(--fx-hue,0deg))}
` + COURSE_EFFECT_CSS;
  var layer = document.createElement("div");
  layer.className = "fx-layer";
  shadow.append(style, layer);
  document.body.append(host);
  var status = "no-instance";
  try {
    const instance = mountAeroShards(layer);
    if (instance) {
      status = "live";
      window.__aero = instance;
    }
  } catch (error) {
    status = "threw: " + String(error);
  }
  document.title = "aero-shards: " + status;
  document.getElementById("log").textContent = `${status} | canvases=${layer.querySelectorAll("canvas").length}`;
})();
