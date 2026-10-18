import test from 'node:test';
import assert from 'node:assert/strict';
import * as assessment from '../src/adapters/quest/assessment';

interface TextRun {
  text: string;
  page: number;
  left: number;
  top: number;
  width: number;
  height: number;
}

type MapLabels = (runs: TextRun[], optionMaximums: ReadonlyMap<number, number>) => Array<TextRun & {
  questionNumber: number;
  optionValue: number;
}>;

const run = (text: string, top: number, page = 1, left = 42): TextRun => ({ text, page, left, top, width: 12, height: 10 });

function mapper(): MapLabels {
  const candidate = (assessment as unknown as { mapPdfOptionLabels?: MapLabels }).mapPdfOptionLabels;
  assert.equal(typeof candidate, 'function', 'assessment adapter must expose the PDF option mapper');
  return candidate!;
}

test('PDF option mapping uses three-digit question boundaries and the first complete single-digit sequence', () => {
  const actual = mapper()([
    run('page 1', 8), run('001', 20),
    run('1', 30), run('2.', 36), // Bare formula digit cannot start a choice sequence.
    run('1.', 50), run('2.', 70), run('3.', 90), run('4.', 110), run('5.', 130), run('6.', 150),
    run('1.', 160), run('12.', 170), run('7.', 180),
    run('002', 200), run('1.', 220), run('2.', 240), run('3.', 260), run('4.', 280), run('5.', 300), run('6.', 320),
  ], new Map([[1, 6], [2, 5]]));

  assert.deepEqual(actual.map(({ questionNumber, optionValue, top }) => [questionNumber, optionValue, top]), [
    [1, 1, 50], [1, 2, 70], [1, 3, 90], [1, 4, 110], [1, 5, 130], [1, 6, 150],
    [2, 1, 220], [2, 2, 240], [2, 3, 260], [2, 4, 280], [2, 5, 300],
  ]);
});

test('PDF option mapping fails closed for incomplete sequences and restarts at a later one', () => {
  const actual = mapper()([
    run('001', 10), run('1.', 20), run('2.', 30), run('4.', 40),
    run('002', 50), run('1.', 60), run('3.', 70), run('1.', 80), run('2.', 90), run('3.', 100),
    run('003', 110), run('1.', 120), run('2.', 130), run('10.', 140),
  ], new Map([[1, 4], [2, 3], [3, 3]]));

  assert.deepEqual(actual.map(({ questionNumber, optionValue, top }) => [questionNumber, optionValue, top]), [
    [2, 1, 80], [2, 2, 90], [2, 3, 100],
  ]);
});

test('PDF option mapping identifies question headers containing points, parts, and choices with formula text', () => {
  const actual = mapper()([
    run('001 10.0 points', 20),
    run('1. \\sqrt{x} = 2', 50),
    run('2. \\sqrt{x} = 4', 70),
    run('3. \\sqrt{x} = 8', 90),
    run('4. None of these', 110),
    run('002 (part 1 of 2) 10.0 pts', 200),
    run('1. 42 m/s', 220),
    run('2. 84 m/s', 240),
    run('3. 126 m/s', 260),
    run('003: 5.0 points', 300),
    run('1. Option A', 320),
    run('2. Option B', 340),
  ], new Map([[1, 4], [2, 3], [3, 2]]));

  assert.deepEqual(actual.map(({ questionNumber, optionValue, top }) => [questionNumber, optionValue, top]), [
    [1, 1, 50], [1, 2, 70], [1, 3, 90], [1, 4, 110],
    [2, 1, 220], [2, 2, 240], [2, 3, 260],
    [3, 1, 320], [3, 2, 340],
  ]);
});

test('PDF option mapping maps choices for questions at the very bottom of the document', () => {
  const actual = mapper()([
    run('001', 20),
    run('1.', 40), run('2.', 60), run('3.', 80),
    run('002 10.0 points', 120),
    run('1.', 140), run('2.', 160), run('3.', 180),
    run('003', 220),
    run('1.', 240), run('2.', 260), run('3.', 280),
  ], new Map([[1, 3], [2, 3], [3, 3]]));

  assert.deepEqual(actual.map(({ questionNumber, optionValue, top }) => [questionNumber, optionValue, top]), [
    [1, 1, 40], [1, 2, 60], [1, 3, 80],
    [2, 1, 140], [2, 2, 160], [2, 3, 180],
    [3, 1, 240], [3, 2, 260], [3, 3, 280],
  ]);
});

test('PDF option mapping maps choices using uppercase and lowercase letters', () => {
  const actual = mapper()([
    run('001', 20),
    run('A.', 40), run('B.', 60), run('C.', 80), run('D.', 100),
    run('002 (part 1 of 1)', 140),
    run('a.', 160), run('b.', 180), run('c.', 200),
  ], new Map([[1, 4], [2, 3]]));

  assert.deepEqual(actual.map(({ questionNumber, optionValue, top }) => [questionNumber, optionValue, top]), [
    [1, 1, 40], [1, 2, 60], [1, 3, 80], [1, 4, 100],
    [2, 1, 160], [2, 2, 180], [2, 3, 200],
  ]);
});

test('PDF option mapping does not invent choices for questions missing from the response table', () => {
  const actual = mapper()([
    run('001', 20), run('1.', 40), run('2.', 60), run('3.', 80),
    run('002', 120), run('1.', 140), run('2.', 160), run('3.', 180),
    run('014', 220), run('1.', 240), run('2.', 260), run('3.', 280),
  ], new Map([[1, 3]]));

  assert.deepEqual(actual.map(({ questionNumber, optionValue }) => [questionNumber, optionValue]), [
    [1, 1], [1, 2], [1, 3],
  ], 'Only response-table questions get clickable PDF choices');
});

test('PDF option mapping prefers numeric choices over lettered statements like A. and B.', () => {
  const actual = mapper()([
    run('003 10.0 points', 20),
    run('Let f be the function defined by', 40),
    run('f(x) = 3 + 2x^{1/3}.', 60),
    run('Consider the following properties:', 80),
    run('A. concave up on (-\\infty, 0);', 100),
    run('B. has a critical point at x = 0.', 120),
    run('Which does f have?', 140),
    run('1. B only', 160),
    run('2. Both of them', 180),
    run('3. A only', 200),
    run('4. Neither of them', 220),
    run('004 10.0 points', 260),
  ], new Map([[3, 4]]));

  assert.deepEqual(actual.map(({ questionNumber, optionValue, top }) => [questionNumber, optionValue, top]), [
    [3, 1, 160], [3, 2, 180], [3, 3, 200], [3, 4, 220],
  ]);
});

test('PDF option mapping is not confused by 3-digit numbers or subtraction in equations and prompts', () => {
  const actual = mapper()([
    run('009 10.0 points', 20),
    run('A block of mass 250 g is suspended at 300 K.', 40),
    run('Find the equation where y = 100 - x.', 60),
    run('1. y = 1 - x', 80),
    run('2. y = 2 - x', 100),
    run('3. y = 3 - 2x', 120),
    run('4. y = 4 - 3x', 140),
    run('5. None of these', 160),
    run('010 10.0 points', 200),
  ], new Map([[9, 5]]));

  assert.deepEqual(actual.map(({ questionNumber, optionValue, top }) => [questionNumber, optionValue, top]), [
    [9, 1, 80], [9, 2, 100], [9, 3, 120], [9, 4, 140], [9, 5, 160],
  ]);
});

test('PDF option mapping tolerates internal formula numbers, coordinates, and evaluations like f(1)', () => {
  const actual = mapper()([
    run('012 10.0 points', 20),
    run('Let f(x) be defined on [0, 500].', 40),
    run('1. f(1) = 2 and (1, 0) is a minimum', 60),
    run('2. f(2) = 4 and (2, 0) is a minimum', 80),
    run('3. f(3) = 6 and (3, 0) is a minimum', 100),
    run('4. f(4) = 8 and (4, 0) is a minimum', 120),
    run('5. None of these', 140),
    run('013 10.0 points', 180),
  ], new Map([[12, 5]]));

  assert.deepEqual(actual.map(({ questionNumber, optionValue, top }) => [questionNumber, optionValue, top]), [
    [12, 1, 60], [12, 2, 80], [12, 3, 100], [12, 4, 120], [12, 5, 140],
  ]);
});

test('PDF option mapping ignores math formula numbers like (x - 2) in choice denominators', () => {
  const actual = mapper()([
    run('012 (part 1 of 3) 10.0 points', 20),
    run('Let f be the function defined by', 40),
    run('1. f\'(x) = (4x + 2) /', 60, 1, 42),
    run('3(x -', 72, 1, 150),
    run('2)', 75, 1, 180), // from denominator 3(x - 2)^{2/3}
    run('2. f\'(x) = (4x - 2) /', 90, 1, 42),
    run('3. f\'(x) = (4x + 2) /', 120, 1, 42),
    run('4. f\'(x) = (2 - 4x) /', 150, 1, 42),
    run('5. f\'(x) = (4x - 2) /', 180, 1, 42),
    run('013 (part 2 of 3) 10.0 points', 210),
  ], new Map([[12, 5]]));

  assert.deepEqual(actual.map(({ questionNumber, optionValue, top }) => [questionNumber, optionValue, top]), [
    [12, 1, 60], [12, 2, 90], [12, 3, 120], [12, 4, 150], [12, 5, 180],
  ]);
});

test('PDF option mapping handles column breaks on the same page (e.g. left column to right column)', () => {
  // Question 13: choices 1, 2, 3 are in the left column; choices 4, 5 wrap to top of right column
  const actual = mapper()([
    run('013 (part 2 of 3) 10.0 points', 200, 3, 42),
    run('(ii) Find the second derivative of f.', 220, 3, 42),
    run('1. f\'\'(x) = ...', 250, 3, 42),
    run('2. f\'\'(x) = ...', 280, 3, 42),
    run('3. f\'\'(x) = ...', 310, 3, 42),
    // Column break to right column on page 3
    run('4. f\'\'(x) = ...', 50, 3, 320),
    run('5. f\'\'(x) = ...', 80, 3, 320),
    run('014 (part 3 of 3) 10.0 points', 120, 3, 320),
  ], new Map([[13, 5]]));

  assert.deepEqual(actual.map(({ questionNumber, optionValue, top, left, page }) => [questionNumber, optionValue, page, left, top]), [
    [13, 1, 3, 42, 250],
    [13, 2, 3, 42, 280],
    [13, 3, 3, 42, 310],
    [13, 4, 3, 320, 50],
    [13, 5, 3, 320, 80],
  ]);
});

test('PDF option mapping handles multi-page and multi-column option flows (e.g. question 15 image choices)', () => {
  // Question 15: starts page 3 right column (1, 2), continues page 4 left column (3-7), wraps to page 4 right column (8)
  const actual = mapper()([
    run('015 10.0 points', 250, 3, 320),
    run('Which of the following is the graph...', 270, 3, 320),
    run('1.', 300, 3, 320),
    run('2.', 420, 3, 320),
    // Page 4 left column
    run('3.', 50, 4, 42),
    run('4.', 170, 4, 42),
    run('5.', 290, 4, 42),
    run('6.', 410, 4, 42),
    run('7.', 530, 4, 42),
    // Page 4 right column
    run('8.', 60, 4, 320),
    run('016 10.0 points', 180, 4, 320),
  ], new Map([[15, 8]]));

  assert.deepEqual(actual.map(({ questionNumber, optionValue, page, left, top }) => [questionNumber, optionValue, page, left, top]), [
    [15, 1, 3, 320, 300],
    [15, 2, 3, 320, 420],
    [15, 3, 4, 42, 50],
    [15, 4, 4, 42, 170],
    [15, 5, 4, 42, 290],
    [15, 6, 4, 42, 410],
    [15, 7, 4, 42, 530],
    [15, 8, 4, 320, 60],
  ]);
});


