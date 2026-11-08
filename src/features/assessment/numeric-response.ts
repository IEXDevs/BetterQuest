/** Transient UI state only. Answer values are never written to extension storage. */
export interface NumericResponse {
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
  .numeric-response :focus-visible{outline:2px solid var(--bq-accent,#227ab0);outline-offset:2px}
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
  const paint = () => { submit.disabled = disabled || !input.value.trim(); };
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
