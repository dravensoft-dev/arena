/* One writer kind per custom property across the compiled sheets, which is what makes the API's
 * channels and the vocabulary's disjoint by construction rather than by a precedence rule. A
 * family writes --arena-<family>-* or the contract group it restates, which the token sheet may
 * also write, a token sheet writes values and roles, a hue sheet writes the four hue channels and
 * nothing else, and a component sheet writes nothing but Tailwind's own --tw-* plumbing: a manifest
 * declaring anything else is a component choosing a channel. A component sheet reads a hue channel
 * only under a selector its hue sheet writes it on with a value other than initial, so the element
 * reading it is the element given it and an ancestor's hue is never the one read. A plugin.css reads
 * a channel and never writes one, nor the danger hue's strong fill role, since either write would bypass the
 * danger floor. A sweep finding no family, component, hue or plugin sheet fails. */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { walkFiles } from '../../utils/walk-files.ts';
import { relPosix } from '../../utils/posix-path.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { VOCABULARY_SHEETS, readFamilies, sheetName } from '../../lib/tailwind/vocabulary.ts';
import { HUE_CHANNELS, HUE_SHEETS } from '../../lib/tailwind/hue-sheet.ts';
import { parseBlocks, selectorPath } from '../../generate/core/arena-to-prod/css-blocks.ts';
import type { CssBlock } from '../../generate/core/arena-to-prod/css-blocks.ts';

export const COMPONENT_SHEETS = 'frameworks/tailwind/consume/components';
export const PLUGIN_STORE = 'plugin-style-store';
export const TOKEN_SHEETS = ['contracts/design-generated', 'contracts/design'];

export const node = {
  name: 'check:channels',
  reads: [`${VOCABULARY_SHEETS}/**`, `${COMPONENT_SHEETS}/**`, `${HUE_SHEETS}/**`, 'contracts/design-generated/**', `${PLUGIN_STORE}/*/plugin.css`, `${PLUGIN_STORE}/catalogue/*/plugin.css`, 'contracts/design/*.css'],
  writes: [],
  feeds: [],
};

type Kind = 'family' | 'component' | 'token' | 'hue' | 'plugin';
type Sheet = { kind: Kind; rel: string; css: string; restates?: string };

const DECLARATION = /(?:^|[{;\s])(--[A-Za-z0-9-]+)\s*:/g;

export function declared(css: string) {
  return [...new Set([...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(DECLARATION)].map((m) => m[1] ?? ''))];
}

const DANGER_STRONG_ROLE = '--hue-danger-fill-strong';
const HUE_READ = /var\(\s*(--arena-hue-[a-z-]+)/g;
const CONDITION = /:not\(\[[^\]]+\]\)|\[[^\]]+\]/g;
const sheetKey = (rel: string) => rel.replace(/^.*\/(?:components|hues)\//, '').replace(/\.(?:styles|hues)\.generated\.css$/, '');

function conditionsOf(selector: string) {
  const at = selector.indexOf(':where(');
  if (at === -1) return { base: selector.trim(), held: new Set<string>() };
  return { base: selector.slice(0, at).trim(), held: new Set(selector.slice(at).match(CONDITION) ?? []) };
}

type Write = { base: string; held: Set<string>; channels: Set<string> };

function hueWrites(css: string) {
  const writes: Write[] = [];
  const walk = (block: CssBlock) => {
    const channels = new Set(block.decls.filter((d) => d.name.startsWith('--arena-hue-') && d.value !== 'initial').map((d) => d.name));
    if (channels.size > 0) writes.push({ ...conditionsOf(block.selector), channels });
    for (const child of block.children) walk(child);
  };
  walk(parseBlocks(css));
  return writes;
}

function ownClass(block: CssBlock) {
  for (let at: CssBlock | null = block; at; at = at.parent) if (at.selector.startsWith('.')) return at.selector;
  return '';
}

function readProblems(sheet: Sheet, writes: Write[]) {
  const problems: string[] = [];
  const walk = (block: CssBlock) => {
    for (const decl of block.decls) {
      for (const [, channel] of decl.value.matchAll(HUE_READ)) {
        const here = conditionsOf(ownClass(block));
        const given = writes.some((one) => one.base === here.base && one.channels.has(channel as string)
          && [...one.held].every((condition) => here.held.has(condition)));
        if (!given)
          problems.push(`${sheet.rel} reads a hue channel its own element is not given, so it would read whatever an ancestor wrote: `
            + `${channel} under ${selectorPath(block)}, where the hue sheet writes it with no value other than initial`);
      }
    }
    for (const child of block.children) walk(child);
  };
  walk(parseBlocks(sheet.css));
  return problems;
}

export function channelProblems(sheets: Sheet[]) {
  const problems: string[] = [];
  for (const kind of ['family', 'component', 'hue', 'plugin'] as const)
    if (!sheets.some((one) => one.kind === kind)) problems.push(`found 0 ${kind} sheet(s), so no property was compared against them; an empty sweep is a failure rather than a clean pass`);
  const writers = new Map<string, Map<Kind, string>>();
  const restated = new Set<string>();
  for (const sheet of sheets) {
    for (const property of declared(sheet.css)) {
      const isHue = (HUE_CHANNELS as readonly string[]).includes(property);
      if (sheet.kind === 'component' && !property.startsWith('--tw-'))
        problems.push(`${sheet.rel} declares ${property}. A manifest reads a channel or a role and declares neither`);
      else if (sheet.kind !== 'hue' && sheet.kind !== 'component' && isHue)
        problems.push(`${sheet.rel} declares ${property}, which only a hue sheet writes`
          + (sheet.kind === 'plugin' ? '; a plugin reads a channel and meaning owns it, so a plugin write bypasses the danger floor' : ''));
      if (sheet.kind === 'plugin' && property === DANGER_STRONG_ROLE)
        problems.push(`${sheet.rel} declares ${property}, the role a destructive control's fill resolves to, which a plugin answers only through its role answers`);
      if (sheet.kind === 'plugin') continue;
      if (sheet.kind === 'hue' && !isHue)
        problems.push(`${sheet.rel} declares ${property}, and a hue sheet writes only ${HUE_CHANNELS.join(', ')}`);
      const restates = sheet.kind === 'family' && sheet.restates && property.startsWith(`--${sheet.restates}-`);
      if (restates) restated.add(property);
      if (sheet.kind === 'family' && !restates && !property.startsWith('--arena-'))
        problems.push(`${sheet.rel} declares ${property}, and a family writes only --arena-<family>-* channels`);
      const by = writers.get(property) ?? new Map<Kind, string>();
      if (!by.has(sheet.kind)) by.set(sheet.kind, sheet.rel);
      writers.set(property, by);
    }
  }
  const written = new Map<string, Write[]>();
  for (const sheet of sheets) if (sheet.kind === 'hue') written.set(sheetKey(sheet.rel), hueWrites(sheet.css));
  for (const sheet of sheets)
    if (sheet.kind === 'component') problems.push(...readProblems(sheet, written.get(sheetKey(sheet.rel)) ?? []));
  for (const [property, by] of writers) {
    if (by.size < 2) continue;
    if (restated.has(property) && by.size === 2 && by.has('family') && by.has('token')) continue;
    problems.push(`${property} has two writer kinds: ${[...by].map(([kind, rel]) => `${kind} (${rel})`).join(' and ')}. `
      + 'A property with two writers is decided by whichever the cascade reaches first');
  }
  return problems;
}

function sheetsUnder(root: string, rel: string, kind: Kind): Sheet[] {
  if (!existsSync(join(root, rel))) return [];
  return walkFiles(join(root, rel)).filter((path) => path.endsWith('.css'))
    .map((path) => ({ kind, rel: relPosix(root, path), css: readFileSync(path, 'utf8') }));
}

function pluginSheets(root: string): Sheet[] {
  const store = join(root, PLUGIN_STORE);
  if (!existsSync(store)) return [];
  const dirs = (base: string) => readdirSync(base, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => join(base, e.name));
  const entries = [...dirs(store), ...(existsSync(join(store, 'catalogue')) ? dirs(join(store, 'catalogue')) : [])];
  return entries.map((dir) => join(dir, 'plugin.css')).filter((path) => existsSync(path))
    .map((path) => ({ kind: 'plugin' as const, rel: relPosix(root, path), css: readFileSync(path, 'utf8') }));
}

export function collect(root = repoRoot) {
  const restates = new Map([...readFamilies(root).values()].filter((f) => f.restates)
    .map((f) => [`${VOCABULARY_SHEETS}/${sheetName(f.family)}`, f.restates as string]));
  const sheets = [
    ...sheetsUnder(root, VOCABULARY_SHEETS, 'family').map((one) => {
      const group = restates.get(one.rel);
      return group ? { ...one, restates: group } : one;
    }),
    ...sheetsUnder(root, COMPONENT_SHEETS, 'component'),
    ...sheetsUnder(root, HUE_SHEETS, 'hue'),
    ...pluginSheets(root),
    ...TOKEN_SHEETS.flatMap((rel) => sheetsUnder(root, rel, 'token')),
  ];
  return { sheets, problems: channelProblems(sheets) };
}

function main() {
  const { sheets, problems } = collect();
  if (problems.length) {
    console.error(`check-channels: ${problems.length} problem(s)\n`);
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }
  console.log(`check-channels: ${sheets.length} compiled sheet(s), every custom property written by one kind of writer`);
}

if (isMainModule(import.meta.url)) main();
