export interface AssessmentResponseBinding {
  id: string;
  number: string;
  select: HTMLSelectElement;
  submit: HTMLButtonElement;
  options: { value: string; label: string }[];
  attempts: number;
}

export interface PdfAssessmentElements {
  root: HTMLElement;
  pdfFrame: HTMLElement;
  iframe: HTMLIFrameElement;
  responseRoot: HTMLElement;
  table: HTMLTableElement;
  tally: HTMLElement | null;
}

export interface PdfTextRun {
  text: string;
  page: number;
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface PdfOptionTarget extends PdfTextRun {
  questionNumber: number;
  optionValue: number;
}

const clean = (value: string | null | undefined) => (value || '').replace(/\s+/g, ' ').trim();

export function parseQuestionBoundary(text: string): number | null {
  const cleaned = clean(text);
  if (!cleaned) return null;

  // 1. Exactly 3 digits: "001", "002", etc.
  if (/^\d{3}$/.test(cleaned)) {
    return Number(cleaned);
  }

  // 2. Three digits followed by delimiter or header text:
  // e.g. "002 10.0 points", "002 (part 1 of 2)", "002: 10.0 pts", "002.", "002 - "
  const threeDigitHeader = cleaned.match(/^(\d{3})(?:[:.\-–—]|\s+(?:[-+]?\d|\(part|points|pts|version)|\s*\(part)/i);
  if (threeDigitHeader) {
    return Number(threeDigitHeader[1]);
  }

  // 3. Question / Problem word: "Question 1", "Question 001", "Problem 2", "Prob. 3"
  const questionWord = cleaned.match(/^(?:question|problem|prob\.?)\s+0*([1-9]\d{0,2})\b/i);
  if (questionWord) {
    return Number(questionWord[1]);
  }

  // 4. Any question number 1-999 followed by points or part:
  // e.g. "2 10.0 points", "2: 10.0 pts", "2 (part 1 of 2)"
  const pointsHeader = cleaned.match(/^0*([1-9]\d{0,2})\s*(?:[:.]|\(part\s*\d+\s*of\s*\d+\))?\s+[-+]?\d+(?:\.\d+)?\s*(?:points|pts)\b/i);
  if (pointsHeader) {
    return Number(pointsHeader[1]);
  }
  const partHeader = cleaned.match(/^0*([1-9]\d{0,2})\s*\(part\s*\d+\s*of\s*\d+\)/i);
  if (partHeader) {
    return Number(partHeader[1]);
  }

  return null;
}

/**
 * Quest PDFs delimit questions with zero-padded three-digit markers or headers.
 * Within each boundary, accept valid choice sequences 1..N.
 */
export function mapPdfOptionLabels(runs: PdfTextRun[], optionMaximums: ReadonlyMap<number, number>): PdfOptionTarget[] {
  const targets: PdfOptionTarget[] = [];
  let questionNumber: number | null = null;
  let expected = 1;
  let pending: PdfOptionTarget[] = [];
  let completed = false;

  const positiveMaxes = [...optionMaximums.values()].filter(v => v >= 1 && v <= 9);
  const globalFallback = positiveMaxes.length ? Math.max(...positiveMaxes) : 5;

  const commitPending = () => {
    if (questionNumber === null) return;
    const hasExplicit = optionMaximums.has(questionNumber);
    const max = optionMaximums.get(questionNumber);
    if (hasExplicit && max !== undefined) {
      if (pending.length === max) {
        targets.push(...pending);
        completed = true;
      }
    } else {
      if (pending.length >= 2) {
        targets.push(...pending);
        completed = true;
      }
    }
    pending = [];
  };

  for (const run of runs) {
    const text = clean(run.text);
    const boundary = parseQuestionBoundary(text);
    if (boundary !== null) {
      if (!completed && pending.length > 0) {
        commitPending();
      }
      questionNumber = boundary;
      expected = 1;
      pending = [];
      completed = false;
      continue;
    }

    if (questionNumber === null || completed) continue;

    const hasExplicit = optionMaximums.has(questionNumber);
    const maximum = hasExplicit ? optionMaximums.get(questionNumber)! : globalFallback;
    if (maximum < 1 || maximum > 9) continue;

    const option = text.match(/^([1-9])\.(?!\d)/) || text.match(/^\(([1-9])\)/) || text.match(/^([1-9])\)(?!\d)/);
    if (!option) continue;
    const value = Number(option[1]);
    if (value > maximum) continue;

    if (value === 1) {
      pending = [{ ...run, questionNumber, optionValue: 1 }];
      expected = 2;
    } else if (pending.length && value === expected) {
      pending.push({ ...run, questionNumber, optionValue: value });
      expected++;
    }

    if (pending.length === maximum) {
      targets.push(...pending);
      pending = [];
      completed = true;
    }
  }

  if (!completed && pending.length > 0) {
    commitPending();
  }

  return targets;
}

export function isElementVisible(control: HTMLElement): boolean {
  if (!control.isConnected) return false;
  const inputEl = control as HTMLSelectElement | HTMLButtonElement | HTMLInputElement;
  if (inputEl.hidden || control.getAttribute('aria-hidden') === 'true') return false;
  for (let node: HTMLElement | null = control; node; node = node.parentElement) {
    if (node.hasAttribute('data-betterquest-native-responses') || node.id === 'view-responses-table-id') {
      continue;
    }
    const style = node.ownerDocument.defaultView?.getComputedStyle(node);
    if (node.hidden || node.inert || node.getAttribute('aria-hidden') === 'true' ||
        style?.display === 'none' || style?.visibility === 'hidden' || style?.visibility === 'collapse') {
      return false;
    }
  }
  return true;
}

export function isNativeControlAvailable(control: HTMLElement): boolean {
  if (!control.isConnected) return false;
  const inputEl = control as HTMLSelectElement | HTMLButtonElement | HTMLInputElement;
  if (inputEl.disabled || inputEl.hidden || control.getAttribute('aria-disabled') === 'true') return false;
  for (let node: HTMLElement | null = control; node; node = node.parentElement) {
    if (node.hasAttribute('data-betterquest-native-responses') || node.id === 'view-responses-table-id') {
      continue;
    }
    const style = node.ownerDocument.defaultView?.getComputedStyle(node);
    if (node.hidden || node.inert || node.getAttribute('aria-hidden') === 'true' || style?.display === 'none' || style?.visibility === 'hidden' || style?.visibility === 'collapse') return false;
  }
  return true;
}

export function isResponseOptionAvailable(option: HTMLOptionElement): boolean {
  return Boolean(option.value && !option.disabled && !option.hidden && !option.closest('optgroup[disabled]'));
}

export interface AssessmentMetrics {
  score: string;
  classAverage: string;
  standardDeviation: string;
}

export function readAssessmentMetrics(document: Document, root: HTMLElement, tally: HTMLElement | null): AssessmentMetrics {
  const tallyText = clean(tally?.textContent);
  const rootText = clean(root.textContent);
  const fullText = clean(document.body?.textContent);

  // 1. Points / Score
  let score = 'Not available';
  const scoreMatch = tallyText.match(/([-+]?\d+(?:\.\d+)?\s+out of\s+[-+]?\d+(?:\.\d+)?\s+points(?:\s*\([-+]?\d+(?:\.\d+)?%\))?)/i) ||
    rootText.match(/([-+]?\d+(?:\.\d+)?\s+out of\s+[-+]?\d+(?:\.\d+)?\s+points(?:\s*\([-+]?\d+(?:\.\d+)?%\))?)/i);
  if (scoreMatch) {
    score = scoreMatch[1];
  } else if (tallyText) {
    score = tallyText;
  }

  // 2. Class Average
  let classAverage = 'Not available';
  const avgEl = [...document.querySelectorAll('td, th, p, span, div')].find(el => clean(el.textContent).match(/^Class\s*Average:?$/i));
  if (avgEl?.nextElementSibling && clean(avgEl.nextElementSibling.textContent)) {
    classAverage = clean(avgEl.nextElementSibling.textContent);
  } else {
    const avgMatch = fullText.match(/Class\s*Average[:\s]+([-+]?\d+(?:\.\d+)?\s*(?:points)?(?:\s*\/\s*[-+]?\d+(?:\.\d+)?%)?|[-+]?\d+(?:\.\d+)?%)/i);
    if (avgMatch) {
      classAverage = avgMatch[1];
    }
  }

  // 3. Standard Deviation
  let standardDeviation = 'Not available';
  const sdEl = [...document.querySelectorAll('td, th, p, span, div')].find(el => clean(el.textContent).match(/^Standard\s*Deviation:?$/i));
  if (sdEl?.nextElementSibling && clean(sdEl.nextElementSibling.textContent)) {
    standardDeviation = clean(sdEl.nextElementSibling.textContent);
  } else {
    const sdMatch = fullText.match(/Standard\s*Deviation[:\s]+([-+]?\d+(?:\.\d+)?)/i);
    if (sdMatch) {
      standardDeviation = sdMatch[1];
    }
  }

  return { score, classAverage, standardDeviation };
}

export function findPdfAssessment(document: Document): PdfAssessmentElements | null {
  const root = document.querySelector<HTMLElement>('#target') ||
    document.querySelector<HTMLElement>('#main-content #target') ||
    document.querySelector<HTMLElement>('#main-content');
  if (!root) return null;

  const table = root.querySelector<HTMLTableElement>('table[id^="instance-table-courseuserassignment_"]') ||
    document.querySelector<HTMLTableElement>('table[id^="instance-table-courseuserassignment_"]');
  const responseRoot = root.querySelector<HTMLElement>(':scope > #view-responses-table-id, #view-responses-table-id') ||
    table?.closest<HTMLElement>('#view-responses-table-id') ||
    table?.parentElement;
  if (!responseRoot || !table) return null;

  let pdfFrame = root.querySelector<HTMLElement>(':scope > #pdf-frame, #pdf-frame');
  let iframe = pdfFrame?.querySelector<HTMLIFrameElement>('#presentation-pdf-frame iframe, iframe[title="Assignment PDF"], iframe');

  if (!pdfFrame || !iframe) {
    const anchors = [
      ...root.querySelectorAll<HTMLAnchorElement>('a[href]'),
      ...document.querySelectorAll<HTMLAnchorElement>('#main-content a[href], a[href]'),
    ];
    const pdfLink = anchors.find(a => {
      const href = a.getAttribute('href') || '';
      const text = clean(a.textContent);
      return /images\/(problem|download|solution)_pdf/i.test(href) ||
        (/\.pdf(\?|$)/i.test(href)) ||
        (/\bPDF\b/i.test(text) && /images\//i.test(href));
    });

    if (!pdfLink) return null;

    if (!pdfFrame) {
      pdfFrame = document.createElement('div');
      pdfFrame.id = 'pdf-frame';
      pdfFrame.dataset.betterquestSynthesized = 'true';
      root.prepend(pdfFrame);
    } else if (pdfFrame.parentElement !== root) {
      root.prepend(pdfFrame);
    }

    if (!iframe) {
      let pres = pdfFrame.querySelector<HTMLElement>('#presentation-pdf-frame');
      if (!pres) {
        pres = document.createElement('div');
        pres.id = 'presentation-pdf-frame';
        pdfFrame.append(pres);
      }
      iframe = document.createElement('iframe');
      iframe.title = 'Assignment PDF';
      iframe.src = pdfLink.href;
      pres.append(iframe);
    }
  } else if (pdfFrame.parentElement !== root) {
    root.prepend(pdfFrame);
  }

  return { root, pdfFrame, iframe, responseRoot, table, tally: root.querySelector<HTMLElement>(':scope > #tally-div, #tally-div') };
}

export function readAssessmentResponses(table: HTMLTableElement): AssessmentResponseBinding[] {
  const rows: AssessmentResponseBinding[] = [];
  const trElements = table.querySelectorAll<HTMLTableRowElement>('tbody > tr, :scope > tr');

  for (const row of trElements) {
    if (row.closest('thead')) continue;
    const id = row.dataset.id || row.id?.replace(/^row-/, '') || row.querySelector<HTMLInputElement>('input[name="instanceitempart"]')?.value || String(rows.length + 1);
    const cells = row.querySelectorAll(':scope > td, :scope > th');
    if (!id || cells.length < 2) continue;

    if (!isElementVisible(row)) continue;

    const select = row.querySelector<HTMLSelectElement>('select[name="response"], select[aria-label="Select your response"], select');
    const submit = row.querySelector<HTMLButtonElement>('button[aria-label="Submit response"], button[type="submit"], input[type="submit"], button, input[value*="Submit" i]') ||
      table.querySelector<HTMLButtonElement>('button[type="submit"], input[type="submit"]');

    if (select && submit && isNativeControlAvailable(select) && isElementVisible(submit)) {
      const options = [...select.options]
        .filter(isResponseOptionAvailable)
        .map(option => ({ value: option.value, label: clean(option.textContent) || option.value }));
      if (options.length > 0) {
        const attempts = Number(row.querySelector('.previous')?.textContent?.match(/\d+/)?.[0] || 0);
        rows.push({ id, number: clean(cells[0]?.textContent).replace(/\.$/, '') || String(rows.length + 1), select, submit, options, attempts });
        continue;
      }
    }

    // Completed, answered, or non-active-select row:
    const answerText = clean(cells[1]?.textContent);
    const answerMatch = answerText.match(/^([1-9])\b/) || answerText.match(/\b([1-9])\b/);
    const val = answerMatch ? answerMatch[1] : '';

    const triesMatch = row.querySelector('.previous')?.textContent?.match(/\d+\s*\/\s*(\d+)/);
    const maxTries = triesMatch ? Number(triesMatch[1]) : 0;
    const attempts = Number(row.querySelector('.previous')?.textContent?.match(/\d+/)?.[0] || (val ? 1 : 0));

    // If there is no answer and no attempts recorded, and native controls are not available, ignore incomplete/hidden row
    if (!val && attempts === 0 && (!submit || !isElementVisible(submit))) {
      continue;
    }

    let options: { value: string; label: string }[] = [];
    if (select) {
      options = [...select.options]
        .map(opt => ({ value: opt.value, label: clean(opt.textContent) || opt.value }))
        .filter(opt => opt.value);
    }
    if (!options.length) {
      const maxVal = val ? Number(val) : 1;
      const optionCount = Math.max(maxVal, maxTries, 5);
      options = Array.from({ length: optionCount }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }));
    }

    const syntheticSelect = select || row.ownerDocument.createElement('select');
    if (!select) {
      syntheticSelect.disabled = true;
      for (const optItem of options) {
        const opt = row.ownerDocument.createElement('option');
        opt.value = optItem.value;
        opt.textContent = optItem.label;
        if (optItem.value === val) opt.selected = true;
        syntheticSelect.append(opt);
      }
      if (val) syntheticSelect.value = val;
    }

    const syntheticSubmit = submit || row.ownerDocument.createElement('button');
    if (!submit) {
      syntheticSubmit.disabled = true;
      syntheticSubmit.hidden = true;
    }

    rows.push({
      id,
      number: clean(cells[0]?.textContent).replace(/\.$/, '') || String(rows.length + 1),
      select: syntheticSelect,
      submit: syntheticSubmit,
      options,
      attempts,
    });
  }
  return rows;
}

export function findSlideAssessment(document: Document): HTMLElement | null {
  const presentation = document.querySelector<HTMLElement>('#target > #presentation-div');
  return presentation?.querySelector('input[type="radio"][name^="response_"]') && presentation.querySelector('.submit-btn') ? presentation : null;
}
