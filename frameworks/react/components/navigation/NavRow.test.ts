import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaBadgeCount } from './NavRow.ts';

test('a badge that is not a number draws nothing', () => {
  assert.equal(arenaBadgeCount('2'), null);
  assert.equal(arenaBadgeCount(null), null);
  assert.equal(arenaBadgeCount(2), '2');
  assert.equal(arenaBadgeCount(120), '99+');
});
