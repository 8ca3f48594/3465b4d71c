import { randomInt } from 'node:crypto';
const fail=()=>{throw new Error('invalid-comparison');};
const canonical=value=>JSON.stringify(value);
function originalOf(run){return run.request?.draft ?? run.calls?.find(c=>c.stage==='draft')?.output?.draft;}
export function prepareComparison(cases) {
  if(!Array.isArray(cases)||!cases.length||new Set(cases.map(c=>c.id)).size!==cases.length)fail();
  const review=[];const key=[];
  for(const item of cases){
    const {id,original,general,guided}=item;
    if(typeof id!=='string'||!id.trim()||typeof original!=='string'||!original.trim()||!general?.request||!guided?.request)fail();
    if(originalOf(general)!==original||originalOf(guided)!==original||canonical(general.request)!==canonical(guided.request)||
      canonical(general.models)!==canonical(guided.models)||general.libraryHash!==guided.libraryHash||
      !Array.isArray(general.guideIds)||general.guideIds.length!==2||!['anti-slop','clear-explanation'].every(v=>general.guideIds.includes(v)))fail();
    for(const run of [general,guided])if(!['accepted','failed'].includes(run.result?.status)||!(Number.isFinite(run.costUsd)||(run.result.status==='failed'&&run.costUsd===null&&run.costComplete===false))||!Number.isFinite(run.latencyMs)||
      (run.result.status==='accepted'&&(typeof run.result.answer!=='string'||!run.result.answer.trim())))fail();
    const candidates=[{condition:'original',answer:original,status:'original'},
      ...[['general',general],['guided',guided]].map(([condition,run])=>({condition,run,status:run.result.status,...(run.result.status==='accepted'?{answer:run.result.answer}:{})}))];
    for(let i=candidates.length-1;i>0;i--){const j=randomInt(i+1);[candidates[i],candidates[j]]=[candidates[j],candidates[i]];}
    review.push({id,question:general.request.question,...(general.request.audience!==undefined?{audience:general.request.audience}:{}),sources:general.request.sources,candidates:candidates.map((c,i)=>({label:'ABC'[i],status:c.status==='failed'?'failed':'available',...(c.answer?{answer:c.answer}:{})})),preferred:null,clarity:null,usefulDetail:null,factualDefects:[],notes:''});
    key.push({id,candidates:candidates.map((c,i)=>({label:'ABC'[i],condition:c.condition,...(c.run?{auditId:c.run.auditId,accepted:c.status==='accepted',firstPassAccepted:c.status==='accepted'&&c.run.candidates?.length===1,costUsd:c.run.costUsd,costComplete:c.run.costComplete??true,knownCostUsd:c.run.knownCostUsd??c.run.costUsd,latencyMs:c.run.latencyMs,guideIds:c.run.guideIds,models:c.run.models}:{accepted:null})}))});
  }
  return {version:1,review,key};
}
