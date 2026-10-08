import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaSkeletonStyles } from './ArenaSkeleton.variants';
import { arenaSkeletonRowIsLast } from './ArenaSkeleton';

test('a lone line in a stack runs full width -- "the last runs short" needs a line before it', () => {
  assert.equal(arenaSkeletonRowIsLast(1, 1), false);
});

test('with more than one line, only the final row is the narrow closing line', () => {
  assert.equal(arenaSkeletonRowIsLast(1, 3), false);
  assert.equal(arenaSkeletonRowIsLast(2, 3), false);
  assert.equal(arenaSkeletonRowIsLast(3, 3), true);
});

test('the last line is the line slot with the last group selected', () => {
  assert.notEqual(JSON.stringify(arenaSkeletonStyles({ last: true }).$data.line()),
    JSON.stringify(arenaSkeletonStyles({ last: false }).$data.line()));
});
