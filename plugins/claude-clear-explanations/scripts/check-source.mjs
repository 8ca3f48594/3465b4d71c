import {readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
let count=0;
for(const folder of ['src','scripts','tests'])for(const file of await readdir(resolve(root,folder))){
  if(!file.endsWith('.mjs'))continue;
  const result=spawnSync(process.execPath,['--check',resolve(root,folder,file)],{encoding:'utf8',timeout:10000});
  if(result.status!==0){process.stderr.write(result.stderr||'Syntax check failed.\n');process.exitCode=1;}
  count++;
}
process.stdout.write(`Checked ${count} JavaScript files.\n`);
