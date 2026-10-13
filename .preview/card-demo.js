"use strict";
(() => {
  // src/features/courses/effects.ts
  var COURSE_EFFECTS = [
    "ether",
    "pixel",
    "micro-slats",
    "ghost-fibres",
    "crt-warp",
    "scanner",
    "light-fall",
    "ferrofluid",
    "line-waves",
    "radar",
    "magic-rings",
    "floating-lines",
    "grid-scan",
    "gradient-blinds",
    "iridescence",
    "letter-glitch",
    "strands"
  ];
  function hashOf(code) {
    let hash = 0;
    for (const character of code) hash = hash * 31 + character.charCodeAt(0) >>> 0;
    return hash;
  }
  function courseArtKey(identity4) {
    const code = (identity4.code || "").replace(/\s+/g, "").toUpperCase();
    const unique2 = (identity4.unique || "").replace(/\s+/g, "");
    const department = (identity4.departmentCode || "").replace(/\s+/g, "").toUpperCase();
    return `${code || department || "UT"}#${unique2 || "0"}`;
  }
  function courseEffect(courseKey) {
    return COURSE_EFFECTS[hashOf(courseKey) % COURSE_EFFECTS.length];
  }
  function courseArtMood(courseKey) {
    const hash = hashOf(`mood:${courseKey}`);
    return { hue: -18 + hash % 37, delay: -((hash >>> 9) % 7e3) / 1e3 };
  }
  var PALETTES = {
    M: ["#2e1065", "#a855f7", "#f3e8ff"],
    CS: ["#2457a7", "#58b7db", "#eef7ff"],
    CH: ["#064e3b", "#10b981", "#ecfdf5"],
    BIO: ["#25634d", "#64a881", "#ecf8f1"],
    GOV: ["#722f37", "#c1626a", "#fff0f1"],
    PHY: ["#3d3b8e", "#7a77d9", "#f1f0ff"]
  };
  var SOLID_COLORS = {
    M: "#4c1d95",
    // Rich solid purple
    CS: "#1e3a8a",
    // Deep solid cobalt blue
    CH: "#065f46",
    // Deep solid emerald green
    BIO: "#14532d",
    // Deep solid forest green
    GOV: "#881337",
    // Deep solid burgundy
    PHY: "#312e81"
    // Deep solid indigo
  };
  function solidColor(code) {
    if (SOLID_COLORS[code]) return SOLID_COLORS[code];
    return `hsl(${hashOf(code) % 360} 60% 24%)`;
  }
  function palette(code) {
    if (PALETTES[code]) return PALETTES[code];
    const hue = hashOf(code) % 360;
    return [`hsl(${hue} 58% 32%)`, `hsl(${(hue + 28) % 360} 62% 57%)`, `hsl(${hue} 55% 95%)`];
  }
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

  // src/features/courses/reactbits/shared.ts
  function canRunEffects(root) {
    const win = root.ownerDocument.defaultView;
    if (!win || typeof win.requestAnimationFrame !== "function") return false;
    return !win.navigator.userAgent.includes("jsdom");
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

  // src/features/courses/reactbits/ether.ts
  var DRIFT_CYCLE = 12;
  var clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  var easeInOut = (t) => (1 - Math.cos(Math.PI * clamp(t, 0, 1))) / 2;
  var mountLiquidEther = (root) => {
    if (!canRunEffects(root)) return null;
    const win = windowOf(root);
    const doc = root.ownerDocument;
    if (!win) return null;
    const settings = {
      primaryColor: "#9333ea",
      secondaryColor: "#c084fc",
      accentColor: "#e9d5ff",
      waveSpeed: 1
    };
    const makeLayer = (zIndex) => {
      const div = doc.createElement("div");
      div.setAttribute("aria-hidden", "true");
      div.style.position = "absolute";
      div.style.inset = "0";
      div.style.pointerEvents = "none";
      div.style.zIndex = zIndex;
      return div;
    };
    const base = makeLayer("0");
    base.style.background = "#0b0318";
    const plasma = makeLayer("1");
    plasma.style.inset = "-30%";
    plasma.style.width = "160%";
    plasma.style.height = "160%";
    plasma.style.background = "radial-gradient(circle at 30% 25%, rgba(168, 85, 247, 0.55) 0%, transparent 50%), radial-gradient(circle at 75% 70%, rgba(124, 58, 237, 0.45) 0%, transparent 55%), radial-gradient(circle at 50% 85%, rgba(192, 132, 252, 0.35) 0%, transparent 45%)";
    plasma.style.filter = "blur(28px)";
    root.append(base, plasma);
    const canvas = effectCanvas(root);
    canvas.style.zIndex = "2";
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      base.remove();
      plasma.remove();
      return abortMount(canvas);
    }
    const vignette = makeLayer("3");
    vignette.style.background = "radial-gradient(ellipse at center, transparent 30%, rgba(11, 3, 24, 0.75) 100%), linear-gradient(to top, rgba(11, 3, 24, 0.88) 0%, transparent 65%)";
    root.append(vignette);
    const reduce = win.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const view = { width: 1, height: 1 };
    let t = 0;
    let drift = 0;
    let last = 0;
    let raf = 0;
    let visible = true;
    let alive = true;
    const resize = () => {
      const dpr = pixelRatio(win);
      const size = fitCanvas(canvas, root, dpr);
      view.width = size.width;
      view.height = size.height;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const drawWaves = () => {
      const { width, height } = view;
      t += 0.016 * settings.waveSpeed;
      if (width <= 0 || height <= 0) return;
      ctx.clearRect(0, 0, width, height);
      const layers = [
        { freq: 0.014, amp: 18, speed: 1.2, alpha: 0.35, color: settings.primaryColor, offset: 0 },
        { freq: 0.022, amp: 24, speed: 0.8, alpha: 0.45, color: settings.secondaryColor, offset: Math.PI / 3 },
        { freq: 0.018, amp: 14, speed: 1.5, alpha: 0.55, color: settings.accentColor, offset: Math.PI / 1.5 }
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
    const updatePlasma = () => {
      if (reduce) return;
      const raw = drift % (DRIFT_CYCLE * 2) / DRIFT_CYCLE;
      const p = raw <= 1 ? raw : 2 - raw;
      const eased = p < 0.5 ? easeInOut(p / 0.5) / 2 : 0.5 + easeInOut((p - 0.5) / 0.5) / 2;
      let scale5;
      let rotate3;
      if (eased < 0.5) {
        const k = eased / 0.5;
        scale5 = 1 + (1.15 - 1) * k;
        rotate3 = 180 * k;
      } else {
        const k = (eased - 0.5) / 0.5;
        scale5 = 1.15 + (0.95 - 1.15) * k;
        rotate3 = 180 + 180 * k;
      }
      plasma.style.transform = `scale(${scale5.toFixed(4)}) rotate(${rotate3.toFixed(3)}deg)`;
    };
    const frame = (now) => {
      raf = 0;
      if (!alive || !visible) return;
      const dt = last ? Math.min(0.05, (now - last) / 1e3) : 0;
      last = now;
      drift += dt;
      drawWaves();
      updatePlasma();
      raf = win.requestAnimationFrame(frame);
    };
    const wake = () => {
      if (raf || !alive || !visible) return;
      raf = win.requestAnimationFrame(frame);
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
          last = 0;
          wake();
        }
      });
      visibility.observe(root);
    }
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
        base.remove();
        plasma.remove();
        vignette.remove();
        canvas.remove();
      }
    };
    return instance;
  };

  // src/features/courses/reactbits/pixel.ts
  var VARIANTS = {
    default: ["#18181b", "#27272a", "#3f3f46", "#52525b", "#71717a"],
    blue: ["#082f49", "#0369a1", "#0284c7", "#38bdf8", "#7dd3fc"],
    yellow: ["#422006", "#854d0e", "#ca8a04", "#eab308", "#fef08a"],
    pink: ["#500724", "#9d174d", "#db2777", "#f472b6", "#fbcfe8"],
    emerald: ["#022c22", "#064e3b", "#059669", "#10b981", "#6ee7b7"],
    orange: ["#431407", "#9a3412", "#c2410c", "#f97316", "#fdba74"],
    purple: ["#2e1065", "#581c87", "#7c3aed", "#a855f7", "#d8b4fe"]
  };
  var mountPixelBlast = (root) => {
    if (!canRunEffects(root)) return null;
    const win = windowOf(root);
    const doc = root.ownerDocument;
    if (!win) return null;
    const canvas = effectCanvas(root);
    const ctx = canvas.getContext("2d");
    if (!ctx) return abortMount(canvas);
    const settings = {
      variant: "emerald",
      gap: 5,
      speed: 30,
      colors: void 0
    };
    const backdrop = doc.createElement("div");
    backdrop.setAttribute("aria-hidden", "true");
    backdrop.style.position = "absolute";
    backdrop.style.inset = "0";
    backdrop.style.background = "#09090b";
    backdrop.style.pointerEvents = "none";
    backdrop.style.zIndex = "0";
    root.insertBefore(backdrop, canvas);
    canvas.style.zIndex = "1";
    const colorPalette = settings.colors ? settings.colors.split(",").map((c) => c.trim()) : VARIANTS[settings.variant] ?? VARIANTS.emerald;
    const pointer = { x: -1e3, y: -1e3, isHovered: false };
    const view = { width: 1, height: 1 };
    let pixels = [];
    let raf = 0;
    let visible = true;
    let alive = true;
    const resize = () => {
      const dpr = pixelRatio(win);
      const size = fitCanvas(canvas, root, dpr);
      view.width = size.width;
      view.height = size.height;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
            step: (Math.random() * 0.02 + 0.01) * (settings.speed / 20)
          });
        }
      }
    };
    let lastTime = 0;
    const frame = (time) => {
      raf = 0;
      if (!alive || !visible) return;
      const dt = time - lastTime;
      if (dt > 16) {
        lastTime = time;
        ctx.clearRect(0, 0, view.width, view.height);
        const sparkleCount = Math.floor(pixels.length * 0.015);
        for (let i = 0; i < sparkleCount; i++) {
          const p = pixels[Math.floor(Math.random() * pixels.length)];
          if (p) {
            p.targetAlpha = Math.random() * 0.55 + 0.15;
            p.color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
          }
        }
        const prox = 42;
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
    const wake = () => {
      if (raf || !alive || !visible) return;
      raf = win.requestAnimationFrame(frame);
    };
    const onPointerLeave = () => {
      pointer.isHovered = false;
      pointer.x = -1e3;
      pointer.y = -1e3;
    };
    const onPointerMove = (event) => {
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
        backdrop.remove();
        canvas.remove();
      }
    };
    return instance;
  };

  // node_modules/ogl/src/math/functions/Vec3Func.js
  function length(a) {
    let x = a[0];
    let y = a[1];
    let z = a[2];
    return Math.sqrt(x * x + y * y + z * z);
  }
  function copy(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    return out;
  }
  function set(out, x, y, z) {
    out[0] = x;
    out[1] = y;
    out[2] = z;
    return out;
  }
  function add(out, a, b) {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    out[2] = a[2] + b[2];
    return out;
  }
  function subtract(out, a, b) {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    out[2] = a[2] - b[2];
    return out;
  }
  function multiply(out, a, b) {
    out[0] = a[0] * b[0];
    out[1] = a[1] * b[1];
    out[2] = a[2] * b[2];
    return out;
  }
  function divide(out, a, b) {
    out[0] = a[0] / b[0];
    out[1] = a[1] / b[1];
    out[2] = a[2] / b[2];
    return out;
  }
  function scale(out, a, b) {
    out[0] = a[0] * b;
    out[1] = a[1] * b;
    out[2] = a[2] * b;
    return out;
  }
  function distance(a, b) {
    let x = b[0] - a[0];
    let y = b[1] - a[1];
    let z = b[2] - a[2];
    return Math.sqrt(x * x + y * y + z * z);
  }
  function squaredDistance(a, b) {
    let x = b[0] - a[0];
    let y = b[1] - a[1];
    let z = b[2] - a[2];
    return x * x + y * y + z * z;
  }
  function squaredLength(a) {
    let x = a[0];
    let y = a[1];
    let z = a[2];
    return x * x + y * y + z * z;
  }
  function negate(out, a) {
    out[0] = -a[0];
    out[1] = -a[1];
    out[2] = -a[2];
    return out;
  }
  function inverse(out, a) {
    out[0] = 1 / a[0];
    out[1] = 1 / a[1];
    out[2] = 1 / a[2];
    return out;
  }
  function normalize(out, a) {
    let x = a[0];
    let y = a[1];
    let z = a[2];
    let len = x * x + y * y + z * z;
    if (len > 0) {
      len = 1 / Math.sqrt(len);
    }
    out[0] = a[0] * len;
    out[1] = a[1] * len;
    out[2] = a[2] * len;
    return out;
  }
  function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }
  function cross(out, a, b) {
    let ax = a[0], ay = a[1], az = a[2];
    let bx = b[0], by = b[1], bz = b[2];
    out[0] = ay * bz - az * by;
    out[1] = az * bx - ax * bz;
    out[2] = ax * by - ay * bx;
    return out;
  }
  function lerp(out, a, b, t) {
    let ax = a[0];
    let ay = a[1];
    let az = a[2];
    out[0] = ax + t * (b[0] - ax);
    out[1] = ay + t * (b[1] - ay);
    out[2] = az + t * (b[2] - az);
    return out;
  }
  function smoothLerp(out, a, b, decay, dt) {
    const exp = Math.exp(-decay * dt);
    let ax = a[0];
    let ay = a[1];
    let az = a[2];
    out[0] = b[0] + (ax - b[0]) * exp;
    out[1] = b[1] + (ay - b[1]) * exp;
    out[2] = b[2] + (az - b[2]) * exp;
    return out;
  }
  function transformMat4(out, a, m) {
    let x = a[0], y = a[1], z = a[2];
    let w = m[3] * x + m[7] * y + m[11] * z + m[15];
    w = w || 1;
    out[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
    out[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
    out[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;
    return out;
  }
  function scaleRotateMat4(out, a, m) {
    let x = a[0], y = a[1], z = a[2];
    let w = m[3] * x + m[7] * y + m[11] * z + m[15];
    w = w || 1;
    out[0] = (m[0] * x + m[4] * y + m[8] * z) / w;
    out[1] = (m[1] * x + m[5] * y + m[9] * z) / w;
    out[2] = (m[2] * x + m[6] * y + m[10] * z) / w;
    return out;
  }
  function transformMat3(out, a, m) {
    let x = a[0], y = a[1], z = a[2];
    out[0] = x * m[0] + y * m[3] + z * m[6];
    out[1] = x * m[1] + y * m[4] + z * m[7];
    out[2] = x * m[2] + y * m[5] + z * m[8];
    return out;
  }
  function transformQuat(out, a, q) {
    let x = a[0], y = a[1], z = a[2];
    let qx = q[0], qy = q[1], qz = q[2], qw = q[3];
    let uvx = qy * z - qz * y;
    let uvy = qz * x - qx * z;
    let uvz = qx * y - qy * x;
    let uuvx = qy * uvz - qz * uvy;
    let uuvy = qz * uvx - qx * uvz;
    let uuvz = qx * uvy - qy * uvx;
    let w2 = qw * 2;
    uvx *= w2;
    uvy *= w2;
    uvz *= w2;
    uuvx *= 2;
    uuvy *= 2;
    uuvz *= 2;
    out[0] = x + uvx + uuvx;
    out[1] = y + uvy + uuvy;
    out[2] = z + uvz + uuvz;
    return out;
  }
  var angle = /* @__PURE__ */ (function() {
    const tempA = [0, 0, 0];
    const tempB = [0, 0, 0];
    return function(a, b) {
      copy(tempA, a);
      copy(tempB, b);
      normalize(tempA, tempA);
      normalize(tempB, tempB);
      let cosine = dot(tempA, tempB);
      if (cosine > 1) {
        return 0;
      } else if (cosine < -1) {
        return Math.PI;
      } else {
        return Math.acos(cosine);
      }
    };
  })();
  function exactEquals(a, b) {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
  }

  // node_modules/ogl/src/math/Vec3.js
  var Vec3 = class _Vec3 extends Array {
    constructor(x = 0, y = x, z = x) {
      super(x, y, z);
      return this;
    }
    get x() {
      return this[0];
    }
    get y() {
      return this[1];
    }
    get z() {
      return this[2];
    }
    set x(v) {
      this[0] = v;
    }
    set y(v) {
      this[1] = v;
    }
    set z(v) {
      this[2] = v;
    }
    set(x, y = x, z = x) {
      if (x.length) return this.copy(x);
      set(this, x, y, z);
      return this;
    }
    copy(v) {
      copy(this, v);
      return this;
    }
    add(va, vb) {
      if (vb) add(this, va, vb);
      else add(this, this, va);
      return this;
    }
    sub(va, vb) {
      if (vb) subtract(this, va, vb);
      else subtract(this, this, va);
      return this;
    }
    multiply(v) {
      if (v.length) multiply(this, this, v);
      else scale(this, this, v);
      return this;
    }
    divide(v) {
      if (v.length) divide(this, this, v);
      else scale(this, this, 1 / v);
      return this;
    }
    inverse(v = this) {
      inverse(this, v);
      return this;
    }
    // Can't use 'length' as Array.prototype uses it
    len() {
      return length(this);
    }
    distance(v) {
      if (v) return distance(this, v);
      else return length(this);
    }
    squaredLen() {
      return squaredLength(this);
    }
    squaredDistance(v) {
      if (v) return squaredDistance(this, v);
      else return squaredLength(this);
    }
    negate(v = this) {
      negate(this, v);
      return this;
    }
    cross(va, vb) {
      if (vb) cross(this, va, vb);
      else cross(this, this, va);
      return this;
    }
    scale(v) {
      scale(this, this, v);
      return this;
    }
    normalize() {
      normalize(this, this);
      return this;
    }
    dot(v) {
      return dot(this, v);
    }
    equals(v) {
      return exactEquals(this, v);
    }
    applyMatrix3(mat3) {
      transformMat3(this, this, mat3);
      return this;
    }
    applyMatrix4(mat4) {
      transformMat4(this, this, mat4);
      return this;
    }
    scaleRotateMatrix4(mat4) {
      scaleRotateMat4(this, this, mat4);
      return this;
    }
    applyQuaternion(q) {
      transformQuat(this, this, q);
      return this;
    }
    angle(v) {
      return angle(this, v);
    }
    lerp(v, t) {
      lerp(this, this, v, t);
      return this;
    }
    smoothLerp(v, decay, dt) {
      smoothLerp(this, this, v, decay, dt);
      return this;
    }
    clone() {
      return new _Vec3(this[0], this[1], this[2]);
    }
    fromArray(a, o = 0) {
      this[0] = a[o];
      this[1] = a[o + 1];
      this[2] = a[o + 2];
      return this;
    }
    toArray(a = [], o = 0) {
      a[o] = this[0];
      a[o + 1] = this[1];
      a[o + 2] = this[2];
      return a;
    }
    transformDirection(mat4) {
      const x = this[0];
      const y = this[1];
      const z = this[2];
      this[0] = mat4[0] * x + mat4[4] * y + mat4[8] * z;
      this[1] = mat4[1] * x + mat4[5] * y + mat4[9] * z;
      this[2] = mat4[2] * x + mat4[6] * y + mat4[10] * z;
      return this.normalize();
    }
  };

  // node_modules/ogl/src/core/Geometry.js
  var tempVec3 = /* @__PURE__ */ new Vec3();
  var ID = 1;
  var ATTR_ID = 1;
  var isBoundsWarned = false;
  var Geometry = class {
    constructor(gl, attributes = {}) {
      if (!gl.canvas) console.error("gl not passed as first argument to Geometry");
      this.gl = gl;
      this.attributes = attributes;
      this.id = ID++;
      this.VAOs = {};
      this.drawRange = { start: 0, count: 0 };
      this.instancedCount = 0;
      this.gl.renderer.bindVertexArray(null);
      this.gl.renderer.currentGeometry = null;
      this.glState = this.gl.renderer.state;
      for (let key in attributes) {
        this.addAttribute(key, attributes[key]);
      }
    }
    addAttribute(key, attr) {
      this.attributes[key] = attr;
      attr.id = ATTR_ID++;
      attr.size = attr.size || 1;
      attr.type = attr.type || (attr.data.constructor === Float32Array ? this.gl.FLOAT : attr.data.constructor === Uint16Array ? this.gl.UNSIGNED_SHORT : this.gl.UNSIGNED_INT);
      attr.target = key === "index" ? this.gl.ELEMENT_ARRAY_BUFFER : this.gl.ARRAY_BUFFER;
      attr.normalized = attr.normalized || false;
      attr.stride = attr.stride || 0;
      attr.offset = attr.offset || 0;
      attr.count = attr.count || (attr.stride ? attr.data.byteLength / attr.stride : attr.data.length / attr.size);
      attr.divisor = attr.instanced || 0;
      attr.needsUpdate = false;
      attr.usage = attr.usage || this.gl.STATIC_DRAW;
      if (!attr.buffer) {
        this.updateAttribute(attr);
      }
      if (attr.divisor) {
        this.isInstanced = true;
        if (this.instancedCount && this.instancedCount !== attr.count * attr.divisor) {
          console.warn("geometry has multiple instanced buffers of different length");
          return this.instancedCount = Math.min(this.instancedCount, attr.count * attr.divisor);
        }
        this.instancedCount = attr.count * attr.divisor;
      } else if (key === "index") {
        this.drawRange.count = attr.count;
      } else if (!this.attributes.index) {
        this.drawRange.count = Math.max(this.drawRange.count, attr.count);
      }
    }
    updateAttribute(attr) {
      const isNewBuffer = !attr.buffer;
      if (isNewBuffer) attr.buffer = this.gl.createBuffer();
      if (this.glState.boundBuffer !== attr.buffer) {
        this.gl.bindBuffer(attr.target, attr.buffer);
        this.glState.boundBuffer = attr.buffer;
      }
      if (isNewBuffer) {
        this.gl.bufferData(attr.target, attr.data, attr.usage);
      } else {
        this.gl.bufferSubData(attr.target, 0, attr.data);
      }
      attr.needsUpdate = false;
    }
    setIndex(value) {
      this.addAttribute("index", value);
    }
    setDrawRange(start, count) {
      this.drawRange.start = start;
      this.drawRange.count = count;
    }
    setInstancedCount(value) {
      this.instancedCount = value;
    }
    createVAO(program) {
      this.VAOs[program.attributeOrder] = this.gl.renderer.createVertexArray();
      this.gl.renderer.bindVertexArray(this.VAOs[program.attributeOrder]);
      this.bindAttributes(program);
    }
    bindAttributes(program) {
      program.attributeLocations.forEach((location, { name, type }) => {
        if (!this.attributes[name]) {
          console.warn(`active attribute ${name} not being supplied`);
          return;
        }
        const attr = this.attributes[name];
        this.gl.bindBuffer(attr.target, attr.buffer);
        this.glState.boundBuffer = attr.buffer;
        let numLoc = 1;
        if (type === 35674) numLoc = 2;
        if (type === 35675) numLoc = 3;
        if (type === 35676) numLoc = 4;
        const size = attr.size / numLoc;
        const stride = numLoc === 1 ? 0 : numLoc * numLoc * 4;
        const offset = numLoc === 1 ? 0 : numLoc * 4;
        for (let i = 0; i < numLoc; i++) {
          this.gl.vertexAttribPointer(location + i, size, attr.type, attr.normalized, attr.stride + stride, attr.offset + i * offset);
          this.gl.enableVertexAttribArray(location + i);
          this.gl.renderer.vertexAttribDivisor(location + i, attr.divisor);
        }
      });
      if (this.attributes.index) this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.attributes.index.buffer);
    }
    draw({ program, mode = this.gl.TRIANGLES }) {
      if (this.gl.renderer.currentGeometry !== `${this.id}_${program.attributeOrder}`) {
        if (!this.VAOs[program.attributeOrder]) this.createVAO(program);
        this.gl.renderer.bindVertexArray(this.VAOs[program.attributeOrder]);
        this.gl.renderer.currentGeometry = `${this.id}_${program.attributeOrder}`;
      }
      program.attributeLocations.forEach((location, { name }) => {
        const attr = this.attributes[name];
        if (attr.needsUpdate) this.updateAttribute(attr);
      });
      let indexBytesPerElement = 2;
      if (this.attributes.index?.type === this.gl.UNSIGNED_INT) indexBytesPerElement = 4;
      if (this.isInstanced) {
        if (this.attributes.index) {
          this.gl.renderer.drawElementsInstanced(
            mode,
            this.drawRange.count,
            this.attributes.index.type,
            this.attributes.index.offset + this.drawRange.start * indexBytesPerElement,
            this.instancedCount
          );
        } else {
          this.gl.renderer.drawArraysInstanced(mode, this.drawRange.start, this.drawRange.count, this.instancedCount);
        }
      } else {
        if (this.attributes.index) {
          this.gl.drawElements(
            mode,
            this.drawRange.count,
            this.attributes.index.type,
            this.attributes.index.offset + this.drawRange.start * indexBytesPerElement
          );
        } else {
          this.gl.drawArrays(mode, this.drawRange.start, this.drawRange.count);
        }
      }
    }
    getPosition() {
      const attr = this.attributes.position;
      if (attr.data) return attr;
      if (isBoundsWarned) return;
      console.warn("No position buffer data found to compute bounds");
      return isBoundsWarned = true;
    }
    computeBoundingBox(attr) {
      if (!attr) attr = this.getPosition();
      const array2 = attr.data;
      const stride = attr.size;
      if (!this.bounds) {
        this.bounds = {
          min: new Vec3(),
          max: new Vec3(),
          center: new Vec3(),
          scale: new Vec3(),
          radius: Infinity
        };
      }
      const min = this.bounds.min;
      const max = this.bounds.max;
      const center = this.bounds.center;
      const scale5 = this.bounds.scale;
      min.set(Infinity);
      max.set(-Infinity);
      for (let i = 0, l = array2.length; i < l; i += stride) {
        const x = array2[i];
        const y = array2[i + 1];
        const z = array2[i + 2];
        min.x = Math.min(x, min.x);
        min.y = Math.min(y, min.y);
        min.z = Math.min(z, min.z);
        max.x = Math.max(x, max.x);
        max.y = Math.max(y, max.y);
        max.z = Math.max(z, max.z);
      }
      scale5.sub(max, min);
      center.add(min, max).divide(2);
    }
    computeBoundingSphere(attr) {
      if (!attr) attr = this.getPosition();
      const array2 = attr.data;
      const stride = attr.size;
      if (!this.bounds) this.computeBoundingBox(attr);
      let maxRadiusSq = 0;
      for (let i = 0, l = array2.length; i < l; i += stride) {
        tempVec3.fromArray(array2, i);
        maxRadiusSq = Math.max(maxRadiusSq, this.bounds.center.squaredDistance(tempVec3));
      }
      this.bounds.radius = Math.sqrt(maxRadiusSq);
    }
    remove() {
      for (let key in this.VAOs) {
        this.gl.renderer.deleteVertexArray(this.VAOs[key]);
        delete this.VAOs[key];
      }
      for (let key in this.attributes) {
        this.gl.deleteBuffer(this.attributes[key].buffer);
        delete this.attributes[key];
      }
    }
  };

  // node_modules/ogl/src/core/Program.js
  var ID2 = 1;
  var arrayCacheF32 = {};
  var Program = class {
    constructor(gl, {
      vertex: vertex2,
      fragment: fragment2,
      uniforms = {},
      transparent = false,
      cullFace = gl.BACK,
      frontFace = gl.CCW,
      depthTest = true,
      depthWrite = true,
      depthFunc = gl.LEQUAL
    } = {}) {
      if (!gl.canvas) console.error("gl not passed as first argument to Program");
      this.gl = gl;
      this.uniforms = uniforms;
      this.id = ID2++;
      if (!vertex2) console.warn("vertex shader not supplied");
      if (!fragment2) console.warn("fragment shader not supplied");
      this.transparent = transparent;
      this.cullFace = cullFace;
      this.frontFace = frontFace;
      this.depthTest = depthTest;
      this.depthWrite = depthWrite;
      this.depthFunc = depthFunc;
      this.blendFunc = {};
      this.blendEquation = {};
      this.stencilFunc = {};
      this.stencilOp = {};
      if (this.transparent && !this.blendFunc.src) {
        if (this.gl.renderer.premultipliedAlpha) this.setBlendFunc(this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA);
        else this.setBlendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
      }
      this.vertexShader = gl.createShader(gl.VERTEX_SHADER);
      this.fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
      this.program = gl.createProgram();
      gl.attachShader(this.program, this.vertexShader);
      gl.attachShader(this.program, this.fragmentShader);
      this.setShaders({ vertex: vertex2, fragment: fragment2 });
    }
    setShaders({ vertex: vertex2, fragment: fragment2 }) {
      if (vertex2) {
        this.gl.shaderSource(this.vertexShader, vertex2);
        this.gl.compileShader(this.vertexShader);
        if (this.gl.getShaderInfoLog(this.vertexShader) !== "") {
          console.warn(`${this.gl.getShaderInfoLog(this.vertexShader)}
Vertex Shader
${addLineNumbers(vertex2)}`);
        }
      }
      if (fragment2) {
        this.gl.shaderSource(this.fragmentShader, fragment2);
        this.gl.compileShader(this.fragmentShader);
        if (this.gl.getShaderInfoLog(this.fragmentShader) !== "") {
          console.warn(`${this.gl.getShaderInfoLog(this.fragmentShader)}
Fragment Shader
${addLineNumbers(fragment2)}`);
        }
      }
      this.gl.linkProgram(this.program);
      if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
        return console.warn(this.gl.getProgramInfoLog(this.program));
      }
      this.uniformLocations = /* @__PURE__ */ new Map();
      let numUniforms = this.gl.getProgramParameter(this.program, this.gl.ACTIVE_UNIFORMS);
      for (let uIndex = 0; uIndex < numUniforms; uIndex++) {
        let uniform = this.gl.getActiveUniform(this.program, uIndex);
        this.uniformLocations.set(uniform, this.gl.getUniformLocation(this.program, uniform.name));
        const split = uniform.name.match(/(\w+)/g);
        uniform.uniformName = split[0];
        uniform.nameComponents = split.slice(1);
      }
      this.attributeLocations = /* @__PURE__ */ new Map();
      const locations = [];
      const numAttribs = this.gl.getProgramParameter(this.program, this.gl.ACTIVE_ATTRIBUTES);
      for (let aIndex = 0; aIndex < numAttribs; aIndex++) {
        const attribute = this.gl.getActiveAttrib(this.program, aIndex);
        const location = this.gl.getAttribLocation(this.program, attribute.name);
        if (location === -1) continue;
        locations[location] = attribute.name;
        this.attributeLocations.set(attribute, location);
      }
      this.attributeOrder = locations.join("");
    }
    setBlendFunc(src, dst, srcAlpha, dstAlpha) {
      this.blendFunc.src = src;
      this.blendFunc.dst = dst;
      this.blendFunc.srcAlpha = srcAlpha;
      this.blendFunc.dstAlpha = dstAlpha;
      if (src) this.transparent = true;
    }
    setBlendEquation(modeRGB, modeAlpha) {
      this.blendEquation.modeRGB = modeRGB;
      this.blendEquation.modeAlpha = modeAlpha;
    }
    setStencilFunc(func, ref, mask) {
      this.stencilRef = ref;
      this.stencilFunc.func = func;
      this.stencilFunc.ref = ref;
      this.stencilFunc.mask = mask;
    }
    setStencilOp(stencilFail, depthFail, depthPass) {
      this.stencilOp.stencilFail = stencilFail;
      this.stencilOp.depthFail = depthFail;
      this.stencilOp.depthPass = depthPass;
    }
    applyState() {
      if (this.depthTest) this.gl.renderer.enable(this.gl.DEPTH_TEST);
      else this.gl.renderer.disable(this.gl.DEPTH_TEST);
      if (this.cullFace) this.gl.renderer.enable(this.gl.CULL_FACE);
      else this.gl.renderer.disable(this.gl.CULL_FACE);
      if (this.blendFunc.src) this.gl.renderer.enable(this.gl.BLEND);
      else this.gl.renderer.disable(this.gl.BLEND);
      if (this.cullFace) this.gl.renderer.setCullFace(this.cullFace);
      this.gl.renderer.setFrontFace(this.frontFace);
      this.gl.renderer.setDepthMask(this.depthWrite);
      this.gl.renderer.setDepthFunc(this.depthFunc);
      if (this.blendFunc.src) this.gl.renderer.setBlendFunc(this.blendFunc.src, this.blendFunc.dst, this.blendFunc.srcAlpha, this.blendFunc.dstAlpha);
      this.gl.renderer.setBlendEquation(this.blendEquation.modeRGB, this.blendEquation.modeAlpha);
      if (this.stencilFunc.func || this.stencilOp.stencilFail) this.gl.renderer.enable(this.gl.STENCIL_TEST);
      else this.gl.renderer.disable(this.gl.STENCIL_TEST);
      this.gl.renderer.setStencilFunc(this.stencilFunc.func, this.stencilFunc.ref, this.stencilFunc.mask);
      this.gl.renderer.setStencilOp(this.stencilOp.stencilFail, this.stencilOp.depthFail, this.stencilOp.depthPass);
    }
    use({ flipFaces = false } = {}) {
      let textureUnit = -1;
      const programActive = this.gl.renderer.state.currentProgram === this.id;
      if (!programActive) {
        this.gl.useProgram(this.program);
        this.gl.renderer.state.currentProgram = this.id;
      }
      this.uniformLocations.forEach((location, activeUniform) => {
        let uniform = this.uniforms[activeUniform.uniformName];
        for (const component of activeUniform.nameComponents) {
          if (!uniform) break;
          if (component in uniform) {
            uniform = uniform[component];
          } else if (Array.isArray(uniform.value)) {
            break;
          } else {
            uniform = void 0;
            break;
          }
        }
        if (!uniform) {
          return warn(`Active uniform ${activeUniform.name} has not been supplied`);
        }
        if (uniform && uniform.value === void 0) {
          return warn(`${activeUniform.name} uniform is missing a value parameter`);
        }
        if (uniform.value.texture) {
          textureUnit = textureUnit + 1;
          uniform.value.update(textureUnit);
          return setUniform(this.gl, activeUniform.type, location, textureUnit);
        }
        if (uniform.value.length && uniform.value[0].texture) {
          const textureUnits = [];
          uniform.value.forEach((value) => {
            textureUnit = textureUnit + 1;
            value.update(textureUnit);
            textureUnits.push(textureUnit);
          });
          return setUniform(this.gl, activeUniform.type, location, textureUnits);
        }
        setUniform(this.gl, activeUniform.type, location, uniform.value);
      });
      this.applyState();
      if (flipFaces) this.gl.renderer.setFrontFace(this.frontFace === this.gl.CCW ? this.gl.CW : this.gl.CCW);
    }
    remove() {
      this.gl.deleteProgram(this.program);
    }
  };
  function setUniform(gl, type, location, value) {
    value = value.length ? flatten(value) : value;
    const setValue = gl.renderer.state.uniformLocations.get(location);
    if (value.length) {
      if (setValue === void 0 || setValue.length !== value.length) {
        gl.renderer.state.uniformLocations.set(location, value.slice(0));
      } else {
        if (arraysEqual(setValue, value)) return;
        setValue.set ? setValue.set(value) : setArray(setValue, value);
        gl.renderer.state.uniformLocations.set(location, setValue);
      }
    } else {
      if (setValue === value) return;
      gl.renderer.state.uniformLocations.set(location, value);
    }
    switch (type) {
      case 5126:
        return value.length ? gl.uniform1fv(location, value) : gl.uniform1f(location, value);
      // FLOAT
      case 35664:
        return gl.uniform2fv(location, value);
      // FLOAT_VEC2
      case 35665:
        return gl.uniform3fv(location, value);
      // FLOAT_VEC3
      case 35666:
        return gl.uniform4fv(location, value);
      // FLOAT_VEC4
      case 35670:
      // BOOL
      case 5124:
      // INT
      case 35678:
      // SAMPLER_2D
      case 36306:
      // U_SAMPLER_2D
      case 35680:
      // SAMPLER_CUBE
      case 36289:
        return value.length ? gl.uniform1iv(location, value) : gl.uniform1i(location, value);
      // SAMPLER_CUBE
      case 35671:
      // BOOL_VEC2
      case 35667:
        return gl.uniform2iv(location, value);
      // INT_VEC2
      case 35672:
      // BOOL_VEC3
      case 35668:
        return gl.uniform3iv(location, value);
      // INT_VEC3
      case 35673:
      // BOOL_VEC4
      case 35669:
        return gl.uniform4iv(location, value);
      // INT_VEC4
      case 35674:
        return gl.uniformMatrix2fv(location, false, value);
      // FLOAT_MAT2
      case 35675:
        return gl.uniformMatrix3fv(location, false, value);
      // FLOAT_MAT3
      case 35676:
        return gl.uniformMatrix4fv(location, false, value);
    }
  }
  function addLineNumbers(string2) {
    let lines = string2.split("\n");
    for (let i = 0; i < lines.length; i++) {
      lines[i] = i + 1 + ": " + lines[i];
    }
    return lines.join("\n");
  }
  function flatten(a) {
    const arrayLen = a.length;
    const valueLen = a[0].length;
    if (valueLen === void 0) return a;
    const length3 = arrayLen * valueLen;
    let value = arrayCacheF32[length3];
    if (!value) arrayCacheF32[length3] = value = new Float32Array(length3);
    for (let i = 0; i < arrayLen; i++) value.set(a[i], i * valueLen);
    return value;
  }
  function arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0, l = a.length; i < l; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }
  function setArray(a, b) {
    for (let i = 0, l = a.length; i < l; i++) {
      a[i] = b[i];
    }
  }
  var warnCount = 0;
  function warn(message) {
    if (warnCount > 100) return;
    console.warn(message);
    warnCount++;
    if (warnCount > 100) console.warn("More than 100 program warnings - stopping logs.");
  }

  // node_modules/ogl/src/core/Renderer.js
  var tempVec32 = /* @__PURE__ */ new Vec3();
  var ID3 = 1;
  var Renderer = class {
    constructor({
      canvas = document.createElement("canvas"),
      width = 300,
      height = 150,
      dpr = 1,
      alpha = false,
      depth = true,
      stencil = false,
      antialias = false,
      premultipliedAlpha = false,
      preserveDrawingBuffer = false,
      powerPreference = "default",
      autoClear = true,
      webgl = 2
    } = {}) {
      const attributes = { alpha, depth, stencil, antialias, premultipliedAlpha, preserveDrawingBuffer, powerPreference };
      this.dpr = dpr;
      this.alpha = alpha;
      this.color = true;
      this.depth = depth;
      this.stencil = stencil;
      this.premultipliedAlpha = premultipliedAlpha;
      this.autoClear = autoClear;
      this.id = ID3++;
      if (webgl === 2) this.gl = canvas.getContext("webgl2", attributes);
      this.isWebgl2 = !!this.gl;
      if (!this.gl) this.gl = canvas.getContext("webgl", attributes);
      if (!this.gl) console.error("unable to create webgl context");
      this.gl.renderer = this;
      this.setSize(width, height);
      this.state = {};
      this.state.blendFunc = { src: this.gl.ONE, dst: this.gl.ZERO };
      this.state.blendEquation = { modeRGB: this.gl.FUNC_ADD };
      this.state.cullFace = false;
      this.state.frontFace = this.gl.CCW;
      this.state.depthMask = true;
      this.state.depthFunc = this.gl.LEQUAL;
      this.state.premultiplyAlpha = false;
      this.state.flipY = false;
      this.state.unpackAlignment = 4;
      this.state.framebuffer = null;
      this.state.viewport = { x: 0, y: 0, width: null, height: null };
      this.state.textureUnits = [];
      this.state.activeTextureUnit = 0;
      this.state.boundBuffer = null;
      this.state.uniformLocations = /* @__PURE__ */ new Map();
      this.state.currentProgram = null;
      this.extensions = {};
      if (this.isWebgl2) {
        this.getExtension("EXT_color_buffer_float");
        this.getExtension("OES_texture_float_linear");
      } else {
        this.getExtension("OES_texture_float");
        this.getExtension("OES_texture_float_linear");
        this.getExtension("OES_texture_half_float");
        this.getExtension("OES_texture_half_float_linear");
        this.getExtension("OES_element_index_uint");
        this.getExtension("OES_standard_derivatives");
        this.getExtension("EXT_sRGB");
        this.getExtension("WEBGL_depth_texture");
        this.getExtension("WEBGL_draw_buffers");
      }
      this.getExtension("WEBGL_compressed_texture_astc");
      this.getExtension("EXT_texture_compression_bptc");
      this.getExtension("WEBGL_compressed_texture_s3tc");
      this.getExtension("WEBGL_compressed_texture_etc1");
      this.getExtension("WEBGL_compressed_texture_pvrtc");
      this.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");
      this.vertexAttribDivisor = this.getExtension("ANGLE_instanced_arrays", "vertexAttribDivisor", "vertexAttribDivisorANGLE");
      this.drawArraysInstanced = this.getExtension("ANGLE_instanced_arrays", "drawArraysInstanced", "drawArraysInstancedANGLE");
      this.drawElementsInstanced = this.getExtension("ANGLE_instanced_arrays", "drawElementsInstanced", "drawElementsInstancedANGLE");
      this.createVertexArray = this.getExtension("OES_vertex_array_object", "createVertexArray", "createVertexArrayOES");
      this.bindVertexArray = this.getExtension("OES_vertex_array_object", "bindVertexArray", "bindVertexArrayOES");
      this.deleteVertexArray = this.getExtension("OES_vertex_array_object", "deleteVertexArray", "deleteVertexArrayOES");
      this.drawBuffers = this.getExtension("WEBGL_draw_buffers", "drawBuffers", "drawBuffersWEBGL");
      this.parameters = {};
      this.parameters.maxTextureUnits = this.gl.getParameter(this.gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS);
      this.parameters.maxAnisotropy = this.getExtension("EXT_texture_filter_anisotropic") ? this.gl.getParameter(this.getExtension("EXT_texture_filter_anisotropic").MAX_TEXTURE_MAX_ANISOTROPY_EXT) : 0;
    }
    setSize(width, height) {
      this.width = width;
      this.height = height;
      this.gl.canvas.width = width * this.dpr;
      this.gl.canvas.height = height * this.dpr;
      if (!this.gl.canvas.style) return;
      Object.assign(this.gl.canvas.style, {
        width: width + "px",
        height: height + "px"
      });
    }
    setViewport(width, height, x = 0, y = 0) {
      if (this.state.viewport.width === width && this.state.viewport.height === height) return;
      this.state.viewport.width = width;
      this.state.viewport.height = height;
      this.state.viewport.x = x;
      this.state.viewport.y = y;
      this.gl.viewport(x, y, width, height);
    }
    setScissor(width, height, x = 0, y = 0) {
      this.gl.scissor(x, y, width, height);
    }
    enable(id) {
      if (this.state[id] === true) return;
      this.gl.enable(id);
      this.state[id] = true;
    }
    disable(id) {
      if (this.state[id] === false) return;
      this.gl.disable(id);
      this.state[id] = false;
    }
    setBlendFunc(src, dst, srcAlpha, dstAlpha) {
      if (this.state.blendFunc.src === src && this.state.blendFunc.dst === dst && this.state.blendFunc.srcAlpha === srcAlpha && this.state.blendFunc.dstAlpha === dstAlpha)
        return;
      this.state.blendFunc.src = src;
      this.state.blendFunc.dst = dst;
      this.state.blendFunc.srcAlpha = srcAlpha;
      this.state.blendFunc.dstAlpha = dstAlpha;
      if (srcAlpha !== void 0) this.gl.blendFuncSeparate(src, dst, srcAlpha, dstAlpha);
      else this.gl.blendFunc(src, dst);
    }
    setBlendEquation(modeRGB, modeAlpha) {
      modeRGB = modeRGB || this.gl.FUNC_ADD;
      if (this.state.blendEquation.modeRGB === modeRGB && this.state.blendEquation.modeAlpha === modeAlpha) return;
      this.state.blendEquation.modeRGB = modeRGB;
      this.state.blendEquation.modeAlpha = modeAlpha;
      if (modeAlpha !== void 0) this.gl.blendEquationSeparate(modeRGB, modeAlpha);
      else this.gl.blendEquation(modeRGB);
    }
    setCullFace(value) {
      if (this.state.cullFace === value) return;
      this.state.cullFace = value;
      this.gl.cullFace(value);
    }
    setFrontFace(value) {
      if (this.state.frontFace === value) return;
      this.state.frontFace = value;
      this.gl.frontFace(value);
    }
    setDepthMask(value) {
      if (this.state.depthMask === value) return;
      this.state.depthMask = value;
      this.gl.depthMask(value);
    }
    setDepthFunc(value) {
      if (this.state.depthFunc === value) return;
      this.state.depthFunc = value;
      this.gl.depthFunc(value);
    }
    setStencilMask(value) {
      if (this.state.stencilMask === value) return;
      this.state.stencilMask = value;
      this.gl.stencilMask(value);
    }
    setStencilFunc(func, ref, mask) {
      if (this.state.stencilFunc === func && this.state.stencilRef === ref && this.state.stencilFuncMask === mask) return;
      this.state.stencilFunc = func || this.gl.ALWAYS;
      this.state.stencilRef = ref || 0;
      this.state.stencilFuncMask = mask || 0;
      this.gl.stencilFunc(func || this.gl.ALWAYS, ref || 0, mask || 0);
    }
    setStencilOp(stencilFail, depthFail, depthPass) {
      if (this.state.stencilFail === stencilFail && this.state.stencilDepthFail === depthFail && this.state.stencilDepthPass === depthPass) return;
      this.state.stencilFail = stencilFail;
      this.state.stencilDepthFail = depthFail;
      this.state.stencilDepthPass = depthPass;
      this.gl.stencilOp(stencilFail, depthFail, depthPass);
    }
    activeTexture(value) {
      if (this.state.activeTextureUnit === value) return;
      this.state.activeTextureUnit = value;
      this.gl.activeTexture(this.gl.TEXTURE0 + value);
    }
    bindFramebuffer({ target = this.gl.FRAMEBUFFER, buffer = null } = {}) {
      if (this.state.framebuffer === buffer) return;
      this.state.framebuffer = buffer;
      this.gl.bindFramebuffer(target, buffer);
    }
    getExtension(extension, webgl2Func, extFunc) {
      if (webgl2Func && this.gl[webgl2Func]) return this.gl[webgl2Func].bind(this.gl);
      if (!this.extensions[extension]) {
        this.extensions[extension] = this.gl.getExtension(extension);
      }
      if (!webgl2Func) return this.extensions[extension];
      if (!this.extensions[extension]) return null;
      return this.extensions[extension][extFunc].bind(this.extensions[extension]);
    }
    sortOpaque(a, b) {
      if (a.renderOrder !== b.renderOrder) {
        return a.renderOrder - b.renderOrder;
      } else if (a.program.id !== b.program.id) {
        return a.program.id - b.program.id;
      } else if (a.zDepth !== b.zDepth) {
        return a.zDepth - b.zDepth;
      } else {
        return b.id - a.id;
      }
    }
    sortTransparent(a, b) {
      if (a.renderOrder !== b.renderOrder) {
        return a.renderOrder - b.renderOrder;
      }
      if (a.zDepth !== b.zDepth) {
        return b.zDepth - a.zDepth;
      } else {
        return b.id - a.id;
      }
    }
    sortUI(a, b) {
      if (a.renderOrder !== b.renderOrder) {
        return a.renderOrder - b.renderOrder;
      } else if (a.program.id !== b.program.id) {
        return a.program.id - b.program.id;
      } else {
        return b.id - a.id;
      }
    }
    getRenderList({ scene, camera, frustumCull, sort }) {
      let renderList = [];
      if (camera && frustumCull) camera.updateFrustum();
      scene.traverse((node) => {
        if (!node.visible) return true;
        if (!node.draw) return;
        if (frustumCull && node.frustumCulled && camera) {
          if (!camera.frustumIntersectsMesh(node)) return;
        }
        renderList.push(node);
      });
      if (sort) {
        const opaque = [];
        const transparent = [];
        const ui = [];
        renderList.forEach((node) => {
          if (!node.program.transparent) {
            opaque.push(node);
          } else if (node.program.depthTest) {
            transparent.push(node);
          } else {
            ui.push(node);
          }
          node.zDepth = 0;
          if (node.renderOrder !== 0 || !node.program.depthTest || !camera) return;
          node.worldMatrix.getTranslation(tempVec32);
          tempVec32.applyMatrix4(camera.projectionViewMatrix);
          node.zDepth = tempVec32.z;
        });
        opaque.sort(this.sortOpaque);
        transparent.sort(this.sortTransparent);
        ui.sort(this.sortUI);
        renderList = opaque.concat(transparent, ui);
      }
      return renderList;
    }
    render({ scene, camera, target = null, update = true, sort = true, frustumCull = true, clear }) {
      if (target === null) {
        this.bindFramebuffer();
        this.setViewport(this.width * this.dpr, this.height * this.dpr);
      } else {
        this.bindFramebuffer(target);
        this.setViewport(target.width, target.height);
      }
      if (clear || this.autoClear && clear !== false) {
        if (this.depth && (!target || target.depth)) {
          this.enable(this.gl.DEPTH_TEST);
          this.setDepthMask(true);
        }
        if (this.stencil || (!target || target.stencil)) {
          this.enable(this.gl.STENCIL_TEST);
          this.setStencilMask(255);
        }
        this.gl.clear(
          (this.color ? this.gl.COLOR_BUFFER_BIT : 0) | (this.depth ? this.gl.DEPTH_BUFFER_BIT : 0) | (this.stencil ? this.gl.STENCIL_BUFFER_BIT : 0)
        );
      }
      if (update) scene.updateMatrixWorld();
      if (camera) camera.updateMatrixWorld();
      const renderList = this.getRenderList({ scene, camera, frustumCull, sort });
      renderList.forEach((node) => {
        node.draw({ camera });
      });
    }
  };

  // node_modules/ogl/src/math/functions/Vec4Func.js
  function copy2(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    return out;
  }
  function set2(out, x, y, z, w) {
    out[0] = x;
    out[1] = y;
    out[2] = z;
    out[3] = w;
    return out;
  }
  function normalize2(out, a) {
    let x = a[0];
    let y = a[1];
    let z = a[2];
    let w = a[3];
    let len = x * x + y * y + z * z + w * w;
    if (len > 0) {
      len = 1 / Math.sqrt(len);
    }
    out[0] = x * len;
    out[1] = y * len;
    out[2] = z * len;
    out[3] = w * len;
    return out;
  }
  function dot2(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  }

  // node_modules/ogl/src/math/functions/QuatFunc.js
  function identity(out) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    return out;
  }
  function setAxisAngle(out, axis, rad) {
    rad = rad * 0.5;
    let s = Math.sin(rad);
    out[0] = s * axis[0];
    out[1] = s * axis[1];
    out[2] = s * axis[2];
    out[3] = Math.cos(rad);
    return out;
  }
  function multiply2(out, a, b) {
    let ax = a[0], ay = a[1], az = a[2], aw = a[3];
    let bx = b[0], by = b[1], bz = b[2], bw = b[3];
    out[0] = ax * bw + aw * bx + ay * bz - az * by;
    out[1] = ay * bw + aw * by + az * bx - ax * bz;
    out[2] = az * bw + aw * bz + ax * by - ay * bx;
    out[3] = aw * bw - ax * bx - ay * by - az * bz;
    return out;
  }
  function rotateX(out, a, rad) {
    rad *= 0.5;
    let ax = a[0], ay = a[1], az = a[2], aw = a[3];
    let bx = Math.sin(rad), bw = Math.cos(rad);
    out[0] = ax * bw + aw * bx;
    out[1] = ay * bw + az * bx;
    out[2] = az * bw - ay * bx;
    out[3] = aw * bw - ax * bx;
    return out;
  }
  function rotateY(out, a, rad) {
    rad *= 0.5;
    let ax = a[0], ay = a[1], az = a[2], aw = a[3];
    let by = Math.sin(rad), bw = Math.cos(rad);
    out[0] = ax * bw - az * by;
    out[1] = ay * bw + aw * by;
    out[2] = az * bw + ax * by;
    out[3] = aw * bw - ay * by;
    return out;
  }
  function rotateZ(out, a, rad) {
    rad *= 0.5;
    let ax = a[0], ay = a[1], az = a[2], aw = a[3];
    let bz = Math.sin(rad), bw = Math.cos(rad);
    out[0] = ax * bw + ay * bz;
    out[1] = ay * bw - ax * bz;
    out[2] = az * bw + aw * bz;
    out[3] = aw * bw - az * bz;
    return out;
  }
  function slerp(out, a, b, t) {
    let ax = a[0], ay = a[1], az = a[2], aw = a[3];
    let bx = b[0], by = b[1], bz = b[2], bw = b[3];
    let omega, cosom, sinom, scale0, scale1;
    cosom = ax * bx + ay * by + az * bz + aw * bw;
    if (cosom < 0) {
      cosom = -cosom;
      bx = -bx;
      by = -by;
      bz = -bz;
      bw = -bw;
    }
    if (1 - cosom > 1e-6) {
      omega = Math.acos(cosom);
      sinom = Math.sin(omega);
      scale0 = Math.sin((1 - t) * omega) / sinom;
      scale1 = Math.sin(t * omega) / sinom;
    } else {
      scale0 = 1 - t;
      scale1 = t;
    }
    out[0] = scale0 * ax + scale1 * bx;
    out[1] = scale0 * ay + scale1 * by;
    out[2] = scale0 * az + scale1 * bz;
    out[3] = scale0 * aw + scale1 * bw;
    return out;
  }
  function invert(out, a) {
    let a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3];
    let dot4 = a0 * a0 + a1 * a1 + a2 * a2 + a3 * a3;
    let invDot = dot4 ? 1 / dot4 : 0;
    out[0] = -a0 * invDot;
    out[1] = -a1 * invDot;
    out[2] = -a2 * invDot;
    out[3] = a3 * invDot;
    return out;
  }
  function conjugate(out, a) {
    out[0] = -a[0];
    out[1] = -a[1];
    out[2] = -a[2];
    out[3] = a[3];
    return out;
  }
  function fromMat3(out, m) {
    let fTrace = m[0] + m[4] + m[8];
    let fRoot;
    if (fTrace > 0) {
      fRoot = Math.sqrt(fTrace + 1);
      out[3] = 0.5 * fRoot;
      fRoot = 0.5 / fRoot;
      out[0] = (m[5] - m[7]) * fRoot;
      out[1] = (m[6] - m[2]) * fRoot;
      out[2] = (m[1] - m[3]) * fRoot;
    } else {
      let i = 0;
      if (m[4] > m[0]) i = 1;
      if (m[8] > m[i * 3 + i]) i = 2;
      let j = (i + 1) % 3;
      let k = (i + 2) % 3;
      fRoot = Math.sqrt(m[i * 3 + i] - m[j * 3 + j] - m[k * 3 + k] + 1);
      out[i] = 0.5 * fRoot;
      fRoot = 0.5 / fRoot;
      out[3] = (m[j * 3 + k] - m[k * 3 + j]) * fRoot;
      out[j] = (m[j * 3 + i] + m[i * 3 + j]) * fRoot;
      out[k] = (m[k * 3 + i] + m[i * 3 + k]) * fRoot;
    }
    return out;
  }
  function fromEuler(out, euler, order = "YXZ") {
    let sx = Math.sin(euler[0] * 0.5);
    let cx = Math.cos(euler[0] * 0.5);
    let sy = Math.sin(euler[1] * 0.5);
    let cy = Math.cos(euler[1] * 0.5);
    let sz = Math.sin(euler[2] * 0.5);
    let cz = Math.cos(euler[2] * 0.5);
    if (order === "XYZ") {
      out[0] = sx * cy * cz + cx * sy * sz;
      out[1] = cx * sy * cz - sx * cy * sz;
      out[2] = cx * cy * sz + sx * sy * cz;
      out[3] = cx * cy * cz - sx * sy * sz;
    } else if (order === "YXZ") {
      out[0] = sx * cy * cz + cx * sy * sz;
      out[1] = cx * sy * cz - sx * cy * sz;
      out[2] = cx * cy * sz - sx * sy * cz;
      out[3] = cx * cy * cz + sx * sy * sz;
    } else if (order === "ZXY") {
      out[0] = sx * cy * cz - cx * sy * sz;
      out[1] = cx * sy * cz + sx * cy * sz;
      out[2] = cx * cy * sz + sx * sy * cz;
      out[3] = cx * cy * cz - sx * sy * sz;
    } else if (order === "ZYX") {
      out[0] = sx * cy * cz - cx * sy * sz;
      out[1] = cx * sy * cz + sx * cy * sz;
      out[2] = cx * cy * sz - sx * sy * cz;
      out[3] = cx * cy * cz + sx * sy * sz;
    } else if (order === "YZX") {
      out[0] = sx * cy * cz + cx * sy * sz;
      out[1] = cx * sy * cz + sx * cy * sz;
      out[2] = cx * cy * sz - sx * sy * cz;
      out[3] = cx * cy * cz - sx * sy * sz;
    } else if (order === "XZY") {
      out[0] = sx * cy * cz - cx * sy * sz;
      out[1] = cx * sy * cz - sx * cy * sz;
      out[2] = cx * cy * sz + sx * sy * cz;
      out[3] = cx * cy * cz + sx * sy * sz;
    }
    return out;
  }
  var copy3 = copy2;
  var set3 = set2;
  var dot3 = dot2;
  var normalize3 = normalize2;

  // node_modules/ogl/src/math/Quat.js
  var Quat = class extends Array {
    constructor(x = 0, y = 0, z = 0, w = 1) {
      super(x, y, z, w);
      this.onChange = () => {
      };
      this._target = this;
      const triggerProps = ["0", "1", "2", "3"];
      return new Proxy(this, {
        set(target, property) {
          const success = Reflect.set(...arguments);
          if (success && triggerProps.includes(property)) target.onChange();
          return success;
        }
      });
    }
    get x() {
      return this[0];
    }
    get y() {
      return this[1];
    }
    get z() {
      return this[2];
    }
    get w() {
      return this[3];
    }
    set x(v) {
      this._target[0] = v;
      this.onChange();
    }
    set y(v) {
      this._target[1] = v;
      this.onChange();
    }
    set z(v) {
      this._target[2] = v;
      this.onChange();
    }
    set w(v) {
      this._target[3] = v;
      this.onChange();
    }
    identity() {
      identity(this._target);
      this.onChange();
      return this;
    }
    set(x, y, z, w) {
      if (x.length) return this.copy(x);
      set3(this._target, x, y, z, w);
      this.onChange();
      return this;
    }
    rotateX(a) {
      rotateX(this._target, this._target, a);
      this.onChange();
      return this;
    }
    rotateY(a) {
      rotateY(this._target, this._target, a);
      this.onChange();
      return this;
    }
    rotateZ(a) {
      rotateZ(this._target, this._target, a);
      this.onChange();
      return this;
    }
    inverse(q = this._target) {
      invert(this._target, q);
      this.onChange();
      return this;
    }
    conjugate(q = this._target) {
      conjugate(this._target, q);
      this.onChange();
      return this;
    }
    copy(q) {
      copy3(this._target, q);
      this.onChange();
      return this;
    }
    normalize(q = this._target) {
      normalize3(this._target, q);
      this.onChange();
      return this;
    }
    multiply(qA, qB) {
      if (qB) {
        multiply2(this._target, qA, qB);
      } else {
        multiply2(this._target, this._target, qA);
      }
      this.onChange();
      return this;
    }
    dot(v) {
      return dot3(this._target, v);
    }
    fromMatrix3(matrix3) {
      fromMat3(this._target, matrix3);
      this.onChange();
      return this;
    }
    fromEuler(euler, isInternal) {
      fromEuler(this._target, euler, euler.order);
      if (!isInternal) this.onChange();
      return this;
    }
    fromAxisAngle(axis, a) {
      setAxisAngle(this._target, axis, a);
      this.onChange();
      return this;
    }
    slerp(q, t) {
      slerp(this._target, this._target, q, t);
      this.onChange();
      return this;
    }
    fromArray(a, o = 0) {
      this._target[0] = a[o];
      this._target[1] = a[o + 1];
      this._target[2] = a[o + 2];
      this._target[3] = a[o + 3];
      this.onChange();
      return this;
    }
    toArray(a = [], o = 0) {
      a[o] = this[0];
      a[o + 1] = this[1];
      a[o + 2] = this[2];
      a[o + 3] = this[3];
      return a;
    }
  };

  // node_modules/ogl/src/math/functions/Mat4Func.js
  var EPSILON = 1e-6;
  function copy4(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    out[9] = a[9];
    out[10] = a[10];
    out[11] = a[11];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return out;
  }
  function set4(out, m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33) {
    out[0] = m00;
    out[1] = m01;
    out[2] = m02;
    out[3] = m03;
    out[4] = m10;
    out[5] = m11;
    out[6] = m12;
    out[7] = m13;
    out[8] = m20;
    out[9] = m21;
    out[10] = m22;
    out[11] = m23;
    out[12] = m30;
    out[13] = m31;
    out[14] = m32;
    out[15] = m33;
    return out;
  }
  function identity2(out) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
  }
  function invert2(out, a) {
    let a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    let a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    let a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    let a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
    let b00 = a00 * a11 - a01 * a10;
    let b01 = a00 * a12 - a02 * a10;
    let b02 = a00 * a13 - a03 * a10;
    let b03 = a01 * a12 - a02 * a11;
    let b04 = a01 * a13 - a03 * a11;
    let b05 = a02 * a13 - a03 * a12;
    let b06 = a20 * a31 - a21 * a30;
    let b07 = a20 * a32 - a22 * a30;
    let b08 = a20 * a33 - a23 * a30;
    let b09 = a21 * a32 - a22 * a31;
    let b10 = a21 * a33 - a23 * a31;
    let b11 = a22 * a33 - a23 * a32;
    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (!det) {
      return null;
    }
    det = 1 / det;
    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
    return out;
  }
  function determinant(a) {
    let a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    let a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    let a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    let a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
    let b00 = a00 * a11 - a01 * a10;
    let b01 = a00 * a12 - a02 * a10;
    let b02 = a00 * a13 - a03 * a10;
    let b03 = a01 * a12 - a02 * a11;
    let b04 = a01 * a13 - a03 * a11;
    let b05 = a02 * a13 - a03 * a12;
    let b06 = a20 * a31 - a21 * a30;
    let b07 = a20 * a32 - a22 * a30;
    let b08 = a20 * a33 - a23 * a30;
    let b09 = a21 * a32 - a22 * a31;
    let b10 = a21 * a33 - a23 * a31;
    let b11 = a22 * a33 - a23 * a32;
    return b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
  }
  function multiply3(out, a, b) {
    let a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    let a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    let a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    let a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
    let b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
    out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    b0 = b[4];
    b1 = b[5];
    b2 = b[6];
    b3 = b[7];
    out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    b0 = b[8];
    b1 = b[9];
    b2 = b[10];
    b3 = b[11];
    out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    b0 = b[12];
    b1 = b[13];
    b2 = b[14];
    b3 = b[15];
    out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    return out;
  }
  function translate(out, a, v) {
    let x = v[0], y = v[1], z = v[2];
    let a00, a01, a02, a03;
    let a10, a11, a12, a13;
    let a20, a21, a22, a23;
    if (a === out) {
      out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
      out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
      out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
      out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
    } else {
      a00 = a[0];
      a01 = a[1];
      a02 = a[2];
      a03 = a[3];
      a10 = a[4];
      a11 = a[5];
      a12 = a[6];
      a13 = a[7];
      a20 = a[8];
      a21 = a[9];
      a22 = a[10];
      a23 = a[11];
      out[0] = a00;
      out[1] = a01;
      out[2] = a02;
      out[3] = a03;
      out[4] = a10;
      out[5] = a11;
      out[6] = a12;
      out[7] = a13;
      out[8] = a20;
      out[9] = a21;
      out[10] = a22;
      out[11] = a23;
      out[12] = a00 * x + a10 * y + a20 * z + a[12];
      out[13] = a01 * x + a11 * y + a21 * z + a[13];
      out[14] = a02 * x + a12 * y + a22 * z + a[14];
      out[15] = a03 * x + a13 * y + a23 * z + a[15];
    }
    return out;
  }
  function scale3(out, a, v) {
    let x = v[0], y = v[1], z = v[2];
    out[0] = a[0] * x;
    out[1] = a[1] * x;
    out[2] = a[2] * x;
    out[3] = a[3] * x;
    out[4] = a[4] * y;
    out[5] = a[5] * y;
    out[6] = a[6] * y;
    out[7] = a[7] * y;
    out[8] = a[8] * z;
    out[9] = a[9] * z;
    out[10] = a[10] * z;
    out[11] = a[11] * z;
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return out;
  }
  function rotate(out, a, rad, axis) {
    let x = axis[0], y = axis[1], z = axis[2];
    let len = Math.hypot(x, y, z);
    let s, c, t;
    let a00, a01, a02, a03;
    let a10, a11, a12, a13;
    let a20, a21, a22, a23;
    let b00, b01, b02;
    let b10, b11, b12;
    let b20, b21, b22;
    if (Math.abs(len) < EPSILON) {
      return null;
    }
    len = 1 / len;
    x *= len;
    y *= len;
    z *= len;
    s = Math.sin(rad);
    c = Math.cos(rad);
    t = 1 - c;
    a00 = a[0];
    a01 = a[1];
    a02 = a[2];
    a03 = a[3];
    a10 = a[4];
    a11 = a[5];
    a12 = a[6];
    a13 = a[7];
    a20 = a[8];
    a21 = a[9];
    a22 = a[10];
    a23 = a[11];
    b00 = x * x * t + c;
    b01 = y * x * t + z * s;
    b02 = z * x * t - y * s;
    b10 = x * y * t - z * s;
    b11 = y * y * t + c;
    b12 = z * y * t + x * s;
    b20 = x * z * t + y * s;
    b21 = y * z * t - x * s;
    b22 = z * z * t + c;
    out[0] = a00 * b00 + a10 * b01 + a20 * b02;
    out[1] = a01 * b00 + a11 * b01 + a21 * b02;
    out[2] = a02 * b00 + a12 * b01 + a22 * b02;
    out[3] = a03 * b00 + a13 * b01 + a23 * b02;
    out[4] = a00 * b10 + a10 * b11 + a20 * b12;
    out[5] = a01 * b10 + a11 * b11 + a21 * b12;
    out[6] = a02 * b10 + a12 * b11 + a22 * b12;
    out[7] = a03 * b10 + a13 * b11 + a23 * b12;
    out[8] = a00 * b20 + a10 * b21 + a20 * b22;
    out[9] = a01 * b20 + a11 * b21 + a21 * b22;
    out[10] = a02 * b20 + a12 * b21 + a22 * b22;
    out[11] = a03 * b20 + a13 * b21 + a23 * b22;
    if (a !== out) {
      out[12] = a[12];
      out[13] = a[13];
      out[14] = a[14];
      out[15] = a[15];
    }
    return out;
  }
  function getTranslation(out, mat) {
    out[0] = mat[12];
    out[1] = mat[13];
    out[2] = mat[14];
    return out;
  }
  function getScaling(out, mat) {
    let m11 = mat[0];
    let m12 = mat[1];
    let m13 = mat[2];
    let m21 = mat[4];
    let m22 = mat[5];
    let m23 = mat[6];
    let m31 = mat[8];
    let m32 = mat[9];
    let m33 = mat[10];
    out[0] = Math.hypot(m11, m12, m13);
    out[1] = Math.hypot(m21, m22, m23);
    out[2] = Math.hypot(m31, m32, m33);
    return out;
  }
  function getMaxScaleOnAxis(mat) {
    let m11 = mat[0];
    let m12 = mat[1];
    let m13 = mat[2];
    let m21 = mat[4];
    let m22 = mat[5];
    let m23 = mat[6];
    let m31 = mat[8];
    let m32 = mat[9];
    let m33 = mat[10];
    const x = m11 * m11 + m12 * m12 + m13 * m13;
    const y = m21 * m21 + m22 * m22 + m23 * m23;
    const z = m31 * m31 + m32 * m32 + m33 * m33;
    return Math.sqrt(Math.max(x, y, z));
  }
  var getRotation = /* @__PURE__ */ (function() {
    const temp = [1, 1, 1];
    return function(out, mat) {
      let scaling = temp;
      getScaling(scaling, mat);
      let is1 = 1 / scaling[0];
      let is2 = 1 / scaling[1];
      let is3 = 1 / scaling[2];
      let sm11 = mat[0] * is1;
      let sm12 = mat[1] * is2;
      let sm13 = mat[2] * is3;
      let sm21 = mat[4] * is1;
      let sm22 = mat[5] * is2;
      let sm23 = mat[6] * is3;
      let sm31 = mat[8] * is1;
      let sm32 = mat[9] * is2;
      let sm33 = mat[10] * is3;
      let trace = sm11 + sm22 + sm33;
      let S = 0;
      if (trace > 0) {
        S = Math.sqrt(trace + 1) * 2;
        out[3] = 0.25 * S;
        out[0] = (sm23 - sm32) / S;
        out[1] = (sm31 - sm13) / S;
        out[2] = (sm12 - sm21) / S;
      } else if (sm11 > sm22 && sm11 > sm33) {
        S = Math.sqrt(1 + sm11 - sm22 - sm33) * 2;
        out[3] = (sm23 - sm32) / S;
        out[0] = 0.25 * S;
        out[1] = (sm12 + sm21) / S;
        out[2] = (sm31 + sm13) / S;
      } else if (sm22 > sm33) {
        S = Math.sqrt(1 + sm22 - sm11 - sm33) * 2;
        out[3] = (sm31 - sm13) / S;
        out[0] = (sm12 + sm21) / S;
        out[1] = 0.25 * S;
        out[2] = (sm23 + sm32) / S;
      } else {
        S = Math.sqrt(1 + sm33 - sm11 - sm22) * 2;
        out[3] = (sm12 - sm21) / S;
        out[0] = (sm31 + sm13) / S;
        out[1] = (sm23 + sm32) / S;
        out[2] = 0.25 * S;
      }
      return out;
    };
  })();
  function decompose(srcMat, dstRotation, dstTranslation, dstScale) {
    let sx = length([srcMat[0], srcMat[1], srcMat[2]]);
    const sy = length([srcMat[4], srcMat[5], srcMat[6]]);
    const sz = length([srcMat[8], srcMat[9], srcMat[10]]);
    const det = determinant(srcMat);
    if (det < 0) sx = -sx;
    dstTranslation[0] = srcMat[12];
    dstTranslation[1] = srcMat[13];
    dstTranslation[2] = srcMat[14];
    const _m1 = srcMat.slice();
    const invSX = 1 / sx;
    const invSY = 1 / sy;
    const invSZ = 1 / sz;
    _m1[0] *= invSX;
    _m1[1] *= invSX;
    _m1[2] *= invSX;
    _m1[4] *= invSY;
    _m1[5] *= invSY;
    _m1[6] *= invSY;
    _m1[8] *= invSZ;
    _m1[9] *= invSZ;
    _m1[10] *= invSZ;
    getRotation(dstRotation, _m1);
    dstScale[0] = sx;
    dstScale[1] = sy;
    dstScale[2] = sz;
  }
  function compose(dstMat, srcRotation, srcTranslation, srcScale) {
    const te = dstMat;
    const x = srcRotation[0], y = srcRotation[1], z = srcRotation[2], w = srcRotation[3];
    const x2 = x + x, y2 = y + y, z2 = z + z;
    const xx = x * x2, xy = x * y2, xz = x * z2;
    const yy = y * y2, yz = y * z2, zz = z * z2;
    const wx = w * x2, wy = w * y2, wz = w * z2;
    const sx = srcScale[0], sy = srcScale[1], sz = srcScale[2];
    te[0] = (1 - (yy + zz)) * sx;
    te[1] = (xy + wz) * sx;
    te[2] = (xz - wy) * sx;
    te[3] = 0;
    te[4] = (xy - wz) * sy;
    te[5] = (1 - (xx + zz)) * sy;
    te[6] = (yz + wx) * sy;
    te[7] = 0;
    te[8] = (xz + wy) * sz;
    te[9] = (yz - wx) * sz;
    te[10] = (1 - (xx + yy)) * sz;
    te[11] = 0;
    te[12] = srcTranslation[0];
    te[13] = srcTranslation[1];
    te[14] = srcTranslation[2];
    te[15] = 1;
    return te;
  }
  function fromQuat(out, q) {
    let x = q[0], y = q[1], z = q[2], w = q[3];
    let x2 = x + x;
    let y2 = y + y;
    let z2 = z + z;
    let xx = x * x2;
    let yx = y * x2;
    let yy = y * y2;
    let zx = z * x2;
    let zy = z * y2;
    let zz = z * z2;
    let wx = w * x2;
    let wy = w * y2;
    let wz = w * z2;
    out[0] = 1 - yy - zz;
    out[1] = yx + wz;
    out[2] = zx - wy;
    out[3] = 0;
    out[4] = yx - wz;
    out[5] = 1 - xx - zz;
    out[6] = zy + wx;
    out[7] = 0;
    out[8] = zx + wy;
    out[9] = zy - wx;
    out[10] = 1 - xx - yy;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
  }
  function perspective(out, fovy, aspect, near, far) {
    let f = 1 / Math.tan(fovy / 2);
    let nf = 1 / (near - far);
    out[0] = f / aspect;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = f;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = (far + near) * nf;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[14] = 2 * far * near * nf;
    out[15] = 0;
    return out;
  }
  function ortho(out, left, right, bottom, top, near, far) {
    let lr = 1 / (left - right);
    let bt = 1 / (bottom - top);
    let nf = 1 / (near - far);
    out[0] = -2 * lr;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = -2 * bt;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 2 * nf;
    out[11] = 0;
    out[12] = (left + right) * lr;
    out[13] = (top + bottom) * bt;
    out[14] = (far + near) * nf;
    out[15] = 1;
    return out;
  }
  function targetTo(out, eye, target, up) {
    let eyex = eye[0], eyey = eye[1], eyez = eye[2], upx = up[0], upy = up[1], upz = up[2];
    let z0 = eyex - target[0], z1 = eyey - target[1], z2 = eyez - target[2];
    let len = z0 * z0 + z1 * z1 + z2 * z2;
    if (len === 0) {
      z2 = 1;
    } else {
      len = 1 / Math.sqrt(len);
      z0 *= len;
      z1 *= len;
      z2 *= len;
    }
    let x0 = upy * z2 - upz * z1, x1 = upz * z0 - upx * z2, x2 = upx * z1 - upy * z0;
    len = x0 * x0 + x1 * x1 + x2 * x2;
    if (len === 0) {
      if (upz) {
        upx += 1e-6;
      } else if (upy) {
        upz += 1e-6;
      } else {
        upy += 1e-6;
      }
      x0 = upy * z2 - upz * z1, x1 = upz * z0 - upx * z2, x2 = upx * z1 - upy * z0;
      len = x0 * x0 + x1 * x1 + x2 * x2;
    }
    len = 1 / Math.sqrt(len);
    x0 *= len;
    x1 *= len;
    x2 *= len;
    out[0] = x0;
    out[1] = x1;
    out[2] = x2;
    out[3] = 0;
    out[4] = z1 * x2 - z2 * x1;
    out[5] = z2 * x0 - z0 * x2;
    out[6] = z0 * x1 - z1 * x0;
    out[7] = 0;
    out[8] = z0;
    out[9] = z1;
    out[10] = z2;
    out[11] = 0;
    out[12] = eyex;
    out[13] = eyey;
    out[14] = eyez;
    out[15] = 1;
    return out;
  }
  function add3(out, a, b) {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    out[2] = a[2] + b[2];
    out[3] = a[3] + b[3];
    out[4] = a[4] + b[4];
    out[5] = a[5] + b[5];
    out[6] = a[6] + b[6];
    out[7] = a[7] + b[7];
    out[8] = a[8] + b[8];
    out[9] = a[9] + b[9];
    out[10] = a[10] + b[10];
    out[11] = a[11] + b[11];
    out[12] = a[12] + b[12];
    out[13] = a[13] + b[13];
    out[14] = a[14] + b[14];
    out[15] = a[15] + b[15];
    return out;
  }
  function subtract2(out, a, b) {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    out[2] = a[2] - b[2];
    out[3] = a[3] - b[3];
    out[4] = a[4] - b[4];
    out[5] = a[5] - b[5];
    out[6] = a[6] - b[6];
    out[7] = a[7] - b[7];
    out[8] = a[8] - b[8];
    out[9] = a[9] - b[9];
    out[10] = a[10] - b[10];
    out[11] = a[11] - b[11];
    out[12] = a[12] - b[12];
    out[13] = a[13] - b[13];
    out[14] = a[14] - b[14];
    out[15] = a[15] - b[15];
    return out;
  }
  function multiplyScalar(out, a, b) {
    out[0] = a[0] * b;
    out[1] = a[1] * b;
    out[2] = a[2] * b;
    out[3] = a[3] * b;
    out[4] = a[4] * b;
    out[5] = a[5] * b;
    out[6] = a[6] * b;
    out[7] = a[7] * b;
    out[8] = a[8] * b;
    out[9] = a[9] * b;
    out[10] = a[10] * b;
    out[11] = a[11] * b;
    out[12] = a[12] * b;
    out[13] = a[13] * b;
    out[14] = a[14] * b;
    out[15] = a[15] * b;
    return out;
  }

  // node_modules/ogl/src/math/Mat4.js
  var Mat4 = class extends Array {
    constructor(m00 = 1, m01 = 0, m02 = 0, m03 = 0, m10 = 0, m11 = 1, m12 = 0, m13 = 0, m20 = 0, m21 = 0, m22 = 1, m23 = 0, m30 = 0, m31 = 0, m32 = 0, m33 = 1) {
      super(m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33);
      return this;
    }
    get x() {
      return this[12];
    }
    get y() {
      return this[13];
    }
    get z() {
      return this[14];
    }
    get w() {
      return this[15];
    }
    set x(v) {
      this[12] = v;
    }
    set y(v) {
      this[13] = v;
    }
    set z(v) {
      this[14] = v;
    }
    set w(v) {
      this[15] = v;
    }
    set(m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33) {
      if (m00.length) return this.copy(m00);
      set4(this, m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33);
      return this;
    }
    translate(v, m = this) {
      translate(this, m, v);
      return this;
    }
    rotate(v, axis, m = this) {
      rotate(this, m, v, axis);
      return this;
    }
    scale(v, m = this) {
      scale3(this, m, typeof v === "number" ? [v, v, v] : v);
      return this;
    }
    add(ma, mb) {
      if (mb) add3(this, ma, mb);
      else add3(this, this, ma);
      return this;
    }
    sub(ma, mb) {
      if (mb) subtract2(this, ma, mb);
      else subtract2(this, this, ma);
      return this;
    }
    multiply(ma, mb) {
      if (!ma.length) {
        multiplyScalar(this, this, ma);
      } else if (mb) {
        multiply3(this, ma, mb);
      } else {
        multiply3(this, this, ma);
      }
      return this;
    }
    identity() {
      identity2(this);
      return this;
    }
    copy(m) {
      copy4(this, m);
      return this;
    }
    fromPerspective({ fov, aspect, near, far } = {}) {
      perspective(this, fov, aspect, near, far);
      return this;
    }
    fromOrthogonal({ left, right, bottom, top, near, far }) {
      ortho(this, left, right, bottom, top, near, far);
      return this;
    }
    fromQuaternion(q) {
      fromQuat(this, q);
      return this;
    }
    setPosition(v) {
      this.x = v[0];
      this.y = v[1];
      this.z = v[2];
      return this;
    }
    inverse(m = this) {
      invert2(this, m);
      return this;
    }
    compose(q, pos, scale5) {
      compose(this, q, pos, scale5);
      return this;
    }
    decompose(q, pos, scale5) {
      decompose(this, q, pos, scale5);
      return this;
    }
    getRotation(q) {
      getRotation(q, this);
      return this;
    }
    getTranslation(pos) {
      getTranslation(pos, this);
      return this;
    }
    getScaling(scale5) {
      getScaling(scale5, this);
      return this;
    }
    getMaxScaleOnAxis() {
      return getMaxScaleOnAxis(this);
    }
    lookAt(eye, target, up) {
      targetTo(this, eye, target, up);
      return this;
    }
    determinant() {
      return determinant(this);
    }
    fromArray(a, o = 0) {
      this[0] = a[o];
      this[1] = a[o + 1];
      this[2] = a[o + 2];
      this[3] = a[o + 3];
      this[4] = a[o + 4];
      this[5] = a[o + 5];
      this[6] = a[o + 6];
      this[7] = a[o + 7];
      this[8] = a[o + 8];
      this[9] = a[o + 9];
      this[10] = a[o + 10];
      this[11] = a[o + 11];
      this[12] = a[o + 12];
      this[13] = a[o + 13];
      this[14] = a[o + 14];
      this[15] = a[o + 15];
      return this;
    }
    toArray(a = [], o = 0) {
      a[o] = this[0];
      a[o + 1] = this[1];
      a[o + 2] = this[2];
      a[o + 3] = this[3];
      a[o + 4] = this[4];
      a[o + 5] = this[5];
      a[o + 6] = this[6];
      a[o + 7] = this[7];
      a[o + 8] = this[8];
      a[o + 9] = this[9];
      a[o + 10] = this[10];
      a[o + 11] = this[11];
      a[o + 12] = this[12];
      a[o + 13] = this[13];
      a[o + 14] = this[14];
      a[o + 15] = this[15];
      return a;
    }
  };

  // node_modules/ogl/src/math/functions/EulerFunc.js
  function fromRotationMatrix(out, m, order = "YXZ") {
    if (order === "XYZ") {
      out[1] = Math.asin(Math.min(Math.max(m[8], -1), 1));
      if (Math.abs(m[8]) < 0.99999) {
        out[0] = Math.atan2(-m[9], m[10]);
        out[2] = Math.atan2(-m[4], m[0]);
      } else {
        out[0] = Math.atan2(m[6], m[5]);
        out[2] = 0;
      }
    } else if (order === "YXZ") {
      out[0] = Math.asin(-Math.min(Math.max(m[9], -1), 1));
      if (Math.abs(m[9]) < 0.99999) {
        out[1] = Math.atan2(m[8], m[10]);
        out[2] = Math.atan2(m[1], m[5]);
      } else {
        out[1] = Math.atan2(-m[2], m[0]);
        out[2] = 0;
      }
    } else if (order === "ZXY") {
      out[0] = Math.asin(Math.min(Math.max(m[6], -1), 1));
      if (Math.abs(m[6]) < 0.99999) {
        out[1] = Math.atan2(-m[2], m[10]);
        out[2] = Math.atan2(-m[4], m[5]);
      } else {
        out[1] = 0;
        out[2] = Math.atan2(m[1], m[0]);
      }
    } else if (order === "ZYX") {
      out[1] = Math.asin(-Math.min(Math.max(m[2], -1), 1));
      if (Math.abs(m[2]) < 0.99999) {
        out[0] = Math.atan2(m[6], m[10]);
        out[2] = Math.atan2(m[1], m[0]);
      } else {
        out[0] = 0;
        out[2] = Math.atan2(-m[4], m[5]);
      }
    } else if (order === "YZX") {
      out[2] = Math.asin(Math.min(Math.max(m[1], -1), 1));
      if (Math.abs(m[1]) < 0.99999) {
        out[0] = Math.atan2(-m[9], m[5]);
        out[1] = Math.atan2(-m[2], m[0]);
      } else {
        out[0] = 0;
        out[1] = Math.atan2(m[8], m[10]);
      }
    } else if (order === "XZY") {
      out[2] = Math.asin(-Math.min(Math.max(m[4], -1), 1));
      if (Math.abs(m[4]) < 0.99999) {
        out[0] = Math.atan2(m[6], m[5]);
        out[1] = Math.atan2(m[8], m[0]);
      } else {
        out[0] = Math.atan2(-m[9], m[10]);
        out[1] = 0;
      }
    }
    return out;
  }

  // node_modules/ogl/src/math/Euler.js
  var tmpMat4 = /* @__PURE__ */ new Mat4();
  var Euler = class extends Array {
    constructor(x = 0, y = x, z = x, order = "YXZ") {
      super(x, y, z);
      this.order = order;
      this.onChange = () => {
      };
      this._target = this;
      const triggerProps = ["0", "1", "2"];
      return new Proxy(this, {
        set(target, property) {
          const success = Reflect.set(...arguments);
          if (success && triggerProps.includes(property)) target.onChange();
          return success;
        }
      });
    }
    get x() {
      return this[0];
    }
    get y() {
      return this[1];
    }
    get z() {
      return this[2];
    }
    set x(v) {
      this._target[0] = v;
      this.onChange();
    }
    set y(v) {
      this._target[1] = v;
      this.onChange();
    }
    set z(v) {
      this._target[2] = v;
      this.onChange();
    }
    set(x, y = x, z = x) {
      if (x.length) return this.copy(x);
      this._target[0] = x;
      this._target[1] = y;
      this._target[2] = z;
      this.onChange();
      return this;
    }
    copy(v) {
      this._target[0] = v[0];
      this._target[1] = v[1];
      this._target[2] = v[2];
      this.onChange();
      return this;
    }
    reorder(order) {
      this._target.order = order;
      this.onChange();
      return this;
    }
    fromRotationMatrix(m, order = this.order) {
      fromRotationMatrix(this._target, m, order);
      this.onChange();
      return this;
    }
    fromQuaternion(q, order = this.order, isInternal) {
      tmpMat4.fromQuaternion(q);
      this._target.fromRotationMatrix(tmpMat4, order);
      if (!isInternal) this.onChange();
      return this;
    }
    fromArray(a, o = 0) {
      this._target[0] = a[o];
      this._target[1] = a[o + 1];
      this._target[2] = a[o + 2];
      return this;
    }
    toArray(a = [], o = 0) {
      a[o] = this[0];
      a[o + 1] = this[1];
      a[o + 2] = this[2];
      return a;
    }
  };

  // node_modules/ogl/src/core/Transform.js
  var Transform = class {
    constructor() {
      this.parent = null;
      this.children = [];
      this.visible = true;
      this.matrix = new Mat4();
      this.worldMatrix = new Mat4();
      this.matrixAutoUpdate = true;
      this.worldMatrixNeedsUpdate = false;
      this.position = new Vec3();
      this.quaternion = new Quat();
      this.scale = new Vec3(1);
      this.rotation = new Euler();
      this.up = new Vec3(0, 1, 0);
      this.rotation._target.onChange = () => this.quaternion.fromEuler(this.rotation, true);
      this.quaternion._target.onChange = () => this.rotation.fromQuaternion(this.quaternion, void 0, true);
    }
    setParent(parent, notifyParent = true) {
      if (this.parent && parent !== this.parent) this.parent.removeChild(this, false);
      this.parent = parent;
      if (notifyParent && parent) parent.addChild(this, false);
    }
    addChild(child, notifyChild = true) {
      if (!~this.children.indexOf(child)) this.children.push(child);
      if (notifyChild) child.setParent(this, false);
    }
    removeChild(child, notifyChild = true) {
      if (!!~this.children.indexOf(child)) this.children.splice(this.children.indexOf(child), 1);
      if (notifyChild) child.setParent(null, false);
    }
    updateMatrixWorld(force) {
      if (this.matrixAutoUpdate) this.updateMatrix();
      if (this.worldMatrixNeedsUpdate || force) {
        if (this.parent === null) this.worldMatrix.copy(this.matrix);
        else this.worldMatrix.multiply(this.parent.worldMatrix, this.matrix);
        this.worldMatrixNeedsUpdate = false;
        force = true;
      }
      for (let i = 0, l = this.children.length; i < l; i++) {
        this.children[i].updateMatrixWorld(force);
      }
    }
    updateMatrix() {
      this.matrix.compose(this.quaternion, this.position, this.scale);
      this.worldMatrixNeedsUpdate = true;
    }
    traverse(callback) {
      if (callback(this)) return;
      for (let i = 0, l = this.children.length; i < l; i++) {
        this.children[i].traverse(callback);
      }
    }
    decompose() {
      this.matrix.decompose(this.quaternion._target, this.position, this.scale);
      this.rotation.fromQuaternion(this.quaternion);
    }
    lookAt(target, invert5 = false) {
      if (invert5) this.matrix.lookAt(this.position, target, this.up);
      else this.matrix.lookAt(target, this.position, this.up);
      this.matrix.getRotation(this.quaternion._target);
      this.rotation.fromQuaternion(this.quaternion);
    }
  };

  // node_modules/ogl/src/math/functions/Mat3Func.js
  function fromMat4(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[4];
    out[4] = a[5];
    out[5] = a[6];
    out[6] = a[8];
    out[7] = a[9];
    out[8] = a[10];
    return out;
  }
  function fromQuat2(out, q) {
    let x = q[0], y = q[1], z = q[2], w = q[3];
    let x2 = x + x;
    let y2 = y + y;
    let z2 = z + z;
    let xx = x * x2;
    let yx = y * x2;
    let yy = y * y2;
    let zx = z * x2;
    let zy = z * y2;
    let zz = z * z2;
    let wx = w * x2;
    let wy = w * y2;
    let wz = w * z2;
    out[0] = 1 - yy - zz;
    out[3] = yx - wz;
    out[6] = zx + wy;
    out[1] = yx + wz;
    out[4] = 1 - xx - zz;
    out[7] = zy - wx;
    out[2] = zx - wy;
    out[5] = zy + wx;
    out[8] = 1 - xx - yy;
    return out;
  }
  function copy5(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    return out;
  }
  function set5(out, m00, m01, m02, m10, m11, m12, m20, m21, m22) {
    out[0] = m00;
    out[1] = m01;
    out[2] = m02;
    out[3] = m10;
    out[4] = m11;
    out[5] = m12;
    out[6] = m20;
    out[7] = m21;
    out[8] = m22;
    return out;
  }
  function identity3(out) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 1;
    out[5] = 0;
    out[6] = 0;
    out[7] = 0;
    out[8] = 1;
    return out;
  }
  function invert3(out, a) {
    let a00 = a[0], a01 = a[1], a02 = a[2];
    let a10 = a[3], a11 = a[4], a12 = a[5];
    let a20 = a[6], a21 = a[7], a22 = a[8];
    let b01 = a22 * a11 - a12 * a21;
    let b11 = -a22 * a10 + a12 * a20;
    let b21 = a21 * a10 - a11 * a20;
    let det = a00 * b01 + a01 * b11 + a02 * b21;
    if (!det) {
      return null;
    }
    det = 1 / det;
    out[0] = b01 * det;
    out[1] = (-a22 * a01 + a02 * a21) * det;
    out[2] = (a12 * a01 - a02 * a11) * det;
    out[3] = b11 * det;
    out[4] = (a22 * a00 - a02 * a20) * det;
    out[5] = (-a12 * a00 + a02 * a10) * det;
    out[6] = b21 * det;
    out[7] = (-a21 * a00 + a01 * a20) * det;
    out[8] = (a11 * a00 - a01 * a10) * det;
    return out;
  }
  function multiply4(out, a, b) {
    let a00 = a[0], a01 = a[1], a02 = a[2];
    let a10 = a[3], a11 = a[4], a12 = a[5];
    let a20 = a[6], a21 = a[7], a22 = a[8];
    let b00 = b[0], b01 = b[1], b02 = b[2];
    let b10 = b[3], b11 = b[4], b12 = b[5];
    let b20 = b[6], b21 = b[7], b22 = b[8];
    out[0] = b00 * a00 + b01 * a10 + b02 * a20;
    out[1] = b00 * a01 + b01 * a11 + b02 * a21;
    out[2] = b00 * a02 + b01 * a12 + b02 * a22;
    out[3] = b10 * a00 + b11 * a10 + b12 * a20;
    out[4] = b10 * a01 + b11 * a11 + b12 * a21;
    out[5] = b10 * a02 + b11 * a12 + b12 * a22;
    out[6] = b20 * a00 + b21 * a10 + b22 * a20;
    out[7] = b20 * a01 + b21 * a11 + b22 * a21;
    out[8] = b20 * a02 + b21 * a12 + b22 * a22;
    return out;
  }
  function translate2(out, a, v) {
    let a00 = a[0], a01 = a[1], a02 = a[2], a10 = a[3], a11 = a[4], a12 = a[5], a20 = a[6], a21 = a[7], a22 = a[8], x = v[0], y = v[1];
    out[0] = a00;
    out[1] = a01;
    out[2] = a02;
    out[3] = a10;
    out[4] = a11;
    out[5] = a12;
    out[6] = x * a00 + y * a10 + a20;
    out[7] = x * a01 + y * a11 + a21;
    out[8] = x * a02 + y * a12 + a22;
    return out;
  }
  function rotate2(out, a, rad) {
    let a00 = a[0], a01 = a[1], a02 = a[2], a10 = a[3], a11 = a[4], a12 = a[5], a20 = a[6], a21 = a[7], a22 = a[8], s = Math.sin(rad), c = Math.cos(rad);
    out[0] = c * a00 + s * a10;
    out[1] = c * a01 + s * a11;
    out[2] = c * a02 + s * a12;
    out[3] = c * a10 - s * a00;
    out[4] = c * a11 - s * a01;
    out[5] = c * a12 - s * a02;
    out[6] = a20;
    out[7] = a21;
    out[8] = a22;
    return out;
  }
  function scale4(out, a, v) {
    let x = v[0], y = v[1];
    out[0] = x * a[0];
    out[1] = x * a[1];
    out[2] = x * a[2];
    out[3] = y * a[3];
    out[4] = y * a[4];
    out[5] = y * a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    return out;
  }
  function normalFromMat4(out, a) {
    let a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    let a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    let a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    let a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
    let b00 = a00 * a11 - a01 * a10;
    let b01 = a00 * a12 - a02 * a10;
    let b02 = a00 * a13 - a03 * a10;
    let b03 = a01 * a12 - a02 * a11;
    let b04 = a01 * a13 - a03 * a11;
    let b05 = a02 * a13 - a03 * a12;
    let b06 = a20 * a31 - a21 * a30;
    let b07 = a20 * a32 - a22 * a30;
    let b08 = a20 * a33 - a23 * a30;
    let b09 = a21 * a32 - a22 * a31;
    let b10 = a21 * a33 - a23 * a31;
    let b11 = a22 * a33 - a23 * a32;
    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (!det) {
      return null;
    }
    det = 1 / det;
    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[2] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[3] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[4] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[5] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[6] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[7] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[8] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    return out;
  }

  // node_modules/ogl/src/math/Mat3.js
  var Mat3 = class extends Array {
    constructor(m00 = 1, m01 = 0, m02 = 0, m10 = 0, m11 = 1, m12 = 0, m20 = 0, m21 = 0, m22 = 1) {
      super(m00, m01, m02, m10, m11, m12, m20, m21, m22);
      return this;
    }
    set(m00, m01, m02, m10, m11, m12, m20, m21, m22) {
      if (m00.length) return this.copy(m00);
      set5(this, m00, m01, m02, m10, m11, m12, m20, m21, m22);
      return this;
    }
    translate(v, m = this) {
      translate2(this, m, v);
      return this;
    }
    rotate(v, m = this) {
      rotate2(this, m, v);
      return this;
    }
    scale(v, m = this) {
      scale4(this, m, v);
      return this;
    }
    multiply(ma, mb) {
      if (mb) {
        multiply4(this, ma, mb);
      } else {
        multiply4(this, this, ma);
      }
      return this;
    }
    identity() {
      identity3(this);
      return this;
    }
    copy(m) {
      copy5(this, m);
      return this;
    }
    fromMatrix4(m) {
      fromMat4(this, m);
      return this;
    }
    fromQuaternion(q) {
      fromQuat2(this, q);
      return this;
    }
    fromBasis(vec3a, vec3b, vec3c) {
      this.set(vec3a[0], vec3a[1], vec3a[2], vec3b[0], vec3b[1], vec3b[2], vec3c[0], vec3c[1], vec3c[2]);
      return this;
    }
    inverse(m = this) {
      invert3(this, m);
      return this;
    }
    getNormalMatrix(m) {
      normalFromMat4(this, m);
      return this;
    }
  };

  // node_modules/ogl/src/core/Mesh.js
  var ID4 = 0;
  var Mesh = class extends Transform {
    constructor(gl, { geometry, program, mode = gl.TRIANGLES, frustumCulled = true, renderOrder = 0 } = {}) {
      super();
      if (!gl.canvas) console.error("gl not passed as first argument to Mesh");
      this.gl = gl;
      this.id = ID4++;
      this.geometry = geometry;
      this.program = program;
      this.mode = mode;
      this.frustumCulled = frustumCulled;
      this.renderOrder = renderOrder;
      this.modelViewMatrix = new Mat4();
      this.normalMatrix = new Mat3();
      this.beforeRenderCallbacks = [];
      this.afterRenderCallbacks = [];
    }
    onBeforeRender(f) {
      this.beforeRenderCallbacks.push(f);
      return this;
    }
    onAfterRender(f) {
      this.afterRenderCallbacks.push(f);
      return this;
    }
    draw({ camera } = {}) {
      if (camera) {
        if (!this.program.uniforms.modelMatrix) {
          Object.assign(this.program.uniforms, {
            modelMatrix: { value: null },
            viewMatrix: { value: null },
            modelViewMatrix: { value: null },
            normalMatrix: { value: null },
            projectionMatrix: { value: null },
            cameraPosition: { value: null }
          });
        }
        this.program.uniforms.projectionMatrix.value = camera.projectionMatrix;
        this.program.uniforms.cameraPosition.value = camera.worldPosition;
        this.program.uniforms.viewMatrix.value = camera.viewMatrix;
        this.modelViewMatrix.multiply(camera.viewMatrix, this.worldMatrix);
        this.normalMatrix.getNormalMatrix(this.modelViewMatrix);
        this.program.uniforms.modelMatrix.value = this.worldMatrix;
        this.program.uniforms.modelViewMatrix.value = this.modelViewMatrix;
        this.program.uniforms.normalMatrix.value = this.normalMatrix;
      }
      this.beforeRenderCallbacks.forEach((f) => f && f({ mesh: this, camera }));
      let flipFaces = this.program.cullFace && this.worldMatrix.determinant() < 0;
      this.program.use({ flipFaces });
      this.geometry.draw({ mode: this.mode, program: this.program });
      this.afterRenderCallbacks.forEach((f) => f && f({ mesh: this, camera }));
    }
  };

  // node_modules/ogl/src/core/Texture.js
  var emptyPixel = new Uint8Array(4);
  function isPowerOf2(value) {
    return (value & value - 1) === 0;
  }
  var ID5 = 1;
  var Texture = class {
    constructor(gl, {
      image,
      target = gl.TEXTURE_2D,
      type = gl.UNSIGNED_BYTE,
      format = gl.RGBA,
      internalFormat = format,
      wrapS = gl.CLAMP_TO_EDGE,
      wrapT = gl.CLAMP_TO_EDGE,
      wrapR = gl.CLAMP_TO_EDGE,
      generateMipmaps = target === (gl.TEXTURE_2D || gl.TEXTURE_CUBE_MAP),
      minFilter = generateMipmaps ? gl.NEAREST_MIPMAP_LINEAR : gl.LINEAR,
      magFilter = gl.LINEAR,
      premultiplyAlpha = false,
      unpackAlignment = 4,
      flipY = target == (gl.TEXTURE_2D || gl.TEXTURE_3D) ? true : false,
      anisotropy = 0,
      level = 0,
      width,
      // used for RenderTargets or Data Textures
      height = width,
      length: length3 = 1
    } = {}) {
      this.gl = gl;
      this.id = ID5++;
      this.image = image;
      this.target = target;
      this.type = type;
      this.format = format;
      this.internalFormat = internalFormat;
      this.minFilter = minFilter;
      this.magFilter = magFilter;
      this.wrapS = wrapS;
      this.wrapT = wrapT;
      this.wrapR = wrapR;
      this.generateMipmaps = generateMipmaps;
      this.premultiplyAlpha = premultiplyAlpha;
      this.unpackAlignment = unpackAlignment;
      this.flipY = flipY;
      this.anisotropy = Math.min(anisotropy, this.gl.renderer.parameters.maxAnisotropy);
      this.level = level;
      this.width = width;
      this.height = height;
      this.length = length3;
      this.texture = this.gl.createTexture();
      this.store = {
        image: null
      };
      this.glState = this.gl.renderer.state;
      this.state = {};
      this.state.minFilter = this.gl.NEAREST_MIPMAP_LINEAR;
      this.state.magFilter = this.gl.LINEAR;
      this.state.wrapS = this.gl.REPEAT;
      this.state.wrapT = this.gl.REPEAT;
      this.state.anisotropy = 0;
    }
    bind() {
      if (this.glState.textureUnits[this.glState.activeTextureUnit] === this.id) return;
      this.gl.bindTexture(this.target, this.texture);
      this.glState.textureUnits[this.glState.activeTextureUnit] = this.id;
    }
    update(textureUnit = 0) {
      const needsUpdate = !(this.image === this.store.image && !this.needsUpdate);
      if (needsUpdate || this.glState.textureUnits[textureUnit] !== this.id) {
        this.gl.renderer.activeTexture(textureUnit);
        this.bind();
      }
      if (!needsUpdate) return;
      this.needsUpdate = false;
      if (this.flipY !== this.glState.flipY) {
        this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, this.flipY);
        this.glState.flipY = this.flipY;
      }
      if (this.premultiplyAlpha !== this.glState.premultiplyAlpha) {
        this.gl.pixelStorei(this.gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, this.premultiplyAlpha);
        this.glState.premultiplyAlpha = this.premultiplyAlpha;
      }
      if (this.unpackAlignment !== this.glState.unpackAlignment) {
        this.gl.pixelStorei(this.gl.UNPACK_ALIGNMENT, this.unpackAlignment);
        this.glState.unpackAlignment = this.unpackAlignment;
      }
      if (this.minFilter !== this.state.minFilter) {
        this.gl.texParameteri(this.target, this.gl.TEXTURE_MIN_FILTER, this.minFilter);
        this.state.minFilter = this.minFilter;
      }
      if (this.magFilter !== this.state.magFilter) {
        this.gl.texParameteri(this.target, this.gl.TEXTURE_MAG_FILTER, this.magFilter);
        this.state.magFilter = this.magFilter;
      }
      if (this.wrapS !== this.state.wrapS) {
        this.gl.texParameteri(this.target, this.gl.TEXTURE_WRAP_S, this.wrapS);
        this.state.wrapS = this.wrapS;
      }
      if (this.wrapT !== this.state.wrapT) {
        this.gl.texParameteri(this.target, this.gl.TEXTURE_WRAP_T, this.wrapT);
        this.state.wrapT = this.wrapT;
      }
      if (this.wrapR !== this.state.wrapR) {
        this.gl.texParameteri(this.target, this.gl.TEXTURE_WRAP_R, this.wrapR);
        this.state.wrapR = this.wrapR;
      }
      if (this.anisotropy && this.anisotropy !== this.state.anisotropy) {
        this.gl.texParameterf(this.target, this.gl.renderer.getExtension("EXT_texture_filter_anisotropic").TEXTURE_MAX_ANISOTROPY_EXT, this.anisotropy);
        this.state.anisotropy = this.anisotropy;
      }
      if (this.image) {
        if (this.image.width) {
          this.width = this.image.width;
          this.height = this.image.height;
        }
        if (this.target === this.gl.TEXTURE_CUBE_MAP) {
          for (let i = 0; i < 6; i++) {
            this.gl.texImage2D(this.gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, this.level, this.internalFormat, this.format, this.type, this.image[i]);
          }
        } else if (ArrayBuffer.isView(this.image)) {
          if (this.target === this.gl.TEXTURE_2D) {
            this.gl.texImage2D(this.target, this.level, this.internalFormat, this.width, this.height, 0, this.format, this.type, this.image);
          } else if (this.target === this.gl.TEXTURE_2D_ARRAY || this.target === this.gl.TEXTURE_3D) {
            this.gl.texImage3D(this.target, this.level, this.internalFormat, this.width, this.height, this.length, 0, this.format, this.type, this.image);
          }
        } else if (this.image.isCompressedTexture) {
          for (let level = 0; level < this.image.length; level++) {
            this.gl.compressedTexImage2D(this.target, level, this.internalFormat, this.image[level].width, this.image[level].height, 0, this.image[level].data);
          }
        } else {
          if (this.target === this.gl.TEXTURE_2D) {
            this.gl.texImage2D(this.target, this.level, this.internalFormat, this.format, this.type, this.image);
          } else {
            this.gl.texImage3D(this.target, this.level, this.internalFormat, this.width, this.height, this.length, 0, this.format, this.type, this.image);
          }
        }
        if (this.generateMipmaps) {
          if (!this.gl.renderer.isWebgl2 && (!isPowerOf2(this.image.width) || !isPowerOf2(this.image.height))) {
            this.generateMipmaps = false;
            this.wrapS = this.wrapT = this.gl.CLAMP_TO_EDGE;
            this.minFilter = this.gl.LINEAR;
          } else {
            this.gl.generateMipmap(this.target);
          }
        }
        this.onUpdate && this.onUpdate();
      } else {
        if (this.target === this.gl.TEXTURE_CUBE_MAP) {
          for (let i = 0; i < 6; i++) {
            this.gl.texImage2D(this.gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, this.gl.RGBA, 1, 1, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, emptyPixel);
          }
        } else if (this.width) {
          if (this.target === this.gl.TEXTURE_2D) {
            this.gl.texImage2D(this.target, this.level, this.internalFormat, this.width, this.height, 0, this.format, this.type, null);
          } else {
            this.gl.texImage3D(this.target, this.level, this.internalFormat, this.width, this.height, this.length, 0, this.format, this.type, null);
          }
        } else {
          this.gl.texImage2D(this.target, 0, this.gl.RGBA, 1, 1, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, emptyPixel);
        }
      }
      this.store.image = this.image;
    }
  };

  // node_modules/ogl/src/core/RenderTarget.js
  var RenderTarget = class {
    constructor(gl, {
      width = gl.canvas.width,
      height = gl.canvas.height,
      target = gl.FRAMEBUFFER,
      color = 1,
      // number of color attachments
      depth = true,
      stencil = false,
      depthTexture = false,
      wrapS = gl.CLAMP_TO_EDGE,
      wrapT = gl.CLAMP_TO_EDGE,
      wrapR = gl.CLAMP_TO_EDGE,
      minFilter = gl.LINEAR,
      magFilter = minFilter,
      type = gl.UNSIGNED_BYTE,
      format = gl.RGBA,
      internalFormat = format,
      unpackAlignment,
      premultiplyAlpha
    } = {}) {
      this.gl = gl;
      this.width = width;
      this.height = height;
      this.depth = depth;
      this.stencil = stencil;
      this.buffer = this.gl.createFramebuffer();
      this.target = target;
      this.gl.renderer.bindFramebuffer(this);
      this.textures = [];
      const drawBuffers = [];
      for (let i = 0; i < color; i++) {
        this.textures.push(
          new Texture(gl, {
            width,
            height,
            wrapS,
            wrapT,
            wrapR,
            minFilter,
            magFilter,
            type,
            format,
            internalFormat,
            unpackAlignment,
            premultiplyAlpha,
            flipY: false,
            generateMipmaps: false
          })
        );
        this.textures[i].update();
        this.gl.framebufferTexture2D(
          this.target,
          this.gl.COLOR_ATTACHMENT0 + i,
          this.gl.TEXTURE_2D,
          this.textures[i].texture,
          0
          /* level */
        );
        drawBuffers.push(this.gl.COLOR_ATTACHMENT0 + i);
      }
      if (drawBuffers.length > 1) this.gl.renderer.drawBuffers(drawBuffers);
      this.texture = this.textures[0];
      if (depthTexture && (this.gl.renderer.isWebgl2 || this.gl.renderer.getExtension("WEBGL_depth_texture"))) {
        this.depthTexture = new Texture(gl, {
          width,
          height,
          minFilter: this.gl.NEAREST,
          magFilter: this.gl.NEAREST,
          format: this.stencil ? this.gl.DEPTH_STENCIL : this.gl.DEPTH_COMPONENT,
          internalFormat: gl.renderer.isWebgl2 ? this.stencil ? this.gl.DEPTH24_STENCIL8 : this.gl.DEPTH_COMPONENT16 : this.gl.DEPTH_COMPONENT,
          type: this.stencil ? this.gl.UNSIGNED_INT_24_8 : this.gl.UNSIGNED_INT
        });
        this.depthTexture.update();
        this.gl.framebufferTexture2D(
          this.target,
          this.stencil ? this.gl.DEPTH_STENCIL_ATTACHMENT : this.gl.DEPTH_ATTACHMENT,
          this.gl.TEXTURE_2D,
          this.depthTexture.texture,
          0
          /* level */
        );
      } else {
        if (depth && !stencil) {
          this.depthBuffer = this.gl.createRenderbuffer();
          this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, this.depthBuffer);
          this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.DEPTH_COMPONENT16, width, height);
          this.gl.framebufferRenderbuffer(this.target, this.gl.DEPTH_ATTACHMENT, this.gl.RENDERBUFFER, this.depthBuffer);
        }
        if (stencil && !depth) {
          this.stencilBuffer = this.gl.createRenderbuffer();
          this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, this.stencilBuffer);
          this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.STENCIL_INDEX8, width, height);
          this.gl.framebufferRenderbuffer(this.target, this.gl.STENCIL_ATTACHMENT, this.gl.RENDERBUFFER, this.stencilBuffer);
        }
        if (depth && stencil) {
          this.depthStencilBuffer = this.gl.createRenderbuffer();
          this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, this.depthStencilBuffer);
          this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.DEPTH_STENCIL, width, height);
          this.gl.framebufferRenderbuffer(this.target, this.gl.DEPTH_STENCIL_ATTACHMENT, this.gl.RENDERBUFFER, this.depthStencilBuffer);
        }
      }
      this.gl.renderer.bindFramebuffer({ target: this.target });
    }
    setSize(width, height) {
      if (this.width === width && this.height === height) return;
      this.width = width;
      this.height = height;
      this.gl.renderer.bindFramebuffer(this);
      for (let i = 0; i < this.textures.length; i++) {
        this.textures[i].width = width;
        this.textures[i].height = height;
        this.textures[i].needsUpdate = true;
        this.textures[i].update();
        this.gl.framebufferTexture2D(
          this.target,
          this.gl.COLOR_ATTACHMENT0 + i,
          this.gl.TEXTURE_2D,
          this.textures[i].texture,
          0
          /* level */
        );
      }
      if (this.depthTexture) {
        this.depthTexture.width = width;
        this.depthTexture.height = height;
        this.depthTexture.needsUpdate = true;
        this.depthTexture.update();
        this.gl.framebufferTexture2D(
          this.target,
          this.gl.DEPTH_ATTACHMENT,
          this.gl.TEXTURE_2D,
          this.depthTexture.texture,
          0
          /* level */
        );
      } else {
        if (this.depthBuffer) {
          this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, this.depthBuffer);
          this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.DEPTH_COMPONENT16, width, height);
        }
        if (this.stencilBuffer) {
          this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, this.stencilBuffer);
          this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.STENCIL_INDEX8, width, height);
        }
        if (this.depthStencilBuffer) {
          this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, this.depthStencilBuffer);
          this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.DEPTH_STENCIL, width, height);
        }
      }
      this.gl.renderer.bindFramebuffer({ target: this.target });
    }
  };

  // node_modules/ogl/src/math/functions/ColorFunc.js
  var NAMES = {
    black: "#000000",
    white: "#ffffff",
    red: "#ff0000",
    green: "#00ff00",
    blue: "#0000ff",
    fuchsia: "#ff00ff",
    cyan: "#00ffff",
    yellow: "#ffff00",
    orange: "#ff8000"
  };
  function hexToRGB(hex) {
    if (hex.length === 4) hex = hex[0] + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
    const rgb = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!rgb) console.warn(`Unable to convert hex string ${hex} to rgb values`);
    return [parseInt(rgb[1], 16) / 255, parseInt(rgb[2], 16) / 255, parseInt(rgb[3], 16) / 255];
  }
  function numberToRGB(num) {
    num = parseInt(num);
    return [(num >> 16 & 255) / 255, (num >> 8 & 255) / 255, (num & 255) / 255];
  }
  function parseColor(color) {
    if (color === void 0) return [0, 0, 0];
    if (arguments.length === 3) return arguments;
    if (!isNaN(color)) return numberToRGB(color);
    if (color[0] === "#") return hexToRGB(color);
    if (NAMES[color.toLowerCase()]) return hexToRGB(NAMES[color.toLowerCase()]);
    console.warn("Color format not recognised");
    return [0, 0, 0];
  }

  // node_modules/ogl/src/math/Color.js
  var Color = class extends Array {
    constructor(color) {
      if (Array.isArray(color)) return super(...color);
      return super(...parseColor(...arguments));
    }
    get r() {
      return this[0];
    }
    get g() {
      return this[1];
    }
    get b() {
      return this[2];
    }
    set r(v) {
      this[0] = v;
    }
    set g(v) {
      this[1] = v;
    }
    set b(v) {
      this[2] = v;
    }
    set(color) {
      if (Array.isArray(color)) return this.copy(color);
      return this.copy(parseColor(...arguments));
    }
    copy(v) {
      this[0] = v[0];
      this[1] = v[1];
      this[2] = v[2];
      return this;
    }
  };

  // node_modules/ogl/src/extras/Triangle.js
  var Triangle = class extends Geometry {
    constructor(gl, { attributes = {} } = {}) {
      Object.assign(attributes, {
        position: { size: 2, data: new Float32Array([-1, -1, 3, -1, -1, 3]) },
        uv: { size: 2, data: new Float32Array([0, 0, 2, 0, 0, 2]) }
      });
      super(gl, attributes);
    }
  };

  // src/features/courses/reactbits/micro-slats.ts
  var SWELL_PRESETS = {
    swell: {
      scale: 1.5,
      speed: 0.6,
      direction: 250,
      chop: 0.55,
      stretch: 0,
      glint: 0.7,
      contrast: 1.25,
      perspective: 0.55,
      fog: 0.55
    },
    tide: {
      scale: 1.3,
      speed: 0.5,
      direction: 262,
      chop: 0.2,
      stretch: 0.12,
      glint: 0.45,
      contrast: 1.1,
      perspective: 0.5,
      fog: 0.4
    },
    storm: {
      scale: 0.55,
      speed: 1.6,
      direction: 236,
      chop: 1,
      stretch: 0.3,
      glint: 1.3,
      contrast: 1.8,
      perspective: 0.8,
      fog: 0.35
    },
    signal: {
      scale: 0.85,
      speed: 1.2,
      direction: 180,
      chop: 0.6,
      stretch: 0.85,
      glint: 0.25,
      contrast: 1.2,
      perspective: 0,
      fog: 0
    }
  };
  var FLUID_SIZE = 96;
  var PRESSURE_STEPS = 16;
  var SPLAT_FORCE = 6900;
  var SPLASH_JETS = 3;
  var PIXEL_BUDGET = 45e5;
  var clamp2 = (value, min, max) => Math.min(Math.max(value, min), max);
  var parseColor2 = (doc, value, fallback) => {
    try {
      const ctx = doc.createElement("canvas").getContext("2d");
      if (!ctx) return fallback;
      ctx.fillStyle = "#000000";
      ctx.fillStyle = value;
      const resolved = ctx.fillStyle;
      if (resolved.startsWith("#")) {
        const n = parseInt(resolved.slice(1), 16);
        return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255, 1];
      }
      const parts = resolved.match(/[\d.]+/g);
      if (!parts || parts.length < 3) return fallback;
      return [Number(parts[0]) / 255, Number(parts[1]) / 255, Number(parts[2]) / 255, parts[3] ? Number(parts[3]) : 1];
    } catch {
      return fallback;
    }
  };
  var passVertex = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;
  var fluidVertex = `#version 300 es
in vec2 position;
uniform vec2 uTexel;
out vec2 vUv;
out vec2 vL;
out vec2 vR;
out vec2 vT;
out vec2 vB;
void main() {
  vUv = position * 0.5 + 0.5;
  vL = vUv - vec2(uTexel.x, 0.0);
  vR = vUv + vec2(uTexel.x, 0.0);
  vT = vUv + vec2(0.0, uTexel.y);
  vB = vUv - vec2(0.0, uTexel.y);
  gl_Position = vec4(position, 0.0, 1.0);
}
`;
  var fluidHead = `#version 300 es
precision highp float;
in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 fragColor;
`;
  var splatFragment = `${fluidHead}
uniform sampler2D uTarget;
uniform float uAspect;
uniform vec2 uPoint;
uniform vec3 uValue;
uniform float uRadius;
void main() {
  vec2 offset = vUv - uPoint;
  offset.x *= uAspect;
  float falloff = exp(-dot(offset, offset) / uRadius);
  fragColor = vec4(texture(uTarget, vUv).xyz + uValue * falloff, 1.0);
}
`;
  var curlFragment = `${fluidHead}
uniform sampler2D uVelocity;
void main() {
  float left = texture(uVelocity, vL).y;
  float right = texture(uVelocity, vR).y;
  float top = texture(uVelocity, vT).x;
  float bottom = texture(uVelocity, vB).x;
  fragColor = vec4(0.5 * (right - left - top + bottom), 0.0, 0.0, 1.0);
}
`;
  var vorticityFragment = `${fluidHead}
uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform float uSwirl;
uniform float uDt;
void main() {
  float left = texture(uCurl, vL).x;
  float right = texture(uCurl, vR).x;
  float top = texture(uCurl, vT).x;
  float bottom = texture(uCurl, vB).x;
  float middle = texture(uCurl, vUv).x;
  vec2 force = 0.5 * vec2(abs(top) - abs(bottom), abs(right) - abs(left));
  force = force / (length(force) + 0.0001) * uSwirl * middle;
  force.y = -force.y;
  vec2 velocity = texture(uVelocity, vUv).xy + force * uDt;
  fragColor = vec4(clamp(velocity, -1000.0, 1000.0), 0.0, 1.0);
}
`;
  var divergenceFragment = `${fluidHead}
uniform sampler2D uVelocity;
void main() {
  vec2 middle = texture(uVelocity, vUv).xy;
  float left = vL.x < 0.0 ? -middle.x : texture(uVelocity, vL).x;
  float right = vR.x > 1.0 ? -middle.x : texture(uVelocity, vR).x;
  float top = vT.y > 1.0 ? -middle.y : texture(uVelocity, vT).y;
  float bottom = vB.y < 0.0 ? -middle.y : texture(uVelocity, vB).y;
  fragColor = vec4(0.5 * (right - left + top - bottom), 0.0, 0.0, 1.0);
}
`;
  var pressureFragment = `${fluidHead}
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
void main() {
  float left = texture(uPressure, vL).x;
  float right = texture(uPressure, vR).x;
  float top = texture(uPressure, vT).x;
  float bottom = texture(uPressure, vB).x;
  float divergence = texture(uDivergence, vUv).x;
  fragColor = vec4((left + right + top + bottom - divergence) * 0.25, 0.0, 0.0, 1.0);
}
`;
  var projectFragment = `${fluidHead}
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
void main() {
  float left = texture(uPressure, vL).x;
  float right = texture(uPressure, vR).x;
  float top = texture(uPressure, vT).x;
  float bottom = texture(uPressure, vB).x;
  vec2 velocity = texture(uVelocity, vUv).xy - vec2(right - left, top - bottom);
  fragColor = vec4(velocity, 0.0, 1.0);
}
`;
  var advectFragment = `${fluidHead}
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 uTexel;
uniform float uDt;
uniform float uFade;
void main() {
  vec2 from = vUv - uDt * texture(uVelocity, vUv).xy * uTexel;
  fragColor = texture(uSource, from) / (1.0 + uFade * uDt);
}
`;
  var scaleFragment = `${fluidHead}
uniform sampler2D uSource;
uniform float uValue;
void main() {
  fragColor = texture(uSource, vUv) * uValue;
}
`;
  var fieldFragment = `#version 300 es
precision highp float;
uniform vec2 uSize;
uniform vec4 uGrid;
uniform vec2 uOrigin;
uniform vec2 uSlat;
uniform float uTime;
uniform float uScale;
uniform float uDirection;
uniform float uChop;
uniform float uStretch;
uniform float uGlint;
uniform float uContrast;
uniform float uPerspective;
uniform float uFog;
uniform float uIntro;
uniform sampler2D tVelocity;
uniform sampler2D tInk;
uniform vec2 uFluidTexel;
uniform float uFluid;
uniform float uInk;
uniform float uLean;
out vec4 fragColor;

const float TURN[4] = float[4](0.0, -0.95, 0.78, 1.62);
const float LENGTH[4] = float[4](2.6, 1.7, 1.12, 0.76);
const float HEIGHT[4] = float[4](1.0, 0.75, 0.5, 0.3);
const float SHIFT[4] = float[4](0.0, 2.3, 4.1, 1.1);

void main() {
  vec2 cell = floor(gl_FragCoord.xy);
  float row = uGrid.y - 1.0 - cell.y;
  vec2 center = uOrigin + vec2(cell.x, row) * uGrid.zw + uSlat * 0.5;
  float v = clamp(center.y / uSize.y, 0.0, 1.0);

  vec2 flow = vec2(0.0);
  float ink = 0.0;
  if (uFluid > 0.5) {
    vec2 fluidUv = clamp(vec2(center.x / uSize.x, 1.0 - center.y / uSize.y), 0.0, 1.0);
    flow = texture(tVelocity, fluidUv).xy * uFluidTexel * uSize;
    ink = texture(tInk, fluidUv).x;
  }

  float horizon = mix(8.0, 0.5, uPerspective);
  float depth = (1.0 + horizon) / (v + horizon);
  vec2 world = vec2((center.x - uSize.x * 0.5) / uSize.y * depth, (depth - 1.0) * horizon * 2.2);
  world -= flow * 0.00018 * depth;
  world /= max(uScale, 0.05);

  float meander = 0.55 * sin(dot(world, vec2(0.23, 0.41)) * 0.9 + uTime * 0.13)
    + 0.3 * sin(dot(world, vec2(-0.37, 0.19)) * 1.4 - uTime * 0.09);

  float steep = uChop * 0.45;
  float height = 0.0;
  float total = 0.0;
  for (int i = 0; i < 4; i++) {
    float angle = uDirection + TURN[i];
    vec2 heading = vec2(cos(angle), sin(angle));
    float k = 6.2831853 / LENGTH[i];
    float omega = sqrt(9.81 * k) * 0.35;
    float theta = k * dot(world, heading) - omega * uTime + SHIFT[i] + meander * (0.6 + 0.3 * float(i));
    height += HEIGHT[i] * (cos(theta) + steep * cos(2.0 * theta));
    total += HEIGHT[i] * (1.0 + steep);
  }
  float level = clamp(0.5 + 0.5 * height / (total * 0.85), 0.0, 1.0);
  float crest = smoothstep(0.6, 1.0, level);
  float glint = crest * crest * uGlint;

  float haze = mix(1.0, 1.0 - uFog, pow(1.0 - v, 1.4));
  float light = (pow(level, uContrast) + glint * 0.8) * haze;
  float glow = 1.0 - exp(-max(ink, 0.0) * uInk * 1.6);
  light = 1.0 - (1.0 - clamp(light, 0.0, 1.0)) * (1.0 - glow);

  float front = uIntro * 1.35;
  float reveal = 1.0 - smoothstep(front - 0.35, front, v);
  float sweep = exp(-pow((v - front + 0.22) / 0.07, 2.0)) * (1.0 - uIntro);
  light = (light + sweep * 0.8) * reveal;
  light = max(light, 0.045 * reveal);
  float span = mix(1.0 - uStretch, 1.0, level) + glow * 0.3;
  span = clamp(span, 0.08, 1.0) * mix(0.1, 1.0, reveal);
  float tint = clamp(max(glint * 1.4, glow * 0.9) + sweep, 0.0, 1.0);
  float lean = clamp(flow.x / 1400.0, -1.0, 1.0) * uLean * reveal;

  fragColor = vec4(clamp(light, 0.0, 1.0), span, tint, 0.5 + 0.5 * lean);
}
`;
  var slatFragment = `#version 300 es
precision highp float;
uniform sampler2D tField;
uniform vec2 uSize;
uniform float uDpr;
uniform vec4 uGrid;
uniform vec2 uOrigin;
uniform vec2 uSlat;
uniform float uRound;
uniform float uTilt;
uniform vec3 uColor;
uniform vec3 uGlintColor;
uniform vec4 uBackground;
out vec4 fragColor;

float pill(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uSize.y * uDpr - gl_FragCoord.y) / uDpr;
  vec2 local = p - uOrigin;
  vec2 cell = floor(local / uGrid.zw);
  vec4 background = vec4(uBackground.rgb * uBackground.a, uBackground.a);
  vec4 slat = vec4(0.0);
  int reach = uTilt > 0.0 ? 1 : 0;
  for (int dx = -1; dx <= 1; dx++) {
    if (abs(dx) > reach) continue;
    vec2 neighbour = cell + vec2(float(dx), 0.0);
    if (neighbour.x < 0.0 || neighbour.y < 0.0 || neighbour.x >= uGrid.x || neighbour.y >= uGrid.y) continue;
    vec4 field = texelFetch(tField, ivec2(int(neighbour.x), int(uGrid.y - 1.0 - neighbour.y)), 0);
    vec2 offset = local - neighbour * uGrid.zw - uSlat * 0.5;
    float angle = (field.a - 0.5) * 2.0 * uTilt;
    float c = cos(angle);
    float s = sin(angle);
    vec2 turned = vec2(c * offset.x + s * offset.y, c * offset.y - s * offset.x);
    vec2 halfSize = vec2(uSlat.x * 0.5, uSlat.y * 0.5 * field.g);
    float radius = uRound * min(halfSize.x, halfSize.y);
    float alpha = clamp(0.5 - pill(turned, halfSize, radius) * uDpr, 0.0, 1.0) * field.r;
    if (alpha > slat.a) slat = vec4(mix(uColor, uGlintColor, field.b) * alpha, alpha);
  }
  fragColor = slat + background * (1.0 - slat.a);
}
`;
  var mountMicroSlats = (root) => {
    if (!canRunEffects(root)) return null;
    const win = windowOf(root);
    const doc = root.ownerDocument;
    if (!win) return null;
    const base = SWELL_PRESETS.swell;
    const pick = (value, key) => value === void 0 || value === null ? base[key] : value;
    const settings = {
      color: parseColor2(doc, "#A855F7", [0.66, 0.33, 0.97, 1]),
      glintColor: parseColor2(doc, "#ffffff", [1, 1, 1, 1]),
      backgroundColor: parseColor2(doc, "#000000", [0, 0, 0, 1]),
      slatWidth: 10,
      slatHeight: 25,
      gap: 3,
      roundness: 0.75,
      scale: pick(void 0, "scale"),
      speed: pick(void 0, "speed"),
      direction: pick(void 0, "direction"),
      chop: pick(void 0, "chop"),
      stretch: pick(void 0, "stretch"),
      glint: pick(void 0, "glint"),
      contrast: pick(void 0, "contrast"),
      perspective: pick(void 0, "perspective"),
      fog: pick(void 0, "fog"),
      interactive: true,
      cursorStrength: 1,
      cursorSize: 40,
      swirl: 0,
      trail: 1.4,
      lean: 0,
      intro: true,
      introDuration: 1.5,
      paused: false
    };
    let renderer;
    try {
      renderer = new Renderer({ canvas: doc.createElement("canvas"), alpha: true, premultipliedAlpha: true, antialias: false, depth: false });
    } catch {
      return null;
    }
    const gl = renderer.gl;
    if (!renderer.isWebgl2) {
      try {
        gl.getExtension("WEBGL_lose_context")?.loseContext();
      } catch {
      }
      return null;
    }
    const gl2 = gl;
    gl.clearColor(0, 0, 0, 0);
    const canvas = gl.canvas;
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.position = "absolute";
    canvas.style.inset = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    canvas.style.pointerEvents = "none";
    root.appendChild(canvas);
    const geometry = new Triangle(gl);
    const blank = new Texture(gl);
    const floatTargets = !!(gl.getExtension("EXT_color_buffer_float") || gl.getExtension("EXT_color_buffer_half_float"));
    const dispose = (target) => {
      gl.deleteFramebuffer(target.buffer);
      gl.deleteTexture(target.texture.texture);
    };
    let fieldTarget = new RenderTarget(gl, {
      width: 1,
      height: 1,
      depth: false,
      minFilter: gl.NEAREST,
      magFilter: gl.NEAREST
    });
    const fieldUniforms = {
      uSize: { value: [1, 1] },
      uGrid: { value: [1, 1, 1, 1] },
      uOrigin: { value: [0, 0] },
      uSlat: { value: [1, 1] },
      uTime: { value: 0 },
      uScale: { value: 1 },
      uDirection: { value: 0 },
      uChop: { value: 0.5 },
      uStretch: { value: 0.3 },
      uGlint: { value: 1 },
      uContrast: { value: 1 },
      uPerspective: { value: 0.7 },
      uFog: { value: 0.5 },
      uIntro: { value: 0 },
      tVelocity: { value: blank },
      tInk: { value: blank },
      uFluidTexel: { value: [1, 1] },
      uFluid: { value: 0 },
      uInk: { value: 1 },
      uLean: { value: 0.5 }
    };
    const fieldMesh = new Mesh(gl, {
      geometry,
      program: new Program(gl, {
        vertex: passVertex,
        fragment: fieldFragment,
        uniforms: fieldUniforms,
        depthTest: false,
        depthWrite: false
      })
    });
    const slatUniforms = {
      tField: { value: fieldTarget.texture },
      uSize: { value: [1, 1] },
      uDpr: { value: 1 },
      uGrid: { value: [1, 1, 1, 1] },
      uOrigin: { value: [0, 0] },
      uSlat: { value: [1, 1] },
      uRound: { value: 1 },
      uTilt: { value: 0 },
      uColor: { value: [1, 1, 1] },
      uGlintColor: { value: [1, 1, 1] },
      uBackground: { value: [0, 0, 0, 1] }
    };
    const slatMesh = new Mesh(gl, {
      geometry,
      program: new Program(gl, {
        vertex: passVertex,
        fragment: slatFragment,
        uniforms: slatUniforms,
        depthTest: false,
        depthWrite: false
      })
    });
    const fluidTexel = { value: [1, 1] };
    const fluidPass = (fragmentSource, uniforms) => new Mesh(gl, {
      geometry,
      program: new Program(gl, {
        vertex: fluidVertex,
        fragment: fragmentSource,
        uniforms: { uTexel: fluidTexel, ...uniforms },
        depthTest: false,
        depthWrite: false
      })
    });
    const splatPass = fluidPass(splatFragment, {
      uTarget: { value: blank },
      uAspect: { value: 1 },
      uPoint: { value: [0, 0] },
      uValue: { value: [0, 0, 0] },
      uRadius: { value: 0.01 }
    });
    const curlPass = fluidPass(curlFragment, { uVelocity: { value: blank } });
    const vorticityPass = fluidPass(vorticityFragment, {
      uVelocity: { value: blank },
      uCurl: { value: blank },
      uSwirl: { value: 20 },
      uDt: { value: 0.016 }
    });
    const divergencePass = fluidPass(divergenceFragment, { uVelocity: { value: blank } });
    const pressurePass = fluidPass(pressureFragment, { uPressure: { value: blank }, uDivergence: { value: blank } });
    const projectPass = fluidPass(projectFragment, { uPressure: { value: blank }, uVelocity: { value: blank } });
    const advectPass = fluidPass(advectFragment, {
      uVelocity: { value: blank },
      uSource: { value: blank },
      uDt: { value: 0.016 },
      uFade: { value: 1 }
    });
    const scalePass = fluidPass(scaleFragment, { uSource: { value: blank }, uValue: { value: 0 } });
    const reducedMotion = win.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    let width = 1;
    let height = 1;
    let raf = 0;
    let last = win.performance.now();
    let time = 0;
    let introClock = 0;
    let visible = true;
    let alive = true;
    let fluid = null;
    let fluidUntil = 0;
    let fluidDirty = false;
    let splashTurn = 0;
    const splats = [];
    const pointer = { x: 0, y: 0, tracked: false };
    const run = (mesh, target) => renderer.render({ scene: mesh, target, clear: false });
    const floatTarget = (w, h) => new RenderTarget(gl, {
      width: w,
      height: h,
      depth: false,
      type: gl2.HALF_FLOAT,
      format: gl.RGBA,
      internalFormat: gl2.RGBA16F,
      minFilter: gl.LINEAR,
      magFilter: gl.LINEAR
    });
    const swapPair = (w, h) => {
      const pair = {
        read: floatTarget(w, h),
        write: floatTarget(w, h),
        swap() {
          const next = pair.read;
          pair.read = pair.write;
          pair.write = next;
        }
      };
      return pair;
    };
    const disposeFluid = () => {
      if (!fluid) return;
      [fluid.velocity, fluid.ink, fluid.pressure].forEach((pair) => {
        dispose(pair.read);
        dispose(pair.write);
      });
      dispose(fluid.divergence);
      dispose(fluid.curl);
      fluid = null;
    };
    const buildFluid = () => {
      if (!floatTargets) return;
      const aspect = width / height;
      const w = Math.max(8, Math.round(aspect >= 1 ? FLUID_SIZE * aspect : FLUID_SIZE));
      const h = Math.max(8, Math.round(aspect >= 1 ? FLUID_SIZE : FLUID_SIZE / aspect));
      if (fluid && fluid.width === w && fluid.height === h) return;
      disposeFluid();
      fluid = {
        width: w,
        height: h,
        velocity: swapPair(w, h),
        ink: swapPair(w, h),
        pressure: swapPair(w, h),
        divergence: floatTarget(w, h),
        curl: floatTarget(w, h)
      };
      fluidTexel.value = [1 / w, 1 / h];
    };
    const start = () => {
      if (raf || !visible || !alive) return;
      last = win.performance.now();
      raf = win.requestAnimationFrame(frame);
    };
    const resize = () => {
      width = Math.max(1, root.clientWidth);
      height = Math.max(1, root.clientHeight);
      renderer.dpr = Math.min(pixelRatio(win), 2, Math.sqrt(PIXEL_BUDGET / (width * height)));
      renderer.setSize(width, height);
      buildFluid();
      start();
    };
    const layout = (s) => {
      const slatW = clamp2(s.slatWidth, 1, 64);
      const slatH = clamp2(s.slatHeight, 2, 240);
      const gapSize = clamp2(s.gap, 0, 64);
      const pitchX = slatW + gapSize;
      const pitchY = slatH + gapSize;
      const cols = Math.min(2048, Math.ceil((width + gapSize) / pitchX) + 1);
      const rows = Math.min(2048, Math.ceil((height + gapSize) / pitchY) + 1);
      const originX = (width - (cols * pitchX - gapSize)) / 2;
      const originY = (height - (rows * pitchY - gapSize)) / 2;
      if (fieldTarget.width !== cols || fieldTarget.height !== rows) {
        dispose(fieldTarget);
        fieldTarget = new RenderTarget(gl, {
          width: cols,
          height: rows,
          depth: false,
          minFilter: gl.NEAREST,
          magFilter: gl.NEAREST
        });
        slatUniforms.tField.value = fieldTarget.texture;
      }
      const tilt = Math.min(0.42, Math.asin(clamp2((pitchX * 1.5 - slatW * 0.5) / (slatH * 0.5), 0, 1)));
      return { slatW, slatH, tilt, grid: [cols, rows, pitchX, pitchY], origin: [originX, originY] };
    };
    const splat = (pair, point, value, radius) => {
      const u = splatPass.program.uniforms;
      u.uTarget.value = pair.read.texture;
      u.uAspect.value = width / height;
      u.uPoint.value = point;
      u.uValue.value = value;
      u.uRadius.value = radius;
      run(splatPass, pair.write);
      pair.swap();
    };
    const stepFluid = (f, dt, s) => {
      if (s.swirl > 0) {
        curlPass.program.uniforms.uVelocity.value = f.velocity.read.texture;
        run(curlPass, f.curl);
        const vorticity = vorticityPass.program.uniforms;
        vorticity.uVelocity.value = f.velocity.read.texture;
        vorticity.uCurl.value = f.curl.texture;
        vorticity.uSwirl.value = clamp2(s.swirl, 0, 2) * 40;
        vorticity.uDt.value = dt;
        run(vorticityPass, f.velocity.write);
        f.velocity.swap();
      }
      divergencePass.program.uniforms.uVelocity.value = f.velocity.read.texture;
      run(divergencePass, f.divergence);
      scalePass.program.uniforms.uSource.value = f.pressure.read.texture;
      scalePass.program.uniforms.uValue.value = 0.8;
      run(scalePass, f.pressure.write);
      f.pressure.swap();
      pressurePass.program.uniforms.uDivergence.value = f.divergence.texture;
      for (let i = 0; i < PRESSURE_STEPS; i++) {
        pressurePass.program.uniforms.uPressure.value = f.pressure.read.texture;
        run(pressurePass, f.pressure.write);
        f.pressure.swap();
      }
      projectPass.program.uniforms.uPressure.value = f.pressure.read.texture;
      projectPass.program.uniforms.uVelocity.value = f.velocity.read.texture;
      run(projectPass, f.velocity.write);
      f.velocity.swap();
      const fade = 1 / clamp2(s.trail, 0.1, 10);
      const advect = advectPass.program.uniforms;
      advect.uDt.value = dt;
      advect.uVelocity.value = f.velocity.read.texture;
      advect.uSource.value = f.velocity.read.texture;
      advect.uFade.value = fade * 1.4;
      run(advectPass, f.velocity.write);
      f.velocity.swap();
      advect.uVelocity.value = f.velocity.read.texture;
      advect.uSource.value = f.ink.read.texture;
      advect.uFade.value = fade;
      run(advectPass, f.ink.write);
      f.ink.swap();
    };
    const clearFluid = (f) => {
      scalePass.program.uniforms.uValue.value = 0;
      [f.velocity, f.ink, f.pressure].forEach((pair) => {
        scalePass.program.uniforms.uSource.value = pair.read.texture;
        run(scalePass, pair.write);
        pair.swap();
      });
    };
    const frame = (now) => {
      raf = 0;
      if (!alive) return;
      const s = settings;
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1e3));
      last = now;
      if (!s.paused && !reducedMotion) time += dt * s.speed;
      introClock = s.intro && !reducedMotion ? introClock + dt / Math.max(0.2, s.introDuration) : 1;
      const introLinear = Math.min(introClock, 1);
      const introEase = introLinear < 0.5 ? 4 * introLinear * introLinear * introLinear : 1 - Math.pow(-2 * introLinear + 2, 3) / 2;
      if (fluid && splats.length) {
        const radius = Math.pow(clamp2(s.cursorSize, 4, 600) / height, 2) * 0.35;
        const aspect = width / height;
        for (const [u, v, du, dv, turn] of splats) {
          if (turn === null) {
            splat(fluid.velocity, [u, v], [du * SPLAT_FORCE, dv * SPLAT_FORCE, 0], radius);
            splat(fluid.ink, [u, v], [0.13, 0, 0], radius);
            continue;
          }
          const jet = radius * 0.55;
          const reach = Math.sqrt(jet * 0.5) * 1.9;
          const push = SPLAT_FORCE * 0.08;
          for (let i = 0; i < SPLASH_JETS; i++) {
            const angle2 = turn + i / SPLASH_JETS * Math.PI * 2;
            const dx = Math.cos(angle2);
            const dy = Math.sin(angle2);
            const point = [u + dx * reach / aspect, v + dy * reach];
            const spin = [(dx - dy) * Math.SQRT1_2 * push, (dy + dx) * Math.SQRT1_2 * push, 0];
            splat(fluid.velocity, point, spin, jet);
            splat(fluid.ink, point, [0.75, 0, 0], jet);
          }
          splat(fluid.ink, [u, v], [0.45, 0, 0], radius);
        }
        splats.length = 0;
        fluidDirty = true;
      }
      const fluidActive = fluid !== null && now < fluidUntil;
      if (fluid) {
        if (fluidActive) stepFluid(fluid, Math.min(Math.max(dt, 1 / 240), 1 / 30), s);
        else if (fluidDirty) {
          clearFluid(fluid);
          fluidDirty = false;
        }
      }
      const grid = layout(s);
      fieldUniforms.uSize.value = [width, height];
      fieldUniforms.uGrid.value = grid.grid;
      fieldUniforms.uOrigin.value = grid.origin;
      fieldUniforms.uSlat.value = [grid.slatW, grid.slatH];
      fieldUniforms.uTime.value = time;
      fieldUniforms.uScale.value = s.scale;
      fieldUniforms.uDirection.value = s.direction * Math.PI / 180;
      fieldUniforms.uChop.value = clamp2(s.chop, 0, 1.5);
      fieldUniforms.uStretch.value = clamp2(s.stretch, 0, 0.95);
      fieldUniforms.uGlint.value = Math.max(0, s.glint);
      fieldUniforms.uContrast.value = clamp2(s.contrast, 0.2, 4);
      fieldUniforms.uPerspective.value = clamp2(s.perspective, 0, 1);
      fieldUniforms.uFog.value = clamp2(s.fog, 0, 1);
      fieldUniforms.uIntro.value = introEase;
      fieldUniforms.uFluid.value = fluidActive ? 1 : 0;
      fieldUniforms.tVelocity.value = fluid ? fluid.velocity.read.texture : blank;
      fieldUniforms.tInk.value = fluid ? fluid.ink.read.texture : blank;
      fieldUniforms.uFluidTexel.value = fluidTexel.value;
      fieldUniforms.uInk.value = clamp2(s.cursorStrength, 0, 3);
      fieldUniforms.uLean.value = clamp2(s.lean, 0, 1);
      renderer.render({ scene: fieldMesh, target: fieldTarget });
      slatUniforms.uSize.value = [width, height];
      slatUniforms.uDpr.value = renderer.dpr;
      slatUniforms.uGrid.value = grid.grid;
      slatUniforms.uOrigin.value = grid.origin;
      slatUniforms.uSlat.value = [grid.slatW, grid.slatH];
      slatUniforms.uRound.value = clamp2(s.roundness, 0, 1);
      slatUniforms.uTilt.value = fluidActive && s.lean > 0 ? grid.tilt : 0;
      slatUniforms.uColor.value = s.color.slice(0, 3);
      slatUniforms.uGlintColor.value = s.glintColor.slice(0, 3);
      slatUniforms.uBackground.value = s.backgroundColor;
      renderer.render({ scene: slatMesh });
      const moving = !s.paused && !reducedMotion && s.speed !== 0 || introClock < 1;
      if (visible && (moving || fluidActive || fluidDirty)) raf = win.requestAnimationFrame(frame);
    };
    const locate = (e) => {
      const rect = root.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const w = Math.max(1, rect.width);
      const h = Math.max(1, rect.height);
      return { x, y, u: x / w, v: 1 - y / h, h, inside: x >= 0 && y >= 0 && x <= w && y <= h };
    };
    const queue = (u, v, du, dv, turn) => {
      if (splats.length > 32) splats.shift();
      splats.push([u, v, du, dv, turn]);
      fluidUntil = win.performance.now() + Math.max(1.5, settings.trail * 5) * 1e3;
      start();
    };
    const onPointerMove = (e) => {
      const s = settings;
      const spot = locate(e);
      if (!fluid || !s.interactive || reducedMotion || !spot.inside) {
        pointer.tracked = false;
        return;
      }
      if (pointer.tracked && (spot.x !== pointer.x || spot.y !== pointer.y)) {
        queue(spot.u, spot.v, (spot.x - pointer.x) / spot.h, (pointer.y - spot.y) / spot.h, null);
      }
      pointer.x = spot.x;
      pointer.y = spot.y;
      pointer.tracked = true;
    };
    const onPointerDown = (e) => {
      const s = settings;
      const spot = locate(e);
      if (!fluid || !s.interactive || reducedMotion || !spot.inside) return;
      splashTurn += 2.39996;
      queue(spot.u, spot.v, 0, 0, splashTurn);
    };
    const onPointerLeave = () => {
      pointer.tracked = false;
    };
    const onPointerOut = (e) => {
      if (!e.relatedTarget) onPointerLeave();
    };
    const onVisibility = () => {
      if (!doc.hidden) start();
    };
    win.addEventListener("pointermove", onPointerMove, { passive: true });
    win.addEventListener("pointerdown", onPointerDown, { passive: true });
    win.addEventListener("pointerout", onPointerOut, { passive: true });
    win.addEventListener("blur", onPointerLeave);
    doc.addEventListener("visibilitychange", onVisibility);
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
    let intersectionObserver = null;
    if (typeof VisibilityCtor === "function") {
      intersectionObserver = new VisibilityCtor((entries) => {
        const entry = entries[0];
        if (!entry) return;
        visible = entry.isIntersecting;
        start();
      });
      intersectionObserver.observe(root);
    }
    resize();
    const instance = {
      destroy() {
        alive = false;
        visible = false;
        if (raf) win.cancelAnimationFrame(raf);
        raf = 0;
        resizeObserver?.disconnect();
        intersectionObserver?.disconnect();
        if (onWindowResize) win.removeEventListener("resize", onWindowResize);
        win.removeEventListener("pointermove", onPointerMove);
        win.removeEventListener("pointerdown", onPointerDown);
        win.removeEventListener("pointerout", onPointerOut);
        win.removeEventListener("blur", onPointerLeave);
        doc.removeEventListener("visibilitychange", onVisibility);
        disposeFluid();
        dispose(fieldTarget);
        try {
          gl.getExtension("WEBGL_lose_context")?.loseContext();
        } catch {
        }
        canvas.remove();
      }
    };
    return instance;
  };

  // src/features/courses/reactbits/ghost-fibres.ts
  var VERTEX = `#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;
  var FRAGMENT = `#version 300 es
precision highp float;
out vec4 outColor;
uniform vec2 uResolution;
uniform float uDpr;
uniform float uTime;
uniform float uAngle;
uniform float uScale;
uniform float uLayers;
uniform float uWaves;
uniform float uTwist;
uniform float uThreads;
uniform float uSpread;
uniform float uThickness;
uniform float uGlow;
uniform float uBrightness;
uniform float uVignette;
uniform float uGrain;
uniform float uIntro;
uniform vec3 uGlowColor;
uniform vec3 uLineColor;
uniform vec4 uLens;
uniform float uLight;

const float PI = 3.14159265359;

mat2 rotate2d(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat2(c, -s, s, c);
}

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float hairline(float value, float width, float px) {
  px = max(px, 1e-5);
  float w = 0.5 * width * uDpr * px;
  float draw = max(w, 0.75 * px);
  return exp(-value * value / (draw * draw)) * (w / draw);
}

void main() {
  vec2 resolution = uResolution * uDpr;
  vec2 uv = (2.0 * gl_FragCoord.xy - resolution) / resolution.y;
  float time = uTime;
  vec2 p = uv / max(uScale, 0.05);
  p = rotate2d(uAngle) * p;

  vec2 lensPoint = (2.0 * vec2(uLens.x, uResolution.y - uLens.y) * uDpr - resolution) / resolution.y;
  float lens = exp(-dot(uv - lensPoint, uv - lensPoint) / (uLens.z * uLens.z)) * uLens.w;

  float threads = 0.0;
  float ghosts = 0.0;
  float halo = 0.0;

  for (int index = 0; index < 10; index++) {
    float fi = float(index) + 1.0;
    if (fi > uLayers) break;

    p += uWaves * sin(p.yx * fi * 3.0 + time * (0.15 + fi * 0.08));
    float radius = length(p);
    float polarAngle = atan(p.y, p.x);
    polarAngle += sin(radius * 5.0 - time * 1.2 + fi) * uTwist;
    p = vec2(cos(polarAngle), sin(polarAngle)) * radius;

    float strand = p.x * 3.0 + time + fi;
    float center = PI * floor(strand / PI + 0.5);
    float offset = strand - center;
    float strandId = center / PI;
    halo += exp(-8.0 * abs(sin(strand))) / fi;

    float count = max(uThreads, 1.0);
    float even = 1.0 - mod(count, 2.0);
    float spacing = 0.03 * uSpread;
    float slot = offset / spacing + 0.5 * even;
    float slotPx = fwidth(strand) / spacing;
    float thread = floor(slot + 0.5);
    float rank = thread - 0.5 * even;
    float inside = step(abs(rank), 0.5 * (count - 1.0) + 0.01);
    float seed = hash(vec2(strandId * 7.13 + fi * 3.7, thread * 1.91 + fi));
    float shimmer = 0.55 + 0.45 * sin(p.y * (1.6 + seed * 1.8) + time * (0.6 + seed) + seed * 6.283);
    float taper = 1.0 - smoothstep(0.0, 0.5 * count + 0.6, abs(rank)) * 0.65;
    float appear = smoothstep(seed * 0.6, seed * 0.6 + 0.4, uIntro);
    threads += hairline(slot - thread, uThickness, slotPx) * inside * mix(0.35, 1.0, seed) * shimmer * taper * appear / sqrt(fi);

    float ghostPhase = p.x * (5.0 + fi * 2.0) + sin(p.y * 3.0 + time);
    float ghostLine = sin(ghostPhase) / max(fwidth(sin(ghostPhase)), 1e-5);
    ghosts += exp(-ghostLine * ghostLine / (0.8 * uThickness * uDpr + 0.6)) / fi;
  }

  float center = exp(-2.2 * dot(uv, uv));
  float cloud = exp(-1.5 * length(uv + vec2(sin(time * 0.3) * 0.25, cos(time * 0.25) * 0.18)));
  float vignette = 1.0 - smoothstep(0.35, 1.45, length(uv));
  float edge = mix(1.0 - uVignette, 1.0, vignette);
  float intro = smoothstep(0.0, 1.0, uIntro);
  float grain = (hash(gl_FragCoord.xy + fract(time * 13.7) * 91.0) - 0.5) * uGrain;

  float threadLight = threads * 2.2 * (1.0 + 0.6 * lens);
  float ghostLight = ghosts * 0.1 * intro * (1.0 + 1.5 * lens);
  float glowLight = halo * 0.6 * uGlow * intro;
  float airLight = (center * 0.07 + cloud * 0.1) * uGlow * intro;

  if (uLight > 0.5) {
    float ink = (1.0 - exp(-(threadLight * 1.1 + ghostLight * 1.4) * uBrightness)) * edge;
    float wash = (1.0 - exp(-(glowLight + airLight * 0.6) * 0.9 * uBrightness)) * 0.5 * edge;
    ink = clamp(ink * (1.0 + grain * 2.0), 0.0, 1.0);
    vec3 color = uLineColor * ink + uGlowColor * wash * (1.0 - ink);
    outColor = vec4(color, ink + wash * (1.0 - ink));
  } else {
    vec3 light = uLineColor * (threadLight + ghostLight) + uGlowColor * (glowLight + airLight);
    light *= uBrightness * edge;
    vec3 color = 1.0 - exp(-light);
    float peak = max(color.r, max(color.g, color.b));
    color = max(color + grain * peak, 0.0);
    outColor = vec4(color, max(color.r, max(color.g, color.b)));
  }
}`;
  var MAX_RENDER_DIM = 2048;
  var clamp3 = (value, min, max) => Math.min(max, Math.max(min, value));
  var compile = (gl, type, source) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
    gl.deleteShader(shader);
    return null;
  };
  var link = (gl, vertexSource, fragmentSource) => {
    const vertex2 = compile(gl, gl.VERTEX_SHADER, vertexSource);
    const fragment2 = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    if (!vertex2 || !fragment2 || !program) {
      if (program) gl.deleteProgram(program);
      if (vertex2) gl.deleteShader(vertex2);
      if (fragment2) gl.deleteShader(fragment2);
      return null;
    }
    gl.attachShader(program, vertex2);
    gl.attachShader(program, fragment2);
    gl.linkProgram(program);
    gl.deleteShader(vertex2);
    gl.deleteShader(fragment2);
    if (gl.getProgramParameter(program, gl.LINK_STATUS)) return program;
    gl.deleteProgram(program);
    return null;
  };
  var mountGhostFibres = (root) => {
    if (!canRunEffects(root)) return null;
    const win = windowOf(root);
    const doc = root.ownerDocument;
    if (!win) return null;
    const canvas = effectCanvas(root);
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false
    });
    if (!gl) return abortMount(canvas);
    const program = link(gl, VERTEX, FRAGMENT);
    if (!program) return abortMount(canvas);
    const uniforms = {};
    for (const name of [
      "uResolution",
      "uDpr",
      "uTime",
      "uAngle",
      "uScale",
      "uLayers",
      "uWaves",
      "uTwist",
      "uThreads",
      "uSpread",
      "uThickness",
      "uGlow",
      "uBrightness",
      "uVignette",
      "uGrain",
      "uIntro",
      "uGlowColor",
      "uLineColor",
      "uLens",
      "uLight"
    ]) {
      uniforms[name] = gl.getUniformLocation(program, name);
    }
    const vao = gl.createVertexArray();
    const buffer = gl.createBuffer();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const positionLocation = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    const probe = doc.createElement("canvas");
    probe.width = 1;
    probe.height = 1;
    const probeContext = probe.getContext("2d", { willReadFrequently: true });
    const reduce = win.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const settings = {
      glowColor: "#2f5bff",
      lineColor: "",
      speed: 0.2,
      scale: 2,
      rotation: 0,
      rotationSpeed: 0.25,
      layers: 4,
      waves: 0.015,
      twist: 0.1,
      threads: 1,
      spread: 1,
      thickness: 1,
      glow: 2,
      brightness: 1.4,
      vignette: 0.8,
      grain: 0.03,
      mouseInteraction: true,
      intro: true,
      lightMode: false,
      paused: false,
      dpr: void 0
    };
    const state = {
      time: 0,
      spin: 0,
      introTime: settings.intro && !reduce ? 0 : 10,
      width: 1,
      height: 1,
      ratio: 1,
      colorKey: "",
      glow: [0.2, 0.22, 0.63],
      line: [0.8, 0.82, 1],
      pointer: { x: 0, y: 0, inside: false },
      lens: { x: 0, y: 0, vx: 0, vy: 0, strength: 0, placed: false }
    };
    let raf = 0;
    let last = 0;
    let visible = true;
    let alive = true;
    const toRgb = (value, fallback) => {
      if (!probeContext || !value) return fallback;
      probeContext.clearRect(0, 0, 1, 1);
      probeContext.fillStyle = "#000000";
      probeContext.fillStyle = value;
      probeContext.fillRect(0, 0, 1, 1);
      const [r, g, b] = probeContext.getImageData(0, 0, 1, 1).data;
      return [r / 255, g / 255, b / 255];
    };
    const resolveColors = () => {
      const key = `${settings.glowColor}|${settings.lineColor}|${settings.lightMode}`;
      if (key === state.colorKey) return;
      state.colorKey = key;
      state.glow = toRgb(settings.glowColor, [0.2, 0.22, 0.63]);
      if (settings.lineColor) state.line = toRgb(settings.lineColor, state.glow);
      else if (settings.lightMode) state.line = state.glow.map((channel) => channel * 0.6);
      else state.line = state.glow.map((channel) => channel + (1 - channel) * 0.78);
    };
    const render = () => {
      resolveColors();
      const introProgress = clamp3(state.introTime / 2.2, 0, 1);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.uniform2f(uniforms.uResolution, state.width, state.height);
      gl.uniform1f(uniforms.uDpr, state.ratio);
      gl.uniform1f(uniforms.uTime, state.time);
      gl.uniform1f(uniforms.uAngle, settings.rotation * Math.PI / 180 + state.spin);
      gl.uniform1f(uniforms.uScale, settings.scale);
      gl.uniform1f(uniforms.uLayers, settings.layers);
      gl.uniform1f(uniforms.uWaves, settings.waves);
      gl.uniform1f(uniforms.uTwist, settings.twist);
      gl.uniform1f(uniforms.uThreads, settings.threads);
      gl.uniform1f(uniforms.uSpread, settings.spread);
      gl.uniform1f(uniforms.uThickness, settings.thickness);
      gl.uniform1f(uniforms.uGlow, settings.glow);
      gl.uniform1f(uniforms.uBrightness, settings.brightness);
      gl.uniform1f(uniforms.uVignette, settings.vignette);
      gl.uniform1f(uniforms.uGrain, settings.grain);
      gl.uniform1f(uniforms.uIntro, 1 - Math.pow(1 - introProgress, 3));
      gl.uniform3f(uniforms.uGlowColor, state.glow[0], state.glow[1], state.glow[2]);
      gl.uniform3f(uniforms.uLineColor, state.line[0], state.line[1], state.line[2]);
      gl.uniform4f(uniforms.uLens, state.lens.x, state.lens.y, 0.32, state.lens.strength);
      gl.uniform1f(uniforms.uLight, settings.lightMode ? 1 : 0);
      gl.bindVertexArray(vao);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindVertexArray(null);
    };
    const resize = () => {
      const width = Math.max(1, root.clientWidth);
      const height = Math.max(1, root.clientHeight);
      const baseDpr = Math.min(settings.dpr || pixelRatio(win), 2);
      const longest = Math.max(width, height) * baseDpr;
      const ratio = longest > MAX_RENDER_DIM ? baseDpr * MAX_RENDER_DIM / longest : baseDpr;
      const pixelWidth = Math.max(1, Math.round(width * ratio));
      const pixelHeight = Math.max(1, Math.round(height * ratio));
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      state.width = width;
      state.height = height;
      state.ratio = canvas.width / width;
      render();
    };
    const frame = (now) => {
      raf = 0;
      if (!alive || !visible || doc.hidden) return;
      const dt = last ? Math.min(0.05, (now - last) / 1e3) : 1 / 60;
      last = now;
      const moving = !settings.paused && !reduce;
      if (moving) {
        state.time += dt * settings.speed;
        state.spin += dt * settings.speed * settings.rotationSpeed;
      }
      const introducing = state.introTime < 2.2;
      if (introducing) state.introTime += dt;
      const { pointer, lens } = state;
      const active = settings.mouseInteraction && pointer.inside && !reduce;
      if (active && !lens.placed) {
        lens.x = pointer.x;
        lens.y = pointer.y;
        lens.vx = 0;
        lens.vy = 0;
        lens.placed = true;
      }
      lens.vx += (110 * (pointer.x - lens.x) - 19 * lens.vx) * dt;
      lens.vy += (110 * (pointer.y - lens.y) - 19 * lens.vy) * dt;
      lens.x += lens.vx * dt;
      lens.y += lens.vy * dt;
      const goal = active ? 1 : 0;
      lens.strength += (goal - lens.strength) * (1 - Math.exp(-dt / (goal > lens.strength ? 0.3 : 0.55)));
      if (!active && lens.strength < 1e-3) lens.placed = false;
      render();
      const settling = Math.abs(goal - lens.strength) > 2e-3 || Math.hypot(lens.vx, lens.vy) > 0.5;
      if (moving || introducing || settling) raf = win.requestAnimationFrame(frame);
      else last = 0;
    };
    const wake = () => {
      if (!raf && alive && visible && !doc.hidden) raf = win.requestAnimationFrame(frame);
    };
    const onPointerMove = (event) => {
      const rect = root.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      state.pointer.x = x;
      state.pointer.y = y;
      state.pointer.inside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
      wake();
    };
    const onPointerLeave = () => {
      state.pointer.inside = false;
      wake();
    };
    const onVisibility = () => {
      last = 0;
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
          last = 0;
          wake();
        }
      });
      visibility.observe(root);
    }
    win.addEventListener("pointermove", onPointerMove, { passive: true });
    doc.documentElement.addEventListener("pointerleave", onPointerLeave);
    doc.addEventListener("visibilitychange", onVisibility);
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
        doc.removeEventListener("visibilitychange", onVisibility);
        if (buffer) gl.deleteBuffer(buffer);
        if (vao) gl.deleteVertexArray(vao);
        gl.deleteProgram(program);
        try {
          gl.getExtension("WEBGL_lose_context")?.loseContext();
        } catch {
        }
        canvas.remove();
      }
    };
    return instance;
  };

  // src/features/courses/reactbits/crt-warp.ts
  var VERTEX2 = `
in vec2 aPosition;
out vec2 vUv;

void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;
  var FRAGMENT2 = `
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
  var hexToRgb = (hex) => [
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255
  ];
  var compile2 = (gl, type, source) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
    gl.deleteShader(shader);
    return null;
  };
  var mountCrtWarp = (root) => {
    if (!canRunEffects(root)) return null;
    const win = windowOf(root);
    const doc = root.ownerDocument;
    if (!win) return null;
    const canvas = effectCanvas(root);
    const gl = canvas.getContext("webgl", { alpha: false, antialias: false });
    if (!gl) return abortMount(canvas);
    const vertex2 = compile2(gl, gl.VERTEX_SHADER, VERTEX2);
    const fragment2 = compile2(gl, gl.FRAGMENT_SHADER, FRAGMENT2);
    const program = gl.createProgram();
    if (!vertex2 || !fragment2 || !program) {
      if (program) gl.deleteProgram(program);
      if (vertex2) gl.deleteShader(vertex2);
      if (fragment2) gl.deleteShader(fragment2);
      return abortMount(canvas);
    }
    gl.attachShader(program, vertex2);
    gl.attachShader(program, fragment2);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      gl.deleteShader(vertex2);
      gl.deleteShader(fragment2);
      return abortMount(canvas);
    }
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "aPosition");
    if (position < 0 || !buffer) {
      gl.deleteProgram(program);
      gl.deleteShader(vertex2);
      gl.deleteShader(fragment2);
      return abortMount(canvas);
    }
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const names = [
      "uResolution",
      "uTime",
      "uSpeed",
      "uColor",
      "uBackgroundColor",
      "uCurvature",
      "uScanlineStrength",
      "uScanlineFrequency",
      "uWaveAmplitude",
      "uWaveFrequency",
      "uBloom",
      "uBloomRadius",
      "uNoise",
      "uVignette",
      "uBrightness",
      "uPixelation",
      "uRgbShift",
      "uPointer",
      "uMouseStrength",
      "uMouseReact"
    ];
    const uniforms = {};
    for (const name of names) uniforms[name] = gl.getUniformLocation(program, name);
    const settings = {
      color: hexToRgb("#c755f7"),
      backgroundColor: hexToRgb("#05010a"),
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
      paused: false
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
    const render = () => {
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
    const frame = (now) => {
      raf = 0;
      if (!alive) return;
      if (!visible || doc.hidden) {
        raf = win.requestAnimationFrame(frame);
        return;
      }
      const interval = 1e3 / settings.fps;
      if (now - lastFrame < interval) {
        raf = win.requestAnimationFrame(frame);
        return;
      }
      lastFrame = now - (now - lastFrame) % interval;
      const delta = prev ? Math.min((now - prev) / 1e3, 0.1) : 0;
      prev = now;
      if (!settings.paused) phase += delta * settings.speed;
      pointerCurrent.x += (pointerTarget.x - pointerCurrent.x) * 0.08;
      pointerCurrent.y += (pointerTarget.y - pointerCurrent.y) * 0.08;
      render();
      raf = win.requestAnimationFrame(frame);
    };
    const wake = () => {
      if (raf || !alive) return;
      raf = win.requestAnimationFrame(frame);
    };
    const onPointerLeave = () => {
      pointerTarget.x = 0;
      pointerTarget.y = 0;
    };
    const onPointerMove = (event) => {
      const rect = root.getBoundingClientRect();
      const x = (event.clientX - rect.left) / Math.max(rect.width, 1) * 2 - 1;
      const y = -((event.clientY - rect.top) / Math.max(rect.height, 1) * 2 - 1);
      if (x >= -1 && x <= 1 && y >= -1 && y <= 1) {
        pointerTarget.x = x;
        pointerTarget.y = y;
      } else {
        onPointerLeave();
      }
    };
    const resize = () => {
      const size = fitCanvas(canvas, root, 1);
      view.width = size.width;
      view.height = size.height;
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
        if (visible) wake();
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
        if (buffer) gl.deleteBuffer(buffer);
        gl.deleteProgram(program);
        gl.deleteShader(vertex2);
        gl.deleteShader(fragment2);
        gl.getExtension("WEBGL_lose_context")?.loseContext();
        canvas.remove();
      }
    };
    return instance;
  };

  // src/features/courses/reactbits/scanner.ts
  var hexToRgb2 = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return [1, 1, 1];
    return [parseInt(result[1], 16) / 255, parseInt(result[2], 16) / 255, parseInt(result[3], 16) / 255];
  };
  var directionToFloat = (dir) => dir === "horizontal" ? 1 : dir === "diagonal" ? 2 : 0;
  var vertex = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;
  var fragment = `#version 300 es
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
  var mountScanner = (root) => {
    if (!canRunEffects(root)) return null;
    const win = windowOf(root);
    const doc = root.ownerDocument;
    if (!win) return null;
    const settings = {
      color1: "#5227FF",
      color2: "#FF9FFC",
      color3: "#FFFFFF",
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
      scanDirection: "vertical",
      colorSpread: 0.7,
      brightness: 1,
      contrast: 1.15,
      softness: 1.4,
      vignette: 0.45,
      scanline: true,
      grain: true,
      grainIntensity: 0.05,
      opacity: 1,
      mouseInteraction: true,
      mouseRadius: 0.5,
      mouseStrength: 0.5
    };
    let renderer;
    try {
      renderer = new Renderer({
        canvas: doc.createElement("canvas"),
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
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.position = "absolute";
    canvas.style.inset = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    canvas.style.pointerEvents = "none";
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
        uScanline: { value: settings.scanline ? 1 : 0 },
        uGrain: { value: settings.grain ? 1 : 0 },
        uGrainIntensity: { value: settings.grainIntensity },
        uDirection: { value: directionToFloat(settings.scanDirection) },
        uMouse: { value: new Float32Array([0.5, 0.5]) },
        uMouseEnabled: { value: settings.mouseInteraction ? 1 : 0 },
        uMouseRadius: { value: settings.mouseRadius },
        uMouseStrength: { value: settings.mouseStrength },
        uMouseActive: { value: 0 },
        uColor1: { value: new Float32Array(hexToRgb2(settings.color1)) },
        uColor2: { value: new Float32Array(hexToRgb2(settings.color2)) },
        uColor3: { value: new Float32Array(hexToRgb2(settings.color3)) }
      }
    });
    const mesh = new Mesh(gl, { geometry, program });
    let alive = true;
    let raf = 0;
    let visible = true;
    let isPageVisible = !doc.hidden;
    const setSize = () => {
      const rect = root.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));
      renderer.setSize(w, h);
      const res = program.uniforms.iResolution.value;
      res[0] = gl.drawingBufferWidth;
      res[1] = gl.drawingBufferHeight;
      renderer.render({ scene: mesh });
    };
    let currentMouse = [0.5, 0.5];
    let targetMouse = [0.5, 0.5];
    let mouseActive = 0;
    let targetMouseActive = 0;
    const onMouseMove = (e) => {
      const rect = root.getBoundingClientRect();
      targetMouse = [
        (e.clientX - rect.left) / Math.max(1, rect.width),
        1 - (e.clientY - rect.top) / Math.max(1, rect.height)
      ];
      targetMouseActive = 1;
    };
    const onMouseLeave = () => {
      targetMouseActive = 0;
    };
    const t0 = win.performance.now();
    const loop = (t) => {
      if (!alive) return;
      program.uniforms.iTime.value = (t - t0) * 1e-3;
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
    const tryStart = () => {
      if (visible && isPageVisible && raf === 0) raf = win.requestAnimationFrame(loop);
    };
    const tryStop = () => {
      if (raf !== 0) {
        win.cancelAnimationFrame(raf);
        raf = 0;
      }
    };
    const ResizeCtor = win.ResizeObserver;
    let resizeObserver = null;
    let onWindowResize = null;
    if (typeof ResizeCtor === "function") {
      resizeObserver = new ResizeCtor(setSize);
      resizeObserver.observe(root);
    } else {
      onWindowResize = () => setSize();
      win.addEventListener("resize", onWindowResize);
    }
    const VisibilityCtor = win.IntersectionObserver;
    let visibility = null;
    if (typeof VisibilityCtor === "function") {
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
    const onVisibility = () => {
      isPageVisible = !doc.hidden;
      if (isPageVisible) tryStart();
      else tryStop();
    };
    win.addEventListener("mousemove", onMouseMove, { passive: true });
    doc.documentElement.addEventListener("mouseleave", onMouseLeave);
    doc.addEventListener("visibilitychange", onVisibility);
    setSize();
    tryStart();
    const instance = {
      destroy() {
        alive = false;
        tryStop();
        resizeObserver?.disconnect();
        visibility?.disconnect();
        if (onWindowResize) win.removeEventListener("resize", onWindowResize);
        doc.removeEventListener("visibilitychange", onVisibility);
        win.removeEventListener("mousemove", onMouseMove);
        doc.documentElement.removeEventListener("mouseleave", onMouseLeave);
        canvas.remove();
        try {
          gl.getExtension("WEBGL_lose_context")?.loseContext();
        } catch {
        }
      }
    };
    return instance;
  };

  // src/features/courses/reactbits/light-fall.ts
  var MAX_COLORS = 8;
  var BLOOM_LEVELS = 4;
  var VERTEX3 = `#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;
  var STREAKS = `#version 300 es
precision highp float;
uniform vec2 uView;
uniform float uZoom;
uniform float uPhase;
uniform float uTwinkleClock;
uniform float uRings;
uniform vec3 uColors[8];
uniform int uColorCount;
uniform int uStreakCount;
uniform int uColumns;
uniform float uWidth;
uniform float uTail;
uniform float uTwinkle;
uniform float uHead;
uniform float uDepth;
uniform vec4 uMouse;
uniform vec3 uLens;
uniform float uLightMode;
uniform float uEncode;
out vec4 outColor;

const vec3 CAMERA = vec3(0.0, -0.8888889, -0.2222222);
const float TAU = 6.28318530718;
const float SPACING = 0.005;
const float REACH = 0.32;

uint scramble(uint x) {
  x ^= x >> 16;
  x *= 0x7feb352du;
  x ^= x >> 15;
  x *= 0x846ca68bu;
  x ^= x >> 16;
  return x;
}

float unit(uint x) {
  return float(x & 0xffffu) / 65535.0;
}

float stroke(float d, float w) {
  float s = max(0.75 * w, 0.55);
  return 0.75 * w / s * exp(-0.5 * d * d / (s * s));
}

float orb(float d, float r) {
  float s = max(0.6 * r, 0.7);
  float e = 0.6 * r / s;
  return e * e * exp(-0.5 * d * d / (s * s));
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 screen = (2.0 * frag - uView) / uView.x;
  vec2 p = screen;
  mat2 warp = mat2(1.0);
  if (uLens.z > 0.0) {
    vec2 o = p - uLens.xy;
    float e = uLens.z * exp(-dot(o, o) / (REACH * REACH));
    p -= o * e;
    warp = mat2(1.0 - e) + outerProduct(o, o) * (2.0 * e / (REACH * REACH));
  }

  vec3 dir = vec3(p, uZoom);
  vec3 exits = (1.0 - CAMERA * sign(dir)) / max(abs(dir), vec3(1e-6));
  float u = min(exits.x, min(exits.y, exits.z));
  for (int i = 0; i < 5; i++) {
    vec3 h = CAMERA + u * dir;
    vec3 h2 = h * h;
    u -= (dot(h2, h2) - 1.0) / (4.0 * dot(dir, h2 * h));
  }
  vec3 hit = CAMERA + u * dir;
  vec3 normal = hit * hit * hit;
  float facing = dot(normal, dir);
  vec3 stepX = u * (vec3(1.0, 0.0, 0.0) - dir * (normal.x / facing));
  vec3 stepY = u * (vec3(0.0, 1.0, 0.0) - dir * (normal.y / facing));
  float ring = hit.y * hit.y + hit.z * hit.z;
  float theta = atan(hit.z, hit.y);
  mat2 jacobian = mat2(
    stepX.x,
    (hit.y * stepX.z - hit.z * stepX.y) / ring,
    stepY.x,
    (hit.y * stepY.z - hit.z * stepY.y) / ring
  ) * warp * (2.0 / uView.x);

  vec2 gradX = vec2(jacobian[0][0], jacobian[1][0]);
  vec2 gradTheta = vec2(jacobian[0][1], jacobian[1][1]);
  float scale = max(length(gradX), 1e-8);
  float det = max(abs(gradX.x * gradTheta.y - gradX.y * gradTheta.x), 1e-12);
  float along = scale / det;
  float skew = dot(gradX, gradTheta) / det;
  float spacing = SPACING / scale;
  float detail = smoothstep(1.6, 3.2, spacing);
  if (detail <= 0.0) {
    outColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }
  float halfWidth = min(uWidth / scale, 0.2 * spacing);
  float headRadius = min(2.0 * uWidth / scale, 0.35 * spacing);
  float headReach = 4.0 * max(0.6 * headRadius, 0.7);
  float edge = uColumns > 1 ? 1.0 : 0.5;
  float period = TAU / uRings;
  float fog = exp(-max(u * length(dir) - 0.6, 0.0) * 1.6 * uDepth);

  float boost = 1.0;
  if (uMouse.z > 0.0) {
    vec2 m = screen - uMouse.xy;
    boost += 2.0 * uMouse.z * exp(-dot(m, m) / max(uMouse.w * uMouse.w, 1e-4));
  }

  int count = max(uColorCount, 1);
  vec3 total = vec3(0.0);
  for (int layer = 0; layer < 16; layer++) {
    if (layer >= uStreakCount) break;
    float x = hit.x + float(layer) * SPACING / 8.0;
    float nearest = floor(x / SPACING + 0.5);
    float side = x >= nearest * SPACING ? 1.0 : -1.0;
    for (int k = 0; k < 2; k++) {
      if (k >= uColumns) break;
      float column = nearest + side * float(k);
      float across = (x - column * SPACING) / scale;
      uint seed = scramble(uint(int(column) + 65536) + uint(layer) * 0x9e3779b9u);
      uint next = scramble(seed);
      float hue = unit(seed >> 16);
      float delta = theta - uPhase * (1.0 + floor(unit(seed) * 16.0) / 16.0) - unit(next) * period;
      delta -= period * floor(delta / period + 0.5);
      float ahead = delta * along - across * skew;
      if (abs(ahead) > headReach && (delta > 0.0 || -delta * uTail > 3.2)) continue;
      float behind = max(-delta, 0.0);
      float fall = exp(-uTail * behind) * (1.0 - smoothstep(0.5, 0.95, behind / (0.5 * period)));
      fall *= 1.0 - smoothstep(1.2, 3.2, uTail * behind);
      float reach = length(vec2(across, ahead));
      float trail = stroke(ahead > 0.0 ? reach : abs(across), halfWidth * mix(0.4, 1.0, fall)) * fall;
      float glint = orb(reach, headRadius) * mix(3.0, 1.8, uLightMode);
      float weight = mix(1.5, 1.0 + sin(uTwinkleClock + 7.0 * hue + 4.0), uTwinkle);
      weight *= 1.0 - smoothstep(0.72 * edge, edge, abs(across) / spacing);
      vec3 color = uColors[min(int(hue * float(count)), count - 1)];
      vec3 hot = mix(color, vec3(1.0), uHead * (1.0 - uLightMode));
      total += (trail * color + glint * hot) * weight;
    }
  }

  outColor = vec4(total * fog * boost * detail * uEncode, 1.0);
}`;
  var DOWNSAMPLE = `#version 300 es
precision highp float;
uniform sampler2D uSource;
uniform vec2 uTarget;
uniform vec2 uTexel;
uniform float uLimit;
out vec4 outColor;

void main() {
  vec2 uv = gl_FragCoord.xy / uTarget;
  vec3 color = texture(uSource, uv - uTexel).rgb;
  color += texture(uSource, uv + uTexel).rgb;
  color += texture(uSource, uv + vec2(uTexel.x, -uTexel.y)).rgb;
  color += texture(uSource, uv + vec2(-uTexel.x, uTexel.y)).rgb;
  outColor = vec4(min(color * 0.25, vec3(uLimit)), 1.0);
}`;
  var BLUR = `#version 300 es
precision highp float;
uniform sampler2D uSource;
uniform vec2 uTarget;
uniform vec2 uStep;
out vec4 outColor;

void main() {
  vec2 uv = gl_FragCoord.xy / uTarget;
  vec3 color = texture(uSource, uv).rgb * 0.181862;
  color += (texture(uSource, uv + uStep * 1.423135).rgb + texture(uSource, uv - uStep * 1.423135).rgb) * 0.284316;
  color += (texture(uSource, uv + uStep * 3.326702).rgb + texture(uSource, uv - uStep * 3.326702).rgb) * 0.106598;
  color += (texture(uSource, uv + uStep * 5.242989).rgb + texture(uSource, uv - uStep * 5.242989).rgb) * 0.018156;
  outColor = vec4(color, 1.0);
}`;
  var COMPOSITE = `#version 300 es
precision highp float;
uniform sampler2D uScene;
uniform sampler2D uBloom0;
uniform sampler2D uBloom1;
uniform sampler2D uBloom2;
uniform sampler2D uBloom3;
uniform vec2 uView;
uniform float uDecode;
uniform float uGlow;
uniform float uBloom;
uniform float uPresence;
uniform float uOpacity;
uniform float uFade;
uniform float uLightMode;
uniform vec3 uTopColor;
uniform float uTopGlow;
out vec4 outColor;

float smootherstep01(float t) {
  t = clamp(t, 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uView;
  vec3 light = texelFetch(uScene, ivec2(gl_FragCoord.xy), 0).rgb;
  if (uBloom > 0.0) {
    vec3 halo = texture(uBloom0, uv).rgb * 0.42;
    halo += texture(uBloom1, uv).rgb * 0.3;
    halo += texture(uBloom2, uv).rgb * 0.18;
    halo += texture(uBloom3, uv).rgb * 0.1;
    light += halo * uBloom * (uLightMode > 0.5 ? 0.2 : 1.0);
  }
  light *= uDecode * uGlow * uPresence;

  if (uLightMode < 0.5 && uTopGlow > 0.0) {
    float aspect = uView.x / uView.y;
    vec2 q = vec2((uv.x - 0.5) * aspect, 1.04 - uv.y);
    float spread = 0.34 * max(aspect, 0.75);
    float core = exp(-q.x * q.x / (spread * spread) - q.y * q.y / 0.06);
    float halo = exp(-q.x * q.x / (3.6 * spread * spread) - q.y * q.y / 0.18);
    light += uTopColor * uTopGlow * (core * 0.85 + halo * 0.3) * uPresence;
  }

  vec3 lit = max(light, 0.0);
  vec3 mapped = sqrt(1.0 - exp(-1.3 * lit * lit / (lit + 0.025)));
  float peak = max(mapped.r, max(mapped.g, mapped.b));

  float mask = uOpacity;
  float edge = uFade * 0.5;
  if (edge > 0.0) {
    mask *= smootherstep01(uv.x / edge) * smootherstep01((1.0 - uv.x) / edge);
    mask *= smootherstep01(uv.y / edge) * smootherstep01((1.0 - uv.y) / edge);
  }
  float grain = (fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) - 0.5) / 255.0;

  if (uLightMode > 0.5) {
    float coverage = clamp(smoothstep(0.0, 0.5, peak) * mask * 0.94 + grain, 0.0, 1.0);
    vec3 chroma = sqrt(clamp(lit / max(max(lit.r, max(lit.g, lit.b)), 1e-6), 0.0, 1.0));
    chroma = pow(chroma, vec3(1.35));
    chroma /= max(max(chroma.r, max(chroma.g, chroma.b)), 1e-4);
    float saturation = 1.0 - min(chroma.r, min(chroma.g, chroma.b));
    chroma = mix(vec3(0.3), chroma, smoothstep(0.08, 0.35, saturation));
    outColor = vec4(chroma * coverage, coverage);
  } else {
    vec3 color = clamp(mapped + grain, 0.0, 1.0) * mask;
    outColor = vec4(color, max(color.r, max(color.g, color.b)));
  }
}`;
  var INTRO_SECONDS = 2.6;
  var WARP_SPEED = 9;
  var TAU = Math.PI * 2;
  var compile3 = (gl, type, source) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
    gl.deleteShader(shader);
    return null;
  };
  var link2 = (gl, fragmentSource) => {
    const vertex2 = compile3(gl, gl.VERTEX_SHADER, VERTEX3);
    const fragment2 = compile3(gl, gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    if (!vertex2 || !fragment2 || !program) {
      if (program) gl.deleteProgram(program);
      if (vertex2) gl.deleteShader(vertex2);
      if (fragment2) gl.deleteShader(fragment2);
      return null;
    }
    gl.attachShader(program, vertex2);
    gl.attachShader(program, fragment2);
    gl.bindAttribLocation(program, 0, "aPosition");
    gl.linkProgram(program);
    gl.deleteShader(vertex2);
    gl.deleteShader(fragment2);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      return null;
    }
    const uniforms = {};
    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i++) {
      const info = gl.getActiveUniform(program, i);
      if (info) uniforms[info.name.replace(/\[0\]$/, "")] = gl.getUniformLocation(program, info.name);
    }
    return { program, uniforms };
  };
  var mountLightFall = (root) => {
    if (!canRunEffects(root)) return null;
    const win = windowOf(root);
    const doc = root.ownerDocument;
    if (!win) return null;
    const canvas = effectCanvas(root);
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "high-performance"
    });
    if (!gl) return abortMount(canvas);
    const floatTargets = !!gl.getExtension("EXT_color_buffer_float");
    const settings = {
      colors: ["#ffffff"],
      backgroundColor: "#94a3b8",
      speed: 0.3,
      streakCount: 2,
      streakWidth: 0.8,
      streakLength: 1,
      glow: 1,
      density: 0.6,
      twinkle: 0.3,
      zoom: 3,
      backgroundGlow: 0.1,
      headGlow: 0.6,
      depth: 0.5,
      bloom: 0.35,
      opacity: 1,
      mouseInteraction: true,
      mouseStrength: 0.4,
      mouseRadius: 0.45,
      mouseDampening: 0.15,
      lens: 0.5,
      holdToWarp: true,
      intro: true,
      fade: 0,
      lightMode: false,
      paused: false,
      dpr: void 0
    };
    const reduce = win.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const palette2 = new Float32Array(MAX_COLORS * 3);
    const pointer = { x: 0, y: 0, inside: false, held: false };
    const state = {
      travel: 0,
      intro: settings.intro && !reduce ? 0 : 1,
      mouseX: 0,
      mouseY: 0,
      lensX: 0,
      lensY: 0,
      touch: 0,
      warp: 0
    };
    let raf = 0;
    let last = 0;
    let visible = true;
    let alive = true;
    const format = floatTargets ? gl.RGBA16F : gl.RGBA8;
    const encode = floatTargets ? 1 : 0.25;
    const createTarget2 = () => ({ texture: null, framebuffer: null, width: 0, height: 0 });
    const scene = createTarget2();
    const levels = Array.from(
      { length: BLOOM_LEVELS },
      () => [createTarget2(), createTarget2()]
    );
    const targets = [scene, ...levels.flat()];
    let streakProgram = null;
    let downProgram = null;
    let blurProgram = null;
    let compositeProgram = null;
    let buffer = null;
    let vao = null;
    const setup = () => {
      streakProgram = link2(gl, STREAKS);
      downProgram = link2(gl, DOWNSAMPLE);
      blurProgram = link2(gl, BLUR);
      compositeProgram = link2(gl, COMPOSITE);
      const linked2 = [streakProgram, downProgram, blurProgram, compositeProgram];
      if (linked2.some((item) => !item)) {
        for (const item of linked2) if (item) gl.deleteProgram(item.program);
        streakProgram = null;
        downProgram = null;
        blurProgram = null;
        compositeProgram = null;
        return false;
      }
      buffer = gl.createBuffer();
      vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.bindVertexArray(null);
      for (const target of targets) {
        target.texture = null;
        target.width = 0;
        target.height = 0;
        target.framebuffer = gl.createFramebuffer();
      }
      return true;
    };
    if (!setup()) return abortMount(canvas);
    const onContextLost = (event) => {
      event.preventDefault();
    };
    const onContextRestored = () => {
      if (alive && setup()) wake();
    };
    canvas.addEventListener("webglcontextlost", onContextLost);
    canvas.addEventListener("webglcontextrestored", onContextRestored);
    const allocate = (target, width, height) => {
      if (target.texture && target.width === width && target.height === height) return;
      if (target.texture) gl.deleteTexture(target.texture);
      target.texture = gl.createTexture();
      target.width = width;
      target.height = height;
      gl.bindTexture(gl.TEXTURE_2D, target.texture);
      gl.texStorage2D(gl.TEXTURE_2D, 1, format, width, height);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, target.texture, 0);
    };
    const pass = (target, program) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.framebuffer : null);
      gl.viewport(0, 0, target ? target.width : canvas.width, target ? target.height : canvas.height);
      gl.useProgram(program.program);
      return program.uniforms;
    };
    const bind = (unit, texture) => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
    };
    const probe = doc.createElement("canvas").getContext("2d", { willReadFrequently: true });
    const colorCache = /* @__PURE__ */ new Map();
    const toRgb = (value) => {
      const cached = colorCache.get(value);
      if (cached) return cached;
      let rgb = [1, 1, 1];
      if (probe) {
        probe.clearRect(0, 0, 1, 1);
        probe.fillStyle = "#ffffff";
        probe.fillStyle = value;
        probe.fillRect(0, 0, 1, 1);
        const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
        rgb = [r / 255, g / 255, b / 255];
      }
      colorCache.set(value, rgb);
      return rgb;
    };
    const toLinear2 = (value) => toRgb(value).map((channel) => channel * channel);
    const render = () => {
      const streak = streakProgram;
      const down = downProgram;
      const blur = blurProgram;
      const composite = compositeProgram;
      if (!streak || !down || !blur || !composite || !vao) return;
      const width = canvas.width;
      const height = canvas.height;
      const cssWidth = Math.max(1, root.clientWidth);
      const cssHeight = Math.max(1, root.clientHeight);
      gl.bindVertexArray(vao);
      allocate(scene, width, height);
      levels.forEach((pair, index) => {
        const levelWidth = Math.max(1, Math.round(cssWidth / 2 ** (index + 1)));
        const levelHeight = Math.max(1, Math.round(cssHeight / 2 ** (index + 1)));
        allocate(pair[0], levelWidth, levelHeight);
        allocate(pair[1], levelWidth, levelHeight);
      });
      const intro = state.intro;
      const presence = Math.min(1, intro * 2.2);
      const stretch = 1 + 5 * Math.pow(1 - intro, 2) + 2.5 * state.warp;
      const rings = Math.max(1, Math.floor(TAU * Math.max(settings.density, 0.05) + 0.5));
      const period = TAU / rings;
      const clock = 9 + state.travel;
      const list = settings.colors.map(toLinear2);
      palette2.fill(0);
      for (let i = 0; i < MAX_COLORS; i++) palette2.set(list[Math.min(i, list.length - 1)], i * 3);
      const toScreenX = (value) => (2 * value - width) / width;
      const toScreenY = (value) => (2 * value - height) / width;
      const r = pass(scene, streak);
      gl.uniform2f(r.uView, width, height);
      gl.uniform1f(r.uZoom, settings.zoom);
      gl.uniform1f(r.uPhase, clock % (16 * period));
      gl.uniform1f(r.uTwinkleClock, clock % TAU);
      gl.uniform1f(r.uRings, rings);
      gl.uniform3fv(r.uColors, palette2);
      gl.uniform1i(r.uColorCount, list.length);
      gl.uniform1i(r.uStreakCount, settings.streakCount);
      gl.uniform1i(r.uColumns, settings.streakWidth > 1 ? 2 : 1);
      gl.uniform1f(r.uWidth, 5e-4 * settings.streakWidth);
      gl.uniform1f(r.uTail, 19 / (settings.streakLength * stretch));
      gl.uniform1f(r.uTwinkle, settings.twinkle);
      gl.uniform1f(r.uHead, settings.headGlow);
      gl.uniform1f(r.uDepth, settings.depth);
      gl.uniform4f(
        r.uMouse,
        toScreenX(state.mouseX),
        toScreenY(state.mouseY),
        settings.mouseInteraction ? settings.mouseStrength * state.touch : 0,
        settings.mouseRadius
      );
      gl.uniform3f(
        r.uLens,
        toScreenX(state.lensX),
        toScreenY(state.lensY),
        settings.mouseInteraction ? 0.5 * settings.lens * state.touch : 0
      );
      gl.uniform1f(r.uLightMode, settings.lightMode ? 1 : 0);
      gl.uniform1f(r.uEncode, encode);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (settings.bloom > 0) {
        let source = scene;
        levels.forEach(([front, back]) => {
          const d = pass(front, down);
          bind(0, source.texture);
          gl.uniform1i(d.uSource, 0);
          gl.uniform2f(d.uTarget, front.width, front.height);
          gl.uniform2f(d.uTexel, 1 / source.width, 1 / source.height);
          gl.uniform1f(d.uLimit, 4 * encode);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
          let b = pass(back, blur);
          bind(0, front.texture);
          gl.uniform1i(b.uSource, 0);
          gl.uniform2f(b.uTarget, back.width, back.height);
          gl.uniform2f(b.uStep, 1 / front.width, 0);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
          b = pass(front, blur);
          bind(0, back.texture);
          gl.uniform1i(b.uSource, 0);
          gl.uniform2f(b.uTarget, front.width, front.height);
          gl.uniform2f(b.uStep, 0, 1 / back.height);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
          source = front;
        });
      }
      const c = pass(null, composite);
      bind(0, scene.texture);
      gl.uniform1i(c.uScene, 0);
      levels.forEach(([front], index) => {
        bind(index + 1, front.texture);
        gl.uniform1i(c[`uBloom${index}`], index + 1);
      });
      gl.uniform2f(c.uView, width, height);
      gl.uniform1f(c.uDecode, 1 / encode);
      gl.uniform1f(c.uGlow, settings.glow);
      gl.uniform1f(c.uBloom, settings.bloom);
      gl.uniform1f(c.uPresence, presence);
      gl.uniform1f(c.uOpacity, settings.opacity);
      gl.uniform1f(c.uFade, settings.fade);
      gl.uniform1f(c.uLightMode, settings.lightMode ? 1 : 0);
      gl.uniform3fv(c.uTopColor, toLinear2(settings.backgroundColor));
      gl.uniform1f(c.uTopGlow, settings.backgroundGlow);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      for (let unit = BLOOM_LEVELS; unit >= 0; unit--) bind(unit, null);
    };
    const frame = (now) => {
      raf = 0;
      if (!alive || !visible || doc.hidden) return;
      const dt = last ? Math.min(0.05, (now - last) / 1e3) : 1 / 60;
      last = now;
      if (!settings.intro || reduce) state.intro = 1;
      else if (state.intro < 1) state.intro = Math.min(1, state.intro + dt / INTRO_SECONDS);
      const holding = settings.holdToWarp && pointer.held && pointer.inside && !reduce;
      state.warp += ((holding ? 1 : 0) - state.warp) * (1 - Math.exp(-dt * (holding ? 2.2 : 1.6)));
      const rush = WARP_SPEED * Math.pow(1 - state.intro, 2) + 6 * state.warp;
      const running = !settings.paused && !reduce;
      if (running) state.travel += dt * 0.1 * settings.speed * (1 + rush);
      const ratio = canvas.width / Math.max(1, root.clientWidth);
      const targetX = pointer.x * ratio;
      const targetY = (root.clientHeight - pointer.y) * ratio;
      const engaged = settings.mouseInteraction && pointer.inside && !reduce;
      if (engaged && state.touch < 0.01) {
        state.mouseX = targetX;
        state.mouseY = targetY;
        state.lensX = targetX;
        state.lensY = targetY;
      }
      const follow = settings.mouseDampening > 0 ? 1 - Math.exp(-dt / settings.mouseDampening) : 1;
      state.mouseX += (targetX - state.mouseX) * follow;
      state.mouseY += (targetY - state.mouseY) * follow;
      const lensFollow = 1 - Math.exp(-dt * 6);
      state.lensX += (targetX - state.lensX) * lensFollow;
      state.lensY += (targetY - state.lensY) * lensFollow;
      state.touch += ((engaged ? 1 : 0) - state.touch) * (1 - Math.exp(-dt * (engaged ? 4 : 2)));
      render();
      const settling = state.intro < 1 || state.warp > 1e-3 || Math.abs((engaged ? 1 : 0) - state.touch) > 2e-3;
      if (running && settings.speed !== 0 || settling) raf = win.requestAnimationFrame(frame);
      else last = 0;
    };
    const wake = () => {
      if (!raf && alive && visible && !doc.hidden) raf = win.requestAnimationFrame(frame);
    };
    const resize = () => {
      const width = Math.max(1, root.clientWidth);
      const height = Math.max(1, root.clientHeight);
      const ratio = Math.min(settings.dpr || pixelRatio(win), 2);
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      if (!raf) render();
      wake();
    };
    const locate = (event) => {
      const rect = root.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      return { x, y, inside: x >= 0 && y >= 0 && x <= rect.width && y <= rect.height };
    };
    const onPointerMove = (event) => {
      const point = locate(event);
      pointer.x = point.x;
      pointer.y = point.y;
      pointer.inside = point.inside;
      wake();
    };
    const onPointerDown = (event) => {
      const point = locate(event);
      if (!point.inside) return;
      pointer.x = point.x;
      pointer.y = point.y;
      pointer.inside = true;
      pointer.held = true;
      wake();
    };
    const onPointerUp = () => {
      pointer.held = false;
      wake();
    };
    const onPointerLeave = () => {
      pointer.inside = false;
      pointer.held = false;
      wake();
    };
    const onVisibility = () => {
      last = 0;
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
          last = 0;
          wake();
        }
      });
      visibility.observe(root);
    }
    win.addEventListener("pointermove", onPointerMove, { passive: true });
    win.addEventListener("pointerdown", onPointerDown, { passive: true });
    win.addEventListener("pointerup", onPointerUp, { passive: true });
    win.addEventListener("pointercancel", onPointerUp, { passive: true });
    doc.documentElement.addEventListener("pointerleave", onPointerLeave);
    doc.addEventListener("visibilitychange", onVisibility);
    resize();
    const instance = {
      destroy() {
        alive = false;
        if (raf) win.cancelAnimationFrame(raf);
        raf = 0;
        canvas.removeEventListener("webglcontextlost", onContextLost);
        canvas.removeEventListener("webglcontextrestored", onContextRestored);
        resizeObserver?.disconnect();
        visibility?.disconnect();
        if (onWindowResize) win.removeEventListener("resize", onWindowResize);
        win.removeEventListener("pointermove", onPointerMove);
        win.removeEventListener("pointerdown", onPointerDown);
        win.removeEventListener("pointerup", onPointerUp);
        win.removeEventListener("pointercancel", onPointerUp);
        doc.documentElement.removeEventListener("pointerleave", onPointerLeave);
        doc.removeEventListener("visibilitychange", onVisibility);
        for (const target of targets) {
          if (target.texture) gl.deleteTexture(target.texture);
          if (target.framebuffer) gl.deleteFramebuffer(target.framebuffer);
        }
        for (const item of [streakProgram, downProgram, blurProgram, compositeProgram]) {
          if (item) gl.deleteProgram(item.program);
        }
        if (buffer) gl.deleteBuffer(buffer);
        if (vao) gl.deleteVertexArray(vao);
        try {
          gl.getExtension("WEBGL_lose_context")?.loseContext();
        } catch {
        }
        canvas.remove();
      }
    };
    return instance;
  };

  // src/features/courses/reactbits/ferrofluid.ts
  var CELL = 1 / 3;
  var BOUND_CELL = 1;
  var INTRO_SECONDS2 = 2.4;
  var FOV = 38 * Math.PI / 180;
  var FLOW = { up: [0, 1], down: [0, -1], left: [-1, 0], right: [1, 0], none: [0, 0] };
  var VERTEX4 = `#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;
  var SIM_FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D uState;
uniform vec2 uGridOrigin;
uniform float uCell;
uniform float uDt;
uniform float uTime;
uniform vec2 uFlow;
uniform float uTurbulence;
uniform float uMagnetism;
uniform float uFieldScale;
uniform vec2 uSeed;
uniform vec4 uCursor;
uniform vec4 uPulse;
uniform float uPulseSpeed;
uniform float uPulseWidth;
uniform vec3 uIntro;
uniform float uSpikeHeight;
uniform float uMound;
uniform float uStiffness;
uniform float uDamping;
uniform float uSettle;
out vec4 outState;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float flowField(vec2 p) {
  vec2 q = p / uFieldScale + uSeed;
  vec2 drift = uFlow * uTime * 0.55;
  vec2 warp = vec2(noise(q * 0.6 + vec2(uTime * 0.07, 3.1)), noise(q * 0.6 - vec2(7.3, uTime * 0.06))) - 0.5;
  vec2 r = q + warp * 1.8 * uTurbulence - drift;
  float n = noise(r) * 0.65 + noise(r * 2.03 + 11.7 - drift * 0.5) * 0.35;
  return smoothstep(0.44, 0.86, n);
}

void main() {
  vec2 texel = floor(gl_FragCoord.xy);
  vec2 p = uGridOrigin + (texel + 0.5) * uCell;
  vec4 prev = texelFetch(uState, ivec2(texel), 0);
  float swell = flowField(p);
  float field = uMagnetism * (0.03 + 1.0 * swell * swell);
  vec2 dc = p - uCursor.xy;
  float falloff = dot(dc, dc) / (uCursor.w * uCursor.w);
  field += uCursor.z * exp(-falloff);
  float mound = uCursor.z * exp(-falloff / 2.2);
  if (uPulse.w > 0.0) {
    float ring = length(p - uPulse.xy) - uPulse.z * uPulseSpeed;
    float envelope = smoothstep(0.0, 0.08, uPulse.z) * exp(-uPulse.z * 1.1);
    field += uPulse.w * envelope * exp(-ring * ring / (uPulseWidth * uPulseWidth));
  }
  float front = clamp((uIntro.z - length(p - uIntro.xy)) / 3.0, 0.0, 1.0);
  front = front * front * (3.0 - 2.0 * front);
  float target = uSpikeHeight * min(pow(max(field * front - 0.04, 0.0), 1.6), 1.0);
  float height = prev.x;
  float velocity = prev.y;
  if (uSettle > 0.5) {
    height = target;
    velocity = 0.0;
  } else {
    float steps = ceil(uDt / 0.008);
    float h = uDt / steps;
    for (int k = 0; k < 8; k++) {
      if (float(k) >= steps) break;
      velocity += (uStiffness * (target - height) - uDamping * velocity) * h;
      height += velocity * h;
    }
    if (height < 0.0) {
      height = 0.0;
      velocity = max(velocity, 0.0);
    }
  }
  outState = vec4(height, velocity, mound * front * uMound, 1.0);
}`;
  var BOUND_FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D uState;
uniform vec2 uGridOrigin;
uniform float uCell;
uniform vec2 uStateSize;
uniform float uBoundCell;
out vec4 outBound;

void main() {
  vec2 center = uGridOrigin + (floor(gl_FragCoord.xy) + 0.5) * uBoundCell;
  vec2 base = floor((center - uGridOrigin) / uCell);
  float top = 0.0;
  float peak = 0.0;
  for (int y = -4; y <= 4; y++) {
    for (int x = -4; x <= 4; x++) {
      vec2 texel = clamp(base + vec2(float(x), float(y)), vec2(0.0), uStateSize - 1.0);
      vec4 s = texelFetch(uState, ivec2(texel), 0);
      top = max(top, max(s.x, 0.0) * 1.05 + s.z);
      peak = max(peak, s.x);
    }
  }
  outBound = vec4(top, peak, 0.0, 1.0);
}`;
  var RENDER_FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D uField;
uniform sampler2D uBound;
uniform vec2 uGridOrigin;
uniform vec2 uGridSpan;
uniform vec2 uBoundSpan;
uniform float uCellSize;
uniform vec2 uResolution;
uniform vec3 uCamera;
uniform vec3 uForward;
uniform vec3 uUpward;
uniform float uTanHalf;
uniform float uPixelAngle;
uniform float uFar;
uniform float uFogStart;
uniform float uTop;
uniform float uBottom;
uniform float uTime;
uniform vec4 uCursor;
uniform float uMound;
uniform float uRound;
uniform float uSpan;
uniform float uExponent;
uniform float uWarp;
uniform vec3 uKey;
uniform vec3 uStrip;
uniform vec3 uFill;
uniform float uExposure;
uniform float uLight;
uniform float uOpaque;
uniform vec3 uBase;
uniform float uOpacity;
out vec4 outColor;

const float G = 7.2551975;
const vec2 E1 = vec2(0.8660254, 0.5);
const vec2 E2 = vec2(-0.8660254, 0.5);
const vec2 E3 = vec2(0.0, -1.0);
const mat2 TURN = mat2(0.9902681, 0.1391731, -0.1391731, 0.9902681);
const float F0 = 0.06;

vec3 mound(vec2 p) {
  vec2 d = p - uCursor.xy;
  float inv = 1.0 / (uCursor.w * uCursor.w * 2.2);
  float e = uCursor.z * exp(-dot(d, d) * inv);
  return vec3(e, -2.0 * inv * e * d) * uMound;
}

vec2 lattice(vec2 p) {
  vec2 q = TURN * p;
  float t = uTime * 0.35;
  return q + uWarp * vec2(sin(q.y * 0.9 + t), cos(q.x * 0.8 - t * 0.8));
}

float detail(float t) {
  return smoothstep(3.0, 8.0, 1.0 / max(t * uPixelAngle, 1e-5)) * (1.0 - smoothstep(uFogStart, mix(uFogStart, uFar, 0.7), t));
}

float profile(float u, out float rate) {
  float root = sqrt(max(1.0 - u, 0.0) + uRound * uRound);
  rate = 0.5 / (uSpan * root);
  return clamp(1.0 - (root - uRound) / uSpan, 0.0, 1.0);
}

float spikes(vec2 p, float a, float rise, out float clearance) {
  clearance = 10.0;
  if (a < 0.002) return 0.0;
  vec2 q = lattice(p);
  float u = (cos(G * dot(E1, q)) + cos(G * dot(E2, q)) + cos(G * dot(E3, q)) + 1.5) / 4.5;
  if (a > 0.05) {
    float root = uRound + (1.0 - pow(clamp(rise / a, 0.0, 1.0), 1.0 / uExponent)) * uSpan;
    clearance = sqrt(max(1.0 - u, 0.0) / 8.77) - sqrt(max(root * root - uRound * uRound, 0.0) / 8.77);
  }
  float rate;
  return a * pow(profile(u, rate), uExponent);
}

vec2 spikesSlope(vec2 p, float a, vec2 aSlope) {
  if (a < 0.002) return vec2(0.0);
  vec2 q = lattice(p);
  float c1 = G * dot(E1, q);
  float c2 = G * dot(E2, q);
  float c3 = G * dot(E3, q);
  float u = (cos(c1) + cos(c2) + cos(c3) + 1.5) / 4.5;
  vec2 du = -(G / 4.5) * (sin(c1) * E1 + sin(c2) * E2 + sin(c3) * E3) * TURN;
  float rate;
  float s = max(profile(u, rate), 1e-4);
  float shape = pow(s, uExponent);
  return a * uExponent * shape / s * rate * du + aSlope * shape;
}

float surface(vec2 p, float z, float t, out float clearance) {
  vec4 f = texture(uField, (p - uGridOrigin) / uGridSpan);
  return f.z + spikes(p, f.x * detail(t), z - f.z, clearance);
}

vec2 bound(vec2 p) {
  return texture(uBound, (p - uGridOrigin) / uBoundSpan).rg;
}

float panel(vec3 r, vec3 dir, vec3 up, vec2 extent, float soft) {
  vec3 side = normalize(cross(dir, up));
  vec3 top = cross(side, dir);
  float facing = dot(r, dir);
  if (facing <= 0.0) return 0.0;
  vec2 q = vec2(dot(r, side), dot(r, top)) / facing;
  vec2 e = smoothstep(extent + soft, extent - soft, abs(q));
  return e.x * e.y;
}

vec3 studio(vec3 r, vec3 rd, float soft) {
  vec3 z = vec3(0.0, 0.0, 1.0);
  vec3 col = uKey * 4.2 * panel(r, normalize(vec3(-0.3, -0.5, 0.81)), z, vec2(0.36, 0.22), 0.08 + soft);
  col += uStrip * 1.5 * panel(r, normalize(vec3(-0.9, -0.2, 0.38)), z, vec2(0.12, 0.7), 0.07 + soft);
  col += uStrip * 1.5 * panel(r, normalize(vec3(0.9, -0.1, 0.42)), z, vec2(0.12, 0.7), 0.07 + soft);
  float lift = asin(clamp(r.z, -1.0, 1.0)) - asin(clamp(-rd.z, -1.0, 1.0));
  col += uFill * 0.45 * smoothstep(0.08 - soft, 0.7 + soft, lift) * smoothstep(1.6, 1.0, lift);
  return col;
}

vec4 finish(vec3 light, vec3 paper, float alpha) {
  if (uLight > 0.5) {
    if (uOpaque > 0.5) return vec4(mix(uBase, paper, alpha) * uOpacity, uOpacity);
    vec3 shade = mix(vec3(1.0), paper, alpha * uOpacity);
    float cover = 1.0 - min(shade.r, min(shade.g, shade.b));
    return vec4(shade - (1.0 - cover), cover);
  }
  vec3 glow = light * alpha * uOpacity;
  if (uOpaque > 0.5) return vec4(uBase + glow, 1.0);
  return vec4(glow, max(glow.r, max(glow.g, glow.b)));
}

void main() {
  vec2 ndc = (gl_FragCoord.xy - 0.5 * uResolution) / (0.5 * uResolution.y);
  vec3 side = normalize(cross(uForward, uUpward));
  vec3 rd = normalize(uForward + (ndc.x * side + ndc.y * uUpward) * uTanHalf);
  if (rd.z > -0.004) {
    outColor = finish(vec3(0.0), vec3(1.0), 0.0);
    return;
  }
  float tTop = max((uTop - uCamera.z) / rd.z, 0.0);
  float tEnd = min((uBottom - uCamera.z) / rd.z, uFar);
  if (tTop >= tEnd) {
    outColor = finish(vec3(0.0), vec3(1.0), 0.0);
    return;
  }
  float sink = max(-rd.z, 0.2);
  float glide = max(length(rd.xy), 0.05);
  float chunk = 0.9 / glide;
  float t = tEnd;
  float tPrev = tEnd;
  bool found = false;
  bool smoothHit = false;
  float t0 = tTop;
  vec2 b0 = bound(uCamera.xy + rd.xy * t0);
  for (int c = 0; c < 64; c++) {
    if (t0 >= tEnd) break;
    float t1 = min(t0 + chunk, tEnd);
    vec2 b1 = bound(uCamera.xy + rd.xy * t1);
    float b = max(b0.x, b1.x) + 0.03;
    float z1 = uCamera.z + rd.z * t1;
    if (z1 > b) {
      t0 = t1;
      b0 = b1;
      continue;
    }
    float tt = max(t0, (b - uCamera.z) / rd.z);
    if (max(b0.y, b1.y) < 0.002) {
      for (int k = 0; k < 3; k++) {
        vec3 probe = uCamera + rd * tt;
        tt += (probe.z - mound(probe.xy).x) / sink * 0.95;
      }
      if (tt <= t1 + 0.02 || t1 >= tEnd) {
        t = tt;
        smoothHit = true;
        break;
      }
      t0 = t1;
      b0 = b1;
      continue;
    }
    float tp = tt;
    for (int k = 0; k < 48; k++) {
      vec3 pos = uCamera + rd * tt;
      float clearance;
      float gap = pos.z - surface(pos.xy, pos.z, tt, clearance);
      if (gap < 0.0) {
        found = true;
        break;
      }
      tp = tt;
      float pixel = tt * uPixelAngle;
      float limit = pos.z > bound(pos.xy).x + 0.02 ? 0.6 / glide : max(clearance * 0.9, pixel) / glide;
      tt += max(min(gap * 0.75 / sink, limit), pixel);
      if (tt > t1) break;
    }
    if (found) {
      t = tt;
      tPrev = tp;
      break;
    }
    t0 = t1;
    b0 = b1;
  }

  vec3 pos;
  vec2 slope;
  if (smoothHit || !found) {
    pos = uCamera + rd * t;
    slope = mound(pos.xy).yz;
  } else {
    float lo = tPrev;
    float hi = t;
    for (int k = 0; k < 4; k++) {
      float mid = 0.5 * (lo + hi);
      vec3 probe = uCamera + rd * mid;
      float clearance;
      if (probe.z - surface(probe.xy, probe.z, mid, clearance) < 0.0) hi = mid;
      else lo = mid;
    }
    t = hi;
    pos = uCamera + rd * t;
    vec2 uv = (pos.xy - uGridOrigin) / uGridSpan;
    vec2 step = uCellSize / uGridSpan;
    float fade = detail(t);
    float a = texture(uField, uv).x * fade;
    vec2 aSlope = vec2(
      texture(uField, uv + vec2(step.x, 0.0)).x - texture(uField, uv - vec2(step.x, 0.0)).x,
      texture(uField, uv + vec2(0.0, step.y)).x - texture(uField, uv - vec2(0.0, step.y)).x
    ) * fade / (2.0 * uCellSize);
    slope = mound(pos.xy).yz + spikesSlope(pos.xy, a, aSlope);
  }

  vec3 n = normalize(vec3(-slope, 1.0));
  vec3 r = reflect(rd, n);
  float soft = length(fwidth(r)) * 0.6;
  float facing = max(dot(n, -rd), 0.0);
  float fresnel = F0 + (1.0 - F0) * pow(1.0 - facing, 5.0);
  float rim = pow(1.0 - clamp(abs(dot(rd, n)), 0.0, 1.0), 3.0) * smoothstep(0.85, 0.4, n.z);
  float distance = 1.0 - smoothstep(uFogStart, uFar, t);

  if (uLight > 0.5) {
    vec3 key = normalize(vec3(-0.45, -0.55, 0.7));
    float lambert = clamp(dot(n, key) / key.z, 0.0, 1.0);
    float diffuse = mix(0.62, 1.0, lambert);
    float room = mix(0.3, 1.0, smoothstep(-0.25, 0.3, r.z));
    room -= 0.3 * rim;
    float lum = mix(diffuse, room, fresnel);
    lum = 1.0 - (1.0 - lum) * clamp(uExposure / 3.0, 0.0, 1.5);
    vec3 shadow = mix(vec3(0.0), uStrip, 0.45);
    vec3 paper = mix(shadow, vec3(1.0), clamp(lum, 0.0, 1.0));
    outColor = finish(vec3(0.0), paper, distance);
    return;
  }

  vec3 shine = 1.0 - exp(-(studio(r, rd, soft) * fresnel + uFill * rim * 0.35) * uExposure);
  outColor = finish(shine, vec3(1.0), distance);
}`;
  var clamp4 = (value, min, max) => Math.min(max, Math.max(min, value));
  var shapeOf = (sharpness) => {
    const edge = clamp4((sharpness - 1) / 4, 0, 1);
    const round = 1 - edge * 0.7;
    const exponent = 1.05 + edge * 1.2;
    const span = Math.sqrt(1 + round * round) - round;
    return { round, exponent, span };
  };
  var compile4 = (gl, type, source) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
    gl.deleteShader(shader);
    return null;
  };
  var link3 = (gl, fragmentSource) => {
    const vertex2 = compile4(gl, gl.VERTEX_SHADER, VERTEX4);
    const fragment2 = compile4(gl, gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    if (!vertex2 || !fragment2 || !program) {
      if (program) gl.deleteProgram(program);
      if (vertex2) gl.deleteShader(vertex2);
      if (fragment2) gl.deleteShader(fragment2);
      return null;
    }
    gl.attachShader(program, vertex2);
    gl.attachShader(program, fragment2);
    gl.bindAttribLocation(program, 0, "aPosition");
    gl.linkProgram(program);
    gl.deleteShader(vertex2);
    gl.deleteShader(fragment2);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      return null;
    }
    const uniforms = {};
    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i++) {
      const info = gl.getActiveUniform(program, i);
      if (info) uniforms[info.name.replace("[0]", "")] = gl.getUniformLocation(program, info.name);
    }
    return { program, uniforms };
  };
  var mountFerrofluid = (root) => {
    if (!canRunEffects(root)) return null;
    const win = windowOf(root);
    const doc = root.ownerDocument;
    if (!win) return null;
    const canvas = effectCanvas(root);
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false
    });
    if (!gl) return abortMount(canvas);
    const floatTargets = Boolean(gl.getExtension("EXT_color_buffer_float"));
    const sim = link3(gl, SIM_FRAGMENT);
    const bounds = link3(gl, BOUND_FRAGMENT);
    const renderProgram = link3(gl, RENDER_FRAGMENT);
    if (!sim || !bounds || !renderProgram) {
      if (sim) gl.deleteProgram(sim.program);
      if (bounds) gl.deleteProgram(bounds.program);
      if (renderProgram) gl.deleteProgram(renderProgram.program);
      return abortMount(canvas);
    }
    const buffer = gl.createBuffer();
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const makeTarget = (width, height, filter) => {
      const texture = gl.createTexture();
      if (!texture) return null;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      if (floatTargets) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, width, height, 0, gl.RGBA, gl.HALF_FLOAT, null);
      else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const framebuffer = gl.createFramebuffer();
      if (!framebuffer) {
        gl.deleteTexture(texture);
        return null;
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      return { texture, framebuffer };
    };
    const dropTarget = (target) => {
      if (!target) return;
      gl.deleteTexture(target.texture);
      gl.deleteFramebuffer(target.framebuffer);
    };
    const probe = doc.createElement("canvas").getContext("2d", { willReadFrequently: true });
    const cache = /* @__PURE__ */ new Map();
    const parse = (value, fallback) => {
      if (!value) return fallback;
      const key = String(value);
      const cached = cache.get(key);
      if (cached) return cached;
      let rgb = fallback;
      if (probe) {
        probe.clearRect(0, 0, 1, 1);
        probe.fillStyle = "#000000";
        probe.fillStyle = key;
        probe.fillRect(0, 0, 1, 1);
        const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
        rgb = [r / 255, g / 255, b / 255];
      }
      cache.set(key, rgb);
      return rgb;
    };
    const reduce = win.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const settings = {
      colors: ["#ffffff", "#ffffff", "#ffffff"],
      speed: 0.5,
      scale: 1.6,
      spikeHeight: 1,
      sharpness: 2.5,
      turbulence: 1,
      fluidity: 0.5,
      tilt: 48,
      magnetism: 1,
      variation: 0,
      flow: FLOW.down,
      brightness: 1,
      mouseInteraction: true,
      mouseStrength: 1,
      mouseRadius: 0.22,
      mouseDampening: 0.15,
      clickPulse: true,
      intro: true,
      lightMode: false,
      transparent: true,
      color: void 0,
      opacity: 1,
      paused: false,
      dpr: void 0
    };
    const tanHalf = Math.tan(FOV / 2);
    const view = { width: 1, height: 1, worldHeight: 10, scale: 0, tilt: -1, reach: 1 };
    const camera = { x: 0, y: 0, z: 1, forward: [0, 1, 0], upward: [0, 0, 1], far: 10, distance: 4 };
    const grid = { width: 0, height: 0, originX: 0, originY: 0, boundWidth: 0, boundHeight: 0 };
    let states = [];
    let boundTarget = null;
    let current = 0;
    let settle = true;
    const pointer = { x: 0, y: 0, inside: false };
    const cursor = { x: 0, y: 0, strength: 0 };
    const pulse = { x: 0, y: 0, age: 10 };
    let wander = 0;
    let presence = settings.intro && !reduce ? 0 : 1;
    let shape = shapeOf(settings.sharpness);
    let shapeKey = settings.sharpness;
    let raf = 0;
    let last = 0;
    let visible = true;
    let alive = true;
    const castRay = (x, y) => {
      const aspect = view.width / view.height;
      const sx = x * aspect * tanHalf;
      const sy = y * tanHalf;
      const [fx, fy, fz] = camera.forward;
      const [, uy, uz] = camera.upward;
      const dx = fx + sx;
      const dy = fy + sy * uy;
      const dz = fz + sy * uz;
      const length3 = Math.hypot(dx, dy, dz) || 1;
      return [dx / length3, dy / length3, dz / length3];
    };
    const groundAt = (x, y) => {
      const [dx, dy, dz] = castRay(x, y);
      const t = dz < -4e-3 ? Math.min(-camera.z / dz, camera.far) : camera.far;
      return [camera.x + dx * t, camera.y + dy * t];
    };
    const layout = () => {
      const width = Math.max(1, root.clientWidth);
      const height = Math.max(1, root.clientHeight);
      const ratio = Math.min(settings.dpr || pixelRatio(win), 2);
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      view.width = canvas.width;
      view.height = canvas.height;
      view.worldHeight = 22 / settings.scale;
      view.scale = settings.scale;
      view.tilt = settings.tilt;
      const pitch = (90 - settings.tilt) * Math.PI / 180;
      const distance2 = view.worldHeight / (2 * tanHalf);
      camera.forward = [0, Math.cos(pitch), -Math.sin(pitch)];
      camera.upward = [0, Math.sin(pitch), Math.cos(pitch)];
      camera.x = 0;
      camera.y = -distance2 * Math.cos(pitch);
      camera.z = distance2 * Math.sin(pitch);
      camera.far = distance2 * 2.5;
      camera.distance = distance2;
      const corners = [groundAt(-1, -1), groundAt(1, -1), groundAt(-1, 1), groundAt(1, 1), groundAt(0, 1)];
      const xs = corners.map((c) => c[0]);
      const ys = corners.map((c) => c[1]);
      const minX = Math.min(...xs) - 3;
      const maxX = Math.max(...xs) + 3;
      const minY = Math.min(...ys) - 3;
      const maxY = Math.max(...ys) + 3;
      view.reach = Math.max(...corners.map((c) => Math.hypot(c[0], c[1]))) + 4;
      const gridWidth = Math.ceil((maxX - minX) / CELL) + 2;
      const gridHeight = Math.ceil((maxY - minY) / CELL) + 2;
      grid.originX = minX;
      grid.originY = minY;
      if (gridWidth !== grid.width || gridHeight !== grid.height) {
        states.forEach(dropTarget);
        dropTarget(boundTarget);
        states = [];
        boundTarget = null;
        const first = makeTarget(gridWidth, gridHeight, gl.LINEAR);
        const second = makeTarget(gridWidth, gridHeight, gl.LINEAR);
        const boundWidth = Math.ceil(gridWidth * CELL / BOUND_CELL);
        const boundHeight = Math.ceil(gridHeight * CELL / BOUND_CELL);
        const bound = first && second ? makeTarget(boundWidth, boundHeight, gl.NEAREST) : null;
        if (first && second && bound) {
          states = [first, second];
          grid.width = gridWidth;
          grid.height = gridHeight;
          grid.boundWidth = boundWidth;
          grid.boundHeight = boundHeight;
          boundTarget = bound;
          current = 0;
        }
      }
      settle = true;
    };
    const toWorld = (clientX, clientY) => {
      const rect = root.getBoundingClientRect();
      const x = (clientX - rect.left) / Math.max(1, rect.width) * 2 - 1;
      const y = 1 - (clientY - rect.top) / Math.max(1, rect.height) * 2;
      return groundAt(x, y);
    };
    const step = (dt) => {
      if (settings.scale !== view.scale || settings.tilt !== view.tilt) layout();
      const motion = settings.paused ? 0 : 1;
      wander += dt * motion * (reduce ? 0 : settings.speed);
      presence = settings.intro && !reduce ? Math.min(1, presence + dt * motion / INTRO_SECONDS2) : 1;
      pulse.age += dt * motion;
      const engaged = settings.mouseInteraction && pointer.inside;
      const follow = settings.mouseDampening > 0 ? 1 - Math.exp(-dt / settings.mouseDampening) : 1;
      if (engaged) {
        cursor.x += (pointer.x - cursor.x) * follow;
        cursor.y += (pointer.y - cursor.y) * follow;
      }
      const targetStrength = engaged ? settings.mouseStrength * 1.4 : 0;
      cursor.strength += (targetStrength - cursor.strength) * (1 - Math.exp(-dt / 0.35));
      if (Math.abs(targetStrength - cursor.strength) < 1e-3) cursor.strength = targetStrength;
    };
    const draw = (dt) => {
      if (!boundTarget || states.length < 2) return;
      const worldUnit = view.worldHeight;
      const radius = settings.mouseRadius * worldUnit;
      const fullHeight = 1.2 * settings.spikeHeight;
      if (settings.sharpness !== shapeKey) {
        shapeKey = settings.sharpness;
        shape = shapeOf(settings.sharpness);
      }
      const reveal = presence * presence * (3 - 2 * presence);
      gl.bindVertexArray(vao);
      gl.activeTexture(gl.TEXTURE0);
      const read = states[current];
      const write = states[1 - current];
      gl.bindFramebuffer(gl.FRAMEBUFFER, write.framebuffer);
      gl.viewport(0, 0, grid.width, grid.height);
      gl.useProgram(sim.program);
      const su = sim.uniforms;
      gl.bindTexture(gl.TEXTURE_2D, read.texture);
      gl.uniform1i(su.uState, 0);
      gl.uniform2f(su.uGridOrigin, grid.originX, grid.originY);
      gl.uniform1f(su.uCell, CELL);
      gl.uniform1f(su.uDt, Math.max(dt, 1e-3));
      gl.uniform1f(su.uTime, wander);
      gl.uniform2f(su.uFlow, settings.flow[0], settings.flow[1]);
      gl.uniform1f(su.uTurbulence, settings.turbulence);
      gl.uniform1f(su.uMagnetism, settings.magnetism);
      gl.uniform1f(su.uFieldScale, 5.5);
      gl.uniform2f(su.uSeed, settings.variation * 17.31, settings.variation * 9.73);
      gl.uniform4f(su.uCursor, cursor.x, cursor.y, cursor.strength, radius);
      gl.uniform4f(su.uPulse, pulse.x, pulse.y, pulse.age, pulse.age < 4 ? 1.1 : 0);
      gl.uniform1f(su.uPulseSpeed, worldUnit * 0.45);
      gl.uniform1f(su.uPulseWidth, 1.4);
      gl.uniform3f(su.uIntro, 0, 0, reveal * (view.reach + 3));
      gl.uniform1f(su.uSpikeHeight, fullHeight);
      gl.uniform1f(su.uMound, 0.6);
      gl.uniform1f(su.uStiffness, 150);
      gl.uniform1f(su.uDamping, 22 - settings.fluidity * 15);
      gl.uniform1f(su.uSettle, settle || !floatTargets || reduce ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      settle = false;
      current = 1 - current;
      gl.bindFramebuffer(gl.FRAMEBUFFER, boundTarget.framebuffer);
      gl.viewport(0, 0, grid.boundWidth, grid.boundHeight);
      gl.useProgram(bounds.program);
      const bu = bounds.uniforms;
      gl.bindTexture(gl.TEXTURE_2D, write.texture);
      gl.uniform1i(bu.uState, 0);
      gl.uniform2f(bu.uGridOrigin, grid.originX, grid.originY);
      gl.uniform1f(bu.uCell, CELL);
      gl.uniform2f(bu.uStateSize, grid.width, grid.height);
      gl.uniform1f(bu.uBoundCell, BOUND_CELL);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, view.width, view.height);
      gl.useProgram(renderProgram.program);
      const ru = renderProgram.uniforms;
      gl.bindTexture(gl.TEXTURE_2D, write.texture);
      gl.uniform1i(ru.uField, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, boundTarget.texture);
      gl.uniform1i(ru.uBound, 1);
      gl.activeTexture(gl.TEXTURE0);
      gl.uniform2f(ru.uGridOrigin, grid.originX, grid.originY);
      gl.uniform2f(ru.uGridSpan, grid.width * CELL, grid.height * CELL);
      gl.uniform2f(ru.uBoundSpan, grid.boundWidth * BOUND_CELL, grid.boundHeight * BOUND_CELL);
      gl.uniform1f(ru.uCellSize, CELL);
      gl.uniform2f(ru.uResolution, view.width, view.height);
      gl.uniform3f(ru.uCamera, camera.x, camera.y, camera.z);
      gl.uniform3fv(ru.uForward, camera.forward);
      gl.uniform3fv(ru.uUpward, camera.upward);
      gl.uniform1f(ru.uTanHalf, tanHalf);
      gl.uniform1f(ru.uPixelAngle, 2 * tanHalf / view.height);
      gl.uniform1f(ru.uFar, camera.far);
      gl.uniform1f(ru.uFogStart, camera.distance * 0.95);
      gl.uniform1f(ru.uTop, fullHeight * 1.6 + 0.6 * 3 + 0.1);
      gl.uniform1f(ru.uBottom, -0.05);
      gl.uniform1f(ru.uTime, wander * 2);
      gl.uniform4f(ru.uCursor, cursor.x, cursor.y, cursor.strength, radius);
      gl.uniform1f(ru.uMound, 0.6);
      gl.uniform1f(ru.uRound, shape.round);
      gl.uniform1f(ru.uSpan, shape.span);
      gl.uniform1f(ru.uExponent, shape.exponent);
      gl.uniform1f(ru.uWarp, 0.06 * settings.turbulence);
      const lights = settings.colors.map((value) => parse(value, [1, 1, 1]));
      const key = lights[0];
      const strip = lights[1] ?? key;
      const fill = lights[2] ?? strip;
      gl.uniform3fv(ru.uKey, key);
      gl.uniform3fv(ru.uStrip, strip);
      gl.uniform3fv(ru.uFill, fill);
      gl.uniform1f(ru.uExposure, 3 * settings.brightness);
      gl.uniform1f(ru.uLight, settings.lightMode ? 1 : 0);
      gl.uniform1f(ru.uOpaque, settings.transparent ? 0 : 1);
      gl.uniform3fv(ru.uBase, parse(settings.color, settings.lightMode ? [1, 1, 1] : [0.0706, 0.0588, 0.0902]));
      gl.uniform1f(ru.uOpacity, settings.opacity);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const frame = (now) => {
      raf = 0;
      if (!alive || !visible || doc.hidden) return;
      const dt = last ? clamp4((now - last) / 1e3, 5e-4, 0.05) : 1 / 60;
      last = now;
      step(dt);
      draw(dt);
      raf = win.requestAnimationFrame(frame);
    };
    const wake = () => {
      if (!raf && alive && visible && !doc.hidden) raf = win.requestAnimationFrame(frame);
    };
    const resize = () => {
      layout();
      draw(0);
      wake();
    };
    const locate = (event) => {
      const rect = root.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      pointer.inside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
      const world = toWorld(event.clientX, event.clientY);
      pointer.x = world[0];
      pointer.y = world[1];
    };
    const onPointerMove = (event) => {
      const wasInside = pointer.inside;
      locate(event);
      if (pointer.inside && !wasInside && cursor.strength < 0.05) {
        cursor.x = pointer.x;
        cursor.y = pointer.y;
      }
      wake();
    };
    const onPointerDown = (event) => {
      onPointerMove(event);
      if (!pointer.inside || !settings.clickPulse || reduce) return;
      pulse.x = pointer.x;
      pulse.y = pointer.y;
      pulse.age = 0;
    };
    const onPointerUp = (event) => {
      if (event.pointerType !== "mouse") pointer.inside = false;
    };
    const onPointerLeave = () => {
      pointer.inside = false;
    };
    const onVisibility = () => {
      last = 0;
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
          last = 0;
          wake();
        }
      });
      visibility.observe(root);
    }
    win.addEventListener("pointermove", onPointerMove, { passive: true });
    win.addEventListener("pointerdown", onPointerDown, { passive: true });
    win.addEventListener("pointerup", onPointerUp, { passive: true });
    win.addEventListener("pointercancel", onPointerUp, { passive: true });
    doc.documentElement.addEventListener("pointerleave", onPointerLeave);
    doc.addEventListener("visibilitychange", onVisibility);
    resize();
    const instance = {
      destroy() {
        alive = false;
        if (raf) win.cancelAnimationFrame(raf);
        raf = 0;
        resizeObserver?.disconnect();
        visibility?.disconnect();
        if (onWindowResize) win.removeEventListener("resize", onWindowResize);
        win.removeEventListener("pointermove", onPointerMove);
        win.removeEventListener("pointerdown", onPointerDown);
        win.removeEventListener("pointerup", onPointerUp);
        win.removeEventListener("pointercancel", onPointerUp);
        doc.documentElement.removeEventListener("pointerleave", onPointerLeave);
        doc.removeEventListener("visibilitychange", onVisibility);
        states.forEach(dropTarget);
        dropTarget(boundTarget);
        gl.deleteProgram(sim.program);
        gl.deleteProgram(bounds.program);
        gl.deleteProgram(renderProgram.program);
        if (buffer) gl.deleteBuffer(buffer);
        if (vao) gl.deleteVertexArray(vao);
        try {
          gl.getExtension("WEBGL_lose_context")?.loseContext();
        } catch {
        }
        canvas.remove();
      }
    };
    return instance;
  };

  // src/features/courses/reactbits/line-waves.ts
  var hexToVec3 = (hex) => {
    const h = hex.replace("#", "");
    return [
      parseInt(h.slice(0, 2), 16) / 255,
      parseInt(h.slice(2, 4), 16) / 255,
      parseInt(h.slice(4, 6), 16) / 255
    ];
  };
  var vertexShader = `
attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0, 1);
}
`;
  var fragmentShader = `
precision highp float;

uniform float uTime;
uniform vec3 uResolution;
uniform float uSpeed;
uniform float uInnerLines;
uniform float uOuterLines;
uniform float uWarpIntensity;
uniform float uRotation;
uniform float uEdgeFadeWidth;
uniform float uColorCycleSpeed;
uniform float uBrightness;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform vec2 uMouse;
uniform float uMouseInfluence;
uniform bool uEnableMouse;
uniform float uLightMode;

#define HALF_PI 1.5707963

float hashF(float n) {
  return fract(sin(n * 127.1) * 43758.5453123);
}

float smoothNoise(float x) {
  float i = floor(x);
  float f = fract(x);
  float u = f * f * (3.0 - 2.0 * f);
  return mix(hashF(i), hashF(i + 1.0), u);
}

float displaceA(float coord, float t) {
  float result = sin(coord * 2.123) * 0.2;
  result += sin(coord * 3.234 + t * 4.345) * 0.1;
  result += sin(coord * 0.589 + t * 0.934) * 0.5;
  return result;
}

float displaceB(float coord, float t) {
  float result = sin(coord * 1.345) * 0.3;
  result += sin(coord * 2.734 + t * 3.345) * 0.2;
  result += sin(coord * 0.189 + t * 0.934) * 0.3;
  return result;
}

vec2 rotate2D(vec2 p, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return vec2(p.x * c - p.y * s, p.x * s + p.y * c);
}

void main() {
  vec2 coords = gl_FragCoord.xy / uResolution.xy;
  coords = coords * 2.0 - 1.0;
  coords = rotate2D(coords, uRotation);

  float halfT = uTime * uSpeed * 0.5;
  float fullT = uTime * uSpeed;

  float mouseWarp = 0.0;
  if (uEnableMouse) {
    vec2 mPos = rotate2D(uMouse * 2.0 - 1.0, uRotation);
    float mDist = length(coords - mPos);
    mouseWarp = uMouseInfluence * exp(-mDist * mDist * 4.0);
  }

  float warpAx = coords.x + displaceA(coords.y, halfT) * uWarpIntensity + mouseWarp;
  float warpAy = coords.y - displaceA(coords.x * cos(fullT) * 1.235, halfT) * uWarpIntensity;
  float warpBx = coords.x + displaceB(coords.y, halfT) * uWarpIntensity + mouseWarp;
  float warpBy = coords.y - displaceB(coords.x * sin(fullT) * 1.235, halfT) * uWarpIntensity;

  vec2 fieldA = vec2(warpAx, warpAy);
  vec2 fieldB = vec2(warpBx, warpBy);
  vec2 blended = mix(fieldA, fieldB, mix(fieldA, fieldB, 0.5));

  float fadeTop = smoothstep(uEdgeFadeWidth, uEdgeFadeWidth + 0.4, blended.y);
  float fadeBottom = smoothstep(-uEdgeFadeWidth, -(uEdgeFadeWidth + 0.4), blended.y);
  float vMask = 1.0 - max(fadeTop, fadeBottom);

  float tileCount = mix(uOuterLines, uInnerLines, vMask);
  float scaledY = blended.y * tileCount;
  float nY = smoothNoise(abs(scaledY));

  float ridge = pow(
    step(abs(nY - blended.x) * 2.0, HALF_PI) * cos(2.0 * (nY - blended.x)),
    5.0
  );

  float lines = 0.0;
  for (float i = 1.0; i < 3.0; i += 1.0) {
    lines += pow(max(fract(scaledY), fract(-scaledY)), i * 2.0);
  }

  float pattern = vMask * lines;

  float cycleT = fullT * uColorCycleSpeed;
  float rChannel = (pattern + lines * ridge) * (cos(blended.y + cycleT * 0.234) * 0.5 + 1.0);
  float gChannel = (pattern + vMask * ridge) * (sin(blended.x + cycleT * 1.745) * 0.5 + 1.0);
  float bChannel = (pattern + lines * ridge) * (cos(blended.x + cycleT * 0.534) * 0.5 + 1.0);

  vec3 col = (rChannel * uColor1 + gChannel * uColor2 + bChannel * uColor3) * uBrightness;
  float alpha = clamp(length(col), 0.0, 1.0);

  if (uLightMode > 0.5) {
    vec3 weights = pow(max(vec3(rChannel, gChannel, bChannel), vec3(0.0)), vec3(3.0));
    float weightSum = max(weights.r + weights.g + weights.b, 0.0001);
    vec3 chroma = (weights.r * uColor1 + weights.g * uColor2 + weights.b * uColor3) / weightSum;
    float neutral = min(chroma.r, min(chroma.g, chroma.b));
    chroma = max(chroma - vec3(neutral * 0.92), vec3(0.0));
    float peak = max(chroma.r, max(chroma.g, chroma.b));
    chroma = pow(clamp(chroma / max(peak, 0.0001), 0.0, 1.0), vec3(1.08));
    float ink = clamp(max(rChannel, max(gChannel, bChannel)) * uBrightness * 1.15, 0.0, 0.92);
    gl_FragColor = vec4(mix(vec3(1.0), chroma, ink), 1.0);
  } else {
    gl_FragColor = vec4(col, alpha);
  }
}
`;
  var mountLineWaves = (root) => {
    if (!canRunEffects(root)) return null;
    const win = windowOf(root);
    const doc = root.ownerDocument;
    if (!win) return null;
    const settings = {
      speed: 0.3,
      innerLineCount: 32,
      outerLineCount: 36,
      warpIntensity: 1,
      rotation: -45,
      edgeFadeWidth: 0,
      colorCycleSpeed: 1,
      brightness: 0.2,
      color1: "#ffffff",
      color2: "#ffffff",
      color3: "#ffffff",
      enableMouseInteraction: true,
      mouseInfluence: 2,
      lightMode: false
    };
    let renderer;
    try {
      renderer = new Renderer({ canvas: doc.createElement("canvas"), alpha: true, premultipliedAlpha: false });
    } catch {
      return null;
    }
    const gl = renderer.gl;
    const canvas = gl.canvas;
    gl.clearColor(0, 0, 0, 0);
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.position = "absolute";
    canvas.style.inset = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    canvas.style.pointerEvents = "none";
    root.appendChild(canvas);
    let alive = true;
    let raf = 0;
    let program;
    const currentMouse = [0.5, 0.5];
    let targetMouse = [0.5, 0.5];
    const handleMouseMove = (e) => {
      const rect = root.getBoundingClientRect();
      targetMouse = [
        (e.clientX - rect.left) / Math.max(1, rect.width),
        1 - (e.clientY - rect.top) / Math.max(1, rect.height)
      ];
    };
    const handleMouseLeave = () => {
      targetMouse = [0.5, 0.5];
    };
    const resize = () => {
      renderer.setSize(root.offsetWidth, root.offsetHeight);
      if (program) {
        program.uniforms.uResolution.value = [canvas.width, canvas.height, canvas.width / canvas.height];
      }
    };
    win.addEventListener("resize", resize);
    resize();
    const geometry = new Triangle(gl);
    const rotationRad = settings.rotation * Math.PI / 180;
    program = new Program(gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: [canvas.width, canvas.height, canvas.width / canvas.height] },
        uSpeed: { value: settings.speed },
        uInnerLines: { value: settings.innerLineCount },
        uOuterLines: { value: settings.outerLineCount },
        uWarpIntensity: { value: settings.warpIntensity },
        uRotation: { value: rotationRad },
        uEdgeFadeWidth: { value: settings.edgeFadeWidth },
        uColorCycleSpeed: { value: settings.colorCycleSpeed },
        uBrightness: { value: settings.brightness },
        uColor1: { value: hexToVec3(settings.color1) },
        uColor2: { value: hexToVec3(settings.color2) },
        uColor3: { value: hexToVec3(settings.color3) },
        uMouse: { value: new Float32Array([0.5, 0.5]) },
        uMouseInfluence: { value: settings.mouseInfluence },
        uEnableMouse: { value: settings.enableMouseInteraction },
        uLightMode: { value: settings.lightMode ? 1 : 0 }
      }
    });
    const activeProgram = program;
    const mesh = new Mesh(gl, { geometry, program: activeProgram });
    if (settings.enableMouseInteraction) {
      win.addEventListener("mousemove", handleMouseMove, { passive: true });
      doc.documentElement.addEventListener("mouseleave", handleMouseLeave);
    }
    const update = (time) => {
      if (!alive) return;
      raf = win.requestAnimationFrame(update);
      activeProgram.uniforms.uTime.value = time * 1e-3;
      if (settings.enableMouseInteraction) {
        currentMouse[0] += 0.05 * (targetMouse[0] - currentMouse[0]);
        currentMouse[1] += 0.05 * (targetMouse[1] - currentMouse[1]);
        activeProgram.uniforms.uMouse.value[0] = currentMouse[0];
        activeProgram.uniforms.uMouse.value[1] = currentMouse[1];
      } else {
        activeProgram.uniforms.uMouse.value[0] = 0.5;
        activeProgram.uniforms.uMouse.value[1] = 0.5;
      }
      renderer.render({ scene: mesh });
    };
    raf = win.requestAnimationFrame(update);
    const instance = {
      destroy() {
        alive = false;
        if (raf) win.cancelAnimationFrame(raf);
        raf = 0;
        win.removeEventListener("resize", resize);
        if (settings.enableMouseInteraction) {
          win.removeEventListener("mousemove", handleMouseMove);
          doc.documentElement.removeEventListener("mouseleave", handleMouseLeave);
        }
        canvas.remove();
        try {
          gl.getExtension("WEBGL_lose_context")?.loseContext();
        } catch {
        }
      }
    };
    return instance;
  };

  // src/features/courses/reactbits/radar.ts
  var QUAD_VERTEX = `#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;
  var CAMERA = `
uniform vec2 uResolution;
uniform vec2 uCenter;
uniform float uViewHeight;
uniform float uFocal;
uniform float uDistance;
uniform float uTilt;
`;
  var SCENE = `#version 300 es
precision highp float;
${CAMERA}
uniform float uMode;
uniform float uSweep;
uniform float uSwept;
uniform float uDirection;
uniform float uCycle;
uniform float uTrail;
uniform float uRings;
uniform float uSpokes;
uniform float uTicks;
uniform float uGrid;
uniform float uLine;
uniform float uClutter;
uniform float uTime;
uniform vec3 uAccent;
uniform vec3 uHeat;
uniform float uIntro;
uniform float uRange;
uniform float uPixel;
out vec4 outColor;

const float TAU = 6.28318531;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float stroke(float distance, float width) {
  float w = max(width, 1.0) * 0.5;
  return clamp(w + 0.5 - distance, 0.0, 1.0) * min(width, 1.0);
}

void main() {
  vec2 s = (gl_FragCoord.xy - uCenter) / uViewHeight;
  float ct = cos(uTilt);
  float st = sin(uTilt);
  vec3 forward = vec3(0.0, st, -ct);
  vec3 up = vec3(0.0, ct, st);
  vec3 dir = forward * uFocal + vec3(s.x, 0.0, 0.0) + up * s.y;
  vec3 eye = vec3(0.0, -uDistance * st, uDistance * ct);
  float hit = -eye.z / min(dir.z, -0.00001);
  vec2 p = eye.xy + dir.xy * hit;
  float r = length(p);
  vec2 dpdx = dFdx(p);
  vec2 dpdy = dFdy(p);
  if (dir.z > -0.0001 || r > 1.3) {
    outColor = vec4(0.0);
    return;
  }
  vec2 radial = p / max(r, 0.00001);
  vec2 tangent = vec2(radial.y, -radial.x);
  float pxR = max(length(vec2(dot(radial, dpdx), dot(radial, dpdy))), 0.000001);
  float pxT = max(length(vec2(dot(tangent, dpdx), dot(tangent, dpdy))), 0.000001);
  float bearing = atan(p.x, p.y);
  float turn = fract(bearing / TAU + 1.0);
  float inside = 1.0 - smoothstep(1.0 - pxR, 1.0 + pxR, r);

  float ringCoord = r * uRings;
  float ringIndex = clamp(floor(ringCoord + 0.5), 1.0, max(uRings - 1.0, 1.0));
  float rings = stroke(abs(ringCoord - ringIndex) / uRings / pxR, uLine) * step(ringIndex, uRings - 0.5);
  float arc = clamp(uIntro * (uRings + 3.0) - ringIndex, 0.0, 1.0) * 1.02;
  rings *= 1.0 - smoothstep(arc - 0.01, arc, turn);
  float outerArc = clamp(uIntro * (uRings + 3.0) - uRings, 0.0, 1.0) * 1.02;
  float outer = stroke(abs(r - 1.0) / pxR, uLine * 1.15) * (1.0 - smoothstep(outerArc - 0.01, outerArc, turn));

  float tickCoord = turn * 180.0;
  float tickIndex = floor(tickCoord + 0.5);
  float major = 1.0 - step(0.5, mod(tickIndex, 15.0));
  float middle = 1.0 - step(0.5, mod(tickIndex, 5.0));
  float tickLength = mix(mix(0.016, 0.03, middle), 0.05, major);
  float tickRadial = clamp((r - 1.0) / pxR + 0.5, 0.0, 1.0) * clamp((1.0 + tickLength - r) / pxR + 0.5, 0.0, 1.0);
  float spacing = TAU / 180.0 * r / pxT;
  float ticks = stroke(abs(tickCoord - tickIndex) / 180.0 * TAU * r / pxT, uLine) * tickRadial;
  ticks *= mix(mix(0.42 * smoothstep(2.5, 5.0, spacing), 0.7, middle), 1.0, major) * uTicks;
  ticks *= smoothstep(0.55, 0.9, uIntro);

  float spokeTotal = max(uSpokes, 1.0);
  float spokeCoord = turn * spokeTotal;
  float spokeIndex = floor(spokeCoord + 0.5);
  float spokes = stroke(abs(spokeCoord - spokeIndex) / spokeTotal * TAU * r / pxT, uLine) * smoothstep(0.05, 0.16, r);
  spokes *= inside * step(0.5, uSpokes);
  float cardinalCoord = turn * 4.0;
  float cardinal = stroke(abs(cardinalCoord - floor(cardinalCoord + 0.5)) / 4.0 * TAU * r / pxT, uLine) * smoothstep(0.02, 0.08, r) * inside;
  float hub = stroke(abs(r - 0.022) / pxR, uLine);
  float spokesIn = smoothstep(0.35, 0.8, uIntro);
  float axisDistance = abs(cardinalCoord - floor(cardinalCoord + 0.5)) / 4.0 * TAU * r / pxT;
  float rangeCoord = r * uRings * 5.0;
  float rangeMark = stroke(abs(rangeCoord - floor(rangeCoord + 0.5)) / (uRings * 5.0) / pxR, uLine);
  rangeMark *= 1.0 - smoothstep(3.0 * uPixel - 0.5, 3.0 * uPixel + 0.5, axisDistance);
  rangeMark *= smoothstep(0.06, 0.12, r) * inside;
  float bezel = stroke(abs(r - 1.065) / pxR, uLine) * uTicks * smoothstep(0.6, 0.95, uIntro);

  float grid = rings * 0.12 + outer * 0.24 + ticks * 0.22 + bezel * 0.08;
  grid += (spokes * 0.05 + cardinal * 0.08 + hub * 0.22 + rangeMark * 0.16) * spokesIn;
  grid *= uGrid;

  float behind;
  float edge;
  float trail;
  float lastPass;
  if (uMode < 0.5) {
    float ahead = fract((bearing - uSweep) / TAU + 0.5) - 0.5;
    behind = fract(uDirection * (uSweep - bearing) / TAU) * TAU;
    edge = stroke(abs(ahead) * TAU * r / pxT, uLine * 1.4) * smoothstep(0.0, 0.04, r) * inside;
    trail = exp(-behind / uTrail) * (1.0 - smoothstep(uSwept - 0.15, uSwept, behind));
    lastPass = floor(uCycle - behind / TAU);
  } else {
    behind = uSweep - r;
    edge = stroke(abs(behind) / pxR, uLine * 1.4) * inside;
    trail = behind >= 0.0 ? exp(-behind / uTrail) : 0.0;
    lastPass = behind >= 0.0 ? uCycle : uCycle - 1.0;
  }
  float sweepIn = smoothstep(0.45, 1.0, uIntro);
  trail *= inside * sweepIn;
  edge *= sweepIn;
  float glowTrail = pow(trail, 0.45);

  float returns = 0.0;
  if (uClutter > 0.0 && trail > 0.004) {
    float radialBin = floor(r * 120.0);
    float count = max(8.0, floor(radialBin * 5.0));
    float angularBin = floor(turn * count);
    vec2 drift = vec2(lastPass * 0.173, lastPass * 0.291);
    float weather = noise(p * 3.2 + drift) * 0.65 + noise(p * 7.1 - drift) * 0.35;
    float cluster = smoothstep(0.5, 0.78, weather);
    float density = uClutter * (0.02 + 0.35 * cluster) * (1.0 - smoothstep(0.55, 1.0, r));
    vec2 binSeed = vec2(radialBin, angularBin) + lastPass * 17.13;
    float speck = step(1.0 - density, hash(binSeed));
    vec2 inBin = vec2(fract(r * 120.0), fract(turn * count)) - 0.5;
    float shape = 1.0 - smoothstep(0.18, 0.5, length(inBin));
    speck *= shape * (0.45 + 0.55 * hash(binSeed + 7.7));
    returns = (speck * 1.1 + cluster * 0.16 * uClutter) * trail;
  }

  float heat = uHeat.z * exp(-dot(p - uHeat.xy, p - uHeat.xy) / 0.035);
  float lit = clamp(glowTrail * 0.9 + heat * 0.55, 0.0, 1.0);
  vec3 lineColor = mix(vec3(1.0), uAccent, lit);
  vec3 light = lineColor * grid * (1.0 + glowTrail * 3.0 + heat * 2.4);
  float fill = trail * 0.11 * (0.35 + 0.65 * smoothstep(0.0, 0.6, r));
  light += uAccent * (fill + returns * 0.55);
  light += mix(uAccent, vec3(1.0), 0.3) * edge * 1.3;
  outColor = vec4(light * uRange, 1.0);
}`;
  var SPRITE_VERTEX = `#version 300 es
in vec2 aCorner;
in vec4 aSprite;
in vec4 aStyle;
${CAMERA}
out vec2 vLocal;
out vec4 vStyle;
out float vKind;
void main() {
  float ct = cos(uTilt);
  float st = sin(uTilt);
  float c = cos(aStyle.w);
  float s = sin(aStyle.w);
  vec2 local = aCorner * 1.25;
  vec2 offset = vec2(c * local.x - s * local.y, s * local.x + c * local.y) * aSprite.z;
  vec3 world = vec3(aSprite.xy + offset, 0.0);
  vec3 eye = vec3(0.0, -uDistance * st, uDistance * ct);
  vec3 rel = world - eye;
  float xc = rel.x;
  float yc = dot(rel, vec3(0.0, ct, st));
  float zc = max(dot(rel, vec3(0.0, st, -ct)), 0.0001);
  vec2 center = uCenter / uResolution * 2.0 - 1.0;
  gl_Position = vec4(center * zc + 2.0 * uFocal * uViewHeight * vec2(xc, yc) / uResolution, 0.0, zc);
  vLocal = local;
  vStyle = aStyle;
  vKind = aSprite.w;
}`;
  var SPRITE_FRAGMENT = `#version 300 es
precision highp float;
in vec2 vLocal;
in vec4 vStyle;
in float vKind;
uniform vec3 uAccent;
uniform float uRange;
out vec4 outColor;
void main() {
  float shape;
  vec3 tint;
  if (vKind < 0.5) {
    float d = length(vLocal * vec2(0.62, 1.0));
    float aa = max(fwidth(d), 0.0001);
    shape = clamp((1.0 - d) / aa + 0.5, 0.0, 1.0);
    shape *= 0.5 + 0.5 * exp(-d * d * 2.5);
    tint = mix(uAccent, vec3(1.0), vStyle.y * 0.45 * exp(-d * d * 5.0));
  } else {
    float d = length(vLocal);
    float aa = max(fwidth(d), 0.0001);
    shape = clamp(1.0 - abs(d - 1.0) / (aa * 0.75), 0.0, 1.0);
    tint = mix(uAccent, vec3(1.0), 0.2);
  }
  outColor = vec4(tint * shape * vStyle.x * uRange, 1.0);
}`;
  var DOWN = `#version 300 es
precision highp float;
uniform sampler2D uSource;
uniform vec2 uTexel;
uniform vec2 uTarget;
out vec4 outColor;
void main() {
  vec2 uv = gl_FragCoord.xy / uTarget;
  vec4 sum = texture(uSource, uv) * 4.0;
  sum += texture(uSource, uv - uTexel);
  sum += texture(uSource, uv + uTexel);
  sum += texture(uSource, uv + vec2(uTexel.x, -uTexel.y));
  sum += texture(uSource, uv - vec2(uTexel.x, -uTexel.y));
  outColor = sum / 8.0;
}`;
  var UP = `#version 300 es
precision highp float;
uniform sampler2D uSource;
uniform sampler2D uBase;
uniform vec2 uTexel;
uniform vec2 uTarget;
out vec4 outColor;
void main() {
  vec2 uv = gl_FragCoord.xy / uTarget;
  vec2 h = uTexel * 0.5;
  vec4 sum = texture(uSource, uv + vec2(-h.x * 2.0, 0.0));
  sum += texture(uSource, uv + vec2(h.x * 2.0, 0.0));
  sum += texture(uSource, uv + vec2(0.0, -h.y * 2.0));
  sum += texture(uSource, uv + vec2(0.0, h.y * 2.0));
  sum += texture(uSource, uv + vec2(-h.x, h.y)) * 2.0;
  sum += texture(uSource, uv + h) * 2.0;
  sum += texture(uSource, uv + vec2(h.x, -h.y)) * 2.0;
  sum += texture(uSource, uv - h) * 2.0;
  outColor = sum / 12.0 + texture(uBase, uv);
}`;
  var COMPOSITE2 = `#version 300 es
precision highp float;
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform vec2 uResolution;
uniform float uExposure;
uniform float uGlow;
uniform float uGrain;
uniform float uFade;
uniform float uOpacity;
uniform float uTime;
uniform float uLightMode;
uniform vec4 uBackground;
out vec4 outColor;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float smootherstep(float edge, float x) {
  float t = clamp(x / max(edge, 0.0001), 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec3 hdr = texelFetch(uScene, ivec2(gl_FragCoord.xy), 0).rgb * uExposure;
  vec3 bloom = texture(uBloom, uv).rgb * uExposure * uGlow * 0.5;
  float edge = uFade * 0.5;
  float mask = smootherstep(edge, uv.x) * smootherstep(edge, 1.0 - uv.x) * smootherstep(edge, uv.y) * smootherstep(edge, 1.0 - uv.y);
  mask *= uOpacity;
  float grain = (hash(gl_FragCoord.xy + fract(uTime * 7.31) * 113.0) - 0.5) * uGrain;
  vec4 color;
  if (uLightMode > 0.5) {
    float bloomPeak = max(bloom.r, max(bloom.g, bloom.b));
    float bloomLow = min(bloom.r, min(bloom.g, bloom.b));
    vec3 total = hdr + bloom * 0.3 * (bloomPeak - bloomLow) / max(bloomPeak, 0.0001);
    float peak = max(total.r, max(total.g, total.b));
    vec3 hue = total / max(peak, 0.0001);
    float tone = dot(hue, vec3(0.2126, 0.7152, 0.0722));
    float depth = mix(0.36, 0.09, smoothstep(0.06, 0.7, peak));
    vec3 ink = pow(clamp(hue * min(1.0, depth / max(tone, 0.001)), 0.0, 1.0), vec3(1.0 / 2.2));
    float alpha = clamp((1.0 - exp(-peak * 2.6)) * (1.0 + grain), 0.0, 1.0) * mask;
    color = vec4(ink * alpha, alpha);
  } else {
    vec3 mapped = 1.0 - exp(-(hdr + bloom));
    float level = max(mapped.r, max(mapped.g, mapped.b));
    mapped = clamp(mapped + grain * level, 0.0, 1.0) * mask;
    color = vec4(mapped, max(mapped.r, max(mapped.g, mapped.b)));
  }
  vec4 back = vec4(uBackground.rgb * uBackground.a, uBackground.a);
  outColor = color + back * (1.0 - color.a);
}`;
  var TAU2 = Math.PI * 2;
  var MAX_TARGETS = 16;
  var HISTORY = 4;
  var FOCAL = 2;
  var INTRO_SECONDS3 = 2.2;
  var MAX_RENDER_DIM2 = 2560;
  var BLOOM_LEVELS2 = 5;
  var clamp5 = (value, min, max) => Math.min(max, Math.max(min, value));
  var seeded = (seed) => {
    let a = seed >>> 0;
    return () => {
      a = a + 1831565813 >>> 0;
      let t = a;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  };
  var compile5 = (gl, type, source) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
    gl.deleteShader(shader);
    return null;
  };
  var link4 = (gl, vertexSource, fragmentSource, attributes) => {
    const vertex2 = compile5(gl, gl.VERTEX_SHADER, vertexSource);
    const fragment2 = compile5(gl, gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    if (!vertex2 || !fragment2 || !program) {
      if (program) gl.deleteProgram(program);
      if (vertex2) gl.deleteShader(vertex2);
      if (fragment2) gl.deleteShader(fragment2);
      return null;
    }
    gl.attachShader(program, vertex2);
    gl.attachShader(program, fragment2);
    attributes.forEach((name, index) => gl.bindAttribLocation(program, index, name));
    gl.linkProgram(program);
    gl.deleteShader(vertex2);
    gl.deleteShader(fragment2);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      return null;
    }
    const uniforms = {};
    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i++) {
      const info = gl.getActiveUniform(program, i);
      if (info) uniforms[info.name] = gl.getUniformLocation(program, info.name);
    }
    return { program, uniforms };
  };
  var spawnTarget = (rng, inward) => {
    const angle2 = rng() * TAU2;
    const radius = inward ? 0.94 : 0.2 + rng() * 0.68;
    const heading = inward ? angle2 + Math.PI + (rng() - 0.5) * 1.6 : rng() * TAU2;
    return {
      x: Math.sin(angle2) * radius,
      y: Math.cos(angle2) * radius,
      heading,
      velocity: 0.012 + rng() * 0.03,
      turn: (rng() - 0.5) * 0.18
    };
  };
  var mountRadar = (root) => {
    if (!canRunEffects(root)) return null;
    const win = windowOf(root);
    const doc = root.ownerDocument;
    if (!win) return null;
    const canvas = effectCanvas(root);
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false
    });
    if (!gl) return abortMount(canvas);
    const settings = {
      color: String("#3ef09a"),
      backgroundColor: String("transparent"),
      mode: "sweep",
      // 'sweep' | 'pulse'
      speed: 1,
      trail: clamp5(0.35, 0.02, 1),
      scale: Math.max(0.05, 0.9),
      ringCount: Math.round(clamp5(6, 1, 24)),
      spokeCount: Math.round(clamp5(12, 0, 72)),
      ticks: true,
      targets: Math.round(clamp5(6, 0, MAX_TARGETS)),
      clutter: clamp5(0.35, 0, 1),
      glow: Math.max(0, 1),
      brightness: Math.max(0, 1),
      gridOpacity: clamp5(1, 0, 2),
      lineWidth: clamp5(1, 0.25, 4),
      tilt: clamp5(0, 0, 80) * Math.PI / 180,
      centerX: 0.5,
      centerY: 0.5,
      mouseInteraction: true,
      intro: true,
      grain: Math.max(0, 0.03),
      fade: clamp5(0, 0, 1),
      opacity: clamp5(1, 0, 1),
      lightMode: false,
      paused: false,
      dpr: void 0
    };
    const floatTargets = !!gl.getExtension("EXT_color_buffer_float");
    const range = floatTargets ? 1 : 0.25;
    const programs = {
      scene: link4(gl, QUAD_VERTEX, SCENE, ["aPosition"]),
      sprite: link4(gl, SPRITE_VERTEX, SPRITE_FRAGMENT, ["aCorner", "aSprite", "aStyle"]),
      down: link4(gl, QUAD_VERTEX, DOWN, ["aPosition"]),
      up: link4(gl, QUAD_VERTEX, UP, ["aPosition"]),
      composite: link4(gl, QUAD_VERTEX, COMPOSITE2, ["aPosition"])
    };
    let quadBuffer = null;
    let cornerBuffer = null;
    let instanceBuffer = null;
    let quadVao = null;
    let spriteVao = null;
    const targets = [];
    let alive = true;
    const release = () => {
      for (const target of targets) {
        gl.deleteTexture(target.texture);
        gl.deleteFramebuffer(target.framebuffer);
      }
      for (const key of Object.keys(programs)) {
        const entry = programs[key];
        if (entry) gl.deleteProgram(entry.program);
      }
      gl.deleteBuffer(quadBuffer);
      gl.deleteBuffer(cornerBuffer);
      gl.deleteBuffer(instanceBuffer);
      gl.deleteVertexArray(quadVao);
      gl.deleteVertexArray(spriteVao);
    };
    if (Object.values(programs).some((entry) => !entry)) {
      release();
      return abortMount(canvas);
    }
    quadBuffer = gl.createBuffer();
    quadVao = gl.createVertexArray();
    gl.bindVertexArray(quadVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    cornerBuffer = gl.createBuffer();
    instanceBuffer = gl.createBuffer();
    spriteVao = gl.createVertexArray();
    gl.bindVertexArray(spriteVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, cornerBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
    for (let attribute = 1; attribute <= 2; attribute++) {
      gl.enableVertexAttribArray(attribute);
      gl.vertexAttribPointer(attribute, 4, gl.FLOAT, false, 32, (attribute - 1) * 16);
      gl.vertexAttribDivisor(attribute, 1);
    }
    gl.bindVertexArray(null);
    if (!quadBuffer || !cornerBuffer || !instanceBuffer || !quadVao || !spriteVao) {
      release();
      return abortMount(canvas);
    }
    const createTarget2 = () => {
      const target = {
        texture: gl.createTexture(),
        framebuffer: gl.createFramebuffer(),
        width: 0,
        height: 0
      };
      targets.push(target);
      return target;
    };
    const sizeTarget2 = (target, width, height) => {
      if (target.width === width && target.height === height) return;
      target.width = width;
      target.height = height;
      gl.bindTexture(gl.TEXTURE_2D, target.texture);
      if (floatTargets) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, width, height, 0, gl.RGBA, gl.HALF_FLOAT, null);
      } else {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      }
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, target.texture, 0);
    };
    const scene = createTarget2();
    const down = Array.from({ length: BLOOM_LEVELS2 + 1 }, createTarget2);
    const up = Array.from({ length: BLOOM_LEVELS2 }, createTarget2);
    const probe = doc.createElement("canvas").getContext("2d", { willReadFrequently: true });
    const reduce = win.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const colorCache = /* @__PURE__ */ new Map();
    const parseColor4 = (value) => {
      const cached = colorCache.get(value);
      if (cached) return cached;
      let rgba = [1, 1, 1, 1];
      if (probe) {
        probe.clearRect(0, 0, 1, 1);
        probe.fillStyle = "rgba(0, 0, 0, 0)";
        probe.fillStyle = value;
        probe.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = probe.getImageData(0, 0, 1, 1).data;
        rgba = a ? [r / a, g / a, b / a, a / 255] : [0, 0, 0, 0];
      }
      colorCache.set(value, rgba);
      return rgba;
    };
    const toLinear2 = (value) => parseColor4(value).slice(0, 3).map((v) => Math.pow(v, 2.2));
    const rng = seeded(7919);
    const contacts = Array.from({ length: MAX_TARGETS }, () => ({ ...spawnTarget(rng, false), echoes: [] }));
    const cursor = { x: 0, y: 0, inside: false, echoes: [] };
    const pointer = { x: 0, y: 0, inside: false };
    const view = { width: 1, height: 1, ratio: 1 };
    const state = {
      time: 0,
      sweep: 0,
      swept: 0,
      cycle: 0,
      intro: settings.intro && !reduce ? 0 : 1,
      heat: 0,
      heatVelocity: 0,
      heatX: 0,
      heatY: 0
    };
    const instances = new Float32Array(8 * 160);
    let raf = 0;
    let last = 0;
    let visible = true;
    const fit = (s) => s.scale * Math.min(view.width, view.height) / view.height;
    const camera = (s) => ({
      distance: 2 * FOCAL / fit(s),
      focal: FOCAL,
      tilt: s.tilt
    });
    const toPlane = (s, x, y) => {
      const { distance: distance2, focal, tilt } = camera(s);
      const sx = (x - s.centerX * view.width) / view.height;
      const sy = (s.centerY * view.height - y) / view.height;
      const ct = Math.cos(tilt);
      const st = Math.sin(tilt);
      const dx = sx;
      const dy = focal * st + sy * ct;
      const dz = -focal * ct + sy * st;
      if (dz > -1e-4) return null;
      const ey = -distance2 * st;
      const ez = distance2 * ct;
      const t = -ez / dz;
      return [dx * t, ey + dy * t];
    };
    const period = (s) => s.mode === "pulse" ? 3.2 : 6;
    const advance = (s, dt) => {
      const step = dt * Math.abs(s.speed);
      const pulse = s.mode === "pulse";
      const span = pulse ? 1.15 : TAU2;
      const delta = step / period(s) * span;
      const direction = s.speed < 0 && !pulse ? -1 : 1;
      const previous = state.sweep;
      state.swept += delta;
      const record = (contact) => {
        contact.echoes.unshift({ x: contact.x, y: contact.y, time: state.time });
        if (contact.echoes.length > HISTORY) contact.echoes.length = HISTORY;
      };
      const passed = (x, y) => {
        if (pulse) {
          const radius = Math.hypot(x, y);
          const from = previous;
          const to = previous + delta;
          return radius > from && radius <= to || to > span && radius <= to - span;
        }
        const bearing = Math.atan2(x, y);
        const gap = (direction * (bearing - previous) % TAU2 + TAU2) % TAU2;
        return gap > 0 && gap <= delta;
      };
      for (let i = 0; i < s.targets; i++) {
        const contact = contacts[i];
        contact.heading += contact.turn * step;
        contact.x += Math.sin(contact.heading) * contact.velocity * step;
        contact.y += Math.cos(contact.heading) * contact.velocity * step;
        if (Math.hypot(contact.x, contact.y) > 0.96) Object.assign(contact, spawnTarget(rng, true));
        if (passed(contact.x, contact.y)) record(contact);
      }
      if (cursor.inside && passed(cursor.x, cursor.y)) record(cursor);
      state.sweep += direction * delta;
      while (state.sweep >= span) {
        state.sweep -= span;
        state.cycle += 1;
      }
      while (state.sweep < 0) {
        state.sweep += span;
        state.cycle += 1;
      }
    };
    const buildSprites = (s) => {
      const unit = 2 / (fit(s) * view.height);
      const persist2 = period(s) / Math.max(Math.abs(s.speed), 0.05) * 1.1;
      let count = 0;
      const push = (x, y, radius, kind, intensity, core, angle2) => {
        if (count * 8 + 8 > instances.length) return;
        instances.set([x, y, radius, kind, intensity, core, 0, angle2], count * 8);
        count++;
      };
      const emit = (contact, strength) => {
        contact.echoes.forEach((echo, index) => {
          const age = state.time - echo.time;
          const fade = Math.exp(-age / persist2) * (index === 0 ? 1 : 0.8);
          if (fade < 0.01) return;
          const angle2 = -Math.atan2(echo.x, echo.y);
          push(
            echo.x,
            echo.y,
            unit * (index === 0 ? 3.4 : 2.4),
            0,
            fade * strength * 2.2,
            index === 0 ? 1 : 0.3,
            angle2
          );
          if (index === 0 && age < 1.4) {
            const progress = age / 1.4;
            const eased = 1 - Math.pow(1 - progress, 3);
            push(echo.x, echo.y, unit * (4 + 26 * eased), 1, (1 - progress) * (1 - progress) * strength * 1.4, 0, 0);
          }
        });
      };
      for (let i = 0; i < s.targets; i++) emit(contacts[i], 1);
      emit(cursor, 1.3);
      return count;
    };
    const run = (entry, target, width, height) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.framebuffer : null);
      gl.viewport(0, 0, width, height);
      gl.useProgram(entry.program);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const bindTexture = (entry, name, unit, texture) => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(entry.uniforms[name], unit);
    };
    const setCamera = (entry, s) => {
      const u = entry.uniforms;
      const { distance: distance2, focal, tilt } = camera(s);
      gl.uniform2f(u.uResolution, canvas.width, canvas.height);
      gl.uniform2f(u.uCenter, s.centerX * canvas.width, (1 - s.centerY) * canvas.height);
      gl.uniform1f(u.uViewHeight, canvas.height);
      gl.uniform1f(u.uFocal, focal);
      gl.uniform1f(u.uDistance, distance2);
      gl.uniform1f(u.uTilt, tilt);
    };
    const render = () => {
      const s = settings;
      const accent = toLinear2(s.color);
      const presence = state.intro;
      sizeTarget2(scene, canvas.width, canvas.height);
      const sceneProgram = programs.scene;
      const u = sceneProgram.uniforms;
      gl.useProgram(sceneProgram.program);
      setCamera(sceneProgram, s);
      gl.uniform1f(u.uMode, s.mode === "pulse" ? 1 : 0);
      gl.uniform1f(u.uSweep, state.sweep);
      gl.uniform1f(u.uSwept, Math.min(state.swept, TAU2 + 1));
      gl.uniform1f(u.uDirection, s.speed < 0 && s.mode !== "pulse" ? -1 : 1);
      gl.uniform1f(u.uCycle, state.cycle);
      gl.uniform1f(u.uTrail, s.mode === "pulse" ? s.trail * 0.22 : s.trail * TAU2 * 0.5);
      gl.uniform1f(u.uRings, s.ringCount);
      gl.uniform1f(u.uSpokes, s.spokeCount);
      gl.uniform1f(u.uTicks, s.ticks ? 1 : 0);
      gl.uniform1f(u.uGrid, s.gridOpacity);
      gl.uniform1f(u.uLine, s.lineWidth * view.ratio);
      gl.uniform1f(u.uClutter, s.clutter * (s.lightMode ? 0.6 : 1));
      gl.uniform1f(u.uTime, state.time);
      gl.uniform3fv(u.uAccent, accent);
      gl.uniform3f(u.uHeat, state.heatX, state.heatY, state.heat);
      gl.uniform1f(u.uIntro, presence);
      gl.uniform1f(u.uRange, range);
      gl.uniform1f(u.uPixel, view.ratio);
      gl.bindVertexArray(quadVao);
      run(sceneProgram, scene, canvas.width, canvas.height);
      const count = buildSprites(s);
      if (count > 0) {
        const sprite = programs.sprite;
        gl.useProgram(sprite.program);
        setCamera(sprite, s);
        gl.uniform3fv(sprite.uniforms.uAccent, accent);
        gl.uniform1f(sprite.uniforms.uRange, range * Math.min(1, presence * 2));
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE);
        gl.bindVertexArray(spriteVao);
        gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, instances.subarray(0, count * 8), gl.DYNAMIC_DRAW);
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
        gl.disable(gl.BLEND);
      }
      gl.bindVertexArray(quadVao);
      let source = scene;
      for (let level = 0; floatTargets && level <= BLOOM_LEVELS2; level++) {
        const target = down[level];
        const width = level === 0 ? Math.round(view.width / 2) : source.width >> 1;
        const height = level === 0 ? Math.round(view.height / 2) : source.height >> 1;
        sizeTarget2(target, Math.max(1, width), Math.max(1, height));
        gl.useProgram(programs.down.program);
        gl.uniform2f(programs.down.uniforms.uTexel, 1 / source.width, 1 / source.height);
        gl.uniform2f(programs.down.uniforms.uTarget, target.width, target.height);
        bindTexture(programs.down, "uSource", 0, source.texture);
        run(programs.down, target, target.width, target.height);
        source = target;
      }
      for (let level = BLOOM_LEVELS2 - 1; floatTargets && level >= 0; level--) {
        const from = level === BLOOM_LEVELS2 - 1 ? down[BLOOM_LEVELS2] : up[level + 1];
        const target = up[level];
        sizeTarget2(target, down[level].width, down[level].height);
        gl.useProgram(programs.up.program);
        gl.uniform2f(programs.up.uniforms.uTexel, 1 / from.width, 1 / from.height);
        gl.uniform2f(programs.up.uniforms.uTarget, target.width, target.height);
        bindTexture(programs.up, "uSource", 0, from.texture);
        bindTexture(programs.up, "uBase", 1, down[level].texture);
        run(programs.up, target, target.width, target.height);
      }
      const composite = programs.composite;
      const c = composite.uniforms;
      gl.useProgram(composite.program);
      gl.uniform2f(c.uResolution, canvas.width, canvas.height);
      gl.uniform1f(c.uExposure, 1.5 * s.brightness / range);
      gl.uniform1f(c.uGlow, floatTargets ? s.glow : 0);
      gl.uniform1f(c.uGrain, s.grain);
      gl.uniform1f(c.uFade, s.fade);
      gl.uniform1f(c.uOpacity, s.opacity);
      gl.uniform1f(c.uTime, state.time % 1e3);
      gl.uniform1f(c.uLightMode, s.lightMode ? 1 : 0);
      const back = parseColor4(s.backgroundColor);
      gl.uniform4f(c.uBackground, back[0], back[1], back[2], back[3]);
      bindTexture(composite, "uScene", 0, scene.texture);
      bindTexture(composite, "uBloom", 1, up[0].texture);
      run(composite, null, canvas.width, canvas.height);
    };
    const frame = (now) => {
      raf = 0;
      if (!alive || !visible || doc.hidden) return;
      const s = settings;
      const dt = last ? Math.min(0.05, (now - last) / 1e3) : 1 / 60;
      last = now;
      const moving = !s.paused && !reduce;
      if (!s.intro || reduce) state.intro = 1;
      else if (state.intro < 1) state.intro = Math.min(1, state.intro + dt / INTRO_SECONDS3);
      const plane = s.mouseInteraction && pointer.inside && !reduce ? toPlane(s, pointer.x, pointer.y) : null;
      cursor.inside = plane ? Math.hypot(plane[0], plane[1]) < 0.98 : false;
      if (plane) {
        cursor.x = plane[0];
        cursor.y = plane[1];
        state.heatX += (plane[0] - state.heatX) * (1 - Math.exp(-dt * 10));
        state.heatY += (plane[1] - state.heatY) * (1 - Math.exp(-dt * 10));
      }
      const goal = cursor.inside ? 1 : 0;
      state.heatVelocity += (120 * (goal - state.heat) - 19 * state.heatVelocity) * dt;
      state.heat = clamp5(state.heat + state.heatVelocity * dt, 0, 1.2);
      if (moving) {
        state.time += dt;
        const ramp = 0.25 + 0.75 * clamp5((state.intro - 0.35) / 0.65, 0, 1);
        advance(s, dt * ramp);
      }
      render();
      const settling = state.intro < 1 || state.heat > 1e-3 || Math.abs(state.heatVelocity) > 1e-3;
      if (moving || settling) raf = win.requestAnimationFrame(frame);
      else last = 0;
    };
    const wake = () => {
      if (!raf && alive && visible && !doc.hidden) raf = win.requestAnimationFrame(frame);
    };
    const resize = () => {
      const s = settings;
      const width = Math.max(1, root.clientWidth);
      const height = Math.max(1, root.clientHeight);
      const base = Math.min(s.dpr || win.devicePixelRatio || 1, 2);
      const longest = Math.max(width, height) * base;
      const ratio = longest > MAX_RENDER_DIM2 ? base * MAX_RENDER_DIM2 / longest : base;
      view.width = width;
      view.height = height;
      view.ratio = ratio;
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      if (!raf) render();
      wake();
    };
    const onPointerMove = (event) => {
      const rect = root.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.inside = pointer.x >= 0 && pointer.y >= 0 && pointer.x <= rect.width && pointer.y <= rect.height;
      wake();
    };
    const onPointerLeave = () => {
      pointer.inside = false;
      wake();
    };
    const onVisibility = () => {
      last = 0;
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
          last = 0;
          wake();
        }
      });
      visibility.observe(root);
    }
    win.addEventListener("pointermove", onPointerMove, { passive: true });
    doc.documentElement.addEventListener("pointerleave", onPointerLeave);
    doc.addEventListener("visibilitychange", onVisibility);
    resize();
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
        doc.removeEventListener("visibilitychange", onVisibility);
        release();
        try {
          gl.getExtension("WEBGL_lose_context")?.loseContext();
        } catch {
        }
        canvas.remove();
      }
    };
    return instance;
  };

  // src/features/courses/reactbits/magic-rings.ts
  var MAX_RINGS = 12;
  var MAX_BURSTS = 3;
  var SLOTS = MAX_RINGS + MAX_BURSTS;
  var SEGMENTS = 128;
  var FULLSCREEN = `
const vec2 corners[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
void main() {
  gl_Position = vec4(corners[gl_VertexID], 0.0, 1.0);
}`;
  var STRIP = `
layout(location = 0) in vec2 aSegment;
uniform mat3 uForward;
uniform vec2 uResolution;
uniform float uUnit;
uniform vec2 uCenter;
uniform vec4 uShape[SLOTS];
uniform vec4 uFrame[SLOTS];
uniform float uReach;
uniform float uSplit;
flat out int vSlot;
out vec2 vPlane;
void main() {
  vec4 shape = uShape[gl_InstanceID];
  vec2 origin = uCenter + uFrame[gl_InstanceID].xy;
  float angle = aSegment.x * 6.2831853;
  vec2 direction = vec2(cos(angle), sin(angle));
  vec3 inner = uForward * vec3(origin + direction * shape.x, 1.0);
  vec3 outer = uForward * vec3(origin + direction * (shape.x + 0.01), 1.0);
  float pixels = length(outer.xy / outer.z - inner.xy / inner.z) * 100.0 * uUnit;
  float band = uReach / max(pixels, 1e-3) + uSplit * shape.x;
  vec2 plane = origin + direction * max(shape.x + aSegment.y * band, 0.0);
  vec3 screen = uForward * vec3(plane, 1.0);
  gl_Position = vec4(screen.xy * (2.0 * uUnit / uResolution), 0.0, screen.z);
  vPlane = plane;
  vSlot = gl_InstanceID;
}`;
  var COMMON = `
uniform vec2 uResolution;
uniform vec2 uScale;
uniform float uUnit;
uniform mat3 uInverse;
uniform vec2 uCenter;
uniform int uCount;
uniform vec4 uShape[SLOTS];
uniform vec4 uFrame[SLOTS];
uniform vec4 uTint[SLOTS];
uniform vec4 uHover;
uniform vec2 uBounds;
uniform float uSplit;
uniform float uOpacity;

out vec4 fragColor;

float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

float angleOf(vec2 v) {
  vec2 a = abs(v);
  float t = min(a.x, a.y) / max(max(a.x, a.y), 1e-6);
  float r = t * (0.5 + 0.1738 * (1.0 - t));
  return a.y > a.x ? 1.0 - r : r;
}

float nearness(vec2 plane) {
  vec2 offset = plane - uHover.xy;
  return uHover.z * exp(-dot(offset, offset) * uHover.w);
}

vec3 prismOf(vec3 tint) {
  return mix(tint, vec3(dot(tint, vec3(0.3333))), 0.65) * 0.85;
}

vec4 toneMap(vec3 light) {
  float peak = max(max(light.r, light.g), light.b);
  if (peak <= 0.0) return vec4(0.0);
  float level = 1.0 - exp(-peak);
  vec3 color = mix(light * (level / peak), vec3(level), smoothstep(1.4, 3.6, peak) * 0.4);
  return vec4(color, level);
}
`;
  var GLOW = `
uniform vec4 uHalo;
uniform vec3 uRange;

float haloOf(float d) {
  float fall = exp(-d * uHalo.y);
  float tight = fall * fall;
  tight *= tight;
  float window = clamp(1.0 - (d - uRange.x) * uRange.y, 0.0, 1.0);
  return (uHalo.z * tight + uHalo.w * fall) * window * window;
}

void main() {
  vec3 projected = uInverse * vec3((gl_FragCoord.xy * uScale - 0.5 * uResolution) / uUnit, 1.0);
  vec2 plane = projected.xy / projected.z;
  vec2 base = plane - uCenter;
  float reach = length(base);
  if (projected.z <= 0.0 || reach < uBounds.x || reach > uBounds.y) {
    fragColor = vec4(0.0);
    return;
  }
  float boost = 1.0 + 1.6 * nearness(plane);
  float limit = uRange.z + uSplit;
  vec3 light = vec3(0.0);
  float alpha = 0.0;

  for (int i = 0; i < SLOTS; i++) {
    if (i >= uCount) break;
    vec4 shape = uShape[i];
    vec4 frame = uFrame[i];
    vec2 w = base - frame.xy;
    float len = length(w);
    float d = abs(len - shape.x);
    if (d > limit) continue;
    float a = angleOf(vec2(dot(w, frame.zw), frame.z * w.y - frame.w * w.x));
    if (a > shape.w) continue;
    float energy = shape.y * max(exp(-shape.z * a * a * a) - 0.002, 0.0) * boost;
    vec3 tint = uTint[i].rgb;
#ifdef PRISM
    float offset = uSplit * shape.x;
    vec3 halo = vec3(haloOf(abs(len - shape.x - offset)), haloOf(d), haloOf(abs(len - shape.x + offset)));
#else
    vec3 halo = vec3(haloOf(d));
#endif
#ifdef LIGHT
    float layer = clamp(energy * dot(halo, vec3(0.3333)), 0.0, 1.0);
    light = tint * layer + light * (1.0 - layer);
    alpha = layer + alpha * (1.0 - layer);
#else
#ifdef PRISM
    tint = prismOf(tint);
#endif
    light += tint * energy * halo;
#endif
  }
#ifdef LIGHT
  fragColor = vec4(light, alpha);
#elif defined(PACKED)
  fragColor = vec4(1.0 - exp(-light), 1.0);
#else
  fragColor = vec4(light, 1.0);
#endif
}`;
  var COMPOSE = `
uniform sampler2D uGlow;
uniform float uGrain;
uniform float uTime;

void main() {
  vec4 glow = texture(uGlow, gl_FragCoord.xy / uResolution);
  float grain = 1.0;
  if (uGrain > 0.0) grain += uGrain * (hash(gl_FragCoord.xy + fract(uTime * 7.31) * 413.0) - 0.5) * 1.8;
  float dither = (hash(gl_FragCoord.xy) - 0.5) / 255.0;
#ifdef LIGHT
  float alpha = clamp(glow.a * grain, 0.0, 1.0);
  if (alpha <= 0.0) {
    fragColor = vec4(0.0);
    return;
  }
  vec3 ink = glow.rgb * grain;
  alpha = clamp(alpha + dither, 0.0, 1.0);
  fragColor = vec4(min(ink, vec3(alpha)), alpha) * uOpacity;
#else
#ifdef PACKED
  vec3 light = -log(1.0 - min(glow.rgb, vec3(0.9995))) * grain;
#else
  vec3 light = glow.rgb * grain;
#endif
  vec4 color = toneMap(light);
  if (color.a <= 0.0) {
    fragColor = vec4(0.0);
    return;
  }
  float alpha = clamp(color.a + dither, 0.0, 1.0);
  fragColor = vec4(min(color.rgb, vec3(alpha)), alpha) * uOpacity;
#endif
}`;
  var LINE = `
flat in int vSlot;
in vec2 vPlane;
uniform float uWidth;

float coverage(float pixels, float halfWidth) {
  return clamp(max(halfWidth, 0.5) - pixels + 0.5, 0.0, 1.0) * min(halfWidth * 2.0, 1.0);
}

void main() {
  vec4 shape = uShape[vSlot];
  vec4 frame = uFrame[vSlot];
  vec4 tint = uTint[vSlot];
  vec2 w = vPlane - uCenter - frame.xy;
  float len = length(w);
  float stretch = 1.0 / max(length(vec2(dFdx(len), dFdy(len))), 1e-6);
  float a = angleOf(vec2(dot(w, frame.zw), frame.z * w.y - frame.w * w.x));
  float near = nearness(vPlane);
  float energy = shape.y * max(exp(-shape.z * a * a * a) - 0.002, 0.0) * (1.0 + 1.6 * near) * step(a, shape.w);
  float halfWidth = uWidth * (1.0 + 0.45 * near) * max(1.0 - a, 0.5) * tint.w;
  float pixels = abs(len - shape.x) * stretch;
#ifdef PRISM
  float offset = uSplit * shape.x;
  vec3 core = vec3(
    coverage(abs(len - shape.x - offset) * stretch, halfWidth),
    coverage(pixels, halfWidth),
    coverage(abs(len - shape.x + offset) * stretch, halfWidth)
  );
#else
  vec3 core = vec3(coverage(pixels, halfWidth));
#endif
#ifdef LIGHT
  float hot = core.g * clamp(1.0 - pixels / max(halfWidth * 0.35, 0.3), 0.0, 1.0);
  float layer = energy * max(max(core.r, core.g), core.b);
  if (layer <= 0.0) discard;
#ifdef PRISM
  vec3 color = clamp(1.0 - (1.0 - tint.rgb) * core * 1.4, 0.0, 1.0);
#else
  vec3 color = tint.rgb;
#endif
  color = mix(color, vec3(1.0), hot * 0.7);
  fragColor = vec4(color * layer, layer) * uOpacity;
#else
#ifdef PRISM
  vec4 color = toneMap(prismOf(tint.rgb) * energy * core * 1.7);
#else
  vec4 color = toneMap(tint.rgb * energy * core * 1.7);
#endif
  if (color.a <= 0.0) discard;
  fragColor = color * uOpacity;
#endif
}`;
  var shaderSource = (body, flags) => [
    "#version 300 es",
    "precision highp float;",
    `#define SLOTS ${SLOTS}`,
    ...flags.map((flag) => `#define ${flag}`),
    body
  ].join("\n");
  var FRAGMENTS = { glow: GLOW, compose: COMPOSE, line: LINE };
  var MOTIONS = ["pulse", "ripple", "breathe"];
  var CYCLE = 3.45;
  var STAGGER = 0.5;
  var DEPTH = 2.6;
  var BURST_LIFE = 1.1;
  var BURST_SPEED = 0.9;
  var clamp6 = (value, min, max) => Math.min(max, Math.max(min, value));
  var smoothstep = (from, to, value) => {
    const t = clamp6((value - from) / (to - from), 0, 1);
    return t * t * (3 - 2 * t);
  };
  var pulseLife = (t) => Math.min(smoothstep(0, 0.7, t), 1 - smoothstep(0.5, 3.25, t));
  var toLinear = (channel) => channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
  var parseColor3 = (value, probe) => {
    const text = String(value || "").trim();
    const hex = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(text);
    if (hex) {
      const full = hex[1].length === 3 ? hex[1].replace(/./g, (digit) => digit + digit) : hex[1];
      return [0, 2, 4].map((index) => parseInt(full.slice(index, index + 2), 16) / 255);
    }
    const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(text);
    if (rgb) return [rgb[1], rgb[2], rgb[3]].map((channel) => clamp6(parseFloat(channel) / 255, 0, 1));
    if (probe) {
      probe.fillStyle = "#000000";
      probe.fillStyle = text;
      const normal = String(probe.fillStyle);
      if (normal !== "#000000" || /^(#0{3}|#0{6}|black)$/i.test(text)) return parseColor3(normal, probe);
    }
    return [0.66, 0.33, 0.97];
  };
  var compile6 = (gl, type, source) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  };
  var link5 = (gl, vertexSource, fragmentSource) => {
    const vertex2 = compile6(gl, gl.VERTEX_SHADER, vertexSource);
    const fragment2 = compile6(gl, gl.FRAGMENT_SHADER, fragmentSource);
    const program = vertex2 && fragment2 ? gl.createProgram() : null;
    if (!vertex2 || !fragment2 || !program) {
      if (vertex2) gl.deleteShader(vertex2);
      if (fragment2) gl.deleteShader(fragment2);
      return null;
    }
    gl.attachShader(program, vertex2);
    gl.attachShader(program, fragment2);
    gl.linkProgram(program);
    gl.deleteShader(vertex2);
    gl.deleteShader(fragment2);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }
    const uniforms = {};
    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let index = 0; index < count; index++) {
      const info = gl.getActiveUniform(program, index);
      if (info) uniforms[info.name.replace(/\[0\]$/, "")] = gl.getUniformLocation(program, info.name);
    }
    return { program, uniforms };
  };
  var invert4 = (m) => {
    const [a, b, c, d, e, f, g, h, i] = m;
    const A = e * i - f * h;
    const B = f * g - d * i;
    const C = d * h - e * g;
    const det = a * A + b * B + c * C;
    return [A, c * h - b * i, b * f - c * e, B, a * i - c * g, c * d - a * f, C, b * g - a * h, a * e - b * d].map(
      (value) => value / det
    );
  };
  var planeFor = (tiltX, tiltY) => {
    const ax = tiltX * Math.PI / 180;
    const ay = tiltY * Math.PI / 180;
    const cx = Math.cos(ax);
    const sx = Math.sin(ax);
    const cy = Math.cos(ay);
    const sy = Math.sin(ay);
    const forward = [cy, sy * sx, 0, 0, cx, 0, sy * cx / DEPTH, -sx / DEPTH, 1];
    return { forward, inverse: invert4(forward) };
  };
  var project = (m, x, y) => {
    const w = m[6] * x + m[7] * y + m[8];
    return [(m[0] * x + m[1] * y + m[2]) / w, (m[3] * x + m[4] * y + m[5]) / w, w];
  };
  var mountMagicRings = (root) => {
    if (!canRunEffects(root)) return null;
    const win = windowOf(root);
    const doc = root.ownerDocument;
    if (!win) return null;
    const canvas = effectCanvas(root);
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "default"
    });
    if (!gl) return abortMount(canvas);
    const probe = doc.createElement("canvas").getContext("2d");
    const light = false;
    const first = parseColor3("#A855F7", probe);
    const second = parseColor3("#6366F1", probe);
    const motion = "pulse";
    const maxDevicePixelRatio = 2;
    const settings = {
      color: light ? first : first.map(toLinear),
      colorTwo: light ? second : second.map(toLinear),
      ringCount: clamp6(Math.round(6), 1, MAX_RINGS),
      motion: MOTIONS.includes(motion) ? motion : "pulse",
      speed: Math.max(0, 1),
      lineThickness: Math.max(0.25, 2),
      glow: clamp6(1, 0, 3),
      baseRadius: Math.max(0.01, 0.35),
      radiusStep: Math.max(0, 0.1),
      expansion: 0.1,
      taper: Math.max(0.5, 1.5),
      rotation: 0 * Math.PI / 180,
      spin: 0,
      tilt: clamp6(0, -80, 80),
      dispersion: clamp6(0, 0, 1),
      grain: clamp6(0, 0, 1),
      opacity: clamp6(1, 0, 1),
      followMouse: false,
      mouseInfluence: 0.2,
      hoverScale: Math.max(0.5, 1.2),
      hoverIntensity: Math.max(0, 1),
      parallax: 0.05,
      clickBurst: true,
      intro: true,
      light,
      maxRatio: clamp6(maxDevicePixelRatio, 0.5, 3)
    };
    let alive = true;
    const programs = /* @__PURE__ */ new Map();
    const releasePrograms = () => {
      programs.forEach((entry) => {
        if (entry) gl.deleteProgram(entry.program);
      });
      programs.clear();
    };
    const programFor = (name, flags) => {
      const key = `${name}|${flags.join(",")}`;
      const existing = programs.get(key);
      if (existing !== void 0) return existing;
      const vertex2 = shaderSource(name === "line" ? STRIP : FULLSCREEN, flags);
      const entry = link5(gl, vertex2, shaderSource(`${COMMON}${FRAGMENTS[name]}`, flags));
      programs.set(key, entry);
      return entry;
    };
    if (!programFor("glow", []) || !programFor("compose", []) || !programFor("line", [])) {
      releasePrograms();
      return abortMount(canvas);
    }
    const reduced = win.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    let vao = gl.createVertexArray();
    let stripVao = null;
    let stripBuffer = null;
    const strip = new Float32Array((SEGMENTS + 1) * 4);
    for (let index = 0; index <= SEGMENTS; index++) {
      strip.set([index / SEGMENTS, -1, index / SEGMENTS, 1], index * 4);
    }
    stripVao = gl.createVertexArray();
    stripBuffer = gl.createBuffer();
    gl.bindVertexArray(stripVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, stripBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, strip, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    let glowTexture = gl.createTexture();
    let glowBuffer = gl.createFramebuffer();
    if (!vao || !stripVao || !stripBuffer || !glowTexture || !glowBuffer) {
      if (vao) gl.deleteVertexArray(vao);
      if (stripVao) gl.deleteVertexArray(stripVao);
      if (stripBuffer) gl.deleteBuffer(stripBuffer);
      if (glowTexture) gl.deleteTexture(glowTexture);
      if (glowBuffer) gl.deleteFramebuffer(glowBuffer);
      releasePrograms();
      return abortMount(canvas);
    }
    const glowSize = { width: 0, height: 0 };
    let floatGlow = Boolean(gl.getExtension("EXT_color_buffer_float"));
    const shape = new Float32Array(SLOTS * 4);
    const frameData = new Float32Array(SLOTS * 4);
    const tints = new Float32Array(SLOTS * 4);
    const size = { width: 1, height: 1, ratio: 1, unit: 1 };
    const pointer = { x: 0, y: 0, inside: false, touch: false };
    const spring = { x: 0, y: 0, vx: 0, vy: 0, hover: 0, hoverVelocity: 0 };
    const bursts = [];
    let introLive = settings.intro && settings.speed > 0 && !reduced;
    let time = introLive ? 0 : 1.6;
    let clock = 0;
    let raf = 0;
    let last = 0;
    let visible = true;
    let pageVisible = doc.visibilityState !== "hidden";
    let lost = false;
    const resize = () => {
      const s = settings;
      const rect = root.getBoundingClientRect();
      const ratio = Math.min(win.devicePixelRatio || 1, s.maxRatio);
      const width = Math.max(1, Math.round(rect.width * ratio));
      const height = Math.max(1, Math.round(rect.height * ratio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      Object.assign(size, { width, height, ratio, unit: Math.max(1, Math.min(width, height)) });
      const glowWidth = Math.max(1, Math.ceil(width / 2));
      const glowHeight = Math.max(1, Math.ceil(height / 2));
      if (glowSize.width === glowWidth && glowSize.height === glowHeight) return;
      Object.assign(glowSize, { width: glowWidth, height: glowHeight });
      const allocate = (useFloat) => {
        gl.bindTexture(gl.TEXTURE_2D, glowTexture);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          useFloat ? gl.RGBA16F : gl.RGBA8,
          glowWidth,
          glowHeight,
          0,
          gl.RGBA,
          useFloat ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE,
          null
        );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindFramebuffer(gl.FRAMEBUFFER, glowBuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, glowTexture, 0);
        const complete = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        return complete;
      };
      if (!allocate(floatGlow)) {
        floatGlow = false;
        allocate(false);
      }
    };
    const ringState = (s, index, count) => {
      const mix = count > 1 ? index / (count - 1) : 0;
      if (s.motion === "ripple") {
        const span = count * s.radiusStep + s.expansion;
        const period = CYCLE * Math.max(1, count) * 0.32;
        const phase = time / period + index / count;
        const progress = phase - Math.floor(phase);
        const born = time - progress * period >= -1e-4 || !introLive;
        const life2 = born ? smoothstep(0, 0.12, progress) * (1 - smoothstep(0.62, 1, progress)) : 0;
        const position = progress * Math.max(1, count - 1);
        return { radius: s.baseRadius + progress * span, life: life2, virtual: position, mix: progress, opening: 1 };
      }
      if (s.motion === "breathe") {
        const wave = Math.sin(time / 4 * Math.PI * 2 - index * 0.55);
        const rise = introLive ? smoothstep(index * 0.12, index * 0.12 + 0.9, time) : 1;
        return {
          radius: s.baseRadius + index * s.radiusStep + s.expansion * 0.5 * (1 + wave),
          life: (0.78 + 0.22 * wave) * rise,
          virtual: index,
          mix,
          opening: 1
        };
      }
      const local = time - index * STAGGER;
      const t = (local % CYCLE + CYCLE) % CYCLE;
      const life = introLive && local < 0 ? 0 : pulseLife(t);
      return {
        radius: s.baseRadius + index * s.radiusStep + (1 - Math.pow(1 - t / CYCLE, 2)) * s.expansion,
        life,
        virtual: index,
        mix,
        opening: introLive && local < CYCLE ? smoothstep(0, 0.9, local) : 1
      };
    };
    const render = () => {
      const s = settings;
      const count = s.ringCount;
      const hover = spring.hover;
      const still = reduced ? 0 : 1;
      const scale5 = 1 + (s.hoverScale - 1) * hover * still;
      const mouseX = spring.x * still;
      const mouseY = spring.y * still;
      const leanX = s.tilt - mouseY * s.parallax * 260;
      const leanY = mouseX * s.parallax * 260;
      const view = planeFor(leanX, leanY);
      const center = s.followMouse ? [mouseX * s.mouseInfluence, mouseY * s.mouseInfluence] : [0, 0];
      const spinBase = s.spin * time * 0.6;
      let slots = 0;
      let lowest = Infinity;
      let highest = 0;
      let shiftMax = 0;
      const place = (radius, life, cut, angle2, shiftX, shiftY, mix, width2) => {
        if (life <= 2e-3) return;
        const gain = 10 * radius * cut * cut * cut;
        shape.set([radius, life, gain, gain > 6.2 ? Math.cbrt(6.2 / gain) : 2], slots * 4);
        frameData.set([shiftX, shiftY, Math.cos(angle2), Math.sin(angle2)], slots * 4);
        tints.set(
          [
            s.color[0] + (s.colorTwo[0] - s.color[0]) * mix,
            s.color[1] + (s.colorTwo[1] - s.color[1]) * mix,
            s.color[2] + (s.colorTwo[2] - s.color[2]) * mix,
            width2
          ],
          slots * 4
        );
        lowest = Math.min(lowest, radius);
        highest = Math.max(highest, radius);
        shiftMax = Math.max(shiftMax, Math.hypot(shiftX, shiftY));
        slots++;
      };
      for (let index = 0; index < count; index++) {
        const state = ringState(s, index, count);
        let radius = state.radius * scale5;
        let life = state.life;
        for (const burst of bursts) {
          const age = clock - burst.start;
          const wave = (burst.radius + age * BURST_SPEED) * scale5;
          const fade = Math.pow(Math.max(0, 1 - age / BURST_LIFE), 1.5);
          const gap = (wave - radius) / 0.08;
          radius += 0.04 * Math.exp(-gap * gap) * fade;
          life = Math.min(1.6, life + 0.9 * Math.exp(-gap * gap * 1.6) * fade);
        }
        const cut = Math.pow(s.taper, state.virtual) / Math.max(0.08, state.opening);
        const angle2 = s.rotation + spinBase * (index % 2 ? -1 : 1) * (1 + index * 0.15);
        place(radius, life, cut, angle2, index * s.parallax * mouseX, index * s.parallax * mouseY, state.mix, 1);
      }
      for (const burst of bursts) {
        const age = clock - burst.start;
        const fade = Math.pow(Math.max(0, 1 - age / BURST_LIFE), 1.5);
        const radius = (burst.radius + age * BURST_SPEED) * scale5;
        place(radius, 1.5 * fade, 0.85, s.rotation, 0, 0, clamp6(age / BURST_LIFE, 0, 1), 1.15);
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      if (!slots) return;
      const flags = [];
      if (s.light) flags.push("LIGHT");
      if (s.dispersion > 0) flags.push("PRISM");
      if (!floatGlow) flags.push("PACKED");
      const glowProgram = programFor("glow", flags);
      const composeProgram = programFor("compose", flags);
      const lineProgram = programFor("line", flags);
      if (!glowProgram || !composeProgram || !lineProgram) return;
      const glowScale = (s.light ? 0.3 : 1) * (1 - s.dispersion * 0.45);
      const outer = 0.012 + 0.033 * s.glow;
      const innerAmount = 0.5 * Math.min(1, s.glow) * glowScale;
      const outerAmount = 0.9 * s.glow * glowScale;
      const range = outer * 4.5 + 8e-3;
      const split = s.dispersion * 0.03;
      const margin = range + split * highest + shiftMax + 0.01;
      const width = s.lineThickness * size.ratio;
      const reach = width * (1 + 0.45 * s.hoverIntensity) * 1.15 + 1.5;
      const cursor = project(view.inverse, pointer.x, pointer.y);
      const shared = (program) => {
        const u = program.uniforms;
        gl.useProgram(program.program);
        gl.uniform2f(u.uResolution, canvas.width, canvas.height);
        gl.uniform1f(u.uUnit, size.unit);
        gl.uniform2f(u.uCenter, center[0], center[1]);
        gl.uniform1i(u.uCount, slots);
        gl.uniform4fv(u.uShape, shape);
        gl.uniform4fv(u.uFrame, frameData);
        gl.uniform4fv(u.uTint, tints);
        gl.uniform4f(u.uHover, cursor[0] - center[0], cursor[1] - center[1], hover * s.hoverIntensity, 1 / 0.03);
        gl.uniform1f(u.uSplit, split);
        gl.uniform1f(u.uOpacity, s.opacity);
        return u;
      };
      gl.bindVertexArray(vao);
      gl.bindFramebuffer(gl.FRAMEBUFFER, glowBuffer);
      gl.viewport(0, 0, glowSize.width, glowSize.height);
      gl.clear(gl.COLOR_BUFFER_BIT);
      const glowUniforms = shared(glowProgram);
      gl.uniform2f(glowUniforms.uScale, canvas.width / glowSize.width, canvas.height / glowSize.height);
      gl.uniformMatrix3fv(glowUniforms.uInverse, true, view.inverse);
      gl.uniform2f(glowUniforms.uBounds, Math.max(0, lowest - margin), highest + margin);
      gl.uniform4f(glowUniforms.uHalo, 0, 1 / outer, innerAmount, outerAmount);
      gl.uniform3f(glowUniforms.uRange, range * 0.45, 1 / (range * 0.55), range);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      const composeUniforms = shared(composeProgram);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, glowTexture);
      gl.uniform1i(composeUniforms.uGlow, 0);
      gl.uniform1f(composeUniforms.uGrain, s.grain);
      gl.uniform1f(composeUniforms.uTime, clock);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      const lineUniforms = shared(lineProgram);
      gl.uniformMatrix3fv(lineUniforms.uForward, true, view.forward);
      gl.uniform1f(lineUniforms.uReach, reach);
      gl.uniform1f(lineUniforms.uWidth, width);
      gl.enable(gl.BLEND);
      if (s.light) gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      else gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_COLOR, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.bindVertexArray(stripVao);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, (SEGMENTS + 1) * 2, slots);
      gl.disable(gl.BLEND);
      gl.bindVertexArray(null);
    };
    const frame = (now) => {
      raf = 0;
      if (!alive || lost) return;
      const s = settings;
      const dt = clamp6((now - last) / 1e3 || 0, 0, 0.05);
      last = Math.max(last, now);
      clock += dt;
      if (!reduced) time += dt * s.speed;
      const targetX = pointer.inside ? pointer.x / Math.max(1e-6, size.width / size.unit) : 0;
      const targetY = pointer.inside ? pointer.y / Math.max(1e-6, size.height / size.unit) : 0;
      const stiffness = 70;
      const damping = 2 * Math.sqrt(stiffness) * 0.9;
      const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
      const h = dt / steps;
      for (let step = 0; step < steps; step++) {
        spring.vx += (stiffness * (targetX - spring.x) - damping * spring.vx) * h;
        spring.vy += (stiffness * (targetY - spring.y) - damping * spring.vy) * h;
        spring.x += spring.vx * h;
        spring.y += spring.vy * h;
        const hoverTarget = pointer.inside ? 1 : 0;
        spring.hoverVelocity += (40 * (hoverTarget - spring.hover) - 2 * Math.sqrt(40) * spring.hoverVelocity) * h;
        spring.hover += spring.hoverVelocity * h;
      }
      for (let index = bursts.length - 1; index >= 0; index--) {
        if (clock - bursts[index].start > BURST_LIFE) bursts.splice(index, 1);
      }
      if (introLive && time > (s.ringCount + 2) * STAGGER + CYCLE) introLive = false;
      render();
      const settling = Math.abs(spring.vx) + Math.abs(spring.vy) + Math.abs(spring.hoverVelocity) > 1e-4 || Math.abs((pointer.inside ? 1 : 0) - spring.hover) > 1e-3;
      const busy = s.speed > 0 && !reduced || settling || bursts.length > 0 || introLive;
      if (busy && visible && pageVisible) raf = win.requestAnimationFrame(frame);
    };
    const wake = () => {
      if (raf || lost || !alive || !visible || !pageVisible) return;
      last = win.performance.now();
      raf = win.requestAnimationFrame(frame);
    };
    const locate = (event) => {
      const rect = root.getBoundingClientRect();
      const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
      const unit = Math.max(1, Math.min(rect.width, rect.height));
      return {
        x: (event.clientX - rect.left - rect.width / 2) / unit,
        y: (rect.top + rect.height / 2 - event.clientY) / unit,
        inside
      };
    };
    const onPointerMove = (event) => {
      if (event.pointerType === "touch" && !pointer.touch) return;
      const spot = locate(event);
      pointer.x = spot.x;
      pointer.y = spot.y;
      pointer.inside = spot.inside;
      wake();
    };
    const onPointerDown = (event) => {
      const spot = locate(event);
      if (!spot.inside) return;
      pointer.x = spot.x;
      pointer.y = spot.y;
      pointer.inside = true;
      pointer.touch = event.pointerType === "touch";
      const s = settings;
      if (s.clickBurst && !reduced) {
        bursts.push({ start: clock, radius: Math.max(0.04, s.baseRadius * 0.45) });
        if (bursts.length > MAX_BURSTS) bursts.shift();
      }
      wake();
    };
    const onPointerUp = (event) => {
      if (event.pointerType !== "touch") return;
      pointer.touch = false;
      pointer.inside = false;
      wake();
    };
    const onLeave = () => {
      pointer.inside = false;
      wake();
    };
    const onLost = (event) => {
      event.preventDefault();
      lost = true;
      if (raf) win.cancelAnimationFrame(raf);
      raf = 0;
    };
    const onRestored = () => {
      if (!alive) return;
      lost = false;
      resize();
      wake();
    };
    win.addEventListener("pointermove", onPointerMove, { passive: true });
    win.addEventListener("pointerdown", onPointerDown, { passive: true });
    win.addEventListener("pointerup", onPointerUp, { passive: true });
    win.addEventListener("pointercancel", onPointerUp, { passive: true });
    doc.documentElement.addEventListener("pointerleave", onLeave);
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);
    const ResizeCtor = win.ResizeObserver;
    let resizeObserver = null;
    let onWindowResize = null;
    if (typeof ResizeCtor === "function") {
      resizeObserver = new ResizeCtor(() => {
        resize();
        wake();
      });
      resizeObserver.observe(root);
    } else {
      onWindowResize = () => {
        resize();
        wake();
      };
      win.addEventListener("resize", onWindowResize);
    }
    const VisibilityCtor = win.IntersectionObserver;
    let visibility = null;
    if (typeof VisibilityCtor === "function") {
      visibility = new VisibilityCtor((entries) => {
        visible = entries.some((entry) => entry.isIntersecting);
        wake();
      });
      visibility.observe(root);
    }
    const onVisibility = () => {
      pageVisible = doc.visibilityState !== "hidden";
      wake();
    };
    doc.addEventListener("visibilitychange", onVisibility);
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
        win.removeEventListener("pointerdown", onPointerDown);
        win.removeEventListener("pointerup", onPointerUp);
        win.removeEventListener("pointercancel", onPointerUp);
        doc.documentElement.removeEventListener("pointerleave", onLeave);
        doc.removeEventListener("visibilitychange", onVisibility);
        canvas.removeEventListener("webglcontextlost", onLost);
        canvas.removeEventListener("webglcontextrestored", onRestored);
        if (!gl.isContextLost()) {
          gl.deleteVertexArray(vao);
          gl.deleteTexture(glowTexture);
          gl.deleteFramebuffer(glowBuffer);
          releasePrograms();
          gl.deleteVertexArray(stripVao);
          gl.deleteBuffer(stripBuffer);
        }
        try {
          gl.getExtension("WEBGL_lose_context")?.loseContext();
        } catch {
        }
        canvas.remove();
      }
    };
    return instance;
  };

  // src/features/courses/reactbits/floating-lines.ts
  var MAX_LINES = 24;
  var MAX_STOPS = 8;
  var MAX_CLICKS = 3;
  var INTRO_SECONDS4 = 1.8;
  var WAVES = ["top", "middle", "bottom"];
  var WAVE_DEFAULTS = {
    top: { x: 10, y: 0.5, rotate: -0.4 },
    middle: { x: 5, y: 0, rotate: 0.2 },
    bottom: { x: 2, y: -0.7, rotate: -1 }
  };
  var WAVE_SHAPE = {
    top: { offset: 1, step: 0.2, light: 0.2, flip: 1, depth: 1, drift: 0.6 },
    middle: { offset: 2, step: 0.15, light: 1, flip: 0, depth: 0, drift: 1 },
    bottom: { offset: 1.5, step: 0.2, light: 0.32, flip: 0, depth: 0.6, drift: 1.4 }
  };
  var VERTEX5 = `#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;
  var FRAGMENT3 = `#version 300 es
precision highp float;
precision highp int;
uniform vec2 uResolution;
uniform float uRatio;
uniform vec4 uWave[3];
uniform vec4 uShape[3];
uniform vec4 uParallax[3];
uniform int uCount[3];
uniform vec4 uLine[${MAX_LINES * 3}];
uniform vec3 uLineColor[${MAX_LINES * 3}];
uniform vec2 uMouseWarp[3];
uniform float uHaloReach;
uniform float uWidth;
uniform float uGlow;
uniform float uBrightness;
uniform float uFocus;
uniform float uEdgeFade;
uniform vec4 uMouse;
uniform float uBendRadius;
uniform float uBendStrength;
uniform vec4 uClicks[${MAX_CLICKS}];
uniform float uLight;
uniform float uOpaque;
uniform vec3 uBackground;
uniform float uOpacity;
uniform float uStyle;
uniform float uSpacing;
out vec4 outColor;

vec3 toSrgb(vec3 c) {
  return pow(max(c, 0.0), vec3(1.0 / 2.2));
}

vec3 inkOf(vec3 color) {
  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  return color * min(1.0, 0.16 / max(luma, 0.001));
}

vec2 warp(vec2 p, float rotate, float flip) {
  float angle = rotate * log(length(p) + 1.0);
  vec2 r = p * mat2(cos(angle), sin(angle), -sin(angle), cos(angle));
  if (flip > 0.5) r.x = -r.x;
  return r;
}

void main() {
  vec2 screen = (2.0 * gl_FragCoord.xy - uResolution) / uResolution.y;
  screen.y = -screen.y;
  for (int k = 0; k < ${MAX_CLICKS}; k++) {
    vec4 click = uClicks[k];
    if (click.w == 0.0) continue;
    float age = click.z;
    float turn = 1.9 * smoothstep(0.0, 0.23, age) * exp(-max(age - 0.23, 0.0) * 1.1) * click.w;
    float spread = 0.3 * (1.0 + age * 0.55);
    vec2 offset = screen - click.xy;
    float angle = turn * exp(-dot(offset, offset) / (spread * spread));
    screen = click.xy + mat2(cos(angle), sin(angle), -sin(angle), cos(angle)) * offset;
  }
  vec3 light = vec3(0.0);
  vec3 bloom = vec3(0.0);
  vec3 inkColor = vec3(0.0);
  float inkAlpha = 0.0;
  float aa = 0.75 * uRatio;
  float invSigma = 1.0 / max(uBendRadius * uBendRadius, 1e-4);
  float tight = 1.0 / (2.6 * uRatio);
  float wide = 1.0 / (11.0 * uRatio);

  for (int w = 0; w < 3; w++) {
    int count = uCount[w];
    if (count <= 0) continue;
    vec4 wave = uWave[w];
    vec4 shape = uShape[w];
    vec2 r = warp(screen + uParallax[w].xy, wave.z, shape.w);
    vec2 rm = uMouseWarp[w];
    float blur = uFocus * uParallax[w].z;
    float width = uWidth * (1.0 + blur * 2.5);
    float soft = aa * (1.0 + blur * 7.0);
    float energy = (uWidth + aa) / (width + soft) * shape.z;
    float cut = uHaloReach + width * 2.0 + soft;
    float sx = sin(r.x);
    float cx = cos(r.x);
    float along = r.x - rm.x;
    float pull = uMouse.z * exp(-along * along * invSigma);
    float level = r.y + wave.y;
    int first = w * ${MAX_LINES};

    for (int i = 0; i < ${MAX_LINES}; i++) {
      if (i >= count) break;
      vec4 line = uLine[first + i];
      float y = (sx * line.x + cx * line.y) * line.z;
      float near = 0.0;
      if (pull > 0.002) {
        float across = (y - wave.y) - rm.y;
        near = exp(-across * across * invSigma) * pull;
        float push = uBendStrength * near;
        y += across * (uBendStrength < 0.0 ? min(-push, 2.5) : -min(push, 0.9));
      }
      float m = level - y;
      float slope = length(vec2(dFdx(m), dFdy(m)));
      float d = abs(m) / max(slope, 1e-5);
      if (d < cut) {
        float gap = d;
        float size = width;
        if (uStyle > 0.5) {
          float period = uSpacing / (uResolution.y * 0.5);
          float cell = (fract((r.x + line.w) / period + float(i) * 0.37) - 0.5) * uSpacing;
          float span = uStyle > 1.5 ? max(uSpacing * 0.32 - width, 0.0) : 0.0;
          gap = length(vec2(max(abs(cell) - span, 0.0), d));
          size = uStyle > 1.5 ? width : width * 1.6;
        }
        float core = smoothstep(size + soft, size - soft, gap);
        float fall = 1.0 - d / cut;
        float halo = (exp(-gap * tight) * 0.3 + exp(-d * wide) * 0.02 * fall * fall) * uGlow;
        vec3 color = uLineColor[first + i];
        float lift = 1.0 + near * 0.8;
        light += color * core * energy * lift;
        bloom += color * halo * shape.z * lift;
        float a = clamp(clamp(core * energy * 1.15 + halo * shape.z * 0.12, 0.0, 1.0) * lift, 0.0, 1.0);
        inkColor = inkOf(color) * a + inkColor * (1.0 - a);
        inkAlpha = a + inkAlpha * (1.0 - a);
      }
    }
  }

  float edge = 1.0;
  if (uEdgeFade > 0.0) {
    float u = gl_FragCoord.x / uResolution.x;
    float fade = uEdgeFade * 0.45;
    float left = smoothstep(0.0, fade, u);
    float right = smoothstep(0.0, fade, 1.0 - u);
    edge = left * left * (3.0 - 2.0 * left) * right * right * (3.0 - 2.0 * right);
  }

  if (uLight > 0.5) {
    float alpha = inkAlpha * edge * uOpacity;
    vec3 ink = toSrgb(inkColor / max(inkAlpha, 1e-4));
    if (uOpaque > 0.5) {
      outColor = vec4(mix(uBackground, ink, alpha), 1.0);
    } else {
      outColor = vec4(ink * alpha, alpha);
    }
    return;
  }

  vec3 capped = 0.28 * (1.0 - exp(-bloom / 0.28));
  vec3 glow = toSrgb(1.0 - exp(-(light + capped) * uBrightness * 1.2)) * edge * uOpacity;
  if (uOpaque > 0.5) {
    outColor = vec4(uBackground + glow * (1.0 - uBackground), 1.0);
  } else {
    outColor = vec4(glow, max(glow.r, max(glow.g, glow.b)));
  }
}`;
  var clamp7 = (value, min, max) => Math.min(max, Math.max(min, value));
  var warp = (x, y, rotate3, flip) => {
    const angle2 = rotate3 * Math.log(Math.hypot(x, y) + 1);
    const cos = Math.cos(angle2);
    const sin = Math.sin(angle2);
    const rx = x * cos + y * sin;
    return [flip > 0.5 ? -rx : rx, y * cos - x * sin];
  };
  var compile7 = (gl, type, source) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
    gl.deleteShader(shader);
    return null;
  };
  var link6 = (gl) => {
    const vertex2 = compile7(gl, gl.VERTEX_SHADER, VERTEX5);
    const fragment2 = compile7(gl, gl.FRAGMENT_SHADER, FRAGMENT3);
    const program = gl.createProgram();
    if (!vertex2 || !fragment2 || !program) {
      if (program) gl.deleteProgram(program);
      if (vertex2) gl.deleteShader(vertex2);
      if (fragment2) gl.deleteShader(fragment2);
      return null;
    }
    gl.attachShader(program, vertex2);
    gl.attachShader(program, fragment2);
    gl.bindAttribLocation(program, 0, "aPosition");
    gl.linkProgram(program);
    gl.deleteShader(vertex2);
    gl.deleteShader(fragment2);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      return null;
    }
    const uniforms = {};
    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i++) {
      const info = gl.getActiveUniform(program, i);
      if (info) uniforms[info.name.replace("[0]", "")] = gl.getUniformLocation(program, info.name);
    }
    return { program, uniforms };
  };
  var perWave = (value, waves, wave, fallback) => {
    if (typeof value === "number") return value;
    if (!Array.isArray(value) || value.length === 0) return fallback;
    const index = waves.indexOf(wave);
    return value[index] ?? value[value.length - 1] ?? fallback;
  };
  var mountFloatingLines = (root) => {
    if (!canRunEffects(root)) return null;
    const win = windowOf(root);
    const doc = root.ownerDocument;
    if (!win) return null;
    const canvas = effectCanvas(root);
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false
    });
    if (!gl) return abortMount(canvas);
    const program = link6(gl);
    if (!program) return abortMount(canvas);
    const u = program.uniforms;
    let buffer = gl.createBuffer();
    let vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    if (!buffer || !vao) {
      if (buffer) gl.deleteBuffer(buffer);
      if (vao) gl.deleteVertexArray(vao);
      gl.deleteProgram(program.program);
      return abortMount(canvas);
    }
    const enabledWaves = ["top", "middle", "bottom"];
    const waves = Array.isArray(enabledWaves) ? enabledWaves.filter((wave) => WAVES.includes(wave)) : WAVES;
    const lineCount = 10;
    const lineDistance = 6;
    const lineStyle = "solid";
    const settings = {
      stops: ["#e945f5", "#ffffff"].slice(0, MAX_STOPS),
      waves: WAVES.map((wave) => {
        const on = waves.includes(wave);
        const position = { ...WAVE_DEFAULTS[wave] };
        return {
          count: on ? clamp7(Math.round(perWave(lineCount, waves, wave, 10)), 0, MAX_LINES) : 0,
          distance: perWave(lineDistance, waves, wave, 6) * 0.01,
          position
        };
      }),
      animationSpeed: Math.max(0, 1),
      amplitude: Math.max(0, 1),
      lineWidth: Math.max(0.1, 1),
      style: lineStyle === "dashed" ? 2 : lineStyle === "dotted" ? 1 : 0,
      glow: Math.max(0, 1),
      brightness: Math.max(0, 1),
      depthOfField: clamp7(0.5, 0, 1),
      edgeFade: clamp7(0, 0, 1),
      interactive: true,
      bendRadius: Math.max(0.1, 5),
      bendStrength: -0.5,
      mouseDamping: clamp7(0.05, 0, 1),
      parallax: true,
      parallaxStrength: Math.max(0, 0.2),
      clickSwirl: true,
      intro: true,
      backgroundColor: void 0,
      lightMode: false,
      opacity: clamp7(1, 0, 1),
      dpr: void 0
    };
    const previousBlend = root.style.mixBlendMode;
    if (!settings.lightMode && !settings.backgroundColor) root.style.mixBlendMode = "screen";
    const probe = doc.createElement("canvas").getContext("2d", { willReadFrequently: true });
    const cache = /* @__PURE__ */ new Map();
    const parse = (value, fallback) => {
      if (!value) return fallback;
      const key = String(value);
      const cached = cache.get(key);
      if (cached) return cached;
      let rgb = fallback;
      if (probe) {
        probe.clearRect(0, 0, 1, 1);
        probe.fillStyle = "#000000";
        probe.fillStyle = key;
        probe.fillRect(0, 0, 1, 1);
        const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
        rgb = [r / 255, g / 255, b / 255];
      }
      cache.set(key, rgb);
      return rgb;
    };
    const reduce = win.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const pointer = { x: 0, y: 0, nx: 0, ny: 0, vx: 0, inside: false };
    const mouse = { x: 0, y: 0, influence: 0, px: 0, py: 0 };
    const clicks = [];
    const waveData = new Float32Array(12);
    const shapeData = new Float32Array(12);
    const parallaxData = new Float32Array(12);
    const countData = new Int32Array(3);
    const lineData = new Float32Array(MAX_LINES * 3 * 4);
    const colorData = new Float32Array(MAX_LINES * 3 * 3);
    const mouseData = new Float32Array(6);
    const clickData = new Float32Array(MAX_CLICKS * 4);
    let time = 0;
    let reveal = settings.intro && !reduce ? 0 : 1;
    let raf = 0;
    let last = 0;
    let visible = true;
    let alive = true;
    const render = () => {
      const s = settings;
      const width = canvas.width;
      const height = canvas.height;
      const eased = reveal * reveal * (3 - 2 * reveal);
      const ratio = width / Math.max(1, root.clientWidth);
      const stops = s.stops.map((value) => parse(value, [1, 1, 1]).map((channel) => Math.pow(channel, 2.2)));
      const mouseX = (2 * mouse.x - width) / height;
      const mouseY = -(2 * mouse.y - height) / height;
      s.waves.forEach((wave, index) => {
        const shape = WAVE_SHAPE[WAVES[index]];
        const { x: shift, y: lift, rotate: rotate3 } = wave.position;
        const px = mouse.px * shape.drift;
        const py = -mouse.py * shape.drift;
        waveData.set([shift, lift, rotate3, 0], index * 4);
        shapeData.set([shape.offset, shape.step, shape.light, shape.flip], index * 4);
        parallaxData.set([px, py, shape.depth, 0], index * 4);
        mouseData.set(warp(mouseX + px, mouseY + py, rotate3, shape.flip), index * 2);
        countData[index] = wave.count;
        for (let line = 0; line < wave.count; line++) {
          const offset = shape.offset + shape.step * line;
          const along = wave.distance * line + shift;
          const phase = along + offset + time * 0.1;
          const amp = Math.sin(offset + time * 0.2) * 0.3 * s.amplitude * eased;
          const slot = index * MAX_LINES + line;
          lineData.set([Math.cos(phase), Math.sin(phase), amp, along], slot * 4);
          const t = wave.count > 1 ? line / (wave.count - 1) : 0;
          const scaled = t * Math.max(stops.length - 1, 0);
          const from = Math.min(Math.floor(scaled), Math.max(stops.length - 2, 0));
          const to = Math.min(from + 1, stops.length - 1);
          const f = clamp7(scaled - from, 0, 1);
          const e = f * f * (3 - 2 * f);
          for (let c = 0; c < 3; c++) colorData[slot * 3 + c] = stops[from][c] + (stops[to][c] - stops[from][c]) * e;
        }
      });
      clickData.fill(0);
      clicks.forEach((click, index) => clickData.set([click.x, click.y, click.age, click.spin], index * 4));
      gl.viewport(0, 0, width, height);
      gl.useProgram(program.program);
      gl.bindVertexArray(vao);
      gl.uniform2f(u.uResolution, width, height);
      gl.uniform1f(u.uRatio, ratio);
      gl.uniform4fv(u.uWave, waveData);
      gl.uniform4fv(u.uShape, shapeData);
      gl.uniform4fv(u.uParallax, parallaxData);
      gl.uniform1iv(u.uCount, countData);
      gl.uniform4fv(u.uLine, lineData);
      gl.uniform3fv(u.uLineColor, colorData);
      gl.uniform2fv(u.uMouseWarp, mouseData);
      gl.uniform1f(u.uHaloReach, 11 * ratio * Math.log(160 * s.glow + 1));
      gl.uniform1f(u.uWidth, s.lineWidth * 0.5 * ratio);
      gl.uniform1f(u.uGlow, s.glow);
      gl.uniform1f(u.uBrightness, s.brightness * eased);
      gl.uniform1f(u.uFocus, s.depthOfField);
      gl.uniform1f(u.uEdgeFade, s.edgeFade);
      gl.uniform4f(u.uMouse, mouse.x, mouse.y, mouse.influence, 0);
      gl.uniform1f(u.uBendRadius, s.bendRadius * 0.09);
      gl.uniform1f(u.uBendStrength, s.bendStrength * 2.5);
      gl.uniform4fv(u.uClicks, clickData);
      gl.uniform1f(u.uLight, s.lightMode ? 1 : 0);
      gl.uniform1f(u.uOpaque, s.backgroundColor ? 1 : 0);
      gl.uniform3fv(u.uBackground, parse(s.backgroundColor, s.lightMode ? [1, 1, 1] : [0, 0, 0]));
      gl.uniform1f(u.uOpacity, s.opacity * eased);
      gl.uniform1f(u.uStyle, s.style);
      gl.uniform1f(u.uSpacing, (s.style === 2 ? 22 : 9) * ratio);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const frame = (now) => {
      raf = 0;
      if (!alive || !visible || doc.hidden) return;
      const s = settings;
      const dt = last ? clamp7((now - last) / 1e3, 5e-4, 0.05) : 1 / 60;
      last = now;
      const motion = reduce ? 0 : 1;
      time += dt * s.animationSpeed * motion;
      if (s.intro && !reduce && reveal < 1) reveal = Math.min(1, reveal + dt / INTRO_SECONDS4);
      else if (!s.intro || reduce) reveal = 1;
      const follow = 1 - Math.pow(1 - s.mouseDamping, dt * 60);
      const engaged = s.interactive && pointer.inside && !reduce;
      if (engaged) {
        mouse.x += (pointer.x - mouse.x) * follow;
        mouse.y += (pointer.y - mouse.y) * follow;
      }
      mouse.influence += ((engaged ? 1 : 0) - mouse.influence) * follow;
      const tx = s.parallax && engaged ? pointer.nx * s.parallaxStrength : 0;
      const ty = s.parallax && engaged ? pointer.ny * s.parallaxStrength : 0;
      mouse.px += (tx - mouse.px) * follow;
      mouse.py += (ty - mouse.py) * follow;
      for (let i = clicks.length - 1; i >= 0; i--) {
        clicks[i].age += dt;
        if (clicks[i].age > 4) clicks.splice(i, 1);
      }
      render();
      raf = win.requestAnimationFrame(frame);
    };
    const wake = () => {
      if (!raf && alive && visible && !doc.hidden) raf = win.requestAnimationFrame(frame);
    };
    const resize = () => {
      const s = settings;
      const width = Math.max(1, root.clientWidth);
      const height = Math.max(1, root.clientHeight);
      const ratio = Math.min(s.dpr || win.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      render();
      wake();
    };
    const locate = (event) => {
      const rect = root.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const ratio = canvas.width / Math.max(1, rect.width);
      pointer.inside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
      const nextX = x * ratio;
      if (Math.abs(nextX - pointer.x) > 0.5) pointer.vx = nextX - pointer.x;
      pointer.x = nextX;
      pointer.y = (rect.height - y) * ratio;
      pointer.nx = x / Math.max(1, rect.width) - 0.5;
      pointer.ny = 0.5 - y / Math.max(1, rect.height);
    };
    const onPointerMove = (event) => {
      const wasInside = pointer.inside;
      locate(event);
      if (pointer.inside && !wasInside && mouse.influence < 0.05) {
        mouse.x = pointer.x;
        mouse.y = pointer.y;
      }
      wake();
    };
    const onPointerDown = (event) => {
      locate(event);
      if (!pointer.inside || !settings.clickSwirl || reduce) return;
      const x = (2 * pointer.x - canvas.width) / canvas.height;
      const y = -(2 * pointer.y - canvas.height) / canvas.height;
      clicks.unshift({ x, y, age: 0, spin: pointer.vx < 0 ? -1 : 1 });
      if (clicks.length > MAX_CLICKS) clicks.pop();
      wake();
    };
    const onPointerUp = (event) => {
      if (event.pointerType !== "mouse") pointer.inside = false;
    };
    const onPointerLeave = () => {
      pointer.inside = false;
    };
    const onVisibility = () => {
      last = 0;
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
          last = 0;
          wake();
        }
      });
      visibility.observe(root);
    }
    win.addEventListener("pointermove", onPointerMove, { passive: true });
    win.addEventListener("pointerdown", onPointerDown, { passive: true });
    win.addEventListener("pointerup", onPointerUp, { passive: true });
    win.addEventListener("pointercancel", onPointerUp, { passive: true });
    doc.documentElement.addEventListener("pointerleave", onPointerLeave);
    doc.addEventListener("visibilitychange", onVisibility);
    resize();
    const instance = {
      destroy() {
        alive = false;
        if (raf) win.cancelAnimationFrame(raf);
        raf = 0;
        resizeObserver?.disconnect();
        visibility?.disconnect();
        if (onWindowResize) win.removeEventListener("resize", onWindowResize);
        win.removeEventListener("pointermove", onPointerMove);
        win.removeEventListener("pointerdown", onPointerDown);
        win.removeEventListener("pointerup", onPointerUp);
        win.removeEventListener("pointercancel", onPointerUp);
        doc.documentElement.removeEventListener("pointerleave", onPointerLeave);
        doc.removeEventListener("visibilitychange", onVisibility);
        root.style.mixBlendMode = previousBlend;
        gl.deleteProgram(program.program);
        gl.deleteBuffer(buffer);
        gl.deleteVertexArray(vao);
        try {
          gl.getExtension("WEBGL_lose_context")?.loseContext();
        } catch {
        }
        canvas.remove();
      }
    };
    return instance;
  };

  // src/features/courses/reactbits/grid-scan.ts
  var MAX_PINGS = 4;
  var PING_LIFE = 2.4;
  var INTRO_SECONDS5 = 2.2;
  var EYE_DISTANCE = 1.25;
  var STYLES = { solid: 0, dashed: 1, dotted: 2 };
  var VERTEX6 = `#version 300 es
out vec2 vUv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;
  var ROOM = `#version 300 es
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
  var DOWN2 = `#version 300 es
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
  var BLUR2 = `#version 300 es
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
  var COMPOSITE3 = `#version 300 es
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
  var clamp8 = (value, min, max) => Math.min(max, Math.max(min, value));
  var compile8 = (gl, type, source) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
    gl.deleteShader(shader);
    return null;
  };
  var link7 = (gl, fragmentSource) => {
    const vertex2 = compile8(gl, gl.VERTEX_SHADER, VERTEX6);
    const fragment2 = compile8(gl, gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    if (!vertex2 || !fragment2 || !program) {
      if (program) gl.deleteProgram(program);
      if (vertex2) gl.deleteShader(vertex2);
      if (fragment2) gl.deleteShader(fragment2);
      return null;
    }
    gl.attachShader(program, vertex2);
    gl.attachShader(program, fragment2);
    gl.linkProgram(program);
    gl.deleteShader(vertex2);
    gl.deleteShader(fragment2);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      return null;
    }
    const uniforms = {};
    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i++) {
      const info = gl.getActiveUniform(program, i);
      if (!info) continue;
      const name = info.name.replace(/\[0\]$/, "");
      uniforms[name] = gl.getUniformLocation(program, name);
    }
    return { program, uniforms };
  };
  var createTarget = (gl) => {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return { texture, width: 0, height: 0 };
  };
  var sizeTarget = (gl, target, width, height) => {
    if (target.width === width && target.height === height) return;
    target.width = width;
    target.height = height;
    gl.bindTexture(gl.TEXTURE_2D, target.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  };
  var mountGridScan = (root) => {
    if (!canRunEffects(root)) return null;
    const win = windowOf(root);
    const doc = root.ownerDocument;
    if (!win) return null;
    const canvas = effectCanvas(root);
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false
    });
    if (!gl) return abortMount(canvas);
    const room = link7(gl, ROOM);
    const down = link7(gl, DOWN2);
    const blur = link7(gl, BLUR2);
    const composite = link7(gl, COMPOSITE3);
    const programs = [room, down, blur, composite];
    if (!room || !down || !blur || !composite) {
      programs.forEach((item) => {
        if (item) gl.deleteProgram(item.program);
      });
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
    if (!vao || targets.some((target) => !target.texture) || framebuffers.some((buffer) => !buffer)) {
      targets.forEach((target) => {
        if (target.texture) gl.deleteTexture(target.texture);
      });
      framebuffers.forEach((buffer) => {
        if (buffer) gl.deleteFramebuffer(buffer);
      });
      if (vao) gl.deleteVertexArray(vao);
      programs.forEach((item) => {
        if (item) gl.deleteProgram(item.program);
      });
      return abortMount(canvas);
    }
    const probe = doc.createElement("canvas").getContext("2d", { willReadFrequently: true });
    const colorCache = /* @__PURE__ */ new Map();
    const parse = (value) => {
      const key = String(value);
      const cached = colorCache.get(key);
      if (cached) return cached;
      let rgb = [1, 1, 1];
      if (probe) {
        probe.clearRect(0, 0, 1, 1);
        probe.fillStyle = "#000000";
        probe.fillStyle = key;
        probe.fillRect(0, 0, 1, 1);
        const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
        rgb = [r / 255, g / 255, b / 255];
      }
      colorCache.set(key, rgb);
      return rgb;
    };
    const reduce = win.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const settings = {
      linesColor: "#4d4757",
      scanColor: "#7dd3fc",
      cells: 8,
      thickness: 1,
      style: STYLES["solid"] ?? 0,
      depth: 3,
      depthFade: 0.6,
      parallax: 1,
      points: true,
      reflection: 0.35,
      shading: 0.7,
      direction: "forward",
      duration: 2.4,
      delay: 1.6,
      scanWidth: 1,
      trail: 0.5,
      glow: 0.6,
      autoScan: true,
      interactive: true,
      clickEffect: "ping",
      enableGyro: false,
      intro: true,
      lightMode: false
    };
    const view = { width: 1, height: 1, ratio: 1 };
    const eye = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, f: EYE_DISTANCE, vf: 0, tf: EYE_DISTANCE };
    const pointer = { x: 0, y: 0, inside: false };
    const look = { x: 0, y: 0, held: false };
    const tilt = { gamma: 0, beta: 0, ready: false, asked: false };
    const hover = { x: 0, y: 0, z: 0, strength: 0, ready: false };
    const scan = { z: 0, dir: 1, alpha: 0, start: 0, sweeps: 0, waiting: false };
    const pings = [];
    const pingData = new Float32Array(MAX_PINGS * 4);
    const pingAlpha = new Float32Array(MAX_PINGS);
    let time = 0;
    let introClock = settings.intro && !reduce ? 0 : 1;
    let raf = 0;
    let last = 0;
    let visible = true;
    let alive = true;
    let leaveTimer = 0;
    const roomSize = () => {
      const aspect = view.width / view.height;
      const cy = 1 / Math.round(settings.cells);
      const cx = aspect / Math.max(1, Math.round(aspect / cy));
      const roomDepth = Math.max(cy, Math.round(settings.depth / cy) * cy);
      return { aspect, cx, cy, roomDepth };
    };
    const castRay = (u, v) => {
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
    const startSweep = (s) => {
      scan.dir = s.direction === "backward" || s.direction === "pingpong" && scan.sweeps % 2 === 1 ? -1 : 1;
      scan.start = time;
      scan.waiting = false;
      scan.sweeps += 1;
    };
    const updateScan = (s, roomDepth) => {
      if (introClock < 1) {
        const k2 = introClock;
        scan.dir = 1;
        scan.z = k2 * (roomDepth + 0.4) - 0.2;
        scan.alpha = Math.min(1, k2 * 6) * (1 - Math.max(0, k2 - 0.85) / 0.15);
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
    const updateEye = (dt) => {
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
    const setLook = (nx, ny, held) => {
      look.x = clamp8(nx, -1, 1);
      look.y = clamp8(ny, -1, 1);
      look.held = held;
    };
    const aimEye = (s) => {
      const aspect = view.width / view.height;
      const drift = reduce ? 0 : 1;
      const nx = look.held ? look.x : (Math.sin(time * 0.21) * 0.2 + Math.sin(time * 0.083 + 1.3) * 0.12) * drift;
      const ny = look.held ? look.y : Math.sin(time * 0.17 + 2.1) * 0.16 * drift;
      eye.tx = nx * s.parallax * 0.22 * aspect;
      eye.ty = ny * s.parallax * 0.22;
    };
    const resize = () => {
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
    const draw = () => {
      const s = settings;
      const { aspect, cx, cy, roomDepth } = roomSize();
      const lineRgb = parse(s.linesColor);
      const scanRgb = parse(s.scanColor);
      const coreRgb = s.lightMode ? scanRgb : scanRgb.map((c) => c + (1 - c) * 0.65);
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
      gl.uniform1f(ru.uScanWidth, 6e-3 * s.scanWidth);
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
        const spread = 2.2 * view.ratio / 2;
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
    const frame = (now) => {
      raf = 0;
      if (!alive || !visible || doc.hidden) return;
      const s = settings;
      const dt = last ? clamp8((now - last) / 1e3, 1e-3, 0.05) : 1 / 60;
      last = now;
      time += dt;
      if (introClock < 1) introClock = Math.min(1, introClock + dt / INTRO_SECONDS5);
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
      const settling = Math.abs(eye.tx - eye.x) + Math.abs(eye.ty - eye.y) + Math.abs(eye.tf - eye.f) > 1e-4 || Math.abs(eye.vx) + Math.abs(eye.vy) + Math.abs(eye.vf) > 1e-4;
      const busy = introClock < 1 || !reduce && s.autoScan || !scan.waiting || pings.length > 0 || settling || hover.strength > 2e-3 || !reduce && s.parallax > 0 && !look.held || s.points && !reduce && scan.alpha > 0;
      if (busy) raf = win.requestAnimationFrame(frame);
      else last = 0;
    };
    const wake = () => {
      if (!alive || raf || !visible || doc.hidden) return;
      raf = win.requestAnimationFrame(frame);
    };
    const locate = (event) => {
      const rect = root.getBoundingClientRect();
      const u = (event.clientX - rect.left) / Math.max(1, rect.width);
      const v = 1 - (event.clientY - rect.top) / Math.max(1, rect.height);
      return { u, v, inside: u >= 0 && u <= 1 && v >= 0 && v <= 1 };
    };
    const onPointerMove = (event) => {
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
    const onPointerDown = (event) => {
      const s = settings;
      const { u, v, inside } = locate(event);
      if (!inside || reduce || s.clickEffect === "none") return;
      if (s.clickEffect === "scan") {
        if (introClock >= 1) startSweep(s);
      } else {
        const hit = castRay(u, v);
        pings.unshift({ ...hit, age: 0 });
        if (pings.length > MAX_PINGS) pings.pop();
      }
      wake();
    };
    const onPointerLeave = () => {
      pointer.inside = false;
      look.held = false;
      wake();
    };
    const onOrientation = (event) => {
      const s = settings;
      if (!s.enableGyro || reduce || event.gamma === null || event.beta === null) return;
      if (!tilt.ready) Object.assign(tilt, { gamma: event.gamma, beta: event.beta, ready: true });
      setLook((event.gamma - tilt.gamma) / 25, (event.beta - tilt.beta) / -25, true);
      wake();
    };
    const onClick = () => {
      const DeviceOrientationCtor = win.DeviceOrientationEvent;
      const request = DeviceOrientationCtor?.requestPermission;
      if (!settings.enableGyro || tilt.asked || typeof request !== "function") return;
      tilt.asked = true;
      request.call(DeviceOrientationCtor).catch(() => {
      });
    };
    const onVisibility = () => {
      last = 0;
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
          last = 0;
          wake();
        }
      });
      visibility.observe(root);
    }
    win.addEventListener("pointermove", onPointerMove, { passive: true });
    win.addEventListener("pointerdown", onPointerDown, { passive: true });
    win.addEventListener("deviceorientation", onOrientation);
    win.addEventListener("click", onClick);
    doc.documentElement.addEventListener("pointerleave", onPointerLeave);
    doc.addEventListener("visibilitychange", onVisibility);
    resize();
    wake();
    const instance = {
      destroy() {
        alive = false;
        if (raf) win.cancelAnimationFrame(raf);
        raf = 0;
        win.clearTimeout(leaveTimer);
        resizeObserver?.disconnect();
        visibility?.disconnect();
        if (onWindowResize) win.removeEventListener("resize", onWindowResize);
        win.removeEventListener("pointermove", onPointerMove);
        win.removeEventListener("pointerdown", onPointerDown);
        win.removeEventListener("deviceorientation", onOrientation);
        win.removeEventListener("click", onClick);
        doc.documentElement.removeEventListener("pointerleave", onPointerLeave);
        doc.removeEventListener("visibilitychange", onVisibility);
        targets.forEach((target) => {
          if (target.texture) gl.deleteTexture(target.texture);
        });
        framebuffers.forEach((buffer) => {
          if (buffer) gl.deleteFramebuffer(buffer);
        });
        gl.deleteVertexArray(vao);
        programs.forEach((item) => {
          if (item) gl.deleteProgram(item.program);
        });
        try {
          gl.getExtension("WEBGL_lose_context")?.loseContext();
        } catch {
        }
        canvas.remove();
      }
    };
    return instance;
  };

  // src/features/courses/reactbits/gradient-blinds.ts
  var MAX_COLORS2 = 8;
  var MAX_WAVES = 4;
  var INTRO_SECONDS6 = 1.8;
  var RIPPLE_SECONDS = 1.6;
  var DEFAULT_GRADIENT = ["#FF9FFC", "#5227FF"];
  var VERTEX7 = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;
  var FRAGMENT4 = `#version 300 es
precision highp float;
precision highp int;

uniform vec2 uResolution;
uniform float uTime;
uniform vec2 uMouse;
uniform float uAngle;
uniform float uNoise;
uniform float uBlindCount;
uniform float uSpotlightRadius;
uniform float uSpotlightSoftness;
uniform float uSpotlightOpacity;
uniform float uMirror;
uniform float uDistort;
uniform float uShineFlip;
uniform vec3 uColors[8];
uniform int uColorCount;
uniform float uLightMode;
uniform float uShine;
uniform float uRelief;
uniform float uGlow;
uniform float uSway;
uniform float uSwayTime;
uniform float uHover;
uniform vec4 uWaves[4];
uniform float uIntro;
uniform float uGrainTime;
uniform vec3 uLightColor;
uniform float uPerspective;
uniform float uGradientShift;

out vec4 outColor;

float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

vec2 rotate2D(vec2 p, float a) {
  float c = cos(a);
  float s = sin(a);
  return mat2(c, -s, s, c) * p;
}

vec2 blindSpace(vec2 uv0) {
  float aspect = uResolution.x / uResolution.y;
  vec2 p = uv0 * 2.0 - 1.0;
  p.x *= aspect;
  vec2 pr = rotate2D(p, uAngle);
  pr.x /= aspect;
  vec2 uv = pr * 0.5 + 0.5;
  if (abs(uPerspective) > 0.001) {
    float k = uPerspective * 2.2;
    uv.x = (exp(k * uv.x) - 1.0) / (exp(k) - 1.0);
  }
  if (uDistort > 0.0) {
    float a = uv.y * 6.0;
    float b = uv.x * 6.0;
    float w = 0.01 * uDistort;
    uv.x += sin(a) * w;
    uv.y += cos(b) * w;
  }
  return uv;
}

vec3 gradientColor(float t) {
  float tt = clamp(t, 0.0, 1.0);
  int count = max(uColorCount, 2);
  float scaled = tt * float(count - 1);
  int seg = min(int(floor(scaled)), count - 2);
  float f = scaled - float(seg);
  if (tt >= 1.0) return uColors[count - 1];
  return mix(uColors[seg], uColors[seg + 1], f);
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 uv0 = frag / uResolution;
  vec2 uvMod = blindSpace(uv0);

  float count = max(uBlindCount, 1.0);
  float stripePhase = uvMod.x * count;
  float pixel = max(fwidth(stripePhase), 1e-5);

  float t = uvMod.x;
  if (uGradientShift != 0.0) {
    t = 1.0 - abs(1.0 - fract((t + uGradientShift) * 0.5) * 2.0);
  }
  if (uMirror > 0.5) {
    t = 1.0 - abs(1.0 - 2.0 * fract(t));
  }
  vec3 base = gradientColor(t);

  vec2 offset = uMouse / uResolution;
  float d = length(uv0 - offset);
  float r = max(uSpotlightRadius, 1e-4);
  float spot = (1.0 - 2.0 * pow(d / r, uSpotlightSoftness)) * uSpotlightOpacity;

  float slat = floor(stripePhase);
  float s = stripePhase - slat;
  float stripeAA = clamp(count * 1.25 / min(uResolution.x, uResolution.y), 0.001, 0.12);
  float edgeBlend = 1.0 - smoothstep(0.0, stripeAA, min(s, 1.0 - s));
  float across = mix(s, 0.5, edgeBlend);
  float ramp = uShineFlip > 0.5 ? 1.0 - across : across;

  float unit = min(uResolution.x, uResolution.y);
  float reach = max(uSpotlightRadius, 0.05) * unit;
  vec2 toLight = uMouse - frag;
  float nearLight = exp(-dot(toLight, toLight) / (reach * reach));

  float tilt = 0.0;
  float pulse = 0.0;
  if (uSway > 0.0) {
    tilt += uSway * 0.5 * sin(uSwayTime * 0.9 + slat * 0.55) * (0.6 + 0.4 * sin(uSwayTime * 0.37 + slat * 0.21));
  }
  tilt += uHover * nearLight * 0.7;
  float aspect = uResolution.x / uResolution.y;
  for (int i = 0; i < 4; i++) {
    vec4 wave = uWaves[i];
    if (wave.w <= 0.0) continue;
    float age = uTime - wave.z;
    if (age < 0.0 || age > ${RIPPLE_SECONDS.toFixed(2)}) continue;
    float life = age / ${RIPPLE_SECONDS.toFixed(2)};
    vec2 origin = blindSpace(wave.xy / uResolution);
    float slats = abs(slat + 0.5 - origin.x * count);
    float front = age * max(count, 4.0) * 0.95;
    float k = (slats - front) / (0.8 + life * 1.2);
    float along = (uvMod.y - origin.y) / max(0.42 + life * 0.5, 0.01);
    float fade = (1.0 - life) * (1.0 - life);
    float ring = exp(-k * k) * exp(-along * along) * fade * smoothstep(0.0, 0.2, age);
    tilt += ring * 0.9;
    pulse += ring;
  }
  if (uIntro < 1.0) {
    float settle = smoothstep(0.0, 1.0, clamp(uIntro * 1.5 - uv0.x * 0.5, 0.0, 1.0));
    tilt -= (1.0 - settle) * 1.2;
  }

  float edge = ramp;
  float calm = 1.0 - 0.6 * clamp(spot, 0.0, 1.0);
  ramp = pow(clamp(ramp, 0.0, 1.0), exp(tilt * 0.9));
  ramp *= 1.0 - 0.3 * min(pulse, 1.0) * calm;
  float crease = uRelief * 0.38 * smoothstep(0.62, 1.0, ramp);
  float sheen = uShine * exp(-pow((edge - 0.035) / 0.07, 2.0)) * (0.3 + 0.7 * nearLight) * (1.0 - edgeBlend);

  vec3 lit = spot > 0.0 ? uLightColor * spot : vec3(spot);
  lit += uLightColor * min(pulse, 1.0) * 0.35 * calm;
  vec3 revealSignal = lit + base - vec3(ramp + crease);

  vec3 col;
  if (uLightMode > 0.5) {
    vec3 luma = vec3(0.2126, 0.7152, 0.0722);
    float peak = max(base.r, max(base.g, base.b));
    float low = min(base.r, min(base.g, base.b));
    float chroma = (peak - low) / max(peak, 0.0001);
    vec3 hue = base / max(peak, 0.0001);
    hue = clamp(mix(vec3(dot(hue, luma)), hue, 1.3), 0.0, 1.0);
    hue *= mix(1.0, 0.82, smoothstep(0.55, 0.9, dot(hue, luma)));
    vec3 tint = mix(base, hue, smoothstep(0.06, 0.28, chroma));
    vec3 revealed = clamp(revealSignal, 0.0, 1.0);
    float coverage = max(revealed.r, max(revealed.g, revealed.b));
    float stroke = 1.0 - smoothstep(pixel, pixel * 2.2, edge);
    col = mix(vec3(1.0), tint, 0.72 * smoothstep(0.0, 1.0, coverage));
    col = mix(col, tint * 0.85, stroke * clamp(coverage * 1.5, 0.0, 1.0) * 0.7);
    col = mix(col, vec3(1.0), clamp(sheen, 0.0, 1.0) * 0.5);
    float grain = max(0.5 * (hash(frag + uGrainTime) + hash(frag.yx + uGrainTime * 1.7)) - 0.5, 0.0);
    col = clamp(col - vec3(grain * uNoise * 0.12 * coverage), 0.0, 1.0);
  } else {
    vec3 haze = base * uGlow * 0.4 * smoothstep(0.0, 1.0, spot) * (0.4 + 0.6 * ramp);
    col = revealSignal + haze + mix(base, uLightColor, 0.45) * sheen * 0.7;
    vec3 over = max(col - 0.8, 0.0);
    col = min(col, vec3(0.8)) + 0.2 * (1.0 - exp(-over / 0.2));
    float luma = dot(clamp(col, 0.0, 1.0), vec3(0.2126, 0.7152, 0.0722));
    float grain = 0.5 * (hash(frag + uGrainTime) + hash(frag.yx + uGrainTime * 1.7)) - 0.5;
    col += grain * uNoise * (0.45 + 0.55 * smoothstep(0.0, 0.5, luma));
  }

  float presence = smoothstep(0.0, 0.65, uIntro);
  col = uLightMode > 0.5 ? mix(vec3(1.0), col, presence) : col * presence;
  outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;
  var clamp9 = (value, min, max) => Math.min(max, Math.max(min, value));
  var compile9 = (gl, type, source) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
    gl.deleteShader(shader);
    return null;
  };
  var link8 = (gl) => {
    const vertex2 = compile9(gl, gl.VERTEX_SHADER, VERTEX7);
    const fragment2 = compile9(gl, gl.FRAGMENT_SHADER, FRAGMENT4);
    const program = gl.createProgram();
    if (!vertex2 || !fragment2 || !program) {
      if (program) gl.deleteProgram(program);
      if (vertex2) gl.deleteShader(vertex2);
      if (fragment2) gl.deleteShader(fragment2);
      return null;
    }
    gl.attachShader(program, vertex2);
    gl.attachShader(program, fragment2);
    gl.linkProgram(program);
    gl.deleteShader(vertex2);
    gl.deleteShader(fragment2);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      return null;
    }
    const uniforms = {};
    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i++) {
      const info = gl.getActiveUniform(program, i);
      if (!info) continue;
      const name = info.name.replace(/\[0\]$/, "");
      uniforms[name] = gl.getUniformLocation(program, name);
    }
    return { program, uniforms };
  };
  var hexToRGB2 = (hex) => {
    const c = String(hex || "").replace("#", "").padEnd(6, "0");
    const r = parseInt(c.slice(0, 2), 16) / 255;
    const g = parseInt(c.slice(2, 4), 16) / 255;
    const b = parseInt(c.slice(4, 6), 16) / 255;
    return [r || 0, g || 0, b || 0];
  };
  var prepStops = (stops) => {
    const base = (stops && stops.length ? stops : DEFAULT_GRADIENT).slice(0, MAX_COLORS2);
    if (base.length === 1) base.push(base[0]);
    while (base.length < MAX_COLORS2) base.push(base[base.length - 1]);
    const flat = new Float32Array(MAX_COLORS2 * 3);
    for (let i = 0; i < MAX_COLORS2; i++) flat.set(hexToRGB2(base[i]), i * 3);
    const count = Math.max(2, Math.min(MAX_COLORS2, stops?.length ?? 2));
    return { flat, count };
  };
  var mountGradientBlinds = (root) => {
    if (!canRunEffects(root)) return null;
    const win = windowOf(root);
    const doc = root.ownerDocument;
    if (!win) return null;
    const canvas = effectCanvas(root);
    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false
    });
    if (!gl) return abortMount(canvas);
    const shader = link8(gl);
    if (!shader) return abortMount(canvas);
    const vao = gl.createVertexArray();
    if (!vao) {
      gl.deleteProgram(shader.program);
      return abortMount(canvas);
    }
    const u = shader.uniforms;
    const reduce = win.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const settings = {
      paused: false,
      colorKey: DEFAULT_GRADIENT.join(","),
      gradientColors: void 0,
      angle: 0,
      noise: 0.3,
      blindCount: 16,
      blindMinWidth: 60,
      mouseDampening: 0.15,
      mirrorGradient: false,
      spotlightRadius: 0.5,
      spotlightSoftness: 1,
      spotlightOpacity: 1,
      distortAmount: 0,
      shineDirection: "left",
      lightColor: "#ffffff",
      perspective: 0,
      gradientSpeed: 0,
      shine: 0.4,
      relief: 0.5,
      glow: 0.4,
      sway: 0.35,
      speed: 1,
      hoverTilt: 0.6,
      clickEffect: "ripple",
      idle: "drift",
      intro: true,
      lightMode: false
    };
    const view = { width: 1, height: 1, ratio: 1, count: 1 };
    const pointer = { x: 0, y: 0, inside: false };
    const light = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, ready: false };
    const waves = new Float32Array(MAX_WAVES * 4);
    let waveIndex = 0;
    let hover = 0;
    let time = 0;
    let swayTime = 0;
    let shift = 0;
    let grainTime = 0;
    let introClock = settings.intro && !reduce ? 0 : 1;
    let colorKeyCache = "";
    let colorStops = prepStops(settings.gradientColors);
    let raf = 0;
    let last = 0;
    let visible = true;
    let alive = true;
    const blindTotal = (s) => {
      if (s.blindMinWidth && s.blindMinWidth > 0) {
        const byWidth = Math.max(1, Math.floor(view.width / s.blindMinWidth));
        return Math.max(1, s.blindCount ? Math.min(s.blindCount, byWidth) : byWidth);
      }
      return Math.max(1, s.blindCount);
    };
    const draw = () => {
      const s = settings;
      if (colorKeyCache !== s.colorKey) {
        colorStops = prepStops(s.gradientColors);
        colorKeyCache = s.colorKey;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(shader.program);
      gl.bindVertexArray(vao);
      gl.uniform2f(u.uResolution, canvas.width, canvas.height);
      gl.uniform1f(u.uTime, time);
      gl.uniform2f(u.uMouse, light.x * view.ratio, (view.height - light.y) * view.ratio);
      gl.uniform1f(u.uAngle, s.angle * Math.PI / 180);
      gl.uniform1f(u.uNoise, s.noise);
      gl.uniform1f(u.uBlindCount, blindTotal(s));
      gl.uniform1f(u.uSpotlightRadius, s.spotlightRadius);
      gl.uniform1f(u.uSpotlightSoftness, s.spotlightSoftness);
      gl.uniform1f(u.uSpotlightOpacity, s.spotlightOpacity);
      gl.uniform1f(u.uMirror, s.mirrorGradient ? 1 : 0);
      gl.uniform1f(u.uDistort, s.distortAmount);
      gl.uniform1f(u.uShineFlip, s.shineDirection === "right" ? 1 : 0);
      gl.uniform3fv(u.uColors, colorStops.flat);
      gl.uniform1i(u.uColorCount, colorStops.count);
      gl.uniform1f(u.uLightMode, s.lightMode ? 1 : 0);
      gl.uniform1f(u.uShine, s.shine);
      gl.uniform1f(u.uRelief, s.relief);
      gl.uniform1f(u.uGlow, s.glow);
      gl.uniform1f(u.uSway, reduce ? 0 : s.sway);
      gl.uniform1f(u.uSwayTime, swayTime);
      gl.uniform1f(u.uHover, hover * s.hoverTilt);
      gl.uniform4fv(u.uWaves, waves);
      gl.uniform1f(u.uIntro, introClock);
      gl.uniform1f(u.uGrainTime, grainTime);
      gl.uniform3fv(u.uLightColor, hexToRGB2(s.lightColor || "#ffffff"));
      gl.uniform1f(u.uPerspective, s.perspective);
      gl.uniform1f(u.uGradientShift, shift);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindVertexArray(null);
    };
    const aim = (s) => {
      if (pointer.inside) {
        light.tx = pointer.x;
        light.ty = pointer.y;
      } else if (s.idle === "center") {
        light.tx = view.width / 2;
        light.ty = view.height / 2;
      } else if (s.idle === "drift" && !reduce) {
        light.tx = view.width * (0.5 + 0.22 * Math.sin(swayTime * 0.23) + 0.05 * Math.sin(swayTime * 0.61 + 1.3));
        light.ty = view.height * (0.5 + 0.16 * Math.sin(swayTime * 0.31 + 0.7) + 0.04 * Math.sin(swayTime * 0.83));
      }
    };
    const follow = (s, dt) => {
      const tau = s.mouseDampening;
      if (tau <= 0) {
        light.x = light.tx;
        light.y = light.ty;
        light.vx = 0;
        light.vy = 0;
        return;
      }
      const omega = 2.4 / tau;
      const k = omega * omega;
      const c = 2 * omega;
      const steps = Math.max(1, Math.ceil(dt / 8e-3));
      const h = dt / steps;
      for (let i = 0; i < steps; i++) {
        light.vx += (k * (light.tx - light.x) - c * light.vx) * h;
        light.vy += (k * (light.ty - light.y) - c * light.vy) * h;
        light.x += light.vx * h;
        light.y += light.vy * h;
      }
    };
    const resize = () => {
      if (!alive) return;
      view.ratio = pixelRatio(win);
      const size = fitCanvas(canvas, root, view.ratio);
      view.width = size.width;
      view.height = size.height;
      if (!light.ready) {
        light.ready = true;
        light.x = light.tx = view.width / 2;
        light.y = light.ty = view.height / 2;
      }
      draw();
      wake();
    };
    const frame = (now) => {
      raf = 0;
      if (!alive || !visible || doc.hidden) return;
      const s = settings;
      const dt = last ? clamp9((now - last) / 1e3, 1e-3, 1 / 20) : 1 / 60;
      last = now;
      if (s.paused) return;
      time += dt;
      if (!reduce) {
        swayTime += dt * s.speed;
        shift = (shift + dt * s.gradientSpeed * 0.06) % 2;
      }
      grainTime = Math.floor(time * 24) * 17.13;
      if (introClock < 1) introClock = Math.min(1, introClock + dt / INTRO_SECONDS6);
      hover += ((pointer.inside ? 1 : 0) - hover) * (1 - Math.exp(-dt / 0.35));
      aim(s);
      follow(s, dt);
      for (let i = 0; i < MAX_WAVES; i++) {
        if (waves[i * 4 + 3] > 0 && time - waves[i * 4 + 2] > RIPPLE_SECONDS) waves[i * 4 + 3] = 0;
      }
      draw();
      const settling = Math.abs(light.tx - light.x) > 0.05 || Math.abs(light.ty - light.y) > 0.05 || Math.abs(light.vx) + Math.abs(light.vy) > 0.05 || Math.abs((pointer.inside ? 1 : 0) - hover) > 2e-3;
      const active = settling || introClock < 1 || waves.some((value, index) => index % 4 === 3 && value > 0) || !reduce && (s.noise > 0 || s.gradientSpeed !== 0 || s.sway > 0 && s.speed > 0 || s.idle === "drift" && !pointer.inside);
      if (active) raf = win.requestAnimationFrame(frame);
    };
    const wake = () => {
      if (!alive || raf || !visible || doc.hidden) return;
      last = 0;
      raf = win.requestAnimationFrame(frame);
    };
    const locate = (event) => {
      const rect = root.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      return { x, y, inside: x >= 0 && y >= 0 && x <= rect.width && y <= rect.height };
    };
    const onPointerMove = (event) => {
      const { x, y, inside } = locate(event);
      pointer.x = x;
      pointer.y = y;
      pointer.inside = inside;
      if (inside) wake();
    };
    const onPointerDown = (event) => {
      const s = settings;
      const { x, y, inside } = locate(event);
      if (!inside || reduce || s.clickEffect !== "ripple") return;
      const o = waveIndex * 4;
      waves[o] = x * view.ratio;
      waves[o + 1] = (view.height - y) * view.ratio;
      waves[o + 2] = time;
      waves[o + 3] = 1;
      waveIndex = (waveIndex + 1) % MAX_WAVES;
      wake();
    };
    const onPointerLeave = () => {
      pointer.inside = false;
      wake();
    };
    const onVisibility = () => {
      last = 0;
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
        if (visible) wake();
      });
      visibility.observe(root);
    }
    win.addEventListener("pointermove", onPointerMove, { passive: true });
    win.addEventListener("pointerdown", onPointerDown, { passive: true });
    doc.documentElement.addEventListener("pointerleave", onPointerLeave);
    doc.addEventListener("visibilitychange", onVisibility);
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
        win.removeEventListener("pointerdown", onPointerDown);
        doc.documentElement.removeEventListener("pointerleave", onPointerLeave);
        doc.removeEventListener("visibilitychange", onVisibility);
        gl.deleteVertexArray(vao);
        gl.deleteProgram(shader.program);
        try {
          gl.getExtension("WEBGL_lose_context")?.loseContext();
        } catch {
        }
        canvas.remove();
      }
    };
    return instance;
  };

  // src/features/courses/reactbits/iridescence.ts
  var VERTEX8 = `#version 300 es
in vec2 aPosition;
out vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;
  var FRAGMENT5 = `#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform float uTime;
uniform vec3 uColor;
uniform vec2 uMouse;
uniform float uAmplitude;
uniform float uScale;
uniform float uRotation;
uniform int uDetail;
uniform float uWarp;
uniform float uHue;
uniform float uSaturation;
uniform float uBrightness;
uniform float uContrast;
uniform float uGrain;
uniform float uSeed;
uniform float uFade;
uniform float uOpacity;
uniform sampler2D uField;
uniform float uStir;
uniform vec3 uPointer;
uniform float uSheen;
uniform vec4 uSwirls[6];
in vec2 vUv;
out vec4 outColor;

vec3 hueRotate(vec3 c, float angle) {
  const vec3 k = vec3(0.57735027);
  float ca = cos(angle);
  return c * ca + cross(k, c) * sin(angle) + k * dot(k, c) * (1.0 - ca);
}

float smootherstep(float edge, float x) {
  float t = clamp(x / edge, 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

float hash(vec2 p) {
  p = fract(p * vec2(443.897, 441.423));
  p += dot(p, p.yx + 19.19);
  return fract((p.x + p.y) * p.x);
}

void main() {
  float mr = min(uResolution.x, uResolution.y);
  vec2 aspect = uResolution / mr;
  vec2 st = vUv - texture(uField, vUv).rg * uStir;

  for (int k = 0; k < 6; k++) {
    vec4 swirl = uSwirls[k];
    if (swirl.w == 0.0) continue;
    vec2 delta = (st - swirl.xy) * aspect;
    float angle = swirl.w * exp(-dot(delta, delta) / (swirl.z * swirl.z));
    float ca = cos(angle);
    float sa = sin(angle);
    st = swirl.xy + vec2(ca * delta.x - sa * delta.y, sa * delta.x + ca * delta.y) / aspect;
  }

  vec2 uv = (st * 2.0 - 1.0) * aspect;
  float c = cos(uRotation);
  float s = sin(uRotation);
  uv = mat2(c, -s, s, c) * uv / uScale;
  uv += (uMouse - vec2(0.5)) * uAmplitude;

  float d = -uTime * 0.5;
  float a = 0.0;
  for (int i = 0; i < 24; i++) {
    if (i >= uDetail) break;
    float fi = float(i);
    a += cos(fi - d - a * uv.x * uWarp);
    d += sin(uv.y * fi + a);
  }
  d += uTime * 0.5;
  vec3 col = vec3(cos(uv * vec2(d, a)) * 0.6 + 0.4, cos(a + d) * 0.5 + 0.5);
  col = cos(col * cos(vec3(d, a, 2.5)) * 0.5 + 0.5) * uColor;

  vec2 toPointer = (vUv - uPointer.xy) * aspect;
  col += col * uPointer.z * uSheen * 0.8 * exp(-dot(toPointer, toPointer) / 0.09);

  col = hueRotate(col, uHue);
  float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(luma), col, uSaturation);
  col = (col - 0.5) * uContrast + 0.5;
  col *= uBrightness;
  col += (hash(gl_FragCoord.xy + uSeed) - 0.5) * uGrain * 0.12;
  col = clamp(col, 0.0, 1.0);

  float alpha = uOpacity;
  if (uFade > 0.0) {
    vec2 px = vUv * uResolution;
    float edge = uFade * mr * 0.5;
    alpha *= smootherstep(edge, px.x) * smootherstep(edge, uResolution.x - px.x);
    alpha *= smootherstep(edge, px.y) * smootherstep(edge, uResolution.y - px.y);
  }
  outColor = vec4(col * alpha, alpha);
}`;
  var FIELD_COLUMNS = 48;
  var MAX_SWIRLS = 6;
  var SWIRL_LIFE = 3.2;
  var clamp10 = (value, min, max) => Math.min(max, Math.max(min, value));
  var compile10 = (gl, type, source) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
    gl.deleteShader(shader);
    return null;
  };
  var mountIridescence = (root) => {
    if (!canRunEffects(root)) return null;
    const win = windowOf(root);
    const doc = root.ownerDocument;
    if (!win) return null;
    const canvas = effectCanvas(root);
    const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false });
    if (!gl) return abortMount(canvas);
    const vertex2 = compile10(gl, gl.VERTEX_SHADER, VERTEX8);
    const fragment2 = compile10(gl, gl.FRAGMENT_SHADER, FRAGMENT5);
    const program = gl.createProgram();
    if (!vertex2 || !fragment2 || !program) {
      if (program) gl.deleteProgram(program);
      if (vertex2) gl.deleteShader(vertex2);
      if (fragment2) gl.deleteShader(fragment2);
      return abortMount(canvas);
    }
    gl.attachShader(program, vertex2);
    gl.attachShader(program, fragment2);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      gl.deleteShader(vertex2);
      gl.deleteShader(fragment2);
      return abortMount(canvas);
    }
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "aPosition");
    if (position < 0 || !buffer) {
      gl.deleteProgram(program);
      gl.deleteShader(vertex2);
      gl.deleteShader(fragment2);
      return abortMount(canvas);
    }
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const uniforms = {};
    for (const name of [
      "uResolution",
      "uTime",
      "uColor",
      "uMouse",
      "uAmplitude",
      "uScale",
      "uRotation",
      "uDetail",
      "uWarp",
      "uHue",
      "uSaturation",
      "uBrightness",
      "uContrast",
      "uGrain",
      "uSeed",
      "uFade",
      "uOpacity",
      "uField",
      "uStir",
      "uPointer",
      "uSheen",
      "uSwirls"
    ]) {
      uniforms[name] = gl.getUniformLocation(program, name);
    }
    const fieldTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, fieldTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform1i(uniforms.uField, 0);
    const reduce = win.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const pointer = { x: 0.5, y: 0.5, px: 0, py: 0, inside: false, tracked: false };
    const state = {
      width: 1,
      height: 1,
      phase: 0,
      mouse: [0.5, 0.5],
      presence: 0,
      color: [1, 1, 1],
      colorKey: "",
      cols: 0,
      rows: 0,
      field: new Float32Array(0),
      scratch: new Float32Array(0),
      fieldActive: false,
      swirls: [],
      seed: 0
    };
    const swirlData = new Float32Array(MAX_SWIRLS * 4);
    let raf = 0;
    let last = 0;
    let visible = true;
    let alive = true;
    const settings = {
      colorKey: "1,1,1",
      color: [1, 1, 1],
      speed: 1,
      amplitude: 0.1,
      mouseReact: true,
      scale: 1,
      detail: 8,
      rotation: 0,
      warp: 1,
      hueShift: 0,
      saturation: 1,
      brightness: 1.5,
      contrast: 1,
      stir: 0.5,
      sheen: 0.3,
      clickSwirl: true,
      grain: 0,
      fade: 0,
      opacity: 1,
      resolution: 1,
      paused: false
    };
    const resolveColor = () => {
      if (settings.colorKey === state.colorKey) return;
      state.colorKey = settings.colorKey;
      state.color = [0, 1, 2].map((i) => clamp10(Number(settings.color[i] ?? 1), 0, 1));
    };
    const layoutField = () => {
      const cols = FIELD_COLUMNS;
      const rows = clamp10(Math.round(cols * state.height / state.width), 6, 96);
      if (cols === state.cols && rows === state.rows) return;
      state.cols = cols;
      state.rows = rows;
      state.field = new Float32Array(cols * rows * 2);
      state.scratch = new Float32Array(cols * rows * 2);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, fieldTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG16F, cols, rows, 0, gl.RG, gl.FLOAT, state.field);
    };
    const brush = (x, y, dx, dy) => {
      const { cols, rows, field } = state;
      const radius = 0.22;
      const aspect = state.width / state.height;
      const fromCol = Math.max(0, Math.floor((x - radius / aspect) * cols));
      const toCol = Math.min(cols - 1, Math.ceil((x + radius / aspect) * cols));
      const fromRow = Math.max(0, Math.floor((y - radius) * rows));
      const toRow = Math.min(rows - 1, Math.ceil((y + radius) * rows));
      for (let row = fromRow; row <= toRow; row++) {
        for (let col = fromCol; col <= toCol; col++) {
          const ox = ((col + 0.5) / cols - x) * aspect;
          const oy = (row + 0.5) / rows - y;
          const t = 1 - (ox * ox + oy * oy) / (radius * radius);
          if (t <= 0) continue;
          const i = (row * cols + col) * 2;
          const px = field[i] + dx * t * t * 3.2;
          const py = field[i + 1] + dy * t * t * 3.2;
          const length3 = Math.hypot(px, py);
          const limit = 0.4;
          const k = length3 > 0 ? limit * Math.tanh(length3 / limit) / length3 : 0;
          field[i] = px * k;
          field[i + 1] = py * k;
        }
      }
      state.fieldActive = true;
    };
    const relaxField = (dt) => {
      const { cols, rows, field, scratch } = state;
      const decay = Math.exp(-dt * 1.4);
      let peak = 0;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const i = (row * cols + col) * 2;
          const l = (row * cols + Math.max(0, col - 1)) * 2;
          const r = (row * cols + Math.min(cols - 1, col + 1)) * 2;
          const u = (Math.max(0, row - 1) * cols + col) * 2;
          const b = (Math.min(rows - 1, row + 1) * cols + col) * 2;
          for (let c = 0; c < 2; c++) {
            const value = (field[i + c] * 12 + field[l + c] + field[r + c] + field[u + c] + field[b + c]) / 16;
            scratch[i + c] = value * decay;
            peak = Math.max(peak, Math.abs(scratch[i + c]));
          }
        }
      }
      field.set(scratch);
      if (peak < 4e-4) {
        field.fill(0);
        state.fieldActive = false;
      }
    };
    const render = () => {
      const s = settings;
      resolveColor();
      layoutField();
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, fieldTexture);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, state.cols, state.rows, gl.RG, gl.FLOAT, state.field);
      swirlData.fill(0);
      state.swirls.forEach((swirl, k) => {
        const radius = 0.21 * (1 + 0.4 * swirl.age);
        const ease = Math.exp(-swirl.age * 1.35) - Math.exp(-swirl.age * 10);
        const fade = Math.min(1, (SWIRL_LIFE - swirl.age) / 0.8);
        swirlData.set([swirl.x, swirl.y, radius, 3 * ease * fade * (0.21 / radius) ** 2], k * 4);
      });
      gl.uniform2f(uniforms.uResolution, state.width, state.height);
      gl.uniform1f(uniforms.uTime, state.phase);
      gl.uniform3f(uniforms.uColor, state.color[0], state.color[1], state.color[2]);
      gl.uniform2f(uniforms.uMouse, state.mouse[0], state.mouse[1]);
      gl.uniform1f(uniforms.uAmplitude, s.amplitude);
      gl.uniform1f(uniforms.uScale, s.scale);
      gl.uniform1f(uniforms.uRotation, s.rotation * Math.PI / 180);
      gl.uniform1i(uniforms.uDetail, s.detail);
      gl.uniform1f(uniforms.uWarp, s.warp);
      gl.uniform1f(uniforms.uHue, s.hueShift * Math.PI / 180);
      gl.uniform1f(uniforms.uSaturation, s.saturation);
      gl.uniform1f(uniforms.uBrightness, s.brightness);
      gl.uniform1f(uniforms.uContrast, s.contrast);
      gl.uniform1f(uniforms.uGrain, s.grain);
      gl.uniform1f(uniforms.uSeed, state.seed);
      gl.uniform1f(uniforms.uFade, s.fade);
      gl.uniform1f(uniforms.uOpacity, s.opacity);
      gl.uniform1f(uniforms.uStir, s.mouseReact ? s.stir : 0);
      gl.uniform3f(uniforms.uPointer, pointer.x, pointer.y, s.mouseReact ? state.presence : 0);
      gl.uniform1f(uniforms.uSheen, s.sheen);
      gl.uniform4fv(uniforms.uSwirls, swirlData);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const frame = (now) => {
      raf = 0;
      if (!alive || !visible) return;
      const s = settings;
      const dt = last ? Math.min(0.05, (now - last) / 1e3) : 1 / 60;
      last = now;
      const moving = !s.paused && !reduce;
      if (moving) state.phase += dt * s.speed;
      const target = s.mouseReact && pointer.tracked ? [pointer.x, pointer.y] : [0.5, 0.5];
      const follow = 1 - Math.exp(-dt * 5);
      state.mouse[0] += (target[0] - state.mouse[0]) * follow;
      state.mouse[1] += (target[1] - state.mouse[1]) * follow;
      state.presence += ((pointer.inside ? 1 : 0) - state.presence) * (1 - Math.exp(-dt * 4));
      if (state.fieldActive) relaxField(dt);
      state.swirls = state.swirls.filter((swirl) => (swirl.age += dt) < SWIRL_LIFE);
      if (s.grain > 0 && moving) state.seed = Math.floor(now / 42) % 997;
      render();
      const settling = Math.abs(target[0] - state.mouse[0]) > 5e-4 || Math.abs(target[1] - state.mouse[1]) > 5e-4 || Math.abs((pointer.inside ? 1 : 0) - state.presence) > 2e-3;
      if (moving || settling || state.fieldActive || state.swirls.length) raf = win.requestAnimationFrame(frame);
      else last = 0;
    };
    const wake = () => {
      if (raf || !alive || !visible) return;
      raf = win.requestAnimationFrame(frame);
    };
    const locate = (event) => {
      const rect = root.getBoundingClientRect();
      return {
        x: (event.clientX - rect.left) / Math.max(1, rect.width),
        y: 1 - (event.clientY - rect.top) / Math.max(1, rect.height)
      };
    };
    const onPointerMove = (event) => {
      const { x, y } = locate(event);
      const inside = x >= 0 && x <= 1 && y >= 0 && y <= 1;
      if (inside && settings.mouseReact && !reduce && pointer.inside && settings.stir > 0) {
        brush(x, y, x - pointer.x, y - pointer.y);
      }
      pointer.x = x;
      pointer.y = y;
      pointer.inside = inside;
      if (inside) pointer.tracked = true;
      wake();
    };
    const onPointerLeave = () => {
      pointer.inside = false;
      wake();
    };
    const onPointerDown = (event) => {
      if (!settings.clickSwirl || reduce) return;
      const { x, y } = locate(event);
      if (x < 0 || x > 1 || y < 0 || y > 1) return;
      if (state.swirls.length >= MAX_SWIRLS) {
        if (state.swirls[0].age < SWIRL_LIFE - 0.4) return;
        state.swirls.shift();
      }
      state.swirls.push({ x, y, age: 0 });
      wake();
    };
    const resize = () => {
      const dpr = pixelRatio(win) * settings.resolution;
      const size = fitCanvas(canvas, root, dpr);
      state.width = size.width;
      state.height = size.height;
      render();
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
          last = 0;
          wake();
        }
      });
      visibility.observe(root);
    }
    win.addEventListener("pointermove", onPointerMove, { passive: true });
    win.addEventListener("pointerdown", onPointerDown, { passive: true });
    doc.documentElement.addEventListener("pointerleave", onPointerLeave);
    resize();
    const instance = {
      destroy() {
        alive = false;
        if (raf) win.cancelAnimationFrame(raf);
        raf = 0;
        resizeObserver?.disconnect();
        visibility?.disconnect();
        if (onWindowResize) win.removeEventListener("resize", onWindowResize);
        win.removeEventListener("pointermove", onPointerMove);
        win.removeEventListener("pointerdown", onPointerDown);
        doc.documentElement.removeEventListener("pointerleave", onPointerLeave);
        if (fieldTexture) gl.deleteTexture(fieldTexture);
        if (buffer) gl.deleteBuffer(buffer);
        gl.deleteProgram(program);
        gl.deleteShader(vertex2);
        gl.deleteShader(fragment2);
        gl.getExtension("WEBGL_lose_context")?.loseContext();
        canvas.remove();
      }
    };
    return instance;
  };

  // src/features/courses/reactbits/letter-glitch.ts
  var DEFAULT_CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$&*()-_+=/[]{};:<>.,0123456789";
  var DEFAULT_FONT = "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, Consolas, 'Liberation Mono', monospace";
  var DARK_COLORS = ["#ffffff", "#61dca3"];
  var LIGHT_COLORS = ["#18181b", "#0f9f6e"];
  var MAX_COLORS3 = 8;
  var INTRO_SECONDS7 = 1.4;
  var REST_RATE = 0.2;
  var GLITCH_RATE = 0.1;
  var MAX_WALKERS = 48;
  var LIGHT_MODE = false;
  var VERTEX9 = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;
  var FRAGMENT6 = `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D uAtlas;
uniform sampler2D uState;
uniform ivec2 uCell;
uniform ivec2 uGrid;
uniform int uAtlasColumns;
uniform vec2 uResolution;
uniform vec2 uOrigin;
uniform vec3 uBase;
uniform float uBaseOpacity;
uniform vec3 uColors[8];
uniform float uEdge;
uniform float uCenter;
uniform vec2 uPointer;
uniform float uRadius;
uniform float uPresence;
uniform float uReveal;
uniform float uTime;
uniform float uFlow;
uniform float uFlowScale;
uniform vec4 uBackground;
out vec4 outColor;

float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 w = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, w.x), mix(c, d, w.x), w.y);
}

float smoother(float x) {
  x = clamp(x, 0.0, 1.0);
  return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
}

void main() {
  vec2 frag = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y) - uOrigin;
  ivec2 q = ivec2(floor(frag));
  ivec2 cell = q / uCell;
  vec4 color = vec4(0.0);
  if (all(greaterThanEqual(q, ivec2(0))) && all(lessThan(cell, uGrid))) {
    vec4 state = texelFetch(uState, cell, 0);
    int glyph = int(state.r * 255.0 + 0.5);
    ivec2 texel = ivec2(glyph % uAtlasColumns, glyph / uAtlasColumns) * uCell + (q - cell * uCell);
    float coverage = texelFetch(uAtlas, texel, 0).a;
    if (coverage > 0.0) {
      vec2 center = vec2(cell * uCell) + vec2(uCell) * 0.5 + uOrigin;
      float mask = 1.0;
      if (uEdge > 0.0) {
        vec2 edge = min(center, uResolution - center) / uEdge;
        mask = smoother(edge.x) * smoother(edge.y);
      }
      if (uCenter > 0.0) {
        vec2 room = max(abs(center - uResolution * 0.5) - uResolution * vec2(0.3, 0.24), 0.0);
        float soft = min(uResolution.x, uResolution.y) * 0.24;
        mask *= 1.0 - uCenter * (1.0 - smoother(length(room) / soft));
      }
      float seed = hash(vec2(cell) + 17.0);
      float rest = state.g * uBaseOpacity * (0.8 + 0.2 * sin(uTime * (0.5 + 1.2 * seed) + seed * 40.0));
      if (uFlow > 0.0) {
        vec2 p = center / uFlowScale;
        float n = 0.65 * noise(p + vec2(uTime * 0.05, uTime * 0.03)) + 0.35 * noise(p * 2.03 - vec2(uTime * 0.04, -uTime * 0.06));
        rest *= mix(1.0, 0.1 + 1.7 * smoothstep(0.25, 0.8, n), uFlow);
      }
      if (uPresence > 0.0) {
        float d = length(center - uPointer) / uRadius;
        float f = clamp(1.0 - d * d, 0.0, 1.0);
        rest = mix(rest, max(rest, uReveal * step(0.004, state.g)), f * f * uPresence);
      }
      float heat = state.b;
      rest = min(rest, 1.0) * (1.0 - heat);
      vec3 tint = uColors[int(state.a * 255.0 + 0.5)];
      float weight = coverage * mask;
      color = vec4((uBase * rest + tint * heat) * weight, (rest + heat) * weight);
    }
  }
  outColor = color + uBackground * (1.0 - color.a);
}`;
  var clamp11 = (value, min, max) => Math.min(max, Math.max(min, value));
  var smoother = (value) => {
    const x = clamp11(value, 0, 1);
    return x * x * x * (x * (x * 6 - 15) + 10);
  };
  var compile11 = (gl, type, source) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
    gl.deleteShader(shader);
    return null;
  };
  var link9 = (gl) => {
    const vertex2 = compile11(gl, gl.VERTEX_SHADER, VERTEX9);
    const fragment2 = compile11(gl, gl.FRAGMENT_SHADER, FRAGMENT6);
    const program = gl.createProgram();
    if (!vertex2 || !fragment2 || !program) {
      if (program) gl.deleteProgram(program);
      if (vertex2) gl.deleteShader(vertex2);
      if (fragment2) gl.deleteShader(fragment2);
      return null;
    }
    gl.attachShader(program, vertex2);
    gl.attachShader(program, fragment2);
    gl.linkProgram(program);
    gl.deleteShader(vertex2);
    gl.deleteShader(fragment2);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      return null;
    }
    const uniforms = {};
    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i++) {
      const info = gl.getActiveUniform(program, i);
      if (!info) continue;
      const name = info.name.replace(/\[0\]$/, "");
      uniforms[name] = gl.getUniformLocation(program, name);
    }
    return { program, uniforms };
  };
  var mountLetterGlitch = (root) => {
    if (!canRunEffects(root)) return null;
    const win = windowOf(root);
    const doc = root.ownerDocument;
    if (!win) return null;
    const canvas = effectCanvas(root);
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false
    });
    if (!gl) return abortMount(canvas);
    const program = link9(gl);
    if (!program) return abortMount(canvas);
    const u = program.uniforms;
    const vao = gl.createVertexArray();
    const makeTexture = () => {
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return texture;
    };
    const atlasTexture = makeTexture();
    const stateTexture = makeTexture();
    const maxSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    const atlas = doc.createElement("canvas");
    const atlasContext = atlas.getContext("2d");
    const probe = doc.createElement("canvas").getContext("2d", { willReadFrequently: true });
    if (!atlasContext || !vao || !atlasTexture || !stateTexture) {
      if (atlasTexture) gl.deleteTexture(atlasTexture);
      if (stateTexture) gl.deleteTexture(stateTexture);
      if (vao) gl.deleteVertexArray(vao);
      gl.deleteProgram(program.program);
      return abortMount(canvas);
    }
    const colorCache = /* @__PURE__ */ new Map();
    const parse = (value) => {
      const key = String(value);
      const cached = colorCache.get(key);
      if (cached) return cached;
      let rgb = [1, 1, 1];
      if (probe) {
        probe.clearRect(0, 0, 1, 1);
        probe.fillStyle = "#ffffff";
        probe.fillStyle = key;
        probe.fillRect(0, 0, 1, 1);
        const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
        rgb = [r / 255, g / 255, b / 255];
      }
      colorCache.set(key, rgb);
      return rgb;
    };
    const reduce = win.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const settings = {
      colors: (LIGHT_MODE ? LIGHT_COLORS : DARK_COLORS).slice(0, MAX_COLORS3),
      baseColor: LIGHT_MODE ? "#18181b" : "#ffffff",
      characters: DEFAULT_CHARACTERS,
      fontFamily: DEFAULT_FONT,
      fontSize: 14,
      spacing: 0.6,
      density: 0.9,
      baseOpacity: 0.16,
      glitchAmount: 0.5,
      speed: 1,
      smooth: true,
      interactive: true,
      cursorRadius: 140,
      clickEffect: "tear",
      flow: 0.5,
      edgeFade: 0,
      centerFade: 0,
      intro: true,
      backgroundColor: void 0
    };
    const view = { width: 1, height: 1, ratio: 1 };
    const grid = { cols: 0, rows: 0, cellW: 0, cellH: 0, originX: 0, originY: 0, atlasColumns: 1 };
    const pointer = { x: 0, y: 0, sx: 0, sy: 0, inside: false, presence: 0, stir: 0, fresh: true };
    const walkers = [];
    const palette2 = new Float32Array(MAX_COLORS3 * 3);
    const loadedFonts = /* @__PURE__ */ new Set();
    let pool = [0];
    let typeKey = "";
    let paletteKey = "";
    let colorCount = 1;
    let count = 0;
    let data = new Uint8Array(0);
    let heat = new Float32Array(0);
    let peak = new Float32Array(0);
    let hold = new Float32Array(0);
    let fade = new Float32Array(0);
    let wait = new Float32Array(0);
    let delay = new Float32Array(0);
    let luck = new Float32Array(0);
    let level = new Float32Array(0);
    let born = new Float32Array(0);
    let slot = new Int32Array(0);
    let active = new Int32Array(0);
    let activeCount = 0;
    let introLeft = settings.intro && !reduce;
    let clock = 0;
    let time = 0;
    let density = -1;
    let restCarry = 0;
    let glitchCarry = 0;
    let cursorCarry = 0;
    let dirty = true;
    let raf = 0;
    let last = 0;
    let visible = true;
    let alive = true;
    const randomGlyph = () => pool[Math.random() * pool.length | 0];
    const randomColor = () => Math.random() * colorCount | 0;
    const restValue = (i, appear = 1) => luck[i] < settings.density ? Math.round(level[i] * 255 * appear) : 0;
    const cellAt = (x, y) => {
      const c = Math.floor((x - grid.originX) / grid.cellW);
      const r = Math.floor((y - grid.originY) / grid.cellH);
      if (c < 0 || r < 0 || c >= grid.cols || r >= grid.rows) return -1;
      return r * grid.cols + c;
    };
    const ignite = (i, strength, holdTime, fadeTime, color, after = 0) => {
      if (slot[i] < 0) {
        slot[i] = activeCount;
        active[activeCount++] = i;
        heat[i] = 0;
        hold[i] = holdTime;
        peak[i] = strength;
        fade[i] = fadeTime;
        wait[i] = 0;
        delay[i] = after;
        data[i * 4 + 3] = color;
        return;
      }
      if (heat[i] < 0.15) data[i * 4 + 3] = color;
      peak[i] = hold[i] > 0 ? Math.max(peak[i], strength) : strength;
      hold[i] = Math.max(hold[i], holdTime);
      fade[i] = Math.max(fade[i], fadeTime);
      delay[i] = Math.min(delay[i], after);
    };
    const release = (k) => {
      const i = active[k];
      const moved = active[--activeCount];
      active[k] = moved;
      slot[moved] = k;
      slot[i] = -1;
      heat[i] = 0;
      data[i * 4 + 2] = 0;
    };
    const buildType = () => {
      const s = settings;
      const size = s.fontSize * view.ratio;
      const font = `${size}px ${s.fontFamily}`;
      const chars = Array.from(s.characters);
      const unique2 = Array.from(new Set(chars)).slice(0, 256);
      atlasContext.font = font;
      let advance = 1;
      unique2.forEach((char) => {
        advance = Math.max(advance, atlasContext.measureText(char).width);
      });
      const metrics = atlasContext.measureText("M");
      const cellW = Math.max(2, Math.ceil(advance + size * s.spacing));
      const cellH = Math.max(2, Math.ceil(size * (0.95 + s.spacing)));
      const columns = Math.max(1, Math.min(unique2.length, Math.floor(maxSize / cellW)));
      atlas.width = columns * cellW;
      atlas.height = Math.ceil(unique2.length / columns) * cellH;
      atlasContext.font = font;
      atlasContext.textAlign = "center";
      atlasContext.textBaseline = "alphabetic";
      atlasContext.fillStyle = "#ffffff";
      const baseline = cellH / 2 + (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2;
      unique2.forEach((char, i) => {
        atlasContext.fillText(char, i % columns * cellW + cellW / 2, Math.floor(i / columns) * cellH + baseline);
      });
      gl.bindTexture(gl.TEXTURE_2D, atlasTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas);
      const lookup = new Map(unique2.map((char, i) => [char, i]));
      const nextPool = chars.map((char) => lookup.get(char)).filter((index) => index !== void 0);
      const charsChanged = nextPool.length !== pool.length || nextPool.some((index, i) => index !== pool[i]);
      pool = nextPool.length ? nextPool : [0];
      const resized = cellW !== grid.cellW || cellH !== grid.cellH;
      grid.cellW = cellW;
      grid.cellH = cellH;
      grid.atlasColumns = columns;
      if (!loadedFonts.has(font) && doc.fonts?.load) {
        loadedFonts.add(font);
        doc.fonts.load(font, s.characters).then(() => {
          if (!alive) return;
          typeKey = "";
          wake();
        }).catch(() => {
        });
      }
      return { resized, charsChanged };
    };
    const birthTime = (c, r, cols, rows) => {
      const dx = (c + 0.5) / cols - 0.5;
      const dy = (r + 0.5) / rows - 0.5;
      const radial = Math.min(1, Math.hypot(dx, dy * 0.8) * 1.6);
      return INTRO_SECONDS7 * (0.3 * radial + 0.7 * Math.random() ** 1.3);
    };
    const buildGrid = () => {
      const cols = Math.ceil(canvas.width / grid.cellW) + 1;
      const rows = Math.ceil(canvas.height / grid.cellH) + 1;
      grid.originX = Math.floor((canvas.width - cols * grid.cellW) / 2);
      grid.originY = Math.floor((canvas.height - rows * grid.cellH) / 2);
      if (cols === grid.cols && rows === grid.rows) return;
      const n = cols * rows;
      const nextData = new Uint8Array(n * 4);
      const nextLuck = new Float32Array(n);
      const nextLevel = new Float32Array(n);
      const nextBorn = new Float32Array(n);
      const shiftC = Math.floor((grid.cols - cols) / 2);
      const shiftR = Math.floor((grid.rows - rows) / 2);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c;
          const oc = c + shiftC;
          const or = r + shiftR;
          if (oc >= 0 && or >= 0 && oc < grid.cols && or < grid.rows) {
            const j = or * grid.cols + oc;
            nextData[i * 4] = data[j * 4];
            nextData[i * 4 + 1] = data[j * 4 + 1];
            nextLuck[i] = luck[j];
            nextLevel[i] = level[j];
            nextBorn[i] = born[j];
          } else {
            nextData[i * 4] = randomGlyph();
            nextLuck[i] = Math.random();
            nextLevel[i] = 0.55 + 0.45 * Math.random();
            nextBorn[i] = introLeft ? birthTime(c, r, cols, rows) : -1;
          }
        }
      }
      grid.cols = cols;
      grid.rows = rows;
      count = n;
      data = nextData;
      luck = nextLuck;
      level = nextLevel;
      born = nextBorn;
      heat = new Float32Array(n);
      peak = new Float32Array(n);
      hold = new Float32Array(n);
      fade = new Float32Array(n);
      wait = new Float32Array(n);
      delay = new Float32Array(n);
      slot = new Int32Array(n).fill(-1);
      active = new Int32Array(n);
      activeCount = 0;
      walkers.length = 0;
      for (let i = 0; i < n; i++) data[i * 4 + 1] = born[i] >= 0 ? 0 : restValue(i);
      density = settings.density;
      gl.bindTexture(gl.TEXTURE_2D, stateTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, cols, rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
      dirty = false;
    };
    const syncType = () => {
      const s = settings;
      const key = `${s.fontSize * view.ratio}|${s.fontFamily}|${s.spacing}|${s.characters}`;
      if (key === typeKey) return;
      typeKey = key;
      const { resized, charsChanged } = buildType();
      if (resized || !grid.cols) buildGrid();
      if (charsChanged) {
        for (let i = 0; i < count; i++) data[i * 4] = randomGlyph();
        dirty = true;
      }
    };
    const syncPalette = () => {
      const s = settings;
      const key = s.colors.join(",");
      if (key === paletteKey) return;
      paletteKey = key;
      colorCount = Math.max(1, s.colors.length);
      for (let i = 0; i < MAX_COLORS3; i++) {
        const rgb = parse(s.colors[Math.min(i, colorCount - 1)] ?? "#ffffff");
        palette2[i * 3] = rgb[0];
        palette2[i * 3 + 1] = rgb[1];
        palette2[i * 3 + 2] = rgb[2];
      }
      for (let i = 0; i < count; i++) {
        if (data[i * 4 + 3] >= colorCount) data[i * 4 + 3] = randomColor();
      }
      dirty = true;
    };
    const addWalker = (walker) => {
      if (walkers.length >= MAX_WALKERS) return;
      walkers.push({
        x: walker.x,
        y: walker.y,
        angle: walker.angle,
        life: walker.life,
        span: walker.span,
        speed: walker.speed,
        carry: 0,
        after: walker.after ?? 0,
        wiggle: walker.wiggle ?? 0,
        branch: walker.branch ?? 0,
        color: walker.color
      });
    };
    const spawnTear = (x, y) => {
      const center = cellAt(x, y);
      if (center < 0) return;
      const r0 = Math.floor(center / grid.cols);
      const width = grid.cols * grid.cellW;
      for (let dr = -2; dr <= 2; dr++) {
        const r = r0 + dr;
        if (r < 0 || r >= grid.rows) continue;
        const weight = 1 - Math.abs(dr) / 3;
        if (dr !== 0 && Math.random() > 0.3 + 0.6 * weight) continue;
        const color = randomColor();
        const rowY = grid.originY + (r + 0.5) * grid.cellH;
        const shift = (Math.random() - 0.5) * 6 * grid.cellW * (1 - weight);
        [0, Math.PI].forEach((angle2) => {
          const life = width * (0.12 + 0.5 * weight * (0.4 + 0.6 * Math.random()));
          addWalker({
            x: x + shift,
            y: rowY,
            angle: angle2,
            life,
            span: life,
            speed: (2200 + Math.random() * 1200) * view.ratio,
            after: Math.abs(dr) * 0.035 + Math.random() * 0.03,
            color
          });
        });
      }
    };
    const spawnRays = (x, y) => {
      const reach = Math.min(view.width, view.height) * view.ratio;
      const rays = 5 + (Math.random() * 3 | 0);
      const turn = Math.random() * Math.PI * 2;
      for (let k = 0; k < rays; k++) {
        const life = reach * (0.25 + Math.random() * 0.3);
        addWalker({
          x,
          y,
          angle: turn + k / rays * Math.PI * 2 + (Math.random() - 0.5) * 0.4,
          life,
          span: life,
          speed: (700 + Math.random() * 400) * view.ratio,
          wiggle: 0.2,
          branch: 0.03,
          color: randomColor()
        });
      }
    };
    const spawnBurst = (x, y) => {
      const center = cellAt(x, y);
      if (center < 0) return;
      ignite(center, 1, 0.08, 0.8, randomColor());
      if (settings.clickEffect === "burst") spawnRays(x, y);
      else spawnTear(x, y);
    };
    const stepWalkers = (dt) => {
      for (let k = walkers.length - 1; k >= 0; k--) {
        const w = walkers[k];
        if (w.after > 0) {
          w.after -= dt;
          continue;
        }
        const step = Math.max(
          1,
          Math.abs(Math.cos(w.angle)) * grid.cellW + Math.abs(Math.sin(w.angle)) * grid.cellH * 0.6
        );
        w.carry += w.speed * dt;
        while (w.carry >= step && w.life > 0) {
          w.carry -= step;
          w.life -= step;
          w.angle += (Math.random() - 0.5) * w.wiggle;
          w.x += Math.cos(w.angle) * step;
          w.y += Math.sin(w.angle) * step;
          const i = cellAt(w.x, w.y);
          if (i < 0) {
            w.life = 0;
            break;
          }
          const left = w.life / w.span;
          ignite(i, 0.5 + 0.5 * left, 0.03 + Math.random() * 0.05, 0.5 + 0.5 * left, w.color);
          if (w.branch && Math.random() < w.branch) {
            const side = Math.random() < 0.5 ? -1 : 1;
            const life = w.life * (0.45 + Math.random() * 0.3);
            addWalker({
              x: w.x,
              y: w.y,
              angle: w.angle + side * (0.5 + Math.random() * 0.5),
              life,
              span: w.span,
              speed: w.speed,
              wiggle: w.wiggle,
              color: w.color
            });
          }
        }
        if (w.life <= 0) walkers.splice(k, 1);
      }
    };
    const ambient = (dt) => {
      const s = settings;
      if (reduce || s.speed <= 0 || !count) return;
      restCarry += count * REST_RATE * s.speed * dt;
      let changes = Math.min(count, restCarry | 0);
      restCarry -= changes;
      while (changes-- > 0) {
        const i = Math.random() * count | 0;
        if (slot[i] < 0) {
          data[i * 4] = randomGlyph();
          dirty = true;
        }
      }
      const tempo = Math.max(s.speed, 0.2);
      glitchCarry += count * s.glitchAmount ** 1.6 * GLITCH_RATE * s.speed * dt;
      let events = Math.min(count, glitchCarry | 0);
      glitchCarry -= events;
      while (events-- > 0) {
        const i = Math.random() * count | 0;
        const color = randomColor();
        const strength = 0.45 + 0.55 * Math.random();
        const holdTime = (0.04 + Math.random() * 0.26) / tempo;
        const fadeTime = (0.45 + Math.random() * 0.6) / tempo;
        const roll = Math.random();
        if (roll < 0.24) {
          const c = i % grid.cols;
          const long = roll < 0.015;
          const length3 = Math.min(
            grid.cols - c,
            long ? 10 + (Math.random() * 24 | 0) : 2 + (Math.random() * 7 | 0)
          );
          const pace = (long ? 0.012 : 0.028) / tempo;
          for (let k = 0; k < length3; k++) ignite(i + k, strength, holdTime, fadeTime, color, k * pace);
        } else {
          ignite(i, strength, holdTime, fadeTime, color);
        }
      }
    };
    const excite = (dt) => {
      const s = settings;
      if (pointer.presence < 0.02 || reduce || !count) return;
      const radius = s.cursorRadius * view.ratio;
      if (radius < 1) return;
      const c0 = Math.max(0, Math.floor((pointer.sx - radius - grid.originX) / grid.cellW));
      const c1 = Math.min(grid.cols - 1, Math.floor((pointer.sx + radius - grid.originX) / grid.cellW));
      const r0 = Math.max(0, Math.floor((pointer.sy - radius - grid.originY) / grid.cellH));
      const r1 = Math.min(grid.rows - 1, Math.floor((pointer.sy + radius - grid.originY) / grid.cellH));
      const chance = pointer.presence * (3 + 9 * pointer.stir) * dt;
      for (let r = r0; r <= r1; r++) {
        const dy = (grid.originY + (r + 0.5) * grid.cellH - pointer.sy) / radius;
        for (let c = c0; c <= c1; c++) {
          const dx = (grid.originX + (c + 0.5) * grid.cellW - pointer.sx) / radius;
          const d = dx * dx + dy * dy;
          if (d >= 1) continue;
          const i = r * grid.cols + c;
          if (slot[i] < 0 && Math.random() < (1 - d) * (1 - d) * chance) {
            data[i * 4] = randomGlyph();
            dirty = true;
          }
        }
      }
      const cells = Math.PI * radius * radius / (grid.cellW * grid.cellH);
      cursorCarry += cells * pointer.presence * (0.15 + 4 * pointer.stir) * dt;
      let sparks = Math.min(512, cursorCarry | 0);
      cursorCarry -= sparks;
      while (sparks-- > 0) {
        const angle2 = Math.random() * Math.PI * 2;
        const distance2 = Math.sqrt(Math.random());
        const falloff = (1 - distance2 * distance2) ** 2;
        if (Math.random() > falloff) continue;
        const i = cellAt(
          pointer.sx + Math.cos(angle2) * distance2 * radius,
          pointer.sy + Math.sin(angle2) * distance2 * radius
        );
        if (i < 0) continue;
        ignite(
          i,
          (0.3 + 0.7 * Math.random()) * (0.45 + 0.55 * pointer.stir),
          0.02 + Math.random() * 0.08,
          0.35 + Math.random() * 0.4,
          randomColor()
        );
      }
    };
    const settle = (dt) => {
      const s = settings;
      const tempo = Math.max(s.speed, 0.5);
      const attack = 1 - Math.exp(-dt / 0.05);
      for (let k = 0; k < activeCount; ) {
        const i = active[k];
        if (delay[i] > 0) {
          delay[i] -= dt;
          k++;
          continue;
        }
        let h = heat[i];
        if (hold[i] > 0) {
          hold[i] -= dt;
          h = s.smooth ? h + (peak[i] - h) * attack : peak[i];
        } else {
          h = s.smooth ? h * Math.exp(-dt * 4 / Math.max(fade[i], 0.05)) : 0;
        }
        if (h < 0.012 && hold[i] <= 0) {
          release(k);
          dirty = true;
          continue;
        }
        heat[i] = h;
        wait[i] -= dt;
        if (wait[i] <= 0) {
          data[i * 4] = randomGlyph();
          wait[i] = (0.045 + 0.45 * (1 - h) * (1 - h)) * (0.6 + 0.8 * Math.random()) / tempo;
        }
        data[i * 4 + 2] = Math.round(h * 255);
        dirty = true;
        k++;
      }
    };
    const reveal = (dt) => {
      if (!introLeft) return;
      const s = settings;
      let pending = false;
      for (let i = 0; i < count; i++) {
        const t = born[i];
        if (t < 0) continue;
        const age = clock - t;
        if (age < 0) {
          pending = true;
          continue;
        }
        if (age < dt && Math.random() < (luck[i] < s.density ? 0.45 : 0.12)) {
          ignite(i, 0.4 + 0.5 * Math.random(), 0.02, 0.35 + Math.random() * 0.35, randomColor());
        }
        const appear = s.smooth ? smoother(age / 0.35) : 1;
        data[i * 4 + 1] = restValue(i, appear);
        if (appear >= 1) born[i] = -1;
        else pending = true;
      }
      dirty = true;
      if (!pending) introLeft = false;
    };
    const frame = (now) => {
      raf = 0;
      if (!alive || !visible || doc.hidden) return;
      const s = settings;
      const dt = last ? clamp11((now - last) / 1e3, 5e-4, 0.05) : 1 / 60;
      last = now;
      clock += dt;
      if (!reduce) time += dt * s.speed;
      syncType();
      syncPalette();
      if (s.density !== density) {
        density = s.density;
        for (let i = 0; i < count; i++) if (born[i] < 0) data[i * 4 + 1] = restValue(i);
        dirty = true;
      }
      const goal = s.interactive && pointer.inside && !reduce ? 1 : 0;
      pointer.presence += (goal - pointer.presence) * (1 - Math.exp(-dt / 0.25));
      if (Math.abs(goal - pointer.presence) < 2e-3) pointer.presence = goal;
      const px = pointer.sx;
      const py = pointer.sy;
      const follow = 1 - Math.exp(-dt / 0.07);
      pointer.sx += (pointer.x - pointer.sx) * follow;
      pointer.sy += (pointer.y - pointer.sy) * follow;
      const moved = Math.hypot(pointer.sx - px, pointer.sy - py) / view.ratio / dt;
      pointer.stir += (clamp11(moved / 1400, 0, 1) - pointer.stir) * (1 - Math.exp(-dt / 0.12));
      if (pointer.stir < 1e-3) pointer.stir = 0;
      reveal(dt);
      ambient(dt);
      excite(dt);
      stepWalkers(dt);
      settle(dt);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.disable(gl.BLEND);
      gl.useProgram(program.program);
      gl.bindVertexArray(vao);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, stateTexture);
      if (dirty) {
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, grid.cols, grid.rows, gl.RGBA, gl.UNSIGNED_BYTE, data);
        dirty = false;
      }
      gl.uniform1i(u.uState, 1);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, atlasTexture);
      gl.uniform1i(u.uAtlas, 0);
      gl.uniform2i(u.uCell, grid.cellW, grid.cellH);
      gl.uniform2i(u.uGrid, grid.cols, grid.rows);
      gl.uniform1i(u.uAtlasColumns, grid.atlasColumns);
      gl.uniform2f(u.uResolution, canvas.width, canvas.height);
      gl.uniform2f(u.uOrigin, grid.originX, grid.originY);
      gl.uniform3fv(u.uBase, parse(s.baseColor));
      gl.uniform1f(u.uBaseOpacity, s.baseOpacity);
      gl.uniform3fv(u.uColors, palette2);
      gl.uniform1f(u.uEdge, s.edgeFade * Math.min(canvas.width, canvas.height));
      gl.uniform1f(u.uCenter, s.centerFade);
      gl.uniform2f(u.uPointer, pointer.sx, pointer.sy);
      gl.uniform1f(u.uRadius, Math.max(1, s.cursorRadius * view.ratio));
      gl.uniform1f(u.uPresence, pointer.presence);
      gl.uniform1f(u.uReveal, Math.min(1, s.baseOpacity * 3.5));
      gl.uniform1f(u.uTime, time);
      gl.uniform1f(u.uFlow, s.flow);
      gl.uniform1f(u.uFlowScale, Math.max(canvas.width, canvas.height) * 0.32);
      if (s.backgroundColor) {
        const [r, g, b] = parse(s.backgroundColor);
        gl.uniform4f(u.uBackground, r, g, b, 1);
      } else {
        gl.uniform4f(u.uBackground, 0, 0, 0, 0);
      }
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      const busy = !reduce && s.speed > 0 || activeCount > 0 || walkers.length > 0 || introLeft || pointer.presence !== 0 && pointer.presence !== 1 || pointer.stir > 0;
      if (busy) raf = win.requestAnimationFrame(frame);
      else last = 0;
    };
    const wake = () => {
      if (!alive || raf || !visible || doc.hidden) return;
      raf = win.requestAnimationFrame(frame);
    };
    const resize = () => {
      if (!alive) return;
      view.ratio = pixelRatio(win);
      const size = fitCanvas(canvas, root, view.ratio);
      view.width = size.width;
      view.height = size.height;
      syncType();
      if (grid.cols) buildGrid();
      wake();
    };
    const locate = (event) => {
      const rect = root.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      pointer.inside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
      pointer.x = x * view.ratio;
      pointer.y = y * view.ratio;
      if (pointer.fresh || pointer.presence < 0.02) {
        pointer.sx = pointer.x;
        pointer.sy = pointer.y;
        pointer.fresh = false;
      }
    };
    const onPointerMove = (event) => {
      locate(event);
      wake();
    };
    const onPointerDown = (event) => {
      locate(event);
      const s = settings;
      if (!pointer.inside || s.clickEffect === "none" || reduce || !count) return;
      spawnBurst(pointer.x, pointer.y);
      wake();
    };
    const onPointerUp = (event) => {
      if (event.pointerType !== "mouse") pointer.inside = false;
    };
    const onPointerLeave = () => {
      pointer.inside = false;
      wake();
    };
    const onVisibility = () => {
      last = 0;
      wake();
    };
    const onFonts = () => {
      typeKey = "";
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
          last = 0;
          wake();
        }
      });
      visibility.observe(root);
    }
    win.addEventListener("pointermove", onPointerMove, { passive: true });
    win.addEventListener("pointerdown", onPointerDown, { passive: true });
    win.addEventListener("pointerup", onPointerUp, { passive: true });
    win.addEventListener("pointercancel", onPointerUp, { passive: true });
    doc.documentElement.addEventListener("pointerleave", onPointerLeave);
    doc.addEventListener("visibilitychange", onVisibility);
    doc.fonts?.addEventListener?.("loadingdone", onFonts);
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
        win.removeEventListener("pointerdown", onPointerDown);
        win.removeEventListener("pointerup", onPointerUp);
        win.removeEventListener("pointercancel", onPointerUp);
        doc.documentElement.removeEventListener("pointerleave", onPointerLeave);
        doc.removeEventListener("visibilitychange", onVisibility);
        doc.fonts?.removeEventListener?.("loadingdone", onFonts);
        gl.deleteTexture(atlasTexture);
        gl.deleteTexture(stateTexture);
        gl.deleteVertexArray(vao);
        gl.deleteProgram(program.program);
        try {
          gl.getExtension("WEBGL_lose_context")?.loseContext();
        } catch {
        }
        canvas.remove();
      }
    };
    return instance;
  };

  // src/features/courses/reactbits/strands.ts
  var MAX_STRANDS = 12;
  var MAX_COLORS4 = 8;
  var VERT = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;
  var FRAG = `#version 300 es
precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec3 uColors[${MAX_COLORS4}];
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
  var GLASS_FRAG = `#version 300 es
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
  var buildPalette = (colors) => {
    const filled = colors && colors.length ? colors : ["#ffffff"];
    const padded = [];
    for (let i = 0; i < MAX_COLORS4; i++) {
      const hex = filled[i] ?? filled[filled.length - 1];
      const c = new Color(hex);
      padded.push([c.r, c.g, c.b]);
    }
    return padded;
  };
  var mountStrands = (root) => {
    if (!canRunEffects(root)) return null;
    const win = windowOf(root);
    const doc = root.ownerDocument;
    if (!win) return null;
    const settings = {
      colors: ["#FF4242", "#7C3AED", "#06B6D4", "#EAB308"],
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
    let renderer;
    try {
      renderer = new Renderer({
        canvas: doc.createElement("canvas"),
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
    canvas.style.backgroundColor = "transparent";
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.position = "absolute";
    canvas.style.inset = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    canvas.style.pointerEvents = "none";
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
        uColorCount: { value: Math.min(settings.colors.length, MAX_COLORS4) },
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
    const resize = () => {
      const width = root.offsetWidth;
      const height = root.offsetHeight;
      renderer.setSize(width, height);
      program.uniforms.uResolution.value = [width, height];
      renderTarget.setSize(width, height);
      glassProgram.uniforms.uResolution.value = [width, height];
    };
    win.addEventListener("resize", resize);
    resize();
    const update = (t) => {
      if (!alive) return;
      raf = win.requestAnimationFrame(update);
      program.uniforms.uTime.value = t * 1e-3;
      program.uniforms.uColors.value = buildPalette(settings.colors);
      program.uniforms.uColorCount.value = Math.min(settings.colors.length, MAX_COLORS4);
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
    const instance = {
      destroy() {
        alive = false;
        if (raf) win.cancelAnimationFrame(raf);
        raf = 0;
        win.removeEventListener("resize", resize);
        canvas.remove();
        try {
          gl.getExtension("WEBGL_lose_context")?.loseContext();
        } catch {
        }
      }
    };
    return instance;
  };

  // src/features/courses/reactbits/index.ts
  var REACTBITS_EFFECTS = {
    ether: mountLiquidEther,
    pixel: mountPixelBlast,
    "micro-slats": mountMicroSlats,
    "ghost-fibres": mountGhostFibres,
    "crt-warp": mountCrtWarp,
    scanner: mountScanner,
    "light-fall": mountLightFall,
    ferrofluid: mountFerrofluid,
    "line-waves": mountLineWaves,
    radar: mountRadar,
    "magic-rings": mountMagicRings,
    "floating-lines": mountFloatingLines,
    "grid-scan": mountGridScan,
    "gradient-blinds": mountGradientBlinds,
    iridescence: mountIridescence,
    "letter-glitch": mountLetterGlitch,
    strands: mountStrands
  };

  // src/shared/messages.ts
  var QUEST_ORIGIN = "https://quest.cns.utexas.edu";
  function isStudentPage(value) {
    try {
      const url2 = new URL(value);
      return url2.origin === QUEST_ORIGIN && (url2.pathname === "/student" || url2.pathname.startsWith("/student/"));
    } catch {
      return false;
    }
  }

  // src/shared/identity.ts
  function segment(value) {
    if (!value.trim()) throw new Error("A verified Quest source identifier is required.");
    return encodeURIComponent(value);
  }
  var courseId = (sourceId) => `course:${segment(sourceId)}`;
  var assignmentId = (course, sourceId) => `${course}/assignment:${segment(sourceId)}`;
  var questionId = (assignment, sourceId) => `${assignment}/question:${segment(sourceId)}`;
  function sourceUrl(value, base) {
    const url2 = new URL(value, base);
    if (!isStudentPage(url2.href) || url2.username || url2.password) throw new Error("Expected a Quest student source URL.");
    return url2.href;
  }

  // src/adapters/quest/homepage.ts
  function departmentFromCourseCode(courseCode) {
    const prefix = courseCode.toUpperCase().match(/^\s*([A-Z][A-Z\s]{0,7}?)\s*\d/);
    return (prefix?.[1] || courseCode.match(/[A-Za-z]+/)?.[0] || "UT").replace(/\s+/g, "").slice(0, 5) || "UT";
  }

  // src/features/courses/course-codes.ts
  var STORAGE_KEY = "betterquest:course-codes";
  var MAX_ENTRIES = 40;
  var memory = /* @__PURE__ */ new Map();
  function session() {
    try {
      return globalThis.sessionStorage ?? null;
    } catch {
      return null;
    }
  }
  function load() {
    const store = session();
    if (!store || memory.size) return;
    try {
      const raw = store.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return;
      for (const [key, value] of Object.entries(parsed)) {
        const entry = value;
        if (entry && typeof entry.code === "string" && typeof entry.departmentCode === "string") {
          memory.set(key, { code: entry.code, departmentCode: entry.departmentCode, unique: typeof entry.unique === "string" ? entry.unique : "" });
        }
      }
    } catch {
    }
  }
  function persist() {
    const store = session();
    if (!store) return;
    try {
      store.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(memory)));
    } catch {
    }
  }
  function rememberCourseCodes(rows) {
    let changed = false;
    for (const row of rows) {
      if (!row.courseParam) continue;
      const entry = { code: row.courseCode, departmentCode: row.departmentCode, unique: row.courseUnique };
      const existing = memory.get(row.courseParam);
      if (existing && existing.code === entry.code && existing.departmentCode === entry.departmentCode && existing.unique === entry.unique) continue;
      memory.delete(row.courseParam);
      memory.set(row.courseParam, entry);
      changed = true;
    }
    while (memory.size > MAX_ENTRIES) {
      const oldest = memory.keys().next().value;
      if (oldest === void 0) break;
      memory.delete(oldest);
      changed = true;
    }
    if (changed) persist();
  }
  function lookupCourseCode(document2) {
    let param = null;
    try {
      const url2 = new URL(document2.URL);
      if (!url2.pathname.endsWith("/courses/show")) return null;
      param = url2.searchParams.get("course");
    } catch {
      return null;
    }
    if (!param) return null;
    load();
    return memory.get(param) || null;
  }

  // src/features/courses/hero.ts
  var HOST_SELECTOR = '[data-betterquest="course-hero"]';
  var STYLE_SELECTOR = '[data-betterquest="course-hero-style"]';
  var observers = /* @__PURE__ */ new WeakMap();
  var fxInstances = /* @__PURE__ */ new WeakMap();
  function animationsDisabled(document2) {
    return document2.documentElement.dataset.betterquestAnimations === "disabled";
  }
  function syncAnimations(host, document2) {
    const disabled = animationsDisabled(document2);
    const hero = host.shadowRoot?.querySelector(".hero");
    if (disabled) {
      host.setAttribute("data-animations", "disabled");
      hero?.classList.add("is-disabled");
    } else {
      host.removeAttribute("data-animations");
      hero?.classList.remove("is-disabled");
    }
    syncFx(host, document2);
  }
  function destroyFx(host) {
    const instance = fxInstances.get(host);
    if (instance) {
      instance.destroy();
      fxInstances.delete(host);
    }
  }
  function syncFx(host, document2) {
    const layer = host.shadowRoot?.querySelector(".fx-layer");
    const artBg = host.shadowRoot?.querySelector(".art-bg");
    if (!layer || !artBg) return;
    if (animationsDisabled(document2)) {
      if (fxInstances.has(host)) {
        destroyFx(host);
        artBg.style.removeProperty("display");
      }
      return;
    }
    if (fxInstances.has(host)) return;
    const mount = REACTBITS_EFFECTS[layer.dataset.fx];
    if (!mount) return;
    let instance = null;
    try {
      instance = mount(layer);
    } catch {
      instance = null;
    }
    if (instance) {
      fxInstances.set(host, instance);
      artBg.style.display = "none";
    }
  }
  function syncToggleChrome(document2, mounted) {
    let style = document2.querySelector(STYLE_SELECTOR);
    if (!mounted) {
      style?.remove();
      return;
    }
    if (!style) {
      style = document2.createElement("style");
      style.setAttribute("data-betterquest", "course-hero-style");
      style.textContent = `
      .card > .card-header:has(> button[data-target="#student-course-info-header"]) { display: none !important; }
      [data-betterquest="course-hero"] {
        display: block !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        border: 0 !important;
        border-top-left-radius: inherit !important;
        border-top-right-radius: inherit !important;
        overflow: hidden !important;
        box-sizing: border-box !important;
      }
      /* Inside the course card the art layer fills the whole card, not just
         the top banner; without a card wrapper it stays the in-flow banner. */
      .card:has(> [data-betterquest="course-hero"]) {
        position: relative !important;
        overflow: hidden !important;
        border-radius: 10px !important;
        /* Reserve the top strip the banner copy (code, name, unique) sits in. */
        padding-top: 80px !important;
      }
      .card:has(> [data-betterquest="course-hero"]) > [data-betterquest="course-hero"] {
        position: absolute !important;
        inset: 0 !important;
        z-index: 0 !important;
        width: auto !important;
        height: auto !important;
        pointer-events: none !important;
      }
      /* The art is a positioned layer, so everything else the card holds has to
         stack above it to stay readable, clickable, and above the backdrop. */
      .card:has(> [data-betterquest="course-hero"]) > *:not([data-betterquest="course-hero"]) {
        position: relative !important;
        z-index: 1 !important;
      }
    `;
      document2.head.append(style);
    }
  }
  function renderHero(host, document2, identity4) {
    const [deep, bright, paper] = palette(identity4.departmentCode);
    const solid = solidColor(identity4.departmentCode);
    const mood = courseArtMood(courseArtKey({ code: identity4.code, unique: identity4.unique, departmentCode: identity4.departmentCode }));
    const shadow = host.shadowRoot || host.attachShadow({ mode: "open" });
    const style = document2.createElement("style");
    style.textContent = `
    *, *::before, *::after { box-sizing: border-box; }
    :host {
      display: block;
      width: 100%;
      margin: 0;
      padding: 0;
      border-top-left-radius: 10px;
      border-top-right-radius: 10px;
      overflow: hidden;
      box-sizing: border-box;
    }
    .hero {
      position: relative;
      isolation: isolate;
      display: flex;
      align-items: flex-start;
      width: 100%;
      /* Fills the host: a full-card host when the art is pinned to the card,
         a 118px banner when the host sits in the flow with no card behind it. */
      height: 100%;
      min-height: 118px;
      overflow: hidden;
      box-sizing: border-box;
      padding: 16px 20px;
      background: ${solid};
      color: #fff;
      text-align: left;
      border-top-left-radius: inherit;
      border-top-right-radius: inherit;
    }
    :host([data-animations="disabled"]) .hero,
    :host-context([data-betterquest-animations="disabled"]) .hero,
    .hero.is-disabled {
      background: ${solid} !important;
    }
    :host([data-animations="disabled"]) .art-bg,
    :host([data-animations="disabled"]) .fx-layer,
    :host-context([data-betterquest-animations="disabled"]) .art-bg,
    :host-context([data-betterquest-animations="disabled"]) .fx-layer,
    .hero.is-disabled .art-bg,
    .hero.is-disabled .fx-layer {
      display: none !important;
    }
    .fx-layer {
      position: absolute;
      top: -45%;
      left: -45%;
      width: 190%;
      height: 190%;
      z-index: 1;
      overflow: hidden;
      pointer-events: none;
      filter: hue-rotate(var(--fx-hue, 0deg));
    }
    .vignette {
      position: absolute;
      inset: 0;
      z-index: 2;
      background: linear-gradient(to bottom, rgba(6, 8, 12, 0.88) 0%, rgba(6, 8, 12, 0.44) 30%, rgba(6, 8, 12, 0.14) 58%, rgba(6, 8, 12, 0.30) 100%);
      pointer-events: none;
    }
    .copy {
      position: relative;
      z-index: 3;
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 16px;
      width: 100%;
      min-width: 0;
      box-sizing: border-box;
      text-shadow: 0 1px 4px rgba(0, 0, 0, 0.9), 0 2px 10px rgba(0, 0, 0, 0.55);
    }
    .titles { min-width: 0; }
    .code {
      display: block;
      font: 850 30px/0.95 ui-rounded, 'Avenir Next', -apple-system, sans-serif;
      letter-spacing: -0.03em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .name {
      display: block;
      margin-top: 5px;
      font: 650 12px/1.25 ui-rounded, 'Avenir Next', -apple-system, sans-serif;
      letter-spacing: 0.02em;
      color: rgba(255, 255, 255, 0.88);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 62ch;
    }
    .unique {
      flex-shrink: 0;
      font: 850 28px/0.95 ui-rounded, 'Avenir Next', -apple-system, sans-serif;
      letter-spacing: -0.02em;
      color: rgba(255, 255, 255, 0.95);
      white-space: nowrap;
      text-shadow: inherit;
    }
  ` + COURSE_EFFECT_CSS;
    const hero = document2.createElement("div");
    hero.className = "hero";
    hero.style.setProperty("--fx-deep", deep);
    hero.style.setProperty("--fx-bright", bright);
    hero.style.setProperty("--fx-paper", paper);
    hero.style.setProperty("--fx-solid", solid);
    hero.style.setProperty("--fx-hue", `${mood.hue}deg`);
    hero.style.setProperty("--fx-delay", `${mood.delay}s`);
    const artBg = document2.createElement("span");
    artBg.className = `art-bg fx-${identity4.fx}`;
    const fxLayer = document2.createElement("div");
    fxLayer.className = "fx-layer";
    fxLayer.dataset.fx = identity4.fx;
    const vignette = document2.createElement("span");
    vignette.className = "vignette";
    const copy6 = document2.createElement("div");
    copy6.className = "copy";
    const titles = document2.createElement("div");
    titles.className = "titles";
    const code = document2.createElement("span");
    code.className = "code";
    code.textContent = identity4.code;
    const name = document2.createElement("span");
    name.className = "name";
    name.textContent = identity4.name;
    const unique2 = document2.createElement("span");
    unique2.className = "unique";
    unique2.textContent = identity4.unique;
    titles.append(code, name);
    copy6.append(titles, unique2);
    hero.append(artBg, fxLayer, vignette, copy6);
    shadow.replaceChildren(style, hero);
  }
  function enhanceCourseHero(root) {
    const document2 = root.ownerDocument;
    const infoHeader = root.querySelector("#student-course-info-header") || (root.id === "student-course-info-header" ? root : null);
    if (!infoHeader) {
      removeHero(document2);
      return;
    }
    const anchor = infoHeader.closest(".card") || infoHeader.parentElement;
    if (!anchor) {
      removeHero(document2);
      return;
    }
    const title = anchor.querySelector('button[data-target="#student-course-info-header"] .h4');
    const raw = (title?.textContent || "").replace(/\s+/g, " ").trim();
    const unique2 = raw.match(/\((\d+)\)\s*$/)?.[1];
    const name = raw.replace(/\s*\(\d+\)\s*$/, "").trim();
    if (!unique2 || !name) {
      removeHero(document2);
      return;
    }
    const known = lookupCourseCode(document2);
    const departmentCode = known?.departmentCode || departmentFromCourseCode(known?.code || "");
    const compactCode = known ? known.code.replace(/\s+/g, "").toUpperCase() : "";
    const artKey = courseArtKey({ code: compactCode, unique: unique2, departmentCode });
    const fx = courseEffect(artKey);
    const key = `${compactCode}|${name}|${unique2}|${fx}`;
    let host = anchor.querySelector(HOST_SELECTOR);
    if (!host) {
      host = document2.createElement("div");
      host.setAttribute("data-betterquest", "course-hero");
      host.setAttribute("role", "img");
      anchor.prepend(host);
      const Observer = document2.defaultView?.MutationObserver;
      if (Observer) {
        const observer = new Observer(() => syncAnimations(host, document2));
        observer.observe(document2.documentElement, { attributes: true, attributeFilter: ["data-betterquest-animations"] });
        observers.set(host, observer);
      }
    } else if (host.dataset.betterquestKey === key) {
      syncToggleChrome(document2, true);
      syncAnimations(host, document2);
      return;
    }
    host.dataset.betterquestKey = key;
    host.setAttribute("aria-label", `${name} course banner${compactCode ? `, course ${compactCode}` : ""}`);
    destroyFx(host);
    renderHero(host, document2, { code: compactCode, name, unique: unique2, fx, departmentCode });
    syncToggleChrome(document2, true);
    syncAnimations(host, document2);
  }
  function removeHero(document2) {
    const host = document2.querySelector(HOST_SELECTOR);
    if (host) {
      destroyFx(host);
      observers.get(host)?.disconnect();
      observers.delete(host);
      host.remove();
    }
    syncToggleChrome(document2, false);
  }

  // src/features/courses/meeting-times.ts
  function parseDayTokens(rawDays) {
    const normalized = rawDays.toUpperCase().trim();
    const dayRegex = /(TH|SU|M|T|W|F|S)/g;
    const matches = normalized.match(dayRegex);
    if (!matches) return [rawDays];
    const map = {
      M: "Monday",
      T: "Tuesday",
      W: "Wednesday",
      TH: "Thursday",
      F: "Friday",
      S: "Saturday",
      SU: "Sunday"
    };
    return matches.map((m) => map[m] || m);
  }
  function parseClockTime(raw) {
    const ampmMatch = raw.match(/\b(AM|PM)\b/i);
    const ampm = ampmMatch ? ampmMatch[1].toUpperCase() : void 0;
    const numOnly = raw.replace(/[^\d:]/g, "").trim();
    const clean = numOnly.replace(/:/g, "");
    if (!clean || !/^\d{3,4}$/.test(clean)) return null;
    const minute = Number(clean.slice(-2));
    const hour = Number(clean.slice(0, -2));
    if (minute >= 60 || hour < 1 || hour > 24) return null;
    return { hour, minute, ampm };
  }
  function inferAmpm(startHour, endHour, explicitEndAmpm) {
    if (explicitEndAmpm) {
      if (endHour !== void 0) {
        if (explicitEndAmpm === "AM") {
          return { startAmpm: "AM", endAmpm: "AM" };
        }
        if (startHour >= 8 && startHour <= 11 && (endHour === 12 || endHour < startHour)) {
          return { startAmpm: "AM", endAmpm: "PM" };
        }
        return { startAmpm: "PM", endAmpm: "PM" };
      }
      return { startAmpm: explicitEndAmpm };
    }
    const startAmpm = startHour >= 7 && startHour <= 11 ? "AM" : "PM";
    if (endHour === void 0) {
      return { startAmpm };
    }
    let endAmpm;
    if (startAmpm === "AM") {
      if (endHour > startHour && endHour <= 11) {
        endAmpm = "AM";
      } else {
        endAmpm = "PM";
      }
    } else {
      endAmpm = "PM";
    }
    return { startAmpm, endAmpm };
  }
  function formatMeetingTimeRange(range) {
    const explicitRangeAmpm = range.match(/\s*(AM|PM)\s*$/i)?.[1]?.toUpperCase();
    const parts = range.split(/\s*[-–—]\s*/);
    if (parts.length === 2) {
      const p1 = parseClockTime(parts[0]);
      const p2 = parseClockTime(parts[1]);
      if (p1 && p2) {
        const explicitEnd = p2.ampm || explicitRangeAmpm;
        const explicitStart = p1.ampm;
        const { startAmpm, endAmpm } = inferAmpm(p1.hour, p2.hour, explicitEnd);
        const startMinutes = String(p1.minute).padStart(2, "0");
        const endMinutes = String(p2.minute).padStart(2, "0");
        return `${p1.hour}:${startMinutes} ${explicitStart || startAmpm} - ${p2.hour}:${endMinutes} ${explicitEnd || endAmpm}`;
      }
    }
    const single = parseClockTime(range);
    if (single) {
      const minutes = String(single.minute).padStart(2, "0");
      const ampm = single.ampm || explicitRangeAmpm || inferAmpm(single.hour).startAmpm;
      return `${single.hour}:${minutes} ${ampm}`;
    }
    return range.trim();
  }
  function formatMeetingTime(raw) {
    if (!raw || typeof raw !== "string") return null;
    const trimmed = raw.replace(/\s+/g, " ").trim();
    if (!trimmed) return null;
    if (trimmed.includes(",")) {
      const parts = trimmed.split(",").map((p) => formatMeetingTime(p.trim())).filter(Boolean);
      if (parts.length > 0) {
        return {
          days: parts.map((p) => p.days).join(", "),
          time: parts.map((p) => p.time).join(", "),
          formatted: parts.map((p) => p.formatted).join(", ")
        };
      }
    }
    const match = trimmed.match(/^([A-Za-z]+)\s+([\d:]{3,5}(?:\s*(?:AM|PM))?\s*[-–—]\s*[\d:]{3,5}(?:\s*(?:AM|PM))?)$/i);
    if (match) {
      const rawDays = match[1];
      const rawTime = match[2];
      const daysList = parseDayTokens(rawDays);
      const days = daysList.join("/");
      const time = formatMeetingTimeRange(rawTime);
      return {
        days,
        time,
        formatted: time ? `${days} ${time}` : days
      };
    }
    if (/^(online|internet|web|tba|arranged|arr|independent study)$/i.test(trimmed)) {
      return {
        days: trimmed,
        time: "",
        formatted: trimmed
      };
    }
    return null;
  }

  // src/features/courses/details-enhancer.ts
  function enhanceCourseInfoCard(root) {
    const infoHeader = root.querySelector("#student-course-info-header") || (root.id === "student-course-info-header" ? root : null);
    if (!infoHeader) return;
    const row = infoHeader.querySelector(":scope > .row");
    if (!row) return;
    infoHeader.classList.add("bq-course-info-header");
    row.classList.add("bq-course-info-row");
    const cols = [...row.querySelectorAll(":scope > .col")];
    const instructorCol = cols.find((col) => {
      const qlabel = col.querySelector(".qlabel");
      return /instructor/i.test(qlabel?.textContent || "");
    });
    if (instructorCol) {
      instructorCol.classList.add("bq-col-instructor");
      if (!instructorCol.dataset.betterquestCleaned) {
        instructorCol.dataset.betterquestCleaned = "true";
        const nameDiv = instructorCol.querySelector(":scope > div:not(.qlabel):not(.bq-contact-btn)");
        if (nameDiv) {
          nameDiv.classList.add("bq-instructor-name");
        }
        const mailLink = instructorCol.querySelector('a[href^="mailto:"]');
        if (mailLink && !mailLink.querySelector("svg")) {
          mailLink.classList.add("bq-contact-btn");
          mailLink.setAttribute("aria-label", `Email ${mailLink.textContent || "instructor"}`);
          mailLink.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg><span>Email Instructor</span>`;
        }
        for (const node of [...instructorCol.childNodes]) {
          if (node.nodeType === 3 && !(node.textContent || "").trim()) {
            node.remove();
          }
        }
      }
    }
    const meetsCol = cols.find((col) => {
      const qlabel = col.querySelector(".qlabel");
      return /meets/i.test(qlabel?.textContent || "");
    });
    if (meetsCol) {
      meetsCol.classList.add("bq-col-meets");
      if (!meetsCol.dataset.betterquestCleaned) {
        meetsCol.dataset.betterquestCleaned = "true";
        const timeDiv = meetsCol.querySelector(":scope > div:not(.qlabel):not(.bq-course-location)");
        if (timeDiv) {
          const rawText = timeDiv.textContent?.trim() || "";
          const parsed = formatMeetingTime(rawText);
          if (parsed) {
            timeDiv.textContent = "";
            const host = timeDiv.ownerDocument.createElement("span");
            host.className = "bq-meeting-time";
            host.dataset.betterquest = "meeting-time";
            host.dataset.raw = rawText;
            host.title = rawText;
            const daysSpan = timeDiv.ownerDocument.createElement("span");
            daysSpan.className = "bq-meeting-days";
            daysSpan.textContent = parsed.days;
            if (parsed.time) {
              const sep = timeDiv.ownerDocument.createTextNode(" ");
              const hoursSpan = timeDiv.ownerDocument.createElement("span");
              hoursSpan.className = "bq-meeting-hours";
              hoursSpan.textContent = parsed.time;
              host.append(daysSpan, sep, hoursSpan);
            } else {
              host.append(daysSpan);
            }
            timeDiv.append(host);
          }
        }
        const brs = meetsCol.querySelectorAll("br");
        brs.forEach((br) => br.remove());
        for (const node of [...meetsCol.childNodes]) {
          if (node.nodeType === 3) {
            const text = (node.textContent || "").trim();
            if (/^in\s+[A-Za-z0-9.]+/i.test(text) || /[A-Za-z]{2,4}\s+\d+\.\d+/i.test(text)) {
              const locSpan = meetsCol.ownerDocument.createElement("div");
              locSpan.className = "bq-course-location";
              const locClean = text.replace(/^in\s+/i, "");
              locSpan.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg><span>${locClean}</span>`;
              node.replaceWith(locSpan);
            }
          }
        }
        const otherDivs = meetsCol.querySelectorAll(":scope > div:not(.qlabel):not(.bq-course-location)");
        for (const d of otherDivs) {
          const text = (d.textContent || "").trim();
          if ((/^in\s+[A-Za-z0-9.]+/i.test(text) || /[A-Za-z]{2,4}\s+\d+\.\d+/i.test(text)) && !d.querySelector(".bq-meeting-time")) {
            const locClean = text.replace(/^in\s+/i, "");
            d.className = "bq-course-location";
            d.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg><span>${locClean}</span>`;
          }
        }
      }
    }
    const upcomingCol = cols.find((col) => col.querySelector('[data-betterquest="assignment-section"]') || col === cols[2]);
    if (upcomingCol) {
      upcomingCol.classList.add("bq-col-upcoming");
    }
    for (const col of cols) {
      const text = (col.textContent || "").trim();
      if (!text && !col.querySelector('[data-betterquest="assignment-section"]')) {
        col.classList.add("bq-col-empty");
      } else {
        col.classList.remove("bq-col-empty");
      }
    }
  }

  // src/shared/validation.ts
  var object = (value) => !!value && typeof value === "object" && !Array.isArray(value);
  var string = (value, max = 2e3) => typeof value === "string" && value.length <= max;
  var nullableString = (value, max = 2e3) => value === null || string(value, max);
  var timestamp = (value) => string(value, 100) && /^\d{4}-\d{2}-\d{2}T/.test(value) && /(Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
  var url = (value) => {
    try {
      return string(value) && sourceUrl(value) === value;
    } catch {
      return false;
    }
  };
  var themePreference = (value) => typeof value === "string" && ["light", "dark", "system"].includes(value);
  var array = (value, guard, max = 1e3) => Array.isArray(value) && value.length <= max && value.every(guard);
  var unique = (values) => new Set(values.map((value) => value.id)).size === values.length;
  var only = (value, keys) => Object.keys(value).every((key) => keys.includes(key));
  function isCourse(value) {
    if (!object(value) || !string(value.sourceId) || !value.sourceId.trim()) return false;
    return only(value, ["id", "sourceId", "title", "url"]) && value.id === courseId(value.sourceId) && string(value.title, 500) && url(value.url);
  }
  function isAssignment(value) {
    if (!object(value) || !string(value.sourceId) || !value.sourceId.trim() || !string(value.courseId, 4e3) || !object(value.deadline)) return false;
    return only(value, ["id", "sourceId", "courseId", "title", "url", "deadline", "completion", "kind", "historical", "grade", "start", "group", "completionLabel"]) && only(value.deadline, ["iso", "label", "timeZone"]) && value.id === assignmentId(value.courseId, value.sourceId) && string(value.title, 500) && url(value.url) && (value.deadline.iso === null || timestamp(value.deadline.iso)) && nullableString(value.deadline.label, 500) && nullableString(value.deadline.timeZone, 100) && typeof value.completion === "string" && ["unknown", "not-started", "not-completed", "in-progress", "completed"].includes(value.completion) && typeof value.kind === "string" && ["homework", "assessment", "unknown"].includes(value.kind) && (value.historical === null || typeof value.historical === "boolean") && (value.grade === void 0 || object(value.grade) && only(value.grade, ["percent", "label"]) && (value.grade.percent === null || typeof value.grade.percent === "number" && Number.isFinite(value.grade.percent)) && nullableString(value.grade.label, 500)) && (value.start === void 0 || object(value.start) && only(value.start, ["iso", "label", "timeZone"]) && (value.start.iso === null || timestamp(value.start.iso)) && nullableString(value.start.label, 500) && nullableString(value.start.timeZone, 100)) && (value.group === void 0 || object(value.group) && only(value.group, ["id", "label"]) && string(value.group.id) && nullableString(value.group.label, 500)) && (value.completionLabel === void 0 || nullableString(value.completionLabel, 500));
  }
  function material(value) {
    return object(value) && only(value, ["availability", "url"]) && typeof value.availability === "string" && ["unknown", "available", "unavailable"].includes(value.availability) && (value.url === null || url(value.url)) && (value.availability === "available" || value.url === null);
  }
  function isQuestion(value) {
    if (!object(value) || !string(value.sourceId) || !value.sourceId.trim() || !string(value.assignmentId, 6e3) || !string(value.courseId, 4e3) || !object(value.prompt)) return false;
    return only(value, ["id", "sourceId", "courseId", "assignmentId", "number", "url", "anchor", "prompt", "answer", "solution"]) && only(value.prompt, ["status", "text", "format", "reason"]) && value.id === questionId(value.assignmentId, value.sourceId) && nullableString(value.number, 100) && url(value.url) && nullableString(value.anchor, 500) && value.prompt.format === "plain-text" && nullableString(value.prompt.reason, 1e3) && (value.prompt.status === "extracted" ? string(value.prompt.text, 1e5) && !!value.prompt.text.trim() : typeof value.prompt.status === "string" && ["not-extracted", "unavailable"].includes(value.prompt.status) && value.prompt.text === null) && material(value.answer) && material(value.solution);
  }
  function linked(course, assignment, question) {
    return assignment.courseId === course.id && (!question || question.courseId === course.id && question.assignmentId === assignment.id);
  }
  function isBookmark(value) {
    return object(value) && only(value, ["id", "course", "assignment", "question", "note", "createdAt", "updatedAt"]) && isCourse(value.course) && isAssignment(value.assignment) && value.assignment.kind !== "assessment" && isQuestion(value.question) && value.id === value.question.id && linked(value.course, value.assignment, value.question) && string(value.note, 1e4) && timestamp(value.createdAt) && timestamp(value.updatedAt);
  }
  function isStudyRecord(value) {
    return object(value) && only(value, ["course", "assignment", "questions", "sourceUrl", "collectedAt"]) && isCourse(value.course) && isAssignment(value.assignment) && value.assignment.kind === "homework" && value.assignment.historical === true && linked(value.course, value.assignment) && array(value.questions, isQuestion, 500) && unique(value.questions) && value.questions.every((question) => linked(value.course, value.assignment, question)) && url(value.sourceUrl) && timestamp(value.collectedAt);
  }
  function isCachedPage(value) {
    return object(value) && only(value, ["sourceUrl", "observedAt", "courseIds", "assignmentIds", "scannedCourseIds"]) && url(value.sourceUrl) && timestamp(value.observedAt) && array(value.courseIds, (v) => string(v, 4e3)) && array(value.assignmentIds, (v) => string(v, 6e3)) && (value.scannedCourseIds === void 0 || array(value.scannedCourseIds, (v) => string(v, 4e3)) && value.scannedCourseIds.every((id) => value.courseIds.includes(id)));
  }
  function isLocalState(value) {
    if (!object(value) || value.schemaVersion !== 1 || !object(value.cache) || !object(value.preferences)) return false;
    const cache = value.cache;
    const overrides = value.completionOverrides;
    return only(value, ["schemaVersion", "cache", "completionOverrides", "bookmarks", "study", "preferences"]) && only(cache, ["courses", "assignments", "pages", "refreshRequestedAt"]) && only(value.preferences, ["theme", "features"]) && array(cache.courses, isCourse, 2e3) && array(cache.assignments, isAssignment, 1e4) && array(cache.pages, isCachedPage, 2e3) && unique(cache.courses) && unique(cache.assignments) && cache.assignments.every((a) => cache.courses.some((c) => c.id === a.courseId)) && cache.pages.every((p) => p.courseIds.every((id) => cache.courses.some((c) => c.id === id)) && p.assignmentIds.every((id) => cache.assignments.some((a) => a.id === id))) && (cache.refreshRequestedAt === null || timestamp(cache.refreshRequestedAt)) && (overrides === void 0 || object(overrides) && Object.keys(overrides).length <= 1e4 && Object.entries(overrides).every(([id, completed]) => string(id, 6e3) && completed === true && cache.assignments.some((assignment) => assignment.id === id))) && array(value.bookmarks, isBookmark, 5e3) && unique(value.bookmarks) && array(value.study, isStudyRecord, 1e3) && themePreference(value.preferences.theme) && (value.preferences.features === void 0 || object(value.preferences.features) && only(value.preferences.features, ["assignments", "bookmarks", "animations", "celebrations", "whimsy"]) && (value.preferences.features.assignments === void 0 || typeof value.preferences.features.assignments === "boolean") && (value.preferences.features.bookmarks === void 0 || typeof value.preferences.features.bookmarks === "boolean") && (value.preferences.features.animations === void 0 || typeof value.preferences.features.animations === "boolean") && (value.preferences.features.celebrations === void 0 || typeof value.preferences.features.celebrations === "boolean") && (value.preferences.features.whimsy === void 0 || typeof value.preferences.features.whimsy === "boolean"));
  }

  // src/shared/client.ts
  function isContextInvalidated() {
    try {
      return typeof chrome !== "undefined" && Boolean(chrome.runtime) && chrome.runtime.id === void 0;
    } catch {
      return false;
    }
  }
  function commandErrorMessage(error) {
    if (error instanceof Error && /extension context invalidated/i.test(error.message)) {
      return "Extension updated. Reload this page to continue.";
    }
    return error instanceof Error ? error.message : "Request failed.";
  }
  var execute = async (command) => {
    let response;
    try {
      response = await chrome.runtime.sendMessage({ type: "betterquest:command", command });
    } catch (error) {
      throw new Error(commandErrorMessage(error));
    }
    if (!response || !response.ok) throw new Error(response?.error || "BetterQuest background connection unavailable. Refresh after reloading the extension.");
    if (!isLocalState(response.state)) throw new Error("Invalid BetterQuest response.");
    return response.state;
  };
  function subscribeLocal(callback) {
    try {
      const port = chrome.runtime.connect({ name: "betterquest:changes" });
      const listener = (message) => {
        if (message && typeof message === "object" && "type" in message && message.type === "betterquest:changed") callback();
      };
      port.onMessage.addListener(listener);
      port.onDisconnect.addListener(() => {
        void chrome.runtime.lastError;
      });
      return () => {
        try {
          port.onMessage.removeListener(listener);
        } catch {
        }
        try {
          port.disconnect();
        } catch {
        }
      };
    } catch {
      return () => {
      };
    }
  }

  // src/adapters/quest/assignments.ts
  var ASSIGNMENT_SELECTORS = {
    root: "#target",
    title: 'button[data-target="#student-course-info-header"] .h4',
    tab: "#tabs-elements",
    tables: 'table[id^="instances-table-eh"]',
    accessible: ".sr-only",
    processing: ".dataTables_processing"
  };

  // src/adapters/quest/assignment-placement.ts
  function emptyColumn(column) {
    return [...column.childNodes].every((node) => node.nodeType === 8 || node.nodeType === 3 && !(node.textContent || "").trim() || node.nodeType === 1 && node.matches('[data-betterquest="assignment-section"]'));
  }
  function findAssignmentSectionSlot(document2) {
    const root = document2.querySelector(ASSIGNMENT_SELECTORS.root);
    const row = root?.querySelector("#student-course-info-header > .row");
    const title = root?.querySelector(ASSIGNMENT_SELECTORS.title)?.textContent || "";
    if (!root || !row || !/\(\d+\)\s*$/.test(title.trim())) return null;
    const columns = [...row.querySelectorAll(":scope > .col")];
    const meets = columns.findIndex((column2) => column2.querySelector(":scope > .qlabel")?.textContent?.trim() === "Meets");
    if (meets < 0) return null;
    const column = columns.slice(meets + 1).find(emptyColumn);
    return column ? { root, column } : null;
  }

  // src/features/assignments/view-model.ts
  function assignmentIsCompleted(assignment, overrides = {}) {
    return assignment.completion === "completed" || overrides?.[assignment.id] === true;
  }
  function assignmentPanelData(cache) {
    const assignments = [...cache.assignments].sort((a, b) => {
      const difference = (a.deadline.iso ? Date.parse(a.deadline.iso) : Infinity) - (b.deadline.iso ? Date.parse(b.deadline.iso) : Infinity);
      return (Number.isNaN(difference) ? 0 : difference) || a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
    });
    const courses = cache.courses.map((course) => {
      const observations = cache.pages.filter((page) => page.scannedCourseIds?.includes(course.id)).sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt));
      return {
        course,
        scanned: observations.length > 0,
        observedAt: observations[0]?.observedAt || null,
        assignmentCount: cache.assignments.filter((a) => a.courseId === course.id).length
      };
    });
    return { assignments, courses };
  }
  function visibleAssignments(cache, courseId2, scope, view, overrides = {}) {
    const rows = assignmentPanelData(cache).assignments.filter((assignment) => (scope === "visited" || assignment.courseId === courseId2) && (view === "completed" ? assignmentIsCompleted(assignment, overrides) : !assignmentIsCompleted(assignment, overrides)));
    return view === "todo" ? rows.sort((a, b) => Number(a.completion === "unknown") - Number(b.completion === "unknown")) : rows.sort((a, b) => {
      const difference = (b.deadline.iso ? Date.parse(b.deadline.iso) : -Infinity) - (a.deadline.iso ? Date.parse(a.deadline.iso) : -Infinity);
      return (Number.isNaN(difference) ? 0 : difference) || a.title.localeCompare(b.title);
    });
  }
  function displayDeadline(assignment, now = Date.now(), overrides = {}) {
    if (!assignment.deadline.iso) return { date: "Unknown deadline", time: "Check Quest", overdue: false };
    const date = new Date(assignment.deadline.iso);
    const timeZone = assignment.deadline.timeZone || "UTC";
    try {
      return {
        date: new Intl.DateTimeFormat(void 0, { month: "short", day: "numeric", timeZone }).format(date),
        time: new Intl.DateTimeFormat(void 0, { hour: "numeric", minute: "2-digit", timeZoneName: "short", timeZone }).format(date),
        overdue: date.getTime() < now && !assignmentIsCompleted(assignment, overrides)
      };
    } catch {
      return { date: assignment.deadline.label || assignment.deadline.iso, time: "See original deadline", overdue: date.getTime() < now && !assignmentIsCompleted(assignment, overrides) };
    }
  }

  // src/features/assignments/section.ts
  var PREVIEW_SIZE = 3;
  function createAssignmentSection(root, run = execute, subscribe = subscribeLocal) {
    const document2 = root.ownerDocument;
    const host = document2.createElement("div");
    host.dataset.betterquest = "assignment-section";
    root.querySelectorAll('[data-betterquest="assignment-section"]').forEach((node) => node.remove());
    const shadow = host.attachShadow({ mode: "open" });
    shadow.addEventListener("click", (event) => event.stopPropagation());
    const style = document2.createElement("style");
    style.textContent = `
    :host { display:block; color:inherit; font-family:inherit; scroll-margin-top:84px; width:100%; }
    * { box-sizing:border-box; }
    section { font:inherit; font-size:13px; line-height:1.4; text-align:left; width:100%; }
    h2 { font:inherit; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; margin:0 0 8px; color:var(--bq-muted,#64748b); line-height:1.2; }
    h2:focus-visible,a:focus-visible { outline:2px solid var(--bq-accent,#0284c7); outline-offset:3px; }
    ul { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:6px; }
    li { padding:0 0 6px; border-bottom:1px solid var(--bq-border, rgba(148,163,184,0.18)); }
    li:last-child { border-bottom:none; padding-bottom:2px; }
    .assignment-link { display:block; color:var(--bq-accent,#0284c7); text-decoration:none; overflow:hidden;
      white-space:nowrap; text-overflow:ellipsis; font-size:13.5px; font-weight:600; line-height:1.3; transition:color .15s ease; }
    a.assignment-link:hover { color:#38bdf8; text-decoration:underline; }
    .deadline { display:inline-flex; align-items:center; color:var(--bq-muted,#64748b); font-size:11.5px; font-weight:500; white-space:nowrap; }
    .overdue { color:var(--bq-warning,#ef4444); font-weight:600; }
    .meta-row { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-top:4px; }
    .section-mark-btn { display:inline-flex; align-items:center; gap:4px; padding:3px 8px; border:1px solid var(--bq-border,#cbd7e3); border-radius:5px; background:var(--bq-surface,#fff); color:var(--bq-muted,#64748b); font:600 11px/1.2 inherit; cursor:pointer; transition:all .18s ease; flex-shrink:0; }
    .section-mark-btn:hover { border-color:var(--bq-good,#10b981); color:var(--bq-good,#10b981); background:rgba(16,185,129,0.06); }
    .section-mark-btn svg { width:11px; height:11px; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }
    .footer { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:6px 12px; margin-top:8px; padding-top:6px; border-top:1px solid var(--bq-border, rgba(148,163,184,0.18)); font-size:11.5px; }
    .view-all { color:var(--bq-accent,#0284c7); text-decoration:none; font-weight:600; white-space:nowrap; }
    .view-all:hover { text-decoration:underline; }
    .note { color:var(--bq-muted,#94a3b8); font-size:10.5px; }
    .empty,.error { margin:6px 0; color:var(--bq-muted,#64748b); font-size:12.5px; }
    .error { color:var(--bq-warning,#ef4444); }
    .reload-btn { background:none; border:0; padding:0; color:var(--bq-accent,#0284c7); font:inherit; font-weight:600; text-decoration:underline; cursor:pointer; white-space:nowrap; }
    .reload-btn:focus-visible { outline:2px solid var(--bq-accent,#0284c7); outline-offset:3px; }
  `;
    const section = document2.createElement("section");
    section.setAttribute("aria-labelledby", "bq-upcoming-title");
    const title = document2.createElement("h2");
    title.id = "bq-upcoming-title";
    title.tabIndex = -1;
    title.textContent = "Upcoming Assignments";
    const result = document2.createElement("div");
    result.setAttribute("aria-live", "polite");
    const footer = document2.createElement("div");
    footer.className = "footer";
    const viewAll = document2.createElement("a");
    viewAll.className = "view-all";
    viewAll.href = "#tabs-elements";
    viewAll.textContent = "View all \u2192";
    viewAll.setAttribute("aria-label", "View all course assignments in Quest");
    const note = document2.createElement("span");
    note.className = "note";
    note.textContent = "Course data only";
    note.title = "Other courses are not yet scanned automatically. Cached assignments may be stale.";
    footer.append(viewAll, note);
    section.append(title, result, footer);
    shadow.append(style, section);
    let course;
    let disposed = false;
    let generation = 0;
    let lastRendered = "";
    let unsubscribe;
    function position() {
      const slot = findAssignmentSectionSlot(document2);
      if (!slot || slot.root !== root) {
        host.remove();
        return false;
      }
      if (host.parentElement !== slot.column) slot.column.append(host);
      return true;
    }
    function render(state) {
      if (!course || disposed) return;
      const focusedId = shadow.activeElement?.closest("[data-assignment-id]")?.getAttribute("data-assignment-id");
      const data = assignmentPanelData(state.cache);
      const pending = visibleAssignments(state.cache, course.id, "course", "todo", state.completionOverrides).filter((assignment) => assignment.completion !== "unknown");
      const observed = data.courses.find((summary) => summary.course.id === course.id)?.scanned;
      result.replaceChildren();
      if (!pending.length) {
        const empty = document2.createElement("p");
        empty.className = "empty";
        empty.textContent = observed ? "All caught up! No incomplete assignments." : "Loading assignments\u2026";
        result.append(empty);
      } else {
        const list = document2.createElement("ul");
        list.className = "list";
        for (const assignment of pending.slice(0, PREVIEW_SIZE)) {
          const row = document2.createElement("li");
          row.className = "row";
          row.dataset.assignmentId = assignment.id;
          const link10 = document2.createElement("a");
          link10.className = "assignment-link";
          link10.href = sourceUrl(assignment.url);
          link10.textContent = assignment.title;
          link10.title = assignment.title;
          const due = displayDeadline(assignment, Date.now(), state.completionOverrides);
          const deadline = document2.createElement("time");
          deadline.className = "deadline" + (due.overdue ? " overdue" : "");
          if (assignment.deadline.iso) deadline.dateTime = assignment.deadline.iso;
          deadline.textContent = (due.overdue ? "Overdue \xB7 " : "") + due.date + " \xB7 " + due.time;
          deadline.title = assignment.deadline.label || assignment.deadline.iso || "No deadline listed";
          const metaRow = document2.createElement("div");
          metaRow.className = "meta-row";
          const markBtn = document2.createElement("button");
          markBtn.type = "button";
          markBtn.className = "section-mark-btn";
          markBtn.title = "Mark complete";
          markBtn.setAttribute("aria-label", `Mark ${assignment.title} complete`);
          markBtn.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7"/></svg><span>Mark done</span>';
          markBtn.onclick = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            markBtn.disabled = true;
            try {
              await run({ kind: "assignment:completion:set", assignmentId: assignment.id, completed: true });
            } catch {
              markBtn.disabled = false;
            }
          };
          metaRow.append(deadline, markBtn);
          row.append(link10, metaRow);
          list.append(row);
        }
        result.append(list);
      }
      note.textContent = !observed ? "Not synced yet" : pending.length > PREVIEW_SIZE ? `${pending.length} more remaining` : "";
      if (focusedId) {
        [...result.querySelectorAll("a")].find((link10) => link10.closest("[data-assignment-id]")?.getAttribute("data-assignment-id") === focusedId)?.focus({ preventScroll: true });
      }
    }
    async function refresh() {
      if (disposed || !position()) return;
      const current = ++generation;
      try {
        const state = await run({ kind: "state:read" });
        if (disposed || current !== generation) return;
        const signature = JSON.stringify({ cache: state.cache, completionOverrides: state.completionOverrides, course });
        if (signature !== lastRendered) {
          render(state);
          lastRendered = signature;
        }
      } catch (error) {
        if (!disposed && current === generation) {
          const message = document2.createElement("p");
          message.className = "error";
          message.setAttribute("role", "alert");
          message.textContent = commandErrorMessage(error);
          if (isContextInvalidated()) {
            const reload = document2.createElement("button");
            reload.type = "button";
            reload.className = "reload-btn";
            reload.textContent = "Reload page";
            reload.addEventListener("click", () => document2.defaultView?.location.reload());
            message.append(document2.createTextNode(" "), reload);
          }
          result.replaceChildren(message);
          lastRendered = "";
        }
      }
    }
    viewAll.addEventListener("click", (event) => {
      const nativeTab = root.querySelector("#student-elements-a");
      const nativeAssignments = root.querySelector("#tabs-elements");
      if (!nativeTab || !nativeAssignments) return;
      event.preventDefault();
      nativeTab.click();
      nativeAssignments.scrollIntoView?.({ block: "start" });
    });
    position();
    const loading = document2.createElement("p");
    loading.className = "empty";
    loading.textContent = "Loading assignments\u2026";
    result.append(loading);
    try {
      unsubscribe = subscribe(() => {
        void refresh();
      });
    } catch {
    }
    return {
      refresh(currentCourse) {
        course = currentCourse;
        return refresh();
      },
      focus() {
        if (disposed || !position()) return false;
        const info = host.closest("#student-course-info-header");
        if (info && document2.defaultView?.getComputedStyle(info).display === "none") return false;
        host.scrollIntoView?.({ block: "start" });
        title.focus({ preventScroll: true });
        return true;
      },
      isConnected: () => host.isConnected && !disposed,
      dispose() {
        disposed = true;
        generation++;
        unsubscribe?.();
        host.remove();
      }
    };
  }

  // src/adapters/quest/theme.ts
  var QUEST_DARK_STYLES = `
  #main-content[data-betterquest-theme] :where(.custom-select,.form-control,.browser-default,select,input[type="text"],input[type="number"],textarea) { border-radius:6px; min-height:40px; box-shadow:none; transition:border-color .18s ease,box-shadow .18s ease,background-color .18s ease; }
  #main-content[data-betterquest-theme] :where(.custom-select,.form-control,.browser-default,select,input[type="text"],input[type="number"],textarea):focus { box-shadow:0 0 0 3px color-mix(in srgb,var(--bq-accent) 22%,transparent)!important; }
  #main-content[data-betterquest-theme] :where(.btn,.btn-sm) { border-radius:6px; transition:transform .16s ease,box-shadow .16s ease,background-color .16s ease; }
  #main-content[data-betterquest-theme] :where(.btn,.btn-sm):not(:disabled):hover { transform:translateY(-1px); }
  #main-content[data-betterquest-theme] :where(.card) { border-radius:10px; border-color:var(--bq-border); box-shadow:0 12px 34px #10203312; }
  #main-content[data-betterquest-theme] :where(.dataTables_wrapper) { border-radius:8px; }
  @media(prefers-reduced-motion:reduce) { #main-content[data-betterquest-theme] :where(.custom-select,.form-control,.browser-default,select,input,textarea,.btn,.btn-sm) { transition:none!important; } #main-content[data-betterquest-theme] :where(.btn,.btn-sm):hover { transform:none; } #main-content .bq-review-fill { animation:none!important; } }
  #body-id.mdb-skin[data-betterquest-theme="dark"] { background-color:#111b27; color:#e7eef8; color-scheme:dark; }
  #main-content[data-betterquest-theme="dark"] { color:var(--bq-text); }
  #quest-nav-header-div[data-betterquest-theme="dark"] .qh-navbar { background:#162b40; color:#edf3fb; }
  #quest-nav-header-div[data-betterquest-theme="dark"] .qh-nav-link { color:#edf3fb; }
  #quest-nav-header-div .qh-navbar[data-betterquest-nav="compact"] { color:#edf3fb; }
  #quest-nav-header-div .qh-navbar[data-betterquest-nav="compact"] .qh-breadcrumbs,
  #quest-nav-header-div .qh-navbar[data-betterquest-nav="compact"] .qh-breadcrumb,
  #quest-nav-header-div .qh-navbar[data-betterquest-nav="compact"] .qh-breadcrumb li,
  #quest-nav-header-div .qh-navbar[data-betterquest-nav="compact"] .qh-breadcrumb a { color:#edf3fb!important; }
  #quest-nav-header-div[data-betterquest-theme="dark"] :where(.qh-dropdown-menu),
  #main-content[data-betterquest-theme="dark"] :where(.dropdown-menu) {
    background: color-mix(in srgb, var(--bq-surface) 94%, transparent);
    color: var(--bq-text);
    border: 1px solid var(--bq-border);
    border-radius: 10px;
    box-shadow: 0 24px 60px -8px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(24px) saturate(190%);
    padding: 8px;
    animation: bq-dropdown-spring 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  }
  #quest-nav-header-div[data-betterquest-theme="dark"] :where(.qh-dropdown-item, .dropdown-item),
  #main-content[data-betterquest-theme="dark"] :where(.dropdown-item) {
    border-radius: 6px;
    padding: 8px 12px;
    color: var(--bq-text);
    transition: transform .2s cubic-bezier(0.16, 1, 0.3, 1), background .2s cubic-bezier(0.16, 1, 0.3, 1), color .18s ease;
  }
  #quest-nav-header-div[data-betterquest-theme="dark"] :where(.qh-dropdown-item:hover, .dropdown-item:hover),
  #main-content[data-betterquest-theme="dark"] :where(.dropdown-item:hover) {
    transform: translateX(3px);
    background: linear-gradient(90deg, rgba(129, 140, 248, 0.2), rgba(56, 189, 248, 0.12))!important;
    color: #fff!important;
  }
  @keyframes bq-dropdown-spring {
    0% { opacity: 0; transform: translateY(-8px) scale(0.96); filter: blur(3px); }
    70% { opacity: 1; transform: translateY(1px) scale(1.004); filter: blur(0); }
    100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
  }
  #main-content[data-betterquest-theme="dark"] :where(#target,.container-fluid) { color:var(--bq-text); }
  #main-content[data-betterquest-theme="dark"] :where(.card,.tab-content,.dataTables_scrollBody,.dataTables_scrollHead,.dataTables_wrapper) { background-color:var(--bq-surface)!important; color:var(--bq-text); border-color:var(--bq-border); }
  #main-content[data-betterquest-theme="dark"] :where(.card-header) { background-color:var(--bq-raised)!important; color:var(--bq-text); border-color:var(--bq-border); }
  #main-content[data-betterquest-theme="dark"] :where(.qlabel) { color:var(--bq-text); }
  #main-content[data-betterquest-theme="dark"] :where(a,.btn-link) { color:var(--bq-accent); }
  #main-content[data-betterquest-theme="dark"] :where(#panel-tabs.nav-tabs) { background:#214d50; }
  #main-content[data-betterquest-theme="dark"] :where(#panel-tabs .nav-link) { color:#e2f4f2; }
  #main-content[data-betterquest-theme="dark"] :where(#panel-tabs .nav-link.active) { background:#2c6966; }
  #main-content[data-betterquest-theme="dark"] :where(#courses-table,table[id^="instances-table-eh"],table[id^="instance-table-courseuserassignment_"]) { background:var(--bq-surface); color:var(--bq-text); }
  #main-content[data-betterquest-theme="dark"] :where(#courses-table,table[id^="instances-table-eh"],table[id^="instance-table-courseuserassignment_"]) thead th { background:#2b3c52!important; color:#e7eef8!important; border-color:var(--bq-border); }
  #main-content[data-betterquest-theme="dark"] :where(#courses-table,table[id^="instances-table-eh"],table[id^="instance-table-courseuserassignment_"]) tbody :where(td,th) { color:inherit; border-color:var(--bq-border); }
  #main-content[data-betterquest-theme="dark"] :where(.table-striped) tbody tr:nth-of-type(odd) { background-color:#223144!important; }
  #main-content[data-betterquest-theme="dark"] :where(.table-hover, table, .table) tbody tr:hover, #main-content[data-betterquest-theme="dark"] :where(.table-hover, table, .table) tbody tr:hover :where(td, th, span, div, p, strong, b, em) { background-color:#253952!important; color:#f8fafc!important; }
  #main-content[data-betterquest-theme="dark"] :where(.table-hover, table, .table, #courses-table, table[id^="instances-table-eh"], table[id^="instance-table-courseuserassignment_"]) tbody tr:hover a:not(.btn) { color:#818cf8!important; text-shadow:0 0 8px rgba(129,140,248,.35); text-decoration:underline; }
  :root[data-betterquest-animations="disabled"] *, :root[data-betterquest-animations="disabled"] *::before, :root[data-betterquest-animations="disabled"] *::after { animation:none!important; transition:none!important; }
  #main-content[data-betterquest-theme="dark"] #courses-table td:first-child img { background:#fff; border-radius:4px; }
  #main-content[data-betterquest-theme="dark"] :where(.form-control,.custom-select,.browser-default,input[type="text"],input[type="number"],input[type="password"],textarea,select) { background-color:#152133!important; color:#e7eef8!important; border-color:#53677f!important; }
  #main-content[data-betterquest-theme="dark"] :where(input,textarea)::placeholder { color:#a5b5c8; opacity:1; }
  #main-content[data-betterquest-theme="dark"] :where(input,textarea,select):focus { outline-color:#8cbfff; border-color:#8cbfff!important; }
  #main-content[data-betterquest-theme="dark"] :where(.btn-primary) { background-color:#315e98; color:#fff; }
  #main-content[data-betterquest-theme="dark"] :where(.text-success) { color:#7cd8a5!important; }
  #main-content[data-betterquest-theme="dark"] :where(.text-danger) { color:#ffaaa5!important; }
  #main-content[data-betterquest-theme="dark"] :where(.text-warning) { color:#ebc987!important; }
  #main-content[data-betterquest-theme="dark"] :where(mjx-container) { color:inherit; }
  #main-content[data-betterquest-theme="dark"] :where(#presentation-div .bg-light,#presentation-div .custom-control-label) { color:#18253a!important; }
  #main-content[data-betterquest-theme="dark"] :where(#presentation-div .bg-light) :where(mjx-container,.MathJax,.MathJax_Display) { color:#18253a!important; }
  /* Native document contents/diagrams are never inverted or recolored. */
  #main-content[data-betterquest-theme="dark"] :where(iframe,embed,object[type="application/pdf"]) { color-scheme:light; background:#fff; }

  /* =========================================================================
     GRADES & REVIEW PAGES \u2014 DARK MODE: ALL TEXT WHITE (#ffffff)
     ========================================================================= */
  #main-content[data-betterquest-theme="dark"] :is(
    #tabs-grades,
    #tabs-review,
    [data-betterquest-page="grades"],
    [data-betterquest-page="review"],
    table[id*="grade" i],
    table[id*="review" i],
    .tab-pane#tabs-grades,
    .tab-pane#tabs-review
  ),
  #main-content[data-betterquest-theme="dark"][data-betterquest-page="grades"],
  #main-content[data-betterquest-theme="dark"][data-betterquest-page="review"],
  #body-id[data-betterquest-theme="dark"][data-betterquest-page="grades"] #main-content,
  #body-id[data-betterquest-theme="dark"][data-betterquest-page="review"] #main-content {
    color: #ffffff !important;
  }

  #main-content[data-betterquest-theme="dark"] :is(
    #tabs-grades,
    #tabs-review,
    [data-betterquest-page="grades"],
    [data-betterquest-page="review"],
    table[id*="grade" i],
    table[id*="review" i],
    .tab-pane#tabs-grades,
    .tab-pane#tabs-review
  ) :where(
    p, span, div, td, th, h1, h2, h3, h4, h5, h6, label, li, ul, ol, strong, b, em, small, i,
    button.btn-link, mjx-container, .MathJax, .MathJax_Display, dt, dd, blockquote, caption, pre, code,
    .dataTables_info, .dataTables_filter, .dataTables_length, .dataTables_paginate, .paginate_button,
    .card-title, .card-header, .card-body, .qlabel, .text-muted, .text-dark, .text-secondary, .text-body
  ),
  #main-content[data-betterquest-theme="dark"][data-betterquest-page="grades"] :where(
    p, span, div, td, th, h1, h2, h3, h4, h5, h6, label, li, ul, ol, strong, b, em, small, i,
    button.btn-link, mjx-container, .MathJax, .MathJax_Display, dt, dd, blockquote, caption, pre, code,
    .dataTables_info, .dataTables_filter, .dataTables_length, .dataTables_paginate, .paginate_button,
    .card-title, .card-header, .card-body, .qlabel, .text-muted, .text-dark, .text-secondary, .text-body
  ),
  #main-content[data-betterquest-theme="dark"][data-betterquest-page="review"] :where(
    p, span, div, td, th, h1, h2, h3, h4, h5, h6, label, li, ul, ol, strong, b, em, small, i,
    button.btn-link, mjx-container, .MathJax, .MathJax_Display, dt, dd, blockquote, caption, pre, code,
    .dataTables_info, .dataTables_filter, .dataTables_length, .dataTables_paginate, .paginate_button,
    .card-title, .card-header, .card-body, .qlabel, .text-muted, .text-dark, .text-secondary, .text-body
  ) {
    color: #ffffff !important;
  }

  #main-content[data-betterquest-theme="dark"] :is(
    #tabs-grades,
    #tabs-review,
    [data-betterquest-page="grades"],
    [data-betterquest-page="review"],
    table[id*="grade" i],
    table[id*="review" i]
  ) *:not(.material-icons):not(.badge-success):not(.badge-danger):not(.badge-warning):not(input):not(select):not(textarea):not(button:not(.btn-link)),
  #main-content[data-betterquest-theme="dark"][data-betterquest-page="grades"] *:not(.material-icons):not(.badge-success):not(.badge-danger):not(.badge-warning):not(input):not(select):not(textarea):not(button:not(.btn-link)),
  #main-content[data-betterquest-theme="dark"][data-betterquest-page="review"] *:not(.material-icons):not(.badge-success):not(.badge-danger):not(.badge-warning):not(input):not(select):not(textarea):not(button:not(.btn-link)) {
    color: #ffffff !important;
  }

  #main-content[data-betterquest-theme="dark"] :is(
    #tabs-grades,
    #tabs-review,
    [data-betterquest-page="grades"],
    [data-betterquest-page="review"],
    table[id*="grade" i],
    table[id*="review" i]
  ) a:not(.btn),
  #main-content[data-betterquest-theme="dark"][data-betterquest-page="grades"] a:not(.btn),
  #main-content[data-betterquest-theme="dark"][data-betterquest-page="review"] a:not(.btn) {
    color: #ffffff !important;
    text-decoration: underline !important;
    text-underline-offset: 3px;
  }

  #main-content[data-betterquest-theme="dark"] :is(
    #tabs-grades,
    #tabs-review,
    [data-betterquest-page="grades"],
    [data-betterquest-page="review"],
    table[id*="grade" i],
    table[id*="review" i]
  ) a:not(.btn):hover,
  #main-content[data-betterquest-theme="dark"][data-betterquest-page="grades"] a:not(.btn):hover,
  #main-content[data-betterquest-theme="dark"][data-betterquest-page="review"] a:not(.btn):hover {
    color: #c7d2fe !important;
  }

  #main-content[data-betterquest-theme="dark"] :is(
    #tabs-grades,
    #tabs-review,
    [data-betterquest-page="grades"],
    [data-betterquest-page="review"]
  ) :where(table, .table, .dataTables_wrapper, .dataTables_scrollBody, .dataTables_scrollHead, .card, .tab-pane) {
    background-color: var(--bq-surface, #182434) !important;
    color: #ffffff !important;
    border-color: var(--bq-border, #3b4b63) !important;
  }

  #main-content[data-betterquest-theme="dark"] :is(
    #tabs-grades,
    #tabs-review,
    [data-betterquest-page="grades"],
    [data-betterquest-page="review"]
  ) :where(thead th) {
    background-color: #2b3c52 !important;
    color: #ffffff !important;
    border-color: var(--bq-border, #3b4b63) !important;
  }

  #main-content[data-betterquest-theme="dark"] :is(
    #tabs-grades,
    #tabs-review,
    [data-betterquest-page="grades"],
    [data-betterquest-page="review"]
  ) :where(tbody td, tbody th) {
    color: #ffffff !important;
    border-color: var(--bq-border, #3b4b63) !important;
  }

  #main-content[data-betterquest-theme="dark"] :is(
    #tabs-grades,
    #tabs-review,
    [data-betterquest-page="grades"],
    [data-betterquest-page="review"]
  ) :where(.table-striped) tbody tr:nth-of-type(odd) {
    background-color: #223144 !important;
  }

  #main-content[data-betterquest-theme="dark"] :is(
    #tabs-grades,
    #tabs-review,
    [data-betterquest-page="grades"],
    [data-betterquest-page="review"]
  ) :where(.card-header) {
    background-color: var(--bq-raised, #27394e) !important;
    color: #ffffff !important;
    border-color: var(--bq-border, #3b4b63) !important;
  }

  #main-content[data-betterquest-theme="dark"] #panel-tabs:has(#student-grades-a.active) ~ #info-tab-data *:not(.material-icons):not(.badge-success):not(.badge-danger):not(.badge-warning):not(input):not(select):not(textarea):not(button:not(.btn-link)),
  #main-content[data-betterquest-theme="dark"] #panel-tabs:has(#student-review-a.active) ~ #info-tab-data *:not(.material-icons):not(.badge-success):not(.badge-danger):not(.badge-warning):not(input):not(select):not(textarea):not(button:not(.btn-link)):not(.bq-review-dashboard *):not([data-betterquest="review-dashboard"] *) {
    color: #ffffff !important;
  }

  /* =========================================================================
     GRADES & REVIEW PAGES \u2014 LIGHT MODE: ALL TEXT BLACK (#000000)
     ========================================================================= */
  #main-content[data-betterquest-theme="light"] :is(
    #tabs-grades,
    #tabs-review,
    [data-betterquest-page="grades"],
    [data-betterquest-page="review"],
    table[id*="grade" i],
    table[id*="review" i],
    .tab-pane#tabs-grades,
    .tab-pane#tabs-review
  ),
  #main-content[data-betterquest-theme="light"][data-betterquest-page="grades"],
  #main-content[data-betterquest-theme="light"][data-betterquest-page="review"],
  #body-id[data-betterquest-theme="light"][data-betterquest-page="grades"] #main-content,
  #body-id[data-betterquest-theme="light"][data-betterquest-page="review"] #main-content {
    color: #000000 !important;
  }

  #main-content[data-betterquest-theme="light"] :is(
    #tabs-grades,
    #tabs-review,
    [data-betterquest-page="grades"],
    [data-betterquest-page="review"],
    table[id*="grade" i],
    table[id*="review" i],
    .tab-pane#tabs-grades,
    .tab-pane#tabs-review
  ) :where(
    p, span, div, td, th, h1, h2, h3, h4, h5, h6, label, li, ul, ol, strong, b, em, small, i,
    button.btn-link, mjx-container, .MathJax, .MathJax_Display, dt, dd, blockquote, caption, pre, code,
    .dataTables_info, .dataTables_filter, .dataTables_length, .dataTables_paginate, .paginate_button,
    .card-title, .card-header, .card-body, .qlabel, .text-muted, .text-dark, .text-secondary, .text-body
  ),
  #main-content[data-betterquest-theme="light"][data-betterquest-page="grades"] :where(
    p, span, div, td, th, h1, h2, h3, h4, h5, h6, label, li, ul, ol, strong, b, em, small, i,
    button.btn-link, mjx-container, .MathJax, .MathJax_Display, dt, dd, blockquote, caption, pre, code,
    .dataTables_info, .dataTables_filter, .dataTables_length, .dataTables_paginate, .paginate_button,
    .card-title, .card-header, .card-body, .qlabel, .text-muted, .text-dark, .text-secondary, .text-body
  ),
  #main-content[data-betterquest-theme="light"][data-betterquest-page="review"] :where(
    p, span, div, td, th, h1, h2, h3, h4, h5, h6, label, li, ul, ol, strong, b, em, small, i,
    button.btn-link, mjx-container, .MathJax, .MathJax_Display, dt, dd, blockquote, caption, pre, code,
    .dataTables_info, .dataTables_filter, .dataTables_length, .dataTables_paginate, .paginate_button,
    .card-title, .card-header, .card-body, .qlabel, .text-muted, .text-dark, .text-secondary, .text-body
  ) {
    color: #000000 !important;
  }

  #main-content[data-betterquest-theme="light"] :is(
    #tabs-grades,
    #tabs-review,
    [data-betterquest-page="grades"],
    [data-betterquest-page="review"],
    table[id*="grade" i],
    table[id*="review" i]
  ) *:not(.material-icons):not(.badge-success):not(.badge-danger):not(.badge-warning):not(input):not(select):not(textarea):not(button:not(.btn-link)):not(.bq-review-dashboard *):not([data-betterquest="review-dashboard"] *),
  #main-content[data-betterquest-theme="light"][data-betterquest-page="grades"] *:not(.material-icons):not(.badge-success):not(.badge-danger):not(.badge-warning):not(input):not(select):not(textarea):not(button:not(.btn-link)),
  #main-content[data-betterquest-theme="light"][data-betterquest-page="review"] *:not(.material-icons):not(.badge-success):not(.badge-danger):not(.badge-warning):not(input):not(select):not(textarea):not(button:not(.btn-link)):not(.bq-review-dashboard *):not([data-betterquest="review-dashboard"] *) {
    color: #000000 !important;
  }

  #main-content[data-betterquest-theme="light"] :is(
    #tabs-grades,
    #tabs-review,
    [data-betterquest-page="grades"],
    [data-betterquest-page="review"],
    table[id*="grade" i],
    table[id*="review" i]
  ) a:not(.btn),
  #main-content[data-betterquest-theme="light"][data-betterquest-page="grades"] a:not(.btn),
  #main-content[data-betterquest-theme="light"][data-betterquest-page="review"] a:not(.btn) {
    color: #000000 !important;
    text-decoration: underline !important;
    text-underline-offset: 3px;
  }

  #main-content[data-betterquest-theme="light"] :is(
    #tabs-grades,
    #tabs-review,
    [data-betterquest-page="grades"],
    [data-betterquest-page="review"],
    table[id*="grade" i],
    table[id*="review" i]
  ) a:not(.btn):hover,
  #main-content[data-betterquest-theme="light"][data-betterquest-page="grades"] a:not(.btn):hover,
  #main-content[data-betterquest-theme="light"][data-betterquest-page="review"] a:not(.btn):hover {
    color: #4338ca !important;
  }

  #main-content[data-betterquest-theme="light"] :is(
    #tabs-grades,
    #tabs-review,
    [data-betterquest-page="grades"],
    [data-betterquest-page="review"]
  ) :where(table, .table, .dataTables_wrapper, .dataTables_scrollBody, .dataTables_scrollHead, .card, .tab-pane) {
    background-color: #ffffff !important;
    color: #000000 !important;
    border-color: #e2e8f0 !important;
  }

  #main-content[data-betterquest-theme="light"] :is(
    #tabs-grades,
    #tabs-review,
    [data-betterquest-page="grades"],
    [data-betterquest-page="review"]
  ) :where(thead th) {
    background-color: #f1f5f9 !important;
    color: #000000 !important;
    border-color: #e2e8f0 !important;
  }

  #main-content[data-betterquest-theme="light"] :is(
    #tabs-grades,
    #tabs-review,
    [data-betterquest-page="grades"],
    [data-betterquest-page="review"]
  ) :where(tbody td, tbody th) {
    color: #000000 !important;
    border-color: #e2e8f0 !important;
  }

  #main-content[data-betterquest-theme="light"] :is(
    #tabs-grades,
    #tabs-review,
    [data-betterquest-page="grades"],
    [data-betterquest-page="review"]
  ) :where(.table-striped) tbody tr:nth-of-type(odd) {
    background-color: #f8fafc !important;
  }

  #main-content[data-betterquest-theme="light"] :is(
    #tabs-grades,
    #tabs-review,
    [data-betterquest-page="grades"],
    [data-betterquest-page="review"]
  ) :where(.card-header) {
    background-color: #f8fafc !important;
    color: #000000 !important;
    border-color: #e2e8f0 !important;
  }

  #main-content[data-betterquest-theme="light"] #panel-tabs:has(#student-grades-a.active) ~ #info-tab-data *:not(.material-icons):not(.badge-success):not(.badge-danger):not(.badge-warning):not(input):not(select):not(textarea):not(button:not(.btn-link)),
  #main-content[data-betterquest-theme="light"] #panel-tabs:has(#student-review-a.active) ~ #info-tab-data *:not(.material-icons):not(.badge-success):not(.badge-danger):not(.badge-warning):not(input):not(select):not(textarea):not(button:not(.btn-link)) {
    color: #000000 !important;
  }

  /* Meeting Time Presentation */
  .bq-meeting-time {
    display: flex !important;
    flex-direction: column !important;
    align-items: flex-start !important;
    gap: 2px !important;
    font-family: inherit;
    text-align: left !important;
  }
  .bq-meeting-days {
    display: block !important;
    font-size: 15px !important;
    font-weight: 650 !important;
    color: var(--bq-text, #18253a) !important;
    letter-spacing: -0.01em;
    line-height: 1.3 !important;
  }
  .bq-meeting-hours {
    display: block !important;
    font-size: 14px !important;
    font-weight: 500 !important;
    color: var(--bq-muted, #475569) !important;
    letter-spacing: 0.01em;
    white-space: nowrap !important;
    line-height: 1.3 !important;
    background: transparent !important;
    border: none !important;
    padding: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
  }
  #main-content[data-betterquest-theme="dark"] .bq-meeting-days {
    color: #ffffff !important;
  }
  #main-content[data-betterquest-theme="dark"] .bq-meeting-hours {
    color: #94a3b8 !important;
    background: transparent !important;
    border: none !important;
  }
  #main-content[data-betterquest-theme="light"] .bq-meeting-days {
    color: #000000 !important;
  }
  #main-content[data-betterquest-theme="light"] .bq-meeting-hours {
    color: #475569 !important;
    background: transparent !important;
    border: none !important;
  }

  /* =========================================================================
     COURSE DETAILS & HEADER FACELIFT
     ========================================================================= */
  #main-content #student-course-info-header {
    text-align: left;
    padding: 14px 20px 18px;
    background: transparent;
  }
  #main-content #student-course-info-header > .row.text-center,
  #main-content #student-course-info-header > .row {
    display: flex !important;
    flex-wrap: wrap !important;
    gap: 16px !important;
    margin: 0 !important;
    text-align: left !important;
    align-items: stretch !important;
  }
  #main-content #student-course-info-header > .row > .col {
    flex: 1 1 200px !important;
    max-width: 100% !important;
    padding: 12px 18px !important;
    border-radius: 8px !important;
    text-align: left !important;
    display: flex !important;
    flex-direction: column !important;
    justify-content: flex-start !important;
    align-items: flex-start !important;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05) !important;
    transition: transform .18s ease, box-shadow .18s ease;
  }
  #main-content #student-course-info-header > .row > .col:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08) !important;
  }
  #main-content #student-course-info-header > .row > .col:empty,
  #main-content #student-course-info-header > .row > .col.bq-col-empty {
    display: none !important;
  }
  #main-content #student-course-info-header > .row > .col.bq-col-instructor,
  #main-content #student-course-info-header > .row > .col:nth-child(1) {
    flex: 1 1 200px !important;
    max-width: 280px !important;
  }
  #main-content #student-course-info-header > .row > .col.bq-col-meets,
  #main-content #student-course-info-header > .row > .col:nth-child(2) {
    flex: 1.1 1 230px !important;
    max-width: 320px !important;
  }
  #main-content #student-course-info-header > .row > .col.bq-col-upcoming,
  #main-content #student-course-info-header > .row > .col:nth-child(3) {
    flex: 1.6 1 340px !important;
    max-width: none !important;
  }

  /* The card's backdrop art shows through these panels, so they stay hazy
     rather than solid \u2014 still opaque enough to read every line against. */
  #main-content[data-betterquest-theme="light"] #student-course-info-header > .row > .col,
  #main-content:not([data-betterquest-theme="dark"]) #student-course-info-header > .row > .col {
    background: rgba(255, 255, 255, 0.86) !important;
    border: 1px solid rgba(15, 23, 42, 0.10) !important;
    color: #0f172a !important;
    backdrop-filter: blur(18px) saturate(150%);
    -webkit-backdrop-filter: blur(18px) saturate(150%);
  }

  /* Dark mode course info card */
  #main-content[data-betterquest-theme="dark"] #student-course-info-header > .row > .col {
    background: rgba(13, 22, 38, 0.72) !important;
    border: 1px solid rgba(148, 163, 184, 0.22) !important;
    color: #ffffff !important;
    backdrop-filter: blur(18px) saturate(150%);
    -webkit-backdrop-filter: blur(18px) saturate(150%);
  }

  /* Labels (Instructor, Meets) inside course info */
  #main-content #student-course-info-header .qlabel {
    font-size: 11px !important;
    font-weight: 700 !important;
    text-transform: uppercase !important;
    letter-spacing: 0.06em !important;
    color: var(--bq-muted, #64748b) !important;
    margin-bottom: 6px !important;
    line-height: 1.2 !important;
  }
  #main-content[data-betterquest-theme="dark"] #student-course-info-header .qlabel {
    color: #94a3b8 !important;
  }
  #main-content[data-betterquest-theme="light"] #student-course-info-header .qlabel {
    color: #64748b !important;
  }

  /* Instructor Name */
  #main-content #student-course-info-header .bq-instructor-name,
  #main-content #student-course-info-header .col:first-child > div:not(.qlabel):not(.bq-contact-btn) {
    font-size: 15px !important;
    font-weight: 600 !important;
    line-height: 1.3 !important;
    margin-bottom: 8px !important;
  }
  #main-content[data-betterquest-theme="dark"] #student-course-info-header .bq-instructor-name,
  #main-content[data-betterquest-theme="dark"] #student-course-info-header .col:first-child > div:not(.qlabel):not(.bq-contact-btn) {
    color: #ffffff !important;
  }
  #main-content[data-betterquest-theme="light"] #student-course-info-header .bq-instructor-name,
  #main-content[data-betterquest-theme="light"] #student-course-info-header .col:first-child > div:not(.qlabel):not(.bq-contact-btn) {
    color: #0f172a !important;
  }

  /* Contact Button */
  .bq-contact-btn {
    display: inline-flex !important;
    align-items: center !important;
    gap: 6px !important;
    padding: 4px 10px !important;
    border-radius: 6px !important;
    font-size: 12px !important;
    font-weight: 600 !important;
    text-decoration: none !important;
    transition: all .18s ease !important;
    margin-top: 2px !important;
  }
  #main-content[data-betterquest-theme="dark"] .bq-contact-btn {
    background: rgba(56, 189, 248, 0.12) !important;
    border: 1px solid rgba(56, 189, 248, 0.28) !important;
    color: #38bdf8 !important;
  }
  #main-content[data-betterquest-theme="dark"] .bq-contact-btn:hover {
    background: rgba(56, 189, 248, 0.22) !important;
    color: #e0f2fe !important;
    transform: translateY(-1px);
  }
  #main-content[data-betterquest-theme="light"] .bq-contact-btn,
  #main-content:not([data-betterquest-theme="dark"]) .bq-contact-btn {
    background: #f0f9ff !important;
    border: 1px solid #bae6fd !important;
    color: #0284c7 !important;
  }
  #main-content[data-betterquest-theme="light"] .bq-contact-btn:hover,
  #main-content:not([data-betterquest-theme="dark"]) .bq-contact-btn:hover {
    background: #e0f2fe !important;
    color: #0369a1 !important;
    transform: translateY(-1px);
  }

  /* Course Location Badge */
  .bq-course-location {
    display: inline-flex !important;
    align-items: center !important;
    gap: 5px !important;
    margin-top: 8px !important;
    font-size: 12.5px !important;
    font-weight: 500 !important;
  }
  #main-content[data-betterquest-theme="dark"] .bq-course-location {
    color: #cbd5e1 !important;
  }
  #main-content[data-betterquest-theme="light"] .bq-course-location,
  #main-content:not([data-betterquest-theme="dark"]) .bq-course-location {
    color: #475569 !important;
  }

  /* Course Card Top Header (Title) */
  #main-content #target > .card > .card-header button[data-target="#student-course-info-header"] {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    padding: 12px 18px !important;
    text-decoration: none !important;
  }
  #main-content #target > .card > .card-header .h4 {
    font-size: 17px !important;
    font-weight: 650 !important;
    margin: 0 !important;
    letter-spacing: -0.01em !important;
  }

  /* Category Accordion Headers (Assignments, Review groups) */
  #main-content :is(#tabs-elements, #info-tab-data, #tabs-review) .card-header button[data-toggle="collapse"] {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    text-align: left !important;
    padding: 12px 18px !important;
    text-decoration: none !important;
    transition: background .18s ease !important;
  }
  #main-content :is(#tabs-elements, #info-tab-data, #tabs-review) .card-header .h4 {
    font-size: 14.5px !important;
    font-weight: 650 !important;
    margin: 0 !important;
    letter-spacing: -0.01em !important;
  }
  #main-content[data-betterquest-theme="dark"] :is(#tabs-elements, #info-tab-data, #tabs-review) .card-header button[data-toggle="collapse"] {
    color: #ffffff !important;
  }
  #main-content[data-betterquest-theme="dark"] :is(#tabs-elements, #info-tab-data, #tabs-review) .card-header button[data-toggle="collapse"]:hover {
    background: rgba(255, 255, 255, 0.04) !important;
  }
  #main-content[data-betterquest-theme="light"] :is(#tabs-elements, #info-tab-data, #tabs-review) .card-header button[data-toggle="collapse"],
  #main-content:not([data-betterquest-theme="dark"]) :is(#tabs-elements, #info-tab-data, #tabs-review) .card-header button[data-toggle="collapse"] {
    color: #0f172a !important;
  }
  #main-content[data-betterquest-theme="light"] :is(#tabs-elements, #info-tab-data, #tabs-review) .card-header button[data-toggle="collapse"]:hover,
  #main-content:not([data-betterquest-theme="dark"]) :is(#tabs-elements, #info-tab-data, #tabs-review) .card-header button[data-toggle="collapse"]:hover {
    background: rgba(0, 0, 0, 0.03) !important;
  }

  /* Smooth chevron rotation on accordion buttons */
  #main-content :is(#tabs-elements, #info-tab-data, #tabs-review, #target) button[data-toggle="collapse"] .material-icons {
    transition: transform .22s cubic-bezier(0.16, 1, 0.3, 1) !important;
  }
  #main-content :is(#tabs-elements, #info-tab-data, #tabs-review, #target) button[data-toggle="collapse"]:not(.collapsed) .material-icons {
    transform: rotate(45deg);
  }

  /* Assessment slides are document paper. Keep black equations and transparent question images readable in either theme. */
  #main-content #presentation-div :is(.instanceitempart,.bg-light) {
    background: #ffffff !important;
    color: #18253a !important;
    color-scheme: light;
  }
  #main-content #presentation-div .instanceitempart :where(p,span,label,h1,h2,h3,h4,h5,h6,mjx-container,.MathJax,.MathJax_Display) {
    color: #18253a !important;
  }
  #main-content #presentation-div .instanceitempart :where(img,svg,canvas) {
    filter: none !important;
    mix-blend-mode: normal !important;
    opacity: 1;
    color-scheme: light;
  }

  /* =========================================================================
     CUSTOM REVIEWS DASHBOARD & PRACTICE HUB
     ========================================================================= */
  .bq-review-dashboard {
    margin: 16px 0 28px 0 !important;
    padding: 24px !important;
    border-radius: 16px !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 20px !important;
    transition: background .2s ease, border-color .2s ease, box-shadow .2s ease !important;
  }
  #main-content[data-betterquest-theme="dark"] .bq-review-dashboard {
    background: linear-gradient(155deg, rgba(26, 36, 52, 0.88) 0%, rgba(16, 24, 37, 0.96) 100%) !important;
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
    box-shadow: 0 16px 36px -12px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.04) !important;
  }
  #main-content[data-betterquest-theme="light"] .bq-review-dashboard,
  #main-content:not([data-betterquest-theme="dark"]) .bq-review-dashboard {
    background: linear-gradient(155deg, #ffffff 0%, #f8fafc 100%) !important;
    border: 1px solid rgba(226, 232, 240, 0.95) !important;
    box-shadow: 0 12px 32px -10px rgba(0, 0, 0, 0.07), 0 2px 6px rgba(0, 0, 0, 0.03) !important;
  }

  #main-content .bq-review-summary {
    background:var(--bq-surface,#fff)!important;box-shadow:none!important;
    border:1px solid var(--bq-border,#d7e2f0)!important;gap:12px!important;
    padding:clamp(18px,3vw,28px)!important;
  }
  #main-content .bq-review-summary .bq-review-title{margin:0!important;font-size:24px!important}
  #main-content .bq-review-summary .bq-review-lead{margin:0!important;max-width:68ch}
  #main-content .bq-review-progress{display:flex;align-items:baseline;flex-wrap:wrap;gap:10px 20px;padding:18px 0 4px}
  #main-content .bq-review-count{margin:0!important;flex:1 1 260px;font-size:16px}
  #main-content .bq-review-count strong{font-size:28px;font-variant-numeric:tabular-nums}
  #main-content .bq-review-summary .bq-review-track{flex:1 0 100%;height:8px;margin:0!important;overflow:hidden}
  #main-content .bq-review-summary .bq-review-fill{background:linear-gradient(90deg,#2563eb,#3b82f6,#2563eb)!important;background-size:200% 100%!important;animation:bq-review-flow 3.5s linear infinite!important;box-shadow:none!important;transition:none!important}
  #main-content .bq-review-summary .bq-review-track:hover .bq-review-fill{animation-duration:1.2s!important}
  #main-content .bq-review-goal{margin:0!important;font-size:14px}
  #main-content .bq-review-tips{border-top:1px solid var(--bq-border,#d7e2f0);padding-top:16px;line-height:1.6}
  #main-content .bq-review-tips summary{cursor:pointer;font-weight:650}
  #main-content .bq-review-tips summary:focus-visible{outline:2px solid #2563eb;outline-offset:4px}
  #main-content .bq-review-tips p{max-width:70ch;margin:12px 0!important}
  #main-content .bq-review-tips ul{padding-left:20px;margin:0!important;max-width:70ch}
  #main-content .bq-review-tips li + li{margin-top:8px}

  /* 1. Hero Header */
  .bq-review-hero {
    display: flex !important;
    align-items: flex-start !important;
    justify-content: space-between !important;
    flex-wrap: wrap !important;
    gap: 16px !important;
  }
  .bq-review-hero-text {
    display: flex !important;
    flex-direction: column !important;
    gap: 6px !important;
  }
  .bq-review-badge {
    display: inline-flex !important;
    align-items: center !important;
    gap: 6px !important;
    align-self: flex-start !important;
    font-size: 11.5px !important;
    font-weight: 700 !important;
    text-transform: uppercase !important;
    letter-spacing: 0.06em !important;
    padding: 3px 10px !important;
    border-radius: 999px !important;
  }
  #main-content[data-betterquest-theme="dark"] .bq-review-badge {
    background: rgba(99, 102, 241, 0.18) !important;
    color: #a5b4fc !important;
    border: 1px solid rgba(129, 140, 248, 0.35) !important;
  }
  #main-content[data-betterquest-theme="light"] .bq-review-badge,
  #main-content:not([data-betterquest-theme="dark"]) .bq-review-badge {
    background: rgba(99, 102, 241, 0.1) !important;
    color: #4f46e5 !important;
    border: 1px solid rgba(99, 102, 241, 0.22) !important;
  }
  .bq-review-title {
    font-size: 22px !important;
    font-weight: 750 !important;
    letter-spacing: -0.025em !important;
    margin: 0 !important;
    line-height: 1.25 !important;
  }
  #main-content[data-betterquest-theme="dark"] .bq-review-title {
    color: #ffffff !important;
  }
  #main-content[data-betterquest-theme="light"] .bq-review-title,
  #main-content:not([data-betterquest-theme="dark"]) .bq-review-title {
    color: #0f172a !important;
  }
  .bq-review-lead {
    font-size: 13.5px !important;
    line-height: 1.5 !important;
    margin: 0 !important;
    max-width: 640px !important;
  }
  #main-content[data-betterquest-theme="dark"] .bq-review-lead {
    color: #94a3b8 !important;
  }
  #main-content[data-betterquest-theme="light"] .bq-review-lead,
  #main-content:not([data-betterquest-theme="dark"]) .bq-review-lead {
    color: #475569 !important;
  }

  /* 2. Stats & Progress Card */
  .bq-review-stats-card {
    padding: 20px 22px !important;
    border-radius: 14px !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 16px !important;
    transition: background .2s ease, border-color .2s ease !important;
  }
  #main-content[data-betterquest-theme="dark"] .bq-review-stats-card {
    background: rgba(18, 27, 41, 0.8) !important;
    border: 1px solid rgba(255, 255, 255, 0.07) !important;
  }
  #main-content[data-betterquest-theme="light"] .bq-review-stats-card,
  #main-content:not([data-betterquest-theme="dark"]) .bq-review-stats-card {
    background: #ffffff !important;
    border: 1px solid rgba(226, 232, 240, 0.85) !important;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03) !important;
  }

  .bq-review-stats-grid {
    display: grid !important;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)) !important;
    gap: 16px !important;
  }
  .bq-review-stat {
    display: flex !important;
    flex-direction: column !important;
    gap: 3px !important;
  }
  .bq-stat-label {
    font-size: 12px !important;
    font-weight: 600 !important;
    text-transform: uppercase !important;
    letter-spacing: 0.04em !important;
  }
  #main-content[data-betterquest-theme="dark"] .bq-stat-label {
    color: #94a3b8 !important;
  }
  #main-content[data-betterquest-theme="light"] .bq-stat-label,
  #main-content:not([data-betterquest-theme="dark"]) .bq-stat-label {
    color: #64748b !important;
  }

  .bq-stat-val-group {
    display: flex !important;
    align-items: baseline !important;
    gap: 6px !important;
  }
  .bq-stat-val {
    font-size: 26px !important;
    font-weight: 800 !important;
    line-height: 1.1 !important;
    letter-spacing: -0.025em !important;
  }
  #main-content[data-betterquest-theme="dark"] .bq-stat-val {
    color: #f8fafc !important;
  }
  #main-content[data-betterquest-theme="light"] .bq-stat-val,
  #main-content:not([data-betterquest-theme="dark"]) .bq-stat-val {
    color: #0f172a !important;
  }

  .bq-stat-val.bq-stat-accent {
    color: #6366f1 !important;
  }
  #main-content[data-betterquest-theme="dark"] .bq-stat-val.bq-stat-accent {
    color: #818cf8 !important;
  }

  .bq-stat-val.bq-stat-good {
    color: #0284c7 !important;
  }
  #main-content[data-betterquest-theme="dark"] .bq-stat-val.bq-stat-good {
    color: #38bdf8 !important;
  }

  .bq-stat-val.bq-stat-achieved {
    color: #10b981 !important;
  }
  #main-content[data-betterquest-theme="dark"] .bq-stat-val.bq-stat-achieved {
    color: #34d399 !important;
  }

  .bq-stat-denom {
    font-size: 14px !important;
    font-weight: 550 !important;
  }
  #main-content[data-betterquest-theme="dark"] .bq-stat-denom {
    color: #64748b !important;
  }
  #main-content[data-betterquest-theme="light"] .bq-stat-denom,
  #main-content:not([data-betterquest-theme="dark"]) .bq-stat-denom {
    color: #94a3b8 !important;
  }

  .bq-stat-sub {
    font-size: 11.5px !important;
    font-weight: 500 !important;
  }
  #main-content[data-betterquest-theme="dark"] .bq-stat-sub {
    color: #64748b !important;
  }
  #main-content[data-betterquest-theme="light"] .bq-stat-sub,
  #main-content:not([data-betterquest-theme="dark"]) .bq-stat-sub {
    color: #94a3b8 !important;
  }

  /* Progress Bar */
  .bq-review-track-wrapper {
    display: flex !important;
    flex-direction: column !important;
    gap: 8px !important;
    margin-top: 4px !important;
  }
  .bq-review-track {
    position: relative !important;
    height: 10px !important;
    border-radius: 999px !important;
    overflow: visible !important;
  }
  #main-content[data-betterquest-theme="dark"] .bq-review-track {
    background: rgba(255, 255, 255, 0.08) !important;
  }
  #main-content[data-betterquest-theme="light"] .bq-review-track,
  #main-content:not([data-betterquest-theme="dark"]) .bq-review-track {
    background: rgba(0, 0, 0, 0.06) !important;
  }

  .bq-review-fill {
    position: relative !important;
    height: 100% !important;
    border-radius: 999px !important;
    background: linear-gradient(90deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%) !important;
    background-size: 200% 100% !important;
    animation: bq-review-flow 4s linear infinite !important;
    transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1) !important;
  }
  .bq-review-track:hover .bq-review-fill {
    animation-duration: 1.2s !important;
  }
  @keyframes bq-review-flow {
    to { background-position: -200% 0; }
  }
  .bq-review-glow {
    position: absolute !important;
    right: 0 !important;
    top: 50% !important;
    transform: translateY(-50%) !important;
    width: 14px !important;
    height: 14px !important;
    border-radius: 50% !important;
    background: #a855f7 !important;
    box-shadow: 0 0 12px 3px rgba(168, 85, 247, 0.65) !important;
    opacity: 0.9 !important;
  }

  .bq-review-target-tick {
    position: absolute !important;
    top: -4px !important;
    transform: translateX(-50%) !important;
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    pointer-events: none !important;
    z-index: 2 !important;
  }
  .bq-target-tick-line {
    width: 2px !important;
    height: 18px !important;
    background: #f59e0b !important;
    border-radius: 1px !important;
  }
  .bq-target-tick-badge {
    position: absolute !important;
    bottom: 20px !important;
    font-size: 10px !important;
    font-weight: 700 !important;
    padding: 1px 5px !important;
    border-radius: 4px !important;
    white-space: nowrap !important;
    background: #f59e0b !important;
    color: #ffffff !important;
    box-shadow: 0 2px 6px rgba(245, 158, 11, 0.4) !important;
  }

  .bq-review-milestones {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    font-size: 11.5px !important;
    font-weight: 550 !important;
  }
  #main-content[data-betterquest-theme="dark"] .bq-milestone-item {
    color: #64748b !important;
  }
  #main-content[data-betterquest-theme="light"] .bq-milestone-item,
  #main-content:not([data-betterquest-theme="dark"]) .bq-milestone-item {
    color: #94a3b8 !important;
  }
  .bq-milestone-highlight {
    font-weight: 650 !important;
  }
  #main-content[data-betterquest-theme="dark"] .bq-milestone-highlight {
    color: #f59e0b !important;
  }
  #main-content[data-betterquest-theme="light"] .bq-milestone-highlight,
  #main-content:not([data-betterquest-theme="dark"]) .bq-milestone-highlight {
    color: #d97706 !important;
  }

  /* 3. Research Insights Grid */
  .bq-review-insights-grid {
    display: grid !important;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)) !important;
    gap: 14px !important;
  }
  .bq-insight-card {
    padding: 18px 20px !important;
    border-radius: 12px !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 10px !important;
    transition: transform .18s ease, box-shadow .18s ease !important;
  }
  .bq-insight-card:hover {
    transform: translateY(-2px) !important;
  }
  #main-content[data-betterquest-theme="dark"] .bq-insight-card {
    background: rgba(18, 27, 41, 0.6) !important;
    border: 1px solid rgba(255, 255, 255, 0.06) !important;
  }
  #main-content[data-betterquest-theme="dark"] .bq-insight-card:hover {
    border-color: rgba(255, 255, 255, 0.12) !important;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3) !important;
  }
  #main-content[data-betterquest-theme="light"] .bq-insight-card,
  #main-content:not([data-betterquest-theme="dark"]) .bq-insight-card {
    background: #ffffff !important;
    border: 1px solid rgba(226, 232, 240, 0.8) !important;
  }
  #main-content[data-betterquest-theme="light"] .bq-insight-card:hover,
  #main-content:not([data-betterquest-theme="dark"]) .bq-insight-card:hover {
    border-color: rgba(203, 213, 225, 1) !important;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.05) !important;
  }

  .bq-insight-top {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
  }
  .bq-insight-icon {
    width: 32px !important;
    height: 32px !important;
    border-radius: 8px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
  }
  .bq-insight-icon.bq-icon-accent {
    background: rgba(99, 102, 241, 0.15) !important;
    color: #818cf8 !important;
  }
  #main-content[data-betterquest-theme="light"] .bq-insight-icon.bq-icon-accent {
    background: rgba(99, 102, 241, 0.1) !important;
    color: #4f46e5 !important;
  }
  .bq-insight-icon.bq-icon-good {
    background: rgba(16, 185, 129, 0.15) !important;
    color: #34d399 !important;
  }
  #main-content[data-betterquest-theme="light"] .bq-insight-icon.bq-icon-good {
    background: rgba(16, 185, 129, 0.1) !important;
    color: #059669 !important;
  }
  .bq-insight-icon.bq-icon-amber {
    background: rgba(245, 158, 11, 0.15) !important;
    color: #fbbf24 !important;
  }
  #main-content[data-betterquest-theme="light"] .bq-insight-icon.bq-icon-amber {
    background: rgba(245, 158, 11, 0.1) !important;
    color: #d97706 !important;
  }

  .bq-insight-pill {
    font-size: 11px !important;
    font-weight: 700 !important;
    letter-spacing: 0.03em !important;
    padding: 3px 8px !important;
    border-radius: 999px !important;
  }
  .bq-pill-accent {
    background: rgba(99, 102, 241, 0.15) !important;
    color: #818cf8 !important;
    border: 1px solid rgba(129, 140, 248, 0.3) !important;
  }
  #main-content[data-betterquest-theme="light"] .bq-pill-accent {
    background: rgba(99, 102, 241, 0.08) !important;
    color: #4f46e5 !important;
    border: 1px solid rgba(99, 102, 241, 0.2) !important;
  }
  .bq-pill-good {
    background: rgba(16, 185, 129, 0.15) !important;
    color: #34d399 !important;
    border: 1px solid rgba(52, 211, 153, 0.3) !important;
  }
  #main-content[data-betterquest-theme="light"] .bq-pill-good {
    background: rgba(16, 185, 129, 0.08) !important;
    color: #059669 !important;
    border: 1px solid rgba(16, 185, 129, 0.2) !important;
  }
  .bq-pill-amber {
    background: rgba(245, 158, 11, 0.15) !important;
    color: #fbbf24 !important;
    border: 1px solid rgba(251, 191, 36, 0.3) !important;
  }
  #main-content[data-betterquest-theme="light"] .bq-pill-amber {
    background: rgba(245, 158, 11, 0.08) !important;
    color: #d97706 !important;
    border: 1px solid rgba(245, 158, 11, 0.2) !important;
  }

  .bq-insight-title {
    font-size: 15px !important;
    font-weight: 700 !important;
    margin: 0 !important;
    line-height: 1.3 !important;
    letter-spacing: -0.01em !important;
  }
  #main-content[data-betterquest-theme="dark"] .bq-insight-title {
    color: #ffffff !important;
  }
  #main-content[data-betterquest-theme="light"] .bq-insight-title,
  #main-content:not([data-betterquest-theme="dark"]) .bq-insight-title {
    color: #0f172a !important;
  }

  .bq-insight-desc {
    font-size: 13px !important;
    line-height: 1.55 !important;
    margin: 0 !important;
  }
  #main-content[data-betterquest-theme="dark"] .bq-insight-desc {
    color: #94a3b8 !important;
  }
  #main-content[data-betterquest-theme="dark"] .bq-insight-desc strong {
    color: #e2e8f0 !important;
  }
  #main-content[data-betterquest-theme="light"] .bq-insight-desc,
  #main-content:not([data-betterquest-theme="dark"]) .bq-insight-desc {
    color: #475569 !important;
  }
  #main-content[data-betterquest-theme="light"] .bq-insight-desc strong,
  #main-content:not([data-betterquest-theme="dark"]) .bq-insight-desc strong {
    color: #0f172a !important;
  }

  /* Native buttons and tables elevation inside Review pane */
  .bq-review-btn-elevated {
    display: inline-flex !important;
    align-items: center !important;
    gap: 8px !important;
    padding: 10px 18px !important;
    font-size: 13.5px !important;
    font-weight: 650 !important;
    border-radius: 8px !important;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25) !important;
    transition: transform .16s ease, box-shadow .16s ease !important;
  }
  .bq-review-btn-elevated:hover {
    transform: translateY(-1px) !important;
    box-shadow: 0 6px 18px rgba(59, 130, 246, 0.35) !important;
  }

  .bq-reviews-table {
    border-collapse: separate !important;
    border-spacing: 0 !important;
    border-radius: 10px !important;
    overflow: hidden !important;
    margin-top: 14px !important;
  }
`;

  // .preview/card-demo.ts
  function setTheme(value) {
    document.body.setAttribute("data-betterquest-theme", value);
    document.getElementById("main-content").setAttribute("data-betterquest-theme", value);
    const button = document.getElementById("theme");
    button.textContent = value === "dark" ? "Switch to light" : "Switch to dark";
  }
  function boot() {
    const style = document.createElement("style");
    style.textContent = QUEST_DARK_STYLES;
    document.head.append(style);
    rememberCourseCodes([{
      row: null,
      artworkCell: null,
      nativeImage: null,
      departmentCode: "M",
      courseCode: "M 408C",
      courseUnique: "58360",
      courseParam: "9001"
    }]);
    const target = document.getElementById("target");
    const course = {
      id: "course-58360",
      sourceId: "58360",
      title: "DIFFEREN AND INTEGRAL CALCULUS",
      url: "https://quest.cns.utexas.edu/student/courses/show?course=9001"
    };
    const assignment = (id, title, iso) => ({
      id,
      sourceId: id,
      courseId: course.id,
      title,
      url: "https://quest.cns.utexas.edu/student/instances/route?instance=x",
      deadline: { iso, label: null, timeZone: "America/Chicago" },
      completion: "not-started",
      kind: "homework",
      historical: null
    });
    const rows = [
      assignment("a1", "Problem Set 4 \u2014 Integrals", "2026-10-08T23:59:00.000Z"),
      assignment("a2", "Midterm 2 Review Sheet", "2026-10-15T23:59:00.000Z"),
      assignment("a3", "WebWork 9", "2026-10-17T23:59:00.000Z")
    ];
    const state = {
      schemaVersion: 1,
      cache: {
        courses: [course],
        assignments: rows,
        pages: [{
          sourceUrl: "https://quest.cns.utexas.edu/student/courses/show?course=9001",
          observedAt: "2026-10-11T12:00:00.000Z",
          courseIds: [course.id],
          assignmentIds: rows.map((row) => row.id),
          scannedCourseIds: [course.id]
        }],
        refreshRequestedAt: null
      },
      completionOverrides: {},
      bookmarks: [],
      study: [],
      preferences: { theme: "system" }
    };
    const section = createAssignmentSection(
      target,
      (async (request) => request.kind === "state:read" ? state : null),
      (callback) => {
        callback();
        return () => {
        };
      }
    );
    section.refresh(course);
    enhanceCourseInfoCard(target);
    enhanceCourseHero(target);
    setTheme("dark");
    document.getElementById("theme").addEventListener("click", () => {
      const current = document.getElementById("main-content").getAttribute("data-betterquest-theme");
      setTheme(current === "dark" ? "light" : "dark");
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
