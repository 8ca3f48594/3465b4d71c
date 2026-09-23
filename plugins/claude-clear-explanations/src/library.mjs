import { readFile, realpath, stat } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { inspectStyle } from './style.mjs';
import { matchesTerm, pickSlices } from './route.mjs';

export const defaultLibraryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../guides');

export async function loadLibrary(root = defaultLibraryRoot) {
  try {
    const base = await realpath(root);
    const manifestText = await readFile(resolve(base, 'index.json'), 'utf8');
    const manifest = JSON.parse(manifestText);
    if (manifest.version !== 1 || !Array.isArray(manifest.general) || !manifest.general.length || !Array.isArray(manifest.guides)) throw new Error();
    const records = new Map();
    const hash = createHash('sha256').update(manifestText);
    const promptFindings = [];
    for (const entry of [...manifest.general, ...manifest.guides]) {
      if (!entry || !/^[a-z][a-z0-9-]*$/.test(entry.id) || records.has(entry.id) || typeof entry.path !== 'string' || isAbsolute(entry.path)) throw new Error();
      if (manifest.guides.includes(entry) && (!['topic','method'].includes(entry.kind) || typeof entry.description !== 'string' || !entry.description.trim())) throw new Error();
      if (entry.terms !== undefined && (!Array.isArray(entry.terms) || !entry.terms.length || entry.terms.some(term => typeof term !== 'string' || !term.trim()))) throw new Error();
      const path = await realpath(resolve(base, entry.path));
      const local = relative(base, path);
      if (!local || local === '..' || local.startsWith(`..${sep}`) || isAbsolute(local) || !(await stat(path)).isFile()) throw new Error();
      const text = await readFile(path, 'utf8');
      if (!text.trim() || text.includes('\uFFFD')) throw new Error();
      const slices = [];
      if (entry.slices !== undefined) {
        if (!Array.isArray(entry.slices) || !entry.slices.length) throw new Error();
        const sliceIds = new Set();
        for (const slice of entry.slices) {
          if (!slice || !/^[a-z][a-z0-9-]*$/.test(slice.id) || sliceIds.has(slice.id) || typeof slice.path !== 'string' || isAbsolute(slice.path)) throw new Error();
          if (!Array.isArray(slice.terms) || !slice.terms.length || slice.terms.some(term => typeof term !== 'string' || !term.trim())) throw new Error();
          sliceIds.add(slice.id);
          const slicePath = await realpath(resolve(base, slice.path));
          const sliceLocal = relative(base, slicePath);
          if (!sliceLocal || sliceLocal === '..' || sliceLocal.startsWith(`..${sep}`) || isAbsolute(sliceLocal) || !(await stat(slicePath)).isFile()) throw new Error();
          const sliceText = await readFile(slicePath, 'utf8');
          if (!sliceText.trim() || sliceText.includes('\uFFFD')) throw new Error();
          hash.update(slice.id).update('\0').update(sliceText);
          for (const finding of inspectStyle(sliceText, {mode:'prompt'})) promptFindings.push({id:slice.id,...finding});
          slices.push({id:slice.id, terms:slice.terms.map(term => term.trim()), text:sliceText});
        }
      }
      const terms = [...new Set([...(entry.terms ?? []), ...slices.flatMap(slice => slice.terms)])];
      records.set(entry.id, {id:entry.id,text,slices,terms,requireTerms:entry.kind === 'topic'});
      hash.update(entry.id).update('\0').update(text);
      for (const finding of inspectStyle(text, {mode:'prompt'})) promptFindings.push({id:entry.id,...finding});
      if (entry.description) for (const finding of inspectStyle(entry.description, {mode:'prompt'})) promptFindings.push({id:entry.id,...finding});
    }
    const packet = [];
    if (manifest.packet !== undefined) {
      if (!Array.isArray(manifest.packet) || !manifest.packet.length) throw new Error();
      for (const entry of manifest.packet) {
        if (!entry || !/^[a-z][a-z0-9-]*$/.test(entry.id) || records.has(entry.id) || typeof entry.path !== 'string' || isAbsolute(entry.path)) throw new Error();
        const path = await realpath(resolve(base, entry.path));
        const local = relative(base, path);
        if (!local || local === '..' || local.startsWith(`..${sep}`) || isAbsolute(local) || !(await stat(path)).isFile()) throw new Error();
        const text = await readFile(path, 'utf8');
        if (!text.trim() || text.includes('\uFFFD')) throw new Error();
        records.set(entry.id, {id:entry.id,text,slices:[]});
        hash.update(entry.id).update('\0').update(text);
        for (const finding of inspectStyle(text, {mode:'prompt'})) promptFindings.push({id:entry.id,...finding});
        packet.push({id:entry.id,text});
      }
    }
    return {
      version:manifest.version, hash:hash.digest('hex'), promptFindings,
      index:manifest.guides.map(entry => ({
        id:entry.id,
        kind:entry.kind,
        description:entry.description,
        terms:[...new Set([...(entry.terms ?? []), ...(entry.slices ?? []).flatMap(slice => slice.terms ?? [])])],
      })),
      general:manifest.general.map(({id}) => ({id:records.get(id).id,text:records.get(id).text})),
      packet,
      async load(ids, context) {
        if (!Array.isArray(ids) || new Set(ids).size !== ids.length || ids.some(id => !manifest.guides.some(entry => entry.id === id))) throw new Error('invalid-guide-selection');
        return ids.map(id => {
          const record = records.get(id);
          if (!context?.question || !record.requireTerms) return {id:record.id, text:record.text};
          if (record.slices.length) {
            const picked = pickSlices(record.slices, context.question, context.audience);
            if (!picked.length) return {id:record.id, text:'', sliceIds:[]};
            return {id:record.id, text:picked.map(slice => slice.text).join('\n\n'), sliceIds:picked.map(slice => slice.id)};
          }
          const source = `${context.question}\n${context.audience ?? ''}`;
          if (!record.terms.some(term => matchesTerm(source, term))) return {id:record.id, text:'', sliceIds:[]};
          return {id:record.id, text:record.text};
        });
      },
    };
  } catch {
    throw new Error('invalid-library');
  }
}
