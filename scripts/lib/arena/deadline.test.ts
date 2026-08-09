import test from 'node:test';
import assert from 'node:assert/strict';
import { deadline, isDeadline } from './deadline.ts';

test('a deadline carries its name, its span and the reason it is that size', () => {
  const bound = deadline('probe:ready', 1_000, 'a cold cache is the slowest this ever is');
  assert.deepEqual(bound, { name: 'probe:ready', ms: 1_000, why: 'a cold cache is the slowest this ever is' });
});

test('a span that cannot expire is refused, since a wait nothing bounds detects no hang', () => {
  assert.throws(() => deadline('probe:zero', 0, 'why'), /cannot expire/);
  assert.throws(() => deadline('probe:negative', -1, 'why'), /cannot expire/);
  assert.throws(() => deadline('probe:infinite', Infinity, 'why'), /cannot expire/);
});

test('a span with no reason is refused, because a number carrying none gets copied', () => {
  assert.throws(() => deadline('probe:mute', 1_000, '   '), /carries no reason/);
});

test('a nameless deadline is refused, since the name is what an expiry reports', () => {
  assert.throws(() => deadline('  ', 1_000, 'why'), /carries no name/);
});

test('isDeadline separates a declaration from any other exported value', () => {
  assert.equal(isDeadline(deadline('probe:ready', 1, 'why')), true);
  assert.equal(isDeadline({ name: 'x', ms: 1 }), false);
  assert.equal(isDeadline(1_000), false);
  assert.equal(isDeadline(null), false);
});
