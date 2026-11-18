import { LocalRepository } from '../../../src/storage/repository';
import { emptyState } from '../../../src/shared/models';

const params = new URLSearchParams(location.search);
const layout = params.get('layout') || 'roomy';
const before = location.port === '4180';
let state = emptyState();
state.preferences = { theme: 'dark', features: { animations: false, celebrations: false, whimsy: false } };
const listeners = new Set<(message: unknown) => void>();
const repository = new LocalRepository({ read: async () => state, write: async next => { state = next; } });
const runtime = {
  id: 'local-betterquest-fixture',
  getURL(path: string) {
    const resource = path === 'pdf.worker.min.mjs' ? 'build/pdf.worker.min.mjs' : path.replace(/^pdfjs\//, '');
    return `${location.origin}/fixture-assets/${resource}`;
  },
  async sendMessage(message: any) {
    if (message.type === 'betterquest:ping') return { type: 'betterquest:pong', version: 'local' };
    if (message.type !== 'betterquest:command') return { ok: false };
    try {
      const result = await repository.execute(message.command);
      if (message.command.kind !== 'state:read') setTimeout(() => listeners.forEach(fn => fn({ type: 'betterquest:changed' })), 0);
      return { ok: true, state: result };
    } catch (error) { return { ok: false, error: String(error) }; }
  },
  connect() { return { onMessage: { addListener: (fn: any) => listeners.add(fn), removeListener: (fn: any) => listeners.delete(fn) }, onDisconnect: { addListener() {} }, disconnect() {} }; },
};
Object.defineProperty(globalThis, 'chrome', { configurable: true, value: { runtime } });
const table = document.querySelector<HTMLTableElement>('table')!;
table.tBodies[0].innerHTML = Array.from({ length: 23 }, (_, i) => {
  const q = i + 1;
  const control = q === 23 ? '<textarea name="response" placeholder="Type your answer" maxlength="255"></textarea>'
    : '<select name="response"><option value=""></option><option value="1">1</option><option value="2">2</option><option value="3">3</option></select>';
  return `<tr class="instanceitempart" data-id="cuaip_${q}"><td>${q}.</td><td>${control}</td><td class="status"></td><td class="previous">0 / 3</td><td><button type="button" aria-label="Submit response">Submit</button></td><td></td></tr>`;
}).join('');
const mark = (row: HTMLTableRowElement, correct: boolean) => {
  const control = row.querySelector<HTMLTextAreaElement | HTMLSelectElement>('[name="response"]')!;
  row.querySelector('.status')!.innerHTML = correct ? '<span class="text-success">Correct</span>' : '<span class="text-danger">Incorrect</span>';
  row.querySelector('.previous')!.textContent = '1 / 3';
  control.disabled = correct;
  row.querySelector<HTMLButtonElement>('button')!.disabled = correct;
};
let submissions = 0, incorrect = false;
if (params.has('completed')) {
  table.rows[22].querySelector<HTMLTextAreaElement>('textarea')!.value = '21.0833'; mark(table.rows[22], true);
}
table.addEventListener('click', event => {
  if (!(event.target instanceof HTMLButtonElement)) return;
  const row = event.target.closest('tr'); if (!row) return;
  submissions++; mark(row, !incorrect); incorrect = false;
  document.querySelector('#incorrect')!.textContent = 'Next submit: incorrect';
});
document.querySelector('iframe')!.src = `/student/images/problem_pdf?instance=courseuserassignment_900023&layout=${layout}`;
for (const id of ['layout', 'version']) {
  const select = document.querySelector<HTMLSelectElement>(`#${id}`)!;
  select.value = id === 'layout' ? layout : before ? 'before' : 'fixed';
  select.onchange = () => {
    const url = new URL(location.href);
    if (id === 'version') url.port = select.value === 'before' ? '4180' : '4179';
    else url.searchParams.set(id, select.value);
    location.href = url.href;
  };
}
document.querySelector<HTMLButtonElement>('#incorrect')!.onclick = () => { incorrect = true; document.querySelector('#incorrect')!.textContent = 'Next submit will be incorrect'; };
document.querySelector<HTMLButtonElement>('#rerender')!.onclick = () => { table.tBodies[0].replaceWith(table.tBodies[0].cloneNode(true)); };
document.querySelector<HTMLButtonElement>('#reload-completed')!.onclick = () => { const url = new URL(location.href); url.searchParams.set('completed', '1'); location.href = url.href; };
document.querySelector<HTMLButtonElement>('#jump')!.onclick = () => {
  document.querySelector('[data-betterquest="interactive-pdf"]')?.shadowRoot?.querySelector('.question-anchor[data-question="23"]')?.scrollIntoView({ block: 'center' });
};

// Real entry point, real adapters, real answer controls, real PDF.js. Only the
// worker transport and Quest server responses above are synthetic.
await import('../../../src/content/index');
const report = document.querySelector<HTMLElement>('#fixture-report')!;
setInterval(() => {
  const shadow = document.querySelector('[data-betterquest="interactive-pdf"]')?.shadowRoot;
  const card = shadow?.querySelector<HTMLElement>('.pdf-free-response[data-question="23"]');
  const native = table.querySelector<HTMLTextAreaElement>('textarea');
  const box = card?.getBoundingClientRect();
  const mcq = shadow?.querySelectorAll('.option-hit').length || 0;
  const summary = `Q23: ${card ? card.classList.contains('pdf-free-flow') ? 'below page' : 'PDF overlay' : 'not mounted'} | height: ${box?.height.toFixed(1) || '—'}px | min-height: ${card?.style.minHeight || 'none'} | MCQ choices: ${mcq} | native submits: ${submissions} | native Q23: ${native?.value || '(empty)'} | ${native?.disabled ? 'completed' : 'editable'}`;
  if (report.textContent !== summary) report.textContent = summary;
}, 500);
