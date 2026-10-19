import { assignmentAdapter, readAssignmentCompletionBindings, readCourseIdentity } from '../adapters/quest/assignments';
import { findAssignmentSectionSlot } from '../adapters/quest/assignment-placement';
import { createAssignmentSection, type Subscribe } from '../features/assignments/section';
import { findHomepageSlot } from '../adapters/quest/homepage';
import { createHomepageOverview } from '../features/assignments/homepage';
import { createCourseArtwork } from '../features/courses/artwork';
import { createMeetingTimesEnhancer } from '../features/courses/meeting-times';
import { isCourseEffect, setCourseEffectOverrides, type CourseEffect } from '../features/courses/effects';
import { featurePreferences, type FeaturePreferences } from '../shared/models';
import { createQuestTheme } from '../features/theme/quest';
import { questionAdapter } from '../adapters/quest/questions';
import { pdfAdapter } from '../adapters/quest/pdf';
import { createFeatureRuntime, type FeatureDefinition } from '../features/lifecycle';
import { AssignmentTracker } from '../features/assignments/tracker';
import { createCompletionControls } from '../features/assignments/completion-controls';
import { createAssignmentGroupPreviews } from '../features/assignments/group-preview';
import { createBookmarkControls } from '../features/bookmarks/controls';
import { BookmarkService } from '../features/bookmarks/service';
import { createPdfController } from '../features/pdf/controller';
import { findPdfAssessment, findSlideAssessment, findLockedAssessment, findPracticeSlides, isEmptyResponseTable } from '../adapters/quest/assessment';
import { createPdfAssessmentWorkspace, createSlideAssessmentEnhancement } from '../features/assessment/workspace';
import { createLockedAssessmentEnhancement } from '../features/assessment/locked';
import { createPracticeSlideEnhancement } from '../features/assessment/practice';
import { createAssessmentHeader } from '../features/assessment/header';
import { createCourseDetailsFacelift, collapseCourseCategoriesByDefault, isCourseShowPage } from '../features/courses/details-enhancer';
import { enhanceCourseReviewTab, findReviewPane, disposeReviewSliders } from '../features/courses/review-enhancer';
import { createScrollTopGuard } from '../features/navigation/scroll-top';
import { execute, subscribeLocal, type Execute } from '../shared/client';

/** Composition point: null adapters create no controls, observers, RPCs, or CSS. */
export function startPageFeatures(document: Document, window: Window, run: Execute = execute, subscribe: Subscribe = subscribeLocal) {
  const definitions: FeatureDefinition[] = [];
  let assignmentSection: ReturnType<typeof createAssignmentSection> | undefined;
  let homepage: ReturnType<typeof createHomepageOverview> | undefined;
  let enabled: FeaturePreferences = { assignments: true, bookmarks: true };
  let ready = false, disposed = false, preferenceGeneration = 0;
  const theme = createQuestTheme(document, window);
  const scrollTop = createScrollTopGuard(document, window);
  if (assignmentAdapter) {
    const adapter = assignmentAdapter;
    const tracker = new AssignmentTracker(run);
    definitions.push({ name: 'assignments', locate: doc => ready && enabled.assignments ? adapter.locate(doc) : null,
      // `style` is required so DataTables "processing" display toggles re-scan.
      // Collapse clears Bootstrap height/collapsing so those writes cannot pump
      // the page taller on every animation frame.
      attributeFilter: ['class', 'href', 'data-order', 'style'],
      mount: root => {
        let fingerprint = '';
        const completionControls = createCompletionControls(root, run, subscribe);
        const groupPreviews = createAssignmentGroupPreviews(root, run, subscribe);
        return {
          refresh: async context => {
            const root = adapter.locate(document);
            if (!root) return;
            const result = adapter.read(root, context);
            if (result.status !== 'ready' || context.signal.aborted) return;
            // Quest ships every assignment category open and re-opens them on each tab visit.
            // This runs with the assignments themselves, so the tab is always collapsed.
            collapseCourseCategoriesByDefault(document);
            // Page previews need the current snapshot and saved completion choices,
            // not a successful cache write or completion-control refresh.
            await groupPreviews.reconcile(result.value);
            if (context.signal.aborted) return;
            const signature = JSON.stringify({ ...result.value, observedAt: '' });
            if (signature !== fingerprint) {
              await tracker.cache(result.value);
              if (!context.signal.aborted) fingerprint = signature;
            }
            if (!context.signal.aborted) await completionControls.reconcile(readAssignmentCompletionBindings(root, context));
          }, dispose: () => { completionControls.dispose(); groupPreviews.dispose(); },
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
  definitions.push({ name: 'course-artwork', locate: doc => findHomepageSlot(doc)?.table || null,
    attributeFilter: ['href', 'src', 'aria-label'], mount: root => {
      const artwork = createCourseArtwork(root);
      return { refresh: () => artwork.reconcile(), dispose: artwork.dispose };
    },
  });
  definitions.push({ name: 'meeting-times', locate: doc => findHomepageSlot(doc)?.table || null,
    mount: root => {
      const enhancer = createMeetingTimesEnhancer(root as HTMLTableElement);
      return { refresh: () => enhancer.reconcile(), dispose: enhancer.dispose };
    },
  });
  definitions.push({
    name: 'course-details-facelift',
    locate: doc => {
      if (!isCourseShowPage(doc.URL)) return null;
      return doc.querySelector<HTMLElement>('#target') || doc.querySelector<HTMLElement>('#student-course-info-header') || null;
    },
    mount: root => {
      const facelift = createCourseDetailsFacelift(root as HTMLElement, run);
      return { refresh: () => facelift.reconcile(), dispose: facelift.dispose };
    },
  });
  definitions.push({
    name: 'course-review-tab',
    locate: doc => {
      if (!isCourseShowPage(doc.URL) && !doc.URL.includes('/review')) return null;
      return findReviewPane(doc);
    },
    attributeFilter: ['class', 'style', 'aria-selected', 'hidden'],
    observeOwnedRemovals: true,
    mount: root => {
      enhanceCourseReviewTab(root.ownerDocument);
      return {
        refresh: () => {
          enhanceCourseReviewTab(root.ownerDocument);
        },
        dispose: () => {
          disposeReviewSliders(root.ownerDocument);
          const existing = root.querySelector('[data-betterquest="review-dashboard"]');
          existing?.remove();
          root.querySelectorAll<HTMLElement>('[data-betterquest-review-raw]').forEach(el => {
            el.style.removeProperty('display');
            el.removeAttribute('data-betterquest-review-raw');
          });
        },
      };
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
  definitions.push({ name: 'assessment-header',
    locate: doc => new URL(doc.URL).pathname.startsWith('/student/instances/')
      ? doc.querySelector<HTMLElement>('#main-content') : null,
    attributeFilter: ['href'], mount: root => {
      const header = createAssessmentHeader(root as HTMLElement);
      return { refresh: header.reconcile, dispose: header.dispose };
    },
  });
  definitions.push({ name: 'pdf-assessment-workspace', locate: doc => {
      const found = findPdfAssessment(doc);
      // Past-due / locked quizzes still ship an empty DataTables shell + PDF
      // chrome. Enhancing that shell hides the native page with nothing to show.
      if (!found || isEmptyResponseTable(found.table)) return null;
      return found.root;
    },
    attributeFilter: ['class', 'value', 'disabled', 'hidden'], observeOwnedRemovals: true, mount: root => {
      const workspace = createPdfAssessmentWorkspace(root as HTMLElement, { run });
      return { refresh: () => workspace.reconcile(), dispose: workspace.dispose };
    },
  });
  definitions.push({ name: 'locked-assessment', locate: doc => findLockedAssessment(doc),
    attributeFilter: ['class', 'value', 'disabled', 'hidden'], observeOwnedRemovals: true, mount: root => {
      const locked = createLockedAssessmentEnhancement(root as HTMLElement);
      return { refresh: () => locked.reconcile(), dispose: locked.dispose };
    },
  });
  definitions.push({ name: 'practice-slides', locate: doc => findPracticeSlides(doc),
    attributeFilter: ['class', 'aria-selected', 'hidden'], observeOwnedRemovals: true, mount: root => {
      const practice = createPracticeSlideEnhancement(root as HTMLElement);
      return { refresh: () => practice.reconcile(), dispose: practice.dispose };
    },
  });
  definitions.push({ name: 'slide-assessment-workspace', locate: doc => findSlideAssessment(doc),
    attributeFilter: ['class', 'checked', 'disabled', 'hidden'], mount: root => {
      const workspace = createSlideAssessmentEnhancement(root as HTMLElement);
      return { refresh: () => workspace.reconcile(), dispose: workspace.dispose };
    },
  });
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
      const effectOverrides: Record<string, CourseEffect> = {};
      for (const [key, value] of Object.entries(state.preferences.courseEffects || {})) {
        if (isCourseEffect(value)) effectOverrides[key] = value;
      }
      setCourseEffectOverrides(effectOverrides);
      if (enabled.animations === false) document.documentElement.dataset.betterquestAnimations = 'disabled';
      else document.documentElement.removeAttribute('data-betterquest-animations');
      if (enabled.celebrations === false) document.documentElement.dataset.betterquestCelebrations = 'disabled';
      else document.documentElement.removeAttribute('data-betterquest-celebrations');
      if (enabled.whimsy) document.documentElement.dataset.betterquestWhimsy = 'enabled';
      else document.documentElement.removeAttribute('data-betterquest-whimsy');
      runtime.reconcile();
      runtime.refresh(['course-artwork', 'course-details-facelift', 'bookmarks']);
    } catch { /* Do not mount storage-backed features with unknown preferences. */ }
  }
  const reconcile = () => {
    theme.reconcile();
    runtime.reconcile();
    scrollTop.reconcile();
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
    unsubscribe?.(); runtime.dispose(); theme.dispose(); scrollTop.dispose();
    document.documentElement.removeAttribute('data-betterquest-animations');
    document.documentElement.removeAttribute('data-betterquest-celebrations');
    document.documentElement.removeAttribute('data-betterquest-whimsy');
  } };
}
