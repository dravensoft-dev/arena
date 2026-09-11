import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ArenaSideNav } from './ArenaSideNav';
import { ArenaSideNavItem } from '../arena-side-nav-item/ArenaSideNavItem';
import { ArenaSideNavSection } from '../arena-side-nav-section/ArenaSideNavSection';
import { ArenaSideNavCollapsible } from '../arena-side-nav-collapsible/ArenaSideNavCollapsible';

@Component({
  standalone: true,
  imports: [ArenaSideNav, ArenaSideNavItem, ArenaSideNavSection, ArenaSideNavCollapsible],
  template: `
    <arena-side-nav ariaLabel="Primary" [collapsed]="true" active="orders">
      <arena-side-nav-item id="home" label="Home" icon="ph-bold ph-house" />
      <arena-side-nav-section label="Sales">
        <arena-side-nav-item id="orders" label="Orders" icon="ph-bold ph-receipt" [badge]="12" />
      </arena-side-nav-section>
      <arena-side-nav-collapsible id="admin" label="Admin" icon="ph-bold ph-gear" (toggle)="toggled.push($event)">
        <arena-side-nav-item id="users" label="Users" icon="ph-bold ph-users" />
      </arena-side-nav-collapsible>
    </arena-side-nav>`,
})
class RailHost { toggled: boolean[] = []; }

@Component({
  standalone: true,
  imports: [ArenaSideNav, ArenaSideNavItem],
  template: `<arena-side-nav ariaLabel="Primary" [collapsed]="true"><arena-side-nav-item id="blank" label="Blank" /></arena-side-nav>`,
})
class BlankHost {}

function render() {
  const fixture = TestBed.createComponent(RailHost);
  fixture.detectChanges();
  return { fixture, root: fixture.nativeElement as HTMLElement };
}

const rowNamed = (root: HTMLElement, word: string) =>
  [...root.querySelectorAll('button, a')].find((el) => el.textContent?.includes(word)) as HTMLElement;

test('an icon-only item keeps its label, and its badge count, as its accessible name', () => {
  const { fixture, root } = render();
  try {
    const orders = rowNamed(root, 'Orders');
    assert.equal(orders.textContent?.replace(/\s+/g, ' ').trim(), 'Orders 12');
    assert.ok(orders.querySelector('[aria-hidden="true"]'), 'the dot is drawn and hidden');
  } finally { fixture.destroy(); }
});

test('focusing an item shows its label as a tooltip that adds no description', () => {
  const { fixture, root } = render();
  try {
    const home = rowNamed(root, 'Home');
    home.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    fixture.detectChanges();
    const id = home.getAttribute('aria-describedby');
    const bubble = id ? document.getElementById(id) : null;
    assert.ok(bubble, 'the row references its bubble');
    assert.equal(bubble.textContent?.trim(), 'Home');
    assert.ok(bubble.querySelector('[aria-hidden="true"]'));
  } finally { fixture.destroy(); }
});

test('a section keeps its label as the group name, and a collapsible flattens under a separator', () => {
  const { fixture, root } = render();
  try {
    const groups = [...root.querySelectorAll('[role="group"]')];
    assert.ok(groups.some((g) => document.getElementById(g.getAttribute('aria-labelledby') ?? '')?.textContent?.trim() === 'Sales'));
    assert.ok(groups.some((g) => g.getAttribute('aria-label') === 'Admin'));
    assert.equal(root.querySelector('[aria-expanded]'), null, 'no disclosure trigger is drawn');
    assert.ok(rowNamed(root, 'Users'), 'the collapsible\'s items render at the rail level');
  } finally { fixture.destroy(); }
});

test('toggle does not fire while collapsed', () => {
  const { fixture } = render();
  try {
    assert.deepEqual(fixture.componentInstance.toggled, []);
  } finally { fixture.destroy(); }
});

test('an item with no icon is refused while collapsed, naming its id', () => {
  const fixture = TestBed.createComponent(BlankHost);
  try {
    assert.throws(() => fixture.detectChanges(), /blank/);
  } finally { fixture.destroy(); }
});
