/**
 * Opt-in whimsy pictures. Ordinary answer feedback stays in the question UI;
 * no checkmark/X wall is created, even when whimsy is enabled.
 *
 * Everything is styled inline so the verdict renders even if no stylesheet
 * ever arrives, and the layer lives inside the fullscreen element when one is
 * active (the top layer hides everything outside it).
 *
 * Whimsy is opt-in and uses the packaged correct/wrong picture pools, with an
 * emoji fallback if no image is available. The legacy celebrations preference
 * can still disable this layer.
 */

const TOTAL_MS = 3000;
const EXIT_AT_MS = 2400;
const SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';
const EASE_IN = 'cubic-bezier(0.7, 0, 0.84, 0)';

type Tone = 'correct' | 'wrong';

const TONE = {
  correct: {
    backdrop: 'rgba(243,244,246,0.96)',
    ring: 'rgba(22,163,74,0.5)',
    face: '\u{1F604}',
    log: '[BetterQuest] Correct — showing a whimsy picture.',
  },
  wrong: {
    backdrop: 'rgba(254,242,242,0.96)',
    ring: 'rgba(220,38,38,0.45)',
    face: '\u{1F63F}',
    log: '[BetterQuest] Incorrect — showing a whimsy picture.',
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
  return explicit || (animationsOff && !whimsyEnabled(doc));
}

function whimsyEnabled(doc: Document): boolean {
  const state = doc.documentElement?.dataset.betterquestWhimsy;
  return state === 'enabled' || state === 'true';
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

function showWhimsyPicture(host: HTMLElement, tone: Tone): void {
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
    badge.animate(
      calm
        ? [{ opacity: 0 }, { opacity: 1 }]
        : [{ transform: 'scale(0.35)', opacity: 0 }, { transform: 'scale(1.07)', opacity: 1, offset: 0.75 }, { transform: 'scale(1)', opacity: 1 }],
      { duration: calm ? 180 : 520, delay: calm ? 0 : 200, easing: calm ? EASE_OUT : SPRING, fill: 'backwards' },
    );
  }

  // Fade the opt-in picture away before its three-second removal.
  view.setTimeout(() => {
    if (!animatable) return;
    badge.animate(
      calm ? [{ opacity: 1 }, { opacity: 0 }] : [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(0.4)', opacity: 0 }],
      { duration: calm ? 180 : 240, easing: EASE_IN, fill: 'forwards' },
    );
    layer.animate([{ opacity: 1 }, { opacity: 0 }], { duration: calm ? 220 : 320, delay: calm ? 40 : 200, easing: EASE_IN, fill: 'forwards' });
  }, EXIT_AT_MS);
  view.setTimeout(() => layer.remove(), TOTAL_MS);

}

/** Correct answers: a picture only when the user opts into whimsy. */
export function celebrateScreen(host: HTMLElement): void {
  if (!whimsyEnabled(host.ownerDocument)) return;
  if (celebrationsDisabled(host.ownerDocument)) {
    console.info('[BetterQuest] Celebrations are off in settings.');
    return;
  }
  showWhimsyPicture(host, 'correct');
}

/** Incorrect answers use the same opt-in picture behavior. */
export function flashScreen(host: HTMLElement): void {
  if (!whimsyEnabled(host.ownerDocument)) return;
  if (celebrationsDisabled(host.ownerDocument)) {
    console.info('[BetterQuest] Celebrations are off in settings.');
    return;
  }
  showWhimsyPicture(host, 'wrong');
}
