import { assignmentAdapter } from '../adapters/quest/assignments';
import { questionAdapter } from '../adapters/quest/questions';
import { pdfAdapter } from '../adapters/quest/pdf';
import { themeAdapter } from '../adapters/quest/theme';
import { createFeatureRuntime, type FeatureDefinition } from '../features/lifecycle';
import { AssignmentTracker } from '../features/assignments/tracker';
import { createBookmarkControls } from '../features/bookmarks/controls';
import { createPdfController } from '../features/pdf/controller';
import { ThemePreferences } from '../features/theme/preferences';
import { createThemeScope } from '../features/theme/tokens';
import { subscribeLocal } from '../shared/client';

/** Composition point: null adapters create no controls, observers, RPCs, or CSS. */
export function startPageFeatures(document: Document, window: Window) {
  const definitions: FeatureDefinition[] = [];
  if (assignmentAdapter) {
    const adapter = assignmentAdapter;
    const tracker = new AssignmentTracker();
    definitions.push({ name: 'assignments', locate: doc => adapter.locate(doc), mount: () => ({
      refresh: async context => { await tracker.refreshPage(document, context, adapter); }, dispose() {},
    }) });
  }
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
  // Never re-collect assignments in response to the cache write itself.
  const needsChanges = definitions.some(definition => ['bookmarks', 'theme'].includes(definition.name));
  const unsubscribe = needsChanges ? subscribeLocal(() => runtime.refresh(['bookmarks', 'theme'])) : () => {};
  return { reconcile: runtime.reconcile, dispose: () => { unsubscribe(); runtime.dispose(); } };
}
