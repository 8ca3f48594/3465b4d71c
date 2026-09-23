import { randomUUID } from 'node:crypto';
import { unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  questionFromTranscriptText,
  readTranscriptQuestion,
} from '../src/transcript.mjs';

test('slash-command wrappers yield the asked text, not the command name', () => {
  const asked = 'how the /c90373deff:explain skill works (hooks, packet, slices)';
  assert.equal(
    questionFromTranscriptText(
      `<command-name>explain</command-name>\n<command-args>${asked}</command-args>`,
    ),
    asked,
  );
  assert.equal(
    questionFromTranscriptText(
      `<command-name>explain</command-name>\n<command-message>${asked}</command-message>`,
    ),
    asked,
  );
  assert.equal(questionFromTranscriptText('<command-name>explain</command-name>'), '');
  assert.equal(
    questionFromTranscriptText('Teaching packet for this question. Use only this packet.'),
    '',
  );
});

test('readTranscriptQuestion walks past hook noise to the last asked text', () => {
  const asked = 'how the /c90373deff:explain skill works (hooks, packet, slices)';
  const path = join(tmpdir(), `transcript-${randomUUID()}.jsonl`);
  writeFileSync(path, [
    JSON.stringify({
      type: 'user',
      message: {
        role: 'user',
        content: `<command-name>explain</command-name>\n<command-args>${asked}</command-args>`,
      },
    }),
    JSON.stringify({
      type: 'user',
      message: {role: 'user', content: 'Teaching packet for this question. Use only this packet.'},
    }),
    JSON.stringify({type: 'assistant', message: {role: 'assistant', content: 'draft'}}),
  ].join('\n'));
  assert.equal(readTranscriptQuestion(path), asked);
  unlinkSync(path);
});
