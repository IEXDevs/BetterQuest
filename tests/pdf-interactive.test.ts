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
    assert.ok(Number.parseFloat(buttons[1].style.width) > 35, 'the equation row, not only its number, should be clickable');
    buttons[1].click();
    assert.deepEqual(selected, [[1, 2]]);
    viewer.setSelected(1, '2');
    assert.equal(buttons[1].getAttribute('aria-pressed'), 'true');
  } finally {
    viewer.dispose();
    assert.equal(destroyed, true);
    assert.equal(dom.window.document.querySelector('#mount')?.childElementCount, 0);
    dom.window.close();
  }
});

