import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export function bindingStorePath(sessionId) {
  if (typeof sessionId !== 'string' || !sessionId.trim()) return null;
  const safe = sessionId.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 80);
  if (!safe) return null;
  return join(tmpdir(), 'claude-clear-explanations', `${safe}.bindings.json`);
}

function readSessionRecord(sessionId) {
  const path = bindingStorePath(sessionId);
  if (!path) return null;
  try {
    const data = JSON.parse(readFileSync(path, 'utf8'));
    return data && typeof data === 'object' ? data : null;
  } catch {
    return null;
  }
}

export function writeSessionBindings(sessionId, bindings, question) {
  const path = bindingStorePath(sessionId);
  if (!path) return;
  mkdirSync(join(tmpdir(), 'claude-clear-explanations'), {recursive: true});
  writeFileSync(path, `${JSON.stringify({
    bindings: Array.isArray(bindings) ? bindings : [],
    question: typeof question === 'string' ? question : '',
  })}\n`);
}

export function readSessionBindings(sessionId) {
  const data = readSessionRecord(sessionId);
  return Array.isArray(data?.bindings) ? data.bindings : [];
}

export function readSessionQuestion(sessionId) {
  const data = readSessionRecord(sessionId);
  return typeof data?.question === 'string' ? data.question : '';
}
