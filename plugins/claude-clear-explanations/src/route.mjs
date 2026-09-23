function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function hasTerm(text, term) {
  const needle = String(term ?? '').trim().toLowerCase();
  if (!needle || typeof text !== 'string') return false;
  const haystack = text.toLowerCase();
  if (needle.includes(' ')) return haystack.includes(needle);
  return new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(needle)}(?:[^a-z0-9]|$)`).test(haystack);
}

// Cowan 2001/2010: central store holds about four chunks. An intro that names
// more features still gets at most this many slices.
export const WORKING_MEMORY_SLOTS = 4;

const METHOD_HINTS = {
  definition: ['what is', 'what are', 'explain', 'define', 'meaning of', "i don't get", 'confused', 'lost on'],
  'causal-explanation': ['why ', 'cause', 'because'],
  'execution-walkthrough': ['walk through', 'trace', 'how does this code', 'control flow'],
  diagnosis: ['bug', 'error', 'failing', 'broken', 'does not work'],
  comparison: [' versus ', ' vs ', 'difference between', 'tradeoff', 'confused with'],
  'worked-tutorial': ['how do i', 'tutorial', 'step by step'],
};

const TOPIC_HINTS = {
  'git-version-control': ['git', 'github', 'commit', 'commits', 'branch', 'branches', 'staging', 'repository'],
};

export function matchesTerm(text, term) {
  const needle = String(term ?? '').trim();
  if (!needle || typeof text !== 'string') return false;
  return hasTerm(text, needle) || (needle.includes(' ') && text.toLowerCase().includes(needle.toLowerCase()));
}

function topicTerms(entry) {
  return [...(TOPIC_HINTS[entry.id] ?? []), ...(Array.isArray(entry.terms) ? entry.terms : [])];
}

function scoreEntry(entry, text) {
  let score = 0;
  const terms = entry.kind === 'method' ? METHOD_HINTS[entry.id] ?? [] : topicTerms(entry);
  for (const term of terms) {
    if (matchesTerm(text, term) || (term.endsWith(' ') && text.includes(term))) score += 3;
  }
  return score;
}

export function selectGuides(question, audience, index) {
  const text = `${question ?? ''}\n${audience ?? ''}`.toLowerCase();
  const methods = [];
  const topics = [];
  if (!Array.isArray(index) || !text.trim()) return {methods, topics};
  for (const entry of index) {
    if (!entry?.id || !['method', 'topic'].includes(entry.kind)) continue;
    const score = scoreEntry(entry, text);
    if (score < 3) continue;
    if (entry.kind === 'method') methods.push({id: entry.id, score});
    if (entry.kind === 'topic') topics.push({id: entry.id, score});
  }
  methods.sort((left, right) => right.score - left.score || left.id.localeCompare(right.id));
  topics.sort((left, right) => right.score - left.score || left.id.localeCompare(right.id));
  return {
    methods: methods.slice(0, 2).map(item => item.id),
    topics: topics.slice(0, 3).map(item => item.id),
  };
}

export function rankIndex(index, question, audience) {
  if (!Array.isArray(index)) return [];
  const selected = selectGuides(question, audience, index);
  const keep = new Set([...selected.methods, ...selected.topics]);
  if (!keep.size) return index.filter(entry => entry.kind === 'method').slice(0, 2);
  return index.filter(entry => keep.has(entry.id));
}

export function mergeSelections(auto, routed) {
  const unique = (values, limit) => [...new Set((values ?? []).filter(Boolean))].slice(0, limit);
  return {
    methods: unique([...(auto?.methods ?? []), ...(routed?.methods ?? [])], 2),
    topics: unique([...(auto?.topics ?? []), ...(routed?.topics ?? [])], 3),
  };
}

const KNOWN_SLICE = {
  'git-commits': [/\bcommits?\b/i, /\bsav(?:e|ing|ed)\b/i],
  'git-staging': [/\bstag(?:e|ing)\b/i],
  'git-branches': [/\bbranch(?:es)?\b/i],
  'git-merges': [/\bmerg(?:e|es|ing)\b/i, /\bconflicts?\b/i],
};

export function splitStatedKnowledge(prompt, audience = '') {
  const source = String(prompt ?? '');
  const statements = [];
  const remainder = source.replace(/\bI understand\b[^.!?\n]*/gi, match => {
    statements.push(match.trim());
    return ' ';
  });
  const question = remainder.replace(/\s+/g, ' ').trim() || source.trim();
  const extra = String(audience ?? '').trim();
  return {
    question,
    audience: [extra, ...statements].filter(Boolean).join(' ').trim(),
  };
}

export function pickSlices(slices, question, audience = '') {
  if (!Array.isArray(slices) || !slices.length) return [];
  const split = splitStatedKnowledge(question, audience);
  const q = split.question;
  const a = split.audience;
  const matched = slices.filter(slice => (slice.terms ?? []).some(term => matchesTerm(q, term)));
  const known = new Set();
  for (const [id, patterns] of Object.entries(KNOWN_SLICE)) {
    if (patterns.some(pattern => pattern.test(a)) && !patterns.some(pattern => pattern.test(q))) known.add(id);
  }
  let picked = matched.filter(slice => !known.has(slice.id));
  const purpose = slices.find(slice => slice.id === 'git-purpose');
  const commits = slices.find(slice => slice.id === 'git-commits');
  if (purpose && picked.some(slice => slice.id === purpose.id) && commits && !known.has(commits.id) && !picked.some(slice => slice.id === commits.id)) {
    picked = [...picked, commits];
  }
  const order = slices.map(slice => slice.id);
  picked.sort((left, right) => order.indexOf(left.id) - order.indexOf(right.id));
  return picked.slice(0, WORKING_MEMORY_SLOTS);
}

export function normalizePrompt(prompt) {
  return String(prompt ?? '').replace(/^\s*\/[A-Za-z0-9:_-]+\s*/, '').trim();
}

export function formatPacket(guides) {
  return [
    'Teaching packet for this question. Use only this packet. Do not search the repository for plugin guides.',
    'Before using a term, say what kind of thing it is in this setting.',
    'If a topic guide does not match the asked subject, stop. Do not replace it with another topic.',
    ...guides.map(guide => `<guide id="${guide.id}">\n${guide.text}\n</guide>`),
  ].join('\n\n');
}
