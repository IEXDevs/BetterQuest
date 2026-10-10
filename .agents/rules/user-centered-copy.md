# User-Centered Copy and Messaging Rule

## Principle
Whenever text is written in user-facing UI, messages, labels, or statuses, it exists **not to explain what the codebase or engine is doing internally**, but **what the user wants to know, needs to do, or experiences**.

Avoid developer jargon, internal terminology, architecture disclosures, and mechanical audit logs. Focus on clear, concise, reassuring, and human-friendly language.

## Specific Guidelines

1. **State the Result, Not the Pipeline**:
   - ❌ `"Dispatched email"` → ✅ `"Sent!"`
   - ❌ `"Fetched snapshot payload"` → ✅ `"Synced"`
   - ❌ `"Executed storage transaction"` → ✅ `"Saved"`
   - ❌ `"Reading preferences…"` → ✅ `"Loading preferences…"`
   - ❌ `"Reading assignments…"` → ✅ `"Loading assignments…"`

2. **User Progress Over Row/Cache Auditing**:
   - ❌ `"67% of observed rows"` → ✅ `"67% complete"`
   - ❌ `"No observed assignment data"` → ✅ `"No assignments yet"`
   - ❌ `"4 of 6 observed assignments completed"` → ✅ `"4 of 6 assignments completed"`
   - ❌ `"12 / 18 observed rows complete · Cached"` → ✅ `"12 of 18 completed"`
   - ❌ `"4 of 6 listed course pages observed · Cached rows only"` → ✅ `"4 of 6 courses synced"`

3. **Human Reassurance Over Defensive Warnings**:
   - ❌ `"No known incomplete assignments in the observed rows."` → ✅ `"All caught up! No incomplete assignments."`
   - ❌ `"Waiting for assignment tables…"` → ✅ `"Loading assignments…"`
   - ❌ `"This is not account-wide progress. Open unscanned courses to collect their work; newly added or hidden assignments may be missing."` → ✅ `"Open any unscanned courses to sync their assignments."`
   - ❌ `"Preferences saved locally on this device."` → ✅ `"Saved to this device"`
