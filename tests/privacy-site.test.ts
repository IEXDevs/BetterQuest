import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('BetterQuest publishes a navigable product landing page', async () => {
  const page = await read('web/src/pages/HomePage.tsx');
  const html = await read('web/index.html');

  assert.match(html, /BetterQuest \| Your Quest work, in one view/);
  assert.match(page, /All your Quest work\. One View\./);
  assert.match(page, /Browser extension for UT Austin Quest/);
  assert.match(page, /streak-style tracker/i);
  assert.match(page, /Google Calendar/i);
  assert.match(page, /InstallExtensionButton/);
  assert.match(page, /href="\/privacy"/);
  assert.match(page, /anonymous error diagnostics/i);
});

test('BetterQuest privacy page matches the extension data boundary', async () => {
  const page = await read('web/src/pages/PrivacyPage.tsx');
  const content = await read('web/src/content/privacy.ts');
  const text = `${page}\n${content}`.replace(/\s+/g, ' ');

  assert.match(text, /October 9, 2026/);
  assert.match(text, /betterquest\.local\.v1/);
  assert.match(text, /Chrome storage/i);
  assert.match(text, /quest\.cns\.utexas\.edu/);
  assert.match(text, /course and assignment metadata/i);
  assert.match(text, /does not.*passwords/i);
  assert.match(text, /does not.*submitted answers/i);
  assert.match(text, /remove the extension|clear.*extension.*data/i);
  assert.match(text, /do not sell/i);
  assert.match(text, /user-submitted issue report/i);
  assert.match(text, /automatic extension error/i);
  assert.match(text, /do(?:es)? not include.*submitted answers.*coursework text/is);
  assert.match(text, /EasyAccess/);
  assert.match(text, /currently available only in UTMAX/i);
  assert.match(text, /coarse.*location|general.*location/i);
  assert.match(text, /connection quality|internet speed/i);
  assert.match(text, /API.*request.*hour/i);
  assert.match(text, /de-identified.*aggregate|anonymized.*aggregate/i);
  assert.match(text, /public.*internal.*dashboard/is);
  assert.match(page, /https:\/\/iexdevs\.com\/contact/);
  assert.match(page, /LineSidebar/);
});

test('BetterQuest Cloudflare configuration isolates the website from extension dist', async () => {
  const config = await read('wrangler.jsonc');
  const packageJson = JSON.parse(await read('package.json'));

  assert.match(config, /"name"\s*:\s*"betterquest"/);
  assert.match(config, /"directory"\s*:\s*"site"/);
  assert.match(config, /betterquest\.iexdevs\.com/);
  assert.match(packageJson.scripts['site:deploy'], /wrangler deploy/);
  assert.match(packageJson.scripts['site:build'], /vite build/);
  assert.equal(packageJson.scripts.build, 'tsc --noEmit && node scripts/build.mjs');
});
