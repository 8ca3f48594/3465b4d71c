import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {runExplanation} from '../src/runner.mjs';
import {auditWriter, acceptedHistory} from '../src/audit.mjs';

test('cancellation during audit persistence excludes the unreleased answer from accepted history', async t => {
  const root = await mkdtemp(join(tmpdir(), 'explain-audit-cancel-'));
  t.after(() => rm(root, {recursive:true, force:true}));
  const controller = new AbortController();
  const persist = auditWriter(root);
  const answer = 'The cache expires after 60 seconds.';
  const result = await runExplanation({
    question:'When does the cache expire?',
    sources:[{id:'source', text:answer}],
  }, {
    models:{draft:'test', route:'test', rewrite:'test', verify:'test'},
    maxBudgetUsd:1,
    signal:controller.signal,
    library:{general:[{id:'general', text:'Explain the evidence.'}], index:[], load:async () => []},
    client:{async complete(call) {
      const output = call.stage === 'draft'
        ? {draft:answer, methods:[], topics:[]}
        : call.stage === 'rewrite'
          ? {answer, corrections:[]}
          : {accepted:true, findings:[], checkedSourceIds:['source']};
      return {output, costUsd:0, model:call.model};
    }},
    audit:async record => {
      await persist(record);
      controller.abort();
    },
  });
  assert.equal(result.status, 'failed');
  assert.equal(result.reason, 'cancelled');
  assert.equal(result.answer, undefined);
  assert.deepEqual(await acceptedHistory(root), []);
  const stored = JSON.parse(await readFile(join(root, result.auditId, 'run.json'), 'utf8'));
  assert.equal(stored.result.status, 'failed');
  assert.equal(stored.result.reason, 'cancelled');
  assert.equal(stored.result.answer, undefined);
});

test('failed final audit persistence leaves no accepted history for an unreleased answer', async t => {
  const root = await mkdtemp(join(tmpdir(), 'explain-audit-failed-final-'));
  t.after(() => rm(root, {recursive:true, force:true}));
  const controller = new AbortController();
  const persist = auditWriter(root);
  const answer = 'The cache expires after 60 seconds.';
  let writes = 0;
  const result = await runExplanation({
    question:'When does the cache expire?',
    sources:[{id:'source', text:answer}],
  }, {
    models:{draft:'test', route:'test', rewrite:'test', verify:'test'},
    maxBudgetUsd:1,
    signal:controller.signal,
    library:{general:[{id:'general', text:'Explain the evidence.'}], index:[], load:async () => []},
    client:{async complete(call) {
      const output = call.stage === 'draft'
        ? {draft:answer, methods:[], topics:[]}
        : call.stage === 'rewrite'
          ? {answer, corrections:[]}
          : {accepted:true, findings:[], checkedSourceIds:['source']};
      return {output, costUsd:0, model:call.model};
    }},
    audit:async record => {
      if (++writes === 2) throw new Error('simulated storage failure');
      await persist(record);
      controller.abort();
    },
  });
  assert.equal(result.status, 'failed');
  assert.equal(result.reason, 'audit-failed');
  assert.equal(result.answer, undefined);
  assert.deepEqual(await acceptedHistory(root), []);
});

for (const cancelDuringFinalization of [false, true]) {
  test(cancelDuringFinalization
    ? 'cancellation after the finalization commit point preserves the persisted accepted result'
    : 'normal acceptance persists pending state before its accepted result', async t => {
    const root = await mkdtemp(join(tmpdir(), 'explain-audit-commit-'));
    t.after(() => rm(root, {recursive:true, force:true}));
    const controller = new AbortController();
    const persist = auditWriter(root);
    const answer = 'The cache expires after 60 seconds.';
    const storedResults = [];
    const history = [];
    const result = await runExplanation({
      question:'When does the cache expire?',
      sources:[{id:'source', text:answer}],
    }, {
      models:{draft:'test', route:'test', rewrite:'test', verify:'test'},
      maxBudgetUsd:1,
      signal:controller.signal,
      library:{general:[{id:'general', text:'Explain the evidence.'}], index:[], load:async () => []},
      client:{async complete(call) {
        const output = call.stage === 'draft'
          ? {draft:answer, methods:[], topics:[]}
          : call.stage === 'rewrite'
            ? {answer, corrections:[]}
            : {accepted:true, findings:[], checkedSourceIds:['source']};
        return {output, costUsd:0, model:call.model};
      }},
      audit:async record => {
        // The second callback runs after the runner's documented commit point.
        if (storedResults.length === 1 && cancelDuringFinalization) controller.abort();
        await persist(record);
        const stored = JSON.parse(await readFile(join(root, record.auditId, 'run.json'), 'utf8'));
        storedResults.push(stored.result);
        history.push(await acceptedHistory(root));
      },
    });
    assert.deepEqual(storedResults.map(item => item.status), ['pending', 'accepted']);
    assert.equal(storedResults[0].answer, undefined);
    assert.deepEqual(history, [[], [answer]]);
    assert.equal(result.status, 'accepted');
    assert.equal(result.answer, answer);
    assert.deepEqual(storedResults[1], result);
    assert.equal(controller.signal.aborted, cancelDuringFinalization);
  });
}
