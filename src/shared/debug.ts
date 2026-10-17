// Opt-in diagnostics for the interactive PDF workspace.
//
// Turn them on from the Quest page console with either:
//   localStorage.setItem('betterquest:debug', '1')   // survives page refreshes
//   document.documentElement.dataset.betterquestDebug = 'true'  // one-shot
// Turn them off with:
//   localStorage.removeItem('betterquest:debug')
//
// These logs are for developers debugging on a live page; they never change
// what the user sees.
export function isBetterQuestDebug(doc: Document | null | undefined): boolean {
  if (!doc) return false;
  try {
    if (doc.documentElement?.dataset?.betterquestDebug === 'true') return true;
    return doc.defaultView?.localStorage?.getItem('betterquest:debug') === '1';
  } catch {
    // Private mode, blocked storage, or a foreign document — stay quiet.
    return false;
  }
}

export function betterQuestDebugLog(doc: Document | null | undefined, message: string): void {
  if (isBetterQuestDebug(doc)) console.info(`[BetterQuest debug] ${message}`);
}
