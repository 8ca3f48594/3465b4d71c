import test from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { createClaudeClient } from '../src/claude-client.mjs';

const request = {
  stage: 'rewrite', system: 'Explain clearly.', prompt: 'Supplied material.',
  schema: { type: 'object', properties: { answer: { type: 'string' } }, required: ['answer'] },
  model: 'explicit-test-model', maxBudgetUsd: 0.5,
};
const success = { type: 'result', subtype: 'success', is_error: false,
  structured_output: { answer: 'Accepted candidate.' }, total_cost_usd: 0.02,
  usage: { input_tokens: 12, output_tokens: 7 }, modelUsage: { 'explicit-test-model': {} } };
function queryWith(messages) { return async function* () { yield* messages; }; }

test('returns only structured final content and validated accounting', async () => {
  const client = createClaudeClient({ query: queryWith([
    { type: 'assistant', message: { content: 'PRIVATE DRAFT' } }, success,
  ]) });
  assert.deepEqual(await client.complete(request), {
    output: success.structured_output, costUsd: 0.02, model: request.model, usage: success.usage,
  });
});

test('isolates settings, environment, tools and session; forwards caller constraints', async () => {
  let captured;
  const saved = process.env.UNRELATED_SECRET;
  process.env.UNRELATED_SECRET = 'test-fixture-only';
  try {
    const client = createClaudeClient({ cwd: process.cwd(), query: async function* (input) {
      captured = input;
      assert.equal(typeof input.options.stderr, 'function');
      input.options.stderr('PRIVATE STDERR');
      yield success;
    } });
    await client.complete(request);
    const { options } = captured;
    assert.equal(captured.prompt, request.prompt);
    assert.equal(options.systemPrompt, request.system);
    assert.equal(options.model, request.model);
    assert.equal(options.maxBudgetUsd, 0.5);
    assert.deepEqual(options.outputFormat, { type: 'json_schema', schema: request.schema });
    assert.deepEqual(options.tools, []);
    assert.deepEqual(options.allowedTools, []);
    assert.deepEqual(options.mcpServers, {});
    assert.equal(options.strictMcpConfig, true);
    assert.deepEqual(options.settingSources, []);
    assert.deepEqual(options.plugins, []);
    assert.equal(options.settings.disableAllHooks, true);
    assert.equal(options.settings.autoMemoryEnabled, false);
    assert.equal(options.persistSession, false);
    assert.equal(options.includePartialMessages, false);
    assert.equal(options.permissionMode, 'dontAsk');
    assert.ok(options.maxTurns > 0 && options.maxTurns <= 3);
    assert.equal(options.env.UNRELATED_SECRET, undefined);
    assert.equal(options.env.CLAUDE_CODE_DISABLE_AUTO_MEMORY, '1');
    assert.ok(options.env.CLAUDE_CONFIG_DIR);
    assert.equal(options.resume, undefined);
    assert.equal(options.continue, undefined);
    assert.equal((await options.canUseTool('Bash', {})).behavior, 'deny');
    await assert.rejects(access(options.env.CLAUDE_CONFIG_DIR));
  } finally {
    if (saved === undefined) delete process.env.UNRELATED_SECRET;
    else process.env.UNRELATED_SECRET = saved;
  }
});

test('rejects absent, unsuccessful and malformed final responses without raw details', async () => {
  const cases = [
    [[], 'CLAUDE_NO_RESULT'],
    [[{ ...success, subtype: 'error_max_budget_usd', errors: ['PRIVATE ERROR'] }], 'CLAUDE_BUDGET_EXCEEDED'],
    [[{ ...success, is_error: true }], 'CLAUDE_FAILED'],
    [[{ ...success, structured_output: undefined, result: 'PRIVATE DRAFT' }], 'CLAUDE_INVALID_RESULT'],
    [[{ ...success, total_cost_usd: NaN }], 'CLAUDE_INVALID_RESULT'],
    [[{ ...success, total_cost_usd: -1 }], 'CLAUDE_INVALID_RESULT'],
    [[{ ...success, total_cost_usd: 0.6 }], 'CLAUDE_BUDGET_EXCEEDED'],
  ];
  for (const [messages, code] of cases) {
    await assert.rejects(createClaudeClient({ query: queryWith(messages) }).complete(request),
      error => error.code === code && error.message === code && !error.cause);
  }
});

test('sanitizes transport errors and never returns an earlier result after a stream failure', async () => {
  const query = async function* () { yield success; throw new Error('PRIVATE TRANSPORT DETAILS'); };
  await assert.rejects(createClaudeClient({ query }).complete(request),
    error => error.code === 'CLAUDE_FAILED' && error.message === 'CLAUDE_FAILED' && !error.cause);
});

test('honors cancellation before starting and forwards cancellation during a query', async () => {
  const before = new AbortController(); before.abort();
  let calls = 0;
  const never = createClaudeClient({ query: async function* () { calls++; yield success; } });
  await assert.rejects(never.complete({ ...request, signal: before.signal }), { code: 'CLAUDE_ABORTED' });
  assert.equal(calls, 0);
  const during = new AbortController();
  const client = createClaudeClient({ query: async function* ({ options }) {
    during.abort();
    assert.equal(options.abortController.signal.aborted, true);
    yield success;
  } });
  await assert.rejects(client.complete({ ...request, signal: during.signal }), { code: 'CLAUDE_ABORTED' });
});

test('rejects missing explicit model, schema or valid budget before calling the SDK', async () => {
  let calls = 0;
  const client = createClaudeClient({ query: async function* () { calls++; yield success; } });
  for (const change of [{ model: '' }, { schema: null }, { maxBudgetUsd: 0 }, { maxBudgetUsd: Infinity }]) {
    await assert.rejects(client.complete({ ...request, ...change }), { code: 'CLAUDE_INVALID_REQUEST' });
  }
  assert.equal(calls, 0);
});

test('live SDK runner smoke stays skipped without a key and an explicit live flag', {
  skip: process.env.LIVE_CLAUDE_SDK_TEST !== '1' || !process.env.ANTHROPIC_API_KEY,
}, async () => {
  const client = createClaudeClient();
  const result = await client.complete(request);
  assert.equal(typeof result.costUsd, 'number');
  assert.ok(result.output);
});
