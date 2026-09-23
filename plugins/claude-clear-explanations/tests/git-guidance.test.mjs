import assert from 'node:assert/strict';
import test from 'node:test';
import {loadLibrary} from '../src/library.mjs';
import {runExplanation} from '../src/runner.mjs';

test('the routing index exposes a focused Git guide with a bounded painting example', async () => {
  const library = await loadLibrary();
  const entry = library.index.find(item => item.id === 'git-version-control');
  assert.ok(entry, 'Git needs a selectable guide after the observed fallback');
  assert.equal(entry.kind, 'topic');
  assert.match(entry.description, /Git/);
  const [guide] = await library.load([entry.id]);
  assert.match(guide.text, /painting/i);
  assert.match(guide.text, /photograph/i);
  assert.match(guide.text, /## Analogies and limits/);
  assert.match(guide.text, /https:\/\/git-scm.com/);
  assert.deepEqual(library.promptFindings, []);
  const intro = await library.load([entry.id], {question: 'Explain Git.'});
  assert.deepEqual(intro[0].sliceIds, ['git-purpose', 'git-commits']);
  assert.doesNotMatch(intro[0].text, /night-scene/);
});

test('the selected Git guide and stated knowledge reach writing and review unchanged', async () => {
  const calls = [];
  const audits = [];
  const request = {
    question: 'How do Git branches relate to the versions I already understand?',
    audience: 'I understand saving a file and making a commit. Use the painting example to explain branches.',
    sources: [{id:'git',text:'A Git branch names a line of development and points to its latest commit.'}],
  };
  const answer = 'Git branches let you name one line of development. The branch pointer advances when you commit on that branch.';
  const result = await runExplanation(request, {
    library:await loadLibrary(),
    models:{draft:'test',route:'test',rewrite:'test',verify:'test'},
    maxBudgetUsd:1,timeoutMs:1000,audit:async record => audits.push(record),
    client:{async complete(call) {
      calls.push(call);
      const output = call.stage === 'draft' ? {draft:answer,methods:['causal-explanation'],topics:['git-version-control']}
        : call.stage === 'rewrite' ? {answer,corrections:[]}
        : {accepted:true,findings:[],checkedSourceIds:['git']};
      return {output,costUsd:0.01,model:call.model};
    }},
  });
  assert.equal(result.status, 'accepted');
  assert.ok(result.guideIds.includes('git-version-control'));
  for (const call of calls) assert.equal(JSON.parse(call.prompt).audience, request.audience);
  for (const call of calls.filter(item => item.stage === 'rewrite' || item.stage === 'draft')) {
    assert.ok(call.system.includes('<guide id="git-version-control">'));
  }
  for (const call of calls.filter(item => item.stage === 'verify')) {
    assert.equal(call.system.includes('<guide id="git-version-control">'), false);
  }
  assert.deepEqual(audits[0].request, request);
});
