# Comparison RED evidence
Command: node --test plugins/claude-clear-explanations/tests/comparison.test.mjs
Exit: 1
The contract stub returns empty review/key arrays; no comparison behavior existed. Tests are frozen.
```text
✖ comparison hides conditions and records usage without choosing a winner (1.1639ms)
✖ mismatched requests, originals, models and ablation conditions cannot be compared (0.365ms)
✖ failed candidates stay in metrics but private drafts do not enter review sheets (0.57ms)
✖ empty and duplicate case sets are rejected (0.0984ms)
ℹ tests 4
ℹ suites 0
ℹ pass 0
ℹ fail 4
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 53.9298

✖ failing tests:

test at plugins\claude-clear-explanations\tests\comparison.test.mjs:9:1
✖ comparison hides conditions and records usage without choosing a winner (1.1639ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:

  0 !== 1

      at TestContext.<anonymous> (file:///C:/codingProjects/aibutgood/plugins/claude-clear-explanations/tests/comparison.test.mjs:11:10)
      at Test.runInAsyncScope (node:async_hooks:214:14)
      at Test.run (node:internal/test_runner/test:1106:25)
      at Test.start (node:internal/test_runner/test:1003:17)
      at startSubtestAfterBootstrap (node:internal/test_runner/harness:358:17) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: 0,
    expected: 1,
    operator: 'strictEqual',
    diff: 'simple'
  }

test at plugins\claude-clear-explanations\tests\comparison.test.mjs:18:1
✖ mismatched requests, originals, models and ablation conditions cannot be compared (0.365ms)
  AssertionError [ERR_ASSERTION]: Missing expected exception.
      at TestContext.<anonymous> (file:///C:/codingProjects/aibutgood/plugins/claude-clear-explanations/tests/comparison.test.mjs:20:43)
      at Test.runInAsyncScope (node:async_hooks:214:14)
      at Test.run (node:internal/test_runner/test:1106:25)
      at Test.processPendingSubtests (node:internal/test_runner/test:788:18)
      at Test.postRun (node:internal/test_runner/test:1235:19)
      at Test.run (node:internal/test_runner/test:1163:12)
      at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3) {
    generatedMessage: false,
    code: 'ERR_ASSERTION',
    actual: undefined,
    expected: /comparison/,
    operator: 'throws',
    diff: 'simple'
  }

test at plugins\claude-clear-explanations\tests\comparison.test.mjs:23:1
✖ failed candidates stay in metrics but private drafts do not enter review sheets (0.57ms)
  TypeError: Cannot read properties of undefined (reading 'candidates')
      at TestContext.<anonymous> (file:///C:/codingProjects/aibutgood/plugins/claude-clear-explanations/tests/comparison.test.mjs:26:33)
      at Test.runInAsyncScope (node:async_hooks:214:14)
      at Test.run (node:internal/test_runner/test:1106:25)
      at Test.processPendingSubtests (node:internal/test_runner/test:788:18)
      at Test.postRun (node:internal/test_runner/test:1235:19)
      at Test.run (node:internal/test_runner/test:1163:12)
      at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)

test at plugins\claude-clear-explanations\tests\comparison.test.mjs:30:1
✖ empty and duplicate case sets are rejected (0.0984ms)
  AssertionError [ERR_ASSERTION]: Missing expected exception.
      at TestContext.<anonymous> (file:///C:/codingProjects/aibutgood/plugins/claude-clear-explanations/tests/comparison.test.mjs:31:10)
      at Test.runInAsyncScope (node:async_hooks:214:14)
      at Test.run (node:internal/test_runner/test:1106:25)
      at Test.processPendingSubtests (node:internal/test_runner/test:788:18)
      at Test.postRun (node:internal/test_runner/test:1235:19)
      at Test.run (node:internal/test_runner/test:1163:12)
      at async Test.processPendingSubtests (node:internal/test_runner/test:788:7) {
    generatedMessage: false,
    code: 'ERR_ASSERTION',
    actual: undefined,
    expected: /comparison/,
    operator: 'throws',
    diff: 'simple'
  }
```
```javascript
import assert from 'node:assert/strict';
import test from 'node:test';
import {prepareComparison} from '../src/comparison.mjs';
const original='A cache holds a value.';
function run(guideIds,answer,status='accepted') {
  return {auditId:answer,request:{question:'What is a cache?',sources:[{id:'s',text:original}],draft:original},models:{rewrite:'m',verify:'v'},libraryHash:'hash',guideIds,costUsd:0.2,latencyMs:12,candidates:[{}],calls:[],result:status==='accepted'?{status,answer}:{status,reason:'review-failed'}};
}
const item=()=>({id:'case-1',original,general:run(['anti-slop','clear-explanation'],'General answer.'),guided:run(['anti-slop','clear-explanation','databases-storage'],'Guided answer.')});
test('comparison hides conditions and records usage without choosing a winner',()=>{
  const bundle=prepareComparison([item()]);
  assert.equal(bundle.review.length,1);
  assert.deepEqual(new Set(bundle.review[0].candidates.map(c=>c.label)),new Set(['A','B','C']));
  assert.equal(bundle.review[0].preferred,null);
  assert.equal(JSON.stringify(bundle.review).includes('guideIds'),false);
  assert.equal(bundle.key[0].candidates.length,3);
  assert.equal(bundle.key[0].candidates.find(c=>c.condition==='guided').costUsd,0.2);
});
test('mismatched requests, originals, models and ablation conditions cannot be compared',()=>{
  for(const mutate of [x=>x.guided.request.question='Different',x=>x.guided.request.draft='Different',x=>x.guided.models.rewrite='other',x=>x.general.guideIds.push('topic')]){
    const data=item();mutate(data);assert.throws(()=>prepareComparison([data]),/comparison/);
  }
});
test('failed candidates stay in metrics but private drafts do not enter review sheets',()=>{
  const data=item();data.guided=run(['anti-slop','clear-explanation'],'PRIVATE', 'failed');
  const bundle=prepareComparison([data]);
  assert.equal(bundle.review[0].candidates.some(c=>c.status==='failed'),true);
  assert.equal(JSON.stringify(bundle.review).includes('PRIVATE'),false);
  assert.equal(bundle.key[0].candidates.find(c=>c.condition==='guided').accepted,false);
});
test('empty and duplicate case sets are rejected',()=>{
  assert.throws(()=>prepareComparison([]),/comparison/);
  assert.throws(()=>prepareComparison([item(),item()]),/comparison/);
});

```
