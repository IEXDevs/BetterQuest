import { build } from 'esbuild';
import { access, cp, mkdir, readdir } from 'node:fs/promises';

// Only these named generated files are overwritten; no directory deletion.
await mkdir('dist', { recursive: true });
await cp('public/manifest.json', 'dist/manifest.json');
await cp('public/icons', 'dist/icons', { recursive: true });
// Celebration mascots (verdict-happy.png / verdict-sad.png) are optional: the
// badge falls back to the built-in emoji when they are not packaged yet.
try {
  await access('public/assets');
  await cp('public/assets', 'dist/assets', { recursive: true });
} catch { /* no mascot images packaged */ }
await mkdir('dist/assets', { recursive: true });
try {
  const publicEntries = await readdir('public', { withFileTypes: true });
  for (const entry of publicEntries) {
    if (entry.isFile() && /\.(png|jpe?g|webp|gif|svg)$/i.test(entry.name)) {
      await cp(`public/${entry.name}`, `dist/${entry.name}`);
      await cp(`public/${entry.name}`, `dist/assets/${entry.name}`);
    }
  }
} catch { /* no additional images */ }
await mkdir('dist/pdfjs', { recursive: true });
await cp('node_modules/pdfjs-dist/build/pdf.worker.min.mjs', 'dist/pdf.worker.min.mjs');
await cp('node_modules/pdfjs-dist/wasm', 'dist/pdfjs/wasm', { recursive: true });
await cp('node_modules/pdfjs-dist/standard_fonts', 'dist/pdfjs/standard_fonts', { recursive: true });
await cp('node_modules/pdfjs-dist/LICENSE', 'dist/pdfjs/LICENSE');
const shared = { bundle: true, target: 'chrome120', minify: false, legalComments: 'eof' };
await build({ ...shared, entryPoints: ['src/content/index.ts'], outfile: 'dist/content.js', format: 'iife' });
await build({ ...shared, entryPoints: ['src/background/index.ts'], outfile: 'dist/background.js', format: 'esm' });
console.log('Built BetterQuest: extension scripts plus the local PDF.js worker/resources');
