import assert from 'node:assert/strict';
import test from 'node:test';

import { analyzeExplanation, evaluateStopHook } from '../scripts/check-explanation.mjs';
import { detectEmptySetup, isEmptySetupSentence } from '../src/padding.mjs';
import { inspectStyle } from '../src/style.mjs';

const liveRace = [
  'A race condition is two tasks reading and writing the same shared value, where the final result depends on the exact order their steps happen to run in. When both tasks are trying to do the same increment, one of the increments can vanish.',
  '',
  "Here's why. \"Increment the counter\" is not one instruction, it's three:",
  '',
  '1. Read the current value.',
  '2. Add one to it.',
  '3. Write the new value back.',
  '',
  'If two tasks each do all three steps back to back, everything works. The problem is interleaving: the operating system can pause Task A after step 1 and let Task B run before Task A finishes.',
  '',
  'Say the counter is 5, and two tasks each try to add 1:',
  '',
  '- Task A reads the counter: gets 5.',
  '- Task B reads the counter: gets 5 (Task A hasn\'t written yet, so this read is stale for what\'s about to happen).',
  '- Task A computes 5 + 1 = 6, writes 6.',
  '- Task B computes 5 + 1 = 6, writes 6.',
  '',
  'The counter ends at 6. But two increments happened on a starting value of 5, so the correct result is 7. One increment is lost, because Task B\'s read happened before Task A\'s write, so Task B never saw Task A\'s update and overwrote it with the same stale-based value.',
].join('\n');

test('a sentence with no leftover content after function, filler, and role words is empty setup', () => {
  assert.equal(isEmptySetupSentence("Here's why."), true);
  assert.equal(isEmptySetupSentence('This is the point.'), true);
  assert.equal(isEmptySetupSentence('Now the example.'), true);
  assert.equal(isEmptySetupSentence('What it does: it delivers bytes as one stream.'), true);
  assert.equal(isEmptySetupSentence("That's the key fact: both write 6."), true);
  assert.equal(isEmptySetupSentence('A few terms this needs: a write is one send call.'), true);
  assert.equal(isEmptySetupSentence('The subject is contact bounce: a physical behavior of the switch.'), true);
  assert.equal(isEmptySetupSentence('To see why, you need three more pieces, each defined before it\'s used:'), true);
  assert.equal(isEmptySetupSentence('Example: both write 6.'), false);
  assert.equal(isEmptySetupSentence('**Example**'), false);
  assert.equal(isEmptySetupSentence('**Result**'), false);
  assert.equal(isEmptySetupSentence('Contact bounce is metal contacts striking more than once.'), false);
  assert.equal(isEmptySetupSentence('The counter ends at 6.'), false);
  assert.equal(isEmptySetupSentence('One increment is lost.'), false);
  assert.equal(isEmptySetupSentence("Here's why that matters."), true);
  assert.equal(isEmptySetupSentence('One more term matters here:'), true);
  assert.equal(isEmptySetupSentence('This matters.'), true);
  assert.equal(isEmptySetupSentence('Another term is coming.'), true);
  assert.equal(isEmptySetupSentence('A few terms the example needs:'), true);
  assert.equal(isEmptySetupSentence('These terms this example needs:'), true);
  assert.equal(isEmptySetupSentence('Here come the terms.'), true);
  assert.equal(isEmptySetupSentence('The writable layer matters because writes land there.'), false);
});

test('the live lost-increment leftover is the only empty setup in that answer', () => {
  const findings = detectEmptySetup(liveRace);
  assert.deepEqual(findings.map(item => item.evidence), ["Here's why."]);
  const report = analyzeExplanation(liveRace);
  assert.equal(report.shouldBlock, true);
  assert.deepEqual(
    report.findings.filter(item => item.ruleId === 'empty-setup-sentence').map(item => item.evidence),
    ["Here's why."],
  );
  const hook = evaluateStopHook({
    stop_hook_active: false,
    last_assistant_message: liveRace,
  });
  assert.equal(hook.decision, 'block');
  assert.match(hook.reason, /fact, cause, limit, or the example's result/);
});

test('a name-only subject label and an upcoming-pieces line fail stay-or-cut', () => {
  const live = 'The subject is contact bounce: a physical behavior of the switch. Contact bounce can count one press as several.';
  const pieces = 'A race condition is two tasks reading the same value. To see why, you need three more pieces, each defined before it\'s used:\n\n- Increment: a read, then an add, then a write.\n\nBoth write 6. One increment is lost.';
  const twin = 'The topic is cache invalidation: the stored copy is stale. Later reads return that stale copy.';
  const kept = 'Contact bounce is metal contacts striking more than once. One press is logged as several presses.';
  assert.ok(analyzeExplanation(live).findings.some(item => item.ruleId === 'empty-setup-sentence'));
  assert.ok(analyzeExplanation(pieces).findings.some(item => item.ruleId === 'empty-setup-sentence'));
  assert.ok(analyzeExplanation(twin).findings.some(item => item.ruleId === 'empty-setup-sentence'));
  assert.equal(analyzeExplanation(twin).findings.some(item => /contact bounce/i.test(item.evidence)), false);
  assert.equal(analyzeExplanation(kept).findings.some(item => item.ruleId === 'empty-setup-sentence'), false);
});

test('a colon label with no leftover content fails, and a one-word label does not', () => {
  const live = [
    'TCP is a way for two programs to send data back and forth reliably.',
    'What it does: it delivers bytes as one stream.',
    "That's the key fact: TCP does not preserve write boundaries.",
  ].join(' ');
  const twin = 'A race condition is two tasks reading the same value. The key fact: both write 6. One increment is lost.';
  const kept = 'A race condition is two tasks reading the same value. Example: both write 6. One increment is lost.';
  const liveReport = analyzeExplanation(live);
  assert.ok(liveReport.findings.some(item => item.ruleId === 'empty-setup-sentence'));
  assert.equal(liveReport.findings.some(item => /what it does/i.test(item.evidence)), true);
  assert.ok(analyzeExplanation(twin).findings.some(item => item.ruleId === 'empty-setup-sentence'));
  assert.equal(analyzeExplanation(twin).findings.some(item => /what it does/i.test(item.evidence)), false);
  assert.equal(analyzeExplanation(kept).findings.some(item => item.ruleId === 'empty-setup-sentence'), false);
});

test('the same structure fails with different words, and a result sentence stays', () => {
  const twin = 'A race condition is two tasks reading and writing the same shared value. This is the point. Both write 6 so one increment is lost.';
  const report = analyzeExplanation(twin);
  assert.equal(report.shouldBlock, true);
  assert.ok(report.findings.some(item => item.ruleId === 'empty-setup-sentence'));
  assert.equal(report.findings.some(item => /here'?s why/i.test(item.evidence)), false);
  const kept = analyzeExplanation('A race condition is two tasks reading and writing the same shared value. The counter ends at 6. One increment is lost.');
  assert.equal(kept.shouldBlock, false);
  assert.deepEqual(kept.findings, []);
});

test('a leftover-empty announcement is the same stay-or-cut class', () => {
  const live = [
    'A Docker image is packaged files and startup configuration, like a recipe.',
    "Here's why that matters.",
    'One more term matters here:',
    'A container is one running instance of that image, like a dish made from that recipe.',
    'Replace the container (the running dish) from the same image (the recipe). The log is gone.',
  ].join('\n');
  const twin = [
    'A cache is a fast local copy, like a notebook.',
    'This matters.',
    'Another term is coming.',
    'Later reads return the cache (the notebook) without opening the file.',
  ].join('\n');
  const kept = [
    'A cache is a fast local copy, like a notebook.',
    'The stored copy matters because later reads skip the file.',
    'Later reads return the cache (the notebook) without opening the file.',
  ].join('\n');
  const liveReport = analyzeExplanation(live);
  assert.ok(liveReport.findings.some(item => item.ruleId === 'empty-setup-sentence'));
  assert.ok(liveReport.findings.some(item => /why that matters/i.test(item.evidence)));
  assert.ok(analyzeExplanation(twin).findings.some(item => item.ruleId === 'empty-setup-sentence'));
  assert.equal(analyzeExplanation(twin).findings.some(item => /why that matters|one more term/i.test(item.evidence)), false);
  assert.equal(analyzeExplanation(kept).findings.some(item => item.ruleId === 'empty-setup-sentence'), false);
  const hook = evaluateStopHook({
    stop_hook_active: false,
    last_assistant_message: live,
  });
  assert.equal(hook.decision, 'block');
  assert.match(hook.reason, /fact, cause, limit, or the example's result/);
});

test('a leftover-empty line that only announces terms are coming fails', () => {
  const live = [
    'A request is a message that names an action.',
    'A few terms the example needs: a client is the program sending the request.',
    'Repeating the same request leaves the same end state.',
  ].join('\n');
  const twin = [
    'A cache is a fast local copy.',
    'These terms this example needs: a miss is a read that opens the file.',
    'Later reads return the stored copy.',
  ].join('\n');
  const kept = [
    'A cache is a fast local copy.',
    'A miss is a read that opens the file.',
    'Later reads return the stored copy.',
  ].join('\n');
  const liveReport = analyzeExplanation(live);
  assert.equal(liveReport.shouldBlock, true);
  assert.ok(liveReport.findings.some(item => item.ruleId === 'empty-setup-sentence'));
  assert.ok(liveReport.findings.some(item => /few terms the example needs/i.test(item.evidence)));
  assert.ok(analyzeExplanation(twin).findings.some(item => item.ruleId === 'empty-setup-sentence'));
  assert.equal(
    analyzeExplanation(twin).findings.some(item => /few terms the example needs/i.test(item.evidence)),
    false,
  );
  assert.equal(analyzeExplanation(kept).findings.some(item => item.ruleId === 'empty-setup-sentence'), false);
  const hook = evaluateStopHook({
    stop_hook_active: false,
    last_assistant_message: live,
  });
  assert.equal(hook.decision, 'block');
  assert.match(hook.reason, /fact, cause, limit, or the example's result/);
  const revision = evaluateStopHook({
    stop_hook_active: false,
    last_assistant_message: live,
  });
  assert.equal(revision.decision, 'block');
});

test('a colon sentence that only announces the next sentence is cut', () => {
  const live = [
    'A container is one running instance of an image.',
    "Here's what's involved:",
    "Here's the sequence that causes the loss:",
    'The log is gone.',
  ].join('\n');
  const kept = [
    'A container is one running instance of an image.',
    'The log is gone.',
  ].join('\n');
  const report = analyzeExplanation(live);
  assert.ok(report.findings.some(item => item.ruleId === 'empty-setup-sentence' && /what.s involved/i.test(item.evidence)));
  assert.ok(report.findings.some(item => item.ruleId === 'empty-setup-sentence' && /sequence that causes the loss/i.test(item.evidence)));
  assert.equal(analyzeExplanation(kept).findings.some(item => item.ruleId === 'empty-setup-sentence'), false);
  assert.equal(analyzeExplanation('Example: both write 6. One increment is lost.').findings.some(item => item.ruleId === 'empty-setup-sentence'), false);
});

test('a colon line that only names the upcoming piece is an empty announcement', () => {
  const live = [
    'A container is one running instance of an image.',
    "Here's the sequence:",
    'You replace the container. The log is gone.',
  ].join('\n');
  const kept = [
    'A container is one running instance of an image.',
    'You replace the container. The log is gone.',
  ].join('\n');
  assert.ok(analyzeExplanation(live).findings.some(item => item.ruleId === 'empty-setup-sentence' && /sequence/.test(item.evidence)));
  assert.equal(analyzeExplanation(kept).findings.some(item => item.ruleId === 'empty-setup-sentence'), false);
  const hook = evaluateStopHook({
    stop_hook_active: false,
    last_assistant_message: live,
  });
  assert.equal(hook.decision, 'block');
  assert.match(hook.reason, /Here's the sequence/);
});

test('empty setup blocks answers and is omitted from prompt-mode style', () => {
  const text = "A race condition is two tasks reading and writing the same shared value. Here's why. Both write 6.";
  assert.ok(inspectStyle(text).some(item => item.blocking && item.ruleId === 'empty-setup-sentence'));
  assert.deepEqual(
    inspectStyle(text, {mode: 'prompt'}).filter(item => String(item.ruleId).startsWith('empty-')),
    [],
  );
});
