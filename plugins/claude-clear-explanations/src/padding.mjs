const FUNCTION = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'being', 'before', 'by',
  'did', 'do', 'does', 'each', 'few', 'five', 'for', 'four', 'from', 'here',
  "here's", 'heres', 'how', 'in', 'into', 'is', 'it', "it's", 'its', 'more',
  'need', 'needs', 'next', 'now', 'of', 'on', 'one', 'or', 'see', 'so', 'than', 'that',
  "that's", 'thats', 'the', 'then', 'there', "there's", 'theres', 'these',
  'this', 'those', 'three', 'to', 'two', 'was', 'well', 'were', 'what', 'when', 'where',
  'why', 'with', 'you', 'your',
]);

const FILLER = new Set([
  'actual', 'basic', 'defined', 'important', 'key', 'main', 'quick', 'real',
  'simple', 'small', 'used', 'useful',
]);

const ROLE = new Set([
  'comparison', 'example', 'fact', 'idea', 'mechanism', 'part', 'parts', 'piece',
  'pieces', 'point', 'reason', 'subject', 'subjects', 'term', 'terms', 'thing',
  'topic', 'topics',
]);

const ANNOUNCE = new Set([
  'another', 'come', 'comes', 'coming', 'matter', 'matters',
]);

function tokens(sentence) {
  return sentence.toLowerCase().replace(/['’]/g, "'").match(/[a-z0-9]+(?:'[a-z]+)?/g) ?? [];
}

function contentTokens(sentence) {
  return tokens(sentence).filter(word => (
    !FUNCTION.has(word) && !FILLER.has(word) && !ROLE.has(word) && !ANNOUNCE.has(word)
  ));
}

export function splitSentences(text) {
  const source = typeof text === 'string' ? text : '';
  const found = [];
  const pattern = /[^.!?\n]+[.!?]?/g;
  for (const match of source.matchAll(pattern)) {
    const raw = match[0];
    const sentence = raw.trim();
    if (!sentence) continue;
    found.push({
      sentence,
      start: match.index + raw.indexOf(sentence),
    });
  }
  return found;
}

function colonLabel(sentence) {
  const match = String(sentence).match(/^([^:]{1,80}):\s+\S/);
  return match ? match[1].trim() : '';
}

function isEmptyWordRun(text, maxWords = 8) {
  if (/[`\d]/.test(text)) return false;
  const words = tokens(text);
  if (words.length === 0 || words.length > maxWords) return false;
  return contentTokens(text).length === 0;
}

function isNameOnlyAfterCopula(label) {
  const match = String(label).match(/\b(is|are)\b/i);
  if (!match) return false;
  const before = label.slice(0, match.index);
  const after = label.slice(match.index + match[0].length);
  const leftover = tokens(after);
  return isEmptyWordRun(before) && leftover.length >= 1 && leftover.length <= 6;
}

function setupLabel(sentence) {
  const colon = colonLabel(sentence);
  if (colon) return colon;
  const trailing = String(sentence).match(/^([^:]{1,80}):\s*$/);
  return trailing ? trailing[1].trim() : '';
}

function announcesNextSentence(sentence) {
  const trimmed = sentence.trim();
  if (/[`\d"]/.test(trimmed) || /[“”]/.test(trimmed)) return false;
  if (/^to\b/i.test(trimmed)) return false;
  return /^[^:\n]{1,160}:\s*$/.test(trimmed);
}

function loneAnnouncementLabel(sentence) {
  const trailing = String(sentence).match(/^([^:]{1,80}):\s*$/);
  if (!trailing) return false;
  const label = trailing[1].trim();
  if (/[`\d]/.test(label)) return false;
  return contentTokens(label).length <= 1;
}

function walkthroughChrome(sentence) {
  const bare = String(sentence).replace(/[*_`#]/g, '').trim().toLowerCase();
  return tokens(bare).length === 1 && ROLE.has(bare);
}

export function isEmptySetupSentence(sentence) {
  const trimmed = typeof sentence === 'string' ? sentence.trim() : '';
  if (!trimmed || /^#{1,6}(?:\s|$)/.test(trimmed) || /^[-*]\s*$/.test(trimmed) || walkthroughChrome(trimmed)) {
    return false;
  }
  if (announcesNextSentence(trimmed) || loneAnnouncementLabel(trimmed)) return true;
  const label = setupLabel(trimmed);
  const labelCap = /:$/.test(trimmed) ? 16 : 8;
  if (label && tokens(label).length >= 2 && (isEmptyWordRun(label, labelCap) || isNameOnlyAfterCopula(label))) {
    return true;
  }
  if (/[`\d]/.test(trimmed)) return false;
  return isEmptyWordRun(trimmed);
}

export function detectEmptySetup(text) {
  const source = typeof text === 'string' ? text : '';
  if (!/[A-Za-z]/.test(source)) return [];
  const findings = [];
  for (const item of splitSentences(source)) {
    if (!isEmptySetupSentence(item.sentence)) continue;
    findings.push({
      ruleId: 'empty-setup-sentence',
      blockScoreContribution: 4,
      reason: 'A sentence stays only if deleting it removes a fact, cause, limit, or the example\'s result.',
      evidence: item.sentence.slice(0, Math.min(item.sentence.length, 160)),
      span: {start: item.start, end: item.start + item.sentence.length},
    });
  }
  return findings;
}
