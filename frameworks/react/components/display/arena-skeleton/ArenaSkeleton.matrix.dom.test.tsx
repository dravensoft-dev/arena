/* The render matrix of the skeleton. Each case name is stable so a second layer can repeat the
 * case one for one. The geometry of a shape is CSS and is measured by the proximity case, not here. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { mount, cleanup } from '../../../test/Harness.tsx';
import { ArenaSkeleton } from './ArenaSkeleton.tsx';

afterEach(cleanup);

const parts = (c: HTMLElement, part: string) => [...c.querySelectorAll<HTMLElement>(`[data-arena-part="${part}"]`)];
const lastFlags = (lines: HTMLElement[]) => lines.map((l) => l.hasAttribute('data-arena-last'));

test('matrix: no lines is one skeleton part with no style', () => {
  const c = mount(<ArenaSkeleton />);
  const root = parts(c, 'skeleton');
  assert.equal(root.length, 1);
  assert.equal(root[0]!.getAttribute('role'), 'status');
  assert.equal(root[0]!.hasAttribute('style'), false);
  assert.equal(parts(c, 'skeleton.stack').length, 0);
  assert.equal(parts(c, 'skeleton.line').length, 0);
});

test('matrix: lines of 3 is a stack of three lines, exactly the last carrying data-arena-last', () => {
  const c = mount(<ArenaSkeleton lines={3} />);
  assert.equal(parts(c, 'skeleton').length, 0);
  const stack = parts(c, 'skeleton.stack');
  assert.equal(stack.length, 1);
  assert.equal(stack[0]!.getAttribute('role'), 'status');
  assert.equal(stack[0]!.hasAttribute('style'), false);
  assert.deepEqual(lastFlags(parts(c, 'skeleton.line')), [false, false, true]);
});

test('matrix: lines of 1 is a stack of one line without data-arena-last', () => {
  const c = mount(<ArenaSkeleton lines={1} />);
  assert.equal(parts(c, 'skeleton').length, 0);
  assert.equal(parts(c, 'skeleton.stack').length, 1);
  assert.deepEqual(lastFlags(parts(c, 'skeleton.line')), [false]);
});

test('matrix: lines of 0 is an empty stack that still has role=status', () => {
  const c = mount(<ArenaSkeleton lines={0} />);
  const stack = parts(c, 'skeleton.stack');
  assert.equal(stack.length, 1);
  assert.equal(stack[0]!.getAttribute('role'), 'status');
  assert.equal(parts(c, 'skeleton.line').length, 0);
});

test('matrix: lines of NaN is an empty stack that still has role=status', () => {
  const c = mount(<ArenaSkeleton lines={NaN} />);
  const stack = parts(c, 'skeleton.stack');
  assert.equal(stack.length, 1);
  assert.equal(stack[0]!.getAttribute('role'), 'status');
  assert.equal(parts(c, 'skeleton.line').length, 0);
});

test('matrix: the circle class is on the root', () => {
  const c = mount(<ArenaSkeleton className="arena-skeleton-circle" />);
  const root = parts(c, 'skeleton');
  assert.equal(root.length, 1);
  assert.ok(root[0]!.classList.contains('arena-skeleton-circle'));
  assert.equal(root[0]!.hasAttribute('style'), false);
});

test('matrix: the circle class with lines of 2 is on the stack', () => {
  const c = mount(<ArenaSkeleton className="arena-skeleton-circle" lines={2} />);
  const stack = parts(c, 'skeleton.stack');
  assert.equal(stack.length, 1);
  assert.ok(stack[0]!.classList.contains('arena-skeleton-circle'));
  assert.deepEqual(lastFlags(parts(c, 'skeleton.line')), [false, true]);
  for (const line of parts(c, 'skeleton.line')) assert.equal(line.classList.contains('arena-skeleton-circle'), false);
});
