import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaConfirmDialogStyles } from './ArenaConfirmDialog.variants';

function tokens(classString: string): string[] {
  return classString.split(/\s+/).filter(Boolean);
}

test('the panel and head/foot/body slots carry no destructive-driven classes -- the fill is scoped to the confirm button and eyebrow alone', () => {
  const routine = arenaConfirmDialogStyles({ destructive: false });
  const destructive = arenaConfirmDialogStyles({ destructive: true });
  for (const slot of ['panel', 'head', 'body', 'foot'] as const) {
    assert.equal(JSON.stringify(routine.$data[slot]()), JSON.stringify(destructive.$data[slot]()), `${slot} must not vary with destructive`);
  }
});

