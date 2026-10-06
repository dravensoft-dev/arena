import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaAppLogoStyles } from './ArenaAppLogo.variants';

test('the logo recipe carries no size or orientation attribute: both are classes an adopter writes', () => {
  const styles = arenaAppLogoStyles();
  for (const slot of ['root', 'mark', 'name', 'dim'] as const) {
    const data = JSON.stringify(styles.$data[slot]());
    assert.ok(!data.includes('data-arena-size') && !data.includes('data-arena-orientation'), `${slot} carries a retired attribute`);
  }
});
