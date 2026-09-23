import { randomInt } from 'node:crypto';

const fail = () => { throw new Error('invalid-preference'); };
const text = value => typeof value === 'string' && value.trim().length > 0;

export function preparePreference(pairs) {
  if (!Array.isArray(pairs) || !pairs.length || new Set(pairs.map(item => item.id)).size !== pairs.length) fail();
  const review = [];
  const key = [];
  for (const item of pairs) {
    if (!text(item.id) || !text(item.question) || !text(item.left) || !text(item.right)) fail();
    if (!text(item.leftCondition) || !text(item.rightCondition) || item.leftCondition === item.rightCondition) fail();
    const candidates = [
      {condition: item.leftCondition, answer: item.left},
      {condition: item.rightCondition, answer: item.right},
    ];
    if (randomInt(2) === 1) candidates.reverse();
    review.push({
      id: item.id,
      question: item.question,
      ...(item.audience ? {audience: item.audience} : {}),
      sources: item.sources ?? [],
      criteria: item.criteria ?? [],
      candidates: candidates.map((candidate, index) => ({label: 'AB'[index], answer: candidate.answer})),
      preferred: null,
      notes: '',
    });
    key.push({
      id: item.id,
      candidates: candidates.map((candidate, index) => ({label: 'AB'[index], condition: candidate.condition})),
    });
  }
  return {version: 1, status: 'awaiting-human', review, key};
}
