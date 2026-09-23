# Em dash policy: red evidence

Date: 2026-09-16.

Command, from the plugin directory:

```text
node --test tests/em-dash-policy.test.mjs
```

Exit status: 1. Results: 14 tests, 9 pass, 5 fail.

The native checker returned `shouldBlock: false` for one prose em dash. Answer and prompt checks returned zero findings where two exact spans were expected. Mixed protected content and prose returned no findings. The runner released the first candidate with an em dash even though the test supplied a clean second candidate and required another review.

These failures show absent enforcement, not a broken fixture. All imports resolved. The mocked runner returned an accepted answer. Protected content and valid punctuation cases passed. No production changes for this rule preceded the run. The test owner changed only this test and this evidence file.

The accepted new-file diff follows. Reproduce it with `git diff --no-index -- /dev/null tests/em-dash-policy.test.mjs`. Exit status 1 from this diff command means the new file differs from an empty file.

```diff
diff --git a/tests/em-dash-policy.test.mjs b/tests/em-dash-policy.test.mjs
new file mode 100644
index 0000000..37ab68d
--- /dev/null
+++ b/tests/em-dash-policy.test.mjs
@@ -0,0 +1,97 @@
+import assert from 'node:assert/strict';
+import test from 'node:test';
+import { analyzeExplanation, evaluateStopHook } from '../scripts/check-explanation.mjs';
+import { inspectStyle } from '../src/style.mjs';
+import { runExplanation } from '../src/runner.mjs';
+
+const emDashFindings = findings => findings.filter(item => item.ruleId === 'em-dash');
+
+test('one authored em dash blocks native output and its Stop hook', () => {
+  const text = 'A cache stores a copy—later requests can reuse it.';
+  const report = analyzeExplanation(text);
+  assert.equal(report.shouldBlock, true);
+  assert.equal(emDashFindings(report.findings).length, 1);
+  assert.equal(evaluateStopHook({ last_assistant_message: text }).decision, 'block');
+});
+
+for (const mode of ['answer', 'prompt']) {
+  test(`authored em dashes are hard findings with original offsets in ${mode} mode`, () => {
+    const text = 'A cache—one stored copy—can expire.';
+    const findings = emDashFindings(inspectStyle(text, { mode }));
+    assert.equal(findings.length, 2);
+    assert.ok(findings.every(item => item.blocking === true));
+    assert.deepEqual(findings.map(item => item.span), [
+      { start: text.indexOf('—'), end: text.indexOf('—') + 1 },
+      { start: text.lastIndexOf('—'), end: text.lastIndexOf('—') + 1 },
+    ]);
+  });
+}
+
+const protectedExamples = [
+  ['fenced code', '```js\nconst label = "old—new";\n```'],
+  ['tilde fence', '~~~text\nold—new\n~~~'],
+  ['inline code', 'The exact value is `old—new`.'],
+  ['straight quotation', 'The source says "old—new".'],
+  ['curly quotation', 'The source says “old—new”.'],
+  ['blockquote', '> old—new'],
+  ['indented code', '    old—new'],
+  ['tab-indented code', '\told—new'],
+];
+
+for (const [label, text] of protectedExamples) {
+  test(`preserve em dashes inside ${label}`, () => {
+    assert.deepEqual(emDashFindings(analyzeExplanation(text).findings), []);
+    assert.deepEqual(evaluateStopHook({ last_assistant_message: text }), {});
+    for (const mode of ['answer', 'prompt']) {
+      assert.deepEqual(emDashFindings(inspectStyle(text, { mode })), []);
+    }
+  });
+}
+
+test('protected content does not hide a later prose violation or shift its span', () => {
+  const text = 'The exact value is `old—new`.\n\n> Quoted—text\n\nA cache—one stored copy—can expire.';
+  const start = text.indexOf('A cache');
+  const expected = [...text.matchAll(/—/g)].filter(item => item.index > start)
+    .map(item => ({ start: item.index, end: item.index + 1 }));
+  assert.equal(expected.length, 2);
+  assert.deepEqual(emDashFindings(analyzeExplanation(text).findings).map(item => item.span), expected);
+  for (const mode of ['answer', 'prompt']) {
+    assert.deepEqual(emDashFindings(inspectStyle(text, { mode })).map(item => item.span), expected);
+  }
+});
+
+test('hyphens and en dashes remain valid in authored prose', () => {
+  const text = 'This read-only copy lasts 10–20 seconds.';
+  assert.equal(analyzeExplanation(text).shouldBlock, false);
+  for (const mode of ['answer', 'prompt']) {
+    assert.deepEqual(inspectStyle(text, { mode }), []);
+  }
+});
+
+test('the runner rechecks a repair before releasing an em-dash-free answer', async () => {
+  const draft = 'A cache stores a copy—later requests can reuse it.';
+  const repaired = 'A cache stores a copy. Later requests can reuse it.';
+  const calls = [];
+  let rewrites = 0;
+  const request = { question: 'What does a cache do?', draft, sources: [{ id: 'cache', text: repaired }] };
+  const result = await runExplanation(request, {
+    library: { index: [], general: [{ id: 'general', text: 'Explain the supported facts.' }], load: async () => [] },
+    models: { draft: 'test', route: 'test', rewrite: 'test', verify: 'test' },
+    maxBudgetUsd: 1,
+    timeoutMs: 1000,
+    audit: async () => {},
+    client: {
+      async complete(call) {
+        calls.push(call);
+        const output = call.stage === 'route' ? { methods: [], topics: [] }
+          : call.stage === 'rewrite' ? { answer: ++rewrites === 1 ? draft : repaired, corrections: [] }
+          : { accepted: true, findings: [], checkedSourceIds: ['cache'] };
+        return { output, costUsd: 0.01, model: call.model };
+      },
+    },
+  });
+  assert.equal(result.status, 'accepted');
+  assert.equal(result.answer, repaired);
+  assert.deepEqual(calls.map(call => call.stage), ['route', 'rewrite', 'verify', 'rewrite', 'verify']);
+  assert.ok(JSON.stringify(calls.filter(call => call.stage === 'rewrite')[1]).includes('em-dash'));
+});
```
