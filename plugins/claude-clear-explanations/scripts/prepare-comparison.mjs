import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {prepareComparison} from '../src/comparison.mjs';
try {
  const [inputPath,outputPath,...extra]=process.argv.slice(2);
  if(!inputPath||!outputPath||extra.length)throw new Error();
  const path=resolve(inputPath);
  const input=JSON.parse(await readFile(path,'utf8'));
  if(!Array.isArray(input.cases))throw new Error();
  const cases=[];
  for(const item of input.cases){
    const general=JSON.parse(await readFile(resolve(dirname(path),item.generalRun),'utf8'));
    const guided=JSON.parse(await readFile(resolve(dirname(path),item.guidedRun),'utf8'));
    cases.push({id:item.id,original:item.original,general,guided});
  }
  const bundle=prepareComparison(cases);
  await mkdir(resolve(outputPath),{recursive:false,mode:0o700});
  await writeFile(join(outputPath,'blind-review.json'),JSON.stringify(bundle.review,null,2)+'\n',{flag:'wx',mode:0o600});
  await writeFile(join(outputPath,'private-key.json'),JSON.stringify(bundle.key,null,2)+'\n',{flag:'wx',mode:0o600});
  process.stdout.write('Comparison files created. Keep private-key.json out of the blinded review.\n');
}catch{process.stderr.write('Comparison not created: check cases, matched runs, and a new output directory.\n');process.exitCode=1;}
