import type { PageContext, QuestionAdapter, QuestionBinding } from '../../shared/adapters';
import { notConfigured } from '../../shared/adapters';
import type { Extraction } from '../../shared/models';

/** No title/position-derived IDs or speculative question selectors. */
export const questionAdapter: QuestionAdapter | null = null;

export function readQuestions(document: Document, context: PageContext, adapter = questionAdapter): Extraction<QuestionBinding[]> {
  if (!adapter) return notConfigured('Question bookmarking');
  const root = adapter.locate(document);
  return root ? adapter.read(root, context) : { status: 'unavailable', reason: 'Verified homework question container is absent.' };
}
