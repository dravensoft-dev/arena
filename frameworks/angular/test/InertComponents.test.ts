/* The counterpart of every layer's inert-component suite, for the reason the pattern gives: `none` says "a component with
 * no interactive affordance: it renders, and a user cannot act on it", its `requires` is empty,
 * and binding it therefore verifies NOTHING -- which is why every component here sat outside
 * COVERED. Each renders with no projected content and is asserted INERT, the sentence the
 * pattern's own description makes and no requirement can. ArenaSideNavSection cannot stand alone: it
 * pulls ArenaSideNavState from the nearest arena-side-nav, and its items are its CONTENT, so its entry
 * excludes that subtree -- the claim is about the affordance the component introduces, never
 * about what a consumer puts inside it. */

import { useTestEnvironment } from './TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ArenaAppLogo } from '../components/brand/arena-app-logo/ArenaAppLogo';
import { ArenaAvatar } from '../components/display/arena-avatar/ArenaAvatar';
import { ArenaStatCard } from '../components/display/arena-stat-card/ArenaStatCard';
import { ArenaUnauthCard } from '../components/display/arena-unauth-card/ArenaUnauthCard';
import { ArenaChartCard } from '../components/charts/arena-chart-card/ArenaChartCard';
import { ArenaEmptyState } from '../components/feedback/arena-empty-state/ArenaEmptyState';
import { ArenaPageHead } from '../components/navigation/arena-page-head/ArenaPageHead';
import { ArenaSideNav } from '../components/navigation/arena-side-nav/ArenaSideNav';
import { ArenaSideNavItem } from '../components/navigation/arena-side-nav-item/ArenaSideNavItem';
import { ArenaSideNavSection } from '../components/navigation/arena-side-nav-section/ArenaSideNavSection';
import { assertPattern, ANGULAR_COMPONENTS } from './Compliance';

const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex], [contenteditable]';
const INTERACTIVE_ROLE = [
  'button', 'link', 'checkbox', 'radio', 'switch', 'tab', 'menuitem', 'option',
  'textbox', 'combobox', 'slider', 'spinbutton', 'gridcell',
];

export function inertProblems(root: Element, exclude = ''): string[] {
  const problems: string[] = [];
  const own = (el: Element) => !exclude || !el.closest(exclude);
  for (const el of [...root.querySelectorAll(FOCUSABLE)].filter(own)) {
    problems.push(`renders a focusable <${el.tagName.toLowerCase()}> of its own`);
  }
  for (const el of [...root.querySelectorAll('[role]')].filter(own)) {
    const role = el.getAttribute('role') ?? '';
    if (INTERACTIVE_ROLE.includes(role)) problems.push(`renders role="${role}"`);
  }
  return problems;
}

@Component({
  standalone: true,
  imports: [ArenaAppLogo, ArenaAvatar, ArenaStatCard, ArenaUnauthCard, ArenaChartCard, ArenaEmptyState, ArenaPageHead, ArenaSideNav, ArenaSideNavItem, ArenaSideNavSection],
  template: `
    <arena-app-logo name="Dravensoft" />
    <arena-avatar name="Ada Lovelace" />
    <arena-stat-card label="Uptime" value="99.98%" />
    <arena-unauth-card title="Sign in" />
    <arena-chart-card title="Latency" />
    <arena-empty-state title="Nothing here yet" />
    <arena-page-head title="Projects" />
    <arena-side-nav ariaLabel="Workspace navigation">
      <arena-side-nav-section label="Workspace">
        <arena-side-nav-item id="overview" label="Overview" href="/overview" />
      </arena-side-nav-section>
    </arena-side-nav>
  `,
})
class InertHost {}

const INERT: Array<[string, string, string?]> = [
  ['arena-app-logo', 'brand/arena-app-logo/ArenaAppLogo.behaviour.json'],
  ['arena-avatar', 'display/arena-avatar/ArenaAvatar.behaviour.json'],
  ['arena-stat-card', 'display/arena-stat-card/ArenaStatCard.behaviour.json'],
  ['arena-unauth-card', 'display/arena-unauth-card/ArenaUnauthCard.behaviour.json'],
  ['arena-chart-card', 'charts/arena-chart-card/ArenaChartCard.behaviour.json'],
  ['arena-empty-state', 'feedback/arena-empty-state/ArenaEmptyState.behaviour.json'],
  ['arena-page-head', 'navigation/arena-page-head/ArenaPageHead.behaviour.json'],
  ['arena-side-nav-section', 'navigation/arena-side-nav-section/ArenaSideNavSection.behaviour.json', 'arena-side-nav-item'],
];

test('every component binding "none" in this layer is actually inert', () => {
  const fixture = TestBed.createComponent(InertHost);
  fixture.detectChanges();
  try {
    const host = fixture.nativeElement as Element;
    assert.ok(INERT.length >= 8, 'the inert set lost an entry -- a component leaving it should leave by changing its binding');

    for (const [selector, tail, exclude] of INERT) {
      const el = host.querySelector(selector) as Element;
      assert.ok(el, `${selector} did not render, so this entry proved nothing`);
      assert.deepEqual(
        inertProblems(el, exclude), [],
        `${selector} binds "none", whose description is "a component with no interactive affordance: it renders, `
        + 'and a user cannot act on it". That pattern requires nothing, so the binding alone asserts none of it. This does.',
      );
      assertPattern({ root: el, bindingPath: join(ANGULAR_COMPONENTS, tail), subjects: { default: el } });
    }
  } finally {
    fixture.destroy();
  }
});

test('a focusable element inside the render is what this suite exists to catch', () => {
  const doc = document.implementation.createHTMLDocument();
  const root = doc.createElement('div');
  root.innerHTML = '<button type="button">Retry</button>';
  assert.notDeepEqual(inertProblems(root), [],
    'the check must see a real button, or it sees nothing');
});

test('an avatar image reserves its own box before the stylesheet arrives', () => {
  const fixture = TestBed.createComponent(ArenaAvatar);
  try {
    fixture.componentRef.setInput('name', 'Ada Lovelace');
    fixture.componentRef.setInput('src', '/ada.png');
    fixture.componentRef.setInput('size', 'lg');
    fixture.detectChanges();

    const image = (fixture.nativeElement as Element).querySelector('img');
    assert.ok(image);
    assert.equal(image.getAttribute('width'), '56',
      'the lg diameter, read from the token rather than restated here');
    assert.equal(image.getAttribute('height'), '56');
    assert.equal(image.getAttribute('decoding'), 'async');
    assert.equal(image.getAttribute('loading'), null,
      'deliberately absent: an avatar above the fold should not be deferred and the component '
      + 'cannot know where it sits, so exposing the choice would be a capability and would go '
      + 'through the audit protocol rather than through a defect');
  } finally {
    fixture.destroy();
  }
});

test('the reserved box is the drawn box at every size', () => {
  for (const [size, px] of [['xs', 24], ['sm', 32], ['md', 40], ['lg', 56]] as const) {
    const fixture = TestBed.createComponent(ArenaAvatar);
    try {
      fixture.componentRef.setInput('name', 'Ada');
      fixture.componentRef.setInput('src', '/ada.png');
      fixture.componentRef.setInput('size', size);
      fixture.detectChanges();
      assert.equal((fixture.nativeElement as Element).querySelector('img')?.getAttribute('width'), String(px),
        'the class sizes the box and the attribute reserves it, and the two disagreeing is a '
        + 'shift that only appears on a slow stylesheet, which is where nobody looks');
    } finally {
      fixture.destroy();
    }
  }
});
