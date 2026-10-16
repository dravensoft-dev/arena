/* One rule for every component that reads a value against thresholds: a region holds its lower
 * edge. The meter cuts three regions with two edges and a banded scale looks a value up in a list
 * of starts, so both ask the same question, how many edges lie at or below the value. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaRegionIndex } from './Thresholds.ts';

test('a value counts the edges at or below it, so an edge belongs to the region above it', () => {
  const edges = [50, 80];
  assert.equal(arenaRegionIndex(10, edges), 0);
  assert.equal(arenaRegionIndex(50, edges), 1, 'a value on the lower edge opens the region above it');
  assert.equal(arenaRegionIndex(79.9, edges), 1);
  assert.equal(arenaRegionIndex(80, edges), 2, 'a value on the upper edge is in the top region, not the middle');
  assert.equal(arenaRegionIndex(1000, edges), 2);
});

test('two equal edges leave the region between them empty, and no list leaves one region', () => {
  assert.equal(arenaRegionIndex(60, [60, 60]), 2);
  assert.equal(arenaRegionIndex(59, [60, 60]), 0);
  assert.equal(arenaRegionIndex(-5, []), 0);
  assert.equal(arenaRegionIndex(5, []), 0);
});

test('a value that is not a number lies above no edge, so it reads as the lowest region', () => {
  assert.equal(arenaRegionIndex(Number.NaN, [0, 50]), 0);
  assert.equal(arenaRegionIndex(Number.NEGATIVE_INFINITY, [0, 50]), 0);
  assert.equal(arenaRegionIndex(Number.POSITIVE_INFINITY, [0, 50]), 2);
});

test('a list of starts reads as a band index once the region below the first start is set aside', () => {
  const starts = [0, 60, 85];
  assert.equal(arenaRegionIndex(-1, starts) - 1, -1, 'below the first start is in no band');
  assert.equal(arenaRegionIndex(0, starts) - 1, 0);
  assert.equal(arenaRegionIndex(60, starts) - 1, 1);
  assert.equal(arenaRegionIndex(99, starts) - 1, 2);
});
