import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaOnboardingStyles } from './ArenaOnboarding.variants';

function tokens(classString: string): string[] {
  return classString.split(/\s+/).filter(Boolean);
}


test('the current dot is the dot slot with the current group selected', () => {
  assert.notEqual(arenaOnboardingStyles({ current: true }).dot(), arenaOnboardingStyles({ current: false }).dot());
});
