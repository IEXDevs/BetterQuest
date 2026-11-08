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
  const last = block.at(-1);
  if (!last) return null;
  const page = pages.get(last.page);
  if (!page) return null;
  const content = block.filter(run => run.page === last.page);
  const left = Math.min(...content.map(run => run.left));
  const right = Math.max(...content.map(run => run.left + run.width));
  if (right - left > page.width * .65) return null; // Ambiguous multi-column block.
  const top = Math.max(...content.map(run => run.top + run.height)) + 8;
  const next = runs[end];
  const bottom = next?.page === last.page ? next.top - 24 : page.height - 24;
  const height = 48;
  if (bottom - top < height) return null;
  const width = Math.min(300, page.width - left - 24);
  if (width < 180) return null;
  return { page: last.page, left: left / page.width * 100, top: top / page.height * 100,
    width: width / page.width * 100, height: height / page.height * 100 };
}
