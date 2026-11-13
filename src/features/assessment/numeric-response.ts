/** Transient UI state only. Answer values are never written to extension storage. */
export interface NumericResponse {
  value: string;
  placeholder: string;
  title: string;
  maxLength: number;
  disabled: boolean;
}

/** Transient UI state only. Answer values are never written to extension storage. */
export interface FreeResponse {
  value: string;
  placeholder: string;
  title: string;
  maxLength: number;
  disabled: boolean;
}

export const NUMERIC_RESPONSE_STYLES = `
  .numeric-response{display:flex;align-items:center;gap:6px;min-width:0;font:12px/1.4 system-ui,sans-serif}
  .numeric-response[hidden]{display:none!important}
  .numeric-response input{box-sizing:border-box;width:100%;min-width:0;min-height:32px;padding:6px 8px;border:1px solid var(--bq-border,#cbd5e1);border-radius:5px;background:var(--bq-surface,#fff);color:var(--bq-text,#18253a);font:inherit}
  .numeric-response button{flex-shrink:0;min-height:32px;padding:6px 9px;border:1px solid var(--bq-border,#cbd5e1);border-radius:5px;background:var(--bq-raised,#eef2f6);color:var(--bq-text,#18253a);font:600 12px/1.4 system-ui,sans-serif;cursor:pointer}
  .numeric-response button:disabled{opacity:.5;cursor:default}
  .numeric-response button[data-valid="true"]{background:linear-gradient(135deg,#16a34a,#15803d);border-color:#15803d;color:#fff}
  .numeric-response :focus-visible{outline:2px solid var(--bq-accent,#227ab0);outline-offset:2px}
  .free-response{display:flex;flex-direction:column;gap:6px;min-width:0;font:12px/1.4 system-ui,sans-serif}
  .free-response[hidden]{display:none!important}
  .free-response textarea{box-sizing:border-box;width:100%;min-width:0;min-height:64px;padding:8px;border:1px solid var(--bq-border,#cbd5e1);border-radius:5px;background:var(--bq-surface,#fff);color:var(--bq-text,#18253a);font:inherit;resize:vertical}
  .free-response .free-row{display:flex;align-items:center;gap:8px}
  .free-response .free-count{margin-left:auto;font-size:11px;color:var(--bq-muted,#64748b);font-variant-numeric:tabular-nums}
  .free-response button{align-self:flex-start;min-height:32px;padding:6px 12px;border:1px solid var(--bq-border,#cbd5e1);border-radius:5px;background:var(--bq-raised,#eef2f6);color:var(--bq-text,#18253a);font:600 12px/1.4 system-ui,sans-serif;cursor:pointer}
  .free-response button:disabled{opacity:.5;cursor:default}
  .free-response button[data-valid="true"]{background:linear-gradient(135deg,#16a34a,#15803d);border-color:#15803d;color:#fff}
  .free-response :focus-visible{outline:2px solid var(--bq-accent,#227ab0);outline-offset:2px}
`;

export function createNumericResponse(document: Document, questionNumber: number, response: NumericResponse,
  onInput: (value: string) => boolean, onSubmit: (value: string) => boolean) {
  const element = document.createElement('div'); element.className = 'numeric-response';
  element.dataset.question = String(questionNumber); element.setAttribute('role', 'group');
  element.setAttribute('aria-label', `Question ${questionNumber} response`);
  const input = document.createElement('input'); input.type = 'text'; input.autocomplete = 'off';
  input.setAttribute('aria-label', `Answer for question ${questionNumber}`);
  const submit = document.createElement('button'); submit.type = 'button'; submit.textContent = 'Submit';
  submit.setAttribute('aria-label', `Submit question ${questionNumber}`);
  let disabled = response.disabled;
  const isValid = () => {
    if (disabled || !input.value.trim()) return false;
    try {
      if (typeof input.checkValidity === 'function' && !input.checkValidity()) return false;
    } catch { return false; }
    return true;
  };
  const paint = () => {
    const valid = isValid();
    submit.disabled = !valid;
    submit.dataset.valid = String(valid);
  };
  const setValue = (value: string) => { if (input.value !== value) input.value = value; paint(); };
  const update = (next: NumericResponse) => {
    disabled = next.disabled; input.disabled = disabled;
    input.placeholder = next.placeholder; input.title = next.title;
    if (next.maxLength >= 0) input.maxLength = next.maxLength; else input.removeAttribute('maxlength');
    setValue(next.value);
  };
  input.addEventListener('input', () => {
    input.setAttribute('aria-invalid', String(!onInput(input.value))); paint();
  });
  submit.addEventListener('click', event => {
    event.stopPropagation();
    if (submit.disabled) return;
    input.setAttribute('aria-invalid', String(!onSubmit(input.value)));
  });
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); submit.click(); }
  });
  element.append(input, submit); update(response);
  return { element, input, submit, update, setValue };
}

export function createFreeResponse(document: Document, questionNumber: number, response: FreeResponse,
  onInput: (value: string) => boolean, onSubmit: (value: string) => boolean) {
  const element = document.createElement('div'); element.className = 'free-response';
  element.dataset.question = String(questionNumber); element.setAttribute('role', 'group');
  element.setAttribute('aria-label', `Question ${questionNumber} free response`);
  const area = document.createElement('textarea'); area.rows = 3;
  area.setAttribute('aria-label', `Free response answer for question ${questionNumber}`);
  const row = document.createElement('div'); row.className = 'free-row';
  const submit = document.createElement('button'); submit.type = 'button'; submit.textContent = 'Submit';
  submit.setAttribute('aria-label', `Submit question ${questionNumber}`);
  const count = document.createElement('span'); count.className = 'free-count'; count.setAttribute('aria-hidden', 'true');
  row.append(submit, count);
  let disabled = response.disabled;
  const isValid = () => {
    if (disabled || !area.value.trim()) return false;
    if (area.maxLength >= 0 && area.value.length > area.maxLength) return false;
    try {
      if (typeof area.checkValidity === 'function' && !area.checkValidity()) return false;
    } catch { return false; }
    return true;
  };
  const paint = () => {
    const valid = isValid();
    submit.disabled = !valid;
    submit.dataset.valid = String(valid);
    count.textContent = area.value ? `${area.value.length} characters` : '';
  };
  const setValue = (value: string) => { if (area.value !== value) area.value = value; paint(); };
  const update = (next: FreeResponse) => {
    disabled = next.disabled; area.disabled = disabled;
    area.placeholder = next.placeholder; area.title = next.title;
    if (next.maxLength >= 0) area.maxLength = next.maxLength; else area.removeAttribute('maxlength');
    setValue(next.value);
  };
  area.addEventListener('input', () => {
    area.setAttribute('aria-invalid', String(!onInput(area.value))); paint();
  });
  submit.addEventListener('click', event => {
    event.stopPropagation();
    if (submit.disabled) return;
    area.setAttribute('aria-invalid', String(!onSubmit(area.value)));
  });
  area.addEventListener('keydown', event => {
    if (event.key !== 'Enter' || event.shiftKey || event.altKey) return;
    // Plain Enter (or Ctrl/Cmd+Enter) submits prose when valid; Shift+Enter
    // keeps a newline. Invalid text swallows Enter so nothing submits.
    event.preventDefault();
    event.stopPropagation();
    if (submit.disabled) return;
    submit.click();
  });
  element.append(area, row); update(response);
  return { element, input: area, submit, update, setValue };
}
