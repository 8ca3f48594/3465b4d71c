import assert from 'node:assert/strict';
import test from 'node:test';

import { randomUUID } from 'node:crypto';
import { unlinkSync } from 'node:fs';

import { analyzeExplanation, evaluateStopHook } from '../scripts/check-explanation.mjs';
import { collectAnalogPairs, detectDroppedAnalog } from '../src/analog.mjs';
import { bindingStorePath, writeSessionBindings } from '../src/binding-store.mjs';
import { inspectStyle } from '../src/style.mjs';

const hotel = [
  'A Docker container is a running copy of an application packaged for repeated startup.',
  '',
  'Writing notes on a whiteboard in a hotel room, then checking into a newly cleaned identical room. The room layout matches the image; the notes match the writable layer.',
  '',
  'You start a container from an image. The application writes a log. You replace the container. The log is gone.',
].join('\n');
const sliceBindings = [
  {term: 'image', analog: 'recipe'},
  {term: 'container', analog: 'running dish'},
];
const defined = [
  'A Docker image is packaged files and startup configuration, like a recipe.',
  'A container is one running instance of that image, like a dish made from that recipe.',
].join(' ');
const kept = [
  defined,
  '',
  'Replace the container (the running dish) from the same image (the recipe). The log is gone.',
].join('\n');
const parenFirst = [
  'A Docker image (the recipe) is packaged files. A container (the running dish) is one instance of that image (the recipe).',
  '',
  'Replace the container (the running dish) from the same image (the recipe). The log is gone.',
].join('\n');

test('a mapped analog must be defined, then kept on later uses', () => {
  const live = [
    'A Docker image is packaged files and startup configuration, like a recipe. A container is a running instance created from that image, like a dish.',
    '',
    'You start a container from an image. The new container does not keep the old writable layer.',
  ].join('\n');
  const twin = 'A cache is a fast local copy, like a notebook. Later reads return the cache without opening the file.';
  const dropped = detectDroppedAnalog(live);
  assert.ok(dropped.some(item => item.ruleId === 'dropped-analog' && /^images?$/i.test(item.evidence)));
  assert.equal(dropped.some(item => /docker/i.test(item.evidence)), false);
  assert.ok(analyzeExplanation(live).findings.some(item => item.ruleId === 'dropped-analog'));
  assert.ok(analyzeExplanation(twin).findings.some(item => item.ruleId === 'dropped-analog'));
  assert.equal(analyzeExplanation(twin).findings.some(item => /recipe|dish/i.test(item.evidence)), false);
  assert.deepEqual(detectDroppedAnalog(kept), []);
  const wrapped = [
    'A cache is a fast local copy, like a notebook.',
    'Later reads return the cache (the',
    'notebook) without opening the file.',
  ].join('\n');
  assert.deepEqual(detectDroppedAnalog(wrapped), []);
});

test('dropped analog blocks answers and is omitted from prompt-mode style', () => {
  const live = 'A Docker image is packaged files, like a recipe. You start a container from that image.';
  assert.ok(inspectStyle(live).some(item => item.blocking && item.ruleId === 'dropped-analog'));
  assert.deepEqual(
    inspectStyle(live, {mode: 'prompt'}).filter(item => item.ruleId === 'dropped-analog'),
    [],
  );
  const hook = evaluateStopHook({
    stop_hook_active: false,
    last_assistant_message: live,
  });
  assert.equal(hook.decision, 'block');
  assert.match(hook.reason, /term \(the analog\)/);
});

test('a parenthetical before the mapping sentence is not the first use of the analog', () => {
  assert.ok(detectDroppedAnalog(parenFirst).some(item => item.ruleId === 'dropped-analog'));
  assert.ok(detectDroppedAnalog(parenFirst, sliceBindings).some(item => item.ruleId === 'dropped-analog'));
  assert.match(detectDroppedAnalog(parenFirst)[0].reason, /mapping sentence/);
  assert.deepEqual(detectDroppedAnalog(kept, sliceBindings), []);
});

test('a slice-supplied pairing is a binding, not optional flavor', () => {
  assert.deepEqual(detectDroppedAnalog(hotel), []);
  assert.ok(detectDroppedAnalog(hotel, sliceBindings).some(item => item.ruleId === 'dropped-analog'));
  assert.ok(analyzeExplanation(hotel, {bindings: sliceBindings}).findings.some(item => item.ruleId === 'dropped-analog'));
  assert.equal(analyzeExplanation(hotel).findings.some(item => item.ruleId === 'dropped-analog'), false);
  assert.deepEqual(detectDroppedAnalog(kept, sliceBindings), []);
  const swapped = [
    'A Docker image is packaged files, like a whiteboard.',
    'You start a container from that image (the whiteboard).',
  ].join(' ');
  assert.ok(detectDroppedAnalog(swapped, sliceBindings).some(item => /substitute a different analog/.test(item.reason)));
  const expansion = 'A GPU (graphics processing unit) is a chip. The GPU adds each pair in its own thread.';
  assert.deepEqual(detectDroppedAnalog(expansion), []);
});

test('the Stop hook reuses bindings written for the injected session', () => {
  const sessionId = `analog-test-${randomUUID()}`;
  writeSessionBindings(sessionId, sliceBindings);
  const hook = evaluateStopHook({
    stop_hook_active: false,
    session_id: sessionId,
    last_assistant_message: hotel,
  });
  assert.equal(hook.decision, 'block');
  assert.match(hook.reason, /term \(the analog\)/);
  unlinkSync(bindingStorePath(sessionId));
});

test('a copula mapping then a bare use still needs later pairing', () => {
  const copula = 'A Docker image is the recipe. You start a container from that image.';
  const firstUse = [
    'A Docker image is packaged files, like a recipe.',
    'Replace the image (the recipe). The log is gone.',
  ].join(' ');
  assert.ok(detectDroppedAnalog(copula).some(item => item.ruleId === 'dropped-analog' && /^images?$/i.test(item.evidence)));
  assert.deepEqual(detectDroppedAnalog(firstUse, [{term: 'image', analog: 'recipe'}]), []);
  const longer = [
    'An image is packaged files, like a recipe.',
    'Replace that image (the recipe this instance was built from).',
  ].join(' ');
  assert.deepEqual(detectDroppedAnalog(longer, [{term: 'image', analog: 'recipe'}]), []);
});

test('a possessive pair counts and a last use still needs the', () => {
  const possessive = [
    'A cache is a fast local copy, like a notebook.',
    "Later reads return the cache's (the notebook's) copy.",
  ].join('\n');
  const missingThe = [
    'A cache is a fast local copy, like a notebook.',
    'Later reads return the cache (notebook) without opening the file.',
  ].join('\n');
  const liveTail = [
    defined,
    "The log lived in the old container's (the running dish's) writable layer.",
    'Each container (running dish) gets its own layer.',
  ].join('\n');
  assert.deepEqual(detectDroppedAnalog(possessive), []);
  assert.deepEqual(detectDroppedAnalog(possessive, [{term: 'cache', analog: 'notebook'}]), []);
  assert.ok(detectDroppedAnalog(missingThe).some(item => item.ruleId === 'dropped-analog'));
  assert.ok(detectDroppedAnalog(liveTail, sliceBindings).some(item => item.ruleId === 'dropped-analog'));
  assert.equal(
    detectDroppedAnalog(
      `${defined} The log lived in the old container's (the running dish's) writable layer.`,
      sliceBindings,
    ).some(item => item.ruleId === 'dropped-analog'),
    false,
  );
});

test('a later use must keep the analog noun phrase, not a shortened remnant', () => {
  const shortened = [
    defined,
    '',
    'A write goes in the container (the dish), not the image (the recipe).',
    "Replace the containers (the dishes) from the same image (the recipe). The old container's (the dish's) layer is gone.",
  ].join('\n');
  const full = [
    defined,
    '',
    'A write goes in the container (the running dish), not the image (the recipe).',
    "Replace the containers (the running dishes) from the same image (the recipe). The old container's (the running dish's) layer is gone.",
  ].join('\n');
  const mappingOnly = [
    'A container is one running instance, like a dish.',
    'Replace the container (the dish). The log is gone.',
  ].join(' ');
  const dropped = detectDroppedAnalog(shortened, sliceBindings);
  assert.ok(dropped.some(item => item.ruleId === 'dropped-analog' && /shortened remnant/.test(item.reason)));
  assert.ok(analyzeExplanation(shortened, {bindings: sliceBindings}).findings.some(item => item.ruleId === 'dropped-analog'));
  const hook = evaluateStopHook({
    stop_hook_active: false,
    last_assistant_message: shortened,
    bindings: sliceBindings,
  });
  assert.equal(hook.decision, 'block');
  assert.match(hook.reason, /shortened remnant/);
  assert.deepEqual(detectDroppedAnalog(full, sliceBindings), []);
  assert.equal(analyzeExplanation(full, {bindings: sliceBindings}).shouldBlock, false);
  assert.deepEqual(
    evaluateStopHook({
      stop_hook_active: false,
      last_assistant_message: full,
      bindings: sliceBindings,
    }),
    {},
  );
  assert.deepEqual(detectDroppedAnalog(mappingOnly), []);
});

test('a coordinated like-sentence maps both terms, and a shortened remnant still fails', () => {
  const coordinated = [
    'A Docker image is a packaged set of files. A container is one running instance made from that image.',
    'An image is like a recipe, and a container is like a dish made from that recipe.',
    'A write goes in the container (the running dish), not the image (the recipe).',
    'Replace the container (the running dish) from the same image (the recipe). The log is gone.',
  ].join(' ');
  assert.deepEqual(detectDroppedAnalog(coordinated, sliceBindings), []);
  const shortened = [
    coordinated,
    'The new container (the new dish) gets an empty layer. The old container (the old dish) is gone.',
  ].join(' ');
  const dropped = detectDroppedAnalog(shortened, sliceBindings);
  assert.ok(dropped.some(item => item.ruleId === 'dropped-analog' && /shortened remnant/.test(item.reason)));
  assert.equal(dropped.some(item => /before any parenthetical/.test(item.reason)), false);
  const hook = evaluateStopHook({
    stop_hook_active: false,
    last_assistant_message: shortened,
    bindings: sliceBindings,
  });
  assert.equal(hook.decision, 'block');
  assert.match(hook.reason, /the new dish/);
});

test('collectAnalogPairs reads article parentheticals from a slice', () => {
  const slice = [
    'A Docker image is packaged files, like a recipe. A container is one instance, like a dish.',
    'A write goes in the container (the running dish), not the image (the recipe).',
  ].join(' ');
  assert.deepEqual(collectAnalogPairs(slice), [
    {term: 'container', analog: 'running dish'},
    {term: 'image', analog: 'recipe'},
  ]);
  assert.deepEqual(collectAnalogPairs('A GPU (graphics processing unit) is a chip.'), []);
});
