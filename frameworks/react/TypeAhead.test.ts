import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaTypeAheadBuffer, arenaTypeAheadNext } from './TypeAhead.ts';

const LABELS = ['Apple', 'apricot', 'Banana', '  Blueberry', 'cherry', 'Avocado'];

function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function words(count: number, next: () => number): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    let word = '';
    for (let n = 1 + Math.floor(next() * 4); n > 0; n--) word += 'abc'[Math.floor(next() * 3)];
    out.push(word);
  }
  return out;
}

test('a one-character prefix moves to the next label that starts with it', () => {
  assert.equal(arenaTypeAheadNext(LABELS, 0, 'a'), 1);
  assert.equal(arenaTypeAheadNext(LABELS, 1, 'a'), 5);
  assert.equal(arenaTypeAheadNext(LABELS, 2, 'c'), 4);
});

test('the search wraps past the end and back to the first match', () => {
  assert.equal(arenaTypeAheadNext(LABELS, 5, 'a'), 0);
  assert.equal(arenaTypeAheadNext(LABELS, 4, 'b'), 2);
});

test('a longer prefix keeps the current label when it still matches', () => {
  assert.equal(arenaTypeAheadNext(LABELS, 1, 'ap'), 1);
  assert.equal(arenaTypeAheadNext(LABELS, 1, 'apr'), 1);
  assert.equal(arenaTypeAheadNext(LABELS, 2, 'av'), 5);
});

test('case and leading whitespace of the label do not matter', () => {
  assert.equal(arenaTypeAheadNext(LABELS, 2, 'B'), 3);
  assert.equal(arenaTypeAheadNext(LABELS, 3, 'blue'), 3);
  assert.equal(arenaTypeAheadNext(LABELS, 0, 'APR'), 1);
});

test('a label that opens with an accented capital matches its lower-case prefix', () => {
  const labels = ['Apple', 'Écran', 'Ölfeld', 'écrou'];
  assert.equal(arenaTypeAheadNext(labels, 0, 'é'), 1);
  assert.equal(arenaTypeAheadNext(labels, 1, 'é'), 3);
  assert.equal(arenaTypeAheadNext(labels, 0, 'ö'), 2);
  assert.equal(arenaTypeAheadNext(labels, 0, 'écr'), 1);
});

test('no match gives -1, as do an empty list and an empty prefix', () => {
  assert.equal(arenaTypeAheadNext(LABELS, 0, 'z'), -1);
  assert.equal(arenaTypeAheadNext([], 0, 'a'), -1);
  assert.equal(arenaTypeAheadNext(LABELS, 0, ''), -1);
});

test('a start out of range is read as before the first label', () => {
  assert.equal(arenaTypeAheadNext(LABELS, -4, 'a'), 0);
  assert.equal(arenaTypeAheadNext(LABELS, 99, 'a'), 0);
  assert.equal(arenaTypeAheadNext(LABELS, Number.NaN, 'b'), 2);
  assert.equal(arenaTypeAheadNext(LABELS, 99, 'ap'), 0);
});

test('characters typed in succession accumulate into one prefix', () => {
  let buffer = '';
  buffer = arenaTypeAheadBuffer(buffer, 'a');
  buffer = arenaTypeAheadBuffer(buffer, 'v');
  assert.equal(buffer, 'av');
  assert.equal(arenaTypeAheadNext(LABELS, 0, buffer), 5);
});

test('the same letter typed again leaves the buffer at one character so the search cycles', () => {
  assert.equal(arenaTypeAheadBuffer('a', 'a'), 'a');
  assert.equal(arenaTypeAheadBuffer('a', 'A'), 'A');
  assert.equal(arenaTypeAheadBuffer('ab', 'b'), 'abb');
  assert.equal(arenaTypeAheadBuffer('', 'q'), 'q');
  let at = 0;
  const seen: number[] = [];
  for (let press = 0; press < 4; press++) {
    at = arenaTypeAheadNext(LABELS, at, arenaTypeAheadBuffer('a', 'a'));
    seen.push(at);
  }
  assert.deepEqual(seen, [1, 5, 0, 1]);
});

test('whatever the labels, a match starts with the prefix and no earlier label in the walk does', () => {
  const next = seeded(25);
  for (const size of [1, 7, 200]) {
    for (let k = 0; k < 40; k++) {
      const labels = words(size, next);
      const from = Math.floor(next() * size);
      const prefix = words(1, next)[0]!;
      const found = arenaTypeAheadNext(labels, from, prefix);
      const first = prefix.length === 1 ? from + 1 : from;
      const walk = Array.from({ length: size }, (_, i) => (first + i) % size);
      const expected = walk.find((i) => labels[i]!.startsWith(prefix)) ?? -1;
      assert.equal(found, expected);
    }
  }
});
