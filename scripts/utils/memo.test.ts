/* The claims are the two a caller leans on and the two that go wrong quietly. A build runs once
 * and the answer is the same object, so a caller may hold it. Two keys are two answers, which is
 * the whole reason memoBy takes a key rather than assuming one: a suite passing a fixture root has
 * to get its own tree back. clear() is the escape hatch for a root rewritten in place, and an
 * answer that IS undefined is still an answer rather than a permanent miss. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { memo, memoBy } from './memo.ts';

test('a memoised derivation is built once, however many times it is asked for', () => {
  let built = 0;
  const value = memo(() => { built += 1; return { at: built }; });

  assert.equal(value(), value(), 'the same object, so a caller may hold it rather than copying');
  value();
  assert.equal(built, 1);
});

test('two keys are two answers, which is what a derivation taking a root needs', () => {
  const seen: string[] = [];
  const read = memoBy((root: string) => root, (root: string) => { seen.push(root); return `under ${root}`; });

  assert.equal(read('/tmp/fixture'), 'under /tmp/fixture');
  assert.equal(read('/repo'), 'under /repo');
  assert.equal(read('/tmp/fixture'), 'under /tmp/fixture');
  assert.deepEqual(seen, ['/tmp/fixture', '/repo'],
    'keyed on nothing, the second root would have been handed the first root\'s answer');
});

test('clear() rebuilds, for the suite that rewrites one root between two calls', () => {
  let held = 'before';
  const read = memoBy((root: string) => root, () => held);

  assert.equal(read('/repo'), 'before');
  held = 'after';
  assert.equal(read('/repo'), 'before', 'a rewrite nothing announced is not seen, which is the point of clear()');
  read.clear();
  assert.equal(read('/repo'), 'after');
});

test('a derivation whose answer is undefined is cached, rather than rebuilt for ever', () => {
  let built = 0;
  const value = memo(() => { built += 1; return undefined; });

  assert.equal(value(), undefined);
  assert.equal(value(), undefined);
  assert.equal(built, 1, 'read back through has() rather than a wrapper, this would build every time');
});
