# BetterQuest

Manifest V3 Chrome extension: a compact **Upcoming Assignments** summary appears automatically inside the first empty course-info column after **Meets**. It uses assignments collected locally from pages you visit. The blue navbar button is a shortcut to the summary. Other V1 feature integrations remain disabled.

## Setup

Requires Node.js 22+.

```sh
npm ci
npm run build
```

Open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select `dist/`. Refresh your authenticated Quest student page. After rebuilding, reload the extension and refresh Quest again.

## Navigation integration

Navigation detection is isolated in `src/content/navigation.ts` and uses the authenticated structure supplied by the user: `.qh-navbar` with direct children `.qh-breadcrumbs` and `.qh-nav`. The button is inserted between those children without modifying them. Missing or incomplete navigation leaves Quest unchanged. Local tests use that supplied structure; visual placement remains for your authenticated Chrome-session check.

The controller maintains one button per document and remounts it when the selected container is replaced or inserted later. DOM observation is debounced and ignores extension-owned changes. Native navigation events, browser history events, and page restoration reconcile the mount; normal refreshes initialize it anew. No History API patching or URL polling.

The navbar button and inline section use Shadow DOM. The extension does not restyle Quest, modify existing controls, lock scrolling, or trap focus. The button scrolls to and focuses the inline section; it does not open an overlay. On pages without a verified placement it remains visible but disabled, with a hint to visit a course. The service worker handles the existing typed handshake and validated local-data commands.

## Assignment tracker

Visit each course's **Assignments** tab and let the tables load. BetterQuest reads all `instances-table-eh…` groups under `#tabs-elements`, including dynamically inserted rows. The summary uses the verified `#student-course-info-header > .row.text-center` structure: it finds **Meets**, then chooses the first empty existing `.col` after it. Occupied columns are left untouched, and no standalone card is inserted below the course information.

The summary shows up to **three known incomplete assignments** for the current course, ordered by deadline, with a linked name and concise deadline. Overdue work is labeled and unknown deadlines stay last. Unknown completion status is not presented as definite incompletion. **View all** activates Quest's own Assignments tab and scrolls to the native table, where the rest of the work and completed assignments remain available.

The summary stays within the existing course-info collapse, so Quest controls its visibility naturally. BetterQuest never forces it open or changes Instructor/Meets content, column classes, or native table behavior. The same cache continues to aggregate courses as they are visited; no extraction/storage logic was rebuilt. Grades remain stored but are not displayed in this compact summary.

Deadlines use Quest's Unix `data-order` timestamps, with the original displayed label and Central timezone retained. A strict CDT/CST text fallback is available when a timestamp is absent. Unparseable deadlines are shown as unknown and sorted last. Completion comes from Quest's accessible status labels, independently of grades: **Not completed** does not mean **Not started**.

Coverage stays limited: the summary notes **Course data only**, or **Not scanned yet** while the current course tables are unobserved. Its tooltip explains that other courses are not automatically scanned and cached work may be stale. The supplied fragment does not include a full course list, so BetterQuest cannot name or count every unvisited course. An observed table is not an account-wide sync guarantee.

Student-homepage placement is deferred. No homepage selectors were invented. See the [homepage DOM requirements](docs/INTEGRATION_CHECKLIST.md#student-homepage-placement-still-needed) for the exact markup needed to add the same compact section there.

Course identity currently uses the unique number in the verified course heading (`58735` in the fixture); assignment identity uses the exact `courseuserassignment_…` link value within that course. Internal course/term ID mapping and semester rollover still require additional markup. Missing course identity disables collection instead of guessing it.

## Structure and validation

```text
src/content/navigation.ts   Single selector adapter
src/content/integration.ts  Idempotent mounting and lifecycle
src/content/ui.ts           Existing scoped navbar button
src/content/index.ts        Content-script entry point
src/background/index.ts     MV3 service-worker entry point
src/shared/messages.ts      Typed handshake and URL guard
src/shared/models.ts        Course/assignment/question/storage/export models
src/shared/client.ts        Validated worker client and change notifications
src/storage/                Local repository and serialized command reducer
src/adapters/quest/          Enabled assignment parser; other adapters disabled
src/adapters/quest/assignment-placement.ts  Verified empty course-info column
src/features/assignments/   Existing cache/freshness, inline section, view model
src/features/               Assignments, bookmarks, PDF, study export, theme
docs/                       Architecture, JSON schema, integration checklist
public/manifest.json        Student-page matching only
```

```sh
npm test
npm run build
```

Tests cover the supplied authenticated assignment HTML, navbar/panel, dynamic table groups, grades/statuses, timezone-safe deadlines, multi-course caching, coverage, local persistence, worker messaging, and the other feature foundations. The assignment fixture preserves the supplied rows and scripts with instructor contact details redacted; scripts are never executed. Other fixtures are synthetic contracts. Chrome APIs are mocked at the test boundary. No tests authenticate, scrape, or contact Quest.

The only API permission is `storage`, used for personal data in this Chrome profile. No broad host permissions, external services, remote assets, crawling, or assessment automation. Reload the extension and refresh Quest after rebuilding. No commits were created. Only assignment-focused tests were run for the course-info column integration.

Read the [architecture and feature status](docs/ARCHITECTURE.md), [authenticated integration checklist](docs/INTEGRATION_CHECKLIST.md), and [study export schema](docs/study-export.schema.json). The assignment parser is fixture-verified; exercise it in your live Chrome session after reloading the extension. Question bookmarking, PDF controls, study capture, and dark mode still require their own inspected DOM.
