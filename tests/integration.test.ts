import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { startIntegration } from '../src/content/integration';
import { findNavigation } from '../src/content/navigation';
import { isPing, isStudentPage } from '../src/shared/messages';

const trail = '<nav class="qh-navbar"><div class="qh-breadcrumbs"><nav aria-label="breadcrumb"><ol class="qh-breadcrumb"><li>Home</li><li>Fall 2026</li><li>Course</li><li>My Assignments</li></ol></nav></div><ul class="qh-nav"><li><a href="/student/account">Account</a></li></ul></nav>';
const accountTrail = `<nav class="qh-navbar"><div class="qh-breadcrumbs"></div><ul class="qh-nav">
  <li class="qh-nav-item"><span class="qh-nav-link">Fixture Student (fx1)</span></li>
  <li class="qh-nav-item"><a class="qh-nav-link" href="/student/contact/new">Contact</a></li>
  <li class="qh-nav-item"><a class="qh-nav-link" href="https://wikis.utexas.edu/display/questla/Students">Wiki</a></li>
  <li class="qh-nav-item"><a class="qh-nav-link" href="/student/courses/fees">What I Owe</a></li>
  <li class="qh-nav-item"><a class="qh-nav-link" href="/student/profiles/edit">Account</a></li>
  <li class="qh-nav-item"><a class="qh-nav-link" href="/student/home/logoff">Log out</a></li>
  <li class="qh-nav-item qh-dropdown"><a class="qh-nav-link qh-dropdown-toggle" href="#">Shortcuts</a></li>
</ul></nav>`;
const pause = () => new Promise(resolve => setTimeout(resolve, 130));
function setup(html = trail) {
  const dom = new JSDOM(`<body>${html}<main><input value="unchanged"></main></body>`, {
    url: 'https://quest.cns.utexas.edu/student/assignments',
    pretendToBeVisual: true,
  });
  const document = dom.window.document;
  const integration = startIntegration(document, dom.window as unknown as Window);
  const navigation = () => document.querySelector<HTMLElement>('[data-betterquest="navigation"]');
  const root = () => navigation();
  const button = () => navigation()?.querySelector<HTMLButtonElement>('button.qh-nav-link');
  const panel = () => document.querySelector<HTMLElement>('[data-betterquest="panel"]');
  const cleanup = () => { integration.dispose(); dom.window.close(); };
  return { dom, document, integration, navigation, root, button, panel, cleanup };
}

test('single selector: missing navigation is a no-op, without fallback injection', () => {
  const f = setup('<nav>Home / Fall 2026 / My Assignments</nav>');
  try {
    assert.equal(findNavigation(f.document), null);
    assert.equal(f.document.querySelectorAll('[data-betterquest]').length, 0);
  } finally { f.cleanup(); }
});

test('one button between breadcrumbs and nav; unverified pages do not open an assignment overlay', () => {
  const f = setup();
  try {
    const breadcrumbs = f.document.querySelector('.qh-breadcrumbs')!;
    const originalNav = f.document.querySelector('.qh-nav')!;
    const originalMarkup = [breadcrumbs.outerHTML, originalNav.querySelector(':scope > li:not([data-betterquest])')!.outerHTML];
    assert.equal(f.navigation()?.tagName, 'LI');
    assert.equal(f.navigation()?.parentElement, originalNav);
    f.integration.reconcile();
    f.integration.reconcile();
    assert.equal(f.document.querySelectorAll('[data-betterquest="navigation"]').length, 1);
    f.button()!.click();
    assert.equal(f.panel(), null);
    assert.equal(f.button()!.disabled, false);
    assert.equal(f.button()!.getAttribute('aria-haspopup'), 'dialog');
    assert.equal(f.button()!.getAttribute('aria-expanded'), 'true');
    assert.equal(f.document.querySelector('input')?.value, 'unchanged');
    assert.equal(f.document.querySelector('main')?.hasAttribute('style'), false);
    assert.ok(f.document.querySelector('[data-betterquest="navigation-style"]'));
    assert.deepEqual([breadcrumbs.outerHTML, originalNav.querySelector(':scope > li:not([data-betterquest])')!.outerHTML], originalMarkup);
    assert.equal(f.document.querySelector('.qh-navbar')?.hasAttribute('style'), false);
  } finally { f.cleanup(); }
});

test('DOM replacement and late navigation insertion remount exactly one button', async () => {
  const f = setup('');
  try {
    f.document.body.insertAdjacentHTML('afterbegin', trail);
    await pause();
    assert.ok(f.button());
    f.document.querySelector('.qh-navbar')!.outerHTML = trail;
    await pause();
    assert.equal(f.document.querySelectorAll('[data-betterquest="navigation"]').length, 1);
    assert.ok(f.button());
    assert.equal(f.navigation()?.parentElement, f.document.querySelector('.qh-nav'));
    f.document.querySelector('.qh-navbar')!.remove();
    await pause();
    assert.equal(f.navigation(), null);
    assert.equal(f.panel(), null);
  } finally { f.cleanup(); }
});

test('nav-list rerender repositions the existing button without duplicates or an overlay', async () => {
  const f = setup();
  try {
    const originalButton = f.navigation();
    f.button()!.click();
    f.document.querySelector('.qh-nav')!.outerHTML = '<ul class="qh-nav"><li>New navigation</li></ul>';
    await pause();
    assert.equal(f.navigation(), originalButton);
    assert.equal(f.navigation()?.parentElement, f.document.querySelector('.qh-nav'));
    assert.equal(f.navigation()?.nextElementSibling?.textContent, 'New navigation');
    assert.equal(f.panel(), null);
    assert.equal(f.document.querySelectorAll('[data-betterquest="navigation"]').length, 1);
  } finally { f.cleanup(); }
});

test('removing only the owned navigation host remounts it and keeps account access available', async () => {
  const f = setup(accountTrail);
  try {
    f.navigation()!.remove(); await pause();
    assert.equal(f.document.querySelectorAll('[data-betterquest="navigation"]').length, 1);
    assert.ok(f.navigation()?.isConnected);
    assert.equal(f.document.querySelector('.qh-navbar')?.getAttribute('data-betterquest-nav'), 'compact');
  } finally { f.cleanup(); }
});

test('incomplete navbar waits for the authenticated structure instead of appending elsewhere', async () => {
  const f = setup('<nav class="qh-navbar"><div class="qh-breadcrumbs"></div></nav>');
  try {
    assert.equal(f.navigation(), null);
    f.document.querySelector('.qh-navbar')!.insertAdjacentHTML('beforeend', '<ul class="qh-nav"></ul>');
    await pause();
    assert.equal(f.navigation()?.parentElement, f.document.querySelector('.qh-nav'));
  } finally { f.cleanup(); }
});

test('reinjection cleans stale hosts; lifecycle disposal removes nodes and listeners', () => {
  const f = setup();
  let next: ReturnType<typeof startIntegration> | undefined;
  try {
    f.button()!.click();
    f.integration.dispose();
    next = startIntegration(f.document, f.dom.window as unknown as Window);
    assert.equal(f.document.querySelectorAll('[data-betterquest="navigation"]').length, 1);
    assert.equal(f.panel(), null);
    next.dispose();
    assert.equal(f.document.querySelectorAll('[data-betterquest]').length, 0);
  } finally { next?.dispose(); f.cleanup(); }
});

test('student route changes retain one navbar button and leaving scope removes integration', async () => {
  const f = setup();
  try {
    f.button()!.click();
    f.dom.window.history.pushState({}, '', '/student/course');
    f.dom.window.dispatchEvent(new f.dom.window.PopStateEvent('popstate'));
    await pause();
    assert.equal(f.panel(), null);
    assert.equal(f.document.querySelectorAll('[data-betterquest="navigation"]').length, 1);
    f.dom.window.history.pushState({}, '', '/instructor/');
    f.dom.window.dispatchEvent(new f.dom.window.PopStateEvent('popstate'));
    await pause();
    assert.equal(f.document.querySelectorAll('[data-betterquest]').length, 0);
  } finally { f.cleanup(); }
});

test('navbar no longer creates a floating panel or handles page-level Escape', () => {
  const f = setup();
  try {
    f.button()!.click();
    f.document.dispatchEvent(new f.dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    assert.equal(f.panel(), null);
    assert.equal(f.document.querySelectorAll('[data-betterquest="navigation"]').length, 1);
  } finally { f.cleanup(); }
});

test('compact navbar preserves native links inside one top-right BetterQuest menu and restores the shell', () => {
  const f = setup(accountTrail);
  try {
    const nativeItems = [...f.document.querySelectorAll('.qh-nav > .qh-nav-item:not([data-betterquest])')];
    assert.equal(f.document.querySelector('.qh-navbar')?.getAttribute('data-betterquest-nav'), 'compact');
    f.button()!.click();
    const menuHost = f.navigation()!.querySelector(':scope > span');
    const links = [...menuHost!.shadowRoot!.querySelectorAll<HTMLAnchorElement>('.quest-link')];
    assert.deepEqual(links.map(link => link.textContent?.trim()), ['Contact', 'Wiki', 'What I Owe', 'Account', 'Log out']);
    assert.equal(links.find(link => link.textContent?.trim() === 'Log out')?.getAttribute('href'), '/student/home/logoff');
    assert.equal(nativeItems.every(item => item.isConnected), true);
    f.integration.dispose();
    assert.equal(f.document.querySelector('.qh-navbar')?.hasAttribute('data-betterquest-nav'), false);
    assert.equal(f.document.querySelector('[data-betterquest="navigation-style"]'), null);
  } finally { f.cleanup(); }
});

test('compact menu rejects placeholder and lookalike external navigation links', () => {
  const f = setup(accountTrail.replace('</ul>', `
    <li class="qh-nav-item"><a class="qh-nav-link" href="https://wikis.utexas.edu.evil.example/display/questla/Students">Fake wiki</a></li>
    <li class="qh-nav-item"><a class="qh-nav-link" href="https://wikis.utexas.edu/elsewhere">Wrong wiki path</a></li>
  </ul>`));
  try {
    f.button()!.click();
    const links = [...f.navigation()!.querySelector(':scope > span')!.shadowRoot!.querySelectorAll<HTMLAnchorElement>('.quest-link')];
    assert.equal(links.some(link => link.getAttribute('href') === '#'), false);
    assert.equal(links.some(link => link.textContent === 'Fake wiki' || link.textContent === 'Wrong wiki path'), false);
  } finally { f.cleanup(); }
});

test('student route and handshake guards remain narrowly scoped', () => {
  assert.equal(isStudentPage('https://quest.cns.utexas.edu/student/'), true);
  assert.equal(isStudentPage('https://quest.cns.utexas.edu/studentish'), false);
  assert.equal(isStudentPage('https://elsewhere.example/student/'), false);
  assert.equal(isPing({ type: 'betterquest:ping' }), true);
  assert.equal(isPing(null), false);
  assert.equal(isPing({ type: 'other' }), false);
});
