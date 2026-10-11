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
    assert.match(submitBtn.style.left, /calc\(/, 'Submit button must be positioned to the right of the equation');

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
    assert.equal(boxes.length, 1, 'Other options disappear once answered correctly');
    assert.ok(boxes[0].classList.contains('is-correct'), 'Correct answer is highlighted green');
    assert.ok(!boxes[0].classList.contains('is-wrong'));
    assert.ok(viewer.element.shadowRoot!.querySelectorAll('.confetti-bit').length > 0, 'Correct answer bursts confetti');
    assert.match(viewer.element.shadowRoot!.querySelector('.meta')!.textContent!, /1 answer choice/, 'Kept correct answer stays counted');
  } finally {
    viewer.dispose();
    dom.window.close();
  }
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

    // Dynamically marking question 2 as answered removes all option boxes
    viewer.setAnsweredQuestions(new Set([1, 2]));
    assert.equal(viewer.element.shadowRoot!.querySelectorAll('.option-hit').length, 0);
    assert.equal(viewer.element.shadowRoot!.querySelector('.pdf-submit-btn'), null);
    const meta = viewer.element.shadowRoot!.querySelector('.meta')!.textContent!;
    assert.match(meta, /All questions completed/);
  } finally {
    viewer.dispose();
    dom.window.close();
  }
});
