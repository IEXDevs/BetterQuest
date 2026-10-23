/** Authenticated Quest navbar structure supplied by the user. */
export const NAVIGATION_SELECTOR = '.qh-navbar';

export interface QuestNavigationLink { label: string; href: string; target: string | null }

const ALLOWED_QUEST_LINKS = new Set(['/student/contact/new', '/student/courses/fees', '/student/profiles/edit', '/student/home/logoff']);
const QUEST_ORIGIN = 'https://quest.cns.utexas.edu';
const WIKI_DESTINATION = 'https://wikis.utexas.edu/display/questla/Students';

export function questNavigationLinks(document: Document): QuestNavigationLink[] {
  const links: QuestNavigationLink[] = [];
  for (const anchor of document.querySelectorAll<HTMLAnchorElement>('.qh-navbar > .qh-nav > .qh-nav-item:not([data-betterquest]) > a.qh-nav-link')) {
    const raw = anchor.getAttribute('href');
    if (!raw) continue;
    let allowed = false;
    try {
      const url = new URL(raw, document.URL);
      allowed = (url.origin === QUEST_ORIGIN && ALLOWED_QUEST_LINKS.has(url.pathname)) ||
        (url.origin === 'https://wikis.utexas.edu' && url.pathname === '/display/questla/Students');
    } catch { allowed = false; }
    if (!allowed) continue;
    const label = (anchor.querySelector('.qh-nav-label')?.textContent || anchor.textContent || '').replace(/\(opens in new tab\)/i, '').replace(/\s+/g, ' ').trim();
    if (label) links.push({ label: label.slice(0, 80), href: raw === WIKI_DESTINATION ? WIKI_DESTINATION : raw, target: anchor.getAttribute('target') === '_blank' ? '_blank' : null });
  }
  return links;
}

export function applyNavigationFacelift(document: Document, navbar: HTMLElement) {
  document.querySelectorAll('[data-betterquest="navigation-style"]').forEach(node => node.remove());
  const style = document.createElement('style'); style.dataset.betterquest = 'navigation-style';
  style.textContent = `
    #main-content{scroll-margin-top:70px}
    #selector-div{scroll-margin-top:80px;margin:12px 0 16px}
    #selector-div .row{display:flex;align-items:center}
    #selector-div .col{display:flex;align-items:center;gap:12px}
    #selector-div .qlabel{margin:0;white-space:nowrap;font-weight:650;font-size:0.95rem;flex-shrink:0;color:var(--bq-text,inherit)}
    #selector-div select.custom-select,#selector-div select.browser-default{flex:1;min-width:0;max-width:100%;margin:0}
    body[data-betterquest-saved-questions-open="true"] > br,
    body[data-betterquest-saved-questions-open="true"] #quest-nav-header-div ~ br:not(main br),
    #quest-nav-header-div:has([data-betterquest="saved-questions"]:not([hidden])) ~ br:not(main br){display:none!important}
    :is(#course-info-header-div, #element-info-header-div, #user-bulletins-div):empty{display:none!important}
    .qh-navbar[data-betterquest-nav="compact"]{min-height:62px;padding:0 18px;background:linear-gradient(110deg,#17283d 0%,#213750 58%,#17283d 100%);box-shadow:0 6px 24px #08131f25;color:#edf3fb}
    .qh-navbar[data-betterquest-nav="compact"] .qh-breadcrumbs,
    .qh-navbar[data-betterquest-nav="compact"] .qh-breadcrumbs *,
    .qh-navbar[data-betterquest-nav="compact"] .qh-breadcrumb,
    .qh-navbar[data-betterquest-nav="compact"] .qh-breadcrumb *{color:#edf3fb!important}
    .qh-navbar[data-betterquest-nav="compact"]>.qh-nav{margin-left:auto;align-self:stretch;display:flex;align-items:center}
    .qh-navbar[data-betterquest-nav="compact"]>.qh-nav>.qh-nav-item:not([data-betterquest="navigation"]){display:none!important}
    .qh-navbar[data-betterquest-nav="compact"] [data-betterquest="navigation"]{display:flex!important;align-items:center;align-self:stretch;position:relative;margin-left:auto}
    .qh-navbar[data-betterquest-nav="compact"] .bq-nav-toolbar{display:inline-flex;align-items:center;gap:8px}
    .qh-navbar[data-betterquest-nav="compact"] .bq-toolbar-btn,
    .qh-navbar[data-betterquest-nav="compact"] .bq-toolbar-btn *{color:#f7fbff!important}
    .qh-navbar[data-betterquest-nav="compact"] .bq-toolbar-btn{display:inline-flex;align-items:center;gap:8px;min-height:42px;margin:7px 0;padding:7px 13px!important;border:1px solid #ffffff1f!important;border-radius:8px!important;background:#ffffff0d!important;color:#f7fbff!important;box-shadow:inset 0 1px #ffffff18,0 2px 8px #080f1840;font-weight:650;letter-spacing:-.01em;cursor:pointer;transition:background .22s cubic-bezier(0.16,1,0.3,1),border-color .22s cubic-bezier(0.16,1,0.3,1),transform .22s cubic-bezier(0.16,1,0.3,1),box-shadow .22s ease}
    .qh-navbar[data-betterquest-nav="compact"] .bq-toolbar-btn::after,.bq-toolbar-btn::after{display:none!important;content:none!important}
    .qh-navbar[data-betterquest-nav="compact"] .bq-toolbar-btn:hover{background:#ffffff18!important;border-color:#ffffff3b!important;transform:translateY(-1.5px);box-shadow:inset 0 1px #ffffff24,0 6px 20px #080f1860}
    .qh-navbar[data-betterquest-nav="compact"] .bq-toolbar-btn:active{transform:translateY(0.5px) scale(0.98)}
    .qh-navbar[data-betterquest-nav="compact"] .bq-toolbar-btn:focus-visible{outline:2px solid #38bdf8;outline-offset:2px}
    .bq-toolbar-btn[aria-expanded="true"],.bq-toolbar-btn.is-open{background:#ffffff18!important;border-color:rgba(129,140,248,.55)!important;box-shadow:0 0 0 2px rgba(129,140,248,.25),0 8px 24px rgba(0,0,0,.35)!important}
    .qh-navbar[data-betterquest-nav="compact"] .bq-quest-mark{display:grid;place-items:center;width:28px;height:28px;border-radius:6px;background:linear-gradient(145deg,#2f4b6a,#1b2b3d);color:#edf3fb;border:1px solid #ffffff18;box-shadow:0 5px 14px #080f1880}
    .bq-nav-chevron{display:inline-block!important;width:14px;height:14px;vertical-align:middle;transform-origin:50% 50%;transition:transform .32s cubic-bezier(0.34,1.56,0.64,1)!important}
    .bq-toolbar-btn[aria-expanded="true"] .bq-nav-chevron,.bq-toolbar-btn.is-open .bq-nav-chevron,.qh-navbar[data-betterquest-nav="compact"] [aria-expanded="true"] .bq-nav-chevron,.qh-navbar[data-betterquest-nav="compact"] .is-open .bq-nav-chevron{transform:rotate(180deg)!important}
    @media(max-width:720px){.qh-navbar[data-betterquest-nav="compact"]{padding:0 10px}.qh-navbar[data-betterquest-nav="compact"] .qh-breadcrumbs{min-width:0;overflow:hidden}.qh-navbar[data-betterquest-nav="compact"] .bq-nav-name{display:none}}
    @media(prefers-reduced-motion:reduce){.qh-navbar[data-betterquest-nav="compact"] .bq-toolbar-btn,.qh-navbar[data-betterquest-nav="compact"] .bq-nav-chevron{transition:none!important}}
    :root[data-betterquest-animations="disabled"] .qh-navbar[data-betterquest-nav="compact"] .bq-toolbar-btn,
    :root[data-betterquest-animations="disabled"] .qh-navbar[data-betterquest-nav="compact"] .bq-nav-chevron{transition:none!important;animation:none!important}
  `;
  document.head.append(style);
  const original = navbar.getAttribute('data-betterquest-nav'); navbar.dataset.betterquestNav = 'compact';
  return { dispose() { if (original === null) navbar.removeAttribute('data-betterquest-nav'); else navbar.setAttribute('data-betterquest-nav', original); style.remove(); } };
}

export function findNavigation(document: Document): { navbar: HTMLElement; before: HTMLElement } | null {
  const navbar = document.querySelector<HTMLElement>(NAVIGATION_SELECTOR);
  const breadcrumbs = navbar?.querySelector<HTMLElement>(':scope > .qh-breadcrumbs');
  const before = navbar?.querySelector<HTMLElement>(':scope > .qh-nav');
  if (!navbar || !breadcrumbs || !before) return null;
  const children = [...navbar.children];
  if (children.indexOf(breadcrumbs) >= children.indexOf(before)) return null;
  return { navbar, before };
}
