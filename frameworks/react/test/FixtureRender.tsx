import React from 'react';
import * as Arena from '../Index.generated.ts';
import type { boundaryCases } from '../../../scripts/lib/arena/boundary-cases.ts';

type FixtureChild = ReturnType<typeof boundaryCases>[number]['node'] | string | null;

const registry = Arena as unknown as Record<string, React.ComponentType<Record<string, unknown>>>;

export function element(node: FixtureChild, key?: number): React.ReactNode {
  if (node === null || typeof node !== 'object') return null;
  if (typeof node.text === 'string' && !node.element) return node.text;
  if (node.element !== undefined) return React.createElement(node.element, { key, ...(node.attrs ?? {}) }, node.text);
  const Component = registry[node.component ?? ''];
  if (!Component) throw new Error(`${node.component} is not exported by the React barrel`);
  const props: Record<string, unknown> = { key, ...(node.members ?? {}) };
  for (const [slot, list] of Object.entries(node.slots ?? {})) {
    const rendered = (list ?? []).map((one, i) => element(one, i));
    props[slot === 'content' ? 'children' : slot] = rendered.length === 1 ? rendered[0] : rendered;
  }
  return React.createElement(Component, props);
}
