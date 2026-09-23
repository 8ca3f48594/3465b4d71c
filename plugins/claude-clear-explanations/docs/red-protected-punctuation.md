# Protected punctuation: red evidence

Date: 2026-09-16.

Command, from the plugin directory:

```text
node --test tests/protected-punctuation.test.mjs
```

Exit status: 1. Results: 16 tests, 8 pass, 8 fail.

The native checker reports an em-dash finding inside code spans with embedded backticks, inline code across one newline, and single-quoted source text with straight or curly quotation marks. Each corresponding mixed-content test reports the protected occurrence as well as the real prose violation. Expected results contain only the prose violation. Exact source offsets are checked.

The four double-quotation controls and four ordinary-apostrophe controls pass. Imports and execution succeed. These failures establish a masking defect, not an environment failure. No production write for this repair preceded the run. The test owner changed only the new regression file and this evidence file.

The accepted test diff follows. Reproduce it with `git diff --no-index -- /dev/null tests/protected-punctuation.test.mjs`. The diff command returns status 1 because this new file differs from an empty file.

```diff
diff --git a/tests/protected-punctuation.test.mjs b/tests/protected-punctuation.test.mjs
new file mode 100644
index 0000000..14c2665
--- /dev/null
+++ b/tests/protected-punctuation.test.mjs
@@ -0,0 +1,45 @@
+import assert from 'node:assert/strict';
+import test from 'node:test';
+import { analyzeExplanation, evaluateStopHook } from '../scripts/check-explanation.mjs';
+import { inspectStyle } from '../src/style.mjs';
+
+function dashSpans(text, mode) {
+  const findings = mode === 'native' ? analyzeExplanation(text).findings : inspectStyle(text, { mode });
+  return findings.filter(item => item.ruleId === 'em-dash').map(item => item.span);
+}
+
+const protectedCases = [
+  ['embedded backtick in a longer code delimiter', 'The exact literal is ``a—`b``.'],
+  ['multiline inline code', 'The exact literal is `first line\nsecond—line` in this paragraph.'],
+  ['straight double quotation', 'The source says "old—new".'],
+  ['curly double quotation', 'The source says “old—new”.'],
+  ['straight single quotation', "The source says 'old—new'."],
+  ['curly single quotation', 'The source says ‘old—new’.'],
+];
+
+for (const [label, text] of protectedCases) {
+  test(`preserve ${label} in native, answer, and prompt checks`, () => {
+    for (const mode of ['native', 'answer', 'prompt']) assert.deepEqual(dashSpans(text, mode), [], mode);
+    assert.deepEqual(evaluateStopHook({ last_assistant_message: text }), {});
+  });
+
+  test(`detect later authored punctuation after ${label}`, () => {
+    const mixed = `${text} The copy expires—then it must be replaced.`;
+    const expected = [{ start: mixed.lastIndexOf('—'), end: mixed.lastIndexOf('—') + 1 }];
+    for (const mode of ['native', 'answer', 'prompt']) assert.deepEqual(dashSpans(mixed, mode), expected, mode);
+    assert.equal(evaluateStopHook({ last_assistant_message: mixed }).decision, 'block');
+  });
+}
+
+for (const text of [
+  "It's stored—don't discard it yet.",
+  'It’s stored—don’t discard it yet.',
+  "The readers' copy expires—the writers' copy stays.",
+  'The readers’ copy expires—the writers’ copy stays.',
+]) {
+  test(`apostrophes do not turn authored prose into protected quotation: ${text}`, () => {
+    const expected = [{ start: text.indexOf('—'), end: text.indexOf('—') + 1 }];
+    for (const mode of ['native', 'answer', 'prompt']) assert.deepEqual(dashSpans(text, mode), expected, mode);
+    assert.equal(evaluateStopHook({ last_assistant_message: text }).decision, 'block');
+  });
+}
```
