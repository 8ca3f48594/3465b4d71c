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
