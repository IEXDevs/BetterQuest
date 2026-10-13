import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { readHomepageCourseRows } from '../src/adapters/quest/homepage';
import { rememberCourseCodes } from '../src/features/courses/course-codes';
import { enhanceCourseHero, disposeCourseHero } from '../src/features/courses/hero';
import { QUEST_DARK_STYLES } from '../src/adapters/quest/theme';

function homepageDom(courseParam: string, courseCode: string) {
  return new JSDOM(`<html><body class="mdb-skin"><div id="quest-nav-header-div"></div><div id="main-content"><div id="courses-table-div">
    <div id="courses-table_wrapper"><table id="courses-table"><thead><tr><th>Course</th><th>Name</th><th>Unique</th><th>Instructor</th><th>Short Name</th></tr></thead>
    <tbody><tr><td><img src="/assets/images/subj_generic.png" alt=""></td><td><a href="/student/courses/show?course=${courseParam}">CALCULUS</a></td><td>58360</td><td>Instructor</td><td aria-label="Course Short Name: ${courseCode}">${courseCode}</td></tr></tbody></table></div>
  </div><div id="enroll-div"></div></div></body></html>`, {
    url: 'https://quest.cns.utexas.edu/student/courses', pretendToBeVisual: true,
  });
}

/** The course card the way Quest ships it: title header plus the info panel of
 *  instructor / meets / upcoming columns stacked underneath. */
function courseDom(courseParam: string) {
  return new JSDOM(`<html><body id="body-id" class="mdb-skin"><div id="quest-nav-header-div"></div><div id="main-content"><div id="target">
    <div class="card">
      <div class="card-header text-center">
        <button type="button" class="btn btn-link" data-toggle="collapse" data-target="#student-course-info-header" aria-expanded="true">
          <span class="h4">DIFFEREN AND INTEGRAL CALCULUS (58360)</span>
        </button>
      </div>
      <div class="collapse show" id="student-course-info-header">
        <div class="row text-center">
          <div class="col"><div class="qlabel">Instructor</div><div>Nicolas Reyes</div></div>
          <div class="col"><div class="qlabel">Meets</div><div>TTH 330-500</div></div>
          <div class="col"><div class="qlabel">Upcoming</div><div>Problem Set 1</div></div>
        </div>
      </div>
    </div>
  </div></div></body></html>`, {
    url: `https://quest.cns.utexas.edu/student/courses/show?course=${courseParam}`, pretendToBeVisual: true,
  });
}

/** The declaration block that follows `marker`, through its closing brace. */
function ruleAfter(css: string, marker: string): string {
  const start = css.indexOf(marker);
  assert.notEqual(start, -1, `style sheet still contains "${marker}"`);
  return css.slice(start, css.indexOf('}', start) + 1);
}

test('the course card background art covers the whole card, behind the content', () => {
  const home = homepageDom('9401', 'M 408C');
  rememberCourseCodes(readHomepageCourseRows(home.window.document));
  home.window.close();
  const dom = courseDom('9401');
  try {
    enhanceCourseHero(dom.window.document.querySelector<HTMLElement>('#target')!);
    const style = dom.window.document.querySelector<HTMLStyleElement>('style[data-betterquest="course-hero-style"]')!;
    assert.ok(style, 'the hero lays the card out while it is up');
    const css = style.textContent!;

    const fill = ruleAfter(css, '.card:has(> [data-betterquest="course-hero"]) > [data-betterquest="course-hero"]');
    assert.match(fill, /position: absolute !important/, 'the art layer leaves the flow and pins to the card');
    assert.match(fill, /inset: 0 !important/, 'the art reaches every edge of the card, not just the top strip');
    assert.match(fill, /pointer-events: none !important/, 'the art never blocks the content sitting on it');

    // Everything else keeps its place above that layer: the info panel has to be
    // clickable and readable on top of the backdrop, never underneath it.
    assert.match(css, /> \*:not\(\[data-betterquest="course-hero"\]\) \{\s*position: relative !important;\s*z-index: 1 !important;/,
      'card content stacks above the art layer');
    // The banner copy keeps its own strip at the top of the card.
    assert.match(css, /padding-top: 80px !important/, 'the card reserves room for the banner copy');
  } finally { disposeCourseHero(dom.window.document); dom.window.close(); }
});

test('boxes over the card background stay hazy instead of solid', () => {
  const dark = ruleAfter(QUEST_DARK_STYLES, '/* Dark mode course info card */');
  assert.match(dark, /background: rgba\(/, 'dark panels are translucent so the art shows through');
  assert.match(dark, /backdrop-filter: blur\(/, 'dark panels blur what is behind them');
  assert.doesNotMatch(dark, /#182436/, 'the old solid dark panel fill is gone');

  const light = ruleAfter(QUEST_DARK_STYLES, "The card's backdrop art shows through these panels");
  assert.match(light, /background: rgba\(255, 255, 255, /, 'light panels are translucent so the art shows through');
  assert.match(light, /backdrop-filter: blur\(/, 'light panels blur what is behind them');
  assert.doesNotMatch(light, /#f8fafc/, 'the old solid light panel fill is gone');
});
