import test from 'node:test';
import assert from 'node:assert/strict';
import { renderIcons, symbols } from '../../../test/IconsHarness.tsx';
import React from 'react';
import { ArenaStepper, type ArenaStepperProps } from './ArenaStepper.tsx';

const CHECKOUT = [{ label: 'Account' }, { label: 'Shipping', description: 'Two addresses on file' }, { label: 'Payment' }, { label: 'Review' }];
const draw = (props: Partial<ArenaStepperProps> = {}) => renderIcons(<ArenaStepper ariaLabel="Checkout" steps={CHECKOUT} {...props} />);
const items = (html: string) => html.match(/<li\b[^>]*>/g) ?? [];
const names = (html: string) => [...html.matchAll(/data-arena-part="stepper.name"[^>]*>([^<]*)</g)].map((m) => m[1]);

test('the list is an ol with an explicit list role, named by ariaLabel, one li per step', () => {
  const html = draw();
  assert.match(html, /^<ol\b[^>]*role="list"[^>]*aria-label="Checkout"/);
  assert.equal(items(html).length, 4);
});

test('one item carries aria-current, the one index names', () => {
  const current = items(draw({ index: 2 })).map((li) => /aria-current="step"/.test(li));
  assert.deepEqual(current, [false, false, true, false]);
});

test('every state is spoken before its label, and an error adds its own word', () => {
  assert.deepEqual(names(draw({ index: 1 })), ['Completed', 'Current step', 'Upcoming', 'Upcoming']);
  const steps = CHECKOUT.map((s, i) => (i === 3 ? { ...s, error: true } : s));
  assert.deepEqual(names(draw({ index: 1, steps })), ['Completed', 'Current step', 'Upcoming', 'Upcoming, Error']);
  const spoken = draw().match(/data-arena-part="stepper\.text"[^>]*><span[^>]*data-arena-part="stepper\.name"[^>]*>[^<]*<\/span><span[^>]*data-arena-part="stepper\.label"/g) ?? [];
  assert.equal(spoken.length, 4, 'on every step the state word comes first in the text, then the label');
});

test('an index past the end completes every step and marks none current; a negative one reads as the first', () => {
  const done = draw({ index: 9 });
  assert.deepEqual(names(done), ['Completed', 'Completed', 'Completed', 'Completed']);
  assert.doesNotMatch(done, /aria-current/);
  assert.deepEqual(names(draw({ index: -3 })), ['Current step', 'Upcoming', 'Upcoming', 'Upcoming']);
  assert.deepEqual(names(draw({ index: Number.NaN })), ['Current step', 'Upcoming', 'Upcoming', 'Upcoming']);
});

test('a complete marker draws a check, an error marker a warning glyph, and the rest their number', () => {
  const steps = CHECKOUT.map((s, i) => (i === 2 ? { ...s, error: true } : s));
  const html = draw({ index: 1, steps });
  const markers = [...html.matchAll(/data-arena-part="stepper.marker"[^>]*>(.*?)<\/span>/g)].map((m) => m[1]!);
  assert.deepEqual(symbols(markers[0]!), ['bold-check']);
  assert.equal(markers[1], '2');
  assert.deepEqual(symbols(markers[2]!), ['fill-warning-circle']);
  assert.equal(markers[3], '4');
  assert.match(html, /<span aria-hidden="true"[^>]*data-arena-part="stepper.rail"/, 'the marker and the connector are drawn, never read');
});

test('a connector joins each step to the next, and the last step has none', () => {
  assert.equal((draw().match(/data-arena-part="stepper.connector"/g) ?? []).length, 3);
});

test('only the steps behind the current one are buttons, and only when interactive', () => {
  assert.equal((draw({ index: 2 }).match(/<button\b/g) ?? []).length, 0);
  const html = draw({ index: 2, interactive: true });
  assert.equal((html.match(/<button\b/g) ?? []).length, 2);
  assert.doesNotMatch(html, /disabled/, 'a step ahead is text, never a disabled button');
});

test('an empty list draws nothing, and a blank ariaLabel throws', () => {
  assert.equal(draw({ steps: [] }), '');
  assert.throws(() => draw({ ariaLabel: '   ' }), /^Error: ArenaStepper: `ariaLabel`/);
});
