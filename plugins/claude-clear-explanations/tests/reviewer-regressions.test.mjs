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
