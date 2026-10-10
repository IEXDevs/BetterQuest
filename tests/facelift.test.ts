import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { startPageFeatures } from '../src/content/features';
import { createPdfAssessmentWorkspace } from '../src/features/assessment/workspace';
import { createSettingsMenu } from '../src/features/settings/menu';
import { LocalRepository } from '../src/storage/repository';
import type { Execute } from '../src/shared/client';
import type { LocalState } from '../src/shared/models';

function store() {
  let raw: LocalState | undefined;
  const listeners = new Set<() => void>();
  const repo = new LocalRepository({ read: async () => raw, write: async state => { raw = structuredClone(state); listeners.forEach(listener => listener()); } });
  const run: Execute = command => repo.execute(command);
  return { run, subscribe: (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); } };
}

function prepare(dom: JSDOM) {
  dom.window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList;
}

const pause = () => new Promise(resolve => setTimeout(resolve, 180));

test('homepage course art is derived from the department code and leaves native course data intact', async () => {
  const dom = new JSDOM(`<html><body class="mdb-skin"><div id="quest-nav-header-div"></div><div id="main-content"><div id="courses-table-div">
    <div id="courses-table_wrapper"><table id="courses-table"><thead><tr><th>Course</th><th>Name</th><th>Unique</th><th>Instructor</th><th>Short Name</th></tr></thead>
    <tbody><tr><td><img src="/assets/images/subj_generic.png" alt=""></td><td><a href="/student/courses/show?course=1">CALCULUS</a></td><td>58360</td><td>Instructor</td><td aria-label="Course Short Name: M 408C">M 408C</td></tr></tbody></table></div>
  </div><div id="enroll-div"></div></div></body></html>`, {
    url: 'https://quest.cns.utexas.edu/student/courses', pretendToBeVisual: true,
  });
  prepare(dom);
  const f = store(); const features = startPageFeatures(dom.window.document, dom.window as unknown as Window, f.run, f.subscribe);
  try {
    features.reconcile(); await pause();
    const host = dom.window.document.querySelector<HTMLElement>('[data-betterquest="course-artwork"]')!;
    assert.ok(host);
    assert.equal(host.shadowRoot!.querySelector('.department')?.textContent, 'M');
    assert.equal(host.shadowRoot!.querySelector('.course-code')?.textContent, 'M 408C');
    assert.equal(dom.window.document.querySelector('img')?.getAttribute('src'), '/assets/images/subj_generic.png');
  } finally { features.dispose(); dom.window.close(); }
});

test('homepage course art follows same-row native image replacement and restores the live image', async () => {
  const dom = new JSDOM(`<html><body class="mdb-skin"><div id="quest-nav-header-div"></div><div id="main-content"><div id="courses-table-div">
    <div id="courses-table_wrapper"><table id="courses-table"><thead><tr><th>Course</th><th>Name</th><th>Unique</th><th>Instructor</th><th>Short Name</th></tr></thead>
    <tbody><tr><td><img id="old-art" src="/assets/images/subj_generic.png" alt=""></td><td><a href="/student/courses/show?course=1">CALCULUS</a></td><td>58360</td><td>Instructor</td><td aria-label="Course Short Name: M 408C">M 408C</td></tr></tbody></table></div>
  </div><div id="enroll-div"></div></div></body></html>`, {
    url: 'https://quest.cns.utexas.edu/student/courses', pretendToBeVisual: true,
  });
  prepare(dom);
  const f = store(); const features = startPageFeatures(dom.window.document, dom.window as unknown as Window, f.run, f.subscribe);
  try {
    features.reconcile(); await pause();
    const oldImage = dom.window.document.querySelector<HTMLImageElement>('#old-art')!;
    const replacement = dom.window.document.createElement('img'); replacement.id = 'new-art'; replacement.src = '/assets/images/subj_generic.png';
    oldImage.replaceWith(replacement); await pause();
    assert.equal(replacement.hidden, true);
    assert.equal(dom.window.document.querySelectorAll('[data-betterquest="course-artwork"]').length, 1);
    features.dispose();
    assert.equal(replacement.hidden, false);
  } finally { features.dispose(); dom.window.close(); }
});

test('disabling animations switches course artwork to distinct solid colors without animated layers', async () => {
  const dom = new JSDOM(`<html><body class="mdb-skin"><div id="quest-nav-header-div"></div><div id="main-content"><div id="courses-table-div">
    <div id="courses-table_wrapper"><table id="courses-table"><thead><tr><th>Course</th><th>Name</th><th>Unique</th><th>Instructor</th><th>Short Name</th></tr></thead>
    <tbody><tr><td><img src="/assets/images/subj_generic.png" alt=""></td><td><a href="/student/courses/show?course=1">CALCULUS</a></td><td>58360</td><td>Instructor</td><td aria-label="Course Short Name: M 408C">M 408C</td></tr></tbody></table></div>
  </div><div id="enroll-div"></div></div></body></html>`, {
    url: 'https://quest.cns.utexas.edu/student/courses', pretendToBeVisual: true,
  });
  prepare(dom);
  const f = store();
  const features = startPageFeatures(dom.window.document, dom.window as unknown as Window, f.run, f.subscribe);
  try {
    features.reconcile(); await pause();
    const host = dom.window.document.querySelector<HTMLElement>('[data-betterquest="course-artwork"]')!;
    assert.ok(host);
    assert.equal(host.getAttribute('data-animations'), null);
    assert.equal(host.shadowRoot!.querySelector('.art')?.classList.contains('is-disabled'), false);

    // Disable animations
    await f.run({ kind: 'feature:set', feature: 'animations', enabled: false });
    dom.window.dispatchEvent(new dom.window.Event('betterquest:preferences-changed'));
    await pause();

    assert.equal(dom.window.document.documentElement.dataset.betterquestAnimations, 'disabled');
    assert.equal(host.getAttribute('data-animations'), 'disabled');
    assert.equal(host.shadowRoot!.querySelector('.art')?.classList.contains('is-disabled'), true);
  } finally { features.dispose(); dom.window.close(); }
});

test('PDF assessment workspace synchronizes answer chips with native controls without auto-submitting', async () => {
  const dom = new JSDOM(`<html><body class="mdb-skin"><div id="quest-nav-header-div"></div><main id="main-content"><div id="target">
    <div id="pdf-frame"><div id="presentation-pdf-frame"><iframe src="/student/images/download_pdf?instance=courseuserassignment_1" title="Assignment PDF"></iframe></div></div>
    <div id="view-responses-table-id"><table id="instance-table-courseuserassignment_1"><tbody>
      <tr data-id="cuaip_1"><td>1.</td><td><select aria-label="Select your response"><option value="">- select -</option><option value="1">1</option><option value="2">2</option></select></td><td class="status"></td><td class="previous">0 / 2</td><td class="correct"></td><td><button aria-label="Submit response">Submit</button></td></tr>
      <tr data-id="cuaip_2"><td>2.</td><td><select aria-label="Select your response"><option value="">- select -</option><option value="1">1</option><option value="2">2</option><option value="3">3</option></select></td><td class="status"></td><td class="previous">1 / 2</td><td class="correct">40</td><td><button aria-label="Submit response">Submit</button></td></tr>
    </tbody></table></div><div id="tally-div">40 out of 200 points (20%)</div>
  </div></main></body></html>`, { url: 'https://quest.cns.utexas.edu/student/instances/show?instance=courseuserassignment_1', pretendToBeVisual: true });
  prepare(dom);
  const f = store(); const features = startPageFeatures(dom.window.document, dom.window as unknown as Window, f.run, f.subscribe);
  let submissions = 0;
  dom.window.document.querySelectorAll<HTMLButtonElement>('[aria-label="Submit response"]').forEach(button => button.addEventListener('click', () => submissions++));
  try {
    features.reconcile(); await pause();
    const host = dom.window.document.querySelector<HTMLElement>('[data-betterquest="assessment-rail"]')!;
    assert.ok(host);
    assert.match(host.shadowRoot!.querySelector('.progress-copy')!.textContent!, /1 of 2 submitted/);
    assert.match(host.shadowRoot!.querySelector('.points')!.textContent!, /40 \/ 200 points/);
    const first = host.shadowRoot!.querySelector<HTMLElement>('[data-question-id="cuaip_1"]')!;
    const choice = first.querySelector<HTMLButtonElement>('button[data-value="2"]')!;
    choice.click();
    assert.equal(dom.window.document.querySelector<HTMLSelectElement>('tr[data-id="cuaip_1"] select')!.value, '2');
    assert.equal(submissions, 0);
    assert.equal(first.querySelector<HTMLButtonElement>('.submit')!.hidden, false);
    first.querySelector<HTMLButtonElement>('.submit')!.click();
    assert.equal(submissions, 1);
    features.dispose();
    assert.equal(dom.window.document.querySelector('[data-betterquest="assessment-rail"]'), null);
    assert.equal(dom.window.document.querySelector('#target')?.hasAttribute('data-betterquest-pdf-workspace'), false);
  } finally { features.dispose(); dom.window.close(); }
});

test('interactive PDF choices delegate into the matching native Quest selector without submitting', async () => {
  const dom = new JSDOM(`<html><head></head><body><div id="target"><div id="pdf-frame"><div id="presentation-pdf-frame"><iframe title="Assignment PDF" src="/student/images/download_pdf?instance=courseuserassignment_1"></iframe></div></div>
    <div id="view-responses-table-id"><table id="instance-table-courseuserassignment_1"><tbody><tr data-id="cuaip_1"><td>1.</td><td><select aria-label="Select your response"><option value=""></option><option value="1">1</option><option value="2">2</option><option value="3">3</option></select></td><td></td><td class="previous">0 / 2</td><td></td><td><button aria-label="Submit response">Submit</button></td></tr></tbody></table></div><div id="tally-div">0 out of 10 points (0%)</div></div></body></html>`, {
    url: 'https://quest.cns.utexas.edu/student/instances/show?instance=courseuserassignment_1', pretendToBeVisual: true,
  });
  prepare(dom);
  let choose: ((question: number, option: number) => void) | undefined;
  let submitted = 0; dom.window.document.querySelector('button')!.addEventListener('click', () => submitted++);
  const fakeFactory = (container: HTMLElement, options: { optionMaximums: ReadonlyMap<number, number>; onChoose: (question: number, option: number) => void }) => {
    choose = options.onChoose;
    assert.deepEqual([...options.optionMaximums], [[1, 3]]);
    const element = dom.window.document.createElement('section'); container.append(element);
    return { element, ready: Promise.resolve(true), setSelected() {}, dispose() { element.remove(); } };
  };
  const workspace = (createPdfAssessmentWorkspace as unknown as (root: HTMLElement, options: { createPdfViewer: typeof fakeFactory }) => ReturnType<typeof createPdfAssessmentWorkspace>)(
    dom.window.document.querySelector<HTMLElement>('#target')!, { createPdfViewer: fakeFactory },
  );
  try {
    workspace.reconcile(); await Promise.resolve(); await Promise.resolve();
    assert.equal(typeof choose, 'function');
    choose!(1, 2); await Promise.resolve();
    assert.equal(dom.window.document.querySelector<HTMLSelectElement>('select')!.value, '2');
    assert.equal(submitted, 0);
    assert.equal(dom.window.document.querySelector<HTMLIFrameElement>('iframe')!.hidden, true);
  } finally { workspace.dispose(); dom.window.close(); }
});

test('PDF assessment workspace fails closed for disabled choices and hidden native submits', async () => {
  const dom = new JSDOM(`<html><head><style>.quest-hidden{display:none}</style></head><body class="mdb-skin"><div id="quest-nav-header-div"></div><main id="main-content"><div id="target">
    <div id="pdf-frame"><div id="presentation-pdf-frame"><iframe src="/student/images/download_pdf?instance=courseuserassignment_1" title="Assignment PDF"></iframe></div></div>
    <div id="view-responses-table-id"><table id="instance-table-courseuserassignment_1"><tbody>
      <tr data-id="cuaip_1"><td>1.</td><td><select aria-label="Select your response"><option value="">- select -</option><optgroup label="Answers"><option value="1">1</option></optgroup><option value="2" disabled>2</option></select></td><td></td><td class="previous">0 / 2</td><td></td><td><button aria-label="Submit response">Submit</button></td></tr>
      <tr data-id="cuaip_2"><td>2.</td><td><select aria-label="Select your response"><option value="">- select -</option><option value="1">1</option></select></td><td></td><td class="previous">0 / 2</td><td></td><td><button aria-label="Submit response" hidden>Submit</button></td></tr>
      <tr data-id="cuaip_3" class="quest-hidden"><td>3.</td><td><select aria-label="Select your response"><option value="">- select -</option><option value="1">1</option></select></td><td></td><td class="previous">0 / 2</td><td></td><td><button aria-label="Submit response">Submit</button></td></tr>
    </tbody></table></div><div id="tally-div">0 out of 10 points (0%)</div>
  </div></main></body></html>`, { url: 'https://quest.cns.utexas.edu/student/instances/show?instance=courseuserassignment_1', pretendToBeVisual: true });
  prepare(dom);
  const f = store(); const features = startPageFeatures(dom.window.document, dom.window as unknown as Window, f.run, f.subscribe);
  try {
    features.reconcile(); await pause();
    const rail = dom.window.document.querySelector<HTMLElement>('[data-betterquest="assessment-rail"]')!.shadowRoot!;
    assert.equal(rail.querySelectorAll('[data-question-id]').length, 1);
    assert.equal(rail.querySelector('[data-question-id="cuaip_1"] button[data-value="2"]'), null);
    assert.equal(rail.querySelector('[data-question-id="cuaip_2"]'), null);
    const nativeSubmit = dom.window.document.querySelector<HTMLButtonElement>('tr[data-id="cuaip_1"] [aria-label="Submit response"]')!;
    rail.querySelector<HTMLButtonElement>('[data-question-id="cuaip_1"] button[data-value="1"]')!.click();
    nativeSubmit.hidden = true;
    let submitted = false; nativeSubmit.addEventListener('click', () => { submitted = true; });
    rail.querySelector<HTMLButtonElement>('[data-question-id="cuaip_1"] .submit')!.click();
    assert.equal(submitted, false);
    nativeSubmit.hidden = false;
    dom.window.document.querySelector<HTMLOptGroupElement>('tr[data-id="cuaip_1"] optgroup')!.disabled = true;
    rail.querySelector<HTMLButtonElement>('[data-question-id="cuaip_1"] .submit')!.click();
    assert.equal(submitted, false);
  } finally { features.dispose(); dom.window.close(); }
});

test('Slides answer equations stay dark on their light paper surface and reveal submit after selection', async () => {
  const dom = new JSDOM(`<html><body class="mdb-skin"><div id="quest-nav-header-div"></div><main id="main-content"><div id="target">
    <div id="presentation-div"><div class="row instanceitempart"><div class="bg-light col" id="form-cuaip_1">
      <div class="custom-control"><input id="radio-cuaip_1-1" type="radio" name="response_cuaip_1" value="1"><label class="custom-control-label" for="radio-cuaip_1-1"><mjx-container>choice one</mjx-container></label></div>
      <div class="custom-control"><input id="radio-cuaip_1-2" type="radio" name="response_cuaip_1" value="2"><label class="custom-control-label" for="radio-cuaip_1-2"><mjx-container>choice two</mjx-container></label></div>
    </div><button class="submit-btn" type="submit">Submit</button></div></div>
  </div></main></body></html>`, { url: 'https://quest.cns.utexas.edu/student/instances/administer?instance=courseuserassignment_1', pretendToBeVisual: true });
  prepare(dom);
  const f = store(); const features = startPageFeatures(dom.window.document, dom.window as unknown as Window, f.run, f.subscribe);
  try {
    features.reconcile(); await pause();
    const presentation = dom.window.document.querySelector<HTMLElement>('#presentation-div')!;
    assert.equal(presentation.getAttribute('data-betterquest-slide'), 'enhanced');
    const question = dom.window.document.querySelector<HTMLElement>('.instanceitempart')!;
    assert.equal(question.getAttribute('data-betterquest-question-ready'), 'false');
    const radio = dom.window.document.querySelector<HTMLInputElement>('#radio-cuaip_1-2')!;
    radio.checked = true; radio.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    assert.equal(question.getAttribute('data-betterquest-question-ready'), 'true');
    assert.equal(dom.window.getComputedStyle(dom.window.document.querySelector('mjx-container')!).color, 'rgb(24, 37, 58)');
  } finally { features.dispose(); dom.window.close(); }
});

test('Slides reveal only the selected question submit and preserve natively hidden submits', async () => {
  const dom = new JSDOM(`<html><head><style>.quest-hidden{visibility:hidden}</style></head><body class="mdb-skin"><div id="quest-nav-header-div"></div><main id="main-content"><div id="target"><div id="presentation-div">
    <div class="instanceitempart" id="part-one"><div class="bg-light"><input id="one" type="radio" name="response_one" value="1"><label class="custom-control-label" for="one">One</label></div><button class="submit-btn">Submit one</button></div>
    <div class="instanceitempart" id="part-two"><div class="bg-light"><input id="two" type="radio" name="response_two" value="1"><label class="custom-control-label" for="two">Two</label></div><button class="submit-btn" hidden>Submit two</button></div>
  </div></div></main></body></html>`, { url: 'https://quest.cns.utexas.edu/student/instances/administer?instance=courseuserassignment_1', pretendToBeVisual: true });
  prepare(dom);
  const f = store(); const features = startPageFeatures(dom.window.document, dom.window as unknown as Window, f.run, f.subscribe);
  try {
    features.reconcile(); await pause();
    const first = dom.window.document.querySelector<HTMLElement>('#part-one')!;
    const second = dom.window.document.querySelector<HTMLElement>('#part-two')!;
    assert.equal(first.dataset.betterquestQuestionReady, 'false');
    assert.equal(second.dataset.betterquestQuestionReady, 'false');
    const radio = first.querySelector<HTMLInputElement>('input')!; radio.checked = true; radio.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    assert.equal(first.dataset.betterquestQuestionReady, 'true');
    assert.equal(second.dataset.betterquestQuestionReady, 'false');
    assert.equal(second.querySelector<HTMLButtonElement>('button')!.hidden, true);
    first.querySelector('button')!.classList.add('quest-hidden'); await pause();
    assert.equal(first.dataset.betterquestQuestionReady, 'false');
  } finally { features.dispose(); dom.window.close(); }
});

test('moving from options to suboptions keeps modal open and debounces for at least 2 seconds on cursor leave', async () => {
  const dom = new JSDOM(`<html><body><div id="nav-host"></div></body></html>`, { pretendToBeVisual: true });
  prepare(dom);
  const f = store();
  const host = dom.window.document.querySelector<HTMLElement>('#nav-host')!;
  const trigger = dom.window.document.createElement('button');
  const questTrigger = dom.window.document.createElement('button');
  host.append(trigger, questTrigger);

  const menu = createSettingsMenu(host, trigger, f.run, f.subscribe, {
    saved: () => {},
    upcoming: () => false,
    hasUpcoming: () => false,
    darkAvailable: () => true,
    questLinks: () => [{ label: 'Account', href: '/student/profiles/edit', target: null }],
  }, questTrigger);

  try {
    // 1. Hover on Quest Settings button opens the Quest Settings modal
    questTrigger.dispatchEvent(new dom.window.Event('pointerenter'));
    const menuHost = host.querySelector<HTMLSpanElement>(':scope > span')!;
    assert.equal(menuHost.hidden, false);

    // 2. Hover over Account option opens its flyout
    const wrap = menuHost.shadowRoot!.querySelector<HTMLElement>('.quest-item-wrapper.has-flyout')!;
    assert.ok(wrap);
    wrap.dispatchEvent(new dom.window.Event('pointerenter'));
    const flyout = wrap.querySelector<HTMLElement>('.sub-flyout')!;
    assert.equal(flyout.hidden, false);

    // 3. Move cursor from wrap to flyout
    wrap.dispatchEvent(new dom.window.Event('pointerleave'));
    flyout.dispatchEvent(new dom.window.Event('pointerenter'));
    assert.equal(menuHost.hidden, false);
    assert.equal(flyout.hidden, false);

    // 4. Move cursor off flyout entirely into empty space
    flyout.dispatchEvent(new dom.window.Event('pointerleave'));

    // After 1000ms (1 second), the modal and flyout MUST STILL BE OPEN
    await new Promise(resolve => setTimeout(resolve, 1000));
    assert.equal(menuHost.hidden, false, 'Modal should remain open after 1 second');
    assert.equal(flyout.hidden, false, 'Flyout should remain open after 1 second');

    // After 2100ms total (> 2 seconds), both modal and flyout disappear
    await new Promise(resolve => setTimeout(resolve, 1200));
    assert.equal(menuHost.hidden, true, 'Modal should disappear after 2 seconds without cursor');
    assert.equal(flyout.hidden, true, 'Flyout should disappear after 2 seconds without cursor');
  } finally {
    menu.dispose();
    dom.window.close();
  }
});

test('BetterQuest and Quest Settings are completely separate menus without linked modal tabs', () => {
  const dom = new JSDOM('<html><body><div id="nav-host"></div></body></html>', { pretendToBeVisual: true });
  prepare(dom);
  const f = store();
  const host = dom.window.document.querySelector<HTMLElement>('#nav-host')!;
  const trigger = dom.window.document.createElement('button');
  const questTrigger = dom.window.document.createElement('button');
  host.append(trigger, questTrigger);

  const menu = createSettingsMenu(host, trigger, f.run, f.subscribe, {
    saved: () => {},
    upcoming: () => false,
    hasUpcoming: () => false,
    darkAvailable: () => true,
    questLinks: () => [{ label: 'Account', href: '/student/profiles/edit', target: null }],
  }, questTrigger);

  try {
    const menuHost = host.querySelector<HTMLSpanElement>(':scope > span')!;
    const shadow = menuHost.shadowRoot!;

    // 1. Verify there are NO modal tabs linking the menus together
    assert.equal(shadow.querySelector('.menu-tabs'), null, 'Should not contain tab container');
    assert.equal(shadow.querySelectorAll('.tab-btn').length, 0, 'Should not contain tab buttons');

    // 2. Verify both separate dropdown panels exist
    const bqMenu = shadow.querySelector<HTMLElement>('.bq-menu')!;
    const questMenu = shadow.querySelector<HTMLElement>('.quest-menu')!;
    assert.ok(bqMenu, 'BetterQuest dropdown exists');
    assert.ok(questMenu, 'Quest Settings dropdown exists');
    assert.notEqual(bqMenu, questMenu, 'They are distinct elements');

    // 3. Opening BetterQuest displays only bqMenu
    menu.open('betterquest');
    assert.equal(menuHost.hidden, false);
    assert.equal(bqMenu.hidden, false);
    assert.equal(questMenu.hidden, true);

    // 4. Opening Quest Settings displays only questMenu
    menu.open('quest');
    assert.equal(menuHost.hidden, false);
    assert.equal(bqMenu.hidden, true);
    assert.equal(questMenu.hidden, false);

    // 5. Closing hides both
    menu.close();
    assert.equal(menuHost.hidden, true);
    assert.equal(bqMenu.hidden, true);
    assert.equal(questMenu.hidden, true);
  } finally {
    menu.dispose();
    dom.window.close();
  }
});

