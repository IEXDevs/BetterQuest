# V1 foundations

Assignment presentation remains in the empty course-info column after Meets. Response-table bookmarks are now enabled, and the navbar button opens grouped Saved Questions in normal page flow after the verified navbar. Its Upcoming shortcut still focuses the course summary without forcing the collapse open. PDF enhancement, study capture, and theme adapters remain disabled.

## Implemented versus disabled

| Feature | Working infrastructure | Awaiting inspected Quest DOM |
| --- | --- | --- |
| Assignments | Existing parser/cache/storage reused; next three incomplete assignments in an existing course-info column; linked names/deadlines; native View all; course-only/unscanned note | Verified homepage placement/course discovery, internal course/term IDs, semester rollover, additional layouts and live Chrome testing |
| Bookmarks | Verified response-table/row IDs; compact filled/outlined icons; existing persistent service; cloned/recycled row reconciliation; grouped Saved Questions; original assignment links | Slide/other layouts, additional assessment-type evidence, live Chrome visual checks |
| PDF | Detection adapter contract; capability-gated navigation/zoom/view intent dispatcher; bridge disposal; original-source URLs | Actual link/embed markup, safe controls slot, verified bridge to the document renderer. No controls or replacements are enabled |
| Study export | Historical-homework validation; explicit save/collect API; JSON export builder/serializer/download; schema; source provenance; extracted/not-extracted counts; answer/solution **availability metadata** | Historical homework eligibility, visible prompt/math/diagram representation, released answer/solution links, existing export insertion slot |
| Theme | Persistent light/dark/system preferences; system resolution; component-local custom-property tokens; media-query updates and restoration on cleanup | Verified component roots and CSS that consumes the tokens. No existing Quest component is recolored |

## Modules

```text
src/
  content/
    navigation.ts          Existing authenticated navbar selector/placement
    ui.ts                  Existing scoped navbar button
    integration.ts         Existing navigation lifecycle + feature-host hooks
    features.ts            Assignment collection and response-table bookmarking
  adapters/quest/
    assignments.ts         Verified #target/#tabs-elements assignment parser
    assignment-placement.ts Verified empty column after Meets; no fallback card
    questions.ts           Verified response-table IDs and empty final slots
    saved-questions-placement.ts Verified navbar sibling for the inline view
    pdf.ts                 PDF source/document boundary (null until inspected)
    history.ts             Accessible historical homework boundary (null)
    theme.ts               Verified component roots (null)
  features/
    lifecycle.ts           Scoped observers, root replacement, abort/dispose
    assignments/tracker.ts Cache, freshness, refresh orchestration
    assignments/section.ts Three-item course-info summary and native View all
    assignments/view-model.ts Pure filtering, sorting, deadlines, and coverage
    bookmarks/service.ts   Bookmark CRUD/filter/group/source navigation
    bookmarks/controls.ts  Compact SVG icons and source-ID reconciliation
    bookmarks/saved-view.ts Grouped metadata-only Saved Questions view
    pdf/controller.ts      Verified bridge capabilities and operation bounds
    pdf/controls.ts        UI intent/availability contract; no new viewer
    study/export.ts        Explicit historical collection + portable JSON
    theme/preferences.ts  Persistent preference API
    theme/tokens.ts        Component-scoped token application/restoration
  shared/
    models.ts              Versioned domain/storage/export types
    identity.ts            Stable ID construction and source-URL validation
    adapters.ts            Extraction statuses and adapter contracts
    validation.ts          Runtime validation, identity/reference checks
    messages.ts            Worker protocol and origin guard
    client.ts              Typed worker client and change subscriptions
  storage/
    commands.ts            Validated command reducer
    repository.ts          Serialized storage queue + Chrome backend
  background/index.ts      Authorized messages and subscriber notifications
tests/
  integration.test.ts       Navbar and lifecycle regressions
  foundations.test.ts       Business logic, lifecycle, fixtures, serialization
  background.test.ts        Real worker module with mocked Chrome boundary
  fixtures/                Explicitly synthetic contract markup and records
    quest-assignments.html  Supplied Quest fragment, contact details redacted
    quest-responses.html    Supplied response table with stable row IDs
  bookmarks.test.ts         Focused row/storage/view/rerender regressions
docs/
  study-export.schema.json  Portable JSON Schema, draft 2020-12
  INTEGRATION_CHECKLIST.md   Authenticated inspection needed before enabling
```

No dependencies were added for this scaffolding. `storage` is the only API permission. Static content-script matching remains restricted to Quest student pages. There is no crawler, remote API, telemetry, account service, credential access, or submission automation.

## Data and persistence

All data lives in `chrome.storage.local` under `betterquest.local.v1`. The service worker restricts storage access to trusted contexts and is the only writer. Content scripts submit validated commands; multiple tabs share a serialized read/modify/write queue. Data survives worker suspension/restart because the worker reads persisted state for each operation. Missing data initializes an empty state. Corrupt or newer-version data produces an error without deleting or silently overwriting it. A conservative seven-megabyte serialized-size limit precedes Chrome quota errors.

The state schema is versioned, but only version 1 is supported; a future migration must be explicit and tested. There is no import, reset, student-account identification, or cross-device sync workflow yet. Different Quest users in one Chrome profile would share extension-local data; use separate profiles for now.

IDs are constructed from **verified Quest source identifiers**, namespaced by their parent course/assignment. The assignment parser uses the course heading's unique number and the linked `courseuserassignment_…` instance value. Internal course IDs/term mapping are not present in this fragment and still need inspection. Titles, question positions, and displayed question numbers are not identities. Missing IDs disable the relevant collection/control. Unknown metadata remains unknown: an unparsed due label is kept with `iso: null`; a grade does not imply completion. Optional grade, start-date, group, completion-label, and observed-course fields preserve compatibility with earlier stored records.

Cache snapshots are scoped to observed source pages. They accumulate known courses/assignments instead of pretending to represent an entire account. Refresh requests invalidate freshness; they do not fetch unseen courses. Newer observations win over late asynchronous snapshots. Omitted assignments remain cached until a future explicit stale-record/removal policy is implemented.

The enabled parser observes the verified `#target` container and reads all groups in `#tabs-elements`. It maps columns by actual headings so DataTables-hidden columns do not shift fields. Unix `data-order` seconds are authoritative. The visible dates provide raw labels and Central timezone context; a text fallback accepts only valid full English CDT/CST dates. Accessible `Completed status` and `Grade` labels avoid double-reading decorative icons/visible numbers. Empty DataTables placeholder rows are not assignments. Processing indicators with active display prevent an observed-course marker until loading ends. DOM refreshes with unchanged extracted data do not write the cache again.

`scannedCourseIds` marks recognized table observations; it is optional for old snapshots. A detected heading without a table is a known unscanned course. Legacy snapshots without this evidence do not imply a successful scan. The compact summary shows Course data only or Not scanned yet; its tooltip states that other courses are not automatically scanned. Cache notifications update the summary without recollecting tables. Subscriptions and nodes are disposed when the verified page root/route is replaced.

Presentation is independent of collection. A dedicated placement adapter uses the verified course-info row, identifies the Meets column by its native `.qlabel`, and finds the first empty direct `.col` after it. Whitespace/comments and the extension's own existing host do not make a column occupied. Native content does: occupied columns are skipped and missing slots disable injection. The host has no card class, border, background, or layout overrides on Quest elements. Scoped typography/link styles show up to three known incomplete assignments for the current course. Unknown status is not treated as proof of incompletion; unparseable deadlines remain explicit.

View all uses the supplied `#student-elements-a` tab and `#tabs-elements` target. It invokes the native tab's click/loading behavior rather than changing classes, replacing tables, or opening another extension UI. The summary is a child of the existing collapse and is hidden/shown by Quest's existing behavior. Mounting and navbar focus do not force it open. Replacing the row within the same root repositions the single existing host into the new empty column; it does not append duplicate widgets or columns.

The student homepage still has no assignment-summary placement adapter. Saved Questions can be opened at the verified navbar sibling position without guessing a homepage content selector. It is an inline user-opened view, not an overlay or separate extension page.

Records and messages are runtime-validated. Unknown fields are rejected, preventing accidental persistence of response fields. Parent references must agree. Historical study records still require verified historical homework. Metadata-only bookmarks permit unknown assignment types without changing their type or enabling study capture; known assessments are rejected. Answer/solution fields remain availability/source metadata, never response values or answer text.

## Response-table bookmarking

The verified root is `.dataTables_scrollBody`, containing a direct table with ID `instance-table-courseuserassignment_…`, avoiding cloned scroll headers. That assignment source ID resolves an existing cached record and its course. Missing/ambiguous cache context returns unavailable; no placeholder course/title is invented.

Rows are `tr.instanceitempart[data-id="cuaip_…"]`. Stable IDs use the existing course/assignment namespace plus the row source ID. Only the first cell's displayed question number is read; response, status, history, and points cells and hidden-input values are not used for bookmark content. The supplied six-column table has a blank final header and empty final cells for icons. Occupied cells and malformed rows are skipped.

Controls use type=button, aria-pressed, and filled SVG feedback after persistence. Shadow events do not reach delegated response actions. Verified final TD slots may be inside a native form without submitting it; arbitrary form slots remain rejected. Reconciliation removes clones and detached controls, watches row/table ID changes, and moves existing hosts into replacement slots. A click captures its binding before a pending write so row recycling cannot change the question being saved.

Saved Questions uses BookmarkService grouping/removal and worker storage. It displays course and assignment titles, question-number links, and optional existing notes. Every new response bookmark links to the original cached assignment URL, with anchor=null. Prompt text remains null/not-extracted; answer/solution availability stays unknown. No PDF text, exact page, or artificial anchor is generated. View subscriptions run only while open; row subscriptions run only while response containers exist. Cleanup removes owned nodes/listeners without changing native table cells.

## Plugging in a feature

1. Inspect and sanitize the relevant DOM described in the integration checklist. Add a representative fixture without personal data.
2. Implement the dedicated adapter's `locate` and `read` functions with verified selectors. Replace only that adapter's `null` configuration. Keep parsing of Quest markup inside the adapter.
3. Return an `Extraction<T>`: `unsupported` means no integration is configured, `unavailable` means a configured root/data is missing, and `ready` carries actual validated records. `ready` does not imply a question's prompt was extracted; inspect its `prompt.status` and the export counts.
4. Compose the feature in `src/content/features.ts`. It mounts only when a verified root exists. `createFeatureRuntime` owns per-root observers and AbortControllers; root replacement, route changes, and extension reinjection dispose old controls/listeners. No feature adds a global DOM observer or polling loop.
5. Place controls in verified slots using owned markers/Shadow DOM. Response icons use blank final TD cells and type=button even inside native forms; other form slots stay excluded. Never change native response values, source URLs, or submission handlers.
6. Use services with `Execute` injection for unit tests, and the shared client in Chrome. Change subscriptions refresh bookmark/theme consumers only; assignment cache writes do not recursively trigger new cache collection.

Assignment and question adapters use synchronous DOM reads at present. Asynchronous PDF/history work can use the `PageContext.signal` contract; never apply a late result after cancellation. Study collection remains explicitly user-triggered through `StudyService.collect`; it is not part of automatic page refresh. PDF controls remain disabled until a real `PdfBridge` declares support and passes integration tests.

Theme scopes only set `--bq-*` custom properties on explicit component roots. They reject `body`/`documentElement`, avoid global CSS/filters, and restore overwritten custom properties on disposal. A future verified component stylesheet must consume the tokens before Quest dark mode has any visual effect.

## Validation boundary

Only bookmarking-focused tests and the TypeScript/extension build are run for this change. The supplied response fixture covers persistence, icon states, cloning/recycling, grouped links, cleanup, and unchanged original form/cell markup. Live Chrome rendering still needs checking in the authenticated session. Synthetic data is confined to tests and never imported into the extension UI.

The JSON Schema describes the portable export shape. Runtime validators additionally enforce stable identities, parent references, historical eligibility, and accurate extraction counts. Exported text is plain text; math/diagrams require future explicit representations. No empty prompt is represented as successfully extracted. Source URLs and collection timestamps remain in `sources` even when prompt text is unavailable.
