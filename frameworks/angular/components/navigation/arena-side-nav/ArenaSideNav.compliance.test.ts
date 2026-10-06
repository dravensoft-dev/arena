/* `navigation` is two decidable requirements, so no `behavioural` map. What this file really
 * has to prove is the thing the family is built on and no gate can see: in Angular the depth
 * is PULLED through a provided state object rather than PUSHED by cloneElement, so an item
 * reads its own indent from the nearest ancestor container. The item suite next door proves
 * the leaf; this one proves the landmark and the seeding. */
import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { assertPattern, ANGULAR_COMPONENTS } from '../../../test/Compliance';
import { ArenaSideNavItem } from '../arena-side-nav-item/ArenaSideNavItem';
import { ArenaSideNav } from './ArenaSideNav';
import { arenaIndentDepth } from './ArenaSideNavState';

const BINDING = join(ANGULAR_COMPONENTS, 'navigation/arena-side-nav/ArenaSideNav.behaviour.json');

@Component({
  standalone: true,
  imports: [ArenaSideNav, ArenaSideNavItem],
  template: `
    <arena-side-nav [ariaLabel]="label" [active]="active()" [indentStep]="indentStep()" [collapsed]="collapsed()"
                    (nav)="chosen.push($event)">
      <arena-side-nav-item id="projects" label="Projects" icon="ph-bold ph-squares-four" href="#projects" />
      <arena-side-nav-item id="settings" label="Settings" icon="ph-bold ph-gear" />
    </arena-side-nav>
  `,
})
class SideNavHost {
  readonly label = 'Primary';
  readonly active = signal<string | undefined>('projects');
  readonly indentStep = signal(3);
  readonly collapsed = signal(false);
  readonly chosen: string[] = [];
}

function render() {
  const fixture = TestBed.createComponent(SideNavHost);
  fixture.detectChanges();
  const nav = fixture.nativeElement.querySelector('arena-side-nav') as HTMLElement;
  return { fixture, nav };
}

test('arena-side-nav meets the navigation pattern it binds', () => {
  const { fixture, nav } = render();
  try {
    assert.equal(nav.getAttribute('role'), 'navigation');
    assert.equal(nav.getAttribute('aria-label'), 'Primary');
    assertPattern({ root: nav, bindingPath: BINDING });
  } finally {
    fixture.destroy();
  }
});

test('the landmark refuses a blank name at runtime, because a required input is not a guard', () => {
  @Component({ standalone: true, imports: [ArenaSideNav], template: `<arena-side-nav ariaLabel=" " />` })
  class BlankHost {}

  const fixture = TestBed.createComponent(BlankHost);
  try {
    assert.throws(() => fixture.detectChanges(), /ariaLabel/);
  } finally {
    fixture.destroy();
  }
});

test('an item reports through the nav\'s own output, carrying its id and nothing else', () => {
  const { fixture, nav } = render();
  try {
    const settings = nav.querySelector('button') as HTMLButtonElement;
    settings.click();
    assert.deepEqual(fixture.componentInstance.chosen, ['settings'],
      'nav carries the id, not the event and not the element');
  } finally {
    fixture.destroy();
  }
});

test('exactly one row is current, and it moves when active moves', () => {
  const { fixture, nav } = render();
  try {
    assert.equal(nav.querySelectorAll('[aria-current="page"]').length, 1);
    assert.equal((nav.querySelector('[aria-current="page"]') as HTMLElement).tagName, 'A');

    fixture.componentInstance.active.set('settings');
    fixture.detectChanges();
    const current = nav.querySelectorAll('[aria-current="page"]');
    assert.equal(current.length, 1, 'aria-current is a claim about one destination, never two');
    assert.equal((current[0] as HTMLElement).tagName, 'BUTTON');

    fixture.componentInstance.active.set(undefined);
    fixture.detectChanges();
    assert.equal(nav.querySelectorAll('[aria-current="page"]').length, 0,
      'with nothing active the attribute is absent rather than false');
  } finally {
    fixture.destroy();
  }
});

test('a root-level row binds the depth channel to 0 and carries no inline padding, and a collapsed nav binds none', () => {
  const { fixture, nav } = render();
  try {
    const row = nav.querySelector('a') as HTMLElement;
    assert.equal(row.style.getPropertyValue('--arena-side-nav-depth'), '0',
      'depth 0 binds a zero channel');
    assert.equal(row.style.getPropertyValue('padding-inline-start'), '', 'the inset is the theme\'s, never an inline length');

    fixture.componentInstance.indentStep.set(5);
    fixture.detectChanges();
    assert.equal(row.style.getPropertyValue('--arena-side-nav-depth'), '0',
      'a multiplier changes nothing at depth 0, because it multiplies the depth');

    fixture.componentInstance.collapsed.set(true);
    fixture.detectChanges();
    const railRow = nav.querySelector('a') as HTMLElement;
    assert.equal(railRow.style.getPropertyValue('--arena-side-nav-depth'), '',
      'a collapsed nav leaves the channel unbound');
  } finally {
    fixture.destroy();
  }
});

test('arenaIndentDepth multiplies the step by the depth and returns a number', () => {
  assert.equal(arenaIndentDepth(3, 0), 0);
  assert.equal(arenaIndentDepth(3, 1), 3);
  assert.equal(arenaIndentDepth(3, 2), 6);
  assert.equal(arenaIndentDepth(5, 1), 5);
  assert.equal(arenaIndentDepth(3, 5), 15);
  assert.equal(typeof arenaIndentDepth(3, 5), 'number');
});

test('an item with href renders an anchor and one without renders a button, and both are the same row', () => {
  const { fixture, nav } = render();
  try {
    const anchor = nav.querySelector('a') as HTMLAnchorElement;
    const button = nav.querySelector('button') as HTMLButtonElement;
    assert.equal(anchor.getAttribute('href'), '#projects');
    assert.equal(button.getAttribute('type'), 'button');
    assert.ok(anchor.className.split(/\s+/).includes('arena-side-nav__item--current-true'),
      'the active row is inked');
    assert.ok(anchor.querySelector('i[aria-hidden="true"]'), 'the icon is a glyph Arena draws, not projected content');
  } finally {
    fixture.destroy();
  }
});
