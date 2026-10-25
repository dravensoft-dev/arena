/* Reads a Markdown link the way a renderer does, which is not inside code. A code span or a fenced
 * block holding a regular expression or a snippet can carry `](` without being a link, and a
 * scanner that matched it reported, or rewrote, a path the author never wrote. maskCode blanks
 * every character of code and keeps the length and the newlines, so an index in the masked text
 * is an index in the original; the two functions below match on the masked text and answer with
 * the original. A backslash hides the character after it, so an escaped backtick opens no span,
 * and a run of N backticks closes on the next run of exactly N or is literal text. It imports
 * nothing and ships whole with the server, like posix.ts, so the packaging jobs and the checks
 * may read it. */

const OPEN = /^ {0,3}(`{3,}|~{3,})([^\r]*)\r?$/;
const CLOSE = /^ {0,3}(`{3,}|~{3,})[ \t]*\r?$/;

const blank = (text: string) => text.replace(/[^\n]/g, ' ');

function maskSpans(line: string) {
  let out = '';
  let at = 0;
  while (at < line.length) {
    const char = line[at];
    if (char === '\\') { out += line.slice(at, at + 2); at += 2; continue; }
    if (char !== '`') { out += char; at += 1; continue; }
    let end = at;
    while (line[end] === '`') end += 1;
    const run = end - at;
    let close = -1;
    for (let from = end; from < line.length;) {
      if (line[from] !== '`') { from += 1; continue; }
      let stop = from;
      while (line[stop] === '`') stop += 1;
      if (stop - from === run) { close = from; break; }
      from = stop;
    }
    if (close === -1) { out += line.slice(at, end); at = end; continue; }
    out += blank(line.slice(at, close + run));
    at = close + run;
  }
  return out;
}

export function maskCode(text: string) {
  let fence = '';
  const lines = text.split('\n').map((line) => {
    if (fence === '') {
      const open = OPEN.exec(line);
      if (open === null || (open[1]?.startsWith('`') && open[2]?.includes('`'))) {
        return maskSpans(line);
      }
      fence = open[1] ?? '';
      return blank(line);
    }
    const close = CLOSE.exec(line);
    if (close !== null && close[1]?.[0] === fence[0] && (close[1]?.length ?? 0) >= fence.length) fence = '';
    return blank(line);
  });
  return lines.join('\n');
}

export function matchOutsideCode(text: string, pattern: RegExp) {
  return [...maskCode(text).matchAll(pattern)];
}

export function replaceOutsideCode(
  text: string, pattern: RegExp, replacement: (whole: string, ...groups: string[]) => string,
) {
  let out = '';
  let last = 0;
  for (const match of matchOutsideCode(text, pattern)) {
    const at = match.index ?? 0;
    const whole = text.slice(at, at + match[0].length);
    out += text.slice(last, at) + replacement(whole, ...(match.slice(1) as string[]));
    last = at + whole.length;
  }
  return out + text.slice(last);
}
