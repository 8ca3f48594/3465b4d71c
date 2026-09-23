# Git routing regression evidence

Before adding the Git guide, `node --test tests/git-guidance.test.mjs tests/integration-review.test.mjs` exited 1: five passed and three failed. The new guide was absent, its selection failed before rewrite, and the library contained 30 rather than 31 topics. No Git guide or routing-index change preceded this run. The count assertion was deliberately updated because the user requested a Git-specific teaching reference after a live evaluation exposed the gap. No existing test was weakened.

The new test file was held fixed through green. Its exact new-file diff follows.

```diff
--- /dev/null
+++ tests/git-guidance.test.mjs
+import assert from 'node:assert/strict';
+import test from 'node:test';
+import {loadLibrary} from '../src/library.mjs';
+import {runExplanation} from '../src/runner.mjs';
+
+test('the routing index exposes a focused Git guide with a bounded painting example', async () => {
+  const library = await loadLibrary();
+  const entry = library.index.find(item => item.id === 'git-version-control');
+  assert.ok(entry, 'Git needs a selectable guide after the observed fallback');
+  assert.equal(entry.kind, 'topic');
+  assert.match(entry.description, /Git/);
+  const [guide] = await library.load([entry.id]);
+  assert.match(guide.text, /painting/i);
+  assert.match(guide.text, /photograph/i);
+  assert.match(guide.text, /## Analogies and limits/);
+  assert.match(guide.text, /https:\/\/git-scm.com/);
+  assert.deepEqual(library.promptFindings, []);
+});
+
+test('the selected Git guide and stated knowledge reach writing and review unchanged', async () => {
+  const calls = [];
+  const audits = [];
+  const request = {
+    question: 'How do Git branches relate to the versions I already understand?',
+    audience: 'I understand saving a file and making a commit. Use the painting example to explain branches.',
+    sources: [{id:'git',text:'A Git branch names a line of development and points to its latest commit.'}],
+  };
+  const answer = 'A branch gives one line of development a name. Its pointer advances when you commit on that branch.';
+  const result = await runExplanation(request, {
+    library:await loadLibrary(),
+    models:{draft:'test',route:'test',rewrite:'test',verify:'test'},
+    maxBudgetUsd:1,timeoutMs:1000,audit:async record => audits.push(record),
+    client:{async complete(call) {
+      calls.push(call);
+      const output = call.stage === 'draft' ? {draft:answer,methods:['causal-explanation'],topics:['git-version-control']}
+        : call.stage === 'rewrite' ? {answer,corrections:[]}
+        : {accepted:true,findings:[],checkedSourceIds:['git']};
+      return {output,costUsd:0.01,model:call.model};
+    }},
+  });
+  assert.equal(result.status, 'accepted');
+  assert.ok(result.guideIds.includes('git-version-control'));
+  for (const call of calls) assert.equal(JSON.parse(call.prompt).audience, request.audience);
+  for (const call of calls.filter(item => item.stage !== 'draft')) {
+    assert.ok(call.system.includes('<guide id="git-version-control">'));
+  }
+  assert.deepEqual(audits[0].request, request);
+});
```

Existing integration-test changes: the title and topic-count assertion changed from 30 to 31, and the example-count assertion changed from 60 to 62. The same command passed all eight tests after the guide and index entry were added. The mocked test establishes prompt assembly and context transport, not live semantic routing accuracy or teaching quality.
