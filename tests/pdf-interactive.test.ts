import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const textRun = (text: string, top: number, left = 55) => ({ text, page: 1, left, top, width: 12, height: 12 });

test('interactive PDF viewer turns mapped answer rows into wide explicit-choice controls', async () => {
  const module = await import('../src/features/assessment/pdf-viewer').catch(() => null);
  assert.ok(module, 'interactive PDF viewer module must exist');
  const dom = new JSDOM('<body><div id="mount"></div></body>', { url: 'https://quest.cns.utexas.edu/student/instances/show' });
  const selected: Array<[number, number]> = [];
  let destroyed = false;
  const viewer = module.createInteractivePdfViewer(dom.window.document.querySelector<HTMLElement>('#mount')!, {
    url: '/student/images/download_pdf?instance=courseuserassignment_1',
    optionMaximums: new Map([[1, 3]]),
    onChoose: (questionNumber, optionValue) => selected.push([questionNumber, optionValue]),
    openDocument: async () => ({
      pageCount: 1,
      renderPage: async () => ({
        width: 600, height: 800,
        runs: [textRun('001', 50), textRun('1.', 130), textRun('2.', 190), textRun('3.', 250), textRun('12.', 280), textRun('002', 340)],
      }),
      destroy: () => { destroyed = true; },
    }),
  });
  try {
    assert.equal(await viewer.ready, true);
    const buttons = [...viewer.element.shadowRoot!.querySelectorAll<HTMLButtonElement>('.option-hit')];
    assert.equal(buttons.length, 3);
    assert.equal(buttons[1].getAttribute('aria-label'), 'Select option 2 for question 1');
    assert.ok(Number.parseFloat(buttons[1].style.width) >= 15, 'the equation row, not only its number, should be clickable');
    buttons[1].click();
    assert.deepEqual(selected, [[1, 2]]);
    viewer.setSelected(1, '2');
    assert.equal(buttons[1].getAttribute('aria-pressed'), 'true');
    const submitBtn = viewer.element.shadowRoot!.querySelector<HTMLButtonElement>('.pdf-submit-btn');
    assert.ok(submitBtn, 'Floating submit button must appear on PDF when equation is selected');
    assert.equal(submitBtn.getAttribute('aria-label'), 'Submit question 1');
    assert.match(submitBtn.style.left || submitBtn.style.right, /calc\(|8px/, 'Submit button must be positioned to the right of the equation');

    // Clicking outside dismisses active selection and confirm button
    dom.window.document.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    assert.equal(viewer.element.shadowRoot!.querySelector('.pdf-submit-btn'), null, 'Clicking outside must remove confirm button');
    assert.equal(buttons[1].getAttribute('aria-pressed'), 'true', 'Dismissing Confirm must preserve the selected answer');

    // Only one question can be chosen at a time
    viewer.setSelected(1, '2');
    assert.equal(buttons[1].getAttribute('aria-pressed'), 'true');
    viewer.setSelected(2, '1');
    assert.equal(buttons[1].getAttribute('aria-pressed'), 'false', 'Choosing another question must deselect previous question');
  } finally {
    viewer.dispose();
    assert.equal(destroyed, true);
    assert.equal(dom.window.document.querySelector('#mount')?.childElementCount, 0);
    dom.window.close();
  }
});

test('interactive PDF viewer fits a wide page to the available viewing area', async () => {
  const module = await import('../src/features/assessment/pdf-viewer');
  const dom = new JSDOM('<body><div id="mount"></div></body>', { url: 'https://quest.cns.utexas.edu/student/instances/show' });
  let openDocument!: (document: {
    pageCount: number;
    renderPage: () => Promise<{ width: number; height: number; runs: ReturnType<typeof textRun>[] }>;
    destroy: () => void;
  }) => void;
  const pendingDocument = new Promise<Parameters<typeof openDocument>[0]>(resolve => { openDocument = resolve; });
  const viewer = module.createInteractivePdfViewer(dom.window.document.querySelector<HTMLElement>('#mount')!, {
    url: '/student/images/download_pdf?instance=courseuserassignment_1',
    optionMaximums: new Map([[1, 2]]),
    onChoose: () => {},
    openDocument: async () => pendingDocument,
  });
  try {
    const pages = viewer.element.shadowRoot!.querySelector<HTMLElement>('.pages')!;
    Object.defineProperty(pages, 'clientWidth', { configurable: true, value: 320 });
    openDocument({
      pageCount: 1,
      renderPage: async () => ({
        width: 600,
        height: 800,
        runs: [textRun('001', 50), textRun('1.', 100), textRun('2.', 160)],
      }),
      destroy: () => {},
    });
    assert.equal(await viewer.ready, true);
    const page = viewer.element.shadowRoot!.querySelector<HTMLElement>('.page')!;
    assert.ok(Math.abs(Number.parseFloat(page.style.getPropertyValue('--bq-pdf-page-width')) - 320) < 0.01, 'the fitted page should use the full viewer width');
    const zoomLabel = viewer.element.shadowRoot!.querySelector('output')!;
    assert.match(zoomLabel.textContent || '', /100%/, 'PDF zoom must default to 100%');
    viewer.element.shadowRoot!.querySelector<HTMLButtonElement>('[aria-label="Zoom in"]')!.click();
    assert.equal(pages.classList.contains('is-zoomed'), true);
    viewer.element.shadowRoot!.querySelector<HTMLButtonElement>('[aria-label="Zoom out"]')!.click();
    assert.equal(pages.classList.contains('is-zoomed'), false);
  } finally {
    viewer.dispose();
    dom.window.close();
  }
});

test('interactive PDF viewer refits when its container changes width', async () => {
  const module = await import('../src/features/assessment/pdf-viewer');
  const dom = new JSDOM('<body><div id="mount"></div></body>', { url: 'https://quest.cns.utexas.edu/student/instances/show' });
  let resizeCallback!: ResizeObserverCallback;
  let observed: Element | undefined;
  class FakeResizeObserver {
    constructor(callback: ResizeObserverCallback) { resizeCallback = callback; }
    observe(target: Element) { observed = target; }
    disconnect() {}
    unobserve() {}
  }
  Object.defineProperty(dom.window, 'ResizeObserver', { configurable: true, value: FakeResizeObserver });
  let availableWidth = 320;
  const viewer = module.createInteractivePdfViewer(dom.window.document.querySelector<HTMLElement>('#mount')!, {
    url: '/student/images/download_pdf?instance=courseuserassignment_1',
    optionMaximums: new Map([[1, 2]]),
    onChoose: () => {},
    openDocument: async () => ({
      pageCount: 1,
      renderPage: async () => ({
        width: 600,
        height: 800,
        runs: [textRun('001', 50), textRun('1.', 100), textRun('2.', 160)],
      }),
      destroy: () => {},
    }),
  });
  try {
    const pages = viewer.element.shadowRoot!.querySelector<HTMLElement>('.pages')!;
    Object.defineProperty(pages, 'clientWidth', { configurable: true, get: () => availableWidth });
    assert.equal(await viewer.ready, true);
    assert.equal(observed, pages);
    availableWidth = 500;
    resizeCallback([], {} as ResizeObserver);
    const page = viewer.element.shadowRoot!.querySelector<HTMLElement>('.page')!;
    assert.ok(Math.abs(Number.parseFloat(page.style.getPropertyValue('--bq-pdf-page-width')) - 500) < 0.01);
  } finally {
    viewer.dispose();
    dom.window.close();
  }
});

test('interactive PDF viewer uses inherited theme colors for its chrome', async () => {
  const module = await import('../src/features/assessment/pdf-viewer');
  const dom = new JSDOM('<body><div id="mount"></div></body>', { url: 'https://quest.cns.utexas.edu/student/instances/show' });
  const viewer = module.createInteractivePdfViewer(dom.window.document.querySelector<HTMLElement>('#mount')!, {
    url: '/student/images/download_pdf?instance=courseuserassignment_1',
    optionMaximums: new Map([[1, 2]]),
    onChoose: () => {},
    openDocument: async () => ({
      pageCount: 1,
      renderPage: async () => ({
        width: 600, height: 800,
        runs: [textRun('001', 50), textRun('1.', 100), textRun('2.', 160)],
      }),
      destroy: () => {},
    }),
  });
  try {
    assert.equal(await viewer.ready, true);
    const css = viewer.element.shadowRoot!.querySelector('style')!.textContent!;
    assert.match(css, /background:var\(--bq-surface/);
    assert.match(css, /color:var\(--bq-text/);
    assert.match(css, /background:var\(--bq-raised/);
  } finally {
    viewer.dispose();
    dom.window.close();
  }
});

test('interactive PDF floating submit button invokes onSubmit with the chosen question number', async () => {
  const module = await import('../src/features/assessment/pdf-viewer').catch(() => null);
  assert.ok(module);
  const dom = new JSDOM('<body><div id="mount"></div></body>', { url: 'https://quest.cns.utexas.edu/student/instances/show' });
  const submittedQuestions: number[] = [];
  const viewer = module.createInteractivePdfViewer(dom.window.document.querySelector<HTMLElement>('#mount')!, {
    url: '/student/images/download_pdf?instance=courseuserassignment_1',
    optionMaximums: new Map([[1, 2]]),
    onChoose: () => {},
    onSubmit: (qNum) => { submittedQuestions.push(qNum); return true; },
    openDocument: async () => ({
      pageCount: 1,
      renderPage: async () => ({
        width: 600, height: 800,
        runs: [textRun('001', 50), textRun('1.', 100), textRun('2.', 160)],
      }),
      destroy: () => {},
    }),
  });
  try {
    assert.equal(await viewer.ready, true);
    viewer.setSelected(1, '1');
    const submitBtn = viewer.element.shadowRoot!.querySelector<HTMLButtonElement>('.pdf-submit-btn');
    assert.ok(submitBtn);
    submitBtn.click();
    assert.deepEqual(submittedQuestions, [1]);
    assert.equal(submitBtn.disabled, true, 'Successful submit keeps the control busy');
    assert.match(submitBtn.textContent || '', /Submitting/);
  } finally {
    viewer.dispose();
    dom.window.close();
  }
});

test('interactive PDF failed submit restores the confirm control for retry', async () => {
  const module = await import('../src/features/assessment/pdf-viewer');
  const dom = new JSDOM('<body><div id="mount"></div></body>', { url: 'https://quest.cns.utexas.edu/student/instances/show' });
  const viewer = module.createInteractivePdfViewer(dom.window.document.querySelector<HTMLElement>('#mount')!, {
    url: '/student/images/download_pdf?instance=courseuserassignment_1',
    optionMaximums: new Map([[1, 2]]),
    onChoose: () => {},
    onSubmit: () => false,
    openDocument: async () => ({
      pageCount: 1,
      renderPage: async () => ({
        width: 600, height: 800,
        runs: [textRun('001', 50), textRun('1.', 100), textRun('2.', 160)],
      }),
      destroy: () => {},
    }),
  });
  try {
    assert.equal(await viewer.ready, true);
    viewer.setSelected(1, '1');
    const submitBtn = viewer.element.shadowRoot!.querySelector<HTMLButtonElement>('.pdf-submit-btn')!;
    assert.ok(submitBtn);
    submitBtn.click();
    assert.equal(submitBtn.disabled, false, 'Failed submit must hand control back');
    assert.equal(submitBtn.dataset.failed, 'true');
    assert.match(submitBtn.getAttribute('aria-label') || '', /did not reach Quest/);
    assert.ok(viewer.element.shadowRoot!.querySelector('.pdf-submit-btn'), 'Confirm must remain for retry');
  } finally {
    viewer.dispose();
    dom.window.close();
  }
});

test('interactive PDF toolbar pill submits the selected question', async () => {
  const module = await import('../src/features/assessment/pdf-viewer');
  const dom = new JSDOM('<body><div id="mount"></div></body>', { url: 'https://quest.cns.utexas.edu/student/instances/show' });
  const submitted: number[] = [];
  const viewer = module.createInteractivePdfViewer(dom.window.document.querySelector<HTMLElement>('#mount')!, {
    url: '/student/images/download_pdf?instance=courseuserassignment_1',
    optionMaximums: new Map([[1, 2]]),
    onChoose: () => {},
    onSubmit: (qNum) => { submitted.push(qNum); return true; },
    openDocument: async () => ({
      pageCount: 1,
      renderPage: async () => ({
        width: 600, height: 800,
        runs: [textRun('001', 50), textRun('1.', 100), textRun('2.', 160)],
      }),
      destroy: () => {},
    }),
  });
  try {
    assert.equal(await viewer.ready, true);
    const pill = viewer.element.shadowRoot!.querySelector<HTMLButtonElement>('.submit-pill')!;
    assert.equal(pill.hidden, true, 'No pill before a selection');
    viewer.setSelected(1, '2');
    assert.equal(pill.hidden, false, 'Pill appears with the selection in every view mode');
    assert.match(pill.textContent || '', /Q1/);
    pill.click();
    assert.deepEqual(submitted, [1], 'Toolbar pill submits the selected question');
    assert.equal(pill.disabled, true);
  } finally {
    viewer.dispose();
    dom.window.close();
  }
});

test('interactive PDF marks wrong answers and celebrates correct ones', async () => {
  const module = await import('../src/features/assessment/pdf-viewer');
  const dom = new JSDOM('<body><div id="mount"></div></body>', { url: 'https://quest.cns.utexas.edu/student/instances/show' });
  const viewer = module.createInteractivePdfViewer(dom.window.document.querySelector<HTMLElement>('#mount')!, {
    url: '/student/images/download_pdf?instance=courseuserassignment_1',
    optionMaximums: new Map([[1, 3]]),
    onChoose: () => {},
    openDocument: async () => ({
      pageCount: 1,
      renderPage: async () => ({
        width: 600, height: 800,
        runs: [textRun('001', 50), textRun('1.', 100), textRun('2.', 160), textRun('3.', 220)],
      }),
      destroy: () => {},
    }),
  });
  try {
    assert.equal(await viewer.ready, true);
    viewer.markWrong(1, '2');
    const wrongBox = viewer.element.shadowRoot!.querySelector<HTMLElement>('.option-hit[data-option="2"]')!;
    assert.ok(wrongBox.classList.contains('is-wrong'), 'Wrong answer gets struck through with an X');

    viewer.celebrate(1, '1', true);
    const boxes = viewer.element.shadowRoot!.querySelectorAll<HTMLElement>('.option-hit[data-question="1"]');
    const visible = viewer.element.shadowRoot!.querySelectorAll<HTMLElement>('.option-hit[data-question="1"]:not([hidden])');
    assert.equal(visible.length, 1, 'Other options disappear once answered correctly');
    assert.ok(boxes[0].classList.contains('is-correct'), 'Correct answer is highlighted green');
    assert.ok(!boxes[0].classList.contains('is-wrong'));
    const party = dom.window.document.body.querySelector<HTMLElement>('.bq-celebration');
    assert.ok(party, 'Correct answer lights up the whole screen');
    assert.equal(party!.style.position, 'fixed', 'The backdrop covers the viewport with inline styles');
    assert.match(party!.textContent || '', /✓/, 'A full wall of checkmarks covers the screen');
    assert.ok(party!.querySelectorAll('.bq-verdict-tile').length >= 24, 'The wall is made of individual popping tiles');
    const badge = party!.querySelector<HTMLElement>('.bq-badge');
    assert.ok(badge, 'A mascot badge sits in the center');
    assert.match(badge!.querySelector('.bq-badge-face')!.textContent || '', /😄/, 'The smiley shows right away');
    assert.equal(badge!.querySelector('img'), null, 'No image yet — it waits for the animation');
    assert.match(viewer.element.shadowRoot!.querySelector('.meta')!.textContent!, /1 answer choice/, 'Kept correct answer stays counted');
  } finally {
    viewer.dispose();
    dom.window.close();
  }
});

test('a fresh verdict reveals a suppressed answer box and still celebrates', async () => {
  const module = await import('../src/features/assessment/pdf-viewer');
  const dom = new JSDOM('<body><div id="mount"></div></body>', { url: 'https://quest.cns.utexas.edu/student/instances/show?instance=courseuserassignment_1' });
  const viewer = module.createInteractivePdfViewer(dom.window.document.querySelector<HTMLElement>('#mount')!, {
    url: '/student/images/download_pdf?instance=courseuserassignment_1',
    optionMaximums: new Map([[1, 2]]),
    onChoose: () => {},
    openDocument: async () => ({
      pageCount: 1,
      renderPage: async () => ({
        width: 600, height: 800,
        runs: [textRun('001', 50), textRun('1.', 100), textRun('2.', 160)],
      }),
      destroy: () => {},
    }),
  });
  try {
    assert.equal(await viewer.ready, true);
    // Quest's reflection suppresses the answered question before the verdict lands.
    viewer.setAnsweredQuestions(new Set([1]));
    const boxes = [...viewer.element.shadowRoot!.querySelectorAll<HTMLElement>('.option-hit[data-question="1"]')];
    assert.ok(boxes.length > 0, 'Answered question has boxes');
    assert.ok(boxes.every(box => box.hidden), 'Answered questions start suppressed');
    const target = viewer.element.shadowRoot!.querySelector<HTMLElement>('.option-hit[data-option="2"]')!;

    // Plain load of an old correct answer: stays hidden, no celebration replay.
    viewer.celebrate(1, '2', false);
    assert.ok(target.hidden, 'Historical answers stay suppressed');
    assert.equal(dom.window.document.body.querySelector('.bq-celebration'), null, 'No celebration replay on load');

    // Fresh verdict: the box comes back and the screen lights up green.
    viewer.celebrate(1, '2', true);
    assert.ok(!target.hidden, 'The celebrated box comes back for the verdict');
    assert.ok(target.classList.contains('is-correct'), 'And is highlighted green');
    assert.ok(dom.window.document.body.querySelector('.bq-celebration'), 'The green celebration shows even after the suppression');
    const css = [...viewer.element.shadowRoot!.querySelectorAll('style')].map(s => s.textContent).join('\n');
    assert.match(css, /\.option-hit\.is-correct::after\{[^}]*left:calc\(100% \+ 6px\)/, 'Checkmark sits to the right of the box, clear of the text');
  } finally {
    viewer.dispose();
    dom.window.close();
  }
});

test('the green celebration still shows when the system asks for reduced motion', async () => {
  const module = await import('../src/features/assessment/pdf-viewer');
  const dom = new JSDOM('<body><div id="mount"></div></body>', { url: 'https://quest.cns.utexas.edu/student/instances/show?instance=courseuserassignment_1' });
  Object.defineProperty(dom.window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({
      matches: /prefers-reduced-motion/.test(query),
      media: query,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false,
    }),
  });
  const viewer = module.createInteractivePdfViewer(dom.window.document.querySelector<HTMLElement>('#mount')!, {
    url: '/student/images/download_pdf?instance=courseuserassignment_1',
    optionMaximums: new Map([[1, 2]]),
    onChoose: () => {},
    openDocument: async () => ({
      pageCount: 1,
      renderPage: async () => ({
        width: 600, height: 800,
        runs: [textRun('001', 50), textRun('1.', 100), textRun('2.', 160)],
      }),
      destroy: () => {},
    }),
  });
  try {
    assert.equal(await viewer.ready, true);
    viewer.celebrate(1, '2', true);
    const layer = dom.window.document.body.querySelector<HTMLElement>('.bq-celebration');
    assert.ok(layer, 'The verdict never gets skipped for reduced motion');
    assert.equal(layer!.style.position, 'fixed', 'Covering the screen needs no motion to be seen');
    assert.match(layer!.textContent || '', /✓/, 'The checkmark rides along');
  } finally {
    viewer.dispose();
    dom.window.close();
  }
});

test('the mascot image waits for the entry animation and then replaces the emoji', async () => {
  const module = await import('../src/features/assessment/pdf-viewer');
  const dom = new JSDOM('<body><div id="mount"></div></body>', { url: 'https://quest.cns.utexas.edu/student/instances/show?instance=courseuserassignment_1' });
  (globalThis as { chrome?: { runtime?: { getURL?: (path: string) => string } } }).chrome = {
    runtime: { getURL: (path: string) => `chrome-extension://test/${path}` },
  };
  const viewer = module.createInteractivePdfViewer(dom.window.document.querySelector<HTMLElement>('#mount')!, {
    url: '/student/images/download_pdf?instance=courseuserassignment_1',
    optionMaximums: new Map([[1, 2]]),
    onChoose: () => {},
    openDocument: async () => ({
      pageCount: 1,
      renderPage: async () => ({
        width: 600, height: 800,
        runs: [textRun('001', 50), textRun('1.', 100), textRun('2.', 160)],
      }),
      destroy: () => {},
    }),
  });
  try {
    assert.equal(await viewer.ready, true);
    viewer.celebrate(1, '2', true);
    const badge = dom.window.document.body.querySelector<HTMLElement>('.bq-badge')!;
    assert.match(badge.querySelector('.bq-badge-face')!.textContent || '', /😄/, 'The emoji mascot is instant');
    assert.equal(badge.querySelector('img'), null, 'The packaged image waits until the entry animation is done');
    await new Promise(resolve => setTimeout(resolve, 900));
    const img = badge.querySelector('img');
    assert.ok(img, 'The mascot image loads after the animation');
    assert.equal(img!.getAttribute('src'), 'chrome-extension://test/assets/verdict-happy.png', 'It points at the packaged asset');
    assert.ok(badge.querySelector('.bq-badge-face'), 'The emoji stays until the image itself finishes loading');
  } finally {
    delete (globalThis as { chrome?: unknown }).chrome;
    viewer.dispose();
    dom.window.close();
  }
});

test('celebrations can be turned off in settings', async () => {
  const module = await import('../src/features/assessment/pdf-viewer');
  const dom = new JSDOM('<body><div id="mount"></div></body>', { url: 'https://quest.cns.utexas.edu/student/instances/show?instance=courseuserassignment_1' });
  const viewer = module.createInteractivePdfViewer(dom.window.document.querySelector<HTMLElement>('#mount')!, {
    url: '/student/images/download_pdf?instance=courseuserassignment_1',
    optionMaximums: new Map([[1, 2]]),
    onChoose: () => {},
    openDocument: async () => ({
      pageCount: 1,
      renderPage: async () => ({
        width: 600, height: 800,
        runs: [textRun('001', 50), textRun('1.', 100), textRun('2.', 160)],
      }),
      destroy: () => {},
    }),
  });
  try {
    assert.equal(await viewer.ready, true);
    dom.window.document.documentElement.dataset.betterquestAnimations = 'disabled';
    viewer.celebrate(1, '2', true);
    assert.equal(dom.window.document.body.querySelector('.bq-celebration'), null, 'No wall when animations and whimsy are both off');
    dom.window.document.dispatchEvent(new dom.window.CustomEvent('betterquest:party', { detail: 'wrong' }));
    assert.equal(dom.window.document.body.querySelector('.bq-screen-flash'), null, 'No sad face wall either');
    dom.window.document.documentElement.dataset.betterquestWhimsy = 'enabled';
    dom.window.document.dispatchEvent(new dom.window.Event('betterquest:party'));
    assert.ok(dom.window.document.body.querySelector('.bq-celebration'), 'The wall comes back as soon as whimsy is on');
  } finally {
    viewer.dispose();
    dom.window.close();
  }
});

test('the verdict wall really animates where the Web Animations API exists', async () => {
  const module = await import('../src/features/assessment/pdf-viewer');
  const dom = new JSDOM('<body><div id="mount"></div></body>', { url: 'https://quest.cns.utexas.edu/student/instances/show?instance=courseuserassignment_1' });
  const calls: { keyframes: unknown; options: { delay?: number } }[] = [];
  (dom.window.HTMLElement.prototype as unknown as { animate: (keyframes: unknown, options?: unknown) => unknown }).animate =
    function (keyframes: unknown, options?: unknown) {
      calls.push({ keyframes, options: options as { delay?: number } });
      return { cancel() {}, finish() {}, onfinish: null };
    };
  const viewer = module.createInteractivePdfViewer(dom.window.document.querySelector<HTMLElement>('#mount')!, {
    url: '/student/images/download_pdf?instance=courseuserassignment_1',
    optionMaximums: new Map([[1, 2]]),
    onChoose: () => {},
    openDocument: async () => ({
      pageCount: 1,
      renderPage: async () => ({
        width: 600, height: 800,
        runs: [textRun('001', 50), textRun('1.', 100), textRun('2.', 160)],
      }),
      destroy: () => {},
    }),
  });
  try {
    assert.equal(await viewer.ready, true);
    viewer.celebrate(1, '2', true);
    assert.ok(calls.length >= 24, 'The backdrop, every wall tile, and the badge animate');
    assert.ok(calls.some(call => (call.options?.delay ?? 0) > 0), 'Tiles ripple out from the center with staggered delays');
    assert.ok(calls.some(call => Array.isArray(call.keyframes) && call.keyframes.length === 3), 'The pop-in overshoots before it settles');
  } finally {
    viewer.dispose();
    dom.window.close();
  }
});

test('the console party trigger shows the green celebration and the red flash on demand', async () => {
  const module = await import('../src/features/assessment/pdf-viewer');
  const dom = new JSDOM('<body><div id="mount"></div></body>', { url: 'https://quest.cns.utexas.edu/student/instances/show?instance=courseuserassignment_1' });
  const viewer = module.createInteractivePdfViewer(dom.window.document.querySelector<HTMLElement>('#mount')!, {
    url: '/student/images/download_pdf?instance=courseuserassignment_1',
    optionMaximums: new Map([[1, 2]]),
    onChoose: () => {},
    openDocument: async () => ({
      pageCount: 1,
      renderPage: async () => ({
        width: 600, height: 800,
        runs: [textRun('001', 50), textRun('1.', 100), textRun('2.', 160)],
      }),
      destroy: () => {},
    }),
  });
  try {
    assert.equal(await viewer.ready, true);
    dom.window.document.dispatchEvent(new dom.window.Event('betterquest:party'));
    assert.ok(dom.window.document.body.querySelector('.bq-celebration'), 'Console event shows the green celebration');
    dom.window.document.dispatchEvent(new dom.window.CustomEvent('betterquest:party', { detail: 'wrong' }));
    assert.ok(dom.window.document.body.querySelector('.bq-screen-flash'), 'Console event flashes red for a wrong verdict');
    viewer.dispose();
    const layers = dom.window.document.body.querySelectorAll('.bq-celebration').length;
    const flashes = dom.window.document.body.querySelectorAll('.bq-screen-flash').length;
    dom.window.document.dispatchEvent(new dom.window.Event('betterquest:party'));
    assert.equal(dom.window.document.body.querySelectorAll('.bq-celebration').length, layers, 'A disposed viewer stops listening');
    assert.equal(dom.window.document.body.querySelectorAll('.bq-screen-flash').length, flashes, 'A disposed viewer stops flashing');
  } finally {
    viewer.dispose();
    dom.window.close();
  }
});

test('whimsy mode replaces the default emoji mascot with a randomized picture from the pool', async () => {
  const module = await import('../src/features/assessment/pdf-viewer');
  const dom = new JSDOM('<body><div id="mount"></div></body>', { url: 'https://quest.cns.utexas.edu/student/instances/show?instance=courseuserassignment_1' });
  (globalThis as { chrome?: { runtime?: { getURL?: (path: string) => string } } }).chrome = {
    runtime: { getURL: (path: string) => `chrome-extension://test/${path}` },
  };
  const viewer = module.createInteractivePdfViewer(dom.window.document.querySelector<HTMLElement>('#mount')!, {
    url: '/student/images/download_pdf?instance=courseuserassignment_1',
    optionMaximums: new Map([[1, 2]]),
    onChoose: () => {},
    openDocument: async () => ({
      pageCount: 1,
      renderPage: async () => ({
        width: 600, height: 800,
        runs: [textRun('001', 50), textRun('1.', 100), textRun('2.', 160)],
      }),
      destroy: () => {},
    }),
  });
  try {
    assert.equal(await viewer.ready, true);

    // Test correct answer (whimsy enabled)
    dom.window.document.documentElement.dataset.betterquestWhimsy = 'enabled';
    viewer.celebrate(1, '1', true);
    const party = dom.window.document.body.querySelector<HTMLElement>('.bq-celebration');
    assert.ok(party, 'Correct answer triggers celebration');
    const badge = party!.querySelector<HTMLElement>('.bq-badge');
    assert.ok(badge, 'Badge exists');
    const correctImg = badge!.querySelector<HTMLImageElement>('img.bq-whimsy-img');
    assert.ok(correctImg, 'Whimsy image is rendered directly instead of default emoji');
    assert.match(correctImg!.getAttribute('src') || '', /^chrome-extension:\/\/test\/correct\d*\.png$/, 'Src matches one of the correct images in the pool');
    assert.equal(badge!.querySelector('.bq-badge-face'), null, 'Smiley face emoji is replaced');

    // Test wrong answer
    dom.window.document.dispatchEvent(new dom.window.CustomEvent('betterquest:party', { detail: 'wrong' }));
    const flash = dom.window.document.body.querySelector<HTMLElement>('.bq-screen-flash');
    assert.ok(flash, 'Wrong answer triggers flash wall');
    const wrongBadge = flash!.querySelector<HTMLElement>('.bq-badge');
    assert.ok(wrongBadge, 'Wrong badge exists');
    const wrongImg = wrongBadge!.querySelector<HTMLImageElement>('img.bq-whimsy-img');
    assert.ok(wrongImg, 'Whimsy image is rendered directly for wrong answer');
    assert.match(wrongImg!.getAttribute('src') || '', /^chrome-extension:\/\/test\/wrong\d+\.png$/, 'Src matches one of the wrong images in the pool');
    assert.equal(wrongBadge!.querySelector('.bq-badge-face'), null, 'Sad face emoji is replaced');

    // Test turning whimsy off
    dom.window.document.body.querySelectorAll('.bq-celebration, .bq-screen-flash').forEach(el => el.remove());
    delete dom.window.document.documentElement.dataset.betterquestWhimsy;
    dom.window.document.dispatchEvent(new dom.window.Event('betterquest:party'));
    const offParty = dom.window.document.body.querySelector<HTMLElement>('.bq-celebration');
    assert.ok(offParty, 'Party shows with whimsy disabled');
    const offBadge = offParty!.querySelector<HTMLElement>('.bq-badge');
    assert.ok(offBadge!.querySelector('.bq-badge-face'), 'Smiley face shows when whimsy is disabled');
    assert.equal(offBadge!.querySelector('img'), null, 'No whimsy image when whimsy is disabled');
  } finally {
    delete (globalThis as { chrome?: unknown }).chrome;
    viewer.dispose();
    dom.window.close();
  }
});

test('when animations are disabled and whimsy is enabled, whimsy overtakes and animates with images', async () => {
  const module = await import('../src/features/assessment/pdf-viewer');
  const dom = new JSDOM('<body><div id="mount"></div></body>', { url: 'https://quest.cns.utexas.edu/student/instances/show?instance=courseuserassignment_1' });
  (globalThis as { chrome?: { runtime?: { getURL?: (path: string) => string } } }).chrome = {
    runtime: { getURL: (path: string) => `chrome-extension://test/${path}` },
  };
  const calls: { keyframes: unknown; options: { duration?: number; delay?: number } }[] = [];
  (dom.window.HTMLElement.prototype as unknown as { animate: (keyframes: unknown, options?: unknown) => unknown }).animate =
    function (keyframes: unknown, options?: unknown) {
      calls.push({ keyframes, options: options as { duration?: number; delay?: number } });
      return { cancel() {}, finish() {}, onfinish: null };
    };
  const viewer = module.createInteractivePdfViewer(dom.window.document.querySelector<HTMLElement>('#mount')!, {
    url: '/student/images/download_pdf?instance=courseuserassignment_1',
    optionMaximums: new Map([[1, 2]]),
    onChoose: () => {},
    openDocument: async () => ({
      pageCount: 1,
      renderPage: async () => ({
        width: 600, height: 800,
        runs: [textRun('001', 50), textRun('1.', 100), textRun('2.', 160)],
      }),
      destroy: () => {},
    }),
  });
  try {
    assert.equal(await viewer.ready, true);
    // Animations are disabled, but whimsy is enabled
    dom.window.document.documentElement.dataset.betterquestAnimations = 'disabled';
    dom.window.document.documentElement.dataset.betterquestWhimsy = 'enabled';
    viewer.markWrong(1, '2');
    const wrongBox = viewer.element.shadowRoot!.querySelector<HTMLElement>('.option-hit[data-option="2"]')!;
    assert.ok(wrongBox.classList.contains('is-wrong'), 'Inline strikethrough stays enabled even with animations off');

    dom.window.document.dispatchEvent(new dom.window.Event('betterquest:party'));
    // Whimsy overtakes: wall animates with the images (duration: 430)
    const springCalls = calls.filter(c => c.options?.duration === 430);
    assert.ok(springCalls.length > 0, 'Whimsy overtakes disabled animations and animates with images');
    const party = dom.window.document.body.querySelector<HTMLElement>('.bq-celebration');
    assert.ok(party, 'Celebration wall shows');
    assert.ok(party!.querySelector('img.bq-whimsy-img'), 'Whimsy image is present');

    // But when BOTH animations and whimsy are disabled, the wall is completely disabled
    dom.window.document.body.querySelectorAll('.bq-celebration, .bq-screen-flash').forEach(el => el.remove());
    delete dom.window.document.documentElement.dataset.betterquestWhimsy;
    dom.window.document.dispatchEvent(new dom.window.Event('betterquest:party'));
    assert.equal(dom.window.document.body.querySelector('.bq-celebration'), null, 'Wall is disabled when both animations and whimsy are off');
  } finally {
    delete (globalThis as { chrome?: unknown }).chrome;
    viewer.dispose();
    dom.window.close();
  }
});

test('interactive PDF verdict toast tells the user correct or wrong', async () => {
  const module = await import('../src/features/assessment/pdf-viewer');
  const dom = new JSDOM('<body><div id="mount"></div></body>', { url: 'https://quest.cns.utexas.edu/student/instances/show' });
  const viewer = module.createInteractivePdfViewer(dom.window.document.querySelector<HTMLElement>('#mount')!, {
    url: '/student/images/download_pdf?instance=courseuserassignment_1',
    optionMaximums: new Map([[1, 2]]),
    onChoose: () => {},
    openDocument: async () => ({
      pageCount: 1,
      renderPage: async () => ({
        width: 600, height: 800,
        runs: [textRun('001', 50), textRun('1.', 100), textRun('2.', 160)],
      }),
      destroy: () => {},
    }),
  });
  try {
    assert.equal(await viewer.ready, true);
    viewer.announce(1, 'wrong');
    const toast = viewer.element.shadowRoot!.querySelector<HTMLElement>('.verdict-toast')!;
    assert.ok(toast);
    assert.equal(toast.getAttribute('role'), 'status');
    assert.match(toast.textContent || '', /incorrect/);
    assert.ok(dom.window.document.querySelector('.bq-screen-flash'), 'Wrong answers flash the whole screen red');
    viewer.announce(1, 'correct');
    assert.equal(viewer.element.shadowRoot!.querySelectorAll('.verdict-toast').length, 1, 'Only one verdict shows at a time');
    assert.match(viewer.element.shadowRoot!.querySelector('.verdict-toast')!.textContent || '', /correct/);
  } finally {
    viewer.dispose();
    dom.window.close();
  }
});

test('interactive PDF image answers get full-territory boxes', async () => {
  const module = await import('../src/features/assessment/pdf-viewer');
  const dom = new JSDOM('<body><div id="mount"></div></body>', { url: 'https://quest.cns.utexas.edu/student/instances/show' });
  const viewer = module.createInteractivePdfViewer(dom.window.document.querySelector<HTMLElement>('#mount')!, {
    url: '/student/images/download_pdf?instance=courseuserassignment_1',
    optionMaximums: new Map([[1, 2]]),
    onChoose: () => {},
    openDocument: async () => ({
      pageCount: 1,
      // Labels only: no text runs between them, like image-based answers.
      renderPage: async () => ({
        width: 600, height: 800,
        runs: [textRun('001', 50), textRun('1.', 100), textRun('2.', 160)],
      }),
      destroy: () => {},
    }),
  });
  try {
    assert.equal(await viewer.ready, true);
    const first = viewer.element.shadowRoot!.querySelector<HTMLElement>('.option-hit[data-option="1"]')!;
    const heightPct = Number.parseFloat(first.style.height);
    const widthPct = Number.parseFloat(first.style.width);
    assert.ok(heightPct > 6, `Image answer box must fill the inter-label span, got ${heightPct}% height`);
    assert.ok(widthPct > 80, `Image answer box must span the column, got ${widthPct}% width`);
  } finally {
    viewer.dispose();
    dom.window.close();
  }
});

test('interactive PDF zoom persists across viewer sessions', async () => {
  const module = await import('../src/features/assessment/pdf-viewer');
  const dom = new JSDOM('<body><div id="mount"></div><div id="mount2"></div></body>', { url: 'https://quest.cns.utexas.edu/student/instances/show' });
  dom.window.localStorage.setItem('betterquest_pdf_zoom', '2.5');
  const openDocument = async () => ({
    pageCount: 1,
    renderPage: async () => ({
      width: 600, height: 800,
      runs: [textRun('001', 50), textRun('1.', 100), textRun('2.', 160)],
    }),
    destroy: () => {},
  });
  const viewer = module.createInteractivePdfViewer(dom.window.document.querySelector<HTMLElement>('#mount')!, {
    url: '/student/images/download_pdf?instance=courseuserassignment_1',
    optionMaximums: new Map([[1, 2]]),
    onChoose: () => {},
    openDocument,
  });
  try {
    assert.equal(await viewer.ready, true);
    assert.match(viewer.element.shadowRoot!.querySelector('output')!.textContent || '', /250%/, 'Restores the saved zoom');
    viewer.element.shadowRoot!.querySelector<HTMLButtonElement>('[aria-label="Zoom out"]')!.click();
    assert.equal(dom.window.localStorage.getItem('betterquest_pdf_zoom'), '2.4');
  } finally {
    viewer.dispose();
    dom.window.close();
  }
});

test('PDF points extraction reads per-question points possible', async () => {
  const { extractQuestionPoints } = await import('../src/adapters/quest/assessment');
  const runs = [
    textRun('008', 50),
    textRun('8. CalC3i08s 10 pts possible', 80),
    textRun('1.', 130),
    textRun('2.', 190),
    textRun('009', 260),
    textRun('9. Something 5 points possible', 290),
  ];
  assert.deepEqual([...extractQuestionPoints(runs)], [[8, 10], [9, 5]]);
});

test('interactive PDF options spanning page breaks are mapped to their respective pages and remain selectable', async () => {
  const module = await import('../src/features/assessment/pdf-viewer');
  const dom = new JSDOM('<body><div id="mount"></div></body>', { url: 'https://quest.cns.utexas.edu/student/instances/show' });
  const selected: Array<[number, number]> = [];
  const pRun = (text: string, top: number, page: number, left = 55) => ({ text, page, left, top, width: 12, height: 12 });
  const viewer = module.createInteractivePdfViewer(dom.window.document.querySelector<HTMLElement>('#mount')!, {
    url: '/student/images/download_pdf?instance=courseuserassignment_1',
    optionMaximums: new Map([[1, 3]]),
    onChoose: (q, opt) => selected.push([q, opt]),
    openDocument: async () => ({
      pageCount: 2,
      renderPage: async (pageNumber: number) => ({
        width: 600,
        height: 800,
        runs: pageNumber === 1
          ? [pRun('001', 50, 1), pRun('1.', 120, 1), pRun('2.', 200, 1)]
          : [pRun('3.', 80, 2), pRun('002', 150, 2)],
      }),
      destroy: () => {},
    }),
  });
  try {
    assert.equal(await viewer.ready, true);
    const page1 = viewer.element.shadowRoot!.querySelector<HTMLElement>('[aria-label="PDF page 1"]')!;
    const page2 = viewer.element.shadowRoot!.querySelector<HTMLElement>('[aria-label="PDF page 2"]')!;
    assert.ok(page1);
    assert.ok(page2);

    const page1Buttons = page1.querySelectorAll<HTMLButtonElement>('.option-hit');
    const page2Buttons = page2.querySelectorAll<HTMLButtonElement>('.option-hit');
    assert.equal(page1Buttons.length, 2, 'Options 1 and 2 must mount on page 1');
    assert.equal(page2Buttons.length, 1, 'Option 3 must mount on page 2 across the page break');

    // Selecting option 3 on page 2
    page2Buttons[0].click();
    assert.deepEqual(selected, [[1, 3]]);
    viewer.setSelected(1, '3');
    assert.equal(page2Buttons[0].getAttribute('aria-pressed'), 'true');
    const confirmBtn = page2.querySelector<HTMLButtonElement>('.pdf-submit-btn');
    assert.ok(confirmBtn, 'Confirm button should appear on page 2 next to option 3');

    // Switching selection to option 1 on page 1 removes confirm from page 2 and places on page 1
    page1Buttons[0].click();
    assert.deepEqual(selected, [[1, 3], [1, 1]]);
    viewer.setSelected(1, '1');
    assert.equal(page2.querySelector('.pdf-submit-btn'), null);
    assert.ok(page1.querySelector('.pdf-submit-btn'));
  } finally {
    viewer.dispose();
    dom.window.close();
  }
});

test('interactive PDF viewer suppresses boxes for answered questions and always shows boxes for all possible answers on unanswered questions', async () => {
  const module = await import('../src/features/assessment/pdf-viewer');
  const dom = new JSDOM('<body><div id="mount"></div></body>', { url: 'https://quest.cns.utexas.edu/student/instances/show' });
  const selected: Array<[number, number]> = [];
  const pRun = (text: string, top: number, page = 1, left = 55) => ({ text, page, left, top, width: 12, height: 12 });
  const viewer = module.createInteractivePdfViewer(dom.window.document.querySelector<HTMLElement>('#mount')!, {
    optionMaximums: new Map([[1, 3], [2, 4]]),
    answeredQuestions: new Set([1]),
    onChoose: (q, opt) => selected.push([q, opt]),
    openDocument: async () => ({
      pageCount: 1,
      renderPage: async () => ({
        width: 600,
        height: 800,
        runs: [
          pRun('001', 50), pRun('1.', 100), pRun('2.', 150), pRun('3.', 200),
          pRun('002', 280), pRun('1.', 320), pRun('2.', 370), pRun('3.', 420),
        ],
      }),
      destroy: () => {},
    }),
    url: '/student/images/download_pdf?instance=courseuserassignment_1',
  });
  try {
    assert.equal(await viewer.ready, true);
    const q1Buttons = viewer.element.shadowRoot!.querySelectorAll<HTMLButtonElement>('.option-hit[data-question="1"]');
    assert.equal(q1Buttons.length, 0, 'Answered question 1 must NOT show any clickable option boxes on PDF');

    const q2Buttons = viewer.element.shadowRoot!.querySelectorAll<HTMLButtonElement>('.option-hit[data-question="2"]');
    assert.equal(q2Buttons.length, 4, 'Unanswered question 2 must have boxes for ALL 4 possible answers');

    // Attempting to select an answered question does nothing
    viewer.setSelected(1, '2');
    assert.equal(viewer.element.shadowRoot!.querySelector('.pdf-submit-btn'), null);

    // Selecting unanswered question 2 option 4 works
    q2Buttons[3].click();
    assert.deepEqual(selected, [[2, 4]]);
    viewer.setSelected(2, '4');
    assert.equal(q2Buttons[3].getAttribute('aria-pressed'), 'true');
    assert.ok(viewer.element.shadowRoot!.querySelector('.pdf-submit-btn'));

    // Dynamically marking question 2 as answered hides its boxes without deleting them
    viewer.setAnsweredQuestions(new Set([1, 2]));
    const hiddenQ2 = [...viewer.element.shadowRoot!.querySelectorAll<HTMLButtonElement>('.option-hit[data-question="2"]')];
    assert.equal(hiddenQ2.length, 4);
    assert.ok(hiddenQ2.every(box => box.hidden), 'Answered boxes hide instead of deleting');
    assert.equal(viewer.element.shadowRoot!.querySelector('.pdf-submit-btn'), null);
    const meta = viewer.element.shadowRoot!.querySelector('.meta')!.textContent!;
    assert.match(meta, /All questions completed/);

    // A transient misread (half-rendered row) must self-heal instead of wiping boxes
    viewer.setAnsweredQuestions(new Set([1]));
    const restoredQ2 = [...viewer.element.shadowRoot!.querySelectorAll<HTMLButtonElement>('.option-hit[data-question="2"]')];
    assert.ok(restoredQ2.length === 4 && restoredQ2.every(box => !box.hidden), 'Boxes return when the question is answerable again');
  } finally {
    viewer.dispose();
    dom.window.close();
  }
});

test('interactive PDF viewer provides question anchors and scrollToQuestion scrolls the PDF even when all questions are complete', async () => {
  const module = await import('../src/features/assessment/pdf-viewer');
  const dom = new JSDOM('<body><div id="mount"></div></body>', { url: 'https://quest.cns.utexas.edu/student/instances/show' });
  const viewer = module.createInteractivePdfViewer(dom.window.document.querySelector<HTMLElement>('#mount')!, {
    url: '/student/images/download_pdf?instance=courseuserassignment_1',
    optionMaximums: new Map([[1, 4], [2, 4], [14, 5]]),
    answeredQuestions: new Set([1, 2, 14]),
    onChoose: () => {},
    openDocument: async () => ({
      pageCount: 2,
      renderPage: async (pageNumber: number) => ({
        width: 600, height: 800,
        runs: pageNumber === 1
          ? [textRun('001', 50), textRun('1.', 100), textRun('2.', 140), textRun('002', 200), textRun('1.', 250)]
          : [textRun('014', 80, 55), textRun('1.', 120), textRun('2.', 160)],
      }),
      destroy: () => {},
    }),
  });
  try {
    assert.equal(await viewer.ready, true);
    // Question anchors exist for every question even though all questions are answered
    const anchor1 = viewer.element.shadowRoot!.querySelector<HTMLElement>('.question-anchor[data-question="1"]');
    const anchor2 = viewer.element.shadowRoot!.querySelector<HTMLElement>('.question-anchor[data-question="2"]');
    const anchor14 = viewer.element.shadowRoot!.querySelector<HTMLElement>('.question-anchor[data-question="14"]');
    assert.ok(anchor1, 'Anchor for question 1 exists');
    assert.ok(anchor2, 'Anchor for question 2 exists');
    assert.ok(anchor14, 'Anchor for question 14 exists');

    // Calling scrollToQuestion scrolls the anchor into view
    let scrolled14 = false;
    anchor14!.scrollIntoView = () => { scrolled14 = true; };
    const result = viewer.scrollToQuestion(14);
    assert.equal(result, true);
    assert.equal(scrolled14, true, 'scrollToQuestion must scroll question 14 anchor into view');
  } finally {
    viewer.dispose();
    dom.window.close();
  }
});

test('interactive PDF viewer bounds left-column options on two-column pages so they do not bleed into the right column', async () => {
  const module = await import('../src/features/assessment/pdf-viewer');
  const dom = new JSDOM('<body><div id="mount"></div></body>', { url: 'https://quest.cns.utexas.edu/student/instances/show' });
  const pRun = (text: string, top: number, left: number, width = 12, height = 12) => ({ text, page: 2, left, top, width, height });
  const viewer = module.createInteractivePdfViewer(dom.window.document.querySelector<HTMLElement>('#mount')!, {
    url: '/student/images/download_pdf?instance=courseuserassignment_1',
    optionMaximums: new Map([[5, 6]]),
    onChoose: () => {},
    openDocument: async () => ({
      pageCount: 2,
      renderPage: async (pageNumber: number) => ({
        width: 600, height: 800,
        runs: pageNumber === 1
          ? [pRun('005 (part 1 of 4)', 50, 320), pRun('1.', 100, 320), pRun('2.', 140, 320), pRun('3.', 180, 320), pRun('4.', 220, 320)]
          : [
              // Page 2: Column 1 has options 5 and 6
              pRun('5. f\'(x) = -2x/(9+x^2)', 60, 45, 120),
              pRun('6. f\'(x) = -1/(9+x^2)^2', 100, 45, 120),
              pRun('006 (part 2 of 4)', 160, 45),
              // Page 2: Column 2 has other content spanning across the right side
              pRun('properties of the function f(x) = (9-x)^1/2 on its domain', 60, 320, 240),
            ],
      }),
      destroy: () => {},
    }),
  });
  try {
    assert.equal(await viewer.ready, true);
    const page2 = viewer.element.shadowRoot!.querySelector<HTMLElement>('[aria-label="PDF page 2"]')!;
    assert.ok(page2);
    const opt5 = page2.querySelector<HTMLButtonElement>('.option-hit[data-option="5"]');
    const opt6 = page2.querySelector<HTMLButtonElement>('.option-hit[data-option="6"]');
    assert.ok(opt5, 'Option 5 must exist on page 2');
    assert.ok(opt6, 'Option 6 must exist on page 2');

    const width5 = Number.parseFloat(opt5!.style.width);
    const width6 = Number.parseFloat(opt6!.style.width);
    assert.ok(width5 < 45, `Option 5 width must stay within the left column (<45%), got ${width5}%`);
    assert.ok(width6 < 45, `Option 6 width must stay within the left column (<45%), got ${width6}%`);
  } finally {
    viewer.dispose();
    dom.window.close();
  }
});

test('interactive PDF image answers give the final option full height matching preceding options', async () => {
  const module = await import('../src/features/assessment/pdf-viewer');
  const dom = new JSDOM('<body><div id="mount"></div></body>', { url: 'https://quest.cns.utexas.edu/student/instances/show' });
  const viewer = module.createInteractivePdfViewer(dom.window.document.querySelector<HTMLElement>('#mount')!, {
    url: '/student/images/download_pdf?instance=courseuserassignment_1',
    optionMaximums: new Map([[1, 3]]),
    onChoose: () => {},
    openDocument: async () => ({
      pageCount: 1,
      // 3 options spaced 100px apart: option 1 at 100, option 2 at 200, option 3 at 300
      renderPage: async () => ({
        width: 600, height: 800,
        runs: [textRun('001', 50), textRun('1.', 100), textRun('2.', 200), textRun('3.', 300)],
      }),
      destroy: () => {},
    }),
  });
  try {
    assert.equal(await viewer.ready, true);
    const opt1 = viewer.element.shadowRoot!.querySelector<HTMLElement>('.option-hit[data-option="1"]')!;
    const opt3 = viewer.element.shadowRoot!.querySelector<HTMLElement>('.option-hit[data-option="3"]')!;
    const h1 = Number.parseFloat(opt1.style.height);
    const h3 = Number.parseFloat(opt3.style.height);
    assert.ok(h1 > 10, `Option 1 must fill inter-label span, got ${h1}%`);
    assert.ok(h3 > 10, `Final option 3 must have full territory matching previous options, got ${h3}%`);
  } finally {
    viewer.dispose();
    dom.window.close();
  }
});

test('interactive PDF options are vertically line-by-line and do not swallow the next question header', async () => {
  const module = await import('../src/features/assessment/pdf-viewer');
  const dom = new JSDOM('<body><div id="mount"></div></body>', { url: 'https://quest.cns.utexas.edu/student/instances/show' });
  const viewer = module.createInteractivePdfViewer(dom.window.document.querySelector<HTMLElement>('#mount')!, {
    url: '/student/images/download_pdf?instance=courseuserassignment_1',
    optionMaximums: new Map([[1, 2]]),
    onChoose: () => {},
    openDocument: async () => ({
      pageCount: 1,
      renderPage: async () => ({
        width: 600, height: 800,
        runs: [
          textRun('001 10.0 points', 50, 45),
          textRun('What is the value of x?', 80, 45),
          textRun('1.', 120, 45),
          textRun('2.', 160, 45),
          textRun('002 10.0 points', 220, 45),
        ],
      }),
      destroy: () => {},
    }),
  });
  try {
    assert.equal(await viewer.ready, true);
    const opt1 = viewer.element.shadowRoot!.querySelector<HTMLElement>('.option-hit[data-option="1"]')!;
    const opt2 = viewer.element.shadowRoot!.querySelector<HTMLElement>('.option-hit[data-option="2"]')!;
    const top1 = Number.parseFloat(opt1.style.top);
    const height1 = Number.parseFloat(opt1.style.height);
    const top2 = Number.parseFloat(opt2.style.top);
    const height2 = Number.parseFloat(opt2.style.height);

    // Option 1 must not overlap Option 2
    assert.ok(top1 + height1 <= top2 + 0.5, `Option 1 must end before Option 2 starts (${top1 + height1}% <= ${top2}%)`);
    // Option 2 (last option of Q1) must NEVER extend into Question 2 (at y=220px, which is 27.5% of 800px)
    assert.ok(top2 + height2 <= 27.5, `Option 2 must end before Question 2 header (${top2 + height2}% <= 27.5%)`);
  } finally {
    viewer.dispose();
    dom.window.close();
  }
});


test('interactive PDF estimated fallback options start after the prompt and distribute down to the next question', async () => {
  const module = await import('../src/features/assessment/pdf-viewer');
  const dom = new JSDOM('<body><div id="mount"></div></body>', { url: 'https://quest.cns.utexas.edu/student/instances/show' });
  const viewer = module.createInteractivePdfViewer(dom.window.document.querySelector<HTMLElement>('#mount')!, {
    url: '/student/images/download_pdf?instance=courseuserassignment_1',
    optionMaximums: new Map([[1, 4]]),
    onChoose: () => {},
    openDocument: async () => ({
      pageCount: 1,
      // Prompt spans from 50 to 200, next question starts at 600. No text labels for options.
      renderPage: async () => ({
        width: 600, height: 800,
        runs: [
          textRun('001 10.0 points', 50),
          textRun('A complicated diagram with equations and formula text.', 120),
          textRun('The prompt text ends here around y=180.', 180),
          textRun('002 10.0 points', 600),
        ],
      }),
      destroy: () => {},
    }),
  });
  try {
    assert.equal(await viewer.ready, true);
    const hits = [...viewer.element.shadowRoot!.querySelectorAll<HTMLElement>('.option-hit[data-question="1"]')];
    assert.equal(hits.length, 4, 'Must generate 4 options for unanswered question');
    const top1 = Number.parseFloat(hits[0].style.top);
    const top4 = Number.parseFloat(hits[3].style.top);
    const height1 = Number.parseFloat(hits[0].style.height);
    // top1 must start AFTER the prompt (y=180px in 800px page is 22.5%)
    assert.ok(top1 >= 22, `Option 1 must start after the prompt text, got top=${top1}%`);
    // top4 must span down near the next question (y=600px is 75%), NOT bunched up at top1
    assert.ok(top4 - top1 > 25, `Options must span across the question territory, span was only ${top4 - top1}%`);
    assert.ok(height1 >= 8, `Option boxes must be tall enough for image/equation territory, got height=${height1}%`);
  } finally {
    viewer.dispose();
    dom.window.close();
  }
});

test('interactive PDF viewer strips adjacent formula text from option numbers so badges display clean digits', async () => {
  const module = await import('../src/features/assessment/pdf-viewer');
  const dom = new JSDOM('<body><div id="mount"></div></body>', { url: 'https://quest.cns.utexas.edu/student/instances/show' });
  const viewer = module.createInteractivePdfViewer(dom.window.document.querySelector<HTMLElement>('#mount')!, {
    url: '/student/images/download_pdf?instance=courseuserassignment_1',
    optionMaximums: new Map([[1, 3]]),
    onChoose: () => {},
    openDocument: async () => ({
      pageCount: 1,
      renderPage: async () => ({
        width: 600, height: 800,
        runs: [
          textRun('001', 50),
          textRun('1. r(t) = < 3 sin t, -3, -3 sin t >', 130),
          textRun('2. r(t) = < 3, 3 sin t, -3 cos t >', 190),
          textRun('3. plane and sphere do not intersect', 250),
          textRun('002', 340),
        ],
      }),
      destroy: () => {},
    }),
  });
  try {
    assert.equal(await viewer.ready, true);
    const buttons = [...viewer.element.shadowRoot!.querySelectorAll<HTMLButtonElement>('.option-hit')];
    assert.equal(buttons.length, 3);
    assert.equal(buttons[0].textContent, '1', 'Option 1 text must be strictly "1", not "1r" or formula text');
    assert.equal(buttons[1].textContent, '2', 'Option 2 text must be strictly "2", not "2r"');
    assert.equal(buttons[2].textContent, '3', 'Option 3 text must be strictly "3"');
  } finally {
    viewer.dispose();
    dom.window.close();
  }
});

test('interactive PDF viewer mounts 35px circular badges positioned directly on option numbers with no badge options panel', async () => {
  const module = await import('../src/features/assessment/pdf-viewer');
  const dom = new JSDOM('<body><div id="mount"></div></body>', { url: 'https://quest.cns.utexas.edu/student/instances/show' });
  const viewer = module.createInteractivePdfViewer(dom.window.document.querySelector<HTMLElement>('#mount')!, {
    url: '/student/images/download_pdf?instance=courseuserassignment_1',
    optionMaximums: new Map([[1, 2]]),
    onChoose: () => {},
    openDocument: async () => ({
      pageCount: 1,
      renderPage: async () => ({
        width: 600, height: 800,
        runs: [textRun('001', 50), textRun('1.', 130), textRun('2.', 190), textRun('002', 260)],
      }),
      destroy: () => {},
    }),
  });
  try {
    assert.equal(await viewer.ready, true);
    const shadow = viewer.element.shadowRoot!;
    assert.equal(shadow.querySelector('button[data-betterquest-badge-config="true"]'), null, 'Badges toolbar button must be removed');
    assert.equal(shadow.querySelector('.badge-popover'), null, 'Badge options popover panel must be removed');

    const css = shadow.querySelector('style')!.textContent!;
    assert.match(css, /width:35px!important/);
    assert.match(css, /height:35px!important/);
    assert.match(css, /border-radius:18px!important/);
    assert.match(css, /transform:translate\(5px,5px\)/);
  } finally {
    viewer.dispose();
    dom.window.close();
  }
});


