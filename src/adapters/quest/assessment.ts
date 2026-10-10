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

/**
 * Quest PDFs delimit questions with zero-padded three-digit markers. Within
 * each boundary, accept only the first complete `1.` through `N.` sequence,
 * where N is supplied by Quest's native response selector.
 */
export function mapPdfOptionLabels(runs: PdfTextRun[], optionMaximums: ReadonlyMap<number, number>): PdfOptionTarget[] {
  const targets: PdfOptionTarget[] = [];
  let questionNumber: number | null = null;
  let expected = 1;
  let pending: PdfOptionTarget[] = [];
  let completed = false;

  for (const run of runs) {
    const text = clean(run.text);
    const boundary = text.match(/^(\d{3})$/);
    if (boundary) {
      questionNumber = Number(boundary[1]);
      expected = 1;
      pending = [];
      completed = false;
      continue;
    }
    if (questionNumber === null || completed) continue;
    const maximum = optionMaximums.get(questionNumber);
    if (!maximum || maximum < 1 || maximum > 9) continue;
    const option = text.match(/^([1-9])\.$/);
    if (!option) continue;
    const value = Number(option[1]);
    if (value > maximum) continue;
    if (value === 1) { pending = [{ ...run, questionNumber, optionValue: 1 }]; expected = 2; }
    else if (pending.length && value === expected) { pending.push({ ...run, questionNumber, optionValue: value }); expected++; }
    if (pending.length === maximum) { targets.push(...pending); pending = []; completed = true; }
  }
  return targets;
}

export function isNativeControlAvailable(control: HTMLSelectElement | HTMLButtonElement): boolean {
  if (!control.isConnected || control.disabled || control.hidden || control.getAttribute('aria-disabled') === 'true') return false;
  for (let node: HTMLElement | null = control; node; node = node.parentElement) {
    const style = node.ownerDocument.defaultView?.getComputedStyle(node);
    if (node.hidden || node.inert || node.getAttribute('aria-hidden') === 'true' || style?.display === 'none' || style?.visibility === 'hidden' || style?.visibility === 'collapse') return false;
  }
  return true;
}

export function isResponseOptionAvailable(option: HTMLOptionElement): boolean {
  return Boolean(option.value && !option.disabled && !option.hidden && !option.closest('optgroup[disabled]'));
}

export function findPdfAssessment(document: Document): PdfAssessmentElements | null {
  const root = document.querySelector<HTMLElement>('#target');
  const pdfFrame = root?.querySelector<HTMLElement>(':scope > #pdf-frame');
  const iframe = pdfFrame?.querySelector<HTMLIFrameElement>('#presentation-pdf-frame iframe[title="Assignment PDF"]');
  const responseRoot = root?.querySelector<HTMLElement>(':scope > #view-responses-table-id');
  const table = responseRoot?.querySelector<HTMLTableElement>('table[id^="instance-table-courseuserassignment_"]');
  if (!root || !pdfFrame || !iframe || !responseRoot || !table) return null;
  return { root, pdfFrame, iframe, responseRoot, table, tally: root.querySelector<HTMLElement>(':scope > #tally-div') };
}

export function readAssessmentResponses(table: HTMLTableElement): AssessmentResponseBinding[] {
  const rows: AssessmentResponseBinding[] = [];
  for (const row of table.querySelectorAll<HTMLTableRowElement>('tbody > tr[data-id]')) {
    const id = row.dataset.id;
    const cells = row.querySelectorAll(':scope > td');
    const select = row.querySelector<HTMLSelectElement>('select[name="response"], select[aria-label="Select your response"]');
    const submit = row.querySelector<HTMLButtonElement>('button[aria-label="Submit response"]');
    if (!id || !select || !submit || cells.length < 2 || !isNativeControlAvailable(select) || !isNativeControlAvailable(submit)) continue;
    const options = [...select.options]
      .filter(isResponseOptionAvailable)
      .map(option => ({ value: option.value, label: clean(option.textContent) || option.value }));
    if (!options.length) continue;
    const attempts = Number(row.querySelector('.previous')?.textContent?.match(/\d+/)?.[0] || 0);
    rows.push({ id, number: clean(cells[0]?.textContent).replace(/\.$/, '') || String(rows.length + 1), select, submit, options, attempts });
  }
  return rows;
}

export function findSlideAssessment(document: Document): HTMLElement | null {
  const presentation = document.querySelector<HTMLElement>('#target > #presentation-div');
  return presentation?.querySelector('input[type="radio"][name^="response_"]') && presentation.querySelector('.submit-btn') ? presentation : null;
}
