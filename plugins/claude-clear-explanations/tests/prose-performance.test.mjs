import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

test('unmatched quotation openings stay within the local checker time budget', () => {
  const source = " 'a".repeat(20000) + ' plain—prose';
  const checker = fileURLToPath(new URL('../scripts/check-explanation.mjs', import.meta.url));
  const result = spawnSync(process.execPath, [checker, '--analyze'], {
    input: source, encoding:'utf8', timeout:3000,
  });
  assert.equal(result.error, undefined, 'checker must finish within three seconds');
  assert.equal(result.status, 0);
  const report = JSON.parse(result.stdout);
  assert.deepEqual(report.findings.map(item => item.ruleId), ['em-dash']);
  assert.equal(report.findings[0].span.start, source.indexOf('—'));
});
