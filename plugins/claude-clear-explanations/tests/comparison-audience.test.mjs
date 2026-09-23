import assert from 'node:assert/strict';
import test from 'node:test';
import {prepareComparison} from '../src/comparison.mjs';

test('blind comparison preserves the reader knowledge used for both explanations', () => {
  const audience = 'I understand saving a file and making a commit. Use the painting example to explain branches.';
  const original = 'A branch identifies a commit.';
  const request = {
    question:'What does a Git branch add?',
    audience,
    sources:[{id:'source', text:original}],
    draft:original,
  };
  const run = guideIds => ({
    auditId:'fixture', request, models:{rewrite:'test', verify:'test'},
    libraryHash:'fixture', guideIds, costUsd:0, latencyMs:1,
    candidates:[{}], calls:[], result:{status:'accepted', answer:original},
  });
  const bundle = prepareComparison([{
    id:'reader-knowledge', original,
    general:run(['anti-slop','clear-explanation']),
    guided:run(['anti-slop','clear-explanation','git-version-control']),
  }]);
  assert.equal(bundle.review[0].audience, audience);
});
