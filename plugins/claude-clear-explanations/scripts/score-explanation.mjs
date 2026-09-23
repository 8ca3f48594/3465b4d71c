#!/usr/bin/env node
import process from 'node:process';
import { readFile } from 'node:fs/promises';
import { analyzeExplanation } from './check-explanation.mjs';
import { scoreCriteria } from '../src/criteria.mjs';

const cases = JSON.parse(
  await readFile(new URL('../quality/explanation-cases.json', import.meta.url), 'utf8'),
);

let text = '';
for await (const chunk of process.stdin) text += chunk;

const caseId = process.argv[2] ?? 'git-first-introduction';
const entry = cases.cases.find(item => item.id === caseId);
if (!entry) {
  process.stderr.write(`unknown case ${caseId}\n`);
  process.exitCode = 2;
} else {
  const report = analyzeExplanation(text);
  const criteria = scoreCriteria(text, entry.criteria);
  const passed = !report.shouldBlock && criteria.every(item => item.passed);
  process.stdout.write(`${JSON.stringify({caseId, passed, shouldBlock: report.shouldBlock, findings: report.findings.map(item => item.ruleId), criteria}, null, 2)}\n`);
  process.exitCode = passed ? 0 : 1;
}
