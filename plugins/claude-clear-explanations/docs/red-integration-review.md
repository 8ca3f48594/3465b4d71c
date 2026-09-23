# Integration review regressions
Command: node --test plugins/claude-clear-explanations/tests/integration-review.test.mjs
RED exit: 1
Three defects: late cancellation releases an answer, failed calls report zero known as total, requested model alias is returned instead of resolved identity. Existing guards and guide integrity checks pass. Tests frozen before fixes.
```text
✖ a late cancellation during audit cannot release an answer (4.1277ms)
✖ failed provider accounting is unknown instead of zero spending (0.3304ms)
✖ resolved model identity is recorded when SDK supplies it (3.2209ms)
✔ style observations require explicit contextual resolutions (0.7181ms)
✔ audit failure and malformed correction evidence fail closed (0.7814ms)
✔ all 30 guides contain reviewed teaching structure and positive runtime packages (18.0984ms)
ℹ tests 6
ℹ suites 0
ℹ pass 3
ℹ fail 3
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 82.1502

✖ failing tests:

test at plugins\claude-clear-explanations\tests\integration-review.test.mjs:14:1
✖ a late cancellation during audit cannot release an answer (4.1277ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  + actual - expected

  + 'accepted'
  - 'failed'

      at TestContext.<anonymous> (file:///C:/codingProjects/aibutgood/plugins/claude-clear-explanations/tests/integration-review.test.mjs:18:10)
      at async Test.run (node:internal/test_runner/test:1113:7)
      at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: 'accepted',
    expected: 'failed',
    operator: 'strictEqual',
    diff: 'simple'
  }

test at plugins\claude-clear-explanations\tests\integration-review.test.mjs:20:1
✖ failed provider accounting is unknown instead of zero spending (0.3304ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:

  0 !== null

      at TestContext.<anonymous> (file:///C:/codingProjects/aibutgood/plugins/claude-clear-explanations/tests/integration-review.test.mjs:23:47)
      at async Test.run (node:internal/test_runner/test:1113:7)
      at async Test.processPendingSubtests (node:internal/test_runner/test:788:7) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: 0,
    expected: null,
    operator: 'strictEqual',
    diff: 'simple'
  }

test at plugins\claude-clear-explanations\tests\integration-review.test.mjs:26:1
✖ resolved model identity is recorded when SDK supplies it (3.2209ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  + actual - expected

  + 'alias'
  - 'resolved-version'

      at TestContext.<anonymous> (file:///C:/codingProjects/aibutgood/plugins/claude-clear-explanations/tests/integration-review.test.mjs:29:10)
      at async Test.run (node:internal/test_runner/test:1113:7)
      at async Test.processPendingSubtests (node:internal/test_runner/test:788:7) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: 'alias',
    expected: 'resolved-version',
    operator: 'strictEqual',
    diff: 'simple'
  }
```
```javascript
import assert from 'node:assert/strict';
import test from 'node:test';
import {runExplanation} from '../src/runner.mjs';
import {loadLibrary} from '../src/library.mjs';
import {createClaudeClient} from '../src/claude-client.mjs';
const text='The source records a 60-second expiry.';
function harness(){
  const audits=[];const calls=[];
  return {audits,calls,options:{models:{draft:'m',route:'m',rewrite:'m',verify:'v'},maxBudgetUsd:1,audit:async record=>audits.push(record),
    library:{general:[{id:'general',text:'Explain the evidence.'}],index:[],load:async()=>[]},
    client:{async complete(c){calls.push(c);return {output:c.stage==='draft'?{draft:text,methods:[],topics:[]}:c.stage==='rewrite'?{answer:text,corrections:[]}:{accepted:true,findings:[],checkedSourceIds:['s']},costUsd:0.1,model:c.model};}}}};
}
const request={question:'What is the expiry?',sources:[{id:'s',text}]};
test('a late cancellation during audit cannot release an answer',async()=>{
  const h=harness();const controller=new AbortController();h.options.signal=controller.signal;
  h.options.audit=async()=>controller.abort();
  const result=await runExplanation(request,h.options);
  assert.equal(result.status,'failed');assert.equal(result.reason,'cancelled');assert.equal(result.answer,undefined);
});
test('failed provider accounting is unknown instead of zero spending',async()=>{
  const h=harness();h.options.client.complete=async()=>{throw new Error('transport failed');};
  const result=await runExplanation(request,h.options);
  assert.equal(result.status,'failed');assert.equal(h.audits[0].costUsd,null);
  assert.equal(h.audits[0].knownCostUsd,0);assert.equal(h.audits[0].costComplete,false);
});
test('resolved model identity is recorded when SDK supplies it',async()=>{
  const client=createClaudeClient({query:async function*(){yield {type:'result',subtype:'success',is_error:false,structured_output:{answer:'x'},total_cost_usd:0,usage:{},modelUsage:{'resolved-version':{}}};}});
  const result=await client.complete({system:'x',prompt:'x',schema:{type:'object'},model:'alias',maxBudgetUsd:1});
  assert.equal(result.model,'resolved-version');
});
test('style observations require explicit contextual resolutions',async()=>{
  const h=harness();const original=h.options.client.complete;
  h.options.client.complete=async c=>{const result=await original(c);if(c.stage==='rewrite')result.output.answer='This is a game-changer.';return result;};
  assert.equal((await runExplanation(request,h.options)).status,'failed');
});
test('audit failure and malformed correction evidence fail closed',async()=>{
  const h=harness();h.options.audit=async()=>{throw new Error('disk full');};
  assert.equal((await runExplanation(request,h.options)).reason,'audit-failed');
  const second=harness();const original=second.options.client.complete;
  second.options.client.complete=async c=>{const result=await original(c);if(c.stage==='rewrite')result.output.corrections=[{claim:'new',reason:'guess',evidenceIds:['invented']}];return result;};
  assert.equal((await runExplanation(request,second.options)).reason,'invalid-candidate');
});
test('all 30 guides contain reviewed teaching structure and positive runtime packages',async()=>{
  const library=await loadLibrary();
  assert.equal(library.general.length,2);
  assert.equal(library.index.filter(e=>e.kind==='method').length,6);
  const topics=library.index.filter(e=>e.kind==='topic');assert.equal(topics.length,30);
  assert.deepEqual(library.promptFindings,[]);
  const examples=new Set();
  for(const guide of await library.load(topics.map(e=>e.id))){
    for(const title of ['Scope','Prerequisites and distinctions','Teaching sequence','Common misconceptions','Example 1','Example 2','Analogies and limits','Sources and review'])assert.ok(guide.text.includes(`## ${title}`),`${guide.id}: ${title}`);
    assert.match(guide.text,/https:\/\//);assert.match(guide.text,/outcome evaluation pending/);
    for(const example of guide.text.matchAll(/## Example [12]\s+([\s\S]*?)(?=\n## )/g)){assert.equal(examples.has(example[1]),false);examples.add(example[1]);}
  }
  assert.equal(examples.size,60);
});

```
