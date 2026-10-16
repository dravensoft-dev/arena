import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import type { ArenaTimelineItem } from '../../../Api.generated';
import { ArenaTimeline, type ArenaTimelineProps } from './ArenaTimeline.tsx';

const ORDER: readonly ArenaTimelineItem[] = [
  { id: 'placed', title: 'Order placed', time: 'Mar 3', dateTime: '2026-03-03' },
  { id: 'paid', title: 'Payment captured', tone: 'success' },
  { id: 'held', title: 'Held at customs', time: 'Mar 5', tone: 'warning' },
  { id: 'delivered', title: 'Delivery', tone: 'danger', icon: 'ph-bold ph-truck' },
];
const draw = (props: Partial<ArenaTimelineProps> = {}) => renderToStaticMarkup(<ArenaTimeline label="Order 4821" items={ORDER} {...props} />);
const names = (html: string) => [...html.matchAll(/<li\b[^>]*>(.*?)<\/li>/g)].map((m) => /data-arena-part="timeline.name"[^>]*>([^<]*)</.exec(m[1]!)?.[1] ?? null);

test('the list is an ol with an explicit list role and its name, one li per milestone', () => {
  const html = draw();
  assert.match(html, /^<ol\b[^>]*role="list"[^>]*aria-label="Order 4821"/);
  assert.equal((html.match(/<li\b/g) ?? []).length, 4);
});

test('with no index every milestone is complete and silent, and none is current', () => {
  const html = draw();
  assert.deepEqual(names(html), [null, null, null, null]);
  assert.doesNotMatch(html, /aria-current/);
  assert.deepEqual(names(draw({ index: 99 })), [null, null, null, null]);
});

test('an index makes the milestones before it complete, it current and the rest upcoming, and only the last two speak', () => {
  const html = draw({ index: 2 });
  assert.deepEqual(names(html), [null, null, 'Current', 'Upcoming']);
  assert.deepEqual((html.match(/<li\b[^>]*>/g) ?? []).map((li) => /aria-current="step"/.test(li)), [false, false, true, false]);
  assert.deepEqual(names(draw({ index: -1 })), ['Current', 'Upcoming', 'Upcoming', 'Upcoming'], 'a negative index reads as the first');
});

test('a toned dot carries its glyph, an icon replaces it, and a neutral dot is plain', () => {
  const dots = [...draw().matchAll(/data-arena-part="timeline.dot"[^>]*>(.*?)<\/span>/g)].map((m) => m[1]!);
  assert.equal(dots[0], '');
  assert.match(dots[1]!, /ph-check-circle/);
  assert.match(dots[2]!, /ph-warning(?!-)/);
  assert.match(dots[3]!, /ph-truck/);
  assert.match(draw(), /<span aria-hidden="true"[^>]*data-arena-part="timeline.rail"/, 'the dot, the glyph and the connector are drawn, never read');
});

test('a time with a dateTime is a real time element, a time alone is text, and a dateTime alone draws nothing', () => {
  const html = draw();
  assert.match(html, /<time dateTime="2026-03-03"[^>]*>Mar 3<\/time>|<time datetime="2026-03-03"[^>]*>Mar 3<\/time>/);
  assert.match(html, /<span[^>]*data-arena-part="timeline.time"[^>]*>Mar 5<\/span>/);
  assert.equal((draw({ items: [{ title: 'Placed', dateTime: '2026-03-03' }] }).match(/timeline.time/g) ?? []).length, 0);
});

test('a connector joins each milestone to the next, and the last has none', () => {
  assert.equal((draw().match(/data-arena-part="timeline.connector"/g) ?? []).length, 3);
});

test('an empty list draws nothing, and a blank label throws', () => {
  assert.equal(draw({ items: [] }), '');
  assert.throws(() => draw({ label: ' ' }), /^Error: ArenaTimeline: `label`/);
});
