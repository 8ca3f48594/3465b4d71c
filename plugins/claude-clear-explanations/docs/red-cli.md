# CLI RED evidence
Command: node --test plugins/claude-clear-explanations/tests/cli.test.mjs
Exit: 1
Inert CLI returned status 1 without any IO. Tests are frozen before behavior implementation.
```text
✖ CLI releases one accepted result and stores complete local audit with evidence (5.6494ms)
✖ CLI failure contains no candidate or reviewer quotation (2.6538ms)
✖ CLI requires explicit valid model and budget before model calls (2.1486ms)
✖ general-only comparison mode excludes topic and method selection (1.7931ms)
✖ unreadable sources never trigger a model call or leak file contents (2.0446ms)
✖ history scans only completed accepted records (1.6255ms)
ℹ tests 6
ℹ suites 0
ℹ pass 0
ℹ fail 6
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 72.0453

✖ failing tests:

test at plugins\claude-clear-explanations\tests\cli.test.mjs:19:1
✖ CLI releases one accepted result and stores complete local audit with evidence (5.6494ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:

  1 !== 0

      at TestContext.<anonymous> (file:///C:/codingProjects/aibutgood/plugins/claude-clear-explanations/tests/cli.test.mjs:21:10)
      at async Test.run (node:internal/test_runner/test:1113:7)
      at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: 1,
    expected: 0,
    operator: 'strictEqual',
    diff: 'simple'
  }

test at plugins\claude-clear-explanations\tests\cli.test.mjs:31:1
✖ CLI failure contains no candidate or reviewer quotation (2.6538ms)
  SyntaxError: Unexpected end of JSON input
      at JSON.parse (<anonymous>)
      at TestContext.<anonymous> (file:///C:/codingProjects/aibutgood/plugins/claude-clear-explanations/tests/cli.test.mjs:35:21)
      at async Test.run (node:internal/test_runner/test:1113:7)
      at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)

test at plugins\claude-clear-explanations\tests\cli.test.mjs:39:1
✖ CLI requires explicit valid model and budget before model calls (2.1486ms)
  AssertionError [ERR_ASSERTION]: The input did not match the regular expression /invalid-options/. Input:

  ''

      at TestContext.<anonymous> (file:///C:/codingProjects/aibutgood/plugins/claude-clear-explanations/tests/cli.test.mjs:43:10)
      at async Test.run (node:internal/test_runner/test:1113:7)
      at async Test.processPendingSubtests (node:internal/test_runner/test:788:7) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: '',
    expected: /invalid-options/,
    operator: 'match',
    diff: 'simple'
  }

test at plugins\claude-clear-explanations\tests\cli.test.mjs:45:1
✖ general-only comparison mode excludes topic and method selection (1.7931ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:

  1 !== 0

      at TestContext.<anonymous> (file:///C:/codingProjects/aibutgood/plugins/claude-clear-explanations/tests/cli.test.mjs:47:10)
      at async Test.run (node:internal/test_runner/test:1113:7)
      at async Test.processPendingSubtests (node:internal/test_runner/test:788:7) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: 1,
    expected: 0,
    operator: 'strictEqual',
    diff: 'simple'
  }

test at plugins\claude-clear-explanations\tests\cli.test.mjs:51:1
✖ unreadable sources never trigger a model call or leak file contents (2.0446ms)
  SyntaxError: Unexpected end of JSON input
      at JSON.parse (<anonymous>)
      at TestContext.<anonymous> (file:///C:/codingProjects/aibutgood/plugins/claude-clear-explanations/tests/cli.test.mjs:56:21)
      at async Test.run (node:internal/test_runner/test:1113:7)
      at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)

test at plugins\claude-clear-explanations\tests\cli.test.mjs:58:1
✖ history scans only completed accepted records (1.6255ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:

  1 !== 0

      at TestContext.<anonymous> (file:///C:/codingProjects/aibutgood/plugins/claude-clear-explanations/tests/cli.test.mjs:60:10)
      at async Test.run (node:internal/test_runner/test:1113:7)
      at async Test.processPendingSubtests (node:internal/test_runner/test:788:7) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: 1,
    expected: 0,
    operator: 'strictEqual',
    diff: 'simple'
  }
```
## Exact test snapshot
```javascript
import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { main } from '../src/cli.mjs';

async function fixture(t, review = {accepted:true,findings:[],checkedSourceIds:['source']}) {
  const dir=await mkdtemp(join(tmpdir(),'explain-cli-'));
  t.after(()=>rm(dir,{recursive:true,force:true}));
  await writeFile(join(dir,'source.txt'),'The cache expires after 60 seconds.');
  await writeFile(join(dir,'request.json'),JSON.stringify({question:'When does the cache expire?',sources:[{id:'source',path:'source.txt'}]}));
  const calls=[];
  const output=[];
  const client={async complete(call){ calls.push(call); return {output:call.stage==='draft'?{draft:'PRIVATE DRAFT',methods:[],topics:[]}:call.stage==='rewrite'?{answer:'The cache expires after 60 seconds.',corrections:[]}:review,costUsd:0,model:call.model};}};
  const args=['--request',join(dir,'request.json'),'--model','test-model','--budget-usd','1','--audit-dir',join(dir,'runs'),'--json'];
  return {dir,args,client,calls,output,io:{client,write:text=>output.push(text)}};
}
test('CLI releases one accepted result and stores complete local audit with evidence',async t=>{
  const h=await fixture(t);
  assert.equal(await main(h.args,h.io),0);
  const result=JSON.parse(h.output.join(''));
  assert.equal(result.status,'accepted');
  assert.equal(result.answer,'The cache expires after 60 seconds.');
  assert.equal(h.output.join('').includes('PRIVATE DRAFT'),false);
  const audit=JSON.parse(await readFile(join(h.dir,'runs',result.auditId,'run.json'),'utf8'));
  assert.equal(audit.request.sources[0].text,'The cache expires after 60 seconds.');
  assert.equal(audit.calls.length,3);
  assert.ok(audit.calls[0].promptHash);
});
test('CLI failure contains no candidate or reviewer quotation',async t=>{
  const h=await fixture(t,{accepted:false,findings:[{kind:'factual',message:'PRIVATE REVIEW',evidenceIds:['source']}],checkedSourceIds:['source']});
  assert.equal(await main(h.args,h.io),1);
  const text=h.output.join('');
  assert.equal(JSON.parse(text).status,'failed');
  assert.equal(text.includes('PRIVATE'),false);
  assert.equal(text.includes('The cache expires'),false);
});
test('CLI requires explicit valid model and budget before model calls',async t=>{
  const h=await fixture(t);
  assert.equal(await main(['--request',join(h.dir,'request.json')],h.io),1);
  assert.equal(h.calls.length,0);
  assert.match(h.output.join(''),/invalid-options/);
});
test('general-only comparison mode excludes topic and method selection',async t=>{
  const h=await fixture(t);
  assert.equal(await main([...h.args,'--general-only'],h.io),0);
  assert.deepEqual(JSON.parse(h.output.join('')).guideIds,['anti-slop','clear-explanation']);
  assert.deepEqual(JSON.parse(h.calls[0].prompt).index,[]);
});
test('unreadable sources never trigger a model call or leak file contents',async t=>{
  const h=await fixture(t);
  await writeFile(join(h.dir,'request.json'),JSON.stringify({question:'Explain',sources:[{id:'source',path:'missing.txt'}]}));
  assert.equal(await main(h.args,h.io),1);
  assert.equal(h.calls.length,0);
  assert.equal(JSON.parse(h.output.join('')).reason,'invalid-request-file');
});
test('history scans only completed accepted records',async t=>{
  const h=await fixture(t);
  assert.equal(await main(h.args,h.io),0);
  const list=await readdir(join(h.dir,'runs'));
  assert.equal(list.length,1);
  assert.equal(await main(h.args,h.io),1);
  assert.ok(h.calls.at(-1).prompt.includes('cross-answer-repetition'));
});

```
## Corrected fixture before implementation
The initial history case incorrectly expected a seven-word factual sentence to trigger the deliberate twelve-word reuse threshold. Extended its mock answer; this preserves the intended history behavior without making short factual answers false positives. No CLI implementation has started.
Exit: 1
```text
✖ CLI releases one accepted result and stores complete local audit with evidence (6.4859ms)
✖ CLI failure contains no candidate or reviewer quotation (3.3251ms)
✖ CLI requires explicit valid model and budget before model calls (2.2637ms)
✖ general-only comparison mode excludes topic and method selection (1.8554ms)
✖ unreadable sources never trigger a model call or leak file contents (2.2856ms)
✖ history scans only completed accepted records (2.0615ms)
ℹ tests 6
ℹ suites 0
ℹ pass 0
ℹ fail 6
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 81.8688

✖ failing tests:

test at plugins\claude-clear-explanations\tests\cli.test.mjs:19:1
✖ CLI releases one accepted result and stores complete local audit with evidence (6.4859ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:

  1 !== 0

      at TestContext.<anonymous> (file:///C:/codingProjects/aibutgood/plugins/claude-clear-explanations/tests/cli.test.mjs:21:10)
      at async Test.run (node:internal/test_runner/test:1113:7)
      at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: 1,
    expected: 0,
    operator: 'strictEqual',
    diff: 'simple'
  }

test at plugins\claude-clear-explanations\tests\cli.test.mjs:31:1
✖ CLI failure contains no candidate or reviewer quotation (3.3251ms)
  SyntaxError: Unexpected end of JSON input
      at JSON.parse (<anonymous>)
      at TestContext.<anonymous> (file:///C:/codingProjects/aibutgood/plugins/claude-clear-explanations/tests/cli.test.mjs:35:21)
      at async Test.run (node:internal/test_runner/test:1113:7)
      at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)

test at plugins\claude-clear-explanations\tests\cli.test.mjs:39:1
✖ CLI requires explicit valid model and budget before model calls (2.2637ms)
  AssertionError [ERR_ASSERTION]: The input did not match the regular expression /invalid-options/. Input:

  ''

      at TestContext.<anonymous> (file:///C:/codingProjects/aibutgood/plugins/claude-clear-explanations/tests/cli.test.mjs:43:10)
      at async Test.run (node:internal/test_runner/test:1113:7)
      at async Test.processPendingSubtests (node:internal/test_runner/test:788:7) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: '',
    expected: /invalid-options/,
    operator: 'match',
    diff: 'simple'
  }

test at plugins\claude-clear-explanations\tests\cli.test.mjs:45:1
✖ general-only comparison mode excludes topic and method selection (1.8554ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:

  1 !== 0

      at TestContext.<anonymous> (file:///C:/codingProjects/aibutgood/plugins/claude-clear-explanations/tests/cli.test.mjs:47:10)
      at async Test.run (node:internal/test_runner/test:1113:7)
      at async Test.processPendingSubtests (node:internal/test_runner/test:788:7) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: 1,
    expected: 0,
    operator: 'strictEqual',
    diff: 'simple'
  }

test at plugins\claude-clear-explanations\tests\cli.test.mjs:51:1
✖ unreadable sources never trigger a model call or leak file contents (2.2856ms)
  SyntaxError: Unexpected end of JSON input
      at JSON.parse (<anonymous>)
      at TestContext.<anonymous> (file:///C:/codingProjects/aibutgood/plugins/claude-clear-explanations/tests/cli.test.mjs:56:21)
      at async Test.run (node:internal/test_runner/test:1113:7)
      at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)

test at plugins\claude-clear-explanations\tests\cli.test.mjs:58:1
✖ history scans only completed accepted records (2.0615ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:

  1 !== 0

      at TestContext.<anonymous> (file:///C:/codingProjects/aibutgood/plugins/claude-clear-explanations/tests/cli.test.mjs:60:10)
      at async Test.run (node:internal/test_runner/test:1113:7)
      at async Test.processPendingSubtests (node:internal/test_runner/test:788:7) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: 1,
    expected: 0,
    operator: 'strictEqual',
    diff: 'simple'
  }
```
```javascript
import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { main } from '../src/cli.mjs';

async function fixture(t, review = {accepted:true,findings:[],checkedSourceIds:['source']}) {
  const dir=await mkdtemp(join(tmpdir(),'explain-cli-'));
  t.after(()=>rm(dir,{recursive:true,force:true}));
  await writeFile(join(dir,'source.txt'),'The cache expires after 60 seconds.');
  await writeFile(join(dir,'request.json'),JSON.stringify({question:'When does the cache expire?',sources:[{id:'source',path:'source.txt'}]}));
  const calls=[];
  const output=[];
  const client={async complete(call){ calls.push(call); return {output:call.stage==='draft'?{draft:'PRIVATE DRAFT',methods:[],topics:[]}:call.stage==='rewrite'?{answer:'The cache expires after 60 seconds, so a later request must read a new value from its source.',corrections:[]}:review,costUsd:0,model:call.model};}};
  const args=['--request',join(dir,'request.json'),'--model','test-model','--budget-usd','1','--audit-dir',join(dir,'runs'),'--json'];
  return {dir,args,client,calls,output,io:{client,write:text=>output.push(text)}};
}
test('CLI releases one accepted result and stores complete local audit with evidence',async t=>{
  const h=await fixture(t);
  assert.equal(await main(h.args,h.io),0);
  const result=JSON.parse(h.output.join(''));
  assert.equal(result.status,'accepted');
  assert.equal(result.answer,'The cache expires after 60 seconds, so a later request must read a new value from its source.');
  assert.equal(h.output.join('').includes('PRIVATE DRAFT'),false);
  const audit=JSON.parse(await readFile(join(h.dir,'runs',result.auditId,'run.json'),'utf8'));
  assert.equal(audit.request.sources[0].text,'The cache expires after 60 seconds.');
  assert.equal(audit.calls.length,3);
  assert.ok(audit.calls[0].promptHash);
});
test('CLI failure contains no candidate or reviewer quotation',async t=>{
  const h=await fixture(t,{accepted:false,findings:[{kind:'factual',message:'PRIVATE REVIEW',evidenceIds:['source']}],checkedSourceIds:['source']});
  assert.equal(await main(h.args,h.io),1);
  const text=h.output.join('');
  assert.equal(JSON.parse(text).status,'failed');
  assert.equal(text.includes('PRIVATE'),false);
  assert.equal(text.includes('The cache expires'),false);
});
test('CLI requires explicit valid model and budget before model calls',async t=>{
  const h=await fixture(t);
  assert.equal(await main(['--request',join(h.dir,'request.json')],h.io),1);
  assert.equal(h.calls.length,0);
  assert.match(h.output.join(''),/invalid-options/);
});
test('general-only comparison mode excludes topic and method selection',async t=>{
  const h=await fixture(t);
  assert.equal(await main([...h.args,'--general-only'],h.io),0);
  assert.deepEqual(JSON.parse(h.output.join('')).guideIds,['anti-slop','clear-explanation']);
  assert.deepEqual(JSON.parse(h.calls[0].prompt).index,[]);
});
test('unreadable sources never trigger a model call or leak file contents',async t=>{
  const h=await fixture(t);
  await writeFile(join(h.dir,'request.json'),JSON.stringify({question:'Explain',sources:[{id:'source',path:'missing.txt'}]}));
  assert.equal(await main(h.args,h.io),1);
  assert.equal(h.calls.length,0);
  assert.equal(JSON.parse(h.output.join('')).reason,'invalid-request-file');
});
test('history scans only completed accepted records',async t=>{
  const h=await fixture(t);
  assert.equal(await main(h.args,h.io),0);
  const list=await readdir(join(h.dir,'runs'));
  assert.equal(list.length,1);
  assert.equal(await main(h.args,h.io),1);
  assert.ok(h.calls.at(-1).prompt.includes('cross-answer-repetition'));
});

```
