import process from "node:process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { proseOnly } from "../src/prose.mjs";
import { detectMisconceptions } from "../src/misconceptions.mjs";
import { detectAiisms } from "../src/aiisms.mjs";
import { detectLaterTopicDump } from "../src/closer.mjs";
import { detectOpeningFaults } from "../src/opening.mjs";
import { detectEmptySetup } from "../src/padding.mjs";
import { detectUnnamedDemonstrative, detectUnusedTerm } from "../src/reference.mjs";
import { detectDroppedAnalog } from "../src/analog.mjs";
import { readSessionBindings, readSessionQuestion } from "../src/binding-store.mjs";
import { readTranscriptQuestion } from "../src/transcript.mjs";

const VERSION = "0.1.0";
const BLOCK_THRESHOLD = 4;

const RULES = {
  "em-dash": {
    blockScoreContribution: BLOCK_THRESHOLD,
    reason: "Replace em-dash punctuation in authored prose with a period, comma, colon, or parentheses.",
  },
  "canned-preamble": {
    blockScoreContribution: 2,
    reason: "Remove the canned opening and start with the answer.",
  },
  "heading-overload": {
    blockScoreContribution: 2,
    reason:
      "Reduce sectioning; use headings only when they help the reader navigate.",
  },
  "offer-to-continue": {
    blockScoreContribution: BLOCK_THRESHOLD,
    reason: "Remove the generic follow-up offer and end on the answer.",
  },
};

function maskFencedCode(text) {
  const chunks = [];
  const linePattern = /[^\r\n]*(?:\r\n|\r|\n|$)/g;
  let fence = null;

  for (const match of text.matchAll(linePattern)) {
    const line = match[0];
    if (line.length === 0) continue;

    const content = line.replace(/(?:\r\n|\r|\n)$/, "");
    const closingMarker = content.match(/^ {0,3}(`{3,}|~{3,})[ \t]*$/);
    const isClosing =
      fence !== null &&
      closingMarker !== null &&
      closingMarker[1][0] === fence.character &&
      closingMarker[1].length >= fence.length;

    if (fence !== null) {
      chunks.push(line.replace(/[^\r\n]/g, " "));
      if (isClosing) fence = null;
      continue;
    }

    const openingMarker = content.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    const validOpening =
      openingMarker !== null &&
      (openingMarker[1][0] === "~" || !openingMarker[2].includes("`"));

    if (validOpening) {
      fence = {
        character: openingMarker[1][0],
        length: openingMarker[1].length,
      };
      chunks.push(line.replace(/[^\r\n]/g, " "));
    } else {
      chunks.push(line);
    }
  }

  return chunks.join("");
}

function finding(ruleId, text, start, end) {
  const rule = RULES[ruleId];
  return {
    ruleId,
    blockScoreContribution: rule.blockScoreContribution,
    reason: rule.reason,
    evidence: text.slice(start, end),
    span: { start, end },
  };
}

function findCannedPreamble(text, masked) {
  const match = masked.match(
    /^\s*(?<phrase>(?:You're absolutely right(?: to ask)?|Great question|Absolutely|Sure)(?:[.!,:]|\s|$)(?:\s*I'd be happy to explain[.!]?)?)/i,
  );
  if (!match?.groups?.phrase) return null;

  const start = match.index + match[0].indexOf(match.groups.phrase);
  const phrase = match.groups.phrase.trimEnd();
  return finding("canned-preamble", text, start, start + phrase.length);
}

function findHeadings(masked) {
  const headings = [];
  const headingPattern = /^ {0,3}#{1,6}[ \t]+\S[^\r\n]*$/gm;
  for (const match of masked.matchAll(headingPattern)) {
    headings.push({ start: match.index, end: match.index + match[0].length });
  }
  return headings;
}

function findOfferToContinue(text, masked) {
  const patterns = [
    /Would you like me to[^\r\n?]{0,160}\?\s*$/i,
    /(?:let me know if you(?:['’]d| would)? (?:want|like)|if you(?:['’]d| would) like to (?:go into|dive|continue|hear more)|want to go into any of (?:those|these|that))[^\r\n]{0,80}\s*$/i,
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(masked);
    if (match === null) continue;
    const evidence = match[0].trimEnd();
    return finding(
      "offer-to-continue",
      text,
      match.index,
      match.index + evidence.length,
    );
  }
  return null;
}

export function analyzeExplanation(text, { proseMasked = false, bindings = [], question } = {}) {
  const source = typeof text === "string" ? text : "";
  const masked = maskFencedCode(source);
  const headings = findHeadings(masked);
  const findings = [];

  const preamble = findCannedPreamble(source, masked);
  if (preamble !== null) findings.push(preamble);

  if (headings.length >= 4) {
    findings.push(
      finding(
        "heading-overload",
        source,
        headings[0].start,
        headings[0].end,
      ),
    );
  }

  const offer = findOfferToContinue(source, masked);
  if (offer !== null) findings.push(offer);

  findings.push(...detectMisconceptions(masked));
  findings.push(...detectAiisms(masked));
  findings.push(...detectLaterTopicDump(masked));
  findings.push(...detectOpeningFaults(masked, question));
  findings.push(...detectEmptySetup(masked));
  findings.push(...detectUnnamedDemonstrative(masked));
  findings.push(...detectUnusedTerm(masked));
  findings.push(...detectDroppedAnalog(masked, bindings));

  // Re-masking inline code could turn its blanked prefix into an indented block.
  const prose = proseMasked ? source : proseOnly(source);
  for (const match of prose.matchAll(/\u2014/g)) {
    findings.push(finding("em-dash", source, match.index, match.index + 1));
  }

  findings.sort((left, right) => left.span.start - right.span.start);
  const blockScore = findings.reduce(
    (total, item) => total + item.blockScoreContribution,
    0,
  );

  return {
    version: VERSION,
    metrics: {
      characterCount: source.length,
      wordCount: masked.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu)?.length ?? 0,
      headingCount: headings.length,
    },
    findings,
    shouldBlock: blockScore >= BLOCK_THRESHOLD,
  };
}

function resolveQuestion(input) {
  if (typeof input.prompt === "string" && input.prompt.trim()) return input.prompt;
  if (typeof input.user_prompt === "string" && input.user_prompt.trim()) return input.user_prompt;
  const stored = readSessionQuestion(input.session_id);
  if (stored.trim()) return stored;
  return readTranscriptQuestion(input.transcript_path);
}

const QUOTED_FIRST = new Set([
  "empty-setup-sentence",
  "dropped-analog",
  "opening-skips-asked-subject",
]);

function quoteWindow(text, item) {
  const span = item?.span;
  if (!span || !Number.isInteger(span.start) || !Number.isInteger(span.end)) {
    return typeof item?.evidence === "string"
      ? item.evidence.replace(/\s+/g, " ").trim().slice(0, 140)
      : "";
  }
  const start = Math.max(0, span.start - 24);
  const end = Math.min(text.length, span.end + 24);
  return text.slice(start, end).replace(/\s+/g, " ").trim().slice(0, 140);
}

function stopInstructions(text, findings) {
  const ordered = [...findings].sort((left, right) => {
    const rank = (item) => (QUOTED_FIRST.has(item.ruleId) ? 0 : 1);
    const leftStart = left.span?.start ?? 0;
    const rightStart = right.span?.start ?? 0;
    return rank(left) - rank(right) || leftStart - rightStart;
  });
  const groups = [];
  for (const item of ordered) {
    let group = groups.find((entry) => entry.reason === item.reason);
    if (!group) {
      if (groups.length >= 4) continue;
      group = {reason: item.reason, quotes: []};
      groups.push(group);
    }
    const quote = quoteWindow(text, item);
    if (quote && group.quotes.length < 2 && !group.quotes.includes(quote)) group.quotes.push(quote);
  }
  return groups.map((group) => {
    if (!group.quotes.length) return group.reason;
    const shown = group.quotes.map((quote) => `"${quote}"`).join("; ");
    return `${group.reason} Fix: ${shown}.`;
  }).join(" ");
}

export function evaluateStopHook(input) {
  if (input === null || typeof input !== "object" || typeof input.last_assistant_message !== "string") {
    return {};
  }

  const bindings = Array.isArray(input.bindings)
    ? input.bindings
    : readSessionBindings(input.session_id);
  const question = resolveQuestion(input);
  const text = input.last_assistant_message;
  const report = analyzeExplanation(text, {bindings, question});
  const findings = input.stop_hook_active === true
    ? report.findings.filter((item) => item.ruleId === "opening-skips-asked-subject")
    : report.findings;
  const blockScore = findings.reduce(
    (total, item) => total + item.blockScoreContribution,
    0,
  );
  if (blockScore < BLOCK_THRESHOLD) return {};

  return {
    decision: "block",
    reason: `Revise the final response once: ${stopInstructions(text, findings)}`,
  };
}

async function readStandardInput() {
  let input = "";
  for await (const chunk of process.stdin) input += chunk;
  return input;
}

async function main() {
  const input = await readStandardInput();
  if (process.argv.includes("--analyze")) {
    process.stdout.write(`${JSON.stringify(analyzeExplanation(input))}\n`);
    return;
  }

  let hookInput;
  try {
    hookInput = JSON.parse(input);
  } catch {
    hookInput = null;
  }
  process.stdout.write(`${JSON.stringify(evaluateStopHook(hookInput))}\n`);
}

const isMain =
  typeof process.argv[1] === "string" &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
  await main();
}
