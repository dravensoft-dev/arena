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
import { SUBJECT } from './playground-model.ts';
import type { Fixture, FixtureChild, FixtureNode, Place, Places } from './playground-model.ts';
import type { ManifestClassSource } from '../tailwind/manifest-shapes.ts';

export type SinkItem = { component: string; node: FixtureNode; staged: boolean };

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
  if (slots.length === 0) return node;
  return {
    ...node,
    slots: Object.fromEntries(slots.map(([slot, list]) => [slot, list.map((one) => substitute(one, subject))])),
  };
}

export function instanceNode(fixture: Fixture): FixtureNode {
  const subject: FixtureNode = { component: fixture.component };
  if (fixture.seed && Object.keys(fixture.seed).length > 0) subject.members = fixture.seed;
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
  return mapped;
}

export function componentsIn(node: FixtureChild, into = new Set<string>()) {
  if (node === null || node === SUBJECT || typeof node !== 'object') return into;
  if (typeof node.component === 'string') into.add(node.component);
  for (const list of Object.values(node.slots ?? {}) as FixtureChild[][])
    for (const one of list) componentsIn(one, into);
  return into;
}

export function sinkModel(fixture: SinkFixture, demos: Map<string, Fixture>,
  staged: Set<string>, depth: { from: string; to: string }): SinkModel {
  const uses = new Set<string>();
  const sections = fixture.sections.map((section) => ({
    title: section.title,
    items: section.items.map((component) => {
      const demo = demos.get(component);
      if (!demo) {
        throw new Error(`kitchen-sink-model: ${fixture.sink} arranges ${component}, and `
          + `frameworks/demos/${component}.demo.json is not there, so nothing says how to seed it`);
      }
      const node = rebaseNode(instanceNode(demo), depth.from, depth.to) as FixtureNode;
      componentsIn(node, uses);
      return { component, node, staged: staged.has(component) };
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
