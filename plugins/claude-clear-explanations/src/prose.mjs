const blank = text => text.replace(/[^\r\n]/g, ' ');

function maskQuotations(text) {
  const markers = [...text.matchAll(/["“”'‘’]/g)];
  const next = [];
  const nearest = new Map();
  const word = /[\p{L}\p{N}_]/u;
  for (let index = markers.length - 1; index >= 0; index--) {
    const marker = markers[index];
    const char = marker[0];
    const opening = char === '"' ? 'double' : char === '“' ? 'curly-double'
      : char === "'" && !word.test(text[marker.index - 1] ?? '') ? 'single'
      : char === '‘' ? 'curly-single' : null;
    if (opening) next[index] = nearest.get(opening);
    const closing = char === '"' ? 'double' : char === '”' ? 'curly-double'
      : char === "'" && !word.test(text[marker.index + 1] ?? '') ? 'single'
      : char === '’' && !word.test(text[marker.index + 1] ?? '') ? 'curly-single' : null;
    if (closing) nearest.set(closing, index);
  }
  const chunks = [];
  let cursor = 0;
  for (let index = 0; index < markers.length; index++) {
    const closing = next[index];
    if (closing === undefined) continue;
    const start = markers[index].index;
    const end = markers[closing].index + 1;
    chunks.push(text.slice(cursor, start), blank(text.slice(start, end)));
    cursor = end;
    index = closing;
  }
  chunks.push(text.slice(cursor));
  return chunks.join('');
}

function maskCodeSpans(text) {
  const markers = [...text.matchAll(/`+/g)];
  const next = [];
  const nearest = new Map();
  for (let index = markers.length - 1; index >= 0; index--) {
    const length = markers[index][0].length;
    next[index] = nearest.get(length);
    nearest.set(length, index);
  }
  const chunks = [];
  let cursor = 0;
  for (let index = 0; index < markers.length; index++) {
    const closing = next[index];
    if (closing === undefined) continue;
    const start = markers[index].index;
    const end = markers[closing].index + markers[closing][0].length;
    chunks.push(text.slice(cursor, start), blank(text.slice(start, end)));
    cursor = end;
    index = closing;
  }
  chunks.push(text.slice(cursor));
  return chunks.join('');
}

// Preserve offsets and line breaks so findings refer to the original text.
export function proseOnly(text) {
  let fence = null;
  const blocks = text.split(/(?<=\n)/).map(line => {
    const marker = /^ {0,3}(`{3,}|~{3,})(.*)/.exec(line);
    if (fence) {
      if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length && !marker[2].trim()) fence = null;
      return line.replace(/[^\r\n]/g, ' ');
    }
    if (marker && (marker[1][0] === '~' || !marker[2].includes('`'))) {
      fence = marker[1];
      return line.replace(/[^\r\n]/g, ' ');
    }
    if (/^(?: {4}|\t| {0,3}>)/.test(line)) return line.replace(/[^\r\n]/g, ' ');
    return line;
  }).join('');
  return blocks.split(/(\r?\n[ \t]*\r?\n)/).map(paragraph => {
    const code = maskCodeSpans(paragraph);
    return maskQuotations(code);
  }).join('');
}
