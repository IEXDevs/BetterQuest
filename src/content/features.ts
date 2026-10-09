import { assignmentAdapter, readCourseIdentity } from '../adapters/quest/assignments';
import { findAssignmentSectionSlot } from '../adapters/quest/assignment-placement';
import { createAssignmentSection, type Subscribe } from '../features/assignments/section';
import { findHomepageSlot } from '../adapters/quest/homepage';
import { createHomepageOverview } from '../features/assignments/homepage';
import { featurePreferences, type FeaturePreferences } from '../shared/models';
import { createQuestTheme } from '../features/theme/quest';
import { questionAdapter } from '../adapters/quest/questions';
import { pdfAdapter } from '../adapters/quest/pdf';
import { createFeatureRuntime, type FeatureDefinition } from '../features/lifecycle';
import { AssignmentTracker } from '../features/assignments/tracker';
import { createBookmarkControls } from '../features/bookmarks/controls';
import { BookmarkService } from '../features/bookmarks/service';
import { createPdfController } from '../features/pdf/controller';
import { execute, subscribeLocal, type Execute } from '../shared/client';

/** Composition point: null adapters create no controls, observers, RPCs, or CSS. */
export function startPageFeatures(document: Document, window: Window, run: Execute = execute, subscribe: Subscribe = subscribeLocal) {
  const definitions: FeatureDefinition[] = [];
  let assignmentSection: ReturnType<typeof createAssignmentSection> | undefined;
  let homepage: ReturnType<typeof createHomepageOverview> | undefined;
  let enabled: FeaturePreferences = { assignments: true, bookmarks: true };
  let ready = false, disposed = false, preferenceGeneration = 0;
  const theme = createQuestTheme(document, window);
  if (assignmentAdapter) {
    const adapter = assignmentAdapter;
    const tracker = new AssignmentTracker(run);
    definitions.push({ name: 'assignments', locate: doc => ready && enabled.assignments ? adapter.locate(doc) : null,
      attributeFilter: ['class', 'href', 'data-order', 'style'],
      mount: () => {
        let fingerprint = '';
        return {
          refresh: async context => {
            const root = adapter.locate(document);
            if (!root) return;
            const result = adapter.read(root, context);
            if (result.status !== 'ready' || context.signal.aborted) return;
            const signature = JSON.stringify({ ...result.value, observedAt: '' });
            if (signature === fingerprint) return;
            await tracker.cache(result.value);
            if (!context.signal.aborted) fingerprint = signature;
          }, dispose() {},
        };
      },
    });
  }
  definitions.push({
    name: 'assignment-section',
    locate: doc => ready && enabled.assignments ? findAssignmentSectionSlot(doc)?.root || null : null,
    mount: root => {
      const section = createAssignmentSection(root, run, subscribe);
      assignmentSection = section;
      return {
        refresh: async context => {
          const course = readCourseIdentity(root, context);
          if (course && !context.signal.aborted) await section.refresh(course);
        },
        dispose: () => { section.dispose(); if (assignmentSection === section) assignmentSection = undefined; },
      };
    },
  });
  definitions.push({ name: 'homepage-overview', locate: doc => ready && enabled.assignments ? findHomepageSlot(doc)?.root || null : null,
    mount: root => {
      const overview = createHomepageOverview(root, run, subscribe); homepage = overview;
      return { refresh: async context => { if (!context.signal.aborted) await overview.refresh(); },
        dispose: () => { overview.dispose(); if (homepage === overview) homepage = undefined; } };
    },
  });
  if (questionAdapter) {
    const adapter = questionAdapter;
    definitions.push({ name: 'bookmarks', locate: doc => ready && enabled.bookmarks ? adapter.locate(doc) : null,
      attributeFilter: ['class', 'id', 'data-id', 'data-order'], observeOwnedRemovals: true, mount: root => {
      const controls = createBookmarkControls(root, new BookmarkService(run));
      return {
        refresh: async context => {
          const state = await run({ kind: 'state:read' });
          if (context.signal.aborted) return;
          const result = adapter.read(root, context, state.cache);
          if (!context.signal.aborted) await controls.reconcile(result.status === 'ready' ? result.value : []);
        }, dispose: controls.dispose,
      };
    } });
  }
  if (pdfAdapter) {
    const adapter = pdfAdapter;
    definitions.push({ name: 'pdf', locate: doc => adapter.locate(doc), mount: root => {
      let controllers: ReturnType<typeof createPdfController>[] = [];
      return {
        refresh: context => {
          controllers.forEach(controller => controller.dispose());
          controllers = [];
          const result = adapter.read(root, context);
          if (result.status === 'ready') controllers = result.value.map(doc => createPdfController(doc));
          // Detection only. No bridge, document replacement, or controls by default.
        }, dispose: () => controllers.forEach(controller => controller.dispose()),
      };
    } });
  }
  // Historical collection/export stays explicitly user-triggered through StudyService.
  const runtime = createFeatureRuntime(document, definitions);
  const manualAbort = new AbortController();
  const refreshAssignments = async () => {
    const result = await new AssignmentTracker(run).refreshPage(document, {
      url: document.URL, observedAt: new Date().toISOString(), signal: manualAbort.signal,
    }, assignmentAdapter);
    if (result.status !== 'ready') throw new Error(result.reason);
  };
  // Never re-collect assignments in response to the cache write itself.
  let unsubscribe: (() => void) | undefined;
  async function refreshPreferences() {
    const current = ++preferenceGeneration;
    try {
      const state = await run({ kind: 'state:read' });
      if (disposed || current !== preferenceGeneration) return;
      enabled = featurePreferences(state.preferences); ready = true;
      theme.update(state.preferences.theme);
      runtime.reconcile();
      runtime.refresh(['bookmarks']);
    } catch { /* Do not mount storage-backed features with unknown preferences. */ }
  }
  const reconcile = () => {
    theme.reconcile();
    runtime.reconcile();
    if (!unsubscribe) { try { unsubscribe = subscribe(() => { void refreshPreferences(); }); } catch { /* Page navigation still reconciles existing controls. */ } }
    if (!ready) void refreshPreferences();
  };
  const preferencesChanged = () => { void refreshPreferences(); };
  window.addEventListener('betterquest:preferences-changed', preferencesChanged);
  window.addEventListener('focus', preferencesChanged);
  return { reconcile, refreshAssignments,
    focusAssignments: () => assignmentSection?.focus() || homepage?.focus() || false,
    hasAssignmentSection: () => Boolean(assignmentSection?.isConnected() || homepage),
    darkAvailable: theme.available,
    dispose: () => {
    disposed = true; preferenceGeneration++;
    window.removeEventListener('betterquest:preferences-changed', preferencesChanged);
    window.removeEventListener('focus', preferencesChanged);
    manualAbort.abort();
    unsubscribe?.(); runtime.dispose(); theme.dispose();
  } };
}
