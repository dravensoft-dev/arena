/* The vocabulary: what an adopter writes on a component to decide how it looks, as families of
 * classes declared under frameworks/tailwind/vocabulary/. An option writes channels and nothing
 * else, and a manifest reads a channel with today's value as its fallback, so no option is in
 * effect until somebody writes it. A family compiles to one @scope block per option over the parts
 * that read it, so nearness comes from scope proximity; a box family registers its channels as not
 * inherited, or a reached part would hand its value down past the boundary the rule stops at, and
 * its limit is inclusive, since the boundary is usually the component's own root. A
 * part with colour slots writes each channel wrapped by the slot that answers it, a drawn part
 * rebound by its wrapper, and a default block of zero specificity. A markup family writes the
 * declarations of the element its class is on, unlayered, in the order its file writes them. */

import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { readJson } from '../../utils/read-file.ts';
import { pascal } from '../../utils/case.ts';
import { captured } from '../../utils/captures.ts';
import { repoRoot } from '../arena/repo-root.ts';
import { declaredAxis } from '../core/user-scale.ts';
import { emittedLength } from '../../generate/core/arena-cli/serialize-token.ts';
import { componentValue, expectedName, slotChain, slotStem } from '../../generate/core/arena-cli/slots.ts';
import type { ColorSlot, SlotCatalogue } from '../../generate/core/arena-cli/slots.ts';
import { COLOR_SLOTS, readColorSlots } from '../core/color-slots.ts';
import type { DtcgNode } from '../core/dtcg-shapes.ts';
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

const squash = (text: string) => text.replaceAll('_', ' ').replace(/\s+/g, ' ').replace(/ ?([(),]) ?/g, '$1').trim();

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
  const groupAxis = declaredAxis(tokens as DtcgNode);
  return Object.entries(tokens).filter(([key]) => !key.startsWith('$')).map(([key, token]) => {
    const value = (token as { $value?: unknown }).$value;
    if (value && typeof value === 'object' && 'value' in value && 'unit' in value)
      return [`--${group}-${key}`, emittedLength(value as { value: number; unit: string },
        { axis: declaredAxis(token as DtcgNode) ?? groupAxis })];
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

export type ChannelRead = { channel: string; fallback: string | null; nested?: boolean };

export function channelReads(classes: string, nesting = false): ChannelRead[] {
  const reads: ChannelRead[] = [];
  let inside = 0;
  for (const match of classes.matchAll(/var\(\s*(--arena-[a-z0-9-]+)\s*([,)])/g)) {
    const channel = captured(match);
    const nested = nesting ? { nested: match.index < inside } : {};
    if (match[2] === ')') { reads.push({ channel, fallback: null, ...nested }); continue; }
    let depth = 1;
    const from = match.index + match[0].length;
    let at = from;
    for (; at < classes.length && depth > 0; at += 1) {
      if (classes[at] === '(') depth += 1;
      else if (classes[at] === ')') depth -= 1;
    }
    inside = Math.max(inside, at);
    reads.push({ channel, fallback: classes.slice(from, depth === 0 ? at - 1 : at).trim(), ...nested });
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

const FADE = '--arena-emphasis-fade-disabled';

type Owner = { manifest: ComponentManifest; slot: string; part: string; default: string; options: readonly string[] };

function ownersOf(family: Family, manifests: ComponentManifest[]): Owner[] {
  const out: Owner[] = [];
  for (const manifest of manifests) {
    const answer = answerOf(manifest, family);
    if (answer === null) continue;
    for (const [slot, part] of Object.entries(classesManifest(manifest).parts ?? {}))
      out.push({ manifest, slot, part, default: answer.default, options: answer.options });
  }
  return out;
}

const shortOption = (family: Family, option: string) => option.replace(`arena-${family.family}-`, '');

function slotsOf(catalogue: SlotCatalogue, family: Family, owner: Owner, option: string, drawn: boolean): [string, ColorSlot][] {
  const prefix = channelPrefix(family.family);
  return Object.entries(catalogue.slots).filter(([, s]) => s.scope === 'component' && s.component === owner.manifest.component
    && s.option === shortOption(family, option) && s.part === owner.slot && (s.draws !== undefined) === drawn
    && s.channel !== undefined && s.channel.startsWith(prefix));
}

const NO_SLOTS: SlotCatalogue = { accepts: { fill: [], ink: [], edge: [], icon: [] }, refused: [], states: [], families: {}, rings: {}, slots: {} };

const catalogueOf = (root: string): SlotCatalogue => (existsSync(join(root, COLOR_SLOTS)) ? readColorSlots(root) : NO_SLOTS);

export function componentChannels(family: Family, root = repoRoot): Set<string> {
  const prefix = channelPrefix(family.family);
  return new Set(Object.values(catalogueOf(root).slots)
    .filter((s) => s.scope === 'component' && s.channel !== undefined && s.channel.startsWith(prefix)).map((s) => s.channel as string));
}

type Compiler = { family: Family; catalogue: SlotCatalogue; owners: Owner[] };

function withInk(catalogue: SlotCatalogue, slot: ColorSlot, name: string, value: string): string {
  if (slot.property !== 'icon') return value;
  const inkName = expectedName({ ...slot, property: 'ink', accepts: 'ink' });
  const ink = catalogue.slots[inkName];
  const target = /^\{([a-z][a-z0-9-]*)\}$/.exec((ink?.default ?? '').trim())?.[1];
  return ink === undefined || target === undefined || !value.includes(`var(--${target},`) ? value : componentValue(value, ink, inkName);
}

function partWrites(k: Compiler, option: string, owner: Owner): Map<string, string> {
  const wrapper = slotsOf(k.catalogue, k.family, owner, option, true);
  const drawn = wrapper[0]?.[1].draws;
  let writes: Map<string, string>;
  if (drawn === undefined) {
    writes = new Map(declarations(k.family.variants[option] ?? '') as [string, string][]);
  } else {
    const [component, slot] = drawn.split('.');
    const under = k.owners.find((one) => one.manifest.component === component && one.slot === slot);
    writes = under === undefined ? new Map() : partWrites(k, option, under);
  }
  const slots = drawn === undefined ? slotsOf(k.catalogue, k.family, owner, option, false) : wrapper;
  for (const [name, slot] of slots) {
    const base = writes.get(slot.channel as string);
    writes.set(slot.channel as string, base === undefined ? slotChain(k.catalogue, name) : withInk(k.catalogue, slot, name, componentValue(base, slot, name)));
  }
  for (const state of ['disabled', 'selected-disabled'] as const) {
    const disabled = slots.find(([, slot]) => slot.state === state)?.[1];
    const channel = `--arena-emphasis-fade-${state}`;
    const fade = writes.get(channel);
    if (disabled !== undefined && fade !== undefined)
      writes.set(channel, `var(--${slotStem(owner.manifest.component)}-${disabled.option}-${disabled.part}-fade-${state},${fade})`);
  }
  return writes;
}

const rule = (selector: string, writes: Map<string, string>, indent: string) =>
  `${indent}${selector} {\n${[...writes].map(([name, value]) => `${indent}  ${name}: ${value.replaceAll('_', ' ')};`).join('\n')}\n${indent}}`;

const partSelector = (part: string) => `:scope[data-arena-part="${part}"], [data-arena-part="${part}"]`;

const byPart = (a: Owner, b: Owner) => (a.part < b.part ? -1 : a.part > b.part ? 1 : 0);

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
      const named: [string, string][] = family.reach === 'context'
        ? [[`--arena-${family.family}`, option.replace(/^arena-/, '')]] : [];
      const body = [...named, ...optionDeclarations(family, option, root)]
        .map(([name, value]) => `    ${name}: ${value};`).join('\n');
      return `@scope (.${option}) {\n  :scope {\n${body}\n  }\n}`;
    });
    return `${LAYER_ORDER}${blocks.join('\n')}\n`;
  }
  if (parts.length === 0) {
    throw new Error(`vocabulary: no manifest answers ${family.family} and reads its channels, so every `
      + 'option would compile to a rule that selects nothing');
  }
  const k: Compiler = { family, catalogue: catalogueOf(root), owners: ownersOf(family, all) };
  const slotted = (option: string, drawn: boolean) => k.owners.filter((one) => one.options.includes(option)
    && slotsOf(k.catalogue, family, one, option, drawn).length > 0).sort(byPart);
  const drawnPart = (owner: Owner, option: string) => {
    const [component, slot] = slotsOf(k.catalogue, family, owner, option, true)[0]?.[1].draws?.split('.') ?? [];
    return k.owners.find((one) => one.manifest.component === component && one.slot === slot)?.part ?? '';
  };
  const blocks: string[] = [];
  for (const [option, classes] of Object.entries(family.variants).sort(byOption)) {
    const own = answeringParts(family, all, option);
    if (own.length === 0) continue;
    const head = family.reach === 'box' ? `@scope (.${option}) to (${LIMIT})` : `@scope (.${option}) to (${FLOATING_LIMIT})`;
    const answered = slotted(option, false);
    const plain = own.filter((part) => !answered.some((one) => one.part === part));
    const inner: string[] = [];
    if (plain.length) {
      const body = declarations(classes).map(([name, value]) => `      ${name}: ${value};`).join('\n');
      inner.push(`    ${plain.map(partSelector).join(',\n    ')} {\n${body}\n    }`);
    }
    for (const owner of answered) inner.push(rule(partSelector(owner.part), partWrites(k, option, owner), '    '));
    for (const owner of slotted(option, true)) {
      const into = drawnPart(owner, option);
      inner.push(rule(`:where(:scope[data-arena-part="${owner.part}"]) [data-arena-part="${into}"],\n    :where([data-arena-part="${owner.part}"]) [data-arena-part="${into}"]`,
        partWrites(k, option, owner), '    '));
    }
    blocks.push(`  ${head} {\n${inner.join('\n')}\n  }`);
  }
  const atDefault = (drawn: boolean) => k.owners.filter((one) => slotsOf(k.catalogue, family, one, one.default, drawn).length > 0).sort(byPart);
  for (const owner of atDefault(false)) blocks.push(rule(`:where([data-arena-part="${owner.part}"])`, partWrites(k, owner.default, owner), '  '));
  for (const owner of atDefault(true)) {
    blocks.push(rule(`:where([data-arena-part="${owner.part}"] [data-arena-part="${drawnPart(owner, owner.default)}"])`, partWrites(k, owner.default, owner), '  '));
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
