import type { AssignmentAdapter, PageContext } from '../../shared/adapters';
import { notConfigured } from '../../shared/adapters';
import type { AssignmentSnapshot, Extraction } from '../../shared/models';

/** Configure only after inspecting actual homepage/course assignment rows. */
export const assignmentAdapter: AssignmentAdapter | null = null;

export function readAssignments(document: Document, context: PageContext, adapter = assignmentAdapter): Extraction<AssignmentSnapshot> {
  if (!adapter) return notConfigured('Assignment tracking');
  const root = adapter.locate(document);
  return root ? adapter.read(root, context) : { status: 'unavailable', reason: 'Verified assignment container is absent on this page.' };
}
