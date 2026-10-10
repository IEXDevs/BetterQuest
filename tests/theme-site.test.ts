import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';

import { createThemeController, resolveTheme } from '../scripts/theme-controller.js';

test('BetterQuest restores a valid preference and otherwise follows the system', () => {
  assert.equal(resolveTheme('light', true), 'light');
  assert.equal(resolveTheme('dark', false), 'dark');
  assert.equal(resolveTheme(null, true), 'dark');
  assert.equal(resolveTheme('sepia', false), 'light');
});

test('BetterQuest toggle persists the next theme and updates its accessible label', () => {
  const dom = new JSDOM(`
    <html data-theme="dark"><head><meta name="theme-color" content="#080808"></head><body>
      <button type="button" data-theme-toggle><span data-theme-label></span></button>
    </body></html>
  `);
  const values = new Map<string, string>([['betterquest.theme', 'dark']]);
  let transitions = 0;
  const controller = createThemeController({
    document: dom.window.document,
    storage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    },
    prefersDark: () => true,
    prefersReducedMotion: () => false,
    startTransition: (update: () => void) => {
      transitions += 1;
      update();
    },
  });

  controller.mount();
  const button = dom.window.document.querySelector<HTMLButtonElement>('[data-theme-toggle]');
  assert.equal(button?.getAttribute('aria-label'), 'Switch to light theme');
  assert.equal(button?.getAttribute('aria-pressed'), 'true');

  button?.click();
  assert.equal(dom.window.document.documentElement.dataset.theme, 'light');
  assert.equal(values.get('betterquest.theme'), 'light');
  assert.equal(button?.getAttribute('aria-label'), 'Switch to dark theme');
  assert.equal(button?.getAttribute('aria-pressed'), 'false');
  assert.equal(transitions, 1);
  assert.equal(dom.window.document.querySelector('meta[name="theme-color"]')?.getAttribute('content'), '#f1efe9');
});

test('BetterQuest skips animated transitions when reduced motion is requested', () => {
  const dom = new JSDOM('<button type="button" data-theme-toggle><span data-theme-label></span></button>');
  let transitions = 0;
  const controller = createThemeController({
    document: dom.window.document,
    storage: { getItem: () => 'dark', setItem: () => undefined },
    prefersDark: () => true,
    prefersReducedMotion: () => true,
    startTransition: (update: () => void) => {
      transitions += 1;
      update();
    },
  });

  controller.mount();
  dom.window.document.querySelector<HTMLButtonElement>('[data-theme-toggle]')?.click();
  assert.equal(dom.window.document.documentElement.dataset.theme, 'light');
  assert.equal(transitions, 0);
});
