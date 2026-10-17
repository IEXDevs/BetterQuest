export interface AssessmentResponseBinding {
  id: string;
  number: string;
  select: HTMLSelectElement;
  submit: HTMLButtonElement;
  options: { value: string; label: string }[];
  attempts: number;
  answered: boolean;
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

export const clean = (value: string | null | undefined) => (value || '').replace(/\s+/g, ' ').trim();

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
 * Points possible per question from headers like "8. CalC3i08s 10 pts
 * possible". First match wins per question; option text mentioning points is
 * ignored because headers carry the number up front.
 */
export function extractQuestionPoints(runs: PdfTextRun[]): Map<number, number> {
  const points = new Map<number, number>();
  let current: number | null = null;
  let buffer = '';
  const flush = () => {
    if (current !== null && !points.has(current)) {
      const match = buffer.match(/(\d+(?:\.\d+)?)\s*(?:points|pts)\b/i);
      if (match) points.set(current, Number(match[1]));
    }
    buffer = '';
  };
  for (const run of runs) {
    const text = clean(run.text);
    const boundary = parseQuestionBoundary(text);
    if (boundary !== null) {
      flush();
      current = boundary;
      continue;
    }
    // Headers the boundary parser skips, e.g. "8. CalC3i08s 10 pts possible".
    const header = text.match(/^0*([1-9]\d{0,2})[.)]?\s[\s\S]{0,40}?(\d+(?:\.\d+)?)\s*(?:points|pts)\b/i);
    if (header) {
      flush();
      current = Number(header[1]);
      if (!points.has(current)) points.set(current, Number(header[2]));
      continue;
    }
    if (current === null) continue;
    if (buffer.length < 200) buffer += ' ' + text;
  }
  flush();
  return points;
}

/**
 * Quest PDFs delimit questions with zero-padded three-digit markers or headers.
 * Within each boundary, accept valid choice sequences 1..N.
 * Numeric sequences always take precedence over letter sequences (e.g. A, B statements).
 */
export function mapPdfOptionLabels(runs: PdfTextRun[], optionMaximums: ReadonlyMap<number, number>): PdfOptionTarget[] {
  const targets: PdfOptionTarget[] = [];
  const positiveMaxes = [...optionMaximums.values()].filter(v => v >= 1 && v <= 9);
  const globalFallback = positiveMaxes.length ? Math.max(...positiveMaxes) : 5;

  interface QuestionBlock {
    qNum: number;
    runs: PdfTextRun[];
  }

  const blocks: QuestionBlock[] = [];
  let currentBlock: QuestionBlock | null = null;

  for (const run of runs) {
    const text = clean(run.text);
    const boundary = parseQuestionBoundary(text);
    if (boundary !== null) {
      if (currentBlock) blocks.push(currentBlock);
      currentBlock = { qNum: boundary, runs: [] };
      continue;
    }
    if (currentBlock) {
      currentBlock.runs.push(run);
    }
  }
  if (currentBlock) blocks.push(currentBlock);

  for (const block of blocks) {
    const qNum = block.qNum;
    if (!optionMaximums.has(qNum)) continue;

    const maximum = optionMaximums.get(qNum) ?? globalFallback;
    if (maximum < 1 || maximum > 9) continue;

    const parseSequences = (isLetter: boolean): PdfOptionTarget[][] => {
      const seqs: PdfOptionTarget[][] = [];
      let currentSeq: PdfOptionTarget[] = [];
      let expected = 1;

      for (const run of block.runs) {
        const text = clean(run.text);
        let value: number | null = null;

        if (!isLetter) {
          const numMatch = text.match(/^([1-9])\.(?!\d)/) ||
                           text.match(/^\(([1-9])\)/) ||
                           text.match(/^([1-9])\)(?!\d)/) ||
                           text.match(/^([1-9]):(?!\d)/) ||
                           text.match(/^([1-9])\s*[-–—]/);
          if (numMatch) value = Number(numMatch[1]);
        } else {
          const letterMatch = text.match(/^([a-iA-I])\.(?!\w)/) ||
                              text.match(/^\(([a-iA-I])\)/) ||
                              text.match(/^([a-iA-I])\)(?!\w)/) ||
                              text.match(/^([a-iA-I]):(?!\w)/) ||
                              text.match(/^([a-iA-I])\s*[-–—]/);
          if (letterMatch) value = letterMatch[1].toUpperCase().charCodeAt(0) - 64;
        }

        if (value === null) continue;

        if (value === 1) {
          if (currentSeq.length) seqs.push(currentSeq);
          currentSeq = [{ ...run, questionNumber: qNum, optionValue: 1 }];
          expected = 2;
        } else if (currentSeq.length && value === expected) {
          currentSeq.push({ ...run, questionNumber: qNum, optionValue: value });
          expected++;
        } else {
          if (currentSeq.length) seqs.push(currentSeq);
          currentSeq = [];
          expected = 1;
        }
      }
      if (currentSeq.length) seqs.push(currentSeq);
      return seqs;
    };

    const numSeqs = parseSequences(false);
    const validNumSeq = numSeqs.find(seq => seq.length >= maximum);

    if (validNumSeq) {
      targets.push(...validNumSeq.slice(0, maximum));
    } else {
      // If no complete numeric sequence reached maximum, only check letters if NO numeric sequence of length >= 2 exists at all.
      // Statements like A. ..., B. ... must never supersede numeric choices.
      const hasAnyNumSequence = numSeqs.some(seq => seq.length >= 2);
      if (!hasAnyNumSequence) {
        const letterSeqs = parseSequences(true);
        const validLetterSeq = letterSeqs.find(seq => seq.length >= maximum);
        if (validLetterSeq) {
          targets.push(...validLetterSeq.slice(0, maximum));
        }
      }
    }
  }

  return targets;
}

export function isElementVisible(control: HTMLElement): boolean {
  if (!control.isConnected) return false;
  const inputEl = control as HTMLSelectElement | HTMLButtonElement | HTMLInputElement;
  if (inputEl.hidden || control.getAttribute('aria-hidden') === 'true') return false;
  for (let node: HTMLElement | null = control; node; node = node.parentElement) {
    if (node.hasAttribute('data-betterquest-native-responses') || node.hasAttribute('data-betterquest-native-visible') || node.id === 'view-responses-table-id') {
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
    if (node.hasAttribute('data-betterquest-native-responses') || node.hasAttribute('data-betterquest-native-visible') || node.id === 'view-responses-table-id') {
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

/** True when Quest's DataTables shell has no response rows (past-due / locked). */
export function isEmptyResponseTable(table: HTMLTableElement): boolean {
  if (table.querySelector('.dataTables_empty, td.dataTables_empty')) return true;
  const bodyText = (table.querySelector('tbody')?.textContent || '').replace(/\s+/g, ' ').trim();
  return /^no data available in table$/i.test(bodyText);
}

/**
 * A past-due or locked assessment: Quest still ships the whole response shell,
 * but it holds no rows and the PDF frame never loaded.
 */
export function findLockedAssessment(document: Document): HTMLElement | null {
  const root = document.querySelector<HTMLElement>('#target');
  if (!root) return null;
  const responses = root.querySelector<HTMLElement>('#view-responses-table-id');
  if (!responses) return null;
  const table = responses.querySelector<HTMLTableElement>('table[id^="instance-table-courseuserassignment_"]');
  return table && isEmptyResponseTable(table) ? root : null;
}

/**
 * Quest's Slides view of informational and practice items ("extra homework")
 * carries no response controls, so the interactive slide workspace has nothing
 * to work with and the raw MDB layout is all the student sees.
 */
export function findPracticeSlides(document: Document): HTMLElement | null {
  const root = document.querySelector<HTMLElement>('#target > #presentation-div')?.parentElement;
  if (!root) return null;
  if (root.querySelector('#view-responses-table-id')) return null;
  if (!document.querySelector('#question-bar-div')) return null;
  // Pages with response controls already get the interactive slide workspace;
  // this shell would fight it for the question bar and the pager.
  return findSlideAssessment(document) ? null : root;
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

  let pdfFrame = root.querySelector<HTMLElement>(':scope > #pdf-frame, #pdf-frame') ||
    document.querySelector<HTMLElement>('#pdf-frame');
  let iframe = pdfFrame?.querySelector<HTMLIFrameElement>('#presentation-pdf-frame iframe, iframe[title="Assignment PDF"], iframe') ||
    root.querySelector<HTMLIFrameElement>('#presentation-pdf-frame iframe, iframe[title="Assignment PDF"], iframe') ||
    document.querySelector<HTMLIFrameElement>('#presentation-pdf-frame iframe, iframe[title="Assignment PDF"], iframe[src*="download_pdf"], iframe[src*="problem_pdf"]');

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

/**
 * Quest uses DataTables Scroller (`scroller: true`, `deferRender: true`). Restoring
 * a short page length after a read drops most rows from the DOM again, so a later
 * reconcile thinks the homework only has a handful of questions and re-shows PDF
 * choices. Expand once and leave it expanded — BetterQuest already hides the
 * native table.
 */
function ensureAllDataTableRows(table: HTMLTableElement) {
  if (table.dataset.betterquestDtExpanded === 'true') return;
  const win = table.ownerDocument.defaultView as Window & { jQuery?: any; $?: any };
  const $ = win?.jQuery || win?.$;
  try {
    const api = $?.(table)?.DataTable?.({ retrieve: true });
    if (!api || typeof api.page?.len !== 'function') return;
    if (Number(api.page.len()) !== -1) api.page.len(-1).draw(false);
    table.dataset.betterquestDtExpanded = 'true';
  } catch {
    /* DataTables not ready yet — the next reconcile retries. */
  }
}

export function readAssessmentResponses(table: HTMLTableElement): AssessmentResponseBinding[] {
  ensureAllDataTableRows(table);
  return readAssessmentResponsesFromDom(table);
}

function readAssessmentResponsesFromDom(table: HTMLTableElement): AssessmentResponseBinding[] {
  const rows: AssessmentResponseBinding[] = [];
  const trElements = table.querySelectorAll<HTMLTableRowElement>('tbody > tr, :scope > tr');
  const revealing = Boolean(table.closest('[data-betterquest-native-visible="true"]'));

  for (const row of trElements) {
    if (row.closest('thead')) continue;
    const id = row.dataset.id || row.id?.replace(/^row-/, '') || row.querySelector<HTMLInputElement>('input[name="instanceitempart"]')?.value || String(rows.length + 1);
    const cells = row.querySelectorAll(':scope > td, :scope > th');
    if (!id || cells.length < 2) continue;

    // While BetterQuest is revealing the clipped native table, trust every real
    // response row — overflow clipping would otherwise drop most of the homework.
    if (!revealing && !isElementVisible(row)) continue;

    const select = row.querySelector<HTMLSelectElement>('select[name="response"], select[aria-label="Select your response"], select');
    // Never match per-row history toggles or other non-submit buttons: only
    // explicit submit controls qualify, and anything history-related is out.
    const submitCandidates = [...row.querySelectorAll<HTMLButtonElement>(
      'button[aria-label="Submit response"], button[type="submit"], input[type="submit"], input[value*="Submit" i]',
    )];
    const rowSubmit = submitCandidates.find(el => !/history/i.test(el.getAttribute('aria-label') || el.textContent || '')) || null;
    const submit = rowSubmit ||
      table.querySelector<HTMLButtonElement>('button[type="submit"], input[type="submit"]') ||
      table.closest('form')?.querySelector<HTMLButtonElement>('button[type="submit"], input[type="submit"], input[value*="Submit" i], button[value*="Submit" i]') ||
      table.ownerDocument.querySelector<HTMLButtonElement>('#target button[type="submit"], #target input[type="submit"], #main-content button[type="submit"], #main-content input[type="submit"]');
    const isSubmitAvailable = Boolean(submit && isElementVisible(submit));

    let val = '';
    if (select) {
      val = select.value;
    } else {
      const answerText = clean(cells[1]?.textContent);
      const answerMatch = answerText.match(/^([1-9])\b/);
      val = answerMatch ? answerMatch[1] : '';
    }

    const previousText = row.querySelector('.previous')?.textContent;
    const triesMatch = previousText?.match(/\d+\s*\/\s*(\d+)/);
    const maxTries = triesMatch ? Number(triesMatch[1]) : 0;
    const previousMatch = previousText?.match(/(\d+)\s*\/\s*(\d+)/) || previousText?.match(/\d+/);
    const attempts = previousMatch ? Number(previousMatch[1] ?? previousMatch[0]) : 0;

    const statusText = clean(row.querySelector('.status')?.textContent);
    const hasSuccessClass = Boolean(row.querySelector('.status .text-success, .status [class*="text-success"]'));
    // Quest often concatenates the material icon ("check") with "Correct" into
    // "checkCorrect" — `\bcorrect\b` misses that, so accept it explicitly.
    const isCorrect = hasSuccessClass
      || (/\bcorrect\b/i.test(statusText) && !/\b(?:incorrect|not correct)\b/i.test(statusText))
      || (/check\s*correct/i.test(statusText) && !/incorrect/i.test(statusText));
    const triesExhausted = Boolean(maxTries > 0 && attempts >= maxTries);

    // If there is no answer and no attempts recorded, and native submit is hidden, fail closed
    if (!val && attempts === 0 && !isSubmitAvailable) {
      continue;
    }

    if (select) {
      let options = [...select.options]
        .filter(isResponseOptionAvailable)
        .map(option => ({ value: option.value, label: clean(option.textContent) || option.value }));
      if (!options.length) {
        options = [...select.options]
          .map(opt => ({ value: opt.value, label: clean(opt.textContent) || opt.value }))
          .filter(opt => opt.value);
      }
      if (!options.length) {
        const optionCount = Math.max(maxTries, 5);
        options = Array.from({ length: optionCount }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }));
      }
      const selectDisabled = select.disabled || select.getAttribute('aria-disabled') === 'true';
      const isAnswered = selectDisabled || isCorrect || triesExhausted || Boolean(!isSubmitAvailable && val);
      rows.push({
        id,
        number: clean(cells[0]?.textContent).replace(/\.$/, '') || String(rows.length + 1),
        select,
        submit: submit || row.ownerDocument.createElement('button'),
        options,
        attempts,
        answered: isAnswered,
      });
      continue;
    }

    // No select input: static completed answer in cell 1 (e.g. "3" in quest-responses.html)
    const optionCount = Math.max(val ? Number(val) : 1, maxTries, 5);
    const options = Array.from({ length: optionCount }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }));
    const syntheticSelect = row.ownerDocument.createElement('select');
    syntheticSelect.disabled = true;
    for (const optItem of options) {
      const opt = row.ownerDocument.createElement('option');
      opt.value = optItem.value;
      opt.textContent = optItem.label;
      if (optItem.value === val) opt.selected = true;
      syntheticSelect.append(opt);
    }
    if (val) syntheticSelect.value = val;
    const effectiveSubmit = submit || row.ownerDocument.createElement('button');
    effectiveSubmit.disabled = true;
    effectiveSubmit.hidden = true;
    rows.push({
      id,
      number: clean(cells[0]?.textContent).replace(/\.$/, '') || String(rows.length + 1),
      select: syntheticSelect,
      submit: effectiveSubmit,
      options,
      attempts: attempts || (val ? 1 : 0),
      answered: true,
    });
  }
  return rows;
}

export function findSlideAssessment(document: Document): HTMLElement | null {
  const presentation = document.querySelector<HTMLElement>('#target > #presentation-div');
  return presentation?.querySelector('input[type="radio"][name^="response_"]') && presentation.querySelector('.submit-btn') ? presentation : null;
}
