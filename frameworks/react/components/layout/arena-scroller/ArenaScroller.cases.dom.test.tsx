/* The `scrollable-region` pattern asks for three things, and two of them are decidable from the
 * rendered tree: the group role and the accessible name. The third, that the container is itself
 * in the tab order, is behavioural, so it is asserted by hand here rather than through the
 * pattern: happy-dom has no sequential focus navigation, and a test that leaned on it would pass
 * identically against a real tab stop and against none. What IS real is that the element carries
 * tabindex and answers .focus(), and both are checked. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import React from 'react';
import { mount, cleanup } from '../../../test/Harness.tsx';
import { assertPattern, REACT_COMPONENTS } from '../../../test/AssertPattern.tsx';
import { ArenaScroller } from './ArenaScroller.tsx';

afterEach(cleanup);

const BINDING = join(REACT_COMPONENTS, 'layout/arena-scroller/ArenaScroller.behaviour.json');

const row = (
  <ArenaScroller label="Recently landed lots">
    <span>One</span>
    <span>Two</span>
  </ArenaScroller>
);

const scrollerIn = (root: ParentNode) => root.querySelector('[role="group"]') as HTMLElement;

test('the row meets the scrollable-region pattern it binds', () => {
  const root = mount(row);
  const scroller = scrollerIn(root);
  assert.ok(scroller, 'the row renders no group at all');

  scroller.focus();
  const takesFocus = root.ownerDocument?.activeElement === scroller;

  assertPattern({
    root: scroller,
    bindingPath: BINDING,
    subjects: { default: scroller },
    behavioural: { 'focus.stop': scroller.getAttribute('tabindex') === '0' && takesFocus },
  });
});

test('the container is the tab stop, and it is the only one the row adds', () => {
  const root = mount(row);
  const scroller = scrollerIn(root);

  assert.equal(scroller.getAttribute('tabindex'), '0',
    'content past the right edge belongs to the pointer alone without this');
  assert.equal(scroller.querySelectorAll('[tabindex]').length, 0,
    'a stop per item would make a row of ten cards ten stops on the way past it');

  scroller.focus();
  assert.equal(root.ownerDocument?.activeElement, scroller,
    'the row declares a tab stop it does not actually take');
});

test('the name comes from the label and never from the items inside it', () => {
  const root = mount(row);
  const scroller = scrollerIn(root);

  assert.equal(scroller.getAttribute('aria-label'), 'Recently landed lots');
  assert.equal(scroller.getAttribute('aria-labelledby'), null,
    'nothing inside a row of cards is the name of the row');
});

test('nothing in the row animates, so no pause control is owed', () => {
  for (const behaviour of ['snap', 'flow'] as const) {
    const root = mount(
      <ArenaScroller label="Recently landed lots" behaviour={behaviour}><span>One</span></ArenaScroller>,
    );
    const scroller = scrollerIn(root);
    assert.equal(scroller.querySelectorAll('[aria-live]').length, 0);
    assert.equal(
      scroller.querySelectorAll('button, [role="button"]').length, 0,
      `${behaviour} rendered a control, and the only control this component could owe is a pause `
      + 'one, which is owed only by something that moves',
    );
    cleanup();
  }
});
