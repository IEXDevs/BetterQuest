import { findPdfAssessment, isNativeControlAvailable, isResponseOptionAvailable, readAssessmentResponses, type PdfAssessmentElements } from '../../adapters/quest/assessment';
import { createInteractivePdfViewer } from './pdf-viewer';

type PdfViewer = ReturnType<typeof createInteractivePdfViewer>;
type PdfViewerFactory = typeof createInteractivePdfViewer;

function installStyles(document: Document) {
  document.querySelectorAll('[data-betterquest="assessment-style"]').forEach(node => node.remove());
  const style = document.createElement('style'); style.dataset.betterquest = 'assessment-style';
  style.textContent = `
    #target[data-betterquest-pdf-workspace="enhanced"]{display:grid;grid-template-columns:minmax(0,1fr) minmax(300px,370px);column-gap:18px;align-items:start;max-width:none}
    #target[data-betterquest-pdf-workspace="enhanced"] > :not(#pdf-frame):not([data-betterquest="assessment-rail"]):not([data-betterquest-native-responses]){grid-column:1/-1}
    #target[data-betterquest-pdf-workspace="enhanced"] > #pdf-frame{grid-column:1;min-width:0}
    #target[data-betterquest-pdf-workspace="enhanced"] > [data-betterquest="assessment-rail"]{grid-column:2;grid-row:auto;position:sticky;top:76px;min-width:0}
    #target[data-betterquest-pdf-workspace="enhanced"] [data-betterquest-native-responses]{display:none!important}
    #target[data-betterquest-pdf-workspace="enhanced"] #presentation-pdf-frame{overflow:hidden;border:1px solid var(--bq-border,#d7e2f0);border-radius:18px;background:#fff;box-shadow:0 18px 50px #172a3b1a}
    #target[data-betterquest-pdf-workspace="enhanced"] #presentation-pdf-frame iframe{display:block;width:100%!important;height:calc(100vh - 104px)!important;min-height:680px;border:0;background:#fff;color-scheme:light}
    #target[data-betterquest-pdf-workspace="enhanced"] #presentation-pdf-frame iframe[hidden]{display:none!important}
    #target[data-betterquest-pdf-workspace="enhanced"]:fullscreen{padding:16px;overflow:auto;background:var(--bq-surface,#fff)}
    #target[data-betterquest-pdf-workspace="enhanced"]:fullscreen #presentation-pdf-frame iframe{height:calc(100vh - 32px)!important}
    #presentation-div[data-betterquest-slide="enhanced"] .bg-light{background:#f7f5ef!important;color:#18253a!important;border-radius:18px;padding:18px 24px!important}
    #presentation-div[data-betterquest-slide="enhanced"] .custom-control{margin:4px 0}
    #presentation-div[data-betterquest-slide="enhanced"] .custom-control-label{display:block!important;min-height:48px;padding:11px 15px 11px 42px!important;border:1px solid #d9d4c9;border-radius:12px;color:#18253a!important;background:#fff;cursor:pointer;transition:border-color .18s ease,box-shadow .18s ease,transform .18s ease}
    #presentation-div[data-betterquest-slide="enhanced"] .custom-control-label:hover{border-color:#bf5700;box-shadow:0 6px 18px #bf570018;transform:translateY(-1px)}
    #presentation-div[data-betterquest-slide="enhanced"] .custom-control-input:checked + .custom-control-label{border-color:#bf5700;box-shadow:0 0 0 3px #bf570024;background:#fff8f1}
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
  return match ? `${match[1]} / ${match[2]} points${match[3] ? ` · ${match[3]}%` : ''}` : 'Points update after submission';
}

function withNativeResponsesVisible<T>(elements: PdfAssessmentElements, read: () => T): T {
  const marked = elements.responseRoot.hasAttribute('data-betterquest-native-responses');
  elements.responseRoot.removeAttribute('data-betterquest-native-responses');
  try { return read(); }
  finally { if (marked) elements.responseRoot.dataset.betterquestNativeResponses = 'true'; }
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
    :host{display:block;color:var(--bq-text,#18253a);font:14px/1.4 ui-rounded,"Avenir Next",sans-serif}
    *{box-sizing:border-box}.rail{max-height:calc(100vh - 96px);overflow:auto;padding:16px;border:1px solid var(--bq-border,#d7e2f0);border-radius:18px;background:color-mix(in srgb,var(--bq-surface,#fff) 94%,transparent);box-shadow:0 18px 50px #172a3b18;scrollbar-width:thin}
    header{position:sticky;top:-16px;z-index:2;margin:-16px -16px 12px;padding:16px;background:var(--bq-surface,#fff);border-bottom:1px solid var(--bq-border,#d7e2f0)}.top{display:flex;align-items:center;justify-content:space-between;gap:12px}.actions{display:flex;gap:6px}h2{margin:0;font:750 18px/1.15 ui-rounded,"Avenir Next",sans-serif;letter-spacing:-.02em}.focus{border:1px solid var(--bq-border,#d7e2f0);border-radius:10px;background:var(--bq-raised,#eef3f6);color:var(--bq-text,#18253a);padding:7px 9px;font:700 11px/1 inherit;cursor:pointer}.focus:focus-visible,.choice:focus-visible,.submit:focus-visible{outline:2px solid var(--bq-accent,#227ab0);outline-offset:2px}
    .progress-copy,.points{margin:7px 0 0;color:var(--bq-muted,#748491);font-size:12px}.meter{height:6px;margin-top:10px;overflow:hidden;border-radius:999px;background:var(--bq-raised,#eef3f6)}.meter span{display:block;height:100%;width:var(--progress);border-radius:inherit;background:linear-gradient(90deg,#bf5700,#e5a04c);transition:width .25s ease}
    .questions{display:grid;gap:10px}.question{display:grid;grid-template-columns:minmax(0,1fr) auto;column-gap:9px;padding:12px;border:1px solid var(--bq-border,#d7e2f0);border-radius:14px;background:var(--bq-surface,#fff)}.question-top{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;gap:8px}.number{font-weight:800}.selected{color:var(--bq-muted,#748491);font-size:11px}.choices{display:flex;flex-wrap:wrap;gap:7px;margin-top:9px}.choice{width:34px;height:34px;border:1px solid var(--bq-border,#d7e2f0);border-radius:10px;background:var(--bq-raised,#f2f5f7);color:var(--bq-text,#18253a);font:750 12px/1 inherit;cursor:pointer;transition:transform .16s ease,border-color .16s ease,background .16s ease}.choice:hover{transform:translateY(-1px);border-color:var(--bq-accent,#227ab0)}.choice[aria-pressed="true"]{border-color:#bf5700;background:#bf5700;color:#fff;box-shadow:0 5px 13px #bf570033}.submit{align-self:end;margin-top:9px;border:0;border-radius:10px;background:#bf5700;color:#fff;padding:10px 11px;font:750 11px/1 inherit;cursor:pointer}.submit[hidden]{display:none}.empty{color:var(--bq-muted,#748491)}
    @media(prefers-reduced-motion:reduce){.meter span,.choice{transition:none}.choice:hover{transform:none}}
  `;
  const rail = document.createElement('section'); rail.className = 'rail'; rail.setAttribute('aria-label', 'Assessment responses');
  const header = document.createElement('header'); const top = document.createElement('div'); top.className = 'top';
  const title = document.createElement('h2'); title.textContent = 'Response desk';
  const focus = document.createElement('button'); focus.type = 'button'; focus.className = 'focus'; focus.textContent = 'Full screen';
  const actions = document.createElement('div'); actions.className = 'actions';
  const viewToggle = document.createElement('button'); viewToggle.type = 'button'; viewToggle.className = 'focus'; viewToggle.textContent = 'Original PDF'; viewToggle.hidden = true;
  const progress = document.createElement('p'); progress.className = 'progress-copy';
  const points = document.createElement('p'); points.className = 'points';
  const meter = document.createElement('div'); meter.className = 'meter'; const meterValue = document.createElement('span'); meter.append(meterValue);
  const questions = document.createElement('div'); questions.className = 'questions';
  actions.append(viewToggle, focus); top.append(title, actions); header.append(top, progress, points, meter); rail.append(header, questions); shadow.append(localStyle, rail);
  let disposed = false;
  let pdfViewer: PdfViewer | undefined;
  let pdfViewerStarted = false;
  let interactiveActive = false;
  let originalIframeHidden: boolean | undefined;
  const viewerFactory = options.createPdfViewer || (typeof chrome !== 'undefined' ? createInteractivePdfViewer : undefined);

  focus.addEventListener('click', () => {
    const elements = findPdfAssessment(document); if (!elements) return;
    if (document.fullscreenElement) void document.exitFullscreen?.(); else void elements.root.requestFullscreen?.();
  });

  function showInteractive(active: boolean) {
    if (!pdfViewer) return;
    const elements = findPdfAssessment(document); if (!elements) return;
    if (originalIframeHidden === undefined) originalIframeHidden = elements.iframe.hidden;
    interactiveActive = active;
    pdfViewer.element.hidden = !active;
    elements.iframe.hidden = active ? true : originalIframeHidden;
    viewToggle.hidden = false; viewToggle.textContent = active ? 'Original PDF' : 'Interactive PDF';
  }
  viewToggle.addEventListener('click', () => showInteractive(!interactiveActive));

  function paintSummary(bindings: ReturnType<typeof readAssessmentResponses>, tally: HTMLElement | null) {
    const submitted = bindings.filter(binding => binding.attempts > 0).length;
    const percent = bindings.length ? Math.round(submitted / bindings.length * 100) : 0;
    progress.textContent = `${submitted} of ${bindings.length} submitted · ${Math.max(0, bindings.length - submitted)} left · ${percent}%`;
    points.textContent = pointsSummary(tally?.textContent || '');
    meterValue.style.setProperty('--progress', `${bindings.length ? submitted / bindings.length * 100 : 0}%`);
  }

  function chooseNative(questionNumber: number, optionValue: number): boolean {
    const elements = findPdfAssessment(document); if (!elements) return false;
    const bindings = withNativeResponsesVisible(elements, () => readAssessmentResponses(elements.table));
    const binding = bindings.find(item => Number(item.number) === questionNumber);
    const nativeOption = binding ? [...binding.select.options].find(item => item.value === String(optionValue)) : undefined;
    const available = binding && withNativeResponsesVisible(elements, () => isNativeControlAvailable(binding.select));
    if (!binding || !available || !nativeOption || !isResponseOptionAvailable(nativeOption)) return false;
    binding.select.value = nativeOption.value;
    binding.select.dispatchEvent(new document.defaultView!.Event('input', { bubbles: true }));
    binding.select.dispatchEvent(new document.defaultView!.Event('change', { bubbles: true }));
    pdfViewer?.setSelected(questionNumber, nativeOption.value);
    const card = [...questions.querySelectorAll<HTMLElement>('[data-question-id]')].find(item => item.dataset.questionId === binding.id);
    if (card) {
      for (const button of card.querySelectorAll<HTMLButtonElement>('.choice')) button.setAttribute('aria-pressed', String(button.dataset.value === nativeOption.value));
      const selected = card.querySelector<HTMLElement>('.selected'); if (selected) selected.textContent = `Answer ${nativeOption.value} selected`;
      const submit = card.querySelector<HTMLButtonElement>('.submit');
      if (submit) submit.hidden = !withNativeResponsesVisible(elements, () => isNativeControlAvailable(binding.submit));
    }
    paintSummary(bindings, elements.tally);
    return true;
  }

  function ensurePdfViewer(elements: PdfAssessmentElements, bindings: ReturnType<typeof readAssessmentResponses>) {
    if (!viewerFactory || pdfViewerStarted || !bindings.length) return;
    const optionMaximums = new Map<number, number>();
    for (const binding of bindings) {
      const questionNumber = Number(binding.number);
      const maximum = Math.max(...binding.options.map(option => Number(option.value)).filter(Number.isInteger));
      if (Number.isInteger(questionNumber) && questionNumber > 0 && maximum > 0 && maximum <= 9) optionMaximums.set(questionNumber, maximum);
    }
    if (!optionMaximums.size) return;
    pdfViewerStarted = true; originalIframeHidden = elements.iframe.hidden;
    pdfViewer = viewerFactory(elements.pdfFrame, {
      url: elements.iframe.src,
      optionMaximums,
      onChoose: (questionNumber, optionValue) => { chooseNative(questionNumber, optionValue); },
    });
    pdfViewer.element.hidden = true;
    void pdfViewer.ready.then(ready => {
      if (disposed || !pdfViewer) return;
      if (ready) showInteractive(true);
      else { pdfViewer.dispose(); pdfViewer = undefined; }
    });
  }

  function render() {
    if (disposed) return;
    const elements = findPdfAssessment(document); if (!elements || elements.root !== root) { host.remove(); return; }
    root.dataset.betterquestPdfWorkspace = 'enhanced';
    if (host.previousElementSibling !== elements.pdfFrame) elements.pdfFrame.after(host);
    const bindings = withNativeResponsesVisible(elements, () => readAssessmentResponses(elements.table));
    elements.responseRoot.dataset.betterquestNativeResponses = 'true'; paintSummary(bindings, elements.tally);
    ensurePdfViewer(elements, bindings);
    questions.replaceChildren();
    for (const binding of bindings) {
      const card = document.createElement('article'); card.className = 'question'; card.dataset.questionId = binding.id;
      const cardTop = document.createElement('div'); cardTop.className = 'question-top';
      const number = document.createElement('span'); number.className = 'number'; number.textContent = `Question ${binding.number}`;
      const selected = document.createElement('span'); selected.className = 'selected'; selected.textContent = binding.select.value ? `Answer ${binding.select.value} selected` : 'Not answered';
      const choices = document.createElement('div'); choices.className = 'choices'; choices.setAttribute('role', 'group'); choices.setAttribute('aria-label', `Question ${binding.number} response`);
      for (const option of binding.options) {
        const choice = document.createElement('button'); choice.type = 'button'; choice.className = 'choice'; choice.dataset.value = option.value; choice.textContent = option.label;
        choice.setAttribute('aria-label', `Choose response ${option.label} for question ${binding.number}`); choice.setAttribute('aria-pressed', String(binding.select.value === option.value));
        choice.addEventListener('click', () => {
          chooseNative(Number(binding.number), Number(option.value));
        });
        choices.append(choice);
      }
      const submit = document.createElement('button'); submit.type = 'button'; submit.className = 'submit'; submit.textContent = `Submit question ${binding.number}`; submit.hidden = !binding.select.value;
      submit.addEventListener('click', () => {
        const selectedOption = binding.select.selectedOptions[0];
        const available = withNativeResponsesVisible(elements, () => isNativeControlAvailable(binding.select) && isNativeControlAvailable(binding.submit));
        if (available && selectedOption && isResponseOptionAvailable(selectedOption)) binding.submit.click();
      });
      cardTop.append(number, selected); card.append(cardTop, choices, submit); questions.append(card);
      if (binding.select.value) pdfViewer?.setSelected(Number(binding.number), binding.select.value);
    }
    if (!bindings.length) { const empty = document.createElement('p'); empty.className = 'empty'; empty.textContent = 'Responses are still loading.'; questions.append(empty); }
  }

  return { reconcile: render, dispose() {
    disposed = true; const elements = findPdfAssessment(document); root.removeAttribute('data-betterquest-pdf-workspace'); elements?.responseRoot.removeAttribute('data-betterquest-native-responses');
    if (elements && originalIframeHidden !== undefined) elements.iframe.hidden = originalIframeHidden;
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
  const paint = () => {
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
    for (const item of submits) { item.group?.removeAttribute('data-betterquest-question-ready'); item.button.hidden = item.hidden; } style.remove();
  } };
}
