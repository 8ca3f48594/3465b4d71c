import { randomUUID } from 'node:crypto';
import { unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import test from 'node:test';

import { analyzeExplanation, evaluateStopHook } from '../scripts/check-explanation.mjs';
import { bindingStorePath, writeSessionBindings } from '../src/binding-store.mjs';
import { detectOpeningFaults, isAnalogLead, isGerundLead, isKindDefinition } from '../src/opening.mjs';
import { inspectStyle } from '../src/style.mjs';

const liveAwait = [
  'Awaiting a coroutine runs it immediately inside your current task, so your code pauses there and nothing else gets a chance to run until that specific await finishes. `create_task` instead hands the coroutine to the event loop as a separate task right away, so your current code moves on immediately and the event loop can switch between it and other tasks while each one waits.',
  '',
  'The key fact underneath this: calling a coroutine function (like `make_tea()`) does not run anything yet, it just builds a coroutine object. What you do with that object determines when and how it runs:',
  '',
  '- `await coro`: runs the coroutine now, as part of the task you\'re already in.',
  '- `asyncio.create_task(coro)`: wraps the coroutine in a Task and schedules it on the event loop immediately.',
].join('\n');

const definedAwait = [
  'A coroutine is an object a function call builds but does not run. Awaiting that object runs it in the current task. create_task is a separate task the event loop can switch to during a wait.',
  '',
  'Sequential await is 5 seconds. Both tasks at once is 3.',
].join('\n');

const liveJump = [
  'A race condition is two tasks reading and writing the same shared value, where the final result depends on the exact order their steps happen to run in. When both tasks are trying to do the same increment, one of the increments can vanish.',
  '',
  '1. Read the current value.',
  '2. Add one to it.',
  '3. Write the new value back.',
  '',
  'The counter ends at 6. One increment is lost.',
].join('\n');

test('a kind assignment names what a term is', () => {
  assert.equal(isKindDefinition('A coroutine is an object a function call builds but does not run.'), true);
  assert.equal(isKindDefinition('A race condition is two tasks reading the same value.'), true);
  assert.equal(isKindDefinition('The subject is contact bounce: a physical behavior of the switch.'), true);
  assert.equal(isKindDefinition('Contact bounce is metal contacts striking more than once.'), true);
  assert.equal(isKindDefinition('Feature leakage is when information sneaks into training.'), false);
  assert.equal(isGerundLead('Awaiting a coroutine runs it immediately inside your current task.'), true);
  assert.equal(isGerundLead('During a wait the loop can switch tasks.'), false);
  assert.equal(isKindDefinition('Awaiting a coroutine runs it immediately inside your current task.'), false);
  assert.equal(isKindDefinition('One increment is lost.'), false);
  assert.equal(isAnalogLead('This resembles handing a clerk a slip.'), true);
  assert.equal(isAnalogLead('This is like handing a clerk a slip.'), true);
  assert.equal(isAnalogLead('A request is like a slip to a clerk.'), false);
  assert.equal(isAnalogLead('A cache is a fast local copy, like a notebook.'), false);
});

test('the live await opening fails because the subject is never defined', () => {
  const findings = detectOpeningFaults(liveAwait);
  assert.ok(findings.some(item => item.ruleId === 'opening-skips-kind'));
  assert.match(findings.find(item => item.ruleId === 'opening-skips-kind').evidence, /Awaiting a coroutine runs/);
  const report = analyzeExplanation(liveAwait);
  assert.equal(report.shouldBlock, true);
  assert.ok(report.findings.some(item => item.ruleId === 'opening-skips-kind'));
  const hook = evaluateStopHook({
    stop_hook_active: false,
    last_assistant_message: liveAwait,
  });
  assert.equal(hook.decision, 'block');
  assert.match(hook.reason, /Say what the subject is before what it does/);
});

test('defining the coroutine then the await terms passes', () => {
  assert.deepEqual(analyzeExplanation(definedAwait).findings, []);
  assert.equal(analyzeExplanation(definedAwait).shouldBlock, false);
});

test('a numbered story after only the subject definition is still a jump', () => {
  const report = analyzeExplanation(liveJump);
  assert.equal(report.shouldBlock, true);
  assert.ok(report.findings.some(item => item.ruleId === 'opening-jumps-to-story'));
});

test('numbered steps after a term list are the walkthrough, not a jump', () => {
  const afterTerms = [
    'A physics simulation is a program that predicts motion in a game or robotics controller.',
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
  const report = analyzeExplanation(afterTerms);
  assert.equal(report.findings.some(item => item.ruleId === 'opening-jumps-to-story'), false);
  assert.equal(report.shouldBlock, false);
  assert.ok(analyzeExplanation(liveJump).findings.some(item => item.ruleId === 'opening-jumps-to-story'));
});

test('a procedure with no subject definition is not this class', () => {
  const steps = 'To trace the request:\n\n1. Put a breakpoint in `loadUser`.\n2. Send one request with a known id.';
  assert.deepEqual(detectOpeningFaults(steps), []);
  assert.deepEqual(analyzeExplanation(steps).findings, []);
});

test('a process-only leakage opening fails until the domain is named', () => {
  const live = [
    'Feature leakage is when information that shouldn\'t be available yet sneaks into the process that builds the model. The score on the test set looks better than the score on new data.',
    '',
    '- Training data: the rows the model learns from.',
    '- Feature: an input value the model uses to predict.',
    '',
    'The leaky mean includes the test rows, so the reported test score is inflated.',
  ].join('\n');
  const twin = [
    'Cache invalidation is when the stored value is no longer the truth.',
    '',
    '- Cache: the stored copy.',
    '- Invalidation: marking that copy unusable.',
    '',
    'The next read opens the file again.',
  ].join('\n');
  const placed = [
    'When you train a machine-learning model to predict a house price, a feature is an input such as the house\'s size. Feature leakage is when evaluation data shapes that training.',
    '',
    '- Training rows: the examples the model learns from.',
    '- Test rows: held-out examples used only to score.',
    '',
    'The reported test score is inflated.',
  ].join('\n');
  const liveReport = analyzeExplanation(live);
  assert.ok(liveReport.findings.some(item => item.ruleId === 'opening-skips-domain'));
  assert.ok(analyzeExplanation(twin).findings.some(item => item.ruleId === 'opening-skips-domain'));
  assert.equal(analyzeExplanation(twin).findings.some(item => /feature leakage/i.test(item.evidence)), false);
  const domain = liveReport.findings.find(item => item.ruleId === 'opening-skips-domain');
  assert.match(domain.reason, /kind of thing it is in this setting/);
  assert.doesNotMatch(domain.reason, /being trained|feature is here|house price/i);
  const hook = evaluateStopHook({
    stop_hook_active: false,
    last_assistant_message: live,
  });
  assert.equal(hook.decision, 'block');
  assert.match(hook.reason, /kind of thing it is in this setting/);
  assert.doesNotMatch(hook.reason, /being trained|feature is here|house price/i);
  assert.deepEqual(analyzeExplanation(placed).findings.filter(item => String(item.ruleId).startsWith('opening-')), []);
});

test('an opening that states the result before the analog mapping fails', () => {
  const live = [
    "A container's writable layer disappears when you replace the container, because that layer belongs to the specific running instance, not to the image it was started from.",
    '',
    'A Docker image is the packaged files and startup configuration for something you can run, like a recipe. A container is one running instance made from that image (the recipe), like a dish made from that recipe.',
    '',
    'The log is gone with it.',
  ].join('\n');
  const twin = [
    'Later reads return the cache without opening the file.',
    '',
    'A cache is a fast local copy, like a notebook. Later reads return the cache (the notebook) without opening the file.',
  ].join('\n');
  const defined = [
    'A Docker image is packaged files and startup configuration, like a recipe.',
    'A container is one running instance of that image, like a dish made from that recipe.',
    '',
    'Replace the container (the running dish) from the same image (the recipe). The log is gone.',
  ].join('\n');
  const report = analyzeExplanation(live);
  assert.equal(report.shouldBlock, true);
  assert.ok(report.findings.some(item => item.ruleId === 'opening-states-result'));
  assert.match(report.findings.find(item => item.ruleId === 'opening-states-result').evidence, /disappears when you replace/);
  assert.ok(analyzeExplanation(twin).findings.some(item => item.ruleId === 'opening-states-result'));
  assert.equal(analyzeExplanation(twin).findings.some(item => /recipe|dish|writable/i.test(item.evidence)), false);
  assert.equal(analyzeExplanation(defined).findings.some(item => item.ruleId === 'opening-states-result'), false);
  const hook = evaluateStopHook({
    stop_hook_active: false,
    last_assistant_message: live,
  });
  assert.equal(hook.decision, 'block');
  assert.match(hook.reason, /Do not state the example's result/);
});

test('an opening that leads with an analog before kind or mapping fails', () => {
  const live = 'This resembles giving a cashier an instruction. A request is like an instruction to a cashier.';
  const twin = 'This resembles handing a clerk a slip. A request is like a slip to a clerk.';
  const defined = [
    'A request is a message that names an action. A request is like a slip to a clerk.',
    'Sending the same request (the slip) twice leaves the tag unchanged.',
  ].join('\n');
  const report = analyzeExplanation(live);
  assert.equal(report.shouldBlock, true);
  assert.ok(report.findings.some(item => item.ruleId === 'opening-leads-with-analog'));
  assert.equal(report.findings.some(item => item.ruleId === 'opening-states-result'), false);
  assert.match(
    report.findings.find(item => item.ruleId === 'opening-leads-with-analog').evidence,
    /This resembles giving/,
  );
  assert.match(
    report.findings.find(item => item.ruleId === 'opening-leads-with-analog').reason,
    /Name the mechanism in plain words before any analogy/,
  );
  assert.ok(analyzeExplanation(twin).findings.some(item => item.ruleId === 'opening-leads-with-analog'));
  assert.equal(
    analyzeExplanation(twin).findings.some(item => /cashier|PUT|POST|idempoten/i.test(item.evidence)),
    false,
  );
  assert.equal(analyzeExplanation(defined).findings.some(item => item.ruleId === 'opening-leads-with-analog'), false);
  const hook = evaluateStopHook({
    stop_hook_active: false,
    last_assistant_message: live,
  });
  assert.equal(hook.decision, 'block');
  assert.match(hook.reason, /Name the mechanism in plain words before any analogy/);
  const revision = evaluateStopHook({
    stop_hook_active: false,
    last_assistant_message: live,
  });
  assert.equal(revision.decision, 'block');
});

test('an opening that defines an inner term instead of the asked subject fails', () => {
  const question = 'how the /c90373deff:explain skill works (hooks, packet, slices)';
  const live = [
    'A teaching packet is the injected guide for this turn: a set of reference notes the model must follow while writing its answer.',
    'A teaching packet is like a recipe.',
    '/c90373deff:explain is a Claude Code skill. SKILL.md is the tiny file that defines this skill.',
  ].join(' ');
  const twin = [
    'A notebook is a paper copy you write once.',
    'A cache is a fast local copy of a file.',
    'Later reads return that copy.',
  ].join(' ');
  const named = [
    '/c90373deff:explain is a Claude Code skill.',
    'A teaching packet is the injected guide for this turn, like a recipe.',
    'The model writes the answer (the dish) from the packet (the recipe).',
  ].join(' ');
  const cache = [
    'A cache is a fast local copy of a file.',
    'Later reads return that copy.',
  ].join(' ');
  const report = analyzeExplanation(live, {question});
  assert.equal(report.shouldBlock, true);
  assert.ok(report.findings.some(item => item.ruleId === 'opening-skips-asked-subject'));
  assert.match(
    report.findings.find(item => item.ruleId === 'opening-skips-asked-subject').evidence,
    /A teaching packet is the injected guide/,
  );
  assert.match(
    report.findings.find(item => item.ruleId === 'opening-skips-asked-subject').reason,
    /names the thing the question asked about/,
  );
  assert.equal(analyzeExplanation(live).findings.some(item => item.ruleId === 'opening-skips-asked-subject'), false);
  assert.ok(analyzeExplanation(twin, {question: 'Explain how a cache returns a stored copy.'}).findings.some(item => item.ruleId === 'opening-skips-asked-subject'));
  assert.equal(
    analyzeExplanation(twin, {question: 'Explain how a cache returns a stored copy.'}).findings.some(item => /teaching packet|clear-explanations/i.test(item.evidence)),
    false,
  );
  assert.equal(analyzeExplanation(named, {question}).findings.some(item => item.ruleId === 'opening-skips-asked-subject'), false);
  assert.equal(analyzeExplanation(cache, {question: 'Explain how a cache returns a stored copy.'}).findings.some(item => item.ruleId === 'opening-skips-asked-subject'), false);
  const hook = evaluateStopHook({
    stop_hook_active: false,
    prompt: `/c90373deff:explain ${question}`,
    last_assistant_message: live,
  });
  assert.equal(hook.decision, 'block');
  assert.match(hook.reason, /names the thing the question asked about/);
  const sessionId = `asked-subject-${randomUUID()}`;
  writeSessionBindings(sessionId, [], `/c90373deff:explain ${question}`);
  const stored = evaluateStopHook({
    stop_hook_active: false,
    session_id: sessionId,
    last_assistant_message: live,
  });
  assert.equal(stored.decision, 'block');
  assert.match(stored.reason, /names the thing the question asked about/);
  unlinkSync(bindingStorePath(sessionId));
  const revision = [
    'A teaching packet is like a recipe: it\'s the injected guide for this turn.',
    'This skill uses two hooks.',
  ].join(' ');
  assert.ok(analyzeExplanation(revision, {question}).findings.some(item => item.ruleId === 'opening-skips-asked-subject'));
  const afterBlock = evaluateStopHook({
    stop_hook_active: true,
    prompt: `/c90373deff:explain ${question}`,
    last_assistant_message: revision,
  });
  assert.equal(afterBlock.decision, 'block');
  assert.match(afterBlock.reason, /names the thing the question asked about/);
  const transcriptPath = join(tmpdir(), `asked-subject-${randomUUID()}.jsonl`);
  writeFileSync(transcriptPath, `${JSON.stringify({
    type: 'user',
    message: {role: 'user', content: `/c90373deff:explain ${question}`},
  })}\n`);
  const fromTranscript = evaluateStopHook({
    stop_hook_active: true,
    transcript_path: transcriptPath,
    last_assistant_message: revision,
  });
  assert.equal(fromTranscript.decision, 'block');
  assert.match(fromTranscript.reason, /names the thing the question asked about/);
  unlinkSync(transcriptPath);
  const wrappedPath = join(tmpdir(), `asked-subject-wrapped-${randomUUID()}.jsonl`);
  writeFileSync(wrappedPath, [
    JSON.stringify({
      type: 'user',
      message: {
        role: 'user',
        content: [
          {type: 'text', text: `<command-name>explain</command-name>\n<command-args>${question}</command-args>`},
        ],
      },
    }),
    JSON.stringify({
      type: 'user',
      message: {role: 'user', content: 'Teaching packet for this question. Use only this packet.'},
    }),
  ].join('\n'));
  const fromWrapped = evaluateStopHook({
    stop_hook_active: true,
    transcript_path: wrappedPath,
    last_assistant_message: revision,
  });
  assert.equal(fromWrapped.decision, 'block');
  assert.match(fromWrapped.reason, /names the thing the question asked about/);
  unlinkSync(wrappedPath);
});

test('opening order blocks answers and is omitted from prompt-mode style', () => {
  assert.ok(inspectStyle(liveAwait).some(item => item.blocking && item.ruleId === 'opening-skips-kind'));
  assert.deepEqual(
    inspectStyle(liveAwait, {mode: 'prompt'}).filter(item => String(item.ruleId).startsWith('opening-')),
    [],
  );
});
