/* The /llms.txt an agent reads before it fetches anything, and one full corpus per framework
 * beside it. The specification fixes the order: an H1, a blockquote summary, heading-free
 * content, then H2 lists of links, with an Optional section carrying what may be skipped when
 * context is short. That maps onto the route this repository already has, so the file is derived
 * from the route rather than written a second time. There is deliberately no single llms-full:
 * one file would be most of a megabyte and would hand an agent BOTH framework idioms of every
 * component, which is the drift the consumer-branch work was written to end. The router says to
 * read your own layer and no other, and a corpus that ignores it undoes that in one fetch. */

import { existsSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { walkFiles } from '../../utils/walk-files.ts';
import { relPosix } from '../../utils/posix-path.ts';
import { repoRoot as root } from './repo-root.ts';
import { DOMAIN, LAYERS } from './site-pages.ts';

export const LLMS_INDEX = 'llms.txt';
export const PROMPT_SUFFIX = '.prompt.md';
export const ROUTER = 'SKILL.md';
export const INDEX = 'INDEX.md';
export const LAYER_INDEX = `frameworks/${INDEX}`;
export const BUILD_INTERMEDIATE = 'build/package';
export const FRONTMATTER = /^---\n([\s\S]*?)\n---/;
export const DESCRIPTION = /^description:\s*(.+)$/m;

export const layerFile = (layer: string) => `llms-${layer}.txt`;

export function docUrl(rel: string) {
  return `https://${DOMAIN}/${rel.split('/').map(encodeURIComponent).join('/')}`;
}

export function summary(base = root) {
  const text = readFileSync(join(base, ROUTER), 'utf8');
  const front = FRONTMATTER.exec(text)?.[1] ?? '';
  return DESCRIPTION.exec(front)?.[1]?.trim() ?? '';
}

export function under(layer: string, base: string, keep: (rel: string) => boolean) {
  const dir = join(base, 'frameworks', layer);
  if (!existsSync(dir)) return [];
  return walkFiles(dir)
    .map((path) => relPosix(base, path))
    .filter((rel) => !rel.includes(BUILD_INTERMEDIATE))
    .filter(keep)
    .sort();
}

export function categoryIndexes(layer: string, base = root) {
  return under(layer, base, (rel) => rel.endsWith(`/${INDEX}`) && rel.includes('/components/'));
}

export function prompts(layer: string, base = root) {
  return under(layer, base, (rel) => rel.endsWith(PROMPT_SUFFIX));
}

export function layerDocs(layer: string, base = root) {
  return [
    `frameworks/${layer}/${INDEX}`,
    `frameworks/${layer}/PACKAGE.md`,
    ...categoryIndexes(layer, base),
    ...prompts(layer, base),
  ].filter((rel) => existsSync(join(base, rel)));
}

export function servedDocs(base = root) {
  return [ROUTER, LAYER_INDEX, ...LAYERS.flatMap((layer) => layerDocs(layer, base))]
    .filter((rel) => existsSync(join(base, rel)));
}

export const nameOf = (rel: string) => basename(rel).replace(PROMPT_SUFFIX, '').replace(/\.md$/, '');

export const categoryOf = (rel: string) => rel.split('/').at(-2) ?? '';

export function index(base = root) {
  const lines = [
    '# Arena by Dravensoft',
    '',
    `> ${summary(base)}`,
    '',
    'Arena carries the design language and not the skin: a consuming project declares its own',
    'palettes and fonts in `arena.config.json`, and the `arena-to-prod` command each package ships',
    'turns that into the one stylesheet a package cannot carry.',
    '',
    '**Read your own framework\'s documents and not the other\'s.** Every component ships under both',
    'names and the two documents are not interchangeable, so the per-layer corpora below are',
    'separate on purpose and there is no combined one.',
    '',
    '## Start here',
    '',
    `- [The router](${docUrl(ROUTER)}): the rules of the language. Every other document is reached from here.`,
    `- [Every component in one read](${docUrl(LAYER_INDEX)}): which components exist and which layers ship them.`,
    '',
  ];

  for (const layer of LAYERS) {
    const title = layer.charAt(0).toUpperCase() + layer.slice(1);
    lines.push(`## ${title}`, '');
    lines.push(`- [Layer index](${docUrl(`frameworks/${layer}/${ROUTER}`)}): every component under this framework's own names.`);
    lines.push(`- [Install and configure](${docUrl(`frameworks/${layer}/PACKAGE.md`)}): the package, \`arena.config.json\`, and what the CLI writes.`);
    lines.push(`- [Everything above and every component document, in one file](https://${DOMAIN}/${layerFile(layer)}): the whole ${title} corpus, and nothing from the other layer.`);
    for (const rel of categoryIndexes(layer, base)) {
      lines.push(`- [${categoryOf(rel)}](${docUrl(rel)}): the ${categoryOf(rel)} components under ${title}.`);
    }
    lines.push('');
  }

  lines.push('## Optional', '');
  lines.push('One document per component, which is what a builder reaches for after the index above');
  lines.push('has told them which component they want. Fetch the one you need rather than all of them.');
  lines.push('');
  for (const layer of LAYERS) {
    for (const rel of prompts(layer, base)) {
      lines.push(`- [${nameOf(rel)}, ${layer}](${docUrl(rel)}): how to use it, with its Do and its Don't.`);
    }
  }
  lines.push('');
  return lines.join('\n');
}

export function corpus(layer: string, base = root) {
  const title = layer.charAt(0).toUpperCase() + layer.slice(1);
  const parts = [
    `# Arena by Dravensoft, the ${title} corpus`,
    '',
    `> ${summary(base)}`,
    '',
    `Every document Arena hands a builder working in ${title}, concatenated in the order the`,
    'router reads them. Nothing from the other framework layer is here, because a component ships',
    'under both names and the two documents are not interchangeable.',
    '',
  ];
  for (const rel of [ROUTER, LAYER_INDEX, ...layerDocs(layer, base)]) {
    parts.push('', `<!-- ${rel} -->`, '', readFileSync(join(base, rel), 'utf8').trim(), '');
  }
  return `${parts.join('\n')}\n`;
}
