import { isPing, isStudentPage, QUEST_ORIGIN, type Pong } from '../shared/messages';
import { isCommand } from '../storage/commands';
import { chromeBackend, LocalRepository } from '../storage/repository';
import { object } from '../shared/validation';

const access = chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
const repository = new LocalRepository(chromeBackend());
const subscribers = new Set<chrome.runtime.Port>();
const SCAN_TIMEOUT_MS = 45_000;
const SCAN_POLL_MS = 400;

chrome.runtime.onConnect.addListener(port => {
  if (port.name !== 'betterquest:changes' || port.sender?.id !== chrome.runtime.id ||
    !port.sender.url || !isStudentPage(port.sender.url)) { port.disconnect(); return; }
  subscribers.add(port);
  port.onDisconnect.addListener(() => {
    subscribers.delete(port);
    void chrome.runtime.lastError;
  });
});

function isSyncCourseMessage(value: unknown): value is { type: 'betterquest:sync-course'; courseId: string; url: string } {
  return object(value)
    && value.type === 'betterquest:sync-course'
    && typeof value.courseId === 'string'
    && value.courseId.length > 0
    && value.courseId.length <= 4000
    && typeof value.url === 'string'
    && value.url.length <= 4000;
}

function isCourseShowUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const isShow = url.pathname === '/student/courses/show' && /^\d+$/.test(url.searchParams.get('course') || '');
    const isShowPath = /^\/student\/courses\/show\/\d+$/.test(url.pathname);
    return url.origin === QUEST_ORIGIN && (isShow || isShowPath);
  } catch {
    return false;
  }
}

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}

async function waitForCourseScan(courseId: string, startedAt: string, timeoutMs: number): Promise<boolean> {
  const started = Date.parse(startedAt);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const state = await repository.execute({ kind: 'state:read' });
    const fresh = state.cache.pages.some(page =>
      Boolean(page.scannedCourseIds?.includes(courseId))
      && Date.parse(page.observedAt) >= started);
    if (fresh) return true;
    await sleep(SCAN_POLL_MS);
  }
  return false;
}

async function syncCourseTab(courseId: string, url: string): Promise<'ok' | 'timeout' | 'error'> {
  if (!isCourseShowUrl(url)) return 'error';
  const startedAt = new Date().toISOString();
  await repository.execute({ kind: 'assignments:refresh', requestedAt: startedAt });
  for (const port of subscribers) {
    try { port.postMessage({ type: 'betterquest:changed' }); } catch { subscribers.delete(port); }
  }

  let tabId: number | undefined;
  try {
    const tab = await chrome.tabs.create({ url, active: false });
    tabId = tab.id;
    if (tabId === undefined) return 'error';
    const ok = await waitForCourseScan(courseId, startedAt, SCAN_TIMEOUT_MS);
    return ok ? 'ok' : 'timeout';
  } catch {
    return 'error';
  } finally {
    if (tabId !== undefined) {
      try { await chrome.tabs.remove(tabId); } catch { /* Tab may already be closed. */ }
    }
  }
}

chrome.runtime.onMessage.addListener((message: unknown, sender, reply) => {
  if (sender.id !== chrome.runtime.id ||
    !sender.url || !isStudentPage(sender.url)) return;

  if (isPing(message)) {
    const response: Pong = { type: 'betterquest:pong', version: chrome.runtime.getManifest().version };
    reply(response);
    return;
  }

  if (isSyncCourseMessage(message)) {
    void access.then(() => syncCourseTab(message.courseId, message.url)).then(
      result => reply({ ok: true, result }),
      () => reply({ ok: false, error: 'Course sync failed.', result: 'error' }),
    );
    return true;
  }

  if (!object(message) || message.type !== 'betterquest:command') return;
  if (!isCommand(message.command)) { reply({ ok: false, error: 'Invalid BetterQuest command.' }); return; }
  const command = message.command;
  void access.then(() => repository.execute(command)).then(
    state => {
      reply({ ok: true, state });
      if (command.kind !== 'state:read') for (const port of subscribers) {
        try { port.postMessage({ type: 'betterquest:changed' }); } catch { subscribers.delete(port); }
      }
    },
    error => reply({ ok: false, error: error instanceof Error ? error.message : 'Local storage failed.' }),
  );
  return true;
});
