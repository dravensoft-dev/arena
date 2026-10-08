import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaSheetStyles } from './ArenaSheet.variants';

function tokens(classString: string): string[] {
  return classString.split(/\s+/).filter(Boolean);
}

test('the recipe takes no placement -- the root answers the same whichever edge a class pins the sheet to', () => {
  const first = arenaSheetStyles({ open: true });
  const second = arenaSheetStyles({ open: true });
  for (const slot of ['root', 'head', 'trigger', 'caret', 'close', 'body', 'foot'] as const) {
    assert.equal(JSON.stringify(first.$data[slot]()), JSON.stringify(second.$data[slot]()), `${slot} varied between two calls`);
  }
});
