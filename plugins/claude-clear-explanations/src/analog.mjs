function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const SKIP_TERM = new Set([
  'example', 'fact', 'idea', 'limit', 'point', 'reason', 'result', 'thing',
]);

const MAP_REASON = 'State the analog mapping in plain words before any parenthetical. The first use of the analog is that mapping sentence, not term (the analog).';
const FORM_REASON = 'After the mapping sentence, later uses of that term are term (the analog) until the binding is done. Keep the analog noun phrase from that mapping or a supplied slice pair, not a shortened remnant. Keep the in the parenthetical when the analog is a noun phrase. term\'s (the analog\'s) is the same pair.';
const SUBSTITUTE_REASON = 'If a supplied slice pairs a term with an analog, reuse that pairing. Do not substitute a different analog for the same term.';

function analogKey(analog) {
  return String(analog)
    .replace(/^(?:the|a|an)\s+/i, '')
    .replace(/['’]s\b/g, '')
    .trim()
    .toLowerCase();
}

const RELATION = new Set([
  'this', 'that', 'these', 'those', 'which', 'who', 'whom', 'whose',
  'from', 'for', 'with', 'by', 'to', 'of', 'into', 'onto', 'on', 'in',
  'at', 'as', 'than', 'and', 'or',
]);

function analogFromInner(inner) {
  const words = analogKey(inner).split(/\s+/).filter(Boolean);
  const kept = [];
  for (const word of words) {
    if (RELATION.has(word) && kept.length) break;
    kept.push(word);
    if (kept.length === 3) break;
  }
  return kept.join(' ');
}

function stemLast(word) {
  const value = String(word).toLowerCase();
  if (/(?:ches|shes|xes|zes|ses)$/.test(value) && value.length > 4) return value.slice(0, -2);
  if (value.endsWith('ies') && value.length > 4) return `${value.slice(0, -3)}y`;
  if (value.endsWith('es') && value.length > 4) return value.slice(0, -2);
  if (value.endsWith('s') && !value.endsWith('ss') && value.length > 3) return value.slice(0, -1);
  return value;
}

function analogWords(analog) {
  const words = analogKey(analog).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return [...words.slice(0, -1), stemLast(words[words.length - 1])];
}

function lastAnalogWord(analog) {
  const words = analogWords(analog);
  return words[words.length - 1] || '';
}

function analogAligns(left, right) {
  const a = lastAnalogWord(left);
  const b = lastAnalogWord(right);
  return Boolean(a && a === b);
}

function analogCovers(got, expected) {
  if (!expected.length || got.length < expected.length) return false;
  const tail = got.slice(got.length - expected.length);
  return expected.every((word, index) => tail[index] === word);
}

function sentenceBounds(source, index) {
  let start = index;
  while (start > 0) {
    const prev = source[start - 1];
    if ((prev === '.' || prev === '!' || prev === '?') && /\s/.test(source[start] ?? '')) break;
    start -= 1;
  }
  let end = index;
  while (end < source.length) {
    const ch = source[end];
    if ((ch === '.' || ch === '!' || ch === '?') && (end + 1 === source.length || /\s/.test(source[end + 1]))) {
      end += 1;
      break;
    }
    end += 1;
  }
  return {start, end};
}

function inSpan(index, spans) {
  return spans.some(span => index >= span.start && index < span.end);
}

function pairsFromParentheticals(source) {
  const pairs = [];
  const pattern = /\b([A-Za-z][A-Za-z-]{2,})(?:['’]s)? \(((?:the|a|an)[ \n])?([^)]{2,40})\)/gi;
  for (const match of source.matchAll(pattern)) {
    const term = match[1].toLowerCase();
    const analog = analogFromInner(match[3]);
    const words = analog.split(/\s+/).filter(Boolean);
    if (!match[2] || SKIP_TERM.has(term) || !analog) continue;
    if (words.length > 3) continue;
    pairs.push({term, analog, from: match.index, at: match.index + match[0].length});
  }
  return pairs;
}

function pairsFromLikeMaps(source) {
  const pairs = [];
  const pattern = /\b(?:A|An|The) ((?:[A-Za-z][A-Za-z-]{2,} ){0,3}[A-Za-z][A-Za-z-]{2,}) (?:is|are)\b[^.!?\n]{0,160} like (?:a |an |the )([a-z][a-z-]{2,})/gi;
  for (const match of source.matchAll(pattern)) {
    const words = match[1].toLowerCase().split(/\s+/).filter(Boolean);
    const term = words[words.length - 1];
    const analog = analogKey(match[2]);
    if (SKIP_TERM.has(term) || !analog) continue;
    pairs.push({term, analog, from: match.index, at: match.index + match[0].length});
  }
  return pairs;
}

function pairsFromIsThe(source) {
  const pairs = [];
  const pattern = /\b(?:A|An|The) ((?:[A-Za-z][A-Za-z-]{2,} ){0,2}[A-Za-z][A-Za-z-]{2,}) (?:is|are) the ([a-z][a-z-]{2,}(?: [a-z][a-z-]{2,}){0,2})(?=[.:;!?,]|$)/gi;
  for (const match of source.matchAll(pattern)) {
    const words = match[1].toLowerCase().split(/\s+/).filter(Boolean);
    const term = words[words.length - 1];
    const analog = analogFromInner(match[2]);
    if (SKIP_TERM.has(term) || !analog) continue;
    pairs.push({term, analog, from: match.index, at: match.index + match[0].length});
  }
  return pairs;
}

function parentheticalAttached(source, index, length, analog) {
  const expected = analogWords(analog);
  if (!expected.length) return false;
  const after = source.slice(index + length);
  const match = after.match(/^(?:['’]s)? \(the[ \n]([^)]{1,80})\)/i);
  if (!match) return false;
  return analogCovers(analogWords(analogFromInner(match[1])), expected);
}

function canonicalTerm(term, known) {
  const lower = String(term).toLowerCase();
  if (known.has(lower)) return lower;
  if (lower.endsWith('es') && known.has(lower.slice(0, -2))) return lower.slice(0, -2);
  if (lower.endsWith('s') && known.has(lower.slice(0, -1))) return lower.slice(0, -1);
  return lower;
}

function normalizeBindings(supplied) {
  if (!Array.isArray(supplied)) return [];
  const pairs = [];
  const seen = new Set();
  for (const item of supplied) {
    const term = String(item?.term ?? '').trim().toLowerCase();
    const analog = analogKey(item?.analog ?? '');
    if (!term || !analog || SKIP_TERM.has(term)) continue;
    const key = `${term}|${analog}`;
    if (seen.has(key)) continue;
    seen.add(key);
    pairs.push({term, analog});
  }
  return pairs;
}

function firstMappingFor(term, analog, mappings) {
  let first = null;
  for (const pair of mappings) {
    if (pair.term !== term) continue;
    if (analog && !analogAligns(pair.analog, analog)) continue;
    if (!first || pair.from < first.from) first = pair;
  }
  return first;
}

function preferAnalog(existing, next) {
  if (!existing) return next;
  if (!analogAligns(existing, next)) return existing;
  return next.split(/\s+/).length > existing.split(/\s+/).length ? next : existing;
}

export function collectAnalogPairs(source) {
  return normalizeBindings(pairsFromParentheticals(source));
}

export function sentenceHasAnalogMapping(sentence) {
  const source = typeof sentence === 'string' ? sentence : '';
  return pairsFromLikeMaps(source).length > 0 || pairsFromIsThe(source).length > 0;
}

export function firstAnalogMappingAt(source) {
  const text = typeof source === 'string' ? source : '';
  const mappings = [...pairsFromLikeMaps(text), ...pairsFromIsThe(text)];
  if (!mappings.length) return -1;
  return Math.min(...mappings.map(pair => pair.from));
}

export function detectDroppedAnalog(text, supplied) {
  const source = typeof text === 'string' ? text : '';
  if (!/[A-Za-z]/.test(source)) return [];
  const given = normalizeBindings(supplied);
  const mappings = [...pairsFromLikeMaps(source), ...pairsFromIsThe(source)];
  const parens = pairsFromParentheticals(source);
  const findings = [];
  const terms = new Map();
  for (const pair of given) terms.set(pair.term, pair.analog);
  for (const pair of mappings) {
    terms.set(pair.term, preferAnalog(terms.get(pair.term), pair.analog));
  }
  const knownTerms = new Set(terms.keys());
  const expectedByTerm = new Map(given.map(pair => [pair.term, pair.analog]));
  const seenSwap = new Set();
  for (const pair of parens) {
    const term = canonicalTerm(pair.term, knownTerms);
    const expected = expectedByTerm.get(term);
    if (!expected || analogAligns(expected, pair.analog) || seenSwap.has(term)) continue;
    seenSwap.add(term);
    findings.push({
      ruleId: 'dropped-analog',
      blockScoreContribution: 4,
      reason: SUBSTITUTE_REASON,
      evidence: term,
      span: {start: Math.max(0, pair.from), end: pair.at},
    });
  }
  for (const pair of parens) {
    const term = canonicalTerm(pair.term, knownTerms);
    if (terms.has(term)) continue;
    terms.set(term, pair.analog);
  }
  const mappingSpans = mappings.map(pair => sentenceBounds(source, pair.from));
  const seen = new Set();
  for (const [term, analog] of terms) {
    if (seen.has(term)) continue;
    seen.add(term);
    const mapping = firstMappingFor(term, analog, mappings);
    if (!mapping) {
      const opening = parens.find(pair => pair.term === term);
      const mentioned = source.search(new RegExp(`\\b${escapeRegExp(term)}s?\\b`, 'i'));
      findings.push({
        ruleId: 'dropped-analog',
        blockScoreContribution: 4,
        reason: MAP_REASON,
        evidence: term,
        span: {
          start: opening ? opening.from : Math.max(0, mentioned),
          end: opening ? opening.at : Math.max(0, mentioned) + term.length,
        },
      });
      continue;
    }
    const before = parens.find(pair => (
      pair.term === term
      && pair.from < mapping.from
      && !inSpan(pair.from, mappingSpans)
    ));
    if (before) {
      findings.push({
        ruleId: 'dropped-analog',
        blockScoreContribution: 4,
        reason: MAP_REASON,
        evidence: term,
        span: {start: before.from, end: before.at},
      });
      continue;
    }
    for (const match of source.matchAll(new RegExp(`\\b${escapeRegExp(term)}s?\\b`, 'gi'))) {
      if (inSpan(match.index, mappingSpans)) continue;
      if (match.index < mapping.from) continue;
      if (parentheticalAttached(source, match.index, match[0].length, analog)) continue;
      findings.push({
        ruleId: 'dropped-analog',
        blockScoreContribution: 4,
        reason: FORM_REASON,
        evidence: match[0],
        span: {start: match.index, end: match.index + match[0].length},
      });
      break;
    }
  }
  return findings;
}
