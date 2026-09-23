import { detectAiisms } from './aiisms.mjs';
import { detectMisconceptions, firstParagraph } from './misconceptions.mjs';

const SAVE_IS_NOT_COMMIT = /(?:does not|doesn['’]t|is not(?: the same)?|isn['’]t(?: the same)?)/i;

const CHECKS = {
  'opening-identifies-purpose': text => {
    const first = firstParagraph(text);
    const names = /\bGit\b/i.test(first);
    const kind = /\b(?:is|are) (?!how\b)/i.test(first);
    const purpose = /\b(?:keep|lets you|record|inspect|restore|version|histor|branch|tool|software)\b/i.test(first);
    return names && kind && purpose;
  },
  'one-example-to-useful-result': text => /\bpaint/i.test(text) && /\b(?:outline|blue sky|commit)/i.test(text),
  'commit-not-editor-save': text => /saving a file/i.test(text) && SAVE_IS_NOT_COMMIT.test(text),
  'new-commits-keep-history': text => /\b(?:keep|preserve|remain|available)\b/i.test(text) && /\b(?:earlier|history|previous)\b/i.test(text),
  'no-adjacent-topic-tour': text => {
    const extra = [
      /\bstag(?:e|ing area)\b/i,
      /\bremotes?\b/i,
      /\bgithub\b/i,
      /\bmerg(?:e|es|ing)\b/i,
      /\bshare versions\b/i,
      /\bseparate versions in parallel\b/i,
      /\bprepare a version before saving\b/i,
      /\bthere(?:['’]s| is) more to git\b/i,
    ];
    return extra.filter(pattern => pattern.test(text)).length < 2;
  },
  'accept-stated-commit-knowledge': text => !/saving a file in (?:your|an) editor (?:does not|doesn['’]t|is not|isn['’]t)/i.test(text),
  'switch-before-commit': text => /\b(?:switch|checkout|check out)\b/i.test(text),
  'branches-not-required-for-history': text => !detectMisconceptions(text).some(item => item.ruleId === 'git-branches-required-for-history'),
  'painting-stays-hypothetical': text => /\b(?:suppose|imagine|hypothetical)\b/i.test(text) || !/\byou (?:painted|were painting)\b/i.test(text),
  'no-ai-isms': text => detectAiisms(text).length === 0,
};

export function scoreCriteria(text, criteria) {
  return (criteria ?? []).map(id => {
    const check = CHECKS[id];
    if (!check) return {id, passed: false, reason: 'unknown-criterion'};
    return {id, passed: Boolean(check(text))};
  });
}

export function allCriteriaPassed(text, criteria) {
  return scoreCriteria(text, criteria).every(item => item.passed);
}
