/* The /llms.txt an agent reads before it fetches anything, and one full corpus per framework
 * beside it. The specification fixes the order: an H1, a blockquote summary, heading-free
 * content, then H2 lists of links, with an Optional section carrying what may be skipped when
 * context is short. That maps onto the route this repository already has, so the file is derived
 * from the route rather than written a second time. There is deliberately no single llms-full:
 * one file would be most of a megabyte and would hand an agent BOTH framework idioms of every
 * component, which is the drift the consumer-branch work was written to end. The router says to
 * read your own layer and no other, and a corpus that ignores it undoes that in one fetch.
 * Deriving lifts a sentence out of a document: a full stop inside a code span, a link or an
 * emphasis does not end one, and a marker whose partner stayed behind is not published. */

import { existsSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { walkFiles } from '../../utils/walk-files.ts';
import { relPosix } from '../../utils/posix-path.ts';
import { repoRoot as root } from './repo-root.ts';
import { DOMAIN, LAYERS } from './site-pages.ts';

export const LLMS_INDEX = 'llms.txt';
export const PROMPT_SUFFIX = '.prompt.md';
export const ROUTER = 'skills/design/SKILL.md';
export const INDEX = 'INDEX.md';
export const REFERENCE_DIR = 'skills/design/references';
export const REFERENCE_LINK = /\.\/references\/([A-Za-z0-9-]+\.md)/g;
export const HEADLINE = /^#\s+(.+)$/m;
export const OPENING = /^#\s+.+\n+([\s\S]*?)(?:\n\n|$)/;
export const WHEN = /Read this /;
export const PARAGRAPH = /\n\s*\n/;
export const EMPHASIS = /^(\*\*|\*)/;
export const INLINE_LINK = /\[([^\]]*)\]\((?:[^()]|\([^()]*\))*\)/g;
export const LAYER_INDEX = `frameworks/${INDEX}`;
export const BUILD_INTERMEDIATE = 'build/package';

export const ASSEMBLED = 'dist/';
export const FRONTMATTER = /^---\n([\s\S]*?)\n---/;
export const DESCRIPTION = /^description:\s*(.+)$/m;

export const layerFile = (layer: string) => `llms-${layer}.txt`;

export function docUrl(rel: string) {
  return `https://${DOMAIN}/${rel.split('/').map(encodeURIComponent).join('/')}`;
}

export const QUOTED = /^(["'])([\s\S]*)\1$/;

export function unquote(value: string) {
  return QUOTED.exec(value)?.[2] ?? value;
}

export function summary(base = root) {
  const text = readFileSync(join(base, ROUTER), 'utf8');
  const front = FRONTMATTER.exec(text)?.[1] ?? '';
  return unquote(DESCRIPTION.exec(front)?.[1]?.trim() ?? '');
}

export function under(layer: string, base: string, keep: (rel: string) => boolean) {
  const dir = join(base, 'frameworks', layer);
  if (!existsSync(dir)) return [];
  return walkFiles(dir)
    .map((path) => relPosix(base, path))
    .filter((rel) => !rel.includes(BUILD_INTERMEDIATE) && !rel.includes(ASSEMBLED))
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

export function references(base = root) {
  const linked = readFileSync(join(base, ROUTER), 'utf8').matchAll(REFERENCE_LINK);
  return [...new Set([...linked].map((hit) => `${REFERENCE_DIR}/${hit[1]}`))]
    .filter((rel) => existsSync(join(base, rel)));
}

export function headline(rel: string, base = root) {
  return HEADLINE.exec(readFileSync(join(base, rel), 'utf8'))?.[1]?.trim() ?? nameOf(rel);
}

export function paragraphs(text: string) {
  return text.split(PARAGRAPH).map((part) => part.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

export function sentenceEnd(flat: string, from = 0) {
  let code = false;
  let bracket = 0;
  let target = 0;
  const emphasis: string[] = [];
  for (let i = 0; i < flat.length; i += 1) {
    if (flat[i] === '`') { code = !code; continue; }
    if (code) continue;
    if (target > 0) {
      if (flat[i] === '(') target += 1;
      else if (flat[i] === ')') target -= 1;
      continue;
    }
    if (flat[i] === '[') { bracket += 1; continue; }
    if (flat[i] === ']') {
      if (bracket > 0) bracket -= 1;
      if (flat[i + 1] === '(') { target = 1; i += 1; }
      continue;
    }
    const marker = EMPHASIS.exec(flat.slice(i))?.[1];
    if (marker) {
      if (emphasis.at(-1) === marker) emphasis.pop();
      else emphasis.push(marker);
      i += marker.length - 1;
      continue;
    }
    if (flat[i] !== '.' || (i + 1 < flat.length && !/\s/.test(flat[i + 1] ?? ''))) continue;
    if (i >= from && bracket === 0 && emphasis.length === 0) return i;
  }
  return -1;
}

export function balance(text: string) {
  const marks: { at: number; len: number; paired: boolean }[] = [];
  const open: number[] = [];
  let code = false;
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === '`') { code = !code; continue; }
    if (code) continue;
    const marker = EMPHASIS.exec(text.slice(i))?.[1];
    if (!marker) continue;
    const last = open.at(-1);
    if (last !== undefined && marks[last]?.len === marker.length) {
      open.pop();
      marks[last]!.paired = true;
      marks.push({ at: i, len: marker.length, paired: true });
    } else {
      open.push(marks.length);
      marks.push({ at: i, len: marker.length, paired: false });
    }
    i += marker.length - 1;
  }
  const drop = new Set<number>();
  for (const mark of marks) {
    if (mark.paired) continue;
    for (let k = 0; k < mark.len; k += 1) drop.add(mark.at + k);
  }
  let kept = '';
  for (let i = 0; i < text.length; i += 1) if (!drop.has(i)) kept += text[i];
  return kept;
}

export function lift(fragment: string) {
  return balance(fragment.replace(INLINE_LINK, '$1')).replace(/\s+/g, ' ').trim();
}

export function opening(rel: string, base = root) {
  const paragraph = OPENING.exec(readFileSync(join(base, rel), 'utf8'))?.[1] ?? '';
  const flat = paragraph.replace(/\s+/g, ' ').trim();
  const stop = sentenceEnd(flat);
  return lift(stop < 0 ? flat : flat.slice(0, stop + 1));
}

export function when(rel: string, base = root) {
  for (const flat of paragraphs(readFileSync(join(base, rel), 'utf8'))) {
    const start = flat.search(WHEN);
    if (start < 0) continue;
    const stop = sentenceEnd(flat, start);
    return lift(stop < 0 ? flat.slice(start) : flat.slice(start, stop + 1));
  }
  return '';
}

export function blurb(rel: string, base = root) {
  return [opening(rel, base), when(rel, base)].filter(Boolean).join(' ');
}

export function servedDocs(base = root) {
  return [ROUTER, ...references(base), LAYER_INDEX, ...LAYERS.flatMap((layer) => layerDocs(layer, base))]
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
    ...references(base).map((rel) =>
      `- [${headline(rel, base)}](${docUrl(rel)}): ${blurb(rel, base)}`),
    `- [Every component in one read](${docUrl(LAYER_INDEX)}): which components exist and which layers ship them.`,
    '',
  ];

  for (const layer of LAYERS) {
    const title = layer.charAt(0).toUpperCase() + layer.slice(1);
    lines.push(`## ${title}`, '');
    lines.push(`- [Layer index](${docUrl(`frameworks/${layer}/${INDEX}`)}): every component under this framework's own names.`);
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
  for (const rel of [ROUTER, ...references(base), LAYER_INDEX, ...layerDocs(layer, base)]) {
    parts.push('', `<!-- ${rel} -->`, '', readFileSync(join(base, rel), 'utf8').trim(), '');
  }
  return `${parts.join('\n')}\n`;
}
