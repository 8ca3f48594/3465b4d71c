import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadLibrary } from '../src/library.mjs';
import { inspectStyle } from '../src/style.mjs';

async function fixture(t, alter = x => x) {
  const dir = await mkdtemp(join(tmpdir(), 'explain-library-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await mkdir(join(dir, 'general'));
  await writeFile(join(dir, 'general/policy.md'), 'State the answer and preserve evidence.');
  await writeFile(join(dir, 'topic.md'), 'Trace the cache lookup before the disk read.');
  const index = alter({version:1,general:[{id:'policy',path:'general/policy.md'}],guides:[{id:'cache',kind:'topic',description:'Explain caching.',path:'topic.md'}]});
  await writeFile(join(dir, 'index.json'), JSON.stringify(index));
  return dir;
}

test('library reads only selected guidance into the returned package and records content identity', async t => {
  const library = await loadLibrary(await fixture(t));
  assert.equal(library.general[0].text, 'State the answer and preserve evidence.');
  assert.equal(library.index[0].id, 'cache');
  assert.match(library.hash, /^[a-f0-9]{64}$/);
  assert.deepEqual(await library.load([]), []);
  assert.equal((await library.load(['cache']))[0].text, 'Trace the cache lookup before the disk read.');
  await assert.rejects(library.load(['unknown']), /guide/);
});
test('library rejects path escapes and duplicate identifiers', async t => {
  await assert.rejects(loadLibrary(await fixture(t, x => { x.guides[0].path = '../outside.md'; return x; })), /library/);
  await assert.rejects(loadLibrary(await fixture(t, x => { x.guides[0].id = 'policy'; return x; })), /library/);
});
test('canned openings block while legitimate technical words remain valid', () => {
  assert.ok(inspectStyle('Great question! The cache stores the value.').some(x => x.blocking && x.ruleId === 'canned-preamble'));
  assert.deepEqual(inspectStyle('The robust estimator uses a key to find the value. The packet was dropped. A lock prevents concurrent writes, but a queue preserves order.'), []);
});
test('code, quotations, identifiers, and block quotes are protected', () => {
  assert.deepEqual(inspectStyle('```text\nGreat question!\n```\n\nThe `rich tapestry` identifier is quoted.\n\n> In today\'s fast-paced world, everything changes.\n\nThe literal is "a game-changer".'), []);
});
test('contextual patterns are observations, not automatic factual edits', () => {
  const findings = inspectStyle('This is a game-changer. Experts say the service is fast.');
  assert.ok(findings.some(x => x.ruleId === 'inflated-importance' && x.blocking === false));
  assert.ok(findings.some(x => x.ruleId === 'vague-attribution'));
});
test('reused prose across answers is reported but code overlap is ignored', () => {
  const text = 'A queue is like a checkout line where each request waits for its turn.';
  assert.ok(inspectStyle(text, { previousAnswers:[text] }).some(x => x.ruleId === 'cross-answer-repetition'));
  assert.deepEqual(inspectStyle('```js\nconst answer = 42;\n```', {previousAnswers:['```js\nconst answer = 42;\n```']}), []);
});
test('prompt mode permits navigational headings but catches empty praise', () => {
  assert.deepEqual(inspectStyle('# Scope\nExplain a cache.\n## Inputs\nName the key.\n## Sequence\nTrace the lookup.\n## Evidence\nRead the code.', {mode:'prompt'}), []);
  assert.ok(inspectStyle('Great question! Explain a cache.', {mode:'prompt'}).some(x => x.blocking));
});
test('empty setup blocks answers and is omitted from prompt mode', () => {
  const text = "A race condition is two tasks reading and writing the same shared value. Here's why. Both write 6.";
  assert.ok(inspectStyle(text).some(x => x.blocking && x.ruleId === 'empty-setup-sentence'));
  assert.deepEqual(inspectStyle(text, {mode:'prompt'}).filter(x => String(x.ruleId).startsWith('empty-')), []);
});
