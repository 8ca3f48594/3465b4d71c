import assert from 'node:assert/strict';
import test from 'node:test';

import { analyzeExplanation, evaluateStopHook } from '../scripts/check-explanation.mjs';
import { detectUnnamedDemonstrative, detectUnusedTerm } from '../src/reference.mjs';
import { inspectStyle } from '../src/style.mjs';

test('a demonstrative needs a named referent already in play', () => {
  const live = 'TCP is a way for two programs to send data back and forth reliably. What it does: it delivers that data as one stream.';
  const twin = 'A protocol moves packets between two programs. It delivers those packets as one stream.';
  const named = 'A sender calls write("HELLO") then write("WORLD"). Those writes can arrive as one HELLOWORLD read.';
  const outline = 'Git keeps selected versions of a project. You finish an outline and deliberately keep that version.';
  const defined = 'A coroutine is an object a function call builds but does not run. Awaiting that object runs it in the current task.';
  const window = 'The program ignores further pin changes for a short window after the first change. That window trades speed for accuracy.';
  const settling = 'They strike, spring apart, and strike again before settling still. That settling behavior is the bounce.';
  assert.ok(detectUnnamedDemonstrative(live).some(item => item.ruleId === 'unnamed-demonstrative'));
  assert.match(detectUnnamedDemonstrative(live)[0].evidence, /that data/);
  assert.ok(analyzeExplanation(twin).findings.some(item => item.ruleId === 'unnamed-demonstrative'));
  assert.equal(analyzeExplanation(twin).findings.some(item => /that data/i.test(item.evidence)), false);
  assert.deepEqual(detectUnnamedDemonstrative(named), []);
  assert.deepEqual(detectUnnamedDemonstrative(outline), []);
  assert.deepEqual(detectUnnamedDemonstrative(defined), []);
  assert.deepEqual(detectUnnamedDemonstrative(window), []);
  assert.deepEqual(detectUnnamedDemonstrative(settling), []);
  const justNamed = [
    'A slice is one topic file inside a packet.',
    'inject-guides attached two slices: one for writing rules, one for this skill.',
    'Those slices arrived as context before the answer was written.',
  ].join(' ');
  assert.deepEqual(detectUnnamedDemonstrative(justNamed), []);
  assert.equal(
    analyzeExplanation(justNamed).findings.some(item => item.ruleId === 'unnamed-demonstrative'),
    false,
  );
});

test('a defined term the example never uses is a wasted slot', () => {
  const unused = [
    'A race condition is two tasks reading and writing the same shared value.',
    '',
    '- Increment: a read, then an add, then a write.',
    '- Lock: a token that only one task may hold.',
    '',
    'Both tasks write 6. One increment is lost.',
  ].join('\n');
  const used = [
    'A race condition is two tasks reading and writing the same shared value.',
    '',
    '- Increment: a read, then an add, then a write.',
    '',
    'Both tasks write 6. One increment is lost.',
  ].join('\n');
  assert.ok(detectUnusedTerm(unused).some(item => item.evidence === 'lock'));
  assert.ok(analyzeExplanation(unused).findings.some(item => item.ruleId === 'unused-term'));
  assert.deepEqual(detectUnusedTerm(used), []);
  const numbered = [
    'A game loop is one pass that updates and draws the scene.',
    '',
    '- At 30 FPS: 1 pixel/frame times 30 frames/sec equals 30 pixels/sec.',
    '- At 60 FPS: 1 pixel/frame times 60 frames/sec equals 60 pixels/sec.',
    '',
    'The same step covers twice the distance in one second.',
  ].join('\n');
  assert.deepEqual(detectUnusedTerm(numbered), []);
});

test('unnamed demonstratives and unused terms block answers', () => {
  const live = 'TCP is a way for two programs to send data. It delivers that data as one stream.';
  assert.ok(inspectStyle(live).some(item => item.blocking && item.ruleId === 'unnamed-demonstrative'));
  assert.deepEqual(
    inspectStyle(live, {mode: 'prompt'}).filter(item => item.ruleId === 'unnamed-demonstrative' || item.ruleId === 'unused-term'),
    [],
  );
  const hook = evaluateStopHook({
    stop_hook_active: false,
    last_assistant_message: live,
  });
  assert.equal(hook.decision, 'block');
  assert.match(hook.reason, /named referent already in play/);
});
