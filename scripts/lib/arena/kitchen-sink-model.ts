/* Derives one kitchen-sink page from an arrangement and the demo fixtures, so the two renderers
 * read a shape rather than infer one. The arrangement carries names and order; every instance is
 * that component's own frameworks/demos/ fixture, seed, slots and host together, because a page
 * seeding a component differently from the playground showing the same component would report a
 * difference nobody made. Which components need a stage is DERIVED from the manifest rather than
 * listed: a component whose surface declares `fixed` escapes the page flow and would cover its
 * neighbours, and a wrapper that is a containing block scopes it back to its own tile. A list
 * here would silently stop covering the first component that gained a fixed surface. */

import { readJson } from '../../utils/read-file.ts';
import { join } from 'node:path';
import { kebab } from '../../utils/case.ts';
import { repoRoot } from './repo-root.ts';
import { categoryOf, manifestFor } from '../tailwind/manifest-surfaces.ts';
import { SUBJECT, childLists, variantSeed } from './playground-model.ts';
import type { Fixture, FixtureChild, FixtureNode, Place, Places } from './playground-model.ts';
import type { ManifestClassSource } from '../tailwind/manifest-shapes.ts';

export type SinkItem = {
  component: string; variant?: string; label: string; node: FixtureNode; staged: boolean;
  vars?: Record<string, string>;
};

export type SinkSection = { title: string; items: SinkItem[] };

export type SinkModel = {
  sink: string;
  note: string;
  sections: SinkSection[];
  uses: string[];
};

export type SinkFixture = {
  sink: string;
  note?: string;
  sections: { title: string; items: string[] }[];
};

export const ROOT_SINK = 'default';

export const VARIANT_MARK = ':';

export function splitItem(item: string): { component: string; variant?: string } {
  const at = item.indexOf(VARIANT_MARK);
  if (at === -1) return { component: item };
  return { component: item.slice(0, at), variant: item.slice(at + 1) };
}

export function isVariantArrangement(fixture: Pick<SinkFixture, 'sections'>) {
  const items = fixture.sections.flatMap((section) => section.items);
  return items.length > 0 && items.every((item) => splitItem(item).variant !== undefined);
}

export const FIXED = /(?:^|\s)(?:[\w-]+:)*fixed(?=\s|$)/;

export function classStrings(manifest: ManifestClassSource): string[] {
  const out: string[] = [];
  const add = (value: unknown) => { if (typeof value === 'string') out.push(value); };
  for (const cls of Object.values(manifest.slots ?? {})) add(cls);
  for (const group of Object.values(manifest.variants ?? {}))
    for (const branch of Object.values(group ?? {}))
      for (const cls of Object.values(branch ?? {})) add(cls);
  for (const compound of manifest.compoundVariants ?? [])
    for (const cls of Object.values(compound.class ?? {})) add(cls);
  return out;
}

export function drawsFixed(manifest: ManifestClassSource) {
  return classStrings(manifest).some((cls) => FIXED.test(cls));
}

export function manifestPath(name: string, root = repoRoot) {
  const category = categoryOf(name, root);
  if (!category) return null;
  return join(root, 'frameworks/tailwind/components', category, kebab(name), `${name}.manifest.json`);
}

export function stagedComponents(names: string[], root = repoRoot,
  read: (path: string) => ManifestClassSource = readJson) {
  const staged = new Set<string>();
  for (const name of names) {
    const owner = manifestFor(name, root);
    if (!owner) continue;
    const path = manifestPath(owner, root);
    if (!path) continue;
    if (drawsFixed(read(path))) staged.add(name);
  }
  return staged;
}

export function substitute(node: FixtureChild, subject: FixtureNode): FixtureChild {
  if (node === SUBJECT) return subject;
  if (node === null || typeof node !== 'object') return node;
  const slots = Object.entries(node.slots ?? {}) as [string, FixtureChild[]][];
  const children = Array.isArray(node.children) ? node.children : null;
  if (slots.length === 0 && children === null) return node;
  const out: FixtureNode = { ...node };
  if (slots.length > 0)
    out.slots = Object.fromEntries(slots.map(([slot, list]) => [slot, list.map((one) => substitute(one, subject))]));
  if (children !== null) out.children = children.map((one) => substitute(one, subject));
  return out;
}

export function instanceNode(fixture: Fixture): FixtureNode {
  const subject: FixtureNode = { component: fixture.component };
  if (fixture.seed && Object.keys(fixture.seed).length > 0) subject.members = fixture.seed;
  if (fixture.class) subject.class = fixture.class;
  if (fixture.slots && Object.keys(fixture.slots).length > 0) subject.slots = fixture.slots;
  if (!fixture.host) return subject;
  const hosted = substitute(fixture.host, subject);
  if (hosted === null || typeof hosted !== 'object') {
    throw new Error(`kitchen-sink-model: ${fixture.component}'s host is not a node, so the component has `
      + 'nowhere to be placed and the page would draw it bare or not at all');
  }
  return hosted;
}

export function rebase(value: string, from: string, to: string) {
  if (!value.startsWith('../')) return value;
  if (!value.startsWith(from)) {
    throw new Error(`kitchen-sink-model: a fixture reaches out with "${value}", and only "${from}" is `
      + 'the depth a page is emitted at, so this path resolves to nothing on the page it lands on');
  }
  return `${to}${value.slice(from.length)}`;
}

export function rebaseNode(node: FixtureChild, from: string, to: string): FixtureChild {
  if (node === null || node === SUBJECT || typeof node !== 'object') return node;
  const mapped: FixtureNode = { ...node };
  for (const key of ['members', 'attrs'] as const) {
    const bag = node[key] as Record<string, unknown> | undefined;
    if (!bag) continue;
    mapped[key] = Object.fromEntries(Object.entries(bag)
      .map(([name, value]) => [name, typeof value === 'string' ? rebase(value, from, to) : value]));
  }
  const slots = Object.entries(node.slots ?? {}) as [string, FixtureChild[]][];
  if (slots.length > 0) {
    mapped.slots = Object.fromEntries(
      slots.map(([slot, list]) => [slot, list.map((one) => rebaseNode(one, from, to))]),
    );
  }
  if (Array.isArray(node.children)) mapped.children = node.children.map((one) => rebaseNode(one, from, to));
  return mapped;
}

export function componentsIn(node: FixtureChild, into = new Set<string>()) {
  if (node === null || node === SUBJECT || typeof node !== 'object') return into;
  if (typeof node.component === 'string') into.add(node.component);
  for (const list of childLists(node))
    for (const one of list) componentsIn(one, into);
  return into;
}

export function sinkModel(fixture: SinkFixture, demos: Map<string, Fixture>,
  staged: Set<string>, depth: { from: string; to: string }): SinkModel {
  const uses = new Set<string>();
  const sections = fixture.sections.map((section) => ({
    title: section.title,
    items: section.items.map((entry) => {
      const { component, variant } = splitItem(entry);
      const demo = demos.get(component);
      if (!demo) {
        throw new Error(`kitchen-sink-model: ${fixture.sink} arranges ${component}, and `
          + `frameworks/demos/${component}.demo.json is not there, so nothing says how to seed it`);
      }
      const drawn = variant === undefined ? demo : { ...demo, seed: variantSeed(demo, variant) };
      const node = rebaseNode(instanceNode(drawn), depth.from, depth.to) as FixtureNode;
      componentsIn(node, uses);
      const vars = demo.vars && Object.keys(demo.vars).length > 0 ? { vars: demo.vars } : {};
      return { component, label: entry, node, staged: staged.has(component), ...(variant === undefined ? {} : { variant }), ...vars };
    }),
  }));
  return {
    sink: fixture.sink,
    note: fixture.note ?? '',
    sections,
    uses: [...uses].sort(),
  };
}

export function placesFor(model: SinkModel, all: Map<string, Place>): Places {
  const out: Places = new Map();
  for (const name of model.uses) {
    const place = all.get(name);
    if (!place) {
      throw new Error(`kitchen-sink-model: ${model.sink} reaches ${name}, which `
        + 'frameworks/Components.json does not name');
    }
    out.set(name, place);
  }
  return out;
}

export function scopeClass(sink: string) {
  return sink === ROOT_SINK ? '' : `arena-${sink}`;
}
