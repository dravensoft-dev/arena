/* The vocabulary: what an adopter writes on a component to decide how it looks, as families of
 * classes declared under frameworks/tailwind/vocabulary/. An option writes channels and nothing
 * else, and a channel is read by a manifest with today's value as its fallback, so no option is
 * in effect until somebody writes it. A family compiles to one @scope block per option, selecting
 * the parts that read its channel, so nearness comes from scope proximity rather than source
 * order; a box family registers its channels as not inherited, or a reached part would hand its
 * value down past the boundary the rule stops at. The box limit is inclusive: the boundary is usually
 * the component's own root, which an exclusive limit would drop, and Chromium matches a limit among
 * the root's descendants only. A markup family writes declarations on the element its class is on,
 * unlayered, in the order its file writes them. */

import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { readJson } from '../../utils/read-file.ts';
import { pascal } from '../../utils/case.ts';
import { captured } from '../../utils/captures.ts';
import { repoRoot } from '../arena/repo-root.ts';
import { classesManifest } from './component-css.ts';
import { LAYER_ORDER } from './component-sheets.ts';
import type { ArenaAnswer, ComponentManifest } from './manifest-shapes.ts';

export const VOCABULARY_DIR = 'frameworks/tailwind/vocabulary';
export const VOCABULARY_SHEETS = 'frameworks/tailwind/consume/vocabulary';
export const FAMILY_SUFFIX = '.family.json';
export const BOUNDARY = 'data-arena-boundary';
export const LIMIT = `[${BOUNDARY}] > *, :scope[${BOUNDARY}] > *`;
export const SURFACE = 'data-arena-surface';
export const FLOATING_LIMIT = `[${SURFACE}="floating"]`;
export const REACHES = ['context', 'box'] as const;

export type Reach = typeof REACHES[number];

export const TARGETS = ['component', 'markup', 'keyed'] as const;
export type Target = typeof TARGETS[number];

export type Family = {
  family: string;
  reach: Reach;
  target?: Target;
  restates?: string;
  description: string;
  default?: string;
  variants: Record<string, string>;
  axis?: string | string[];
  keyed?: string;
  properties?: string[];
  channels?: string[];
  binds?: string[];
};

export const axesOf = (family: Pick<Family, 'axis'>): string[] =>
  family.axis === undefined ? [] : Array.isArray(family.axis) ? family.axis : [family.axis];

const squash = (text: string) => text.replaceAll('_', ' ').replace(/\s+/g, '');

export function axisWrapped(fallback: string, written: string, axes: string[]): boolean {
  const f = squash(fallback);
  const w = squash(written);
  return f === w || axes.some((axis) => f === `var(${axis},${w})`);
}

export const targetOf = (family: Pick<Family, 'target'>): Target => family.target ?? 'component';

export const MARKUP_PROPERTY = /^\[(-{0,2}[a-z][a-z-]*):([^\]]+)\]$/;

export const ARBITRARY_PROPERTY = /^\[(--[a-z0-9-]+):([^\]]+)\]$/;

export function declarations(classes: string): [string, string][] {
  return classes.split(/\s+/).filter(Boolean).map((token) => {
    const match = ARBITRARY_PROPERTY.exec(token);
    if (!match) {
      throw new Error(`vocabulary: ${JSON.stringify(token)} is not an arbitrary property. An option `
        + 'writes channels and nothing else, as [--arena-fill-width:100%]');
    }
    return [captured(match), captured(match, 2).replaceAll('_', ' ')];
  });
}

export function markupDeclarations(classes: string): [string, string][] {
  return classes.split(/\s+/).filter(Boolean).map((token) => {
    const match = MARKUP_PROPERTY.exec(token);
    if (!match) {
      throw new Error(`vocabulary: ${JSON.stringify(token)} is not an arbitrary CSS property. A markup family `
        + 'writes the declarations of the element its class is on, as [display:flex]');
    }
    return [captured(match), captured(match, 2).replaceAll('_', ' ')];
  });
}

export function restatedDeclarations(rel: string, group: string, root = repoRoot): [string, string][] {
  const tokens = (readJson(join(root, rel)) as Record<string, Record<string, unknown>>)[group];
  if (!tokens) throw new Error(`vocabulary: ${rel} has no ${group} group to restate`);
  return Object.entries(tokens).filter(([key]) => !key.startsWith('$')).map(([key, token]) => {
    const value = (token as { $value?: unknown }).$value;
    if (value && typeof value === 'object' && 'value' in value && 'unit' in value)
      return [`--${group}-${key}`, `${(value as { value: number }).value}${(value as { unit: string }).unit}`];
    if (typeof value === 'number' || (typeof value === 'string' && !value.trim().startsWith('{')))
      return [`--${group}-${key}`, String(value)];
    throw new Error(`vocabulary: ${rel} ${group}.${key} is not a literal value, and a family restates values rather than aliases`);
  });
}

export function optionDeclarations(family: Family, option: string, root = repoRoot): [string, string][] {
  const written = family.variants[option] ?? '';
  if (family.restates) return restatedDeclarations(written, family.restates, root);
  return targetOf(family) === 'markup' ? markupDeclarations(written) : declarations(written);
}

export function familyFiles(root = repoRoot): string[] {
  const dir = join(root, VOCABULARY_DIR);
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => readdirSync(join(dir, entry.name))
      .filter((file) => file.endsWith(FAMILY_SUFFIX))
      .map((file) => `${VOCABULARY_DIR}/${entry.name}/${file}`))
    .sort();
}

export function readFamilies(root = repoRoot): Map<string, Family> {
  const out = new Map<string, Family>();
  for (const rel of familyFiles(root)) {
    const family = readJson(join(root, rel)) as Family;
    out.set(family.family, family);
  }
  return out;
}

export const sheetFamilies = (root = repoRoot): Family[] =>
  [...readFamilies(root).values()].filter((family) => targetOf(family) !== 'keyed');

export const channelPrefix = (family: string) => `--arena-${family}-`;

export const readsChannel = (classes: string, family: string) => classes.includes(`var(${channelPrefix(family)}`);

export function slotClassStrings(manifest: ComponentManifest): [string, string][] {
  const out: [string, string][] = Object.entries(manifest.slots ?? {});
  for (const values of Object.values(manifest.variants ?? {}))
    for (const slots of Object.values(values)) out.push(...Object.entries(slots ?? {}) as [string, string][]);
  for (const compound of manifest.compoundVariants ?? [])
    out.push(...Object.entries(compound.class ?? {}) as [string, string][]);
  return out;
}

const answerName = (answer: ArenaAnswer) => (typeof answer === 'string' ? answer : answer.family);

export function answeredFamilies(manifest: Pick<ComponentManifest, 'answers'>): string[] {
  return (manifest.answers ?? []).map(answerName);
}

export function answerOf(manifest: ComponentManifest, family: Family): { options: readonly string[]; default: string } | null {
  const answer = (manifest.answers ?? []).find((one) => answerName(one) === family.family);
  if (answer === undefined) return null;
  if (typeof answer === 'string') return { options: Object.keys(family.variants), default: family.default ?? '' };
  return { options: answer.options, default: answer.default };
}

export function channelReads(classes: string): { channel: string; fallback: string | null }[] {
  const reads: { channel: string; fallback: string | null }[] = [];
  for (const match of classes.matchAll(/var\(\s*(--arena-[a-z0-9-]+)\s*([,)])/g)) {
    const channel = captured(match);
    if (match[2] === ')') { reads.push({ channel, fallback: null }); continue; }
    let depth = 1;
    const from = match.index + match[0].length;
    let at = from;
    for (; at < classes.length && depth > 0; at += 1) {
      if (classes[at] === '(') depth += 1;
      else if (classes[at] === ')') depth -= 1;
    }
    reads.push({ channel, fallback: classes.slice(from, depth === 0 ? at - 1 : at).trim() });
  }
  return reads;
}

export function answeringParts(
  family: string | Pick<Family, 'family' | 'reach'>, manifests: Iterable<ComponentManifest>, option?: string,
): string[] {
  const name = typeof family === 'string' ? family : family.family;
  const context = typeof family !== 'string' && family.reach === 'context';
  const parts = new Set<string>();
  for (const manifest of manifests) {
    const answer = (manifest.answers ?? []).find((one) => answerName(one) === name);
    if (answer === undefined) continue;
    if (option !== undefined && typeof answer !== 'string' && !answer.options.includes(option)) continue;
    const named = classesManifest(manifest).parts ?? {};
    if (context) {
      const root = Object.keys(manifest.slots ?? {})[0];
      if (root !== undefined) parts.add(named[root] ?? root);
      continue;
    }
    for (const [slot, classes] of slotClassStrings(manifest))
      if (readsChannel(String(classes ?? ''), name)) parts.add(named[slot] ?? slot);
  }
  return [...parts].sort();
}

const byOption = ([a]: [string, string], [b]: [string, string]) => (a < b ? -1 : a > b ? 1 : 0);

export function compileFamily(family: Family, manifests: Iterable<ComponentManifest>, root = repoRoot): string {
  if (targetOf(family) === 'keyed')
    throw new Error(`vocabulary: ${family.family} is a keyed family, and a keyed family compiles to no sheet`);
  const all = [...manifests];
  const parts = answeringParts(family, all);
  if (targetOf(family) === 'markup') {
    if (parts.length) {
      throw new Error(`vocabulary: ${family.family} is a markup family and the parts ${parts.join(', ')} answer it; `
        + 'a markup family applies to the element its class is written on, so no manifest answers it');
    }
    const blocks = Object.keys(family.variants).map((option) => {
      const body = optionDeclarations(family, option, root).map(([name, value]) => `    ${name}: ${value};`).join('\n');
      return `@scope (.${option}) {\n  :scope {\n${body}\n  }\n}`;
    });
    return `${LAYER_ORDER}${blocks.join('\n')}\n`;
  }
  if (parts.length === 0) {
    throw new Error(`vocabulary: no manifest answers ${family.family} and reads its channels, so every `
      + 'option would compile to a rule that selects nothing');
  }
  const blocks: string[] = [];
  for (const [option, classes] of Object.entries(family.variants).sort(byOption)) {
    const own = answeringParts(family, all, option);
    if (own.length === 0) continue;
    const selector = own.map((part) => `&[data-arena-part="${part}"], [data-arena-part="${part}"]`).join(',\n    ');
    const head = family.reach === 'box' ? `@scope (.${option}) to (${LIMIT})` : `@scope (.${option}) to (${FLOATING_LIMIT})`;
    const body = declarations(classes).map(([name, value]) => `      ${name}: ${value};`).join('\n');
    blocks.push(`  ${head} {\n    ${selector} {\n${body}\n    }\n  }`);
  }
  if (family.reach === 'box')
    for (const axis of axesOf(family)) blocks.push(`  [${BOUNDARY}] > * {\n    ${axis}: initial;\n  }`);
  const channels = family.reach === 'box'
    ? [...new Set(Object.values(family.variants).flatMap((classes) => declarations(classes).map(([name]) => name)))].sort()
    : [];
  const registered = channels.map((name) => `@property ${name} {\n  syntax: '*';\n  inherits: false;\n}\n`).join('');
  return `${LAYER_ORDER}${registered}@layer utilities {\n${blocks.join('\n')}\n}\n`;
}

export const sheetName = (family: string) => `${pascal(family)}.generated.css`;

export const packageSheetName = (family: string) => `css/vocabulary/${family}.css`;
