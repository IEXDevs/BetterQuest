import type { ThemeAdapter } from '../../shared/adapters';

export const themeAdapter: ThemeAdapter = {
  locate: document => document.querySelector('#main-content'),
  roots: root => ['#main-content', '#quest-nav-header-div']
    .map(selector => root.ownerDocument.querySelector<HTMLElement>(selector))
    .filter((element): element is HTMLElement => Boolean(element)),
};

export function findThemePageRoot(document: Document): HTMLElement | null {
  return document.querySelector<HTMLElement>('#body-id.mdb-skin');
}

/**
 * Detects whether the current document or view corresponds to Grades or Review.
 */
export function detectPageCategory(document: Document): 'grades' | 'review' | null {
  const url = document.URL || '';
  let pathname = '';
  let search = '';
  let hash = '';
  try {
    const parsed = new URL(url);
    pathname = parsed.pathname.toLowerCase();
    search = parsed.search.toLowerCase();
    hash = parsed.hash.toLowerCase();
  } catch {
    // fallback
  }

  // 1. URL path, query param, or hash
  if (pathname.includes('/grades') || search.includes('tab=grades') || hash === '#tabs-grades') {
    return 'grades';
  }
  if (pathname.includes('/review') || search.includes('tab=review') || hash === '#tabs-review') {
    return 'review';
  }

  // 2. Active tab in course panel
  const activeTab = document.querySelector('#panel-tabs .nav-link.active, #panel-tabs [aria-selected="true"]');
  if (activeTab) {
    const tabId = (activeTab.id || '').toLowerCase();
    const tabHref = (activeTab.getAttribute('href') || '').toLowerCase();
    if (tabId.includes('grade') || tabHref.includes('grade')) return 'grades';
    if (tabId.includes('review') || tabHref.includes('review')) return 'review';
  }

  // 3. Active tab panel
  if (document.querySelector('#tabs-grades.show.active, #tabs-grades.active')) return 'grades';
  if (document.querySelector('#tabs-review.show.active, #tabs-review.active')) return 'review';

  // 4. Page headings, breadcrumbs, title
  const headers = [
    document.querySelector('h1')?.textContent,
    document.querySelector('h2')?.textContent,
    document.querySelector('h3')?.textContent,
    document.querySelector('.page-header')?.textContent,
    document.querySelector('.breadcrumb')?.textContent,
    document.querySelector('#target h2, #target h3, #target .h2, #target .h3')?.textContent,
    document.title,
  ].filter(Boolean).map(t => (t || '').trim().toLowerCase());

  for (const text of headers) {
    if (/\bgrades?\b/i.test(text)) return 'grades';
    if (/\breview\b/i.test(text) || /assessment\s*[—-]\s*review/i.test(text)) return 'review';
  }

  // 5. Explicit tables in main content
  if (document.querySelector('#grades-table, table[id*="grades" i]')) return 'grades';
  if (document.querySelector('#review-table, table[id*="review" i]')) return 'review';

  return null;
}

/** Verified shared Quest shell, tables, forms, native component families, and grades/review styling. */
export const QUEST_DARK_STYLES = `
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
     GRADES & REVIEW PAGES — DARK MODE: ALL TEXT WHITE (#ffffff)
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
     GRADES & REVIEW PAGES — LIGHT MODE: ALL TEXT BLACK (#000000)
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
    padding: 16px 20px;
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
    padding: 16px 18px !important;
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

  /* Light mode course info card */
  #main-content[data-betterquest-theme="light"] #student-course-info-header > .row > .col,
  #main-content:not([data-betterquest-theme="dark"]) #student-course-info-header > .row > .col {
    background: #f8fafc !important;
    border: 1px solid #e2e8f0 !important;
    color: #0f172a !important;
  }

  /* Dark mode course info card */
  #main-content[data-betterquest-theme="dark"] #student-course-info-header > .row > .col {
    background: #182436 !important;
    border: 1px solid #2e3e54 !important;
    color: #ffffff !important;
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
