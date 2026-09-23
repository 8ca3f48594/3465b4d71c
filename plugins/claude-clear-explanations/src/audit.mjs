import { mkdir, writeFile, readdir, readFile, lstat, rename, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { randomUUID } from 'node:crypto';

const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;

export function auditWriter(root) {
  const base = resolve(root);
  const owned = new Set();
  return async record => {
    if (!uuid.test(record.auditId)) throw new Error('invalid-audit-id');
    await mkdir(base,{recursive:true,mode:0o700});
    if ((await lstat(base)).isSymbolicLink()) throw new Error('invalid-audit-directory');
    const dir = join(base,record.auditId);
    if (!owned.has(record.auditId)) {
      await mkdir(dir,{mode:0o700});
      owned.add(record.auditId);
    }
    if ((await lstat(dir)).isSymbolicLink()) throw new Error('invalid-audit-directory');
    // Finalize only records created by this writer; readers see complete JSON.
    const temporary = join(dir,`${randomUUID()}.tmp`);
    try {
      await writeFile(temporary,JSON.stringify(record,null,2)+'\n',{encoding:'utf8',flag:'wx',mode:0o600});
      await rename(temporary,join(dir,'run.json'));
    } catch (error) {
      await rm(temporary,{force:true}).catch(() => {});
      throw error;
    }
  };
}

export async function acceptedHistory(root) {
  try {
    if ((await lstat(root)).isSymbolicLink()) return [];
    const entries = await readdir(root,{withFileTypes:true});
    const records = [];
    for (const entry of entries.filter(entry => entry.isDirectory() && uuid.test(entry.name))) {
      const path = join(root,entry.name,'run.json');
      try {
        const info = await lstat(path);
        if (!info.isFile() || info.isSymbolicLink() || info.size > 8_000_000) continue;
        const record = JSON.parse(await readFile(path,'utf8'));
        if (record.result?.status === 'accepted' && typeof record.result.answer === 'string' && Number.isFinite(Date.parse(record.startedAt))) records.push(record);
      } catch { /* Incomplete local records are excluded from style history. */ }
    }
    return records.sort((a,b) => Date.parse(b.startedAt)-Date.parse(a.startedAt)).slice(0,20).map(record=>record.result.answer);
  } catch(error) {
    if (error.code === 'ENOENT') return [];
    throw new Error('history-unavailable');
  }
}
