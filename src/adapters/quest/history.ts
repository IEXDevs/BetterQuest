import type { HistoryAdapter, PageContext } from '../../shared/adapters';
import { notConfigured } from '../../shared/adapters';
import type { Extraction, StudyRecord } from '../../shared/models';

/** Visible historical homework only; no fetching, crawling, forms, or hidden solutions. */
export const historyAdapter: HistoryAdapter | null = null;

export function readHistory(document: Document, context: PageContext, adapter = historyAdapter): Extraction<StudyRecord> {
  if (!adapter) return notConfigured('Study collection');
  const root = adapter.locate(document);
  return root ? adapter.read(root, context) : { status: 'unavailable', reason: 'Verified historical homework container is absent.' };
}
