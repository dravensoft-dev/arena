/* The proximity fixture and the two directions it is read in. Each layer's suite renders a case and
 * holds the normalised tree of its own DOM equal to the fixture's tree for that layer, so an Angular
 * host shape and a React root shape both reach the gate, which rebuilds each tree as HTML with the
 * slot classes each part's manifest resolves to by default and measures it in Chromium. The witness
 * family is a context family the fixture declares, since phase 1 ships none. A tree keeps an open
 * surface, a floating one and a channel an element binds on its style: what a size class reaches,
 * stops at and is answered by. It keeps a destructive flag and a tone other than neutral, the meaning
 * an emphasis class and an accent class leave in place; the axis a member takes its option from; a
 * disabled, pressed or selected flag (a branch member's by its data attribute, an aria-disabled
 * member's by aria-disabled); and a colour slot a case binds, standing in for a style plugin's answer. */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from './repo-root.ts';
import { readColorSlots, readSlotDeclarations } from '../core/color-slots.ts';
import { layerManifests } from '../tailwind/tailwind-compile.ts';
import { axisNames, fadeMarkers, optionAxes } from '../../generate/core/arena-cli/slots.ts';
import type { Family } from '../tailwind/vocabulary.ts';
import { readFamilies, SURFACE } from '../tailwind/vocabulary.ts';
import { kebab } from '../../utils/case.ts';

export const PROXIMITY_CASES = 'scripts/check/arena/proximity-cases.json';
export const SUBJECT = 'data-proximity-subject';
export const OPEN = 'data-arena-open';
export const DESTRUCTIVE = 'data-arena-destructive';
export const TONE = 'data-arena-tone';
export const PRESSED = 'data-arena-pressed';

export type Tree = {
  tag: string; part?: string; boundary?: true; contents?: true; open?: true; disabled?: true; pressed?: true; selected?: true; destructive?: true; tone?: string; surface?: string; axes?: Record<string, string>; vars?: string; class?: string; text?: string;
  subject?: true; children?: Tree[];
};

export type WitnessPart = string | { part: string; options: string[] };
export type WitnessFamily = Family & { parts?: WitnessPart[] };

export type ProximityCase = {
  name: string;
  container: string;
  hover?: true;
  measure: { width: 'container' | 'own' } | { property: string; value: string; others?: Record<string, string | string[]> };
  react: Tree | null;
  angular: Tree | null;
};

export type MarkupCase = {
  name: string;
  root?: string;
  html: string;
} & ({ expect: Record<string, string | null> } | { equal: Record<string, string> });

export type NodeLike = {
  nodeType: number;
  tagName?: string;
  textContent?: string | null;
  childNodes: ArrayLike<NodeLike> | NodeLike[];
  getAttribute?(name: string): string | null;
  hasAttribute?(name: string): boolean;
};

export function readProximity(root = repoRoot) {
  const raw = JSON.parse(readFileSync(join(root, PROXIMITY_CASES), 'utf8')) as { families: WitnessFamily[]; cases: ProximityCase[]; markup?: MarkupCase[] };
  return { families: raw.families, cases: raw.cases, markup: raw.markup ?? [] };
}

export function vocabularyClasses(witness: Family[], root = repoRoot) {
  return new Set([...readFamilies(root).values(), ...witness].flatMap((family) => Object.keys(family.variants)));
}

const slotChannels = (root = repoRoot) => {
  const catalogue = readColorSlots(root);
  const names = Object.keys(catalogue.slots);
  return new Set([...names.map((name) => `--${name}`), ...fadeMarkers(names, catalogue).map(([marker]) => marker)]);
};
const SLOT_CHANNELS = slotChannels();

export const markDotAnswers = (root = repoRoot): Record<string, string> => Object.fromEntries(
  Object.keys(readColorSlots(root).slots).filter((name) => /^marks-.+-dot-(fill|ink|edge)-rest$/.test(name)).map((name) => [`--${name}`, 'var(--hue-info-ink)']));

const hookOf = (component: string, part: string) => kebab(component.replace(/^Arena/, '')) + (part === 'root' ? '' : `.${kebab(part)}`);
const memberHook = (key: string) => { const [component, part] = key.split('.') as [string, string]; return hookOf(component, part); };

const branchAxes = (by: 'selectedBy' | 'disabledBy', root = repoRoot) => new Map(Object.entries(readColorSlots(root).members).flatMap(([key, member]) => {
  const axis = member[by]?.axis;
  return axis ? [[memberHook(key), `data-arena-${axis}`] as [string, string]] : [];
}));
const optionAxesOf = (root = repoRoot) => new Map(Object.entries(readColorSlots(root).members).flatMap(([key, member]) => {
  const axes = [...optionAxes(member).flatMap(axisNames), ...[member.onlyBy, member.hoverBy, member.toBy].flatMap((one) => (one ? [one.axis] : []))].map((one) => `data-arena-${kebab(one)}`);
  return axes.length ? [[memberHook(key), axes] as [string, string[]]] : [];
}));
const seriesByAxesOf = (root = repoRoot) => Object.entries(readColorSlots(root).members).flatMap(([key, member]) =>
  member.seriesBy ? [[memberHook(key), [`data-arena-${kebab(member.seriesBy)}`]] as [string, string[]]] : []);
const seriesAxesOf = (root = repoRoot) => {
  const manifests = new Map([...layerManifests(root).values()].map((one) => [one.component, one]));
  return new Map(Object.entries(readSlotDeclarations(root).members ?? {}).flatMap(([component, member]) => Object.entries(member.parts)
    .filter(([, to]) => to === 'series')
    .flatMap(([part]) => {
      const axes = Object.keys(manifests.get(component)?.hues ?? {}).filter((one) => one !== 'on' && one !== 'tone').map((one) => `data-arena-${kebab(one)}`);
      return axes.length ? [[hookOf(component, part), axes] as [string, string[]]] : [];
    })));
};
const OPTION_AXES = [...seriesByAxesOf()].reduce((all, [hook, axes]) => all.set(hook, [...all.get(hook) ?? [], ...axes]),
  new Map([...optionAxesOf(), ...seriesAxesOf()]));
const SELECTED_BY = branchAxes('selectedBy');
const DISABLED_BY = branchAxes('disabledBy');
const ARIA_DISABLED = new Set(Object.entries(readColorSlots().members).filter(([, member]) => member.disabledModifier === 'aria-disabled:')
  .map(([key]) => memberHook(key)));

export const channelBindings = (style: string) => style.split(';').map((one) => one.replace(/\s+/g, ''))
  .filter((one) => one.startsWith('--arena-') || SLOT_CHANNELS.has(one.split(':')[0] ?? '')).join(';');

export function normalize(element: NodeLike, vocabulary: Set<string>, subject: NodeLike | null = null): Tree | null {
  const tree: Tree = { tag: (element.tagName ?? '').toLowerCase() };
  const part = element.getAttribute?.('data-arena-part');
  if (part) tree.part = part;
  if (element.hasAttribute?.('data-arena-boundary')) tree.boundary = true;
  const style = element.getAttribute?.('style') ?? '';
  if (/display:\s*contents/.test(style)) tree.contents = true;
  if (element.hasAttribute?.(OPEN)) tree.open = true;
  if (element.hasAttribute?.('disabled')) tree.disabled = true;
  const off = part ? DISABLED_BY.get(part) : undefined;
  if (off && element.hasAttribute?.(off) && element.getAttribute?.(off) !== 'false') tree.disabled = true;
  if (part && ARIA_DISABLED.has(part) && element.getAttribute?.('aria-disabled') === 'true') tree.disabled = true;
  if (element.hasAttribute?.(DESTRUCTIVE) && element.getAttribute?.(DESTRUCTIVE) !== 'false') tree.destructive = true;
  if (element.hasAttribute?.(PRESSED) && element.getAttribute?.(PRESSED) !== 'false') tree.pressed = true;
  const selected = part ? SELECTED_BY.get(part) : undefined;
  if (selected && element.hasAttribute?.(selected) && element.getAttribute?.(selected) !== 'false') tree.selected = true;
  const axes = Object.fromEntries((part ? OPTION_AXES.get(part) ?? [] : []).flatMap((attr) => {
    const value = element.getAttribute?.(attr);
    return value === null || value === undefined || value === 'false' || value === 'neutral' ? [] : [[attr, value] as [string, string]];
  }));
  if (Object.keys(axes).length) tree.axes = axes;
  const tone = element.getAttribute?.(TONE);
  if (tone && tone !== 'neutral') tree.tone = tone;
  const surface = element.getAttribute?.(SURFACE);
  if (surface) tree.surface = surface;
  const vars = channelBindings(style);
  if (vars) tree.vars = vars;
  const classes = (element.getAttribute?.('class') ?? '').split(/\s+/).filter((one) => vocabulary.has(one));
  if (classes.length) tree.class = classes.join(' ');
  if (element === subject) tree.subject = true;
  const kids = Array.from(element.childNodes as ArrayLike<NodeLike>);
  const text = kids.filter((one) => one.nodeType === 3).map((one) => one.textContent ?? '').join('').trim();
  if (text) tree.text = text;
  const children = kids.filter((one) => one.nodeType === 1).map((one) => normalize(one, vocabulary, subject)).filter((one): one is Tree => one !== null);
  if (children.length) tree.children = children;
  const kept = tree.part || tree.boundary || tree.contents || tree.open || tree.disabled || tree.pressed || tree.selected || tree.destructive || tree.axes || tree.tone || tree.surface || tree.vars || tree.class || tree.text || tree.subject || tree.children;
  return kept ? tree : null;
}

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

export type PartData = Readonly<Record<string, string>>;

export function treeHtml(
  tree: Tree, classesOf: (part: string) => string, dataOf: (part: string) => PartData = () => ({}),
): string {
  const attrs: string[] = [];
  if (tree.part) attrs.push(`data-arena-part="${tree.part}"`);
  if (tree.boundary) attrs.push('data-arena-boundary=""');
  if (tree.open) attrs.push(`${OPEN}=""`);
  if (tree.disabled) attrs.push(tree.part && ARIA_DISABLED.has(tree.part) ? 'aria-disabled="true"' : 'disabled=""');
  if (tree.subject) attrs.push(`${SUBJECT}=""`);
  if (tree.surface) attrs.push(`${SURFACE}="${tree.surface}"`);
  const styles = [tree.contents ? 'display: contents' : '', tree.vars ?? ''].filter(Boolean);
  if (styles.length) attrs.push(`style="${styles.join('; ')}"`);
  const classes = [tree.part ? classesOf(tree.part) : '', tree.class ?? ''].filter(Boolean).join(' ');
  if (classes) attrs.push(`class="${classes}"`);
  const data = { ...(tree.part ? dataOf(tree.part) : {}), ...(tree.destructive ? { [DESTRUCTIVE]: 'true' } : {}), ...(tree.pressed ? { [PRESSED]: '' } : {}),
    ...(tree.selected && tree.part ? { [SELECTED_BY.get(tree.part) as string]: '' } : {}),
    ...(tree.disabled && tree.part && DISABLED_BY.has(tree.part) ? { [DISABLED_BY.get(tree.part) as string]: '' } : {}), ...(tree.axes ?? {}), ...(tree.tone ? { [TONE]: tree.tone } : {}) };
  for (const [name, value] of Object.entries(data)) attrs.push(`${name}="${value}"`);
  const inner = `${tree.text ? escape(tree.text) : ''}${(tree.children ?? []).map((one) => treeHtml(one, classesOf, dataOf)).join('')}`;
  return `<${tree.tag}${attrs.length ? ` ${attrs.join(' ')}` : ''}>${inner}</${tree.tag}>`;
}
