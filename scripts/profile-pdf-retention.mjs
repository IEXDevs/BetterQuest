// A retained disposed-viewer probe, not an authenticated Chrome heap benchmark.
// node --expose-gc --import tsx scripts/profile-pdf-retention.mjs [--baseline HEAD]
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { JSDOM } from 'jsdom';
if (!globalThis.gc) throw new Error('Run with --expose-gc.');
const index = process.argv.indexOf('--baseline');
const source = index === -1 ? readFileSync('src/features/assessment/pdf-viewer.ts', 'utf8')
  : execFileSync('git', ['show', `${process.argv[index + 1] || 'HEAD'}:src/features/assessment/pdf-viewer.ts`], { encoding: 'utf8' });
const url = pathToFileURL(`${process.cwd()}/src/features/assessment/pdf-viewer.ts`);
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
  .replace(/from '([^']+)'/g, (_match, path) => `from '${new URL(`${path}.ts`, url).href}'`);
const { createInteractivePdfViewer } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const dom = new JSDOM('<div></div>', { url: 'https://quest.cns.utexas.edu/student/instances/show' });
let textProbe;
const viewer = createInteractivePdfViewer(dom.window.document.querySelector('div'), {
  url: '/student/images/problem_pdf?instance=courseuserassignment_1', optionMaximums: new Map(), onChoose() {},
  openDocument: async () => ({ pageCount: 12, destroy() {}, async renderPage(page) {
    const runs = Array.from({ length: 1000 }, (_, i) => ({ text: `Synthetic PDF text ${page}-${i}`, page, left: 20, top: i * 16, width: 100, height: 12 }));
    textProbe ??= new WeakRef(runs[0]);
    return { width: 600, height: 800, runs };
  } }),
});
await viewer.ready;
viewer.dispose();
for (let i = 0; i < 3; i++) {
  await new Promise(resolve => setImmediate(resolve));
  globalThis.gc();
}
console.log(JSON.stringify({ mode: index === -1 ? 'worktree' : 'baseline', textRuns: 12000,
  disposedViewerRetained: !!viewer.element, textRunStillReachable: textProbe.deref() !== undefined,
  attachedViewers: dom.window.document.querySelectorAll('[data-betterquest="interactive-pdf"]').length,
}, null, 2));
dom.window.close();
