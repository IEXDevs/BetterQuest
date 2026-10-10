import { mapPdfOptionLabels, type PdfOptionTarget, type PdfTextRun } from '../../adapters/quest/assessment';

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
  onChoose: (questionNumber: number, optionValue: number) => void;
  onSubmit?: (questionNumber: number) => void;
  openDocument?: OpenInteractivePdf;
}

function extensionUrl(path: string): string {
  return typeof chrome !== 'undefined' && typeof chrome.runtime?.getURL === 'function' ? chrome.runtime.getURL(path) : path;
}

async function openPdfDocument(url: string, signal: AbortSignal): Promise<InteractivePdfDocument> {
  const pdfjs = await import('pdfjs-dist');
  try {
    const workerUrl = extensionUrl('pdf.worker.min.mjs');
    if (typeof chrome !== 'undefined' && typeof chrome.runtime?.getURL === 'function') {
      try {
        const resp = await fetch(workerUrl);
        const scriptText = await resp.text();
        const blob = new Blob([scriptText], { type: 'application/javascript' });
        pdfjs.GlobalWorkerOptions.workerSrc = URL.createObjectURL(blob);
      } catch {
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
      }
    } else {
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    }
  } catch {
    pdfjs.GlobalWorkerOptions.workerSrc = extensionUrl('pdf.worker.min.mjs');
  }

  const task = pdfjs.getDocument({
    url,
    withCredentials: true,
    wasmUrl: extensionUrl('pdfjs/wasm/'),
    standardFontDataUrl: extensionUrl('pdfjs/standard_fonts/'),
  });
  const abort = () => { void task.destroy(); };
  signal.addEventListener('abort', abort, { once: true });
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
      destroy() { signal.removeEventListener('abort', abort); void task.destroy(); },
    };
  } catch (error) {
    signal.removeEventListener('abort', abort);
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
  const columnRight = isLeftColumn ? pageWidth * 0.48 : pageWidth * 0.96;
  const sameColumn = targets.find(item =>
    item.page === target.page &&
    item.questionNumber === target.questionNumber &&
    item.optionValue === target.optionValue + 1 &&
    item.top > target.top &&
    Math.abs(item.left - target.left) < pageWidth * 0.15
  );
  const verticalLimit = sameColumn
    ? sameColumn.top
    : Math.min(pageHeight, target.top + Math.max(34, target.height * 2.8));

  // Identify runs that are part of the equation (excluding the label marker itself)
  const equationRuns = pageRuns.filter(r => {
    const isSameAsLabel = Math.abs(r.left - target.left) < 6 && Math.abs(r.top - target.top) < 6;
    if (isSameAsLabel) return false;
    return (
      r.left >= target.left - 2 &&
      r.left < columnRight &&
      r.top >= target.top - target.height * 0.75 &&
      r.top < verticalLimit - 2
    );
  });

  const left = Math.max(0, target.left - 6);
  const top = Math.max(0, target.top - target.height * 0.4);
  let right: number;
  let bottom: number;

  if (equationRuns.length > 0) {
    const maxEquationRight = Math.max(...equationRuns.map(r => r.left + r.width));
    const maxEquationBottom = Math.max(...equationRuns.map(r => r.top + r.height));
    right = Math.min(columnRight, Math.max(target.left + 50, maxEquationRight + 12));
    bottom = Math.min(verticalLimit - 2, Math.max(target.top + target.height + 4, maxEquationBottom + 4));
  } else {
    right = Math.min(columnRight, target.left + Math.max(130, (columnRight - target.left) * 0.65));
    bottom = Math.min(verticalLimit - 2, target.top + Math.max(22, target.height * 1.8));
  }

  const width = Math.max(40, right - left);
  const height = Math.max(20, bottom - top);

  return {
    left: (left / pageWidth) * 100,
    top: (top / pageHeight) * 100,
    width: (width / pageWidth) * 100,
    height: (height / pageHeight) * 100,
  };
}

export function createInteractivePdfViewer(container: HTMLElement, options: InteractivePdfOptions) {
  const document = container.ownerDocument;
  const element = document.createElement('section'); element.dataset.betterquest = 'interactive-pdf';
  element.setAttribute('aria-label', 'Interactive assignment PDF');
  const shadow = element.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = `
    :host{
      display:block!important;
      width:100%!important;
      max-width:100%!important;
      min-width:100%!important;
      height:calc(100vh - 104px)!important;
      min-height:760px!important;
      background:var(--bq-raised,#eef3f6);
      color:var(--bq-text,#18253a);
      font:13px/1.4 ui-rounded,"Avenir Next",sans-serif;
      border:1px solid var(--bq-border,#d7e2f0);
      border-radius:0;
      overflow:hidden;
      box-sizing:border-box!important;
      color-scheme:light dark;
      --bq-pdf-muted:color-mix(in srgb,var(--bq-muted,#748491) 70%,var(--bq-text,#18253a));
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
    .shell{display:flex;flex-direction:column;height:100%;width:100%}
    .toolbar{position:sticky;top:0;z-index:5;display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:48px;padding:8px 14px;background:var(--bq-surface,#fff);color:var(--bq-text,#18253a);box-shadow:0 3px 12px #08111c18;border-bottom:1px solid var(--bq-border,#d7e2f0)}
    .title{font-weight:750}
    .meta{color:var(--bq-pdf-muted);font-size:11px}
    .toolbar-actions{display:flex;align-items:center;gap:6px}
    .tool-btn{display:inline-flex;align-items:center;gap:5px;height:32px;padding:0 10px;border:1px solid var(--bq-border,#d7e2f0);border-radius:6px;background:var(--bq-raised,#eef3f6);color:var(--bq-text,#18253a);font:700 12px/1 inherit;cursor:pointer;transition:background .15s ease}
    .tool-btn:hover{background:color-mix(in srgb,var(--bq-raised,#eef3f6) 72%,var(--bq-accent,#2563eb))}
    .tool-btn:focus-visible,.zoom button:focus-visible,.option-hit:focus-visible,.pdf-submit-btn:focus-visible{outline:3px solid #2563eb;outline-offset:2px}
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
      height:100%!important;
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
    .option-hit{
      position:absolute;
      z-index:2;
      border:1.5px dashed rgba(99,102,241,.5);
      border-radius:6px;
      background:rgba(99,102,241,.06);
      color:transparent;
      cursor:pointer;
      transition:background .15s ease,border-color .15s ease,box-shadow .15s ease
    }
    .option-hit::before{
      content:attr(data-option);
      position:absolute;
      left:4px;
      top:50%;
      display:grid;
      place-items:center;
      width:22px;
      height:22px;
      border-radius:50%;
      background:#4f46e5;
      color:#fff;
      font:800 12px/1 ui-rounded,"Avenir Next",sans-serif;
      transform:translateY(-50%);
      opacity:.95;
      box-shadow:0 2px 6px rgba(79,70,229,.45);
      transition:transform .15s ease,background .15s ease,opacity .15s ease;
      pointer-events:none
    }
    .option-hit:hover{
      border:1.5px solid #6366f1;
      background:rgba(99,102,241,.14);
      box-shadow:0 0 0 3px rgba(99,102,241,.24)
    }
    .option-hit:hover::before,.option-hit:focus-visible::before{
      transform:translateY(-50%) scale(1.1);
      background:#4338ca;
      opacity:1
    }
    .option-hit[aria-pressed="true"]{
      border:2px solid #4f46e5;
      background:rgba(99,102,241,.2);
      box-shadow:0 0 0 3px rgba(79,70,229,.35)
    }
    .option-hit[aria-pressed="true"]::before{
      background:#312e81;
      color:#fff;
      transform:translateY(-50%) scale(1.15);
      opacity:1;
      box-shadow:0 2px 8px rgba(49,46,129,.6)
    }
    .loading,.error{display:grid;place-items:center;min-height:280px;padding:28px;text-align:center;color:var(--bq-text,#18253a)}
    .error{color:var(--bq-warning,#a96645)}
    .pdf-submit-btn{
      position:absolute;
      z-index:10;
      display:inline-flex;
      align-items:center;
      gap:6px;
      padding:6px 14px;
      border:0;
      border-radius:6px;
      background:linear-gradient(135deg,#6366f1,#4f46e5);
      color:#fff;
      font:750 11px/1.2 ui-rounded,"Avenir Next",sans-serif;
      letter-spacing:.02em;
      box-shadow:0 4px 14px rgba(99,102,241,.4),0 2px 4px rgba(0,0,0,.2);
      cursor:pointer;
      white-space:nowrap;
      animation:pdf-pop-in .15s cubic-bezier(.16,1,.3,1);
      transition:transform .15s ease,box-shadow .15s ease,background .15s ease
    }
    .pdf-submit-btn:hover{background:linear-gradient(135deg,#4f46e5,#4338ca);transform:translateY(-1px) scale(1.02);box-shadow:0 6px 18px rgba(99,102,241,.5),0 3px 6px rgba(0,0,0,.25)}
    .pdf-submit-btn:active{transform:translateY(0) scale(.98)}
    .pdf-submit-btn[disabled]{opacity:.75;cursor:not-allowed}
    @keyframes pdf-pop-in{from{opacity:0;transform:translateY(-4px) scale(.95)}to{opacity:1;transform:translateY(0) scale(1)}}
    @media(prefers-reduced-motion:reduce){.option-hit,.option-hit::before,.pdf-submit-btn{transition:none;animation:none}}
  `;
  const shell = document.createElement('div'); shell.className = 'shell';
  const toolbar = document.createElement('div'); toolbar.className = 'toolbar';
  const copy = document.createElement('div'); const title = document.createElement('div'); title.className = 'title'; title.textContent = 'Interactive PDF';
  const meta = document.createElement('div'); meta.className = 'meta'; meta.textContent = 'Loading choices…'; copy.append(title, meta);
  const toolbarActions = document.createElement('div'); toolbarActions.className = 'toolbar-actions';
  const fullscreenBtn = document.createElement('button'); fullscreenBtn.type = 'button'; fullscreenBtn.className = 'tool-btn';
  fullscreenBtn.setAttribute('aria-label', 'Toggle full screen');

  const syncFs = () => {
    const isFs = Boolean(document.fullscreenElement) || element.dataset.fullscreen === 'true';
    fullscreenBtn.innerHTML = isFs
      ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 14h6m0 0v6m0-6L3 21m17-7h-6m0 0v6m0-6 7 7M4 10h6m0 0V4m0 6L3 3m17 7h-6m0 0V4m0 6 7-7"></path></svg> Exit full screen`
      : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg> Full screen`;
  };
  document.addEventListener('fullscreenchange', syncFs);
  syncFs();

  fullscreenBtn.addEventListener('click', () => {
    const isFs = Boolean(document.fullscreenElement) || element.dataset.fullscreen === 'true';
    const root = container.closest<HTMLElement>('#target') || container;
    if (isFs) {
      if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => {});
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
  });
  const zoom = document.createElement('div'); zoom.className = 'zoom';
  const zoomOut = document.createElement('button'); zoomOut.type = 'button'; zoomOut.textContent = '−'; zoomOut.setAttribute('aria-label', 'Zoom out');
  const zoomIn = document.createElement('button'); zoomIn.type = 'button'; zoomIn.textContent = '+'; zoomIn.setAttribute('aria-label', 'Zoom in');
  zoom.append(zoomOut, zoomIn); toolbarActions.append(fullscreenBtn, zoom); toolbar.append(copy, toolbarActions);
  const pages = document.createElement('div'); pages.className = 'pages';
  const loading = document.createElement('div'); loading.className = 'loading'; loading.textContent = 'Loading clickable choices…'; pages.append(loading);
  shell.append(toolbar, pages); shadow.append(style, shell); container.append(element);
  const abort = new AbortController();
  const pageElements = new Map<number, { root: HTMLElement; width: number; height: number; runs: PdfTextRun[] }>();
  const submitButtons = new Map<number, HTMLButtonElement>();
  let source: InteractivePdfDocument | undefined;
  let disposed = false;
  let zoomLevel = 1;
  let fitScale = 1;

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

  function paintZoom() {
    pages.classList.toggle('is-zoomed', zoomLevel > 1.001);
    for (const { root, width } of pageElements.values()) {
      const targetWidth = Math.round(width * fitScale * zoomLevel * 100) / 100;
      root.style.setProperty('--bq-pdf-page-width', `${targetWidth}px`);
      root.style.width = `var(--bq-pdf-page-width, ${targetWidth}px)`;
    }
  }

  function fitPagesToViewer() {
    const widestPage = Math.max(0, ...[...pageElements.values()].map(page => page.width));
    const availableWidth = Math.max(0, pages.clientWidth);
    fitScale = widestPage > 0 && availableWidth > 0
      ? availableWidth / widestPage
      : 1;
    paintZoom();
  }

  zoomOut.addEventListener('click', () => { zoomLevel = Math.max(.7, zoomLevel - .1); paintZoom(); });
  zoomIn.addEventListener('click', () => { zoomLevel = Math.min(2.0, zoomLevel + .1); paintZoom(); });
  document.defaultView?.addEventListener('resize', fitPagesToViewer);
  const ResizeObserverCtor = document.defaultView?.ResizeObserver;
  const resizeObserver = ResizeObserverCtor ? new ResizeObserverCtor(() => fitPagesToViewer()) : undefined;
  resizeObserver?.observe(pages);

  const ready = (async () => {
    try {
      source = await (options.openDocument || openPdfDocument)(new URL(options.url, document.URL).href, abort.signal);
      if (disposed || abort.signal.aborted) return false;
      const runs: PdfTextRun[] = [];
      pages.replaceChildren();
      for (let pageNumber = 1; pageNumber <= source.pageCount; pageNumber++) {
        if (abort.signal.aborted) return false;
        const root = document.createElement('article'); root.className = 'page'; root.setAttribute('aria-label', `PDF page ${pageNumber}`);
        const canvas = document.createElement('canvas'); canvas.setAttribute('aria-hidden', 'true'); root.append(canvas); pages.append(root);
        const page = await source.renderPage(pageNumber, canvas);
        root.style.aspectRatio = `${page.width} / ${page.height}`;
        pageElements.set(pageNumber, { root, width: page.width, height: page.height, runs: page.runs }); runs.push(...page.runs);
      }
      fitPagesToViewer();
      const targets = mapPdfOptionLabels(runs, options.optionMaximums);
      if (!targets.length) throw new Error('Interactive choices unavailable for this document.');
      for (const target of targets) {
        const page = pageElements.get(target.page); if (!page) continue;
        const area = hitArea(target, targets, page.runs, page.width, page.height);
        const button = document.createElement('button'); button.type = 'button'; button.className = 'option-hit';
        button.dataset.question = String(target.questionNumber); button.dataset.option = String(target.optionValue);
        button.setAttribute('aria-label', `Select option ${target.optionValue} for question ${target.questionNumber}`); button.setAttribute('aria-pressed', 'false');
        button.style.left = `${area.left}%`; button.style.top = `${area.top}%`; button.style.width = `${area.width}%`; button.style.height = `${area.height}%`;
        button.addEventListener('click', (event) => {
          event.stopPropagation();
          options.onChoose(target.questionNumber, target.optionValue);
        });
        page.root.append(button);
      }
      const pageLabel = `${source.pageCount} ${source.pageCount === 1 ? 'page' : 'pages'}`;
      const choiceLabel = `${targets.length} answer ${targets.length === 1 ? 'choice' : 'choices'}`;
      meta.textContent = `${pageLabel} · ${choiceLabel}`;
      return true;
    } catch (error) {
      if (abort.signal.aborted || disposed) return false;
      pages.replaceChildren(); const message = document.createElement('div'); message.className = 'error';
      message.textContent = error instanceof Error ? error.message : 'Interactive choices unavailable.'; pages.append(message);
      meta.textContent = 'Original PDF view'; return false;
    }
  })();

  return {
    element,
    ready,
    setSelected(questionNumber: number, optionValue: string) {
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
          const widthPct = Number.parseFloat(activeHit.style.width) || 0;
          const heightPct = Number.parseFloat(activeHit.style.height) || 0;
          btn.style.left = `calc(${Math.min(84, leftPct + widthPct)}% + 10px)`;
          btn.style.top = `calc(${topPct + heightPct / 2}% - 14px)`;
          btn.addEventListener('click', (event) => {
            event.stopPropagation();
            btn.disabled = true;
            btn.textContent = 'Submitting…';
            options.onSubmit?.(questionNumber);
          });
          activeHit.parentElement.append(btn);
          submitButtons.set(questionNumber, btn);
        }
      }
    },
    setFullscreen(active: boolean) {
      if (active) {
        element.dataset.fullscreen = 'true';
      } else {
        element.removeAttribute('data-fullscreen');
      }
      syncFs();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      document.removeEventListener('fullscreenchange', syncFs);
      document.removeEventListener('click', handleGlobalClick);
      document.removeEventListener('keydown', handleKey);
      document.defaultView?.removeEventListener('resize', fitPagesToViewer);
      resizeObserver?.disconnect();
      abort.abort();
      source?.destroy();
      for (const btn of submitButtons.values()) btn.remove();
      submitButtons.clear();
      element.remove();
    },
  };
}
