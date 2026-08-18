/* The other half of the rule check-exports holds: anything a package ships needs a home on the
 * consumer branch, and for a class a consumer writes that home is the layer's PACKAGE.md. A
 * stylesheet lands in the tarball whole, so a class inside one reaches a consumer with nothing
 * announcing it, and a class nothing announces is one they replace with a rule of their own: the
 * two density classes shipped inside the spacing sheet and were named on neither npm page, and a
 * consumer reading that page had no way to learn either exists. The subject is derived from the
 * sheets the assembly copies rather than listed here. NOT_WRITTEN declares the classes that are
 * Arena's own name for something rather than something a consumer puts on their own markup. */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';
import { CSS_CHAIN, CONSUMER_SHEETS } from '../../lib/arena/package-assembly.ts';
import { LAYERS } from '../../lib/arena/site-pages.ts';

export const PAGE = 'PACKAGE.md';

export const SHEETS = [...CSS_CHAIN, ...CONSUMER_SHEETS]
  .map(({ from }) => from ?? '')
  .filter(Boolean);

export const node = {
  name: 'check:classes',
  reads: [...SHEETS, 'frameworks/*/PACKAGE.md'],
  writes: [],
  feeds: [],
};

export const NOT_WRITTEN = new Map<string, string>([
  ['arena-light', 'the class Arena\'s own light palette takes, which the invariant sheet keys the '
    + 'picker inversion and the polarity off. A project writes .arena-<name> for a palette its own '
    + 'config declares, and both pages document that shape rather than this one instance of it'],
]);

const COMMENT = /\/\*[\s\S]*?\*\//g;

const SELECTOR = /([^{}]*)\{/g;

const CLASS = /\.(arena-[a-z0-9_-]+)/g;

export function classesIn(css: string) {
  const names = new Set<string>();
  for (const block of css.replace(COMMENT, ' ').matchAll(SELECTOR))
    for (const one of (block[1] ?? '').matchAll(CLASS)) names.add(one[1] ?? '');
  names.delete('');
  return [...names];
}

export function shipped(base = root, sheets = SHEETS) {
  const names = new Set<string>();
  for (const rel of sheets) {
    const at = join(base, ...rel.split('/'));
    if (!existsSync(at)) continue;
    for (const name of classesIn(readFileSync(at, 'utf8'))) names.add(name);
  }
  return [...names].sort();
}

export function zeroClassProblems(names: string[]) {
  if (names.length > 0) return [];
  return [`${SHEETS.length} shipped sheet(s) define 0 class(es) between them, so this gate passes `
    + 'by reading nothing rather than by finding nothing wrong. A fresh clone builds first'];
}

export function homeProblems(base = root, names = shipped(base), exempt = NOT_WRITTEN) {
  const problems = [];
  for (const layer of LAYERS) {
    const page = join(base, 'frameworks', layer, PAGE);
    if (!existsSync(page)) continue;
    const text = readFileSync(page, 'utf8');
    for (const name of names) {
      if (exempt.has(name) || text.includes(`.${name}`)) continue;
      problems.push(
        `.${name} ships inside a stylesheet this package carries and frameworks/${layer}/${PAGE} `
        + 'never names it. A class a consumer writes reaches them through that page and through '
        + 'nothing else, so one it does not name is a class they replace with a rule of their own '
        + 'and never learn they had. Name it there, or declare it in NOT_WRITTEN with the reason '
        + 'it is not a consumer\'s to write.',
      );
    }
  }
  return problems;
}

export function staleExemptProblems(names = shipped(), exempt = NOT_WRITTEN) {
  return [...exempt]
    .filter(([name]) => !names.includes(name))
    .map(([name, reason]) => `NOT_WRITTEN declares .${name}, which no shipped sheet defines any `
      + `more, so the declaration outlived what it was written for: ${reason}`);
}

export function collect(base = root) {
  const names = shipped(base);
  const zero = zeroClassProblems(names);
  if (zero.length > 0) return zero;
  return [...homeProblems(base, names), ...staleExemptProblems(names)];
}

function main() {
  const problems = collect();
  if (problems.length > 0) {
    console.error(`check-classes: ${problems.length} problem(s)\n`);
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
  }
  const names = shipped();
  console.log(`check-classes: every one of ${names.length} class(es) the shipped sheets define has a `
    + `home on both npm pages, with ${NOT_WRITTEN.size} declared not a consumer's to write`);
}

if (isMainModule(import.meta.url)) main();
