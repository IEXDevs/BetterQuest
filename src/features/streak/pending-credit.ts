import type { Execute } from '../../shared/client';
import { localDateString } from './streak-service';

/** Survives the reload Quest fires the moment an answer is submitted. */
const PENDING_KEY = 'betterquest_streak_pending';

let settled: Promise<void> = Promise.resolve();

function storage(doc: Document): Storage | null {
  try { return doc.defaultView?.sessionStorage ?? null; }
  catch { return null; }
}

/** Remember today before navigation can cancel the in-flight save. */
export function rememberStreakCredit(doc: Document, run: Execute, date: string = localDateString()): void {
  const box = storage(doc);
  try { box?.setItem(PENDING_KEY, date); } catch { /* private mode still attempts the live save */ }
  try {
    void run({ kind: 'streak:record', date }).then(() => {
      try { if (box?.getItem(PENDING_KEY) === date) box.removeItem(PENDING_KEY); } catch { /* ignore */ }
    }).catch(() => { /* the next page retries from the stored date */ });
  } catch {
    /* ignore storage errors in environments without an extension host */
  }
}

/** Apply a credit the previous page did not finish saving. */
export function flushPendingStreakCredit(doc: Document, run: Execute): Promise<void> {
  settled = settled.then(async () => {
    const box = storage(doc);
    let date: string | null = null;
    try { date = box?.getItem(PENDING_KEY) ?? null; } catch { return; }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    await run({ kind: 'streak:record', date });
    try { if (box?.getItem(PENDING_KEY) === date) box.removeItem(PENDING_KEY); } catch { /* ignore */ }
  }).catch(() => { /* a later visit retries */ });
  return settled;
}

/** Homepage reads wait so the first calendar paint includes a credit saved on the way in. */
export function streakCreditSettled(): Promise<void> {
  return settled;
}
