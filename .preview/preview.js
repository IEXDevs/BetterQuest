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
  function courseArtKey(identity) {
    const code = (identity.code || "").replace(/\s+/g, "").toUpperCase();
    const unique = (identity.unique || "").replace(/\s+/g, "");
    const department = (identity.departmentCode || "").replace(/\s+/g, "").toUpperCase();
    return `${code || department || "UT"}#${unique || "0"}`;
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

  // src/adapters/quest/homepage.ts
  function departmentFromCourseCode(courseCode) {
    const prefix = courseCode.toUpperCase().match(/^\s*([A-Z][A-Z\s]{0,7}?)\s*\d/);
    return (prefix?.[1] || courseCode.match(/[A-Za-z]+/)?.[0] || "UT").replace(/\s+/g, "").slice(0, 5) || "UT";
  }

  // .preview/preview.ts
  var ROSTER = [
    ["M 408C", "58360"],
    ["M 408D", "58361"],
    ["CH 301", "58735"],
    ["CH 312", "51201"],
    ["CS 312", "54100"],
    ["CS 314", "54101"],
    ["BIO 311", "33010"],
    ["GOV 312", "32100"],
    ["PHY 303K", "56410"],
    ["UT 303", "47100"],
    ["ECON 304", "40200"],
    ["PSY 341", "21100"]
  ];
  function build(code, unique, kind) {
    const departmentCode = departmentFromCourseCode(code);
    const [deep, bright, paper] = palette(departmentCode);
    const solid = solidColor(departmentCode);
    const artKey = courseArtKey({ code, unique, departmentCode });
    const fx = courseEffect(artKey);
    const mood = courseArtMood(artKey);
    const host = document.createElement("div");
    host.style.cssText = kind === "card" ? "width:96px;height:96px" : "width:520px;height:118px";
    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = `
    :host{display:block}
    *{box-sizing:border-box}
    .art{
      position:relative;isolation:isolate;display:flex;width:100%;height:100%;
      align-items:flex-end;overflow:hidden;border-radius:10px;background:#09090d;
      box-shadow:0 10px 26px rgba(0,0,0,.45), inset 0 0 0 1px rgba(255,255,255,.16);
      color:#fff;text-align:left;padding:${kind === "card" ? "0 10px 9px" : "16px 20px"};
    }
    .fx-layer{position:absolute;top:-45%;left:-45%;width:190%;height:190%;z-index:1;overflow:hidden;pointer-events:none;filter:hue-rotate(var(--fx-hue,0deg))}
    .vignette{position:absolute;inset:0;z-index:2;pointer-events:none;
      background:linear-gradient(to top,rgba(6,8,12,.88) 0%,rgba(6,8,12,.28) 60%,transparent 100%)}
    .copy{position:relative;z-index:3;text-shadow:0 1px 4px rgba(0,0,0,.9),0 2px 10px rgba(0,0,0,.55)}
    .department{display:block;font:850 ${kind === "card" ? "26px" : "30px"}/0.9 ui-rounded,'Avenir Next',sans-serif;letter-spacing:-.05em}
    .code{display:block;margin-top:5px;font:650 ${kind === "card" ? "9px" : "12px"}/1.25 ui-rounded,'Avenir Next',sans-serif;letter-spacing:.02em;color:rgba(255,255,255,.88)}
    .unique{font:850 ${kind === "card" ? "10px" : "28px"}/0.95 ui-rounded,sans-serif;color:rgba(255,255,255,.95)}
  ` + COURSE_EFFECT_CSS;
    const art = document.createElement("div");
    art.className = "art";
    art.style.setProperty("--fx-deep", deep);
    art.style.setProperty("--fx-bright", bright);
    art.style.setProperty("--fx-paper", paper);
    art.style.setProperty("--fx-solid", solid);
    art.style.setProperty("--fx-hue", `${mood.hue}deg`);
    art.style.setProperty("--fx-delay", `${mood.delay}s`);
    const artBg = document.createElement("span");
    artBg.className = `art-bg fx-${fx}`;
    const fxLayer = document.createElement("div");
    fxLayer.className = "fx-layer";
    const vignette = document.createElement("span");
    vignette.className = "vignette";
    const copy = document.createElement("div");
    copy.className = "copy";
    const dept = document.createElement("span");
    dept.className = "department";
    dept.textContent = departmentCode;
    const nameEl = document.createElement("span");
    nameEl.className = "code";
    nameEl.textContent = code.replace(/\s+/g, "");
    copy.append(dept, nameEl);
    if (kind === "hero") {
      const u = document.createElement("span");
      u.className = "unique";
      u.textContent = unique;
      copy.style.display = "flex";
      copy.style.justifyContent = "space-between";
      copy.style.alignItems = "flex-end";
      copy.style.width = "100%";
      copy.append(u);
    }
    art.append(artBg, fxLayer, vignette, copy);
    shadow.append(style, art);
    return host;
  }
  var app = document.getElementById("app");
  var heroGrid = document.getElementById("heroes");
  var cardGrid = document.getElementById("cards");
  for (const [code, unique] of ROSTER) {
    const cell = document.createElement("figure");
    const cap = document.createElement("figcaption");
    cap.textContent = `${code} \u2192 ${courseEffect(courseArtKey({ code, unique, departmentCode: departmentFromCourseCode(code) }))}`;
    cell.append(cap, build(code, unique, "hero"));
    heroGrid.append(cell);
    const cardCell = document.createElement("figure");
    cardCell.append(build(code, unique, "card"));
    cardGrid.append(cardCell);
  }
  app.dataset.ready = "1";
})();
