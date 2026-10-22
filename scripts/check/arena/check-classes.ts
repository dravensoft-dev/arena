/* The other half of the rule check-exports holds: anything a package ships needs a home on the
 * consumer branch, and for a class a consumer writes that home is the stylesheet, page, style and
 * install references. A stylesheet lands in the tarball whole, so a class inside one reaches a
 * consumer with nothing announcing it, and a class nothing announces is one they replace with a
 * rule of their own: the two density classes shipped inside the spacing sheet and no reference
 * named either. The subject is derived from the sheets the assembly copies rather than listed
 * here. NOT_WRITTEN declares the classes that are Arena's own name for something rather than
 * something a consumer puts on their own markup. An option of a component family may instead be
 * named on frameworks/VOCABULARY.md, which lists every option of every family. */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';
import { CSS_CHAIN } from '../../lib/arena/package-assembly.ts';
import { REFERENCES, plainReferenceText } from '../../lib/arena/consumer-references.ts';
import { readFamilies, targetOf, sheetFamilies, VOCABULARY_SHEETS, sheetName, packageSheetName } from '../../lib/tailwind/vocabulary.ts';
import { THEME_SOURCES, tailwindThemeSheet } from '../../lib/tailwind/theme-sheet.ts';

export const HOMES = ['stylesheets.md', 'page.md', 'style.md', 'install.md'];

export const PAGE = `${REFERENCES}/stylesheets.md`;

export const VOCABULARY_PAGE = 'frameworks/VOCABULARY.md';

export function componentOptions(base = root) {
  return new Set([...readFamilies(base).values()].filter((family) => targetOf(family) === 'component')
    .flatMap((family) => Object.keys(family.variants)));
}

export const SHEETS = [
  ...CSS_CHAIN,
  ...sheetFamilies(root).map(({ family }) => ({ from: `${VOCABULARY_SHEETS}/${sheetName(family)}`, to: packageSheetName(family) }))
].map(({ from }) => from ?? '')
  .filter(Boolean);

export const UTILITIES = 'frameworks/tailwind/Utilities.generated.css';

export const node = {
  name: 'check:classes',
  reads: [...SHEETS, ...HOMES.map((name) => `${REFERENCES}/${name}`), 'frameworks/VOCABULARY.md', 'frameworks/tailwind/vocabulary/**/*.family.json', UTILITIES, ...THEME_SOURCES.theme, ...THEME_SOURCES.utilities],
  writes: [],
  feeds: [],
};

export const NOT_WRITTEN = new Map<string, string>([
  ['arena-light', 'the class Arena\'s own light palette takes, which the invariant sheet keys the '
    + 'picker inversion and the polarity off. A project writes .arena-<name> for a palette its own '
    + 'config declares, and both pages document that shape rather than this one instance of it'],
  ['arena-shimmer', 'an animation a manifest names on a skeleton, not a family option: it paints a loading '
    + 'placeholder, and an adopter does not write it on a component'],
  ['arena-pop', 'an animation a manifest names on a dialog panel, not a family option: it is an entrance, '
    + 'and an adopter does not write it on a component'],
  ['arena-menu', 'an animation a manifest names on a menu panel, not a family option: it is an entrance, '
    + 'and an adopter does not write it on a component'],
  ['arena-fade', 'an animation a manifest names on a tooltip bubble, not a family option: it is an entrance, '
    + 'and an adopter does not write it on a component'],
  ['arena-prog-indeterminate', 'a helper a manifest names on a progress track, not a family option: it draws the '
    + 'sweep of a pseudo-element no utility reaches, and an adopter does not write it on a component'],
  ['arena-prog-ring', 'an animation a manifest names on a progress ring, not a family option: it turns the ring '
    + 'while no percentage is known, and an adopter does not write it on a component'],
  ['arena-btn-spin', 'an animation a manifest names on a button\'s loading mark, not a family option: it turns '
    + 'the mark, and an adopter does not write it on a component'],
  ['arena-spinner', 'an animation a manifest names on a spinner, not a family option: it turns the circle, '
    + 'and an adopter does not write it on a component'],
]);

const UTILITY = /@utility\s+(arena-[a-z0-9_-]+)/g;

export function utilitiesIn(css: string) {
  return [...new Set([...css.replace(COMMENT, ' ').matchAll(UTILITY)].map((match) => match[1] ?? ''))].filter(Boolean);
}

export function themeUtilities(base = root) {
  const at = join(base, ...UTILITIES.split('/'));
  const sheet = existsSync(at) ? readFileSync(at, 'utf8') : '';
  let theme = '';
  try { theme = tailwindThemeSheet(base); } catch { theme = ''; }
  return new Map([...utilitiesIn(theme).map((name) => [name, 'the theme sheet'] as const),
    ...utilitiesIn(sheet).map((name) => [name, UTILITIES] as const)]);
}

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

export function homeProblems(base = root, names = shipped(base), exempt = NOT_WRITTEN, options = componentOptions(base)) {
  const problems = [];
  const vocabularyAt = join(base, ...VOCABULARY_PAGE.split('/'));
  const vocabulary = existsSync(vocabularyAt) ? readFileSync(vocabularyAt, 'utf8') : '';
  const text = plainReferenceText(base, HOMES);
  for (const name of names) {
    if (exempt.has(name) || text.includes(`.${name}`)) continue;
    if (options.has(name) && vocabulary.includes(`\`${name}\``)) continue;
    problems.push(
      `.${name} ships inside a stylesheet this package carries and none of ${HOMES.join(', ')} `
      + `under ${REFERENCES} names it. A class a consumer writes reaches them through those `
      + 'references and through nothing else, so one they do not name is a class a consumer '
      + 'replaces with a rule of their own and never learns they had. Name it there, or, for an '
      + 'option of a component family, on the vocabulary page; or declare it in NOT_WRITTEN with '
      + 'the reason it is not a consumer\'s to write.',
    );
  }
  return problems;
}

export function staleExemptProblems(names = shipped(), exempt = NOT_WRITTEN, utilities: Iterable<string> = themeUtilities().keys()) {
  const defined = new Set([...names, ...utilities]);
  return [...exempt]
    .filter(([name]) => !defined.has(name))
    .map(([name, reason]) => `NOT_WRITTEN declares .${name}, which no shipped sheet or theme utility defines any `
      + `more, so the declaration outlived what it was written for: ${reason}`);
}

export function collect(base = root) {
  const names = shipped(base);
  const zero = zeroClassProblems(names);
  if (zero.length > 0) return zero;
  return [...homeProblems(base, names), ...staleExemptProblems(names, NOT_WRITTEN, themeUtilities(base).keys())];
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
    + `home in the consumer references, with ${NOT_WRITTEN.size} declared not a consumer's to write`);
}

if (isMainModule(import.meta.url)) main();
