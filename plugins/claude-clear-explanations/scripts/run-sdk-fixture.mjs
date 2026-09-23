import { runExplanation } from '../src/runner.mjs';

export async function replayFixture(fixture, {library, audit} = {}) {
  const outputs = [...(fixture.calls ?? [])];
  const result = await runExplanation(fixture.request, {
    library,
    models: {draft: 'fixture', route: 'fixture', rewrite: 'fixture', verify: 'fixture'},
    maxBudgetUsd: fixture.maxBudgetUsd ?? 1,
    timeoutMs: 1000,
    audit: audit ?? (async () => {}),
    client: {
      async complete(call) {
        const next = outputs.shift();
        if (!next || next.stage !== call.stage) {
          throw Object.assign(new Error('fixture-mismatch'), {code: 'model-failed'});
        }
        return {output: next.output, costUsd: next.costUsd ?? 0.01, model: call.model};
      },
    },
  });
  return result;
}
