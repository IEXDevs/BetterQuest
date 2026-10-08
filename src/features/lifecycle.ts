import type { PageContext } from '../shared/adapters';
import { isStudentPage } from '../shared/messages';

export interface MountedFeature {
  refresh(context: PageContext): Promise<void> | void;
  dispose(): void;
}
export interface FeatureDefinition {
  name: string;
  locate(document: Document): Element | null;
  mount(root: Element): MountedFeature;
}

/** Observes only a verified feature root; never polls or patches Quest functions. */
export function observeScoped(root: Element, callback: () => void): () => void {
  const view = root.ownerDocument.defaultView!;
  let timer: number | undefined;
  const observer = new view.MutationObserver(records => {
    const relevant = records.some(record => {
      const target = record.target.nodeType === 1 ? record.target as Element : record.target.parentElement;
      if (target?.closest('[data-betterquest]')) return false;
      const nodes = [...record.addedNodes, ...record.removedNodes];
      return record.type !== 'childList' || nodes.length === 0 || nodes.some(n => n.nodeType !== 1 || !(n as Element).matches('[data-betterquest]'));
    });
    if (!relevant) return;
    if (timer !== undefined) view.clearTimeout(timer);
    timer = view.setTimeout(() => { timer = undefined; callback(); }, 80);
  });
  observer.observe(root, {
    childList: true, subtree: true, characterData: true, attributes: true,
    attributeFilter: ['class', 'href', 'src', 'hidden', 'aria-hidden', 'datetime'],
  });
  return () => { observer.disconnect(); if (timer !== undefined) view.clearTimeout(timer); };
}

export function createFeatureRuntime(document: Document, definitions: FeatureDefinition[] = []) {
  const active = new Map<string, { root: Element; feature: MountedFeature; abort: AbortController; stop: () => void }>();
  const errors = new Map<string, string>();
  let url = document.URL;
  let disposed = false;

  function remove(name: string) {
    const entry = active.get(name);
    if (entry) { entry.abort.abort(); entry.stop(); entry.feature.dispose(); active.delete(name); }
  }

  function refresh(name: string) {
    const entry = active.get(name);
    if (!entry) return;
    const context: PageContext = { url: document.URL, observedAt: new Date().toISOString(), signal: entry.abort.signal };
    void Promise.resolve().then(() => {
      if (!context.signal.aborted) return entry.feature.refresh(context);
    }).then(() => { if (!context.signal.aborted) errors.delete(name); }).catch(error => {
      if (!context.signal.aborted) errors.set(name, error instanceof Error ? error.message : 'Feature refresh failed.');
    });
  }

  return {
    reconcile() {
      if (disposed) return;
      if (document.URL !== url || !isStudentPage(document.URL)) { [...active.keys()].forEach(remove); url = document.URL; }
      if (!isStudentPage(document.URL)) return;
      for (const definition of definitions) {
        let root: Element | null;
        try {
          root = definition.locate(document);
          if (root && (!root.isConnected || root.ownerDocument !== document || root === document.body || root === document.documentElement)) {
            throw new Error('Feature requires a connected, scoped component root.');
          }
        } catch (error) {
          remove(definition.name);
          errors.set(definition.name, error instanceof Error ? error.message : 'Feature detection failed.');
          continue;
        }
        if (active.get(definition.name)?.root === root) continue;
        remove(definition.name);
        if (!root) continue;
        try {
          const feature = definition.mount(root);
          const abort = new AbortController();
          active.set(definition.name, { root, feature, abort, stop: observeScoped(root, () => refresh(definition.name)) });
          refresh(definition.name);
        } catch (error) { errors.set(definition.name, error instanceof Error ? error.message : 'Feature mount failed.'); }
      }
    },
    refresh: (names?: string[]) => [...active.keys()].filter(name => !names || names.includes(name)).forEach(refresh),
    errors: () => new Map(errors),
    dispose() { disposed = true; [...active.keys()].forEach(remove); errors.clear(); },
  };
}
