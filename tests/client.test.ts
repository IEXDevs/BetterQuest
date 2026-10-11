import { test } from 'node:test';
import assert from 'node:assert/strict';
import { commandErrorMessage, isContextInvalidated } from '../src/shared/client';

test('invalidated extension context maps to a reload prompt', () => {
  assert.equal(
    commandErrorMessage(new Error('Extension context invalidated.')),
    'Extension updated. Reload this page to continue.',
  );
});

test('ordinary errors pass through unchanged', () => {
  assert.equal(commandErrorMessage(new Error('Storage fixture failed')), 'Storage fixture failed');
  assert.equal(commandErrorMessage('nope'), 'Request failed.');
  assert.equal(commandErrorMessage(null), 'Request failed.');
});

test('no extension host in tests means not invalidated', () => {
  assert.equal(typeof (globalThis as { chrome?: unknown }).chrome, 'undefined');
  assert.equal(isContextInvalidated(), false);
});
