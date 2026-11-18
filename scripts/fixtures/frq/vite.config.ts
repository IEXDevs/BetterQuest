import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { dirname, resolve, sep } from 'node:path';
import { execFileSync } from 'node:child_process';
import { assignmentPdf } from './pdf.mjs';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const pdfRoot = dirname(createRequire(import.meta.url).resolve('pdfjs-dist/package.json'));
export default defineConfig(({ mode }) => ({
  root,
  server: { host: '127.0.0.1', port: mode === 'before' ? 4180 : 4179, strictPort: true },
  plugins: [{
    name: 'local-quest-fixture',
    enforce: 'pre',
    // Production's Quest-only origin guard remains unchanged. Only this dev
    // server substitutes localhost so the REAL content entry can initialize.
    transform(source, id) {
      if (id.replaceAll('\\', '/').endsWith('/src/shared/messages.ts')) {
        return source.replace("'https://quest.cns.utexas.edu'", `'http://127.0.0.1:${mode === 'before' ? 4180 : 4179}'`);
      }
      if (mode === 'before' && id.replaceAll('\\', '/').endsWith('/src/features/assessment/pdf-viewer.ts')) {
        // Pinned source from before this fix, NOT a mock or a duplicate UI.
        return execFileSync('git', ['show', '34f22fc:src/features/assessment/pdf-viewer.ts'], { cwd: root, encoding: 'utf8' });
      }
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url || '/', 'http://127.0.0.1:4179');
        if (url.pathname.startsWith('/fixture-assets/')) {
          const path = resolve(pdfRoot, url.pathname.slice('/fixture-assets/'.length));
          if (!path.startsWith(pdfRoot + sep)) { res.writeHead(403); res.end(); return; }
          try {
            res.setHeader('Content-Type', path.endsWith('.mjs') ? 'text/javascript' : 'application/octet-stream');
            res.end(readFileSync(path));
          } catch { res.writeHead(404); res.end(); }
          return;
        }
        if (url.pathname === '/') { res.writeHead(302, { Location: '/student/instances/show?instance=courseuserassignment_900023' }); res.end(); return; }
        if (url.pathname === '/student/images/problem_pdf') {
          res.setHeader('Content-Type', 'application/pdf'); res.end(assignmentPdf(url.searchParams.get('layout') || 'roomy')); return;
        }
        if (url.pathname !== '/student/instances/show') { next(); return; }
        const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
        res.setHeader('Content-Type', 'text/html'); res.end(await server.transformIndexHtml(url.pathname, html));
      });
    },
  }],
}));
