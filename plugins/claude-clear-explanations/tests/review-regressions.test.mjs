import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { analyzeExplanation } from "../scripts/check-explanation.mjs";

const pluginRoot = dirname(dirname(fileURLToPath(import.meta.url)));

function ruleIds(report) {
  return report.findings.map((finding) => finding.ruleId);
}

test("a four-space indented backtick line is not a CommonMark fence", () => {
  const explanation = `    \`\`\`text
## Input
Read bytes.

## Parse
Decode JSON.

## Validate
Check the schema.

## Return
Yield the value.

Would you like me to continue?`;

  const report = analyzeExplanation(explanation);

  assert.equal(report.metrics.headingCount, 4);
  assert.deepEqual(ruleIds(report), ["heading-overload", "offer-to-continue"]);
});

test("closing fences reject trailing non-whitespace for both marker types", async (t) => {
  for (const marker of ["```", "~~~"]) {
    await t.test(marker === "```" ? "backticks" : "tildes", () => {
      const explanation = `${marker}text
${marker}not-a-close
## Input
## Parse
## Validate
## Return
Would you like me to continue?
${marker}
The example above is data, not prose guidance.`;

      const report = analyzeExplanation(explanation);

      assert.equal(report.metrics.headingCount, 0);
      assert.deepEqual(report.findings, []);
      assert.equal(report.shouldBlock, false);
    });
  }
});

test("mixed marker types and shorter markers do not close a fence", () => {
  const explanation = `\`\`\`\`text
~~~
\`\`\`
## Input
## Parse
## Validate
## Return
Would you like me to continue?
\`\`\`\`
The example above is data, not prose guidance.`;

  const report = analyzeExplanation(explanation);

  assert.equal(report.metrics.headingCount, 0);
  assert.deepEqual(report.findings, []);
  assert.equal(report.shouldBlock, false);
});

test(
  "large fenced input is processed within a practical near-linear bound",
  { timeout: 2_000 },
  () => {
    const makeInput = (lineCount) =>
      "```text\n" + "value\n".repeat(lineCount) + "```\n";

    analyzeExplanation(makeInput(2_000));
    analyzeExplanation(makeInput(2_000));

    const smallStart = performance.now();
    analyzeExplanation(makeInput(5_000));
    const smallElapsed = performance.now() - smallStart;

    const largeStart = performance.now();
    const report = analyzeExplanation(makeInput(20_000));
    const largeElapsed = performance.now() - largeStart;

    assert.deepEqual(report.findings, []);
    assert.ok(
      largeElapsed <= 1_000,
      `20,000 fenced lines took ${largeElapsed.toFixed(1)} ms`,
    );
    assert.ok(
      largeElapsed <= smallElapsed * 12 + 100,
      `scaling was excessive: 5,000 lines took ${smallElapsed.toFixed(1)} ms; ` +
        `20,000 took ${largeElapsed.toFixed(1)} ms`,
    );
  },
);

test("findings expose no contradictory per-finding blocking gate", () => {
  const report = analyzeExplanation(`Absolutely.

## Input
## Parse
## Validate
## Return

Would you like me to continue?`);

  assert.equal(report.shouldBlock, true);
  assert.ok(report.findings.length > 0);
  for (const finding of report.findings) {
    assert.equal(
      Object.hasOwn(finding, "blocking"),
      false,
      `${finding.ruleId} must not claim it independently blocks the response`,
    );

    const contributionFields = Object.keys(finding).filter((key) =>
      /blocking|weight|score/i.test(key),
    );
    assert.ok(
      contributionFields.every((key) =>
        ["scoreContribution", "blockScoreContribution"].includes(key),
      ),
      `${finding.ruleId} exposes an unclear gate field: ${contributionFields.join(", ")}`,
    );
    for (const key of contributionFields) {
      assert.equal(typeof finding[key], "number");
      assert.ok(finding[key] > 0);
    }
  }
});

test("the plugin does not register a global Stop hook", () => {
  const globalHookPath = join(pluginRoot, "hooks", "hooks.json");

  assert.equal(
    existsSync(globalHookPath),
    false,
    "hooks/hooks.json would run the explanation checker outside the explain skill",
  );
});

function hasNestedOneShotStopHook(frontmatter) {
  const lines = frontmatter.split(/\r?\n/).map((raw) => ({
    indent: raw.match(/^ */)[0].length,
    text: raw.trim(),
  }));
  const hooksIndex = lines.findIndex(
    (line) => line.indent === 0 && line.text === "hooks:",
  );
  if (hooksIndex === -1) return false;

  const stopIndex = lines.findIndex(
    (line, index) =>
      index > hooksIndex && line.indent === 2 && line.text === "Stop:",
  );
  if (stopIndex === -1) return false;

  const nextTopLevel = lines.findIndex(
    (line, index) => index > stopIndex && line.text !== "" && line.indent <= 2,
  );
  const stopEnd = nextTopLevel === -1 ? lines.length : nextTopLevel;
  const groupStarts = lines
    .map((line, index) => ({ ...line, index }))
    .filter(
      (line) =>
        line.index > stopIndex &&
        line.index < stopEnd &&
        line.indent === 4 &&
        line.text.startsWith("- "),
    );

  return groupStarts.some((group, groupOffset) => {
    const nextGroup = groupStarts[groupOffset + 1];
    const groupEnd = nextGroup?.index ?? stopEnd;
    const groupLines = lines.slice(group.index, groupEnd);
    const groupProperties = groupLines.map((line, index) => ({
      ...line,
      index: group.index + index,
      property:
        index === 0 && line.text.startsWith("- ")
          ? line.text.slice(2)
          : line.text,
      propertyIndent: index === 0 ? line.indent + 2 : line.indent,
    }));
    const nestedHooks = groupProperties.find(
      (line) => line.propertyIndent === 6 && line.property === "hooks:",
    );
    if (nestedHooks === undefined) return false;

    const nextGroupProperty = groupProperties.find(
      (line) =>
        line.index > nestedHooks.index &&
        line.propertyIndent <= 6 &&
        line.property !== "",
    );
    const nestedHooksEnd = nextGroupProperty?.index ?? groupEnd;
    const handler = lines.findIndex(
      (line, index) =>
        index > nestedHooks.index &&
        index < nestedHooksEnd &&
        line.indent === 8 &&
        line.text === "- type: command",
    );
    if (handler === -1) return false;

    const nextHandler = lines.findIndex(
      (line, index) =>
        index > handler &&
        index < nestedHooksEnd &&
        line.text !== "" &&
        line.indent <= 8,
    );
    const handlerEnd = nextHandler === -1 ? nestedHooksEnd : nextHandler;
    const handlerLines = lines.slice(handler + 1, handlerEnd);
    const hasNodeCommand = handlerLines.some(
      (line) =>
        line.indent === 10 &&
        /^command:\s*node\s+["']\$\{CLAUDE_PLUGIN_ROOT\}\/scripts\/check-explanation\.mjs["']$/.test(
          line.text,
        ),
    );
    const hasOnce = groupLines.some((line) => line.text === "once: true");
    const hasArgs = groupLines.some((line) => line.text === "args:");
    return hasNodeCommand && !hasOnce && !hasArgs;
  });
}

test("the explain skill declares a nested Stop hook handler", () => {
  const skillPath = join(pluginRoot, "skills", "explain", "SKILL.md");
  const skill = readFileSync(skillPath, "utf8");
  const frontmatterMatch = /^---\r?\n([\s\S]*?)\r?\n---/.exec(skill);

  assert.ok(frontmatterMatch, "the explain skill needs YAML frontmatter");
  const frontmatter = frontmatterMatch[1];
  const shallowDirectHandler = `hooks:
  Stop:
    - type: command
      command: node "\${CLAUDE_PLUGIN_ROOT}/scripts/check-explanation.mjs"
      once: true`;
  assert.equal(
    hasNestedOneShotStopHook(shallowDirectHandler),
    false,
    "a command directly in the Stop array is not a hook group",
  );
  const groupLevelOnce = `hooks:
  Stop:
    - hooks:
        - type: command
          command: node "\${CLAUDE_PLUGIN_ROOT}/scripts/check-explanation.mjs"
      once: true`;
  assert.equal(
    hasNestedOneShotStopHook(groupLevelOnce),
    false,
    "once: true on the hook group still skips a still-dirty revision",
  );
  const splitArgsShape = `hooks:
  Stop:
    - hooks:
        - type: command
          command: node
          args:
            - "\${CLAUDE_PLUGIN_ROOT}/scripts/check-explanation.mjs"
          once: true`;
  assert.equal(
    hasNestedOneShotStopHook(splitArgsShape),
    false,
    "Claude Code 2.1.277 ignores YAML args, so command: node plus args is not a handler",
  );
  const handlerLevelOnce = `hooks:
  Stop:
    - hooks:
        - type: command
          command: node "\${CLAUDE_PLUGIN_ROOT}/scripts/check-explanation.mjs"
          once: true`;
  assert.equal(
    hasNestedOneShotStopHook(handlerLevelOnce),
    false,
    "once: true skips a still-dirty revision",
  );
  const everyStop = `hooks:
  Stop:
    - hooks:
        - type: command
          command: node "\${CLAUDE_PLUGIN_ROOT}/scripts/check-explanation.mjs"
          timeout: 5`;
  assert.equal(
    hasNestedOneShotStopHook(everyStop),
    true,
    "the nested command-handler shape without once: true must be accepted",
  );
  assert.equal(
    hasNestedOneShotStopHook(frontmatter),
    true,
    "expected Stop -> group -> hooks -> command handler without once: true",
  );
});

test("usage documents the checker's exact Markdown scope", () => {
  const usage = readFileSync(join(pluginRoot, "docs", "usage.md"), "utf8");

  assert.match(usage, /top-level fenced (?:code )?blocks/i);
  assert.match(usage, /top-level non-empty ATX headings/i);
  assert.doesNotMatch(usage, /\bignores? (?:all )?fenced code\b/i);
  assert.doesNotMatch(usage, /\b(?:all|any|four or more) Markdown headings\b/i);
});

test("the repo marketplace catalogs this plugin for GitHub install", () => {
  const marketplacePath = join(pluginRoot, "..", "..", ".claude-plugin", "marketplace.json");
  const marketplace = JSON.parse(readFileSync(marketplacePath, "utf8"));
  assert.equal(marketplace.name, "a2e76ac3fa");
  const plugin = marketplace.plugins.find((entry) => entry.name === "c90373deff");
  assert.ok(plugin, "marketplace.json must list the hashed plugin name");
  assert.equal(plugin.source, "./plugins/claude-clear-explanations");
  const manifest = JSON.parse(
    readFileSync(join(pluginRoot, ".claude-plugin", "plugin.json"), "utf8"),
  );
  assert.equal(manifest.name, "c90373deff");
  const usage = readFileSync(join(pluginRoot, "docs", "usage.md"), "utf8");
  assert.match(usage, /plugin marketplace add 8ca3f48594\/3465b4d71c/i);
  assert.match(usage, /plugin install c90373deff@a2e76ac3fa/i);
  assert.match(usage, /\/c90373deff:explain/);
  assert.doesNotMatch(usage, /plugin install clear-explanations@/i);
  assert.doesNotMatch(usage, /@aibutgood/i);
  assert.doesNotMatch(usage, /npx skills add/i);
});

test("usage describes one-revision converge without claiming explanation-only scope", () => {
  const usage = readFileSync(join(pluginRoot, "docs", "usage.md"), "utf8");

  assert.match(usage, /at most one revision/i);
  assert.match(usage, /skips the asked subject/i);
  assert.doesNotMatch(usage, /once:\s*true/i);
  assert.doesNotMatch(usage, /one-revision hook/i);
  assert.doesNotMatch(usage, /Other task types do not load this hook/i);
  assert.doesNotMatch(
    usage,
    /\b(?:hook|checker) (?:only|solely) (?:runs|applies) (?:to|for|on) explanations?\b/i,
  );
});

test("the PowerShell analyze example uses a pipeline", () => {
  const usage = readFileSync(join(pluginRoot, "docs", "usage.md"), "utf8");

  assert.doesNotMatch(usage, /--analyze\s*</i);
  assert.match(
    usage,
    /Get-Content[^\r\n]*\|\s*node[^\r\n]*check-explanation\.mjs\s+--analyze/i,
  );
});

test("skill and output style require numerical grounding", () => {
  const documents = [
    [
      "explain skill",
      join(pluginRoot, "skills", "explain", "SKILL.md"),
    ],
    [
      "always-on output style",
      join(pluginRoot, "output-styles", "clear-explanations.md"),
    ],
  ];
  const failures = [];

  for (const [label, path] of documents) {
    const content = readFileSync(path, "utf8").replace(/\s+/g, " ");
    const hasDerivedNumericalSubject =
      /\b(?:derived|calculated|computed|numeric|numerical|quantitative)\b[^.]{0,140}\b(?:claim|number|figure|estimate|percentage|ratio|rate|total|cost|duration)s?\b/i.test(
        content,
      ) ||
      /\b(?:claim|number|figure|estimate|percentage|ratio|rate|total|cost|duration)s?\b[^.]{0,140}\b(?:derived|calculated|computed|numeric|numerical|quantitative)\b/i.test(
        content,
      );
    const hasCalculationInstruction =
      /\b(?:show|include|state|provide|check|verify)\b[^.]{0,100}\b(?:calculation|derivation|arithmetic|formula|work)\b/i.test(
        content,
      ) ||
      /\b(?:calculation|derivation|arithmetic|formula)\b[^.]{0,100}\b(?:show|include|state|provide|check|verify)\b/i.test(
        content,
      );
    const unsupportedNumericEstimate =
      /\b(?:unsupported|unverified|unsubstantiated|unfounded|not supported|cannot support|does not support)\b[^.]{0,120}\b(?:numeric|numerical|estimate|number|figure|percentage)s?\b/i.test(
        content,
      ) ||
      /\b(?:numeric|numerical|estimate|number|figure|percentage)s?\b[^.]{0,120}\b(?:unsupported|unverified|unsubstantiated|unfounded|not supported|cannot support|does not support)\b/i.test(
        content,
      );
    const hasOmissionInstruction =
      /\b(?:omit|avoid|exclude|leave out|do not (?:invent|include|give|state|supply|provide))\b[^.]{0,140}\b(?:estimate|number|figure|percentage)s?\b/i.test(
        content,
      ) ||
      /\b(?:estimate|number|figure|percentage)s?\b[^.]{0,140}\b(?:omit|avoid|exclude|leave out)\b/i.test(
        content,
      );
    const hasLabeledAssumptionOrRange =
      /\b(?:label|mark|identify|state|name|make explicit|present)\b[^.]{0,140}\b(?:assumption|range|uncertainty|interval)s?\b/i.test(
        content,
      ) ||
      /\b(?:assumption|range|uncertainty|interval)s?\b[^.]{0,140}\b(?:label|mark|identify|state|name|make explicit|present)\b/i.test(
        content,
      );

    if (!hasDerivedNumericalSubject) {
      failures.push(`${label}: derived numerical claims are not addressed`);
    }
    if (!hasCalculationInstruction) {
      failures.push(`${label}: no instruction shows or checks the calculation`);
    }
    if (!unsupportedNumericEstimate) {
      failures.push(`${label}: unsupported numeric estimates are not addressed`);
    }
    if (!hasOmissionInstruction) {
      failures.push(`${label}: no instruction omits unsupported estimates`);
    }
    if (!hasLabeledAssumptionOrRange) {
      failures.push(`${label}: no instruction labels assumptions or ranges`);
    }
  }

  assert.deepEqual(failures, [], failures.join("\n"));
});
