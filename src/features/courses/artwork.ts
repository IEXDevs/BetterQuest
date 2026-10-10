import { readHomepageCourseRows } from '../../adapters/quest/homepage';

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

function solidColor(code: string): string {
  if (SOLID_COLORS[code]) return SOLID_COLORS[code];
  let hash = 0; for (const character of code) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return `hsl(${hash % 360} 60% 24%)`;
}

function palette(code: string): [string, string, string] {
  if (PALETTES[code]) return PALETTES[code];
  let hash = 0; for (const character of code) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  const hue = hash % 360;
  return [`hsl(${hue} 58% 32%)`, `hsl(${(hue + 28) % 360} 62% 57%)`, `hsl(${hue} 55% 95%)`];
}

interface Artwork {
  host: HTMLElement;
  image: HTMLImageElement | null;
  imageHidden: boolean;
}

export function createCourseArtwork(root: Element) {
  const document = root.ownerDocument;
  const mounted = new Map<HTMLTableRowElement, Artwork>();
  let disposed = false;

  function isAnimationsDisabled(): boolean {
    return document.documentElement.dataset.betterquestAnimations === 'disabled';
  }

  function syncAnimations() {
    const disabled = isAnimationsDisabled();
    for (const { host } of mounted.values()) {
      const art = host.shadowRoot?.querySelector('.art');
      if (disabled) {
        host.setAttribute('data-animations', 'disabled');
        art?.classList.add('is-disabled');
      } else {
        host.removeAttribute('data-animations');
        art?.classList.remove('is-disabled');
      }
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
    const animationsDisabled = isAnimationsDisabled();
    if (animationsDisabled) host.setAttribute('data-animations', 'disabled');

    const bgType = item.departmentCode === 'M'
      ? 'ripple'
      : item.departmentCode === 'BIO'
      ? 'ether'
      : item.departmentCode === 'CH' || item.departmentCode === 'CS'
      ? 'pixel'
      : 'aurora';

    const style = document.createElement('style');
    style.textContent = `
      :host { display: inline-block; width: 96px; height: 96px; vertical-align: middle; }
      .art {
        position: relative;
        isolation: isolate;
        display: flex;
        width: 96px;
        height: 96px;
        align-items: flex-end;
        overflow: hidden;
        border-radius: 20px;
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
      :host-context([data-betterquest-animations="disabled"]) .art-bg,
      .art.is-disabled .art-bg {
        display: none !important;
      }
      .art-bg {
        position: absolute;
        inset: -25%;
        width: 150%;
        height: 150%;
        pointer-events: none;
        z-index: 1;
      }
      .is-ripple .art-bg {
        background: #090314;
      }
      .ripple-grid-mesh {
        position: absolute;
        inset: -20%;
        width: 140%;
        height: 140%;
        background-image:
          linear-gradient(to right, rgba(168, 85, 247, 0.25) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(168, 85, 247, 0.25) 1px, transparent 1px);
        background-size: 14px 14px;
        animation: bq-grid-drift 8s ease-in-out infinite alternate;
      }
      .ripple-rings {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .ripple-ring {
        position: absolute;
        border-radius: 50%;
        border: 1.5px solid rgba(192, 132, 252, 0.7);
        box-shadow: 0 0 14px rgba(168, 85, 247, 0.65), inset 0 0 8px rgba(168, 85, 247, 0.35);
        animation: bq-ripple-wave 3.6s cubic-bezier(0.1, 0.7, 0.3, 1) infinite;
      }
      .ripple-ring:nth-child(2) { animation-delay: 1.2s; }
      .ripple-ring:nth-child(3) { animation-delay: 2.4s; }
      .ripple-center-glow {
        position: absolute;
        inset: 15%;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(168, 85, 247, 0.65) 0%, rgba(124, 58, 237, 0.25) 45%, transparent 70%);
        filter: blur(10px);
        animation: bq-center-pulse 2.8s ease-in-out infinite alternate;
      }
      .is-swirl .art-bg {
        background:
          radial-gradient(circle at 35% 35%, ${bright} 0%, transparent 60%),
          conic-gradient(from 0deg at 50% 50%, ${deep} 0deg, ${bright} 120deg, ${paper} 220deg, ${deep} 360deg);
        filter: blur(10px);
        animation: bq-swirl 10s linear infinite;
      }
      .is-pixel .art-bg {
        background:
          radial-gradient(circle at 50% 40%, ${bright} 0%, transparent 70%),
          repeating-conic-gradient(from 0deg, ${deep} 0deg 90deg, #09090d 90deg 180deg),
          linear-gradient(135deg, ${deep}, ${bright});
        background-size: 100% 100%, 8px 8px, 100% 100%;
        opacity: 0.9;
        animation: bq-pixel-shift 4s steps(4) infinite alternate;
      }
      .is-aurora .art-bg {
        background:
          radial-gradient(ellipse at 30% 20%, ${paper} 0%, transparent 45%),
          radial-gradient(ellipse at 75% 65%, ${bright} 0%, transparent 55%),
          linear-gradient(145deg, ${deep}, #0c091f);
        filter: blur(8px);
        animation: bq-aurora 7s ease-in-out infinite alternate;
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
      @keyframes bq-ripple-wave {
        0% {
          width: 8px;
          height: 8px;
          opacity: 0.95;
          transform: scale(0.4);
          border-color: #f3e8ff;
        }
        50% {
          opacity: 0.65;
          border-color: #c084fc;
        }
        100% {
          width: 140px;
          height: 140px;
          opacity: 0;
          transform: scale(1.6);
          border-color: #7c3aed;
        }
      }
      @keyframes bq-center-pulse {
        0% { transform: scale(0.85); opacity: 0.5; }
        100% { transform: scale(1.2); opacity: 0.9; }
      }
      @keyframes bq-grid-drift {
        0% { transform: translate(0, 0); }
        100% { transform: translate(-7px, -7px); }
      }
      @keyframes bq-swirl {
        from { transform: rotate(0deg) scale(1); }
        50% { transform: rotate(180deg) scale(1.15); }
        to { transform: rotate(360deg) scale(1); }
      }
      @keyframes bq-pixel-shift {
        0% { transform: translate(0, 0); }
        50% { transform: translate(-4px, 4px); }
        100% { transform: translate(4px, -4px); }
      }
      @keyframes bq-aurora {
        0% { transform: scale(0.95) rotate(-2deg); }
        100% { transform: scale(1.1) rotate(4deg); }
      }
      @media (prefers-reduced-motion: reduce) {
        .art-bg, .art-bg * { animation: none !important; }
      }
      :root[data-betterquest-animations="disabled"] .art-bg,
      :root[data-betterquest-animations="disabled"] .art-bg * {
        animation: none !important;
      }
    `;
    const art = document.createElement('span'); art.className = `art is-${bgType}${animationsDisabled ? ' is-disabled' : ''}`;
    const artBg = document.createElement('span'); artBg.className = 'art-bg';
    if (bgType === 'ripple') {
      const mesh = document.createElement('span'); mesh.className = 'ripple-grid-mesh';
      const centerGlow = document.createElement('span'); centerGlow.className = 'ripple-center-glow';
      const rings = document.createElement('span'); rings.className = 'ripple-rings';
      const r1 = document.createElement('span'); r1.className = 'ripple-ring';
      const r2 = document.createElement('span'); r2.className = 'ripple-ring';
      const r3 = document.createElement('span'); r3.className = 'ripple-ring';
      rings.append(r1, r2, r3);
      artBg.append(mesh, centerGlow, rings);
    }
    const vignette = document.createElement('span'); vignette.className = 'vignette';
    const copy = document.createElement('span'); copy.className = 'copy';
    const department = document.createElement('span'); department.className = 'department'; department.textContent = item.departmentCode;
    const code = document.createElement('span'); code.className = 'course-code'; code.textContent = item.courseCode;
    copy.append(department, code);
    art.append(artBg, vignette, copy);
    shadow.append(style, art);
    const imageHidden = Boolean(item.nativeImage?.hidden);
    if (item.nativeImage) item.nativeImage.hidden = true;
    item.artworkCell.prepend(host); mounted.set(item.row, { host, image: item.nativeImage, imageHidden });
  }

  return {
    reconcile() {
      if (disposed) return;
      syncAnimations();
      const items = readHomepageCourseRows(document); const rows = new Set(items.map(item => item.row));
      for (const row of mounted.keys()) if (!rows.has(row) || !row.isConnected) remove(row);
      for (const item of items) {
        const current = mounted.get(item.row);
        const department = current?.host.shadowRoot?.querySelector('.department')?.textContent;
        const code = current?.host.shadowRoot?.querySelector('.course-code')?.textContent;
        if (current && (department !== item.departmentCode || code !== item.courseCode || current.host.parentElement !== item.artworkCell ||
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
