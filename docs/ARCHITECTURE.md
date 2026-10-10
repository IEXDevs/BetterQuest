# V1 foundations

The verified homepage has an observed-assignment overview and department artwork. The course-info summary, reversible local completion corrections, and response bookmarks remain. BetterQuest owns one compact top-right menu while preserving native Quest links. Verified assessment pages receive a PDF response rail or slide-choice facelift; the opaque PDF document itself and study capture remain untouched.

## Implemented versus disabled

| Feature | Working infrastructure | Awaiting inspected Quest DOM |
| --- | --- | --- |
| Assignments | Existing cache/tracker reused; verified homepage discovery and overview; local completion overrides; department art; observed-only progress; existing three-item course preview | Internal course/term mapping, semester rollover, additional layouts |
| Bookmarks | Verified response-table/row IDs; compact filled/outlined icons; existing persistent service; cloned/recycled row reconciliation; grouped Saved Questions; original assignment links | Slide/other layouts, additional assessment-type evidence, live Chrome visual checks |
| Assessment | Verified PDF iframe/response-table workspace and Slides radio-card layout; native selectors/submits remain authoritative | PDF text/equation hit-testing, page mapping, or a document-renderer bridge |
| Study export | Historical-homework validation; explicit save/collect API; JSON export builder/serializer/download; schema; source provenance; extracted/not-extracted counts; answer/solution **availability metadata** | Historical homework eligibility, visible prompt/math/diagram representation, released answer/solution links, existing export insertion slot |
| Theme | Persistent settings switch; existing light/dark/system resolution/tokens; scoped verified Quest tables/cards/forms/navbar; addon palette integration; cleanup; no inversion | Live Chrome contrast/MathJax/PDF checks and any additional unsupported component markup |

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
    homepage.ts            Verified course table/enrollment slot and inventory
    questions.ts           Verified response-table IDs and empty final slots
    saved-questions-placement.ts Verified navbar sibling for the inline view
    assessment.ts          Verified PDF iframe, response rows, and Slides surfaces
    pdf.ts                 Generic PDF bridge boundary (still null)
    history.ts             Accessible historical homework boundary (null)
    theme.ts               Verified component roots (null)
  features/
    lifecycle.ts           Scoped observers, root replacement, abort/dispose
    assignments/tracker.ts Cache, freshness, refresh orchestration
    assignments/completion-controls.ts Reversible local completion corrections
    assignments/section.ts Three-item course-info summary and native View all
    assignments/view-model.ts Pure filtering, sorting, deadlines, and coverage
    assignments/homepage.ts Observed-only progress and course overview
    settings/menu.ts        Compact native-nav preference menu
    bookmarks/service.ts   Bookmark CRUD/filter/group/source navigation
    bookmarks/controls.ts  Compact SVG icons and source-ID reconciliation
    bookmarks/saved-view.ts Grouped metadata-only Saved Questions view
    assessment/workspace.ts PDF response rail and Slides presentation polish
    courses/artwork.ts     Deterministic department artwork
    pdf/controller.ts      Generic bridge capabilities and operation bounds
    pdf/controls.ts        UI intent/availability contract; no new viewer
    study/export.ts        Explicit historical collection + portable JSON
    theme/preferences.ts  Persistent preference API
    theme/tokens.ts        Component-scoped token application/restoration
    theme/quest.ts         Verified shell styling lifecycle
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

The state schema is versioned, but only version 1 is supported; a future migration must be explicit and tested. Optional `completionOverrides` records user-owned corrections keyed by verified assignment ID; removing a correction returns to Quest's observed status. Existing schema-v1 records remain valid. There is no import, reset, student-account identification, or cross-device sync workflow yet. Different Quest users in one Chrome profile share extension-local data; use separate profiles for now.

IDs are constructed from **verified Quest source identifiers**, namespaced by their parent course/assignment. The assignment parser uses the course heading's unique number and the linked `courseuserassignment_…` instance value. Internal course IDs/term mapping are not present in this fragment and still need inspection. Titles, question positions, and displayed question numbers are not identities. Missing IDs disable the relevant collection/control. Unknown metadata remains unknown: an unparsed due label is kept with `iso: null`; a grade does not imply completion. Optional grade, start-date, group, completion-label, and observed-course fields preserve compatibility with earlier stored records.

Cache snapshots are scoped to observed source pages. They accumulate known courses/assignments instead of pretending to represent an entire account. Refresh requests invalidate freshness; they do not fetch unseen courses. Newer observations win over late asynchronous snapshots. Omitted assignments remain cached until a future explicit stale-record/removal policy is implemented.

The enabled parser observes the verified `#target` container and reads all groups in `#tabs-elements`. It maps columns by actual headings so DataTables-hidden columns do not shift fields. Unix `data-order` seconds are authoritative. The visible dates provide raw labels and Central timezone context; a text fallback accepts only valid full English CDT/CST dates. Accessible `Completed status` and `Grade` labels avoid double-reading decorative icons/visible numbers. Empty DataTables placeholder rows are not assignments. Processing indicators with active display prevent an observed-course marker until loading ends. DOM refreshes with unchanged extracted data do not write the cache again.

`scannedCourseIds` marks recognized table observations; it is optional for old snapshots. A detected heading without a table is a known unscanned course. Legacy snapshots without this evidence do not imply a successful scan. The compact summary shows Course data only or Not scanned yet; its tooltip states that other courses are not automatically scanned. Cache notifications update the summary without recollecting tables. Subscriptions and nodes are disposed when the verified page root/route is replaced.

Presentation is independent of collection. A dedicated placement adapter uses the verified course-info row, identifies the Meets column by its native `.qlabel`, and finds the first empty direct `.col` after it. Whitespace/comments and the extension's own existing host do not make a column occupied. Native content does: occupied columns are skipped and missing slots disable injection. The host has no card class, border, background, or layout overrides on Quest elements. Scoped typography/link styles show up to three known incomplete assignments for the current course. Unknown status is not treated as proof of incompletion; unparseable deadlines remain explicit.

View all uses the supplied `#student-elements-a` tab and `#tabs-elements` target. It invokes the native tab's click/loading behavior rather than changing classes, replacing tables, or opening another extension UI. The summary is a child of the existing collapse and is hidden/shown by Quest's existing behavior. Mounting and navbar focus do not force it open. Replacing the row within the same root repositions the single existing host into the new empty column; it does not append duplicate widgets or columns.

The supplied full homepage establishes `#courses-table_wrapper` inside `#courses-table-div`, followed by `#enroll-div`. The overview uses that exact position only on `/student/courses`. Name/Unique columns and native course URLs discover known courses; they do not extract assignment bodies or mark a course scanned. The discovery snapshot has no assignments and an empty scannedCourseIds list. UI updates use existing storage and scoped lifecycle; cache notifications never recursively recollect course assignments.

Progress uses only assignment IDs from the most recent matching native course-page observation. Course URL matching is conservative so unrelated semesters/aliases are not promoted to scanned. The bar is labeled completed/total observed assignments; missing course data is excluded and called out, never counted as completed. The current list can itself be partial, and hidden/new assignments may be missing even from an observed page. No account-wide sync claim is made. Course summaries link directly to native course pages to collect data; upcoming links retain original assignment URLs.

The menu is an owned LI in `.qh-nav`. Scoped CSS hides the other native items visually while keeping them in place, and allowlisted links are mirrored inside the BetterQuest menu. Disposal restores the original shell. The menu offers assignment/bookmark switches, dark mode, Saved Questions, Assignments, and Quest account links.

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

Assignment, question, and assessment adapters use synchronous DOM reads. The assessment workspace never reads PDF contents: it enlarges the verified native iframe and mirrors native response options into a side rail. Choice selection dispatches input/change to Quest's selector; submission occurs only from an explicit click delegated to Quest's existing button. The generic `PdfBridge` remains disabled.

Theme scopes reuse `createThemeScope` tokens on verified `#main-content` and `#quest-nav-header-div` roots. A dedicated theme adapter owns native CSS selectors. A separate marker on the verified `#body-id.mdb-skin` paints the page background without broad element overrides. The controller avoids reapplying identical tokens on every DOM reconciliation and restores original attributes/properties on cleanup. Native cards/tables/forms/status colors are targeted explicitly; MathJax foreground inherits readable text, PDF frames keep original paper colors, and no blanket filters/inversion are used. Shadow-DOM widgets consume the same variables. The switch is hidden when the verified main shell is absent.

## Validation boundary

No tests were run for the homepage/settings/dark-mode update, per request. TypeScript compilation and packaging are separate from runtime testing. Regression sources were adjusted for the new native trigger/menu but were not executed. Live Chrome layout, contrast, preference persistence, and original Quest interactions still need manual checking. The supplied reference HTML's scripts/configuration/third-party extension components are not executed or stored; only verified structural facts are used.

The JSON Schema describes the portable export shape. Runtime validators additionally enforce stable identities, parent references, historical eligibility, and accurate extraction counts. Exported text is plain text; math/diagrams require future explicit representations. No empty prompt is represented as successfully extracted. Source URLs and collection timestamps remain in `sources` even when prompt text is unavailable.
