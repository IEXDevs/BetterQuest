import type { AssignmentCompletionBinding } from '../../adapters/quest/assignments';
import { execute, subscribeLocal, type Execute } from '../../shared/client';
import type { LocalState } from '../../shared/models';
import type { Subscribe } from './section';

interface MountedControl {
  binding: AssignmentCompletionBinding;
  host: HTMLElement;
  button: HTMLButtonElement;
}

/** A reversible local correction; native Quest completion markup is never rewritten. */
export function createCompletionControls(root: Element, run: Execute = execute, subscribe: Subscribe = subscribeLocal) {
  const document = root.ownerDocument;
  root.querySelectorAll('[data-betterquest="completion-toggle"]').forEach(node => node.remove());
  const mounted = new Map<string, MountedControl>();
  let disposed = false;
  let stop: (() => void) | undefined;

  function paint(state: LocalState) {
    for (const [id, control] of mounted) {
      const completed = state.completionOverrides?.[id] === true;
      control.button.setAttribute('aria-pressed', String(completed));
      control.button.setAttribute('aria-label', completed ? `Remove manual completion for ${control.binding.title}` : `Mark ${control.binding.title} completed`);
      control.button.title = completed ? 'Marked complete in BetterQuest. Click to undo.' : 'Mark complete in BetterQuest';
      control.button.innerHTML = completed
        ? '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m4 10 4 4 8-9"/></svg><span>Done</span>'
        : '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7"/></svg><span>Mark done</span>';
    }
  }

  async function refresh() {
    if (disposed) return;
    try { paint(await run({ kind: 'state:read' })); } catch { /* Native assignment controls remain available. */ }
  }

  function mount(binding: AssignmentCompletionBinding) {
    const host = document.createElement('span');
    host.dataset.betterquest = 'completion-toggle';
    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = `
      :host{display:inline-flex;margin:.35rem 0 0;font:inherit;vertical-align:middle}
      button{display:inline-flex;align-items:center;gap:5px;min-height:30px;padding:5px 9px;border:1px solid var(--bq-border,#cbd7e3);border-radius:999px;background:var(--bq-surface,#fff);color:var(--bq-muted,#607286);font:600 11px/1.1 inherit;cursor:pointer;transition:transform .18s ease,border-color .18s ease,background .18s ease,color .18s ease}
      button:hover{transform:translateY(-1px);border-color:var(--bq-accent,#227ab0);color:var(--bq-accent,#227ab0)}
      button[aria-pressed="true"]{background:color-mix(in srgb,var(--bq-good,#287f68) 16%,var(--bq-surface,#fff));border-color:var(--bq-good,#287f68);color:var(--bq-good,#287f68)}
      button:focus-visible{outline:2px solid var(--bq-accent,#227ab0);outline-offset:2px}svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
      @media(prefers-reduced-motion:reduce){button{transition:none}button:hover{transform:none}}
    `;
    const button = document.createElement('button'); button.type = 'button'; button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', event => {
      event.preventDefault(); event.stopPropagation();
      if (button.disabled) return;
      const completed = button.getAttribute('aria-pressed') === 'true';
      button.disabled = true;
      void run({ kind: 'assignment:completion:set', assignmentId: binding.assignmentId, completed: !completed })
        .then(state => paint(state)).finally(() => { button.disabled = false; });
    });
    shadow.append(style, button); binding.controlSlot.append(host);
    mounted.set(binding.assignmentId, { binding, host, button });
  }

  return {
    async reconcile(bindings: AssignmentCompletionBinding[]) {
      if (disposed) return;
      const next = new Map(bindings.map(binding => [binding.assignmentId, binding]));
      for (const [id, control] of mounted) if (!next.has(id) || !control.host.isConnected || control.host.parentElement !== next.get(id)!.controlSlot) {
        control.host.remove(); mounted.delete(id);
      }
      for (const binding of bindings) if (!mounted.has(binding.assignmentId)) mount(binding);
      if (!stop) { try { stop = subscribe(() => { void refresh(); }); } catch { /* Direct writes still repaint. */ } }
      await refresh();
    },
    dispose() { disposed = true; stop?.(); for (const control of mounted.values()) control.host.remove(); mounted.clear(); },
  };
}
