/* The meter pattern on the element that carries it: the track, not the root grid, since the root
 * holds the head beside it. The three value states are behavioural because each is a value the
 * component computes, so they are earned by the assertions above the call. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import React from 'react';
import { mount, cleanup } from '../../../test/Harness.tsx';
import { assertPattern, REACT_COMPONENTS } from '../../../test/AssertPattern.tsx';
import { ArenaMeter } from './ArenaMeter.tsx';
import tailwind from './ArenaMeter.manifest.generated.ts';

afterEach(cleanup);

const BINDING = join(REACT_COMPONENTS, 'feedback/arena-meter/ArenaMeter.behaviour.json');

test('ArenaMeter meets the meter pattern on its track', () => {
  const root = mount(<ArenaMeter label="Storage used" value={72} low={50} high={80} optimum={0} valueText="72 of 100 GB" />);
  const meter = root.querySelector('[role="meter"]');
  assert.ok(meter, 'sanity: nothing rendered the meter element');
  assert.equal(meter.getAttribute('aria-valuenow'), '72');
  assert.equal(meter.getAttribute('aria-valuemin'), '0');
  assert.equal(meter.getAttribute('aria-valuemax'), '100');
  assert.equal(meter.getAttribute('aria-valuetext'), '72 of 100 GB, Fair');
  assertPattern({
    root,
    bindingPath: BINDING,
    subjects: { default: meter },
    behavioural: { 'states.valuenow': true, 'states.valuemin': true, 'states.valuemax': true },
  });
});

test('nothing in a meter is live, focusable or moving', () => {
  const root = mount(<ArenaMeter label="Storage used" value={72} />);
  assert.equal(root.querySelector('[aria-live]'), null, 'a static measurement announces nothing when it renders');
  assert.equal(root.querySelector('[tabindex]'), null, 'a meter is read and never operated, so a tab stop on it is dead');
  const fill = root.querySelector('[data-arena-part="meter.fill"]') as HTMLElement;
  assert.equal(fill.style.width, '72%');
  const motion = tailwind.slots.fill.split(/\s+/).filter((token) => /^(transition|animate-|duration-)/.test(token));
  assert.deepEqual(motion, [], 'a measurement is read at rest, so its fill is static and carries no transition or animation');
});
