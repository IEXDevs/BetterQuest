import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { readHomepageCourseRows } from '../src/adapters/quest/homepage';
import { rememberCourseCodes } from '../src/features/courses/course-codes';
import { enhanceCourseHero, disposeCourseHero } from '../src/features/courses/hero';
import { createCourseArtwork } from '../src/features/courses/artwork';
import { COURSE_EFFECTS, isCourseEffect } from '../src/features/courses/effects';
import { REACTBITS_EFFECTS } from '../src/features/courses/reactbits';

/** jsdom ships no canvas backend; stubbing getContext keeps effect mounts on
 *  the silent no-WebGL path instead of spamming "Not implemented" logs. */
function quietCanvas(dom: JSDOM): JSDOM {
  const proto = dom.window.HTMLCanvasElement.prototype;
  proto.getContext = (() => null) as unknown as typeof proto.getContext;
  return dom;
}

function homepageDom(courseParam: string, courseCode: string) {
  return quietCanvas(new JSDOM(`<html><body class="mdb-skin"><div id="quest-nav-header-div"></div><div id="main-content"><div id="courses-table-div">
    <div id="courses-table_wrapper"><table id="courses-table"><thead><tr><th>Course</th><th>Name</th><th>Unique</th><th>Instructor</th><th>Short Name</th></tr></thead>
    <tbody><tr><td><img src="/assets/images/subj_generic.png" alt=""></td><td><a href="/student/courses/show?course=${courseParam}">CALCULUS</a></td><td>58360</td><td>Instructor</td><td aria-label="Course Short Name: ${courseCode}">${courseCode}</td></tr></tbody></table></div>
  </div><div id="enroll-div"></div></div></body></html>`, {
    url: 'https://quest.cns.utexas.edu/student/courses', pretendToBeVisual: true,
  }));
}

function courseDom(courseParam: string, title = 'MULTIVARIABLE CALCULUS (58735)') {
  return quietCanvas(new JSDOM(`<html><body id="body-id" class="mdb-skin"><div id="quest-nav-header-div"></div><div id="main-content"><div id="target">
    <div class="card">
      <div class="card-header text-center">
        <button type="button" class="btn btn-link" data-toggle="collapse" data-target="#student-course-info-header" aria-expanded="true">
          <span class="h4">${title}</span>
        </button>
      </div>
      <div class="collapse show" id="student-course-info-header">
        <div class="row text-center"><div class="col"><div class="qlabel">Instructor</div><div>Teacher Name</div></div></div>
      </div>
    </div>
  </div></div></body></html>`, {
    url: `https://quest.cns.utexas.edu/student/courses/show?course=${courseParam}`, pretendToBeVisual: true,
  }));
}

test('every allowed course effect has exactly one real react-bits mount', () => {
  const keys = Object.keys(REACTBITS_EFFECTS).sort();
  assert.deepEqual(keys, [...COURSE_EFFECTS].sort(), 'registry matches the allowlist one-for-one');
  for (const effect of COURSE_EFFECTS) {
    assert.equal(typeof REACTBITS_EFFECTS[effect], 'function', `${effect} provides a mount`);
  }
});

test('mounting degrades to the CSS fallback when WebGL is unavailable', () => {
  const dom = quietCanvas(new JSDOM('<html><body><div id="target"></div></body></html>', {
    url: 'https://quest.cns.utexas.edu/student/courses', pretendToBeVisual: true,
  }));
  try {
    for (const effect of COURSE_EFFECTS) {
      const layer = dom.window.document.createElement('div');
      dom.window.document.body.append(layer);
      // Collected rather than assigned to a `let`, which control-flow analysis
      // would narrow to `never` after the closure that writes it.
      const live: Array<{ destroy(): void }> = [];
      assert.doesNotThrow(() => {
        const instance = REACTBITS_EFFECTS[effect](layer);
        if (instance) live.push(instance);
      }, `${effect} never throws`);
      for (const instance of live) instance.destroy(); // Live environments tear down cleanly too.
      layer.remove();
    }
  } finally { dom.window.close(); }
});

test('the course hero carries a real-effect layer while keeping the CSS art as fallback', () => {
  const home = homepageDom('9011', 'M 408C');
  rememberCourseCodes(readHomepageCourseRows(home.window.document));
  home.window.close();
  const dom = courseDom('9011');
  try {
    const root = dom.window.document.querySelector<HTMLElement>('#target')!;
    enhanceCourseHero(root);
    const host = dom.window.document.querySelector<HTMLElement>('[data-betterquest="course-hero"]');
    assert.ok(host, 'hero mounted');
    const shadow = host.shadowRoot!;
    const layer = shadow.querySelector<HTMLElement>('.fx-layer');
    assert.ok(layer, 'hero has the real-effect layer');
    assert.ok(isCourseEffect(layer.dataset.fx), 'layer names an allowed effect');
    const artBg = shadow.querySelector<HTMLElement>('.art-bg');
    assert.ok(artBg, 'hero keeps the CSS fallback art');
    assert.notEqual(artBg.style.display, 'none', 'fallback art stays visible when no effect can mount');
    disposeCourseHero(dom.window.document);
    assert.equal(dom.window.document.querySelector('[data-betterquest="course-hero"]'), null, 'hero removed');
  } finally { dom.window.close(); }
});

test('homepage cards carry a real-effect layer over the CSS art', () => {
  const dom = homepageDom('9012', 'CS 312');
  try {
    const root = dom.window.document.querySelector('#courses-table-div')!;
    const artwork = createCourseArtwork(root);
    try {
      artwork.reconcile();
      const host = dom.window.document.querySelector<HTMLElement>('[data-betterquest="course-artwork"]');
      assert.ok(host, 'card artwork mounted');
      const shadow = host.shadowRoot!;
      const layer = shadow.querySelector<HTMLElement>('.fx-layer');
      assert.ok(layer, 'card has the real-effect layer');
      assert.ok(isCourseEffect(layer.dataset.fx), 'card layer names an allowed effect');
      const artBg = shadow.querySelector<HTMLElement>('.art-bg');
      assert.notEqual(artBg?.style.display, 'none', 'fallback art stays visible when no effect can mount');
    } finally { artwork.dispose(); }
  } finally { dom.window.close(); }
});
