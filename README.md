# BetterQuest

Manifest V3 Chrome extension: **Upcoming Assignments** appears in the empty course-info column after Meets. Response-table questions have local bookmark icons; **BetterQuest** in the navbar opens Saved Questions inline. PDF enhancement, study capture, and dark mode integrations remain disabled.

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

The navbar button and feature controls use Shadow DOM. BetterQuest opens a grouped **Saved Questions** section in normal page flow immediately after the verified navbar. Close/Escape hides it and returns focus to the button. An **Upcoming** shortcut is available when the course summary exists. There is no floating sidebar, extension popup, or standalone dashboard.

## Assignment tracker

Visit each course's **Assignments** tab and let the tables load. BetterQuest reads all `instances-table-eh…` groups under `#tabs-elements`, including dynamically inserted rows. The summary uses the verified `#student-course-info-header > .row.text-center` structure: it finds **Meets**, then chooses the first empty existing `.col` after it. Occupied columns are left untouched, and no standalone card is inserted below the course information.

The summary shows up to **three known incomplete assignments** for the current course, ordered by deadline, with a linked name and concise deadline. Overdue work is labeled and unknown deadlines stay last. Unknown completion status is not presented as definite incompletion. **View all** activates Quest's own Assignments tab and scrolls to the native table, where the rest of the work and completed assignments remain available.

The summary stays within the existing course-info collapse, so Quest controls its visibility naturally. BetterQuest never forces it open or changes Instructor/Meets content, column classes, or native table behavior. The same cache continues to aggregate courses as they are visited; no extraction/storage logic was rebuilt. Grades remain stored but are not displayed in this compact summary.

Deadlines use Quest's Unix `data-order` timestamps, with the original displayed label and Central timezone retained. A strict CDT/CST text fallback is available when a timestamp is absent. Unparseable deadlines are shown as unknown and sorted last. Completion comes from Quest's accessible status labels, independently of grades: **Not completed** does not mean **Not started**.

Coverage stays limited: the summary notes **Course data only**, or **Not scanned yet** while the current course tables are unobserved. Its tooltip explains that other courses are not automatically scanned and cached work may be stale. The supplied fragment does not include a full course list, so BetterQuest cannot name or count every unvisited course. An observed table is not an account-wide sync guarantee.

Student-homepage placement is deferred. No homepage selectors were invented. See the [homepage DOM requirements](docs/INTEGRATION_CHECKLIST.md#student-homepage-placement-still-needed) for the exact markup needed to add the same compact section there.

Course identity currently uses the unique number in the verified course heading (`58735` in the fixture); assignment identity uses the exact `courseuserassignment_…` link value within that course. Internal course/term ID mapping and semester rollover still require additional markup. Missing course identity disables collection instead of guessing it.

## Question bookmarks

Visit the course's **Assignments** page first so its metadata is cached. On a response-table page, BetterQuest reads the assignment ID from `instance-table-courseuserassignment_…` and question IDs from `tr.instanceitempart[data-id="cuaip_…"]`. An outlined bookmark icon appears in the empty final cell; click to save it and click the filled icon to remove it. Native responses, history controls, status, points, hidden inputs, and submissions are left unchanged.

Open **BetterQuest** for Saved Questions, grouped by course and assignment. Each saved item identifies its question number and links to the original cached assignment URL. Remove actions keep the row icons in sync. Data persists locally in this Chrome profile; no new dependencies, permissions, or services were added.

The response fragment contains no course or assignment title, so labels come from the existing cache. Missing/ambiguous context disables row controls until the course list is visited. Assignment type is not inferred: metadata-only bookmarks permit cached `unknown` types without relabeling them as homework; known assessments remain excluded. Historical study eligibility is unchanged.

DataTables clones/recycled rows and attribute-only ID changes are reconciled without duplicate icons. Occupied action cells are skipped. Bookmark content includes **no response values, history, correctness, question points, prompt text, or solutions**. Prompt text stays null and no question anchor is invented. No PDF text extraction or exact PDF-page navigation is attempted.

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
src/adapters/quest/          Enabled assignment/response-table adapters
src/adapters/quest/assignment-placement.ts  Verified empty course-info column
src/features/assignments/   Existing cache/freshness, inline section, view model
src/features/bookmarks/     Existing service, row icons, grouped Saved Questions
src/features/               Assignments, bookmarks, PDF, study export, theme
docs/                       Architecture, JSON schema, integration checklist
public/manifest.json        Student-page matching only
```

```sh
npm test
npm run build
```

Regression fixtures include the supplied authenticated assignment HTML and response-table HTML. Focused bookmarking tests cover source IDs, persistence, filled icons, missing metadata, forms/submission isolation, cloned/recycled rows, grouped links, removal synchronization, and cleanup. Chrome APIs are mocked at the test boundary; live Chrome visual checks remain manual. No tests authenticate, scrape, or contact Quest.

The only API permission is `storage`, used for personal data in this Chrome profile. No broad host permissions, external services, remote assets, crawling, or assessment automation. Reload the extension and refresh Quest after rebuilding. No commits were created. Only bookmarking-focused tests and the build were run for this change.

Read the [architecture](docs/ARCHITECTURE.md), [integration checklist](docs/INTEGRATION_CHECKLIST.md), and [study export schema](docs/study-export.schema.json). Assignment extraction and response-table bookmarking are fixture-verified; check rendering in your Chrome session after reload. Slide-mode bookmarking, PDF controls, study capture, and dark mode still need their own inspected DOM.
