# V1 foundations

The existing navbar integration and non-modal panel are retained. The panel now holds a simple read-only assignment list. There is no new popup, standalone dashboard, PDF viewer, or automatic Quest theming. Other feature modules remain foundations for adding relevant page controls later.

## Implemented versus disabled

| Feature | Working infrastructure | Awaiting inspected Quest DOM |
| --- | --- | --- |
| Assignments | Supplied-HTML parser for all course assignment groups; machine timestamps/strict CDT/CST fallback; explicit completion and grades; multi-course cache; simple deadline-sorted panel; scan coverage and manual refresh | Full course-list discovery, internal course/term IDs, semester rollover, additional layouts and live Chrome testing |
| Bookmarks | Stable source-based identities; persistent add/update/remove/list/group; native-anchor/source URL navigation; idempotent scoped bookmark controls | Question identities and safe control slots, HTML/slide/PDF mode differences, assessment exclusion evidence |
| PDF | Detection adapter contract; capability-gated navigation/zoom/view intent dispatcher; bridge disposal; original-source URLs | Actual link/embed markup, safe controls slot, verified bridge to the document renderer. No controls or replacements are enabled |
| Study export | Historical-homework validation; explicit save/collect API; JSON export builder/serializer/download; schema; source provenance; extracted/not-extracted counts; answer/solution **availability metadata** | Historical homework eligibility, visible prompt/math/diagram representation, released answer/solution links, existing export insertion slot |
| Theme | Persistent light/dark/system preferences; system resolution; component-local custom-property tokens; media-query updates and restoration on cleanup | Verified component roots and CSS that consumes the tokens. No existing Quest component is recolored |

## Modules

```text
src/
  content/
    navigation.ts          Existing authenticated navbar selector/placement
    ui.ts                  Existing navbar button and panel shell
    integration.ts         Existing navigation lifecycle + feature-host hooks
    features.ts            Assignment collection; other adapters disabled
  adapters/quest/
    assignments.ts         Verified #target/#tabs-elements assignment parser
    questions.ts           Question bindings/control slots (null until inspected)
    pdf.ts                 PDF source/document boundary (null until inspected)
    history.ts             Accessible historical homework boundary (null)
    theme.ts               Verified component roots (null)
  features/
    lifecycle.ts           Scoped observers, root replacement, abort/dispose
    assignments/tracker.ts Cache, freshness, refresh orchestration
    assignments/panel.ts   Read-only list and honest course coverage
    bookmarks/service.ts   Bookmark CRUD/filter/group/source navigation
    bookmarks/controls.ts  Optional Shadow-DOM controls in verified slots
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
  integration.test.ts       Existing navbar/panel regressions
  foundations.test.ts       Business logic, lifecycle, fixtures, serialization
  background.test.ts        Real worker module with mocked Chrome boundary
  fixtures/                Explicitly synthetic contract markup and records
    quest-assignments.html  Supplied Quest fragment, contact details redacted
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

`scannedCourseIds` marks recognized table observations; it is optional for old snapshots. A detected heading without a table is a known unscanned course. Legacy snapshots without this evidence do not imply a successful scan. The panel labels these states and warns that other courses have not been scanned; no full course inventory is inferred. Automatic cache notifications update an open panel without recollecting tables. Its manual Refresh explicitly awaits the current page read before rendering, and unsubscribes when closed.

Records and messages are runtime-validated. Unknown record fields are rejected, preventing accidental persistence/export of response fields or arbitrary adapter payloads. Course/assignment/question references must agree. Historical study records require `kind: homework` and explicit `historical: true`. The model has answer/solution availability and source URLs, not answer/solution text or submitted response values.

## Plugging in a feature

1. Inspect and sanitize the relevant DOM described in the integration checklist. Add a representative fixture without personal data.
2. Implement the dedicated adapter's `locate` and `read` functions with verified selectors. Replace only that adapter's `null` configuration. Keep parsing of Quest markup inside the adapter.
3. Return an `Extraction<T>`: `unsupported` means no integration is configured, `unavailable` means a configured root/data is missing, and `ready` carries actual validated records. `ready` does not imply a question's prompt was extracted; inspect its `prompt.status` and the export counts.
4. Compose the feature in `src/content/features.ts`. It mounts only when a verified root exists. `createFeatureRuntime` owns per-root observers and AbortControllers; root replacement, route changes, and extension reinjection dispose old controls/listeners. No feature adds a global DOM observer or polling loop.
5. Place small feature controls in verified page slots, outside response forms, using extension-owned markers/Shadow DOM. Never alter the navbar, original document URLs, answer inputs, or submission events.
6. Use services with `Execute` injection for unit tests, and the shared client in Chrome. Change subscriptions refresh bookmark/theme consumers only; assignment cache writes do not recursively trigger new cache collection.

Assignment and question adapters use synchronous DOM reads at present. Asynchronous PDF/history work can use the `PageContext.signal` contract; never apply a late result after cancellation. Study collection remains explicitly user-triggered through `StudyService.collect`; it is not part of automatic page refresh. PDF controls remain disabled until a real `PdfBridge` declares support and passes integration tests.

Theme scopes only set `--bq-*` custom properties on explicit component roots. They reject `body`/`documentElement`, avoid global CSS/filters, and restore overwritten custom properties on disposal. The existing navbar/button/panel styling is unchanged. A future verified component stylesheet must consume the tokens before Quest dark mode has any visual effect.

## Validation boundary

Tests exercise the supplied real assignment fragment, storage/repository behavior, the real worker handler with mocked Chrome APIs, feature lifecycle, optional bookmark controls, PDF capability contracts, JSON downloads, and theme scopes. They do not authenticate, scrape, or contact Quest. Synthetic model data exists only in tests; it is never imported into the extension UI. The parser leaves original table/form markup unchanged. Live Chrome persistence, actual rendering, and additional page layouts should still be tested in your authenticated session.

The JSON Schema describes the portable export shape. Runtime validators additionally enforce stable identities, parent references, historical eligibility, and accurate extraction counts. Exported text is plain text; math/diagrams require future explicit representations. No empty prompt is represented as successfully extracted. Source URLs and collection timestamps remain in `sources` even when prompt text is unavailable.
