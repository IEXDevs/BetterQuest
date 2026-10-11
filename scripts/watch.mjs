import { context } from 'esbuild';
import { cp, mkdir, readdir } from 'node:fs/promises';
import { watch as fsWatch } from 'node:fs';
import http from 'node:http';

const RELOAD_PORT = 8899;
let pendingClients = [];

function notifyReload() {
  if (pendingClients.length === 0) return;
  const clients = pendingClients;
  pendingClients = [];
  for (const res of clients) {
    try {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(JSON.stringify({ reload: true, timestamp: Date.now() }));
    } catch {}
  }
  console.log(`[watch] Notified ${clients.length} extension client(s) to reload.`);
}

// Lightweight HTTP server for live-reloading the extension
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/wait-reload') {
    pendingClients.push(res);
    req.on('close', () => {
      pendingClients = pendingClients.filter(c => c !== res);
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`[watch] Port ${RELOAD_PORT} is in use; auto-reload disabled for this session.`);
  } else {
    console.error('[watch] Server error:', err);
  }
});

server.listen(RELOAD_PORT, '127.0.0.1', () => {
  console.log(`[watch] Auto-reload listener active at http://127.0.0.1:${RELOAD_PORT}`);
});

async function copyAssets() {
  await mkdir('dist', { recursive: true });
  await cp('public/manifest.json', 'dist/manifest.json');
  await cp('public/icons', 'dist/icons', { recursive: true });
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
}

await copyAssets();
console.log('[watch] Copied static assets and PDF.js dependencies to dist/');

// Watch public/ directory for manifest and icon changes
try {
  fsWatch('public', { recursive: true }, async (_eventType, filename) => {
    try {
      console.log(`[watch] Detected change in public/${filename}, updating dist/...`);
      await cp('public/manifest.json', 'dist/manifest.json');
      await cp('public/icons', 'dist/icons', { recursive: true });
      if (filename && /\.(png|jpe?g|webp|gif|svg)$/i.test(filename)) {
        await cp(`public/${filename}`, `dist/${filename}`);
        await cp(`public/${filename}`, `dist/assets/${filename}`);
      }
      notifyReload();
    } catch (err) {
      console.error('[watch] Failed to copy updated public assets:', err);
    }
  });
} catch (err) {
  console.warn('[watch] Could not attach watcher to public/ directory:', err);
}

let initialBuildCount = 0;
const reloadPlugin = {
  name: 'reload-plugin',
  setup(build) {
    build.onEnd(result => {
      if (result.errors.length > 0) {
        console.error(`[watch] Build failed with ${result.errors.length} error(s).`);
        return;
      }
      if (initialBuildCount < 2) {
        initialBuildCount++;
        if (initialBuildCount === 2) {
          console.log('[watch] Initial build complete. Watching for source changes...');
        }
        return;
      }
      console.log(`[watch] Rebuilt bundle at ${new Date().toLocaleTimeString()}`);
      notifyReload();
    });
  },
};

const reloadBanner = `
// [BetterQuest Dev Auto-Reload]
(function() {
  let active = true;
  async function listenForReload() {
    while (active) {
      try {
        const res = await fetch('http://127.0.0.1:${RELOAD_PORT}/wait-reload');
        if (res.ok) {
          console.log('[BetterQuest] Rebuild detected, reloading extension...');
          if (typeof chrome !== 'undefined' && chrome.runtime?.reload) {
            chrome.runtime.reload();
          }
          break;
        }
      } catch {
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  }
  listenForReload();
})();
`;

const shared = {
  bundle: true,
  target: 'chrome120',
  minify: false,
  sourcemap: 'inline',
  legalComments: 'eof',
  plugins: [reloadPlugin],
};

const contentCtx = await context({
  ...shared,
  entryPoints: ['src/content/index.ts'],
  outfile: 'dist/content.js',
  format: 'iife',
});

const backgroundCtx = await context({
  ...shared,
  entryPoints: ['src/background/index.ts'],
  outfile: 'dist/background.js',
  format: 'esm',
  banner: { js: reloadBanner },
});

await contentCtx.watch();
await backgroundCtx.watch();
