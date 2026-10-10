import { build } from 'esbuild';
import { cp, mkdir } from 'node:fs/promises';

// Only these named generated files are overwritten; no directory deletion.
await mkdir('dist', { recursive: true });
await cp('public/manifest.json', 'dist/manifest.json');
await cp('public/icons', 'dist/icons', { recursive: true });
const shared = { bundle: true, target: 'chrome120', minify: false, legalComments: 'eof' };
await build({ ...shared, entryPoints: ['src/content/index.ts'], outfile: 'dist/content.js', format: 'iife' });
await build({ ...shared, entryPoints: ['src/background/index.ts'], outfile: 'dist/background.js', format: 'esm' });
console.log('Built BetterQuest: dist/manifest.json, content.js, background.js');
