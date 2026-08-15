/* Whether every element a component draws with a slot class also says which part it is. The hook
 * is what a style plugin selects, so a slot that reaches the DOM without one is a decision no
 * appearance outside this repository can touch. It reads both layers as text rather than
 * rendering, the way check-appearance.ts does, and it reads the covering manifest's sources so a
 * family drawn from one manifest is measured whole. One blind spot, declared rather than
 * discovered: a class string assembled inside a helper names its slot in the helper and not on
 * the element, so a site reading one asks for nothing here. */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { readJson } from '../../utils/read-file.ts';
import { walkFiles } from '../../utils/walk-files.ts';
import { relPosix } from '../../utils/posix-path.ts';
import { kebab } from '../../utils/case.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { classesManifest } from '../../lib/tailwind/component-css.ts';
import { categoryOf, coveredContracts, everyComponent, hasOwnManifest } from '../../lib/tailwind/manifest-surfaces.ts';

export const node = {
  name: 'check:parts',
  reads: [
    'frameworks/Components.json',
    'frameworks/react/components/**', 'frameworks/angular/components/**',
    'frameworks/tailwind/components/**',
  ],
  writes: [],
  feeds: [],
};

export const ATTRIBUTE = 'data-arena-part';

export const LAYERS = { react: '.tsx', angular: '.ts' } as const;

export type Layer = keyof typeof LAYERS;

const SKIPPED_DIRECTORIES = new Set(['dist', 'node_modules']);
const SKIPPED_INFIXES = ['.test.', '.generated.', '.demo.', '.card.'];

const CLASS_SITE = {
  react: /className(\s*)(=\{|:)/g,
  angular: /\[class\]\s*=\s*"/g,
} as const;

const SLOT_CALL = /\.([A-Za-z0-9_$]+)\(\)/g;

const HOOK = new RegExp(`${ATTRIBUTE}[^\\n]*?parts\\.([A-Za-z0-9_$]+)`, 'g');

function skipString(text: string, i: number, quote: string) {
  for (let j = i + 1; j < text.length; j++) {
    if (text[j] === '\\') { j += 1; continue; }
    if (text[j] === quote) return j;
  }
  return text.length;
}

function closingBrace(text: string, from: number) {
  let depth = 1;
  for (let i = from; i < text.length; i++) {
    const c = text[i] as string;
    if (c === "'" || c === '"' || c === '`') { i = skipString(text, i, c); continue; }
    if (c === '{') depth += 1;
    else if (c === '}') { depth -= 1; if (depth === 0) return i; }
  }
  return text.length;
}

function tagEnd(text: string, from: number) {
  let depth = 0;
  for (let i = from; i < text.length; i++) {
    const c = text[i] as string;
    if (c === "'" || c === '"' || c === '`') { i = skipString(text, i, c); continue; }
    if (c === '{') depth += 1;
    else if (c === '}') depth -= 1;
    else if (c === '>' && depth <= 0) return i;
  }
  return text.length;
}

function tagStart(text: string, before: number) {
  for (let i = before; i >= 0; i--) if (text[i] === '<') return i;
  return 0;
}

function objectAround(text: string, at: number) {
  let depth = 0;
  for (let i = at; i >= 0; i--) {
    const c = text[i] as string;
    if (c === '}') depth += 1;
    else if (c === '{') { if (depth === 0) return i; depth -= 1; }
  }
  return 0;
}

export function classSites(text: string, layer: Layer) {
  const sites: { expr: string; span: string }[] = [];
  for (const m of text.matchAll(CLASS_SITE[layer])) {
    if (layer === 'angular') {
      const open = m.index + m[0].length;
      const close = text.indexOf('"', open);
      if (close < 0) continue;
      const start = tagStart(text, m.index);
      sites.push({ expr: text.slice(open, close), span: text.slice(start, tagEnd(text, close) + 1) });
      continue;
    }
    if (m[2] === '={') {
      const open = m.index + m[0].length;
      const close = closingBrace(text, open);
      const start = tagStart(text, m.index);
      sites.push({ expr: text.slice(open, close), span: text.slice(start, tagEnd(text, close) + 1) });
      continue;
    }
    const open = objectAround(text, m.index);
    sites.push({ expr: text.slice(m.index, closingBrace(text, open + 1)), span: text.slice(open, closingBrace(text, open + 1) + 1) });
  }
  return sites;
}

export function slotsIn(expr: string, slots: string[]) {
  return [...new Set([...expr.matchAll(SLOT_CALL)].map((m) => m[1] as string))]
    .filter((slot) => slots.includes(slot));
}

export function hooksIn(span: string) {
  return [...span.matchAll(HOOK)].map((m) => m[1] as string);
}

function siteProblems(text: string, parts: Record<string, string>, name: string, layer: Layer) {
  const slots = Object.keys(parts);
  const problems = [];
  for (const site of classSites(text, layer)) {
    const named = slotsIn(site.expr, slots);
    if (named.length === 0) continue;
    if (named.some((slot) => hooksIn(site.span).includes(slot))) continue;
    problems.push(`${name}: the ${layer} layer draws ${named.map((s) => parts[s]).join(' or ')} on an `
      + `element carrying no ${ATTRIBUTE}. A slot is a public name and the hook is how a style plugin `
      + 'reaches it, so a slot that reaches the DOM without one is a decision nobody outside this '
      + 'repository can answer differently.');
  }
  return problems;
}

export function reactPartProblems(text: string, parts: Record<string, string>, name: string) {
  return siteProblems(text, parts, name, 'react');
}

export function angularPartProblems(text: string, parts: Record<string, string>, name: string) {
  return siteProblems(text, parts, name, 'angular');
}

export function MANIFESTS() {
  return everyComponent().filter((name) => hasOwnManifest(name));
}

export function partsOf(name: string) {
  const category = categoryOf(name);
  if (!category) return {};
  const path = join(repoRoot, 'frameworks/tailwind/components', category, kebab(name), `${name}.manifest.json`);
  return classesManifest(readJson(path)).parts ?? {};
}

export function layerSources(name: string, layer: Layer) {
  const found: string[] = [];
  for (const covered of coveredContracts(name)) {
    const category = categoryOf(covered);
    if (!category) continue;
    const dir = join(repoRoot, 'frameworks', layer, 'components', category, kebab(covered));
    if (!existsSync(dir)) continue;
    for (const file of walkFiles(dir, { skip: (n) => SKIPPED_DIRECTORIES.has(n) })) {
      if (!file.endsWith(LAYERS[layer])) continue;
      if (SKIPPED_INFIXES.some((i) => file.includes(i))) continue;
      found.push(file);
    }
  }
  return found;
}

export function partProblems(name: string) {
  const parts = partsOf(name);
  const problems = [];
  for (const layer of Object.keys(LAYERS) as Layer[]) {
    for (const file of layerSources(name, layer)) {
      for (const problem of siteProblems(readFileSync(file, 'utf8'), parts, name, layer))
        problems.push(`${relPosix(repoRoot, file)}: ${problem}`);
    }
  }
  return problems;
}

export function reachedParts(name: string) {
  const parts = partsOf(name);
  const reached = new Set<string>();
  for (const layer of Object.keys(LAYERS) as Layer[]) {
    for (const file of layerSources(name, layer)) {
      for (const slot of hooksIn(readFileSync(file, 'utf8')))
        if (parts[slot]) reached.add(parts[slot]);
    }
  }
  return [...reached].sort();
}

export function zeroPartProblems(count: number) {
  if (count > 0) return [];
  return ['walked 0 manifest(s) -- an empty result set is a failure, not a clean pass; check the '
    + 'discovery path'];
}

export function collect() {
  const names = MANIFESTS();
  const problems = [];
  const reached = new Set<string>();
  let declared = 0;
  for (const name of names) {
    problems.push(...partProblems(name));
    declared += Object.keys(partsOf(name)).length;
    for (const part of reachedParts(name)) reached.add(part);
  }
  return { problems, manifests: names.length, declared, reached: reached.size };
}

function main() {
  const { problems, manifests, declared, reached } = collect();
  const zero = zeroPartProblems(manifests);
  const all = [...zero, ...problems];
  if (all.length > 0) {
    console.error(`check-parts: ${all.length} problem(s)\n`);
    for (const one of all) console.error(`  ${one}`);
    process.exit(1);
  }
  console.log(`check-parts: every element drawing a slot across ${manifests} manifest(s) says which part `
    + `it is; ${reached} of ${declared} declared part(s) reach the DOM in one layer or both`);
}

if (isMainModule(import.meta.url)) main();
