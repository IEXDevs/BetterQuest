# BetterQuest

Manifest V3 Chrome extension: the blue **BetterQuest** navbar button opens a simple assignment-tracker panel. Assignments are collected locally from course pages you visit, using the supplied authenticated Quest HTML. Other V1 feature integrations remain disabled. No popup or standalone dashboard.

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

Both the button and panel use Shadow DOM. The extension does not restyle Quest, modify existing controls, lock scrolling, or trap focus. Close/Escape returns focus to the launcher. The service worker handles a typed startup handshake and validated local-data commands.

## Assignment tracker

Visit each course's **Assignments** tab and let the tables load. BetterQuest reads all `instances-table-eh…` groups under `#tabs-elements`, including dynamically inserted rows. Open the navbar button to see locally cached assignments from visited courses, ordered by deadline, with completion and grades. **Refresh** re-reads the current course page before updating the panel; it does not fetch other courses or submit anything.

Deadlines use Quest's Unix `data-order` timestamps, with the original displayed label and Central timezone retained. A strict CDT/CST text fallback is available when a timestamp is absent. Unparseable deadlines are shown as unknown and sorted last. Completion comes from Quest's accessible status labels, independently of grades: **Not completed** does not mean **Not started**.

Coverage is deliberately limited: known courses without observed tables are labeled **Not scanned yet**, and the panel explicitly says other courses must be visited. The supplied fragment does not include a full course list, so BetterQuest cannot name or count every unvisited course. An observed table is not an account-wide sync guarantee; cached rows remain until updated and may be stale.

Course identity currently uses the unique number in the verified course heading (`58735` in the fixture); assignment identity uses the exact `courseuserassignment_…` link value within that course. Internal course/term ID mapping and semester rollover still require additional markup. Missing course identity disables collection instead of guessing it.

## Structure and validation

```text
src/content/navigation.ts   Single selector adapter
src/content/integration.ts  Idempotent mounting and lifecycle
src/content/ui.ts           Scoped button and panel shell
src/content/index.ts        Content-script entry point
src/background/index.ts     MV3 service-worker entry point
src/shared/messages.ts      Typed handshake and URL guard
src/shared/models.ts        Course/assignment/question/storage/export models
src/shared/client.ts        Validated worker client and change notifications
src/storage/                Local repository and serialized command reducer
src/adapters/quest/          Enabled assignment parser; other adapters disabled
src/features/assignments/   Cache/freshness and simple panel list
src/features/               Assignments, bookmarks, PDF, study export, theme
docs/                       Architecture, JSON schema, integration checklist
public/manifest.json        Student-page matching only
```

```sh
npm test
npm run build
```

Tests cover the supplied authenticated assignment HTML, navbar/panel, dynamic table groups, grades/statuses, timezone-safe deadlines, multi-course caching, coverage, local persistence, worker messaging, and the other feature foundations. The assignment fixture preserves the supplied rows and scripts with instructor contact details redacted; scripts are never executed. Other fixtures are synthetic contracts. Chrome APIs are mocked at the test boundary. No tests authenticate, scrape, or contact Quest.

The only API permission is `storage`, used for personal data in this Chrome profile. No broad host permissions, external services, remote assets, crawling, or assessment automation. Reload the extension to accept the storage-permission addition, then refresh Quest. Changes are left unstaged and uncommitted.

Read the [architecture and feature status](docs/ARCHITECTURE.md), [authenticated integration checklist](docs/INTEGRATION_CHECKLIST.md), and [study export schema](docs/study-export.schema.json). The assignment parser is fixture-verified; exercise it in your live Chrome session after reloading the extension. Question bookmarking, PDF controls, study capture, and dark mode still require their own inspected DOM.
