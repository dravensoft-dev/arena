import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaOnboardingStyles } from './ArenaOnboarding.variants';


test('the current dot is the dot slot with the current group selected', () => {
  assert.notEqual(JSON.stringify(arenaOnboardingStyles({ current: true }).$data.dot()), JSON.stringify(arenaOnboardingStyles({ current: false }).$data.dot()));
});
