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



