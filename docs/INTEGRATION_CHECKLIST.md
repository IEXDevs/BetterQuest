# Authenticated Quest inspection checklist

The navbar, course assignment fragment, and response-table fragment are integrated. Assignment collection and response-table bookmarking are enabled and fixture-tested. PDF, study-history, and theme adapters remain disabled. Additional snippets should be sanitized and must not include credentials or unreleased material.

## Implement first: assignment tracker

The tracker is enabled. Its parser/cache are reused unchanged. The summary now uses the verified course-info row's first empty column after Meets and shows up to three incomplete assignments with native View all. Remaining verification includes the homepage/course list and internal course/term mapping; the supplied fragment alone cannot prove full course coverage. Only assignment-focused tests are run for this placement update.

- [ ] Homepage course-list root and one course card/row, including its source ID and exact course URL.
- [ ] Course identity on an assignment page, including IDs and links in the existing breadcrumb/heading.
- [x] Assignment table/group roots and header markup, completed rows, and a not-completed row with unavailable grade. Additional partial/unavailable layouts still need inspection.
- [ ] Exact source assignment IDs. Confirm whether public assignment IDs and student-instance IDs differ; document the mapping rather than merging them by title.
- [x] Assignment name/link, start date, due date, Central timezone label, and Unix `data-order` attributes.
- [x] Completion checkmark and accessible Completed/Not completed labels, separate from grades. No inference about partial progress or exhausted tries.
- [ ] Homework versus exam/quiz/learning-module classification and any timer/proctoring markers. Unknown classifications must stay unknown.
- [x] Multiple/collapsed groups, delayed tables, processing indicators, and DOM rerenders covered in fixture tests. Actual pagination/additional layouts still need inspection. A visited-page cache is not complete account coverage.
- [x] Course-page slot: `#student-course-info-header > .row.text-center > .col`, first empty column after the native Meets column. Preserve all columns and native collapse behavior; remove the former standalone tracker.
- [ ] Verified student-homepage placement (requirements below).
- [ ] Verify the populated tracker cache on two courses, unknown metadata handling, chronological ordering, freshness, and refresh without submitting anything.

## Student homepage placement still needed

Supply sanitized HTML from the **student homepage**, not a course page:

- [ ] The main content wrapper and its direct children, including the page heading and any welcome/announcements area.
- [ ] The existing course-list/card/table wrapper, including the exact insertion location where a compact upcoming-work section should sit.
- [ ] One complete course entry and link, including course unique/internal ID and semester/term evidence, with personal information removed.
- [ ] Existing To Do, announcements, or upcoming-work markup, if any, so the extension can complement rather than duplicate it.
- [ ] Loading placeholders, empty states, and pagination/collapsed group markup; indicate which container is replaced during async navigation.
- [ ] Relevant layout classes and surrounding grid/columns. A screenshot alone cannot verify selectors or a safe parent/sibling relationship.

Until this is supplied, BetterQuest mounts only at the verified course-page slot. It does not choose a generic homepage `main`/`body`/navbar fallback or invent a list of unvisited courses.

## Question bookmarking

- [x] Classic response root: `.dataTables_scrollBody > table[id="instance-table-courseuserassignment_…"]`. Other/slide layouts remain unverified.
- [x] Stable question source ID: `tr.instanceitempart[data-id="cuaip_…"]`, independent of position and displayed number.
- [x] Assignment ID from the table, matched to course/title metadata in the existing cache. Visit the course Assignments page first.
- [x] Compact type=button icon in each empty final TD, without changing response/history/status/points cells.
- [x] Saved links use the original assignment URL and question number. No PDF text or exact page/anchor navigation attempted.
- [x] Cloning, recycled rows, data-id-only changes and table replacement covered by focused tests; real scroller behavior still needs a live check.
- [ ] Explicit assessment exclusion evidence; do not infer homework solely from generic CSS classes.
- [ ] Live Chrome: verify one icon per visible row, persistent filled state, grouped Saved Questions links, and remove-state synchronization.
- [ ] Verify native response/history/submission controls on a non-graded practice page.

## PDF experience

- [ ] Existing PDF link `href`, embed/object/iframe source/type, document parent root, and any click-generated URLs.
- [ ] Which original links mean problem PDF versus released solutions; never manufacture a solution URL.
- [ ] Whether the renderer is a native Chrome plugin, a same-origin HTML viewer, or a cross-origin iframe. A plugin/cross-origin document is not ordinary accessible DOM.
- [ ] Existing navigation/zoom/view controls and any documented renderer bridge/API that can be used safely.
- [ ] A verified nearby slot for optional controls that does not replace the document, existing links, or downloads.
- [ ] Session/URL lifetime and behavior when the assignment rerenders. Do not add request interception or downloading machinery for this scaffold.
- [ ] Only enable capabilities the bridge can confirm. Test original viewing/download behavior before any enhancement is enabled.

## Historical study data export

- [ ] Historical homework list/root with verified eligibility evidence: assignment type, availability, release state, and past-work status.
- [ ] Visible problem prompt root, separate from response widgets, private submitted-answer histories, and hidden solutions.
- [ ] Actual math/diagram representation: text, MathML, TeX attributes, accessible alternative text, images, or PDF-only content.
- [ ] Released answer/solution **availability** indicators and native source links. The current schema intentionally stores metadata only, not answers/solutions themselves.
- [ ] Original question URLs/native anchors plus course/assignment source identifiers.
- [ ] A relevant existing page slot for an explicit collect/export action. No automatic archival crawler or fetching unreleased pages.
- [ ] Confirm unavailable or PDF-only prompts export `text: null` with an honest status, original source URLs, and zero extracted-prompt counts.
- [ ] Inspect exported JSON locally for accurate metadata and absence of submitted-response values or unknown fields.

## Dark mode

- [ ] Verified component roots on course lists and homework pages, with their selectors and computed backgrounds/text/borders.
- [ ] Native component selectors that can explicitly consume `--bq-*` tokens without targeting every div/span/table.
- [ ] Existing inline styles, success/error states, disabled/focus states, radio/checkbox controls, and form validation colors.
- [ ] Diagrams, PDFs, formulas, images, frames, and widgets that must remain unchanged.
- [ ] Both light/dark contrast checks on the same component; ensure focus and grading/status indicators remain readable.
- [ ] Test stored light/dark/system preferences, system-theme change events, and cleanup when the component/route is replaced.

## Shared release checks

- [ ] Reload: confirm the course summary remains in its empty column and BetterQuest opens/closes Saved Questions inline after the navbar.
- [ ] Check the three-item preview, link/deadline readability, occupied-column fallback, View all native tab action, and collapse behavior on the real course page.
- [ ] Accept only the `storage` permission addition; matching is still Quest student pages only.
- [ ] Configure and test one adapter at a time. Missing integration points must disable just that feature.
- [ ] Verify persistence in Chrome, multiple-tab updates, worker restart, and error handling with no external services.
- [ ] Add a sanitized regression fixture for every confirmed integration. Do not advertise a feature as enabled while its adapter is still `null`.
