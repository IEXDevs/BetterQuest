import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createScrollTopGuard, isPdfViewPage, scrollPageToTop } from '../src/features/navigation/scroll-top';

test('PDF view pages are excluded from forced scroll-to-top', () => {
  const pdf = new JSDOM('<main id="main-content"><div id="target" data-betterquest-pdf-workspace="enhanced">' +
    '<div id="pdf-frame"><iframe src="/student/images/problem_pdf?instance=1"></iframe></div></div></main>', {
    url: 'https://quest.cns.utexas.edu/student/instances/show?instance=1',
  });
  assert.equal(isPdfViewPage(pdf.window.document), true);

  const grades = new JSDOM('<main id="main-content"><div id="target"><div id="tabs-grades"></div></div></main>', {
    url: 'https://quest.cns.utexas.edu/student/courses/show?course=1',
  });
  assert.equal(isPdfViewPage(grades.window.document), false);
});

test('course tab clicks pin the window to the top', async () => {
  const dom = new JSDOM(`<html><body><main id="main-content">
    <ul id="panel-tabs"><li><a class="nav-link" id="student-grades-a" href="#tabs-grades">Grades</a></li></ul>
    <div id="target"><div id="tabs-grades" style="margin-top:2000px">grades</div></div>
  </main></body></html>`, {
    url: 'https://quest.cns.utexas.edu/student/courses/show?course=1',
    pretendToBeVisual: true,
  });
  const root = dom.window.document.documentElement;
  root.scrollTop = 480;
  const guard = createScrollTopGuard(dom.window.document, dom.window as unknown as Window);
  try {
    root.scrollTop = 480;
    dom.window.document.querySelector('#student-grades-a')!.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 60));
    assert.equal(root.scrollTop, 0, 'Grades tab click returns to the top of the page');
  } finally {
    guard.dispose();
    dom.window.close();
  }
});

test('scrollPageToTop is a no-op on PDF homework', () => {
  const dom = new JSDOM('<div id="target"><section data-betterquest="interactive-pdf"></section></div>', {
    url: 'https://quest.cns.utexas.edu/student/instances/show?instance=1',
  });
  const root = dom.window.document.documentElement;
  root.scrollTop = 220;
  scrollPageToTop(dom.window as unknown as Window, dom.window.document);
  assert.equal(root.scrollTop, 220, 'PDF pages keep their scroll position');
  dom.window.close();
});
