import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { startIntegration } from '../src/content/integration';
import { QUEST_DARK_STYLES } from '../src/adapters/quest/theme';
import { LocalRepository } from '../src/storage/repository';
import type { LocalState } from '../src/shared/models';

test('Saved Questions opening and closing leaves assessment header, spacers and scroll unchanged', async () => {
  const dom = new JSDOM(`<body id="body-id" class="mdb-skin">
    <div id="quest-nav-header-div"><nav class="qh-navbar"><div class="qh-breadcrumbs"></div><ul class="qh-nav"></ul></nav></div>
    <br id="page-gap"><br id="second-gap">
    <main id="main-content"><div id="target">
      <div id="info-header-div"><div class="d-flex justify-content-between">
        <div id="due_date_field"><div id="due-date-messaging-div"><div><span class="qlabel">Due date</span><span>10/18/26 11:59 PM</span></div></div></div>
        <div><a class="btn btn-primary" href="/student/instances/administer?instance=courseuserassignment_1">Slides</a></div>
      </div><div><a href="/student/images/problem_pdf?instance=courseuserassignment_1">PDF</a></div></div>
      <aside class="assessment-integrity-banner" aria-label="Academic integrity notice" style="margin:0 0 1rem;padding:.6rem .9rem;">Active graded assessment. Academic integrity policy applies.</aside>
      <div id="pdf-frame"><div id="presentation-pdf-frame"><iframe title="Assignment PDF" src="/student/images/problem_pdf?instance=courseuserassignment_1"></iframe></div></div>
      <div id="view-responses-table-id"><table id="instance-table-courseuserassignment_1"><tbody><tr data-id="cuaip_1"><td>1.</td><td><select name="response"><option value=""></option><option value="1">1</option></select></td><td></td><td class="previous">0 / 3</td><td><button aria-label="Submit response">Submit</button></td></tr></tbody></table></div>
    </div></main></body>`, { url: 'https://quest.cns.utexas.edu/student/instances/show?instance=courseuserassignment_1', pretendToBeVisual: true });
  dom.window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList;
  const doc = dom.window.document;
  let raw: LocalState | undefined;
  const repository = new LocalRepository({ read: async () => raw, write: async state => { raw = structuredClone(state); } });
  const integration = startIntegration(doc, dom.window as unknown as Window, { run: command => repository.execute(command), subscribe: () => () => {} });
  const pause = () => new Promise(resolve => setTimeout(resolve, 220));
  try {
    await pause();
    const launcher = doc.querySelector<HTMLButtonElement>('.bq-toolbar-saved')!;
    const main = doc.querySelector<HTMLElement>('#main-content')!;
    const gaps = [...doc.querySelectorAll<HTMLElement>('body > br')];
    const header = doc.querySelector<HTMLElement>('#info-header-div')!;
    const banner = doc.querySelector<HTMLElement>('.assessment-integrity-banner')!;
    const pdf = doc.querySelector<HTMLElement>('#pdf-frame')!;
    const desk = doc.querySelector<HTMLElement>('[data-betterquest="assessment-rail"]')!;
    assert.ok(desk, 'exercise the mounted assessment workspace, not only the popup in isolation');
    const markup = main.innerHTML;
    const appearance = () => [...gaps, header, banner, pdf, desk].map(node => ({
      display: dom.window.getComputedStyle(node).display,
      margin: dom.window.getComputedStyle(node).margin,
      visibility: dom.window.getComputedStyle(node).visibility,
    }));
    const before = appearance();
    doc.documentElement.scrollTop = 137; doc.body.scrollTop = 137; pdf.scrollTop = 83;
    let scrollCalls = 0;
    dom.window.HTMLElement.prototype.scrollIntoView = () => { scrollCalls++; };
    const originalFocus = launcher.focus.bind(launcher);
    launcher.focus = options => { assert.equal(options?.preventScroll, true); originalFocus(options); };
    const unchanged = () => {
      assert.equal(main.innerHTML, markup, 'no assessment nodes or styles may change');
      assert.deepEqual(appearance(), before, 'CSS may not hide spacing or assessment chrome');
      assert.equal(doc.documentElement.scrollTop, 137); assert.equal(doc.body.scrollTop, 137);
      assert.equal(pdf.scrollTop, 83); assert.equal(scrollCalls, 0);
    };
    for (const dismiss of ['button', 'close', 'escape', 'outside']) {
      launcher.click(); await pause();
      const popup = doc.querySelector<HTMLElement>('[data-betterquest="saved-questions"]')!;
      assert.equal(popup.hidden, false);
      assert.equal(launcher.getAttribute('aria-expanded'), 'true');
      unchanged();
      if (dismiss === 'button') launcher.click();
      else if (dismiss === 'close') popup.shadowRoot!.querySelector<HTMLButtonElement>('[aria-label="Close Saved Questions"]')!.click();
      else if (dismiss === 'escape') doc.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      else doc.body.click();
      await pause();
      assert.equal(popup.hidden, true); unchanged();
    }
    assert.equal(QUEST_DARK_STYLES.includes('betterquest-saved-questions-open'), false);
  } finally { integration.dispose(); dom.window.close(); }
});
