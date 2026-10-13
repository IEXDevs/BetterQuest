/** Course hero banner for Quest course pages: when you open a course, the top
 *  of the course card shows the allowed background art with the course code,
 *  course name, and unique number (the same layout as the marketing preview);
 *  the instructor info row stays right underneath it. */

import { COURSE_EFFECT_CSS, courseArtKey, courseArtMood, courseEffect, palette, solidColor } from './effects';
import type { CourseEffect } from './effects';
import { REACTBITS_EFFECTS, type EffectInstance } from './reactbits';
import { departmentFromCourseCode } from '../../adapters/quest/homepage';
import { lookupCourseCode } from './course-codes';

const HOST_SELECTOR = '[data-betterquest="course-hero"]';
const STYLE_SELECTOR = '[data-betterquest="course-hero-style"]';

const observers = new WeakMap<HTMLElement, MutationObserver>();
const fxInstances = new WeakMap<HTMLElement, EffectInstance>();

function animationsDisabled(document: Document): boolean {
  return document.documentElement.dataset.betterquestAnimations === 'disabled';
}

function syncAnimations(host: HTMLElement, document: Document): void {
  const disabled = animationsDisabled(document);
  const hero = host.shadowRoot?.querySelector('.hero');
  if (disabled) {
    host.setAttribute('data-animations', 'disabled');
    hero?.classList.add('is-disabled');
  } else {
    host.removeAttribute('data-animations');
    hero?.classList.remove('is-disabled');
  }
  syncFx(host, document);
}

function destroyFx(host: HTMLElement): void {
  const instance = fxInstances.get(host);
  if (instance) {
    instance.destroy();
    fxInstances.delete(host);
  }
}

/** Runs the real react-bits effect for this hero when animations are on;
 *  when it mounts, the CSS fallback layers step aside (and come back on
 *  teardown) — a null mount simply keeps the CSS art. */
function syncFx(host: HTMLElement, document: Document): void {
  const layer = host.shadowRoot?.querySelector<HTMLElement>('.fx-layer');
  const artBg = host.shadowRoot?.querySelector<HTMLElement>('.art-bg');
  if (!layer || !artBg) return;
  if (animationsDisabled(document)) {
    if (fxInstances.has(host)) {
      destroyFx(host);
      artBg.style.removeProperty('display');
    }
    return;
  }
  if (fxInstances.has(host)) return;
  const mount = REACTBITS_EFFECTS[layer.dataset.fx as CourseEffect];
  if (!mount) return;
  let instance: EffectInstance | null = null;
  try {
    instance = mount(layer);
  } catch {
    instance = null; // No usable WebGL here — the CSS fallback art stays.
  }
  if (instance) {
    fxInstances.set(host, instance);
    artBg.style.display = 'none';
  }
}

/** Keeps the native collapse toggle hidden while the hero is up (the hero
 *  carries the course identity now); removed again whenever the hero goes. */
function syncToggleChrome(document: Document, mounted: boolean): void {
  let style = document.querySelector<HTMLStyleElement>(STYLE_SELECTOR);
  if (!mounted) { style?.remove(); return; }
  if (!style) {
    style = document.createElement('style');
    style.setAttribute('data-betterquest', 'course-hero-style');
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
    document.head.append(style);
  }
}

function renderHero(host: HTMLElement, document: Document, identity: { code: string; name: string; unique: string; fx: string; departmentCode: string }): void {
  const [deep, bright, paper] = palette(identity.departmentCode);
  const solid = solidColor(identity.departmentCode);
  const mood = courseArtMood(courseArtKey({ code: identity.code, unique: identity.unique, departmentCode: identity.departmentCode }));
  const shadow = host.shadowRoot || host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
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
  const hero = document.createElement('div');
  hero.className = 'hero';
  hero.style.setProperty('--fx-deep', deep);
  hero.style.setProperty('--fx-bright', bright);
  hero.style.setProperty('--fx-paper', paper);
  hero.style.setProperty('--fx-solid', solid);
  hero.style.setProperty('--fx-hue', `${mood.hue}deg`);
  hero.style.setProperty('--fx-delay', `${mood.delay}s`);

  const artBg = document.createElement('span'); artBg.className = `art-bg fx-${identity.fx}`;
  const fxLayer = document.createElement('div'); fxLayer.className = 'fx-layer'; fxLayer.dataset.fx = identity.fx;
  const vignette = document.createElement('span'); vignette.className = 'vignette';
  const copy = document.createElement('div'); copy.className = 'copy';
  const titles = document.createElement('div'); titles.className = 'titles';
  const code = document.createElement('span'); code.className = 'code'; code.textContent = identity.code;
  const name = document.createElement('span'); name.className = 'name'; name.textContent = identity.name;
  const unique = document.createElement('span'); unique.className = 'unique'; unique.textContent = identity.unique;
  titles.append(code, name);
  copy.append(titles, unique);
  hero.append(artBg, fxLayer, vignette, copy);
  shadow.replaceChildren(style, hero);
}

/** Mounts/refreshes the hero banner for the course card under `root`. */
export function enhanceCourseHero(root: HTMLElement): void {
  const document = root.ownerDocument;
  const infoHeader = root.querySelector<HTMLElement>('#student-course-info-header') ||
    (root.id === 'student-course-info-header' ? root : null);
  if (!infoHeader) { removeHero(document); return; }

  const anchor = infoHeader.closest<HTMLElement>('.card') || infoHeader.parentElement;
  if (!anchor) { removeHero(document); return; }
  const title = anchor.querySelector<HTMLElement>('button[data-target="#student-course-info-header"] .h4');
  const raw = (title?.textContent || '').replace(/\s+/g, ' ').trim();
  // Without a verified unique number the course cannot be identified; match the
  // assignment adapter's gate and leave the native header untouched.
  const unique = raw.match(/\((\d+)\)\s*$/)?.[1];
  const name = raw.replace(/\s*\(\d+\)\s*$/, '').trim();
  if (!unique || !name) { removeHero(document); return; }

  const known = lookupCourseCode(document);
  const departmentCode = known?.departmentCode || departmentFromCourseCode(known?.code || '');
  const compactCode = known ? known.code.replace(/\s+/g, '').toUpperCase() : '';
  // Same key the homepage card used for this course, so both views agree.
  const artKey = courseArtKey({ code: compactCode, unique, departmentCode });
  const fx = courseEffect(artKey);
  const key = `${compactCode}|${name}|${unique}|${fx}`;

  let host = anchor.querySelector<HTMLElement>(HOST_SELECTOR);
  if (!host) {
    host = document.createElement('div');
    host.setAttribute('data-betterquest', 'course-hero');
    host.setAttribute('role', 'img');
    anchor.prepend(host);
    const Observer = document.defaultView?.MutationObserver;
    if (Observer) {
      const observer = new Observer(() => syncAnimations(host!, document));
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-betterquest-animations'] });
      observers.set(host, observer);
    }
  } else if (host.dataset.betterquestKey === key) {
    syncToggleChrome(document, true); // Sized before the layer measures itself.
    syncAnimations(host, document);
    return;
  }
  host.dataset.betterquestKey = key;
  host.setAttribute('aria-label', `${name} course banner${compactCode ? `, course ${compactCode}` : ''}`);
  destroyFx(host); // The canvas belongs to the previous render's layer.
  renderHero(host, document, { code: compactCode, name, unique, fx, departmentCode });
  syncToggleChrome(document, true); // Layout settles first, so the effect mounts at full-card size.
  syncAnimations(host, document);
}

function removeHero(document: Document): void {
  const host = document.querySelector<HTMLElement>(HOST_SELECTOR);
  if (host) {
    destroyFx(host);
    observers.get(host)?.disconnect();
    observers.delete(host);
    host.remove();
  }
  syncToggleChrome(document, false);
}

export function disposeCourseHero(document: Document): void {
  removeHero(document);
}
