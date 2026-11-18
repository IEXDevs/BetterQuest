import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
const configFile = fileURLToPath(new URL('./vite.config.ts', import.meta.url));
const servers = [];
for (const mode of ['fixed', 'before']) {
  const server = await createServer({ configFile, mode });
  await server.listen(); servers.push(server);
  console.log(`${mode}: http://127.0.0.1:${mode === 'before' ? 4180 : 4179}/`);
}
const close = async () => { await Promise.all(servers.map(server => server.close())); process.exit(); };
process.once('SIGINT', close); process.once('SIGTERM', close);
