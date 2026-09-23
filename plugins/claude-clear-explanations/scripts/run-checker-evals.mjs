import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";

import { analyzeExplanation } from "./check-explanation.mjs";

function casesPathFromArgs(args) {
  const flagIndex = args.indexOf("--cases");
  if (flagIndex === -1 || typeof args[flagIndex + 1] !== "string") {
    throw new Error("Usage: run-checker-evals.mjs --cases <path>");
  }
  return resolve(args[flagIndex + 1]);
}

function arraysEqual(left, right) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

async function run() {
  const casesPath = casesPathFromArgs(process.argv.slice(2));
  const corpus = JSON.parse(await readFile(casesPath, "utf8"));
  if (!Array.isArray(corpus.cases)) {
    throw new Error("The cases file must contain a cases array.");
  }

  const results = corpus.cases.map((entry) => {
    const report = analyzeExplanation(entry.text, {
      bindings: entry.bindings ?? [],
      question: entry.question,
    });
    const actualRuleIds = report.findings.map((item) => item.ruleId);
    const rulesMatch = arraysEqual(actualRuleIds, entry.expectedRuleIds);
    const decisionMatches = report.shouldBlock === entry.shouldBlock;
    const passed = rulesMatch && decisionMatches;

    return {
      id: entry.id,
      passed,
      actualRuleIds,
      actualShouldBlock: report.shouldBlock,
      ...(passed
        ? {}
        : {
            error: [
              rulesMatch ? null : "rule IDs differ",
              decisionMatches ? null : "block decision differs",
            ]
              .filter(Boolean)
              .join("; "),
          }),
    };
  });

  const passed = results.filter((result) => result.passed).length;
  const summary = {
    caseCount: results.length,
    passed,
    failed: results.length - passed,
    results,
  };
  process.stdout.write(`${JSON.stringify(summary)}\n`);
  process.exitCode = summary.failed === 0 ? 0 : 1;
}

try {
  await run();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 2;
}
