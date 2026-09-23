import { readFileSync } from 'node:fs';

function messageText(message) {
  const content = message?.content ?? message?.text ?? message?.prompt;
  if (typeof content === 'string') return content.trim();
  if (!Array.isArray(content)) return '';
  return content.map(part => {
    if (typeof part === 'string') return part;
    if (part && typeof part.text === 'string') return part.text;
    return '';
  }).join(' ').trim();
}

function tagged(text, name) {
  const match = String(text).match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, 'i'));
  return match?.[1]?.trim() ?? '';
}

function isPacketNoise(text) {
  return /hookSpecificOutput|Teaching packet for this question/i.test(text);
}

export function questionFromTranscriptText(text) {
  const source = typeof text === 'string' ? text.trim() : '';
  if (!source || isPacketNoise(source)) return '';
  const args = tagged(source, 'command-args');
  if (args) return args;
  const message = tagged(source, 'command-message');
  if (message) return message;
  return source
    .replace(/<command-name>[\s\S]*?<\/command-name>/gi, ' ')
    .replace(/<\/?(?:command-message|command-args|local-command)(?:\s[^>]*)?>/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function readTranscriptQuestion(transcriptPath) {
  if (typeof transcriptPath !== 'string' || !transcriptPath.trim()) return '';
  try {
    const lines = readFileSync(transcriptPath, 'utf8').split(/\r?\n/).filter(Boolean);
    for (let index = lines.length - 1; index >= 0; index -= 1) {
      let row;
      try {
        row = JSON.parse(lines[index]);
      } catch {
        continue;
      }
      if (!row || (row.type !== 'user' && row.type !== 'human')) continue;
      const question = questionFromTranscriptText(messageText(row.message ?? row));
      if (!question) continue;
      return question;
    }
  } catch {
    return '';
  }
  return '';
}
