# Extension performance audit

## Follow-up: retained heap and PDF navigation

The newer report of roughly 200 MB retained JS heap after forced GC, 400–500 MB
navigation peaks, and 30–40K temporary DOM nodes is still a user-side Chrome
measurement. No Chrome heap snapshot or recording was supplied. The following
findings are based on Node/V8 sampling profiles, forced-GC reachability probes,
and instrumented fixtures, not a claim to explain or eliminate all of that heap.

### Confirmed bottlenecks addressed

- **Full-state clone churn:** `LocalRepository` cloned every read in decoding,
  command reduction, and response return. V8 allocation sampling placed
  `structuredClone` at the top of sampled storage allocations. Reads now return
  the already validated, isolated decode copy. Write validation, serialization,
  returned-value isolation, and queued execution remain unchanged.
- **Retained queue response:** `job.catch(...)` fulfilled with the entire last
  response, so the persistent repository queue retained it. The queue now
  settles to `undefined` on success as well as failure.
- **Duplicate PDF viewing paths:** the native iframe kept its PDF `src` while
  hidden and while PDF.js processed the same URL. The custom viewer now suspends
  that iframe source, restoring the exact URL on fallback or connected-page
  teardown. Unrelated iframes are not suspended; detached pages are not reloaded.
  Fixtures confirm a single custom viewer across repeated refreshes. Actual
  browser PDF-process memory savings have not been measured.
- **Disposed viewer references:** clearing page maps alone left `source`,
  `pdfRuns`, and the mapping closure reachable through a retained viewer API.
  Disposal now clears those references and answer maps; disposed APIs cannot
  restart mapping. Workspace response maps are cleared too, and detached
  workspace teardown no longer discovers/mutates a replacement Quest page.

### Measurements

Baseline source: `af78db4`, preserving the previous performance fixes. Both
versions use the same loader, Node v22.14.0, synthetic records, and profiler.

| Probe | Baseline | Optimized |
| --- | ---: | ---: |
| Full-state copies for 100 reads of 1,000 assignments (746,121-byte JSON) | 300 | 100 |
| Elapsed read workload, one CPU/allocation-profiled local run | 926 ms | 469 ms |
| CPU samples attributed directly to `structuredClone` in that run | 451 | 131 |
| Settled repository queue retains full response | Yes | No |
| PDF text probe reachable after disposal and three forced-GC turns, with viewer API deliberately retained (12,000 text runs) | Yes | No |
| Native PDF iframe retains document source while custom viewer is active | Yes | No |

Timing varies; the clone counts and reachability checks are the reproducible
comparisons. Sampled allocation bytes and process-wide before/after heap deltas
are diagnostic output, not cumulative allocation counts or Chrome heap savings.
Inspector's own profile-message allocations also appear in the sampling output.
All PDF pages and their current rendering resolution remain unchanged; this is
not lazy rendering, reduced zoom quality, or a feature removal.

Reproduce the profiles without accessing Quest:

```sh
node --expose-gc --import tsx scripts/profile-storage.mjs --baseline af78db4
node --expose-gc --import tsx scripts/profile-storage.mjs
node --expose-gc --import tsx scripts/profile-pdf-retention.mjs --baseline af78db4
node --expose-gc --import tsx scripts/profile-pdf-retention.mjs
node --import tsx --test tests/heap-performance.test.ts tests/performance.test.ts
```

`profile-storage.mjs` emits V8 allocation samples, CPU sample counts, exact clone
counts, and forced-GC process heap values. `profile-pdf-retention.mjs` checks
reachability with WeakRef and GC; it neither loads PDF.js nor models Chrome's
native PDF engine. New regression cases cover read isolation, queue retention,
native PDF suspension/restoration, single-viewer reuse, and disposed mapping.

### Still requiring a user-side Chrome profile

Repeat the same homepage ↔ PDF sequence with matching effects, viewport, zoom,
PDF, and cache. After forced GC, compare heap snapshots by constructor and
retaining path, including ArrayBuffer/typed arrays, PDF worker/font/image data,
detached windows/DOM, and effect resources. Count live PDF workers/native PDF
frames and inspect the allocation timeline during navigation. V8 heap, canvas
backing stores, GPU allocations, and separate PDF-process memory must not be
treated as interchangeable. A recording/snapshot is needed to attribute the
remaining 200 MB accurately; no target Chrome heap or CPU percentage is claimed.

## Earlier audit (preserved)

The reported Chrome measurements (about 39K DOM nodes, 77 MB heap, 13% CPU,
with navigation spikes near 80K nodes) are user measurements, not reproduced
benchmarks. No authenticated Quest browser session was accessed for this audit.

## Confirmed causes and targeted changes

- Review statistics deep-cloned the native review subtree on every read;
  enhancement made another clone even before its unchanged-data check. Read
  native text with a filtered TreeWalker instead, excluding BetterQuest content.
- Static response parsing created detached selects, options, and fallback submit
  buttons repeatedly. Reuse per-row controls through WeakMaps, updating values
  and rebuilding options when necessary. Removed rows can still be collected.
- Async feature refreshes overlapped with no limit. Serialize each feature and
  coalesce bursts into one follow-up pass. Root replacement aborts old work;
  disposal cannot queue another refresh for the old feature.
- Hero cleanup looked up only connected DOM. When Quest removed a course first,
  its document observer still retained the detached hero and its animation.
  Track owned heroes and release observers/effects even after detachment.
- PDF loads resolving after disposal retained their documents; disposal during
  page rendering could continue creating later pages. Destroy late documents,
  stop after canceled renders, clear page maps, and zero disposed canvas buffers.
  PDF worker Blob URLs also now have explicit release paths.
- Saved Questions kept its hidden content and remained mounted when leaving
  student routes. Clear closed list content and dispose the popup on unmount.
  The toolbar control is icon-only, with its accessible name and tooltip intact.

## Local measurements

Identical fixture operations before/after, not Chrome-wide heap or CPU figures:

| Operation | Before | After |
| --- | ---: | ---: |
| 20 review-stat reads | 20 deep subtree clones | 0 |
| 20 unchanged response reads after initial parsing | 1,740 new elements | 0 |
| Initial async refresh plus 20 requests while blocked | 21 concurrent passes | 2 serial passes |
| Observer retained after removal of a course hero | 1 | 0 |

The response allocation baseline was read from `HEAD` and evaluated against the
same regression fixture without editing the worktree. These numbers describe
allocation churn, not a claim that the connected DOM or live Chrome heap shrank
by the same amount. Unchanged theme updates produced no style mutations in the
fixture audit, so the theme implementation was not changed speculatively.

## Remaining intentional costs and browser verification

Quest's native response table is expanded to read the full response set, not
just visible Scroller rows. All PDF pages are rendered to support current
question mapping/navigation, and enabled course art animates. These still carry
DOM/canvas/CPU costs; none were disabled or virtualized in this patch.

Focused regression coverage lives in `tests/performance.test.ts`, alongside the
existing integration, bookmark, course-hero, foundations, facelift, and interactive
PDF suites. It covers allocation stability, canceled PDF loads/renders, detached
hero cleanup, refresh bursts, and root replacement.
