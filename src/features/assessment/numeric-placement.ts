import { parseQuestionBoundary, type PdfTextRun } from '../../adapters/quest/assessment';

/** Only use a measured blank gap after the prompt. Never guess a page/position
 * for scanned PDFs or cover a following question; the response desk is fallback. */
export function numericResponsePlacement(runs: PdfTextRun[], question: number,
  pages: ReadonlyMap<number, { width: number; height: number }>) {
  const start = runs.findIndex(run => parseQuestionBoundary(run.text) === question);
  if (start < 0) return null;
  let end = start + 1;
  while (end < runs.length) {
    const next = parseQuestionBoundary(runs[end].text);
    if (next !== null && next !== question) break;
    end++;
  }
  const block = runs.slice(start, end).filter(run => run.text.trim());
  const boundary = runs[start];
  const pageNumber = Math.max(...block.map(run => run.page));
  const page = pages.get(pageNumber);
  if (!page) return null;
  // Text-stream order is not necessarily visual order (fractions and separate
  // text objects can follow the next question's header in getTextContent()).
  const headers = runs.filter(run => run.page === pageNumber && parseQuestionBoundary(run.text) !== null);
  const twoColumns = headers.some(run => run.left < page.width * .45) && headers.some(run => run.left > page.width * .55);
  const rightColumn = boundary.left >= page.width / 2;
  const inColumn = (run: PdfTextRun) => !twoColumns || (run.left >= page.width / 2) === rightColumn;
  const firstTop = pageNumber === boundary.page ? boundary.top : 0;
  const next = headers.filter(run => inColumn(run) && run.top > firstTop + boundary.height && parseQuestionBoundary(run.text) !== question)
    .sort((a, b) => a.top - b.top)[0];
  const content = runs.filter(run => run.page === pageNumber && inColumn(run) && run.text.trim()
    && run.top >= firstTop && (!next || run.top < next.top - boundary.height / 2));
  if (!content.length) return null;
  const left = Math.min(...content.map(run => run.left));
  const top = Math.max(...content.map(run => run.top + run.height)) + 4;
  const bottom = next ? next.top - 24 : page.height - 24;
  // The previous 48-unit control plus 8/24-unit margins required an 80-unit
  // blank gap. A compact field can safely use the smaller gap below a fraction.
  const height = Math.min(36, bottom - top);
  if (height < 24) return null;
  const columnRight = twoColumns && !rightColumn ? page.width / 2 : page.width;
  const width = Math.min(300, columnRight - left - 24);
  if (width < 180) return null;
  return { page: pageNumber, left: left / page.width * 100, top: top / page.height * 100,
    width: width / page.width * 100, height: height / page.height * 100 };
}
