const RULES = [
  {
    ruleId: 'git-records-every-edit',
    reason: 'Git records selected snapshots, not every editor save or brushstroke. Qualify that claim.',
    patterns: [
      /\bevery (?:change|edit|brushstroke|save)\b.{0,48}\b(?:recorded|remembered|tracked)\b/gi,
      /\brecords? every (?:change|edit|brushstroke|save)\b/gi,
      /\bautomatically record(?:s|ed)? every\b/gi,
    ],
  },
  {
    ruleId: 'git-commit-overwrites-history',
    reason: 'Ordinary new commits keep earlier commits. Do not say a later commit overwrites a previous committed version.',
    patterns: [
      /\b(?:overwrite|overwrites|overwritten|overwriting)\b.{0,72}\b(?:earlier|previous|prior) (?:committed )?version/gi,
      /\b(?:earlier|previous|prior) (?:committed )?version.{0,72}\b(?:overwrite|overwrites|overwritten)\b/gi,
    ],
  },
  {
    ruleId: 'git-automatic-image-merge',
    reason: 'Image or painting files do not generally merge automatically. State the real merge limit.',
    patterns: [
      /\b(?:automatic|automatically) (?:merge|merging|combine|combines|combined)\b.{0,80}\b(?:painting|image|photo|binary)\b/gi,
      /\b(?:painting|image) files?\b.{0,40}\b(?:merge|combine) automatically\b/gi,
      /\b(?:merge|merging|combine|combines)\b.{0,60}\b(?:painting|image)s?\b.{0,24}\bautomatically\b/gi,
    ],
  },
  {
    ruleId: 'git-save-is-commit',
    reason: 'An editor save is not a Git commit. Distinguish the current file from the recorded snapshot.',
    patterns: [
      /\bsav(?:e|ing|ed) (?:the )?(?:file|painting|drawing|document).{0,48}\b(?:is|as|makes?) (?:a |the )?(?:git )?commit\b/gi,
      /\bcommit (?:is|equals) (?:just |simply )?(?:saving|an editor save)\b/gi,
    ],
  },
  {
    ruleId: 'git-branches-required-for-history',
    reason: 'A single branch already keeps earlier commits. Do not treat extra branches as required to retain history.',
    patterns: [
      /\bbranch(?:es)?\b.{0,60}\b(?:necessary|required|needed)\b.{0,50}\b(?:keep|retain|preserve|store)\b/gi,
    ],
  },
  {
    ruleId: 'git-uncommitted-always-recoverable',
    reason: 'Unrecorded edits are not guaranteed recoverable. Limit recovery claims to available recorded versions.',
    patterns: [
      /\buncommitted\b.{0,50}\balways\b.{0,40}\brecover/gi,
      /\brecover(?:s|ed|able)? (?:every|any|all) (?:uncommitted|unrecorded|unsaved)\b/gi,
    ],
  },
  {
    ruleId: 'git-create-branch-skips-switch',
    reason: 'Creating a branch does not select it. Switch to the new branch before describing commits made on it.',
    patterns: [
      /\bcreate(?:s|d)? (?:a |the )?(?:new )?[^\n.]{0,40}branch.{0,140}(?:commit the change|and commit|then commit|make a commit)\b/gi,
    ],
  },
  {
    ruleId: 'git-commit-uploads',
    reason: 'Recording a commit locally does not upload it. Keep sharing as a separate operation.',
    patterns: [
      /\bcommit(?:ting)?(?: them| it)? locally.{0,24}(?:uploads|pushes|shares)\b/gi,
      /\ba (?:local )?commit (?:also )?(?:uploads|pushes)\b/gi,
    ],
  },
];

export function firstParagraph(text) {
  const source = typeof text === 'string' ? text : '';
  const trimmed = source.replace(/^\uFEFF?\s*/, '');
  const end = trimmed.search(/\r?\n[ \t]*\r?\n/);
  return (end === -1 ? trimmed : trimmed.slice(0, end)).trim();
}

function openingHidesGit(text) {
  const first = firstParagraph(text);
  if (!first || /\bGit\b/i.test(first)) return false;
  const signals = [
    /\bpaint(?:ing|ed)?\b/i,
    /\bcommits?\b/i,
    /\bbranch(?:es)?\b/i,
    /\bstag(?:e|ing)\b/i,
    /\bsnapshots?\b/i,
  ];
  return signals.filter(pattern => pattern.test(text)).length >= 2;
}

function openingFinding(text) {
  if (!openingHidesGit(text)) return null;
  const first = firstParagraph(text);
  const start = Math.max(0, text.indexOf(first));
  const evidence = first.slice(0, Math.min(first.length, 160));
  return {
    ruleId: 'git-opening-hides-subject',
    blockScoreContribution: 4,
    reason: 'Name Git and its purpose in the first paragraph so the reader can tell what is being explained.',
    evidence,
    span: {start, end: start + evidence.length},
  };
}

function isGitDomain(text) {
  return /\b(?:git|github|commit|commits|staging area|repositor(?:y|ies)|git branch)\b/i.test(text);
}

function asserted(text, index, matched) {
  const before = text.slice(Math.max(0, index - 80), index);
  return !/\b(?:not|never|no|without|doesn['’]t|do not|does not|cannot|can not|won['’]t|neither|avoid)\b/i.test(`${before} ${matched}`);
}

export function detectMisconceptions(text, {question = '', audience = ''} = {}) {
  const source = typeof text === 'string' ? text : '';
  if (!isGitDomain(`${question} ${audience} ${source}`)) return [];
  const findings = [];
  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      pattern.lastIndex = 0;
      for (const match of source.matchAll(pattern)) {
        if (rule.ruleId === 'git-create-branch-skips-switch' && /\b(?:switch|checkout|check out|checked out)\b/i.test(match[0])) continue;
        if (!asserted(source, match.index, match[0])) continue;
        findings.push({
          ruleId: rule.ruleId,
          blockScoreContribution: 4,
          reason: rule.reason,
          evidence: match[0],
          span: {start: match.index, end: match.index + match[0].length},
        });
      }
    }
  }
  const opening = openingFinding(source);
  if (opening) findings.push(opening);
  findings.sort((left, right) => left.span.start - right.span.start);
  return findings;
}
