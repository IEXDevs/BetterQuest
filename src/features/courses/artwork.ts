import { readHomepageCourseRows } from '../../adapters/quest/homepage';
import { COURSE_EFFECT_CSS, courseArtKey, courseArtMood, palette, resolveCourseEffect, solidColor } from './effects';
import type { CourseEffect } from './effects';
import { REACTBITS_EFFECTS, type EffectInstance } from './reactbits';
import { rememberCourseCodes } from './course-codes';

interface Artwork {
  host: HTMLElement;
  image: HTMLImageElement | null;
  imageHidden: boolean;
  fx: EffectInstance | null;
  /** Course identity the mounted art was built from; a change remounts. */
  artKey: string;
  /** Resolved backdrop for this mount; remount when the saved pick changes. */
  effect: CourseEffect;
}

/** Live real-effect mounts across the homepage cards. Cards beyond the cap
 *  keep the CSS fallback art so a big course list never stacks dozens of
 *  GL contexts on one page. */
let liveCardFx = 0;
const CARD_FX_LIMIT = 6;

export function createCourseArtwork(root: Element) {
  const document = root.ownerDocument;
  const mounted = new Map<HTMLTableRowElement, Artwork>();
  let disposed = false;

  function isAnimationsDisabled(): boolean {
    return document.documentElement.dataset.betterquestAnimations === 'disabled';
  }

  function syncAnimations() {
    const disabled = isAnimationsDisabled();
    for (const artwork of mounted.values()) {
      const { host } = artwork;
      const art = host.shadowRoot?.querySelector('.art');
      if (disabled) {
        host.setAttribute('data-animations', 'disabled');
        art?.classList.add('is-disabled');
      } else {
        host.removeAttribute('data-animations');
        art?.classList.remove('is-disabled');
      }
      syncFx(artwork, disabled);
    }
  }

  /** Runs the real react-bits effect inside one card when animations are on;
   *  a failed mount (or the card cap) keeps the CSS fallback art. */
  function syncFx(artwork: Artwork, disabled: boolean) {
    const layer = artwork.host.shadowRoot?.querySelector<HTMLElement>('.fx-layer');
    const artBg = artwork.host.shadowRoot?.querySelector<HTMLElement>('.art-bg');
    if (!layer || !artBg) return;
    if (disabled) {
      if (artwork.fx) {
        artwork.fx.destroy();
        artwork.fx = null;
        liveCardFx = Math.max(0, liveCardFx - 1);
        artBg.style.removeProperty('display');
      }
      return;
    }
    if (artwork.fx || liveCardFx >= CARD_FX_LIMIT) return;
    const mount = REACTBITS_EFFECTS[layer.dataset.fx as CourseEffect];
    if (!mount) return;
    let instance: EffectInstance | null = null;
    try {
      instance = mount(layer);
    } catch {
      instance = null; // No usable WebGL here — the CSS fallback art stays.
    }
    if (instance) {
      artwork.fx = instance;
      liveCardFx += 1;
      artBg.style.display = 'none';
    }
  }

  const win = document.defaultView;
  const onPrefsChanged = () => syncAnimations();
  win?.addEventListener('betterquest:preferences-changed', onPrefsChanged);

  let htmlObserver: MutationObserver | undefined;
  if (win && typeof win.MutationObserver === 'function') {
    htmlObserver = new win.MutationObserver(() => syncAnimations());
    htmlObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-betterquest-animations'],
    });
  }

  function remove(row: HTMLTableRowElement) {
    const artwork = mounted.get(row); if (!artwork) return;
    if (artwork.fx) {
      artwork.fx.destroy();
      artwork.fx = null;
      liveCardFx = Math.max(0, liveCardFx - 1);
    }
    artwork.host.remove();
    if (artwork.image) artwork.image.hidden = artwork.imageHidden;
    mounted.delete(row);
  }

  function mount(item: ReturnType<typeof readHomepageCourseRows>[number]) {
    const host = document.createElement('span'); host.dataset.betterquest = 'course-artwork';
    host.setAttribute('role', 'img'); host.setAttribute('aria-label', `${item.departmentCode} department artwork for ${item.courseCode}`);
    const shadow = host.attachShadow({ mode: 'open' });
    const [deep, bright, paper] = palette(item.departmentCode);
    const solid = solidColor(item.departmentCode);
    // Keyed by the course, not the department, so every course gets its own
    // backdrop — and so the course-page hero picks the same one.
    const artKey = courseArtKey({ code: item.courseCode, unique: item.courseUnique, departmentCode: item.departmentCode });
    const fx = resolveCourseEffect(artKey);
    const mood = courseArtMood(artKey);
    const animationsDisabled = isAnimationsDisabled();
    if (animationsDisabled) host.setAttribute('data-animations', 'disabled');

    const style = document.createElement('style');
    style.textContent = `
      :host { display: inline-block; width: 96px; height: 96px; vertical-align: middle; cursor: default; user-select: none; -webkit-user-select: none; -webkit-user-drag: none; }
      .art {
        position: relative;
        isolation: isolate;
        display: flex;
        width: 96px;
        height: 96px;
        align-items: flex-end;
        overflow: hidden;
        border-radius: 10px;
        background: #09090d;
        box-shadow: 0 10px 26px color-mix(in srgb, ${deep} 35%, transparent), inset 0 0 0 1px rgba(255, 255, 255, 0.16);
        color: white;
        text-align: left;
        transition: background-color 0.2s ease, box-shadow 0.2s ease;
      }
      /* Solid background color when animations are disabled */
      :host([data-animations="disabled"]) .art,
      :host-context([data-betterquest-animations="disabled"]) .art,
      .art.is-disabled {
        background: ${solid} !important;
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.45), inset 0 0 0 1px rgba(255, 255, 255, 0.22) !important;
      }
      :host([data-animations="disabled"]) .art-bg,
      :host([data-animations="disabled"]) .fx-layer,
      :host-context([data-betterquest-animations="disabled"]) .art-bg,
      :host-context([data-betterquest-animations="disabled"]) .fx-layer,
      .art.is-disabled .art-bg,
      .art.is-disabled .fx-layer {
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
        background: linear-gradient(to top, rgba(9, 9, 13, 0.88) 0%, rgba(9, 9, 13, 0.2) 55%, transparent 100%);
        pointer-events: none;
      }
      .copy {
        position: relative;
        z-index: 3;
        padding: 0 10px 9px;
        text-shadow: 0 1px 4px rgba(0, 0, 0, 0.9), 0 2px 8px rgba(0, 0, 0, 0.6);
        user-select: none;
        -webkit-user-select: none;
        pointer-events: none;
        cursor: default;
      }
      .department {
        display: block;
        font: 850 26px/0.9 ui-rounded, 'Avenir Next', -apple-system, sans-serif;
        letter-spacing: -0.05em;
      }
      .course-code {
        display: block;
        margin-top: 4px;
        font: 750 9px/1.1 ui-monospace, monospace;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        max-width: 76px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: rgba(255, 255, 255, 0.9);
      }
      :root[data-betterquest-animations="disabled"] .art-bg,
      :root[data-betterquest-animations="disabled"] .art-bg * {
        animation: none !important;
      }
    ` + COURSE_EFFECT_CSS;
    const art = document.createElement('span'); art.className = `art${animationsDisabled ? ' is-disabled' : ''}`;
    art.style.setProperty('--fx-deep', deep);
    art.style.setProperty('--fx-bright', bright);
    art.style.setProperty('--fx-paper', paper);
    art.style.setProperty('--fx-solid', solid);
    art.style.setProperty('--fx-hue', `${mood.hue}deg`);
    art.style.setProperty('--fx-delay', `${mood.delay}s`);
    const artBg = document.createElement('span'); artBg.className = `art-bg fx-${fx}`;
    const fxLayer = document.createElement('div'); fxLayer.className = 'fx-layer'; fxLayer.dataset.fx = fx;

    const vignette = document.createElement('span'); vignette.className = 'vignette';
    const copy = document.createElement('span'); copy.className = 'copy';
    const department = document.createElement('span'); department.className = 'department'; department.textContent = item.departmentCode;
    const code = document.createElement('span'); code.className = 'course-code'; code.textContent = item.courseCode;
    copy.append(department, code);
    art.append(artBg, fxLayer, vignette, copy);
    shadow.append(style, art);
    const imageHidden = Boolean(item.nativeImage?.hidden);
    if (item.nativeImage) item.nativeImage.hidden = true;
    item.artworkCell.prepend(host);
    const artwork: Artwork = { host, image: item.nativeImage, imageHidden, fx: null, artKey, effect: fx };
    mounted.set(item.row, artwork);
    syncFx(artwork, animationsDisabled); // Paint the real effect right away.
  }

  return {
    reconcile() {
      if (disposed) return;
      syncAnimations();
      const items = readHomepageCourseRows(document);
      rememberCourseCodes(items); // Course pages show no code; the hero reads this memory.
      const rows = new Set(items.map(item => item.row));
      for (const row of mounted.keys()) if (!rows.has(row) || !row.isConnected) remove(row);
      for (const item of items) {
        const current = mounted.get(item.row);
        const artKey = courseArtKey({ code: item.courseCode, unique: item.courseUnique, departmentCode: item.departmentCode });
        const effect = resolveCourseEffect(artKey);
        if (current && (current.artKey !== artKey || current.effect !== effect || current.host.parentElement !== item.artworkCell ||
          current.image !== item.nativeImage || Boolean(current.image && !current.image.isConnected))) remove(item.row);
        if (!mounted.has(item.row)) mount(item);
      }
    },
    dispose() {
      disposed = true;
      win?.removeEventListener('betterquest:preferences-changed', onPrefsChanged);
      htmlObserver?.disconnect();
      for (const row of [...mounted.keys()]) remove(row);
    },
  };
}
