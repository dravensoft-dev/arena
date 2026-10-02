/* Each proximity case rendered in React and normalised to the tree the gate measures, held equal
 * to the fixture. A null tree is a case not yet recorded: the suite fails printing the tree it
 * rendered, which is read against the case's intent before it is pasted into the fixture. The
 * subject is the button each case measures. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { mount, cleanup } from './Harness.tsx';
import { ArenaButton, ArenaTooltip, ArenaMenu, ArenaCard } from '../Index.generated.ts';
import { readProximity, normalize, vocabularyClasses } from '../../../scripts/lib/arena/proximity.ts';

afterEach(cleanup);

type NodeLike = Parameters<typeof normalize>[0];

const COMPOSITIONS: Record<string, () => React.ReactElement> = {
  'class-on-component-beats-ancestor': () => <ArenaButton className="arena-fill">Save</ArenaButton>,
  'nearer-fit-beats-ancestor-fill': () => <ArenaButton className="arena-fit">Save</ArenaButton>,
  'class-on-tooltip-reaches-its-trigger': () => <ArenaTooltip className="arena-fill" label="Copy"><ArenaButton>Save</ArenaButton></ArenaTooltip>,
  'class-on-menu-reaches-its-trigger': () => <ArenaMenu className="arena-fill" items={[]} trigger={<ArenaButton>Save</ArenaButton>} />,
  'ancestor-reaches-through-the-transparent-trigger': () => <ArenaTooltip label="Copy"><ArenaButton>Save</ArenaButton></ArenaTooltip>,
  'class-on-trigger-alone-fills-the-wrapper-box': () => <ArenaTooltip label="Copy"><ArenaButton className="arena-fill">Save</ArenaButton></ArenaTooltip>,
  'box-class-stops-at-a-boundary': () => <ArenaCard><ArenaButton>Save</ArenaButton></ArenaCard>,
  'context-class-crosses-a-boundary': () => <ArenaCard><ArenaButton>Save</ArenaButton></ArenaCard>,
  'box-channel-stays-out-of-content': () => <ArenaCard><ArenaButton>Save</ArenaButton></ArenaCard>,
};

const { families, cases } = readProximity();
const vocabulary = vocabularyClasses(families);

test('every case has a React composition, and every composition a case', () => {
  assert.deepEqual(Object.keys(COMPOSITIONS).sort(), cases.map((one) => one.name).sort());
});

for (const kase of cases) {
  test(`${kase.name}: React renders the tree the gate measures`, () => {
    const root = mount(<div className={kase.container || undefined}>{COMPOSITIONS[kase.name]!()}</div>);
    const container = root.firstElementChild!;
    const subject = [...container.querySelectorAll('[data-arena-part="button"]')].at(-1) ?? null;
    const tree = normalize(container as unknown as NodeLike, vocabulary, subject as unknown as NodeLike);
    assert.deepEqual(tree, kase.react, `recorded tree for ${kase.name}:\n${JSON.stringify(tree)}`);
  });
}
