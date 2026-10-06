import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaToastStyles } from './ArenaToast.variants';
import { ARENA_TOAST_DISMISS } from './ArenaToast';
import { dismissDefault, dismissActionable } from '../../../Tokens.generated';

function tokens(classString: string): string[] {
  return classString.split(/\s+/).filter(Boolean);
}

test('only root and action vary with tone -- the body, title, pinned marker, message and close are constant', () => {
  const neutral = arenaToastStyles({ tone: 'neutral' });
  const danger = arenaToastStyles({ tone: 'danger' });
  for (const slot of ['body', 'title', 'pinned', 'message', 'close'] as const) {
    assert.equal(JSON.stringify(neutral.$data[slot]()), JSON.stringify(danger.$data[slot]()), `${slot} must not vary with tone`);
  }
});

test('ARENA_TOAST_DISMISS carries the two token intervals, and the actionable one is the longer', () => {
  assert.deepEqual({ ...ARENA_TOAST_DISMISS }, { default: dismissDefault, actionable: dismissActionable });
  assert.ok(ARENA_TOAST_DISMISS.actionable > ARENA_TOAST_DISMISS.default,
    'a notice carrying a button asks the reader to decide rather than only to read, so it lives longer');
});
