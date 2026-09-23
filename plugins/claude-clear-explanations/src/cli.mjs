import { readFile, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadLibrary } from './library.mjs';
import { createClaudeClient } from './claude-client.mjs';
import { runExplanation } from './runner.mjs';
import { auditWriter, acceptedHistory } from './audit.mjs';

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)),'..');
const switches = new Set(['--json','--general-only','--help']);
const values = new Set(['--request','--model','--verify-model','--budget-usd','--timeout-ms','--max-prompt-bytes','--audit-dir']);
const help = `Usage: npm run explain -- --request request.json --model MODEL_ID --budget-usd LIMIT [--verify-model MODEL_ID] [--json] [--general-only]\nOptional: --audit-dir PATH --timeout-ms MILLISECONDS --max-prompt-bytes BYTES\nSources in the request may use {id,text} or {id,path}; paths are relative to the request file.\nLive calls require ANTHROPIC_API_KEY in the environment. Source files must contain no credentials.\n`;
const invalid = code => { throw Object.assign(new Error(code),{code}); };

function parseArgs(argv) {
  const args = {};
  for (let i=0;i<argv.length;i++) {
    const flag=argv[i];
    if (Object.hasOwn(args,flag) || (!switches.has(flag) && !values.has(flag))) invalid('invalid-options');
    if (switches.has(flag)) args[flag]=true;
    else {
      const value=argv[++i];
      if (!value || value.startsWith('--')) invalid('invalid-options');
      args[flag]=value;
    }
  }
  return args;
}

async function readBounded(path) {
  if ((await stat(path)).size > 1_000_000) invalid('invalid-request-file');
  const data = await readFile(path);
  return new TextDecoder('utf-8',{fatal:true}).decode(data);
}

async function readRequest(path) {
  try {
    const request = JSON.parse(await readBounded(path));
    if (!Array.isArray(request.sources)) invalid('invalid-request-file');
    const sources = [];
    for (const source of request.sources) {
      if (source && typeof source.path === 'string' && Object.keys(source).every(key=>['id','path'].includes(key))) {
        if (/(?:^|[\\/])\.env(?:\.|$)/i.test(source.path)) invalid('invalid-request-file');
        sources.push({id:source.id,text:await readBounded(resolve(dirname(path),source.path))});
      } else sources.push(source);
    }
    const input = {...request,sources};
    const key=process.env.ANTHROPIC_API_KEY;
    if (key && JSON.stringify(input).includes(key)) invalid('invalid-request-file');
    return input;
  } catch { invalid('invalid-request-file'); }
}

export async function main(argv, {client,write = text => process.stdout.write(text),signal} = {}) {
  let args;
  let result;
  try {
    args=parseArgs(argv);
    if (args['--help']) {write(help);return 0;}
    const model=args['--model'];
    const budget=Number(args['--budget-usd']);
    if (!args['--request'] || !model?.trim() || !Number.isFinite(budget) || budget<=0) invalid('invalid-options');
    const request=await readRequest(resolve(args['--request']));
    let library=await loadLibrary();
    if (args['--general-only']) library={...library,index:[],load:async ids=>{if(ids.length)invalid('invalid-routing');return [];}};
    const auditDir=resolve(args['--audit-dir'] ?? resolve(pluginRoot,'.artifacts/runs'));
    const previousAnswers=await acceptedHistory(auditDir);
    result=await runExplanation(request,{
      client:client ?? createClaudeClient(), library,
      models:{draft:model,route:model,rewrite:model,verify:args['--verify-model'] ?? model},maxBudgetUsd:budget,
      ...(args['--timeout-ms'] ? {timeoutMs:Number(args['--timeout-ms'])} : {}),
      ...(args['--max-prompt-bytes'] ? {maxPromptBytes:Number(args['--max-prompt-bytes'])} : {}),
      previousAnswers,signal,audit:auditWriter(auditDir),
    });
  } catch(error) {
    const reason=['invalid-options','invalid-request-file','invalid-library','history-unavailable'].includes(error.code ?? error.message) ? (error.code ?? error.message) : 'setup-failed';
    result={status:'failed',reason,guideIds:[],findings:[],auditId:null};
  }
  if (args?.['--json'] || argv.includes('--json')) write(JSON.stringify(result)+'\n');
  else if(result.status==='accepted') write(result.answer+'\n');
  else write(`Explanation not released (${result.reason}).${result.auditId ? ` Audit: ${result.auditId}.` : ''}\n`);
  return result.status==='accepted' ? 0 : 1;
}
