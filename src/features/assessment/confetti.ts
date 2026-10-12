/**
 * Full-screen verdict walls: a clean backdrop with a rippling wall of
 * checkmarks (correct) or frowning faces (wrong) and a mascot badge in the
 * center — a smiley face, or a cat. Entry, hold, and exit run for
 * exactly 3 seconds using the Web Animations API.
 *
 * Everything is styled inline so the verdict renders even if no stylesheet
 * ever arrives, and the layer lives inside the fullscreen element when one is
 * active (the top layer hides everything outside it).
 *
 * Mascot images are optional: drop verdict-happy.png and verdict-sad.png into
 * public/assets/ and the badge swaps the built-in emoji for them once the
 * entry animation is done. The whole show turns off with the Answer
 * celebrations setting (data-betterquest-celebrations="disabled").
 */

const TOTAL_MS = 3000;
const EXIT_AT_MS = 2400;
const MASCOT_AT_MS = 850;
const SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';
const EASE_IN = 'cubic-bezier(0.7, 0, 0.84, 0)';

type Tone = 'correct' | 'wrong';

const TONE = {
  correct: {
    backdrop: 'rgba(243,244,246,0.96)',
    glyph: '\u2713',
    glyphColor: '#16a34a',
    ring: 'rgba(22,163,74,0.5)',
    face: '\u{1F604}',
    asset: 'assets/verdict-happy.png',
    log: '[BetterQuest] Correct — checkmark wall up for 3 seconds.',
  },
  wrong: {
    backdrop: 'rgba(254,242,242,0.96)',
    glyph: '\u2639',
    glyphColor: '#dc2626',
    ring: 'rgba(220,38,38,0.45)',
    face: '\u{1F63F}',
    asset: 'assets/verdict-sad.png',
    log: '[BetterQuest] Wrong — sad face wall up for 3 seconds.',
  },
} as const;

export const WHIMSY_CORRECT_ASSETS = [
  'correct.png',
  'correct2.png',
  'correct3.png',
  'correct4.png',
  'correct5.png',
  'correct6.png',
  'correct7.png',
  'correct8.png',
] as const;

export const WHIMSY_WRONG_ASSETS = [
  'wrong1.png',
  'wrong2.png',
  'wrong3.png',
  'wrong4.png',
  'wrong5.png',
  'wrong6.png',
  'wrong7.png',
] as const;

function celebrationsDisabled(doc: Document): boolean {
  const explicit = doc.documentElement?.dataset.betterquestCelebrations === 'disabled';
  const animationsOff = doc.documentElement?.dataset.betterquestAnimations === 'disabled';
  const whimsyOff = doc.documentElement?.dataset.betterquestWhimsy === 'disabled';
  return explicit || (animationsOff && whimsyOff);
}

function whimsyEnabled(doc: Document): boolean {
  return doc.documentElement?.dataset.betterquestWhimsy !== 'disabled';
}

function prefersCalm(view: Window, doc?: Document): boolean {
  if (doc && whimsyEnabled(doc)) return false;
  if (doc?.documentElement?.dataset.betterquestAnimations === 'disabled') return true;
  try { return Boolean(view.matchMedia?.('(prefers-reduced-motion: reduce)').matches); } catch { return false; }
}

function randomWhimsyAsset(tone: Tone): string {
  const pool = tone === 'correct' ? WHIMSY_CORRECT_ASSETS : WHIMSY_WRONG_ASSETS;
  return pool[Math.floor(Math.random() * pool.length)];
}

function extensionAsset(path: string): string | null {
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) return chrome.runtime.getURL(path);
  } catch { /* not in an extension context */ }
  return null;
}

function showVerdictWall(host: HTMLElement, tone: Tone): void {
  const doc = host.ownerDocument;
  const view = doc.defaultView;
  if (!view) {
    console.warn('[BetterQuest] Verdict skipped: no window on this page.');
    return;
  }
  const spec = TONE[tone];
  const calm = prefersCalm(view, doc);
  const whimsy = whimsyEnabled(doc);

  const layer = doc.createElement('div');
  layer.className = tone === 'correct' ? 'bq-celebration' : 'bq-screen-flash';
  layer.setAttribute('aria-hidden', 'true');
  layer.style.cssText =
    'position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;' +
    `pointer-events:none;background:${spec.backdrop};`;

  // The wall: a full-viewport grid of glyphs that ripples out from the center.
  const cols = Math.max(6, Math.round((view.innerWidth || 1024) / 110));
  const rows = Math.max(4, Math.round((view.innerHeight || 768) / 110));
  const wall = doc.createElement('div');
  wall.style.cssText =
    'position:absolute;inset:0;display:grid;' +
    `grid-template-columns:repeat(${cols},1fr);grid-auto-rows:1fr;`;
  const mid = { x: (cols - 1) / 2, y: (rows - 1) / 2 };
  const maxDist = Math.hypot(mid.x, mid.y) || 1;
  const tiles: { el: HTMLElement; dist: number }[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const tile = doc.createElement('div');
      tile.className = 'bq-verdict-tile';
      tile.style.cssText =
        'display:grid;place-items:center;font-family:ui-rounded,"Avenir Next",sans-serif;' +
        `font-size:min(4.2vw,7vh);color:${spec.glyphColor};font-weight:800;` +
        `opacity:${(row + col) % 2 ? 0.55 : 0.85};`;
      tile.textContent = spec.glyph;
      wall.append(tile);
      tiles.push({ el: tile, dist: Math.hypot(col - mid.x, row - mid.y) });
    }
  }
  layer.append(wall);

  // The badge: the emoji mascot shows right away; the packaged image takes
  // over once it loads (attached after the entry animation, so it never
  // competes with the pop-in).
  const badge = doc.createElement('div');
  badge.className = 'bq-badge';
  const badgeSize = 'min(34vmin,230px)';
  badge.style.cssText =
    `position:relative;width:${badgeSize};height:${badgeSize};border-radius:50%;background:#fff;display:grid;place-items:center;overflow:hidden;` +
    `box-shadow:0 20px 70px rgba(15,23,42,.22),0 0 0 8px ${spec.ring};`;
  const face = doc.createElement('div');
  face.className = 'bq-badge-face';
  face.style.cssText = 'display:grid;place-items:center;font-size:min(16vmin,104px);line-height:1;user-select:none;';
  face.textContent = spec.face;

  if (whimsy) {
    const asset = randomWhimsyAsset(tone);
    const url = extensionAsset(asset) || extensionAsset(`assets/${asset}`);
    if (url) {
      const img = doc.createElement('img');
      img.alt = tone === 'correct' ? 'Correct answer' : 'Incorrect answer';
      img.className = 'bq-whimsy-img';
      img.style.cssText =
        'position:absolute;inset:0;width:100%;height:100%;object-fit:contain;border-radius:50%;padding:10px;box-sizing:border-box;';
      img.src = url;
      img.addEventListener('error', () => {
        img.remove();
        if (!badge.contains(face)) badge.append(face);
      }, { once: true });
      badge.append(img);
    } else {
      badge.append(face);
    }
  } else {
    badge.append(face);
  }
  layer.append(badge);

  host.append(layer);
  console.info(spec.log);

  const animatable = typeof layer.animate === 'function';
  if (animatable) {
    layer.animate([{ opacity: 0 }, { opacity: 1 }], { duration: calm ? 160 : 180, easing: EASE_OUT, fill: 'backwards' });
    for (const { el, dist } of tiles) {
      const delay = calm ? 0 : Math.round(dist * 30);
      el.animate(
        calm
          ? [{ opacity: 0 }, { opacity: 1 }]
          : [{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1.12)', opacity: 1, offset: 0.72 }, { transform: 'scale(1)', opacity: 1 }],
        { duration: calm ? 160 : 430, delay, easing: calm ? EASE_OUT : SPRING, fill: 'backwards' },
      );
    }
    badge.animate(
      calm
        ? [{ opacity: 0 }, { opacity: 1 }]
        : [{ transform: 'scale(0.35)', opacity: 0 }, { transform: 'scale(1.07)', opacity: 1, offset: 0.75 }, { transform: 'scale(1)', opacity: 1 }],
      { duration: calm ? 180 : 520, delay: calm ? 0 : 200, easing: calm ? EASE_OUT : SPRING, fill: 'backwards' },
    );
  }

  // Fluid exit: badge folds away, the wall ripples back in from the edges,
  // the backdrop fades last — everything gone before the 3-second removal.
  view.setTimeout(() => {
    if (!animatable) return;
    badge.animate(
      calm ? [{ opacity: 1 }, { opacity: 0 }] : [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(0.4)', opacity: 0 }],
      { duration: calm ? 180 : 240, easing: EASE_IN, fill: 'forwards' },
    );
    for (const { el, dist } of tiles) {
      const delay = calm ? 0 : Math.round((maxDist - dist) * 22);
      el.animate(
        calm ? [{ opacity: 1 }, { opacity: 0 }] : [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(0)', opacity: 0 }],
        { duration: calm ? 200 : 240, delay, easing: EASE_IN, fill: 'forwards' },
      );
    }
    layer.animate([{ opacity: 1 }, { opacity: 0 }], { duration: calm ? 220 : 320, delay: calm ? 40 : 200, easing: EASE_IN, fill: 'forwards' });
  }, EXIT_AT_MS);
  view.setTimeout(() => layer.remove(), TOTAL_MS);

  // The mascot image is allowed to arrive late: start loading once the entry
  // animation is done, fade it over the emoji when it lands.
  if (!whimsy) {
    view.setTimeout(() => {
      const url = extensionAsset(spec.asset);
      if (!url) return;
      const img = doc.createElement('img');
      img.alt = '';
      // Overlaid on the emoji so swapping them never shifts the badge.
      img.style.cssText = 'position:absolute;top:9%;left:9%;width:82%;height:82%;object-fit:contain;border-radius:50%;opacity:0;transition:opacity .25s ease;';
      img.addEventListener('load', () => {
        face.remove();
        badge.append(img);
        img.style.opacity = '1';
      }, { once: true });
      img.addEventListener('error', () => {
        console.info('[BetterQuest] No mascot image packaged — the emoji stays.');
      }, { once: true });
      img.src = url;
      if (!badge.contains(img)) badge.append(img);
    }, MASCOT_AT_MS);
  }
}

/** Correct answers: the checkmark wall with a smiley face. */
export function celebrateScreen(host: HTMLElement): void {
  if (celebrationsDisabled(host.ownerDocument)) {
    console.info('[BetterQuest] Celebrations are off in settings.');
    return;
  }
  showVerdictWall(host, 'correct');
}

/** Wrong answers: the sad face wall with a cat. */
export function flashScreen(host: HTMLElement): void {
  if (celebrationsDisabled(host.ownerDocument)) {
    console.info('[BetterQuest] Celebrations are off in settings.');
    return;
  }
  showVerdictWall(host, 'wrong');
}
