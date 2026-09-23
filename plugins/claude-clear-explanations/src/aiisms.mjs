const RULES = [
  {
    ruleId: 'ai-process-narration',
    blockScoreContribution: 4,
    reason: 'Start with the subject. Do not announce that you are about to explain.',
    patterns: [
      /\b(?:let me explain|i(?:['’]ll| will) walk you through|let['’]s break this down)\b/gi,
      /\bin this (?:section|post|article|guide),?\s+(?:i(?:['’]ll| will)|we(?:['’]ll| will)|let['’]s)\b/gi,
      /\bhere['’]s what you need to know\b/gi,
    ],
  },
  {
    ruleId: 'ai-throat-clearing',
    blockScoreContribution: 4,
    reason: 'Cut the filler and state the fact.',
    patterns: [
      /\bhere['’]s the thing\b/gi,
      /\bhere['’]s the key thing\b/gi,
      /\blet that sink in\b/gi,
      /\bit['’]s worth noting\b/gi,
      /\bit['’]s important to (?:note|understand|remember)\b/gi,
    ],
  },
  {
    ruleId: 'ai-signposted-recap',
    blockScoreContribution: 4,
    reason: 'End on the example\'s result. Do not announce a summary.',
    patterns: [
      /\b(?:in conclusion|to (?:summarize|sum up)|the key takeaway(?: is)?)\b/gi,
      /(?:^|[.!?]\s+)that covers\b/gim,
    ],
  },
  {
    ruleId: 'ai-topic-menu',
    blockScoreContribution: 4,
    reason: 'End on the example\'s result. Do not add a later topic.',
    patterns: [
      /\bthere(?:['’]s| is) more to (?:git|this)\b/gi,
    ],
  },
];

export function detectAiisms(text) {
  const source = typeof text === 'string' ? text : '';
  const findings = [];
  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      pattern.lastIndex = 0;
      for (const match of source.matchAll(pattern)) {
        findings.push({
          ruleId: rule.ruleId,
          blockScoreContribution: rule.blockScoreContribution,
          reason: rule.reason,
          evidence: match[0],
          span: {start: match.index, end: match.index + match[0].length},
        });
      }
    }
  }
  findings.sort((left, right) => left.span.start - right.span.start);
  return findings;
}
