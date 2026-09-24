import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { loadLibrary } from '../src/library.mjs';
import { inspectStyle } from '../src/style.mjs';
import { analyzeExplanation, evaluateStopHook } from '../scripts/check-explanation.mjs';
import { detectAiisms } from '../src/aiisms.mjs';
import { buildTeachingPacket, evaluatePromptSubmit } from '../scripts/inject-guides.mjs';
import { allCriteriaPassed } from '../src/criteria.mjs';
import { pickSlices, rankIndex, selectGuides, splitStatedKnowledge, WORKING_MEMORY_SLOTS } from '../src/route.mjs';
import { detectMisconceptions } from '../src/misconceptions.mjs';
import { preparePreference } from '../src/preference.mjs';
import { replayFixture } from '../scripts/run-sdk-fixture.mjs';
import { runExplanation } from '../src/runner.mjs';

const corpus = JSON.parse(readFileSync(new URL('../quality/explanation-cases.json', import.meta.url), 'utf8'));
const pairs = JSON.parse(readFileSync(new URL('../quality/preference-pairs.json', import.meta.url), 'utf8'));
const invalidReview = JSON.parse(readFileSync(new URL('../quality/sdk-fixtures/git-invalid-review.json', import.meta.url), 'utf8'));
const skill = readFileSync(new URL('../skills/explain/SKILL.md', import.meta.url), 'utf8');
const ideal = corpus.cases[0].idealAnswer;

test('Explain Git routes to definition and git slices without branches or merges', async () => {
  const library = await loadLibrary();
  const selected = selectGuides('Explain Git.', undefined, library.index);
  assert.deepEqual(selected.methods, ['definition']);
  assert.deepEqual(selected.topics, ['git-version-control']);
  const [guide] = await library.load(['git-version-control'], {question: 'Explain Git.'});
  assert.deepEqual(guide.sliceIds, ['git-purpose', 'git-commits']);
  assert.match(guide.text, /painting/i);
  assert.doesNotMatch(guide.text, /night-scene/);
  assert.doesNotMatch(guide.text, /staging area/i);
  assert.doesNotMatch(guide.text, /staging workflow/i);
  assert.doesNotMatch(guide.text, /on a branch/i);
  assert.doesNotMatch(guide.text, /does not upload/i);
});

test('a branches follow-up keeps the painting and omits the commit lesson', async () => {
  const library = await loadLibrary();
  const question = 'What do Git branches add? Keep the digital painting example.';
  const audience = 'I understand saving a file and making a commit.';
  const [guide] = await library.load(['git-version-control'], {question, audience});
  assert.deepEqual(guide.sliceIds, ['git-purpose', 'git-branches']);
  assert.match(guide.text, /switch/i);
  assert.doesNotMatch(guide.text, /staging area/i);
});

test('native injection inlines guides instead of asking the model to read plugin paths', async () => {
  assert.match(skill, /UserPromptSubmit:/);
  assert.doesNotMatch(skill, /guides\/index\.json/);
  assert.doesNotMatch(skill, /Before drafting, read/);
  const packet = await buildTeachingPacket('/c90373deff:explain Explain Git.');
  assert.match(packet.text, /Teaching packet for this question/);
  assert.match(packet.text, /<guide id="packet-method">/);
  assert.match(packet.text, /<guide id="git-version-control">/);
  assert.equal(packet.text.includes('<guide id="anti-slop">'), false);
  assert.equal(packet.text.includes('<guide id="definition">'), false);
  assert.equal(packet.text.includes('night-scene'), false);
  assert.match(packet.text, /the first sentence says what the subject is/i);
  assert.match(packet.text, /Name the mechanism in plain words before any analogy/);
  assert.match(packet.text, /Before using a term, say what kind of thing it is in this setting/);
  assert.match(packet.text, /define the few terms the example will use/i);
  assert.match(packet.text, /numbered story/i);
  assert.match(packet.text, /state the example's result/i);
  assert.match(packet.text, /Do not add a later topic/);
  assert.match(packet.text, /One fact per sentence/);
  assert.match(packet.text, /A sentence stays only if deleting it/);
  assert.match(packet.text, /only announces that something matters/);
  assert.match(packet.text, /another term is coming/);
  assert.match(packet.text, /term \(the analog\)/i);
  assert.match(packet.text, /mapping sentence/i);
  assert.match(packet.text, /Do not attach the parenthetical before/i);
  assert.match(packet.text, /term's \(the analog's\) is the same pair/i);
  assert.match(packet.text, /Keep the analog noun phrase/i);
  assert.match(packet.text, /shortened remnant/i);
  assert.match(packet.text, /Keep the in the parenthetical through the last use/i);
  assert.match(packet.text, /Term-to-analog pairs in a supplied slice are bindings/i);
  assert.doesNotMatch(packet.text, /at first use/);
  assert.doesNotMatch(packet.text, /arithmetic step per sentence or line/i);
  assert.doesNotMatch(packet.text, /what is being trained|what a feature is here|house price|feature leakage/i);
  assert.doesNotMatch(packet.text, /\brecipe\b|\bdish\b/);
  assert.doesNotMatch(packet.text, /talk down|dive deeper|Skip canned openings/i);
  assert.ok(Buffer.byteLength(packet.text) < 4_000);
  const hook = evaluatePromptSubmit({prompt: 'Explain Git.'}, packet);
  assert.equal(hook.hookSpecificOutput.hookEventName, 'UserPromptSubmit');
  assert.equal(hook.hookSpecificOutput.additionalContext, packet.text);
});

test('recorded Git false claims block, and the Codex ideal sample does not', () => {
  assert.equal(detectMisconceptions(ideal).length, 0);
  assert.equal(analyzeExplanation(ideal).shouldBlock, false);
  const overwrite = 'After you commit the night sky, a new commit on that branch would overwrite an earlier committed version of the daytime painting.';
  const report = analyzeExplanation(overwrite);
  assert.equal(report.shouldBlock, true);
  assert.ok(report.findings.some(item => item.ruleId === 'git-commit-overwrites-history'));
  const hook = evaluateStopHook({stop_hook_active: false, last_assistant_message: overwrite});
  assert.equal(hook.decision, 'block');
  assert.ok(inspectStyle(overwrite).some(item => item.blocking && item.ruleId === 'git-commit-overwrites-history'));
  assert.deepEqual(inspectStyle(ideal).filter(item => String(item.ruleId).startsWith('git-')), []);
});

test('the Git topic guide does not trip misconception detectors', async () => {
  const library = await loadLibrary();
  const [guide] = await library.load(['git-version-control']);
  assert.deepEqual(detectMisconceptions(guide.text), []);
  assert.deepEqual(inspectStyle(guide.text, {mode: 'prompt'}).filter(item => item.blocking), []);
});

test('auto-routing loads Git even when the model returns no topics', async () => {
  const library = await loadLibrary();
  const answer = 'Git keeps selected versions of a project so you can inspect or restore a recorded snapshot. Saving a file does not make a commit.';
  const result = await runExplanation(
    {question: 'Explain Git.', sources: [{id: 'git-history', text: answer}]},
    {
      library,
      models: {draft: 't', route: 't', rewrite: 't', verify: 't'},
      maxBudgetUsd: 1,
      timeoutMs: 1000,
      audit: async () => {},
      client: {
        async complete(call) {
          const output = call.stage === 'draft'
            ? {draft: answer, methods: [], topics: []}
            : call.stage === 'rewrite'
              ? {answer, corrections: []}
              : {accepted: true, findings: [], checkedSourceIds: ['git-history']};
          return {output, costUsd: 0.01, model: call.model};
        },
      },
    },
  );
  assert.equal(result.status, 'accepted');
  assert.ok(result.guideIds.includes('git-version-control'));
});

test('a reviewer-approved overwrite claim is still withheld', async () => {
  const library = await loadLibrary();
  const bad = 'After you commit the night sky, a new commit on that branch would overwrite an earlier committed version of the daytime painting.';
  const result = await runExplanation(
    {question: 'Explain Git.', sources: [{id: 'git-history', text: 'Ordinary new commits preserve earlier history.'}]},
    {
      library,
      models: {draft: 't', route: 't', rewrite: 't', verify: 't'},
      maxBudgetUsd: 1,
      timeoutMs: 1000,
      audit: async () => {},
      client: {
        async complete(call) {
          const output = call.stage === 'draft'
            ? {draft: bad, methods: ['definition'], topics: ['git-version-control']}
            : call.stage === 'rewrite'
              ? {answer: bad, corrections: []}
              : {accepted: true, findings: [], checkedSourceIds: ['git-history']};
          return {output, costUsd: 0.01, model: call.model};
        },
      },
    },
  );
  assert.equal(result.status, 'failed');
  assert.equal(Object.hasOwn(result, 'answer'), false);
});

test('the 2026-09-17 invented style IDs fail closed in the SDK fixture', async () => {
  const result = await replayFixture(invalidReview, {library: await loadLibrary()});
  assert.equal(result.status, 'failed');
  assert.equal(result.reason, 'invalid-review');
  assert.equal(Object.hasOwn(result, 'answer'), false);
});

test('explanation corpus matches routing and blocks documented defects', async () => {
  const library = await loadLibrary();
  for (const entry of corpus.cases) {
    const [guide] = await library.load(['git-version-control'], {question: entry.question, audience: entry.audience});
    assert.deepEqual(guide.sliceIds, entry.expectedSlices, entry.id);
    for (const forbidden of entry.forbiddenSliceIds) assert.equal(guide.sliceIds.includes(forbidden), false, `${entry.id} ${forbidden}`);
    assert.equal(analyzeExplanation(entry.idealAnswer).shouldBlock, false, entry.id);
    for (const rejected of entry.rejectedAnswers) {
      const report = analyzeExplanation(rejected.text);
      assert.equal(report.shouldBlock, true, rejected.id);
      for (const defect of rejected.defects) {
        assert.ok(report.findings.some(item => item.ruleId === defect), `${rejected.id} ${defect}`);
      }
    }
  }
});

test('preference packets blind conditions and leave human fields empty', () => {
  const packet = preparePreference(pairs.pairs);
  assert.equal(packet.status, 'awaiting-human');
  assert.equal(packet.review.length, 2);
  for (const item of packet.review) {
    assert.equal(item.preferred, null);
    assert.deepEqual(item.candidates.map(candidate => candidate.label), ['A', 'B']);
    assert.equal(JSON.stringify(item).includes('ideal-codex'), false);
    assert.equal(JSON.stringify(item).includes('native-'), false);
  }
  assert.equal(packet.key[0].candidates.length, 2);
  assert.ok(packet.key.some(item => item.candidates.some(candidate => candidate.condition.startsWith('ideal-'))));
});

test('a native prompt with stated commit knowledge omits the commit lesson', async () => {
  const prompt = '/c90373deff:explain I understand saving a file and making a commit. What do Git branches add? Keep the digital painting example.';
  const split = splitStatedKnowledge(prompt.replace(/^\s*\/[A-Za-z0-9:_-]+\s*/, ''));
  assert.match(split.audience, /I understand saving a file and making a commit/);
  assert.equal(split.question.includes('I understand'), false);
  const packet = await buildTeachingPacket(prompt);
  assert.deepEqual(packet.sliceIds, ['git-purpose', 'git-branches']);
  assert.doesNotMatch(packet.text, /prepared snapshot/);
  assert.match(packet.text, /Git branches let you/);
});

test('Jackson-style Git excerpt without a named subject is blocked', () => {
  const excerpt = 'Suppose you want to keep developing a daytime painting and also try a night scene. Start with the recorded daytime version. Create a night-scene branch and switch to it. Darken the sky and commit the change.';
  const report = analyzeExplanation(excerpt);
  assert.equal(report.shouldBlock, true);
  assert.ok(report.findings.some(item => item.ruleId === 'git-opening-hides-subject'));
  const hook = evaluateStopHook({stop_hook_active: false, last_assistant_message: excerpt});
  assert.equal(hook.decision, 'block');
});

test('ideal Git samples pass their recorded criteria', () => {
  for (const entry of corpus.cases) {
    assert.equal(allCriteriaPassed(entry.idealAnswer, entry.criteria), true, entry.id);
  }
});

test('confusion about Git still routes to a definition introduction', async () => {
  const library = await loadLibrary();
  const selected = selectGuides("I'm confused about Git.", undefined, library.index);
  assert.deepEqual(selected.methods, ['definition']);
  assert.deepEqual(selected.topics, ['git-version-control']);
});

test('process narration and throat-clearing block, and the Codex ideal sample does not', () => {
  assert.deepEqual(detectAiisms(ideal), []);
  const narration = 'Let me explain Git. It keeps selected versions so you can restore a recorded snapshot.';
  assert.equal(analyzeExplanation(narration).shouldBlock, true);
  assert.ok(analyzeExplanation(narration).findings.some(item => item.ruleId === 'ai-process-narration'));
  const hook = evaluateStopHook({stop_hook_active: false, last_assistant_message: "It's worth noting that Git records a snapshot."});
  assert.equal(hook.decision, 'block');
});

test('explain-skill hooks use a single command string because Claude Code ignores YAML args', () => {
  assert.match(skill, /command:\s*node "\$\{CLAUDE_PLUGIN_ROOT\}\/scripts\/inject-guides\.mjs"/);
  assert.match(skill, /command:\s*node "\$\{CLAUDE_PLUGIN_ROOT\}\/scripts\/check-explanation\.mjs"/);
  assert.doesNotMatch(skill, /^\s*args:/m);
  assert.doesNotMatch(skill, /^\s*once:\s*true\s*$/m);
});

test('is not the same teaches save vs commit, and the live closer is blocked', () => {
  const taught = 'Saving a file in your editor is not the same as recording a version in Git.';
  assert.equal(allCriteriaPassed(taught, ['commit-not-editor-save']), true);
  assert.equal(
    allCriteriaPassed(
      "You decide when to record a version; just saving a file in your editor doesn't do it.",
      ['commit-not-editor-save'],
    ),
    true,
  );
  const closer = [
    'Git is version control software: it lets you save specific versions of a project so you can look back at an earlier version or restore its contents later, without losing your current work.',
    '',
    taught,
    '',
    "From here, there's more to Git (like how you prepare a version before saving it, or how to work on separate versions in parallel, or how to share versions with others). Let me know if you want to go into any of those next.",
  ].join('\n');
  const report = analyzeExplanation(closer);
  assert.equal(report.shouldBlock, true);
  assert.ok(report.findings.some(item => item.ruleId === 'ai-topic-menu'));
  assert.ok(report.findings.some(item => item.ruleId === 'offer-to-continue'));
  assert.equal(allCriteriaPassed(closer, ['no-adjacent-topic-tour', 'no-ai-isms']), false);
  const hook = evaluateStopHook({stop_hook_active: false, last_assistant_message: closer});
  assert.equal(hook.decision, 'block');
});

test('pickSlices is stable for empty libraries', () => {
  assert.deepEqual(pickSlices([], 'Explain Git.'), []);
});

test('a numbered story before example terms is blocked', () => {
  const jump = 'A race condition is two tasks reading and writing the same shared value. When both tasks increment, one increment can vanish.\n\n1. Read the current value.\n2. Add one to it.\n3. Write the new value back.';
  const twin = 'A write-ahead log is a record of changes written before the table file is updated. Recovery replays that record.\n\n1. Write the log entry.\n2. Confirm it is on disk.';
  const kept = 'A race condition is two tasks reading and writing the same shared value. An increment is a read, then an add, then a write.\n\n1. Task A reads 5.\n2. Task B reads 5.';
  assert.ok(analyzeExplanation(jump).findings.some(item => item.ruleId === 'opening-jumps-to-story'));
  assert.ok(analyzeExplanation(twin).findings.some(item => item.ruleId === 'opening-jumps-to-story'));
  assert.deepEqual(analyzeExplanation(kept).findings, []);
});

test('an empty setup sentence in a clean race opening is blocked', () => {
  const leftover = "A race condition is two tasks reading and writing the same shared value. Here's why. Both write 6 so one increment is lost.";
  const twin = 'A race condition is two tasks reading and writing the same shared value. Now the example. Both write 6 so one increment is lost.';
  const kept = 'A race condition is two tasks reading and writing the same shared value. The counter ends at 6. One increment is lost.';
  assert.ok(analyzeExplanation(leftover).findings.some(item => item.ruleId === 'empty-setup-sentence'));
  assert.ok(analyzeExplanation(twin).findings.some(item => item.ruleId === 'empty-setup-sentence'));
  assert.deepEqual(analyzeExplanation(kept).findings, []);
});

test('an opening that only says what the subject is for is blocked', () => {
  const awaitOpen = 'Awaiting a coroutine runs it immediately inside your current task, so your code pauses there and nothing else gets a chance to run until that specific await finishes.';
  assert.ok(analyzeExplanation(awaitOpen).findings.some(item => item.ruleId === 'opening-skips-kind'));
  const wal = 'A write-ahead log is how a database writes a log before it updates the table file.';
  assert.ok(analyzeExplanation(wal).findings.some(item => item.ruleId === 'opening-skips-kind'));
  const cache = "CPU caches exist so each core can keep a fast local copy of data it's working with, instead of reaching out to slower RAM on every single access.";
  assert.ok(analyzeExplanation(cache).findings.some(item => item.ruleId === 'opening-skips-kind'));
  assert.equal(allCriteriaPassed(ideal, ['opening-identifies-purpose']), true);
  const padded = 'Git is a tool that keeps selected versions. Here\'s the small example. Here\'s the mechanism.';
  assert.equal(analyzeExplanation(padded).findings.some(item => item.ruleId === 'ai-section-signpost'), false);
  assert.equal(analyzeExplanation('A write-ahead log is a record of changes. The database keeps its promise.').findings.some(item => item.ruleId === 'ai-overcomplicated'), false);
});

test('ABA and compare-and-swap load the lock-free slice, not asyncio', async () => {
  const question = 'Explain the ABA problem in concurrency: how a compare-and-swap can succeed on a recycled pointer and attach the wrong object.';
  const library = await loadLibrary();
  const selected = selectGuides(question, undefined, library.index);
  assert.deepEqual(selected.topics, ['concurrency-async']);
  const [guide] = await library.load(['concurrency-async'], {question});
  assert.deepEqual(guide.sliceIds, ['compare-swap']);
  assert.match(guide.text, /Compare-and-swap is a hardware instruction/i);
  assert.doesNotMatch(guide.text, /asyncio|create_task|coroutine/i);
  const packet = await buildTeachingPacket(`/c90373deff:explain ${question}`);
  assert.deepEqual(packet.topics, ['concurrency-async']);
  assert.deepEqual(packet.sliceIds, ['compare-swap']);
  assert.match(packet.text, /<guide id="concurrency-async">/);
  assert.match(packet.text, /If a topic guide does not match the asked subject, stop/);
  assert.doesNotMatch(packet.text, /asyncio|create_task/i);
  assert.ok(Buffer.byteLength(packet.text) < 4_000);
});

test('an asyncio question does not load the compare-and-swap slice', async () => {
  const question = 'Explain why awaiting a coroutine runs it now, while create_task lets another asyncio task run at the same time.';
  const library = await loadLibrary();
  assert.deepEqual(selectGuides(question, undefined, library.index).topics, ['concurrency-async']);
  const [guide] = await library.load(['concurrency-async'], {question});
  assert.deepEqual(guide.sliceIds, ['async-tasks']);
  assert.match(guide.text, /^A coroutine is /);
  assert.doesNotMatch(guide.text, /^Awaiting a coroutine runs/m);
  assert.doesNotMatch(guide.text, /\bABA\b|compare-and-swap/i);
  const packet = await buildTeachingPacket(`/c90373deff:explain ${question}`);
  assert.match(packet.text, /A coroutine is an object/);
  assert.match(packet.text, /define the few terms the example will use/i);
  assert.ok(Buffer.byteLength(packet.text) < 4_000);
});

test('live non-Git topics still route, and a sliced miss is omitted', async () => {
  const library = await loadLibrary();
  assert.deepEqual(
    selectGuides('Explain how a Bloom filter data structure can be sure a key is absent without storing the keys.', undefined, library.index).topics,
    ['algorithms-data'],
  );
  assert.deepEqual(
    selectGuides('Explain how databases use a write-ahead log so storage durability still holds when a crash happens while the table file is only half written.', undefined, library.index).topics,
    ['databases-storage'],
  );
  assert.deepEqual(
    selectGuides('Explain why two CPU cores can each have a different value for the same RAM address in their hardware caches, and how cache coherence stops that from lasting.', undefined, library.index).topics,
    ['memory-hardware'],
  );
  assert.deepEqual(
    selectGuides('Explain how graphics rendering uses a depth buffer to decide which triangle is visible when two triangles cover the same pixels.', undefined, library.index).topics,
    ['graphics-rendering'],
  );
  const [miss] = await library.load(['concurrency-async'], {question: 'Explain Git.'});
  assert.deepEqual(miss.sliceIds, []);
  assert.equal(miss.text, '');
  const packet = await buildTeachingPacket('/c90373deff:explain Explain Git.');
  assert.equal(packet.text.includes('<guide id="concurrency-async">'), false);
});

test('a TCP byte-stream question loads the stream slice and keeps the pipe', async () => {
  const question = 'Explain why TCP is a byte stream, so two writes do not become two reads.';
  const library = await loadLibrary();
  assert.deepEqual(selectGuides(question, undefined, library.index).topics, ['networks-protocols']);
  const [guide] = await library.load(['networks-protocols'], {question});
  assert.deepEqual(guide.sliceIds, ['tcp-stream']);
  assert.match(guide.text, /TCP is a byte stream/i);
  assert.match(guide.text, /write\("HELLO"\)/);
  assert.match(guide.text, /pipe maps/i);
  assert.equal(analyzeExplanation(guide.text).shouldBlock, false);
  const wal = 'Explain how databases use a write-ahead log so storage durability still holds when a crash happens while the table file is only half written.';
  assert.deepEqual(selectGuides(wal, undefined, library.index).topics, ['databases-storage']);
  const [networksOnWal] = await library.load(['networks-protocols'], {question: wal});
  assert.deepEqual(networksOnWal.sliceIds, []);
  const packet = await buildTeachingPacket(`/c90373deff:explain ${question}`);
  assert.deepEqual(packet.topics, ['networks-protocols']);
  assert.deepEqual(packet.sliceIds, ['tcp-stream']);
  assert.match(packet.text, /pipe maps/i);
  assert.doesNotMatch(packet.text, /house price|what is being trained/i);
  assert.ok(Buffer.byteLength(packet.text) < 4_000);
});

test('a Docker writable-layer question loads the replace slice and stops on the discard', async () => {
  const question = 'Explain why replacing a Docker container does not keep files written only to its writable layer.';
  const library = await loadLibrary();
  assert.deepEqual(selectGuides(question, undefined, library.index).topics, ['containers-deployment']);
  const [guide] = await library.load(['containers-deployment'], {question});
  assert.deepEqual(guide.sliceIds, ['containers-writable']);
  assert.match(guide.text, /writable layer/i);
  assert.match(guide.text, /like a recipe/);
  assert.match(guide.text, /like a running dish/);
  assert.match(guide.text, /image \(the recipe\)/);
  assert.match(guide.text, /container \(the running dish\)/);
  assert.ok(guide.text.search(/like a recipe/) < guide.text.search(/image \(the recipe\)/));
  assert.ok(guide.text.search(/like a running dish/) < guide.text.search(/container \(the running dish\)/));
  assert.match(guide.text, /The log is gone/i);
  assert.doesNotMatch(guide.text, /volume|bind-mount/i);
  assert.equal(analyzeExplanation(guide.text).shouldBlock, false);
  const packet = await buildTeachingPacket(`/c90373deff:explain ${question}`);
  assert.deepEqual(packet.topics, ['containers-deployment']);
  assert.deepEqual(packet.sliceIds, ['containers-writable']);
  assert.match(packet.text, /term \(the analog\)/i);
  assert.match(packet.text, /mapping sentence/i);
  assert.match(packet.text, /Name the mechanism in plain words before any analogy/);
  assert.match(packet.text, /state the example's result/i);
  assert.match(packet.text, /only announces that something matters/);
  assert.match(packet.text, /another term is coming/);
  assert.match(packet.text, /Do not attach the parenthetical before/i);
  assert.match(packet.text, /term's \(the analog's\) is the same pair/i);
  assert.match(packet.text, /Keep the analog noun phrase/i);
  assert.match(packet.text, /shortened remnant/i);
  assert.match(packet.text, /Keep the in the parenthetical through the last use/i);
  assert.match(packet.text, /Term-to-analog pairs in a supplied slice are bindings/i);
  assert.match(packet.text, /Do not substitute a different analog for the same term/i);
  assert.doesNotMatch(packet.text, /at first use/);
  assert.doesNotMatch(packet.text.split('<guide id="containers-deployment">')[0], /\brecipe\b|\bdish\b/);
  assert.doesNotMatch(packet.text, /volume|bind-mount|house price/i);
  assert.ok(Buffer.byteLength(packet.text) < 4_000);
  assert.deepEqual(packet.bindings, [
    {term: 'container', analog: 'running dish'},
    {term: 'image', analog: 'recipe'},
  ]);
  const hotel = [
    'A Docker container is a running copy of an application packaged for repeated startup.',
    '',
    'Writing notes on a whiteboard in a hotel room, then checking into a newly cleaned identical room.',
    'You start a container from an image. The log is gone.',
  ].join('\n');
  assert.equal(analyzeExplanation(hotel).findings.some(item => item.ruleId === 'dropped-analog'), false);
  assert.ok(analyzeExplanation(hotel, {bindings: packet.bindings}).findings.some(item => item.ruleId === 'dropped-analog'));
  const closer = [
    'A Docker image is packaged files. A container is one running instance. The log is gone.',
    '',
    'If you want files to survive replacement, they need to live in a Docker volume or a bind-mounted host directory. Let me know if you\'d like that mechanism explained next.',
  ].join('\n');
  const report = analyzeExplanation(closer);
  assert.equal(report.shouldBlock, true);
  assert.ok(report.findings.some(item => item.ruleId === 'offer-to-continue'));
  const twin = 'A race condition is two tasks reading the same value. The counter ends at 6. Let me know if you\'d like that mechanism explained next.';
  assert.ok(analyzeExplanation(twin).findings.some(item => item.ruleId === 'offer-to-continue'));
  assert.equal(analyzeExplanation(twin).findings.some(item => /volume|bind-mount/i.test(item.evidence)), false);
});

test('a GPU add question names host memory as the computer\'s main RAM', async () => {
  const question = 'Explain how a GPU can add two lists of numbers in parallel, and why moving the lists to the GPU still costs time.';
  const library = await loadLibrary();
  assert.deepEqual(selectGuides(question, undefined, library.index).topics, ['cpus-gpus']);
  const [guide] = await library.load(['cpus-gpus'], {question});
  assert.match(guide.text, /Host memory is the computer's main\s+RAM/i);
  assert.match(guide.text, /device memory is the GPU's own/i);
  const packet = await buildTeachingPacket(`/c90373deff:explain ${question}`);
  assert.match(packet.text, /Host memory is the computer's main\s+RAM/i);
  assert.doesNotMatch(packet.text.split('<guide id="cpus-gpus">')[0], /host memory|device memory|recipe|dish/i);
  assert.ok(Buffer.byteLength(packet.text) < 4_000);
});

test('a contact-bounce question loads the bounce slice and stops on the count', async () => {
  const question = 'Explain how a microcontroller program can count one button press more than once because the contacts bounce.';
  const library = await loadLibrary();
  assert.deepEqual(selectGuides(question, undefined, library.index).topics, ['devices-embedded']);
  const [guide] = await library.load(['devices-embedded'], {question});
  assert.deepEqual(guide.sliceIds, ['devices-bounce']);
  assert.match(guide.text, /Contact bounce is metal contacts/i);
  assert.match(guide.text, /logs several presses/i);
  assert.doesNotMatch(guide.text, /debounc|universal constant|interval trades/i);
  assert.equal(analyzeExplanation(guide.text).shouldBlock, false);
  const packet = await buildTeachingPacket(`/c90373deff:explain ${question}`);
  assert.deepEqual(packet.topics, ['devices-embedded']);
  assert.deepEqual(packet.sliceIds, ['devices-bounce']);
  assert.doesNotMatch(packet.text, /house price|what is being trained/i);
  assert.doesNotMatch(packet.text, /universal constant|interval trades/i);
  assert.ok(Buffer.byteLength(packet.text) < 4_000);
});

test('a tunneling question loads the timestep slice and omits later techniques', async () => {
  const question = 'Explain how a physics simulation uses a fixed timestep so a fast-moving object does not skip through a wall.';
  const library = await loadLibrary();
  assert.deepEqual(selectGuides(question, undefined, library.index).topics, ['physics-simulation']);
  const [guide] = await library.load(['physics-simulation'], {question});
  assert.deepEqual(guide.sliceIds, ['physics-tunnel']);
  assert.match(guide.text, /game or robotics/i);
  assert.match(guide.text, /A physics simulation is a program/i);
  assert.match(guide.text, /Timestep \(dt\):/);
  assert.match(guide.text, /100 m\/s × 0\.0167 s = 1\.667 m/);
  assert.match(guide.text, /That miss is tunneling/);
  assert.doesNotMatch(guide.text, /swept|CCD|smaller timestep|cross-validation/i);
  const packet = await buildTeachingPacket(`/c90373deff:explain ${question}`);
  assert.deepEqual(packet.topics, ['physics-simulation']);
  assert.deepEqual(packet.sliceIds, ['physics-tunnel']);
  assert.match(packet.text, /Do not add a later topic/);
  assert.match(packet.text, /Before using a term, say what kind of thing it is in this setting/);
  assert.doesNotMatch(packet.text, /what is being trained|what a feature is here|house price/i);
  assert.doesNotMatch(packet.text, /swept|CCD|smaller timestep/i);
  assert.ok(Buffer.byteLength(packet.text) < 4_000);
});

test('a leakage question loads the scaler slice and omits pipelines', async () => {
  const question = 'Explain how feature leakage during model training makes a test score look better than performance on new data.';
  const library = await loadLibrary();
  assert.deepEqual(selectGuides(question, undefined, library.index).topics, ['machine-learning']);
  const [guide] = await library.load(['machine-learning'], {question});
  assert.deepEqual(guide.sliceIds, ['ml-leakage']);
  assert.match(guide.text, /machine-learning model to predict a house price/i);
  assert.match(guide.text, /a feature is an input/i);
  assert.match(guide.text, /Training rows:/);
  assert.match(guide.text, /The training mean is 3\.6 \/ 3 = 1\.2/);
  assert.doesNotMatch(guide.text, /= .*=/);
  assert.match(guide.text, /reported test score is inflated/i);
  assert.doesNotMatch(guide.text, /pipeline|cross-validation|scikit-learn/i);
  const packet = await buildTeachingPacket(`/c90373deff:explain ${question}`);
  assert.deepEqual(packet.topics, ['machine-learning']);
  assert.deepEqual(packet.sliceIds, ['ml-leakage']);
  assert.match(packet.text, /Do not add a later topic/);
  assert.match(packet.text, /machine-learning model to predict a house price/i);
  assert.doesNotMatch(packet.text, /what is being trained|what a feature is here/);
  assert.doesNotMatch(packet.text, /pipeline|cross-validation|scikit-learn/i);
  assert.ok(Buffer.byteLength(packet.text) < 4_000);
});

test('an id-fragment miss does not get a nearest-neighbor whole guide', async () => {
  const barrier = 'Explain how a memory barrier orders concurrent writes across cores.';
  const mailbox = 'Explain how an actor mailbox serializes concurrent messages.';
  const library = await loadLibrary();
  assert.deepEqual(selectGuides(barrier, undefined, library.index).topics, []);
  assert.deepEqual(selectGuides(mailbox, undefined, library.index).topics, []);
  assert.equal(rankIndex(library.index, barrier).some(entry => entry.kind === 'topic'), false);
  const barrierPacket = await buildTeachingPacket(`/c90373deff:explain ${barrier}`);
  assert.deepEqual(barrierPacket.topics, []);
  assert.deepEqual(barrierPacket.sliceIds, []);
  assert.equal(barrierPacket.text.includes('<guide id="learning-memory">'), false);
  assert.equal(barrierPacket.text.includes('<guide id="concurrency-async">'), false);
  assert.equal(barrierPacket.text.includes('<guide id="memory-hardware">'), false);
  assert.match(barrierPacket.text, /If a topic guide does not match the asked subject, stop/);
  const mailboxPacket = await buildTeachingPacket(`/c90373deff:explain ${mailbox}`);
  assert.deepEqual(mailboxPacket.topics, []);
  assert.equal(mailboxPacket.text.includes('<guide id="concurrency-async">'), false);
});

test('a question about this skill loads the explain-skill slice only', async () => {
  const question = 'How does the /c90373deff:explain skill work?';
  const library = await loadLibrary();
  assert.deepEqual(selectGuides(question, undefined, library.index).topics, ['clear-explanations']);
  const [guide] = await library.load(['clear-explanations'], {question});
  assert.deepEqual(guide.sliceIds, ['explain-skill']);
  assert.match(guide.text, /^\/c90373deff:explain is a Claude Code skill/);
  assert.match(guide.text, /like a recipe/);
  assert.match(guide.text, /like a dish/);
  assert.match(guide.text, /packet \(the recipe\)/);
  assert.match(guide.text, /that packet \(the recipe\)/);
  assert.match(guide.text, /answer \(the dish\)/);
  assert.ok(guide.text.search(/like a recipe/) < guide.text.search(/packet \(the recipe\)/));
  assert.equal(analyzeExplanation(guide.text).shouldBlock, false);
  assert.equal(
    analyzeExplanation(guide.text, {question}).findings.some(item => item.ruleId === 'opening-skips-asked-subject'),
    false,
  );
  const packet = await buildTeachingPacket(`/c90373deff:explain ${question}`);
  assert.deepEqual(packet.topics, ['clear-explanations']);
  assert.deepEqual(packet.sliceIds, ['explain-skill']);
  assert.match(packet.text, /<guide id="clear-explanations">/);
  assert.match(packet.text, /UserPromptSubmit is the hook that runs inject-guides/);
  assert.match(packet.text, /Stop hook checks surface rules and can ask for one revision/);
  assert.match(packet.text, /stands unless the rewrite still skips the asked subject/);
  assert.doesNotMatch(packet.text.split('<guide id="clear-explanations">')[0], /\brecipe\b|\bdish\b/);
  assert.doesNotMatch(packet.text.split('<guide id="clear-explanations">')[0], /teaching packet/);
  assert.doesNotMatch(packet.text.split('<guide id="clear-explanations">')[0], /inject-guides|UserPromptSubmit|this plugin|explain-skill/);
  assert.doesNotMatch(skill, /term-matches the question|working-memory slices|define-then-pair/);
  assert.ok(Buffer.byteLength(packet.text) < 4_000);
  assert.deepEqual(
    selectGuides('Explain Git.', undefined, library.index).topics,
    ['git-version-control'],
  );
  assert.deepEqual(
    selectGuides('Explain why TCP packet loss is recovered.', undefined, library.index).topics,
    ['networks-protocols'],
  );
  assert.deepEqual(selectGuides('Explain React hooks.', undefined, library.index).topics, []);
  const [miss] = await library.load(['clear-explanations'], {question: 'Explain Git.'});
  assert.deepEqual(miss.sliceIds, []);
  assert.equal(miss.text, '');
  const git = await buildTeachingPacket('/c90373deff:explain Explain Git.');
  assert.equal(git.text.includes('<guide id="clear-explanations">'), false);
  assert.doesNotMatch(git.text, /UserPromptSubmit is the hook that runs inject-guides/);
});

test('a kitchen-sink Git question still loads at most four slices', async () => {
  assert.equal(WORKING_MEMORY_SLOTS, 4);
  const library = await loadLibrary();
  const [guide] = await library.load(['git-version-control'], {
    question: 'Explain Git. Cover commit, staging, branches, merge, and remotes.',
  });
  assert.ok(guide.sliceIds.length <= WORKING_MEMORY_SLOTS);
  assert.deepEqual(guide.sliceIds, ['git-purpose', 'git-commits', 'git-staging', 'git-branches']);
  const packet = await buildTeachingPacket('/c90373deff:explain Explain Git.');
  assert.match(packet.text, /at most four new ideas/i);
  assert.doesNotMatch(packet.text, /staging workflow/i);
  assert.doesNotMatch(packet.text, /\bmerging\b/i);
  assert.ok(Buffer.byteLength(packet.text) < 4_000);
});
