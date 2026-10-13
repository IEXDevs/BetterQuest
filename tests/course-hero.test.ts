import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { readHomepageCourseRows, departmentFromCourseCode } from '../src/adapters/quest/homepage';
import { rememberCourseCodes, lookupCourseCode } from '../src/features/courses/course-codes';
import { enhanceCourseHero, disposeCourseHero } from '../src/features/courses/hero';
import { createCourseDetailsFacelift } from '../src/features/courses/details-enhancer';
import { createCourseArtwork } from '../src/features/courses/artwork';
import { COURSE_EFFECTS, COURSE_EFFECT_CSS, courseArtKey, courseArtMood, courseEffect, isCourseEffect } from '../src/features/courses/effects';

function homepageDom(courseParam: string, courseCode: string, courseUnique = '58360') {
  return new JSDOM(`<html><body class="mdb-skin"><div id="quest-nav-header-div"></div><div id="main-content"><div id="courses-table-div">
    <div id="courses-table_wrapper"><table id="courses-table"><thead><tr><th>Course</th><th>Name</th><th>Unique</th><th>Instructor</th><th>Short Name</th></tr></thead>
    <tbody><tr><td><img src="/assets/images/subj_generic.png" alt=""></td><td><a href="/student/courses/show?course=${courseParam}">CALCULUS</a></td><td>${courseUnique}</td><td>Instructor</td><td aria-label="Course Short Name: ${courseCode}">${courseCode}</td></tr></tbody></table></div>
  </div><div id="enroll-div"></div></div></body></html>`, {
    url: 'https://quest.cns.utexas.edu/student/courses', pretendToBeVisual: true,
  });
}

function courseDom(courseParam: string, title = 'MULTIVARIABLE CALCULUS (58735)') {
  return new JSDOM(`<html><body id="body-id" class="mdb-skin"><div id="quest-nav-header-div"></div><div id="main-content"><div id="target">
    <div class="card">
      <div class="card-header text-center">
        <button type="button" class="btn btn-link" data-toggle="collapse" data-target="#student-course-info-header" aria-expanded="true">
          <span class="h4">${title}</span>
        </button>
      </div>
      <div class="collapse show" id="student-course-info-header">
        <div class="row text-center">
          <div class="col"><div class="qlabel">Instructor</div><div>Teacher Name</div><a href="mailto:instructor@example.invalid">contact</a></div>
          <div class="col"><div class="qlabel">Meets</div><div>MWF 1200-100</div></div>
        </div>
      </div>
    </div>
  </div></div></body></html>`, {
    url: `https://quest.cns.utexas.edu/student/courses/show?course=${courseParam}`, pretendToBeVisual: true,
  });
}

const ROSTER: ReadonlyArray<readonly [string, string]> = [
  ['M 408C', '58360'], ['M 408D', '58361'], ['CH 301', '51200'], ['CH 312', '51201'],
  ['CS 312', '54100'], ['CS 314', '54101'], ['BIO 311', '33010'], ['GOV 312', '32100'],
  ['PHY 303K', '56410'], ['UT 303', '47100'], ['ECON 304', '40200'],
];

const artKeyOf = (code: string, unique: string) =>
  courseArtKey({ code, unique, departmentCode: departmentFromCourseCode(code) });

test('every course hashes to its own allowed backdrop and keeps it across views', () => {
  assert.equal(COURSE_EFFECTS.length, 18);
  for (const [code, unique] of ROSTER) {
    const key = artKeyOf(code, unique);
    assert.ok(isCourseEffect(courseEffect(key)), `${code} maps to an allowed effect`);
    assert.equal(courseEffect(key), courseEffect(key), `${code} keeps the same backdrop every time`);
  }
  // Two courses in one department are no longer forced onto the same art.
  assert.notEqual(courseEffect(artKeyOf('M 408C', '58360')), courseEffect(artKeyOf('M 408D', '58361')));
  assert.notEqual(courseEffect(artKeyOf('CH 301', '51200')), courseEffect(artKeyOf('CH 312', '51201')));
  // The same course code re-taken under a new unique number gets fresh art.
  assert.notEqual(courseEffect(artKeyOf('M 408C', '58360')), courseEffect(artKeyOf('M 408C', '99999')));
  // The key ignores how Quest spaces the code, so both views agree.
  assert.equal(artKeyOf('M 408C', '58360'), courseArtKey({ code: 'M408C', unique: '58360' }));

  for (const effect of COURSE_EFFECTS) {
    assert.ok(COURSE_EFFECT_CSS.includes(`.fx-${effect}`), `effect CSS defines ${effect}`);
  }
  assert.equal(isCourseEffect('aurora'), false, 'unlisted backgrounds are rejected');
});

test('courses that land on the same backdrop still differ in hue and phase', () => {
  const moods = ROSTER.map(([code, unique]) => courseArtMood(artKeyOf(code, unique)));
  for (const [code, unique] of ROSTER) {
    const mood = courseArtMood(artKeyOf(code, unique));
    assert.ok(mood.hue >= -18 && mood.hue <= 18, `${code} hue drift stays subtle`);
    assert.ok(mood.delay <= 0 && mood.delay >= -7, `${code} phase offset only ever starts mid-cycle`);
    assert.deepEqual(mood, courseArtMood(artKeyOf(code, unique)), `${code} mood is stable`);
  }
  assert.ok(new Set(moods.map(m => `${m.hue}/${m.delay}`)).size === ROSTER.length, 'no two courses share a mood');
});

test('the animated layer overflows the box on all four sides', () => {
  const card = COURSE_EFFECT_CSS.slice(COURSE_EFFECT_CSS.indexOf('.art-bg {'));
  const base = card.slice(0, card.indexOf('}'));
  assert.match(base, /top:\s*-45%/, 'art reaches past the top edge');
  assert.match(base, /left:\s*-45%/, 'art reaches past the left edge');
  assert.match(base, /width:\s*190%/, 'art also covers past the right edge');
  assert.match(base, /height:\s*190%/, 'art also covers past the bottom edge');
});

test('homepage course rows carry their course parameter and feed the code memory', () => {
  const dom = homepageDom('9001', 'M 408C');
  try {
    const rows = readHomepageCourseRows(dom.window.document);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].courseParam, '9001');
    assert.equal(rows[0].courseCode, 'M 408C');
    rememberCourseCodes(rows);
    const course = courseDom('9001');
    try {
      assert.deepEqual(lookupCourseCode(course.window.document), { code: 'M 408C', departmentCode: 'M', unique: '58360' });
    } finally { course.window.close(); }
    const stranger = courseDom('424242');
    try {
      assert.equal(lookupCourseCode(stranger.window.document), null, 'unknown courses have no remembered code');
    } finally { stranger.window.close(); }
  } finally { dom.window.close(); }
});

test('opening a course shows the hero banner with code, name, and unique above the instructor info', () => {
  const home = homepageDom('9002', 'M 408C', '58735');
  rememberCourseCodes(readHomepageCourseRows(home.window.document));
  home.window.close();
  const dom = courseDom('9002');
  try {
    const root = dom.window.document.querySelector<HTMLElement>('#target')!;
    enhanceCourseHero(root);
    const card = dom.window.document.querySelector<HTMLElement>('.card')!;
    const host = card.querySelector<HTMLElement>('[data-betterquest="course-hero"]')!;
    assert.ok(host, 'hero mounts');
    assert.equal(card.firstElementChild, host, 'hero sits at the very top of the course card');

    const shadow = host.shadowRoot!;
    assert.equal(shadow.querySelector('.code')?.textContent, 'M408C', 'compact all-caps course code, no spaces');
    assert.equal(shadow.querySelector('.name')?.textContent, 'MULTIVARIABLE CALCULUS');
    assert.equal(shadow.querySelector('.unique')?.textContent, '58735');
    const fxClass = [...shadow.querySelector('.art-bg')!.classList].find(name => name.startsWith('fx-'))!;
    assert.ok(isCourseEffect(fxClass.replace('fx-', '')), 'background comes from the allowlist');
    assert.equal(fxClass, `fx-${courseEffect(artKeyOf('M 408C', '58735'))}`, 'background is keyed by this course');

    const info = dom.window.document.querySelector<HTMLElement>('#student-course-info-header')!;
    assert.ok(info.querySelector('a[href^="mailto:"]'), 'instructor info stays underneath, intact');
    assert.equal(info.compareDocumentPosition(host) & 2, 2, 'hero precedes the instructor panel');

    enhanceCourseHero(root);
    assert.equal(card.querySelectorAll('[data-betterquest="course-hero"]').length, 1, 'reconcile keeps a single hero');
    assert.ok(dom.window.document.querySelector('style[data-betterquest="course-hero-style"]'), 'native duplicate header is hidden while the hero is up');
  } finally { disposeCourseHero(dom.window.document); dom.window.close(); }
});

test('without a remembered code the hero still shows name and unique', () => {
  const dom = courseDom('424242');
  try {
    enhanceCourseHero(dom.window.document.querySelector<HTMLElement>('#target')!);
    const shadow = dom.window.document.querySelector<HTMLElement>('[data-betterquest="course-hero"]')!.shadowRoot!;
    assert.equal(shadow.querySelector('.code')?.textContent, '', 'no code chip when the code was never seen');
    assert.equal(shadow.querySelector('.name')?.textContent, 'MULTIVARIABLE CALCULUS');
    assert.equal(shadow.querySelector('.unique')?.textContent, '58735');
    // Falls back to the unique number, which is all this page can offer.
    assert.ok(shadow.querySelector('.art-bg')!.classList.contains(`fx-${courseEffect(artKeyOf('', '58735'))}`),
      'an unmemorised course still gets a stable backdrop of its own');
  } finally { disposeCourseHero(dom.window.document); dom.window.close(); }
});

test('a course keeps the same animation on the homepage card and the course hero', () => {
  const home = homepageDom('9005', 'CH 301', '58735');
  rememberCourseCodes(readHomepageCourseRows(home.window.document));
  try {
    const artwork = createCourseArtwork(home.window.document.querySelector('#courses-table-div')!);
    try {
      artwork.reconcile();
      const card = home.window.document.querySelector<HTMLElement>('[data-betterquest="course-artwork"]')!.shadowRoot!;
      const cardFx = card.querySelector<HTMLElement>('.art-bg')!.className.match(/fx-[\w-]+/)![0];
      assert.equal(cardFx, `fx-${courseEffect(artKeyOf('CH 301', '58735'))}`, 'the homepage card uses this course\'s backdrop');
      const art = card.querySelector<HTMLElement>('.art')!;
      const mood = courseArtMood(artKeyOf('CH 301', '58735'));
      assert.equal(art.style.getPropertyValue('--fx-hue'), `${mood.hue}deg`, 'the card carries this course\'s hue drift');
      assert.equal(art.style.getPropertyValue('--fx-delay'), `${mood.delay}s`, 'the card carries this course\'s phase');
      assert.match(card.querySelector('style')!.textContent!, /width:\s*190%/, 'the live canvas layer also overflows the box');
    } finally { artwork.dispose(); }
  } finally { home.window.close(); }

  const dom = courseDom('9005');
  try {
    enhanceCourseHero(dom.window.document.querySelector<HTMLElement>('#target')!);
    const hero = dom.window.document.querySelector<HTMLElement>('[data-betterquest="course-hero"]')!.shadowRoot!;
    const heroFx = hero.querySelector<HTMLElement>('.art-bg')!.className.match(/fx-[\w-]+/)![0];
    assert.equal(heroFx, `fx-${courseEffect(artKeyOf('CH 301', '58735'))}`, 'the hero uses this course\'s backdrop');
    assert.equal(
      hero.querySelector<HTMLElement>('.fx-layer')!.dataset.fx,
      heroFx.replace('fx-', ''),
      'the live canvas layer runs the same effect as the fallback art',
    );
  } finally { disposeCourseHero(dom.window.document); dom.window.close(); }
});

test('an unverifiable course header removes the hero and restores the native toggle', () => {
  const dom = courseDom('9003', 'No verified unique number');
  try {
    const root = dom.window.document.querySelector<HTMLElement>('#target')!;
    const facelift = createCourseDetailsFacelift(root);
    try {
      assert.equal(dom.window.document.querySelector('[data-betterquest="course-hero"]'), null, 'no hero without a unique number');
      assert.equal(dom.window.document.querySelector('style[data-betterquest="course-hero-style"]'), null, 'native header stays visible as the fallback');
    } finally { facelift.dispose(); }
  } finally { dom.window.close(); }
});

test('the course-details facelift mounts the hero and follows the animations setting', async () => {
  const dom = courseDom('9004');
  dom.window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList;
  try {
    const facelift = createCourseDetailsFacelift(dom.window.document.querySelector<HTMLElement>('#target')!);
    try {
      const host = dom.window.document.querySelector<HTMLElement>('[data-betterquest="course-hero"]')!;
      assert.ok(host, 'facelift reconcile mounts the hero');
      assert.equal(host.getAttribute('data-animations'), null);

      dom.window.document.documentElement.dataset.betterquestAnimations = 'disabled';
      await new Promise(resolve => setTimeout(resolve, 60));
      assert.equal(host.getAttribute('data-animations'), 'disabled', 'animations off flips the hero');
      assert.equal(host.shadowRoot!.querySelector('.hero')?.classList.contains('is-disabled'), true);

      dom.window.document.documentElement.removeAttribute('data-betterquest-animations');
      await new Promise(resolve => setTimeout(resolve, 60));
      assert.equal(host.getAttribute('data-animations'), null, 'animations back on restores the art');
    } finally { facelift.dispose(); }
    assert.equal(dom.window.document.querySelector('[data-betterquest="course-hero"]'), null, 'dispose removes the hero');
  } finally { dom.window.close(); }
});
