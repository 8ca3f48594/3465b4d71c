import {loadLibrary} from '../src/library.mjs';
import {inspectStyle} from '../src/style.mjs';
import {instructions,assembleSystem} from '../src/prompts.mjs';
import {readFile} from 'node:fs/promises';
try {
  const library=await loadLibrary();
  const findings=[...library.promptFindings];
  for(const [id,text] of Object.entries(instructions))for(const finding of inspectStyle(text,{mode:'prompt'}))findings.push({id,...finding});
  for(const entry of library.index){
    const guides=[...library.general,...await library.load([entry.id])];
    for(const stage of Object.keys(instructions))for(const finding of inspectStyle(assembleSystem(stage,guides),{mode:'prompt'}))findings.push({id:`${stage}:${entry.id}`,...finding});
  }
  for(const path of ['../skills/explain/SKILL.md','../output-styles/clear-explanations.md']){
    const text=await readFile(new URL(path,import.meta.url),'utf8');
    for(const finding of inspectStyle(text,{mode:'prompt'}))findings.push({id:path,...finding});
  }
  process.stdout.write(JSON.stringify({libraryHash:library.hash,topics:library.index.filter(e=>e.kind==='topic').length,methods:library.index.filter(e=>e.kind==='method').length,findings},null,2)+'\n');
  if(findings.length)process.exitCode=1;
}catch{process.stderr.write('Prompt check failed: invalid library.\n');process.exitCode=1;}
