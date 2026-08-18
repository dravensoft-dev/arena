/* `none` requires nothing, so assertPattern alone would pass over a cell that had grown a role
 * or a tab stop. The claim the binding makes is that the cell is a box and nothing else, and
 * that its HOST is that box rather than a display:contents element, which is the whole reason
 * the component exists. Both are what the hand assertions below check. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ArenaScrollerItem } from './ArenaScrollerItem';
import { assertPattern, isFocusable, ANGULAR_COMPONENTS } from '../../../test/Compliance';

const BINDING = join(ANGULAR_COMPONENTS, 'layout/arena-scroller-item/ArenaScrollerItem.behaviour.json');

@Component({
  standalone: true,
  imports: [ArenaScrollerItem],
  template: `<arena-scroller-item><span>One</span></arena-scroller-item>`,
})
class ItemHost {}

function render() {
  const fixture = TestBed.createComponent(ItemHost);
  fixture.detectChanges();
  return fixture;
}

const itemOf = (fixture: ReturnType<typeof render>) =>
  fixture.nativeElement.querySelector('arena-scroller-item') as HTMLElement;

test('the cell is a box and nothing else', () => {
  const fixture = render();
  try {
    const item = itemOf(fixture);
    assert.equal(item.getAttribute('role'), null);
    assert.equal(item.querySelectorAll('[tabindex]').length, 0);
    for (const el of [item, ...Array.from(item.querySelectorAll('*'))]) {
      assert.equal(isFocusable(el as Element), false,
        `<${el.tagName.toLowerCase()}> inside a cell is reachable by keyboard, so a user tabs to something inert`);
    }

    assertPattern({ root: item, bindingPath: BINDING, subjects: { default: item } });
  } finally { fixture.destroy(); }
});

test('the host carries the class itself, because a cell with no box is the hazard this closes', () => {
  const fixture = render();
  try {
    const item = itemOf(fixture);
    assert.ok((item.getAttribute('class') ?? '').trim().length > 0,
      'the cell has to be the layout target, and a class on an inner element would not be one');
    assert.ok(!/display:\s*contents/.test(item.getAttribute('style') ?? ''),
      'a host taken out of layout is exactly what a rule aimed at a row\'s children cannot size');
    assert.equal(item.children.length, 1, 'the cell wraps what it was given and adds no box of its own');
  } finally { fixture.destroy(); }
});
