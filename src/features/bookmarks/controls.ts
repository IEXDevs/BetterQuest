import type { QuestionBinding } from '../../shared/adapters';
import { isAssignment, isCourse, isQuestion, linked } from '../../shared/validation';
import { BookmarkService } from './service';

/** Verified question slots only. Caller owns a scoped observer and calls reconcile. */
export function createBookmarkControls(root: Element, service = new BookmarkService()) {
  const controls = new Map<string, { host: HTMLElement; button: HTMLButtonElement; binding: QuestionBinding }>();
  let disposed = false;
  let generation = 0;
  root.querySelectorAll('[data-betterquest="bookmark-control"]').forEach(node => node.remove());

  async function reconcile(bindings: QuestionBinding[]): Promise<void> {
    const current = ++generation;
    const saved = new Set((await service.list()).map(bookmark => bookmark.id));
    if (disposed || current !== generation) return;
    const valid = bindings.filter(b => root.isConnected && b.controlSlot.isConnected && root.contains(b.controlSlot) && isCourse(b.course) && isAssignment(b.assignment) &&
      isQuestion(b.question) && linked(b.course, b.assignment, b.question) && b.assignment.kind === 'homework' && !b.controlSlot.closest('form'));
    const ids = new Set(valid.map(b => b.question.id));
    for (const [id, item] of controls) if (!ids.has(id)) { item.host.remove(); controls.delete(id); }
    for (const binding of valid) {
      let item = controls.get(binding.question.id);
      if (!item) {
        const host = root.ownerDocument.createElement('span');
        host.dataset.betterquest = 'bookmark-control';
        const shadow = host.attachShadow({ mode: 'open' });
        const style = root.ownerDocument.createElement('style');
        style.textContent = ':host{display:inline-flex}button{font:12px system-ui;color:#1d4ed8;background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:5px 8px;cursor:pointer}button:focus-visible{outline:2px solid #2563eb;outline-offset:2px}';
        const button = root.ownerDocument.createElement('button');
        button.type = 'button';
        shadow.append(style, button);
        item = { host, button, binding };
        controls.set(binding.question.id, item);
        const entry = item;
        button.addEventListener('click', event => {
          event.preventDefault(); event.stopPropagation();
          button.disabled = true;
          void (async () => {
            try {
              const id = entry.binding.question.id;
              if (button.getAttribute('aria-pressed') === 'true') await service.remove(id);
              else await service.add(entry.binding.course, entry.binding.assignment, entry.binding.question);
              if (!disposed) await reconcile([...controls.values()].map(entry => entry.binding));
            } catch (error) {
              button.title = error instanceof Error ? error.message : 'Could not save bookmark.';
            } finally { button.disabled = false; }
          })();
        });
      }
      item.binding = binding;
      if (item.host.parentElement !== binding.controlSlot) binding.controlSlot.append(item.host);
      item.button.setAttribute('aria-pressed', String(saved.has(binding.question.id)));
      item.button.setAttribute('aria-label', `Bookmark question ${binding.question.number || binding.question.sourceId}`);
      item.button.textContent = saved.has(binding.question.id) ? 'Bookmarked' : 'Bookmark';
    }
  }

  return { reconcile, dispose: () => { disposed = true; generation++; controls.forEach(item => item.host.remove()); controls.clear(); } };
}
