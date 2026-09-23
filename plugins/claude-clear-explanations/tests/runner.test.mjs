import assert from "node:assert/strict";
import test from "node:test";
import { runExplanation } from "../src/runner.mjs";

const answer = "The cache stores a value for 60 seconds. After expiry, the next request reads the source.";
const request = { question: "How does this cache expire?", sources: [{ id: "cache-spec", text: answer }] };
const approved = { accepted: true, findings: [], checkedSourceIds: ["cache-spec"] };
const selection = { methods: ["definition"], topics: ["storage"] };
const finding = { kind: "factual", message: "The candidate changes the expiry time.", evidenceIds: ["cache-spec"] };

function harness(overrides = {}) {
  const calls = [];
  const audits = [];
  const loaded = [];
  const library = {
    index: [
      { id: "definition", kind: "method", description: "Define a concept." },
      { id: "comparison", kind: "method", description: "Compare two choices." },
      { id: "diagnosis", kind: "method", description: "Diagnose a fault." },
      { id: "storage", kind: "topic", description: "Explain stored data." },
      { id: "network", kind: "topic", description: "Explain network requests." },
      { id: "hardware", kind: "topic", description: "Explain processors." },
      { id: "games", kind: "topic", description: "Explain games." },
    ],
    general: [{ id: "policy", text: "Write clear, factual prose." }, { id: "general", text: "Begin with the answer." }],
    async load(ids) {
      loaded.push(...ids);
      return ids.map((id) => ({ id, text: `Guidance for ${id}.` }));
    },
  };
  const options = {
    library,
    models: { draft: "draft-model", route: "route-model", rewrite: "rewrite-model", verify: "verify-model" },
    maxBudgetUsd: 1,
    timeoutMs: 1000,
    audit: async (record) => audits.push(record),
    client: {
      async complete(call) {
        calls.push(call);
        if (overrides.complete) return overrides.complete(call, calls);
        const output = {
          draft: { draft: answer, ...selection },
          route: selection,
          rewrite: { answer, corrections: [] },
          verify: approved,
        }[call.stage];
        return { output, costUsd: 0.01, model: call.model };
      },
    },
  };
  return { calls, audits, loaded, options: { ...options, ...overrides.options } };
}

function failed(result, forbidden = []) {
  assert.equal(result.status, "failed");
  assert.equal(Object.hasOwn(result, "answer"), false);
  assert.equal(typeof result.reason, "string");
  assert.ok(result.reason.length > 0);
  for (const value of forbidden) assert.equal(JSON.stringify(result).includes(value), false);
}

test("generated draft routes in one call and releases only the verified answer", async () => {
  const h = harness();
  const result = await runExplanation(request, h.options);
  assert.equal(result.status, "accepted");
  assert.equal(result.answer, answer);
  assert.deepEqual(h.calls.map((call) => call.stage), ["draft", "rewrite", "verify"]);
  assert.deepEqual(new Set(result.guideIds), new Set(["policy", "general", "definition", "storage"]));
  assert.equal(typeof result.auditId, "string");
  assert.ok(result.auditId.length > 0);
  assert.ok(h.audits.length > 0);
  assert.equal(h.calls[0].model, "draft-model");
  assert.equal(h.calls[1].model, "rewrite-model");
  assert.equal(h.calls[2].model, "verify-model");
  assert.ok(h.calls[1].maxBudgetUsd < h.calls[0].maxBudgetUsd);
});

test("supplied drafts use a separate routing call without changing input evidence", async () => {
  const h = harness();
  const input = structuredClone({ ...request, draft: "This value is cached for 60 seconds." });
  const before = structuredClone(input);
  const result = await runExplanation(input, h.options);
  assert.equal(result.status, "accepted");
  assert.deepEqual(h.calls.map((call) => call.stage), ["route", "rewrite", "verify"]);
  assert.deepEqual(input, before);
  const verifierInput = JSON.stringify(h.calls.at(-1));
  assert.ok(verifierInput.includes(input.draft));
  assert.ok(verifierInput.includes(input.sources[0].text));
});

test("unknown topics use general guidance without loading unrelated files", async () => {
  const h = harness({ complete: async (call) => ({ output: call.stage === "route" ? { methods: [], topics: [] } : call.stage === "rewrite" ? { answer, corrections: [] } : approved, costUsd: 0.01, model: call.model }) });
  const result = await runExplanation({ ...request, draft: answer }, h.options);
  assert.equal(result.status, "accepted");
  assert.deepEqual(new Set(result.guideIds), new Set(["policy", "general"]));
  assert.equal(h.loaded.length, 0);
  assert.ok(JSON.stringify(h.calls.find((call) => call.stage === "rewrite")).includes("Write clear, factual prose."));
});

for (const [label, route] of [
  ["unknown identifier", { methods: [], topics: ["missing"] }],
  ["wrong guide kind", { methods: ["storage"], topics: [] }],
  ["too many methods", { methods: ["definition", "comparison", "diagnosis"], topics: [] }],
  ["too many topics", { methods: [], topics: ["storage", "network", "hardware", "games"] }],
]) {
  test(`invalid routing fails before rewriting: ${label}`, async () => {
    const h = harness({ complete: async (call) => ({ output: route, costUsd: 0.01, model: call.model }) });
    failed(await runExplanation({ ...request, draft: answer }, h.options));
    assert.deepEqual(h.calls.map((call) => call.stage), ["route"]);
  });
}

test("mixed-topic routing can select the maximum supported number of guides", async () => {
  const route = { methods: ["definition", "comparison"], topics: ["storage", "network", "hardware"] };
  const h = harness({ complete: async (call) => ({ output: call.stage === "route" ? route : call.stage === "rewrite" ? { answer, corrections: [] } : approved, costUsd: 0.01, model: call.model }) });
  const result = await runExplanation({ ...request, draft: answer }, h.options);
  assert.equal(result.status, "accepted");
  assert.equal(h.loaded.length, 5);
});

for (const [label, review] of [
  ["missing fields", { accepted: true }],
  ["wrong accepted type", { ...approved, accepted: "true" }],
  ["unchecked evidence", { ...approved, checkedSourceIds: [] }],
  ["unknown evidence", { ...approved, checkedSourceIds: ["invented"] }],
  ["accepted with findings", { ...approved, findings: [finding] }],
]) {
  test(`invalid review cannot release a candidate: ${label}`, async () => {
    const h = harness({ complete: async (call) => ({ output: call.stage === "draft" ? { draft: answer, ...selection } : call.stage === "rewrite" ? { answer, corrections: [] } : review, costUsd: 0.01, model: call.model }) });
    failed(await runExplanation(request, h.options), [answer]);
  });
}

for (const defect of ["changed number", "reversed condition", "missing caveat", "unsupported correction", "misleading analogy", "error in original draft"]) {
  test(`review findings survive all repair attempts: ${defect}`, async () => {
    const marker = `PRIVATE CANDIDATE ${defect}`;
    const h = harness({ complete: async (call) => ({ output: call.stage === "draft" ? { draft: marker, ...selection } : call.stage === "rewrite" ? { answer: marker, corrections: [] } : { accepted: false, findings: [{ ...finding, message: `${defect}: ${marker}` }], checkedSourceIds: ["cache-spec"] }, costUsd: 0.01, model: call.model }) });
    failed(await runExplanation(request, h.options), [marker]);
    assert.deepEqual(h.calls.map((call) => call.stage), ["draft", "rewrite", "verify", "rewrite", "verify", "rewrite", "verify"]);
  });
}

test("a repaired answer is verified again before release", async () => {
  let reviews = 0;
  const h = harness({ complete: async (call) => ({ output: call.stage === "draft" ? { draft: answer, ...selection } : call.stage === "rewrite" ? { answer, corrections: [] } : ++reviews === 1 ? { accepted: false, findings: [finding], checkedSourceIds: ["cache-spec"] } : approved, costUsd: 0.01, model: call.model }) });
  const result = await runExplanation(request, h.options);
  assert.equal(result.status, "accepted");
  assert.equal(reviews, 2);
  assert.ok(JSON.stringify(h.calls.filter((call) => call.stage === "rewrite")[1]).includes(finding.message));
});

test("deterministic style findings prevent an approved canned opening from release", async () => {
  const candidate = `Great question! ${answer}`;
  const h = harness({ complete: async (call) => ({ output: call.stage === "draft" ? { draft: answer, ...selection } : call.stage === "rewrite" ? { answer: candidate, corrections: [] } : approved, costUsd: 0.01, model: call.model }) });
  failed(await runExplanation(request, h.options), [candidate]);
  assert.equal(h.calls.filter((call) => call.stage === "rewrite").length, 3);
});

test("model exceptions do not expose provider text or draft content", async () => {
  const h = harness({ complete: async () => { throw new Error("PRIVATE PROVIDER ERROR api-secret"); } });
  failed(await runExplanation(request, h.options), ["PRIVATE PROVIDER ERROR", "api-secret"]);
});

test("already-cancelled runs make no model calls", async () => {
  const controller = new AbortController();
  controller.abort();
  const h = harness({ options: { signal: controller.signal } });
  failed(await runExplanation(request, h.options));
  assert.equal(h.calls.length, 0);
});

test("a stalled model call reaches a bounded timeout", { timeout: 1000 }, async () => {
  const h = harness({ options: { timeoutMs: 20 }, complete: async () => new Promise(() => {}) });
  failed(await runExplanation(request, h.options));
});

for (const costUsd of [-1, NaN, Infinity, 1.5]) {
  test(`invalid or excessive model cost fails closed: ${costUsd}`, async () => {
    const h = harness({ complete: async (call) => ({ output: { draft: answer, ...selection }, costUsd, model: call.model }) });
    failed(await runExplanation(request, h.options));
    assert.equal(h.calls.length, 1);
  });
}

test("shared budget exhaustion stops subsequent calls", async () => {
  const h = harness({ complete: async (call) => ({ output: call.stage === "draft" ? { draft: answer, ...selection } : { answer, corrections: [] }, costUsd: 0.6, model: call.model }) });
  failed(await runExplanation(request, h.options), [answer]);
  assert.equal(h.calls.length, 2);
  assert.ok(h.calls[1].maxBudgetUsd <= 0.4 + Number.EPSILON);
});

test("oversized prompts fail before a model receives truncated evidence", async () => {
  const h = harness({ options: { maxPromptBytes: 100 } });
  failed(await runExplanation({ ...request, sources: [{ id: "cache-spec", text: "Evidence ".repeat(1000) }] }, h.options));
  assert.equal(h.calls.length, 0);
});

test("writer instructions contain only general and selected guidance", async () => {
  const h = harness();
  h.options.library.index.push({ id: "negative-examples", kind: "topic", description: "Reviewer examples." });
  const originalLoad = h.options.library.load;
  h.options.library.load = async (ids) => {
    assert.equal(ids.includes("negative-examples"), false);
    return originalLoad(ids);
  };
  const result = await runExplanation(request, h.options);
  assert.equal(result.status, "accepted");
  for (const call of h.calls.filter((item) => item.stage === "rewrite")) {
    assert.ok(JSON.stringify(call).includes("Guidance for storage."));
    assert.equal(JSON.stringify(call).includes("Guidance for games."), false);
    assert.equal(JSON.stringify(call).includes("Guidance for negative-examples."), false);
  }
});
