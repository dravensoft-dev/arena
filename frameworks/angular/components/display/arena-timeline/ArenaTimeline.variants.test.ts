/* What arena-timeline draws from its items and its index: the states and their words, the glyphs,
 * the time element, the connectors and the guard. */
import { useTestEnvironment, glyphIds, symbol } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TAILWIND_COMPONENTS } from '../../../test/Compliance';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ArenaTimelineItem } from '../../../Api.generated';
import { assertNoNode } from '../../../test/NodeAssert';
import { ArenaTimeline } from './ArenaTimeline';

const ORDER: readonly ArenaTimelineItem[] = [
  { id: 'placed', title: 'Order placed', time: 'Mar 3', dateTime: '2026-03-03' },
  { id: 'paid', title: 'Payment captured', tone: 'success' },
  { id: 'held', title: 'Held at customs', time: 'Mar 5', tone: 'warning' },
  { id: 'delivered', title: 'Delivery', tone: 'danger', icon: 'ph-bold ph-truck' },
];

@Component({
  selector: 'timeline-variants-host',
  standalone: true,
  imports: [ArenaTimeline],
  template: `<arena-timeline [label]="label" [items]="items" [index]="index" />`,
})
class VariantsHost {
  label = 'Order 4821';
  items: readonly ArenaTimelineItem[] = ORDER;
  index: number | undefined = undefined;
}

function render(patch: Partial<VariantsHost> = {}) {
  const fixture = TestBed.createComponent(VariantsHost);
  Object.assign(fixture.componentInstance, patch);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const words = () => Array.from(root.querySelectorAll('li')).map((li) => li.querySelector('[data-arena-part="timeline.name"]')?.textContent ?? null);
  return { fixture, root, words };
}

test('with no index every milestone is complete and silent, and none is current', () => {
  for (const index of [undefined, 99]) {
    const { fixture, root, words } = render({ index });
    try {
      assert.deepEqual(words(), [null, null, null, null], String(index));
      assertNoNode(root.querySelector('[aria-current]'), 'a history has no current milestone');
    } finally {
      fixture.destroy();
    }
  }
});

test('an index makes the milestones before it complete, it current and the rest upcoming, and only the last two speak', () => {
  for (const [index, want] of [[2, [null, null, 'Current', 'Upcoming']], [-1, ['Current', 'Upcoming', 'Upcoming', 'Upcoming']]] as const) {
    const { fixture, words } = render({ index });
    try {
      assert.deepEqual(words(), want, String(index));
    } finally {
      fixture.destroy();
    }
  }
});

test('a toned dot carries its glyph, an icon replaces it, and a neutral dot is plain', () => {
  const { fixture, root } = render();
  try {
    const dots = Array.from(root.querySelectorAll('[data-arena-part="timeline.dot"]'));
    assertNoNode(dots[0]!.querySelector('svg'), 'a neutral dot draws no glyph');
    assert.deepEqual(glyphIds(dots[1]!), [symbol('fill', 'check-circle')]);
    assert.deepEqual(glyphIds(dots[2]!), [symbol('fill', 'warning')]);
    assert.deepEqual(glyphIds(dots[3]!), [symbol('bold', 'truck')]);
    assert.equal(root.querySelectorAll('[data-arena-part="timeline.connector"]').length, 3, 'the last milestone has no connector');
  } finally {
    fixture.destroy();
  }
});

test('a time with a dateTime is a real time element, a time alone is text, and a dateTime alone draws nothing', () => {
  const { fixture, root } = render();
  try {
    const times = Array.from(root.querySelectorAll('[data-arena-part="timeline.time"]'));
    assert.deepEqual(times.map((t) => [t.tagName, t.getAttribute('datetime'), t.textContent]), [['TIME', '2026-03-03', 'Mar 3'], ['SPAN', null, 'Mar 5']]);
  } finally {
    fixture.destroy();
  }
  const bare = render({ items: [{ title: 'Placed', dateTime: '2026-03-03' }] });
  try {
    assertNoNode(bare.root.querySelector('[data-arena-part="timeline.time"]'), 'a dateTime with no time draws nothing');
  } finally {
    bare.fixture.destroy();
  }
});

test('an empty list draws nothing, and a blank label throws', () => {
  const empty = render({ items: [] });
  try {
    assertNoNode(empty.root.querySelector('ol'), 'an empty list draws nothing');
  } finally {
    empty.fixture.destroy();
  }
  const fixture = TestBed.createComponent(VariantsHost);
  fixture.componentInstance.label = ' ';
  try {
    assert.throws(() => fixture.detectChanges(), (error: Error) => /^ArenaTimeline: `label`/.test(error.message));
  } finally {
    fixture.destroy();
  }
});

test('the rail has no gap of its own and the connector reaches the next dot across the items gap, in both orientations', () => {
  const source = JSON.parse(readFileSync(join(TAILWIND_COMPONENTS, 'display/arena-timeline/ArenaTimeline.manifest.json'), 'utf8')) as { slots: Record<string, string> };
  const rail = source.slots['rail']!.split(/\s+/);
  assert.ok(rail.includes('gap-0'), source.slots['rail']);
  assert.ok(!rail.includes('gap-inline'), source.slots['rail']);
  const connector = source.slots['connector']!.split(/\s+/);
  assert.ok(connector.includes('[margin-block-end:calc(var(--gap-items)*-1*var(--arena-orientation-join-block,1))]'), source.slots['connector']);
  assert.ok(connector.includes('[margin-inline-end:calc(var(--gap-items)*-1*var(--arena-orientation-join-inline,0))]'), source.slots['connector']);
});

test('a one-milestone timeline draws no connector', () => {
  const { fixture, root } = render({ items: [{ title: 'Placed' }] });
  try {
    assertNoNode(root.querySelector('[data-arena-part="timeline.connector"]'), 'the only milestone has nothing to join');
  } finally {
    fixture.destroy();
  }
});
