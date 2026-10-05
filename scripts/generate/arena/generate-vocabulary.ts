/* Writes frameworks/VOCABULARY.md, the one page listing every class an adopter writes on a
 * component: one row per family with its reach, options, public property and the components that
 * answer it, then one section per family carrying its description, which is the argument for it.
 * Every other consumer page points here rather than restating a family, and check:families holds
 * the page to a fresh emit. */

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { layerManifests } from '../../lib/tailwind/tailwind-compile.ts';
import { VOCABULARY_DIR, readFamilies, targetOf, type Family } from '../../lib/tailwind/vocabulary.ts';

export const VOCABULARY_TARGET = 'frameworks/VOCABULARY.md';

export const node = {
  name: 'generate:vocabulary',
  reads: [`${VOCABULARY_DIR}/**`, 'frameworks/tailwind/components/**/*.manifest.json'],
  writes: [VOCABULARY_TARGET],
  feeds: ['check:families', 'check:community', 'check:generated', 'check:icons', 'check:arbitrary', 'build:mcp-package', 'build:site'],
};

const BANNER = `<!-- GENERATED from ${VOCABULARY_DIR}/ by bun run generate:vocabulary. Edit a family there, not this page. -->`;

const isMarkup = (family: Family) => targetOf(family) === 'markup';

const options = (family: Family) => Object.keys(family.variants).sort()
  .map((one) => `\`${one}\`${one === family.default ? ' (default)' : ''}`).join(', ');

export function renderVocabulary(root = repoRoot) {
  const families = [...readFamilies(root).values()].sort((a, b) => (a.family < b.family ? -1 : 1));
  const manifests = [...layerManifests(root).values()];
  const answering = (family: string) => manifests.filter((one) => (one.answers ?? []).includes(family))
    .map((one) => one.component).sort();
  const reachOf = (family: Family) => isMarkup(family)
    ? (family.reach === 'box'
      ? 'goes on an element you wrote, and it decides that element alone'
      : 'goes on an element you wrote or on a component, and reaches every component inside until a nearer class answers it again')
    : family.reach === 'box'
    ? 'reaches the nearest component, and stops at the content that component projects'
    : 'reaches every component inside, until a nearer class answers it again';
  const lines = [
    BANNER, '', '# The vocabulary', '',
    '**Every class you write is on this page.** A component family\'s class goes on the component, or on a container '
      + 'of yours whose components should all take it, and the class nearest the component wins, whatever order '
      + 'your stylesheets load in. A markup family\'s class goes on an element you wrote, never on a component. '
      + 'A class that is not on this page does nothing on an Arena component, and the audit reports it.', '',
    '| Family | Reach | Options | Property | Answered by |', '|---|---|---|---|---|',
    ...families.map((family) => `| [\`${family.family}\`](#${family.family}) | ${family.reach} | ${options(family)} | `
      + `${family.axis ? `\`${family.axis}\`` : ''} | ${isMarkup(family) ? 'markup you write' : answering(family.family).join(', ')} |`),
  ];
  for (const family of families) {
    lines.push('', `## ${family.family}`, '', family.description, '',
      `- **Options:** ${options(family)}.`,
      `- **Reach:** ${family.reach}: it ${reachOf(family)}.`,
      ...(family.restates ? [`- **Values:** ${Object.entries(family.variants).map(([option, path]) => `\`${option}\` restates \`${path}\``).join(', ')}.`] : []),
      ...(family.axis ? [`- **Property:** \`${family.axis}\`, set on a container of yours for a value no option names, with a token or a derivation of tokens.`] : []),
      isMarkup(family)
        ? `- **Written on:** an element you wrote${family.reach === 'box' ? ', never a component' : ', or a component'}.`
        : `- **Answered by:** ${answering(family.family).join(', ')}.`);
  }
  return `${lines.join('\n')}\n`;
}

function main() {
  writeFileSync(join(repoRoot, VOCABULARY_TARGET), renderVocabulary());
  console.log(`generate-vocabulary: wrote ${VOCABULARY_TARGET}`);
}

if (isMainModule(import.meta.url)) main();
