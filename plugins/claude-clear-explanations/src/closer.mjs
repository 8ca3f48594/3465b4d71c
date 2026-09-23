const COMPOUND = /[A-Za-z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)+/g;
const BOLD_LABEL = /\*\*([^*]+)\*\*/g;
const HEADING = /^(?:#{1,6}[ \t]+\S|[ \t]*\*\*[^*]+\*\*[ \t]*)$/gm;

function bodyText(text) {
  return String(text).replace(/^(?:#{1,6}[ \t]+.+\n?|[ \t]*\*\*[^*]+\*\*[ \t]*\n?)/gm, '');
}

function compounds(text) {
  return new Set([...(String(text).matchAll(COMPOUND))].map(item => item[0].toLowerCase()));
}

function boldLabels(text) {
  const names = new Set();
  for (const match of bodyText(text).matchAll(BOLD_LABEL)) {
    const label = match[1].replace(/:\s*$/, '').trim().toLowerCase();
    if (label) names.add(label);
  }
  return names;
}

function names(text) {
  return new Set([...compounds(text), ...boldLabels(text)]);
}

function leftoverNames(tail, earlier) {
  const seen = names(earlier);
  return [...names(tail)].filter(name => !seen.has(name));
}

function calledNames(text) {
  return new Set(
    [...String(text).matchAll(/\bcalled ([a-z][a-z0-9-]{2,})\b/gi)].map(item => item[1].toLowerCase()),
  );
}

function leftoverCalled(tail, earlier) {
  const seen = new Set([...names(earlier), ...calledNames(earlier)]);
  const prior = String(earlier).toLowerCase();
  return [...calledNames(tail)].filter(name => !seen.has(name) && !prior.includes(name));
}

function paragraphs(text) {
  return text.trim().split(/\n[ \t]*\n/).map(part => part.trim()).filter(Boolean);
}

function lastHeadingIndex(text) {
  let found = -1;
  for (const match of text.matchAll(HEADING)) {
    if (match.index > 0) found = match.index;
  }
  return found;
}

function closingTail(source) {
  const parts = paragraphs(source);
  if (parts.length < 2) return null;
  const heading = lastHeadingIndex(source);
  if (heading > 0) {
    return {tail: source.slice(heading), earlier: source.slice(0, heading)};
  }
  const last = parts[parts.length - 1];
  const prior = parts.slice(0, -1);
  const priorText = prior.join('\n');
  if (
    leftoverNames(last, priorText).length >= 2
    || leftoverCalled(last, priorText).length >= 1
    || prior.length < 2
  ) {
    return {tail: last, earlier: priorText};
  }
  return {tail: `${prior[prior.length - 1]}\n\n${last}`, earlier: prior.slice(0, -1).join('\n')};
}

export function detectLaterTopicDump(text) {
  const source = typeof text === 'string' ? text : '';
  if (!/[A-Za-z]/.test(source)) return [];
  const close = closingTail(source);
  if (!close) return [];
  const leftover = leftoverNames(close.tail, close.earlier);
  const called = leftoverCalled(close.tail, close.earlier);
  if (leftover.length < 2 && called.length < 1) return [];
  const start = source.lastIndexOf(close.tail.trim());
  const evidence = close.tail.replace(/\s+/g, ' ').slice(0, 160);
  const spanStart = Math.max(0, start);
  return [{
    ruleId: 'ai-later-topic',
    blockScoreContribution: 4,
    reason: 'End on the example\'s result. Do not add a later topic.',
    evidence,
    span: {start: spanStart, end: spanStart + Math.min(close.tail.length, evidence.length)},
  }];
}
