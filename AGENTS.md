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
