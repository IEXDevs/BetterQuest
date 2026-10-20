# Repository Rules for BetterQuest

## User-Centered Language and Human-Friendly Copy
Every user-facing string, label, caption, and status message exists **to communicate what the user wants or needs to know**, never to explain internal codebase mechanics.

### Rules:
- **No Developer/Mechanic Speak**: Never use terms like "observed rows", "cached rows only", "response table", "dispatched payload", "reading DOM", or "executed transaction" in customer-facing UI.
- **State the Outcome**:
  - Instead of `"67% of observed rows"`, write `"67% complete"`.
  - Instead of `"No observed assignment data"`, write `"No assignments yet"`.
  - Instead of `"4 / 6 observed assignments completed"`, write `"4 of 6 assignments completed"`.
  - Instead of `"No known incomplete assignments in the observed rows"`, write `"All caught up! No incomplete assignments."`.
  - Instead of `"Waiting for assignment tables…"`, write `"Loading assignments…"`.
  - Instead of `"Reading preferences…"`, write `"Loading preferences…"`.
  - Instead of `"Preferences saved locally on this device"`, write `"Saved to this device"`.
  - Instead of `"Dispatched email"`, write `"Sent!"`.

## Learned User Preferences
- Prefer established UI libraries (such as ReactBits) for marketing-site controls, switchers, and effects instead of fragile custom widgets.
- Avoid cringey marketing copy, permission/stats badge clusters, and tiny hard-to-read body text on the public site.
- Prefer interactive landing demos over static mockups.
- Design the public site assuming a ~125% browser-zoom visual baseline (scale rem type and spacing accordingly).
- Keep the main navbar sticky; privacy left navigation should remain sticky while scrolling.
- Prefer Quest-native behaviors when available (for example, collapsing assignment categories by default on load).
- Product messaging should highlight streak/tracker value and Google Calendar sync for due dates when relevant.
- On homework pages, keep only the BetterQuest purple Slides/Classic control; do not leave Quest's native blue Slides button visible beside it (duplicate controls flicker).
- Dark mode applies on main Quest pages and the PDF viewer only. Slides view and extra homework pages keep Quest's normal appearance.
- Grades, assignments, review, and the home page open at the top. The PDF view keeps its own place on the page.
- In the PDF viewer, pinch and Ctrl+scroll zoom smoothly while the pointer is over the PDF. The + and − buttons snap to the nearest 10% and then move in 10% steps.

## Learned Workspace Facts
- BetterQuest is a Chrome extension that enhances UT Austin Quest (quest.cns.utexas.edu).
- The repo contains both the extension (`src/`) and a public marketing site (`site/` / `web/`).
- Past-due or empty Quest assessment response tables must not mount PDF/workspace UI that breaks the page layout.
- Course assignment categories collapse via Quest's native Bootstrap collapse when `collapseCourseCategoriesByDefault` is enabled.
- Assignment lists sync from course pages (not each homework URL); the homepage auto-opens unscanned courses in background tabs to load them.
- Quest assessment response tables may use DataTables Scroller/pagination; PDF and workspace logic must read the full response set, not only currently rendered rows.
