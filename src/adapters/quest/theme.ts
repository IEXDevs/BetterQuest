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

/** Verified shared Quest shell, tables, forms and native component families. */
export const QUEST_DARK_STYLES = `
  #body-id.mdb-skin[data-betterquest-theme="dark"] { background-color:#111b27; color:#e7eef8; color-scheme:dark; }
  #main-content[data-betterquest-theme="dark"] { color:var(--bq-text); }
  #quest-nav-header-div[data-betterquest-theme="dark"] .qh-navbar { background:#162b40; color:#edf3fb; }
  #quest-nav-header-div[data-betterquest-theme="dark"] .qh-nav-link { color:#edf3fb; }
  #quest-nav-header-div[data-betterquest-theme="dark"] :where(.qh-dropdown-menu) { background:var(--bq-surface); color:var(--bq-text); border-color:var(--bq-border); }
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
  #main-content[data-betterquest-theme="dark"] :where(.table-hover) tbody tr:hover { background-color:#2c4057!important; }
  #main-content[data-betterquest-theme="dark"] #courses-table td:first-child img { background:#fff; border-radius:4px; }
  #main-content[data-betterquest-theme="dark"] :where(.form-control,.custom-select,.browser-default,input[type="text"],input[type="number"],input[type="password"],textarea,select) { background-color:#152133!important; color:#e7eef8!important; border-color:#53677f!important; }
  #main-content[data-betterquest-theme="dark"] :where(input,textarea)::placeholder { color:#a5b5c8; opacity:1; }
  #main-content[data-betterquest-theme="dark"] :where(input,textarea,select):focus { outline-color:#8cbfff; border-color:#8cbfff!important; }
  #main-content[data-betterquest-theme="dark"] :where(.btn-primary) { background-color:#315e98; color:#fff; }
  #main-content[data-betterquest-theme="dark"] :where(.text-success) { color:#7cd8a5!important; }
  #main-content[data-betterquest-theme="dark"] :where(.text-danger) { color:#ffaaa5!important; }
  #main-content[data-betterquest-theme="dark"] :where(.text-warning) { color:#ebc987!important; }
  #main-content[data-betterquest-theme="dark"] :where(mjx-container) { color:var(--bq-text); }
  /* Native document contents/diagrams are never inverted or recolored. */
  #main-content[data-betterquest-theme="dark"] :where(iframe,embed,object[type="application/pdf"]) { color-scheme:light; background:#fff; }
`;
