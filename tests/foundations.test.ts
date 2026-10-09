import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { AssignmentTracker, pageIsStale } from '../src/features/assignments/tracker';
import { BookmarkService, bookmarkUrl } from '../src/features/bookmarks/service';
import { createBookmarkControls } from '../src/features/bookmarks/controls';
import { ThemePreferences, resolveTheme } from '../src/features/theme/preferences';
import { createThemeScope } from '../src/features/theme/tokens';
import { StudyService, buildStudyExport, downloadJson, serializeStudyExport } from '../src/features/study/export';
import { createPdfController } from '../src/features/pdf/controller';
import { applyPdfIntent, pdfControlAvailability } from '../src/features/pdf/controls';
import { createFeatureRuntime } from '../src/features/lifecycle';
import { readAssignments } from '../src/adapters/quest/assignments';
import { readQuestions } from '../src/adapters/quest/questions';
import { readDocuments } from '../src/adapters/quest/pdf';
import { readHistory } from '../src/adapters/quest/history';
import { LocalRepository, decodeState } from '../src/storage/repository';
import { isCommand } from '../src/storage/commands';
import { emptyState, type LocalState } from '../src/shared/models';
import { isQuestion, isStudyExport } from '../src/shared/validation';
import { courseId, questionId, sourceUrl } from '../src/shared/identity';
import { course, assignment, question, now, snapshot, study } from './fixtures/models';
import type { AssignmentAdapter, PageContext, QuestionBinding } from '../src/shared/adapters';

function repository(initial?: unknown) {
  let raw = initial;
  let writes = 0;
  const backend = { read: async () => raw, write: async (state: LocalState) => { raw = JSON.parse(JSON.stringify(state)); writes++; } };
  const repo = new LocalRepository(backend);
  return { repo, backend, raw: () => raw, writes: () => writes };
}
function page() {
  return new JSDOM(readFileSync(new URL('./fixtures/features.html', import.meta.url), 'utf8'), { url: course.url });
}
const context = (): PageContext => ({ url: course.url, observedAt: now, signal: new AbortController().signal });
const pause = () => new Promise(resolve => setTimeout(resolve, 130));

test('stable IDs use verified source IDs, not changing titles or positions', () => {
  assert.equal(courseId('x/y'), 'course:x%2Fy');
  assert.equal(questionId(assignment.id, question.sourceId), question.id);
  assert.throws(() => courseId(' '));
  assert.throws(() => sourceUrl('javascript:alert(1)'));
  assert.throws(() => sourceUrl('https://other.example/student/'));
});

test('local state round trips JSON and survives a new repository instance', async () => {
  const f = repository();
  await f.repo.execute({ kind: 'assignments:cache', snapshot: snapshot() });
  const next = new LocalRepository(f.backend);
  assert.deepEqual((await next.execute({ kind: 'state:read' })).cache.assignments, [assignment]);
  assert.equal(f.writes(), 1);
});

test('concurrent writes are serialized and preserve independent bookmark/preference changes', async () => {
  const f = repository(); const service = new BookmarkService(command => f.repo.execute(command));
  await Promise.all([service.add(course, assignment, question, 'Study note', now), f.repo.execute({ kind: 'theme:set', preference: 'dark' })]);
  const state = await f.repo.execute({ kind: 'state:read' });
  assert.equal(state.bookmarks.length, 1); assert.equal(state.preferences.theme, 'dark');
});

test('corrupt or newer-version storage fails without silently overwriting personal data', async () => {
  const f = repository({ schemaVersion: 99 });
  await assert.rejects(f.repo.execute({ kind: 'theme:set', preference: 'light' }));
  assert.equal(f.writes(), 0); assert.deepEqual(f.raw(), { schemaVersion: 99 });
  assert.deepEqual(decodeState(undefined), emptyState());
});

test('a failed write does not poison the repository queue', async () => {
  let fail = true;
  const f = repository(); const repo = new LocalRepository({ read: f.backend.read, write: async state => {
    if (fail) { fail = false; throw new Error('quota fixture'); } await f.backend.write(state);
  } });
  await assert.rejects(repo.execute({ kind: 'theme:set', preference: 'dark' }));
  assert.equal((await repo.execute({ kind: 'theme:set', preference: 'light' })).preferences.theme, 'light');
});

test('cache preserves other courses and unknown deadline/status without guessing', async () => {
  const f = repository(); const tracker = new AssignmentTracker(command => f.repo.execute(command));
  await tracker.cache(snapshot());
  const second = snapshot(); second.sourceUrl += '?another-page'; second.courses = [{ ...course, id: courseId('another'), sourceId: 'another' }]; second.assignments = [];
  await tracker.cache(second);
  const cache = await tracker.read();
  assert.equal(cache.courses.length, 2); assert.equal(cache.assignments.length, 1);
  assert.equal(cache.assignments[0].deadline.iso, null); assert.equal(cache.assignments[0].completion, 'unknown');
});

test('late page results cannot regress newer snapshots, even from another view', async () => {
  const f = repository(); const tracker = new AssignmentTracker(command => f.repo.execute(command));
  await tracker.cache(snapshot());
  const older = snapshot(); older.observedAt = '2026-10-07T18:00:00.000Z'; older.sourceUrl += '?other-view'; older.assignments[0].title = 'Stale title';
  await tracker.cache(older);
  assert.equal((await tracker.read()).assignments[0].title, assignment.title);
});

test('refresh invalidation has real freshness semantics and does not fetch unseen courses', async () => {
  const f = repository(); const tracker = new AssignmentTracker(command => f.repo.execute(command));
  await tracker.cache(snapshot());
  assert.equal(pageIsStale(await tracker.read(), course.url, Date.parse(now)), false);
  await tracker.requestRefresh('2026-10-08T18:01:00.000Z');
  assert.equal(pageIsStale(await tracker.read(), course.url, Date.parse(now)), true);
  assert.equal(pageIsStale(await tracker.read(), course.url + '?unvisited', Date.parse(now)), true);
});

test('unset DOM adapters explicitly report unsupported and collect nothing', async () => {
  const dom = page(); const f = repository(); const tracker = new AssignmentTracker(command => f.repo.execute(command));
  try {
    for (const read of [readDocuments, readHistory]) assert.equal(read(dom.window.document, context()).status, 'unsupported');
    assert.equal(readQuestions(dom.window.document, context(), null).status, 'unsupported');
    assert.equal(readQuestions(dom.window.document, context()).status, 'unavailable');
    assert.equal(readAssignments(dom.window.document, context(), null).status, 'unsupported');
    assert.equal((await tracker.refreshPage(dom.window.document, context())).status, 'unavailable');
    assert.equal(f.writes(), 0);
  } finally { dom.window.close(); }
});

test('configured fixture adapter collects only its supplied contract and handles missing roots', async () => {
  const dom = page(); const f = repository(); const tracker = new AssignmentTracker(command => f.repo.execute(command));
  const adapter: AssignmentAdapter = { locate: doc => doc.querySelector('#fixture-assignments'), read: () => ({ status: 'ready', value: snapshot() }) };
  try {
    assert.equal((await tracker.refreshPage(dom.window.document, context(), adapter)).status, 'ready');
    dom.window.document.querySelector('#fixture-assignments')!.remove();
    assert.equal((await tracker.refreshPage(dom.window.document, context(), adapter)).status, 'unavailable');
    assert.equal(f.writes(), 1);
  } finally { dom.window.close(); }
});

test('cancelled extraction cannot cache a page result', async () => {
  const dom = page(); const f = repository(); const tracker = new AssignmentTracker(command => f.repo.execute(command));
  const controller = new AbortController(); controller.abort();
  try {
    await tracker.refreshPage(dom.window.document, { ...context(), signal: controller.signal }, { locate: doc => doc.body, read: () => ({ status: 'ready', value: snapshot() }) });
    assert.equal(f.writes(), 0);
  } finally { dom.window.close(); }
});

test('bookmarks upsert, remove, filter, and group with creation-time retention', async () => {
  const f = repository(); const service = new BookmarkService(command => f.repo.execute(command));
  await service.add(course, assignment, question, 'First note', now);
  await service.add(course, assignment, question, 'Updated note', '2026-10-09T18:00:00.000Z');
  const bookmarks = await service.list({ courseId: course.id, assignmentId: assignment.id });
  assert.equal(bookmarks.length, 1); assert.equal(bookmarks[0].createdAt, now); assert.equal(bookmarks[0].note, 'Updated note');
  assert.equal((await service.organized()).get(course.id)?.get(assignment.id)?.length, 1);
  assert.equal((await service.list({ courseId: 'unrelated' })).length, 0);
  await service.remove(question.id); assert.equal((await service.list()).length, 0);
});

test('bookmark navigation uses only verified native anchors; otherwise original URL', async () => {
  const f = repository(); const service = new BookmarkService(command => f.repo.execute(command));
  await service.add(course, assignment, question, '', now);
  const bookmark = (await service.list())[0];
  assert.equal(bookmarkUrl(bookmark), assignment.url);
  assert.equal(bookmarkUrl({ ...bookmark, question: { ...question, anchor: 'native-q-1' } }), assignment.url + '#native-q-1');
  await assert.rejects(service.add(course, { ...assignment, kind: 'assessment' }, question));
});

test('question control reconciliation is idempotent and does not touch submission fields', async () => {
  const dom = page(); const f = repository(); const service = new BookmarkService(command => f.repo.execute(command));
  const root = dom.window.document.querySelector('#fixture-questions')!;
  const slot = root.querySelector<HTMLElement>('#fixture-slot')!;
  const controls = createBookmarkControls(root, service);
  const binding: QuestionBinding = { course, assignment, question, controlSlot: slot };
  try {
    const original = root.querySelector('form')!.outerHTML;
    await controls.reconcile([binding, binding]); await controls.reconcile([binding]);
    assert.equal(root.querySelectorAll('[data-betterquest]').length, 1);
    const button = slot.firstElementChild!.shadowRoot!.querySelector('button')!;
    button.click(); await pause();
    assert.equal((await service.list()).length, 1); assert.equal(button.getAttribute('aria-pressed'), 'true');
    assert.equal(root.querySelector('form')!.outerHTML, original);
    const newSlot = dom.window.document.createElement('span'); slot.replaceWith(newSlot);
    await controls.reconcile([{ ...binding, controlSlot: newSlot }]);
    assert.equal(root.querySelectorAll('[data-betterquest]').length, 1);
    await controls.reconcile([]); assert.equal(root.querySelectorAll('[data-betterquest]').length, 0);
  } finally { controls.dispose(); dom.window.close(); }
});

test('bookmark controls refuse form slots and disconnected roots', async () => {
  const dom = page(); const f = repository(); const service = new BookmarkService(command => f.repo.execute(command));
  const root = dom.window.document.querySelector('#fixture-questions')!; const controls = createBookmarkControls(root, service);
  try {
    await controls.reconcile([{ course, assignment, question, controlSlot: root.querySelector('form')! }]);
    assert.equal(root.querySelectorAll('[data-betterquest]').length, 0);
    const slot = root.querySelector<HTMLElement>('#fixture-slot')!;
    root.remove();
    await controls.reconcile([{ course, assignment, question, controlSlot: slot }]);
    assert.equal(root.querySelectorAll('[data-betterquest]').length, 0);
  } finally { controls.dispose(); dom.window.close(); }
});

test('PDF detection/controller preserves original documents and disables unverified operations', async () => {
  const dom = page(); const element = dom.window.document.querySelector<HTMLAnchorElement>('#fixture-document a')!;
  const original = element.outerHTML;
  const controller = createPdfController({ id: 'fixture-pdf', url: element.href, kind: 'link', element, controlSlot: null });
  try {
    assert.deepEqual(pdfControlAvailability(controller.capabilities), { navigate: false, zoom: false, view: false });
    assert.equal((await controller.navigate(1)).status, 'unsupported');
    assert.equal((await controller.zoom(NaN)).status, 'unavailable');
    assert.equal(controller.openOriginal(), element.href); assert.equal(element.outerHTML, original);
  } finally { controller.dispose(); dom.window.close(); }
});

test('PDF intent dispatcher delegates only to explicitly supplied bridges and cleans up', async () => {
  const dom = page(); const element = dom.window.document.querySelector<HTMLElement>('#fixture-document')!;
  const calls: unknown[] = [];
  const controller = createPdfController({ id: 'fixture', url: assignment.url, kind: 'embed', element, controlSlot: null }, {
    capabilities: { navigation: true, zoom: true, viewing: true }, navigate: async page => { calls.push(page); },
    zoom: async scale => { calls.push(scale); }, view: async mode => { calls.push(mode); }, dispose: () => { calls.push('disposed'); },
  });
  try {
    assert.equal((await applyPdfIntent(controller, { kind: 'navigate', page: 2 })).status, 'ready');
    await applyPdfIntent(controller, { kind: 'zoom', scale: 1.5 }); await applyPdfIntent(controller, { kind: 'view', mode: 'fit-width' });
    controller.dispose(); controller.dispose();
    assert.deepEqual(calls, [2, 1.5, 'fit-width', 'disposed']); assert.equal((await controller.navigate(3)).status, 'unavailable');
  } finally { controller.dispose(); dom.window.close(); }
});

test('study export preserves source metadata and honest unextracted states', () => {
  const record = study(); const value = buildStudyExport([record], now);
  assert.equal(isStudyExport(value), true);
  assert.equal(value.collection.extractedPrompts, 0); assert.equal(value.collection.unextractedPrompts, 1);
  assert.equal(value.questions[0].prompt.text, null); assert.equal(value.sources[0].collectedAt, now);
  assert.deepEqual(JSON.parse(serializeStudyExport(value)), value);
  value.questions[0].number = 'changed'; assert.equal(record.questions[0].number, '1');
});

test('historical capture rejects assessments/current work and submitted answer fields', async () => {
  const f = repository(); const service = new StudyService(command => f.repo.execute(command));
  const record = study();
  await assert.rejects(service.save({ ...record, assignment: { ...assignment, historical: false } }));
  await assert.rejects(service.save({ ...record, assignment: { ...assignment, kind: 'assessment' } }));
  assert.equal(isQuestion({ ...question, submittedAnswer: 'must not persist' }), false);
  await service.save(record); assert.equal((await service.list()).length, 1);
  assert.throws(() => serializeStudyExport({ ...buildStudyExport([], now), schema: 'incorrect' } as never));
});

test('invalid commands, mismatched identities, and false extraction claims are rejected', () => {
  assert.equal(isCommand({ kind: 'theme:set', preference: 'other' }), false);
  assert.equal(isCommand({ kind: 'theme:set', preference: { toString: 'not callable' } }), false);
  assert.equal(isCommand({ kind: 'assignments:cache', snapshot: { ...snapshot(), courses: [{ ...course, sourceId: '\ud800' }] } }), false);
  assert.equal(isCommand({ kind: 'assignments:cache', snapshot: { ...snapshot(), assignments: [{ ...assignment, courseId: 'wrong' }] } }), false);
  assert.equal(isQuestion({ ...question, prompt: { ...question.prompt, status: 'extracted', text: '' } }), false);
  assert.equal(isQuestion({ ...question, solution: { availability: 'unknown', url: assignment.url } }), false);
});

test('JSON download uses a local blob, releases it, and never needs remote services', () => {
  const dom = page(); const document = dom.window.document;
  const urls: string[] = [];
  dom.window.URL.createObjectURL = () => 'blob:fixture'; dom.window.URL.revokeObjectURL = value => { urls.push(value); };
  dom.window.setTimeout = ((callback: () => void) => { callback(); return 1; }) as typeof dom.window.setTimeout;
  let downloaded = '';
  dom.window.HTMLAnchorElement.prototype.click = function () { downloaded = this.download; };
  try {
    downloadJson(document, buildStudyExport([], now), 'study.json');
    assert.equal(downloaded, 'study.json'); assert.deepEqual(urls, ['blob:fixture']);
    assert.equal(document.querySelector('a[download]'), null);
    assert.throws(() => downloadJson(document, {}, '../bad.json'));
  } finally { dom.window.close(); }
});

test('theme preferences persist and system resolves without global Quest overrides', async () => {
  const f = repository(); const preferences = new ThemePreferences(command => f.repo.execute(command));
  assert.equal(await preferences.get(), 'system'); await preferences.set('dark'); assert.equal(await preferences.get(), 'dark');
  assert.equal(resolveTheme('system', true), 'dark'); assert.equal(resolveTheme('light', true), 'light');
});

test('theme tokens opt into a component root and restore existing custom properties on cleanup', () => {
  const dom = page(); const root = dom.window.document.querySelector<HTMLElement>('#fixture-theme')!;
  root.style.setProperty('--bq-text', 'original');
  let listener: (() => void) | undefined;
  const media = { matches: true, addEventListener: (_: string, callback: () => void) => { listener = callback; }, removeEventListener: () => { listener = undefined; } };
  dom.window.matchMedia = () => media as unknown as MediaQueryList;
  try {
    const scope = createThemeScope(root, dom.window as unknown as Window, 'system');
    assert.equal(root.style.getPropertyValue('--bq-surface'), '#182434'); assert.equal(dom.window.document.body.hasAttribute('style'), false);
    scope.update('light'); assert.equal(root.style.getPropertyValue('--bq-surface'), '#ffffff');
    scope.dispose(); assert.equal(root.style.getPropertyValue('--bq-text'), 'original');
    assert.equal(listener, undefined);
    assert.throws(() => createThemeScope(dom.window.document.body, dom.window as unknown as Window, 'dark'));
  } finally { dom.window.close(); }
});

test('feature lifecycle scopes observers, aborts route work, remounts roots, and cleans up', async () => {
  const dom = page(); const document = dom.window.document;
  let refreshes = 0; let disposals = 0; let signal: AbortSignal | undefined;
  const runtime = createFeatureRuntime(document, [{ name: 'fixture', locate: doc => doc.querySelector('#fixture-questions'), mount: () => ({ refresh: ctx => { refreshes++; signal = ctx.signal; }, dispose: () => { disposals++; } }) }]);
  try {
    runtime.reconcile(); await pause(); assert.equal(refreshes, 1);
    document.querySelector('#fixture-assignments')!.append('unrelated'); await pause(); assert.equal(refreshes, 1);
    document.querySelector('#fixture-slot')!.append('changed'); await pause(); assert.equal(refreshes, 2);
    document.querySelector('#fixture-slot')!.setAttribute('class', 'changed'); await pause(); assert.equal(refreshes, 3);
    const oldSignal = signal; dom.window.history.pushState({}, '', '/student/next'); runtime.reconcile(); await pause();
    assert.equal(oldSignal?.aborted, true); assert.equal(disposals, 1);
    document.querySelector('#fixture-questions')!.remove(); runtime.reconcile(); assert.equal(disposals, 2);
    runtime.dispose(); document.body.append('later'); await pause(); assert.equal(refreshes, 4);
  } finally { runtime.dispose(); dom.window.close(); }
});

test('one failed adapter cannot stop other page features or escalate to a body observer', async () => {
  const dom = page(); let mounted = 0;
  const runtime = createFeatureRuntime(dom.window.document, [
    { name: 'bad', locate: () => { throw new Error('Invalid selector fixture'); }, mount: () => { throw new Error('Must not mount'); } },
    { name: 'global', locate: doc => doc.body, mount: () => { throw new Error('Must not mount'); } },
    { name: 'good', locate: doc => doc.querySelector('#fixture-questions'), mount: () => ({ refresh: () => { mounted++; }, dispose() {} }) },
  ]);
  try {
    runtime.reconcile(); await pause();
    assert.equal(mounted, 1); assert.equal(runtime.errors().size, 2);
  } finally { runtime.dispose(); dom.window.close(); }
});

test('published export schema matches serialization keys and resolves every local reference', () => {
  const schema = JSON.parse(readFileSync(new URL('../docs/study-export.schema.json', import.meta.url), 'utf8'));
  const value = buildStudyExport([study()], now);
  assert.deepEqual(Object.keys(value).sort(), Object.keys(schema.properties).sort());
  function inspect(node: unknown): void {
    if (!node || typeof node !== 'object') return;
    if ('$ref' in node) {
      const reference = (node as { $ref: string }).$ref;
      assert.ok(reference.startsWith('#/$defs/'));
      assert.ok(schema.$defs[reference.slice('#/$defs/'.length)]);
    }
    Object.values(node).forEach(inspect);
  }
  inspect(schema);
  assert.equal(schema.$defs.assignment.properties.historical.const, true);
  assert.equal(schema.$defs.question.additionalProperties, false);
});
