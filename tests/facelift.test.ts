import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { startPageFeatures } from '../src/content/features';
import { createPdfAssessmentWorkspace, isSlideSubmitRevealed } from '../src/features/assessment/workspace';
import { createSettingsMenu } from '../src/features/settings/menu';
import { LocalRepository } from '../src/storage/repository';
import { createQuestTheme } from '../src/features/theme/quest';
import { detectPageCategory, QUEST_DARK_STYLES } from '../src/adapters/quest/theme';
import { isEmptyResponseTable, readAssessmentMetrics, readAssessmentResponses } from '../src/adapters/quest/assessment';
import { formatMeetingTime, createMeetingTimesEnhancer } from '../src/features/courses/meeting-times';
import { createCoursesTableCleaner } from '../src/features/courses/table-cleaner';
import { enhanceCourseInfoCard, collapseCourseCategoriesByDefault, createCourseDetailsFacelift, isCourseShowPage } from '../src/features/courses/details-enhancer';
import { createAssessmentHeader } from '../src/features/assessment/header';
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

test('missing assessment metrics are reported as unavailable instead of fabricated values', () => {
  const dom = new JSDOM('<html><body><div id="target"></div></body></html>');
  try {
    const root = dom.window.document.querySelector<HTMLElement>('#target')!;
    assert.deepEqual(readAssessmentMetrics(dom.window.document, root, null), {
      score: 'Not available',
      classAverage: 'Not available',
      standardDeviation: 'Not available',
    });
  } finally {
    dom.window.close();
  }
});

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

test('the celebrations setting reaches the page as a preference switch', async () => {
  const dom = new JSDOM('<html><body></body></html>', { pretendToBeVisual: true });
  prepare(dom);
  const f = store();
  const features = startPageFeatures(dom.window.document, dom.window as unknown as Window, f.run, f.subscribe);
  try {
    features.reconcile(); await pause();
    assert.equal(dom.window.document.documentElement.hasAttribute('data-betterquest-celebrations'), false, 'Celebrations are on by default');
    await f.run({ kind: 'feature:set', feature: 'celebrations', enabled: false });
    dom.window.dispatchEvent(new dom.window.Event('betterquest:preferences-changed'));
    await pause();
    assert.equal(dom.window.document.documentElement.dataset.betterquestCelebrations, 'disabled', 'Turning it off reaches the page');
    await f.run({ kind: 'feature:set', feature: 'celebrations', enabled: true });
    dom.window.dispatchEvent(new dom.window.Event('betterquest:preferences-changed'));
    await pause();
    assert.equal(dom.window.document.documentElement.hasAttribute('data-betterquest-celebrations'), false, 'Turning it back on clears the switch');
  } finally { features.dispose(); dom.window.close(); }
});

test('the whimsy setting reaches the page as a preference switch', async () => {
  const dom = new JSDOM('<html><body></body></html>', { pretendToBeVisual: true });
  prepare(dom);
  const f = store();
  const features = startPageFeatures(dom.window.document, dom.window as unknown as Window, f.run, f.subscribe);
  try {
    features.reconcile(); await pause();
    assert.equal(dom.window.document.documentElement.hasAttribute('data-betterquest-whimsy'), false, 'Whimsy is off by default');
    await f.run({ kind: 'feature:set', feature: 'whimsy', enabled: true });
    dom.window.dispatchEvent(new dom.window.Event('betterquest:preferences-changed'));
    await pause();
    assert.equal(dom.window.document.documentElement.dataset.betterquestWhimsy, 'enabled', 'Turning it on reaches the page');
    await f.run({ kind: 'feature:set', feature: 'whimsy', enabled: false });
    dom.window.dispatchEvent(new dom.window.Event('betterquest:preferences-changed'));
    await pause();
    assert.equal(dom.window.document.documentElement.hasAttribute('data-betterquest-whimsy'), false, 'Turning it back off clears the switch');
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
    assert.equal(host.shadowRoot!.querySelector('.mode-switcher'), null, 'Single unified view has no mode switcher');
    assert.match(host.shadowRoot!.querySelector('.progress-copy')!.textContent!, /1 of 2 submitted/);
    assert.match(host.shadowRoot!.querySelector('.points')!.textContent!, /40 \/ 200 \(20%\)/);
    assert.equal(host.shadowRoot!.querySelector('.class-avg')!.textContent, 'Not available');
    assert.equal(host.shadowRoot!.querySelector('.std-dev')!.textContent, 'Not available');
    assert.equal(dom.window.document.querySelector('#target')?.getAttribute('data-betterquest-pdf-mode'), 'betterquest');

    const first = host.shadowRoot!.querySelector<HTMLElement>('[data-question-id="cuaip_1"]')!;
    assert.ok(first.querySelector('.question-bottom'), 'Choices and submit must be wrapped in question-bottom for 2-column layout');
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

test('past-due quizzes with an empty response table keep the native Quest page', async () => {
  const dom = new JSDOM(`<html><body class="mdb-skin"><div id="quest-nav-header-div"></div><main id="main-content"><div id="target">
    <div id="info-header-div"><div class="d-flex justify-content-between"><span id="due_date_field">Due date 9/21/26 12:00 AM</span></div></div>
    <p>This module is past due, and submissions are prevented.</p>
    <p>Due Date has Passed.</p>
    <div id="pdf-frame"><div id="presentation-pdf-frame"><iframe src="/student/images/download_pdf?instance=courseuserassignment_1" title="Assignment PDF"></iframe></div></div>
    <div id="view-responses-table-id"><table id="instance-table-courseuserassignment_1"><thead><tr><th>Response</th><th>Status</th><th>Tries</th><th>Points Earned</th></tr></thead>
      <tbody><tr class="odd"><td valign="top" colspan="4" class="dataTables_empty">No data available in table</td></tr></tbody>
    </table></div>
    <div id="tally-div">55 out of 100 points (55%) Class Average 74.93 points / 74.93% Standard Deviation 25.74</div>
  </div></main></body></html>`, { url: 'https://quest.cns.utexas.edu/student/instances/show?instance=courseuserassignment_1', pretendToBeVisual: true });
  prepare(dom);
  const table = dom.window.document.querySelector<HTMLTableElement>('#instance-table-courseuserassignment_1')!;
  assert.equal(isEmptyResponseTable(table), true);
  assert.equal(readAssessmentResponses(table).length, 0);
  const f = store();
  const features = startPageFeatures(dom.window.document, dom.window as unknown as Window, f.run, f.subscribe);
  try {
    features.reconcile(); await pause();
    assert.equal(dom.window.document.querySelector('[data-betterquest="assessment-rail"]'), null);
    assert.equal(dom.window.document.querySelector('#target')?.hasAttribute('data-betterquest-pdf-workspace'), false);
    assert.equal(dom.window.document.querySelector('#target')?.getAttribute('data-betterquest-pdf-mode'), null);
    const iframe = dom.window.document.querySelector<HTMLIFrameElement>('iframe')!;
    assert.equal(iframe.hidden, false);
    assert.notEqual(dom.window.getComputedStyle(iframe).display, 'none');
    assert.equal(dom.window.document.querySelector('#tally-div')?.textContent?.includes('55 out of 100'), true);
  } finally { features.dispose(); dom.window.close(); }
});

test('a past-due assessment gets a clear locked card instead of an empty table shell', async () => {
  const dom = new JSDOM(`<html><body class="mdb-skin"><div id="quest-nav-header-div"></div><main id="main-content"><div id="target">
    <div id="info-header-div"><div class="d-flex justify-content-between">
      <div id="due_date_field"><span id="due_date_span"><span class="qlabel">Due date</span><span class="qtext">9/27/26 12:00 AM</span></span></div>
      <div class="qsize"><span class="text-danger font-weight-bold">This module is past due, and submissions are prevented.</span></div>
    </div></div>
    <div class="row">
      <div class="col-md-8"><div id="pdf-frame"></div></div>
      <div class="col-md-4">
        <div class="view-responses" id="view-responses-table-id">
          <div class="h5">Due Date has Passed.</div>
          <div id="instance-table-courseuserassignment_1_wrapper" class="dataTables_wrapper">
            <div class="row"><div class="col-sm-12 col-md-6"><div class="dataTables_length"><label>Show <select><option>10</option></select> entries</label></div></div></div>
            <div class="row"><div class="col-sm-12"><div class="dataTables_scroll"><div class="dataTables_scrollHead"><table><thead><tr><th>Response</th></tr></thead></table></div>
              <div class="dataTables_scrollBody"><table id="instance-table-courseuserassignment_1"><thead><tr><th>Response</th></tr></thead>
                <tbody><tr class="odd"><td colspan="1" class="dataTables_empty">No data available in table</td></tr></tbody></table></div></div></div></div>
            <div class="row"><div class="col-sm-12 col-md-7"><div class="dataTables_paginate"><ul class="pagination"><li class="paginate_button disabled"><a>Previous</a></li><li class="paginate_button disabled"><a>Next</a></li></ul></div></div></div>
          </div>
          <div class="SubmitFeedback"></div>
        </div>
        <hr>
        <div id="tally-div" class="tally"><div class="text-center"><div class="h4">92 out of 100 points (92%)</div>
          <div><span class="qlabel">Class Average</span><span class="qtext">88.04 points / 88.04%</span></div>
          <div><span class="qlabel">Standard Deviation</span><span class="qtext">15.54</span></div></div></div>
      </div>
    </div>
  </div></main></body></html>`, { url: 'https://quest.cns.utexas.edu/student/instances/show?instance=courseuserassignment_1', pretendToBeVisual: true });
  prepare(dom);
  const f = store();
  const features = startPageFeatures(dom.window.document, dom.window as unknown as Window, f.run, f.subscribe);
  try {
    features.reconcile(); await pause();
    const doc = dom.window.document;
    const target = doc.querySelector<HTMLElement>('#target')!;
    assert.equal(target.dataset.betterquestLocked, 'true');

    const notice = doc.querySelector<HTMLElement>('[data-betterquest="locked-notice"]')!;
    assert.ok(notice, 'A past-due assessment gets an explanation of its own');
    assert.match(notice.textContent || '', /Past due/, 'The card leads with a plain status');
    assert.match(notice.textContent || '', /9\/27\/26 12:00 AM/, 'The notice repeats the closing date in plain language');
    assert.equal(notice.parentElement?.id, 'view-responses-table-id', 'The notice belongs to the response column');

    // Quest's own content survives; only the empty table chrome is styled away.
    assert.equal(doc.querySelector('#tally-div')?.textContent?.includes('92 out of 100'), true);
    assert.match(doc.querySelector('#view-responses-table-id .h5')?.textContent || '', /Due Date has Passed/);
    assert.equal(doc.querySelector('#info-header-div .text-danger')?.textContent?.includes('past due'), true);

    const css = [...doc.querySelectorAll('style')].map(s => s.textContent || '').join('\n');
    assert.match(css, /\.dataTables_paginate[^{]*\{ display: none !important; \}/, 'Dead pagination is not rendered');
    assert.match(css, /\.dataTables_scrollHead[^{]*\{ display: none !important; \}/, 'The empty table header is not rendered');
    assert.match(css, /\.col-md-8:not\(:has\(iframe/, 'The column Quest reserves for a PDF that never loaded is dropped');
    assert.match(css, /\.col-md-4\s*\{[^}]*flex: 0 0 100% !important/, 'The score summary gets the full width');
    assert.doesNotMatch(css, /border-left:\s*4px solid/, 'Past-due cards do not use a colored accent strip');
    assert.match(css, /#tally-div \.qtext[^}]*text-align:\s*right/, 'Class average stretches across the wide score card');

    features.dispose();
    assert.equal(target.hasAttribute('data-betterquest-locked'), false, 'Disposing restores the page');
    assert.equal(doc.querySelector('[data-betterquest="locked-notice"]'), null);
  } finally { dom.window.close(); }
});

test('the toolbar reads Due date, then Completed, then the downloads', async () => {
  const dom = new JSDOM(`<html><body class="mdb-skin"><div id="quest-nav-header-div"></div><main id="main-content"><div id="target">
    <div id="info-header-div"><div class="d-flex justify-content-between">
      <div id="due_date_field"><div class="d-flex justify-content-start">
        <div id="timer-div" class=""><span class="qsize"><i class="material-icons text-primary">schedule</i></span><span id="timerId" class="qsize"></span></div>
        <div id="due-date-messaging-div" class="d-flex justify-content-start">
          <span id="due_date_span"><div><span class="qlabel">Due date</span><span class="qtext">10/7/26 11:59 PM</span></div></span>
          <div>&nbsp;&nbsp;&nbsp;</div>
          <div><span class="qlabel">Completed</span><span class="qtext">10/6/26 11:17 PM</span></div>
        </div>
      </div></div>
      <div><span class="float-right"></span></div>
    </div></div>
    <div><div class="d-flex justify-content-start"><div><div class="d-flex justify-content-start">
      <div><a href="/student/images/problem_pdf?instance=courseuserassignment_1" target="_blank">PDF Download</a></div>
      <div>&nbsp;</div>
      <div><a href="/student/images/explanation_pdf?instance=courseuserassignment_1" target="_blank">PDF w/ expl</a></div>
    </div></div></div></div>
  </div></main></body></html>`, { url: 'https://quest.cns.utexas.edu/student/instances/show?instance=courseuserassignment_1', pretendToBeVisual: true });
  prepare(dom);
  const f = store();
  const features = startPageFeatures(dom.window.document, dom.window as unknown as Window, f.run, f.subscribe);
  try {
    features.reconcile(); await pause();
    const doc = dom.window.document;
    const download = doc.querySelector<HTMLAnchorElement>('[data-betterquest-download]')!;
    const completed = [...doc.querySelectorAll<HTMLElement>('#due-date-messaging-div > div')]
      .find(el => /^completed/i.test(el.textContent?.trim() || ''))!;
    const dueSpan = doc.querySelector('#due_date_span')!;

    assert.equal(download.parentElement, completed, 'The download sits on the Completed block');
    assert.ok(!dueSpan.contains(download), 'The download no longer splits Due date from Completed');
    assert.equal(dueSpan.textContent?.replace(/\s+/g, ''), 'Duedate10/7/2611:59PM', 'The due line is left clean');

    const explanation = doc.querySelector<HTMLAnchorElement>('[data-betterquest-explanation]')!;
    assert.ok(explanation, 'The worked-solutions PDF stays reachable');
    assert.equal(explanation.parentElement, completed, 'It joins the download instead of its own leftover row');
    assert.equal(download.nextElementSibling, explanation);
    assert.match(explanation.textContent || '', /solutions/i);

    features.dispose();
    const restored = doc.querySelector<HTMLAnchorElement>('a[href*="/images/problem_pdf"]')!;
    assert.ok(restored, 'The download link survives dispose');
    assert.equal(restored.hasAttribute('data-betterquest-download'), false, 'Disposing hands the page back to Quest');
    assert.ok(!completed.contains(restored), 'and returns it to its native row');
  } finally { dom.window.close(); }
});

test('the download falls back to the due date when nothing was completed', async () => {
  const dom = new JSDOM(`<html><body class="mdb-skin"><div id="quest-nav-header-div"></div><main id="main-content"><div id="target">
    <div id="info-header-div"><div class="d-flex justify-content-between">
      <div id="due_date_field"><div class="d-flex justify-content-start">
        <div id="due-date-messaging-div" class="d-flex justify-content-start">
          <span id="due_date_span"><div><span class="qlabel">Due date</span><span class="qtext">12/12/26 12:01 AM</span></div></span>
        </div>
      </div></div>
      <div><span class="float-right"></span></div>
    </div></div>
    <div><div class="d-flex justify-content-start"><div><div class="d-flex justify-content-start">
      <div><a href="/student/images/problem_pdf?instance=courseuserassignment_2" target="_blank">PDF Download</a></div>
    </div></div></div></div>
  </div></main></body></html>`, { url: 'https://quest.cns.utexas.edu/student/instances/show?instance=courseuserassignment_2', pretendToBeVisual: true });
  prepare(dom);
  const f = store();
  const features = startPageFeatures(dom.window.document, dom.window as unknown as Window, f.run, f.subscribe);
  try {
    features.reconcile(); await pause();
    const doc = dom.window.document;
    const download = doc.querySelector<HTMLAnchorElement>('[data-betterquest-download]')!;
    const row = doc.querySelector('#due_date_span > div')!;
    assert.equal(download.parentElement, row, 'Without a Completed block the download stays on the due date');
  } finally { features.dispose(); dom.window.close(); }
});

test('the view switch joins the PDF dark/light switch, and stays top right on slides', () => {
  const dom = new JSDOM(`<html><body><main id="main-content"><div id="target">
    <div id="info-header-div"><div class="d-flex justify-content-between">
      <div id="due_date_field"><span id="due_date_span"><span class="qtext">10/7/26 11:59 PM</span></span></div>
      <div class="view-links"><a href="/student/instances/show?instance=1&view=slides">Slides</a><a href="/student/instances/show?instance=1&view=classic">Classic</a></div>
    </div></div>
  </div></main></body></html>`, { url: 'https://quest.cns.utexas.edu/student/instances/show?instance=1' });
  const doc = dom.window.document;
  const header = createAssessmentHeader(doc.querySelector<HTMLElement>('#main-content')!);
  header.reconcile();
  try {
    // Slides mode: no PDF toolbar, so the switch stays at the top right.
    const toggle = doc.querySelector<HTMLElement>('[data-betterquest="view-toggle"]')!;
    assert.equal(toggle.dataset.betterquestViewPlacement, 'header');

    // The interactive PDF toolbar hosts the switch beside the dark/light switch.
    const pdfHost = doc.createElement('section');
    pdfHost.dataset.betterquest = 'interactive-pdf';
    const shadow = pdfHost.attachShadow({ mode: 'open' });
    shadow.innerHTML = '<div class="toolbar"><div class="toolbar-actions">' +
      '<div data-betterquest="view-toggle-slot" style="display:contents"></div>' +
      '<button type="button" class="tool-btn" data-betterquest-pages-toggle="true">Dark pages</button>' +
      '</div></div>';
    doc.querySelector('#target')!.append(pdfHost);

    header.reconcile();
    assert.equal(toggle.dataset.betterquestViewPlacement, 'pdf-toolbar');
    const slot = shadow.querySelector('[data-betterquest="view-toggle-slot"]')!;
    assert.equal(toggle.parentElement, slot, 'The switch lives inside the PDF toolbar');
    const actions = shadow.querySelector('.toolbar-actions')!;
    assert.equal(actions.children[0].getAttribute('data-betterquest'), 'view-toggle-slot');
    assert.equal(actions.children[1].getAttribute('data-betterquest-pages-toggle'), 'true',
      'and sits immediately left of the dark/light switch');
    const headerCss = [...doc.querySelectorAll('style')].map(s => s.textContent || '').join('\n');
    assert.match(headerCss, /background:linear-gradient\(135deg,#8b5cf6,#7c3aed\)!important/, 'The switch is purple');

    // Reconcile again: light-DOM queries cannot see shadow-hosted links, but the
    // purple switch must stay put — never bounce back to Quest's blue buttons.
    header.reconcile();
    header.reconcile();
    assert.equal(toggle.isConnected, true);
    assert.equal(toggle.parentElement, slot, 'Repeated reconciles leave the purple switch in the toolbar');
    assert.equal(doc.querySelector('#info-header-div .view-links a'), null,
      'Native Slides/Classic links are not restored into the header');
    assert.equal(toggle.querySelectorAll('a').length, 2);

    // Quest reinjects a blue Slides control — hide it, keep purple in the toolbar.
    const reinjected = doc.createElement('a');
    reinjected.className = 'btn btn-primary float-right';
    reinjected.href = '/student/instances/show?instance=1&view=slides';
    reinjected.textContent = 'Slides';
    doc.querySelector('#info-header-div .d-flex')!.append(reinjected);
    header.reconcile();
    assert.equal(reinjected.getAttribute('data-betterquest-view-duplicate'), 'true');
    assert.equal(toggle.parentElement, slot);
    assert.equal(doc.getElementById('main-content')?.getAttribute('data-betterquest-view-hosted'), 'true');
    assert.match(
      [...doc.querySelectorAll('style')].map(s => s.textContent || '').join('\n'),
      /data-betterquest-view-hosted="true".*a\.btn-primary/s,
      'CSS hides reinjected blue buttons before the next paint',
    );

    // PDF toolbar slot briefly missing during remount — do not bounce to header.
    slot.remove();
    header.reconcile();
    assert.equal(toggle.isConnected, true);
    assert.ok(shadow.contains(toggle), 'Toggle stays inside the PDF shadow without a slot');
    assert.equal(toggle.parentElement, actions, 'Toggle parks in toolbar-actions until the slot returns');
    assert.equal(toggle.dataset.betterquestViewPlacement, 'pdf-toolbar');
  } finally {
    header.dispose();
    dom.window.close();
  }
});

test('the extra-homework Slides page gets a styled question bar and pager', async () => {
  const dom = new JSDOM(`<html><body class="mdb-skin"><div id="quest-nav-header-div"></div><main id="main-content"><div id="target">
    <div id="info-header-div"><div class="d-flex justify-content-between"><div id="due_date_field"><span id="due_date_span"><span class="qlabel">Due date</span><span class="qtext">12/12/26 12:01 AM</span></span></div></div>
      <div id="upper-paging-div"><div class="d-flex justify-content-end">
        <div><button type="button" class="btn btn-primary" aria-label="Previous slide"><i class="material-icons">navigate_before</i></button></div>
        <div>&nbsp;&nbsp;&nbsp;</div>
        <div class="h5"><br><span class="currentQuestionIndex">11</span><span> of </span><span class="activeElementCount">11</span>&nbsp;</div>
        <div>&nbsp;&nbsp;&nbsp;</div>
        <div><button type="button" class="btn btn-primary" aria-label="Next slide"><i class="material-icons">navigate_next</i></button></div>
      </div></div>
    </div>
    <div id="question-bar-div"><h2 class="questionBar"><span class="currentQuestionIndex">11</span>.
      <span class="elementName">The squeeze (or sandwich) theorem</span><span class="pooledQuestions"></span>
      <span class="itemPoints">10 pts possible</span></h2></div>
    <div class="" id="presentation-div" tabindex="0" role="region" aria-label="Slide content">
      <div class="instanceitempart bg-light"><p>The Sandwich (aka Squeeze) Theorem is very useful.</p></div>
    </div>
  </div></main></body></html>`, { url: 'https://quest.cns.utexas.edu/student/instances/administer?instance=modulesession_1', pretendToBeVisual: true });
  prepare(dom);
  const f = store();
  const features = startPageFeatures(dom.window.document, dom.window as unknown as Window, f.run, f.subscribe);
  try {
    features.reconcile(); await pause();
    const doc = dom.window.document;
    const target = doc.querySelector<HTMLElement>('#target')!;
    assert.equal(target.dataset.betterquestPractice, 'true');

    const bar = doc.querySelector('#upper-paging-div .h5')!;
    const progress = bar.querySelector<HTMLElement>('[data-betterquest="practice-progress"]')!;
    assert.ok(progress, 'The pager shows how far through the set you are');
    assert.equal(progress.firstElementChild?.getAttribute('style')?.includes('width: 100%'), true, 'Last of eleven slides fills the track');

    const css = [...doc.querySelectorAll('style')].map(s => s.textContent || '').join('\n');
    assert.match(css, /#question-bar-div \.questionBar/, 'The question bar is restyled');
    assert.match(css, /#upper-paging-div button\.btn-primary/, 'The pager buttons are restyled');
    assert.equal(doc.querySelector('#question-bar-div .elementName')?.textContent?.trim(), 'The squeeze (or sandwich) theorem', 'Quest owns the title');
    assert.match(doc.querySelector('#presentation-div p')?.textContent || '', /Sandwich/, 'Quest owns the slide body');

    features.dispose();
    assert.equal(target.hasAttribute('data-betterquest-practice'), false);
    assert.equal(doc.querySelector('[data-betterquest="practice-progress"]'), null);
  } finally { dom.window.close(); }
});

test('practice slides drop the orphan period and omit an empty points pill', async () => {
  const dom = new JSDOM(`<html><body class="mdb-skin"><div id="quest-nav-header-div"></div><main id="main-content"><div id="target">
    <div id="info-header-div"><div class="d-flex justify-content-between"><div id="due_date_field"><span id="due_date_span"><span class="qtext">12/12/26 12:01 AM</span></span></div></div>
      <div id="upper-paging-div"><div class="d-flex justify-content-end">
        <div><button type="button" class="btn btn-primary" aria-label="Previous slide"><i class="material-icons">navigate_before</i></button></div>
        <div class="h5"><br><span class="currentQuestionIndex">7</span><span> of </span><span class="activeElementCount">8</span>&nbsp;</div>
        <div><button type="button" class="btn btn-primary" aria-label="Next slide"><i class="material-icons">navigate_next</i></button></div>
      </div></div>
    </div>
    <div id="question-bar-div"><h2 class="questionBar"><span class="currentQuestionIndex">7</span>.
      <span class="elementName">Try New Version (not for credit)</span><span class="pooledQuestions"></span>
      <span class="itemPoints">
      </span></h2></div>
    <div class="" id="presentation-div" tabindex="0" role="region" aria-label="Slide content">
      <div class="instanceitempart bg-light"><button type="button" class="btn btn-primary">Try it</button></div>
    </div>
  </div></main></body></html>`, { url: 'https://quest.cns.utexas.edu/student/instances/administer?instance=modulesession_2', pretendToBeVisual: true });
  prepare(dom);
  const scrolled: number[] = [];
  (dom.window as unknown as { scrollTo: (o: unknown) => void }).scrollTo = o => { scrolled.push((o as { top: number }).top); };
  const f = store();
  const features = startPageFeatures(dom.window.document, dom.window as unknown as Window, f.run, f.subscribe);
  try {
    features.reconcile(); await pause();
    const doc = dom.window.document;
    const bar = doc.querySelector<HTMLElement>('#question-bar-div .questionBar')!;
    assert.equal(bar.textContent?.includes('7.'), false, 'The orphan period after the index pill is gone');
    assert.match(bar.textContent || '', /^7Try New Version/, 'Quest still owns the title');

    const points = doc.querySelector<HTMLElement>('#question-bar-div .itemPoints')!;
    assert.equal(points.textContent?.trim(), '', 'Quest owns the points element and is left untouched');
    assert.equal(points.dataset.betterquestEmpty, 'true', 'Whitespace-only points are marked empty');
    const css = [...doc.querySelectorAll('style')].map(s => s.textContent || '').join('\n');
    assert.match(css, /itemPoints\[data-betterquest-empty="true"\]/, 'A blank points pill is omitted even with whitespace');
    assert.ok(!/\.pooledQuestions \{/.test(css), 'Nothing hides Quest\'s own pooled-questions element');

    // A button Quest put on the slide stays clickable.
    const questButton = doc.querySelector<HTMLButtonElement>('#presentation-div button')!;
    assert.equal(questButton.textContent, 'Try it');
    assert.ok(doc.querySelector('#presentation-div button'), 'Quest slide controls survive');

    // Advancing returns the reader to the top of the new slide.
    doc.querySelector<HTMLButtonElement>('#upper-paging-div button[aria-label="Next slide"]')!.click();
    assert.deepEqual(scrolled, [0], 'Clicking next returns to the top');
    doc.querySelector<HTMLElement>('#question-bar-div')!.click();
    assert.deepEqual(scrolled, [0], 'Clicking elsewhere on the slide does not scroll');
  } finally { features.dispose(); dom.window.close(); }
});

test('interactive PDF choices delegate into the matching native Quest selector without submitting', async () => {
  const dom = new JSDOM(`<html><head></head><body><div id="target"><div id="pdf-frame"><div id="presentation-pdf-frame"><iframe title="Assignment PDF" src="/student/images/download_pdf?instance=courseuserassignment_1"></iframe></div></div>
    <div id="view-responses-table-id"><table id="instance-table-courseuserassignment_1"><tbody><tr data-id="cuaip_1"><td>1.</td><td><select aria-label="Select your response"><option value=""></option><option value="1">1</option><option value="2">2</option><option value="3">3</option></select></td><td></td><td class="previous">0 / 2</td><td></td><td><button aria-label="Submit response">Submit</button></td></tr></tbody></table></div><div id="tally-div">0 out of 10 points (0%)</div></div></body></html>`, {
    url: 'https://quest.cns.utexas.edu/student/instances/show?instance=courseuserassignment_1', pretendToBeVisual: true,
  });
  prepare(dom);
  let choose: ((question: number, option: number) => void) | undefined;
  let submit: ((question: number) => void) | undefined;
  let submitted = 0; dom.window.document.querySelector('button')!.addEventListener('click', () => submitted++);
  const fakeFactory = (container: HTMLElement, options: { optionMaximums: ReadonlyMap<number, number>; onChoose: (question: number, option: number) => void; onSubmit?: (question: number) => void }) => {
    choose = options.onChoose;
    submit = options.onSubmit;
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
    assert.equal(typeof submit, 'function');
    choose!(1, 2); await Promise.resolve();
    assert.equal(dom.window.document.querySelector<HTMLSelectElement>('select')!.value, '2');
    assert.equal(submitted, 0);
    assert.equal(dom.window.document.querySelector<HTMLIFrameElement>('iframe')!.hidden, true);
    submit!(1);
    assert.equal(submitted, 1);
  } finally { workspace.dispose(); dom.window.close(); }
});

test('PDF Confirm delegates to the native form exactly once', async () => {
  const dom = new JSDOM(`<html><body><div id="target"><div id="pdf-frame"><div id="presentation-pdf-frame"><iframe title="Assignment PDF" src="/student/images/download_pdf?instance=courseuserassignment_1"></iframe></div></div>
    <form><div id="view-responses-table-id"><table id="instance-table-courseuserassignment_1"><tbody><tr data-id="cuaip_1"><td>1.</td><td><select aria-label="Select your response"><option value=""></option><option value="1" selected>1</option></select></td><td></td><td class="previous">0 / 2</td><td></td><td><button type="submit" aria-label="Submit response">Submit</button></td></tr></tbody></table></div></form>
  </div></body></html>`, { url: 'https://quest.cns.utexas.edu/student/instances/show?instance=courseuserassignment_1', pretendToBeVisual: true });
  prepare(dom);
  let confirm: ((question: number) => void) | undefined;
  let submissions = 0;
  dom.window.document.querySelector('form')!.addEventListener('submit', event => {
    event.preventDefault();
    submissions += 1;
  });
  const fakeFactory = (container: HTMLElement, options: { onSubmit?: (question: number) => void }) => {
    confirm = options.onSubmit;
    const element = dom.window.document.createElement('section');
    container.append(element);
    return { element, ready: Promise.resolve(true), setSelected() {}, dispose() { element.remove(); } };
  };
  const workspace = (createPdfAssessmentWorkspace as unknown as (root: HTMLElement, options: { createPdfViewer: typeof fakeFactory }) => ReturnType<typeof createPdfAssessmentWorkspace>)(
    dom.window.document.querySelector<HTMLElement>('#target')!, { createPdfViewer: fakeFactory },
  );
  try {
    workspace.reconcile();
    await Promise.resolve();
    confirm!(1);
    assert.equal(submissions, 1);
  } finally {
    workspace.dispose();
    dom.window.close();
  }
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

test('PDF assessment workspace mounts when PDF is provided as a problem_pdf link without a pre-existing iframe', async () => {
  const dom = new JSDOM(`<html><body class="mdb-skin"><div id="quest-nav-header-div"></div><main id="main-content"><div id="target">
    <p>Due date 10/14/26 11:59 PM</p>
    <a href="https://quest.cns.utexas.edu/student/images/problem_pdf?instance=courseuserassignment_319766936">PDF w/o expl</a>
    <div id="view-responses-table-id"><table id="instance-table-courseuserassignment_319766936"><tbody>
      <tr data-id="cuaip_1"><td>1.</td><td><select aria-label="Select your response"><option value="">- select -</option><option value="1">1</option><option value="2">2</option></select></td><td></td><td class="previous">0 / 2</td><td></td><td><button aria-label="Submit response">Submit</button></td></tr>
    </tbody></table></div>
    <div id="tally-div">0 out of 200 points (0%)</div>
    <p>Class Average 85.08 points / 42.54%</p>
    <p>Standard Deviation 68.65</p>
  </div></main></body></html>`, { url: 'https://quest.cns.utexas.edu/student/instances/show?instance=courseuserassignment_319766936', pretendToBeVisual: true });
  prepare(dom);
  const f = store(); const features = startPageFeatures(dom.window.document, dom.window as unknown as Window, f.run, f.subscribe);
  try {
    features.reconcile(); await pause();
    const host = dom.window.document.querySelector<HTMLElement>('[data-betterquest="assessment-rail"]');
    assert.ok(host, 'Assessment rail must mount even when PDF is linked via problem_pdf anchor');
    const shadow = host.shadowRoot!;
    const fullscreenBtn = shadow.querySelector<HTMLButtonElement>('.fullscreen-btn')!;
    assert.ok(fullscreenBtn, 'Full screen button must exist');
    assert.match(shadow.querySelector('.points')!.textContent!, /0 \/ 200 \(0%\)/);
    assert.match(shadow.querySelector('.class-avg')!.textContent!, /85\.08 \/ 42\.54%/);
    assert.match(shadow.querySelector('.std-dev')!.textContent!, /68.65/);
    const pdfFrame = dom.window.document.querySelector<HTMLElement>('#pdf-frame');
    assert.ok(pdfFrame, 'Synthesized PDF frame must be injected');
    const iframe = pdfFrame.querySelector<HTMLIFrameElement>('iframe');
    assert.ok(iframe);
    assert.match(iframe.src, /problem_pdf/);

    // Verify raw native stats are suppressed from the page
    const tally = dom.window.document.querySelector<HTMLElement>('#tally-div');
    assert.equal(tally?.getAttribute('data-betterquest-native-stats'), 'true');
    assert.equal(tally?.style.display, 'none');

    const avgP = [...dom.window.document.querySelectorAll('p')].find(p => /Class Average/i.test(p.textContent || ''));
    assert.ok(avgP);
    assert.equal(avgP.getAttribute('data-betterquest-native-stats'), 'true');
    assert.equal(avgP.style.display, 'none');

    const targetEl = dom.window.document.querySelector<HTMLElement>('#target');
    assert.equal(targetEl?.hasAttribute('data-betterquest-native-stats'), false, '#target must never be suppressed');

    // Verify fullscreen mode toggles state and eliminates rail
    fullscreenBtn.click();
    assert.equal(targetEl?.getAttribute('data-betterquest-fullscreen'), 'true');
    assert.match(fullscreenBtn.textContent!, /Exit full screen/);
    const css = dom.window.document.querySelector('[data-betterquest="assessment-style"]')!.textContent || '';
    assert.match(css, /#pdf-frame\[data-betterquest-pdf-mode="betterquest"\]:fullscreen > :not\(\[data-betterquest="interactive-pdf"\]\)/,
      'Fullscreen hides every non-interactive sibling so a re-seeded native frame cannot swallow taps');
    assert.match(css, /\[data-betterquest-fullscreen="true"\] #pdf-frame\[data-betterquest-pdf-mode="betterquest"\] > :not\(\[data-betterquest="interactive-pdf"\]\)/,
      'The attribute fallback hides those siblings too');

    // Press Escape to exit fullscreen
    dom.window.document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    assert.equal(targetEl?.hasAttribute('data-betterquest-fullscreen'), false);
    assert.match(fullscreenBtn.textContent!, /Full screen/);
  } finally { features.dispose(); dom.window.close(); }
});

test('Slides answer equations and black question images stay on a light paper surface in dark mode', async () => {
  const dom = new JSDOM(`<html><body class="mdb-skin"><div id="quest-nav-header-div"></div><main id="main-content" data-betterquest-theme="dark" style="--bq-surface:#182434;--bq-text:#e7eef8"><div id="target">
    <div id="presentation-div"><div class="row instanceitempart"><div class="bg-light col" id="form-cuaip_1">
      <img class="question-image" alt="Question diagram" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='30'%3E%3Ctext y='20' fill='black'%3EQuestion%3C/text%3E%3C/svg%3E">
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
    assert.equal(dom.window.getComputedStyle(question).backgroundColor, 'rgb(255, 255, 255)');
    assert.equal(dom.window.getComputedStyle(question).color, 'rgb(24, 37, 58)');
    assert.equal(dom.window.getComputedStyle(dom.window.document.querySelector('.question-image')!).filter, 'none');
    assert.equal(dom.window.getComputedStyle(dom.window.document.querySelector('mjx-container')!).color, 'rgb(24, 37, 58)');
  } finally { features.dispose(); dom.window.close(); }
});

test('Slides reveal only the selected question submit and preserve natively hidden submits', async () => {
  const dom = new JSDOM(`<html><head><style>.quest-hidden{display:none}</style></head><body class="mdb-skin"><div id="quest-nav-header-div"></div><main id="main-content"><div id="target"><div id="presentation-div">
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

test('slide submit readiness ignores BetterQuest-managed hiding', () => {
  const dom = new JSDOM('<button id="s">Go</button>');
  const btn = dom.window.document.querySelector('button')!;
  btn.style.visibility = 'hidden';
  assert.equal(isSlideSubmitRevealed(btn), true, 'Our own hide-until-picked must not lock the submit');
  btn.style.visibility = '';
  btn.style.display = 'none';
  assert.equal(isSlideSubmitRevealed(btn), false, 'Quest hiding the submit still counts');
  btn.style.display = '';
  btn.disabled = true;
  assert.equal(isSlideSubmitRevealed(btn), false, 'Disabled submit still counts');
  dom.window.close();
});

test('slide option states cross-fade together without sticky touch hover', () => {
  const dom = new JSDOM(`<html><head></head><body class="mdb-skin"><div id="quest-nav-header-div"></div><main id="main-content"><div id="target"><div id="presentation-div">
    <div class="instanceitempart" id="part-one"><div class="bg-light"><input id="one" type="radio" name="response_one" value="1"><label class="custom-control-label" for="one">One</label></div><button class="submit-btn">Submit one</button></div>
  </div></div></main></body></html>`, { url: 'https://quest.cns.utexas.edu/student/instances/administer?instance=courseuserassignment_1', pretendToBeVisual: true });
  prepare(dom);
  const f = store(); const features = startPageFeatures(dom.window.document, dom.window as unknown as Window, f.run, f.subscribe);
  try {
    features.reconcile();
    const css = dom.window.document.querySelector('[data-betterquest="assessment-style"]')!.textContent!;
    assert.match(css, /background-color \.18s ease/, 'Deselect must fade together instead of flashing');
    assert.match(css, /@media\(hover:hover\) and \(pointer:fine\)/, 'Hover must not stick on touch screens');
    assert.match(css, /linear-gradient\(135deg,#eef2ff/, 'Selected option gets a distinctive fill');
    assert.match(css, /#question-bar-div \.questionBar\{[^}]*background-color:transparent/, 'Question header drops the grey panel');
    assert.match(css, /#question-bar-div \.questionBar\{[^}]*font-weight:800/, 'Question header reads thicker');
  } finally { features.dispose(); dom.window.close(); }
});

test('slides announce wrong and correct verdicts on the picked option', async () => {
  const dom = new JSDOM(`<html><head></head><body class="mdb-skin"><div id="quest-nav-header-div"></div><main id="main-content"><div id="target"><div id="presentation-div">
    <div class="instanceitempart" id="part-one"><div class="bg-light">
      <div class="custom-control custom-radio instanceitempart-choice"><div class="d-flex justify-content-start"><input id="one" type="radio" name="response_one" value="1"><label class="custom-control-label" for="one">One</label></div></div>
      <div class="custom-control custom-radio instanceitempart-choice"><div class="d-flex justify-content-start"><input id="two" type="radio" name="response_one" value="2"><label class="custom-control-label" for="two">Two</label></div></div>
    </div>
    <div class="row instanceitempart-feedback"><div class="text-center feedback d-none" role="status" aria-live="polite"><i class="feedback_img feedback_img_wrong d-none material-icons text-danger">clear</i><i class="feedback_img feedback_img_right d-none material-icons text-success">check</i><span class="feedback_msg"></span></div></div>
    <div class="row instanceitempart-controls"><button class="submit-btn">Submit</button></div></div>
  </div></div></main></body></html>`, { url: 'https://quest.cns.utexas.edu/student/instances/administer?instance=courseuserassignment_1', pretendToBeVisual: true });
  prepare(dom);
  const f = store(); const features = startPageFeatures(dom.window.document, dom.window as unknown as Window, f.run, f.subscribe);
  try {
    features.reconcile(); await pause();
    const doc = dom.window.document;
    const part = doc.querySelector<HTMLElement>('#part-one')!;
    const radio = doc.querySelector<HTMLInputElement>('#two')!;
    radio.checked = true;
    radio.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    await pause();
    assert.equal(part.hasAttribute('data-betterquest-verdict'), false, 'No verdict before Quest responds');
    const feedback = part.querySelector<HTMLElement>('.feedback')!;
    const wrongIcon = part.querySelector<HTMLElement>('.feedback_img_wrong')!;
    const rightIcon = part.querySelector<HTMLElement>('.feedback_img_right')!;
    feedback.classList.remove('d-none');
    wrongIcon.classList.remove('d-none');
    part.querySelector('.feedback_msg')!.textContent = 'Incorrect';
    await pause();
    assert.equal(part.dataset.betterquestVerdict, 'wrong');
    assert.equal(doc.querySelectorAll('.bq-slide-verdict').length, 1);
    assert.match(doc.querySelector('.bq-slide-verdict')!.textContent || '', /Incorrect/);
    assert.equal(doc.querySelector('.bq-celebration'), null, 'Wrong answers do not celebrate');
    assert.ok(doc.querySelector('.bq-screen-flash'), 'Wrong verdicts flash the whole screen red');
    wrongIcon.classList.add('d-none');
    rightIcon.classList.remove('d-none');
    part.querySelector('.feedback_msg')!.textContent = 'Correct';
    await pause();
    assert.equal(part.dataset.betterquestVerdict, 'correct');
    assert.equal(doc.querySelectorAll('.bq-slide-verdict').length, 1, 'Only one verdict shows at a time');
    assert.match(doc.querySelector('.bq-slide-verdict')!.textContent || '', /Correct/);
    const party = doc.querySelector<HTMLElement>('.bq-celebration');
    assert.ok(party, 'Correct verdict turns the whole screen green with a checkmark');
    assert.equal(party!.style.position, 'fixed', 'The green wash covers the viewport with inline styles');
    assert.match(party!.textContent || '', /✓/, 'The big checkmark rides along');
    feedback.classList.add('d-none');
    await pause();
    assert.equal(part.hasAttribute('data-betterquest-verdict'), false, 'Verdict clears with the feedback');
    const css = doc.querySelector('[data-betterquest="assessment-style"]')!.textContent!;
    assert.match(css, /data-betterquest-verdict="correct"/, 'Correct answers get a checkmark style');
    assert.match(css, /data-betterquest-verdict="wrong"/, 'Wrong answers get strikethrough and X styles');
    assert.match(css, /bq-correct-pop/, 'Correct answers pop');
  } finally { features.dispose(); dom.window.close(); }
});

test('the console party trigger works on slides pages too', async () => {
  const dom = new JSDOM(`<html><head></head><body class="mdb-skin"><div id="quest-nav-header-div"></div><main id="main-content"><div id="target"><div id="presentation-div">
    <div class="instanceitempart" id="part-one"><div class="bg-light">
      <div class="custom-control custom-radio instanceitempart-choice"><div class="d-flex justify-content-start"><input id="one" type="radio" name="response_one" value="1"><label class="custom-control-label" for="one">One</label></div></div>
    </div>
    <div class="row instanceitempart-controls"><button class="submit-btn">Submit</button></div></div>
  </div></div></main></body></html>`, { url: 'https://quest.cns.utexas.edu/student/instances/administer?instance=courseuserassignment_1', pretendToBeVisual: true });
  prepare(dom);
  const f = store(); const features = startPageFeatures(dom.window.document, dom.window as unknown as Window, f.run, f.subscribe);
  try {
    features.reconcile(); await pause();
    const doc = dom.window.document;
    const before = doc.querySelectorAll('.bq-celebration').length;
    doc.dispatchEvent(new dom.window.Event('betterquest:party'));
    assert.equal(doc.querySelectorAll('.bq-celebration').length, before + 1, 'Console event shows the celebration on slides');
    doc.dispatchEvent(new dom.window.CustomEvent('betterquest:party', { detail: 'wrong' }));
    assert.ok(doc.querySelector('.bq-screen-flash'), 'Console event flashes red on slides');
    features.dispose();
    const after = doc.querySelectorAll('.bq-celebration').length;
    doc.dispatchEvent(new dom.window.Event('betterquest:party'));
    assert.equal(doc.querySelectorAll('.bq-celebration').length, after, 'A disposed page stops listening');
  } finally { features.dispose(); dom.window.close(); }
});

test('slides show assignment metrics under each question when available', async () => {
  const dom = new JSDOM(`<html><head></head><body class="mdb-skin"><div id="quest-nav-header-div"></div><main id="main-content"><div id="target"><div id="presentation-div">
    <div class="instanceitempart" id="part-one"><div class="bg-light"><input id="one" type="radio" name="response_one" value="1"><label class="custom-control-label" for="one">One</label></div><button class="submit-btn">Submit one</button></div>
  </div><p>Class Average 84.69 points</p><p>Standard Deviation 65.97</p></div></main></body></html>`, { url: 'https://quest.cns.utexas.edu/student/instances/administer?instance=courseuserassignment_1', pretendToBeVisual: true });
  prepare(dom);
  const f = store(); const features = startPageFeatures(dom.window.document, dom.window as unknown as Window, f.run, f.subscribe);
  try {
    features.reconcile(); await pause();
    const bar = dom.window.document.querySelector<HTMLElement>('#part-one > .bq-slide-metrics');
    assert.ok(bar, 'Metrics strip appears under the question');
    assert.match(bar!.textContent || '', /Class Average/);
    assert.match(bar!.textContent || '', /84\.69/);
    assert.doesNotMatch(bar!.textContent || '', /Your Score/, 'Unavailable metrics stay out');
    features.dispose();
    assert.equal(dom.window.document.querySelector('.bq-slide-metrics'), null, 'Dispose removes the strip');
  } finally { features.dispose(); dom.window.close(); }
});

test('slides skip the metrics strip when Quest exposes nothing', async () => {
  const dom = new JSDOM(`<html><head></head><body class="mdb-skin"><div id="quest-nav-header-div"></div><main id="main-content"><div id="target"><div id="presentation-div">
    <div class="instanceitempart" id="part-one"><div class="bg-light"><input id="one" type="radio" name="response_one" value="1"><label class="custom-control-label" for="one">One</label></div><button class="submit-btn">Submit one</button></div>
  </div></div></main></body></html>`, { url: 'https://quest.cns.utexas.edu/student/instances/administer?instance=courseuserassignment_1', pretendToBeVisual: true });
  prepare(dom);
  const f = store(); const features = startPageFeatures(dom.window.document, dom.window as unknown as Window, f.run, f.subscribe);
  try {
    features.reconcile(); await pause();
    assert.equal(dom.window.document.querySelector('.bq-slide-metrics'), null, 'No strip of unavailable metrics');
  } finally { features.dispose(); dom.window.close(); }
});

test('slides move the submit beside the selected option', async () => {
  const dom = new JSDOM(`<html><head></head><body class="mdb-skin"><div id="quest-nav-header-div"></div><main id="main-content"><div id="target"><div id="presentation-div">
    <div class="instanceitempart" id="part-one"><div class="bg-light">
      <div class="custom-control custom-radio instanceitempart-choice"><div class="d-flex justify-content-start"><input id="one" type="radio" name="response_one" value="1"><label class="custom-control-label" for="one">One</label></div></div>
      <div class="custom-control custom-radio instanceitempart-choice"><div class="d-flex justify-content-start"><input id="two" type="radio" name="response_one" value="2"><label class="custom-control-label" for="two">Two</label></div></div>
    </div><div class="row instanceitempart-controls"><button class="submit-btn">Submit one</button></div></div>
  </div></div></main></body></html>`, { url: 'https://quest.cns.utexas.edu/student/instances/administer?instance=courseuserassignment_1', pretendToBeVisual: true });
  prepare(dom);
  const f = store(); const features = startPageFeatures(dom.window.document, dom.window as unknown as Window, f.run, f.subscribe);
  try {
    features.reconcile(); await pause();
    const submit = dom.window.document.querySelector<HTMLButtonElement>('.submit-btn')!;
    const controls = dom.window.document.querySelector<HTMLElement>('.instanceitempart-controls')!;
    assert.equal(submit.parentElement, controls, 'Submit starts in the native controls row');
    const radio = dom.window.document.querySelector<HTMLInputElement>('#two')!;
    radio.checked = true;
    radio.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    await pause();
    const option = radio.closest<HTMLElement>('.custom-control')!;
    assert.ok(option.contains(submit), 'Submit moves beside the selected option');
    const row = option.querySelector<HTMLElement>('.d-flex')!;
    assert.equal(submit.parentElement, row, 'Submit sits in the option row, directly beside the answer');
    const css = dom.window.document.querySelector('[data-betterquest="assessment-style"]')!.textContent || '';
    assert.match(css, /\.d-flex > \.submit-btn\{[^}]*margin-left:12px/, 'Submit hugs the answer box instead of drifting to the far edge');
    features.dispose();
    assert.equal(submit.parentElement, controls, 'Dispose restores the native position');
  } finally { features.dispose(); dom.window.close(); }
});

test('slides keep working after Quest replaces the slide HTML post-submit', async () => {
  const dom = new JSDOM(`<html><head></head><body class="mdb-skin"><div id="quest-nav-header-div"></div><main id="main-content"><div id="target"><div id="presentation-div">
    <div class="instanceitempart" id="part-one"><div class="bg-light"><input id="one" type="radio" name="response_one" value="1"><label class="custom-control-label" for="one">One</label></div><button class="submit-btn">Submit one</button></div>
  </div></div></main></body></html>`, { url: 'https://quest.cns.utexas.edu/student/instances/administer?instance=courseuserassignment_1', pretendToBeVisual: true });
  prepare(dom);
  const f = store(); const features = startPageFeatures(dom.window.document, dom.window as unknown as Window, f.run, f.subscribe);
  try {
    features.reconcile(); await pause();
    const presentation = dom.window.document.querySelector<HTMLElement>('#presentation-div')!;
    // Quest swaps the slide content after a submit (right or wrong).
    presentation.replaceChildren();
    presentation.innerHTML = `<div class="instanceitempart" id="part-two"><div class="bg-light"><input id="two" type="radio" name="response_two" value="1"><label class="custom-control-label" for="two">Two</label></div><button class="submit-btn">Submit two</button></div>`;
    features.reconcile(); await pause();
    const part = dom.window.document.querySelector<HTMLElement>('#part-two')!;
    assert.equal(part.dataset.betterquestQuestionReady, 'false');
    const radio = part.querySelector<HTMLInputElement>('input')!;
    radio.checked = true;
    radio.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    await pause();
    assert.equal(part.dataset.betterquestQuestionReady, 'true', 'Re-rendered slides must reveal their submit once answered');
  } finally { features.dispose(); dom.window.close(); }
});

test('moving from options to suboptions keeps modal open and closes 250ms after cursor leave', async () => {
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

    // 4. Move cursor off flyout entirely into empty space: stays open through the
    // 250ms grace period, then closes
    flyout.dispatchEvent(new dom.window.Event('pointerleave'));

    await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(menuHost.hidden, false, 'Modal should stay open during the 250ms grace period');
    assert.equal(flyout.hidden, false, 'Flyout should stay open during the 250ms grace period');
    await new Promise(resolve => setTimeout(resolve, 400));
    assert.equal(menuHost.hidden, true, 'Modal should close after the 250ms grace period');
    assert.equal(flyout.hidden, true, 'Flyout should close after the 250ms grace period');
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
    const switchLabels = [...bqMenu.querySelectorAll('label')].map(l => l.querySelector('span')?.childNodes[0]?.textContent?.trim());
    assert.ok(switchLabels.includes('Whimsy mode'), 'Whimsy mode toggle is present');
    assert.ok(switchLabels.includes('Animations'), 'Animations toggle is present');
    assert.ok(!switchLabels.includes('Answer celebrations'), 'Answer celebrations toggle is removed');
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

test('feature:set successfully updates assignments and bookmarks features in repository', async () => {
  const dom = new JSDOM('<html><body></body></html>', { pretendToBeVisual: true });
  prepare(dom);
  const f = store();
  const res1 = await f.run({ kind: 'feature:set', feature: 'assignments', enabled: false });
  assert.equal(res1.preferences.features?.assignments, false);
  assert.equal(res1.preferences.features?.bookmarks, true);
  assert.equal(res1.preferences.features?.animations, true);

  const res2 = await f.run({ kind: 'feature:set', feature: 'bookmarks', enabled: false });
  assert.equal(res2.preferences.features?.assignments, false);
  assert.equal(res2.preferences.features?.bookmarks, false);
  assert.equal(res2.preferences.features?.animations, true);

  const res3 = await f.run({ kind: 'feature:set', feature: 'animations', enabled: false });
  assert.equal(res3.preferences.features?.assignments, false);
  assert.equal(res3.preferences.features?.bookmarks, false);
  assert.equal(res3.preferences.features?.animations, false);

  const res4 = await f.run({ kind: 'feature:set', feature: 'assignments', enabled: true });
  assert.equal(res4.preferences.features?.assignments, true);
  assert.equal(res4.preferences.features?.bookmarks, false);
  assert.equal(res4.preferences.features?.animations, false);

  const res5 = await f.run({ kind: 'feature:set', feature: 'celebrations', enabled: false });
  assert.equal(res5.preferences.features?.celebrations, false);
  assert.equal(res5.preferences.features?.assignments, true);

  const res6 = await f.run({ kind: 'feature:set', feature: 'celebrations', enabled: true });
  assert.equal(res6.preferences.features?.celebrations, true);

  const res7 = await f.run({ kind: 'feature:set', feature: 'whimsy', enabled: true });
  assert.equal(res7.preferences.features?.whimsy, true);

  const res8 = await f.run({ kind: 'feature:set', feature: 'whimsy', enabled: false });
  assert.equal(res8.preferences.features?.whimsy, false);
});

test('grades and review pages make all text white in dark mode and black in light mode', async () => {
  const dom = new JSDOM(`<html><body id="body-id" class="mdb-skin">
    <div id="quest-nav-header-div"></div>
    <div id="main-content">
      <ul class="nav nav-tabs md-tabs" id="panel-tabs">
        <li class="nav-item"><a id="student-elements-a" class="nav-link" href="#tabs-elements">Assignments</a></li>
        <li class="nav-item"><a id="student-grades-a" class="nav-link active" href="#tabs-grades">Grades</a></li>
        <li class="nav-item"><a id="student-review-a" class="nav-link" href="#tabs-review">Review</a></li>
      </ul>
      <div class="tab-content card" id="info-tab-data">
        <div id="tabs-grades" class="tab-pane fade show active">
          <table id="grades-table" class="table">
            <thead><tr><th>Assignment</th><th>Grade</th></tr></thead>
            <tbody><tr><td><a href="#hw1">Homework 1</a></td><td><span class="score">95%</span></td></tr></tbody>
          </table>
        </div>
        <div id="tabs-review" class="tab-pane fade">
          <table id="review-table" class="table">
            <thead><tr><th>Review Item</th></tr></thead>
            <tbody><tr><td>Review 1</td></tr></tbody>
          </table>
        </div>
      </div>
    </div>
  </body></html>`, { url: 'https://quest.cns.utexas.edu/student/courses/show?course=123', pretendToBeVisual: true });
  prepare(dom);

  const theme = createQuestTheme(dom.window.document, dom.window as unknown as Window);
  try {
    // 1. Dark Mode
    theme.update('dark');
    theme.reconcile();
    const main = dom.window.document.querySelector<HTMLElement>('#main-content')!;
    const body = dom.window.document.querySelector<HTMLElement>('#body-id')!;
    assert.equal(main.getAttribute('data-betterquest-theme'), 'dark');
    assert.equal(main.getAttribute('data-betterquest-page'), 'grades');
    assert.equal(body.getAttribute('data-betterquest-page'), 'grades');

    // 2. Light Mode
    theme.update('light');
    theme.reconcile();
    assert.equal(main.getAttribute('data-betterquest-theme'), 'light');
    assert.equal(main.getAttribute('data-betterquest-page'), 'grades');

    // Verify QUEST_DARK_STYLES contains the white/black rules
    const styleEl = dom.window.document.querySelector<HTMLStyleElement>('[data-betterquest="theme-styles"]');
    assert.ok(styleEl);
    assert.match(styleEl.textContent!, /GRADES & REVIEW PAGES — DARK MODE: ALL TEXT WHITE/);
    assert.match(styleEl.textContent!, /GRADES & REVIEW PAGES — LIGHT MODE: ALL TEXT BLACK/);
    assert.match(styleEl.textContent!, /#tabs-grades/);
    assert.match(styleEl.textContent!, /#tabs-review/);
  } finally {
    theme.dispose();
    dom.window.close();
  }
});

test('slides view stays light even when the preferred theme is dark', () => {
  const dom = new JSDOM(`<html><body class="mdb-skin" id="body-id"><div id="quest-nav-header-div"></div>
    <main id="main-content"><div id="target">
      <div id="presentation-div"><div class="instanceitempart"><label><input type="radio" name="response_1" value="1">1</label>
        <button type="button" class="submit-btn">Submit</button></div></div>
    </div></main></body></html>`, {
    url: 'https://quest.cns.utexas.edu/student/instances/show?instance=1&view=slides',
    pretendToBeVisual: true,
  });
  prepare(dom);
  const theme = createQuestTheme(dom.window.document, dom.window as unknown as Window);
  try {
    theme.update('dark');
    theme.reconcile();
    const main = dom.window.document.querySelector<HTMLElement>('#main-content')!;
    const nav = dom.window.document.querySelector<HTMLElement>('#quest-nav-header-div')!;
    const body = dom.window.document.querySelector<HTMLElement>('#body-id')!;
    assert.equal(main.getAttribute('data-betterquest-theme'), 'light',
      'Slides keep a light page; dark mode is for the PDF/classic workspace');
    assert.equal(nav.getAttribute('data-betterquest-theme'), 'light');
    assert.equal(body.getAttribute('data-betterquest-theme'), 'light');
    assert.equal(main.style.getPropertyValue('--bq-surface').trim(), '#ffffff',
      'Slides must not keep dark CSS tokens from the preference');
  } finally {
    theme.dispose();
    dom.window.close();
  }
});

test('additional/practice HW pages stay light when the preferred theme is dark', () => {
  const dom = new JSDOM(`<html><body class="mdb-skin" id="body-id"><div id="quest-nav-header-div"></div>
    <main id="main-content"><div id="target">
      <div id="question-bar-div"><h2 class="questionBar"><span class="currentQuestionIndex">1</span>.
        <span class="elementName">Practice topic</span></h2></div>
      <div id="presentation-div"><div class="instanceitempart bg-light"><p>Read this.</p></div></div>
    </div></main></body></html>`, {
    url: 'https://quest.cns.utexas.edu/student/instances/administer?instance=modulesession_1',
    pretendToBeVisual: true,
  });
  prepare(dom);
  const theme = createQuestTheme(dom.window.document, dom.window as unknown as Window);
  try {
    theme.update('dark');
    theme.reconcile();
    const main = dom.window.document.querySelector<HTMLElement>('#main-content')!;
    assert.equal(main.getAttribute('data-betterquest-theme'), 'light');
    assert.equal(main.style.getPropertyValue('--bq-surface').trim(), '#ffffff');
    assert.equal(dom.window.document.querySelector('#body-id')?.getAttribute('data-betterquest-theme'), 'light');
  } finally {
    theme.dispose();
    dom.window.close();
  }
});

test('PDF classic homework still gets dark mode when preferred', () => {
  const dom = new JSDOM(`<html><body class="mdb-skin" id="body-id"><div id="quest-nav-header-div"></div>
    <main id="main-content"><div id="target">
      <div id="pdf-frame"><div id="presentation-pdf-frame">
        <iframe title="Assignment PDF" src="/student/images/problem_pdf?instance=1"></iframe>
      </div></div>
      <div id="view-responses-table-id"><table id="instance-table-courseuserassignment_1"><tbody>
        <tr data-id="cuaip_1"><td>1.</td><td class="input">3</td><td class="status"><span class="sr-only">Correct</span></td>
        <td class="previous">1 / 4</td><td class="correct">10</td><td></td></tr>
      </tbody></table></div>
    </div></main></body></html>`, {
    url: 'https://quest.cns.utexas.edu/student/instances/show?instance=1',
    pretendToBeVisual: true,
  });
  prepare(dom);
  const theme = createQuestTheme(dom.window.document, dom.window as unknown as Window);
  try {
    theme.update('dark');
    theme.reconcile();
    assert.equal(dom.window.document.querySelector('#main-content')?.getAttribute('data-betterquest-theme'), 'dark');
    assert.equal(
      dom.window.document.querySelector<HTMLElement>('#main-content')!.style.getPropertyValue('--bq-surface').trim(),
      '#182434',
    );
  } finally {
    theme.dispose();
    dom.window.close();
  }
});

test('detectPageCategory recognizes grades and review from urls, active tabs, and assessment headers', () => {
  const dom1 = new JSDOM('<html><body><div id="tabs-grades" class="tab-pane active"></div></body></html>', {
    url: 'https://quest.cns.utexas.edu/student/courses/show?course=54321',
  });
  assert.equal(detectPageCategory(dom1.window.document), 'grades');

  const dom2 = new JSDOM('<html><body><h1>ASSESSMENT — Review</h1></body></html>', {
    url: 'https://quest.cns.utexas.edu/student/instances/show?instance=123',
  });
  assert.equal(detectPageCategory(dom2.window.document), 'review');

  const dom3 = new JSDOM('<html><body><h1>Homework 1</h1></body></html>', {
    url: 'https://quest.cns.utexas.edu/student/instances/show?instance=123',
  });
  assert.equal(detectPageCategory(dom3.window.document), null);
});

test('formatMeetingTime converts TTH 330-500 to Tuesday/Thursday 3:30 PM - 5:00 PM', () => {
  const result = formatMeetingTime('TTH 330-500');
  assert.ok(result);
  assert.equal(result.days, 'Tuesday/Thursday');
  assert.equal(result.time, '3:30 PM - 5:00 PM');
  assert.equal(result.formatted, 'Tuesday/Thursday 3:30 PM - 5:00 PM');

  const mwf = formatMeetingTime('MWF 1000-1100');
  assert.equal(mwf?.formatted, 'Monday/Wednesday/Friday 10:00 AM - 11:00 AM');

  const mw = formatMeetingTime('MW 100-230');
  assert.equal(mw?.formatted, 'Monday/Wednesday 1:00 PM - 2:30 PM');

  const th = formatMeetingTime('TH 330-500');
  assert.equal(th?.formatted, 'Thursday 3:30 PM - 5:00 PM');
});

test('createMeetingTimesEnhancer formats meeting time cell in courses table and cleans up on dispose', () => {
  const dom = new JSDOM(`<html><body>
    <table id="courses-table">
      <thead>
        <tr>
          <th>Course</th>
          <th>Name</th>
          <th>Unique</th>
          <th>Instructor</th>
          <th>Meeting Time</th>
          <th>Next Quest Assignment Due</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>M 408C</td>
          <td>DIFFEREN AND INTEGRAL CALCULUS</td>
          <td>58360</td>
          <td>Reyes</td>
          <td>TTH 330-500</td>
          <td>10/14/2026 at 11:59pm</td>
        </tr>
      </tbody>
    </table>
  </body></html>`);

  const table = dom.window.document.querySelector<HTMLTableElement>('#courses-table')!;
  const enhancer = createMeetingTimesEnhancer(table);

  const cell = table.querySelector('tbody tr td:nth-child(5)')!;
  assert.equal(cell.textContent?.trim(), 'Tuesday/Thursday 3:30 PM - 5:00 PM');

  const badge = cell.querySelector('[data-betterquest="meeting-time"]')!;
  assert.ok(badge);
  assert.equal(badge.querySelector('.bq-meeting-days')?.textContent, 'Tuesday/Thursday');
  assert.equal(badge.querySelector('.bq-meeting-hours')?.textContent, '3:30 PM - 5:00 PM');

  enhancer.dispose();
  assert.equal(cell.textContent?.trim(), 'TTH 330-500');
});

test('createCoursesTableCleaner strips DataTables sorting and filter indicators from courses table headers', () => {
  const dom = new JSDOM(`<html><body>
    <div id="courses-table_wrapper" class="dataTables_wrapper">
      <div class="row">
        <div class="col-sm-12 col-md-6"><div class="dataTables_length"><select></select></div></div>
        <div class="col-sm-12 col-md-6"><div class="dataTables_filter"><input type="search"></div></div>
      </div>
      <div class="row">
        <div class="col-sm-12">
          <table id="courses-table" class="dataTable">
            <thead>
              <tr role="row">
                <th class="sorting_asc" tabindex="0" aria-sort="ascending" aria-label="Course: activate to sort column descending">Course</th>
                <th class="sorting" tabindex="0" aria-label="Name: activate to sort column ascending">Name</th>
                <th class="sorting" tabindex="0" aria-label="Unique: activate to sort column ascending">Unique</th>
                <th class="sorting" tabindex="0" aria-label="Instructor: activate to sort column ascending">Instructor</th>
                <th class="sorting" tabindex="0" aria-label="Meeting Time: activate to sort column ascending">Meeting Time</th>
                <th class="sorting" tabindex="0" aria-label="Next Quest Assignment Due: activate to sort column ascending">Next Quest Assignment Due</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>M 408C</td>
                <td>CALCULUS</td>
                <td>58360</td>
                <td>Reyes</td>
                <td>TTH 330-500</td>
                <td>10/14/2026</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </body></html>`);

  const table = dom.window.document.querySelector<HTMLTableElement>('#courses-table')!;
  const cleaner = createCoursesTableCleaner(table);

  const headers = [...table.querySelectorAll<HTMLTableCellElement>('thead th')];
  assert.equal(headers.length, 6);

  for (const th of headers) {
    assert.equal(th.classList.contains('sorting'), false);
    assert.equal(th.classList.contains('sorting_asc'), false);
    assert.equal(th.classList.contains('sorting_desc'), false);
    assert.equal(th.classList.contains('sorting_disabled'), true);
    assert.equal(th.hasAttribute('tabindex'), false);
    assert.equal(th.hasAttribute('aria-sort'), false);
    assert.doesNotMatch(th.getAttribute('aria-label') || '', /activate to sort/i);
    assert.equal(th.style.cursor, 'default');
    assert.equal(th.style.pointerEvents, 'none');
  }

  // Check wrapper controls are hidden
  const wrapper = dom.window.document.querySelector<HTMLElement>('#courses-table_wrapper')!;
  const filter = wrapper.querySelector<HTMLElement>('.dataTables_filter')!;
  const length = wrapper.querySelector<HTMLElement>('.dataTables_length')!;
  assert.equal(filter.style.display, 'none');
  assert.equal(length.style.display, 'none');

  // Verify sort clicks are intercepted
  let clicked = false;
  headers[0].addEventListener('click', () => { clicked = true; });
  const event = new dom.window.MouseEvent('click', { bubbles: true, cancelable: true });
  headers[0].dispatchEvent(event);
  assert.equal(event.defaultPrevented, true);
  assert.equal(clicked, false);

  cleaner.dispose();
});

test('theme CSS suppresses DataTables sort arrows and filter controls on courses table', () => {
  assert.match(QUEST_DARK_STYLES, /#courses-table thead th[\s\S]*cursor:\s*default !important/);
  assert.match(QUEST_DARK_STYLES, /#courses-table thead th[\s\S]*pointer-events:\s*none !important/);
  assert.match(QUEST_DARK_STYLES, /#courses-table thead th::before[\s\S]*display:\s*none !important/);
  assert.match(QUEST_DARK_STYLES, /#courses-table_wrapper :is\(\.dataTables_filter/);
});

test('enhanceCourseInfoCard formats instructor contact, meeting schedule, and location without deleting columns', () => {
  const dom = new JSDOM(`<html><body>
    <div id="target">
      <div class="card">
        <div class="card-header text-center">
          <button type="button" class="btn btn-link" data-toggle="collapse" data-target="#student-course-info-header" aria-expanded="true">
            <span class="h4">DIFFEREN AND INTEGRAL CALCULUS (58355)</span>
          </button>
        </div>
        <div class="collapse show" id="student-course-info-header">
          <div class="row text-center">
            <div class="col">
              <div class="qlabel">Instructor</div>
              <div>Nicolas Reyes</div>
              &nbsp;&nbsp;
              <a href="mailto:nreyes@math.utexas.edu?subject=Student%20question">contact</a>
            </div>
            <div class="col">
              <div class="qlabel">Meets</div>
              <div>TTH 330-500</div>
              <br>in PMA 4.102
            </div>
            <div class="col">
              <div data-betterquest="assignment-section"></div>
            </div>
            <div class="col">
            </div>
          </div>
        </div>
      </div>
    </div>
  </body></html>`);

  const root = dom.window.document.querySelector<HTMLElement>('#target')!;
  enhanceCourseInfoCard(root);

  const columns = [...dom.window.document.querySelectorAll<HTMLElement>('#student-course-info-header > .row > .col')];
  assert.equal(columns.length, 4, 'Must preserve all 4 native columns in DOM');

  // Instructor column
  assert.ok(columns[0].classList.contains('bq-col-instructor'));
  const mailLink = columns[0].querySelector<HTMLAnchorElement>('a[href^="mailto:"]')!;
  assert.ok(mailLink.classList.contains('bq-contact-btn'));
  assert.ok(mailLink.querySelector('svg'));
  assert.match(mailLink.textContent || '', /Email Instructor/i);

  // Meets column
  assert.ok(columns[1].classList.contains('bq-col-meets'));
  const time = columns[1].querySelector<HTMLElement>('.bq-meeting-time')!;
  assert.ok(time);
  assert.equal(time.querySelector('.bq-meeting-days')?.textContent, 'Tuesday/Thursday');
  assert.equal(time.querySelector('.bq-meeting-hours')?.textContent, '3:30 PM - 5:00 PM');

  const loc = columns[1].querySelector<HTMLElement>('.bq-course-location')!;
  assert.ok(loc);
  assert.ok(loc.querySelector('svg'));
  assert.equal(loc.querySelector('span')?.textContent, 'PMA 4.102');

  // Upcoming & Empty columns
  assert.ok(columns[2].classList.contains('bq-col-upcoming'));
  assert.ok(columns[3].classList.contains('bq-col-empty'));
});

test('a repeated course info pass changes nothing, so features stop re-reading their own writes', async () => {
  const dom = new JSDOM(`<html><body>
    <div id="target">
      <div class="card">
        <div class="collapse show" id="student-course-info-header">
          <div class="row text-center">
            <div class="col">
              <div class="qlabel">Instructor</div>
              <div>Nicolas Reyes</div>
              <a href="mailto:nreyes@math.utexas.edu">contact</a>
            </div>
            <div class="col">
              <div class="qlabel">Meets</div>
              <div>TTH 330-500</div>
              <br>in PMA 4.102
            </div>
            <div class="col"></div>
            <div class="col"></div>
          </div>
        </div>
      </div>
    </div>
  </body></html>`, { pretendToBeVisual: true });
  const doc = dom.window.document;
  const root = doc.querySelector<HTMLElement>('#target')!;
  try {
    enhanceCourseInfoCard(root);
    const seen: string[] = [];
    const observer = new dom.window.MutationObserver(records => seen.push(...records.map(record => `${record.type}:${(record.target as Element).className}`)));
    observer.observe(doc.querySelector('#student-course-info-header')!, {
      subtree: true, attributes: true, attributeFilter: ['class'], childList: true, characterData: true,
    });
    // Repeating the pass must be a no-op. Otherwise every pass trips the feature observers,
    // which redraw, which trips the observers again and nothing else on the page ever updates.
    enhanceCourseInfoCard(root);
    enhanceCourseInfoCard(root);
    await pause();
    assert.deepEqual(seen, [], 'A repeated course info pass must not rewrite the DOM');
  } finally { dom.window.close(); }
});

test('collapseCourseCategoriesByDefault collapses all assignment categories by default and respects user expansion', () => {
  const dom = new JSDOM(`<html><body>
    <div id="target">
      <div id="tabs-elements">
        <div class="card-header text-center">
          <button type="button" class="btn btn-link" data-toggle="collapse" data-target="#header-101" aria-expanded="true">
            <span class="h4">Homework</span>
            <i class="material-icons dropdown-icon">remove</i>
          </button>
        </div>
        <div class="collapse show" id="header-101">
          <table><tr><td>HW 1</td></tr></table>
        </div>

        <div class="card-header text-center">
          <button type="button" class="btn btn-link" data-toggle="collapse" data-target="#header-102" aria-expanded="true">
            <span class="h4">Exams</span>
            <i class="material-icons dropdown-icon">remove</i>
          </button>
        </div>
        <div class="collapse show" id="header-102">
          <table><tr><td>Exam 1</td></tr></table>
        </div>
      </div>
    </div>
  </body></html>`);

  const doc = dom.window.document;
  collapseCourseCategoriesByDefault(doc);

  const hw = doc.querySelector<HTMLElement>('#header-101')!;
  const exams = doc.querySelector<HTMLElement>('#header-102')!;
  const hwBtn = doc.querySelector<HTMLButtonElement>('button[data-target="#header-101"]')!;
  const examsBtn = doc.querySelector<HTMLButtonElement>('button[data-target="#header-102"]')!;

  // Both categories collapsed by default
  assert.equal(hw.classList.contains('show'), false);
  assert.equal(exams.classList.contains('show'), false);
  assert.equal(hwBtn.getAttribute('aria-expanded'), 'false');
  assert.equal(examsBtn.getAttribute('aria-expanded'), 'false');
  assert.ok(hwBtn.classList.contains('collapsed'));
  assert.ok(examsBtn.classList.contains('collapsed'));
  assert.equal(hwBtn.querySelector('.material-icons')?.textContent, 'add');

  // Quest re-opens a category by itself (tab visits, re-renders). It is not a student choice.
  hw.classList.add('show');
  hwBtn.classList.remove('collapsed');
  hwBtn.setAttribute('aria-expanded', 'true');
  collapseCourseCategoriesByDefault(doc);
  assert.equal(hw.classList.contains('show'), false, 'A category Quest re-opens collapses again');
  assert.equal(hwBtn.getAttribute('aria-expanded'), 'false');

  // A mid-animation Bootstrap panel with a stuck inline height must be cleared,
  // or the Assignments tab keeps growing as Quest and BetterQuest fight.
  exams.classList.add('collapsing');
  exams.style.height = '4800px';
  exams.style.overflow = 'hidden';
  collapseCourseCategoriesByDefault(doc);
  assert.equal(exams.classList.contains('collapsing'), false, 'Stuck collapsing state is cleared');
  assert.equal(exams.style.height, '', 'Bootstrap height is removed so the page cannot grow');
  assert.equal(exams.style.overflow, '', 'Bootstrap overflow is removed');

  // Clicking the toggle is a real choice, and it must survive every later pass.
  hwBtn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  hw.classList.add('show');
  hwBtn.classList.remove('collapsed');
  hwBtn.setAttribute('aria-expanded', 'true');
  collapseCourseCategoriesByDefault(doc);
  assert.equal(hw.classList.contains('show'), true, 'User opened category must remain open');
  assert.equal(hwBtn.getAttribute('aria-expanded'), 'true');
  assert.equal(exams.classList.contains('show'), false, 'Unopened category stays collapsed');
});

test('categories titled with grade weights still collapse, while the Grades tab stays open', () => {
  const dom = new JSDOM(`<html><body class="mdb-skin"><div id="main-content"><div id="target">
    <div id="info-tab-data" class="tab-content">
      <div id="tabs-elements" class="tab-pane fade show active" role="tabpanel">
        <div class="card-header"><button type="button" class="btn btn-link" data-toggle="collapse" data-target="#header-3932400" aria-expanded="true">
          <span class="h4">Midterms - 28 percent of grade, lowest dropped</span>
          <i class="material-icons">remove</i>
        </button></div>
        <div class="collapse show" id="header-3932400"><table><tr><td>Midterm 1</td></tr></table></div>
        <div class="card-header"><button type="button" class="btn btn-link" data-toggle="collapse" data-target="#header-3836280" aria-expanded="true">
          <span class="h4">OPTIONAL Week 1 Learning Modules - not part of grade</span>
          <i class="material-icons">remove</i>
        </button></div>
        <div class="collapse show" id="header-3836280"><table><tr><td>Module 1</td></tr></table></div>
      </div>
      <div id="tabs-grades" class="tab-pane fade">
        <div class="card-header"><button type="button" class="btn btn-link" data-toggle="collapse" data-target="#header-grades-9" aria-expanded="true">
          <span class="h4">Homework Grades</span>
        </button></div>
        <div class="collapse show" id="header-grades-9"><table><tr><td>HW 1: 100%</td></tr></table></div>
      </div>
    </div>
  </div></div></body></html>`, {
    url: 'https://quest.cns.utexas.edu/student/courses/show?course=3491354&tab_0a=student-elements-a',
  });
  const doc = dom.window.document;
  try {
    collapseCourseCategoriesByDefault(doc);
    const midterms = doc.getElementById('header-3932400')!;
    const optional = doc.getElementById('header-3836280')!;
    assert.equal(midterms.classList.contains('show'), false, 'A category titled with a grade weight is still an assignment category');
    assert.equal(optional.classList.contains('show'), false, 'Optional modules titled "not part of grade" collapse too');
    for (const id of ['header-3932400', 'header-3836280']) {
      const btn = doc.querySelector<HTMLButtonElement>(`button[data-target="#${id}"]`)!;
      assert.equal(btn.getAttribute('aria-expanded'), 'false');
      assert.ok(btn.classList.contains('collapsed'));
      assert.equal(btn.querySelector('.material-icons')?.textContent, 'add');
    }
    const grades = doc.getElementById('header-grades-9')!;
    assert.equal(grades.classList.contains('show'), true, 'The Grades tab must stay expanded');
  } finally {
    dom.window.close();
  }
});

test('course page is recognized with and without the trailing course number so categories always collapse', () => {
  assert.equal(isCourseShowPage('https://quest.cns.utexas.edu/student/courses/show?course=3491354'), true);
  assert.equal(isCourseShowPage('https://quest.cns.utexas.edu/student/courses/show/3491354'), true);
  assert.equal(isCourseShowPage('https://quest.cns.utexas.edu/student/courses'), false);
  assert.equal(isCourseShowPage('not a url'), false);
});

test('course details facelift collapses the categories Quest injects after mount', async () => {
  const dom = new JSDOM(`<html><body class="mdb-skin"><div id="main-content"><div id="target">
    <div id="tabs-elements">
      <div class="card-header text-center">
        <button type="button" class="btn btn-link" data-toggle="collapse" data-target="#header-201" aria-expanded="true">
          <span class="h4">Homework</span><i class="material-icons dropdown-icon">remove</i>
        </button>
      </div>
      <div class="collapse show" id="header-201"><table><tr><td>HW 1</td></tr></table></div>
    </div>
  </div></div></body></html>`, { url: 'https://quest.cns.utexas.edu/student/courses/show?course=3491354', pretendToBeVisual: true });
  const doc = dom.window.document;
  const facelift = createCourseDetailsFacelift(doc.querySelector<HTMLElement>('#target')!);
  try {
    assert.equal(doc.querySelector('#header-201')!.classList.contains('show'), false, 'Category present at mount collapses immediately');
    // Quest renders the remaining categories only after the page settles.
    const late = doc.createElement('div');
    late.innerHTML =
      '<div class="card-header text-center">' +
      '<button type="button" class="btn btn-link" data-toggle="collapse" data-target="#header-202" aria-expanded="true">' +
      '<span class="h4">Midterms</span><i class="material-icons dropdown-icon">remove</i></button></div>' +
      '<div class="collapse show" id="header-202"><table><tr><td>Midterm 1</td></tr></table></div>';
    doc.querySelector('#tabs-elements')!.append(late);
    await pause();
    const exams = doc.querySelector<HTMLElement>('#header-202')!;
    assert.equal(exams.classList.contains('show'), false, 'Late-injected category collapses too');
    const examsBtn = doc.querySelector<HTMLButtonElement>('button[data-target="#header-202"]')!;
    assert.equal(examsBtn.getAttribute('aria-expanded'), 'false');
    assert.ok(examsBtn.classList.contains('collapsed'));
    assert.equal(examsBtn.querySelector('.material-icons')?.textContent, 'add');
  } finally { facelift.dispose(); dom.window.close(); }
});

test('course details facelift integrates with startPageFeatures on course show pages', async () => {
  const dom = new JSDOM(`<html><body class="mdb-skin">
    <div id="quest-nav-header-div"></div>
    <div id="main-content">
      <div id="target">
        <div class="card">
          <div class="card-header text-center">
            <button type="button" class="btn btn-link" data-toggle="collapse" data-target="#student-course-info-header" aria-expanded="true">
              <span class="h4">DIFFEREN AND INTEGRAL CALCULUS (58355)</span>
            </button>
          </div>
          <div class="collapse show" id="student-course-info-header">
            <div class="row text-center">
              <div class="col">
                <div class="qlabel">Instructor</div>
                <div>Nicolas Reyes</div>
                <a href="mailto:nreyes@math.utexas.edu">contact</a>
              </div>
              <div class="col">
                <div class="qlabel">Meets</div>
                <div>TTH 330-500</div>
                <br>in PMA 4.102
              </div>
              <div class="col"></div>
              <div class="col"></div>
            </div>
          </div>
        </div>
        <div id="tabs-elements">
          <div class="card-header">
            <button type="button" class="btn btn-link" data-toggle="collapse" data-target="#header-999" aria-expanded="true">
              <span class="h4">Assignments Category</span>
            </button>
          </div>
          <div class="collapse show" id="header-999">
            <table><tr><td>HW 1</td></tr></table>
          </div>
        </div>
        <div id="tabs-grades">
          <div class="card-header">
            <button type="button" class="btn btn-link" data-toggle="collapse" data-target="#header-grades-1" aria-expanded="true">
              <span class="h4">Homework Grades</span>
            </button>
          </div>
          <div class="collapse show" id="header-grades-1">
            <table><tr><td>HW 1: 100%</td></tr></table>
          </div>
        </div>
      </div>
    </div>
  </body></html>`, {
    url: 'https://quest.cns.utexas.edu/student/courses/show?course=3491354',
    pretendToBeVisual: true,
  });
  prepare(dom);

  const f = store();
  const features = startPageFeatures(dom.window.document, dom.window as unknown as Window, f.run, f.subscribe);
  try {
    features.reconcile();
    await pause();

    const info = dom.window.document.querySelector<HTMLElement>('#student-course-info-header')!;
    assert.ok(info.querySelector('.bq-meeting-time'));
    assert.equal(info.querySelector('.bq-meeting-days')?.textContent, 'Tuesday/Thursday');
    assert.equal(info.querySelector('.bq-meeting-hours')?.textContent, '3:30 PM - 5:00 PM');
    assert.ok(info.querySelector('.bq-contact-btn'));
    assert.ok(info.querySelector('.bq-course-location'));

    // Category accordion in assignments is collapsed by default
    const category = dom.window.document.querySelector<HTMLElement>('#header-999')!;
    assert.equal(category.classList.contains('show'), false);
    const catBtn = dom.window.document.querySelector<HTMLButtonElement>('button[data-target="#header-999"]')!;
    assert.equal(catBtn.getAttribute('aria-expanded'), 'false');
    assert.ok(catBtn.classList.contains('collapsed'));

    // Panels in grades MUST NOT be collapsed
    const gradePanel = dom.window.document.querySelector<HTMLElement>('#header-grades-1')!;
    assert.equal(gradePanel.classList.contains('show'), true, 'Grades panel must remain expanded');
    const gradeBtn = dom.window.document.querySelector<HTMLButtonElement>('button[data-target="#header-grades-1"]')!;
    assert.equal(gradeBtn.getAttribute('aria-expanded'), 'true');
    assert.equal(gradeBtn.classList.contains('collapsed'), false);
  } finally {
    features.dispose();
    dom.window.close();
  }
});

test('readAssessmentResponses parses all questions with full choice lists from completed Quest responses', async () => {
  const fs = await import('node:fs/promises');
  const html = await fs.readFile(new URL('./fixtures/quest-responses.html', import.meta.url), 'utf-8');
  const dom = new JSDOM(`<body>${html}</body>`);
  const table = dom.window.document.querySelector<HTMLTableElement>('table[id^="instance-table-courseuserassignment_"]')!;
  assert.ok(table);
  const bindings = readAssessmentResponses(table);
  assert.equal(bindings.length, 12, 'Must parse all 12 questions from table');
  for (let i = 0; i < 12; i++) {
    const b = bindings[i];
    assert.equal(b.number, String(i + 1));
    assert.ok(b.options.length >= 4, `Question ${i + 1} must have complete choice options`);
    assert.ok(b.select.value, `Question ${i + 1} must preserve submitted value`);
  }
});

test('checkCorrect status counts as answered even without a word-boundary around Correct', () => {
  const dom = new JSDOM(`<table id="instance-table-courseuserassignment_1"><tbody>
    <tr data-id="cuaip_1"><td>1.</td><td class="input">3</td>
      <td class="status"><i class="material-icons" aria-hidden="true">check</i><span class="sr-only">Correct</span></td>
      <td class="previous"></td><td class="correct">10</td></tr>
    <tr data-id="cuaip_2"><td>2.</td><td><select aria-label="Select your response"><option value="2" selected>2</option><option value="3">3</option></select></td>
      <td class="status">checkCorrect</td><td class="previous">1 / 4</td><td class="correct">10</td>
      <td><button aria-label="Submit response" hidden>Submit</button></td></tr>
  </tbody></table>`);
  const table = dom.window.document.querySelector('table')!;
  const bindings = readAssessmentResponses(table);
  assert.equal(bindings.length, 2);
  assert.ok(bindings.every(b => b.answered), 'Finished rows are answered');
  dom.window.close();
});

test('a half-rendered response row is kept but not reported answered', () => {
  // Quest re-seeds its virtualized response rows around a submit. A row caught
  // half-rendered has no answer control, no value, no attempts and no status.
  // It must not be reported as answered (that hides the option boxes for a live
  // question), but it must stay in the list so its choices are still mapped —
  // dropping it would leave the whole PDF without clickable boxes.
  const dom = new JSDOM(`<table id="instance-table-courseuserassignment_1"><tbody>
    <tr data-id="cuaip_1"><td>1.</td><td class="input"></td>
      <td class="status"></td><td class="previous"></td><td class="correct"></td>
      <td><button aria-label="Submit response">Submit</button></td></tr>
    <tr data-id="cuaip_2"><td>2.</td><td><select aria-label="Select your response"><option value="">- select -</option><option value="1">1</option></select></td>
      <td class="status"></td><td class="previous"></td><td class="correct"></td>
      <td><button aria-label="Submit response">Submit</button></td></tr>
  </tbody></table>`);
  const table = dom.window.document.querySelector('table')!;
  const bindings = readAssessmentResponses(table);
  assert.equal(bindings.length, 2, 'The half-rendered row must stay so its choices remain mapped');
  assert.equal(bindings[0].number, '1');
  assert.equal(bindings[0].answered, false, 'A row with no value and no evidence must not be reported answered');
  assert.ok(bindings[0].options.length >= 4, 'The half-rendered row still needs its choice options mapped');
  assert.equal(bindings[1].answered, false);
  dom.window.close();
});

test('PDF workspace hides choice selectors for answered questions and renders all possible choice buttons for unanswered questions', async () => {
  const dom = new JSDOM(`<html><body class="mdb-skin"><div id="quest-nav-header-div"></div><main id="main-content"><div id="target">
    <div id="pdf-frame"><div id="presentation-pdf-frame"><iframe src="/student/images/download_pdf?instance=courseuserassignment_1" title="Assignment PDF"></iframe></div></div>
    <div id="view-responses-table-id"><table id="instance-table-courseuserassignment_1"><tbody>
      <!-- Question 1: Unanswered, 4 choices -->
      <tr data-id="cuaip_1"><td>1.</td><td><select aria-label="Select your response"><option value="">- select -</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option></select></td><td class="status"></td><td class="previous">0 / 2</td><td class="correct"></td><td><button aria-label="Submit response">Submit</button></td></tr>
      <!-- Question 2: Completed/Answered row with answer 3 -->
      <tr data-id="cuaip_2"><td>2.</td><td class="input">3</td><td class="status"><i class="material-icons text-success">check</i></td><td class="previous">1 / 2</td><td class="correct">10</td><td></td></tr>
    </tbody></table></div>
  </div></main></body></html>`, { url: 'https://quest.cns.utexas.edu/student/instances/show?instance=courseuserassignment_1', pretendToBeVisual: true });
  prepare(dom);
  const f = store();
  const features = startPageFeatures(dom.window.document, dom.window as unknown as Window, f.run, f.subscribe);
  try {
    features.reconcile();
    await pause();
    const host = dom.window.document.querySelector<HTMLElement>('[data-betterquest="assessment-rail"]')!;
    assert.ok(host);

    const q1Card = host.shadowRoot!.querySelector<HTMLElement>('[data-question-id="cuaip_1"]')!;
    assert.ok(q1Card);
    const q1Choices = q1Card.querySelectorAll<HTMLButtonElement>('.choice');
    assert.equal(q1Choices.length, 4, 'Unanswered question 1 must show buttons for ALL 4 possible answers');
    assert.equal(q1Card.querySelector('.submitted-tag'), null);

    const q2Card = host.shadowRoot!.querySelector<HTMLElement>('[data-question-id="cuaip_2"]')!;
    assert.ok(q2Card);
    assert.equal(q2Card.querySelector('.choices'), null, 'Answered question 2 must NOT show choice selector buttons');
    assert.equal(q2Card.querySelector('.submit'), null, 'Answered question 2 must NOT show submit button');
    const tag = q2Card.querySelector<HTMLElement>('.submitted-tag')!;
    assert.ok(tag);
    assert.equal(tag.textContent, 'Submitted: Answer 3');
  } finally {
    features.dispose();
    dom.window.close();
  }
});

test('PDF workspace always shows the interactive PDF and never the native frame', async () => {
  const dom = new JSDOM(`<html><body class="mdb-skin"><div id="quest-nav-header-div"></div><main id="main-content"><div id="target">
    <div id="pdf-frame"><div id="presentation-pdf-frame"><iframe src="/student/images/download_pdf?instance=courseuserassignment_1" title="Assignment PDF"></iframe></div></div>
    <div id="view-responses-table-id"><table id="instance-table-courseuserassignment_1"><tbody>
      <tr data-id="cuaip_1"><td>1.</td><td><select aria-label="Select your response"><option value="">- select -</option><option value="1">1</option><option value="2">2</option></select></td><td class="status"></td><td class="previous">0 / 2</td><td class="correct">10</td><td><button aria-label="Submit response">Submit</button></td></tr>
    </tbody></table></div>
  </div></main></body></html>`, { url: 'https://quest.cns.utexas.edu/student/instances/show?instance=courseuserassignment_1', pretendToBeVisual: true });
  prepare(dom);
  const f = store();
  const features = startPageFeatures(dom.window.document, dom.window as unknown as Window, f.run, f.subscribe);
  try {
    features.reconcile();
    await pause();
    const host = dom.window.document.querySelector<HTMLElement>('[data-betterquest="assessment-rail"]')!;
    assert.ok(host);

    // Unanswered question 1 must show choice selector buttons even when correct column has points (10)
    const q1Card = host.shadowRoot!.querySelector<HTMLElement>('[data-question-id="cuaip_1"]')!;
    assert.ok(q1Card);
    assert.equal(q1Card.querySelectorAll('.choice').length, 2, 'Must show choices for unanswered question');

    const pdfFrame = dom.window.document.querySelector<HTMLElement>('#pdf-frame')!;
    const pres = dom.window.document.querySelector<HTMLElement>('#presentation-pdf-frame')!;
    const iframe = dom.window.document.querySelector<HTMLIFrameElement>('#presentation-pdf-frame iframe')!;
    const bqViewer = pdfFrame.querySelector<HTMLElement>('[data-betterquest="interactive-pdf"]');

    // Native iframe and presentation frame stay hidden; there is no other view.
    assert.equal(host.shadowRoot!.querySelector('.mode-switcher'), null, 'No view switcher in the unified view');
    assert.equal(pres.hidden, true, 'Native presentation frame must stay hidden');
    assert.equal(iframe.hidden, true, 'Native iframe must stay hidden');
    assert.equal(pres.style.display, 'none');
    assert.equal(iframe.style.display, 'none');
    if (bqViewer) {
      assert.equal(bqViewer.hidden, false, 'Interactive viewer must be visible');
      assert.equal(bqViewer.style.display, 'block');
    }
    assert.equal(dom.window.document.querySelector('#target')?.getAttribute('data-betterquest-pdf-mode'), 'betterquest');
  } finally {
    features.dispose();
    dom.window.close();
  }
});

test('Upcoming Assignments shows in-progress assignments (e.g. 5 of 20 completed) instead of falsely claiming all caught up', async () => {
  const dom = new JSDOM(`<html><body class="mdb-skin"><div id="quest-nav-header-div"></div><main id="main-content"><div id="target">
    <div class="card">
      <div class="card-header">
        <button type="button" data-toggle="collapse" data-target="#student-course-info-header">
          <span class="h4">CALCULUS (58355)</span>
        </button>
      </div>
      <div class="collapse show" id="student-course-info-header">
        <div class="row">
          <div class="col"><div class="qlabel">Instructor</div><div>Teacher Name</div></div>
          <div class="col"><div class="qlabel">Meets</div><div>TTH 330-500</div></div>
          <div class="col"></div>
          <div class="col"></div>
        </div>
      </div>
    </div>
    <div id="tabs-elements">
      <table id="instances-table-eh999999">
        <thead>
          <tr><th></th><th>Name</th><th>Start Date</th><th>Due Date (Central Time (US & Canada))</th><th>Completed</th><th>Grade</th><th>Class Average</th><th></th></tr>
        </thead>
        <tbody>
          <!-- HW01: 100% completed -->
          <tr>
            <td></td>
            <td><a href="/student/instances/route?instance=courseuserassignment_101">HW01</a></td>
            <td>August 25, 2026 12:00 AM CDT</td>
            <td>September 02, 2026 11:59 PM CDT</td>
            <td><span class="sr-only">Completed status: Completed</span><i class="material-icons text-success">check</i></td>
            <td>100%</td>
            <td>90%</td>
            <td></td>
          </tr>
          <!-- HW07: In progress, 5 of 20 completed, due in the future -->
          <tr>
            <td></td>
            <td><a href="/student/instances/route?instance=courseuserassignment_107">HW07</a></td>
            <td>October 07, 2026 12:00 AM CDT</td>
            <td>October 14, 2026 11:59 PM CDT</td>
            <td><span class="sr-only">Completed status: 5 of 20 completed</span>5/20</td>
            <td>25%</td>
            <td>50%</td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div></main></body></html>`, { url: 'https://quest.cns.utexas.edu/student/courses/show?course=3491354', pretendToBeVisual: true });
  prepare(dom);
  const f = store();
  const features = startPageFeatures(dom.window.document, dom.window as unknown as Window, f.run, f.subscribe);
  try {
    features.reconcile();
    await pause();

    // Verify course show extraction observed the assignments
    const state = await f.run({ kind: 'state:read' });
    const hw07 = state.cache.assignments.find(a => a.title === 'HW07')!;
    assert.ok(hw07);
    assert.equal(hw07.completion, 'in-progress');

    // Upcoming assignments section inside course info header
    const upcoming = dom.window.document.querySelector<HTMLElement>('[data-betterquest="assignment-section"]')!;
    assert.ok(upcoming);
    const shadow = upcoming.shadowRoot!;

    // Must NOT say "All caught up! No incomplete assignments."
    assert.equal(shadow.querySelector('.empty'), null, 'Must NOT claim all caught up when HW07 is incomplete');

    // Must display HW07 in the list of upcoming assignments
    const rows = shadow.querySelectorAll('.list .row');
    assert.equal(rows.length, 1, 'HW07 must be listed as an upcoming incomplete assignment');
    assert.equal(rows[0].querySelector('.assignment-link')?.textContent, 'HW07');
    assert.match(rows[0].querySelector('.deadline')?.textContent || '', /Oct 14/);
  } finally {
    features.dispose();
    dom.window.close();
  }
});




