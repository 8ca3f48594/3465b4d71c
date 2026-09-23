import assert from 'node:assert/strict';
import test from 'node:test';

import { analyzeExplanation, evaluateStopHook } from '../scripts/check-explanation.mjs';
import { detectLaterTopicDump } from '../src/closer.mjs';
import { inspectStyle } from '../src/style.mjs';

const liveLeak = [
  'Feature leakage is when information that shouldn\'t be available yet sneaks into the process that builds the model. The score on the test set looks better than the score on genuinely new data.',
  '',
  'The leaky mean includes the test rows, so the reported test score is inflated.',
  '',
  'The fix illustrated by this example: fit every preprocessing step only on the training fold. When doing cross-validation, the fitting has to happen fresh inside each training fold, which is what a pipeline object in tools like scikit-learn is built to enforce automatically.',
].join('\n');

const ended = [
  'Feature leakage is when information that shouldn\'t be available yet sneaks into the process that builds the model. The score on the test set looks better than the score on genuinely new data.',
  '',
  'The leaky mean includes the test rows, so the reported test score is inflated.',
].join('\n');

test('a closer that names two new compound topics after the result fails', () => {
  const findings = detectLaterTopicDump(liveLeak);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].ruleId, 'ai-later-topic');
  assert.match(findings[0].evidence, /cross-validation/);
  const report = analyzeExplanation(liveLeak);
  assert.equal(report.shouldBlock, true);
  assert.ok(report.findings.some(item => item.ruleId === 'ai-later-topic'));
  const hook = evaluateStopHook({
    stop_hook_active: false,
    last_assistant_message: liveLeak,
  });
  assert.equal(hook.decision, 'block');
  assert.match(hook.reason, /Do not add a later topic/);
});

test('the same dump fails with different later names, and ending on the result passes', () => {
  const twin = [
    'A race condition is two tasks reading and writing the same shared value. The counter ends at 6. One increment is lost.',
    '',
    'The usual next step is a lock-free compare-and-swap or a worker-pool, which many runtimes wrap automatically.',
  ].join('\n');
  assert.ok(analyzeExplanation(twin).findings.some(item => item.ruleId === 'ai-later-topic'));
  assert.equal(analyzeExplanation(twin).findings.some(item => /scikit-learn|pipeline/i.test(item.evidence)), false);
  assert.deepEqual(analyzeExplanation(ended).findings, []);
  assert.equal(analyzeExplanation(ended).shouldBlock, false);
});

test('a closer that names two later techniques after tunneling fails', () => {
  const liveTunnel = [
    'A physics simulation is a program that predicts how objects move over time, for example a video game or robotics program tracking a projectile. A fixed timestep is an equal jump of time used to recalculate each position.',
    '',
    '- Timestep: the fixed slice of time each update advances.',
    '- Wall: a fixed obstacle the object can collide with.',
    '',
    '1. Object speed: 100 m/s.',
    '2. Displacement this timestep is 100 m/s × 0.0167 s = 1.667 m.',
    '3. Wall thickness: 0.1 m.',
    '',
    'The next check is already past the wall. That miss is tunneling.',
    '',
    '**Why a fixed timestep alone doesn\'t fix this**',
    '',
    'Tunneling is prevented by two additional techniques layered on top of the fixed timestep:',
    '',
    '- **Smaller timestep**: shrink the jump until displacement stays below the wall thickness.',
    '- **Continuous (swept) collision detection**: check the whole path and stop at the first surface crossed.',
    '',
    'Because a fixed timestep makes the distance traveled per step exact, the swept check is reliable to compute.',
  ].join('\n');
  const endedTunnel = [
    'A physics simulation is a program that predicts how objects move over time, for example a video game or robotics program tracking a projectile. A fixed timestep is an equal jump of time used to recalculate each position.',
    '',
    '- Timestep: the fixed slice of time each update advances.',
    '- Wall: a fixed obstacle the object can collide with.',
    '',
    '1. Object speed: 100 m/s.',
    '2. Displacement this timestep is 100 m/s × 0.0167 s = 1.667 m.',
    '3. Wall thickness: 0.1 m.',
    '',
    'The next check is already past the wall. That miss is tunneling.',
  ].join('\n');
  const findings = detectLaterTopicDump(liveTunnel);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].ruleId, 'ai-later-topic');
  assert.match(findings[0].evidence, /swept|smaller timestep/i);
  assert.equal(analyzeExplanation(liveTunnel).shouldBlock, true);
  assert.ok(analyzeExplanation(liveTunnel).findings.some(item => item.ruleId === 'ai-later-topic'));
  assert.equal(analyzeExplanation(liveTunnel).findings.some(item => item.ruleId === 'opening-jumps-to-story'), false);
  assert.deepEqual(analyzeExplanation(endedTunnel).findings, []);
});

test('a closer that introduces a leftover called name after the result fails', () => {
  const live = [
    'Contact bounce is metal contacts striking more than once on one press. One physical press gets logged as several presses.',
    '',
    'The fix, called debouncing, is to ignore further pin changes for a short window after the first change. That window trades speed for accuracy.',
  ].join('\n');
  const twin = [
    'A race condition is two tasks reading and writing the same shared value. The counter ends at 6. One increment is lost.',
    '',
    'The fix, called locking, is to hold a token so only one task writes.',
  ].join('\n');
  const ended = 'Contact bounce is metal contacts striking more than once on one press. One physical press gets logged as several presses.';
  assert.ok(analyzeExplanation(live).findings.some(item => item.ruleId === 'ai-later-topic'));
  assert.ok(analyzeExplanation(twin).findings.some(item => item.ruleId === 'ai-later-topic'));
  assert.equal(analyzeExplanation(twin).findings.some(item => /debounc/i.test(item.evidence)), false);
  assert.deepEqual(analyzeExplanation(ended).findings, []);
});

test('later-topic dumps block answers and are omitted from prompt-mode style', () => {
  assert.ok(inspectStyle(liveLeak).some(item => item.blocking && item.ruleId === 'ai-later-topic'));
  assert.deepEqual(
    inspectStyle(liveLeak, {mode: 'prompt'}).filter(item => item.ruleId === 'ai-later-topic'),
    [],
  );
});
