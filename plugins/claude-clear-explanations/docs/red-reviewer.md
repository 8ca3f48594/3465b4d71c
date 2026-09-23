# Independent review regressions
Command: node --test plugins/claude-clear-explanations/tests/reviewer-regressions.test.mjs
RED exit: 1
Reviewer found blocking-style resolution rejection and loss of known SDK budget accounting. Main added incomplete-cost comparison regression. Tests frozen.
```text
✖ blocking style resolutions can lead to repair and a freshly approved answer (4.3602ms)
✖ SDK budget errors preserve numeric accounting without private error text (3.1599ms)
✖ comparison retains missing cost as unknown for failed runs (0.2522ms)
ℹ tests 3
ℹ suites 0
ℹ pass 0
ℹ fail 3
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 64.5216

✖ failing tests:

test at plugins\claude-clear-explanations\tests\reviewer-regressions.test.mjs:9:1
✖ blocking style resolutions can lead to repair and a freshly approved answer (4.3602ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  + actual - expected

  + 'failed'
  - 'accepted'

      at TestContext.<anonymous> (file:///C:/codingProjects/aibutgood/plugins/claude-clear-explanations/tests/reviewer-regressions.test.mjs:19:10)
      at async Test.run (node:internal/test_runner/test:1113:7)
      at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: 'failed',
    expected: 'accepted',
    operator: 'strictEqual',
    diff: 'simple'
  }

test at plugins\claude-clear-explanations\tests\reviewer-regressions.test.mjs:21:1
✖ SDK budget errors preserve numeric accounting without private error text (3.1599ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:

  null !== 0.51

      at TestContext.<anonymous> (file:///C:/codingProjects/aibutgood/plugins/claude-clear-explanations/tests/reviewer-regressions.test.mjs:25:57)
      at async Test.run (node:internal/test_runner/test:1113:7)
      at async Test.processPendingSubtests (node:internal/test_runner/test:788:7) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: null,
    expected: 0.51,
    operator: 'strictEqual',
    diff: 'simple'
  }

test at plugins\claude-clear-explanations\tests\reviewer-regressions.test.mjs:28:1
✖ comparison retains missing cost as unknown for failed runs (0.2522ms)
  Error: invalid-comparison
      at fail (file:///C:/codingProjects/aibutgood/plugins/claude-clear-explanations/src/comparison.mjs:2:23)
      at prepareComparison (file:///C:/codingProjects/aibutgood/plugins/claude-clear-explanations/src/comparison.mjs:15:106)
      at TestContext.<anonymous> (file:///C:/codingProjects/aibutgood/plugins/claude-clear-explanations/tests/reviewer-regressions.test.mjs:32:16)
      at Test.runInAsyncScope (node:async_hooks:214:14)
      at Test.run (node:internal/test_runner/test:1106:25)
      at Test.processPendingSubtests (node:internal/test_runner/test:788:18)
      at Test.postRun (node:internal/test_runner/test:1235:19)
      at Test.run (node:internal/test_runner/test:1163:12)
      at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)
```
```javascript
import assert from 'node:assert/strict';
import test from 'node:test';
import {runExplanation} from '../src/runner.mjs';
import {createClaudeClient} from '../src/claude-client.mjs';
import {prepareComparison} from '../src/comparison.mjs';
const request={question:'What happened?',draft:'The value expired.',sources:[{id:'s',text:'The value expired.'}]};
const library={general:[{id:'policy',text:'Explain the evidence.'}],index:[],load:async()=>[]};
const models={draft:'m',route:'m',rewrite:'m',verify:'m'};
test('blocking style resolutions can lead to repair and a freshly approved answer',async()=>{
  let rewrites=0;const stages=[];
  const client={async complete(call){
    stages.push(call.stage);
    const output=call.stage==='route'?{methods:[],topics:[]}:call.stage==='rewrite'?{answer:++rewrites===1?'Great question! The value expired.':'The value expired.',corrections:[]}:rewrites===1?
      {accepted:false,findings:[{kind:'style',message:'Start with the result.',evidenceIds:[]}],checkedSourceIds:['s'],styleResolutions:[{ruleId:'canned-preamble',legitimate:false,reason:'The opening adds no information.'}]}:
      {accepted:true,findings:[],checkedSourceIds:['s']};
    return {output,costUsd:0,model:call.model};
  }};
  const result=await runExplanation(request,{client,library,models,maxBudgetUsd:1,audit:async()=>{}});
  assert.equal(result.status,'accepted');assert.deepEqual(stages,['route','rewrite','verify','rewrite','verify']);
});
test('SDK budget errors preserve numeric accounting without private error text',async()=>{
  let record;
  const client=createClaudeClient({query:async function*(){yield {type:'result',subtype:'error_max_budget_usd',is_error:true,total_cost_usd:0.51,usage:{},errors:['PRIVATE']};}});
  const result=await runExplanation(request,{client,library,models,maxBudgetUsd:0.5,audit:async r=>{record=r;}});
  assert.equal(result.reason,'budget-exhausted');assert.equal(record.costUsd,0.51);assert.equal(record.costComplete,true);
  assert.equal(JSON.stringify(record).includes('PRIVATE'),false);
});
test('comparison retains missing cost as unknown for failed runs',()=>{
  const base={auditId:'a',request,models,libraryHash:'hash',guideIds:['anti-slop','clear-explanation'],latencyMs:3,candidates:[],calls:[]};
  const general={...base,costUsd:0.1,result:{status:'accepted',answer:'The value expired.'}};
  const guided={...base,costUsd:null,costComplete:false,knownCostUsd:0.03,result:{status:'failed',reason:'model-failed'}};
  const bundle=prepareComparison([{id:'c',original:request.draft,general,guided}]);
  const metrics=bundle.key[0].candidates.find(c=>c.condition==='guided');
  assert.equal(metrics.costUsd,null);assert.equal(metrics.costComplete,false);assert.equal(metrics.knownCostUsd,0.03);
});

```
