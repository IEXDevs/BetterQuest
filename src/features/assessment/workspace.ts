import {
  findPdfAssessment,
  isNativeControlAvailable,
  isResponseOptionAvailable,
  readAssessmentMetrics,
  readAssessmentResponses,
  type PdfAssessmentElements,
} from '../../adapters/quest/assessment';
import { createInteractivePdfViewer } from './pdf-viewer';

type PdfViewer = ReturnType<typeof createInteractivePdfViewer>;
type PdfViewerFactory = typeof createInteractivePdfViewer;

type AssessmentMode = 'basic' | 'betterquest';

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
    #target[data-betterquest-pdf-workspace="enhanced"][data-betterquest-pdf-mode="betterquest"],
    #target[data-betterquest-pdf-workspace="enhanced"][data-betterquest-pdf-mode="new"],
    #target[data-betterquest-pdf-workspace="enhanced"][data-betterquest-pdf-mode="bottom"],
    [data-betterquest-pdf-workspace="enhanced"][data-betterquest-pdf-mode="betterquest"],
    [data-betterquest-pdf-workspace="enhanced"][data-betterquest-pdf-mode="new"],
    [data-betterquest-pdf-workspace="enhanced"][data-betterquest-pdf-mode="bottom"]{
      display:flex!important;
      flex-direction:column!important;
      width:100%!important;
      max-width:100%!important;
      min-width:0!important;
      gap:16px!important;
      box-sizing:border-box!important;
    }
    [data-betterquest-pdf-workspace="enhanced"][data-betterquest-pdf-mode="betterquest"] > #pdf-frame,
    [data-betterquest-pdf-workspace="enhanced"][data-betterquest-pdf-mode="new"] > #pdf-frame,
    [data-betterquest-pdf-workspace="enhanced"][data-betterquest-pdf-mode="bottom"] > #pdf-frame{
      order:1!important;
      width:100%!important;
      max-width:100%!important;
      min-width:100%!important;
      flex:1 1 auto!important;
      box-sizing:border-box!important;
    }
    [data-betterquest-pdf-workspace="enhanced"][data-betterquest-pdf-mode="betterquest"] > [data-betterquest="assessment-rail"],
    [data-betterquest-pdf-workspace="enhanced"][data-betterquest-pdf-mode="new"] > [data-betterquest="assessment-rail"],
    [data-betterquest-pdf-workspace="enhanced"][data-betterquest-pdf-mode="bottom"] > [data-betterquest="assessment-rail"]{
      order:2!important;
      position:static!important;
      width:100%!important;
      max-width:100%!important;
      min-width:100%!important;
      margin-top:0!important;
      flex:0 0 auto!important;
      box-sizing:border-box!important;
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
    #target[data-betterquest-pdf-workspace="enhanced"][data-betterquest-pdf-mode="basic"],
    #target[data-betterquest-pdf-workspace="enhanced"][data-betterquest-pdf-mode="old"],
    [data-betterquest-pdf-workspace="enhanced"][data-betterquest-pdf-mode="basic"],
    [data-betterquest-pdf-workspace="enhanced"][data-betterquest-pdf-mode="old"]{
      display:grid!important;
      grid-template-columns:minmax(0,1fr) minmax(320px,380px)!important;
      column-gap:18px!important;
      row-gap:16px!important;
      align-items:start!important;
      width:100%!important;
      max-width:100%!important;
      min-width:0!important;
      box-sizing:border-box!important;
    }
    [data-betterquest-pdf-workspace="enhanced"][data-betterquest-pdf-mode="basic"] > #pdf-frame,
    [data-betterquest-pdf-workspace="enhanced"][data-betterquest-pdf-mode="old"] > #pdf-frame{
      grid-column:1!important;
      grid-row:2!important;
      width:100%!important;
      min-width:0!important;
    }
    [data-betterquest-pdf-workspace="enhanced"][data-betterquest-pdf-mode="basic"] > [data-betterquest="assessment-rail"],
    [data-betterquest-pdf-workspace="enhanced"][data-betterquest-pdf-mode="old"] > [data-betterquest="assessment-rail"]{
      grid-column:2!important;
      grid-row:2!important;
      position:sticky!important;
      top:76px!important;
      min-width:0!important;
    }
    /* Due row (due date + PDF Download) sits full-width above the PDF, never stranded below. */
    [data-betterquest-pdf-workspace="enhanced"][data-betterquest-pdf-mode="basic"] > [data-betterquest-due-row],
    [data-betterquest-pdf-workspace="enhanced"][data-betterquest-pdf-mode="old"] > [data-betterquest-due-row]{
      grid-column:1 / -1!important;
      grid-row:1!important;
    }
    [data-betterquest-pdf-workspace="enhanced"][data-betterquest-pdf-mode="basic"] > :not(#pdf-frame):not([data-betterquest="assessment-rail"]){
      grid-column:1 / -1!important;
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
      min-height: 760px !important;
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
    :fullscreen :is([data-betterquest-pdf-mode="betterquest"], [data-betterquest-pdf-mode="new"]) #presentation-pdf-frame,
    [data-betterquest-fullscreen="true"] :is([data-betterquest-pdf-mode="betterquest"], [data-betterquest-pdf-mode="new"]) #presentation-pdf-frame,
    :fullscreen :is([data-betterquest-pdf-mode="betterquest"], [data-betterquest-pdf-mode="new"]) iframe,
    [data-betterquest-fullscreen="true"] :is([data-betterquest-pdf-mode="betterquest"], [data-betterquest-pdf-mode="new"]) iframe,
    :fullscreen #pdf-frame[data-betterquest-pdf-mode="betterquest"] #presentation-pdf-frame,
    [data-betterquest-fullscreen="true"] #pdf-frame[data-betterquest-pdf-mode="betterquest"] #presentation-pdf-frame,
    :fullscreen #pdf-frame[data-betterquest-pdf-mode="betterquest"] iframe,
    [data-betterquest-fullscreen="true"] #pdf-frame[data-betterquest-pdf-mode="betterquest"] iframe{
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
    #presentation-div[data-betterquest-slide="enhanced"] .custom-control-label{display:block!important;min-height:48px;padding:11px 15px 11px 42px!important;border:1px solid #d9d4c9;border-radius:8px;color:#18253a!important;background:#fff;cursor:pointer;transition:border-color .18s ease,box-shadow .18s ease,transform .18s ease}
    #presentation-div[data-betterquest-slide="enhanced"] .custom-control-label:hover{border-color:#6366f1}
    #presentation-div[data-betterquest-slide="enhanced"] .custom-control-input:checked + .custom-control-label{border-color:#6366f1;box-shadow:0 0 0 3px #6366f124;background:#f5f3ff}
    #presentation-div[data-betterquest-slide="enhanced"] :where(mjx-container,.MathJax,.MathJax_Display){color:#18253a!important}
    #presentation-div[data-betterquest-slide="enhanced"] .instanceitempart .submit-btn{opacity:0;visibility:hidden;pointer-events:none;transform:translateX(-8px);transition:opacity .18s ease,transform .18s ease}
    #presentation-div[data-betterquest-slide="enhanced"] .instanceitempart[data-betterquest-question-ready="true"] .submit-btn{opacity:1;visibility:visible;pointer-events:auto;transform:none}
    @media(max-width:1050px){#target[data-betterquest-pdf-workspace="enhanced"]{grid-template-columns:1fr}#target[data-betterquest-pdf-workspace="enhanced"] > #pdf-frame,#target[data-betterquest-pdf-workspace="enhanced"] > [data-betterquest="assessment-rail"]{grid-column:1}#target[data-betterquest-pdf-workspace="enhanced"] > [data-betterquest="assessment-rail"]{position:static;margin-top:14px}}
    @media(prefers-reduced-motion:reduce){#presentation-div[data-betterquest-slide="enhanced"] .custom-control-label,#presentation-div[data-betterquest-slide="enhanced"] .submit-btn{transition:none!important}}
  `;
  document.head.append(style); return style;
}

function pointsSummary(value: string): string {
  const match = value.match(/([-+]?\d+(?:\.\d+)?)\s+out of\s+([-+]?\d+(?:\.\d+)?)\s+points(?:\s*\(([-+]?\d+(?:\.\d+)?)%\))?/i);
  return match ? `${match[1]} / ${match[2]} points (${match[3] || '0'}%)` : (value || 'Not available');
}

function withNativeResponsesVisible<T>(elements: PdfAssessmentElements, read: () => T): T {
  const marked = elements.responseRoot.hasAttribute('data-betterquest-native-responses');
  elements.responseRoot.removeAttribute('data-betterquest-native-responses');
  elements.responseRoot.dataset.betterquestNativeVisible = 'true';
  try { return read(); }
  finally {
    delete elements.responseRoot.dataset.betterquestNativeVisible;
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
    :host{display:block;color:var(--bq-text,#18253a);font:14px/1.4 ui-rounded,"Avenir Next",sans-serif;color-scheme:light dark;--bq-assessment-muted:color-mix(in srgb,var(--bq-muted,#748491) 70%,var(--bq-text,#18253a));--bq-assessment-accent:color-mix(in srgb,var(--bq-accent,#227ab0) 78%,var(--bq-text,#18253a))}
    *{box-sizing:border-box}
    .rail{max-height:calc(100vh - 88px);overflow:auto;padding:16px;border:1px solid var(--bq-border,#d7e2f0);border-radius:10px;background:color-mix(in srgb,var(--bq-surface,#fff) 96%,transparent);box-shadow:0 18px 50px #172a3b18;scrollbar-width:thin}
    header{position:sticky;top:-16px;z-index:2;margin:-16px -16px 12px;padding:16px;background:var(--bq-surface,#fff);border-bottom:1px solid var(--bq-border,#d7e2f0)}
    .top{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
    .title-group{display:flex;align-items:center;gap:12px}
    h2{margin:0;font:750 17px/1.15 ui-rounded,"Avenir Next",sans-serif;letter-spacing:-.02em}
    .mode-switcher{display:inline-flex;align-items:center;padding:3px;border-radius:7px;background:var(--bq-raised,#eef2f6);border:1px solid var(--bq-border,#d7e2f0);gap:2px}
    .mode-btn{border:0;border-radius:5px;background:transparent;color:var(--bq-assessment-muted);padding:5px 11px;font:700 11px/1 inherit;cursor:pointer;transition:background .15s ease,color .15s ease,box-shadow .15s ease}
    .mode-btn:hover{color:var(--bq-text,#18253a)}
    .mode-btn.active,.mode-btn[aria-checked="true"]{background:#2563eb;color:#fff;font-weight:800;box-shadow:0 1px 4px #00000024}
    .mode-btn:focus-visible{outline:2px solid #2563eb;outline-offset:1px}
    .actions{display:flex;gap:6px}
    .focus{border:1px solid var(--bq-border,#d7e2f0);border-radius:6px;background:var(--bq-raised,#eef3f6);color:var(--bq-text,#18253a);padding:7px 9px;font:700 11px/1 inherit;cursor:pointer}
    .focus:focus-visible,.choice:focus-visible,.submit:focus-visible,.number:focus-visible{outline:2px solid var(--bq-accent,#6366f1);outline-offset:2px}
    .metrics-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:12px}
    .metric-card{display:flex;flex-direction:column;gap:3px;padding:8px 10px;border:1px solid var(--bq-border,#e2e8f0);border-radius:8px;background:var(--bq-raised,#f8fafc)}
    .metric-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--bq-assessment-muted)}
    .metric-value{font-size:13px;font-weight:750;color:var(--bq-text,#0f172a);line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .metric-value.points{color:var(--bq-assessment-accent)}
    .progress-wrap{margin-top:10px}
    .progress-copy{margin:0;color:var(--bq-assessment-muted);font-size:12px}
    .meter{height:6px;margin-top:8px;overflow:hidden;border-radius:4px;background:var(--bq-raised,#eef3f6)}
    .meter span{display:block;height:100%;width:var(--progress);border-radius:inherit;background:#2563eb;transition:width .25s ease}

    /* 2 COLUMNS FOR ANSWERING AT THE BOTTOM */
    .questions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:14px}
    :host([data-layout="sidebar"]) .questions,
    .rail[data-layout="sidebar"] .questions{grid-template-columns:1fr}
    @media(max-width:1050px) and (min-width:641px){
      :host([data-layout="sidebar"]) .questions,
      .rail[data-layout="sidebar"] .questions{grid-template-columns:repeat(2,minmax(0,1fr))!important}
    }
    @media(max-width:640px){
      .questions{grid-template-columns:1fr!important}
    }

    .question{display:flex;flex-direction:column;gap:10px;padding:14px;border:1px solid var(--bq-border,#d7e2f0);border-radius:8px;background:var(--bq-surface,#fff);box-shadow:0 2px 8px #0f172a08;transition:border-color .18s ease,box-shadow .18s ease}
    .question:focus-within{border-color:var(--bq-accent,#227ab0)}
    .question-top{display:flex;align-items:center;justify-content:space-between;gap:8px}
    .number{font-weight:800;font-size:13px;color:var(--bq-text,#18253a);border:0;background:transparent;padding:2px 4px;margin:-2px -4px;border-radius:4px;cursor:pointer;font-family:inherit;text-align:left}
    .number:hover{color:var(--bq-assessment-accent);text-decoration:underline;text-underline-offset:2px}
    .number:focus-visible{outline:2px solid var(--bq-accent,#6366f1);outline-offset:2px}
    .selected{color:var(--bq-assessment-muted);font-size:11px;font-weight:600}
    .question-bottom{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
    .choices{display:flex;flex-wrap:wrap;gap:6px}
    .choice{width:32px;height:32px;border:1px solid var(--bq-border,#d7e2f0);border-radius:6px;background:var(--bq-raised,#f2f5f7);color:var(--bq-text,#18253a);font:750 12px/1 inherit;cursor:pointer;transition:transform .15s ease,border-color .15s ease,background .15s ease}
    .choice:hover{border-color:var(--bq-accent,#6366f1)}
    .choice[aria-pressed="true"]{border-color:#2563eb;background:#2563eb;color:#fff;box-shadow:0 5px 13px #2563eb33}
    .submit{border:0;border-radius:6px;background:#2563eb;color:#fff;padding:8px 14px;font:750 11px/1 inherit;cursor:pointer;transition:transform .15s ease,box-shadow .15s ease;margin-left:auto}
    .submit:hover{transform:translateY(-1px);background:#1d4ed8;box-shadow:0 4px 12px #2563eb40}
    .submit[hidden]{display:none}
    .submitted-tag{display:inline-flex;align-items:center;padding:5px 12px;border-radius:6px;background:var(--bq-raised,#f2f5f7);color:var(--bq-assessment-muted);font:700 12px/1 inherit;border:1px solid var(--bq-border,#d7e2f0)}
    .empty{color:var(--bq-assessment-muted);grid-column:1/-1}
    @media(max-width:1050px){#target[data-betterquest-pdf-workspace="enhanced"]{grid-template-columns:1fr}#target[data-betterquest-pdf-workspace="enhanced"] > #pdf-frame,#target[data-betterquest-pdf-workspace="enhanced"] > [data-betterquest="assessment-rail"]{grid-column:1}#target[data-betterquest-pdf-workspace="enhanced"] > [data-betterquest="assessment-rail"]{position:static;margin-top:14px}}
    @media(prefers-reduced-motion:reduce){.meter span,.choice,.submit{transition:none}.choice:hover,.submit:hover{transform:none}}
  `;
  const rail = document.createElement('section'); rail.className = 'rail'; rail.setAttribute('aria-label', 'Assessment responses');
  const header = document.createElement('header');
  const top = document.createElement('div'); top.className = 'top';

  const titleGroup = document.createElement('div'); titleGroup.className = 'title-group';
  const title = document.createElement('h2'); title.textContent = 'Response desk';

  let currentMode: AssessmentMode = 'betterquest';
  let responseSignature = '';
  const modeSwitcher = document.createElement('div');
  modeSwitcher.className = 'mode-switcher';
  modeSwitcher.setAttribute('role', 'radiogroup');
  modeSwitcher.setAttribute('aria-label', 'View mode');

  const basicModeBtn = document.createElement('button');
  basicModeBtn.type = 'button';
  basicModeBtn.className = 'mode-btn';
  basicModeBtn.dataset.mode = 'basic';
  basicModeBtn.dataset.alias = 'old';
  basicModeBtn.setAttribute('role', 'radio');
  basicModeBtn.textContent = 'Basic View';

  const bqModeBtn = document.createElement('button');
  bqModeBtn.type = 'button';
  bqModeBtn.className = 'mode-btn';
  bqModeBtn.dataset.mode = 'betterquest';
  bqModeBtn.dataset.alias = 'new';
  bqModeBtn.setAttribute('role', 'radio');
  bqModeBtn.textContent = 'BetterQuest View';

  function applyMode(mode: AssessmentMode) {
    currentMode = mode;

    updateModeButtons();
    syncModeChrome();
    syncPdfVisibility(mode === 'betterquest' && pdfViewerReady !== false);
  }

  function updateModeButtons() {
    basicModeBtn.setAttribute('aria-checked', String(currentMode === 'basic'));
    basicModeBtn.classList.toggle('active', currentMode === 'basic');
    bqModeBtn.setAttribute('aria-checked', String(currentMode === 'betterquest'));
    bqModeBtn.classList.toggle('active', currentMode === 'betterquest');
    root.dataset.betterquestPdfMode = currentMode;
    document.documentElement.dataset.betterquestPdfMode = currentMode;
    document.body.dataset.betterquestPdfMode = currentMode;
    host.dataset.layout = currentMode === 'basic' ? 'sidebar' : 'bottom';
    rail.dataset.layout = currentMode === 'basic' ? 'sidebar' : 'bottom';
  }

  basicModeBtn.addEventListener('click', () => applyMode('basic'));
  bqModeBtn.addEventListener('click', () => applyMode('betterquest'));
  updateModeButtons();
  modeSwitcher.append(basicModeBtn, bqModeBtn);
  titleGroup.append(title, modeSwitcher);

  const focus = document.createElement('button'); focus.type = 'button'; focus.className = 'focus fullscreen-btn'; focus.dataset.action = 'fullscreen';
  focus.setAttribute('aria-label', 'Toggle full screen');
  focus.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg> Full screen`;
  top.append(titleGroup, focus);

  const metricsGrid = document.createElement('div'); metricsGrid.className = 'metrics-grid';
  const scoreCard = document.createElement('div'); scoreCard.className = 'metric-card';
  const scoreLabel = document.createElement('span'); scoreLabel.className = 'metric-label'; scoreLabel.textContent = 'Your Score';
  const points = document.createElement('span'); points.className = 'metric-value points';
  scoreCard.append(scoreLabel, points);

  const avgCard = document.createElement('div'); avgCard.className = 'metric-card';
  const avgLabel = document.createElement('span'); avgLabel.className = 'metric-label'; avgLabel.textContent = 'Class Average';
  const classAvg = document.createElement('span'); classAvg.className = 'metric-value class-avg';
  classAvg.textContent = 'Not available';
  avgCard.append(avgLabel, classAvg);

  const sdCard = document.createElement('div'); sdCard.className = 'metric-card';
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
  header.append(top, metricsGrid, progressWrap); rail.append(header, questions); shadow.append(localStyle, rail);

  function syncModeChrome() {
    // BetterQuest view is an info strip under the PDF; answering happens on the PDF itself.
    questions.style.display = currentMode === 'betterquest' ? 'none' : '';
    // Basic view keeps the full answer panels but drops the fullscreen control.
    focus.style.display = currentMode === 'basic' ? 'none' : '';
  }
  syncModeChrome();

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
    classAvg.textContent = metrics.classAverage;
    stdDev.textContent = metrics.standardDeviation;
    meterValue.style.setProperty('--progress', `${bindings.length ? submitted / bindings.length * 100 : 0}%`);
  }

  let pendingSubmit: { questionNumber: number; optionValue: string; attempts: number; viaBetterQuest: boolean; timer: ReturnType<typeof setTimeout> | undefined } | null = null;

  /** Wrong options observed through our own submit flow, this session only. */
  const wrongMarks = new Map<number, Set<string>>();
  /** Questions already styled as correct on the PDF. */
  const markedCorrect = new Set<number>();
  let lastBindings: ReturnType<typeof readAssessmentResponses> = [];

  function readOutcome(table: HTMLTableElement, binding: { id: string }): 'correct' | 'exhausted' | null {
    const row = table.querySelector<HTMLElement>(`tr[data-id="${binding.id}"]`) ||
      table.querySelector<HTMLElement>(`#row-${binding.id}`);
    if (!row) return null;
    const status = row.querySelector('.status');
    const statusText = status?.textContent || '';
    const success = Boolean(status?.querySelector('.text-success, [class*="text-success"]'));
    if (success || (/\bcorrect\b/i.test(statusText) && !/\b(?:incorrect|not correct)\b/i.test(statusText))) return 'correct';
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
            void pdfViewer?.ready?.then(ok => {
              if (!disposed && ok) pdfViewer?.celebrate?.(qn, binding.select.value, false);
            });
          }
        }
      } else {
        const marked = wrongMarks.get(qn);
        if (marked) for (const value of marked) pdfViewer?.markWrong?.(qn, value);
      }
    }
  }

  function clearPendingSubmit() {
    if (pendingSubmit?.timer !== undefined) clearTimeout(pendingSubmit.timer);
    pendingSubmit = null;
  }

  function submitWarn(questionNumber: number, reason: string) {
    console.warn(`[BetterQuest] Answer for question ${questionNumber} was not sent to Quest: ${reason} Switch to Basic View to submit.`);
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
      const viaBetterQuest = currentMode === 'betterquest';
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
      if (!binding || binding.answered || !available || !nativeOption || !isResponseOptionAvailable(nativeOption)) return false;

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
    let fallbackMax = 0;
    for (const binding of bindings) {
      const max = Math.max(...binding.options.map(option => Number(option.value)).filter(Number.isInteger));
      if (max > fallbackMax && max <= 9) fallbackMax = max;
    }
    if (fallbackMax < 2) fallbackMax = 5;

    for (const binding of bindings) {
      const questionNumber = Number(binding.number);
      let maximum = Math.max(...binding.options.map(option => Number(option.value)).filter(Number.isInteger));
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
    });
    syncPdfVisibility(currentMode === 'betterquest');
    void pdfViewer.ready.then(ready => {
      if (disposed || !pdfViewer) return;
      pdfViewerReady = ready;
      if (!ready && currentMode === 'betterquest') {
        syncPdfVisibility(false);
        return;
      }
      syncPdfVisibility(currentMode === 'betterquest' && pdfViewerReady !== false);
      applyMarks(lastBindings);
    });
  }

  function scrollToQuestion(questionNumber: number, card: HTMLElement) {
    const hit = pdfViewer?.element.shadowRoot?.querySelector<HTMLElement>(
      `.option-hit[data-question="${questionNumber}"]`,
    );
    if (hit) {
      hit.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
      hit.focus?.({ preventScroll: true });
      return;
    }
    card.querySelector<HTMLButtonElement>('.choice')?.focus?.({ preventScroll: true });
    card.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' } as ScrollIntoViewOptions);
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

  function render() {
    if (disposed) return;
    const elements = findPdfAssessment(document); if (!elements || elements.root !== root) { host.remove(); return; }
    for (let p: HTMLElement | null = root.parentElement; p && p !== document.body; p = p.parentElement) {
      p.dataset.betterquestPdfParent = 'true';
    }
    root.dataset.betterquestPdfWorkspace = 'enhanced';
    root.dataset.betterquestPdfMode = currentMode;
    host.dataset.layout = currentMode === 'basic' ? 'sidebar' : 'bottom';
    rail.dataset.layout = currentMode === 'basic' ? 'sidebar' : 'bottom';
    syncModeChrome();
    if (host.parentElement !== root || host.previousElementSibling !== elements.pdfFrame) elements.pdfFrame.after(host);
    reconcileLeadingGaps(elements.pdfFrame);
    const bindings = withNativeResponsesVisible(elements, () => readAssessmentResponses(elements.table));
    elements.responseRoot.dataset.betterquestNativeResponses = 'true';
    hideNativeStatsElements(document, root);
    paintSummary(bindings, elements.tally);
    ensurePdfViewer(elements, bindings);
    const answeredQuestions = new Set<number>(
      bindings.filter(b => b.answered).map(b => Number(b.number)).filter(Number.isInteger)
    );
    pdfViewer?.setAnsweredQuestions?.(answeredQuestions);
    if (pendingSubmit) {
      const target = bindings.find(item => Number(item.number) === pendingSubmit!.questionNumber);
      if (!target || target.answered || target.attempts !== pendingSubmit.attempts) {
        // Quest reflected the submit (answered or attempts moved).
        const was = pendingSubmit;
        clearPendingSubmit();
        if (target) {
          const qn = Number(target.number);
          if (!target.answered && target.attempts > was.attempts) {
            if (was.viaBetterQuest && Number.isInteger(qn)) {
              let marked = wrongMarks.get(qn);
              if (!marked) { marked = new Set(); wrongMarks.set(qn, marked); }
              marked.add(was.optionValue);
            }
          } else if (target.answered && target.select.value && Number.isInteger(qn) && !markedCorrect.has(qn)) {
            if (readOutcome(elements.table, target) === 'correct') {
              markedCorrect.add(qn);
              const value = target.select.value;
              void pdfViewer?.ready?.then(ok => {
                if (!disposed && ok) pdfViewer?.celebrate?.(qn, value, true);
              });
            }
          }
        }
      }
    }
    lastBindings = bindings;
    applyMarks(bindings);
    syncPdfVisibility(currentMode === 'betterquest' && pdfViewerReady !== false);
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
    for (const binding of bindings) {
      const card = document.createElement('article'); card.className = 'question'; card.dataset.questionId = binding.id;
      const cardTop = document.createElement('div'); cardTop.className = 'question-top';
      const number = document.createElement('button'); number.type = 'button'; number.className = 'number'; number.textContent = `Question ${binding.number}`;
      number.setAttribute('aria-label', `Go to question ${binding.number} in the PDF`);
      number.addEventListener('click', () => scrollToQuestion(Number(binding.number), card));
      const selected = document.createElement('span'); selected.className = 'selected';

      if (binding.answered) {
        selected.textContent = binding.select.value ? `Answer ${binding.select.value} submitted` : 'Completed';
        const submittedTag = document.createElement('span');
        submittedTag.className = 'submitted-tag';
        submittedTag.textContent = binding.select.value ? `Submitted: Answer ${binding.select.value}` : 'Submitted';
        cardTop.append(number, selected);
        const cardBottom = document.createElement('div'); cardBottom.className = 'question-bottom';
        cardBottom.append(submittedTag);
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
    if (!bindings.length) { const empty = document.createElement('p'); empty.className = 'empty'; empty.textContent = 'Loading assignments…'; questions.append(empty); }
  }

  return { reconcile: render, dispose() {
    disposed = true; const elements = findPdfAssessment(document);
    clearPendingSubmit();
    document.removeEventListener('fullscreenchange', syncFs);
    document.removeEventListener('keydown', handleKeydown);
    syncPdfVisibility(false);
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

export function createSlideAssessmentEnhancement(presentation: HTMLElement) {
  const document = presentation.ownerDocument;
  const submits = [...presentation.querySelectorAll<HTMLButtonElement>('.submit-btn')].map(button => {
    const group = button.closest<HTMLElement>('.instanceitempart');
    return { button, group, hidden: button.hidden, radios: group ? [...group.querySelectorAll<HTMLInputElement>('input[type="radio"][name^="response_"]')] : [] };
  });
  const style = installStyles(document);
  presentation.dataset.betterquestSlide = 'enhanced';
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
  const paint = () => {
    reconcileGaps();
    for (const item of submits) {
      if (!item.group) continue;
      const ready = withSlideEnhancementDisabled(presentation, () => isNativeControlAvailable(item.button)) &&
        item.radios.some(radio => radio.checked && !radio.disabled);
      item.group.dataset.betterquestQuestionReady = String(ready);
    }
  };
  presentation.addEventListener('change', paint); paint();
  return { reconcile: paint, dispose() {
    presentation.removeEventListener('change', paint); presentation.removeAttribute('data-betterquest-slide');
    for (const el of [...collapsed]) {
      el.style.removeProperty('display');
      el.removeAttribute('data-betterquest-collapsed-gap');
    }
    collapsed.clear();
    for (const item of submits) { item.group?.removeAttribute('data-betterquest-question-ready'); item.button.hidden = item.hidden; } style.remove();
  } };
}
