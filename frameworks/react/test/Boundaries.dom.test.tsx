/* Every contracted slot, rendered from its demo fixture with a probe as its content, lands in an
 * element carrying data-arena-boundary, or in a slot its manifest declares transparent. A box
 * family stops inside that element, so an attribute missing here is a class written above the
 * component reaching the adopter's own markup. Cases are derived, so a new slot is measured by
 * being contracted. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { mount, cleanup, act } from './Harness.tsx';
import * as Arena from '../Index.generated.ts';
import {
  boundaryCases, readSites, siteProblems, staleTransparentProblems,
} from '../../../scripts/lib/arena/boundary-cases.ts';

afterEach(cleanup);

type FixtureChild = ReturnType<typeof boundaryCases>[number]['node'] | string | null;

const registry = Arena as unknown as Record<string, React.ComponentType<Record<string, unknown>>>;

function element(node: FixtureChild, key?: number): React.ReactNode {
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

const cases = boundaryCases();
const spent = new Set<string>();

test('the sweep found slots to measure', () => {
  assert.ok(cases.length > 0, 'derived no case; an empty sweep is a failure, not a clean pass');
});

for (const kase of cases) {
  test(`${kase.label}: every slot it projects is a boundary or declared transparent`, () => {
    const root = mount(element(kase.node));
    if (kase.press) act(() => { (root.querySelector(kase.press!) as HTMLElement | null)?.click(); });
    const { problems, spent: used } = siteProblems(kase, readSites(root as unknown as Parameters<typeof readSites>[0], kase), 'react');
    for (const key of used) spent.add(key);
    assert.deepEqual(problems, []);
  });
}

test('every transparent slot is one a render projected into', () => {
  assert.deepEqual(staleTransparentProblems(cases, spent, 'react'), []);
});
