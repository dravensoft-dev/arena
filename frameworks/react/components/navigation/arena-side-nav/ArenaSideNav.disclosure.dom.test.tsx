import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { join } from 'node:path';

import { mount, cleanup, act } from '../../../test/Harness.tsx';
import { assertPattern, REACT_COMPONENTS } from '../../../test/AssertPattern.tsx';
import { ArenaSideNav } from './ArenaSideNav.tsx';
import { ArenaSideNavItem } from '../arena-side-nav-item/ArenaSideNavItem.tsx';
import { ArenaSideNavSection } from '../arena-side-nav-section/ArenaSideNavSection.tsx';
import { ArenaSideNavCollapsible } from '../arena-side-nav-collapsible/ArenaSideNavCollapsible.tsx';

afterEach(cleanup);

const trigger = (root: ParentNode, id: string): HTMLElement => root.querySelector<HTMLElement>(`#${id}-trigger`)!;
const region = (root: ParentNode, id: string): HTMLElement => root.querySelector<HTMLElement>(`#${id}-region`)!;
const press = (root: ParentNode, id: string) => act(() => { trigger(root, id).click(); });

interface OneProps { active?: string; onToggle?: (expanded: boolean) => void }
const one = (props: OneProps = {}, kids = <ArenaSideNavItem id="prod" label="Production" href="#prod" />) => (
  <ArenaSideNav ariaLabel="Primary" active={props.active}>
    <ArenaSideNavCollapsible id="deploys" label="Deployments" onToggle={props.onToggle}>
      {kids}
    </ArenaSideNavCollapsible>
  </ArenaSideNav>
);

test('clicking the trigger expands it: aria-expanded and hidden move together', () => {
  const root = mount(one());
  const t = trigger(root, 'deploys');
  const r = region(root, 'deploys');
  assert.equal(t.getAttribute('aria-expanded'), 'false');
  assert.equal(r.hasAttribute('hidden'), true);

  press(root, 'deploys');

  assert.equal(t.getAttribute('aria-expanded'), 'true');
  assert.equal(r.hasAttribute('hidden'), false,
    'the attribute is what takes the region out of the flow, and it moves with aria-expanded');
});

test('clicking again collapses it, and toggle reported one boolean per press', () => {
  const seen: unknown[] = [];
  const root = mount(one({ onToggle: (v: boolean) => seen.push(v) }));
  press(root, 'deploys');
  assert.deepEqual(seen, [true]);
  press(root, 'deploys');
  assert.deepEqual(seen, [true, false], 'toggle did not report exactly one boolean per press');
  assert.equal(trigger(root, 'deploys').getAttribute('aria-expanded'), 'false');
  assert.equal(region(root, 'deploys').hasAttribute('hidden'), true);
});

test('the auto-expand around the active destination is not reported through toggle', () => {
  const seen: unknown[] = [];
  const root = mount(one({ active: 'prod', onToggle: (v: boolean) => seen.push(v) }));
  assert.equal(trigger(root, 'deploys').getAttribute('aria-expanded'), 'true',
    'a subtree holding the active id did not open itself');
  assert.equal(region(root, 'deploys').hasAttribute('hidden'), false);
  assert.deepEqual(seen, [], 'the automatic expansion was reported as a user press');
});

function RouteHost({ onToggle }: { onToggle?: (expanded: boolean) => void }) {
  const [active, setActive] = React.useState('home');
  return (
    <div>
      <button type="button" id="go" onClick={() => setActive('prod')}>go</button>
      <ArenaSideNav ariaLabel="Primary" active={active}>
        <ArenaSideNavItem id="home" label="Home" href="#home" />
        <ArenaSideNavCollapsible id="deploys" label="Deployments" onToggle={onToggle}>
          <ArenaSideNavItem id="prod" label="Production" href="#prod" />
        </ArenaSideNavCollapsible>
      </ArenaSideNav>
    </div>
  );
}

test('a route change into a collapsed subtree opens it, and still reports no toggle', () => {
  const seen: unknown[] = [];
  const root = mount(<RouteHost onToggle={(v) => seen.push(v)} />);
  assert.equal(trigger(root, 'deploys').getAttribute('aria-expanded'), 'false');

  act(() => { root.querySelector<HTMLElement>('#go')!.click(); });

  assert.equal(trigger(root, 'deploys').getAttribute('aria-expanded'), 'true',
    'the effect half of decision (d) never ran -- seeding alone cannot reopen a group');
  assert.equal(region(root, 'deploys').hasAttribute('hidden'), false);
  assert.deepEqual(seen, [], 'the automatic expansion was reported as a user press');
});

test('the user may collapse a group that holds the active destination', () => {
  const seen: unknown[] = [];
  const root = mount(one({ active: 'prod', onToggle: (v: boolean) => seen.push(v) }));
  assert.equal(trigger(root, 'deploys').getAttribute('aria-expanded'), 'true');

  press(root, 'deploys');

  assert.equal(trigger(root, 'deploys').getAttribute('aria-expanded'), 'false',
    'the group reopened itself against the user -- the expanded state is derived, not owned');
  assert.equal(region(root, 'deploys').hasAttribute('hidden'), true);
  assert.deepEqual(seen, [false], 'the press the user actually made went unreported');
});

test('a nested collapsible opens independently of its parent -- two disclosures, not a treeview', () => {
  const root = mount(
    <ArenaSideNav ariaLabel="Primary">
      <ArenaSideNavCollapsible id="outer" label="Outer">
        <ArenaSideNavCollapsible id="inner" label="Inner">
          <ArenaSideNavItem id="prod" label="Production" href="#prod" />
        </ArenaSideNavCollapsible>
      </ArenaSideNavCollapsible>
    </ArenaSideNav>,
  );
  press(root, 'outer');
  assert.equal(trigger(root, 'outer').getAttribute('aria-expanded'), 'true');
  assert.equal(trigger(root, 'inner').getAttribute('aria-expanded'), 'false',
    'opening the outer group opened the inner one too -- the state is shared');

  press(root, 'inner');
  assert.equal(trigger(root, 'outer').getAttribute('aria-expanded'), 'true',
    'opening the inner group closed the outer one');
  assert.equal(trigger(root, 'inner').getAttribute('aria-expanded'), 'true');
  assert.equal(region(root, 'inner').hasAttribute('hidden'), false);
});

test('aria-current lands on the one item at depth 2, indented by two compounded steps', () => {
  const root = mount(
    <ArenaSideNav ariaLabel="Primary" active="prod">
      <ArenaSideNavSection label="Workspace">
        <ArenaSideNavCollapsible id="deploys" label="Deployments">
          <ArenaSideNavItem id="prod" label="Production" href="#prod" />
        </ArenaSideNavCollapsible>
      </ArenaSideNavSection>
    </ArenaSideNav>,
  );
  const current = [...root.querySelectorAll<HTMLElement>('[aria-current]')];
  assert.equal(current.length, 1, 'aria-current is on more than one element, or on none');
  assert.equal(current[0]!.tagName, 'A');
  assert.match(current[0]!.getAttribute('style')!,
    /--arena-side-nav-depth:\s*2/,
    'the depth did not compound through the section and the collapsible');
});

test('no consumer style and no consumer attribute survive into the revealed region', () => {
  const root = mount(
    // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
    <ArenaSideNavCollapsible id="d" label="D" data-stray="x" style={{ color: '#ff00ff' }}>
      <ArenaSideNavItem id="a" label="A" href="#a" />
    </ArenaSideNavCollapsible>,
  );
  const r = region(root, 'd');
  assert.equal(r.hasAttribute('hidden'), true, 'the fixture was not collapsed at mount');

  press(root, 'd');
  assert.equal(r.hasAttribute('hidden'), false, 'the region never opened, so nothing was inspected');

  assert.equal(root.querySelector<HTMLElement>('[data-stray]')!, null,
    'a consumer attribute reached an element -- a {...rest} spread is back');
  assert.equal(r.querySelector('[data-stray]')!, null,
    'a consumer attribute reached the revealed region');
  assert.doesNotMatch(root.innerHTML, /#ff00ff/,
    'a consumer style reached the rendered tree -- the R4 escape is back');
});

test('a collapsed region holds its links inside [hidden]; an expanded one does not; neither adds a tabindex', () => {
  const root = mount(one());
  const r = region(root, 'deploys');
  const links = [...r.querySelectorAll<HTMLElement>('a')];
  assert.equal(links.length, 1, 'the fixture rendered no link to reason about');

  assert.equal(links[0]!.closest('[hidden]'), r,
    'the link is not inside the hidden region -- it stays in the tab order while collapsed');
  assert.equal(links[0]!.getAttribute('tabindex'), null,
    'the item carries a tabindex of its own, which would survive the region being hidden');

  press(root, 'deploys');

  assert.equal(links[0]!.closest('[hidden]'), null,
    'the region stayed hidden after expanding, so its links are still unreachable');
  assert.equal(links[0]!.getAttribute('tabindex'), null,
    'expanding added a tabindex the collapsed state did not have');
});

test('ArenaSideNavCollapsible meets the disclosure pattern it binds', () => {
  const root = mount(
    <ArenaSideNavCollapsible id="deploys" label="Deployments">
      <ArenaSideNavItem id="prod" label="Production" href="#prod" />
    </ArenaSideNavCollapsible>,
  );
  const t = trigger(root, 'deploys');

  assert.equal(t.tagName, 'BUTTON');
  assert.equal(t.getAttribute('type'), 'button');
  for (const key of ['Enter', ' ']) {
    const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    act(() => { t.dispatchEvent(ev); });
    assert.equal(ev.defaultPrevented, false,
      `a handler of ours cancelled ${key === ' ' ? 'Space' : key}, suppressing the button's own activation`);
  }
  const r = region(root, 'deploys');
  assert.equal(r.hasAttribute('hidden'), true, 'a keydown alone toggled the region');
  press(root, 'deploys');
  assert.equal(r.hasAttribute('hidden'), false, 'a click did not toggle the region');
  press(root, 'deploys');

  assertPattern({
    root,
    bindingPath: join(REACT_COMPONENTS, 'navigation', 'arena-side-nav-collapsible', 'ArenaSideNavCollapsible.behaviour.json'),

    subjects: { default: t },
    behavioural: { 'keyboard.Enter': true, 'keyboard.Space': true },
  });
});
