import { firstAnalogMappingAt, sentenceHasAnalogMapping } from './analog.mjs';
import { firstParagraph } from './misconceptions.mjs';
import { splitSentences } from './padding.mjs';
import { hasTerm, normalizePrompt } from './route.mjs';

const PURPOSE_ONLY = /\b(?:exist so|is how|helps you|lets you|is used to|is for)\b/i;
const KIND = /\b(?:is|are) (?!how\b)/i;
const ANALOG_LEAD = /\b(?:resembles|as if|as though)\b|\b(?:is|are|was|were|it's|its)\s+like\b|^like\s+(?:a|an|the)\b/i;
const NUMBERED_STORY = /^[ \t]*\d+\.[ \t]+\S/m;
const AUTHED_LIST = /^[ \t]*(?:\d+\.|[-*])[ \t]+\S/m;
const ING_PREP = new Set(['according', 'concerning', 'during', 'following', 'including', 'regarding']);
const ASKED_STOP = new Set([
  'a', 'an', 'and', 'are', 'can', 'do', 'does', 'explain', 'for', 'from', 'happens',
  'happen', 'how', 'in', 'is', 'its', 'mean', 'means', 'of', 'on', 'only', 'please',
  'the', 'this', 'to', 'what', 'why', 'work', 'works', 'written',
]);

export function firstSentence(text) {
  const first = firstParagraph(text);
  const match = first.match(/^[^.!?\n]+[.!?]?/);
  return (match ? match[0] : first).trim();
}

function openingHead(sentence) {
  const clause = sentence.split(/\bso\b/i)[0] ?? sentence;
  return clause.trim().split(/\s+/).slice(0, 10).join(' ');
}

const KIND_SKIP = new Set(['also', 'for', 'from', 'how', 'just', 'not', 'only', 'still', 'then', 'to', 'used', 'what', 'when', 'why', 'with']);

export function isKindDefinition(sentence) {
  const trimmed = typeof sentence === 'string' ? sentence.trim() : '';
  if (!trimmed || /^#{1,6}\b/.test(trimmed) || /^\s*(?:\d+\.|[-*])\s/.test(trimmed)) return false;
  if (PURPOSE_ONLY.test(trimmed) || /\b(?:is|are) not\b/i.test(trimmed)) return false;
  if (/\bmeans\b/i.test(trimmed)) return true;
  if (/\b(?:is|are) (?:a|an|the|\d+|two|three|four|few)\b/i.test(trimmed)) return true;
  const named = trimmed.match(/\b(?:is|are) ([a-z][a-z-]*) ([a-z][a-z-]*)\b/i);
  if (!named) return false;
  return !KIND_SKIP.has(named[1].toLowerCase()) && !KIND_SKIP.has(named[2].toLowerCase());
}

export function isGerundLead(sentence) {
  const trimmed = typeof sentence === 'string' ? sentence.trim() : '';
  const match = trimmed.match(/^([A-Za-z]+ing)\s+(?:a|an|the)\s+/i);
  if (!match) return false;
  return !ING_PREP.has(match[1].toLowerCase());
}

export function isAnalogLead(sentence) {
  const trimmed = typeof sentence === 'string' ? sentence.trim() : '';
  if (!trimmed || sentenceHasAnalogMapping(trimmed)) return false;
  return ANALOG_LEAD.test(trimmed);
}

function isProcedure(sentence) {
  return /^To\s+\w+/i.test(typeof sentence === 'string' ? sentence.trim() : '');
}

function kindDefinitions(text) {
  return splitSentences(text).map(item => item.sentence).filter(isKindDefinition);
}

function openingFinding(ruleId, reason, source, sentence) {
  const start = Math.max(0, source.indexOf(sentence));
  const evidence = sentence.slice(0, Math.min(sentence.length, 160));
  return {
    ruleId,
    blockScoreContribution: 4,
    reason,
    evidence,
    span: {start, end: start + evidence.length},
  };
}

function hasTermList(text) {
  return /^[ \t]*[-*][ \t]+(?:\*\*[^*]+\*\*|[A-Za-z][^:\n]{0,40}):/m.test(text);
}

function isTermBullet(line) {
  return /^(?:\*\*[^*]+\*\*|[A-Za-z][^:]{0,40}):/.test(line.trim());
}

function hasWalkthroughList(text) {
  if (NUMBERED_STORY.test(text)) return true;
  const bullets = [...text.matchAll(/^[ \t]*[-*][ \t]+(\S[^\n]*)/gm)];
  return bullets.some(item => !isTermBullet(item[1]));
}

function detectDomainSkip(text) {
  const source = typeof text === 'string' ? text : '';
  if (!/[A-Za-z]/.test(source)) return [];
  const sentence = firstSentence(source);
  if (!sentence || isProcedure(sentence)) return [];
  const needsDomain = hasWalkthroughList(source) || hasTermList(source);
  if (!needsDomain) return [];
  const para = firstParagraph(source).replace(/\s*\n\s*/g, ' ');
  if (kindDefinitions(para).length > 0) return [];
  return [openingFinding(
    'opening-skips-domain',
    'Before using a term, say what kind of thing it is in this setting.',
    source,
    sentence,
  )];
}

function detectKindBeforePurpose(text) {
  const source = typeof text === 'string' ? text : '';
  if (!/[A-Za-z]/.test(source)) return [];
  const sentence = firstSentence(source);
  if (!sentence) return [];
  const head = openingHead(sentence);
  const purposeOnly = PURPOSE_ONLY.test(sentence) && !KIND.test(head);
  const gerundFirst = isGerundLead(sentence) && !isKindDefinition(sentence);
  const skippedSubject = hasWalkthroughList(source)
    && !isProcedure(sentence)
    && !isKindDefinition(sentence)
    && kindDefinitions(source).length === 0;
  if (!purposeOnly && !gerundFirst && !skippedSubject) return [];
  return [openingFinding(
    'opening-skips-kind',
    'Say what the subject is before what it does.',
    source,
    sentence,
  )];
}

function stemWord(word) {
  const value = String(word).toLowerCase();
  if (value.endsWith('s') && !value.endsWith('ss') && value.length > 3) return value.slice(0, -1);
  return value;
}

function contentWords(text) {
  return [...String(text).toLowerCase().matchAll(/[a-z0-9]+(?:[.:/_-][a-z0-9]+)*/g)]
    .map(item => item[0])
    .filter(word => !ASKED_STOP.has(word) && word.length > 1);
}

function sharesContent(left, right) {
  return left.some(a => right.some(b => stemWord(a) === stemWord(b)));
}

export function askedSubjectWords(question) {
  let q = normalizePrompt(question);
  q = q.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  q = q.replace(/^(?:please\s+)?explain\s+/i, '');
  q = q.replace(/^(?:how|why|what)\s+(?:does|do|can|is|are)?\s*(?:the|a|an|this)?\s*/i, '');
  q = q.replace(/\s+(?:works?|happens?|means?)\s*$/i, '');
  return contentWords(q);
}

function definedOpeningTerm(sentence) {
  const match = String(sentence).match(/^(?:(?:A|An|The)\s+)?(.+?)\s+(?:is|are|means)\b/i);
  return match ? match[1].replace(/^\/+/, '').trim() : '';
}

function namesAskedSubject(sentence, subjectWords) {
  if (!subjectWords.length) return true;
  const defined = contentWords(definedOpeningTerm(sentence));
  if (defined.length) return sharesContent(defined, subjectWords);
  return sharesContent(contentWords(sentence), subjectWords);
}

function askedSubjectLater(source, sentence, subjectWords) {
  const start = source.indexOf(sentence);
  if (start < 0) return false;
  const after = source.slice(start + sentence.length);
  return subjectWords.some(word => hasTerm(after, word));
}

function detectAskedSubjectSkip(text, question) {
  const source = typeof text === 'string' ? text : '';
  const asked = typeof question === 'string' ? question : '';
  if (!/[A-Za-z]/.test(source) || !asked.trim()) return [];
  const sentence = firstSentence(source);
  if (
    !sentence
    || isProcedure(sentence)
    || !(isKindDefinition(sentence) || sentenceHasAnalogMapping(sentence) || isAnalogLead(sentence))
  ) {
    return [];
  }
  const subjectWords = askedSubjectWords(asked);
  if (!subjectWords.length || namesAskedSubject(sentence, subjectWords)) return [];
  if (!askedSubjectLater(source, sentence, subjectWords)) return [];
  return [openingFinding(
    'opening-skips-asked-subject',
    'The first sentence names the thing the question asked about, in plain words.',
    source,
    sentence,
  )];
}

function laterKindOrMapping(source, sentenceStart) {
  const mappingAt = firstAnalogMappingAt(source);
  if (mappingAt > sentenceStart) return true;
  return kindDefinitions(source).some(def => {
    const at = source.indexOf(def);
    return at > sentenceStart;
  });
}

function detectAnalogLead(text) {
  const source = typeof text === 'string' ? text : '';
  if (!/[A-Za-z]/.test(source)) return [];
  const sentence = firstSentence(source);
  if (!sentence || isProcedure(sentence) || sentenceHasAnalogMapping(sentence)) return [];
  if (!isAnalogLead(sentence)) return [];
  const start = source.indexOf(sentence);
  if (start < 0 || !laterKindOrMapping(source, start)) return [];
  return [openingFinding(
    'opening-leads-with-analog',
    'Name the mechanism in plain words before any analogy.',
    source,
    sentence,
  )];
}

function detectResultBeforeMapping(text) {
  const source = typeof text === 'string' ? text : '';
  if (!/[A-Za-z]/.test(source)) return [];
  const mappingAt = firstAnalogMappingAt(source);
  if (mappingAt < 0) return [];
  const sentence = firstSentence(source);
  if (!sentence) return [];
  const start = source.indexOf(sentence);
  if (start < 0 || mappingAt <= start) return [];
  if (
    isProcedure(sentence)
    || isAnalogLead(sentence)
    || isKindDefinition(sentence)
    || sentenceHasAnalogMapping(sentence)
  ) {
    return [];
  }
  return [openingFinding(
    'opening-states-result',
    'The first sentences name what the subject is and the analog mapping. Do not state the example\'s result before those are in.',
    source,
    sentence,
  )];
}

export function detectStoryBeforeDefinitions(text) {
  const source = typeof text === 'string' ? text : '';
  if (!/[A-Za-z]/.test(source)) return [];
  const match = NUMBERED_STORY.exec(source);
  if (!match) return [];
  const before = source.slice(0, match.index);
  if (hasTermList(before)) return [];
  const defs = kindDefinitions(before);
  if (defs.length !== 1) return [];
  const evidence = match[0].trim().slice(0, 160);
  return [{
    ruleId: 'opening-jumps-to-story',
    blockScoreContribution: 4,
    reason: 'Say what the subject is, then define the few terms the example will use, before the numbered story.',
    evidence,
    span: {start: match.index, end: match.index + match[0].length},
  }];
}

export function detectOpeningFaults(text, question) {
  return [
    ...detectKindBeforePurpose(text),
    ...detectDomainSkip(text),
    ...detectStoryBeforeDefinitions(text),
    ...detectAnalogLead(text),
    ...detectResultBeforeMapping(text),
    ...detectAskedSubjectSkip(text, question),
  ];
}
