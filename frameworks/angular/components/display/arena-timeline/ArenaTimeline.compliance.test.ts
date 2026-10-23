/* arena-timeline binds none: a named ordered list nobody operates. The binding verifies nothing,
 * so the semantics are asserted here directly: the list role and its name, aria-current on one item
 * at most, the dot hidden from a reader, and no element that takes focus. */
import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ArenaTimelineItem } from '../../../Api.generated';
import { assertNoNode } from '../../../test/NodeAssert';
import { assertPattern, ANGULAR_COMPONENTS } from '../../../test/Compliance';
import { ArenaTimeline } from './ArenaTimeline';

const BINDING = join(ANGULAR_COMPONENTS, 'display/arena-timeline/ArenaTimeline.behaviour.json');

@Component({
  selector: 'timeline-compliance-host',
  standalone: true,
  imports: [ArenaTimeline],
  template: `<arena-timeline label="Order 4821" [items]="items" [index]="1" />`,
})
class TimelineHost {
  items: readonly ArenaTimelineItem[] = [
    { title: 'Order placed', time: 'Mar 3', dateTime: '2026-03-03' },
    { title: 'Payment captured', tone: 'success' },
    { title: 'Delivery', tone: 'danger' },
  ];
}

test('arena-timeline binds none, and renders the named list it claims with one current item', () => {
  const fixture = TestBed.createComponent(TimelineHost);
  try {
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const list = root.querySelector('ol') as HTMLElement;
    assertPattern({ root, bindingPath: BINDING, subjects: { default: list } });
    assert.equal(list.getAttribute('role'), 'list', 'a list with list-style none loses its role in WebKit without one');
    assert.equal(list.getAttribute('aria-label'), 'Order 4821');
    assert.deepEqual(Array.from(list.querySelectorAll('li')).map((li) => li.getAttribute('aria-current')), [null, 'step', null]);
    assert.ok(Array.from(root.querySelectorAll('[data-arena-part="timeline.rail"]')).every((r) => r.getAttribute('aria-hidden') === 'true'));
    assertNoNode(root.querySelector('a, button, input, [tabindex]'), 'a timeline reports, so nothing in it takes focus');
  } finally {
    fixture.destroy();
  }
});
