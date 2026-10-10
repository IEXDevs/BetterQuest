import { resolve } from 'node:path';
import { copyFileSync, existsSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: resolve(__dirname),
  plugins: [
    react(),
    {
      name: 'privacy-routing',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (req.url) {
            const [pathname, search] = req.url.split('?');
            if (pathname === '/privacy' || pathname === '/privacy/') {
              req.url = '/privacy/index.html' + (search ? `?${search}` : '');
            }
          }
          next();
        });
      },
      closeBundle() {
        const outDir = resolve(__dirname, '../site');
        const privacyIndex = resolve(outDir, 'privacy/index.html');
        const privacyHtml = resolve(outDir, 'privacy.html');
        if (existsSync(privacyIndex)) {
          copyFileSync(privacyIndex, privacyHtml);
        }
      },
    },
  ],
  publicDir: 'public',
  build: {
    outDir: resolve(__dirname, '../site'),
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        privacy: resolve(__dirname, 'privacy/index.html'),
      },
    },
  },
  server: {
    port: 5173,
  },
});
