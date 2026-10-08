/* Every contracted slot, rendered from its demo fixture with a probe as its content, lands in an
 * element carrying data-arena-boundary, or in a slot its manifest declares transparent. A box
 * family stops inside that element, so an attribute missing here is a class written above the
 * component reaching the adopter's own markup. Cases are derived, so a new slot is measured by
 * being contracted. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mount, cleanup, act } from './Harness.tsx';
import React from 'react';
import { element } from './FixtureRender.tsx';
import {
  ArenaDialog, ArenaConfirmDialog, ArenaSheet, ArenaOnboarding, ArenaCommandPalette, ArenaToastHost, ArenaMenu, ArenaTooltip, ArenaButton,
} from '../Index.generated.ts';
import {
  boundaryCases, readSites, siteProblems, staleTransparentProblems,
} from '../../../scripts/lib/arena/boundary-cases.ts';

afterEach(cleanup);

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

const FLOATING: Record<string, () => React.ReactElement> = {
  'dialog.scrim': () => <ArenaDialog open onClose={() => {}} title="Discard" />,
  'confirm-dialog': () => <ArenaConfirmDialog open title="Delete" />,
  'sheet': () => <ArenaSheet open title="Filters" />,
  'onboarding': () => <ArenaOnboarding open steps={[{ title: 'Welcome', body: 'Start here' }]} />,
  'command-palette': () => <ArenaCommandPalette open commands={[{ id: 'a', label: 'Open' }]} />,
  'toast-host': () => <ArenaToastHost />,
  'menu.panel': () => <ArenaMenu trigger={<ArenaButton>More</ArenaButton>} items={[{ label: 'Rename' }]} />,
  'tooltip.bubble': () => <ArenaTooltip label="Copy"><ArenaButton>Save</ArenaButton></ArenaTooltip>,
};

for (const [part, render] of Object.entries(FLOATING)) {
  test(`${part} is the floating surface its manifest declares`, () => {
    const root = mount(render());
    if (part === 'menu.panel') act(() => { (root.querySelector('[aria-haspopup]') as HTMLElement | null)?.click(); });
    if (part === 'tooltip.bubble') act(() => { (root.querySelector('button') as HTMLElement | null)?.focus(); });
    const surface = root.querySelector(`[data-arena-part="${part}"]`);
    assert.ok(surface, `${part} rendered`);
    assert.equal(surface.getAttribute('data-arena-surface'), 'floating');
  });
}
