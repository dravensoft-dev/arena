/* Where a filter bar sends focus after the host answers a removal, authored once per layer and
 * compared by check:shared-arithmetic. Focus moves only when the applied list really changed, and
 * never away from a control a person has since moved to. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaFilterBarMayFocus, arenaFilterBarSame, arenaFilterBarTarget } from './FilterBarFocus.ts';

test('a list is the same only with the same ids in the same order', () => {
  assert.equal(arenaFilterBarSame(['a', 'b'], ['a', 'b']), true);
  assert.equal(arenaFilterBarSame(['a', 'b'], ['b', 'a']), false);
  assert.equal(arenaFilterBarSame(['a', 'b'], ['a']), false);
});

test('a removal lands on the chip now in its place, else the last chip, else the first control', () => {
  assert.deepEqual(arenaFilterBarTarget(0, ['a', 'b', 'c'], ['b', 'c']), { chip: 0 });
  assert.deepEqual(arenaFilterBarTarget(2, ['a', 'b', 'c'], ['a', 'b']), { chip: 1 });
  assert.equal(arenaFilterBarTarget(0, ['a'], []), 'content');
});

test('Clear all lands on the first control', () => {
  assert.equal(arenaFilterBarTarget('clear', ['a', 'b'], []), 'content');
});

test('nothing moves when no removal is pending, or when the host refused it', () => {
  assert.equal(arenaFilterBarTarget(null, ['a', 'b'], ['a']), null);
  assert.equal(arenaFilterBarTarget(1, ['a', 'b'], ['a', 'b']), null);
  assert.equal(arenaFilterBarTarget('clear', ['a'], ['a']), null);
});

const page: { body?: unknown } = {};
const body = { isConnected: true, ownerDocument: page };
page.body = body;
const node = (connected = true) => ({ isConnected: connected, ownerDocument: page }) as unknown as Element;
const holding = (...held: unknown[]) => ({ contains: (other: unknown) => held.includes(other) }) as unknown as Element;

test('focus may be taken when nothing holds it, and from the chip row, but never from a control or from outside the bar', () => {
  const chip = node();
  const control = node();
  const outside = node();
  const bar = holding(chip, control);
  const controls = holding(control);
  const may = (active: Element | null) => arenaFilterBarMayFocus(active, bar, controls);
  assert.deepEqual(
    [may(null), may(body as unknown as Element), may(node(false)), may(chip), may(control), may(outside)],
    [true, true, true, true, false, false],
  );
});
