// Focused LOCAL browser probe, not the full test suite. Start serve.mjs first.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const profile = mkdtempSync(join(tmpdir(), 'betterquest-frq-'));
const chrome = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const browser = spawn(chrome, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', 'about:blank'], { windowsHide: true, stdio: 'ignore' });
let socket, browserPort;
const pending = new Map(); let sequence = 0;
const errors = [];
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params }));
});
const evaluate = async expression => {
  const response = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (response.exceptionDetails) throw new Error(JSON.stringify(response.exceptionDetails));
  return response.result.value;
};
async function waitFor(expression) {
  for (let i = 0; i < 150; i++) { if (await evaluate(expression)) return; await delay(100); }
  throw new Error(`Timed out: ${expression}\n${errors.join('\n')}\n${await evaluate(`document.body.innerText.slice(-2000)`)}\n${await evaluate(`${shadow}?.textContent?.slice(-600)`)}`);
}
const shadow = `document.querySelector('[data-betterquest="interactive-pdf"]')?.shadowRoot`;
const card = `${shadow}?.querySelector('.pdf-free-response[data-question="23"]')`;
async function open(port, query = '') {
  await send('Page.navigate', { url: `http://127.0.0.1:${port}/student/instances/show?instance=courseuserassignment_900023${query}` });
  await waitFor(`${card} && ${shadow}.querySelector('.option-hit[data-question="22"]')`);
}
try {
  for (let i = 0; i < 100 && !existsSync(join(profile, 'DevToolsActivePort')); i++) await delay(100);
  browserPort = readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0];
  const target = await (await fetch(`http://127.0.0.1:${browserPort}/json/new?about:blank`, { method: 'PUT' })).json();
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const item = pending.get(message.id); pending.delete(message.id);
      if (message.error) item?.reject(new Error(message.error.message)); else item?.resolve(message.result);
    } else if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
  };
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1800, height: 1100, deviceScaleFactor: 1, mobile: false });
  const measures = {};
  for (const [mode, port] of [['before', 4180], ['fixed', 4179]]) {
    await open(port);
    measures[mode] = await evaluate(`(() => { const card=${card}; const page=card.closest('.page'); return {height:card.getBoundingClientRect().height, minHeight:card.style.minHeight, maxHeight:card.style.maxHeight, pageHeight:page.getBoundingClientRect().height, choices:${shadow}.querySelectorAll('.option-hit').length}; })()`);
    await evaluate(`${card}.scrollIntoView({block:'center'})`); await delay(350);
    mkdirSync('output/frq-debug-evidence', { recursive: true });
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(`output/frq-debug-evidence/${mode}.png`, Buffer.from(shot.data, 'base64'));
  }
  assert.equal(measures.fixed.minHeight, ''); assert.ok(measures.fixed.maxHeight);
  assert.ok(measures.fixed.height <= measures.before.height, JSON.stringify(measures));
  assert.equal(measures.fixed.choices, measures.before.choices);
  // Selection never submits; native dropdown remains authoritative.
  await evaluate(`${shadow}.querySelector('.option-hit[data-question="22"]').click()`);
  assert.equal(await evaluate(`document.querySelector('tr[data-id="cuaip_22"] select').value`), '1');
  assert.match(await evaluate(`document.querySelector('#fixture-report').textContent`), /native submits: 0/);
  await evaluate(`(() => { const input=${card}.querySelector('input'); input.value='21.0833'; input.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  assert.equal(await evaluate(`document.querySelector('tr[data-id="cuaip_23"] textarea').value`), '21.0833');
  await evaluate(`${card}.querySelector('button').click()`);
  await waitFor(`${card}?.dataset.correct === 'true'`);
  await delay(500);
  assert.equal(await evaluate(`${card}.hidden`), false, 'fresh correct feedback survives completion refresh');
  assert.equal(await evaluate(`${card}.querySelector('button').disabled`), true);
  await evaluate(`document.querySelector('#rerender').click()`); await delay(600);
  assert.equal(await evaluate(`${shadow}.querySelectorAll('.pdf-free-response[data-question="23"]').length`), 1);
  assert.equal(await evaluate(`${card}.hidden`), false);
  // Incorrect FRQs stay editable and retry through the same native control.
  await open(4179);
  await evaluate(`document.querySelector('#incorrect').click(); (() => { const input=${card}.querySelector('input'); input.value='Synthetic retry'; input.dispatchEvent(new Event('input',{bubbles:true})); })(); ${card}.querySelector('button').click()`);
  await waitFor(`document.querySelector('tr[data-id="cuaip_23"] .status').textContent === 'Incorrect'`);
  await delay(500);
  assert.equal(await evaluate(`${card}.hidden`), false);
  assert.equal(await evaluate(`${card}.querySelector('input').disabled`), false);
  assert.equal(await evaluate(`${card}.querySelector('button').disabled`), false);
  // Both views use single-line inputs with the action immediately beside them.
  assert.equal(await evaluate(`(() => { const c=${card}; const input=c.querySelector('input'), button=c.querySelector('button'); const field=input.getBoundingClientRect(), action=button.getBoundingClientRect(); const desk=document.querySelector('[data-betterquest="assessment-rail"]').shadowRoot.querySelector('.free-response input'); return input.type==='text' && !c.querySelector('textarea') && button.previousElementSibling===input && action.left>=field.right && Math.abs(action.top-field.top)<1 && desk?.nextElementSibling?.tagName==='BUTTON'; })()`), true);
  // Historical completion stays hidden and never generates choices for Q23.
  await send('Page.navigate', { url: 'http://127.0.0.1:4179/student/instances/show?instance=courseuserassignment_900023&completed=1' });
  await waitFor(`${shadow}?.querySelector('.option-hit[data-question="22"]')`);
  assert.equal(await evaluate(`${shadow}.querySelectorAll('.pdf-free-response[data-question="23"]:not([hidden]),.option-hit[data-question="23"]').length`), 0);
  await evaluate(`(() => { const row=document.querySelector('tr[data-id="cuaip_23"]'); row.querySelector('textarea').disabled=false; row.querySelector('textarea').value=''; row.querySelector('button').disabled=false; row.querySelector('.status').textContent=''; row.querySelector('.previous').textContent='0 / 3'; })()`);
  await waitFor(`${card} && !${card}.hidden`);
  assert.equal(await evaluate(`${card}.querySelector('input').disabled`), false, 'reopened FRQ remounts an editable card');
  for (const layout of ['next', 'tight', 'no-boundary']) {
    await open(4179, `&layout=${layout}`);
    const position = await evaluate(`(() => { const c=${card}; const p=c.closest('.page'); const r=c.getBoundingClientRect(), b=p.getBoundingClientRect(); return {flow:c.classList.contains('pdf-free-flow'),top:(r.top-b.top)/b.height,bottom:(r.bottom-b.top)/b.height}; })()`);
    if (layout === 'next') { assert.equal(position.flow, false); assert.ok(position.bottom < 582/800, JSON.stringify(position)); }
    else assert.equal(position.flow, true, layout);
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ measures, result: 'PASS: native syncing/submission, MCQs, completion refresh, rerender deduplication, incorrect retry, inline inputs, historical completion, and boundary fallbacks', errors }, null, 2));
} finally {
  if (socket?.readyState === WebSocket.OPEN) { try { await send('Browser.close'); } catch {} socket.close(); }
  browser.kill();
}
