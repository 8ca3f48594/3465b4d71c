import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { preparePreference } from '../src/preference.mjs';

const [inputPath, outputDir] = process.argv.slice(2);
if (!inputPath || !outputDir) {
  process.stderr.write('Usage: node scripts/prepare-preference.mjs pairs.json output-dir\n');
  process.exit(1);
}

const pairs = JSON.parse(readFileSync(inputPath, 'utf8'));
const packet = preparePreference(Array.isArray(pairs) ? pairs : pairs.pairs);
const out = resolve(outputDir);
await mkdir(out, {recursive: true});
await writeFile(resolve(out, 'blind-review.json'), `${JSON.stringify(packet.review, null, 2)}\n`, {mode: 0o600});
await writeFile(resolve(out, 'private-key.json'), `${JSON.stringify(packet.key, null, 2)}\n`, {mode: 0o600});
process.stdout.write(`${JSON.stringify({status: packet.status, pairCount: packet.review.length, outputDir: out})}\n`);
