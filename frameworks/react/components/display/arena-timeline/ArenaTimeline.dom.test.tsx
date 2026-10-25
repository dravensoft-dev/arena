import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { join } from 'node:path';
import { mount, cleanup } from '../../../test/Harness.tsx';
import { assertPattern, REACT_COMPONENTS } from '../../../test/AssertPattern.tsx';
import { ArenaTimeline } from './ArenaTimeline.tsx';

afterEach(cleanup);

const ORDER = [
  { title: 'Order placed', time: 'Mar 3', dateTime: '2026-03-03' },
  { title: 'Payment captured', tone: 'success' as const },
  { title: 'Delivery', tone: 'danger' as const },
];

test('nothing in a timeline takes focus, so it adds no tab stop and no key', () => {
  const root = mount(<ArenaTimeline label="Order 4821" items={ORDER} index={1} />);
  assert.equal(root.querySelector('a, button, input, [tabindex]'), null);
});

test('ArenaTimeline binds none, and renders the list it claims', () => {
  const root = mount(<ArenaTimeline label="Order 4821" items={ORDER} index={1} />);
  assertPattern({
    root,
    bindingPath: join(REACT_COMPONENTS, 'display', 'arena-timeline', 'ArenaTimeline.behaviour.json'),
    subjects: { default: root.querySelector<HTMLElement>('ol')! },
  });
  assert.equal(root.querySelectorAll('[aria-current="step"]').length, 1);
});
