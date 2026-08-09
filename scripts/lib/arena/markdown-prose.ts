/* Splits Markdown into its prose runs, one per line, so a gate reading
 * punctuation never judges the code a document quotes, and into the fenced
 * lines that are the other half of the same split, so a gate reading what a
 * reader COPIES never judges prose. Both skips are lexed rather than matched: a
 * fence closes only on a run of its own character at least as long as the one
 * that opened it, and a code span only on a backtick run of exactly its own
 * length, which may be lines below. A code span is prose's neighbour and not a
 * fence, which is what lets a document name a thing it refuses without offering
 * it. Kept dependency-free so it runs under plain node. */

const OPENS_FENCE = /^ {0,3}(`{3,}|~{3,})/;
const CLOSES_FENCE = /^ {0,3}(`+|~+)[ \t]*$/;

function runLength(source: string, at: number, character: string) {
  let length = 0;
  while (source[at + length] === character) length += 1;
  return length;
}

function lineEnd(source: string, at: number) {
  const found = source.indexOf('\n', at);
  return found === -1 ? source.length : found;
}

function blankFollows(source: string, newlineAt: number) {
  return /^[ \t]*(\n|$)/.test(source.slice(newlineAt + 1));
}

function spanEnd(source: string, at: number, ticks: number) {
  for (let i = at + ticks; i < source.length; i += 1) {
    if (source[i] === '\n') {
      if (blankFollows(source, i)) return -1;
      continue;
    }
    if (source[i] !== '`') continue;
    const run = runLength(source, i, '`');
    if (run === ticks) return i + run;
    i += run - 1;
  }
  return -1;
}

export function fencedLines(source: string) {
  const lines: { line: number; text: string }[] = [];
  let fence = null;
  let line = 1;

  for (const raw of source.split('\n')) {
    const opening = OPENS_FENCE.exec(raw);
    const closing = CLOSES_FENCE.exec(raw);
    const run = closing?.[1] ?? '';

    if (fence && closing && run[0] === fence[0] && run.length >= fence.length) fence = null;
    else if (fence) lines.push({ line, text: raw });
    else if (opening) fence = opening[1];

    line += 1;
  }

  return lines;
}

export function proseSegments(source: string) {
  const segments: { line: number; column: number; text: string }[] = [];
  let line = 1;
  let column = 1;
  let index = 0;
  let text = '';
  let startLine = 1;
  let startColumn = 1;
  let fence = null;

  const flush = () => {
    if (text.trim() !== '') segments.push({ line: startLine, column: startColumn, text });
    text = '';
  };

  const advanceTo = (target: number) => {
    for (let k = index; k < target; k += 1) {
      if (source[k] === '\n') { line += 1; column = 1; } else column += 1;
    }
    index = target;
  };

  while (index < source.length) {
    if (column === 1) {
      const end = lineEnd(source, index);
      const raw = source.slice(index, end);
      const opening = OPENS_FENCE.exec(raw);
      const closing = CLOSES_FENCE.exec(raw);

      const run = closing?.[1] ?? '';
    if (fence && closing && run[0] === fence[0] && run.length >= fence.length) {
        flush();
        fence = null;
        advanceTo(Math.min(end + 1, source.length));
        continue;
      }
      if (fence) {
        flush();
        advanceTo(Math.min(end + 1, source.length));
        continue;
      }
      if (opening) {
        flush();
        fence = opening[1];
        advanceTo(Math.min(end + 1, source.length));
        continue;
      }
    }

    const character = source[index];

    if (character === '\n') {
      flush();
      advanceTo(index + 1);
      continue;
    }

    if (character === '`') {
      const ticks = runLength(source, index, '`');
      const end = spanEnd(source, index, ticks);
      if (end !== -1) {
        flush();
        advanceTo(end);
        continue;
      }
    }

    if (text === '') { startLine = line; startColumn = column; }
    text += character;
    advanceTo(index + 1);
  }

  flush();
  return segments;
}
