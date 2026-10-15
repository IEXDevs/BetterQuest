import type { AssignmentAdapter, PageContext } from '../../shared/adapters';
import type { AssignmentSnapshot, Extraction, LocalState } from '../../shared/models';
import { isSnapshot } from '../../shared/validation';
import { readAssignments } from '../../adapters/quest/assignments';
import { execute, type Execute } from '../../shared/client';

export class AssignmentTracker {
  constructor(private run: Execute = execute) {}

  async cache(snapshot: AssignmentSnapshot): Promise<LocalState> {
    if (!isSnapshot(snapshot)) throw new Error('Invalid assignment snapshot.');
    return this.run({ kind: 'assignments:cache', snapshot });
  }

  async read() { return (await this.run({ kind: 'state:read' })).cache; }

  async requestRefresh(now = new Date().toISOString()) {
    // Invalidate freshness locally. Course pages are opened on demand by Sync.
    return this.run({ kind: 'assignments:refresh', requestedAt: now });
  }

  async refreshPage(document: Document, context: PageContext, adapter?: AssignmentAdapter | null): Promise<Extraction<AssignmentSnapshot>> {
    const result = readAssignments(document, context, adapter);
    if (result.status === 'ready' && !context.signal.aborted) await this.cache(result.value);
    return context.signal.aborted ? { status: 'unavailable', reason: 'Page collection was cancelled.' } : result;
  }
}

export function pageIsStale(cache: LocalState['cache'], sourceUrl: string, now = Date.now(), maxAge = 5 * 60_000): boolean {
  const page = cache.pages.find(page => page.sourceUrl === sourceUrl);
  return !page || now - Date.parse(page.observedAt) >= maxAge ||
    (cache.refreshRequestedAt !== null && Date.parse(cache.refreshRequestedAt) > Date.parse(page.observedAt));
}
