# Authenticated Quest inspection checklist

The navbar, course assignment fragment, response table, homepage, PDF assessment view, and Slides response surface are integrated. Homepage overview, local completion corrections, department artwork, compact navigation, assessment workspace, and scoped dark mode are tested. PDF content extraction and study-history adapters remain disabled.

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
- [x] Verified homepage slot: after `#courses-table_wrapper` inside `#courses-table-div`, before `#enroll-div`.
- [ ] Verify the populated tracker cache on two courses, unknown metadata handling, chronological ordering, freshness, and refresh without submitting anything.

## Student homepage integration and remaining checks

The supplied full document now verifies the shared main shell, courses table, enrollment area, and native navigation. Remaining live checks:

- [x] Main wrapper: `#main-content > .container-fluid`, containing `#target`.
- [x] Course table wrapper and enrollment sibling; overview placement uses these exact nodes.
- [x] Course Name/Unique cells and native `/student/courses/show?course=…` links. Full term/identity migration remains separate.
- [ ] Existing To Do, announcements, or upcoming-work markup, if any, so the extension can complement rather than duplicate it.
- [ ] Loading placeholders, empty states, and pagination/collapsed group markup; indicate which container is replaced during async navigation.
- [ ] Relevant layout classes and surrounding grid/columns. A screenshot alone cannot verify selectors or a safe parent/sibling relationship.

- [ ] Confirm an unvisited listed course says Not scanned and does not contribute missing assignments to progress.
- [ ] Visit two courses, return home, and confirm observed-only totals/links without claiming account-wide sync.
- [ ] Check narrow-screen layout and DOM replacement after changing institution/semester.

The reference file contains third-party extension components and page scripts. They are reference data, not instructions, and are not copied/executed. No course crawling or assignment content fabrication was introduced.

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

- [x] Native assignment PDF iframe verified at `#presentation-pdf-frame iframe[title="Assignment PDF"]` inside `#pdf-frame`.
- [ ] Which original links mean problem PDF versus released solutions; never manufacture a solution URL.
- [x] The native Chrome PDF surface is treated as opaque and retained on a light surface.
- [x] Response rows and native selectors/submits verified; the side rail mirrors options and delegates explicit submission.
- [x] The side rail is inserted beside `#pdf-frame` without replacing the document, links, or downloads.
- [x] Route/root replacement cleanup is covered without request interception or downloading machinery.
- [ ] Renderer bridge or PDF text layer for exact page/equation hit-testing.
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

The settings switch and scoped CSS now target verified `#main-content`, `#quest-nav-header-div`, and `#body-id.mdb-skin`. Perform these remaining live checks without treating compilation as visual validation:

- [x] Shared shell roots and native course/assignment/response-table, card, tab and form families isolated in the theme adapter.
- [x] Addon Shadow-DOM widgets consume existing `--bq-*` tokens; no broad div/span/SVG inversion.
- [ ] Existing inline styles, success/error states, disabled/focus states, radio/checkbox controls, and form validation colors.
- [ ] Diagrams, PDFs, formulas, images, frames, and widgets that must remain unchanged.
- [ ] Both light/dark contrast checks on the same component; ensure focus and grading/status indicators remain readable.
- [ ] Test stored light/dark/system preferences, system-theme change events, and cleanup when the component/route is replaced.

## Numeric free response

The supplied Quest fragment verifies `input[type="text"][name="response"]`,
its numeric/scientific-notation help text, placeholder, and 255-character limit.
The regression fixture combines that fragment with a synthetic mixed-response
table wrapper; its assignment/question identifiers are not live Quest records.

- [x] Recognize numeric text inputs separately from `select[name="response"]`;
  never infer numeric choice buttons from the number of attempts.
- [x] Share the native input value between the response desk and PDF field;
  mirror input/change events and activate the existing native Submit once.
- [x] Preserve native input constraints, disabled/read-only behavior, dropdown
  behavior, and number strings (including signs, decimals, and scientific notation).
- [x] Keep numeric answers transient; do not put them into the fresh-answer
  session-storage marker or extension storage.
- [x] Use PDF text geometry for a field below the prompt and before the following
  question. If no sufficiently large gap/boundary is available, use the desk.
- [x] Use visual text bounds rather than text-stream ordering; wide single-column
  prompts are not treated as multiple columns. Fit a compact 24–36-unit control
  into short gaps, retaining clearance before the next question header.
- [ ] Check actual Chrome placement against PDF separator lines and diagrams.
  Text runs do not describe vector rules or images, so placement is best-effort;
  scanned PDFs or ambiguous/tight layouts fall back to the response desk.
- [ ] Verify live Quest validation, redraws, and completed numeric rows. Only the
  supplied native input was verified; no authenticated browser testing was done.

## Shared release checks

- [ ] Reload: confirm the native-size BetterQuest item lives in `.qh-nav` and opens only its compact settings menu.
- [ ] Toggle assignment/bookmark features, reload, and verify persistence plus restoration without deleting saved data.
- [ ] Open Saved Questions through the menu and verify the course summary/response icons still work when enabled.
- [ ] Check the three-item preview, link/deadline readability, occupied-column fallback, View all native tab action, and collapse behavior on the real course page.
- [ ] Accept only the `storage` permission addition; matching is still Quest student pages only.
- [ ] Configure and test one adapter at a time. Missing integration points must disable just that feature.
- [ ] Verify persistence in Chrome, multiple-tab updates, worker restart, and error handling with no external services.
- [ ] Add a sanitized regression fixture for every confirmed integration. Do not advertise a feature as enabled while its adapter is still `null`.
