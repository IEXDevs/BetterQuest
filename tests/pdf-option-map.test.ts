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

