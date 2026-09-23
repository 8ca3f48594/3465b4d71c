import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  analyzeExplanation,
  evaluateStopHook,
} from "../scripts/check-explanation.mjs";

const checkerPath = fileURLToPath(
  new URL("../scripts/check-explanation.mjs", import.meta.url),
);

const reasons = {
  "canned-preamble": "Remove the canned opening and start with the answer.",
  "heading-overload":
    "Reduce sectioning; use headings only when they help the reader navigate.",
  "offer-to-continue":
    "Remove the generic follow-up offer and end on the answer.",
};

function runChecker(args, input) {
  return spawnSync(process.execPath, [checkerPath, ...args], {
    input,
    encoding: "utf8",
  });
}

function parseOnlyJson(stdout) {
  const trimmed = stdout.trim();
  assert.notEqual(trimmed, "", "the checker must emit a JSON value");
  return JSON.parse(trimmed);
}

function assertAuditableFinding(finding, source) {
  assert.equal(typeof finding.reason, "string");
  assert.notEqual(finding.reason.trim(), "");
  assert.equal(typeof finding.evidence, "string");
  assert.notEqual(finding.evidence, "");
  assert.equal(Number.isInteger(finding.span?.start), true);
  assert.equal(Number.isInteger(finding.span?.end), true);
  assert.ok(finding.span.start >= 0);
  assert.ok(finding.span.end > finding.span.start);

  // JavaScript slice offsets are UTF-16 code-unit offsets. Keeping evidence tied
  // to this public span makes every finding inspectable by hook consumers.
  assert.equal(
    source.slice(finding.span.start, finding.span.end),
    finding.evidence,
  );
}

test("a direct, concise technical explanation passes", () => {
  const explanation =
    "The cache stores the resolved value after the first read. Later calls return that value, so the file is not opened again.";

  const result = analyzeExplanation(explanation);

  assert.equal(result.shouldBlock, false);
  assert.deepEqual(
    result.findings.filter((finding) => finding.blocking === true),
    [],
  );
});

test("combined canned prose patterns block with exact actionable findings", () => {
  const explanation = `You're absolutely right to ask. I'd be happy to explain! 🧭

## Overview

The loader reads the configuration file and parses its JSON.

## How it works

It validates the parsed value before returning it.

## Why it matters

Validation keeps malformed settings out of the rest of the application.

## Key takeaway

The loader turns untrusted file contents into validated configuration.

Would you like me to explain anything else?`;

  const result = analyzeExplanation(explanation);

  assert.equal(result.shouldBlock, true);
  const findingsByRule = new Map(
    result.findings.map((finding) => [finding.ruleId, finding]),
  );
  assert.deepEqual([...findingsByRule.keys()].sort(), Object.keys(reasons).sort());

  for (const [ruleId, reason] of Object.entries(reasons)) {
    const finding = findingsByRule.get(ruleId);
    assert.ok(finding, `missing ${ruleId} finding`);
    assert.equal(finding.reason, reason);
    assertAuditableFinding(finding, explanation);
  }
});

test("tokens inside fenced code blocks do not trigger prose rules", () => {
  const explanation = `The function returns the first matching record.

\`\`\`text
You're absolutely right to ask. I'd be happy to explain!
## Overview
## How it works
## Why it matters
## Key takeaway
Would you like me to explain anything else?
\`\`\``;

  const result = analyzeExplanation(explanation);

  assert.equal(result.shouldBlock, false);
  assert.deepEqual(result.findings, []);
});

test("one useful heading and one contextual contrast do not block", () => {
  const explanation = `## Why the guard exists

The guard is not a retry loop; it prevents a second write after the request has already completed.`;

  const result = analyzeExplanation(explanation);

  assert.equal(result.shouldBlock, false);
});

test("an active Stop-hook revision stands unless it still skips the asked subject", () => {
  const dirtyOther = evaluateStopHook({
    hook_event_name: "Stop",
    stop_hook_active: true,
    last_assistant_message:
      "You're absolutely right.\n\n## One\n## Two\n## Three\n## Four\n\nWould you like me to continue?",
  });
  assert.deepEqual(dirtyOther, {});

  const question = "how the /c90373deff:explain skill works (hooks, packet, slices)";
  const inner = [
    "A teaching packet is like a recipe: it's the injected guide for this turn.",
    "This skill uses two hooks.",
  ].join(" ");
  const skipped = evaluateStopHook({
    hook_event_name: "Stop",
    stop_hook_active: true,
    prompt: `/c90373deff:explain ${question}`,
    last_assistant_message: inner,
  });
  assert.equal(skipped.decision, "block");
  assert.match(skipped.reason, /names the thing the question asked about/);

  const first = evaluateStopHook({
    hook_event_name: "Stop",
    stop_hook_active: false,
    last_assistant_message:
      "You're absolutely right.\n\n## One\n## Two\n## Three\n## Four\n\nWould you like me to continue?",
  });
  assert.equal(first.decision, "block");
});

test("a named-subject revision stands even when other surface findings remain", () => {
  const question = "how the /c90373deff:explain skill works (hooks, packet, slices)";
  const lastDraft = [
    "A /c90373deff:explain is a Claude Code skill: a packaged set of instructions the harness loads for a task.",
    "inject-guides attached two slices: one holding the always-on writing rules, one holding facts about this skill.",
    "Those slices arrived as context before any answer was written.",
  ].join(" ");
  const revision = evaluateStopHook({
    hook_event_name: "Stop",
    stop_hook_active: true,
    prompt: `/c90373deff:explain ${question}`,
    last_assistant_message: lastDraft,
  });
  assert.deepEqual(revision, {});
  assert.equal(
    analyzeExplanation(lastDraft, {question}).findings.some(
      (item) => item.ruleId === "opening-skips-asked-subject",
    ),
    false,
  );
});

test("an active Stop-hook revision passes when the answer is clean", () => {
  const output = evaluateStopHook({
    hook_event_name: "Stop",
    stop_hook_active: true,
    last_assistant_message: "A cache is a fast local copy of a file. Later reads return that copy.",
  });

  assert.deepEqual(output, {});
});

test("missing or malformed last_assistant_message fails open", () => {
  const inputs = [
    {},
    { stop_hook_active: false },
    { stop_hook_active: false, last_assistant_message: null },
    { stop_hook_active: false, last_assistant_message: { text: "not a string" } },
  ];

  for (const input of inputs) {
    const output = evaluateStopHook(input);
    assert.doesNotThrow(() => JSON.stringify(output));
    assert.deepEqual(output, {});
  }
});

test("CLI hook mode reads stdin and writes only valid Claude Stop-hook JSON", () => {
  const input = JSON.stringify({
    hook_event_name: "Stop",
    stop_hook_active: false,
    last_assistant_message: `You're absolutely right to ask.

## Overview
## Mechanics
## Tradeoffs
## Summary

Would you like me to explain anything else?`,
  });

  const run = runChecker([], input);

  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.stderr, "");
  const output = parseOnlyJson(run.stdout);
  assert.equal(output.decision, "block");
  assert.equal(typeof output.reason, "string");
  assert.notEqual(output.reason.trim(), "");
});

test("CLI hook mode emits valid fail-open JSON for malformed stdin", () => {
  const run = runChecker([], "{not valid JSON");

  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.stderr, "");
  assert.deepEqual(parseOnlyJson(run.stdout), {});
});

test("standalone analyze mode emits auditable JSON metrics and findings", () => {
  const explanation = `You're absolutely right to ask. 🧭

## Overview
## Mechanics
## Tradeoffs
## Summary

Would you like me to explain anything else?`;
  const run = runChecker(["--analyze"], explanation);

  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.stderr, "");
  const output = parseOnlyJson(run.stdout);
  assert.equal(typeof output.version, "string");
  assert.equal(output.shouldBlock, true);
  assert.equal(Number.isInteger(output.metrics?.characterCount), true);
  assert.equal(output.metrics.characterCount, explanation.length);
  assert.equal(Number.isInteger(output.metrics?.wordCount), true);
  assert.ok(output.metrics.wordCount > 0);
  assert.equal(Number.isInteger(output.metrics?.headingCount), true);
  assert.equal(output.metrics.headingCount, 4);
  assert.ok(output.findings.length >= 3);
  for (const finding of output.findings) {
    assertAuditableFinding(finding, explanation);
  }
});
