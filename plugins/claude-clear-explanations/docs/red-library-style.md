# Library and style RED evidence

Command: node --test plugins/claude-clear-explanations/tests/library-style.test.mjs
Exit status: 1
Only contract stubs existed. Six failures show missing guide loading, path validation, style findings, and reuse detection. The accepted tests are frozen for implementation.

## Output
```text
✖ library reads only selected guidance into the returned package and records content identity (5.7646ms)
✖ library rejects path escapes and duplicate identifiers (3.4003ms)
✖ canned openings block while legitimate technical words remain valid (1.9953ms)
✔ code, quotations, identifiers, and block quotes are protected (0.4138ms)
✖ contextual patterns are observations, not automatic factual edits (0.2078ms)
✖ reused prose across answers is reported but code overlap is ignored (0.1955ms)
✖ prompt mode permits navigational headings but catches empty praise (0.1457ms)
ℹ tests 7
ℹ suites 0
ℹ pass 1
ℹ fail 6
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 62.1568

✖ failing tests:

test at plugins\claude-clear-explanations\tests\library-style.test.mjs:20:1
✖ library reads only selected guidance into the returned package and records content identity (5.7646ms)
  TypeError: Cannot read properties of undefined (reading 'text')
      at TestContext.<anonymous> (file:///C:/codingProjects/aibutgood/plugins/claude-clear-explanations/tests/library-style.test.mjs:22:35)
      at async Test.run (node:internal/test_runner/test:1113:7)
      at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)

test at plugins\claude-clear-explanations\tests\library-style.test.mjs:29:1
✖ library rejects path escapes and duplicate identifiers (3.4003ms)
  AssertionError [ERR_ASSERTION]: Missing expected rejection.
      at async TestContext.<anonymous> (file:///C:/codingProjects/aibutgood/plugins/claude-clear-explanations/tests/library-style.test.mjs:30:3)
      at async Test.run (node:internal/test_runner/test:1113:7)
      at async Test.processPendingSubtests (node:internal/test_runner/test:788:7) {
    generatedMessage: false,
    code: 'ERR_ASSERTION',
    actual: undefined,
    expected: /library/,
    operator: 'rejects',
    diff: 'simple'
  }

test at plugins\claude-clear-explanations\tests\library-style.test.mjs:33:1
✖ canned openings block while legitimate technical words remain valid (1.9953ms)
  AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value:

    assert.ok(inspectStyle('Great question! The cache stores the value.').some(x => x.blocking && x.ruleId === 'canned-preamble'))

      at TestContext.<anonymous> (file:///C:/codingProjects/aibutgood/plugins/claude-clear-explanations/tests/library-style.test.mjs:34:10)
      at Test.runInAsyncScope (node:async_hooks:214:14)
      at Test.run (node:internal/test_runner/test:1106:25)
      at Test.processPendingSubtests (node:internal/test_runner/test:788:18)
      at Test.postRun (node:internal/test_runner/test:1235:19)
      at Test.run (node:internal/test_runner/test:1163:12)
      at async Test.processPendingSubtests (node:internal/test_runner/test:788:7) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: false,
    expected: true,
    operator: '==',
    diff: 'simple'
  }

test at plugins\claude-clear-explanations\tests\library-style.test.mjs:40:1
✖ contextual patterns are observations, not automatic factual edits (0.2078ms)
  AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value:

    assert.ok(findings.some(x => x.ruleId === 'inflated-importance' && x.blocking === false))

      at TestContext.<anonymous> (file:///C:/codingProjects/aibutgood/plugins/claude-clear-explanations/tests/library-style.test.mjs:42:10)
      at Test.runInAsyncScope (node:async_hooks:214:14)
      at Test.run (node:internal/test_runner/test:1106:25)
      at Test.processPendingSubtests (node:internal/test_runner/test:788:18)
      at Test.postRun (node:internal/test_runner/test:1235:19)
      at Test.run (node:internal/test_runner/test:1163:12)
      at async Test.processPendingSubtests (node:internal/test_runner/test:788:7) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: false,
    expected: true,
    operator: '==',
    diff: 'simple'
  }

test at plugins\claude-clear-explanations\tests\library-style.test.mjs:45:1
✖ reused prose across answers is reported but code overlap is ignored (0.1955ms)
  AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value:

    assert.ok(inspectStyle(text, { previousAnswers:[text] }).some(x => x.ruleId === 'cross-answer-repetition'))

      at TestContext.<anonymous> (file:///C:/codingProjects/aibutgood/plugins/claude-clear-explanations/tests/library-style.test.mjs:47:10)
      at Test.runInAsyncScope (node:async_hooks:214:14)
      at Test.run (node:internal/test_runner/test:1106:25)
      at Test.processPendingSubtests (node:internal/test_runner/test:788:18)
      at Test.postRun (node:internal/test_runner/test:1235:19)
      at Test.run (node:internal/test_runner/test:1163:12)
      at async Test.processPendingSubtests (node:internal/test_runner/test:788:7) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: false,
    expected: true,
    operator: '==',
    diff: 'simple'
  }

test at plugins\claude-clear-explanations\tests\library-style.test.mjs:50:1
✖ prompt mode permits navigational headings but catches empty praise (0.1457ms)
  AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value:

    assert.ok(inspectStyle('Great question! Explain a cache.', {mode:'prompt'}).some(x => x.blocking))

      at TestContext.<anonymous> (file:///C:/codingProjects/aibutgood/plugins/claude-clear-explanations/tests/library-style.test.mjs:52:10)
      at Test.runInAsyncScope (node:async_hooks:214:14)
      at Test.run (node:internal/test_runner/test:1106:25)
      at Test.processPendingSubtests (node:internal/test_runner/test:788:18)
      at Test.postRun (node:internal/test_runner/test:1235:19)
      at Test.run (node:internal/test_runner/test:1163:12)
      at async Test.processPendingSubtests (node:internal/test_runner/test:788:7) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: false,
    expected: true,
    operator: '==',
    diff: 'simple'
  }
```

## Exact test at RED
```javascript
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

```
