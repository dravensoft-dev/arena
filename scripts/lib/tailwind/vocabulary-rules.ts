/* A compiled family sheet as a set of rules, one per part a selector names, keyed by the @scope it sits
 * in and the body it writes: two sheets that carry the same set paint every part alike, whichever
 * selector lists they group the parts into. bundledImports inlines a list of package imports the way
 * a bundler does, every @import where it stands and none skipped as seen. Test helpers, kept here. */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const PAIR = /^:scope\[data-arena-part="([^"]+)"\], \[data-arena-part="\1"\]$/;

export function familyRules(css: string): Set<string> {
  const out = new Set<string>();
  let scope = '';
  for (const match of css.matchAll(/(@scope [^{]+)\{|([^{};]+)\{([^{}]*)\}|\}/g)) {
    if (match[1] !== undefined) { scope = match[1].trim(); continue; }
    if (match[2] === undefined) { scope = ''; continue; }
    const selectors = match[2].trim().split(/,\s*/);
    const body = (match[3] ?? '').split(';').map((one) => one.trim()).filter(Boolean).join('; ');
    const grouped: string[] = [];
    for (let at = 0; at < selectors.length; at += 1) {
      const pair = `${selectors[at]}, ${selectors[at + 1] ?? ''}`;
      if (PAIR.test(pair)) { grouped.push(pair); at += 1; } else grouped.push(selectors[at] ?? '');
    }
    for (const selector of grouped) out.add(`${scope} | ${selector} | ${body}`);
  }
  return out;
}

export function bundledImports(lines: string[], root: string, packageName: string): string {
  const inline = (file: string): string => readFileSync(file, 'utf8')
    .replace(/@import\s+'(\.[^']+)';/g, (_all, rel: string) => inline(join(dirname(file), rel)));
  return lines.map((line) => inline(join(root, (/^@import '([^']+)';$/.exec(line)?.[1] ?? '').replace(`${packageName}/`, '')))).join('\n');
}
