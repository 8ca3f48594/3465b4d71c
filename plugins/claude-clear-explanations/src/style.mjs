import { analyzeExplanation } from '../scripts/check-explanation.mjs';
import { proseOnly } from './prose.mjs';
export { proseOnly } from './prose.mjs';

const contextualRules = [
  ['inflated-importance', /\b(?:game-changer|plays a pivotal role|a testament to|revolutionary breakthrough)\b/gi, 'State the observable effect and its supporting evidence.'],
  ['vague-attribution', /\b(?:experts say|studies show|research suggests|many believe)\b/gi, 'Identify the source and what it establishes.'],
  ['decorative-jargon', /\b(?:rich tapestry|ever-evolving landscape|navigate the landscape|delve into|unlock the potential|seamlessly leverage)\b/gi, 'Name the concrete action or relationship.'],
  ['stock-opening', /\b(?:in today[’']s (?:fast-paced|digital) world|in an era of rapid)\b/gi, 'Begin with the question and its specific answer.'],
];

export function inspectStyle(text, { mode = 'answer', previousAnswers = [], bindings = [] } = {}) {
  const masked = proseOnly(text);
  const findings = analyzeExplanation(masked, { proseMasked:true, bindings }).findings
    .filter(item => mode !== 'prompt' || (item.ruleId !== 'heading-overload' && !String(item.ruleId).startsWith('git-') && !String(item.ruleId).startsWith('ai-') && !String(item.ruleId).startsWith('opening-') && !String(item.ruleId).startsWith('empty-') && item.ruleId !== 'unnamed-demonstrative' && item.ruleId !== 'unused-term' && item.ruleId !== 'dropped-analog'))
    .map(item => ({ ruleId:item.ruleId, message:item.reason, span:item.span,
      blocking:['canned-preamble', 'offer-to-continue', 'em-dash'].includes(item.ruleId) || String(item.ruleId).startsWith('git-') || String(item.ruleId).startsWith('ai-') || String(item.ruleId).startsWith('opening-') || String(item.ruleId).startsWith('empty-') || item.ruleId === 'unnamed-demonstrative' || item.ruleId === 'unused-term' || item.ruleId === 'dropped-analog' }));
  for (const [ruleId, expression, message] of contextualRules) {
    for (const match of masked.matchAll(expression)) {
      findings.push({ruleId, message, blocking:false, span:{start:match.index, end:match.index + match[0].length}});
    }
  }
  const contrasts = [...masked.matchAll(/\bnot (?:just |merely |only )?[^.!?\n]{1,100}\bbut\b/gi)];
  if (contrasts.length >= 2) findings.push({ruleId:'repeated-contrast', blocking:false, message:'Check whether each contrast adds a necessary distinction.'});
  const sentences = masked.match(/[^.!?\n]+[.!?]?/g)?.map(s => s.trim()).filter(s => s.split(/\s+/).length >= 8) ?? [];
  const seen = new Set();
  for (const sentence of sentences) {
    if (seen.has(sentence)) findings.push({ruleId:'repeated-sentence', blocking:false, message:'Remove repetition that adds no evidence or reasoning.'});
    seen.add(sentence);
  }
  if (mode === 'answer' && previousAnswers.some(answer => {
    const previous = proseOnly(answer).toLowerCase();
    return sentences.some(sentence => sentence.split(/\s+/).length >= 12 && previous.includes(sentence.toLowerCase()));
  })) findings.push({ruleId:'cross-answer-repetition', blocking:false, message:'Check whether reused wording or an analogy fits this particular question.'});
  return findings;
}
