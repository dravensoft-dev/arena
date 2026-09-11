import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaPhrase, arenaPhraseParts } from './Phrase';

test('arenaPhraseParts splits a template into text and named slots, in order', () => {
  assert.deepEqual(arenaPhraseParts('{count} {noun} selected'), [
    { slot: 'count' }, { text: ' ' }, { slot: 'noun' }, { text: ' selected' },
  ]);
  assert.deepEqual(arenaPhraseParts('Today'), [{ text: 'Today' }]);
});

test('arenaPhrase fills each slot it is given, in whatever order the template names them', () => {
  assert.equal(arenaPhrase('Step {current} of {total}', { current: 2, total: 5 }), 'Step 2 of 5');
  assert.equal(arenaPhrase('{total} pasos, este es el {current}', { current: 2, total: 5 }), '5 pasos, este es el 2');
});

test('arenaPhrase keeps a slot it was not given, so a typo shows rather than vanishing', () => {
  assert.equal(arenaPhrase('No results for "{qeury}".', { query: 'x' }), 'No results for "{qeury}".');
});
