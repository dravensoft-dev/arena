/* Writes frameworks/VOCABULARY.md, the one page listing every class an adopter writes on a
 * component or on markup: one row per family with its reach, options, public property and the components that
 * answer it, then one section per family carrying its description, which is the argument for it.
 * Components that answer the same options, or have the same default, are named once, so a family
 * most components answer in part stays inside the sentence length the register holds.
 * Every other consumer page points here rather than restating a family, and check:families holds
 * the page to a fresh emit. */

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { layerManifests } from '../../lib/tailwind/tailwind-compile.ts';
import { VOCABULARY_DIR, answerOf, axesOf, readFamilies, targetOf, type Family } from '../../lib/tailwind/vocabulary.ts';

export const VOCABULARY_TARGET = 'frameworks/VOCABULARY.md';

export const node = {
  name: 'generate:vocabulary',
  reads: [`${VOCABULARY_DIR}/**`, 'frameworks/tailwind/components/**/*.manifest.json'],
  writes: [VOCABULARY_TARGET],
  feeds: ['check:families', 'check:classes', 'check:community', 'check:generated', 'check:icons', 'check:arbitrary', 'build:mcp-package', 'build:site'],
};

const BANNER = `<!-- GENERATED from ${VOCABULARY_DIR}/ by bun run generate:vocabulary. Edit a family there, not this page. -->`;

const isMarkup = (family: Family) => targetOf(family) === 'markup';

const isKeyed = (family: Family) => targetOf(family) === 'keyed';

const options = (family: Family) => (isKeyed(family)
  ? `keyed by \`${family.keyed}\``
  : Object.keys(family.variants).sort().map((one) => `\`${one}\`${one === family.default ? ' (default)' : ''}`).join(', '));

const properties = (family: Family) => (isKeyed(family) ? family.properties ?? [] : axesOf(family))
  .map((one) => `\`${one}\``).join(', ');

export function renderVocabulary(root = repoRoot) {
  const families = [...readFamilies(root).values()].sort((a, b) => (a.family < b.family ? -1 : 1));
  const manifests = [...layerManifests(root).values()];
  const answering = (family: Family) => {
    const groups = new Map<string, string[]>();
    for (const one of manifests) {
      const answer = answerOf(one, family);
      if (!answer) continue;
      const subset = answer.options.length < Object.keys(family.variants).length;
      const notes = [...(subset ? [[...answer.options].sort().map((option) => `\`${option}\``).join(', ')] : []),
        ...(answer.default !== family.default ? [`default \`${answer.default}\``] : [])].join('; ');
      groups.set(notes, [...(groups.get(notes) ?? []), one.component]);
    }
    const joined = (names: string[]) => (names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0]!);
    return [...groups].flatMap(([notes, names]) => (notes === '' ? names.sort() : [`${joined(names.sort())} (${notes})`]))
      .sort();
  };
  const answeredBy = (family: Family) => {
    const groups = answering(family);
    return groups.some((one) => one.includes('('))
      ? ['- **Answered by:**', ...groups.map((one) => `  - ${one}.`)]
      : [`- **Answered by:** ${groups.join(', ')}.`];
  };
  const reachOf = (family: Family) => isKeyed(family)
    ? 'is read by the components that bind it, for the key each one is given'
    : isMarkup(family)
    ? (family.reach === 'box'
      ? 'goes on an element you wrote, and it decides that element alone'
      : 'goes on an element you wrote or on a component, and reaches every component inside until a nearer class answers it again')
    : family.reach === 'box'
    ? 'reaches the nearest component, and stops at the content that component projects'
    : 'reaches every component inside, until a nearer class answers it again';
  const context = families.filter((family) => isMarkup(family) && family.reach === 'context').map((family) => family.family);
  const lines = [
    BANNER, '', '# The vocabulary', '',
    '**Every vocabulary class you write is on this page.** A component family\'s class goes on the component, or on a container '
      + 'of yours whose components should all take it. The class nearest the component wins, whatever order '
      + 'your stylesheets load in. A markup family\'s box class goes on an element you wrote, never on a component. '
      + (context.length ? `A markup family's context class, ${context.join(' and ')}, goes on an element you wrote or on a component. ` : '')
      + 'A markup class beats a rule of yours of equal specificity, whatever order the sheets load in. '
      + 'Write yours more specific to override it. '
      + 'A class that is not on this page does nothing on an Arena component, and the audit reports it. '
      + 'A project compiling Tailwind through `css/tailwind-theme.css` also has utilities such as `arena-spinner` and `arena-fade`. '
      + 'Those utilities are Tailwind utilities that a manifest names, and not vocabulary classes.', '',
    '| Family | Reach | Options | Property | Answered by |', '|---|---|---|---|---|',
    ...families.map((family) => `| [\`${family.family}\`](#${family.family}) | ${family.reach} | ${options(family)} | `
      + `${properties(family)} | ${isMarkup(family) ? 'markup you write' : isKeyed(family) ? (family.binds ?? []).join(', ') : answering(family).join(', ')} |`),
  ];
  for (const family of families) {
    lines.push('', `## ${family.family}`, '', family.description, '',
      `- **Options:** ${options(family)}.`,
      `- **Reach:** ${family.reach}: it ${reachOf(family)}.`,
      ...(family.restates ? [`- **Values:** ${Object.entries(family.variants).map(([option, path]) => `\`${option}\` restates \`${path}\``).join(', ')}.`] : []),
      ...(isKeyed(family)
        ? [`- **Property:** ${properties(family)}, set on the component or a container of yours with a token or a derivation of tokens.`]
        : axesOf(family).length ? [`- **Property:** ${properties(family)}, set on a container of yours for a value no option names, with a token or a derivation of tokens.`] : []),
      ...(isMarkup(family)
        ? [`- **Written on:** an element you wrote${family.reach === 'box' ? ', never a component' : ', or a component'}.`]
        : isKeyed(family) ? [`- **Answered by:** ${(family.binds ?? []).join(', ')}.`] : answeredBy(family)));
  }
  return `${lines.join('\n')}\n`;
}

function main() {
  writeFileSync(join(repoRoot, VOCABULARY_TARGET), renderVocabulary());
  console.log(`generate-vocabulary: wrote ${VOCABULARY_TARGET}`);
}

if (isMainModule(import.meta.url)) main();
