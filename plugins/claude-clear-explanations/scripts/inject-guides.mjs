import process from 'node:process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { collectAnalogPairs } from '../src/analog.mjs';
import { writeSessionBindings } from '../src/binding-store.mjs';
import { loadLibrary } from '../src/library.mjs';
import { formatPacket, normalizePrompt, selectGuides, splitStatedKnowledge } from '../src/route.mjs';

export async function buildTeachingPacket(prompt, {library} = {}) {
  const split = splitStatedKnowledge(normalizePrompt(prompt));
  const question = split.question;
  const audience = split.audience || undefined;
  const lib = library ?? await loadLibrary();
  const selected = selectGuides(question, audience, lib.index);
  const loaded = selected.topics.length
    ? (await lib.load(selected.topics, {question, audience})).filter(guide => guide.text.trim())
    : [];
  const guides = [...(lib.packet?.length ? lib.packet : lib.general), ...loaded];
  return {
    question,
    methods: selected.methods,
    topics: loaded.map(guide => guide.id),
    sliceIds: loaded.flatMap(guide => guide.sliceIds ?? []),
    bindings: loaded.flatMap(guide => collectAnalogPairs(guide.text)),
    text: formatPacket(guides),
  };
}

export function evaluatePromptSubmit(input, packet) {
  if (!input || typeof input !== 'object' || typeof input.prompt !== 'string' || !input.prompt.trim()) return {};
  if (typeof packet?.text !== 'string' || !packet.text.trim()) return {};
  return {
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: packet.text,
    },
  };
}

async function readStandardInput() {
  let input = '';
  for await (const chunk of process.stdin) input += chunk;
  return input;
}

async function main() {
  const raw = await readStandardInput();
  let parsed = null;
  try { parsed = JSON.parse(raw); }
  catch { parsed = null; }
  if (parsed && typeof parsed.prompt === 'string') {
    const packet = await buildTeachingPacket(parsed.prompt);
    writeSessionBindings(parsed.session_id, packet.bindings, packet.question);
    process.stdout.write(`${JSON.stringify(evaluatePromptSubmit(parsed, packet))}\n`);
    return;
  }
  if (process.argv.includes('--question')) {
    const packet = await buildTeachingPacket(raw);
    process.stdout.write(`${JSON.stringify(packet)}\n`);
    return;
  }
  process.stdout.write('{}\n');
}

const isMain =
  typeof process.argv[1] === 'string' &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
  await main();
}
