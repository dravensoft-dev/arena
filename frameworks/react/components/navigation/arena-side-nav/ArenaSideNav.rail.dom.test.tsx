import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { mount, cleanup, act } from '../../../test/Harness.tsx';
import { ArenaSideNav } from './ArenaSideNav.tsx';
import { ArenaSideNavItem } from '../arena-side-nav-item/ArenaSideNavItem.tsx';
import { ArenaSideNavSection } from '../arena-side-nav-section/ArenaSideNavSection.tsx';
import { ArenaSideNavCollapsible } from '../arena-side-nav-collapsible/ArenaSideNavCollapsible.tsx';

afterEach(() => cleanup());

function rail(onToggle?: (open: boolean) => void) {
  return mount(
    <ArenaSideNav ariaLabel="Primary" collapsed active="orders">
      <ArenaSideNavItem id="home" label="Home" icon="ph-bold ph-house" />
      <ArenaSideNavSection label="Sales">
        <ArenaSideNavItem id="orders" label="Orders" icon="ph-bold ph-receipt" badge={12} />
      </ArenaSideNavSection>
      <ArenaSideNavCollapsible id="admin" label="Admin" icon="ph-bold ph-gear" onToggle={onToggle}>
        <ArenaSideNavItem id="users" label="Users" icon="ph-bold ph-users" />
      </ArenaSideNavCollapsible>
    </ArenaSideNav>,
  );
}

test('an icon-only item keeps its label, and its badge count, as its accessible name', () => {
  const host = rail();
  const orders = [...host.querySelectorAll('button, a')].find((el) => el.textContent?.includes('Orders'))!;
  assert.equal(orders.textContent?.replace(/\s+/g, ' ').trim(), 'Orders 12');
  assert.ok(orders.querySelector('[aria-hidden="true"]'), 'the dot is drawn and hidden');
});

test('focusing an item shows its label as a tooltip that adds no description', () => {
  const host = rail();
  const home = [...host.querySelectorAll('button')].find((el) => el.textContent?.includes('Home'))!;
  act(() => { home.focus(); });
  const bubble = host.ownerDocument.querySelector('[role="tooltip"]')!;
  assert.equal(bubble.textContent, 'Home');
  assert.equal(home.getAttribute('aria-describedby'), bubble.id);
  assert.ok(bubble.querySelector('[aria-hidden="true"]'));
});

test('a section keeps its label as the group name, and a collapsible flattens under a separator', () => {
  const host = rail();
  const groups = [...host.querySelectorAll('[role="group"]')];
  assert.ok(groups.some((g) => g.getAttribute('aria-labelledby') && host.ownerDocument.getElementById(g.getAttribute('aria-labelledby')!)?.textContent === 'Sales'));
  assert.ok(groups.some((g) => g.getAttribute('aria-label') === 'Admin'));
  assert.equal(host.querySelector('[aria-expanded]'), null, 'no disclosure trigger is drawn');
  assert.ok([...host.querySelectorAll('button')].some((el) => el.textContent?.includes('Users')), 'the collapsible\'s items render at the rail level');
});

test('toggle does not fire while collapsed', () => {
  const seen: boolean[] = [];
  rail((open) => seen.push(open));
  assert.deepEqual(seen, []);
});

test('an item with no icon is refused while collapsed, naming its id', () => {
  assert.throws(() => mount(<ArenaSideNav ariaLabel="Primary" collapsed><ArenaSideNavItem id="blank" label="Blank" /></ArenaSideNav>), /blank/);
});
