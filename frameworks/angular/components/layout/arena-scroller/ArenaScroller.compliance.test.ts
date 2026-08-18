/* The `scrollable-region` pattern asks for a group role, a name and a tab stop. The first two are
 * decidable from the rendered tree and assertPattern reads them; the third is behavioural, so it
 * is asserted by hand: happy-dom has no sequential focus navigation, and a test leaning on it
 * would pass identically against a real tab stop and against none. What is real here is the
 * attribute and that the element answers .focus(), and both are checked. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ArenaScrollerBehaviour } from '../../../Api.generated';
import { ArenaScroller } from './ArenaScroller';
import { assertPattern, ANGULAR_COMPONENTS } from '../../../test/Compliance';

const BINDING = join(ANGULAR_COMPONENTS, 'layout/arena-scroller/ArenaScroller.behaviour.json');

@Component({
  standalone: true,
  imports: [ArenaScroller],
  template: `
    <arena-scroller [label]="label" [behaviour]="behaviour" [itemWidth]="itemWidth">
      <span>One</span>
      <span>Two</span>
    </arena-scroller>
  `,
})
class ScrollerHost {
  label = 'Recently landed lots';
  behaviour: ArenaScrollerBehaviour = 'snap';
  itemWidth: string | undefined = undefined;
}

@Component({
  standalone: true,
  imports: [ArenaScroller],
  template: `<arena-scroller label="Recently landed lots" />`,
})
class EmptyHost {}

function render(patch: Partial<ScrollerHost> = {}) {
  const fixture = TestBed.createComponent(ScrollerHost);
  Object.assign(fixture.componentInstance, patch);
  fixture.detectChanges();
  return fixture;
}

const scrollerOf = (fixture: ReturnType<typeof render>) =>
  fixture.nativeElement.querySelector('arena-scroller') as HTMLElement;

test('arena-scroller meets the scrollable-region pattern it binds', () => {
  const fixture = render();
  try {
    const scroller = scrollerOf(fixture);
    assert.equal(scroller.getAttribute('role'), 'group');
    assert.equal(scroller.getAttribute('aria-label'), 'Recently landed lots');

    scroller.focus();
    const takesFocus = scroller.ownerDocument.activeElement === scroller;

    assertPattern({
      root: scroller,
      bindingPath: BINDING,
      subjects: { default: scroller },
      behavioural: { 'focus.stop': scroller.getAttribute('tabindex') === '0' && takesFocus },
    });
  } finally { fixture.destroy(); }
});

test('the container is the tab stop, and it is the only one the row adds', () => {
  const fixture = render();
  try {
    const scroller = scrollerOf(fixture);
    assert.equal(scroller.getAttribute('tabindex'), '0',
      'content past the right edge belongs to the pointer alone without this');
    assert.equal(scroller.querySelectorAll('[tabindex]').length, 0,
      'a stop per item would make a row of ten cards ten stops on the way past it');

    scroller.focus();
    assert.equal(scroller.ownerDocument.activeElement, scroller,
      'the row declares a tab stop it does not actually take');
  } finally { fixture.destroy(); }
});

test('the item width reaches the children as a property, and defaults to the grid role', () => {
  const fixture = render();
  try {
    assert.equal(scrollerOf(fixture).style.getPropertyValue('--arena-scroller-item'), 'var(--grid-min)');
  } finally { fixture.destroy(); }

  const given = render({ itemWidth: 'calc(var(--sp-1) * 62)' });
  try {
    assert.equal(scrollerOf(given).style.getPropertyValue('--arena-scroller-item'), 'calc(var(--sp-1) * 62)');
  } finally { given.destroy(); }
});

test('a label of nothing but spaces is refused, because a present and useless name is what the guard is for', () => {
  const fixture = TestBed.createComponent(ScrollerHost);
  fixture.componentInstance.label = '   ';
  try {
    assert.throws(() => fixture.detectChanges(), /`label` is required/);
  } finally { fixture.destroy(); }
});

test('a row with no children is refused, because it would be a tab stop over nothing', () => {
  const fixture = TestBed.createComponent(EmptyHost);
  try {
    assert.throws(() => fixture.detectChanges(), /tab stop over nothing/);
  } finally { fixture.destroy(); }
});

test('nothing in the row animates, so no pause control is owed under either behaviour', () => {
  for (const behaviour of ['snap', 'flow'] as const) {
    const fixture = render({ behaviour });
    try {
      const scroller = scrollerOf(fixture);
      assert.equal(scroller.querySelectorAll('[aria-live]').length, 0);
      assert.equal(scroller.querySelectorAll('button, [role="button"]').length, 0,
        `${behaviour} rendered a control, and the only one this component could owe is a pause `
        + 'control, which is owed only by something that moves');
    } finally { fixture.destroy(); }
  }
});
