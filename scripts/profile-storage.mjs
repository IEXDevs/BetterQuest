// Local synthetic allocation profile. Never reads Chrome storage or Quest.
// node --expose-gc --import tsx scripts/profile-storage.mjs [--baseline HEAD]
import { Session } from 'node:inspector/promises';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { emptyState } from '../src/shared/models.ts';
import { assignment, course } from '../tests/fixtures/models.ts';
import { assignmentId } from '../src/shared/identity.ts';

const baselineIndex = process.argv.indexOf('--baseline');
let source;
if (baselineIndex !== -1) {
  const ref = process.argv[baselineIndex + 1] || 'HEAD';
  source = execFileSync('git', ['show', `${ref}:src/storage/repository.ts`], { encoding: 'utf8' });
} else source = readFileSync(new URL('../src/storage/repository.ts', import.meta.url), 'utf8');
const url = pathToFileURL(`${process.cwd()}/src/storage/repository.ts`);
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
  .replace(/from '([^']+)'/g, (_match, path) => `from '${new URL(`${path}.ts`, url).href}'`);
const module = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
if (!globalThis.gc) throw new Error('Run with --expose-gc for the forced-GC measurements.');

const raw = emptyState();
raw.cache.courses = [course];
raw.cache.assignments = Array.from({ length: 1000 }, (_, i) => ({ ...assignment,
  sourceId: `fixture-${i}`, id: assignmentId(course.id, `fixture-${i}`), title: `${i} ${'Synthetic assignment '.repeat(20)}`,
}));
const repository = new module.LocalRepository({ read: async () => raw, write: async () => {} });
await repository.execute({ kind: 'state:read' });
globalThis.gc();
const beforeHeap = process.memoryUsage().heapUsed;
const inspector = new Session(); inspector.connect();
await inspector.post('HeapProfiler.startSampling', { samplingInterval: 4096 });
await inspector.post('Profiler.enable');
await inspector.post('Profiler.start');
const originalClone = globalThis.structuredClone;
let copies = 0;
globalThis.structuredClone = value => { copies++; return originalClone(value); };
const started = performance.now();
try { for (let i = 0; i < 100; i++) await repository.execute({ kind: 'state:read' }); }
finally { globalThis.structuredClone = originalClone; }
const elapsedMs = performance.now() - started;
const { profile: cpu } = await inspector.post('Profiler.stop');
const { profile } = await inspector.post('HeapProfiler.stopSampling');
inspector.disconnect();
const sampledByFunction = new Map();
function walk(node) {
  const key = node.callFrame.functionName || '(anonymous)';
  if (node.selfSize) sampledByFunction.set(key, (sampledByFunction.get(key) || 0) + node.selfSize);
  node.children.forEach(walk);
}
walk(profile.head);
const frames = new Map(cpu.nodes.map(node => [node.id, node.callFrame.functionName || '(anonymous)']));
const cpuSamples = new Map();
for (const id of cpu.samples || []) {
  const name = frames.get(id) || '(unknown)';
  cpuSamples.set(name, (cpuSamples.get(name) || 0) + 1);
}
globalThis.gc();
const afterHeap = process.memoryUsage().heapUsed;
const tailValue = await repository.tail;
console.log(JSON.stringify({ mode: baselineIndex === -1 ? 'worktree' : 'baseline', node: process.version,
  assignments: 1000, reads: 100, stateBytes: Buffer.byteLength(JSON.stringify(raw)), fullStateCopies: copies,
  elapsedMs: Math.round(elapsedMs), beforeHeap, afterHeap, retainedHeapDelta: afterHeap - beforeHeap,
  queueRetainsResponse: tailValue !== undefined,
  cpuSampleCounts: [...cpuSamples].sort((a, b) => b[1] - a[1]).slice(0, 8),
  samplingNote: 'Heap samples report surviving sampled allocations, not total allocation volume.',
  sampledAllocations: [...sampledByFunction].sort((a, b) => b[1] - a[1]).slice(0, 8),
}, null, 2));
