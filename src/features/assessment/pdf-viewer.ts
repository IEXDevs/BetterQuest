import { mapPdfOptionLabels, parseQuestionBoundary, extractQuestionPoints, clean, type PdfOptionTarget, type PdfTextRun } from '../../adapters/quest/assessment';
import { celebrateScreen, flashScreen } from './celebration';
import { isBetterQuestDebug } from '../../shared/debug';
import { createFreeResponse, createNumericResponse, NUMERIC_RESPONSE_STYLES, type FreeResponse, type NumericResponse } from './numeric-response';
import { freeResponsePlacement, numericResponsePlacement } from './numeric-placement';

export interface InteractivePdfPage {
  width: number;
  height: number;
  runs: PdfTextRun[];
}

export interface InteractivePdfDocument {
  pageCount: number;
  renderPage: (pageNumber: number, canvas: HTMLCanvasElement) => Promise<InteractivePdfPage>;
  destroy: () => void;
}

export type OpenInteractivePdf = (url: string, signal: AbortSignal) => Promise<InteractivePdfDocument>;

export interface InteractivePdfOptions {
  url: string;
  optionMaximums: ReadonlyMap<number, number>;
  numericResponses?: ReadonlyMap<number, NumericResponse>;
  freeResponses?: ReadonlyMap<number, FreeResponse>;
  onNumericInput?: (questionNumber: number, value: string) => boolean;
  onNumericSubmit?: (questionNumber: number, value: string) => boolean;
  onFreeInput?: (questionNumber: number, value: string) => boolean;
  onFreeSubmit?: (questionNumber: number, value: string) => boolean;
  answeredQuestions?: ReadonlySet<number>;
  onChoose: (questionNumber: number, optionValue: number) => void;
  onSubmit?: (questionNumber: number) => boolean;
  onPoints?: (points: ReadonlyMap<number, number>) => void;
  openDocument?: OpenInteractivePdf;
}

function extensionUrl(path: string): string {
  return typeof chrome !== 'undefined' && typeof chrome.runtime?.getURL === 'function' ? chrome.runtime.getURL(path) : path;
}

async function openPdfDocument(url: string, signal: AbortSignal): Promise<InteractivePdfDocument> {
  const pdfjs = await import('pdfjs-dist');
  signal.throwIfAborted();
  let workerObjectUrl: string | undefined;
  const releaseWorkerUrl = () => {
    if (workerObjectUrl) { URL.revokeObjectURL(workerObjectUrl); workerObjectUrl = undefined; }
  };
  try {
    const workerUrl = extensionUrl('pdf.worker.min.mjs');
    if (typeof chrome !== 'undefined' && typeof chrome.runtime?.getURL === 'function') {
      try {
        const resp = await fetch(workerUrl);
        const scriptText = await resp.text();
        const blob = new Blob([scriptText], { type: 'application/javascript' });
        workerObjectUrl = URL.createObjectURL(blob);
        pdfjs.GlobalWorkerOptions.workerSrc = workerObjectUrl;
      } catch {
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
      }
    } else {
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    }
  } catch {
    pdfjs.GlobalWorkerOptions.workerSrc = extensionUrl('pdf.worker.min.mjs');
  }

  let task: ReturnType<typeof pdfjs.getDocument>;
  try { task = pdfjs.getDocument({
    url,
    withCredentials: true,
    wasmUrl: extensionUrl('pdfjs/wasm/'),
    standardFontDataUrl: extensionUrl('pdfjs/standard_fonts/'),
  }); } catch (error) { releaseWorkerUrl(); throw error; }
  let destruction: Promise<void> | undefined;
  const destroy = () => { destruction ??= task.destroy().catch(() => {}).finally(releaseWorkerUrl); };
  const abort = destroy;
  signal.addEventListener('abort', abort, { once: true });
  if (signal.aborted) destroy();
  try {
    const document = await task.promise;
    return {
      pageCount: document.numPages,
      async renderPage(pageNumber, canvas) {
        const page = await document.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1.45 });
        const outputScale = Math.min(2, globalThis.devicePixelRatio || 1);
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        const context = canvas.getContext('2d', { alpha: false });
        if (!context) throw new Error('Canvas rendering is unavailable.');
        await page.render({
          canvas,
          canvasContext: context,
          viewport,
          transform: outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0],
          background: '#ffffff',
        }).promise;
        const text = await page.getTextContent();
        const runs: PdfTextRun[] = [];
        for (const item of text.items) {
          if (!('str' in item)) continue;
          const transform = pdfjs.Util.transform(viewport.transform, item.transform);
          const height = Math.max(1, Math.hypot(transform[2], transform[3]));
          runs.push({
            text: item.str,
            page: pageNumber,
            left: transform[4],
            top: transform[5] - height,
            width: Math.max(1, item.width * viewport.scale),
            height,
          });
        }
        page.cleanup();
        return { width: viewport.width, height: viewport.height, runs };
      },
      destroy() { signal.removeEventListener('abort', abort); destroy(); },
    };
  } catch (error) {
    signal.removeEventListener('abort', abort);
    releaseWorkerUrl();
    throw error;
  }
}

function hitArea(
  target: PdfOptionTarget,
  targets: PdfOptionTarget[],
  pageRuns: PdfTextRun[],
  pageWidth: number,
  pageHeight: number
) {
  const isLeftColumn = target.left < pageWidth * 0.5;
  const isTwoColumn = targets.some(item => item.left >= pageWidth * 0.45) ||
    pageRuns.some(item => item.left >= pageWidth * 0.45 && item.top > 30);
  const columnRight = (isLeftColumn && isTwoColumn) ? pageWidth * 0.48 : pageWidth * 0.96;
  const columnLeft = (isTwoColumn && !isLeftColumn) ? pageWidth * 0.5 : 0;

  // Options on Quest PDFs are strictly line-by-line down a column.
  // There are no side-by-side options; boxes span across the column.
  const left = Math.max(columnLeft, target.left - 6);
  const right = columnRight;
  const top = Math.max(0, target.top - Math.min(6, target.height * 0.4));

  // Target below in the SAME question and SAME column
  const nextInSameQuestion = targets.find(item =>
    item.page === target.page &&
    item.questionNumber === target.questionNumber &&
    (isTwoColumn ? (item.left < pageWidth * 0.5) === isLeftColumn : true) &&
    item.top > target.top + 2
  );

  // Preceding option in the same question and SAME column (to match height for the last option)
  const prevInQuestion = targets.find(item =>
    item.page === target.page &&
    item.questionNumber === target.questionNumber &&
    item.optionValue === target.optionValue - 1 &&
    (isTwoColumn ? (item.left < pageWidth * 0.5) === isLeftColumn : true) &&
    target.top > item.top + 2
  );
  let prevHeight = prevInQuestion ? target.top - prevInQuestion.top : null;
  if (!prevHeight) {
    const qTargets = targets.filter(t => t.questionNumber === target.questionNumber);
    for (let i = 1; i < qTargets.length; i++) {
      if (qTargets[i].page === qTargets[i - 1].page &&
        (isTwoColumn ? (qTargets[i].left < pageWidth * 0.5) === (qTargets[i - 1].left < pageWidth * 0.5) : true) &&
        qTargets[i].top > qTargets[i - 1].top + 2) {
        prevHeight = qTargets[i].top - qTargets[i - 1].top;
        break;
      }
    }
  }

  // Next question boundary run on the page in this column
  const nextQuestionRun = pageRuns.find(r => {
    if (r.page !== target.page || r.top <= target.top + 5) return false;
    const b = parseQuestionBoundary(clean(r.text));
    if (b === null || b === target.questionNumber) return false;
    if (isTwoColumn) {
      if (isLeftColumn && r.left >= pageWidth * 0.5) return false;
      if (!isLeftColumn && r.left < pageWidth * 0.45) return false;
    }
    return true;
  });

  // Next target from a different question in this column
  const nextTargetInColumn = targets.find(item => {
    if (item.page !== target.page || item.questionNumber === target.questionNumber || item.top <= target.top + 5) return false;
    if (isTwoColumn) {
      if (isLeftColumn && item.left >= pageWidth * 0.5) return false;
      if (!isLeftColumn && item.left < pageWidth * 0.45) return false;
    }
    return true;
  });

  const verticalCeiling = nextQuestionRun
    ? nextQuestionRun.top - 8
    : (nextTargetInColumn ? nextTargetInColumn.top - 35 : pageHeight - 20);

  let bottom: number;
  if (nextInSameQuestion) {
    bottom = Math.min(nextInSameQuestion.top - 2, verticalCeiling);
  } else {
    // This is the last option of the question.
    // It must NEVER exceed verticalCeiling (the next question header).
    const optionSpan = prevHeight
      ? Math.max(prevHeight - 4, 30)
      : Math.max(30, target.height * 2.5);
    bottom = Math.min(verticalCeiling, target.top + optionSpan);
  }

  // Ensure minimum height while staying strictly within verticalCeiling
  bottom = Math.min(pageHeight - 10, Math.min(verticalCeiling, Math.max(top + 18, bottom)));

  const safeLeft = Math.max(0, Math.min(pageWidth - 40, left));
  const safeTop = Math.max(0, Math.min(pageHeight - 20, top));
  const safeWidth = Math.min(pageWidth - safeLeft, Math.max(40, right - safeLeft));
  const safeHeight = Math.min(pageHeight - safeTop, Math.max(16, bottom - safeTop));

  return {
    left: (safeLeft / pageWidth) * 100,
    top: (safeTop / pageHeight) * 100,
    width: (safeWidth / pageWidth) * 100,
    height: (safeHeight / pageHeight) * 100,
  };
}

export function createInteractivePdfViewer(container: HTMLElement, options: InteractivePdfOptions) {
  const document = container.ownerDocument;
  const element = document.createElement('section'); element.dataset.betterquest = 'interactive-pdf';
  element.setAttribute('aria-label', 'Interactive assignment PDF');
  const shadow = element.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = `
    ${NUMERIC_RESPONSE_STYLES}
    .pdf-numeric-response{position:absolute;z-index:3;background:var(--bq-surface,#fff);border-radius:5px}
    .pdf-numeric-response input,.pdf-numeric-response button{min-height:0;height:100%;padding:2px 6px;font-size:clamp(10px,calc(12px * var(--bq-pdf-zoom,1)),18px)}
    .pdf-free-response{position:absolute;z-index:3;display:flex;flex-direction:column;gap:calc(6px * var(--bq-pdf-zoom,1));padding:calc(10px * var(--bq-pdf-zoom,1));border:1px solid #c7d2fe;border-radius:calc(10px * var(--bq-pdf-zoom,1));background:linear-gradient(180deg,#ffffff 0%,#f5f3ff 100%);box-shadow:0 calc(4px * var(--bq-pdf-zoom,1)) calc(14px * var(--bq-pdf-zoom,1)) rgba(99,102,241,.22)}
    .pdf-free-response[data-correct="true"]{border-color:#16a34a;background:linear-gradient(180deg,#f0fdf4 0%,#ecfdf5 100%);box-shadow:0 calc(4px * var(--bq-pdf-zoom,1)) calc(14px * var(--bq-pdf-zoom,1)) rgba(22,163,74,.25)}
    .pdf-free-response[data-invalid="true"] textarea{border-color:#dc2626;box-shadow:0 0 0 calc(2px * var(--bq-pdf-zoom,1)) rgba(220,38,38,.25)}
    .pdf-free-head{display:flex;align-items:center;gap:calc(6px * var(--bq-pdf-zoom,1));font:750 calc(11px * var(--bq-pdf-zoom,1))/1.2 ui-rounded,"Avenir Next",sans-serif;color:#4338ca;letter-spacing:.02em}
    .pdf-free-head .pdf-free-badge{display:grid;place-items:center;min-width:calc(20px * var(--bq-pdf-zoom,1));height:calc(20px * var(--bq-pdf-zoom,1));padding:0 calc(6px * var(--bq-pdf-zoom,1));border-radius:999px;background:#4f46e5;color:#fff;font-size:calc(11px * var(--bq-pdf-zoom,1))}
    .pdf-free-response[data-correct="true"] .pdf-free-head{color:#15803d}
    .pdf-free-response[data-correct="true"] .pdf-free-head .pdf-free-badge{background:#16a34a}
    .pdf-free-response textarea{box-sizing:border-box;width:100%;min-height:calc(56px * var(--bq-pdf-zoom,1));padding:calc(8px * var(--bq-pdf-zoom,1));border:1px solid #cbd5e1;border-radius:calc(8px * var(--bq-pdf-zoom,1));background:#fff;color:#0f172a;font:400 calc(12px * var(--bq-pdf-zoom,1))/1.5 ui-rounded,"Avenir Next",sans-serif;resize:vertical}
    .pdf-free-response textarea:focus{outline:none;border-color:#6366f1;box-shadow:0 0 0 calc(2px * var(--bq-pdf-zoom,1)) rgba(99,102,241,.3)}
    .pdf-free-foot{display:flex;align-items:center;gap:calc(8px * var(--bq-pdf-zoom,1))}
    .pdf-free-foot .pdf-free-count{margin-left:auto;font-size:calc(10px * var(--bq-pdf-zoom,1));color:#64748b;font-variant-numeric:tabular-nums}
    .pdf-free-foot button{display:inline-flex;align-items:center;gap:calc(6px * var(--bq-pdf-zoom,1));padding:calc(6px * var(--bq-pdf-zoom,1)) calc(14px * var(--bq-pdf-zoom,1));border:0;border-radius:calc(8px * var(--bq-pdf-zoom,1));background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;font:750 calc(11px * var(--bq-pdf-zoom,1))/1.2 ui-rounded,"Avenir Next",sans-serif;cursor:pointer;box-shadow:0 calc(3px * var(--bq-pdf-zoom,1)) calc(10px * var(--bq-pdf-zoom,1)) rgba(99,102,241,.35)}
    .pdf-free-foot button:hover:not(:disabled){background:linear-gradient(135deg,#4f46e5,#4338ca)}
    .pdf-free-foot button:disabled{opacity:.55;cursor:not-allowed}
    :host([data-dark-pages="true"]) .pdf-free-response{background:linear-gradient(180deg,#1e1b4b 0%,#312e81 100%);border-color:#818cf8}
    :host([data-dark-pages="true"]) .pdf-free-head{color:#e0e7ff}
    :host([data-dark-pages="true"]) .pdf-free-response textarea{background:#0f172a;color:#e2e8f0;border-color:#475569}
    :host{
      display:block!important;
      width:100%!important;
      max-width:100%!important;
      min-width:100%!important;
      height:100%!important;
      min-height:0!important;
      background:var(--bq-raised,#eef3f6);
      color:var(--bq-text,#18253a);
      font:13px/1.4 ui-rounded,"Avenir Next",sans-serif;
      border:1px solid var(--bq-border,#d7e2f0);
      border-radius:0;
      overflow:hidden;
      box-sizing:border-box!important;
      color-scheme:light dark;
      --bq-pdf-muted:color-mix(in srgb,var(--bq-muted,#748491) 70%,var(--bq-text,#18253a));
      --bq-pdf-zoom:1;
    }
    :host([data-fullscreen="true"]),
    :host(:fullscreen){
      position:fixed!important;
      inset:0!important;
      width:100vw!important;
      height:100vh!important;
      min-height:100vh!important;
      max-height:100vh!important;
      border-radius:0!important;
      z-index:999999!important;
    }
    *{box-sizing:border-box}
    .shell{display:flex;flex-direction:column;height:100%;width:100%;position:relative}
    .verdict-toast{position:absolute;top:56px;left:50%;transform:translateX(-50%);z-index:60;display:flex;align-items:center;gap:8px;padding:8px 16px;border-radius:999px;font:750 13px/1.2 ui-rounded,"Avenir Next",sans-serif;letter-spacing:.01em;white-space:nowrap;box-shadow:0 8px 24px rgba(0,0,0,.3);animation:verdict-in .2s ease-out}
    .verdict-toast[data-verdict="correct"]{background:#16a34a;color:#fff}
    .verdict-toast[data-verdict="wrong"]{background:#dc2626;color:#fff}
    @keyframes verdict-in{from{opacity:0;transform:translate(-50%,-6px)}to{opacity:1;transform:translate(-50%,0)}}
    .toolbar{position:sticky;top:0;z-index:5;display:flex;flex-shrink:0;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;min-height:48px;padding:8px 14px;background:var(--bq-surface,#fff);color:var(--bq-text,#18253a);box-shadow:0 3px 12px #08111c18;border-bottom:1px solid var(--bq-border,#d7e2f0)}
    .title{font-weight:750}
    .meta{color:var(--bq-pdf-muted);font-size:11px}
    .toolbar-actions{display:flex;flex-wrap:wrap;align-items:center;justify-content:flex-end;gap:6px}
    .tool-btn{display:inline-flex;align-items:center;gap:5px;height:32px;padding:0 10px;border:1px solid var(--bq-border,#d7e2f0);border-radius:6px;background:var(--bq-raised,#eef3f6);color:var(--bq-text,#18253a);font:700 12px/1 inherit;cursor:pointer;transition:background .15s ease}
    .tool-btn:hover{background:color-mix(in srgb,var(--bq-raised,#eef3f6) 72%,var(--bq-accent,#2563eb))}
    .tool-btn[aria-pressed="true"]{border-color:var(--bq-accent,#227ab0);color:var(--bq-accent,#227ab0)}
    /* Slides/Classic switch, hosted here by the assignment header. */
    [data-betterquest="view-toggle"]{display:inline-flex;align-items:center;gap:2px;padding:3px;margin:0 10px 0 0;border:1px solid var(--bq-border,#d7e2f0);border-radius:8px;background:var(--bq-raised,#eef3f6);flex-shrink:0}
    [data-betterquest="view-toggle"]:empty{display:none}
    [data-betterquest="view-toggle"]>a{display:inline-flex;align-items:center;justify-content:center;min-height:30px;padding:5px 12px;margin:0;border:0;border-radius:6px;background:transparent;color:var(--bq-muted,#64748b);font:700 12px/1.2 inherit;text-decoration:none;box-shadow:none;cursor:pointer;white-space:nowrap;transition:background .15s ease,color .15s ease,box-shadow .15s ease}
    [data-betterquest="view-toggle"]>a:hover{color:var(--bq-text,#18253a);background:color-mix(in srgb,var(--bq-surface,#fff) 70%,transparent)}
    [data-betterquest="view-toggle"]>a[data-betterquest-view-active="true"]{background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:#fff;box-shadow:0 1px 4px #00000024}
    [data-betterquest="view-toggle"]>a:focus-visible{outline:2px solid #7c3aed;outline-offset:1px}
    .tool-btn:focus-visible,.zoom button:focus-visible,.option-hit:focus-visible,.pdf-submit-btn:focus-visible,.submit-pill:focus-visible{outline:3px solid #2563eb;outline-offset:2px}
    .zoom{display:flex;align-items:center;gap:6px}
    .zoom button{width:32px;height:32px;border:1px solid var(--bq-border,#d7e2f0);border-radius:6px;background:var(--bq-raised,#eef3f6);color:var(--bq-text,#18253a);font:800 16px/1 inherit;cursor:pointer}
    .pages{
      display:flex!important;
      flex-direction:column!important;
      align-items:center!important;
      flex:1 1 auto!important;
      overflow-y:auto!important;
      overflow-x:hidden!important;
      scroll-behavior:smooth!important;
      padding:0!important;
      scrollbar-width:thin!important;
      min-height:0!important;
      width:100%!important;
      background:var(--bq-raised,#eef3f6);
    }
    .pages.is-zoomed{overflow-x:auto!important}
    .page{
      position:relative!important;
      width:var(--bq-pdf-page-width,100%)!important;
      max-width:none!important;
      flex:0 0 auto;
      margin:0 auto 1px!important;
      background:#fff!important;
      border-radius:0;
      box-shadow:none!important;
      transform-origin:top center;
      box-sizing:border-box!important;
    }
    .page canvas{display:block!important;width:100%!important;height:auto!important}
    /* Only rasterized PDF pixels change. Interactive overlays are siblings,
       not descendants of the canvas, and retain their original colors. */
    :host([data-dark-pages="true"]) .page{background:#111!important}
    :host([data-dark-pages="true"]) .page canvas{filter:invert(1) hue-rotate(180deg)}
    .question-anchor{
      position:absolute;
      left:0;
      width:100%;
      height:2px;
      pointer-events:none;
      opacity:0;
    }
    .option-hit{
      position:absolute;
      z-index:10;
      display:grid;
      place-items:center;
      width:calc(40px * var(--bq-pdf-zoom, 1))!important;
      height:calc(40px * var(--bq-pdf-zoom, 1))!important;
      border-radius:calc(18px * var(--bq-pdf-zoom, 1))!important;
      border:calc(2px * var(--bq-pdf-zoom, 1)) solid #6366f1;
      background:#ffffff;
      color:#4338ca;
      font:800 calc(15px * var(--bq-pdf-zoom, 1))/1 ui-rounded,"Avenir Next",system-ui,sans-serif;
      box-shadow:0 calc(1px * var(--bq-pdf-zoom, 1)) calc(4px * var(--bq-pdf-zoom, 1)) rgba(79,70,229,.25);
      cursor:pointer;
      box-sizing:border-box;
      transform:translate(calc(5px * var(--bq-pdf-zoom, 1)),calc(3px * var(--bq-pdf-zoom, 1)));
      transition:transform .15s cubic-bezier(.16,1,.3,1),background .15s ease,border-color .15s ease,box-shadow .15s ease,color .15s ease;
    }
    .option-hit::before{
      content:'';
      position:absolute;
      inset:calc(-4px * var(--bq-pdf-zoom, 1)) calc(-8px * var(--bq-pdf-zoom, 1));
      border-radius:999px;
      pointer-events:auto;
    }
    :host([data-dark-pages="true"]) .option-hit{
      background:#18253a;
      color:#e0e7ff;
      border-color:#818cf8;
      box-shadow:0 calc(1px * var(--bq-pdf-zoom, 1)) calc(4px * var(--bq-pdf-zoom, 1)) rgba(0,0,0,.45);
    }
    .option-hit:hover,.option-hit:focus-visible{
      transform:translate(calc(5px * var(--bq-pdf-zoom, 1)),calc(5px * var(--bq-pdf-zoom, 1))) scale(1.08);
      border-color:#4338ca;
      background:#4f46e5;
      color:#fff;
      box-shadow:0 calc(3px * var(--bq-pdf-zoom, 1)) calc(10px * var(--bq-pdf-zoom, 1)) rgba(79,70,229,.45);
    }
    :host([data-dark-pages="true"]) .option-hit:hover,
    :host([data-dark-pages="true"]) .option-hit:focus-visible{
      border-color:#a5b4fc;
      background:#6366f1;
      color:#fff;
    }
    .option-hit:active{
      transform:translate(calc(5px * var(--bq-pdf-zoom, 1)),calc(5px * var(--bq-pdf-zoom, 1))) scale(1.02);
    }
    .option-hit[hidden]{
      display:none!important;
    }
    .option-hit[aria-pressed="true"]{
      border:calc(2px * var(--bq-pdf-zoom, 1)) solid #312e81;
      background:#4f46e5;
      color:#fff;
      transform:translate(calc(5px * var(--bq-pdf-zoom, 1)),calc(5px * var(--bq-pdf-zoom, 1))) scale(1.06);
      box-shadow:0 0 0 calc(3px * var(--bq-pdf-zoom, 1)) rgba(79,70,229,.35),0 calc(3px * var(--bq-pdf-zoom, 1)) calc(8px * var(--bq-pdf-zoom, 1)) rgba(49,46,129,.5);
    }
    :host([data-dark-pages="true"]) .option-hit[aria-pressed="true"]{
      border-color:#c7d2fe;
      background:#6366f1;
      color:#fff;
      box-shadow:0 0 0 calc(3px * var(--bq-pdf-zoom, 1)) rgba(129,140,248,.4),0 calc(3px * var(--bq-pdf-zoom, 1)) calc(8px * var(--bq-pdf-zoom, 1)) rgba(0,0,0,.5);
    }
    .option-hit.is-wrong{
      border-color:#b91c1c;
      background:#dc2626;
      color:#fff;
      box-shadow:0 calc(2px * var(--bq-pdf-zoom, 1)) calc(6px * var(--bq-pdf-zoom, 1)) rgba(220,38,38,.45);
    }
    .option-hit.is-wrong::before{
      display:none;
    }
    .option-hit.is-wrong::after{
      content:'✕';
      position:absolute;
      left:calc(100% + 6px);
      right:auto;
      top:50%;
      display:grid;
      place-items:center;
      width:calc(22px * var(--bq-pdf-zoom, 1));
      height:calc(22px * var(--bq-pdf-zoom, 1));
      border-radius:50%;
      background:#dc2626;
      color:#fff;
      font:800 calc(12px * var(--bq-pdf-zoom, 1))/1 ui-rounded,"Avenir Next",sans-serif;
      transform:translateY(-50%);
      box-shadow:0 calc(2px * var(--bq-pdf-zoom, 1)) calc(6px * var(--bq-pdf-zoom, 1)) rgba(220,38,38,.45);
      pointer-events:none;
    }
    .option-hit.is-correct{
      border:calc(2px * var(--bq-pdf-zoom, 1)) solid #15803d;
      background:#16a34a;
      color:#fff;
      box-shadow:0 calc(2px * var(--bq-pdf-zoom, 1)) calc(8px * var(--bq-pdf-zoom, 1)) rgba(22,163,74,.5);
      animation:bq-rainbow 2.4s linear infinite;
    }
    .option-hit.is-correct::before{
      display:none;
    }
    .option-hit.is-correct::after{
      content:'✓';
      position:absolute;
      left:calc(100% + 6px);
      right:auto;
      top:50%;
      display:grid;
      place-items:center;
      width:calc(22px * var(--bq-pdf-zoom, 1));
      height:calc(22px * var(--bq-pdf-zoom, 1));
      border-radius:50%;
      background:#16a34a;
      color:#fff;
      font:800 calc(13px * var(--bq-pdf-zoom, 1))/1 ui-rounded,"Avenir Next",sans-serif;
      transform:translateY(-50%);
      box-shadow:0 calc(2px * var(--bq-pdf-zoom, 1)) calc(8px * var(--bq-pdf-zoom, 1)) rgba(22,163,74,.55);
      pointer-events:none;
    }
    @keyframes bq-rainbow{
      0%,100%{box-shadow:0 0 0 calc(3px * var(--bq-pdf-zoom, 1)) rgba(245,158,11,.45),0 0 calc(14px * var(--bq-pdf-zoom, 1)) rgba(245,158,11,.5)}
      25%{box-shadow:0 0 0 calc(3px * var(--bq-pdf-zoom, 1)) rgba(34,197,94,.5),0 0 calc(14px * var(--bq-pdf-zoom, 1)) rgba(34,197,94,.55)}
      50%{box-shadow:0 0 0 calc(3px * var(--bq-pdf-zoom, 1)) rgba(59,130,246,.5),0 0 calc(14px * var(--bq-pdf-zoom, 1)) rgba(59,130,246,.55)}
      75%{box-shadow:0 0 0 calc(3px * var(--bq-pdf-zoom, 1)) rgba(168,85,247,.5),0 0 calc(14px * var(--bq-pdf-zoom, 1)) rgba(168,85,247,.55)}
    }
    @media(prefers-reduced-motion:reduce){.option-hit.is-correct{animation:none}.verdict-toast{animation:none}}
    .loading,.error{display:grid;place-items:center;min-height:280px;padding:28px;text-align:center;color:var(--bq-text,#18253a)}
    .error{color:var(--bq-warning,#a96645)}
    .pdf-submit-btn{
      position:absolute;
      z-index:30;
      display:inline-flex;
      align-items:center;
      gap:calc(6px * var(--bq-pdf-zoom, 1));
      padding:calc(6px * var(--bq-pdf-zoom, 1)) calc(14px * var(--bq-pdf-zoom, 1));
      border:0;
      border-radius:calc(6px * var(--bq-pdf-zoom, 1));
      background:linear-gradient(135deg,#6366f1,#4f46e5);
      color:#fff;
      font:750 calc(11px * var(--bq-pdf-zoom, 1))/1.2 ui-rounded,"Avenir Next",sans-serif;
      letter-spacing:.02em;
      box-shadow:0 calc(4px * var(--bq-pdf-zoom, 1)) calc(14px * var(--bq-pdf-zoom, 1)) rgba(99,102,241,.4),0 calc(2px * var(--bq-pdf-zoom, 1)) calc(4px * var(--bq-pdf-zoom, 1)) rgba(0,0,0,.2);
      cursor:pointer;
      white-space:nowrap;
      animation:pdf-pop-in .15s cubic-bezier(.16,1,.3,1);
      transform:translate(calc(5px * var(--bq-pdf-zoom, 1)),calc(5px * var(--bq-pdf-zoom, 1)));
      transition:transform .15s ease,box-shadow .15s ease,background .15s ease;
    }
    .pdf-submit-btn svg{
      width:calc(12px * var(--bq-pdf-zoom, 1));
      height:calc(12px * var(--bq-pdf-zoom, 1));
    }
    .pdf-submit-btn:hover{background:linear-gradient(135deg,#4f46e5,#4338ca);transform:translate(calc(5px * var(--bq-pdf-zoom, 1)),calc(5px * var(--bq-pdf-zoom, 1))) translateY(-1px) scale(1.02);box-shadow:0 calc(6px * var(--bq-pdf-zoom, 1)) calc(18px * var(--bq-pdf-zoom, 1)) rgba(99,102,241,.5),0 calc(3px * var(--bq-pdf-zoom, 1)) calc(6px * var(--bq-pdf-zoom, 1)) rgba(0,0,0,.25)}
    .pdf-submit-btn:active{transform:translate(calc(5px * var(--bq-pdf-zoom, 1)),calc(5px * var(--bq-pdf-zoom, 1))) scale(.98)}
    .pdf-submit-btn[disabled]{opacity:.75;cursor:not-allowed}
    .pdf-submit-btn[data-failed="true"]{background:linear-gradient(135deg,#b45309,#92400e)}
    .pdf-submit-btn[data-failed="true"]:hover{background:linear-gradient(135deg,#92400e,#78350a)}
    @keyframes pdf-pop-in{from{opacity:0;transform:translateY(-4px) scale(.95)}to{opacity:1;transform:translateY(0) scale(1)}}
    @media(prefers-reduced-motion:reduce){.option-hit,.option-hit::before,.pdf-submit-btn{transition:none;animation:none}}
  `;
  const shell = document.createElement('div'); shell.className = 'shell';
  const toolbar = document.createElement('div'); toolbar.className = 'toolbar';
  const copy = document.createElement('div'); const title = document.createElement('div'); title.className = 'title'; title.textContent = 'Interactive PDF';
  const meta = document.createElement('div'); meta.className = 'meta'; meta.textContent = 'Loading choices…'; copy.append(title, meta);
  const toolbarActions = document.createElement('div'); toolbarActions.className = 'toolbar-actions';
  // Home for the Slides/Classic switch, which belongs beside the dark/light
  // switch. display:contents keeps the slot itself out of the toolbar layout.
  const viewSlot = document.createElement('div');
  viewSlot.dataset.betterquest = 'view-toggle-slot';
  viewSlot.style.cssText = 'display:contents';
  const darkPagesBtn = document.createElement('button');
  darkPagesBtn.type = 'button'; darkPagesBtn.className = 'tool-btn';
  darkPagesBtn.dataset.betterquestPagesToggle = 'true';
  const DARK_PAGES_KEY = 'betterquest_pdf_dark_pages';
  const applyDarkPages = (dark: boolean) => {
    if (dark) element.dataset.darkPages = 'true';
    else delete element.dataset.darkPages;
    darkPagesBtn.setAttribute('aria-pressed', String(dark));
    // Name the switch the student would press, never the current state. A dark
    // PDF offers "Light pages", so the label always says where the button goes.
    darkPagesBtn.textContent = dark ? 'Light pages' : 'Dark pages';
    darkPagesBtn.title = dark
      ? 'Show PDF pages with their original light background. Diagram colors will match the original.'
      : 'Darken PDF pages only. Diagram colors may change; turn off to see original colors.';
  };
  // Restore before mounting, using the same on-device storage as PDF zoom.
  // Pages start light so original diagram colors survive until asked otherwise.
  let savedDarkPages = false;
  try { savedDarkPages = document.defaultView?.localStorage?.getItem(DARK_PAGES_KEY) === 'true'; }
  catch { /* Storage unavailable: default to original PDF colors. */ }
  applyDarkPages(savedDarkPages);
  darkPagesBtn.addEventListener('click', event => {
    event.stopPropagation(); // Do not dismiss a pending answer confirmation.
    const dark = element.dataset.darkPages !== 'true';
    applyDarkPages(dark);
    try { document.defaultView?.localStorage?.setItem(DARK_PAGES_KEY, String(dark)); }
    catch { /* The toggle still works for this viewer if storage is unavailable. */ }
  });
  const fullscreenBtn = document.createElement('button'); fullscreenBtn.type = 'button'; fullscreenBtn.className = 'tool-btn';
  fullscreenBtn.setAttribute('aria-label', 'Toggle full screen');

  const syncFs = () => {
    const isFs = Boolean(document.fullscreenElement) || element.dataset.fullscreen === 'true';
    fullscreenBtn.innerHTML = isFs
      ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 14h6m0 0v6m0-6L3 21m17-7h-6m0 0v6m0-6 7 7M4 10h6m0 0V4m0 6L3 3m17 7h-6m0 0V4m0 6 7-7"></path></svg> Exit full screen`
      : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg> Full screen`;
  };
  const handleFsChange = () => {
    syncFs();
    fitPagesToViewer();
    const boxes = shadow.querySelectorAll('.option-hit').length;
    console.info(`[BetterQuest] Fullscreen changed. Answer boxes on PDF: ${boxes}.`);
  };
  document.addEventListener('fullscreenchange', handleFsChange);
  syncFs();

  fullscreenBtn.addEventListener('click', () => {
    const isFs = Boolean(document.fullscreenElement) || element.dataset.fullscreen === 'true';
    const root = container.closest<HTMLElement>('#target') || container;
    if (isFs) {
      if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => { });
      element.removeAttribute('data-fullscreen');
      root.removeAttribute('data-betterquest-fullscreen');
      document.documentElement.removeAttribute('data-betterquest-fullscreen');
      syncFs();
    } else {
      const fsTarget = container.closest<HTMLElement>('#pdf-frame') || container || root;
      if (fsTarget.requestFullscreen) {
        fsTarget.requestFullscreen().catch(() => {
          element.dataset.fullscreen = 'true';
          root.dataset.betterquestFullscreen = 'true';
          document.documentElement.dataset.betterquestFullscreen = 'true';
          syncFs();
        });
      } else {
        element.dataset.fullscreen = 'true';
        root.dataset.betterquestFullscreen = 'true';
        document.documentElement.dataset.betterquestFullscreen = 'true';
        syncFs();
      }
    }
    // The fallback attribute path fires no fullscreenchange, so refit here.
    fitPagesToViewer();
  });
  const zoom = document.createElement('div'); zoom.className = 'zoom';
  const zoomOut = document.createElement('button'); zoomOut.type = 'button'; zoomOut.textContent = '−'; zoomOut.setAttribute('aria-label', 'Zoom out');
  const zoomIn = document.createElement('button'); zoomIn.type = 'button'; zoomIn.textContent = '+'; zoomIn.setAttribute('aria-label', 'Zoom in');
  const zoomValue = document.createElement('output'); zoomValue.setAttribute('aria-label', 'PDF zoom');
  zoom.append(zoomOut, zoomValue, zoomIn); toolbarActions.append(viewSlot, darkPagesBtn, fullscreenBtn, zoom); toolbar.append(copy, toolbarActions);
  const pages = document.createElement('div'); pages.className = 'pages';
  const loading = document.createElement('div'); loading.className = 'loading'; loading.textContent = 'Loading clickable choices…'; pages.append(loading);
  shell.append(toolbar, pages); shadow.append(style, shell); container.append(element);
  const abort = new AbortController();
  const pageElements = new Map<number, { root: HTMLElement; width: number; height: number; runs: PdfTextRun[] }>();
  const submitButtons = new Map<number, HTMLButtonElement>();
  let source: InteractivePdfDocument | undefined;
  let disposed = false;
  const ZOOM_KEY = 'betterquest_pdf_zoom';
  const readZoom = (): number => {
    try {
      const raw = document.defaultView?.localStorage?.getItem(ZOOM_KEY);
      if (raw !== null && raw !== undefined) {
        const value = Number(raw);
        if (Number.isFinite(value)) return Math.min(2.5, Math.max(0.1, value));
      }
    } catch { /* private mode etc: fall through to default */ }
    return 1;
  };
  const writeZoom = (value: number) => {
    try { document.defaultView?.localStorage?.setItem(ZOOM_KEY, String(value)); } catch { /* zoom still applies for this session */ }
  };
  let zoomLevel = readZoom();
  element.style.setProperty('--bq-pdf-zoom', String(zoomLevel));
  let fitScale = 1;
  let currentAnswered = new Set<number>(options.answeredQuestions ?? []);
  // The set of questions and their option counts can grow while the workspace
  // reads Quest's lazily-rendered response table, so it is kept mutable.
  let optionMaximums = new Map<number, number>(options.optionMaximums);
  let numericResponses = new Map(options.numericResponses || []);
  let freeResponses = new Map(options.freeResponses || []);
  const numericInputs = new Map<number, ReturnType<typeof createNumericResponse>>();
  const freeInputs = new Map<number, ReturnType<typeof createFreeResponse>>();
  let pdfRuns: PdfTextRun[] = [];
  let paintChoices: () => void = () => { };

  function dismissConfirm() {
    for (const [qNum, btn] of submitButtons.entries()) {
      btn.remove();
      submitButtons.delete(qNum);
    }
  }

  const handleGlobalClick = (event: MouseEvent) => {
    const path = event.composedPath ? event.composedPath() : [];
    const isOptionHit = path.some(el => (el as HTMLElement)?.classList?.contains('option-hit'));
    const isSubmitBtn = path.some(el => (el as HTMLElement)?.classList?.contains('pdf-submit-btn'));
    if (!isOptionHit && !isSubmitBtn) {
      dismissConfirm();
    }
  };
  document.addEventListener('click', handleGlobalClick);

  const handleKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      dismissConfirm();
    }
  };
  document.addEventListener('keydown', handleKey);

  // Manual test hook — run from the page console:
  //   document.dispatchEvent(new Event('betterquest:party'))            green celebration
  //   document.dispatchEvent(new CustomEvent('betterquest:party',{detail:'wrong'}))  red flash
  const handlePartyTrigger = (event: Event) => {
    if ((event as CustomEvent).detail === 'wrong') flashScreen(screenLayerHost());
    else celebrateScreen(screenLayerHost());
  };
  document.addEventListener('betterquest:party', handlePartyTrigger);

  const ZOOM_MIN = 0.1;
  const ZOOM_MAX = 2.5;
  let zoomWriteTimer: ReturnType<typeof setTimeout> | undefined;

  function paintZoom() {
    zoomValue.textContent = `${Math.round(zoomLevel * 100)}%`;
    pages.classList.toggle('is-zoomed', zoomLevel > 1.001);
    element.style.setProperty('--bq-pdf-zoom', String(zoomLevel));
    for (const { root, width } of pageElements.values()) {
      const targetWidth = Math.round(width * fitScale * zoomLevel * 100) / 100;
      root.style.setProperty('--bq-pdf-page-width', `${targetWidth}px`);
      root.style.width = `var(--bq-pdf-page-width, ${targetWidth}px)`;
      root.style.setProperty('--bq-pdf-zoom', String(zoomLevel));
    }
  }

  /** Keep the point under the cursor (or the center of the PDF) fixed while the scale changes. */
  function setZoom(next: number, origin?: { x: number; y: number }) {
    const clamped = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next));
    const rect = pages.getBoundingClientRect();
    const originX = origin ? origin.x - rect.left : rect.width / 2;
    const originY = origin ? origin.y - rect.top : rect.height / 2;
    const ratio = zoomLevel > 0 ? clamped / zoomLevel : 1;
    const contentX = pages.scrollLeft + originX;
    const contentY = pages.scrollTop + originY;
    zoomLevel = clamped;
    paintZoom();
    // The page list scrolls smoothly for question jumps. Zoom has to move instantly
    // or a pinch fights that animation.
    pages.style.setProperty('scroll-behavior', 'auto', 'important');
    pages.scrollLeft = contentX * ratio - originX;
    pages.scrollTop = contentY * ratio - originY;
    pages.style.removeProperty('scroll-behavior');
  }

  function rememberZoom() {
    if (zoomWriteTimer !== undefined) clearTimeout(zoomWriteTimer);
    zoomWriteTimer = setTimeout(() => {
      zoomWriteTimer = undefined;
      writeZoom(zoomLevel);
    }, 120);
  }

  function commitZoom(next: number) {
    if (zoomWriteTimer !== undefined) {
      clearTimeout(zoomWriteTimer);
      zoomWriteTimer = undefined;
    }
    setZoom(next);
    writeZoom(zoomLevel);
  }

  // + / − land on a 10% step: round to the nearest 10, then move 10% that way.
  function stepZoom(direction: 1 | -1) {
    const nearest = Math.round((zoomLevel * 100) / 10) * 10;
    commitZoom((nearest + direction * 10) / 100);
  }

  function fitPagesToViewer() {
    const widestPage = Math.max(0, ...[...pageElements.values()].map(page => page.width));
    const availableWidth = Math.max(0, pages.clientWidth);
    fitScale = widestPage > 0 && availableWidth > 0
      ? availableWidth / widestPage
      : 1;
    paintZoom();
  }

  zoomOut.addEventListener('click', () => stepZoom(-1));
  zoomIn.addEventListener('click', () => stepZoom(1));
  // Chrome sends both trackpad pinch and ctrl+wheel as a ctrl-wheel on the element under the pointer.
  const handleZoomWheel = (event: WheelEvent) => {
    if (!event.ctrlKey || disposed) return;
    event.preventDefault();
    event.stopPropagation();
    let delta = event.deltaY;
    if (event.deltaMode === 1) delta *= 16;
    else if (event.deltaMode === 2) delta *= pages.clientHeight || 800;
    if (!delta) return;
    setZoom(zoomLevel * Math.exp(-delta * 0.0015), { x: event.clientX, y: event.clientY });
    rememberZoom();
  };
  pages.addEventListener('wheel', handleZoomWheel, { passive: false });
  document.defaultView?.addEventListener('resize', fitPagesToViewer);
  const ResizeObserverCtor = document.defaultView?.ResizeObserver;
  const resizeObserver = ResizeObserverCtor ? new ResizeObserverCtor(() => fitPagesToViewer()) : undefined;
  resizeObserver?.observe(pages);

  const ready = (async () => {
    try {
      source = await (options.openDocument || openPdfDocument)(new URL(options.url, document.URL).href, abort.signal);
      if (disposed || abort.signal.aborted) { source.destroy(); source = undefined; return false; }
      const runs: PdfTextRun[] = [];
      pages.replaceChildren();
      for (let pageNumber = 1; pageNumber <= source.pageCount; pageNumber++) {
        if (abort.signal.aborted) return false;
        const root = document.createElement('article'); root.className = 'page'; root.setAttribute('aria-label', `PDF page ${pageNumber}`);
        const canvas = document.createElement('canvas'); canvas.setAttribute('aria-hidden', 'true'); root.append(canvas); pages.append(root);
        const page = await source.renderPage(pageNumber, canvas);
        if (disposed || abort.signal.aborted) { canvas.width = 0; canvas.height = 0; return false; }
        root.style.aspectRatio = `${page.width} / ${page.height}`;
        pageElements.set(pageNumber, { root, width: page.width, height: page.height, runs: page.runs }); runs.push(...page.runs);
      }
      fitPagesToViewer();
      pdfRuns = runs;
      paintChoices = () => {
        const doc = source;
        if (!doc) return;
        for (const input of numericInputs.values()) input.element.remove();
        numericInputs.clear();
        for (const input of freeInputs.values()) input.element.remove();
        freeInputs.clear();
        // Rebuild from scratch: this runs again when the question map grows.
        for (const { root: pageRoot } of pageElements.values()) {
          pageRoot.querySelectorAll('.question-anchor, .option-hit, .pdf-free-response, .pdf-numeric-response').forEach(node => node.remove());
        }
        const targets = mapPdfOptionLabels(pdfRuns, optionMaximums);
        if (isBetterQuestDebug(document)) {
          const found = new Map<number, number>();
          for (const t of targets) found.set(t.questionNumber, (found.get(t.questionNumber) ?? 0) + 1);
          const report = [...optionMaximums.entries()].sort((a, b) => a[0] - b[0])
            .map(([q, max]) => {
              const n = found.get(q) ?? 0;
              return `Q${q}:${n}/${max}${n === 0 ? '*estimated*' : ''}`;
            });
          console.info(`[BetterQuest debug] PDF option labels found per question (found/max): ${report.join(' ')}`);
        }
        try {
          options.onPoints?.(extractQuestionPoints(pdfRuns));
        } catch { /* points are a bonus; never break choice mapping */ }

        // Build persistent question anchors for every question on the PDF so that jump
        // navigation can scroll directly to any question even when all questions are complete.
        // Single pass over the runs: index the first boundary run per question and
        // the first target per question so anchor placement is O(Q + N), not O(Q * N).
        const allQuestionNumbers = new Set<number>();
        for (const qNum of optionMaximums.keys()) allQuestionNumbers.add(qNum);
        for (const qNum of numericResponses.keys()) allQuestionNumbers.add(qNum);
        for (const qNum of freeResponses.keys()) allQuestionNumbers.add(qNum);
        for (const t of targets) allQuestionNumbers.add(t.questionNumber);
        const firstBoundaryRun = new Map<number, PdfTextRun>();
        const paddedRun = new Map<string, PdfTextRun>();
        const firstTargetByQuestion = new Map<number, PdfOptionTarget>();
        for (const r of pdfRuns) {
          const cleaned = clean(r.text);
          const b = parseQuestionBoundary(cleaned);
          if (b !== null && b > 0) {
            allQuestionNumbers.add(b);
            if (!firstBoundaryRun.has(b)) firstBoundaryRun.set(b, r);
          }
          if (!paddedRun.has(cleaned) && /^\d{3}$/.test(cleaned)) paddedRun.set(cleaned, r);
          if (b === null) {
            // Cheap heuristic anchors are resolved below via the target index.
          }
        }
        for (const t of targets) {
          if (!firstTargetByQuestion.has(t.questionNumber)) firstTargetByQuestion.set(t.questionNumber, t);
        }

        for (const qNum of [...allQuestionNumbers].sort((a, b) => a - b)) {
          if (!Number.isInteger(qNum) || qNum <= 0) continue;
          const qBoundaryRun = firstBoundaryRun.get(qNum) ||
            paddedRun.get(String(qNum).padStart(3, '0')) ||
            firstTargetByQuestion.get(qNum);
          let targetPage = 1;
          let topPercent = 0;
          if (qBoundaryRun) {
            targetPage = qBoundaryRun.page;
            const pageInfo = pageElements.get(targetPage);
            const height = pageInfo?.height || 800;
            const isRealBoundary = firstBoundaryRun.has(qNum) || paddedRun.has(String(qNum).padStart(3, '0'));
            const offset = isRealBoundary ? 12 : 40;
            topPercent = Math.max(0, Math.min(100, ((qBoundaryRun.top - offset) / height) * 100));
          } else {
            const qTarget = targets.find(t => t.questionNumber === qNum);
            if (qTarget) {
              targetPage = qTarget.page;
              const pageInfo = pageElements.get(targetPage);
              const height = pageInfo?.height || 800;
              topPercent = Math.max(0, Math.min(100, ((qTarget.top - 40) / height) * 100));
            } else {
              const totalQ = Math.max(1, allQuestionNumbers.size);
              targetPage = Math.max(1, Math.min(doc.pageCount, Math.ceil((qNum / totalQ) * doc.pageCount)));
              topPercent = 10;
            }
          }
          const pageRoot = pageElements.get(targetPage)?.root;
          if (pageRoot) {
            const anchor = document.createElement('div');
            anchor.className = 'question-anchor';
            anchor.dataset.question = String(qNum);
            anchor.style.top = `${topPercent}%`;
            pageRoot.append(anchor);
          }
        }

        for (const [question, response] of numericResponses) {
          const area = numericResponsePlacement(pdfRuns, question, pageElements);
          if (!area) continue;
          const page = pageElements.get(area.page)!;
          const numeric = createNumericResponse(document, question, response,
            value => options.onNumericInput?.(question, value) ?? false,
            value => options.onNumericSubmit?.(question, value) ?? false);
          numeric.element.classList.add('pdf-numeric-response');
          numeric.element.style.left = `${area.left}%`; numeric.element.style.top = `${area.top}%`;
          numeric.element.style.width = `${area.width}%`; numeric.element.style.height = `${area.height}%`;
          numeric.element.hidden = currentAnswered.has(question);
          page.root.append(numeric.element); numericInputs.set(question, numeric);
        }

        for (const [question, response] of freeResponses) {
          if (currentAnswered.has(question)) {
            // Answered free responses stay in the desk; the PDF keeps only the anchor.
            continue;
          }
          const area = freeResponsePlacement(pdfRuns, question, pageElements);
          if (!area) continue;
          const page = pageElements.get(area.page);
          if (!page) continue;
          const free = createFreeResponse(document, question, response,
            value => options.onFreeInput?.(question, value) ?? false,
            value => options.onFreeSubmit?.(question, value) ?? false);
          const card = free.element;
          card.classList.add('pdf-free-response');
          card.style.left = `${area.left}%`; card.style.top = `${area.top}%`;
          card.style.width = `${area.width}%`; card.style.minHeight = `${area.height}%`;
          const head = document.createElement('div'); head.className = 'pdf-free-head';
          const badge = document.createElement('span'); badge.className = 'pdf-free-badge'; badge.textContent = `Q${question}`;
          const label = document.createElement('span'); label.textContent = 'Your answer';
          head.append(badge, label);
          card.prepend(head);
          const foot = card.querySelector('.free-row');
          if (foot) foot.classList.add('pdf-free-foot');
          card.hidden = currentAnswered.has(question);
          page.root.append(card); freeInputs.set(question, free);
        }

        // A zero/negative count is an explicit text response, never a guessed choice count.
        if ([...optionMaximums.values()].every(max => max <= 0) && (numericResponses.size || freeResponses.size)) {
          const parts: string[] = [];
          if (numericInputs.size < numericResponses.size) parts.push('in response desk');
          const unplacedFree = [...freeResponses.keys()].filter(q => !freeInputs.has(q) && !currentAnswered.has(q));
          const placedFree = [...freeResponses.keys()].filter(q => freeInputs.has(q) && !currentAnswered.has(q));
          let freeLabel = '';
          if (placedFree.length) freeLabel = `${placedFree.length} free ${placedFree.length === 1 ? 'answer' : 'answers'}`;
          if (unplacedFree.length) freeLabel += `${freeLabel ? ' · ' : ''}${unplacedFree.length} free ${unplacedFree.length === 1 ? 'answer' : 'answers'} in response desk`;
          const numericLabel = numericResponses.size ? `Numeric answers${parts.length ? ` ${parts.join(' ')}` : ''}` : '';
          const combined = [numericLabel, freeLabel].filter(Boolean).join(' · ');
          meta.textContent = `${doc.pageCount} pages · ${combined || 'Text answers'}`;
          return;
        }
        // Ensure boxes for ALL answers possible for every unanswered question.
        // Indexed lookups keep this linear: targets are grouped once, column
        // layout is memoized per page, and boundary runs are pre-sorted so the
        // next-question search walks only one page instead of the whole document.
        const targetsByQuestion = new Map<number, PdfOptionTarget[]>();
        for (const t of targets) {
          const list = targetsByQuestion.get(t.questionNumber);
          if (list) list.push(t);
          else targetsByQuestion.set(t.questionNumber, [t]);
        }
        const twoColByPage = new Map<number, boolean>();
        for (const [pageNumber, info] of pageElements) {
          let left = false, right = false;
          for (const r of info.runs) {
            if (r.top <= 30) continue;
            if (r.left < info.width * 0.5) left = true;
            else if (r.left >= info.width * 0.45) right = true;
            if (left && right) break;
          }
          twoColByPage.set(pageNumber, left && right);
        }
        const boundaryRunsByPage = new Map<number, PdfTextRun[]>();
        for (const r of firstBoundaryRun.values()) {
          const list = boundaryRunsByPage.get(r.page);
          if (list) list.push(r);
          else boundaryRunsByPage.set(r.page, [r]);
        }
        for (const list of boundaryRunsByPage.values()) list.sort((a, b) => a.top - b.top);
        const nextBoundaryInColumn = (pageNumber: number, afterTop: number, exclude: number, isLeft: boolean, isTwoCol: boolean): PdfTextRun | undefined => {
          const list = boundaryRunsByPage.get(pageNumber);
          if (!list) return undefined;
          for (const r of list) {
            if (r.top <= afterTop) continue;
            const b = parseQuestionBoundary(clean(r.text));
            if (b === null || b === exclude) continue;
            if (isTwoCol) {
              if (isLeft && r.left >= (pageElements.get(pageNumber)?.width ?? 600) * 0.5) continue;
              if (!isLeft && r.left < (pageElements.get(pageNumber)?.width ?? 600) * 0.45) continue;
            }
            return r;
          }
          return undefined;
        };
        for (const [qNum, max] of optionMaximums.entries()) {
          if (currentAnswered.has(qNum)) continue;
          if (max < 1 || max > 9) continue;
          const qTargets = targetsByQuestion.get(qNum) ?? [];
          if (qTargets.length > 0 && qTargets.length < max) {
            const existingValues = new Set(qTargets.map(t => t.optionValue));
            const sorted = [...qTargets].sort((a, b) => a.optionValue - b.optionValue);
            const last = sorted[sorted.length - 1];
            const pageInfo = pageElements.get(last.page);
            const pageH = pageInfo?.height || 800;
            const pageW = pageInfo?.width || 600;
            const isLeft = last.left < pageW * 0.5;
            const isTwoCol = twoColByPage.get(last.page) ?? false;

            const nextQRun = nextBoundaryInColumn(last.page, last.top + 20, qNum, isLeft, isTwoCol);
            const nextQBottom = nextQRun ? nextQRun.top - 12 : pageH - 40;

            const missingBelow = max - last.optionValue;
            const sameColSorted = sorted.filter(t => t.page === last.page && (t.left < pageW * 0.5) === isLeft);
            let dy = sameColSorted.length > 1
              ? (last.top - sameColSorted[0].top) / (sameColSorted.length - 1)
              : Math.max(35, (nextQBottom - last.top) / Math.max(1, missingBelow + 1));
            dy = Math.max(20, dy);

            if (missingBelow > 0 && last.top + dy * missingBelow > nextQBottom - 8) {
              dy = Math.max(20, (nextQBottom - 8 - last.top) / missingBelow);
            }

            for (let v = 1; v <= max; v++) {
              if (!existingValues.has(v)) {
                const offset = v - last.optionValue;
                targets.push({
                  text: `${v}.`,
                  page: last.page,
                  left: last.left,
                  top: last.top + dy * offset,
                  width: last.width,
                  height: last.height,
                  questionNumber: qNum,
                  optionValue: v,
                });
              }
            }
          } else if (qTargets.length === 0) {
            const qBoundaryRun = firstBoundaryRun.get(qNum) || paddedRun.get(String(qNum).padStart(3, '0'));
            if (qBoundaryRun) {
              const pageInfo = pageElements.get(qBoundaryRun.page);
              const pageH = pageInfo?.height || 800;
              const pageW = pageInfo?.width || 600;
              const isLeft = qBoundaryRun.left < pageW * 0.5;
              const isTwoCol = twoColByPage.get(qBoundaryRun.page) ?? false;
              const colLeft = (isTwoCol && !isLeft) ? pageW * 0.5 : 40;

              // Find where the next question begins on this page & column
              const nextQRun = nextBoundaryInColumn(qBoundaryRun.page, qBoundaryRun.top + 20, qNum, isLeft, isTwoCol);
              const nextQBottom = nextQRun ? nextQRun.top - 12 : pageH - 40;

              const minOptionH = 28;
              const maxStartTop = Math.max(qBoundaryRun.top + 35, nextQBottom - max * minOptionH);
              const minStartTop = qBoundaryRun.top + 35;

              // Find where the prompt text ends (runs before maxStartTop)
              const promptRuns = pdfRuns.filter(r =>
                r.page === qBoundaryRun.page &&
                r.top >= qBoundaryRun.top &&
                r.top <= maxStartTop &&
                r.top < nextQBottom - 30 &&
                (isTwoCol ? (isLeft ? r.left < pageW * 0.5 : r.left >= pageW * 0.45) : true)
              );
              const promptBottom = promptRuns.length > 0
                ? Math.max(...promptRuns.map(r => r.top + r.height))
                : qBoundaryRun.top + 25;

              const startTop = Math.min(maxStartTop, Math.max(minStartTop, promptBottom + 10));
              const availableHeight = Math.max(max * 20, nextQBottom - 6 - startTop);
              const dy = availableHeight / max;

              for (let v = 1; v <= max; v++) {
                targets.push({
                  text: `${v}.`,
                  page: qBoundaryRun.page,
                  left: Math.max(colLeft, qBoundaryRun.left),
                  top: startTop + (v - 1) * dy,
                  width: 14,
                  height: Math.max(12, dy - 6),
                  questionNumber: qNum,
                  optionValue: v,
                });
              }
            }
          }
        }

        if (!targets.length) {
          if (currentAnswered.size > 0 && currentAnswered.size >= optionMaximums.size) {
            const pageLabel = `${doc.pageCount} ${doc.pageCount === 1 ? 'page' : 'pages'}`;
            meta.textContent = `${pageLabel} · All questions completed`;
            return;
          }
          const page1 = pageElements.get(1);
          if (page1 && optionMaximums.size > 0) {
            let currentTop = 80;
            for (const [qNum, max] of optionMaximums.entries()) {
              if (currentAnswered.has(qNum)) continue;
              for (let v = 1; v <= max; v++) {
                targets.push({
                  text: `${v}.`,
                  page: 1,
                  left: 60,
                  top: currentTop,
                  width: 14,
                  height: 12,
                  questionNumber: qNum,
                  optionValue: v,
                });
                currentTop += 28;
              }
              currentTop += 20;
            }
          }
          if (!targets.length) {
            if (currentAnswered.size > 0) {
              const pageLabel = `${doc.pageCount} ${doc.pageCount === 1 ? 'page' : 'pages'}`;
              meta.textContent = `${pageLabel} · All questions completed`;
              return;
            }
            throw new Error('Interactive choices unavailable for this document.');
          }
        }

        for (const target of targets) {
          // Never invent clickable choices for PDF headers the response table did
          // not list — that is how finished homeworks kept showing 70+ options.
          if (!optionMaximums.has(target.questionNumber)) continue;
          if (currentAnswered.has(target.questionNumber)) {
            // If a user has already answered a question do not show the option to choose answers for that
            continue;
          }
          const page = pageElements.get(target.page); if (!page) continue;
          const area = hitArea(target, targets, page.runs, page.width, page.height);
          const button = document.createElement('button'); button.type = 'button'; button.className = 'option-hit';
          button.dataset.question = String(target.questionNumber); button.dataset.option = String(target.optionValue);
          const textClean = clean(target.text);
          const match = textClean.match(/^([1-9]|[a-iA-I])(?:\.|\)|\s|$)/);
          const label = match ? match[1].toUpperCase() : String(target.optionValue);
          button.textContent = label;
          button.setAttribute('aria-label', `Select option ${target.optionValue} for question ${target.questionNumber}`); button.setAttribute('aria-pressed', 'false');
          button.style.left = `${area.left}%`; button.style.top = `${area.top}%`; button.style.width = `${area.width}%`; button.style.height = `${area.height}%`;
          button.addEventListener('click', (event) => {
            event.stopPropagation();
            options.onChoose(target.questionNumber, target.optionValue);
          });
          page.root.append(button);
        }
        const activeTargets = targets.filter(t => !currentAnswered.has(t.questionNumber));
        const pageLabel = `${doc.pageCount} ${doc.pageCount === 1 ? 'page' : 'pages'}`;
        const pendingFree = [...freeResponses.keys()].filter(q => !currentAnswered.has(q));
        const pendingNumeric = [...numericResponses.keys()].filter(q => !currentAnswered.has(q));
        const segments: string[] = [];
        if (activeTargets.length > 0) segments.push(`${activeTargets.length} answer ${activeTargets.length === 1 ? 'choice' : 'choices'}`);
        if (pendingNumeric.length) segments.push(`${pendingNumeric.length} numeric ${pendingNumeric.length === 1 ? 'answer' : 'answers'}`);
        if (pendingFree.length) segments.push(`${pendingFree.length} free ${pendingFree.length === 1 ? 'answer' : 'answers'}`);
        const choiceLabel = segments.length ? segments.join(' · ') : 'All questions completed';
        meta.textContent = `${pageLabel} · ${choiceLabel}`;
      };
      paintChoices();
      return true;
    } catch (error) {
      if (abort.signal.aborted || disposed) return false;
      pages.replaceChildren(); const message = document.createElement('div'); message.className = 'error';
      message.textContent = error instanceof Error ? error.message : 'Interactive choices unavailable.'; pages.append(message);
      meta.textContent = 'Original PDF view'; return false;
    }
  })();

  const keptCorrect = new Set<number>();

  function refreshMeta() {
    const activeHits = shadow.querySelectorAll<HTMLButtonElement>('.option-hit:not([hidden])');
    const numericPending = [...numericResponses.keys()].filter(question => !currentAnswered.has(question));
    const freePending = [...freeResponses.keys()].filter(question => !currentAnswered.has(question));
    const pageLabel = `${pageElements.size} ${pageElements.size === 1 ? 'page' : 'pages'}`;
    const segments: string[] = [];
    if (activeHits.length > 0) segments.push(`${activeHits.length} answer ${activeHits.length === 1 ? 'choice' : 'choices'}`);
    if (numericPending.length) {
      const label = `${numericPending.length} numeric ${numericPending.length === 1 ? 'answer' : 'answers'}${numericPending.some(question => !numericInputs.has(question)) ? ' in response desk' : ''}`;
      segments.push(label);
    }
    if (freePending.length) {
      const unplaced = freePending.filter(question => !freeInputs.has(question));
      const label = `${freePending.length} free ${freePending.length === 1 ? 'answer' : 'answers'}${unplaced.length ? ' in response desk' : ''}`;
      segments.push(label);
    }
    const choiceLabel = segments.length ? segments.join(' · ') : 'All questions completed';
    meta.textContent = `${pageLabel} · ${choiceLabel}`;
  }

  function attemptSubmit(questionNumber: number) {
    const btn = submitButtons.get(questionNumber);
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Submitting…';
      delete btn.dataset.failed;
    }
    let sent = false;
    try {
      sent = options.onSubmit?.(questionNumber) ?? false;
    } catch {
      sent = false;
    }
    if (!sent) {
      // The answer never reached Quest: hand control back instead of
      // leaving a stuck control.
      if (btn) {
        btn.disabled = false;
        btn.dataset.failed = 'true';
        btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg> Try again`;
        btn.setAttribute('aria-label', `Submit question ${questionNumber} did not reach Quest. Activate to try again, or answer from the sidebar.`);
      }
    }
  }

  /** Fullscreen's top layer hides everything outside it, so the celebration
   * lives in the shell while fullscreen and on the page body otherwise. */
  function screenLayerHost(): HTMLElement {
    if (document.fullscreenElement?.contains(element)) return shell;
    return document.body || shell;
  }

  return {
    element,
    ready,
    setSelected(questionNumber: number, optionValue: string) {
      if (disposed) return;
      if (numericResponses.has(questionNumber)) { numericInputs.get(questionNumber)?.setValue(optionValue); return; }
      if (freeResponses.has(questionNumber)) { freeInputs.get(questionNumber)?.setValue(optionValue); return; }
      if (currentAnswered.has(questionNumber)) return;
      for (const button of shadow.querySelectorAll<HTMLButtonElement>('.option-hit')) {
        const q = Number(button.dataset.question);
        if (q === questionNumber) {
          button.setAttribute('aria-pressed', String(button.dataset.option === optionValue));
        } else {
          button.setAttribute('aria-pressed', 'false');
        }
      }
      for (const [qNum, btn] of submitButtons.entries()) {
        btn.remove();
        submitButtons.delete(qNum);
      }
      if (optionValue) {
        const activeHit = shadow.querySelector<HTMLButtonElement>(
          `.option-hit[data-question="${questionNumber}"][data-option="${optionValue}"]`
        );
        if (activeHit && activeHit.parentElement) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'pdf-submit-btn';
          btn.dataset.question = String(questionNumber);
          btn.setAttribute('aria-label', `Submit question ${questionNumber}`);
          btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg> Confirm`;
          const leftPct = Number.parseFloat(activeHit.style.left) || 0;
          const topPct = Number.parseFloat(activeHit.style.top) || 0;
          if (leftPct > 78) {
            btn.style.right = 'calc(8px * var(--bq-pdf-zoom, 1))';
          } else {
            btn.style.left = `calc(${leftPct}% + 34px * var(--bq-pdf-zoom, 1))`;
          }
          btn.style.top = `calc(${topPct}% - 4px * var(--bq-pdf-zoom, 1))`;
          btn.addEventListener('click', (event) => {
            event.stopPropagation();
            attemptSubmit(questionNumber);
          });
          activeHit.parentElement.append(btn);
          submitButtons.set(questionNumber, btn);
        }
      }
    },
    markWrong(questionNumber: number, optionValue: string) {
      if (numericResponses.has(questionNumber)) { numericInputs.get(questionNumber)?.input.setAttribute('aria-invalid', 'true'); return; }
      if (freeResponses.has(questionNumber)) {
        const card = freeInputs.get(questionNumber)?.element;
        card?.setAttribute('data-invalid', 'true');
        freeInputs.get(questionNumber)?.input.setAttribute('aria-invalid', 'true');
        return;
      }
      if (currentAnswered.has(questionNumber) || keptCorrect.has(questionNumber)) return;
      const box = shadow.querySelector<HTMLElement>(
        `.option-hit[data-question="${questionNumber}"][data-option="${optionValue}"]`
      );
      box?.classList.add('is-wrong');
    },
    announce(questionNumber: number, verdict: 'correct' | 'wrong') {
      shell.querySelector('.verdict-toast')?.remove();
      const toast = document.createElement('div');
      toast.className = 'verdict-toast';
      toast.dataset.verdict = verdict;
      toast.setAttribute('role', 'status');
      toast.textContent = verdict === 'correct'
        ? `Question ${questionNumber} correct ✓`
        : `Question ${questionNumber} incorrect ✕ — try again`;
      shell.append(toast);
      setTimeout(() => toast.remove(), 4000);
      if (verdict === 'wrong') flashScreen(screenLayerHost());
    },
    celebrate(questionNumber: number, optionValue: string, party: boolean) {
      const free = freeInputs.get(questionNumber);
      if (free && freeResponses.has(questionNumber)) {
        if (free.element.hidden && !party) return;
        keptCorrect.add(questionNumber);
        free.element.hidden = false;
        free.element.dataset.correct = 'true';
        free.element.removeAttribute('data-invalid');
        free.input.setAttribute('aria-label', `Question ${questionNumber} is correct`);
        if (party) celebrateScreen(screenLayerHost());
        const confirm = submitButtons.get(questionNumber);
        confirm?.remove();
        submitButtons.delete(questionNumber);
        refreshMeta();
        return;
      }
      const boxes = [...shadow.querySelectorAll<HTMLElement>(`.option-hit[data-question="${questionNumber}"]`)];
      const target = boxes.find(box => box.dataset.option === optionValue);
      if (!target) return;
      // A fresh verdict (party) always shows its box even if Quest's reflection
      // already marked the question answered; only historic answers stay hidden.
      if (target.hidden && !party) return;
      keptCorrect.add(questionNumber);
      target.hidden = false;
      for (const box of boxes) {
        if (box !== target) box.hidden = true;
      }
      target.classList.remove('is-wrong');
      target.classList.add('is-correct');
      target.setAttribute('aria-pressed', 'true');
      target.setAttribute('aria-label', `Question ${questionNumber}: option ${optionValue} is correct`);
      // Celebration first: UI cleanup must never be able to block it.
      if (party) celebrateScreen(screenLayerHost());
      const confirm = submitButtons.get(questionNumber);
      confirm?.remove();
      submitButtons.delete(questionNumber);
      refreshMeta();
    },
    setFullscreen(active: boolean) {
      if (active) {
        element.dataset.fullscreen = 'true';
      } else {
        element.removeAttribute('data-fullscreen');
      }
      syncFs();
      fitPagesToViewer();
    },
    setAnsweredQuestions(answered: ReadonlySet<number>) {
      if (disposed) return;
      currentAnswered = new Set(answered);
      for (const [question, input] of numericInputs) input.element.hidden = currentAnswered.has(question);
      for (const [question, input] of freeInputs) input.element.hidden = currentAnswered.has(question);
      if (isBetterQuestDebug(element.ownerDocument)) {
        const list = [...currentAnswered].sort((a, b) => a - b);
        console.info(`[BetterQuest debug] PDF treats these questions as completed (boxes hidden): ${list.length ? list.join(', ') : '(none)'}`);
      }
      for (const button of shadow.querySelectorAll<HTMLButtonElement>('.option-hit')) {
        const q = Number(button.dataset.question);
        // Hide, never delete: a half-rendered row during Quest's reseed can
        // misread as answered, and the boxes must come back afterwards.
        button.hidden = currentAnswered.has(q) && !keptCorrect.has(q);
      }
      for (const [qNum, btn] of submitButtons.entries()) {
        if (currentAnswered.has(qNum)) {
          btn.remove();
          submitButtons.delete(qNum);
        }
      }
      refreshMeta();
    },
    setOptionMaximums(next: ReadonlyMap<number, number>): boolean {
      // Quest renders its response rows lazily, so the workspace keeps feeding
      // the map as more questions become readable. Rebuild choices whenever the
      // map grows so every question gets its answer boxes. Nothing is applied
      // until the pages are painted, so the workspace re-feeds the map from its
      // ready handler.
      if (disposed || !pdfRuns.length) return false;
      let grew = false;
      for (const [qNum, max] of next) {
        const current = optionMaximums.get(qNum);
        if (current === undefined) { optionMaximums.set(qNum, max); grew = true; continue; }
        // Text answers use 0 (numeric) / -1 (free) markers that must win over an
        // earlier half-rendered guess, and choice counts only ever grow.
        if (max <= 0 ? current !== max : current < max) { optionMaximums.set(qNum, max); grew = true; }
      }
      if (!grew) return false;
      paintChoices();
      for (const button of shadow.querySelectorAll<HTMLButtonElement>('.option-hit')) {
        const q = Number(button.dataset.question);
        button.hidden = currentAnswered.has(q) && !keptCorrect.has(q);
      }
      refreshMeta();
      return true;
    },
    setNumericValue(questionNumber: number, value: string) {
      if (disposed) return;
      const response = numericResponses.get(questionNumber);
      if (response) numericResponses.set(questionNumber, { ...response, value });
      numericInputs.get(questionNumber)?.setValue(value);
    },
    setFreeValue(questionNumber: number, value: string) {
      if (disposed) return;
      const response = freeResponses.get(questionNumber);
      if (response) freeResponses.set(questionNumber, { ...response, value });
      freeInputs.get(questionNumber)?.setValue(value);
    },
    setFreeResponses(next: ReadonlyMap<number, FreeResponse>) {
      if (disposed) return;
      let changed = freeResponses.size !== next.size;
      for (const [question, response] of next) {
        if (!freeResponses.has(question) || optionMaximums.get(question) !== -1) changed = true;
        optionMaximums.set(question, -1);
        freeInputs.get(question)?.update(response);
      }
      freeResponses = new Map(next);
      if (changed && pdfRuns.length) paintChoices();
    },
    setNumericResponses(next: ReadonlyMap<number, NumericResponse>) {
      if (disposed) return;
      let changed = numericResponses.size !== next.size;
      for (const [question, response] of next) {
        if (!numericResponses.has(question) || optionMaximums.get(question) !== 0) changed = true;
        optionMaximums.set(question, 0);
        numericInputs.get(question)?.update(response);
      }
      numericResponses = new Map(next);
      if (changed && pdfRuns.length) paintChoices();
    },
    scrollToQuestion(questionNumber: number): boolean {
      if (disposed) return false;
      const anchor = shadow.querySelector<HTMLElement>(`.question-anchor[data-question="${questionNumber}"]`);
      if (anchor) {
        const pageEl = anchor.closest<HTMLElement>('.page');
        let didScrollContainer = false;
        if (pageEl && pages) {
          const anchorRect = anchor.getBoundingClientRect?.();
          const pagesRect = pages.getBoundingClientRect?.();
          if (pagesRect && anchorRect && (anchorRect.top !== 0 || anchorRect.bottom !== 0 || pagesRect.top !== 0 || pagesRect.height !== 0)) {
            const targetY = (anchorRect.top - pagesRect.top) + pages.scrollTop;
            pages.scrollTo?.({ top: Math.max(0, targetY - 24), behavior: 'smooth' });
            didScrollContainer = true;
          } else {
            const topPct = parseFloat(anchor.style.top) || 0;
            const pageHeight = pageEl.clientHeight || pageEl.offsetHeight || 0;
            const targetY = pageEl.offsetTop + (topPct / 100) * pageHeight;
            if (Number.isFinite(targetY) && targetY > 0) {
              pages.scrollTo?.({ top: Math.max(0, targetY - 24), behavior: 'smooth' });
              didScrollContainer = true;
            }
          }
        }
        if (!didScrollContainer) {
          anchor.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
        }
        return true;
      }
      const hit = shadow.querySelector<HTMLElement>(`.option-hit[data-question="${questionNumber}"]`);
      if (hit) {
        const pageEl = hit.closest<HTMLElement>('.page');
        let didScrollContainer = false;
        if (pageEl && pages) {
          const hitRect = hit.getBoundingClientRect?.();
          const pagesRect = pages.getBoundingClientRect?.();
          if (pagesRect && hitRect && (hitRect.top !== 0 || hitRect.bottom !== 0 || pagesRect.top !== 0 || pagesRect.height !== 0)) {
            const targetY = (hitRect.top - pagesRect.top) + pages.scrollTop;
            pages.scrollTo?.({ top: Math.max(0, targetY - 60), behavior: 'smooth' });
            didScrollContainer = true;
          } else {
            const topPct = parseFloat(hit.style.top) || 0;
            const pageHeight = pageEl.clientHeight || pageEl.offsetHeight || 0;
            const targetY = pageEl.offsetTop + (topPct / 100) * pageHeight;
            if (Number.isFinite(targetY) && targetY > 0) {
              pages.scrollTo?.({ top: Math.max(0, targetY - 60), behavior: 'smooth' });
              didScrollContainer = true;
            }
          }
        }
        if (!didScrollContainer) {
          hit.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
        }
        return true;
      }
      return false;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('click', handleGlobalClick);
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('betterquest:party', handlePartyTrigger);
      document.defaultView?.removeEventListener('resize', fitPagesToViewer);
      pages.removeEventListener('wheel', handleZoomWheel);
      if (zoomWriteTimer !== undefined) {
        clearTimeout(zoomWriteTimer);
        writeZoom(zoomLevel);
      }
      resizeObserver?.disconnect();
      abort.abort();
      source?.destroy();
      source = undefined;
      pdfRuns = [];
      paintChoices = () => {};
      optionMaximums.clear(); currentAnswered.clear(); keptCorrect.clear();
      numericInputs.clear(); numericResponses.clear();
      freeInputs.clear(); freeResponses.clear();
      for (const page of pageElements.values()) {
        const canvas = page.root.querySelector('canvas');
        if (canvas) { canvas.width = 0; canvas.height = 0; }
      }
      pageElements.clear();
      for (const btn of submitButtons.values()) btn.remove();
      submitButtons.clear();
      element.remove();
    },
  };
}
