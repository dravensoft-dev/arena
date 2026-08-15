/* `none` says "a component with no interactive affordance: it renders, and a user cannot act on
 * it" -- and its `requires` is empty, so binding it verifies NOTHING. Every component here was
 * outside COVERED for exactly that reason: a compliance suite over `none` would have been
 * ceremony. So each renders with no consumer content and is asserted INERT, which is the
 * sentence the pattern's own description makes and no requirement can. Content a consumer
 * projects is theirs and is deliberately not passed: ArenaPageHead has an action slot, and an ArenaButton
 * inside one leaves the binding correct. ArenaSideNavSection is the one that needs a child at
 * all -- its content slot is required -- and it gets an inert one that absorbs the props the
 * section injects into its direct children, because a bare <span> would receive them as unknown
 * DOM attributes. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import React from 'react';
import { mount, cleanup } from '../test/Harness.tsx';
import { assertPattern, REACT_COMPONENTS } from '../test/AssertPattern.tsx';
import { ArenaAppLogo } from './brand/arena-app-logo/ArenaAppLogo.tsx';
import { ArenaAvatar } from './display/arena-avatar/ArenaAvatar.tsx';
import { ArenaBadge } from './display/arena-badge/ArenaBadge.tsx';
import { ArenaCard } from './display/arena-card/ArenaCard.tsx';
import { ArenaStatCard } from './display/arena-stat-card/ArenaStatCard.tsx';
import { ArenaUnauthCard } from './display/arena-unauth-card/ArenaUnauthCard.tsx';
import { ArenaChartCard } from './charts/arena-chart-card/ArenaChartCard.tsx';
import { ArenaEmptyState } from './feedback/arena-empty-state/ArenaEmptyState.tsx';
import { ArenaToastHost } from './feedback/arena-toast-host/ArenaToastHost.tsx';
import { ArenaGrid } from './layout/arena-grid/ArenaGrid.tsx';
import { ArenaFigure } from './layout/arena-figure/ArenaFigure.tsx';
import { ArenaHero } from './layout/arena-hero/ArenaHero.tsx';
import { ArenaScrollerItem } from './layout/arena-scroller-item/ArenaScrollerItem.tsx';
import { ArenaSection } from './layout/arena-section/ArenaSection.tsx';
import { ArenaPageHead } from './navigation/arena-page-head/ArenaPageHead.tsx';
import { ArenaSideNavSection } from './navigation/arena-side-nav-section/ArenaSideNavSection.tsx';

afterEach(cleanup);

function InertChild() {
  return <span>Overview</span>;
}

const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex], [contenteditable]';
const INTERACTIVE_ROLE = [
  'button', 'link', 'checkbox', 'radio', 'switch', 'tab', 'menuitem', 'option',
  'textbox', 'combobox', 'slider', 'spinbutton', 'gridcell',
];

const INERT: [string, string, React.ReactElement][] = [
  ['ArenaAppLogo', 'brand/arena-app-logo/ArenaAppLogo.behaviour.json', <ArenaAppLogo mark={<svg />} name="Dravensoft" />],
  ['ArenaAvatar', 'display/arena-avatar/ArenaAvatar.behaviour.json', <ArenaAvatar name="Ada Lovelace" />],
  ['ArenaBadge', 'display/arena-badge/ArenaBadge.behaviour.json', <ArenaBadge>Healthy</ArenaBadge>],
  ['ArenaStatCard', 'display/arena-stat-card/ArenaStatCard.behaviour.json', <ArenaStatCard label="Uptime" value="99.98%" />],
  ['ArenaUnauthCard', 'display/arena-unauth-card/ArenaUnauthCard.behaviour.json', <ArenaUnauthCard title="Sign in" />],
  ['ArenaChartCard', 'charts/arena-chart-card/ArenaChartCard.behaviour.json', <ArenaChartCard title="Latency" />],
  ['ArenaEmptyState', 'feedback/arena-empty-state/ArenaEmptyState.behaviour.json', <ArenaEmptyState title="Nothing here yet" />],
  ['ArenaToastHost', 'feedback/arena-toast-host/ArenaToastHost.behaviour.json', <ArenaToastHost />],
  ['ArenaGrid', 'layout/arena-grid/ArenaGrid.behaviour.json', <ArenaGrid><InertChild /></ArenaGrid>],
  ['ArenaFigure', 'layout/arena-figure/ArenaFigure.behaviour.json',
    <ArenaFigure caption="Kochere, 2050 m" />],
  ['ArenaHero', 'layout/arena-hero/ArenaHero.behaviour.json',
    <ArenaHero title="Coffee that tells you where it grew" />],
  ['ArenaScrollerItem', 'layout/arena-scroller-item/ArenaScrollerItem.behaviour.json',
    <ArenaScrollerItem><InertChild /></ArenaScrollerItem>],
  ['ArenaSection', 'layout/arena-section/ArenaSection.behaviour.json',
    <ArenaSection title="Landed recently"><InertChild /></ArenaSection>],
  ['ArenaPageHead', 'navigation/arena-page-head/ArenaPageHead.behaviour.json', <ArenaPageHead title="Projects" />],
  ['ArenaSideNavSection', 'navigation/arena-side-nav-section/ArenaSideNavSection.behaviour.json',
    <ArenaSideNavSection label="Workspace"><InertChild /></ArenaSideNavSection>],
];

export function inertProblems(root: ParentNode) {
  const problems = [];
  for (const el of root.querySelectorAll(FOCUSABLE)) {
    problems.push(`renders a focusable <${el.tagName.toLowerCase()}> of its own`);
  }
  for (const el of root.querySelectorAll('[role]')) {
    const role = el.getAttribute('role');
    if (INTERACTIVE_ROLE.includes(role!)) problems.push(`renders role="${role}"`);
  }
  return problems;
}

for (const [name, tail, element] of INERT) {
  test(`${name} binds "none" and is actually inert`, () => {
    const root = mount(element);

    assert.deepEqual(
      inertProblems(root), [],
      `${name} binds "none", whose description is "a component with no interactive affordance: it renders, and a `
      + 'user cannot act on it". That pattern requires nothing, so the binding alone asserts none of it. This does.',
    );

    assertPattern({ root, bindingPath: join(REACT_COMPONENTS, tail!), subjects: { default: root.firstElementChild } });
  });
}

test('the inert set is not empty and every entry names a real binding, so a shrinking list cannot pass by having nothing in it', () => {
  assert.ok(INERT.length >= 9, 'the inert set lost an entry -- a component leaving it should leave by changing its binding');
  for (const [name, tail] of INERT) {
    assert.match(tail, new RegExp(`/${name}\\.behaviour\\.json$`), `${name} names a binding tail that is not its own`);
  }
});

test('a focusable element inside the render is what this suite exists to catch', () => {
  const root = mount(<ArenaCard title="Deployments" action={<button type="button">Retry</button>} />);
  assert.notDeepEqual(inertProblems(root), [],
    'an ArenaCard given an action slot renders a real button -- the check must see it, or it sees nothing. '
    + 'The binding stays correct because that button is the CONSUMER\'s, which is why the cases above pass no slots.');
});
