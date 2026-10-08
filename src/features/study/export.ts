import type { HistoryAdapter, PageContext } from '../../shared/adapters';
import type { StudyExport, StudyRecord } from '../../shared/models';
import { isStudyExport, isStudyRecord, timestamp } from '../../shared/validation';
import { readHistory } from '../../adapters/quest/history';
import { execute, type Execute } from '../../shared/client';

export class StudyService {
  constructor(private run: Execute = execute) {}
  async save(record: StudyRecord) {
    if (!isStudyRecord(record)) throw new Error('Only verified, accessible historical homework can be saved.');
    return this.run({ kind: 'study:save', record });
  }
  async list() { return (await this.run({ kind: 'state:read' })).study; }
  async collect(document: Document, context: PageContext, adapter?: HistoryAdapter | null) {
    const result = readHistory(document, context, adapter);
    if (result.status === 'ready' && !context.signal.aborted) await this.save(result.value);
    return context.signal.aborted ? { status: 'unavailable' as const, reason: 'Collection was cancelled.' } : result;
  }
}

export function buildStudyExport(records: StudyRecord[], exportedAt = new Date().toISOString()): StudyExport {
  if (!timestamp(exportedAt) || !records.every(isStudyRecord)) throw new Error('Invalid study export data.');
  const courses = new Map(records.map(record => [record.course.id, record.course]));
  const assignments = new Map(records.map(record => [record.assignment.id, record.assignment]));
  const questions = new Map(records.flatMap(record => record.questions.map(question => [question.id, question] as const)));
  const value: StudyExport = {
    schema: 'betterquest.study.v1', exportedAt, courses: [...courses.values()], assignments: [...assignments.values()], questions: [...questions.values()],
    sources: records.map(record => ({ courseId: record.course.id, assignmentId: record.assignment.id, url: record.sourceUrl, collectedAt: record.collectedAt })),
    collection: { records: records.length, extractedPrompts: [...questions.values()].filter(q => q.prompt.status === 'extracted').length,
      unextractedPrompts: [...questions.values()].filter(q => q.prompt.status !== 'extracted').length },
  };
  return structuredClone(value);
}

export function serializeStudyExport(value: StudyExport): string {
  if (!isStudyExport(value)) throw new Error('Invalid study export.');
  return JSON.stringify(value, null, 2);
}

/** User-triggered download; no downloads permission or remote service. */
export function downloadJson(document: Document, value: unknown, filename: string): void {
  if (!/^[a-zA-Z0-9._-]+\.json$/.test(filename)) throw new Error('Expected a plain JSON filename.');
  const view = document.defaultView!;
  const blob = new view.Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
  const url = view.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename; link.hidden = true;
  document.body.append(link);
  try { link.click(); } finally { link.remove(); view.setTimeout(() => view.URL.revokeObjectURL(url), 1000); }
}
