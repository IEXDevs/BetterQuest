import type { PageContext, QuestionAdapter, QuestionBinding } from '../../shared/adapters';
import { notConfigured } from '../../shared/adapters';
import type { Extraction, LocalState, Question } from '../../shared/models';
import { questionId } from '../../shared/identity';

/** Selectors and row shape verified against the supplied response-table HTML. */
export const QUESTION_SELECTORS = {
  table: '.dataTables_scrollBody > table[id^="instance-table-courseuserassignment_"]',
  rows: ':scope > tbody > tr.instanceitempart[data-id]',
} as const;

export function findResponseTable(root: Element): HTMLTableElement | null {
  return root.querySelector<HTMLTableElement>(':scope > table[id^="instance-table-courseuserassignment_"]');
}

export function emptyResponseCell(cell: Element): boolean {
  return [...cell.childNodes].every(node => node.nodeType === 8 ||
    (node.nodeType === 3 && !(node.textContent || '').trim()) ||
    (node.nodeType === 1 && (node as Element).matches('[data-betterquest="bookmark-control"]')));
}

export function readResponseQuestions(root: Element, context: PageContext, cache?: LocalState['cache']): Extraction<QuestionBinding[]> {
  if (context.signal.aborted) return { status: 'unavailable', reason: 'Question collection cancelled.' };
  const table = findResponseTable(root);
  const sourceId = table?.id.match(/^instance-table-(courseuserassignment_\d+)$/)?.[1];
  if (!table || !sourceId) return { status: 'unavailable', reason: 'Verified Quest response table is missing.' };
  const assignments = cache?.assignments.filter(assignment => assignment.sourceId === sourceId) || [];
  if (assignments.length !== 1) return { status: 'unavailable', reason: 'Visit the course Assignments page first so its course and assignment can be identified.' };
  const assignment = assignments[0];
  const course = cache?.courses.find(course => course.id === assignment.courseId);
  if (!course || assignment.kind === 'assessment') return { status: 'unavailable', reason: 'Course context is missing or this is a known assessment.' };
  const headers = [...table.querySelectorAll(':scope > thead > tr:first-child > th')];
  // The supplied table has six columns with a blank final action column.
  if (headers.length !== 6 || headers[5].textContent?.trim()) return { status: 'unavailable', reason: 'Response-table action column is not recognized.' };
  const bindings: QuestionBinding[] = [];
  const seen = new Set<string>();
  for (const row of table.querySelectorAll<HTMLTableRowElement>(QUESTION_SELECTORS.rows)) {
    const sourceId = row.getAttribute('data-id');
    const cells = [...row.querySelectorAll<HTMLTableCellElement>(':scope > td')];
    const number = cells[0]?.textContent?.trim().match(/^(\d+)\.$/)?.[1];
    if (!sourceId || !/^cuaip_\d+$/.test(sourceId) || !number || cells.length !== 6 || !emptyResponseCell(cells[5])) continue;
    const id = questionId(assignment.id, sourceId);
    if (seen.has(id)) continue;
    seen.add(id);
    const question: Question = {
      id, sourceId, courseId: course.id, assignmentId: assignment.id, number,
      url: assignment.url, anchor: null,
      prompt: { status: 'not-extracted', text: null, format: 'plain-text', reason: 'Response-table bookmark only; PDF prompt text is not extracted.' },
      answer: { availability: 'unknown', url: null }, solution: { availability: 'unknown', url: null },
    };
    bindings.push({ course, assignment, question, controlSlot: cells[5], slotKind: 'response-cell' });
  }
  return { status: 'ready', value: bindings };
}

export const questionAdapter: QuestionAdapter = {
  locate: document => document.querySelector(QUESTION_SELECTORS.table)?.parentElement || null,
  read: readResponseQuestions,
};

export function readQuestions(document: Document, context: PageContext, adapter: QuestionAdapter | null = questionAdapter, cache?: LocalState['cache']): Extraction<QuestionBinding[]> {
  if (!adapter) return notConfigured('Question bookmarking');
  const root = adapter.locate(document);
  return root ? adapter.read(root, context, cache) : { status: 'unavailable', reason: 'Verified question response container is absent.' };
}
