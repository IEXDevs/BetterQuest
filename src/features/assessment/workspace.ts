import {
  findPdfAssessment,
  isEmptyResponseTable,
  isNativeControlAvailable,
  isResponseOptionAvailable,
  readAssessmentMetrics,
  readAssessmentResponses,
  type PdfAssessmentElements,
} from '../../adapters/quest/assessment';
import { createInteractivePdfViewer } from './pdf-viewer';
import { celebrateScreen, flashScreen } from './celebration';

type PdfViewer = ReturnType<typeof createInteractivePdfViewer>;
type PdfViewerFactory = (container: HTMLElement, options: Parameters<typeof createInteractivePdfViewer>[1]) => any;

const COLLAPSED_KEY = 'betterquest_rail_collapsed';

/** Recent submits survive as a marker so a reload right after answering still
 * tells you how you did (and brings back a wrong mark). */
const FRESH_SUBMITS_KEY = 'betterquest_fresh_submits';
const FRESH_SUBMIT_WINDOW_MS = 10 * 60 * 1000;

interface FreshSubmit { path: string; qn: number; value: string; attempts: number; at: number; }

function freshSubmitPath(doc: Document): string {
  // Key on the stable id so a redirect that adds or drops query params
  // still matches the answer recorded before the reload.
  const search = new URLSearchParams(doc.location.search);
  const stable = search.get('instance') || search.get('course');
  return stable ? `${doc.location.pathname}|${stable}` : `${doc.location.pathname}${doc.location.search}`;
}

function readFreshSubmits(doc: Document): FreshSubmit[] {
  try {
    const raw = doc.defaultView?.sessionStorage?.getItem(FRESH_SUBMITS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is FreshSubmit => {
      const entry = item as FreshSubmit | null;
      return Boolean(entry) && typeof entry!.qn === 'number' &&
        typeof entry!.value === 'string' && Date.now() - Number(entry!.at) < FRESH_SUBMIT_WINDOW_MS;
    });
  } catch {
    return [];
  }
}

function writeFreshSubmits(doc: Document, list: FreshSubmit[]): void {
  try {
    doc.defaultView?.sessionStorage?.setItem(FRESH_SUBMITS_KEY, JSON.stringify(list));
  } catch {
    /* Private mode: verdicts fall back to session memory only. */
  }
}

function recordFreshSubmit(doc: Document, qn: number, value: string, attempts: number): void {
  const path = freshSubmitPath(doc);
  const list = readFreshSubmits(doc).filter(item => !(item.path === path && item.qn === qn));
  list.push({ path, qn, value, attempts, at: Date.now() });
  writeFreshSubmits(doc, list);
  console.info(`[BetterQuest] Question ${qn}: answer recorded — the verdict will follow.`);
}

function consumeFreshSubmit(doc: Document, qn: number): FreshSubmit | null {
  const path = freshSubmitPath(doc);
  const list = readFreshSubmits(doc);
  const index = list.findIndex(item => item.path === path && item.qn === qn);
  if (index < 0) return null;
  const [found] = list.splice(index, 1);
  writeFreshSubmits(doc, list);
  return found;
}

function installStyles(document: Document) {
  document.querySelectorAll('[data-betterquest="assessment-style"]').forEach(node => node.remove());
  const style = document.createElement('style'); style.dataset.betterquest = 'assessment-style';
  style.textContent = `
    #main-content:has([data-betterquest-pdf-workspace="enhanced"]),
    :is(#target, [data-betterquest-pdf-workspace="enhanced"]),
    :is(#target, [data-betterquest-pdf-workspace="enhanced"]).container,
    :is(#target, [data-betterquest-pdf-workspace="enhanced"]).container-fluid,
    [data-betterquest-pdf-parent="true"]{
      max-width:none!important;
      width:100%!important;
      min-width:0!important;
      box-sizing:border-box!important;
      padding-left:0!important;
      padding-right:0!important;
      margin-left:0!important;
      margin-right:0!important;
    }
    #target[data-betterquest-pdf-workspace="enhanced"],
    [data-betterquest-pdf-workspace="enhanced"]{
      display:grid!important;
      height:auto!important;
      flex-shrink:0!important;
      max-height:none!important;
      min-height:0!important;
      grid-template-columns:minmax(0,1fr) clamp(280px,25vw,320px)!important;
      grid-template-rows:auto minmax(0,var(--bq-pdf-workspace-height,calc(100dvh - 104px)))!important;
      column-gap:12px!important;
      row-gap:12px!important;
      width:100%!important;
      max-width:100%!important;
      min-width:0!important;
      overflow:hidden!important;
      box-sizing:border-box!important;
    }
    /* Quest wrappers must not cap or clip the viewport-sized workspace. Keep
       scrolling inside the PDF and response desk, not these ancestor boxes. */
    [data-betterquest-pdf-parent="true"]{
      height:auto!important;
      flex-shrink:0!important;
      max-height:none!important;
      overflow:visible!important;
    }
    #target[data-betterquest-pdf-workspace="enhanced"][data-betterquest-rail="collapsed"],
    [data-betterquest-pdf-workspace="enhanced"][data-betterquest-rail="collapsed"]{
      grid-template-columns:minmax(0,1fr) 160px!important;
    }
    [data-betterquest-pdf-workspace="enhanced"] > #pdf-frame{
      grid-column:1!important;
      grid-row:2!important;
      width:100%!important;
      height:100%!important;
      max-height:none!important;
      min-width:0!important;
      min-height:0!important;
      box-sizing:border-box!important;
    }
    [data-betterquest-pdf-workspace="enhanced"] > [data-betterquest="assessment-rail"]{
      grid-column:2!important;
      grid-row:2!important;
      min-width:0!important;
      min-height:0!important;
      height:100%!important;
      max-height:none!important;
      box-sizing:border-box!important;
    }
    /* Header (due date + PDF Download) pins to the top row. */
    [data-betterquest-pdf-workspace="enhanced"] > :is(#info-header-div, [data-betterquest-due-row]){
      grid-column:1 / -1!important;
      grid-row:1!important;
      min-width:0!important;
      margin:0!important;
    }
    /* Paging and the quicklink strip duplicate the rail question cards;
       hiding them keeps the workspace to a single viewport. */
    [data-betterquest-pdf-workspace="enhanced"] :is(#upper-paging-div, #lower-paging-div, #instanceitem-list, .review-controls-container){
      display:none!important;
    }
    [data-betterquest-pdf-workspace="enhanced"] > br{
      display:none!important;
    }
    [data-betterquest-collapsed-gap="true"]{
      display:none!important;
    }
    [data-betterquest-pdf-workspace="enhanced"] [data-betterquest-native-responses]:not([data-betterquest-native-visible="true"]),
    [data-betterquest-pdf-workspace="enhanced"] #view-responses-table-id:not([data-betterquest-native-visible="true"]),
    [data-betterquest-native-responses]:not([data-betterquest-native-visible="true"]),
    #view-responses-table-id:not([data-betterquest-native-visible="true"]){
      position:absolute!important;
      width:1px!important;
      height:1px!important;
      padding:0!important;
      margin:-1px!important;
      overflow:hidden!important;
      clip:rect(0,0,0,0)!important;
      clip-path:inset(50%)!important;
      white-space:nowrap!important;
      border:0!important;
      opacity:0!important;
      pointer-events:none!important;
    }
    #tally-div,
    div[id*="tally"],
    .tally,
    [data-betterquest-native-stats="true"]{
      display:none!important;
    }
    @media(max-width:1050px){
      #target[data-betterquest-pdf-workspace="enhanced"],
      [data-betterquest-pdf-workspace="enhanced"]{
        grid-template-columns:minmax(0,1fr)!important;
        grid-template-rows:auto auto auto!important;
        height:auto!important;
        overflow:visible!important;
      }
      #target[data-betterquest-pdf-workspace="enhanced"] > #pdf-frame,
      [data-betterquest-pdf-workspace="enhanced"] > #pdf-frame{
        grid-column:1!important;
        grid-row:2!important;
        height:var(--bq-pdf-workspace-height,85dvh)!important;
      }
      #target[data-betterquest-pdf-workspace="enhanced"] > [data-betterquest="assessment-rail"],
      [data-betterquest-pdf-workspace="enhanced"] > [data-betterquest="assessment-rail"]{
        grid-column:1!important;
        grid-row:3!important;
        height:auto!important;
      }
    }
    #pdf-frame,
    [data-betterquest-pdf-workspace="enhanced"] #pdf-frame{
      display:block!important;
      width:100%!important;
      max-width:100%!important;
      min-width:100%!important;
      margin:0!important;
      float:none!important;
      clear:both!important;
      box-sizing:border-box!important;
    }
    /* Mode-specific PDF display: STRICTLY show ONLY ONE type of PDF depending on view mode */
    :is(html, body, #target, [data-betterquest-pdf-workspace], #pdf-frame)[data-betterquest-pdf-mode="betterquest"] #presentation-pdf-frame,
    :is(html, body, #target, [data-betterquest-pdf-workspace], #pdf-frame)[data-betterquest-pdf-mode="betterquest"] iframe:not([data-betterquest]),
    :is(html, body, #target, [data-betterquest-pdf-workspace], #pdf-frame)[data-betterquest-pdf-mode="betterquest"] #pdf-frame > :not([data-betterquest="interactive-pdf"]),
    :is(html, body, #target, [data-betterquest-pdf-workspace], #pdf-frame)[data-betterquest-pdf-mode="new"] #presentation-pdf-frame,
    :is(html, body, #target, [data-betterquest-pdf-workspace], #pdf-frame)[data-betterquest-pdf-mode="new"] iframe:not([data-betterquest]),
    :is(html, body, #target, [data-betterquest-pdf-workspace], #pdf-frame)[data-betterquest-pdf-mode="new"] #pdf-frame > :not([data-betterquest="interactive-pdf"]),
    #pdf-frame[data-betterquest-pdf-mode="betterquest"] #presentation-pdf-frame,
    #pdf-frame[data-betterquest-pdf-mode="betterquest"] iframe:not([data-betterquest]),
    #pdf-frame[data-betterquest-pdf-mode="betterquest"] > :not([data-betterquest="interactive-pdf"]),
    #presentation-pdf-frame[hidden],
    #presentation-pdf-frame iframe[hidden],
    #pdf-frame iframe[hidden]{
      display: none !important;
      visibility: hidden !important;
      height: 0 !important;
      max-height: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
      pointer-events: none !important;
    }

    :is(html, body, #target, [data-betterquest-pdf-workspace], #pdf-frame)[data-betterquest-pdf-mode="betterquest"] [data-betterquest="interactive-pdf"],
    :is(html, body, #target, [data-betterquest-pdf-workspace], #pdf-frame)[data-betterquest-pdf-mode="new"] [data-betterquest="interactive-pdf"],
    #pdf-frame[data-betterquest-pdf-mode="betterquest"] [data-betterquest="interactive-pdf"]{
      display: block !important;
      width: 100% !important;
      min-width: 100% !important;
      max-width: 100% !important;
      box-sizing: border-box !important;
    }
    :is(html, body, #target, [data-betterquest-pdf-workspace], #pdf-frame)[data-betterquest-pdf-mode="betterquest"] [data-betterquest="interactive-pdf"][hidden],
    :is(html, body, #target, [data-betterquest-pdf-workspace], #pdf-frame)[data-betterquest-pdf-mode="new"] [data-betterquest="interactive-pdf"][hidden]{
      display: none !important;
    }

    :is(html, body, #target, [data-betterquest-pdf-workspace], #pdf-frame)[data-betterquest-pdf-mode="basic"] [data-betterquest="interactive-pdf"],
    :is(html, body, #target, [data-betterquest-pdf-workspace], #pdf-frame)[data-betterquest-pdf-mode="old"] [data-betterquest="interactive-pdf"],
    #pdf-frame[data-betterquest-pdf-mode="basic"] [data-betterquest="interactive-pdf"],
    #pdf-frame[data-betterquest-pdf-mode="old"] [data-betterquest="interactive-pdf"],
    [data-betterquest="interactive-pdf"][hidden]{
      display: none !important;
      visibility: hidden !important;
      height: 0 !important;
      max-height: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
      pointer-events: none !important;
    }

    :is(html, body, #target, [data-betterquest-pdf-workspace], #pdf-frame)[data-betterquest-pdf-mode="basic"] #presentation-pdf-frame,
    :is(html, body, #target, [data-betterquest-pdf-workspace], #pdf-frame)[data-betterquest-pdf-mode="basic"] #presentation-pdf-frame iframe,
    :is(html, body, #target, [data-betterquest-pdf-workspace], #pdf-frame)[data-betterquest-pdf-mode="basic"] #pdf-frame iframe,
    :is(html, body, #target, [data-betterquest-pdf-workspace], #pdf-frame)[data-betterquest-pdf-mode="old"] #presentation-pdf-frame,
    :is(html, body, #target, [data-betterquest-pdf-workspace], #pdf-frame)[data-betterquest-pdf-mode="old"] #presentation-pdf-frame iframe,
    :is(html, body, #target, [data-betterquest-pdf-workspace], #pdf-frame)[data-betterquest-pdf-mode="old"] #pdf-frame iframe,
    #pdf-frame[data-betterquest-pdf-mode="basic"] #presentation-pdf-frame,
    #pdf-frame[data-betterquest-pdf-mode="basic"] iframe{
      display: block !important;
      visibility: visible !important;
      width: 100% !important;
      max-width: 100% !important;
      min-width: 100% !important;
      margin: 0 !important;
      float: none !important;
      overflow: hidden;
      border: 0;
      border-radius: 0;
      background: #fff;
      box-shadow: 0 18px 50px #172a3b1a;
      box-sizing: border-box !important;
    }

    :is(html, body, #target, [data-betterquest-pdf-workspace], #pdf-frame)[data-betterquest-pdf-mode="basic"] #presentation-pdf-frame iframe,
    :is(html, body, #target, [data-betterquest-pdf-workspace], #pdf-frame)[data-betterquest-pdf-mode="basic"] #pdf-frame iframe,
    :is(html, body, #target, [data-betterquest-pdf-workspace], #pdf-frame)[data-betterquest-pdf-mode="old"] #presentation-pdf-frame iframe,
    :is(html, body, #target, [data-betterquest-pdf-workspace], #pdf-frame)[data-betterquest-pdf-mode="old"] #pdf-frame iframe,
    #pdf-frame[data-betterquest-pdf-mode="basic"] iframe{
      height: calc(100vh - 104px) !important;
      min-height: min(760px, calc(100vh - 140px)) !important;
      border: 0;
      background: #fff;
      color-scheme: light;
      box-sizing: border-box !important;
    }

    /* FULLSCREEN / FULL PAGE: Completely hide sidebar rail and native elements, 100vw x 100vh full page */
    :fullscreen [data-betterquest="assessment-rail"],
    [data-betterquest-fullscreen="true"] [data-betterquest="assessment-rail"],
    #target:fullscreen [data-betterquest="assessment-rail"],
    #target[data-betterquest-fullscreen="true"] [data-betterquest="assessment-rail"],
    #target:fullscreen > [data-betterquest="assessment-rail"],
    #target[data-betterquest-fullscreen="true"] > [data-betterquest="assessment-rail"],
    #target:fullscreen > :not(#pdf-frame),
    #target[data-betterquest-fullscreen="true"] > :not(#pdf-frame){
      display:none!important;
    }
    #target:fullscreen,
    #target[data-betterquest-fullscreen="true"]{
      display:block!important;
      position:fixed!important;
      inset:0!important;
      z-index:999999!important;
      width:100vw!important;
      height:100vh!important;
      max-width:none!important;
      margin:0!important;
      padding:0!important;
      overflow:hidden!important;
      background:#0f172a!important;
      box-sizing:border-box!important;
    }
    #target:fullscreen > #pdf-frame,
    #target[data-betterquest-fullscreen="true"] > #pdf-frame,
    #pdf-frame:fullscreen,
    [data-betterquest-fullscreen="true"] #pdf-frame,
    :fullscreen #pdf-frame{
      display:block!important;
      position:fixed!important;
      inset:0!important;
      z-index:999999!important;
      width:100vw!important;
      height:100vh!important;
      max-width:100vw!important;
      max-height:100vh!important;
      margin:0!important;
      padding:0!important;
      min-width:0!important;
      border:0!important;
      border-radius:0!important;
      background:#0f172a!important;
    }
    /* In fullscreen, ONLY the interactive viewer may live inside #pdf-frame.
       Quest re-seeds its native PDF frame at any time, and a re-seeded frame
       sized to the viewport would swallow every tap — so every sibling of the
       interactive viewer is hidden outright, regardless of which frame Quest
       last rendered. */
    :fullscreen[data-betterquest-pdf-mode="betterquest"] > :not([data-betterquest="interactive-pdf"]),
    :fullscreen[data-betterquest-pdf-mode="new"] > :not([data-betterquest="interactive-pdf"]),
    #pdf-frame[data-betterquest-pdf-mode="betterquest"]:fullscreen > :not([data-betterquest="interactive-pdf"]),
    #pdf-frame[data-betterquest-pdf-mode="new"]:fullscreen > :not([data-betterquest="interactive-pdf"]),
    [data-betterquest-fullscreen="true"] #pdf-frame[data-betterquest-pdf-mode="betterquest"] > :not([data-betterquest="interactive-pdf"]),
    [data-betterquest-fullscreen="true"] #pdf-frame[data-betterquest-pdf-mode="new"] > :not([data-betterquest="interactive-pdf"]){
      display:none!important;
    }
    :fullscreen :is([data-betterquest-pdf-mode="basic"], [data-betterquest-pdf-mode="old"]) [data-betterquest="interactive-pdf"],
    [data-betterquest-fullscreen="true"] :is([data-betterquest-pdf-mode="basic"], [data-betterquest-pdf-mode="old"]) [data-betterquest="interactive-pdf"],
    :fullscreen #pdf-frame[data-betterquest-pdf-mode="basic"] [data-betterquest="interactive-pdf"],
    [data-betterquest-fullscreen="true"] #pdf-frame[data-betterquest-pdf-mode="basic"] [data-betterquest="interactive-pdf"]{
      display:none!important;
    }
    :fullscreen #presentation-pdf-frame,
    [data-betterquest-fullscreen="true"] #presentation-pdf-frame{
      width:100vw!important;
      height:100vh!important;
      border:0!important;
      border-radius:0!important;
      box-shadow:none!important;
      margin:0!important;
      padding:0!important;
    }
    :fullscreen [data-betterquest="interactive-pdf"],
    [data-betterquest-fullscreen="true"] [data-betterquest="interactive-pdf"],
    #pdf-frame:fullscreen [data-betterquest="interactive-pdf"]{
      display:block!important;
      width:100vw!important;
      height:100vh!important;
      min-height:100vh!important;
      max-height:100vh!important;
      border:0!important;
      border-radius:0!important;
    }
    :fullscreen #presentation-pdf-frame iframe,
    [data-betterquest-fullscreen="true"] #presentation-pdf-frame iframe{
      width:100vw!important;
      height:100vh!important;
      min-height:100vh!important;
      border:0!important;
    }
    #presentation-div[data-betterquest-slide="enhanced"] .instanceitempart{background:#fff!important;color:#18253a!important;color-scheme:light;border-radius:10px;isolation:isolate;display:flow-root;padding:18px 24px 24px!important;margin:0 0 16px!important;height:auto!important;min-height:0;box-sizing:border-box}
    #presentation-div[data-betterquest-slide="enhanced"] .instanceitempart > .bg-light{padding:0!important;margin:0!important;max-width:100%;width:100%}
    #presentation-div[data-betterquest-slide="enhanced"] .instanceitempart .custom-control:last-child{margin-bottom:0}
    #presentation-div[data-betterquest-slide="enhanced"] .bg-light{background:#fff!important;color:#18253a!important;border-radius:10px;padding:18px 24px!important}
    #presentation-div[data-betterquest-slide="enhanced"] .instanceitempart :where(p,span,label,h1,h2,h3,h4,h5,h6,mjx-container,.MathJax,.MathJax_Display){color:#18253a!important}
    #presentation-div[data-betterquest-slide="enhanced"] .instanceitempart :where(img,svg,canvas){filter:none!important;mix-blend-mode:normal!important;opacity:1;color-scheme:light}
    #presentation-div[data-betterquest-slide="enhanced"] .custom-control{margin:4px 0}
    #presentation-div[data-betterquest-slide="enhanced"] .instanceitempart .d-flex > .submit-btn{margin-left:12px;align-self:center;flex-shrink:0}
    #presentation-div[data-betterquest-slide="enhanced"] .bq-slide-metrics{display:flex;flex-wrap:wrap;gap:6px 16px;margin:12px 0 4px;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;font-size:12px;line-height:1.4;color:#475569}
    #presentation-div[data-betterquest-slide="enhanced"] .bq-slide-metrics strong{color:#0f172a;font-weight:750}
    #presentation-div[data-betterquest-slide="enhanced"] .custom-control-label{display:block!important;min-height:48px;padding:11px 15px 11px 42px!important;border:1px solid #d9d4c9;border-radius:8px;color:#18253a!important;background:#fff;cursor:pointer;transition:border-color .18s ease,box-shadow .18s ease,transform .18s ease,background-color .18s ease}
    @media(hover:hover) and (pointer:fine){
    #presentation-div[data-betterquest-slide="enhanced"] .custom-control-label:hover{border-color:#6366f1}
    }
    #presentation-div[data-betterquest-slide="enhanced"] .custom-control-input:checked + .custom-control-label{border-color:#4f46e5;box-shadow:0 0 0 3px #6366f133,0 4px 14px rgba(99,102,241,.15);background:linear-gradient(135deg,#eef2ff 0%,#f5f3ff 60%,#faf5ff 100%)}
    #presentation-div[data-betterquest-slide="enhanced"] :where(mjx-container,.MathJax,.MathJax_Display){color:#18253a!important}
    #presentation-div[data-betterquest-slide="enhanced"] .instanceitempart .submit-btn{opacity:0;visibility:hidden;pointer-events:none;transform:translateX(-8px);transition:opacity .18s ease,transform .18s ease}
    #presentation-div[data-betterquest-slide="enhanced"] .instanceitempart[data-betterquest-question-ready="true"] .submit-btn{opacity:1;visibility:visible;pointer-events:auto;transform:none}
    #presentation-div[data-betterquest-slide="enhanced"] .instanceitempart[data-betterquest-verdict="correct"] .custom-control-input:checked + .custom-control-label{border-color:#16a34a;background:linear-gradient(135deg,#f0fdf4 0%,#ecfdf5 100%);box-shadow:0 0 0 3px #16a34a33,0 4px 14px rgba(22,163,74,.15)}
    #main-content #question-bar-div .questionBar{background:none!important;background-color:transparent!important;height:auto!important;min-height:0!important;color:var(--bq-text,#0f172a)!important;font-weight:800!important}
    #presentation-div[data-betterquest-slide="enhanced"] .instanceitempart[data-betterquest-verdict="wrong"] .custom-control-input:checked + .custom-control-label{border-color:#dc2626;background:linear-gradient(135deg,#fef2f2 0%,#fff5f5 100%);box-shadow:0 0 0 3px #dc262626;text-decoration:line-through}
    .bq-slide-verdict{position:fixed;top:76px;left:50%;transform:translateX(-50%);z-index:999999;display:flex;align-items:center;gap:8px;padding:8px 16px;border-radius:999px;font:750 13px/1.2 ui-rounded,"Avenir Next",sans-serif;white-space:nowrap;box-shadow:0 8px 24px rgba(0,0,0,.3);animation:bq-verdict-in .2s ease-out}
    .bq-slide-verdict[data-verdict="correct"]{background:#16a34a;color:#fff}
    .bq-slide-verdict[data-verdict="wrong"]{background:#dc2626;color:#fff}
    #presentation-div[data-betterquest-slide="enhanced"] .instanceitempart[data-betterquest-verdict] .custom-control-input:checked + .custom-control-label{position:relative}
    #presentation-div[data-betterquest-slide="enhanced"] .instanceitempart[data-betterquest-verdict="correct"] .custom-control-input:checked + .custom-control-label{animation:bq-correct-pop .35s ease-out}
    #presentation-div[data-betterquest-slide="enhanced"] .instanceitempart[data-betterquest-verdict="correct"] .custom-control-input:checked + .custom-control-label::after{content:'✓';position:absolute;right:10px;top:50%;transform:translateY(-50%);display:grid;place-items:center;width:22px;height:22px;border-radius:50%;background:#16a34a;color:#fff;font:800 13px/1 ui-rounded,"Avenir Next",sans-serif;box-shadow:0 2px 8px rgba(22,163,74,.55)}
    #presentation-div[data-betterquest-slide="enhanced"] .instanceitempart[data-betterquest-verdict="wrong"] .custom-control-input:checked + .custom-control-label::after{content:'✕';position:absolute;right:10px;top:50%;transform:translateY(-50%);display:grid;place-items:center;width:22px;height:22px;border-radius:50%;background:#dc2626;color:#fff;font:800 12px/1 ui-rounded,"Avenir Next",sans-serif;box-shadow:0 2px 6px rgba(220,38,38,.45)}
    @keyframes bq-verdict-in{from{opacity:0;transform:translate(-50%,-6px)}to{opacity:1;transform:translate(-50%,0)}}
    @keyframes bq-correct-pop{0%{transform:scale(.98)}60%{transform:scale(1.015)}100%{transform:scale(1)}}
    @media(max-width:1050px){#target[data-betterquest-pdf-workspace="enhanced"]{grid-template-columns:1fr}#target[data-betterquest-pdf-workspace="enhanced"] > #pdf-frame,#target[data-betterquest-pdf-workspace="enhanced"] > [data-betterquest="assessment-rail"]{grid-column:1}#target[data-betterquest-pdf-workspace="enhanced"] > [data-betterquest="assessment-rail"]{position:static;margin-top:14px}}
    @media(prefers-reduced-motion:reduce){#presentation-div[data-betterquest-slide="enhanced"] .custom-control-label,#presentation-div[data-betterquest-slide="enhanced"] .submit-btn{transition:none!important}#presentation-div[data-betterquest-slide="enhanced"] .instanceitempart[data-betterquest-verdict="correct"] .custom-control-input:checked + .custom-control-label,.bq-slide-verdict{animation:none!important}}
  `;
  document.head.append(style); return style;
}

function pointsSummary(value: string): string {
  const match = value.match(/([-+]?\d+(?:\.\d+)?)\s+out of\s+([-+]?\d+(?:\.\d+)?)\s+points(?:\s*\(([-+]?\d+(?:\.\d+)?)%\))?/i);
  return match ? `${match[1]} / ${match[2]} (${match[3] || '0'}%)` : (value || 'Not available');
}

function withNativeResponsesVisible<T>(elements: PdfAssessmentElements, read: () => T): T {
  const marked = elements.responseRoot.hasAttribute('data-betterquest-native-responses');
  elements.responseRoot.removeAttribute('data-betterquest-native-responses');
  elements.responseRoot.dataset.betterquestNativeVisible = 'true';
  // Fullscreen hides every #target child except the PDF frame, which takes the
  // wrappers above the response table out of layout. Everything inside this
  // scope is programmatic (set value, dispatch events, click), so mark the
  // whole chain to read through it — this never affects rendering.
  const markedAncestors: HTMLElement[] = [];
  for (let node = elements.responseRoot.parentElement; node && node !== elements.responseRoot.ownerDocument.documentElement; node = node.parentElement) {
    if (node.hasAttribute('data-betterquest-native-visible')) continue;
    node.setAttribute('data-betterquest-native-visible', 'true');
    markedAncestors.push(node);
  }
  try { return read(); }
  finally {
    delete elements.responseRoot.dataset.betterquestNativeVisible;
    for (const node of markedAncestors) node.removeAttribute('data-betterquest-native-visible');
    if (marked) elements.responseRoot.dataset.betterquestNativeResponses = 'true';
  }
}

function hideNativeStatsElements(document: Document, root: HTMLElement) {
  document.querySelectorAll('#tally-div, [id*="tally"], .tally').forEach(el => {
    if (el.closest('[data-betterquest]')) return;
    (el as HTMLElement).style.setProperty('display', 'none', 'important');
    (el as HTMLElement).dataset.betterquestNativeStats = 'true';
  });

  const candidates = root.querySelectorAll('p, div, span');
  for (const el of candidates) {
    if (el === root || el.contains(root)) continue;
    if (el.closest('[data-betterquest]')) continue;
    if (el.querySelector('#pdf-frame, [data-betterquest], table, iframe, canvas, select, button, input')) continue;
    const tag = el.tagName.toLowerCase();
    if (tag === 'body' || tag === 'html' || tag === 'main' || tag === 'form') continue;

    const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (!text || text.length > 250) continue;

    const isScore = /[-+]?\d+(?:\.\d+)?\s+out\s+of\s+[-+]?\d+(?:\.\d+)?\s+points/i.test(text);
    const isAvg = /Class\s*Average/i.test(text);
    const isSd = /Standard\s*Deviation/i.test(text);

    if (isScore || isAvg || isSd) {
      (el as HTMLElement).style.setProperty('display', 'none', 'important');
      (el as HTMLElement).dataset.betterquestNativeStats = 'true';
    }
  }
}

function withSlideEnhancementDisabled<T>(presentation: HTMLElement, read: () => T): T {
  const enhanced = presentation.hasAttribute('data-betterquest-slide');
  presentation.removeAttribute('data-betterquest-slide');
  try { return read(); }
  finally { if (enhanced) presentation.dataset.betterquestSlide = 'enhanced'; }
}

export function createPdfAssessmentWorkspace(root: HTMLElement, options: { createPdfViewer?: PdfViewerFactory } = {}) {
  const document = root.ownerDocument;
  const style = installStyles(document);
  const host = document.createElement('aside'); host.dataset.betterquest = 'assessment-rail';
  const shadow = host.attachShadow({ mode: 'open' });
  const localStyle = document.createElement('style');
  localStyle.textContent = `
    :host{display:block;min-width:0;min-height:0;color:var(--bq-text,#18253a);font:14px/1.4 ui-rounded,"Avenir Next",sans-serif;color-scheme:light dark;--bq-assessment-muted:color-mix(in srgb,var(--bq-muted,#748491) 70%,var(--bq-text,#18253a));--bq-assessment-accent:color-mix(in srgb,var(--bq-accent,#227ab0) 78%,var(--bq-text,#18253a))}
    *{box-sizing:border-box}
    .rail{height:100%;max-height:100%;overflow:auto;padding:16px;border:1px solid var(--bq-border,#d7e2f0);border-radius:3px;background:color-mix(in srgb,var(--bq-surface,#fff) 96%,transparent);box-shadow:0 18px 50px #172a3b18;scrollbar-width:thin}
    header{position:sticky;top:-16px;z-index:2;margin:-16px -16px 12px;padding:16px;background:var(--bq-surface,#fff);border-bottom:1px solid var(--bq-border,#d7e2f0)}
    .top{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
    .title-group{display:flex;align-items:center;gap:12px}
    h2{margin:0;font:750 17px/1.15 ui-rounded,"Avenir Next",sans-serif;letter-spacing:-.02em}
    .mode-switcher{display:inline-flex;align-items:center;padding:3px;border-radius:3px;background:var(--bq-raised,#eef2f6);border:1px solid var(--bq-border,#d7e2f0);gap:2px}
    .mode-btn{border:0;border-radius:2px;background:transparent;color:var(--bq-assessment-muted);padding:5px 11px;font:700 11px/1 inherit;cursor:pointer;transition:background .15s ease,color .15s ease,box-shadow .15s ease}
    .mode-btn:hover{color:var(--bq-text,#18253a)}
    .mode-btn.active,.mode-btn[aria-checked="true"]{background:#2563eb;color:#fff;font-weight:800;box-shadow:0 1px 4px #00000024}
    .mode-btn:focus-visible{outline:2px solid #2563eb;outline-offset:1px}
    .actions{display:flex;gap:6px}
    .focus,.collapse-btn{border:1px solid var(--bq-border,#d7e2f0);border-radius:3px;background:var(--bq-raised,#eef3f6);color:var(--bq-text,#18253a);padding:7px 9px;font:700 11px/1 inherit;cursor:pointer}
    .collapse-btn svg{display:block;transition:transform .18s ease}
    :host([data-collapsed="true"]) .collapse-btn svg{transform:rotate(180deg)}
    .focus:focus-visible,.collapse-btn:focus-visible,.choice:focus-visible,.submit:focus-visible,.number:focus-visible,.qnav-btn:focus-visible{outline:2px solid var(--bq-accent,#6366f1);outline-offset:2px}
    .metrics-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:12px}
    .metric-card{display:flex;flex-direction:column;gap:3px;padding:8px 10px;border:1px solid var(--bq-border,#e2e8f0);border-radius:3px;background:var(--bq-raised,#f8fafc)}
    :host([data-collapsed="true"]) .metric-sd{display:none}
    .metric-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--bq-assessment-muted)}
    .metric-value{font-size:13px;font-weight:750;color:var(--bq-text,#0f172a);line-height:1.35;overflow:visible;white-space:normal;overflow-wrap:anywhere}
    .metric-value.points{color:var(--bq-assessment-accent)}
    .progress-wrap{margin-top:10px}
    .progress-copy{margin:0;color:var(--bq-assessment-muted);font-size:12px}
    .meter{height:6px;margin-top:8px;overflow:hidden;border-radius:2px;background:var(--bq-raised,#eef3f6);position:relative}
    .meter span{display:block;height:100%;width:var(--progress);border-radius:inherit;background:linear-gradient(90deg,#2563eb,#60a5fa,#2563eb);background-size:200% 100%;animation:bq-flow 3s linear infinite;transition:width .25s ease}
    .meter span::after{content:'';position:absolute;inset:0;background:linear-gradient(100deg,transparent 20%,#ffffff60 50%,transparent 80%);transform:translateX(-100%);animation:bq-sheen 3.5s ease-in-out infinite}
    .meter:hover{box-shadow:0 0 0 3px #2563eb30}
    .meter:hover span{animation-duration:1s}
    @keyframes bq-flow{to{background-position:-200% 0}}
    @keyframes bq-sheen{0%{transform:translateX(-100%)}60%,100%{transform:translateX(100%)}}
    :host([data-collapsed="true"]) .progress-wrap{display:none}

    /* Answer cards always stack single-file in the sidebar */
    .questions{display:grid;grid-template-columns:1fr;gap:12px;margin-top:14px}
    :host([data-collapsed="true"]) .questions{display:none!important}
    .side{display:flex;flex-direction:column;gap:8px;margin-top:10px}
    :host([data-collapsed="true"]) .side{flex:1;min-height:0;margin-top:10px;overflow:hidden}
    .qnav-header{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 2px;margin-bottom:2px}
    :host([data-collapsed="true"]) .qnav-header{display:none}
    .qnav-title{font-size:11px;font-weight:750;text-transform:uppercase;letter-spacing:.04em;color:var(--bq-assessment-muted)}
    .qnav-legend{display:flex;align-items:center;gap:8px;font-size:10.5px;color:var(--bq-assessment-muted)}
    .qnav{display:grid;grid-template-columns:repeat(auto-fill,minmax(34px,1fr));gap:6px;padding:2px}
    :host([data-collapsed="true"]) .qnav{grid-template-columns:repeat(3,minmax(0,1fr));flex:1;min-height:0;overflow-y:auto;scrollbar-width:thin;padding-right:2px;align-content:start}
    .qnav-btn{aspect-ratio:1;min-height:34px;border:1.5px solid var(--bq-border,#d7e2f0);border-radius:3px;background:var(--bq-raised,#f2f5f7);color:var(--bq-assessment-muted);font:750 13px/1 inherit;cursor:pointer;transition:border-color .15s ease,background .15s ease,transform .15s ease,box-shadow .15s ease;display:grid;place-items:center}
    .qnav-btn:hover{border-color:var(--bq-accent,#6366f1);transform:translateY(-1px);box-shadow:0 2px 6px rgba(0,0,0,0.06)}
    .qnav-btn:active{transform:translateY(0)}
    .qnav-btn.q-done{border-color:#16a34a;background:color-mix(in srgb,#16a34a 18%,var(--bq-raised,#f2f5f7));color:color-mix(in srgb,#15803d 85%,var(--bq-text,#18253a))}
    .qnav-btn.q-retry{border-color:#ea580c;background:color-mix(in srgb,#ea580c 18%,var(--bq-raised,#f2f5f7));color:color-mix(in srgb,#c2410c 85%,var(--bq-text,#18253a))}
    .qnav-btn.q-wrong{border-color:#dc2626;background:color-mix(in srgb,#dc2626 16%,var(--bq-raised,#f2f5f7));color:color-mix(in srgb,#b91c1c 85%,var(--bq-text,#18253a))}

    .deck-footer{display:none}
    :host([data-collapsed="true"]) .deck-footer{display:flex;flex-direction:column;gap:10px;margin-top:auto;padding-top:10px;border-top:1px solid var(--bq-border,#d7e2f0);flex-shrink:0}
    .deck-pct{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:8px 4px;border-radius:3px;background:var(--bq-raised,#f2f5f7);border:1px solid var(--bq-border,#d7e2f0);text-align:center}
    .pct-value{font:800 24px/1 ui-rounded,"Avenir Next",system-ui,sans-serif;color:var(--bq-text,#18253a);font-variant-numeric:tabular-nums;letter-spacing:-.02em}
    .pct-label{font:700 11px/1.2 ui-rounded,"Avenir Next",system-ui,sans-serif;color:var(--bq-assessment-muted);letter-spacing:.02em}

    .legend{display:grid;grid-template-columns:repeat(2,1fr);gap:4px 6px;font-size:10.5px;color:var(--bq-assessment-muted);flex-shrink:0;padding:0 2px}
    .legend-item{display:flex;align-items:center;gap:5px;white-space:nowrap}
    .legend-dot{width:8px;height:8px;border-radius:2px;flex-shrink:0}
    .legend-dot.dot-done{background:#16a34a;border:1px solid #15803d}
    .legend-dot.dot-retry{background:#ea580c;border:1px solid #c2410c}
    .legend-dot.dot-wrong{background:#dc2626;border:1px solid #b91c1c}
    .legend-dot.dot-unattempted{background:var(--bq-raised,#f2f5f7);border:1px solid var(--bq-border,#d7e2f0)}
    :host([data-collapsed="true"]) .rail{display:flex;flex-direction:column;overflow:hidden;padding:12px 10px;height:100%;max-height:100%}
    :host([data-collapsed="true"]) .metrics-grid{display:none}
    :host([data-collapsed="true"]) h2{font-size:13px}
    :host([data-collapsed="true"]) .top{flex-direction:column;align-items:stretch}
    :host([data-collapsed="true"]) .actions{justify-content:space-between}

    .question{display:flex;flex-direction:column;gap:10px;padding:14px;border:1px solid var(--bq-border,#d7e2f0);border-radius:3px;background:var(--bq-surface,#fff);box-shadow:0 2px 8px #0f172a08;transition:border-color .18s ease,box-shadow .18s ease}
    .question[data-status="done"]{border-color:color-mix(in srgb,#16a34a 45%,var(--bq-border,#d7e2f0))}
    .question[data-status="retry"]{border-color:color-mix(in srgb,#ea580c 45%,var(--bq-border,#d7e2f0))}
    .question[data-status="wrong"]{border-color:color-mix(in srgb,#dc2626 45%,var(--bq-border,#d7e2f0))}
    .question:focus-within{border-color:var(--bq-accent,#227ab0)}
    .question-top{display:flex;align-items:center;justify-content:space-between;gap:8px}
    .number{font-weight:800;font-size:13px;color:var(--bq-text,#18253a);border:0;background:transparent;padding:2px 4px;margin:-2px -4px;border-radius:2px;cursor:pointer;font-family:inherit;text-align:left}
    .number:hover{color:var(--bq-assessment-accent);text-decoration:underline;text-underline-offset:2px}
    .number:focus-visible{outline:2px solid var(--bq-accent,#6366f1);outline-offset:2px}
    .selected{color:var(--bq-assessment-muted);font-size:11px;font-weight:600}
    .question-bottom{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
    .choices{display:flex;flex-wrap:wrap;gap:6px}
    .choice{width:32px;height:32px;border:1px solid var(--bq-border,#d7e2f0);border-radius:3px;background:var(--bq-raised,#f2f5f7);color:var(--bq-text,#18253a);font:750 12px/1 inherit;cursor:pointer;transition:transform .15s ease,border-color .15s ease,background .15s ease}
    .choice:hover{border-color:var(--bq-accent,#6366f1)}
    .choice[aria-pressed="true"]{border-color:#2563eb;background:#2563eb;color:#fff;box-shadow:0 5px 13px #2563eb33}
    .submit{border:0;border-radius:3px;background:#2563eb;color:#fff;padding:8px 14px;font:750 11px/1 inherit;cursor:pointer;transition:transform .15s ease,box-shadow .15s ease;margin-left:auto}
    .submit:hover{transform:translateY(-1px);background:#1d4ed8;box-shadow:0 4px 12px #2563eb40}
    .submit[hidden]{display:none}
    .submitted-tag{display:inline-flex;align-items:center;padding:5px 12px;border-radius:3px;background:var(--bq-raised,#f2f5f7);color:var(--bq-assessment-muted);font:700 12px/1 inherit;border:1px solid var(--bq-border,#d7e2f0)}
    .verdict-pill{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:3px;font:700 11px/1 inherit;border:1px solid;white-space:nowrap}
    .verdict-correct{background:color-mix(in srgb,#16a34a 12%,transparent);border-color:color-mix(in srgb,#16a34a 45%,transparent);color:color-mix(in srgb,#16a34a 72%,var(--bq-text,#18253a))}
    .verdict-wrong{background:color-mix(in srgb,#dc2626 10%,transparent);border-color:color-mix(in srgb,#dc2626 40%,transparent);color:color-mix(in srgb,#dc2626 72%,var(--bq-text,#18253a))}
    .verdict-done{background:var(--bq-raised,#f2f5f7);border-color:var(--bq-border,#d7e2f0);color:var(--bq-assessment-muted)}
    .points-note{margin-left:auto;font:750 12px/1 inherit;color:var(--bq-text,#18253a);font-variant-numeric:tabular-nums;white-space:nowrap}
    .empty{color:var(--bq-assessment-muted);grid-column:1/-1}
    @media(max-width:1050px){#target[data-betterquest-pdf-workspace="enhanced"]{grid-template-columns:1fr}#target[data-betterquest-pdf-workspace="enhanced"] > #pdf-frame,#target[data-betterquest-pdf-workspace="enhanced"] > [data-betterquest="assessment-rail"]{grid-column:1}#target[data-betterquest-pdf-workspace="enhanced"] > [data-betterquest="assessment-rail"]{position:static;margin-top:14px}}
    @media(prefers-reduced-motion:reduce){.meter span,.choice,.submit{transition:none}.choice:hover,.submit:hover{transform:none}.meter span,.meter span::after{animation:none}}
  `;
  const rail = document.createElement('section'); rail.className = 'rail'; rail.setAttribute('aria-label', 'Assessment responses');
  const header = document.createElement('header');
  const top = document.createElement('div'); top.className = 'top';

  const titleGroup = document.createElement('div'); titleGroup.className = 'title-group';
  const title = document.createElement('h2'); title.textContent = 'Response desk';

  let responseSignature = '';
  let collapsed = readCollapsed();
  const actions = document.createElement('div'); actions.className = 'actions';
  const collapseBtn = document.createElement('button');
  collapseBtn.type = 'button'; collapseBtn.className = 'collapse-btn';
  const paintCollapse = () => {
    collapseBtn.setAttribute('aria-expanded', String(!collapsed));
    collapseBtn.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
    collapseBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m14 6-6 6 6 6"></path></svg>`;
    host.dataset.collapsed = String(collapsed);
    root.dataset.betterquestRail = collapsed ? 'collapsed' : 'extended';
  };
  collapseBtn.addEventListener('click', () => {
    collapsed = !collapsed;
    try { document.defaultView?.localStorage?.setItem(COLLAPSED_KEY, collapsed ? '1' : '0'); } catch { /* preference only */ }
    paintCollapse();
  });
  paintCollapse();

  const focus = document.createElement('button'); focus.type = 'button'; focus.className = 'focus fullscreen-btn'; focus.dataset.action = 'fullscreen';
  focus.setAttribute('aria-label', 'Toggle full screen');
  focus.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg> Full screen`;
  titleGroup.append(title);
  actions.append(collapseBtn, focus);
  top.append(titleGroup, actions);

  const metricsGrid = document.createElement('div'); metricsGrid.className = 'metrics-grid';
  const scoreCard = document.createElement('div'); scoreCard.className = 'metric-card metric-score';
  const scoreLabel = document.createElement('span'); scoreLabel.className = 'metric-label'; scoreLabel.textContent = 'Your Score';
  const points = document.createElement('span'); points.className = 'metric-value points';
  scoreCard.append(scoreLabel, points);

  const avgCard = document.createElement('div'); avgCard.className = 'metric-card metric-average';
  const avgLabel = document.createElement('span'); avgLabel.className = 'metric-label'; avgLabel.textContent = 'Class Avg.';
  const classAvg = document.createElement('span'); classAvg.className = 'metric-value class-avg';
  classAvg.textContent = 'Not available';
  avgCard.append(avgLabel, classAvg);

  const sdCard = document.createElement('div'); sdCard.className = 'metric-card metric-sd';
  const sdLabel = document.createElement('span'); sdLabel.className = 'metric-label'; sdLabel.textContent = 'Standard Deviation';
  const stdDev = document.createElement('span'); stdDev.className = 'metric-value std-dev';
  stdDev.textContent = 'Not available';
  sdCard.append(sdLabel, stdDev);
  metricsGrid.append(scoreCard, avgCard, sdCard);

  const progressWrap = document.createElement('div'); progressWrap.className = 'progress-wrap';
  const progress = document.createElement('p'); progress.className = 'progress-copy';
  const meter = document.createElement('div'); meter.className = 'meter'; const meterValue = document.createElement('span'); meter.append(meterValue);
  progressWrap.append(progress, meter);

  const questions = document.createElement('div'); questions.className = 'questions';
  const qnav = document.createElement('nav'); qnav.className = 'qnav'; qnav.setAttribute('aria-label', 'Questions');

  const qnavHeader = document.createElement('div'); qnavHeader.className = 'qnav-header';
  const qnavTitle = document.createElement('span'); qnavTitle.className = 'qnav-title'; qnavTitle.textContent = 'Go to question';
  const qnavLegend = document.createElement('div'); qnavLegend.className = 'qnav-legend';
  qnavLegend.innerHTML = `
    <span class="legend-item"><span class="legend-dot dot-done" aria-hidden="true"></span>Done</span>
    <span class="legend-item"><span class="legend-dot dot-retry" aria-hidden="true"></span>Retried</span>
    <span class="legend-item"><span class="legend-dot dot-wrong" aria-hidden="true"></span>Incorrect</span>
  `;
  qnavHeader.append(qnavTitle, qnavLegend);

  const deckFooter = document.createElement('div'); deckFooter.className = 'deck-footer';
  const deckPct = document.createElement('div'); deckPct.className = 'deck-pct'; deckPct.setAttribute('aria-label', 'Completion progress');
  const pctValue = document.createElement('span'); pctValue.className = 'pct-value'; pctValue.textContent = '0%';
  const pctLabel = document.createElement('span'); pctLabel.className = 'pct-label'; pctLabel.textContent = 'complete';
  deckPct.append(pctValue, pctLabel);

  const legend = document.createElement('div'); legend.className = 'legend'; legend.setAttribute('aria-label', 'Question status legend');
  legend.innerHTML = `
    <div class="legend-item"><span class="legend-dot dot-done" aria-hidden="true"></span><span>Done</span></div>
    <div class="legend-item"><span class="legend-dot dot-retry" aria-hidden="true"></span><span>Retried</span></div>
    <div class="legend-item"><span class="legend-dot dot-wrong" aria-hidden="true"></span><span>Incorrect</span></div>
    <div class="legend-item"><span class="legend-dot dot-unattempted" aria-hidden="true"></span><span>Not started</span></div>
  `;
  deckFooter.append(deckPct, legend);

  header.append(top, metricsGrid, progressWrap);
  const side = document.createElement('div'); side.className = 'side';
  side.append(qnavHeader, qnav);
  rail.append(header, side, questions, deckFooter); shadow.append(localStyle, rail);
  host.dataset.layout = 'sidebar';
  rail.dataset.layout = 'sidebar';

  function readCollapsed(): boolean {
    try { return document.defaultView?.localStorage?.getItem(COLLAPSED_KEY) === '1'; }
    catch { return false; }
  }

  let disposed = false;
  let pdfViewer: PdfViewer | undefined;
  let pdfViewerStarted = false;
  let pdfViewerReady: boolean | undefined = undefined;
  const viewerFactory = options.createPdfViewer || (typeof chrome !== 'undefined' ? createInteractivePdfViewer : undefined);

  function toggleFullscreen(enable?: boolean) {
    const isFs = Boolean(document.fullscreenElement) || root.dataset.betterquestFullscreen === 'true';
    const shouldFs = enable !== undefined ? enable : !isFs;
    const elements = findPdfAssessment(document);
    if (!elements) return;

    if (!shouldFs) {
      if (document.fullscreenElement) {
        void document.exitFullscreen?.().catch(() => {});
      }
      root.removeAttribute('data-betterquest-fullscreen');
      document.documentElement.removeAttribute('data-betterquest-fullscreen');
      updateFsBtn();
      pdfViewer?.setFullscreen?.(false);
    } else {
      root.dataset.betterquestFullscreen = 'true';
      document.documentElement.dataset.betterquestFullscreen = 'true';
      updateFsBtn();
      pdfViewer?.setFullscreen?.(true);
      const target = elements.pdfFrame || elements.root;
      if (target.requestFullscreen) {
        target.requestFullscreen().catch(() => {
          root.dataset.betterquestFullscreen = 'true';
          document.documentElement.dataset.betterquestFullscreen = 'true';
          updateFsBtn();
          pdfViewer?.setFullscreen?.(true);
        });
      }
    }
  }

  focus.addEventListener('click', () => toggleFullscreen());
  const updateFsBtn = () => {
    const isFs = Boolean(document.fullscreenElement) || root.dataset.betterquestFullscreen === 'true';
    focus.innerHTML = isFs
      ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 14h6m0 0v6m0-6L3 21m17-7h-6m0 0v6m0-6 7 7M4 10h6m0 0V4m0 6L3 3m17 7h-6m0 0V4m0 6 7-7"></path></svg> Exit full screen`
      : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg> Full screen`;
  };
  const syncFs = () => {
    const isFs = Boolean(document.fullscreenElement);
    if (!isFs) {
      root.removeAttribute('data-betterquest-fullscreen');
      document.documentElement.removeAttribute('data-betterquest-fullscreen');
    } else {
      root.dataset.betterquestFullscreen = 'true';
      document.documentElement.dataset.betterquestFullscreen = 'true';
      // Quest can re-seed its native PDF frame at any moment; a re-seeded
      // frame would cover the interactive viewer in fullscreen, so re-hide
      // it once the layout has settled.
      if (pdfViewer && pdfViewerReady !== false) syncPdfVisibility(true);
    }
    updateFsBtn();
    pdfViewer?.setFullscreen?.(isFs);
  };
  document.addEventListener('fullscreenchange', syncFs);

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && (root.dataset.betterquestFullscreen === 'true' || document.documentElement.dataset.betterquestFullscreen === 'true')) {
      toggleFullscreen(false);
    }
  };
  document.addEventListener('keydown', handleKeydown);

  function syncPdfVisibility(active: boolean) {
    const elements = findPdfAssessment(document); if (!elements) return;
    const mode = active ? 'betterquest' : 'basic';
    root.dataset.betterquestPdfMode = mode;
    document.documentElement.dataset.betterquestPdfMode = mode;
    document.body.dataset.betterquestPdfMode = mode;
    elements.pdfFrame.dataset.betterquestPdfMode = mode;

    if (active) {
      if (pdfViewer) {
        pdfViewer.element.hidden = false;
        pdfViewer.element.style.setProperty('display', 'block', 'important');
      }
      const presentations = [
        ...elements.pdfFrame.querySelectorAll<HTMLElement>('#presentation-pdf-frame'),
        ...root.querySelectorAll<HTMLElement>('#presentation-pdf-frame'),
        ...document.querySelectorAll<HTMLElement>('#presentation-pdf-frame'),
      ];
      for (const pres of new Set(presentations)) {
        if (!pres.hidden) pres.hidden = true;
        pres.style.setProperty('display', 'none', 'important');
        pres.style.setProperty('visibility', 'hidden', 'important');
        pres.style.setProperty('height', '0px', 'important');
      }
      const iframes = [
        ...elements.pdfFrame.querySelectorAll<HTMLIFrameElement>('iframe:not([data-betterquest])'),
        ...root.querySelectorAll<HTMLIFrameElement>('iframe:not([data-betterquest])'),
        ...document.querySelectorAll<HTMLIFrameElement>('#presentation-pdf-frame iframe, iframe[title="Assignment PDF"], iframe[src*="download_pdf"], iframe[src*="problem_pdf"]'),
      ];
      if (elements.iframe) iframes.push(elements.iframe);
      for (const ifr of new Set(iframes)) {
        if (!ifr.hidden) ifr.hidden = true;
        ifr.style.setProperty('display', 'none', 'important');
        ifr.style.setProperty('visibility', 'hidden', 'important');
        ifr.style.setProperty('height', '0px', 'important');
      }
    } else {
      if (pdfViewer) {
        pdfViewer.element.hidden = true;
        pdfViewer.element.style.setProperty('display', 'none', 'important');
      }
      const presentations = [
        ...elements.pdfFrame.querySelectorAll<HTMLElement>('#presentation-pdf-frame'),
        ...root.querySelectorAll<HTMLElement>('#presentation-pdf-frame'),
        ...document.querySelectorAll<HTMLElement>('#presentation-pdf-frame'),
      ];
      for (const pres of new Set(presentations)) {
        if (pres.hidden) pres.hidden = false;
        pres.style.removeProperty('display');
        pres.style.removeProperty('visibility');
        pres.style.removeProperty('height');
      }
      const iframes = [
        ...elements.pdfFrame.querySelectorAll<HTMLIFrameElement>('iframe:not([data-betterquest])'),
        ...root.querySelectorAll<HTMLIFrameElement>('iframe:not([data-betterquest])'),
        ...document.querySelectorAll<HTMLIFrameElement>('#presentation-pdf-frame iframe, iframe[title="Assignment PDF"], iframe[src*="download_pdf"], iframe[src*="problem_pdf"]'),
      ];
      if (elements.iframe) iframes.push(elements.iframe);
      for (const ifr of new Set(iframes)) {
        if (ifr.hidden) ifr.hidden = false;
        ifr.style.removeProperty('display');
        ifr.style.removeProperty('visibility');
        ifr.style.removeProperty('height');
      }
    }
  }

  function paintSummary(bindings: ReturnType<typeof readAssessmentResponses>, tally: HTMLElement | null) {
    const submitted = bindings.filter(binding => binding.attempts > 0).length;
    const percent = bindings.length ? Math.round(submitted / bindings.length * 100) : 0;
    progress.textContent = `${submitted} of ${bindings.length} submitted · ${Math.max(0, bindings.length - submitted)} left · ${percent}%`;
    const metrics = readAssessmentMetrics(document, root, tally);
    points.textContent = pointsSummary(metrics.score);
    classAvg.textContent = metrics.classAverage.replace(/\s*points/gi, '');
    stdDev.textContent = metrics.standardDeviation;
    meterValue.style.setProperty('--progress', `${bindings.length ? submitted / bindings.length * 100 : 0}%`);
    pctValue.textContent = `${percent}%`;
  }

  let pendingSubmit: { questionNumber: number; optionValue: string; attempts: number; viaBetterQuest: boolean; timer: ReturnType<typeof setTimeout> | undefined } | null = null;

  /** Wrong options observed through our own submit flow, this session only. */
  const wrongMarks = new Map<number, Set<string>>();
  /** Points possible per question, extracted from the PDF headers when available. */
  const questionPoints = new Map<number, number>();
  /** Questions already styled as correct on the PDF. */
  const markedCorrect = new Set<number>();
  let lastBindings: ReturnType<typeof readAssessmentResponses> = [];
  /** Survive DataTables Scroller dropping rows from the DOM between reconciles. */
  const knownByNumber = new Map<number, ReturnType<typeof readAssessmentResponses>[number]>();
  const knownAnswered = new Set<number>();

  function mergeBindings(bindings: ReturnType<typeof readAssessmentResponses>) {
    const live = new Map<number, ReturnType<typeof readAssessmentResponses>[number]>();
    for (const binding of bindings) {
      const qn = Number(binding.number);
      if (!Number.isInteger(qn) || qn <= 0) continue;
      live.set(qn, binding);
      knownByNumber.set(qn, binding);
      if (binding.answered) knownAnswered.add(qn);
      else knownAnswered.delete(qn);
    }
    return [...knownByNumber.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([qn, cached]) => live.get(qn) || cached);
  }

  function readTries(table: HTMLTableElement, binding: { id: string }): { used: number; max: number } | null {
    const row = table.querySelector(`tr[data-id="${binding.id}"]`) ||
      table.querySelector(`#row-${binding.id}`);
    const match = (row?.querySelector('.previous')?.textContent || '').match(/(\d+)\s*\/\s*(\d+)/);
    return match ? { used: Number(match[1]), max: Number(match[2]) } : null;
  }

  function readEarned(table: HTMLTableElement, binding: { id: string }): number | null {
    const row = table.querySelector(`tr[data-id="${binding.id}"]`) ||
      table.querySelector(`#row-${binding.id}`);
    const text = (row?.querySelector('.correct')?.textContent || '').replace(/\s+/g, ' ').trim();
    const match = text.match(/[-+]?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : null;
  }

  function readOutcome(table: HTMLTableElement, binding: { id: string }): 'correct' | 'incorrect' | 'exhausted' | null {
    const row = table.querySelector<HTMLElement>(`tr[data-id="${binding.id}"]`) ||
      table.querySelector<HTMLElement>(`#row-${binding.id}`);
    if (!row) return null;
    const status = row.querySelector('.status');
    const statusText = status?.textContent || '';
    const success = Boolean(status?.querySelector('.text-success, [class*="text-success"]'));
    if (success
      || (/\bcorrect\b/i.test(statusText) && !/\b(?:incorrect|not correct)\b/i.test(statusText))
      || (/check\s*correct/i.test(statusText) && !/incorrect/i.test(statusText))) {
      return 'correct';
    }
    const danger = Boolean(status?.querySelector('.text-danger, [class*="text-danger"]'));
    if (danger || /\bincorrect\b/i.test(statusText)) return 'incorrect';
    const prev = row.querySelector('.previous')?.textContent || '';
    const match = prev.match(/(\d+)\s*\/\s*(\d+)/);
    if (match && Number(match[2]) > 0 && Number(match[1]) >= Number(match[2])) return 'exhausted';
    return null;
  }

  function applyMarks(bindings: ReturnType<typeof readAssessmentResponses>) {
    for (const binding of bindings) {
      const qn = Number(binding.number);
      if (!Number.isInteger(qn)) continue;
      if (binding.answered) {
        if (binding.select.value && !markedCorrect.has(qn)) {
          const table = findPdfAssessment(document)?.table;
          if (table && readOutcome(table, binding) === 'correct') {
            markedCorrect.add(qn);
            // A submit can come back as a page reload; celebrate loudly when it does.
            const fresh = consumeFreshSubmit(document, qn) !== null;
            if (fresh) console.info(`[BetterQuest] Question ${qn}: correct — celebrating after refresh.`);
            void pdfViewer?.ready?.then(ok => {
              if (!disposed && ok) {
                pdfViewer?.celebrate?.(qn, binding.select.value, fresh);
                if (fresh) pdfViewer?.announce?.(qn, 'correct');
              }
            });
          }
        }
      } else {
        const marked = wrongMarks.get(qn);
        if (marked) {
          for (const value of marked) pdfViewer?.markWrong?.(qn, value);
        } else {
          // Bring back a just-submitted wrong answer after a refresh — but only
          // once Quest has recorded the attempt, so an in-flight submit never
          // gets called wrong before its real verdict arrives.
          const path = freshSubmitPath(document);
          const fresh = readFreshSubmits(document).find(item => item.path === path && item.qn === qn);
          if (fresh && binding.attempts > fresh.attempts && consumeFreshSubmit(document, qn)) {
            console.info(`[BetterQuest] Question ${qn}: incorrect — bringing the mark back after refresh.`);
            wrongMarks.set(qn, new Set([fresh.value]));
            pdfViewer?.markWrong?.(qn, fresh.value);
            pdfViewer?.announce?.(qn, 'wrong');
          }
        }
      }
    }
  }

  function clearPendingSubmit() {
    if (pendingSubmit?.timer !== undefined) clearTimeout(pendingSubmit.timer);
    pendingSubmit = null;
  }

  function submitWarn(questionNumber: number, reason: string) {
    console.warn(`[BetterQuest] Answer for question ${questionNumber} was not sent to Quest: ${reason} Answer from the sidebar instead.`);
  }

  function submitNative(questionNumber: number): boolean {
    const elements = findPdfAssessment(document);
    if (!elements) { submitWarn(questionNumber, 'Response table not found.'); return false; }
    return withNativeResponsesVisible(elements, () => {
      const bindings = readAssessmentResponses(elements.table);
      const binding = bindings.find(item => Number(item.number) === questionNumber);
      if (!binding) { submitWarn(questionNumber, 'No response row found.'); return false; }
      const available = isNativeControlAvailable(binding.select) && isNativeControlAvailable(binding.submit);
      const selectedOption = binding.select.selectedOptions[0] ||
        [...binding.select.options].find(opt => opt.value === binding.select.value);
      if (!available || !selectedOption || !isResponseOptionAvailable(selectedOption)) {
        submitWarn(questionNumber, !selectedOption ? 'No answer selected.' : 'Submit control unavailable.');
        return false;
      }
      binding.submit.focus();
      const submitRow = binding.submit.closest('tr');
      const submitRowNumber = submitRow && submitRow.parentElement?.tagName !== 'THEAD'
        ? Number((submitRow.cells[0]?.textContent || '').replace(/\.$/, '').trim())
        : NaN;
      if (submitRowNumber !== questionNumber) {
        console.warn(`[BetterQuest] Submit control for question ${questionNumber} is outside its response row; trying anyway.`);
      }
      binding.submit.click();
      clearPendingSubmit();
      const optionValue = selectedOption.value;
      const attempts = binding.attempts;
      const viaBetterQuest = true;
      const timer = setTimeout(() => {
        // Quest never reflected the submit: verify before handing control back.
        const els = disposed ? null : findPdfAssessment(document);
        const current = els ? withNativeResponsesVisible(els, () => readAssessmentResponses(els.table)) : [];
        const target = current.find(item => Number(item.number) === questionNumber);
        if (target && !target.answered && target.attempts === attempts) {
          submitWarn(questionNumber, 'No result appeared.');
          pdfViewer?.setSelected(questionNumber, optionValue);
        }
        if (pendingSubmit?.questionNumber === questionNumber) clearPendingSubmit();
      }, 10000);
      pendingSubmit = { questionNumber, optionValue, attempts, viaBetterQuest, timer };
      // Remember the attempt so a refresh right after submitting still shows the verdict.
      recordFreshSubmit(document, questionNumber, optionValue, attempts);
      return true;
    });
  }

  function chooseNative(questionNumber: number, optionValue: number): boolean {
    const elements = findPdfAssessment(document); if (!elements) return false;
    return withNativeResponsesVisible(elements, () => {
      const bindings = readAssessmentResponses(elements.table);
      const binding = bindings.find(item => Number(item.number) === questionNumber);
      const nativeOption = binding ? [...binding.select.options].find(item => item.value === String(optionValue)) : undefined;
      const available = binding && isNativeControlAvailable(binding.select);
      if (!binding || binding.answered || !available || !nativeOption || !isResponseOptionAvailable(nativeOption)) {
        console.warn(`[BetterQuest] Question ${questionNumber}: answer not handed to Quest (${!binding ? 'no response row' : binding.answered ? 'already answered' : !available ? 'answer control unavailable' : !nativeOption ? 'option missing' : 'option disabled'}).`);
        return false;
      }

      binding.select.value = nativeOption.value;
      for (const opt of binding.select.options) {
        opt.selected = (opt === nativeOption);
      }
      binding.select.dispatchEvent(new document.defaultView!.Event('input', { bubbles: true }));
      binding.select.dispatchEvent(new document.defaultView!.Event('change', { bubbles: true }));

      pdfViewer?.setSelected(questionNumber, nativeOption.value);
      const card = [...questions.querySelectorAll<HTMLElement>('[data-question-id]')].find(item => item.dataset.questionId === binding.id);
      if (card) {
        for (const button of card.querySelectorAll<HTMLButtonElement>('.choice')) button.setAttribute('aria-pressed', String(button.dataset.value === nativeOption.value));
        const selected = card.querySelector<HTMLElement>('.selected'); if (selected) selected.textContent = `Answer ${nativeOption.value} selected`;
        const submit = card.querySelector<HTMLButtonElement>('.submit');
        if (submit) submit.hidden = !isNativeControlAvailable(binding.submit);
      }
      paintSummary(bindings, elements.tally);
      return true;
    });
  }

  function ensurePdfViewer(elements: PdfAssessmentElements, bindings: ReturnType<typeof readAssessmentResponses>) {
    if (!viewerFactory || pdfViewerStarted || !bindings.length) return;
    const optionMaximums = new Map<number, number>();
    const getBindingMax = (binding: (typeof bindings)[number]): number => {
      const selectOptions = binding.select ? [...binding.select.options] : [];
      const fromSelect = Math.max(0, ...selectOptions.map(opt => Number(opt.value)).filter(v => Number.isInteger(v) && v >= 1 && v <= 9));
      const fromBinding = Math.max(0, ...binding.options.map(opt => Number(opt.value)).filter(v => Number.isInteger(v) && v >= 1 && v <= 9));
      return Math.max(fromSelect, fromBinding);
    };

    let fallbackMax = 0;
    for (const binding of bindings) {
      const max = getBindingMax(binding);
      if (max > fallbackMax && max <= 9) fallbackMax = max;
    }
    if (fallbackMax < 2) fallbackMax = 5;

    for (const binding of bindings) {
      const questionNumber = Number(binding.number);
      let maximum = getBindingMax(binding);
      if (!maximum || maximum <= 1) maximum = fallbackMax;
      if (Number.isInteger(questionNumber) && questionNumber > 0 && maximum > 0 && maximum <= 9) {
        optionMaximums.set(questionNumber, maximum);
      }
    }
    if (!optionMaximums.size) return;
    pdfViewerStarted = true;
    const answeredQuestions = new Set<number>(
      bindings.filter(b => b.answered).map(b => Number(b.number)).filter(Number.isInteger)
    );
    pdfViewer = viewerFactory(elements.pdfFrame, {
      url: elements.iframe.src,
      optionMaximums,
      answeredQuestions,
      onChoose: (questionNumber, optionValue) => { chooseNative(questionNumber, optionValue); },
      onSubmit: (questionNumber) => submitNative(questionNumber),
      onPoints: (points) => {
        for (const [questionNumber, possible] of points) {
          if (!questionPoints.has(questionNumber)) questionPoints.set(questionNumber, possible);
        }
      },
    });
    syncPdfVisibility(true);
    void pdfViewer?.ready?.then(ready => {
      if (disposed || !pdfViewer) return;
      pdfViewerReady = ready;
      if (!ready) {
        syncPdfVisibility(false);
        return;
      }
      syncPdfVisibility(pdfViewerReady !== false);
      // Re-apply after the async paint: a finished homework must not keep
      // option boxes that were mapped before every response row was known.
      pdfViewer.setAnsweredQuestions?.(new Set(knownAnswered));
      applyMarks(lastBindings);
    });
  }

  function scrollToQuestion(questionNumber: number) {
    const doc = root.ownerDocument;
    const win = doc?.defaultView;
    const initialScrollY = win?.scrollY ?? 0;
    const initialScrollX = win?.scrollX ?? 0;

    const doScrollPdf = () => {
      if (pdfViewer?.scrollToQuestion) {
        pdfViewer.scrollToQuestion(questionNumber);
      } else {
        const shadow = pdfViewer?.element.shadowRoot;
        const pagesEl = shadow?.querySelector<HTMLElement>('.pages');
        const anchor = shadow?.querySelector<HTMLElement>(
          `.question-anchor[data-question="${questionNumber}"], .option-hit[data-question="${questionNumber}"]`,
        );
        if (pagesEl && anchor) {
          const anchorRect = anchor.getBoundingClientRect?.();
          const pagesRect = pagesEl.getBoundingClientRect?.();
          if (pagesRect && anchorRect && (anchorRect.top !== 0 || pagesRect.height !== 0)) {
            const targetY = (anchorRect.top - pagesRect.top) + pagesEl.scrollTop - 24;
            pagesEl.scrollTo?.({ top: Math.max(0, targetY), behavior: 'smooth' });
          } else {
            anchor?.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
          }
        }
      }
    };

    if (pdfViewerReady === false) {
      // PDF viewer unavailable
    } else if (pdfViewer?.scrollToQuestion || pdfViewer?.element.shadowRoot?.querySelector('.question-anchor, .option-hit')) {
      doScrollPdf();
    } else if (pdfViewer?.ready) {
      void pdfViewer.ready.then(ok => {
        if (!disposed && ok) doScrollPdf();
      });
    }

    if (win) {
      if (win.scrollY !== initialScrollY || win.scrollX !== initialScrollX) {
        win.scrollTo?.(initialScrollX, initialScrollY);
      }
      win.requestAnimationFrame?.(() => {
        if (win.scrollY !== initialScrollY || win.scrollX !== initialScrollX) {
          win.scrollTo?.(initialScrollX, initialScrollY);
        }
      });
    }
  }

  function isLeadingGap(node: Node, pdfFrame: HTMLElement): boolean {
    if (node.nodeType !== 1) return false;
    const el = node as HTMLElement;
    if (el === host || el === pdfFrame) return false;
    if (el.hasAttribute('data-betterquest-due-row') || el.hasAttribute('data-betterquest')) return false;
    if (el.closest('[data-betterquest]')) return false;
    const tag = el.tagName.toLowerCase();
    if (tag === 'style' || tag === 'script' || tag === 'link') return false;
    if (tag === 'br') return true;
    if (el.id === 'pdf-frame' || el.id === 'view-responses-table-id' || el.id === 'tally-div') return false;
    // Never collapse the assignment PDF download — icon-only or empty-label links
    // still have to stay reachable until the header promotes them.
    if (el.querySelector('a[href*="/images/problem_pdf"], a[href*="/images/download_pdf"], a[data-betterquest-download]')) {
      return false;
    }
    if (el.querySelector('table, iframe, canvas, select, button, input, textarea, img, svg, audio, video, embed, object, a[href], [data-betterquest]')) {
      const link = el.querySelector('a[href]');
      if (!link) return false;
      // A due row wrapping only an empty link is still a gap; anything else with a link is content.
      if ((el.textContent || '').replace(/[\s\u00a0]/g, '').length > 0) return false;
    } else if ((el.textContent || '').replace(/[\s\u00a0]/g, '').length > 0) {
      return false;
    }
    return true;
  }

  const collapsedGaps = new Set<HTMLElement>();

  function restoreGap(el: HTMLElement) {
    el.style.removeProperty('display');
    el.removeAttribute('data-betterquest-collapsed-gap');
    collapsedGaps.delete(el);
  }

  function reconcileLeadingGaps(pdfFrame: HTMLElement) {
    // Native content can load late into a previously empty spacer; restore those.
    for (const el of [...collapsedGaps]) {
      if (!el.isConnected || !isLeadingGap(el, pdfFrame)) restoreGap(el);
    }
    for (let node: Node | null = root.firstChild; node && node !== pdfFrame && node !== host; node = node.nextSibling) {
      if (node.nodeType !== 1 || collapsedGaps.has(node as HTMLElement)) continue;
      const el = node as HTMLElement;
      if (isLeadingGap(el, pdfFrame)) {
        el.dataset.betterquestCollapsedGap = 'true';
        el.style.setProperty('display', 'none', 'important');
        collapsedGaps.add(el);
      }
    }
  }

  const originalWorkspaceHeight = root.style.getPropertyValue('--bq-pdf-workspace-height');
  const originalWorkspaceHeightPriority = root.style.getPropertyPriority('--bq-pdf-workspace-height');
  function fitWorkspace() {
    if (disposed) return;
    const view = document.defaultView;
    if (!view) return;
    if (document.fullscreenElement || root.dataset.betterquestFullscreen === 'true') return;
    // Size the reading row itself, not the outer grid that also contains
    // Quest's headers. Cap to the viewport so a ResizeObserver feedback loop
    // cannot grow the page without bound.
    const sizingRoot = root.querySelector<HTMLElement>('#pdf-frame') || root;
    const viewportBottom = view.visualViewport
      ? view.visualViewport.offsetTop + view.visualViewport.height : view.innerHeight;
    const fromTop = Math.floor(viewportBottom - sizingRoot.getBoundingClientRect().top - 12);
    const available = Math.max(240, Math.min(fromTop, Math.floor(view.innerHeight - 48)));
    const height = `${available}px`;
    if (root.style.getPropertyValue('--bq-pdf-workspace-height') !== height) {
      root.style.setProperty('--bq-pdf-workspace-height', height);
    }
  }
  let fitFrame: number | undefined;
  const scheduleFitWorkspace = () => {
    const view = document.defaultView;
    if (disposed || !view || fitFrame !== undefined) return;
    fitFrame = view.requestAnimationFrame(() => { fitFrame = undefined; fitWorkspace(); });
  };
  document.defaultView?.addEventListener('resize', fitWorkspace);
  document.defaultView?.visualViewport?.addEventListener('resize', fitWorkspace);
  document.addEventListener('fullscreenchange', scheduleFitWorkspace);
  const WorkspaceResizeObserver = document.defaultView?.ResizeObserver;
  // Observe only the workspace root. Watching the parent re-enters whenever
  // our own height variable changes the parent's size.
  const workspaceResizeObserver = WorkspaceResizeObserver ? new WorkspaceResizeObserver(scheduleFitWorkspace) : undefined;
  workspaceResizeObserver?.observe(root);

  function clearWorkspaceEnhancement() {
    syncPdfVisibility(false);
    host.remove();
    root.removeAttribute('data-betterquest-pdf-workspace');
    root.removeAttribute('data-betterquest-pdf-mode');
    root.removeAttribute('data-betterquest-rail');
    document.documentElement.removeAttribute('data-betterquest-pdf-mode');
    document.body.removeAttribute('data-betterquest-pdf-mode');
    for (let p: HTMLElement | null = root.parentElement; p && p !== document.body; p = p.parentElement) {
      p.removeAttribute('data-betterquest-pdf-parent');
    }
    const responseRoot = root.querySelector<HTMLElement>('#view-responses-table-id');
    responseRoot?.removeAttribute('data-betterquest-native-responses');
    responseRoot?.removeAttribute('data-betterquest-native-visible');
    for (const el of root.querySelectorAll<HTMLElement>('[data-betterquest-native-stats="true"]')) {
      el.style.removeProperty('display');
      el.removeAttribute('data-betterquest-native-stats');
    }
    for (const el of [...collapsedGaps]) restoreGap(el);
  }

  function render() {
    if (disposed) return;
    const elements = findPdfAssessment(document);
    if (!elements || elements.root !== root) {
      clearWorkspaceEnhancement();
      return;
    }
    const freshBindings = withNativeResponsesVisible(elements, () => readAssessmentResponses(elements.table));
    const emptyShell = isEmptyResponseTable(elements.table);
    if (!freshBindings.length && !knownByNumber.size) {
      if (responseSignature && !emptyShell) {
        // Quest re-seeds its virtualized rows around submits; a momentarily
        // empty table must not wipe the last good UI.
        return;
      }
      // Past-due / locked quizzes: leave Quest's native page alone.
      clearWorkspaceEnhancement();
      return;
    }
    const bindings = mergeBindings(freshBindings);
    if (!bindings.length) return;
    for (let p: HTMLElement | null = root.parentElement; p && p !== document.body; p = p.parentElement) {
      p.dataset.betterquestPdfParent = 'true';
    }
    root.dataset.betterquestPdfWorkspace = 'enhanced';
    root.dataset.betterquestPdfMode = 'betterquest';
    document.documentElement.dataset.betterquestPdfMode = 'betterquest';
    document.body.dataset.betterquestPdfMode = 'betterquest';
    if (host.parentElement !== root || host.previousElementSibling !== elements.pdfFrame) elements.pdfFrame.after(host);
    reconcileLeadingGaps(elements.pdfFrame);
    fitWorkspace();
    elements.responseRoot.dataset.betterquestNativeResponses = 'true';
    hideNativeStatsElements(document, root);
    paintSummary(bindings, elements.tally);
    ensurePdfViewer(elements, bindings);
    // Use the accumulated set — Scroller may only expose a window of rows now.
    pdfViewer?.setAnsweredQuestions?.(new Set(knownAnswered));
    if (pendingSubmit) {
      const target = bindings.find(item => Number(item.number) === pendingSubmit!.questionNumber);
      if (!target || target.answered || target.attempts !== pendingSubmit.attempts) {
        // Quest reflected the submit (answered or attempts moved).
        const was = pendingSubmit;
        clearPendingSubmit();
        if (target) {
          const qn = Number(target.number);
          const outcome = readOutcome(elements.table, target);
          if (!target.answered && (target.attempts > was.attempts || outcome === 'incorrect')) {
            if (was.viaBetterQuest && Number.isInteger(qn)) {
              let marked = wrongMarks.get(qn);
              if (!marked) { marked = new Set(); wrongMarks.set(qn, marked); }
              marked.add(was.optionValue);
            }
            pdfViewer?.announce?.(qn, 'wrong');
          } else if (target.answered && target.select.value && Number.isInteger(qn) && !markedCorrect.has(qn)) {
            if (outcome === 'correct') {
              markedCorrect.add(qn);
              consumeFreshSubmit(document, qn); // celebrated live — don't replay it after a refresh
              const value = target.select.value;
              void pdfViewer?.ready?.then(ok => {
                if (!disposed && ok) pdfViewer?.celebrate?.(qn, value, true);
              });
              pdfViewer?.announce?.(qn, 'correct');
            } else if (outcome === 'incorrect' || outcome === 'exhausted') {
              pdfViewer?.announce?.(qn, 'wrong');
            }
          }
        }
      }
    }
    lastBindings = bindings;
    applyMarks(bindings);
    syncPdfVisibility(pdfViewerReady !== false);
    // Native presentation changes can trigger refreshes without changing answers.
    // Keep live buttons in place so hover, focus and pointer clicks are not interrupted.
    const signature = JSON.stringify(bindings.map(binding => [
      binding.id, binding.number, binding.select.value, binding.options,
      binding.attempts, binding.answered, isNativeControlAvailable(binding.select),
      isNativeControlAvailable(binding.submit),
    ]));
    if (signature === responseSignature) return;
    responseSignature = signature;
    questions.replaceChildren();
    qnav.replaceChildren();

    const assessmentTable = elements.table;

    function getQuestionStatus(binding: (typeof bindings)[number]): { state: string; statusLabel: string; titleStatus: string } {
      const outcome = readOutcome(assessmentTable, binding);
      const tries = readTries(assessmentTable, binding);
      const usedTries = tries?.used ?? binding.attempts;
      const qn = Number(binding.number);
      const hadWrongMarks = Number.isInteger(qn) && (wrongMarks.get(qn)?.size ?? 0) > 0;

      if (outcome === 'correct') {
        if (usedTries > 1 || hadWrongMarks) {
          return { state: 'q-retry', statusLabel: 'correct after retry', titleStatus: 'Correct (retried)' };
        }
        return { state: 'q-done', statusLabel: 'completed correctly', titleStatus: 'Correct' };
      }
      if (outcome === 'incorrect' || outcome === 'exhausted' || usedTries > 0) {
        return { state: 'q-wrong', statusLabel: 'needs another try', titleStatus: 'Incorrect' };
      }
      return { state: '', statusLabel: 'not attempted', titleStatus: 'Not started' };
    }

    for (const binding of bindings) {
      const jump = document.createElement('button');
      jump.type = 'button';
      const { state, statusLabel, titleStatus } = getQuestionStatus(binding);
      jump.className = 'qnav-btn' + (state ? ' ' + state : '');
      jump.textContent = binding.number;
      jump.title = `Question ${binding.number} · ${titleStatus}`;
      jump.setAttribute('aria-label', `Question ${binding.number} ${statusLabel}. Go to question ${binding.number} in the PDF.`);
      const targetNumber = Number(binding.number);
      jump.addEventListener('click', (e) => {
        e.preventDefault();
        scrollToQuestion(Number.isInteger(targetNumber) ? targetNumber : 0);
      });
      qnav.append(jump);
    }
    for (const binding of bindings) {
      const { state } = getQuestionStatus(binding);
      const cardStatus = state ? state.replace(/^q-/, '') : 'unattempted';
      const card = document.createElement('article'); card.className = 'question'; card.dataset.questionId = binding.id;
      card.dataset.status = cardStatus;
      const cardTop = document.createElement('div'); cardTop.className = 'question-top';
      const number = document.createElement('button'); number.type = 'button';
      number.className = 'number' + (cardStatus !== 'unattempted' ? ' number-' + cardStatus : '');
      number.textContent = `Question ${binding.number}`;
      number.setAttribute('aria-label', `Go to question ${binding.number} in the PDF`);
      number.addEventListener('click', (e) => {
        e.preventDefault();
        scrollToQuestion(Number(binding.number));
      });
      const selected = document.createElement('span'); selected.className = 'selected';

      if (binding.answered) {
        const tries = readTries(elements.table, binding);
        if (tries) {
          selected.textContent = `${tries.used}/${tries.max}`;
          selected.setAttribute('aria-label', `${tries.used} of ${tries.max} tries used`);
        } else {
          selected.textContent = binding.select.value ? `Answer ${binding.select.value} submitted` : 'Completed';
        }
        const submittedTag = document.createElement('span');
        submittedTag.className = 'submitted-tag';
        submittedTag.textContent = binding.select.value ? `Submitted: Answer ${binding.select.value}` : 'Submitted';
        const outcome = readOutcome(elements.table, binding);
        const pill = document.createElement('span');
        pill.className = 'verdict-pill ' + (outcome === 'correct' ? 'verdict-correct' : outcome === 'incorrect' ? 'verdict-wrong' : 'verdict-done');
        pill.textContent = outcome === 'correct' ? '✓ Correct' : outcome === 'incorrect' ? '✕ Incorrect' : 'Submitted';
        const earned = readEarned(elements.table, binding);
        const qn = Number(binding.number);
        const possible = Number.isInteger(qn) ? questionPoints.get(qn) : undefined;
        cardTop.append(number, selected, pill);
        const cardBottom = document.createElement('div'); cardBottom.className = 'question-bottom';
        cardBottom.append(submittedTag);
        if (earned !== null) {
          const pointsNote = document.createElement('span');
          pointsNote.className = 'points-note';
          const unit = earned === 1 ? 'pt' : 'pts';
          pointsNote.textContent = possible !== undefined && possible > 0
            ? `${earned} ${unit} (${Math.round(earned / possible * 100)}%)`
            : `${earned} ${unit}`;
          pointsNote.setAttribute('aria-label', possible !== undefined && possible > 0
            ? `${earned} out of ${possible} points`
            : `${earned} points earned`);
          cardBottom.append(pointsNote);
        }
        card.append(cardTop, cardBottom);
        questions.append(card);
        continue;
      }

      selected.textContent = binding.select.value
        ? `Answer ${binding.select.value} selected`
        : 'Not answered';
      const choices = document.createElement('div'); choices.className = 'choices'; choices.setAttribute('role', 'group'); choices.setAttribute('aria-label', `Question ${binding.number} response`);
      for (const option of binding.options) {
        const choice = document.createElement('button'); choice.type = 'button'; choice.className = 'choice'; choice.dataset.value = option.value; choice.textContent = option.label;
        choice.setAttribute('aria-label', `Choose response ${option.label} for question ${binding.number}`); choice.setAttribute('aria-pressed', String(binding.select.value === option.value));
        choice.addEventListener('click', () => {
          chooseNative(Number(binding.number), Number(option.value));
        });
        choices.append(choice);
      }
      const submit = document.createElement('button'); submit.type = 'button'; submit.className = 'submit'; submit.textContent = `Submit question ${binding.number}`;
      submit.hidden = !binding.select.value || !isNativeControlAvailable(binding.submit);
      submit.addEventListener('click', () => {
        submitNative(Number(binding.number));
      });
      cardTop.append(number, selected);
      const cardBottom = document.createElement('div'); cardBottom.className = 'question-bottom';
      cardBottom.append(choices, submit);
      card.append(cardTop, cardBottom);
      questions.append(card);
      if (binding.select.value) pdfViewer?.setSelected(Number(binding.number), binding.select.value);
    }
    if (!bindings.length) {
      const empty = document.createElement('p');
      empty.className = 'empty';
      empty.textContent = 'No questions available.';
      questions.append(empty);
    }
  }

  return { reconcile: render, dispose() {
    disposed = true; const elements = findPdfAssessment(document);
    clearPendingSubmit();
    document.defaultView?.removeEventListener('resize', fitWorkspace);
    document.defaultView?.visualViewport?.removeEventListener('resize', fitWorkspace);
    document.removeEventListener('fullscreenchange', scheduleFitWorkspace);
    workspaceResizeObserver?.disconnect();
    if (fitFrame !== undefined) document.defaultView?.cancelAnimationFrame(fitFrame);
    document.removeEventListener('fullscreenchange', syncFs);
    document.removeEventListener('keydown', handleKeydown);
    syncPdfVisibility(false);
    if (originalWorkspaceHeight) root.style.setProperty('--bq-pdf-workspace-height', originalWorkspaceHeight, originalWorkspaceHeightPriority);
    else root.style.removeProperty('--bq-pdf-workspace-height');
    root.removeAttribute('data-betterquest-rail');
    root.removeAttribute('data-betterquest-pdf-workspace');
    root.removeAttribute('data-betterquest-pdf-mode');
    document.documentElement.removeAttribute('data-betterquest-pdf-mode');
    document.body.removeAttribute('data-betterquest-pdf-mode');
    elements?.pdfFrame.removeAttribute('data-betterquest-pdf-mode');
    root.removeAttribute('data-betterquest-fullscreen');
    document.documentElement.removeAttribute('data-betterquest-fullscreen');
    elements?.responseRoot.removeAttribute('data-betterquest-native-responses');
    document.querySelectorAll('[data-betterquest-pdf-parent]').forEach(el => {
      el.removeAttribute('data-betterquest-pdf-parent');
    });
    document.querySelectorAll('[data-betterquest-native-stats]').forEach(el => {
      (el as HTMLElement).style.removeProperty('display');
      el.removeAttribute('data-betterquest-native-stats');
    });
    for (const el of [...collapsedGaps]) restoreGap(el);
    syncPdfVisibility(false);
    if (elements) elements.iframe.hidden = false;
    if (elements?.pdfFrame.dataset.betterquestSynthesized === 'true') elements.pdfFrame.remove();
    pdfViewer?.dispose(); pdfViewer = undefined; host.remove(); style.remove();
  } };
}

/**
 * Readiness for a Quest slide submit button. Unlike the shared availability
 * check, the button's own visibility is ignored: BetterQuest itself hides the
 * button until an answer is picked, so counting that would lock it hidden
 * forever. Display, disabled, hidden attributes, and ancestors still count.
 */
export function isSlideSubmitRevealed(button: HTMLButtonElement): boolean {
  if (!button.isConnected) return false;
  if (button.disabled || button.hidden ||
    button.getAttribute('aria-hidden') === 'true' ||
    button.getAttribute('aria-disabled') === 'true') return false;
  const view = button.ownerDocument.defaultView;
  if (view?.getComputedStyle(button).display === 'none') return false;
  for (let node: HTMLElement | null = button.parentElement; node; node = node.parentElement) {
    const style = node.ownerDocument.defaultView?.getComputedStyle(node);
    if (node.hidden || node.inert || node.getAttribute('aria-hidden') === 'true' ||
      style?.display === 'none' || style?.visibility === 'hidden' || style?.visibility === 'collapse') return false;
  }
  return true;
}

export function createSlideAssessmentEnhancement(presentation: HTMLElement) {
  const document = presentation.ownerDocument;
  const originalHidden = new WeakMap<HTMLButtonElement, boolean>();
  const originalSpot = new WeakMap<HTMLButtonElement, { parent: ParentNode; next: Node | null }>();
  const style = installStyles(document);
  presentation.dataset.betterquestSlide = 'enhanced';
  // Quest replaces the slide HTML after every submit, so buttons must be
  // collected live on each pass — never snapshotted once at mount.
  const collect = () => [...presentation.querySelectorAll<HTMLButtonElement>('.submit-btn')].map(button => {
    if (!originalHidden.has(button)) originalHidden.set(button, button.hidden);
    const group = button.closest<HTMLElement>('.instanceitempart');
    return { button, group, radios: group ? [...group.querySelectorAll<HTMLInputElement>('input[type="radio"][name^="response_"]')] : [] };
  });
  // The submit rides beside the picked option so it is always visible once an
  // answer is chosen. It stays inside the same question part, so Quest's
  // submit wiring (form id, closest part) keeps working untouched.
  const placeSubmitNearSelection = (button: HTMLButtonElement, group: HTMLElement) => {
    const checked = group.querySelector<HTMLInputElement>('input[type="radio"][name^="response_"]:checked');
    const option = checked?.closest<HTMLElement>('.custom-control, .instanceitempart-choice');
    const slot: HTMLElement | null = option?.querySelector<HTMLElement>('.d-flex') || option || null;
    if (slot && button.parentElement !== slot) {
      if (!originalSpot.has(button) && button.parentElement) {
        originalSpot.set(button, { parent: button.parentElement, next: button.nextSibling });
      }
      slot.append(button);
    }
  };
  // Slides pages never mount the PDF workspace, so collapse the same native
  // spacer junk (stray breaks, empty paragraphs) between the header and the
  // first question here instead.
  const collapsed = new Set<HTMLElement>();
  const scope = presentation.parentElement;
  const isGap = (el: HTMLElement): boolean => {
    if (el === presentation) return false;
    if (el.hasAttribute('data-betterquest') || el.hasAttribute('data-betterquest-due-row')) return false;
    if (el.closest('[data-betterquest]')) return false;
    const tag = el.tagName.toLowerCase();
    if (tag === 'style' || tag === 'script' || tag === 'link') return false;
    if (tag === 'br') return true;
    if (el.id === 'presentation-div' || el.id === 'pdf-frame' || el.id === 'view-responses-table-id' || el.id === 'tally-div') return false;
    if (el.querySelector('table, iframe, canvas, select, button, input, textarea, img, svg, audio, video, embed, object, a[href], [data-betterquest]')) return false;
    return (el.textContent || '').replace(/[\s\u00a0]/g, '').length === 0;
  };
  const reconcileGaps = () => {
    if (!scope || presentation.parentElement !== scope) return;
    for (const el of [...collapsed]) {
      if (!el.isConnected || !isGap(el)) {
        el.style.removeProperty('display');
        el.removeAttribute('data-betterquest-collapsed-gap');
        collapsed.delete(el);
      }
    }
    for (let node: Node | null = scope.firstChild; node && node !== presentation; node = node.nextSibling) {
      if (node.nodeType !== 1 || collapsed.has(node as HTMLElement)) continue;
      const el = node as HTMLElement;
      if (isGap(el)) {
        el.dataset.betterquestCollapsedGap = 'true';
        el.style.setProperty('display', 'none', 'important');
        collapsed.add(el);
      }
    }
  };
  const verdictFor = new Map<HTMLElement, string>();
  const toastTimers = new Set<ReturnType<typeof setTimeout>>();
  // Assignment score trio under each slide question, mirroring the PDF view.
  // Rendered only when Quest actually exposes at least one metric.
  const updateSlideMetrics = (group: HTMLElement, metrics: { score: string; classAverage: string; standardDeviation: string }) => {
    const values = [metrics.score, metrics.classAverage, metrics.standardDeviation];
    let bar = group.querySelector<HTMLElement>(':scope > .bq-slide-metrics');
    if (!values.some(value => value !== 'Not available')) { bar?.remove(); return; }
    const key = values.join('|');
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'bq-slide-metrics';
      bar.dataset.betterquest = 'slide-metrics';
      group.append(bar);
    }
    if (bar.dataset.metrics !== key) {
      bar.dataset.metrics = key;
      bar.replaceChildren();
      const labels = ['Your Score', 'Class Average', 'Standard Deviation'];
      let shown = false;
      values.forEach((value, index) => {
        if (value === 'Not available') return;
        if (shown) bar!.append(document.createTextNode(' · '));
        shown = true;
        const label = document.createElement('span');
        label.textContent = labels[index] + ' ';
        const strong = document.createElement('strong');
        strong.textContent = value;
        bar!.append(label, strong);
      });
    }
  };
  const showVerdictToast = (verdict: 'correct' | 'wrong') => {
    document.querySelectorAll('.bq-slide-verdict').forEach(el => el.remove());
    const toast = document.createElement('div');
    toast.className = 'bq-slide-verdict';
    toast.dataset.verdict = verdict;
    toast.setAttribute('role', 'status');
    toast.textContent = verdict === 'correct' ? 'Correct ✓ — nice work' : 'Incorrect ✕ — try again';
    document.body.append(toast);
    const timer = setTimeout(() => { toast.remove(); toastTimers.delete(timer); }, 4000);
    toastTimers.add(timer);
    // Whole-screen verdict: green check for right, red pulse for wrong.
    if (verdict === 'correct') celebrateScreen(document.body);
    else flashScreen(document.body);
  };
  const readSlideVerdict = (group: HTMLElement): 'correct' | 'wrong' | null => {
    const feedback = group.querySelector('.instanceitempart-feedback .feedback, .feedback');
    if (!feedback || feedback.classList.contains('d-none')) return null;
    const iconVisible = (selector: string) => {
      const icon = feedback.querySelector(selector);
      return Boolean(icon && !icon.classList.contains('d-none'));
    };
    if (iconVisible('.feedback_img_right')) return 'correct';
    if (iconVisible('.feedback_img_wrong')) return 'wrong';
    const msg = feedback.querySelector('.feedback_msg')?.textContent || '';
    if (/\bincorrect\b/i.test(msg) || /\bwrong\b/i.test(msg) || /try again/i.test(msg)) return 'wrong';
    if (/\bcorrect\b/i.test(msg)) return 'correct';
    return null;
  };
  const paint = () => {
    reconcileGaps();
    const metrics = readAssessmentMetrics(document, presentation, null);
    for (const item of collect()) {
      if (!item.group) continue;
      updateSlideMetrics(item.group, metrics);
      const ready = withSlideEnhancementDisabled(presentation, () => isSlideSubmitRevealed(item.button)) &&
        item.radios.some(radio => radio.checked && !radio.disabled);
      item.group.dataset.betterquestQuestionReady = String(ready);
      if (ready) placeSubmitNearSelection(item.button, item.group);
      const verdict = readSlideVerdict(item.group);
      const picked = item.group.querySelector<HTMLInputElement>('input[type="radio"][name^="response_"]:checked')?.value ?? '';
      if (verdict) {
        const key = `${picked}:${verdict}`;
        if (verdictFor.get(item.group) !== key) {
          verdictFor.set(item.group, key);
          showVerdictToast(verdict);
        }
        if (picked) item.group.dataset.betterquestVerdict = verdict;
        else item.group.removeAttribute('data-betterquest-verdict');
      } else {
        verdictFor.delete(item.group);
        item.group.removeAttribute('data-betterquest-verdict');
      }
    }
  };
  presentation.addEventListener('change', paint); paint();
  // Same manual test hook as the PDF view — run from the page console:
  //   document.dispatchEvent(new Event('betterquest:party'))            green celebration
  //   document.dispatchEvent(new CustomEvent('betterquest:party',{detail:'wrong'}))  red flash
  const handlePartyTrigger = (event: Event) => {
    if ((event as CustomEvent).detail === 'wrong') flashScreen(document.body);
    else celebrateScreen(document.body);
  };
  document.addEventListener('betterquest:party', handlePartyTrigger);
  return { reconcile: paint, dispose() {
    presentation.removeEventListener('change', paint); presentation.removeAttribute('data-betterquest-slide');
    document.removeEventListener('betterquest:party', handlePartyTrigger);
    for (const timer of toastTimers) clearTimeout(timer);
    toastTimers.clear();
    document.querySelectorAll('.bq-slide-verdict').forEach(el => el.remove());
    presentation.querySelectorAll('.bq-slide-metrics').forEach(el => el.remove());
    for (const el of [...collapsed]) {
      el.style.removeProperty('display');
      el.removeAttribute('data-betterquest-collapsed-gap');
    }
    collapsed.clear();
    for (const item of collect()) {
      item.group?.removeAttribute('data-betterquest-question-ready');
      item.group?.removeAttribute('data-betterquest-verdict');
      if (originalHidden.has(item.button)) item.button.hidden = originalHidden.get(item.button)!;
      const spot = originalSpot.get(item.button);
      if (spot && spot.parent.isConnected) {
        if (spot.next && spot.next.parentNode === spot.parent) spot.parent.insertBefore(item.button, spot.next);
        else spot.parent.append(item.button);
      }
    }
    style.remove();
  } };
}
