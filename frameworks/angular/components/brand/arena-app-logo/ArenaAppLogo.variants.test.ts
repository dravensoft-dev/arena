import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaAppLogoStyles } from './ArenaAppLogo.variants';

test('size moves the mark box and the wordmark together -- they are one decision, not two independent knobs', () => {
  const sm = arenaAppLogoStyles({ size: 'sm' });
  const xl = arenaAppLogoStyles({ size: 'xl' });
  assert.notEqual(JSON.stringify(sm.$data.mark()), JSON.stringify(xl.$data.mark()), 'the mark box did not change between sm and xl');
  assert.notEqual(JSON.stringify(sm.$data.name()), JSON.stringify(xl.$data.name()), 'the wordmark size did not change between sm and xl');

  assert.equal(JSON.stringify(sm.$data.root()), JSON.stringify(xl.$data.root()), 'size must not change the root slot');
  assert.equal(JSON.stringify(sm.$data.dim()), JSON.stringify(xl.$data.dim()), 'size must not change the dim slot');
});

