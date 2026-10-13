# BetterQuest

Public product and privacy pages live in `site/` and deploy independently as a Cloudflare static-assets Worker at `betterquest.iexdevs.com`. The extension build lives in `dist/`.

### Development & Build Commands

- `npm run dev` - start local Vite development server for the website (`site:dev` alias)
- `npm run dev:extn` (or `npm run watch`) - run esbuild watch mode for the extension with live auto-reload
- `npm run build` - build both the Chrome extension (`dist/`) and website (`site/`)
- `npm run build:extn` - typecheck and compile the Chrome extension to `dist/`
- `npm run build:site` - build the website and run Cloudflare Wrangler dry-run check
- `npm test` - run the automated test suite (93 tests via Node test runner)
- `npm run typecheck` - run TypeScript type checking without emitting files
- `npm run site:deploy` - deploy the website to Cloudflare

Manifest V3 Chrome extension: a global assignment overview enhances `/student/courses`, department-aware artwork replaces generic course thumbnails, Upcoming Assignments remains in the empty course-info column after Meets, and response-table questions have local bookmark icons. BetterQuest's compact top-right menu contains the original Quest account links, feature switches, persistent dark mode, and Saved Questions. Verified assessment pages gain a full-height PDF response workspace or polished slide choices; study capture remains disabled.

## Privacy policy hosting

The extension-specific [privacy policy](site/privacy/index.html) is a standalone static HTML page. It needs no JavaScript, login, build tool, or new dependencies. The contact address is the maintainer address recorded in this repository's commit authorship.

There was no existing website deployment configuration. `.github/workflows/privacy-pages.yml` publishes only `site/` using GitHub Pages, independently of the Chrome extension build:

1. In the GitHub repository, enable **Settings → Pages → Source: GitHub Actions**. Ensure your repository visibility/plan supports Pages and that the published site is **public**, not access-controlled.
2. Publish these files to `main` through your normal workflow, or run **Deploy privacy policy** manually after the files are on GitHub. If your default branch differs, update the workflow's branch filter. No commit or push is performed by the local extension build.
3. After successful deployment, open `https://betterquest.iexdevs.com/privacy/` in a signed-out/incognito browser. Verify it returns the policy directly, without authentication or an error. If the repository is renamed or a custom domain is configured, use the deployed Pages URL plus `privacy/` instead.
4. Enter that full HTTPS policy URL in the **Chrome Web Store dashboard's privacy-policy field**, not `manifest.json`. Align the dashboard's data disclosures with the policy, including locally handled educational data and grades.

**Deployment status:** the proposed URL returned HTTP 404 when checked on October 9, 2026. These local changes must be published and Pages configured before that URL is usable for submission. The public repository API also returned 404, so its public visibility and Pages eligibility could not be confirmed anonymously. Do not submit the URL until the signed-out check succeeds.

## Extension setup

Requires Node.js 22+.

```sh
npm ci
npm run build:extn   # or 'npm run build' to build both extension and site
```

Open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select `dist/`. Refresh your authenticated Quest student page. After rebuilding, reload the extension and refresh Quest again.

## Navigation integration

Navigation detection uses the verified `.qh-navbar` and `.qh-nav`. BetterQuest is an owned `li.qh-nav-item.qh-dropdown` inside the native list. A scoped compact-shell marker visually folds the native name/account items into one top-right menu; the original nodes remain in place and are restored on cleanup. Only allowlisted Quest/UT links are copied into the menu. Missing navigation disables that integration gracefully.

The controller maintains one button per document and remounts it when the selected container is replaced or inserted later. DOM observation is debounced and ignores extension-owned changes. Native navigation events, browser history events, and page restoration reconcile the mount; normal refreshes initialize it anew. No History API patching or URL polling.

The compact menu contains **Assignment tracker**, **Question bookmarks**, **Dark mode**, Saved Questions, Assignments, and the preserved Quest account links. Feature preferences persist locally across pages and tabs. Disabling tracking hides its summaries and stops collection; disabling bookmarks removes row icons. Neither deletes cached work or saved questions. No standalone extension dashboard is created.

## Quest homepage overview

On `/student/courses`, the overview is inserted immediately after `#courses-table_wrapper` inside its verified parent `#courses-table-div`, before the following `#enroll-div`. The supplied homepage HTML also verifies course Name/Unique columns and `/student/courses/show?course=…` links. BetterQuest reads these visible records without reading profile scripts, credentials, enrollment inputs, or third-party extension markup.

The responsive overview shows completed/total progress **for cached observed rows only**, upcoming known-incomplete assignments with links/deadlines, and course summaries. Matching course-page observations determine scan coverage. Unscanned courses are labeled and linked for collection; their missing assignments do not count as zero or complete. Progress labels explicitly state that this is not account-wide progress, even when every currently listed page has an observation. Hidden/new assignments may still be absent.

## Assignment tracker

Visit each course's **Assignments** tab and let the tables load. BetterQuest reads all `instances-table-eh…` groups under `#tabs-elements`, including dynamically inserted rows. The summary uses the verified `#student-course-info-header > .row.text-center` structure: it finds **Meets**, then chooses the first empty existing `.col` after it. Occupied columns are left untouched, and no standalone card is inserted below the course information.

The summary shows up to **three known incomplete assignments** for the current course, ordered by deadline, with a linked name and concise deadline. A reversible **Mark done** control appears in verified native Completed cells when Quest reports work incomplete; the correction is stored locally, suppresses false overdue labels, and never overwrites Quest's status. **View all** activates Quest's own Assignments tab.

The summary stays within the existing course-info collapse, so Quest controls its visibility naturally. BetterQuest never forces it open or changes Instructor/Meets content, column classes, or native table behavior. The same cache continues to aggregate courses as they are visited; no extraction/storage logic was rebuilt. Grades remain stored but are not displayed in this compact summary.

Deadlines use Quest's Unix `data-order` timestamps, with the original displayed label and Central timezone retained. A strict CDT/CST text fallback is available when a timestamp is absent. Unparseable deadlines are shown as unknown and sorted last. Completion comes from Quest's accessible status labels, independently of grades: **Not completed** does not mean **Not started**.

Coverage stays limited: the summary notes **Course data only**, or **Not scanned yet** while the current course tables are unobserved. Its tooltip explains that other courses are not automatically scanned and cached work may be stale. The supplied fragment does not include a full course list, so BetterQuest cannot name or count every unvisited course. An observed table is not an account-wide sync guarantee.

Homepage placement and course discovery use verified Quest markup. Generic course thumbnails are replaced at runtime with deterministic department artwork derived from the native short code (for example, `M 408D` → `M`); native image URLs and course data are retained and restored on cleanup. No background course crawling or assignment fabrication was added.

Course identity currently uses the unique number in the verified course heading (`58735` in the fixture); assignment identity uses the exact `courseuserassignment_…` link value within that course. Internal course/term ID mapping and semester rollover still require additional markup. Missing course identity disables collection instead of guessing it.

## Question bookmarks

Visit the course's **Assignments** page first so its metadata is cached. On a response-table page, BetterQuest reads the assignment ID from `instance-table-courseuserassignment_…` and question IDs from `tr.instanceitempart[data-id="cuaip_…"]`. An outlined bookmark icon appears in the empty final cell; click to save it and click the filled icon to remove it. Native responses, history controls, status, points, hidden inputs, and submissions are left unchanged.

Open **BetterQuest → Saved Questions** for the grouped library. Each saved item identifies its question number and links to the original cached assignment URL. Remove actions keep the row icons in sync. Data persists locally in this Chrome profile; no new dependencies, permissions, or services were added.

The response fragment contains no course or assignment title, so labels come from the existing cache. Missing/ambiguous context disables row controls until the course list is visited. Assignment type is not inferred: metadata-only bookmarks permit cached `unknown` types without relabeling them as homework; known assessments remain excluded. Historical study eligibility is unchanged.

DataTables clones/recycled rows and attribute-only ID changes are reconciled without duplicate icons. Occupied action cells are skipped. Bookmark content includes **no response values, history, correctness, question points, prompt text, or solutions**. On verified assessment view pages, the native PDF iframe stays light and fills the available height while a synchronized response rail mirrors only question numbers and native selector options. Choosing a chip updates Quest's existing selector and reveals a delegated Submit button; selection never submits automatically. No PDF text extraction or exact page navigation is attempted.

## Dark mode

The settings switch uses the existing theme preference and light/dark/system resolution. It explicitly saves light or dark when changed; existing system preferences continue following the OS until overridden. Verified shared roots are `#main-content`, `#quest-nav-header-div`, and `#body-id.mdb-skin`. Quest-specific selectors/CSS live in the theme adapter, while the controller reuses scoped tokens and restores owned attributes/properties on cleanup.

Dark styling targets the verified navbar, cards, assignment/course/response tables, native tab strip, and form controls. Focus and success/error colors remain distinct. MathJax inherits its surface color, while verified light question/answer surfaces explicitly keep dark formula text. PDF embeds retain a light document surface, and no blanket inversion or filters are used.

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
src/adapters/quest/          Enabled assignment/response/assessment adapters
src/adapters/quest/assignment-placement.ts  Verified empty course-info column
src/adapters/quest/homepage.ts Verified homepage slot and course inventory
src/adapters/quest/theme.ts   Verified native component styling
src/features/assignments/   Cache/freshness, completion controls, inline section
src/features/assignments/homepage.ts Observed-data progress and summaries
src/features/bookmarks/     Existing service, row icons, grouped Saved Questions
src/features/settings/menu.ts Native-menu feature/theme preferences
src/features/theme/quest.ts Scoped Quest theme lifecycle
src/features/               Assignments, assessments, course art, bookmarks, PDF contracts, study export, theme
docs/                       Architecture, JSON schema, integration checklist
public/manifest.json        Student-page matching only
```

```sh
npm test
npm run build
```

Regression fixtures include sanitized assignment and response-table HTML. Tests cover source IDs, manual completion, department artwork, assessment synchronization without automatic submission, dark question surfaces, compact navigation, persistence, cloned/recycled rows, grouped links, and cleanup. Live authenticated Quest was inspected read-only for selector and layout verification.

The only API permission is `storage`, used for personal data in this Chrome profile. No broad host permissions, external services, remote assets, crawling, answer extraction, or automatic submission was added. Existing schema-v1 records without completion overrides remain compatible. Reload the extension and refresh Quest after rebuilding.

Read the [architecture](docs/ARCHITECTURE.md), [integration checklist](docs/INTEGRATION_CHECKLIST.md), and [study export schema](docs/study-export.schema.json). The supplied HTML was treated as reference data only: its scripts were not executed and third-party extension components were not copied. PDF-document internals, exact page mapping, slide-mode bookmarking, and study capture remain out of scope.
