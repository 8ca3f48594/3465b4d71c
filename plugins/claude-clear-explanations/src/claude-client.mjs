import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

class ClientError extends Error {
  constructor(code) {
    super(code);
    this.name = 'ClaudeClientError';
    this.code = code;
  }
}

function fail(code) { throw new ClientError(code); }
function isObject(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }

function runtimeEnvironment(configDir) {
  const allowed = new Set([
    'path', 'systemroot', 'windir', 'comspec', 'pathext', 'temp', 'tmp', 'tmpdir',
    'home', 'userprofile', 'lang', 'lc_all', 'anthropic_api_key',
  ]);
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => allowed.has(key.toLowerCase())));
  return {
    ...env,
    CLAUDE_CONFIG_DIR: configDir,
    CLAUDE_CODE_DISABLE_AUTO_MEMORY: '1',
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
    CLAUDE_CODE_MAX_RETRIES: '0',
    API_TIMEOUT_MS: '120000',
  };
}

function readFinal(message, model, maxBudgetUsd) {
  const costUsd = message.total_cost_usd;
  const failWithAccounting = code => {
    const error = new ClientError(code);
    if (Number.isFinite(costUsd) && costUsd >= 0) error.costUsd = costUsd;
    throw error;
  };
  if (message.subtype === 'error_max_budget_usd') failWithAccounting('CLAUDE_BUDGET_EXCEEDED');
  if (message.subtype !== 'success' || message.is_error !== false) failWithAccounting('CLAUDE_FAILED');
  if (!Number.isFinite(costUsd) || costUsd < 0 || !isObject(message.structured_output)
      || !isObject(message.usage)) failWithAccounting('CLAUDE_INVALID_RESULT');
  if (costUsd > maxBudgetUsd) failWithAccounting('CLAUDE_BUDGET_EXCEEDED');
  const resolvedModels = Object.keys(message.modelUsage ?? {});
  return { output: message.structured_output, costUsd, model: resolvedModels.length === 1 ? resolvedModels[0] : model, usage: message.usage };
}

export function createClaudeClient({ query, cwd } = {}) {
  return {
    async complete({ system, prompt, schema, model, maxBudgetUsd, signal } = {}) {
      if (typeof model !== 'string' || !model.trim() || !isObject(schema)
          || typeof system !== 'string' || typeof prompt !== 'string'
          || !Number.isFinite(maxBudgetUsd) || maxBudgetUsd <= 0) fail('CLAUDE_INVALID_REQUEST');
      if (signal?.aborted) fail('CLAUDE_ABORTED');
      const abortController = new AbortController();
      const abort = () => abortController.abort();
      signal?.addEventListener('abort', abort, { once: true });
      let configDir;
      try {
        const runQuery = query ?? (await import('@anthropic-ai/claude-agent-sdk')).query;
        configDir = await mkdtemp(join(tmpdir(), 'claude-explanation-'));
        if (signal?.aborted) fail('CLAUDE_ABORTED');
        const env = runtimeEnvironment(configDir);
        if (!query && !env.ANTHROPIC_API_KEY) fail('CLAUDE_AUTH_REQUIRED');
        const messages = runQuery({
          prompt,
          options: {
            cwd: cwd ?? configDir,
            systemPrompt: system,
            model,
            maxBudgetUsd,
            maxTurns: 3,
            outputFormat: { type: 'json_schema', schema },
            tools: [],
            allowedTools: [],
            canUseTool: async () => ({ behavior: 'deny', message: 'Tools are disabled.' }),
            permissionMode: 'dontAsk',
            mcpServers: {},
            strictMcpConfig: true,
            settingSources: [],
            plugins: [],
            hooks: {},
            settings: { disableAllHooks: true, autoMemoryEnabled: false },
            persistSession: false,
            includePartialMessages: false,
            abortController,
            env,
            stderr: () => {},
          },
        });
        let final;
        for await (const message of messages) {
          if (abortController.signal.aborted) fail('CLAUDE_ABORTED');
          if (message.type === 'result') {
            if (final) fail('CLAUDE_INVALID_RESULT');
            final = readFinal(message, model, maxBudgetUsd);
          }
        }
        if (abortController.signal.aborted) fail('CLAUDE_ABORTED');
        if (!final) fail('CLAUDE_NO_RESULT');
        return final;
      } catch (error) {
        if (abortController.signal.aborted) fail('CLAUDE_ABORTED');
        if (error instanceof ClientError) throw error;
        fail('CLAUDE_FAILED');
      } finally {
        signal?.removeEventListener('abort', abort);
        if (configDir) {
          // mkdtemp creates this directory for this call alone.
          try { await rm(configDir, { recursive: true, force: true }); }
          catch { fail('CLAUDE_CLEANUP_FAILED'); }
        }
      }
    },
  };
}
