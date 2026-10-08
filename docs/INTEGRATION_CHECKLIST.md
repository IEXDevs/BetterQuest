# Authenticated Quest inspection checklist

Only the navbar structure has been supplied and integrated: `.qh-navbar > .qh-breadcrumbs`, followed by `.qh-nav`. All five feature adapters are disabled (`null`). Inspect in your authenticated Chrome session; provide sanitized element snippets and relevant computed styles. Do not include names, EIDs, cookies, tokens, answers you submitted, or unreleased material.

## Implement first: assignment tracker

The tracker should be the first feature enabled. It establishes course/assignment identities and deadline/status normalization that bookmarking and study export depend on, and can initially enhance existing pages without touching homework inputs.

- [ ] Homepage course-list root and one course card/row, including its source ID and exact course URL.
- [ ] Course identity on an assignment page, including IDs and links in the existing breadcrumb/heading.
- [ ] Assignment table root and header markup; one complete row each for not-started, partially complete, completed, unavailable, and past-due homework.
- [ ] Exact source assignment IDs. Confirm whether public assignment IDs and student-instance IDs differ; document the mapping rather than merging them by title.
- [ ] Assignment name/link, release/start date, due date, timezone label, and machine-readable attributes if present. The screenshot's Central Time label is useful evidence, but actual row parsing still needs markup.
- [ ] Completion checkmark/icon markup and its accessible label. Distinguish completion from score, grade availability, and exhausted tries.
- [ ] Homework versus exam/quiz/learning-module classification and any timer/proctoring markers. Unknown classifications must stay unknown.
- [ ] Pagination, collapsed groups, async loading, and DOM replacement behavior. A visited-page cache is not complete account coverage.
- [ ] A safe existing homepage/course slot for a compact upcoming-work summary; do not introduce a standalone dashboard.
- [ ] Verify the populated tracker cache on two courses, unknown metadata handling, chronological ordering, freshness, and refresh without submitting anything.

## Question bookmarking

- [ ] Homework content root in each supported mode: slide, classic HTML, and classic PDF with response table.
- [ ] Stable native question ID or assignment-scoped question source ID; determine whether display order is randomized and whether it differs from the ID.
- [ ] Course/assignment identity relations on that page.
- [ ] A safe control insertion slot beside each question, outside submit forms/answer inputs. Provide its relationship to the question root.
- [ ] Verified native question anchors, slide URLs/query parameters, and any supported navigation behavior. If there is no exact native link, retain the assignment URL.
- [ ] How question roots and controls change when advancing slides or receiving async content.
- [ ] Explicit assessment exclusion evidence; do not infer homework solely from generic CSS classes.
- [ ] Verify one control per question after repeated rerenders, persistence after reload, direct-link behavior, and that all answer/form markup is unchanged.

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

- [ ] Reload the extension and verify the existing blue navbar button and empty closeable panel still work.
- [ ] Accept only the `storage` permission addition; matching is still Quest student pages only.
- [ ] Configure and test one adapter at a time. Missing integration points must disable just that feature.
- [ ] Verify persistence in Chrome, multiple-tab updates, worker restart, and error handling with no external services.
- [ ] Add a sanitized regression fixture for every confirmed integration. Do not advertise a feature as enabled while its adapter is still `null`.
