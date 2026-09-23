# RED evidence: audit cancellation and comparison audience

## Final verification

The accepted regression tests remained unchanged during the production fix.
The runner first persists a pending result, with no result answer. It checks
cancellation after that persistence. Finalization starts before the final
atomic write. Cancellation after that point does not reverse the accepted
decision. The returned result and persisted result agree. A failed final write
leaves the pending record outside accepted history.

Two additional characterization cases check normal pending-to-accepted
persistence and cancellation after the finalization cutoff. They inspect real
audit files and accepted history after each write.

Final command:

```powershell
node --test tests/audit-cancellation.test.mjs tests/comparison-audience.test.mjs
```

Exit status: 0. Tests: 5. Pass: 5. Fail: 0. These tests establish persistence
behavior, not delivery to an external terminal consumer or explanation quality.

Date: 2026-09-16. The initial regression tests below were run before production changes.

## Command and result

Run from the plugin directory:

```powershell
node --test tests/audit-cancellation.test.mjs tests/comparison-audience.test.mjs
```

Exit status: 1. Tests: 2. Pass: 0. Fail: 2.

The audit test used the real audit writer and history reader. Its injected audit
callback persisted the record, then cancelled the run. The runner returned a
cancelled failure with no answer, but acceptedHistory returned the unreleased
answer. The expected history was an empty array. The stored record also needs a
failed result after reconciliation; the earlier history assertion failed first.

The comparison test supplied the same established reader knowledge to both
conditions. The blind review case had an undefined audience instead of the
supplied string. This prevents a reviewer from judging the explanation against
the reader's stated understanding.

Relevant failures:

```text
cancellation during audit persistence excludes the unreleased answer from accepted history
actual: [ 'The cache expires after 60 seconds.' ]
expected: []

blind comparison preserves the reader knowledge used for both explanations
actual: undefined
expected: 'I understand saving a file and making a commit. Use the painting example to explain branches.'
```

## Exact test additions

```diff
diff --git a/tests/audit-cancellation.test.mjs b/tests/audit-cancellation.test.mjs
new file mode 100644
--- /dev/null
+++ b/tests/audit-cancellation.test.mjs
@@ -0,0 +1,44 @@
+import assert from 'node:assert/strict';
+import test from 'node:test';
+import {mkdtemp, readFile, rm} from 'node:fs/promises';
+import {tmpdir} from 'node:os';
+import {join} from 'node:path';
+import {runExplanation} from '../src/runner.mjs';
+import {auditWriter, acceptedHistory} from '../src/audit.mjs';
+
+test('cancellation during audit persistence excludes the unreleased answer from accepted history', async t => {
+  const root = await mkdtemp(join(tmpdir(), 'explain-audit-cancel-'));
+  t.after(() => rm(root, {recursive:true, force:true}));
+  const controller = new AbortController();
+  const persist = auditWriter(root);
+  const answer = 'The cache expires after 60 seconds.';
+  const result = await runExplanation({
+    question:'When does the cache expire?',
+    sources:[{id:'source', text:answer}],
+  }, {
+    models:{draft:'test', route:'test', rewrite:'test', verify:'test'},
+    maxBudgetUsd:1,
+    signal:controller.signal,
+    library:{general:[{id:'general', text:'Explain the evidence.'}], index:[], load:async () => []},
+    client:{async complete(call) {
+      const output = call.stage === 'draft'
+        ? {draft:answer, methods:[], topics:[]}
+        : call.stage === 'rewrite'
+          ? {answer, corrections:[]}
+          : {accepted:true, findings:[], checkedSourceIds:['source']};
+      return {output, costUsd:0, model:call.model};
+    }},
+    audit:async record => {
+      await persist(record);
+      controller.abort();
+    },
+  });
+  assert.equal(result.status, 'failed');
+  assert.equal(result.reason, 'cancelled');
+  assert.equal(result.answer, undefined);
+  assert.deepEqual(await acceptedHistory(root), []);
+  const stored = JSON.parse(await readFile(join(root, result.auditId, 'run.json'), 'utf8'));
+  assert.equal(stored.result.status, 'failed');
+  assert.equal(stored.result.reason, 'cancelled');
+  assert.equal(stored.result.answer, undefined);
+});
diff --git a/tests/comparison-audience.test.mjs b/tests/comparison-audience.test.mjs
new file mode 100644
--- /dev/null
+++ b/tests/comparison-audience.test.mjs
@@ -0,0 +1,25 @@
+import assert from 'node:assert/strict';
+import test from 'node:test';
+import {prepareComparison} from '../src/comparison.mjs';
+
+test('blind comparison preserves the reader knowledge used for both explanations', () => {
+  const audience = 'I understand saving a file and making a commit. Use the painting example to explain branches.';
+  const original = 'A branch identifies a commit.';
+  const request = {
+    question:'What does a Git branch add?',
+    audience,
+    sources:[{id:'source', text:original}],
+    draft:original,
+  };
+  const run = guideIds => ({
+    auditId:'fixture', request, models:{rewrite:'test', verify:'test'},
+    libraryHash:'fixture', guideIds, costUsd:0, latencyMs:1,
+    candidates:[{}], calls:[], result:{status:'accepted', answer:original},
+  });
+  const bundle = prepareComparison([{
+    id:'reader-knowledge', original,
+    general:run(['anti-slop','clear-explanation']),
+    guided:run(['anti-slop','clear-explanation','git-version-control']),
+  }]);
+  assert.equal(bundle.review[0].audience, audience);
+});
```

## Follow-up RED: final persistence failure

Independent review of the first fix found that failed reconciliation left the
old accepted record on disk. The second test preserves the first successful
write and makes the next write fail. This models a storage error without
changing permissions or damaging files.

Command: `node --test tests/audit-cancellation.test.mjs`.
Exit status: 1. Tests: 2. Pass: 1. Fail: 1.

The returned result was audit-failed with no answer. Accepted history still
contained the answer instead of being empty. Atomic JSON replacement alone
does not mark the older record as unreleased when the replacement fails.

Exact additional test:

```diff
+test('failed final audit persistence leaves no accepted history for an unreleased answer', async t => {
+  const root = await mkdtemp(join(tmpdir(), 'explain-audit-failed-final-'));
+  t.after(() => rm(root, {recursive:true, force:true}));
+  const controller = new AbortController();
+  const persist = auditWriter(root);
+  const answer = 'The cache expires after 60 seconds.';
+  let writes = 0;
+  const result = await runExplanation({
+    question:'When does the cache expire?',
+    sources:[{id:'source', text:answer}],
+  }, {
+    models:{draft:'test', route:'test', rewrite:'test', verify:'test'},
+    maxBudgetUsd:1,
+    signal:controller.signal,
+    library:{general:[{id:'general', text:'Explain the evidence.'}], index:[], load:async () => []},
+    client:{async complete(call) {
+      const output = call.stage === 'draft'
+        ? {draft:answer, methods:[], topics:[]}
+        : call.stage === 'rewrite'
+          ? {answer, corrections:[]}
+          : {accepted:true, findings:[], checkedSourceIds:['source']};
+      return {output, costUsd:0, model:call.model};
+    }},
+    audit:async record => {
+      if (++writes === 2) throw new Error('simulated storage failure');
+      await persist(record);
+      controller.abort();
+    },
+  });
+  assert.equal(result.status, 'failed');
+  assert.equal(result.reason, 'audit-failed');
+  assert.equal(result.answer, undefined);
+  assert.deepEqual(await acceptedHistory(root), []);
+});
```
