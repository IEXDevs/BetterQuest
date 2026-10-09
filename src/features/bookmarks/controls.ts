import type { QuestionBinding } from '../../shared/adapters';
import { isAssignment, isCourse, isQuestion, linked } from '../../shared/validation';
import { BookmarkService } from './service';

function safeSlot(binding: QuestionBinding): boolean {
  const slot = binding.controlSlot;
  if (binding.slotKind !== 'response-cell') return !slot.closest('form');
  if (slot.tagName !== 'TD' || slot.parentElement?.tagName !== 'TR' || slot.parentElement.lastElementChild !== slot) return false;
  return [...slot.childNodes].every(node => node.nodeType === 8 ||
    (node.nodeType === 3 && !(node.textContent || '').trim()) ||
    (node.nodeType === 1 && (node as Element).matches('[data-betterquest="bookmark-control"]')));
}

const icon = '<svg aria-hidden="true" viewBox="0 0 16 16"><path d="M4 2h8v12l-4-2.5L4 14V2Z"/></svg>';

/** One compact control per stable question ID, reconciled against current rows. */
export function createBookmarkControls(root: Element, service = new BookmarkService()) {
  const controls = new Map<string, { host: HTMLElement; button: HTMLButtonElement; binding: QuestionBinding }>();
  const pending = new Set<string>();
  let disposed = false;
  let generation = 0;
  root.querySelectorAll('[data-betterquest="bookmark-control"]').forEach(node => node.remove());

  async function reconcile(bindings: QuestionBinding[]): Promise<void> {
    const current = ++generation;
    const saved = new Set((await service.list()).map(bookmark => bookmark.id));
    if (disposed || current !== generation) return;
    const valid = bindings.filter(b => root.isConnected && b.controlSlot.isConnected && root.contains(b.controlSlot) &&
      isCourse(b.course) && isAssignment(b.assignment) && isQuestion(b.question) &&
      linked(b.course, b.assignment, b.question) && b.assignment.kind !== 'assessment' && safeSlot(b));
    const ids = new Set(valid.map(b => b.question.id));
    for (const [id, item] of controls) if (!ids.has(id)) { item.host.remove(); controls.delete(id); }
    // DataTables clones can copy a light-DOM host without its shadow/listeners.
    const ownedHosts = new Set([...controls.values()].map(item => item.host));
    root.querySelectorAll<HTMLElement>('[data-betterquest="bookmark-control"]').forEach(node => {
      if (!ownedHosts.has(node)) node.remove();
    });
    for (const binding of valid) {
      let item = controls.get(binding.question.id);
      if (!item) {
        const host = root.ownerDocument.createElement('span');
        host.dataset.betterquest = 'bookmark-control';
        host.dataset.questionId = binding.question.id;
        const shadow = host.attachShadow({ mode: 'open' });
        const style = root.ownerDocument.createElement('style');
        style.textContent = ':host{display:inline-flex;vertical-align:middle}button{all:unset;display:grid;place-items:center;width:16px;height:20px;cursor:pointer;border-radius:3px;color:var(--bq-muted,#6c8293)}button:hover{color:var(--bq-accent,#2563eb);background:var(--bq-raised,#eff6ff)}button[aria-pressed="true"]{color:var(--bq-accent,#2563eb)}button:disabled{opacity:.5;cursor:wait}button:focus-visible{outline:2px solid var(--bq-accent,#2563eb);outline-offset:2px}svg{width:14px;height:16px;fill:none;stroke:currentColor;stroke-width:1.4;stroke-linejoin:round}button[aria-pressed="true"] svg{fill:currentColor}';
        const button = root.ownerDocument.createElement('button');
        button.type = 'button'; button.innerHTML = icon;
        shadow.append(style, button);
        item = { host, button, binding };
        controls.set(binding.question.id, item);
        const entry = item;
        button.addEventListener('click', event => {
          event.preventDefault(); event.stopPropagation();
          const clicked = entry.binding; // Capture before DataTables recycles this row.
          const id = clicked.question.id;
          if (disposed || pending.has(id)) return;
          pending.add(id); button.disabled = true;
          void (async () => {
            try {
              if ((await service.list()).some(bookmark => bookmark.id === id)) await service.remove(id);
              else await service.add(clicked.course, clicked.assignment, clicked.question);
              if (!disposed) await reconcile([...controls.values()].map(entry => entry.binding));
            } catch (error) {
              button.title = error instanceof Error ? error.message : 'Could not save bookmark.';
              button.setAttribute('aria-label', button.title);
            } finally {
              pending.delete(id);
              if (!disposed) button.disabled = false;
            }
          })();
        });
      }
      item.binding = binding;
      if (item.host.parentElement !== binding.controlSlot) binding.controlSlot.append(item.host);
      item.button.disabled = pending.has(binding.question.id);
      const isSaved = saved.has(binding.question.id);
      item.button.setAttribute('aria-pressed', String(isSaved));
      const label = `${isSaved ? 'Remove bookmark for' : 'Bookmark'} question ${binding.question.number || binding.question.sourceId}`;
      item.button.setAttribute('aria-label', label); item.button.title = label;
    }
  }

  return { reconcile, dispose: () => { disposed = true; generation++; controls.forEach(item => item.host.remove()); controls.clear(); pending.clear(); } };
}
