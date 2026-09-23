import { randomUUID, createHash } from 'node:crypto';
import { schemas, assembleSystem } from './prompts.mjs';
import { collectAnalogPairs } from './analog.mjs';
import { inspectStyle } from './style.mjs';
import { mergeSelections, rankIndex, selectGuides, splitStatedKnowledge } from './route.mjs';

const fail = code => { throw Object.assign(new Error(code), {code}); };
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const record = value => value && typeof value === 'object' && !Array.isArray(value);
const uniqueStrings = value => Array.isArray(value) && value.every(nonempty) && new Set(value).size === value.length;
const exactKeys = (value, keys) => record(value) && Object.keys(value).every(key => keys.includes(key));

function validateRequest(request, options) {
  if (!exactKeys(request, ['question','audience','sources','draft']) || !nonempty(request.question) || !Array.isArray(request.sources) ||
      request.sources.some(source => !exactKeys(source,['id','text']) || !nonempty(source.id) || !nonempty(source.text)) ||
      new Set(request.sources.map(source => source.id)).size !== request.sources.length ||
      (request.audience !== undefined && !nonempty(request.audience)) || (request.draft !== undefined && !nonempty(request.draft))) fail('invalid-request');
  if (!Number.isFinite(options.maxBudgetUsd) || options.maxBudgetUsd <= 0 || !options.client?.complete || !options.library?.load ||
      !['draft','route','rewrite','verify'].every(stage => nonempty(options.models?.[stage])) || typeof options.audit !== 'function') fail('invalid-options');
  if (options.timeoutMs !== undefined && (!Number.isFinite(options.timeoutMs) || options.timeoutMs <= 0)) fail('invalid-options');
  if (options.maxPromptBytes !== undefined && (!Number.isSafeInteger(options.maxPromptBytes) || options.maxPromptBytes <= 0)) fail('invalid-options');
}

function validateRoute(route, index, withDraft) {
  if (!exactKeys(route, withDraft ? ['draft','methods','topics'] : ['methods','topics']) ||
    !uniqueStrings(route.methods) || !uniqueStrings(route.topics) || route.methods.length > 2 || route.topics.length > 3 ||
    (withDraft && !nonempty(route.draft))) fail('invalid-routing');
  for (const [kind, ids] of [['method',route.methods],['topic',route.topics]]) {
    if (ids.some(id => !index.some(entry => entry.kind === kind && entry.id === id))) fail('invalid-routing');
  }
  return [...route.methods,...route.topics];
}

function validateCandidate(candidate, sourceIds) {
  if (!exactKeys(candidate,['answer','corrections']) || !nonempty(candidate.answer) || !Array.isArray(candidate.corrections) ||
      candidate.corrections.some(item => !exactKeys(item,['claim','reason','evidenceIds']) || !nonempty(item.claim) || !nonempty(item.reason) ||
        !uniqueStrings(item.evidenceIds) || !item.evidenceIds.length || item.evidenceIds.some(id => !sourceIds.includes(id)))) fail('invalid-candidate');
}

function validateReview(review, sourceIds, observed) {
  if (!exactKeys(review,['accepted','findings','checkedSourceIds','styleResolutions']) || typeof review.accepted !== 'boolean' ||
      !Array.isArray(review.findings) || !uniqueStrings(review.checkedSourceIds) ||
      review.checkedSourceIds.length !== sourceIds.length || sourceIds.some(id => !review.checkedSourceIds.includes(id)) ||
      review.findings.some(item => !exactKeys(item,['kind','message','evidenceIds']) || !['factual','style','coverage'].includes(item.kind) || !nonempty(item.message) ||
        !uniqueStrings(item.evidenceIds) || item.evidenceIds.some(id => !sourceIds.includes(id))) ||
      (review.accepted && review.findings.length > 0) || (!review.accepted && review.findings.length === 0)) fail('invalid-review');
  const contextual = [...new Set(observed.filter(item => !item.blocking).map(item => item.ruleId))];
  const resolutions = review.styleResolutions ?? [];
  if (!Array.isArray(resolutions) || resolutions.some(item => !exactKeys(item,['ruleId','legitimate','reason']) || !nonempty(item.ruleId) || typeof item.legitimate !== 'boolean' || !nonempty(item.reason)) ||
      new Set(resolutions.map(item => item.ruleId)).size !== resolutions.length ||
      contextual.some(id => !resolutions.some(item => item.ruleId === id)) ||
      resolutions.some(item => !observed.some(finding => finding.ruleId === item.ruleId)) ||
      (review.accepted && resolutions.some(item => !item.legitimate))) fail('invalid-review');
}

async function boundedCall(client, parameters, timeoutMs, outerSignal) {
  const controller = new AbortController();
  let timer;
  let onAbort;
  const stopped = new Promise((_, reject) => {
    onAbort = () => { controller.abort(); reject(Object.assign(new Error('cancelled'), {code:'cancelled'})); };
    outerSignal?.addEventListener('abort', onAbort, {once:true});
    timer = setTimeout(() => { controller.abort(); reject(Object.assign(new Error('timeout'), {code:'timeout'})); }, timeoutMs);
  });
  try {
    if (outerSignal?.aborted) fail('cancelled');
    return await Promise.race([client.complete({...parameters,signal:controller.signal}),stopped]);
  } finally {
    clearTimeout(timer);
    outerSignal?.removeEventListener('abort',onAbort);
  }
}

export async function runExplanation(request, options = {}) {
  const auditId = randomUUID();
  const started = Date.now();
  const audit = {version:1,auditId,startedAt:new Date(started).toISOString(),calls:[],candidates:[]};
  let guideIds = [];
  let spent = 0;
  let costComplete = true;
  let publicFindings = [];
  let result;
  const knownErrors = new Set(['invalid-request','invalid-options','invalid-routing','invalid-candidate','invalid-review','invalid-cost','budget-exhausted','prompt-too-large','prompt-policy-failed','cancelled','timeout','model-failed','audit-failed','review-failed']);
  try {
    validateRequest(request, options);
    if (options.signal?.aborted) fail('cancelled');
    const input = structuredClone(request);
    const {library} = options;
    const general = structuredClone(library.general);
    audit.request = input;
    audit.models = {...options.models};
    audit.libraryHash = library.hash ?? null;
    audit.maxBudgetUsd = options.maxBudgetUsd;
    const sourceIds = input.sources.map(source => source.id);
    const split = splitStatedKnowledge(input.question, input.audience);
    const context = {question: split.question, audience: split.audience || undefined};
    const auto = selectGuides(split.question, split.audience, library.index);
    const autoIds = [...auto.methods, ...auto.topics];
    const autoLoaded = autoIds.length
      ? (await library.load(autoIds, context)).filter(guide => guide.text.trim())
      : [];
    guideIds = [...general.map(guide => guide.id), ...autoIds];
    if (library.promptFindings?.some(item => item.blocking)) fail('prompt-policy-failed');
    async function call(stage, payload, guides) {
      if (options.signal?.aborted) fail('cancelled');
      if (spent >= options.maxBudgetUsd) fail('budget-exhausted');
      const elapsed = Date.now() - started;
      if (elapsed >= 600_000) fail('timeout');
      const system = assembleSystem(stage, guides);
      const prompt = JSON.stringify(payload);
      if (inspectStyle(system,{mode:'prompt'}).some(item => item.blocking)) fail('prompt-policy-failed');
      if (Buffer.byteLength(system + prompt + JSON.stringify(schemas[stage]),'utf8') > (options.maxPromptBytes ?? 120_000)) fail('prompt-too-large');
      const callRecord = {stage,model:options.models[stage],system,prompt,schema:schemas[stage],promptHash:createHash('sha256').update(system).update('\0').update(prompt).digest('hex')};
      audit.calls.push(callRecord);
      const tick = Date.now();
      let response;
      try {
        response = await boundedCall(options.client, {...callRecord,maxBudgetUsd:options.maxBudgetUsd-spent}, Math.min(options.timeoutMs ?? 120_000,600_000-elapsed),options.signal);
      } catch (error) {
        if (Number.isFinite(error.costUsd) && error.costUsd >= 0) {
          spent += error.costUsd;
          callRecord.costUsd = error.costUsd;
          callRecord.accounting = 'reported-on-failure';
        } else {
          costComplete = false;
          callRecord.accounting = 'unavailable';
        }
        if (['cancelled','timeout'].includes(error.code)) throw error;
        if (error.code === 'CLAUDE_BUDGET_EXCEEDED') fail('budget-exhausted');
        fail('model-failed');
      }
      callRecord.latencyMs = Date.now()-tick;
      if (!record(response) || !Number.isFinite(response.costUsd) || response.costUsd < 0) { costComplete = false; fail('invalid-cost'); }
      spent += response.costUsd;
      callRecord.costUsd = response.costUsd;
      callRecord.reportedModel = response.model;
      callRecord.usage = response.usage ?? null;
      callRecord.output = structuredClone(response.output);
      if (spent > options.maxBudgetUsd) fail('budget-exhausted');
      if (options.signal?.aborted) fail('cancelled');
      return response.output;
    }
    const stage = input.draft === undefined ? 'draft' : 'route';
    const routed = await call(stage,{...input,index:rankIndex(library.index, split.question, split.audience)},[...general,...autoLoaded]);
    validateRoute(routed,library.index,stage === 'draft');
    const merged = mergeSelections(auto, routed);
    const original = input.draft ?? routed.draft;
    const loaded = await library.load([...merged.methods, ...merged.topics], context);
    const expected = [...merged.methods, ...merged.topics];
    if (loaded.length !== expected.length || loaded.some((guide,i) => guide.id !== expected[i] || !nonempty(guide.text))) fail('invalid-routing');
    const guidance = [...general,...loaded];
    guideIds = guidance.map(guide => guide.id);
    audit.guideIds = guideIds;
    let feedback = [];
    let previousCandidate;
    for (let attempt = 0; attempt < 3; attempt++) {
      const candidate = await call('rewrite',{...input,original,previousCandidate,feedback},guidance);
      validateCandidate(candidate,sourceIds);
      const observed = inspectStyle(candidate.answer,{previousAnswers:options.previousAnswers ?? [], bindings: loaded.flatMap(guide => collectAnalogPairs(guide.text))});
      const review = await call('verify',{...input,original,candidate,observedStyle:observed},[]);
      validateReview(review,sourceIds,observed);
      audit.candidates.push({attempt,answer:candidate.answer,corrections:candidate.corrections,observedStyle:observed,review});
      const blockingStyle = observed.filter(item => item.blocking);
      publicFindings = [...review.findings.map(item => ({kind:item.kind,code:`unresolved-${item.kind}`})),...blockingStyle.map(item => ({kind:'style',code:item.ruleId}))];
      if (review.accepted && !blockingStyle.length) {
        result = {status:'accepted',answer:candidate.answer,guideIds,findings:[],auditId};
        break;
      }
      feedback = [...review.findings,...blockingStyle.map(item => ({kind:'style',message:item.message,evidenceIds:[]}))];
      previousCandidate = candidate.answer;
    }
    if (!result) fail('review-failed');
  } catch (error) {
    result = {status:'failed',reason:knownErrors.has(error.code) ? error.code : 'model-failed',guideIds,findings:publicFindings,auditId};
  }
  // A reviewed candidate is not accepted history until persistence is complete.
  audit.result = result.status === 'accepted'
    ? {status:'pending',guideIds,findings:[],auditId}
    : result;
  audit.costUsd = costComplete ? spent : null;
  audit.knownCostUsd = spent;
  audit.costComplete = costComplete;
  audit.costBasis = 'SDK estimate; not a billing statement';
  audit.latencyMs = Date.now()-started;
  try { await options.audit?.(audit); }
  catch { return {status:'failed',reason:'audit-failed',guideIds,findings:[],auditId}; }
  if (options.signal?.aborted) {
    result = {status:'failed',reason:'cancelled',guideIds,findings:[],auditId};
  }
  if (audit.result !== result) {
    // Commit point: cancellation is observed before, not during, this atomic final write.
    audit.result = result;
    audit.finalizationStartedAt = new Date().toISOString();
    try { await options.audit?.(audit); }
    catch { return {status:'failed',reason:'audit-failed',guideIds,findings:[],auditId}; }
  }
  return result;
}
