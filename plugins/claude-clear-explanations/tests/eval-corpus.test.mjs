import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const pluginRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const casesPath = fileURLToPath(
  new URL("../quality/checker-cases.json", import.meta.url),
);
const runnerPath = fileURLToPath(
  new URL("../scripts/run-checker-evals.mjs", import.meta.url),
);

const knownRuleIds = new Set([
  "canned-preamble",
  "heading-overload",
  "offer-to-continue",
  "git-records-every-edit",
  "git-commit-overwrites-history",
  "git-automatic-image-merge",
  "git-save-is-commit",
  "git-branches-required-for-history",
  "git-uncommitted-always-recoverable",
  "git-create-branch-skips-switch",
  "git-commit-uploads",
  "git-opening-hides-subject",
  "ai-process-narration",
  "ai-throat-clearing",
  "ai-signposted-recap",
  "ai-topic-menu",
  "ai-later-topic",
  "opening-skips-kind",
  "opening-jumps-to-story",
  "opening-skips-domain",
  "opening-states-result",
  "opening-leads-with-analog",
  "opening-skips-asked-subject",
  "empty-setup-sentence",
  "unnamed-demonstrative",
  "unused-term",
  "dropped-analog",
]);
const requiredTags = [
  "clean-direct",
  "legitimate-headings",
  "tutorial-detail",
  "fenced-code",
  "canned-opening",
  "excessive-headings",
  "generic-follow-up-offer",
  "combined-blocking-cluster",
  "non-bmp-offsets",
  "malformed-empty",
  "mixed-crlf",
  "false-positive-counterexample",
  "git-misconception",
  "git-false-positive",
  "ai-ism",
  "empty-setup",
  "opening-order",
  "later-topic",
  "named-referent",
  "analog-binding",
];

function loadCorpus() {
  return JSON.parse(readFileSync(casesPath, "utf8"));
}

test("the checker corpus is valid, deterministic, and covers every target class", () => {
  const corpus = loadCorpus();

  assert.equal(typeof corpus.version, "string");
  assert.ok(Array.isArray(corpus.cases));
  assert.ok(corpus.cases.length >= 24);

  const ids = new Set();
  const coveredTags = new Set();
  for (const entry of corpus.cases) {
    assert.equal(typeof entry.id, "string");
    assert.match(entry.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.equal(ids.has(entry.id), false, `duplicate case id: ${entry.id}`);
    ids.add(entry.id);

    assert.ok(Object.hasOwn(entry, "text"), `${entry.id} is missing text`);
    assert.ok(Array.isArray(entry.tags), `${entry.id} tags must be an array`);
    assert.ok(entry.tags.length > 0, `${entry.id} must have a tag`);
    for (const tag of entry.tags) {
      assert.equal(typeof tag, "string");
      coveredTags.add(tag);
    }

    assert.ok(
      Array.isArray(entry.expectedRuleIds),
      `${entry.id} expectedRuleIds must be an array`,
    );
    assert.deepEqual(
      [...new Set(entry.expectedRuleIds)],
      entry.expectedRuleIds,
      `${entry.id} repeats a rule id`,
    );
    for (const ruleId of entry.expectedRuleIds) {
      assert.ok(knownRuleIds.has(ruleId), `${entry.id} has unknown rule ${ruleId}`);
    }
    assert.equal(typeof entry.shouldBlock, "boolean");
  }

  assert.deepEqual(
    requiredTags.filter((tag) => !coveredTags.has(tag)),
    [],
    "corpus is missing required behavior categories",
  );
});

test("the public evaluation runner passes every declared corpus case", () => {
  const corpus = loadCorpus();
  const run = spawnSync(
    process.execPath,
    [runnerPath, "--cases", casesPath],
    { cwd: pluginRoot, encoding: "utf8" },
  );

  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.stderr, "");
  const summary = JSON.parse(run.stdout.trim());
  assert.equal(summary.caseCount, corpus.cases.length);
  assert.equal(summary.passed, corpus.cases.length);
  assert.equal(summary.failed, 0);
  assert.ok(Array.isArray(summary.results));
  assert.equal(summary.results.length, corpus.cases.length);

  const resultsById = new Map(
    summary.results.map((result) => [result.id, result]),
  );
  assert.equal(resultsById.size, corpus.cases.length);
  assert.deepEqual(
    [...resultsById.keys()].sort(),
    corpus.cases.map((entry) => entry.id).sort(),
  );

  for (const entry of corpus.cases) {
    const result = resultsById.get(entry.id);
    assert.ok(result, `missing runner result for ${entry.id}`);
    assert.equal(result.passed, true, `${entry.id}: ${result.error ?? "failed"}`);
    assert.deepEqual(result.actualRuleIds, entry.expectedRuleIds, entry.id);
    assert.equal(result.actualShouldBlock, entry.shouldBlock, entry.id);
  }
});
