# Extension performance audit

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
