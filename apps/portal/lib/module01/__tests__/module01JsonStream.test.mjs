import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync('apps/portal/lib/module01/module01JsonStream.ts', 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const module = { exports: {} };
new Function('module', 'exports', code)(module, module.exports);
const { streamModule01Json } = module.exports;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

{
  let release;
  const work = new Promise((resolve) => { release = resolve; });
  const response = streamModule01Json(async () => { await work; return Response.json({ status: 'ready', report: { score: 1.68 } }); }, undefined, 5);
  const reader = response.body.getReader();
  assert.equal(new TextDecoder().decode((await reader.read()).value), '\n', 'Headers and first bytes arrive before generation completes');
  const heartbeat = await reader.read();
  assert.match(new TextDecoder().decode(heartbeat.value), /^\s+$/);
  release();
  let text = '';
  for (;;) { const { done, value } = await reader.read(); if (done) break; text += new TextDecoder().decode(value); }
  assert.equal(JSON.parse(text).report.score, 1.68);
  assert.equal(response.headers.get('x-accel-buffering'), 'no');
}
{
  const response = streamModule01Json(async () => { throw new Error('private upstream information'); });
  assert.deepEqual(await response.json(), { status: 'error', message: 'Report generation failed.' });
}
{
  let signal;
  const response = streamModule01Json(async (s) => {
    signal = s;
    await new Promise((resolve) => s.addEventListener('abort', resolve, { once: true }));
    return Response.json({ status: 'cancelled' });
  });
  await response.body.cancel();
  assert.equal(signal.aborted, true);
  await delay(5);
}
console.log('Module 01 JSON streaming: heartbeat, final JSON, errors and cancellation passed');
