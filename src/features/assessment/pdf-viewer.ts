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

interface InteractivePdfOptions {
  url: string;
  optionMaximums: ReadonlyMap<number, number>;
  onChoose: (questionNumber: number, optionValue: number) => void;
  openDocument?: OpenInteractivePdf;
}

function extensionUrl(path: string): string {
  return typeof chrome !== 'undefined' && chrome.runtime?.getURL ? chrome.runtime.getURL(path) : path;
}

async function openPdfDocument(url: string, signal: AbortSignal): Promise<InteractivePdfDocument> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = extensionUrl('pdf.worker.min.mjs');
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

function hitArea(target: PdfOptionTarget, targets: PdfOptionTarget[], pageWidth: number, pageHeight: number) {
  const left = Math.max(0, target.left - Math.max(8, target.height * .8));
  const sameColumn = targets.find(item => item.questionNumber === target.questionNumber && item.page === target.page &&
    item.optionValue === target.optionValue + 1 && item.top > target.top && Math.abs(item.left - target.left) < pageWidth * .12);
  const top = Math.max(0, target.top - target.height * .75);
  const bottom = sameColumn ? (target.top + sameColumn.top) / 2 : Math.min(pageHeight, target.top + Math.max(38, target.height * 3.2));
  const columnRight = target.left < pageWidth / 2 ? pageWidth / 2 - 10 : pageWidth - 12;
  return {
    left: left / pageWidth * 100,
    top: top / pageHeight * 100,
    width: Math.max(24, columnRight - left) / pageWidth * 100,
    height: Math.max(24, bottom - top) / pageHeight * 100,
  };
}

export function createInteractivePdfViewer(container: HTMLElement, options: InteractivePdfOptions) {
  const document = container.ownerDocument;
  const element = document.createElement('section'); element.dataset.betterquest = 'interactive-pdf';
  element.setAttribute('aria-label', 'Interactive assignment PDF');
  const shadow = element.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = `
    :host{display:block;height:calc(100vh - 104px);min-height:680px;background:#dfe4ea;color:#162538;font:13px/1.4 ui-rounded,"Avenir Next",sans-serif}
    *{box-sizing:border-box}.shell{display:grid;grid-template-rows:auto 1fr;height:100%}.toolbar{position:sticky;top:0;z-index:5;display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:48px;padding:8px 12px;background:#1f2935;color:#f5f8fb;box-shadow:0 3px 12px #08111c38}.title{font-weight:750}.meta{color:#bec9d4;font-size:11px}.zoom{display:flex;align-items:center;gap:6px}.zoom button{width:32px;height:32px;border:1px solid #ffffff24;border-radius:9px;background:#ffffff12;color:#fff;font:800 16px/1 inherit;cursor:pointer}.zoom button:focus-visible,.option-hit:focus-visible{outline:3px solid #5aa9df;outline-offset:2px}
    .pages{overflow:auto;padding:18px;scrollbar-width:thin}.page{position:relative;margin:0 auto 18px;background:#fff;box-shadow:0 8px 30px #172a3b2e;transform-origin:top center}.page canvas{display:block;width:100%!important;height:auto!important}.option-hit{position:absolute;z-index:2;border:1px solid transparent;border-radius:8px;background:transparent;color:transparent;cursor:pointer;transition:background .15s ease,border-color .15s ease,box-shadow .15s ease}.option-hit::before{content:attr(data-option);position:absolute;left:2px;top:50%;display:grid;place-items:center;width:22px;height:22px;border-radius:7px;background:#227ab0e6;color:#fff;font:800 11px/1 inherit;transform:translateY(-50%);opacity:0;transition:opacity .15s ease}.option-hit:hover{border-color:#227ab0;background:#5aa9df17;box-shadow:0 0 0 2px #227ab024}.option-hit:hover::before,.option-hit:focus-visible::before,.option-hit[aria-pressed="true"]::before{opacity:1}.option-hit[aria-pressed="true"]{border-color:#bf5700;background:#bf570018;box-shadow:0 0 0 2px #bf57002b}.option-hit[aria-pressed="true"]::before{background:#bf5700}.loading,.error{display:grid;place-items:center;min-height:280px;padding:28px;text-align:center}.error{color:#8f3029}
    @media(prefers-reduced-motion:reduce){.option-hit,.option-hit::before{transition:none}}
  `;
  const shell = document.createElement('div'); shell.className = 'shell';
  const toolbar = document.createElement('div'); toolbar.className = 'toolbar';
  const copy = document.createElement('div'); const title = document.createElement('div'); title.className = 'title'; title.textContent = 'Interactive PDF';
  const meta = document.createElement('div'); meta.className = 'meta'; meta.textContent = 'Finding response labels…'; copy.append(title, meta);
  const zoom = document.createElement('div'); zoom.className = 'zoom';
  const zoomOut = document.createElement('button'); zoomOut.type = 'button'; zoomOut.textContent = '−'; zoomOut.setAttribute('aria-label', 'Zoom out');
  const zoomIn = document.createElement('button'); zoomIn.type = 'button'; zoomIn.textContent = '+'; zoomIn.setAttribute('aria-label', 'Zoom in');
  zoom.append(zoomOut, zoomIn); toolbar.append(copy, zoom);
  const pages = document.createElement('div'); pages.className = 'pages';
  const loading = document.createElement('div'); loading.className = 'loading'; loading.textContent = 'Preparing clickable response choices…'; pages.append(loading);
  shell.append(toolbar, pages); shadow.append(style, shell); container.append(element);
  const abort = new AbortController();
  const pageElements = new Map<number, { root: HTMLElement; width: number; height: number }>();
  let source: InteractivePdfDocument | undefined;
  let disposed = false;
  let zoomLevel = 1;

  function paintZoom() {
    for (const { root, width } of pageElements.values()) root.style.width = `${width * zoomLevel}px`;
  }
  zoomOut.addEventListener('click', () => { zoomLevel = Math.max(.7, zoomLevel - .1); paintZoom(); });
  zoomIn.addEventListener('click', () => { zoomLevel = Math.min(1.8, zoomLevel + .1); paintZoom(); });

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
        root.style.width = `${page.width}px`; root.style.aspectRatio = `${page.width} / ${page.height}`;
        pageElements.set(pageNumber, { root, width: page.width, height: page.height }); runs.push(...page.runs);
      }
      const targets = mapPdfOptionLabels(runs, options.optionMaximums);
      if (!targets.length) throw new Error('No verified question/option sequence was found in this PDF.');
      for (const target of targets) {
        const page = pageElements.get(target.page); if (!page) continue;
        const area = hitArea(target, targets, page.width, page.height);
        const button = document.createElement('button'); button.type = 'button'; button.className = 'option-hit';
        button.dataset.question = String(target.questionNumber); button.dataset.option = String(target.optionValue);
        button.setAttribute('aria-label', `Select option ${target.optionValue} for question ${target.questionNumber}`); button.setAttribute('aria-pressed', 'false');
        button.style.left = `${area.left}%`; button.style.top = `${area.top}%`; button.style.width = `${area.width}%`; button.style.height = `${area.height}%`;
        button.addEventListener('click', () => options.onChoose(target.questionNumber, target.optionValue)); page.root.append(button);
      }
      meta.textContent = `${source.pageCount} pages · ${targets.length} verified choices`;
      return true;
    } catch (error) {
      if (abort.signal.aborted || disposed) return false;
      pages.replaceChildren(); const message = document.createElement('div'); message.className = 'error';
      message.textContent = error instanceof Error ? error.message : 'Interactive PDF unavailable.'; pages.append(message);
      meta.textContent = 'Original PDF retained'; return false;
    }
  })();

  return {
    element,
    ready,
    setSelected(questionNumber: number, optionValue: string) {
      for (const button of shadow.querySelectorAll<HTMLButtonElement>(`.option-hit[data-question="${questionNumber}"]`)) {
        button.setAttribute('aria-pressed', String(button.dataset.option === optionValue));
      }
    },
    dispose() { if (disposed) return; disposed = true; abort.abort(); source?.destroy(); element.remove(); },
  };
}
