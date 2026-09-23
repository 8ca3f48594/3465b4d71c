function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const DEMONSTRATIVE = /\b(?:that|those|this|these) ([a-z]{3,})\b/gi;
const ARTICLE_NOUN = /\b(?:the|a|an) ([a-z]{3,})\b/gi;
const NAMED_PREFIX = /\b(?:the|a|an|one|two|three|four|five|few|several|both|\d+)(?:\s+[a-z]+)?\s+$/i;
const SKIP_NOUN = new Set([
  'example', 'fact', 'idea', 'limit', 'point', 'reason', 'result', 'setting',
  'their', 'them', 'then', 'there', 'these', 'they', 'thing',
]);

function stemWord(word) {
  const value = String(word).toLowerCase();
  if (value.endsWith('s') && !value.endsWith('ss') && value.length > 3) return value.slice(0, -1);
  return value;
}

function nounPattern(noun) {
  return `${escapeRegExp(stemWord(noun))}s?`;
}

function hasNamedInstance(text) {
  return /[`'"]|\d/.test(String(text));
}

function nounMentions(text, noun) {
  return [...String(text).matchAll(new RegExp(`(?<![A-Za-z0-9-])${nounPattern(noun)}(?![A-Za-z0-9-])`, 'gi'))];
}

function isBoundMention(source, index, length) {
  const around = source.slice(Math.max(0, index - 32), index + length + 32);
  if (/[`'"]|\d/.test(around)) return true;
  const prefix = source.slice(Math.max(0, index - 40), index);
  return NAMED_PREFIX.test(prefix);
}

function sameNoun(left, right) {
  return stemWord(left) === stemWord(right);
}

function nounIsBound(earlier, noun) {
  if (nounMentions(earlier, noun).some(match => isBoundMention(earlier, match.index, match[0].length))) {
    return true;
  }
  if (definedTerms(earlier).some(item => {
    const words = item.term.split(/\s+/);
    return sameNoun(item.term, noun) || sameNoun(words[words.length - 1] ?? '', noun);
  })) {
    return true;
  }
  const stripped = String(earlier).replace(/\*+/g, '');
  const named = nounPattern(noun);
  if (new RegExp(`\\b(?:a|an|the)\\s+${named}\\s+(?:is|are|means)\\b`, 'i').test(stripped)) {
    return true;
  }
  return new RegExp(
    `\\b(?:is|are) (?:a|an|the)(?:\\s+[a-z]+){0,3}\\s+${named}\\b`,
    'i',
  ).test(stripped);
}

function sentenceBefore(source, index) {
  const before = source.slice(0, index);
  const last = Math.max(before.lastIndexOf('.'), before.lastIndexOf('!'), before.lastIndexOf('?'));
  return before.slice(last + 1);
}

function hasReferentInPlay(source, index, noun) {
  const earlier = source.slice(0, index);
  if (nounIsBound(earlier, noun)) return true;
  const before = sentenceBefore(source, index);
  if (hasNamedInstance(before)) return true;
  for (const match of before.matchAll(ARTICLE_NOUN)) {
    const named = match[1].toLowerCase();
    if (named === noun || SKIP_NOUN.has(named)) continue;
    return true;
  }
  return false;
}

export function detectUnnamedDemonstrative(text) {
  const source = typeof text === 'string' ? text : '';
  if (!/[A-Za-z]/.test(source)) return [];
  const findings = [];
  for (const match of source.matchAll(DEMONSTRATIVE)) {
    const noun = match[1].toLowerCase();
    if (SKIP_NOUN.has(noun)) continue;
    const after = source.slice(match.index + match[0].length);
    if (/(?:ing|ed)$/i.test(noun) && /^\s+[a-z]{4,}\b/i.test(after)) continue;
    const earlier = source.slice(0, match.index);
    if (nounMentions(earlier, noun).length === 0) continue;
    if (hasReferentInPlay(source, match.index, noun)) continue;
    findings.push({
      ruleId: 'unnamed-demonstrative',
      blockScoreContribution: 4,
      reason: 'A demonstrative needs a named referent already in play.',
      evidence: match[0],
      span: {start: match.index, end: match.index + match[0].length},
    });
  }
  return findings;
}

function firstBulletTerms(text) {
  const terms = [];
  let started = false;
  let offset = 0;
  for (const line of String(text).split('\n')) {
    const match = line.match(/^[ \t]*[-*][ \t]+(?:\*\*([^*]+)\*\*|([A-Za-z][^:\n]{0,40})):/);
    if (match) {
      started = true;
      const raw = (match[1] ?? match[2]).replace(/\([^)]*\)/g, '').trim();
      if (raw && !/\d/.test(raw)) terms.push({term: raw.toLowerCase(), at: offset + match[0].length});
    } else if (started && line.trim() !== '') {
      break;
    }
    offset += line.length + 1;
  }
  return terms;
}

function definedTerms(text) {
  const terms = firstBulletTerms(text);
  for (const match of String(text).matchAll(/"([^"]+)"\s+(?:is|are|means)\b/gi)) {
    terms.push({term: match[1].trim().toLowerCase(), at: match.index + match[0].length});
  }
  return terms;
}

function termUsedLater(later, term) {
  const words = term.split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  return words.every(word => new RegExp(`\\b${escapeRegExp(word)}s?\\b`, 'i').test(later));
}

export function detectUnusedTerm(text) {
  const source = typeof text === 'string' ? text : '';
  if (!/[A-Za-z]/.test(source)) return [];
  const findings = [];
  const seen = new Set();
  for (const item of definedTerms(source)) {
    if (seen.has(item.term)) continue;
    seen.add(item.term);
    const later = source.slice(item.at);
    if (termUsedLater(later, item.term)) continue;
    findings.push({
      ruleId: 'unused-term',
      blockScoreContribution: 4,
      reason: 'Define only the terms the example uses.',
      evidence: item.term,
      span: {start: Math.max(0, item.at - item.term.length), end: item.at},
    });
  }
  return findings;
}
