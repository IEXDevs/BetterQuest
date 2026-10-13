/** The only backgrounds BetterQuest may draw: the curated effect set
 *  (MicroSlats, Ghost Fibres, CRT Warp, Scanner, Light Fall,
 *  Ferrofluid, Line Waves, Radar, Magic Rings, Floating Lines, Grid Scan,
 *  Gradient Blinds, Iridescence, Letter Glitch, Strands) plus the two course
 *  arts used on the marketing preview (LiquidEther, PixelBlast). Course cards
 *  and the course hero pick deterministically from this allowlist — nothing else.
 *  The pick is keyed by the *course*, so every course gets its own backdrop and
 *  the same course looks the same in every view.
 *
 *  These CSS layers are the *fallback* rendering: `./reactbits` ports the real
 *  react-bits implementations (WebGL/canvas) of the same 17 effects and is
 *  mounted over this art whenever the environment can render it. */

export type CourseEffect =
  | 'ether' | 'pixel'
  | 'micro-slats' | 'ghost-fibres' | 'crt-warp'
  | 'scanner' | 'light-fall' | 'ferrofluid' | 'line-waves'
  | 'radar' | 'magic-rings' | 'floating-lines' | 'grid-scan'
  | 'gradient-blinds' | 'iridescence' | 'letter-glitch' | 'strands';

export const COURSE_EFFECTS: readonly CourseEffect[] = [
  'ether', 'pixel', 'micro-slats', 'ghost-fibres', 'crt-warp',
  'scanner', 'light-fall', 'ferrofluid', 'line-waves', 'radar', 'magic-rings',
  'floating-lines', 'grid-scan', 'gradient-blinds', 'iridescence', 'letter-glitch', 'strands',
];

export function isCourseEffect(value: unknown): value is CourseEffect {
  return typeof value === 'string' && (COURSE_EFFECTS as readonly string[]).includes(value);
}

/** What identifies a course for artwork purposes. Quest prints the unique
 *  number on the homepage table *and* on the opened course page, so it is the
 *  one id every view can agree on; the short name is the human-readable part. */
export interface CourseArtIdentity {
  /** Course short name as Quest prints it, e.g. "M 408C". */
  code?: string | null;
  /** Quest unique number, e.g. "58735". */
  unique?: string | null;
  /** Department code; the last-resort fallback when a page prints neither. */
  departmentCode?: string | null;
}

function hashOf(code: string): number {
  let hash = 0; for (const character of code) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return hash;
}

/** One stable key per course, so the homepage card, the course hero, and any
 *  later view agree on the same backdrop for the same course. */
export function courseArtKey(identity: CourseArtIdentity): string {
  const code = (identity.code || '').replace(/\s+/g, '').toUpperCase();
  const unique = (identity.unique || '').replace(/\s+/g, '');
  const department = (identity.departmentCode || '').replace(/\s+/g, '').toUpperCase();
  return `${code || department || 'UT'}#${unique || '0'}`;
}

/** Every course hashes to its own backdrop out of the whole allowlist, and
 *  the same course always lands on the same one in every view. */
export function courseEffect(courseKey: string): CourseEffect {
  return COURSE_EFFECTS[hashOf(courseKey) % COURSE_EFFECTS.length];
}

/** Two courses can still land on the same backdrop family, so every course
 *  also gets its own hue drift and animation phase: a shared effect reads as
 *  two different pieces of art, and nothing on the page pulses in lockstep. */
export interface CourseArtMood { /** degrees of hue drift, -18..18 */ hue: number; /** negative seconds, -7..0 */ delay: number }

export function courseArtMood(courseKey: string): CourseArtMood {
  const hash = hashOf(`mood:${courseKey}`);
  return { hue: -18 + (hash % 37), delay: -((hash >>> 9) % 7000) / 1000 };
}

const PALETTES: Record<string, [string, string, string]> = {
  M: ['#2e1065', '#a855f7', '#f3e8ff'],
  CS: ['#2457a7', '#58b7db', '#eef7ff'],
  CH: ['#064e3b', '#10b981', '#ecfdf5'],
  BIO: ['#25634d', '#64a881', '#ecf8f1'],
  GOV: ['#722f37', '#c1626a', '#fff0f1'],
  PHY: ['#3d3b8e', '#7a77d9', '#f1f0ff'],
};

const SOLID_COLORS: Record<string, string> = {
  M: '#4c1d95',   // Rich solid purple
  CS: '#1e3a8a',  // Deep solid cobalt blue
  CH: '#065f46',  // Deep solid emerald green
  BIO: '#14532d', // Deep solid forest green
  GOV: '#881337', // Deep solid burgundy
  PHY: '#312e81', // Deep solid indigo
};

/** Solid department color used when animations are off. */
export function solidColor(code: string): string {
  if (SOLID_COLORS[code]) return SOLID_COLORS[code];
  return `hsl(${hashOf(code) % 360} 60% 24%)`;
}

/** [deep, bright, paper] palette for a department code. */
export function palette(code: string): [string, string, string] {
  if (PALETTES[code]) return PALETTES[code];
  const hue = hashOf(code) % 360;
  return [`hsl(${hue} 58% 32%)`, `hsl(${(hue + 28) % 360} 62% 57%)`, `hsl(${hue} 55% 95%)`];
}

/** Effect layers for `.art-bg` elements. Consumers set the palette vars
 *  (--fx-deep/--fx-bright/--fx-paper/--fx-solid) plus the per-course mood vars
 *  (--fx-hue/--fx-delay) on an ancestor and add `fx-{effect}` to the `.art-bg`
 *  element itself.
 *
 *  Each layer is drawn 190% wide and tall, anchored above and left of the box,
 *  so the pattern overflows past all four edges and is clipped by the card's
 *  own `overflow: hidden`: the art reaches the corners and the motion has room
 *  to travel instead of sliding around inside a 1:1 crop. */
export const COURSE_EFFECT_CSS = `
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

  /* LiquidEther — drifting fluid glow anchored to opposing corners. */
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

  /* PixelBlast — pixel-grid shimmer lit from two corners. */
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

  /* MicroSlats — hairline slats with a passing light sweep. */
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

  /* Ghost Fibres — soft blurred fibre strands swaying. */
  .fx-ghost-fibres {
    background:
      repeating-linear-gradient(85deg, transparent 0 14px, rgba(255,255,255,.10) 14px 15px, transparent 15px 30px),
      repeating-linear-gradient(80deg, transparent 0 22px, var(--fx-bright) 22px 23px, transparent 23px 44px),
      linear-gradient(180deg, var(--fx-deep), #0a0f16);
    filter: blur(1px) hue-rotate(var(--fx-hue, 0deg));
    animation: bq-fx-fibres 8s ease-in-out infinite alternate;
  }

  /* CRT Warp — scanlines with the tube darkening pushed into the corners. */
  .fx-crt-warp {
    background:
      radial-gradient(ellipse at 50% 45%, transparent 26%, rgba(0,0,0,.62) 52%),
      repeating-linear-gradient(0deg, rgba(0,0,0,.35) 0 1px, transparent 1px 3px),
      linear-gradient(120deg, var(--fx-deep) 60%, var(--fx-bright));
    animation: bq-fx-crt 4s steps(8) infinite;
  }

  /* Scanner — bright bar sweeping down the surface. */
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

  /* Light Fall — rays raining down from the top corners. */
  .fx-light-fall {
    background:
      repeating-linear-gradient(112deg, transparent 0 26px, rgba(255,255,255,.08) 26px 27px, transparent 27px 52px),
      linear-gradient(152deg, var(--fx-bright) -35%, var(--fx-deep) 55%, #07090f 100%);
    animation: bq-fx-fall 7s linear infinite;
  }

  /* Ferrofluid — spiky liquid metal mound breathing. */
  .fx-ferrofluid {
    background:
      repeating-conic-gradient(from 8deg at 50% 62%, var(--fx-deep) 0deg 2.2deg, transparent 2.2deg 7deg),
      radial-gradient(circle at 50% 62%, var(--fx-bright) 0%, var(--fx-deep) 26%, #05070b 62%);
    animation: bq-fx-ferro 6s ease-in-out infinite alternate;
  }

  /* Line Waves — rippling parallel lines. */
  .fx-line-waves {
    background:
      repeating-linear-gradient(0deg, transparent 0 12px, rgba(255,255,255,.13) 12px 13px, transparent 13px 26px),
      repeating-linear-gradient(0deg, transparent 0 24px, var(--fx-bright) 24px 25px, transparent 25px 52px),
      linear-gradient(180deg, var(--fx-deep), #080c12);
    filter: blur(.6px) hue-rotate(var(--fx-hue, 0deg));
    animation: bq-fx-waves 9s ease-in-out infinite alternate;
  }

  /* Radar — range rings under a rotating sweep. */
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

  /* Magic Rings — concentric rings pulsing outward. */
  .fx-magic-rings {
    background:
      repeating-radial-gradient(circle at 50% 58%, transparent 0 10px, var(--fx-bright) 10px 11px, transparent 11px 22px),
      radial-gradient(circle at 50% 58%, var(--fx-deep), #06070c 70%);
    opacity: .9;
    animation: bq-fx-rings 5s ease-in-out infinite;
  }

  /* Floating Lines — diagonal lines drifting past. */
  .fx-floating-lines {
    background:
      repeating-linear-gradient(48deg, transparent 0 18px, rgba(255,255,255,.09) 18px 19px, transparent 19px 36px),
      linear-gradient(120deg, var(--fx-deep), #090d14);
    animation: bq-fx-float 10s linear infinite;
  }

  /* Grid Scan — technical grid with a roaming highlight. */
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

  /* Gradient Blinds — slatted gradient bands catching light from a corner. */
  .fx-gradient-blinds {
    background:
      linear-gradient(200deg, rgba(255,255,255,.10), transparent 45%),
      repeating-linear-gradient(90deg, var(--fx-deep) 0 10px, var(--fx-bright) 10px 12px, #0a0e15 12px 22px);
    animation: bq-fx-blinds 7s ease-in-out infinite alternate;
  }

  /* Iridescence — rotating prism shimmer. */
  .fx-iridescence {
    background:
      radial-gradient(circle at 50% 50%, rgba(255,255,255,.14) 0%, transparent 55%),
      conic-gradient(from 0deg at 50% 50%, #f0abfc, #a5b4fc, #7dd3fc, #9ae6c4, #fde68a, #fca5a5, #f0abfc);
    filter: blur(8px) saturate(1.1) hue-rotate(var(--fx-hue, 0deg));
    opacity: .8;
    animation: bq-fx-iris 9s linear infinite;
  }

  /* Letter Glitch — digital blocks jittering with hue splits. */
  .fx-letter-glitch {
    background:
      repeating-linear-gradient(90deg, rgba(255,255,255,.11) 0 5px, transparent 5px 11px),
      repeating-linear-gradient(0deg, transparent 0 8px, rgba(255,255,255,.06) 8px 9px, transparent 9px 17px),
      linear-gradient(135deg, var(--fx-deep), #08090f);
    animation: bq-fx-glitch .9s steps(3) infinite;
  }

  /* Strands — braided flowing strands. */
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
