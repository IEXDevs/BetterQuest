import { assignmentAdapter, readCourseIdentity } from '../adapters/quest/assignments';
import { findAssignmentSectionSlot } from '../adapters/quest/assignment-placement';
import { createAssignmentSection, type Subscribe } from '../features/assignments/section';
import { questionAdapter } from '../adapters/quest/questions';
import { pdfAdapter } from '../adapters/quest/pdf';
import { themeAdapter } from '../adapters/quest/theme';
import { createFeatureRuntime, type FeatureDefinition } from '../features/lifecycle';
import { AssignmentTracker } from '../features/assignments/tracker';
import { createBookmarkControls } from '../features/bookmarks/controls';
import { createPdfController } from '../features/pdf/controller';
import { ThemePreferences } from '../features/theme/preferences';
import { createThemeScope } from '../features/theme/tokens';
import { execute, subscribeLocal, type Execute } from '../shared/client';

/** Composition point: null adapters create no controls, observers, RPCs, or CSS. */
export function startPageFeatures(document: Document, window: Window, run: Execute = execute, subscribe: Subscribe = subscribeLocal) {
  const definitions: FeatureDefinition[] = [];
  let assignmentSection: ReturnType<typeof createAssignmentSection> | undefined;
  if (assignmentAdapter) {
    const adapter = assignmentAdapter;
    const tracker = new AssignmentTracker(run);
    definitions.push({ name: 'assignments', locate: doc => adapter.locate(doc),
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
    locate: doc => findAssignmentSectionSlot(doc)?.root || null,
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
  if (questionAdapter) {
    const adapter = questionAdapter;
    definitions.push({ name: 'bookmarks', locate: doc => adapter.locate(doc), mount: root => {
      const controls = createBookmarkControls(root);
      return {
        refresh: async context => {
          const result = adapter.read(root, context);
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
  if (themeAdapter) {
    const adapter = themeAdapter;
    const preferences = new ThemePreferences();
    definitions.push({ name: 'theme', locate: doc => adapter.locate(doc), mount: root => {
      let scopes: ReturnType<typeof createThemeScope>[] = [];
      return {
        refresh: async context => {
          const preference = await preferences.get();
          if (context.signal.aborted) return;
          scopes.forEach(scope => scope.dispose());
          scopes = [];
          try {
            for (const element of adapter.roots(root)) scopes.push(createThemeScope(element, window, preference));
          } catch (error) {
            scopes.forEach(scope => scope.dispose()); scopes = [];
            throw error;
          }
        }, dispose: () => scopes.forEach(scope => scope.dispose()),
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
  const needsChanges = definitions.some(definition => ['bookmarks', 'theme'].includes(definition.name));
  const unsubscribe = needsChanges ? subscribeLocal(() => runtime.refresh(['bookmarks', 'theme'])) : () => {};
  return { reconcile: runtime.reconcile, refreshAssignments,
    focusAssignments: () => assignmentSection?.focus() || false,
    hasAssignmentSection: () => assignmentSection?.isConnected() || false,
    dispose: () => {
    manualAbort.abort();
    unsubscribe(); runtime.dispose();
  } };
}
