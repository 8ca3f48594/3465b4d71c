import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeExplanation, evaluateStopHook } from '../scripts/check-explanation.mjs';
import { inspectStyle } from '../src/style.mjs';

function dashSpans(text, mode) {
  const findings = mode === 'native' ? analyzeExplanation(text).findings : inspectStyle(text, { mode });
  return findings.filter(item => item.ruleId === 'em-dash').map(item => item.span);
}

const protectedCases = [
  ['embedded backtick in a longer code delimiter', 'The exact literal is ``a—`b``.'],
  ['multiline inline code', 'The exact literal is `first line\nsecond—line` in this paragraph.'],
  ['straight double quotation', 'The source says "old—new".'],
  ['curly double quotation', 'The source says “old—new”.'],
  ['straight single quotation', "The source says 'old—new'."],
  ['curly single quotation', 'The source says ‘old—new’.'],
];

for (const [label, text] of protectedCases) {
  test(`preserve ${label} in native, answer, and prompt checks`, () => {
    for (const mode of ['native', 'answer', 'prompt']) assert.deepEqual(dashSpans(text, mode), [], mode);
    assert.deepEqual(evaluateStopHook({ last_assistant_message: text }), {});
  });

  test(`detect later authored punctuation after ${label}`, () => {
    const mixed = `${text} The copy expires—then it must be replaced.`;
    const expected = [{ start: mixed.lastIndexOf('—'), end: mixed.lastIndexOf('—') + 1 }];
    for (const mode of ['native', 'answer', 'prompt']) assert.deepEqual(dashSpans(mixed, mode), expected, mode);
    assert.equal(evaluateStopHook({ last_assistant_message: mixed }).decision, 'block');
  });
}

for (const text of [
  "It's stored—don't discard it yet.",
  'It’s stored—don’t discard it yet.',
  "The readers' copy expires—the writers' copy stays.",
  'The readers’ copy expires—the writers’ copy stays.',
]) {
  test(`apostrophes do not turn authored prose into protected quotation: ${text}`, () => {
    const expected = [{ start: text.indexOf('—'), end: text.indexOf('—') + 1 }];
    for (const mode of ['native', 'answer', 'prompt']) assert.deepEqual(dashSpans(text, mode), expected, mode);
    assert.equal(evaluateStopHook({ last_assistant_message: text }).decision, 'block');
  });
}
