import { test } from 'node:test';
import assert from 'node:assert/strict';
import { course, assignment, question, now } from './fixtures/models';
import type { Command } from '../src/storage/commands';
import type { CommandResponse } from '../src/shared/messages';
import { STORAGE_KEY } from '../src/storage/repository';

test('real background handler validates senders/payloads, persists locally, and notifies subscribers', async () => {
  const previous = globalThis.chrome;
  const id = 'fixture-extension-id';
  let listener: (message: unknown, sender: chrome.runtime.MessageSender, reply: (value: unknown) => void) => unknown;
  let connection: (port: chrome.runtime.Port) => void;
  let raw: Record<string, unknown> = {};
  let accessLevel = '';
  const notifications: unknown[] = [];
  const disconnects: (() => void)[] = [];
  const sender = { id, url: course.url };
  const fakeChrome = {
    runtime: { id, getManifest: () => ({ version: '0.1.0' }), onMessage: { addListener: (fn: typeof listener) => { listener = fn; } },
      onConnect: { addListener: (fn: typeof connection) => { connection = fn; } } },
    storage: { local: {
      setAccessLevel: async (options: { accessLevel: string }) => { accessLevel = options.accessLevel; },
      get: async (key: string) => ({ [key]: raw[key] }),
      set: async (values: Record<string, unknown>) => { raw = { ...raw, ...structuredClone(values) }; },
    } },
  };
  globalThis.chrome = fakeChrome as unknown as typeof chrome;
  try {
    await import('../src/background/index');
    assert.equal(accessLevel, 'TRUSTED_CONTEXTS');
    const replies: unknown[] = [];
    listener!({ type: 'betterquest:ping' }, { id: 'foreign', url: course.url }, value => replies.push(value));
    listener!({ type: 'betterquest:ping' }, { id, url: 'https://elsewhere.example/student/' }, value => replies.push(value));
    assert.equal(replies.length, 0);
    listener!({ type: 'betterquest:ping' }, sender, value => replies.push(value));
    assert.deepEqual(replies[0], { type: 'betterquest:pong', version: '0.1.0' });
    listener!({ type: 'betterquest:command', command: { kind: 'theme:set', preference: 'bad' } }, sender, value => replies.push(value));
    assert.equal((replies[1] as CommandResponse).ok, false);
    let disconnected = false;
    connection!({ name: 'betterquest:changes', sender: { id: 'foreign', url: course.url }, disconnect: () => { disconnected = true; } } as unknown as chrome.runtime.Port);
    assert.equal(disconnected, true);
    connection!({ name: 'betterquest:changes', sender, postMessage: (value: unknown) => notifications.push(value), onDisconnect: { addListener: (fn: () => void) => disconnects.push(fn) } } as unknown as chrome.runtime.Port);
    function send(command: Command): Promise<CommandResponse> {
      return new Promise(resolve => {
        const keepAlive = listener!({ type: 'betterquest:command', command }, sender, value => resolve(value as CommandResponse));
        assert.equal(keepAlive, true);
      });
    }
    const [theme, bookmark] = await Promise.all([
      send({ kind: 'theme:set', preference: 'dark' }),
      send({ kind: 'bookmarks:put', bookmark: { id: question.id, course, assignment, question, note: 'Fixture note', createdAt: now, updatedAt: now } }),
    ]);
    assert.equal(theme.ok, true); assert.equal(bookmark.ok, true);
    const read = await send({ kind: 'state:read' });
    assert.equal(read.ok, true);
    if (read.ok) { assert.equal(read.state.preferences.theme, 'dark'); assert.equal(read.state.bookmarks.length, 1); }
    assert.ok(raw[STORAGE_KEY]); assert.equal(notifications.length, 2);
    disconnects[0]();
    await send({ kind: 'theme:set', preference: 'light' }); assert.equal(notifications.length, 2);
  } finally { globalThis.chrome = previous; }
});
