/* Reads a Markdown link the way a renderer does, which is not inside code. A code span or a fenced
 * block holding a regular expression or a snippet can carry `](` without being a link, and a
 * scanner that matched it reported, or rewrote, a path the author never wrote. maskCode blanks
 * every character of code and keeps the length and the newlines, so an index in the masked text
 * is an index in the original; the two functions below match on the masked text and answer with
 * the original. It imports nothing and ships whole with the server, like posix.ts, so the
 * packaging jobs and the checks may read it. */

const FENCE = /^\s{0,3}(?:`{3,}|~{3,})/;
const SPAN = /`[^`\n]+`/g;

const blank = (text: string) => text.replace(/[^\n]/g, ' ');

export function maskCode(text: string) {
  let fenced = false;
  const lines = text.split('\n').map((line) => {
    if (FENCE.test(line)) {
      fenced = !fenced;
      return blank(line);
    }
    return fenced ? blank(line) : line.replace(SPAN, blank);
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
